'use strict';
const assert = require('node:assert/strict');

function makeState({ generation = 'G1', dbRevision = 'D1', entries = {} } = {}) {
  return { generation, dbRevision, entries: structuredClone(entries) };
}

function mutateEntry(state, id, expected, nextRevision) {
  const current = state.entries[id];
  if (!current) return { ok: false, reason: 'missing' };
  if (state.generation !== expected.journalGeneration) return { ok: false, reason: 'stale-journal-generation' };

  if (current.entryRevision) {
    if (current.entryRevision !== expected.entryRevision) return { ok: false, reason: 'stale-entry-revision' };
  } else {
    if (!expected.renderedDbRevision || state.dbRevision !== expected.renderedDbRevision) {
      return { ok: false, reason: 'stale-legacy-render' };
    }
  }

  const next = structuredClone(state);
  next.entries[id] = { ...current, entryRevision: nextRevision };
  next.dbRevision = `${state.dbRevision}:next`;
  return { ok: true, state: next, entry: next.entries[id] };
}

function appendNewEntry(state, entry, expectedJournalGeneration, newRevision) {
  if (state.generation !== expectedJournalGeneration) return { ok: false, reason: 'stale-journal-generation' };
  if (state.entries[entry.id]) return { ok: false, reason: 'id-exists' };
  const next = structuredClone(state);
  next.entries[entry.id] = { ...entry, entryRevision: newRevision };
  next.dbRevision = `${state.dbRevision}:append`;
  return { ok: true, state: next };
}

function bulkReplace(state, importedEntries, nextGeneration, nextRevisions) {
  const next = makeState({ generation: nextGeneration, dbRevision: `${state.dbRevision}:bulk`, entries: {} });
  for (const entry of importedEntries) {
    // Portable authority is ignored. Every committed imported row gets a new
    // installation-local per-entry revision token.
    const { entryRevision: _portableIgnored, ...logical } = entry;
    next.entries[entry.id] = { ...logical, entryRevision: nextRevisions[entry.id] };
  }
  return next;
}

function blindIdOnlyPatch(state, id, patch) {
  if (!state.entries[id]) return state;
  const next = structuredClone(state);
  next.entries[id] = { ...next.entries[id], ...patch };
  return next;
}

const initial = makeState({
  generation: 'G1',
  dbRevision: 'D1',
  entries: {
    A: { id: 'A', title: 'old A', entryRevision: 'A1' },
    B: { id: 'B', title: 'old B', entryRevision: 'B1' },
    L: { id: 'L', title: 'legacy without revision' }
  }
});

const a1 = { journalGeneration: 'G1', entryRevision: 'A1' };
const mutateA = mutateEntry(initial, 'A', a1, 'A2');
assert.equal(mutateA.ok, true);
assert.equal(mutateA.entry.entryRevision, 'A2');

assert.deepEqual(
  mutateEntry(mutateA.state, 'A', a1, 'A3'),
  { ok: false, reason: 'stale-entry-revision' },
  'stale rendered A cannot overwrite a newer point mutation'
);

const mutateB = mutateEntry(initial, 'B', { journalGeneration: 'G1', entryRevision: 'B1' }, 'B2');
assert.equal(mutateB.ok, true);
assert.equal(
  mutateEntry(mutateB.state, 'A', a1, 'A2').ok,
  true,
  'an unrelated point mutation must not rotate Journal generation or invalidate modern A authority'
);

const replaced = bulkReplace(
  mutateA.state,
  [{ id: 'A', title: 'imported replacement', entryRevision: 'portable-attacker-token' }],
  'G2',
  { A: 'A-import-1' }
);
assert.equal(replaced.entries.A.entryRevision, 'A-import-1');
assert.equal(
  mutateEntry(replaced, 'A', { journalGeneration: 'G1', entryRevision: 'A2' }, 'A3').reason,
  'stale-journal-generation',
  'same textual id after replace/import is not old mutation authority'
);

const blind = blindIdOnlyPatch(replaced, 'A', { title: 'BUG old writer changed replacement' });
assert.equal(blind.entries.A.title, 'BUG old writer changed replacement',
  'negative control: current id-only patch can mutate a replacement row');

const legacyOk = mutateEntry(initial, 'L', {
  journalGeneration: 'G1',
  entryRevision: '',
  renderedDbRevision: 'D1'
}, 'L1');
assert.equal(legacyOk.ok, true);
assert.equal(legacyOk.entry.entryRevision, 'L1', 'first safe legacy mutation upgrades the row to targeted authority');

const unrelatedChanged = mutateB.state;
assert.equal(
  mutateEntry(unrelatedChanged, 'L', {
    journalGeneration: 'G1',
    entryRevision: '',
    renderedDbRevision: 'D1'
  }, 'L1').reason,
  'stale-legacy-render',
  'legacy fallback is intentionally conservative after any intervening DB revision change'
);

const oldAppend = appendNewEntry(initial, { id: 'C', title: 'old operation' }, 'G1', 'C1');
assert.equal(oldAppend.ok, true);
const afterBulk = bulkReplace(initial, [], 'G2', {});
assert.equal(
  appendNewEntry(afterBulk, { id: 'C', title: 'late old operation' }, 'G1', 'C1').reason,
  'stale-journal-generation',
  'operation admitted before bulk generation change cannot append into the new Journal generation'
);

console.log('P0-076 Journal generation/per-entry CAS model: PASS');
