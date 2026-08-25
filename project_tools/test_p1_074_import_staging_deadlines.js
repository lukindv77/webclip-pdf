const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const journal = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Markers not found: ${startMarker} -> ${endMarker}`);
  return source.slice(start, end);
}

function fastTimer(fn, ms, ...args) {
  return setTimeout(fn, Math.min(Math.max(1, Number(ms) || 1), 4), ...args);
}

async function testFilePageOpenDeadlineClosesLateDb() {
  let lateClosed = false;
  let request;
  const context = vm.createContext({
    Promise, Error, String,
    setTimeout: fastTimer,
    clearTimeout,
    TRANSFER_DB_NAME: 'WebClipOffscreenTransfers',
    TRANSFER_DB_VERSION: 1,
    TRANSFER_STORE: 'payloads',
    indexedDB: {
      open() {
        request = { transaction: null, result: null };
        return request;
      }
    }
  });
  const code = section(journal, 'function openTransferDbForImport', 'async function stageJournalImportFile');
  vm.runInContext(`${code}\nthis.openForTest = openTransferDbForImport;`, context);

  await assert.rejects(context.openForTest(), /слишком много времени/i);
  request.result = { close() { lateClosed = true; } };
  request.onsuccess();
  assert.strictEqual(lateClosed, true, 'late indexedDB.open success must close the DB after caller timeout');
}

async function testFilePageWriteDeadlineAbortsHungTransaction() {
  let aborted = false;
  const tx = {
    error: null,
    objectStore() { return { put() {} }; },
    abort() {
      aborted = true;
      fastTimer(() => this.onabort && this.onabort(), 0);
    }
  };
  const db = { transaction() { return tx; }, close() {} };
  const context = vm.createContext({
    Promise, Error, String, Number, Math, Date, Blob,
    setTimeout: fastTimer,
    clearTimeout,
    MAX_JOURNAL_IMPORT_BYTES: 50 * 1024 * 1024,
    JOURNAL_IMPORT_CHUNK_BYTES: 1024 * 1024,
    TRANSFER_STORE: 'payloads',
    crypto: { randomUUID: () => 'test-id' },
    chrome: { runtime: { sendMessage: async () => ({ ok: true }) } }
  });
  const code = section(journal, 'async function stageJournalImportFile', 'async function discardStagedJournalImport');
  vm.runInContext(`${code}\nopenTransferDbForImport = async () => this.testDb; this.testDb = null; this.stageForTest = stageJournalImportFile;`, context);
  context.testDb = db;
  vm.runInContext('openTransferDbForImport = async () => this.testDb;', context);

  await assert.rejects(context.stageForTest(new Blob(['{}'], { type: 'application/json' })), /deadline|прервана/i);
  assert.strictEqual(aborted, true, 'hung file-page staging write must abort its IDB transaction');
}

async function testServiceWorkerReadDeadlineAbortsHungTransaction() {
  let aborted = false;
  const tx = {
    error: null,
    objectStore() { return { get() { return {}; } }; },
    abort() { aborted = true; fastTimer(() => this.onabort && this.onabort(), 0); }
  };
  const db = { transaction() { return tx; }, close() {} };
  const context = vm.createContext({
    Promise, Error, String, Number, Math,
    setTimeout: fastTimer,
    clearTimeout,
    TRANSFER_STORE: 'payloads',
    openTransferPayloadDb: async () => db
  });
  const code = section(sw, 'async function getTransferImportRecord', 'async function* streamStagedJournalImportText');
  vm.runInContext(`${code}\nthis.readForTest = getTransferImportRecord;`, context);

  await assert.rejects(
    context.readForTest('journal-import-test', 5),
    (error) => error?.code === 'JOURNAL_IMPORT_STAGING_TIMEOUT'
  );
  assert.strictEqual(aborted, true, 'hung service-worker staging read must abort its IDB transaction');
}

async function testServiceWorkerDeleteDeadlineAbortsHungTransaction() {
  let aborted = false;
  const tx = {
    error: null,
    objectStore() { return { openCursor() { return {}; } }; },
    abort() { aborted = true; fastTimer(() => this.onabort && this.onabort(), 0); }
  };
  const db = { transaction() { return tx; }, close() {} };
  const context = vm.createContext({
    Promise, Error, String, Number, Math, Date,
    setTimeout: fastTimer,
    clearTimeout,
    TRANSFER_STORE: 'payloads',
    openTransferPayloadDb: async () => db
  });
  const code = section(sw, 'async function deleteTransferPayloadGroup', 'async function getTransferTextPayload');
  vm.runInContext(`${code}\nthis.deleteForTest = deleteTransferPayloadGroup;`, context);

  await assert.rejects(
    context.deleteForTest('journal-import-test'),
    (error) => error?.code === 'WEBCLIP_IDB_TIMEOUT' || /прерван|deadline/i.test(error?.message || '')
  );
  assert.strictEqual(aborted, true, 'hung staging delete must abort its IDB transaction');
}

function testChunkReadsAndNormalizedStagingAreBounded() {
  const stream = section(sw, 'async function* streamStagedJournalImportText', 'async function deleteTransferPayload');
  assert(stream.includes('getTransferImportRecord(key, Math.min(20_000'), 'manifest read must inherit parse deadline');
  assert(stream.includes('getTransferImportRecord(chunkId, Math.min(20_000'), 'each chunk read must inherit parse deadline');
  assert(stream.includes("withOperationTimeout(blob.arrayBuffer(), remainingMs, 'Чтение chunk импорта журнала')"), 'Blob read must be bounded too');

  const normalizedWrite = section(sw, 'async function writeJournalImportStageBatch', 'async function deleteJournalImportStage');
  assert(normalizedWrite.includes('tx.abort()'), 'normalized staging write must abort on deadline');
  assert(normalizedWrite.includes("abortError.code = 'JOURNAL_IMPORT_STAGING_TIMEOUT'"), 'normalized staging timeout must have explicit code');

  const normalizedDelete = section(sw, 'async function deleteJournalImportStage', 'async function cleanupExpiredJournalImportStaging');
  assert(normalizedDelete.includes('tx.abort()'), 'normalized staging cleanup must abort on deadline');
  assert(normalizedDelete.includes("error.code = 'JOURNAL_IMPORT_STAGING_TIMEOUT'"), 'normalized staging cleanup timeout must have explicit code');
}

(async () => {
  await testFilePageOpenDeadlineClosesLateDb();
  await testFilePageWriteDeadlineAbortsHungTransaction();
  await testServiceWorkerReadDeadlineAbortsHungTransaction();
  await testServiceWorkerDeleteDeadlineAbortsHungTransaction();
  testChunkReadsAndNormalizedStagingAreBounded();
  console.log('PASS P1-074 bounded journal import staging IDB deadlines');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
