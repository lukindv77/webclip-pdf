const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
const guardSource = fs.readFileSync(path.join(root, 'incognito-context-guard.js'), 'utf8');
const popupSource = fs.readFileSync(path.join(root, 'popup.js'), 'utf8');
const bootstrapSource = fs.readFileSync(path.join(root, 'service-worker-bootstrap.js'), 'utf8');

function makeGuardHarness(tabs) {
  const state = { journalReads: 0, originalActionCalls: [], frameCalls: [] };
  const context = vm.createContext({ console });
  context.__tabs = tabs;
  context.__state = state;
  vm.runInContext(`
    async function getChromeTabBounded(id) {
      const value = __tabs.get(Number(id));
      if (value instanceof Error) throw value;
      if (value === undefined) throw new Error('missing tab');
      return value;
    }
    async function updateActionForTab(tabId, knownUrl = '') {
      __state.originalActionCalls.push({tabId, knownUrl});
      if (/^https?:\\/\\//i.test(String(knownUrl || ''))) __state.journalReads += 1;
      return {tabId, knownUrl};
    }
    async function enableFrameAgentsForTab(tabId) {
      __state.frameCalls.push(tabId);
      return {ok:true, tabId};
    }
  `, context);
  vm.runInContext(guardSource, context);
  return { context, state };
}

