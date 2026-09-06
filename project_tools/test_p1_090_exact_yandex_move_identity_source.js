'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const sw = fs.readFileSync('service-worker.js', 'utf8');

const locateStart = sw.indexOf('async function findYandexFileForJournalEntry');
assert.notEqual(locateStart, -1, 'missing findYandexFileForJournalEntry');
const locateEnd = sw.indexOf('\nasync function ', locateStart + 24);
const locate = sw.slice(locateStart, locateEnd === -1 ? sw.length : locateEnd);

// Positive control: current locator already knows durable identity is stronger
// than path and rejects a conflicting resource id.
assert.match(locate, /expectedResourceId/,
  'baseline drift: locator lost expected resourceId authority');
assert.match(locate, /itemId\s*!==\s*expectedResourceId|expectedResourceId\s*!==\s*itemId/,
  'baseline drift: locator no longer visibly rejects conflicting resourceId');

// Target P1-090: destructive move receipts must freeze pre-move source object
// identity, not only source/target paths.
assert.match(sw, /expectedSourceResourceId|moveExpectedResourceId|sourceObjectReceipt|moveIdentityReceipt/i,
  'RED: destructive Yandex move has no durable pre-move exact source identity receipt');

// A target file existing at the chosen path is not same-object proof.
assert.doesNotMatch(sw, /if\s*\(moved\?\.type\s*===\s*['"]file['"]\)\s*break/,
  'RED: destructive move verification still accepts any target file without comparing pre-move exact identity');

// The target resource_id must be compared to the frozen pre-move expected id.
assert.match(sw, /moved\?\.resource_id|moved\.resource_id/,
  'RED: target move verification does not inspect resource_id');
assert.match(sw, /expectedSourceResourceId|moveExpectedResourceId|sourceObjectReceipt|moveIdentityReceipt/i,
  'RED: no expected source identity is available for target comparison');
assert.match(sw, /identity-conflict|resource-id-mismatch|same-object|sameObject|MOVE_IDENTITY/i,
  'RED: destructive move path has no explicit exact-object conflict outcome');

// Existing mark-read recovery checkpoint must grow beyond paths/operation text.
const checkpointIndex = sw.indexOf('readMoveSourcePath:');
assert.notEqual(checkpointIndex, -1, 'missing read-move checkpoint');
const checkpointSlice = sw.slice(Math.max(0, checkpointIndex - 1200), checkpointIndex + 2200);
assert.match(checkpointSlice, /resourceId|expectedSourceResourceId|moveExpectedResourceId|sourceObjectReceipt/i,
  'RED: mark-read move checkpoint does not freeze exact source object identity');

// Final Journal identity must be preserved from/proven equal to the source
// receipt; a newly observed different target id must not simply replace it.
assert.match(sw, /verified-same-object|sameObject|assert.*resourceId|expectedSourceResourceId|moveExpectedResourceId/i,
  'RED: Journal move finalization lacks source-visible same-object proof before adopting target metadata');

console.log('P1-090 exact Yandex move identity source gate: PASS');
