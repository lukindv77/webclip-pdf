const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Missing markers: ${startMarker} -> ${endMarker}`);
  return source.slice(start, end);
}

assert(source.includes('const debuggerPendingActualSettlements = new Set();'));
assert(source.includes('function trackDebuggerActualSettlement(actual)'));
assert(source.includes('function hasGlobalPdfPendingDebuggerWork()'));
assert(source.includes("trackDebuggerActualSettlement(Promise.resolve(chrome.debugger.attach(debuggee, '1.3')))"));
assert(source.includes('trackDebuggerActualSettlement(Promise.resolve(chrome.debugger.detach(debuggee)))'));
assert(source.includes("await detachDebuggerBounded(debuggee, 'Отключение Chrome Debugger после позднего attach');"));
assert(source.includes('if (hasGlobalPdfPendingDebuggerWork()) throw makeGlobalPdfBusyError();'));

(async () => {
  let resolveDetach;
  const chrome = {
    debugger: {
      detach() { return new Promise((resolve) => { resolveDetach = resolve; }); }
    }
  };
  function withOperationTimeout(promise, timeoutMs, label) {
    let timer = 0;
    return Promise.race([
      Promise.resolve(promise),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error(`${label} timeout`);
          error.code = 'WEBCLIP_TIMEOUT';
          reject(error);
        }, Math.min(timeoutMs, 15));
      })
    ]).finally(() => { if (timer) clearTimeout(timer); });
  }
  const debuggerActiveTabs = new Set();
  const debuggerLateAttachCleanupByTab = new Map();
  const debuggerPendingDetachByTab = new Map();
  const debuggerPendingActualSettlements = new Set();
  const context = vm.createContext({
    console, Promise, Error, Number, Set, Map,
    setTimeout, clearTimeout, chrome,
    debuggerActiveTabs,
    debuggerLateAttachCleanupByTab,
    debuggerPendingDetachByTab,
    debuggerPendingActualSettlements,
    withOperationTimeout
  });
  const helperCode = section(source, 'function trackDebuggerActualSettlement', 'async function generatePdfBlob(tabId) {');
  vm.runInContext(`${helperCode}\nthis.detachForTest = detachDebuggerBounded; this.globalPendingForTest = hasGlobalPdfPendingDebuggerWork; this.pendingCountForTest = () => debuggerPendingActualSettlements.size;`, context);

  let timeoutError = null;
  try { await context.detachForTest({ tabId: 9 }); } catch (error) { timeoutError = error; }
  assert(timeoutError && timeoutError.code === 'WEBCLIP_TIMEOUT');
  assert.strictEqual(context.pendingCountForTest(), 1, 'timed-out raw detach remains globally pending');
  assert.strictEqual(context.globalPendingForTest(), true, 'another tab must see global PDF busy while detach settlement is unknown');
  resolveDetach();
  await new Promise((resolve) => setTimeout(resolve, 1));
  for (let i = 0; i < 3; i += 1) await Promise.resolve();
  assert.strictEqual(context.pendingCountForTest(), 0, 'actual detach settlement releases global PDF pending budget');
  assert.strictEqual(context.globalPendingForTest(), false);
  console.log('P1-131 debugger global pending-settlement budget regression PASS');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
