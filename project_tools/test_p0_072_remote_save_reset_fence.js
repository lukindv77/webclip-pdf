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

const normalizeReceiptSource = functionSource(worker, 'normalizePendingRemotePdfCacheReceipt');
const dispositionSource = functionSource(worker, 'pendingRemoteResetDisposition');
const scopeSource = functionSource(worker, 'pendingRemoteMatchesJournalResetScope');
const provenanceSource = functionSource(worker, 'pendingRemoteResetProvenance');
const markSource = functionSource(worker, 'markPendingRemoteSupersededByJournalReset');

const context = vm.createContext({
  String, Number, Boolean, Math, Object, Error, Date,
  normalizeJournalUrl(value) {
    try {
      const u = new URL(String(value || ''));
      u.hash = '';
      return u.toString();
    } catch (_) { return String(value || '').split('#')[0]; }
  },
  getJournalSiteKey(value) {
    try { return new URL(String(value || '')).hostname.toLowerCase(); }
    catch (_) { return String(value || '').toLowerCase(); }
  },
  URL
});
vm.runInContext(
  normalizeReceiptSource + '\n' +
  dispositionSource + '\n' +
  scopeSource + '\n' +
  provenanceSource + '\n' +
  markSource + '\n' +
  'this.api = { normalizePendingRemotePdfCacheReceipt, pendingRemoteResetDisposition, pendingRemoteMatchesJournalResetScope, pendingRemoteResetProvenance, markPendingRemoteSupersededByJournalReset };',
  context
);
const api = context.api;

const exactAdmitted = {
  id: 'remote-A',
  phase: 'admitted-unknown',
  pdfCacheKey: 'pdf:gen-A',
  pdfCacheGeneration: 'gen-A',
  expectedPdfBytes: 1234,
  data: { meta: { url: 'https://a.test/page', hostname: 'a.test' } }
};
eq(api.pendingRemoteResetDisposition(exactAdmitted), 'preserve', 'admitted unknown remote effect survives reset');
eq(api.pendingRemoteResetDisposition({ ...exactAdmitted, phase: 'stale-unverified' }), 'preserve', 'manual-resolution unknown receipt survives reset');
eq(api.pendingRemoteResetDisposition({ ...exactAdmitted, phase: 'remote-verified' }), 'drop', 'already verified remote outcome may be retired by reset');
eq(api.pendingRemoteResetDisposition({ ...exactAdmitted, phase: 'prepared' }), 'drop', 'exact pre-admission prepared receipt is cancellable');
eq(api.pendingRemoteResetDisposition({
  id: 'legacy',
  phase: 'prepared',
  expectedPdfBytes: 1234,
  data: { meta: { url: 'https://a.test/page' } }
}), 'preserve', 'legacy prepared row without exact cache receipt remains ambiguous and survives reset');

eq(api.pendingRemoteMatchesJournalResetScope(exactAdmitted, {}), true, 'all reset matches remote receipt');
eq(api.pendingRemoteMatchesJournalResetScope(exactAdmitted, { urlKey: 'https://a.test/page' }), true, 'matching URL reset selects receipt');
eq(api.pendingRemoteMatchesJournalResetScope(exactAdmitted, { urlKey: 'https://b.test/page' }), false, 'unrelated URL reset cannot supersede receipt');
eq(api.pendingRemoteMatchesJournalResetScope(exactAdmitted, { siteKey: 'a.test' }), true, 'matching site reset selects receipt');
eq(api.pendingRemoteMatchesJournalResetScope(exactAdmitted, { siteKey: 'b.test' }), false, 'unrelated site reset cannot supersede receipt');

const marked = api.markPendingRemoteSupersededByJournalReset(exactAdmitted, {
  scope: 'import-replace',
  resetAt: 9000
});
eq(marked.supersededByJournalReset, true, 'reset marker is durable truth');
eq(marked.journalResetAt, 9000, 'reset marker captures reset time');
eq(marked.journalResetScope, 'import-replace', 'reset marker captures reset scope');
eq(marked.phase, 'admitted-unknown', 'reset does not lie about external settlement phase');
eq(api.pendingRemoteResetProvenance(marked).supersededByJournalReset, true, 'retry/rewrite can carry reset provenance');
eq(api.pendingRemoteResetProvenance(exactAdmitted).supersededByJournalReset, undefined, 'unreset receipt has no synthetic reset authority');

const checkpointSection = section(
  worker,
  'async function checkpointPendingRemoteSaveIntent',
  'async function markPendingRemoteSaveVerified'
);
ok(checkpointSection.includes('const resetProvenance = pendingRemoteResetProvenance(existing);'), 'existing checkpoint merge reads reset provenance');
ok(checkpointSection.includes('...resetProvenance'), 'manual retry/reactivation cannot erase reset provenance');

