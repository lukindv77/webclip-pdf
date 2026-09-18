'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const offscreen = fs.readFileSync(path.join(ROOT, 'offscreen.js'), 'utf8');
let checks = 0;
function ok(value, message) { checks += 1; assert(value, message); }
function eq(actual, expected, message) { checks += 1; assert.strictEqual(actual, expected, message); }

function section(source, start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error(`section not found: ${start} -> ${end}`);
  return source.slice(a, b);
}

function functionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`function not found: ${name}`);
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
  if (paramsEnd < 0) throw new Error(`parameter boundary not found: ${name}`);
  const bodyStart = source.indexOf('{', paramsEnd);
  if (bodyStart < 0) throw new Error(`body not found: ${name}`);
  let depth = 0;
  for (let i = bodyStart; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`function boundary not found: ${name}`);
}

ok(worker.includes("const PDF_CACHE_RETRY_INDEX_STORE = 'retryIndex';"), 'worker owns a separate retry index store');
ok(worker.includes('const PDF_CACHE_DB_VERSION = 4;'), 'worker cache DB version is v4');
ok(offscreen.includes("const PDF_CACHE_RETRY_INDEX_STORE = 'retryIndex';"), 'offscreen opens the same v4 topology');
ok(offscreen.includes('const PDF_CACHE_DB_VERSION = 4;'), 'offscreen cache DB version matches worker');
ok(!worker.includes('function pdfCacheKey(tabId)'), 'tab alias is no longer byte-object identity');

const issueSource = functionSource(worker, 'issuePdfCacheGeneration');
const identitySource = functionSource(worker, 'isExactSealedPdfCacheIdentity');
const retryKeySource = functionSource(worker, 'pdfRetryIndexKey');
const pointerSource = functionSource(worker, 'normalizePdfRetryIndexPointer');
const ctx = vm.createContext({
  Number,
  String,
  Boolean,
  Math,
  Object,
  Error,
  crypto: { randomUUID: () => '11111111-2222-4333-8444-555555555555' }
});
vm.runInContext(`${retryKeySource}
${issueSource}
${identitySource}
${pointerSource}
this.api = { pdfRetryIndexKey, issuePdfCacheGeneration, isExactSealedPdfCacheIdentity, normalizePdfRetryIndexPointer };`, ctx);
const api = ctx.api;

eq(api.pdfRetryIndexKey(7), 'tab:7', 'tab identity remains index-only');
const issued = api.issuePdfCacheGeneration();
eq(issued.generation, '11111111-2222-4333-8444-555555555555', 'generation is worker-issued UUID');
eq(issued.key, 'pdf:11111111-2222-4333-8444-555555555555', 'byte object uses immutable generation key');
ok(api.isExactSealedPdfCacheIdentity({ key: issued.key, cacheGeneration: issued.generation, sealed: true }), 'exact sealed identity accepted');
ok(!api.isExactSealedPdfCacheIdentity({ key: 'tab:7', cacheGeneration: issued.generation, sealed: true }), 'tab alias cannot masquerade as sealed generation');
ok(!api.isExactSealedPdfCacheIdentity({ key: issued.key, cacheGeneration: issued.generation, sealed: false }), 'unsealed generation rejected');

const pointer = api.normalizePdfRetryIndexPointer({
  key: 'tab:7',
  tabId: 7,
  cacheKey: issued.key,
  cacheGeneration: issued.generation,
  createdAt: 123
});
eq(pointer.cacheKey, issued.key, 'retry index points to exact generation');
eq(pointer.cacheGeneration, issued.generation, 'retry index carries exact generation');
eq(api.normalizePdfRetryIndexPointer({
  key: 'tab:7',
  tabId: 7,
  cacheKey: 'pdf:other',
  cacheGeneration: issued.generation
}), null, 'pointer key/generation mismatch rejected');

