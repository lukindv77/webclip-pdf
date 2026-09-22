const el = (id) => document.getElementById(id);
const connectionStatus = el('connectionStatus');
const clientId = el('clientId');
const redirectUri = el('redirectUri');
const rootPath = el('rootPath');
const manualToken = el('manualToken');
const confirmationCode = el('confirmationCode');
const pendingStatus = el('pendingStatus');
const message = el('message');
const browser = el('browser');
const currentPathEl = el('currentPath');
const folderList = el('folderList');
const newFolderName = el('newFolderName');
const backupEnabled = el('backupEnabled');
const backupIntervalMinutes = el('backupIntervalMinutes');
const backupRetryMinutes = el('backupRetryMinutes');
const backupRemotePath = el('backupRemotePath');
const backupStatus = el('backupStatus');
const publicLinksEnabled = el('publicLinksEnabled');
const operationLogRetentionHours = el('operationLogRetentionHours');
const operationLogSearch = el('operationLogSearch');
const operationLogStatus = el('operationLogStatus');
const operationLogList = el('operationLogList');
const operationLogDetail = el('operationLogDetail');
const operationLogTitle = el('operationLogTitle');
const operationLogDescription = el('operationLogDescription');
const operationLogId = el('operationLogId');
const operationLogJson = el('operationLogJson');
const storageHealthStatus = el('storageHealthStatus');
const refreshStorageHealthButton = el('refreshStorageHealth');
const requestStoragePersistenceButton = el('requestStoragePersistence');
const exportUserSettingsButton = el('exportUserSettings');
const importUserSettingsButton = el('importUserSettings');
const importUserSettingsFile = el('importUserSettingsFile');
const userSettingsStatus = el('userSettingsStatus');
const USER_SETTINGS_MAX_IMPORT_BYTES = 256 * 1024;
const USER_SETTINGS_FILE_READ_TIMEOUT_MS = 10_000;
let currentBrowsePath = '/';
let folderBrowseGeneration = 0;
let folderBrowseLoadingGeneration = 0;
let activeBackupOperationId = '';
let backupProgressActive = false;
let backupProgressReturnFocus = null;
let backupProgressPortController = null;
let operationLogs = [];
let selectedOperationLogId = '';
let operationLogListGeneration = 0;
let operationLogDetailGeneration = 0;
let operationLogSelectionGeneration = 0;
let operationLogDetailRequestInFlight = false;
let queuedOperationLogDetailRequest = null;
let yandexStatusGeneration = 0;
let activeYandexAuthAttemptId = '';
let backupStatusGeneration = 0;
const OPERATION_LOG_RENDER_BATCH_SIZE = 80;
const OPERATION_LOG_SEARCH_DEBOUNCE_MS = 120;
let operationLogRenderGeneration = 0;
let operationLogSearchTimer = 0;
let selectedOperationLogValue = null;
let selectedOperationLogJsonText = '';

function createReconnectableProgressPort(name, onMessage, isActive = () => false) {
  let port = null;
  let reconnectTimer = 0;
  let stopped = false;
  let reconnectDelayMs = 250;

  const stop = () => {
    stopped = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = 0;
    const current = port;
    port = null;
    if (current) {
      try { current.disconnect(); } catch (_) {}
    }
  };

  const scheduleReconnect = () => {
    // A journal/options page may stay open for hours while MV3 workers are
    // routinely stopped. Do not create an endless connect -> idle-stop ->
    // reconnect wake cycle when there is no operation whose progress matters.
    if (stopped || reconnectTimer || !isActive()) return;
    const delay = reconnectDelayMs;
    reconnectDelayMs = Math.min(5000, Math.max(250, reconnectDelayMs * 2));
    reconnectTimer = setTimeout(() => {
      reconnectTimer = 0;
      if (isActive()) connect();
    }, delay);
  };

  const connect = () => {
    if (stopped || port || !isActive()) return;
    let nextPort;
    try {
      nextPort = chrome.runtime.connect({ name });
    } catch (error) {
      if (/Extension context invalidated/i.test(String(error?.message || error || ''))) {
        stop();
        return;
      }
      scheduleReconnect();
      return;
    }
    port = nextPort;
    reconnectDelayMs = 250;
    nextPort.onMessage.addListener(onMessage);
    nextPort.onDisconnect.addListener(() => {
      if (port !== nextPort || stopped) return;
      port = null;
      let disconnectError = '';
      try { disconnectError = String(chrome.runtime.lastError?.message || ''); } catch (_) {}
      if (/Extension context invalidated/i.test(disconnectError)) {
        stop();
        return;
      }
      scheduleReconnect();
    });
  };

  const ensureConnected = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = 0;
    }
    connect();
  };

  const suspend = () => {
    if (isActive()) return;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = 0;
    reconnectDelayMs = 250;
    const current = port;
    port = null;
    if (current) {
      try { current.disconnect(); } catch (_) {}
    }
  };

  window.addEventListener('pagehide', stop, { once: true });
  return { stop, ensureConnected, suspend };
}


const READ_ONLY_RUNTIME_MAX_IN_FLIGHT = 4;
const readOnlyRuntimeInFlight = new Map();

function readOnlyRuntimeMessageKey(message) {
  try { return JSON.stringify(message); } catch (_) { return String(message?.type || 'read'); }
}

function getReadOnlyRuntimeMessageActual(message) {
  const key = readOnlyRuntimeMessageKey(message);
  let actual = readOnlyRuntimeInFlight.get(key);
  if (actual) return actual;
  if (readOnlyRuntimeInFlight.size >= READ_ONLY_RUNTIME_MAX_IN_FLIGHT) {
    return Promise.reject(new Error('Слишком много незавершённых операций чтения WebClip. Дождитесь завершения предыдущих запросов.'));
  }
  actual = Promise.resolve().then(() => chrome.runtime.sendMessage(message));
  readOnlyRuntimeInFlight.set(key, actual);
  void actual.finally(() => {
    if (readOnlyRuntimeInFlight.get(key) === actual) readOnlyRuntimeInFlight.delete(key);
  }).catch(() => {});
  return actual;
}

