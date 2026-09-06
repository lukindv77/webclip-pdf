'use strict';
const assert = require('assert');
const HEIGHT_BUDGET = 200000;

function currentShapeMeasure(rawHeight) {
  return Math.max(0, Math.min(HEIGHT_BUDGET, Math.ceil(Number(rawHeight) || 0)));
}

function currentShapeOutcome(rawHeight) {
  const measuredHeight = currentShapeMeasure(rawHeight);
  return {status:'success', measuredHeight, appliedHeight: measuredHeight + (measuredHeight ? 48 : 0)};
}

function truthAwareOutcome(rawHeight, representation = null) {
  const raw = Math.max(0, Math.ceil(Number(rawHeight) || 0));
  if (raw <= HEIGHT_BUDGET) {
    return {status:'ready', rawMeasuredHeight:raw, appliedHeight:raw + (raw ? 48 : 0), exceededHeightBudget:false};
  }
  if (representation && representation.complete === true && representation.bounded === true) {
    return {status:'ready-alternate', rawMeasuredHeight:raw, exceededHeightBudget:true, representation:representation.kind};
  }
  return {status:'degraded-or-failed', rawMeasuredHeight:raw, exceededHeightBudget:true};
}

assert.deepStrictEqual(truthAwareOutcome(120000), {
  status:'ready', rawMeasuredHeight:120000, appliedHeight:120048, exceededHeightBudget:false
});

const current = currentShapeOutcome(260000);
assert.strictEqual(current.status, 'success');
assert.strictEqual(current.measuredHeight, 200000);
assert.ok(current.appliedHeight < 260000, 'current shape represents only a bounded prefix');

assert.deepStrictEqual(truthAwareOutcome(260000), {
  status:'degraded-or-failed', rawMeasuredHeight:260000, exceededHeightBudget:true
});

assert.deepStrictEqual(truthAwareOutcome(260000, {complete:true, bounded:true, kind:'chunked-print-proxy'}), {
  status:'ready-alternate', rawMeasuredHeight:260000, exceededHeightBudget:true, representation:'chunked-print-proxy'
});

assert.strictEqual(truthAwareOutcome(260000, {complete:false, bounded:true, kind:'partial-clone'}).status, 'degraded-or-failed');
assert.strictEqual(truthAwareOutcome(HEIGHT_BUDGET).status, 'ready');
assert.strictEqual(truthAwareOutcome(HEIGHT_BUDGET + 1).status, 'degraded-or-failed');

const first = truthAwareOutcome(260000);
const second = truthAwareOutcome(260000);
assert.strictEqual(first.rawMeasuredHeight, second.rawMeasuredHeight);
assert.strictEqual(first.exceededHeightBudget, true);

console.log('P1-150 iframe height-budget truth model: PASS');
