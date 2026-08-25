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

function testMaintenanceCleanupsUseBoundedTransactions() {
  assert(sw.includes('const MAINTENANCE_IDB_TX_TIMEOUT_MS = 20_000;'));

  const checks = [
    ['async function cleanupExpiredOperationLogs', 'async function runLoggedOperationLogCleanup', 2],
    ['async function cleanupStalePendingRemoteSaves', 'async function countPendingRemoteSavePhases', 2],
    ['async function cleanupExpiredJournalImportStaging', 'async function inspectStagedJournalImportStream', 1],
    ['async function cleanupTransferPayloads', 'function pdfCacheKey', 1],
    ['async function cleanupExpiredPdfCache', 'async function deleteCachedPdfByKey', 1]
  ];

  for (const [start, end, minimumCalls] of checks) {
    const code = section(start, end);
    const calls = (code.match(/runIndexedDbTransactionBounded\(/g) || []).length;
    assert(calls >= minimumCalls, `${start} must use bounded IndexedDB transactions`);
    assert(code.includes('MAINTENANCE_IDB_TX_TIMEOUT_MS'), `${start} must use the maintenance deadline constant`);
  }

  const maintenance = section('async function runLoggedOperationLogCleanup', 'async function initializeOperationLogCleanup');
  for (const name of [
    'operation-log-cleanup',
    'transfer-cleanup',
    'pdf-cache-cleanup',
    'remote-checkpoint-cleanup',
    'import-staging-cleanup'
  ]) {
    assert(maintenance.includes(`runStage('${name}'`), `${name} must remain an independently caught maintenance stage`);
  }
  const cleanupBlock = maintenance.indexOf("runStage('operation-log-cleanup'");
  const recoveryBlock = maintenance.indexOf("runStage('journal-recovery'");
  assert(cleanupBlock >= 0 && recoveryBlock > cleanupBlock, 'cleanup stages must complete/fail boundedly before recovery stages start');
}

async function testHungTransactionAbortsAndRejects() {
  const helper = section('function runIndexedDbTransactionBounded', 'function openOperationLogDb');
  let abortCalls = 0;
  const tx = {
    error: null,
    objectStore() { return {}; },
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
    context.runForTest(db, 'store', 'readwrite', 'hung maintenance tx', () => {}, 20_000),
    (error) => error && error.code === 'WEBCLIP_IDB_TIMEOUT'
  );
  assert.strictEqual(abortCalls, 1, 'hung maintenance transaction must be aborted exactly once');
}

async function testResultPublishesOnlyAfterTransactionComplete() {
  const helper = section('function runIndexedDbTransactionBounded', 'function openOperationLogDb');
  const tx = {
    error: null,
    objectStore() { return {}; },
    abort() {},
    set oncomplete(fn) { this._oncomplete = fn; },
    set onerror(fn) { this._onerror = fn; },
    set onabort(fn) { this._onabort = fn; }
  };
  const db = { transaction() { return tx; } };
  const context = vm.createContext({ Promise, Error, String, Number, Math, setTimeout, clearTimeout });
  vm.runInContext(`${helper}\nthis.runForTest = runIndexedDbTransactionBounded;`, context);

  let settled = false;
  const pending = context.runForTest(db, 'store', 'readonly', 'readonly maintenance tx', ({ setResult }) => {
    setResult(['row']);
  }, 1000).then((value) => { settled = true; return value; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.strictEqual(settled, false, 'readonly result must not publish before tx.oncomplete');
  tx._oncomplete();
  const result = await pending;
  assert.deepStrictEqual(Array.from(result), ['row']);
}

(async () => {
  testMaintenanceCleanupsUseBoundedTransactions();
  await testHungTransactionAbortsAndRejects();
  await testResultPublishesOnlyAfterTransactionComplete();
  console.log('PASS P1-075 maintenance IndexedDB deadlines');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
