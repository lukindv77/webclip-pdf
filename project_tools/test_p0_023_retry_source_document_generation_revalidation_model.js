'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');

let checks = 0;
function check(value, label) { assert.ok(value, label); checks += 1; }
function equal(actual, expected, label) { assert.equal(actual, expected, label); checks += 1; }
function throwsCode(fn, code, label) {
  let error = null;
  try { fn(); } catch (err) { error = err; }
  check(Boolean(error), `${label}: expected throw`);
  equal(error.code, code, `${label}: error code`);
}
function digest(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function buf(value) { return Buffer.from(value, 'utf8'); }

// P0-023 research model.
// Current WebClip retry admission is modeled as tab-scoped cache + TTL + URL equality.
// It intentionally does NOT model P0-079 byte-generation isolation as solved; separate
// candidate controls below show how the owners compose without merging them.
class CurrentRetryCache {
  constructor(ttlMs = 24 * 60 * 60 * 1000) {
    this.rows = new Map();
    this.ttlMs = ttlMs;
  }
  key(tabId) { return `tab:${tabId}`; }
  put({ tabId, sourceUrl, bytes, createdAt = 1 }) {
    const row = {
      key: this.key(tabId),
      tabId,
      sourceUrl,
      bytes: Buffer.from(bytes),
      createdAt,
      byteLength: bytes.length,
    };
    this.rows.set(row.key, row);
    return { ...row, bytes: undefined };
  }
  getValid({ tabId, currentUrl, now }) {
    const row = this.rows.get(this.key(tabId));
    if (!row) return null;
    if (!row.createdAt || now - row.createdAt > this.ttlMs) {
      this.rows.delete(row.key);
      return null;
    }
    if (!currentUrl || !row.sourceUrl || currentUrl !== row.sourceUrl) {
      this.rows.delete(row.key);
      return null;
    }
    return { ...row, bytes: Buffer.from(row.bytes) };
  }
}

// Candidate acceptance shape for P0-023. The source-document receipt is created by
// the P0-070 admission/print lineage and stored alongside immutable operation-owned
// bytes (P0-079). P0-023 owns only the exact browser-document retry fence.
class SourceDocumentRetryCache {
  constructor() {
    this.rows = new Map();
    this.recovery = new Map();
  }
  key(operationId, cacheGeneration) { return `pdf:${operationId}:${cacheGeneration}`; }
  put({ operationId, cacheGeneration, tabId, sourceDocumentId, sourceUrl, appGeneration, bytes }) {
    if (!sourceDocumentId) throw Object.assign(new Error('source document missing'), { code: 'SOURCE_DOCUMENT_REQUIRED' });
    const key = this.key(operationId, cacheGeneration);
    const row = {
      key, operationId, cacheGeneration, tabId, sourceDocumentId, sourceUrl,
      appGeneration, bytes: Buffer.from(bytes), byteLength: bytes.length,
      digest: digest(bytes), phase: 'retryable',
    };
    this.rows.set(key, row);
    this.recovery.set(operationId, {
      operationId, cacheKey: key, cacheGeneration, sourceDocumentId, sourceUrl,
      appGeneration, byteLength: row.byteLength, digest: row.digest, phase: 'retryable',
    });
    return { ...this.recovery.get(operationId) };
  }
  currentPageRetry(receipt, current) {
    const row = this.rows.get(receipt.cacheKey);
    if (!row) throw Object.assign(new Error('cache missing'), { code: 'CACHE_MISSING' });
    if (row.operationId !== receipt.operationId || row.cacheGeneration !== receipt.cacheGeneration) {
      throw Object.assign(new Error('cache owner mismatch'), { code: 'CACHE_OWNER_MISMATCH' });
    }
    if (!current || current.tabId !== row.tabId) {
      throw Object.assign(new Error('tab mismatch'), { code: 'SOURCE_TAB_MISMATCH' });
    }
    // P0-023 exact browser-document gate: URL/frame/tab equality cannot substitute.
    if (!current.documentId || current.documentId !== row.sourceDocumentId) {
      throw Object.assign(new Error('source document mismatch'), { code: 'SOURCE_DOCUMENT_MISMATCH' });
    }
    if (digest(row.bytes) !== row.digest || row.byteLength !== row.bytes.length) {
      throw Object.assign(new Error('byte identity mismatch'), { code: 'CACHE_CONTENT_MISMATCH' });
    }
    return Buffer.from(row.bytes);
  }
  // This is deliberately a separate P0-080 composition check. A same-document SPA
  // route/DOM generation may change without changing Chrome documentId.
  applicationGenerationFence(receipt, current) {
    if (current.appGeneration !== receipt.appGeneration) {
      throw Object.assign(new Error('application generation mismatch'), { code: 'APPLICATION_GENERATION_MISMATCH' });
    }
    return true;
  }
  // Recovery from a durable operation receipt is not a "current page" retry. It may
  // continue after the source tab/document has closed, provided the immutable byte
  // receipt and operation context remain exact. This prevents an over-broad P0-023 fix
  // from destroying P0-072/P0-073/P0-074/P0-079 recovery semantics.
  recoverOperation(receipt) {
    const durable = this.recovery.get(receipt.operationId);
    if (!durable || durable.cacheKey !== receipt.cacheKey || durable.cacheGeneration !== receipt.cacheGeneration) {
      throw Object.assign(new Error('recovery receipt mismatch'), { code: 'RECOVERY_RECEIPT_MISMATCH' });
    }
    const row = this.rows.get(durable.cacheKey);
    if (!row) throw Object.assign(new Error('cache missing'), { code: 'CACHE_MISSING' });
    if (row.sourceDocumentId !== durable.sourceDocumentId || digest(row.bytes) !== durable.digest) {
      throw Object.assign(new Error('recovery lineage mismatch'), { code: 'RECOVERY_LINEAGE_MISMATCH' });
    }
    return Buffer.from(row.bytes);
  }
}

const url = 'https://example.test/article?id=42';
const pdfA = buf('PDF-A-source-document');
const pdfB = buf('PDF-B-source-document');

// --- Current-source failure: same URL, same tab, different browser document. ---
{
  const cache = new CurrentRetryCache();
  cache.put({ tabId: 7, sourceUrl: url, bytes: pdfA, createdAt: 100 });
  const retry = cache.getValid({ tabId: 7, currentUrl: url, now: 200 });
  check(Boolean(retry), 'current cache accepts same URL after reload');
  equal(retry.sourceUrl, url, 'current retry sees same URL');
  equal(digest(retry.bytes), digest(pdfA), 'current retry reuses A bytes');
  // Browser document A -> B is intentionally absent from current admission state.
  const sourceDocumentA = 'doc-A';
  const currentDocumentB = 'doc-B';
  check(sourceDocumentA !== currentDocumentB, 'fixture is a real document replacement');
  check(Boolean(retry), 'document mismatch cannot affect current URL-only decision');
}

// Same-URL reload can happen repeatedly and URL ABA does not restore document identity.
{
  const cache = new CurrentRetryCache();
  cache.put({ tabId: 7, sourceUrl: url, bytes: pdfA, createdAt: 100 });
  const docs = ['doc-B', 'doc-C', 'doc-D'];
  for (const documentId of docs) {
    const retry = cache.getValid({ tabId: 7, currentUrl: url, now: 300 });
    check(Boolean(retry), `current URL-only cache accepts replacement ${documentId}`);
  }
}

// Useful current negative controls: different URL, different tab and TTL expiry fail.
{
  const cache = new CurrentRetryCache(1000);
  cache.put({ tabId: 7, sourceUrl: url, bytes: pdfA, createdAt: 100 });
  equal(cache.getValid({ tabId: 7, currentUrl: 'https://example.test/other', now: 200 }), null, 'different URL rejected');
  cache.put({ tabId: 7, sourceUrl: url, bytes: pdfA, createdAt: 100 });
  equal(cache.getValid({ tabId: 8, currentUrl: url, now: 200 }), null, 'different tab has no row');
  equal(cache.getValid({ tabId: 7, currentUrl: url, now: 1201 }), null, 'expired cache rejected');
}

// URL identity is insufficient even when title/origin/frameId also happen to match.
{
  const oldPage = { tabId: 7, frameId: 0, documentId: 'doc-A', url, title: 'Article' };
  const newPage = { tabId: 7, frameId: 0, documentId: 'doc-B', url, title: 'Article' };
  equal(oldPage.tabId, newPage.tabId, 'tab id survives replacement');
  equal(oldPage.frameId, newPage.frameId, 'top frame id survives replacement');
  equal(oldPage.url, newPage.url, 'URL can survive replacement');
  equal(oldPage.title, newPage.title, 'title can survive replacement');
  check(oldPage.documentId !== newPage.documentId, 'documentId distinguishes replacement');
}

// --- Candidate P0-023 acceptance: exact source document receipt. ---
{
  const cache = new SourceDocumentRetryCache();
  const receipt = cache.put({
    operationId: 'op-A', cacheGeneration: 11, tabId: 7,
    sourceDocumentId: 'doc-A', sourceUrl: url, appGeneration: 4, bytes: pdfA,
  });
  equal(receipt.sourceDocumentId, 'doc-A', 'receipt carries exact source document');
  equal(receipt.cacheGeneration, 11, 'receipt carries immutable cache generation');
  equal(receipt.digest, digest(pdfA), 'receipt carries byte digest');
  const bytes = cache.currentPageRetry(receipt, { tabId: 7, documentId: 'doc-A', url, appGeneration: 4 });
  equal(digest(bytes), digest(pdfA), 'same exact document may retry exact bytes');
}

// Same URL reload is rejected by P0-023 even though every coarse identifier matches.
{
  const cache = new SourceDocumentRetryCache();
  const receipt = cache.put({ operationId: 'op-A', cacheGeneration: 1, tabId: 7, sourceDocumentId: 'doc-A', sourceUrl: url, appGeneration: 1, bytes: pdfA });
  throwsCode(
    () => cache.currentPageRetry(receipt, { tabId: 7, frameId: 0, documentId: 'doc-B', url, appGeneration: 1 }),
    'SOURCE_DOCUMENT_MISMATCH',
    'same-URL reload B cannot authorize A retry'
  );
}

// URL ABA A -> other -> same URL with a new document still fails exact source identity.
{
  const cache = new SourceDocumentRetryCache();
  const receipt = cache.put({ operationId: 'op-A', cacheGeneration: 2, tabId: 7, sourceDocumentId: 'doc-A', sourceUrl: url, appGeneration: 1, bytes: pdfA });
  throwsCode(
    () => cache.currentPageRetry(receipt, { tabId: 7, documentId: 'doc-C', url, appGeneration: 1 }),
    'SOURCE_DOCUMENT_MISMATCH',
    'URL ABA does not restore source document authority'
  );
}

// Missing source-document lineage is fail-closed; legacy URL-only records are not silently elevated.
{
  const cache = new SourceDocumentRetryCache();
  throwsCode(
    () => cache.put({ operationId: 'legacy', cacheGeneration: 1, tabId: 7, sourceDocumentId: '', sourceUrl: url, appGeneration: 1, bytes: pdfA }),
    'SOURCE_DOCUMENT_REQUIRED',
    'legacy cache without source document receipt'
  );
}

// Tab identity remains required but is not sufficient.
{
  const cache = new SourceDocumentRetryCache();
  const receipt = cache.put({ operationId: 'op-A', cacheGeneration: 3, tabId: 7, sourceDocumentId: 'doc-A', sourceUrl: url, appGeneration: 1, bytes: pdfA });
  throwsCode(
    () => cache.currentPageRetry(receipt, { tabId: 8, documentId: 'doc-A', url, appGeneration: 1 }),
    'SOURCE_TAB_MISMATCH',
    'same document token cannot be rebound to another tab context'
  );
}

// P0-023 and P0-080 remain separate: browser document can match while SPA generation changed.
{
  const cache = new SourceDocumentRetryCache();
  const receipt = cache.put({ operationId: 'op-A', cacheGeneration: 4, tabId: 7, sourceDocumentId: 'doc-A', sourceUrl: url, appGeneration: 10, bytes: pdfA });
  const current = { tabId: 7, documentId: 'doc-A', url: 'https://example.test/article?id=43', appGeneration: 11 };
  equal(digest(cache.currentPageRetry(receipt, current)), digest(pdfA), 'P0-023 browser-document gate alone still matches same document');
  throwsCode(() => cache.applicationGenerationFence(receipt, current), 'APPLICATION_GENERATION_MISMATCH', 'P0-080 rejects newer SPA generation');
}

// Conversely, matching app-generation numbers cannot override a different browser document.
{
  const cache = new SourceDocumentRetryCache();
  const receipt = cache.put({ operationId: 'op-A', cacheGeneration: 5, tabId: 7, sourceDocumentId: 'doc-A', sourceUrl: url, appGeneration: 12, bytes: pdfA });
  throwsCode(
    () => cache.currentPageRetry(receipt, { tabId: 7, documentId: 'doc-B', url, appGeneration: 12 }),
    'SOURCE_DOCUMENT_MISMATCH',
    'application generation coincidence cannot override P0-023'
  );
}

// P0-079 composition: same document receipt does not authorize foreign cache generation/content.
{
  const cache = new SourceDocumentRetryCache();
  const receiptA = cache.put({ operationId: 'op-A', cacheGeneration: 6, tabId: 7, sourceDocumentId: 'doc-A', sourceUrl: url, appGeneration: 1, bytes: pdfA });
  const receiptB = cache.put({ operationId: 'op-B', cacheGeneration: 7, tabId: 7, sourceDocumentId: 'doc-A', sourceUrl: url, appGeneration: 1, bytes: pdfB });
  check(receiptA.cacheKey !== receiptB.cacheKey, 'P0-079 generations are distinct');
  equal(digest(cache.currentPageRetry(receiptA, { tabId: 7, documentId: 'doc-A', url, appGeneration: 1 })), digest(pdfA), 'A receipt resolves A bytes');
  equal(digest(cache.currentPageRetry(receiptB, { tabId: 7, documentId: 'doc-A', url, appGeneration: 1 })), digest(pdfB), 'B receipt resolves B bytes');
  const forged = { ...receiptA, cacheKey: receiptB.cacheKey, cacheGeneration: receiptB.cacheGeneration };
  throwsCode(() => cache.currentPageRetry(forged, { tabId: 7, documentId: 'doc-A', url, appGeneration: 1 }), 'CACHE_OWNER_MISMATCH', 'foreign cache generation rejected');
}

// Durable operation recovery remains possible after source page closes. This is not a
// current-page retry and must not be blocked just because no live document exists.
{
  const cache = new SourceDocumentRetryCache();
  const receipt = cache.put({ operationId: 'op-A', cacheGeneration: 8, tabId: 7, sourceDocumentId: 'doc-A', sourceUrl: url, appGeneration: 1, bytes: pdfA });
  const recovered = cache.recoverOperation(receipt);
  equal(digest(recovered), digest(pdfA), 'durable operation recovery preserves exact A bytes without live page');
  equal(receipt.sourceDocumentId, 'doc-A', 'recovery receipt retains provenance even when page is gone');
}

// Recovery cannot be rebound by changing document metadata or cache generation.
{
  const cache = new SourceDocumentRetryCache();
  const receipt = cache.put({ operationId: 'op-A', cacheGeneration: 9, tabId: 7, sourceDocumentId: 'doc-A', sourceUrl: url, appGeneration: 1, bytes: pdfA });
  const wrongGeneration = { ...receipt, cacheGeneration: 10 };
  throwsCode(() => cache.recoverOperation(wrongGeneration), 'RECOVERY_RECEIPT_MISMATCH', 'stale recovery generation rejected');
  const row = cache.rows.get(receipt.cacheKey);
  row.sourceDocumentId = 'doc-B';
  throwsCode(() => cache.recoverOperation(receipt), 'RECOVERY_LINEAGE_MISMATCH', 'recovery source lineage tamper rejected');
}

// Byte tamper remains a P0-079-style failure even when P0-023 document identity matches.
{
  const cache = new SourceDocumentRetryCache();
  const receipt = cache.put({ operationId: 'op-A', cacheGeneration: 12, tabId: 7, sourceDocumentId: 'doc-A', sourceUrl: url, appGeneration: 1, bytes: pdfA });
  const row = cache.rows.get(receipt.cacheKey);
  row.bytes = Buffer.from(pdfB);
  throwsCode(() => cache.currentPageRetry(receipt, { tabId: 7, documentId: 'doc-A', url, appGeneration: 1 }), 'CACHE_CONTENT_MISMATCH', 'document identity does not substitute for byte identity');
}

console.log(`P0-023 retry source-document generation model: PASS ${checks} checks`);
