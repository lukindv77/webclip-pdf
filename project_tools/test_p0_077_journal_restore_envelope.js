const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sharedPath = path.join(root, 'journal-text-filter.js');
const guardPath = path.join(root, 'journal-restore-envelope-guard.js');
const sharedSource = fs.readFileSync(sharedPath, 'utf8');
const guardSource = fs.readFileSync(guardPath, 'utf8');

const context = vm.createContext({
  console,
  URL,
  setTimeout,
  clearTimeout,
  Promise,
  Error,
  Object,
  Array,
  String,
  Number,
  Math,
  Date,
  JSON,
  globalThis: null,
  document: undefined,
  __stageReceipt: null,
  __deletedStagingKeys: [],
  __importOptions: null
});
context.globalThis = context;
context.importScripts = (...names) => {
  for (const name of names) {
    if (name === 'journal-restore-envelope-guard.js') {
      vm.runInContext(guardSource, context, { filename: name });
    }
  }
};

const outer = `
function readJournalEntryBatch() { return 'legacy-reader'; }
async function stageFullJournalExport() { return globalThis.__stageReceipt; }
function openJournalDb() { throw new Error('not used by pure boundary cases'); }
function normalizeJournalComments(entry) { return entry.journalComments || []; }
async function deleteTransferPayloadGroup(key) { globalThis.__deletedStagingKeys.push(String(key)); }
globalThis.WebClipJournalImportStream = Object.freeze({
  async process(chunks, options) { globalThis.__importOptions = options; return { entryCount: 0 }; }
});
importScripts('journal-text-filter.js');
`;

// Simulate the classic-worker bootstrap order: outer service-worker function
// declarations are instantiated before the top-level importScripts call.
context.importScripts = (...names) => {
  for (const name of names) {
    if (name === 'journal-text-filter.js') {
      vm.runInContext(sharedSource, context, { filename: name });
    } else if (name === 'journal-restore-envelope-guard.js') {
      vm.runInContext(guardSource, context, { filename: name });
    }
  }
};
vm.runInContext(outer, context, { filename: 'service-worker-bootstrap-fixture.js' });

const normalizedFilter = context.WebClipJournalTextFilter.normalize({ rows: [{ text: 'Пример', fields: { title: true } }] });
assert.strictEqual(context.WebClipJournalTextFilter.matches({ title: 'Это пример записи' }, normalizedFilter), true);
assert.strictEqual(context.WebClipJournalTextFilter.matches({ title: 'Другая запись' }, normalizedFilter), false);

const envelope = context.WebClipJournalRestoreEnvelope;
assert(envelope, 'shared restore envelope must be installed');
assert.strictEqual(envelope.VERSION, 1);
assert.strictEqual(envelope.MAX_BYTES, 50 * 1024 * 1024);
assert.strictEqual(envelope.MAX_TOTAL_CHARS, 50 * 1024 * 1024);
assert.strictEqual(envelope.MAX_ENTRIES, 100000);
assert.strictEqual(envelope.MAX_ENTRY_CHARS, 8 * 1024 * 1024);

// Historical per-entry mismatch: >4 MiB must remain exportable when it is
// still inside the same-version 8 MiB import envelope.
assert.doesNotThrow(() => envelope.assertEntryChars(4 * 1024 * 1024 + 1));
assert.doesNotThrow(() => envelope.assertEntryChars(8 * 1024 * 1024));
assert.throws(
  () => envelope.assertEntryChars(8 * 1024 * 1024 + 1),
  (error) => error && error.code === 'JOURNAL_RESTORE_ENTRY_TOO_LARGE'
);

// High-Unicode mismatch is represented by the encoded receipt: legal char
// count cannot make a >50 MiB UTF-8 backup a successful self-generated backup.
assert.doesNotThrow(() => envelope.assertExportReceipt({
  totalBytes: 50 * 1024 * 1024,
  totalChars: 30 * 1024 * 1024,
  entryCount: 1
}));
assert.throws(
  () => envelope.assertExportReceipt({ totalBytes: 50 * 1024 * 1024 + 1, totalChars: 30 * 1024 * 1024, entryCount: 1 }),
  (error) => error && error.code === 'JOURNAL_EXPORT_RESTORE_BYTES_LIMIT'
);
assert.doesNotThrow(() => envelope.assertExportReceipt({ totalBytes: 1024, totalChars: 1024, entryCount: 100000 }));
assert.throws(
  () => envelope.assertExportReceipt({ totalBytes: 1024, totalChars: 1024, entryCount: 100001 }),
  (error) => error && error.code === 'JOURNAL_EXPORT_RESTORE_ENTRY_COUNT_LIMIT'
);

