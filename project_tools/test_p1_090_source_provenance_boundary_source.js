'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const sw = fs.readFileSync('service-worker.js', 'utf8');

const locateStart = sw.indexOf('async function findYandexFileForJournalEntry');
assert.notEqual(locateStart, -1, 'missing findYandexFileForJournalEntry');
const locateEnd = sw.indexOf('\nasync function ', locateStart + 24);
const locate = sw.slice(locateStart, locateEnd === -1 ? sw.length : locateEnd);

// Current locator is allowed to observe a stored path, but destructive move
// admission must not turn that observation into provenance by itself.
assert.match(sw, /sourceIdentityProvenance|destructiveProvenance|yandexObjectProvenance|trustedRemoteObjectReceipt/i,
  'RED: runtime has no source-visible destructive provenance receipt distinct from locator values');

assert.match(sw, /expectedSourceResourceId|moveExpectedResourceId|moveIdentityReceipt/i,
  'RED: move path has no frozen exact source identity to consume after provenance admission');

// Imported locator fields are bounded data, not destructive capability. The
// destructive path must visibly distinguish imported/untrusted provenance.
assert.match(sw, /imported.*provenance|provenance.*imported|destructive.*trusted|trusted.*remote.*object/i,
  'RED: no source-visible imported/legacy provenance fence before destructive Yandex targeting');

// A path-only locator branch must not be the sole condition that grants a move.
const moveStart = sw.indexOf('async function moveJournalYandexFileToTrash');
assert.notEqual(moveStart, -1, 'missing moveJournalYandexFileToTrash');
const moveEnd = sw.indexOf('\nasync function ', moveStart + 24);
const moveBody = sw.slice(moveStart, moveEnd === -1 ? sw.length : moveEnd);
assert.match(moveBody, /provenance|expectedSourceResourceId|moveIdentityReceipt/i,
  'RED: Trash move starts from located path without source-visible destructive provenance/exact identity admission');

// Existing locator's path fallback is a positive observation mechanism, but
// it must not be described in source as sufficient exact destructive identity.
assert.doesNotMatch(moveBody, /findYandexFileForJournalEntry\([\s\S]{0,1200}\/resources\/move[\s\S]{0,300}(?:resource_id\s*\|\||moved\.resource_id)/,
  'RED: located current path can flow directly into destructive move/final identity without a visible provenance receipt');

console.log('P1-090 source provenance boundary source gate: PASS');
