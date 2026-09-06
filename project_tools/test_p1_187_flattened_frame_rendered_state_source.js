'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const budget = fs.readFileSync(path.join(root, 'frame-proxy-budget-guard.js'), 'utf8');
const inert = fs.readFileSync(path.join(root, 'frame-proxy-inert-guard.js'), 'utf8');
const content = fs.readFileSync(path.join(root, 'content.js'), 'utf8');

const failures = [];
function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

// P1-187 must extend the already accepted P0-064 PRE-CLONE admission boundary.
requireSource(/function\s+preflightFlattenedBody\s*\(/.test(budget),
  'missing P0-064 preflightFlattenedBody() positive control');
requireSource(/MAX_RENDERED_STATE_NODES/.test(budget),
  'missing explicit rendered-state node budget before deep clone');
requireSource(/MAX_RENDERED_STATE_PIXELS/.test(budget),
  'missing explicit aggregate canvas pixel budget before deep clone');
requireSource(/MAX_RENDERED_STATE_BYTES/.test(budget),
  'missing explicit aggregate rendered-state byte budget before deep clone');
requireSource(/canvasNodes|renderedStateNodes/.test(budget),
  'preflight receipt does not expose rendered-state/canvas node count');
requireSource(/canvasPixels|renderedStatePixels/.test(budget),
  'preflight receipt does not expose aggregate canvas pixels');
requireSource(/canvasBytes|renderedStateBytes/.test(budget),
  'preflight receipt does not expose aggregate rendered-state bytes');
requireSource(/localName[^\n]{0,160}canvas|tagName[^\n]{0,160}canvas/i.test(budget),
  'preflight does not identify canvas nodes while walking the source tree');
requireSource(/Number\.isSafeInteger|safe integer|MAX_SAFE_INTEGER/.test(budget),
  'canvas dimension/pixel/byte arithmetic is not visibly fail-closed for unsafe integers');

// The inert mirror must preserve the current bitmap without exporting page pixels to JS strings.
requireSource(/drawImage\s*\(/.test(inert) || /drawImage\s*\(/.test(content),
  'flattened-frame path does not copy the source canvas bitmap');
requireSource(!/toDataURL\s*\(/.test(inert),
  'inert clone must not serialize page canvas pixels through toDataURL()');
requireSource(!/getImageData\s*\(/.test(inert),
  'inert clone must not read page canvas pixels through getImageData()');
requireSource(/WEBCLIP_FLATTENED_FRAME_RENDERED_STATE_COPY_FAILED/.test(inert + content),
  'canvas copy failure lacks a dedicated fail-closed error contract');

// Current content.js catches each top-level deep clone. P1-187 must not silently turn a
// rendered-state copy failure into a partially populated proxy that can still be connected.
const cloneLoop = content.match(/for\s*\(const\s+node\s+of\s+\[\.\.\.sourceBody\.childNodes\]\)[\s\S]{0,900}/)?.[0] || '';
requireSource(Boolean(cloneLoop),
  'cannot locate flattened-frame sourceBody deep-clone loop');
requireSource(
  /WEBCLIP_FLATTENED_FRAME_RENDERED_STATE_COPY_FAILED/.test(cloneLoop) ||
    /throw\s+error|throw\s+err|throw\s+_/.test(cloneLoop),
  'deep-clone loop still appears able to swallow a rendered-state copy failure');

// Publication remains after the disconnected representation is fully prepared.
requireSource(/ownerDoc\.body\.appendChild\(proxy\)/.test(content),
  'missing flattened proxy publication anchor');

if (failures.length) {
  console.error('P1-187 flattened-frame rendered-state source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-187 flattened-frame rendered-state source gate: PASS');
