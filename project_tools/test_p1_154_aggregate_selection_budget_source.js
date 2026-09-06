'use strict';
const fs = require('fs');
const assert = require('assert');
const content = fs.readFileSync('content.js', 'utf8');
const frameAgent = fs.readFileSync('frame-agent.js', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');

function must(text, rx, label) { assert(rx.test(text), `P1-154 source gate: missing ${label}`); }
function section(text, start, end) {
  const a = text.indexOf(start);
  assert(a >= 0, `P1-154 source gate: missing section ${start}`);
  const b = end ? text.indexOf(end, a + start.length) : -1;
  return text.slice(a, b >= 0 ? b : Math.min(text.length, a + 14000));
}

must(worker, /MAX_SELECTION_SNAPSHOT_JSON_CHARS\s*=\s*2\s*\*\s*1024\s*\*\s*1024/, '2 MiB worker snapshot budget');
must(worker, /sanitizeSelectionSnapshot\s*\(/, 'worker snapshot sanitizer');
must(worker, /rejectOverflow/, 'worker overflow rejection path');
must(worker, /items\.length\s*>\s*250/, 'worker count-overflow detection');

must(content, /(SelectionBudget|selectionBudget|selectionScopeBudget)/, 'top aggregate selection budget state');
must(content, /(admit|reserve)[A-Za-z0-9_]*(Selection|Scope)[A-Za-z0-9_]*(Item|Budget)|reserveSelectionBudget/i,
  'top pre-materialization count/byte admission');
must(content, /(portableBytes|reservedBytes|locatorBytes|selectionBytes)/, 'portable byte reservation');

const addInclude = section(content, 'function addInclude', 'function ');
const addExclude = section(content, 'function addExclude', 'function ');
assert(/admit|reserve|budget/i.test(addInclude), 'P1-154 source gate: addInclude bypasses aggregate admission');
assert(/admit|reserve|budget/i.test(addExclude), 'P1-154 source gate: addExclude bypasses aggregate admission');

must(frameAgent, /(SELECTION_BUDGET_PROPOSAL|selection-budget|reserve-selection|selectionBudgetReceipt|budgetGrant)/i,
  'remote pre-materialization aggregate budget protocol');
const remoteAdd = section(frameAgent, 'function addInclude', 'function ');
assert(/budget|proposal|reserve|grant/i.test(remoteAdd), 'P1-154 source gate: remote addInclude materializes before aggregate admission');

const serialize = section(content, 'function serializeSelectionSnapshot', 'function createElementLocator');
assert(!/includes\.slice\(0,\s*250\)/.test(serialize), 'P1-154 source gate: includes are still post-hoc sliced');
assert(!/excludes\.slice\(0,\s*250\)/.test(serialize), 'P1-154 source gate: excludes are still post-hoc sliced');
assert(/scopeGeneration|budgetReceipt|admitted/i.test(serialize), 'P1-154 source gate: serializer is not bound to admitted selection scope');

must(content, /(release|remove)[A-Za-z0-9_]*(Selection|Scope)[A-Za-z0-9_]*(Budget|Reservation)|releaseSelectionBudget/i,
  'exact budget release');
must(content, /(scopeGeneration|selectionGeneration)/, 'generation-bound selection budget');

console.log('P1-154 aggregate selection budget source gate: PASS');
