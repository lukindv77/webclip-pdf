'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');

function digest(salt, version, kind, key) {
  return crypto.createHash('sha256').update(`scope-v${version}\0${salt}\0${kind}\0${key}`).digest('hex');
}

function ensureSalt(state) {
  if (state.salt) return state.salt;
  if (state.receipts.length) {
    const error = new Error('scope salt missing while receipts exist');
    error.code = 'SCOPE_SALT_MISSING';
    throw error;
  }
  state.salt = 'new-random-salt';
  return state.salt;
}

function matchReceipt(state, receipt, { version, kind, key, clearAll = false }) {
  if (clearAll) return 'match';
  if (!state.salt) return 'indeterminate';
  if (receipt.scopeTokenVersion !== version) return 'indeterminate';
  const expected = digest(state.salt, version, kind, key);
  const actual = kind === 'url' ? receipt.urlScopeToken : receipt.siteScopeToken;
  return actual === expected ? 'match' : 'nonmatch';
}

(function newSaltOnlyWhenNoReceiptsExist() {
  const state = { salt: '', receipts: [] };
  assert.equal(ensureSalt(state), 'new-random-salt');
})();

(function missingSaltWithExistingReceiptsFailsClosed() {
  const state = { salt: '', receipts: [{ effectId: 'e1' }] };
  assert.throws(() => ensureSalt(state), (e) => e.code === 'SCOPE_SALT_MISSING');
})();

(function unsupportedTokenVersionIsIndeterminateNotNonmatch() {
  const state = { salt: 's', receipts: [] };
  const receipt = { scopeTokenVersion: 1, urlScopeToken: digest('s', 1, 'url', 'https://example.test/a') };
  assert.equal(matchReceipt(state, receipt, { version: 2, kind: 'url', key: 'https://example.test/a' }), 'indeterminate');
})();

(function clearAllDoesNotDependOnSalt() {
  const state = { salt: '', receipts: [] };
  const receipt = { scopeTokenVersion: 1, urlScopeToken: 'opaque' };
  assert.equal(matchReceipt(state, receipt, { version: 1, kind: 'url', key: '', clearAll: true }), 'match');
})();

(function supportedVersionMatchesExactly() {
  const state = { salt: 's', receipts: [] };
  const receipt = {
    scopeTokenVersion: 1,
    urlScopeToken: digest('s', 1, 'url', 'https://example.test/a'),
    siteScopeToken: digest('s', 1, 'site', 'example.test')
  };
  assert.equal(matchReceipt(state, receipt, { version: 1, kind: 'url', key: 'https://example.test/a' }), 'match');
  assert.equal(matchReceipt(state, receipt, { version: 1, kind: 'url', key: 'https://example.test/b' }), 'nonmatch');
})();

console.log('P0-072 scope token lifecycle model: PASS');