function waitReadOnlyRuntimeMessage(actual, timeoutMs = 30000, label = 'Чтение данных WebClip') {
  const waitMs = Math.max(1000, Math.min(120000, Number(timeoutMs) || 30000));
  let timer = 0;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} не завершилось за ${Math.ceil(waitMs / 1000)} с.`)), waitMs);
  });
  return Promise.race([actual, deadline]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function sendReadOnlyRuntimeMessage(message, timeoutMs = 30000, label = 'Чтение данных WebClip') {
  return waitReadOnlyRuntimeMessage(getReadOnlyRuntimeMessageActual(message), timeoutMs, label);
}

const backupProgressBackdrop = el('backupProgressBackdrop');
const backupProgressDialog = el('backupProgressDialog');
const backupProgressIcon = el('backupProgressIcon');
const backupProgressKicker = el('backupProgressKicker');
const backupProgressTitle = el('backupProgressTitle');
const backupProgressText = el('backupProgressText');
const backupProgressBar = el('backupProgressBar');
const backupProgressPercent = el('backupProgressPercent');
const backupProgressStages = el('backupProgressStages');
const backupProgressClose = el('backupProgressClose');
const backupProgressOperationId = el('backupProgressOperationId');
const optionsPage = document.querySelector('main.page');

const manifest = chrome.runtime.getManifest();
el('extensionVersion').textContent = `Версия расширения: ${manifest.version}`;

init().catch((error) => showMessage(error?.message || String(error), 'error'));

async function init() {
  bindEvents();
  await Promise.all([refreshStatus(), refreshOperationLogs(), refreshStorageHealth()]);
}

function bindEvents() {
  backupProgressClose.addEventListener('click', closeBackupProgress);
  refreshStorageHealthButton.addEventListener('click', () => runBusy(refreshStorageHealthButton, async () => {
    await refreshStorageHealth();
  }));
  requestStoragePersistenceButton.addEventListener('click', () => runBusy(requestStoragePersistenceButton, async () => {
    if (!globalThis.navigator?.storage?.persist) {
      throw new Error('Этот Chrome не предоставляет StorageManager.persist() на странице расширения.');
    }
    const granted = Boolean(await navigator.storage.persist());
    await refreshStorageHealth();
    showMessage(
      granted
        ? 'Chrome подтвердил persistent storage для WebClip.'
        : 'Chrome не подтвердил persistent storage. WebClip продолжит работать с обычной политикой хранения.',
      granted ? 'ok' : ''
    );
  }));
  exportUserSettingsButton.addEventListener('click', () => runBusy(exportUserSettingsButton, async () => {
    userSettingsStatus.className = 'status neutral';
    userSettingsStatus.textContent = 'Подготавливаем безопасный экспорт настроек…';
    const response = await chrome.runtime.sendMessage({ type: 'WEBCLIP_USER_SETTINGS_EXPORT' });
    requireOk(response);
    const payload = response.document;
    const json = JSON.stringify(payload, null, 2);
    if (!json || json.length > USER_SETTINGS_MAX_IMPORT_BYTES) {
      throw new Error('Экспорт настроек превысил безопасный размер WebClip.');
    }
    const date = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    const filename = `WebClip_Settings_${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}.json`;
    downloadSmallJson(json, filename);
    userSettingsStatus.className = 'status ok';
    userSettingsStatus.textContent = 'Настройки экспортированы. OAuth/PKCE, журнал, checkpoint\'ы и OperationLog не включены.';
    showMessage('Файл пользовательских настроек передан браузеру.', 'ok');
  }));

  importUserSettingsButton.addEventListener('click', () => {
    importUserSettingsFile.value = '';
    importUserSettingsFile.click();
  });

  importUserSettingsFile.addEventListener('change', async () => {
    const file = importUserSettingsFile.files?.[0] || null;
    if (!file) return;
    importUserSettingsButton.disabled = true;
    exportUserSettingsButton.disabled = true;
    showMessage('', '');
    try {
      if (!Number.isFinite(file.size) || file.size <= 0) throw new Error('Файл настроек пуст.');
      if (file.size > USER_SETTINGS_MAX_IMPORT_BYTES) {
        throw new Error(`Файл настроек слишком большой. Максимум ${Math.floor(USER_SETTINGS_MAX_IMPORT_BYTES / 1024)} КБ.`);
      }
      userSettingsStatus.className = 'status neutral';
      userSettingsStatus.textContent = 'Проверяем схему и безопасность файла настроек…';
      const text = await readSmallFileTextBounded(file);
      let document;
      try { document = JSON.parse(text); }
      catch (_) { throw new Error('Файл настроек содержит некорректный JSON.'); }
      const response = await chrome.runtime.sendMessage({
        type: 'WEBCLIP_USER_SETTINGS_IMPORT',
        document
      });
      requireOk(response);
      if (response.pending) {
        userSettingsStatus.className = 'status neutral';
        userSettingsStatus.textContent = 'Chrome ещё завершает сохранение настроек. Не повторяйте импорт этого файла; WebClip выполнит reconciliation при следующем запуске service worker.';
        showMessage('Импорт принят, но результат chrome.storage.set пока не подтверждён. Не повторяйте операцию.', '');
        return;
      }
      await Promise.all([refreshStatus(), refreshOperationLogs()]);
      userSettingsStatus.className = response.reconciliationPending ? 'status neutral' : 'status ok';
      userSettingsStatus.textContent = response.reconciliationPending
        ? `Настройки сохранены (${Number(response.appliedCount || 0)}), но reconciliation backup scheduler будет повторён автоматически. OAuth-сессия не изменена.`
        : `Импортировано настроек: ${Number(response.appliedCount || 0)}. Текущая OAuth-сессия не изменена.`;
      showMessage(
        response.reconciliationPending
          ? 'Настройки сохранены. Служебная синхронизация scheduler будет повторена автоматически.'
          : 'Пользовательские настройки импортированы. OAuth-сессия и журнал не изменялись.',
        response.reconciliationPending ? '' : 'ok'
      );
    } catch (error) {
      userSettingsStatus.className = 'status error';
      userSettingsStatus.textContent = error?.message || String(error);
      showMessage(error?.message || String(error), 'error');
    } finally {
      importUserSettingsButton.disabled = false;
      exportUserSettingsButton.disabled = false;
      importUserSettingsFile.value = '';
    }
  });
  el('copyBackupProgressOperationId').addEventListener('click', () => copyText(activeBackupOperationId, 'operationId скопирован.'));
  backupProgressPortController = createReconnectableProgressPort('webclip-journal-backup-progress', (message) => {
    if (message?.type !== 'WEBCLIP_JOURNAL_BACKUP_PROGRESS') return;
    if (!activeBackupOperationId || message.operationId !== activeBackupOperationId) return;
    updateBackupProgress(message);
  }, () => backupProgressActive);
  window.addEventListener('beforeunload', (event) => {
    if (!backupProgressActive) return;
    event.preventDefault();
    event.returnValue = '';
  });
  el('openAuthHelp').addEventListener('click', () => runBusy(el('openAuthHelp'), async () => {
    const response = await chrome.runtime.sendMessage({ type: 'WEBCLIP_OPEN_INTERNAL_PAGE', page: 'yandex-auth-help.html' });
    requireOk(response);
  }));

  el('copyRedirect').addEventListener('click', () => runBusy(el('copyRedirect'), async () => {
    await navigator.clipboard.writeText(redirectUri.value);
    showMessage('Redirect URI скопирован.', 'ok');
  }));

  el('startAuth').addEventListener('click', () => runBusy(el('startAuth'), async () => {
    activeYandexAuthAttemptId = '';
    const response = await chrome.runtime.sendMessage({
      type: 'WEBCLIP_YANDEX_START_AUTH',
      clientId: clientId.value.trim()
    });
    requireOk(response);
    activeYandexAuthAttemptId = String(response.authAttemptId || '').trim();
    if (!activeYandexAuthAttemptId) throw new Error('WebClip не получил идентификатор текущей попытки Яндекс OAuth. Начните авторизацию заново.');
    await refreshStatus(response);
    confirmationCode.focus();
    showMessage('Страница Яндекс OAuth открыта. Разрешите доступ, скопируйте показанный код и вернитесь сюда.', 'ok');
  }));

  el('finishAuth').addEventListener('click', () => runBusy(el('finishAuth'), async () => {
    const response = await chrome.runtime.sendMessage({
      type: 'WEBCLIP_YANDEX_FINISH_AUTH',
      authAttemptId: activeYandexAuthAttemptId,
      code: confirmationCode.value.trim()
    });
    requireOk(response);
    activeYandexAuthAttemptId = '';
    confirmationCode.value = '';
    await refreshStatus(response);
    showMessage('Яндекс Диск подключён.', 'ok');
  }));

  confirmationCode.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') el('finishAuth').click();
  });

  el('useManualToken').addEventListener('click', () => runBusy(el('useManualToken'), async () => {
    const response = await chrome.runtime.sendMessage({
      type: 'WEBCLIP_YANDEX_SET_MANUAL_TOKEN',
      token: manualToken.value.trim()
    });
    requireOk(response);
    manualToken.value = '';
    await refreshStatus(response);
    showMessage('Тестовый OAuth-токен принят.', 'ok');
  }));

  el('disconnect').addEventListener('click', () => runBusy(el('disconnect'), async () => {
    const response = await chrome.runtime.sendMessage({ type: 'WEBCLIP_YANDEX_DISCONNECT' });
    requireOk(response);
    await refreshStatus(response);
    showMessage('Яндекс Диск отключён.', 'ok');
  }));

  el('test').addEventListener('click', () => runBusy(el('test'), async () => {
    const response = await chrome.runtime.sendMessage({ type: 'WEBCLIP_YANDEX_TEST' });
    requireOk(response);
    const who = response.account?.displayName || response.account?.login || 'аккаунт Яндекса';
    showMessage(`Доступ подтверждён: ${who}.`, 'ok');
    await refreshStatus();
  }));

  el('saveRoot').addEventListener('click', () => saveRoot(rootPath.value));

  publicLinksEnabled.addEventListener('change', () => runBusy(publicLinksEnabled, async () => {
    const response = await chrome.runtime.sendMessage({
      type: 'WEBCLIP_YANDEX_SAVE_PREFERENCES',
      preferences: { createPublicLinks: publicLinksEnabled.checked }
    });
    requireOk(response);
    publicLinksEnabled.checked = response.createPublicLinks !== false;
    showMessage(
      publicLinksEnabled.checked
        ? 'Постоянные ссылки Яндекс Диска для PDF включены.'
        : 'Постоянные ссылки Яндекс Диска для PDF отключены.',
      'ok'
    );
  }));

  el('browse').addEventListener('click', async () => {
    if (folderBrowseLoadingGeneration) return;
    browser.classList.remove('hidden');
    currentBrowsePath = rootPath.value.trim() || '/';
    await loadFolders(currentBrowsePath);
  });

  el('up').addEventListener('click', async () => {
    if (folderBrowseLoadingGeneration) return;
    if (currentBrowsePath === '/') return;
    const parts = currentBrowsePath.split('/').filter(Boolean);
    parts.pop();
    await loadFolders(parts.length ? `/${parts.join('/')}` : '/');
  });

  el('selectCurrent').addEventListener('click', async () => {
    if (folderBrowseLoadingGeneration) {
      showMessage('Дождитесь завершения перехода в выбранную папку.', 'error');
      return;
    }
    if (currentBrowsePath === '/') {
      showMessage('Выберите отдельную папку, а не корень Диска.', 'error');
      return;
    }
    rootPath.value = currentBrowsePath;
    await saveRoot(currentBrowsePath);
    browser.classList.add('hidden');
  });

  el('createFolder').addEventListener('click', () => runBusy(el('createFolder'), async () => {
    if (folderBrowseLoadingGeneration) throw new Error('Дождитесь завершения перехода в выбранную папку.');
    const name = newFolderName.value.trim();
    if (!name) throw new Error('Введите имя папки.');
    const path = joinPath(currentBrowsePath, name);
    const response = await chrome.runtime.sendMessage({
      type: 'WEBCLIP_YANDEX_CREATE_FOLDER',
      path
    });
    requireOk(response);
    newFolderName.value = '';
    await loadFolders(currentBrowsePath);
    showMessage(`Папка создана: ${response.path}`, 'ok');
  }));

  el('saveBackupSettings').addEventListener('click', () => runBusy(el('saveBackupSettings'), async () => {
    const intervalMinutes = readPositiveMinutes(backupIntervalMinutes, 'Период фоновой выгрузки');
    const retryMinutes = readPositiveMinutes(backupRetryMinutes, 'Период повтора после ошибки');
    const response = await chrome.runtime.sendMessage({
      type: 'WEBCLIP_JOURNAL_BACKUP_SAVE_SETTINGS',
      settings: {
        enabled: backupEnabled.checked,
        intervalMinutes,
        retryMinutes
      }
    });
    requireOk(response);
    renderBackupStatus(response);
    showMessage('Настройки фонового резервирования сохранены.', 'ok');
  }));

  el('backupNow').addEventListener('click', async () => {
    if (backupProgressActive) return;
    const button = el('backupNow');
    const operationId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    showBackupProgress(operationId);
    button.disabled = true;
    showMessage('', '');
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'WEBCLIP_JOURNAL_YANDEX_EXPORT',
        operationId
      });
      requireOk(response);
      finishBackupProgressSuccess(response);
      showMessage(`Полный журнал выгружен: ${response.remotePath}`, 'ok');
      await refreshBackupStatus();
    } catch (error) {
      finishBackupProgressError(error?.message || String(error));
      showMessage(error?.message || String(error), 'error');
    } finally {
      button.disabled = false;
    }
  });

  el('saveOperationLogSettings').addEventListener('click', () => runBusy(el('saveOperationLogSettings'), async () => {
    const retentionHours = Math.round(Number(operationLogRetentionHours.value));
    if (!Number.isFinite(retentionHours) || retentionHours < 1 || retentionHours > 8760) {
      throw new Error('Срок хранения логов: укажите целое число часов от 1 до 8760.');
    }
    const response = await chrome.runtime.sendMessage({
      type: 'WEBCLIP_OPERATION_LOG_SETTINGS_SAVE',
      settings: { retentionHours }
    });
    requireOk(response);
    operationLogRetentionHours.value = String(response.retentionHours || retentionHours);
    showMessage(`Срок хранения диагностических логов: ${response.retentionHours} ч.`, 'ok');
    await refreshOperationLogs();
  }));

  el('refreshOperationLogs').addEventListener('click', () => refreshOperationLogs());
  operationLogSearch.addEventListener('input', () => {
    if (operationLogSearchTimer) clearTimeout(operationLogSearchTimer);
    operationLogSearchTimer = setTimeout(() => {
      operationLogSearchTimer = 0;
      renderOperationLogList();
    }, OPERATION_LOG_SEARCH_DEBOUNCE_MS);
  });
  operationLogSearch.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    const requestedId = operationLogSearch.value.trim();
    if (requestedId) openOperationLog(requestedId);
  });
  el('toggleOperationLogText').addEventListener('click', toggleOperationLogText);
  el('copyOperationLog').addEventListener('click', () => copySelectedOperationLog());
  el('copyOperationLogId').addEventListener('click', () => copyText(selectedOperationLogId, 'operationId скопирован.'));
  el('exportOperationLog').addEventListener('click', () => runBusy(el('exportOperationLog'), async () => {
    if (!selectedOperationLogId) throw new Error('Сначала выберите операцию.');
    const prepared = await chrome.runtime.sendMessage({ type: 'WEBCLIP_OPERATION_LOG_EXPORT_PREPARE', operationId: selectedOperationLogId });
    requireOk(prepared);
    const downloadId = await WebClipPreparedSaveAs.start(prepared);
    showMessage(`Лог ${selectedOperationLogId} передан в загрузки Chrome (#${downloadId}).`, 'ok');
  }));
  el('clearOperationLogs').addEventListener('click', () => runBusy(el('clearOperationLogs'), async () => {
    if (!confirm('Удалить все диагностические логи WebClip сейчас? Это действие нельзя отменить.')) return;
    const response = await chrome.runtime.sendMessage({ type: 'WEBCLIP_OPERATION_LOG_CLEAR' });
    requireOk(response);
    selectedOperationLogId = '';
    selectedOperationLogValue = null;
    selectedOperationLogJsonText = '';
    operationLogJson.textContent = '';
    operationLogDetail.classList.add('hidden');
    showMessage('Все диагностические логи удалены.', 'ok');
    await refreshOperationLogs();
  }));
}

