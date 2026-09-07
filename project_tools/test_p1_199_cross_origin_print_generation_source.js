'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const content = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const agent = fs.readFileSync(path.join(root, 'frame-agent.js'), 'utf8');
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

function sliceFrom(source, needle, maxChars = 50000) {
  const start = source.indexOf(needle);
  if (start < 0) return '';
  return source.slice(start, start + maxChars);
}

const contentPrepare = sliceFrom(content, 'async function prepareRemoteFramesForPrint', 45000);
const contentRestore = sliceFrom(content, 'async function restoreRemoteFramesAfterPrint', 30000);
const targetRemote = sliceFrom(content, 'async function targetRemoteFrame', 18000);
const workerTargetCase = sliceFrom(worker, "case 'WEBCLIP_FRAME_AGENT_TARGET'", 22000);
const workerSend = sliceFrom(worker, 'async function sendFrameAgentCommand', 24000);
const agentPrepare = sliceFrom(agent, 'async function preparePrint', 18000);
const agentRestore = sliceFrom(agent, 'function restorePrint', 14000);
const agentListener = sliceFrom(agent, 'chrome.runtime.onMessage.addListener', 24000);

const generationName = /print(?:Operation)?Generation|printGeneration/i;
const currentGenerationName = /currentPrint(?:Operation)?Generation|activePrint(?:Operation)?Generation|highestSeenPrintGeneration|printGenerationCurrent/i;
const closedGenerationName = /closedThroughPrintGeneration|closedPrintGeneration|printGenerationClosed|highestClosedPrintGeneration/i;

// Positive controls from the current design that P1-199 must preserve.
requireSource(/remotePrintPrepared/.test(content), 'missing current remote-print prepared tracking positive control');
requireSource(/prepare-print/.test(content) && /restore-print/.test(content), 'missing current remote prepare/restore command controls');
requireSource(/FRAME_AGENT_COMMAND_TIMEOUT_MS/.test(worker) && /withOperationTimeout/.test(workerSend),
  'missing bounded frame-agent command positive control');
requireSource(/documentId/.test(worker), 'missing registered frame documentId positive control (P1-171 composition)');
requireSource(/prefetchSelected/.test(agentPrepare) && /changedAttrs/.test(agent),
  'missing current selected-resource prefetch/rollback positive control');

// Target 1: top content must own an explicit print-operation generation.
requireSource(generationName.test(content), 'content.js has no explicit print-operation generation');

// Target 2: per-frame prepared/issued tracking must remember the exact generation, not only frameId.
requireSource(
  /remotePrintPrepared\s*:\s*new\s+Map|remotePrintGenerationByFrame|remotePrintIssuedByFrame|remotePrintStateByFrame/.test(content),
  'remote print tracking is not generation-valued per frame'
);