const widened = envelope.clampImportOptions({
  maxTotalChars: 80 * 1024 * 1024,
  maxEntryChars: 16 * 1024 * 1024,
  maxEntries: 200000,
  maxDepth: 32
});
assert.strictEqual(widened.maxTotalChars, envelope.MAX_TOTAL_CHARS);
assert.strictEqual(widened.maxEntryChars, envelope.MAX_ENTRY_CHARS);
assert.strictEqual(widened.maxEntries, envelope.MAX_ENTRIES);
assert.strictEqual(widened.maxDepth, 32);

(async () => {
  await context.WebClipJournalImportStream.process(null, {
    maxTotalChars: 80 * 1024 * 1024,
    maxEntryChars: 16 * 1024 * 1024,
    maxEntries: 200000
  });
  assert.strictEqual(context.__importOptions.maxTotalChars, envelope.MAX_TOTAL_CHARS);
  assert.strictEqual(context.__importOptions.maxEntryChars, envelope.MAX_ENTRY_CHARS);
  assert.strictEqual(context.__importOptions.maxEntries, envelope.MAX_ENTRIES);

  context.__stageReceipt = {
    stagingKey: 'ok-stage',
    totalBytes: envelope.MAX_BYTES,
    totalChars: envelope.MAX_TOTAL_CHARS,
    entryCount: envelope.MAX_ENTRIES
  };
  const ok = await context.stageFullJournalExport();
  assert.strictEqual(ok.stagingKey, 'ok-stage');
  assert.deepStrictEqual(context.__deletedStagingKeys, []);

  context.__stageReceipt = {
    stagingKey: 'unicode-overflow',
    totalBytes: envelope.MAX_BYTES + 1,
    totalChars: 30 * 1024 * 1024,
    entryCount: 1
  };
  await assert.rejects(
    () => context.stageFullJournalExport(),
    (error) => error && error.code === 'JOURNAL_EXPORT_RESTORE_BYTES_LIMIT'
  );
  assert(context.__deletedStagingKeys.includes('unicode-overflow'));

  context.__stageReceipt = {
    stagingKey: 'count-overflow',
    totalBytes: 1024,
    totalChars: 1024,
    entryCount: envelope.MAX_ENTRIES + 1
  };
  await assert.rejects(
    () => context.stageFullJournalExport(),
    (error) => error && error.code === 'JOURNAL_EXPORT_RESTORE_ENTRY_COUNT_LIMIT'
  );
  assert(context.__deletedStagingKeys.includes('count-overflow'));

  assert(context.WebClipJournalRestoreEnvelopeGuard, 'worker guard must install during synchronous bootstrap');
  assert(/journal-restore-envelope-guard\.js/.test(sharedSource), 'worker bootstrap must load P0-077 guard');
  assert(/envelope\.MAX_ENTRY_CHARS/.test(guardSource), 'guarded batch reader must use shared per-entry envelope');
  assert(!/JOURNAL_EXPORT_BATCH_MEMORY_CHARS/.test(guardSource), 'guard must not retain legacy 4 MiB batch ceiling');

  // Lock the unchanged same-version restore boundaries to the shared envelope
  // so future literal drift fails Repository Integrity.
  const workerPath = path.join(root, 'service-worker.js');
  if (fs.existsSync(workerPath)) {
    const worker = fs.readFileSync(workerPath, 'utf8');
    assert(/const MAX_JOURNAL_IMPORT_BYTES = 50 \* 1024 \* 1024;/.test(worker));
    assert(/const MAX_JOURNAL_IMPORT_ENTRY_CHARS = 8 \* 1024 \* 1024;/.test(worker));
    assert.strictEqual((worker.match(/maxEntries: 100000/g) || []).length, 2);
    assert(/importScripts\('public-suffix\.js', 'journal-import-stream\.js', 'journal-text-filter\.js'/.test(worker));
  }
  const journalPath = path.join(root, 'journal.js');
  if (fs.existsSync(journalPath)) {
    const journal = fs.readFileSync(journalPath, 'utf8');
    assert(/const MAX_JOURNAL_IMPORT_BYTES = 50 \* 1024 \* 1024;/.test(journal));
    assert(/if \(totalBytes > MAX_JOURNAL_IMPORT_BYTES\)/.test(journal));
  }

  console.log('P0-077 journal restore-envelope deterministic regression PASS');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
