'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const workerSource = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`missing source markers: ${startMarker} -> ${endMarker}`);
  return source.slice(start, end);
}

const helperSource = section(
  workerSource,
  'function makePdfRenderNavigationError',
  'async function generatePdfBlob(tabId) {'
);
const sandbox = {
  Error,
  Number,
  Math,
  Object,
  String,
  Set,
  Map,
};
sandbox.globalThis = sandbox;
vm.runInNewContext(`${helperSource}
this.createFenceForTest = createPdfRenderNavigationFence;`, sandbox, {
  filename: 'service-worker.js#p0-070-navigation-fence'
});
const createFence = sandbox.createFenceForTest;
assert.equal(typeof createFence, 'function');

function makeEventApi() {
  const listeners = new Set();
  return {
    listeners,
    addListener(listener) { listeners.add(listener); },
    removeListener(listener) {
      if (!listeners.has(listener)) throw new Error('removing unknown listener');
      listeners.delete(listener);
    },
    emit(source, method, params = {}) {
      for (const listener of [...listeners]) listener(source, method, params);
    }
  };
}

function throwsCode(fn, code) {
  assert.throws(fn, (error) => error && error.code === code);
}

let checks = 0;
function check(name, fn) {
  fn();
  checks += 1;
}

// Production-source ordering: listener is installed immediately after attach,
// main-frame identity is established before native print, and stale evidence is
// checked while stream bytes are still provisional.
const generateSource = section(
  workerSource,
  'async function generatePdfBlob(tabId) {',
  'let yandexConfigStorageSettlementChain'
);
const orderedMarkers = [
  'await attachDebuggerBounded(debuggee)',
  'navigationFence = createPdfRenderNavigationFence',
  'navigationFence.install()',
  "chrome.debugger.sendCommand(debuggee, 'Page.enable')",
  "chrome.debugger.sendCommand(debuggee, 'Page.getFrameTree')",
  'navigationFence.arm(mainFrame)',
  "chrome.debugger.sendCommand(debuggee, 'Emulation.setEmulatedMedia'",
  "chrome.debugger.sendCommand(debuggee, 'Page.printToPDF'",
  'navigationFence.assertClean();\n      const data = String(chunk?.data || \'\');',
  'navigationFence.dispose()',
  'await detachDebuggerBounded(debuggee)'
];
let last = -1;
for (const marker of orderedMarkers) {
  const index = generateSource.indexOf(marker);
  assert(index > last, `production ordering marker missing/drifted: ${marker}`);
  last = index;
  checks += 1;
}

check('manifest does not add webNavigation for P0-070', () => {
  const permissions = new Set([...(manifest.permissions || []), ...(manifest.optional_permissions || [])]);
  assert.equal(permissions.has('webNavigation'), false);
});

check('stable main frame stays clean', () => {
  const onEvent = makeEventApi();
  const fence = createFence({ onEvent }, { tabId: 7 });
  assert.equal(fence.install(), true);
  assert.equal(fence.arm('main-A'), 'main-A');
  onEvent.emit({ tabId: 7 }, 'Page.frameStartedNavigating', { frameId: 'child-1' });
  onEvent.emit({ tabId: 8 }, 'Page.frameStartedNavigating', { frameId: 'main-A' });
  assert.equal(fence.assertClean(), true);
  assert.equal(fence.snapshot().stale, false);
  assert.equal(fence.dispose(), true);
  assert.equal(onEvent.listeners.size, 0);
});

check('delayed baseline frameNavigated with the admitted loader stays clean', () => {
  const onEvent = makeEventApi();
  const fence = createFence({ onEvent }, { tabId: 10 });
  fence.install();
  fence.arm({ id: 'main-A', loaderId: 'loader-A' });
  onEvent.emit({ tabId: 10 }, 'Page.frameNavigated', {
    frame: { id: 'main-A', loaderId: 'loader-A', url: 'https://example.test/a' }
  });
  assert.equal(fence.assertClean(), true);
  assert.equal(fence.snapshot().mainLoaderId, 'loader-A');
  onEvent.emit({ tabId: 10 }, 'Page.frameNavigated', {
    frame: { id: 'main-A', loaderId: 'loader-B', url: 'https://example.test/b' }
  });
  throwsCode(() => fence.assertClean(), 'WEBCLIP_PDF_SOURCE_NAVIGATED');
  fence.dispose();
});

check('main navigation start is monotonic stale evidence', () => {
  const onEvent = makeEventApi();
  const fence = createFence({ onEvent }, { tabId: 11 });
  fence.install();
  fence.arm('main-A');
  onEvent.emit({ tabId: 11 }, 'Page.frameStartedNavigating', { frameId: 'main-A', url: 'https://example.test/b' });
  throwsCode(() => fence.assertClean(), 'WEBCLIP_PDF_SOURCE_NAVIGATED');
  onEvent.emit({ tabId: 11 }, 'Page.frameNavigated', { frame: { id: 'main-A', url: 'https://example.test/a' } });
  assert.equal(fence.snapshot().stale, true, 'return to A must not clear stale evidence');
  fence.dispose();
});

