'use strict';

const assert = require('assert');

function makeState() {
  return {
    nextOperation: 1,
    admissions: new Map(),
    operations: new Map(),
    effectReceipts: new Map()
  };
}

function issueOperationId(state) {
  return `worker-op-${state.nextOperation++}`;
}

function admitMutation(state, request) {
  const clientRequestId = String(request.clientRequestId || '');
  const kind = String(request.kind || '');
  const subjectKey = String(request.subjectKey || '');
  const fingerprint = String(request.fingerprint || '');
  if (!clientRequestId || !kind || !subjectKey || !fingerprint) throw new Error('invalid admission request');

  const previous = state.admissions.get(clientRequestId);
  if (previous) {
    if (previous.kind !== kind || previous.subjectKey !== subjectKey || previous.fingerprint !== fingerprint) {
      const error = new Error('correlation mismatch');
      error.code = 'CORRELATION_MISMATCH';
      throw error;
    }
    return { ...previous, reused: true };
  }

  const operationId = issueOperationId(state);
  const receipt = {
    clientRequestId,
    operationId,
    kind,
    subjectKey,
    fingerprint,
    status: 'admitted',
    resultClass: 'unknown',
    admittedAt: 1
  };
  state.admissions.set(clientRequestId, receipt);
  state.operations.set(operationId, receipt);
  return { ...receipt, reused: false };
}

function beginEffect(state, operationId) {
  const receipt = state.operations.get(operationId);
  if (!receipt) throw new Error('unknown operation');
  receipt.status = 'running';
  receipt.resultClass = 'unknown';
}

function markEffectUnknown(state, operationId, externalReceipt = {}) {
  const receipt = state.operations.get(operationId);
  if (!receipt) throw new Error('unknown operation');
  receipt.status = 'settlement-unknown';
  receipt.resultClass = 'unknown';
  state.effectReceipts.set(operationId, { ...externalReceipt, settlement: 'unknown' });
}

function markSucceeded(state, operationId, result = {}) {
  const receipt = state.operations.get(operationId);
  if (!receipt) throw new Error('unknown operation');
  receipt.status = 'succeeded';
  receipt.resultClass = 'success';
  receipt.result = result;
}

function markFailedBeforeEffect(state, operationId, errorCode = 'PRECONDITION') {
  const receipt = state.operations.get(operationId);
  if (!receipt) throw new Error('unknown operation');
  receipt.status = 'failed';
  receipt.resultClass = 'failed-before-effect';
  receipt.errorCode = errorCode;
}

function reconcileByClientRequest(state, clientRequestId) {
  const receipt = state.admissions.get(String(clientRequestId || ''));
  if (!receipt) return { state: 'not-admitted' };
  return {
    state: receipt.status,
    operationId: receipt.operationId,
    kind: receipt.kind,
    subjectKey: receipt.subjectKey,
    resultClass: receipt.resultClass,
    result: receipt.result || null,
    effectReceipt: state.effectReceipts.get(receipt.operationId) || null
  };
}

function discoverOutstandingBySubject(state, kind, subjectKey) {
  return [...state.operations.values()]
    .filter((r) => r.kind === kind && r.subjectKey === subjectKey)
    .filter((r) => !['succeeded', 'failed'].includes(r.status))
    .map((r) => ({ operationId: r.operationId, clientRequestId: r.clientRequestId, status: r.status }));
}

function outerTransportRejected(ui, clientRequestId) {
  ui.transport = 'lost';
  ui.clientRequestId = clientRequestId;
  ui.operationState = 'unknown';
  ui.canBlindRetry = false;
  ui.message = 'result-unknown-reconcile';
}

function applyReconciliation(ui, generation, result) {
  if (generation !== ui.generation) return false;
  ui.operationState = result.state;
  ui.operationId = result.operationId || '';
  ui.resultClass = result.resultClass || '';
  ui.canBlindRetry = result.state === 'not-admitted' || result.resultClass === 'failed-before-effect';
  return true;
}

