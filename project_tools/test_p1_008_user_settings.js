'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const sw = read('service-worker.js');
const optionsHtml = read('options.html');
const optionsJs = read('options.js');

assert.match(optionsHtml, /id="exportUserSettings"/);
assert.match(optionsHtml, /id="importUserSettings"/);
assert.match(optionsHtml, /OAuth access token, PKCE state/);
assert.match(optionsJs, /USER_SETTINGS_MAX_IMPORT_BYTES\s*=\s*256 \* 1024/);
assert.match(optionsJs, /WEBCLIP_USER_SETTINGS_EXPORT/);
assert.match(optionsJs, /WEBCLIP_USER_SETTINGS_IMPORT/);
assert.match(optionsJs, /response\.pending/);
assert.match(optionsJs, /Не повторяйте импорт этого файла/);

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Markers not found: ${startMarker} -> ${endMarker}`);
  return source.slice(start, end);
}

const code = section(sw, 'function assertUserSettingsPlainObject', 'function openIndexedDbBounded');
assert.match(code, /clientIdChanged/);
assert.match(code, /acquireYandexAuthStorageTurn/);
assert.match(code, /YANDEX_AUTH_GENERATION_KEY/);
assert.match(code, /YANDEX_OAUTH_PENDING_KEY/);
assert.match(code, /YANDEX_AUTH_CONFIG_COMMIT_KEY/);
assert(!/\[YANDEX_AUTH_KEY\]/.test(code), 'P1-008 import must not read/write committed OAuth secret record');
assert.match(sw, /USER_SETTINGS_SCHEMA\s*=\s*'webclip-user-settings'/);
assert.match(code, /WEBCLIP_USER_SETTINGS_SECRET_FIELD/);
assert.match(code, /неизвестное поле/i);
assert.match(code, /USER_SETTINGS_IMPORT_MARKER_KEY/);
assert.match(code, /return \{\s*ok: true,\s*pending: true/s);
assert.match(code, /Never auto-retry an unknown-settlement settings import/);
assert.match(sw, /reconcileUserSettingsImportMarker\('worker-start'\)/);

function normalizeDiskPath(value) {
  let p = String(value || '').trim().replace(/\\/g, '/').replace(/^disk:/i, '');
  if (!p) return '';
  if (!p.startsWith('/')) p = `/${p}`;
  const stack = [];
  for (const segment of p.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') { if (stack.length) stack.pop(); continue; }
    stack.push(segment);
  }
  return `/${stack.join('/')}` || '/';
}

function normalizeIntervalMinutes(value, fallback) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(60 * 24 * 365, n));
}

function normalizeOperationLogRetentionHours(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1) return 24;
  return Math.min(8760, n);
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function createHarness({ deferredBundle = null, rejectBundle = false } = {}) {
  const local = {
    yandexConfig: {
      clientId: 'old-client',
      rootPath: '/OldRoot',
      createPublicLinks: true,
      journalBackupEnabled: false,
      journalBackupIntervalMinutes: 1440,
      journalBackupRetryMinutes: 60,
      authStorageMode: 'session'
    },
    operationLogSettings: { retentionHours: 24 },
    webclipJournalGroupByUrl: false,
    yandexAuth: { accessToken: 'PERSISTENT-SHOULD-NOT-BE-READ' }
  };
  const session = {
    yandexAuth: { accessToken: 'SESSION-SECRET', authRecordId: 'auth-A', authGeneration: 7 },
    yandexAuthGeneration: 7,
    yandexOAuthPending: { authAttemptId: 'pending-A', authGeneration: 7, codeVerifier: 'SECRET' },
    yandexAuthConfigCommit: { version: 1, authRecordId: 'auth-A', authGeneration: 7, clientId: 'old-client' }
  };
  const getCalls = [];
  const setCalls = [];
  const removeCalls = [];
  const sessionCalls = [];
  const schedulerReasons = [];
  let bundleSetCalls = 0;
  let authTurnAcquires = 0;
  let authTurnReleases = 0;

  const context = vm.createContext({
    Promise, Error, String, Number, Math, Array, Object, Set, Map, Date, JSON, RegExp,
    setTimeout, clearTimeout,
    USER_SETTINGS_SCHEMA: 'webclip-user-settings',
    USER_SETTINGS_VERSION: 1,
    USER_SETTINGS_MAX_JSON_CHARS: 256 * 1024,
    USER_SETTINGS_JOURNAL_GROUP_KEY: 'webclipJournalGroupByUrl',
    USER_SETTINGS_IMPORT_MARKER_KEY: 'webclipUserSettingsImportPending',
    OPERATION_LOG_SETTINGS_KEY: 'operationLogSettings',
    MAX_YANDEX_CLIENT_ID_CHARS: 512,
    MIN_BACKGROUND_INTERVAL_MINUTES: 1,
    MAX_OPERATION_LOG_RETENTION_HOURS: 8760,
    DEFAULT_JOURNAL_BACKUP_INTERVAL_MINUTES: 1440,
    DEFAULT_JOURNAL_BACKUP_RETRY_MINUTES: 60,
    CHROME_STORAGE_OPERATION_TIMEOUT_MS: 5,
    YANDEX_CONFIG_STORAGE_TIMEOUT_MS: 5,
    YANDEX_AUTH_KEY: 'yandexAuth',
    YANDEX_AUTH_GENERATION_KEY: 'yandexAuthGeneration',
    YANDEX_OAUTH_PENDING_KEY: 'yandexOAuthPending',
    YANDEX_AUTH_CONFIG_COMMIT_KEY: 'yandexAuthConfigCommit',
    normalizeDiskPath,
    normalizeIntervalMinutes,
    normalizeOperationLogRetentionHours,
    normalizeError(error) { return error?.message || String(error); },
    nextYandexAuthGeneration(value) {
      const current = Math.max(0, Math.floor(Number(value) || 0));
      return current + 1;
    },
    async acquireYandexAuthStorageTurn() {
      authTurnAcquires += 1;
      let released = false;
      return () => {
        if (!released) {
          released = true;
          authTurnReleases += 1;
        }
      };
    },
    userSettingsImportStorageSettlement: Promise.resolve(),
    yandexConfigStorageSettlementChain: Promise.resolve(),
    chromeStorageMutationSettlementChains: new Map(),
    withOperationTimeout(promise, timeoutMs, label) {
      let timer = 0;
      return Promise.race([
        Promise.resolve(promise),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            const error = new Error(`${label} timeout`);
            error.code = 'WEBCLIP_TIMEOUT';
            reject(error);
          }, timeoutMs);
        })
      ]).finally(() => clearTimeout(timer));
    },
    readChromeStorageBounded(start) { return Promise.resolve().then(start); },
    async mutateChromeStorageSerialized(_key, start) { return start(); },
    async initializeJournalBackupScheduler(reason) { schedulerReasons.push(reason); },
    chrome: {
      runtime: { getManifest() { return { version: '0.9.8' }; } },
      storage: {
        local: {
          async get(keys) {
            getCalls.push(Array.isArray(keys) ? [...keys] : keys);
            if (Array.isArray(keys)) {
              const out = {};
              for (const key of keys) if (Object.prototype.hasOwnProperty.call(local, key)) out[key] = local[key];
              return out;
            }
            if (typeof keys === 'string') return Object.prototype.hasOwnProperty.call(local, keys) ? { [keys]: local[keys] } : {};
            return { ...local };
          },
          async set(values) {
            const isBundle = Object.prototype.hasOwnProperty.call(values, 'webclipUserSettingsImportPending');
            if (isBundle) {
              bundleSetCalls += 1;
              if (rejectBundle) throw new Error('simulated bundled storage failure');
              if (deferredBundle) {
                await deferredBundle.promise;
              }
            }
            Object.assign(local, values);
            setCalls.push(JSON.parse(JSON.stringify(values)));
          },
          async remove(keys) {
            const list = Array.isArray(keys) ? keys : [keys];
            for (const key of list) delete local[key];
            removeCalls.push(...list);
          }
        },
        session: {
          async get(keys) {
            const list = Array.isArray(keys) ? [...keys] : [keys];
            sessionCalls.push({ op: 'get', keys: list });
            const out = {};
            for (const key of list) if (Object.prototype.hasOwnProperty.call(session, key)) out[key] = structuredClone(session[key]);
            return out;
          },
          async set(values) {
            const keys = Object.keys(values || {});
            sessionCalls.push({ op: 'set', keys });
            Object.assign(session, structuredClone(values || {}));
          },
          async remove(keys) {
            const list = Array.isArray(keys) ? [...keys] : [keys];
            sessionCalls.push({ op: 'remove', keys: list });
            for (const key of list) delete session[key];
          }
        }
      }
    }
  });
  vm.runInContext(`${code}\nthis.exportForTest = exportUserSettings; this.importForTest = importUserSettings;`, context);
  return {
    context, local, session, getCalls, setCalls, removeCalls, sessionCalls, schedulerReasons,
    getBundleSetCalls: () => bundleSetCalls,
    getAuthTurnAcquires: () => authTurnAcquires,
    getAuthTurnReleases: () => authTurnReleases
  };
}

function validDocument() {
  return {
    schema: 'webclip-user-settings',
    version: 1,
    exportedAt: '2026-08-25T03:40:00.000Z',
    extensionVersion: '0.9.8',
    settings: {
      yandex: {
        clientId: 'new-client',
        rootPath: '/ImportedRoot',
        createPublicLinks: false,
        journalBackupEnabled: true,
        journalBackupIntervalMinutes: 720,
        journalBackupRetryMinutes: 30
      },
      journal: { groupByUrl: true },
      operationLog: { retentionHours: 48 }
    }
  };
}

(async () => {
  {
    const h = createHarness();
    const result = await h.context.exportForTest();
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.document.schema, 'webclip-user-settings');
    assert.strictEqual(result.document.version, 1);
    const json = JSON.stringify(result.document);
    assert(!/SESSION-SECRET|PERSISTENT-SHOULD-NOT-BE-READ|codeVerifier|accessToken/.test(json), 'export must not contain OAuth/PKCE secrets');
    assert.deepStrictEqual(h.sessionCalls, [], 'export must not access storage.session');
    assert.deepStrictEqual(h.getCalls[0], ['yandexConfig', 'operationLogSettings', 'webclipJournalGroupByUrl'], 'export must read an explicit non-secret allowlist');
  }

  {
    const h = createHarness();
    const malicious = validDocument();
    malicious.settings.yandex.accessToken = 'steal-me';
    await assert.rejects(h.context.importForTest(malicious), (error) => error?.code === 'WEBCLIP_USER_SETTINGS_SECRET_FIELD');
    assert.strictEqual(h.getBundleSetCalls(), 0, 'secret-bearing import must fail before writes');
    assert.deepStrictEqual(h.sessionCalls, []);
  }

  {
    const h = createHarness();
    const unknown = validDocument();
    unknown.settings.journal.unexpected = true;
    await assert.rejects(h.context.importForTest(unknown), /неизвестное поле/i);
    assert.strictEqual(h.getBundleSetCalls(), 0);
  }

  {
    const h = createHarness();
    const result = await h.context.importForTest(validDocument());
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.pending, false);
    assert.strictEqual(result.appliedCount, 8);
    assert.strictEqual(result.oauthSessionChanged, false);
    assert.strictEqual(h.getBundleSetCalls(), 1, 'settings must be committed as one bundled storage.set side effect');
    assert.strictEqual(h.local.yandexConfig.clientId, 'new-client');
    assert.strictEqual(h.local.yandexConfig.rootPath, '/ImportedRoot');
    assert.strictEqual(h.local.yandexConfig.authStorageMode, 'session', 'internal non-user yandex config must be preserved');
    assert.strictEqual(h.local.operationLogSettings.retentionHours, 48);
    assert.strictEqual(h.local.webclipJournalGroupByUrl, true);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(h.local, 'webclipUserSettingsImportPending'), false, 'marker must be cleared after scheduler reconciliation');
    assert.strictEqual(h.session.yandexAuth.accessToken, 'SESSION-SECRET', 'settings import preserves committed OAuth secret');
    assert.strictEqual(h.session.yandexAuthGeneration, 8, 'changed Client ID advances shared auth/settings generation');
    assert.strictEqual(h.session.yandexOAuthPending, null, 'changed Client ID invalidates older pending OAuth attempt');
    assert.strictEqual(h.session.yandexAuthConfigCommit, null, 'changed Client ID invalidates older config-settlement receipt');
    assert(!h.sessionCalls.some((call) => call.keys.includes('yandexAuth')), 'settings import never reads/writes committed OAuth auth key');
    assert.strictEqual(h.getAuthTurnAcquires(), 1, 'changed Client ID reserves one shared auth/settings turn');
    assert.strictEqual(h.getAuthTurnReleases(), 1, 'shared auth/settings turn releases after bundled settlement');
    assert(h.schedulerReasons.includes('settings-import'));
  }

  {
    const h = createHarness({ rejectBundle: true });
    await assert.rejects(h.context.importForTest(validDocument()), /simulated bundled storage failure/);
    assert.strictEqual(h.local.yandexConfig.clientId, 'old-client');
    assert.strictEqual(h.local.operationLogSettings.retentionHours, 24);
    assert.strictEqual(h.local.webclipJournalGroupByUrl, false);
    assert.strictEqual(h.getBundleSetCalls(), 1);
    assert.strictEqual(h.session.yandexAuth.accessToken, 'SESSION-SECRET', 'failed settings bundle preserves committed OAuth auth');
    assert.strictEqual(h.session.yandexAuthGeneration, 8, 'failed changed-Client-ID intent remains a monotonic generation fence');
    assert(!h.sessionCalls.some((call) => call.keys.includes('yandexAuth')), 'failed import has no committed-auth mutation authority');
    assert.strictEqual(h.getAuthTurnReleases(), 1, 'failed bundled write releases shared auth/settings turn');
  }

  {
    const pendingSet = deferred();
    const h = createHarness({ deferredBundle: pendingSet });
    const result = await h.context.importForTest(validDocument());
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.pending, true, 'local timeout must surface unknown settlement instead of retry/rollback');
    assert.strictEqual(result.appliedCount, 0);
    assert.strictEqual(h.getBundleSetCalls(), 1, 'unknown settlement must never auto-retry storage.set');
    assert.strictEqual(h.local.yandexConfig.clientId, 'old-client', 'before actual settlement old settings remain visible');
    pendingSet.resolve();
    await delay(20);
    assert.strictEqual(h.local.yandexConfig.clientId, 'new-client', 'late success must apply the same bundled settings');
    assert.strictEqual(h.local.operationLogSettings.retentionHours, 48);
    assert.strictEqual(h.local.webclipJournalGroupByUrl, true);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(h.local, 'webclipUserSettingsImportPending'), false, 'late success must reconcile and clear marker when worker remains alive');
    assert(h.schedulerReasons.includes('settings-import-late'));
    assert.strictEqual(h.session.yandexAuth.accessToken, 'SESSION-SECRET', 'late settings settlement preserves committed OAuth auth');
    assert(!h.sessionCalls.some((call) => call.keys.includes('yandexAuth')), 'late import settlement never reads/writes committed auth key');
    assert.strictEqual(h.getAuthTurnReleases(), 1, 'shared auth/settings turn releases only after actual late settlement');
  }

  {
    const h = createHarness();
    const unchangedClient = validDocument();
    unchangedClient.settings.yandex.clientId = 'old-client';
    const result = await h.context.importForTest(unchangedClient);
    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(h.sessionCalls, [], 'unchanged Client ID needs no auth/settings generation mutation');
    assert.strictEqual(h.getAuthTurnAcquires(), 0);
    assert.strictEqual(h.session.yandexAuth.accessToken, 'SESSION-SECRET');
  }

  console.log('PASS P1-008 user settings allowlist, secret exclusion, bundled commit and late-settlement reconciliation');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
