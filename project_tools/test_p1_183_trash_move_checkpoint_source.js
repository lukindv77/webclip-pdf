'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const sw = fs.readFileSync('service-worker.js', 'utf8');

const trashStart = sw.indexOf('async function moveJournalYandexFileToTrash');
assert.notEqual(trashStart, -1, 'missing moveJournalYandexFileToTrash');
const trashEnd = sw.indexOf('\nasync function ', trashStart + 24);
const trash = sw.slice(trashStart, trashEnd === -1 ? sw.length : trashEnd);

assert.match(trash, /\/resources\/move/,
  'baseline drift: Trash move mutation not found');
assert.match(trash, /trashMoveReceipt|trashMovePending|trashMoveTargetPath|deleteMoveCheckpoint/i,
  'RED: Trash move has no durable source-visible move checkpoint');
assert.match(trash, /expectedSourceResourceId|moveExpectedResourceId|sourceObjectReceipt|moveIdentityReceipt/i,
  'RED: Trash checkpoint does not freeze exact source object identity');
assert.match(trash, /targetPath/,
  'RED: Trash checkpoint does not preserve exact chosen target');

// The checkpoint must be committed before the destructive mutation is invoked.
const checkpointMatch = trash.search(/trashMoveReceipt|trashMovePending|deleteMoveCheckpoint/i);
const moveMatch = trash.indexOf("'/resources/move'");
assert.ok(checkpointMatch !== -1 && moveMatch !== -1 && checkpointMatch < moveMatch,
  'RED: durable Trash checkpoint is not visibly created before /resources/move');

// Sibling mark-read checkpoint remains a positive architectural control.
assert.match(sw, /readMovePendingAt/,
  'baseline drift: sibling read-move checkpoint disappeared');
assert.match(sw, /readMoveSourcePath/,
  'baseline drift: sibling read-move source checkpoint disappeared');
assert.match(sw, /readMoveTargetPath/,
  'baseline drift: sibling read-move target checkpoint disappeared');

// Recovery/finalization needs an explicit local-only path once remote exact
// object verification has succeeded; otherwise retry can re-enter move.
assert.match(sw, /local-finalization-pending|verified-same-object|trashMoveVerified|trashMovePhase/i,
  'RED: Trash receipt has no verified/local-finalization phase');

const deleteStart = sw.indexOf('async function deleteJournalEntry(');
assert.notEqual(deleteStart, -1, 'missing deleteJournalEntry');
const deleteEnd = sw.indexOf('\nasync function ', deleteStart + 24);
const deleteBody = sw.slice(deleteStart, deleteEnd === -1 ? sw.length : deleteEnd);
assert.match(deleteBody, /revision|generation|compare|CAS|expectedJournal/i,
  'RED: Trash local finalization does not source-visibly consume an exact Journal revision/generation fence');

console.log('P1-183 Trash move checkpoint source gate: PASS');
