const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const journal = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Missing markers: ${startMarker} -> ${endMarker}`);
  return source.slice(start, end);
}

const getMany = section(journal, 'async function readJournalEntriesByIdsForView(ids) {', 'function collectBoundedDomainAggregate');
assert(getMany.includes("db.transaction(JOURNAL_STORE, 'readonly')"));
assert(getMany.includes('setTimeout(() =>'));
assert(getMany.includes('tx.abort()'));
assert(getMany.includes('tx.oncomplete'));
assert(getMany.includes("type: 'WEBCLIP_JOURNAL_GET_MANY'"));
assert(getMany.includes('JOURNAL_VIEW_RUNTIME_DEADLINE_MS'));

for (const [start, end] of [
  ['async function readJournalViewMetaDirect', 'async function readJournalViewMetaViaServiceWorker'],
  ['async function readJournalPageDirect', 'async function readJournalPageViaServiceWorker'],
  ['async function readJournalUrlGroupsDirect', 'async function readJournalUrlGroupsViaServiceWorker'],
  ['async function readJournalUrlGroupEntriesDirect', 'async function readJournalUrlGroupEntriesViaServiceWorker']
]) {
  const source = section(journal, start, end);
  assert(source.includes("db.transaction(JOURNAL_STORE, 'readonly')") || start.includes('GroupEntries'), `${start}: readonly transaction missing`);
  assert(source.includes('JOURNAL_VIEW_QUERY_DEADLINE_MS') || start.includes('GroupEntries'), `${start}: deadline missing`);
  assert(source.includes('tx.oncomplete') || start.includes('GroupEntries'), `${start}: completion gate missing`);
}
const pageDirect = section(journal, 'async function readJournalPageDirect', 'async function readJournalPageViaServiceWorker');
assert(!pageDirect.includes('if (!request) { resolve('), 'P1-085: defensive cursor branch must not publish before tx completion');
const groupDirect = section(journal, 'async function readJournalUrlGroupEntriesDirect', 'async function readJournalUrlGroupEntriesViaServiceWorker');
assert(!groupDirect.includes("if (!key) { resolve({ entries: [] })"), 'P1-085: empty key must not early-resolve an opened readonly transaction');

(async () => {
  let aborted = false;
  let fallbackCalls = 0;
  let fallbackTimeout = 0;
  let fallbackType = '';
  const db = {
    close() {},
    transaction() {
      const tx = {
        error: null,
        oncomplete: null,
        onerror: null,
        onabort: null,
        objectStore() {
return { get() { return { result: null, error: null, onsuccess: null, onerror: null }; } };
        },
        abort() {
aborted = true;
queueMicrotask(() => tx.onabort?.());
        }
      };
      return tx;
    }
  };
  const context = vm.createContext({
    console,
    Promise,
    Error,
    Number,
    Math,
    String,
    Array,
    Set,
    Map,
    setTimeout,
    clearTimeout,
    openJournalDbForView: async () => db,
    sendReadOnlyRuntimeMessage: async (message, timeoutMs) => {
      fallbackCalls += 1;
      fallbackType = message.type;
      fallbackTimeout = timeoutMs;
      return { ok: true, entries: [{ id: 'entry-1', title: 'fallback' }] };
    },
    requireOk(value) { if (!value?.ok) throw new Error('not ok'); }
  });
  const code = `const JOURNAL_VIEW_QUERY_DEADLINE_MS = 20;\nconst JOURNAL_VIEW_RUNTIME_DEADLINE_MS = 50;\nconst JOURNAL_STORE = 'entries';\n${section(journal, 'function makeJournalViewDeadlineError', 'function collectBoundedDomainAggregate')}\nthis.readForTest = readJournalEntriesByIdsForView;`;
  vm.runInContext(code, context);
  const result = await context.readForTest(['entry-1']);
  assert.strictEqual(aborted, true, 'hung direct readonly transaction must be aborted');
  assert.strictEqual(fallbackCalls, 1, 'normal service-worker fallback must run once');
  assert.strictEqual(fallbackType, 'WEBCLIP_JOURNAL_GET_MANY');
  assert.strictEqual(fallbackTimeout, 50);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].id, 'entry-1');
  console.log('P1-085 direct Journal readonly deadline/fallback regression PASS');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
