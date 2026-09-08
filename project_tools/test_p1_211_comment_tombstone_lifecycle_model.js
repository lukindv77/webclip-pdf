'use strict';

const assert = require('assert');

// P1-211 deterministic architecture model.
// Small limits are intentionally illustrative so schedules remain compact.
// Product constants are a separate implementation decision.

const POLICY_VERSION = 1;
const ACTIVE_COUNT_LIMIT = 4;
const ACTIVE_TEXT_LIMIT = 64;
const FULL_HISTORY_COUNT_LIMIT = 2;
const FULL_HISTORY_TEXT_LIMIT = 32;
const TOTAL_TOMBSTONE_LIMIT = 5;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function currentNormalize(comments) {
  return (Array.isArray(comments) ? comments : [])
    .filter((item) => item && typeof item === 'object' && String(item.text || '').trim())
    .map((item) => ({
      id: String(item.id || ''),
      generation: Number(item.generation || 1),
      text: String(item.text || ''),
      createdAt: Number(item.createdAt || 0),
      updatedAt: Number(item.updatedAt || 0),
      deletedAt: Math.max(0, Number(item.deletedAt || 0))
    }));
}

function currentBudget(comments) {
  const list = currentNormalize(comments);
  const chars = list.reduce((sum, item) => sum + item.text.length, 0);
  return { count: list.length, chars };
}

function currentCanAdd(comments, text) {
  const next = currentNormalize(comments);
  if (next.length >= ACTIVE_COUNT_LIMIT) return false;
  return next.reduce((sum, item) => sum + item.text.length, 0) + String(text).length <= ACTIVE_TEXT_LIMIT;
}

function currentDelete(comments, id, now) {
  const next = currentNormalize(comments);
  const index = next.findIndex((item) => item.id === id);
  if (index < 0) throw new Error('comment not found');
  next[index] = { ...next[index], deletedAt: now };
  return next;
}

function currentSearch(comments, needle) {
  const normalized = String(needle || '').toLowerCase();
  return currentNormalize(comments).some((item) => item.text.toLowerCase().includes(normalized));
}

function currentPortableRoundTrip(comments) {
  const exported = JSON.stringify({ schema: 'webclip-journal', schemaVersion: 1, comments: currentNormalize(comments) });
  return currentNormalize(JSON.parse(exported).comments);
}

function isDeleted(comment) {
  return Number(comment.deletedAt || 0) > 0;
}

function activeComments(comments) {
  return comments.filter((comment) => !isDeleted(comment));
}

function tombstones(comments) {
  return comments.filter(isDeleted);
}

function activeBudget(comments) {
  const active = activeComments(comments);
  return {
    count: active.length,
    chars: active.reduce((sum, item) => sum + String(item.text || '').length, 0)
  };
}

function historyBudget(comments) {
  const history = tombstones(comments);
  return {
    count: history.length,
    fullCount: history.filter((item) => item.bodyRetained === true).length,
    fullChars: history.reduce((sum, item) => sum + (item.bodyRetained === true ? String(item.text || '').length : 0), 0)
  };
}

function assertActiveAdmission(comments, text) {
  const budget = activeBudget(comments);
  if (budget.count >= ACTIVE_COUNT_LIMIT) return false;
  return budget.chars + String(text || '').length <= ACTIVE_TEXT_LIMIT;
}

function minimalTombstone(comment, deletedAt) {
  return {
    id: comment.id,
    generation: comment.generation,
    createdAt: comment.createdAt,
    updatedAt: Math.max(Number(comment.updatedAt || 0), Number(deletedAt || 0)),
    deletedAt: Number(deletedAt || comment.deletedAt || 0),
    bodyRetained: false,
    text: ''
  };
}

function fullTombstone(comment, deletedAt) {
  return {
    ...comment,
    deletedAt: Number(deletedAt || comment.deletedAt || 0),
    bodyRetained: true,
    text: String(comment.text || '')
  };
}

function compactResearchHistory(comments) {
  const active = activeComments(comments).map(clone);
  const history = tombstones(comments)
    .map(clone)
    .sort((a, b) => Number(b.deletedAt || 0) - Number(a.deletedAt || 0));

  let keptFullCount = 0;
  let keptFullChars = 0;
  const bounded = [];
  for (const item of history) {
    const body = String(item.text || '');
    const mayKeepBody = item.bodyRetained === true
      && keptFullCount < FULL_HISTORY_COUNT_LIMIT
      && keptFullChars + body.length <= FULL_HISTORY_TEXT_LIMIT;
    if (mayKeepBody) {
      keptFullCount += 1;
      keptFullChars += body.length;
      bounded.push({ ...item, bodyRetained: true });
    } else {
      bounded.push(minimalTombstone(item, item.deletedAt));
    }
  }

  // Structural tombstones are also bounded. Oldest compact tombstones are
  // dropped after the exact generation-safe lifecycle has made them inert.
  return [...active, ...bounded.slice(0, TOTAL_TOMBSTONE_LIMIT)];
}

