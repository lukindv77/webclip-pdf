'use strict';
const assert = require('node:assert/strict');

const effectId = '11111111-1111-4111-8111-111111111111';
const oldVersionedScan = (keys) => keys.filter((key) => key.startsWith('externalEffect:v1:'));
const stableRootScan = (keys) => keys.filter((key) => key.startsWith('externalEffect:'));

const versionedFutureKey = `externalEffect:v2:${effectId}`;
const stableFutureKey = `externalEffect:${effectId}`;

assert.equal(oldVersionedScan([versionedFutureKey]).length, 0,
  'a v1-only key namespace cannot discover a future v2 receipt after downgrade');
assert.equal(stableRootScan([stableFutureKey]).length, 1,
  'a stable receipt root keeps future body versions discoverable by old reset scans');

function classifyBody(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return 'invalid';
  if (record.version !== 1) return 'unsupported-version';
  return record.provenance === 'worker-issued-live' ? 'valid' : 'invalid';
}

assert.equal(classifyBody({ version: 2, provenance: 'worker-issued-live' }), 'unsupported-version');

function resetDecision(record) {
  return classifyBody(record) === 'valid' ? 'classify-and-detach' : 'abort-unknown-receipt';
}

assert.equal(resetDecision({ version: 2 }), 'abort-unknown-receipt');
assert.equal(resetDecision(null), 'abort-unknown-receipt');

console.log('P0-072 external receipt namespace/version model: PASS');
