'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');

let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }
function eq(actual, expected, message) { assert.equal(actual, expected, message); checks += 1; }

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

ok(worker.includes("const JOURNAL_DB_VERSION = 8;"), 'Trash tranche reuses reviewed Journal DB v8');
ok(worker.includes("const JOURNAL_PENDING_DESTRUCTIVE_STORE = 'pendingDestructiveMoves';"), 'Trash reuses detached destructive store');

const creator = functionSource(worker, 'checkpointPendingTrashMoveIntent');
ok(creator.includes("makePendingDestructiveMoveId('trash-move')"), 'Trash receipt has worker-issued destructive identity');
ok(creator.includes("kind: 'trash-move'"), 'Trash effect class is explicit');
ok(creator.includes("phase: 'prepared'"), 'Trash receipt starts pre-admission');
ok(creator.includes('sourceJournalEntryId'), 'Trash receipt captures source Journal id');
ok(creator.includes('sourceJournalCreatedAt'), 'Trash receipt captures source Journal generation discriminator');
ok(creator.includes('sourceUrlKey'), 'Trash receipt captures URL reset scope');
ok(creator.includes('sourceSiteKey'), 'Trash receipt captures site reset scope');
ok(creator.includes('sourcePath'), 'Trash receipt captures source remote path');
ok(creator.includes('targetPath'), 'Trash receipt captures intended target');
ok(creator.includes('sourceResourceId'), 'Trash receipt captures known remote object evidence');
ok(creator.includes('sourcePublicUrl'), 'Trash receipt captures secondary remote identity evidence');
ok(creator.includes('accountUid'), 'Trash receipt carries account binding evidence');
ok(creator.includes('rootPath'), 'Trash receipt carries root binding evidence');
ok(creator.includes('pending.add(item)'), 'Trash receipt creation is create-once');
ok(creator.includes('MAX_PENDING_DESTRUCTIVE_MOVES'), 'Trash receipt admission is bounded');

const admission = functionSource(worker, 'markPendingDestructiveMoveAdmitted');
ok(admission.includes("current.kind !== 'read-move' && current.kind !== 'trash-move'"), 'common admission only recognizes reviewed destructive classes');
ok(admission.includes("phase: 'admitted-unknown'"), 'Trash move has explicit admitted unknown phase');
ok(admission.includes('WEBCLIP_DESTRUCTIVE_MOVE_RECEIPT_MISSING_BEFORE_ADMISSION'), 'reset-deleted prepared receipt fails closed');
ok(admission.includes('WEBCLIP_DESTRUCTIVE_MOVE_RECEIPT_SUPERSEDED_BEFORE_ADMISSION'), 'reset-superseded receipt cannot start remote move');
ok(!admission.includes('operationId ==='), 'caller operationId is not admission capability');

const finalize = functionSource(worker, 'finalizeTrashDeleteFromReceipt');
ok(finalize.includes('beginJournalStatsMutation(\'delete\')'), 'Trash terminal delete preserves Journal stats dirty-marker protocol');
ok(finalize.includes('[JOURNAL_PENDING_DESTRUCTIVE_STORE, JOURNAL_STORE, JOURNAL_META_STORE]'), 'Journal delete and receipt consumption share one transaction');
ok(finalize.includes("receipt.kind !== 'trash-move' || receipt.phase !== 'remote-verified'"), 'local deletion requires terminal verified Trash receipt');
ok(finalize.includes('receipt.supersededByJournalReset === true'), 'reset-superseded Trash receipt cannot delete replacement Journal entry');
ok(finalize.includes('pendingDestructiveMoveEntryMatches(receipt, current)'), 'terminal delete revalidates source Journal identity');
ok(finalize.includes('entries.delete(current.id)'), 'authorized original entry is deleted only inside receipt transaction');
ok(finalize.includes('receipts.delete(key)'), 'terminal receipt is consumed atomically');
ok(finalize.includes("touchJournalDbRevision(tx, 'trash-move-finalize')"), 'authorized Trash delete advances Journal revision');
ok(finalize.includes('rebuildUrlStatsForUrl(deletedEntry.urlKey)'), 'successful Trash delete repairs URL stats');
ok(finalize.includes('completeJournalStatsMutation(statsToken)'), 'stats mutation token is settled on terminal path');

