'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');

function between(start, end) {
  const a = SOURCE.indexOf(start);
  const b = SOURCE.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `missing source section: ${start} -> ${end}`);
  return SOURCE.slice(a, b);
}

function response(status, data = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get(name) { return String(name).toLowerCase() === 'content-length' ? '1' : null; } },
    _data: data
  };
}

function makeRuntime({ auth, controlGeneration = 7, fetchImpl } = {}) {
  const values = {
    yandexAuth: auth || {
      authRecordId: 'A',
      authGeneration: 7,
      accessToken: 'token-A',
      expiresAt: 0
    },
    yandexAuthGeneration: controlGeneration,
    yandexOAuthPending: { authAttemptId: 'pending-old' }
  };
  const requests = [];
  const logs = [];

  const context = vm.createContext({
    Promise, Error, Number, String, Object, Boolean, Date, URL, AbortController,
    setTimeout, clearTimeout,
    YANDEX_API_BASE: 'https://cloud-api.yandex.net/v1/disk',
    YANDEX_AUTH_KEY: 'yandexAuth',
    YANDEX_AUTH_GENERATION_KEY: 'yandexAuthGeneration',
    YANDEX_OAUTH_PENDING_KEY: 'yandexOAuthPending',
    MAX_YANDEX_EXTERNAL_ERROR_CHARS: 2000,
    chrome: {
      storage: {
        session: {
          async get(keys) {
            const list = Array.isArray(keys) ? keys : [keys];
            const out = {};
            for (const key of list) if (Object.prototype.hasOwnProperty.call(values, key)) out[key] = values[key];
            return out;
          },
          async set(next) { Object.assign(values, structuredClone(next)); }
        }
      }
    },
    async runYandexAuthStorageOperation(fn) { return fn(); },
    async readYandexAuthState() { return { auth: values.yandexAuth || null, mode: 'session', yandexConfig: {} }; },
    normalizeYandexAuthGeneration(value) {
      const n = Math.floor(Number(value) || 0);
      return Number.isSafeInteger(n) && n >= 0 ? n : 0;
    },
    nextYandexAuthGeneration(value) {
      const n = Math.floor(Number(value) || 0);
      if (!Number.isSafeInteger(n) || n < 0 || n >= Number.MAX_SAFE_INTEGER) throw new Error('generation overflow');
      return n + 1;
    },
    sanitizeOperationLogValue(value) { return value; },
    appendOperationLogEvent(operationId, event) { logs.push({ operationId, event }); },
    boundedYandexExternalText(value, max) { return String(value || '').slice(0, max); },
    summarizeYandexResponse() { return {}; },
    normalizeError(error) { return error?.message || String(error || ''); },
    async safeJson(res) { return structuredClone(res._data || {}); },
    WebClipYandexOperationContext: {
      validateOperationContext(value) {
        if (!value?.accessToken) throw new Error('bad operation context');
        return Object.freeze({ ...value });
      }
    },
    fetch: async (url, options) => {
      requests.push({ url, options });
      return fetchImpl ? fetchImpl({ url, options, values }) : response(200, {});
    }
  });

  const helpers = between('function sanitizeYandexApiCallerHeaders', 'async function captureCurrentYandexOperationContext');
  const api = between('async function yandexApi(endpoint, options = {}, allowRetry = false)', 'function getSiteFolderSegments');
  vm.runInContext(`${helpers}\n${api}\nthis.api = { sanitizeYandexApiCallerHeaders, captureCurrentYandexAuthRequestAuthority, demoteYandexAuthIfCurrentRequest, yandexApi };`, context);

  return { context, values, requests, logs };
}

async function rejected(promise, predicate, message) {
  await assert.rejects(promise, predicate, message);
}

