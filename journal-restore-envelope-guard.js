(() => {
  'use strict';

  const INSTALL_MARKER = '__webclipJournalRestoreEnvelopeGuardV1';
  const envelope = globalThis.WebClipJournalRestoreEnvelope;
  if (!envelope || envelope.VERSION !== 1) {
    throw new Error('P0-077: Journal restore envelope is unavailable during worker bootstrap.');
  }

  function install() {
    if (globalThis[INSTALL_MARKER]) return { installed: true, alreadyInstalled: true };

    const originalReadBatch = globalThis.readJournalEntryBatch;
    const originalStageExport = globalThis.stageFullJournalExport;
    const originalImportStream = globalThis.WebClipJournalImportStream;
    if (typeof originalReadBatch !== 'function' || typeof originalStageExport !== 'function') {
      throw new Error('P0-077: Journal export bindings unavailable during worker bootstrap.');
    }
    if (!originalImportStream || typeof originalImportStream.process !== 'function') {
      throw new Error('P0-077: Journal import stream unavailable during worker bootstrap.');
    }

    // Import parsing is always capped by the same versioned envelope, even if
    // a future caller accidentally supplies a wider option.
    const originalProcess = originalImportStream.process.bind(originalImportStream);
    globalThis.WebClipJournalImportStream = Object.freeze({
      ...originalImportStream,
      process(chunks, options = {}) {
        return originalProcess(chunks, envelope.clampImportOptions(options));
      }
    });

    // Replace only the export batch reader. The old 4 MiB batch ceiling was
    // narrower than the 8 MiB per-entry import envelope, so a valid restored
    // entry could make the next self-backup impossible. Keep serialized strings
    // and cursor/deadline semantics, but permit one entry up to MAX_ENTRY_CHARS.
    globalThis.readJournalEntryBatch = async function guardedReadJournalEntryBatch(afterId = '', limit = 250, deadline = 0) {
      const batchTimeoutMs = 20_000;
      const absoluteDeadline = deadline > 0 ? Number(deadline) : Date.now() + batchTimeoutMs;
      const remaining = () => {
        const value = absoluteDeadline - Date.now();
        if (value <= 0) {
          const timeout = new Error('Чтение пакета журнала для экспорта превысило общий deadline.');
          timeout.code = 'JOURNAL_EXPORT_TIMEOUT';
          throw timeout;
        }
        return Math.max(1, Math.min(batchTimeoutMs, value));
      };
      const db = await globalThis.openJournalDb(remaining());
      try {
        return await new Promise((resolve, reject) => {
          const items = [];
          let serializedChars = 0;
          let lastId = '';
          let pendingResult = null;
          let explicitError = null;
          const tx = db.transaction('entries', 'readonly');
          const store = tx.objectStore('entries');
          const range = afterId ? IDBKeyRange.lowerBound(afterId, true) : null;
          const request = store.openCursor(range, 'next');
          let settled = false;
          const timeoutMs = remaining();
          const finish = (fn, value) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            fn(value);
          };
          const abortWith = (error) => {
            explicitError = error instanceof Error ? error : new Error(String(error || 'Ошибка пакетного чтения журнала.'));
            try { tx.abort(); } catch (_) { finish(reject, explicitError); }
          };
          const timer = setTimeout(() => {
            const timeout = new Error('Чтение пакета журнала для экспорта превысило допустимое время.');
            timeout.code = 'JOURNAL_EXPORT_TIMEOUT';
            abortWith(timeout);
          }, timeoutMs);
          request.onsuccess = () => {
            const cursor = request.result;
            if (!cursor || items.length >= limit) {
              pendingResult = { items, lastId, done: !cursor, serializedChars };
              return;
            }
            let json;
            try {
              const entry = cursor.value || {};
              json = JSON.stringify({ ...entry, journalComments: globalThis.normalizeJournalComments(entry) });
              envelope.assertEntryChars(json.length);
            } catch (error) {
              abortWith(error);
              return;
            }
            if (items.length && serializedChars + json.length > envelope.MAX_ENTRY_CHARS) {
              pendingResult = { items, lastId, done: false, serializedChars };
              return;
            }
            items.push(json);
            serializedChars += json.length;
            lastId = String(cursor.primaryKey || cursor.key || '');
            cursor.continue();
          };
          request.onerror = () => abortWith(request.error || new Error('Не удалось прочитать пакет записей журнала для экспорта.'));
          tx.oncomplete = () => finish(resolve, pendingResult || { items, lastId, done: true, serializedChars });
          tx.onerror = () => finish(reject, explicitError || tx.error || new Error('Не удалось завершить пакетное чтение журнала для экспорта.'));
          tx.onabort = () => finish(reject, explicitError || tx.error || new Error('Чтение пакета журнала для экспорта было прервано.'));
        });
      } finally {
        db.close();
      }
    };

    // Existing exporter may internally stage up to its legacy 64 MiB byte cap
    // or more than 100k compact entries. Validate the completed staging receipt
    // before any local/Yandex success can observe it; reject and erase staging
    // when it exceeds what this same version can import.
    globalThis.stageFullJournalExport = async function guardedStageFullJournalExport(...args) {
      const staged = await originalStageExport(...args);
      try {
        envelope.assertExportReceipt(staged);
        return staged;
      } catch (error) {
        const key = String(staged?.stagingKey || '');
        if (key && typeof globalThis.deleteTransferPayloadGroup === 'function') {
          await globalThis.deleteTransferPayloadGroup(key).catch(() => {});
        }
        throw error;
      }
    };

    globalThis[INSTALL_MARKER] = true;
    return { installed: true };
  }

  globalThis.WebClipJournalRestoreEnvelopeGuard = Object.freeze({ install });
  install();
})();
