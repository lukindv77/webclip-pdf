'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

let checks = 0;
function check(value, message) { assert.ok(value, message); checks += 1; }
function equal(actual, expected, message) { assert.equal(actual, expected, message); checks += 1; }

const root = path.resolve(__dirname, '..');
const guardSource = fs.readFileSync(path.join(root, 'content-generation-guard.js'), 'utf8');
const entrySource = fs.readFileSync(path.join(root, 'service-worker-entry.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

// Static integration controls: the mature monolith stays untouched and the
// entry point deterministically composes the guard before content.js.
check(entrySource.includes("importScripts('service-worker.js')"), 'entry imports mature worker');
check(entrySource.includes("files: ['content-generation-guard.js', 'content.js']"), 'guard is injected before content');
check(entrySource.includes('onHistoryStateUpdated.addListener'), 'history-state navigation is observed');
check(entrySource.includes('onReferenceFragmentUpdated.addListener'), 'fragment navigation is observed');
check(manifest.permissions.includes('webNavigation'), 'webNavigation permission declared');
equal(manifest.background.service_worker, 'service-worker-entry.js', 'entry worker is canonical background');

// The guard intentionally protects both command admission and the later
// privileged message so a confirmation cannot span a route/selection change.
for (const command of ['finish', 'download', 'yandex']) {
  check(guardSource.includes(`'${command}'`), `${command} command fenced`);
}
for (const type of ['WEBCLIP_GENERATE_PDF', 'WEBCLIP_SEND_PDF_TO_YANDEX']) {
  check(guardSource.includes(`'${type}'`), `${type} commit fenced`);
}
check(guardSource.includes('WEBCLIP_SAVE_CONFIRMATION_STALE'), 'confirmation mismatch has fail-closed code');
check(guardSource.includes('WEBCLIP_SELECTION_STALE'), 'disconnected selection has fail-closed code');
check(guardSource.includes('WEBCLIP_APPLICATION_GENERATION_STALE'), 'application-generation mismatch has fail-closed code');
check(guardSource.includes('WEBCLIP_SELECTION_RECEIPT_UNKNOWN'), 'untracked live selection fails closed');
check(guardSource.includes("command === 'clear'"), 'clear invalidates admission');
check(guardSource.includes("command === 'start'"), 'start invalidates admission');

// Execute service-worker-entry.js in a deterministic VM. The imported mature
// worker is represented by the exact globals the entry is allowed to reuse.
const injected = [];
const forwarded = [];
const listeners = { history: null, fragment: null };
const workerContext = {
  importScripts(file) {
    equal(file, 'service-worker.js', 'entry imports only service-worker.js');
    workerContext.SCRIPT_EXECUTION_TIMEOUT_MS = 10000;
    workerContext.ensureStorageAccessInitialized = async () => {};
    workerContext.executeScriptSingletonBounded = async (request, options) => { injected.push({ request, options }); };
    workerContext.ensureWebClipContentScript = async () => { throw new Error('old implementation should be replaced'); };
  },
  chrome: {
    tabs: {
      sendMessage(tabId, message, options) {
        forwarded.push({ tabId, message, options });
        return Promise.resolve({ ok: true });
      }
    },
    webNavigation: {
      onHistoryStateUpdated: { addListener(fn) { listeners.history = fn; } },
      onReferenceFragmentUpdated: { addListener(fn) { listeners.fragment = fn; } }
    }
  },
  console
};
workerContext.globalThis = workerContext;
vm.runInNewContext(entrySource, workerContext, { filename: 'service-worker-entry.js' });
check(typeof workerContext.ensureWebClipContentScript === 'function', 'entry installs ensure function');
check(typeof listeners.history === 'function', 'history listener installed');
check(typeof listeners.fragment === 'function', 'fragment listener installed');

(async () => {
  await workerContext.ensureWebClipContentScript(42);
  equal(injected.length, 1, 'one bounded injection');
  equal(injected[0].request.target.tabId, 42, 'target tab preserved');
  equal(injected[0].request.files[0], 'content-generation-guard.js', 'guard injected first');
  equal(injected[0].request.files[1], 'content.js', 'content injected second');
  equal(injected[0].options.requestKey, 'content:42', 'singleton request key preserved');
  equal(injected[0].options.timeoutMs, 10000, 'timeout preserved');

  listeners.history({ tabId: 42, frameId: 0, url: 'https://example.test/b', documentId: 'doc-a' });
  listeners.fragment({ tabId: 42, frameId: 0, url: 'https://example.test/b#x', documentId: 'doc-a' });
  listeners.history({ tabId: 42, frameId: 7, url: 'https://frame.test/b', documentId: 'doc-f' });
  equal(forwarded.length, 2, 'only top-frame application navigation forwarded');
  equal(forwarded[0].message.type, 'WEBCLIP_APPLICATION_NAVIGATION', 'history signal type');
  equal(forwarded[0].message.source, 'history-state', 'history source');
  equal(forwarded[1].message.source, 'reference-fragment', 'fragment source');
  equal(forwarded[0].options.frameId, 0, 'message targets top frame');

  // Source-shape controls for the negative cases captured by P0-080 research.
  check(guardSource.includes('urlChanged || documentChanged'), 'same URL alone does not advance generation');
  check(guardSource.includes('receipt.applicationGeneration !== applicationGeneration'), 'selection stays bound to original application generation');
  check(guardSource.includes('Boolean(element.isConnected)'), 'live DOM membership is checked at admission/commit');
  check(guardSource.includes('pendingAdmission.selectionGeneration !== current.selectionGeneration'), 'selection mutation invalidates confirmation');
  check(guardSource.includes('pendingAdmission.applicationGeneration !== current.applicationGeneration'), 'route mutation invalidates confirmation');
  check(guardSource.includes('pendingAdmission.fingerprint !== current.fingerprint'), 'exact selected set invalidates confirmation');
  check(guardSource.includes('pendingAdmission = { ...current }'), 'automatic path captures current authority at commit');

  // Execute the actual content guard with a tiny DOM/runtime harness. This
  // verifies the runtime fence rather than only checking source shape.
  function makeGuardHarness(initialUrl = 'https://example.test/a') {
    let registeredListener = null;
    let nativeSaveCalls = 0;
    const elements = [];

    class FakeElement {
      constructor(doc) {
        this.ownerDocument = doc;
        this.attrs = new Map();
        this.isConnected = true;
        this.nodeType = 1;
      }
      setAttribute(name, value) { this.attrs.set(String(name), String(value)); }
      removeAttribute(name) { this.attrs.delete(String(name)); }
      getAttribute(name) { return this.attrs.has(String(name)) ? this.attrs.get(String(name)) : null; }
      hasAttribute(name) { return this.attrs.has(String(name)); }
    }

    const location = { href: initialUrl };
    const fakeWindow = { Element: FakeElement, NodeFilter: { SHOW_ELEMENT: 1 } };
    const document = {
      defaultView: fakeWindow,
      documentElement: {},
      querySelectorAll(selector) {
        if (selector === 'iframe, frame') return [];
        if (selector === '[data-webclip-pdf-include]') return elements.filter((el) => el.isConnected && el.hasAttribute('data-webclip-pdf-include'));
        if (selector === '[data-webclip-pdf-exclude]') return elements.filter((el) => el.isConnected && el.hasAttribute('data-webclip-pdf-exclude'));
        return [];
      }
    };
    class FakeMutationObserver { observe() {} }

    const runtimeEvent = {
      addListener(fn) { registeredListener = fn; }
    };
    const runtime = {
      onMessage: runtimeEvent,
      sendMessage(message) {
        if (message?.type === 'WEBCLIP_GENERATE_PDF' || message?.type === 'WEBCLIP_SEND_PDF_TO_YANDEX') nativeSaveCalls += 1;
        return Promise.resolve({ ok: true });
      }
    };
    const context = {
      location,
      document,
      MutationObserver: FakeMutationObserver,
      chrome: { runtime },
      URL,
      Symbol,
      Map,
      Set,
      WeakSet,
      Promise,
      JSON,
      Math,
      Number,
      String,
      Boolean,
      Object,
      Array,
      console
    };
    context.globalThis = context;
    vm.runInNewContext(guardSource, context, { filename: 'content-generation-guard.js' });

    // Register the content handler after the guard so it is wrapped exactly as
    // it is when service-worker-entry injects guard.js before content.js.
    context.chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      sendResponse?.({ ok: true, contentHandled: true, command: message?.command || '' });
      return false;
    });

    function addInclude(id) {
      const element = new FakeElement(document);
      elements.push(element);
      element.setAttribute('data-webclip-pdf-include', String(id));
      return element;
    }

    async function dispatch(message) {
      let response;
      const returned = registeredListener(message, {}, (value) => { response = value; });
      if (returned && typeof returned.then === 'function') await returned;
      return response;
    }

    return {
      context,
      location,
      addInclude,
      dispatch,
      nativeSaveCalls: () => nativeSaveCalls
    };
  }

  {
    const h = makeGuardHarness();
    h.addInclude(1);
    const admission = await h.dispatch({ type: 'WEBCLIP_COMMAND', command: 'finish' });
    check(admission?.ok, 'live selection passes finish admission');
    const commit = await h.context.chrome.runtime.sendMessage({ type: 'WEBCLIP_GENERATE_PDF' });
    check(commit?.ok, 'unchanged live selection passes privileged commit');
    equal(h.nativeSaveCalls(), 1, 'unchanged commit reaches native runtime');
  }

  {
    const h = makeGuardHarness();
    const selected = h.addInclude(1);
    check((await h.dispatch({ type: 'WEBCLIP_COMMAND', command: 'finish' }))?.ok, 'confirmation opens on live route A');
    h.location.href = 'https://example.test/b';
    const commit = await h.context.chrome.runtime.sendMessage({ type: 'WEBCLIP_GENERATE_PDF' });
    equal(commit?.code, 'WEBCLIP_APPLICATION_GENERATION_STALE', 'route change invalidates selected generation at commit');
    equal(h.nativeSaveCalls(), 0, 'stale route commit never reaches native runtime');
    check(selected.isConnected, 'route mismatch test keeps selected node live');
  }

  {
    const h = makeGuardHarness();
    const selected = h.addInclude(1);
    selected.isConnected = false;
    const admission = await h.dispatch({ type: 'WEBCLIP_COMMAND', command: 'yandex' });
    equal(admission?.code, 'WEBCLIP_SELECTION_STALE', 'same-URL detached selection fails admission');
    equal(h.nativeSaveCalls(), 0, 'detached admission has no save side effect');
  }

  {
    const h = makeGuardHarness();
    h.addInclude(1);
    check((await h.dispatch({ type: 'WEBCLIP_COMMAND', command: 'download' }))?.ok, 'download confirmation captures receipt');
    h.addInclude(2);
    const commit = await h.context.chrome.runtime.sendMessage({ type: 'WEBCLIP_GENERATE_PDF' });
    equal(commit?.code, 'WEBCLIP_SAVE_CONFIRMATION_STALE', 'selection mutation after confirmation fails commit');
    equal(h.nativeSaveCalls(), 0, 'mutated confirmation never reaches native runtime');
  }

  {
    const h = makeGuardHarness();
    h.addInclude(1);
    await h.dispatch({ type: 'WEBCLIP_APPLICATION_NAVIGATION', url: 'https://example.test/b', documentId: 'doc-a' });
    h.location.href = 'https://example.test/b';
    await h.dispatch({ type: 'WEBCLIP_APPLICATION_NAVIGATION', url: 'https://example.test/a', documentId: 'doc-a' });
    h.location.href = 'https://example.test/a';
    const admission = await h.dispatch({ type: 'WEBCLIP_COMMAND', command: 'finish' });
    equal(admission?.code, 'WEBCLIP_APPLICATION_GENERATION_STALE', 'A-B-A history cycle cannot reuse route-A authority');
  }

  {
    const h = makeGuardHarness();
    h.addInclude(1);
    await h.dispatch({ type: 'WEBCLIP_APPLICATION_NAVIGATION', url: 'https://example.test/a', documentId: 'doc-a' });
    const admission = await h.dispatch({ type: 'WEBCLIP_COMMAND', command: 'finish' });
    check(admission?.ok, 'same-URL history/state signal does not destructively invalidate live selection');
  }

  console.log(`PASS ${checks} checks`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
