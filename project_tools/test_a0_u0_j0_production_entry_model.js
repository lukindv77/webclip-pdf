'use strict';

const assert = require('node:assert/strict');
let cases = 0;
const check = (condition, message) => { cases += 1; assert.ok(condition, message); };
const equal = (actual, expected, message) => { cases += 1; assert.equal(actual, expected, message); };
const deepEqual = (actual, expected, message) => { cases += 1; assert.deepEqual(actual, expected, message); };

// Final pre-production structural contracts.
const dbContracts = Object.freeze({
  operationReceipts: {
    name: 'WebClipOperationReceipts', version: 1,
    stores: ['receipts', 'resourceReservations']
  },
  journal: {
    name: 'WebClipJournal', version: 8,
    existing: ['entries', 'urlStats', 'meta', 'pendingAppends', 'pendingDownloads', 'pendingRemoteSaves', 'importStaging'],
    added: ['journalFinalizations', 'pendingRemoteMutations', 'urlStatsV2', 'journalSummaries']
  },
  pdf: { name: 'WebClipPdfRetryCache', version: 4 },
  logs: { name: 'WebClipOperationLogs', version: 3 },
  transfers: { name: 'WebClipOffscreenTransfers', version: 1 }
});

deepEqual(dbContracts.operationReceipts.stores, ['receipts', 'resourceReservations'], 'A0 v1 must include W6 reservation capacity');
equal(dbContracts.journal.version, 8, 'J0 is v8, not obsolete stay-v7 plan');
equal(dbContracts.pdf.version, 4, 'PDF schema remains later B1 v4');
equal(dbContracts.logs.version, 3, 'OperationLog v3 is later W4 activation');
equal(dbContracts.transfers.version, 1, 'offscreen transfer DB has no known structural bump');
check(dbContracts.journal.added.includes('journalSummaries'), 'J0 includes W6 light summary projection');
check(dbContracts.journal.added.includes('urlStatsV2'), 'J0 includes W4 shadow stats generation');

// A0 receipt admission/dedup model.
class ReceiptDb {
  constructor(activeCap = 256) {
    this.byPhysical = new Map();
    this.byClient = new Map();
    this.activeCap = activeCap;
  }
  admit({ clientRequestId = '', operationKind, subjectKey, requestFingerprint }) {
    if (clientRequestId && this.byClient.has(clientRequestId)) {
      const p = this.byClient.get(clientRequestId);
      const old = this.byPhysical.get(p);
      if (old.operationKind !== operationKind || old.subjectKey !== subjectKey || old.requestFingerprint !== requestFingerprint) {
        return { status: 'conflict', physicalOperationId: p };
      }
      return { status: 'deduplicated', physicalOperationId: p };
    }
    const active = [...this.byPhysical.values()].filter(r => !r.terminal).length;
    if (active >= this.activeCap) return { status: 'capacity' };
    const physicalOperationId = `p:${this.byPhysical.size + 1}`;
    const row = { physicalOperationId, clientRequestId: clientRequestId || undefined, operationKind, subjectKey, requestFingerprint, receiptRevision: 1, terminal: false };
    this.byPhysical.set(physicalOperationId, row);
    if (clientRequestId) this.byClient.set(clientRequestId, physicalOperationId);
    return { status: 'admitted', physicalOperationId };
  }
}

const receipts = new ReceiptDb(2);
const a1 = receipts.admit({ clientRequestId: 'c1', operationKind: 'pdf.local-save', subjectKey: 's1', requestFingerprint: 'h1' });
equal(a1.status, 'admitted', 'first exact request admitted');
const a2 = receipts.admit({ clientRequestId: 'c1', operationKind: 'pdf.local-save', subjectKey: 's1', requestFingerprint: 'h1' });
equal(a2.status, 'deduplicated', 'same client request deduplicates');
equal(a2.physicalOperationId, a1.physicalOperationId, 'dedup returns same worker-issued P');
equal(receipts.admit({ clientRequestId: 'c1', operationKind: 'pdf.local-save', subjectKey: 's2', requestFingerprint: 'h1' }).status, 'conflict', 'client id cannot rebind to different subject');
equal(receipts.admit({ clientRequestId: 'c2', operationKind: 'journal.delete', subjectKey: 'e1', requestFingerprint: 'h2' }).status, 'admitted', 'second active operation admitted');
equal(receipts.admit({ clientRequestId: 'c3', operationKind: 'journal.delete', subjectKey: 'e2', requestFingerprint: 'h3' }).status, 'capacity', 'capacity refuses new operation instead of evicting unresolved authority');
check(!receipts.byPhysical.has('c1'), 'caller client id is never physical operation identity');

// U0 content realm probe / reinjection policy.
function contentRealmDisposition(marker) {
  if (marker == null) return 'inject-current';
  if (marker && typeof marker === 'object' && marker.contentProtocolVersion === 2) return 'reuse-current';
  return 'legacy-incompatible-reload-required';
}
equal(contentRealmDisposition(undefined), 'inject-current', 'absent content realm can receive current bundle');
equal(contentRealmDisposition({ contentProtocolVersion: 2 }), 'reuse-current', 'current realm is reused');
equal(contentRealmDisposition(true), 'legacy-incompatible-reload-required', 'legacy Boolean sentinel cannot be hot-upgraded safely');
equal(contentRealmDisposition({ contentProtocolVersion: 1 }), 'legacy-incompatible-reload-required', 'older structured realm cannot authorize current mutation');

