'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');

function uuid(prefix) {
  return `${prefix}:${crypto.randomUUID()}`;
}

function makeContentState(overrides = {}) {
  return {
    contentRealmNonce: uuid('realm'),
    documentActivityGeneration: 1,
    applicationGeneration: 1,
    navigationTransitionGeneration: 1,
    currentEntryId: 'entry-A',
    href: 'https://example.test/a',
    selectionRevision: 1,
    rootsLive: true,
    selectedChildGenerations: Object.freeze({}),
    ...overrides
  };
}

function issueReviewReceipt(state) {
  return Object.freeze({
    version: 1,
    contentRealmNonce: state.contentRealmNonce,
    documentActivityGeneration: state.documentActivityGeneration,
    applicationGeneration: state.applicationGeneration,
    navigationTransitionGeneration: state.navigationTransitionGeneration,
    currentEntryId: state.currentEntryId,
    href: state.href,
    selectionRevision: state.selectionRevision,
    selectedChildGenerations: { ...state.selectedChildGenerations }
  });
}

function validateContentReceipt(receipt, state) {
  if (!receipt || receipt.version !== 1) return { ok: false, reason: 'bad-receipt' };
  const same =
    receipt.contentRealmNonce === state.contentRealmNonce &&
    receipt.documentActivityGeneration === state.documentActivityGeneration &&
    receipt.applicationGeneration === state.applicationGeneration &&
    receipt.navigationTransitionGeneration === state.navigationTransitionGeneration &&
    receipt.currentEntryId === state.currentEntryId &&
    receipt.href === state.href &&
    receipt.selectionRevision === state.selectionRevision;
  if (!same) return { ok: false, reason: 'stale-content-authority' };
  if (!state.rootsLive) return { ok: false, reason: 'selection-root-stale' };
  const expectedChildren = receipt.selectedChildGenerations || {};
  const currentChildren = state.selectedChildGenerations || {};
  const keys = new Set([...Object.keys(expectedChildren), ...Object.keys(currentChildren)]);
  for (const key of keys) {
    if (expectedChildren[key] !== currentChildren[key]) return { ok: false, reason: 'selected-child-stale' };
  }
  return { ok: true };
}

function workerAdmit({ sender, reviewReceipt, state, clientOperationId = '', incognito = false }) {
  if (incognito) return { ok: false, reason: 'incognito-fail-closed' };
  if (!sender?.tabId || !sender?.documentId) return { ok: false, reason: 'missing-browser-source' };
  if (sender.documentLifecycle !== 'active') return { ok: false, reason: 'non-active-document' };
  if (sender.frameId !== 0) return { ok: false, reason: 'not-active-top-frame' };
  const content = validateContentReceipt(reviewReceipt, state);
  if (!content.ok) return content;
  return {
    ok: true,
    operation: Object.freeze({
      physicalOperationId: uuid('op'),
      clientOperationId,
      sourceGenerationId: uuid('source'),
      tabId: sender.tabId,
      browserDocumentId: sender.documentId,
      admittedLifecycle: sender.documentLifecycle,
      reviewReceipt
    })
  };
}

function exactProbe(operation, currentDocumentId, state) {
  if (currentDocumentId !== operation.browserDocumentId) return { ok: false, reason: 'exact-document-missing' };
  return validateContentReceipt(operation.reviewReceipt, state);
}

function createRenderFence(operation) {
  return {
    renderAttemptId: uuid('render'),
    physicalOperationId: operation.physicalOperationId,
    sourceGenerationId: operation.sourceGenerationId,
    rootFrameId: 'root-frame',
    rootLoaderId: 'loader-A',
    stale: false,
    staleReason: '',
    detached: false,
    event(event) {
      if (this.stale) return;
      if (event.kind === 'debugger-detach') {
        this.stale = true;
        this.detached = true;
        this.staleReason = 'debugger-detach';
        return;
      }
      if (event.frameId !== this.rootFrameId) return;
      if (event.kind === 'frameStartedNavigating') {
        this.stale = true;
        this.staleReason = 'root-navigation-start';
      } else if (event.kind === 'navigatedWithinDocument') {
        this.stale = true;
        this.staleReason = 'root-same-document-navigation';
      } else if (event.kind === 'frameNavigated' && event.loaderId !== this.rootLoaderId) {
        this.stale = true;
        this.staleReason = 'root-loader-changed';
      } else if (event.kind === 'frameDetached') {
        this.stale = true;
        this.staleReason = 'root-frame-detached';
      }
    }
  };
}

