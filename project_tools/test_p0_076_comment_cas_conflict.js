'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const journal = fs.readFileSync(path.join(ROOT, 'journal.js'), 'utf8');
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

const conflict = functionSource(worker, 'journalCommentConflictResult');
ok(conflict.includes('stale: true'), 'comment conflict is explicitly stale');
ok(conflict.includes('conflict: true'), 'comment conflict is explicitly a conflict');
ok(conflict.includes("code: 'JOURNAL_ENTRY_STALE'"), 'comment conflict has a stable code');
ok(conflict.includes('Обновите журнал и повторите действие.'), 'comment conflict tells the user to reread before retrying');

for (const [name, reason] of [
  ['addJournalComment', 'comment-add'],
  ['editJournalComment', 'comment-edit'],
  ['deleteJournalComment', 'comment-delete']
]) {
  const source = functionSource(worker, name);
  ok(source.includes('const snapshot = await readJournalEntryWithAuthority(id)'), name + ' captures row+generation atomically');
  ok(source.includes('const authority = snapshot?.token || null'), name + ' retains exact entry authority');
  ok(source.includes('updateJournalEntryRecordCas(authority,'), name + ' final write uses CAS');
  ok(source.includes('if (result?.stale) return journalCommentConflictResult()'), name + ' surfaces stale conflict');
  eq((source.match(/updateJournalEntryRecordCas\(/g) || []).length, 1, name + ' performs no hidden automatic CAS retry');
  ok(!source.includes('updateJournalEntryRecord(id,'), name + ' no longer uses blind point writer');
  ok(!source.includes('getJournalEntryById(id)'), name + ' does not split row read from authority capture');
  const conflictIndex = source.indexOf('if (result?.stale) return journalCommentConflictResult()');
  const notifyIndex = source.indexOf(`notifyJournalChanged('${reason}')`);
  ok(conflictIndex >= 0 && notifyIndex > conflictIndex, name + ' does not notify a failed stale mutation');
}

eq((worker.match(/updateJournalEntryRecord\(/g) || []).length, 1, 'legacy blind point-writer helper has no production callers');
eq((worker.match(/deleteJournalEntryRecordOnly\(/g) || []).length, 1, 'legacy blind delete helper has no production callers');

const legacyUpdate = functionSource(worker, 'updateJournalComment');
ok(legacyUpdate.includes('return editJournalComment(id, editable.id, comment)'), 'legacy single-comment RPC delegates mutation to CAS edit');
ok(legacyUpdate.includes('return addJournalComment(id, comment)'), 'legacy single-comment RPC delegates mutation to CAS add');
ok(!legacyUpdate.includes('updateJournalEntryRecord('), 'legacy single-comment RPC has no blind writer');

const requireOk = functionSource(journal, 'requireOk');
ok(requireOk.includes("throw new Error(response?.error || 'Операция не выполнена.')"), 'Journal UI surfaces worker conflict error text');
const commentUi = functionSource(journal, 'buildJournalComments');
ok(commentUi.includes('setStatus(error?.message || String(error), \'error\')'), 'comment UI shows stale conflict as an error');
ok(commentUi.includes('save.disabled = false'), 'save editor remains retryable after conflict');
ok(commentUi.includes('cancel.disabled = false'), 'cancel remains available after conflict');
ok(commentUi.includes('edit.disabled = false'), 'delete conflict restores edit control');
ok(commentUi.includes('remove.disabled = false'), 'delete conflict restores delete control');

const trashFinalize = functionSource(worker, 'finalizeTrashDeleteFromReceipt');
ok(trashFinalize.includes('pendingDestructiveMoveJournalAuthorityMatches(receipt, resetGeneration, current)'), 'P0-072 Trash receipt guard now composes a separate P0-076 local cursor');
ok(functionSource(worker, 'checkpointPendingTrashMoveIntent').includes("makePendingDestructiveMoveId('trash-move')"), 'P0-072 worker-issued destructive identity remains separate from comment/local CAS');
ok(!trashFinalize.includes('journalCommentConflictResult'), 'comment CAS does not leak into P0-072 Trash authority');

ok(registry.includes('| P0-076 | ACTIVE |'), 'P0-076 remains ACTIVE');
ok(registry.includes('| P0-072 | ACTIVE |'), 'P0-072 remains separate ACTIVE owner');
ok(registry.includes('| P1-090 | ACTIVE |'), 'P1-090 remains separate ACTIVE owner');
ok(registry.includes('| P1-198 | ACTIVE |'), 'P1-198 remains separate ACTIVE owner');
ok(/\*\*NOT READY\.\*\*/.test(readiness), 'release readiness remains NOT READY');

console.log(
  'P0-076 Journal comment CAS conflict: PASS; checks=' + checks +
  '; add_cas=true; edit_cas=true; delete_cas=true; stale_conflict=true;' +
  ' auto_retry=false; blind_callers=0; p0_072_separate=true; release_closed=false'
);
