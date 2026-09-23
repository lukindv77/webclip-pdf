'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const WORKER = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const OPTIONS = fs.readFileSync(path.join(ROOT, 'options.js'), 'utf8');

function section(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start, `missing source section: ${startMarker} -> ${endMarker}`);
  return text.slice(start, end);
}

const source = section(WORKER, 'function describeYandexAuthTruth', 'async function getYandexStatus');
const context = vm.createContext({
  Object, Boolean, String, Number, Date,
  normalizeYandexAuthGeneration(value) {
    const n = Math.floor(Number(value) || 0);
    return Number.isSafeInteger(n) && n >= 0 ? n : 0;
  }
});
vm.runInContext(`${source}\nthis.describe = describeYandexAuthTruth;`, context);

let checks = 0;
function eq(actual, expected, message) { assert.strictEqual(actual, expected, message); checks += 1; }
function ok(value, message) { assert.ok(value, message); checks += 1; }

const now = 1_800_000_000_000;

// No auth: presence/usability false, validity/lifetime knowledge remain explicit unknown.
{
  const s = context.describe(null, 9, now);
  eq(s.authPresent, false, 'absent auth not present');
  eq(s.authValidity, 'unknown', 'absent auth validity unknown');
  eq(s.authUsable, false, 'absent auth unusable');
  eq(s.expiryKnowledge, 'unknown', 'absent lifetime unknown');
  eq(s.authGeneration, 9, 'status reports shared control generation');
  eq(s.authRecordGeneration, 0, 'absent auth has no record generation');
}

// Legacy token remains compatibility-usable, but validity/lifetime are not fabricated.
{
  const s = context.describe({ accessToken: 'legacy-token', expiresAt: 0 }, 9, now);
  eq(s.authPresent, true, 'legacy token present');
  eq(s.authValidity, 'unknown', 'legacy validity remains unknown');
  eq(s.expiryKnowledge, 'unknown', 'zero expiry remains unknown lifetime');
  eq(s.authUsable, true, 'legacy token remains compatibility-admissible absent negative evidence');
  eq(s.authExpirySkewActive, false, 'unknown expiry has no fabricated skew');
}

// Modern OAuth token with known future expiry is valid and usable.
{
  const s = context.describe({
    accessToken: 'token-A',
    authGeneration: 7,
    validity: 'valid',
    expiryKnowledge: 'known',
    expiresAt: now + 300_000
  }, 7, now);
  eq(s.authValidity, 'valid', 'modern token valid');
  eq(s.expiryKnowledge, 'known', 'future expiry known');
  eq(s.authUsable, true, 'future token usable');
  eq(s.authRecordGeneration, 7, 'record generation exposed separately');
  eq(s.authExpiresAt, now + 300_000, 'exact expiry timestamp reported');
}

// Manual validated token is valid-at-validation-time but lifetime remains unknown.
{
  const s = context.describe({
    accessToken: 'manual-A',
    authGeneration: 11,
    validity: 'valid',
    expiryKnowledge: 'unknown',
    expiresAt: 0
  }, 11, now);
  eq(s.authValidity, 'valid', 'manual validated token validity explicit');
  eq(s.expiryKnowledge, 'unknown', 'manual lifetime unknown');
  eq(s.authUsable, true, 'validated manual token usable');
}

// Actual provider expiry instant produces expired validity.
{
  const s = context.describe({
    accessToken: 'token-A',
    validity: 'valid',
    expiresAt: now - 1
  }, 7, now);
  eq(s.authValidity, 'expired', 'past expiry overrides stored valid');
  eq(s.authUsable, false, 'expired token unusable');
  eq(s.authExpirySkewActive, true, 'expired token also lies inside admission skew');
  eq(s.expiryKnowledge, 'known', 'expired timestamp is known');
}

// Near expiry inside 60-second admission skew is not mislabeled expired.
{
  const s = context.describe({
    accessToken: 'token-A',
    validity: 'valid',
    expiresAt: now + 30_000
  }, 7, now);
  eq(s.authValidity, 'valid', 'near-expiry token remains temporally valid');
  eq(s.authUsable, false, 'near-expiry token blocked for new admission');
  eq(s.authExpirySkewActive, true, 'near-expiry skew explicit');
}

// Just outside skew remains usable.
{
  const s = context.describe({
    accessToken: 'token-A',
    validity: 'valid',
    expiresAt: now + 60_001
  }, 7, now);
  eq(s.authUsable, true, 'outside skew usable');
  eq(s.authExpirySkewActive, false, 'outside skew not active');
}

