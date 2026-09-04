'use strict';

const assert = require('node:assert/strict');

const RECEIPT_PREFIX = 'externalEffect:v1:';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function receiptKey(effectId) {
  return `${RECEIPT_PREFIX}${effectId}`;
}

function createDb(entries = []) {
  return {
    entries: clone(entries),
    meta: {
      revision: { key: 'revision', value: 'rev-1' },
      journalImportLease: { key: 'journalImportLease', value: { leaseToken: 'lease-1' } },
      webclipJournalBackupLease: { key: 'webclipJournalBackupLease', value: { token: 'backup-1' } }
    },
    pendingAppends: [],
    pendingDownloads: [],
    pendingRemoteSaves: []
  };
}

function issuePreparedReadMove(db, {
  effectId,
  operationId,
  entryId,
  urlKey,
  siteKey,
  sourceResourceId,
  sourcePath,
  targetPath,
  accountUid,
  rootPath,
  journalGeneration
}) {
  const key = receiptKey(effectId);
  assert.equal(db.meta[key], undefined, 'P0-072: effectId must identify exactly one worker-issued receipt.');
  db.meta[key] = {
    key,
    version: 1,
    provenance: 'worker-issued-live',
    effectId,
    effectKind: 'read-move',
    operationId,
    journalEntryId: entryId,
    journalGeneration,
    urlKey,
    siteKey,
    sourceIdentity: {
      kind: sourceResourceId ? 'resource-id' : 'path-only',
      resourceId: sourceResourceId || '',
      sourcePath,
      accountUid,
      rootPath
    },
    targetPath,
    phase: 'prepared',
    resolution: 'reconciling',
    resetDisposition: null
  };
  return key;
}

function getReceipt(db, effectId) {
  return db.meta[receiptKey(effectId)] || null;
}

function admitExternalEffect(db, effectId) {
  const current = getReceipt(db, effectId);
  if (!current || current.provenance !== 'worker-issued-live') return false;
  if (current.resetDisposition || current.phase !== 'prepared') return false;
  current.phase = 'effect-admitted';
  return true;
}

function scopeMatches(receipt, scope) {
  if (scope.kind === 'all') return true;
  if (scope.kind === 'url') return receipt.urlKey === scope.key;
  if (scope.kind === 'site') return receipt.siteKey === scope.key;
  return false;
}

function resetJournal(db, { resetId, scope, replacementEntries = null, abort = false }) {
  const before = clone(db);
  const next = clone(db);

  for (const [key, receipt] of Object.entries(next.meta)) {
    if (!key.startsWith(RECEIPT_PREFIX)) continue;
    if (!scopeMatches(receipt, scope)) continue;
    if (receipt.resetDisposition) continue;

    const wasPrepared = receipt.phase === 'prepared';
    receipt.resetDisposition = {
      version: 1,
      resetId,
      scope: scope.kind,
      scopeKey: scope.key || '',
      state: 'detached'
    };
    if (wasPrepared) {
      receipt.phase = 'cancelled-before-start';
      receipt.resolution = 'terminal';
    }
  }

  if (scope.kind === 'all') {
    next.entries = replacementEntries ? clone(replacementEntries) : [];
  } else {
    next.entries = next.entries.filter((entry) => {
      if (scope.kind === 'url') return entry.urlKey !== scope.key;
      if (scope.kind === 'site') return entry.siteKey !== scope.key;
      return true;
    });
  }

  for (const storeName of ['pendingAppends', 'pendingDownloads', 'pendingRemoteSaves']) {
    next[storeName] = next[storeName].map((row) => {
      const matches = scope.kind === 'all'
        || (scope.kind === 'url' && row.urlKey === scope.key)
        || (scope.kind === 'site' && row.siteKey === scope.key);
      if (!matches || row.journalResetDisposition) return row;
      return {
        ...row,
        journalResetDisposition: { version: 1, resetId, state: 'quarantined' }
      };
    });
  }

  return abort ? before : next;
}

function settleVerified(db, effectId, verifiedTargetPath) {
  const receipt = getReceipt(db, effectId);
  assert(receipt, 'P0-072: verified settlement needs its durable worker-issued receipt.');
  assert.equal(receipt.phase, 'effect-admitted', 'only an admitted side effect may become verified');
  receipt.phase = 'verified';
  receipt.resolution = 'terminal';
  receipt.verifiedTargetPath = verifiedTargetPath;

  if (receipt.resetDisposition) return { journalUpdated: false };
  const entry = db.entries.find((candidate) => candidate.id === receipt.journalEntryId && candidate.generation === receipt.journalGeneration);
  if (!entry) return { journalUpdated: false };
  entry.readingMode = 'read';
  entry.remotePath = verifiedTargetPath;
  return { journalUpdated: true };
}

