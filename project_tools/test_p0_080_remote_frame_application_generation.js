'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
let cases = 0;
function check(value, message) { cases += 1; assert.ok(value, message); }
function eq(actual, expected, message) { cases += 1; assert.equal(actual, expected, message); }
function deepEq(actual, expected, message) { cases += 1; assert.deepEqual(actual, expected, message); }

async function exerciseInjectionGuard() {
  const source = fs.readFileSync(path.join(ROOT, 'content-injection-guard.js'), 'utf8');
  const calls = [];
  const context = {
    chrome: {
      runtime: { lastError: null },
      scripting: {
        executeScript(details, callback) {
          calls.push(details);
          if (typeof callback === 'function') { callback([{ result: true }]); return undefined; }
          return Promise.resolve([{ result: true }]);
        }
      }
    }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'content-injection-guard.js' });
  const guard = context.WebClipContentInjectionGuard;
  check(guard, 'guard must export');
  eq(guard.FRAME_AGENT_FILE, 'frame-agent.js', 'frame-agent identity');
  eq(guard.needsGenerationBootstrap({ target: { tabId: 1, allFrames: true }, files: ['frame-agent.js'] }), true, 'frame-agent requires generation bootstrap');
  eq(guard.needsConfirmationBridge({ target: { tabId: 1 }, files: ['frame-agent.js'] }), false, 'remote frame does not get top save-confirmation bridge');
  eq(guard.needsConfirmationBridge({ target: { tabId: 1 }, files: ['content.js'] }), true, 'top content keeps confirmation bridge');

  calls.length = 0;
  await context.chrome.scripting.executeScript({ target: { tabId: 9, allFrames: true }, files: ['frame-agent.js'] });
  eq(calls.length, 3, 'remote frame bootstrap has three ordered injections');
  eq(calls[0].world, 'MAIN', 'remote history bridge runs in MAIN first');
  eq(typeof calls[0].func, 'function', 'remote history bridge is bounded function injection');
  eq(calls[1].world, 'ISOLATED', 'remote generation primitive runs isolated');
  deepEq(Array.from(calls[1].files), ['application-generation.js'], 'remote generation primitive exact file');
  deepEq(Array.from(calls[2].files), ['frame-agent.js'], 'frame-agent runs only after generation primitive');

  calls.length = 0;
  await context.chrome.scripting.executeScript({ target: { tabId: 9 }, files: ['content.js'] });
  eq(calls.length, 4, 'top bootstrap retains history + generation + confirmation + content sequence');
  eq(calls[0].world, 'MAIN');
  deepEq(Array.from(calls[1].files), ['application-generation.js']);
  eq(typeof calls[2].func, 'function');
  deepEq(Array.from(calls[3].files), ['frame-proxy-budget-guard.js', 'frame-proxy-inert-guard.js', 'host-control-activation-guard.js', 'content.js']);
}

function exerciseFrameAgentSourceContract() {
  const source = fs.readFileSync(path.join(ROOT, 'frame-agent.js'), 'utf8');
  check(source.includes('WebClipApplicationGeneration'), 'frame-agent consumes shared application generation primitive');
  check(source.includes('selectionGeneration'), 'remote selection stores application-generation authority');
  check(source.includes('WEBCLIP_SELECTION_STALE_GENERATION'), 'remote stale generation has explicit fail-closed code');
  check(source.includes('WEBCLIP_SELECTION_UNTRACKED'), 'missing remote generation authority fails closed');
  check(/function\s+admitSelectionGeneration\s*\(/.test(source), 'remote selection has a bounded admission function');
  check(/preparePrint\(\)[\s\S]*admitSelectionGeneration\('remote-prepare-print'\)/.test(source), 'downstream remote print is generation-admitted before mutation/resource work');
  check(/case'get-state':[\s\S]*admitSelectionGeneration\('remote-get-state'\)/.test(source), 'remote snapshot consumption revalidates generation');
  check(/function\s+staleGenerationFailure[\s\S]*removeSelectionMarkers\(\)[\s\S]*generationInvalidated:true/.test(source), 'stale remote authority is invalidated rather than silently restamped');
  check(!source.includes('documentId:'), 'frame-agent does not conflate browser documentId with application generation');
}

exerciseInjectionGuard().then(() => {
  exerciseFrameAgentSourceContract();
  console.log(`P0-080 remote-frame application generation: PASS; cases=${cases}`);
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
