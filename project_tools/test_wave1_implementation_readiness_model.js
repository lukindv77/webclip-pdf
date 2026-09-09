'use strict';

const assert = require('assert');
const crypto = require('crypto');

function sha256(chunks) {
  const h = crypto.createHash('sha256');
  for (const chunk of chunks) h.update(chunk);
  return h.digest('hex');
}

class PdfDb {
  constructor(version = 3) {
    this.version = version;
    this.pdfs = new Map();
    this.meta = new Map();
    this.retryIndex = null;
  }
  seedLegacy(tabId, bytes, createdAt = 1) {
    const key = `tab:${tabId}`;
    const record = { key, tabId, bytes: Buffer.from(bytes), createdAt, cacheFormat: 'blob-v3' };
    this.pdfs.set(key, record);
    this.meta.set(key, { key, tabId, createdAt, pdfByteLength: record.bytes.length, cacheFormat: 'blob-v3' });
    return key;
  }
  upgradeToV4() {
    assert.strictEqual(this.version, 3);
    this.version = 4;
    this.retryIndex = new Map();
    // Deliberately do not rewrite/copy legacy payloads. They lack exact source/operation authority.
  }
  open(requestedVersion) {
    if (requestedVersion < this.version) {
      const e = new Error('VersionError');
      e.name = 'VersionError';
      throw e;
    }
    assert.strictEqual(requestedVersion, this.version);
    return this;
  }
  createSealed({ generation, tabId, sourceReceipt, bytes, expectedSha256 }) {
    assert.ok(this.retryIndex, 'v4 retryIndex store required');
    const key = `pdf:${generation}`;
    if (this.pdfs.has(key) || this.meta.has(key)) {
      const e = new Error('ConstraintError');
      e.name = 'ConstraintError';
      throw e;
    }
    const payload = Buffer.from(bytes);
    const actual = sha256([payload]);
    assert.strictEqual(actual, expectedSha256, 'writer must bind digest to exact bytes');
    const metadata = {
      schemaVersion: 4,
      key,
      generation,
      tabId,
      sourceReceipt,
      byteLength: payload.length,
      sha256: actual,
      sealed: true
    };
    // Model one atomic readwrite transaction across payload, metadata and retry index.
    this.pdfs.set(key, { key, generation, bytes: payload });
    this.meta.set(key, metadata);
    this.retryIndex.set(tabId, { tabId, key, generation, sourceReceipt });
    return metadata;
  }
  liveRetry(tabId, currentSourceReceipt) {
    assert.ok(this.retryIndex, 'v4 required');
    const pointer = this.retryIndex.get(tabId);
    if (!pointer) return { outcome: 'missing' };
    if (!String(pointer.key).startsWith('pdf:')) return { outcome: 'legacy-unbound' };
    const payload = this.pdfs.get(pointer.key);
    const metadata = this.meta.get(pointer.key);
    if (!payload || !metadata) return { outcome: 'corrupt' };
    if (!metadata.sealed || metadata.generation !== pointer.generation || payload.generation !== pointer.generation) {
      return { outcome: 'corrupt' };
    }
    if (metadata.byteLength !== payload.bytes.length) return { outcome: 'corrupt' };
    if (metadata.sha256 !== sha256([payload.bytes])) return { outcome: 'corrupt' };
    if (metadata.sourceReceipt !== currentSourceReceipt || pointer.sourceReceipt !== currentSourceReceipt) {
      return { outcome: 'stale-source' };
    }
    return { outcome: 'ok', key: pointer.key, sha256: metadata.sha256 };
  }
  deleteExact(key) {
    const metadata = this.meta.get(key);
    this.pdfs.delete(key);
    this.meta.delete(key);
    if (metadata && this.retryIndex) {
      const pointer = this.retryIndex.get(metadata.tabId);
      if (pointer?.key === key) this.retryIndex.delete(metadata.tabId);
    }
  }
}

