'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');

let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }
function eq(actual, expected, message) { assert.equal(actual, expected, message); checks += 1; }

function section(source, start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error('section not found: ' + start + ' -> ' + end);
  return source.slice(a, b);
}

function functionSource(source, name) {
  const marker = 'function ' + name + '(';
  const start = source.indexOf(marker);
  if (start < 0) throw new Error('function not found: ' + name);
  const paramsStart = source.indexOf('(', start);
  let parens = 0;
  let paramsEnd = -1;
  for (let i = paramsStart; i < source.length; i += 1) {
    if (source[i] === '(') parens += 1;
    else if (source[i] === ')') {
      parens -= 1;
      if (parens === 0) { paramsEnd = i; break; }
    }
  }
  if (paramsEnd < 0) throw new Error('parameter boundary not found: ' + name);
  const bodyStart = source.indexOf('{', paramsEnd);
  if (bodyStart < 0) throw new Error('body not found: ' + name);
  let depth = 0;
  for (let i = bodyStart; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error('function boundary not found: ' + name);
}

const messageSection = section(
  worker,
  "case 'WEBCLIP_RETRY_PDF_TO_YANDEX':",
  "case 'WEBCLIP_INVALIDATE_PDF_CACHE':"
);
ok(messageSection.includes('captureCurrentPdfRetrySourceReceipt(sender)'), 'live retry/download capture current exact source receipt from MessageSender');
ok(messageSection.includes('retryCachedPdfUploadToYandex(tabId, normalizeOperationIdInput(message.operationId), currentSourceReceipt)'), 'remote retry receives explicit current source receipt separately from textual operationId');
ok(messageSection.includes('downloadCachedPdf(tabId, normalizeOperationIdInput(message.operationId), currentSourceReceipt)'), 'cached download receives explicit current source receipt separately from textual operationId');

const probeSource = functionSource(worker, 'currentPdfRetrySourceProbe');
const normalizeCurrentSource = functionSource(worker, 'normalizeCurrentPdfRetrySourceReceipt');
const captureSource = functionSource(worker, 'captureCurrentPdfRetrySourceReceipt');
const sanitizeSource = functionSource(worker, 'sanitizePdfSourceReceipt');
const matcherSource = functionSource(worker, 'liveRetrySourceReceiptMatches');

ok(probeSource.includes('WebClipApplicationGeneration?.admitSelection?.()'), 'current live receipt consumes P0-080 application/selection authority');
ok(captureSource.includes("target: { tabId, documentIds: [sourceDocumentId] }"), 'probe targets exact browser documentId rather than tab/frame/url only');
ok(captureSource.includes("world: 'ISOLATED'"), 'probe runs in the isolated world that owns application-generation state');
ok(captureSource.includes('withOperationTimeout('), 'exact live-source probe is bounded');
ok(captureSource.includes('SCRIPT_EXECUTION_TIMEOUT_MS'), 'probe uses the canonical scripting timeout');
ok(!captureSource.includes('executeScriptSingletonBounded('), 'live authority probe never consumes a cached late-success injection result');
ok(captureSource.includes("frameId !== 0"), 'subframe caller cannot claim top-document retry authority');
ok(captureSource.includes("WEBCLIP_RETRY_SOURCE_DOCUMENT_REQUIRED"), 'missing browser documentId fails closed');
ok(captureSource.includes("WEBCLIP_RETRY_SOURCE_DOCUMENT_CHANGED"), 'unavailable/replaced exact document fails closed');
ok(normalizeCurrentSource.includes("schema: 'webclip-pdf-live-retry-source/v1'"), 'live source receipt has a distinct schema from durable PDF provenance');
ok(!normalizeCurrentSource.includes('operationId'), 'live source receipt does not turn caller textual operationId into an ownership capability');
ok(!matcherSource.includes('operationId'), 'source matching does not compare retry textual operationId against owning save operation metadata');

const ctx = vm.createContext({
  Number,
  String,
  Boolean,
  Math,
  Object,
  Error,
  URL,
  MAX_OPERATION_ID_CHARS: 240,
  MAX_IMPORTED_URL_CHARS: 32768
});
vm.runInContext(
  sanitizeSource + '\n' +
  normalizeCurrentSource + '\n' +
  matcherSource + '\n' +
  'this.api = { sanitizePdfSourceReceipt, normalizeCurrentPdfRetrySourceReceipt, liveRetrySourceReceiptMatches };',
  ctx
);
const api = ctx.api;

const cached = Object.freeze({
  schema: 'webclip-pdf-source-receipt/v1',
  operationId: 'save-op-A',
  tabId: 7,
  sourceDocumentId: 'doc-A',
  sourceDocumentLifecycle: 'active',
  applicationGeneration: Object.freeze({ generation: 4, href: 'https://example.test/app' }),
  selectionRevision: 9,
  selectedCount: 2,
  confirmedSelectionRevision: 9,
  capturedAt: 100
});
const current = api.normalizeCurrentPdfRetrySourceReceipt({
  applicationGeneration: { generation: 4, href: 'https://example.test/app' },
  selectionRevision: 9,
  selectedCount: 2
}, { tabId: 7, sourceDocumentId: 'doc-A' });

eq(current.schema, 'webclip-pdf-live-retry-source/v1', 'current authority remains a live-source receipt');
eq(current.sourceDocumentId, 'doc-A', 'current live receipt keeps browser documentId as its own dimension');
eq(current.applicationGeneration.generation, 4, 'application generation remains separate from browser documentId');
eq(api.liveRetrySourceReceiptMatches(cached, current), true, 'same exact document/application/selection authority admits retry');

const preserved = api.sanitizePdfSourceReceipt(cached, { tabId: 7, required: true });
eq(preserved.schema, 'webclip-pdf-source-receipt/v1', 'cached provenance is normalized through the immutable P0-070 source-receipt schema');
eq(preserved.operationId, 'save-op-A', 'owning save operation provenance is preserved rather than rewritten to the retry caller');

eq(api.liveRetrySourceReceiptMatches(cached, { ...current, sourceDocumentId: 'doc-B' }), false, 'same URL with replacement browser documentId is rejected');
eq(api.liveRetrySourceReceiptMatches(cached, {
  ...current,
  applicationGeneration: { generation: 5, href: current.applicationGeneration.href }
}), false, 'same browser document with newer application generation is rejected');
eq(api.liveRetrySourceReceiptMatches(cached, {
  ...current,
  applicationGeneration: { generation: 4, href: 'https://example.test/other' }
}), false, 'same generation number with different application href is rejected');
eq(api.liveRetrySourceReceiptMatches(cached, { ...current, selectionRevision: 10 }), false, 'different selection revision is rejected independently');
eq(api.liveRetrySourceReceiptMatches(cached, { ...current, selectedCount: 3 }), false, 'different selected-count receipt is rejected independently');
eq(api.liveRetrySourceReceiptMatches(cached, { ...current, tabId: 8 }), false, 'unrelated tab cannot claim the cached source receipt');
eq(api.liveRetrySourceReceiptMatches(null, current), false, 'missing/legacy source receipt is never elevated to exact retry authority');
eq(api.liveRetrySourceReceiptMatches({ ...cached, sourceDocumentId: '' }, current), false, 'incomplete source lineage fails closed');

const liveProbeCtx = vm.createContext({
  globalThis: null,
  Number,
  String,
  Math,
  Object,
  Error
});
liveProbeCtx.globalThis = liveProbeCtx;
liveProbeCtx.WebClipApplicationGeneration = {
  admitSelection() {
    return {
      ok: true,
      receipt: {
        applicationGeneration: { generation: 4, href: 'https://example.test/app' },
        selectionRevision: 9,
        selectedCount: 2
      }
    };
  }
};
vm.runInContext(probeSource + '\nthis.runProbe = currentPdfRetrySourceProbe;', liveProbeCtx);
const probeResult = liveProbeCtx.runProbe();
eq(probeResult.ok, true, 'application-generation probe admits current selection');
eq(probeResult.receipt.applicationGeneration.generation, 4, 'probe returns the current application generation');
liveProbeCtx.WebClipApplicationGeneration.admitSelection = () => ({
  ok: false,
  code: 'WEBCLIP_SELECTION_STALE_GENERATION',
  reason: 'stale'
});
eq(liveProbeCtx.runProbe().ok, false, 'stale P0-080 selection authority fails closed before cache lookup');

const lookup = section(
  worker,
  'async function getValidCachedPdfForTab(tabId, currentSourceReceipt)',
  'async function cleanupExpiredPdfCache'
);
ok(lookup.indexOf('getPdfRetryIndexForTab(tabId)') < lookup.indexOf('getCachedPdfMetadataByKey(pointer.cacheKey)'), 'tab pointer is discovery state resolved to exact sealed metadata');
ok(lookup.indexOf('getCachedPdfMetadataByKey(pointer.cacheKey)') < lookup.indexOf('liveRetrySourceReceiptMatches(cached.sourceReceipt, currentSourceReceipt)'), 'exact immutable source receipt is read before live authority comparison');
ok(!lookup.includes('getCachedPdfByKey(pointer.cacheKey)'), 'live admission does not dereference PDF payload bytes during discovery');
const mismatchStart = lookup.indexOf('if (!liveRetrySourceReceiptMatches(cached.sourceReceipt, currentSourceReceipt))');
const mismatchEnd = lookup.indexOf('let currentUrl', mismatchStart);
const mismatchBlock = lookup.slice(mismatchStart, mismatchEnd);
ok(mismatchBlock.includes('clearPdfRetryIndexIfMatches(tabId, pointer.cacheKey, pointer.cacheGeneration)'), 'stale live source clears only the compare-matching discovery pointer');
ok(!mismatchBlock.includes('deleteCachedPdfGeneration'), 'stale live source does not delete the operation-owned sealed generation');
ok(!mismatchBlock.includes('deleteCachedPdfByKey'), 'stale live source cannot delete an unrelated sealed byte object');

const retry = section(worker, 'async function retryCachedPdfUploadToYandex', 'async function uploadCachedRecordToYandex');
ok(retry.indexOf('getValidCachedPdfForTab(tabId, currentSourceReceipt)') < retry.indexOf('uploadCachedRecordToYandex(cached'), 'remote retry admission precedes exact byte upload');
ok(!retry.includes('generatePdfBlob('), 'manual retry reuses exact P0-079 bytes and does not render a new PDF');
ok(!retry.includes('printToPDF'), 'manual retry path does not invoke a new printToPDF');

const download = section(worker, 'async function downloadCachedPdf', 'function normalizeJournalUrl');
ok(download.indexOf('getValidCachedPdfForTab(tabId, currentSourceReceipt)') < download.indexOf('createPdfCacheBlobUrl(cached.key)'), 'cached download admission precedes payload Blob dereference');

console.log('P0-023 exact live retry source admission: PASS; checks=' + checks + '; documentId=true; application_generation=true; retry_pointer=discovery_only; sealed_generation_preserved=true; release_closed=false');
