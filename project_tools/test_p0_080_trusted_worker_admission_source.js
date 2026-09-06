'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const content = fs.readFileSync('content.js', 'utf8');
const sw = fs.readFileSync('service-worker.js', 'utf8');

assert.match(content, /applicationGeneration|applicationAuthority/i,
  'RED: content state has no explicit same-document application generation');
assert.match(content, /selectionRevision|selectionAuthorityReceipt/i,
  'RED: content state has no explicit selection revision/receipt');

const sendNeedle = "type: 'WEBCLIP_GENERATE_PDF'";
const sendIndex = content.indexOf(sendNeedle);
assert.notEqual(sendIndex, -1, 'missing WEBCLIP_GENERATE_PDF send path');
const beforeSend = content.slice(Math.max(0, sendIndex - 4000), sendIndex + 500);
assert.match(beforeSend, /prepareForPrint\s*\(/,
  'baseline drift: expected prepareForPrint before generate command');
assert.match(beforeSend, /validate.*Selection|assert.*Selection|selectionAuthorityReceipt|validate.*Application|assert.*Application/i,
  'RED: no source-visible final application/selection receipt validation after asynchronous preparation and before send');
assert.match(beforeSend, /selectionAuthorityReceipt|applicationGeneration|selectionRevision/i,
  'RED: generate command path does not carry exact content selection/application receipt');

const handlerNeedle = "case 'WEBCLIP_GENERATE_PDF'";
const handlerStart = sw.indexOf(handlerNeedle);
assert.notEqual(handlerStart, -1, 'missing WEBCLIP_GENERATE_PDF worker handler');
const handler = sw.slice(handlerStart, handlerStart + 2600);
assert.match(handler, /sender\.documentId/,
  'RED: worker save admission does not bind browser-provided sender.documentId');
assert.match(handler, /sender\.frameId|frameId/,
  'RED: worker save admission does not source-visibly enforce sender frame authority');
assert.match(handler, /selectionAuthorityReceipt|applicationGeneration|selectionRevision/i,
  'RED: worker handler does not validate exact content-side application/selection receipt');
assert.match(handler, /workerSelectionAdmission|saveAdmissionReceipt|sourceAuthorityReceipt|documentGeneration/i,
  'RED: worker does not create a trusted admission envelope for handoff to full-save generation');

// Caller-provided documentId must not be the browser identity authority.
assert.doesNotMatch(handler, /message\.(?:meta\.)?documentId\s*\|\|\s*sender\.documentId/,
  'RED: caller documentId can override/fallback into browser sender identity');

console.log('P0-080 trusted worker admission source gate: PASS');