const putSection = section(worker, 'async function putCachedPdf(record)', 'async function getCachedPdfByKey');
ok(putSection.includes('wantsSealedGeneration ? pdfStore.add(normalizedRecord) : pdfStore.put(normalizedRecord)'), 'sealed payload uses create-once add');
ok(putSection.includes('wantsSealedGeneration ? metaStore.add(metadata) : metaStore.put(metadata)'), 'sealed metadata uses create-once add');
ok(putSection.includes("request.error?.name === 'ConstraintError'"), 'duplicate immutable generation fails closed');
ok(putSection.includes("WEBCLIP_PDF_CACHE_GENERATION_EXISTS"), 'duplicate generation has explicit failure code');

const lookupSection = section(worker, 'async function getValidCachedPdfForTab(tabId, currentSourceReceipt)', 'async function cleanupExpiredPdfCache');
ok(lookupSection.includes('const pointer = await getPdfRetryIndexForTab(tabId);'), 'live retry lookup resolves index first');
ok(lookupSection.includes('const cached = await getCachedPdfMetadataByKey(pointer.cacheKey);'), 'retry lookup reads exact pointed generation');
ok(lookupSection.includes('clearPdfRetryIndexIfMatches(tabId, pointer.cacheKey, pointer.cacheGeneration)'), 'source/index mismatch clears only exact pointer');
ok(!lookupSection.includes('deleteCachedPdfByKey(pointer.cacheKey)'), 'source mismatch does not destroy operation-owned bytes');

const ttlCleanup = section(worker, 'async function cleanupExpiredPdfCache', 'async function deleteCachedPdfByKey');
ok(ttlCleanup.indexOf('await getPendingRemotePdfCacheRetentionSnapshot()') < ttlCleanup.indexOf('await openPdfCacheDb()'), 'TTL cleanup reads durable remote retention authority before delete transaction');
ok(ttlCleanup.includes('pdfCacheGenerationMatchesRemoteRetention(stale, retentionSnapshot)'), 'TTL cleanup preserves exact admitted remote generation');
ok(ttlCleanup.includes('Number(stale.createdAt || 0) < cutoff && !protectedByRemoteCheckpoint'), 'TTL deletes only unprotected expired generations');

const generationDelete = section(worker, 'async function deleteCachedPdfGeneration(record)', 'function withOperationTimeout');
ok(generationDelete.includes('String(current.cacheGeneration || \'\') !== generation'), 'cleanup revalidates exact stored generation');
ok(generationDelete.includes('pointer.cacheKey === cacheKey && pointer.cacheGeneration === generation'), 'cleanup CAS-checks retry pointer');
ok(generationDelete.includes('pdfStore.delete(cacheKey)'), 'cleanup deletes exact byte key');
ok(generationDelete.includes('metaStore.delete(cacheKey)'), 'cleanup deletes exact metadata key');

const freshSection = section(worker, 'async function generatePdfAndUploadToYandex', 'async function retryCachedPdfUploadToYandex');
ok(freshSection.includes('const cacheGeneration = issuePdfCacheGeneration();'), 'fresh Yandex PDF gets worker-issued generation');
ok(freshSection.includes('sealed: true, tabId, filename'), 'fresh Yandex PDF generation is sealed');
ok(freshSection.includes('await publishPdfRetryIndex(tabId, cachedMetadata);'), 'retry pointer publishes only after sealed cache commit');
ok(freshSection.indexOf('await putCachedPdf(cached);') < freshSection.indexOf('await publishPdfRetryIndex(tabId, cachedMetadata);'), 'generation commits before pointer publication');
ok(freshSection.includes('await deleteCachedPdfGeneration(cached)'), 'fresh completion cleans exact generation, not tab alias');

const retrySection = section(worker, 'async function retryCachedPdfUploadToYandex', 'async function uploadCachedRecordToYandex');
ok(retrySection.includes('await deleteCachedPdfGeneration(cached)'), 'retry completion cleans exact consumed generation');

