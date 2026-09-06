'use strict';
const assert = require('node:assert/strict');

const sourceTokenV1 = 'a'.repeat(64);
const sourceTokenV2 = 'b'.repeat(64);
const v1Key = `legacyPendingFence:v1:${sourceTokenV1}`;
const v2Key = `legacyPendingFence:v2:${sourceTokenV2}`;

function oldWorkerSeesFence(meta) {
  return meta.has(v1Key);
}

const unsafeUpgrade = new Map([[v2Key, { version: 2 }]]);
assert.equal(oldWorkerSeesFence(unsafeUpgrade), false,
  'v2-only namespace migration is rollback-unsafe for a v1 worker');

const safeUpgrade = new Map([
  [v1Key, { version: 1, state: 'fenced' }],
  [v2Key, { version: 2 }]
]);
assert.equal(oldWorkerSeesFence(safeUpgrade), true,
  'future code must retain the v1 tombstone while the legacy source can recur');

function canDeleteV1Fence({ legacySourceCanRecur, dependentV1State }) {
  return !legacySourceCanRecur && !dependentV1State;
}

assert.equal(canDeleteV1Fence({ legacySourceCanRecur: true, dependentV1State: false }), false);
assert.equal(canDeleteV1Fence({ legacySourceCanRecur: false, dependentV1State: true }), false);
assert.equal(canDeleteV1Fence({ legacySourceCanRecur: false, dependentV1State: false }), true);

console.log('P0-072 legacy fence version evolution model: PASS');
