(() => {
  'use strict';

  // P0-033: signed Yandex Disk transport URLs are opaque capabilities. Their
  // path/query/fragment must never enter OperationLog, including nested metadata.
  const INSTALL_MARKER = '__webclipOperationLogRedactionGuardV1';
  const REDACTED_SIGNED_PATH = '[REDACTED_SIGNED_PATH]';

  function isOpaqueYandexDiskSignedHost(value) {
    const host = String(value || '').trim().toLowerCase().replace(/\.$/, '');
    return host === 'disk.yandex.net'
      || host.endsWith('.disk.yandex.net')
      || host === 'disk.yandex.ru'
      || host.endsWith('.disk.yandex.ru');
  }

  function redactOpaqueSignedUrl(value) {
    if (typeof value !== 'string' || !value) return '';
    try {
      const url = new URL(value);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
      if (!isOpaqueYandexDiskSignedHost(url.hostname)) return '';
      return `${url.origin}/${REDACTED_SIGNED_PATH}`;
    } catch (_) {
      return '';
    }
  }

  function install() {
    if (globalThis[INSTALL_MARKER]) return { installed: true, alreadyInstalled: true };
    const originalSafeUrl = globalThis.safeUrlForOperationLog;
    const originalSanitizeValue = globalThis.sanitizeOperationLogValue;
    if (typeof originalSafeUrl !== 'function' || typeof originalSanitizeValue !== 'function') {
      throw new Error('P0-033: OperationLog sanitizer bindings unavailable during bootstrap.');
    }

    const guardedSafeUrl = function guardedSafeUrlForOperationLog(value) {
      return redactOpaqueSignedUrl(value) || originalSafeUrl(value);
    };
    const guardedSanitizeValue = function guardedSanitizeOperationLogValue(value, key = '', depth = 0) {
      const opaque = redactOpaqueSignedUrl(value);
      if (opaque) return opaque;
      return originalSanitizeValue(value, key, depth);
    };

    globalThis.safeUrlForOperationLog = guardedSafeUrl;
    globalThis.sanitizeOperationLogValue = guardedSanitizeValue;
    globalThis[INSTALL_MARKER] = true;
    return { installed: true };
  }

  globalThis.WebClipOperationLogRedactionGuard = Object.freeze({
    REDACTED_SIGNED_PATH,
    isOpaqueYandexDiskSignedHost,
    redactOpaqueSignedUrl,
    install
  });

  install();
})();
