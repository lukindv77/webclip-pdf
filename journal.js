const params = new URLSearchParams(location.search);
let sourceTabId = 0;
let sourceUrl = '';
const JOURNAL_CONTEXT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_JOURNAL_CONTEXT_URL_CHARS = 8192;
const MAX_JOURNAL_CONTEXT_ID_CHARS = 180;
const JOURNAL_EXTENSION_API_TIMEOUT_MS = 10_000;

function readJournalExtensionApiBounded(start, label, timeoutMs = JOURNAL_EXTENSION_API_TIMEOUT_MS) {
  const waitMs = Math.max(1000, Math.min(60_000, Number(timeoutMs) || JOURNAL_EXTENSION_API_TIMEOUT_MS));
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

const journalContextId = String(params.get('contextId') || '').slice(0, MAX_JOURNAL_CONTEXT_ID_CHARS);
const requestedMode = params.get('mode');
const autoBackupRequested = params.get('autoBackup') === '1';
const autoExportFileRequested = params.get('autoExportFile') === '1';
let mode = requestedMode === 'current' || requestedMode === 'site' ? requestedMode : 'all';
let journalModeCounts = makeEmptyJournalModeCounts();
let journalDomainModel = { totalEntries: 0, groups: [], truncated: false, childrenTruncated: false };
let urlGroupPageBoundaries = new Map([[1, null]]);
let readingFilter = 'all';
let selectedDomainFilter = { level: 'all', value: '' };
let domainSearchQuery = '';
let journalTextFilterLogic = 'and';
let journalTextFilterRows = [{ id: 1, text: '', fields: { title: true, comments: false, site: false, url: false } }];
let nextJournalTextFilterRowId = 2;
let journalTextFilterRefreshTimer = 0;
const expandedDomainBases = new Set();
let groupByUrl = false;
let currentPage = 1;
const PAGE_SIZE = 20;
const GROUP_ENTRY_PAGE_SIZE = 20;
const JOURNAL_VIEW_QUERY_DEADLINE_MS = 20_000;
const JOURNAL_VIEW_RUNTIME_DEADLINE_MS = JOURNAL_VIEW_QUERY_DEADLINE_MS + 5_000;
const MAX_DOMAIN_FILTER_BASES = 500;
const MAX_DOMAIN_FILTER_CHILDREN = 1500;
let renderGeneration = 0;
let journalLoadGeneration = 0;
let backupInfoRefreshInFlight = null;
let destructiveRecoveryRefreshInFlight = null;
let manualDestructiveReceipts = new Map();
const expandedUrlGroups = new Set();
let journalReloadTimer = 0;
let journalRevisionCheckTimer = 0;
let journalHealthTimer = 0; // P1-127 regression: explicit lifecycle handle for health-check timer.
let lastJournalRevisionToken = null;
let currentBackupMonth = monthStart(new Date());
let yandexBackupListGeneration = 0;
let yandexBackupListLoading = false;
let confirmationResolver = null;
let confirmationExpectedCode = '';
let selectedYandexBackupPath = '';
let activeBackupOperationId = '';
let backupProgressActive = false;
let backupProgressReturnFocus = null;
let pendingDeleteEntry = null;
let journalDeleteBusy = false;
let activeDeleteOperationId = '';
let deleteRetryAction = 'trash';
let deleteRetryPublicationAction = 'none';
let pendingMoveReadEntry = null;
let activeMoveReadOperationId = '';
let moveReadBusy = false;
let moveReadConfirmationResolver = null;
let journalDestructiveOperationInFlight = '';

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


// Журнал отображается напрямую из IndexedDB расширения. Это намеренно
// не зависит от service worker: запись выполняет service worker, но просмотр
// всегда читает один и тот же persistent store WebClipJournal.
const JOURNAL_DB_NAME = 'WebClipJournal';
const JOURNAL_DB_VERSION = 8;
const JOURNAL_STORE = 'entries';
const JOURNAL_META_STORE = 'meta';
const TRANSFER_DB_NAME = 'WebClipOffscreenTransfers';
const TRANSFER_DB_VERSION = 1;
const TRANSFER_STORE = 'payloads';
const MAX_JOURNAL_IMPORT_BYTES = 50 * 1024 * 1024;
const JOURNAL_IMPORT_CHUNK_BYTES = 1024 * 1024;
const JOURNAL_IMPORT_LEASE_HEARTBEAT_MS = 30 * 1000;
const journalImportOwnerSessionId = `journal-page-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
let activeJournalImportLease = null;
let journalImportLeaseHeartbeatTimer = 0;
let journalImportLeaseLostError = null;
let journalImportRecoveryTimer = 0;

const versionEl = document.getElementById('version');
const sourceUrlEl = document.getElementById('sourceUrl');
const siteKeyEl = document.getElementById('siteKey');
const statusEl = document.getElementById('status');
const lastOperationIdRow = document.getElementById('lastOperationIdRow');
const lastOperationIdEl = document.getElementById('lastOperationId');
const backupInfoEl = document.getElementById('backupInfo');
const destructiveRecoveryPanel = document.getElementById('destructiveRecoveryPanel');
const destructiveRecoveryCount = document.getElementById('destructiveRecoveryCount');
const destructiveRecoveryList = document.getElementById('destructiveRecoveryList');
const refreshDestructiveRecoveryButton = document.getElementById('refreshDestructiveRecovery');
const entriesEl = document.getElementById('entries');
const domainFilterPanel = document.getElementById('domainFilterPanel');
const domainFilterTree = document.getElementById('domainFilterTree');
const domainSearchInput = document.getElementById('domainSearchInput');
const textFilterPanel = document.getElementById('textFilterPanel');
const textFilterRowsEl = document.getElementById('textFilterRows');
const addTextFilterRowButton = document.getElementById('addTextFilterRow');
const clearTextFilterButton = document.getElementById('clearTextFilter');
const textFilterLogicInputs = [...document.querySelectorAll('input[name="journalTextFilterLogic"]')];
const readingAllButton = document.getElementById('readingAll');
const readingReadButton = document.getElementById('readingRead');
const readingLaterButton = document.getElementById('readingLater');
const groupByUrlInput = document.getElementById('groupByUrl');
const paginationEl = document.getElementById('pagination');
const pagePrevButton = document.getElementById('pagePrev');
const pageNextButton = document.getElementById('pageNext');
const pageInfoEl = document.getElementById('pageInfo');
const currentButton = document.getElementById('showCurrent');
const siteButton = document.getElementById('showSite');
const allButton = document.getElementById('showAll');
const exportFileButton = document.getElementById('exportFile');
const importFileButton = document.getElementById('importFile');
const importFileInput = document.getElementById('importFileInput');
const exportYandexButton = document.getElementById('exportYandex');
const importYandexButton = document.getElementById('importYandex');
const clearSiteButton = document.getElementById('clearSite');
const clearAllButton = document.getElementById('clearAll');

const confirmBackdrop = document.getElementById('confirmBackdrop');
const confirmTitle = document.getElementById('confirmTitle');
const confirmText = document.getElementById('confirmText');
const confirmCode = document.getElementById('confirmCode');
const confirmInput = document.getElementById('confirmInput');
const confirmError = document.getElementById('confirmError');
const confirmCancel = document.getElementById('confirmCancel');
const confirmProceed = document.getElementById('confirmProceed');

const deleteBackdrop = document.getElementById('deleteBackdrop');
const deleteDialog = document.getElementById('deleteDialog');
const deleteTitle = document.getElementById('deleteTitle');
const deleteText = document.getElementById('deleteText');
const deleteChoices = document.getElementById('deleteChoices');
const deleteKeepFile = document.getElementById('deleteKeepFile');
const deleteTrashFile = document.getElementById('deleteTrashFile');
const deletePublicationChoices = document.getElementById('deletePublicationChoices');
const deletePreservePublicAccess = document.getElementById('deletePreservePublicAccess');
const deleteRevokePublicAccess = document.getElementById('deleteRevokePublicAccess');
const deleteStatus = document.getElementById('deleteStatus');
const deleteProgress = document.getElementById('deleteProgress');
const deleteProgressBar = document.getElementById('deleteProgressBar');
const deleteProgressPercent = document.getElementById('deleteProgressPercent');
const deleteProgressStages = document.getElementById('deleteProgressStages');
const deleteOperationIdRow = document.getElementById('deleteOperationIdRow');
const deleteOperationIdEl = document.getElementById('deleteOperationId');
const deleteCancel = document.getElementById('deleteCancel');
const deleteProceed = document.getElementById('deleteProceed');
const deleteRetry = document.getElementById('deleteRetry');
const deleteOnlyAfterError = document.getElementById('deleteOnlyAfterError');

const moveReadBackdrop = document.getElementById('moveReadBackdrop');
const moveReadDialog = document.getElementById('moveReadDialog');
const moveReadIcon = document.getElementById('moveReadIcon');
const moveReadKicker = document.getElementById('moveReadKicker');
const moveReadTitle = document.getElementById('moveReadTitle');
const moveReadText = document.getElementById('moveReadText');
const moveReadBar = document.getElementById('moveReadBar');
const moveReadPercent = document.getElementById('moveReadPercent');
const moveReadStages = document.getElementById('moveReadStages');
const moveReadOperationIdEl = document.getElementById('moveReadOperationId');
const moveReadClose = document.getElementById('moveReadClose');
const moveReadConfirmBackdrop = document.getElementById('moveReadConfirmBackdrop');
const moveReadConfirmText = document.getElementById('moveReadConfirmText');
const moveReadConfirmCancel = document.getElementById('moveReadConfirmCancel');
const moveReadConfirmProceed = document.getElementById('moveReadConfirmProceed');

const backupPickerBackdrop = document.getElementById('backupPickerBackdrop');
const backupPickerList = document.getElementById('backupPickerList');
const backupPickerStatus = document.getElementById('backupPickerStatus');
const backupPickerCancel = document.getElementById('backupPickerCancel');
const backupPickerCancelTop = document.getElementById('backupPickerCancelTop');
const backupPickerProceed = document.getElementById('backupPickerProceed');
const backupMonthPrev = document.getElementById('backupMonthPrev');
const backupMonthNext = document.getElementById('backupMonthNext');
const backupMonthLabel = document.getElementById('backupMonthLabel');

const backupProgressBackdrop = document.getElementById('backupProgressBackdrop');
const backupProgressDialog = document.getElementById('backupProgressDialog');
const backupProgressIcon = document.getElementById('backupProgressIcon');
const backupProgressKicker = document.getElementById('backupProgressKicker');
const backupProgressTitle = document.getElementById('backupProgressTitle');
const backupProgressText = document.getElementById('backupProgressText');
const backupProgressBar = document.getElementById('backupProgressBar');
const backupProgressPercent = document.getElementById('backupProgressPercent');
const backupProgressStages = document.getElementById('backupProgressStages');
const backupProgressOperationIdEl = document.getElementById('backupProgressOperationId');
const backupProgressClose = document.getElementById('backupProgressClose');
const journalPage = document.querySelector('main.page');

versionEl.textContent = `Версия ${chrome.runtime.getManifest().version}`;
applySourceContextToUi();

currentButton.addEventListener('click', () => setMode('current'));
siteButton.addEventListener('click', () => setMode('site'));
allButton.addEventListener('click', () => setMode('all'));
readingAllButton.addEventListener('click', () => setReadingFilter('all'));
readingReadButton.addEventListener('click', () => setReadingFilter('read'));
readingLaterButton.addEventListener('click', () => setReadingFilter('later'));
groupByUrlInput.addEventListener('change', async () => {
  groupByUrl = Boolean(groupByUrlInput.checked);
  currentPage = 1;
  urlGroupPageBoundaries = new Map([[1, null]]);
  try { await chrome.storage.local.set({ webclipJournalGroupByUrl: groupByUrl }); } catch (_) {}
  void renderCurrentEntries();
});
pagePrevButton.addEventListener('click', () => changePage(-1));
pageNextButton.addEventListener('click', () => changePage(1));
let domainSearchRefreshTimer = 0;
domainSearchInput.addEventListener('input', () => {
  domainSearchQuery = domainSearchInput.value.trim().toLowerCase();
  currentPage = 1;
  urlGroupPageBoundaries = new Map([[1, null]]);
  clearTimeout(domainSearchRefreshTimer);
  domainSearchRefreshTimer = setTimeout(() => {
    void loadJournal({ preserveScroll: true, clearStatus: false, refreshBackup: false });
  }, 180);
});
for (const input of textFilterLogicInputs) {
  input.addEventListener('change', () => {
    if (!input.checked) return;
    journalTextFilterLogic = input.value === 'or' ? 'or' : 'and';
    scheduleJournalTextFilterRefresh();
  });
}
addTextFilterRowButton.addEventListener('click', () => {
  if (journalTextFilterRows.length >= WebClipJournalTextFilter.MAX_ROWS) return;
  journalTextFilterRows.push({ id: nextJournalTextFilterRowId++, text: '', fields: { title: true, comments: false, site: false, url: false } });
  renderJournalTextFilterRows();
  const last = textFilterRowsEl.querySelector('.text-filter-row:last-child .text-filter-query');
  if (last) last.focus();
});
clearTextFilterButton.addEventListener('click', () => {
  journalTextFilterLogic = 'and';
  journalTextFilterRows = [{ id: nextJournalTextFilterRowId++, text: '', fields: { title: true, comments: false, site: false, url: false } }];
  for (const input of textFilterLogicInputs) input.checked = input.value === 'and';
  renderJournalTextFilterRows();
  scheduleJournalTextFilterRefresh(true);
});
renderJournalTextFilterRows();
exportFileButton.addEventListener('click', exportJournalToFile);
importFileButton.addEventListener('click', () => importFileInput.click());
importFileInput.addEventListener('change', importJournalFromSelectedFile);
exportYandexButton.addEventListener('click', exportJournalToYandex);
importYandexButton.addEventListener('click', importJournalFromYandex);
clearSiteButton.addEventListener('click', clearDomainJournal);
clearAllButton.addEventListener('click', clearEntireJournal);
refreshDestructiveRecoveryButton.addEventListener('click', () => void refreshDestructiveRecovery());
destructiveRecoveryList.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target.closest('button[data-manual-receipt-id]') : null;
  if (!target) return;
  const receipt = manualDestructiveReceipts.get(String(target.dataset.manualReceiptId || ''));
  if (receipt) void dismissManualDestructiveReceipt(receipt, target);
});
document.getElementById('copyLastOperationId').addEventListener('click', () => copyOperationId(lastOperationIdEl.textContent));
confirmCancel.addEventListener('click', () => finishConfirmation(false));
confirmProceed.addEventListener('click', verifyConfirmationCode);
confirmInput.addEventListener('input', () => {
  confirmInput.value = confirmInput.value.replace(/\D/g, '').slice(0, 9);
  confirmError.textContent = '';
});
confirmInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') verifyConfirmationCode();
  if (event.key === 'Escape') finishConfirmation(false);
});

deleteKeepFile.addEventListener('change', updateDeleteChoiceState);
deleteTrashFile.addEventListener('change', updateDeleteChoiceState);
deletePreservePublicAccess.addEventListener('change', updateDeleteChoiceState);
deleteRevokePublicAccess.addEventListener('change', updateDeleteChoiceState);
deleteCancel.addEventListener('click', closeDeleteDialog);
deleteProceed.addEventListener('click', confirmDeleteEntry);
deleteRetry.addEventListener('click', () => runDeleteOperation(deleteRetryAction, deleteRetryPublicationAction));
deleteOnlyAfterError.addEventListener('click', () => runDeleteOperation('keep', deleteRetryPublicationAction));
document.getElementById('copyDeleteOperationId').addEventListener('click', () => copyOperationId(activeDeleteOperationId));
moveReadClose.addEventListener('click', closeMoveReadProgress);
document.getElementById('copyMoveReadOperationId').addEventListener('click', () => copyOperationId(activeMoveReadOperationId));
moveReadConfirmCancel.addEventListener('click', () => finishMoveReadConfirmation(false));
moveReadConfirmProceed.addEventListener('click', () => finishMoveReadConfirmation(true));
moveReadConfirmBackdrop.addEventListener('click', (event) => {
  if (event.target === moveReadConfirmBackdrop) finishMoveReadConfirmation(false);
});
deleteBackdrop.addEventListener('click', (event) => { if (event.target === deleteBackdrop && !journalDeleteBusy) closeDeleteDialog(); });
window.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!moveReadConfirmBackdrop.classList.contains('hidden')) {
    finishMoveReadConfirmation(false);
    return;
  }
  if (!deleteBackdrop.classList.contains('hidden') && !journalDeleteBusy) closeDeleteDialog();
});

backupPickerCancel.addEventListener('click', closeYandexBackupPicker);
backupPickerCancelTop.addEventListener('click', closeYandexBackupPicker);
backupPickerProceed.addEventListener('click', importSelectedYandexBackup);
backupMonthPrev.addEventListener('click', () => changeBackupMonth(-1));
backupMonthNext.addEventListener('click', () => changeBackupMonth(1));
backupProgressClose.addEventListener('click', closeBackupProgress);
document.getElementById('copyBackupProgressOperationId').addEventListener('click', () => copyOperationId(activeBackupOperationId));
const backupProgressPortController = createReconnectableProgressPort('webclip-journal-backup-progress', (message) => {
  if (message?.type !== 'WEBCLIP_JOURNAL_BACKUP_PROGRESS') return;
  if (!activeBackupOperationId || message.operationId !== activeBackupOperationId) return;
  updateBackupProgress(message);
}, () => backupProgressActive);
const operationProgressPortController = createReconnectableProgressPort('webclip-journal-operation-progress', (message) => {
  if (message?.type !== 'WEBCLIP_JOURNAL_OPERATION_PROGRESS') return;
  if (activeDeleteOperationId && message.operationId === activeDeleteOperationId) updateDeleteProgress(message);
  if (activeMoveReadOperationId && message.operationId === activeMoveReadOperationId) updateMoveReadProgress(message);
}, () => journalDeleteBusy || moveReadBusy);
window.addEventListener('beforeunload', (event) => {
  if (!backupProgressActive && !journalDeleteBusy && !moveReadBusy) return;
  event.preventDefault();
  event.returnValue = '';
});

function applySourceContextToUi() {
  const hasSourceContext = /^https?:\/\//i.test(sourceUrl);
  sourceUrlEl.textContent = sourceUrl || (mode === 'all' ? 'контекст страницы не задан' : 'не определён');
  siteKeyEl.textContent = siteKeyFromUrl(sourceUrl) || (mode === 'all' ? 'все домены' : 'не определён');
  currentButton.disabled = !hasSourceContext;
  siteButton.disabled = !hasSourceContext;
  clearSiteButton.disabled = !hasSourceContext;
  updateJournalModeCounts();
}

async function loadStoredJournalContext() {
  if (!journalContextId) return;
  try {
    const key = `webclipJournalContext:${journalContextId}`;
    const stored = await readJournalExtensionApiBounded(() => chrome.storage.session.get(key), 'Чтение session-контекста журнала');
    const context = stored?.[key];
    const createdAt = Number(context?.createdAt || 0);
    const now = Date.now();
    const rawUrl = String(context?.sourceUrl || '');
    const fresh = context && typeof context === 'object'
      && Number.isFinite(createdAt) && createdAt > 0 && createdAt <= now
      && now - createdAt <= JOURNAL_CONTEXT_TTL_MS
      && rawUrl.length <= MAX_JOURNAL_CONTEXT_URL_CHARS;
    if (fresh) {
      sourceTabId = Math.max(0, Math.floor(Number(context.sourceTabId) || 0));
      sourceUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : '';
    }
  } catch (_) {}
}

async function resolveSourceContext() {
  await loadStoredJournalContext();
  if (!(sourceTabId > 0)) {
    applySourceContextToUi();
    return;
  }
  try {
    const tab = await readJournalExtensionApiBounded(() => chrome.tabs.get(sourceTabId), 'Проверка исходной вкладки журнала');
    if (/^https?:\/\//i.test(tab?.url || '')) sourceUrl = tab.url;
  } catch (_) {}
  applySourceContextToUi();
}

function currentJournalTextFilter() {
  return WebClipJournalTextFilter.normalize({
    logic: journalTextFilterLogic,
    rows: journalTextFilterRows.map((row) => ({ text: row.text, fields: { ...row.fields } }))
  });
}

function scheduleJournalTextFilterRefresh(immediate = false) {
  currentPage = 1;
  urlGroupPageBoundaries = new Map([[1, null]]);
  clearTimeout(journalTextFilterRefreshTimer);
  journalTextFilterRefreshTimer = setTimeout(() => {
    void loadJournal({ preserveScroll: true, clearStatus: false, refreshBackup: false });
  }, immediate ? 0 : 180);
}

function renderJournalTextFilterRows() {
  textFilterRowsEl.replaceChildren();
  addTextFilterRowButton.disabled = journalTextFilterRows.length >= WebClipJournalTextFilter.MAX_ROWS;
  for (const row of journalTextFilterRows) {
    const wrap = document.createElement('div');
    wrap.className = 'text-filter-row';
    wrap.dataset.rowId = String(row.id);

    const query = document.createElement('input');
    query.type = 'search';
    query.className = 'text-filter-query';
    query.maxLength = WebClipJournalTextFilter.MAX_QUERY_CHARS;
    query.placeholder = 'Текст для поиска';
    query.autocomplete = 'off';
    query.spellcheck = false;
    query.value = row.text;
    query.setAttribute('aria-label', 'Текст условия фильтра журнала');
    query.addEventListener('input', () => {
      row.text = query.value.slice(0, WebClipJournalTextFilter.MAX_QUERY_CHARS);
      scheduleJournalTextFilterRefresh();
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'secondary text-filter-remove';
    remove.textContent = 'Удалить строку';
    remove.disabled = journalTextFilterRows.length <= 1;
    remove.addEventListener('click', () => {
      if (journalTextFilterRows.length <= 1) return;
      journalTextFilterRows = journalTextFilterRows.filter((candidate) => candidate.id !== row.id);
      renderJournalTextFilterRows();
      scheduleJournalTextFilterRefresh(true);
    });

    const fields = document.createElement('div');
    fields.className = 'text-filter-fields';
    const labels = [
      ['title', 'Наименование'],
      ['comments', 'Комментарии'],
      ['site', 'Сайт'],
      ['url', 'URL']
    ];
    for (const [field, labelText] of labels) {
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = Boolean(row.fields[field]);
      checkbox.addEventListener('change', () => {
        row.fields[field] = checkbox.checked;
        if (!Object.values(row.fields).some(Boolean)) {
          row.fields.title = true;
          const titleCheckbox = fields.querySelector('input[data-field="title"]');
          if (titleCheckbox) titleCheckbox.checked = true;
        }
        scheduleJournalTextFilterRefresh();
      });
      checkbox.dataset.field = field;
      label.append(checkbox, document.createTextNode(labelText));
      fields.appendChild(label);
    }

    wrap.append(query, remove, fields);
    textFilterRowsEl.appendChild(wrap);
  }
}

async function loadJournalViewPreferences() {
  try {
    const stored = await readJournalExtensionApiBounded(() => chrome.storage.local.get('webclipJournalGroupByUrl'), 'Восстановление настроек отображения журнала');
    groupByUrl = Boolean(stored.webclipJournalGroupByUrl);
    groupByUrlInput.checked = groupByUrl;
  } catch (_) {
    groupByUrl = false;
    groupByUrlInput.checked = false;
  }
  updateReadingFilterButtons();
}

function updateReadingFilterButtons() {
  const states = [
    [readingAllButton, readingFilter === 'all'],
    [readingReadButton, readingFilter === 'read'],
    [readingLaterButton, readingFilter === 'later']
  ];
  for (const [button, active] of states) {
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  }
}

function setReadingFilter(value) {
  readingFilter = value === 'later' ? 'later' : value === 'read' ? 'read' : 'all';
  currentPage = 1;
  selectedDomainFilter = { level: 'all', value: '' };
  urlGroupPageBoundaries = new Map([[1, null]]);
  updateReadingFilterButtons();
  updateJournalModeCounts();
  void loadJournal({ preserveScroll: true, clearStatus: false, refreshBackup: false });
}

function changePage(delta) {
  currentPage = Math.max(1, currentPage + Number(delta || 0));
  void renderCurrentEntries();
  window.scrollTo({ top: Math.max(0, entriesEl.offsetTop - 18), behavior: 'smooth' });
}

function updateModeButtons() {
  const states = [
    [currentButton, mode === 'current'],
    [siteButton, mode === 'site'],
    [allButton, mode === 'all']
  ];
  for (const [button, active] of states) {
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  }
}

function journalRevisionToken(value) {
  if (!value || typeof value !== 'object') return '';
  return `${Number(value.changedAt || 0)}:${String(value.nonce || '')}:${String(value.reason || '')}`;
}

async function readJournalRevisionToken() {
  try {
    const stored = await readJournalExtensionApiBounded(() => chrome.storage.local.get('webclipJournalRevision'), 'Чтение revision журнала');
    return journalRevisionToken(stored.webclipJournalRevision);
  } catch (_) {
    return '';
  }
}

async function syncJournalRevisionBaseline() {
  lastJournalRevisionToken = await readJournalRevisionToken();
}

function scheduleJournalReload(delay = 120, { preserveScroll = true } = {}) {
  clearTimeout(journalReloadTimer);
  journalReloadTimer = setTimeout(async () => {
    try {
      await resolveSourceContext();
      await loadJournal({ preserveScroll });
    } catch (error) {
      showRuntimeReloadHint(error);
    }
  }, delay);
}

function scheduleJournalRevisionCheck(delay = 80) {
  clearTimeout(journalRevisionCheckTimer);
  journalRevisionCheckTimer = setTimeout(async () => {
    try {
      const revision = await readJournalRevisionToken();
      if (lastJournalRevisionToken === null) {
        lastJournalRevisionToken = revision;
        return;
      }
      if (revision !== lastJournalRevisionToken) scheduleJournalReload(0, { preserveScroll: true });
    } catch (error) {
      showRuntimeReloadHint(error);
    }
  }, delay);
}

function showRuntimeReloadHint(error) {
  const text = String(error?.message || error || '');
  if (!/Extension context invalidated|Receiving end does not exist|message port closed|Could not establish connection/i.test(text)) return;
  setStatus('Расширение было обновлено или перезапущено. Перезагрузите эту вкладку журнала, чтобы подключить её к актуальной версии WebClip.', 'error');
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'WEBCLIP_JOURNAL_CHANGED') {
    // Live runtime notification must not depend on storage.local revision
    // settling. scheduleJournalReload() already coalesces bursts; the durable
    // revision marker remains the fallback for pageshow/missed messages.
    scheduleJournalReload(40, { preserveScroll: true });
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes.webclipJournalRevision) return;
  const nextRevision = journalRevisionToken(changes.webclipJournalRevision.newValue);
  if (lastJournalRevisionToken === null || nextRevision !== lastJournalRevisionToken) {
    scheduleJournalReload(40, { preserveScroll: true });
  }
});

async function runJournalHealthCheck() {
  if (document.visibilityState !== 'visible') return;
  try {
    const pong = await sendReadOnlyRuntimeMessage({ type: 'WEBCLIP_JOURNAL_PING' }, JOURNAL_EXTENSION_API_TIMEOUT_MS, 'Проверка связи журнала с service worker');
    if (!pong?.ok) throw new Error(pong?.error || 'Нет связи с service worker.');
  } catch (error) {
    showRuntimeReloadHint(error);
  }
}

function scheduleJournalHealthCheck(delay = 60000) {
  clearTimeout(journalHealthTimer);
  if (document.visibilityState !== 'visible') return;
  journalHealthTimer = setTimeout(async () => {
    await runJournalHealthCheck();
    scheduleJournalHealthCheck(60000);
  }, delay);
}

window.addEventListener('focus', () => {
  scheduleJournalRevisionCheck(40);
  scheduleJournalHealthCheck(500);
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    scheduleJournalRevisionCheck(40);
    scheduleJournalHealthCheck(500);
  } else {
    clearTimeout(journalHealthTimer);
  }
});
window.addEventListener('pageshow', () => {
  scheduleJournalRevisionCheck(40);
  scheduleJournalHealthCheck(500);
});
window.addEventListener('pagehide', () => {
  clearTimeout(journalHealthTimer);
  clearTimeout(journalReloadTimer);
  clearTimeout(journalRevisionCheckTimer);
  clearTimeout(domainSearchRefreshTimer);
});
scheduleJournalHealthCheck(60000);

function setMode(nextMode) {
  if (nextMode === 'current' && currentButton.disabled) return;
  if (nextMode === 'site' && siteButton.disabled) return;
  mode = nextMode;
  currentPage = 1;
  if (mode !== 'all') selectedDomainFilter = { level: 'all', value: '' };
  loadJournal({ preserveScroll: false, clearStatus: true });
}

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return parsed.toString();
  } catch (_) {
    return String(url || '').split('#')[0];
  }
}

function isOpenableYandexPublicUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    return host === 'disk.yandex.ru' || host.endsWith('.disk.yandex.ru') || host === 'yadi.sk';
  } catch (_) {
    return false;
  }
}

function hostnameFromValue(value) {
  const resolver = globalThis.WebClipPublicSuffix;
  if (resolver?.normalizeHostname) return resolver.normalizeHostname(value);
  const raw = String(value || '').trim();
  if (!raw) return '';
  try { return new URL(raw).hostname.toLowerCase().replace(/^\.+|\.+$/g, ''); } catch (_) {}
  return raw.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0].toLowerCase().replace(/^\.+|\.+$/g, '');
}

function domainHierarchyFromValue(value) {
  const resolver = globalThis.WebClipPublicSuffix;
  if (resolver?.hierarchy) return resolver.hierarchy(value);
  const host = hostnameFromValue(value);
  const labels = host.split('.').filter(Boolean);
  if (!labels.length) return { host: '', publicSuffix: '', base: '', third: '' };
  if (labels.length === 1) return { host, publicSuffix: host, base: host, third: host };
  const base = labels.slice(-2).join('.');
  const third = labels.length > 2 ? labels.slice(-3).join('.') : base;
  return { host, publicSuffix: labels.at(-1) || '', base, third };
}

function siteKeyFromUrl(url) {
  return domainHierarchyFromValue(url).third;
}

function entryDomainHierarchy(entry) {
  return domainHierarchyFromValue(entry?.url || entry?.hostname || '');
}

function monthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthKey(date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
}

function formatMonthLabel(date) {
  return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

function addMonths(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function isSameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function openTransferDbForImport() {
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
      reject(error instanceof Error ? error : new Error(String(error || 'Не удалось открыть временное хранилище импорта.')));
    };
    const timer = setTimeout(() => fail(new Error('Подготовка временного хранилища импорта заняла слишком много времени.')), 10000);
    try {
      request = indexedDB.open(TRANSFER_DB_NAME, TRANSFER_DB_VERSION);
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
        const db = request.result;
        if (!db.objectStoreNames.contains(TRANSFER_STORE)) db.createObjectStore(TRANSFER_STORE, { keyPath: 'id' });
      } catch (error) {
        abortLateUpgrade();
        fail(error);
      }
    };
    request.onblocked = () => fail(new Error('Временное хранилище импорта заблокировано другой страницей WebClip.'));
    request.onerror = () => fail(request.error || new Error('Не удалось открыть временное хранилище импорта.'));
    request.onsuccess = () => {
      if (settled) { try { request.result.close(); } catch (_) {} return; }
      settled = true;
      clearTimeout(timer);
      const db = request.result;
      db.onversionchange = () => { try { db.close(); } catch (_) {} };
      resolve(db);
    };
  });
}

async function stageJournalImportFile(file) {
  if (!(file instanceof Blob)) throw new Error('Не выбран файл журнала для импорта.');
  const totalBytes = Math.max(0, Number(file.size) || 0);
  if (totalBytes > MAX_JOURNAL_IMPORT_BYTES) throw new Error('Файл журнала больше безопасного предела 50 МБ.');
  const preflight = await chrome.runtime.sendMessage({
    type: 'WEBCLIP_STORAGE_PREFLIGHT',
    requiredBytes: Math.min(256 * 1024 * 1024, totalBytes * 2 + 16 * 1024 * 1024),
    reason: 'подготовки импорта журнала'
  });
  if (preflight?.ok === false) throw new Error(preflight.error || 'Недостаточно хранилища Chrome для подготовки импорта журнала.');

  const id = `journal-import-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  const chunkCount = Math.max(1, Math.ceil(totalBytes / JOURNAL_IMPORT_CHUNK_BYTES));
  const db = await openTransferDbForImport();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(TRANSFER_STORE, 'readwrite');
      const timer = setTimeout(() => {
        try { tx.abort(); } catch (_) {}
      }, 60_000);
      const store = tx.objectStore(TRANSFER_STORE);
      for (let index = 0; index < chunkCount; index += 1) {
        const start = index * JOURNAL_IMPORT_CHUNK_BYTES;
        const end = Math.min(totalBytes, start + JOURNAL_IMPORT_CHUNK_BYTES);
        const blob = file.slice(start, end, 'application/json');
        store.put({
          id: `${id}:chunk:${String(index).padStart(6, '0')}`,
          kind: 'journal-import-chunk-blob',
          baseId: id,
          chunkIndex: index,
          blob,
          byteCount: blob.size,
          createdAt: Date.now()
        });
      }
      store.put({
        id,
        kind: 'journal-import-manifest',
        chunkCount,
        totalBytes,
        createdAt: Date.now()
      });
      tx.oncomplete = () => { clearTimeout(timer); resolve(); };
      tx.onerror = () => { clearTimeout(timer); reject(tx.error || new Error('Не удалось подготовить файл журнала к импорту.')); };
      tx.onabort = () => { clearTimeout(timer); reject(tx.error || new Error('Подготовка файла журнала к импорту была прервана или превысила deadline.')); };
    });
  } catch (error) {
    await chrome.runtime.sendMessage({ type: 'WEBCLIP_JOURNAL_IMPORT_DISCARD_STAGED', stagingKey: id }).catch(() => {});
    throw error;
  } finally { db.close(); }
  return id;
}

