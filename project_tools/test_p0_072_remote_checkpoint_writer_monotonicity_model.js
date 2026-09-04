'use strict';

const assert = require('node:assert/strict');

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function checkpointExisting(existing, item) {
  if (!existing) return { row: clone(item), status: 'created' };
  if (existing.journalResetDisposition) return { row: clone(existing), status: 'reset-detached' };

  const existingOperation = String(existing.operationId || '');
  const incomingOperation = String(item.operationId || '');
  if (existingOperation && incomingOperation && existingOperation !== incomingOperation) {
    return { row: clone(existing), status: 'operation-conflict' };
  }

  if (String(existing.phase || '') === 'stale-unverified') {
    return { row: clone(existing), status: 'manual-stale' };
  }

  return { row: clone(existing), status: 'existing' };
}

(function absentRowCreatesPreparedProtocolState() {
  const incoming = {
    id: 'j1', phase: 'prepared', operationId: 'op-1',
    externalStages: { version: 1, upload: 'prepared', publish: 'prepared' }
  };
  const result = checkpointExisting(null, incoming);
  assert.equal(result.status, 'created');
  assert.equal(result.row.externalStages.upload, 'prepared');
})();

(function admittedStageCannotBeResetByIdempotentCheckpointWriter() {
  const existing = {
    id: 'j1', phase: 'prepared', operationId: 'op-1',
    externalStages: { version: 1, upload: 'admitted', publish: 'prepared' }
  };
  const incoming = {
    id: 'j1', phase: 'prepared', operationId: 'op-1',
    externalStages: { version: 1, upload: 'prepared', publish: 'prepared' }
  };
  const result = checkpointExisting(existing, incoming);
  assert.equal(result.status, 'existing');
  assert.equal(result.row.externalStages.upload, 'admitted');
})();

(function resetDetachedCurrentRowAlwaysWins() {
  const existing = {
    id: 'j1', phase: 'stale-unverified', operationId: 'op-1',
    journalResetDisposition: { version: 1, resetId: 'reset-1', resolution: 'manual-resolution' },
    externalStages: { version: 1, upload: 'admitted', publish: 'prepared' }
  };
  const incoming = {
    id: 'j1', phase: 'prepared', operationId: 'op-1',
    externalStages: { version: 1, upload: 'prepared', publish: 'prepared' }
  };
  const result = checkpointExisting(existing, incoming);
  assert.equal(result.status, 'reset-detached');
  assert.equal(result.row.journalResetDisposition.resetId, 'reset-1');
  assert.equal(result.row.phase, 'stale-unverified');
})();

(function staleUnknownHistoryIsNotReactivatedByCheckpointCreation() {
  const existing = {
    id: 'j1', phase: 'stale-unverified', operationId: 'op-1',
    externalStages: { version: 1, upload: 'admitted', publish: 'prepared' }
  };
  const incoming = {
    id: 'j1', phase: 'prepared', operationId: 'op-1',
    externalStages: { version: 1, upload: 'prepared', publish: 'prepared' }
  };
  const result = checkpointExisting(existing, incoming);
  assert.equal(result.status, 'manual-stale');
  assert.equal(result.row.phase, 'stale-unverified');
  assert.equal(result.row.externalStages.upload, 'admitted');
})();

(function differentOperationCannotOverwriteSameKey() {
  const existing = { id: 'j1', phase: 'prepared', operationId: 'old-op' };
  const incoming = { id: 'j1', phase: 'prepared', operationId: 'new-op' };
  const result = checkpointExisting(existing, incoming);
  assert.equal(result.status, 'operation-conflict');
  assert.equal(result.row.operationId, 'old-op');
})();

console.log('P0-072 remote checkpoint writer monotonicity model: PASS');
