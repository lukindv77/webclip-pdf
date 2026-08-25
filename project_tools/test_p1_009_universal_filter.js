'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const context = vm.createContext({ URL, console });
context.globalThis = context;
vm.runInContext(fs.readFileSync(path.join(ROOT, 'public-suffix.js'), 'utf8'), context, { filename: 'public-suffix.js' });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'journal-text-filter.js'), 'utf8'), context, { filename: 'journal-text-filter.js' });
const F = context.WebClipJournalTextFilter;
assert(F && F.MAX_ROWS === 8, 'P1-009 shared filter must expose the bounded 8-row contract');

const entries = [
  { id:'a', title:'Alpha handbook', url:'https://docs.example.com/red/path', hostname:'docs.example.com', journalComments:[{text:'red note'}] },
  { id:'b', title:'Beta release', url:'https://news.example.net/blue/path', hostname:'news.example.net', fileComment:'blue file note' },
  { id:'c', title:'Alpha report', url:'https://portal.example.com/green/path', hostname:'portal.example.com', journalComments:[{text:'blue journal note'}] },
];
const filter = (logic, rows) => F.normalize({logic, rows});
const row = (text, fields) => ({text, fields});
const ids = (f) => entries.filter((entry) => F.matches(entry, f)).map((entry) => entry.id);

assert.deepStrictEqual(ids(filter('and', [row('alpha', {title:true})])), ['a','c']);
assert.deepStrictEqual(ids(filter('and', [row('blue', {comments:true})])), ['b','c']);
assert.deepStrictEqual(ids(filter('and', [row('portal.example.com', {site:true})])), ['c']);
assert.deepStrictEqual(ids(filter('and', [row('/red/path', {url:true})])), ['a']);
assert.deepStrictEqual(ids(filter('and', [row('alpha', {title:true}), row('blue', {comments:true})])), ['c']);
assert.deepStrictEqual(ids(filter('or', [row('red note', {comments:true}), row('beta', {title:true})])), ['a','b']);
assert.deepStrictEqual(ids(filter('and', [{text:'Beta',fields:{}}])), ['b'], 'no-field input must fail safe to title');
assert.strictEqual(F.matches(entries[0], filter('and', [])), true, 'empty filter must preserve the unfiltered Journal');

const tooMany = filter('or', Array.from({length: 12}, (_, i) => row(`q${i}`, {title:true})));
assert.strictEqual(tooMany.rows.length, 8, 'rows must be bounded before cursor scans');
const huge = filter('and', [row('x'.repeat(900), {title:true})]);
assert.strictEqual(huge.rows[0].text.length, 512, 'query scalar must be bounded');

const crossBoundary = 'a'.repeat(8190) + 'MAGIC-BOUNDARY' + 'z'.repeat(9000);
assert.strictEqual(F.matches({title:crossBoundary}, filter('and', [row('magic-boundary', {title:true})])), true, 'chunked matching must preserve boundary-spanning matches');

const journal = fs.readFileSync(path.join(ROOT, 'journal.js'), 'utf8');
const sw = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'journal.html'), 'utf8');
assert(html.includes('id="textFilterRows"') && html.includes('value="and" checked') && html.includes('Наименование'), 'P1-009 Journal UI must be present');
assert(journal.includes('textFilter: currentJournalTextFilter()'), 'direct Journal page/group requests must carry the filter');
assert(journal.includes('WebClipJournalTextFilter.matches(entry, sourceContext.textFilter)'), 'direct metadata counters/domain scan must apply text filter before aggregation');
assert(sw.includes('textFilter: message.textFilter'), 'service-worker fallback must receive the filter');
assert(sw.includes('WebClipJournalTextFilter.matches(entry, sourceContext.textFilter)'), 'service-worker metadata scan must filter before counters/domain aggregation');
assert(sw.includes('journalViewSummaryMatches(summary, context, { entry })'), 'service-worker page/group cursor matching must use full entries for comments/title');

console.log('P1-009 universal Journal filter regression PASS');
