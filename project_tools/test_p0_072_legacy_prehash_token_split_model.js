'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');

function stableProjectionJson(value) {
  const sortObject = (input) => {
    if (Array.isArray(input)) return input.map(sortObject);
    if (!input || typeof input !== 'object') return input;
    const out = {};
    for (const key of Object.keys(input).sort()) out[key] = sortObject(input[key]);
    return out;
  };
  return JSON.stringify(sortObject(value));
}

function sourcePrehash(projection) {
  return crypto.createHash('sha256').update(Buffer.from(stableProjectionJson(projection), 'utf8')).digest();
}

function localToken(salt, domain, prehash) {
  const hash = crypto.createHash('sha256');
  hash.update(Buffer.from('webclip-local-token-v1\0', 'utf8'));
  hash.update(Buffer.from(domain, 'utf8'));
  hash.update(Buffer.from([0]));
  hash.update(salt);
  hash.update(Buffer.from([0]));
  hash.update(prehash);
  return hash.digest('hex');
}

(function sameProjectionHasStableEphemeralPrehash() {
  const projection = { explicitId: '', data: { title: 'T', url: 'https://example.test/a' } };
  assert.deepEqual(sourcePrehash(projection), sourcePrehash(projection));
})();

(function persistedTokenStillDependsOnInstallationSalt() {
  const projection = { explicitId: '', data: { title: 'T', url: 'https://example.test/a' } };
  const prehash = sourcePrehash(projection);
  const saltA = Buffer.from(Array.from({ length: 32 }, (_, index) => index));
  const saltB = Buffer.from(Array.from({ length: 32 }, (_, index) => 31 - index));
  assert.notEqual(localToken(saltA, 'legacy-source', prehash), localToken(saltB, 'legacy-source', prehash));
})();

(function domainSeparationStillAppliesToConstantSizeFinalInput() {
  const projection = { explicitId: '', data: { title: 'T', url: 'https://example.test/a' } };
  const prehash = sourcePrehash(projection);
  const salt = Buffer.alloc(32, 7);
  assert.notEqual(localToken(salt, 'legacy-source', prehash), localToken(salt, 'scope-url', prehash));
})();

(function differentProjectionStillProducesDifferentFinalIdentity() {
  const salt = Buffer.alloc(32, 9);
  const one = sourcePrehash({ explicitId: '', data: { url: 'https://example.test/a' } });
  const two = sourcePrehash({ explicitId: '', data: { url: 'https://example.test/b' } });
  assert.notEqual(localToken(salt, 'legacy-source', one), localToken(salt, 'legacy-source', two));
})();

console.log('P0-072 legacy prehash/final-token split model: PASS');
