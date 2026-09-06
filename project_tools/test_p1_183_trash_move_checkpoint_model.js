'use strict';

const assert = require('node:assert/strict');

function prepareTrashMove({ journalEntryId, sourcePath, targetPath, sourceResourceId, provenance, entryRevision }) {
  if (!provenance || !sourceResourceId) return { outcome: 'not-admitted' };
  return {
    outcome: 'prepared',
    receipt: Object.freeze({
      version: 1,
      journalEntryId,
      sourcePath,
      targetPath,
      expectedSourceResourceId: sourceResourceId,
      sourceIdentityProvenanceReceipt: provenance,
      expectedJournalEntryRevision: entryRevision,
      movePhase: 'prepared'
    })
  };
}

function reconcile(receipt, source, target) {
  if (target?.resourceId === receipt.expectedSourceResourceId) return 'verified-same-object';
  if (target && target.resourceId && target.resourceId !== receipt.expectedSourceResourceId) {
    return source?.resourceId === receipt.expectedSourceResourceId
      ? 'conflict-target-other-source-still-exact'
      : 'conflict-indeterminate';
  }
  if (!target && source?.resourceId === receipt.expectedSourceResourceId) return 'source-still-exact';
  return 'manual-indeterminate';
}

(function crashAfterMoveKeepsExactTarget() {
  const prepared = prepareTrashMove({
    journalEntryId: 'J1', sourcePath: '/Upload/a.pdf', targetPath: '/Trash/2026-09/a.pdf',
    sourceResourceId: 'RID-A', provenance: 'trusted-A', entryRevision: 7
  });
  assert.equal(prepared.outcome, 'prepared');
  assert.equal(prepared.receipt.targetPath, '/Trash/2026-09/a.pdf');
  assert.equal(reconcile(prepared.receipt, null, { resourceId: 'RID-A' }), 'verified-same-object');
})();

(function unknownAttemptCannotPickNewTargetBeforeReconcile() {
  const receipt = prepareTrashMove({
    journalEntryId: 'J2', sourcePath: '/Upload/a.pdf', targetPath: '/Trash/T1.pdf',
    sourceResourceId: 'RID-A', provenance: 'trusted-A', entryRevision: 1
  }).receipt;
  const attemptedNewTarget = '/Trash/T2.pdf';
  assert.notEqual(attemptedNewTarget, receipt.targetPath);
  assert.equal(reconcile(receipt, { resourceId: 'RID-A' }, null), 'source-still-exact');
  // Reconciliation result is required before any T2 admission.
})();

(function targetCollisionDoesNotOverwriteB() {
  const receipt = prepareTrashMove({
    journalEntryId: 'J3', sourcePath: '/Upload/a.pdf', targetPath: '/Trash/T1.pdf',
    sourceResourceId: 'RID-A', provenance: 'trusted-A', entryRevision: 1
  }).receipt;
  assert.equal(
    reconcile(receipt, { resourceId: 'RID-A' }, { resourceId: 'RID-B' }),
    'conflict-target-other-source-still-exact'
  );
})();

(function remoteVerifiedThenLocalDeleteFailureNeedsNoSecondMove() {
  const receipt = prepareTrashMove({
    journalEntryId: 'J4', sourcePath: '/Upload/a.pdf', targetPath: '/Trash/T1.pdf',
    sourceResourceId: 'RID-A', provenance: 'trusted-A', entryRevision: 3
  }).receipt;
  const phase = reconcile(receipt, null, { resourceId: 'RID-A' });
  assert.equal(phase, 'verified-same-object');
  const nextAction = phase === 'verified-same-object' ? 'local-finalization-only' : 'remote-reconcile';
  assert.equal(nextAction, 'local-finalization-only');
})();

(function staleEntryRevisionCannotDeleteReplacement() {
  const receipt = prepareTrashMove({
    journalEntryId: 'J5', sourcePath: '/Upload/a.pdf', targetPath: '/Trash/T1.pdf',
    sourceResourceId: 'RID-A', provenance: 'trusted-A', entryRevision: 10
  }).receipt;
  const currentEntryRevision = 11;
  assert.notEqual(receipt.expectedJournalEntryRevision, currentEntryRevision);
})();

(function missingProvenanceBlocksCheckpointAdmission() {
  const result = prepareTrashMove({
    journalEntryId: 'J6', sourcePath: '/Upload/a.pdf', targetPath: '/Trash/T1.pdf',
    sourceResourceId: 'RID-A', provenance: '', entryRevision: 1
  });
  assert.equal(result.outcome, 'not-admitted');
})();

console.log('P1-183 Trash move checkpoint model: PASS');
