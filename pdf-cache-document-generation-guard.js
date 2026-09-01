(() => {
  'use strict';

  // P0-023: the tab-scoped retry cache may only be consumed by the exact
  // content-document generation that produced it. URL equality is not a
  // document-generation receipt (same-URL reload/replacement is distinct).
  const INSTALL_MARKER = '__webclipPdfCacheDocumentGenerationGuardV1';
  const RECEIPT_PREFIX = 'webclipPdfCacheDocumentReceipt:';
  const MAX_DOCUMENT_ID_CHARS = 256;
  const GENERATE_TYPE = 'WEBCLIP_SEND_PDF_TO_YANDEX';
  const RETRY_TYPES = new Set(['WEBCLIP_RETRY_PDF_TO_YANDEX', 'WEBCLIP_DOWNLOAD_CACHED_PDF']);
  const INVALIDATE_TYPE = 'WEBCLIP_INVALIDATE_PDF_CACHE';
  const listenerWrappers = new WeakMap();
  const stats = {
    generationAdmissions: 0,
    receiptCommits: 0,
    receiptClears: 0,
    retryAdmissions: 0,
    retryRejections: 0,
    missingDocumentId: 0
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
    await storageSession(chromeApi).set({
      [key]: { tabId, documentId, committedAt: Date.now() }
    });
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

  function sendGuardError(sendResponse, error) {
    try {
      sendResponse({
        ok: false,
        code: String(error?.code || 'WEBCLIP_PDF_CACHE_DOCUMENT_MISMATCH'),
        error: String(error?.message || error || 'PDF retry-cache rejected')
      });
    } catch (_) {}
  }

  function invokeAfterAdmission(listener, thisArg, message, sender, sendResponse, admissionPromise) {
    Promise.resolve(admissionPromise).then(() => {
      let responseSent = false;
      const guardedSendResponse = (value) => {
        responseSent = true;
        return sendResponse(value);
      };
      try {
        const result = listener.call(thisArg, message, sender, guardedSendResponse);
        if (result && typeof result.then === 'function') {
          Promise.resolve(result).then((value) => {
            if (!responseSent && value !== undefined) sendResponse(value);
          }, (error) => {
            if (!responseSent) sendGuardError(sendResponse, error);
          });
        }
      } catch (error) {
        if (!responseSent) sendGuardError(sendResponse, error);
      }
    }, (error) => sendGuardError(sendResponse, error));
    return true;
  }

  function invokeGeneration(listener, thisArg, message, sender, sendResponse, chromeApi) {
    const identity = senderIdentity(sender);
    stats.generationAdmissions += 1;
    if (!identity.tabId || !identity.documentId) {
      stats.missingDocumentId += 1;
      sendGuardError(sendResponse, makeGenerationError('WEBCLIP_PDF_CACHE_DOCUMENT_ID_REQUIRED', 'Не удалось доказать поколение документа перед формированием retry-cache.'));
      return false;
    }

    // Clear the old generation before entering a new generation attempt. If the
    // new attempt never commits a cache, the old tab:<id> record stays unusable.
    return invokeAfterAdmission(listener, thisArg, message, sender, (response) => {
      const cached = response?.cached === true;
      const settlement = cached ? commitReceipt(identity, chromeApi) : clearReceipt(identity.tabId, chromeApi);
      Promise.resolve(settlement).then(
        () => sendResponse(response),
        (error) => sendGuardError(sendResponse, error)
      );
    }, clearReceipt(identity.tabId, chromeApi));
  }

  function wrapListener(listener, chromeApi) {
    if (listenerWrappers.has(listener)) return listenerWrappers.get(listener);
    const wrapped = function webclipPdfCacheGenerationListener(message, sender, sendResponse) {
      const type = String(message?.type || '');
      if (type === GENERATE_TYPE) {
        return invokeGeneration(listener, this, message, sender, sendResponse, chromeApi);
      }
      if (RETRY_TYPES.has(type)) {
        const identity = senderIdentity(sender);
        return invokeAfterAdmission(listener, this, message, sender, sendResponse, assertCurrentReceipt(identity, chromeApi));
      }
      if (type === INVALIDATE_TYPE) {
        const identity = senderIdentity(sender);
        return invokeAfterAdmission(listener, this, message, sender, sendResponse, clearReceipt(identity.tabId, chromeApi));
      }
      return listener.call(this, message, sender, sendResponse);
    };
    listenerWrappers.set(listener, wrapped);
    return wrapped;
  }

  function installMethod(target, name, replacement) {
    try {
      target[name] = replacement;
      if (target[name] === replacement) return true;
    } catch (_) {}
    try {
      Object.defineProperty(target, name, { value: replacement, configurable: true, enumerable: true, writable: false });
      return target[name] === replacement;
    } catch (_) {
      return false;
    }
  }

  function install(chromeApi = globalThis.chrome) {
    if (globalThis[INSTALL_MARKER]) return { installed: true, alreadyInstalled: true };
    storageSession(chromeApi);
    const event = chromeApi?.runtime?.onMessage;
    if (!event || typeof event.addListener !== 'function') {
      throw makeGenerationError('WEBCLIP_PDF_CACHE_GENERATION_GUARD_UNAVAILABLE', 'runtime.onMessage недоступен для PDF generation guard.');
    }
    const rawAdd = event.addListener.bind(event);
    const rawRemove = typeof event.removeListener === 'function' ? event.removeListener.bind(event) : null;
    const rawHas = typeof event.hasListener === 'function' ? event.hasListener.bind(event) : null;
    if (!installMethod(event, 'addListener', (listener) => rawAdd(typeof listener === 'function' ? wrapListener(listener, chromeApi) : listener))) {
      throw makeGenerationError('WEBCLIP_PDF_CACHE_GENERATION_GUARD_UNAVAILABLE', 'Не удалось установить PDF generation guard.');
    }
    if (rawRemove) installMethod(event, 'removeListener', (listener) => rawRemove(listenerWrappers.get(listener) || listener));
    if (rawHas) installMethod(event, 'hasListener', (listener) => rawHas(listenerWrappers.get(listener) || listener));
    globalThis[INSTALL_MARKER] = true;
    return { installed: true };
  }

  globalThis.WebClipPdfCacheDocumentGenerationGuard = Object.freeze({
    RECEIPT_PREFIX,
    GENERATE_TYPE,
    RETRY_TYPES: Object.freeze([...RETRY_TYPES]),
    INVALIDATE_TYPE,
    normalizeDocumentId,
    receiptKey,
    readReceipt,
    clearReceipt,
    commitReceipt,
    assertCurrentReceipt,
    install,
    stats
  });
  globalThis.__webclipPdfCacheDocumentGenerationInstallResult = install();
})();