// Stale mutation protocol fencing.
function mutationAdmission({ expected, supplied, exactDocument = true }) {
  if (supplied !== expected) return 'protocol-mismatch';
  if (!exactDocument) return 'stale-document';
  return 'allowed';
}
equal(mutationAdmission({ expected: 2, supplied: 1 }), 'protocol-mismatch', 'old content mutation denied');
equal(mutationAdmission({ expected: 2, supplied: 2, exactDocument: false }), 'stale-document', 'protocol match cannot replace document identity');
equal(mutationAdmission({ expected: 2, supplied: 2, exactDocument: true }), 'allowed', 'current exact document admitted');

// Extension-page repair: only positive current-page safe-to-reload proof allows automatic reload.
function pageRepairDisposition(page) {
  if (!page.responded) return 'evidence-limited-manual';
  if (page.protocolVersion !== 2) return page.safeToReload === true ? 'reload' : 'pending';
  if (page.bundleCurrent) return 'ack-current';
  return page.safeToReload === true ? 'reload' : 'pending';
}
equal(pageRepairDisposition({ responded: false }), 'evidence-limited-manual', 'legacy page with no protocol cannot be forcibly reloaded');
equal(pageRepairDisposition({ responded: true, protocolVersion: 1, safeToReload: false }), 'pending', 'old capable page with native/user operation remains pending');
equal(pageRepairDisposition({ responded: true, protocolVersion: 1, safeToReload: true }), 'reload', 'old capable idle page may be repaired');
equal(pageRepairDisposition({ responded: true, protocolVersion: 2, bundleCurrent: true, safeToReload: false }), 'ack-current', 'current page needs no reload');

// Offscreen transition: URL existence is not compatibility proof.
function offscreenDisposition(o) {
  if (!o.exists) return 'create-current';
  if (!o.protocolInfo) return 'legacy-unknown-block-new-work';
  if (o.protocolInfo.protocolVersion === 2 && o.protocolInfo.bundleCurrent && o.protocolInfo.schemaCurrent) return 'reuse-current';
  const safeIdle = o.protocolInfo.activeTransferCount === 0 &&
    o.protocolInfo.activeBlobUrlCount === 0 &&
    o.protocolInfo.unknownSettlementCount === 0 && o.protocolInfo.idle === true;
  return safeIdle ? 'close-recreate' : 'transition-pending';
}
equal(offscreenDisposition({ exists: false }), 'create-current', 'no offscreen -> create current');
equal(offscreenDisposition({ exists: true, protocolInfo: null }), 'legacy-unknown-block-new-work', 'legacy unknown offscreen is not closed by guess');
equal(offscreenDisposition({ exists: true, protocolInfo: { protocolVersion: 2, bundleCurrent: true, schemaCurrent: true } }), 'reuse-current', 'exact current offscreen reused');
equal(offscreenDisposition({ exists: true, protocolInfo: { protocolVersion: 1, activeTransferCount: 0, activeBlobUrlCount: 0, unknownSettlementCount: 0, idle: true } }), 'close-recreate', 'proven idle incompatible offscreen can be replaced');
equal(offscreenDisposition({ exists: true, protocolInfo: { protocolVersion: 1, activeTransferCount: 1, activeBlobUrlCount: 0, unknownSettlementCount: 0, idle: false } }), 'transition-pending', 'active transfer blocks close');
equal(offscreenDisposition({ exists: true, protocolInfo: { protocolVersion: 1, activeTransferCount: 0, activeBlobUrlCount: 1, unknownSettlementCount: 0, idle: false } }), 'transition-pending', 'pinned Blob continuation blocks close');
equal(offscreenDisposition({ exists: true, protocolInfo: { protocolVersion: 1, activeTransferCount: 0, activeBlobUrlCount: 0, unknownSettlementCount: 1, idle: false } }), 'transition-pending', 'unknown settlement blocks close');

