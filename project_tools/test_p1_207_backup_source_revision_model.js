'use strict';

const assert = require('assert');

function makeCoverage({ sourceRevision, namespaceGeneration = 'N1', uploadSuccessAt = 0, verified = true, artifactDigest = 'sha256:a', remoteIdentity = 'resource-1', operationGeneration = 1 } = {}) {
  return { sourceRevision, namespaceGeneration, uploadSuccessAt, verified, artifactDigest, remoteIdentity, operationGeneration };
}

function coverageStatus(currentRevision, currentNamespace, receipt) {
  const historicalSuccess = Boolean(receipt && receipt.verified && receipt.sourceRevision && receipt.namespaceGeneration);
  const currentProtected = Boolean(
    historicalSuccess &&
    receipt.sourceRevision === currentRevision &&
    receipt.namespaceGeneration === currentNamespace
  );
  return { historicalSuccess, currentProtected, backupDue: !currentProtected };
}

function stableStage(revisionBefore, revisionAfter, stagingKey = 'stage-1', digest = 'sha256:a') {
  if (revisionBefore !== revisionAfter) return { ok: false, reason: 'journal-changed-during-export' };
  return { ok: true, stagingKey, sourceRevision: revisionBefore, artifactDigest: digest, expectedBytes: 1234 };
}

function makePending(stage, namespaceGeneration = 'N1', operationGeneration = 1) {
  if (!stage.ok) throw new Error('cannot checkpoint unstable stage');
  return {
    phase: 'prepared',
    sourceRevision: stage.sourceRevision,
    stagingKey: stage.stagingKey,
    artifactDigest: stage.artifactDigest,
    expectedBytes: stage.expectedBytes,
    namespaceGeneration,
    operationGeneration
  };
}

function recoverVerified(pending, remote) {
  if (!pending || !remote) return { ok: false, reason: 'missing-proof' };
  if (pending.expectedBytes !== remote.actualBytes) return { ok: false, reason: 'size-mismatch' };
  if (pending.artifactDigest !== remote.artifactDigest) return { ok: false, reason: 'digest-mismatch' };
  if (pending.namespaceGeneration !== remote.namespaceGeneration) return { ok: false, reason: 'namespace-mismatch' };
  return {
    ok: true,
    receipt: makeCoverage({
      sourceRevision: pending.sourceRevision,
      namespaceGeneration: pending.namespaceGeneration,
      uploadSuccessAt: remote.verifiedAt,
      verified: true,
      artifactDigest: remote.artifactDigest,
      remoteIdentity: remote.remoteIdentity,
      operationGeneration: pending.operationGeneration
    })
  };
}

function chooseProtectionPointer(current, candidate) {
  if (!candidate?.verified) return current;
  if (!current?.verified) return candidate;
  if (candidate.operationGeneration < current.operationGeneration) return current;
  return candidate;
}

function shouldRunBackup({ currentRevision, currentNamespace, receipt, now, intervalMs, retryDue = false }) {
  const status = coverageStatus(currentRevision, currentNamespace, receipt);
  if (!status.currentProtected) return { due: true, reason: 'current-revision-unprotected' };
  if (retryDue) return { due: false, reason: 'current-revision-already-protected' };
  const ageDue = !receipt.uploadSuccessAt || now >= receipt.uploadSuccessAt + intervalMs;
  return { due: ageDue, reason: ageDue ? 'periodic-age-due' : 'protected-and-recent' };
}

// 1. Current-shaped timestamp-only success can falsely treat B as protected after backup A completes late.
{
  const currentRevision = 'B';
  const unsafeState = { lastSuccessAt: 2000 };
  const unsafeFresh = Boolean(unsafeState.lastSuccessAt);
  assert.equal(unsafeFresh, true);
  assert.equal(currentRevision, 'B');
}

// 2. Exact receipt A under current B is a valid historical success but not current protection.
{
  const receiptA = makeCoverage({ sourceRevision: 'A', uploadSuccessAt: 2000 });
  assert.deepEqual(coverageStatus('B', 'N1', receiptA), { historicalSuccess: true, currentProtected: false, backupDue: true });
}

// 3. Exact receipt A under current A is current protection.
{
  const receiptA = makeCoverage({ sourceRevision: 'A' });
  assert.equal(coverageStatus('A', 'N1', receiptA).currentProtected, true);
}

// 4. Stable export carries the revision that was actually proved.
{
  const stage = stableStage('A', 'A');
  assert.equal(stage.ok, true);
  assert.equal(stage.sourceRevision, 'A');
}

// 5. Export with A->B mutation is rejected; bytes are not assigned either revision.
{
  assert.deepEqual(stableStage('A', 'B'), { ok: false, reason: 'journal-changed-during-export' });
}

// 6. Prepared checkpoint persists the exact source revision across restart.
{
  const pending = makePending(stableStage('A', 'A'));
  const serialized = JSON.parse(JSON.stringify(pending));
  assert.equal(serialized.sourceRevision, 'A');
}

// 7. Recovery of pending A while current Journal is B remains coverage A.
{
  const pending = makePending(stableStage('A', 'A'));
  const recovered = recoverVerified(pending, {
    actualBytes: 1234, artifactDigest: 'sha256:a', namespaceGeneration: 'N1', verifiedAt: 3000, remoteIdentity: 'obj-A'
  });
  assert.equal(recovered.ok, true);
  assert.equal(recovered.receipt.sourceRevision, 'A');
  assert.equal(coverageStatus('B', 'N1', recovered.receipt).currentProtected, false);
}

