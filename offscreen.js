const MAX_PDF_BASE64_CHARS = 64 * 1024 * 1024;
const MAX_TEXT_BLOB_CHARS = 64 * 1024 * 1024;
const PDF_CACHE_DB_NAME = 'WebClipPdfRetryCache';
const PDF_CACHE_STORE = 'pdfs';
const PDF_CACHE_META_STORE = 'meta';
const PDF_CACHE_DB_VERSION = 3;
const TRANSFER_DB_NAME = 'WebClipOffscreenTransfers';
const TRANSFER_STORE = 'payloads';
const TRANSFER_DB_VERSION = 1;
const MAX_TRANSFER_TEXT_CHARS = 64 * 1024 * 1024;
const MAX_TRANSFER_BYTES = 64 * 1024 * 1024;
const MAX_TRANSFER_CHUNK_BYTES = 8 * 1024 * 1024;
const JOURNAL_IMPORT_CHUNK_BYTES = 1024 * 1024;
const MAX_JOURNAL_IMPORT_BYTES = 50 * 1024 * 1024;
const MAX_YANDEX_SIGNED_URL_CHARS = 32 * 1024;
const MAX_ACTIVE_BLOB_URLS = 12;
const MAX_ACTIVE_BLOB_BYTES = 256 * 1024 * 1024;
const MAX_ACTIVE_SIGNED_TRANSFERS = 2;
const MAX_ACTIVE_SIGNED_TRANSFER_BYTES = 96 * 1024 * 1024;
const MAX_PDF_TRANSFER_BYTES = Math.floor(MAX_PDF_BASE64_CHARS * 3 / 4);
// Automatic downloads are reconciled by the service worker; native saveAs:true
// exports are invoked by journal/options extension pages (P1-079/P1-080).
// This slightly-later fallback guarantees bounded Blob memory if either page or
// the MV3 worker disappears before terminal download cleanup runs.
const BLOB_URL_FALLBACK_TTL_MS = 16 * 60 * 1000;

function isTrustedExtensionSender(sender) {
  if (sender?.id !== chrome.runtime.id) return false;
  const senderUrl = String(sender?.url || sender?.origin || '');
  if (senderUrl) return senderUrl.startsWith(chrome.runtime.getURL(''));
  return !sender?.tab;
}

function normalizeOperationId(value) {
  const id = String(value || '').trim();
  return id.length <= 160 && /^[A-Za-z0-9._:-]*$/.test(id) ? id : '';
}

function isAllowedSignedYandexUrl(value) {
  const raw = String(value || '');
  if (!raw || raw.length > MAX_YANDEX_SIGNED_URL_CHARS) return false;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    return url.protocol === 'https:' && (host === 'disk.yandex.net' || host.endsWith('.disk.yandex.net'));
  } catch (_) {
    return false;
  }
}

const blobUrls = new Map();
let activeBlobUrlBytes = 0;
const OFFSCREEN_IDLE_CLOSE_MS = 60 * 1000;
const OFFSCREEN_IDLE_CLOSE_REQUEST_TIMEOUT_MS = 10 * 1000;
let activeTransfers = 0;
let activeSignedTransferBytes = 0;
const activeSignedTransferReservations = new Set();
let idleCloseTimer = null;
let idleNonce = 0;
let closingForIdle = false;
let idleCloseRequestActual = null;

function cancelIdleClose() {
  if (idleCloseTimer) clearTimeout(idleCloseTimer);
  idleCloseTimer = null;
  idleNonce += 1;
}

