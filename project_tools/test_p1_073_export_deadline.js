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

function testDeadlineThreading() {
  const revision = section('async function journalRevisionSnapshot', 'async function readJournalEntryBatch');
  assert(revision.includes('openJournalDb(remaining())'));
  assert(/},\s*remaining\(\)\s*\);/.test(revision), 'revision transaction must recompute post-open remaining time');

  const batch = section('async function readJournalEntryBatch', 'function safeTextChunkEnd');
  assert(batch.includes('openJournalDb(remaining())'));
  assert(batch.includes('const timeoutMs = remaining();'));

  const stage = section('async function stageFullJournalExportOnce', 'async function stageFullJournalExport()');
  assert((stage.match(/journalRevisionSnapshot\(buildDeadline\)/g) || []).length >= 2);
  assert((stage.match(/}, buildDeadline\);/g) || []).length >= 2, 'chunk and manifest writes must receive buildDeadline');
  assert(stage.includes('deleteTransferPayloadGroup(stagingKey, buildDeadline)'));

  const retry = section('async function stageFullJournalExport()', 'function boundedImportString');
  assert(retry.includes('const buildDeadline = Date.now() + JOURNAL_EXPORT_BUILD_TIMEOUT_MS;'));
  assert(retry.indexOf('const buildDeadline') < retry.indexOf('for (let attempt'), 'deadline must be created outside retry loop');
}

async function testPutTransferRecordChargesOpenTime() {
  const code = section('async function putTransferRecord', 'function transferChunkId');
  let now = 900;
  let openTimeout = null;
  let txTimerDelay = null;
  const timers = [];
  const tx = {
    objectStore: () => ({ put() {} }),
    abort() {},
    set oncomplete(fn) { this._oncomplete = fn; },
    set onerror(fn) { this._onerror = fn; },
    set onabort(fn) { this._onabort = fn; }
  };
  const context = vm.createContext({
    Error, String, Number, Math,
    Date: { now: () => now },
    setTimeout: (fn, delay) => { txTimerDelay = delay; timers.push(fn); return timers.length; },
    clearTimeout() {},
    TRANSFER_STORE: 'payloads',
    openTransferPayloadDb: async (timeout) => {
      openTimeout = timeout;
      now += 60;
      return { transaction: () => tx, close() {} };
    }
  });
  vm.runInContext(`${code}\nthis.runForTest = putTransferRecord;`, context);
  const promise = context.runForTest({ id: 'x' }, 1000);
  await new Promise((resolve) => setImmediate(resolve));
  assert.strictEqual(typeof tx._oncomplete, 'function', 'transaction completion handler must be installed');
  tx._oncomplete();
  await promise;
  assert.strictEqual(openTimeout, 100, 'initial open receives 100ms remaining');
  assert(txTimerDelay <= 40 && txTimerDelay > 0, `transaction must get only post-open remainder, got ${txTimerDelay}`);
}

async function testDeleteTransferChargesOpenTime() {
  const code = section('async function deleteTransferPayloadGroup', 'async function getTransferTextPayload');
  let now = 1900;
  let openTimeout = null;
  let txTimerDelay = null;
  const req = {};
  const tx = {
    objectStore: () => ({ openCursor: () => req }),
    abort() {},
    set oncomplete(fn) { this._oncomplete = fn; },
    set onerror(fn) { this._onerror = fn; },
    set onabort(fn) { this._onabort = fn; }
  };
  const context = vm.createContext({
    Error, String, Number, Math,
    Date: { now: () => now },
    setTimeout: (_fn, delay) => { txTimerDelay = delay; return 1; },
    clearTimeout() {},
    TRANSFER_STORE: 'payloads',
    openTransferPayloadDb: async (timeout) => {
      openTimeout = timeout;
      now += 75;
      return { transaction: () => tx, close() {} };
    }
  });
  vm.runInContext(`${code}\nthis.runForTest = deleteTransferPayloadGroup;`, context);
  const promise = context.runForTest('base', 2000);
  await new Promise((resolve) => setImmediate(resolve));
  assert.strictEqual(typeof tx._oncomplete, 'function', 'cleanup completion handler must be installed');
  tx._oncomplete();
  await promise;
  assert.strictEqual(openTimeout, 100);
  assert(txTimerDelay <= 25 && txTimerDelay > 0, `cleanup transaction must get only post-open remainder, got ${txTimerDelay}`);
}

(async () => {
  testDeadlineThreading();
  await testPutTransferRecordChargesOpenTime();
  await testDeleteTransferChargesOpenTime();
  console.log('PASS P1-073 common export deadline');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
