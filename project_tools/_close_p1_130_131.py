from pathlib import Path
import re

root = Path('.')
sw_path = root / 'service-worker.js'
sw = sw_path.read_text(encoding='utf-8')

# ---------- P1-130: Chrome Action deadlines, fencing, pending cap ----------
const_anchor = "const TAB_CREATE_LATE_SUCCESS_TTL_MS = 60_000;\n"
if const_anchor not in sw:
    raise SystemExit('P1-130 constants anchor missing')
sw = sw.replace(const_anchor, const_anchor + (
    "const ACTION_OPERATION_TIMEOUT_MS = 5_000;\n"
    "const MAX_PENDING_ACTION_ACTUAL_SETTLEMENTS = 64;\n"
), 1)

map_anchor = "const tabCreateSettlements = new Map();\n"
if map_anchor not in sw:
    raise SystemExit('P1-130 state anchor missing')
sw = sw.replace(map_anchor, map_anchor + (
    "const actionUpdateGenerationByTab = new Map();\n"
    "const actionPendingActualSettlements = new Set();\n"
    "const actionRepairScheduledTabs = new Set();\n"
), 1)

helper_marker = "async function runSerializedLateSettlementOperation(chains, queueKey, start, label, timeoutMs) {"
if helper_marker not in sw:
    raise SystemExit('P1-130 helper marker missing')
action_helpers = r'''function makeActionPendingLimitError() {
  const error = new Error('Слишком много незавершённых Chrome Action операций WebClip.');
  error.code = 'WEBCLIP_ACTION_PENDING_LIMIT';
  return error;
}

function beginActionUpdateGeneration(tabId) {
  const id = Number(tabId || 0);
  const next = (Number(actionUpdateGenerationByTab.get(id) || 0) + 1) >>> 0;
  const generation = next || 1;
  actionUpdateGenerationByTab.set(id, generation);
  return generation;
}

function isActionUpdateGenerationCurrent(tabId, generation) {
  return Number(actionUpdateGenerationByTab.get(Number(tabId || 0)) || 0) === Number(generation || 0);
}

function scheduleActionRepairForTab(tabId) {
  const id = Number(tabId || 0);
  if (!id || !actionUpdateGenerationByTab.has(id) || actionRepairScheduledTabs.has(id)) return;
  actionRepairScheduledTabs.add(id);
  void Promise.resolve().then(() => {
    actionRepairScheduledTabs.delete(id);
    if (!actionUpdateGenerationByTab.has(id)) return;
    return updateActionForTab(id).catch(() => {});
  }).catch(() => {
    actionRepairScheduledTabs.delete(id);
  });
}

async function runChromeActionMutationBounded(tabId, generation, start, label) {
  if (!isActionUpdateGenerationCurrent(tabId, generation)) return { stale: true };
  if (actionPendingActualSettlements.size >= MAX_PENDING_ACTION_ACTUAL_SETTLEMENTS) {
    throw makeActionPendingLimitError();
  }

  let callerTimedOut = false;
  const actual = Promise.resolve().then(start);
  actionPendingActualSettlements.add(actual);
  void actual.finally(() => {
    actionPendingActualSettlements.delete(actual);
    void Promise.resolve().then(() => {
      if (callerTimedOut || !isActionUpdateGenerationCurrent(tabId, generation)) {
        scheduleActionRepairForTab(tabId);
      }
    });
  }).catch(() => {});

  try {
    await withOperationTimeout(actual, ACTION_OPERATION_TIMEOUT_MS, label);
  } catch (error) {
    if (error?.code === 'WEBCLIP_TIMEOUT') callerTimedOut = true;
    throw error;
  }
  return { stale: !isActionUpdateGenerationCurrent(tabId, generation) };
}

async function applyChromeActionMutationBestEffort(tabId, generation, start, label) {
  try {
    const result = await runChromeActionMutationBounded(tabId, generation, start, label);
    return result?.stale !== true && isActionUpdateGenerationCurrent(tabId, generation);
  } catch (error) {
    if (error?.code === 'WEBCLIP_TIMEOUT' || error?.code === 'WEBCLIP_ACTION_PENDING_LIMIT') throw error;
    return isActionUpdateGenerationCurrent(tabId, generation);
  }
}

'''
sw = sw.replace(helper_marker, action_helpers + helper_marker, 1)

