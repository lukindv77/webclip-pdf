'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const offscreen = fs.readFileSync(path.join(ROOT, 'offscreen.js'), 'utf8');

function fail(label) {
  throw new Error(`P0-023 source gate RED: ${label}`);
}
function requireMatch(text, regex, label) {
  if (!regex.test(text)) fail(label);
}
function requireAny(text, regexes, label) {
  if (!regexes.some((r) => r.test(text))) fail(label);
}
function around(text, needle, radius = 16000) {
  const i = text.indexOf(needle);
  if (i < 0) return '';
  return text.slice(Math.max(0, i - radius), Math.min(text.length, i + needle.length + radius));
}

const retryHandlers = [
  around(worker, "case 'WEBCLIP_RETRY_PDF_TO_YANDEX'"),
  around(worker, "case 'WEBCLIP_DOWNLOAD_CACHED_PDF'")
].join('\n');

// Live-page retry/download admission must use actual browser sender document identity.
requireMatch(
  retryHandlers,
  /sender\??\.documentId|sender\.documentId/,
  'cached-PDF live handlers must consume MessageSender.documentId'
);
requireMatch(
  retryHandlers,
  /sender\??\.frameId|sender\.frameId/,
  'cached-PDF live handlers must enforce sender frame identity'
);

// Cache metadata/provenance must bind the PDF to an exact upstream source receipt.
requireAny(
  worker,
  [
    /\bsourceGenerationReceipt\b/,
    /\bfullDocumentGenerationReceipt\b/,
    /\bsourceReceipt(?:Id|Digest)?\b/
  ],
  'sealed PDF metadata must retain exact P0-070 source-generation provenance'
);

// Live retry lookup must be source-receipt based, not just tab/current URL.
requireAny(
  worker,
  [
    /\bgetValidCachedPdfForSource\b/,
    /\bretryForCurrentLiveSource\b/,
    /\bvalidateCachedPdfSourceGeneration\b/,
    /\bsameSourceGenerationReceipt\b/
  ],
  'live retry must have an exact source-generation validation primitive'
);

// A mutable tab->latest pointer/index may exist, but source mismatch must compare-clear
// discovery state without deleting another operation's sealed PDF generation.
requireAny(
  worker,
  [
    /\bclearPdfCacheLatestPointerIfMatches\b/,
    /\bcompareAndClear[A-Za-z0-9_]*Pdf[A-Za-z0-9_]*Pointer\b/,
    /\bdeletePdfCacheIndexIfGeneration\b/,
    /\bpdfCacheLatestGenerationByTab\b/
  ],
  'tab latest discovery state must be generation-aware and compare-cleared'
);
requireAny(
  worker,
  [
    /\brecoverExactPdfGeneration\b/,
    /\bgetCachedPdfByGeneration\b/,
    /\bgetSealedPdfGeneration\b/,
    /\bsealedPdfGeneration\b/
  ],
  'operation recovery must read an exact owned sealed PDF generation'
);

// The authoritative physical PDF object must no longer be only one mutable tab:<id> slot.
const keyFunction = around(worker, 'function pdfCacheKey', 2500);
if (/return\s+`tab:\$\{tabId\}`/.test(keyFunction) &&
    !/\bsealedPdfGeneration\b|\bpdfCacheGeneration\b|\boperationOwnedPdf\b/.test(worker)) {
  fail('tab:<id> cannot remain the sole authoritative PDF byte identity');
}

// URL may remain metadata/UX but cannot be the only live-source predicate.
const validLookup = around(worker, 'async function getValidCachedPdfForTab', 7000);
if (validLookup &&
    /currentUrl\s*!==\s*cachedUrl|currentUrl\s*===\s*cachedUrl/.test(validLookup) &&
    !/sourceGenerationReceipt|sourceReceipt|browserDocumentId/.test(validLookup)) {
  fail('current URL equality cannot be the sole cache source-identity check');
}

// P0-079 positive control: offscreen exact transfer must use the requested cache key;
// no implicit current-tab read/fallback is allowed.
requireMatch(
  offscreen,
  /getPdfCacheRecord\(String\(spec\.pdfCacheKey\s*\|\|\s*['"]['"]\)/,
  'offscreen PDF transfer must continue reading the exact requested cache key'
);

// Legacy rows must not manufacture exact document provenance from current mutable tab state.
if (/sourceGenerationReceipt\s*:\s*\{[\s\S]{0,1000}(?:getChromeTabBounded|chrome\.tabs\.get)/.test(worker)) {
  fail('legacy URL/tab cache must not synthesize exact source receipt from current tab');
}

console.log('P0-023 exact source-document cache source gate: PASS');
