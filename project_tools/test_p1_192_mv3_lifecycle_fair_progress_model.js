'use strict';
const assert = require('assert');

const PHASES = [
  'log-cleanup',
  'temporary-cleanup',
  'journal-recovery',
  'remote-recovery',
  'local-recovery',
  'stats-repair'
];

function freshMaintenanceState(work = {}) {
  const remaining = {};
  const visits = {};
  for (const phase of PHASES) {
    remaining[phase] = Math.max(0, Number(work[phase] ?? 1));
    visits[phase] = 0;
  }
  return { nextPhase: 0, remaining, visits };
}

// Current-shaped fixed pipeline: every wake starts at phase 0. The model's
// terminateAfterPhases parameter represents an MV3 shutdown before the later
// awaited phases are reached.
function currentFixedPipelineWake(state, terminateAfterPhases) {
  let completedThisWake = 0;
  for (const phase of PHASES) {
    if (completedThisWake >= terminateAfterPhases) return { terminated: true };
    state.visits[phase] += 1;
    if (state.remaining[phase] > 0) state.remaining[phase] -= 1;
    completedThisWake += 1;
  }
  return { terminated: false };
}

function cloneDurable(value) {
  return JSON.parse(JSON.stringify(value));
}

// Target maintenance coordinator: one bounded phase slice per wake, then the
// durable nextPhase cursor advances round-robin. A long phase cannot monopolize
// every future wake.
function targetFairWake(durableState) {
  const state = cloneDurable(durableState);
  const phaseIndex = state.nextPhase % PHASES.length;
  const phase = PHASES[phaseIndex];
  state.visits[phase] += 1;
  if (state.remaining[phase] > 0) state.remaining[phase] -= 1;
  state.nextPhase = (phaseIndex + 1) % PHASES.length;
  return { state, phase };
}

function freshBackupState() {
  return {
    schedulerGeneration: 7,
    mode: 'active',
    workflow: { phase: 'stage', stageCursor: 0 },
    pendingEffect: null,
    uploadStarts: 0,
    reconciliations: 0,
    lease: null
  };
}

function admitSignedUpload(state, effectId) {
  assert.equal(state.mode, 'active');
  assert.equal(state.pendingEffect, null);
  // Receipt is durable before the non-cancellable/unknown external effect.
  state.pendingEffect = { effectId, phase: 'prepared', outcome: 'unknown' };
  state.uploadStarts += 1;
  state.lease = { token: `lease-${effectId}`, expired: false };
}

function expireLease(state) {
  if (state.lease) state.lease.expired = true;
}

function targetBackupWake(state, scheduledGeneration) {
  if (scheduledGeneration !== state.schedulerGeneration) {
    return { action: 'stale-generation', remoteStarts: 0 };
  }
  if (state.mode !== 'active') {
    return { action: 'paused', remoteStarts: 0 };
  }
  if (state.pendingEffect?.outcome === 'unknown') {
    state.reconciliations += 1;
    return { action: 'reconcile-pending-effect', remoteStarts: 0 };
  }
  return { action: 'continue-workflow', remoteStarts: 0 };
}

// Current fixed ordering can starve every later phase forever if the worker is
// repeatedly terminated after the first two phases.
{
  const state = freshMaintenanceState({
    'log-cleanup': 1000,
    'temporary-cleanup': 1000,
    'journal-recovery': 1,
    'remote-recovery': 1,
    'local-recovery': 1,
    'stats-repair': 1
  });
  for (let wake = 0; wake < 20; wake += 1) {
    currentFixedPipelineWake(state, 2);
  }
  assert.equal(state.visits['journal-recovery'], 0);
  assert.equal(state.visits['remote-recovery'], 0);
  assert.equal(state.visits['local-recovery'], 0);
  assert.equal(state.visits['stats-repair'], 0);
}

// Durable round-robin cursor guarantees every phase gets bounded progress even
// when early phases remain very large. Rehydrate after every wake to prove the
// result does not depend on worker globals.
{
  let state = freshMaintenanceState({
    'log-cleanup': 1000,
    'temporary-cleanup': 1000,
    'journal-recovery': 1000,
    'remote-recovery': 1000,
    'local-recovery': 1000,
    'stats-repair': 1000
  });
  const seen = [];
  for (let wake = 0; wake < PHASES.length * 3; wake += 1) {
    const result = targetFairWake(state);
    state = cloneDurable(result.state);
    seen.push(result.phase);
  }
  for (const phase of PHASES) {
    assert.equal(state.visits[phase], 3, `${phase} did not receive fair progress`);
  }
  assert.deepEqual(seen.slice(0, PHASES.length), PHASES);
}

// Unknown signed effect survives worker/lease loss. Lease expiry is execution
// ownership loss, not evidence that the external effect was cancelled.
{
  const state = freshBackupState();
  admitSignedUpload(state, 'upload-A');
  const durableAfterAdmission = cloneDurable(state);
  expireLease(durableAfterAdmission);
  const restarted = cloneDurable(durableAfterAdmission);
  const result = targetBackupWake(restarted, 7);
  assert.equal(result.action, 'reconcile-pending-effect');
  assert.equal(result.remoteStarts, 0);
  assert.equal(restarted.uploadStarts, 1);
  assert.equal(restarted.pendingEffect.effectId, 'upload-A');
  assert.equal(restarted.pendingEffect.outcome, 'unknown');
}

// A pause/generation change invalidates stale alarm admission but preserves the
// external-effect receipt for P1-179/P1-184 reconciliation.
{
  const state = freshBackupState();
  admitSignedUpload(state, 'upload-B');
  state.schedulerGeneration += 1;
  state.mode = 'paused-no-auth';
  const stale = targetBackupWake(state, 7);
  assert.equal(stale.action, 'stale-generation');
  assert.equal(stale.remoteStarts, 0);
  assert.equal(state.pendingEffect.effectId, 'upload-B');
  const current = targetBackupWake(state, 8);
  assert.equal(current.action, 'paused');
  assert.equal(current.remoteStarts, 0);
  assert.equal(state.pendingEffect.effectId, 'upload-B');
}

console.log('P1-192 MV3 lifecycle/fair progress model: PASS');
