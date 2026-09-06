'use strict';
const assert = require('node:assert/strict');

const FIXED_EXISTING = [
  'revision',
  'journalImportLease',
  'webclipJournalBackupLease'
];
const LOCAL_SALT = 'journalLocalTokenSalt:v1';
const EXTERNAL_PREFIX = 'externalEffect:';
const LEGACY_FENCE_PREFIX = 'legacyPendingFence:v1:';

function classifyMetaKey(key) {
  const value = String(key || '');
  if (value === LOCAL_SALT) return 'p0-072-local-salt';
  if (value.startsWith(EXTERNAL_PREFIX)) return 'p0-072-external-effect';
  if (value.startsWith(LEGACY_FENCE_PREFIX)) return 'p0-072-legacy-fence';
  return 'unreserved';
}

for (const key of FIXED_EXISTING) {
  assert.equal(classifyMetaKey(key), 'unreserved', `existing fixed key ${key} must not collide`);
}

assert.equal(classifyMetaKey(LOCAL_SALT), 'p0-072-local-salt');
assert.equal(
  classifyMetaKey('externalEffect:11111111-1111-4111-8111-111111111111'),
  'p0-072-external-effect'
);
assert.equal(
  classifyMetaKey('legacyPendingFence:v1:' + 'a'.repeat(64)),
  'p0-072-legacy-fence'
);

function genericMetaWriteAllowed(key) {
  return classifyMetaKey(key) === 'unreserved';
}

assert.equal(genericMetaWriteAllowed('externalEffect:anything'), false);
assert.equal(genericMetaWriteAllowed(LOCAL_SALT), false);
assert.equal(genericMetaWriteAllowed('someFutureUnrelatedKey'), true);

console.log('P0-072 journal meta namespace ownership model: PASS');