function waitOffscreenIdleCloseRequest(actual, timeoutMs = OFFSCREEN_IDLE_CLOSE_REQUEST_TIMEOUT_MS) {
  const waitMs = Math.max(1, Number(timeoutMs) || OFFSCREEN_IDLE_CLOSE_REQUEST_TIMEOUT_MS);
  let timer = 0;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`Запрос idle-close offscreen не завершился за ${Math.ceil(waitMs / 1000)} с.`);
      error.code = 'WEBCLIP_OFFSCREEN_IDLE_CLOSE_TIMEOUT';
      reject(error);
    }, waitMs);
  });
  return Promise.race([actual, deadline]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function requestOffscreenIdleCloseBounded(nonce) {
  let actual = idleCloseRequestActual;
  if (!actual) {
    actual = Promise.resolve().then(() => chrome.runtime.sendMessage({
      type: 'WEBCLIP_OFFSCREEN_IDLE_CLOSE_REQUEST',
      nonce
    }));
    idleCloseRequestActual = actual;
    void actual.finally(() => {
      if (idleCloseRequestActual === actual) idleCloseRequestActual = null;
    }).catch(() => {});
  }
  return waitOffscreenIdleCloseRequest(actual);
}

function scheduleIdleClose() {
  if (closingForIdle || activeTransfers > 0 || blobUrls.size > 0) return;
  if (idleCloseTimer) clearTimeout(idleCloseTimer);
  const nonce = ++idleNonce;
  idleCloseTimer = setTimeout(() => {
    idleCloseTimer = null;
    if (closingForIdle || activeTransfers > 0 || blobUrls.size > 0 || nonce !== idleNonce) return;
    void requestOffscreenIdleCloseBounded(nonce)
      .then((response) => {
        if (response?.closed !== true) scheduleIdleClose();
      })
      .catch(() => {
        // The raw runtime message is non-cancellable and remains
        // single-flight until actual settlement. Keep a future cleanup
        // cycle instead of stacking another unknown close request.
        scheduleIdleClose();
      });
  }, OFFSCREEN_IDLE_CLOSE_MS);
}

function beginOffscreenActivity() {
  cancelIdleClose();
}

function getSignedTransferAdmissionBytes(message) {
  const spec = message?.spec && typeof message.spec === 'object' ? message.spec : {};
  const mode = String(spec.mode || '');
  if (mode === 'pdf-cache-upload') return MAX_PDF_TRANSFER_BYTES;
  if (mode === 'text-payload-upload' || mode === 'text-chunks-upload') return MAX_TRANSFER_BYTES;
  if (mode === 'text-download') {
    return Math.max(1024, Math.min(MAX_JOURNAL_IMPORT_BYTES, Number(spec.maxChars) || MAX_JOURNAL_IMPORT_BYTES));
  }
  return 0;
}

function makeTransferBudgetError() {
  const error = new Error('Слишком много крупных операций Яндекс Диска выполняются одновременно. Дождитесь их фактического завершения и повторите.');
  error.code = 'OFFSCREEN_TRANSFER_BUDGET_EXCEEDED';
  return error;
}

function reserveSignedTransferAdmission(message) {
  const reservedBytes = getSignedTransferAdmissionBytes(message);
  if (!reservedBytes) return null;
  if (activeTransfers >= MAX_ACTIVE_SIGNED_TRANSFERS || activeSignedTransferBytes + reservedBytes > MAX_ACTIVE_SIGNED_TRANSFER_BYTES) {
    throw makeTransferBudgetError();
  }
  const reservation = { reservedBytes, released: false };
  activeTransfers += 1;
  activeSignedTransferBytes += reservedBytes;
  activeSignedTransferReservations.add(reservation);
  return reservation;
}

function resizeSignedTransferReservation(reservation, actualBytes) {
  if (!reservation || reservation.released) return;
  const nextBytes = Math.max(0, Math.floor(Number(actualBytes) || 0));
  if (nextBytes > reservation.reservedBytes) {
    const growth = nextBytes - reservation.reservedBytes;
    if (activeSignedTransferBytes + growth > MAX_ACTIVE_SIGNED_TRANSFER_BYTES) throw makeTransferBudgetError();
    activeSignedTransferBytes += growth;
  } else {
    activeSignedTransferBytes = Math.max(0, activeSignedTransferBytes - (reservation.reservedBytes - nextBytes));
  }
  reservation.reservedBytes = nextBytes;
}

function releaseSignedTransferAdmission(reservation) {
  if (!reservation || reservation.released) return;
  reservation.released = true;
  activeSignedTransferReservations.delete(reservation);
  activeSignedTransferBytes = Math.max(0, activeSignedTransferBytes - reservation.reservedBytes);
  activeTransfers = Math.max(0, activeTransfers - 1);
}

function registerBlobUrl(blob) {
  if (!(blob instanceof Blob)) throw new Error('Некорректный Blob для offscreen URL.');
  const size = Math.max(0, Number(blob.size) || 0);
  if (blobUrls.size >= MAX_ACTIVE_BLOB_URLS || activeBlobUrlBytes + size > MAX_ACTIVE_BLOB_BYTES) {
    const error = new Error('Слишком много крупных временных файлов одновременно. Дождитесь завершения текущих загрузок и повторите.');
    error.code = 'OFFSCREEN_BLOB_BUDGET_EXCEEDED';
    throw error;
  }
  const url = URL.createObjectURL(blob);
  const timer = setTimeout(() => revokeUrl(url), BLOB_URL_FALLBACK_TTL_MS);
  blobUrls.set(url, { timer, size });
  activeBlobUrlBytes += size;
  return url;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.target !== 'offscreen') return false;
  if (!isTrustedExtensionSender(sender)) {
    sendResponse({ ok: false, error: 'Недоверенный контекст не может использовать offscreen API WebClip.' });
    return false;
  }

  if (message.type === 'WEBCLIP_OFFSCREEN_CONFIRM_IDLE_CLOSE') {
    const nonce = Math.max(0, Math.floor(Number(message.nonce) || 0));
    const idle = Boolean(nonce && nonce === idleNonce && activeTransfers === 0 && blobUrls.size === 0 && !idleCloseTimer);
    if (idle) closingForIdle = true;
    sendResponse({ ok: true, idle });
    return false;
  }

  if (message.type === 'WEBCLIP_OFFSCREEN_CANCEL_IDLE_CLOSE') {
    closingForIdle = false;
    scheduleIdleClose();
    sendResponse({ ok: true });
    return false;
  }

  if (closingForIdle) {
    sendResponse({ ok: false, code: 'OFFSCREEN_CLOSING', error: 'Offscreen-документ закрывается после периода бездействия. Повторите операцию.' });
    return false;
  }
  beginOffscreenActivity();

  if (message.type === 'WEBCLIP_SIGNED_TRANSFER') {
    let reservation = null;
    try {
      reservation = reserveSignedTransferAdmission(message);
      if (!reservation) throw new Error('Некорректный режим offscreen transfer.');
    } catch (error) {
      sendResponse({ transferCompleted: false, ok: false, code: error?.code || 'OFFSCREEN_TRANSFER_ERROR', error: error?.message || String(error) });
      scheduleIdleClose();
      return false;
    }
    handleSignedTransfer(message, reservation)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ transferCompleted: false, ok: false, code: error?.code || 'OFFSCREEN_TRANSFER_ERROR', error: error?.message || String(error) }))
      .finally(() => {
        // The reservation follows the actual offscreen transfer promise, not a
        // caller-side runtime deadline. A lost/timed-out response therefore
        // cannot free admission capacity while fetch/IDB side effects still run.
        releaseSignedTransferAdmission(reservation);
        scheduleIdleClose();
      });
    return true;
  }

  if (message.type === 'WEBCLIP_CREATE_PDF_CACHE_BLOB_URL') {
    (async () => {
      const record = await getPdfCacheRecord(String(message.pdfCacheKey || ''));
      if (!record) throw new Error('PDF cache для создания Blob не найден.');
      const blob = cachedPdfRecordToBlob(record);
      const url = registerBlobUrl(blob);
      sendResponse({ ok: true, url, size: blob.size });
    })().catch((error) => {
      sendResponse({ ok: false, error: error?.message || String(error) });
      scheduleIdleClose();
    });
    return true;
  }

  if (message.type === 'WEBCLIP_CREATE_TEXT_BLOB_URL') {
    try {
      const text = String(message.text || '');
      if (text.length > MAX_TEXT_BLOB_CHARS) throw new Error('Текстовый файл превышает допустимый размер offscreen-буфера.');
      const blob = new Blob([text], { type: message.mimeType || 'application/json;charset=utf-8' });
      const url = registerBlobUrl(blob);
      sendResponse({ ok: true, url, size: blob.size });
    } catch (error) {
      sendResponse({ ok: false, error: error?.message || String(error) });
      scheduleIdleClose();
    }
    return false;
  }

  if (message.type === 'WEBCLIP_CREATE_STAGED_TEXT_BLOB_URL') {
    (async () => {
      const blob = await getTransferChunkedBlob(String(message.payloadKey || ''), String(message.mimeType || 'application/json;charset=utf-8'));
      const url = registerBlobUrl(blob);
      sendResponse({ ok: true, url, size: blob.size });
    })().catch((error) => {
      sendResponse({ ok: false, error: error?.message || String(error) });
      scheduleIdleClose();
    });
    return true;
  }

  if (message.type === 'WEBCLIP_REVOKE_BLOB_URL') {
    revokeUrl(message.url);
    scheduleIdleClose();
    sendResponse({ ok: true });
    return false;
  }

  return false;
});

