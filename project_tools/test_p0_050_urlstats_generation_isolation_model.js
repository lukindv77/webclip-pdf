'use strict';

const assert = require('assert');

function statFromJournal(journal) {
  const out = new Map();
  for (const entry of journal.values()) {
    const key = entry.urlKey;
    if (!out.has(key)) out.set(key, { count: 0, lastSavedAt: 0 });
    const stat = out.get(key);
    stat.count += 1;
    stat.lastSavedAt = Math.max(stat.lastSavedAt, entry.createdAt);
  }
  return out;
}

function cloneStats(stats) {
  return new Map([...stats].map(([k, v]) => [k, { ...v }]));
}

// Broken current-shaped schedule: rebuild reads old Journal batch, a point delete
// recomputes the live derived row, then the rebuild merges the stale batch back.
{
  const journal = new Map([
    ['e1', { urlKey: 'u', createdAt: 10 }],
    ['e2', { urlKey: 'u', createdAt: 20 }]
  ]);
  let liveStats = new Map();
  const staleBatch = statFromJournal(journal);

  journal.delete('e2');
  liveStats = statFromJournal(journal);
  const current = liveStats.get('u') || { count: 0, lastSavedAt: 0 };
  const stale = staleBatch.get('u');
  liveStats.set('u', {
    count: current.count + stale.count,
    lastSavedAt: Math.max(current.lastSavedAt, stale.lastSavedAt)
  });

  assert.deepStrictEqual(liveStats.get('u'), { count: 3, lastSavedAt: 20 });
  assert.deepStrictEqual(statFromJournal(journal).get('u'), { count: 1, lastSavedAt: 10 });
}

function makeState(entries) {
  const journal = new Map(entries);
  return {
    journal,
    journalRevision: 1,
    nextStatsGeneration: 2,
    activeGeneration: 1,
    generations: new Map([[1, statFromJournal(journal)]])
  };
}

function mutateDelete(state, id) {
  state.journal.delete(id);
  state.journalRevision += 1;
  state.generations.set(state.activeGeneration, statFromJournal(state.journal));
}

function mutateAppend(state, id, entry) {
  state.journal.set(id, entry);
  state.journalRevision += 1;
  const active = cloneStats(state.generations.get(state.activeGeneration) || new Map());
  const current = active.get(entry.urlKey) || { count: 0, lastSavedAt: 0 };
  active.set(entry.urlKey, {
    count: current.count + 1,
    lastSavedAt: Math.max(current.lastSavedAt, entry.createdAt)
  });
  state.generations.set(state.activeGeneration, active);
}

function beginRebuild(state) {
  return {
    buildGeneration: state.nextStatsGeneration++,
    sourceRevision: state.journalRevision,
    staged: statFromJournal(state.journal)
  };
}

function publishRebuild(state, build) {
  if (state.journalRevision !== build.sourceRevision) {
    state.generations.delete(build.buildGeneration);
    return { published: false, reason: 'source-revision-changed' };
  }
  state.generations.set(build.buildGeneration, build.staged);
  state.activeGeneration = build.buildGeneration;
  return { published: true };
}

function activeStats(state) {
  return state.generations.get(state.activeGeneration);
}

{
  const state = makeState([
    ['e1', { urlKey: 'u', createdAt: 10 }],
    ['e2', { urlKey: 'u', createdAt: 20 }]
  ]);
  const build = beginRebuild(state);
  assert.deepStrictEqual(publishRebuild(state, build), { published: true });
  assert.strictEqual(state.activeGeneration, 2);
  assert.deepStrictEqual(activeStats(state).get('u'), { count: 2, lastSavedAt: 20 });
}

{
  const state = makeState([
    ['e1', { urlKey: 'u', createdAt: 10 }],
    ['e2', { urlKey: 'u', createdAt: 20 }]
  ]);
  const build = beginRebuild(state);
  mutateDelete(state, 'e2');
  assert.deepStrictEqual(publishRebuild(state, build), { published: false, reason: 'source-revision-changed' });
  assert.deepStrictEqual(activeStats(state).get('u'), { count: 1, lastSavedAt: 10 });
}

{
  const state = makeState([['e1', { urlKey: 'u', createdAt: 10 }]]);
  const build = beginRebuild(state);
  mutateAppend(state, 'e2', { urlKey: 'u', createdAt: 30 });
  assert.deepStrictEqual(publishRebuild(state, build), { published: false, reason: 'source-revision-changed' });
  assert.deepStrictEqual(activeStats(state).get('u'), { count: 2, lastSavedAt: 30 });
}

{
  const state = makeState([['e1', { urlKey: 'u', createdAt: 10 }]]);
  const build = beginRebuild(state);
  state.generations.set(build.buildGeneration, build.staged);
  assert.strictEqual(state.activeGeneration, 1);
  assert.deepStrictEqual(activeStats(state).get('u'), { count: 1, lastSavedAt: 10 });
}

{
  const state = makeState([['e1', { urlKey: 'u', createdAt: 10 }]]);
  const build = beginRebuild(state);
  assert.strictEqual(publishRebuild(state, build).published, true);
  mutateAppend(state, 'e2', { urlKey: 'u', createdAt: 40 });
  assert.strictEqual(state.activeGeneration, 2);
  assert.deepStrictEqual(activeStats(state).get('u'), { count: 2, lastSavedAt: 40 });
}

console.log('P0-050 urlStats generation isolation model: PASS');