(function importedProjectionCannotCreateAuthority() {
  const db = createDb([{
    id: 'entry-imported',
    generation: 'gen-imported',
    urlKey: 'https://example.test/a',
    siteKey: 'example.test',
    readMovePendingAt: 123,
    readMoveSourcePath: '/fake/source.pdf',
    readMoveTargetPath: '/fake/target.pdf',
    readMoveOperationId: 'fake-op'
  }]);

  assert.equal(Object.keys(db.meta).filter((key) => key.startsWith(RECEIPT_PREFIX)).length, 0,
    'P0-072: portable readMove* projection alone must never manufacture local physical authority.');
  assert.equal(admitExternalEffect(db, 'fake-op'), false);
})();

(function resetBeforeAdmissionProvesNoLateStart() {
  let db = createDb([{ id: 'entry-1', generation: 'gen-A', urlKey: 'https://example.test/a', siteKey: 'example.test' }]);
  issuePreparedReadMove(db, {
    effectId: 'effect-1', operationId: 'op-1', entryId: 'entry-1',
    urlKey: 'https://example.test/a', siteKey: 'example.test',
    sourceResourceId: 'rid-1', sourcePath: '/ReadmeLater/a.pdf', targetPath: '/Upload/a.pdf',
    accountUid: 'uid-A', rootPath: '/WebClips', journalGeneration: 'gen-A'
  });

  db = resetJournal(db, { resetId: 'reset-before', scope: { kind: 'all', key: '' } });
  assert.equal(getReceipt(db, 'effect-1').phase, 'cancelled-before-start');
  assert.equal(getReceipt(db, 'effect-1').resolution, 'terminal');
  assert.equal(admitExternalEffect(db, 'effect-1'), false,
    'P0-072: reset that wins before effect-admission must prevent the external move from starting later.');
})();

(function admissionBeforeResetDetachesUnknownCapableAuthority() {
  let db = createDb([{ id: 'entry-1', generation: 'gen-A', urlKey: 'https://example.test/a', siteKey: 'example.test' }]);
  issuePreparedReadMove(db, {
    effectId: 'effect-2', operationId: 'op-2', entryId: 'entry-1',
    urlKey: 'https://example.test/a', siteKey: 'example.test',
    sourceResourceId: 'rid-2', sourcePath: '/ReadmeLater/a.pdf', targetPath: '/Upload/a.pdf',
    accountUid: 'uid-A', rootPath: '/WebClips', journalGeneration: 'gen-A'
  });
  assert.equal(admitExternalEffect(db, 'effect-2'), true);

  db = resetJournal(db, {
    resetId: 'reset-after-admit',
    scope: { kind: 'all', key: '' },
    replacementEntries: [{ id: 'entry-1', generation: 'gen-B', title: 'replacement' }]
  });

  const detached = getReceipt(db, 'effect-2');
  assert.equal(detached.phase, 'effect-admitted');
  assert.equal(detached.resetDisposition.resetId, 'reset-after-admit');

  const settled = settleVerified(db, 'effect-2', '/Upload/a.pdf');
  assert.equal(settled.journalUpdated, false);
  assert.equal(db.entries[0].title, 'replacement');
  assert.equal(db.entries[0].readingMode, undefined,
    'P0-072/P0-076: detached old settlement must not patch same-id replacement Journal generation.');
  assert.equal(getReceipt(db, 'effect-2').phase, 'verified');
})();

(function scopedResetUsesImmutableReceiptScope() {
  let db = createDb([
    { id: 'a', generation: 'A', urlKey: 'https://example.test/a', siteKey: 'example.test' },
    { id: 'b', generation: 'B', urlKey: 'https://other.test/b', siteKey: 'other.test' }
  ]);
  issuePreparedReadMove(db, {
    effectId: 'effect-a', operationId: 'same-op', entryId: 'a', urlKey: 'https://example.test/a', siteKey: 'example.test',
    sourceResourceId: 'rid-a', sourcePath: '/ReadmeLater/a.pdf', targetPath: '/Upload/a.pdf', accountUid: 'uid', rootPath: '/WebClips', journalGeneration: 'A'
  });
  issuePreparedReadMove(db, {
    effectId: 'effect-b', operationId: 'same-op', entryId: 'b', urlKey: 'https://other.test/b', siteKey: 'other.test',
    sourceResourceId: 'rid-b', sourcePath: '/ReadmeLater/b.pdf', targetPath: '/Upload/b.pdf', accountUid: 'uid', rootPath: '/WebClips', journalGeneration: 'B'
  });

  db = resetJournal(db, { resetId: 'reset-url', scope: { kind: 'url', key: 'https://example.test/a' } });
  assert.equal(getReceipt(db, 'effect-a').resetDisposition.resetId, 'reset-url');
  assert.equal(getReceipt(db, 'effect-b').resetDisposition, null);
  assert.equal(db.entries.length, 1);
  assert.equal(db.entries[0].id, 'b');
  assert.notEqual(receiptKey('effect-a'), receiptKey('effect-b'),
    'P0-072: operationId is not the physical receipt primary key.');
})();

