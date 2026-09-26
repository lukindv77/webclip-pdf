const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const localDownloadIdentity = fs.readFileSync(path.join(root, 'local-download-identity.js'), 'utf8');

function section(startMarker, endMarker) {
  const start = sw.indexOf(startMarker);
  const end = sw.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Markers not found: ${startMarker} -> ${endMarker}`);
  return sw.slice(start, end);
}

async function testP1086BatchWaitsForTransactionComplete() {
  const code = section('async function readJournalEntryBatch', 'function safeTextChunkEnd');
  assert(code.includes('let pendingResult = null;'), 'P1-086: batch must stage the result instead of resolving from cursor success');
  assert(code.includes('tx.oncomplete = () => finish(resolve'), 'P1-086: readonly batch may publish only from tx.oncomplete');
  const requestBody = code.slice(code.indexOf('request.onsuccess'), code.indexOf('request.onerror'));
  assert(!requestBody.includes('finish(resolve'), 'P1-086: request.onsuccess must not publish a readonly result');

  const request = {};
  const store = { openCursor: () => request };
  const tx = {
    objectStore: () => store,
    abort() { this.onabort?.(); },
    oncomplete: null,
    onerror: null,
    onabort: null
  };
  let dbClosed = false;
  const db = { transaction: () => tx, close: () => { dbClosed = true; } };
  const context = vm.createContext({
    Promise, Error, String, Number, Math, Date, JSON,
    setTimeout, clearTimeout,
    JOURNAL_EXPORT_BATCH_TIMEOUT_MS: 20_000,
    JOURNAL_EXPORT_BATCH_MEMORY_CHARS: 4 * 1024 * 1024,
    JOURNAL_STORE: 'entries',
    openJournalDb: async () => db,
    normalizeJournalComments: () => [],
    // P0-066 URL projection is covered by test_p0_066_durable_url_policy.js.
    sanitizePortableJournalEntryUrls: (entry) => ({ ...entry }),
    IDBKeyRange: { lowerBound: () => ({}) }
  });
  vm.runInContext(`${code}\nthis.readForTest = readJournalEntryBatch;`, context);

  let settled = false;
  const promise = context.readForTest('', 1, Date.now() + 5_000).then((value) => { settled = true; return value; });
  await new Promise((resolve) => setImmediate(resolve));
  const cursor = {
    value: { id: 'entry-a', createdAt: 1 },
    primaryKey: 'entry-a',
    key: 'entry-a',
    continue() {
      request.result = null;
      request.onsuccess();
    }
  };
  request.result = cursor;
  request.onsuccess();
  await Promise.resolve();
  assert.strictEqual(settled, false, 'P1-086: cursor completion must not settle Promise before tx.oncomplete');
  assert.strictEqual(dbClosed, false, 'DB must remain open until transaction completion');
  tx.oncomplete();
  const result = await promise;
  assert.strictEqual(settled, true);
  assert.strictEqual(dbClosed, true);
  assert.strictEqual(result.items.length, 1);
  assert.strictEqual(result.lastId, 'entry-a');
}

function testP1086RevisionUsesCompletionBoundedHelper() {
  const code = section('async function journalRevisionSnapshot', 'async function readJournalEntryBatch');
  assert(code.includes('runIndexedDbTransactionBounded('), 'P1-086: revision read must use completion-aware bounded transaction helper');
  assert(code.includes("'readonly'"), 'P1-086: revision snapshot remains readonly');
  assert(!code.includes('request.onsuccess = () => finish(resolve'), 'P1-086: revision request success must not resolve directly');
  assert(/},\s*remaining\(\)\s*\);/.test(code), 'P1-073/P1-086: helper receives only remaining export deadline');
}

function testP1087OwnExtensionIdentityGate() {
  const helperCode = section('function isOwnExtensionDownload', 'function makePendingLocalDownloadIntentKey');
  const context = vm.createContext({ chrome: { runtime: { id: 'webclip-extension-id' } }, String, Boolean });
  vm.runInContext(`${helperCode}\nthis.isOwn = isOwnExtensionDownload;`, context);
  assert.strictEqual(context.isOwn({ byExtensionId: 'webclip-extension-id' }), true);
  assert.strictEqual(context.isOwn({ byExtensionId: 'other-extension-id' }), false);
  assert.strictEqual(context.isOwn({}), false, 'missing byExtensionId must fail closed');

  const recovery = section('async function reconcilePendingLocalDownloads', 'async function appendJournalEntry');
  assert(recovery.includes('downloads: (Array.isArray(matches) ? matches : []).filter(isOwnExtensionDownload)'), 'P1-087: intent/fallback candidates must be ownership-filtered before identity classification');
  assert(recovery.includes('WebClipLocalDownloadIdentity?.chooseUniqueDownloadForIntent'), 'P1-087: ownership-filtered fallback candidates must flow through the unique identity classifier');
  assert(recovery.includes('WebClipLocalDownloadIdentity?.chooseUniqueBoundDownloadForReceipt'), 'P1-087/P0-072: bound downloadId reconciliation must use the strict receipt identity authority');
  assert(recovery.includes('extensionId: chrome.runtime.id'), 'P1-087/P0-072: bound identity proof must receive the current extension id');
  assert(!recovery.includes('matches.find(isOwnExtensionDownload) || null'), 'P1-087/P0-072: restart recovery must not depend unconditionally on byExtensionId');

  const identityContext = { globalThis: null };
  identityContext.globalThis = identityContext;
  vm.createContext(identityContext);
  vm.runInContext(localDownloadIdentity, identityContext, { filename: 'local-download-identity.js' });
  const boundGuard = identityContext.WebClipLocalDownloadIdentity;
  const blobUrl = 'blob:chrome-extension://webclip-extension-id/exact-bound';
  const receipt = {
    downloadId: 87,
    kind: 'download',
    downloadAdmissionPhase: 'admitted-unknown',
    blobUrl
  };
  const foreignBound = boundGuard.chooseUniqueBoundDownloadForReceipt({
    receipt,
    downloads: [{ id: 87, byExtensionId: 'other-extension-id', url: blobUrl, finalUrl: blobUrl }],
    extensionId: 'webclip-extension-id'
  });
  assert.strictEqual(foreignBound.download, null, 'P1-087: present foreign byExtensionId must fail closed even when weaker evidence matches');
  const restartedBound = boundGuard.chooseUniqueBoundDownloadForReceipt({
    receipt,
    downloads: [{ id: 87, url: blobUrl, finalUrl: blobUrl }],
    extensionId: 'webclip-extension-id'
  });
  assert.strictEqual(restartedBound.download.id, 87, 'P1-087/P0-072: exact bound WebClip Blob identity may recover when byExtensionId is absent');

  const expectedFilename = 'same.pdf';
  const expectedBytes = 12345;
  const candidates = [
    { id: 10, byExtensionId: 'other-extension-id', filename: `/tmp/${expectedFilename}`, totalBytes: expectedBytes },
    { id: 11, byExtensionId: 'webclip-extension-id', filename: `/tmp/${expectedFilename}`, totalBytes: expectedBytes }
  ];
  const selected = candidates.filter(context.isOwn).find((candidate) => {
    const filename = String(candidate.filename || '').replace(/\\/g, '/').split('/').pop() || '';
    const bytes = Math.max(0, Number(candidate.fileSize || 0), Number(candidate.totalBytes || 0));
    return filename === expectedFilename && bytes === expectedBytes;
  });
  assert.strictEqual(selected.id, 11, 'foreign identical filename/size candidate must never win recovery fallback');
  assert.strictEqual(candidates.slice(0, 1).filter(context.isOwn).length, 0, 'foreign-only candidate set must remain unmatched');
}

(async () => {
  await testP1086BatchWaitsForTransactionComplete();
  testP1086RevisionUsesCompletionBoundedHelper();
  testP1087OwnExtensionIdentityGate();
  console.log('PASS P1-086/P1-087 readonly completion and download identity');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
