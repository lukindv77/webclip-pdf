#!/usr/bin/env python3
from pathlib import Path

p = Path('service-worker.js')
text = p.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 source match, found {count}')
    text = text.replace(old, new, 1)


replace_once(
    "const PENDING_LOCAL_DOWNLOAD_TTL_MS = 24 * 60 * 60 * 1000;\nconst MAX_PENDING_REMOTE_SAVES = 20;",
    "const PENDING_LOCAL_DOWNLOAD_TTL_MS = 24 * 60 * 60 * 1000;\nconst PENDING_LOCAL_UNKNOWN_KIND = 'unknown';\nconst PENDING_LOCAL_UNKNOWN_REASON_MAX_CHARS = 1000;\nconst MAX_PENDING_REMOTE_SAVES = 20;",
    'constants',
)

replace_once(
    "      const pending = store(); let count = 0; const cursorReq = pending.openCursor();\n      cursorReq.onsuccess = () => { try { const cursor = cursorReq.result; if (cursor) { count += 1; if (count >= MAX_PENDING_LOCAL_DOWNLOADS) { fail(new Error('Слишком много незавершённых локальных загрузок WebClip; новая загрузка не запущена.')); return; } cursor.continue(); return; } pending.put(item); } catch (e) { fail(e); } };",
    "      const pending = store(); let activeCount = 0; let unknownCount = 0; const cursorReq = pending.openCursor();\n      cursorReq.onsuccess = () => {\n        try {\n          const cursor = cursorReq.result;\n          if (cursor) {\n            if (cursor.value?.kind === PENDING_LOCAL_UNKNOWN_KIND) {\n              unknownCount += 1;\n              if (unknownCount >= MAX_PENDING_LOCAL_DOWNLOADS) { fail(new Error('Слишком много локальных загрузок с неизвестным исходом. Разрешите старые recovery checkpoint вручную перед новой загрузкой.')); return; }\n            } else {\n              activeCount += 1;\n              if (activeCount >= MAX_PENDING_LOCAL_DOWNLOADS) { fail(new Error('Слишком много незавершённых локальных загрузок WebClip; новая загрузка не запущена.')); return; }\n            }\n            cursor.continue();\n            return;\n          }\n          pending.put(item);\n        } catch (e) { fail(e); }\n      };",
    'capacity',
)

remove_block = """async function removePendingLocalDownload(downloadId) {
  const key = normalizePendingLocalDownloadKey(downloadId); if (key === null) return;
  const db = await openJournalDb();
  try { await runIndexedDbTransactionBounded(db, JOURNAL_PENDING_DOWNLOAD_STORE, 'readwrite', 'Удаление checkpoint локальной загрузки', ({ store }) => store().delete(key), RECOVERY_IDB_TX_TIMEOUT_MS); }
  finally { db.close(); }
}
"""
helper = remove_block + """
async function markPendingLocalDownloadUnknown(downloadId, reason = '', trigger = '') {
  const key = normalizePendingLocalDownloadKey(downloadId); if (key === null) return null;
  const db = await openJournalDb();
  try {
    return await runIndexedDbTransactionBounded(db, JOURNAL_PENDING_DOWNLOAD_STORE, 'readwrite', 'Перевод checkpoint локальной загрузки в unknown/manual-resolution', ({ store, setResult, fail }) => {
      const pending = store();
      const request = pending.get(key);
      request.onsuccess = () => {
        try {
          const current = request.result;
          if (!current) { setResult(null); return; }
          const now = Date.now();
          const next = {
            ...current,
            kind: PENDING_LOCAL_UNKNOWN_KIND,
            priorKind: String(current.priorKind || current.kind || '').slice(0, 32),
            recoveryState: 'manual-resolution',
            unknownAt: Number(current.unknownAt || 0) > 0 ? Number(current.unknownAt) : now,
            updatedAt: now,
            unknownReason: String(reason || '').slice(0, PENDING_LOCAL_UNKNOWN_REASON_MAX_CHARS),
            unknownTrigger: String(trigger || '').slice(0, 120)
          };
          pending.put(next);
          setResult(next);
        } catch (error) { fail(error); }
      };
      request.onerror = () => fail(request.error || new Error('Не удалось прочитать checkpoint локальной загрузки для unknown/manual-resolution.'));
    }, RECOVERY_IDB_TX_TIMEOUT_MS);
  } finally { db.close(); }
}
"""
replace_once(remove_block, helper, 'unknown-helper')

replace_once(
    "            if (!cursor || out.length >= max) { setResult(out); return; }\n            out.push(cursor.value);\n            cursor.continue();",
    "            if (!cursor || out.length >= max) { setResult(out); return; }\n            if (cursor.value?.kind === PENDING_LOCAL_UNKNOWN_KIND) { cursor.continue(); return; }\n            out.push(cursor.value);\n            cursor.continue();",
    'maintenance-skip',
)

