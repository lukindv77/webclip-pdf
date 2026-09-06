'use strict';

const assert = require('node:assert/strict');

function prepareMove(source, targetPath) {
  if (!source?.destructiveProvenance) return { outcome: 'manual-untrusted-source-provenance' };
  if (!source?.resourceId) return { outcome: 'manual-missing-source-identity' };
  return {
    outcome: 'prepared',
    receipt: Object.freeze({
      version: 1,
      sourcePath: source.path,
      targetPath,
      expectedSourceResourceId: source.resourceId,
      expectedSourcePublicUrl: source.publicUrl || '',
      sourceIdentityProvenanceReceipt: source.destructiveProvenance
    })
  };
}

function verifyTarget(receipt, target) {
  if (!target) return 'target-absent';
  if (target.type !== 'file') return 'target-not-file';
  if (!target.resourceId) return 'target-identity-missing';
  if (target.resourceId !== receipt.expectedSourceResourceId) return 'target-identity-conflict';
  return 'verified-same-object';
}

function reconcileUnknown(receipt, source, target) {
  const targetResult = verifyTarget(receipt, target);
  if (targetResult === 'verified-same-object') return 'verified-moved';
  if (targetResult === 'target-identity-conflict') {
    if (source?.resourceId === receipt.expectedSourceResourceId) return 'target-conflict-source-still-exact';
    return 'target-conflict-source-indeterminate';
  }
  if (!target && source?.resourceId === receipt.expectedSourceResourceId) return 'source-still-exact-reconcile-before-retry';
  if (!target && !source) return 'manual-object-location-indeterminate';
  return targetResult;
}

const trusted = (source) => ({ ...source, destructiveProvenance: 'trusted-native-receipt' });

(function exactSourceToExactTargetSucceeds() {
  const prepared = prepareMove(trusted({ path: '/A/x.pdf', resourceId: 'RID-A' }), '/Trash/x.pdf');
  assert.equal(prepared.outcome, 'prepared');
  assert.equal(reconcileUnknown(prepared.receipt, null, { type: 'file', path: '/Trash/x.pdf', resourceId: 'RID-A' }), 'verified-moved');
})();

(function samePathTypeSizeDifferentObjectIsConflict() {
  const prepared = prepareMove(trusted({ path: '/A/x.pdf', resourceId: 'RID-A' }), '/Trash/x.pdf').receipt;
  const target = { type: 'file', path: '/Trash/x.pdf', resourceId: 'RID-B', size: 100 };
  assert.equal(verifyTarget(prepared, target), 'target-identity-conflict');
})();

(function newlyObservedTargetIdCannotBootstrapMissingSourceIdentity() {
  const result = prepareMove(trusted({ path: '/A/x.pdf', resourceId: '' }), '/Trash/x.pdf');
  assert.equal(result.outcome, 'manual-missing-source-identity');
})();

(function trustedNativeSourceMayBeEnrichedBeforeMutation() {
  const preMoveGet = trusted({ type: 'file', path: '/A/x.pdf', resourceId: 'RID-A' });
  const prepared = prepareMove(preMoveGet, '/Trash/x.pdf');
  assert.equal(prepared.outcome, 'prepared');
  assert.equal(prepared.receipt.expectedSourceResourceId, 'RID-A');
})();

(function importedPathOnlyCannotManufactureDestructiveProvenance() {
  const importedPathLookup = { type: 'file', path: '/A/x.pdf', resourceId: 'RID-B', destructiveProvenance: '' };
  const prepared = prepareMove(importedPathLookup, '/Trash/x.pdf');
  assert.equal(prepared.outcome, 'manual-untrusted-source-provenance');
})();

(function targetConflictWithSourceStillPresentDoesNotFinalizeWrongObject() {
  const receipt = prepareMove(trusted({ path: '/A/x.pdf', resourceId: 'RID-A' }), '/Trash/x.pdf').receipt;
  const outcome = reconcileUnknown(
    receipt,
    { type: 'file', path: '/A/x.pdf', resourceId: 'RID-A' },
    { type: 'file', path: '/Trash/x.pdf', resourceId: 'RID-B' }
  );
  assert.equal(outcome, 'target-conflict-source-still-exact');
})();

(function bothMissingIsIndeterminateNotSuccess() {
  const receipt = prepareMove(trusted({ path: '/A/x.pdf', resourceId: 'RID-A' }), '/Trash/x.pdf').receipt;
  assert.equal(reconcileUnknown(receipt, null, null), 'manual-object-location-indeterminate');
})();

(function targetMissingIdentityDoesNotAdoptPath() {
  const receipt = prepareMove(trusted({ path: '/A/x.pdf', resourceId: 'RID-A' }), '/Trash/x.pdf').receipt;
  assert.equal(verifyTarget(receipt, { type: 'file', path: '/Trash/x.pdf', resourceId: '' }), 'target-identity-missing');
})();

console.log('P1-090 exact Yandex move identity model: PASS');
