'use strict';
const assert = require('node:assert/strict');

function makeControl(generation, destructiveBoundarySeen) {
  return { version: 1, generation, destructiveBoundarySeen: Boolean(destructiveBoundarySeen) };
}
function parseControl(raw) {
  if (raw == null) return { status: 'absent' };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { status: 'invalid' };
  if (raw.version !== 1) return { status: 'unsupported-version' };
  if (!/^G[0-9]+$/.test(raw.generation)) return { status: 'invalid' };
  if (typeof raw.destructiveBoundarySeen !== 'boolean') return { status: 'invalid' };
  return { status: 'valid', value: raw };
}
function ensureBootstrap(db) {
  const parsed = parseControl(db.control);
  if (parsed.status === 'valid') return parsed.value;
  if (parsed.status !== 'absent') throw new Error(parsed.status);
  db.control = makeControl(`G${db.next++}`, false);
  return db.control;
}
function adoptLegacyPending(db, row) {
  const control = ensureBootstrap(db);
  if (row.expectedJournalGeneration) return row.expectedJournalGeneration === control.generation;
  if (control.destructiveBoundarySeen) return false;
  row.expectedJournalGeneration = control.generation;
  return true;
}
function destructiveReset(db, rows, relationOf) {
  const parsed = parseControl(db.control);
  if (parsed.status !== 'valid' && parsed.status !== 'absent') throw new Error(parsed.status);
  const oldGeneration = parsed.status === 'valid' ? parsed.value.generation : '';
  const next = makeControl(`G${db.next++}`, true);
  for (const row of rows) {
    const relation = relationOf(row);
    if (relation === 'nonmatch') row.expectedJournalGeneration = next.generation;
    else row.resetDisposition = { relation };
  }
  db.control = next;
  return { oldGeneration, newGeneration: next.generation };
}

const db = { control: null, next: 1 };
const legacy = { id: 'legacy', expectedJournalGeneration: '' };
assert.equal(adoptLegacyPending(db, legacy), true);
assert.deepEqual(db.control, makeControl('G1', false));
assert.equal(legacy.expectedJournalGeneration, 'G1');

const anotherLegacy = { id: 'legacy2', expectedJournalGeneration: '' };
assert.equal(adoptLegacyPending(db, anotherLegacy), true,
  'legacy missing token may adopt while no destructive boundary has occurred');
assert.equal(anotherLegacy.expectedJournalGeneration, 'G1');

const rows = [legacy, anotherLegacy, { id: 'match', expectedJournalGeneration: 'G1' }];
destructiveReset(db, rows, (row) => row.id === 'match' ? 'match' : 'nonmatch');
assert.equal(db.control.generation, 'G2');
assert.equal(db.control.destructiveBoundarySeen, true);
assert.equal(legacy.expectedJournalGeneration, 'G2');
assert.equal(anotherLegacy.expectedJournalGeneration, 'G2');
assert.equal(rows[2].resetDisposition.relation, 'match');

const appearedAfterBoundary = { id: 'late-legacy', expectedJournalGeneration: '' };
assert.equal(adoptLegacyPending(db, appearedAfterBoundary), false,
  'missing generation cannot be grandfathered after any destructive boundary');
assert.equal(appearedAfterBoundary.expectedJournalGeneration, '');

const firstActionIsReset = { control: null, next: 10 };
const p = { id: 'P', expectedJournalGeneration: '' };
destructiveReset(firstActionIsReset, [p], () => 'nonmatch');
assert.deepEqual(firstActionIsReset.control, makeControl('G10', true));
assert.equal(p.expectedJournalGeneration, 'G10',
  'reset transaction may explicitly rebase a definite nonmatch even on initial bootstrap');

assert.throws(() => ensureBootstrap({ control: { version: 2 }, next: 20 }), /unsupported-version/,
  'future control body must not be mistaken for missing and re-bootstrap authority');
assert.throws(() => ensureBootstrap({ control: { version: 1, generation: '', destructiveBoundarySeen: false }, next: 20 }), /invalid/);

console.log('P0-076 Journal generation bootstrap/rollback model: PASS');
