'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const sw = fs.readFileSync('service-worker.js', 'utf8');
const offscreen = fs.readFileSync('offscreen.js', 'utf8');

function readNumericConst(source, name) {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*(\\d+)\\s*;`));
  assert.ok(match, `missing numeric constant ${name}`);
  return Number(match[1]);
}

const swVersion = readNumericConst(sw, 'PDF_CACHE_DB_VERSION');
const offscreenVersion = readNumericConst(offscreen, 'PDF_CACHE_DB_VERSION');
assert.strictEqual(swVersion, offscreenVersion,
  'RED: service worker and offscreen must request the same PDF cache DB version');
assert.ok(swVersion >= 4,
  'RED: PDF cache schema has not advanced to the v4 exact-generation contract');

assert.match(sw, /PDF_CACHE_(?:RETRY_)?INDEX_STORE|retryIndex/i,
  'RED: service worker has no dedicated tab -> exact-generation retry index');
assert.match(offscreen, /PDF_CACHE_(?:RETRY_)?INDEX_STORE|retryIndex/i,
  'RED: offscreen has no source-visible v4 cache schema awareness');

assert.doesNotMatch(sw,
  /function\s+pdfCacheKey\s*\(tabId\)[\s\S]{0,180}return\s+`tab:\$\{tabId\}`/,
  'RED: physical PDF object identity is still tab:<id>');
assert.match(sw, /pdfCacheGeneration|pdfGeneration|pdfCacheReceipt/i,
  'RED: service worker has no exact PDF generation receipt');
assert.match(sw, /sha256|expectedSha256/i,
  'RED: sealed PDF metadata has no source-visible SHA-256 integrity receipt');
assert.match(sw, /sealed/i,
  'RED: sealed immutable PDF-generation invariant is not visible');

const writerStart = sw.search(/async\s+function\s+(?:putCachedPdf|createSealedPdf|create.*PdfCache)/i);
assert.notEqual(writerStart, -1, 'missing PDF cache writer');
const writerEnd = sw.indexOf('\nasync function ', writerStart + 24);
const writerBody = sw.slice(writerStart, writerEnd === -1 ? sw.length : writerEnd);
assert.match(writerBody, /objectStore\(PDF_CACHE_STORE\)\.add\s*\(|createOnce|generation-conflict|ConstraintError/i,
  'RED: payload generation creation is not visibly create-once');
assert.match(writerBody, /objectStore\(PDF_CACHE_META_STORE\)\.add\s*\(|createOnce|generation-conflict|ConstraintError/i,
  'RED: metadata generation creation is not visibly create-once');
assert.match(writerBody, /retryIndex|PDF_CACHE_(?:RETRY_)?INDEX_STORE/i,
  'RED: generation creation does not atomically publish/update the retry index');

assert.match(sw, /legacy-unbound|legacy.*cache.*unbound|cacheFormat.*blob-v3/i,
  'RED: v4 rollout has no explicit legacy v3 unbound/fail-closed handling');
assert.doesNotMatch(sw, /legacy[\s\S]{0,800}(?:sourceReceipt|browserDocumentId)[\s\S]{0,400}(?:current|tabs\.get)/i,
  'RED: legacy rows appear to synthesize exact source authority from current mutable state');

const retryHandler = sw.match(/case\s+['"]WEBCLIP_RETRY_PDF_TO_YANDEX['"][\s\S]{0,1800}?case\s+['"]/i)?.[0]
  || sw.match(/case\s+['"]WEBCLIP_RETRY_PDF_TO_YANDEX['"][\s\S]{0,1800}/i)?.[0]
  || '';
assert.ok(retryHandler, 'missing Yandex PDF retry handler');
assert.match(retryHandler, /sender\.documentId|sourceReceipt|sourceGeneration/i,
  'RED: live retry does not consume exact current source/document authority');
assert.doesNotMatch(retryHandler, /getValidCachedPdfForTab\s*\(tabId\)/,
  'RED: live retry still resolves authority only by tab id');

const uploadStart = sw.indexOf('async function uploadCachedRecordToYandex');
assert.notEqual(uploadStart, -1, 'missing uploadCachedRecordToYandex');
const uploadEnd = sw.indexOf('\nasync function ', uploadStart + 24);
const uploadBody = sw.slice(uploadStart, uploadEnd === -1 ? sw.length : uploadEnd);
assert.match(uploadBody, /pdfCacheGeneration|pdfGeneration|pdfCacheReceipt/i,
  'RED: Yandex upload does not bind exact PDF generation');
assert.match(uploadBody, /expectedPdfBytes|pdfByteLength/i,
  'RED: upload does not bind expected PDF byte length');
assert.match(uploadBody, /expectedSha256|sha256/i,
  'RED: upload does not bind expected PDF SHA-256');
assert.doesNotMatch(uploadBody, /cached\.key\s*\|\|\s*pdfCacheKey\(tabId\)/,
  'RED: upload retains mutable tab-key fallback');

const signedStart = offscreen.indexOf('async function handleSignedTransfer');
assert.notEqual(signedStart, -1, 'missing offscreen handleSignedTransfer');
const signedBody = offscreen.slice(signedStart);
assert.match(signedBody, /pdfCacheGeneration|pdfGeneration|pdfCacheReceipt/i,
  'RED: offscreen does not receive expected exact PDF generation');
assert.match(signedBody, /expectedPdfBytes|pdfByteLength/i,
  'RED: offscreen does not validate exact expected byte length');
assert.match(signedBody, /expectedSha256|sha256/i,
  'RED: offscreen does not validate expected SHA-256 receipt');
assert.match(signedBody, /sealed/i,
  'RED: offscreen does not require sealed generation metadata');
assert.doesNotMatch(signedBody, /pdf-cache-upload[\s\S]{0,3200}(?:tab:|latest)/i,
  'RED: offscreen PDF upload exposes tab/latest fallback semantics');

assert.match(sw, /delete.*Pdf.*(?:ByKey|Generation|Exact)/i,
  'RED: exact-generation cache deletion is not visible');
assert.match(sw, /retryIndex[\s\S]{0,1000}(?:compare|===|==).*generation|pointer[\s\S]{0,1000}(?:===|==).*key/i,
  'RED: stale cleanup has no visible compare-and-remove protection for a newer retry pointer');

console.log('Wave 1 P0-079 PDF cache v4 source contract: PASS');
