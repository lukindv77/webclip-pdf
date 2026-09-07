'use strict';

const assert = require('assert');

function makeState() {
  return {
    globalHistoryEpoch: 1,
    operations: new Map(),
    events: new Map(),
    retired: new Map(),
    nextOperationGeneration: new Map()
  };
}

function issueReceipt(state, physicalOperationId, clientOperationId = '') {
  const next = (state.nextOperationGeneration.get(physicalOperationId) || 0) + 1;
  state.nextOperationGeneration.set(physicalOperationId, next);
  return Object.freeze({
    physicalOperationId,
    clientOperationId,
    globalHistoryEpoch: state.globalHistoryEpoch,
    operationHistoryGeneration: next
  });
}

function retiredThrough(state, physicalOperationId) {
  return state.retired.get(physicalOperationId) || 0;
}

function receiptCurrent(state, receipt) {
  return receipt.globalHistoryEpoch === state.globalHistoryEpoch
    && receipt.operationHistoryGeneration > retiredThrough(state, receipt.physicalOperationId);
}

function writeHeader(state, receipt, now, patch = {}) {
  if (!receiptCurrent(state, receipt)) return { stale: true };
  const old = state.operations.get(receipt.physicalOperationId);
  if (old && old.operationHistoryGeneration !== receipt.operationHistoryGeneration) return { stale: true };
  const row = old || {
    physicalOperationId: receipt.physicalOperationId,
    clientOperationId: receipt.clientOperationId,
    globalHistoryEpoch: receipt.globalHistoryEpoch,
    operationHistoryGeneration: receipt.operationHistoryGeneration,
    createdAt: now,
    updatedAt: now,
    status: 'running'
  };
  Object.assign(row, patch, { updatedAt: now });
  state.operations.set(receipt.physicalOperationId, row);
  return { stale: false, row };
}

function appendEvent(state, receipt, now, text) {
  if (!receiptCurrent(state, receipt)) return { stale: true };
  const headerResult = writeHeader(state, receipt, now);
  if (headerResult.stale) return headerResult;
  const list = state.events.get(receipt.physicalOperationId) || [];
  list.push({ generation: receipt.operationHistoryGeneration, at: now, text });
  state.events.set(receipt.physicalOperationId, list);
  return { stale: false };
}

function retentionDelete(state, physicalOperationId, expectedGeneration) {
  const row = state.operations.get(physicalOperationId);
  if (!row || row.operationHistoryGeneration !== expectedGeneration) return { deleted: false, staleSnapshot: true };
  state.retired.set(
    physicalOperationId,
    Math.max(retiredThrough(state, physicalOperationId), expectedGeneration)
  );
  state.events.delete(physicalOperationId);
  state.operations.delete(physicalOperationId);
  return { deleted: true };
}

function retentionPassByTtl(state, cutoff) {
  const deleted = [];
  for (const row of [...state.operations.values()]) {
    if (row.updatedAt < cutoff) {
      const result = retentionDelete(state, row.physicalOperationId, row.operationHistoryGeneration);
      if (result.deleted) deleted.push(row.physicalOperationId);
    }
  }
  return deleted;
}

function sizeEvict(state, physicalOperationId) {
  const row = state.operations.get(physicalOperationId);
  if (!row) return false;
  return retentionDelete(state, physicalOperationId, row.operationHistoryGeneration).deleted;
}

function administrativeClear(state) {
  state.globalHistoryEpoch += 1;
  state.operations.clear();
  state.events.clear();
}

function naiveLateWriterResurrection() {
  const db = new Map([['A', { operationId: 'A', updatedAt: 1 }]]);
  db.delete('A');
  const now = 100;
  const row = db.get('A') || { operationId: 'A', createdAt: now, updatedAt: now };
  db.set('A', row);
  return db.has('A');
}

// 1. Current-shaped default-record behavior can resurrect an expired row.
assert.equal(naiveLateWriterResurrection(), true);

// 2. Cleanup-before-write retires the exact generation; late header writer is stale.
{
  const state = makeState();
  const r = issueReceipt(state, 'phys-A', 'corr-1');
  writeHeader(state, r, 10);
  assert.equal(retentionDelete(state, 'phys-A', r.operationHistoryGeneration).deleted, true);
  assert.equal(writeHeader(state, r, 20).stale, true);
  assert.equal(state.operations.has('phys-A'), false);
}

// 3. A late event cannot recreate either the header or the event timeline after cleanup.
{
  const state = makeState();
  const r = issueReceipt(state, 'phys-A');
  appendEvent(state, r, 10, 'before');
  retentionDelete(state, 'phys-A', r.operationHistoryGeneration);
  assert.equal(appendEvent(state, r, 30, 'late').stale, true);
  assert.equal(state.operations.has('phys-A'), false);
  assert.equal(state.events.has('phys-A'), false);
}

// 4. Write-before-cleanup refreshes updatedAt; a fresh eligibility check retains the operation.
{
  const state = makeState();
  const r = issueReceipt(state, 'phys-A');
  writeHeader(state, r, 10);
  writeHeader(state, r, 200);
  const deleted = retentionPassByTtl(state, 100);
  assert.deepEqual(deleted, []);
  assert.equal(state.operations.get('phys-A').updatedAt, 200);
}

