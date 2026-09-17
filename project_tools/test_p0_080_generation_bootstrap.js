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
  'application-generation.js',
  'frame-proxy-budget-guard.js',
  'frame-proxy-inert-guard.js',
  'host-control-activation-guard.js',
  'content.js'
], 'generation primitive is the first isolated-world helper before content.js');
ok(guard.needsHistoryBridge(original), 'content.js injection requires MAIN-world history bridge');
eq(guard.needsHistoryBridge({ target: original.target, world: 'MAIN', files: ['content.js'] }), false, 'MAIN-world content injection does not recurse into bridge setup');
eq(guard.needsHistoryBridge({ target: original.target, files: ['popup.js'] }), false, 'unrelated injection does not add bridge');

const bridge = guard.historyBridgeDetails(original);
eq(bridge.world, 'MAIN', 'history bridge executes in MAIN world');
eq(bridge.args[0], guard.HISTORY_EVENT, 'MAIN and isolated worlds share exact bounded event name');
eq(bridge.target, original.target, 'history bridge preserves the exact injection target');

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
  eq(calls.length, 2, 'guard composes exactly one MAIN bridge and one isolated injection');
  eq(calls[0].world, 'MAIN', 'MAIN history bridge runs first');
  eq(typeof calls[0].func, 'function', 'MAIN bridge is a bounded injected function');
  deep(calls[1].files, rewritten.files, 'isolated generation helper and content run only after bridge resolves');

  console.log(`PASS ${checks} checks`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
