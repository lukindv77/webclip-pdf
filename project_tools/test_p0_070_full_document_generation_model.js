'use strict';

const assert = require('assert');

function createSourceReceipt({
  documentId = 'doc-A',
  appGeneration = 1,
  selectionRevision = 1,
  navigationEntryId = 'entry-A',
  href = 'https://example.test/a',
  operationId = 'caller-op'
} = {}) {
  return Object.freeze({
    version: 1,
    tabId: 7,
    frameId: 0,
    browserDocumentId: documentId,
    href,
    content: Object.freeze({
      applicationGeneration: appGeneration,
      selectionRevision,
      navigationEntryId
    }),
    callerOperationId: operationId
  });
}

function createRenderSession(receipt) {
  return {
    receipt,
    stale: false,
    staleReasons: [],
    printStarted: false,
    printCompleted: false,
    sealed: null
  };
}

function exactDocumentProbe(session, live) {
  if (!live || live.documentId !== session.receipt.browserDocumentId) {
    session.stale = true;
    session.staleReasons.push('browser-document-mismatch');
    return false;
  }
  if (live.appGeneration !== session.receipt.content.applicationGeneration) {
    session.stale = true;
    session.staleReasons.push('application-generation-mismatch');
    return false;
  }
  if (live.selectionRevision !== session.receipt.content.selectionRevision) {
    session.stale = true;
    session.staleReasons.push('selection-revision-mismatch');
    return false;
  }
  if (live.navigationEntryId !== session.receipt.content.navigationEntryId) {
    session.stale = true;
    session.staleReasons.push('navigation-entry-mismatch');
    return false;
  }
  return true;
}

function onDebuggerEvent(session, event) {
  if (!event || event.mainFrame !== true) return;
  if ([
    'Page.frameStartedNavigating',
    'Page.frameNavigated',
    'Page.navigatedWithinDocument'
  ].includes(event.method)) {
    session.stale = true;
    session.staleReasons.push(event.method);
  }
}

function beginPrint(session) {
  if (session.stale) return false;
  session.printStarted = true;
  return true;
}

function completePrint(session, bytes) {
  session.printCompleted = true;
  if (session.stale || !session.printStarted) return null;
  const payload = Buffer.from(bytes);
  const sealed = Object.freeze({
    version: 1,
    cacheGeneration: 'pdfgen-1',
    byteLength: payload.length,
    sha256: require('crypto').createHash('sha256').update(payload).digest('hex'),
    sourceDocumentId: session.receipt.browserDocumentId,
    sourceApplicationGeneration: session.receipt.content.applicationGeneration
  });
  session.sealed = sealed;
  return sealed;
}

// Stable A -> sealed exact bytes.
{
  const receipt = createSourceReceipt();
  const s = createRenderSession(receipt);
  assert.equal(exactDocumentProbe(s, {
    documentId: 'doc-A', appGeneration: 1, selectionRevision: 1, navigationEntryId: 'entry-A'
  }), true);
  assert.equal(beginPrint(s), true);
  const sealed = completePrint(s, 'PDF-A');
  assert.ok(sealed);
  assert.equal(sealed.sourceDocumentId, 'doc-A');
}

// Cross-document navigation before exact-document probe -> reject, no print.
{
  const s = createRenderSession(createSourceReceipt());
  assert.equal(exactDocumentProbe(s, {
    documentId: 'doc-B', appGeneration: 1, selectionRevision: 1, navigationEntryId: 'entry-B'
  }), false);
  assert.equal(beginPrint(s), false);
  assert.equal(completePrint(s, 'PDF-B'), null);
}

// Cross-document navigation after probe but during print -> returned bytes discarded.
{
  const s = createRenderSession(createSourceReceipt());
  assert.ok(exactDocumentProbe(s, {
    documentId: 'doc-A', appGeneration: 1, selectionRevision: 1, navigationEntryId: 'entry-A'
  }));
  assert.ok(beginPrint(s));
  onDebuggerEvent(s, { mainFrame: true, method: 'Page.frameStartedNavigating' });
  assert.equal(completePrint(s, 'WRONG-BYTES'), null);
}

// Same-document SPA navigation during print -> discard.
{
  const s = createRenderSession(createSourceReceipt());
  assert.ok(exactDocumentProbe(s, {
    documentId: 'doc-A', appGeneration: 1, selectionRevision: 1, navigationEntryId: 'entry-A'
  }));
  assert.ok(beginPrint(s));
  onDebuggerEvent(s, { mainFrame: true, method: 'Page.navigatedWithinDocument' });
  assert.equal(completePrint(s, 'STALE-SPA'), null);
}

// URL/document ABA A -> B -> A remains stale because the intervening event is evidence.
{
  const s = createRenderSession(createSourceReceipt());
  assert.ok(exactDocumentProbe(s, {
    documentId: 'doc-A', appGeneration: 1, selectionRevision: 1, navigationEntryId: 'entry-A'
  }));
  assert.ok(beginPrint(s));
  onDebuggerEvent(s, { mainFrame: true, method: 'Page.frameStartedNavigating' });
  onDebuggerEvent(s, { mainFrame: true, method: 'Page.frameNavigated' });
  assert.equal(completePrint(s, 'PDF-A-LOOKALIKE'), null);
}

// Same URL but a different browser documentId is not identity.
{
  const s = createRenderSession(createSourceReceipt({ href: 'https://example.test/a' }));
  assert.equal(exactDocumentProbe(s, {
    documentId: 'doc-B', appGeneration: 1, selectionRevision: 1,
    navigationEntryId: 'entry-A', href: 'https://example.test/a'
  }), false);
}

// Same browser documentId but a newer P0-080 application generation is stale.
{
  const s = createRenderSession(createSourceReceipt({ documentId: 'doc-A', appGeneration: 1 }));
  assert.equal(exactDocumentProbe(s, {
    documentId: 'doc-A', appGeneration: 2, selectionRevision: 1, navigationEntryId: 'entry-A'
  }), false);
}

// Reused caller textual operationId cannot rebind source authority.
{
  const a = createSourceReceipt({ documentId: 'doc-A', operationId: 'same-text' });
  const b = createSourceReceipt({ documentId: 'doc-B', operationId: 'same-text' });
  assert.equal(a.callerOperationId, b.callerOperationId);
  assert.notEqual(a.browserDocumentId, b.browserDocumentId);
}

// An unselected/non-authority child-frame navigation alone does not poison top-level source.
{
  const s = createRenderSession(createSourceReceipt());
  assert.ok(exactDocumentProbe(s, {
    documentId: 'doc-A', appGeneration: 1, selectionRevision: 1, navigationEntryId: 'entry-A'
  }));
  assert.ok(beginPrint(s));
  onDebuggerEvent(s, { mainFrame: false, method: 'Page.frameNavigated' });
  assert.ok(completePrint(s, 'PDF-A'));
}

// After a sealed PDF exists, later tab navigation cannot mutate or rerender those bytes.
{
  const s = createRenderSession(createSourceReceipt());
  assert.ok(exactDocumentProbe(s, {
    documentId: 'doc-A', appGeneration: 1, selectionRevision: 1, navigationEntryId: 'entry-A'
  }));
  assert.ok(beginPrint(s));
  const sealed = completePrint(s, 'PDF-A');
  assert.ok(sealed);
  const before = { ...sealed };
  onDebuggerEvent(s, { mainFrame: true, method: 'Page.frameNavigated' });
  assert.deepEqual({ ...sealed }, before);
}

console.log('P0-070 full-document generation model: PASS');
