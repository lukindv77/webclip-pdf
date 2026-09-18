'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const journal = fs.readFileSync(path.join(ROOT, 'journal.js'), 'utf8');

let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }
function eq(actual, expected, message) { assert.equal(actual, expected, message); checks += 1; }

function section(source, start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error('section not found: ' + start + ' -> ' + end);
  return source.slice(a, b);
}

function functionSource(source, name) {
  const re = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(');
  const match = re.exec(source);
  if (!match) throw new Error('function not found: ' + name);
  const start = match.index;
  const paramsStart = source.indexOf('(', start);
  let parens = 0;
  let paramsEnd = -1;
  for (let i = paramsStart; i < source.length; i += 1) {
    if (source[i] === '(') parens += 1;
    else if (source[i] === ')') {
      parens -= 1;
      if (parens === 0) { paramsEnd = i; break; }
    }
  }
  if (paramsEnd < 0) throw new Error('parameter boundary not found: ' + name);
  const bodyStart = source.indexOf('{', paramsEnd);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = bodyStart; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      if (end < 0) break;
      i = end + 1;
      continue;
    }
    if (ch === '/' && next === '/') {
      const end = source.indexOf('\n', i + 2);
      if (end < 0) return source.slice(start);
      i = end;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error('function boundary not found: ' + name);
}

ok(worker.includes("const JOURNAL_DB_VERSION = 8;"), 'service worker Journal DB advances for detached destructive receipts');
ok(journal.includes("const JOURNAL_DB_VERSION = 8;"), 'Journal page opener stays on the same DB v8');
ok(journal.includes("db.createObjectStore('pendingDestructiveMoves'"), 'Journal page upgrade path creates detached destructive store');
ok(worker.includes("const JOURNAL_PENDING_DESTRUCTIVE_STORE = 'pendingDestructiveMoves';"), 'detached destructive store has explicit name');
ok(worker.includes('const MAX_PENDING_DESTRUCTIVE_MOVES = 100;'), 'detached receipt queue is bounded');

const dbSection = section(worker, 'function openJournalDb', 'function touchJournalDbRevision');
ok(dbSection.includes('db.createObjectStore(JOURNAL_PENDING_DESTRUCTIVE_STORE'), 'DB migration creates destructive receipt store');
ok(dbSection.includes("destructiveStore.createIndex('updatedAt', 'updatedAt'"), 'destructive receipt store has maintenance ordering index');
ok(dbSection.includes("destructiveStore.createIndex('sourceJournalEntryId', 'sourceJournalEntryId'"), 'destructive store can inspect source Journal identity');

const dispositionSource = functionSource(worker, 'pendingDestructiveMoveResetDisposition');
const scopeSource = functionSource(worker, 'pendingDestructiveMoveMatchesJournalResetScope');
const markSource = functionSource(worker, 'markPendingDestructiveMoveSupersededByJournalReset');
const matchSource = functionSource(worker, 'pendingDestructiveMoveEntryMatches');
const idSource = functionSource(worker, 'makePendingDestructiveMoveId');

const context = vm.createContext({ String, Number, Boolean, Math, Object, Date });
vm.runInContext(
  dispositionSource + '\n' + scopeSource + '\n' + markSource + '\n' + matchSource + '\n' + idSource + '\n' +
  "this.api={pendingDestructiveMoveResetDisposition,pendingDestructiveMoveMatchesJournalResetScope,markPendingDestructiveMoveSupersededByJournalReset,pendingDestructiveMoveEntryMatches};",
  context
);
const api = context.api;

const base = {
  id: 'destructive:read-move:worker-issued',
  kind: 'read-move',
  phase: 'prepared',
  sourceJournalEntryId: 'entry-A',
  sourceJournalCreatedAt: 100,
  sourceUrlKey: 'https://a.test/page',
  sourceSiteKey: 'a.test',
  sourceResourceId: 'rid-A',
  sourcePath: '/WebClip/ReadmeLater/a.pdf',
  targetPath: '/WebClip/Upload/a.pdf',
  operationId: 'caller-correlation'
};
eq(api.pendingDestructiveMoveResetDisposition(base), 'drop', 'prepared destructive work is reset-cancellable');
eq(api.pendingDestructiveMoveResetDisposition({ ...base, phase: 'admitted-unknown' }), 'preserve', 'admitted destructive effect survives reset');
eq(api.pendingDestructiveMoveResetDisposition({ ...base, phase: 'manual-resolution' }), 'preserve', 'manual-resolution destructive receipt survives reset');
eq(api.pendingDestructiveMoveResetDisposition({ ...base, phase: 'remote-verified' }), 'drop', 'terminal verified receipt may be retired by reset');
eq(api.pendingDestructiveMoveMatchesJournalResetScope(base, {}), true, 'all reset matches destructive receipt');
eq(api.pendingDestructiveMoveMatchesJournalResetScope(base, { urlKey: 'https://a.test/page' }), true, 'matching URL reset selects destructive receipt');
eq(api.pendingDestructiveMoveMatchesJournalResetScope(base, { urlKey: 'https://b.test/page' }), false, 'unrelated URL does not supersede destructive receipt');
eq(api.pendingDestructiveMoveMatchesJournalResetScope(base, { siteKey: 'a.test' }), true, 'matching site reset selects destructive receipt');
eq(api.pendingDestructiveMoveMatchesJournalResetScope(base, { siteKey: 'b.test' }), false, 'unrelated site does not supersede destructive receipt');

const marked = api.markPendingDestructiveMoveSupersededByJournalReset(
  { ...base, phase: 'admitted-unknown' },
  { scope: 'import-replace', resetAt: 9000 }
);
eq(marked.supersededByJournalReset, true, 'destructive receipt is quarantined by reset');
eq(marked.journalResetAt, 9000, 'destructive receipt captures reset timestamp');
eq(marked.journalResetScope, 'import-replace', 'destructive receipt captures reset scope');
eq(marked.phase, 'admitted-unknown', 'reset does not fabricate destructive settlement');
eq(marked.operationId, 'caller-correlation', 'caller operationId remains metadata only');

eq(api.pendingDestructiveMoveEntryMatches(base, {
  id: 'entry-A', createdAt: 100, destination: 'yandex', resourceId: 'rid-A'
}), true, 'matching original Journal identity is accepted');
eq(api.pendingDestructiveMoveEntryMatches(base, {
  id: 'entry-A', createdAt: 101, destination: 'yandex', resourceId: 'rid-A'
}), false, 'same textual id from another Journal generation is rejected by createdAt receipt');
eq(api.pendingDestructiveMoveEntryMatches(base, {
  id: 'entry-A', createdAt: 100, destination: 'yandex', resourceId: 'rid-B'
}), false, 'conflicting known remote resource identity is rejected');
eq(api.pendingDestructiveMoveEntryMatches(base, {
  id: 'entry-B', createdAt: 100, destination: 'yandex', resourceId: 'rid-A'
}), false, 'different Journal id is rejected');

ok(idSource.includes('crypto.randomUUID'), 'destructive receipt gets worker-issued random identity');
ok(!idSource.includes('operationId'), 'caller textual operationId is not destructive receipt identity');

const checkpointSource = functionSource(worker, 'checkpointPendingReadMoveIntent');
ok(checkpointSource.includes("kind: 'read-move'"), 'detached receipt names exact effect class');
ok(checkpointSource.includes("phase: 'prepared'"), 'receipt is created before remote admission');
ok(checkpointSource.includes('sourceJournalCreatedAt'), 'receipt retains legacy Journal discriminator');
ok(checkpointSource.includes('sourceJournalResetGeneration'), 'new receipt captures P0-076 reset generation');
ok(checkpointSource.includes('sourceJournalEntryRevision'), 'new receipt captures P0-076 entry revision');
ok(checkpointSource.includes('journalAuthority = null'), 'P0-076 local cursor is an explicit input separate from receipt identity');
ok(checkpointSource.includes('sourceResourceId'), 'receipt captures known remote identity evidence');
ok(checkpointSource.includes('sourcePublicUrl'), 'receipt captures secondary remote identity evidence');
ok(checkpointSource.includes('pending.add(item)'), 'new receipt is create-once');
ok(checkpointSource.includes('MAX_PENDING_DESTRUCTIVE_MOVES'), 'receipt admission is bounded');

const admissionSource = functionSource(worker, 'markPendingDestructiveMoveAdmitted');
ok(admissionSource.includes("phase: 'admitted-unknown'"), 'destructive receipt has explicit external admission phase');
ok(admissionSource.includes('WEBCLIP_DESTRUCTIVE_MOVE_RECEIPT_MISSING_BEFORE_ADMISSION'), 'reset-deleted prepared receipt fails closed');
ok(admissionSource.includes('WEBCLIP_DESTRUCTIVE_MOVE_RECEIPT_SUPERSEDED_BEFORE_ADMISSION'), 'superseded receipt cannot admit a new destructive move');
ok(!admissionSource.includes('operationId ==='), 'destructive admission does not trust caller correlation equality');
ok(admissionSource.includes('pendingDestructiveMoveJournalAuthorityMatches(current, resetGeneration, journalEntry)'), 'pre-POST admission additionally rechecks local P0-076 authority');

const guardedCheckpointSource = functionSource(worker, 'updateReadMoveJournalCheckpointFromReceipt');
ok(guardedCheckpointSource.includes('[JOURNAL_PENDING_DESTRUCTIVE_STORE, JOURNAL_STORE, JOURNAL_META_STORE]'), 'pre-move Journal checkpoint and detached authority share one transaction');
ok(guardedCheckpointSource.includes('receipt.supersededByJournalReset === true'), 'pre-move Journal mutation rejects reset-superseded receipt');
ok(guardedCheckpointSource.includes('pendingDestructiveMoveJournalAuthorityMatches(receipt, resetGeneration, current)'), 'pre-move Journal mutation revalidates P0-072 source identity plus P0-076 cursor');
ok(guardedCheckpointSource.includes('pendingDestructiveMoveAdvanceJournalAuthority(receipt, resetGeneration, updated)'), 'own checkpoint advances the receipt cursor with the committed row revision');

const verifiedSource = functionSource(worker, 'markPendingDestructiveMoveVerified');
ok(verifiedSource.includes("phase: 'remote-verified'"), 'terminal remote outcome is explicit');
ok(verifiedSource.includes('verifiedResourceId'), 'terminal receipt records observed target resource identity');
ok(verifiedSource.includes('WEBCLIP_DESTRUCTIVE_MOVE_RECEIPT_MISSING_AT_VERIFY'), 'missing admitted receipt cannot be silently treated as verified');

const finalizeSource = functionSource(worker, 'finalizeReadMoveJournalFromReceipt');
ok(finalizeSource.includes('[JOURNAL_PENDING_DESTRUCTIVE_STORE, JOURNAL_STORE, JOURNAL_META_STORE]'), 'terminal Journal finalize is atomic with receipt consumption');
ok(finalizeSource.includes("receipt.phase !== 'remote-verified'"), 'Journal finalize requires actual terminal remote verification');
ok(finalizeSource.includes('receipt.supersededByJournalReset === true'), 'reset-superseded old receipt cannot mutate replacement Journal');
ok(finalizeSource.includes('receipts.delete(key)'), 'terminal receipt is retired in the same finalize transaction');
ok(finalizeSource.includes('pendingDestructiveMoveJournalAuthorityMatches(receipt, resetGeneration, current)'), 'terminal finalize revalidates P0-072 source identity plus exact P0-076 cursor');

const clearSection = section(worker, 'async function clearJournalEntries', 'async function journalRevisionSnapshot');
ok(clearSection.includes('JOURNAL_PENDING_DESTRUCTIVE_STORE'), 'Journal clear transaction includes detached destructive store');
ok(clearSection.includes('reconcilePendingDestructiveMoveStoreForJournalReset(destructiveStore'), 'clear reconciles destructive receipts instead of dropping admitted effects');
ok(clearSection.includes('urlKey,\n          siteKey,\n          scope'), 'scoped clear forwards exact scope to destructive reset fence');

const importSection = section(worker, 'async function commitStagedJournalImport', 'async function previewStagedJournalImport');
ok(importSection.includes('JOURNAL_PENDING_DESTRUCTIVE_STORE'), 'import transaction includes detached destructive store');
ok(importSection.includes('reconcilePendingDestructiveMoveStoreForJournalReset(tx.objectStore(JOURNAL_PENDING_DESTRUCTIVE_STORE)'), 'import replace quarantines admitted destructive receipts');

const moveSection = functionSource(worker, 'moveReadLaterEntryToRead');
const prepareIndex = moveSection.indexOf('checkpointPendingReadMoveIntent(entry');
const localCheckpointIndex = moveSection.indexOf('updateReadMoveJournalCheckpointFromReceipt(detachedReceiptId');
const admitIndex = moveSection.indexOf('markPendingDestructiveMoveAdmitted(detachedReceiptId)');
const moveIndex = moveSection.indexOf("yandexApi('/resources/move'");
const verifyIndex = moveSection.indexOf('markPendingDestructiveMoveVerified(detachedReceiptId');
const finalizeIndex = moveSection.indexOf('finalizeReadMoveJournalFromReceipt(detachedReceiptId');
ok(prepareIndex >= 0 && prepareIndex < localCheckpointIndex, 'detached prepared authority exists before legacy Journal checkpoint');
ok(localCheckpointIndex < admitIndex, 'Journal checkpoint is guarded before remote admission');
ok(admitIndex < moveIndex, 'admitted-unknown commits before destructive Yandex request');
ok(moveIndex < verifyIndex, 'remote move occurs before terminal verification receipt');
ok(verifyIndex < finalizeIndex, 'remote terminal truth commits before Journal finalize');
ok(!moveSection.includes('await updateJournalEntryRecord(id,'), 'read-move path no longer blind-writes replaceable Journal entry');
ok(moveSection.includes('journalSuperseded: true'), 'verified move can complete without resurrecting reset Journal presentation');
ok(moveSection.includes('markPendingDestructiveMoveFailure(detachedReceiptId, error)'), 'unknown admitted failure preserves detached reconciliation receipt');
ok(moveSection.includes('removePendingDestructiveMove(detachedReceiptId)'), 'pre-admission failure retires disposable receipt');

const trashSection = functionSource(worker, 'deleteJournalEntry');
ok(trashSection.includes('moveJournalYandexFileToTrash(entry, operationId, deleteAuthority)'), 'Delete-to-Trash remains a separate P0-072 class while receiving only a local P0-076 cursor');
ok(!trashSection.includes('checkpointPendingReadMoveIntent'), 'Trash never borrows the ReadLater receipt creator');
ok(trashSection.includes('finalizeTrashDeleteFromReceipt(moved.detachedReceiptId)'), 'later Trash tranche composes the shared detached store through its own terminal finalizer');

console.log(
  'P0-072 read-move reset receipt: PASS; checks=' + checks +
  '; db=v8; detached_receipt=true; prepared_drop=true; admitted_survives=true;' +
  ' journal_finalize_atomic=true; same_id_replacement_safe=true;' +
  ' p1_090_exact_object=false; p0_076_receipt_cursor=true; p0_076_full_cas=true; trash_move_composed=true; release_closed=false'
);
