'use strict';
const assert = require('node:assert/strict');

function reset(db, { kind, scopeKey = '' }) {
  const oldGeneration = db.generation;
  const newGeneration = `J${Number(oldGeneration.slice(1)) + 1}`;
  for (const row of db.pending.values()) {
    assert.equal(row.expectedJournalGeneration, oldGeneration,
      'model starts from current-generation durable checkpoints');
    let relation = 'match';
    if (kind === 'clear-url') {
      relation = row.urlKey ? (row.urlKey === scopeKey ? 'match' : 'nonmatch') : 'indeterminate';
    } else if (kind === 'clear-site') {
      relation = row.siteKey ? (row.siteKey === scopeKey ? 'match' : 'nonmatch') : 'indeterminate';
    }
    if (relation === 'nonmatch') {
      row.expectedJournalGeneration = newGeneration;
      row.rebasedByReset = `${oldGeneration}->${newGeneration}`;
    } else {
      row.resetDisposition = { relation, generationBefore: oldGeneration, generationAfter: newGeneration };
    }
  }
  db.generation = newGeneration;
  return { oldGeneration, newGeneration };
}

function canContinue(db, row) {
  return Boolean(row && !row.resetDisposition && row.expectedJournalGeneration === db.generation);
}

function staleWriterPut(db, id, captured) {
  const current = db.pending.get(id);
  if (!current) return false;
  if (current.expectedJournalGeneration !== captured.expectedJournalGeneration) return false;
  db.pending.set(id, { ...captured });
  return true;
}

const db = {
  generation: 'J1',
  pending: new Map([
    ['A', { id: 'A', urlKey: 'https://a.test/x', siteKey: 'a.test', expectedJournalGeneration: 'J1' }],
    ['B', { id: 'B', urlKey: 'https://b.test/y', siteKey: 'b.test', expectedJournalGeneration: 'J1' }],
    ['C', { id: 'C', urlKey: '', siteKey: '', expectedJournalGeneration: 'J1' }]
  ])
};
const staleB = { ...db.pending.get('B') };
const r = reset(db, { kind: 'clear-url', scopeKey: 'https://a.test/x' });
assert.deepEqual(r, { oldGeneration: 'J1', newGeneration: 'J2' });
assert.equal(canContinue(db, db.pending.get('A')), false, 'matching checkpoint is detached');
assert.equal(canContinue(db, db.pending.get('B')), true, 'definite nonmatch is atomically rebased');
assert.equal(db.pending.get('B').expectedJournalGeneration, 'J2');
assert.equal(canContinue(db, db.pending.get('C')), false, 'indeterminate checkpoint is detached/manual, not rebased');
assert.equal(staleWriterPut(db, 'B', staleB), false, 'stale captured writer cannot overwrite reset-owned generation rebase');

const noCheckpointOperation = { expectedJournalGeneration: 'J1' };
assert.notEqual(noCheckpointOperation.expectedJournalGeneration, db.generation,
  'pre-reset operation with no durable checkpoint cannot silently rebase itself');

const full = {
  generation: 'J7',
  pending: new Map([
    ['A', { id: 'A', urlKey: 'https://a.test/x', siteKey: 'a.test', expectedJournalGeneration: 'J7' }],
    ['B', { id: 'B', urlKey: 'https://b.test/y', siteKey: 'b.test', expectedJournalGeneration: 'J7' }]
  ])
};
reset(full, { kind: 'clear-all' });
assert.equal(canContinue(full, full.pending.get('A')), false);
assert.equal(canContinue(full, full.pending.get('B')), false);
assert.equal(full.pending.get('A').expectedJournalGeneration, 'J7', 'full reset never rebases old authority');

console.log('P0-076/P0-072 scoped reset generation rebase model: PASS');
