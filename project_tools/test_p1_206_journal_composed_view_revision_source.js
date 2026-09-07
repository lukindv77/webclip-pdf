'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const journal = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

// Positive controls that must remain.
requireSource(/let\s+journalLoadGeneration\s*=\s*0/.test(journal), 'missing latest Journal UI-load generation fence');
requireSource(/let\s+renderGeneration\s*=\s*0/.test(journal), 'missing Journal render generation fence');
requireSource(/JOURNAL_VIEW_QUERY_DEADLINE_MS/.test(journal) && /JOURNAL_VIEW_QUERY_DEADLINE_MS/.test(worker), 'missing bounded Journal read deadline');
requireSource(/readJournalViewMetaWithFallback/.test(journal), 'missing Journal metadata direct/fallback surface');
requireSource(/readJournalPageDirect/.test(journal), 'missing bounded direct Journal page reader');
requireSource(/readJournalUrlGroupsDirect/.test(journal), 'missing bounded direct grouped-page reader');
requireSource(/readJournalUrlGroupEntriesDirect/.test(journal), 'missing bounded direct grouped-child reader');
requireSource(/urlGroupPageBoundaries/.test(journal), 'missing grouped pagination boundary state');
requireSource(/JOURNAL_META_STORE/.test(worker) && /JOURNAL_META_REVISION_KEY/.test(worker), 'missing authoritative Journal DB revision primitive');
requireSource(/touchJournalDbRevision\s*\(/.test(worker), 'missing atomic Journal DB revision advancement helper');
requireSource(/test_journal_load_generation|journalLoadGeneration/.test(journal), 'missing existing latest-load semantics');

// Target 1: direct component reads include meta store in the same readonly transaction and expose exact sourceRevision.
for (const functionName of [
  'readJournalViewMetaDirect',
  'readJournalPageDirect',
  'readJournalUrlGroupsDirect',
  'readJournalUrlGroupEntriesDirect'
]) {
  const start = journal.indexOf(`async function ${functionName}`);
  const end = start >= 0 ? journal.indexOf('\nasync function ', start + 20) : -1;
  const body = start >= 0 ? journal.slice(start, end > start ? end : Math.min(journal.length, start + 30000)) : '';
  requireSource(start >= 0, `missing ${functionName}`);
  requireSource(/JOURNAL_META_STORE/.test(body), `${functionName} does not visibly read Journal meta/revision in the same component transaction`);
  requireSource(/sourceRevision|journalRevision/.test(body), `${functionName} does not visibly return an exact source revision receipt`);
}

// Target 2: runtime fallback component results carry the same revision contract.
for (const type of [
  'WEBCLIP_JOURNAL_VIEW_META',
  'WEBCLIP_JOURNAL_VIEW_PAGE',
  'WEBCLIP_JOURNAL_VIEW_GROUPS',
  'WEBCLIP_JOURNAL_VIEW_GROUP_ENTRIES'
]) {
  const index = worker.indexOf(type);
  const body = index >= 0 ? worker.slice(Math.max(0, index - 5000), Math.min(worker.length, index + 30000)) : '';
  requireSource(index >= 0, `missing ${type} runtime fallback`);
  requireSource(/sourceRevision|journalRevision/.test(body), `${type} does not visibly return exact Journal source revision`);
}

// Target 3: loadJournal compares metadata/page source revisions and performs final authoritative DB revision fencing.
const loadStart = journal.indexOf('async function loadJournal({');
const loadEnd = loadStart >= 0 ? journal.indexOf('\nfunction refreshBackupInfo', loadStart) : -1;
const loadBody = loadStart >= 0 ? journal.slice(loadStart, loadEnd > loadStart ? loadEnd : Math.min(journal.length, loadStart + 30000)) : '';
requireSource(/sourceRevision|journalRevision/.test(loadBody), 'loadJournal has no visible Journal source revision receipt');
requireSource(/(?:meta|metadata).*?(?:sourceRevision|journalRevision)[\s\S]{0,5000}(?:page|render).*?(?:sourceRevision|journalRevision)/i.test(loadBody), 'loadJournal does not visibly compare component source revisions');
requireSource(/readJournalDbRevision|readCurrentJournalRevision|JOURNAL_META_REVISION_KEY|sourceRevision/.test(loadBody), 'loadJournal has no visible authoritative final source-revision fence');
requireSource(/view.changed|refresh.required|stale.source|mixed.source|WEBCLIP_JOURNAL_VIEW_STALE/i.test(loadBody), 'loadJournal has no visible controlled stale/mixed-view result path');

// Target 4: baseline comes from the accepted rendered source revision, not an unrelated post-render notification read.
requireSource(/lastJournalRevisionToken\s*=\s*(?:rendered|accepted|view|source).*revision/i.test(journal) || /lastJournalRevisionToken\s*=\s*.*sourceRevision/i.test(journal),
  'render baseline is not visibly assigned from accepted rendered source revision');
requireSource(!/await\s+renderCurrentEntries\(\)[\s\S]{0,1200}await\s+syncJournalRevisionBaseline\(\)/.test(loadBody),
  'loadJournal still post-baselines a composed render with a fresh unrelated revision notification read');

// Target 5: grouped continuation/page boundary is revision-bound.
requireSource(/urlGroupPageBoundaries\.set\([\s\S]{0,1200}(?:sourceRevision|journalRevision)/.test(journal),
  'grouped continuation boundary is not visibly bound to source revision');
requireSource(/(?:boundary|continuation)[\s\S]{0,2500}(?:sourceRevision|journalRevision)[\s\S]{0,2500}(?:stale|reject|refresh|restart)/i.test(journal),
  'old grouped continuation has no visible source-revision rejection path');

// Target 6: group child expansion is bound to the rendered group revision.
const childStart = journal.indexOf('async function readJournalUrlGroupEntriesDirect');
const childBody = childStart >= 0 ? journal.slice(childStart, Math.min(journal.length, childStart + 25000)) : '';
requireSource(/expectedRevision|sourceRevision|journalRevision/.test(childBody), 'group child reader has no expected/source revision binding');

// Target 7: ungrouped pagination has revision-aware page state/receipt as well.
requireSource(/(?:pageReceipt|pageSourceRevision|paginationRevision|expectedRevision)/i.test(journal),
  'ungrouped page-number state has no visible source-revision receipt');

// Target 8: bounded retry; do not trade coherence for an infinite churn loop.
requireSource(/MAX_.*JOURNAL.*VIEW.*(?:RETRY|ATTEMPT)|JOURNAL_VIEW_.*(?:RETRY|ATTEMPT)|viewRetry/i.test(journal),
  'no explicit bounded composed-view retry budget');
requireSource(!/while\s*\(\s*true\s*\)[\s\S]{0,10000}(?:loadJournal|sourceRevision|journalRevision)/i.test(journal),
  'composed-view coherence appears to use an unbounded retry loop');

// Target 9: existing atomic mutation revision stays in place.
for (const reason of ['append', 'update-entry', 'delete-entry', 'clear-', 'import-replace']) {
  requireSource(worker.includes(reason), `missing existing Journal revision mutation positive control: ${reason}`);
}

// Target 10: Chrome Storage change marker remains notification-only; exact DB revision must exist independently.
requireSource(/webclipJournalRevision/.test(journal) && /webclipJournalRevision/.test(worker), 'missing Journal change-notification positive control');
requireSource(/JOURNAL_META_REVISION_KEY/.test(worker), 'source authority collapsed to notification marker; DB revision missing');

if (failures.length) {
  console.error('P1-206 Journal composed-view revision source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-206 Journal composed-view revision source gate: PASS');
