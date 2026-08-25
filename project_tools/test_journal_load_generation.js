const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');
const start = source.indexOf('async function loadJournal({');
const end = source.indexOf('function refreshBackupInfo', start);
if (start < 0 || end < 0) throw new Error('loadJournal block not found');
const code = source.slice(start, end);

function deferred() {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
}

(async () => {
  assert(source.includes('let journalLoadGeneration = 0;'), 'journal loads must have a generation fence');
  assert(source.includes('requestedMode = mode'), 'journal load must snapshot the requested mode');
  assert(source.includes('requestedSourceUrl = sourceUrl'), 'journal load must snapshot the source URL');

  const pending = [];
  const requests = [];
  const statuses = [];
  const backupRefresh = deferred();
  const context = vm.createContext({
    console,
    Promise,
    Error,
    String,
    Map,
    window: { scrollX: 0, scrollY: 0, scrollTo() {} },
    readJournalViewMetaWithFallback(request) {
      requests.push({ ...request });
      const d = deferred();
      pending.push(d);
      return d.promise;
    },
    refreshBackupInfo() { return backupRefresh.promise; },
    makeEmptyJournalModeCounts() { return { all: {}, current: {}, site: {} }; },
    updateModeButtons() {},
    updateReadingFilterButtons() {},
    updateJournalModeCounts() {},
    renderDomainFilter() {},
    async renderCurrentEntries() {},
    async syncJournalRevisionBaseline() {},
    setStatus(message, kind) { statuses.push({ message, kind }); }
  });
  vm.runInContext(`
    let journalLoadGeneration = 0;
    let mode = 'current';
    let sourceUrl = 'https://example.test/a';
    let readingFilter = 'all';
    let domainSearchQuery = '';
    function currentJournalTextFilter() { return { logic: 'and', rows: [] }; }
    let journalModeCounts = {};
    let journalDomainModel = {};
    let selectedDomainFilter = { level: 'all', value: '' };
    let urlGroupPageBoundaries = new Map([[1, null]]);
    let groupByUrl = false;
    let currentPage = 1;
    ${code}
    this.loadForTest = loadJournal;
    this.setModeForTest = (value) => { mode = value; };
    this.getStateForTest = () => ({ mode, journalDomainModel, journalModeCounts });
  `, context);

  const first = context.loadForTest({ preserveScroll: false });
  context.setModeForTest('all');
  const second = context.loadForTest({ preserveScroll: false });
  assert.deepStrictEqual(requests.map((item) => item.includeDomains), [false, true]);
  assert.deepStrictEqual(requests.map((item) => item.source), ['https://example.test/a', 'https://example.test/a']);

  pending[1].resolve({
    counts: { all: { total: 1 } },
    domains: { totalEntries: 1, groups: [{ base: 'example.test', count: 1, children: [] }] }
  });
  await Promise.race([second, new Promise((_, reject) => setTimeout(() => reject(new Error('journal load incorrectly waited for backup telemetry')), 100))]);
  assert.strictEqual(context.getStateForTest().journalDomainModel.groups[0].base, 'example.test');

  pending[0].resolve({
    counts: { current: { total: 1 } },
    domains: { totalEntries: 0, groups: [] }
  });
  await first;
  assert.strictEqual(context.getStateForTest().journalDomainModel.groups[0].base, 'example.test', 'late old-mode metadata scan must not overwrite the newest journal view');
  assert.strictEqual(statuses.length, 0);

  console.log('Journal load generation/stale-mode race tests OK');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