const uploadSection = section(worker, 'async function uploadCachedRecordToYandex', 'async function downloadCachedPdf');
ok(uploadSection.includes('if (!isExactSealedPdfCacheIdentity(cached))'), 'remote upload requires sealed exact generation');
ok(uploadSection.includes("pdfCacheKey: String(cached.key || '')"), 'offscreen receives exact immutable key with no tab fallback');
ok(uploadSection.includes("pdfCacheGeneration: String(cached.cacheGeneration || '')"), 'offscreen receives exact generation receipt');
ok(uploadSection.includes('expectedPdfBytes,'), 'offscreen receipt binds expected byte size');
ok(!uploadSection.includes('pdfCacheKey(tabId)'), 'remote upload cannot silently fall back to mutable tab alias');
ok(uploadSection.includes("pdfCacheKey: String(cached.key || '')"), 'durable remote checkpoint links exact local cache key');
ok(uploadSection.includes("pdfCacheGeneration: String(cached.cacheGeneration || '')"), 'durable remote checkpoint links exact local cache generation');
ok(uploadSection.indexOf('markPendingRemoteSaveAdmitted(remoteCheckpoint.id)') < uploadSection.indexOf('runOffscreenSignedTransfer({'), 'admitted-unknown checkpoint commits before signed transfer');

const transportSection = section(worker, 'async function runOffscreenSignedTransfer', 'async function ensureYandexFolderTree');
ok(transportSection.includes("pdfCacheGeneration: String(spec.pdfCacheGeneration || '')"), 'worker transport preserves cache generation');
ok(transportSection.includes('expectedPdfBytes: Math.max(0, Number(spec.expectedPdfBytes) || 0)'), 'worker transport preserves expected byte size');

const lifecycleSection = section(worker, 'chrome.tabs.onRemoved.addListener', 'chrome.runtime.onInstalled.addListener');
eq((lifecycleSection.match(/invalidatePdfRetryForTab\(tabId\)/g) || []).length, 2, 'tab lifecycle invalidates only retry discovery pointers');
ok(!lifecycleSection.includes('deleteCachedPdfByKey'), 'tab lifecycle does not delete sealed byte generations');

const offscreenReader = section(offscreen, 'function isExactSealedPdfCacheRecord', 'async function openTransferDb');
ok(offscreenReader.includes("cacheKey === `pdf:${cacheGeneration}`"), 'offscreen receipt requires exact generation key');
ok(offscreenReader.includes("db.transaction([PDF_CACHE_STORE, PDF_CACHE_META_STORE], 'readonly')"), 'offscreen reads payload and metadata in one transaction');
ok(offscreenReader.includes('record.sealed === true'), 'offscreen validates sealed payload/metadata');
ok(offscreenReader.includes('Math.max(0, Number(record.pdfByteLength) || 0) === byteLength'), 'offscreen validates stored expected byte size');
ok(offscreenReader.includes('blob.size !== byteLength'), 'offscreen validates materialized Blob size before fetch');

const signedTransfer = section(offscreen, 'async function handleSignedTransfer', 'function openDbBounded');
ok(signedTransfer.includes('await getExactSealedPdfCacheRecord('), 'pdf-cache-upload uses exact sealed reader');
ok(signedTransfer.includes("String(spec.pdfCacheGeneration || '')"), 'offscreen upload consumes generation receipt');
ok(signedTransfer.includes('Number(spec.expectedPdfBytes || 0)'), 'offscreen upload consumes expected byte size');
ok(!signedTransfer.includes('getPdfCacheRecord(String(spec.pdfCacheKey'), 'legacy key-only dereference removed from upload');

console.log(`P0-079 operation-owned PDF cache production: PASS; checks=${checks}; db=v4; sealed_add=true; retry_index=true; offscreen_exact=true; p0_023_live_source_admission=true; nonterminal_remote_retention=true`);
