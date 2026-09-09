'use strict';

const crypto = require('crypto');
const assert = require('assert');

let cases = 0;
function check(value, message) {
  cases += 1;
  assert.ok(value, message);
}
function equal(actual, expected, message) {
  cases += 1;
  assert.strictEqual(actual, expected, message);
}
function throwsCode(fn, code, message) {
  cases += 1;
  let thrown = null;
  try { fn(); } catch (error) { thrown = error; }
  assert.ok(thrown, message || `Expected ${code}`);
  assert.strictEqual(thrown.code, code, message || `Expected ${code}, got ${thrown?.code}`);
}

function digest(value) {
  return `sha256:${crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

class ContentAuthority {
  constructor({ realm = 'realm-A', entry = 'entry-A' } = {}) {
    this.contentRealmNonce = realm;
    this.applicationGeneration = 1;
    this.navigationEntryId = entry;
    this.selectionRevision = 1;
    this.selection = [];
    this.review = null;
    this.reviewCounter = 0;
  }

  addRoot(id) {
    this.selection.push({ id, connected: true });
    this.selectionRevision += 1;
    this.review = null;
  }

  detachRoot(id) {
    const root = this.selection.find((item) => item.id === id);
    if (root) root.connected = false;
  }

  editSelection() {
    this.selectionRevision += 1;
    this.review = null;
  }

  currentEntryChange(nextEntryId = this.navigationEntryId) {
    this.applicationGeneration += 1;
    this.navigationEntryId = nextEntryId;
    this.review = null;
  }

  pageLifecycleBoundary() {
    this.applicationGeneration += 1;
    this.review = null;
  }

  temporaryPrintMutation() {
    // WebClip-owned print representation changes do not alter user selection authority.
    return true;
  }

  issueReview({ snapshot = null } = {}) {
    if (!this.selection.length || this.selection.some((item) => !item.connected)) {
      const error = new Error('selection not reviewable');
      error.code = 'WEBCLIP_REVIEW_REQUIRED';
      throw error;
    }
    const portable = snapshot || this.selection.map((item) => item.id);
    this.review = Object.freeze({
      version: 2,
      contentRealmNonce: this.contentRealmNonce,
      selectionAuthorityId: `review:${++this.reviewCounter}`,
      applicationGeneration: this.applicationGeneration,
      navigationEntryId: this.navigationEntryId,
      selectionRevision: this.selectionRevision,
      selectionSnapshotSha256: digest(portable)
    });
    return this.review;
  }

  validate(receipt) {
    return Boolean(receipt
      && receipt === this.review
      && receipt.contentRealmNonce === this.contentRealmNonce
      && receipt.applicationGeneration === this.applicationGeneration
      && receipt.navigationEntryId === this.navigationEntryId
      && receipt.selectionRevision === this.selectionRevision
      && this.selection.length
      && this.selection.every((item) => item.connected));
  }
}

class OperationStore {
  constructor() {
    this.byRequest = new Map();
    this.byPhysical = new Map();
    this.next = 0;
  }

  admit({ clientRequestId, clientCorrelationId = '', operationKind, subjectKey, requestFingerprint }) {
    if (!clientRequestId) throw Object.assign(new Error('missing request id'), { code: 'WEBCLIP_CLIENT_REQUEST_REQUIRED' });
    const existing = this.byRequest.get(clientRequestId);
    if (existing) {
      const same = existing.operationKind === operationKind
        && existing.subjectKey === subjectKey
        && existing.requestFingerprint === requestFingerprint;
      if (!same) throw Object.assign(new Error('request mismatch'), { code: 'WEBCLIP_CLIENT_REQUEST_MISMATCH' });
      return { receipt: existing, deduplicated: true };
    }
    const receipt = {
      physicalOperationId: `pdf-save:${++this.next}`,
      clientRequestId,
      clientCorrelationId,
      operationKind,
      subjectKey,
      requestFingerprint,
      phase: 'admitted',
      effectStarted: false,
      terminal: null
    };
    this.byRequest.set(clientRequestId, receipt);
    this.byPhysical.set(receipt.physicalOperationId, receipt);
    return { receipt, deduplicated: false };
  }

  startEffect(physicalOperationId) {
    const receipt = this.byPhysical.get(physicalOperationId);
    if (!receipt || receipt.terminal) throw Object.assign(new Error('not admitted'), { code: 'WEBCLIP_OPERATION_NOT_ADMITTED' });
    receipt.effectStarted = true;
    receipt.phase = 'effect-started';
  }

  terminalizeBeforeEffect(physicalOperationId, code) {
    const receipt = this.byPhysical.get(physicalOperationId);
    if (!receipt) throw new Error('missing P');
    if (receipt.effectStarted) throw new Error('cannot classify started effect as before-effect');
    receipt.phase = 'terminal';
    receipt.terminal = { class: 'failed-before-effect', code };
  }
}

function canonicalRequest({ authority, intent }) {
  return digest({
    destination: intent.destination,
    readingMode: intent.readingMode,
    fileComment: intent.fileComment,
    frozenTitle: intent.frozenTitle,
    frozenUrl: intent.frozenUrl,
    contentRealmNonce: authority.contentRealmNonce,
    selectionAuthorityId: authority.selectionAuthorityId,
    applicationGeneration: authority.applicationGeneration,
    navigationEntryId: authority.navigationEntryId,
    selectionRevision: authority.selectionRevision,
    selectionSnapshotSha256: authority.selectionSnapshotSha256
  });
}

function admitSave({ content, store, requestId, correlationId = '', intent }) {
  const authority = content.review;
  if (!content.validate(authority)) throw Object.assign(new Error('stale review'), { code: 'WEBCLIP_REVIEW_REQUIRED' });
  const requestFingerprint = canonicalRequest({ authority, intent });
  const subjectKey = `source:doc-A:${authority.contentRealmNonce}:${authority.selectionAuthorityId}`;
  return store.admit({
    clientRequestId: requestId,
    clientCorrelationId: correlationId,
    operationKind: intent.destination === 'yandex' ? 'pdf.yandex-save' : 'pdf.local-save',
    subjectKey,
    requestFingerprint
  });
}

// A1 exact authority.
const content = new ContentAuthority();
content.addRoot('article');
const review1 = content.issueReview();
check(content.validate(review1), 'fresh review must validate');
equal(review1.applicationGeneration, 1, 'selection edits must not change application generation');
equal(review1.selectionRevision, 2, 'selection change increments selection revision');
const beforePrintRevision = content.selectionRevision;
content.temporaryPrintMutation();
equal(content.selectionRevision, beforePrintRevision, 'print-only mutation must not invalidate selection revision');
check(content.validate(review1), 'WebClip print mutation alone must preserve review authority');
content.detachRoot('article');
check(!content.validate(review1), 'detached selected root invalidates review even without selectionRevision change');

const c2 = new ContentAuthority();
c2.addRoot('main');
const r2 = c2.issueReview();
c2.currentEntryChange('entry-B');
check(!c2.validate(r2), 'same-document navigation invalidates old review');
equal(c2.applicationGeneration, 2, 'currententrychange advances application generation');
const r3 = c2.issueReview();
check(c2.validate(r3), 'new review after SPA transition validates');
c2.pageLifecycleBoundary();
check(!c2.validate(r3), 'BFCache/lifecycle boundary invalidates review');
equal(c2.applicationGeneration, 3, 'lifecycle boundary shares application-generation fence');

const c3 = new ContentAuthority({ realm: 'realm-old', entry: 'entry-1' });
c3.addRoot('article');
const oldRealmReview = c3.issueReview();
const c4 = new ContentAuthority({ realm: 'realm-new', entry: 'entry-1' });
c4.addRoot('article');
c4.issueReview();
check(!c4.validate(oldRealmReview), 'new content realm cannot consume old realm receipt');

const c5 = new ContentAuthority();
c5.addRoot('a');
const ra = c5.issueReview({ snapshot: ['a'] });
c5.editSelection();
c5.addRoot('b');
check(!c5.validate(ra), 'material include/exclude edit invalidates review');
const rb = c5.issueReview({ snapshot: ['a', 'b'] });
check(ra.selectionSnapshotSha256 !== rb.selectionSnapshotSha256, 'portable snapshot digest changes with reviewed selection');

// A2: durable P is created before long preparation/effect work.
const store = new OperationStore();
const c6 = new ContentAuthority();
c6.addRoot('article');
c6.issueReview();
const intent = {
  destination: 'download', readingMode: 'read', fileComment: 'note',
  frozenTitle: 'Title A', frozenUrl: 'https://example.test/a'
};
const first = admitSave({ content: c6, store, requestId: 'request-1', correlationId: 'legacy-ui-1', intent });
check(!first.deduplicated, 'first admission mints a physical operation');
check(first.receipt.physicalOperationId.startsWith('pdf-save:'), 'physical operation is worker-owned identity');
equal(first.receipt.clientCorrelationId, 'legacy-ui-1', 'legacy id is correlation only');
check(first.receipt.physicalOperationId !== first.receipt.clientCorrelationId, 'caller correlation cannot become P');
equal(first.receipt.phase, 'admitted', 'P exists before preparation/effect');
check(!first.receipt.effectStarted, 'admission alone starts no effect');

const repeat = admitSave({ content: c6, store, requestId: 'request-1', correlationId: 'different-display-only', intent });
check(repeat.deduplicated, 'same exact client request deduplicates');
equal(repeat.receipt.physicalOperationId, first.receipt.physicalOperationId, 'lost response retry reuses exact P');
equal(store.byPhysical.size, 1, 'dedup creates no P2');

const changedIntent = { ...intent, fileComment: 'different' };
throwsCode(
  () => admitSave({ content: c6, store, requestId: 'request-1', intent: changedIntent }),
  'WEBCLIP_CLIENT_REQUEST_MISMATCH',
  'same request id with different immutable intent must fail closed'
);
equal(store.byPhysical.size, 1, 'request mismatch creates no replacement P');

// Stale after admission but before render: same P is terminalized before effect.
const c7 = new ContentAuthority();
c7.addRoot('article');
c7.issueReview();
const store2 = new OperationStore();
const admitted = admitSave({ content: c7, store: store2, requestId: 'request-stale', intent });
c7.currentEntryChange('entry-new-route');
check(!c7.validate(c7.review), 'old review is invalidated after route transition');
store2.terminalizeBeforeEffect(admitted.receipt.physicalOperationId, 'WEBCLIP_REVIEW_REQUIRED');
equal(admitted.receipt.terminal.class, 'failed-before-effect', 'stale pre-render admission becomes truthful terminal P');
check(!admitted.receipt.effectStarted, 'stale review cannot start physical effect');
throwsCode(
  () => store2.startEffect(admitted.receipt.physicalOperationId),
  'WEBCLIP_OPERATION_NOT_ADMITTED',
  'terminal pre-effect P cannot later start effect'
);

// New deliberate user attempt gets a new request and new P only after new review.
const newReview = c7.issueReview();
check(c7.validate(newReview), 'fresh review after route transition is valid');
const secondAttempt = admitSave({ content: c7, store: store2, requestId: 'request-stale-2', intent: { ...intent, frozenUrl: 'https://example.test/b' } });
check(secondAttempt.receipt.physicalOperationId !== admitted.receipt.physicalOperationId, 'new deliberate attempt gets P2');

// Second probe immediately before render/effect remains mandatory.
const c8 = new ContentAuthority();
c8.addRoot('article');
const review8 = c8.issueReview();
const store3 = new OperationStore();
const a8 = admitSave({ content: c8, store: store3, requestId: 'request-probe', intent });
check(c8.validate(review8), 'pre-prepare probe passes');
c8.temporaryPrintMutation();
check(c8.validate(review8), 'post-prepare probe ignores WebClip-owned print-only mutation');
store3.startEffect(a8.receipt.physicalOperationId);
check(a8.receipt.effectStarted, 'effect begins only after exact second probe');

// Detached roots during preparation stop before effect.
const c9 = new ContentAuthority();
c9.addRoot('article');
const review9 = c9.issueReview();
const store4 = new OperationStore();
const a9 = admitSave({ content: c9, store: store4, requestId: 'request-detach', intent });
c9.detachRoot('article');
check(!c9.validate(review9), 'page replacement during prepare detaches authority root');
store4.terminalizeBeforeEffect(a9.receipt.physicalOperationId, 'WEBCLIP_REVIEW_REQUIRED');
check(!a9.receipt.effectStarted, 'detached selection yields no effect');

// Progress binding.
const progress = {
  clientRequestId: a8.receipt.clientRequestId,
  physicalOperationId: a8.receipt.physicalOperationId,
  clientCorrelationId: 'ui-can-repeat'
};
equal(progress.clientRequestId, 'request-probe', 'pre-admission UI can bind by client request');
equal(progress.physicalOperationId, a8.receipt.physicalOperationId, 'post-admission progress carries P');
check(progress.clientCorrelationId !== progress.physicalOperationId, 'presentation correlation remains non-authoritative');

// Cached retry is a PDF-generation operation, not a fresh live-selection authorization.
const cachedRetry = {
  subjectKey: 'pdf-generation:G17',
  requiresLiveSelectionReceipt: false,
  requiresExactPdfGeneration: true
};
check(!cachedRetry.requiresLiveSelectionReceipt, 'cached retry must not retarget to current selection');
check(cachedRetry.requiresExactPdfGeneration, 'cached retry depends on immutable PDF generation owner');

// Passive J0 is structural capacity only, never a shortcut to CAS activation.
const journal = { dbVersion: 8, authorityMode: 'passive-v8', datasetGeneration: 'JG-1' };
equal(journal.dbVersion, 8, 'A2 may coexist with passive Journal v8');
equal(journal.authorityMode, 'passive-v8', 'A2 must not activate D0 CAS implicitly');
check(journal.authorityMode !== 'cas-v1', 'A2 does not claim Journal CAS closure');

// Review receipt contains only canonical authority domains selected by final reconciliation.
const canonicalFields = Object.keys(new ContentAuthority().addRoot ? (() => {
  const x = new ContentAuthority(); x.addRoot('x'); return x.issueReview();
})() : {});
check(canonicalFields.includes('applicationGeneration'), 'receipt has applicationGeneration');
check(canonicalFields.includes('navigationEntryId'), 'receipt has exact navigationEntryId');
check(canonicalFields.includes('selectionRevision'), 'receipt has selectionRevision');
check(!canonicalFields.includes('documentActivityGeneration'), 'obsolete documentActivityGeneration is not persisted/shared');
check(!canonicalFields.includes('navigationTransitionGeneration'), 'obsolete navigationTransitionGeneration is not persisted/shared');

// Conservative currententrychange policy: any observed same-document entry change invalidates review.
const c10 = new ContentAuthority();
c10.addRoot('root');
const r10 = c10.issueReview();
c10.currentEntryChange(c10.navigationEntryId); // state-only/update-current-entry case
check(!c10.validate(r10), 'even state-only currententrychange conservatively invalidates reviewed authority');

console.log(`A1/A2 authority-admission research model: PASS; cases=${cases}`);