async function handleSignedTransfer(message, reservation) {
  const spec = message?.spec && typeof message.spec === 'object' ? message.spec : {};
  const mode = String(spec.mode || '');
  const url = String(spec.url || '');
  const method = String(spec.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'PUT') throw new Error('Offscreen transfer: неподдерживаемый HTTP-метод.');
  const operationId = normalizeOperationId(message.operationId);
  const transferId = String(message.transferId || '').slice(0, 180);
  const timeoutMs = Math.max(1000, Math.min(120000, Number(message.timeoutMs) || 60000));
  if (!['pdf-cache-upload', 'text-payload-upload', 'text-chunks-upload', 'text-download'].includes(mode)) throw new Error('Некорректный режим offscreen transfer.');
  if (!isAllowedSignedYandexUrl(url)) throw new Error('Offscreen transfer разрешён только для подписанных HTTPS-адресов Яндекс Диска.');
  if ((mode === 'text-download' && method !== 'GET') || (mode !== 'text-download' && !['PUT', 'POST'].includes(method))) {
    throw new Error('Недопустимый HTTP-метод offscreen transfer.');
  }

  const startedAt = Date.now();
  const deadlineAt = startedAt + timeoutMs;
  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), timeoutMs);
  const heartbeat = () => chrome.runtime.sendMessage({
    type: 'WEBCLIP_OFFSCREEN_TRANSFER_HEARTBEAT',
    operationId,
    transferId,
    elapsedMs: Date.now() - startedAt
  }).catch(() => {});
  heartbeat();
  const heartbeatTimer = setInterval(heartbeat, 15000);

  try {
    const fetchOptions = { method, signal: controller.signal, redirect: 'error', headers: {} };
    if (mode === 'pdf-cache-upload') {
      const record = await getPdfCacheRecord(String(spec.pdfCacheKey || ''), deadlineAt);
      if (!record) throw new Error('PDF retry-cache для offscreen upload не найден.');
      fetchOptions.headers['Content-Type'] = String(spec.contentType || 'application/pdf').slice(0, 200);
      fetchOptions.body = cachedPdfRecordToBlob(record);
      resizeSignedTransferReservation(reservation, fetchOptions.body.size);
    } else if (mode === 'text-payload-upload') {
      const record = await getTransferPayload(String(spec.payloadKey || ''), deadlineAt);
      if (!record || typeof record.text !== 'string') throw new Error('Временные данные для offscreen upload не найдены.');
      if (record.text.length > MAX_TRANSFER_TEXT_CHARS) throw new Error('Текстовые данные превышают безопасный предел offscreen transfer.');
      fetchOptions.headers['Content-Type'] = String(spec.contentType || 'application/json; charset=utf-8').slice(0, 200);
      fetchOptions.body = new Blob([record.text], { type: fetchOptions.headers['Content-Type'] });
      resizeSignedTransferReservation(reservation, fetchOptions.body.size);
    } else if (mode === 'text-chunks-upload') {
      fetchOptions.headers['Content-Type'] = String(spec.contentType || 'application/json; charset=utf-8').slice(0, 200);
      fetchOptions.body = await getTransferChunkedBlob(String(spec.payloadKey || ''), fetchOptions.headers['Content-Type'], deadlineAt);
      resizeSignedTransferReservation(reservation, fetchOptions.body.size);
    }

    const response = await fetch(url, fetchOptions);
    if (mode === 'text-download' && response.ok) {
      const maxBytes = Math.max(1024, Math.min(MAX_JOURNAL_IMPORT_BYTES, Number(spec.maxChars) || MAX_JOURNAL_IMPORT_BYTES));
      const payloadKey = `download-${transferId || Date.now()}`.slice(0, 180);
      const staged = await stageResponseBodyAsJournalImport(response, payloadKey, maxBytes, deadlineAt);
      resizeSignedTransferReservation(reservation, staged.totalBytes);
      return { transferCompleted: true, ok: true, status: response.status, payloadKey, responseBytes: staged.totalBytes, durationMs: Date.now() - startedAt };
    }

    let details = '';
    if (!response.ok) {
      try { details = (await readResponseTextBounded(response, 64 * 1024)).trim().slice(0, 500); } catch (_) {}
    }
    return { transferCompleted: true, ok: response.ok, status: response.status, details, durationMs: Date.now() - startedAt };
  } catch (error) {
    const timedOut = controller.signal.aborted || error?.name === 'AbortError';
    if (timedOut) {
      const timeoutError = new Error(`Яндекс Диск не завершил offscreen transfer за ${Math.round(timeoutMs / 1000)} с.`);
      timeoutError.code = 'YANDEX_TIMEOUT';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(abortTimer);
    clearInterval(heartbeatTimer);
    heartbeat();
  }
}

