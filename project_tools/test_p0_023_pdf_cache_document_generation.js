'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'pdf-cache-document-generation-guard.js'), 'utf8');

function makeStorageSession(shared = new Map()) {
  return {
    async get(key) {
      if (typeof key === 'string') return shared.has(key) ? { [key]: structuredClone(shared.get(key)) } : {};
      return {};
    },
    async set(values) {
      for (const [key, value] of Object.entries(values || {})) shared.set(key, structuredClone(value));
    },
    async remove(key) {
      for (const item of Array.isArray(key) ? key : [key]) shared.delete(item);
    },
    _shared: shared
  };
}

function makeContext(sharedStorage = new Map()) {
  const nativeListeners = [];
  const event = {
    addListener(listener) { nativeListeners.push(listener); },
    removeListener(listener) {
      const index = nativeListeners.indexOf(listener);
      if (index >= 0) nativeListeners.splice(index, 1);
    },
    hasListener(listener) { return nativeListeners.includes(listener); }
  };
  const context = {
    console,
    setTimeout,
    clearTimeout,
    Date,
    chrome: {
      runtime: { onMessage: event },
      storage: { session: makeStorageSession(sharedStorage) }
    },
    __nativeListeners: nativeListeners
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'pdf-cache-document-generation-guard.js' });
  assert.equal(context.__webclipPdfCacheDocumentGenerationInstallResult?.installed, true);
  return context;
}

function dispatch(listener, message, sender) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) reject(new Error(`message did not settle: ${message.type}`));
    }, 1000);
    const sendResponse = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    try {
      const result = listener(message, sender, sendResponse);
      if (result !== true && !settled) {
        settled = true;
        clearTimeout(timer);
        resolve(undefined);
      }
    } catch (error) {
      clearTimeout(timer);
      reject(error);
    }
  });
}