replace_once(
    "  let expired = 0;\n  let rebound = 0;",
    "  let expired = 0;\n  let unknown = 0;\n  let rebound = 0;",
    'counter',
)

replace_once(
    """      if (intentAge > PENDING_LOCAL_DOWNLOAD_TTL_MS) {
        await removePendingLocalDownload(rawKey).catch(() => {});
        if (expectedBlobUrl) await revokeBlobUrl(expectedBlobUrl).catch(() => {});
        const operationId = String(item.operationId || '');
        recordOperationStage(operationId, 'error', 'Не удалось связать запущенную локальную загрузку Chrome с durable checkpoint в течение 24 часов. Запись журнала не создана.', 100, 'error', { trigger });
        await flushOperationLogWrites(operationId).catch(() => {});
        expired += 1;
      } else {
""",
    """      if (intentAge > PENDING_LOCAL_DOWNLOAD_TTL_MS) {
        const operationId = String(item.operationId || '');
        const reason = 'Не удалось связать запущенную локальную загрузку Chrome с DownloadItem в течение 24 часов; физический исход неизвестен.';
        let marked = null;
        try { marked = await markPendingLocalDownloadUnknown(rawKey, reason, trigger); }
        catch (error) {
          failed += 1;
          pendingCount += 1;
          recordOperationStage(operationId, 'recovery-error', `Не удалось сохранить unknown/manual-resolution checkpoint локальной загрузки: ${normalizeError(error)} Исходный checkpoint оставлен активным.`, 100, 'partial', { trigger, error: normalizeError(error) });
          await flushOperationLogWrites(operationId).catch(() => {});
          continue;
        }
        if (!marked) { pendingCount += 1; continue; }
        if (expectedBlobUrl) await revokeBlobUrl(expectedBlobUrl).catch(() => {});
        recordOperationStage(operationId, 'recovery-unknown', 'Физический исход локальной загрузки Chrome не подтверждён. Durable metadata checkpoint сохранён для manual resolution; запись журнала автоматически не создана.', 100, 'partial', { trigger, recoveryState: 'manual-resolution' });
        await flushOperationLogWrites(operationId).catch(() => {});
        unknown += 1;
      } else {
""",
    'intent-ttl',
)

replace_once(
    """    if (!download && Date.now() - Number(item.createdAt || item.updatedAt || 0) > PENDING_LOCAL_DOWNLOAD_TTL_MS) {
      await removePendingLocalDownload(id).catch(() => {});
      if (item.blobUrl) await revokeBlobUrl(String(item.blobUrl)).catch(() => {});
      const operationId = String(item.operationId || '');
      recordOperationStage(operationId, 'error', 'Не удалось подтвердить результат локальной загрузки Chrome в течение 24 часов. Запись журнала не создана.', 100, 'error', { downloadId: id, trigger });
      await flushOperationLogWrites(operationId).catch(() => {});
      expired += 1;
      continue;
    }
""",
    """    if (!download && Date.now() - Number(item.createdAt || item.updatedAt || 0) > PENDING_LOCAL_DOWNLOAD_TTL_MS) {
      const operationId = String(item.operationId || '');
      const reason = `DownloadItem #${id} больше не доступен после 24 часов; физический исход локальной загрузки неизвестен.`;
      let marked = null;
      try { marked = await markPendingLocalDownloadUnknown(id, reason, trigger); }
      catch (error) {
        failed += 1;
        pendingCount += 1;
        recordOperationStage(operationId, 'recovery-error', `Не удалось сохранить unknown/manual-resolution checkpoint локальной загрузки #${id}: ${normalizeError(error)} Исходный checkpoint оставлен активным.`, 100, 'partial', { downloadId: id, trigger, error: normalizeError(error) });
        await flushOperationLogWrites(operationId).catch(() => {});
        continue;
      }
      if (!marked) { pendingCount += 1; continue; }
      if (item.blobUrl) await revokeBlobUrl(String(item.blobUrl)).catch(() => {});
      recordOperationStage(operationId, 'recovery-unknown', 'DownloadItem больше не найден, поэтому физический исход локальной загрузки считается unknown. Durable metadata checkpoint сохранён для manual resolution; запись журнала автоматически не создана.', 100, 'partial', { downloadId: id, trigger, recoveryState: 'manual-resolution' });
      await flushOperationLogWrites(operationId).catch(() => {});
      unknown += 1;
      continue;
    }
""",
    'bound-ttl',
)

replace_once(
    "  return { trigger, checked: items.length, completed, interrupted, rebound, pending: pendingCount, expired, failed };",
    "  return { trigger, checked: items.length, completed, interrupted, rebound, pending: pendingCount, unknown, expired, failed };",
    'return-shape',
)

p.write_text(text, encoding='utf-8')
print('P0-039 exact source patch: OK')
