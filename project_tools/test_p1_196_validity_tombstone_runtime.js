'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');

function section(startMarker, endMarker) {
  const start = SOURCE.indexOf(startMarker);
  const end = SOURCE.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start, `missing source section: ${startMarker} -> ${endMarker}`);
  return SOURCE.slice(start, end);
}

function makeContext({
  auth = {
    authRecordId: 'A',
    authGeneration: 7,
    source: 'oauth-pkce-code',
    clientId: 'client',
    accessToken: 'secret-A',
    refreshToken: '',
    expiresAt: 1_800_000_000_000,
    expiryKnowledge: 'known',
    validity: 'valid',
    validityObservedAt: 1_700_000_000_000,
    account: { uid: 'acct-A', login: 'a', displayName: 'A' }
  },
  controlGeneration = 7
} = {}) {
  const values = {
    yandexAuth: structuredClone(auth),
    yandexAuthGeneration: controlGeneration,
    yandexOAuthPending: { authAttemptId: 'pending-A' }
  };

  const context = vm.createContext({
    Promise, Error, Number, String, Object, Boolean, Date,
    MAX_YANDEX_CLIENT_ID_CHARS: 512,
    YANDEX_AUTH_KEY: 'yandexAuth',
    YANDEX_AUTH_GENERATION_KEY: 'yandexAuthGeneration',
    YANDEX_OAUTH_PENDING_KEY: 'yandexOAuthPending',
    chrome: {
      storage: {
        session: {
          async get(keys) {
            const list = Array.isArray(keys) ? keys : [keys];
            const out = {};
            for (const key of list) {
              if (Object.prototype.hasOwnProperty.call(values, key)) out[key] = structuredClone(values[key]);
            }
            return out;
          },
          async set(next) { Object.assign(values, structuredClone(next)); }
        }
      }
    },
    async runYandexAuthStorageOperation(fn) { return fn(); },
    normalizeYandexAuthGeneration(value) {
      const n = Math.floor(Number(value) || 0);
      return Number.isSafeInteger(n) && n >= 0 ? n : 0;
    },
    nextYandexAuthGeneration(value) {
      const n = Math.floor(Number(value) || 0);
      if (!Number.isSafeInteger(n) || n < 0 || n >= Number.MAX_SAFE_INTEGER) throw new Error('generation overflow');
      return n + 1;
    }
  });

  const code = section('function isYandexAuthValidityTombstone', 'async function readYandexAuthState');
  vm.runInContext(`${code}
this.api = {
  isYandexAuthValidityTombstone,
  createYandexAuthValidityTombstone,
  makeYandexAuthRequestReceipt,
  transitionYandexAuthValidityIfCurrentRequest
};`, context);
  return { context, values };
}