// J0 two-stage readiness model.
function upgradeV7ToV8(db) {
  if (db.version !== 7) throw new Error('expected v7');
  const next = structuredClone(db);
  next.version = 8;
  for (const store of dbContracts.journal.added) next.stores.add(store);
  next.meta.datasetGeneration = next.meta.datasetGeneration || 'jg:1';
  next.meta.authorityMode = next.meta.authorityMode || 'passive-v8';
  return next;
}
function postOpenInitV8(db) {
  if (db.version !== 8) return { ready: false, reason: 'wrong-version' };
  if (!db.meta.datasetGeneration || db.meta.authorityMode !== 'passive-v8') return { ready: false, reason: 'foundation-meta' };
  const next = structuredClone(db);
  next.meta.urlIdentityMigration ||= { phase: 'pending' };
  next.meta.urlStatsState ||= 'pending';
  next.meta.journalSummaryProjection ||= { phase: 'pending' };
  next.meta.schemaContractId = 'journal-v8-passive-1';
  return { ready: true, db: next };
}
const v7 = { version: 7, stores: new Set(dbContracts.journal.existing), meta: { revision: 'r7' } };
const v8 = upgradeV7ToV8(v7);
equal(v8.version, 8, 'structural upgrade commits v8');
for (const s of dbContracts.journal.existing) check(v8.stores.has(s), `existing store ${s} preserved`);
for (const s of dbContracts.journal.added) check(v8.stores.has(s), `new store ${s} added`);
equal(v8.meta.revision, 'r7', 'legacy Journal revision preserved');
equal(v8.meta.authorityMode, 'passive-v8', 'J0 never activates CAS authority');
check(Boolean(v8.meta.datasetGeneration), 'dataset generation seeded exactly once');
const j0 = postOpenInitV8(v8);
check(j0.ready, 'schema-ready waits for post-open passive initialization');
equal(j0.db.meta.schemaContractId, 'journal-v8-passive-1', 'schema-ready carries exact contract');

// Crash after structural commit but before post-open init is recoverable.
const structuralOnly = structuredClone(v8);
delete structuralOnly.meta.urlIdentityMigration;
delete structuralOnly.meta.urlStatsState;
delete structuralOnly.meta.journalSummaryProjection;
const resumed = postOpenInitV8(structuralOnly);
check(resumed.ready, 'post-open J0 init is restartable after structural commit');
equal(resumed.db.meta.datasetGeneration, v8.meta.datasetGeneration, 'restart does not rotate JG');

// Page must not own structural upgrade.
function journalPageOpen({ barrier, dbVersion, onUpgradeNeeded }) {
  if (!barrier || barrier.schemaContractId !== 'journal-v8-passive-1') return 'blocked-no-barrier';
  if (dbVersion > 8) return 'future-version-fail-closed';
  if (dbVersion < 8 || onUpgradeNeeded) return 'abort-upgrade-rebootstrap';
  return 'open-readonly-capable';
}
equal(journalPageOpen({ barrier: null, dbVersion: 7 }), 'blocked-no-barrier', 'page cannot open before worker schema barrier');
equal(journalPageOpen({ barrier: { schemaContractId: 'journal-v8-passive-1' }, dbVersion: 7, onUpgradeNeeded: true }), 'abort-upgrade-rebootstrap', 'page never constructs v8 itself');
equal(journalPageOpen({ barrier: { schemaContractId: 'journal-v8-passive-1' }, dbVersion: 8 }), 'open-readonly-capable', 'page opens exact ready v8');
equal(journalPageOpen({ barrier: { schemaContractId: 'journal-v8-passive-1' }, dbVersion: 9 }), 'future-version-fail-closed', 'older page fails closed on future DB');

// Authority-mode activation remains later D0.
function mutationAllowedByAuthorityMode(mode, writerGenerationReady) {
  if (mode === 'passive-v8') return 'legacy-only';
  if (mode === 'cas-v1' && writerGenerationReady) return 'cas-v1';
  return 'fail-closed';
}
equal(mutationAllowedByAuthorityMode('passive-v8', false), 'legacy-only', 'J0 alone cannot claim P0-076 closure');
equal(mutationAllowedByAuthorityMode('cas-v1', true), 'cas-v1', 'later D0 can activate exact CAS');
equal(mutationAllowedByAuthorityMode('future-mode', true), 'fail-closed', 'unknown newer authority mode never downgraded');

// Dependency graph must remain acyclic and ordered.
const edges = [
  ['A0','U0'], ['U0','J0'], ['J0','A1'], ['A1','A2'], ['A2','B0'], ['B0','B1'],
  ['B1','C0'], ['C0','C1'], ['J0','D0'], ['C1','D2'], ['D0','D2']
];
function topo(nodes, edges) {
  const indegree = new Map(nodes.map(n => [n, 0]));
  const out = new Map(nodes.map(n => [n, []]));
  for (const [a,b] of edges) { out.get(a).push(b); indegree.set(b, indegree.get(b)+1); }
  const q = nodes.filter(n => indegree.get(n) === 0); const result = [];
  while (q.length) { const n = q.shift(); result.push(n); for (const b of out.get(n)) { indegree.set(b, indegree.get(b)-1); if (indegree.get(b)===0) q.push(b); } }
  return result;
}
const nodes = [...new Set(edges.flat())];
const order = topo(nodes, edges);
equal(order.length, nodes.length, 'production entry graph is acyclic');
check(order.indexOf('A0') < order.indexOf('U0'), 'A0 precedes U0');
check(order.indexOf('U0') < order.indexOf('J0'), 'U0 precedes J0');
check(order.indexOf('J0') < order.indexOf('D0'), 'passive schema precedes Journal CAS activation');
check(order.indexOf('J0') < order.indexOf('A1'), 'final reconciled DAG places J0 before exact content activation');

console.log(`A0/U0/J0 production-entry research model: PASS; cases=${cases}`);
