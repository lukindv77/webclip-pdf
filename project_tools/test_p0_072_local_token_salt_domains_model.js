'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

function token(saltHex, domain, payload) {
  return crypto.createHash('sha256')
    .update(Buffer.from(`webclip-local-token-v1\0${domain}\0`, 'utf8'))
    .update(Buffer.from(saltHex, 'hex'))
    .update(Buffer.from('\0', 'utf8'))
    .update(Buffer.from(payload, 'utf8'))
    .digest('hex');
}

(function sameInstallationStable() {
  const salt = '11'.repeat(32);
  const raw = JSON.stringify({ data: { url: 'https://example.test/?secret=abc' } });
  assert.equal(token(salt, 'legacy-source', raw), token(salt, 'legacy-source', raw));
})();

(function differentInstallationsDoNotCorrelate() {
  const raw = JSON.stringify({ data: { url: 'https://example.test/?secret=abc' } });
  assert.notEqual(
    token('11'.repeat(32), 'legacy-source', raw),
    token('22'.repeat(32), 'legacy-source', raw)
  );
})();

(function domainsDoNotCrossMatch() {
  const salt = '33'.repeat(32);
  const payload = 'https://example.test/a';
  assert.notEqual(token(salt, 'legacy-source', payload), token(salt, 'scope-url', payload));
  assert.notEqual(token(salt, 'scope-url', payload), token(salt, 'scope-site', payload));
})();

(function sameExplicitIdDifferentPayloadStillConflicts() {
  const salt = '44'.repeat(32);
  const a = JSON.stringify({ id: 'same', data: { url: 'https://a.test/' } });
  const b = JSON.stringify({ id: 'same', data: { url: 'https://b.test/' } });
  assert.notEqual(token(salt, 'legacy-source', a), token(salt, 'legacy-source', b));
})();

(function missingSaltWithDependentStateIsIndeterminate() {
  function saltDecision({ salt, dependentRows }) {
    if (salt) return 'use-existing';
    if (dependentRows > 0) return 'fail-closed';
    return 'create';
  }
  assert.equal(saltDecision({ salt: '', dependentRows: 1 }), 'fail-closed');
  assert.equal(saltDecision({ salt: '', dependentRows: 0 }), 'create');
})();

console.log('P0-072 local token salt domain model: PASS');
