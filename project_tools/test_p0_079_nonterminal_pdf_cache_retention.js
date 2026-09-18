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

const exactIdentitySource = functionSource(worker, 'isExactSealedPdfCacheIdentity');
const normalizeSource = functionSource(worker, 'normalizePendingRemotePdfCacheReceipt');
const retentionIdentitySource = functionSource(worker, 'pendingRemotePdfCacheRetentionIdentity');
const matchesRetentionSource = functionSource(worker, 'pdfCacheGenerationMatchesRemoteRetention');

const ctx = vm.createContext({ String, Number, Boolean, Math, Object, Error });
vm.runInContext(
  exactIdentitySource + '\n' +
  normalizeSource + '\n' +
  retentionIdentitySource + '\n' +
  matchesRetentionSource + '\n' +
  'this.api = { isExactSealedPdfCacheIdentity, normalizePendingRemotePdfCacheReceipt, pendingRemotePdfCacheRetentionIdentity, pdfCacheGenerationMatchesRemoteRetention };',
  ctx
);
const api = ctx.api;

const receipt = api.normalizePendingRemotePdfCacheReceipt({
  pdfCacheKey: 'pdf:gen-A',
  pdfCacheGeneration: 'gen-A',
  expectedPdfBytes: 1234,
  operationId: 'caller-correlation'
});
eq(receipt.pdfCacheKey, 'pdf:gen-A', 'remote checkpoint receipt retains exact immutable cache key');
eq(receipt.pdfCacheGeneration, 'gen-A', 'remote checkpoint receipt retains exact generation');
eq(receipt.expectedPdfBytes, 1234, 'remote checkpoint receipt retains exact expected bytes');
eq(Object.prototype.hasOwnProperty.call(receipt, 'operationId'), false, 'textual operationId is not part of PDF-generation retention authority');
eq(api.normalizePendingRemotePdfCacheReceipt({
  pdfCacheKey: 'pdf:gen-B',
  pdfCacheGeneration: 'gen-A',
  expectedPdfBytes: 1234
}), null, 'key/generation mismatch fails closed');
eq(api.normalizePendingRemotePdfCacheReceipt({
  pdfCacheKey: 'pdf:gen-A',
  pdfCacheGeneration: 'gen-A',
  expectedPdfBytes: 0
}), null, 'missing byte receipt fails closed');

const admitted = {
  id: 'journal-A',
  phase: 'admitted-unknown',
  pdfCacheKey: 'pdf:gen-A',
  pdfCacheGeneration: 'gen-A',
  expectedPdfBytes: 1234,
  operationId: 'same-correlation'
};
const retained = api.pendingRemotePdfCacheRetentionIdentity(admitted);
eq(retained.exactIdentity, 'pdf:gen-A\u0000gen-A', 'admitted-unknown row owns exact cache retention identity');
eq(retained.legacyJournalEntryId, '', 'new exact receipt does not fall back to journal id');
eq(api.pendingRemotePdfCacheRetentionIdentity({ ...admitted, phase: 'prepared' }), null, 'new exact pre-admission checkpoint does not retain bytes indefinitely');
eq(api.pendingRemotePdfCacheRetentionIdentity({ ...admitted, phase: 'remote-verified' }), null, 'verified remote outcome no longer needs local-byte retention');
eq(api.pendingRemotePdfCacheRetentionIdentity({ ...admitted, phase: 'stale-unverified' }), null, 'manual-resolution stale row does not retain local bytes');

const legacyPrepared = api.pendingRemotePdfCacheRetentionIdentity({
  id: 'journal-legacy',
  phase: 'prepared',
  expectedPdfBytes: 1234
});
eq(legacyPrepared.legacyJournalEntryId, 'journal-legacy', 'pre-upgrade prepared checkpoint gets conservative journal-id fallback');
const legacyAdmitted = api.pendingRemotePdfCacheRetentionIdentity({
  id: 'journal-legacy-2',
  phase: 'admitted-unknown',
  expectedPdfBytes: 1234
});
eq(legacyAdmitted.legacyJournalEntryId, 'journal-legacy-2', 'malformed/legacy admitted checkpoint fails safe through journal-id fallback');

