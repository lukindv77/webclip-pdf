'use strict';

const assert = require('node:assert/strict');

function normalizeScope(value) {
  if (!value || value.version !== 1) return null;
  const accountUid = String(value.accountUid || '').trim();
  const rootPath = String(value.rootPath || '').trim();
  if (!accountUid || accountUid.length > 1024) return null;
  if (!rootPath || rootPath.length > 4096 || !rootPath.startsWith('/')) return null;
  return Object.freeze({ version: 1, accountUid, rootPath });
}

function isPathWithinRoot(remotePath, rootPath) {
  const p = String(remotePath || '').replace(/\/+$/g, '');
  const root = String(rootPath || '').replace(/\/+$/g, '');
  return Boolean(root && p && (p === root || p.startsWith(`${root}/`)));
}

function classifyRecoveryAdmission(checkpoint, liveAuth) {
  const scope = normalizeScope(checkpoint?.yandexAccountRootScope);
  if (!scope) return { outcome: 'manual-missing-scope', remoteCall: false, consumeAttempt: false };
  if (!isPathWithinRoot(checkpoint.remotePath, scope.rootPath)) {
    return { outcome: 'manual-path-outside-scope', remoteCall: false, consumeAttempt: false };
  }
  if (!liveAuth || liveAuth.status !== 'available') {
    return { outcome: 'deferred-auth-unavailable', remoteCall: false, consumeAttempt: false };
  }
  if (liveAuth.accountUid !== scope.accountUid) {
    return { outcome: 'deferred-account-mismatch', remoteCall: false, consumeAttempt: false };
  }
  return {
    outcome: 'remote-reconcile-permitted',
    remoteCall: true,
    consumeAttempt: false,
    context: Object.freeze({ tokenRef: liveAuth.tokenRef, accountUid: scope.accountUid, rootPath: scope.rootPath })
  };
}

function reconcileFetchedMetadata(checkpoint, metadata) {
  const expectedResourceId = String(checkpoint.resourceId || '').trim();
  const actualResourceId = String(metadata?.resourceId || '').trim();
  if (expectedResourceId && expectedResourceId !== actualResourceId) return 'manual-resource-id-mismatch';
  if (Number(metadata?.size) !== Number(checkpoint.expectedPdfBytes)) return 'remote-size-mismatch';
  return 'factual-match-for-p0-073';
}

function decideExistingCheckpoint(existing, incoming) {
  if (!existing) return 'create';
  const oldScope = normalizeScope(existing.yandexAccountRootScope);
  const newScope = normalizeScope(incoming.yandexAccountRootScope);
  if (!oldScope || !newScope) return 'manual-context-conflict';
  const sameScope = oldScope.accountUid === newScope.accountUid && oldScope.rootPath === newScope.rootPath;
  const samePath = String(existing.remotePath || '') === String(incoming.remotePath || '');
  if (!sameScope || !samePath) return 'preserve-old-require-new-operation-generation';
  if (existing.phase === 'remote-verified') return 'preserve-verified';
  return 'same-scope-owner-policy';
}

(function crossAccountSamePathSameSizeCannotFalseVerify() {
  const cp = {
    yandexAccountRootScope: { version: 1, accountUid: 'A', rootPath: '/RA' },
    remotePath: '/RA/x.pdf', expectedPdfBytes: 100
  };
  const admission = classifyRecoveryAdmission(cp, { status: 'available', accountUid: 'B', tokenRef: 'token-B' });
  assert.equal(admission.outcome, 'deferred-account-mismatch');
  assert.equal(admission.remoteCall, false);
  assert.equal(admission.consumeAttempt, false);
})();

(function crossAccountMissingPathCannotFalse404OrAge() {
  const cp = {
    yandexAccountRootScope: { version: 1, accountUid: 'A', rootPath: '/RA' },
    remotePath: '/RA/missing-in-B.pdf', expectedPdfBytes: 100
  };
  const admission = classifyRecoveryAdmission(cp, { status: 'available', accountUid: 'B', tokenRef: 'token-B' });
  assert.equal(admission.remoteCall, false);
  assert.equal(admission.consumeAttempt, false);
})();

