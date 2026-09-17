'use strict';
const assert = require('assert');
const guard = require('../content-injection-guard.js');

let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks += 1; };
const eq = (actual, expected, message) => { assert.strictEqual(actual, expected, message); checks += 1; };
const deep = (actual, expected, message) => { assert.deepStrictEqual(actual, expected, message); checks += 1; };

const original = { target: { tabId: 17 }, files: ['content.js'] };
const rewritten = guard.rewriteDetails(original);
deep(rewritten.files, [
  'frame-proxy-budget-guard.js',
  'frame-proxy-inert-guard.js',
  'host-control-activation-guard.js',
  'content.js'
], 'closed frame/control guard prefix remains unchanged');
ok(guard.needsGenerationBootstrap(original), 'content.js injection requires generation bootstrap');
eq(guard.needsGenerationBootstrap({ target: original.target, world: 'MAIN', files: ['content.js'] }), false, 'MAIN-world content injection does not recurse into bootstrap');
eq(guard.needsGenerationBootstrap({ target: original.target, files: ['popup.js'] }), false, 'unrelated injection does not add bootstrap');

const bridge = guard.historyBridgeDetails(original);
eq(bridge.world, 'MAIN', 'history bridge executes in MAIN world');
eq(bridge.args[0], guard.HISTORY_EVENT, 'MAIN and isolated worlds share exact bounded event name');
eq(bridge.target, original.target, 'history bridge preserves the exact injection target');

const generation = guard.applicationGenerationDetails(original);
eq(generation.world, 'ISOLATED', 'application generation executes in isolated world');
deep(generation.files, ['application-generation.js'], 'application generation has its own bounded bootstrap injection');
eq(generation.target, original.target, 'generation bootstrap preserves exact injection target');

const confirmation = guard.confirmationBridgeDetails(original);
eq(confirmation.world, 'ISOLATED', 'internal confirmation bridge stays in isolated world');
eq(typeof confirmation.func, 'function', 'internal confirmation bridge is a bounded injected function');
eq(confirmation.target, original.target, 'internal confirmation bridge preserves exact injection target');

const listeners = [];
let captures = 0;
const fakeGlobal = {
  document: {
    addEventListener(type, listener, capture) { listeners.push({ type, listener, capture }); }
  },
  WebClipApplicationGeneration: {
    captureSelectionConfirmation() { captures += 1; }
  }
};
const originalGlobalDocument = globalThis.document;
const originalGeneration = globalThis.WebClipApplicationGeneration;
try {
  globalThis.document = fakeGlobal.document;
  globalThis.WebClipApplicationGeneration = fakeGlobal.WebClipApplicationGeneration;
  guard.installInternalConfirmationBridge();
  eq(listeners.length, 1, 'internal confirmation bridge installs one click listener');
  eq(listeners[0].type, 'click', 'internal confirmation bridge observes clicks only');
  eq(listeners[0].capture, true, 'internal confirmation bridge captures before content click handler');
  const finish = { getAttribute(name) { return name === 'data-action' ? 'finish' : null; } };
  const host = { id: 'webclip-pdf-extension-root' };
  listeners[0].listener({ composedPath: () => [finish, host, fakeGlobal.document] });
  eq(captures, 1, 'WebClip internal finish captures selection confirmation');
  listeners[0].listener({ composedPath: () => [{ getAttribute: () => 'finish' }, { id: 'host-page-root' }] });
  eq(captures, 1, 'host-page finish-like controls cannot capture WebClip confirmation');
  listeners[0].listener({ composedPath: () => [{ getAttribute: () => 'clear' }, host] });
  eq(captures, 1, 'non-finish WebClip controls do not capture confirmation');
} finally {
  if (originalGlobalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalGlobalDocument;
  if (originalGeneration === undefined) delete globalThis.WebClipApplicationGeneration;
  else globalThis.WebClipApplicationGeneration = originalGeneration;
}

(async () => {
  const calls = [];
  const chromeApi = {
    runtime: { lastError: null },
    scripting: {
      executeScript(details) {
        calls.push(details);
        return Promise.resolve([{ result: true }]);
      }
    }
  };
  const installed = guard.install(chromeApi);
  ok(installed.installed, 'injection guard installs over scripting API');
  await chromeApi.scripting.executeScript(original);
  eq(calls.length, 4, 'guard composes MAIN bridge, generation bootstrap, confirmation bridge, then content injection');
  eq(calls[0].world, 'MAIN', 'MAIN history bridge runs first');
  eq(typeof calls[0].func, 'function', 'MAIN bridge is a bounded injected function');
  deep(calls[1].files, ['application-generation.js'], 'isolated generation primitive runs second');
  eq(calls[1].world, 'ISOLATED', 'generation primitive stays in isolated world');
  eq(calls[2].world, 'ISOLATED', 'internal confirmation bridge runs after generation primitive');
  eq(calls[2].func, guard.installInternalConfirmationBridge, 'exact confirmation bridge runs before content');
  deep(calls[3].files, rewritten.files, 'closed guard prefix and content run only after both generation bridges resolve');

  console.log(`PASS ${checks} checks`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
