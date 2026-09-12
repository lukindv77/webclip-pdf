'use strict';

const crypto = require('node:crypto');
const assert = require('node:assert/strict');

let checks = 0;
function check(condition, message) {
  assert.ok(condition, message);
  checks += 1;
}
function equal(actual, expected, message) {
  assert.equal(actual, expected, message);
  checks += 1;
}
function throws(fn, code, message) {
  let error = null;
  try { fn(); } catch (err) { error = err; }
  check(Boolean(error), `${message}: expected throw`);
  if (code) equal(error.code, code, `${message}: code`);
}

function digest(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function buf(text) {
  return Buffer.from(text, 'utf8');
}

// ---------------------------------------------------------------------------
// Current-source model: one mutable `tab:<id>` cache slot is authoritative.
// This intentionally models only the identity properties relevant to P0-079.
// ---------------------------------------------------------------------------
class CurrentTabCache {
  constructor() {
    this.rows = new Map();
  }
  key(tabId) { return `tab:${tabId}`; }
  put(tabId, bytes, meta) {
    const row = {
      key: this.key(tabId),
      tabId,
      bytes: Buffer.from(bytes),
      pdfByteLength: bytes.length,
      sourceUrl: meta.sourceUrl,
      sourceDocumentId: meta.sourceDocumentId,
      filename: meta.filename,
      createdAt: meta.createdAt || 1,
    };
    this.rows.set(row.key, row);
    return { ...row, bytes: undefined };
  }
  getByKey(key) {
    const row = this.rows.get(key);
    return row ? { ...row, bytes: Buffer.from(row.bytes) } : null;
  }
  getValidForTab(tabId, expectedUrl, expectedDocumentId) {
    const row = this.getByKey(this.key(tabId));
    if (!row) return null;
    if (expectedUrl && row.sourceUrl !== expectedUrl) return null;
    if (expectedDocumentId && row.sourceDocumentId !== expectedDocumentId) return null;
    return row;
  }
  deleteTab(tabId) { this.rows.delete(this.key(tabId)); }
  uploadByCapturedMetadata(captured) {
    const row = this.getByKey(captured.key);
    if (!row) {
      const error = new Error('cache missing');
      error.code = 'CACHE_MISSING';
      throw error;
    }
    if (row.bytes.length !== captured.pdfByteLength) {
      const error = new Error('size mismatch');
      error.code = 'WEBCLIP_UPLOAD_SIZE_MISMATCH';
      throw error;
    }
    // Current path has no immutable operation-owned content identity here.
    return { bytes: row.bytes, remoteSize: row.bytes.length };
  }
}

// ---------------------------------------------------------------------------
// Candidate acceptance model: immutable operation-owned cache generation.
// This is a research model, not an implementation prescription.
// ---------------------------------------------------------------------------
class OperationOwnedCache {
  constructor(snapshot = null) {
    this.rows = new Map();
    this.receipts = new Map();
    if (snapshot) {
      for (const row of snapshot.rows) {
        this.rows.set(row.key, { ...row, bytes: Buffer.from(row.bytesBase64, 'base64') });
      }
      for (const receipt of snapshot.receipts) this.receipts.set(receipt.operationId, { ...receipt });
    }
  }
  key(operationId, generation) { return `pdf:${operationId}:${generation}`; }
  materialize({ operationId, generation, tabId, sourceUrl, sourceDocumentId, filename, bytes }) {
    const key = this.key(operationId, generation);
    if (this.rows.has(key)) {
      const error = new Error('immutable cache generation already exists');
      error.code = 'CACHE_GENERATION_EXISTS';
      throw error;
    }
    const row = {
      key, operationId, generation, tabId, sourceUrl, sourceDocumentId, filename,
      byteLength: bytes.length,
      digest: digest(bytes),
      bytes: Buffer.from(bytes),
      phase: 'prepared',
    };
    this.rows.set(key, row);
    const receipt = {
      operationId, cacheKey: key, cacheGeneration: generation,
      byteLength: row.byteLength, digest: row.digest,
      sourceDocumentId, sourceUrl, tabId, phase: 'prepared',
    };
    this.receipts.set(operationId, receipt);
    return { ...receipt };
  }
  checkpoint(operationId) {
    const receipt = this.receipts.get(operationId);
    if (!receipt) return null;
    return { ...receipt };
  }
  markPhase(operationId, phase) {
    const receipt = this.receipts.get(operationId);
    if (!receipt) throw Object.assign(new Error('receipt missing'), { code: 'RECEIPT_MISSING' });
    receipt.phase = phase;
    const row = this.rows.get(receipt.cacheKey);
    if (row) row.phase = phase;
  }
  readExact(receipt) {
    const row = this.rows.get(receipt.cacheKey);
    if (!row) throw Object.assign(new Error('cache missing'), { code: 'CACHE_MISSING' });
    if (row.operationId !== receipt.operationId || row.generation !== receipt.cacheGeneration) {
      throw Object.assign(new Error('owner mismatch'), { code: 'CACHE_OWNER_MISMATCH' });
    }
    if (row.byteLength !== receipt.byteLength || row.bytes.length !== receipt.byteLength) {
      throw Object.assign(new Error('size mismatch'), { code: 'CACHE_SIZE_MISMATCH' });
    }
    const actualDigest = digest(row.bytes);
    if (actualDigest !== receipt.digest || row.digest !== receipt.digest) {
      throw Object.assign(new Error('digest mismatch'), { code: 'CACHE_DIGEST_MISMATCH' });
    }
    return Buffer.from(row.bytes);
  }
  upload(receipt) {
    const bytes = this.readExact(receipt);
    this.markPhase(receipt.operationId, 'admitted-unknown');
    return { bytes, remoteSize: bytes.length, digest: digest(bytes) };
  }
  cleanupExact(receipt) {
    const current = this.receipts.get(receipt.operationId);
    if (!current || current.cacheKey !== receipt.cacheKey || current.cacheGeneration !== receipt.cacheGeneration) {
      throw Object.assign(new Error('cleanup receipt mismatch'), { code: 'CLEANUP_RECEIPT_MISMATCH' });
    }
    this.rows.delete(receipt.cacheKey);
    current.phase = 'terminal-cleaned';
  }
  gcTerminalOnly() {
    for (const [op, receipt] of this.receipts) {
      if (receipt.phase === 'settled-success' || receipt.phase === 'settled-failure' || receipt.phase === 'cancelled-confirmed' || receipt.phase === 'terminal-cleaned') {
        this.rows.delete(receipt.cacheKey);
      }
    }
  }
  snapshot() {
    return {
      rows: [...this.rows.values()].map((row) => ({ ...row, bytes: undefined, bytesBase64: row.bytes.toString('base64') })),
      receipts: [...this.receipts.values()].map((receipt) => ({ ...receipt })),
    };
  }
}

const sourceUrl = 'https://example.test/article';
const docId = 'doc-7-a';
const pdfA = buf('PDF-A-1234');
const pdfBsame = buf('PDF-B-5678');
const pdfBlarger = buf('PDF-B-5678-LARGER');
equal(pdfA.length, pdfBsame.length, 'fixture: A/B same byte length');
check(digest(pdfA) !== digest(pdfBsame), 'fixture: A/B same-size bytes differ');

// --- Current shared-slot failure schedule: same-size substitution. ---
{
  const cache = new CurrentTabCache();
  const a = cache.put(7, pdfA, { sourceUrl, sourceDocumentId: docId, filename: 'A.pdf' });
  equal(a.key, 'tab:7', 'current A uses tab-scoped key');
  equal(a.pdfByteLength, pdfA.length, 'current A captures expected byte length');
  cache.put(7, pdfBsame, { sourceUrl, sourceDocumentId: docId, filename: 'B.pdf' });
  const current = cache.getValidForTab(7, sourceUrl, docId);
  equal(current.filename, 'B.pdf', 'current valid lookup now resolves B');
  equal(current.sourceDocumentId, docId, 'same-document guard accepts B');
  const uploaded = cache.uploadByCapturedMetadata(a);
  equal(uploaded.remoteSize, a.pdfByteLength, 'same-size substitution passes expected-size guard');
  equal(digest(uploaded.bytes), digest(pdfBsame), 'A upload physically reads B bytes');
  check(digest(uploaded.bytes) !== digest(pdfA), 'A metadata no longer identifies A bytes');
}

// --- Current shared-slot different-size overwrite is detected, but A bytes are lost. ---
{
  const cache = new CurrentTabCache();
  const a = cache.put(7, pdfA, { sourceUrl, sourceDocumentId: docId, filename: 'A.pdf' });
  cache.put(7, pdfBlarger, { sourceUrl, sourceDocumentId: docId, filename: 'B.pdf' });
  throws(() => cache.uploadByCapturedMetadata(a), 'WEBCLIP_UPLOAD_SIZE_MISMATCH', 'different-size overwrite');
  const row = cache.getByKey(a.key);
  equal(digest(row.bytes), digest(pdfBlarger), 'after mismatch only B bytes remain at shared key');
  check(digest(row.bytes) !== digest(pdfA), 'A exact retry bytes were overwritten');
}

// --- Current cleanup and retry authority are tab-scoped, not operation-scoped. ---
{
  const cache = new CurrentTabCache();
  const a = cache.put(7, pdfA, { sourceUrl, sourceDocumentId: docId, filename: 'A.pdf' });
  cache.put(7, pdfBsame, { sourceUrl, sourceDocumentId: docId, filename: 'B.pdf' });
  cache.deleteTab(7); // late A cleanup cannot name A generation; it deletes current slot.
  equal(cache.getByKey(a.key), null, 'late A cleanup deletes B shared row');
}
{
  const cache = new CurrentTabCache();
  cache.put(7, pdfA, { sourceUrl, sourceDocumentId: docId, filename: 'A.pdf' });
  cache.put(7, pdfBsame, { sourceUrl, sourceDocumentId: docId, filename: 'B.pdf' });
  const retry = cache.getValidForTab(7, sourceUrl, docId);
  equal(retry.filename, 'B.pdf', 'retry resolves latest same-tab same-document row');
  equal(digest(retry.bytes), digest(pdfBsame), 'retry bytes belong to B');
}

// Existing source/document guards are useful negative controls but do not close P0-079.
{
  const cache = new CurrentTabCache();
  cache.put(7, pdfA, { sourceUrl, sourceDocumentId: docId, filename: 'A.pdf' });
  equal(cache.getValidForTab(7, 'https://other.test/', docId), null, 'different URL rejected');
  equal(cache.getValidForTab(7, sourceUrl, 'doc-7-b'), null, 'different document generation rejected');
  const other = cache.put(8, pdfBsame, { sourceUrl, sourceDocumentId: docId, filename: 'B.pdf' });
  equal(other.key, 'tab:8', 'different tab gets different current key');
  equal(digest(cache.getByKey('tab:7').bytes), digest(pdfA), 'different tab does not overwrite tab 7');
}

// --- Candidate operation-owned generation keeps concurrent A/B physically distinct. ---
{
  const cache = new OperationOwnedCache();
  const a = cache.materialize({ operationId: 'op-A', generation: 1, tabId: 7, sourceUrl, sourceDocumentId: docId, filename: 'A.pdf', bytes: pdfA });
  const b = cache.materialize({ operationId: 'op-B', generation: 1, tabId: 7, sourceUrl, sourceDocumentId: docId, filename: 'B.pdf', bytes: pdfBsame });
  check(a.cacheKey !== b.cacheKey, 'candidate A/B have distinct durable keys');
  equal(a.operationId, 'op-A', 'candidate A receipt owns A');
  equal(b.operationId, 'op-B', 'candidate B receipt owns B');
  equal(a.byteLength, b.byteLength, 'candidate handles same-size A/B');
  check(a.digest !== b.digest, 'candidate receipts distinguish same-size content');
  equal(digest(cache.readExact(a)), digest(pdfA), 'candidate exact A read returns A');
  equal(digest(cache.readExact(b)), digest(pdfBsame), 'candidate exact B read returns B');
  const uploadedA = cache.upload(a);
  equal(uploadedA.digest, digest(pdfA), 'candidate A upload carries A bytes');
  equal(cache.checkpoint('op-A').phase, 'admitted-unknown', 'candidate admission becomes durable phase');
  equal(cache.checkpoint('op-B').phase, 'prepared', 'candidate B phase remains independent');
}

// Immutable generation cannot be silently overwritten/reused.
{
  const cache = new OperationOwnedCache();
  cache.materialize({ operationId: 'op-A', generation: 1, tabId: 7, sourceUrl, sourceDocumentId: docId, filename: 'A.pdf', bytes: pdfA });
  throws(() => cache.materialize({ operationId: 'op-A', generation: 1, tabId: 7, sourceUrl, sourceDocumentId: docId, filename: 'B.pdf', bytes: pdfBsame }), 'CACHE_GENERATION_EXISTS', 'immutable generation overwrite');
  const a2 = cache.materialize({ operationId: 'op-A2', generation: 2, tabId: 7, sourceUrl, sourceDocumentId: docId, filename: 'B.pdf', bytes: pdfBsame });
  equal(a2.cacheGeneration, 2, 'new operation may own new generation');
}

// Exact cleanup cannot delete another operation generation.
{
  const cache = new OperationOwnedCache();
  const a = cache.materialize({ operationId: 'op-A', generation: 1, tabId: 7, sourceUrl, sourceDocumentId: docId, filename: 'A.pdf', bytes: pdfA });
  const b = cache.materialize({ operationId: 'op-B', generation: 1, tabId: 7, sourceUrl, sourceDocumentId: docId, filename: 'B.pdf', bytes: pdfBsame });
  cache.cleanupExact(a);
  throws(() => cache.readExact(a), 'CACHE_MISSING', 'A cleaned exactly');
  equal(digest(cache.readExact(b)), digest(pdfBsame), 'B survives A cleanup');
}

// Foreign/stale receipts are rejected even when byte size is identical.
{
  const cache = new OperationOwnedCache();
  const a = cache.materialize({ operationId: 'op-A', generation: 1, tabId: 7, sourceUrl, sourceDocumentId: docId, filename: 'A.pdf', bytes: pdfA });
  const forgedOwner = { ...a, operationId: 'op-B' };
  throws(() => cache.readExact(forgedOwner), 'CACHE_OWNER_MISMATCH', 'foreign operation receipt');
  const forgedGeneration = { ...a, cacheGeneration: 2 };
  throws(() => cache.readExact(forgedGeneration), 'CACHE_OWNER_MISMATCH', 'stale generation receipt');
  const forgedDigest = { ...a, digest: digest(pdfBsame) };
  throws(() => cache.readExact(forgedDigest), 'CACHE_DIGEST_MISMATCH', 'same-size foreign digest');
}

// Content tampering/replacement at the exact key is caught by digest, not size alone.
{
  const cache = new OperationOwnedCache();
  const a = cache.materialize({ operationId: 'op-A', generation: 1, tabId: 7, sourceUrl, sourceDocumentId: docId, filename: 'A.pdf', bytes: pdfA });
  const row = cache.rows.get(a.cacheKey);
  row.bytes = Buffer.from(pdfBsame); // simulate storage corruption/incorrect replacement
  equal(row.bytes.length, a.byteLength, 'tamper fixture preserves byte length');
  throws(() => cache.readExact(a), 'CACHE_DIGEST_MISMATCH', 'same-size tamper');
}

// Durable restart/recovery retains exact operation-owned bytes and receipt.
{
  const before = new OperationOwnedCache();
  const a = before.materialize({ operationId: 'op-A', generation: 11, tabId: 7, sourceUrl, sourceDocumentId: docId, filename: 'A.pdf', bytes: pdfA });
  before.markPhase('op-A', 'admitted-unknown');
  const after = new OperationOwnedCache(before.snapshot());
  const recovered = after.checkpoint('op-A');
  equal(recovered.cacheKey, a.cacheKey, 'restart preserves exact cache key');
  equal(recovered.cacheGeneration, 11, 'restart preserves cache generation');
  equal(recovered.phase, 'admitted-unknown', 'restart preserves admitted/unknown phase');
  equal(digest(after.readExact(recovered)), digest(pdfA), 'restart recovers exact A bytes');
}

// Retention/GC: nonterminal or unknown admitted bytes are not silently discarded.
{
  const cache = new OperationOwnedCache();
  const prepared = cache.materialize({ operationId: 'prepared', generation: 1, tabId: 1, sourceUrl, sourceDocumentId: docId, filename: 'P.pdf', bytes: pdfA });
  const unknown = cache.materialize({ operationId: 'unknown', generation: 1, tabId: 2, sourceUrl, sourceDocumentId: docId, filename: 'U.pdf', bytes: pdfA });
  const done = cache.materialize({ operationId: 'done', generation: 1, tabId: 3, sourceUrl, sourceDocumentId: docId, filename: 'D.pdf', bytes: pdfA });
  cache.markPhase('unknown', 'admitted-unknown');
  cache.markPhase('done', 'settled-success');
  cache.gcTerminalOnly();
  equal(digest(cache.readExact(prepared)), digest(pdfA), 'GC preserves prepared bytes');
  equal(digest(cache.readExact(unknown)), digest(pdfA), 'GC preserves admitted-unknown bytes');
  throws(() => cache.readExact(done), 'CACHE_MISSING', 'GC may delete terminal-success bytes');
}

// Remote checkpoint acceptance: exact local content receipt is carried forward.
{
  const cache = new OperationOwnedCache();
  const a = cache.materialize({ operationId: 'op-A', generation: 5, tabId: 7, sourceUrl, sourceDocumentId: docId, filename: 'A.pdf', bytes: pdfA });
  const remoteCheckpoint = {
    operationId: a.operationId,
    localPdfCacheKey: a.cacheKey,
    localPdfGeneration: a.cacheGeneration,
    expectedPdfBytes: a.byteLength,
    expectedPdfSha256: a.digest,
    phase: 'prepared',
  };
  equal(remoteCheckpoint.localPdfCacheKey, a.cacheKey, 'remote checkpoint binds exact local cache key');
  equal(remoteCheckpoint.localPdfGeneration, a.cacheGeneration, 'remote checkpoint binds cache generation');
  equal(remoteCheckpoint.expectedPdfBytes, pdfA.length, 'remote checkpoint binds exact bytes');
  equal(remoteCheckpoint.expectedPdfSha256, digest(pdfA), 'remote checkpoint binds content digest');
  const restart = new OperationOwnedCache(cache.snapshot());
  const receipt = restart.checkpoint(remoteCheckpoint.operationId);
  equal(receipt.cacheKey, remoteCheckpoint.localPdfCacheKey, 'recovery receipt matches checkpoint cache key');
  equal(receipt.digest, remoteCheckpoint.expectedPdfSha256, 'recovery receipt matches checkpoint digest');
}

console.log(`PASS ${checks} checks`);
