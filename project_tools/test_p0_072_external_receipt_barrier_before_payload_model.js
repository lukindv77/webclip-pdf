'use strict';
const assert = require('node:assert/strict');

function hasBarrier(row) {
  return Boolean(row)
    && typeof row === 'object'
    && Object.prototype.hasOwnProperty.call(row, 'resetDisposition');
}

function decideExternalMutation(row, supportedPayloadVersion) {
  if (!row || typeof row !== 'object') return 'fail-invalid-envelope';
  if (row.envelopeVersion !== 1) return 'fail-unsupported-envelope';
  if (hasBarrier(row)) return 'deny-reset-detached';
  if (row.payloadVersion !== supportedPayloadVersion) return 'deny-opaque-payload';
  if (row.provenance !== 'worker-issued-live') return 'fail-invalid-provenance';
  return 'payload-handler-may-evaluate-admission';
}

const detachedV2 = {
  envelopeVersion: 1,
  provenance: 'worker-issued-live',
  payloadVersion: 2,
  payload: { phase: 'effect-admitted-v2' },
  resetDisposition: { version: 1, resetId: 'reset-old-worker' }
};

assert.equal(
  decideExternalMutation(detachedV2, 2),
  'deny-reset-detached',
  'a future payload-aware worker must honor the envelope barrier before payload dispatch'
);
assert.equal(
  decideExternalMutation({ ...detachedV2, payloadVersion: 9 }, 2),
  'deny-reset-detached',
  'barrier semantics do not depend on understanding payload version'
);

const activeV2 = { ...detachedV2 };
delete activeV2.resetDisposition;
assert.equal(decideExternalMutation(activeV2, 2), 'payload-handler-may-evaluate-admission');
assert.equal(decideExternalMutation(activeV2, 1), 'deny-opaque-payload');

function buggyPayloadFirst(row, supportedPayloadVersion) {
  if (row.payloadVersion === supportedPayloadVersion && row.payload?.phase === 'effect-admitted-v2') {
    return 'BUG-mutation-replay';
  }
  if (hasBarrier(row)) return 'deny-reset-detached';
  return 'other';
}

assert.equal(
  buggyPayloadFirst(detachedV2, 2),
  'BUG-mutation-replay',
  'negative control: payload-first dispatch can bypass a cross-version reset barrier'
);

console.log('P0-072 external receipt barrier-before-payload model: PASS');
