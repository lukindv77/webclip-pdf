'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const registry = fs.readFileSync(path.join(ROOT, 'project_docs/RESEARCH_REGISTRY.md'), 'utf8');
const readiness = fs.readFileSync(path.join(ROOT, 'project_docs/RELEASE_READINESS.md'), 'utf8');
const status = fs.readFileSync(path.join(ROOT, 'project_docs/TEST_STATUS.md'), 'utf8');
const evidencePath = path.join(ROOT, 'project_docs/RESEARCH_P0_076_SINGLE_ENTRY_GENERATION_CAS_CLOSURE_2026-09-18_EVIDENCE.md');

let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }
function eq(actual, expected, message) { assert.strictEqual(actual, expected, message); checks += 1; }

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

function occurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

// 1) Atomic authority capture + exact CAS commit.
const readAuthority = functionSource(worker, 'readJournalEntryWithAuthority');
ok(readAuthority.includes('[JOURNAL_STORE, JOURNAL_META_STORE]'), 'authority capture reads row + reset generation in one transaction');
ok(readAuthority.includes("tx.objectStore(JOURNAL_STORE).get(entryId)"), 'authority capture reads exact row');
ok(readAuthority.includes("tx.objectStore(JOURNAL_META_STORE).get(JOURNAL_RESET_GENERATION_KEY)"), 'authority capture reads dedicated reset generation');

for (const name of ['updateJournalEntryRecordCas', 'deleteJournalEntryRecordOnlyCas']) {
  const source = functionSource(worker, name);
  ok(source.includes('[JOURNAL_STORE, JOURNAL_META_STORE]'), name + ' compares and mutates in one readwrite transaction');
  ok(source.includes('journalEntryAuthorityMatches(resetGeneration, current, token)'), name + ' checks reset generation + entry revision');
}
const casUpdate = functionSource(worker, 'updateJournalEntryRecordCas');
ok(casUpdate.includes('entryRevision: nextJournalEntryRevision(current.entryRevision)'), 'CAS patch advances exact row revision');

// 2) Reset/import establish fresh authority atomically.
const clear = functionSource(worker, 'clearJournalEntries');
ok(clear.includes('advanceJournalResetGeneration(tx, `clear-${scope}`, fail)'), 'scoped/full clear advances reset generation inside clear transaction');
ok(clear.includes('JOURNAL_PENDING_DESTRUCTIVE_STORE'), 'clear composes destructive recovery store in same authority transition');
const importCommit = functionSource(worker, 'commitStagedJournalImport');
ok(importCommit.includes("advanceJournalResetGeneration(tx, 'import-replace', abort)"), 'import-replace advances reset generation inside replacement transaction');
ok(importCommit.includes('journalStore.put({ ...entry, entryRevision: JOURNAL_INITIAL_ENTRY_REVISION })'), 'import replacement starts fresh entry revision');
const importNormalize = functionSource(worker, 'normalizeImportedJournalEntry');
ok(importNormalize.includes('entryRevision: JOURNAL_INITIAL_ENTRY_REVISION'), 'import normalization assigns local revision');
ok(!importNormalize.includes('raw.entryRevision'), 'serialized revision is never trusted');
eq(occurrences(worker, 'advanceJournalResetGeneration(tx,'), 2, 'only clear and import-replace advance dedicated reset generation');

// 3) Comment lost-update paths use CAS once, with no silent rebind.
for (const name of ['addJournalComment', 'editJournalComment', 'deleteJournalComment']) {
  const source = functionSource(worker, name);
  ok(source.includes('readJournalEntryWithAuthority(id)'), name + ' captures exact authority');
  ok(source.includes('updateJournalEntryRecordCas(authority,'), name + ' commits through CAS');
  ok(source.includes('journalCommentConflictResult()'), name + ' surfaces stale conflict');
}

