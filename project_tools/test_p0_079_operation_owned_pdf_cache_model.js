'use strict';

const assert = require('node:assert/strict');

function issueGeneration(id) {
  const value = String(id || '').trim();
  assert.ok(value && !value.startsWith('tab:'), 'generation must be opaque operation-owned identity');
  return Object.freeze({ version: 1, id: value });
}

function cacheKey(generation) {
  return `op:${generation.id}`;
}

function createSealedRecord({ generation, ownerOperationReceipt, tabId, sourceDocumentGeneration, bytesTag, size }) {
  return Object.freeze({
    key: cacheKey(generation),
    generation: generation.id,
    ownerOperationReceipt,
    tabId,
    sourceDocumentGeneration,
    bytesTag,
    size,
    sealed: true
  });
}

class CacheStore {
  constructor() {
    this.records = new Map();
    this.tabRetryIndex = new Map();
  }

  putNew(record) {
    assert.equal(record.sealed, true);
    if (this.records.has(record.key)) throw new Error('sealed-generation-already-exists');
    this.records.set(record.key, record);
    this.tabRetryIndex.set(record.tabId, Object.freeze({ key: record.key, generation: record.generation }));
  }

  readExact(receipt) {
    const record = this.records.get(receipt.key);
    if (!record || record.generation !== receipt.generation) return null;
    return record;
  }

  deleteExact(receipt) {
    const record = this.readExact(receipt);
    if (!record) return false;
    this.records.delete(receipt.key);
    const pointer = this.tabRetryIndex.get(record.tabId);
    if (pointer?.key === receipt.key && pointer?.generation === receipt.generation) {
      this.tabRetryIndex.delete(record.tabId);
    }
    return true;
  }

  currentRetryReceipt(tabId) {
    return this.tabRetryIndex.get(tabId) || null;
  }
}

function receipt(record) {
  return Object.freeze({ key: record.key, generation: record.generation, ownerOperationReceipt: record.ownerOperationReceipt });
}

(function sameTabSameUrlGetsDistinctImmutableRecords() {
  const store = new CacheStore();
  const a = createSealedRecord({ generation: issueGeneration('A-random'), ownerOperationReceipt: 'worker-op-A', tabId: 5, sourceDocumentGeneration: 'doc-1', bytesTag: 'PDF-A', size: 100 });
  const b = createSealedRecord({ generation: issueGeneration('B-random'), ownerOperationReceipt: 'worker-op-B', tabId: 5, sourceDocumentGeneration: 'doc-2', bytesTag: 'PDF-B', size: 200 });
  store.putNew(a);
  store.putNew(b);
  assert.notEqual(a.key, b.key);
  assert.equal(store.readExact(receipt(a)).bytesTag, 'PDF-A');
  assert.equal(store.readExact(receipt(b)).bytesTag, 'PDF-B');
  assert.equal(store.currentRetryReceipt(5).key, b.key);
})();

(function offscreenAReadsAAfterBBecomesLatest() {
  const store = new CacheStore();
  const a = createSealedRecord({ generation: issueGeneration('A'), ownerOperationReceipt: 'worker-op-A', tabId: 7, sourceDocumentGeneration: 'doc-A', bytesTag: 'PDF-A', size: 101 });
  const b = createSealedRecord({ generation: issueGeneration('B'), ownerOperationReceipt: 'worker-op-B', tabId: 7, sourceDocumentGeneration: 'doc-B', bytesTag: 'PDF-B', size: 202 });
  store.putNew(a);
  const signedTransferReceiptA = receipt(a);
  store.putNew(b);
  const transferred = store.readExact(signedTransferReceiptA);
  assert.equal(transferred.bytesTag, 'PDF-A');
  assert.equal(transferred.size, 101);
})();

