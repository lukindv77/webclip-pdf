'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const filterSource = fs.readFileSync(path.join(root, 'journal-text-filter.js'), 'utf8');
const journalSource = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');
const registry = fs.readFileSync(path.join(root, 'project_docs', 'RESEARCH_REGISTRY.md'), 'utf8');
const evidence = fs.readFileSync(path.join(root, 'project_docs', 'RESEARCH_P1_211_COMMENT_TOMBSTONE_LIFECYCLE_REFINEMENT_2026-09-11_EVIDENCE.md'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

const failures = [];
let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// Source/baseline binding.
check(
  registry.includes('| P1-211 | ACTIVE | Deleted comment tombstones need one lifecycle across retention/search/export/import and portable capacity debt; deleted payload cannot consume active capacity forever. |'),
  'P1-211 Registry owner/status drifted'
);
check(evidence.includes('main = e030df2f70334f7889f360a86de44be55c988719'), 'evidence baseline drifted');
check(evidence.includes('6d61ac81befdbf2804ae9dbec425aa08d1194eb1'), 'service-worker blob provenance missing');
check(evidence.includes('EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION'), 'release fence missing');
check(manifest.version === '0.9.8', 'manifest version changed during research tranche');
check(/function normalizeJournalComments\(entry = \{\}\)/.test(worker), 'normalizeJournalComments positive control missing');
check(/deletedAt:\s*Math\.max\(0, Number\(item\.deletedAt \|\| 0\)\)/.test(worker), 'deletedAt normalization positive control missing');
check(/comments\.length\s*>=\s*MAX_IMPORTED_COMMENTS_PER_ENTRY/.test(worker), 'raw comment-count admission gap no longer visible');
check(/assertJournalCommentBudget\(\[\.\.\.comments, \{ text \}\]\)/.test(worker), 'aggregate comment budget positive control missing');
check(/for \(const item of comments\) \{\s*if \(contains\(item\?\.text/.test(filterSource), 'ordinary search raw comment-body loop changed');
check(/journal-comment-deleted-text/.test(journalSource) && /text\.textContent = comment\.text/.test(journalSource), 'deleted-body UI redisclosure positive control changed');

// Historical source was revalidated, not imported as production source.
check(evidence.includes('No historical branch is imported wholesale.'), 'historical provenance boundary missing');
check(evidence.includes('P1-202') && evidence.includes('P0-076') && evidence.includes('P0-077'), 'owner composition missing');
check(evidence.includes('P1-207') && evidence.includes('P1-215'), 'backup/import composition missing');

const ACTIVE_COUNT_MAX = 3;
const ACTIVE_TEXT_MAX = 12;
const HISTORY_FULL_COUNT_MAX = 2;
const HISTORY_TEXT_MAX = 10;
const STRUCTURAL_TOMBSTONE_MAX = 4;

function activeComment(id, text, generation = 1) {
  return { id, generation, state: 'ACTIVE', text, deletedAt: 0 };
}

function deletedFull(id, text, generation = 1, deletedAt = 1) {
  return { id, generation, state: 'DELETED_FULL', text, deletedAt };
}

function deletedMinimal(id, generation = 1, deletedAt = 1) {
  return { id, generation, state: 'DELETED_MINIMAL', deletedAt };
}

function isActive(comment) {
  return comment?.state === 'ACTIVE';
}

function isDeleted(comment) {
  return comment?.state === 'DELETED_FULL' || comment?.state === 'DELETED_MINIMAL';
}

function activeProjection(comments) {
  return comments.filter(isActive);
}

function historyProjection(comments) {
  return comments.filter(isDeleted);
}

function activeUsage(comments) {
  const active = activeProjection(comments);
  return {
    count: active.length,
    textChars: active.reduce((sum, item) => sum + String(item.text || '').length, 0)
  };
}

function historyUsage(comments) {
  const history = historyProjection(comments);
  const full = history.filter((item) => item.state === 'DELETED_FULL');
  return {
    structuralCount: history.length,
    fullCount: full.length,
    textChars: full.reduce((sum, item) => sum + String(item.text || '').length, 0)
  };
}

function canAddActive(comments, text) {
  const usage = activeUsage(comments);
  return usage.count + 1 <= ACTIVE_COUNT_MAX && usage.textChars + String(text || '').length <= ACTIVE_TEXT_MAX;
}

function currentUnsafeCanAdd(comments, text) {
  const rawCount = comments.length;
  const rawChars = comments.reduce((sum, item) => sum + String(item.text || '').length, 0);
  return rawCount + 1 <= ACTIVE_COUNT_MAX && rawChars + String(text || '').length <= ACTIVE_TEXT_MAX;
}

function compactFullHistory(comments) {
  const next = clone(comments);
  const full = next
    .filter((item) => item.state === 'DELETED_FULL')
    .sort((a, b) => Number(a.deletedAt || 0) - Number(b.deletedAt || 0) || String(a.id).localeCompare(String(b.id)));

  let usage = historyUsage(next);
  for (const item of full) {
    if (usage.fullCount <= HISTORY_FULL_COUNT_MAX && usage.textChars <= HISTORY_TEXT_MAX) break;
    const index = next.findIndex((candidate) => candidate.id === item.id && candidate.generation === item.generation);
    if (index < 0) continue;
    next[index] = deletedMinimal(item.id, item.generation, item.deletedAt);
    usage = historyUsage(next);
  }
  return next;
}

function boundedStructuralHistory(comments) {
  const next = clone(comments);
  const deleted = next
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => isDeleted(item))
    .sort((a, b) => Number(a.item.deletedAt || 0) - Number(b.item.deletedAt || 0) || String(a.item.id).localeCompare(String(b.item.id)));
  const excess = Math.max(0, deleted.length - STRUCTURAL_TOMBSTONE_MAX);
  const remove = new Set(deleted.slice(0, excess).map(({ index }) => index));
  return next.filter((_, index) => !remove.has(index));
}

function deleteUnderPolicy(comment, policy, deletedAt) {
  assert.equal(comment.state, 'ACTIVE');
  if (policy === 'privacy-delete') return deletedMinimal(comment.id, comment.generation, deletedAt);
  if (policy === 'retained-history') return deletedFull(comment.id, comment.text, comment.generation, deletedAt);
  throw new Error('unknown policy');
}

function ordinarySearch(comments, needle) {
  const n = String(needle).toLowerCase();
  return activeProjection(comments).some((item) => String(item.text || '').toLowerCase().includes(n));
}

function historySearch(comments, needle, policy) {
  if (policy !== 'retained-history') return false;
  const n = String(needle).toLowerCase();
  return comments.some((item) => item.state === 'DELETED_FULL' && String(item.text || '').toLowerCase().includes(n));
}

function portableProject(comments, policy) {
  return comments.map((item) => {
    if (item.state === 'ACTIVE') return { id: item.id, generation: item.generation, state: 'ACTIVE', text: item.text, deletedAt: 0 };
    if (item.state === 'DELETED_MINIMAL') return { id: item.id, generation: item.generation, state: 'DELETED_MINIMAL', deletedAt: item.deletedAt };
    if (item.state === 'DELETED_FULL' && policy === 'retained-history') {
      return { id: item.id, generation: item.generation, state: 'DELETED_FULL', text: item.text, deletedAt: item.deletedAt };
    }
    return { id: item.id, generation: item.generation, state: 'DELETED_MINIMAL', deletedAt: item.deletedAt };
  });
}

function importPortable(rows) {
  return rows.map((item) => {
    if (item.state === 'ACTIVE') {
      assert(String(item.text || '').trim());
      return activeComment(item.id, item.text, item.generation);
    }
    if (item.state === 'DELETED_FULL') return deletedFull(item.id, String(item.text || ''), item.generation, item.deletedAt);
    if (item.state === 'DELETED_MINIMAL') return deletedMinimal(item.id, item.generation, item.deletedAt);
    throw new Error('bad lifecycle state');
  });
}

function compactExactGeneration(comments, receipt) {
  const next = clone(comments);
  const index = next.findIndex((item) => item.id === receipt.id);
  if (index < 0) return { applied: false, comments: next };
  const current = next[index];
  if (current.generation !== receipt.generation || current.state !== 'DELETED_FULL') {
    return { applied: false, comments: next };
  }
  next[index] = deletedMinimal(current.id, current.generation, current.deletedAt);
  return { applied: true, comments: next };
}

// 1. Current failure witness: zero live comments can exhaust raw count.
{
  const rows = [
    deletedFull('a', 'x', 1, 1),
    deletedFull('b', 'x', 1, 2),
    deletedFull('c', 'x', 1, 3)
  ];
  check(activeUsage(rows).count === 0, 'witness must have zero live comments');
  check(currentUnsafeCanAdd(rows, 'n') === false, 'current raw count should block Add');
  check(canAddActive(rows, 'n') === true, 'target active projection should admit Add');
}

// 2. Deleted text can consume raw text budget while active projection stays empty.
{
  const rows = [deletedFull('a', '123456', 1, 1), deletedFull('b', '123456', 1, 2)];
  check(activeUsage(rows).textChars === 0, 'deleted text leaked into active usage');
  check(currentUnsafeCanAdd(rows, 'z') === false, 'raw text witness should block current Add');
  check(canAddActive(rows, 'z') === true, 'target active text budget should ignore deleted history');
}

// 3. Privacy delete produces a body-free first-class tombstone.
{
  const deleted = deleteUnderPolicy(activeComment('x', 'SECRET', 7), 'privacy-delete', 10);
  check(deleted.state === 'DELETED_MINIMAL', 'privacy delete did not create minimal tombstone');
  check(!Object.prototype.hasOwnProperty.call(deleted, 'text'), 'privacy tombstone retained body');
  check(deleted.id === 'x' && deleted.generation === 7, 'privacy tombstone lost identity');
}

// 4. Retained-history delete preserves body but moves it out of active capacity.
{
  const deleted = deleteUnderPolicy(activeComment('x', 'history', 2), 'retained-history', 10);
  check(deleted.state === 'DELETED_FULL' && deleted.text === 'history', 'retained-history delete lost body');
  check(activeUsage([deleted]).count === 0 && activeUsage([deleted]).textChars === 0, 'retained history consumed active capacity');
}

// 5. Ordinary search is active-only; explicit history search is policy-gated.
{
  const rows = [activeComment('a', 'live text'), deletedFull('b', 'secret marker', 1, 2)];
  check(ordinarySearch(rows, 'secret') === false, 'ordinary search redisclosed deleted history');
  check(historySearch(rows, 'secret', 'retained-history') === true, 'explicit retained-history search missed body');
  check(historySearch(rows, 'secret', 'privacy-delete') === false, 'privacy mode exposed deleted history');
}

// 6. Full history compacts independently of active comments.
{
  const rows = [
    activeComment('live', 'ok'),
    deletedFull('a', '12345', 1, 1),
    deletedFull('b', '12345', 1, 2),
    deletedFull('c', '12345', 1, 3)
  ];
  const compacted = compactFullHistory(rows);
  const usage = historyUsage(compacted);
  check(usage.fullCount <= HISTORY_FULL_COUNT_MAX, 'full-history count remained above bound');
  check(usage.textChars <= HISTORY_TEXT_MAX, 'full-history text remained above bound');
  check(activeProjection(compacted).length === 1 && activeProjection(compacted)[0].text === 'ok', 'history compaction changed live comment');
}

// 7. Minimal structural tombstones have their own independent hard bound.
{
  const rows = [1, 2, 3, 4, 5, 6].map((n) => deletedMinimal(`d${n}`, 1, n));
  const bounded = boundedStructuralHistory(rows);
  check(historyUsage(bounded).structuralCount === STRUCTURAL_TOMBSTONE_MAX, 'structural tombstone bound not enforced');
  check(bounded.every((item) => item.state === 'DELETED_MINIMAL'), 'structural bound changed lifecycle class unexpectedly');
}

// 8. Body compaction and final structural expiry are distinct transitions.
{
  const full = [deletedFull('x', 'body', 1, 1)];
  const bodyCompacted = compactFullHistory([...full, deletedFull('y', '12345678901', 1, 2)]);
  check(bodyCompacted.some((item) => item.id === 'x' || item.id === 'y'), 'body compaction erased all deletion identity');
  const many = [1, 2, 3, 4, 5].map((n) => deletedMinimal(`m${n}`, 1, n));
  const expired = boundedStructuralHistory(many);
  check(expired.length === STRUCTURAL_TOMBSTONE_MAX, 'final structural expiry witness failed');
}

// 9. Stale generation compaction cannot retarget a same-id replacement.
{
  const current = [deletedFull('x', 'newer', 2, 20)];
  const stale = compactExactGeneration(current, { id: 'x', generation: 1 });
  check(stale.applied === false, 'stale generation compaction applied');
  check(stale.comments[0].text === 'newer', 'stale compaction modified newer row');
  const exact = compactExactGeneration(current, { id: 'x', generation: 2 });
  check(exact.applied === true && exact.comments[0].state === 'DELETED_MINIMAL', 'exact generation compaction failed');
}

// 10. Privacy portable projection cannot re-export deleted body.
{
  const rows = [deletedFull('x', 'secret', 1, 4)];
  const portable = portableProject(rows, 'privacy-delete');
  check(portable[0].state === 'DELETED_MINIMAL', 'privacy portable projection kept full tombstone');
  check(!Object.prototype.hasOwnProperty.call(portable[0], 'text'), 'privacy portable projection leaked text');
}

// 11. Retained-history portable projection is round-trippable without active debt.
{
  const rows = [deletedFull('x', 'history', 1, 4), activeComment('a', 'live')];
  const imported = importPortable(portableProject(rows, 'retained-history'));
  check(imported.find((item) => item.id === 'x').text === 'history', 'retained-history round-trip lost body');
  check(activeUsage(imported).count === 1 && activeUsage(imported).textChars === 4, 'portable round-trip recreated active debt');
}

// 12. Minimal tombstone is valid without fake non-empty body.
{
  const imported = importPortable([{ id: 'x', generation: 1, state: 'DELETED_MINIMAL', deletedAt: 10 }]);
  check(imported.length === 1 && imported[0].state === 'DELETED_MINIMAL', 'minimal tombstone import failed');
  check(!Object.prototype.hasOwnProperty.call(imported[0], 'text'), 'minimal tombstone import invented body');
}

// 13. Active limits remain effective for genuinely active state.
{
  const rows = [activeComment('a', '1234'), activeComment('b', '1234'), activeComment('c', '1234')];
  check(canAddActive(rows, 'x') === false, 'active count bound was weakened');
  const two = rows.slice(0, 2);
  check(canAddActive(two, '12345') === false, 'active text bound was weakened');
}

// 14. External comparisons and boundaries are explicitly evidence-only.
check(evidence.includes('Apache Cassandra') && evidence.includes('CouchDB') && evidence.includes('PostgreSQL'), 'fresh external comparison coverage missing');
check(evidence.includes('comparison points, not imported WebClip requirements'), 'external-source applicability boundary missing');
check(evidence.includes('P1-211 remains **ACTIVE**'), 'owner status conclusion missing');
check(evidence.includes('Production/runtime modification: **NONE**'), 'research-only boundary missing');

if (failures.length) {
  console.error(`P1-211 comment tombstone lifecycle refinement model: FAIL (${failures.length}/${checks})`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(`P1-211 comment tombstone lifecycle refinement model: PASS (${checks}/${checks})`);
