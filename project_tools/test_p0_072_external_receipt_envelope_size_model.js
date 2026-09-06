'use strict';
const assert = require('node:assert/strict');

const MAX_ENVELOPE_V1_JSON_CHARS = 64 * 1024;

function sizeChars(row) {
  return JSON.stringify(row).length;
}

function envelopeV1SizeAllowed(row) {
  return row?.envelopeVersion === 1
    && sizeChars(row) <= MAX_ENVELOPE_V1_JSON_CHARS;
}

const base = {
  key: 'externalEffect:11111111-1111-4111-8111-111111111111',
  envelopeVersion: 1,
  effectId: '11111111-1111-4111-8111-111111111111',
  provenance: 'worker-issued-live',
  scopeTokenVersion: 1,
  urlScopeToken: 'a'.repeat(64),
  siteScopeToken: 'b'.repeat(64),
  payloadVersion: 2,
  payload: { metadata: 'x'.repeat(16 * 1024) }
};

assert.equal(envelopeV1SizeAllowed(base), true);

const oversized = {
  ...base,
  payload: { metadata: 'x'.repeat(70 * 1024) }
};
assert.equal(envelopeV1SizeAllowed(oversized), false);
assert.equal(
  envelopeV1SizeAllowed({ ...oversized, envelopeVersion: 2 }),
  false,
  'v1 runtime never interprets a v2 envelope as a widened v1 record'
);

console.log('P0-072 external receipt envelope size model: PASS');
