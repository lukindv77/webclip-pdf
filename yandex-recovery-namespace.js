'use strict';

// P0-073 authority for durable remote-save recovery. A checkpoint may be
// interpreted only inside the exact Yandex account/root namespace it bound.
(() => {
  const MAX_ACCOUNT_UID_CHARS = 1024;
  const MAX_PATH_CHARS = 4096;

  function fail(code, message) {
    const error = new Error(message);
    error.code = code;
    throw error;
  }

  function normalizeAccountUid(value) {
    return String(value || '').trim().slice(0, MAX_ACCOUNT_UID_CHARS);
  }

  function normalizeDiskPath(value) {
    let path = String(value || '').trim().slice(0, MAX_PATH_CHARS).replace(/\\/g, '/').replace(/^disk:/i, '');
    if (!path) return '';
    if (!path.startsWith('/')) path = `/${path}`;
    const stack = [];
    for (const segment of path.split('/')) {
      if (!segment || segment === '.') continue;
      if (segment === '..') {
        if (stack.length) stack.pop();
        continue;
      }
      stack.push(segment);
    }
    return `/${stack.join('/')}` || '/';
  }

  function isPathWithinRoot(path, root) {
    const normalizedPath = normalizeDiskPath(path);
    const normalizedRoot = normalizeDiskPath(root);
    if (!normalizedPath || !normalizedRoot) return false;
    return normalizedPath === normalizedRoot
      || normalizedRoot === '/'
      || normalizedPath.startsWith(`${normalizedRoot}/`);
  }

  function checkpointData(receipt) {
    const data = receipt?.data && typeof receipt.data === 'object' ? receipt.data : receipt;
    return data && typeof data === 'object' ? data : {};
  }

  function validateBoundRecoveryReceipt(receipt) {
    const data = checkpointData(receipt);
    const accountUid = normalizeAccountUid(data.accountUid);
    const rootPath = normalizeDiskPath(data.rootPath);
    const remotePath = normalizeDiskPath(data.remotePath);
    if (!accountUid) {
      fail('WEBCLIP_REMOTE_RECOVERY_ACCOUNT_UNKNOWN', 'Recovery-checkpoint не содержит привязку к аккаунту Яндекс Диска.');
    }
    if (!rootPath) {
      fail('WEBCLIP_REMOTE_RECOVERY_ROOT_UNKNOWN', 'Recovery-checkpoint не содержит привязку к корневому каталогу Яндекс Диска.');
    }
    if (!remotePath || !isPathWithinRoot(remotePath, rootPath)) {
      fail('WEBCLIP_REMOTE_RECOVERY_PATH_OUTSIDE_ROOT', 'Путь recovery-checkpoint находится вне привязанного корневого каталога Яндекс Диска.');
    }
    return Object.freeze({ accountUid, rootPath, remotePath });
  }

  function proveRecoveryNamespace({ receipt, currentAccountUid } = {}) {
    const binding = validateBoundRecoveryReceipt(receipt);
    const current = normalizeAccountUid(currentAccountUid);
    if (!current) {
      fail('WEBCLIP_REMOTE_RECOVERY_AUTH_REQUIRED', 'Не удалось доказать текущий аккаунт Яндекс Диска для recovery-checkpoint.');
    }
    if (current !== binding.accountUid) {
      fail('WEBCLIP_REMOTE_RECOVERY_ACCOUNT_MISMATCH', 'Текущий аккаунт Яндекс Диска не совпадает с аккаунтом recovery-checkpoint.');
    }
    return binding;
  }

  globalThis.WebClipYandexRecoveryNamespace = Object.freeze({
    normalizeAccountUid,
    normalizeDiskPath,
    isPathWithinRoot,
    validateBoundRecoveryReceipt,
    proveRecoveryNamespace
  });
})();
