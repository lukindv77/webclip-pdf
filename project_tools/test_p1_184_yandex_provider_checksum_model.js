'use strict';

const assert = require('node:assert/strict');

function normalizeSha256(value) {
  const text = String(value || '').trim().toLowerCase();
  return /^[0-9a-f]{64}$/.test(text) ? text : '';
}

function checkpoint({ generation, bytes, sha256, path }) {
  const digest = normalizeSha256(sha256);
  if (!digest) throw new Error('checkpoint requires canonical SHA-256');
  return Object.freeze({
    generation,
    expectedPdfBytes: bytes,
    expectedSha256: digest,
    remotePath: path
  });
}

function verifyByProviderMetadata(cp, metadata) {
  if (!metadata) return { outcome: 'absent' };
  if (metadata.type !== 'file') return { outcome: 'object-type-conflict' };
  if (metadata.size !== cp.expectedPdfBytes) return { outcome: 'content-conflict-size' };

  const providerSha256 = normalizeSha256(metadata.sha256);
  if (!providerSha256) {
    return {
      outcome: 'fallback-required',
      reason: 'provider-sha256-unavailable-or-unvalidated'
    };
  }
  if (providerSha256 !== cp.expectedSha256) return { outcome: 'content-conflict-digest' };
  if (!metadata.resourceId) return { outcome: 'deferred-resource-id-unavailable' };

  return {
    outcome: 'exact-content-adopted',
    receipt: Object.freeze({
      remotePath: cp.remotePath,
      localCacheGeneration: cp.generation,
      expectedPdfBytes: cp.expectedPdfBytes,
      expectedSha256: cp.expectedSha256,
      providerSha256,
      resourceId: metadata.resourceId,
      resourceRevision: Number.isSafeInteger(metadata.revision) ? metadata.revision : null,
      verificationKind: 'yandex-metadata-sha256'
    })
  };
}

function verifyByDownloadedBytes(cp, remote) {
  if (!remote) return { outcome: 'absent' };
  if (remote.size !== cp.expectedPdfBytes) return { outcome: 'content-conflict-size' };
  const downloadedSha256 = normalizeSha256(remote.downloadedSha256);
  if (!downloadedSha256) return { outcome: 'deferred-download-digest-unavailable' };
  if (downloadedSha256 !== cp.expectedSha256) return { outcome: 'content-conflict-digest' };
  if (!remote.resourceId) return { outcome: 'deferred-resource-id-unavailable' };
  return {
    outcome: 'exact-content-adopted',
    receipt: Object.freeze({
      remotePath: cp.remotePath,
      localCacheGeneration: cp.generation,
      expectedPdfBytes: cp.expectedPdfBytes,
      expectedSha256: cp.expectedSha256,
      resourceId: remote.resourceId,
      resourceRevision: Number.isSafeInteger(remote.revision) ? remote.revision : null,
      verificationKind: 'remote-download-sha256'
    })
  };
}

const H_A = 'a'.repeat(64);
const H_B = 'b'.repeat(64);

(function metadataShaFastPathAcceptsExactBytes() {
  const cp = checkpoint({ generation: 'G1', bytes: 100, sha256: H_A, path: '/x.pdf' });
  const result = verifyByProviderMetadata(cp, {
    type: 'file', size: 100, sha256: H_A, resourceId: 'RID-A', revision: 17
  });
  assert.equal(result.outcome, 'exact-content-adopted');
  assert.equal(result.receipt.verificationKind, 'yandex-metadata-sha256');
  assert.equal(result.receipt.resourceRevision, 17);
})();

(function sameSizeDifferentDigestIsRejected() {
  const cp = checkpoint({ generation: 'G2', bytes: 200, sha256: H_A, path: '/x.pdf' });
  const result = verifyByProviderMetadata(cp, {
    type: 'file', size: 200, sha256: H_B, resourceId: 'RID-B', revision: 18
  });
  assert.equal(result.outcome, 'content-conflict-digest');
})();

(function missingProviderDigestRequiresFallbackNotSuccess() {
  const cp = checkpoint({ generation: 'G3', bytes: 300, sha256: H_A, path: '/x.pdf' });
  const result = verifyByProviderMetadata(cp, {
    type: 'file', size: 300, sha256: '', resourceId: 'RID-A', revision: 19
  });
  assert.equal(result.outcome, 'fallback-required');
})();

(function revisionAndResourceIdNeverSubstituteForDigest() {
  const cp = checkpoint({ generation: 'G4', bytes: 400, sha256: H_A, path: '/x.pdf' });
  const result = verifyByProviderMetadata(cp, {
    type: 'file', size: 400, resourceId: 'RID-A', revision: 999999
  });
  assert.equal(result.outcome, 'fallback-required');
})();

(function boundedDownloadDigestCanCloseFallback() {
  const cp = checkpoint({ generation: 'G5', bytes: 500, sha256: H_A, path: '/x.pdf' });
  const result = verifyByDownloadedBytes(cp, {
    size: 500, downloadedSha256: H_A, resourceId: 'RID-A', revision: 20
  });
  assert.equal(result.outcome, 'exact-content-adopted');
  assert.equal(result.receipt.verificationKind, 'remote-download-sha256');
})();

(function fallbackDigestMismatchCannotBeAdopted() {
  const cp = checkpoint({ generation: 'G6', bytes: 600, sha256: H_A, path: '/x.pdf' });
  const result = verifyByDownloadedBytes(cp, {
    size: 600, downloadedSha256: H_B, resourceId: 'RID-A', revision: 21
  });
  assert.equal(result.outcome, 'content-conflict-digest');
})();

(function byteIdenticalDifferentResourceIsAdoptionNotCreation() {
  const cp = checkpoint({ generation: 'G7', bytes: 700, sha256: H_A, path: '/x.pdf' });
  const result = verifyByProviderMetadata(cp, {
    type: 'file', size: 700, sha256: H_A, resourceId: 'RID-OTHER', revision: 22
  });
  assert.equal(result.outcome, 'exact-content-adopted');
  assert.notEqual(result.receipt.verificationKind, 'created-by-this-attempt');
})();

console.log('P1-184 Yandex provider checksum model: PASS');
