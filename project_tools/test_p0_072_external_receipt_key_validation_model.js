'use strict';
const assert = require('node:assert/strict');

const PREFIX = 'externalEffect:';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function classifyKey(key) {
  const value = String(key || '');
  if (!value.startsWith(PREFIX)) return 'outside';
  const suffix = value.slice(PREFIX.length);
  return UUID_V4.test(suffix) ? 'receipt-key' : 'reserved-root-invalid';
}

assert.equal(classifyKey('revision'), 'outside');
assert.equal(classifyKey('externalEffect:'), 'reserved-root-invalid');
assert.equal(classifyKey('externalEffect:not-a-uuid'), 'reserved-root-invalid');
assert.equal(classifyKey('externalEffect:11111111-1111-4111-8111-111111111111'), 'receipt-key');

function scanDecision(keys, max = 4) {
  let count = 0;
  for (const key of keys) {
    if (!String(key).startsWith(PREFIX)) continue;
    count += 1;
    if (count > max) return 'overflow-abort';
    if (classifyKey(key) !== 'receipt-key') return 'corruption-abort';
  }
  return 'ok';
}

assert.equal(scanDecision(['revision', 'externalEffect:bad']), 'corruption-abort');
assert.equal(scanDecision(Array.from({ length: 5 }, (_, index) =>
  `externalEffect:11111111-1111-4111-8111-${String(index).padStart(12, '0')}`), 4), 'overflow-abort');

console.log('P0-072 external receipt key validation model: PASS');