(function sameAccountChangedCurrentRootUsesStoredRoot() {
  const cp = {
    yandexAccountRootScope: { version: 1, accountUid: 'A', rootPath: '/RA' },
    remotePath: '/RA/x.pdf', expectedPdfBytes: 100
  };
  const admission = classifyRecoveryAdmission(cp, { status: 'available', accountUid: 'A', tokenRef: 'token-A', currentRootPath: '/RB' });
  assert.equal(admission.outcome, 'remote-reconcile-permitted');
  assert.equal(admission.context.rootPath, '/RA');
})();

(function remoteVerifiedNeedsNoNewRemoteAdmission() {
  const cp = { phase: 'remote-verified', yandexAccountRootScope: { version: 1, accountUid: 'A', rootPath: '/RA' } };
  const next = cp.phase === 'remote-verified' && normalizeScope(cp.yandexAccountRootScope)
    ? 'local-finalization-only'
    : 'manual';
  assert.equal(next, 'local-finalization-only');
})();

(function legacyMissingScopeFailsClosed() {
  const cp = { remotePath: '/RA/x.pdf', expectedPdfBytes: 100 };
  const result = classifyRecoveryAdmission(cp, { status: 'available', accountUid: 'A', tokenRef: 'token-A' });
  assert.equal(result.outcome, 'manual-missing-scope');
  assert.equal(result.remoteCall, false);
})();

(function expectedResourceIdMismatchBlocksVerificationAndPublish() {
  const cp = { resourceId: 'RID-A', expectedPdfBytes: 100 };
  assert.equal(reconcileFetchedMetadata(cp, { resourceId: 'RID-B', size: 100 }), 'manual-resource-id-mismatch');
  assert.equal(reconcileFetchedMetadata(cp, { resourceId: 'RID-A', size: 100 }), 'factual-match-for-p0-073');
})();

(function unresolvedCheckpointCannotBeReboundAcrossContext() {
  const old = {
    phase: 'prepared', remotePath: '/RA/x.pdf',
    yandexAccountRootScope: { version: 1, accountUid: 'A', rootPath: '/RA' }
  };
  const retryB = {
    phase: 'prepared', remotePath: '/RB/x.pdf',
    yandexAccountRootScope: { version: 1, accountUid: 'B', rootPath: '/RB' }
  };
  assert.equal(decideExistingCheckpoint(old, retryB), 'preserve-old-require-new-operation-generation');

  const staleOld = { ...old, phase: 'stale-unverified' };
  assert.equal(decideExistingCheckpoint(staleOld, retryB), 'preserve-old-require-new-operation-generation');
})();

(function verifiedEvidenceIsNeverRebound() {
  const old = {
    phase: 'remote-verified', remotePath: '/RA/x.pdf',
    yandexAccountRootScope: { version: 1, accountUid: 'A', rootPath: '/RA' }
  };
  const retrySame = {
    phase: 'prepared', remotePath: '/RA/x.pdf',
    yandexAccountRootScope: { version: 1, accountUid: 'A', rootPath: '/RA' }
  };
  assert.equal(decideExistingCheckpoint(old, retrySame), 'preserve-verified');
})();

(function liveAuthContextIsImmutableForOneRecoveryItem() {
  const cp = {
    yandexAccountRootScope: { version: 1, accountUid: 'A', rootPath: '/RA' },
    remotePath: '/RA/x.pdf', expectedPdfBytes: 100
  };
  const live = { status: 'available', accountUid: 'A', tokenRef: 'token-A' };
  const admitted = classifyRecoveryAdmission(cp, live);
  live.accountUid = 'B';
  live.tokenRef = 'token-B';
  assert.equal(admitted.context.accountUid, 'A');
  assert.equal(admitted.context.tokenRef, 'token-A');
})();

console.log('P0-073 Yandex account/root scope model: PASS');
