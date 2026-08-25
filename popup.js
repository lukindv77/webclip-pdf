const JOURNAL_CONTEXT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_JOURNAL_CONTEXT_URL_CHARS = 8192;
const MAX_JOURNAL_CONTEXT_ID_CHARS = 180;
const POPUP_EXTENSION_API_TIMEOUT_MS = 10_000;

function readPopupExtensionApiBounded(start, label, timeoutMs = POPUP_EXTENSION_API_TIMEOUT_MS) {
  const waitMs = Math.max(1000, Math.min(60_000, Number(timeoutMs) || POPUP_EXTENSION_API_TIMEOUT_MS));
  let actual;
  try { actual = Promise.resolve().then(start); }
  catch (error) { actual = Promise.reject(error); }
  let timer = 0;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`${label} не завершилось за ${Math.ceil(waitMs / 1000)} с.`);
      error.code = 'WEBCLIP_TIMEOUT';
      reject(error);
    }, waitMs);
  });
  return Promise.race([actual, deadline]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

const startButton = document.getElementById('start');
const readLaterButton = document.getElementById('readLater');
const grantFrameAccessButton = document.getElementById('grantFrameAccess');
const journalCurrentButton = document.getElementById('journalCurrent');
const journalSiteButton = document.getElementById('journalSite');
const journalAllButton = document.getElementById('journalAll');
const settingsButton = document.getElementById('settings');
const authHelpButton = document.getElementById('authHelp');
const statusEl = document.getElementById('status');
const versionEl = document.getElementById('extensionVersion');
const backupPanel = document.getElementById('backupPanel');
const backupState = document.getElementById('backupState');
const backupLastSuccess = document.getElementById('backupLastSuccess');
const backupLastFailure = document.getElementById('backupLastFailure');
const backupError = document.getElementById('backupError');

const manifest = chrome.runtime.getManifest();
versionEl.textContent = `Версия расширения: ${manifest.version}`;
loadBackupStatus();



async function loadBackupStatus() {
  try {
    const result = await readPopupExtensionApiBounded(() => chrome.runtime.sendMessage({ type: 'WEBCLIP_JOURNAL_BACKUP_STATUS' }), 'Чтение статуса резервной копии журнала');
    if (!result?.ok) throw new Error(result?.error || 'Не удалось получить статус резервной копии.');
    backupState.textContent = result.enabled
      ? `Автовыгрузка включена · ${result.intervalMinutes} мин. · повтор ${result.retryMinutes} мин.`
      : 'Автовыгрузка выключена.';
    backupLastSuccess.textContent = formatDateTime(result.lastBackgroundSuccessAt) || 'ещё не было';
    backupLastFailure.textContent = formatDateTime(result.lastBackgroundFailureAt) || 'не было';
    backupError.textContent = result.lastBackgroundError || '';
    backupPanel.classList.toggle('problem', Boolean(result.hasCurrentProblem));
  } catch (error) {
    backupState.textContent = 'Статус недоступен.';
    backupError.textContent = error?.message || String(error);
    backupPanel.classList.add('problem');
  }
}

function formatDateTime(value) {
  if (!value) return '';
  try { return new Date(value).toLocaleString('ru-RU'); } catch (_) { return ''; }
}

async function getActiveSourceTab() {
  const [tab] = await readPopupExtensionApiBounded(() => chrome.tabs.query({ active: true, currentWindow: true }), 'Определение активной вкладки');
  if (!tab?.id) throw new Error('Не удалось определить текущую вкладку.');
  return tab;
}

function isHttpPageUrl(value) {
  return /^https?:\/\//i.test(String(value || ''));
}

async function getJournalSourceContext(activeTab) {
  if (!activeTab?.id) return { sourceTabId: 0, sourceUrl: '' };
  if (isHttpPageUrl(activeTab.url)) {
    return { sourceTabId: activeTab.id, sourceUrl: activeTab.url || '' };
  }

  try {
    const journalUrl = chrome.runtime.getURL('journal.html');
    if (!String(activeTab.url || '').startsWith(journalUrl)) {
      return { sourceTabId: 0, sourceUrl: '' };
    }
    const parsed = new URL(activeTab.url);
    const contextId = String(parsed.searchParams.get('contextId') || '').slice(0, MAX_JOURNAL_CONTEXT_ID_CHARS);
    if (!contextId) return { sourceTabId: 0, sourceUrl: '' };
    const key = `webclipJournalContext:${contextId}`;
    const stored = await readPopupExtensionApiBounded(() => chrome.storage.session.get(key), 'Чтение session-контекста журнала');
    const context = stored?.[key];
    const createdAt = Number(context?.createdAt || 0);
    const now = Date.now();
    const rawUrl = String(context?.sourceUrl || '');
    const fresh = context && typeof context === 'object'
      && Number.isFinite(createdAt) && createdAt > 0 && createdAt <= now
      && now - createdAt <= JOURNAL_CONTEXT_TTL_MS
      && rawUrl.length <= MAX_JOURNAL_CONTEXT_URL_CHARS;
    if (!fresh || !isHttpPageUrl(rawUrl)) return { sourceTabId: 0, sourceUrl: '' };

    let sourceTabId = Math.max(0, Math.floor(Number(context.sourceTabId) || 0));
    let sourceUrl = rawUrl;
    if (sourceTabId > 0) {
      try {
        const sourceTab = await readPopupExtensionApiBounded(() => chrome.tabs.get(sourceTabId), 'Проверка исходной вкладки журнала');
        if (isHttpPageUrl(sourceTab?.url)) sourceUrl = sourceTab.url;
      } catch (_) {}
    }
    return isHttpPageUrl(sourceUrl)
      ? { sourceTabId, sourceUrl }
      : { sourceTabId: 0, sourceUrl: '' };
  } catch (_) {
    return { sourceTabId: 0, sourceUrl: '' };
  }
}

async function openJournal(mode) {
  statusEl.textContent = '';
  try {
    const normalizedMode = mode === 'current' ? 'current' : mode === 'site' ? 'site' : 'all';
    let activeTab = null;
    try { activeTab = await getActiveSourceTab(); } catch (_) {}
    const sourceContext = await getJournalSourceContext(activeTab);

    if (normalizedMode !== 'all' && !isHttpPageUrl(sourceContext.sourceUrl)) {
      throw new Error('Не удалось определить исходную web-страницу для этого вида журнала.');
    }

    const result = await readPopupExtensionApiBounded(() => chrome.runtime.sendMessage({
      type: 'WEBCLIP_OPEN_JOURNAL_PAGE',
      mode: normalizedMode,
      sourceTabId: sourceContext.sourceTabId,
      sourceUrl: sourceContext.sourceUrl,
      anchorTabId: activeTab?.id || 0
    }), 'Открытие страницы журнала');
    if (!result?.ok) throw new Error(result?.error || 'Не удалось открыть журнал.');
    window.close();
  } catch (error) {
    statusEl.textContent = error?.message || String(error);
  }
}


const MAX_FRAME_PERMISSION_ORIGINS_PER_REQUEST = 16;

function normalizeFrameOrigin(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.origin;
  } catch (_) {
    return '';
  }
}