function classifyLegacyRemoteCheckpoint(row, { destructiveBoundarySeen = true } = {}) {
  const hasSha = /^[a-f0-9]{64}$/.test(String(row.expectedSha256 || ''));
  const hasPdfGeneration = /^pdf:/.test(String(row.pdfCacheKey || ''));
  const hasScope = Boolean(row.accountUid && row.rootPath && row.remotePath);
  const hasPolicyGeneration = Boolean(row.publicationPolicyGeneration || row.createPublicLinks === false);
  const hasJournalGeneration = Boolean(row.expectedJournalGeneration) || !destructiveBoundarySeen;
  if (!hasSha || !hasPdfGeneration) return 'manual-content-authority-unverifiable';
  if (!hasScope) return 'manual-scope-authority-unverifiable';
  if (!hasPolicyGeneration) return 'manual-publication-authority-unverifiable';
  if (!hasJournalGeneration) return 'manual-journal-authority-unverifiable';
  return 'automated-recovery-eligible';
}

function canAdmitPublication(receipt, currentPolicy) {
  if (!receipt.requested) return { ok: false, outcome: 'skipped-disabled' };
  if (receipt.phase === 'admitted' || receipt.phase === 'unknown') {
    return { ok: false, outcome: 'reconcile-already-admitted' };
  }
  if (receipt.generation !== currentPolicy.generation || !currentPolicy.enabled) {
    return { ok: false, outcome: 'revoked-before-admission' };
  }
  return { ok: true, outcome: 'admitted' };
}

function journalFinalize(expectedGeneration, currentGeneration, remoteReceipt) {
  if (!remoteReceipt?.exactContentVerified) return 'blocked-unverified-content';
  if (expectedGeneration !== currentGeneration) return 'blocked-stale-journal-generation';
  return 'committed';
}

// 1. Upgrade must be synchronized across worker/offscreen and must not forge legacy authority.
const db = new PdfDb(3);
const legacyKey = db.seedLegacy(7, 'legacy-pdf');
db.upgradeToV4();
assert.strictEqual(db.pdfs.has(legacyKey), true);
assert.strictEqual(db.meta.get(legacyKey).cacheFormat, 'blob-v3');
assert.throws(() => db.open(3), (e) => e.name === 'VersionError');
assert.strictEqual(db.open(4), db);
assert.strictEqual(db.retryIndex.size, 0, 'upgrade must not synthesize trusted retry pointers for legacy rows');

// 2. Digest is identical whether exact Chromium bytes arrive as one block or arbitrary IO.read chunks.
const exactBytes = Buffer.from('%PDF-exact-byte-stream\nrow-1\nrow-2\n%%EOF');
const wholeDigest = sha256([exactBytes]);
const chunkDigest = sha256([exactBytes.subarray(0, 5), exactBytes.subarray(5, 17), exactBytes.subarray(17)]);
assert.strictEqual(chunkDigest, wholeDigest);

// 3. New generation is create-once and current-source bound.
const metaA = db.createSealed({ generation: 'G-A', tabId: 7, sourceReceipt: 'S-A', bytes: exactBytes, expectedSha256: wholeDigest });
assert.strictEqual(metaA.sealed, true);
assert.strictEqual(db.liveRetry(7, 'S-A').outcome, 'ok');
assert.strictEqual(db.liveRetry(7, 'S-B').outcome, 'stale-source');
assert.throws(
  () => db.createSealed({ generation: 'G-A', tabId: 7, sourceReceipt: 'S-A', bytes: Buffer.from('different'), expectedSha256: sha256([Buffer.from('different')]) }),
  (e) => e.name === 'ConstraintError'
);

// 4. Same tab gets a new exact generation; stale exact cleanup cannot delete the newer pointer.
const bytesB = Buffer.from('%PDF-newer');
const metaB = db.createSealed({ generation: 'G-B', tabId: 7, sourceReceipt: 'S-B', bytes: bytesB, expectedSha256: sha256([bytesB]) });
assert.strictEqual(db.liveRetry(7, 'S-B').key, metaB.key);
db.deleteExact(metaA.key);
assert.strictEqual(db.liveRetry(7, 'S-B').key, metaB.key);

