'use strict';

const assert = require('assert');

function newState() {
  return {
    historyGeneration: 1,
    operations: new Map(),
    deletionGeneration: new Map()
  };
}

function admitWriter(state, operationId) {
  return {
    operationId,
    expectedHistoryGeneration: state.historyGeneration,
    expectedDeletionGeneration: state.deletionGeneration.get(operationId) || 0
  };
}

function applyWriterNaive(state, receipt, event) {
  const current = state.operations.get(receipt.operationId) || { operationId: receipt.operationId, events: [] };
  current.events.push(event);
  state.operations.set(receipt.operationId, current);
  return { written: true };
}

function applyWriterFenced(state, receipt, event) {
  if (receipt.expectedHistoryGeneration !== state.historyGeneration) {
    return { written: false, stale: true, reason: 'history-generation' };
  }
  const currentDeleteGeneration = state.deletionGeneration.get(receipt.operationId) || 0;
  if (receipt.expectedDeletionGeneration !== currentDeleteGeneration) {
    return { written: false, stale: true, reason: 'operation-deletion-generation' };
  }
  const current = state.operations.get(receipt.operationId) || { operationId: receipt.operationId, events: [] };
  current.events.push(event);
  state.operations.set(receipt.operationId, current);
  return { written: true, stale: false };
}

function clearAllNaive(state) {
  state.operations.clear();
}

function clearAllFenced(state) {
  state.historyGeneration += 1;
  state.operations.clear();
}

function deleteOperationFenced(state, operationId) {
  state.operations.delete(operationId);
  state.deletionGeneration.set(operationId, (state.deletionGeneration.get(operationId) || 0) + 1);
}

function rehydrateDurableState(state) {
  const copy = newState();
  copy.historyGeneration = state.historyGeneration;
  copy.operations = new Map([...state.operations.entries()].map(([key, value]) => [key, JSON.parse(JSON.stringify(value))]));
  copy.deletionGeneration = new Map(state.deletionGeneration);
  return copy;
}

// 1. Current-shaped clear without a durable epoch can be undone by a late writer.
{
  const state = newState();
  state.operations.set('A', { operationId: 'A', events: ['before-clear'] });
  const oldWriter = admitWriter(state, 'A');
  clearAllNaive(state);
  assert.equal(state.operations.has('A'), false);
  applyWriterNaive(state, oldWriter, 'late-old-write');
  assert.equal(state.operations.has('A'), true);
}

// 2. Global clear advances the durable history generation and rejects old writers.
{
  const state = newState();
  state.operations.set('A', { operationId: 'A', events: ['before-clear'] });
  const oldWriter = admitWriter(state, 'A');
  clearAllFenced(state);
  const result = applyWriterFenced(state, oldWriter, 'late-old-write');
  assert.deepEqual(result, { written: false, stale: true, reason: 'history-generation' });
  assert.equal(state.operations.has('A'), false);
}

// 3. A genuinely new writer admitted after clear belongs to the new generation.
{
  const state = newState();
  clearAllFenced(state);
  const newWriter = admitWriter(state, 'B');
  assert.equal(applyWriterFenced(state, newWriter, 'post-clear').written, true);
  assert.deepEqual(state.operations.get('B').events, ['post-clear']);
}

// 4. Durable generation survives a service-worker restart.
{
  const state = newState();
  const oldWriter = admitWriter(state, 'A');
  clearAllFenced(state);
  const restarted = rehydrateDurableState(state);
  assert.equal(restarted.historyGeneration, 2);
  const result = applyWriterFenced(restarted, oldWriter, 'late-after-restart');
  assert.equal(result.written, false);
  assert.equal(result.reason, 'history-generation');
}

// 5. Per-operation retention/delete fences A without invalidating unrelated B.
{
  const state = newState();
  state.operations.set('A', { operationId: 'A', events: ['old-a'] });
  state.operations.set('B', { operationId: 'B', events: ['old-b'] });
  const writerA = admitWriter(state, 'A');
  const writerB = admitWriter(state, 'B');
  deleteOperationFenced(state, 'A');
  const staleA = applyWriterFenced(state, writerA, 'late-a');
  const liveB = applyWriterFenced(state, writerB, 'live-b');
  assert.equal(staleA.written, false);
  assert.equal(staleA.reason, 'operation-deletion-generation');
  assert.equal(liveB.written, true);
  assert.deepEqual(state.operations.get('B').events, ['old-b', 'live-b']);
}

// 6. Duplicate/retried stale mutation stays rejected after cleanup.
{
  const state = newState();
  const oldWriter = admitWriter(state, 'A');
  deleteOperationFenced(state, 'A');
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = applyWriterFenced(state, oldWriter, `retry-${attempt}`);
    assert.equal(result.written, false);
  }
  assert.equal(state.operations.has('A'), false);
}

// 7. Quota-cleanup + retry cannot resurrect a record deleted during cleanup.
{
  const state = newState();
  state.operations.set('A', { operationId: 'A', events: ['before-quota'] });
  const admittedBeforeQuota = admitWriter(state, 'A');
  // First physical write would fail with quota before changing state.
  deleteOperationFenced(state, 'A'); // retention/size pruning runs.
  // Current source retries the same logical mutation once. Target fence applies again.
  const retry = applyWriterFenced(state, admittedBeforeQuota, 'retry-after-cleanup');
  assert.equal(retry.written, false);
  assert.equal(state.operations.has('A'), false);
}

// 8. Global clear dominates all pre-clear per-operation writers, even for IDs not present at clear time.
{
  const state = newState();
  const writerA = admitWriter(state, 'A');
  const writerC = admitWriter(state, 'C');
  clearAllFenced(state);
  assert.equal(applyWriterFenced(state, writerA, 'late-a').written, false);
  assert.equal(applyWriterFenced(state, writerC, 'late-c').written, false);
  assert.equal(state.operations.size, 0);
}

// 9. Retention cleanup cannot be modeled as global cancellation of live telemetry.
{
  const state = newState();
  const writerA = admitWriter(state, 'A');
  const writerB = admitWriter(state, 'B');
  deleteOperationFenced(state, 'A');
  assert.equal(applyWriterFenced(state, writerA, 'late-a').written, false);
  assert.equal(applyWriterFenced(state, writerB, 'still-live-b').written, true);
}

// 10. A fresh physical lifecycle for the same textual id needs a new delete-generation receipt.
// P1-198 owns physical operation identity; P1-197 only proves the deletion fence consumed here.
{
  const state = newState();
  const oldA = admitWriter(state, 'A');
  deleteOperationFenced(state, 'A');
  assert.equal(applyWriterFenced(state, oldA, 'stale').written, false);
  const freshA = admitWriter(state, 'A');
  assert.equal(applyWriterFenced(state, freshA, 'fresh').written, true);
}

console.log('P1-197 OperationLog history generation model: PASS');
