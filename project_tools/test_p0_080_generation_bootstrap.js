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
  eq(calls.length, 3, 'guard composes MAIN bridge, isolated generation bootstrap, then existing content injection');
  eq(calls[0].world, 'MAIN', 'MAIN history bridge runs first');
  eq(typeof calls[0].func, 'function', 'MAIN bridge is a bounded injected function');
  deep(calls[1].files, ['application-generation.js'], 'isolated generation primitive runs second');
  eq(calls[1].world, 'ISOLATED', 'generation primitive stays in isolated world');
  deep(calls[2].files, rewritten.files, 'closed guard prefix and content run only after generation bootstrap resolves');

  console.log(`PASS ${checks} checks`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
