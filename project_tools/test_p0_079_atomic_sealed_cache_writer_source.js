'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const sw = fs.readFileSync('service-worker.js', 'utf8');

const start = sw.indexOf('async function putCachedPdf');
assert.notEqual(start, -1, 'missing putCachedPdf');
const end = sw.indexOf('\nasync function ', start + 24);
const body = sw.slice(start, end === -1 ? sw.length : end);

// Current baseline uses replace-capable put() for both stores. P0-079 target
// must make generation creation create-once, or expose an equivalent exact
// in-transaction conflict/CAS path before any replacement-capable write.
const payloadPut = /objectStore\(PDF_CACHE_STORE\)\.put\s*\(/.test(body);
const metaPut = /objectStore\(PDF_CACHE_META_STORE\)\.put\s*\(/.test(body);
const payloadAdd = /objectStore\(PDF_CACHE_STORE\)\.add\s*\(/.test(body);
const metaAdd = /objectStore\(PDF_CACHE_META_STORE\)\.add\s*\(/.test(body);
const explicitConflictGuard = /duplicate-generation|generation-conflict|createOnce|sealed.*conflict|existing.*generation/i.test(body);

assert.ok(
  (payloadAdd && metaAdd) || ((!payloadPut && !metaPut) && explicitConflictGuard) || explicitConflictGuard,
  'RED: putCachedPdf still has replace-capable generation creation without a visible create-once/conflict invariant'
);

assert.match(body, /PDF_CACHE_STORE[\s\S]*PDF_CACHE_META_STORE|PDF_CACHE_META_STORE[\s\S]*PDF_CACHE_STORE/,
  'RED: payload and metadata generation are not visibly handled together');
assert.match(body, /generation|pdfCacheGeneration|pdfCacheReceipt/i,
  'RED: cache writer does not visibly validate exact operation-owned generation');
assert.match(body, /sealed|createOnce|immutablePdf/i,
  'RED: cache writer does not visibly enforce sealed generation semantics');

// Unknown local creation must have a reconciliation path instead of blind
// replacement under the same exact generation.
assert.match(sw, /reconcile.*PdfCache|readExact.*PdfCache|reconcile.*CacheGeneration|existing.*sealed.*generation/is,
  'RED: runtime has no source-visible exact-generation reconciliation for unknown cache creation settlement');

console.log('P0-079 atomic sealed cache writer source gate: PASS');
