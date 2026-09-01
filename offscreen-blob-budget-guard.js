(() => {
  'use strict';

  // P0-065: reserve/count large offscreen Blob materialization before native
  // Blob construction. Existing offscreen.js signed-transfer and Blob-URL
  // ledgers remain independent second-line ownership/admission controls.
  const INSTALL_MARKER = '__webclipOffscreenBlobBudgetGuardV1';
  const NativeBlob = globalThis.Blob;
  const nativeFetch = typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null;
  const nativeCreateObjectURL = globalThis.URL?.createObjectURL?.bind(globalThis.URL) || null;
  const nativeRevokeObjectURL = globalThis.URL?.revokeObjectURL?.bind(globalThis.URL) || null;
  const TRACK_THRESHOLD_BYTES = 1024 * 1024;
  const MAX_SINGLE_BLOB_BYTES = 64 * 1024 * 1024;
  const MAX_ACTIVE_BLOB_MATERIALIZATIONS = 12;
  const MAX_ACTIVE_BLOB_MATERIALIZATION_BYTES = 256 * 1024 * 1024;
  const MAX_BLOB_PARTS = 4096;
  const ERROR_CODE = 'OFFSCREEN_BLOB_MATERIALIZATION_BUDGET_EXCEEDED';
  const reservations = new WeakMap();
  const urlOwners = new Map();
  let activeCount = 0;
  let activeBytes = 0;
  const stats = {
    constructorAdmissions: 0,
    existingBlobAdmissions: 0,
    rejectedAdmissions: 0,
    releasedReservations: 0,
    fetchAdoptions: 0,
    urlAdoptions: 0,
    activeCount: 0,
    activeBytes: 0,
    peakCount: 0,
    peakBytes: 0
  };

  function syncStats() {
    stats.activeCount = activeCount;
    stats.activeBytes = activeBytes;
    stats.peakCount = Math.max(stats.peakCount, activeCount);
    stats.peakBytes = Math.max(stats.peakBytes, activeBytes);
  }

  function makeBudgetError(reason, bytes = 0) {
    const error = new Error(`Offscreen Blob materialization rejected (${reason}); requested=${bytes}, active=${activeBytes}.`);
    error.code = ERROR_CODE;
    error.reason = reason;
    error.requestedBytes = Math.max(0, Number(bytes) || 0);
    return error;
  }

  function utf8LengthBounded(value, stopAfter = MAX_SINGLE_BLOB_BYTES) {
    const text = String(value == null ? '' : value);
    const stop = Math.max(0, Number(stopAfter) || 0);
    let bytes = 0;
    for (let index = 0; index < text.length; index += 1) {
      const code = text.charCodeAt(index);
      if (code <= 0x7f) bytes += 1;
      else if (code <= 0x7ff) bytes += 2;
      else if (code >= 0xd800 && code <= 0xdbff && index + 1 < text.length) {
        const next = text.charCodeAt(index + 1);
        if (next >= 0xdc00 && next <= 0xdfff) { bytes += 4; index += 1; }
        else bytes += 3;
      } else bytes += 3;
      if (bytes > stop) return stop + 1;
    }
    return bytes;
  }

  function partByteLength(part, remaining) {
    if (part instanceof NativeBlob) return Math.max(0, Number(part.size) || 0);
    if (part instanceof ArrayBuffer) return part.byteLength;
    if (ArrayBuffer.isView(part)) return part.byteLength;
    return utf8LengthBounded(part, remaining);
  }

  function estimateParts(parts) {
    if (parts == null) return { partCount: 0, bytes: 0 };
    let partCount = 0;
    let bytes = 0;
    for (const part of parts) {
      partCount += 1;
      if (partCount > MAX_BLOB_PARTS) throw makeBudgetError('part-count', bytes);
      const remaining = Math.max(0, MAX_SINGLE_BLOB_BYTES - bytes);
      bytes += partByteLength(part, remaining);
      if (bytes > MAX_SINGLE_BLOB_BYTES) throw makeBudgetError('single-bytes', bytes);
    }
    return { partCount, bytes };
  }

  function reserveBytes(bytes, source = 'constructor') {
    const size = Math.max(0, Math.floor(Number(bytes) || 0));
    if (size > MAX_SINGLE_BLOB_BYTES) {
      stats.rejectedAdmissions += 1;
      throw makeBudgetError('single-bytes', size);
    }
    if (size < TRACK_THRESHOLD_BYTES) return null;
    if (activeCount + 1 > MAX_ACTIVE_BLOB_MATERIALIZATIONS) {
      stats.rejectedAdmissions += 1;
      throw makeBudgetError('count', size);
    }
    if (activeBytes + size > MAX_ACTIVE_BLOB_MATERIALIZATION_BYTES) {
      stats.rejectedAdmissions += 1;
      throw makeBudgetError('aggregate-bytes', size);
    }
    const reservation = { bytes: size, refs: 0, released: false, source, timer: 0 };
    activeCount += 1;
    activeBytes += size;
    syncStats();
    return reservation;
  }

  function releaseReservation(reservation) {
    if (!reservation || reservation.released) return;
    reservation.released = true;
    if (reservation.timer) clearTimeout(reservation.timer);
    activeCount = Math.max(0, activeCount - 1);
    activeBytes = Math.max(0, activeBytes - reservation.bytes);
    stats.releasedReservations += 1;
    syncStats();
  }

  function attachReservation(blob, reservation) {
    if (!reservation || !(blob instanceof NativeBlob)) return null;
    reservations.set(blob, reservation);
    reservation.timer = setTimeout(() => {
      if (!reservation.released && reservation.refs === 0) releaseReservation(reservation);
    }, 0);
    return reservation;
  }

  function reservationFor(blob, source = 'existing') {
    if (!(blob instanceof NativeBlob)) return null;
    let reservation = reservations.get(blob) || null;
    if (reservation && !reservation.released) return reservation;
    reservation = reserveBytes(blob.size, source);
    if (reservation) {
      stats.existingBlobAdmissions += 1;
      attachReservation(blob, reservation);
    }
    return reservation;
  }

  function adopt(blob, source) {
    const reservation = reservationFor(blob, source);
    if (!reservation) return null;
    if (reservation.timer) { clearTimeout(reservation.timer); reservation.timer = 0; }
    reservation.refs += 1;
    return reservation;
  }

  function releaseAdoption(reservation) {
    if (!reservation || reservation.released) return;
    reservation.refs = Math.max(0, reservation.refs - 1);
    if (reservation.refs === 0) releaseReservation(reservation);
  }

  function GuardedBlob(parts = [], options = undefined) {
    if (!new.target) throw new TypeError("Failed to construct 'Blob': Please use the 'new' operator.");
    const estimate = estimateParts(parts);
    const reservation = reserveBytes(estimate.bytes, 'constructor');
    let blob;
    try {
      blob = Reflect.construct(NativeBlob, [parts, options], NativeBlob);
    } catch (error) {
      releaseReservation(reservation);
      throw error;
    }
    if (reservation) {
      stats.constructorAdmissions += 1;
      if (Number(blob.size) > reservation.bytes) {
        releaseReservation(reservation);
        const exact = reserveBytes(blob.size, 'constructor-exact');
        attachReservation(blob, exact);
      } else attachReservation(blob, reservation);
    }
    return blob;
  }
  GuardedBlob.prototype = NativeBlob.prototype;
  Object.setPrototypeOf(GuardedBlob, NativeBlob);
  try { Object.defineProperty(GuardedBlob, 'name', { value: 'Blob' }); } catch (_) {}

  function guardedFetch(input, init = undefined) {
    const body = init?.body;
    const reservation = body instanceof NativeBlob ? adopt(body, 'fetch') : null;
    if (reservation) stats.fetchAdoptions += 1;
    let actual;
    try { actual = nativeFetch(input, init); }
    catch (error) { releaseAdoption(reservation); throw error; }
    return Promise.resolve(actual).finally(() => releaseAdoption(reservation));
  }

  function guardedCreateObjectURL(blob) {
    const reservation = blob instanceof NativeBlob ? adopt(blob, 'object-url') : null;
    let url;
    try { url = nativeCreateObjectURL(blob); }
    catch (error) { releaseAdoption(reservation); throw error; }
    if (reservation) {
      stats.urlAdoptions += 1;
      urlOwners.set(String(url), reservation);
    }
    return url;
  }

  function guardedRevokeObjectURL(url) {
    const key = String(url || '');
    const reservation = urlOwners.get(key) || null;
    urlOwners.delete(key);
    try { return nativeRevokeObjectURL(url); }
    finally { releaseAdoption(reservation); }
  }

  function install() {
    if (globalThis[INSTALL_MARKER]) return { installed: true, alreadyInstalled: true };
    if (typeof NativeBlob !== 'function') return { installed: false, reason: 'Blob unavailable' };
    if (!nativeCreateObjectURL || !nativeRevokeObjectURL) return { installed: false, reason: 'Blob URL API unavailable' };
    globalThis.Blob = GuardedBlob;
    if (nativeFetch) globalThis.fetch = guardedFetch;
    globalThis.URL.createObjectURL = guardedCreateObjectURL;
    globalThis.URL.revokeObjectURL = guardedRevokeObjectURL;
    globalThis[INSTALL_MARKER] = true;
    return { installed: true };
  }

  globalThis.WebClipOffscreenBlobBudgetGuard = Object.freeze({
    TRACK_THRESHOLD_BYTES,
    MAX_SINGLE_BLOB_BYTES,
    MAX_ACTIVE_BLOB_MATERIALIZATIONS,
    MAX_ACTIVE_BLOB_MATERIALIZATION_BYTES,
    MAX_BLOB_PARTS,
    ERROR_CODE,
    utf8LengthBounded,
    estimateParts,
    reserveBytes,
    releaseReservation,
    reservationFor,
    install,
    stats
  });

  install();
})();