// 5. Legacy current-shaped remote checkpoint must not be upgraded into exact content truth.
const legacyRemote = {
  accountUid: 'A', rootPath: '/R', remotePath: '/R/a.pdf', expectedPdfBytes: 1234, createPublicLinks: true
};
assert.strictEqual(classifyLegacyRemoteCheckpoint(legacyRemote), 'manual-content-authority-unverifiable');

// 6. Even a row with content receipt cannot auto-recover if policy generation is missing.
const partialRemote = {
  accountUid: 'A', rootPath: '/R', remotePath: '/R/a.pdf',
  expectedSha256: 'a'.repeat(64), pdfCacheKey: 'pdf:G', createPublicLinks: true,
  expectedJournalGeneration: 'J1'
};
assert.strictEqual(classifyLegacyRemoteCheckpoint(partialRemote), 'manual-publication-authority-unverifiable');

// 7. Full v2 authority is eligible.
const v2Remote = {
  accountUid: 'A', rootPath: '/R', remotePath: '/R/a.pdf',
  expectedSha256: 'b'.repeat(64), pdfCacheKey: 'pdf:G',
  publicationPolicyGeneration: 'P1', expectedJournalGeneration: 'J1'
};
assert.strictEqual(classifyLegacyRemoteCheckpoint(v2Remote), 'automated-recovery-eligible');

// 8. Publication generation is ABA-safe and already-admitted effect is reconciled, not cancelled.
const pubReceipt = { generation: 'P1', requested: true, phase: 'eligible' };
assert.deepStrictEqual(canAdmitPublication(pubReceipt, { generation: 'P2', enabled: false }), { ok: false, outcome: 'revoked-before-admission' });
assert.deepStrictEqual(canAdmitPublication(pubReceipt, { generation: 'P3', enabled: true }), { ok: false, outcome: 'revoked-before-admission' });
assert.deepStrictEqual(canAdmitPublication({ ...pubReceipt, phase: 'admitted' }, { generation: 'P2', enabled: false }), { ok: false, outcome: 'reconcile-already-admitted' });
assert.deepStrictEqual(canAdmitPublication(pubReceipt, { generation: 'P1', enabled: true }), { ok: true, outcome: 'admitted' });

// 9. Correct remote bytes cannot finalize into a newer destructive Journal generation.
assert.strictEqual(journalFinalize('J1', 'J1', { exactContentVerified: true }), 'committed');
assert.strictEqual(journalFinalize('J1', 'J2', { exactContentVerified: true }), 'blocked-stale-journal-generation');
assert.strictEqual(journalFinalize('J1', 'J1', { exactContentVerified: false }), 'blocked-unverified-content');

// 10. Proposed durable V2 receipt remains far below the existing 320 KiB per-row cap.
const representativeV2 = {
  version: 2,
  phase: 'prepared',
  operationGeneration: crypto.randomUUID(),
  source: { documentId: crypto.randomUUID(), applicationGeneration: crypto.randomUUID(), selectionRevision: crypto.randomUUID() },
  pdf: { key: 'pdf:' + crypto.randomUUID(), generation: crypto.randomUUID(), byteLength: 48 * 1024 * 1024, sha256: 'c'.repeat(64) },
  yandexScope: { accountUid: 'u'.repeat(128), rootPath: '/WebClip', remotePath: '/WebClip/Upload/x.pdf' },
  yandexContext: { authGeneration: crypto.randomUUID(), configGeneration: crypto.randomUUID(), accountUid: 'u'.repeat(128) },
  publication: { generation: crypto.randomUUID(), requested: true, phase: 'eligible' },
  journal: { expectedJournalGeneration: crypto.randomUUID(), journalEntryId: crypto.randomUUID() },
  remote: { phase: 'prepared', resourceId: '', revision: '', verificationKind: '', verifiedSha256: '', publicUrl: '' }
};
const receiptChars = JSON.stringify(representativeV2).length;
assert.ok(receiptChars < 10_000, `representative receipt unexpectedly large: ${receiptChars}`);
assert.ok(receiptChars < 320 * 1024);

console.log('Wave 1 implementation-readiness model: PASS');
console.log(`representative-v2-json-chars=${receiptChars}`);
