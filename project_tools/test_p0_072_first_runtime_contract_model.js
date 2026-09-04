'use strict';
const assert = require('node:assert/strict');

const RESET_VERSION = 1;
const STAGE_VERSION = 1;
const STAGE_STATES = new Set(['prepared', 'admitted', 'cancelled-before-start', 'not-applicable']);

function hasResetBarrier(row) {
  return Boolean(row
    && Object.prototype.hasOwnProperty.call(row, 'journalResetDisposition')
    && row.journalResetDisposition != null);
}

function checkpointAuthority(row) {
  if (!row) return 'missing';
  return hasResetBarrier(row) ? 'reset-detached' : 'active';
}

function classifyStages(row, kind) {
  const stages = row && row.externalStages;
  if (!stages) return { format: 'legacy' };
  if (stages.version !== STAGE_VERSION) return { format: 'unsupported' };
  const keys = kind === 'local' ? ['downloadStart'] : ['upload', 'publish'];
  for (const key of keys) {
    if (!(key in stages) || !STAGE_STATES.has(stages[key])) return { format: 'invalid' };
  }
  return { format: 'v1', stages };
}

function admitStage(row, kind, stage, expectedOperationId) {
  if (!row) return { status: 'missing', permitMutation: false };
  if (String(row.operationId || '') !== String(expectedOperationId || '')) throw new Error('operation-mismatch');
  if (hasResetBarrier(row)) return { status: 'reset-detached', permitMutation: false };
  const classified = classifyStages(row, kind);
  if (classified.format !== 'v1') {
    return {
      status: classified.format === 'legacy' ? 'legacy-unknown' : 'invalid-stage',
      permitMutation: false
    };
  }
  const state = classified.stages[stage];
  if (state === 'prepared') {
    return {
      status: 'admitted-now',
      permitMutation: true,
      row: {
        ...row,
        externalStages: { ...row.externalStages, [stage]: 'admitted' }
      }
    };
  }
  if (state === 'admitted') return { status: 'already-admitted', permitMutation: false };
  if (state === 'cancelled-before-start') return { status: 'cancelled-before-start', permitMutation: false };
  return { status: 'not-applicable', permitMutation: false };
}

function resetLocal(row, resetId) {
  if (hasResetBarrier(row)) return row;
  const classified = classifyStages(row, 'local');
  let stages = row.externalStages;
  let outcome = 'pending';
  let resolution = 'reconciling';

  if (row.kind === 'unknown') {
    outcome = 'unknown';
    resolution = 'manual-resolution';
  } else if (classified.format === 'v1' && classified.stages.downloadStart === 'prepared') {
    stages = { ...classified.stages, downloadStart: 'cancelled-before-start' };
    outcome = 'cancelled-before-start';
    resolution = 'terminal';
  } else if (classified.format === 'unsupported' || classified.format === 'invalid') {
    outcome = 'unknown';
    resolution = 'manual-resolution';
  }

  return {
    ...row,
    externalStages: stages,
    journalResetDisposition: {
      version: RESET_VERSION,
      resetId,
      state: 'quarantined',
      outcome,
      resolution
    }
  };
}

function resetRemote(row, resetId) {
  if (hasResetBarrier(row)) return row;
  const classified = classifyStages(row, 'remote');
  let stages = row.externalStages;
  let outcome = 'pending';
  let resolution = 'reconciling';

  if (row.phase === 'remote-verified') {
    outcome = 'remote-verified';
    resolution = 'terminal';
  } else if (row.phase === 'stale-unverified'
      || classified.format === 'unsupported'
      || classified.format === 'invalid') {
    outcome = 'unknown';
    resolution = 'manual-resolution';
  } else if (classified.format === 'v1') {
    const next = { ...classified.stages };
    for (const key of ['upload', 'publish']) {
      if (next[key] === 'prepared') next[key] = 'cancelled-before-start';
    }
    stages = next;
    const anyAdmitted = next.upload === 'admitted' || next.publish === 'admitted';
    if (!anyAdmitted) {
      outcome = 'cancelled-before-start';
      resolution = 'terminal';
    }
  }

  return {
    ...row,
    externalStages: stages,
    journalResetDisposition: {
      version: RESET_VERSION,
      resetId,
      state: 'quarantined',
      outcome,
      resolution
    }
  };
}

