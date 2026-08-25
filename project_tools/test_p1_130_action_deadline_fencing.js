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

assert(source.includes('const ACTION_OPERATION_TIMEOUT_MS = 5_000;'));
assert(source.includes('const MAX_PENDING_ACTION_ACTUAL_SETTLEMENTS = 64;'));
assert(source.includes('const actionUpdateGenerationByTab = new Map();'));
assert(source.includes('const actionPendingActualSettlements = new Set();'));
assert(source.includes('beginActionUpdateGeneration(tabId)'));
assert(source.includes('applyChromeActionMutationBestEffort'));
assert(source.includes("error.code = 'WEBCLIP_ACTION_PENDING_LIMIT'"));
assert(source.includes('actionUpdateGenerationByTab.delete(Number(tabId || 0));'));
for (const method of ['setIcon', 'setBadgeText', 'setBadgeBackgroundColor', 'setTitle']) {
  const direct = new RegExp(`await\\s+chrome\\.action\\.${method}\\s*\\(`);
  assert(!direct.test(source), `${method} must not be directly awaited`);
}

(async () => {
  let resolveActual;
  let repairs = 0;
  let starts = 0;
  function withOperationTimeout(promise, timeoutMs, label) {
    let timer = 0;
    return Promise.race([
      Promise.resolve(promise),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error(`${label} timeout`);
          error.code = 'WEBCLIP_TIMEOUT';
          reject(error);
        }, timeoutMs);
      })
    ]).finally(() => { if (timer) clearTimeout(timer); });
  }
  const actionUpdateGenerationByTab = new Map([[7, 1]]);
  const actionPendingActualSettlements = new Set();
  const actionRepairScheduledTabs = new Set();
  const context = vm.createContext({
    console, Promise, Error, Number, Math, Set, Map,
    setTimeout, clearTimeout,
    ACTION_OPERATION_TIMEOUT_MS: 15,
    MAX_PENDING_ACTION_ACTUAL_SETTLEMENTS: 2,
    actionUpdateGenerationByTab,
    actionPendingActualSettlements,
    actionRepairScheduledTabs,
    withOperationTimeout,
    updateActionForTab: async () => { repairs += 1; }
  });
  const code = section(source, 'function makeActionPendingLimitError', 'async function runSerializedLateSettlementOperation');
  vm.runInContext(`${code}\nthis.runForTest = runChromeActionMutationBounded; this.pendingForTest = () => actionPendingActualSettlements.size;`, context);

  let timeoutError = null;
  try {
    await context.runForTest(7, 1, () => {
      starts += 1;
      return new Promise((resolve) => { resolveActual = resolve; });
    }, 'test action');
  } catch (error) { timeoutError = error; }
  assert(timeoutError && timeoutError.code === 'WEBCLIP_TIMEOUT');
  assert.strictEqual(starts, 1);
  assert.strictEqual(context.pendingForTest(), 1, 'timed-out actual Action promise stays in global pending budget');

  actionUpdateGenerationByTab.set(7, 2);
  resolveActual();
  await new Promise((resolve) => setTimeout(resolve, 1));
  for (let i = 0; i < 4; i += 1) await Promise.resolve();
  assert.strictEqual(context.pendingForTest(), 0, 'actual settlement releases pending budget');
  assert.strictEqual(repairs, 1, 'late/stale settlement schedules one latest-state repair');

  const never1 = new Promise(() => {});
  const never2 = new Promise(() => {});
  actionPendingActualSettlements.add(never1);
  actionPendingActualSettlements.add(never2);
  let capStarts = 0;
  await assert.rejects(
    context.runForTest(7, 2, () => { capStarts += 1; return Promise.resolve(); }, 'cap test'),
    (error) => error && error.code === 'WEBCLIP_ACTION_PENDING_LIMIT'
  );
  assert.strictEqual(capStarts, 0, 'pending cap must fail before starting another Chrome Action side effect');
  console.log('P1-130 Chrome Action deadline/fencing/pending-cap regression PASS');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
