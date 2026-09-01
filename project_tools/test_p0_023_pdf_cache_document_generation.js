'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const guardSource = fs.readFileSync(path.join(ROOT, 'pdf-cache-document-generation-guard.js'), 'utf8');

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
    }
  };
}

function makeContext(sharedStorage = new Map()) {
  const listeners = [];
  const context = {
    console,
    Date,
    setTimeout,
    clearTimeout,
    chrome: {
      runtime: { onMessage: { addListener(listener) { listeners.push(listener); } } },
      storage: { session: makeStorageSession(sharedStorage) }
    },
    __listeners: listeners
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(guardSource, context, { filename: 'pdf-cache-document-generation-guard.js' });
  assert.equal(context.WebClipPdfCacheDocumentGenerationGuard.installObserver().installed, true);
  return context;
}

function installProductFixture(context) {
  const calls = [];
  let generationCached = true;
  context.generatePdfAndUploadToYandex = async (tabId) => {
    calls.push({ fn: 'generate', tabId });
    return { ok: false, cached: generationCached, filename: generationCached ? 'cached.pdf' : '' };
  };
  context.retryCachedPdfUploadToYandex = async (tabId) => {
    calls.push({ fn: 'retry', tabId });
    return { ok: true, reusedCachedPdf: true };
  };
  context.downloadCachedPdf = async (tabId) => {
    calls.push({ fn: 'download', tabId });
    return { ok: true, downloadedCachedPdf: true };
  };
  context.deleteCachedPdf = async (tabId) => {
    calls.push({ fn: 'delete', tabId });
    return true;
  };

  context.chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const tabId = sender?.tab?.id;
    const run = async () => {
      switch (message?.type) {
        case 'WEBCLIP_SEND_PDF_TO_YANDEX': return context.generatePdfAndUploadToYandex(tabId);
        case 'WEBCLIP_RETRY_PDF_TO_YANDEX': return context.retryCachedPdfUploadToYandex(tabId);
        case 'WEBCLIP_DOWNLOAD_CACHED_PDF': return context.downloadCachedPdf(tabId);
        case 'WEBCLIP_INVALIDATE_PDF_CACHE': await context.deleteCachedPdf(tabId); return { ok: true };
        default: return { ok: true };
      }
    };
    run().then((value) => sendResponse(value), (error) => sendResponse({ ok: false, code: error?.code || '', error: error?.message || String(error) }));
    return true;
  });

  assert.equal(context.WebClipPdfCacheDocumentGenerationGuard.installFunctionGuards(context).installed, true);
  return { calls, setGenerationCached(value) { generationCached = Boolean(value); } };
}

function dispatch(context, message, sender) {
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
      for (const listener of context.__listeners) listener(message, sender, sendResponse);
    } catch (error) {
      clearTimeout(timer);
      reject(error);
    }
  });
}

async function run() {
  const shared = new Map();
  let context = makeContext(shared);
  let fixture = installProductFixture(context);
  let guard = context.WebClipPdfCacheDocumentGenerationGuard;
  const docA = { tab: { id: 41 }, documentId: 'document-A', url: 'https://example.test/same' };
  const docB = { tab: { id: 41 }, documentId: 'document-B', url: 'https://example.test/same' };

  let result = await dispatch(context, { type: 'WEBCLIP_RETRY_PDF_TO_YANDEX' }, docA);
  assert.equal(result?.code, 'WEBCLIP_PDF_CACHE_DOCUMENT_RECEIPT_MISSING');
  assert.equal(fixture.calls.length, 0, 'retry without receipt must be rejected before product function');

  result = await dispatch(context, { type: 'WEBCLIP_SEND_PDF_TO_YANDEX' }, docA);
  assert.equal(result?.cached, true);
  assert.equal(fixture.calls.at(-1)?.fn, 'generate');
  assert.equal((await guard.readReceipt(41))?.documentId, 'document-A');

  result = await dispatch(context, { type: 'WEBCLIP_RETRY_PDF_TO_YANDEX' }, docA);
  assert.equal(result?.ok, true);
  const callsAfterA = fixture.calls.length;

  result = await dispatch(context, { type: 'WEBCLIP_RETRY_PDF_TO_YANDEX' }, docB);
  assert.equal(result?.code, 'WEBCLIP_PDF_CACHE_DOCUMENT_MISMATCH');
  assert.equal(fixture.calls.length, callsAfterA, 'same-URL replacement must be rejected before product retry');

  fixture.setGenerationCached(false);
  result = await dispatch(context, { type: 'WEBCLIP_SEND_PDF_TO_YANDEX' }, docB);
  assert.equal(result?.cached, false);
  assert.equal(await guard.readReceipt(41), null, 'failed new generation must not retarget old receipt');
  result = await dispatch(context, { type: 'WEBCLIP_RETRY_PDF_TO_YANDEX' }, docB);
  assert.equal(result?.code, 'WEBCLIP_PDF_CACHE_DOCUMENT_RECEIPT_MISSING');

  fixture.setGenerationCached(true);
  result = await dispatch(context, { type: 'WEBCLIP_SEND_PDF_TO_YANDEX' }, docB);
  assert.equal(result?.cached, true);
  result = await dispatch(context, { type: 'WEBCLIP_DOWNLOAD_CACHED_PDF' }, docB);
  assert.equal(result?.ok, true);
  assert.equal((await guard.readReceipt(41))?.documentId, 'document-B');

  // Simulated MV3 restart: durable receipt survives a fresh JS global.
  context = makeContext(shared);
  fixture = installProductFixture(context);
  guard = context.WebClipPdfCacheDocumentGenerationGuard;
  result = await dispatch(context, { type: 'WEBCLIP_RETRY_PDF_TO_YANDEX' }, docB);
  assert.equal(result?.ok, true, 'durable receipt must survive worker-global restart');
  assert.equal(fixture.calls.at(-1)?.fn, 'retry');
  result = await dispatch(context, { type: 'WEBCLIP_RETRY_PDF_TO_YANDEX' }, docA);
  assert.equal(result?.code, 'WEBCLIP_PDF_CACHE_DOCUMENT_MISMATCH');

  result = await dispatch(context, { type: 'WEBCLIP_INVALIDATE_PDF_CACHE' }, docB);
  assert.equal(result?.ok, true);
  assert.equal(await guard.readReceipt(41), null, 'physical cache deletion must clear document receipt');

  const bootstrap = fs.readFileSync(path.join(ROOT, 'service-worker-bootstrap.js'), 'utf8');
  const manifest = fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8');
  assert.ok(bootstrap.indexOf("importScripts('pdf-cache-document-generation-guard.js')") < bootstrap.indexOf("importScripts('service-worker.js')"),
    'guard source must load before product service worker');
  assert.ok(bootstrap.indexOf('installObserver') < bootstrap.indexOf("importScripts('service-worker.js')"),
    'sender observer must register before product listener');
  assert.ok(bootstrap.indexOf('installFunctionGuards') > bootstrap.indexOf("importScripts('service-worker.js')"),
    'product cache functions must be wrapped after they are defined');
  assert.match(manifest, /"service_worker"\s*:\s*"service-worker-bootstrap\.js"/);

  const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
  assert.match(worker, /function pdfCacheKey\(tabId\)\s*\{\s*return `tab:\$\{tabId\}`;/,
    'P0-023 guard remains necessary while product cache storage is tab-scoped');
  assert.match(worker, /currentUrl !== cachedUrl/,
    'URL equality remains a secondary cache check, not the generation authority');

  console.log('P0-023 PDF retry-cache document generation: PASS');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
