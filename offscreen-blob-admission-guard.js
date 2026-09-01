(() => {
  'use strict';

  // P0-065: Blob-URL creation must reserve count/bytes before the existing
  // offscreen handlers materialize a potentially large Blob. This guard is
  // loaded before offscreen.js and wraps its runtime message listener.
  const INSTALL_MARKER = '__webclipOffscreenBlobAdmissionGuardV1';
  const MAX_ACTIVE_BLOB_URLS = 12;
  const MAX_ACTIVE_BLOB_BYTES = 256 * 1024 * 1024;
  const MAX_PDF_BASE64_CHARS = 64 * 1024 * 1024;
  const MAX_PDF_BLOB_BYTES = Math.floor(MAX_PDF_BASE64_CHARS * 3 / 4);
  const MAX_TRANSFER_BYTES = 64 * 1024 * 1024;
  const CREATE_TYPES = new Set([
    'WEBCLIP_CREATE_PDF_CACHE_BLOB_URL',
    'WEBCLIP_CREATE_TEXT_BLOB_URL',
    'WEBCLIP_CREATE_STAGED_TEXT_BLOB_URL'
  ]);

  const pendingReservations = new Set();
  const activeUrls = new Map();
  let pendingBytes = 0;
  let activeBytes = 0;
  let nextReservationId = 1;
  const listenerWrappers = new WeakMap();
  const stats = {
    reservations: 0,
    rejected: 0,
    committed: 0,
    releasedPending: 0,
    releasedActive: 0,
    maxObservedReservedBytes: 0
  };

  function makeBudgetError(message = 'Слишком много крупных временных файлов одновременно. Дождитесь завершения текущих загрузок и повторите.') {
    const error = new Error(message);
    error.code = 'OFFSCREEN_BLOB_BUDGET_EXCEEDED';
    return error;
  }

  function utf8ByteLengthBounded(value, stopAfter = MAX_ACTIVE_BLOB_BYTES) {
    const text = String(value || '');
    const limit = Math.max(0, Math.floor(Number(stopAfter) || 0));
    let bytes = 0;
    for (let index = 0; index < text.length; index += 1) {
      const code = text.charCodeAt(index);
      if (code <= 0x7f) bytes += 1;
      else if (code <= 0x7ff) bytes += 2;
      else if (code >= 0xd800 && code <= 0xdbff && index + 1 < text.length) {
        const next = text.charCodeAt(index + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          bytes += 4;
          index += 1;
        } else {
          bytes += 3;
        }
      } else {
        bytes += 3;
      }
      if (limit && bytes > limit) return bytes;
    }
    return bytes;
  }

  function admissionBytesForMessage(message) {
    const type = String(message?.type || '');
    if (type === 'WEBCLIP_CREATE_PDF_CACHE_BLOB_URL') return MAX_PDF_BLOB_BYTES;
    if (type === 'WEBCLIP_CREATE_STAGED_TEXT_BLOB_URL') return MAX_TRANSFER_BYTES;
    if (type === 'WEBCLIP_CREATE_TEXT_BLOB_URL') {
      return utf8ByteLengthBounded(String(message?.text || ''), MAX_ACTIVE_BLOB_BYTES);
    }
    return 0;
  }

  function snapshot() {
    return {
      pendingCount: pendingReservations.size,
      activeCount: activeUrls.size,
      pendingBytes,
      activeBytes,
      totalCount: pendingReservations.size + activeUrls.size,
      totalBytes: pendingBytes + activeBytes
    };
  }

  function reserveForMessage(message) {
    const type = String(message?.type || '');
    if (!CREATE_TYPES.has(type)) return null;
    const reservedBytes = Math.max(0, Math.floor(admissionBytesForMessage(message)));
    const current = snapshot();
    if (current.totalCount >= MAX_ACTIVE_BLOB_URLS || current.totalBytes + reservedBytes > MAX_ACTIVE_BLOB_BYTES) {
      stats.rejected += 1;
      throw makeBudgetError();
    }
    const reservation = {
      id: nextReservationId++,
      type,
      reservedBytes,
      released: false,
      committed: false
    };
    pendingReservations.add(reservation);
    pendingBytes += reservedBytes;
    stats.reservations += 1;
    stats.maxObservedReservedBytes = Math.max(stats.maxObservedReservedBytes, pendingBytes + activeBytes);
    return reservation;
  }

  function releasePending(reservation) {
    if (!reservation || reservation.released || reservation.committed) return false;
    reservation.released = true;
    if (pendingReservations.delete(reservation)) {
      pendingBytes = Math.max(0, pendingBytes - reservation.reservedBytes);
      stats.releasedPending += 1;
      return true;
    }
    return false;
  }

  function commitReservation(reservation, url, actualSize) {
    if (!reservation || reservation.released || reservation.committed || !pendingReservations.has(reservation)) return false;
    const normalizedUrl = String(url || '');
    const size = Math.max(0, Math.floor(Number(actualSize) || 0));
    if (!normalizedUrl) {
      releasePending(reservation);
      return false;
    }
    if (size > reservation.reservedBytes) {
      releasePending(reservation);
      const error = makeBudgetError('Фактический Blob превысил заранее зарезервированный безопасный размер.');
      error.code = 'OFFSCREEN_BLOB_RESERVATION_UNDERSIZED';
      throw error;
    }
    pendingReservations.delete(reservation);
    pendingBytes = Math.max(0, pendingBytes - reservation.reservedBytes);
    reservation.committed = true;
    reservation.released = true;
    const previous = activeUrls.get(normalizedUrl);
    if (previous) activeBytes = Math.max(0, activeBytes - previous.size);
    activeUrls.set(normalizedUrl, { size, type: reservation.type });
    activeBytes += size;
    stats.committed += 1;
    return true;
  }

  function releaseActiveUrl(url) {
    const normalizedUrl = String(url || '');
    const record = activeUrls.get(normalizedUrl);
    if (!record) return false;
    activeUrls.delete(normalizedUrl);
    activeBytes = Math.max(0, activeBytes - Math.max(0, Number(record.size) || 0));
    stats.releasedActive += 1;
    return true;
  }

  function installMethod(target, name, replacement) {
    if (!target) return false;
    try {
      target[name] = replacement;
      if (target[name] === replacement) return true;
    } catch (_) {}
    try {
      Object.defineProperty(target, name, {
        value: replacement,
        configurable: true,
        enumerable: true,
        writable: false
      });
      return target[name] === replacement;
    } catch (_) {
      return false;
    }
  }

  function wrapListener(listener) {
    if (listenerWrappers.has(listener)) return listenerWrappers.get(listener);
    const wrapped = function webclipBlobAdmissionListener(message, sender, sendResponse) {
      if (message?.target !== 'offscreen' || !CREATE_TYPES.has(String(message?.type || ''))) {
        return listener.call(this, message, sender, sendResponse);
      }
      let reservation = null;
      try {
        reservation = reserveForMessage(message);
      } catch (error) {
        try {
          sendResponse({ ok: false, code: error?.code || 'OFFSCREEN_BLOB_BUDGET_EXCEEDED', error: error?.message || String(error) });
        } catch (_) {}
        return false;
      }

      let responseSent = false;
      const guardedSendResponse = (response) => {
        responseSent = true;
        if (response?.ok === true && response?.url) {
          try {
            commitReservation(reservation, response.url, response.size);
          } catch (error) {
            try { globalThis.URL?.revokeObjectURL?.(String(response.url || '')); } catch (_) {}
            return sendResponse({ ok: false, code: error?.code || 'OFFSCREEN_BLOB_BUDGET_EXCEEDED', error: error?.message || String(error) });
          }
        } else {
          releasePending(reservation);
        }
        return sendResponse(response);
      };

      let result;
      try {
        result = listener.call(this, message, sender, guardedSendResponse);
      } catch (error) {
        releasePending(reservation);
        throw error;
      }
      if (result !== true && !responseSent) releasePending(reservation);
      return result;
    };
    listenerWrappers.set(listener, wrapped);
    return wrapped;
  }

  function install(chromeApi = globalThis.chrome, urlApi = globalThis.URL) {
    if (globalThis[INSTALL_MARKER]) return { installed: true, alreadyInstalled: true };
    const event = chromeApi?.runtime?.onMessage;
    if (!event || typeof event.addListener !== 'function') return { installed: false, reason: 'runtime.onMessage unavailable' };
    const rawAddListener = event.addListener.bind(event);
    const rawRemoveListener = typeof event.removeListener === 'function' ? event.removeListener.bind(event) : null;
    const rawHasListener = typeof event.hasListener === 'function' ? event.hasListener.bind(event) : null;

    if (!installMethod(event, 'addListener', (listener) => rawAddListener(typeof listener === 'function' ? wrapListener(listener) : listener))) {
      return { installed: false, reason: 'cannot wrap runtime.onMessage.addListener' };
    }
    if (rawRemoveListener) {
      installMethod(event, 'removeListener', (listener) => rawRemoveListener(listenerWrappers.get(listener) || listener));
    }
    if (rawHasListener) {
      installMethod(event, 'hasListener', (listener) => rawHasListener(listenerWrappers.get(listener) || listener));
    }

    if (!urlApi || typeof urlApi.revokeObjectURL !== 'function') return { installed: false, reason: 'URL.revokeObjectURL unavailable' };
    const rawRevokeObjectURL = urlApi.revokeObjectURL.bind(urlApi);
    if (!installMethod(urlApi, 'revokeObjectURL', (url) => {
      releaseActiveUrl(url);
      return rawRevokeObjectURL(url);
    })) {
      return { installed: false, reason: 'cannot wrap URL.revokeObjectURL' };
    }

    globalThis[INSTALL_MARKER] = true;
    return { installed: true };
  }

  const api = {
    MAX_ACTIVE_BLOB_URLS,
    MAX_ACTIVE_BLOB_BYTES,
    MAX_PDF_BLOB_BYTES,
    MAX_TRANSFER_BYTES,
    CREATE_TYPES: Object.freeze([...CREATE_TYPES]),
    utf8ByteLengthBounded,
    admissionBytesForMessage,
    reserveForMessage,
    releasePending,
    releaseActiveUrl,
    snapshot,
    install,
    stats
  };
  globalThis.WebClipOffscreenBlobAdmissionGuard = Object.freeze(api);
  globalThis.__webclipOffscreenBlobAdmissionInstallResult = install();
})();
