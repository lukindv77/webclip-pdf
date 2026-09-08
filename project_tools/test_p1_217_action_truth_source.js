'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const workerPath = path.join(root, 'service-worker.js');
const source = fs.readFileSync(workerPath, 'utf8');

function functionBody(name) {
  const syncMarker = `function ${name}`;
  const asyncMarker = `async function ${name}`;
  const syncStart = source.indexOf(syncMarker);
  const asyncStart = source.indexOf(asyncMarker);
  const starts = [syncStart, asyncStart].filter((value) => value >= 0);
  assert.ok(starts.length, `Missing function ${name}`);
  const start = Math.min(...starts);
  const next = source.indexOf('\nfunction ', start + 20);
  const nextAsync = source.indexOf('\nasync function ', start + 20);
  const candidates = [next, nextAsync].filter((value) => value > start);
  const end = candidates.length ? Math.min(...candidates) : source.length;
  return source.slice(start, end);
}

function requireMatch(text, re, message) {
  assert.match(text, re, message);
}

// Positive controls: P1-217 composes with, but must not replace, existing P1-130 fencing.
requireMatch(source, /const\s+actionUpdateGenerationByTab\s*=\s*new Map\s*\(\s*\)/,
  'P1-130 per-tab Action generation map must remain present.');
requireMatch(source, /function\s+beginActionUpdateGeneration\s*\(/,
  'P1-130 generation admission must remain present.');
requireMatch(source, /function\s+isActionUpdateGenerationCurrent\s*\(/,
  'P1-130 stale completion fence must remain present.');
requireMatch(source, /function\s+applyChromeActionMutationBestEffort\s*\(/,
  'Bounded/best-effort Chrome Action mutation wrapper must remain present.');
requireMatch(source, /async function\s+getJournalSummaryForUrl\s*\(/,
  'Journal summary read remains the source used to derive URL-scoped Action state.');

const updateBody = functionBody('updateActionForTab');
const summaryIndex = updateBody.indexOf('getJournalSummaryForUrl');
assert.ok(summaryIndex >= 0, 'updateActionForTab must still establish current Journal summary before known Action truth.');

// Target contract: the newest navigation generation revokes previous URL authority
// before any fallible current-summary read can reject.
const beforeSummary = updateBody.slice(0, summaryIndex);
requireMatch(beforeSummary,
  /(?:publish|set|apply|commit)[A-Za-z0-9_]*Action[A-Za-z0-9_]*(?:Unknown|Pending|Neutral)|(?:unknown|loading)[A-Za-z0-9_]*Action/i,
  'P1-217 requires publishing explicit neutral/unknown truth before awaiting the current URL summary.');

// A failed current read must settle the current generation into degraded/unknown,
// not simply reject and leave the browser-owned previous visual installed.
requireMatch(updateBody,
  /try\s*\{[\s\S]{0,3000}getJournalSummaryForUrl\s*\([^)]*\)[\s\S]{0,3000}\}\s*catch\s*\([^)]*\)\s*\{[\s\S]{0,3000}(?:degraded|unknown|read-unavailable|summary-read-failed)/i,
  'P1-217 requires an explicit failure settlement for the current Journal-summary generation.');

// Product semantics must distinguish a proven empty Journal from inability to prove it.
requireMatch(source, /known[-_ ]?empty/i,
  'P1-217 requires an explicit known-empty semantic state.');
requireMatch(source, /degraded|read[-_ ]?unavailable/i,
  'P1-217 requires an explicit degraded/read-unavailable semantic state.');

// The Action truth receipt must bind semantic authority to both tab and current URL/navigation identity.
requireMatch(source,
  /(?:actionTruth|actionState|actionReceipt)[A-Za-z0-9_]*ByTab\s*=\s*new Map\s*\(\s*\)/i,
  'P1-217 requires an explicit per-tab Action truth/receipt record.');
requireMatch(source, /urlIdentity|currentUrlIdentity|actionUrlKey/i,
  'P1-217 Action truth must record canonical/current URL identity.');
requireMatch(source, /navigationGeneration|documentGeneration|documentKey|navigationKey/i,
  'P1-217 Action truth must bind to a document/navigation generation, not tabId alone.');

// Tab removal must revoke any transient Action truth receipt as well as P1-130 mutation generation state.
requireMatch(source,
  /(?:actionTruth|actionState|actionReceipt)[A-Za-z0-9_]*ByTab\.delete\s*\(\s*Number\s*\(\s*tabId/i,
  'Removed tabs must delete P1-217 Action truth authority.');

// Tab replacement is an explicit race in the owner contract. Current source has no onReplaced hook;
// production closure must either reconcile replacement here or replace this gate with equivalent
// source-proven lifecycle handling backed by physical Chrome E2E evidence.
requireMatch(source, /chrome\.tabs\.onReplaced\.addListener\s*\(/,
  'P1-217 requires explicit tab-replacement reconciliation or equivalent source-proven lifecycle handling.');

// Worker bootstrap remains a positive convergence mechanism, but is safe only because each refreshed
// current tab must revoke stale URL-specific truth before the fallible Journal read above.
requireMatch(source, /refreshActionForAllTabs\s*\(\s*\)\.catch\s*\(/,
  'Worker bootstrap Action refresh must remain present.');

console.log('P1-217 Action truth source gate: PASS');
