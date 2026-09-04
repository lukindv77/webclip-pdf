'use strict';
const assert = require('node:assert/strict');

const ACTIVE_CAP = 100;
const MANUAL_BUDGET = 100;

function isManual(row) { return row.kind === 'unknown'; }
function isNewProtocolLiability(row) {
  if (!row.externalStages || row.externalStages.version !== 1) return false;
  if (row.kind === 'unknown') return false;
  const state = row.externalStages.downloadStart;
  return state === 'prepared' || state === 'admitted';
}
function counts(rows) {
  const active = rows.filter((row) => !isManual(row) && row.terminal !== true).length;
  const manual = rows.filter(isManual).length;
  const reserved = rows.filter(isNewProtocolLiability).length;
  return { active, manual, reserved, manualLiability: manual + reserved };
}
function canAdmitNewProtocol(rows) {
  const c = counts(rows);
  return c.active < ACTIVE_CAP
    && c.manual < MANUAL_BUDGET
    && c.manualLiability < MANUAL_BUDGET;
}

(function p0039CompatibilityAt99Plus99() {
  const rows = [
    ...Array.from({ length: 99 }, (_, i) => ({ id: `legacy-a${i}`, kind: 'intent' })),
    ...Array.from({ length: 99 }, (_, i) => ({ id: `u${i}`, kind: 'unknown' }))
  ];
  assert.equal(canAdmitNewProtocol(rows), true,
    '99 active + 99 unknown remains able to admit one row, preserving P0-039 boundary semantics');
  const next = [...rows, {
    id: 'new', kind: 'intent',
    externalStages: { version: 1, downloadStart: 'prepared' }
  }];
  assert.deepEqual(counts(next), { active: 100, manual: 99, reserved: 1, manualLiability: 100 });
  assert.equal(canAdmitNewProtocol(next), false);
})();

(function newProtocolUnknownConsumesReservationNotExtraSlot() {
  let rows = [
    ...Array.from({ length: 99 }, (_, i) => ({ id: `u${i}`, kind: 'unknown' })),
    { id: 'new', kind: 'intent', externalStages: { version: 1, downloadStart: 'admitted' } }
  ];
  const before = counts(rows);
  rows = rows.map((row) => row.id === 'new' ? { ...row, kind: 'unknown' } : row);
  const after = counts(rows);
  assert.equal(before.manualLiability, 100);
  assert.equal(after.manual, 100);
  assert.equal(after.reserved, 0);
  assert.equal(after.manualLiability, 100);
})();

(function legacyTransitionMayGrandfatherOverflowButNeverRejectTruth() {
  let rows = [
    ...Array.from({ length: 99 }, (_, i) => ({ id: `legacy-a${i}`, kind: 'intent' })),
    ...Array.from({ length: 99 }, (_, i) => ({ id: `u${i}`, kind: 'unknown' })),
    { id: 'new', kind: 'intent', externalStages: { version: 1, downloadStart: 'prepared' } }
  ];
  rows = rows.map((row) => row.id === 'legacy-a0' ? { ...row, kind: 'unknown' } : row);
  const c = counts(rows);
  assert.equal(c.manual, 100);
  assert.equal(c.reserved, 1);
  assert.equal(c.manualLiability, 101,
    'pre-protocol active transition can create grandfathered overflow');
  assert.equal(canAdmitNewProtocol(rows), false,
    'overflow blocks new admission but does not erase/reject the factual transition');
})();

(function terminalNewProtocolReleasesReservation() {
  let rows = [
    ...Array.from({ length: 99 }, (_, i) => ({ id: `u${i}`, kind: 'unknown' })),
    { id: 'new', kind: 'intent', externalStages: { version: 1, downloadStart: 'prepared' } }
  ];
  assert.equal(counts(rows).manualLiability, 100);
  rows = rows.map((row) => row.id === 'new'
    ? { ...row, terminal: true, externalStages: { version: 1, downloadStart: 'cancelled-before-start' } }
    : row);
  assert.equal(counts(rows).manualLiability, 99);
  assert.equal(canAdmitNewProtocol(rows), true);
})();

console.log('P0-072 rollout liability reservation model: PASS');
