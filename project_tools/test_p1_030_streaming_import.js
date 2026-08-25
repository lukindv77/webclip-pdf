const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const parserSource = fs.readFileSync(path.join(root, 'journal-import-stream.js'), 'utf8');
vm.runInThisContext(parserSource, { filename: 'journal-import-stream.js' });

async function* chunkText(text, size) {
  for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size);
}

(async () => {
  const data = {
    schema: 'webclip-journal',
    schemaVersion: 1,
    backupKind: 'full-journal',
    exportedAt: '2026-08-24T12:00:00.000Z',
    extension: { name: 'WebClip', version: '0.9.8' },
    journal: {
      entries: [
        { id: 'a', title: 'Первая 😀', url: 'https://example.com/a', nested: { a: [1, true, null, 'x'] } },
        { id: 'b', title: 'Вторая', url: 'https://example.com/b', comments: [{ text: 'ok' }] },
        { id: 'c', title: 'Третья', url: 'https://example.com/c' }
      ],
      entryCount: 3
    }
  };
  const text = JSON.stringify(data);

  const preview = await globalThis.WebClipJournalImportStream.process(chunkText(text, 7), {
    expectedSchema: 'webclip-journal', expectedVersion: 1, maxTotalChars: 1024 * 1024, maxEntryChars: 64 * 1024
  });
  assert.strictEqual(preview.entryCount, 3);
  assert.strictEqual(preview.exportedAt, data.exportedAt);

  const received = [];
  const parsed = await globalThis.WebClipJournalImportStream.process(chunkText(text, 5), {
    expectedSchema: 'webclip-journal', expectedVersion: 1, maxTotalChars: 1024 * 1024, maxEntryChars: 64 * 1024,
    onEntry: async (entry, index, info) => {
      received.push({ entry, index, sourceChars: info.sourceChars });
      await Promise.resolve();
    }
  });
  assert.strictEqual(parsed.entryCount, 3);
  assert.deepStrictEqual(received.map((x) => x.entry.id), ['a', 'b', 'c']);
  assert.strictEqual(received[0].entry.title, 'Первая 😀');
  assert(received.every((x) => x.sourceChars > 0));

  const mismatch = JSON.stringify({ ...data, journal: { ...data.journal, entryCount: 99 } });
  const mismatchPreview = await globalThis.WebClipJournalImportStream.process(chunkText(mismatch, 11), { expectedSchema: 'webclip-journal', expectedVersion: 1 });
  assert.strictEqual(mismatchPreview.entryCount, 3, 'actual streamed entries remain the source of truth for legacy backups');

  const oversized = JSON.stringify({
    schema: 'webclip-journal', schemaVersion: 1,
    journal: { entries: [{ id: 'x', title: 'z'.repeat(5000) }], entryCount: 1 }
  });
  await assert.rejects(
    () => globalThis.WebClipJournalImportStream.process(chunkText(oversized, 31), {
      expectedSchema: 'webclip-journal', expectedVersion: 1, maxEntryChars: 1024, maxStringChars: 10 * 1024
    }),
    (error) => error && error.code === 'JOURNAL_IMPORT_ENTRY_TOO_LARGE'
  );

  const duplicateCritical = '{"schema":"webclip-journal","schema":"webclip-journal","schemaVersion":1,"journal":{"entries":[]}}';
  await assert.rejects(
    () => globalThis.WebClipJournalImportStream.process(chunkText(duplicateCritical, 9), { expectedSchema: 'webclip-journal', expectedVersion: 1 }),
    /Дублирующее поле schema/
  );

  const serviceWorkerSource = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
  const journalSource = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');
  const offscreenSource = fs.readFileSync(path.join(root, 'offscreen.js'), 'utf8');
  assert(!/let\s+text\s*=\s*await\s+file\.text\s*\(/.test(journalSource), 'local import must not call File.text()');
  assert(serviceWorkerSource.includes("JOURNAL_IMPORT_STAGING_STORE = 'importStaging'"));
  assert(serviceWorkerSource.includes('WebClipJournalImportStream.process'));
  assert(serviceWorkerSource.includes("error.code = 'JOURNAL_INLINE_IMPORT_DISABLED'"));
  assert(!serviceWorkerSource.includes('const parsed = parseJournalExportText(text)'));
  assert(offscreenSource.includes('stageResponseBodyAsJournalImport'));
  assert(!/mode === 'text-download'[\s\S]{0,500}readResponseTextBounded\(response/.test(offscreenSource), 'Yandex journal download must not materialize response text');
  assert.strictEqual((serviceWorkerSource.match(/const JOURNAL_DB_VERSION = 7;/g) || []).length, 1);
  assert.strictEqual((journalSource.match(/const JOURNAL_DB_VERSION = 7;/g) || []).length, 1);

  console.log('PASS P1-030 streaming import parser/staging regression');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
