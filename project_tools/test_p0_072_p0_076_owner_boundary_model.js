'use strict';

const assert = require('node:assert/strict');

function settleAfterPhysicalSuccess({ receipt, currentEntry }) {
  if (!receipt) return { journalUpdated: false, reason: 'missing-receipt' };
  receipt.phase = 'verified';
  receipt.resolution = 'terminal';
  if (receipt.resetDisposition) {
    return { journalUpdated: false, reason: 'reset-detached' };
  }
  // P0-072 alone cannot prove that currentEntry is the same per-entry Journal generation.
  if (!currentEntry || currentEntry.id !== receipt.journalEntryId) {
    return { journalUpdated: false, reason: 'entry-missing' };
  }
  return { journalUpdated: null, reason: 'requires-p0-076-cas' };
}

(function p0_072_closesResetPathWithoutFakeGenerationField() {
  const receipt = {
    effectId: 'effect-A',
    journalEntryId: 'entry-1',
    phase: 'effect-admitted',
    resetDisposition: { version: 1, resetId: 'reset-1', state: 'detached' }
  };
  const replacement = { id: 'entry-1', title: 'replacement-generation' };
  const result = settleAfterPhysicalSuccess({ receipt, currentEntry: replacement });
  assert.deepEqual(result, { journalUpdated: false, reason: 'reset-detached' });
  assert.equal(replacement.readingMode, undefined,
    'P0-072: reset-detached settlement must not patch a same-id replacement Journal row.');
})();

(function nonResetSameIdRequiresP0076NotP0072Guesswork() {
  const receipt = {
    effectId: 'effect-B',
    journalEntryId: 'entry-1',
    phase: 'effect-admitted',
    resetDisposition: null
  };
  const current = { id: 'entry-1', title: 'cannot-prove-same-generation-by-id' };
  const result = settleAfterPhysicalSuccess({ receipt, currentEntry: current });
  assert.deepEqual(result, { journalUpdated: null, reason: 'requires-p0-076-cas' },
    'P0-076 owns the missing per-entry revision / Journal-generation CAS outside the reset-detached path.');
})();

(function portableProjectionIsNotAGenerationToken() {
  const imported = {
    id: 'entry-1',
    readMovePendingAt: 1,
    readMoveOperationId: 'textual-op',
    readMoveTargetPath: '/Upload/a.pdf'
  };
  assert.equal(Object.hasOwn(imported, 'generation'), false);
  assert.equal(Object.hasOwn(imported, 'revision'), false);
})();

console.log('P0-072/P0-076 owner boundary model: PASS');