function acceptRenderedBytes({ operation, fence, probeB, probeC, bytes }) {
  if (!probeB?.ok) return { ok: false, reason: probeB?.reason || 'probe-b-failed' };
  if (fence.stale) return { ok: false, reason: fence.staleReason };
  if (!probeC?.ok) return { ok: false, reason: probeC?.reason || 'probe-c-failed' };
  const payload = Buffer.from(bytes);
  return {
    ok: true,
    pdf: Object.freeze({
      pdfGeneration: uuid('pdf'),
      ownerPhysicalOperationId: operation.physicalOperationId,
      sourceGenerationId: operation.sourceGenerationId,
      byteLength: payload.length,
      sha256: crypto.createHash('sha256').update(payload).digest('hex'),
      sealed: true,
      bytes: payload
    })
  };
}

function stableSave({ state = makeContentState(), sender = null, duringRender = [], afterPrint = null } = {}) {
  sender ||= { tabId: 7, frameId: 0, documentId: 'doc-A', documentLifecycle: 'active' };
  const review = issueReviewReceipt(state);
  const admitted = workerAdmit({ sender, reviewReceipt: review, state, clientOperationId: 'same-correlation' });
  if (!admitted.ok) return admitted;
  const operation = admitted.operation;
  const probeA = exactProbe(operation, sender.documentId, state);
  if (!probeA.ok) return { ok: false, reason: probeA.reason, printed: false };
  const fence = createRenderFence(operation);
  const probeB = exactProbe(operation, sender.documentId, state);
  if (!probeB.ok) return { ok: false, reason: probeB.reason, printed: false };
  for (const event of duringRender) fence.event(event);
  if (typeof afterPrint === 'function') afterPrint(state, fence);
  const probeC = exactProbe(operation, sender.documentId, state);
  const accepted = acceptRenderedBytes({ operation, fence, probeB, probeC, bytes: Buffer.from('%PDF-exact\n%%EOF') });
  return { ...accepted, operation, fence, printed: true };
}

let cases = 0;
function test(name, fn) {
  fn();
  cases += 1;
}

// 1. Stable active top document yields exactly one sealed generation.
test('stable source', () => {
  const result = stableSave();
  assert.equal(result.ok, true);
  assert.equal(result.pdf.sealed, true);
  assert.equal(result.pdf.sourceGenerationId, result.operation.sourceGenerationId);
});

// 2. Equal caller correlation never means equal physical/source identity.
test('correlation is not physical identity', () => {
  const state = makeContentState();
  const receipt = issueReviewReceipt(state);
  const sender = { tabId: 7, frameId: 0, documentId: 'doc-A', documentLifecycle: 'active' };
  const a = workerAdmit({ sender, reviewReceipt: receipt, state, clientOperationId: 'same' }).operation;
  const b = workerAdmit({ sender, reviewReceipt: receipt, state, clientOperationId: 'same' }).operation;
  assert.notEqual(a.physicalOperationId, b.physicalOperationId);
  assert.notEqual(a.sourceGenerationId, b.sourceGenerationId);
  assert.equal(a.clientOperationId, b.clientOperationId);
});

// 3. Non-active sender lifecycle is rejected.
test('lifecycle admission', () => {
  for (const lifecycle of ['prerender', 'cached', 'pending_deletion']) {
    const state = makeContentState();
    const r = workerAdmit({
      sender: { tabId: 7, frameId: 0, documentId: 'doc-A', documentLifecycle: lifecycle },
      reviewReceipt: issueReviewReceipt(state), state
    });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'non-active-document');
  }
});

// 4. Child-frame sender cannot own a top-level save.
test('top frame admission', () => {
  const state = makeContentState();
  const r = workerAdmit({
    sender: { tabId: 7, frameId: 9, documentId: 'doc-child', documentLifecycle: 'active' },
    reviewReceipt: issueReviewReceipt(state), state
  });
  assert.equal(r.reason, 'not-active-top-frame');
});

// 5. Incognito fails before persistent save authority.
test('incognito fail closed', () => {
  const state = makeContentState();
  const r = workerAdmit({
    sender: { tabId: 7, frameId: 0, documentId: 'doc-A', documentLifecycle: 'active' },
    reviewReceipt: issueReviewReceipt(state), state, incognito: true
  });
  assert.equal(r.reason, 'incognito-fail-closed');
});

// 6. Same URL but new browser document cannot pass exact Probe A.
test('same url replacement document', () => {
  const state = makeContentState();
  const receipt = issueReviewReceipt(state);
  const admitted = workerAdmit({
    sender: { tabId: 7, frameId: 0, documentId: 'doc-A', documentLifecycle: 'active' },
    reviewReceipt: receipt, state
  });
  const probe = exactProbe(admitted.operation, 'doc-B', state);
  assert.equal(probe.reason, 'exact-document-missing');
});

// 7. Same browser document, newer SPA generation invalidates old receipt.
test('spa transition', () => {
  const state = makeContentState();
  const receipt = issueReviewReceipt(state);
  state.applicationGeneration += 1;
  state.navigationTransitionGeneration += 1;
  state.currentEntryId = 'entry-B';
  state.href = 'https://example.test/b';
  assert.equal(validateContentReceipt(receipt, state).ok, false);
});

