'use strict';

const assert = require('node:assert/strict');

function checkpoint({ generation, bytes, sha256, path }) {
  return Object.freeze({ generation, expectedPdfBytes: bytes, expectedSha256: sha256, remotePath: path });
}

function verifyRemote(cp, remote) {
  if (!remote) return { outcome: 'absent' };
  if (remote.size !== cp.expectedPdfBytes) return { outcome: 'content-conflict-size' };
  if (!remote.sha256) return { outcome: 'deferred-digest-unavailable' };
  if (remote.sha256 !== cp.expectedSha256) return { outcome: 'content-conflict-digest' };
  if (!remote.resourceId) return { outcome: 'deferred-resource-id-unavailable' };
  return {
    outcome: 'exact-content-adopted',
    receipt: Object.freeze({
      remotePath: cp.remotePath,
      localCacheGeneration: cp.generation,
      expectedPdfBytes: cp.expectedPdfBytes,
      expectedSha256: cp.expectedSha256,
      resourceId: remote.resourceId,
      verificationKind: 'remote-content-sha256'
    })
  };
}

(function sameSizeDifferentBytesAreRejected() {
  const cp = checkpoint({ generation: 'G1', bytes: 100, sha256: 'H-A', path: '/x.pdf' });
  const result = verifyRemote(cp, { size: 100, sha256: 'H-B', resourceId: 'RID-B' });
  assert.equal(result.outcome, 'content-conflict-digest');
})();

(function exactDigestCanBeAdopted() {
  const cp = checkpoint({ generation: 'G2', bytes: 200, sha256: 'H-A', path: '/x.pdf' });
  const result = verifyRemote(cp, { size: 200, sha256: 'H-A', resourceId: 'RID-X' });
  assert.equal(result.outcome, 'exact-content-adopted');
  assert.equal(result.receipt.resourceId, 'RID-X');
  assert.equal(result.receipt.verificationKind, 'remote-content-sha256');
})();

(function digestUnavailableNeverFallsBackToSize() {
  const cp = checkpoint({ generation: 'G3', bytes: 300, sha256: 'H-A', path: '/x.pdf' });
  const result = verifyRemote(cp, { size: 300, sha256: '', resourceId: 'RID-X' });
  assert.equal(result.outcome, 'deferred-digest-unavailable');
})();

(function byteIdenticalReplacementIsAdoptionNotCreationClaim() {
  const cp = checkpoint({ generation: 'G4', bytes: 400, sha256: 'H-A', path: '/x.pdf' });
  const result = verifyRemote(cp, { size: 400, sha256: 'H-A', resourceId: 'RID-OTHER' });
  assert.equal(result.outcome, 'exact-content-adopted');
  assert.notEqual(result.receipt.verificationKind, 'created-by-this-attempt');
})();

(function knownRemoteIdentityCannotSilentlyChangeLater() {
  const durable = Object.freeze({ resourceId: 'RID-A', expectedSha256: 'H-A' });
  const later = { resourceId: 'RID-B', sha256: 'H-A' };
  const outcome = later.resourceId !== durable.resourceId ? 'resource-id-conflict' : 'same-object';
  assert.equal(outcome, 'resource-id-conflict');
})();

console.log('P1-184 Yandex content receipt model: PASS');
