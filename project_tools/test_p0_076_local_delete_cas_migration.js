'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const registry = fs.readFileSync(path.join(ROOT, 'project_docs/RESEARCH_REGISTRY.md'), 'utf8');
const readiness = fs.readFileSync(path.join(ROOT, 'project_docs/RELEASE_READINESS.md'), 'utf8');

let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }

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

const del = functionSource(worker, 'deleteJournalEntry');
const casDelete = functionSource(worker, 'deleteJournalEntryRecordOnlyCas');
const trashFinalize = functionSource(worker, 'finalizeTrashDeleteFromReceipt');

ok(del.includes('const authoritySnapshot = await readJournalEntryWithAuthority(id)'), 'delete admission captures row plus reset generation atomically');
ok(del.includes('const entry = authoritySnapshot?.entry || null'), 'operation uses the exact row from the authority snapshot');
ok(del.includes('const deleteAuthority = authoritySnapshot?.token || null'), 'operation retains exact per-entry/reset authority token');
ok(del.includes('if (!entry || !deleteAuthority)'), 'missing authority fails before delete operation admission');

ok(del.includes('const finalized = await deleteJournalEntryRecordOnlyCas(deleteAuthority)'), 'local/keep delete finalizes only through CAS delete');
ok(!del.includes('await deleteJournalEntryRecordOnly(id)'), 'local/keep caller no longer performs blind id delete');
ok(del.includes('journalSuperseded = Boolean(!finalized?.ok && finalized?.stale)'), 'stale CAS is surfaced as superseded instead of retargeted');
ok(del.includes("if (!journalSuperseded) notifyJournalChanged('delete')"), 'stale local delete does not publish a false delete mutation');
ok(del.includes('поздняя операция удаления не затронула более новую версию'), 'stale local delete has explicit non-retargeting completion semantics');

ok(casDelete.includes('journalEntryAuthorityMatches(resetGeneration, current, token)'), 'CAS delete checks reset generation and entry revision');
ok(casDelete.includes('entries.delete(token.entryId)'), 'CAS delete deletes only the token-bound entry');
ok(casDelete.includes('{ ok: false, stale: true, entry: null }'), 'same-id replacement or newer revision returns stale');
ok(casDelete.includes("touchJournalDbRevision(tx, 'cas-delete-entry')"), 'successful CAS delete preserves Journal revision semantics');
ok(casDelete.includes('rebuildUrlStatsForUrl(entry.urlKey)'), 'successful CAS delete preserves URL stats repair');

ok(del.includes('moved = await moveJournalYandexFileToTrash(entry, operationId, deleteAuthority)'), 'Trash external-effect path remains receipt-driven while carrying a separate local CAS cursor');
ok(del.includes('const finalized = await finalizeTrashDeleteFromReceipt(moved.detachedReceiptId)'), 'Trash finalization still consumes detached P0-072 receipt');
ok(functionSource(worker, 'checkpointPendingTrashMoveIntent').includes("makePendingDestructiveMoveId('trash-move')"), 'generic P0-076 cursor does not replace worker-issued P0-072 receipt identity');
ok(trashFinalize.includes('pendingDestructiveMoveJournalAuthorityMatches(receipt, resetGeneration, current)'), 'Trash local finalizer now composes P0-072 receipt identity with exact P0-076 cursor');
ok(trashFinalize.includes("!['trash-move', 'publication-revoke-trash'].includes(receipt.kind) || receipt.phase !== 'remote-verified'"), 'Trash delete still requires reviewed-kind terminal remote verification');

const addComment = functionSource(worker, 'addJournalComment');
const editComment = functionSource(worker, 'editJournalComment');
const deleteComment = functionSource(worker, 'deleteJournalComment');
ok(addComment.includes('updateJournalEntryRecordCas(authority,'), 'comment add now composes the same P0-076 CAS primitive');
ok(editComment.includes('updateJournalEntryRecordCas(authority,'), 'comment edit now composes the same P0-076 CAS primitive');
ok(deleteComment.includes('updateJournalEntryRecordCas(authority,'), 'comment delete now composes the same P0-076 CAS primitive');
ok(!addComment.includes('updateJournalEntryRecord(id,'), 'comment migration does not reintroduce blind point writes');

ok(registry.includes('| P0-076 | DONE |'), 'P0-076 closure is durable in Registry');
ok(registry.includes('| P0-072 | ACTIVE |'), 'P0-072 remains separate ACTIVE owner');
ok(registry.includes('| P1-090 | ACTIVE |'), 'P1-090 remains separate ACTIVE owner');
ok(registry.includes('| P1-198 | ACTIVE |'), 'P1-198 remains separate ACTIVE owner');
ok(/\*\*NOT READY\.\*\*/.test(readiness), 'release readiness remains NOT READY');

console.log(
  'P0-076 local delete CAS migration: PASS; checks=' + checks +
  '; admission_snapshot=true; local_delete_cas=true; stale_nonretarget=true;' +
  ' trash_receipt_authority_separate=true; destructive_receipt_cas=true; comments_cas=true; release_closed=false'
);