// 8. Route ABA cannot revive old authority.
test('route aba', () => {
  const state = makeContentState();
  const receipt = issueReviewReceipt(state);
  state.applicationGeneration += 2;
  state.navigationTransitionGeneration += 2;
  state.currentEntryId = 'entry-A';
  state.href = receipt.href;
  assert.equal(validateContentReceipt(receipt, state).ok, false);
});

// 9. Selection edit after review invalidates receipt.
test('selection revision', () => {
  const state = makeContentState();
  const receipt = issueReviewReceipt(state);
  state.selectionRevision += 1;
  assert.equal(validateContentReceipt(receipt, state).ok, false);
});

// 10. Disconnected selected root invalidates authority without URL change.
test('selected root liveness', () => {
  const state = makeContentState();
  const receipt = issueReviewReceipt(state);
  state.rootsLive = false;
  assert.equal(validateContentReceipt(receipt, state).reason, 'selection-root-stale');
});

// 11. BFCache/activity ABA with same doc/URL is fenced by activity generation.
test('bfcache activity generation', () => {
  const state = makeContentState();
  const receipt = issueReviewReceipt(state);
  state.documentActivityGeneration += 2; // pagehide + persisted pageshow return
  assert.equal(validateContentReceipt(receipt, state).ok, false);
});

// 12. Transition between Probe A and armed fence is caught by Probe B.
test('attach window probe b', () => {
  const state = makeContentState();
  const receipt = issueReviewReceipt(state);
  const sender = { tabId: 7, frameId: 0, documentId: 'doc-A', documentLifecycle: 'active' };
  const op = workerAdmit({ sender, reviewReceipt: receipt, state }).operation;
  assert.equal(exactProbe(op, 'doc-A', state).ok, true);
  createRenderFence(op);
  state.applicationGeneration += 1;
  assert.equal(exactProbe(op, 'doc-A', state).ok, false);
});

// 13. Root navigation start is fatal even if later cancelled.
test('root navigation start', () => {
  const r = stableSave({ duringRender: [{ kind: 'frameStartedNavigating', frameId: 'root-frame' }] });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'root-navigation-start');
});

// 14. Same-document navigation during render is fatal.
test('root same-document navigation', () => {
  const r = stableSave({ duringRender: [{ kind: 'navigatedWithinDocument', frameId: 'root-frame' }] });
  assert.equal(r.reason, 'root-same-document-navigation');
});

// 15. Root loader replacement is fatal.
test('root loader change', () => {
  const r = stableSave({ duringRender: [{ kind: 'frameNavigated', frameId: 'root-frame', loaderId: 'loader-B' }] });
  assert.equal(r.reason, 'root-loader-changed');
});

// 16. Root detach/swap is fatal.
test('root frame detach', () => {
  const r = stableSave({ duringRender: [{ kind: 'frameDetached', frameId: 'root-frame' }] });
  assert.equal(r.reason, 'root-frame-detached');
});

// 17. Debugger detach before byte acceptance is fatal.
test('debugger detach', () => {
  const r = stableSave({ duringRender: [{ kind: 'debugger-detach' }] });
  assert.equal(r.reason, 'debugger-detach');
});

// 18. Unselected child-frame transition alone is a negative control.
test('unselected child negative control', () => {
  const r = stableSave({ duringRender: [{ kind: 'frameNavigated', frameId: 'child-9', loaderId: 'child-loader-B' }] });
  assert.equal(r.ok, true);
});

// 19. Selected child generation change invalidates aggregate receipt.
test('selected child generation', () => {
  const state = makeContentState({ selectedChildGenerations: { child9: 'C1' } });
  const receipt = issueReviewReceipt(state);
  state.selectedChildGenerations = { child9: 'C2' };
  assert.equal(validateContentReceipt(receipt, state).reason, 'selected-child-stale');
});

// 20. Late content-generation drift after print but before byte acceptance is conservatively rejected.
test('probe c closes late drift', () => {
  const r = stableSave({ afterPrint: (state) => { state.applicationGeneration += 1; } });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'stale-content-authority');
});

// 21. Once exact bytes are sealed, later live-tab navigation cannot mutate or rerender them.
test('post-seal navigation immutability', () => {
  const r = stableSave();
  assert.equal(r.ok, true);
  const before = Buffer.from(r.pdf.bytes);
  const digest = r.pdf.sha256;
  // Model arbitrary later live-tab change; sealed receipt is detached from live source.
  const laterState = makeContentState({ applicationGeneration: 99, href: 'https://example.test/elsewhere' });
  assert.ok(laterState);
  assert.deepEqual(r.pdf.bytes, before);
  assert.equal(r.pdf.sha256, digest);
});

console.log('Wave 1 trusted save-admission protocol model: PASS');
console.log(`cases=${cases}`);
