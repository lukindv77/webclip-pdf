'use strict';

const assert = require('node:assert/strict');

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function resetDisposition(resetId, outcome = 'pending', resolution = 'manual-resolution') {
  return {
    version: 1,
    resetId,
    state: 'quarantined',
    outcome,
    resolution
  };
}

function classifyDurableCheckpoint(row) {
  if (!row) return 'missing';
  if (row.journalResetDisposition) return 'quarantined';
  return 'active';
}

function fencedWholePut(existing, incoming) {
  if (existing?.journalResetDisposition) {
    const error = new Error('P0-072: stale whole-record writer cannot replace reset-quarantined authority.');
    error.code = 'JOURNAL_RESET_QUARANTINED';
    throw error;
  }
  return clone(incoming);
}

function compareAndDelete(current, { expectedOperationId = '', allowQuarantinedTerminalDelete = false } = {}) {
  if (!current) return { deleted: false, row: null };
  if (expectedOperationId && String(current.operationId || '') !== expectedOperationId) {
    return { deleted: false, row: current };
  }
  if (current.journalResetDisposition && !allowQuarantinedTerminalDelete) {
    return { deleted: false, row: current };
  }
  return { deleted: true, row: null };
}

function normalReplayCandidates(rows) {
  return rows.filter((row) => classifyDurableCheckpoint(row) === 'active');
}

function staleCleanupCandidates(rows, cutoff) {
  return rows.filter((row) =>
    row.phase === 'stale-unverified'
    && !row.journalResetDisposition
    && Number(row.staleAt || 0) < cutoff
  );
}

function capacityClasses(rows) {
  return {
    currentActive: rows.filter((row) => !row.journalResetDisposition && row.kind !== 'unknown' && row.phase !== 'stale-unverified').length,
    currentUnknown: rows.filter((row) => !row.journalResetDisposition && row.kind === 'unknown').length,
    detachedReconciling: rows.filter((row) => row.journalResetDisposition?.resolution === 'reconciling').length,
    detachedManual: rows.filter((row) => row.journalResetDisposition?.resolution === 'manual-resolution').length,
    terminalRetained: rows.filter((row) => row.journalResetDisposition?.resolution === 'terminal').length
  };
}

(function appendAuthorityDistinguishesMissingActiveAndQuarantined() {
  const active = { id: 'a', operationId: 'op-a' };
  const quarantined = { id: 'q', operationId: 'op-q', journalResetDisposition: resetDisposition('reset-1') };
  assert.equal(classifyDurableCheckpoint(null), 'missing');
  assert.equal(classifyDurableCheckpoint(active), 'active');
  assert.equal(classifyDurableCheckpoint(quarantined), 'quarantined');
})();

(function staleWholePutCannotEraseQuarantine() {
  const existing = {
    id: 'remote-1', operationId: 'old-op', phase: 'prepared',
    journalResetDisposition: resetDisposition('reset-1')
  };
  const incoming = { id: 'remote-1', operationId: 'new-op', phase: 'prepared' };
  assert.throws(() => fencedWholePut(existing, incoming), (error) => error?.code === 'JOURNAL_RESET_QUARANTINED');
  assert.equal(existing.journalResetDisposition.resetId, 'reset-1');
})();

(function lateCleanupCannotDeleteQuarantinedReceipt() {
  const afterReset = {
    id: 'remote-1', operationId: 'op-1', phase: 'remote-verified',
    journalResetDisposition: resetDisposition('reset-1', 'remote-verified', 'terminal')
  };
  const result = compareAndDelete(afterReset, { expectedOperationId: 'op-1' });
  assert.equal(result.deleted, false,
    'P0-072: old post-append cleanup must not delete a receipt quarantined by a later reset.');
  assert.equal(result.row.journalResetDisposition.resetId, 'reset-1');
})();

(function staleCleanupCannotDeleteReplacementGeneration() {
  const current = { id: 77, operationId: 'new-op', kind: 'download' };
  const result = compareAndDelete(current, { expectedOperationId: 'old-op' });
  assert.equal(result.deleted, false,
    'P0-072: compare-and-delete must reject a stale operation identity even without reset metadata.');
})();

(function normalReplaySkipsQuarantinedRows() {
  const rows = [
    { id: 'active-1', operationId: 'a' },
    { id: 'q-1', operationId: 'q', journalResetDisposition: resetDisposition('r') },
    { id: 'active-2', operationId: 'b' }
  ];
  assert.deepEqual(normalReplayCandidates(rows).map((row) => row.id), ['active-1', 'active-2']);
})();

(function remoteStaleCleanupSkipsResetAuthority() {
  const rows = [
    { id: 'old-normal', phase: 'stale-unverified', staleAt: 10 },
    { id: 'old-reset', phase: 'stale-unverified', staleAt: 10, journalResetDisposition: resetDisposition('r', 'unknown', 'manual-resolution') },
    { id: 'fresh-normal', phase: 'stale-unverified', staleAt: 1000 }
  ];
  assert.deepEqual(staleCleanupCandidates(rows, 100).map((row) => row.id), ['old-normal']);
})();

(function capacityClassesAreIndependent() {
  const rows = [
    { id: 1, kind: 'intent', phase: 'prepared' },
    { id: 2, kind: 'unknown', phase: 'prepared' },
    { id: 3, phase: 'stale-unverified' },
    { id: 4, journalResetDisposition: resetDisposition('r1', 'pending', 'reconciling') },
    { id: 5, journalResetDisposition: resetDisposition('r2', 'unknown', 'manual-resolution') },
    { id: 6, journalResetDisposition: resetDisposition('r3', 'complete', 'terminal') }
  ];
  assert.deepEqual(capacityClasses(rows), {
    currentActive: 1,
    currentUnknown: 1,
    detachedReconciling: 1,
    detachedManual: 1,
    terminalRetained: 1
  });
})();

(function resetAfterAppendBeforeCleanupKeepsEvidence() {
  let row = { id: 81, operationId: 'op-81', kind: 'download' };
  // Old append finishes first. Before its separate cleanup executes, reset quarantines the row.
  row = { ...row, journalResetDisposition: resetDisposition('reset-between', 'complete', 'terminal') };
  const cleanup = compareAndDelete(row, { expectedOperationId: 'op-81' });
  assert.equal(cleanup.deleted, false);
  assert.equal(cleanup.row.journalResetDisposition.outcome, 'complete');
})();

console.log('P0-072 pending-store writer/delete fencing model: PASS');
