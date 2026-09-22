'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');

function section(start, end) {
  const a = SOURCE.indexOf(start);
  const b = SOURCE.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `missing source section: ${start} -> ${end}`);
  return SOURCE.slice(a, b);
}

function receipt(overrides = {}) {
  return {
    requestKind: 'disk-oauth',
    authRecordId: 'A',
    authGeneration: 7,
    controlGeneration: 7,
    authorizationBound: true,
    ...overrides
  };
}

function helperRuntime({ auth, controlGeneration = 7 } = {}) {
  const values = {
    yandexAuth: auth || {
      authRecordId: 'A',
      authGeneration: 7,
      accessToken: 'token-A',
      account: null
    },
    yandexAuthGeneration: controlGeneration
  };
  const context = vm.createContext({
    Promise, Object, String, Number,
    YANDEX_AUTH_KEY: 'yandexAuth',
    YANDEX_AUTH_GENERATION_KEY: 'yandexAuthGeneration',
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
    normalizeYandexAuthGeneration(value) {
      const n = Math.floor(Number(value) || 0);
      return Number.isSafeInteger(n) && n >= 0 ? n : 0;
    },
    async runYandexAuthStorageOperation(fn) { return fn(); }
  });
  const code = section(
    'async function compareUpdateYandexAuthIfCurrentRequest',
    'async function captureCurrentYandexOperationContext'
  );
  vm.runInContext(`${code}\nthis.compareUpdate = compareUpdateYandexAuthIfCurrentRequest;`, context);
  return { context, values };
}

function callerRuntime({
  apiResult,
  compareResult = true,
  cachedUid = '',
  rootPath = '',
  folderResult = null
} = {}) {
  let compareCalls = 0;
  let folderCalls = 0;
  let apiCalls = 0;
  const context = vm.createContext({
    Promise, Error, String,
    MAX_YANDEX_ACCOUNT_FIELD_CHARS: 1024,
    async yandexApi() { apiCalls += 1; return structuredClone(apiResult); },
    extractDiskAccount(info) {
      const user = info?.user || {};
      return {
        login: String(user.login || ''),
        displayName: String(user.display_name || ''),
        uid: String(user.uid || '')
      };
    },
    async compareUpdateYandexAuthIfCurrentRequest() { compareCalls += 1; return compareResult; },
    async getYandexConfig() { return { rootPath }; },
    async ensureYandexServiceFolders() { folderCalls += 1; return folderResult; },
    normalizeYandexNonNegativeNumber(value) { return Math.max(0, Number(value) || 0); },
    async readYandexAuthState() {
      return {
        auth: cachedUid ? { account: { uid: cachedUid }, accessToken: 'token-A' } : { account: null, accessToken: 'token-A' }
      };
    },
    boundedYandexExternalText(value, max) { return String(value || '').slice(0, max); }
  });
  const testConnection = section('async function testYandexConnection()', 'function extractDiskAccount');
  const currentUid = section("async function getCurrentYandexAccountUid(operationId = '')", 'async function ensureYandexPublicUrl');
  vm.runInContext(
    `${testConnection}\n${currentUid}\nthis.callers={ testYandexConnection, getCurrentYandexAccountUid };`,
    context
  );
  return {
    context,
    counts: {
      compare: () => compareCalls,
      folders: () => folderCalls,
      api: () => apiCalls
    }
  };
}

