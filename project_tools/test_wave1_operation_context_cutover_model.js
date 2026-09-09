'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
const uuid = (prefix) => `${prefix}:${crypto.randomUUID()}`;

class ReceiptStore {
  constructor(maxActive = 256) {
    this.maxActive = maxActive;
    this.byPhysical = new Map();
    this.byRequest = new Map();
  }

  activeCount() {
    return [...this.byPhysical.values()].filter((r) => !r.terminalAt).length;
  }

  admit({ clientRequestId = '', clientCorrelationId = '', kind, subjectKey, requestFingerprint, sourceGenerationId = '' }) {
    if (!kind || !subjectKey || !requestFingerprint) throw new Error('invalid-admission');
    if (clientRequestId) {
      const existingPhysical = this.byRequest.get(clientRequestId);
      if (existingPhysical) {
        const existing = this.byPhysical.get(existingPhysical);
        const same = existing
          && existing.kind === kind
          && existing.subjectKey === subjectKey
          && existing.requestFingerprint === requestFingerprint;
        if (!same) {
          const error = new Error('client-request-correlation-mismatch');
          error.code = 'CLIENT_REQUEST_CORRELATION_MISMATCH';
          throw error;
        }
        return { receipt: existing, deduplicated: true };
      }
    }
    if (this.activeCount() >= this.maxActive) {
      const error = new Error('active-receipt-capacity');
      error.code = 'ACTIVE_RECEIPT_CAPACITY';
      throw error;
    }
    const now = Date.now();
    const receipt = {
      schemaVersion: 1,
      physicalOperationId: uuid('phys'),
      ...(clientRequestId ? { clientRequestId } : {}),
      ...(clientCorrelationId ? { clientCorrelationId } : {}),
      kind,
      subjectKey,
      requestFingerprint,
      ...(sourceGenerationId ? { sourceGenerationId } : {}),
      phase: 'admitted',
      admittedAt: now,
      updatedAt: now,
      domainReceipt: null,
      terminalAt: 0
    };
    this.byPhysical.set(receipt.physicalOperationId, receipt);
    if (clientRequestId) this.byRequest.set(clientRequestId, receipt.physicalOperationId);
    return { receipt, deduplicated: false };
  }

  transition(physicalOperationId, phase, domainReceipt = null) {
    const receipt = this.byPhysical.get(physicalOperationId);
    if (!receipt) throw new Error('unknown-physical-operation');
    receipt.phase = phase;
    receipt.updatedAt = Date.now();
    if (domainReceipt) receipt.domainReceipt = Object.freeze({ ...domainReceipt });
    if (['succeeded', 'failed-before-effect', 'failed-terminal', 'canceled'].includes(phase)) {
      receipt.terminalAt = receipt.updatedAt;
    }
    return receipt;
  }

  reconcileByRequest(clientRequestId) {
    const physical = this.byRequest.get(clientRequestId);
    return physical ? this.byPhysical.get(physical) || null : null;
  }

  discover(kind, subjectKey) {
    return [...this.byPhysical.values()]
      .filter((r) => r.kind === kind && r.subjectKey === subjectKey && !r.terminalAt)
      .sort((a, b) => b.admittedAt - a.admittedAt);
  }

  cleanup({ terminalBefore, activeDomainIds = new Set() }) {
    let removed = 0;
    for (const [physical, receipt] of [...this.byPhysical]) {
      if (!receipt.terminalAt || receipt.terminalAt > terminalBefore) continue;
      const domainId = receipt.domainReceipt?.id || '';
      if (domainId && activeDomainIds.has(domainId)) continue;
      this.byPhysical.delete(physical);
      if (receipt.clientRequestId && this.byRequest.get(receipt.clientRequestId) === physical) {
        this.byRequest.delete(receipt.clientRequestId);
      }
      removed += 1;
    }
    return removed;
  }
}

