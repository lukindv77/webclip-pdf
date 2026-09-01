'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'durable-url-policy.js'), 'utf8');
const context = { URL, TextEncoder, Uint8Array, Uint32Array, DataView };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: 'durable-url-policy.js' });
const policy = context.WebClipDurableUrlPolicy;

class FakeStore {
  constructor(values = []) {
    this.values = values;
    this.requests = [];
    this.cleared = false;
  }
  openCursor() {
    const request = { result: null, onsuccess: null, onerror: null };
    this.requests.push(request);
    let index = 0;
    const advance = () => {
      if (index >= this.values.length) {
        request.result = null;
        request.onsuccess?.();
        return;
      }
      const current = this.values[index];
      request.result = {
        value: current,
        update: (next) => {
          this.values[index] = next;
          return { onerror: null };
        },
        continue: () => { index += 1; advance(); }
      };
      request.onsuccess?.();
    };
    request.drive = advance;
    return request;
  }
  clear() {
    this.cleared = true;
    this.values = [];
    return { onerror: null };
  }
}

function fakeDbAndTx(stores) {
  const tx = {
    aborted: false,
    abort() { this.aborted = true; },
    objectStore(name) { return stores[name]; }
  };
  const db = {
    objectStoreNames: { contains(name) { return Object.hasOwn(stores, name); } }
  };
  return { db, tx };
}

function drive(stores) {
  for (const store of Object.values(stores)) {
    for (const request of store.requests) request.drive();
  }
}

(function testJournalV8MigratesLegacyPlaintext() {
  const secretUrl = 'https://user:pass@example.test/doc?access_token=SECRET#frag';
  const stores = {
    entries: new FakeStore([{ id: 'e1', url: secretUrl, urlKey: secretUrl, siteAddress: secretUrl, publicUrl: 'https://disk.yandex.ru/d/x?PRIVATE=1#f', selectionSnapshot: { includes: [{ href: '/go?LOC=SECRET' }], excludes: [] } }]),
    pendingAppends: new FakeStore([{ id: 'p1', data: { meta: { url: secretUrl, siteAddress: secretUrl }, publicUrl: 'https://disk.yandex.ru/d/p?PUB=SECRET' } }]),
    pendingDownloads: new FakeStore([]),
    pendingRemoteSaves: new FakeStore([]),
    importStaging: new FakeStore([{ key: 's1', entry: { id: 'e2', url: secretUrl, urlKey: secretUrl, publicUrl: 'https://disk.yandex.ru/d/s?S=SECRET' } }]),
    urlStats: new FakeStore([{ urlKey: secretUrl, count: 1 }])
  };
  const { db, tx } = fakeDbAndTx(stores);
  policy.migrateJournalDbV8(db, tx, 7);
  drive(stores);
  assert.equal(tx.aborted, false);
  assert.equal(stores.urlStats.cleared, true, 'derived plaintext urlStats must be cleared for rebuild');
  const serialized = JSON.stringify({ entries: stores.entries.values, pending: stores.pendingAppends.values, staging: stores.importStaging.values });
  for (const forbidden of ['user:', 'pass@', 'access_token', 'SECRET', 'PRIVATE', 'PUB=']) {
    assert.equal(serialized.includes(forbidden), false, `journal migration leaked ${forbidden}`);
  }
  assert.equal(stores.entries.values[0].url, 'https://example.test/doc');
  assert.match(stores.entries.values[0].urlKey, /^webclip-url-v2:[0-9a-f]{64}$/);
})();

(function testPdfV4MigratesRecordAndMetadataStores() {
  const secretUrl = 'https://u:p@example.test/doc?generation=SECRET#f';
  const stores = {
    pdfs: new FakeStore([{ key: 'tab:1', sourceUrl: secretUrl, meta: { url: secretUrl } }]),
    meta: new FakeStore([{ key: 'tab:1', sourceUrl: secretUrl, meta: { url: secretUrl } }])
  };
  const { db, tx } = fakeDbAndTx(stores);
  policy.migratePdfCacheDbV4(db, tx, 3);
  drive(stores);
  assert.equal(tx.aborted, false);
  for (const name of ['pdfs', 'meta']) {
    const value = stores[name].values[0];
    assert.equal(value.sourceUrl, 'https://example.test/doc');
    assert.equal(value.meta.url, 'https://example.test/doc');
    assert.match(value.sourceUrlKey, /^webclip-url-v2:[0-9a-f]{64}$/);
    assert.equal(JSON.stringify(value).includes('SECRET'), false);
  }
})();

(function testMigrationFailureAbortsInsteadOfSilentlyPersistingPlaintext() {
  const poisonous = {};
  Object.defineProperty(poisonous, 'url', { enumerable: true, get() { throw new Error('poison'); } });
  const stores = { entries: new FakeStore([poisonous]) };
  const { db, tx } = fakeDbAndTx(stores);
  policy.migrateJournalDbV8(db, tx, 7);
  drive(stores);
  assert.equal(tx.aborted, true, 'sanitization/update failure must abort schema migration');
})();

console.log('P0-066 durable URL migration: PASS');