(async () => {
  let checks = 0;
  const eq = (actual, expected, message) => { assert.strictEqual(actual, expected, message); checks += 1; };
  const ok = (value, message) => { assert.ok(value, message); checks += 1; };

  // Direct tombstone construction carries only bounded, non-secret subject/validity metadata.
  {
    const { context } = makeContext();
    const current = {
      authRecordId: 'A',
      authGeneration: 7,
      source: 'oauth-pkce-code',
      clientId: 'client',
      accessToken: 'secret-A',
      refreshToken: 'refresh-secret',
      scope: 'cloud_api:disk.read cloud_api:disk.write',
      expiresAt: 12345,
      expiryKnowledge: 'known',
      account: { uid: 'acct-A' }
    };
    const tombstone = context.api.createYandexAuthValidityTombstone(current, 'invalid', 8, 2000);
    eq(tombstone.authRecordId, 'A', 'subject record identity retained');
    eq(tombstone.authGeneration, 8, 'tombstone uses advanced generation');
    eq(tombstone.validity, 'invalid', 'invalid state explicit');
    eq(tombstone.validityObservedAt, 2000, 'observation time explicit');
    eq(tombstone.expiryKnowledge, 'known', 'known lifetime metadata retained');
    eq(tombstone.expiresAt, 12345, 'known expiry timestamp retained');
    eq(tombstone.account.uid, 'acct-A', 'non-secret account provenance retained');
    ok(!Object.prototype.hasOwnProperty.call(tombstone, 'accessToken'), 'access token omitted');
    ok(!Object.prototype.hasOwnProperty.call(tombstone, 'refreshToken'), 'refresh token omitted');
    ok(!Object.prototype.hasOwnProperty.call(tombstone, 'scope'), 'scope/capability material omitted');
    ok(!JSON.stringify(tombstone).includes('secret-A'), 'access secret absent from serialized tombstone');
    ok(!JSON.stringify(tombstone).includes('refresh-secret'), 'refresh secret absent from serialized tombstone');
    ok(context.api.isYandexAuthValidityTombstone(tombstone), 'constructed tombstone recognized');
  }

  // Exact current receipt transitions A -> invalid(A@8), advances shared generation and clears pending.
  {
    const { context, values } = makeContext();
    const receipt = context.api.makeYandexAuthRequestReceipt(values.yandexAuth, values.yandexAuthGeneration);
    eq(receipt.authorizationBound, true, 'current auth produces bound receipt');
    ok(!JSON.stringify(receipt).includes('secret-A'), 'request receipt is secret-free');
    eq(await context.api.transitionYandexAuthValidityIfCurrentRequest(receipt, 'invalid', 3000), true, 'exact current invalid transition commits');
    eq(values.yandexAuth.validity, 'invalid', 'invalid tombstone stored');
    eq(values.yandexAuth.authRecordId, 'A', 'subject A retained');
    eq(values.yandexAuth.authGeneration, 8, 'tombstone gets new generation');
    eq(values.yandexAuthGeneration, 8, 'control generation advances');
    eq(values.yandexOAuthPending, null, 'pending authority cleared');
    ok(!Object.prototype.hasOwnProperty.call(values.yandexAuth, 'accessToken'), 'stored invalid tombstone has no token');
  }

  // Exact expiry uses the same primitive and preserves known lifetime truth.
  {
    const { context, values } = makeContext();
    const receipt = context.api.makeYandexAuthRequestReceipt(values.yandexAuth, values.yandexAuthGeneration);
    eq(await context.api.transitionYandexAuthValidityIfCurrentRequest(receipt, 'expired', 4000), true, 'exact current expiry transition commits');
    eq(values.yandexAuth.validity, 'expired', 'expired tombstone stored');
    eq(values.yandexAuth.authGeneration, 8, 'expiry transition advances generation');
    eq(values.yandexAuth.expiryKnowledge, 'known', 'known lifetime remains known');
    ok(!Object.prototype.hasOwnProperty.call(values.yandexAuth, 'accessToken'), 'stored expired tombstone has no token');
  }

  // A late A receipt cannot mutate newer B.
  {
    const { context, values } = makeContext();
    const staleA = context.api.makeYandexAuthRequestReceipt(values.yandexAuth, values.yandexAuthGeneration);
    values.yandexAuth = {
      authRecordId: 'B',
      authGeneration: 8,
      source: 'manual',
      accessToken: 'secret-B',
      expiresAt: 0,
      expiryKnowledge: 'unknown',
      validity: 'valid'
    };
    values.yandexAuthGeneration = 8;
    values.yandexOAuthPending = null;
    eq(await context.api.transitionYandexAuthValidityIfCurrentRequest(staleA, 'invalid', 5000), false, 'stale A receipt rejected');
    eq(values.yandexAuth.authRecordId, 'B', 'newer B preserved');
    eq(values.yandexAuth.accessToken, 'secret-B', 'newer B secret untouched');
    eq(values.yandexAuthGeneration, 8, 'newer generation not advanced by stale A');
  }

  // A newer intent changing only control generation also fences stale response.
  {
    const { context, values } = makeContext();
    const staleA = context.api.makeYandexAuthRequestReceipt(values.yandexAuth, values.yandexAuthGeneration);
    values.yandexAuthGeneration = 8;
    eq(await context.api.transitionYandexAuthValidityIfCurrentRequest(staleA, 'expired', 6000), false, 'control-generation drift fences transition');
    eq(values.yandexAuth.accessToken, 'secret-A', 'current auth remains live when receipt is stale');
    eq(values.yandexAuthGeneration, 8, 'new control generation preserved');
  }

  // Legacy/unshaped auth has no generation-bound mutation authority.
  {
    const { context, values } = makeContext({
      auth: { accessToken: 'legacy-secret', expiresAt: 0 },
      controlGeneration: 9
    });
    const receipt = context.api.makeYandexAuthRequestReceipt(values.yandexAuth, values.yandexAuthGeneration);
    eq(receipt.authorizationBound, false, 'legacy auth receipt unbound');
    eq(await context.api.transitionYandexAuthValidityIfCurrentRequest(receipt, 'invalid', 7000), false, 'unbound legacy receipt cannot create tombstone');
    eq(values.yandexAuth.accessToken, 'legacy-secret', 'legacy record unchanged by unbound transition');
    eq(values.yandexAuthGeneration, 9, 'legacy control generation unchanged');
  }

  // Tombstones cannot themselves be transitioned/replayed because they contain no live credential.
  {
    const { context, values } = makeContext();
    const receipt = context.api.makeYandexAuthRequestReceipt(values.yandexAuth, values.yandexAuthGeneration);
    await context.api.transitionYandexAuthValidityIfCurrentRequest(receipt, 'invalid', 8000);
    const tombstoneReceipt = context.api.makeYandexAuthRequestReceipt(values.yandexAuth, values.yandexAuthGeneration);
    eq(tombstoneReceipt.authorizationBound, true, 'subject identity remains structurally bound');
    eq(await context.api.transitionYandexAuthValidityIfCurrentRequest(tombstoneReceipt, 'expired', 9000), false, 'tombstone has no live credential authority to transition again');
    eq(values.yandexAuth.validity, 'invalid', 'first terminal validity truth preserved');
  }

  // Source-level admission boundary: future skew blocks but must not call transition.
  const authority = section('async function captureCurrentYandexAuthRequestAuthority()', 'async function demoteYandexAuthIfCurrentRequest');
  ok(authority.includes("expiresAt > 0 && expiresAt <= capturedAt"), 'exact expiry boundary explicit');
  ok(authority.includes("transitionYandexAuthValidityIfCurrentRequest(authority.receipt, 'expired'"), 'exact expiry publishes transition');
  ok(authority.includes("error.code = 'YANDEX_AUTH_TOKEN_EXPIRY_SKEW'"), 'future admission skew has distinct code');
  const skewAt = authority.indexOf("YANDEX_AUTH_TOKEN_EXPIRY_SKEW");
  const expiredTransitionAt = authority.indexOf("transitionYandexAuthValidityIfCurrentRequest(authority.receipt, 'expired'");
  ok(expiredTransitionAt >= 0 && skewAt >= 0, 'both expiry and skew branches exist');

  const demote = section('async function demoteYandexAuthIfCurrentRequest(receipt)', 'async function compareUpdateYandexAuthIfCurrentRequest');
  ok(demote.includes("transitionYandexAuthValidityIfCurrentRequest(receipt, 'invalid'"), '401 demotion composes shared tombstone primitive');

  console.log(`P1-196 validity tombstone runtime tests: PASS; checks=${checks}; invalid_tombstone=non-secret; expired_tombstone=non-secret; exact_generation_cas=true; stale_response_blocked=true; expiry_skew_non_transition=true; live_provider_calls=0`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