function newUiGeneration(previous = null) {
  return {
    generation: Number(previous?.generation || 0) + 1,
    transport: 'idle',
    operationState: 'idle',
    operationId: '',
    clientRequestId: '',
    resultClass: '',
    canBlindRetry: false,
    message: ''
  };
}

// 1. Current unsafe interpretation: lost outer response is not proof the worker did nothing.
{
  const state = makeState();
  const receipt = admitMutation(state, { clientRequestId: 'c1', kind: 'journal-delete', subjectKey: 'entry:1', fingerprint: 'fp:delete:1' });
  beginEffect(state, receipt.operationId);
  const ui = newUiGeneration();
  outerTransportRejected(ui, 'c1');
  assert.equal(ui.operationState, 'unknown');
  assert.equal(ui.canBlindRetry, false);
  assert.equal(state.operations.get(receipt.operationId).status, 'running');
}

// 2. Response may be lost after the effect already succeeded.
{
  const state = makeState();
  const receipt = admitMutation(state, { clientRequestId: 'c2', kind: 'journal-delete', subjectKey: 'entry:2', fingerprint: 'fp:delete:2' });
  beginEffect(state, receipt.operationId);
  markSucceeded(state, receipt.operationId, { deleted: true });
  const ui = newUiGeneration();
  outerTransportRejected(ui, 'c2');
  assert.equal(ui.operationState, 'unknown');
  const status = reconcileByClientRequest(state, 'c2');
  assert.equal(status.state, 'succeeded');
  applyReconciliation(ui, ui.generation, status);
  assert.equal(ui.operationState, 'succeeded');
  assert.equal(ui.canBlindRetry, false);
}

// 3. Same correlation + same immutable fingerprint returns the same worker-issued operation.
{
  const state = makeState();
  const a = admitMutation(state, { clientRequestId: 'same', kind: 'mark-read', subjectKey: 'entry:3', fingerprint: 'fp:move:3' });
  const b = admitMutation(state, { clientRequestId: 'same', kind: 'mark-read', subjectKey: 'entry:3', fingerprint: 'fp:move:3' });
  assert.equal(a.operationId, b.operationId);
  assert.equal(b.reused, true);
  assert.equal(state.operations.size, 1);
}

// 4. Same correlation with a different request is rejected rather than rebound.
{
  const state = makeState();
  admitMutation(state, { clientRequestId: 'c4', kind: 'journal-delete', subjectKey: 'entry:4', fingerprint: 'fp:a' });
  assert.throws(
    () => admitMutation(state, { clientRequestId: 'c4', kind: 'journal-delete', subjectKey: 'entry:4', fingerprint: 'fp:b' }),
    (error) => error.code === 'CORRELATION_MISMATCH'
  );
  assert.equal(state.operations.size, 1);
}

// 5. Caller correlation is not physical-operation authority: the worker always issues O.
{
  const state = makeState();
  const receipt = admitMutation(state, { clientRequestId: 'caller-text-op-999', kind: 'journal-delete', subjectKey: 'entry:5', fingerprint: 'fp:5' });
  assert.notEqual(receipt.operationId, 'caller-text-op-999');
  assert.match(receipt.operationId, /^worker-op-/);
}

// 6. Read-only reconciliation can prove not-admitted.
{
  const state = makeState();
  const ui = newUiGeneration();
  outerTransportRejected(ui, 'never-admitted');
  const status = reconcileByClientRequest(state, 'never-admitted');
  assert.equal(status.state, 'not-admitted');
  applyReconciliation(ui, ui.generation, status);
  assert.equal(ui.canBlindRetry, true);
}