function openDbBounded(name, version, upgrade, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let request = null;
    const abortLateUpgrade = () => {
      try {
        const tx = request?.transaction;
        if (tx && tx.mode === 'versionchange') tx.abort();
      } catch (_) {}
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      abortLateUpgrade();
      reject(error instanceof Error ? error : new Error(String(error || `Не удалось открыть ${name}.`)));
    };
    const timer = setTimeout(() => fail(new Error(`Не удалось открыть ${name}: timeout IndexedDB.`)), timeoutMs);
    try {
      request = indexedDB.open(name, version);
    } catch (error) {
      fail(error);
      return;
    }
    request.onupgradeneeded = () => {
      if (settled) {
        abortLateUpgrade();
        return;
      }
      try {
        upgrade?.(request.result, request.transaction);
      } catch (error) {
        abortLateUpgrade();
        fail(error);
      }
    };
    request.onblocked = () => {
      fail(new Error(`Открытие ${name} заблокировано другой страницей расширения.`));
    };
    request.onerror = () => fail(request.error || new Error(`Не удалось открыть ${name}.`));
    request.onsuccess = () => {
      if (settled) { request.result.close(); return; }
      settled = true;
      clearTimeout(timer);
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
  });
}

function boundedIdbPhaseTimeout(deadlineAt = 0, maxMs = 20_000, label = 'IndexedDB операция') {
  const cap = Math.max(1000, Number(maxMs) || 20_000);
  const deadline = Math.max(0, Number(deadlineAt) || 0);
  if (!deadline) return cap;
  const remaining = deadline - Date.now();
  if (remaining <= 0) {
    const error = new Error(`${label}: общий deadline offscreen transfer уже истёк.`);
    error.code = 'OFFSCREEN_IDB_TIMEOUT';
    throw error;
  }
  return Math.max(1, Math.min(cap, remaining));
}

