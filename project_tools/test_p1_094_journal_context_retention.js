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

function contextKeys(data) {
  return Object.keys(data).filter((key) => key.startsWith('webclipJournalContext:'));
}

async function buildStoreHarness(initialData, now) {
  const data = { ...initialData };
  const calls = { get: 0, set: 0, remove: 0 };
  const chrome = {
    storage: {
      session: {
        async get(key) {
          calls.get += 1;
          if (key === null) return { ...data };
          if (typeof key === 'string') return Object.prototype.hasOwnProperty.call(data, key) ? { [key]: data[key] } : {};
          throw new Error('unexpected get shape');
        },
        async set(values) {
          calls.set += 1;
          await new Promise((resolve) => setTimeout(resolve, 1));
          Object.assign(data, values);
        },
        async remove(keys) {
          calls.remove += 1;
          for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key];
        }
      }
    }
  };
  const FixedDate = class extends Date { static now() { return now; } };
  const code = between(sw, 'let journalContextMutationChain = Promise.resolve();', 'async function openJournalPage');
  const context = vm.createContext({
    Promise, Map, Math, Number, Object, String, Error, setTimeout, clearTimeout,
    Date: FixedDate,
    chrome,
    JOURNAL_CONTEXT_PREFIX: 'webclipJournalContext:',
    JOURNAL_CONTEXT_TTL_MS: 24 * 60 * 60 * 1000,
    MAX_JOURNAL_SESSION_CONTEXTS: 512,
    MAX_JOURNAL_CONTEXT_URL_CHARS: 8192,
    MAX_JOURNAL_CONTEXT_ID_CHARS: 180,
    JOURNAL_CONTEXT_REMOVE_BATCH: 128
  });
  vm.runInContext(`${code}\nthis.storeForTest = storeJournalSourceContext;`, context);
  return { data, calls, store: context.storeForTest };
}

async function testCapTtlAndBoundedUrl() {
  const now = 2_000_000_000_000;
  const ttl = 24 * 60 * 60 * 1000;
  const initial = { yandexAuth: { accessToken: 'kept' } };
  for (let i = 0; i < 600; i += 1) {
    initial[`webclipJournalContext:fresh-${String(i).padStart(3, '0')}`] = {
      sourceTabId: i + 1,
      sourceUrl: `https://fresh-${i}.example/`,
      createdAt: now - i * 1000
    };
  }
  for (let i = 0; i < 20; i += 1) {
    initial[`webclipJournalContext:expired-${i}`] = {
      sourceTabId: i + 1,
      sourceUrl: 'https://expired.example/',
      createdAt: now - ttl - 1 - i
    };
  }
  initial['webclipJournalContext:future'] = {
    sourceTabId: 1,
    sourceUrl: 'https://future.example/',
    createdAt: now + 1
  };

  const harness = await buildStoreHarness(initial, now);
  const longUrl = `https://example.com/${'a'.repeat(9000)}`;
  await harness.store('new-context', 42.9, longUrl);

  const keys = contextKeys(harness.data);
  assert.strictEqual(keys.length, 512, 'session context store must end at the hard cap including the new context');
  assert(harness.data['webclipJournalContext:new-context'], 'new context must be retained');
  assert.strictEqual(harness.data['webclipJournalContext:new-context'].sourceTabId, 42, 'tab id must be normalized');
  assert.strictEqual(harness.data['webclipJournalContext:new-context'].sourceUrl.length, 8192, 'stored URL must be bounded');
  assert.strictEqual(harness.data['webclipJournalContext:new-context'].createdAt, now, 'new context must receive current timestamp');
  assert(harness.data['webclipJournalContext:fresh-000'], 'newest prior context should survive pruning');
  assert(!harness.data['webclipJournalContext:fresh-599'], 'old overflow context must be pruned');
  assert(!harness.data['webclipJournalContext:expired-0'], 'expired context must be pruned');
  assert(!harness.data['webclipJournalContext:future'], 'future-dated context must not become immortal');
  assert.deepStrictEqual(harness.data.yandexAuth, { accessToken: 'kept' }, 'non-context session values must not be touched');
  assert(harness.calls.remove > 0, 'pruning must remove expired/overflow contexts');
}

async function testConcurrentCreatesStayBounded() {
  const now = 2_000_000_100_000;
  const initial = {};
  for (let i = 0; i < 510; i += 1) {
    initial[`webclipJournalContext:base-${String(i).padStart(3, '0')}`] = {
      sourceTabId: i + 1,
      sourceUrl: `https://base-${i}.example/`,
      createdAt: now - i * 1000
    };
  }
  const harness = await buildStoreHarness(initial, now);
  await Promise.all(Array.from({ length: 20 }, (_, i) =>
    harness.store(`parallel-${String(i).padStart(2, '0')}`, i + 1, `https://parallel-${i}.example/`)
  ));
  assert.strictEqual(contextKeys(harness.data).length, 512, 'serialized concurrent creates must never leave more than 512 contexts');
  assert.strictEqual(harness.calls.set, 20, 'each requested context should complete one serialized set');
}

function testConsumersRejectExpiredOrOversizedState() {
  for (const [name, text] of [['journal.js', journal], ['popup.js', popup]]) {
    assert(text.includes('const JOURNAL_CONTEXT_TTL_MS = 24 * 60 * 60 * 1000;'), `${name} must enforce 24h TTL on read`);
    assert(text.includes('const MAX_JOURNAL_CONTEXT_URL_CHARS = 8192;'), `${name} must enforce URL bound on read`);
    assert(text.includes("slice(0, MAX_JOURNAL_CONTEXT_ID_CHARS)"), `${name} must bound contextId before forming a storage key`);
    assert(text.includes('createdAt <= now'), `${name} must reject future-dated contexts`);
    assert(text.includes('now - createdAt <= JOURNAL_CONTEXT_TTL_MS'), `${name} must reject expired contexts`);
    assert(text.includes('rawUrl.length <= MAX_JOURNAL_CONTEXT_URL_CHARS'), `${name} must reject oversized legacy URLs`);
  }
  const load = between(journal, 'async function loadStoredJournalContext', 'async function resolveSourceContext');
  assert(!load.includes('chrome.storage.session.remove'), 'Journal load must not consume source context; mode switching in the open Journal tab must remain possible');
}

(async () => {
  assert(sw.includes("const MAX_JOURNAL_SESSION_CONTEXTS = 512;"), 'P1-094 hard cap constant missing');
  assert(sw.includes("const JOURNAL_CONTEXT_TTL_MS = 24 * 60 * 60 * 1000;"), 'P1-094 TTL constant missing');
  assert(sw.includes("const MAX_JOURNAL_CONTEXT_URL_CHARS = 8192;"), 'P1-094 URL bound constant missing');
  const openJournal = between(sw, 'async function openJournalPage', 'async function ensureWebClipContentScript');
  assert(openJournal.includes('await storeJournalSourceContext(contextId, tabId, resolvedSourceUrl);'), 'openJournalPage must use bounded context retention helper');
  await testCapTtlAndBoundedUrl();
  await testConcurrentCreatesStayBounded();
  testConsumersRejectExpiredOrOversizedState();
  console.log('PASS P1-094 bounded Journal session context retention');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