// Target 3: generation must be attached before/at prepare admission and forwarded with prepare-print.
requireSource(Boolean(contentPrepare), 'cannot locate prepareRemoteFramesForPrint()');
requireSource(
  /prepare-print[\s\S]{0,1800}(?:print(?:Operation)?Generation|printGeneration)|(?:print(?:Operation)?Generation|printGeneration)[\s\S]{0,1800}prepare-print/i.test(contentPrepare),
  'prepare-print does not carry exact print generation'
);
requireSource(
  /set\s*\([^\n]*frameId[^\n]*(?:print(?:Operation)?Generation|printGeneration)|issued[^\n]*(?:print(?:Operation)?Generation|printGeneration)/i.test(contentPrepare),
  'prepare admission does not visibly record the issued generation before remote settlement'
);

// Target 4: restore must send the same generation and must not clear knowledge before the command is fenced.
requireSource(Boolean(contentRestore), 'cannot locate restoreRemoteFramesAfterPrint()');
requireSource(
  /restore-print[\s\S]{0,1800}(?:print(?:Operation)?Generation|printGeneration)|(?:print(?:Operation)?Generation|printGeneration)[\s\S]{0,1800}restore-print/i.test(contentRestore),
  'restore-print does not carry the exact generation being restored'
);
requireSource(
  /Map|Generation|generation/.test(contentRestore),
  'restore path does not consume generation-valued per-frame state'
);

// Target 5: the worker routing layer must preserve the generation field end-to-end.
requireSource(Boolean(targetRemote), 'cannot locate targetRemoteFrame()');
requireSource(generationName.test(targetRemote), 'top content targetRemoteFrame() does not transport print generation');
requireSource(Boolean(workerTargetCase), 'cannot locate WEBCLIP_FRAME_AGENT_TARGET worker case');
requireSource(generationName.test(workerTargetCase), 'worker target case drops print generation');
requireSource(Boolean(workerSend), 'cannot locate sendFrameAgentCommand()');

// Target 6: frame-agent state needs both current/highest generation and a closed/tombstone fence.
requireSource(currentGenerationName.test(agent), 'frame-agent has no current/highest print generation state');
requireSource(closedGenerationName.test(agent), 'frame-agent has no closed/tombstone print generation fence');

// Target 7: prepare and restore must accept generation explicitly.
requireSource(Boolean(agentPrepare), 'cannot locate preparePrint()');
requireSource(/async\s+function\s+preparePrint\s*\([^)]*(?:generation|print)/i.test(agentPrepare),
  'preparePrint() does not accept a print generation');
requireSource(Boolean(agentRestore), 'cannot locate restorePrint()');
requireSource(/function\s+restorePrint\s*\([^)]*(?:generation|print)/i.test(agentRestore),
  'restorePrint() does not accept a print generation');

// Target 8: async prepare must re-check generation after awaited prefetch before publishing style/state.
requireSource(
  /await\s+prefetchSelected\s*\([^)]*\)[\s\S]{0,2600}(?:currentPrint|activePrint|highestSeenPrint|isPrintGenerationCurrent|generation\s*[!=]==?)/i.test(agentPrepare),
  'preparePrint() does not visibly re-check generation after awaited prefetch'
);

// Target 9: restore must fence/close the generation before or as part of cleanup, so restore-before-prepare is safe.
requireSource(
  /(?:closedThroughPrintGeneration|closedPrintGeneration|printGenerationClosed|highestClosedPrintGeneration)[\s\S]{0,2200}(?:remove\(|changedAttrs|cleanup|printStyle)|(?:mark|close)[A-Za-z]*Print[A-Za-z]*Generation[\s\S]{0,2200}(?:remove\(|cleanup)/i.test(agentRestore + agent),
  'restore path does not visibly close/tombstone generation before cleanup'
);

// Target 10: stale restore must have an explicit no-op/reject branch instead of unconditional cleanup.
requireSource(
  /restorePrint[\s\S]{0,5000}(?:stale|older|generation)[\s\S]{0,1800}(?:return|no-op|noop)/i.test(agent),
  'restorePrint() has no explicit stale-generation no-op/reject path'
);

// Target 11: a newer prepare must supersede/clean older active print state before adopting the new generation.
requireSource(
  /preparePrint[\s\S]{0,7000}(?:supersed|newer|generation)[\s\S]{0,2400}(?:cleanup|restore|remove\()/i.test(agent),
  'newer prepare does not visibly supersede/clean prior print state'
);

// Target 12: frame-agent dispatch must pass message generation into both print handlers.
requireSource(Boolean(agentListener), 'cannot locate frame-agent message listener');
requireSource(
  /case\s*['"]prepare-print['"][\s\S]{0,500}preparePrint\s*\([^)]*(?:generation|print)/i.test(agentListener),
  'frame-agent prepare-print dispatch does not pass generation'
);
requireSource(
  /case\s*['"]restore-print['"][\s\S]{0,500}restorePrint\s*\([^)]*(?:generation|print)/i.test(agentListener),
  'frame-agent restore-print dispatch does not pass generation'
);

// Target 13: source-level trust/order rule should be explicit to prevent regression.
requireSource(
  /stale[^\n]{0,180}restore[^\n]{0,180}(?:newer|generation)|restore[^\n]{0,180}(?:must not|cannot)[^\n]{0,180}(?:newer|generation)/i.test(content + '\n' + agent),
  'missing explicit source rule that stale restore cannot undo newer print generation'
);

if (failures.length) {
  console.error('P1-199 cross-origin print generation source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-199 cross-origin print generation source gate: PASS');
