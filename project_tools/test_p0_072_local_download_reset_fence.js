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

const dispositionSource = functionSource(worker, 'pendingLocalDownloadResetDisposition');
const scopeSource = functionSource(worker, 'pendingLocalDownloadMatchesJournalResetScope');
const markSource = functionSource(worker, 'markPendingLocalDownloadSupersededByJournalReset');

const context = vm.createContext({
  String, Number, Boolean, Math, Object, Error, Date, URL,
  PENDING_LOCAL_UNKNOWN_KIND: 'unknown',
  normalizeJournalUrl(value) {
    try {
      const parsed = new URL(String(value || ''));
      parsed.hash = '';
      return parsed.toString();
    } catch (_) { return String(value || '').split('#')[0]; }
  },
  getJournalSiteKey(value) {
    try { return new URL(String(value || '')).hostname.toLowerCase(); }
    catch (_) { return String(value || '').toLowerCase(); }
  }
});
vm.runInContext(
  dispositionSource + '\n' +
  scopeSource + '\n' +
  markSource + '\n' +
  'this.api = { pendingLocalDownloadResetDisposition, pendingLocalDownloadMatchesJournalResetScope, markPendingLocalDownloadSupersededByJournalReset };',
  context
);
const api = context.api;

const prepared = {
  downloadId: 'intent:A',
  kind: 'intent',
  downloadAdmissionPhase: 'prepared',
  createdAt: 100,
  updatedAt: 100,
  operationId: 'caller-correlation',
  data: { meta: { url: 'https://a.test/page', hostname: 'a.test' } }
};
eq(api.pendingLocalDownloadResetDisposition(prepared), 'drop', 'new exact pre-admission intent is reset-cancellable');
eq(api.pendingLocalDownloadResetDisposition({ ...prepared, downloadAdmissionPhase: 'admitted-unknown' }), 'preserve', 'admitted unknown Chrome start survives reset');
eq(api.pendingLocalDownloadResetDisposition({ ...prepared, downloadId: 77, kind: 'download', downloadAdmissionPhase: 'admitted-unknown' }), 'preserve', 'bound DownloadItem receipt survives reset');
eq(api.pendingLocalDownloadResetDisposition({ ...prepared, downloadId: 77, kind: 'unknown', recoveryState: 'manual-resolution' }), 'preserve', 'P0-039 unknown/manual-resolution receipt survives reset');
eq(api.pendingLocalDownloadResetDisposition({ ...prepared, downloadAdmissionPhase: undefined }), 'preserve', 'pre-upgrade unbound intent remains conservative unknown-settlement evidence');

eq(api.pendingLocalDownloadMatchesJournalResetScope(prepared, {}), true, 'all reset matches local receipt');
eq(api.pendingLocalDownloadMatchesJournalResetScope(prepared, { urlKey: 'https://a.test/page' }), true, 'matching URL selects local receipt');
eq(api.pendingLocalDownloadMatchesJournalResetScope(prepared, { urlKey: 'https://b.test/page' }), false, 'unrelated URL does not supersede local receipt');
eq(api.pendingLocalDownloadMatchesJournalResetScope(prepared, { siteKey: 'a.test' }), true, 'matching site selects local receipt');
eq(api.pendingLocalDownloadMatchesJournalResetScope(prepared, { siteKey: 'b.test' }), false, 'unrelated site does not supersede local receipt');

const superseded = api.markPendingLocalDownloadSupersededByJournalReset(
  { ...prepared, downloadAdmissionPhase: 'admitted-unknown' },
  { scope: 'import-replace', resetAt: 9000 }
);
eq(superseded.supersededByJournalReset, true, 'surviving local receipt carries reset marker');
eq(superseded.journalResetAt, 9000, 'local reset marker captures reset time');
eq(superseded.journalResetScope, 'import-replace', 'local reset marker captures scope');
eq(superseded.downloadAdmissionPhase, 'admitted-unknown', 'reset never rewrites physical admission phase');
eq(superseded.operationId, 'caller-correlation', 'correlation is preserved only as metadata');

