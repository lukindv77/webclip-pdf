'use strict';

// Owner marker for PR contract: P0-076
// Adjacent owners remain separate: P0-072, P1-090, P1-198.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const registry = fs.readFileSync(path.join(ROOT, 'project_docs/RESEARCH_REGISTRY.md'), 'utf8');

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

function section(source, start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error('section not found: ' + start + ' -> ' + end);
  return source.slice(a, b);
}

ok(worker.includes("const JOURNAL_DB_VERSION = 8;"), 'authority primitive reuses Journal DB v8');
ok(worker.includes("const JOURNAL_RESET_GENERATION_KEY = 'resetGeneration';"), 'dedicated reset-generation metadata key exists');
ok(worker.includes('const JOURNAL_INITIAL_RESET_GENERATION = 1;'), 'legacy DB has deterministic reset-generation baseline');
ok(worker.includes('const JOURNAL_INITIAL_ENTRY_REVISION = 1;'), 'legacy/new row has deterministic entry-revision baseline');
ok(registry.includes('| P0-076 | DONE |'), 'P0-076 closure is durable in Registry');
ok(registry.includes('| P0-072 | ACTIVE |'), 'P0-072 remains separate ACTIVE owner');
ok(registry.includes('| P1-090 | ACTIVE |'), 'P1-090 remains separate ACTIVE owner');

const normalizeReset = functionSource(worker, 'normalizeJournalResetGeneration');
const normalizeEntry = functionSource(worker, 'normalizeJournalEntryRevision');
const nextEntry = functionSource(worker, 'nextJournalEntryRevision');
const makeToken = functionSource(worker, 'journalEntryAuthorityToken');
const normalizeToken = functionSource(worker, 'normalizeJournalEntryAuthorityToken');
const matches = functionSource(worker, 'journalEntryAuthorityMatches');

const ctx = vm.createContext({
  Number,
  String,
  Object,
  Error,
  JOURNAL_INITIAL_RESET_GENERATION: 1,
  JOURNAL_INITIAL_ENTRY_REVISION: 1,
  MAX_IMPORTED_ENTRY_ID_CHARS: 180
});
vm.runInContext(
  normalizeReset + '\n' + normalizeEntry + '\n' + nextEntry + '\n' + makeToken + '\n' + normalizeToken + '\n' + matches +
  '\nthis.api={normalizeJournalResetGeneration,normalizeJournalEntryRevision,nextJournalEntryRevision,journalEntryAuthorityToken,normalizeJournalEntryAuthorityToken,journalEntryAuthorityMatches};',
  ctx
);
const api = ctx.api;
eq(api.normalizeJournalResetGeneration(undefined), 1, 'missing reset generation normalizes to legacy baseline');
eq(api.normalizeJournalResetGeneration(7), 7, 'valid reset generation is preserved');
eq(api.normalizeJournalResetGeneration(0), 1, 'invalid reset generation fails closed to baseline');
eq(api.normalizeJournalEntryRevision(undefined), 1, 'missing legacy entry revision normalizes to baseline');
eq(api.normalizeJournalEntryRevision(9), 9, 'valid entry revision is preserved');
eq(api.nextJournalEntryRevision(1), 2, 'point mutation advances entry revision exactly once');

const token = api.journalEntryAuthorityToken(3, { id: 'entry-A', entryRevision: 4 });
eq(token.entryId, 'entry-A', 'authority token binds exact entry id');
eq(token.resetGeneration, 3, 'authority token binds reset generation');
eq(token.entryRevision, 4, 'authority token binds entry revision');
eq(api.journalEntryAuthorityMatches(3, { id: 'entry-A', entryRevision: 4 }, token), true, 'exact authority matches');
eq(api.journalEntryAuthorityMatches(4, { id: 'entry-A', entryRevision: 4 }, token), false, 'reset generation invalidates old token');
eq(api.journalEntryAuthorityMatches(3, { id: 'entry-A', entryRevision: 5 }, token), false, 'same-entry mutation invalidates old token');
eq(api.journalEntryAuthorityMatches(3, { id: 'entry-B', entryRevision: 4 }, token), false, 'textual row identity is part of token');

const advance = functionSource(worker, 'advanceJournalResetGeneration');
ok(advance.includes('meta.get(JOURNAL_RESET_GENERATION_KEY)'), 'reset generation reads dedicated metadata');
ok(advance.includes('const next = current + 1'), 'reset generation advances monotonically');
ok(advance.includes('key: JOURNAL_RESET_GENERATION_KEY'), 'reset generation writes dedicated metadata');
ok(!advance.includes('JOURNAL_META_REVISION_KEY'), 'reset generation is not aliased to all-mutations revision');