function deleteUnderPolicy(comments, { id, generation, now, mode }) {
  const next = comments.map(clone);
  const index = next.findIndex((item) => item.id === id && Number(item.generation) === Number(generation));
  if (index < 0) return { changed: false, comments: next, reason: 'stale-generation' };
  if (isDeleted(next[index])) return { changed: false, comments: next, reason: 'already-deleted' };

  if (mode === 'privacy-delete') {
    next[index] = minimalTombstone(next[index], now);
    return { changed: true, comments: next, reason: 'redacted' };
  }
  if (mode === 'research-history') {
    next[index] = fullTombstone(next[index], now);
    return { changed: true, comments: compactResearchHistory(next), reason: 'retained-bounded' };
  }
  throw new Error('unknown policy mode');
}

function compactExactGeneration(comments, receipt) {
  const next = comments.map(clone);
  const index = next.findIndex((item) => item.id === receipt.id && Number(item.generation) === Number(receipt.generation));
  if (index < 0 || !isDeleted(next[index])) return { changed: false, comments: next };
  next[index] = minimalTombstone(next[index], next[index].deletedAt);
  return { changed: true, comments: next };
}

function ordinarySearch(comments, needle) {
  const normalized = String(needle || '').toLowerCase();
  return activeComments(comments).some((item) => String(item.text || '').toLowerCase().includes(normalized));
}

function deletedHistorySearch(comments, needle, mode) {
  if (mode !== 'research-history') return false;
  const normalized = String(needle || '').toLowerCase();
  return tombstones(comments)
    .filter((item) => item.bodyRetained === true)
    .some((item) => String(item.text || '').toLowerCase().includes(normalized));
}

function portableExport(comments, mode) {
  return JSON.stringify({
    schema: 'webclip-journal-model',
    schemaVersion: 2,
    commentLifecycle: {
      policyVersion: POLICY_VERSION,
      mode
    },
    comments: comments.map(clone)
  });
}

function migrateImportedComments(document, selectedMode) {
  const raw = Array.isArray(document?.comments) ? document.comments.map(clone) : [];
  const migrated = raw.map((item) => {
    const normalized = {
      id: String(item.id || ''),
      generation: Number(item.generation || 1),
      text: String(item.text || ''),
      createdAt: Number(item.createdAt || 0),
      updatedAt: Number(item.updatedAt || 0),
      deletedAt: Math.max(0, Number(item.deletedAt || 0)),
      bodyRetained: item.bodyRetained === true || (Number(item.deletedAt || 0) > 0 && String(item.text || '').length > 0)
    };
    if (!isDeleted(normalized)) return { ...normalized, bodyRetained: false };
    return selectedMode === 'privacy-delete'
      ? minimalTombstone(normalized, normalized.deletedAt)
      : fullTombstone(normalized, normalized.deletedAt);
  });
  return selectedMode === 'research-history' ? compactResearchHistory(migrated) : migrated;
}

function makeActive(id, text, generation = 1, createdAt = 1) {
  return { id, generation, text, createdAt, updatedAt: createdAt, deletedAt: 0, bodyRetained: false };
}

// 1. Current behavior: delete preserves full body and raw count.
{
  let comments = [makeActive('a', 'secret-marker')];
  comments = currentDelete(comments, 'a', 10);
  assert.equal(comments[0].text, 'secret-marker');
  assert.equal(comments[0].deletedAt, 10);
  assert.deepEqual(currentBudget(comments), { count: 1, chars: 13 });
}

// 2. Current repeated add/delete can exhaust raw active admission with zero live comments.
{
  let comments = [];
  for (let i = 0; i < ACTIVE_COUNT_LIMIT; i += 1) {
    const id = `c${i}`;
    comments.push(makeActive(id, 'x'));
    comments = currentDelete(comments, id, 100 + i);
  }
  assert.equal(comments.filter((item) => !isDeleted(item)).length, 0);
  assert.equal(currentCanAdd(comments, 'x'), false);
}