function frameHostPermissionPattern(origin) {
  try {
    const url = new URL(String(origin || ''));
    if (url.protocol !== 'http:' && url.protocol !== 'https:' || !url.hostname) return '';
    return `${url.protocol}//${url.hostname}/*`;
  } catch (_) {
    return '';
  }
}

async function ensureTopContentScript(tabId) {
  await readPopupExtensionApiBounded(
    () => chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }),
    'Подключение WebClip к текущей странице'
  );
}

async function enableGrantedFrameAgents(tabId) {
  const result = await readPopupExtensionApiBounded(
    () => chrome.runtime.sendMessage({ type: 'WEBCLIP_ENABLE_FRAME_AGENTS', tabId }),
    'Подключение WebClip к разрешённым iframe'
  );
  if (result?.ok === false) throw new Error(result.error || 'Не удалось подключить cross-origin iframe.');
  return result || { ok: true };
}

async function collectCrossOriginFrameOrigins(tabId) {
  await ensureTopContentScript(tabId);
  const result = await readPopupExtensionApiBounded(
    () => chrome.tabs.sendMessage(tabId, { type: 'WEBCLIP_COMMAND', command: 'frame-access-candidates' }),
    'Поиск cross-origin iframe'
  );
  if (result?.ok === false) throw new Error(result.error || 'Не удалось определить iframe текущей страницы.');
  const origins = [];
  const seen = new Set();
  for (const value of Array.isArray(result?.origins) ? result.origins : []) {
    const origin = normalizeFrameOrigin(value);
    if (!origin || seen.has(origin)) continue;
    seen.add(origin);
    origins.push(origin);
    if (origins.length > MAX_FRAME_PERMISSION_ORIGINS_PER_REQUEST) break;
  }
  if (origins.length > MAX_FRAME_PERMISSION_ORIGINS_PER_REQUEST) {
    throw new Error(`На странице найдено больше ${MAX_FRAME_PERMISSION_ORIGINS_PER_REQUEST} разных origin iframe. WebClip не запрашивает массовый доступ; откройте страницу с меньшим числом сторонних iframe.`);
  }
  return origins;
}