async function discardStagedJournalImport(stagingKey, importLease = null) {
  const key = String(stagingKey || '');
  if (!key) return { ok: true };
  const response = await chrome.runtime.sendMessage({
    type: 'WEBCLIP_JOURNAL_IMPORT_DISCARD_STAGED',
    stagingKey: key,
    leaseToken: String(importLease?.leaseToken || ''),
    ownerSessionId: journalImportOwnerSessionId
  });
  requireOk(response);
  if (activeJournalImportLease?.leaseToken === importLease?.leaseToken) stopJournalImportLeaseHeartbeat();
  return response;
}

function requireJournalImportPreviewReceipt(response) {
  const receipt = response?.previewReceipt;
  if (
    !receipt
    || typeof receipt !== 'object'
    || receipt.mode !== 'replace'
    || !/^[0-9a-f]{64}$/.test(String(receipt.contentSha256 || ''))
    || receipt.contentSha256 !== response.contentSha256
  ) {
    throw new Error('Service worker не вернул корректную квитанцию проверки резервной копии. Импорт остановлен.');
  }
  return receipt;
}

function requireJournalImportLease(response) {
  const leaseToken = String(response?.leaseToken || '');
  const leaseExpiresAt = Number(response?.leaseExpiresAt);
  const hardExpiresAt = Number(response?.hardExpiresAt);
  if (
    !/^[A-Za-z0-9._:-]{1,180}$/.test(leaseToken)
    || !Number.isSafeInteger(leaseExpiresAt)
    || !Number.isSafeInteger(hardExpiresAt)
    || leaseExpiresAt <= Date.now()
    || hardExpiresAt < leaseExpiresAt
  ) {
    throw new Error('Service worker не вернул корректный lease подготовленного импорта. Импорт остановлен.');
  }
  return {
    leaseToken,
    leaseExpiresAt,
    hardExpiresAt
  };
}

function stopJournalImportLeaseHeartbeat() {
  if (journalImportLeaseHeartbeatTimer) clearInterval(journalImportLeaseHeartbeatTimer);
  journalImportLeaseHeartbeatTimer = 0;
  activeJournalImportLease = null;
  journalImportLeaseLostError = null;
}

function startJournalImportLeaseHeartbeat(importLease) {
  if (journalImportLeaseHeartbeatTimer) clearInterval(journalImportLeaseHeartbeatTimer);
  activeJournalImportLease = importLease;
  journalImportLeaseLostError = null;
  journalImportLeaseHeartbeatTimer = setInterval(async () => {
    const current = activeJournalImportLease;
    if (!current) return;
    try {
      const renewed = await chrome.runtime.sendMessage({
        type: 'WEBCLIP_JOURNAL_IMPORT_LEASE_RENEW',
        leaseToken: current.leaseToken,
        ownerSessionId: journalImportOwnerSessionId
      });
      requireOk(renewed);
      if (activeJournalImportLease?.leaseToken === current.leaseToken) {
        current.leaseExpiresAt = Number(renewed.leaseExpiresAt || current.leaseExpiresAt);
        current.hardExpiresAt = Number(renewed.hardExpiresAt || current.hardExpiresAt);
      }
    } catch (error) {
      if (activeJournalImportLease?.leaseToken !== current.leaseToken) return;
      journalImportLeaseLostError = error instanceof Error ? error : new Error(String(error || 'Lease импорта потерян.'));
      clearInterval(journalImportLeaseHeartbeatTimer);
      journalImportLeaseHeartbeatTimer = 0;
    }
  }, JOURNAL_IMPORT_LEASE_HEARTBEAT_MS);
}

function assertJournalImportLeaseUsable(importLease) {
  if (
    !importLease
    || activeJournalImportLease?.leaseToken !== importLease.leaseToken
    || journalImportLeaseLostError
    || Number(importLease.leaseExpiresAt || 0) <= Date.now()
  ) {
    throw journalImportLeaseLostError || new Error('Lease импорта истёк. Перезагрузите Журнал и возобновите импорт явно.');
  }
}

function journalImportReplaceConfirmationText(preview, sourceLabel) {
  return `Текущий локальный журнал будет полностью заменён данными из ${sourceLabel}.
Записей: ${preview.entryCount}.
Дата экспорта: ${preview.exportedAt || 'не указана'}.
SHA-256 проверенной копии: ${preview.contentSha256}.
Действие нельзя отменить.`;
}