// 4) Local/keep delete is exact-token CAS.
const del = functionSource(worker, 'deleteJournalEntry');
ok(del.includes('const authoritySnapshot = await readJournalEntryWithAuthority(id)'), 'delete admits row + token atomically');
ok(del.includes('deleteJournalEntryRecordOnlyCas(deleteAuthority)'), 'local/keep delete uses CAS');
ok(del.includes('moveJournalYandexFileToTrash(entry, operationId, deleteAuthority)'), 'Trash carries same local token only as Journal cursor');

// 5) Mark Read race is fenced before remote admission and through terminal finalize.
const markRead = functionSource(worker, 'moveReadLaterEntryToRead');
const prepareIndex = markRead.indexOf('checkpointPendingReadMoveIntent(entry');
const checkpointIndex = markRead.indexOf('updateReadMoveJournalCheckpointFromReceipt(detachedReceiptId');
const staleIndex = markRead.indexOf('if (!checkpoint)');
const admitIndex = markRead.indexOf('markPendingDestructiveMoveAdmitted(detachedReceiptId)');
const remoteIndex = markRead.indexOf("yandexApi('/resources/move'");
ok(markRead.includes('const authoritySnapshot = await readJournalEntryWithAuthority(id)'), 'Mark Read captures exact local token');
ok(prepareIndex >= 0 && checkpointIndex > prepareIndex, 'detached receipt exists before local checkpoint');
ok(staleIndex > checkpointIndex && admitIndex > staleIndex, 'stale checkpoint fails before remote admission');
ok(remoteIndex > admitIndex, 'remote move occurs only after checked admission');

const destructiveCheckpoint = functionSource(worker, 'updateReadMoveJournalCheckpointFromReceipt');
ok(destructiveCheckpoint.includes('pendingDestructiveMoveJournalAuthorityMatches(receipt, resetGeneration, current)'), 'ReadLater checkpoint checks exact cursor');
ok(destructiveCheckpoint.includes('pendingDestructiveMoveAdvanceJournalAuthority(receipt, resetGeneration, updated)'), 'successful checkpoint atomically advances receipt cursor');

for (const name of ['finalizeReadMoveJournalFromReceipt', 'finalizeTrashDeleteFromReceipt']) {
  const source = functionSource(worker, name);
  ok(source.includes('pendingDestructiveMoveJournalAuthorityMatches(receipt, resetGeneration, current)'), name + ' refuses stale same-id replacement');
  ok(source.includes('sourceAuthorityLost: true'), name + ' returns non-retargeting cancellation');
}

// 6) New destructive receipts persist authority across restart; legacy ones fail closed.
for (const name of ['checkpointPendingReadMoveIntent', 'checkpointPendingTrashMoveIntent']) {
  const source = functionSource(worker, name);
  ok(source.includes('sourceJournalResetGeneration:'), name + ' persists reset generation');
  ok(source.includes('sourceJournalEntryRevision:'), name + ' persists row revision');
  ok(source.includes('pendingDestructiveMoveJournalAuthorityMatches(item, resetGeneration, current)'), name + ' validates captured authority in receipt creation transaction');
}
const authorityMatch = functionSource(worker, 'pendingDestructiveMoveJournalAuthorityMatches');
ok(authorityMatch.includes('Boolean(token && journalEntryAuthorityMatches'), 'legacy no-cursor receipt cannot mutate local Journal');
const disposition = functionSource(worker, 'pendingDestructiveMoveRecoveryDisposition');
ok(disposition.includes("manualResolutionRequired === true) return 'retain-manual'"), 'manual verified legacy state is sticky');
const reconcile = functionSource(worker, 'reconcilePendingDestructiveMoves');
ok(reconcile.includes('!pendingDestructiveMoveJournalAuthorityToken(item)'), 'restart detects no-cursor verified legacy receipt');
ok(reconcile.includes('markPendingDestructiveMoveManualResolution(id, reason, trigger)'), 'legacy remote evidence is retained for manual resolution');

