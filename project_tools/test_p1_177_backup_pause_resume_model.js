'use strict';
const assert = require('assert');

function currentNoAuthRun(state) {
  state.lastFailureAt += 1;
  state.retryScheduled = true;
  return 'ordinary-failure';
}

function disconnect(state) {
  state.generation += 1;
  state.mode = 'paused-no-auth';
  state.auth = null;
  state.nextAlarmGeneration = state.generation;
}
function resume(state, auth, namespace) {
  state.generation += 1;
  state.mode = 'active';
  state.auth = auth;
  state.namespace = namespace;
  state.nextAlarmGeneration = state.generation;
}
function alarmRun(state, alarmGeneration) {
  if (alarmGeneration !== state.generation) return { outcome: 'stale-alarm', startRemote: false };
  if (state.mode !== 'active' || !state.auth) return { outcome: 'paused-no-auth', startRemote: false };
  return { outcome: 'admitted', startRemote: true };
}

{
  const s = { lastFailureAt: 0, retryScheduled: false };
  assert.equal(currentNoAuthRun(s), 'ordinary-failure');
  assert.equal(s.retryScheduled, true);
  assert.equal(s.lastFailureAt, 1);
}

{
  const s = { generation: 3, mode: 'active', auth: 'A', nextAlarmGeneration: 3 };
  disconnect(s);
  const r = alarmRun(s, s.generation);
  assert.equal(r.outcome, 'paused-no-auth');
  assert.equal(r.startRemote, false);
}

{
  const s = { generation: 7, mode: 'active', auth: 'A', nextAlarmGeneration: 7 };
  const staleAlarmGeneration = s.generation;
  disconnect(s);
  assert.equal(alarmRun(s, staleAlarmGeneration).outcome, 'stale-alarm');
}

{
  const s = { generation: 2, mode: 'active', auth: 'A', namespace: 'A/RA' };
  disconnect(s);
  const pausedGeneration = s.generation;
  resume(s, 'B', 'B/RB');
  assert.equal(alarmRun(s, pausedGeneration).outcome, 'stale-alarm');
  assert.equal(alarmRun(s, s.generation).outcome, 'admitted');
}

{
  const s = { generation: 1, mode: 'active', auth: 'A', pendingSigned: { namespace: 'A/RA', phase: 'mutation-unknown' } };
  disconnect(s);
  assert.deepEqual(s.pendingSigned, { namespace: 'A/RA', phase: 'mutation-unknown' });
}

console.log('P1-177 backup pause/resume generation model: PASS');