(async () => {
  let checks = 0;
  const ok = (v, m) => { assert.ok(v, m); checks += 1; };
  const eq = (a, b, m) => { assert.strictEqual(a, b, m); checks += 1; };

  // Secret-free request receipt is separated from in-memory token material.
  {
    const { context } = makeRuntime();
    const authority = await context.api.captureCurrentYandexAuthRequestAuthority();
    eq(authority.accessToken, 'token-A', 'exact request keeps token in memory');
    eq(authority.receipt.requestKind, 'disk-oauth', 'receipt class exact');
    eq(authority.receipt.authRecordId, 'A', 'receipt carries record id');
    eq(authority.receipt.authGeneration, 7, 'receipt carries auth generation');
    eq(authority.receipt.controlGeneration, 7, 'receipt carries captured control generation');
    eq(authority.receipt.authorizationBound, true, 'current shaped auth is bound');
    ok(!JSON.stringify(authority.receipt).includes('token-A'), 'receipt contains no token secret');
  }

  // Worker owns Authorization; caller cannot override any casing.
  for (const key of ['Authorization', 'authorization', 'AUTHORIZATION']) {
    let fetches = 0;
    const { context } = makeRuntime({ fetchImpl: async () => { fetches += 1; return response(200); } });
    await rejected(
      context.api.yandexApi('/resources', { headers: { [key]: 'OAuth caller-secret' } }),
      (error) => error?.code === 'YANDEX_CALLER_AUTHORIZATION_FORBIDDEN',
      'caller Authorization must fail'
    );
    checks += 1;
    eq(fetches, 0, 'forbidden caller Authorization fails before fetch');
  }

  // Benign caller headers survive, but worker's OAuth/Accept values are final.
  {
    const { context, requests } = makeRuntime();
    await context.api.yandexApi('/resources', { headers: { 'Content-Type': 'application/json', Accept: 'text/plain' } });
    eq(requests.length, 1, 'one request issued');
    eq(requests[0].options.headers.Authorization, 'OAuth token-A', 'worker exact token owns Authorization');
    eq(requests[0].options.headers.Accept, 'application/json', 'worker owns Accept');
    eq(requests[0].options.headers['Content-Type'], 'application/json', 'benign caller header preserved');
  }

  // Current exact A/401 demotes only A and advances shared generation.
  {
    const { context, values } = makeRuntime({ fetchImpl: async () => response(401, { error: 'UnauthorizedError' }) });
    await rejected(
      context.api.yandexApi('/resources'),
      (error) => error?.status === 401 && error?.authRequestBound === true && error?.authDemoted === true,
      'current exact 401 reports demotion'
    );
    checks += 1;
    eq(values.yandexAuth, null, 'current A cleared after authoritative 401');
    eq(values.yandexAuthGeneration, 8, 'demotion advances shared auth generation');
    eq(values.yandexOAuthPending, null, 'demotion retires stale pending authority');
  }

  // A request that becomes stale after B commit cannot demote B.
  {
    const { context, values } = makeRuntime({
      fetchImpl: async ({ values: state }) => {
        state.yandexAuth = { authRecordId: 'B', authGeneration: 8, accessToken: 'token-B', expiresAt: 0 };
        state.yandexAuthGeneration = 8;
        state.yandexOAuthPending = null;
        return response(401, { error: 'UnauthorizedError' });
      }
    });
    await rejected(
      context.api.yandexApi('/resources'),
      (error) => error?.status === 401 && error?.authRequestBound === true && error?.authDemoted === false,
      'stale A/401 cannot demote B'
    );
    checks += 1;
    eq(values.yandexAuth.authRecordId, 'B', 'B remains current');
    eq(values.yandexAuth.accessToken, 'token-B', 'B token remains');
    eq(values.yandexAuthGeneration, 8, 'stale A does not advance B generation');
  }

  // A later control-generation transition fences demotion even if record id has not changed yet.
  {
    const { context, values } = makeRuntime({
      fetchImpl: async ({ values: state }) => {
        state.yandexAuthGeneration = 8;
        return response(401, { error: 'UnauthorizedError' });
      }
    });
    await rejected(
      context.api.yandexApi('/resources'),
      (error) => error?.status === 401 && error?.authDemoted === false,
      'control generation change fences old response'
    );
    checks += 1;
    eq(values.yandexAuth.authRecordId, 'A', 'record survives stale response');
    eq(values.yandexAuthGeneration, 8, 'newer control generation preserved');
  }

  // Preserved A after a failed manual intent can still be exactly demoted if no newer transition follows.
  {
    const { context, values } = makeRuntime({
      auth: { authRecordId: 'A', authGeneration: 5, accessToken: 'token-A', expiresAt: 0 },
      controlGeneration: 6,
      fetchImpl: async () => response(401, { error: 'UnauthorizedError' })
    });
    await rejected(
      context.api.yandexApi('/resources'),
      (error) => error?.status === 401 && error?.authDemoted === true,
      'record/control pair captured after failed manual intent remains demotable'
    );
    checks += 1;
    eq(values.yandexAuth, null, 'preserved A can be invalidated exactly');
    eq(values.yandexAuthGeneration, 7, 'demotion advances captured control generation');
  }

  // Generic non-401 failures never mutate global auth.
  for (const status of [400, 403, 429, 500, 503]) {
    const { context, values } = makeRuntime({ fetchImpl: async () => response(status, { error: 'other' }) });
    await rejected(context.api.yandexApi('/resources'), (error) => error?.status === status, `${status} operation failure`);
    checks += 1;
    eq(values.yandexAuth.authRecordId, 'A', `${status} keeps auth A`);
    eq(values.yandexAuthGeneration, 7, `${status} keeps generation`);
  }

  // Network failure does not infer invalid auth.
  {
    const { context, values } = makeRuntime({ fetchImpl: async () => { throw new Error('network down'); } });
    await rejected(context.api.yandexApi('/resources'), /Нет соединения/, 'network error propagated as operation failure');
    checks += 1;
    eq(values.yandexAuth.authRecordId, 'A', 'network failure keeps A');
    eq(values.yandexAuthGeneration, 7, 'network failure keeps generation');
  }

  // Legacy/unbound auth can still perform compatibility request but cannot mutate auth truth on 401.
  {
    const { context, values } = makeRuntime({
      auth: { accessToken: 'legacy-token', expiresAt: 0 },
      controlGeneration: 7,
      fetchImpl: async () => response(401, { error: 'UnauthorizedError' })
    });
    const authority = await context.api.captureCurrentYandexAuthRequestAuthority();
    eq(authority.receipt.authorizationBound, false, 'legacy auth receipt is unbound');
    await rejected(
      context.api.yandexApi('/resources'),
      (error) => error?.status === 401 && error?.authRequestBound === false && error?.authDemoted === false,
      'unbound 401 cannot mutate global auth'
    );
    checks += 1;
    eq(values.yandexAuth.accessToken, 'legacy-token', 'legacy token remains pending explicit reauth/migration policy');
    eq(values.yandexAuthGeneration, 7, 'unbound 401 does not invent generation transition');
  }

  // Immutable operation-context requests are historical operation authority only,
  // not global-current auth mutation authority.
  {
    const { context, values, requests } = makeRuntime({ fetchImpl: async () => response(401, { error: 'UnauthorizedError' }) });
    await rejected(
      context.api.yandexApi('/resources', {
        operationContext: { accessToken: 'operation-token-A', accountUid: 'acct-A', rootPath: '/WebClip', createPublicLinks: true, capturedAt: 10 }
      }),
      (error) => error?.status === 401 && error?.authRequestBound === false && error?.authDemoted === false,
      'operation-context 401 cannot demote global auth'
    );
    checks += 1;
    eq(requests[0].options.headers.Authorization, 'OAuth operation-token-A', 'operation context keeps its own immutable token');
    eq(values.yandexAuth.authRecordId, 'A', 'global A remains untouched by operation-context response');
    eq(values.yandexAuthGeneration, 7, 'global generation untouched by operation-context response');
  }

  // Known local expiry is still a separately tracked remaining P1-196 gap in this bounded tranche.
  {
    const expired = { authRecordId: 'A', authGeneration: 7, accessToken: 'token-A', expiresAt: Date.now() - 1 };
    const { context, values } = makeRuntime({ auth: expired, controlGeneration: 7 });
    await rejected(context.api.captureCurrentYandexAuthRequestAuthority(), /Срок действия OAuth-токена истёк/, 'known expiry blocks request');
    checks += 1;
    eq(values.yandexAuth.authRecordId, 'A', 'bounded tranche does not yet publish expiry validity transition');
    eq(values.yandexAuthGeneration, 7, 'bounded tranche does not yet advance generation for local expiry');
  }

  const apiSource = between('async function yandexApi(endpoint, options = {}, allowRetry = false)', 'function getSiteFolderSegments');
  ok(apiSource.includes('sanitizeYandexApiCallerHeaders(options.headers || {})'), 'runtime sanitizes caller headers before request');
  ok(apiSource.includes('captureCurrentYandexAuthRequestAuthority()'), 'ordinary request captures exact auth authority');
  ok(apiSource.includes('demoteYandexAuthIfCurrentRequest(authRequestReceipt)'), '401 path uses exact demotion CAS');
  ok(apiSource.includes('response.status === 401'), '401 is the only explicit auth-demotion status branch');
  ok(!apiSource.includes('response.status === 403'), '403 is not blanket auth-demotion authority');

  console.log(`P1-196 exact-auth 401 runtime tests: PASS; checks=${checks}; caller_authorization_forbidden=true; current_401_exact_cas=true; stale_401_demotes_newer=false; operation_context_global_demotion=false; expiry_transition_remaining=true; live_provider_calls=0`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
