'use strict';
const assert = require('assert');

function currentStart(state, id, clientId) {
  state.pending = { id, clientId };
  state.configClientId = clientId;
}
function currentStartFailureCleanup(state) { state.pending = null; }

function beginAttempt(state, id, clientId) {
  state.generation += 1;
  state.pending = { id, clientId, generation: state.generation };
  return { ...state.pending };
}
function cleanupAttemptIfCurrent(state, receipt) {
  if (state.pending?.id !== receipt.id || state.pending?.generation !== receipt.generation) return false;
  state.pending = null;
  return true;
}
function finishAttemptIfCurrent(state, receipt, auth) {
  if (state.generation !== receipt.generation) return { outcome: 'stale-generation' };
  if (state.pending?.id !== receipt.id || state.pending?.generation !== receipt.generation) return { outcome: 'stale-attempt' };
  state.auth = auth;
  state.configClientId = receipt.clientId;
  state.pending = null;
  state.generation += 1;
  return { outcome: 'committed', generation: state.generation };
}
function manualCommit(state, auth) {
  state.generation += 1;
  state.auth = auth;
  state.pending = null;
}

{
  const s = { pending: null, configClientId: '', auth: null };
  currentStart(s, 'A', 'client-A');
  currentStart(s, 'B', 'client-B');
  currentStartFailureCleanup(s);
  assert.equal(s.pending, null);
  assert.equal(s.configClientId, 'client-B');
}

{
  const s = { generation: 0, pending: null, configClientId: '', auth: null };
  const a = beginAttempt(s, 'A', 'client-A');
  const b = beginAttempt(s, 'B', 'client-B');
  assert.equal(cleanupAttemptIfCurrent(s, a), false);
  assert.equal(s.pending.id, 'B');
  assert.equal(s.pending.generation, b.generation);
}

{
  const s = { generation: 0, pending: null, configClientId: '', auth: 'OLD' };
  const a = beginAttempt(s, 'A', 'client-A');
  beginAttempt(s, 'B', 'client-B');
  assert.equal(finishAttemptIfCurrent(s, a, 'AUTH-A').outcome, 'stale-generation');
  assert.equal(s.auth, 'OLD');
  assert.equal(s.configClientId, '');
}

{
  const s = { generation: 5, pending: null, configClientId: 'old-client', auth: 'AUTH-OLD' };
  const a = beginAttempt(s, 'A', 'client-A');
  manualCommit(s, 'AUTH-MANUAL');
  assert.equal(finishAttemptIfCurrent(s, a, 'AUTH-A').outcome, 'stale-generation');
  assert.equal(s.auth, 'AUTH-MANUAL');
}

{
  const s = { generation: 9, pending: null, configClientId: 'old-client', auth: 'AUTH-OLD' };
  const a = beginAttempt(s, 'A', 'client-A');
  const result = finishAttemptIfCurrent(s, a, 'AUTH-A');
  assert.equal(result.outcome, 'committed');
  assert.equal(s.auth, 'AUTH-A');
  assert.equal(s.configClientId, 'client-A');
  assert.equal(s.pending, null);
}

console.log('P1-178 auth attempt/settings generation model: PASS');
