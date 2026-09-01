'use strict';

// P0-023 bootstrap: observe sender.documentId before the product listener is
// registered, then load the unchanged worker and wrap its ordinary cache
// functions. Chrome Event methods themselves are never replaced.
importScripts('pdf-cache-document-generation-guard.js');

const p0_023_observer = globalThis.WebClipPdfCacheDocumentGenerationGuard?.installObserver?.();
if (!p0_023_observer?.installed) {
  throw new Error('P0-023 PDF cache document-generation observer unavailable.');
}

importScripts('service-worker.js');

const p0_023_functions = globalThis.WebClipPdfCacheDocumentGenerationGuard?.installFunctionGuards?.(globalThis);
if (!p0_023_functions?.installed) {
  throw new Error('P0-023 PDF cache document-generation function guard unavailable.');
}
