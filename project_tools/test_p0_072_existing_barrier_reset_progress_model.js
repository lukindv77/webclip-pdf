'use strict';
const assert = require('node:assert/strict');

function own(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function resetTransition(row, scopeRelation, freshDisposition) {
  if (!row || typeof row !== 'object') return { action: 'error-missing-row' };

  // Presence is already a replay/mutation barrier. A new reset does not need
  // to understand or overwrite an older/future/corrupt disposition body.
  if (own(row, 'journalResetDisposition')) {
    return { action: 'preserve-existing-barrier', row: structuredClone(row) };
  }

  if (scopeRelation === 'nonmatch') {
    return { action: 'leave-active-nonmatch', row: structuredClone(row) };
  }

  if (scopeRelation === 'match' || scopeRelation === 'indeterminate') {
    return {
      action: scopeRelation === 'match' ? 'detach' : 'detach-manual',
      row: {
        ...structuredClone(row),
        journalResetDisposition: structuredClone(freshDisposition)
      }
    };
  }

  return { action: 'error-scope' };
}

const futureBarrier = {
  id: 'r1',
  journalResetDisposition: { version: 9, future: true }
};
const preserved = resetTransition(
  futureBarrier,
  'indeterminate',
  { version: 1, resetId: 'new' }
);
assert.equal(preserved.action, 'preserve-existing-barrier');
assert.deepEqual(
  preserved.row.journalResetDisposition,
  futureBarrier.journalResetDisposition,
  'a later reset must not rewrite an unknown first barrier'
);

const corruptBarrier = { id: 'r2', journalResetDisposition: null };
assert.equal(
  resetTransition(corruptBarrier, 'match', { version: 1 }).action,
  'preserve-existing-barrier',
  'present-but-corrupt reset metadata still blocks replay and does not need rewrite'
);

const active = { id: 'r3' };
assert.equal(
  resetTransition(active, 'match', { version: 1, resetId: 'new' }).action,
  'detach'
);
assert.equal(
  resetTransition(active, 'indeterminate', { version: 1, resetId: 'new' }).action,
  'detach-manual'
);
assert.equal(
  resetTransition(active, 'nonmatch', { version: 1, resetId: 'new' }).action,
  'leave-active-nonmatch'
);

console.log('P0-072 existing reset barrier reset-progress model: PASS');
