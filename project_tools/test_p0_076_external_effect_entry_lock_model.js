'use strict';
const assert = require('node:assert/strict');

function authority(db) {
  const e = db.entry;
  return { journalGeneration: db.generation, entryGeneration: e.local.generation, entryRevision: e.local.revision };
}
function exact(db, a) {
  const e = db.entry;
  return Boolean(e && a && db.generation === a.journalGeneration && e.local.generation === a.entryGeneration && e.local.revision === a.entryRevision);
}
function lockBlocks(lock, mutationKind) {
  if (!lock) return false;
  if (lock.kind === 'mark-read') return mutationKind !== 'comment';
  if (lock.kind === 'delete-trash') return true;
  return true;
}
function pointMutate(db, a, kind, patch) {
  if (!exact(db, a)) return { ok: false, reason: 'stale-authority' };
  if (lockBlocks(db.entry.journalExternalEffectLock, kind)) return { ok: false, reason: 'entry-busy' };
  Object.assign(db.entry, patch);
  db.entry.local.revision += 1;
  return { ok: true, authority: authority(db) };
}
function admitEffect(db, a, kind, effectId) {
  if (!exact(db, a)) return { ok: false, reason: 'stale-authority' };
  if (db.entry.journalExternalEffectLock) return { ok: false, reason: 'entry-busy' };
  db.entry.journalExternalEffectLock = { version: 1, kind, effectId };
  db.entry.local.revision += 1;
  db.receipts.set(effectId, { effectId, kind, journalGeneration: db.generation, entryGeneration: db.entry.local.generation, phase: 'effect-admitted' });
  return { ok: true, authority: authority(db) };
}
function settleMarkRead(db, effectId) {
  const r = db.receipts.get(effectId);
  const e = db.entry;
  if (!r || r.phase !== 'effect-admitted') return { ok: false, reason: 'bad-receipt' };
  if (!e || db.generation !== r.journalGeneration || e.local.generation !== r.entryGeneration) return { ok: false, reason: 'stale-incarnation' };
  if (e.journalExternalEffectLock?.effectId !== effectId || e.journalExternalEffectLock?.kind !== 'mark-read') return { ok: false, reason: 'superseded-lock' };
  e.readingMode = 'read';
  delete e.journalExternalEffectLock;
  e.local.revision += 1;
  r.phase = 'verified';
  return { ok: true, authority: authority(db) };
}
function settleDelete(db, effectId) {
  const r = db.receipts.get(effectId);
  const e = db.entry;
  if (!r || r.phase !== 'effect-admitted') return { ok: false, reason: 'bad-receipt' };
  if (!e || db.generation !== r.journalGeneration || e.local.generation !== r.entryGeneration) return { ok: false, reason: 'stale-incarnation' };
  if (e.journalExternalEffectLock?.effectId !== effectId || e.journalExternalEffectLock?.kind !== 'delete-trash') return { ok: false, reason: 'superseded-lock' };
  db.entry = null;
  r.phase = 'verified';
  return { ok: true };
}

const db = { generation: 'J1', entry: { id: 'A', comments: [], readingMode: 'later', local: { generation: 'EA', revision: 1 } }, receipts: new Map() };
let a = authority(db);
let r = admitEffect(db, a, 'mark-read', 'MR1');
assert(r.ok);
a = r.authority;
const comment = pointMutate(db, a, 'comment', { comments: ['c1'] });
assert(comment.ok, 'comments remain compatible with Mark Read in flight');
assert.equal(admitEffect(db, comment.authority, 'delete-trash', 'D0').reason, 'entry-busy', 'delete cannot race an admitted Mark Read');
assert.equal(pointMutate(db, comment.authority, 'delete-keep', {}).reason, 'entry-busy');
const mr = settleMarkRead(db, 'MR1');
assert(mr.ok);
assert.deepEqual(db.entry.comments, ['c1']);
assert.equal(db.entry.journalExternalEffectLock, undefined);

a = mr.authority;
r = admitEffect(db, a, 'delete-trash', 'D1');
assert(r.ok);
assert.equal(pointMutate(db, r.authority, 'comment', { comments: ['must-not-land'] }).reason, 'entry-busy',
  'exclusive delete lock prevents data created after delete admission from being silently lost');
assert.equal(admitEffect(db, r.authority, 'mark-read', 'MR2').reason, 'entry-busy');
assert(settleDelete(db, 'D1').ok);
assert.equal(db.entry, null);

const replaced = { generation: 'J1', entry: { id: 'A', local: { generation: 'EB', revision: 1 }, journalExternalEffectLock: { version: 1, kind: 'delete-trash', effectId: 'D2' } }, receipts: new Map([['D2', { effectId: 'D2', kind: 'delete-trash', journalGeneration: 'J1', entryGeneration: 'EA', phase: 'effect-admitted' }]]) };
assert.equal(settleDelete(replaced, 'D2').reason, 'stale-incarnation');
assert(replaced.entry, 'same-id replacement survives old delete receipt');

console.log('P0-076 external-effect entry lock model: PASS');
