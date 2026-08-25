const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const journal = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');
const popup = fs.readFileSync(path.join(root, 'popup.js'), 'utf8');

function between(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Markers not found: ${startMarker} -> ${endMarker}`);
  return text.slice(start, end);
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function fastTimer(fn) {
  return global.setTimeout(fn, 2);
}

async function settleTurn() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

function makeContextStoreHarness(session) {
  const code = between(sw, 'let journalContextMutationChain = Promise.resolve();', 'async function openJournalPage');
  const context = vm.createContext({
    Promise, Math, Number, Object, String, Error,
    setTimeout: fastTimer,
    clearTimeout,
    Date,
    chrome: { storage: { session } },
    JOURNAL_CONTEXT_PREFIX: 'webclipJournalContext:',
    JOURNAL_CONTEXT_TTL_MS: 24 * 60 * 60 * 1000,
    MAX_JOURNAL_SESSION_CONTEXTS: 512,
    MAX_JOURNAL_CONTEXT_URL_CHARS: 8192,
    MAX_JOURNAL_CONTEXT_ID_CHARS: 180,
    JOURNAL_CONTEXT_REMOVE_BATCH: 128
  });
  vm.runInContext(`${code}\nthis.storeForTest = storeJournalSourceContext;`, context);
  return context.storeForTest;
}

async function testSessionGetTimeoutKeepsActualBarrier() {
  const firstGet = deferred();
  let getCalls = 0;
  let setCalls = 0;
  const store = makeContextStoreHarness({
    get() {
      getCalls += 1;
      if (getCalls === 1) return firstGet.promise;
      return Promise.resolve({});
    },
    remove() { return Promise.resolve(); },
    set() { setCalls += 1; return Promise.resolve(); }
  });

  await assert.rejects(store('first', 1, 'https://one.example/'), /не завершилось/);
  await assert.rejects(store('second', 2, 'https://two.example/'), /не завершилось/);
  assert.strictEqual(getCalls, 1, 'second context mutation must not start while timed-out first get is still unresolved');
  assert.strictEqual(setCalls, 0, 'no set may run before the unresolved get settles');

  firstGet.resolve({});
  await settleTurn();
  assert.strictEqual(getCalls, 2, 'queued context mutation may start only after actual first mutation settles');
  assert.strictEqual(setCalls, 2, 'both actual mutations may finish after the late get settles');
}

async function testSessionRemoveTimeoutDoesNotAllowSetOvertake() {
  const removeDeferred = deferred();
  let removeCalls = 0;
  let setCalls = 0;
  const now = Date.now();
  const store = makeContextStoreHarness({
    get() {
      return Promise.resolve({
        'webclipJournalContext:expired': {
          sourceTabId: 9,
          sourceUrl: 'https://expired.example/',
          createdAt: now - 25 * 60 * 60 * 1000
        }
      });
    },
    remove() { removeCalls += 1; return removeDeferred.promise; },
    set() { setCalls += 1; return Promise.resolve(); }
  });

  await assert.rejects(store('new', 3, 'https://new.example/'), /не завершилось/);
  assert.strictEqual(removeCalls, 1, 'expired context must enter session remove');
  assert.strictEqual(setCalls, 0, 'new context set must not overtake an unresolved remove');
  removeDeferred.resolve();
  await settleTurn();
  assert.strictEqual(setCalls, 1, 'set may run only after actual remove settlement');
}

async function testSessionSetTimeoutKeepsNextMutationQueued() {
  const firstSet = deferred();
  let getCalls = 0;
  let setCalls = 0;
  const store = makeContextStoreHarness({
    get() { getCalls += 1; return Promise.resolve({}); },
    remove() { return Promise.resolve(); },
    set() {
      setCalls += 1;
      if (setCalls === 1) return firstSet.promise;
      return Promise.resolve();
    }
  });

  await assert.rejects(store('first-set', 4, 'https://first.example/'), /не завершилось/);
  await assert.rejects(store('second-set', 5, 'https://second.example/'), /не завершилось/);
  assert.strictEqual(getCalls, 1, 'second mutation must not begin while first set remains unresolved');
  assert.strictEqual(setCalls, 1, 'only the first actual set may be unresolved');
  firstSet.resolve();
  await settleTurn();
  assert.strictEqual(getCalls, 2, 'second context mutation begins after late first set settlement');
  assert.strictEqual(setCalls, 2, 'second set eventually runs after the barrier opens');
}

async function testExtensionPageDeadlineHelper(source, startMarker, endMarker, exportName) {
  const code = between(source, startMarker, endMarker);
  const context = vm.createContext({ Promise, Math, Number, Error, setTimeout: fastTimer, clearTimeout });
  vm.runInContext(`${code}\nthis.helperForTest = ${exportName};`, context);
  await assert.rejects(
    context.helperForTest(() => new Promise(() => {}), 'Never settling API'),
    /не завершилось/,
    `${exportName} must reject never-settling Chrome API reads`
  );
  const result = await context.helperForTest(() => Promise.resolve({ ok: true }), 'Fast API');
  assert.strictEqual(result.ok, true, `${exportName} must preserve successful results`);
}

function testStaticBoundaries() {
  const openJournal = between(sw, 'async function openJournalPage', 'async function ensureWebClipContentScript');
  const contextStore = between(sw, 'async function storeJournalSourceContext', 'async function openJournalPage');
  assert(contextStore.includes("waitJournalContextSessionOperation(actual, 'Сохранение session-контекста журнала')"), 'P1-123 context mutation must expose a bounded wait');
  assert(contextStore.includes('journalContextMutationChain = actual.then'), 'P1-123 queue must remain attached to actual settlement, not the local timeout');
  assert(contextStore.includes('chrome.storage.session.get(null)'), 'P1-123 pruning must include session get');
  assert(contextStore.includes('chrome.storage.session.remove(batch)'), 'P1-123 pruning must include session remove');
  assert(contextStore.includes('chrome.storage.session.set({'), 'P1-123 context write must include session set');
  const storeAt = openJournal.indexOf('await storeJournalSourceContext(contextId, tabId, resolvedSourceUrl);');
  const tabAt = openJournal.indexOf('createTabNextTo(');
  assert(storeAt >= 0 && tabAt > storeAt, 'Journal tab creation must happen only after bounded session context storage completes');

  const storedContext = between(journal, 'async function loadStoredJournalContext', 'async function resolveSourceContext');
  assert(storedContext.includes("readJournalExtensionApiBounded(() => chrome.storage.session.get(key)"), 'Journal session-context read must be bounded');
  const resolvedContext = between(journal, 'async function resolveSourceContext', 'async function loadJournalViewPreferences');
  assert(resolvedContext.includes("readJournalExtensionApiBounded(() => chrome.tabs.get(sourceTabId)"), 'Journal source tabs.get must be bounded');
  const preferences = between(journal, 'async function loadJournalViewPreferences', 'function updateReadingFilterButtons');
  assert(preferences.includes("readJournalExtensionApiBounded(() => chrome.storage.local.get('webclipJournalGroupByUrl')"), 'Journal restore/preferences read must be bounded');
  const revision = between(journal, 'async function readJournalRevisionToken', 'async function syncJournalRevisionBaseline');
  assert(revision.includes("readJournalExtensionApiBounded(() => chrome.storage.local.get('webclipJournalRevision')"), 'Journal revision restore read must be bounded');
  const health = between(journal, 'async function runJournalHealthCheck', 'function scheduleJournalHealthCheck');
  assert(health.includes("sendReadOnlyRuntimeMessage({ type: 'WEBCLIP_JOURNAL_PING' }, JOURNAL_EXTENSION_API_TIMEOUT_MS"), 'Journal health ping must use bounded read-only runtime helper');

  const backupStatus = between(popup, 'async function loadBackupStatus', 'function formatDateTime');
  assert(backupStatus.includes("readPopupExtensionApiBounded(() => chrome.runtime.sendMessage({ type: 'WEBCLIP_JOURNAL_BACKUP_STATUS' })"), 'Popup Journal backup status read must be bounded');
  const activeTab = between(popup, 'async function getActiveSourceTab', 'function isHttpPageUrl');
  assert(activeTab.includes("readPopupExtensionApiBounded(() => chrome.tabs.query({ active: true, currentWindow: true })"), 'Popup active-tab restore must be bounded');
  const popupContext = between(popup, 'async function getJournalSourceContext', 'async function openJournal');
  assert(popupContext.includes("readPopupExtensionApiBounded(() => chrome.storage.session.get(key)"), 'Popup Journal session context read must be bounded');
  assert(popupContext.includes("readPopupExtensionApiBounded(() => chrome.tabs.get(sourceTabId)"), 'Popup Journal source tab restore must be bounded');
  const popupOpen = between(popup, 'async function openJournal', "readLaterButton.addEventListener");
  assert(popupOpen.includes("readPopupExtensionApiBounded(() => chrome.runtime.sendMessage({"), 'Popup Journal open request must be bounded');
}

(async () => {
  assert(sw.includes('const JOURNAL_CONTEXT_SESSION_TIMEOUT_MS = 10_000;'), 'P1-123 session-context timeout constant missing');
  assert(journal.includes('const JOURNAL_EXTENSION_API_TIMEOUT_MS = 10_000;'), 'P1-127 Journal extension API timeout constant missing');
  assert(journal.includes('let journalHealthTimer = 0;'), 'P1-127 health-check timer lifecycle handle must be declared before scheduling');
  assert(popup.includes('const POPUP_EXTENSION_API_TIMEOUT_MS = 10_000;'), 'P1-127 popup extension API timeout constant missing');
  await testSessionGetTimeoutKeepsActualBarrier();
  await testSessionRemoveTimeoutDoesNotAllowSetOvertake();
  await testSessionSetTimeoutKeepsNextMutationQueued();
  await testExtensionPageDeadlineHelper(journal, 'const JOURNAL_EXTENSION_API_TIMEOUT_MS', 'const journalContextId', 'readJournalExtensionApiBounded');
  await testExtensionPageDeadlineHelper(popup, 'const POPUP_EXTENSION_API_TIMEOUT_MS', 'const startButton', 'readPopupExtensionApiBounded');
  testStaticBoundaries();
  console.log('PASS P1-123/P1-127 session-context and Journal extension-page Chrome API deadlines');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