// 7. Running means wait/reconcile, not start a fresh generation.
{
  const state = makeState();
  const receipt = admitMutation(state, { clientRequestId: 'c7', kind: 'backup', subjectKey: 'journal:rev7', fingerprint: 'fp:7' });
  beginEffect(state, receipt.operationId);
  const status = reconcileByClientRequest(state, 'c7');
  assert.equal(status.state, 'running');
  const ui = newUiGeneration();
  applyReconciliation(ui, ui.generation, status);
  assert.equal(ui.canBlindRetry, false);
}

// 8. Unknown external settlement stays unknown even if diagnostics later say an operation ended locally.
{
  const state = makeState();
  const receipt = admitMutation(state, { clientRequestId: 'c8', kind: 'remote-save', subjectKey: 'pdf:8', fingerprint: 'fp:8' });
  beginEffect(state, receipt.operationId);
  markEffectUnknown(state, receipt.operationId, { remotePathDigest: 'digest-8' });
  const status = reconcileByClientRequest(state, 'c8');
  assert.equal(status.state, 'settlement-unknown');
  assert.equal(status.effectReceipt.settlement, 'unknown');
}

// 9. Proven failed-before-effect may permit a fresh explicit user attempt.
{
  const state = makeState();
  const receipt = admitMutation(state, { clientRequestId: 'c9', kind: 'journal-delete', subjectKey: 'entry:9', fingerprint: 'fp:9' });
  markFailedBeforeEffect(state, receipt.operationId);
  const ui = newUiGeneration();
  applyReconciliation(ui, ui.generation, reconcileByClientRequest(state, 'c9'));
  assert.equal(ui.operationState, 'failed');
  assert.equal(ui.canBlindRetry, true);
}

// 10. Page reload can discover unresolved work by exact logical subject even if JS globals were lost.
{
  const state = makeState();
  const receipt = admitMutation(state, { clientRequestId: 'c10', kind: 'mark-read', subjectKey: 'entry:10', fingerprint: 'fp:10' });
  beginEffect(state, receipt.operationId);
  const discovered = discoverOutstandingBySubject(state, 'mark-read', 'entry:10');
  assert.deepEqual(discovered, [{ operationId: receipt.operationId, clientRequestId: 'c10', status: 'running' }]);
}

// 11. Subject discovery does not return unrelated operations.
{
  const state = makeState();
  const a = admitMutation(state, { clientRequestId: 'c11a', kind: 'mark-read', subjectKey: 'entry:11a', fingerprint: 'a' });
  const b = admitMutation(state, { clientRequestId: 'c11b', kind: 'mark-read', subjectKey: 'entry:11b', fingerprint: 'b' });
  beginEffect(state, a.operationId);
  beginEffect(state, b.operationId);
  assert.equal(discoverOutstandingBySubject(state, 'mark-read', 'entry:11a').length, 1);
}

// 12. A late reconciliation result from an old UI generation cannot overwrite the new UI generation.
{
  const state = makeState();
  const receipt = admitMutation(state, { clientRequestId: 'c12', kind: 'backup', subjectKey: 'journal:12', fingerprint: '12' });
  beginEffect(state, receipt.operationId);
  let ui = newUiGeneration();
  const oldGeneration = ui.generation;
  ui = newUiGeneration(ui);
  const late = reconcileByClientRequest(state, 'c12');
  assert.equal(applyReconciliation(ui, oldGeneration, late), false);
  assert.equal(ui.operationState, 'idle');
}

// 13. Reconciliation transport loss leaves state unknown and still forbids mutation replay.
{
  const ui = newUiGeneration();
  outerTransportRejected(ui, 'c13');
  // The read-only reconcile call itself also loses its response.
  ui.operationState = 'unknown';
  ui.message = 'reconciliation-transport-unknown';
  assert.equal(ui.canBlindRetry, false);
}

// 14. Terminal success removes the operation from unresolved subject discovery.
{
  const state = makeState();
  const receipt = admitMutation(state, { clientRequestId: 'c14', kind: 'journal-delete', subjectKey: 'entry:14', fingerprint: '14' });
  beginEffect(state, receipt.operationId);
  markSucceeded(state, receipt.operationId);
  assert.deepEqual(discoverOutstandingBySubject(state, 'journal-delete', 'entry:14'), []);
}

