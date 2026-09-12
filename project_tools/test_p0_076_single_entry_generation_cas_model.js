'use strict';

// Owner marker for PR contract: P0-076
// Adjacent existing owners kept separate: P0-072, P1-090

const assert = require('assert');

let checks = 0;
function check(condition, message) {
  assert.ok(condition, message);
  checks += 1;
}
function eq(actual, expected, message) {
  assert.deepStrictEqual(actual, expected, message);
  checks += 1;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function currentJournal(entries = []) {
  return {
    dbRevision: 1,
    entries: new Map(entries.map((entry) => [entry.id, clone(entry)]))
  };
}

function currentTouch(journal) {
  journal.dbRevision += 1;
}

function currentBlindUpdate(journal, id, patch) {
  const current = journal.entries.get(id);
  if (!current) return null;
  const updated = { ...current, ...clone(patch), id: current.id };
  journal.entries.set(id, updated);
  currentTouch(journal);
  return clone(updated);
}

function currentBlindDelete(journal, id) {
  const current = journal.entries.get(id);
  if (!current) return null;
  journal.entries.delete(id);
  currentTouch(journal);
  return clone(current);
}

function currentImportReplace(journal, entries) {
  journal.entries.clear();
  for (const entry of entries) journal.entries.set(entry.id, clone(entry));
  currentTouch(journal);
}

function currentClear(journal, predicate = () => true) {
  for (const [id, entry] of [...journal.entries]) {
    if (predicate(entry)) journal.entries.delete(id);
  }
  currentTouch(journal);
}

function candidateJournal(entries = []) {
  return {
    resetGeneration: 1,
    entries: new Map(entries.map((entry) => [entry.id, {
      ...clone(entry),
      entryRevision: Number(entry.entryRevision || 1)
    }])),
    detachedReceipts: new Map()
  };
}

function captureToken(journal, id) {
  const entry = journal.entries.get(id);
  if (!entry) return null;
  return {
    entryId: id,
    resetGeneration: journal.resetGeneration,
    entryRevision: entry.entryRevision
  };
}

function tokenMatches(journal, token) {
  if (!token || journal.resetGeneration !== token.resetGeneration) return false;
  const entry = journal.entries.get(token.entryId);
  return Boolean(entry && entry.entryRevision === token.entryRevision);
}

function casPatch(journal, token, patch) {
  if (!tokenMatches(journal, token)) return { ok: false, stale: true };
  const current = journal.entries.get(token.entryId);
  const next = {
    ...current,
    ...clone(patch),
    id: current.id,
    entryRevision: current.entryRevision + 1
  };
  journal.entries.set(token.entryId, next);
  return { ok: true, stale: false, entry: clone(next), token: captureToken(journal, token.entryId) };
}

function casDelete(journal, token) {
  if (!tokenMatches(journal, token)) return { ok: false, stale: true };
  const removed = journal.entries.get(token.entryId);
  journal.entries.delete(token.entryId);
  return { ok: true, stale: false, removed: clone(removed) };
}

function candidateImportReplace(journal, entries) {
  journal.resetGeneration += 1;
  journal.entries.clear();
  for (const entry of entries) {
    journal.entries.set(entry.id, { ...clone(entry), entryRevision: 1 });
  }
}

function candidateClear(journal, predicate = () => true) {
  journal.resetGeneration += 1; // conservative global reset fence; finer scoped generations are optional.
  for (const [id, entry] of [...journal.entries]) {
    if (predicate(entry)) journal.entries.delete(id);
  }
}

function candidatePointUpdate(journal, id, patch) {
  const token = captureToken(journal, id);
  return token ? casPatch(journal, token, patch) : { ok: false, stale: true };
}

function recordDetachedReceipt(journal, receipt) {
  journal.detachedReceipts.set(receipt.operationId, clone(receipt));
}

const oldA = {
  id: 'same-id',
  url: 'https://old.example/a',
  hostname: 'old.example',
  title: 'Old A',
  readingMode: 'later',
  remotePath: '/Root/ReadmeLater/old/A.pdf',
  resourceId: 'RID-A',
  publicUrl: 'https://public.example/A',
  bookmarked: false,
  journalComments: [{ id: 'ca', text: 'old comment' }]
};
const replacementB = {
  id: 'same-id',
  url: 'https://new.example/b',
  hostname: 'new.example',
  title: 'Replacement B',
  readingMode: 'later',
  remotePath: '/Root/ReadmeLater/new/B.pdf',
  resourceId: 'RID-B',
  publicUrl: 'https://public.example/B',
  bookmarked: true,
  journalComments: [{ id: 'cb', text: 'replacement comment' }]
};

// 1. Late Delete -> Trash can delete a same-id replacement under current semantics.
{
  const j = currentJournal([oldA]);
  const oldSnapshot = clone(j.entries.get(oldA.id));
  currentImportReplace(j, [replacementB]);
  const removed = currentBlindDelete(j, oldSnapshot.id);
  eq(removed.title, 'Replacement B', 'current blind delete targets replacement B');
  check(!j.entries.has(oldA.id), 'replacement B is physically removed from current journal');
  eq(oldSnapshot.resourceId, 'RID-A', 'old operation still belongs to remote object A');
  eq(removed.resourceId, 'RID-B', 'but local delete consumed remote-object-B metadata');
}

// 2. Candidate delete CAS rejects the old operation after import generation change.
{
  const j = candidateJournal([oldA]);
  const tokenA = captureToken(j, oldA.id);
  candidateImportReplace(j, [replacementB]);
  const result = casDelete(j, tokenA);
  check(!result.ok && result.stale, 'candidate delete rejects old generation');
  eq(j.entries.get(oldA.id).title, 'Replacement B', 'replacement B survives rejected delete');
  eq(j.entries.get(oldA.id).resourceId, 'RID-B', 'replacement identity remains B');
  check(j.resetGeneration > tokenA.resetGeneration, 'import advances reset generation');
}

// 3. Late Mark Read completion can hybridize replacement B under current semantics.
{
  const j = currentJournal([oldA]);
  const oldPatch = {
    readingMode: 'read',
    remotePath: '/Root/Upload/old/A.pdf',
    resourceId: 'RID-A-MOVED',
    publicUrl: 'https://public.example/A',
    movedToReadAt: 111,
    readMovePendingAt: 0,
    readMoveTargetPath: ''
  };
  currentImportReplace(j, [replacementB]);
  const hybrid = currentBlindUpdate(j, oldA.id, oldPatch);
  eq(hybrid.title, 'Replacement B', 'current update preserves B title');
  eq(hybrid.url, replacementB.url, 'current update preserves B URL');
  eq(hybrid.readingMode, 'read', 'old A patch changes B reading mode');
  eq(hybrid.resourceId, 'RID-A-MOVED', 'old A remote identity contaminates B');
  eq(hybrid.remotePath, '/Root/Upload/old/A.pdf', 'old A path contaminates B');
}

// 4. Candidate Mark Read completion rejects old A after same-id import.
{
  const j = candidateJournal([oldA]);
  const tokenA = captureToken(j, oldA.id);
  candidateImportReplace(j, [replacementB]);
  const result = casPatch(j, tokenA, {
    readingMode: 'read', remotePath: '/Root/Upload/old/A.pdf', resourceId: 'RID-A-MOVED'
  });
  check(!result.ok && result.stale, 'candidate mark-read final patch is stale');
  eq(j.entries.get(oldA.id).readingMode, 'later', 'B reading mode is untouched');
  eq(j.entries.get(oldA.id).resourceId, 'RID-B', 'B remote identity is untouched');
  eq(j.entries.get(oldA.id).remotePath, replacementB.remotePath, 'B remote path is untouched');
}

// 5. Concurrent Mark Read late error can resurrect pending projection today.
{
  const j = currentJournal([{ ...oldA, id: 'move-race' }]);
  const opA = { id: 'move-race', target: '/Root/Upload/A.pdf' };
  const opB = { id: 'move-race', target: '/Root/Upload/A__2.pdf' };
  currentBlindUpdate(j, opA.id, { readMovePendingAt: 10, readMoveTargetPath: opA.target, readMoveOperationId: 'A' });
  currentBlindUpdate(j, opB.id, { readMovePendingAt: 11, readMoveTargetPath: opB.target, readMoveOperationId: 'B' });
  currentBlindUpdate(j, opA.id, {
    readingMode: 'read', remotePath: opA.target, resourceId: 'RID-A-MOVED',
    readMovePendingAt: 0, readMoveTargetPath: '', readMoveOperationId: '', readMoveLastError: ''
  });
  const contradictory = currentBlindUpdate(j, opB.id, {
    readMovePendingAt: 11, readMoveTargetPath: opB.target, readMoveOperationId: 'B', readMoveLastError: 'source already moved'
  });
  eq(contradictory.readingMode, 'read', 'newer successful read state remains');
  eq(contradictory.readMoveOperationId, 'B', 'late B error is retargeted onto newer row');
  check(contradictory.readMovePendingAt > 0, 'late B error resurrects pending state');
  check(Boolean(contradictory.readMoveLastError), 'contradictory row now reports a move error');
}

// 6. Candidate per-entry revision rejects late B after A advances the row.
{
  const j = candidateJournal([{ ...oldA, id: 'move-race' }]);
  const tokenA = captureToken(j, 'move-race');
  const tokenB = captureToken(j, 'move-race');
  const checkpointA = casPatch(j, tokenA, { readMovePendingAt: 10, readMoveOperationId: 'A' });
  check(checkpointA.ok, 'A checkpoint wins expected revision');
  const checkpointB = casPatch(j, tokenB, { readMovePendingAt: 11, readMoveOperationId: 'B' });
  check(!checkpointB.ok && checkpointB.stale, 'B checkpoint from same rendered revision is rejected');
  const finishA = casPatch(j, checkpointA.token, {
    readingMode: 'read', remotePath: '/Root/Upload/A.pdf', resourceId: 'RID-A-MOVED',
    readMovePendingAt: 0, readMoveOperationId: '', readMoveLastError: ''
  });
  check(finishA.ok, 'A can finalize using its advanced token');
  const lateB = casPatch(j, tokenB, { readMovePendingAt: 11, readMoveOperationId: 'B', readMoveLastError: 'late' });
  check(!lateB.ok && lateB.stale, 'late B error cannot mutate A-success generation');
  eq(j.entries.get('move-race').readingMode, 'read', 'A success remains authoritative');
  eq(j.entries.get('move-race').readMovePendingAt, 0, 'pending state stays cleared');
}

// 7. Stale whole-array comment patch silently loses a concurrent comment today.
{
  const j = currentJournal([{ ...oldA, id: 'comments', journalComments: [{ id: 'c0', text: 'base' }] }]);
  const tab1 = clone(j.entries.get('comments').journalComments);
  const tab2 = clone(j.entries.get('comments').journalComments);
  tab1.push({ id: 'c1', text: 'from tab 1' });
  tab2.push({ id: 'c2', text: 'from tab 2' });
  currentBlindUpdate(j, 'comments', { journalComments: tab1 });
  currentBlindUpdate(j, 'comments', { journalComments: tab2 });
  const ids = j.entries.get('comments').journalComments.map((c) => c.id);
  check(ids.includes('c2'), 'last stale comment array is present');
  check(!ids.includes('c1'), 'tab 1 concurrent comment is silently lost');
}

// 8. Candidate comment CAS surfaces conflict; reread/retry can preserve both.
{
  const j = candidateJournal([{ ...oldA, id: 'comments', journalComments: [{ id: 'c0', text: 'base' }] }]);
  const token1 = captureToken(j, 'comments');
  const token2 = captureToken(j, 'comments');
  const first = casPatch(j, token1, { journalComments: [{ id: 'c0', text: 'base' }, { id: 'c1', text: 'from tab 1' }] });
  check(first.ok, 'tab 1 CAS succeeds');
  const second = casPatch(j, token2, { journalComments: [{ id: 'c0', text: 'base' }, { id: 'c2', text: 'from tab 2' }] });
  check(!second.ok && second.stale, 'tab 2 stale comment array is rejected');
  const retryToken = captureToken(j, 'comments');
  const currentComments = clone(j.entries.get('comments').journalComments);
  currentComments.push({ id: 'c2', text: 'from tab 2' });
  const retry = casPatch(j, retryToken, { journalComments: currentComments });
  check(retry.ok, 'tab 2 deliberate reread/retry succeeds');
  const ids = j.entries.get('comments').journalComments.map((c) => c.id);
  check(ids.includes('c1') && ids.includes('c2'), 'retry preserves both comments');
}

// 9. Same-id replacement is necessary for replacement corruption; clear without replacement does not resurrect.
{
  const j = currentJournal([oldA]);
  currentClear(j);
  const result = currentBlindUpdate(j, oldA.id, { title: 'stale resurrection' });
  eq(result, null, 'blind update returns null when clear leaves no same-id row');
  check(!j.entries.has(oldA.id), 'clear-only schedule does not resurrect missing row');
}

// 10. Replacement under a different id is not targeted by old textual id.
{
  const j = currentJournal([oldA]);
  currentImportReplace(j, [{ ...replacementB, id: 'different-id' }]);
  const result = currentBlindDelete(j, oldA.id);
  eq(result, null, 'old id cannot delete differently keyed replacement');
  check(j.entries.has('different-id'), 'different-id replacement survives');
}

// 11. Current global db revision changes on unrelated point mutation: overbroad as reset-generation authority.
{
  const j = currentJournal([{ ...oldA, id: 'A' }, { ...replacementB, id: 'C' }]);
  const revisionBefore = j.dbRevision;
  currentBlindUpdate(j, 'C', { bookmarked: false });
  check(j.dbRevision !== revisionBefore, 'current db revision changes after unrelated C update');
  eq(j.entries.get('A').title, 'Old A', 'A itself was not changed');
}

// 12. Candidate reset generation stays stable across unrelated point update while per-entry C revision advances.
{
  const j = candidateJournal([{ ...oldA, id: 'A' }, { ...replacementB, id: 'C' }]);
  const tokenA = captureToken(j, 'A');
  const cBefore = captureToken(j, 'C');
  const genBefore = j.resetGeneration;
  const cResult = candidatePointUpdate(j, 'C', { bookmarked: false });
  check(cResult.ok, 'unrelated C point update succeeds');
  eq(j.resetGeneration, genBefore, 'point update does not bump reset generation');
  check(cResult.token.entryRevision > cBefore.entryRevision, 'C per-entry revision advances');
  check(tokenMatches(j, tokenA), 'A token remains valid after unrelated C edit');
}

// 13. Exact-current token succeeds and produces a strictly newer token.
{
  const j = candidateJournal([{ ...oldA, id: 'A' }]);
  const token = captureToken(j, 'A');
  const result = casPatch(j, token, { bookmarked: true });
  check(result.ok, 'exact-current point CAS succeeds');
  eq(j.entries.get('A').bookmarked, true, 'point patch is committed');
  eq(result.token.resetGeneration, token.resetGeneration, 'point patch stays in same reset generation');
  check(result.token.entryRevision === token.entryRevision + 1, 'point patch advances entry revision once');
}

// 14. A second use of the old token is rejected even without reset/import.
{
  const j = candidateJournal([{ ...oldA, id: 'A' }]);
  const token = captureToken(j, 'A');
  check(casPatch(j, token, { bookmarked: true }).ok, 'first mutation from token succeeds');
  const second = casPatch(j, token, { title: 'stale title' });
  check(!second.ok && second.stale, 'reusing consumed entry revision is rejected');
  eq(j.entries.get('A').title, 'Old A', 'stale second patch cannot overwrite title');
}

// 15. Scoped reset conservatively invalidates delayed tokens, even for surviving unrelated rows.
{
  const j = candidateJournal([
    { ...oldA, id: 'A', hostname: 'a.example' },
    { ...replacementB, id: 'C', hostname: 'c.example' }
  ]);
  const tokenC = captureToken(j, 'C');
  const generationBefore = j.resetGeneration;
  candidateClear(j, (entry) => entry.hostname === 'a.example');
  check(j.resetGeneration === generationBefore + 1, 'scoped clear advances global reset generation');
  check(j.entries.has('C'), 'unrelated C row survives scoped clear');
  const delayedC = casPatch(j, tokenC, { title: 'late C' });
  check(!delayedC.ok && delayedC.stale, 'conservative global reset invalidates pre-clear C token');
}

// 16. P0-072 external receipt can survive independently while P0-076 blocks stale local mutation.
{
  const j = candidateJournal([oldA]);
  const tokenA = captureToken(j, oldA.id);
  recordDetachedReceipt(j, {
    operationId: 'move-A', entryId: oldA.id, sourceGeneration: tokenA.resetGeneration,
    externalState: 'admitted-unknown', resourceId: 'RID-A'
  });
  candidateImportReplace(j, [replacementB]);
  const staleFinalize = casPatch(j, tokenA, { readingMode: 'read', resourceId: 'RID-A-MOVED' });
  check(!staleFinalize.ok && staleFinalize.stale, 'old local finalizer loses Journal authority');
  check(j.detachedReceipts.has('move-A'), 'detached external receipt survives Journal replacement');
  eq(j.detachedReceipts.get('move-A').resourceId, 'RID-A', 'receipt remains bound to old physical object A');
  eq(j.entries.get(oldA.id).resourceId, 'RID-B', 'replacement B remains bound to physical object B');
}

// 17. Import can reuse exact textual id and even identical-looking fields but must still establish new authority.
{
  const j = candidateJournal([oldA]);
  const oldToken = captureToken(j, oldA.id);
  candidateImportReplace(j, [oldA]);
  const newToken = captureToken(j, oldA.id);
  eq(newToken.entryId, oldToken.entryId, 'textual id may be identical across replacement');
  eq(newToken.entryRevision, 1, 'replacement row starts a fresh local entry revision');
  check(newToken.resetGeneration !== oldToken.resetGeneration, 'replacement authority differs by reset generation');
  check(!tokenMatches(j, oldToken), 'old token cannot alias identical-looking replacement');
}

// 18. Blind stale bookmark patch demonstrates generic point-mutation retargeting.
{
  const j = currentJournal([{ ...oldA, id: 'bookmark', bookmarked: false }]);
  const stalePatch = { bookmarked: true };
  currentBlindUpdate(j, 'bookmark', { bookmarked: false, title: 'newer title' });
  const after = currentBlindUpdate(j, 'bookmark', stalePatch);
  eq(after.title, 'newer title', 'fresh-read/spread keeps newer unrelated fields');
  eq(after.bookmarked, true, 'but stale field authority is silently retargeted');
}

// 19. Candidate stale bookmark token is rejected after any newer mutation of that entry.
{
  const j = candidateJournal([{ ...oldA, id: 'bookmark', bookmarked: false }]);
  const staleToken = captureToken(j, 'bookmark');
  const newer = candidatePointUpdate(j, 'bookmark', { title: 'newer title' });
  check(newer.ok, 'newer same-entry mutation succeeds');
  const after = casPatch(j, staleToken, { bookmarked: true });
  check(!after.ok && after.stale, 'older bookmark token is stale');
  eq(j.entries.get('bookmark').bookmarked, false, 'stale bookmark field is not applied');
}

console.log(`PASS ${checks} checks`);
