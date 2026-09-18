const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const content = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
const frameAgent = fs.readFileSync(path.join(root, 'frame-agent.js'), 'utf8');
function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Missing markers: ${startMarker} -> ${endMarker}`);
  return source.slice(start, end);
}
assert(sw.includes('const SCRIPT_EXECUTION_TIMEOUT_MS = 10_000;'));
assert(sw.includes('const SCRIPT_EXECUTION_LATE_SUCCESS_TTL_MS = 60_000;'));
assert(sw.includes('const scriptExecutionSettlements = new Map();'));
assert.strictEqual((sw.match(/chrome\.scripting\.executeScript\(/g) || []).length, 2);
const retryProbe = section(sw, 'async function captureCurrentPdfRetrySourceReceipt(sender)', 'function liveRetrySourceReceiptMatches');
assert(retryProbe.includes('withOperationTimeout('), 'live retry exact-document probe must remain bounded');
assert(retryProbe.includes('SCRIPT_EXECUTION_TIMEOUT_MS'), 'live retry probe uses the canonical scripting timeout');
assert(retryProbe.includes('Promise.resolve(chrome.scripting.executeScript({'), 'live retry probe is the only direct non-singleton executeScript authority check');
assert(!retryProbe.includes('executeScriptSingletonBounded('), 'fresh authority probe must not reuse singleton late-success state');
assert(content.includes('__WEBCLIP_PDF_PROTOTYPE_LOADED__'));
assert(frameAgent.includes('__WEBCLIP_FRAME_AGENT_LOADED__'));
assert(/async function enableFrameAgentsForTab[\s\S]{0,2500}executeScriptSingletonBounded\(/.test(sw));
assert(/async function ensureWebClipContentScript[\s\S]{0,1500}executeScriptSingletonBounded\(/.test(sw));
assert(sw.includes('clearScriptExecutionSettlementsForTab(tabId);'));
const helperBlock = section(sw, 'function makeScriptExecutionPendingError', 'function makeTabCreatePendingError');
(async () => {
  let calls = 0;
  let resolveFirst;
  const firstRaw = new Promise((resolve) => { resolveFirst = resolve; });
  const chrome = { scripting: { executeScript() { calls += 1; return calls === 1 ? firstRaw : Promise.resolve([{ frameId: 0, result: 'normal' }]); } } };
  const context = vm.createContext({ console, Promise, Error, Number, Math, String, Array, Map, setTimeout, clearTimeout, chrome });
  vm.runInContext(`const SCRIPT_EXECUTION_TIMEOUT_MS = 20;\nconst SCRIPT_EXECUTION_LATE_SUCCESS_TTL_MS = 1000;\nconst scriptExecutionSettlements = new Map();\n${helperBlock}\nthis.execForTest = executeScriptSingletonBounded; this.pendingForTest = scriptExecutionSettlements; this.clearForTab = clearScriptExecutionSettlementsForTab;`, context);
  const details = { target: { tabId: 7 }, files: ['content.js'] };
  let error = null;
  try { await context.execForTest(details, { requestKey: 'content:7', label: 'test injection' }); } catch (e) { error = e; }
  assert(error); assert.strictEqual(error.code, 'WEBCLIP_SCRIPT_EXECUTION_PENDING'); assert.strictEqual(calls, 1); assert.strictEqual(context.pendingForTest.size, 1);
  let retryError = null;
  try { await context.execForTest(details, { requestKey: 'content:7', label: 'test injection' }); } catch (e) { retryError = e; }
  assert(retryError); assert.strictEqual(retryError.code, 'WEBCLIP_SCRIPT_EXECUTION_PENDING'); assert.strictEqual(calls, 1);
  resolveFirst([{ frameId: 0, result: 'late' }]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.strictEqual(context.pendingForTest.size, 1);
  const recovered = await context.execForTest(details, { requestKey: 'content:7', label: 'test injection' });
  assert.strictEqual(recovered[0].result, 'late'); assert.strictEqual(calls, 1); assert.strictEqual(context.pendingForTest.size, 0);
  const normal = await context.execForTest(details, { requestKey: 'content:7', label: 'test injection' });
  assert.strictEqual(normal[0].result, 'normal'); assert.strictEqual(calls, 2);

  let resolveNav;
  const navChrome = { scripting: { executeScript() { return new Promise((resolve) => { resolveNav = resolve; }); } } };
  const navContext = vm.createContext({ console, Promise, Error, Number, Math, String, Array, Map, setTimeout, clearTimeout, chrome: navChrome });
  vm.runInContext(`const SCRIPT_EXECUTION_TIMEOUT_MS = 20;\nconst SCRIPT_EXECUTION_LATE_SUCCESS_TTL_MS = 1000;\nconst scriptExecutionSettlements = new Map();\n${helperBlock}\nthis.execForTest = executeScriptSingletonBounded; this.pendingForTest = scriptExecutionSettlements; this.clearForTab = clearScriptExecutionSettlementsForTab;`, navContext);
  try { await navContext.execForTest(details, { requestKey: 'content:7', label: 'navigation injection' }); } catch (_) {}
  assert.strictEqual(navContext.pendingForTest.size, 1);
  navContext.clearForTab(7);
  assert.strictEqual(navContext.pendingForTest.size, 0, 'navigation must discard stale pending/receipt state');
  resolveNav([{ frameId: 0, result: 'stale-late' }]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.strictEqual(navContext.pendingForTest.size, 0, 'late settlement after navigation must not resurrect stale receipt');
  console.log('P1-125 bounded executeScript settlement/singleton/navigation regression PASS');
})().catch((error) => { console.error(error); process.exitCode = 1; });