const cacheA = {
  key: 'pdf:gen-A',
  cacheGeneration: 'gen-A',
  sealed: true,
  journalEntryId: 'journal-A'
};
eq(api.pdfCacheGenerationMatchesRemoteRetention(cacheA, {
  exactIdentities: ['pdf:gen-A\u0000gen-A'],
  legacyJournalEntryIds: []
}), true, 'exact admitted receipt protects only the exact sealed generation');
eq(api.pdfCacheGenerationMatchesRemoteRetention({
  ...cacheA,
  key: 'pdf:gen-B',
  cacheGeneration: 'gen-B'
}, {
  exactIdentities: ['pdf:gen-A\u0000gen-A'],
  legacyJournalEntryIds: []
}), false, 'unrelated sealed generation is not protected by A');
eq(api.pdfCacheGenerationMatchesRemoteRetention({
  ...cacheA,
  sealed: false
}, {
  exactIdentities: ['pdf:gen-A\u0000gen-A'],
  legacyJournalEntryIds: []
}), false, 'unsealed/legacy byte object cannot claim exact-generation retention');
eq(api.pdfCacheGenerationMatchesRemoteRetention({
  ...cacheA,
  key: 'pdf:legacy-gen',
  cacheGeneration: 'legacy-gen',
  journalEntryId: 'journal-legacy'
}, {
  exactIdentities: [],
  legacyJournalEntryIds: ['journal-legacy']
}), true, 'upgrade fallback protects the matching sealed generation by immutable journal id');
eq(api.pdfCacheGenerationMatchesRemoteRetention({
  ...cacheA,
  key: 'pdf:other',
  cacheGeneration: 'other',
  journalEntryId: 'journal-other'
}, {
  exactIdentities: [],
  legacyJournalEntryIds: ['journal-legacy']
}), false, 'legacy fallback cannot retain unrelated journal generation');

const restarted = JSON.parse(JSON.stringify(admitted));
const restartRetention = api.pendingRemotePdfCacheRetentionIdentity(restarted);
eq(restartRetention.exactIdentity, retained.exactIdentity, 'worker restart preserves exact durable retention identity without worker memory');
eq(api.pdfCacheGenerationMatchesRemoteRetention(cacheA, {
  exactIdentities: [restartRetention.exactIdentity],
  legacyJournalEntryIds: []
}), true, 'restart snapshot still protects exact sealed bytes');

const checkpointSection = section(
  worker,
  'async function checkpointPendingRemoteSaveIntent',
  'async function markPendingRemoteSaveVerified'
);
ok(checkpointSection.includes("pdfCacheKey = ''"), 'remote checkpoint API accepts exact cache key');
ok(checkpointSection.includes("pdfCacheGeneration = ''"), 'remote checkpoint API accepts exact cache generation');
ok(checkpointSection.includes('normalizePendingRemotePdfCacheReceipt({ pdfCacheKey, pdfCacheGeneration, expectedPdfBytes })'), 'checkpoint normalizes one exact local-byte receipt');
ok(checkpointSection.includes('WEBCLIP_REMOTE_PDF_CACHE_RECEIPT_REQUIRED'), 'new remote checkpoint fails closed without exact local-byte receipt');
ok(checkpointSection.includes('...pdfCacheReceipt'), 'durable checkpoint persists exact local-byte receipt');
ok(checkpointSection.includes("phase: 'admitted-unknown'"), 'checkpoint is born admitted-unknown at the external-admission boundary');
ok(!checkpointSection.includes("phase: 'prepared'"), 'production checkpoint creation has no cross-DB prepared-to-admitted window');

