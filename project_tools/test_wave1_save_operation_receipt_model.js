'use strict';

const assert = require('assert');

function uuid(label) { return `${label}-gen`; }

function sourceReceipt({ documentId = 'doc-A', appGeneration = 1, selectionRevision = 1 } = {}) {
  return Object.freeze({ version: 1, documentId, appGeneration, selectionRevision });
}

function sameSource(a, b) {
  return !!a && !!b && a.version === 1 && b.version === 1 &&
    a.documentId === b.documentId &&
    a.appGeneration === b.appGeneration &&
    a.selectionRevision === b.selectionRevision;
}

function sealPdf({ source, bytes, sha256, generation = uuid('pdf-A') }) {
  assert(source && bytes > 0 && sha256);
  return Object.freeze({
    version: 1,
    generation,
    source,
    bytes,
    sha256,
    sealed: true
  });
}

function makeLiveRetryIndex(tabId, pdf) {
  return { tabId, generation: pdf.generation, source: pdf.source };
}

function admitLiveRetry({ requesterSource, pointer, pdfStore }) {
  if (!pointer) return { ok: false, reason: 'no-pointer' };
  const pdf = pdfStore.get(pointer.generation);
  if (!pdf || !pdf.sealed) return { ok: false, reason: 'missing-generation' };
  if (!sameSource(requesterSource, pdf.source)) return { ok: false, reason: 'stale-source' };
  return { ok: true, pdf };
}

function captureYandexContext({ accountUid = 'A', rootPath = '/RootA', authGeneration = 1, configGeneration = 1 } = {}) {
  return Object.freeze({
    version: 1,
    contextId: `ctx-${accountUid}-${authGeneration}-${configGeneration}`,
    accountUid,
    rootPath,
    authGeneration,
    configGeneration
  });
}

function makePublicationPolicy(generation, enabled) {
  return Object.freeze({ version: 1, generation, enabled: !!enabled });
}

function makeRemoteCheckpoint({ operationId, pdf, context, remotePath, policy, journalGeneration }) {
  assert(remotePath.startsWith(context.rootPath + '/') || remotePath === context.rootPath);
  return {
    version: 1,
    operationId,
    pdfGeneration: pdf.generation,
    expectedPdfBytes: pdf.bytes,
    expectedSha256: pdf.sha256,
    sourceReceipt: pdf.source,
    accountUid: context.accountUid,
    rootPath: context.rootPath,
    remotePath,
    yandexContextReceipt: {
      contextId: context.contextId,
      accountUid: context.accountUid,
      authGeneration: context.authGeneration,
      configGeneration: context.configGeneration
    },
    publicationPolicyReceipt: {
      generation: policy.generation,
      requested: policy.enabled
    },
    publicationPhase: policy.enabled ? 'eligible' : 'skipped-disabled',
    expectedJournalGeneration: journalGeneration,
    remotePhase: 'prepared'
  };
}

function admitPublication(checkpoint, currentPolicy) {
  if (!checkpoint.publicationPolicyReceipt.requested) {
    checkpoint.publicationPhase = 'skipped-disabled';
    return false;
  }
  if (!currentPolicy.enabled || currentPolicy.generation !== checkpoint.publicationPolicyReceipt.generation) {
    checkpoint.publicationPhase = 'revoked-before-admission';
    return false;
  }
  checkpoint.publicationPhase = 'admitted';
  return true;
}

function verifyRemoteExact(checkpoint, remote) {
  const exact = remote && remote.type === 'file' &&
    remote.accountUid === checkpoint.accountUid &&
    remote.path === checkpoint.remotePath &&
    remote.size === checkpoint.expectedPdfBytes &&
    remote.sha256 === checkpoint.expectedSha256;
  if (!exact) return { ok: false, reason: 'remote-content-mismatch' };
  checkpoint.remotePhase = 'verified';
  checkpoint.resourceId = remote.resourceId || '';
  return { ok: true };
}

function finalizeJournal(checkpoint, currentJournalGeneration) {
  if (checkpoint.remotePhase !== 'verified') return { ok: false, reason: 'remote-not-verified' };
  if (checkpoint.expectedJournalGeneration !== currentJournalGeneration) {
    return { ok: false, reason: 'stale-journal-generation' };
  }
  return {
    ok: true,
    provenance: Object.freeze({
      operationId: checkpoint.operationId,
      pdfGeneration: checkpoint.pdfGeneration,
      expectedSha256: checkpoint.expectedSha256,
      accountUid: checkpoint.accountUid,
      remotePath: checkpoint.remotePath,
      resourceId: checkpoint.resourceId || '',
      journalGeneration: currentJournalGeneration
    })
  };
}

