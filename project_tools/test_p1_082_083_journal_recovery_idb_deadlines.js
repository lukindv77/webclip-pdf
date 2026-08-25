const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const journal = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');

function section(startMarker, endMarker) {
  const start = sw.indexOf(startMarker);
  const end = sw.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Markers not found: ${startMarker} -> ${endMarker}`);
  return sw.slice(start, end);
}

function assertBoundedFunction(name, nextName, timeoutConstant) {
  const code = section(`async function ${name}`, `async function ${nextName}`);
  assert(code.includes('runIndexedDbTransactionBounded('), `${name} must use bounded IndexedDB transactions`);
  assert(code.includes(timeoutConstant), `${name} must use ${timeoutConstant}`);
  assert(!/\bdb\.transaction\s*\(/.test(code), `${name} must not keep a raw unbounded db.transaction`);
}

function testP1082RecoveryStoresAreBounded() {
  assert(sw.includes('const RECOVERY_IDB_TX_TIMEOUT_MS = 20_000;'), 'P1-082 recovery transaction deadline constant missing');

  const functions = [
    ['checkpointPendingJournalAppend', 'removePendingJournalAppend'],
    ['removePendingJournalAppend', 'markPendingJournalAppendFailure'],
    ['markPendingJournalAppendFailure', 'listPendingJournalAppends'],
    ['listPendingJournalAppends', 'recoverPendingJournalAppends'],
    ['checkpointPendingRemoteSaveIntent', 'markPendingRemoteSaveVerified'],
    ['markPendingRemoteSaveVerified', 'removePendingRemoteSave'],
    ['removePendingRemoteSave', 'markPendingRemoteSaveFailure'],
    ['markPendingRemoteSaveFailure', 'markPendingRemoteSaveStale'],
    ['markPendingRemoteSaveStale', 'cleanupStalePendingRemoteSaves'],
    ['countPendingRemoteSavePhases', 'appendJournalEntryFromDurableCheckpoint'],
    ['listPendingRemoteSaves', 'recoverPendingRemoteSaves'],
    ['checkpointPendingLocalDownloadIntent', 'bindPendingLocalDownloadIntent'],
    ['bindPendingLocalDownloadIntent', 'getPendingLocalDownload'],
    ['getPendingLocalDownload', 'removePendingLocalDownload'],
    ['removePendingLocalDownload', 'finalizePendingLocalDownload']
  ];
  for (const [name, nextName] of functions) assertBoundedFunction(name, nextName, 'RECOVERY_IDB_TX_TIMEOUT_MS');

  const migration = section('async function migrateLegacyPendingJournalAppends', 'function normalizePendingJournalAppendData');
  assert(migration.includes('runIndexedDbTransactionBounded('));
  assert(migration.includes('RECOVERY_IDB_TX_TIMEOUT_MS'));
  assert(!/\bdb\.transaction\s*\(/.test(migration), 'legacy pending append IDB migration must not hang');

  const reconciliation = section('async function reconcilePendingLocalDownloads', 'async function appendJournalEntry');
  const preLoop = reconciliation.slice(0, reconciliation.indexOf('let completed = 0;'));
  assert(preLoop.includes('runIndexedDbTransactionBounded('), 'pendingDownloads reconciliation scan must be bounded');
  assert(preLoop.includes('RECOVERY_IDB_TX_TIMEOUT_MS'));
  assert(!/\bdb\.transaction\s*\(/.test(preLoop), 'pendingDownloads reconciliation scan must not use raw transaction');

  const append = section('async function appendJournalEntry', 'async function safeAppendJournalEntry');
  assert(append.includes('runIndexedDbTransactionBounded('), 'durable append must use bounded transaction');
  assert(append.includes('JOURNAL_CRUD_IDB_TX_TIMEOUT_MS'));
  assert(append.includes('requiredDurableStoreName'), 'durable checkpoint recheck must remain in atomic append transaction');
  assert(append.includes('pendingStore.delete(id)'), 'generic pending checkpoint cleanup must remain in atomic append transaction');
  assert(!/\bdb\.transaction\s*\(/.test(append));

  const clear = section('async function clearJournalEntries', 'async function journalRevisionSnapshot');
  assert(clear.includes('runIndexedDbTransactionBounded('), 'destructive journal clear must use bounded transaction');
  for (const store of ['JOURNAL_PENDING_STORE', 'JOURNAL_PENDING_DOWNLOAD_STORE', 'JOURNAL_PENDING_REMOTE_STORE']) {
    assert(clear.includes(store), `clear must atomically include ${store}`);
  }
  assert(!/\bdb\.transaction\s*\(/.test(clear));

  const rawPendingTx = [...sw.matchAll(/\bdb\.transaction\s*\([^\n]*(?:JOURNAL_PENDING_STORE|JOURNAL_PENDING_REMOTE_STORE|JOURNAL_PENDING_DOWNLOAD_STORE)/g)];
  assert.strictEqual(rawPendingTx.length, 0, 'P1-082: no raw pending recovery-store transaction may remain');
}

function testP1083OrdinaryJournalCrudIsBounded() {
  assert(sw.includes('const JOURNAL_CRUD_IDB_TX_TIMEOUT_MS = 20_000;'), 'P1-083 journal CRUD deadline constant missing');
  const functions = [
    ['rebuildUrlStatsForUrl', 'rebuildAllUrlStats'],
    ['updateUrlStatsAfterAppend', 'migrateLegacyPendingJournalAppends'],
    ['appendJournalEntry', 'safeAppendJournalEntry'],
    ['listJournalEntries', 'function journalViewSummary'],
    ['getJournalEntryById', 'updateJournalEntryRecord'],
    ['updateJournalEntryRecord', 'function normalizeJournalComments'],
    ['getJournalEntriesByIds', 'updateJournalComment'],
    ['deleteJournalEntryRecordOnly', 'findYandexFileForJournalEntry'],
    ['clearJournalEntries', 'journalRevisionSnapshot']
  ];
  for (const [name, nextName] of functions) {
    const start = `async function ${name}`;
    const end = nextName.startsWith('function ') ? nextName : `async function ${nextName}`;
    const code = section(start, end);
    assert(code.includes('runIndexedDbTransactionBounded('), `${name} must use bounded IndexedDB transactions`);
    assert(code.includes('JOURNAL_CRUD_IDB_TX_TIMEOUT_MS'), `${name} must use journal CRUD deadline`);
    assert(!/\bdb\.transaction\s*\(/.test(code), `${name} must not use raw db.transaction`);
  }

  const summary = section('async function getJournalSummaryForUrl', 'function makeActionIconImageData');
  assert(summary.includes('runIndexedDbTransactionBounded('));
  assert(summary.includes('JOURNAL_CRUD_IDB_TX_TIMEOUT_MS'));
  assert(!/\bdb\.transaction\s*\(/.test(summary));

  // P1-032 view cursor queries intentionally retain custom timeout errors, but
  // every raw transaction must still have a timer that aborts the transaction.
  for (const [start, end] of [
    ['async function scanJournalViewMeta', 'function openJournalViewCursor'],
    ['async function queryJournalViewPage', 'function compareJournalViewGroups'],
    ['async function queryJournalViewGroups', 'async function queryJournalViewGroupEntries'],
    ['async function queryJournalViewGroupEntries', 'async function getJournalEntryById']
  ]) {
    const code = section(start, end);
    assert(code.includes('JOURNAL_VIEW_QUERY_DEADLINE_MS'));
    assert(/setTimeout\([\s\S]*?tx\.abort\(\)/.test(code), `${start} must abort on its bounded view deadline`);
  }

  // Full urlStats rebuild is a bounded multi-transaction maintenance-like
  // scan with one 5-minute total budget and 20-second abort timers per tx.
  const rebuild = section('async function rebuildAllUrlStats', 'async function updateUrlStatsAfterAppend');
  assert(rebuild.includes('const deadline = Date.now() + 5 * 60 * 1000;'));
  assert((rebuild.match(/setTimeout\(\(\) => \{ try \{ tx\.abort\(\); \} catch \(_\) \{\} \}, 20_000\)/g) || []).length >= 3,
    'urlStats full rebuild must retain per-transaction abort deadlines');

  // The Full Journal extension page also reads IndexedDB directly to avoid
  // materializing large responses through runtime messaging. Every direct
  // Journal read must keep the P1-032 abortable cursor deadline.
  const directReadNames = [
    'readJournalEntriesByIdsForView',
    'readJournalViewMetaDirect',
    'readJournalPageDirect',
    'readJournalUrlGroupsDirect',
    'readJournalUrlGroupEntriesDirect'
  ];
  for (let i = 0; i < directReadNames.length; i += 1) {
    const name = directReadNames[i];
    const start = journal.indexOf(`async function ${name}`);
    const next = i + 1 < directReadNames.length
      ? journal.indexOf(`async function ${directReadNames[i + 1]}`, start + 1)
      : journal.indexOf('async function readJournalUrlGroupEntriesViaServiceWorker', start + 1);
    assert(start >= 0 && next > start, `journal.js direct read function missing: ${name}`);
    const code = journal.slice(start, next);
    assert(code.includes('JOURNAL_VIEW_QUERY_DEADLINE_MS'), `${name} must keep a direct-read deadline`);
    assert(/tx\.abort\(\)/.test(code), `${name} must abort a hung direct Journal transaction`);
  }
}

async function testBoundedHelperAbortsHungCrudAndPublishesAfterCommit() {
  const helper = section('function runIndexedDbTransactionBounded', 'function openOperationLogDb');
  let abortCalls = 0;
  const tx = {
    error: null,
    objectStore() { return {}; },
    abort() { abortCalls += 1; if (this._onabort) this._onabort(); },
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
    context.runForTest(db, 'journal', 'readwrite', 'hung journal crud', () => {}, 20_000),
    (error) => error && error.code === 'WEBCLIP_IDB_TIMEOUT'
  );
  assert.strictEqual(abortCalls, 1, 'hung Journal/recovery transaction must be aborted exactly once');

  const tx2 = {
    error: null,
    objectStore() { return {}; },
    abort() {},
    set oncomplete(fn) { this._oncomplete = fn; },
    set onerror(fn) { this._onerror = fn; },
    set onabort(fn) { this._onabort = fn; }
  };
  const db2 = { transaction() { return tx2; } };
  let settled = false;
  const pending = context.runForTest(db2, 'journal', 'readonly', 'journal readonly', ({ setResult }) => setResult(['entry']), 1000)
    .then((value) => { settled = true; return value; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.strictEqual(settled, false, 'readonly Journal result must not publish before tx.oncomplete');
  tx2._oncomplete();
  assert.deepStrictEqual(Array.from(await pending), ['entry']);
}

(async () => {
  testP1082RecoveryStoresAreBounded();
  testP1083OrdinaryJournalCrudIsBounded();
  await testBoundedHelperAbortsHungCrudAndPublishesAfterCommit();
  console.log('PASS P1-082/P1-083 Journal recovery/CRUD IndexedDB deadlines');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
