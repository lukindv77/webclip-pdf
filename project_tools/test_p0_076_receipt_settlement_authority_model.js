'use strict';
const assert = require('node:assert/strict');

function clone(v) { return JSON.parse(JSON.stringify(v)); }
function freshAuthority(db, id) {
  const e = db.entries.get(id);
  return e ? { journalGeneration: db.journalGeneration, entryGeneration: e.local.generation, entryRevision: e.local.revision } : null;
}
function exactMatch(db, id, a) {
  const e = db.entries.get(id);
  return Boolean(e && a
    && db.journalGeneration === a.journalGeneration
    && e.local.generation === a.entryGeneration
    && e.local.revision === a.entryRevision);
}
function mutateFresh(db, id, a, patch) {
  if (!exactMatch(db, id, a)) return { ok: false, reason: 'stale-authority' };
  const e = clone(db.entries.get(id));
  Object.assign(e, patch);
  e.local.revision += 1;
  db.entries.set(id, e);
  return { ok: true, authority: freshAuthority(db, id) };
}
function admitMove(db, id, a, operationId) {
  if (!exactMatch(db, id, a)) return { ok: false, reason: 'stale-authority' };
  const e = clone(db.entries.get(id));
  e.readMoveOperationId = operationId;
  e.local.revision += 1;
  db.entries.set(id, e);
  const receipt = {
    effectId: `effect-${operationId}`,
    operationId,
    journalGeneration: db.journalGeneration,
    entryId: id,
    entryGeneration: e.local.generation,
    phase: 'prepared',
    resetDisposition: null
  };
  db.receipts.set(receipt.effectId, receipt);
  return { ok: true, receipt: clone(receipt), authority: freshAuthority(db, id) };
}
function admitExternalEffect(db, effectId) {
  const r = db.receipts.get(effectId);
  if (!r || r.resetDisposition) return { ok: false, permitMutation: false };
  if (r.phase !== 'prepared') return { ok: true, permitMutation: false, status: r.phase };
  r.phase = 'effect-admitted';
  return { ok: true, permitMutation: true, status: 'admitted-now' };
}
function settleMoveFromReceipt(db, effectId, patch) {
  const r = db.receipts.get(effectId);
  if (!r || r.phase !== 'effect-admitted') return { ok: false, reason: 'not-admitted' };
  if (r.resetDisposition) return { ok: false, reason: 'reset-detached' };
  if (db.journalGeneration !== r.journalGeneration) return { ok: false, reason: 'stale-journal-generation' };
  const e = db.entries.get(r.entryId);
  if (!e || e.local.generation !== r.entryGeneration) return { ok: false, reason: 'stale-entry-incarnation' };
  if (e.readMoveOperationId !== r.operationId) return { ok: false, reason: 'superseded-operation' };
  const next = clone(e);
  Object.assign(next, patch);
  next.local.revision += 1;
  db.entries.set(r.entryId, next);
  r.phase = 'verified';
  return { ok: true, authority: freshAuthority(db, r.entryId), entry: clone(next) };
}
function bulkReset(db) {
  db.journalGeneration = `${db.journalGeneration}-next`;
  for (const r of db.receipts.values()) r.resetDisposition = { version: 1, state: 'quarantined' };
}

const db = {
  journalGeneration: 'J1',
  entries: new Map([['A', { id: 'A', title: 'a', comments: [], readMoveOperationId: '', local: { generation: 'EA', revision: 1 } }]]),
  receipts: new Map()
};

const initial = freshAuthority(db, 'A');
const admitted = admitMove(db, 'A', initial, 'M1');
assert(admitted.ok);
assert.equal(admitExternalEffect(db, admitted.receipt.effectId).status, 'admitted-now');
assert.equal(admitExternalEffect(db, admitted.receipt.effectId).permitMutation, false, 'already admitted receipt cannot authorize duplicate remote effect');

const commentAuthority = freshAuthority(db, 'A');
assert(mutateFresh(db, 'A', commentAuthority, { comments: ['new comment'] }).ok);
assert.equal(mutateFresh(db, 'A', admitted.authority, { title: 'stale UI write' }).reason, 'stale-authority');

const settled = settleMoveFromReceipt(db, admitted.receipt.effectId, {
  readingMode: 'read',
  remotePath: '/Upload/file.pdf',
  readMoveOperationId: ''
});
assert(settled.ok, 'worker-issued receipt may settle the same admitted entry incarnation after an unrelated point mutation');
assert.deepEqual(settled.entry.comments, ['new comment'], 'receipt-owned patch must preserve unrelated newer fields');

const dbReset = {
  journalGeneration: 'J1',
  entries: new Map([['A', { id: 'A', readMoveOperationId: '', local: { generation: 'EA', revision: 1 } }]]),
  receipts: new Map()
};
const a2 = freshAuthority(dbReset, 'A');
const r2 = admitMove(dbReset, 'A', a2, 'M2');
assert(admitExternalEffect(dbReset, r2.receipt.effectId).permitMutation);
bulkReset(dbReset);
assert.equal(settleMoveFromReceipt(dbReset, r2.receipt.effectId, { readingMode: 'read' }).reason, 'reset-detached');

const dbReplace = {
  journalGeneration: 'J1',
  entries: new Map([['A', { id: 'A', readMoveOperationId: '', local: { generation: 'EA', revision: 1 } }]]),
  receipts: new Map()
};
const a3 = freshAuthority(dbReplace, 'A');
const r3 = admitMove(dbReplace, 'A', a3, 'M3');
assert(admitExternalEffect(dbReplace, r3.receipt.effectId).permitMutation);
dbReplace.entries.set('A', { id: 'A', readMoveOperationId: 'M3', local: { generation: 'EB', revision: 1 } });
assert.equal(settleMoveFromReceipt(dbReplace, r3.receipt.effectId, { readingMode: 'read' }).reason, 'stale-entry-incarnation');

console.log('P0-076 receipt settlement authority model: PASS');
