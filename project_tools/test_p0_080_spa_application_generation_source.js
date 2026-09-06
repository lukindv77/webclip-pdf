'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const content = fs.readFileSync('content.js', 'utf8');

// P0-080 target: selection authority has an application generation distinct
// from browser documentId/current URL and performs direct live-node admission.
assert.match(content, /applicationGeneration|applicationAuthorityGeneration/i,
  'RED: content selection state has no explicit same-document application generation');
assert.match(content, /selectionRevision|selectionAuthorityReceipt/i,
  'RED: content selection/review state has no exact revision/receipt');
assert.match(content, /selectionAuthorityReceipt|applicationAuthorityReceipt/i,
  'RED: save metadata has no exact selection/application authority receipt');

const totalStart = content.indexOf('function totalIncludeCount');
assert.notEqual(totalStart, -1, 'missing totalIncludeCount');
const totalEnd = content.indexOf('\n  function ', totalStart + 20);
const totalBody = content.slice(totalStart, totalEnd === -1 ? content.length : totalEnd);
assert.doesNotMatch(totalBody, /return\s+state\.includes\.size\s*\+/,
  'RED: disconnected local Include entries still count as save authority through Map.size');
assert.match(totalBody, /isConnected|liveSelection|currentSelection/i,
  'RED: total/save admission does not source-visibly distinguish live selected roots');

const serializeStart = content.indexOf('function serializeSelectionSnapshot');
assert.notEqual(serializeStart, -1, 'missing serializeSelectionSnapshot');
const serializeEnd = content.indexOf('\n  function ', serializeStart + 30);
const serializeBody = content.slice(serializeStart, serializeEnd === -1 ? content.length : serializeEnd);
assert.match(serializeBody, /isConnected|assert.*Selection|liveSelection|admit.*Selection/i,
  'RED: selection snapshot serializes Map entries without mandatory liveness admission');

const metaStart = content.indexOf('function buildSaveMeta');
assert.notEqual(metaStart, -1, 'missing buildSaveMeta');
const metaEnd = content.indexOf('\n  function ', metaStart + 20);
const metaBody = content.slice(metaStart, metaEnd === -1 ? content.length : metaEnd);
assert.match(metaBody, /applicationGeneration|selectionAuthorityReceipt|applicationAuthorityReceipt/i,
  'RED: save metadata combines current href with selection snapshot but carries no generation receipt');

// Route detection implementation may use Navigation API/popstate/hashchange or
// another isolated-world signal. Regardless of event coverage, a boundary href
// comparison must remain visible in the save-admission path.
assert.match(content, /same-document-navigation|application-generation|applicationGeneration/i,
  'RED: no source-visible same-document transition semantics');
assert.match(content, /location\.href/,
  'content must retain a bounded current route observation for boundary comparison');

// Presentation-only handling is insufficient: existing isConnected checks in
// outline code do not count as authority unless an explicit stale outcome exists.
assert.match(content, /selection-stale|staleSelection|selectionStale/i,
  'RED: content has no explicit stale-selection authority outcome/state');

console.log('P0-080 SPA/application generation source gate: PASS');