function openJournalDbForView() {
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
      reject(error instanceof Error ? error : new Error(String(error || 'Не удалось открыть локальный журнал WebClip.')));
    };
    const timer = setTimeout(() => fail(new Error('Открытие локального журнала заняло слишком много времени. Закройте/обновите другие страницы WebClip и повторите.')), 10000);
    try {
      request = indexedDB.open(JOURNAL_DB_NAME, JOURNAL_DB_VERSION);
    } catch (error) {
      fail(error);
      return;
    }
    request.onupgradeneeded = () => {
      if (settled) {
        abortLateUpgrade();
        return;
      }
      const db = request.result;
      let store;
      if (!db.objectStoreNames.contains(JOURNAL_STORE)) store = db.createObjectStore(JOURNAL_STORE, { keyPath: 'id' });
      else store = request.transaction.objectStore(JOURNAL_STORE);
      if (!store.indexNames.contains('createdAt')) store.createIndex('createdAt', 'createdAt', { unique: false });
      if (!store.indexNames.contains('urlKey')) store.createIndex('urlKey', 'urlKey', { unique: false });
      if (!store.indexNames.contains('urlKeyCreatedAt')) store.createIndex('urlKeyCreatedAt', ['urlKey', 'createdAt'], { unique: false });
      if (!store.indexNames.contains('siteKeyCreatedAt')) store.createIndex('siteKeyCreatedAt', ['siteKey', 'createdAt'], { unique: false });
      if (!db.objectStoreNames.contains('urlStats')) db.createObjectStore('urlStats', { keyPath: 'urlKey' });
      if (!db.objectStoreNames.contains(JOURNAL_META_STORE)) db.createObjectStore(JOURNAL_META_STORE, { keyPath: 'key' });
      if (!db.objectStoreNames.contains('pendingAppends')) {
        const pendingStore = db.createObjectStore('pendingAppends', { keyPath: 'id' });
        pendingStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      } else {
        const pendingStore = request.transaction.objectStore('pendingAppends');
        if (!pendingStore.indexNames.contains('updatedAt')) pendingStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('pendingDownloads')) {
        const pendingDownloadStore = db.createObjectStore('pendingDownloads', { keyPath: 'downloadId' });
        pendingDownloadStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      } else {
        const pendingDownloadStore = request.transaction.objectStore('pendingDownloads');
        if (!pendingDownloadStore.indexNames.contains('updatedAt')) pendingDownloadStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('pendingRemoteSaves')) {
        const pendingRemoteStore = db.createObjectStore('pendingRemoteSaves', { keyPath: 'id' });
        pendingRemoteStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      } else {
        const pendingRemoteStore = request.transaction.objectStore('pendingRemoteSaves');
        if (!pendingRemoteStore.indexNames.contains('updatedAt')) pendingRemoteStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('pendingDestructiveMoves')) {
        const destructiveStore = db.createObjectStore('pendingDestructiveMoves', { keyPath: 'id' });
        destructiveStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        destructiveStore.createIndex('sourceJournalEntryId', 'sourceJournalEntryId', { unique: false });
      } else {
        const destructiveStore = request.transaction.objectStore('pendingDestructiveMoves');
        if (!destructiveStore.indexNames.contains('updatedAt')) destructiveStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        if (!destructiveStore.indexNames.contains('sourceJournalEntryId')) destructiveStore.createIndex('sourceJournalEntryId', 'sourceJournalEntryId', { unique: false });
      }
      if (!db.objectStoreNames.contains('importStaging')) {
        const importStore = db.createObjectStore('importStaging', { keyPath: 'key' });
        importStore.createIndex('importId', 'importId', { unique: false });
        importStore.createIndex('createdAt', 'createdAt', { unique: false });
      } else {
        const importStore = request.transaction.objectStore('importStaging');
        if (!importStore.indexNames.contains('importId')) importStore.createIndex('importId', 'importId', { unique: false });
        if (!importStore.indexNames.contains('createdAt')) importStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { try { db.close(); } catch (_) {} };
      if (settled) { try { db.close(); } catch (_) {} return; }
      settled = true;
      clearTimeout(timer);
      resolve(db);
    };
    request.onerror = () => fail(request.error || new Error('Не удалось открыть локальный журнал WebClip.'));
    request.onblocked = () => fail(new Error('Доступ к локальному журналу заблокирован другой страницей WebClip. Закройте/обновите её и повторите.'));
  });
}

function journalEntryViewSummary(entry = {}) {
  const url = String(entry.url || '').slice(0, 8192);
  const hostname = String(entry.hostname || '').slice(0, 255);
  return {
    id: String(entry.id || '').slice(0, 180),
    createdAt: Number(entry.createdAt || 0),
    destination: entry.destination === 'yandex' ? 'yandex' : 'download',
    readingMode: entry.destination === 'yandex' && entry.readingMode === 'later' ? 'later' : 'read',
    hostname,
    url,
    urlKey: String(entry.urlKey || normalizeUrl(url)).slice(0, 8192),
    siteKey: String(siteKeyFromUrl(url || hostname)).slice(0, 1024)
  };
}

function makeEmptyJournalModeCounts() {
  const row = () => ({ all: 0, read: 0, later: 0 });
  return { current: row(), site: row(), all: row() };
}

function addJournalModeCount(counts, scope, readingMode) {
  const row = counts?.[scope];
  if (!row) return;
  const kind = readingMode === 'later' ? 'later' : 'read';
  row.all += 1;
  row[kind] += 1;
}

function selectedReadingCount(row) {
  if (!row) return 0;
  return Number(row[readingFilter === 'later' ? 'later' : readingFilter === 'read' ? 'read' : 'all'] || 0);
}

function normalizeReadingFilter(value) {
  return value === 'later' ? 'later' : value === 'read' ? 'read' : 'all';
}

function makeJournalViewContext({ viewMode = 'all', source = '', reading = 'all', domainFilter = null, textFilter = null } = {}) {
  const normalizedMode = viewMode === 'current' ? 'current' : viewMode === 'site' ? 'site' : 'all';
  const sourceIsHttp = /^https?:\/\//i.test(String(source || ''));
  return {
    viewMode: normalizedMode,
    sourceUrlKey: sourceIsHttp ? normalizeUrl(source) : '',
    sourceSiteKey: sourceIsHttp ? siteKeyFromUrl(source) : '',
    reading: normalizeReadingFilter(reading),
    domainFilter: domainFilter && typeof domainFilter === 'object'
      ? { level: String(domainFilter.level || 'all'), value: String(domainFilter.value || '') }
      : { level: 'all', value: '' },
    textFilter: WebClipJournalTextFilter.normalize(textFilter)
  };
}

function journalSummaryMatchesView(summary, context, { skipMode = false, entry = null } = {}) {
  if (!skipMode) {
    if (context.viewMode === 'current' && (!context.sourceUrlKey || summary.urlKey !== context.sourceUrlKey)) return false;
    if (context.viewMode === 'site' && (!context.sourceSiteKey || summary.siteKey !== context.sourceSiteKey)) return false;
  }
  if (context.reading !== 'all' && summary.readingMode !== context.reading) return false;
  if (context.viewMode === 'all' && context.domainFilter.level !== 'all') {
    const info = entryDomainHierarchy(summary);
    if (context.domainFilter.level === 'base' && info.base !== context.domainFilter.value) return false;
    if (context.domainFilter.level === 'third' && info.third !== context.domainFilter.value) return false;
  }
  if (!WebClipJournalTextFilter.matches(entry || summary, context.textFilter)) return false;
  return true;
}

function makeJournalViewDeadlineError(label) {
  const error = new Error(`${label} превысило безопасный лимит ${Math.round(JOURNAL_VIEW_QUERY_DEADLINE_MS / 1000)} с.`);
  error.code = 'JOURNAL_VIEW_QUERY_TIMEOUT';
  return error;
}

async function readJournalEntriesByIdsForView(ids) {
  const uniqueIds = [...new Set((Array.isArray(ids) ? ids : []).map((id) => String(id || '').trim()).filter(Boolean))].slice(0, 500);
  if (!uniqueIds.length) return [];
  try {
    const db = await openJournalDbForView();
    try {
      return await new Promise((resolve, reject) => {
        const results = new Map();
        let timedOut = false;
        let requestError = null;
        const tx = db.transaction(JOURNAL_STORE, 'readonly');
        const store = tx.objectStore(JOURNAL_STORE);
        const timer = setTimeout(() => {
          timedOut = true;
          try { tx.abort(); } catch (_) {}
        }, JOURNAL_VIEW_QUERY_DEADLINE_MS);
        for (const id of uniqueIds) {
          const req = store.get(id);
          req.onsuccess = () => { if (req.result) results.set(id, req.result); };
          req.onerror = () => { requestError = req.error || new Error('Не удалось прочитать запись журнала.'); };
        }
        tx.oncomplete = () => {
          clearTimeout(timer);
          resolve(uniqueIds.map((id) => results.get(id)).filter(Boolean));
        };
        tx.onerror = () => { clearTimeout(timer); reject(requestError || tx.error || new Error('Не удалось прочитать записи журнала WebClip.')); };
        tx.onabort = () => {
          clearTimeout(timer);
          reject(timedOut ? makeJournalViewDeadlineError('Чтение записей страницы журнала') : (requestError || tx.error || new Error('Чтение записей журнала было прервано.')));
        };
      });
    } finally { db.close(); }
  } catch (directError) {
    console.warn('WebClip journal: direct get-many failed, fallback to service worker', directError);
    const response = await sendReadOnlyRuntimeMessage({ type: 'WEBCLIP_JOURNAL_GET_MANY', ids: uniqueIds }, JOURNAL_VIEW_RUNTIME_DEADLINE_MS, 'Чтение записей журнала через service worker');
    requireOk(response);
    const byId = new Map((Array.isArray(response.entries) ? response.entries : []).map((entry) => [String(entry?.id || ''), entry]));
    return uniqueIds.map((id) => byId.get(id)).filter(Boolean);
  }
}

function collectBoundedDomainAggregate(state, summary, query, requestedReadingFilter = 'all') {
  const normalizedReading = normalizeReadingFilter(requestedReadingFilter);
  if (normalizedReading !== 'all' && summary.readingMode !== normalizedReading) return;
  state.totalEntries += 1;
  const info = entryDomainHierarchy(summary);
  const base = String(info.base || '');
  const third = String(info.third || '');
  if (!base) return;
  const baseMatches = !query || base.includes(query);
  const thirdMatches = !query || third.includes(query);
  const existing = state.groups.get(base);
  if (!existing) {
    if (!baseMatches && !thirdMatches) return;
    if (state.groups.size >= MAX_DOMAIN_FILTER_BASES) {
      state.truncated = true;
      return;
    }
    state.groups.set(base, { base, count: 0, latest: Number(summary.createdAt || 0), children: new Map() });
  }
  const group = state.groups.get(base);
  group.count += 1;
  if (!third || third === base) return;
  const child = group.children.get(third);
  if (child) {
    child.count += 1;
    return;
  }
  if (query && !baseMatches && !thirdMatches) return;
  if (state.childCount >= MAX_DOMAIN_FILTER_CHILDREN) {
    state.childrenTruncated = true;
    return;
  }
  group.children.set(third, { third, count: 1, latest: Number(summary.createdAt || 0) });
  state.childCount += 1;
}

function finalizeDomainAggregate(state) {
  const groups = [...state.groups.values()].map((group) => ({
    base: group.base,
    count: group.count,
    latest: group.latest,
    children: [...group.children.values()].sort((a, b) => b.latest - a.latest || a.third.localeCompare(b.third, 'ru'))
  }));
  groups.sort((a, b) => b.latest - a.latest || a.base.localeCompare(b.base, 'ru'));
  return {
    totalEntries: state.totalEntries,
    groups,
    truncated: Boolean(state.truncated),
    childrenTruncated: Boolean(state.childrenTruncated)
  };
}

async function readJournalViewMetaDirect({ source = '', reading = 'all', domainSearch = '', includeDomains = true, textFilter = null } = {}) {
  const sourceContext = makeJournalViewContext({ viewMode: 'all', source, reading: 'all', textFilter });
  const counts = makeEmptyJournalModeCounts();
  const domainState = { totalEntries: 0, groups: new Map(), childCount: 0, truncated: false, childrenTruncated: false };
  const query = String(domainSearch || '').trim().toLowerCase();
  const db = await openJournalDbForView();
  try {
    return await new Promise((resolve, reject) => {
      let timedOut = false;
      let requestError = null;
      const tx = db.transaction(JOURNAL_STORE, 'readonly');
      const store = tx.objectStore(JOURNAL_STORE);
      const index = store.indexNames.contains('createdAt') ? store.index('createdAt') : null;
      const request = index ? index.openCursor(null, 'prev') : store.openCursor();
      const timer = setTimeout(() => {
        timedOut = true;
        try { tx.abort(); } catch (_) {}
      }, JOURNAL_VIEW_QUERY_DEADLINE_MS);
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const entry = cursor.value || {};
        const summary = journalEntryViewSummary(entry);
        if (!WebClipJournalTextFilter.matches(entry, sourceContext.textFilter)) { cursor.continue(); return; }
        const isCurrent = Boolean(sourceContext.sourceUrlKey && summary.urlKey === sourceContext.sourceUrlKey);
        const isSite = Boolean(sourceContext.sourceSiteKey && summary.siteKey === sourceContext.sourceSiteKey);
        addJournalModeCount(counts, 'all', summary.readingMode);
        if (isCurrent) addJournalModeCount(counts, 'current', summary.readingMode);
        if (isSite) addJournalModeCount(counts, 'site', summary.readingMode);
        if (includeDomains) collectBoundedDomainAggregate(domainState, summary, query, reading);
        cursor.continue();
      };
      request.onerror = () => { requestError = request.error || new Error('Не удалось прочитать metadata представления журнала.'); };
      tx.oncomplete = () => {
        clearTimeout(timer);
        resolve({ counts, domains: includeDomains ? finalizeDomainAggregate(domainState) : { totalEntries: 0, groups: [], truncated: false, childrenTruncated: false } });
      };
      tx.onerror = () => { clearTimeout(timer); reject(requestError || tx.error || new Error('Ошибка чтения metadata журнала.')); };
      tx.onabort = () => { clearTimeout(timer); reject(timedOut ? makeJournalViewDeadlineError('Чтение metadata журнала') : (requestError || tx.error || new Error('Чтение metadata журнала было прервано.'))); };
    });
  } finally { db.close(); }
}

async function readJournalViewMetaViaServiceWorker(request) {
  const result = await sendReadOnlyRuntimeMessage({ type: 'WEBCLIP_JOURNAL_VIEW_META', ...request, readingFilter: request.reading }, JOURNAL_VIEW_RUNTIME_DEADLINE_MS, 'Чтение metadata журнала через service worker');
  requireOk(result);
  return {
    counts: result.counts && typeof result.counts === 'object' ? result.counts : makeEmptyJournalModeCounts(),
    domains: result.domains && typeof result.domains === 'object' ? result.domains : { totalEntries: 0, groups: [], truncated: false, childrenTruncated: false }
  };
}

async function readJournalViewMetaWithFallback(request) {
  try {
    return await readJournalViewMetaDirect(request);
  } catch (directError) {
    console.warn('WebClip journal: direct metadata scan failed, fallback to service worker', directError);
    return readJournalViewMetaViaServiceWorker(request);
  }
}

function openJournalEntryCursor(store, _context) {
  // createdAt is present on legacy entries too. Mode/domain predicates are
  // evaluated from bounded summaries so pre-index records are not silently lost.
  return store.index('createdAt').openCursor(null, 'prev');
}

async function readJournalPageDirect({ viewMode = 'all', source = '', reading = 'all', domainFilter = null, textFilter = null, page = 1, pageSize = PAGE_SIZE } = {}) {
  const context = makeJournalViewContext({ viewMode, source, reading, domainFilter, textFilter });
  const safePage = Math.max(1, Math.floor(Number(page) || 1));
  const safePageSize = Math.max(1, Math.min(100, Math.floor(Number(pageSize) || PAGE_SIZE)));
  const offset = (safePage - 1) * safePageSize;
  if ((context.viewMode === 'current' && !context.sourceUrlKey) || (context.viewMode === 'site' && !context.sourceSiteKey)) return { total: 0, entries: [] };
  const db = await openJournalDbForView();
  try {
    return await new Promise((resolve, reject) => {
      let total = 0;
      const entries = [];
      let timedOut = false;
      let requestError = null;
      const tx = db.transaction(JOURNAL_STORE, 'readonly');
      const store = tx.objectStore(JOURNAL_STORE);
      let request;
      try { request = openJournalEntryCursor(store, context); } catch (error) { requestError = error; try { tx.abort(); } catch (_) {} return; }
      if (!request) {
        requestError = new Error('Не удалось открыть cursor страницы журнала.');
        try { tx.abort(); } catch (_) {}
        return;
      }
      const timer = setTimeout(() => { timedOut = true; try { tx.abort(); } catch (_) {} }, JOURNAL_VIEW_QUERY_DEADLINE_MS);
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const entry = cursor.value || {};
        const summary = journalEntryViewSummary(entry);
        if (journalSummaryMatchesView(summary, context, { entry })) {
          if (total >= offset && entries.length < safePageSize) entries.push(summary);
          total += 1;
        }
        cursor.continue();
      };
      request.onerror = () => { requestError = request.error || new Error('Не удалось прочитать страницу журнала.'); };
      tx.oncomplete = () => { clearTimeout(timer); resolve({ total, entries }); };
      tx.onerror = () => { clearTimeout(timer); reject(requestError || tx.error || new Error('Ошибка чтения страницы журнала.')); };
      tx.onabort = () => { clearTimeout(timer); reject(timedOut ? makeJournalViewDeadlineError('Чтение страницы журнала') : (requestError || tx.error || new Error('Чтение страницы журнала было прервано.'))); };
    });
  } finally { db.close(); }
}

async function readJournalPageViaServiceWorker(request) {
  const result = await sendReadOnlyRuntimeMessage({ type: 'WEBCLIP_JOURNAL_VIEW_PAGE', ...request }, JOURNAL_VIEW_RUNTIME_DEADLINE_MS, 'Чтение страницы журнала через service worker');
  requireOk(result);
  return {
    total: Math.max(0, Number(result.total || 0)),
    entries: Array.isArray(result.entries) ? result.entries.map(journalEntryViewSummary) : []
  };
}

async function readJournalPageWithFallback(request) {
  try { return await readJournalPageDirect(request); }
  catch (directError) {
    console.warn('WebClip journal: direct page query failed, fallback to service worker', directError);
    return readJournalPageViaServiceWorker(request);
  }
}

function compareJournalUrlGroups(a, b) {
  const timeDelta = Number(b?.latest || 0) - Number(a?.latest || 0);
  if (timeDelta) return timeDelta;
  const urlDelta = String(a?.url || '').localeCompare(String(b?.url || ''), 'ru');
  if (urlDelta) return urlDelta;
  return String(a?.key || '').localeCompare(String(b?.key || ''), 'ru');
}

function groupComesAfterBoundary(group, boundary) {
  return !boundary || compareJournalUrlGroups(group, boundary) > 0;
}

function insertBoundedJournalGroup(list, group, limit) {
  let low = 0;
  let high = list.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (compareJournalUrlGroups(group, list[mid]) < 0) high = mid;
    else low = mid + 1;
  }
  list.splice(low, 0, group);
  if (list.length > limit) list.pop();
}

