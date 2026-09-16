'use strict';

const assert = require('node:assert/strict');

let checks = 0;
function equal(actual, expected, message) {
  assert.equal(actual, expected, message);
  checks += 1;
}
function ok(value, message) {
  assert.ok(value, message);
  checks += 1;
}
function throwsCode(fn, code, message) {
  let error = null;
  try { fn(); } catch (err) { error = err; }
  ok(error, `${message}: expected throw`);
  equal(error.code, code, `${message}: error code`);
}

function makeDoc(id, url, appGeneration = 1) {
  return { id, url, appGeneration };
}

class Tab {
  constructor(id, document) {
    this.id = id;
    this.current = document;
    this.navigationGeneration = 1;
  }

  navigate(document) {
    this.current = document;
    this.navigationGeneration += 1;
  }

  restore(document) {
    // BFCache-like return can restore the same document identity, but crossing
    // another committed top-level navigation still advances operation generation.
    this.current = document;
    this.navigationGeneration += 1;
  }
}

// Current-source behavior model for P0-070. The runtime MessageSender can carry
// sender.documentId, but current WEBCLIP_GENERATE_PDF admission retains tabId +
// sanitized metadata and generatePdfBlob() later targets {tabId}.
class CurrentPipeline {
  admit(tab, sender, meta) {
    return {
      tabId: tab.id,
      // sender.documentId is intentionally discarded to model current source.
      admittedUrl: meta.url,
      admittedTitle: meta.title,
      operationId: meta.operationId,
    };
  }

  print(tab, admitted) {
    equal(tab.id, admitted.tabId, 'current print still targets admitted tabId');
    return {
      bytes: `PDF:${tab.current.id}`,
      printedDocumentId: tab.current.id,
      printedUrl: tab.current.url,
    };
  }

  collectDiagnostics(tab) {
    // Current collectPrintDiagnosticsForTab(tabId) uses tabs.sendMessage(tabId)
    // without documentId targeting.
    return {
      documentId: tab.current.id,
      url: tab.current.url,
    };
  }

  finalize(admitted, printed, diagnostics) {
    return {
      metaUrl: admitted.admittedUrl,
      metaTitle: admitted.admittedTitle,
      pdfBytes: printed.bytes,
      diagnosticsDocumentId: diagnostics.documentId,
      diagnosticsUrl: diagnostics.url,
    };
  }
}

// Candidate acceptance model. This is not a final runtime architecture; it
// captures the invariants an implementation must prove.
class GenerationBoundPipeline {
  admit(tab, sender, meta) {
    if (!sender.documentId) {
      const error = new Error('missing exact source document identity');
      error.code = 'SOURCE_DOCUMENT_ID_REQUIRED';
      throw error;
    }
    if (sender.frameId !== 0) {
      const error = new Error('top-document save admission required');
      error.code = 'TOP_DOCUMENT_REQUIRED';
      throw error;
    }
    if (sender.documentId !== tab.current.id) {
      const error = new Error('sender is already stale');
      error.code = 'SOURCE_DOCUMENT_STALE';
      throw error;
    }
    return {
      operationId: meta.operationId,
      tabId: tab.id,
      sourceDocumentId: sender.documentId,
      sourceNavigationGeneration: tab.navigationGeneration,
      sourceApplicationGeneration: meta.applicationGeneration,
      sourceUrl: meta.url,
      sourceTitle: meta.title,
    };
  }

  assertSource(tab, receipt) {
    if (tab.id !== receipt.tabId) {
      const error = new Error('tab changed');
      error.code = 'SOURCE_TAB_CHANGED';
      throw error;
    }
    if (tab.navigationGeneration !== receipt.sourceNavigationGeneration) {
      const error = new Error('top navigation generation changed');
      error.code = 'SOURCE_NAVIGATION_CHANGED';
      throw error;
    }
    if (tab.current.id !== receipt.sourceDocumentId) {
      const error = new Error('top document changed');
      error.code = 'SOURCE_DOCUMENT_CHANGED';
      throw error;
    }
    if (tab.current.appGeneration !== receipt.sourceApplicationGeneration) {
      const error = new Error('application generation changed');
      error.code = 'SOURCE_APPLICATION_CHANGED';
      throw error;
    }
  }

