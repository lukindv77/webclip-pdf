'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const sw = fs.readFileSync('service-worker.js', 'utf8');

assert.match(sw, /WebClipSha256/,
  'baseline drift: incremental SHA-256 primitive must remain available');
assert.match(sw, /expectedSha256|pdfSha256|contentDigest|remoteContentReceipt/i,
  'RED: remote-save checkpoint has no operation-owned PDF digest');

const uploadStart = sw.indexOf('async function uploadCachedRecordToYandex');
assert.notEqual(uploadStart, -1, 'missing uploadCachedRecordToYandex');
const uploadEnd = sw.indexOf('\nasync function ', uploadStart + 24);
const upload = sw.slice(uploadStart, uploadEnd === -1 ? sw.length : uploadEnd);

assert.match(upload, /fields[^\n]{0,300}sha256/i,
  'RED: Yandex resource metadata request does not ask for sha256');
assert.match(upload, /expectedSha256|contentDigest|verifyYandexRemoteContent/i,
  'RED: upload/reuse path has no exact content verification');
assert.doesNotMatch(upload,
  /allowExisting[\s\S]{0,3000}assertExactYandexRemoteByteSize[\s\S]{0,900}existingFileReused\s*=\s*true/,
  'RED: allowExisting can still adopt a same-size object without content proof');

assert.match(sw, /function\s+verifyYandexRemoteContent|async function\s+verifyYandexRemoteContent/,
  'RED: no single remote-content verification owner is source-visible');
assert.match(sw, /yandex-metadata-sha256|providerSha256/i,
  'RED: no provider SHA-256 fast-path receipt is source-visible');
assert.match(sw, /remote-download-sha256|\/resources\/download[\s\S]{0,6000}WebClipSha256/i,
  'RED: no bounded remote-download SHA-256 fallback is source-visible');

const recoveryStart = sw.indexOf('async function recoverPendingRemoteSaves');
assert.notEqual(recoveryStart, -1, 'missing recoverPendingRemoteSaves');
const recoveryEnd = sw.indexOf('\nfunction normalizePendingLocalDownloadKey', recoveryStart);
const recovery = sw.slice(recoveryStart, recoveryEnd === -1 ? sw.length : recoveryEnd);
assert.match(recovery, /verifyYandexRemoteContent|expectedSha256|remoteContentReceipt/i,
  'RED: recovery does not require exact remote content receipt');
assert.doesNotMatch(recovery,
  /assertExactYandexRemoteByteSize[\s\S]{0,2200}markPendingRemoteSaveVerified/,
  'RED: recovery can still reach verified from size-only metadata path');

assert.match(sw, /resourceId|resource_id/,
  'RED: exact content receipt must remain bound to stable remote object identity');

console.log('P1-184 Yandex provider checksum source gate: PASS');
