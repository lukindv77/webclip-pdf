const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const swSource = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Source markers not found: ${startMarker} -> ${endMarker}`);
  return source.slice(start, end);
}

async function testJournalContextFailsClosed() {
  let createCalls = 0;
  const chrome = {
    tabs: { get: () => Promise.reject(new Error('tab state unavailable')) },
    storage: { session: { set: () => Promise.resolve() } },
    runtime: { getURL: (value) => `chrome-extension://id/${value}` }
  };
  const context = vm.createContext({
    chrome,
    Promise,
    Error,
    Number,
    String,
    Date,
    URLSearchParams,
    crypto: { randomUUID: () => 'ctx-id' },
    normalizeError: (error) => error?.message || String(error),
    withOperationTimeout: (promise) => Promise.resolve(promise),
    getChromeTabBounded: (tabId) => Promise.resolve().then(() => chrome.tabs.get(tabId)),
    createTabNextTo: async () => { createCalls += 1; return { id: 99 }; }
  });
  const code = section(swSource, 'async function openJournalPage', 'async function ensureWebClipContentScript');
  vm.runInContext(`${code}\nthis.openJournalPageForTest = openJournalPage;`, context);

  await assert.rejects(
    context.openJournalPageForTest({ mode: 'all', sourceTabId: 7, sourceUrl: 'https://example.com/' }),
    (error) => error?.code === 'JOURNAL_SOURCE_CONTEXT_UNKNOWN'
  );
  assert.strictEqual(createCalls, 0, 'unknown source tab privacy state must block journal creation');

  chrome.tabs.get = async (id) => id === 7 ? { id, incognito: false, url: 'https://example.com/' } : Promise.reject(new Error('anchor unknown'));
  await assert.rejects(
    context.openJournalPageForTest({ mode: 'all', sourceTabId: 7, sourceUrl: 'https://example.com/', anchorTabId: 8 }),
    (error) => error?.code === 'JOURNAL_ANCHOR_CONTEXT_UNKNOWN'
  );
  assert.strictEqual(createCalls, 0, 'unknown anchor tab privacy state must block journal creation');

  chrome.tabs.get = async () => ({ id: 7, incognito: true, url: 'https://example.com/' });
  await assert.rejects(
    context.openJournalPageForTest({ mode: 'all', sourceTabId: 7, sourceUrl: 'https://example.com/' }),
    /Инкогнито/
  );
}

function testBadgeRefreshCannotFlipYandexSuccess() {
  const upload = section(swSource, 'async function generatePdfAndUploadToYandex', 'async function retryCachedPdfUploadToYandex');
  const retry = section(swSource, 'async function retryCachedPdfUploadToYandex', 'async function uploadCachedRecordToYandex');
  for (const [label, code] of [['upload', upload], ['retry', retry]]) {
    assert(code.includes('await updateActionForTab(tabId).catch((error) => {'), `${label}: badge refresh must be secondary/best-effort`);
    const badge = code.indexOf('await updateActionForTab(tabId).catch((error) => {');
    const successReturn = code.indexOf('return { ...result', badge);
    assert(badge >= 0 && successReturn > badge, `${label}: successful result must survive badge failure`);
  }
}

async function testBackupHousekeepingDoesNotThrowAfterSuccessCommit() {
  const warnings = [];
  const chrome = {
    storage: { local: { remove: () => Promise.reject(new Error('remove failed')) } },
    alarms: { clear: () => Promise.reject(new Error('alarm failed')) }
  };
  const context = vm.createContext({
    chrome,
    Promise,
    Error,
    String,
    JOURNAL_BACKUP_PENDING_KEY: 'pending',
    JOURNAL_BACKUP_RETRY_ALARM: 'retry',
    normalizeError: (error) => error?.message || String(error),
    appendOperationLogEvent: (_id, event) => warnings.push(event.message),
    mutateChromeStorageSerialized: (_key, start) => Promise.resolve().then(start),
    mutateChromeAlarmSerialized: (_name, start) => Promise.resolve().then(start),
    scheduleNextPeriodicBackup: () => Promise.reject(new Error('schedule failed'))
  });
  const code = section(swSource, 'async function finalizeJournalBackupSuccessHousekeeping', 'async function exportJournalBackupToYandex');
  vm.runInContext(`${code}\nthis.finalizeForTest = finalizeJournalBackupSuccessHousekeeping;`, context);
  const warning = await context.finalizeForTest({ successAt: Date.now(), status: { enabled: true, intervalMinutes: 60 }, operationId: 'op' });
  assert(warning.includes('remove failed'));
  assert(warning.includes('alarm failed'));
  assert(warning.includes('schedule failed'));
  assert.strictEqual(warnings.length, 3);

  const backup = section(swSource, 'async function exportJournalBackupToYandex', 'function parseJournalMonthFolder');
  const currentNamespaceCommits = [...backup.matchAll(/await mutateJournalBackupStateForNamespace\(backupNamespace,/g)];
  const recoveredNamespaceCommits = [...backup.matchAll(/await mutateJournalBackupStateForNamespace\(recoveredNamespace,/g)];
  assert(currentNamespaceCommits.length >= 2, 'fresh success and failure paths must use current namespace durable backup-state mutation');
  assert(recoveredNamespaceCommits.length >= 1, 'recovered success must use exact checkpoint namespace durable backup-state mutation');
  assert(backup.includes("'Фиксация recovered success в exact checkpoint namespace'"));
  assert(backup.includes("'Фиксация namespace-local успешного backup-state'"));
  assert(backup.includes('await finalizeJournalBackupSuccessHousekeeping({ successAt, status, operationId })'),
    'post-success cleanup must use non-throwing housekeeping helper');

  const due = section(swSource, 'async function runDueJournalBackup', 'function openTransferPayloadDb');
  assert(due.includes('if (forceRetry && !unresolvedFailure)'),
    'stale retry alarm must be skipped after a newer success resolved the failure');
  assert(due.includes('staleRetryAlarm: true'));
}

(async () => {
  await testJournalContextFailsClosed();
  testBadgeRefreshCannotFlipYandexSuccess();
  await testBackupHousekeepingDoesNotThrowAfterSuccessCommit();
  console.log('PASS recovered P0-060/P0-061/P0-062');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