async function readJournalUrlGroupsDirect({ viewMode = 'all', source = '', reading = 'all', domainFilter = null, textFilter = null, boundary = null, pageSize = PAGE_SIZE } = {}) {
  const context = makeJournalViewContext({ viewMode, source, reading, domainFilter, textFilter });
  const safePageSize = Math.max(1, Math.min(100, Math.floor(Number(pageSize) || PAGE_SIZE)));
  if ((context.viewMode === 'current' && !context.sourceUrlKey) || (context.viewMode === 'site' && !context.sourceSiteKey)) return { total: 0, groups: [] };
  const db = await openJournalDbForView();
  try {
    return await new Promise((resolve, reject) => {
      let total = 0;
      const pageGroups = [];
      let active = null;
      let timedOut = false;
      let requestError = null;
      const tx = db.transaction(JOURNAL_STORE, 'readonly');
      const store = tx.objectStore(JOURNAL_STORE);
      const request = store.index('urlKeyCreatedAt').openCursor(null, 'prev');
      const timer = setTimeout(() => { timedOut = true; try { tx.abort(); } catch (_) {} }, JOURNAL_VIEW_QUERY_DEADLINE_MS);
      const finalize = () => {
        if (!active || active.count <= 0) { active = null; return; }
        total += 1;
        if (groupComesAfterBoundary(active, boundary)) insertBoundedJournalGroup(pageGroups, active, safePageSize);
        active = null;
      };
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) { finalize(); return; }
        const entry = cursor.value || {};
        const summary = journalEntryViewSummary(entry);
        const logicalKey = summary.urlKey || `entry:${summary.id}`;
        if (!active || active.key !== logicalKey) {
          finalize();
          active = { key: logicalKey, urlKey: summary.urlKey, url: summary.url || '', latest: 0, count: 0 };
        }
        if (journalSummaryMatchesView(summary, context, { entry })) {
          active.count += 1;
          if (!active.latest) {
            active.latest = Number(summary.createdAt || 0);
            active.url = summary.url || active.url;
          }
        }
        cursor.continue();
      };
      request.onerror = () => { requestError = request.error || new Error('Не удалось прочитать URL-группы журнала.'); };
      tx.oncomplete = () => { clearTimeout(timer); resolve({ total, groups: pageGroups }); };
      tx.onerror = () => { clearTimeout(timer); reject(requestError || tx.error || new Error('Ошибка чтения URL-групп журнала.')); };
      tx.onabort = () => { clearTimeout(timer); reject(timedOut ? makeJournalViewDeadlineError('Чтение URL-групп журнала') : (requestError || tx.error || new Error('Чтение URL-групп журнала было прервано.'))); };
    });
  } finally { db.close(); }
}

async function readJournalUrlGroupsViaServiceWorker(request) {
  const result = await sendReadOnlyRuntimeMessage({ type: 'WEBCLIP_JOURNAL_VIEW_GROUPS', ...request }, JOURNAL_VIEW_RUNTIME_DEADLINE_MS, 'Чтение URL-групп журнала через service worker');
  requireOk(result);
  return { total: Math.max(0, Number(result.total || 0)), groups: Array.isArray(result.groups) ? result.groups : [] };
}

async function readJournalUrlGroupsWithFallback(request) {
  try { return await readJournalUrlGroupsDirect(request); }
  catch (directError) {
    console.warn('WebClip journal: direct URL-group query failed, fallback to service worker', directError);
    return readJournalUrlGroupsViaServiceWorker(request);
  }
}

async function readJournalUrlGroupEntriesDirect({ groupKey = '', urlKey = '', viewMode = 'all', source = '', reading = 'all', domainFilter = null, textFilter = null, offset = 0, limit = GROUP_ENTRY_PAGE_SIZE } = {}) {
  const context = makeJournalViewContext({ viewMode, source, reading, domainFilter, textFilter });
  const safeOffset = Math.max(0, Math.floor(Number(offset) || 0));
  const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(limit) || GROUP_ENTRY_PAGE_SIZE)));
  if (String(groupKey || '').startsWith('entry:')) {
    const id = String(groupKey).slice(6);
    const entries = await readJournalEntriesByIdsForView([id]);
    return { entries: entries.filter((entry) => journalSummaryMatchesView(journalEntryViewSummary(entry), context, { entry })).slice(safeOffset, safeOffset + safeLimit) };
  }
  const key = String(urlKey || '');
  if (!key) return { entries: [] };
  const db = await openJournalDbForView();
  try {
    return await new Promise((resolve, reject) => {
      const entries = [];
      let matched = 0;
      let timedOut = false;
      let requestError = null;
      const tx = db.transaction(JOURNAL_STORE, 'readonly');
      const store = tx.objectStore(JOURNAL_STORE);
      const request = store.index('urlKeyCreatedAt').openCursor(IDBKeyRange.bound([key, -Number.MAX_SAFE_INTEGER], [key, Number.MAX_SAFE_INTEGER]), 'prev');
      const timer = setTimeout(() => { timedOut = true; try { tx.abort(); } catch (_) {} }, JOURNAL_VIEW_QUERY_DEADLINE_MS);
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const entry = cursor.value || {};
        const summary = journalEntryViewSummary(entry);
        if (journalSummaryMatchesView(summary, context, { entry })) {
          if (matched >= safeOffset && entries.length < safeLimit) entries.push(entry);
          matched += 1;
          if (entries.length >= safeLimit) return;
        }
        cursor.continue();
      };
      request.onerror = () => { requestError = request.error || new Error('Не удалось прочитать записи URL-группы.'); };
      tx.oncomplete = () => { clearTimeout(timer); resolve({ entries }); };
      tx.onerror = () => { clearTimeout(timer); reject(requestError || tx.error || new Error('Ошибка чтения записей URL-группы.')); };
      tx.onabort = () => { clearTimeout(timer); reject(timedOut ? makeJournalViewDeadlineError('Чтение записей URL-группы') : (requestError || tx.error || new Error('Чтение URL-группы было прервано.'))); };
    });
  } finally { db.close(); }
}

async function readJournalUrlGroupEntriesViaServiceWorker(request) {
  const result = await sendReadOnlyRuntimeMessage({ type: 'WEBCLIP_JOURNAL_VIEW_GROUP_ENTRIES', ...request }, JOURNAL_VIEW_RUNTIME_DEADLINE_MS, 'Чтение записей URL-группы через service worker');
  requireOk(result);
  return { entries: Array.isArray(result.entries) ? result.entries : [] };
}

async function readJournalUrlGroupEntriesWithFallback(request) {
  try { return await readJournalUrlGroupEntriesDirect(request); }
  catch (directError) {
    console.warn('WebClip journal: direct URL-group child query failed, fallback to service worker', directError);
    return readJournalUrlGroupEntriesViaServiceWorker(request);
  }
}

async function loadJournal({ preserveScroll = true, clearStatus = false, refreshBackup = true } = {}) {
  const generation = ++journalLoadGeneration;
  const requestedMode = mode;
  const requestedSourceUrl = sourceUrl;
  const requestedReadingFilter = readingFilter;
  const requestedDomainSearch = domainSearchQuery;
  const requestedTextFilter = currentJournalTextFilter();
  const scrollLeft = preserveScroll ? window.scrollX : 0;
  const scrollTop = preserveScroll ? window.scrollY : 0;
  if (clearStatus) setStatus('', '');
  updateModeButtons();
  try {
    if (refreshBackup) {
      void refreshBackupInfo();
      void refreshDestructiveRecovery();
    }
    const meta = await readJournalViewMetaWithFallback({
      source: requestedSourceUrl,
      reading: requestedReadingFilter,
      domainSearch: requestedDomainSearch,
      textFilter: requestedTextFilter,
      includeDomains: requestedMode === 'all'
    });
    if (generation !== journalLoadGeneration) return;
    journalModeCounts = meta.counts || makeEmptyJournalModeCounts();
    journalDomainModel = meta.domains || { totalEntries: 0, groups: [], truncated: false, childrenTruncated: false };
    if (requestedMode !== 'all') selectedDomainFilter = { level: 'all', value: '' };
    updateReadingFilterButtons();
    updateJournalModeCounts();
    renderDomainFilter();
    urlGroupPageBoundaries = new Map([[1, null]]);
    if (groupByUrl && currentPage > 1) currentPage = 1;
    await renderCurrentEntries();
    if (generation !== journalLoadGeneration) return;
    await syncJournalRevisionBaseline();
    if (generation !== journalLoadGeneration) return;
    if (preserveScroll) window.scrollTo({ left: scrollLeft, top: scrollTop, behavior: 'auto' });
  } catch (error) {
    if (generation !== journalLoadGeneration) return;
    setStatus(error?.message || String(error), 'error');
  }
}


function refreshBackupInfo() {
  if (backupInfoRefreshInFlight) return backupInfoRefreshInFlight;
  const run = (async () => {
    try {
      const status = await sendReadOnlyRuntimeMessage({ type: 'WEBCLIP_JOURNAL_BACKUP_STATUS' }, 20000, 'Получение состояния резервной копии');
      requireOk(status);
      const lines = [
        `Папка резервных копий: ${status.folderPath || 'корневая папка Яндекс Диска не выбрана'}`,
        `Последняя созданная копия: ${status.lastRemotePath || 'ещё не было'}`,
        `Автовыгрузка: ${status.enabled ? `включена, каждые ${status.intervalMinutes} мин.; повтор после ошибки ${status.retryMinutes} мин.` : 'выключена'}`,
        `Последняя успешная фоновая: ${formatDate(status.lastBackgroundSuccessAt) || 'ещё не было'}`,
        `Последняя неудачная фоновая: ${formatDate(status.lastBackgroundFailureAt) || 'не было'}`
      ];
      if (status.lastBackgroundError) lines.push(`Последняя ошибка: ${status.lastBackgroundError}`);
      backupInfoEl.textContent = lines.join('\n');
      backupInfoEl.classList.toggle('problem', Boolean(status.hasCurrentProblem));
    } catch (error) {
      backupInfoEl.textContent = `Не удалось получить состояние резервной копии: ${error?.message || String(error)}`;
      backupInfoEl.classList.add('problem');
    }
  })();
  const tracked = run.finally(() => {
    if (backupInfoRefreshInFlight === tracked) backupInfoRefreshInFlight = null;
  });
  backupInfoRefreshInFlight = tracked;
  return tracked;
}


function manualDestructiveReceiptKindLabel(kind) {
  if (kind === 'read-move') return 'ReadLater → Upload';
  if (kind === 'trash-move') return 'Удаление → Trash';
  if (kind === 'publication-revoke') return 'Отзыв публичного доступа';
  if (kind === 'publication-revoke-trash') return 'Отзыв доступа → Trash';
  return 'Неизвестная destructive-операция';
}

function appendDestructiveRecoveryMeta(container, label, value, { code = false } = {}) {
  const text = String(value || '').trim();
  if (!text) return;
  const row = document.createElement('div');
  const strong = document.createElement('strong');
  strong.textContent = `${label}: `;
  row.append(strong);
  const node = code ? document.createElement('code') : document.createElement('span');
  node.textContent = text;
  row.append(node);
  container.append(row);
}

function renderDestructiveRecovery(result) {
  const receipts = Array.isArray(result?.receipts) ? result.receipts : [];
  const totalManual = Math.max(receipts.length, Math.max(0, Number(result?.totalManual) || 0));
  const wasHidden = destructiveRecoveryPanel.classList.contains('hidden');
  manualDestructiveReceipts = new Map(receipts.map((item) => [String(item?.id || ''), item]).filter(([id]) => id));
  destructiveRecoveryCount.textContent = String(totalManual);
  destructiveRecoveryPanel.classList.toggle('hidden', totalManual <= 0);
  destructiveRecoveryList.replaceChildren();
  if (totalManual <= 0) return;
  if (wasHidden) destructiveRecoveryPanel.open = true;

  const fragment = document.createDocumentFragment();
  for (const receipt of receipts) {
    const card = document.createElement('article');
    card.className = 'destructive-recovery-card';

    const title = document.createElement('div');
    title.className = 'destructive-recovery-card-title';
    title.textContent = manualDestructiveReceiptKindLabel(receipt.kind);
    card.append(title);

    const meta = document.createElement('div');
    meta.className = 'destructive-recovery-card-meta';
    appendDestructiveRecoveryMeta(meta, 'operationId', receipt.operationId, { code: true });
    appendDestructiveRecoveryMeta(meta, 'Источник', receipt.sourcePath, { code: true });
    appendDestructiveRecoveryMeta(meta, 'Ожидаемая цель', receipt.targetPath, { code: true });
    appendDestructiveRecoveryMeta(meta, 'Подтверждённый путь', receipt.verifiedPath, { code: true });
    appendDestructiveRecoveryMeta(meta, 'source resourceId', receipt.sourceResourceId, { code: true });
    appendDestructiveRecoveryMeta(meta, 'verified resourceId', receipt.verifiedResourceId, { code: true });
    appendDestructiveRecoveryMeta(meta, 'Корень', receipt.rootPath, { code: true });
    appendDestructiveRecoveryMeta(meta, 'Сайт', receipt.sourceSiteKey);
    appendDestructiveRecoveryMeta(meta, 'Ручная проверка требуется с', formatDate(receipt.manualResolutionAt || receipt.updatedAt));
    appendDestructiveRecoveryMeta(meta, 'Последнее изменение receipt', formatDate(receipt.updatedAt));
    if (receipt.supersededByJournalReset) {
      appendDestructiveRecoveryMeta(meta, 'Журнал', 'исходное состояние уже superseded очисткой/импортом');
    }
    card.append(meta);

    if (receipt.lastError) {
      const error = document.createElement('div');
      error.className = 'destructive-recovery-card-error';
      error.textContent = receipt.lastError;
      card.append(error);
    }

    const actions = document.createElement('div');
    actions.className = 'destructive-recovery-card-actions';
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'destructive-recovery-dismiss';
    dismiss.dataset.manualReceiptId = String(receipt.id || '');
    dismiss.textContent = 'Списать receipt после ручной проверки';
    actions.append(dismiss);
    card.append(actions);
    fragment.append(card);
  }

  if (result?.truncated) {
    const note = document.createElement('div');
    note.className = 'destructive-recovery-card-error';
    note.textContent = `Показаны первые ${receipts.length} из ${totalManual} manual receipts. После списания обновите список.`;
    fragment.append(note);
  }
  destructiveRecoveryList.append(fragment);
}

function refreshDestructiveRecovery() {
  if (destructiveRecoveryRefreshInFlight) return destructiveRecoveryRefreshInFlight;
  const run = (async () => {
    refreshDestructiveRecoveryButton.disabled = true;
    try {
      const result = await sendReadOnlyRuntimeMessage(
        { type: 'WEBCLIP_JOURNAL_DESTRUCTIVE_MANUAL_LIST', limit: 50 },
        20_000,
        'Чтение destructive receipts для ручной проверки'
      );
      requireOk(result);
      renderDestructiveRecovery(result);
    } catch (error) {
      manualDestructiveReceipts = new Map();
      destructiveRecoveryPanel.classList.remove('hidden');
      destructiveRecoveryPanel.open = true;
      destructiveRecoveryCount.textContent = '?';
      destructiveRecoveryList.textContent = `Не удалось прочитать manual-resolution receipts: ${error?.message || String(error)}`;
    } finally {
      refreshDestructiveRecoveryButton.disabled = false;
    }
  })();
  const tracked = run.finally(() => {
    if (destructiveRecoveryRefreshInFlight === tracked) destructiveRecoveryRefreshInFlight = null;
  });
  destructiveRecoveryRefreshInFlight = tracked;
  return tracked;
}

async function dismissManualDestructiveReceipt(receipt, button) {
  const id = String(receipt?.id || '');
  const updatedAt = Number(receipt?.updatedAt || 0);
  if (!id || !Number.isSafeInteger(updatedAt) || updatedAt <= 0) {
    setStatus('Recovery receipt устарел или повреждён. Обновите список.', 'error');
    return;
  }
  const pathHint = receipt.targetPath || receipt.verifiedPath || receipt.sourcePath || 'путь не записан';
  const resourceHint = receipt.verifiedResourceId || receipt.sourceResourceId || 'resourceId не записан';
  const confirmed = await requestDangerousConfirmation({
    title: 'Списать destructive recovery receipt',
    text: `Сначала вручную проверьте Яндекс Диск и убедитесь в фактическом состоянии файла. Ориентир: ${pathHint}; resourceId: ${resourceHint}. После подтверждения WebClip удалит ТОЛЬКО recovery receipt. WebClip не будет обращаться к Яндекс Диску, перемещать/удалять файл или менять запись Журнала. Если есть сомнения — нажмите «Отмена» и оставьте receipt.`
  });
  if (!confirmed) return;

  button.disabled = true;
  try {
    const result = await readJournalExtensionApiBounded(
      () => chrome.runtime.sendMessage({
        type: 'WEBCLIP_JOURNAL_DESTRUCTIVE_MANUAL_DISMISS',
        id,
        updatedAt
      }),
      'Списание destructive recovery receipt',
      20_000
    );
    requireOk(result);
    setStatus('Recovery receipt списан после ручной проверки. WebClip не изменял Яндекс Диск и Журнал.', 'ok');
    await refreshDestructiveRecovery();
  } catch (error) {
    setStatus(error?.message || String(error), 'error');
    await refreshDestructiveRecovery().catch(() => {});
  } finally {
    button.disabled = false;
  }
}

function updateJournalModeCounts() {
  currentButton.textContent = `Текущего URL (${selectedReadingCount(journalModeCounts.current)})`;
  siteButton.textContent = `Текущего сайта (${selectedReadingCount(journalModeCounts.site)})`;
  allButton.textContent = `Полный (${selectedReadingCount(journalModeCounts.all)})`;
}

function renderDomainFilter() {
  const visible = mode === 'all';
  domainFilterPanel.classList.toggle('hidden', !visible);
  domainFilterTree.replaceChildren();
  if (!visible) return;
  const fragment = document.createDocumentFragment();

  const model = journalDomainModel && typeof journalDomainModel === 'object'
    ? journalDomainModel
    : { totalEntries: 0, groups: [], truncated: false, childrenTruncated: false };
  const allRow = document.createElement('div');
  allRow.className = 'domain-filter-row domain-filter-all';
  allRow.appendChild(makeDomainFilterButton('Все позиции', Number(model.totalEntries || 0), 'all', ''));
  fragment.appendChild(allRow);

  const groups = Array.isArray(model.groups) ? model.groups : [];
  const visibleDomainBases = new Set(groups.map((group) => String(group?.base || '')).filter(Boolean));
  for (const base of [...expandedDomainBases]) {
    if (!visibleDomainBases.has(base)) expandedDomainBases.delete(base);
  }
  for (const group of groups) {
    const base = String(group?.base || '');
    if (!base) continue;
    const children = Array.isArray(group.children) ? group.children : [];
    const node = document.createElement('div');
    node.className = 'domain-node';
    const header = document.createElement('div');
    header.className = 'domain-filter-row level-2';
    const canExpand = children.length > 0;
    const forcedOpen = Boolean(domainSearchQuery);
    const isOpen = canExpand && (forcedOpen || expandedDomainBases.has(base));
    const expand = document.createElement('button');
    expand.type = 'button';
    expand.className = 'domain-expand-button';
    expand.textContent = canExpand ? (isOpen ? '▾' : '▸') : '•';
    expand.disabled = !canExpand;
    expand.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (canExpand) expand.addEventListener('click', () => {
      if (expandedDomainBases.has(base)) expandedDomainBases.delete(base); else expandedDomainBases.add(base);
      renderDomainFilter();
    });
    header.append(expand, makeDomainFilterButton(base, Number(group.count || 0), 'base', base));
    node.appendChild(header);

    if (isOpen) {
      const childrenWrap = document.createElement('div');
      childrenWrap.className = 'domain-children';
      for (const childInfo of children) {
        const third = String(childInfo?.third || '');
        if (!third) continue;
        const child = document.createElement('div');
        child.className = 'domain-filter-row level-3';
        child.appendChild(makeDomainFilterButton(third, Number(childInfo.count || 0), 'third', third));
        childrenWrap.appendChild(child);
      }
      node.appendChild(childrenWrap);
    }
    fragment.appendChild(node);
  }

  if (!groups.length && domainSearchQuery) {
    const empty = document.createElement('div');
    empty.className = 'domain-search-empty';
    empty.textContent = 'Домены по этому запросу не найдены.';
    fragment.appendChild(empty);
  } else if (model.truncated || model.childrenTruncated) {
    const note = document.createElement('div');
    note.className = 'domain-search-empty';
    note.textContent = domainSearchQuery
      ? 'Показаны наиболее свежие совпадения в пределах memory budget. Уточните поиск, чтобы увидеть другие домены.'
      : 'Список доменов ограничен memory budget. Используйте поиск доменов для доступа к более старым позициям.';
    fragment.appendChild(note);
  }
  domainFilterTree.appendChild(fragment);
}

