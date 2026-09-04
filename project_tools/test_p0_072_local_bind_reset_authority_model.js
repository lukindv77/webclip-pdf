'use strict';

const assert = require('node:assert/strict');

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function resetId(row) { return String(row?.journalResetDisposition?.resetId || ''); }
function downloadStage(row) {
  return Number(row?.externalStages?.version || 0) === 1
    ? String(row.externalStages.downloadStart || '')
    : '';
}

function bind(rows, intentKey, downloadId) {
  const current = clone(rows);
  const intent = current[intentKey];
  if (!intent) return { rows: current, status: 'missing-intent' };

  const stage = downloadStage(intent);
  if (stage === 'cancelled-before-start' || stage === 'prepared' || stage === 'not-applicable') {
    return { rows: current, status: 'not-bindable-stage' };
  }

  const existing = current[downloadId];
  if (existing) {
    if (!String(existing.operationId || '') || String(existing.operationId || '') !== String(intent.operationId || '')) {
      return { rows: current, status: 'identity-conflict' };
    }
    const sourceReset = resetId(intent);
    const targetReset = resetId(existing);
    if (sourceReset && targetReset && sourceReset !== targetReset) {
      return { rows: current, status: 'reset-conflict' };
    }

    const merged = { ...existing };
    if (sourceReset && !targetReset) merged.journalResetDisposition = clone(intent.journalResetDisposition);
    if (stage === 'admitted') merged.externalStages = clone(intent.externalStages);
    current[downloadId] = merged;
    delete current[intentKey];
    return { rows: current, status: 'existing-merged' };
  }

  current[downloadId] = { ...intent, downloadId, kind: 'download' };
  delete current[intentKey];
  return { rows: current, status: 'bound' };
}

(function detachedAdmittedIntentMayBindFactually() {
  const rows = {
    'intent:op': {
      operationId: 'op', kind: 'intent',
      externalStages: { version: 1, downloadStart: 'admitted' },
      journalResetDisposition: { version: 1, resetId: 'reset-1', resolution: 'reconciling' }
    }
  };
  const result = bind(rows, 'intent:op', 77);
  assert.equal(result.status, 'bound');
  assert.equal(resetId(result.rows[77]), 'reset-1');
  assert.equal(downloadStage(result.rows[77]), 'admitted');
  assert.equal(result.rows['intent:op'], undefined);
})();

(function cancelledBeforeStartCannotAcquireNumericIdentity() {
  const rows = {
    'intent:op': {
      operationId: 'op', kind: 'intent',
      externalStages: { version: 1, downloadStart: 'cancelled-before-start' },
      journalResetDisposition: { version: 1, resetId: 'reset-2', resolution: 'terminal' }
    }
  };
  const result = bind(rows, 'intent:op', 77);
  assert.equal(result.status, 'not-bindable-stage');
  assert.ok(result.rows['intent:op']);
  assert.equal(result.rows[77], undefined);
})();

(function sameOperationExistingNumericMustInheritResetBarrierBeforeIntentDelete() {
  const rows = {
    'intent:op': {
      operationId: 'op', kind: 'intent',
      externalStages: { version: 1, downloadStart: 'admitted' },
      journalResetDisposition: { version: 1, resetId: 'reset-3', resolution: 'reconciling' }
    },
    77: { operationId: 'op', kind: 'download' }
  };
  const result = bind(rows, 'intent:op', 77);
  assert.equal(result.status, 'existing-merged');
  assert.equal(resetId(result.rows[77]), 'reset-3');
  assert.equal(downloadStage(result.rows[77]), 'admitted');
  assert.equal(result.rows['intent:op'], undefined);
})();

(function conflictingResetIdentitiesAreNotCollapsed() {
  const rows = {
    'intent:op': {
      operationId: 'op', kind: 'intent',
      journalResetDisposition: { version: 1, resetId: 'reset-a' }
    },
    77: {
      operationId: 'op', kind: 'download',
      journalResetDisposition: { version: 1, resetId: 'reset-b' }
    }
  };
  const result = bind(rows, 'intent:op', 77);
  assert.equal(result.status, 'reset-conflict');
  assert.ok(result.rows['intent:op']);
  assert.ok(result.rows[77]);
})();

(function legacyMissingStageRemainsLateBindable() {
  const rows = { 'intent:legacy': { operationId: 'legacy-op', kind: 'intent' } };
  const result = bind(rows, 'intent:legacy', 88);
  assert.equal(result.status, 'bound');
  assert.equal(result.rows[88].operationId, 'legacy-op');
})();

console.log('P0-072 local bind reset-authority model: PASS');