async function run() {
  const shared = new Map();
  let context = makeContext(shared);
  const calls = [];
  let generationResult = { ok: false, cached: true, filename: 'doc-a.pdf' };

  context.chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    calls.push({ type: message.type, tabId: sender?.tab?.id, documentId: sender?.documentId });
    if (message.type === 'WEBCLIP_SEND_PDF_TO_YANDEX') {
      sendResponse({ ...generationResult });
      return false;
    }
    if (message.type === 'WEBCLIP_RETRY_PDF_TO_YANDEX' || message.type === 'WEBCLIP_DOWNLOAD_CACHED_PDF') {
      sendResponse({ ok: true, reusedCachedPdf: true });
      return false;
    }
    if (message.type === 'WEBCLIP_INVALIDATE_PDF_CACHE') {
      sendResponse({ ok: true });
      return false;
    }
    sendResponse({ ok: true, passthrough: true });
    return false;
  });
  assert.equal(context.__nativeListeners.length, 1, 'product listener must register through generation guard');
  let listener = context.__nativeListeners[0];
  const docA = { tab: { id: 41 }, documentId: 'document-A', url: 'https://example.test/same' };
  const docB = { tab: { id: 41 }, documentId: 'document-B', url: 'https://example.test/same' };

  let result = await dispatch(listener, { type: 'WEBCLIP_RETRY_PDF_TO_YANDEX' }, docA);
  assert.equal(result?.code, 'WEBCLIP_PDF_CACHE_DOCUMENT_RECEIPT_MISSING');
  assert.equal(calls.length, 0, 'retry without durable receipt must be rejected before product handler');

  result = await dispatch(listener, { type: 'WEBCLIP_SEND_PDF_TO_YANDEX' }, docA);
  assert.equal(result?.cached, true);
  assert.equal(calls.length, 1);
  const receipt = await context.WebClipPdfCacheDocumentGenerationGuard.readReceipt(41);
  assert.equal(receipt?.documentId, 'document-A');

  result = await dispatch(listener, { type: 'WEBCLIP_RETRY_PDF_TO_YANDEX' }, docA);
  assert.equal(result?.ok, true);
  assert.equal(calls.length, 2, 'same document generation must reach retry handler');

  result = await dispatch(listener, { type: 'WEBCLIP_RETRY_PDF_TO_YANDEX' }, docB);
  assert.equal(result?.code, 'WEBCLIP_PDF_CACHE_DOCUMENT_MISMATCH');
  assert.equal(calls.length, 2, 'same-URL replacement document must be rejected before retry handler');

  generationResult = { ok: false, cached: false, error: 'new generation failed before cache commit' };
  result = await dispatch(listener, { type: 'WEBCLIP_SEND_PDF_TO_YANDEX' }, docB);
  assert.equal(result?.cached, false);
  assert.equal(calls.length, 3);
  assert.equal(await context.WebClipPdfCacheDocumentGenerationGuard.readReceipt(41), null,
    'failed new generation must not retarget the old cache receipt');
  result = await dispatch(listener, { type: 'WEBCLIP_RETRY_PDF_TO_YANDEX' }, docB);
  assert.equal(result?.code, 'WEBCLIP_PDF_CACHE_DOCUMENT_RECEIPT_MISSING');
  assert.equal(calls.length, 3);

  generationResult = { ok: false, cached: true, filename: 'doc-b.pdf' };
  result = await dispatch(listener, { type: 'WEBCLIP_SEND_PDF_TO_YANDEX' }, docB);
  assert.equal(result?.cached, true);
  result = await dispatch(listener, { type: 'WEBCLIP_DOWNLOAD_CACHED_PDF' }, docB);
  assert.equal(result?.ok, true);
  assert.equal(calls.at(-1).documentId, 'document-B');

  // Simulated MV3 worker restart: a fresh guard/context sees the same
  // chrome.storage.session receipt, so admission does not depend on RAM state.
  context = makeContext(shared);
  let restartedCalls = 0;
  context.chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    restartedCalls += 1;
    sendResponse({ ok: true, type: message.type, documentId: sender.documentId });
    return false;
  });
  listener = context.__nativeListeners[0];
  result = await dispatch(listener, { type: 'WEBCLIP_RETRY_PDF_TO_YANDEX' }, docB);
  assert.equal(result?.ok, true);
  assert.equal(restartedCalls, 1, 'receipt must survive a worker-global restart');
  result = await dispatch(listener, { type: 'WEBCLIP_RETRY_PDF_TO_YANDEX' }, docA);
  assert.equal(result?.code, 'WEBCLIP_PDF_CACHE_DOCUMENT_MISMATCH');
  assert.equal(restartedCalls, 1);

  result = await dispatch(listener, { type: 'WEBCLIP_INVALIDATE_PDF_CACHE' }, docB);
  assert.equal(result?.ok, true);
  assert.equal(await context.WebClipPdfCacheDocumentGenerationGuard.readReceipt(41), null);

  const missingDoc = { tab: { id: 41 }, url: 'https://example.test/same' };
  result = await dispatch(listener, { type: 'WEBCLIP_SEND_PDF_TO_YANDEX' }, missingDoc);
  assert.equal(result?.code, 'WEBCLIP_PDF_CACHE_DOCUMENT_ID_REQUIRED');
  assert.equal(restartedCalls, 2, 'only invalidate should have reached the restarted product listener');

  const bootstrap = fs.readFileSync(path.join(ROOT, 'journal-text-filter.js'), 'utf8');
  assert.match(bootstrap, /importScripts\([^\n]*'pdf-cache-document-generation-guard\.js'[^\n]*\)/,
    'worker bootstrap must install P0-023 guard before service-worker listener registration');

  const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
  assert.match(worker, /function pdfCacheKey\(tabId\)\s*\{\s*return `tab:\$\{tabId\}`;/,
    'P0-023 guard remains necessary while retry cache is tab-scoped');
  assert.match(worker, /currentUrl !== cachedUrl/,
    'current product cache validation still uses URL equality as a secondary check');

  console.log('P0-023 PDF retry-cache document generation: PASS');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