// 5. A stale cleanup snapshot cannot delete a newer generation for the same physical key.
{
  const state = makeState();
  const r1 = issueReceipt(state, 'phys-A');
  writeHeader(state, r1, 10);
  const r2 = issueReceipt(state, 'phys-A');
  state.operations.set('phys-A', {
    physicalOperationId: 'phys-A',
    globalHistoryEpoch: state.globalHistoryEpoch,
    operationHistoryGeneration: r2.operationHistoryGeneration,
    createdAt: 20,
    updatedAt: 20,
    status: 'running'
  });
  assert.equal(retentionDelete(state, 'phys-A', r1.operationHistoryGeneration).deleted, false);
  assert.equal(state.operations.get('phys-A').operationHistoryGeneration, r2.operationHistoryGeneration);
}

// 6. Size-pressure pruning uses the same retirement fence as TTL pruning.
{
  const state = makeState();
  const r = issueReceipt(state, 'phys-A');
  appendEvent(state, r, 10, 'large');
  assert.equal(sizeEvict(state, 'phys-A'), true);
  assert.equal(appendEvent(state, r, 20, 'quota-retry').stale, true);
  assert.equal(state.operations.has('phys-A'), false);
}

// 7. Quota retry must preserve the original receipt; recapturing authority would be a bypass.
{
  const state = makeState();
  const original = issueReceipt(state, 'phys-A');
  writeHeader(state, original, 10);
  sizeEvict(state, 'phys-A');
  const retryWithOriginal = writeHeader(state, original, 20);
  assert.equal(retryWithOriginal.stale, true);
  const illicitRecapture = issueReceipt(state, 'phys-A');
  assert.notEqual(illicitRecapture.operationHistoryGeneration, original.operationHistoryGeneration);
}

// 8. Cleanup of A must not globally fence unrelated current operation B.
{
  const state = makeState();
  const a = issueReceipt(state, 'phys-A');
  const b = issueReceipt(state, 'phys-B');
  writeHeader(state, a, 10);
  writeHeader(state, b, 200);
  retentionDelete(state, 'phys-A', a.operationHistoryGeneration);
  assert.equal(writeHeader(state, b, 210).stale, false);
  assert.equal(state.operations.has('phys-B'), true);
}

// 9. The fence is durable state; losing module-memory queues does not revive the retired generation.
{
  const state = makeState();
  const r = issueReceipt(state, 'phys-A');
  writeHeader(state, r, 10);
  retentionDelete(state, 'phys-A', r.operationHistoryGeneration);
  const serialized = JSON.stringify({
    globalHistoryEpoch: state.globalHistoryEpoch,
    retired: [...state.retired.entries()]
  });
  const recovered = JSON.parse(serialized);
  assert.deepEqual(recovered.retired, [['phys-A', r.operationHistoryGeneration]]);
}

// 10. Fresh physical operation may reuse the same caller correlation without resurrecting old history.
{
  const state = makeState();
  const old = issueReceipt(state, 'physical-old', 'same-correlation');
  writeHeader(state, old, 10);
  retentionDelete(state, 'physical-old', old.operationHistoryGeneration);
  const fresh = issueReceipt(state, 'physical-new', 'same-correlation');
  assert.equal(writeHeader(state, fresh, 20).stale, false);
  assert.equal(state.operations.has('physical-old'), false);
  assert.equal(state.operations.has('physical-new'), true);
}

// 11. Administrative clear composes through the global history epoch; old retention receipts remain stale too.
{
  const state = makeState();
  const a = issueReceipt(state, 'phys-A');
  const b = issueReceipt(state, 'phys-B');
  writeHeader(state, a, 10);
  writeHeader(state, b, 10);
  administrativeClear(state);
  assert.equal(writeHeader(state, a, 20).stale, true);
  assert.equal(appendEvent(state, b, 20, 'late-after-clear').stale, true);
}

// 12. Maintenance self-log that is not selected for deletion remains writable.
{
  const state = makeState();
  const old = issueReceipt(state, 'expired');
  const maintenance = issueReceipt(state, 'maintenance-current');
  writeHeader(state, old, 1);
  writeHeader(state, maintenance, 1000);
  const deleted = retentionPassByTtl(state, 500);
  assert.deepEqual(deleted, ['expired']);
  assert.equal(appendEvent(state, maintenance, 1010, 'cleanup-complete').stale, false);
}

// 13. Linearization is deterministic in either order.
{
  const before = makeState();
  const rb = issueReceipt(before, 'phys-A');
  writeHeader(before, rb, 1);
  writeHeader(before, rb, 100);
  assert.deepEqual(retentionPassByTtl(before, 50), []);

  const after = makeState();
  const ra = issueReceipt(after, 'phys-A');
  writeHeader(after, ra, 1);
  assert.deepEqual(retentionPassByTtl(after, 50), ['phys-A']);
  assert.equal(writeHeader(after, ra, 100).stale, true);
}

// 14. A retired generation cannot be revived merely because the row is absent and default creation is possible.
{
  const state = makeState();
  const r = issueReceipt(state, 'phys-A');
  writeHeader(state, r, 1);
  retentionDelete(state, 'phys-A', r.operationHistoryGeneration);
  assert.equal(state.operations.get('phys-A'), undefined);
  assert.equal(receiptCurrent(state, r), false);
}

console.log('P1-205 OperationLog retention generation model: PASS');