function timeoutIdbTransaction(tx, reject, timeoutMs, label) {
  let settled = false;
  const finish = (fn, value) => {
    if (settled) return false;
    settled = true;
    clearTimeout(timer);
    fn(value);
    return true;
  };
  const timer = setTimeout(() => {
    if (settled) return;
    const error = new Error(`${label}: timeout IndexedDB.`);
    error.code = 'OFFSCREEN_IDB_TIMEOUT';
    // Settle with the explicit timeout first. abort() may synchronously trigger
    // host callbacks in mocks/alternate implementations; those must not replace
    // the diagnostic error returned to the caller.
    finish(reject, error);
    try { tx.abort(); } catch (_) {}
  }, Math.max(1, Number(timeoutMs) || 1));
  return {
    resolve(resolve, value) { return finish(resolve, value); },
    reject(error) { return finish(reject, error instanceof Error ? error : new Error(String(error || `${label}: ошибка IndexedDB.`))); },
    isSettled() { return settled; }
  };
}

async function getPdfCacheRecord(key, deadlineAt = 0) {
  if (!key || key.length > 240) throw new Error('Некорректный ключ PDF retry-cache.');
  const openTimeoutMs = boundedIdbPhaseTimeout(deadlineAt, 10_000, 'Открытие PDF retry-cache');
  const db = await openDbBounded(PDF_CACHE_DB_NAME, PDF_CACHE_DB_VERSION, (database) => {
    if (!database.objectStoreNames.contains(PDF_CACHE_STORE)) database.createObjectStore(PDF_CACHE_STORE, { keyPath: 'key' });
    if (!database.objectStoreNames.contains(PDF_CACHE_META_STORE)) database.createObjectStore(PDF_CACHE_META_STORE, { keyPath: 'key' });
  }, openTimeoutMs);
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(PDF_CACHE_STORE, 'readonly');
      const guard = timeoutIdbTransaction(tx, reject, boundedIdbPhaseTimeout(deadlineAt, 20_000, 'Чтение PDF retry-cache'), 'Чтение PDF retry-cache');
      const req = tx.objectStore(PDF_CACHE_STORE).get(key);
      req.onsuccess = () => guard.resolve(resolve, req.result || null);
      req.onerror = () => guard.reject(req.error || new Error('Не удалось прочитать PDF retry-cache.'));
      tx.onabort = () => guard.reject(tx.error || new Error('Чтение PDF retry-cache прервано.'));
      tx.onerror = () => guard.reject(tx.error || new Error('Ошибка чтения PDF retry-cache.'));
    });
  } finally { db.close(); }
}

async function openTransferDb(timeoutMs = 10_000) {
  return openDbBounded(TRANSFER_DB_NAME, TRANSFER_DB_VERSION, (database) => {
    if (!database.objectStoreNames.contains(TRANSFER_STORE)) database.createObjectStore(TRANSFER_STORE, { keyPath: 'id' });
  }, timeoutMs);
}

