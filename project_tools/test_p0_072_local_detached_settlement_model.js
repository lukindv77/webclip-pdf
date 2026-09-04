'use strict';

const assert = require('node:assert/strict');

function clone(v) { return JSON.parse(JSON.stringify(v)); }

function quarantine(row, resetId) {
  return {
    ...clone(row),
    journalResetDisposition: row.journalResetDisposition || {
      version: 1,
      resetId,
      state: 'quarantined',
      outcome: 'pending',
      resolution: 'reconciling'
    }
  };
}

function transitionDetached(row, outcome, resolution) {
  assert(row?.journalResetDisposition, 'detached transition requires reset disposition');
  return {
    ...clone(row),
    journalResetDisposition: {
      ...clone(row.journalResetDisposition),
      outcome,
      resolution
    }
  };
}

function preStartCancelled(row) {
  return row.journalResetDisposition
    ? transitionDetached(row, 'cancelled-before-start', 'terminal')
    : null;
}

function actualStartRejected(row) {
  return row.journalResetDisposition
    ? transitionDetached(row, 'start-rejected', 'terminal')
    : null;
}

function invalidResolvedDownloadId(row) {
  return row.journalResetDisposition
    ? transitionDetached(row, 'unknown', 'manual-resolution')
    : { ...clone(row), kind: 'unknown', recoveryState: 'manual-resolution' };
}

function bindNumeric(intent, downloadId, existing = null) {
  assert(Number.isInteger(downloadId) && downloadId >= 0);
  if (existing) {
    assert.equal(String(existing.operationId || ''), String(intent.operationId || ''), 'different operation owns numeric id');
    const a = existing.journalResetDisposition || null;
    const b = intent.journalResetDisposition || null;
    if (a && b && a.resetId !== b.resetId) {
      const error = new Error('conflicting reset generations');
      error.code = 'JOURNAL_RESET_ID_CONFLICT';
      throw error;
    }
    return { ...clone(existing), journalResetDisposition: clone(a || b || null) || undefined };
  }
  return { ...clone(intent), downloadId, kind: 'download' };
}

function settleNumeric(row, state) {
  if (!row.journalResetDisposition) return { deleted: true, row: null, journalAllowed: state === 'complete' };
  if (state === 'complete') return { deleted: false, row: transitionDetached(row, 'complete', 'terminal'), journalAllowed: false };
  if (state === 'interrupted') return { deleted: false, row: transitionDetached(row, 'interrupted', 'terminal'), journalAllowed: false };
  return { deleted: false, row: transitionDetached(row, 'unknown', 'manual-resolution'), journalAllowed: false };
}

(function resetCannotInferWhetherIntentAlreadyStarted() {
  const q = quarantine({ downloadId: 'intent:op-1', kind: 'intent', operationId: 'op-1' }, 'r1');
  assert.equal(q.journalResetDisposition.outcome, 'pending');
  assert.equal(q.journalResetDisposition.resolution, 'reconciling');
})();

(function busyBeforeChromeCallCanProveCancelledBeforeStart() {
  const q = quarantine({ downloadId: 'intent:op-1', kind: 'intent', operationId: 'op-1' }, 'r1');
  const terminal = preStartCancelled(q);
  assert.equal(terminal.journalResetDisposition.outcome, 'cancelled-before-start');
  assert.equal(terminal.journalResetDisposition.resolution, 'terminal');
})();

(function actualPromiseRejectionIsDistinctFromCallerTimeout() {
  const q = quarantine({ downloadId: 'intent:op-1', kind: 'intent', operationId: 'op-1' }, 'r1');
  const rejected = actualStartRejected(q);
  assert.equal(rejected.journalResetDisposition.outcome, 'start-rejected');
  const timedOut = transitionDetached(q, 'pending', 'reconciling');
  assert.notEqual(timedOut.journalResetDisposition.outcome, 'start-rejected');
})();

(function impossibleInvalidResolvedIdFailsConservativeManual() {
  const q = quarantine({ downloadId: 'intent:op-1', kind: 'intent', operationId: 'op-1' }, 'r1');
  const unknown = invalidResolvedDownloadId(q);
  assert.equal(unknown.journalResetDisposition.outcome, 'unknown');
  assert.equal(unknown.journalResetDisposition.resolution, 'manual-resolution');
})();

(function lateNumericBindPreservesResetDisposition() {
  const q = quarantine({ downloadId: 'intent:op-1', kind: 'intent', operationId: 'op-1' }, 'r1');
  const bound = bindNumeric(q, 77);
  assert.equal(bound.downloadId, 77);
  assert.equal(bound.journalResetDisposition.resetId, 'r1');
})();

(function sameOperationExistingNumericMustInheritIntentReset() {
  const q = quarantine({ downloadId: 'intent:op-1', kind: 'intent', operationId: 'op-1' }, 'r1');
  const existing = { downloadId: 77, kind: 'download', operationId: 'op-1' };
  const merged = bindNumeric(q, 77, existing);
  assert.equal(merged.journalResetDisposition.resetId, 'r1');
})();

(function conflictingResetGenerationsFailClosed() {
  const intent = quarantine({ downloadId: 'intent:op-1', kind: 'intent', operationId: 'op-1' }, 'r1');
  const existing = quarantine({ downloadId: 77, kind: 'download', operationId: 'op-1' }, 'r2');
  assert.throws(() => bindNumeric(intent, 77, existing), (e) => e.code === 'JOURNAL_RESET_ID_CONFLICT');
})();

(function completeAfterResetIsTerminalEvidenceNotDelete() {
  const q = quarantine({ downloadId: 77, kind: 'download', operationId: 'op-1' }, 'r1');
  const settled = settleNumeric(q, 'complete');
  assert.equal(settled.deleted, false);
  assert.equal(settled.journalAllowed, false);
  assert.equal(settled.row.journalResetDisposition.outcome, 'complete');
})();

(function interruptedAfterResetIsTerminalEvidenceNotDelete() {
  const q = quarantine({ downloadId: 77, kind: 'download', operationId: 'op-1' }, 'r1');
  const settled = settleNumeric(q, 'interrupted');
  assert.equal(settled.deleted, false);
  assert.equal(settled.row.journalResetDisposition.outcome, 'interrupted');
})();

(function resetBetweenAppendAndCleanupUsesKnownCompleteFact() {
  const afterReset = quarantine({ downloadId: 77, kind: 'download', operationId: 'op-1' }, 'reset-between');
  const cleanup = settleNumeric(afterReset, 'complete');
  assert.equal(cleanup.deleted, false);
  assert.equal(cleanup.row.journalResetDisposition.resolution, 'terminal');
})();

console.log('P0-072 local detached settlement model: PASS');