// 3. Current tombstone text is searchable through the ordinary comment domain.
{
  const comments = currentDelete([makeActive('s', 'unique-secret-needle')], 's', 20);
  assert.equal(currentSearch(comments, 'secret-needle'), true);
}

// 4. Current export/import roundtrip preserves deleted body and capacity debt.
{
  const comments = currentDelete([makeActive('p', 'portable-debt')], 'p', 30);
  const restored = currentPortableRoundTrip(comments);
  assert.equal(restored[0].deletedAt, 30);
  assert.equal(restored[0].text, 'portable-debt');
  assert.deepEqual(currentBudget(restored), currentBudget(comments));
}

// 5. Privacy-delete redacts the body immediately while preserving identity/timestamps.
{
  const original = [makeActive('a', 'erase-me', 7, 5)];
  const result = deleteUnderPolicy(original, { id: 'a', generation: 7, now: 50, mode: 'privacy-delete' });
  assert.equal(result.changed, true);
  assert.equal(result.comments[0].id, 'a');
  assert.equal(result.comments[0].generation, 7);
  assert.equal(result.comments[0].text, '');
  assert.equal(result.comments[0].bodyRetained, false);
  assert.equal(result.comments[0].deletedAt, 50);
}

// 6. Privacy-delete tombstones do not consume active count/text budget.
{
  let comments = [];
  for (let i = 0; i < 20; i += 1) {
    const id = `d${i}`;
    comments.push(makeActive(id, 'x', 1, i + 1));
    comments = deleteUnderPolicy(comments, { id, generation: 1, now: 100 + i, mode: 'privacy-delete' }).comments;
  }
  assert.deepEqual(activeBudget(comments), { count: 0, chars: 0 });
  assert.equal(assertActiveAdmission(comments, 'new'), true);
}

// 7. Research-history may retain deleted text, but active admission remains independent.
{
  let comments = [makeActive('r', 'history-body')];
  comments = deleteUnderPolicy(comments, { id: 'r', generation: 1, now: 100, mode: 'research-history' }).comments;
  assert.equal(historyBudget(comments).fullCount, 1);
  assert.deepEqual(activeBudget(comments), { count: 0, chars: 0 });
  assert.equal(assertActiveAdmission(comments, 'new-live'), true);
}

// 8. Research-history full bodies are bounded and older bodies compact to minimal tombstones.
{
  let comments = [];
  for (let i = 0; i < 6; i += 1) {
    const id = `h${i}`;
    comments.push(makeActive(id, `body-${i}`));
    comments = deleteUnderPolicy(comments, { id, generation: 1, now: 100 + i, mode: 'research-history' }).comments;
  }
  const budget = historyBudget(comments);
  assert.ok(budget.count <= TOTAL_TOMBSTONE_LIMIT);
  assert.ok(budget.fullCount <= FULL_HISTORY_COUNT_LIMIT);
  assert.ok(budget.fullChars <= FULL_HISTORY_TEXT_LIMIT);
}

// 9. Ordinary search never matches deleted history in either policy.
{
  const privacy = deleteUnderPolicy([makeActive('p', 'needle')], { id: 'p', generation: 1, now: 1, mode: 'privacy-delete' }).comments;
  const history = deleteUnderPolicy([makeActive('h', 'needle')], { id: 'h', generation: 1, now: 1, mode: 'research-history' }).comments;
  assert.equal(ordinarySearch(privacy, 'needle'), false);
  assert.equal(ordinarySearch(history, 'needle'), false);
  assert.equal(deletedHistorySearch(history, 'needle', 'research-history'), true);
  assert.equal(deletedHistorySearch(privacy, 'needle', 'privacy-delete'), false);
}

// 10. Privacy export cannot carry a deleted secret marker.
{
  const comments = deleteUnderPolicy([makeActive('x', 'TOP-SECRET-MARKER')], { id: 'x', generation: 1, now: 1, mode: 'privacy-delete' }).comments;
  const exported = portableExport(comments, 'privacy-delete');
  assert.equal(exported.includes('TOP-SECRET-MARKER'), false);
}

// 11. Research-history export is explicit about policy/version and remains bounded.
{
  let comments = [];
  for (let i = 0; i < 6; i += 1) {
    const id = `e${i}`;
    comments.push(makeActive(id, `body-${i}`));
    comments = deleteUnderPolicy(comments, { id, generation: 1, now: 200 + i, mode: 'research-history' }).comments;
  }
  const parsed = JSON.parse(portableExport(comments, 'research-history'));
  assert.equal(parsed.commentLifecycle.policyVersion, POLICY_VERSION);
  assert.equal(parsed.commentLifecycle.mode, 'research-history');
  assert.ok(historyBudget(parsed.comments).count <= TOTAL_TOMBSTONE_LIMIT);
}