async function getTransferPayload(id, deadlineAt = 0) {
  if (!id || id.length > 240) throw new Error('Некорректный ключ временных данных передачи.');
  const db = await openTransferDb(boundedIdbPhaseTimeout(deadlineAt, 10_000, 'Открытие временных данных передачи'));
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(TRANSFER_STORE, 'readonly');
      const guard = timeoutIdbTransaction(tx, reject, boundedIdbPhaseTimeout(deadlineAt, 20_000, 'Чтение временных данных передачи'), 'Чтение временных данных передачи');
      const req = tx.objectStore(TRANSFER_STORE).get(id);
      req.onsuccess = () => guard.resolve(resolve, req.result || null);
      req.onerror = () => guard.reject(req.error || new Error('Не удалось прочитать временные данные передачи.'));
      tx.onabort = () => guard.reject(tx.error || new Error('Чтение временных данных передачи прервано.'));
      tx.onerror = () => guard.reject(tx.error || new Error('Ошибка чтения временных данных передачи.'));
    });
  } finally { db.close(); }
}

async function getTransferChunkedBlob(baseId, mimeType = 'application/json;charset=utf-8', deadlineAt = 0) {
  if (!baseId || baseId.length > 180) throw new Error('Некорректный ключ chunked transfer.');
  const manifest = await getTransferPayload(baseId, deadlineAt);
  if (!manifest || manifest.kind !== 'journal-export-manifest') throw new Error('Manifest chunked transfer не найден.');
  const chunkCount = Math.max(0, Math.min(128, Number(manifest.chunkCount) || 0));
  if (!chunkCount) throw new Error('Chunked transfer не содержит данных.');
  const totalChars = Math.max(0, Number(manifest.totalChars) || 0);
  const declaredTotalBytes = Math.max(0, Number(manifest.totalBytes) || 0);
  if (totalChars > MAX_TRANSFER_TEXT_CHARS) throw new Error('Chunked transfer превышает безопасный предел по числу символов.');
  if (declaredTotalBytes > MAX_TRANSFER_BYTES) throw new Error('Chunked transfer превышает безопасный предел по размеру UTF-8 данных.');

  const db = await openTransferDb(boundedIdbPhaseTimeout(deadlineAt, 10_000, 'Открытие chunked transfer'));
  try {
    const parts = await new Promise((resolve, reject) => {
      const tx = db.transaction(TRANSFER_STORE, 'readonly');
      const guard = timeoutIdbTransaction(tx, reject, boundedIdbPhaseTimeout(deadlineAt, 30_000, 'Чтение chunked transfer'), 'Чтение chunked transfer');
      const fail = (error) => {
        if (!guard.reject(error)) return;
        try { tx.abort(); } catch (_) {}
      };
      const store = tx.objectStore(TRANSFER_STORE);
      const values = new Array(chunkCount);
      let pending = chunkCount;
      let actualTotalBytes = 0;
      for (let index = 0; index < chunkCount; index += 1) {
        const id = `${baseId}:chunk:${String(index).padStart(6, '0')}`;
        const req = store.get(id);
        req.onsuccess = () => {
          const record = req.result;
          const part = record?.blob instanceof Blob
            ? record.blob
            : (typeof record?.text === 'string' ? record.text : null);
          if (part === null) {
            fail(new Error(`Не найден chunk ${index + 1}/${chunkCount} временного экспорта.`));
            return;
          }
          const partBytes = part instanceof Blob ? part.size : new Blob([part]).size;
          if (partBytes > MAX_TRANSFER_CHUNK_BYTES) {
            fail(new Error(`Chunk ${index + 1}/${chunkCount} превышает безопасный byte-limit.`));
            return;
          }
          actualTotalBytes += partBytes;
          if (actualTotalBytes > MAX_TRANSFER_BYTES) {
            fail(new Error('Chunked transfer превышает безопасный общий byte-limit.'));
            return;
          }
          values[index] = part;
          pending -= 1;
          if (!pending) {
            if (declaredTotalBytes && actualTotalBytes !== declaredTotalBytes) {
              fail(new Error(`Размер chunked transfer не совпадает с manifest (${actualTotalBytes} вместо ${declaredTotalBytes} байт).`));
              return;
            }
            guard.resolve(resolve, values);
          }
        };
        req.onerror = () => fail(req.error || new Error('Не удалось прочитать chunk временного экспорта.'));
      }
      tx.onerror = () => guard.reject(tx.error || new Error('Ошибка чтения chunked transfer.'));
      tx.onabort = () => guard.reject(tx.error || new Error('Чтение chunked transfer прервано.'));
    });
    return new Blob(parts, { type: mimeType });
  } finally { db.close(); }
}

