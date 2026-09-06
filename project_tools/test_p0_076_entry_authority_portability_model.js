'use strict';
const assert = require('node:assert/strict');

function clone(v) { return JSON.parse(JSON.stringify(v)); }
function authority(db, id) {
  const entry = db.entries.get(id);
  if (!entry) return null;
  const local = entry.journalLocalRevision;
  if (!local) {
    return { version: 1, kind: 'legacy', journalGeneration: db.journalGeneration || '', legacyDbRevision: db.dbRevision };
  }
  return {
    version: 1,
    kind: 'modern',
    journalGeneration: db.journalGeneration || '',
    entryGeneration: local.generation,
    entryRevision: local.revision
  };
}
function matches(db, entry, expected) {
  if (!entry || !expected || expected.version !== 1) return false;
  if ((db.journalGeneration || '') !== expected.journalGeneration) return false;
  const local = entry.journalLocalRevision;
  if (!local) return expected.kind === 'legacy' && db.dbRevision === expected.legacyDbRevision;
  return expected.kind === 'modern'
    && local.generation === expected.entryGeneration
    && local.revision === expected.entryRevision;
}
function mutate(db, id, expected, patch) {
  const current = db.entries.get(id);
  if (!matches(db, current, expected)) return { ok: false, reason: 'stale-authority' };
  const next = clone(current);
  if (!next.journalLocalRevision) {
    next.journalLocalRevision = { version: 1, generation: `local-${db.nextGeneration++}`, revision: 1 };
  } else {
    assert(next.journalLocalRevision.revision < Number.MAX_SAFE_INTEGER);
    next.journalLocalRevision.revision += 1;
  }
  Object.assign(next, patch);
  db.entries.set(id, next);
  db.dbRevision += 1;
  return { ok: true, authority: authority(db, id), entry: clone(next) };
}
function createEntry(db, data, expectedJournalGeneration) {
  if ((db.journalGeneration || '') !== expectedJournalGeneration) return { ok: false, reason: 'stale-journal-generation' };
  if (db.entries.has(data.id)) return { ok: false, reason: 'exists' };
  const entry = {
    ...clone(data),
    journalLocalRevision: { version: 1, generation: `local-${db.nextGeneration++}`, revision: 1 }
  };
  db.entries.set(entry.id, entry);
  db.dbRevision += 1;
  return { ok: true, entry: clone(entry), authority: authority(db, entry.id) };
}
function rotateJournalGeneration(db) {
  db.journalGeneration = `journal-${db.nextJournalGeneration++}`;
  db.dbRevision += 1;
}
function portableEntry(entry) {
  const out = clone(entry);
  delete out.journalLocalRevision;
  return out;
}
function importPortableEntry(db, raw) {
  const clean = { id: String(raw.id), title: String(raw.title || '') };
  clean.journalLocalRevision = { version: 1, generation: `local-${db.nextGeneration++}`, revision: 1 };
  db.entries.set(clean.id, clean);
  return clean;
}

const db = {
  journalGeneration: 'journal-1',
  dbRevision: 10,
  nextGeneration: 100,
  nextJournalGeneration: 2,
  entries: new Map([
    ['A', { id: 'A', title: 'a', journalLocalRevision: { version: 1, generation: 'local-A', revision: 3 } }],
    ['B', { id: 'B', title: 'b', journalLocalRevision: { version: 1, generation: 'local-B', revision: 9 } }],
    ['L', { id: 'L', title: 'legacy' }]
  ])
};

const a0 = authority(db, 'A');
const b0 = authority(db, 'B');
assert(mutate(db, 'B', b0, { title: 'b2' }).ok);
assert(mutate(db, 'A', a0, { title: 'a2' }).ok, 'unrelated B mutation must not invalidate modern A authority');
const a1 = authority(db, 'A');
assert.equal(mutate(db, 'A', a0, { title: 'stale' }).reason, 'stale-authority');
assert.equal(a1.entryRevision, a0.entryRevision + 1);

const legacy = authority(db, 'L');
assert.equal(legacy.kind, 'legacy');
assert(mutate(db, 'L', legacy, { title: 'modernized' }).ok);
assert.equal(authority(db, 'L').kind, 'modern', 'first legacy mutation lazily installs local revision authority');

const beforeBulk = authority(db, 'A');
rotateJournalGeneration(db);
assert.equal(mutate(db, 'A', beforeBulk, { title: 'old bulk generation' }).reason, 'stale-authority');

const recreatedOld = authority(db, 'A');
db.entries.delete('A');
const created = createEntry(db, { id: 'A', title: 'new incarnation' }, db.journalGeneration);
assert(created.ok);
assert.notEqual(created.authority.entryGeneration, recreatedOld.entryGeneration);
assert.equal(mutate(db, 'A', recreatedOld, { title: 'must not touch reincarnation' }).reason, 'stale-authority');

const exported = portableEntry(db.entries.get('A'));
assert.equal(Object.prototype.hasOwnProperty.call(exported, 'journalLocalRevision'), false, 'export must strip local mutation authority');

const attackerBackup = { id: 'X', title: 'portable', journalLocalRevision: { version: 1, generation: 'forged', revision: 999 } };
const imported = importPortableEntry(db, attackerBackup);
assert.notEqual(imported.journalLocalRevision.generation, 'forged', 'import must ignore portable local authority');
assert.equal(imported.journalLocalRevision.revision, 1);

const admittedGeneration = db.journalGeneration;
rotateJournalGeneration(db);
assert.equal(createEntry(db, { id: 'late', title: 'late operation' }, admittedGeneration).reason, 'stale-journal-generation',
  'an operation admitted before bulk reset cannot create a Journal entry afterwards');
assert(createEntry(db, { id: 'fresh', title: 'fresh operation' }, db.journalGeneration).ok);

console.log('P0-076 entry authority/portability model: PASS');
