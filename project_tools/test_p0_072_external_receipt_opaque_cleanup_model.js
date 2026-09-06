'use strict';
const assert = require('node:assert/strict');

function cleanupDecision(row, supportedPayloadVersion) {
  if (!row || row.envelopeVersion !== 1) return 'preserve-indeterminate';
  if (row.payloadVersion !== supportedPayloadVersion) return 'preserve-opaque-unresolved';
  if (row.payload?.resolution === 'terminal') return 'eligible-terminal-policy';
  return 'preserve-unresolved';
}

const futureTerminal = {
  envelopeVersion: 1,
  payloadVersion: 2,
  payload: { resolution: 'terminal' }
};
assert.equal(
  cleanupDecision(futureTerminal, 1),
  'preserve-opaque-unresolved',
  'an old worker cannot trust a future payload terminal marker it does not understand'
);
assert.equal(
  cleanupDecision(futureTerminal, 2),
  'eligible-terminal-policy'
);

const detachedFuture = {
  ...futureTerminal,
  resetDisposition: { version: 1, resetId: 'old-reset' }
};
assert.equal(
  cleanupDecision(detachedFuture, 1),
  'preserve-opaque-unresolved',
  'reset detachment does not make an opaque future payload terminal-cleanable by an old worker'
);

console.log('P0-072 opaque external receipt cleanup model: PASS');