const move = functionSource(worker, 'moveJournalYandexFileToTrash');
const prepareIndex = move.indexOf('checkpointPendingTrashMoveIntent(entry');
const admitIndex = move.indexOf('markPendingDestructiveMoveAdmitted(detachedReceiptId)');
const postIndex = move.indexOf("yandexApi('/resources/move'");
const verifyIndex = move.indexOf('markPendingDestructiveMoveVerified(detachedReceiptId');
ok(prepareIndex >= 0, 'Trash move creates detached receipt after source/target selection');
ok(admitIndex > prepareIndex, 'remote admission follows prepared receipt');
ok(postIndex > admitIndex, 'admitted-unknown commits before POST /resources/move');
ok(verifyIndex > postIndex, 'terminal receipt follows remote move and target verification');
ok(move.includes('detachedReceiptId'), 'verified result returns detached receipt identity to caller');
ok(move.includes('markPendingDestructiveMoveFailure(detachedReceiptId, error)'), 'admitted unknown/error preserves durable reconciliation receipt');
ok(move.includes('removePendingDestructiveMove(detachedReceiptId)'), 'pre-admission failure removes disposable receipt');
ok(move.includes('if (moveAdmitted)'), 'error cleanup distinguishes admitted from pre-admission');
ok(!move.includes('deleteJournalEntryRecordOnly'), 'remote helper never performs an unguarded local Journal delete');

const del = functionSource(worker, 'deleteJournalEntry');
const moveCall = del.indexOf('moved = await moveJournalYandexFileToTrash(entry, operationId)');
const finalizeCall = del.indexOf('finalizeTrashDeleteFromReceipt(moved.detachedReceiptId)');
ok(moveCall >= 0 && finalizeCall > moveCall, 'Yandex Trash verification precedes guarded local deletion');
ok(del.includes("if (isYandex && action === 'trash')"), 'only Yandex Trash enters detached destructive finalization');
ok(del.includes('journalSuperseded = Boolean(finalized?.cancelled)'), 'reset/replacement cancellation is surfaced');
ok(del.includes('if (!journalSuperseded) notifyJournalChanged(\'delete\')'), 'old operation does not announce deletion of replacement Journal state');
ok(del.includes('deleteJournalEntryRecordOnlyCas(deleteAuthority)'), 'keep/local-only delete remains local while composing P0-076 CAS authority');
ok(!del.includes('moveJournalYandexFileToTrash(entry, operationId, deleteAuthority)'), 'P0-076 local delete token is not reused as Trash external-effect authority');
ok(del.includes('journalSuperseded,'), 'caller receives no-resurrection outcome');
ok(del.includes('statsWarning'), 'caller receives deferred stats repair warning if needed');

const dispositionSource = functionSource(worker, 'pendingDestructiveMoveResetDisposition');
const scopeSource = functionSource(worker, 'pendingDestructiveMoveMatchesJournalResetScope');
const markSource = functionSource(worker, 'markPendingDestructiveMoveSupersededByJournalReset');
const matchSource = functionSource(worker, 'pendingDestructiveMoveEntryMatches');

const context = vm.createContext({ String, Number, Boolean, Math, Object, Date });
vm.runInContext(
  dispositionSource + '\n' + scopeSource + '\n' + markSource + '\n' + matchSource + '\n' +
  'this.api={pendingDestructiveMoveResetDisposition,pendingDestructiveMoveMatchesJournalResetScope,markPendingDestructiveMoveSupersededByJournalReset,pendingDestructiveMoveEntryMatches};',
  context
);
const api = context.api;