function makeDomainFilterButton(label, count, level, value) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'domain-filter-button';
  const active = selectedDomainFilter.level === level && selectedDomainFilter.value === value;
  button.classList.toggle('active', active);
  button.setAttribute('aria-pressed', active ? 'true' : 'false');
  button.textContent = label;
  const counter = document.createElement('span');
  counter.className = 'domain-filter-count';
  counter.textContent = ` (${count})`;
  button.appendChild(counter);
  button.addEventListener('click', () => {
    selectedDomainFilter = { level, value };
    currentPage = 1;
    urlGroupPageBoundaries = new Map([[1, null]]);
    renderDomainFilter();
    void renderCurrentEntries();
  });
  return button;
}

function updatePagination(totalItems, unitLabel = 'записей') {
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = totalItems ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const end = Math.min(totalItems, currentPage * PAGE_SIZE);
  paginationEl.classList.toggle('hidden', totalItems <= PAGE_SIZE);
  pagePrevButton.disabled = currentPage <= 1;
  pageNextButton.disabled = currentPage >= totalPages;
  pageInfoEl.textContent = totalItems
    ? `${unitLabel === 'групп' ? 'Группы' : 'Записи'} ${start}–${end} из ${totalItems} · Страница ${currentPage} из ${totalPages}`
    : `Страница 1 из 1`;
  return { startIndex: (currentPage - 1) * PAGE_SIZE, endIndex: Math.min(totalItems, currentPage * PAGE_SIZE), totalPages };
}

async function renderCurrentEntries() {
  const generation = ++renderGeneration;
  try {
    if (groupByUrl) {
      if (currentPage > 1 && !urlGroupPageBoundaries.has(currentPage)) {
        currentPage = 1;
        urlGroupPageBoundaries = new Map([[1, null]]);
      }
      const boundary = urlGroupPageBoundaries.get(currentPage) || null;
      const result = await readJournalUrlGroupsWithFallback({
        viewMode: mode,
        source: sourceUrl,
        reading: readingFilter,
        domainFilter: selectedDomainFilter,
        textFilter: currentJournalTextFilter(),
        boundary,
        pageSize: PAGE_SIZE
      });
      if (generation !== renderGeneration) return;
      const total = Math.max(0, Number(result.total || 0));
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      if (currentPage > totalPages) {
        currentPage = totalPages;
        urlGroupPageBoundaries = new Map([[1, null]]);
        return renderCurrentEntries();
      }
      updatePagination(total, 'групп');
      const groups = Array.isArray(result.groups) ? result.groups : [];
      for (const key of [...urlGroupPageBoundaries.keys()]) {
        if (key > currentPage + 1) urlGroupPageBoundaries.delete(key);
      }
      if (groups.length && currentPage < totalPages) {
        const last = groups[groups.length - 1];
        urlGroupPageBoundaries.set(currentPage + 1, {
          key: String(last.key || ''), url: String(last.url || ''), latest: Number(last.latest || 0)
        });
      }
      renderUrlGroups(groups, generation);
      return;
    }

    const result = await readJournalPageWithFallback({
      viewMode: mode,
      source: sourceUrl,
      reading: readingFilter,
      domainFilter: selectedDomainFilter,
      textFilter: currentJournalTextFilter(),
      page: currentPage,
      pageSize: PAGE_SIZE
    });
    if (generation !== renderGeneration) return;
    const total = Math.max(0, Number(result.total || 0));
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > totalPages) {
      currentPage = totalPages;
      return renderCurrentEntries();
    }
    updatePagination(total, 'записей');
    const summaries = Array.isArray(result.entries) ? result.entries : [];
    entriesEl.replaceChildren();
    if (!summaries.length) return renderEmptyState();
    const fullEntries = await readJournalEntriesByIdsForView(summaries.map((entry) => entry.id));
    if (generation !== renderGeneration) return;
    renderEntries(fullEntries);
  } catch (error) {
    if (generation !== renderGeneration) return;
    entriesEl.replaceChildren();
    renderEmptyState();
    setStatus(error?.message || String(error), 'error');
  }
}

function renderUrlGroups(groups, generation = renderGeneration) {
  entriesEl.replaceChildren();
  const visibleGroupKeys = new Set((Array.isArray(groups) ? groups : []).map((group) => String(group?.key || '')).filter(Boolean));
  for (const key of [...expandedUrlGroups]) {
    if (!visibleGroupKeys.has(key)) expandedUrlGroups.delete(key);
  }
  if (!groups.length) return renderEmptyState();
  for (const group of groups) {
    const details = document.createElement('details');
    details.className = 'url-group';
    details.open = expandedUrlGroups.has(group.key);
    const summary = document.createElement('summary');
    const url = document.createElement('div');
    url.className = 'url-group-url';
    url.textContent = group.url || '(URL отсутствует)';
    const meta = document.createElement('div');
    meta.className = 'url-group-meta';
    meta.textContent = `${Number(group.count || 0)} запис. · последняя ${formatDate(group.latest)}`;
    summary.append(url, meta);
    const body = document.createElement('div');
    body.className = 'url-group-body';
    details.append(summary, body);

    let loadedCount = 0;
    let loading = false;
    const loadNext = async () => {
      if (loading || generation !== renderGeneration || loadedCount >= Number(group.count || 0)) return;
      loading = true;
      try {
        const result = await readJournalUrlGroupEntriesWithFallback({
          groupKey: String(group.key || ''),
          urlKey: String(group.urlKey || ''),
          viewMode: mode,
          source: sourceUrl,
          reading: readingFilter,
          domainFilter: selectedDomainFilter,
          textFilter: currentJournalTextFilter(),
          offset: loadedCount,
          limit: GROUP_ENTRY_PAGE_SIZE
        });
        if (generation !== renderGeneration) return;
        const fullEntries = Array.isArray(result.entries) ? result.entries : [];
        const moreButton = body.querySelector('.url-group-more');
        if (moreButton) moreButton.remove();
        for (const entry of fullEntries) body.appendChild(buildEntryCard(entry));
        loadedCount += fullEntries.length;
        if (!fullEntries.length) loadedCount = Number(group.count || 0);
        if (loadedCount < Number(group.count || 0)) {
          const remaining = Number(group.count || 0) - loadedCount;
          const more = makeButton(`Показать ещё (${Math.min(GROUP_ENTRY_PAGE_SIZE, remaining)})`, false, loadNext, 'url-group-more');
          body.appendChild(more);
        }
      } catch (error) {
        if (generation === renderGeneration) {
          const problem = document.createElement('div');
          problem.className = 'empty';
          problem.textContent = `Не удалось загрузить записи группы: ${error?.message || String(error)}`;
          body.appendChild(problem);
        }
      } finally {
        loading = false;
      }
    };

    details.addEventListener('toggle', () => {
      if (details.open) {
        expandedUrlGroups.add(group.key);
        if (!loadedCount) void loadNext();
      } else {
        expandedUrlGroups.delete(group.key);
      }
    });
    entriesEl.appendChild(details);
    if (details.open) void loadNext();
  }
}


function renderEntries(entries) {
  entriesEl.replaceChildren();
  if (!entries.length) return renderEmptyState();
  for (const entry of entries) entriesEl.appendChild(buildEntryCard(entry));
}

function renderEmptyState() {
  const empty = document.createElement('div');
  empty.className = 'empty';
  empty.textContent = mode === 'current'
    ? 'Для текущего URL и выбранного режима пока нет записей.'
    : mode === 'site'
      ? 'Для текущего сайта и выбранного режима пока нет записей.'
      : 'Для выбранных фильтров журнал пуст.';
  entriesEl.appendChild(empty);
}