  print(tab, receipt, duringPrint = null) {
    this.assertSource(tab, receipt);
    const rendered = tab.current;
    if (duringPrint) duringPrint();
    const provisionalPdf = {
      bytes: `PDF:${rendered.id}`,
      renderedDocumentId: rendered.id,
    };
    // Bytes are provisional until the exact source generation is rechecked.
    this.assertSource(tab, receipt);
    return provisionalPdf;
  }

  collectExactDiagnostics(tab, receipt) {
    if (tab.current.id !== receipt.sourceDocumentId ||
        tab.navigationGeneration !== receipt.sourceNavigationGeneration) {
      return { unavailable: true, reason: 'source-document-not-current' };
    }
    return {
      unavailable: false,
      documentId: receipt.sourceDocumentId,
      url: tab.current.url,
    };
  }

  admitPdf(receipt, provisionalPdf) {
    if (provisionalPdf.renderedDocumentId !== receipt.sourceDocumentId) {
      const error = new Error('rendered document does not match source');
      error.code = 'PDF_SOURCE_MISMATCH';
      throw error;
    }
    return Object.freeze({
      operationId: receipt.operationId,
      sourceDocumentId: receipt.sourceDocumentId,
      sourceNavigationGeneration: receipt.sourceNavigationGeneration,
      sourceApplicationGeneration: receipt.sourceApplicationGeneration,
      sourceUrl: receipt.sourceUrl,
      pdfGenerationId: `pdf:${receipt.operationId}`,
      bytes: provisionalPdf.bytes,
    });
  }

  finalize(pdfReceipt, diagnostics) {
    return {
      operationId: pdfReceipt.operationId,
      sourceDocumentId: pdfReceipt.sourceDocumentId,
      sourceNavigationGeneration: pdfReceipt.sourceNavigationGeneration,
      sourceApplicationGeneration: pdfReceipt.sourceApplicationGeneration,
      sourceUrl: pdfReceipt.sourceUrl,
      pdfGenerationId: pdfReceipt.pdfGenerationId,
      pdfBytes: pdfReceipt.bytes,
      diagnostics,
    };
  }
}

// Current failure: cross-document navigation after command admission silently
// retargets Page.printToPDF to the replacement document.
{
  const a = makeDoc('doc-A', 'https://example.test/a');
  const b = makeDoc('doc-B', 'https://example.test/b');
  const tab = new Tab(7, a);
  const current = new CurrentPipeline();
  const admitted = current.admit(
    tab,
    { documentId: 'doc-A', frameId: 0 },
    { url: a.url, title: 'A', operationId: 'op-1' }
  );
  equal(admitted.admittedUrl, a.url, 'current metadata is admitted from A');
  ok(!Object.hasOwn(admitted, 'sourceDocumentId'), 'current admission discards sender.documentId');
  tab.navigate(b);
  const printed = current.print(tab, admitted);
  equal(printed.printedDocumentId, 'doc-B', 'current tab-targeted print renders replacement B');
  const diagnostics = current.collectDiagnostics(tab);
  equal(diagnostics.documentId, 'doc-B', 'current tab-targeted diagnostics also retarget to B');
  const final = current.finalize(admitted, printed, diagnostics);
  equal(final.metaUrl, a.url, 'final current metadata still names A');
  equal(final.pdfBytes, 'PDF:doc-B', 'final current bytes came from B');
}

// Same-URL replacement is invisible to URL equality.
{
  const a = makeDoc('doc-A', 'https://example.test/item');
  const b = makeDoc('doc-B', 'https://example.test/item');
  const tab = new Tab(9, a);
  const current = new CurrentPipeline();
  const admitted = current.admit(
    tab,
    { documentId: 'doc-A', frameId: 0 },
    { url: a.url, title: 'A', operationId: 'op-2' }
  );
  tab.navigate(b);
  const printed = current.print(tab, admitted);
  equal(printed.printedUrl, admitted.admittedUrl, 'same URL survives replacement');
  equal(printed.printedDocumentId, 'doc-B', 'same URL is still a different document');
}

