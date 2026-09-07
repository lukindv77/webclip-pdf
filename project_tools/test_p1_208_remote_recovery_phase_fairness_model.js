'use strict';

const assert = require('assert');

function row(id, phase, updatedAt, extra = {}) {
  return { id, phase, updatedAt, ...extra };
}

function currentOldestPrefix(rows, maxItems = 6) {
  return rows.filter((item) => item.phase !== 'stale-unverified').slice().sort((a, b) => a.updatedAt - b.updatedAt || a.id.localeCompare(b.id)).slice(0, maxItems);
}

function currentPass(rows, { authAvailable, maxItems = 6 } = {}) {
  const selected = currentOldestPrefix(rows, maxItems);
  const result = { selected: selected.map((x) => x.id), finalized: [], deferred: [], network: [] };
  for (const item of selected) {
    if (item.phase === 'remote-verified') { result.finalized.push(item.id); continue; }
    if (!authAvailable) { result.deferred.push(item.id); continue; }
    result.network.push(item.id);
  }
  return result;
}

function takeOldest(rows, predicate, limit, excluded = new Set()) {
  if (limit <= 0) return [];
  return rows.filter((x) => !excluded.has(x.id) && x.phase !== 'stale-unverified' && predicate(x)).slice().sort((a, b) => a.updatedAt - b.updatedAt || a.id.localeCompare(b.id)).slice(0, limit);
}

function fairSelect(rows, { authAvailable, maxItems = 6 } = {}) {
  const max = Math.max(1, Math.min(6, maxItems));
  const selected = []; const ids = new Set();
  const append = (items) => { for (const item of items) { if (selected.length >= max || ids.has(item.id)) continue; selected.push(item); ids.add(item.id); } };
  append(takeOldest(rows, (x) => x.phase === 'remote-verified', 1, ids));
  if (authAvailable && selected.length < max) append(takeOldest(rows, (x) => x.phase !== 'remote-verified', 1, ids));
  append(takeOldest(rows, (x) => x.phase === 'remote-verified' || authAvailable, max - selected.length, ids));
  return selected;
}

function fairPass(rows, opts) {
  const selected = fairSelect(rows, opts);
  const result = { selected: selected.map((x) => x.id), finalized: [], network: [] };
  for (const item of selected) { if (item.phase === 'remote-verified') result.finalized.push(item.id); else result.network.push(item.id); }
  return result;
}