(function metaPrefixIsolationPreservesExistingControlRecords() {
  let db = createDb([{ id: 'a', generation: 'A', urlKey: 'https://example.test/a', siteKey: 'example.test' }]);
  issuePreparedReadMove(db, {
    effectId: 'effect-meta', operationId: 'op', entryId: 'a', urlKey: 'https://example.test/a', siteKey: 'example.test',
    sourceResourceId: 'rid', sourcePath: '/ReadmeLater/a.pdf', targetPath: '/Upload/a.pdf', accountUid: 'uid', rootPath: '/WebClips', journalGeneration: 'A'
  });
  const controls = {
    revision: clone(db.meta.revision),
    importLease: clone(db.meta.journalImportLease),
    backupLease: clone(db.meta.webclipJournalBackupLease)
  };
  db = resetJournal(db, { resetId: 'reset-meta', scope: { kind: 'all', key: '' } });
  assert.deepEqual(db.meta.revision, controls.revision);
  assert.deepEqual(db.meta.journalImportLease, controls.importLease);
  assert.deepEqual(db.meta.webclipJournalBackupLease, controls.backupLease);
})();

(function secondResetPreservesFirstDetachmentIdentity() {
  let db = createDb([{ id: 'a', generation: 'A', urlKey: 'https://example.test/a', siteKey: 'example.test' }]);
  issuePreparedReadMove(db, {
    effectId: 'effect-repeat', operationId: 'op', entryId: 'a', urlKey: 'https://example.test/a', siteKey: 'example.test',
    sourceResourceId: 'rid', sourcePath: '/ReadmeLater/a.pdf', targetPath: '/Upload/a.pdf', accountUid: 'uid', rootPath: '/WebClips', journalGeneration: 'A'
  });
  assert.equal(admitExternalEffect(db, 'effect-repeat'), true);
  db = resetJournal(db, { resetId: 'reset-first', scope: { kind: 'all', key: '' } });
  db = resetJournal(db, { resetId: 'reset-second', scope: { kind: 'all', key: '' } });
  assert.equal(getReceipt(db, 'effect-repeat').resetDisposition.resetId, 'reset-first');
})();

(function transactionAbortRestoresEverything() {
  const db = createDb([{ id: 'a', generation: 'A', urlKey: 'https://example.test/a', siteKey: 'example.test' }]);
  issuePreparedReadMove(db, {
    effectId: 'effect-abort', operationId: 'op', entryId: 'a', urlKey: 'https://example.test/a', siteKey: 'example.test',
    sourceResourceId: 'rid', sourcePath: '/ReadmeLater/a.pdf', targetPath: '/Upload/a.pdf', accountUid: 'uid', rootPath: '/WebClips', journalGeneration: 'A'
  });
  const before = clone(db);
  const after = resetJournal(db, { resetId: 'reset-abort', scope: { kind: 'all', key: '' }, abort: true });
  assert.deepEqual(after, before, 'P0-072: reset abort restores Journal, pending stores, and namespaced meta receipts together.');
})();

(function capacityClassesRemainSeparate() {
  const receipts = [
    { phase: 'prepared', resolution: 'reconciling', resetDisposition: null },
    { phase: 'effect-admitted', resolution: 'reconciling', resetDisposition: { resetId: 'r' } },
    { phase: 'unknown', resolution: 'manual-resolution', resetDisposition: { resetId: 'r' } },
    { phase: 'verified', resolution: 'terminal', resetDisposition: { resetId: 'r' } },
    { phase: 'cancelled-before-start', resolution: 'terminal', resetDisposition: { resetId: 'r' } }
  ];
  const active = receipts.filter((row) => row.resolution === 'reconciling').length;
  const manual = receipts.filter((row) => row.resolution === 'manual-resolution').length;
  const terminal = receipts.filter((row) => row.resolution === 'terminal').length;
  assert.deepEqual({ active, manual, terminal }, { active: 2, manual: 1, terminal: 2 });
})();

console.log('P0-072 meta receipt linearization model: PASS');
