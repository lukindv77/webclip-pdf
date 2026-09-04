'use strict';

const assert = require('node:assert/strict');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function workerIssueReadMoveReceipt({ entryId, operationId, sourcePath, targetPath, journalGeneration }) {
  return {
    version: 1,
    effectId: `read-move:${operationId}`,
    effectKind: 'read-move',
    provenance: 'worker-issued-live',
    operationId,
    journalEntryId: entryId,
    journalGeneration,
    sourcePath,
    targetPath,
    phase: 'effect-admitted',
    resolution: 'reconciling'
  };
}

function pureThreeStoreReset(db, resetId) {
  const next = clone(db);
  for (const storeName of ['pendingAppends', 'pendingDownloads', 'pendingRemoteSaves']) {
    next[storeName] = next[storeName].map((row) => ({
      ...row,
      journalResetDisposition: {
        version: 1,
        resetId,
        state: 'quarantined',
        outcome: 'pending',
        resolution: 'reconciling'
      }
    }));
  }
  next.entries = [];
  return next;
}

function hybridReset(db, resetId, { abort = false } = {}) {
  const before = clone(db);
  const next = pureThreeStoreReset(db, resetId);
  next.externalEffects = clone(db.externalEffects || []).map((receipt) => ({
    ...receipt,
    resetDisposition: receipt.resetDisposition || {
      version: 1,
      resetId,
      state: 'detached'
    }
  }));
  if (abort) return before;
  return next;
}

(function negativeControlPureOptionAIsInsufficient() {
  const receipt = workerIssueReadMoveReceipt({
    entryId: 'entry-1', operationId: 'move-1',
    sourcePath: '/WebClips/ReadmeLater/a.pdf', targetPath: '/WebClips/Upload/a.pdf',
    journalGeneration: 'gen-A'
  });
  const db = {
    entries: [{ id: 'entry-1', readMovePendingAt: 123, readMoveOperationId: 'move-1' }],
    pendingAppends: [], pendingDownloads: [], pendingRemoteSaves: [], externalEffects: [receipt]
  };

  const after = pureThreeStoreReset(db, 'reset-1');
  assert.equal(after.entries.length, 0);
  assert.equal(after.externalEffects[0].resetDisposition, undefined,
    'negative control: three-store quarantine alone does not detach independent move authority from old Journal generation');
})();

(function importedProjectionCannotFabricatePhysicalAuthority() {
  const importedOnly = {
    entries: [{
      id: 'imported-entry',
      readMovePendingAt: 123,
      readMoveSourcePath: '/from/fake.pdf',
      readMoveTargetPath: '/to/fake.pdf',
      readMoveOperationId: 'imported-fake-op'
    }],
    pendingAppends: [], pendingDownloads: [], pendingRemoteSaves: [], externalEffects: []
  };
  const after = hybridReset(importedOnly, 'reset-imported');
  assert.equal(after.externalEffects.length, 0,
    'P0-072 provenance: reset must not synthesize a physical receipt from importable Journal readMove* projection fields');
})();

(function hybridResetPreservesWorkerIssuedAdmittedReadMoveAuthority() {
  const receipt = workerIssueReadMoveReceipt({
    entryId: 'entry-1', operationId: 'move-1',
    sourcePath: '/WebClips/ReadmeLater/a.pdf', targetPath: '/WebClips/Upload/a.pdf',
    journalGeneration: 'gen-A'
  });
  const db = {
    entries: [{ id: 'entry-1', readMovePendingAt: 123, readMoveOperationId: 'move-1' }],
    pendingAppends: [],
    pendingDownloads: [{ operationId: 'download-1' }],
    pendingRemoteSaves: [{ operationId: 'save-1', phase: 'prepared' }],
    externalEffects: [receipt]
  };

  const after = hybridReset(db, 'reset-1');
  assert.equal(after.entries.length, 0);
  assert.equal(after.externalEffects.length, 1);
  assert.equal(after.externalEffects[0].provenance, 'worker-issued-live');
  assert.equal(after.externalEffects[0].journalGeneration, 'gen-A');
  assert.deepEqual(after.externalEffects[0].resetDisposition,
    { version: 1, resetId: 'reset-1', state: 'detached' });
  assert.equal(after.pendingDownloads[0].journalResetDisposition.resetId, 'reset-1');
  assert.equal(after.pendingRemoteSaves[0].journalResetDisposition.resetId, 'reset-1');
})();

(function lateSettlementUpdatesReceiptNotReplacementJournal() {
  const receipt = workerIssueReadMoveReceipt({
    entryId: 'entry-1', operationId: 'move-1',
    sourcePath: '/from/a.pdf', targetPath: '/to/a.pdf', journalGeneration: 'gen-A'
  });
  const db = {
    entries: [{ id: 'entry-1', readMovePendingAt: 123, readMoveOperationId: 'move-1' }],
    pendingAppends: [], pendingDownloads: [], pendingRemoteSaves: [], externalEffects: [receipt]
  };
  const afterReset = hybridReset(db, 'reset-1');
  afterReset.entries.push({ id: 'entry-1', title: 'replacement generation', generation: 'gen-B' });

  afterReset.externalEffects[0] = {
    ...afterReset.externalEffects[0],
    phase: 'verified',
    resolution: 'terminal',
    verifiedTargetPath: afterReset.externalEffects[0].targetPath
  };

  assert.equal(afterReset.entries[0].title, 'replacement generation');
  assert.equal(afterReset.entries[0].readMovePendingAt, undefined,
    'P0-072/P0-076 boundary: old move settlement must not patch a replacement Journal row');
  assert.equal(afterReset.externalEffects[0].resolution, 'terminal');
  assert.equal(afterReset.externalEffects[0].resetDisposition.resetId, 'reset-1');
})();

(function transactionAbortRollsBackJournalAndReceiptDetachmentTogether() {
  const receipt = workerIssueReadMoveReceipt({
    entryId: 'entry-1', operationId: 'move-1', sourcePath: '/from/a.pdf', targetPath: '/to/a.pdf', journalGeneration: 'gen-A'
  });
  const db = {
    entries: [{ id: 'entry-1', readMovePendingAt: 123, readMoveOperationId: 'move-1' }],
    pendingAppends: [{ operationId: 'append-1' }], pendingDownloads: [], pendingRemoteSaves: [], externalEffects: [receipt]
  };
  const aborted = hybridReset(db, 'reset-abort', { abort: true });
  assert.deepEqual(aborted, db,
    'forced transaction abort must restore Journal and every receipt/disposition transition');
})();

(function capacityClassesAreNotEquivalent() {
  const rows = [
    { state: 'active' },
    { state: 'detached', resolution: 'reconciling' },
    { state: 'detached', resolution: 'manual-resolution' },
    { state: 'detached', resolution: 'terminal' }
  ];
  const active = rows.filter((r) => r.state === 'active' || r.resolution === 'reconciling').length;
  const unresolved = rows.filter((r) => r.resolution === 'manual-resolution').length;
  const terminal = rows.filter((r) => r.resolution === 'terminal').length;
  assert.deepEqual({ active, unresolved, terminal }, { active: 2, unresolved: 1, terminal: 1 });
})();

(function trashMoveDependencyRemainsExplicit() {
  const currentTrashReceipt = null;
  assert.equal(currentTrashReceipt, null,
    'P1-183 prerequisite model: Delete->Trash has no current durable exact pre-move receipt to detach');
})();

console.log('P0-072 external-effect scope/provenance model: PASS');