// 15. Two different client correlations may represent two explicit user attempts only after policy allows it.
{
  const state = makeState();
  const first = admitMutation(state, { clientRequestId: 'c15a', kind: 'journal-delete', subjectKey: 'entry:15', fingerprint: '15' });
  markFailedBeforeEffect(state, first.operationId);
  const proof = reconcileByClientRequest(state, 'c15a');
  assert.equal(proof.resultClass, 'failed-before-effect');
  const second = admitMutation(state, { clientRequestId: 'c15b', kind: 'journal-delete', subjectKey: 'entry:15', fingerprint: '15' });
  assert.notEqual(first.operationId, second.operationId);
}

// 16. A fresh correlation is NOT allowed merely because the outer response was lost.
{
  const state = makeState();
  const first = admitMutation(state, { clientRequestId: 'c16a', kind: 'journal-delete', subjectKey: 'entry:16', fingerprint: '16' });
  beginEffect(state, first.operationId);
  const ui = newUiGeneration();
  outerTransportRejected(ui, 'c16a');
  assert.equal(ui.canBlindRetry, false);
  assert.equal(discoverOutstandingBySubject(state, 'journal-delete', 'entry:16')[0].operationId, first.operationId);
}

// 17. External settlement identity survives outer-response loss.
{
  const state = makeState();
  const receipt = admitMutation(state, { clientRequestId: 'c17', kind: 'remote-save', subjectKey: 'pdf:17', fingerprint: '17' });
  beginEffect(state, receipt.operationId);
  markEffectUnknown(state, receipt.operationId, { remoteObjectGeneration: 'remote-gen-17' });
  const reconciled = reconcileByClientRequest(state, 'c17');
  assert.equal(reconciled.effectReceipt.remoteObjectGeneration, 'remote-gen-17');
}

// 18. Correlation fingerprints contain immutable identity, not mutable progress state.
{
  const state = makeState();
  const receipt = admitMutation(state, { clientRequestId: 'c18', kind: 'backup', subjectKey: 'journal:revision-18', fingerprint: 'sha256:immutable-18' });
  beginEffect(state, receipt.operationId);
  const again = admitMutation(state, { clientRequestId: 'c18', kind: 'backup', subjectKey: 'journal:revision-18', fingerprint: 'sha256:immutable-18' });
  assert.equal(again.operationId, receipt.operationId);
}

// 19. A mismatched operation kind cannot steal an existing correlation.
{
  const state = makeState();
  admitMutation(state, { clientRequestId: 'c19', kind: 'backup', subjectKey: 'journal:19', fingerprint: '19' });
  assert.throws(
    () => admitMutation(state, { clientRequestId: 'c19', kind: 'journal-delete', subjectKey: 'entry:19', fingerprint: '19' }),
    /correlation mismatch/
  );
}

// 20. OperationLog-like diagnostics are not substituted for settlement authority in the model.
{
  const state = makeState();
  const receipt = admitMutation(state, { clientRequestId: 'c20', kind: 'remote-save', subjectKey: 'pdf:20', fingerprint: '20' });
  beginEffect(state, receipt.operationId);
  markEffectUnknown(state, receipt.operationId, { remoteObjectGeneration: 'g20' });
  const operationLogDiagnostic = { operationId: receipt.operationId, status: 'error', summary: 'outer response lost' };
  const authoritative = reconcileByClientRequest(state, 'c20');
  assert.equal(operationLogDiagnostic.status, 'error');
  assert.equal(authoritative.state, 'settlement-unknown');
  assert.equal(authoritative.effectReceipt.remoteObjectGeneration, 'g20');
}

console.log('P1-210 lost outer response reconciliation model: PASS');