start = sw.index("async function updateActionForTab(tabId, knownUrl = '') {")
end = sw.index("async function refreshActionForAllTabs()", start)
new_update = r'''async function updateActionForTab(tabId, knownUrl = '') {
  if (!tabId) return;
  const generation = beginActionUpdateGeneration(tabId);
  let url = knownUrl;
  if (!url) {
    try {
      const tab = await getChromeTabBounded(tabId, 'Чтение URL вкладки для Chrome Action');
      url = tab?.url || '';
    } catch (_) {
      url = '';
    }
  }
  if (!isActionUpdateGenerationCurrent(tabId, generation)) return;

  if (!/^https?:\/\//i.test(url)) {
    if (!await applyChromeActionMutationBestEffort(tabId, generation, () => chrome.action.setIcon({
      tabId,
      imageData: {
        16: makeActionIconImageData(16, '#5f6368'),
        32: makeActionIconImageData(32, '#5f6368')
      }
    }), 'Обновление иконки Chrome Action')) return;
    if (!await applyChromeActionMutationBestEffort(tabId, generation, () => chrome.action.setBadgeText({ tabId, text: '' }), 'Очистка badge Chrome Action')) return;
    await applyChromeActionMutationBestEffort(tabId, generation, () => chrome.action.setTitle({ tabId, title: 'WebClip PDF' }), 'Обновление title Chrome Action');
    return;
  }

  const summary = await getJournalSummaryForUrl(url);
  if (!isActionUpdateGenerationCurrent(tabId, generation)) return;
  const age = summary.lastSavedAt ? Date.now() - summary.lastSavedAt : Infinity;
  const DAY = 24 * 60 * 60 * 1000;
  let color = '#9aa0a6';
  let stateText = 'Сохранений для этой страницы ещё нет';
  if (summary.lastSavedAt) {
    if (age <= 7 * DAY) {
      color = '#34a853';
      stateText = 'Последняя запись сохранения: не более 7 дней назад';
    } else if (age <= 30 * DAY) {
      color = '#f9ab00';
      stateText = 'Последняя запись сохранения: от 8 до 30 дней назад';
    } else {
      color = '#ea4335';
      stateText = 'Последняя запись сохранения: более 30 дней назад';
    }
  }

  if (!await applyChromeActionMutationBestEffort(tabId, generation, () => chrome.action.setIcon({
    tabId,
    imageData: {
      16: makeActionIconImageData(16, color),
      32: makeActionIconImageData(32, color)
    }
  }), 'Обновление иконки Chrome Action')) return;

  const badge = summary.uniqueDays ? String(summary.uniqueDays) : '';
  if (!await applyChromeActionMutationBestEffort(tabId, generation, () => chrome.action.setBadgeText({ tabId, text: badge }), 'Обновление badge Chrome Action')) return;
  if (!await applyChromeActionMutationBestEffort(tabId, generation, () => chrome.action.setBadgeBackgroundColor({ tabId, color: '#202124' }), 'Обновление фона badge Chrome Action')) return;
  await applyChromeActionMutationBestEffort(tabId, generation, () => chrome.action.setTitle({
    tabId,
    title: summary.uniqueDays
      ? `WebClip PDF · ${stateText} · Дней с записями журнала: ${summary.uniqueDays}`
      : `WebClip PDF · ${stateText}`
  }), 'Обновление title Chrome Action');
}

'''
sw = sw[:start] + new_update + sw[end:]

removed_anchor = "chrome.tabs.onRemoved.addListener((tabId) => {\n  clearScriptExecutionSettlementsForTab(tabId);\n  frameAgentsByTab.delete(Number(tabId || 0));\n"
if removed_anchor not in sw:
    raise SystemExit('P1-130 tabs.onRemoved anchor missing')
sw = sw.replace(removed_anchor, removed_anchor + (
    "  actionUpdateGenerationByTab.delete(Number(tabId || 0));\n"
    "  actionRepairScheduledTabs.delete(Number(tabId || 0));\n"
), 1)

# ---------- P1-131: debugger actual settlements join global PDF budget ----------
dbg_state_anchor = "const debuggerActiveTabs = new Set();\nconst debuggerLateAttachCleanupByTab = new Map();\nconst debuggerPendingDetachByTab = new Map();\n"
if dbg_state_anchor not in sw:
    raise SystemExit('P1-131 debugger state anchor missing')
sw = sw.replace(dbg_state_anchor, dbg_state_anchor + "const debuggerPendingActualSettlements = new Set();\n", 1)