async function putTransferRecord(record, deadlineAt = 0) {
  if (!record?.id || String(record.id).length > 240) throw new Error('Некорректный ключ временных данных передачи.');
  const db = await openTransferDb(boundedIdbPhaseTimeout(deadlineAt, 10_000, 'Открытие хранилища результата offscreen transfer'));
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(TRANSFER_STORE, 'readwrite');
      const guard = timeoutIdbTransaction(tx, reject, boundedIdbPhaseTimeout(deadlineAt, 20_000, 'Сохранение результата offscreen transfer'), 'Сохранение результата offscreen transfer');
      tx.objectStore(TRANSFER_STORE).put(record);
      tx.oncomplete = () => guard.resolve(resolve);
      tx.onerror = () => guard.reject(tx.error || new Error('Не удалось сохранить результат offscreen transfer.'));
      tx.onabort = () => guard.reject(tx.error || new Error('Сохранение результата offscreen transfer прервано.'));
    });
  } finally { db.close(); }
}

async function deleteTransferPayloadGroup(baseId, maxChunkCount = 128) {
  const key = String(baseId || '');
  if (!key) return;
  const db = await openTransferDb(10_000);
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(TRANSFER_STORE, 'readwrite');
      const guard = timeoutIdbTransaction(tx, reject, 20_000, 'Удаление временных данных offscreen transfer');
      const store = tx.objectStore(TRANSFER_STORE);
      store.delete(key);
      for (let index = 0; index < Math.max(0, Math.min(128, Number(maxChunkCount) || 0)); index += 1) {
        store.delete(`${key}:chunk:${String(index).padStart(6, '0')}`);
      }
      tx.oncomplete = () => guard.resolve(resolve);
      tx.onerror = () => guard.reject(tx.error || new Error('Не удалось удалить временные данные offscreen transfer.'));
      tx.onabort = () => guard.reject(tx.error || new Error('Удаление временных данных offscreen transfer прервано.'));
    });
  } finally { db.close(); }
}

async function stageResponseBodyAsJournalImport(response, payloadKey, maxBytes, deadlineAt = 0) {
  const cap = Math.max(1024, Math.min(MAX_JOURNAL_IMPORT_BYTES, Number(maxBytes) || MAX_JOURNAL_IMPORT_BYTES));
  const declared = Number(response?.headers?.get?.('content-length') || 0);
  if (declared && declared > cap) throw new Error(`Резервная копия журнала превышает безопасный предел ${Math.ceil(cap / 1024 / 1024)} МБ.`);
  if (!response?.body?.getReader) {
    throw new Error('Ответ резервной копии не поддерживает потоковое чтение; безопасный bounded import невозможен.');
  }

  const reader = response.body.getReader();
  const buffer = new Uint8Array(JOURNAL_IMPORT_CHUNK_BYTES);
  let bufferedBytes = 0;
  let totalBytes = 0;
  let chunkCount = 0;
  const flush = async () => {
    if (!bufferedBytes) return;
    const bytes = buffer.slice(0, bufferedBytes);
    const blob = new Blob([bytes], { type: 'application/json' });
    await putTransferRecord({
      id: `${payloadKey}:chunk:${String(chunkCount).padStart(6, '0')}`,
      kind: 'journal-import-chunk-blob',
      baseId: payloadKey,
      chunkIndex: chunkCount,
      blob,
      byteCount: blob.size,
      createdAt: Date.now()
    }, deadlineAt);
    chunkCount += 1;
    bufferedBytes = 0;
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const bytes = value instanceof Uint8Array ? value : new Uint8Array(value || 0);
      totalBytes += bytes.byteLength;
      if (totalBytes > cap) {
        try { await reader.cancel(); } catch (_) {}
        throw new Error(`Резервная копия журнала превышает безопасный предел ${Math.ceil(cap / 1024 / 1024)} МБ.`);
      }
      let offset = 0;
      while (offset < bytes.byteLength) {
        const copyBytes = Math.min(buffer.length - bufferedBytes, bytes.byteLength - offset);
        buffer.set(bytes.subarray(offset, offset + copyBytes), bufferedBytes);
        bufferedBytes += copyBytes;
        offset += copyBytes;
        if (bufferedBytes === buffer.length) await flush();
      }
    }
    await flush();
    if (!chunkCount) {
      await putTransferRecord({
        id: `${payloadKey}:chunk:000000`,
        kind: 'journal-import-chunk-blob',
        baseId: payloadKey,
        chunkIndex: 0,
        blob: new Blob([], { type: 'application/json' }),
        byteCount: 0,
        createdAt: Date.now()
      }, deadlineAt);
      chunkCount = 1;
    }
    await putTransferRecord({
      id: payloadKey,
      kind: 'journal-import-manifest',
      chunkCount,
      totalBytes,
      createdAt: Date.now()
    }, deadlineAt);
    return { payloadKey, chunkCount, totalBytes };
  } catch (error) {
    await deleteTransferPayloadGroup(payloadKey, chunkCount + 2).catch(() => {});
    throw error;
  } finally {
    try { reader.releaseLock(); } catch (_) {}
  }
}

