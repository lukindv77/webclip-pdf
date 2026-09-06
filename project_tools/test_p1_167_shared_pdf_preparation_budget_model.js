'use strict';

const assert = require('assert');

class Budget {
  constructor({ nodes, mutations, strings, ticks }) {
    this.max = { nodes, mutations, strings, ticks };
    this.used = { nodes: 0, mutations: 0, strings: 0, ticks: 0 };
    this.reason = '';
  }

  take(kind, count) {
    if (this.reason) return false;
    this.used[kind] += count;
    if (this.used[kind] > this.max[kind]) {
      this.reason = kind;
      return false;
    }
    return true;
  }

  remaining(kind) {
    return Math.max(0, this.max[kind] - this.used[kind]);
  }
}

function criticalPrepare(budget, stages) {
  let applied = 0;
  for (const stage of stages) {
    if (!budget.take('nodes', stage.nodes) ||
        !budget.take('ticks', stage.ticks) ||
        !budget.take('strings', stage.strings)) {
      return { ok: false, reason: budget.reason, rolledBack: applied };
    }

    for (let index = 0; index < stage.mutations; index += 1) {
      if (!budget.take('mutations', 1)) {
        return { ok: false, reason: budget.reason, rolledBack: applied };
      }
      applied += 1;
    }
  }
  return { ok: true, applied, rolledBack: 0 };
}

function diagnostic(budget, { nodes, strings, ticks }) {
  if (!budget.take('nodes', nodes) ||
      !budget.take('ticks', ticks) ||
      !budget.take('strings', strings)) {
    return { complete: false, reason: budget.reason };
  }
  return { complete: true };
}

function boundedNormalize(raw, budget) {
  const value = String(raw);
  if (!budget.take('strings', value.length)) {
    return { ok: false, reason: 'strings', value: '' };
  }
  return { ok: true, value: value.replace(/\s+/g, ' ').trim() };
}

function childDeadline(parentRemainingMs, localCapMs) {
  return Math.max(0, Math.min(parentRemainingMs, localCapMs));
}

let budget = new Budget({ nodes: 100, mutations: 20, strings: 1000, ticks: 100 });
let result = criticalPrepare(budget, [
  { nodes: 20, mutations: 5, strings: 100, ticks: 10 },
  { nodes: 30, mutations: 5, strings: 100, ticks: 10 }
]);
assert.equal(result.ok, true);

// Two helpers that would each fit independent 60-node limits must still fail
// when the parent operation owns one shared 100-node envelope.
budget = new Budget({ nodes: 100, mutations: 50, strings: 1000, ticks: 100 });
result = criticalPrepare(budget, [
  { nodes: 60, mutations: 1, strings: 10, ticks: 1 },
  { nodes: 60, mutations: 1, strings: 10, ticks: 1 }
]);
assert.equal(result.ok, false);
assert.equal(result.reason, 'nodes');
assert.equal(result.rolledBack, 1);

// Correctness-critical mutation exhaustion rolls back already-applied reversible changes.
budget = new Budget({ nodes: 100, mutations: 2, strings: 1000, ticks: 100 });
result = criticalPrepare(budget, [
  { nodes: 1, mutations: 3, strings: 1, ticks: 1 }
]);
assert.equal(result.ok, false);
assert.equal(result.reason, 'mutations');
assert.equal(result.rolledBack, 2);

// Diagnostic exhaustion is truthful truncation, not a fresh independent envelope.
budget = new Budget({ nodes: 5, mutations: 10, strings: 10, ticks: 10 });
const diagnosticResult = diagnostic(budget, { nodes: 6, strings: 1, ticks: 1 });
assert.equal(diagnosticResult.complete, false);
assert.equal(diagnosticResult.reason, 'nodes');

// Page-controlled string work is charged before normalization creates another string.
budget = new Budget({ nodes: 10, mutations: 10, strings: 5, ticks: 10 });
const stringResult = boundedNormalize('abcdef', budget);
assert.equal(stringResult.ok, false);
assert.equal(stringResult.value, '');

// Existing helper deadlines must be clamped to the remaining parent deadline.
assert.equal(childDeadline(3000, 15000), 3000);
assert.equal(childDeadline(20000, 15000), 15000);

console.log('P1-167 shared PDF preparation budget model: PASS');
