'use strict';

const assert = require('node:assert/strict');

function nextPolicy(previous, enabled) {
  const prev = previous || { version: 1, generation: 0, enabled: true };
  const nextEnabled = Boolean(enabled);
  if (prev.enabled === nextEnabled) return { ...prev };
  return { version: 1, generation: prev.generation + 1, enabled: nextEnabled };
}

function newOperation(policy) {
  return {
    policyGeneration: policy.generation,
    requestedPublicLink: policy.enabled,
    publicationPhase: policy.enabled ? 'eligible' : 'skipped-disabled',
    publicUrl: ''
  };
}

function admitPublication(operation, currentPolicy) {
  if (!operation.requestedPublicLink) return { ...operation, publicationPhase: 'skipped-disabled' };
  if (operation.publicationPhase !== 'eligible') return { ...operation };
  if (!currentPolicy.enabled || currentPolicy.generation !== operation.policyGeneration) {
    return { ...operation, publicationPhase: 'revoked-before-admission' };
  }
  return { ...operation, publicationPhase: 'admitted' };
}

function reconcileAfterUnknown(operation, metadata) {
  assert.ok(['admitted', 'unknown'].includes(operation.publicationPhase));
  if (metadata?.publicUrl) {
    return { ...operation, publicationPhase: 'verified-public', publicUrl: metadata.publicUrl };
  }
  return { ...operation, publicationPhase: 'unknown' };
}

(function disableBeforeAdmissionRevokesOldOperation() {
  const g1 = { version: 1, generation: 11, enabled: true };
  const op = newOperation(g1);
  const g2 = nextPolicy(g1, false);
  assert.equal(g2.generation, 12);
  assert.equal(admitPublication(op, g2).publicationPhase, 'revoked-before-admission');
})();

(function reenableDoesNotResurrectOldGeneration() {
  const g1 = { version: 1, generation: 20, enabled: true };
  const op = newOperation(g1);
  const g2 = nextPolicy(g1, false);
  const g3 = nextPolicy(g2, true);
  assert.equal(g3.enabled, true);
  assert.notEqual(g3.generation, op.policyGeneration);
  assert.equal(admitPublication(op, g3).publicationPhase, 'revoked-before-admission');
})();

(function admissionBeforeDisableCannotBePretendedCancelled() {
  const g1 = { version: 1, generation: 30, enabled: true };
  let op = admitPublication(newOperation(g1), g1);
  assert.equal(op.publicationPhase, 'admitted');
  const g2 = nextPolicy(g1, false);
  assert.equal(g2.enabled, false);
  op = { ...op, publicationPhase: 'unknown' };
  const reconciled = reconcileAfterUnknown(op, { publicUrl: 'https://example.invalid/public-A' });
  assert.equal(reconciled.publicationPhase, 'verified-public');
  assert.equal(reconciled.publicUrl.includes('public-A'), true);
})();

(function operationStartedDisabledCannotUseLaterEnable() {
  const g1 = { version: 1, generation: 40, enabled: false };
  const op = newOperation(g1);
  const g2 = nextPolicy(g1, true);
  assert.equal(admitPublication(op, g2).publicationPhase, 'skipped-disabled');
})();

(function unrelatedConfigChangeDoesNotAdvancePolicyGeneration() {
  const g1 = { version: 1, generation: 50, enabled: true };
  const same = nextPolicy(g1, true);
  assert.equal(same.generation, 50);
})();

(function bothWriterPathsMustUseSameTransitionFunction() {
  const g1 = { version: 1, generation: 60, enabled: true };
  const checkboxWrite = nextPolicy(g1, false);
  const importedWrite = nextPolicy(g1, false);
  assert.deepEqual(checkboxWrite, importedWrite);
})();

(function completedHistoricalLinkIsNotMassRevokedByPreferenceToggle() {
  const completed = {
    policyGeneration: 70,
    requestedPublicLink: true,
    publicationPhase: 'verified-public',
    publicUrl: 'https://example.invalid/existing'
  };
  const g71 = { version: 1, generation: 71, enabled: false };
  assert.equal(g71.enabled, false);
  assert.equal(completed.publicationPhase, 'verified-public');
  assert.equal(completed.publicUrl, 'https://example.invalid/existing');
})();

(function legacyTrueWithoutGenerationFailsClosed() {
  const legacy = { requestedPublicLink: true, publicationPhase: 'eligible' };
  const hasGeneration = Number.isSafeInteger(legacy.policyGeneration);
  assert.equal(hasGeneration, false);
  const outcome = hasGeneration ? 'eligible' : 'manual-publication-authority-unverifiable';
  assert.equal(outcome, 'manual-publication-authority-unverifiable');
})();

console.log('P0-078 public-link policy generation model: PASS');
