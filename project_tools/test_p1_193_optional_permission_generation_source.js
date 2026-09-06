'use strict';

const fs = require('fs');
const path = require('path');

const popup = fs.readFileSync(path.resolve(__dirname, '..', 'popup.js'), 'utf8');
const worker = fs.readFileSync(path.resolve(__dirname, '..', 'service-worker.js'), 'utf8');
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

function functionSlice(source, name, maxChars = 26000) {
  const start = source.indexOf(`function ${name}`);
  if (start < 0) return '';
  return source.slice(start, start + maxChars);
}

requireSource(/framePermissionCandidate|FRAME_PERMISSION_CANDIDATE_VERSION/.test(popup) || /framePermissionCandidate|FRAME_PERMISSION_CANDIDATE_VERSION/.test(worker),
  'missing versioned frame-permission candidate receipt');
requireSource(/topDocumentId|documentId/.test(popup) && /topDocumentId|documentId/.test(worker),
  'permission flow lacks exact top-document generation');

const collect = functionSlice(popup, 'collectCrossOriginFrameOrigins');
requireSource(Boolean(collect), 'cannot locate collectCrossOriginFrameOrigins()');
requireSource(/MAX_FRAME_PERMISSION_ORIGINS_PER_REQUEST/.test(popup),
  'existing bounded origin-count positive control disappeared');

const grantIndex = popup.indexOf('grantFrameAccessButton?.addEventListener');
const grantArea = grantIndex >= 0 ? popup.slice(grantIndex, grantIndex + 18000) : '';
requireSource(Boolean(grantArea), 'cannot locate frame permission grant click handler');
requireSource(/chrome\.permissions\.request/.test(grantArea),
  'grant click no longer requests optional host permission');
requireSource(/framePermissionCandidate|candidate/.test(grantArea),
  'grant click does not consume a previously discovered immutable candidate');
requireSource(!/const\s+origins\s*=\s*await\s+collectCrossOriginFrameOrigins[\s\S]{0,5000}chrome\.permissions\.request/.test(grantArea),
  'grant click still performs asynchronous discovery before permissions.request()');
requireSource(/stale-document|documentId|topDocumentId/.test(grantArea) || /stale-document|documentId|topDocumentId/.test(worker),
  'granted candidate lacks stale-document rejection');

const enable = functionSlice(worker, 'enableFrameAgentsForTab');
requireSource(Boolean(enable), 'cannot locate enableFrameAgentsForTab()');
requireSource(/documentId|topDocumentId|candidate/.test(enable),
  'worker frame-agent enablement still accepts tabId without exact candidate document authority');
requireSource(!/target:\s*\{\s*tabId:\s*id,\s*allFrames:\s*true\s*\}/.test(enable) || /documentIds|expectedDocumentId/.test(enable),
  'worker can still inject allFrames into whichever document is current by bare tabId');

// Existing sender and origin safety controls remain positive controls.
requireSource(/senderKind\s*!==\s*'extension'/.test(worker),
  'extension-sender guard for frame enablement disappeared');
requireSource(/normalizeFrameOrigin/.test(popup) && /frameHostPermissionPattern/.test(popup),
  'HTTP(S) origin normalization/permission-pattern positive controls disappeared');

if (failures.length) {
  console.error('P1-193 optional permission/document generation source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-193 optional permission/document generation source gate: PASS');
