'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const content = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
const agent = fs.readFileSync(path.join(root, 'frame-agent.js'), 'utf8');

function requirePattern(source, pattern, message) {
  assert.match(source, pattern, message);
}

function rejectPattern(source, pattern, message) {
  assert.doesNotMatch(source, pattern, message);
}

function functionSlice(source, functionName, nextFunctionName = '') {
  const startNeedle = `function ${functionName}`;
  let start = source.indexOf(startNeedle);
  if (start < 0) {
    const asyncNeedle = `async function ${functionName}`;
    start = source.indexOf(asyncNeedle);
  }
  assert.ok(start >= 0, `Missing function ${functionName}`);
  let end = source.length;
  if (nextFunctionName) {
    const direct = source.indexOf(`function ${nextFunctionName}`, start + 1);
    const asyncDirect = source.indexOf(`async function ${nextFunctionName}`, start + 1);
    const candidates = [direct, asyncDirect].filter((value) => value >= 0);
    if (candidates.length) end = Math.min(...candidates);
  }
  return source.slice(start, end);
}

// Positive controls from current architecture.
requirePattern(content, /async\s+function\s+commandMappedRemoteFrames\s*\(/, 'Mapped remote-frame command helper must remain explicit.');
requirePattern(content, /async\s+function\s+prepareRemoteFramesForPrint\s*\(/, 'Remote print prepare coordinator must remain explicit.');
requirePattern(content, /async\s+function\s+restoreRemoteFramesAfterPrint\s*\(/, 'Remote print restore coordinator must remain explicit.');
requirePattern(agent, /async\s+function\s+preparePrint\s*\(/, 'Child preparePrint path must remain explicit.');
requirePattern(agent, /function\s+restorePrint\s*\(/, 'Child restorePrint path must remain explicit.');
requirePattern(content, /documentId/, 'Existing exact child document identity must remain available for P1-171 composition.');
requirePattern(content, /onlySelected:\s*true/, 'Print preparation must remain selection-bounded.');
requirePattern(content, /failClosed:\s*true/, 'A required selected remote frame failure must remain fail-closed for PDF preparation.');

// Target P1-214: parent-issued exact generation exists before any child prepare
// transport, so a lost response can still be reconciled safely.
requirePattern(content, /printGeneration|remotePrintGeneration|printOperationGeneration/, 'Missing exact remote print generation in top coordinator.');
requirePattern(agent, /printGeneration|activePrintGeneration|printOperationGeneration/, 'Missing exact remote print generation in child agent.');

// Parent must hold per-child rollback receipts, not one unversioned Set(frameId).
requirePattern(content, /remotePrint(?:Rollback|Prepare|Saga|Cleanup)Receipts|RemotePrint(?:Rollback|Prepare|Saga|Cleanup)Receipt/, 'Missing per-child remote print rollback receipt state.');
requirePattern(content, /prepareState|prepareStatus|prepareIssued|prepareUnknown/, 'Missing prepare settlement state in parent receipt.');
requirePattern(content, /restoreState|restoreStatus|restoreIssued|restoreUnknown/, 'Missing restore settlement state in parent receipt.');

const prepareSlice = functionSlice(content, 'prepareRemoteFramesForPrint', 'restoreRemoteFramesAfterPrint');
rejectPattern(prepareSlice, /state\.remotePrintPrepared\.clear\s*\(/, 'New prepare still discards all prior rollback ownership at function start.');
requirePattern(prepareSlice, /documentId/, 'Prepare receipt is not visibly exact-child-document bound.');
requirePattern(prepareSlice, /printGeneration|remotePrintGeneration|printOperationGeneration/, 'Prepare command is not visibly print-generation bound.');
requirePattern(prepareSlice, /receipt|prepareState|prepareStatus/i, 'Successful/unknown per-child prepare is not recorded immediately.');

const restoreSlice = functionSlice(content, 'restoreRemoteFramesAfterPrint', 'onMouseMove');
rejectPattern(restoreSlice, /state\.remotePrintPrepared\.clear\s*\(\s*\)\s*;[\s\S]{0,300}targetRemoteFrame/, 'Restore still destroys rollback ownership before child settlement.');
requirePattern(restoreSlice, /restoreState|restoreStatus|restoreUnknown|receipt/i, 'Restore path lacks explicit per-child settlement bookkeeping.');
requirePattern(restoreSlice, /printGeneration|remotePrintGeneration|printOperationGeneration/, 'restore-print is not visibly exact-generation bound.');
requirePattern(restoreSlice, /documentId/, 'Restore receipt is not visibly exact-child-document bound.');

// Cleanup unknown must remain reconcileable. A read-only state/reconcile command
// (or an equivalent idempotent exact-generation restore) must be visible.
requirePattern(content + agent, /get-print-state|reconcile-print|queryPrintGeneration|reconcileRemotePrint|restoreUnknown/i, 'Missing explicit reconciliation path for unknown prepare/restore settlement.');

// Child commands must carry generation into mutating functions. Current no-arg
// preparePrint()/restorePrint() dispatch is intentionally rejected.
rejectPattern(agent, /case\s*['"]prepare-print['"]\s*:\s*return\s+preparePrint\s*\(\s*\)/, 'Child prepare-print still calls unversioned preparePrint().');
rejectPattern(agent, /case\s*['"]restore-print['"]\s*:\s*return\s+restorePrint\s*\(\s*\)/, 'Child restore-print still calls unversioned restorePrint().');
requirePattern(agent, /case\s*['"]prepare-print['"][\s\S]{0,240}(?:printGeneration|generation)/, 'prepare-print dispatch does not pass exact generation.');
requirePattern(agent, /case\s*['"]restore-print['"][\s\S]{0,240}(?:printGeneration|generation)/, 'restore-print dispatch does not pass exact generation.');

// Child state must be generation-owned and idempotent; a singleton pointer with
// one shared changedAttrs list is not enough unless wrapped by explicit owner.
requirePattern(agent, /activePrintGeneration|printStateByGeneration|printReceipt|printOwnerGeneration/, 'Missing child-side generation ownership for temporary print state.');
requirePattern(agent, /closedThroughPrintGeneration|closedPrintGenerations|printGenerationState|alreadyClean|idempotent/i, 'Missing closed/idempotent generation semantics for stale/repeated restore.');

// Do not allow the old coordinator shape where frame ids are only recorded after
// the entire fail-closed fanout has returned successfully.
rejectPattern(prepareSlice, /const\s+responses\s*=\s*await\s+commandMappedRemoteFrames\([\s\S]{0,800}for\s*\(const\s+\{\s*remote,\s*response\s*\}\s+of\s+responses\)[\s\S]{0,300}remotePrintPrepared\.add/, 'Prepare ownership is still registered only after aggregate fanout success.');

// A new print may not silently erase unresolved prior cleanup debt.
requirePattern(content, /reconcileRemotePrint|assertRemotePrintClean|ensureRemotePrintClean|cleanupUnknown|rollbackDebt/i, 'Missing admission check/reconciliation of prior remote print rollback debt.');

// P1-199/P1-171 composition remains mandatory.
requirePattern(agent, /(?:stale|older|closed)[\s\S]{0,200}(?:printGeneration|generation)|(?:printGeneration|generation)[\s\S]{0,200}(?:stale|older|closed)/i, 'No visible stale-generation rejection in child print lifecycle.');
requirePattern(content, /documentId/, 'Exact document identity unexpectedly disappeared from top frame model.');

console.log('P1-214 remote print partial rollback source gate: PASS');