(function staleADeleteCannotDeleteB() {
  const store = new CacheStore();
  const a = createSealedRecord({ generation: issueGeneration('A'), ownerOperationReceipt: 'worker-op-A', tabId: 9, sourceDocumentGeneration: 'doc-A', bytesTag: 'PDF-A', size: 1 });
  const b = createSealedRecord({ generation: issueGeneration('B'), ownerOperationReceipt: 'worker-op-B', tabId: 9, sourceDocumentGeneration: 'doc-B', bytesTag: 'PDF-B', size: 2 });
  store.putNew(a);
  store.putNew(b);
  assert.equal(store.deleteExact(receipt(a)), true);
  assert.equal(store.readExact(receipt(b)).bytesTag, 'PDF-B');
  assert.equal(store.currentRetryReceipt(9).key, b.key);
})();

(function sameUrlIsNotIdentity() {
  const a = { tabId: 12, sourceUrl: 'https://example.test/x', generation: 'A', document: 'doc-A' };
  const b = { tabId: 12, sourceUrl: 'https://example.test/x', generation: 'B', document: 'doc-B' };
  assert.equal(a.sourceUrl, b.sourceUrl);
  assert.notEqual(a.generation, b.generation);
  assert.notEqual(a.document, b.document);
})();

(function retryUsesExactDurableReceiptNotTabAlias() {
  const store = new CacheStore();
  const a = createSealedRecord({ generation: issueGeneration('A'), ownerOperationReceipt: 'worker-op-A', tabId: 13, sourceDocumentGeneration: 'doc-A', bytesTag: 'PDF-A', size: 10 });
  const b = createSealedRecord({ generation: issueGeneration('B'), ownerOperationReceipt: 'worker-op-B', tabId: 13, sourceDocumentGeneration: 'doc-B', bytesTag: 'PDF-B', size: 20 });
  store.putNew(a);
  const retryA = receipt(a);
  store.putNew(b);
  assert.equal(store.readExact(retryA).bytesTag, 'PDF-A');
  assert.equal(store.currentRetryReceipt(13).key, b.key);
})();

(function sealedGenerationCannotBeOverwrittenEvenBySameOwnerString() {
  const store = new CacheStore();
  const generation = issueGeneration('A');
  const a = createSealedRecord({ generation, ownerOperationReceipt: 'worker-op-A', tabId: 14, sourceDocumentGeneration: 'doc-A', bytesTag: 'PDF-A', size: 10 });
  const mutated = createSealedRecord({ generation, ownerOperationReceipt: 'worker-op-A', tabId: 14, sourceDocumentGeneration: 'doc-A', bytesTag: 'PDF-A-CHANGED', size: 11 });
  store.putNew(a);
  assert.throws(() => store.putNew(mutated), /sealed-generation-already-exists/);
  assert.equal(store.readExact(receipt(a)).bytesTag, 'PDF-A');
})();

(function callerTextOperationIdIsNotCacheCapability() {
  const generation = issueGeneration('opaque-worker-issued-123');
  const record = createSealedRecord({ generation, ownerOperationReceipt: 'worker-issued-receipt', tabId: 15, sourceDocumentGeneration: 'doc-A', bytesTag: 'PDF-A', size: 10 });
  const callerSuppliedText = 'worker-issued-receipt';
  assert.equal(callerSuppliedText, record.ownerOperationReceipt);
  assert.notEqual(cacheKey(generation), `op:${callerSuppliedText}`);
})();

(function ttlCleanupIsPerGenerationNotPerTab() {
  const store = new CacheStore();
  const a = createSealedRecord({ generation: issueGeneration('old-A'), ownerOperationReceipt: 'worker-op-A', tabId: 16, sourceDocumentGeneration: 'doc-A', bytesTag: 'PDF-A', size: 10 });
  const b = createSealedRecord({ generation: issueGeneration('new-B'), ownerOperationReceipt: 'worker-op-B', tabId: 16, sourceDocumentGeneration: 'doc-B', bytesTag: 'PDF-B', size: 20 });
  store.putNew(a);
  store.putNew(b);
  store.deleteExact(receipt(a));
  assert.equal(store.readExact(receipt(b)).bytesTag, 'PDF-B');
})();

console.log('P0-079 operation-owned PDF cache model: PASS');
