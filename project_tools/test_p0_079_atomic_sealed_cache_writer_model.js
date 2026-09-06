'use strict';

const assert = require('node:assert/strict');

class CacheDb {
  constructor() {
    this.payload = new Map();
    this.meta = new Map();
  }

  createOnce(record, metadata) {
    const key = record.key;
    if (this.payload.has(key) || this.meta.has(key)) {
      return { ok: false, outcome: 'duplicate-generation-conflict' };
    }
    // Model one atomic transaction across payload + metadata stores.
    this.payload.set(key, Object.freeze({ ...record }));
    this.meta.set(key, Object.freeze({ ...metadata }));
    return { ok: true, outcome: 'created' };
  }

  readExact(key) {
    const payload = this.payload.get(key) || null;
    const meta = this.meta.get(key) || null;
    if (!payload && !meta) return { outcome: 'absent' };
    if (!payload || !meta) return { outcome: 'corrupt-cross-store' };
    if (payload.generation !== meta.generation || payload.key !== meta.key) {
      return { outcome: 'corrupt-cross-store' };
    }
    if (!payload.sealed || !meta.sealed) return { outcome: 'unsealed' };
    return { outcome: 'sealed', payload, meta };
  }
}

function record(generation, bytesId, size) {
  const key = `op:${generation}`;
  return {
    key,
    generation,
    bytesId,
    pdfByteLength: size,
    sealed: true
  };
}

function metadata(generation, integrity, size) {
  return {
    key: `op:${generation}`,
    generation,
    integrity,
    pdfByteLength: size,
    sealed: true
  };
}

(function concurrentDifferentBytesCannotOverwriteSameGeneration() {
  const db = new CacheDb();
  const first = db.createOnce(record('G1', 'PDF-A', 100), metadata('G1', 'hash-A', 100));
  const second = db.createOnce(record('G1', 'PDF-B', 100), metadata('G1', 'hash-B', 100));
  assert.equal(first.outcome, 'created');
  assert.equal(second.outcome, 'duplicate-generation-conflict');
  const stored = db.readExact('op:G1');
  assert.equal(stored.outcome, 'sealed');
  assert.equal(stored.payload.bytesId, 'PDF-A');
  assert.equal(stored.meta.integrity, 'hash-A');
})();

(function sameSizeDoesNotAuthorizeReplacement() {
  const db = new CacheDb();
  db.createOnce(record('G2', 'PDF-A', 200), metadata('G2', 'hash-A', 200));
  const duplicate = db.createOnce(record('G2', 'PDF-B', 200), metadata('G2', 'hash-B', 200));
  assert.equal(duplicate.outcome, 'duplicate-generation-conflict');
})();

(function unknownCommitReconcilesWithoutRewrite() {
  const db = new CacheDb();
  db.createOnce(record('G3', 'PDF-A', 300), metadata('G3', 'hash-A', 300));

  // Caller lost commit result. It reconciles exact G3 instead of re-putting.
  const reconciled = db.readExact('op:G3');
  assert.equal(reconciled.outcome, 'sealed');
  assert.equal(reconciled.payload.bytesId, 'PDF-A');
})();

(function crossStoreOrphanFailsClosed() {
  const db = new CacheDb();
  db.payload.set('op:G4', Object.freeze(record('G4', 'PDF-A', 400)));
  assert.equal(db.readExact('op:G4').outcome, 'corrupt-cross-store');
})();

(function tabPointerPublishesOnlyAfterGenerationCommit() {
  const db = new CacheDb();
  const tabIndex = new Map();
  const create = db.createOnce(record('G5', 'PDF-A', 500), metadata('G5', 'hash-A', 500));
  assert.equal(create.ok, true);
  assert.equal(db.readExact('op:G5').outcome, 'sealed');
  tabIndex.set(7, 'op:G5');
  assert.equal(tabIndex.get(7), 'op:G5');
})();

(function staleCleanupCannotClearNewerPointer() {
  const tabIndex = new Map([[8, 'op:G-new']]);
  const compareAndRemove = (tabId, expectedKey) => {
    if (tabIndex.get(tabId) === expectedKey) tabIndex.delete(tabId);
  };
  compareAndRemove(8, 'op:G-old');
  assert.equal(tabIndex.get(8), 'op:G-new');
})();

console.log('P0-079 atomic sealed cache writer model: PASS');