// Persisted invalid state, including a future tombstone shape, is never usable.
{
  const present = context.describe({ accessToken: 'token-A', validity: 'invalid', expiresAt: 0 }, 12, now);
  eq(present.authValidity, 'invalid', 'stored invalid preserved');
  eq(present.authUsable, false, 'invalid token unusable');

  const tombstone = context.describe({ accessToken: '', validity: 'invalid', expiryKnowledge: 'unknown' }, 13, now);
  eq(tombstone.authPresent, false, 'invalid tombstone has no secret presence');
  eq(tombstone.authValidity, 'invalid', 'invalid tombstone remains explicit');
  eq(tombstone.authUsable, false, 'invalid tombstone unusable');
}

// A malformed "valid" record without token cannot claim validity.
{
  const s = context.describe({ accessToken: '', validity: 'valid', expiresAt: 0 }, 4, now);
  eq(s.authValidity, 'unknown', 'no-token valid claim downgraded to unknown');
  eq(s.authUsable, false, 'no-token record unusable');
}

// Shared control generation and record generation are distinct axes, not counters invented by P1-196.
{
  const s = context.describe({ accessToken: 'A', authGeneration: 5, validity: 'valid', expiresAt: 0 }, 8, now);
  eq(s.authGeneration, 8, 'shared control generation reported');
  eq(s.authRecordGeneration, 5, 'record generation retained');
}

// Pure classifier must not touch Chrome/network/storage.
ok(!source.includes('chrome.'), 'truth classifier has no storage mutation');
ok(!source.includes('fetch('), 'truth classifier has no network');
ok(!source.includes('runYandexAuthStorageOperation'), 'truth classifier is side-effect free');

const status = section(WORKER, 'async function getYandexStatus()', 'async function getYandexConfig()');
ok(status.includes('const authTruth = describeYandexAuthTruth(yandexAuth, authGeneration)'), 'status derives explicit auth truth');
ok(status.includes('connected: authTruth.authUsable'), 'compat connected means admission-usable');
for (const field of ['authPresent', 'authValidity', 'authUsable', 'expiryKnowledge', 'authGeneration', 'authRecordGeneration', 'authExpiresAt', 'authExpirySkewActive']) {
  ok(status.includes(`${field}: authTruth.${field}`), `status exposes ${field}`);
}

const finish = section(WORKER, 'async function finishYandexOAuth(authAttemptId, code)', 'async function exchangeAuthorizationCode');
ok(finish.includes("expiryKnowledge: expiresInSeconds ? 'known' : 'unknown'"), 'OAuth records carry explicit lifetime knowledge');
ok(finish.includes("validity: 'valid'"), 'fresh OAuth token marked valid');
ok(finish.includes('validityObservedAt: now'), 'fresh OAuth validity observation timestamped');

const manual = section(WORKER, 'async function setManualYandexToken(token)', 'async function getValidYandexAccessToken');
ok(manual.includes("expiryKnowledge: 'unknown'"), 'manual token lifetime stays unknown');
ok(manual.includes("validity: 'valid'"), 'validated manual token marked valid');
ok(manual.includes('validityObservedAt: validatedAt'), 'manual validation timestamped');

const optionsStatus = section(OPTIONS, 'async function refreshStatus(prefetched = null)', 'async function saveRoot(path)');
ok(optionsStatus.includes("status.authPresent && status.authValidity === 'expired'"), 'UI distinguishes expired token');
ok(optionsStatus.includes('status.authPresent && status.authExpirySkewActive'), 'UI distinguishes admission-skew token');
ok(optionsStatus.includes('status.authPresent'), 'UI distinguishes present-but-unusable token from absent');

const validToken = section(WORKER, 'async function getValidYandexAccessToken()', 'function sanitizeYandexApiCallerHeaders');
ok(validToken.includes('yandexAuth.expiresAt && yandexAuth.expiresAt <= Date.now() + 60_000'), 'existing known-expiry admission guard preserved');
ok(!validToken.includes('validityGeneration'), 'known-expiry persistent transition remains separate gap');

console.log(`P1-196 auth status axes runtime tests: PASS; checks=${checks}; status_axes=true; connected_means_usable=true; zero_expiry_unknown=true; near_expiry_not_falsely_expired=true; known_expiry_transition_remaining=true; provider_calls=0`);
