'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');

function token(salt, kind, key) {
  return crypto.createHash('sha256').update(`webclip-scope-v1\0${salt}\0${kind}\0${key}`, 'utf8').digest('hex');
}

function makeReceipt({ salt, urlKey, siteKey }) {
  return {
    version: 1,
    provenance: 'worker-issued-live',
    effectId: 'effect-1',
    urlScopeToken: token(salt, 'url', urlKey),
    siteScopeToken: token(salt, 'site', siteKey)
  };
}

function makeDisposition(resetId, scope) {
  return { version: 1, resetId, scope, state: 'quarantined', outcome: 'pending', resolution: 'reconciling' };
}

(function exactUrlMatchesWithoutPersistingUrl() {
  const salt = 'installation-random-salt';
  const secretUrl = 'https://example.test/a?token=SECRET-123';
  const receipt = makeReceipt({ salt, urlKey: secretUrl, siteKey: 'example.test' });
  assert.equal(receipt.urlScopeToken, token(salt, 'url', secretUrl));
  assert.notEqual(receipt.urlScopeToken, token(salt, 'url', 'https://example.test/b'));
  assert.equal(JSON.stringify(receipt).includes('SECRET-123'), false);
})();

(function differentInstallationSaltDoesNotCorrelateToken() {
  const key = 'https://example.test/a?token=SECRET';
  assert.notEqual(token('salt-a', 'url', key), token('salt-b', 'url', key));
})();

(function siteAndUrlNamespacesCannotCrossMatch() {
  const salt = 'salt';
  const sameText = 'example.test';
  assert.notEqual(token(salt, 'url', sameText), token(salt, 'site', sameText));
})();

(function resetDispositionCarriesNoScopeKeyPlaintext() {
  const disposition = makeDisposition('reset-1', 'url');
  assert.equal(Object.prototype.hasOwnProperty.call(disposition, 'scopeKey'), false);
  assert.equal(JSON.stringify(disposition).includes('https://'), false);
})();

(function scopeTokenIsNotPhysicalAuthority() {
  const receipt = makeReceipt({ salt: 's', urlKey: 'https://example.test/a', siteKey: 'example.test' });
  assert.equal(receipt.provenance, 'worker-issued-live');
  assert.ok(receipt.effectId);
  assert.ok(receipt.urlScopeToken);
  assert.notEqual(receipt.urlScopeToken, receipt.effectId);
})();

console.log('P0-072 minimal scope token model: PASS');