class OperationLogStore {
  constructor() { this.records = new Map(); }
  start(context) {
    const physical = context.physicalOperationId;
    assert.ok(physical.startsWith('phys:'), 'physical id required');
    const record = {
      identityVersion: 2,
      operationId: physical,
      physicalOperationId: physical,
      clientRequestId: context.clientRequestId || '',
      clientCorrelationId: context.clientCorrelationId || '',
      events: []
    };
    this.records.set(record.operationId, record);
    return record;
  }
  clearDiagnostics() { this.records.clear(); }
}

function classifyOperationLogRecord(record) {
  if (record?.identityVersion === 2 && record.physicalOperationId === record.operationId) return 'v2-physical';
  if (record?.operationId) return 'legacy-conflated';
  return 'invalid';
}

function makeLegacyAdmission(legacyOperationId, kind, subjectKey, fingerprint) {
  return { clientCorrelationId: legacyOperationId, kind, subjectKey, requestFingerprint: fingerprint };
}

function progressPayload(context, stage) {
  return {
    identityVersion: 2,
    operationId: context.clientCorrelationId || context.clientRequestId || context.physicalOperationId,
    clientRequestId: context.clientRequestId || '',
    clientCorrelationId: context.clientCorrelationId || '',
    physicalOperationId: context.physicalOperationId,
    stage
  };
}

function acceptProgress(ui, payload) {
  if (payload.identityVersion !== 2) return false;
  if (ui.clientRequestId && payload.clientRequestId !== ui.clientRequestId) return false;
  if (ui.physicalOperationId && payload.physicalOperationId !== ui.physicalOperationId) return false;
  if (!ui.physicalOperationId) ui.physicalOperationId = payload.physicalOperationId;
  return true;
}

function makeLocalDownloadIntent(context, sourceGenerationId) {
  return {
    downloadIntentId: uuid('download-intent'),
    physicalOperationId: context.physicalOperationId,
    clientRequestId: context.clientRequestId || '',
    sourceGenerationId
  };
}

function makeRemoteCheckpoint(context, sourceGenerationId, pdfGeneration) {
  return {
    remoteSaveId: uuid('remote-save'),
    physicalOperationId: context.physicalOperationId,
    clientRequestId: context.clientRequestId || '',
    sourceGenerationId,
    pdfGeneration,
    phase: 'prepared'
  };
}

function classifyLegacyPending(row) {
  if (row?.physicalOperationId) return 'v2';
  if (row?.operationId) return 'legacy-conflated-no-physical-authority';
  return 'legacy-unidentified';
}

function makePreparedSaveAs(context) {
  return {
    saveAsSessionId: uuid('saveas'),
    physicalOperationId: context.physicalOperationId,
    clientRequestId: context.clientRequestId || ''
  };
}

function mayContinueSaveAs(checkpoint, supplied) {
  return checkpoint.saveAsSessionId === supplied.saveAsSessionId;
}

function makeLiveJournalEntry(context, entryId, sourceGenerationId) {
  return {
    id: entryId,
    operationId: context.clientCorrelationId || context.clientRequestId || '',
    clientRequestId: context.clientRequestId || '',
    sourceGenerationId,
    operationLink: {
      version: 2,
      provenance: 'live-local',
      entryId,
      physicalOperationId: context.physicalOperationId
    }
  };
}

function importJournalEntry(raw) {
  const historical = String(raw.operationId || raw.clientRequestId || '').slice(0, 180);
  return {
    id: raw.id,
    operationId: '',
    historicalOperationId: historical,
    operationProvenance: historical ? 'imported-unverified' : 'none',
    operationLink: null
  };
}

function domainCancel({ receipt, domainHandleMatches }) {
  if (!domainHandleMatches) return 'rejected-domain-authority';
  return `finish:${receipt.physicalOperationId}:canceled`;
}

let cases = 0;
const check = (fn) => { fn(); cases += 1; };

const receipts = new ReceiptStore();
const fingerprintA = sha256('kind=save-yandex|source=S1|destination=yandex|meta=M1');

let admitted;
check(() => {
  admitted = receipts.admit({ clientRequestId: 'req-1', clientCorrelationId: 'corr-shared', kind: 'save-yandex', subjectKey: 'source:S1', requestFingerprint: fingerprintA, sourceGenerationId: 'S1' });
  assert.equal(admitted.deduplicated, false);
  assert.ok(admitted.receipt.physicalOperationId.startsWith('phys:'));
  assert.notEqual(admitted.receipt.physicalOperationId, 'req-1');
});

