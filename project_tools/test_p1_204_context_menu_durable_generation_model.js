'use strict';

const assert = require('assert');

function makeDurable() {
  return {
    currentGeneration: 0,
    terminalGeneration: 0,
    generations: new Map(),
    repairRequired: false,
    repairAlarmGeneration: 0
  };
}

function beginRebuild(durable, reason = 'repair') {
  const generation = durable.currentGeneration + 1;
  durable.currentGeneration = generation;
  const predecessors = [...durable.generations.values()]
    .filter((x) => x.generation < generation && x.terminal !== true)
    .map((x) => x.generation);
  durable.generations.set(generation, {
    generation,
    reason,
    remove: 'not-issued',
    create: 'not-issued',
    predecessorUnknown: new Set(predecessors),
    localSuccess: false,
    terminal: false
  });
  durable.repairRequired = true;
  durable.repairAlarmGeneration = generation;
  return generation;
}

function issueRemove(durable, generation) {
  durable.generations.get(generation).remove = 'issued-unknown';
}

function settleRemove(durable, generation) {
  const g = durable.generations.get(generation);
  if (g) g.remove = 'settled';
}

function issueCreate(durable, generation) {
  durable.generations.get(generation).create = 'issued-unknown';
}

function settleCreate(durable, generation) {
  const g = durable.generations.get(generation);
  if (g) g.create = 'settled';
}

function markLocalSuccess(durable, generation) {
  const g = durable.generations.get(generation);
  if (!g) return false;
  g.localSuccess = g.remove === 'settled' && g.create === 'settled';
  return g.localSuccess;
}

function provePredecessorQuiescent(durable, currentGeneration, predecessorGeneration) {
  const current = durable.generations.get(currentGeneration);
  if (!current) return false;
  current.predecessorUnknown.delete(predecessorGeneration);
  const old = durable.generations.get(predecessorGeneration);
  if (old) old.terminal = true;
  return true;
}

function tryTerminal(durable, generation) {
  const g = durable.generations.get(generation);
  if (!g) return false;
  if (generation !== durable.currentGeneration) return false;
  if (!g.localSuccess) return false;
  if (g.predecessorUnknown.size) return false;
  g.terminal = true;
  durable.terminalGeneration = generation;
  durable.repairRequired = false;
  if (durable.repairAlarmGeneration === generation) durable.repairAlarmGeneration = 0;
  return true;
}

function staleGenerationMayClearRepair(durable, generation) {
  if (generation !== durable.currentGeneration) return false;
  durable.repairRequired = false;
  return true;
}

function alarmMayClear(durable, generation) {
  if (durable.repairAlarmGeneration !== generation) return false;
  durable.repairAlarmGeneration = 0;
  return true;
}

function naiveBrowserRace() {
  const browser = { menuPresent: false };
  // A remove is issued first but settles late.
  // B performs a complete local rebuild in the meantime.
  browser.menuPresent = true;  // B create settled.
  browser.menuPresent = false; // A remove settled late.
  return browser.menuPresent;
}

// 1. Canonical current failure: old remove can erase a newer locally-successful rebuild.
assert.equal(naiveBrowserRace(), false);

// 2. Durable generation survives worker-memory loss and records the unknown predecessor.
{
  const durable = makeDurable();
  const a = beginRebuild(durable, 'worker-A');
  issueRemove(durable, a);
  // Worker A dies. Only durable survives.
  const b = beginRebuild(durable, 'worker-B-repair');
  assert.equal(durable.currentGeneration, b);
  assert.deepEqual([...durable.generations.get(b).predecessorUnknown], [a]);
}

// 3. Successful B callbacks are not terminal while A remains unknown.
{
  const durable = makeDurable();
  const a = beginRebuild(durable);
  issueRemove(durable, a);
  const b = beginRebuild(durable);
  issueRemove(durable, b); settleRemove(durable, b);
  issueCreate(durable, b); settleCreate(durable, b);
  assert.equal(markLocalSuccess(durable, b), true);
  assert.equal(tryTerminal(durable, b), false);
  assert.equal(durable.repairRequired, true);
}