busy_marker = "function makeDebuggerBusyError(tabId) {"
if busy_marker not in sw:
    raise SystemExit('P1-131 busy helper marker missing')
dbg_helpers = r'''function trackDebuggerActualSettlement(actual) {
  const pending = Promise.resolve(actual);
  debuggerPendingActualSettlements.add(pending);
  void pending.finally(() => {
    debuggerPendingActualSettlements.delete(pending);
  }).catch(() => {});
  return pending;
}

function hasGlobalPdfPendingDebuggerWork() {
  return debuggerActiveTabs.size > 0 || debuggerPendingActualSettlements.size > 0;
}

'''
sw = sw.replace(busy_marker, dbg_helpers + busy_marker, 1)

attach_old = "const rawAttach = Promise.resolve(chrome.debugger.attach(debuggee, '1.3'));"
attach_new = "const rawAttach = trackDebuggerActualSettlement(Promise.resolve(chrome.debugger.attach(debuggee, '1.3')));"
if sw.count(attach_old) != 1:
    raise SystemExit(f'P1-131 attach anchor count={sw.count(attach_old)}')
sw = sw.replace(attach_old, attach_new, 1)

late_detach_old = "await withOperationTimeout(chrome.debugger.detach(debuggee), 10_000, 'Отключение Chrome Debugger после позднего attach');"
late_detach_new = "await detachDebuggerBounded(debuggee, 'Отключение Chrome Debugger после позднего attach');"
if sw.count(late_detach_old) != 1:
    raise SystemExit(f'P1-131 late detach anchor count={sw.count(late_detach_old)}')
sw = sw.replace(late_detach_old, late_detach_new, 1)

detach_start = sw.index('async function detachDebuggerBounded(debuggee) {')
detach_end = sw.index('async function generatePdfBlob(tabId) {', detach_start)
detach_fn = r'''async function detachDebuggerBounded(debuggee, label = 'Отключение Chrome Debugger') {
  const tabId = Number(debuggee?.tabId);
  const rawDetach = trackDebuggerActualSettlement(Promise.resolve(chrome.debugger.detach(debuggee)));
  debuggerPendingDetachByTab.set(tabId, rawDetach);
  void rawDetach.finally(() => {
    if (debuggerPendingDetachByTab.get(tabId) === rawDetach) debuggerPendingDetachByTab.delete(tabId);
  }).catch(() => {});
  await withOperationTimeout(rawDetach, 10_000, label);
}

'''
sw = sw[:detach_start] + detach_fn + sw[detach_end:]

global_busy_old = "if (debuggerActiveTabs.size > 0) throw makeGlobalPdfBusyError();"
global_busy_new = "if (hasGlobalPdfPendingDebuggerWork()) throw makeGlobalPdfBusyError();"
if sw.count(global_busy_old) != 1:
    raise SystemExit(f'P1-131 global busy anchor count={sw.count(global_busy_old)}')
sw = sw.replace(global_busy_old, global_busy_new, 1)

sw_path.write_text(sw, encoding='utf-8')

# ---------- P1-130 dedicated regression ----------
p130 = r'''const fs = require('fs');
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
'''
(root / 'project_tools' / 'test_p1_130_action_deadline_fencing.js').write_text(p130, encoding='utf-8')

# ---------- P1-131 dedicated regression ----------
p131 = r'''const fs = require('fs');
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
'''
(root / 'project_tools' / 'test_p1_131_debugger_global_pending_budget.js').write_text(p131, encoding='utf-8')

# Registry/docs.
priorities_path = root / 'project_docs' / 'PRIORITIES_P0_P1_P2.md'
priorities = priorities_path.read_text(encoding='utf-8')
rows = {
    'P1-130': '| P1-130 | P1 | REGRESSION | Все Chrome Action mutations (`setIcon/setBadgeText/setBadgeBackgroundColor/setTitle`) проходят 5-секундный deadline, per-tab generation fencing и global cap 64 фактически незавершённых API promises. Поздний/stale settlement планирует single repair актуального состояния; tab removal очищает generation/repair state. |',
    'P1-131': '| P1-131 | P1 | REGRESSION | Фактические promises `chrome.debugger.attach/detach`, включая late-attach cleanup detach, входят в глобальный PDF pending budget до actual settlement. После локального timeout новая PDF в другой вкладке fail-closed получает busy до завершения исходного Chrome debugger side effect. |'
}
for code, row in rows.items():
    pattern = rf'^\|\s*{re.escape(code)}\s*\|.*$'
    if re.search(pattern, priorities, re.M):
        priorities = re.sub(pattern, row, priorities, count=1, flags=re.M)
    else:
        priorities = priorities.rstrip() + '\n' + row + '\n'