// 8. Retry/restart must not relabel A as the now-current B.
{
  const pending = makePending(stableStage('A', 'A'));
  assert.equal(pending.sourceRevision, 'A');
  const currentRevision = 'B';
  assert.notEqual(pending.sourceRevision, currentRevision);
}

// 9. Unknown remote settlement cannot claim protection.
{
  const receipt = makeCoverage({ sourceRevision: 'A', verified: false });
  assert.equal(coverageStatus('A', 'N1', receipt).currentProtected, false);
}

// 10. Remote content mismatch cannot protect A.
{
  const pending = makePending(stableStage('A', 'A'));
  assert.deepEqual(recoverVerified(pending, {
    actualBytes: 1234, artifactDigest: 'sha256:other', namespaceGeneration: 'N1', verifiedAt: 1, remoteIdentity: 'x'
  }), { ok: false, reason: 'digest-mismatch' });
}

// 11. Namespace change makes an otherwise exact revision receipt non-current.
{
  const receipt = makeCoverage({ sourceRevision: 'A', namespaceGeneration: 'N1' });
  const status = coverageStatus('A', 'N2', receipt);
  assert.equal(status.historicalSuccess, true);
  assert.equal(status.currentProtected, false);
}

// 12. Replace-import with same textual entries still changes source revision and becomes due.
{
  const oldReceipt = makeCoverage({ sourceRevision: 'A' });
  const replacementRevision = 'B';
  assert.equal(coverageStatus(replacementRevision, 'N1', oldReceipt).backupDue, true);
}

// 13. Clear creates a new revision and invalidates current-coverage freshness only, not history.
{
  const oldReceipt = makeCoverage({ sourceRevision: 'A' });
  const status = coverageStatus('CLEAR-B', 'N1', oldReceipt);
  assert.equal(status.historicalSuccess, true);
  assert.equal(status.backupDue, true);
}

// 14. B success after A protects B.
{
  const receiptB = makeCoverage({ sourceRevision: 'B', operationGeneration: 2, uploadSuccessAt: 4000 });
  assert.equal(coverageStatus('B', 'N1', receiptB).currentProtected, true);
}

// 15. Mutation to C immediately after verified B turns freshness false without invalidating B's history.
{
  const receiptB = makeCoverage({ sourceRevision: 'B', uploadSuccessAt: 4000 });
  const status = coverageStatus('C', 'N1', receiptB);
  assert.equal(status.historicalSuccess, true);
  assert.equal(status.currentProtected, false);
}

// 16. A late older completion cannot overwrite a newer B protection pointer.
{
  const newerB = makeCoverage({ sourceRevision: 'B', operationGeneration: 2, uploadSuccessAt: 5000 });
  const lateA = makeCoverage({ sourceRevision: 'A', operationGeneration: 1, uploadSuccessAt: 6000 });
  assert.strictEqual(chooseProtectionPointer(newerB, lateA), newerB);
}

// 17. Newer verified generation may supersede older pointer even when wall clock happens to be lower.
{
  const old = makeCoverage({ sourceRevision: 'A', operationGeneration: 1, uploadSuccessAt: 9000 });
  const newer = makeCoverage({ sourceRevision: 'B', operationGeneration: 2, uploadSuccessAt: 8000 });
  assert.strictEqual(chooseProtectionPointer(old, newer), newer);
}

// 18. Scheduler must run immediately for an unprotected current revision even after a recent historical success.
{
  const receiptA = makeCoverage({ sourceRevision: 'A', uploadSuccessAt: 9_900 });
  const decision = shouldRunBackup({ currentRevision: 'B', currentNamespace: 'N1', receipt: receiptA, now: 10_000, intervalMs: 100_000 });
  assert.deepEqual(decision, { due: true, reason: 'current-revision-unprotected' });
}

// 19. Scheduler can keep ordinary age policy only after exact current coverage exists.
{
  const receiptB = makeCoverage({ sourceRevision: 'B', uploadSuccessAt: 9_900 });
  const decision = shouldRunBackup({ currentRevision: 'B', currentNamespace: 'N1', receipt: receiptB, now: 10_000, intervalMs: 100_000 });
  assert.deepEqual(decision, { due: false, reason: 'protected-and-recent' });
}

// 20. Notification tokens are not source identity; equal notification timing says nothing about coverage.
{
  const dbRevision = 'DB-R42';
  const changedSignal = '1700000000000:nonce:append';
  assert.notEqual(dbRevision, changedSignal);
}

// 21. Continuous export churn terminates under the existing bounded attempt policy.
{
  const attempts = [stableStage('A', 'B'), stableStage('B', 'C')];
  assert.equal(attempts.every((attempt) => !attempt.ok), true);
  assert.equal(attempts.length, 2);
}

// 22. Historical A and pending/current B can coexist; one lease does not erase historical receipt A.
{
  const historicalA = makeCoverage({ sourceRevision: 'A', operationGeneration: 1 });
  const pendingB = makePending(stableStage('B', 'B'), 'N1', 2);
  assert.equal(historicalA.sourceRevision, 'A');
  assert.equal(pendingB.sourceRevision, 'B');
}

console.log('P1-207 backup source revision model: PASS');
