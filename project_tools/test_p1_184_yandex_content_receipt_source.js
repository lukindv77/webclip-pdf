'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const sw = fs.readFileSync('service-worker.js', 'utf8');

assert.match(sw, /WebClipSha256/,
  'baseline drift: incremental SHA-256 primitive is no longer available in worker');
assert.match(sw, /pdfSha256|expectedSha256|contentDigest|remoteContentReceipt/i,
  'RED: remote-save checkpoint/runtime has no exact PDF content digest receipt');

const uploadStart = sw.indexOf('async function uploadCachedRecordToYandex');
assert.notEqual(uploadStart, -1, 'missing uploadCachedRecordToYandex');
const uploadEnd = sw.indexOf('\nasync function ', uploadStart + 24);
const upload = sw.slice(uploadStart, uploadEnd === -1 ? sw.length : uploadEnd);

// Retry existing-file adoption must no longer be authorized by size alone.
assert.doesNotMatch(upload, /allowExisting[\s\S]{0,2600}assertExactYandexRemoteByteSize[\s\S]{0,900}existingFileReused\s*=\s*true/,
  'RED: allowExisting still adopts same-path file after byte-size check without exact content proof');
assert.match(upload, /expectedSha256|contentDigest|verify.*Remote.*Content|remoteContentReceipt/i,
  'RED: upload/retry path has no exact content verification before adoption');

const recoveryStart = sw.indexOf('async function recoverPendingRemoteSaves');
assert.notEqual(recoveryStart, -1, 'missing recoverPendingRemoteSaves');
const recoveryEnd = sw.indexOf('\nfunction normalizePendingLocalDownloadKey', recoveryStart);
const recovery = sw.slice(recoveryStart, recoveryEnd === -1 ? sw.length : recoveryEnd);
assert.match(recovery, /expectedSha256|contentDigest|verify.*Remote.*Content|remoteContentReceipt/i,
  'RED: remote recovery has no exact content receipt/digest validation');
assert.doesNotMatch(recovery, /assertExactYandexRemoteByteSize[\s\S]{0,1800}markPendingRemoteSaveVerified/,
  'RED: recovery can still reach remote-verified from size-based metadata path without visible content proof');

// A provider-agnostic exact-content verifier may use a documented provider
// checksum or bounded download+SHA-256. Current project already has a download
// API path, so source should make one exact verification route explicit.
assert.match(sw, /\/resources\/download|providerChecksum|remote.*sha256/i,
  'RED: no source-visible route to verify exact remote bytes/content');
assert.match(sw, /resourceId|resource_id/,
  'RED: exact content receipt is not bound to stable remote object identity');

console.log('P1-184 Yandex content receipt source gate: PASS');