priorities_path.write_text(priorities, encoding='utf-8')

readme_path = root / 'README.md'
readme = readme_path.read_text(encoding='utf-8')
note = '''### Audit WIP — P1-130 / P1-131

Chrome Action mutations now have bounded 5-second waits, per-tab latest-generation fencing, a global 64 actual-promise pending cap, and late-settlement repair. Debugger attach/detach actual promises now remain in the global PDF busy budget until Chrome really settles them, including late-attach cleanup. Manifest remains `0.9.8`; this is not release QA.

'''
if '### Audit WIP — P1-130 / P1-131' not in readme:
    marker = '## Изменения 0.9.7'
    if marker not in readme:
        raise SystemExit('README marker missing')
    readme_path.write_text(readme.replace(marker, note + marker, 1), encoding='utf-8')

qa_path = root / 'QA_STATUS_0_9_9.md'
qa = qa_path.read_text(encoding='utf-8')
qa_note = '''

## 2026-08-25 — P1-130 / P1-131

- P1-130: Chrome Action mutations bounded 5 s, generation-fenced per tab, global actual-promise pending cap 64, late/stale settlement schedules latest-state repair.
- P1-131: raw debugger attach/detach promises remain in global PDF pending budget through actual settlement; different-tab PDF starts are blocked after local timeout until Chrome settles the original side effect.
- Dedicated regressions: `test_p1_130_action_deadline_fencing.js`, `test_p1_131_debugger_global_pending_budget.js`.
- Manifest remains `0.9.8`; real unpacked Chrome Action/debugger timing remains release regression QA.
'''
if '## 2026-08-25 — P1-130 / P1-131' not in qa:
    qa_path.write_text(qa.rstrip() + qa_note, encoding='utf-8')

(root / 'P1-130_CLOSURE.md').write_text('''# P1-130 closure — Chrome Action deadline, generation fencing and pending cap

Status: **REGRESSION**. Manifest remains **0.9.8 / Manifest V3**.

Every `chrome.action.setIcon`, `setBadgeText`, `setBadgeBackgroundColor` and `setTitle` mutation used by `updateActionForTab()` now goes through a 5-second bounded caller wait. Each tab has a monotonic update generation; an older computation stops before later mutations when a newer generation starts. Raw non-cancellable Action promises stay in a global pending set until actual settlement, capped at 64 before a new side effect starts. If a caller times out or an older generation settles late, one deduplicated repair refresh re-applies the latest tab state. Tab removal clears generation/repair state.

Dedicated `project_tools/test_p1_130_action_deadline_fencing.js` proves timeout retention in the actual-promise budget, late settlement repair, and fail-before-start global cap. Full gate: **77/77 JS syntax PASS; 64/64 deterministic tests PASS**.

Real unpacked Chrome Action timing remains release QA; manifest is not bumped.
''', encoding='utf-8')

(root / 'P1-131_CLOSURE.md').write_text('''# P1-131 closure — unknown debugger settlements in global PDF pending budget

Status: **REGRESSION**. Manifest remains **0.9.8 / Manifest V3**.

Raw `chrome.debugger.attach()` and `chrome.debugger.detach()` promises are tracked globally until their actual Chrome API settlement, not merely until the caller deadline. Late-attach cleanup now uses the same tracked bounded detach path. `generatePdfBlob()` treats either an active PDF or any unresolved debugger actual promise as global PDF-busy, so after a local attach/detach timeout another tab cannot start a competing debugger session until the original side effect really settles. Existing per-tab late-attach and pending-detach guards remain.

Dedicated `project_tools/test_p1_131_debugger_global_pending_budget.js` forces detach past its local timeout and proves the global busy budget remains occupied until actual settlement. Existing late Chrome API race regression remains part of the full gate. Full gate: **77/77 JS syntax PASS; 64/64 deterministic tests PASS**.

Real unpacked Chrome debugger timing remains release QA; manifest is not bumped.
''', encoding='utf-8')

print('P1-130/P1-131 patch complete')