function downloadSmallJson(text, filename) {
  const blob = new Blob([String(text || '')], { type: 'application/json;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.hidden = true;
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
}

function readSmallFileTextBounded(file) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const reader = new FileReader();
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reader.onload = null;
      reader.onerror = null;
      reader.onabort = null;
      fn(value);
    };
    const timer = setTimeout(() => {
      try { reader.abort(); } catch (_) {}
      finish(reject, new Error('Чтение файла настроек не завершилось за 10 секунд.'));
    }, USER_SETTINGS_FILE_READ_TIMEOUT_MS);
    reader.onload = () => finish(resolve, String(reader.result || ''));
    reader.onerror = () => finish(reject, reader.error || new Error('Не удалось прочитать файл настроек.'));
    reader.onabort = () => finish(reject, new Error('Чтение файла настроек отменено.'));
    try { reader.readAsText(file, 'utf-8'); }
    catch (error) { finish(reject, error); }
  });
}

async function refreshStatus(prefetched = null) {
  const generation = ++yandexStatusGeneration;
  const status = prefetched?.connected !== undefined
    ? prefetched
    : await sendReadOnlyRuntimeMessage({ type: 'WEBCLIP_YANDEX_STATUS' }, 20000, 'Получение состояния Яндекс Диска');
  requireOk(status);
  if (generation !== yandexStatusGeneration) return;

  clientId.value = status.clientId || clientId.value || '';
  redirectUri.value = status.redirectUri || '';
  rootPath.value = status.rootPath || '';
  publicLinksEnabled.checked = status.createPublicLinks !== false;

  if (status.connected) {
    const who = status.account?.displayName || status.account?.login || 'аккаунт подключён';
    const source = status.authSource === 'manual' ? 'тестовый токен' : 'OAuth PKCE';
    connectionStatus.className = 'status ok';
    const storage = 'OAuth-токен хранится только до закрытия Chrome';
    connectionStatus.textContent = `Подключено: ${who} (${source}; ${storage}).`;
  } else if (status.authPresent && status.authValidity === 'expired') {
    connectionStatus.className = 'status error';
    connectionStatus.textContent = 'OAuth-токен Яндекс Диска истёк. Подключите аккаунт заново.';
  } else if (status.authPresent && status.authExpirySkewActive) {
    connectionStatus.className = 'status neutral';
    connectionStatus.textContent = 'Срок действия OAuth-токена Яндекс Диска заканчивается. Подключите аккаунт заново перед следующей операцией.';
  } else if (status.authPresent) {
    connectionStatus.className = 'status neutral';
    connectionStatus.textContent = 'OAuth-токен Яндекс Диска сохранён, но сейчас не считается пригодным для новой операции.';
  } else {
    connectionStatus.className = 'status neutral';
    connectionStatus.textContent = 'Яндекс Диск пока не подключён.';
  }

  if (!status.authPending) activeYandexAuthAttemptId = '';

  if (status.authPending && status.authPendingExpiresAt) {
    const seconds = Math.max(0, Math.ceil((status.authPendingExpiresAt - Date.now()) / 1000));
    pendingStatus.textContent = `Ожидается код подтверждения. Осталось примерно ${Math.ceil(seconds / 60)} мин.`;
    pendingStatus.className = 'pending-status active';
  } else {
    pendingStatus.textContent = '';
    pendingStatus.className = 'pending-status';
  }

  await refreshBackupStatus();
}

