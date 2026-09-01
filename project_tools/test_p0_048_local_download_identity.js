'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const identitySource = fs.readFileSync(path.join(ROOT, 'local-download-identity.js'), 'utf8');
const workerSource = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');

const identityContext = { globalThis: null };
identityContext.globalThis = identityContext;
vm.createContext(identityContext);
vm.runInContext(identitySource, identityContext, { filename: 'local-download-identity.js' });
const guard = identityContext.WebClipLocalDownloadIdentity;
assert.ok(guard, 'identity helper must export');

const now = 1_800_000;
function intent(key, filename = 'same.pdf', expectedBytes = 1234, blobUrl = '') {
  return {
    downloadId: key,
    kind: 'intent',
    createdAt: now - 1000,
    updatedAt: now - 1000,
    expectedBytes,
    blobUrl,
    operationId: key,
    data: { filename }
  };
}
function download(id, filename = '/Downloads/same.pdf', bytes = 1234, url = '') {
  return { id, filename, fileSize: bytes, totalBytes: bytes, url, finalUrl: url };
}

{
  const a = intent('intent:a');
  const d = download(11);
  const result = guard.chooseUniqueDownloadForIntent({ intent: a, downloads: [d], allIntents: [a], now });
  assert.equal(result.mode, 'fallback-unique');
  assert.equal(result.download.id, 11);
}

{
  const a = intent('intent:a');
  const b = intent('intent:b');
  const d = download(12);
  const resultA = guard.chooseUniqueDownloadForIntent({ intent: a, downloads: [d], allIntents: [a, b], now });
  const resultB = guard.chooseUniqueDownloadForIntent({ intent: b, downloads: [d], allIntents: [a, b], now });
  assert.equal(resultA.download, null, 'same-name/same-size candidate must not be claimed by intent A');
  assert.equal(resultB.download, null, 'same-name/same-size candidate must not be claimed by intent B');
  assert.equal(resultA.mode, 'ambiguous-intent');
  assert.equal(resultB.mode, 'ambiguous-intent');
}

{
  const a = intent('intent:a');
  const result = guard.chooseUniqueDownloadForIntent({
    intent: a,
    downloads: [download(13), download(14)],
    allIntents: [a],
    now
  });
  assert.equal(result.download, null, 'one intent must not choose the first of multiple equal fallback downloads');
  assert.equal(result.mode, 'ambiguous-download');
}

{
  const exactUrl = 'blob:chrome-extension://id/exact-a';
  const a = intent('intent:a', 'same.pdf', 1234, exactUrl);
  const b = intent('intent:b');
  const exact = download(15, '/Downloads/same.pdf', 1234, exactUrl);
  const result = guard.chooseUniqueDownloadForIntent({ intent: a, downloads: [exact], allIntents: [a, b], now });
  assert.equal(result.mode, 'blob-url');
  assert.equal(result.download.id, 15, 'exact Blob URL remains authoritative over fallback ambiguity');
}

{
  const exactUrl = 'blob:chrome-extension://id/exact-a';
  const a = intent('intent:a', 'same.pdf', 1234, exactUrl);
  const result = guard.chooseUniqueDownloadForIntent({
    intent: a,
    downloads: [download(16, 'same.pdf', 1234, exactUrl), download(17, 'same.pdf', 1234, exactUrl)],
    allIntents: [a],
    now
  });
  assert.equal(result.download, null);
  assert.equal(result.mode, 'ambiguous-exact');
}

assert.match(workerSource, /importScripts\('public-suffix\.js', 'journal-import-stream\.js', 'journal-text-filter\.js', 'local-download-identity\.js'\)/,
  'service worker must load identity helper before body execution');
assert.match(workerSource, /listPendingLocalDownloadFallbackIntents\(\)/,
  'reconciliation must load the bounded all-intent set');
assert.match(workerSource, /WebClipLocalDownloadIdentity\.chooseUniqueDownloadForIntent/,
  'reconciliation must use unique intent/download classifier');
assert.match(workerSource, /const existingReq = pending\.get\(id\)/,
  'numeric downloadId binding must inspect existing durable owner');
assert.match(workerSource, /WEBCLIP_DOWNLOAD_ID_ALREADY_BOUND/,
  'numeric downloadId collision must fail closed');

const bindMatch = workerSource.match(/async function bindPendingLocalDownloadIntent[\s\S]*?\n}\n\nasync function getPendingLocalDownload/);
assert.ok(bindMatch, 'bindPendingLocalDownloadIntent source must be extractable');
const bindSource = bindMatch[0].replace(/\n\nasync function getPendingLocalDownload[\s\S]*$/, '');

function createBindHarness(initialEntries) {
  const map = new Map(initialEntries.map(([key, value]) => [key, structuredClone(value)]));
  const fakeStore = {
    get(key) {
      const request = { result: undefined, error: null, onsuccess: null, onerror: null };
      queueMicrotask(() => {
        request.result = map.has(key) ? structuredClone(map.get(key)) : undefined;
        request.onsuccess?.();
      });
      return request;
    },
    delete(key) { map.delete(key); },
    put(value) { map.set(value.downloadId, structuredClone(value)); }
  };
  const context = {
    RECOVERY_IDB_TX_TIMEOUT_MS: 20_000,
    normalizePendingLocalDownloadKey(value) {
      if (typeof value === 'string' && value.startsWith('intent:')) return value;
      const id = Number(value);
      return Number.isInteger(id) && id >= 0 ? id : null;
    },
    async openJournalDb() { return { close() {} }; },
    runIndexedDbTransactionBounded(_db, _storeName, _mode, _label, body) {
      return new Promise((resolve, reject) => {
        body({
          store: () => fakeStore,
          setResult: resolve,
          fail: reject
        });
      });
    },
    JOURNAL_PENDING_DOWNLOAD_STORE: 'pendingDownloads',
    structuredClone,
    queueMicrotask
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(bindSource, context, { filename: 'bindPendingLocalDownloadIntent.js' });
  return { map, bind: context.bindPendingLocalDownloadIntent };
}

(async () => {
  {
    const intentRow = intent('intent:a');
    const existing = { ...intent('intent:b'), downloadId: 77, kind: 'download', operationId: 'intent:b' };
    const harness = createBindHarness([['intent:a', intentRow], [77, existing]]);
    await assert.rejects(
      () => harness.bind('intent:a', 77),
      (error) => error?.code === 'WEBCLIP_DOWNLOAD_ID_ALREADY_BOUND'
    );
    assert.equal(harness.map.get('intent:a').operationId, 'intent:a', 'losing intent checkpoint must remain durable');
    assert.equal(harness.map.get(77).operationId, 'intent:b', 'existing numeric owner must not be overwritten');
  }

  {
    const intentRow = intent('intent:a');
    const harness = createBindHarness([['intent:a', intentRow]]);
    const bound = await harness.bind('intent:a', 78);
    assert.equal(bound.downloadId, 78);
    assert.equal(bound.operationId, 'intent:a');
    assert.equal(harness.map.has('intent:a'), false);
    assert.equal(harness.map.get(78).operationId, 'intent:a');
  }

  console.log('P0-048 local download identity: PASS');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