function activateDomainFilter(level, value, base = '') {
  if (mode !== 'all' || !value) return;
  selectedDomainFilter = { level, value };
  currentPage = 1;
  domainFilterPanel.open = true;
  if (base) expandedDomainBases.add(base);
  urlGroupPageBoundaries = new Map([[1, null]]);
  renderDomainFilter();
  void renderCurrentEntries();
  domainFilterPanel.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

function buildSiteDomainAccent(entry) {
  if (mode !== 'all') return null;
  const info = entryDomainHierarchy(entry);
  if (!info.base) return null;
  const wrap = document.createElement('div');
  wrap.className = 'site-domain-accent';
  const siteLabel = document.createElement('span');
  siteLabel.className = 'site-domain-label';
  siteLabel.textContent = 'Сайт';
  const site = document.createElement('button');
  site.type = 'button';
  site.className = 'site-domain-button';
  site.textContent = info.third || info.host || info.base;
  site.title = `Фильтровать общий журнал по ${site.textContent}`;
  site.addEventListener('click', () => activateDomainFilter(info.third && info.third !== info.base ? 'third' : 'base', info.third || info.base, info.base));
  wrap.append(siteLabel, site);
  if (info.third && info.third !== info.base) {
    const domainLabel = document.createElement('span');
    domainLabel.className = 'site-domain-label';
    domainLabel.textContent = 'Домен';
    const domain = document.createElement('button');
    domain.type = 'button';
    domain.className = 'site-domain-button';
    domain.textContent = info.base;
    domain.title = `Фильтровать общий журнал по ${info.base}`;
    domain.addEventListener('click', () => activateDomainFilter('base', info.base, info.base));
    wrap.append(domainLabel, domain);
  }
  return wrap;
}

function normalizeEntryJournalComments(entry = {}) {
  const comments = [];
  const raw = Array.isArray(entry.journalComments) ? entry.journalComments : [];
  for (let index = 0; index < raw.length; index += 1) {
    const item = raw[index];
    if (!item || typeof item !== 'object') continue;
    const text = String(item.text ?? item.comment ?? '');
    if (!text.trim()) continue;
    const createdAt = Number(item.createdAt || entry.createdAt || Date.now());
    comments.push({
      id: String(item.id || `comment-${entry.id || 'entry'}-${createdAt}-${index}`),
      text,
      createdAt,
      updatedAt: Number(item.updatedAt || createdAt),
      deletedAt: Math.max(0, Number(item.deletedAt || 0))
    });
  }
  if (!comments.length) {
    const legacy = String(entry.journalComment || '');
    if (legacy.trim()) {
      const createdAt = Number(entry.journalCommentUpdatedAt || entry.createdAt || Date.now());
      comments.push({
        id: `legacy-${entry.id || 'entry'}`,
        text: legacy,
        createdAt,
        updatedAt: Number(entry.journalCommentUpdatedAt || createdAt),
        deletedAt: 0
      });
    }
  }
  comments.sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
  return comments;
}

function buildJournalComments(entry) {
  const root = document.createElement('section');
  root.className = 'journal-comments';
  let editorMode = '';
  let editingCommentId = '';

  const render = () => {
    const comments = normalizeEntryJournalComments(entry);
    entry.journalComments = comments;
    root.replaceChildren();

    if (comments.length) {
      const title = document.createElement('strong');
      title.className = 'journal-comments-title';
      title.textContent = 'Комментарии записи журнала';
      root.appendChild(title);

      const list = document.createElement('div');
      list.className = 'journal-comments-list';
      for (const comment of comments) {
        const isDeleted = Number(comment.deletedAt || 0) > 0;
        if (isDeleted) {
          const item = document.createElement('details');
          item.className = 'journal-comment-item journal-comment-item-deleted';
          const summary = document.createElement('summary');
          summary.className = 'journal-comment-deleted-summary';
          const summaryDate = document.createElement('span');
          const created = formatDate(comment.createdAt);
          summaryDate.textContent = `${created} · удалён ${formatDate(comment.deletedAt)}`;
          const badge = document.createElement('span');
          badge.className = 'journal-comment-deleted-badge';
          badge.textContent = 'Удалён';
          summary.append(summaryDate, badge);
          const text = document.createElement('div');
          text.className = 'journal-comment-text journal-comment-deleted-text';
          text.textContent = comment.text;
          item.append(summary, text);
          list.appendChild(item);
          continue;
        }

        const item = document.createElement('article');
        item.className = 'journal-comment-item';
        const head = document.createElement('div');
        head.className = 'journal-comment-item-head';
        const date = document.createElement('span');
        const created = formatDate(comment.createdAt);
        const updated = Number(comment.updatedAt || 0);
        date.textContent = updated > Number(comment.createdAt || 0) + 1000
          ? `${created} · изменён ${formatDate(updated)}`
          : created;
        const controls = document.createElement('div');
        controls.className = 'journal-comment-item-actions';
        const edit = makeButton('Редактировать', false, () => {
          editorMode = 'edit';
          editingCommentId = comment.id;
          render();
        });
        edit.classList.add('journal-comment-edit-button');
        const remove = makeButton('Удалить', false, async () => {
          if (!window.confirm('Пометить этот комментарий как удалённый? После этого его нельзя будет редактировать или восстановить.')) return;
          edit.disabled = true;
          remove.disabled = true;
          try {
            const result = await chrome.runtime.sendMessage({
              type: 'WEBCLIP_JOURNAL_DELETE_COMMENT',
              id: entry.id,
              commentId: comment.id
            });
            requireOk(result);
            entry.journalComments = normalizeEntryJournalComments(result.entry || entry);
            entry.journalComment = String(result.entry?.journalComment || '');
            if (editingCommentId === comment.id) {
              editorMode = '';
              editingCommentId = '';
            }
            setStatus('Комментарий помечен как удалённый.', 'ok');
            render();
          } catch (error) {
            setStatus(error?.message || String(error), 'error');
            edit.disabled = false;
            remove.disabled = false;
          }
        });
        remove.classList.add('journal-comment-delete-button', 'danger');
        controls.append(edit, remove);
        head.append(date, controls);
        const text = document.createElement('div');
        text.className = 'journal-comment-text';
        text.textContent = comment.text;
        item.append(head, text);
        list.appendChild(item);
      }
      root.appendChild(list);
    }

    if (!editorMode) {
      const add = makeButton('Добавить комментарий к записи журнала', false, () => {
        editorMode = 'add';
        editingCommentId = '';
        render();
      });
      add.classList.add('journal-comment-add-button');
      root.appendChild(add);
      return;
    }

    const editing = editorMode === 'edit'
      ? comments.find((comment) => comment.id === editingCommentId && Number(comment.deletedAt || 0) <= 0) || null
      : null;
    if (editorMode === 'edit' && !editing) {
      editorMode = '';
      editingCommentId = '';
      render();
      return;
    }

    const editor = document.createElement('div');
    editor.className = 'journal-comment-box';
    const label = document.createElement('label');
    const caption = document.createElement('span');
    caption.textContent = editing ? 'Редактирование комментария записи журнала' : 'Новый комментарий записи журнала';
    const input = document.createElement('textarea');
    input.value = editing ? editing.text : '';
    input.placeholder = 'Добавьте свой комментарий к записи';
    label.append(caption, input);

    const actions = document.createElement('div');
    actions.className = 'journal-comment-actions';
    const cancel = makeButton('Отмена', false, () => {
      editorMode = '';
      editingCommentId = '';
      render();
    });
    const save = makeButton('Сохранить комментарий', false, async () => {
      if (!input.value.trim()) {
        setStatus('Введите текст комментария.', 'error');
        input.focus();
        return;
      }
      save.disabled = true;
      cancel.disabled = true;
      try {
        const message = editing
          ? { type: 'WEBCLIP_JOURNAL_EDIT_COMMENT', id: entry.id, commentId: editing.id, comment: input.value }
          : { type: 'WEBCLIP_JOURNAL_ADD_COMMENT', id: entry.id, comment: input.value };
        const result = await chrome.runtime.sendMessage(message);
        requireOk(result);
        entry.journalComments = normalizeEntryJournalComments(result.entry || entry);
        entry.journalComment = String(result.entry?.journalComment || entry.journalComment || '');
        editorMode = '';
        editingCommentId = '';
        setStatus(editing ? 'Комментарий обновлён.' : 'Комментарий добавлен.', 'ok');
        render();
      } catch (error) {
        setStatus(error?.message || String(error), 'error');
        save.disabled = false;
        cancel.disabled = false;
      }
    });
    actions.append(cancel, save);
    editor.append(label, actions);
    root.appendChild(editor);
    queueMicrotask(() => input.focus());
  };

  render();
  return root;
}

function buildLinkedOperationLog(entry) {
  const operationId = String(entry?.operationId || '').trim();
  const root = document.createElement('section');
  root.className = 'entry-operation-log';
  const label = document.createElement('div');
  label.className = 'entry-operation-log-label';
  const status = document.createElement('div');
  status.className = 'entry-operation-log-status';
  const pre = document.createElement('pre');
  pre.className = 'entry-operation-log-json hidden';
  root.append(label, status, pre);

  let cachedLog = null;
  let cachedJson = '';
  let loading = null;

  const exactOperationId = /^[A-Za-z0-9._:-]{1,160}$/.test(operationId) ? operationId : '';
  label.textContent = exactOperationId ? `OperationLog: ${exactOperationId}` : 'OperationLog: для этой записи лог не связан.';
  status.textContent = exactOperationId
    ? 'Связь по точному operationId. Лог загружается только по запросу.'
    : 'Старая или импортированная запись без operationId: WebClip не подбирает лог по имени файла или времени.';

  const load = async () => {
    if (cachedLog) return cachedLog;
    if (!exactOperationId) throw new Error('Для этой записи журнала OperationLog не связан.');
    if (!loading) {
      status.textContent = 'Загружаем связанный OperationLog…';
      loading = sendReadOnlyRuntimeMessage(
        { type: 'WEBCLIP_OPERATION_LOG_GET', operationId: exactOperationId },
        30_000,
        'Чтение связанного OperationLog'
      ).then((response) => {
        requireOk(response);
        const log = response?.log || null;
        if (!log || String(log.operationId || '') !== exactOperationId) {
          throw new Error('Связанный OperationLog не найден. Возможно, истёк срок хранения диагностических логов.');
        }
        cachedLog = log;
        status.textContent = `${log.title || 'OperationLog'} · ${log.status || 'unknown'} · событий: ${Number(log.eventCount || log.events?.length || 0)}`;
        cachedJson = '';
        return log;
      }).finally(() => { loading = null; });
    }
    return loading;
  };

  const showButton = makeButton('Показать лог', false, async () => {
    if (!exactOperationId) return;
    if (!pre.classList.contains('hidden')) {
      pre.classList.add('hidden');
      showButton.textContent = 'Показать лог';
      return;
    }
    showButton.disabled = true;
    try {
      const log = await load();
      if (!cachedJson) cachedJson = JSON.stringify(log, null, 2);
      pre.textContent = cachedJson;
      pre.classList.remove('hidden');
      showButton.textContent = 'Скрыть лог';
    } catch (error) {
      status.textContent = error?.message || String(error);
      setStatus(status.textContent, 'error');
    } finally {
      showButton.disabled = false;
    }
  }, 'entry-log-show');

  const copyButton = makeButton('Копировать лог', false, async () => {
    if (!exactOperationId) return;
    copyButton.disabled = true;
    try {
      const log = await load();
      if (!cachedJson) cachedJson = JSON.stringify(log, null, 2);
      await navigator.clipboard.writeText(cachedJson);
      setStatus(`OperationLog ${exactOperationId} скопирован.`, 'ok');
    } catch (error) {
      status.textContent = error?.message || String(error);
      setStatus(status.textContent, 'error');
    } finally {
      copyButton.disabled = false;
    }
  }, 'entry-log-copy');

  if (!exactOperationId) {
    showButton.disabled = true;
    copyButton.disabled = true;
    showButton.title = copyButton.title = 'Для этой записи operationId не сохранён.';
  }
  return { root, showButton, copyButton };
}

function buildEntryCard(entry) {
  const card = document.createElement('article');
  card.className = 'entry';

  const head = document.createElement('div');
  head.className = 'entry-head';
  const titleWrap = document.createElement('div');
  titleWrap.className = 'entry-title';
  const title = document.createElement('h2');
  title.textContent = entry.title || 'Без названия';
  title.title = entry.title || '';
  const when = document.createElement('div');
  when.className = 'when';
  when.textContent = formatDate(entry.createdAt) || entry.operationDateTime || '';
  const titleMeta = document.createElement('div');
  titleMeta.className = 'entry-title-meta';
  titleWrap.append(title, titleMeta);
  const badges = document.createElement('div');
  badges.className = 'entry-badges';
  const isYandexDestination = entry.destination === 'yandex';
  const canOpenYandexFile = isYandexDestination && isOpenableYandexPublicUrl(entry.publicUrl);
  const destinationBadge = document.createElement(isYandexDestination ? 'button' : 'span');
  destinationBadge.className = `badge ${isYandexDestination ? 'yandex badge-action' : 'download'}`;
  destinationBadge.textContent = isYandexDestination ? 'Яндекс Диск' : 'Скачан локально';
  if (isYandexDestination) {
    destinationBadge.type = 'button';
    destinationBadge.disabled = !canOpenYandexFile;
    destinationBadge.title = canOpenYandexFile
      ? 'Открыть сохранённый файл на Яндекс Диске'
      : 'Ссылка на сохранённый файл Яндекс Диска недоступна.';
    destinationBadge.setAttribute('aria-label', destinationBadge.title);
    if (canOpenYandexFile) {
      destinationBadge.addEventListener('click', async () => {
        try {
          const result = await chrome.runtime.sendMessage({ type: 'WEBCLIP_OPEN_JOURNAL_SAVED_FILE', id: entry.id });
          requireOk(result);
        } catch (error) {
          setStatus(error?.message || String(error), 'error');
        }
      });
    }
  }
  const readingBadge = document.createElement('span');
  const later = entry.destination === 'yandex' && entry.readingMode === 'later';
  readingBadge.className = `badge ${later ? 'read-later' : 'read'}`;
  readingBadge.textContent = later ? 'Прочитать позже' : 'Прочитано';
  badges.append(destinationBadge, readingBadge);
  titleMeta.append(when, badges);
  head.appendChild(titleWrap);

  const accent = buildSiteDomainAccent(entry);

  const siteActionsRow = document.createElement('div');
  siteActionsRow.className = 'entry-site-actions-row';
  if (accent) siteActionsRow.appendChild(accent);

  const primaryActions = document.createElement('div');
  primaryActions.className = 'entry-primary-actions';
  const linkedOperationLog = buildLinkedOperationLog(entry);
  if (entry.url) primaryActions.appendChild(makeButton('Открыть страницу', false, async () => {
    try { await chrome.runtime.sendMessage({ type: 'WEBCLIP_OPEN_URL', url: entry.url }); } catch (_) {}
  }));
  if (later) primaryActions.appendChild(makeButton('Перенести в «Прочитано»', false, () => moveEntryToRead(entry), 'move-read-button'));
  if (canOpenYandexFile) {
    const revokePublic = makeButton('Отозвать публичную ссылку', false, () => revokeEntryPublicAccess(entry, revokePublic), 'danger');
    revokePublic.title = 'Отозвать доступ по ссылке и подтвердить приватное состояние метаданными Яндекс Диска.';
    primaryActions.appendChild(revokePublic);
  }
  primaryActions.append(linkedOperationLog.showButton, linkedOperationLog.copyButton);
  primaryActions.appendChild(makeButton('Удалить запись', false, () => deleteEntry(entry), 'danger'));
  siteActionsRow.appendChild(primaryActions);

  const filename = document.createElement('div');
  filename.className = 'filename';
  filename.textContent = entry.filename || '—';

  const meta = document.createElement('div');
  meta.className = 'meta';
  let movedAt = null;
  const movedToReadAt = Number(entry.movedToReadAt || 0);
  if (!later && entry.destination === 'yandex' && movedToReadAt > 0) {
    movedAt = document.createElement('div');
    movedAt.className = 'entry-moved-read-at';
    movedAt.textContent = `Переведено в «Прочитано»: ${formatDate(movedToReadAt)}`;
  }
  const url = entry.url ? document.createElement('a') : document.createElement('div');
  url.className = entry.url ? 'entry-url-link' : 'muted';
  url.textContent = entry.url || '';
  if (entry.url) {
    url.href = entry.url;
    url.title = entry.url;
    url.addEventListener('click', async (event) => {
      event.preventDefault();
      try {
        await chrome.runtime.sendMessage({ type: 'WEBCLIP_OPEN_URL', url: entry.url });
      } catch (_) {
        window.open(entry.url, '_blank', 'noopener');
      }
    });
  }
  if (movedAt) meta.appendChild(movedAt);
  meta.appendChild(url);
  if (entry.remotePath) {
    const remote = document.createElement('div');
    remote.className = 'muted';
    remote.textContent = `Путь на Яндекс Диске: ${entry.remotePath}`;
    meta.appendChild(remote);
  }
  const fileCommentValue = String(entry.fileComment || '').trim();
  let fileComment = null;
  if (fileCommentValue) {
    fileComment = document.createElement('div');
    fileComment.className = 'file-comment';
    const fileCommentTitle = document.createElement('strong');
    fileCommentTitle.textContent = 'Комментарий к файлу';
    const fileCommentText = document.createElement('span');
    fileCommentText.textContent = fileCommentValue;
    fileComment.append(fileCommentTitle, fileCommentText);
  }

  const journalComments = buildJournalComments(entry);

  const sameUrl = Boolean(sourceUrl && normalizeUrl(entry.url) === normalizeUrl(sourceUrl));
  const sameSite = Boolean(sourceUrl && siteKeyFromUrl(entry.url) && siteKeyFromUrl(entry.url) === siteKeyFromUrl(sourceUrl));
  const canApply = sourceTabId > 0 && sameSite;
  const apply = makeButton('Применить Включены/Исключены', true, () => applyEntry(entry));
  apply.disabled = !canApply;
  if (!canApply) apply.title = 'Применение доступно только к исходной вкладке того же сайта до третьего уровня домена.';
  else if (!sameUrl) apply.title = 'Шаблон будет применён к другому URL того же сайта. После восстановления проверьте области Включены/Исключены.';

  const selectionDetails = buildSelectionDetails(entry.selectionSnapshot || {}, apply);
  const resourceDetails = buildResourceReportDetails(entry.resourceReport || {});

  card.append(head, siteActionsRow);
  card.append(filename, meta);
  if (fileComment) card.appendChild(fileComment);
  card.append(journalComments);
  if (resourceDetails) card.appendChild(resourceDetails);
  card.appendChild(linkedOperationLog.root);
  card.append(selectionDetails);
  return card;
}

function buildResourceReportDetails(report) {
  if (!report || typeof report !== 'object' || Number(report.version || 0) < 1) return null;
  const attempted = Math.max(0, Number(report.attempted) || 0);
  const loaded = Math.max(0, Number(report.loaded) || 0);
  const failed = Math.max(0, Number(report.failed) || 0);
  const omitted = Math.max(0, Number(report.omittedByLimit) || 0);
  const failures = Array.isArray(report.failures) ? report.failures.slice(0, 40) : [];
  const details = document.createElement('details');
  details.className = `resource-details${failed || omitted || report.deadlineExceeded || report.scanTruncated ? ' warning' : ''}`;
  const summary = document.createElement('summary');
  summary.textContent = `Ресурсы PDF: готово ${loaded}/${attempted}${failed ? `, не загружено ${failed}` : ''}${omitted ? `, лимит +${omitted}` : ''}`;
  details.appendChild(summary);

  const body = document.createElement('div');
  body.className = 'resource-body';
  const diagnostic = document.createElement('div');
  diagnostic.className = 'locator-text';
  const flags = [];
  if (report.deadlineExceeded) flags.push('достигнут общий deadline');
  if (report.scanTruncated) flags.push('обход DOM ограничен безопасным лимитом');
  if (omitted) flags.push(`не проверено из-за resource limit: ${omitted}+`);
  diagnostic.textContent = flags.length ? flags.join('; ') : 'Bounded prefetch завершён без превышения лимитов.';
  body.appendChild(diagnostic);

  if (failures.length) {
    const list = document.createElement('ul');
    list.className = 'resource-failures';
    for (const item of failures) {
      const li = document.createElement('li');
      const kind = item?.kind === 'font' ? 'Шрифт' : item?.kind === 'background' ? 'Фон' : item?.kind === 'image' ? 'Изображение' : 'Ресурс';
      li.textContent = `${kind}: ${String(item?.resource || 'ресурс')} — ${String(item?.reason || 'ошибка загрузки')}`;
      list.appendChild(li);
    }
    body.appendChild(list);
  }
  details.appendChild(body);
  return details;
}

function buildSelectionDetails(snapshot, applyButton = null) {
  const details = document.createElement('details');
  details.className = 'selection-details';
  const summary = document.createElement('summary');
  const includes = Array.isArray(snapshot?.includes) ? snapshot.includes : [];
  const excludes = Array.isArray(snapshot?.excludes) ? snapshot.excludes : [];
  summary.textContent = `Области страницы Включены/Исключены (${includes.length}/${excludes.length})`;
  details.appendChild(summary);

  const body = document.createElement('div');
  body.className = 'selection-body';
  const snapshotVersion = Number(snapshot?.version || 1);
  const restoreInfo = document.createElement('div');
  restoreInfo.className = 'locator-text';
  restoreInfo.textContent = snapshotVersion >= 3
    ? 'Restore v3: структурный путь проверяется по контекстному fingerprint; неоднозначные совпадения не применяются.'
    : `Legacy restore v${snapshotVersion}: snapshot не содержит полного контекстного fingerprint v3.`;
  body.appendChild(restoreInfo);
  if (applyButton) {
    const actionRow = document.createElement('div');
    actionRow.className = 'selection-apply-actions';
    actionRow.appendChild(applyButton);
    body.appendChild(actionRow);
  }
  body.appendChild(buildLocatorGroup('Включены', includes, 'include'));
  body.appendChild(buildLocatorGroup('Исключены', excludes, 'exclude'));
  details.appendChild(body);
  return details;
}

function buildLocatorGroup(title, locators, kind) {
  const group = document.createElement('section');
  group.className = `locator-group ${kind}`;
  const heading = document.createElement('h3');
  heading.textContent = `${title}: ${locators.length}`;
  group.appendChild(heading);
  if (!locators.length) {
    const empty = document.createElement('div');
    empty.className = 'locator-empty';
    empty.textContent = 'Нет областей.';
    group.appendChild(empty);
    return group;
  }
  const list = document.createElement('ol');
  for (const locator of locators) {
    const item = document.createElement('li');
    const label = document.createElement('div');
    label.className = 'locator-label';
    const parts = [locator.tag || 'element'];
    if (locator.id) parts.push(`#${locator.id}`);
    else if (Array.isArray(locator.classes) && locator.classes.length) parts.push(`.${locator.classes.slice(0, 3).join('.')}`);
    label.textContent = parts.join('');
    const text = document.createElement('div');
    text.className = 'locator-text';
    text.textContent = locator.text ? `«${locator.text}»` : (locator.ariaLabel || locator.name || 'Без текстового фрагмента');
    item.append(label, text);
    if (Array.isArray(locator.framePath) && locator.framePath.length) {
      const frame = document.createElement('div');
      frame.className = 'locator-frame';
      frame.textContent = `Встроенный документ: ${locator.framePath.length} уровень(я)`;
      item.appendChild(frame);
    }
    const path = document.createElement('code');
    path.textContent = locator.cssPath || '(структурный путь не сохранён)';
    item.appendChild(path);
    list.appendChild(item);
  }
  group.appendChild(list);
  return group;
}

function makeButton(text, primary, handler, extraClass = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;
  button.className = `${primary ? 'primary' : ''} ${extraClass}`.trim();
  button.addEventListener('click', handler);
  return button;
}

async function applyEntry(entry) {
  setStatus('', '');
  try {
    await chrome.scripting.executeScript({ target: { tabId: sourceTabId }, files: ['content.js'] });
    const result = await chrome.tabs.sendMessage(sourceTabId, {
      type: 'WEBCLIP_APPLY_SELECTION_SNAPSHOT',
      snapshot: entry.selectionSnapshot || {}
    });
    requireOk(result);
    await chrome.tabs.update(sourceTabId, { active: true });
    const crossUrl = normalizeUrl(entry.url) !== normalizeUrl(sourceUrl);
    const missing = (result.missingIncludes || 0) + (result.missingExcludes || 0);
    const ambiguous = (result.ambiguousIncludes || 0) + (result.ambiguousExcludes || 0);
    const confidence = [];
    if (result.confidenceHigh) confidence.push(`высокая: ${result.confidenceHigh}`);
    if (result.confidenceMedium) confidence.push(`средняя: ${result.confidenceMedium}`);
    if (result.confidenceLegacy) confidence.push(`legacy: ${result.confidenceLegacy}`);
    setStatus(
      `Выделение восстановлено. Включены: ${result.restoredIncludes || 0}, Исключены: ${result.restoredExcludes || 0}.` +
      `${confidence.length ? ` Уверенность restore: ${confidence.join(', ')}.` : ''}` +
      `${crossUrl ? ' Шаблон взят с другого URL этого же сайта — проверьте восстановленные области.' : ''}` +
      `${ambiguous ? ` Неоднозначных совпадений: ${ambiguous}; они не применены.` : ''}` +
      `${missing ? ` Не найдено областей: ${missing}.` : ''}`,
      missing || ambiguous ? 'error' : 'ok'
    );
  } catch (error) {
    setStatus(`Не удалось применить выделение: ${error?.message || String(error)}`, 'error');
  }
}

const DELETE_OPERATION_STAGES = [
  ['locate', 'Поиск актуального файла на Яндекс Диске'],
  ['folder', 'Подготовка Trash/MM-YYYY'],
  ['move', 'Перемещение файла в Trash'],
  ['verify', 'Проверка результата на Яндекс Диске'],
  ['journal', 'Удаление записи локального журнала']
];

const DELETE_REVOKE_KEEP_STAGES = [
  ['locate', 'Проверка exact файла и публичной ссылки'],
  ['revoke', 'Отзыв публичного доступа'],
  ['verify', 'Подтверждение приватного состояния'],
  ['journal', 'Удаление exact записи локального журнала']
];

const DELETE_REVOKE_TRASH_STAGES = [
  ['locate', 'Проверка exact файла и публичной ссылки'],
  ['folder', 'Подготовка immutable Trash target'],
  ['revoke', 'Отдельная admission и отзыв публичного доступа'],
  ['verify-revoke', 'Подтверждение private exact source'],
  ['move', 'Отдельная admission и перемещение в Trash'],
  ['verify-move', 'Подтверждение private exact Trash target'],
  ['journal', 'Удаление exact записи локального журнала']
];

let activeDeleteProgressStages = DELETE_OPERATION_STAGES;

const MOVE_READ_STAGES = [
  ['locate', 'Поиск актуального файла «Прочитать позже»'],
  ['folder', 'Подготовка структуры Upload по домену'],
  ['move', 'Перемещение файла в Upload'],
  ['verify', 'Проверка файла на Яндекс Диске'],
  ['complete', 'Обновление записи журнала']
];

function renderProgressStages(container, stages) {
  container.replaceChildren();
  for (const [stage, label] of stages) {
    const li = document.createElement('li');
    li.className = 'progress-stage';
    li.dataset.stage = stage;
    const mark = document.createElement('span');
    mark.className = 'mark';
    mark.textContent = '·';
    const text = document.createElement('span');
    text.textContent = label;
    li.append(mark, text);
    container.appendChild(li);
  }
}

function applyProgressMessage(container, stages, message) {
  const currentIndex = stages.findIndex(([stage]) => stage === message.stage);
  for (let i = 0; i < stages.length; i += 1) {
    const item = container.querySelector(`[data-stage="${stages[i][0]}"]`);
    if (!item) continue;
    item.className = 'progress-stage';
    const mark = item.querySelector('.mark');
    if (message.state === 'success' || (currentIndex >= 0 && i < currentIndex)) {
      item.classList.add('done'); mark.textContent = '✓';
    } else if (i === currentIndex && message.state === 'error') {
      item.classList.add('failed'); mark.textContent = '!';
    } else if (i === currentIndex) {
      item.classList.add('active'); mark.textContent = '→';
    } else mark.textContent = '·';
  }
}

async function deleteEntry(entry) {
  if (!entry?.id) return;
  if (entry.destination !== 'yandex') {
    if (!confirm('Удалить эту отдельную запись журнала? Локально скачанный PDF автоматически удалён не будет.')) return;
    try {
      const operationId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      showLastOperationId(operationId);
      const result = await chrome.runtime.sendMessage({ type: 'WEBCLIP_JOURNAL_DELETE', id: entry.id, diskAction: 'keep', operationId });
      requireOk(result);
      setStatus(`Запись удалена из журнала. Локальный PDF-файл не изменён. · operationId: ${result.operationId || operationId}`, 'ok');
      await loadJournal();
    } catch (error) { setStatus(error?.message || String(error), 'error'); }
    return;
  }
  openDeleteDialog(entry);
}

async function revokeEntryPublicAccess(entry, button = null) {
  if (!entry?.id || entry.destination !== 'yandex' || !String(entry.publicUrl || '').trim()) return;
  const confirmed = window.confirm(
    'Отозвать публичный доступ к этому exact файлу на Яндекс Диске?\n\n'
    + 'WebClip сначала сохранит durable checkpoint, затем выполнит unpublish и очистит ссылку в журнале только после подтверждённого приватного состояния.'
  );
  if (!confirmed) return;
  const operationId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  showLastOperationId(operationId);
  if (button) button.disabled = true;
  setStatus(`Отзываем публичную ссылку и проверяем результат… · operationId: ${operationId}`, '');
  try {
    const result = await chrome.runtime.sendMessage({
      type: 'WEBCLIP_JOURNAL_REVOKE_PUBLIC_ACCESS',
      id: entry.id,
      operationId
    });
    requireOk(result);
    const notice = result.publicationOutcome === 'already-private-verified'
      ? 'Файл уже был приватным; устаревшая ссылка удалена из журнала.'
      : 'Публичный доступ отозван и приватное состояние подтверждено Яндекс Диском.';
    setStatus(`${notice} · operationId: ${result.operationId || operationId}`, result.journalSuperseded ? '' : 'ok');
    await loadJournal();
  } catch (error) {
    if (button) button.disabled = false;
    setStatus(`${error?.message || String(error)} Запись журнала сохранена; повторная unpublish команда автоматически не отправляется. · operationId: ${operationId}`, 'error');
  }
}

function resetDeleteProgressUi() {
  activeDeleteProgressStages = DELETE_OPERATION_STAGES;
  deleteProgress.classList.add('hidden');
  deleteProgressBar.style.width = '0%';
  deleteProgressPercent.textContent = '0%';
  renderProgressStages(deleteProgressStages, DELETE_OPERATION_STAGES);
  deleteRetry.classList.add('hidden');
  deleteOnlyAfterError.classList.add('hidden');
  deleteProceed.classList.remove('hidden');
  deleteOperationIdRow.classList.add('hidden');
  deleteOperationIdEl.textContent = '';
}

function openDeleteDialog(entry) {
  if (journalDeleteBusy) return;
  pendingDeleteEntry = entry;
  activeDeleteOperationId = '';
  const hasKnownPublicAccess = entry?.destination === 'yandex' && Boolean(String(entry?.publicUrl || '').trim());
  deleteDialog.className = 'delete-dialog';
  deleteTitle.textContent = hasKnownPublicAccess
    ? 'Что сделать с файлом и публичным доступом?'
    : 'Что сделать с файлом на Яндекс Диске?';
  deleteText.textContent = `Запись: ${entry.title || 'Без названия'}\nФайл при сохранении: ${entry.filename || '—'}\nПуть при сохранении: ${entry.remotePath || 'не указан'}\n\n${hasKnownPublicAccess
    ? 'У файла есть публичная ссылка. Отдельно подтвердите судьбу файла и публичного доступа.'
    : 'Выберите один вариант. Без выбора удаление не начнётся.'}`;
  deleteKeepFile.checked = false;
  deleteTrashFile.checked = false;
  deletePreservePublicAccess.checked = false;
  deleteRevokePublicAccess.checked = false;
  deletePublicationChoices.classList.toggle('hidden', !hasKnownPublicAccess);
  deleteStatus.textContent = '';
  deleteStatus.className = 'delete-status';
  deleteProceed.disabled = true;
  deleteCancel.disabled = false;
  deleteKeepFile.disabled = false;
  deleteTrashFile.disabled = false;
  deleteRevokePublicAccess.disabled = true;
  deleteChoices.disabled = false;
  deletePublicationChoices.disabled = false;
  resetDeleteProgressUi();
  deleteBackdrop.classList.remove('hidden');
}

function pendingDeleteHasKnownPublicAccess() {
  return pendingDeleteEntry?.destination === 'yandex' && Boolean(String(pendingDeleteEntry?.publicUrl || '').trim());
}

function updateDeleteChoiceState() {
  if (journalDeleteBusy) return;
  const diskChoiceReady = deleteKeepFile.checked || deleteTrashFile.checked;
  const revokeAllowed = pendingDeleteHasKnownPublicAccess() && diskChoiceReady;
  deleteRevokePublicAccess.disabled = !revokeAllowed;
  if (!revokeAllowed && deleteRevokePublicAccess.checked) deleteRevokePublicAccess.checked = false;
  const publicationChoiceReady = !pendingDeleteHasKnownPublicAccess()
    || deletePreservePublicAccess.checked
    || (revokeAllowed && deleteRevokePublicAccess.checked);
  deleteProceed.disabled = !(diskChoiceReady && publicationChoiceReady);
  deleteStatus.textContent = '';
  deleteStatus.className = 'delete-status';
  deleteDialog.className = 'delete-dialog';
  resetDeleteProgressUi();
}

function closeDeleteDialog() {
  if (journalDeleteBusy) return;
  deleteBackdrop.classList.add('hidden');
  pendingDeleteEntry = null;
  activeDeleteOperationId = '';
  deleteKeepFile.checked = false;
  deleteTrashFile.checked = false;
  deletePreservePublicAccess.checked = false;
  deleteRevokePublicAccess.checked = false;
  deletePublicationChoices.classList.add('hidden');
  deleteStatus.textContent = '';
  deleteStatus.className = 'delete-status';
  resetDeleteProgressUi();
}

function updateDeleteProgress(message) {
  deleteProgress.classList.remove('hidden');
  const percent = Math.max(0, Math.min(100, Number(message.percent) || 0));
  deleteProgressBar.style.width = `${percent}%`;
  deleteProgressPercent.textContent = message.state === 'error' ? 'Ошибка' : `${Math.round(percent)}%`;
  deleteStatus.textContent = message.message || 'Выполняется удаление…';
  applyProgressMessage(deleteProgressStages, activeDeleteProgressStages, message);
}

async function confirmDeleteEntry() {
  if (journalDeleteBusy) return;
  const diskAction = deleteTrashFile.checked ? 'trash' : deleteKeepFile.checked ? 'keep' : '';
  if (!diskAction) {
    deleteStatus.textContent = 'Сначала выберите судьбу файла.';
    deleteStatus.className = 'delete-status error';
    return;
  }
  const publicationAction = pendingDeleteHasKnownPublicAccess()
    ? (deletePreservePublicAccess.checked ? 'preserve' : deleteRevokePublicAccess.checked ? 'revoke' : '')
    : 'none';
  if (!publicationAction) {
    deleteStatus.textContent = 'Выберите: сохранить публичный доступ или отозвать ссылку перед удалением записи.';
    deleteStatus.className = 'delete-status error';
    return;
  }
  await runDeleteOperation(diskAction, publicationAction);
}

async function runDeleteOperation(diskAction, publicationAction = 'none') {
  const entry = pendingDeleteEntry;
  if (!entry?.id || journalDeleteBusy) return;
  journalDeleteBusy = true;
  operationProgressPortController.ensureConnected();
  activeDeleteOperationId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  showLastOperationId(activeDeleteOperationId);
  deleteOperationIdEl.textContent = activeDeleteOperationId;
  deleteOperationIdRow.classList.remove('hidden');
  deleteDialog.className = 'delete-dialog busy';
  deleteProceed.disabled = true;
  deleteCancel.disabled = true;
  deleteKeepFile.disabled = true;
  deleteTrashFile.disabled = true;
  deleteChoices.disabled = true;
  deletePublicationChoices.disabled = true;
  deleteRetry.classList.add('hidden');
  deleteOnlyAfterError.classList.add('hidden');
  deleteProceed.classList.add('hidden');
  const revokeAndKeep = diskAction === 'keep' && publicationAction === 'revoke';
  const revokeAndTrash = diskAction === 'trash' && publicationAction === 'revoke';
  deleteTitle.textContent = revokeAndTrash
    ? 'Отзыв ссылки и перемещение в Trash'
    : diskAction === 'trash'
      ? 'Перемещение файла в Trash'
    : revokeAndKeep ? 'Отзыв ссылки и удаление записи' : 'Удаление записи журнала';
  deleteStatus.className = 'delete-status';
  if (diskAction === 'trash' || revokeAndKeep) {
    deleteProgress.classList.remove('hidden');
    activeDeleteProgressStages = revokeAndTrash
      ? DELETE_REVOKE_TRASH_STAGES
      : (revokeAndKeep ? DELETE_REVOKE_KEEP_STAGES : DELETE_OPERATION_STAGES);
    renderProgressStages(deleteProgressStages, activeDeleteProgressStages);
    updateDeleteProgress({
      stage: 'locate',
      message: revokeAndKeep || revokeAndTrash
        ? 'Проверяем exact файл и текущую публичную ссылку…'
        : 'Начинаем поиск файла на Яндекс Диске…',
      percent: 4
    });
  } else {
    deleteProgress.classList.add('hidden');
    deleteStatus.textContent = 'Файл останется на Яндекс Диске. Удаляется только локальная запись журнала.';
  }

  try {
    const result = await chrome.runtime.sendMessage({
      type: 'WEBCLIP_JOURNAL_DELETE', id: entry.id, diskAction, publicationAction, operationId: activeDeleteOperationId
    });
    requireOk(result);
    const completedOperationId = activeDeleteOperationId;
    journalDeleteBusy = false;
    operationProgressPortController.suspend();
    activeDeleteOperationId = '';
    deleteBackdrop.classList.add('hidden');
    pendingDeleteEntry = null;
    const publicationNotice = result.publicationOutcome === 'preserved-by-user'
      ? ' Публичный доступ по ссылке сохранён по вашему явному выбору.'
      : publicationAction === 'revoke'
        ? ' Публичный доступ отозван и приватное состояние подтверждено.'
        : '';
    const successText = result.journalSuperseded
      ? `Публичное состояние файла подтверждено; исходная запись журнала уже была изменена или заменена и не затронута. · operationId: ${completedOperationId}`
      : (diskAction === 'trash'
        ? `Запись удалена. Файл перемещён на Яндекс Диске в: ${result.trashPath || 'Trash'} · operationId: ${completedOperationId}`
        : `Запись удалена. Файл оставлен на Яндекс Диске. · operationId: ${completedOperationId}`);
    setStatus(successText + publicationNotice, 'ok');
    await loadJournal();
  } catch (error) {
    journalDeleteBusy = false;
    operationProgressPortController.suspend();
    deleteDialog.className = 'delete-dialog error';
    deleteTitle.textContent = 'Удаление не завершено';
    deleteStatus.textContent = `${error?.message || String(error)}\n\nЗапись журнала не удалена.`;
    deleteStatus.className = 'delete-status error';
    deleteCancel.disabled = false;
    deleteKeepFile.disabled = false;
    deleteTrashFile.disabled = false;
    deleteChoices.disabled = false;
    deletePublicationChoices.disabled = false;
    deleteProceed.classList.add('hidden');
    deleteRetryAction = diskAction;
    deleteRetryPublicationAction = publicationAction;
    deleteRetry.textContent = 'Повторить';
    deleteRetry.classList.remove('hidden');
    if (diskAction === 'trash' && publicationAction !== 'revoke') deleteOnlyAfterError.classList.remove('hidden');
  }
}

function requestMoveReadConfirmation(entry) {
  if (moveReadConfirmationResolver) finishMoveReadConfirmation(false);
  const filename = String(entry?.filename || '').trim();
  const suffix = filename ? `\n\nФайл: ${filename}` : '';
  moveReadConfirmText.textContent = `Перенести эту запись из «Прочитать позже» в «Прочитано»?\nФайл будет физически перемещён с Яндекс Диска из ReadmeLater в Upload.${suffix}`;
  moveReadConfirmBackdrop.classList.remove('hidden');
  return new Promise((resolve) => {
    moveReadConfirmationResolver = resolve;
  });
}

function finishMoveReadConfirmation(confirmed) {
  moveReadConfirmBackdrop.classList.add('hidden');
  const resolver = moveReadConfirmationResolver;
  moveReadConfirmationResolver = null;
  if (resolver) resolver(Boolean(confirmed));
}

function closeMoveReadProgress() {
  if (moveReadBusy) return;
  moveReadBackdrop.classList.add('hidden');
  pendingMoveReadEntry = null;
  activeMoveReadOperationId = '';
  moveReadOperationIdEl.textContent = '';
}

function updateMoveReadProgress(message) {
  const percent = Math.max(0, Math.min(100, Number(message.percent) || 0));
  moveReadBar.style.width = `${percent}%`;
  moveReadPercent.textContent = message.state === 'error' ? 'Ошибка' : `${Math.round(percent)}%`;
  moveReadText.textContent = message.message || 'Выполняется операция…';
  applyProgressMessage(moveReadStages, MOVE_READ_STAGES, message);
}

async function moveEntryToRead(entry) {
  if (!entry?.id || moveReadBusy) return;
  const confirmed = await requestMoveReadConfirmation(entry);
  if (!confirmed) return;
  pendingMoveReadEntry = entry;
  moveReadBusy = true;
  operationProgressPortController.ensureConnected();
  activeMoveReadOperationId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  showLastOperationId(activeMoveReadOperationId);
  moveReadOperationIdEl.textContent = activeMoveReadOperationId;
  moveReadDialog.className = 'progress-dialog';
  moveReadIcon.textContent = '↻';
  moveReadKicker.textContent = 'ПЕРЕНОС В «ПРОЧИТАНО»';
  moveReadTitle.textContent = 'Перемещение файла в Upload';
  moveReadText.textContent = 'Ищем актуальный файл на Яндекс Диске…';
  moveReadBar.style.width = '4%';
  moveReadPercent.textContent = '4%';
  renderProgressStages(moveReadStages, MOVE_READ_STAGES);
  moveReadClose.classList.add('hidden');
  moveReadBackdrop.classList.remove('hidden');
  updateMoveReadProgress({ stage: 'locate', message: 'Ищем актуальный файл на Яндекс Диске…', percent: 4 });
  try {
    const result = await chrome.runtime.sendMessage({ type: 'WEBCLIP_JOURNAL_MARK_READ', id: entry.id, operationId: activeMoveReadOperationId });
    requireOk(result);
    moveReadBusy = false;
    operationProgressPortController.suspend();
    moveReadDialog.classList.add('success');
    moveReadIcon.textContent = '✓';
    moveReadKicker.textContent = 'ОПЕРАЦИЯ ВЫПОЛНЕНА';
    moveReadTitle.textContent = 'Перенесено в «Прочитано»';
    moveReadText.textContent = `Файл перемещён в структуру Upload: ${result.remotePath || ''}`;
    moveReadBar.style.width = '100%';
    moveReadPercent.textContent = '100%';
    applyProgressMessage(moveReadStages, MOVE_READ_STAGES, { stage: 'complete', state: 'success' });
    moveReadClose.classList.remove('hidden');
    setStatus(`Запись переведена из «Прочитать позже» в «Прочитано». · operationId: ${activeMoveReadOperationId}`, 'ok');
    await loadJournal();
  } catch (error) {
    moveReadBusy = false;
    operationProgressPortController.suspend();
    moveReadDialog.classList.add('error');
    moveReadIcon.textContent = '!';
    moveReadKicker.textContent = 'ТРЕБУЕТСЯ ДЕЙСТВИЕ';
    moveReadTitle.textContent = 'Перенос не завершён';
    moveReadText.textContent = `${error?.message || String(error)}\n\nЗапись журнала оставлена в режиме «Прочитать позже».`;
    moveReadPercent.textContent = 'Ошибка';
    moveReadClose.classList.remove('hidden');
  }
}

function setJournalDestructiveControlsDisabled(disabled) {
  const value = Boolean(disabled);
  importFileButton.disabled = value;
  importYandexButton.disabled = value;
  clearSiteButton.disabled = value;
  clearAllButton.disabled = value;
}

function beginJournalDestructiveOperation(label) {
  if (journalDestructiveOperationInFlight) {
    setStatus(`Сначала дождитесь завершения операции «${journalDestructiveOperationInFlight}».`, 'error');
    return false;
  }
  journalDestructiveOperationInFlight = String(label || 'изменение журнала');
  setJournalDestructiveControlsDisabled(true);
  return true;
}

function endJournalDestructiveOperation() {
  journalDestructiveOperationInFlight = '';
  setJournalDestructiveControlsDisabled(false);
}

async function exportJournalToFile() {
  await runBusy(exportFileButton, async () => {
    const operationId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    showLastOperationId(operationId);
    const prepared = await chrome.runtime.sendMessage({ type: 'WEBCLIP_JOURNAL_EXPORT_PREPARE', operationId });
    requireOk(prepared);
    let downloadId = 0;
    try {
      downloadId = await WebClipPreparedSaveAs.start(prepared);
    } catch (error) {
      await chrome.runtime.sendMessage({
        type: 'WEBCLIP_JOURNAL_EXPORT_SAVE_AS_SETTLED',
        operationId: prepared.operationId || operationId,
        entryCount: prepared.entryCount,
        status: 'error',
        error: error?.message || String(error)
      }).catch(() => {});
      throw error;
    }
    let logWarning = '';
    try {
      const settled = await chrome.runtime.sendMessage({
        type: 'WEBCLIP_JOURNAL_EXPORT_SAVE_AS_SETTLED',
        operationId: prepared.operationId || operationId,
        entryCount: prepared.entryCount,
        status: 'started',
        downloadId
      });
      requireOk(settled);
    } catch (error) {
      logWarning = ` Диагностический лог не удалось финализировать: ${error?.message || String(error)}`;
    }
    setStatus(`Полный журнал (${prepared.entryCount} записей) передан в стандартные загрузки Chrome. · operationId: ${prepared.operationId || operationId}${logWarning}`, logWarning ? 'warn' : 'ok');
  });
}

async function importJournalFromSelectedFile() {
  const file = importFileInput.files?.[0];
  importFileInput.value = '';
  if (!file) return;
  if (!beginJournalDestructiveOperation('Импорт журнала из файла')) return;
  let stagingKey = '';
  let operationId = '';
  let importLease = null;
  try {
    if (file.size > 50 * 1024 * 1024) throw new Error('Файл журнала больше 50 МБ.');
    operationId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    showLastOperationId(operationId);
    stagingKey = await stageJournalImportFile(file);
    const preview = await chrome.runtime.sendMessage({
      type: 'WEBCLIP_JOURNAL_IMPORT_PREVIEW_STAGED',
      stagingKey,
      operationId,
      source: 'file',
      ownerSessionId: journalImportOwnerSessionId
    });
    requireOk(preview);
    const previewReceipt = requireJournalImportPreviewReceipt(preview);
    importLease = requireJournalImportLease(preview);
    startJournalImportLeaseHeartbeat(importLease);
    const confirmed = await requestDangerousConfirmation({
      title: 'Импорт полного журнала',
      text: `Импорт полностью заменит текущий локальный журнал данными из файла «${file.name}».
Записей в файле: ${preview.entryCount}.
Дата экспорта: ${preview.exportedAt || 'не указана'}.
SHA-256 проверенной копии: ${preview.contentSha256}.
Действие нельзя отменить.`
    });
    if (!confirmed) {
      await discardStagedJournalImport(stagingKey, importLease);
      stagingKey = '';
      await chrome.runtime.sendMessage({
        type: 'WEBCLIP_OPERATION_LOG_FINISH', operationId, status: 'canceled',
        summary: 'Импорт журнала из файла отменён пользователем после проверки файла.'
      }).catch(() => {});
      setStatus(`Импорт журнала отменён. · operationId: ${operationId}`, '');
      return;
    }
    assertJournalImportLeaseUsable(importLease);
    const result = await chrome.runtime.sendMessage({
      type: 'WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED',
      stagingKey,
      operationId,
      source: 'file',
      previewReceipt,
      leaseToken: importLease.leaseToken,
      ownerSessionId: journalImportOwnerSessionId
    });
    requireOk(result);
    stagingKey = '';
    setStatus(`Журнал восстановлен из файла. Импортировано записей: ${result.importedCount}. · operationId: ${result.operationId || operationId}`, 'ok');
    await loadJournal();
  } catch (error) {
    const mayDiscard = !importLease || !journalImportLeaseLostError;
    if (stagingKey && mayDiscard) {
      await discardStagedJournalImport(stagingKey, importLease).catch(() => {});
    }
    setStatus(`Ошибка импорта: ${error?.message || String(error)}${operationId ? ` · operationId: ${operationId}` : ''}`, 'error');
  } finally {
    stopJournalImportLeaseHeartbeat();
    endJournalDestructiveOperation();
  }
}

async function exportJournalToYandex() {
  if (backupProgressActive) return;
  const operationId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  showLastOperationId(operationId);
  showBackupProgress(operationId);
  exportYandexButton.disabled = true;
  try {
    const result = await chrome.runtime.sendMessage({
      type: 'WEBCLIP_JOURNAL_YANDEX_EXPORT',
      operationId
    });
    requireOk(result);
    finishBackupProgressSuccess(result);
    setStatus(`Полная резервная копия журнала выгружена: ${result.remotePath}. Записей: ${result.entryCount}. · operationId: ${result.operationId || operationId}`, 'ok');
    await refreshBackupInfo();
  } catch (error) {
    finishBackupProgressError(error?.message || String(error));
    setStatus(`Ошибка резервного копирования: ${error?.message || String(error)}`, 'error');
  } finally {
    exportYandexButton.disabled = false;
  }
}

async function importJournalFromYandex() {
  if (backupProgressActive) return;
  if (yandexBackupListLoading) {
    openYandexBackupPicker();
    return;
  }
  currentBackupMonth = monthStart(new Date());
  openYandexBackupPicker();
  await loadYandexBackupsForCurrentMonth();
}

async function loadYandexBackupsForCurrentMonth() {
  if (yandexBackupListLoading) return false;
  yandexBackupListLoading = true;
  const generation = ++yandexBackupListGeneration;
  const requestedMonth = monthStart(currentBackupMonth);
  const requestedMonthKey = monthKey(requestedMonth);
  selectedYandexBackupPath = '';
  backupPickerProceed.disabled = true;
  backupPickerList.replaceChildren();
  backupMonthLabel.textContent = formatMonthLabel(requestedMonth);
  const nowMonth = monthStart(new Date());
  backupMonthNext.disabled = isSameMonth(requestedMonth, nowMonth) || requestedMonth > nowMonth;
  backupPickerStatus.textContent = `Загружаем резервные копии за ${requestedMonthKey}…`;
  backupPickerStatus.className = 'picker-status';
  backupMonthPrev.disabled = true;
  backupMonthNext.disabled = true;
  try {
    const result = await sendReadOnlyRuntimeMessage({
      type: 'WEBCLIP_JOURNAL_YANDEX_LIST_BACKUPS',
      month: requestedMonthKey
    }, 60000, 'Получение списка резервных копий Яндекс Диска');
    requireOk(result);
    if (generation !== yandexBackupListGeneration) return;
    renderYandexBackupPicker(result.files || [], requestedMonth);
  } catch (error) {
    if (generation !== yandexBackupListGeneration) return;
    backupPickerStatus.textContent = `Не удалось получить список файлов: ${error?.message || String(error)}`;
    backupPickerStatus.className = 'picker-status error';
  } finally {
    if (generation === yandexBackupListGeneration) {
      yandexBackupListLoading = false;
      backupMonthPrev.disabled = false;
      backupMonthNext.disabled = isSameMonth(currentBackupMonth, monthStart(new Date()));
    }
  }
  return true;
}

async function changeBackupMonth(delta) {
  if (yandexBackupListLoading) return;
  if (!Number.isInteger(delta) || !delta) return;
  const candidate = addMonths(currentBackupMonth, delta);
  const nowMonth = monthStart(new Date());
  if (candidate > nowMonth) return;
  currentBackupMonth = candidate;
  await loadYandexBackupsForCurrentMonth();
}

function openYandexBackupPicker() {
  backupPickerBackdrop.classList.remove('hidden');
}

function closeYandexBackupPicker() {
  backupPickerBackdrop.classList.add('hidden');
  selectedYandexBackupPath = '';
  backupPickerProceed.disabled = true;
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return 'размер не указан';
  if (value < 1024) return `${value} Б`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} КБ`;
  return `${(value / (1024 * 1024)).toFixed(1)} МБ`;
}

function renderYandexBackupPicker(files, renderedMonth = currentBackupMonth) {
  backupPickerList.replaceChildren();
  if (!files.length) {
    backupPickerStatus.textContent = `За ${monthKey(renderedMonth)} резервные копии не найдены. Перейдите к предыдущему месяцу.`;
    return;
  }
  backupPickerStatus.textContent = `За ${monthKey(renderedMonth)} найдено файлов: ${files.length}. Выберите конкретную резервную копию.`;
  const batchSize = 250;
  let selectedLabel = null;
  const renderBatch = (start = 0) => {
    const end = Math.min(files.length, start + batchSize);
    for (let index = start; index < end; index += 1) {
      const file = files[index];
      const label = document.createElement('label');
      label.className = 'backup-file-option';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'yandexBackupFile';
      radio.value = file.path || '';
      const main = document.createElement('div');
      main.className = 'backup-file-main';
      const name = document.createElement('div');
      name.className = 'backup-file-name';
      name.textContent = file.name || file.path || 'Без имени';
      const meta = document.createElement('div');
      meta.className = 'backup-file-meta';
      const folder = `Папка: ${file.monthFolder || monthKey(renderedMonth)}`;
      const modified = file.modified ? `Изменён: ${formatDate(file.modified) || file.modified}` : 'Дата не указана';
      meta.textContent = `${folder} · ${modified} · ${formatBytes(file.size)}`;
      const path = document.createElement('div');
      path.className = 'backup-file-path';
      path.textContent = file.path || '';
      main.append(name, meta, path);
      label.append(radio, main);
      radio.addEventListener('change', () => {
        selectedYandexBackupPath = radio.value;
        backupPickerProceed.disabled = !selectedYandexBackupPath;
        if (selectedLabel && selectedLabel !== label) selectedLabel.classList.remove('selected');
        label.classList.add('selected');
        selectedLabel = label;
      });
      backupPickerList.appendChild(label);
    }
    if (end < files.length) {
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'backup-load-more';
      more.textContent = `Показать ещё (${Math.min(batchSize, files.length - end)} из ${files.length - end})`;
      more.addEventListener('click', () => {
        more.remove();
        renderBatch(end);
      });
      backupPickerList.appendChild(more);
    }
  };
  renderBatch();
}

async function importSelectedYandexBackup() {
  const path = selectedYandexBackupPath;
  if (!path) return;
  if (!beginJournalDestructiveOperation('Восстановление журнала с Яндекс Диска')) return;
  backupPickerProceed.disabled = true;
  backupPickerCancel.disabled = true;
  backupPickerCancelTop.disabled = true;
  backupPickerStatus.textContent = 'Загружаем выбранный файл и проверяем его структуру…';
  backupPickerStatus.className = 'picker-status';
  const operationId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  showLastOperationId(operationId);
  let yandexStagingKey = '';
  let importLease = null;
  backupPickerStatus.textContent += `\noperationId: ${operationId}`;
  try {
    const fetched = await chrome.runtime.sendMessage({
      type: 'WEBCLIP_JOURNAL_YANDEX_FETCH_BACKUP',
      path,
      operationId,
      ownerSessionId: journalImportOwnerSessionId
    });
    requireOk(fetched);
    const previewReceipt = requireJournalImportPreviewReceipt(fetched);
    importLease = requireJournalImportLease(fetched);
    startJournalImportLeaseHeartbeat(importLease);
    yandexStagingKey = String(fetched.stagingKey || '');
    closeYandexBackupPicker();
    const confirmed = await requestDangerousConfirmation({
      title: 'Восстановление журнала с Яндекс Диска',
      text: `Текущий локальный журнал будет полностью заменён выбранной резервной копией:\n${fetched.remotePath}\nЗаписей: ${fetched.entryCount}.\nДата экспорта: ${fetched.exportedAt || 'не указана'}.\nSHA-256 проверенной копии: ${fetched.contentSha256}.\nДействие нельзя отменить.`
    });
    if (!confirmed) {
      await discardStagedJournalImport(fetched.stagingKey, importLease);
      yandexStagingKey = '';
      await chrome.runtime.sendMessage({
        type: 'WEBCLIP_OPERATION_LOG_FINISH',
        operationId,
        status: 'canceled',
        summary: 'Восстановление журнала отменено пользователем после проверки резервной копии.'
      }).catch(() => {});
      setStatus(`Восстановление журнала отменено. · operationId: ${operationId}`, '');
      return;
    }
    assertJournalImportLeaseUsable(importLease);
    const imported = await chrome.runtime.sendMessage({
      type: 'WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED',
      stagingKey: fetched.stagingKey,
      operationId,
      source: 'yandex',
      previewReceipt,
      leaseToken: importLease.leaseToken,
      ownerSessionId: journalImportOwnerSessionId
    });
    requireOk(imported);
    yandexStagingKey = '';
    setStatus(`Журнал восстановлен с Яндекс Диска. Импортировано записей: ${imported.importedCount}. · operationId: ${imported.operationId || operationId}`, 'ok');
    await loadJournal();
  } catch (error) {
    const mayDiscard = !importLease || !journalImportLeaseLostError;
    if (yandexStagingKey && mayDiscard) {
      await discardStagedJournalImport(yandexStagingKey, importLease).catch(() => {});
    }
    backupPickerStatus.textContent = `Ошибка импорта: ${error?.message || String(error)}`;
    backupPickerStatus.className = 'picker-status error';
    setStatus(`Ошибка импорта с Яндекс Диска: ${error?.message || String(error)}`, 'error');
  } finally {
    stopJournalImportLeaseHeartbeat();
    backupPickerCancel.disabled = false;
    backupPickerCancelTop.disabled = false;
    backupPickerProceed.disabled = !selectedYandexBackupPath;
    endJournalDestructiveOperation();
  }
}


const READ_ONLY_RUNTIME_MAX_IN_FLIGHT = 4;
const readOnlyRuntimeInFlight = new Map();

function readOnlyRuntimeMessageKey(message) {
  try { return JSON.stringify(message); } catch (_) { return String(message?.type || 'read'); }
}

function sendReadOnlyRuntimeMessage(message, timeoutMs = 30000, label = 'Чтение данных WebClip') {
  const waitMs = Math.max(1000, Math.min(120000, Number(timeoutMs) || 30000));
  const key = readOnlyRuntimeMessageKey(message);
  let actual = readOnlyRuntimeInFlight.get(key);
  if (!actual) {
    if (readOnlyRuntimeInFlight.size >= READ_ONLY_RUNTIME_MAX_IN_FLIGHT) {
      return Promise.reject(new Error('Слишком много незавершённых операций чтения WebClip. Дождитесь завершения предыдущих запросов.'));
    }
    actual = Promise.resolve().then(() => chrome.runtime.sendMessage(message));
    readOnlyRuntimeInFlight.set(key, actual);
    void actual.finally(() => {
      if (readOnlyRuntimeInFlight.get(key) === actual) readOnlyRuntimeInFlight.delete(key);
    }).catch(() => {});
  }
  let timer = 0;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} не завершилось за ${Math.ceil(waitMs / 1000)} с.`)), waitMs);
  });
  return Promise.race([actual, deadline]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function setBackupProgressModalVisible(visible) {
  if (visible) {
    backupProgressReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    journalPage?.setAttribute('inert', '');
    journalPage?.setAttribute('aria-hidden', 'true');
    document.body.classList.add('backup-progress-open');
    backupProgressBackdrop.classList.remove('hidden');
    backupProgressDialog.focus({ preventScroll: true });
    return;
  }
  backupProgressBackdrop.classList.add('hidden');
  journalPage?.removeAttribute('inert');
  journalPage?.removeAttribute('aria-hidden');
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
  backupProgressOperationIdEl.textContent = operationId;
  backupProgressActive = true;
  backupProgressPortController.ensureConnected();
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
    } else if (mark) {
      mark.textContent = '·';
    }
  }
}