check(() => {
  const again = receipts.admit({ clientRequestId: 'req-1', clientCorrelationId: 'another-display-value', kind: 'save-yandex', subjectKey: 'source:S1', requestFingerprint: fingerprintA, sourceGenerationId: 'S1' });
  assert.equal(again.deduplicated, true);
  assert.equal(again.receipt.physicalOperationId, admitted.receipt.physicalOperationId);
});

check(() => {
  assert.throws(() => receipts.admit({ clientRequestId: 'req-1', kind: 'save-yandex', subjectKey: 'source:S2', requestFingerprint: sha256('different') }), (e) => e.code === 'CLIENT_REQUEST_CORRELATION_MISMATCH');
});

let second;
check(() => {
  second = receipts.admit({ clientRequestId: 'req-2', clientCorrelationId: 'corr-shared', kind: 'save-yandex', subjectKey: 'source:S2', requestFingerprint: sha256('S2') });
  assert.notEqual(second.receipt.physicalOperationId, admitted.receipt.physicalOperationId);
  assert.equal(second.receipt.clientCorrelationId, admitted.receipt.clientCorrelationId);
});

check(() => {
  const a = receipts.admit(makeLegacyAdmission('legacy-same', 'legacy-op', 'subject:A', sha256('A'))).receipt;
  const b = receipts.admit(makeLegacyAdmission('legacy-same', 'legacy-op', 'subject:A', sha256('A'))).receipt;
  assert.notEqual(a.physicalOperationId, b.physicalOperationId);
});

const logs = new OperationLogStore();
check(() => {
  const log = logs.start(admitted.receipt);
  assert.equal(log.operationId, admitted.receipt.physicalOperationId);
  assert.equal(log.clientRequestId, 'req-1');
  assert.equal(classifyOperationLogRecord(log), 'v2-physical');
});

check(() => {
  assert.equal(classifyOperationLogRecord({ operationId: 'caller-old' }), 'legacy-conflated');
});

let progress;
check(() => {
  progress = progressPayload(admitted.receipt, 'admitted');
  assert.equal(progress.operationId, 'corr-shared');
  assert.equal(progress.clientRequestId, 'req-1');
  assert.equal(progress.physicalOperationId, admitted.receipt.physicalOperationId);
});

check(() => {
  const ui = { clientRequestId: 'req-1', physicalOperationId: '' };
  assert.equal(acceptProgress(ui, progress), true);
  assert.equal(ui.physicalOperationId, admitted.receipt.physicalOperationId);
  assert.equal(acceptProgress(ui, { ...progress, physicalOperationId: second.receipt.physicalOperationId }), false);
});

check(() => {
  const physical = admitted.receipt.physicalOperationId;
  const reconciled = receipts.reconcileByRequest('req-1');
  assert.equal(reconciled.physicalOperationId, physical);
});

check(() => {
  const found = receipts.discover('save-yandex', 'source:S1');
  assert.equal(found.length, 1);
  assert.equal(found[0].physicalOperationId, admitted.receipt.physicalOperationId);
});

check(() => {
  logs.clearDiagnostics();
  assert.equal(logs.records.size, 0);
  assert.equal(receipts.reconcileByRequest('req-1').physicalOperationId, admitted.receipt.physicalOperationId);
});

let localIntent;
check(() => {
  localIntent = makeLocalDownloadIntent(admitted.receipt, 'S1');
  assert.notEqual(localIntent.downloadIntentId, admitted.receipt.clientCorrelationId);
  assert.equal(localIntent.physicalOperationId, admitted.receipt.physicalOperationId);
});

check(() => {
  const another = makeLocalDownloadIntent(second.receipt, 'S2');
  assert.notEqual(another.downloadIntentId, localIntent.downloadIntentId);
});

check(() => {
  assert.equal(classifyLegacyPending({ operationId: 'legacy-same' }), 'legacy-conflated-no-physical-authority');
});