// 4. Finite retry exhaustion is not allowed to fabricate terminal truth.
{
  const durable = makeDurable();
  const a = beginRebuild(durable);
  issueRemove(durable, a);
  let latest = a;
  for (let i = 0; i < 3; i += 1) {
    latest = beginRebuild(durable, `retry-${i + 1}`);
    issueRemove(durable, latest); settleRemove(durable, latest);
    issueCreate(durable, latest); settleCreate(durable, latest);
    markLocalSuccess(durable, latest);
  }
  assert.equal(tryTerminal(durable, latest), false);
  assert.equal(durable.repairRequired, true);
}

// 5. Once predecessor quiescence is actually proven, a fresh current rebuild may become terminal.
{
  const durable = makeDurable();
  const a = beginRebuild(durable);
  issueRemove(durable, a);
  const b = beginRebuild(durable);
  issueRemove(durable, b); settleRemove(durable, b);
  issueCreate(durable, b); settleCreate(durable, b);
  markLocalSuccess(durable, b);
  assert.equal(provePredecessorQuiescent(durable, b, a), true);
  assert.equal(tryTerminal(durable, b), true);
  assert.equal(durable.terminalGeneration, b);
  assert.equal(durable.repairRequired, false);
}

// 6. Late settlement/callback from A cannot clear B's repair obligation.
{
  const durable = makeDurable();
  const a = beginRebuild(durable);
  issueRemove(durable, a);
  const b = beginRebuild(durable);
  assert.equal(staleGenerationMayClearRepair(durable, a), false);
  assert.equal(durable.repairRequired, true);
  assert.equal(durable.currentGeneration, b);
}

// 7. Old alarm clear is compare-and-act fenced and cannot clear the newer alarm.
{
  const durable = makeDurable();
  const a = beginRebuild(durable);
  const b = beginRebuild(durable);
  assert.equal(alarmMayClear(durable, a), false);
  assert.equal(durable.repairAlarmGeneration, b);
  assert.equal(alarmMayClear(durable, b), true);
}

// 8. Old create is also an unresolved browser mutation, not just old removeAll.
{
  const durable = makeDurable();
  const a = beginRebuild(durable);
  issueRemove(durable, a); settleRemove(durable, a);
  issueCreate(durable, a); // callback/actual settlement becomes unknown across death
  const b = beginRebuild(durable);
  assert.equal(durable.generations.get(b).predecessorUnknown.has(a), true);
}

// 9. A stale generation cannot mark itself terminal after a newer generation exists.
{
  const durable = makeDurable();
  const a = beginRebuild(durable);
  issueRemove(durable, a); settleRemove(durable, a);
  issueCreate(durable, a); settleCreate(durable, a); markLocalSuccess(durable, a);
  const b = beginRebuild(durable);
  assert.equal(tryTerminal(durable, a), false);
  assert.equal(durable.currentGeneration, b);
}

// 10. A current generation with no unknown predecessor can terminate normally.
{
  const durable = makeDurable();
  const a = beginRebuild(durable, 'fresh-install');
  issueRemove(durable, a); settleRemove(durable, a);
  issueCreate(durable, a); settleCreate(durable, a);
  assert.equal(markLocalSuccess(durable, a), true);
  assert.equal(tryTerminal(durable, a), true);
}

// 11. Routine repair can avoid destructive removeAll and still retain generation truth.
{
  const durable = makeDurable();
  const g = beginRebuild(durable, 'stable-id-reconcile');
  const state = durable.generations.get(g);
  state.remove = 'settled'; // no global destructive remove; known-ID reconcile phase complete
  state.create = 'settled';
  markLocalSuccess(durable, g);
  assert.equal(tryTerminal(durable, g), true);
}

// 12. Worker restart is not equivalent to browser/profile startup; durable receipt is the recovery trigger.
{
  const durable = makeDurable();
  const a = beginRebuild(durable, 'module-worker-A');
  issueRemove(durable, a);
  const serialized = JSON.stringify({
    currentGeneration: durable.currentGeneration,
    repairRequired: durable.repairRequired,
    phase: durable.generations.get(a).remove
  });
  const recovered = JSON.parse(serialized);
  assert.equal(recovered.repairRequired, true);
  assert.equal(recovered.phase, 'issued-unknown');
}

console.log('P1-204 context menu durable generation model: PASS');