const base = {
  id: 'destructive:trash-move:worker-issued',
  kind: 'trash-move',
  phase: 'prepared',
  sourceJournalEntryId: 'entry-A',
  sourceJournalCreatedAt: 100,
  sourceUrlKey: 'https://a.test/page',
  sourceSiteKey: 'a.test',
  sourceResourceId: 'rid-A',
  sourcePath: '/WebClip/Upload/a.pdf',
  targetPath: '/WebClip/Trash/09-2026/a.pdf',
  operationId: 'caller-correlation'
};
eq(api.pendingDestructiveMoveResetDisposition(base), 'drop', 'prepared Trash move is reset-cancellable');
eq(api.pendingDestructiveMoveResetDisposition({ ...base, phase: 'admitted-unknown' }), 'preserve', 'admitted Trash move survives reset');
eq(api.pendingDestructiveMoveResetDisposition({ ...base, phase: 'manual-resolution' }), 'preserve', 'manual-resolution Trash receipt survives reset');
eq(api.pendingDestructiveMoveResetDisposition({ ...base, phase: 'remote-verified' }), 'drop', 'verified Trash receipt may be retired by reset');

eq(api.pendingDestructiveMoveMatchesJournalResetScope(base, {}), true, 'all reset matches Trash receipt');
eq(api.pendingDestructiveMoveMatchesJournalResetScope(base, { urlKey: 'https://a.test/page' }), true, 'matching URL reset selects Trash receipt');
eq(api.pendingDestructiveMoveMatchesJournalResetScope(base, { urlKey: 'https://b.test/page' }), false, 'unrelated URL reset leaves Trash receipt alone');
eq(api.pendingDestructiveMoveMatchesJournalResetScope(base, { siteKey: 'a.test' }), true, 'matching site reset selects Trash receipt');
eq(api.pendingDestructiveMoveMatchesJournalResetScope(base, { siteKey: 'b.test' }), false, 'unrelated site reset leaves Trash receipt alone');

const superseded = api.markPendingDestructiveMoveSupersededByJournalReset(
  { ...base, phase: 'admitted-unknown' },
  { scope: 'import-replace', resetAt: 9000 }
);
eq(superseded.supersededByJournalReset, true, 'admitted Trash receipt records reset quarantine');
eq(superseded.journalResetAt, 9000, 'Trash receipt captures reset timestamp');
eq(superseded.journalResetScope, 'import-replace', 'Trash receipt captures reset scope');
eq(superseded.phase, 'admitted-unknown', 'reset does not fabricate external terminal state');
eq(superseded.operationId, 'caller-correlation', 'caller operationId remains metadata');

eq(api.pendingDestructiveMoveEntryMatches(base, {
  id: 'entry-A', createdAt: 100, destination: 'yandex', resourceId: 'rid-A'
}), true, 'original Journal source matches');
eq(api.pendingDestructiveMoveEntryMatches(base, {
  id: 'entry-A', createdAt: 101, destination: 'yandex', resourceId: 'rid-A'
}), false, 'same-id replacement with different createdAt is rejected');
eq(api.pendingDestructiveMoveEntryMatches(base, {
  id: 'entry-A', createdAt: 100, destination: 'yandex', resourceId: 'rid-B'
}), false, 'conflicting known resource identity is rejected');

const read = functionSource(worker, 'moveReadLaterEntryToRead');
ok(read.includes('checkpointPendingReadMoveIntent(entry'), 'ReadLater receipt path remains present');
ok(read.includes('finalizeReadMoveJournalFromReceipt(detachedReceiptId'), 'ReadLater terminal finalize remains detached');
ok(!read.includes('checkpointPendingTrashMoveIntent'), 'Trash tranche does not merge effect classes at call sites');

console.log(
  'P0-072 Trash reset receipt: PASS; checks=' + checks +
  '; db=v8; detached_receipt=true; prepared_drop=true; admitted_survives=true;' +
  ' terminal_delete_atomic=true; same_id_replacement_safe=true; keep_path_unchanged=true;' +
  ' p1_090_exact_object=false; p0_076_full_cas=false; release_closed=false'
);
