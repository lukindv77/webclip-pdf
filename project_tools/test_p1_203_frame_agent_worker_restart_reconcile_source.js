'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const top = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
const child = fs.readFileSync(path.join(root, 'frame-agent.js'), 'utf8');
const all = `${worker}\n${top}\n${child}`;
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

// Positive controls from current architecture that must not be lost.
requireSource(/frameAgentsByTab/.test(worker), 'missing bounded frame-agent registry positive control');
requireSource(/documentId/.test(worker) && /documentId/.test(all), 'missing exact-document positive control');
requireSource(/permissions\.contains/.test(worker), 'missing current host-permission check positive control');
requireSource(/WEBCLIP_FRAME_AGENT_REGISTER/.test(worker) && /WEBCLIP_FRAME_AGENT_REGISTER/.test(child), 'missing frame-agent registration/liveness path');
requireSource(/WEBCLIP_FRAME_AGENT_STATE/.test(worker) && /WEBCLIP_FRAME_AGENT_STATE/.test(child), 'missing child STATE path');
requireSource(/WEBCLIP_FRAME_AGENT_TARGET/.test(worker) && /WEBCLIP_FRAME_AGENT_COMMAND/.test(child), 'missing worker-to-child command path');

// Target 1: every service-worker module incarnation has a fresh explicit id.
requireSource(/workerIncarnation|serviceWorkerIncarnation|workerInstanceId|workerEpoch/i.test(worker),
  'no explicit fresh service-worker incarnation primitive');

// Target 2: reconciliation is an explicit protocol, not ordinary REGISTER adoption.
requireSource(/FRAME_AGENT_(?:HELLO|RECONCILE|HANDSHAKE)|frameAgent(?:Hello|Reconcile|Handshake)/i.test(all),
  'no explicit frame-agent HELLO/reconcile/handshake protocol');

// Target 3: handshake identity exists and stale responses are compare-and-act fenced.
requireSource(/handshakeId|reconcileNonce|reconcileGeneration/i.test(all),
  'no exact handshake/reconcile attempt identity');
requireSource(
  /(?:handshakeId|reconcileNonce|reconcileGeneration)[\s\S]{0,2500}(?:current|===|compare|stale|supersed|CAS)/i.test(worker),
  'no visible current-handshake compare-and-act/CAS before settlement/cleanup'
);

// Target 4: surviving child module has an extension-owned instance identity.
requireSource(/agentInstanceId|frameAgentInstanceId/i.test(all),
  'no child agent-instance identity for same-document surviving agent');

// Target 5: pending/liveness and active authority are distinguishable; active binding is fresh.
requireSource(/bindingId|frameAgentBinding/i.test(all),
  'no fresh active binding identity after reconciliation');
requireSource(/pending[\s_-]*(?:handshake|reconcile)|state\s*:\s*['"]pending|clean-idle|quarantin/i.test(worker + child),
  'no pending/quarantined versus active frame-agent lifecycle distinction');

// Target 6: STATE admission is bound to current worker + active binding.
requireSource(
  /forwardFrameAgentState[\s\S]{0,9000}(?:workerIncarnation|serviceWorkerIncarnation|workerInstanceId|workerEpoch)/i.test(worker),
  'STATE admission is not visibly tied to current worker incarnation'
);
requireSource(
  /forwardFrameAgentState[\s\S]{0,9000}(?:bindingId|frameAgentBinding)/i.test(worker),
  'STATE admission is not visibly tied to active bindingId'
);

// Target 7: commands carry/verify current worker + binding.
requireSource(
  /sendFrameAgentCommand[\s\S]{0,9000}(?:workerIncarnation|serviceWorkerIncarnation|workerInstanceId|workerEpoch)/i.test(worker),
  'frame-agent commands are not visibly tied to current worker incarnation'
);
requireSource(
  /sendFrameAgentCommand[\s\S]{0,9000}(?:bindingId|frameAgentBinding)/i.test(worker),
  'frame-agent commands are not visibly tied to active bindingId'
);

// Target 8: top renderer observes worker replacement and invalidates old authority/snapshots.
requireSource(/observedWorkerIncarnation|remoteWorkerIncarnation|workerIncarnation/i.test(top),
  'top content script does not track worker incarnation for remote state');
requireSource(
  /workerIncarnation[\s\S]{0,5000}(?:remoteFrames\.clear|remoteSnapshots?\.clear|remoteAuthority\.clear|delete\()/i.test(top),
  'top does not visibly invalidate old remote authority/snapshots on worker change'
);

// Target 9: already-loaded child performs liveness/reconcile, not bare authority registration only.
requireSource(
  /__WEBCLIP_FRAME_AGENT_LOADED__[\s\S]{0,1800}(?:HELLO|RECONCILE|HANDSHAKE|reconcile|handshake)/i.test(child),
  'already-loaded frame-agent still lacks explicit fresh-worker reconciliation semantics'
);

// Target 10: bare register must not auto-start/adopt old snapshot in top.
requireSource(
  !/message\.event\s*===\s*['"]register['"][\s\S]{0,1200}targetRemoteFrame\([^)]*['"]start['"]/i.test(top),
  'top still auto-starts/adopts an ordinary register event without reconciliation proof'
);

// Target 11: child authoritative STATE rejection must trigger reconcile/quarantine rather than permanent swallow.
requireSource(/FRAME_AGENT_(?:RECONCILE_REQUIRED|STALE_BINDING)|reconcileRequired|quarantin/i.test(child),
  'child has no explicit stale-binding/reconcile-required quarantine response');
requireSource(
  !/WEBCLIP_FRAME_AGENT_STATE[\s\S]{0,800}\.catch\(\(\)\s*=>\s*\{\s*\}\)/i.test(child),
  'child still silently swallows authoritative STATE failure'
);

// Target 12: compose the adjacent authority generations instead of inventing one overloaded id.
requireSource(/permissionGeneration/i.test(all), 'missing P1-201 permission generation composition');
requireSource(/selectionSessionGeneration/i.test(all), 'missing P1-200 selection session generation composition');
requireSource(/printGeneration/i.test(all), 'missing P1-199 print generation composition');
requireSource(/documentId/i.test(all), 'missing P1-171 document identity composition');

// Target 13: restart reconciliation must explicitly clean/quarantine temporary print state.
requireSource(
  /(?:reconcile|workerIncarnation|staleBinding)[\s\S]{0,7000}(?:restorePrint|printStyle|changedAttrs|printGeneration)/i.test(child + worker),
  'restart reconciliation does not visibly clean/quarantine temporary print state'
);

// Target 14: top has an authority gate before remote state can participate in save/print/serialization.
requireSource(/remoteAuthority|assertRemote.*Authority|requireRemote.*Reconcile|remote.*reconciled/i.test(top),
  'top has no explicit reconciled-remote-authority gate');

// Target 15: do not mistake browser/profile startup for every worker module restart.
requireSource(
  /workerIncarnation|serviceWorkerIncarnation|workerInstanceId|workerEpoch/i.test(worker),
  'worker restart authority appears to depend on lifecycle events instead of module incarnation'
);

if (failures.length) {
  console.error('P1-203 frame-agent worker restart reconcile source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-203 frame-agent worker restart reconcile source gate: PASS');
