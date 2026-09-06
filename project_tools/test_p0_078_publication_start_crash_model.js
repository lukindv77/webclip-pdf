'use strict';

const assert = require('node:assert/strict');

function policy(generation, enabled) {
  return Object.freeze({ version: 1, generation, enabled: Boolean(enabled) });
}

function newOperation(p) {
  return {
    policyGeneration: p.generation,
    requested: p.enabled,
    publicationPhase: p.enabled ? 'eligible' : 'skipped-disabled',
    publicUrl: '',
    publishPutCount: 0
  };
}

function reservePublishIntent(op, currentPolicy) {
  if (!op.requested) return { ...op, publicationPhase: 'skipped-disabled' };
  if (op.publicationPhase !== 'eligible') return { ...op };
  if (!currentPolicy.enabled || currentPolicy.generation !== op.policyGeneration) {
    return { ...op, publicationPhase: 'revoked-before-intent' };
  }
  return { ...op, publicationPhase: 'publish-intent' };
}

function invokeFirstPut(op) {
  assert.equal(op.publicationPhase, 'publish-intent');
  return { ...op, publishPutCount: op.publishPutCount + 1 };
}

function reconcileUnknown(op, metadata, currentPolicy, { providerAbsenceProven = false } = {}) {
  assert.ok(['publish-intent', 'reconciling-unknown'].includes(op.publicationPhase));
  if (metadata?.publicUrl) {
    return { ...op, publicationPhase: 'verified-public', publicUrl: metadata.publicUrl, action: 'none' };
  }

  const exactAuthorityStillCurrent = currentPolicy.enabled && currentPolicy.generation === op.policyGeneration;
  if (!exactAuthorityStillCurrent) {
    return { ...op, publicationPhase: 'reconciling-unknown', action: 'read-only-reconcile' };
  }

  if (!providerAbsenceProven) {
    return { ...op, publicationPhase: 'reconciling-unknown', action: 'read-only-reconcile' };
  }

  return { ...op, publicationPhase: 'eligible', action: 'new-attempt-may-be-admitted' };
}

(function crashAfterIntentBeforePutThenDisableDoesNotPublish() {
  const g1 = policy(1, true);
  let op = reservePublishIntent(newOperation(g1), g1);
  assert.equal(op.publicationPhase, 'publish-intent');
  assert.equal(op.publishPutCount, 0);

  // Worker crashes here, before physical PUT invocation.
  const g2 = policy(2, false);
  op = reconcileUnknown(op, { publicUrl: '' }, g2, { providerAbsenceProven: true });
  assert.equal(op.action, 'read-only-reconcile');
  assert.equal(op.publishPutCount, 0);
})();

(function crashAfterPutThenDisablePreservesObservedPublicTruth() {
  const g1 = policy(10, true);
  let op = reservePublishIntent(newOperation(g1), g1);
  op = invokeFirstPut(op);
  assert.equal(op.publishPutCount, 1);

  // Result is lost; later policy is disabled, but metadata proves publication.
  const g2 = policy(11, false);
  op = reconcileUnknown(op, { publicUrl: 'https://example.invalid/published' }, g2);
  assert.equal(op.publicationPhase, 'verified-public');
  assert.equal(op.publicUrl, 'https://example.invalid/published');
  assert.equal(op.publishPutCount, 1);
})();

(function oneAbsentReadIsNotNoPublishProof() {
  const g1 = policy(20, true);
  let op = invokeFirstPut(reservePublishIntent(newOperation(g1), g1));
  const afterOneRead = reconcileUnknown(op, { publicUrl: '' }, g1, { providerAbsenceProven: false });
  assert.equal(afterOneRead.action, 'read-only-reconcile');
  assert.equal(afterOneRead.publishPutCount, 1);
})();

(function unchangedExactPolicyCanOnlyRetryAfterAbsenceIsProven() {
  const g1 = policy(30, true);
  let op = invokeFirstPut(reservePublishIntent(newOperation(g1), g1));
  op = reconcileUnknown(op, { publicUrl: '' }, g1, { providerAbsenceProven: true });
  assert.equal(op.action, 'new-attempt-may-be-admitted');
  assert.equal(op.publicationPhase, 'eligible');
  assert.equal(op.publishPutCount, 1);
})();

(function abaNeverReauthorizesOldUnknownAttempt() {
  const g1 = policy(40, true);
  let op = invokeFirstPut(reservePublishIntent(newOperation(g1), g1));
  const g3 = policy(42, true); // G2=false existed between them.
  op = reconcileUnknown(op, { publicUrl: '' }, g3, { providerAbsenceProven: true });
  assert.equal(op.action, 'read-only-reconcile');
  assert.equal(op.publishPutCount, 1);
})();

(function disabledOriginNeverGetsAuthorityFromLaterEnable() {
  const g1 = policy(50, false);
  const op = newOperation(g1);
  const g2 = policy(51, true);
  const reserved = reservePublishIntent(op, g2);
  assert.equal(reserved.publicationPhase, 'skipped-disabled');
  assert.equal(reserved.publishPutCount, 0);
})();

console.log('P0-078 publication start crash model: PASS');
