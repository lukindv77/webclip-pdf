(() => {
  'use strict';

  // P0-023: a tab-scoped retry cache is usable only by the exact content
  // document generation that produced it. This helper is loaded by a small
  // service-worker bootstrap before service-worker.js, records sender identity
  // with an ordinary Chrome listener, then wraps the worker's normal global
  // cache functions after service-worker.js has loaded. It never rewrites the
  // Chrome Event API itself.
  const OBSERVER_INSTALL_MARKER = '__webclipPdfCacheDocumentGenerationObserverV2';
  const FUNCTION_INSTALL_MARKER = '__webclipPdfCacheDocumentGenerationFunctionsV2';
  const RECEIPT_PREFIX = 'webclipPdfCacheDocumentReceipt:';
  const MAX_DOCUMENT_ID_CHARS = 256;
  const GENERATE_TYPE = 'WEBCLIP_SEND_PDF_TO_YANDEX';
  const RETRY_TYPE = 'WEBCLIP_RETRY_PDF_TO_YANDEX';
  const DOWNLOAD_TYPE = 'WEBCLIP_DOWNLOAD_CACHED_PDF';
  const INVALIDATE_TYPE = 'WEBCLIP_INVALIDATE_PDF_CACHE';
  const OBSERVED_TYPES = new Set([GENERATE_TYPE, RETRY_TYPE, DOWNLOAD_TYPE, INVALIDATE_TYPE]);
  const pendingIdentityQueues = new Map();
  const stats = {
    observedMessages: 0,
    consumedIdentities: 0,
    generationAdmissions: 0,
    receiptCommits: 0,
    receiptClears: 0,
    retryAdmissions: 0,
    retryRejections: 0,
    missingDocumentId: 0,
    functionWrappersInstalled: 0
  };

  function normalizeTabId(value) {
    const id = Math.floor(Number(value) || 0);
    return Number.isInteger(id) && id > 0 ? id : 0;
  }

  function normalizeDocumentId(value) {
    const id = String(value || '').trim();
    return id && id.length <= MAX_DOCUMENT_ID_CHARS ? id : '';
  }

  function receiptKey(tabId) {
    const id = normalizeTabId(tabId);
    return id ? `${RECEIPT_PREFIX}${id}` : '';
  }

  function makeGenerationError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  function senderIdentity(sender) {
    return {
      tabId: normalizeTabId(sender?.tab?.id),
      documentId: normalizeDocumentId(sender?.documentId)
    };
  }

  function storageSession(chromeApi = globalThis.chrome) {
    const area = chromeApi?.storage?.session;
    if (!area || typeof area.get !== 'function' || typeof area.set !== 'function' || typeof area.remove !== 'function') {
      throw makeGenerationError('WEBCLIP_PDF_CACHE_GENERATION_GUARD_UNAVAILABLE', 'Безопасная привязка PDF retry-cache к документу недоступна.');
    }
    return area;
  }

  async function readReceipt(tabId, chromeApi = globalThis.chrome) {
    const key = receiptKey(tabId);
    if (!key) return null;
    const values = await storageSession(chromeApi).get(key);
    const raw = values?.[key];
    if (!raw || typeof raw !== 'object') return null;
    const documentId = normalizeDocumentId(raw.documentId);
    const storedTabId = normalizeTabId(raw.tabId);
    if (!documentId || storedTabId !== normalizeTabId(tabId)) return null;
    return { tabId: storedTabId, documentId, committedAt: Math.max(0, Number(raw.committedAt) || 0) };
  }

  async function clearReceipt(tabId, chromeApi = globalThis.chrome) {
    const key = receiptKey(tabId);
    if (!key) return false;
    await storageSession(chromeApi).remove(key);
    stats.receiptClears += 1;
    return true;
  }

  async function commitReceipt(identity, chromeApi = globalThis.chrome) {
    const tabId = normalizeTabId(identity?.tabId);
    const documentId = normalizeDocumentId(identity?.documentId);
    const key = receiptKey(tabId);
    if (!key || !documentId) {
      stats.missingDocumentId += 1;
      throw makeGenerationError('WEBCLIP_PDF_CACHE_DOCUMENT_ID_REQUIRED', 'Не удалось доказать поколение документа для PDF retry-cache. Сформируйте PDF заново.');
    }
    await storageSession(chromeApi).set({ [key]: { tabId, documentId, committedAt: Date.now() } });
    stats.receiptCommits += 1;
    return { tabId, documentId };
  }

  async function assertCurrentReceipt(identity, chromeApi = globalThis.chrome) {
    const tabId = normalizeTabId(identity?.tabId);
    const documentId = normalizeDocumentId(identity?.documentId);
    if (!tabId || !documentId) {
      stats.missingDocumentId += 1;
      stats.retryRejections += 1;
      throw makeGenerationError('WEBCLIP_PDF_CACHE_DOCUMENT_ID_REQUIRED', 'Не удалось доказать текущее поколение документа. Сформируйте PDF заново.');
    }
    const receipt = await readReceipt(tabId, chromeApi);
    if (!receipt) {
      stats.retryRejections += 1;
      throw makeGenerationError('WEBCLIP_PDF_CACHE_DOCUMENT_RECEIPT_MISSING', 'PDF retry-cache не имеет доказанной привязки к текущему документу. Сформируйте PDF заново.');
    }
    if (receipt.documentId !== documentId) {
      stats.retryRejections += 1;
      throw makeGenerationError('WEBCLIP_PDF_CACHE_DOCUMENT_MISMATCH', 'Страница была перезагружена или заменена. Старый PDF не будет использован; сформируйте новый PDF.');
    }
    stats.retryAdmissions += 1;
    return receipt;
  }

  function queueKey(type, tabId) {
    return `${String(type || '')}:${normalizeTabId(tabId)}`;
  }

  function enqueueIdentity(type, identity) {
    const tabId = normalizeTabId(identity?.tabId);
    if (!OBSERVED_TYPES.has(String(type || '')) || !tabId) return false;
    const key = queueKey(type, tabId);
    const queue = pendingIdentityQueues.get(key) || [];
    queue.push({ tabId, documentId: normalizeDocumentId(identity?.documentId) });
    // The product listener consumes the matching identity synchronously in the
    // same dispatch turn. A small cap is only a fail-safe against unrelated
    // synthetic messages that never enter one of the wrapped product functions.
    if (queue.length > 32) queue.splice(0, queue.length - 32);
    pendingIdentityQueues.set(key, queue);
    stats.observedMessages += 1;
    return true;
  }

  function consumeIdentity(type, tabId) {
    const key = queueKey(type, tabId);
    const queue = pendingIdentityQueues.get(key) || [];
    const identity = queue.shift() || null;
    if (queue.length) pendingIdentityQueues.set(key, queue);
    else pendingIdentityQueues.delete(key);
    if (identity) stats.consumedIdentities += 1;
    return identity;
  }

  function requireIdentity(type, tabId) {
    const identity = consumeIdentity(type, tabId);
    if (!identity || !identity.documentId) {
      stats.missingDocumentId += 1;
      throw makeGenerationError('WEBCLIP_PDF_CACHE_DOCUMENT_ID_REQUIRED', 'Не удалось доказать поколение документа для операции с PDF retry-cache.');
    }
    return identity;
  }

  function installObserver(chromeApi = globalThis.chrome) {
    if (globalThis[OBSERVER_INSTALL_MARKER]) return { installed: true, alreadyInstalled: true };
    storageSession(chromeApi);
    const event = chromeApi?.runtime?.onMessage;
    if (!event || typeof event.addListener !== 'function') {
      throw makeGenerationError('WEBCLIP_PDF_CACHE_GENERATION_GUARD_UNAVAILABLE', 'runtime.onMessage недоступен для PDF generation guard.');
    }
    event.addListener((message, sender) => {
      const type = String(message?.type || '');
      if (OBSERVED_TYPES.has(type)) enqueueIdentity(type, senderIdentity(sender));
      return false;
    });
    globalThis[OBSERVER_INSTALL_MARKER] = true;
    return { installed: true };
  }

  function installFunctionGuards(workerGlobal = globalThis, chromeApi = globalThis.chrome) {
    if (workerGlobal[FUNCTION_INSTALL_MARKER]) return { installed: true, alreadyInstalled: true };
    storageSession(chromeApi);
    const originalGenerate = workerGlobal.generatePdfAndUploadToYandex;
    const originalRetry = workerGlobal.retryCachedPdfUploadToYandex;
    const originalDownload = workerGlobal.downloadCachedPdf;
    const originalDelete = workerGlobal.deleteCachedPdf;
    if (typeof originalGenerate !== 'function' || typeof originalRetry !== 'function' || typeof originalDownload !== 'function' || typeof originalDelete !== 'function') {
      throw makeGenerationError('WEBCLIP_PDF_CACHE_GENERATION_GUARD_UNAVAILABLE', 'Функции PDF retry-cache недоступны для generation guard.');
    }

    workerGlobal.generatePdfAndUploadToYandex = async function guardedGeneratePdfAndUploadToYandex(tabId, ...args) {
      const identity = requireIdentity(GENERATE_TYPE, tabId);
      stats.generationAdmissions += 1;
      await clearReceipt(tabId, chromeApi);
      try {
        const result = await originalGenerate.call(this, tabId, ...args);
        if (result?.cached === true) await commitReceipt(identity, chromeApi);
        else await clearReceipt(tabId, chromeApi);
        return result;
      } catch (error) {
        await clearReceipt(tabId, chromeApi).catch(() => {});
        throw error;
      }
    };

    workerGlobal.retryCachedPdfUploadToYandex = async function guardedRetryCachedPdfUploadToYandex(tabId, ...args) {
      const identity = requireIdentity(RETRY_TYPE, tabId);
      await assertCurrentReceipt(identity, chromeApi);
      return originalRetry.call(this, tabId, ...args);
    };

    workerGlobal.downloadCachedPdf = async function guardedDownloadCachedPdf(tabId, ...args) {
      const identity = requireIdentity(DOWNLOAD_TYPE, tabId);
      await assertCurrentReceipt(identity, chromeApi);
      return originalDownload.call(this, tabId, ...args);
    };

    workerGlobal.deleteCachedPdf = async function guardedDeleteCachedPdf(tabId, ...args) {
      try {
        return await originalDelete.call(this, tabId, ...args);
      } finally {
        await clearReceipt(tabId, chromeApi).catch(() => {});
      }
    };

    workerGlobal[FUNCTION_INSTALL_MARKER] = true;
    stats.functionWrappersInstalled = 4;
    return { installed: true };
  }

  globalThis.WebClipPdfCacheDocumentGenerationGuard = Object.freeze({
    RECEIPT_PREFIX,
    GENERATE_TYPE,
    RETRY_TYPE,
    DOWNLOAD_TYPE,
    INVALIDATE_TYPE,
    normalizeDocumentId,
    receiptKey,
    senderIdentity,
    enqueueIdentity,
    consumeIdentity,
    readReceipt,
    clearReceipt,
    commitReceipt,
    assertCurrentReceipt,
    installObserver,
    installFunctionGuards,
    stats
  });
})();