async function saveRoot(path) {
  return runBusy(el('saveRoot'), async () => {
    const response = await chrome.runtime.sendMessage({
      type: 'WEBCLIP_YANDEX_SAVE_ROOT',
      rootPath: path
    });
    requireOk(response);
    rootPath.value = response.rootPath;
    const suffix = response.structureVerified
      ? ' Служебные папки Upload, ReadmeLater и Backup/Journal проверены.'
      : ' Структура будет проверена после подключения Яндекс Диска.';
    showMessage(`Корневая папка сохранена: ${response.rootPath}.${suffix}`, 'ok');
    await refreshBackupStatus();
  });
}

async function loadFolders(path) {
  const generation = ++folderBrowseGeneration;
  folderBrowseLoadingGeneration = generation;
  folderList.innerHTML = '<div class="empty">Загрузка…</div>';
  try {
    const response = await sendReadOnlyRuntimeMessage({
      type: 'WEBCLIP_YANDEX_LIST_FOLDERS',
      path
    }, 60000, 'Получение списка папок Яндекс Диска');
    requireOk(response);
    // Folder requests may complete out of order. Only the newest navigation
    // is allowed to mutate currentBrowsePath/list UI; otherwise a slow older
    // Yandex response can make “Выбрать эту папку” save the wrong root.
    if (generation !== folderBrowseGeneration) return;
    currentBrowsePath = response.path || path || '/';
    currentPathEl.textContent = currentBrowsePath;
    folderList.replaceChildren();

    if (!response.folders?.length) {
      folderList.innerHTML = '<div class="empty">В этой папке нет вложенных папок.</div>';
      return;
    }

    const folders = response.folders;
    const batchSize = 250;
    const renderFolderBatch = (start = 0) => {
      const end = Math.min(folders.length, start + batchSize);
      for (let index = start; index < end; index += 1) {
        const folder = folders[index];
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'folder-item';
        button.textContent = `📁 ${folder.name}`;
        button.addEventListener('click', () => loadFolders(folder.path));
        folderList.appendChild(button);
      }
      if (end < folders.length) {
        const more = document.createElement('button');
        more.type = 'button';
        more.className = 'folder-item folder-load-more';
        more.textContent = `Показать ещё (${Math.min(batchSize, folders.length - end)} из ${folders.length - end})`;
        more.addEventListener('click', () => {
          more.remove();
          renderFolderBatch(end);
        });
        folderList.appendChild(more);
      }
    };
    renderFolderBatch();
  } catch (error) {
    if (generation !== folderBrowseGeneration) return;
    folderList.innerHTML = `<div class="empty"></div>`;
    folderList.firstElementChild.textContent = error.message || String(error);
    showMessage(error.message || String(error), 'error');
  } finally {
    if (generation === folderBrowseGeneration && folderBrowseLoadingGeneration === generation) {
      folderBrowseLoadingGeneration = 0;
    }
  }
}