const uploadSection = section(
  worker,
  'async function uploadCachedRecordToYandex',
  'async function downloadCachedPdf'
);
ok(uploadSection.includes("pdfCacheKey: String(cached.key || '')"), 'remote checkpoint receives exact P0-079 cache key');
ok(uploadSection.includes("pdfCacheGeneration: String(cached.cacheGeneration || '')"), 'remote checkpoint receives exact P0-079 generation');
const checkpointCreate = uploadSection.indexOf('remoteCheckpoint = await checkpointPendingRemoteSaveIntent({');
const signedTransfer = uploadSection.indexOf('uploadResponse = await runOffscreenSignedTransfer({');
ok(checkpointCreate >= 0 && checkpointCreate < signedTransfer, 'admitted-unknown checkpoint commits before signed PDF transfer starts');
ok(!uploadSection.includes('markPendingRemoteSaveAdmitted'), 'no second cross-DB admission transition can race TTL cleanup');
ok(uploadSection.includes('if (allowExisting)'), 'existing remote object lookup remains explicit before checkpoint creation');
ok(uploadSection.indexOf('await ensureRemoteCheckpoint();') < uploadSection.indexOf("let publicUrl = '';"), 'existing-file path also has durable admitted-unknown checkpoint before publication/final verification');

const retentionSnapshotSection = section(
  worker,
  'async function getPendingRemotePdfCacheRetentionSnapshot',
  'async function checkpointPendingRemoteSaveIntent'
);
ok(retentionSnapshotSection.includes('JOURNAL_PENDING_REMOTE_STORE'), 'cache retention authority is read from durable remote checkpoints');
ok(retentionSnapshotSection.includes('pendingRemotePdfCacheRetentionIdentity(cursor.value || {})'), 'retention scan uses bounded phase/receipt decision');
ok(!retentionSnapshotSection.includes('operationId'), 'retention scan never keys ownership by textual operationId');

const cleanupSection = section(
  worker,
  'async function cleanupExpiredPdfCache',
  'async function deleteCachedPdfByKey'
);
ok(cleanupSection.indexOf('await getPendingRemotePdfCacheRetentionSnapshot()') < cleanupSection.indexOf('await openPdfCacheDb()'), 'cleanup obtains durable retention snapshot before opening delete transaction');
ok(cleanupSection.includes('pdfCacheGenerationMatchesRemoteRetention(stale, retentionSnapshot)'), 'TTL cleanup checks exact durable generation ownership');
ok(cleanupSection.includes('Number(stale.createdAt || 0) < cutoff && !protectedByRemoteCheckpoint'), 'TTL deletes only expired and unprotected generations');
ok(!cleanupSection.includes('operationId'), 'PDF TTL cleanup never turns textual operationId into generation authority');

const verifiedSource = functionSource(worker, 'markPendingRemoteSaveVerified');
const failureSource = functionSource(worker, 'markPendingRemoteSaveFailure');
const staleSource = functionSource(worker, 'markPendingRemoteSaveStale');
ok(verifiedSource.includes("{ ...current, phase: 'remote-verified'"), 'verified transition preserves exact cache receipt fields');
ok(failureSource.includes('{ ...current, updatedAt:'), 'failure transition preserves exact cache receipt fields');
ok(staleSource.includes("{ ...current, phase: 'stale-unverified'"), 'stale/manual transition preserves provenance while releasing byte retention');

const maintenance = section(
  worker,
  'async function runLoggedOperationLogCleanup',
  'async function initializeOperationLogCleanup'
);
ok(maintenance.includes("runStage('pdf-cache-cleanup', cleanupExpiredPdfCache, 0)"), 'background maintenance still uses canonical PDF cleanup entrypoint');
ok(maintenance.includes("runStage('remote-checkpoint-cleanup', cleanupStalePendingRemoteSaves, 0)"), 'remote checkpoint archival remains a separate bounded owner');

console.log(
  'P0-079 nonterminal PDF cache retention: PASS; checks=' + checks +
  '; durable_exact_receipt=true; admitted_unknown=true; restart=true; legacy_upgrade_fallback=true;' +
  ' no_prepared_admission_window=true; operationId_capability=false; p0_072_reset_closure=false'
);
