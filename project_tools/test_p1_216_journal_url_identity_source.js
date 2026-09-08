'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const workerPath = path.join(root, 'service-worker.js');
const source = fs.readFileSync(workerPath, 'utf8');

function must(re, message) {
  assert.match(source, re, message);
}

function functionBody(name) {
  const start = source.indexOf(`function ${name}`) >= 0
    ? source.indexOf(`function ${name}`)
    : source.indexOf(`async function ${name}`);
  assert.ok(start >= 0, `Missing function ${name}`);
  const next = source.indexOf('\nfunction ', start + 20);
  const nextAsync = source.indexOf('\nasync function ', start + 20);
  const candidates = [next, nextAsync].filter((x) => x > start);
  const end = candidates.length ? Math.min(...candidates) : source.length;
  return source.slice(start, end);
}

// Positive controls that must survive the P1-216 repair.
must(/function\s+normalizeJournalUrl\s*\(/, 'Canonical URL normalization must remain present.');
must(/function\s+getJournalSiteKey\s*\(/, 'Site-scope normalization must remain separate from exact URL scope.');
must(/urlKey:\s*normalizeJournalUrl\(url\)/, 'Imported rows must continue receiving canonical urlKey when possible.');
must(/entry\.urlKey\s*\|\|\s*normalizeJournalUrl\(entry\.url\s*\|\|\s*['"]{2}\)/, 'Existing legacy fallback positive control must remain visible until centralized.');

// Target contract: one explicit effective identity primitive, not ad-hoc per-call fallbacks.
must(/function\s+(?:effectiveJournalUrlKey|effectiveJournalUrlIdentity|journalEntryEffectiveUrlKey)\s*\(/,
  'P1-216 requires one canonical effective Journal URL identity helper.');
must(/urlKeyMismatch|url-identity-mismatch|identityMismatch|mismatch/i,
  'Persisted-vs-derived URL-key mismatch must be classified explicitly.');

const listBody = functionBody('listJournalEntries');
assert.match(listBody, /effectiveJournalUrl|journalEntryEffectiveUrl/i,
  'WEBCLIP_JOURNAL_LIST/template membership must use effective URL identity.');

const pageBody = functionBody('queryJournalViewPage');
assert.match(pageBody, /effectiveJournalUrl|journalEntryEffectiveUrl/i,
  'Ungrouped Journal view must use the shared effective identity helper.');

const groupsBody = functionBody('queryJournalViewGroups');
assert.match(groupsBody, /effectiveJournalUrl|journalEntryEffectiveUrl|ensureJournalUrlIdentityMigration|journalUrlIdentityReady/i,
  'Grouped view must not rely on persisted urlKey index without canonical migration/fallback.');

const groupEntriesBody = functionBody('queryJournalViewGroupEntries');
assert.match(groupEntriesBody, /effectiveJournalUrl|journalEntryEffectiveUrl|ensureJournalUrlIdentityMigration|journalUrlIdentityReady/i,
  'Grouped-entry read must share the same effective URL domain.');

const clearBody = functionBody('clearJournalEntries');
assert.match(clearBody, /effectiveJournalUrl|journalEntryEffectiveUrl|ensureJournalUrlIdentityMigration|journalUrlIdentityReady/i,
  'URL-scoped clear must remove legacy rows in the same effective URL domain.');

const deleteBody = functionBody('deleteJournalEntry');
assert.match(deleteBody, /effectiveJournalUrl|journalEntryEffectiveUrl/i,
  'Single-entry delete must derive effective URL identity before stats repair.');
assert.doesNotMatch(deleteBody, /if\s*\(\s*entry\.urlKey\s*\)\s*\{[^}]*rebuildUrlStatsForUrl/s,
  'Stats repair must not be conditional only on persisted entry.urlKey.');

const perUrlStatsBody = functionBody('rebuildUrlStatsForUrl');
assert.match(perUrlStatsBody, /effectiveJournalUrl|journalEntryEffectiveUrl|ensureJournalUrlIdentityMigration|journalUrlIdentityReady/i,
  'Per-URL stats rebuild must include legacy rows or require proven canonical migration.');

const allStatsBody = functionBody('rebuildAllUrlStats');
assert.match(allStatsBody, /effectiveJournalUrl|journalEntryEffectiveUrl/i,
  'Full stats rebuild must use the same canonical effective identity helper.');

// URL identity repair must not be implemented as an unbounded materialization.
assert.doesNotMatch(source, /getAll\s*\(\s*\)[^;]*journalUrl/i,
  'P1-216 migration/fallback must remain bounded; do not materialize the whole Journal via getAll().');

// Exact URL identity must not be guessed from hostname alone.
const helperMatch = source.match(/function\s+(effectiveJournalUrlKey|effectiveJournalUrlIdentity|journalEntryEffectiveUrlKey)\s*\([^)]*\)\s*\{([\s\S]{0,4000}?)\n\}/);
assert.ok(helperMatch, 'Unable to inspect effective URL identity helper.');
assert.match(helperMatch[0], /normalizeJournalUrl\s*\(/, 'Effective URL identity must reuse normalizeJournalUrl().');
assert.doesNotMatch(helperMatch[0], /hostname\s*\|\|/, 'Exact URL identity must not fall back to hostname-only scope.');

console.log('P1-216 journal URL identity source gate: PASS');
