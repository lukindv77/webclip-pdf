'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const registry = fs.readFileSync(path.join(ROOT, 'project_docs/RESEARCH_REGISTRY.md'), 'utf8');
const readiness = fs.readFileSync(path.join(ROOT, 'project_docs/RELEASE_READINESS.md'), 'utf8');

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

const tokenSource = functionSource(worker, 'pendingDestructiveMoveJournalAuthorityToken');
const matchSource = functionSource(worker, 'pendingDestructiveMoveJournalAuthorityMatches');
const advanceSource = functionSource(worker, 'pendingDestructiveMoveAdvanceJournalAuthority');
const sourceMatch = functionSource(worker, 'pendingDestructiveMoveEntryMatches');

ok(matchSource.includes('pendingDestructiveMoveEntryMatches(receipt, entry)'), 'P0-072 source identity remains the first local-finalizer guard');
ok(matchSource.includes('journalEntryAuthorityMatches(resetGeneration, entry, token)'), 'new receipts additionally require exact P0-076 CAS authority');
ok(matchSource.includes('Boolean(token && journalEntryAuthorityMatches'), 'local destructive mutation requires an exact P0-076 cursor');
ok(!matchSource.includes(': true'), 'legacy no-cursor receipt has no permissive local fallback');
ok(advanceSource.includes('journalEntryAuthorityToken(resetGeneration, entry)'), 'ReadLater checkpoint advances cursor from the committed row');

const context = vm.createContext({ String, Number, Boolean, Object });
vm.runInContext(
  "const MAX_IMPORTED_ENTRY_ID_CHARS=180;" +
  "const JOURNAL_INITIAL_RESET_GENERATION=1;" +
  "const JOURNAL_INITIAL_ENTRY_REVISION=1;" +
  "function normalizeJournalResetGeneration(v){v=Number(v);return Number.isSafeInteger(v)&&v>=1?v:1;}" +
  "function normalizeJournalEntryRevision(v){v=Number(v);return Number.isSafeInteger(v)&&v>=1?v:1;}" +
  "function normalizeJournalEntryAuthorityToken(value){if(!value||typeof value!=='object'||Array.isArray(value))return null;const entryId=String(value.entryId||'').trim();const resetGeneration=Number(value.resetGeneration);const entryRevision=Number(value.entryRevision);if(!entryId||entryId.length>MAX_IMPORTED_ENTRY_ID_CHARS||!Number.isSafeInteger(resetGeneration)||resetGeneration<1||!Number.isSafeInteger(entryRevision)||entryRevision<1)return null;return {entryId,resetGeneration,entryRevision};}" +
  "function journalEntryAuthorityToken(resetGeneration,entry={}){const entryId=String(entry?.id||'').trim();if(!entryId)return null;return {entryId,resetGeneration:normalizeJournalResetGeneration(resetGeneration),entryRevision:normalizeJournalEntryRevision(entry?.entryRevision)};}" +
  "function journalEntryAuthorityMatches(resetGeneration,entry,tokenValue){const token=normalizeJournalEntryAuthorityToken(tokenValue);return Boolean(token&&entry&&String(entry.id||'')===token.entryId&&normalizeJournalResetGeneration(resetGeneration)===token.resetGeneration&&normalizeJournalEntryRevision(entry.entryRevision)===token.entryRevision);}" +
  sourceMatch + tokenSource + matchSource + advanceSource +
  ";this.api={pendingDestructiveMoveJournalAuthorityToken,pendingDestructiveMoveJournalAuthorityMatches,pendingDestructiveMoveAdvanceJournalAuthority};",
  context
);
const api = context.api;
const entry = { id: 'entry-A', createdAt: 100, destination: 'yandex', resourceId: 'rid-A', entryRevision: 4 };
const legacy = { sourceJournalEntryId: 'entry-A', sourceJournalCreatedAt: 100, sourceResourceId: 'rid-A' };
eq(api.pendingDestructiveMoveJournalAuthorityMatches(legacy, 9, entry), false, 'legacy receipt cannot automatically mutate local Journal state');
const exact = { ...legacy, sourceJournalResetGeneration: 9, sourceJournalEntryRevision: 4 };
eq(api.pendingDestructiveMoveJournalAuthorityMatches(exact, 9, entry), true, 'exact new receipt matches current generation+revision');
eq(api.pendingDestructiveMoveJournalAuthorityMatches(exact, 10, entry), false, 'reset generation change invalidates new receipt local authority');
eq(api.pendingDestructiveMoveJournalAuthorityMatches(exact, 9, { ...entry, entryRevision: 5 }), false, 'same-entry mutation invalidates new receipt local authority');
eq(api.pendingDestructiveMoveJournalAuthorityMatches(exact, 9, { ...entry, resourceId: 'rid-B' }), false, 'P0-072 resource identity still blocks even with matching CAS cursor');
const advanced = api.pendingDestructiveMoveAdvanceJournalAuthority(exact, 9, { ...entry, entryRevision: 5 });
eq(advanced.sourceJournalResetGeneration, 9, 'cursor advance retains reset generation');
eq(advanced.sourceJournalEntryRevision, 5, 'cursor advance records committed next row revision');

