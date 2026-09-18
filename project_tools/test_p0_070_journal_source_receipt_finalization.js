'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
let checks = 0;
function ok(value, message) { checks += 1; assert(value, message); }
function eq(actual, expected, message) { checks += 1; assert.strictEqual(actual, expected, message); }
function section(start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error(`section not found: ${start} -> ${end}`);
  return source.slice(a, b);
}

const helperSource = section('function sanitizePdfSourceReceipt', 'async function generatePdfAndDownload');
const ctx = vm.createContext({
  URL,
  Error,
  Number,
  Math,
  MAX_OPERATION_ID_CHARS: 240,
  MAX_IMPORTED_URL_CHARS: 16 * 1024
});
vm.runInContext(`${helperSource}
this.sanitize = sanitizePdfSourceReceipt;`, ctx);

const raw = {
  operationId: 'op-journal-1',
  tabId: 23,
  sourceDocumentId: 'doc-source-23',
  sourceDocumentLifecycle: 'active',
  applicationGeneration: { generation: 7, href: 'https://example.test/article' },
  selectionRevision: 11,
  selectedCount: 4,
  confirmedSelectionRevision: 11,
  capturedAt: 987654
};
const normalized = ctx.sanitize(raw, { operationId: 'op-journal-1' });
eq(normalized.schema, 'webclip-pdf-source-receipt/v1', 'receipt schema retained');
eq(normalized.operationId, 'op-journal-1', 'receipt remains operation-bound');
eq(normalized.sourceDocumentId, 'doc-source-23', 'browser document identity retained');
eq(normalized.applicationGeneration.generation, 7, 'application generation retained separately');
eq(normalized.selectionRevision, 11, 'selection revision retained');
eq(normalized.selectedCount, 4, 'selection count retained');

const appendSection = section('async function appendJournalEntry(', 'async function listJournalEntries');
ok(appendSection.includes("sourceReceipt = null"), 'Journal append accepts optional source receipt');
ok(appendSection.includes("const journalSourceReceipt = sanitizePdfSourceReceipt(sourceReceipt"), 'Journal append normalizes source receipt');
ok(appendSection.includes("operationId: String(operationId || '').slice(0, MAX_OPERATION_ID_CHARS)"), 'Journal source receipt is bound to final operation id');
ok(appendSection.includes("...(journalSourceReceipt ? { sourceReceipt: journalSourceReceipt } : {})"), 'Journal entry stores source receipt only when valid');
ok(!appendSection.includes("sourceReceipt: null"), 'legacy Journal entries are not polluted with null receipt fields');

const checkpointSection = section('function normalizePendingJournalAppendData', 'async function checkpointPendingJournalAppend');
ok(checkpointSection.includes("sourceReceipt: sanitizePdfSourceReceipt(data.sourceReceipt)"), 'durable checkpoint normalization retains source receipt');

const importSection = section('function normalizeImportedJournalEntry', 'function makeJournalImportStageId');
ok(importSection.includes("const importedSourceReceipt = importedOperationId"), 'import receipt requires a valid imported operation identity');
ok(importSection.includes("sanitizePdfSourceReceipt(raw.sourceReceipt, { operationId: importedOperationId })"), 'import revalidates bounded receipt and operation binding');
ok(importSection.includes("...(importedSourceReceipt ? { sourceReceipt: importedSourceReceipt } : {})"), 'valid imported receipt survives canonical projection');
ok(!importSection.includes("required: true"), 'legacy imports without source receipt remain accepted');

const exportSection = section('async function readJournalEntryBatch', 'function safeTextChunkEnd');
ok(exportSection.includes("JSON.stringify({ ...entry, journalComments: normalizeJournalComments(entry) })"), 'file export serializes additive source receipt automatically');

const restoreGuard = fs.readFileSync(path.join(ROOT, 'journal-restore-envelope-guard.js'), 'utf8');
ok(restoreGuard.includes("JSON.stringify({ ...entry, journalComments: globalThis.normalizeJournalComments(entry) })"), 'guarded backup export also preserves additive receipt');
ok(!restoreGuard.includes('sourceReceipt'), 'restore envelope needs no receipt-specific schema widening');

const stream = fs.readFileSync(path.join(ROOT, 'journal-import-stream.js'), 'utf8');
ok(stream.includes('const rawEntry = await parseValue'), 'stream parser forwards full entry object to canonical normalizer');
ok(!stream.includes('sourceReceipt'), 'stream envelope remains field-agnostic and version-stable');

const viewSummary = section('function journalViewSummary', 'function emptyJournalViewCounts');
ok(!viewSummary.includes('sourceReceipt'), 'Journal grouping/filter summary does not expose provenance as a UI authority');

eq(ctx.sanitize(raw, { operationId: 'different-op' }), null, 'mismatched operation receipt is discarded on lenient import/finalization');
eq(ctx.sanitize(null), null, 'legacy missing receipt remains absent');

console.log(`P0-070 Journal source receipt finalization: PASS; checks=${checks}; additive=true; backup_version_unchanged=true; legacy_compatible=true`);
