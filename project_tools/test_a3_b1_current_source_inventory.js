'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');

const worker = fs.readFileSync('service-worker.js', 'utf8');
const guard = fs.readFileSync('pdf-print-guard.js', 'utf8');

const red = [];
const positive = [];
function has(text, needle, label, bucket = positive) {
  assert(text.includes(needle), `${label}: expected current source marker not found: ${needle}`);
  bucket.push(label);
}
function lacks(text, needle, label, bucket = red) {
  assert(!text.includes(needle), `${label}: current source unexpectedly contains future marker: ${needle}`);
  bucket.push(label);
}

has(worker, "const PDF_CACHE_DB_VERSION = 3;", 'cache schema remains v3', red);
has(worker, 'return `tab:${tabId}`;', 'Yandex retry identity remains mutable tab alias', red);
has(worker, "tx.objectStore(PDF_CACHE_STORE).put(normalizedRecord)", 'sealed-object writer is still replace-capable payload put', red);
has(worker, "tx.objectStore(PDF_CACHE_META_STORE).put(metadata)", 'sealed-object writer is still replace-capable metadata put', red);
has(worker, "transferMode: 'ReturnAsStream'", 'current render uses CDP ReturnAsStream');
has(worker, "chrome.debugger.sendCommand(debuggee, 'IO.read'", 'current render reads CDP stream incrementally');
has(worker, 'const MAX_PDF_BYTES = 48 * 1024 * 1024;', 'current render has 48 MiB byte cap');
has(worker, "if (!totalBytes) throw new Error('Chrome вернул пустой PDF.')", 'current render rejects empty PDF');
has(worker, "return new Blob(parts, { type: 'application/pdf' });", 'current render materializes transient Blob before durable seal', red);
has(worker, 'let pdfBlob = await generatePdfBlob(tabId);', 'destination flows receive transient Blob before cache publication', red);
has(worker, 'key: pdfCacheKey(tabId), tabId, filename,', 'Yandex generation publishes under tab key', red);
has(worker, 'const temporaryCacheKey = `local-download:${operationId}`.slice(0, 240);', 'local destination has separate temporary key rather than shared sealed generation', red);
has(worker, 'await putCachedPdf({', 'current destination cache publication uses generic writer', red);
has(worker, 'blobUrl = await createPdfCacheBlobUrl(temporaryCacheKey);', 'local Blob URL is derived from temporary cache key', red);
has(worker, 'await deleteCachedPdfByKey(temporaryCacheKey).catch(() => {});', 'local cache object is removed after Blob URL creation', red);

lacks(worker, 'renderAttemptId', 'no explicit render attempt identity');
lacks(worker, 'pdfGenerationId', 'no explicit sealed PDF generation identity');
lacks(worker, 'pdfSha256', 'no PDF SHA-256 receipt field');
lacks(worker, 'sealed-v4', 'no sealed-v4 cache format');
lacks(worker, 'ownerPhysicalOperationId', 'cache record not bound to worker physical operation id');
lacks(worker, 'sourceGenerationReceipt', 'cache record lacks explicit source generation receipt');
lacks(worker, 'renderReceipt', 'no explicit render receipt object');
lacks(worker, 'bytes-accepted-transient', 'no explicit transient byte-acceptance state');
lacks(worker, 'duplicate-generation-conflict', 'no sealed-generation duplicate conflict state');

has(guard, "if (method !== 'Page.printToPDF') return rawSendCommand", 'P0-071 guard intercepts actual Page.printToPDF');
has(guard, "await rawSendCommand(debuggee, 'Emulation.setScriptExecutionDisabled', { value: true })", 'P0-071 freezes scripts at render cut');
has(guard, "await rawSendCommand(debuggee, 'IO.close', { handle: stream })", 'P0-071 closes returned stream if cleanup fails');
has(guard, "throw cleanupError;", 'P0-071 fails closed on cleanup failure');

assert(red.length >= 18, `expected substantial RED inventory, got ${red.length}`);
assert(positive.length >= 7, `expected positive controls, got ${positive.length}`);
console.log(`A3/B1 current-source inventory: PASS; RED facts=${red.length}; positive controls=${positive.length}`);