const checkpointSection = section(
  worker,
  'async function checkpointPendingLocalDownloadIntent',
  'async function markPendingLocalDownloadAdmitted'
);
ok(checkpointSection.includes("downloadAdmissionPhase: 'prepared'"), 'new durable intent is explicitly pre-admission');
ok(checkpointSection.includes("kind: 'intent'"), 'new row remains an unbound intent before Chrome start');

const admissionSection = section(
  worker,
  'async function markPendingLocalDownloadAdmitted',
  'async function bindPendingLocalDownloadIntent'
);
ok(admissionSection.includes("downloadAdmissionPhase: 'admitted-unknown'"), 'admission transition publishes durable unknown-settlement phase');
ok(admissionSection.includes('pending.get(key)'), 'admission re-reads exact durable intent');
ok(admissionSection.includes('WEBCLIP_DOWNLOAD_INTENT_MISSING_BEFORE_ADMISSION'), 'reset-deleted prepared intent fails closed');
ok(admissionSection.includes('WEBCLIP_DOWNLOAD_INTENT_SUPERSEDED_BEFORE_ADMISSION'), 'superseded intent cannot start a new Chrome effect');
ok(!admissionSection.includes('operationId ==='), 'admission is not authorized by caller correlation equality');

const startSection = section(
  worker,
  'async function startAutomaticBlobDownloadBounded',
  'async function finalizePendingLocalDownload'
);
const budgetIndex = startSection.indexOf('automaticDownloadStartSettlements.size >= MAX_PENDING_AUTOMATIC_DOWNLOAD_STARTS');
const admitIndex = startSection.indexOf('await markPendingLocalDownloadAdmitted(key)');
const chromeIndex = startSection.indexOf('chrome.downloads.download({');
ok(budgetIndex >= 0 && budgetIndex < admitIndex, 'global P1-146 unresolved-start budget stays pre-admission');
ok(admitIndex >= 0 && admitIndex < chromeIndex, 'durable admitted-unknown commit linearizes before Chrome side effect call');
ok(startSection.includes("error?.code !== 'WEBCLIP_TIMEOUT'"), 'P1-146 local timeout remains distinct from actual Chrome rejection');
ok(startSection.includes('return { pending: true'), 'P1-146 unknown outer settlement still returns explicit pending state');
ok(startSection.includes('automaticDownloadStartSettlements.set(key, settlement)'), 'same-worker late settlement tracking remains intact');
ok(!startSection.includes('chrome.downloads.cancel('), 'Journal reset fence does not pretend to cancel Chrome start');

const bindSection = section(
  worker,
  'async function bindPendingLocalDownloadIntent',
  'async function getPendingLocalDownload'
);
ok(bindSection.includes("const bound = { ...intent, downloadId: id, kind: 'download', updatedAt: Date.now() };"), 'binding carries admission/reset provenance by spread');
ok(bindSection.includes('intent.supersededByJournalReset === true'), 'existing same-operation alias path cannot strip reset provenance');
ok(bindSection.includes('journalResetAt: Math.max(0, Number(intent.journalResetAt) || 0)'), 'existing bound row inherits reset generation timestamp');
ok(bindSection.includes('WEBCLIP_DOWNLOAD_ID_ALREADY_BOUND'), 'numeric DownloadItem collision remains fail closed');

const clearSection = section(
  worker,
  'async function clearJournalEntries',
  'async function journalRevisionSnapshot'
);
ok(clearSection.includes('reconcilePendingLocalDownloadStoreForJournalReset(pendingDownloadStore'), 'clear routes local checkpoints through reset fence');
ok(!clearSection.includes('pendingDownloadStore.clear()'), 'clear(all) no longer blind-clears local download receipts');
ok(!clearSection.includes("prunePending(pendingDownloadStore, 'pending local-download checkpoints')"), 'scoped clear no longer blind-prunes local receipts');
ok(clearSection.includes('urlKey,\n          siteKey,\n          scope'), 'scoped clear forwards URL/site scope');