// 12. Legacy full tombstones imported under privacy-delete are deterministically redacted.
{
  const legacy = { comments: [{ id: 'legacy', text: 'old-secret', createdAt: 1, updatedAt: 1, deletedAt: 10 }] };
  const migrated = migrateImportedComments(legacy, 'privacy-delete');
  assert.equal(migrated[0].deletedAt, 10);
  assert.equal(migrated[0].text, '');
  assert.equal(migrated[0].bodyRetained, false);
}

// 13. Legacy full tombstones imported under research-history obey the bounded history budget.
{
  const legacy = { comments: [] };
  for (let i = 0; i < 10; i += 1) legacy.comments.push({ id: `l${i}`, text: `legacy-body-${i}`, createdAt: 1, updatedAt: 1, deletedAt: 10 + i });
  const migrated = migrateImportedComments(legacy, 'research-history');
  const budget = historyBudget(migrated);
  assert.ok(budget.count <= TOTAL_TOMBSTONE_LIMIT);
  assert.ok(budget.fullCount <= FULL_HISTORY_COUNT_LIMIT);
  assert.ok(budget.fullChars <= FULL_HISTORY_TEXT_LIMIT);
}

// 14. Roundtrip preserves deleted state without charging it to active capacity.
{
  let comments = [makeActive('rt', 'retained')];
  comments = deleteUnderPolicy(comments, { id: 'rt', generation: 1, now: 40, mode: 'research-history' }).comments;
  const restored = migrateImportedComments(JSON.parse(portableExport(comments, 'research-history')), 'research-history');
  assert.equal(restored[0].deletedAt, 40);
  assert.deepEqual(activeBudget(restored), { count: 0, chars: 0 });
  assert.equal(assertActiveAdmission(restored, 'new'), true);
}

// 15. Stale compaction receipt cannot redact a newer same-id generation.
{
  const replacement = [makeActive('same', 'new-body', 2, 200)];
  const stale = compactExactGeneration(replacement, { id: 'same', generation: 1 });
  assert.equal(stale.changed, false);
  assert.equal(stale.comments[0].text, 'new-body');
  assert.equal(stale.comments[0].deletedAt, 0);
}

// 16. Exact current tombstone generation may compact without changing its identity.
{
  const deleted = deleteUnderPolicy([makeActive('g', 'history', 3)], { id: 'g', generation: 3, now: 90, mode: 'research-history' }).comments;
  const compacted = compactExactGeneration(deleted, { id: 'g', generation: 3 });
  assert.equal(compacted.changed, true);
  assert.equal(compacted.comments[0].id, 'g');
  assert.equal(compacted.comments[0].generation, 3);
  assert.equal(compacted.comments[0].text, '');
}

// 17. Active limit still protects true live-comment growth.
{
  const active = [];
  for (let i = 0; i < ACTIVE_COUNT_LIMIT; i += 1) active.push(makeActive(`a${i}`, 'x'));
  assert.equal(assertActiveAdmission(active, 'x'), false);
}

// 18. Separate history limits do not justify silently increasing the active limit.
{
  const active = [makeActive('a', '1234567890')];
  const deleted = deleteUnderPolicy([makeActive('d', 'history')], { id: 'd', generation: 1, now: 1, mode: 'research-history' }).comments;
  assert.equal(activeBudget([...active, ...deleted]).count, 1);
  assert.equal(historyBudget([...active, ...deleted]).count, 1);
}

// 19. Deleted history must remain distinguishable from active comments after portability.
{
  const source = deleteUnderPolicy([makeActive('z', 'body')], { id: 'z', generation: 1, now: 5, mode: 'research-history' }).comments;
  const restored = migrateImportedComments(JSON.parse(portableExport(source, 'research-history')), 'research-history');
  assert.equal(isDeleted(restored[0]), true);
  assert.equal(activeComments(restored).length, 0);
}

// 20. A policy migration never resurrects a deleted comment into the active domain.
{
  const legacy = { comments: [{ id: 'm', text: 'legacy', deletedAt: 7, createdAt: 1, updatedAt: 1 }] };
  for (const mode of ['privacy-delete', 'research-history']) {
    const migrated = migrateImportedComments(legacy, mode);
    assert.equal(migrated.some((item) => item.id === 'm' && !isDeleted(item)), false);
  }
}

console.log('P1-211 comment tombstone lifecycle model: PASS');
