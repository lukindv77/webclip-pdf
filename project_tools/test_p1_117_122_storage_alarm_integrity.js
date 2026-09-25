const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

function section(startMarker, endMarker) {
  const start = sw.indexOf(startMarker);
  const end = sw.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Source markers not found: ${startMarker} -> ${endMarker}`);
  return sw.slice(start, end);
}

function timeoutWrapper(promise, timeoutMs, label) {
  const realMs = Math.min(Math.max(1, Number(timeoutMs) || 1), 5);
  let timer = null;
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error(`${label} timeout`);
        error.code = 'WEBCLIP_TIMEOUT';
        reject(error);
      }, realMs);
    })
  ]).finally(() => { if (timer) clearTimeout(timer); });
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function testGenericStorageLateSettlementBarrier() {
  const events = [];
  const context = vm.createContext({
    Promise,
    Error,
    String,
    Map,
    chrome: { alarms: { get: async () => null } },
    CHROME_STORAGE_OPERATION_TIMEOUT_MS: 10,
    CHROME_ALARM_OPERATION_TIMEOUT_MS: 10,
    chromeStorageMutationSettlementChains: new Map(),
    chromeAlarmMutationSettlementChains: new Map(),
    withOperationTimeout: timeoutWrapper
  });
  const code = section('async function runSerializedLateSettlementOperation', 'async function getExtensionStorageEstimate');
  vm.runInContext(`${code}\nthis.mutateStorage = mutateChromeStorageSerialized; this.mutateAlarm = mutateChromeAlarmSerialized;`, context);

  const oldSet = deferred();
  await assert.rejects(
    context.mutateStorage('storage.local:test', () => oldSet.promise, 'old set', 10),
    (error) => error && error.code === 'WEBCLIP_TIMEOUT'
  );

  await assert.rejects(
    context.mutateStorage('storage.local:test', () => {
      events.push('newer-started-too-early');
      return Promise.resolve('bad');
    }, 'newer set', 10),
    (error) => error && error.code === 'WEBCLIP_TIMEOUT'
  );
  assert(!events.includes('newer-started-too-early'), 'a newer storage mutation must not start while a timed-out older mutation is unresolved');

  events.push('old-set-settled');
  oldSet.resolve('old');
  await delay(0);
  const result = await context.mutateStorage('storage.local:test', () => {
    events.push('newest-started');
    return Promise.resolve('ok');
  }, 'newest set', 10);
  assert.strictEqual(result, 'ok');
  assert.deepStrictEqual(events, ['old-set-settled', 'newest-started']);
}

async function testLateAlarmClearCannotOvertakeNewCreate() {
  const events = [];
  let alarmPresent = true;
  const oldClear = deferred();
  const chrome = {
    alarms: {
      get: async () => alarmPresent ? { name: 'backup' } : null,
      clear: () => oldClear.promise.then(() => {
        alarmPresent = false;
        events.push('old-clear-settled');
        return true;
      }),
      create: async () => {
        alarmPresent = true;
        events.push('create-settled');
      }
    }
  };
  const context = vm.createContext({
    Promise,
    Error,
    String,
    Map,
    chrome,
    CHROME_STORAGE_OPERATION_TIMEOUT_MS: 10,
    CHROME_ALARM_OPERATION_TIMEOUT_MS: 10,
    chromeStorageMutationSettlementChains: new Map(),
    chromeAlarmMutationSettlementChains: new Map(),
    withOperationTimeout: timeoutWrapper
  });
  const code = section('async function runSerializedLateSettlementOperation', 'async function getExtensionStorageEstimate');
  vm.runInContext(`${code}\nthis.mutateAlarm = mutateChromeAlarmSerialized;`, context);

  await assert.rejects(
    context.mutateAlarm('backup', () => chrome.alarms.clear('backup'), 'old clear'),
    (error) => error && error.code === 'WEBCLIP_TIMEOUT'
  );
  await assert.rejects(
    context.mutateAlarm('backup', () => chrome.alarms.create('backup', { when: Date.now() + 1000 }), 'new create'),
    (error) => error && error.code === 'WEBCLIP_TIMEOUT'
  );
  assert(!events.includes('create-settled'), 'new alarm creation must not start before the timed-out clear really settles');

  oldClear.resolve(true);
  await delay(0);
  await context.mutateAlarm('backup', () => chrome.alarms.create('backup', { when: Date.now() + 1000 }), 'retry create');
  assert.deepStrictEqual(events, ['old-clear-settled', 'create-settled']);
  assert.strictEqual(alarmPresent, true, 'the final alarm must survive the older clear');
}


async function testBoundedReadHelpers() {
  const chrome = { alarms: { get: () => new Promise(() => {}) } };
  const context = vm.createContext({
    Promise,
    Error,
    String,
    Map,
    chrome,
    CHROME_STORAGE_OPERATION_TIMEOUT_MS: 10,
    CHROME_ALARM_OPERATION_TIMEOUT_MS: 10,
    chromeStorageMutationSettlementChains: new Map(),
    chromeAlarmMutationSettlementChains: new Map(),
    withOperationTimeout: timeoutWrapper
  });
  const code = section('async function runSerializedLateSettlementOperation', 'async function getExtensionStorageEstimate');
  vm.runInContext(`${code}\nthis.readStorage = readChromeStorageBounded; this.readAlarm = getChromeAlarmBounded;`, context);
  await assert.rejects(
    context.readStorage(() => new Promise(() => {}), 'hung storage read', 10),
    (error) => error && error.code === 'WEBCLIP_TIMEOUT'
  );
  await assert.rejects(
    context.readAlarm('maintenance', 'hung alarm read'),
    (error) => error && error.code === 'WEBCLIP_TIMEOUT'
  );
}

async function testStatsMarkerHasOwnLateSettlementBarrier() {
  const events = [];
  const context = vm.createContext({
    Promise,
    Error,
    journalStatsMarkerSettlementChain: Promise.resolve(),
    CHROME_STORAGE_OPERATION_TIMEOUT_MS: 10,
    withOperationTimeout: timeoutWrapper
  });
  const code = section('async function queueJournalStatsMarkerMutation', 'async function beginJournalStatsMutation');
  vm.runInContext(`${code}\nthis.queueMarker = queueJournalStatsMarkerMutation;`, context);

  const oldMarker = deferred();
  await assert.rejects(
    context.queueMarker(() => oldMarker.promise, 'old marker'),
    (error) => error && error.code === 'WEBCLIP_TIMEOUT'
  );
  await assert.rejects(
    context.queueMarker(() => {
      events.push('new-marker-started-too-early');
      return Promise.resolve();
    }, 'new marker'),
    (error) => error && error.code === 'WEBCLIP_TIMEOUT'
  );
  assert(!events.includes('new-marker-started-too-early'));
  events.push('old-marker-settled');
  oldMarker.resolve();
  await delay(0);
  await context.queueMarker(() => { events.push('newest-marker'); return Promise.resolve(); }, 'newest marker');
  assert.deepStrictEqual(events, ['old-marker-settled', 'newest-marker']);
}

function testStaticCoverage() {
  assert(sw.includes('const CHROME_STORAGE_OPERATION_TIMEOUT_MS = 10_000;'));
  assert(sw.includes('const CHROME_ALARM_OPERATION_TIMEOUT_MS = 10_000;'));

  // P1-117: backup checkpoint/state must use serialized storage helpers.
  assert(sw.includes('function mutateJournalBackupPending(start, label)'));
  assert(sw.includes('function mutateJournalBackupStateForNamespace(namespaceValue, mutator, label)'));
  assert(sw.includes("'storage.local:journalBackupState'"));
  const directState = [...sw.matchAll(/chrome\.storage\.local\.(?:get|set|remove)\([^\n]*journalBackupState/g)];
  assert.strictEqual(directState.length, 2, 'journalBackupState direct storage calls are allowed only inside namespace-bound fresh-read/write helper');
  const pendingSection = section('async function uploadJournalExportStagedToYandex', 'async function listYandexDirectoryItems');
  assert(!/await\s+chrome\.storage\.local\.(?:set|remove)\(\{?\s*\[?JOURNAL_BACKUP_PENDING_KEY/.test(pendingSection), 'backup checkpoint mutations must not bypass the serialized helper');
  assert(pendingSection.includes('mutateJournalBackupPending'));

  // P1-118/P1-119: alarm reads are bounded; every create/clear is inside the serialized mutation wrapper.
  assert(sw.includes('function getChromeAlarmBounded(name'));
  assert(sw.includes('function mutateChromeAlarmSerialized(name'));
  const scheduler = section('async function scheduleNextPeriodicBackup', 'async function runDueJournalBackup');
  assert(scheduler.includes('getChromeAlarmBounded(JOURNAL_BACKUP_ALARM'));
  assert(scheduler.includes('getChromeAlarmBounded(JOURNAL_BACKUP_RETRY_ALARM'));
  assert(!/await\s+chrome\.alarms\.(?:create|clear|get)\(/.test(scheduler), 'backup scheduler must not directly await raw alarm operations');
  const opCleanup = section('async function initializeOperationLogCleanup', 'let creatingOffscreenDocument');
  assert(opCleanup.includes('getChromeAlarmBounded(OPERATION_LOG_CLEANUP_ALARM'));
  assert(opCleanup.includes('mutateChromeAlarmSerialized'));

  // P1-120: crash marker mutations are held until actual settlement.
  assert(sw.includes('let journalStatsMarkerSettlementChain = Promise.resolve();'));
  assert(sw.includes('async function queueJournalStatsMarkerMutation'));
  assert(sw.includes('void actual.finally(() => releaseTurn())'));
  assert(sw.includes("'Фиксация dirty marker перед изменением журнала'"));
  assert(sw.includes("'Завершение dirty marker после изменения журнала'"));

  // P1-121: retention setting read/write is bounded/serialized.
  const settings = section('async function getOperationLogSettings', 'function openIndexedDbBounded');
  assert(settings.includes('readChromeStorageBounded'));
  assert(settings.includes('mutateChromeStorageSerialized'));
  assert(!/await\s+chrome\.storage\.local\.(?:get|set|remove)\(/.test(settings));

  // P1-122: legacy migration cannot hang on storage get/remove.
  const migration = section('async function migrateLegacyPendingJournalAppends', 'function normalizePendingJournalAppendData');
  assert(migration.includes('readChromeStorageBounded'));
  assert(migration.includes('mutateChromeStorageSerialized'));
  assert(!/await\s+chrome\.storage\.local\.(?:get|set|remove)\(/.test(migration));
}

(async () => {
  testStaticCoverage();
  await testGenericStorageLateSettlementBarrier();
  await testLateAlarmClearCannotOvertakeNewCreate();
  await testBoundedReadHelpers();
  await testStatsMarkerHasOwnLateSettlementBarrier();
  console.log('P1-117/P1-118/P1-119/P1-120/P1-121/P1-122 storage+alarm integrity regression: PASS');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