function finishBackupProgressSuccess(result) {
  backupProgressActive = false;
  backupProgressPortController.suspend();
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
  backupProgressPortController.suspend();
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
  backupProgressOperationIdEl.textContent = '';
}

function showLastOperationId(operationId) {
  const value = String(operationId || '').trim();
  if (!value) return;
  lastOperationIdEl.textContent = value;
  lastOperationIdRow.classList.remove('hidden');
}

async function copyOperationId(operationId) {
  const value = String(operationId || '').trim();
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    setStatus(`operationId скопирован: ${value}`, 'ok');
  } catch (error) {
    setStatus(`Не удалось скопировать operationId: ${error?.message || String(error)}`, 'error');
  }
}

async function clearDomainJournal() {
  const siteKey = siteKeyFromUrl(sourceUrl);
  if (!siteKey) {
    setStatus('Не удалось определить домен текущей страницы.', 'error');
    return;
  }
  if (!beginJournalDestructiveOperation('Очистка журнала домена')) return;
  try {
    const confirmed = await requestDangerousConfirmation({
    title: 'Очистить журнал домена',
    text: `Будут удалены ВСЕ записи журнала для сайта «${siteKey}» независимо от URL внутри этого сайта.\nДействие нельзя отменить.`
    });
    if (!confirmed) return;
    const operationId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    showLastOperationId(operationId);
    const result = await chrome.runtime.sendMessage({ type: 'WEBCLIP_JOURNAL_CLEAR', siteUrl: sourceUrl, operationId });
    requireOk(result);
    setStatus(`Журнал домена ${siteKey} очищен. · operationId: ${result.operationId || operationId}`, 'ok');
    await loadJournal();
  } catch (error) {
    setStatus(error?.message || String(error), 'error');
  } finally {
    endJournalDestructiveOperation();
  }
}

