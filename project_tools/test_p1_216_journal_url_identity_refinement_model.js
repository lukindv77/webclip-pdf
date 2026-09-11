'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const registry = fs.readFileSync(path.join(root, 'project_docs', 'RESEARCH_REGISTRY.md'), 'utf8');
const evidence = fs.readFileSync(path.join(root, 'project_docs', 'RESEARCH_P1_216_JOURNAL_URL_IDENTITY_REFINEMENT_2026-09-11_EVIDENCE.md'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

const failures = [];
let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

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
  if (!key) return { state: 'unavailable', key: '', persisted, derived };
  return {
    state: persisted ? 'persisted' : 'derived',
    key,
    persisted,
    derived
  };
}

function currentDerivedView(entries, wanted) {
  const key = normalizeJournalUrl(wanted);
  if (!key) return [];
  return entries.filter((entry) => (entry.urlKey || normalizeJournalUrl(entry.url || '')) === key);
}

function currentPersistedIndexView(entries, wanted) {
  const key = normalizeJournalUrl(wanted);
  if (!key) return [];
  return entries.filter((entry) => entry.urlKey === key);
}

function targetMembership(entries, wanted) {
  const key = normalizeJournalUrl(wanted);
  if (!key) return [];
  return entries.filter((entry) => {
    const identity = effectiveJournalUrlIdentity(entry);
    return identity.state !== 'mismatch' && identity.state !== 'unavailable' && identity.key === key;
  });
}

function targetClear(entries, wanted) {
  const key = normalizeJournalUrl(wanted);
  const removed = [];
  const kept = [];
  const blocked = [];
  for (const entry of entries) {
    const identity = effectiveJournalUrlIdentity(entry);
    if (identity.state === 'mismatch') {
      kept.push(entry);
      blocked.push({ id: entry.id, reason: 'url-identity-mismatch' });
    } else if (identity.key && identity.key === key) {
      removed.push(entry);
    } else {
      kept.push(entry);
    }
  }
  return { removed, kept, blocked };
}

function currentDeleteOneAndStats(entries, stats, id) {
  const index = entries.findIndex((entry) => entry.id === id);
  if (index < 0) return { deleted: false };
  const [entry] = entries.splice(index, 1);
  if (entry.urlKey) stats[entry.urlKey] = Math.max(0, Number(stats[entry.urlKey] || 0) - 1);
  return { deleted: true };
}

function targetDeleteOneAndStats(entries, stats, id) {
  const index = entries.findIndex((entry) => entry.id === id);
  if (index < 0) return { deleted: false };
  const identity = effectiveJournalUrlIdentity(entries[index]);
  if (identity.state === 'mismatch') return { deleted: false, blocked: true };
  const [entry] = entries.splice(index, 1);
  if (identity.key) stats[identity.key] = Math.max(0, Number(stats[identity.key] || 0) - 1);
  return { deleted: true, id: entry.id, urlKey: identity.key };
}

function siteIdentity(raw) {
  const key = normalizeJournalUrl(raw);
  if (!key) return '';
  const url = new URL(key);
  return `${url.protocol}//${url.host}`;
}

function backfillBatch(rows, { generation, currentGeneration, maxRows }) {
  const next = rows.map((row) => ({ ...row }));
  if (generation !== currentGeneration) return { rows: next, stale: true, changed: 0, done: false };
  let changed = 0;
  let scanned = 0;
  for (const row of next) {
    if (scanned >= maxRows) break;
    scanned += 1;
    const identity = effectiveJournalUrlIdentity(row);
    if (identity.state === 'derived') {
      row.urlKey = identity.key;
      changed += 1;
    }
  }
  return { rows: next, stale: false, changed, done: scanned >= next.length };
}

function indexedFastPathAllowed(readiness) {
  return Boolean(readiness && readiness.complete === true && readiness.generation === readiness.currentGeneration);
}

// Exact canonical binding and release fence.
check(
  registry.includes('| P1-216 | ACTIVE | Legacy and modern Journal rows share one derived URL identity domain for view/clear/delete/stats/templates; missing persisted urlKey cannot create ghost scope. |'),
  'P1-216 Registry owner/status drifted'
);
check(evidence.includes('main = 57b605101a9afbba91cde86405e517b3214396ac'), 'evidence baseline drifted');
check(evidence.includes('service-worker.js = 6d61ac81befdbf2804ae9dbec425aa08d1194eb1'), 'current worker blob provenance missing');
check(evidence.includes('No historical branch is imported wholesale.'), 'historical provenance boundary missing');
check(evidence.includes('EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION'), 'release fence missing');
check(manifest.version === '0.9.8', 'manifest changed in research-only tranche');

// Current-source positive controls/root gap remains visible.
check(worker.includes('function normalizeJournalUrl'), 'current Journal URL normalizer missing');
check(worker.includes("urlKey: normalizeJournalUrl("), 'modern/import canonical urlKey materialization positive control missing');
check(worker.includes('entry.urlKey || normalizeJournalUrl(entry.url || \'\')'), 'derived legacy fallback positive control missing');
check(worker.includes("index('urlKey')") || worker.includes('index("urlKey")'), 'persisted urlKey index path missing');
check(worker.includes('urlKeyCreatedAt'), 'compound persisted URL index path missing');
check(worker.includes('getJournalSiteKey'), 'separate site identity primitive missing');
check(worker.includes('rebuildUrlStatsForUrl'), 'targeted URL stats rebuild surface missing');
check(worker.includes('rebuildAllUrlStats'), 'full URL stats rebuild surface missing');

// Deterministic semantic model.
const U = 'https://Example.COM:443/path?a=1#frag';
const K = normalizeJournalUrl(U);
const modern = { id: 'modern', url: U, urlKey: K };
const legacy = { id: 'legacy', url: U, urlKey: '' };
const other = { id: 'other', url: 'https://example.com/other', urlKey: normalizeJournalUrl('https://example.com/other') };

check(K === 'https://example.com/path?a=1', 'normalizer model changed host/default-port/fragment semantics');
check(normalizeJournalUrl('https://example.com/path?a=1') !== normalizeJournalUrl('https://example.com/path?a=2'), 'query string ceased to participate in exact URL identity');
check(normalizeJournalUrl('https://example.com/path#one') === normalizeJournalUrl('https://example.com/path#two'), 'fragment variants no longer converge');
check(normalizeJournalUrl('not a url') === '', 'malformed URL unexpectedly gained identity');
check(normalizeJournalUrl('file:///tmp/a') === '', 'unsupported scheme unexpectedly gained exact URL identity');

check(effectiveJournalUrlIdentity(modern).state === 'persisted', 'modern row should have persisted identity');
check(effectiveJournalUrlIdentity(modern).key === K, 'modern key drifted');
check(effectiveJournalUrlIdentity(legacy).state === 'derived', 'legacy row should derive identity');
check(effectiveJournalUrlIdentity(legacy).key === K, 'legacy derived key differs from modern key');

check(
  JSON.stringify(currentDerivedView([modern, legacy, other], U).map((x) => x.id)) === JSON.stringify(['modern', 'legacy']),
  'current derived view witness changed'
);
check(
  JSON.stringify(currentPersistedIndexView([modern, legacy, other], U).map((x) => x.id)) === JSON.stringify(['modern']),
  'current persisted-index split witness changed'
);
check(
  JSON.stringify(targetMembership([modern, legacy, other], U).map((x) => x.id)) === JSON.stringify(['modern', 'legacy']),
  'target membership failed to converge modern+legacy'
);

// Clear ghost witness.
{
  const remaining = [modern, legacy, other].filter((entry) => !currentPersistedIndexView([entry], U).length);
  check(remaining.some((entry) => entry.id === 'legacy'), 'legacy clear ghost witness disappeared');
  check(currentDerivedView(remaining, U).some((entry) => entry.id === 'legacy'), 'legacy row no longer reappears in derived view witness');
}

// Target exact clear matches visible canonical membership.
{
  const result = targetClear([modern, legacy, other], U);
  check(JSON.stringify(result.removed.map((x) => x.id)) === JSON.stringify(['modern', 'legacy']), 'target clear did not remove canonical exact-URL membership');
  check(JSON.stringify(result.kept.map((x) => x.id)) === JSON.stringify(['other']), 'target clear removed wrong URL domain');
}

// Delete/stats ghost and target repair domain.
{
  const entries = [{ ...legacy }];
  const stats = { [K]: 1 };
  currentDeleteOneAndStats(entries, stats, 'legacy');
  check(entries.length === 0 && stats[K] === 1, 'current legacy delete/stats ghost witness changed');
}
{
  const entries = [{ ...legacy }];
  const stats = { [K]: 1 };
  const result = targetDeleteOneAndStats(entries, stats, 'legacy');
  check(result.deleted === true && result.urlKey === K, 'target delete did not derive affected URL domain');
  check(stats[K] === 0, 'target delete did not repair modeled stats domain');
}

// Mismatch is explicit and destructive scope fails closed.
{
  const mismatch = {
    id: 'mismatch',
    url: 'https://example.com/a',
    urlKey: normalizeJournalUrl('https://example.com/b')
  };
  const identity = effectiveJournalUrlIdentity(mismatch);
  check(identity.state === 'mismatch' && identity.key === '', 'mismatch did not fail closed');
  check(targetMembership([mismatch], 'https://example.com/a').length === 0, 'mismatch joined derived destructive scope');
  check(targetMembership([mismatch], 'https://example.com/b').length === 0, 'mismatch joined persisted destructive scope');
  const cleared = targetClear([mismatch], 'https://example.com/a');
  check(cleared.removed.length === 0 && cleared.blocked.length === 1, 'mismatch clear did not block');
  const deleted = targetDeleteOneAndStats([mismatch], {}, 'mismatch');
  check(deleted.blocked === true, 'mismatch single-delete stats authority did not block');
}

// Unavailable rows cannot be guessed from hostname/current context.
{
  const bad = { id: 'bad', url: 'bad value', urlKey: '', hostname: 'example.com' };
  const identity = effectiveJournalUrlIdentity(bad);
  check(identity.state === 'unavailable' && identity.key === '', 'unavailable row gained exact URL identity');
  check(targetMembership([bad], 'https://example.com/').length === 0, 'hostname guessed exact URL identity');
}

// Site scope remains broader and separate.
check(siteIdentity('https://example.com/a?q=1') === siteIdentity('https://example.com/b?q=2'), 'site identity should be shared');
check(normalizeJournalUrl('https://example.com/a?q=1') !== normalizeJournalUrl('https://example.com/b?q=2'), 'exact URL identity collapsed to site identity');

// Record identity remains separate from URL identity.
{
  const a = { id: 'a', url: U, urlKey: '' };
  const b = { id: 'b', url: U, urlKey: K };
  const members = targetMembership([a, b], U);
  check(members.length === 2 && members[0].id !== members[1].id, 'URL identity incorrectly deduplicated record identity');
}

// Backfill preserves semantics and is bounded/generation-fenced.
{
  const rows = [{ ...legacy }, { ...other }];
  const before = rows.map((row) => effectiveJournalUrlIdentity(row).key);
  const first = backfillBatch(rows, { generation: 7, currentGeneration: 7, maxRows: 1 });
  check(first.changed === 1 && first.done === false, 'bounded backfill did not stop at batch limit');
  check(first.rows[0].urlKey === K, 'bounded backfill did not materialize derived key');
  check(effectiveJournalUrlIdentity(first.rows[0]).key === before[0], 'backfill changed canonical semantic identity');

  const stale = backfillBatch(rows, { generation: 6, currentGeneration: 7, maxRows: 10 });
  check(stale.stale === true && stale.changed === 0, 'stale migration generation mutated rows');
}

// Readiness controls indexed-only optimization.
check(indexedFastPathAllowed({ complete: false, generation: 3, currentGeneration: 3 }) === false, 'incomplete migration enabled indexed-only path');
check(indexedFastPathAllowed({ complete: true, generation: 2, currentGeneration: 3 }) === false, 'stale readiness generation enabled indexed-only path');
check(indexedFastPathAllowed({ complete: true, generation: 3, currentGeneration: 3 }) === true, 'exact readiness receipt did not enable indexed-only path');

// Owner boundaries recorded in evidence.
for (const owner of ['P0-050', 'P0-076', 'P0-077', 'P1-206', 'P1-207', 'P1-211', 'P1-215', 'P1-231']) {
  check(evidence.includes(`**${owner}**`) || evidence.includes(owner), `owner composition missing ${owner}`);
}
check(evidence.includes('No new P-code is allocated.'), 'research allocated or failed to disclaim new P-code');
check(evidence.includes('P1-216 remains **ACTIVE**'), 'research incorrectly closed P1-216');

if (failures.length) {
  console.error(`P1-216 refinement model: ${failures.length}/${checks} checks failed`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`P1-216 Journal URL identity refinement model: PASS (${checks} checks)`);
