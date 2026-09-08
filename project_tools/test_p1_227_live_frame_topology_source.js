'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');

function has(re) { return re.test(source); }

// Existing positive controls that P1-227 must preserve.
assert(has(/frameDocuments\s*:\s*new Set\(\)/), 'missing frameDocuments registry');
assert(has(/frameLoadHandlers\s*:\s*new Map\(\)/), 'missing frameLoadHandlers registry');
assert(has(/function\s+refreshFrameDocuments\s*\(/), 'missing refreshFrameDocuments');
assert(has(/frame\.addEventListener\(['"]load['"]/), 'known-frame load rediscovery positive control missing');
assert(has(/removeListenersFromDocument\(doc\)/), 'detached-document listener cleanup positive control missing');
assert(has(/frameLoadHandlers\.delete\(frame\)/), 'detached frame load-handler cleanup positive control missing');

// P1-227 production closure requirements.
assert(
  has(/MutationObserver/) || has(/observeFrameTopology/) || has(/frameTopologyObserver/),
  'P1-227: active selection has no live topology observation mechanism'
);
assert(
  has(/selectionSessionGeneration|selectionGeneration|frameTopologyGeneration/),
  'P1-227: topology work is not bound to an explicit selection-session generation'
);
assert(
  has(/scheduleFrameTopology|frameTopologyScheduled|pendingFrameTopology|queueFrameTopology/),
  'P1-227: mutation bursts lack an explicit coalesced topology scheduler'
);
assert(
  has(/FRAME_TOPOLOGY[^\n]*(MAX|BUDGET)|MAX_[A-Z_]*FRAME[A-Z_]*TOPOLOGY|FRAME_DISCOVERY[^\n]*(MAX|BUDGET)/),
  'P1-227: live topology discovery lacks an explicit node/frame/time budget'
);
assert(
  has(/addedNodes|removedNodes|childList/),
  'P1-227: observer does not prove handling of inserted/replaced/removed frame topology'
);
assert(
  has(/\.disconnect\(\)/) || has(/stopFrameTopology/) || has(/disposeFrameTopology/),
  'P1-227: topology observer/task ownership is not explicitly disposed when selection stops'
);
assert(
  has(/generation\s*!==\s*(state\.)?(selectionSessionGeneration|selectionGeneration|frameTopologyGeneration)|is[A-Za-z]*GenerationCurrent/),
  'P1-227: scheduled topology work lacks a stale-generation fence'
);
assert(
  has(/removePageListeners\([\s\S]{0,2500}(disconnect|stopFrameTopology|disposeFrameTopology)/),
  'P1-227: selection teardown does not visibly revoke live topology observation authority'
);

console.log('P1-227 live same-origin frame topology source gate: PASS');
