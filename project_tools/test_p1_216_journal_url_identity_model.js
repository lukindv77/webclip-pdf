'use strict';

const assert = require('assert');

// P1-216 deterministic architecture model.
// The model intentionally separates record identity from URL-scope identity.

function normalizeJournalUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    url.hash = '';
    return url.toString();
  } catch (_) {
    return '';
  }
}

function effectiveJournalUrlIdentity(entry) {
  const persisted = normalizeJournalUrl(entry?.urlKey || '');
  const derived = normalizeJournalUrl(entry?.url || '');
  if (persisted && derived && persisted !== derived) {
    return { state: 'mismatch', key: '', persisted, derived };
  }
  const key = persisted || derived;
  return key
    ? { state: persisted ? 'persisted' : 'derived', key, persisted, derived }
    : { state: 'unavailable', key: '', persisted, derived };
}

function currentUngroupedCurrentUrl(entries, wanted) {
  const key = normalizeJournalUrl(wanted);
  return entries.filter((entry) => (entry.urlKey || normalizeJournalUrl(entry.url || '')) === key);
}

function currentPersistedIndexMembership(entries, wanted) {
  const key = normalizeJournalUrl(wanted);
  return entries.filter((entry) => entry.urlKey === key);
}

function targetMembership(entries, wanted) {
  const key = normalizeJournalUrl(wanted);
  return entries.filter((entry) => {
    const identity = effectiveJournalUrlIdentity(entry);
    return identity.state !== 'mismatch' && identity.key === key;
  });
}

function currentDeleteOneAndStats(entries, stats, id) {
  const index = entries.findIndex((entry) => entry.id === id);
  if (index < 0) return { entries, stats };
  const [entry] = entries.splice(index, 1);
  // Mirrors the current root defect: stats repair authority is conditional on
  // the persisted urlKey, so a legacy row with only url is deleted without
  // repairing the corresponding derived URL statistic.
  if (entry.urlKey) {
    stats[entry.urlKey] = Math.max(0, Number(stats[entry.urlKey] || 0) - 1);
  }
  return { entries, stats };
}

function targetDeleteOneAndStats(entries, stats, id) {
  const index = entries.findIndex((entry) => entry.id === id);
  if (index < 0) return { entries, stats };
  const identity = effectiveJournalUrlIdentity(entries[index]);
  if (identity.state === 'mismatch') {
    return { entries, stats, blocked: true, reason: 'url-identity-mismatch' };
  }
  const [entry] = entries.splice(index, 1);
  if (identity.key) {
    stats[identity.key] = Math.max(0, Number(stats[identity.key] || 0) - 1);
  }
  return { entries, stats, deleted: entry.id };
}

function currentPerUrlRebuild(entries, wanted) {
  return currentPersistedIndexMembership(entries, wanted).length;
}

function currentFullRebuild(entries, wanted) {
  const key = normalizeJournalUrl(wanted);
  return entries.filter((entry) => (entry.urlKey || normalizeJournalUrl(entry.url || '')) === key).length;
}

function targetRebuild(entries, wanted) {
  return targetMembership(entries, wanted).length;
}

function clearByTargetIdentity(entries, wanted) {
  const key = normalizeJournalUrl(wanted);
  const kept = [];
  const removed = [];
  const mismatches = [];
  for (const entry of entries) {
    const identity = effectiveJournalUrlIdentity(entry);
    if (identity.state === 'mismatch') {
      kept.push(entry);
      mismatches.push(entry.id);
    } else if (identity.key === key) {
      removed.push(entry.id);
    } else {
      kept.push(entry);
    }
  }
  return { kept, removed, mismatches };
}

function siteKey(raw) {
  const key = normalizeJournalUrl(raw);
  if (!key) return '';
  const url = new URL(key);
  return `${url.protocol}//${url.host}`;
}

const U = 'https://Example.COM:443/path?a=1#frag';
const K = normalizeJournalUrl(U);
const modern = { id: 'modern', url: U, urlKey: K };
const legacy = { id: 'legacy', url: U, urlKey: '' };
const other = { id: 'other', url: 'https://example.com/other', urlKey: normalizeJournalUrl('https://example.com/other') };

// 1. Normalization strips fragment and canonicalizes host/default port.
assert.equal(K, 'https://example.com/path?a=1');

// 2. Query string remains part of exact URL identity.
assert.notEqual(normalizeJournalUrl('https://example.com/path?a=1'), normalizeJournalUrl('https://example.com/path?a=2'));

// 3. Modern row uses the same effective identity as its persisted key.
assert.deepEqual(effectiveJournalUrlIdentity(modern), {
  state: 'persisted', key: K, persisted: K, derived: K
});

// 4. Legacy row derives the exact same key from raw url.
assert.equal(effectiveJournalUrlIdentity(legacy).state, 'derived');
assert.equal(effectiveJournalUrlIdentity(legacy).key, K);

// 5. Current ungrouped view can see both modern and legacy rows.
assert.deepEqual(currentUngroupedCurrentUrl([modern, legacy, other], U).map((x) => x.id), ['modern', 'legacy']);

// 6. Current persisted-key group/list/index path loses the legacy row.
assert.deepEqual(currentPersistedIndexMembership([modern, legacy, other], U).map((x) => x.id), ['modern']);

