from pathlib import Path

p = Path('service-worker.js')
text = p.read_text(encoding='utf-8')

old_import = "importScripts('public-suffix.js', 'journal-import-stream.js', 'journal-text-filter.js');"
new_import = "importScripts('public-suffix.js', 'journal-import-stream.js', 'journal-text-filter.js', 'local-download-identity.js');"
if text.count(old_import) != 1:
    raise SystemExit(f'import marker mismatch: {text.count(old_import)}')
text = text.replace(old_import, new_import, 1)

bind_start = text.index('async function bindPendingLocalDownloadIntent(intentKey, downloadId) {')
bind_end = text.index('\n\nasync function getPendingLocalDownload', bind_start)
new_bind = '''async function bindPendingLocalDownloadIntent(intentKey, downloadId) {
  const key = normalizePendingLocalDownloadKey(intentKey); const id = Number(downloadId);
  if (typeof key !== 'string' || !Number.isInteger(id) || id < 0) throw new Error('Некорректная привязка локальной загрузки Chrome.');
  const db = await openJournalDb();
  try {
    return await runIndexedDbTransactionBounded(db, JOURNAL_PENDING_DOWNLOAD_STORE, 'readwrite', 'Привязка downloadId к intent локальной загрузки', ({ store, setResult, fail }) => {
      const pending = store(); const req = pending.get(key);
      req.onsuccess = () => {
        try {
          const intent = req.result;
          if (!intent) { setResult(null); return; }
          const existingReq = pending.get(id);
          existingReq.onsuccess = () => {
            try {
              const existing = existingReq.result;
              if (existing) {
                const sameOperation = String(existing.operationId || '') && String(existing.operationId || '') === String(intent.operationId || '');
                if (sameOperation) {
                  pending.delete(key);
                  setResult(existing);
                  return;
                }
                const error = new Error(`DownloadItem #${id} уже принадлежит другому durable intent WebClip.`);
                error.code = 'WEBCLIP_DOWNLOAD_ID_ALREADY_BOUND';
                fail(error);
                return;
              }
              const bound = { ...intent, downloadId: id, kind: 'download', updatedAt: Date.now() };
              pending.delete(key);
              pending.put(bound);
              setResult(bound);
            } catch (error) { fail(error); }
          };
          existingReq.onerror = () => fail(existingReq.error || new Error('Не удалось проверить существующего владельца downloadId.'));
        } catch (error) { fail(error); }
      };
      req.onerror = () => fail(req.error || new Error('Не удалось прочитать intent локальной загрузки.'));
    }, RECOVERY_IDB_TX_TIMEOUT_MS);
  } finally { db.close(); }
}'''
text = text[:bind_start] + new_bind + text[bind_end:]

insert_marker = '\n\nasync function startAutomaticBlobDownloadBounded({ intentKey, blobUrl, filename, operationId = \'\' }) {'
if text.count(insert_marker) != 1:
    raise SystemExit(f'start marker mismatch: {text.count(insert_marker)}')
helper = '''

async function listPendingLocalDownloadFallbackIntents() {
  const db = await openJournalDb();
  try {
    return await runIndexedDbTransactionBounded(db, JOURNAL_PENDING_DOWNLOAD_STORE, 'readonly', 'Чтение intent для безопасной fallback-привязки локальных загрузок', ({ store, setResult, fail }) => {
      const out = [];
      const request = store().openCursor();
      request.onsuccess = () => {
        try {
          const cursor = request.result;
          if (!cursor) { setResult(out); return; }
          const value = cursor.value;
          if (typeof value?.downloadId === 'string' && value.downloadId.startsWith('intent:') && value.kind !== PENDING_LOCAL_UNKNOWN_KIND) {
            out.push(value);
            if (out.length >= MAX_PENDING_LOCAL_DOWNLOADS) { setResult(out); return; }
          }
          cursor.continue();
        } catch (error) { fail(error); }
      };
      request.onerror = () => fail(request.error || new Error('Не удалось прочитать intent для fallback-привязки локальных загрузок.'));
    }, RECOVERY_IDB_TX_TIMEOUT_MS);
  } finally { db.close(); }
}'''
text = text.replace(insert_marker, helper + insert_marker, 1)

reconcile_start = text.index("async function reconcilePendingLocalDownloads(trigger = 'maintenance', maxItems = PENDING_LOCAL_RECONCILE_BATCH) {")
reconcile_end = text.index('\n\nasync function appendJournalEntry', reconcile_start)
section = text[reconcile_start:reconcile_end]
close_marker = "  } finally { db.close(); }\n\n  let completed = 0;"
if section.count(close_marker) != 1:
    raise SystemExit(f'reconcile close marker mismatch: {section.count(close_marker)}')
section = section.replace(close_marker, "  } finally { db.close(); }\n\n  const fallbackIntents = items.some((item) => typeof item?.downloadId === 'string' && item.downloadId.startsWith('intent:'))\n    ? await listPendingLocalDownloadFallbackIntents()\n    : [];\n\n  let completed = 0;", 1)

old_match = '''      const expectedBlobUrl = String(item.blobUrl || '');
      const expectedFilename = String(item.data?.filename || '');
      const expectedBytes = Math.max(0, Number(item.expectedBytes || 0));
      const download = (Array.isArray(matches) ? matches : []).filter(isOwnExtensionDownload).find((candidate) => {
        const urlMatch = expectedBlobUrl && (String(candidate?.url || '') === expectedBlobUrl || String(candidate?.finalUrl || '') === expectedBlobUrl);
        if (urlMatch) return true;
        // URL is the primary identity. Filename/time is only a conservative
        // fallback for a browser that no longer exposes the original blob URL.
        if (!expectedFilename || !expectedBytes || intentAge > 10 * 60 * 1000) return false;
        const filename = String(candidate?.filename || '').replace(/\\\\/g, '/').split('/').pop() || '';
        const candidateBytes = Math.max(0, Number(candidate?.fileSize || 0), Number(candidate?.totalBytes || 0));
        return filename === expectedFilename && candidateBytes > 0 && candidateBytes === expectedBytes;
      });'''
new_match = '''      const expectedBlobUrl = String(item.blobUrl || '');
      const identity = globalThis.WebClipLocalDownloadIdentity?.chooseUniqueDownloadForIntent({
        intent: item,
        downloads: (Array.isArray(matches) ? matches : []).filter(isOwnExtensionDownload),
        allIntents: fallbackIntents,
        now: Date.now()
      }) || { download: null, mode: 'guard-unavailable' };
      const download = identity.download || null;'''
if section.count(old_match) != 1:
    raise SystemExit(f'fallback match marker mismatch: {section.count(old_match)}')
section = section.replace(old_match, new_match, 1)
text = text[:reconcile_start] + section + text[reconcile_end:]

p.write_text(text, encoding='utf-8')
