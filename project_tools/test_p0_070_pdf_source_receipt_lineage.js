'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const swSource = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const guardSource = fs.readFileSync(path.join(ROOT, 'content-injection-guard.js'), 'utf8');
let checks = 0;

function ok(value, message) { checks += 1; assert(value, message); }
function eq(actual, expected, message) { checks += 1; assert.strictEqual(actual, expected, message); }
async function rejectsCode(fn, code, message) {
  checks += 1;
  await assert.rejects(fn, (error) => error?.code === code, message || code);
}
function section(source, start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error(`source section not found: ${start} -> ${end}`);
  return source.slice(a, b);
}

const helperSource = section(swSource, 'function sanitizePdfSourceReceipt', 'async function generatePdfAndDownload');
const activeReceipt = Object.freeze({
  operationId: 'op-source-1',
  tabId: 17,
  sourceDocumentId: 'document-A',
  sourceDocumentLifecycle: 'active',
  applicationGeneration: Object.freeze({ generation: 9, href: 'https://example.test/article' }),
  selectionRevision: 12,
  selectedCount: 3,
  confirmedSelectionRevision: 12,
  capturedAt: 123456
});

const context = vm.createContext({
  console,
  URL,
  Error,
  Number,
  Math,
  MAX_OPERATION_ID_CHARS: 240,
  MAX_IMPORTED_URL_CHARS: 16 * 1024,
  WebClipContentInjectionGuard: {
    getActiveWorkerSourceReceipt(_host, tabId) {
      return Number(tabId) === 17 ? activeReceipt : null;
    }
  }
});
context.globalThis = context;
vm.runInContext(`${helperSource}
this.sanitizeForTest = sanitizePdfSourceReceipt;
this.captureForTest = captureActivePdfSourceReceipt;`, context);

(async () => {
const captured = context.captureForTest(17, 'op-source-1');
eq(captured.schema, 'webclip-pdf-source-receipt/v1', 'source receipt schema exact');
eq(captured.operationId, 'op-source-1', 'operation identity preserved');
eq(captured.tabId, 17, 'tab identity preserved');
eq(captured.sourceDocumentId, 'document-A', 'browser document identity preserved');
eq(captured.sourceDocumentLifecycle, 'active', 'document lifecycle preserved as descriptive metadata');
eq(captured.applicationGeneration.generation, 9, 'application generation preserved separately');
eq(captured.applicationGeneration.href, 'https://example.test/article', 'application href normalized');
eq(captured.selectionRevision, 12, 'selection revision preserved');
eq(captured.selectedCount, 3, 'selection count preserved');
eq(captured.confirmedSelectionRevision, 12, 'confirmed revision preserved');
eq(captured.capturedAt, 123456, 'admission timestamp preserved');

const roundTrip = context.sanitizeForTest(captured);
eq(roundTrip.schema, captured.schema, 'stored receipt round-trips through sanitizer');
eq(roundTrip.sourceDocumentId, captured.sourceDocumentId, 'stored document identity round-trips');
eq(roundTrip.applicationGeneration.generation, 9, 'stored application generation round-trips');

eq(context.sanitizeForTest(null), null, 'legacy/missing stored receipt remains compatible');
eq(context.sanitizeForTest({ operationId: 'broken' }), null, 'invalid legacy stored receipt is ignored rather than promoted');
await rejectsCode(
  async () => context.sanitizeForTest(null, { tabId: 17, operationId: 'op-source-1', required: true }),
  'WEBCLIP_PDF_SOURCE_RECEIPT_REQUIRED',
  'new generated lineage requires an active receipt'
);
await rejectsCode(
  async () => context.sanitizeForTest(activeReceipt, { tabId: 17, operationId: 'op-other', required: true }),
  'WEBCLIP_PDF_SOURCE_OPERATION_CHANGED',
  'operation substitution fails closed'
);
await rejectsCode(
  async () => context.sanitizeForTest(activeReceipt, { tabId: 18, operationId: 'op-source-1', required: true }),
  'WEBCLIP_PDF_SOURCE_TAB_CHANGED',
  'tab substitution fails closed'
);
await rejectsCode(
  async () => context.captureForTest(18, 'op-source-1'),
  'WEBCLIP_PDF_SOURCE_RECEIPT_REQUIRED',
  'capture fails closed when no active admission exists'
);

ok(guardSource.includes('function getActiveWorkerSourceReceipt(host = globalThis, tabId)'), 'worker guard exposes the active admission receipt');
ok(guardSource.includes('getActiveWorkerSourceReceipt,'), 'active receipt API is exported');

ok(swSource.includes("const sourceReceipt = captureActivePdfSourceReceipt(tabId, operationId);"), 'fresh PDF paths capture lineage only after generation-bound execution');
ok(swSource.includes('sourceReceipt: sanitizePdfSourceReceipt(record.sourceReceipt)'), 'PDF cache metadata projects a bounded source receipt');
ok(swSource.includes('normalizedRecord.sourceReceipt = metadata.sourceReceipt;'), 'PDF cache bytes and metadata store the same normalized receipt');
ok(swSource.includes("sourceReceipt: sanitizePdfSourceReceipt(data.sourceReceipt),"), 'durable side-effect checkpoint normalization retains receipt');
ok(swSource.includes("const pendingData = { destination: 'download', filename, meta: { ...meta, tabId }, sourceReceipt };"), 'fresh local-download checkpoint carries source receipt');
ok(swSource.includes("const pendingData = { destination: 'download', filename: cached.filename, meta, sourceReceipt: cached.sourceReceipt };"), 'cached-download checkpoint carries stored source receipt');
ok(swSource.includes('sourceReceipt: cached.sourceReceipt,\n      meta'), 'remote-save checkpoint carries stored source receipt');

ok(swSource.includes('function pdfRetryIndexKey(tabId)'), 'P0-079 keeps tab identity only as retry discovery index');
ok(!swSource.includes('function pdfCacheKey(tabId)'), 'P0-079 removes mutable tab alias from PDF byte-object identity');
ok(swSource.includes('const cacheGeneration = issuePdfCacheGeneration();'), 'P0-070 source receipt composes with worker-issued P0-079 byte generation');
ok(swSource.includes('async function getValidCachedPdfForTab(tabId)'), 'P0-023 retry authority remains a separate existing function');
ok(!section(swSource, 'async function getValidCachedPdfForTab(tabId)', 'async function cleanupExpiredPdfCache').includes('sourceReceipt'), 'retry lookup does not pretend source receipt closes P0-023');
const journalEntrySection = section(swSource, 'async function appendJournalEntry(', 'async function getJournalEntryById');
ok(journalEntrySection.includes('sourceReceipt = null'), 'later P0-070 finalization may accept additive Journal source provenance');
ok(journalEntrySection.includes("...(journalSourceReceipt ? { sourceReceipt: journalSourceReceipt } : {})"), 'Journal provenance remains optional and operation-bound');

console.log(`P0-070 PDF source receipt lineage: PASS; checks=${checks}; p0_079_generation_composed=true; retry_authority_unchanged=true; journal_schema_additive=true`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
