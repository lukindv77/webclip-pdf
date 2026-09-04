'use strict';

const assert = require('node:assert/strict');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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

function detachReadMoveReceipt(entry, resetId) {
  if (!entry.readMovePendingAt || !entry.readMoveTargetPath) return null;
  return {
    version: 1,
    effectId: `read-move:${entry.readMoveOperationId}`,
    effectKind: 'read-move',
    operationId: entry.readMoveOperationId,
    journalEntryId: entry.id,
    sourcePath: entry.readMoveSourcePath,
    targetPath: entry.readMoveTargetPath,
    phase: 'effect-admitted',
    resolution: 'reconciling',
    resetDisposition: {
      version: 1,
      resetId,
      state: 'detached'
    }
  };
}

function hybridReset(db, resetId, { abort = false } = {}) {
  const before = clone(db);
  const next = pureThreeStoreReset(db, resetId);
  next.detachedExternalEffects = clone(db.detachedExternalEffects || []);
  for (const entry of db.entries) {
    const receipt = detachReadMoveReceipt(entry, resetId);
    if (receipt) next.detachedExternalEffects.push(receipt);
  }
  if (abort) return before;
  return next;
}

(function negativeControlPureOptionAIsInsufficient() {
  const db = {
    entries: [{
      id: 'entry-1',
      readMovePendingAt: 123,
      readMoveSourcePath: '/WebClips/ReadmeLater/a.pdf',
      readMoveTargetPath: '/WebClips/Upload/a.pdf',
      readMoveOperationId: 'move-1'
    }],
    pendingAppends: [],
    pendingDownloads: [],
    pendingRemoteSaves: [],
    detachedExternalEffects: []
  };

  const after = pureThreeStoreReset(db, 'reset-1');
  assert.equal(after.entries.length, 0);
  assert.equal(after.detachedExternalEffects.length, 0);
  assert.equal(
    db.entries[0].readMoveOperationId,
    'move-1',
    'negative control: the only admitted read-move authority existed in the Journal entry before reset'
  );
})();

(function hybridResetPreservesAdmittedReadMoveAuthority() {
  const db = {
    entries: [{
      id: 'entry-1',
      readMovePendingAt: 123,
      readMoveSourcePath: '/WebClips/ReadmeLater/a.pdf',
      readMoveTargetPath: '/WebClips/Upload/a.pdf',
      readMoveOperationId: 'move-1'
    }],
    pendingAppends: [],
    pendingDownloads: [{ operationId: 'download-1' }],
    pendingRemoteSaves: [{ operationId: 'save-1', phase: 'prepared' }],
    detachedExternalEffects: []
  };

  const after = hybridReset(db, 'reset-1');
  assert.equal(after.entries.length, 0);
  assert.equal(after.detachedExternalEffects.length, 1);
  assert.deepEqual(after.detachedExternalEffects[0], {
    version: 1,
    effectId: 'read-move:move-1',
    effectKind: 'read-move',
    operationId: 'move-1',
    journalEntryId: 'entry-1',
    sourcePath: '/WebClips/ReadmeLater/a.pdf',
    targetPath: '/WebClips/Upload/a.pdf',
    phase: 'effect-admitted',
    resolution: 'reconciling',
    resetDisposition: { version: 1, resetId: 'reset-1', state: 'detached' }
  });
  assert.equal(after.pendingDownloads[0].journalResetDisposition.resetId, 'reset-1');
  assert.equal(after.pendingRemoteSaves[0].journalResetDisposition.resetId, 'reset-1');
})();

(function lateSettlementUpdatesReceiptNotReplacementJournal() {
  const db = {
    entries: [{
      id: 'entry-1',
      readMovePendingAt: 123,
      readMoveSourcePath: '/WebClips/ReadmeLater/a.pdf',
      readMoveTargetPath: '/WebClips/Upload/a.pdf',
      readMoveOperationId: 'move-1'
    }],
    pendingAppends: [], pendingDownloads: [], pendingRemoteSaves: [], detachedExternalEffects: []
  };
  const afterReset = hybridReset(db, 'reset-1');
  afterReset.entries.push({ id: 'entry-1', title: 'replacement generation' });

  const receipt = afterReset.detachedExternalEffects[0];
  const settled = {
    ...receipt,
    phase: 'verified',
    resolution: 'terminal',
    verifiedTargetPath: receipt.targetPath
  };
  afterReset.detachedExternalEffects[0] = settled;

  assert.equal(afterReset.entries[0].title, 'replacement generation');
  assert.equal(afterReset.entries[0].readMovePendingAt, undefined,
    'P0-072/P0-076 boundary: old move settlement must not patch a replacement Journal row');
  assert.equal(afterReset.detachedExternalEffects[0].resolution, 'terminal');
  assert.equal(afterReset.detachedExternalEffects[0].resetDisposition.resetId, 'reset-1');
})();

(function transactionAbortRollsBackJournalAndReceiptDetachmentTogether() {
  const db = {
    entries: [{
      id: 'entry-1',
      readMovePendingAt: 123,
      readMoveSourcePath: '/from/a.pdf',
      readMoveTargetPath: '/to/a.pdf',
      readMoveOperationId: 'move-1'
    }],
    pendingAppends: [{ operationId: 'append-1' }],
    pendingDownloads: [], pendingRemoteSaves: [], detachedExternalEffects: []
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

console.log('P0-072 external-effect scope model: PASS');