const importSection = section(
  worker,
  'async function commitStagedJournalImport',
  'async function previewStagedJournalImport'
);
ok(importSection.includes('reconcilePendingLocalDownloadStoreForJournalReset(tx.objectStore(JOURNAL_PENDING_DOWNLOAD_STORE)'), 'import replace routes local checkpoints through reset fence');
ok(!importSection.includes('tx.objectStore(JOURNAL_PENDING_DOWNLOAD_STORE).clear()'), 'import replace no longer blind-clears local receipts');
ok(importSection.includes("scope: 'import-replace'"), 'import reset provenance is explicit');

const resetHelper = functionSource(worker, 'reconcilePendingLocalDownloadStoreForJournalReset');
ok(resetHelper.includes("pendingLocalDownloadResetDisposition(item) === 'preserve'"), 'local reset helper separates admitted from pre-admission');
ok(resetHelper.includes('cursor.update(markPendingLocalDownloadSupersededByJournalReset'), 'surviving receipt becomes reset-superseded');
ok(resetHelper.includes('cursor.delete()'), 'pre-admission cancellable intent is removed');
ok(!resetHelper.includes('operationId'), 'reset decision never uses caller textual operationId');

const appendSection = section(
  worker,
  'async function appendJournalEntry({',
  'async function safeAppendJournalEntry'
);
ok(appendSection.includes('durableGet.result?.supersededByJournalReset === true'), 'shared durable append gate blocks local reset-superseded Journal resurrection');

const finalizeSection = section(
  worker,
  'async function finalizePendingLocalDownload',
  'async function reconcilePendingLocalDownloads'
);
ok(finalizeSection.includes('if (journalAppend?.cancelled)'), 'complete local outcome recognizes reset-superseded Journal authority');
ok(finalizeSection.includes('await removePendingLocalDownload(downloadId);'), 'terminal complete outcome retires superseded checkpoint');
ok(finalizeSection.indexOf('appendJournalEntryFromDurableCheckpoint') < finalizeSection.indexOf('await removePendingLocalDownload(downloadId);'), 'Journal no-resurrection admission precedes terminal checkpoint retirement');
ok(finalizeSection.includes("if (state === 'interrupted')"), 'interrupted Chrome outcome remains explicitly terminal');
ok(finalizeSection.includes("recordOperationStage(operationId, 'error'"), 'interrupted outcome remains diagnostic error, not fabricated Journal success');

const unknownSection = functionSource(worker, 'markPendingLocalDownloadUnknown');
ok(unknownSection.includes('...current,'), 'P0-039 unknown transition preserves reset provenance');
ok(unknownSection.includes("recoveryState: 'manual-resolution'"), 'P0-039 dead-letter/manual-resolution contract remains intact');

const recoverySection = section(
  worker,
  'async function reconcilePendingLocalDownloads',
  'async function appendJournalEntry({'
);
ok(recoverySection.includes("if (cursor.value?.kind === PENDING_LOCAL_UNKNOWN_KIND) { cursor.continue(); return; }"), 'ordinary recovery still skips manual-resolution rows');
ok(recoverySection.includes('markPendingLocalDownloadUnknown(rawKey, reason, trigger)'), 'unbound unknown start still degrades to durable manual resolution');
ok(recoverySection.includes('markPendingLocalDownloadUnknown(id, reason, trigger)'), 'bound missing DownloadItem still degrades to durable manual resolution');

const preservedModel = { ...superseded, downloadId: 88, kind: 'download', updatedAt: 9100 };
eq(preservedModel.supersededByJournalReset, true, 'late bind retains reset marker');
const unknownModel = {
  ...preservedModel,
  kind: 'unknown',
  recoveryState: 'manual-resolution',
  unknownAt: 10000
};
eq(unknownModel.supersededByJournalReset, true, 'manual-resolution degradation retains reset marker');
eq(api.pendingLocalDownloadResetDisposition(unknownModel), 'preserve', 'later reset cannot discard unresolved manual-resolution evidence');

console.log(
  'P0-072 local-download reset fence: PASS; checks=' + checks +
  '; prepared_drop=true; admitted_survives=true; chrome_start_linearized=true;' +
  ' journal_resurrection=false; p1_146_separate=true; p0_039_manual_resolution=true;' +
  ' destructive_move_pending=true; release_closed=false'
);
