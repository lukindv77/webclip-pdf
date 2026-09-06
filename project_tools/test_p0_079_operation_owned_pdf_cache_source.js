'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const sw = fs.readFileSync('service-worker.js', 'utf8');
const offscreen = fs.readFileSync('offscreen.js', 'utf8');

// P0-079 target: PDF bytes are immutable operation-owned generations. A tab id
// may remain an index, but it must not be the physical Blob/object identity.
assert.doesNotMatch(sw, /function\s+pdfCacheKey\s*\(tabId\)[\s\S]{0,160}return\s+`tab:\$\{tabId\}`/,
  'RED: physical PDF cache identity is still the mutable tab:<id> alias');

assert.match(sw, /pdfCacheGeneration|pdfCacheReceipt|operationOwnedPdfCache/i,
  'RED: service worker has no explicit operation-owned PDF cache generation/receipt');
assert.match(sw, /sealed|createOnce|immutablePdf/i,
  'RED: cache generation has no source-visible sealed/create-once invariant');

const retryStart = sw.indexOf('async function retryUpload');
assert.notEqual(retryStart, -1, 'missing retryUpload');
const retryEnd = sw.indexOf('\nasync function ', retryStart + 24);
const retryBody = sw.slice(retryStart, retryEnd === -1 ? sw.length : retryEnd);
assert.doesNotMatch(retryBody, /getValidCachedPdfForTab\s*\(tabId\)/,
  'RED: retry still selects bytes by tabId rather than exact cache receipt');
assert.match(retryBody, /pdfCacheGeneration|pdfCacheReceipt|cacheKey/i,
  'RED: retry path does not carry an exact operation-owned cache receipt');

const uploadStart = sw.indexOf('async function uploadCachedRecordToYandex');
assert.notEqual(uploadStart, -1, 'missing uploadCachedRecordToYandex');
const uploadEnd = sw.indexOf('\nasync function ', uploadStart + 24);
const uploadBody = sw.slice(uploadStart, uploadEnd === -1 ? sw.length : uploadEnd);
assert.doesNotMatch(uploadBody, /pdfCacheKey\s*:\s*String\(cached\.key\s*\|\|\s*pdfCacheKey\(tabId\)\)/,
  'RED: signed offscreen transfer can fall back to mutable tab cache identity');
assert.doesNotMatch(uploadBody, /deleteCachedPdf\s*\(tabId\)/,
  'RED: late operation completion can delete the current replacement tab slot');
assert.match(uploadBody, /pdfCacheGeneration|pdfCacheReceipt/i,
  'RED: upload path does not bind signed transfer to exact PDF cache generation');

const signedStart = offscreen.indexOf('async function handleSignedTransfer');
assert.notEqual(signedStart, -1, 'missing handleSignedTransfer');
const signedBody = offscreen.slice(signedStart);
assert.match(signedBody, /pdfCacheGeneration|pdfCacheReceipt/i,
  'RED: offscreen transfer receives no expected PDF cache generation');
assert.match(signedBody, /expectedPdfBytes|pdfByteLength/i,
  'RED: offscreen transfer does not source-visibly bind exact expected byte size to the generation');
assert.match(signedBody, /sealed/i,
  'RED: offscreen transfer does not require a sealed immutable cache record');

// A missing exact generation must fail; source must not provide a tab/latest
// fallback inside the offscreen byte resolution path.
assert.doesNotMatch(signedBody, /pdf-cache-upload[\s\S]{0,2400}tab:/,
  'RED: offscreen PDF upload path contains tab-alias fallback semantics');

console.log('P0-079 operation-owned PDF cache source gate: PASS');
