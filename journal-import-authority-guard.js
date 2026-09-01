(() => {
  'use strict';

  if (typeof importScripts !== 'function' || typeof document !== 'undefined') return;

  const RECEIPT_TTL_MS = 15 * 60 * 1000;
  const MAX_RECEIPTS = 8;
  const receipts = new Map();

  const originalFetchBackup = globalThis.fetchJournalBackupFromYandex;
  const originalPreview = globalThis.previewStagedJournalImport;
  if (typeof originalFetchBackup !== 'function' || typeof originalPreview !== 'function') {
    throw new Error('P0-013: restore authority bindings unavailable during worker bootstrap.');
  }

  const makeError = (code, message) => {
    const error = new Error(message);
    error.code = code;
    return error;
  };

  const cleanExpired = async () => {
    const now = Date.now();
    for (const [id, receipt] of [...receipts.entries()]) {
      if (now - receipt.createdAt <= RECEIPT_TTL_MS) continue;
      receipts.delete(id);
      if (receipt.prepared?.importId && typeof globalThis.deleteJournalImportStage === 'function') {
        await globalThis.deleteJournalImportStage(receipt.prepared.importId).catch(() => {});
      }
    }
  };

  const reserveReceipt = async (receipt) => {
    await cleanExpired();
    while (receipts.size >= MAX_RECEIPTS) {
      const [oldestId, oldest] = receipts.entries().next().value || [];
      if (!oldestId) break;
      receipts.delete(oldestId);
      if (oldest?.prepared?.importId && typeof globalThis.deleteJournalImportStage === 'function') {
        await globalThis.deleteJournalImportStage(oldest.prepared.importId).catch(() => {});
      }
    }
    const id = `import-receipt-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
    receipts.set(id, receipt);
    return id;
  };

  globalThis.fetchJournalBackupFromYandex = async function guardedFetchJournalBackupFromYandex(requestedPath, operationId = '', selectionReceipt = null) {
    const path = String(requestedPath || '');
    const receipt = selectionReceipt && typeof selectionReceipt === 'object' ? selectionReceipt : null;
    const expectedPath = String(receipt?.path || '');
    const expectedResourceId = String(receipt?.resourceId || '').trim();
    if (!expectedResourceId || !expectedPath || expectedPath !== path) {
      throw makeError('JOURNAL_BACKUP_SELECTION_RECEIPT_REQUIRED', 'Выбранная резервная копия больше не имеет точной object-identity квитанции. Обновите список и выберите файл заново.');
    }

    const meta = await globalThis.yandexApi('/resources', {
      method: 'GET',
      timeoutMs: 15_000,
      operationId: String(operationId || ''),
      query: { path, fields: 'resource_id,path,type,size,modified,name' }
    });
    const actualResourceId = globalThis.normalizeYandexResourceIdFromApi(meta?.resource_id);
    const actualPath = globalThis.normalizeYandexDiskPathFromApi(meta?.path);
    if (!actualResourceId || actualResourceId !== expectedResourceId || actualPath !== expectedPath || String(meta?.type || '') !== 'file') {
      throw makeError('JOURNAL_BACKUP_SELECTION_CHANGED', 'Выбранный объект резервной копии на Яндекс Диске изменился после выбора. Восстановление остановлено; обновите список и выберите файл заново.');
    }
    return originalFetchBackup(path, operationId);
  };

  globalThis.previewStagedJournalImport = async function guardedPreviewStagedJournalImport(stagingKey, operationId = '', source = 'file') {
    const key = String(stagingKey || '').trim();
    const op = String(operationId || '');
    const sourceKind = source === 'yandex' ? 'yandex' : 'file';
    const preview = await originalPreview(key, op, sourceKind);
    const prepared = await globalThis.normalizeStagedJournalImportStream(key);
    const commitReceipt = await reserveReceipt({
      sourceKey: key,
      operationId: op,
      source: sourceKind,
      prepared,
      createdAt: Date.now()
    });
    return { ...preview, commitReceipt };
  };

  globalThis.commitPreviewedJournalImportReceipt = async function commitPreviewedJournalImportReceipt(commitReceipt, stagingKey, operationId = '', source = 'file') {
    await cleanExpired();
    const receiptId = String(commitReceipt || '').trim();
    const key = String(stagingKey || '').trim();
    const op = String(operationId || '');
    const sourceKind = source === 'yandex' ? 'yandex' : 'file';
    const receipt = receipts.get(receiptId);
    if (!receipt || receipt.sourceKey !== key || receipt.operationId !== op || receipt.source !== sourceKind) {
      throw makeError('JOURNAL_IMPORT_PREVIEW_RECEIPT_INVALID', 'Подтверждение импорта больше не связано с точно проверенной резервной копией. Выполните preview заново.');
    }
    receipts.delete(receiptId); // one-shot before destructive commit
    const prepared = receipt.prepared;
    if (!prepared?.importId) throw makeError('JOURNAL_IMPORT_PREVIEW_RECEIPT_INVALID', 'Нормализованный staging receipt импорта отсутствует.');

    await globalThis.startOperationLog(op, sourceKind === 'yandex' ? 'journal-import-yandex' : 'journal-import-file', sourceKind === 'yandex' ? 'Восстановление журнала с Яндекс Диска' : 'Импорт журнала из файла', { source: sourceKind });
    try {
      globalThis.recordOperationStage(op, 'replace', `Атомарно заменяем локальный журнал из подтверждённого staging receipt. Записей: ${prepared.entryCount}.`, 45, 'running', { entryCount: prepared.entryCount });
      const committed = await globalThis.commitStagedJournalImport(prepared, op);
      globalThis.recordOperationStage(op, 'complete', `Импорт завершён. Записей: ${committed.importedCount}.`, 100, 'success', { entryCount: committed.importedCount });
      return {
        ok: true,
        importedCount: committed.importedCount,
        exportedAt: prepared.exportedAt || '',
        operationId: op,
        statsWarning: committed.statsWarning || ''
      };
    } catch (error) {
      globalThis.recordOperationStage(op, 'error', `Ошибка импорта: ${globalThis.normalizeError(error)}`, 100, 'error');
      throw error;
    } finally {
      if (key && typeof globalThis.deleteTransferPayloadGroup === 'function') await globalThis.deleteTransferPayloadGroup(key).catch(() => {});
      await globalThis.deleteJournalImportStage(prepared.importId).catch(() => {});
    }
  };

  globalThis.WebClipJournalImportAuthorityGuard = Object.freeze({
    version: 1,
    receiptTtlMs: RECEIPT_TTL_MS,
    maxReceipts: MAX_RECEIPTS
  });
})();
