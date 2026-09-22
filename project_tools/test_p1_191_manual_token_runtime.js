'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

function section(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Source markers not found: ${startMarker} -> ${endMarker}`);
  return text.slice(start, end);
}

function response(status, data = {}, contentLength = '1') {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get(name) { return String(name).toLowerCase() === 'content-length' ? contentLength : null; } },
    _data: data
  };
}

function candidateContext(fetchImpl) {
  const requests = [];
  const context = vm.createContext({
    Promise,
    Error,
    Number,
    String,
    Object,
    AbortController,
    setTimeout,
    clearTimeout,
    MAX_YANDEX_ACCESS_TOKEN_CHARS: 16 * 1024,
    YANDEX_API_BASE: 'https://cloud-api.yandex.net/v1/disk',
    fetch: async (url, options) => {
      requests.push({ url, options });
      return fetchImpl(url, options);
    },
    async safeJson(res) { return structuredClone(res._data || {}); },
    extractDiskAccount(info) {
      const user = info?.user || {};
      return {
        login: String(user.login || ''),
        displayName: String(user.display_name || ''),
        uid: String(user.uid || '')
      };
    }
  });
  const code = section(source, 'async function validateManualYandexTokenCandidate', 'async function setManualYandexToken');
  vm.runInContext(`${code}\nthis.validateCandidate = validateManualYandexTokenCandidate;`, context);
  return { context, requests };
}

function commitContext({ generation = 5, auth = null } = {}) {
  const values = {
    yandexAuthGeneration: generation,
    yandexOAuthPending: { authAttemptId: 'old-pending' },
    yandexAuth: auth
  };
  let legacyCleanupCalls = 0;
  let configCalls = 0;
  const chrome = {
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
  };
  const context = vm.createContext({
    chrome,
    Promise,
    Error,
    Number,
    String,
    Object,
    structuredClone,
    YANDEX_AUTH_KEY: 'yandexAuth',
    YANDEX_OAUTH_PENDING_KEY: 'yandexOAuthPending',
    YANDEX_AUTH_GENERATION_KEY: 'yandexAuthGeneration',
    YANDEX_AUTH_STORAGE_SESSION: 'session',
    normalizeYandexAuthGeneration(value) {
      const n = Math.floor(Number(value) || 0);
      return Number.isSafeInteger(n) && n >= 0 ? n : 0;
    },
    async runYandexAuthStorageOperation(start) { return start(); },
    async removeLegacyPersistentYandexAuth() { legacyCleanupCalls += 1; },
    async updateYandexConfig(mutator) { configCalls += 1; return mutator({}); }
  });
  const code = section(source, 'async function commitManualYandexAuthIfGeneration', 'async function disconnectYandexAuthControl');
  vm.runInContext(`${code}\nthis.commitManual = commitManualYandexAuthIfGeneration;`, context);
  return { context, values, legacyCleanupCalls: () => legacyCleanupCalls, configCalls: () => configCalls };
}

async function rejectsCode(promise, code) {
  await assert.rejects(promise, (error) => error && error.code === code);
}

(async () => {
  let cases = 0;
  const check = (value, message) => { cases += 1; assert.ok(value, message); };
  const eq = (a, b, message) => { cases += 1; assert.strictEqual(a, b, message); };

  {
    const { context, requests } = candidateContext(async () => response(200, {
      user: { uid: 'uid-B', login: 'user-b', display_name: 'User B' }
    }));
    const result = await context.validateCandidate('candidate-secret');
    eq(result.validation, 'valid', 'successful candidate read is valid');
    eq(result.account.uid, 'uid-B', 'account identity comes from exact candidate response');
    eq(requests.length, 1, 'one bounded candidate request');
    eq(requests[0].url, 'https://cloud-api.yandex.net/v1/disk', 'candidate validates against Disk info');
    eq(requests[0].options.method, 'GET', 'candidate validation is read-only');
    eq(requests[0].options.headers.Authorization, 'OAuth candidate-secret', 'exact candidate owns Authorization');
    eq(requests[0].options.redirect, 'error', 'redirects are rejected');
    check(!JSON.stringify(result).includes('candidate-secret'), 'candidate secret is absent from returned validation metadata');
  }

  {
    const { context } = candidateContext(async () => response(401, { error: 'UnauthorizedError' }));
    await rejectsCode(context.validateCandidate('bad-secret'), 'YANDEX_MANUAL_TOKEN_INVALID'); cases += 1;
    try { await context.validateCandidate('bad-secret'); } catch (error) {
      check(!String(error.message).includes('bad-secret'), 'invalid-token error does not disclose candidate secret');
    }
  }

  for (const status of [400, 403, 429, 500, 503]) {
    const { context } = candidateContext(async () => response(status, { error: 'provider-error' }));
    await rejectsCode(context.validateCandidate('candidate-secret'), 'YANDEX_MANUAL_TOKEN_VALIDATION_UNKNOWN');
    cases += 1;
  }

  {
    const { context } = candidateContext(async () => { throw new Error('network down candidate-secret'); });
    await rejectsCode(context.validateCandidate('candidate-secret'), 'YANDEX_MANUAL_TOKEN_VALIDATION_UNKNOWN'); cases += 1;
    try { await context.validateCandidate('candidate-secret'); } catch (error) {
      check(!String(error.message).includes('candidate-secret'), 'network error is normalized without candidate secret');
    }
  }

  {
    const { context } = candidateContext(async () => {
      const error = new Error('aborted candidate-secret'); error.name = 'AbortError'; throw error;
    });
    await rejectsCode(context.validateCandidate('candidate-secret'), 'YANDEX_MANUAL_TOKEN_VALIDATION_UNKNOWN'); cases += 1;
  }

  {
    const { context } = candidateContext(async () => response(200, { user: { login: 'user-no-uid' } }));
    await rejectsCode(context.validateCandidate('candidate-secret'), 'YANDEX_MANUAL_TOKEN_VALIDATION_UNKNOWN'); cases += 1;
  }

  {
    const oldA = { authRecordId: 'A', authGeneration: 4, accessToken: 'old-A' };
    const { context, values, legacyCleanupCalls, configCalls } = commitContext({ generation: 5, auth: oldA });
    const B = { authRecordId: 'B', authGeneration: 5, accessToken: 'candidate-B', source: 'manual' };
    eq(await context.commitManual(5, B), true, 'exact generation commits validated manual B');
    eq(values.yandexAuth.authRecordId, 'B', 'B replaces old A only at commit');
    eq(values.yandexOAuthPending, null, 'successful manual commit consumes stale pending authority');
    eq(legacyCleanupCalls(), 1, 'legacy secret cleanup follows successful commit');
    eq(configCalls(), 1, 'session-only config settlement follows successful commit');
  }

  {
    const oldA = { authRecordId: 'A', authGeneration: 4, accessToken: 'old-A' };
    const { context, values, legacyCleanupCalls, configCalls } = commitContext({ generation: 6, auth: oldA });
    const staleB = { authRecordId: 'B', authGeneration: 5, accessToken: 'candidate-B', source: 'manual' };
    await rejectsCode(context.commitManual(5, staleB), 'YANDEX_MANUAL_AUTH_SUPERSEDED'); cases += 1;
    eq(values.yandexAuth.authRecordId, 'A', 'stale B cannot overwrite current auth');
    eq(legacyCleanupCalls(), 0, 'stale candidate performs no legacy cleanup side effect');
    eq(configCalls(), 0, 'stale candidate performs no config settlement');
  }

  const manual = section(source, 'async function setManualYandexToken(token)', 'async function getValidYandexAccessToken');
  const advanceAt = manual.indexOf("advanceYandexAuthControlGeneration('Поколение manual-token intent Яндекс Диска')");
  const validateAt = manual.indexOf('validateManualYandexTokenCandidate(token)');
  const commitAt = manual.indexOf('commitManualYandexAuthIfGeneration(authGeneration, yandexAuth)');
  check(advanceAt >= 0 && validateAt > advanceAt && commitAt > validateAt, 'manual flow is intent fence -> private validation -> generation CAS');
  check(!manual.includes('writeYandexAuth(yandexAuth)'), 'manual candidate is never globally published before validation');
  check(!manual.includes('compareClearYandexAuthRecord'), 'candidate rejection has no authority to clear current auth');
  check(manual.includes("scope: ''"), 'manual candidate does not fabricate granted scope evidence');

  const validator = section(source, 'async function validateManualYandexTokenCandidate', 'async function setManualYandexToken');
  check(!validator.includes('getValidYandexAccessToken'), 'candidate validation never rereads global auth');
  check(!validator.includes('yandexApi('), 'candidate validation bypasses mutable global yandexApi credential selection');
  check(validator.includes("response.status === 401"), 'only explicit 401 has invalid-candidate branch');
  check(!validator.includes('appendOperationLogEvent'), 'candidate secret validation creates no operation-log event');

  console.log(`P1-191 manual-token runtime tests: PASS; cases=${cases}; validate_before_commit=true; invalid_preserves_current=true; unknown_preserves_current=true; capability_proven=false; live_provider_calls=0`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