function makeElement(id) {
  const listeners = {};
  const classes = new Set();
  return {
    id,
    textContent: '',
    disabled: false,
    listeners,
    classList: {
      add(value) { classes.add(value); },
      remove(value) { classes.delete(value); },
      toggle(value, force) { if (force) classes.add(value); else classes.delete(value); },
      contains(value) { return classes.has(value); }
    },
    addEventListener(type, listener) { listeners[type] = listener; }
  };
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function makePopupHarness(activeTab) {
  const ids = ['start','readLater','grantFrameAccess','journalCurrent','journalSite','journalAll','settings','authHelp','status','extensionVersion','backupPanel','backupState','backupLastSuccess','backupLastFailure','backupError'];
  const elements = Object.fromEntries(ids.map((id) => [id, makeElement(id)]));
  const state = { runtimeMessages: [], permissionRequests: [], scriptExecutions: [], tabMessages: [], closed: 0 };
  let currentTab = { ...activeTab };
  const chrome = {
    runtime: {
      getManifest: () => ({ version: '0.9.8' }),
      getURL: (p) => `chrome-extension://test/${p}`,
      sendMessage: async (message) => {
        state.runtimeMessages.push(message);
        if (message?.type === 'WEBCLIP_JOURNAL_BACKUP_STATUS') {
          return { ok:true, enabled:true, intervalMinutes:60, retryMinutes:15, lastBackgroundSuccessAt:1700000000000, lastBackgroundFailureAt:0, lastBackgroundError:'', hasCurrentProblem:false };
        }
        if (message?.type === 'WEBCLIP_ENABLE_FRAME_AGENTS') return { ok:true, injectedFrames:1 };
        return { ok:true };
      }
    },
    tabs: {
      query: async () => [{ ...currentTab }],
      get: async (id) => id === currentTab.id ? { ...currentTab } : null,
      sendMessage: async (tabId, message) => {
        state.tabMessages.push({ tabId, message });
        if (message?.command === 'frame-access-candidates') return { ok:true, origins:['https://frame.example'] };
        return { ok:true };
      }
    },
    scripting: {
      executeScript: async (details) => { state.scriptExecutions.push(details); return []; }
    },
    permissions: {
      request: async (details) => { state.permissionRequests.push(details); return true; }
    },
    storage: { session: { get: async () => ({}) } }
  };
  const context = vm.createContext({
    console, chrome, URL, Date, Promise, setTimeout, clearTimeout,
    document: { getElementById: (id) => elements[id] },
    window: { close() { state.closed += 1; } }
  });
  vm.runInContext(popupSource, context);
  await flush();
  return { elements, state, setTab(value) { currentTab = { ...value }; } };
}

(async () => {
  assert.strictEqual(bootstrapSource.trim(), "importScripts('service-worker.js', 'incognito-context-guard.js');", 'bootstrap must load canonical worker before privacy guard');

  const tabs = new Map([
    [1, { id: 1, url: 'https://regular.example/path', incognito: false }],
    [2, { id: 2, url: 'https://private.example/path', incognito: true }],
    [3, { id: 3, url: 'https://unknown.example/path' }],
    [4, new Error('tabs.get failed')]
  ]);
  const { context, state } = makeGuardHarness(tabs);

  await vm.runInContext('updateActionForTab(1, "https://stale.example/")', context);
  assert.strictEqual(state.journalReads, 1, 'regular tab keeps Journal-backed Action behavior');
  assert.strictEqual(state.originalActionCalls.at(-1).knownUrl, 'https://regular.example/path', 'regular Action uses fresh tab URL');

  for (const id of [2, 3, 4]) {
    const before = state.journalReads;
    await vm.runInContext(`updateActionForTab(${id}, "https://must-not-be-used.example/")`, context);
    assert.strictEqual(state.journalReads, before, `tab ${id} must not enter Journal-backed Action path`);
    assert.strictEqual(state.originalActionCalls.at(-1).knownUrl, 'about:blank', `tab ${id} must use fixed neutral Action path`);
  }

  await vm.runInContext('enableFrameAgentsForTab(1)', context);
  assert.deepStrictEqual(state.frameCalls, [1], 'regular target keeps frame-agent enablement');
  for (const id of [2, 3, 4]) {
    let error = null;
    try { await vm.runInContext(`enableFrameAgentsForTab(${id})`, context); } catch (caught) { error = caught; }
    assert(error, `tab ${id} must fail closed`);
    assert.strictEqual(error.code, 'WEBCLIP_PRIVATE_CONTEXT_BLOCKED');
    assert.deepStrictEqual(state.frameCalls, [1], `tab ${id} must fail before original frame injection path`);
  }

  const privatePopup = await makePopupHarness({ id: 20, url: 'https://private.example/', incognito: true });
  assert.strictEqual(privatePopup.state.runtimeMessages.some((m) => m.type === 'WEBCLIP_JOURNAL_BACKUP_STATUS'), false, 'private popup must not request shared backup status');
  assert.strictEqual(privatePopup.elements.backupState.textContent, 'Приватный режим · статус резервной копии скрыт.');
  await privatePopup.elements.grantFrameAccess.listeners.click();
  assert.strictEqual(privatePopup.state.permissionRequests.length, 0, 'private popup must fail before permissions.request');
  assert.strictEqual(privatePopup.state.scriptExecutions.length, 0, 'private explicit frame grant must fail before page discovery/injection');
  await privatePopup.elements.start.listeners.click();
  assert.strictEqual(privatePopup.state.scriptExecutions.length, 1, 'private selection keeps top-page selection bootstrap');
  assert.strictEqual(privatePopup.state.runtimeMessages.some((m) => m.type === 'WEBCLIP_ENABLE_FRAME_AGENTS'), false, 'private Start must not enable cross-origin frame agents');
  assert.strictEqual(privatePopup.state.tabMessages.some((x) => x.message?.type === 'WEBCLIP_START_SELECTION'), true, 'private top-page selection remains available');

  const regularPopup = await makePopupHarness({ id: 21, url: 'https://regular.example/', incognito: false });
  assert.strictEqual(regularPopup.state.runtimeMessages.filter((m) => m.type === 'WEBCLIP_JOURNAL_BACKUP_STATUS').length, 1, 'regular popup must retain backup status read');
  await regularPopup.elements.grantFrameAccess.listeners.click();
  assert.strictEqual(regularPopup.state.permissionRequests.length, 1, 'regular explicit frame grant retains permission request');
  assert.strictEqual(regularPopup.state.runtimeMessages.some((m) => m.type === 'WEBCLIP_ENABLE_FRAME_AGENTS'), true, 'regular explicit frame grant retains frame-agent enablement');

  console.log('P0-045 incognito context authority deterministic regression: PASS');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
