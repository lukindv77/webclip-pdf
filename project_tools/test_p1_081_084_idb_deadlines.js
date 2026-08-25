const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const offscreen = fs.readFileSync(path.join(root, 'offscreen.js'), 'utf8');

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Missing source markers: ${startMarker} -> ${endMarker}`);
  return source.slice(start, end);
}

assert(sw.includes('const OPERATION_LOG_CRUD_IDB_TX_TIMEOUT_MS = 20_000;'));
assert(sw.includes('const PDF_CACHE_CRUD_IDB_TX_TIMEOUT_MS = 20_000;'));

const operationSections = [
  section(sw, 'async function mutateOperationLogOnce(operationId, mutate) {', 'function isStorageQuotaError'),
  section(sw, 'async function appendOperationLogEventOnce(operationId, event = {}) {', 'async function appendOperationLogEventDurable'),
  section(sw, 'async function listOperationLogs(limit = 100) {', 'async function clearOperationLogs() {'),
  section(sw, 'async function clearOperationLogs() {', 'function operationLogExportFilename'),
  section(sw, 'async function getOperationLog(operationId) {', 'function deleteOperationLogEventsInTransaction')
];
for (const source of operationSections) {
  assert(source.includes('runIndexedDbTransactionBounded'), 'ordinary OperationLog transaction must use bounded helper');
  assert(source.includes('OPERATION_LOG_CRUD_IDB_TX_TIMEOUT_MS'), 'ordinary OperationLog transaction must use dedicated CRUD timeout');
}
assert(!operationSections[2].includes('resolve({ ok: true'), 'OperationLog list must not publish from cursor request success');
assert(operationSections[2].includes('setResult({ ok: true, operations: result })'));
assert(operationSections[4].includes('setResult(output)'), 'OperationLog detail result must be staged until tx completion');

const operationMaintenance = section(sw, 'async function cleanupExpiredOperationLogs', 'async function runLoggedOperationLogCleanup');
assert(operationMaintenance.includes('MAINTENANCE_IDB_TX_TIMEOUT_MS'), 'maintenance deadline domain must remain separate');

const pdfSections = [
  section(sw, 'async function putCachedPdf(record) {', 'async function getCachedPdfByKey(key) {'),
  section(sw, 'async function getCachedPdfByKey(key) {', 'async function getCachedPdfMetadataByKey(key) {'),
  section(sw, 'async function getCachedPdfMetadataByKey(key) {', 'async function getValidCachedPdfForTab(tabId) {'),
  section(sw, 'async function deleteCachedPdfByKey(key) {', 'async function deleteCachedPdf(tabId) {')
];
for (const source of pdfSections) {
  assert(source.includes('runIndexedDbTransactionBounded'), 'ordinary PDF retry-cache transaction must use bounded helper');
  assert(source.includes('PDF_CACHE_CRUD_IDB_TX_TIMEOUT_MS'), 'ordinary PDF retry-cache transaction must use dedicated CRUD timeout');
}
assert(pdfSections[1].includes('setResult(request.result || null)'), 'PDF cache readonly result must be staged');
assert(pdfSections[2].includes('setResult(request.result || null)'), 'PDF metadata readonly result must be staged');
assert(pdfSections[0].includes('[PDF_CACHE_STORE, PDF_CACHE_META_STORE]'), 'PDF + metadata write must remain atomic in one transaction');
assert(pdfSections[3].includes('[PDF_CACHE_STORE, PDF_CACHE_META_STORE]'), 'PDF + metadata delete must remain atomic in one transaction');

const validCache = section(sw, 'async function getValidCachedPdfForTab(tabId) {', 'async function cleanupExpiredPdfCache() {');
assert(validCache.includes('PDF_CACHE_TTL_MS'));
assert(validCache.includes('currentUrl !== cachedUrl'), 'P0-023 URL binding must remain intact');
const pdfMaintenance = section(sw, 'async function cleanupExpiredPdfCache() {', 'async function deleteCachedPdfByKey(key) {');
assert(pdfMaintenance.includes('MAINTENANCE_IDB_TX_TIMEOUT_MS'), 'PDF maintenance keeps its maintenance deadline domain');

// Offscreen already has an independent bounded IDB deadline path for
// reading retry-cache bytes during Blob creation/Yandex upload. P1-084
// must not regress or duplicate that subsystem.
assert(offscreen.includes('function timeoutIdbTransaction'));
assert(offscreen.includes('async function getPdfCacheRecord'));
assert(offscreen.includes('boundedIdbPhaseTimeout'));

const helperCode = section(sw, 'function runIndexedDbTransactionBounded', 'function openOperationLogDb');
const context = vm.createContext({ console, Promise, Error, Number, Math, String, Array, Object, setTimeout, clearTimeout });
vm.runInContext(`${helperCode}\nthis.runBoundedForTest = runIndexedDbTransactionBounded;`, context);

class HungTransaction {
  constructor() {
    this.oncomplete = null;
    this.onerror = null;
    this.onabort = null;
    this.error = null;
    this.aborted = false;
  }
  objectStore() { return {}; }
  abort() {
    if (this.aborted) return;
    this.aborted = true;
    queueMicrotask(() => this.onabort?.());
  }
}

(async () => {
let hungTx = null;
const hungDb = { transaction() { hungTx = new HungTransaction(); return hungTx; } };
let timeoutError = null;
try {
  await context.runBoundedForTest(hungDb, 'store', 'readonly', 'hung-test', () => {}, 20);
} catch (error) {
  timeoutError = error;
}
assert(timeoutError, 'hung transaction must reject');
assert.strictEqual(timeoutError.code, 'WEBCLIP_IDB_TIMEOUT');
assert.strictEqual(hungTx.aborted, true, 'deadline must abort the IndexedDB transaction');

let manualTx = null;
let settled = false;
const manualDb = { transaction() { manualTx = new HungTransaction(); return manualTx; } };
const pending = context.runBoundedForTest(
  manualDb,
  'store',
  'readonly',
  'readonly-completion-test',
  ({ setResult }) => setResult('staged-result'),
  1000
).then((value) => { settled = true; return value; });
await new Promise((resolve) => setTimeout(resolve, 20));
assert.strictEqual(settled, false, 'readonly result must not publish before tx.oncomplete');
manualTx.oncomplete();
assert.strictEqual(await pending, 'staged-result');

console.log('P1-081/P1-084 bounded IDB CRUD regression OK');
})().catch((error) => { console.error(error); process.exitCode = 1; });