let remote;
check(() => {
  remote = makeRemoteCheckpoint(admitted.receipt, 'S1', 'pdf:G1');
  assert.equal(remote.physicalOperationId, admitted.receipt.physicalOperationId);
  assert.equal(remote.clientRequestId, 'req-1');
  assert.equal(remote.sourceGenerationId, 'S1');
  assert.equal(remote.pdfGeneration, 'pdf:G1');
});

check(() => {
  const prepared = makePreparedSaveAs(admitted.receipt);
  assert.equal(mayContinueSaveAs(prepared, { saveAsSessionId: prepared.saveAsSessionId, physicalOperationId: 'wrong' }), true);
  assert.equal(mayContinueSaveAs(prepared, { saveAsSessionId: 'wrong', physicalOperationId: prepared.physicalOperationId }), false);
});

let journalEntry;
check(() => {
  journalEntry = makeLiveJournalEntry(admitted.receipt, 'entry-1', 'S1');
  assert.equal(journalEntry.operationLink.entryId, 'entry-1');
  assert.equal(journalEntry.operationLink.physicalOperationId, admitted.receipt.physicalOperationId);
});

check(() => {
  const imported = importJournalEntry(journalEntry);
  assert.equal(imported.operationLink, null);
  assert.equal(imported.operationProvenance, 'imported-unverified');
  assert.equal(imported.operationId, '');
});

check(() => {
  assert.equal(domainCancel({ receipt: admitted.receipt, domainHandleMatches: false }), 'rejected-domain-authority');
  assert.equal(domainCancel({ receipt: admitted.receipt, domainHandleMatches: true }), `finish:${admitted.receipt.physicalOperationId}:canceled`);
});

check(() => {
  assert.equal(admitted.receipt.sourceGenerationId, 'S1');
  assert.notEqual(admitted.receipt.sourceGenerationId, admitted.receipt.physicalOperationId);
});

check(() => {
  const bg = receipts.admit({ kind: 'background-backup', subjectKey: 'journal:J1', requestFingerprint: sha256('J1') }).receipt;
  assert.ok(bg.physicalOperationId.startsWith('phys:'));
  assert.equal(Object.hasOwn(bg, 'clientRequestId'), false);
});

check(() => {
  const tiny = new ReceiptStore(1);
  tiny.admit({ clientRequestId: 'a', kind: 'x', subjectKey: 's1', requestFingerprint: sha256('1') });
  assert.throws(() => tiny.admit({ clientRequestId: 'b', kind: 'x', subjectKey: 's2', requestFingerprint: sha256('2') }), (e) => e.code === 'ACTIVE_RECEIPT_CAPACITY');
  assert.equal(tiny.activeCount(), 1);
});

check(() => {
  receipts.transition(admitted.receipt.physicalOperationId, 'succeeded', { kind: 'remote-save', id: remote.remoteSaveId });
  admitted.receipt.terminalAt = 10;
  assert.equal(receipts.cleanup({ terminalBefore: 20, activeDomainIds: new Set([remote.remoteSaveId]) }), 0);
  assert.ok(receipts.reconcileByRequest('req-1'));
});

check(() => {
  assert.equal(receipts.cleanup({ terminalBefore: 20, activeDomainIds: new Set() }), 1);
  assert.equal(receipts.reconcileByRequest('req-1'), null);
  assert.equal(remote.phase, 'prepared');
});

check(() => {
  const fresh = receipts.admit({ clientRequestId: 'req-fresh', clientCorrelationId: 'corr-shared', kind: 'save-yandex', subjectKey: 'source:S1', requestFingerprint: fingerprintA }).receipt;
  assert.notEqual(fresh.physicalOperationId, admitted.receipt.physicalOperationId);
});

check(() => {
  const sample = receipts.reconcileByRequest('req-2');
  const json = JSON.stringify(sample);
  assert.doesNotMatch(json, /accessToken|authorization|signedUrl|oauth|pdfBytes|commentText/i);
});

console.log('Wave 1 operation-context cutover model: PASS');
console.log(`cases=${cases}`);