// Post-print diagnostics have their own retarget window.
{
  const a = makeDoc('doc-A', 'https://example.test/a');
  const b = makeDoc('doc-B', 'https://example.test/b');
  const tab = new Tab(10, a);
  const current = new CurrentPipeline();
  const admitted = current.admit(
    tab,
    { documentId: 'doc-A', frameId: 0 },
    { url: a.url, title: 'A', operationId: 'op-3' }
  );
  const printed = current.print(tab, admitted);
  equal(printed.printedDocumentId, 'doc-A', 'current print can finish on A');
  tab.navigate(b);
  const diagnostics = current.collectDiagnostics(tab);
  equal(diagnostics.documentId, 'doc-B', 'post-print tab-only diagnostics can describe B');
}

// Candidate rejects stale command before print.
{
  const a = makeDoc('doc-A', 'https://example.test/a', 4);
  const b = makeDoc('doc-B', 'https://example.test/b', 1);
  const tab = new Tab(11, a);
  const candidate = new GenerationBoundPipeline();
  const receipt = candidate.admit(
    tab,
    { documentId: 'doc-A', frameId: 0 },
    { url: a.url, title: 'A', operationId: 'op-4', applicationGeneration: 4 }
  );
  equal(receipt.sourceDocumentId, 'doc-A', 'candidate retains exact sender document');
  equal(receipt.sourceNavigationGeneration, 1, 'candidate binds top navigation generation');
  tab.navigate(b);
  throwsCode(
    () => candidate.print(tab, receipt),
    'SOURCE_NAVIGATION_CHANGED',
    'candidate blocks replacement before print'
  );
}

// Candidate catches a navigation that races the print call itself and does not
// admit provisional bytes.
{
  const a = makeDoc('doc-A', 'https://example.test/a', 2);
  const b = makeDoc('doc-B', 'https://example.test/b', 1);
  const tab = new Tab(12, a);
  const candidate = new GenerationBoundPipeline();
  const receipt = candidate.admit(
    tab,
    { documentId: 'doc-A', frameId: 0 },
    { url: a.url, title: 'A', operationId: 'op-5', applicationGeneration: 2 }
  );
  throwsCode(
    () => candidate.print(tab, receipt, () => tab.navigate(b)),
    'SOURCE_NAVIGATION_CHANGED',
    'candidate invalidates bytes when top navigation occurs during print'
  );
}

// ABA control: checking only documentId before and after is not enough if A can
// be restored after B. Monotonic navigation generation still detects the race.
{
  const a = makeDoc('doc-A', 'https://example.test/a', 3);
  const b = makeDoc('doc-B', 'https://example.test/b', 1);
  const tab = new Tab(13, a);
  const candidate = new GenerationBoundPipeline();
  const receipt = candidate.admit(
    tab,
    { documentId: 'doc-A', frameId: 0 },
    { url: a.url, title: 'A', operationId: 'op-6', applicationGeneration: 3 }
  );
  throwsCode(
    () => candidate.print(tab, receipt, () => {
      tab.navigate(b);
      tab.restore(a);
      equal(tab.current.id, 'doc-A', 'ABA control restores same source document identity');
    }),
    'SOURCE_NAVIGATION_CHANGED',
    'candidate navigation generation catches A-B-A race'
  );
}

// P0-080 composition: same browser document but newer logical application
// generation also invalidates P0-070 authority.
{
  const a = makeDoc('doc-A', 'https://example.test/app', 5);
  const tab = new Tab(14, a);
  const candidate = new GenerationBoundPipeline();
  const receipt = candidate.admit(
    tab,
    { documentId: 'doc-A', frameId: 0 },
    { url: a.url, title: 'A', operationId: 'op-7', applicationGeneration: 5 }
  );
  tab.current.appGeneration = 6;
  throwsCode(
    () => candidate.print(tab, receipt),
    'SOURCE_APPLICATION_CHANGED',
    'candidate composes with P0-080 application generation'
  );
}