(async () => {
  let checks = 0;
  const ok = (v, m) => { assert.ok(v, m); checks += 1; };
  const eq = (a, b, m) => { assert.strictEqual(a, b, m); checks += 1; };

  // Exact current A can enrich only its own record; token/identity are preserved.
  {
    const { context, values } = helperRuntime();
    const updated = await context.compareUpdate(receipt(), { account: { uid: 'acct-A' } });
    eq(updated, true, 'current exact A enrichment commits');
    eq(values.yandexAuth.authRecordId, 'A', 'record identity preserved');
    eq(values.yandexAuth.authGeneration, 7, 'record generation preserved');
    eq(values.yandexAuth.accessToken, 'token-A', 'token material preserved');
    eq(values.yandexAuth.account.uid, 'acct-A', 'account metadata updated');
    eq(values.yandexAuthGeneration, 7, 'positive enrichment does not advance generation');
  }

  // Late A read cannot overwrite newer B.
  {
    const { context, values } = helperRuntime({
      auth: { authRecordId: 'B', authGeneration: 8, accessToken: 'token-B', account: { uid: 'acct-B' } },
      controlGeneration: 8
    });
    const updated = await context.compareUpdate(receipt(), { account: { uid: 'acct-A' } });
    eq(updated, false, 'late A enrichment rejected after B commit');
    eq(values.yandexAuth.authRecordId, 'B', 'B record remains');
    eq(values.yandexAuth.account.uid, 'acct-B', 'B account remains');
    eq(values.yandexAuthGeneration, 8, 'B control generation remains');
  }

  // Control generation alone fences an older positive response.
  {
    const { context, values } = helperRuntime({ controlGeneration: 8 });
    const updated = await context.compareUpdate(receipt(), { account: { uid: 'acct-A' } });
    eq(updated, false, 'control-generation change fences old response');
    eq(values.yandexAuth.account, null, 'stale enrichment makes no write');
    eq(values.yandexAuthGeneration, 8, 'newer control generation remains');
  }

  // Unbound/legacy response has zero account-mutation authority.
  {
    const { context, values } = helperRuntime();
    const updated = await context.compareUpdate(receipt({ authorizationBound: false }), { account: { uid: 'acct-A' } });
    eq(updated, false, 'unbound response cannot enrich');
    eq(values.yandexAuth.account, null, 'unbound response leaves auth unchanged');
  }

  const boundApiResult = {
    data: {
      user: { uid: 'acct-A', login: 'a', display_name: 'Account A' },
      total_space: 100,
      used_space: 40,
      trash_size: 5
    },
    authRequestReceipt: receipt()
  };

  // Connection test fails closed before service-folder work if its read became stale.
  {
    const { context, counts } = callerRuntime({ apiResult: boundApiResult, compareResult: false, rootPath: '/WebClip' });
    await assert.rejects(
      context.callers.testYandexConnection(),
      (error) => error?.code === 'YANDEX_AUTH_REQUEST_SUPERSEDED'
    );
    checks += 1;
    eq(counts.api(), 1, 'connection test issues one account read');
    eq(counts.compare(), 1, 'connection test validates exact receipt before continuation');
    eq(counts.folders(), 0, 'superseded read cannot continue into folder work');
  }

  // Connection test success preserves existing result shape after exact enrichment.
  {
    const { context, counts } = callerRuntime({ apiResult: boundApiResult, compareResult: true, rootPath: '' });
    const out = await context.callers.testYandexConnection();
    eq(out.ok, true, 'connection test still succeeds');
    eq(out.account.uid, 'acct-A', 'connection account comes from exact response');
    eq(out.totalSpace, 100, 'space metadata preserved');
    eq(counts.compare(), 1, 'successful bound read performs exact account CAS');
  }

  // Current-account lookup cannot return stale A as "current" after a newer auth transition.
  {
    const { context, counts } = callerRuntime({ apiResult: boundApiResult, compareResult: false, cachedUid: '' });
    await assert.rejects(
      context.callers.getCurrentYandexAccountUid('op-1'),
      (error) => error?.code === 'YANDEX_AUTH_REQUEST_SUPERSEDED'
    );
    checks += 1;
    eq(counts.api(), 1, 'uncached uid lookup performs one exact read');
    eq(counts.compare(), 1, 'uid lookup fences positive account settlement');
  }

  // Exact current lookup returns provider uid after successful CAS.
  {
    const { context, counts } = callerRuntime({ apiResult: boundApiResult, compareResult: true, cachedUid: '' });
    eq(await context.callers.getCurrentYandexAccountUid('op-2'), 'acct-A', 'exact current uid returned');
    eq(counts.compare(), 1, 'exact uid response updates account under same request receipt');
  }

  // Cached uid preserves the existing no-network fast path.
  {
    const { context, counts } = callerRuntime({ apiResult: boundApiResult, compareResult: true, cachedUid: 'cached-A' });
    eq(await context.callers.getCurrentYandexAccountUid('op-3'), 'cached-A', 'cached uid remains fast path');
    eq(counts.api(), 0, 'cached uid requires no provider read');
    eq(counts.compare(), 0, 'cached uid requires no settlement CAS');
  }

  // Unbound legacy compatibility read may return data but cannot write auth metadata.
  {
    const legacy = {
      data: { user: { uid: 'legacy-A', login: 'legacy', display_name: 'Legacy A' } },
      authRequestReceipt: receipt({ authorizationBound: false, authRecordId: '', authGeneration: 0 })
    };
    const { context, counts } = callerRuntime({ apiResult: legacy, compareResult: true, cachedUid: '' });
    eq(await context.callers.getCurrentYandexAccountUid('op-4'), 'legacy-A', 'legacy compatibility read can return observed uid');
    eq(counts.compare(), 0, 'unbound legacy read has zero account-write authority');
  }

  const api = section('async function yandexApi(endpoint, options = {}, allowRetry = false)', 'function getSiteFolderSegments');
  ok(api.includes('options.includeAuthRequestReceipt === true'), 'yandexApi receipt return is opt-in');
  ok(api.includes('Object.freeze({ data: payload, authRequestReceipt })'), 'opt-in wrapper carries only data plus secret-free receipt');

  const testConnectionSource = section('async function testYandexConnection()', 'function extractDiskAccount');
  ok(testConnectionSource.includes('includeAuthRequestReceipt: true'), 'connection test requests exact receipt');
  ok(testConnectionSource.includes('compareUpdateYandexAuthIfCurrentRequest'), 'connection test uses exact positive CAS');
  ok(!testConnectionSource.includes('writeYandexAuth'), 'connection test no longer performs unconditional auth rewrite');
  ok(testConnectionSource.indexOf('compareUpdateYandexAuthIfCurrentRequest') < testConnectionSource.indexOf('ensureYandexServiceFolders'), 'positive CAS precedes later folder work');

  const uidSource = section("async function getCurrentYandexAccountUid(operationId = '')", 'async function ensureYandexPublicUrl');
  ok(uidSource.includes('includeAuthRequestReceipt: true'), 'uid lookup requests exact receipt');
  ok(uidSource.includes('compareUpdateYandexAuthIfCurrentRequest'), 'uid lookup uses exact positive CAS');
  ok(!uidSource.includes('writeYandexAuth'), 'uid lookup no longer rewrites stale auth snapshot');

  console.log(`P1-196 account-enrichment CAS runtime tests: PASS; checks=${checks}; positive_enrichment_exact_cas=true; stale_A_overwrites_B=false; stale_connection_continuation=false; legacy_write_authority=false; live_provider_calls=0`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
