'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const GUARD_PATH = path.join(ROOT, 'offscreen-blob-admission-guard.js');
const OFFSCREEN_PATH = path.join(ROOT, 'offscreen.js');
const HTML_PATH = path.join(ROOT, 'offscreen.html');
const BOOTSTRAP_PATH = path.join(ROOT, 'offscreen-bootstrap.js');

function makeContext() {
  const nativeListeners = [];
  const revoked = [];
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
    chrome: { runtime: { onMessage: event } },
    URL: {
      revokeObjectURL(url) { revoked.push(String(url)); }
    },
    __nativeListeners: nativeListeners,
    __revoked: revoked
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(GUARD_PATH, 'utf8'), context, { filename: 'offscreen-blob-admission-guard.js' });
  assert.equal(context.__webclipOffscreenBlobAdmissionInstallResult?.installed, true, 'guard must install before offscreen listener registration');
  return context;
}

(function testUtf8PreflightAndActiveRelease() {
  const context = makeContext();
  const guard = context.WebClipOffscreenBlobAdmissionGuard;
  assert.equal(guard.utf8ByteLengthBounded('abc'), 3);
  assert.equal(guard.utf8ByteLengthBounded('Ж'), 2);
  assert.equal(guard.utf8ByteLengthBounded('😀'), 4);
  assert.equal(guard.utf8ByteLengthBounded('a😀Ж'), 7);

  const snapshots = [];
  let materializations = 0;
  context.chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    snapshots.push({ type: message.type, snapshot: { ...guard.snapshot() } });
    materializations += 1;
    const size = message.type === 'WEBCLIP_CREATE_TEXT_BLOB_URL'
      ? guard.utf8ByteLengthBounded(String(message.text || ''))
      : Math.max(0, Number(message.actualSize) || 0);
    sendResponse({ ok: true, url: `blob:test-${materializations}`, size });
    return false;
  });
  assert.equal(context.__nativeListeners.length, 1, 'product listener must be registered through wrapped boundary');

  let response = null;
  context.__nativeListeners[0]({ target: 'offscreen', type: 'WEBCLIP_CREATE_TEXT_BLOB_URL', text: 'a😀Ж' }, {}, (value) => { response = value; });
  assert.equal(response?.ok, true);
  assert.equal(snapshots[0].snapshot.pendingCount, 1, 'reservation must exist before handler/materialization');
  assert.equal(snapshots[0].snapshot.pendingBytes, 7, 'UTF-8 bytes must be reserved before handler/materialization');
  assert.equal(materializations, 1);
  assert.deepEqual({ ...guard.snapshot() }, { pendingCount: 0, activeCount: 1, pendingBytes: 0, activeBytes: 7, totalCount: 1, totalBytes: 7 });

  context.URL.revokeObjectURL(response.url);
  assert.deepEqual({ ...guard.snapshot() }, { pendingCount: 0, activeCount: 0, pendingBytes: 0, activeBytes: 0, totalCount: 0, totalBytes: 0 });
  assert.deepEqual(Array.from(context.__revoked), [response.url]);
})();

(function testByteAdmissionRejectsBeforeHandler() {
  const context = makeContext();
  const guard = context.WebClipOffscreenBlobAdmissionGuard;
  const held = [];
  let handlerCalls = 0;
  context.chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    handlerCalls += 1;
    assert.equal(guard.snapshot().pendingCount, handlerCalls, 'each held request must already own admission before handler entry');
    held.push(sendResponse);
    return true;
  });
  const listener = context.__nativeListeners[0];
  for (let i = 0; i < 4; i += 1) {
    let immediate = null;
    const result = listener({ target: 'offscreen', type: 'WEBCLIP_CREATE_STAGED_TEXT_BLOB_URL', payloadKey: `k${i}` }, {}, (value) => { immediate = value; });
    assert.equal(result, true);
    assert.equal(immediate, null);
  }
  assert.equal(guard.snapshot().pendingBytes, 256 * 1024 * 1024, 'four staged reservations must consume the full byte envelope before materialization');
  let rejected = null;
  const result = listener({ target: 'offscreen', type: 'WEBCLIP_CREATE_STAGED_TEXT_BLOB_URL', payloadKey: 'overflow' }, {}, (value) => { rejected = value; });
  assert.equal(result, false);
  assert.equal(rejected?.code, 'OFFSCREEN_BLOB_BUDGET_EXCEEDED');
  assert.equal(handlerCalls, 4, 'over-budget request must be rejected before product handler/materialization');
  for (const respond of held) respond({ ok: false, error: 'test release' });
  assert.equal(guard.snapshot().totalBytes, 0);
  assert.equal(guard.snapshot().totalCount, 0);
})();

