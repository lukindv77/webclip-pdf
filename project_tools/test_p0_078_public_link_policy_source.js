'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const sw = fs.readFileSync('service-worker.js', 'utf8');

function functionSlice(name, nextName) {
  const startNeedle = `async function ${name}`;
  const start = sw.indexOf(startNeedle);
  assert.notEqual(start, -1, `missing ${startNeedle}`);
  if (!nextName) return sw.slice(start);
  const endNeedle = `async function ${nextName}`;
  const end = sw.indexOf(endNeedle, start + startNeedle.length);
  assert.notEqual(end, -1, `missing ${endNeedle}`);
  return sw.slice(start, end);
}

// Target P0-078 runtime must expose durable versioned publication policy
// authority and operation-owned publication receipts/phases.
assert.match(sw, /publicLinkPolicy/,
  'RED: current runtime has no durable publicLinkPolicy generation authority');
assert.match(sw, /publicationPolicyReceipt/,
  'RED: remote-save checkpoints have no exact publication-policy receipt');
assert.match(sw, /publicationPhase/,
  'RED: remote-save checkpoints have no durable publication admission phase');

const prefs = functionSlice('saveYandexPreferences', 'getYandexStatus');
assert.match(prefs, /publicLinkPolicy/,
  'RED: dedicated preference writer does not advance publication policy generation');

const importStart = sw.indexOf('async function importUserSettings');
assert.notEqual(importStart, -1, 'missing importUserSettings');
const importEnd = sw.indexOf('\nasync function ', importStart + 24);
const importBody = sw.slice(importStart, importEnd === -1 ? sw.length : importEnd);
assert.match(importBody, /publicLinkPolicy/,
  'RED: settings import does not advance the same publication policy generation');

const recovery = functionSlice('recoverPendingRemoteSaves', 'normalizePendingLocalDownloadKey');
assert.doesNotMatch(recovery, /current\.createPublicLinks\s*&&\s*!publicUrl/,
  'RED: recovery can start publication from an old checkpoint Boolean');
assert.match(recovery, /revoked-before-admission|revokedBeforeAdmission/,
  'RED: recovery has no durable revoked-before-admission outcome');

const uploadStart = sw.indexOf('async function uploadCachedRecordToYandex');
assert.notEqual(uploadStart, -1, 'missing uploadCachedRecordToYandex');
const uploadEnd = sw.indexOf('\nasync function ', uploadStart + 24);
const uploadBody = sw.slice(uploadStart, uploadEnd === -1 ? sw.length : uploadEnd);
assert.doesNotMatch(uploadBody, /if \(config\.createPublicLinks\)/,
  'RED: upload still gates publish on a stale Boolean snapshot instead of exact-generation admission');
assert.match(uploadBody, /publicationPhase|admit.*Publication|publication.*admit/i,
  'RED: upload has no durable publication admission boundary');

console.log('P0-078 public-link policy source gate: PASS');
