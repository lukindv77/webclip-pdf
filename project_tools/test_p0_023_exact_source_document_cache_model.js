'use strict';

const assert = require('assert');

function sourceReceipt({ documentId = 'doc-A', appGeneration = 1, selectionRevision = 1, href = 'https://example.test/a' } = {}) {
  return Object.freeze({
    version: 1,
    browserDocumentId: documentId,
    applicationGeneration: appGeneration,
    selectionRevision,
    href
  });
}

function sameSource(a, b) {
  return Boolean(
    a && b &&
    a.version === 1 && b.version === 1 &&
    a.browserDocumentId === b.browserDocumentId &&
    a.applicationGeneration === b.applicationGeneration &&
    a.selectionRevision === b.selectionRevision
  );
}

class Cache {
  constructor() {
    this.generations = new Map();
    this.latestByTab = new Map();
  }
  create(tabId, generation, receipt, bytes) {
    assert(!this.generations.has(generation), 'sealed generation is create-once');
    this.generations.set(generation, Object.freeze({
      generation,
      source: receipt,
      bytes: Buffer.from(bytes),
      sealed: true
    }));
    this.latestByTab.set(tabId, generation);
  }
  retryForLiveSource(tabId, liveReceipt) {
    const generation = this.latestByTab.get(tabId);
    if (!generation) return null;
    const record = this.generations.get(generation);
    if (!record || !record.sealed || !sameSource(record.source, liveReceipt)) {
      // Clear only the mutable discovery pointer. Never destroy another
      // operation's sealed bytes merely because the live tab changed.
      if (this.latestByTab.get(tabId) === generation) this.latestByTab.delete(tabId);
      return null;
    }
    return record;
  }
  recoverExactGeneration(generation) {
    return this.generations.get(generation) || null;
  }
  cleanupGeneration(tabId, generation) {
    this.generations.delete(generation);
    if (this.latestByTab.get(tabId) === generation) this.latestByTab.delete(tabId);
  }
}

// Exact same admitted source can discover its sealed PDF.
{
  const c = new Cache();
  const a = sourceReceipt();
  c.create(7, 'G-A', a, 'PDF-A');
  assert.equal(c.retryForLiveSource(7, a)?.generation, 'G-A');
}

// Same URL after reload is a different browser document and cannot reuse A.
{
  const c = new Cache();
  const a = sourceReceipt({ documentId: 'doc-A', href: 'https://example.test/a' });
  const b = sourceReceipt({ documentId: 'doc-B', href: 'https://example.test/a' });
  c.create(7, 'G-A', a, 'PDF-A');
  assert.equal(c.retryForLiveSource(7, b), null);
  assert.equal(c.latestByTab.has(7), false);
  assert.equal(c.recoverExactGeneration('G-A')?.generation, 'G-A');
}

// Same browser document but newer application generation cannot inherit old PDF.
{
  const c = new Cache();
  const a1 = sourceReceipt({ documentId: 'doc-A', appGeneration: 1 });
  const a2 = sourceReceipt({ documentId: 'doc-A', appGeneration: 2 });
  c.create(7, 'G-A1', a1, 'PDF-A1');
  assert.equal(c.retryForLiveSource(7, a2), null);
  assert.ok(c.recoverExactGeneration('G-A1'));
}

// Matching URL/filename/size is never a substitute for source identity.
{
  const c = new Cache();
  const a = sourceReceipt({ documentId: 'doc-A' });
  const b = sourceReceipt({ documentId: 'doc-B' });
  c.create(7, 'G-A', a, '123456');
  assert.equal(c.retryForLiveSource(7, b), null);
}

// Operation-specific recovery may still use exact old generation after tab replacement;
// this is not live-page retry authority.
{
  const c = new Cache();
  c.create(7, 'G-A', sourceReceipt({ documentId: 'doc-A' }), 'PDF-A');
  c.retryForLiveSource(7, sourceReceipt({ documentId: 'doc-B' }));
  assert.equal(c.recoverExactGeneration('G-A')?.bytes.toString(), 'PDF-A');
}

// Old cleanup cannot clear a newer tab->latest pointer.
{
  const c = new Cache();
  c.create(7, 'G-A', sourceReceipt({ documentId: 'doc-A' }), 'PDF-A');
  c.create(7, 'G-B', sourceReceipt({ documentId: 'doc-B', href: 'https://example.test/b' }), 'PDF-B');
  c.cleanupGeneration(7, 'G-A');
  assert.equal(c.latestByTab.get(7), 'G-B');
  assert.equal(c.retryForLiveSource(7, sourceReceipt({ documentId: 'doc-B', href: 'https://example.test/b' }))?.generation, 'G-B');
}

// Selection/source revision is consumed from the upstream receipt, not reconstructed from URL.
{
  const c = new Cache();
  const a1 = sourceReceipt({ selectionRevision: 1 });
  const a2 = sourceReceipt({ selectionRevision: 2 });
  c.create(7, 'G-A1', a1, 'PDF-A1');
  assert.equal(c.retryForLiveSource(7, a2), null);
}

console.log('P0-023 exact source-document cache model: PASS');