grantFrameAccessButton?.addEventListener('click', async () => {
  statusEl.textContent = '';
  grantFrameAccessButton.disabled = true;
  try {
    const tab = await getActiveSourceTab();
    if (!isHttpPageUrl(tab.url)) throw new Error('Доступ к iframe можно выдать только на страницах http:// и https://.');
    const origins = await collectCrossOriginFrameOrigins(tab.id);
    if (!origins.length) {
      statusEl.textContent = 'На текущей странице не найдено доступных для запроса cross-origin iframe.';
      return;
    }
    const permissionOrigins = [...new Set(origins.map(frameHostPermissionPattern).filter(Boolean))];
    if (!permissionOrigins.length) throw new Error('Не удалось сформировать безопасный host permission для iframe.');
    const granted = await readPopupExtensionApiBounded(
      () => chrome.permissions.request({ origins: permissionOrigins }),
      'Запрос host permissions для iframe'
    );
    if (!granted) {
      statusEl.textContent = 'Доступ к iframe не предоставлен. WebClip продолжит работать только с top page и same-origin iframe.';
      return;
    }
    const enabled = await enableGrantedFrameAgents(tab.id);
    const count = Math.max(0, Number(enabled?.registered || enabled?.injectedFrames || 0));
    statusEl.textContent = count
      ? `Доступ предоставлен. Cross-origin iframe подключено: ${count}.`
      : 'Доступ предоставлен. Подключение iframe завершится при запуске режима выделения.';
  } catch (error) {
    statusEl.textContent = error?.message || String(error);
  } finally {
    grantFrameAccessButton.disabled = false;
  }
});


readLaterButton.addEventListener('click', async () => {
  statusEl.textContent = '';
  readLaterButton.disabled = true;
  try {
    const tab = await getActiveSourceTab();
    if (!/^https?:\/\//i.test(tab.url || '')) throw new Error('«Прочитать позже» доступно для страниц http:// и https://.');
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'WEBCLIP_COMMAND', command: 'read-later' });
    if (result?.ok === false) throw new Error(result.error || 'Не удалось запустить «Прочитать позже».');
    window.close();
  } catch (error) {
    statusEl.textContent = error?.message || String(error);
    readLaterButton.disabled = false;
  }
});

journalCurrentButton.addEventListener('click', () => openJournal('current'));
journalSiteButton.addEventListener('click', () => openJournal('site'));
journalAllButton.addEventListener('click', () => openJournal('all'));

settingsButton.addEventListener('click', async () => {
  try {
    const tab = await getActiveSourceTab();
    await chrome.runtime.sendMessage({ type: 'WEBCLIP_OPEN_OPTIONS', sourceTabId: tab?.id || 0 });
  } finally { window.close(); }
});

authHelpButton.addEventListener('click', async () => {
  try {
    const tab = await getActiveSourceTab();
    await chrome.runtime.sendMessage({ type: 'WEBCLIP_OPEN_INTERNAL_PAGE', page: 'yandex-auth-help.html', sourceTabId: tab?.id || 0 });
  } finally { window.close(); }
});

startButton.addEventListener('click', async () => {
  statusEl.textContent = '';
  startButton.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error('Не удалось определить текущую вкладку.');
    }

    const url = tab.url || '';
    if (!/^https?:\/\//i.test(url)) {
      throw new Error('В тестовой версии поддерживаются страницы http:// и https://.');
    }

    await ensureTopContentScript(tab.id);
    await enableGrantedFrameAgents(tab.id);

    await chrome.tabs.sendMessage(tab.id, { type: 'WEBCLIP_START_SELECTION' });
    window.close();
  } catch (error) {
    statusEl.textContent = error?.message || String(error);
    startButton.disabled = false;
  }
});