// 7) Blind compatibility helpers are not production call paths.
eq(occurrences(worker, 'updateJournalEntryRecord('), 1, 'blind generic update exists only as its definition');
eq(occurrences(worker, 'deleteJournalEntryRecordOnly('), 1, 'blind generic delete exists only as its definition');

// 8) Delayed append/recovery cannot overwrite a same-id replacement.
const append = functionSource(worker, 'appendJournalEntry');
const getIndex = append.indexOf('const get = store.get(id)');
const existingIndex = append.indexOf('if (get.result)');
const putIndex = append.indexOf('store.put(entry)');
ok(getIndex >= 0 && existingIndex > getIndex && putIndex > existingIndex, 'append checks exact id before insert');
ok(append.includes('storedEntry = get.result;\n                return;'), 'existing same-id row is returned without overwrite');
const recoverAppend = functionSource(worker, 'recoverPendingJournalAppends');
ok(recoverAppend.includes('appendJournalEntry(item.data, { requirePendingCheckpoint: true })'), 'restart append requires same pending checkpoint');
const durableAppend = functionSource(worker, 'appendJournalEntryFromDurableCheckpoint');
ok(durableAppend.includes('requiredDurableCheckpoint: { storeName, key }'), 'remote/local durable finalization rechecks durable checkpoint');
const safeAppendRefs = occurrences(worker, 'safeAppendJournalEntry(');
eq(safeAppendRefs, 1, 'unguarded convenience append helper has no production caller');

// 9) Reset transition also fences pending append/external checkpoints.
ok(clear.includes('pendingStore.clear()'), 'full clear removes pending journal append recovery');
ok(clear.includes('prunePending(pendingStore'), 'scoped clear removes matching pending journal append recovery');
ok(clear.includes('reconcilePendingRemoteStoreForJournalReset'), 'clear reconciles remote-save checkpoints');
ok(clear.includes('reconcilePendingLocalDownloadStoreForJournalReset'), 'clear reconciles local-download checkpoints');
ok(importCommit.includes('tx.objectStore(JOURNAL_PENDING_STORE).clear()'), 'import-replace clears pending journal append recovery');
ok(importCommit.includes('reconcilePendingRemoteStoreForJournalReset'), 'import-replace reconciles remote checkpoints');
ok(importCommit.includes('reconcilePendingLocalDownloadStoreForJournalReset'), 'import-replace reconciles local checkpoints');
ok(importCommit.includes('reconcilePendingDestructiveMoveStoreForJournalReset'), 'import-replace reconciles destructive receipts');

// 10) Portable backup never carries local CAS authority.
const exportSection = worker.slice(worker.indexOf('async function readJournalEntryBatch'), worker.indexOf('async function stageFullJournalExport'));
ok(exportSection.includes('const { entryRevision: _localEntryRevision, ...portableEntry } = entry;'), 'export strips local entry revision');

// 11) Adjacent authority owners remain separate.
ok(registry.includes('| P0-072 | ACTIVE |'), 'P0-072 remains ACTIVE');
ok(registry.includes('| P1-090 | ACTIVE |'), 'P1-090 remains ACTIVE');
ok(registry.includes('| P1-198 | ACTIVE |'), 'P1-198 remains ACTIVE');

// 12) Owner state + evidence/release boundary.
ok(registry.includes('| P0-076 | DONE |'), 'P0-076 is moved to DONE only with closure evidence');
ok(!registry.includes('| P0-076 | ACTIVE |'), 'P0-076 is no longer ACTIVE after closure');
ok(fs.existsSync(evidencePath), 'durable P0-076 closure evidence exists');
ok(status.includes('P0-076 is **DONE**'), 'TEST_STATUS records closure state');
ok(/\*\*NOT READY\.\*\*/.test(readiness), 'release remains NOT READY');

console.log(
  'P0-076 single-entry generation CAS closure: PASS; checks=' + checks +
  '; acceptance=12/12; blind_callers=0; append_nonoverwrite=true; destructive_restart_authority=true;' +
  ' legacy_fail_closed=true; adjacent_owners_separate=true; release_ready=false'
);
