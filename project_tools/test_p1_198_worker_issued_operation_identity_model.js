'use strict';

const assert = require('assert');

let nextPhysicalId = 0;

function issuePhysicalOperation(clientOperationId = '') {
  nextPhysicalId += 1;
  return {
    physicalOperationId: `physical:${nextPhysicalId}`,
    clientOperationId: String(clientOperationId || ''),
    live: true
  };
}

function naiveAdmit(clientOperationId) {
  return {
    physicalOperationId: String(clientOperationId || ''),
    clientOperationId: String(clientOperationId || ''),
    live: true
  };
}

function makeNaivePendingDownloadKey(clientOperationId) {
  return `pending-local-download:${String(clientOperationId || '')}`;
}

function makeTargetPendingDownloadKey(operation) {
  return `pending-local-download:${operation.physicalOperationId}`;
}

function samePhysicalOperation(a, b) {
  return Boolean(a && b && a.physicalOperationId === b.physicalOperationId);
}

function continueWithDomainReceipt(operation, receipt) {
  if (!operation?.live) return { ok: false, reason: 'not-live' };
  if (!receipt || receipt.physicalOperationId !== operation.physicalOperationId) {
    return { ok: false, reason: 'invalid-continuation-receipt' };
  }
  return { ok: true };
}

function restart(state) {
  return JSON.parse(JSON.stringify(state));
}

// 1. Current-shaped caller identity conflates two physically distinct requests.
{
  const first = naiveAdmit('same-client-id');
  const second = naiveAdmit('same-client-id');
  assert.equal(first.physicalOperationId, second.physicalOperationId);
  assert.equal(makeNaivePendingDownloadKey(first.clientOperationId), makeNaivePendingDownloadKey(second.clientOperationId));
}

// 2. Target admission always issues a fresh physical identity while preserving correlation metadata.
{
  const first = issuePhysicalOperation('same-client-id');
  const second = issuePhysicalOperation('same-client-id');
  assert.notEqual(first.physicalOperationId, second.physicalOperationId);
  assert.equal(first.clientOperationId, second.clientOperationId);
}

// 3. Pending local-download intent keys use physical identity, not caller correlation text.
{
  const first = issuePhysicalOperation('same-client-id');
  const second = issuePhysicalOperation('same-client-id');
  assert.notEqual(makeTargetPendingDownloadKey(first), makeTargetPendingDownloadKey(second));
}

// 4. Missing correlation metadata does not prevent worker-issued physical identity.
{
  const operation = issuePhysicalOperation('');
  assert.ok(operation.physicalOperationId.startsWith('physical:'));
  assert.equal(operation.clientOperationId, '');
}

// 5. An old client correlation id cannot claim ownership of an old physical instance after completion.
{
  const oldOperation = issuePhysicalOperation('reused');
  oldOperation.live = false;
  const replay = issuePhysicalOperation('reused');
  assert.notEqual(replay.physicalOperationId, oldOperation.physicalOperationId);
  assert.equal(replay.clientOperationId, oldOperation.clientOperationId);
}

// 6. Legitimate continuation uses a worker/domain-issued receipt rather than correlation equality.
{
  const operation = issuePhysicalOperation('ui-correlation');
  const receipt = {
    kind: 'staging-receipt',
    stagingId: 'staged-import:opaque',
    physicalOperationId: operation.physicalOperationId
  };
  assert.deepEqual(continueWithDomainReceipt(operation, receipt), { ok: true });
  assert.deepEqual(
    continueWithDomainReceipt(operation, { ...receipt, physicalOperationId: 'physical:other' }),
    { ok: false, reason: 'invalid-continuation-receipt' }
  );
}

// 7. Restart keeps durable physical identity in a pending receipt; caller correlation remains diagnostic only.
{
  const operation = issuePhysicalOperation('client-42');
  const durable = {
    physicalOperationId: operation.physicalOperationId,
    clientOperationId: operation.clientOperationId,
    effectReceipt: { state: 'unknown' }
  };
  const afterRestart = restart(durable);
  assert.equal(afterRestart.physicalOperationId, operation.physicalOperationId);
  assert.equal(afterRestart.clientOperationId, 'client-42');
  assert.equal(afterRestart.effectReceipt.state, 'unknown');
}

// 8. Two independent physical operations with the same client correlation are not the same operation.
{
  const first = issuePhysicalOperation('shared');
  const second = issuePhysicalOperation('shared');
  assert.equal(samePhysicalOperation(first, second), false);
  assert.equal(first.clientOperationId === second.clientOperationId, true);
}

// 9. A duplicate transport delivery may only deduplicate through an explicit domain idempotency receipt.
{
  const first = issuePhysicalOperation('transport-retry');
  const idempotencyReceipt = { requestKey: 'domain-request:123', physicalOperationId: first.physicalOperationId };
  const replayCorrelation = 'transport-retry';
  assert.equal(replayCorrelation, first.clientOperationId);
  assert.equal(idempotencyReceipt.physicalOperationId, first.physicalOperationId);
  // Correlation equality alone says nothing about whether this is a replay or a new request.
  const independent = issuePhysicalOperation(replayCorrelation);
  assert.notEqual(independent.physicalOperationId, idempotencyReceipt.physicalOperationId);
}

// 10. P1-197 composition: deleting an old physical instance must not prevent a fresh instance
// from using the same client correlation metadata.
{
  const deletionGeneration = new Map();
  const oldOperation = issuePhysicalOperation('same-client-id');
  deletionGeneration.set(oldOperation.physicalOperationId, 1);
  oldOperation.live = false;
  const freshOperation = issuePhysicalOperation('same-client-id');
  assert.equal(deletionGeneration.has(freshOperation.physicalOperationId), false);
  assert.notEqual(freshOperation.physicalOperationId, oldOperation.physicalOperationId);
}

// 11. A known or guessed textual client operation id is not an ownership capability.
{
  const owner = issuePhysicalOperation('public-correlation');
  const attackerOrStaleCaller = issuePhysicalOperation('public-correlation');
  assert.notEqual(owner.physicalOperationId, attackerOrStaleCaller.physicalOperationId);
  assert.equal(samePhysicalOperation(owner, attackerOrStaleCaller), false);
}

console.log('P1-198 worker-issued physical operation identity model: PASS');