function joinPath(base, name) {
  const cleanBase = String(base || '/').replace(/\/+$/g, '') || '';
  const cleanName = String(name || '').replace(/[\\/]+/g, '_').trim();
  return `${cleanBase}/${cleanName}`.replace(/\/{2,}/g, '/');
}

function readPositiveMinutes(input, label) {
  const value = Math.round(Number(input.value));
  if (!Number.isFinite(value) || value < 1) {
    throw new Error(`${label}: укажите целое число минут не меньше 1.`);
  }
  return value;
}

async function refreshBackupStatus() {
  const generation = ++backupStatusGeneration;
  try {
    const status = await sendReadOnlyRuntimeMessage({ type: 'WEBCLIP_JOURNAL_BACKUP_STATUS' }, 20000, 'Получение состояния резервной копии');
    requireOk(status);
    if (generation !== backupStatusGeneration) return;
    renderBackupStatus(status);
  } catch (error) {
    if (generation !== backupStatusGeneration) return;
    backupStatus.className = 'status error';
    backupStatus.textContent = error?.message || String(error);
  }
}

function renderBackupStatus(status) {
  backupEnabled.checked = Boolean(status.enabled);
  backupIntervalMinutes.value = String(status.intervalMinutes || 1440);
  backupRetryMinutes.value = String(status.retryMinutes || 60);
  backupRemotePath.textContent = status.folderPath || 'Корневая папка не выбрана';

  const lines = [];
  lines.push(status.enabled ? 'Автоматический экспорт включён.' : 'Автоматический экспорт выключен.');
  lines.push(`Период: ${status.intervalMinutes || 1440} мин.; повтор после ошибки: ${status.retryMinutes || 60} мин.`);
  lines.push(`Последний успешный фоновый экспорт: ${formatDateTime(status.lastBackgroundSuccessAt) || 'ещё не выполнялся'}.`);
  lines.push(`Последняя неудачная фоновая попытка: ${formatDateTime(status.lastBackgroundFailureAt) || 'не было'}.`);
  if (status.lastRemotePath) lines.push(`Последняя созданная копия: ${status.lastRemotePath}.`);
  if (status.lastBackgroundError) lines.push(`Последняя ошибка: ${status.lastBackgroundError}`);

  backupStatus.className = `status ${status.hasCurrentProblem ? 'error' : status.lastBackgroundSuccessAt ? 'ok' : 'neutral'}`;
  backupStatus.textContent = lines.join('\n');
}