// 7. Target identity makes view/group/template membership converge.
assert.deepEqual(targetMembership([modern, legacy, other], U).map((x) => x.id), ['modern', 'legacy']);

// 8. Current URL-clear semantics can leave a visible legacy ghost.
{
  const remaining = [modern, legacy, other].filter((entry) => !currentPersistedIndexMembership([entry], U).length);
  assert.deepEqual(remaining.map((x) => x.id), ['legacy', 'other']);
  assert.deepEqual(currentUngroupedCurrentUrl(remaining, U).map((x) => x.id), ['legacy']);
}

// 9. Target clear removes modern and legacy members of one exact URL domain.
{
  const cleared = clearByTargetIdentity([modern, legacy, other], U);
  assert.deepEqual(cleared.removed, ['modern', 'legacy']);
  assert.deepEqual(cleared.kept.map((x) => x.id), ['other']);
}

// 10. Current single-entry delete can leave stale stats for a legacy row.
{
  const entries = [{ ...legacy }];
  const stats = { [K]: 1 };
  currentDeleteOneAndStats(entries, stats, 'legacy');
  assert.equal(entries.length, 0);
  assert.equal(stats[K], 1);
}

// 11. Target single-entry delete repairs the derived URL stats domain.
{
  const entries = [{ ...legacy }];
  const stats = { [K]: 1 };
  const result = targetDeleteOneAndStats(entries, stats, 'legacy');
  assert.equal(result.deleted, 'legacy');
  assert.equal(stats[K], 0);
}

// 12. Current per-URL rebuild and full rebuild disagree for legacy rows.
assert.equal(currentPerUrlRebuild([modern, legacy], U), 1);
assert.equal(currentFullRebuild([modern, legacy], U), 2);

// 13. Target rebuild agrees with target membership.
assert.equal(targetRebuild([modern, legacy], U), 2);

// 14. Malformed URL has no exact URL-scope identity and cannot be guessed from hostname.
{
  const malformed = { id: 'bad', url: 'not a url', urlKey: '', hostname: 'example.com' };
  assert.equal(effectiveJournalUrlIdentity(malformed).state, 'unavailable');
  assert.equal(effectiveJournalUrlIdentity(malformed).key, '');
}

// 15. Persisted-vs-derived mismatch is explicit and fail-closed.
{
  const mismatch = {
    id: 'mismatch',
    url: 'https://example.com/a',
    urlKey: normalizeJournalUrl('https://example.com/b')
  };
  const identity = effectiveJournalUrlIdentity(mismatch);
  assert.equal(identity.state, 'mismatch');
  assert.equal(targetMembership([mismatch], 'https://example.com/a').length, 0);
  assert.equal(targetMembership([mismatch], 'https://example.com/b').length, 0);
  const result = targetDeleteOneAndStats([mismatch], {}, 'mismatch');
  assert.equal(result.blocked, true);
}

// 16. A legacy imported row and a migrated/backfilled row preserve the same identity.
{
  const importedLegacy = { id: 'x', url: U, urlKey: '' };
  const before = effectiveJournalUrlIdentity(importedLegacy).key;
  const migrated = { ...importedLegacy, urlKey: before };
  const after = effectiveJournalUrlIdentity(migrated).key;
  assert.equal(before, after);
}

// 17. Site identity is broader than exact URL identity and remains separately derived.
assert.equal(siteKey(U), 'https://example.com');
assert.equal(siteKey('https://example.com/another?q=2'), 'https://example.com');
assert.notEqual(normalizeJournalUrl(U), normalizeJournalUrl('https://example.com/another?q=2'));

// 18. Record identity is not collapsed merely because URL identity matches.
{
  const a = { id: 'a', url: U, urlKey: '' };
  const b = { id: 'b', url: U, urlKey: K };
  const members = targetMembership([a, b], U);
  assert.equal(members.length, 2);
  assert.notEqual(members[0].id, members[1].id);
}

// 19. Fragment variants are one exact persisted Journal URL domain under current normalizer.
{
  const a = { id: 'a', url: 'https://example.com/path#one', urlKey: '' };
  const b = { id: 'b', url: 'https://example.com/path#two', urlKey: '' };
  assert.equal(effectiveJournalUrlIdentity(a).key, effectiveJournalUrlIdentity(b).key);
}

// 20. A safe index migration is semantic-preserving: persisted key becomes an optimization,
//     never a second source of URL identity.
{
  const rows = [legacy, other].map((entry) => ({ ...entry }));
  const before = rows.map((entry) => effectiveJournalUrlIdentity(entry).key);
  for (const row of rows) {
    const identity = effectiveJournalUrlIdentity(row);
    if (identity.state === 'derived') row.urlKey = identity.key;
  }
  const after = rows.map((entry) => effectiveJournalUrlIdentity(entry).key);
  assert.deepEqual(after, before);
}

// 21. Identity convergence does not itself claim P0-050 generation-safe stats publication.
//     The identity helper only answers membership; publication ordering remains separate.
{
  const identity = effectiveJournalUrlIdentity(legacy);
  assert.equal(identity.key, K);
  const publicationGeneration = undefined;
  assert.equal(publicationGeneration, undefined);
}

// 22. Empty exact-url filter cannot accidentally become a global scope.
assert.equal(targetMembership([modern, legacy, other], '').length, 0);

console.log('P1-216 journal URL identity model: PASS');