async function clearEntireJournal() {
  if (!beginJournalDestructiveOperation('Очистка всего журнала')) return;
  try {
    const confirmed = await requestDangerousConfirmation({
    title: 'Очистить весь журнал WebClip',
    text: 'Будут удалены ВСЕ локальные записи журнала для всех сайтов и URL. Действие нельзя отменить.'
    });
    if (!confirmed) return;
    const operationId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    showLastOperationId(operationId);
    const result = await chrome.runtime.sendMessage({ type: 'WEBCLIP_JOURNAL_CLEAR', operationId });
    requireOk(result);
    setStatus(`Весь локальный журнал очищен. · operationId: ${result.operationId || operationId}`, 'ok');
    await loadJournal();
  } catch (error) {
    setStatus(error?.message || String(error), 'error');
  } finally {
    endJournalDestructiveOperation();
  }
}

function requestDangerousConfirmation({ title, text }) {
  if (confirmationResolver) finishConfirmation(false);
  confirmationExpectedCode = generateNineDigitCode();
  confirmTitle.textContent = title || 'Подтверждение операции';
  confirmText.textContent = text || '';
  confirmCode.textContent = confirmationExpectedCode;
  confirmInput.value = '';
  confirmError.textContent = '';
  confirmBackdrop.classList.remove('hidden');
  setTimeout(() => confirmInput.focus(), 0);
  return new Promise((resolve) => { confirmationResolver = resolve; });
}

function generateNineDigitCode() {
  const data = new Uint32Array(1);
  crypto.getRandomValues(data);
  return String(100000000 + (data[0] % 900000000));
}

function verifyConfirmationCode() {
  if (confirmInput.value !== confirmationExpectedCode) {
    confirmError.textContent = 'Код не совпадает. Прочитайте 9-значный код выше и введите его вручную.';
    confirmInput.select();
    return;
  }
  finishConfirmation(true);
}

function finishConfirmation(result) {
  confirmBackdrop.classList.add('hidden');
  confirmationExpectedCode = '';
  confirmInput.value = '';
  confirmError.textContent = '';
  const resolver = confirmationResolver;
  confirmationResolver = null;
  if (resolver) resolver(Boolean(result));
}

async function runBusy(button, action) {
  const previous = button.disabled;
  button.disabled = true;
  try {
    await action();
  } catch (error) {
    setStatus(error?.message || String(error), 'error');
  } finally {
    button.disabled = previous;
  }
}

function requireOk(response) {
  if (!response?.ok) throw new Error(response?.error || 'Операция не выполнена.');
  return response;
}

function setStatus(text, kind = '') {
  statusEl.textContent = text || '';
  statusEl.className = `status${kind === 'ok' ? ' ok' : ''}`;
}

function formatDate(value) {
  if (!value) return '';
  try { return new Date(value).toLocaleString('ru-RU'); } catch (_) { return ''; }
}

let journalImportRecoveryRunning = false;

function scheduleJournalImportRecoveryRetry(delayMs) {
  if (journalImportRecoveryTimer) clearTimeout(journalImportRecoveryTimer);
  const waitMs = Math.max(1000, Math.min(2 * 60 * 1000, Number(delayMs) || 1000));
  journalImportRecoveryTimer = setTimeout(() => {
    journalImportRecoveryTimer = 0;
    checkForPendingJournalImport().catch((error) => {
      setStatus(`Не удалось проверить незавершённый импорт: ${error?.message || String(error)}`, 'error');
    });
  }, waitMs);
}

async function checkForPendingJournalImport() {
  if (journalImportRecoveryRunning || activeJournalImportLease) return;
  journalImportRecoveryRunning = true;
  try {
    const pending = await chrome.runtime.sendMessage({ type: 'WEBCLIP_JOURNAL_IMPORT_PENDING' });
    requireOk(pending);
    if (!pending.pending) return;
    showLastOperationId(pending.operationId);
    if (!pending.available) {
      const seconds = Math.max(1, Math.ceil(Number(pending.retryAfterMs || 0) / 1000));
      setStatus(`Незавершённый импорт пока принадлежит другой странице Журнала. Повторная проверка через ${seconds} с. · operationId: ${pending.operationId}`, '');
      scheduleJournalImportRecoveryRetry(Number(pending.retryAfterMs || 0) + 250);
      return;
    }
    await recoverPendingJournalImport(pending);
  } finally {
    journalImportRecoveryRunning = false;
  }
}

async function recoverPendingJournalImport(pending) {
  if (!beginJournalDestructiveOperation('Возобновление незавершённого импорта')) return;
  let stagingKey = String(pending.stagingKey || '');
  let importLease = null;
  try {
    const sourceLabel = pending.source === 'yandex' ? 'резервной копии Яндекс Диска' : 'локального файла';
    const resume = await requestDangerousConfirmation({
      title: 'Незавершённый импорт журнала',
      text: `После перезапуска найден проверенный staged import из ${sourceLabel}.
Записей: ${pending.entryCount}.
Дата экспорта: ${pending.exportedAt || 'не указана'}.
SHA-256 прежней проверки: ${pending.contentSha256}.
Введите код, чтобы явно возобновить и заново проверить backup. Кнопка «Отмена» удалит только временный staged import; текущий журнал не изменится.`
    });
    if (!resume) {
      const canceled = await chrome.runtime.sendMessage({
        type: 'WEBCLIP_JOURNAL_IMPORT_CANCEL_PENDING',
        checkpointToken: pending.checkpointToken
      });
      requireOk(canceled);
      stagingKey = '';
      setStatus(`Незавершённый staged import удалён. Текущий журнал не изменён. · operationId: ${pending.operationId}`, '');
      return;
    }

    const preview = await chrome.runtime.sendMessage({
      type: 'WEBCLIP_JOURNAL_IMPORT_RESUME_PENDING',
      checkpointToken: pending.checkpointToken,
      ownerSessionId: journalImportOwnerSessionId
    });
    requireOk(preview);
    const previewReceipt = requireJournalImportPreviewReceipt(preview);
    importLease = requireJournalImportLease(preview);
    startJournalImportLeaseHeartbeat(importLease);
    stagingKey = String(preview.stagingKey || stagingKey);
    showLastOperationId(preview.operationId);

    const confirmed = await requestDangerousConfirmation({
      title: 'Подтвердите восстановление журнала',
      text: journalImportReplaceConfirmationText(preview, sourceLabel)
    });
    if (!confirmed) {
      await discardStagedJournalImport(stagingKey, importLease);
      stagingKey = '';
      setStatus(`Возобновлённый импорт отменён. Текущий журнал не изменён. · operationId: ${preview.operationId}`, '');
      return;
    }

    assertJournalImportLeaseUsable(importLease);
    const imported = await chrome.runtime.sendMessage({
      type: 'WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED',
      stagingKey,
      operationId: preview.operationId,
      source: preview.source,
      previewReceipt,
      leaseToken: importLease.leaseToken,
      ownerSessionId: journalImportOwnerSessionId
    });
    requireOk(imported);
    stagingKey = '';
    setStatus(`Незавершённый импорт возобновлён после повторной проверки. Импортировано записей: ${imported.importedCount}. · operationId: ${imported.operationId || preview.operationId}`, 'ok');
    await loadJournal();
  } catch (error) {
    const mayDiscard = importLease && !journalImportLeaseLostError;
    if (stagingKey && mayDiscard) {
      await discardStagedJournalImport(stagingKey, importLease).catch(() => {});
    }
    setStatus(`Ошибка возобновления импорта: ${error?.message || String(error)}`, 'error');
  } finally {
    stopJournalImportLeaseHeartbeat();
    endJournalDestructiveOperation();
  }
}

Promise.all([resolveSourceContext(), loadJournalViewPreferences()])
  .then(() => loadJournal({ preserveScroll: false, clearStatus: true }))
  .then(() => checkForPendingJournalImport())
  .then(async () => {
    if (!autoBackupRequested && !autoExportFileRequested) return;
    const cleanUrl = new URL(location.href);
    cleanUrl.searchParams.delete('autoBackup');
    cleanUrl.searchParams.delete('autoExportFile');
    history.replaceState(null, '', cleanUrl.toString());
    if (autoExportFileRequested) await exportJournalToFile();
    if (autoBackupRequested) await exportJournalToYandex();
  })
  .catch((error) => {
    setStatus(error?.message || String(error), 'error');
  });