async function refreshOperationLogs() {
  const generation = ++operationLogListGeneration;
  const selectionGenerationAtStart = operationLogSelectionGeneration;
  operationLogStatus.className = 'status neutral';
  operationLogStatus.textContent = 'Загружаем диагностические логи…';
  try {
    const [settings, list] = await Promise.all([
      sendReadOnlyRuntimeMessage({ type: 'WEBCLIP_OPERATION_LOG_SETTINGS_GET' }, 30000, 'Получение настроек OperationLog'),
      sendReadOnlyRuntimeMessage({ type: 'WEBCLIP_OPERATION_LOG_LIST', limit: 500 }, 30000, 'Получение списка OperationLog')
    ]);
    requireOk(settings);
    requireOk(list);
    if (generation !== operationLogListGeneration) return;
    operationLogRetentionHours.value = String(settings.retentionHours || 24);
    operationLogs = Array.isArray(list.operations) ? list.operations : [];
    operationLogStatus.className = 'status neutral';
    operationLogStatus.textContent = `Хранение: ${settings.retentionHours || 24} ч. · Операций в текущем списке: ${operationLogs.length}.`;
    renderOperationLogList();
    // A list refresh started before a foreground detail selection must not
    // clear or re-open that newer selection when the older list arrives.
    if (selectionGenerationAtStart !== operationLogSelectionGeneration) return;
    if (selectedOperationLogId && operationLogs.some((item) => item.operationId === selectedOperationLogId)) {
      await openOperationLog(selectedOperationLogId, { quiet: true });
    } else if (selectedOperationLogId) {
      selectedOperationLogId = '';
      selectedOperationLogValue = null;
      selectedOperationLogJsonText = '';
      operationLogJson.textContent = '';
      operationLogDetail.classList.add('hidden');
    }
  } catch (error) {
    if (generation !== operationLogListGeneration) return;
    operationLogStatus.className = 'status error';
    operationLogStatus.textContent = error?.message || String(error);
    operationLogList.replaceChildren();
  }
}

function createOperationLogRow(item) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'operation-log-row';
  button.addEventListener('click', () => openOperationLog(item.operationId));

  const main = document.createElement('div');
  main.className = 'operation-log-row-main';
  const title = document.createElement('div');
  title.className = 'operation-log-row-title';
  title.textContent = item.description || item.title || item.type || 'Операция WebClip';
  const technicalTitle = document.createElement('div');
  technicalTitle.className = 'operation-log-row-description';
  technicalTitle.textContent = item.title && item.title !== title.textContent ? item.title : '';
  const meta = document.createElement('div');
  meta.className = 'operation-log-row-meta';
  meta.textContent = `${formatDateTime(item.updatedAt) || 'дата не указана'} · событий: ${Number(item.eventCount || 0)}${item.summary ? ` · ${item.summary}` : ''}`;
  const id = document.createElement('div');
  id.className = 'operation-log-row-id';
  id.textContent = item.operationId || '';
  main.append(title);
  if (technicalTitle.textContent) main.append(technicalTitle);
  main.append(meta, id);

  const state = document.createElement('span');
  const status = String(item.status || 'running');
  state.className = `operation-log-status-pill ${status}`;
  state.textContent = status === 'success' ? 'Успешно' : status === 'partial' ? 'Частично' : status === 'error' ? 'Ошибка' : status === 'canceled' ? 'Отменено' : 'Выполняется';
  button.append(main, state);
  return button;
}

function renderOperationLogList() {
  const generation = ++operationLogRenderGeneration;
  const query = operationLogSearch.value.trim().toLowerCase();
  const filtered = operationLogs.filter((item) => {
    if (!query) return true;
    return [item.operationId, item.title, item.description, item.type, item.status, item.summary]
      .some((value) => String(value || '').toLowerCase().includes(query));
  });
  operationLogList.replaceChildren();
  if (!filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'operation-log-empty';
    empty.textContent = query ? 'Совпадений не найдено.' : 'Диагностических логов пока нет.';
    operationLogList.appendChild(empty);
    return;
  }

  let index = 0;
  const appendBatch = () => {
    if (generation !== operationLogRenderGeneration) return;
    const fragment = document.createDocumentFragment();
    const end = Math.min(filtered.length, index + OPERATION_LOG_RENDER_BATCH_SIZE);
    for (; index < end; index += 1) fragment.appendChild(createOperationLogRow(filtered[index]));
    operationLogList.appendChild(fragment);
    if (index < filtered.length) {
      const schedule = globalThis.requestAnimationFrame || ((callback) => setTimeout(callback, 0));
      schedule(appendBatch);
    }
  };
  appendBatch();
}

