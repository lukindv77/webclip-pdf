'use strict';
const assert = require('node:assert/strict');

function capacityClass({ authority = 'active', stage = 'prepared', resolution = '', terminal = false, store = 'local' } = {}) {
  if (authority === 'reset-indeterminate') return 'manual-unresolved';
  if (authority === 'reset-detached') {
    if (terminal || resolution === 'terminal') return 'terminal-retained';
    if (resolution === 'manual-resolution') return 'manual-unresolved';
    return 'detached-reconciling';
  }
  if (store !== 'append' && stage === 'stage-indeterminate') return 'manual-unresolved';
  if (terminal) return 'terminal-retained';
  return 'active-current';
}

assert.equal(capacityClass({ authority: 'reset-indeterminate' }), 'manual-unresolved');
assert.equal(capacityClass({ authority: 'active', stage: 'stage-indeterminate' }), 'manual-unresolved');
assert.equal(capacityClass({ authority: 'reset-detached', resolution: 'reconciling' }), 'detached-reconciling');
assert.equal(capacityClass({ authority: 'reset-detached', resolution: 'manual-resolution' }), 'manual-unresolved');
assert.equal(capacityClass({ authority: 'reset-detached', resolution: 'terminal' }), 'terminal-retained');
assert.equal(capacityClass({ authority: 'active', store: 'append' }), 'active-current');

function ordinarySchedulerEligible(classification) {
  return classification === 'active-current';
}

assert.equal(ordinarySchedulerEligible('manual-unresolved'), false);
assert.equal(ordinarySchedulerEligible('detached-reconciling'), false,
  'ordinary replay/mutation scheduler must not regain Journal or external mutation authority');

console.log('P0-072 pending indeterminate capacity model: PASS');