check('same-document navigation is stale', () => {
  const onEvent = makeEventApi();
  const fence = createFence({ onEvent }, { tabId: 12 });
  fence.install();
  fence.arm('main-A');
  onEvent.emit({ tabId: 12 }, 'Page.navigatedWithinDocument', { frameId: 'main-A', url: 'https://example.test/a#new' });
  throwsCode(() => fence.assertClean(), 'WEBCLIP_PDF_SOURCE_NAVIGATED');
  fence.dispose();
});

check('committed main navigation is stale', () => {
  const onEvent = makeEventApi();
  const fence = createFence({ onEvent }, { tabId: 13 });
  fence.install();
  fence.arm('main-A');
  onEvent.emit({ tabId: 13 }, 'Page.frameNavigated', { frame: { id: 'main-A', url: 'https://example.test/b' } });
  assert.equal(fence.snapshot().staleMethod, 'Page.frameNavigated');
  throwsCode(() => fence.assertClean(), 'WEBCLIP_PDF_SOURCE_NAVIGATED');
  fence.dispose();
});

check('unarmed baseline frameNavigated snapshot is not navigation evidence', () => {
  const onEvent = makeEventApi();
  const fence = createFence({ onEvent }, { tabId: 141 });
  fence.install();
  onEvent.emit({ tabId: 141 }, 'Page.frameNavigated', { frame: { id: 'main-A', url: 'https://example.test/a' } });
  assert.equal(fence.snapshot().bufferedEvents, 0);
  fence.arm('main-A');
  assert.equal(fence.assertClean(), true);
  fence.dispose();
});

check('event buffered before main-frame arm is replayed', () => {
  const onEvent = makeEventApi();
  const fence = createFence({ onEvent }, { tabId: 14 });
  fence.install();
  onEvent.emit({ tabId: 14 }, 'Page.frameStartedNavigating', { frameId: 'main-A' });
  assert.equal(fence.snapshot().bufferedEvents, 1);
  fence.arm('main-A');
  assert.equal(fence.snapshot().bufferedEvents, 0);
  throwsCode(() => fence.assertClean(), 'WEBCLIP_PDF_SOURCE_NAVIGATED');
  fence.dispose();
});

check('buffered child event is ignored after arm', () => {
  const onEvent = makeEventApi();
  const fence = createFence({ onEvent }, { tabId: 15 });
  fence.install();
  onEvent.emit({ tabId: 15 }, 'Page.frameStartedNavigating', { frameId: 'child-A' });
  fence.arm('main-A');
  assert.equal(fence.assertClean(), true);
  fence.dispose();
});

check('main frame identity cannot be rebound', () => {
  const onEvent = makeEventApi();
  const fence = createFence({ onEvent }, { tabId: 16 });
  fence.install();
  fence.arm('main-A');
  fence.arm('main-B');
  throwsCode(() => fence.assertClean(), 'WEBCLIP_PDF_SOURCE_NAVIGATED');
  assert.equal(fence.snapshot().staleMethod, 'WEBCLIP_PDF_MAIN_FRAME_CHANGED');
  fence.dispose();
});

check('missing main frame fails closed', () => {
  const onEvent = makeEventApi();
  const fence = createFence({ onEvent }, { tabId: 17 });
  fence.install();
  throwsCode(() => fence.arm(''), 'WEBCLIP_PDF_MAIN_FRAME_REQUIRED');
  fence.dispose();
});

check('missing debugger event API fails closed', () => {
  throwsCode(
    () => createFence({}, { tabId: 18 }),
    'WEBCLIP_PDF_NAVIGATION_FENCE_UNAVAILABLE'
  );
});

check('buffer overflow fails closed rather than dropping navigation evidence', () => {
  const onEvent = makeEventApi();
  const fence = createFence({ onEvent }, { tabId: 19 }, 8);
  fence.install();
  for (let i = 0; i < 9; i += 1) {
    onEvent.emit({ tabId: 19 }, 'Page.frameStartedNavigating', { frameId: `child-${i}` });
  }
  throwsCode(() => fence.assertClean(), 'WEBCLIP_PDF_SOURCE_NAVIGATED');
  assert.equal(fence.snapshot().staleMethod, 'WEBCLIP_PDF_NAVIGATION_EVENT_OVERFLOW');
  fence.dispose();
});

check('dispose is idempotent and removes the exact listener', () => {
  const onEvent = makeEventApi();
  const fence = createFence({ onEvent }, { tabId: 20 });
  fence.install();
  assert.equal(onEvent.listeners.size, 1);
  assert.equal(fence.dispose(), true);
  assert.equal(fence.dispose(), false);
  assert.equal(onEvent.listeners.size, 0);
});

assert.match(workerSource, /Page\.frameStartedNavigating/, 'production fence must observe navigation start');
assert.match(workerSource, /Page\.frameNavigated/, 'production fence must observe committed main-frame navigation');
assert.match(workerSource, /Page\.navigatedWithinDocument/, 'production fence must observe same-document navigation');
assert.match(workerSource, /Page\.getFrameTree/, 'production render path must resolve the exact main CDP frame');
checks += 4;

console.log(`P0-070 render-window navigation fence: PASS; checks=${checks}; main_frame_only=true; navigation_start=true; same_document=true; buffered_pre_arm=true; no_webNavigation=true`);