function openOperationLog(id, { quiet = false } = {}) {
  const operationIdValue = String(id || '').trim();
  if (!operationIdValue) return Promise.resolve();
  const generation = ++operationLogDetailGeneration;
  if (!quiet) operationLogSelectionGeneration += 1;
  if (!quiet) {
    // Do not leave the previous operation selected while a different log is
    // loading: otherwise “Экспорт JSON” can export the previous operation.
    selectedOperationLogId = '';
    operationLogDetail.classList.add('hidden');
  }
  return new Promise((resolve) => {
    // At most one active multi-MB detail RPC plus the latest desired selection.
    // A queued-but-not-started older click is superseded immediately.
    if (queuedOperationLogDetailRequest?.resolve) queuedOperationLogDetailRequest.resolve();
    queuedOperationLogDetailRequest = { operationIdValue, quiet, generation, resolve };
    void drainOperationLogDetailRequests();
  });
}

async function drainOperationLogDetailRequests() {
  if (operationLogDetailRequestInFlight) return;
  const request = queuedOperationLogDetailRequest;
  if (!request) return;
  queuedOperationLogDetailRequest = null;
  operationLogDetailRequestInFlight = true;
  const actual = getReadOnlyRuntimeMessageActual({ type: 'WEBCLIP_OPERATION_LOG_GET', operationId: request.operationIdValue });
  try {
    const response = await waitReadOnlyRuntimeMessage(actual, 30000, 'Получение OperationLog');
    requireOk(response);
    if (request.generation !== operationLogDetailGeneration) return;
    selectedOperationLogId = request.operationIdValue;
    operationLogTitle.textContent = response.log?.title || 'Диагностический лог';
    operationLogDescription.textContent = `Описание операции: ${response.log?.description || response.log?.title || 'Операция WebClip'}`;
    operationLogId.textContent = `operationId: ${request.operationIdValue}`;
    selectedOperationLogValue = response.log || {};
    selectedOperationLogJsonText = '';
    operationLogJson.textContent = '';
    operationLogJson.classList.add('hidden');
    el('toggleOperationLogText').textContent = 'Показать JSON лога';
    operationLogDetail.classList.remove('hidden');
    if (!request.quiet) operationLogDetail.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  } catch (error) {
    if (request.generation === operationLogDetailGeneration && !request.quiet) {
      showMessage(error?.message || String(error), 'error');
    }
  } finally {
    request.resolve();
    // P1-145: the local UI deadline does not cancel chrome.runtime.sendMessage.
    // Keep the single active detail slot occupied until the underlying read
    // actually settles, otherwise a timeout could accumulate several large
    // OperationLog responses in parallel behind the UI-level queue.
    void Promise.resolve(actual).finally(() => {
      operationLogDetailRequestInFlight = false;
      if (queuedOperationLogDetailRequest) void drainOperationLogDetailRequests();
    }).catch(() => {});
  }
}


function materializeSelectedOperationLogJson() {
  if (!selectedOperationLogValue) return '';
  if (!selectedOperationLogJsonText) selectedOperationLogJsonText = JSON.stringify(selectedOperationLogValue, null, 2);
  return selectedOperationLogJsonText;
}

function toggleOperationLogText() {
  const currentlyHidden = operationLogJson.classList.contains('hidden');
  if (currentlyHidden) {
    operationLogJson.textContent = materializeSelectedOperationLogJson();
    operationLogJson.classList.remove('hidden');
    el('toggleOperationLogText').textContent = 'Скрыть JSON лога';
  } else {
    operationLogJson.classList.add('hidden');
    el('toggleOperationLogText').textContent = 'Показать JSON лога';
  }
}

async function copySelectedOperationLog() {
  const text = materializeSelectedOperationLogJson();
  if (!text) throw new Error('Сначала выберите операцию.');
  await copyText(text, 'Весь лог скопирован в буфер обмена.');
}

async function copyText(text, successMessage = 'Скопировано.') {
  const value = String(text || '');
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    showMessage(successMessage, 'ok');
  } catch (error) {
    showMessage(`Не удалось скопировать: ${error?.message || String(error)}`, 'error');
  }
}

function setBackupProgressModalVisible(visible) {
  if (visible) {
    backupProgressReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    optionsPage?.setAttribute('inert', '');
    optionsPage?.setAttribute('aria-hidden', 'true');
    document.body.classList.add('backup-progress-open');
    backupProgressBackdrop.classList.remove('hidden');
    backupProgressDialog.focus({ preventScroll: true });
    return;
  }
  backupProgressBackdrop.classList.add('hidden');
  optionsPage?.removeAttribute('inert');
  optionsPage?.removeAttribute('aria-hidden');
  document.body.classList.remove('backup-progress-open');
  const returnFocus = backupProgressReturnFocus;
  backupProgressReturnFocus = null;
  if (returnFocus?.isConnected && typeof returnFocus.focus === 'function') {
    try { returnFocus.focus({ preventScroll: true }); } catch (_) { returnFocus.focus(); }
  }
}

const BACKUP_PROGRESS_STAGES = [
  ['read-journal', 'Чтение локального журнала'],
  ['serialize', 'Формирование файла резервной копии'],
  ['yandex-access', 'Проверка доступа к Яндекс Диску'],
  ['month-folder', 'Подготовка месячной папки MM-YYYY'],
  ['upload-url', 'Получение адреса загрузки'],
  ['upload', 'Передача файла на Яндекс Диск'],
  ['verify', 'Проверка созданного файла']
];

function showBackupProgress(operationId) {
  activeBackupOperationId = operationId;
  backupProgressOperationId.textContent = operationId;
  backupProgressActive = true;
  backupProgressPortController?.ensureConnected();
  backupProgressDialog.className = 'progress-dialog';
  backupProgressIcon.textContent = '↻';
  backupProgressKicker.textContent = 'ИДЁТ РЕЗЕРВНОЕ КОПИРОВАНИЕ';
  backupProgressTitle.textContent = 'Создание резервной копии';
  backupProgressText.textContent = 'Запускаем операцию…';
  backupProgressBar.style.width = '0%';
  backupProgressPercent.textContent = '0%';
  backupProgressClose.disabled = true;
  backupProgressClose.classList.add('hidden');
  backupProgressStages.replaceChildren();
  for (const [stage, label] of BACKUP_PROGRESS_STAGES) {
    const li = document.createElement('li');
    li.className = 'progress-stage';
    li.dataset.stage = stage;
    const mark = document.createElement('span');
    mark.className = 'mark';
    mark.textContent = '·';
    const text = document.createElement('span');
    text.textContent = label;
    li.append(mark, text);
    backupProgressStages.appendChild(li);
  }
  setBackupProgressModalVisible(true);
}