(function testCountAdmissionRejectsBeforeHandler() {
  const context = makeContext();
  const guard = context.WebClipOffscreenBlobAdmissionGuard;
  let handlerCalls = 0;
  const urls = [];
  context.chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    handlerCalls += 1;
    const url = `blob:count-${handlerCalls}`;
    urls.push(url);
    sendResponse({ ok: true, url, size: 1 });
    return false;
  });
  const listener = context.__nativeListeners[0];
  for (let i = 0; i < 12; i += 1) {
    let response = null;
    listener({ target: 'offscreen', type: 'WEBCLIP_CREATE_TEXT_BLOB_URL', text: 'x' }, {}, (value) => { response = value; });
    assert.equal(response?.ok, true);
  }
  assert.equal(guard.snapshot().activeCount, 12);
  let rejected = null;
  listener({ target: 'offscreen', type: 'WEBCLIP_CREATE_TEXT_BLOB_URL', text: 'x' }, {}, (value) => { rejected = value; });
  assert.equal(rejected?.code, 'OFFSCREEN_BLOB_BUDGET_EXCEEDED');
  assert.equal(handlerCalls, 12, '13th Blob must be rejected before product handler/materialization');
  for (const url of urls) context.URL.revokeObjectURL(url);
  assert.equal(guard.snapshot().totalCount, 0);
})();

(function testCurrentSourceBoundaryAndBootstrap() {
  const offscreen = fs.readFileSync(OFFSCREEN_PATH, 'utf8');
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const bootstrap = fs.readFileSync(BOOTSTRAP_PATH, 'utf8');
  const guard = fs.readFileSync(GUARD_PATH, 'utf8');

  assert.match(offscreen, /const MAX_ACTIVE_BLOB_URLS = 12;/);
  assert.match(offscreen, /const MAX_ACTIVE_BLOB_BYTES = 256 \* 1024 \* 1024;/);
  assert.match(offscreen, /const MAX_PDF_BASE64_CHARS = 64 \* 1024 \* 1024;/);
  assert.match(offscreen, /const MAX_TRANSFER_BYTES = 64 \* 1024 \* 1024;/);
  assert.match(guard, /const MAX_ACTIVE_BLOB_URLS = 12;/);
  assert.match(guard, /const MAX_ACTIVE_BLOB_BYTES = 256 \* 1024 \* 1024;/);
  assert.match(guard, /const MAX_PDF_BASE64_CHARS = 64 \* 1024 \* 1024;/);
  assert.match(guard, /const MAX_TRANSFER_BYTES = 64 \* 1024 \* 1024;/);

  const pdfHandler = offscreen.match(/if \(message\.type === 'WEBCLIP_CREATE_PDF_CACHE_BLOB_URL'\)[\s\S]*?return true;/)?.[0] || '';
  const textHandler = offscreen.match(/if \(message\.type === 'WEBCLIP_CREATE_TEXT_BLOB_URL'\)[\s\S]*?return false;/)?.[0] || '';
  const stagedHandler = offscreen.match(/if \(message\.type === 'WEBCLIP_CREATE_STAGED_TEXT_BLOB_URL'\)[\s\S]*?return true;/)?.[0] || '';
  assert.ok(pdfHandler.indexOf('cachedPdfRecordToBlob(record)') >= 0 && pdfHandler.indexOf('cachedPdfRecordToBlob(record)') < pdfHandler.indexOf('registerBlobUrl(blob)'), 'PDF handler still materializes before its legacy post-check; guard must therefore remain pre-listener');
  assert.ok(textHandler.indexOf('new Blob([text]') >= 0 && textHandler.indexOf('new Blob([text]') < textHandler.indexOf('registerBlobUrl(blob)'), 'text handler still materializes before legacy post-check');
  assert.ok(stagedHandler.indexOf('getTransferChunkedBlob') >= 0 && stagedHandler.indexOf('getTransferChunkedBlob') < stagedHandler.indexOf('registerBlobUrl(blob)'), 'staged handler still materializes before legacy post-check');

  const guardPos = html.indexOf('offscreen-blob-admission-guard.js');
  const bootstrapPos = html.indexOf('offscreen-bootstrap.js');
  assert.ok(guardPos >= 0 && bootstrapPos > guardPos, 'offscreen guard must load before fail-closed bootstrap');
  assert.equal(html.includes('<script src="offscreen.js"></script>'), false, 'offscreen runtime must not bypass fail-closed bootstrap');
  assert.match(bootstrap, /if \(!result\?\.installed\)/);
  assert.match(bootstrap, /script\.src = 'offscreen\.js'/);
})();

console.log('P0-065 offscreen pre-Blob admission: PASS');