async function putTransferPayload(record, deadlineAt = 0) {
  if (!record?.id || record.id.length > 240 || typeof record.text !== 'string' || record.text.length > MAX_TRANSFER_TEXT_CHARS) {
    throw new Error('Некорректные временные данные передачи.');
  }
  const db = await openTransferDb(boundedIdbPhaseTimeout(deadlineAt, 10_000, 'Открытие хранилища результата offscreen transfer'));
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(TRANSFER_STORE, 'readwrite');
      const guard = timeoutIdbTransaction(tx, reject, boundedIdbPhaseTimeout(deadlineAt, 20_000, 'Сохранение результата offscreen transfer'), 'Сохранение результата offscreen transfer');
      tx.objectStore(TRANSFER_STORE).put(record);
      tx.oncomplete = () => guard.resolve(resolve);
      tx.onerror = () => guard.reject(tx.error || new Error('Не удалось сохранить результат offscreen transfer.'));
      tx.onabort = () => guard.reject(tx.error || new Error('Сохранение результата offscreen transfer прервано.'));
    });
  } finally { db.close(); }
}

async function readResponseTextBounded(response, maxBytes) {
  const cap = Math.max(1024, Number(maxBytes) || 1024);
  const declared = Number(response?.headers?.get?.('content-length') || 0);
  if (declared && declared > cap) throw new Error(`Ответ превышает безопасный предел ${Math.ceil(cap / 1024 / 1024)} МБ.`);
  if (!response?.body?.getReader) {
    if (!declared) throw new Error('Внешний ответ не поддерживает потоковое чтение и не сообщает Content-Length; безопасно ограничить его размер невозможно.');
    const text = await response.text();
    if (new Blob([text]).size > cap) throw new Error(`Ответ превышает безопасный предел ${Math.ceil(cap / 1024 / 1024)} МБ.`);
    return text;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parts = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value?.byteLength || 0;
      if (total > cap) {
        try { await reader.cancel(); } catch (_) {}
        throw new Error(`Ответ превышает безопасный предел ${Math.ceil(cap / 1024 / 1024)} МБ.`);
      }
      parts.push(decoder.decode(value, { stream: true }));
    }
    parts.push(decoder.decode());
    return parts.join('');
  } finally {
    try { reader.releaseLock(); } catch (_) {}
  }
}

function cachedPdfRecordToBlob(record) {
  if (record?.pdfBlob instanceof Blob) {
    if (record.pdfBlob.size > Math.floor(MAX_PDF_BASE64_CHARS * 3 / 4)) {
      throw new Error('PDF превышает безопасный предел offscreen-буфера.');
    }
    return record.pdfBlob.type === 'application/pdf'
      ? record.pdfBlob
      : new Blob([record.pdfBlob], { type: 'application/pdf' });
  }
  const legacyBase64 = typeof record?.pdfBase64 === 'string' ? record.pdfBase64 : '';
  if (!legacyBase64) throw new Error('PDF cache не содержит данных PDF.');
  if (legacyBase64.length > MAX_PDF_BASE64_CHARS) {
    throw new Error('Legacy PDF cache превышает новый безопасный предел; сформируйте PDF заново.');
  }
  return base64ToBlob(legacyBase64, 'application/pdf');
}

function base64ToBlob(base64, type) {
  const chunkChars = 4 * 1024 * 1024;
  const chunks = [];
  let offset = 0;
  while (offset < base64.length) {
    let end = Math.min(base64.length, offset + chunkChars);
    if (end < base64.length) end -= (end - offset) % 4;
    if (end <= offset) throw new Error('Некорректный Base64 PDF.');
    const binary = atob(base64.slice(offset, end));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    chunks.push(bytes);
    offset = end;
  }
  return new Blob(chunks, { type });
}

function revokeUrl(url) {
  if (!url || !blobUrls.has(url)) return;
  const record = blobUrls.get(url) || {};
  clearTimeout(record.timer);
  blobUrls.delete(url);
  activeBlobUrlBytes = Math.max(0, activeBlobUrlBytes - Math.max(0, Number(record.size) || 0));
  URL.revokeObjectURL(url);
  scheduleIdleClose();
}

scheduleIdleClose();