function updateBackupProgress(message) {
  const percent = Math.max(0, Math.min(100, Number(message.percent) || 0));
  backupProgressText.textContent = message.message || 'Выполняется операция…';
  backupProgressBar.style.width = `${percent}%`;
  backupProgressPercent.textContent = `${Math.round(percent)}%`;
  const currentIndex = BACKUP_PROGRESS_STAGES.findIndex(([stage]) => stage === message.stage);
  for (let i = 0; i < BACKUP_PROGRESS_STAGES.length; i += 1) {
    const node = backupProgressStages.querySelector(`[data-stage="${BACKUP_PROGRESS_STAGES[i][0]}"]`);
    if (!node) continue;
    node.className = 'progress-stage';
    const mark = node.querySelector('.mark');
    if (i < currentIndex || message.state === 'success') {
      node.classList.add('done');
      if (mark) mark.textContent = '✓';
    } else if (i === currentIndex && message.state === 'error') {
      node.classList.add('failed');
      if (mark) mark.textContent = '!';
    } else if (i === currentIndex) {
      node.classList.add('active');
      if (mark) mark.textContent = '→';
    } else if (mark) mark.textContent = '·';
  }
}

function finishBackupProgressSuccess(result) {
  backupProgressActive = false;
  backupProgressPortController?.suspend();
  backupProgressDialog.className = 'progress-dialog success';
  backupProgressIcon.textContent = '✓';
  backupProgressKicker.textContent = 'ОПЕРАЦИЯ ВЫПОЛНЕНА';
  backupProgressTitle.textContent = 'Резервная копия создана';
  backupProgressText.textContent = `Файл сохранён и проверен: ${result.remotePath || ''}`;
  backupProgressBar.style.width = '100%';
  backupProgressPercent.textContent = '100%';
  for (const node of backupProgressStages.querySelectorAll('.progress-stage')) {
    node.className = 'progress-stage done';
    const mark = node.querySelector('.mark');
    if (mark) mark.textContent = '✓';
  }
  backupProgressClose.disabled = false;
  backupProgressClose.classList.remove('hidden');
}

function finishBackupProgressError(message) {
  backupProgressActive = false;
  backupProgressPortController?.suspend();
  backupProgressDialog.className = 'progress-dialog error';
  backupProgressIcon.textContent = '!';
  backupProgressKicker.textContent = 'ТРЕБУЕТСЯ ДЕЙСТВИЕ';
  backupProgressTitle.textContent = 'Резервная копия не создана';
  backupProgressText.textContent = message || 'Неизвестная ошибка.';
  backupProgressBar.style.width = '100%';
  backupProgressPercent.textContent = 'Ошибка';
  const active = backupProgressStages.querySelector('.progress-stage.active');
  if (active) {
    active.className = 'progress-stage failed';
    const mark = active.querySelector('.mark');
    if (mark) mark.textContent = '!';
  }
  backupProgressClose.disabled = false;
  backupProgressClose.classList.remove('hidden');
}

function closeBackupProgress() {
  if (backupProgressActive) return;
  setBackupProgressModalVisible(false);
  activeBackupOperationId = '';
  backupProgressOperationId.textContent = '';
}

async function refreshStorageHealth() {
  try {
    const response = requireOk(await sendReadOnlyRuntimeMessage({ type: 'WEBCLIP_STORAGE_HEALTH' }, 20000, 'Получение состояния хранилища'));
    if (!response.supported) {
      storageHealthStatus.textContent = 'Chrome не вернул оценку квоты для origin расширения. Storage preflight останется fail-open для неподдерживаемого API.';
      storageHealthStatus.className = 'status neutral';
      return;
    }
    const usage = formatBytes(response.usage);
    const quota = formatBytes(response.quota);
    const free = formatBytes(response.free);
    const reserve = formatBytes(response.reserve);
    const percent = Number.isFinite(Number(response.usagePercent)) ? `${Number(response.usagePercent).toFixed(1)}%` : 'н/д';
    const persistence = response.persisted === true
      ? 'Persistent storage: подтверждён Chrome.'
      : response.persisted === false
        ? 'Persistent storage: не подтверждён.'
        : 'Статус persistent storage недоступен.';
    storageHealthStatus.textContent = `Использовано ${usage} из ${quota} (${percent}); свободно ${free}. Безопасный резерв WebClip: ${reserve}. ${persistence}`;
    storageHealthStatus.className = `status${response.persisted === true ? ' ok' : ' neutral'}`;
  } catch (error) {
    storageHealthStatus.textContent = error?.message || String(error);
    storageHealthStatus.className = 'status error';
  }
}

function formatBytes(value) {
  const bytes = Math.max(0, Number(value) || 0);
  const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
  let size = bytes;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  const digits = index === 0 || size >= 100 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(digits)} ${units[index]}`;
}

function formatDateTime(value) {
  if (!value) return '';
  try { return new Date(value).toLocaleString('ru-RU'); } catch (_) { return ''; }
}

async function runBusy(button, fn) {
  const previous = button.disabled;
  button.disabled = true;
  showMessage('', '');
  try {
    await fn();
  } catch (error) {
    showMessage(error?.message || String(error), 'error');
  } finally {
    button.disabled = previous;
  }
}

function requireOk(response) {
  if (!response?.ok) {
    throw new Error(response?.error || 'Операция не выполнена.');
  }
  return response;
}

function showMessage(text, kind) {
  message.textContent = text || '';
  message.className = `message${kind ? ` ${kind}` : ''}`;
}