for (const name of ['checkpointPendingReadMoveIntent', 'checkpointPendingTrashMoveIntent']) {
  const source = functionSource(worker, name);
  ok(source.includes('journalAuthority = null'), name + ' accepts local authority separately from remote receipt identity');
  ok(source.includes('sourceJournalResetGeneration: sourceJournalAuthority?.resetGeneration || 0'), name + ' persists reset generation');
  ok(source.includes('sourceJournalEntryRevision: sourceJournalAuthority?.entryRevision || 0'), name + ' persists row revision');
  ok(source.includes('[JOURNAL_PENDING_DESTRUCTIVE_STORE, JOURNAL_STORE, JOURNAL_META_STORE]'), name + ' validates receipt creation in one DB transaction');
  ok(source.includes('pendingDestructiveMoveJournalAuthorityMatches(item, resetGeneration, current)'), name + ' refuses stale pre-receipt authority');
  ok(source.includes('pending.add(item)'), name + ' still creates a detached worker-issued receipt');
}

const admitted = functionSource(worker, 'markPendingDestructiveMoveAdmitted');
ok(admitted.includes('[JOURNAL_PENDING_DESTRUCTIVE_STORE, JOURNAL_STORE, JOURNAL_META_STORE]'), 'remote POST admission rechecks local authority atomically');
ok(admitted.includes('pendingDestructiveMoveJournalAuthorityMatches(current, resetGeneration, journalEntry)'), 'remote admission rejects a stale local cursor');
ok(admitted.includes("WEBCLIP_DESTRUCTIVE_MOVE_JOURNAL_AUTHORITY_STALE_BEFORE_ADMISSION"), 'pre-POST stale authority has stable fail-closed code');
ok(admitted.includes("phase: 'admitted-unknown'"), 'P0-072 external settlement phase remains authoritative');

const checkpoint = functionSource(worker, 'updateReadMoveJournalCheckpointFromReceipt');
ok(checkpoint.includes('pendingDestructiveMoveJournalAuthorityMatches(receipt, resetGeneration, current)'), 'ReadLater checkpoint compares exact cursor');
ok(checkpoint.includes('entryRevision: nextJournalEntryRevision(current.entryRevision)'), 'ReadLater checkpoint advances row revision');
ok(checkpoint.includes('pendingDestructiveMoveAdvanceJournalAuthority(receipt, resetGeneration, updated)'), 'ReadLater checkpoint advances receipt cursor with the row');
ok(checkpoint.includes('receipts.put({ ...advancedReceipt, updatedAt: Date.now() })'), 'row and advanced cursor commit in same transaction');

for (const name of ['finalizeReadMoveJournalFromReceipt', 'finalizeTrashDeleteFromReceipt']) {
  const source = functionSource(worker, name);
  ok(source.includes('pendingDestructiveMoveJournalAuthorityMatches(receipt, resetGeneration, current)'), name + ' terminal local mutation checks P0-072 identity plus P0-076 cursor');
  ok(source.includes('sourceAuthorityLost: true'), name + ' stale local authority becomes non-retargeting cancellation');
  ok(source.includes('receipts.delete(key)'), name + ' terminal stale/current outcome retires receipt atomically');
}

const readMove = functionSource(worker, 'moveReadLaterEntryToRead');
ok(readMove.includes('const authoritySnapshot = await readJournalEntryWithAuthority(id)'), 'Mark Read captures exact local authority before delayed work');
ok(readMove.includes('const journalAuthority = authoritySnapshot?.token || null'), 'Mark Read retains exact token');
ok(readMove.includes('journalAuthority'), 'Mark Read binds prepared receipt to captured token');

const deleteEntry = functionSource(worker, 'deleteJournalEntry');
ok(deleteEntry.includes('moveJournalYandexFileToTrash(entry, operationId, deleteAuthority)'), 'Trash receives local CAS cursor from the already-atomic delete admission');
const trashMove = functionSource(worker, 'moveJournalYandexFileToTrash');
ok(trashMove.includes("checkpointPendingTrashMoveIntent(entry"), 'Trash still creates dedicated P0-072 receipt');
ok(trashMove.includes('journalAuthority'), 'Trash passes CAS cursor only as a local Journal fence');
ok(trashMove.includes('markPendingDestructiveMoveVerified'), 'Trash remote verification remains separate from local CAS');

const verified = functionSource(worker, 'markPendingDestructiveMoveVerified');
ok(verified.includes('verifiedResourceId'), 'P1-090/P0-072 remote-object evidence remains in terminal receipt');
ok(verified.includes("phase: 'remote-verified'"), 'remote terminal truth is not replaced by CAS');

ok(registry.includes('| P0-076 | ACTIVE |'), 'P0-076 remains ACTIVE');
ok(registry.includes('| P0-072 | ACTIVE |'), 'P0-072 remains separate ACTIVE owner');
ok(registry.includes('| P1-090 | ACTIVE |'), 'P1-090 remains separate ACTIVE owner');
ok(registry.includes('| P1-198 | ACTIVE |'), 'P1-198 remains separate ACTIVE owner');
ok(/\*\*NOT READY\.\*\*/.test(readiness), 'release readiness remains NOT READY');

console.log(
  'P0-076 destructive receipt CAS composition: PASS; checks=' + checks +
  '; receipt_cursor=true; create_atomic=true; admission_recheck=true; read_cursor_advance=true;' +
  ' terminal_nonretarget=true; legacy_fail_closed=true; p0_072_remote_authority=true; release_closed=false'
);