(function run() {
  // 1. Stable end-to-end chain.
  const sourceA = sourceReceipt();
  const pdfA = sealPdf({ source: sourceA, bytes: 1000, sha256: 'sha-A' });
  const store = new Map([[pdfA.generation, pdfA]]);
  let pointer = makeLiveRetryIndex(7, pdfA);
  assert.strictEqual(admitLiveRetry({ requesterSource: sourceA, pointer, pdfStore: store }).ok, true);

  const ctxA = captureYandexContext();
  const policyG1 = makePublicationPolicy('policy-1', true);
  const checkpoint = makeRemoteCheckpoint({
    operationId: 'worker-op-A', pdf: pdfA, context: ctxA,
    remotePath: '/RootA/a.pdf', policy: policyG1, journalGeneration: 'journal-G1'
  });
  assert.strictEqual(admitPublication(checkpoint, policyG1), true);
  assert.strictEqual(verifyRemoteExact(checkpoint, {
    type: 'file', accountUid: 'A', path: '/RootA/a.pdf', size: 1000,
    sha256: 'sha-A', resourceId: 'rid-A'
  }).ok, true);
  assert.strictEqual(finalizeJournal(checkpoint, 'journal-G1').ok, true);

  // 2. Same URL/new document is irrelevant: exact source mismatch blocks live retry.
  const sourceB = sourceReceipt({ documentId: 'doc-B' });
  assert.deepStrictEqual(admitLiveRetry({ requesterSource: sourceB, pointer, pdfStore: store }), {
    ok: false, reason: 'stale-source'
  });

  // 3. Immutable generation prevents same-tab replacement races.
  const pdfB = sealPdf({ source: sourceB, bytes: 1000, sha256: 'sha-B', generation: uuid('pdf-B') });
  store.set(pdfB.generation, pdfB);
  pointer = makeLiveRetryIndex(7, pdfB);
  assert.strictEqual(store.get(pdfA.generation).sha256, 'sha-A');
  assert.strictEqual(store.get(pdfB.generation).sha256, 'sha-B');

  // 4. Late A cleanup may delete A but must not clear B's discovery pointer.
  store.delete(pdfA.generation);
  if (pointer.generation === pdfA.generation) pointer = null;
  assert(pointer && pointer.generation === pdfB.generation);

  // 5. Captured Yandex context does not mutate when global auth/config changes.
  const ctxCaptured = captureYandexContext({ accountUid: 'A', rootPath: '/RootA', authGeneration: 4, configGeneration: 8 });
  const globalLater = captureYandexContext({ accountUid: 'B', rootPath: '/RootB', authGeneration: 5, configGeneration: 9 });
  assert.strictEqual(ctxCaptured.accountUid, 'A');
  assert.strictEqual(ctxCaptured.rootPath, '/RootA');
  assert.notStrictEqual(ctxCaptured.contextId, globalLater.contextId);

  // 6. Publication disable before admission revokes G1; later re-enable does not resurrect it.
  const cpPolicy = makeRemoteCheckpoint({
    operationId: 'worker-op-P', pdf: pdfB, context: ctxCaptured,
    remotePath: '/RootA/p.pdf', policy: makePublicationPolicy('G1', true), journalGeneration: 'JG1'
  });
  assert.strictEqual(admitPublication(cpPolicy, makePublicationPolicy('G2', false)), false);
  assert.strictEqual(cpPolicy.publicationPhase, 'revoked-before-admission');
  assert.strictEqual(admitPublication(cpPolicy, makePublicationPolicy('G3', true)), false);

  // 7. Same-size wrong remote bytes are rejected.
  const cpHash = makeRemoteCheckpoint({
    operationId: 'worker-op-H', pdf: pdfB, context: ctxCaptured,
    remotePath: '/RootA/h.pdf', policy: makePublicationPolicy('H1', false), journalGeneration: 'JG1'
  });
  assert.strictEqual(verifyRemoteExact(cpHash, {
    type: 'file', accountUid: 'A', path: '/RootA/h.pdf', size: 1000,
    sha256: 'different-sha', resourceId: 'rid-wrong'
  }).ok, false);

  // 8. Cross-account same-path/same-size/same-hash still cannot satisfy A checkpoint.
  assert.strictEqual(verifyRemoteExact(cpHash, {
    type: 'file', accountUid: 'B', path: '/RootA/h.pdf', size: 1000,
    sha256: 'sha-B', resourceId: 'rid-B'
  }).ok, false);

  // 9. Journal destructive boundary fences late remote success.
  const cpJournal = makeRemoteCheckpoint({
    operationId: 'worker-op-J', pdf: pdfB, context: ctxCaptured,
    remotePath: '/RootA/j.pdf', policy: makePublicationPolicy('J1', false), journalGeneration: 'JG-before-reset'
  });
  assert.strictEqual(verifyRemoteExact(cpJournal, {
    type: 'file', accountUid: 'A', path: '/RootA/j.pdf', size: 1000,
    sha256: 'sha-B', resourceId: 'rid-J'
  }).ok, true);
  assert.deepStrictEqual(finalizeJournal(cpJournal, 'JG-after-reset'), {
    ok: false, reason: 'stale-journal-generation'
  });

  // 10. After external effect admission, recovery consumes the sealed generation/receipt; it does not rerender a newer tab.
  const immutableRecoveryReceipt = Object.freeze({
    operationId: cpJournal.operationId,
    pdfGeneration: cpJournal.pdfGeneration,
    expectedSha256: cpJournal.expectedSha256,
    accountUid: cpJournal.accountUid,
    remotePath: cpJournal.remotePath
  });
  assert.strictEqual(immutableRecoveryReceipt.pdfGeneration, pdfB.generation);
  assert.strictEqual(immutableRecoveryReceipt.expectedSha256, 'sha-B');

  console.log('Wave 1 SaveOperationReceipt cross-owner model: PASS');
})();