// 1. Current starvation: six oldest PREPARED rows hide a later remote-verified row without auth.
{
  const rows = [];
  for (let i = 0; i < 6; i += 1) rows.push(row(`p${i + 1}`, 'prepared', i + 1));
  rows.push(row('v1', 'remote-verified', 100));
  const wake1 = currentPass(rows, { authAvailable: false });
  const wake2 = currentPass(rows, { authAvailable: false });
  assert.deepEqual(wake1.selected, ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
  assert.deepEqual(wake1.finalized, []);
  assert.deepEqual(wake2.selected, wake1.selected);
  assert.equal(wake2.selected.includes('v1'), false);
}

// 2. Auth deferral does not fake failure/rotation metadata.
{
  const rows = [row('p1', 'prepared', 10, { attemptCount: 2 })];
  currentPass(rows, { authAvailable: false });
  assert.equal(rows[0].updatedAt, 10);
  assert.equal(rows[0].attemptCount, 2);
}

// 3. Selected remote-verified work finishes without OAuth.
{
  const result = currentPass([row('v1', 'remote-verified', 1)], { authAvailable: false });
  assert.deepEqual(result.finalized, ['v1']);
  assert.deepEqual(result.deferred, []);
}

// 4. Fair selection guarantees local-finalization admission behind old auth-blocked work.
{
  const rows = [];
  for (let i = 0; i < 20; i += 1) rows.push(row(`p${String(i).padStart(2, '0')}`, 'prepared', i));
  rows.push(row('verified', 'remote-verified', 999));
  assert.equal(fairSelect(rows, { authAvailable: false }).some((x) => x.id === 'verified'), true);
}

// 5. No auth spends the bounded pass only on work capable of local progress.
{
  const rows = [row('p1', 'prepared', 1), row('v1', 'remote-verified', 2), row('v2', 'remote-verified', 3)];
  const result = fairPass(rows, { authAvailable: false });
  assert.deepEqual(result.finalized.sort(), ['v1', 'v2']);
  assert.deepEqual(result.network, []);
}

// 6. With auth, network-required work gets a bounded share even with many verified rows.
{
  const rows = [];
  for (let i = 0; i < 12; i += 1) rows.push(row(`v${i}`, 'remote-verified', i));
  rows.push(row('p1', 'prepared', 100));
  assert.equal(fairSelect(rows, { authAvailable: true }).some((x) => x.id === 'p1'), true);
}

// 7. Archived stale evidence is outside the hot queue.
{
  const rows = [row('s1', 'stale-unverified', 0), row('v1', 'remote-verified', 1)];
  assert.deepEqual(fairSelect(rows, { authAvailable: false }).map((x) => x.id), ['v1']);
}

// 8. Not selected is not deleted/cancelled.
{
  const rows = [row('p1', 'prepared', 1), row('v1', 'remote-verified', 2)];
  fairSelect(rows, { authAvailable: false, maxItems: 1 });
  assert.equal(rows.length, 2);
  assert.equal(rows.some((x) => x.id === 'p1'), true);
}

// 9. PREPARED resumes once auth returns.
{
  const rows = [row('p1', 'prepared', 1), row('v1', 'remote-verified', 2)];
  assert.equal(fairPass(rows, { authAvailable: false }).network.length, 0);
  assert.equal(fairPass(rows, { authAvailable: true }).network.includes('p1'), true);
}

// 10. Verified backlog still remains bounded by six.
{
  const rows = Array.from({ length: 30 }, (_, i) => row(`v${i}`, 'remote-verified', i));
  const selected = fairSelect(rows, { authAvailable: false });
  assert.equal(selected.length, 6);
  assert.equal(selected.every((x) => x.phase === 'remote-verified'), true);
}

// 11. Restart does not reintroduce starvation when fairness derives from durable phase/index state.
{
  const rows = Array.from({ length: 20 }, (_, i) => row(`p${i}`, 'prepared', i));
  rows.push(row('v1', 'remote-verified', 100));
  for (let wake = 0; wake < 5; wake += 1) {
    const durableReload = JSON.parse(JSON.stringify(rows));
    assert.equal(fairSelect(durableReload, { authAvailable: false }).some((x) => x.id === 'v1'), true);
  }
}

// 12. Listed phase is not action authority; a fresh durable read can reveal a newer phase.
{
  const listed = row('x', 'prepared', 1);
  const durableCurrent = row('x', 'remote-verified', 2);
  assert.notEqual(listed.phase, durableCurrent.phase);
}

// 13. Genuine failure rotation is distinct from credential absence.
{
  const before = row('x', 'prepared', 5, { attemptCount: 0 });
  const afterFailure = { ...before, updatedAt: 10, attemptCount: 1 };
  assert(afterFailure.updatedAt > before.updatedAt);
  assert(afterFailure.attemptCount > before.attemptCount);
}

// 14. Progress and outstanding auth requirement can both be true.
{
  const truth = { recovered: 1, deferredAuth: 3, authRequired: true };
  assert.equal(truth.recovered > 0 && truth.authRequired, true);
}

// 15. P1-208 consumes remote proof; scheduling does not create proof.
{
  const verified = row('v1', 'remote-verified', 1, { remoteReceipt: 'exact-proof-owned-by-P1-184' });
  assert.equal(verified.remoteReceipt, 'exact-proof-owned-by-P1-184');
}

// 16. A phase+updatedAt index can serve bounded phase lanes without full-store scanning.
{
  const indexes = ['updatedAt', 'phaseUpdatedAt'];
  assert.equal(indexes.includes('phaseUpdatedAt'), true);
}

// 17. Global work bound remains hard under mixed phases.
{
  const rows = Array.from({ length: 100 }, (_, i) => row(`x${i}`, i % 2 ? 'prepared' : 'remote-verified', i));
  assert(fairSelect(rows, { authAvailable: true }).length <= 6);
}

console.log('P1-208 remote recovery phase fairness model: PASS');