const clearSection = section(
  worker,
  'async function clearJournalEntries',
  'async function journalRevisionSnapshot'
);
ok(clearSection.includes('reconcilePendingRemoteStoreForJournalReset(pendingRemoteStore'), 'clear routes remote checkpoints through reset fence');
ok(!clearSection.includes('pendingRemoteStore.clear()'), 'clear(all) no longer blind-clears remote checkpoints');
ok(!clearSection.includes("prunePending(pendingRemoteStore, 'pending Yandex checkpoints')"), 'scoped clear no longer blind-prunes matching remote checkpoints');
ok(clearSection.includes('urlKey,\n          siteKey,\n          scope'), 'scoped clear forwards exact reset scope to remote fence');
ok(clearSection.includes('pendingDownloadStore.clear()'), 'local-download reset semantics remain separate and unchanged in this tranche');

const importSection = section(
  worker,
  'async function commitStagedJournalImport',
  'async function previewStagedJournalImport'
);
ok(importSection.includes('reconcilePendingRemoteStoreForJournalReset(tx.objectStore(JOURNAL_PENDING_REMOTE_STORE)'), 'import replace routes remote checkpoints through reset fence');
ok(!importSection.includes('tx.objectStore(JOURNAL_PENDING_REMOTE_STORE).clear()'), 'import replace no longer blind-clears remote checkpoints');
ok(importSection.includes("scope: 'import-replace'"), 'import reset provenance is explicit');
ok(importSection.includes('tx.objectStore(JOURNAL_PENDING_DOWNLOAD_STORE).clear()'), 'local-download import semantics remain a separate P0-072 tranche');

const appendSection = section(
  worker,
  'async function appendJournalEntry({',
  'async function safeAppendJournalEntry'
);
ok(appendSection.includes('durableGet.result?.supersededByJournalReset === true'), 'Journal append rejects reset-superseded durable authority');
ok(appendSection.includes('durableCheckpointMissing = true'), 'superseded receipt follows fail-closed no-resurrection path');
ok(appendSection.indexOf('durableGet.result?.supersededByJournalReset === true') < appendSection.indexOf('checkPendingAppend();'), 'reset fence is checked before Journal mutation');

const recoverySection = section(
  worker,
  'async function recoverPendingRemoteSaves',
  'function normalizePendingLocalDownloadKey'
);
ok(recoverySection.includes('existingEntry && item?.supersededByJournalReset !== true'), 'same-id replacement cannot consume superseded old receipt');
ok(recoverySection.includes('await removePendingRemoteSave(id);\n        cancelled += 1;'), 'verified superseded recovery retires terminal receipt without resurrection');
ok(recoverySection.includes("current = await markPendingRemoteSaveVerified(id"), 'remote settlement is verified before terminal superseded receipt retirement');

const uploadSection = section(
  worker,
  'async function uploadCachedRecordToYandex',
  'async function downloadCachedPdf'
);
ok(uploadSection.includes('if (journalAppend?.cancelled)'), 'live finalizer handles reset-superseded Journal authority');
ok(uploadSection.includes('await removePendingRemoteSave(remoteCheckpoint.id).catch'), 'live verified outcome retires superseded checkpoint');
ok(uploadSection.indexOf('markPendingRemoteSaveVerified(remoteCheckpoint.id') < uploadSection.indexOf('if (journalAppend?.cancelled)'), 'live path verifies remote outcome before terminal superseded cleanup');

const retentionSource = functionSource(worker, 'pendingRemotePdfCacheRetentionIdentity');
ok(retentionSource.includes("phase === 'admitted-unknown'"), 'P0-079 retention still keys admitted-unknown phase');
ok(!retentionSource.includes('supersededByJournalReset'), 'Journal reset marker does not revoke P0-079 bytes before remote settlement');

const resetHelperSource = functionSource(worker, 'reconcilePendingRemoteStoreForJournalReset');
ok(resetHelperSource.includes("pendingRemoteResetDisposition(item) === 'preserve'"), 'reset helper distinguishes preserve versus drop');
ok(resetHelperSource.includes('cursor.update(markPendingRemoteSupersededByJournalReset'), 'preserved receipts are marked rather than silently retained as live Journal authority');
ok(resetHelperSource.includes('cursor.delete()'), 'terminal/pre-admission remote rows remain reset-eligible');
ok(!resetHelperSource.includes('operationId'), 'reset retention is not authorized by caller textual operationId');

console.log(
  'P0-072 remote-save reset fence: PASS; checks=' + checks +
  '; admitted_survives=true; same_id_replacement_safe=true; journal_resurrection=false;' +
  ' p0_079_retention_composed=true; local_download_pending=true; destructive_move_pending=true; release_closed=false'
);
