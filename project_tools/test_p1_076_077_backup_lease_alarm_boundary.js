const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

function section(startMarker, endMarker) {
  const start = sw.indexOf(startMarker);
  const end = sw.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Markers not found: ${startMarker} -> ${endMarker}`);
  return sw.slice(start, end);
}

function testP1076LeaseTransactionsAreBoundedAndOwnershipSafe() {
  assert(sw.includes('const JOURNAL_BACKUP_LEASE_TX_TIMEOUT_MS = 20_000;'));

  const acquire = section('async function acquireJournalBackupLease', 'async function renewJournalBackupLease');
  const renew = section('async function renewJournalBackupLease', 'async function releaseJournalBackupLease');
  const release = section('async function releaseJournalBackupLease', 'async function uploadJournalExportStagedToYandex');

  for (const [label, code] of [['acquire', acquire], ['renew', renew], ['release', release]]) {
    assert(code.includes('runIndexedDbTransactionBounded('), `${label} must use bounded IDB transaction`);
    assert(code.includes('JOURNAL_BACKUP_LEASE_TX_TIMEOUT_MS'), `${label} must use lease-specific timeout budget`);
    assert(code.includes("'readwrite'"), `${label} must remain one readwrite transaction`);
  }

  assert(acquire.includes("error.code = 'JOURNAL_BACKUP_BUSY'"), 'acquire must fail closed when an unexpired lease exists');
  assert(acquire.includes('meta.get(JOURNAL_BACKUP_LEASE_KEY)'), 'acquire must read authority inside the same transaction');
  assert(acquire.includes('meta.put({ key: JOURNAL_BACKUP_LEASE_KEY'), 'acquire must write the new token inside the same transaction');

  assert(renew.includes('current?.token !== lease.token'), 'renew must verify ownership token');
  assert(renew.includes("error.code = 'JOURNAL_BACKUP_LEASE_LOST'"), 'renew must fail closed on token mismatch');
  assert(renew.includes('meta.put({ key: JOURNAL_BACKUP_LEASE_KEY'), 'renew must update expiry in the same transaction');

  assert(release.includes('current?.token === lease.token'), 'release must verify ownership token');
  assert(release.includes('meta.delete(JOURNAL_BACKUP_LEASE_KEY)'), 'release may delete only after matching token');
}

async function testHungLeaseTransactionAbortsAtDeadline() {
  const helper = section('function runIndexedDbTransactionBounded', 'function openOperationLogDb');
  let abortCalls = 0;
  const tx = {
    error: null,
    objectStore() { return { get() { return {}; } }; },
    abort() {
      abortCalls += 1;
      if (typeof this._onabort === 'function') this._onabort();
    },
    set oncomplete(fn) { this._oncomplete = fn; },
    set onerror(fn) { this._onerror = fn; },
    set onabort(fn) { this._onabort = fn; }
  };
  const db = { transaction() { return tx; } };
  const context = vm.createContext({
    Promise, Error, String, Number, Math,
    setTimeout: (fn) => setTimeout(fn, 2),
    clearTimeout
  });
  vm.runInContext(`${helper}\nthis.runForTest = runIndexedDbTransactionBounded;`, context);

  await assert.rejects(
    context.runForTest(db, 'meta', 'readwrite', 'hung backup lease', () => {}, 20_000),
    (error) => error && error.code === 'WEBCLIP_IDB_TIMEOUT'
  );
  assert.strictEqual(abortCalls, 1, 'hung lease transaction must be aborted exactly once');
}

async function testP1077SettingsOnlySchedulesDurableBoundary() {
  const save = section('async function saveJournalBackupSettings', 'async function getJournalBackupStatus');
  assert(!save.includes('runDueJournalBackup('), 'settings path must not start a heavy backup');
  assert(save.includes("initializeJournalBackupScheduler('settings-change')"), 'settings path must rebuild durable alarm scheduling');

  const allCalls = [...sw.matchAll(/runDueJournalBackup\(([^\n]*)/g)].map((m) => m[0]);
  assert.strictEqual(allCalls.length, 2, 'runDueJournalBackup must have only its declaration plus generation-admitted dispatcher call');
  assert(!sw.includes("runDueJournalBackup('periodic-alarm', false)"), 'fixed periodic alarm must not bypass generation admission');
  assert(!sw.includes("runDueJournalBackup('retry-alarm', true)"), 'fixed retry alarm must not bypass generation admission');
  assert(sw.includes("return runDueJournalBackup(kind === 'retry' ? 'retry-alarm' : 'periodic-alarm', kind === 'retry', scheduledGeneration);"), 'dispatcher must pass the admitted scheduler generation into the heavy backup');
  assert(sw.includes('dispatchJournalBackupAlarm(alarm)'), 'fixed alarm names must route through the generation-admission dispatcher');
  assert(!sw.includes("runDueJournalBackup('enabled', false)"));

  let schedulerCalls = 0;
  let statusCalls = 0;
  const context = vm.createContext({
    Boolean, Object, Error, Number, String,
    normalizeDiskPath: (v) => String(v || ''),
    normalizeIntervalMinutes: (v, fallback) => Number(v) || fallback,
    DEFAULT_JOURNAL_BACKUP_INTERVAL_MINUTES: 1440,
    DEFAULT_JOURNAL_BACKUP_RETRY_MINUTES: 60,
    updateYandexConfig: async (mutate) => mutate({ rootPath: '/WebClip', journalBackupEnabled: false }),
    initializeJournalBackupScheduler: async (reason) => {
      assert.strictEqual(reason, 'settings-change');
      schedulerCalls += 1;
    },
    getJournalBackupStatus: async () => {
      statusCalls += 1;
      return { ok: true, enabled: true };
    }
  });
  vm.runInContext(`${save}\nthis.saveForTest = saveJournalBackupSettings;`, context);
  const result = await context.saveForTest({ enabled: true });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(schedulerCalls, 1, 'settings mutation must schedule/rebuild alarms exactly once');
  assert.strictEqual(statusCalls, 1, 'settings response may read resulting status once');
}

(async () => {
  testP1076LeaseTransactionsAreBoundedAndOwnershipSafe();
  await testHungLeaseTransactionAbortsAtDeadline();
  await testP1077SettingsOnlySchedulesDurableBoundary();
  console.log('PASS P1-076/P1-077 backup lease deadline and alarm boundary');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
