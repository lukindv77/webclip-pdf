'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const manifest = fs.readFileSync(path.join(root, 'manifest.json'), 'utf8');
const popup = fs.readFileSync(path.join(root, 'popup.js'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const content = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
const agent = fs.readFileSync(path.join(root, 'frame-agent.js'), 'utf8');
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

const permissionGeneration = /framePermissionGeneration|hostPermissionGeneration|permissionGeneration/i;
const revokedState = /permissionRevoked|revokedPermission|frameAgentRevoked|revocationState|permissionLifecycle/i;

// Positive controls from the current architecture that must remain.
requireSource(/optional_host_permissions/.test(manifest) && /https:\/\/\*\/\*/.test(manifest),
  'missing optional host permission manifest positive control');
requireSource(/chrome\.permissions\.request\s*\(\s*\{\s*origins/.test(popup),
  'missing user-gesture optional host permission request positive control');
requireSource(/chrome\.permissions\.contains/.test(worker) && /frameAgentHasGrantedHostPermission/.test(worker),
  'missing worker-side actual permission recheck positive control');
requireSource(/documentId/.test(worker), 'missing exact child-document identity positive control');
requireSource(/sender\?\.id\s*!==\s*chrome\.runtime\.id/.test(agent),
  'missing child extension-runtime sender boundary positive control');

// Target 1: permission lifecycle changes are event-driven, not only opportunistic.
requireSource(/chrome\.permissions\.onRemoved\.addListener/.test(worker),
  'worker has no chrome.permissions.onRemoved lifecycle handler');
requireSource(/chrome\.permissions\.onAdded\.addListener/.test(worker),
  'worker has no chrome.permissions.onAdded lifecycle handler for fresh re-grant generation');

// Target 2: worker registry authority is generation-bound.
requireSource(permissionGeneration.test(worker),
  'worker frame-agent registry/authority has no permission generation');
requireSource(
  /registerFrameAgent[\s\S]{0,12000}(?:framePermissionGeneration|hostPermissionGeneration|permissionGeneration)/i.test(worker),
  'frame-agent registration is not visibly bound to a permission generation'
);

// Target 3: STATE admission is generation-fenced, not boolean-permission-only.
requireSource(
  /forwardFrameAgentState[\s\S]{0,14000}(?:framePermissionGeneration|hostPermissionGeneration|permissionGeneration)/i.test(worker),
  'forwardFrameAgentState() does not validate permission generation'
);

// Target 4: ordinary command admission remains permission checked but cleanup has a separate revoke-only path.
requireSource(/sendFrameAgentCommand[\s\S]{0,9000}frameAgentHasGrantedHostPermission/.test(worker),
  'ordinary frame command permission recheck disappeared');
requireSource(
  /cleanup-only|revocation-cleanup|disable-revoked|revoke-frame-agent|permission-revoked/i.test(worker),
  'worker has no narrowly scoped cleanup-only revocation command path'
);
requireSource(
  /chrome\.tabs\.sendMessage[\s\S]{0,2500}(?:cleanup-only|revocation-cleanup|disable-revoked|revoke-frame-agent|permission-revoked)/i.test(worker),
  'revocation cleanup is not visibly delivered directly to the exact injected child'
);

// Target 5: child has an explicit local inert/revoked state transition.
requireSource(revokedState.test(agent), 'frame-agent has no explicit revoked/inert lifecycle state');
requireSource(
  /(?:revoke|disable)[A-Za-z]*\s*\([^)]*\)[\s\S]{0,5000}removeEventListener/i.test(agent),
  'child revocation transition does not visibly remove input listeners'
);
requireSource(
  /(?:revoke|disable)[A-Za-z]*\s*\([^)]*\)[\s\S]{0,7000}(?:restorePrint|printStyle|changedAttrs)/i.test(agent),
  'child revocation transition does not visibly neutralize print temporary state'
);

// Target 6: old selection markers/state are cleared or quarantined at revoke.
requireSource(
  /(?:revoke|disable)[A-Za-z]*\s*\([^)]*\)[\s\S]{0,7000}(?:includes\.clear|excludes\.clear|quarantine)/i.test(agent),
  'child revocation transition does not clear/quarantine selection state'
);

// Target 7: re-grant creates a fresh authority generation; existing loaded code is reconciled, not silently resurrected.
requireSource(
  /__WEBCLIP_FRAME_AGENT_LOADED__[\s\S]{0,3500}(?:permissionGeneration|reconcile|reset|revoked)/i.test(agent),
  'already-loaded frame-agent re-registration does not visibly reconcile fresh permission generation'
);
requireSource(
  /onAdded[\s\S]{0,9000}(?:generation|reconcile|fresh|invalidate)/i.test(worker),
  'permission re-grant handler does not visibly rotate/reconcile authority generation'
);

// Target 8: top document is notified so revoked remote snapshots/counts stop being authoritative immediately.
requireSource(
  /WEBCLIP_REMOTE_FRAME_(?:PERMISSION_)?REVOKED|permission-revoked|frame-permission-revoked/i.test(worker),
  'worker does not visibly notify top content about revoked remote-frame authority'
);
requireSource(
  /(?:PERMISSION_)?REVOKED|permission-revoked|frame-permission-revoked/i.test(content),
  'top content has no remote-frame revocation event handling'
);
requireSource(
  /(?:revok|permission)[\s\S]{0,5000}(?:remoteFrames\.delete|snapshot\s*=|unavailable|authorized)/i.test(content),
  'top revocation handling does not visibly remove/mark remote snapshot authority'
);

// Target 9: stale cleanup from permission generation A must not touch newer re-granted B.
requireSource(
  /(?:cleanup|revoke)[\s\S]{0,6000}(?:permissionGeneration|hostPermissionGeneration|framePermissionGeneration)[\s\S]{0,3500}(?:stale|current|newer)/i.test(agent + '\n' + worker),
  'revocation cleanup has no visible generation fence against newer re-grant'
);

// Target 10: source states the core trust rule explicitly enough to resist regression.
requireSource(
  /revok[^\n]{0,220}(?:must not|cannot)[^\n]{0,220}(?:regrant|revive|resurrect|newer)|regrant[^\n]{0,220}(?:fresh|generation)[^\n]{0,220}(?:old|stale)/i.test(worker + '\n' + agent + '\n' + content),
  'missing explicit source invariant that revoke/regrant cannot revive old frame-agent session authority'
);

if (failures.length) {
  console.error('P1-201 optional host permission lifecycle source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-201 optional host permission lifecycle source gate: PASS');
