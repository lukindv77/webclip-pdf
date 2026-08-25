const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const journal = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

assert(!/let\s+currentEntries\s*=/.test(journal), 'P1-032: Full Journal must not retain an all-journal currentEntries array');
assert(!journal.includes('limit: 100000'), 'P1-032: journal UI must not request 100k list summaries');
assert(!worker.includes("case 'WEBCLIP_JOURNAL_VIEW_SCAN'"), 'P1-032: legacy materializing VIEW_SCAN RPC must be removed');
assert(!/async function scanJournalView\s*\(/.test(worker), 'P1-032: legacy scanJournalView materializer must be removed');

for (const source of [journal, worker]) {
  assert(source.includes('JOURNAL_VIEW_QUERY_DEADLINE_MS'), 'P1-032: cursor view queries need an explicit deadline');
  assert(source.includes('MAX_DOMAIN_FILTER_BASES'), 'P1-032: domain aggregation must have a base-domain memory budget');
  assert(source.includes('MAX_DOMAIN_FILTER_CHILDREN'), 'P1-032: domain aggregation must have a child-domain memory budget');
  assert(source.includes("index('urlKeyCreatedAt').openCursor"), 'P1-032: URL grouping must use the compound URL/time index');
}

assert(journal.includes('readJournalPageDirect'), 'P1-032: non-group list must use a cursor page query');
assert(journal.includes('readJournalUrlGroupsDirect'), 'P1-032: URL groups must be aggregated without retaining every entry id');
assert(journal.includes('readJournalUrlGroupEntriesDirect'), 'P1-032: expanded groups must read children in bounded batches');
assert(journal.includes('limit: GROUP_ENTRY_PAGE_SIZE'), 'P1-032: expanded URL groups must stay batch-limited');
assert(!journal.includes('entryIds: []'), 'P1-032: URL groups must not retain all child ids');
assert(journal.includes('JOURNAL_VIEW_RUNTIME_DEADLINE_MS'), 'P1-032: service-worker fallbacks need an explicit runtime deadline');
for (const type of ['WEBCLIP_JOURNAL_GET_MANY', 'WEBCLIP_JOURNAL_VIEW_META', 'WEBCLIP_JOURNAL_VIEW_PAGE', 'WEBCLIP_JOURNAL_VIEW_GROUPS', 'WEBCLIP_JOURNAL_VIEW_GROUP_ENTRIES']) {
  const callPattern = new RegExp(`sendReadOnlyRuntimeMessage\\([^;]+${type}`);
  assert(callPattern.test(journal), `P1-032: ${type} fallback must use bounded read-only runtime messaging`);
}
assert(/for \(const key of \[\.\.\.expandedUrlGroups\]\)[\s\S]*expandedUrlGroups\.delete\(key\)/.test(journal), 'P1-032: expanded URL-group keys must be pruned to the visible bounded page');
assert(/for \(const base of \[\.\.\.expandedDomainBases\]\)[\s\S]*expandedDomainBases\.delete\(base\)/.test(journal), 'P1-032: expanded domain keys must be pruned to the visible bounded model');

const compareStart = journal.indexOf('function compareJournalUrlGroups');
const compareEnd = journal.indexOf('async function readJournalUrlGroupsDirect', compareStart);
assert(compareStart >= 0 && compareEnd > compareStart, 'P1-032: bounded group selector helpers missing');
const code = journal.slice(compareStart, compareEnd);
const context = vm.createContext({ Number, String });
vm.runInContext(`${code}\nthis.insert = insertBoundedJournalGroup; this.compare = compareJournalUrlGroups; this.after = groupComesAfterBoundary;`, context);
const list = [];
for (let i = 0; i < 10000; i += 1) {
  context.insert(list, { key: `u-${i}`, url: `https://example.test/${i}`, latest: i }, 20);
  assert(list.length <= 20, 'P1-032: top-page URL-group selector exceeded its fixed memory bound');
}
for (let i = 1; i < list.length; i += 1) {
  assert(context.compare(list[i - 1], list[i]) <= 0, 'P1-032: retained URL-group page is not deterministically sorted');
}
assert.strictEqual(list[0].latest, 9999);
assert.strictEqual(list[list.length - 1].latest, 9980);

const page1Boundary = list[list.length - 1];
const page2 = [];
for (let i = 0; i < 10000; i += 1) {
  const group = { key: `u-${i}`, url: `https://example.test/${i}`, latest: i };
  if (context.after(group, page1Boundary)) context.insert(page2, group, 20);
}
assert.strictEqual(page2[0].latest, 9979);
assert.strictEqual(page2[page2.length - 1].latest, 9960);

const domainStart = journal.indexOf('function collectBoundedDomainAggregate');
const domainEnd = journal.indexOf('async function readJournalViewMetaDirect', domainStart);
assert(domainStart >= 0 && domainEnd > domainStart, 'P1-032: bounded domain aggregate helpers missing');
const domainCode = journal.slice(domainStart, domainEnd);
const domainContext = vm.createContext({
  Number,
  String,
  Map,
  MAX_DOMAIN_FILTER_BASES: 500,
  MAX_DOMAIN_FILTER_CHILDREN: 1500,
  normalizeReadingFilter(value) { return value === 'later' ? 'later' : value === 'read' ? 'read' : 'all'; },
  entryDomainHierarchy(entry) { return { base: String(entry.base || ''), third: String(entry.third || '') }; }
});
vm.runInContext(`${domainCode}\nthis.collect = collectBoundedDomainAggregate; this.finish = finalizeDomainAggregate;`, domainContext);
const domainState = { totalEntries: 0, groups: new Map(), childCount: 0, truncated: false, childrenTruncated: false };
for (let i = 0; i < 100000; i += 1) {
  domainContext.collect(domainState, { base: `d${i}.example`, third: `x.d${i}.example`, createdAt: 100000 - i, readingMode: 'read' }, '', 'all');
}
const domainResult = domainContext.finish(domainState);
assert.strictEqual(domainResult.totalEntries, 100000, 'P1-032: domain aggregation must preserve exact all-entry count');
assert.strictEqual(domainResult.groups.length, 500, 'P1-032: domain aggregate must cap retained base groups');
assert(domainResult.truncated, 'P1-032: domain aggregate must expose truncation when the memory budget is reached');

console.log('P1-032 bounded cursor/index/aggregate journal view tests OK');
