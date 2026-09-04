'use strict';
const assert = require('node:assert/strict');

function counts(rows) {
  let active = 0, manual = 0, terminal = 0;
  for (const row of rows) {
    if (row.class === 'active' || row.class === 'reconciling') active += 1;
    if (row.class === 'manual') manual += 1;
    if (row.class === 'terminal') terminal += 1;
  }
  return { active, manual, terminal, unresolved: active + manual };
}

function canAdmit(rows, { activeCap, unresolvedCap }) {
  const c = counts(rows);
  return c.active < activeCap && c.unresolved < unresolvedCap;
}

function transition(rows, id, nextClass) {
  return rows.map((row) => row.id === id ? { ...row, class: nextClass } : row);
}

(function activeToManualNeverNeedsNewLiabilitySlot() {
  const limits = { activeCap: 2, unresolvedCap: 3 };
  let rows = [
    { id: 'a', class: 'active' },
    { id: 'b', class: 'active' },
    { id: 'm', class: 'manual' }
  ];
  assert.equal(canAdmit(rows, limits), false, 'liability is full');
  const before = counts(rows);
  rows = transition(rows, 'a', 'manual');
  const after = counts(rows);
  assert.equal(after.unresolved, before.unresolved,
    'active->manual is reclassification, not new liability');
  assert.equal(after.manual, 2);
})();

(function separateManualHardCapWouldBeUnsafe() {
  const rows = [
    { id: 'a', class: 'active' },
    { id: 'm', class: 'manual' }
  ];
  const manualCap = 1;
  assert.equal(counts(rows).manual, manualCap);
  const settled = transition(rows, 'a', 'manual');
  assert.equal(counts(settled).manual, 2,
    'factual unknown/manual transition must remain recordable even when prior manual count equals a nominal UI/retention target');
})();

(function newAdmissionReservesFutureUnknownLiability() {
  const limits = { activeCap: 3, unresolvedCap: 3 };
  const rows = [
    { id: 'a', class: 'active' },
    { id: 'm1', class: 'manual' },
    { id: 'm2', class: 'manual' }
  ];
  assert.equal(canAdmit(rows, limits), false,
    'new irreversible work must fail closed when no unresolved-liability slot remains');
})();

(function resetReclassificationDoesNotConsumeExtraSlot() {
  const rows = [
    { id: 'a', class: 'active' },
    { id: 'b', class: 'active' },
    { id: 'm', class: 'manual' }
  ];
  const before = counts(rows);
  const afterRows = transition(transition(rows, 'a', 'reconciling'), 'b', 'manual');
  const after = counts(afterRows);
  assert.equal(after.unresolved, before.unresolved,
    'reset of existing rows preserves unresolved liability count');
})();

(function hiddenLegacyMaterializationConsumesLiability() {
  const limits = { activeCap: 20, unresolvedCap: 40 };
  const rows = Array.from({ length: 40 }, (_, i) => ({ id: `m${i}`, class: 'manual' }));
  assert.equal(counts(rows).unresolved, 40);
  assert.equal(canAdmit(rows, limits), false);
  const withHidden = [...rows, { id: 'legacy-hidden', class: 'manual' }];
  assert.equal(counts(withHidden).unresolved, 41,
    'hidden legacy materialization is the case that truly adds liability during reset');
})();

(function terminalTransitionReleasesLiability() {
  const limits = { activeCap: 2, unresolvedCap: 2 };
  let rows = [{ id: 'a', class: 'reconciling' }, { id: 'm', class: 'manual' }];
  assert.equal(canAdmit(rows, limits), false);
  rows = transition(rows, 'a', 'terminal');
  assert.equal(counts(rows).unresolved, 1);
  assert.equal(canAdmit(rows, limits), true,
    'proven terminal settlement releases unresolved liability for future admission');
})();

console.log('P0-072 unresolved liability reservation model: PASS');
