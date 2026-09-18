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

function fastTimer(fn, ms, ...args) {
  return setTimeout(fn, Math.min(Number(ms) || 0, 5), ...args);
}

function testExportBatchMemoryBudget() {
  const code = section(swSource, 'async function readJournalEntryBatch', 'function safeTextChunkEnd');
  assert(code.includes('JOURNAL_EXPORT_BATCH_MEMORY_CHARS'));
  assert(code.includes('items.push(json)'));
  assert(!code.includes('items.push(cursor.value)'), 'export batch must not retain a full object batch');
  assert(code.includes('serializedChars + json.length > JOURNAL_EXPORT_BATCH_MEMORY_CHARS'));
  assert(swSource.includes('const JOURNAL_EXPORT_BATCH_MEMORY_CHARS = 4 * 1024 * 1024;'));
}

async function testStorageEstimateDeadlineFailClosed() {
  const navigator = { storage: { estimate: () => new Promise(() => {}), persisted: () => new Promise(() => {}) } };
  const context = vm.createContext({
    navigator,
    globalThis: null,
    Promise,
    Error,
    Number,
    Math,
    setTimeout: fastTimer,
    clearTimeout,
    STORAGE_ESTIMATE_TIMEOUT_MS: 5_000,
    STORAGE_SAFETY_RESERVE_BYTES: 32 * 1024 * 1024,
    withOperationTimeout: (promise, timeoutMs, label) => Promise.race([
      Promise.resolve(promise),
      new Promise((_, reject) => fastTimer(() => {
        const error = new Error(`${label} timeout`);
        error.code = 'WEBCLIP_TIMEOUT';
        reject(error);
      }, timeoutMs))
    ]),
    cleanupTransferPayloads: async () => {},
    cleanupExpiredPdfCache: async () => {},
    getOperationLogSettings: async () => ({ retentionHours: 24 }),
    cleanupExpiredOperationLogs: async () => {}
  });
  context.globalThis = context;
  const code = section(swSource, 'async function getExtensionStorageEstimate', 'function normalizeOperationLogRetentionHours');
  vm.runInContext(`${code}\nthis.ensureStorageBudgetForTest = ensureStorageBudget; this.getStorageHealthForTest = getStorageHealth;`, context);

  await assert.rejects(
    context.ensureStorageBudgetForTest(1024, 'test'),
    (error) => error?.code === 'WEBCLIP_STORAGE_ESTIMATE_UNAVAILABLE'
  );
  const health = await context.getStorageHealthForTest();
  assert.strictEqual(health.supported, false, 'read-only health may report unsupported instead of blocking UI');
}

async function testGlobalPdfGenerationBudget() {
  const chrome = {
    debugger: {
      onEvent: {
        addListener() {},
        removeListener() {}
      },
      attach: () => Promise.resolve(),
      detach: () => Promise.resolve(),
      sendCommand(_debuggee, method) {
        if (method === 'Page.getFrameTree') {
          return Promise.resolve({ frameTree: { frame: { id: `main-${_debuggee.tabId}`, loaderId: `loader-${_debuggee.tabId}` } } });
        }
        if (method === 'Page.printToPDF') return new Promise(() => {});
        return Promise.resolve({});
      }
    }
  };
  const context = vm.createContext({
    chrome,
    console,
    Promise,
    Error,
    Number,
    Math,
    Set,
    Map,
    Blob,
    Uint8Array,
    atob,
    Date,
    setTimeout: fastTimer,
    clearTimeout,
    DEBUGGER_COMMAND_TIMEOUT_MS: 60_000,
    MAX_PDF_BYTES: 48 * 1024 * 1024,
    PDF_STREAM_READ_CHUNK_BYTES: 1024 * 1024,
    normalizeError: (error) => error?.message || String(error),
    WebClipContentInjectionGuard: { assertActiveWorkerSourceCurrent: async () => true }
  });
  const code = section(swSource, 'function withOperationTimeout', 'let yandexConfigStorageSettlementChain');
  vm.runInContext(`${code}\nthis.generatePdfBlobForTest = generatePdfBlob;`, context);

  const first = context.generatePdfBlobForTest(1);
  await assert.rejects(
    context.generatePdfBlobForTest(2),
    (error) => error?.code === 'WEBCLIP_PDF_BUSY'
  );
  await assert.rejects(first, (error) => error?.code === 'WEBCLIP_TIMEOUT');
}

(async () => {
  testExportBatchMemoryBudget();
  await testStorageEstimateDeadlineFailClosed();
  await testGlobalPdfGenerationBudget();
  console.log('PASS recovered P1-072/P1-095/P1-103');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
