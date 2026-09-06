'use strict';

const assert = require('node:assert/strict');

function contentReceipt({ appGeneration, selectionRevision, href, live = true }) {
  return Object.freeze({
    version: 1,
    applicationGeneration: appGeneration,
    selectionRevision,
    href,
    live
  });
}

function validateBeforeSend(reviewReceipt, currentState) {
  if (!reviewReceipt.live) return 'stale-selection';
  if (!currentState.live) return 'stale-selection';
  if (reviewReceipt.applicationGeneration !== currentState.applicationGeneration) return 'stale-application-generation';
  if (reviewReceipt.selectionRevision !== currentState.selectionRevision) return 'stale-selection-revision';
  if (reviewReceipt.href !== currentState.href) return 'stale-href';
  return 'valid';
}

function workerAdmit(messageReceipt, sender) {
  if (!sender?.tabId || !sender?.documentId) return { outcome: 'missing-browser-identity' };
  if (sender.frameId !== 0) return { outcome: 'not-top-level-sender' };
  if (messageReceipt.href !== sender.url) return { outcome: 'sender-url-mismatch' };
  return {
    outcome: 'admitted',
    admission: Object.freeze({
      version: 1,
      tabId: sender.tabId,
      frameId: sender.frameId,
      browserDocumentId: sender.documentId,
      contentReceipt: messageReceipt
    })
  };
}

(function selectionRevisionChangedDuringPreparationFailsBeforeSend() {
  const review = contentReceipt({ appGeneration: 1, selectionRevision: 4, href: 'https://x.test/a' });
  const current = contentReceipt({ appGeneration: 1, selectionRevision: 5, href: 'https://x.test/a' });
  assert.equal(validateBeforeSend(review, current), 'stale-selection-revision');
})();

(function routeChangedDuringPreparationFailsBeforeSend() {
  const review = contentReceipt({ appGeneration: 10, selectionRevision: 2, href: 'https://x.test/a' });
  const current = contentReceipt({ appGeneration: 11, selectionRevision: 2, href: 'https://x.test/b' });
  assert.equal(validateBeforeSend(review, current), 'stale-application-generation');
})();

(function disconnectedSelectionFailsBeforeSend() {
  const review = contentReceipt({ appGeneration: 20, selectionRevision: 3, href: 'https://x.test/a' });
  const current = contentReceipt({ appGeneration: 20, selectionRevision: 3, href: 'https://x.test/a', live: false });
  assert.equal(validateBeforeSend(review, current), 'stale-selection');
})();

(function workerUsesActualSenderDocumentIdNotCallerClaim() {
  const receipt = contentReceipt({ appGeneration: 30, selectionRevision: 7, href: 'https://x.test/a' });
  const message = { ...receipt, browserDocumentId: 'CALLER-CLAIM' };
  const admitted = workerAdmit(message, {
    tabId: 9,
    frameId: 0,
    documentId: 'BROWSER-DOC-REAL',
    url: 'https://x.test/a'
  });
  assert.equal(admitted.outcome, 'admitted');
  assert.equal(admitted.admission.browserDocumentId, 'BROWSER-DOC-REAL');
  assert.notEqual(admitted.admission.browserDocumentId, message.browserDocumentId);
})();

(function senderUrlMismatchFailsRatherThanRewritesReceipt() {
  const receipt = contentReceipt({ appGeneration: 40, selectionRevision: 1, href: 'https://x.test/a' });
  const result = workerAdmit(receipt, {
    tabId: 10,
    frameId: 0,
    documentId: 'DOC-40',
    url: 'https://x.test/b'
  });
  assert.equal(result.outcome, 'sender-url-mismatch');
  assert.equal(receipt.href, 'https://x.test/a');
})();

(function frameSenderCannotMasqueradeAsTopLevelSaveAdmission() {
  const receipt = contentReceipt({ appGeneration: 50, selectionRevision: 1, href: 'https://x.test/a' });
  const result = workerAdmit(receipt, {
    tabId: 11,
    frameId: 5,
    documentId: 'FRAME-DOC',
    url: 'https://x.test/a'
  });
  assert.equal(result.outcome, 'not-top-level-sender');
})();

(function urlAbaDoesNotResurrectOldApplicationGeneration() {
  const review = contentReceipt({ appGeneration: 60, selectionRevision: 2, href: 'https://x.test/a' });
  const current = contentReceipt({ appGeneration: 62, selectionRevision: 2, href: 'https://x.test/a' });
  assert.equal(validateBeforeSend(review, current), 'stale-application-generation');
})();

console.log('P0-080 trusted worker admission model: PASS');
