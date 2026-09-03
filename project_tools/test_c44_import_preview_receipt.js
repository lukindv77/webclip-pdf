const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const journal = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');
const digestSource = fs.readFileSync(path.join(root, 'journal-import-digest.js'), 'utf8');

function sourceSlice(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert(start >= 0, `missing source marker: ${startMarker}`);
  assert(end > start, `missing source marker: ${endMarker}`);
  return source.slice(start, end);
}

const digestContext = {
  Array,
  ArrayBuffer,
  Error,
  Math,
  Number,
  Object,
  RangeError,
  String,
  TypeError,
  Uint8Array,
  Uint32Array
};
digestContext.globalThis = digestContext;
vm.runInNewContext(digestSource, digestContext, { filename: 'journal-import-digest.js' });
const digestApi = digestContext.WebClipSha256;
assert(digestApi && typeof digestApi.create === 'function');

const vectors = [
  ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
  ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
  ['The quick brown fox jumps over the lazy dog', 'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592']
];
for (const [value, expected] of vectors) {
  const bytes = new TextEncoder().encode(value);
  assert.equal(digestApi.create().update(bytes).digestHex(), expected);
}

const boundedFixture = Buffer.alloc(5 * 1024 * 1024 + 37);
for (let index = 0; index < boundedFixture.length; index += 1) boundedFixture[index] = (index * 29 + 17) & 0xff;
const incremental = digestApi.create();
for (let offset = 0; offset < boundedFixture.length;) {
  const end = Math.min(boundedFixture.length, offset + 1 + ((offset * 13 + 97) % 65521));
  incremental.update(new Uint8Array(boundedFixture.buffer, boundedFixture.byteOffset + offset, end - offset));
  offset = end;
}
assert.equal(
  incremental.digestHex(),
  crypto.createHash('sha256').update(boundedFixture).digest('hex'),
  'incremental digest must equal Node SHA-256 across irregular chunk boundaries'
);
assert.throws(() => incremental.update(new Uint8Array([1])), /already finalized/);

const receiptSource = sourceSlice(
  worker,
  'function journalImportPreviewMismatch',
  'async function inspectStagedJournalImportStream'
);
const receiptContext = {
  Error,
  Math,
  Number,
  Object,
  String,
  JOURNAL_IMPORT_PREVIEW_RECEIPT_VERSION: 1,
  MAX_IMPORTED_DATETIME_CHARS: 128
};
receiptContext.globalThis = receiptContext;
vm.createContext(receiptContext);
vm.runInContext(receiptSource, receiptContext, { filename: 'receipt-contract.js' });
vm.runInContext(
  'globalThis.__normalizeReceipt = normalizeJournalImportPreviewReceipt;'
    + 'globalThis.__createReceipt = createJournalImportPreviewReceipt;'
    + 'globalThis.__assertPrepared = assertPreparedJournalImportMatchesPreview;',
  receiptContext
);

const valid = {
  version: 1,
  mode: 'replace',
  stagingKey: 'journal-import-generation-a',
  stagingGeneration: 'manifest:1777777777000:2:4096',
  source: 'file',
  operationId: 'operation-a',
  contentSha256: 'a'.repeat(64),
  entryCount: 2,
  exportedAt: '2026-09-03T12:00:00.000Z',
  expectedJournalRevision: '1777777777000-revision-a'
};
const normalized = receiptContext.__normalizeReceipt(valid, {
  stagingKey: valid.stagingKey,
  source: 'file',
  operationId: valid.operationId
});
assert.deepEqual(JSON.parse(JSON.stringify(normalized)), valid);
assert.equal(Object.isFrozen(normalized), true);