// Exact diagnostics never fall through to a replacement document.
{
  const a = makeDoc('doc-A', 'https://example.test/a', 1);
  const b = makeDoc('doc-B', 'https://example.test/b', 1);
  const tab = new Tab(15, a);
  const candidate = new GenerationBoundPipeline();
  const receipt = candidate.admit(
    tab,
    { documentId: 'doc-A', frameId: 0 },
    { url: a.url, title: 'A', operationId: 'op-8', applicationGeneration: 1 }
  );
  const pdf = candidate.print(tab, receipt);
  tab.navigate(b);
  const diagnostics = candidate.collectExactDiagnostics(tab, receipt);
  equal(diagnostics.unavailable, true, 'replacement yields unavailable diagnostics');
  equal(diagnostics.reason, 'source-document-not-current', 'diagnostic failure is explicit');
  // Existing valid PDF receipt may be preserved, but diagnostics cannot claim B.
  const admittedPdf = candidate.admitPdf(receipt, pdf);
  equal(admittedPdf.sourceDocumentId, 'doc-A', 'PDF receipt remains bound to A');
}

// Happy path: exact source generation is carried into immutable PDF receipt and
// final consumer metadata.
{
  const a = makeDoc('doc-A', 'https://example.test/a', 9);
  const tab = new Tab(16, a);
  const candidate = new GenerationBoundPipeline();
  const receipt = candidate.admit(
    tab,
    { documentId: 'doc-A', frameId: 0 },
    { url: a.url, title: 'A', operationId: 'op-9', applicationGeneration: 9 }
  );
  const pdf = candidate.print(tab, receipt);
  equal(pdf.renderedDocumentId, 'doc-A', 'candidate prints admitted document');
  const admittedPdf = candidate.admitPdf(receipt, pdf);
  equal(admittedPdf.sourceDocumentId, 'doc-A', 'immutable PDF receipt names exact source');
  equal(admittedPdf.sourceNavigationGeneration, 1, 'immutable PDF receipt carries navigation generation');
  equal(admittedPdf.sourceApplicationGeneration, 9, 'immutable PDF receipt carries application generation');
  const diagnostics = candidate.collectExactDiagnostics(tab, receipt);
  equal(diagnostics.unavailable, false, 'exact source diagnostics available on happy path');
  equal(diagnostics.documentId, 'doc-A', 'diagnostics describe exact source');
  const final = candidate.finalize(admittedPdf, diagnostics);
  equal(final.sourceDocumentId, 'doc-A', 'finalization retains source identity');
  equal(final.pdfGenerationId, 'pdf:op-9', 'finalization retains PDF generation identity');
  equal(final.pdfBytes, 'PDF:doc-A', 'finalization retains exact PDF bytes');
}

// Admission itself fails closed without platform source identity or for a
// subframe-originating top-level save request.
{
  const a = makeDoc('doc-A', 'https://example.test/a', 1);
  const tab = new Tab(17, a);
  const candidate = new GenerationBoundPipeline();
  throwsCode(
    () => candidate.admit(
      tab,
      { frameId: 0 },
      { url: a.url, title: 'A', operationId: 'op-10', applicationGeneration: 1 }
    ),
    'SOURCE_DOCUMENT_ID_REQUIRED',
    'candidate refuses weak URL-only source identity'
  );
  throwsCode(
    () => candidate.admit(
      tab,
      { documentId: 'doc-A', frameId: 3 },
      { url: a.url, title: 'A', operationId: 'op-11', applicationGeneration: 1 }
    ),
    'TOP_DOCUMENT_REQUIRED',
    'candidate requires intended top-document admission'
  );
}

// An already-stale sender cannot be rebound to current tab state.
{
  const a = makeDoc('doc-A', 'https://example.test/a', 1);
  const b = makeDoc('doc-B', 'https://example.test/b', 1);
  const tab = new Tab(18, b);
  const candidate = new GenerationBoundPipeline();
  throwsCode(
    () => candidate.admit(
      tab,
      { documentId: a.id, frameId: 0 },
      { url: a.url, title: 'A', operationId: 'op-12', applicationGeneration: 1 }
    ),
    'SOURCE_DOCUMENT_STALE',
    'candidate does not retarget stale sender to replacement document'
  );
}

console.log(`P0-070 end-to-end source-generation model: PASS ${checks} checks`);