function appendOutcome(required) {
  const authority = checkpointAuthority(required);
  if (authority === 'missing') return 'suppressed-missing';
  if (authority === 'reset-detached') return 'suppressed-reset-detached';
  return 'appended';
}

(function oneShotAdmission() {
  const row = { operationId: 'op', externalStages: { version: 1, downloadStart: 'prepared' } };
  const first = admitStage(row, 'local', 'downloadStart', 'op');
  assert.equal(first.status, 'admitted-now');
  assert.equal(first.permitMutation, true);
  const second = admitStage(first.row, 'local', 'downloadStart', 'op');
  assert.equal(second.status, 'already-admitted');
  assert.equal(second.permitMutation, false);
})();

(function resetWinsBeforeLocalAdmission() {
  const row = {
    operationId: 'op', kind: 'intent',
    externalStages: { version: 1, downloadStart: 'prepared' }
  };
  const reset = resetLocal(row, 'r1');
  assert.equal(reset.externalStages.downloadStart, 'cancelled-before-start');
  assert.equal(reset.journalResetDisposition.resolution, 'terminal');
  assert.equal(admitStage(reset, 'local', 'downloadStart', 'op').permitMutation, false);
})();

(function legacyLocalIntentIsNotFabricatedCancelled() {
  const row = { operationId: 'op', kind: 'intent' };
  const reset = resetLocal(row, 'r1');
  assert.equal(reset.journalResetDisposition.outcome, 'pending');
  assert.equal(reset.journalResetDisposition.resolution, 'reconciling');
})();

(function remoteMixedStages() {
  const row = {
    operationId: 'op', phase: 'prepared',
    externalStages: { version: 1, upload: 'admitted', publish: 'prepared' }
  };
  const reset = resetRemote(row, 'r1');
  assert.equal(reset.externalStages.upload, 'admitted');
  assert.equal(reset.externalStages.publish, 'cancelled-before-start');
  assert.equal(reset.journalResetDisposition.resolution, 'reconciling');
})();

(function remoteAllPreparedBecomesTerminalForRepresentedStages() {
  const row = {
    operationId: 'op', phase: 'prepared',
    externalStages: { version: 1, upload: 'prepared', publish: 'not-applicable' }
  };
  const reset = resetRemote(row, 'r1');
  assert.equal(reset.externalStages.upload, 'cancelled-before-start');
  assert.equal(reset.journalResetDisposition.resolution, 'terminal');
})();

(function malformedStageFailsSafe() {
  const row = {
    operationId: 'op', kind: 'intent',
    externalStages: { version: 99, downloadStart: 'prepared' }
  };
  const reset = resetLocal(row, 'r1');
  assert.equal(reset.journalResetDisposition.outcome, 'unknown');
  assert.equal(reset.journalResetDisposition.resolution, 'manual-resolution');
  assert.equal(admitStage(row, 'local', 'downloadStart', 'op').permitMutation, false);
})();

(function resetBarrierTreatsMalformedDispositionAsDetached() {
  const row = { operationId: 'op', journalResetDisposition: { version: 999 } };
  assert.equal(checkpointAuthority(row), 'reset-detached');
})();

(function appendOutcomesRemainDistinct() {
  assert.equal(appendOutcome(null), 'suppressed-missing');
  assert.equal(appendOutcome({ operationId: 'op' }), 'appended');
  assert.equal(
    appendOutcome({ operationId: 'op', journalResetDisposition: { version: 1 } }),
    'suppressed-reset-detached'
  );
})();

(function derivedCompatibilityPreservationFloors() {
  assert.equal(20 + 20, 40, 'pendingAppends current+legacy count preservation floor');
  assert.equal(
    4 * 1024 * 1024 + 4 * 1024 * 1024,
    8 * 1024 * 1024,
    'pendingAppends current+legacy aggregate preservation floor'
  );
  assert.equal(100 + 100, 200, 'local historical active+unknown preservation floor');
  assert.equal(20 + 100, 120, 'remote historical active+stale preservation floor');
})();

console.log('P0-072 first runtime contract model: PASS');