const mismatch = (patch) => {
  const changed = { ...valid, ...patch };
  assert.throws(
    () => receiptContext.__normalizeReceipt(changed, {
      stagingKey: valid.stagingKey,
      source: valid.source,
      operationId: valid.operationId
    }),
    error => error?.code === 'JOURNAL_IMPORT_PREVIEW_MISMATCH'
  );
};
mismatch({ version: 2 });
mismatch({ mode: 'merge' });
mismatch({ stagingKey: 'journal-import-generation-b' });
mismatch({ source: 'yandex' });
mismatch({ operationId: 'operation-b' });
mismatch({ stagingGeneration: 'not-a-generation' });
mismatch({ contentSha256: 'not-a-sha256' });
mismatch({ entryCount: 100001 });
mismatch({ exportedAt: 'x'.repeat(129) });
assert.throws(
  () => receiptContext.__normalizeReceipt({ ...valid, unexpected: true }),
  error => error?.code === 'JOURNAL_IMPORT_PREVIEW_MISMATCH'
);
receiptContext.__assertPrepared({
  stagingGeneration: valid.stagingGeneration,
  contentSha256: valid.contentSha256,
  entryCount: valid.entryCount,
  exportedAt: valid.exportedAt
}, valid);
for (const patch of [
  { stagingGeneration: 'manifest:1777777777001:2:4096' },
  { contentSha256: 'b'.repeat(64) },
  { entryCount: 3 },
  { exportedAt: '2026-09-04T12:00:00.000Z' }
]) {
  assert.throws(
    () => receiptContext.__assertPrepared({
      stagingGeneration: valid.stagingGeneration,
      contentSha256: valid.contentSha256,
      entryCount: valid.entryCount,
      exportedAt: valid.exportedAt,
      ...patch
    }, valid),
    error => error?.code === 'JOURNAL_IMPORT_PREVIEW_MISMATCH'
  );
}

assert(worker.startsWith("importScripts('public-suffix.js', 'journal-import-stream.js', 'journal-import-digest.js'"));
const stream = sourceSlice(worker, 'async function* streamStagedJournalImportText', 'async function deleteTransferPayload');
assert(stream.includes('onManifest'));
assert(stream.includes('onBytes'));
assert(stream.includes('new Uint8Array(bytes)'));
assert(stream.includes('encoder.encode(text)'));

const preview = sourceSlice(worker, 'async function previewStagedJournalImport', 'async function importJournalReplaceStaged');
assert(preview.includes('contentSha256'));
assert(preview.includes('expectedJournalRevision'));
assert(preview.includes('createJournalImportPreviewReceipt'));

const replace = sourceSlice(worker, 'async function importJournalReplaceStaged', 'function journalExportDownloadFilename');
assert(replace.includes('normalizeJournalImportPreviewReceipt(previewReceiptValue'));
assert(replace.includes('assertPreparedJournalImportMatchesPreview(prepared, previewReceipt)'));
assert(replace.includes('previewReceipt.expectedJournalRevision'));

const commit = sourceSlice(worker, 'async function commitStagedJournalImport', 'async function previewStagedJournalImport');
const revisionRead = commit.indexOf('metaStore.get(JOURNAL_META_REVISION_KEY)');
const pendingClear = commit.indexOf('tx.objectStore(JOURNAL_PENDING_STORE).clear();');
const journalClear = commit.indexOf('journalStore.clear()');
const revisionCompare = commit.indexOf('currentRevision !== expectedRevision');
const guardedReplace = commit.indexOf('beginReplace();', revisionCompare);
assert(revisionRead >= 0);
assert(pendingClear >= 0);
assert(journalClear >= 0);
assert(revisionCompare > revisionRead, 'revision must be compared in the transaction callback');
assert(guardedReplace > revisionCompare, 'destructive replacement must start only after the revision comparison');
assert(commit.includes('completeJournalStatsMutation(statsToken).catch(() => {})'));

const uiLocal = sourceSlice(journal, 'async function importJournalFromSelectedFile', 'async function exportJournalToYandex');
assert(uiLocal.includes('SHA-256 проверенной копии: ${preview.contentSha256}.'));
assert(uiLocal.includes("source: 'file',\n      previewReceipt"));
const uiYandex = sourceSlice(journal, 'async function importSelectedYandexBackup', 'const READ_ONLY_RUNTIME_MAX_IN_FLIGHT');
assert(uiYandex.includes('SHA-256 проверенной копии: ${fetched.contentSha256}.'));
assert(uiYandex.includes("source: 'yandex',\n      previewReceipt"));

console.log('C44 preview receipt, incremental digest and revision-CAS regression: PASS');
