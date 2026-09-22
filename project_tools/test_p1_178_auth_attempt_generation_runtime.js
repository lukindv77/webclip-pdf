'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const workerSource = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const optionsSource = fs.readFileSync(path.join(root, 'options.js'), 'utf8');

function section(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Source markers not found: ${startMarker} -> ${endMarker}`);
  return text.slice(start, end);
}

function makeStorage() {
  const values = {};
  return {
    values,
    session: {
      async get(keys) {
        const list = Array.isArray(keys) ? keys : [keys];
        const out = {};
        for (const key of list) {
          if (Object.prototype.hasOwnProperty.call(values, key)) out[key] = values[key];
        }
        return out;
      },
      async set(next) {
        Object.assign(values, structuredClone(next));
      },
      async remove(keys) {
        for (const key of (Array.isArray(keys) ? keys : [keys])) delete values[key];
      }
    }
  };
}

function makeContext() {
  const storage = makeStorage();
  let randomCounter = 0;
  const context = vm.createContext({
    chrome: { storage: { session: storage.session } },
    Promise,
    Error,
    Number,
    String,
    Date,
    Math,
    structuredClone,
    setTimeout,
    clearTimeout,
    randomBase64Url() { randomCounter += 1; return `id-${randomCounter}`; },
    withOperationTimeout(promise) { return Promise.resolve(promise); },
    async removeLegacyPersistentYandexAuth() {},
    async updateYandexConfig(mutator) { return mutator({}); }
  });

  const code = section(
    workerSource,
    'let yandexAuthStorageSettlementChain',
    'async function removeLegacyPersistentYandexAuth'
  );
  vm.runInContext(`
    const YANDEX_AUTH_STORAGE_TIMEOUT_MS = 10000;
    const YANDEX_AUTH_KEY = 'yandexAuth';
    const YANDEX_OAUTH_PENDING_KEY = 'yandexOAuthPending';
    const YANDEX_AUTH_GENERATION_KEY = 'yandexAuthGeneration';
    const YANDEX_OAUTH_TRANSPORT = 'yandex-verification-code-pkce-v1';
    const YANDEX_AUTH_STORAGE_SESSION = 'session';
    ${code}
    this.api = {
      beginYandexOAuthAttemptControl,
      captureYandexOAuthAttemptControl,
      compareRemoveYandexOAuthPendingControl,
      advanceYandexAuthControlGeneration,
      commitYandexOAuthAttemptControl,
      compareUpdateYandexAuthRecord,
      compareClearYandexAuthRecord,
      disconnectYandexAuthControl
    };
  `, context);

  return { context, storage };
}

async function rejectsCode(promise, code) {
  await assert.rejects(promise, (error) => error && error.code === code);
}

(async () => {
  let cases = 0;
  const check = (value, message) => { cases += 1; assert.ok(value, message); };
  const eq = (actual, expected, message) => { cases += 1; assert.strictEqual(actual, expected, message); };

  {
    const { context, storage } = makeContext();
    const A = await context.api.beginYandexOAuthAttemptControl({
      clientId: 'client-A', codeVerifier: 'verifier-A', state: 'state-A', createdAt: 100, expiresAt: 1000
    });
    const B = await context.api.beginYandexOAuthAttemptControl({
      clientId: 'client-B', codeVerifier: 'verifier-B', state: 'state-B', createdAt: 200, expiresAt: 1200
    });
    eq(A.authGeneration, 1, 'first OAuth attempt claims generation 1');
    eq(B.authGeneration, 2, 'second OAuth attempt advances generation');
    eq(storage.values.yandexOAuthPending.authAttemptId, B.authAttemptId, 'newer B owns pending slot');
    eq(await context.api.compareRemoveYandexOAuthPendingControl(A), false, 'stale A cleanup cannot remove B');
    eq(storage.values.yandexOAuthPending.authAttemptId, B.authAttemptId, 'B survives stale A cleanup');
    await rejectsCode(context.api.captureYandexOAuthAttemptControl(A.authAttemptId, 300), 'YANDEX_AUTH_ATTEMPT_NOT_CURRENT');
    cases += 1;
    const capturedB = await context.api.captureYandexOAuthAttemptControl(B.authAttemptId, 300);
    eq(capturedB.authAttemptId, B.authAttemptId, 'exact B capture succeeds');
  }

  {
    const { context, storage } = makeContext();
    const A = await context.api.beginYandexOAuthAttemptControl({
      clientId: 'client-A', codeVerifier: 'verifier-A', state: 'state-A', createdAt: 100, expiresAt: 1000
    });
    const capturedA = await context.api.captureYandexOAuthAttemptControl(A.authAttemptId, 200);
    const B = await context.api.beginYandexOAuthAttemptControl({
      clientId: 'client-B', codeVerifier: 'verifier-B', state: 'state-B', createdAt: 300, expiresAt: 1200
    });
    await rejectsCode(
      context.api.commitYandexOAuthAttemptControl(capturedA, {
        authRecordId: 'record-A', authGeneration: capturedA.authGeneration, accessToken: 'token-A'
      }),
      'YANDEX_AUTH_ATTEMPT_SUPERSEDED'
    );
    cases += 1;
    eq(storage.values.yandexAuth, undefined, 'stale A token is never committed');
    eq(storage.values.yandexOAuthPending.authAttemptId, B.authAttemptId, 'stale A commit does not delete B');
  }

  {
    const { context, storage } = makeContext();
    const A = await context.api.beginYandexOAuthAttemptControl({
      clientId: 'client-A', codeVerifier: 'verifier-A', state: 'state-A', createdAt: 100, expiresAt: 1000
    });
    const capturedA = await context.api.captureYandexOAuthAttemptControl(A.authAttemptId, 200);
    const manualGeneration = await context.api.advanceYandexAuthControlGeneration('manual intent');
    eq(manualGeneration, 2, 'manual intent advances shared auth generation');
    eq(storage.values.yandexOAuthPending, null, 'manual intent invalidates pending OAuth');
    await rejectsCode(
      context.api.commitYandexOAuthAttemptControl(capturedA, {
        authRecordId: 'record-A', authGeneration: capturedA.authGeneration, accessToken: 'token-A'
      }),
      'YANDEX_AUTH_ATTEMPT_SUPERSEDED'
    );
    cases += 1;
    eq(storage.values.yandexAuth, undefined, 'OAuth A cannot overwrite newer manual intent');
  }

  {
    const { context, storage } = makeContext();
    const A = await context.api.beginYandexOAuthAttemptControl({
      clientId: 'client-A', codeVerifier: 'verifier-A', state: 'state-A', createdAt: 100, expiresAt: 1000
    });
    const capturedA = await context.api.captureYandexOAuthAttemptControl(A.authAttemptId, 200);
    await context.api.disconnectYandexAuthControl();
    eq(storage.values.yandexAuthGeneration, 2, 'disconnect advances shared auth generation');
    eq(storage.values.yandexOAuthPending, null, 'disconnect clears pending attempt');
    eq(storage.values.yandexAuth, null, 'disconnect clears current auth in same session mutation');
    await rejectsCode(
      context.api.commitYandexOAuthAttemptControl(capturedA, {
        authRecordId: 'record-A', authGeneration: capturedA.authGeneration, accessToken: 'token-A'
      }),
      'YANDEX_AUTH_ATTEMPT_SUPERSEDED'
    );
    cases += 1;
    eq(storage.values.yandexAuth, null, 'stale OAuth cannot resurrect auth after disconnect');
  }

  {
    const { context, storage } = makeContext();
    const A = await context.api.beginYandexOAuthAttemptControl({
      clientId: 'client-A', codeVerifier: 'verifier-A', state: 'state-A', createdAt: 100, expiresAt: 150
    });
    await rejectsCode(context.api.captureYandexOAuthAttemptControl(A.authAttemptId, 150), 'YANDEX_AUTH_ATTEMPT_EXPIRED');
    cases += 1;
    eq(storage.values.yandexOAuthPending, null, 'exact expired attempt is cleared');
  }

  {
    const { context, storage } = makeContext();
    const A = await context.api.beginYandexOAuthAttemptControl({
      clientId: 'client-A', codeVerifier: 'verifier-A', state: 'state-A', createdAt: 100, expiresAt: 1000
    });
    const capturedA = await context.api.captureYandexOAuthAttemptControl(A.authAttemptId, 200);
    const authA = { authRecordId: 'record-A', authGeneration: capturedA.authGeneration, accessToken: 'token-A', account: null };
    await context.api.commitYandexOAuthAttemptControl(capturedA, authA);
    eq(storage.values.yandexAuth.authRecordId, 'record-A', 'exact current OAuth commit succeeds');
    eq(storage.values.yandexOAuthPending, null, 'exact current OAuth commit consumes its pending attempt');
    eq(await context.api.compareUpdateYandexAuthRecord(authA, { account: { uid: 'uid-A' } }), true, 'exact auth account update succeeds');
    eq(storage.values.yandexAuth.account.uid, 'uid-A', 'exact auth account update is stored');
    const stale = { authRecordId: 'record-stale', authGeneration: capturedA.authGeneration };
    eq(await context.api.compareUpdateYandexAuthRecord(stale, { account: { uid: 'bad' } }), false, 'stale auth update is rejected');
    eq(storage.values.yandexAuth.account.uid, 'uid-A', 'stale auth update cannot overwrite exact record');
    eq(await context.api.compareClearYandexAuthRecord(stale), false, 'stale auth clear is rejected');
    eq(await context.api.compareClearYandexAuthRecord(authA), true, 'exact auth clear succeeds');
    eq(storage.values.yandexAuth, null, 'exact auth clear removes only matching record');
  }

  {
    const { context, storage } = makeContext();
    storage.values.yandexOAuthPending = {
      clientId: 'legacy-client',
      codeVerifier: 'legacy-verifier',
      state: 'legacy-state',
      createdAt: 10,
      expiresAt: 20
    };
    const snapshot = structuredClone(storage.values.yandexOAuthPending);
    eq(await context.api.compareRemoveYandexOAuthPendingControl(snapshot), true, 'exact legacy pending snapshot can be retired');
    eq(storage.values.yandexOAuthPending, null, 'legacy pending is cleared without claiming new attempt authority');
  }

  check(workerSource.includes("const YANDEX_FIXED_REDIRECT_URI = 'https://oauth.yandex.ru/verification_code';"), 'fixed Yandex redirect remains unchanged');
  check(!workerSource.includes('chrome.identity.launchWebAuthFlow'), 'P1-165 transport is not silently changed');
  check(workerSource.includes("error?.code !== 'WEBCLIP_TAB_CREATE_PENDING'"), 'unknown tabs.create settlement retains exact pending attempt');
  check(workerSource.includes('authAttemptId: pending.authAttemptId'), 'start response returns only non-secret attempt identity');
  check(workerSource.includes('commitYandexOAuthAttemptControl(captured, yandexAuth)'), 'finish performs post-network exact-attempt CAS');
  check(workerSource.includes("advanceYandexAuthControlGeneration('Поколение manual-token intent Яндекс Диска')"), 'manual intent fences older OAuth generation');
  check(workerSource.includes('await disconnectYandexAuthControl()'), 'disconnect uses generation barrier');
  check(optionsSource.includes("let activeYandexAuthAttemptId = '';"), 'Options owns in-memory attempt identity');
  check(optionsSource.includes('authAttemptId: activeYandexAuthAttemptId'), 'Options finish sends exact page attempt identity');
  check(!optionsSource.includes('codeVerifier'), 'Options does not receive or store PKCE verifier');

  console.log(`P1-178 auth-attempt generation runtime tests: PASS; cases=${cases}; fixed_redirect=true; returned_state_verified=false`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