const touch = functionSource(worker, 'touchJournalDbRevision');
ok(touch.includes('JOURNAL_META_REVISION_KEY'), 'existing all-mutations revision remains separate');
ok(!touch.includes('JOURNAL_RESET_GENERATION_KEY'), 'ordinary revision touch does not invalidate all CAS tokens');

const imported = functionSource(worker, 'normalizeImportedJournalEntry');
ok(imported.includes('entryRevision: JOURNAL_INITIAL_ENTRY_REVISION'), 'every imported replacement starts fresh entry revision');
ok(!imported.includes('raw.entryRevision'), 'serialized local authority is never trusted on import');

const append = functionSource(worker, 'appendJournalEntry');
ok(append.includes('entryRevision: JOURNAL_INITIAL_ENTRY_REVISION'), 'new append starts at entry revision one');
ok(!append.includes('advanceJournalResetGeneration'), 'append does not advance reset generation');

const exportBatch = functionSource(worker, 'readJournalEntryBatch');
ok(exportBatch.includes('const { entryRevision: _localEntryRevision, ...portableEntry } = entry'), 'export strips local-only entry revision');
ok(exportBatch.includes('JSON.stringify({ ...portableEntry'), 'export serializes portable entry rather than CAS authority');

const clear = functionSource(worker, 'clearJournalEntries');
eq((clear.match(/advanceJournalResetGeneration\(/g) || []).length, 1, 'each clear operation schedules one reset-generation bump');
ok(clear.includes('advanceJournalResetGeneration(tx, `clear-${scope}`, fail)'), 'scoped/full clear advances generation inside same Journal transaction');
ok(clear.includes('[JOURNAL_STORE, JOURNAL_META_STORE'), 'clear transaction contains entries and authority meta together');

const importReplace = functionSource(worker, 'commitStagedJournalImport');
eq((importReplace.match(/advanceJournalResetGeneration\(/g) || []).length, 1, 'import-replace schedules one reset-generation bump');
ok(importReplace.includes("advanceJournalResetGeneration(tx, 'import-replace', abort)"), 'import reset generation advances inside replacement transaction');
ok(importReplace.includes('journalStore.put({ ...entry, entryRevision: JOURNAL_INITIAL_ENTRY_REVISION })'), 'final import copy enforces fresh revision even if staging is stale');
ok(importReplace.includes('JOURNAL_META_STORE'), 'import replacement transaction includes authority meta');

const legacyUpdate = functionSource(worker, 'updateJournalEntryRecord');
ok(legacyUpdate.includes('entryRevision: nextJournalEntryRevision(current.entryRevision)'), 'legacy point writes advance entry revision');
ok(!legacyUpdate.includes('advanceJournalResetGeneration'), 'ordinary point update leaves reset generation stable');

const guardedCheckpoint = functionSource(worker, 'updateReadMoveJournalCheckpointFromReceipt');
ok(guardedCheckpoint.includes('entryRevision: nextJournalEntryRevision(current.entryRevision)'), 'receipt-guarded ReadLater checkpoint advances entry revision');
ok(guardedCheckpoint.includes('pendingDestructiveMoveJournalAuthorityMatches(receipt, resetGeneration, current)'), 'ReadLater checkpoint consumes exact receipt-local P0-076 authority');
ok(guardedCheckpoint.includes('pendingDestructiveMoveAdvanceJournalAuthority(receipt, resetGeneration, updated)'), 'ReadLater checkpoint advances receipt cursor with its own row write');
const guardedFinalize = functionSource(worker, 'finalizeReadMoveJournalFromReceipt');
ok(guardedFinalize.includes('entryRevision: nextJournalEntryRevision(current.entryRevision)'), 'receipt-guarded ReadLater terminal patch advances entry revision');
ok(guardedFinalize.includes('pendingDestructiveMoveJournalAuthorityMatches(receipt, resetGeneration, current)'), 'ReadLater finalizer refuses stale receipt-local P0-076 authority');
const trashFinalize = functionSource(worker, 'finalizeTrashDeleteFromReceipt');
ok(trashFinalize.includes('pendingDestructiveMoveJournalAuthorityMatches(receipt, resetGeneration, current)'), 'Trash finalizer refuses stale receipt-local P0-076 authority');

const snapshot = functionSource(worker, 'readJournalEntryWithAuthority');
ok(snapshot.includes('[JOURNAL_STORE, JOURNAL_META_STORE]'), 'authority snapshot reads row and generation in one transaction');
ok(snapshot.includes("'readonly'"), 'authority snapshot is read-only');
ok(snapshot.includes('entryRevision: normalizeJournalEntryRevision(entry.entryRevision)'), 'legacy rows are normalized without migration write');
ok(snapshot.includes('journalEntryAuthorityToken(resetGeneration, normalizedEntry)'), 'snapshot returns exact authority token');

const capture = functionSource(worker, 'captureJournalEntryAuthority');
ok(capture.includes('readJournalEntryWithAuthority(id)'), 'token capture uses atomic row+generation snapshot');
ok(capture.includes('snapshot?.token || null'), 'missing row has no authority token');

const casUpdate = functionSource(worker, 'updateJournalEntryRecordCas');
ok(casUpdate.includes('[JOURNAL_STORE, JOURNAL_META_STORE]'), 'CAS patch compares and writes in one transaction');
ok(casUpdate.includes("'readwrite'"), 'CAS patch transaction is readwrite');
ok(casUpdate.includes('journalEntryAuthorityMatches(resetGeneration, current, token)'), 'CAS patch compares reset and row revision before write');
ok(casUpdate.includes('{ ok: false, stale: true, entry: null, token: null }'), 'stale patch is surfaced rather than retargeted');
ok(casUpdate.includes('entryRevision: nextJournalEntryRevision(current.entryRevision)'), 'successful CAS patch advances row revision');
ok(casUpdate.includes("touchJournalDbRevision(tx, 'cas-update-entry')"), 'successful CAS patch keeps existing view/export revision semantics');
ok(casUpdate.includes('journalEntryAuthorityToken(resetGeneration, updated)'), 'successful CAS patch returns next authority token');
ok(!casUpdate.includes('advanceJournalResetGeneration'), 'CAS point patch does not advance reset generation');

const casDelete = functionSource(worker, 'deleteJournalEntryRecordOnlyCas');
ok(casDelete.includes('[JOURNAL_STORE, JOURNAL_META_STORE]'), 'CAS delete compares and deletes in one transaction');
ok(casDelete.includes('journalEntryAuthorityMatches(resetGeneration, current, token)'), 'CAS delete checks reset+entry authority');
ok(casDelete.includes('{ ok: false, stale: true, entry: null }'), 'stale delete cannot delete same-id replacement');
ok(casDelete.includes('entries.delete(token.entryId)'), 'exact-current delete targets token entry only');
ok(casDelete.includes("touchJournalDbRevision(tx, 'cas-delete-entry')"), 'successful CAS delete keeps existing Journal revision semantics');
ok(casDelete.includes('rebuildUrlStatsForUrl(entry.urlKey)'), 'CAS delete preserves derived stats repair');
ok(!casDelete.includes('advanceJournalResetGeneration'), 'single-entry delete does not advance reset generation');

const resetSnapshot = functionSource(worker, 'journalResetGenerationSnapshot');
ok(resetSnapshot.includes('JOURNAL_RESET_GENERATION_KEY'), 'dedicated reset generation can be read durably after worker restart');

const addComment = functionSource(worker, 'addJournalComment');
const editComment = functionSource(worker, 'editJournalComment');
const deleteComment = functionSource(worker, 'deleteJournalComment');
for (const [name, source] of [['add', addComment], ['edit', editComment], ['delete', deleteComment]]) {
  ok(source.includes('readJournalEntryWithAuthority(id)'), `comment ${name} captures CAS authority`);
  ok(source.includes('updateJournalEntryRecordCas(authority,'), `comment ${name} uses CAS point writer`);
  ok(!source.includes('updateJournalEntryRecord(id,'), `comment ${name} no longer uses blind point writer`);
}
ok((worker.match(/updateJournalEntryRecord\(/g) || []).length === 1, 'legacy blind point writer has no production caller after comment migration');
ok((worker.match(/deleteJournalEntryRecordOnly\(/g) || []).length === 1, 'legacy blind delete helper has no production caller after local-delete migration');

console.log(
  'P0-076 Journal CAS authority primitive: PASS; checks=' + checks +
  '; reset_generation=true; entry_revision=true; import_fresh=true; export_strips_authority=true;' +
  ' capture_atomic=true; cas_patch=true; cas_delete=true; point_writes_increment=true;' +
  ' callers_migrated=true; comments_cas=true; destructive_receipt_cas=true; release_closed=false'
);
