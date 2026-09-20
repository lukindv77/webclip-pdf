importScripts('public-suffix.js', 'journal-import-stream.js', 'journal-text-filter.js', 'local-download-identity.js');
importScripts('journal-import-digest.js');

// P0-073 authority for durable remote-save recovery. A checkpoint may be
// interpreted only inside the exact Yandex account/root namespace it bound.
globalThis.WebClipYandexRecoveryNamespace = (() => {
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

  function normalizePath(value) {
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
    const normalizedPath = normalizePath(path);
    const normalizedRoot = normalizePath(root);
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
    const rootPath = normalizePath(data.rootPath);
    const remotePath = normalizePath(data.remotePath);
    if (!accountUid) fail('WEBCLIP_REMOTE_RECOVERY_ACCOUNT_UNKNOWN', 'Recovery-checkpoint не содержит привязку к аккаунту Яндекс Диска.');
    if (!rootPath) fail('WEBCLIP_REMOTE_RECOVERY_ROOT_UNKNOWN', 'Recovery-checkpoint не содержит привязку к корневому каталогу Яндекс Диска.');
    if (!remotePath || !isPathWithinRoot(remotePath, rootPath)) {
      fail('WEBCLIP_REMOTE_RECOVERY_PATH_OUTSIDE_ROOT', 'Путь recovery-checkpoint находится вне привязанного корневого каталога Яндекс Диска.');
    }
    return Object.freeze({ accountUid, rootPath, remotePath });
  }

  function proveRecoveryNamespace({ receipt, currentAccountUid } = {}) {
    const binding = validateBoundRecoveryReceipt(receipt);
    const current = normalizeAccountUid(currentAccountUid);
    if (!current) fail('WEBCLIP_REMOTE_RECOVERY_AUTH_REQUIRED', 'Не удалось доказать текущий аккаунт Яндекс Диска для recovery-checkpoint.');
    if (current !== binding.accountUid) {
      fail('WEBCLIP_REMOTE_RECOVERY_ACCOUNT_MISMATCH', 'Текущий аккаунт Яндекс Диска не совпадает с аккаунтом recovery-checkpoint.');
    }
    return binding;
  }

  return Object.freeze({
    normalizeAccountUid,
    normalizePath,
    isPathWithinRoot,
    validateBoundRecoveryReceipt,
    proveRecoveryNamespace
  });
})();

// P0-074 bounded live-operation authority. Secrets remain memory-only while
// every request in the covered recovery operation uses the same captured
// token/account/root/publication-policy snapshot.
globalThis.WebClipYandexOperationContext = (() => {
  const MAX_ACCESS_TOKEN_CHARS = 16 * 1024;
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

  function normalizePath(value) {
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

  function validateOperationContext(value) {
    const accessToken = String(value?.accessToken || '').trim();
    const accountUid = normalizeAccountUid(value?.accountUid);
    const rootPath = normalizePath(value?.rootPath);
    const capturedAt = Number(value?.capturedAt || 0);
    const createPublicLinks = value?.createPublicLinks;
    if (!accessToken || accessToken.length > MAX_ACCESS_TOKEN_CHARS) {
      fail('YANDEX_OPERATION_CONTEXT_TOKEN_INVALID', 'Контекст операции не содержит допустимый OAuth-токен Яндекс Диска.');
    }
    if (!accountUid) {
      fail('YANDEX_OPERATION_CONTEXT_ACCOUNT_UNKNOWN', 'Контекст операции не содержит идентификатор аккаунта Яндекс Диска.');
    }
    if (!rootPath) {
      fail('YANDEX_OPERATION_CONTEXT_ROOT_UNKNOWN', 'Контекст операции не содержит корневой каталог Яндекс Диска.');
    }
    if (!Number.isFinite(capturedAt) || capturedAt <= 0) {
      fail('YANDEX_OPERATION_CONTEXT_CAPTURE_INVALID', 'Контекст операции не содержит допустимое время фиксации.');
    }
    if (typeof createPublicLinks !== 'boolean') {
      fail('YANDEX_OPERATION_CONTEXT_PUBLICATION_INVALID', 'Контекст операции не содержит явную настройку публикации.');
    }
    return Object.freeze({
      accessToken,
      accountUid,
      rootPath,
      createPublicLinks,
      capturedAt
    });
  }

  function proveRecoveryContext({ context, binding, requiresPublication = false } = {}) {
    const proven = validateOperationContext(context);
    const boundAccountUid = normalizeAccountUid(binding?.accountUid);
    const boundRootPath = normalizePath(binding?.rootPath);
    if (!boundAccountUid || proven.accountUid !== boundAccountUid) {
      fail('YANDEX_OPERATION_CONTEXT_ACCOUNT_MISMATCH', 'Контекст операции не совпадает с аккаунтом recovery-checkpoint.');
    }
    if (!boundRootPath || proven.rootPath !== boundRootPath) {
      fail('YANDEX_OPERATION_CONTEXT_ROOT_MISMATCH', 'Контекст операции не совпадает с корневым каталогом recovery-checkpoint.');
    }
    if (requiresPublication && !proven.createPublicLinks) {
      fail('YANDEX_OPERATION_CONTEXT_PUBLICATION_DISABLED', 'Публикация запрещена зафиксированными настройками операции.');
    }
    return proven;
  }

  return Object.freeze({
    validateOperationContext,
    proveRecoveryContext
  });
})();

// P0-022 destructive remote-object authority. Journal locators can guide a
// bounded lookup, but only current private Yandex metadata observed inside one
// immutable operation context can authorize a physical mutation.
globalThis.WebClipYandexRemoteIdentityAuthority = (() => {
  const AUTHORITY = 'yandex-api-observed-resource';
  const PROVIDER_VERIFIED = 'provider-verified';
  const IMPORTED_UNVERIFIED = 'imported-unverified';
  const LEGACY_UNVERIFIED = 'legacy-unverified';
  const MAX_OPERATION_ID_CHARS = 180;
  const MAX_RESOURCE_ID_CHARS = 1024;
  const MAX_PUBLIC_URL_CHARS = 8192;

  function fail(code, message) {
    const error = new Error(message);
    error.code = code;
    throw error;
  }

  function normalizeProvenance(value, { imported = false } = {}) {
    if (imported) return IMPORTED_UNVERIFIED;
    if (value === PROVIDER_VERIFIED) return PROVIDER_VERIFIED;
    return value === IMPORTED_UNVERIFIED ? IMPORTED_UNVERIFIED : LEGACY_UNVERIFIED;
  }

  function normalizeResourceId(value) {
    return String(value || '').trim().slice(0, MAX_RESOURCE_ID_CHARS);
  }

  function normalizePublicUrl(value) {
    return String(value || '').trim().slice(0, MAX_PUBLIC_URL_CHARS);
  }

  function createObservedReceipt({ entry = {}, metadata = {}, operationContext, operationId = '', observedAt = Date.now() } = {}) {
    const context = WebClipYandexOperationContext.validateOperationContext(operationContext);
    const type = String(metadata?.type || '').trim();
    const resourceId = normalizeResourceId(metadata?.resource_id);
    const path = WebClipYandexRecoveryNamespace.normalizePath(metadata?.path);
    const publicUrl = normalizePublicUrl(metadata?.public_url);
    const provenance = normalizeProvenance(entry?.remoteIdentityProvenance);
    const entryAccountUid = String(entry?.accountUid || '').trim();
    const entryRootPath = WebClipYandexRecoveryNamespace.normalizePath(entry?.rootPath);
    const entryResourceId = normalizeResourceId(entry?.resourceId);
    const entryPublicUrl = normalizePublicUrl(entry?.publicUrl);

    if (type !== 'file') fail('WEBCLIP_REMOTE_IDENTITY_FILE_REQUIRED', 'Яндекс Диск не подтвердил тип удалённого объекта как файл.');
    if (!resourceId) fail('WEBCLIP_REMOTE_IDENTITY_RESOURCE_REQUIRED', 'Яндекс Диск не вернул exact resource_id удалённого файла.');
    if (!path || !WebClipYandexRecoveryNamespace.isPathWithinRoot(path, context.rootPath)) {
      fail('WEBCLIP_REMOTE_IDENTITY_PATH_OUTSIDE_ROOT', 'Наблюдаемый удалённый файл находится вне зафиксированного корневого каталога.');
    }
    if (!Number.isFinite(Number(observedAt)) || Number(observedAt) <= 0) {
      fail('WEBCLIP_REMOTE_IDENTITY_OBSERVATION_INVALID', 'Наблюдение удалённого объекта не имеет допустимого времени.');
    }
    if (entryAccountUid && entryAccountUid !== context.accountUid) {
      fail('WEBCLIP_REMOTE_IDENTITY_ENTRY_ACCOUNT_CONFLICT', 'Аккаунт записи журнала конфликтует с зафиксированным контекстом операции.');
    }
    if (entryRootPath && entryRootPath !== context.rootPath) {
      fail('WEBCLIP_REMOTE_IDENTITY_ENTRY_ROOT_CONFLICT', 'Корневой каталог записи журнала конфликтует с зафиксированным контекстом операции.');
    }
    if (provenance === PROVIDER_VERIFIED) {
      if (!entryResourceId || entryResourceId !== resourceId) {
        fail('WEBCLIP_REMOTE_IDENTITY_VERIFIED_RESOURCE_CONFLICT', 'Provider-verified resource_id записи конфликтует с текущим объектом Яндекс Диска.');
      }
      if (entryPublicUrl && publicUrl && entryPublicUrl !== publicUrl) {
        fail('WEBCLIP_REMOTE_IDENTITY_VERIFIED_PUBLIC_CONFLICT', 'Provider-verified public_url записи конфликтует с текущим объектом Яндекс Диска.');
      }
    }

    return Object.freeze({
      authority: AUTHORITY,
      operationId: String(operationId || '').slice(0, MAX_OPERATION_ID_CHARS),
      accountUid: context.accountUid,
      rootPath: context.rootPath,
      resourceId,
      path,
      publicUrl,
      observedAt: Number(observedAt),
      contextCapturedAt: context.capturedAt,
      sourceProvenance: provenance
    });
  }

  function assertDestructiveCommand({ receipt, operationContext, sourcePath = '', metadata = {} } = {}) {
    const context = WebClipYandexOperationContext.validateOperationContext(operationContext);
    if (!receipt || receipt.authority !== AUTHORITY) {
      fail('WEBCLIP_REMOTE_IDENTITY_RECEIPT_REQUIRED', 'Destructive-команда требует current provider-observed remote identity receipt.');
    }
    const receiptPath = WebClipYandexRecoveryNamespace.normalizePath(receipt.path);
    const commandPath = WebClipYandexRecoveryNamespace.normalizePath(sourcePath);
    const observedPath = WebClipYandexRecoveryNamespace.normalizePath(metadata?.path);
    const observedResourceId = normalizeResourceId(metadata?.resource_id);
    if (receipt.accountUid !== context.accountUid || receipt.rootPath !== context.rootPath || receipt.contextCapturedAt !== context.capturedAt) {
      fail('WEBCLIP_REMOTE_IDENTITY_CONTEXT_RETARGET', 'Remote identity receipt не принадлежит текущему immutable-контексту операции.');
    }
    if (!commandPath || commandPath !== receiptPath) {
      fail('WEBCLIP_REMOTE_IDENTITY_PATH_RETARGET', 'Destructive-команда попыталась изменить target после provider observation.');
    }
    if (String(metadata?.type || '') !== 'file' || observedPath !== receiptPath || observedResourceId !== receipt.resourceId) {
      fail('WEBCLIP_REMOTE_IDENTITY_REVALIDATION_CONFLICT', 'Удалённый объект изменился после provider observation; destructive admission запрещён.');
    }
    return receipt;
  }

  return Object.freeze({
    AUTHORITY,
    PROVIDER_VERIFIED,
    IMPORTED_UNVERIFIED,
    LEGACY_UNVERIFIED,
    normalizeProvenance,
    createObservedReceipt,
    assertDestructiveCommand
  });
})();

const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';
const YANDEX_API_BASE = 'https://cloud-api.yandex.net/v1/disk';
const YANDEX_OAUTH_AUTHORIZE = 'https://oauth.yandex.ru/authorize';
const YANDEX_OAUTH_TOKEN = 'https://oauth.yandex.ru/token';
const YANDEX_FIXED_REDIRECT_URI = 'https://oauth.yandex.ru/verification_code';
const YANDEX_OAUTH_CODE_TTL_MS = 10 * 60 * 1000;
const MAX_YANDEX_CLIENT_ID_CHARS = 512;
const MAX_YANDEX_VERIFICATION_CODE_CHARS = 4096;
const MAX_YANDEX_ACCESS_TOKEN_CHARS = 16 * 1024;
const MAX_YANDEX_PUBLIC_URL_CHARS = 8192;
const MAX_YANDEX_SIGNED_URL_CHARS = 32 * 1024;
const MAX_YANDEX_ACCOUNT_FIELD_CHARS = 1024;
const MAX_YANDEX_SCOPE_CHARS = 4096;
const MAX_YANDEX_EXTERNAL_ERROR_CHARS = 2000;
const MAX_YANDEX_RESOURCE_ID_CHARS = 1024;
const MAX_YANDEX_ITEM_NAME_CHARS = 1024;
const MAX_YANDEX_ITEM_PATH_CHARS = 4096;
const MAX_YANDEX_ITEM_TYPE_CHARS = 32;
const MAX_YANDEX_ITEM_MODIFIED_CHARS = 128;
const MAX_YANDEX_ITEM_MIME_CHARS = 512;
const YANDEX_AUTH_KEY = 'yandexAuth';
const YANDEX_AUTH_STORAGE_TIMEOUT_MS = 10_000;
const YANDEX_CONFIG_STORAGE_TIMEOUT_MS = 10_000;
const YANDEX_AUTH_STORAGE_SESSION = 'session';
const YANDEX_SCOPES = ['cloud_api:disk.read', 'cloud_api:disk.write', 'cloud_api:disk.info'];
const PDF_CACHE_DB_NAME = 'WebClipPdfRetryCache';
const PDF_CACHE_STORE = 'pdfs';
const PDF_CACHE_META_STORE = 'meta';
const PDF_CACHE_RETRY_INDEX_STORE = 'retryIndex';
const PDF_CACHE_DB_VERSION = 4;
const PDF_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_PDF_BASE64_CHARS = 64 * 1024 * 1024; // legacy cache compatibility only
const MAX_PDF_BYTES = 48 * 1024 * 1024;
const PDF_STREAM_READ_CHUNK_BYTES = 1024 * 1024;
const MAX_CONTENT_JOURNAL_TEMPLATE_ENTRIES = 25;
const MAX_CONTENT_JOURNAL_TEMPLATE_RESPONSE_CHARS = 8 * 1024 * 1024;
const TRANSFER_DB_NAME = 'WebClipOffscreenTransfers';
const TRANSFER_STORE = 'payloads';
const TRANSFER_DB_VERSION = 1;
const TRANSFER_PAYLOAD_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_TRANSFER_TEXT_CHARS = 64 * 1024 * 1024;
const MAX_TRANSFER_BYTES = 64 * 1024 * 1024;
const MAX_JOURNAL_EXPORT_TEXT_CHARS = 50 * 1024 * 1024;
const MAX_JOURNAL_EXPORT_BYTES = 64 * 1024 * 1024;
const JOURNAL_EXPORT_BUILD_TIMEOUT_MS = 5 * 60 * 1000;
const JOURNAL_EXPORT_BATCH_TIMEOUT_MS = 20 * 1000;
const JOURNAL_EXPORT_BATCH_MEMORY_CHARS = 4 * 1024 * 1024;
const TRANSFER_TEXT_CHUNK_CHARS = 1024 * 1024;
const DEBUGGER_COMMAND_TIMEOUT_MS = 60 * 1000;
const JOURNAL_DB_NAME = 'WebClipJournal';
const JOURNAL_STORE = 'entries';
const JOURNAL_DB_VERSION = 8;
const JOURNAL_VIEW_QUERY_DEADLINE_MS = 20 * 1000;
const MAX_DOMAIN_FILTER_BASES = 500;
const MAX_DOMAIN_FILTER_CHILDREN = 1500;
const JOURNAL_CONTEXT_PREFIX = 'webclipJournalContext:';
const JOURNAL_CONTEXT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_JOURNAL_SESSION_CONTEXTS = 512;
const MAX_JOURNAL_CONTEXT_URL_CHARS = 8192;
const MAX_JOURNAL_CONTEXT_ID_CHARS = 180;
const JOURNAL_CONTEXT_REMOVE_BATCH = 128;
const JOURNAL_STATS_STORE = 'urlStats';
const JOURNAL_META_STORE = 'meta';
const JOURNAL_PENDING_STORE = 'pendingAppends';
const JOURNAL_PENDING_DOWNLOAD_STORE = 'pendingDownloads';
const JOURNAL_PENDING_REMOTE_STORE = 'pendingRemoteSaves';
const JOURNAL_PENDING_DESTRUCTIVE_STORE = 'pendingDestructiveMoves';
const JOURNAL_IMPORT_STAGING_STORE = 'importStaging';
const JOURNAL_META_REVISION_KEY = 'revision';
const JOURNAL_RESET_GENERATION_KEY = 'resetGeneration';
const JOURNAL_INITIAL_RESET_GENERATION = 1;
const JOURNAL_INITIAL_ENTRY_REVISION = 1;
const JOURNAL_EXPORT_SCHEMA = 'webclip-journal';
const JOURNAL_EXPORT_VERSION = 1;
const JOURNAL_STATS_DIRTY_KEY = 'webclipJournalStatsDirty';
const JOURNAL_PENDING_APPENDS_KEY = 'webclipPendingJournalAppends';
const MAX_PENDING_JOURNAL_APPENDS = 20;
const MAX_PENDING_JOURNAL_APPEND_JSON_CHARS = 320 * 1024;
const MAX_PENDING_JOURNAL_QUEUE_JSON_CHARS = 4 * 1024 * 1024;
const MAX_PENDING_LOCAL_DOWNLOADS = 100;
const PENDING_LOCAL_RECONCILE_BATCH = 12;
const PENDING_LOCAL_DOWNLOAD_TTL_MS = 24 * 60 * 60 * 1000;
const PENDING_LOCAL_UNKNOWN_KIND = 'unknown';
const PENDING_LOCAL_UNKNOWN_REASON_MAX_CHARS = 1000;
const MAX_PENDING_REMOTE_SAVES = 20;
const PENDING_REMOTE_STALE_AFTER_MS = 24 * 60 * 60 * 1000;
const PENDING_REMOTE_STALE_MIN_ATTEMPTS = 6;
const PENDING_REMOTE_STALE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_PENDING_REMOTE_STALE_SAVES = 100;
const MAX_PENDING_DESTRUCTIVE_MOVES = 100;
const PENDING_DESTRUCTIVE_RECONCILE_BATCH = 12;
const PENDING_DESTRUCTIVE_MANUAL_LIST_MAX = 50;
const PUBLICATION_REVOKE_COMPLETION_CLEAR = 'clear-public-url';
const PUBLICATION_REVOKE_COMPLETION_DELETE_KEEP = 'delete-journal-keep-file';
const PUBLICATION_REVOKE_COMPLETION_DELETE_TRASH = 'delete-journal-trash-file';
const PUBLICATION_REVOKE_TRASH_KIND = 'publication-revoke-trash';
const MAX_IMPORTED_URL_CHARS = 8192;
const MAX_IMPORTED_PATH_CHARS = 4096;
const MAX_IMPORTED_COMMENT_CHARS = 100000;
const MAX_IMPORTED_COMMENTS_PER_ENTRY = 500;
const MAX_JOURNAL_COMMENTS_TOTAL_CHARS = 2 * 1024 * 1024;
const MAX_SELECTION_SNAPSHOT_JSON_CHARS = 2 * 1024 * 1024;
const MAX_IMPORTED_ENTRY_ID_CHARS = 180;
const MAX_IMPORTED_COMMENT_ID_CHARS = 180;
const MAX_IMPORTED_DATETIME_CHARS = 128;
const MAX_JOURNAL_IMPORT_BYTES = 50 * 1024 * 1024;
const MAX_JOURNAL_IMPORT_ENTRY_CHARS = 8 * 1024 * 1024;
const JOURNAL_IMPORT_PARSE_TIMEOUT_MS = 5 * 60 * 1000;
const JOURNAL_IMPORT_STAGING_TTL_MS = 2 * 60 * 60 * 1000;
const JOURNAL_IMPORT_STAGE_BATCH_ENTRIES = 100;
const JOURNAL_IMPORT_PREVIEW_RECEIPT_VERSION = 1;
const JOURNAL_IMPORT_LEASE_VERSION = 1;
const JOURNAL_IMPORT_LEASE_KEY = 'journalImportLease';
const JOURNAL_IMPORT_LEASE_TTL_MS = 2 * 60 * 1000;
const JOURNAL_IMPORT_CHECKPOINT_TTL_MS = JOURNAL_IMPORT_STAGING_TTL_MS;
const MAX_INLINE_JOURNAL_IMPORT_JSON_CHARS = 1024 * 1024;
const JOURNAL_BACKUP_ALARM = 'webclip-journal-backup';
const JOURNAL_BACKUP_RETRY_ALARM = `${JOURNAL_BACKUP_ALARM}-retry`;
const JOURNAL_BACKUP_LEASE_KEY = 'webclipJournalBackupLease';
const JOURNAL_BACKUP_PENDING_KEY = 'webclipJournalBackupPendingUpload';
const JOURNAL_BACKUP_LEASE_TTL_MS = 10 * 60 * 1000;
const JOURNAL_BACKUP_PREPARED_404_GRACE_MS = 15 * 60 * 1000;
const JOURNAL_BACKUP_PREPARED_404_MIN_ATTEMPTS = 3;
const DEFAULT_JOURNAL_BACKUP_INTERVAL_MINUTES = 24 * 60;
const DEFAULT_JOURNAL_BACKUP_RETRY_MINUTES = 60;
const MIN_BACKGROUND_INTERVAL_MINUTES = 1;
const YANDEX_UPLOAD_DIR = 'Upload';
const YANDEX_READ_LATER_DIR = 'ReadmeLater';
const YANDEX_BACKUP_DIR = 'Backup';
const YANDEX_JOURNAL_DIR = 'Journal';
const YANDEX_TRASH_DIR = 'Trash';
const JOURNAL_YANDEX_BACKUP_PREFIX = 'WebClip_Journal_';
const CONTEXT_MENU_ROOT = 'webclipper-root';
const CONTEXT_MENU_QUICK_START = 'webclipper-quick-start';
const OPERATION_LOG_DB_NAME = 'WebClipOperationLogs';
const OPERATION_LOG_STORE = 'operations';
const OPERATION_LOG_EVENT_STORE = 'events';
const OPERATION_LOG_DB_VERSION = 2;
const OPERATION_LOG_SETTINGS_KEY = 'operationLogSettings';
const USER_SETTINGS_SCHEMA = 'webclip-user-settings';
const USER_SETTINGS_VERSION = 1;
const USER_SETTINGS_MAX_JSON_CHARS = 256 * 1024;
const USER_SETTINGS_JOURNAL_GROUP_KEY = 'webclipJournalGroupByUrl';
const USER_SETTINGS_IMPORT_MARKER_KEY = 'webclipUserSettingsImportPending';
const OPERATION_LOG_CLEANUP_ALARM = 'webclip-operation-log-cleanup';
const DEFAULT_OPERATION_LOG_RETENTION_HOURS = 24;
const MAX_OPERATION_LOG_RETENTION_HOURS = 24 * 365;
const MAX_OPERATION_LOG_EVENTS = 2500;
const MAX_OPERATION_LOG_EVENT_JSON_CHARS = 64 * 1024;
const MAX_OPERATION_LOG_META_JSON_CHARS = 256 * 1024;
const MAX_OPERATION_LOG_RECORD_JSON_CHARS = 4 * 1024 * 1024;
const MAX_OPERATION_LOG_EVENT_TOTAL_JSON_CHARS = 3 * 1024 * 1024;
const MAX_OPERATION_LOG_TOTAL_JSON_CHARS = 64 * 1024 * 1024;
const STORAGE_SAFETY_RESERVE_BYTES = 32 * 1024 * 1024;
const LOCAL_BLOB_DOWNLOAD_DEADLINE_MS = 15 * 60 * 1000;
const AUTOMATIC_DOWNLOAD_START_TIMEOUT_MS = 15_000;
const MAX_PENDING_AUTOMATIC_DOWNLOAD_STARTS = 4;
const STORAGE_ACCESS_LEVEL_TIMEOUT_MS = 10_000;
const DOWNLOADS_SEARCH_TIMEOUT_MS = 5_000;
const STORAGE_ESTIMATE_TIMEOUT_MS = 5_000;
const CHROME_STORAGE_OPERATION_TIMEOUT_MS = 10_000;
const PREPARED_SAVE_AS_CHECKPOINT_TIMEOUT_MS = 10_000;
const PREPARED_SAVE_AS_INDEX_KEY = 'webclipPreparedSaveAsIndex';
const PREPARED_SAVE_AS_CHECKPOINT_PREFIX = 'webclipPreparedSaveAs:';
const MAX_PREPARED_SAVE_AS_CHECKPOINTS = 64;
const CHROME_ALARM_OPERATION_TIMEOUT_MS = 10_000;
const MAINTENANCE_IDB_TX_TIMEOUT_MS = 20_000;
const OPERATION_LOG_CRUD_IDB_TX_TIMEOUT_MS = 20_000;
const PDF_CACHE_CRUD_IDB_TX_TIMEOUT_MS = 20_000;
const JOURNAL_CRUD_IDB_TX_TIMEOUT_MS = 20_000;
const RECOVERY_IDB_TX_TIMEOUT_MS = 20_000;
const JOURNAL_BACKUP_LEASE_TX_TIMEOUT_MS = 20_000;
const operationLogWriteChains = new Map();
const chromeStorageMutationSettlementChains = new Map();
let preparedSaveAsCheckpointMutationSettlement = Promise.resolve();
const chromeAlarmMutationSettlementChains = new Map();
const automaticDownloadStartSettlements = new Map();
let userSettingsImportStorageSettlement = Promise.resolve();
const FRAME_AGENT_COMMAND_TIMEOUT_MS = 5_000;
const FRAME_AGENT_MAX_PER_TAB = 64;
const SCRIPT_EXECUTION_TIMEOUT_MS = 10_000;
const SCRIPT_EXECUTION_LATE_SUCCESS_TTL_MS = 60_000;
const TAB_GET_TIMEOUT_MS = 5_000;
const TAB_CREATE_TIMEOUT_MS = 10_000;
const TAB_CREATE_LATE_SUCCESS_TTL_MS = 60_000;
const ACTION_OPERATION_TIMEOUT_MS = 5_000;
const MAX_PENDING_ACTION_ACTUAL_SETTLEMENTS = 64;
const frameAgentsByTab = new Map();
const scriptExecutionSettlements = new Map();
const tabCreateSettlements = new Map();
const actionUpdateGenerationByTab = new Map();
const actionPendingActualSettlements = new Set();
const actionRepairScheduledTabs = new Set();
const activeDestructiveMoveReceipts = new Set();

function makeActionPendingLimitError() {
  const error = new Error('Слишком много незавершённых Chrome Action операций WebClip.');
  error.code = 'WEBCLIP_ACTION_PENDING_LIMIT';
  return error;
}

function beginActionUpdateGeneration(tabId) {
  const id = Number(tabId || 0);
  const next = (Number(actionUpdateGenerationByTab.get(id) || 0) + 1) >>> 0;
  const generation = next || 1;
  actionUpdateGenerationByTab.set(id, generation);
  return generation;
}

function isActionUpdateGenerationCurrent(tabId, generation) {
  return Number(actionUpdateGenerationByTab.get(Number(tabId || 0)) || 0) === Number(generation || 0);
}

function scheduleActionRepairForTab(tabId) {
  const id = Number(tabId || 0);
  if (!id || !actionUpdateGenerationByTab.has(id) || actionRepairScheduledTabs.has(id)) return;
  actionRepairScheduledTabs.add(id);
  void Promise.resolve().then(() => {
    actionRepairScheduledTabs.delete(id);
    if (!actionUpdateGenerationByTab.has(id)) return;
    return updateActionForTab(id).catch(() => {});
  }).catch(() => {
    actionRepairScheduledTabs.delete(id);
  });
}

async function runChromeActionMutationBounded(tabId, generation, start, label) {
  if (!isActionUpdateGenerationCurrent(tabId, generation)) return { stale: true };
  if (actionPendingActualSettlements.size >= MAX_PENDING_ACTION_ACTUAL_SETTLEMENTS) {
    throw makeActionPendingLimitError();
  }

  let callerTimedOut = false;
  const actual = Promise.resolve().then(start);
  actionPendingActualSettlements.add(actual);
  void actual.finally(() => {
    actionPendingActualSettlements.delete(actual);
    void Promise.resolve().then(() => {
      if (callerTimedOut || !isActionUpdateGenerationCurrent(tabId, generation)) {
        scheduleActionRepairForTab(tabId);
      }
    });
  }).catch(() => {});

  try {
    await withOperationTimeout(actual, ACTION_OPERATION_TIMEOUT_MS, label);
  } catch (error) {
    if (error?.code === 'WEBCLIP_TIMEOUT') callerTimedOut = true;
    throw error;
  }
  return { stale: !isActionUpdateGenerationCurrent(tabId, generation) };
}

async function applyChromeActionMutationBestEffort(tabId, generation, start, label) {
  try {
    const result = await runChromeActionMutationBounded(tabId, generation, start, label);
    return result?.stale !== true && isActionUpdateGenerationCurrent(tabId, generation);
  } catch (error) {
    if (error?.code === 'WEBCLIP_TIMEOUT' || error?.code === 'WEBCLIP_ACTION_PENDING_LIMIT') throw error;
    return isActionUpdateGenerationCurrent(tabId, generation);
  }
}

async function runSerializedLateSettlementOperation(chains, queueKey, start, label, timeoutMs) {
  const key = String(queueKey || label || 'operation');
  let releaseTurn = null;
  const turn = new Promise((resolve) => { releaseTurn = resolve; });
  const previous = chains.get(key) || Promise.resolve();
  chains.set(key, turn);
  void turn.finally(() => {
    if (chains.get(key) === turn) chains.delete(key);
  });

  try {
    await withOperationTimeout(previous, timeoutMs, `${label}: ожидание предыдущей операции`);
  } catch (error) {
    // Chrome Storage / alarms mutations are not cancellable. If an older
    // operation timed out locally, keep the queue barrier until its real
    // promise settles; never start a newer mutation that it could overtake.
    void previous.finally(() => releaseTurn()).catch(() => releaseTurn());
    throw error;
  }

  let actual;
  try { actual = Promise.resolve().then(start); }
  catch (error) { actual = Promise.reject(error); }
  void actual.finally(() => releaseTurn()).catch(() => releaseTurn());
  return withOperationTimeout(actual, timeoutMs, label);
}

function readChromeStorageBounded(start, label, timeoutMs = CHROME_STORAGE_OPERATION_TIMEOUT_MS) {
  return withOperationTimeout(Promise.resolve().then(start), timeoutMs, label);
}

function mutateChromeStorageSerialized(queueKey, start, label, timeoutMs = CHROME_STORAGE_OPERATION_TIMEOUT_MS) {
  return runSerializedLateSettlementOperation(chromeStorageMutationSettlementChains, queueKey, start, label, timeoutMs);
}

function normalizePreparedSaveAsSessionId(value) {
  const id = String(value || '').trim();
  if (!id || id.length > 180 || !/^[A-Za-z0-9._:-]+$/.test(id)) {
    const error = new Error('Некорректный идентификатор prepared Save As session.');
    error.code = 'WEBCLIP_PREPARED_SAVE_AS_SESSION_INVALID';
    throw error;
  }
  return id;
}

function makePreparedSaveAsSessionId() {
  const suffix = globalThis.crypto?.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return normalizePreparedSaveAsSessionId(`save-as-${suffix}`);
}

function preparedSaveAsCheckpointKey(sessionId, stage) {
  const id = normalizePreparedSaveAsSessionId(sessionId);
  const normalizedStage = stage === 'started' || stage === 'released' ? stage : 'prepared';
  return `${PREPARED_SAVE_AS_CHECKPOINT_PREFIX}${id}:${normalizedStage}`;
}

function sanitizePreparedSaveAsIndex(value) {
  const source = Array.isArray(value) ? value : [];
  const out = [];
  const seen = new Set();
  for (const item of source) {
    let id = '';
    try { id = normalizePreparedSaveAsSessionId(item); } catch (_) { continue; }
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_PREPARED_SAVE_AS_CHECKPOINTS) break;
  }
  return out;
}

function queuePreparedSaveAsCheckpointMutation(start, label) {
  // Unlike ordinary storage mutations, later checkpoint transitions
  // are queued behind the *actual* settlement even when a caller hits
  // its local deadline. This prevents STARTED/RELEASE from overtaking
  // a late PREPARED/STARTED write.
  const previous = preparedSaveAsCheckpointMutationSettlement;
  const actual = previous.catch(() => {}).then(() => Promise.resolve().then(start));
  const barrier = actual.then(() => undefined, () => undefined);
  preparedSaveAsCheckpointMutationSettlement = barrier;
  void barrier.finally(() => {
    if (preparedSaveAsCheckpointMutationSettlement === barrier) {
      preparedSaveAsCheckpointMutationSettlement = Promise.resolve();
    }
  }).catch(() => {});
  return withOperationTimeout(actual, PREPARED_SAVE_AS_CHECKPOINT_TIMEOUT_MS, label);
}

function preparedSaveAsCheckpointRecord({ sessionId, stage, blobUrl, filename = '', ownerPage = '', operationId = '', downloadId = null, reason = '' }) {
  const record = {
    sessionId: normalizePreparedSaveAsSessionId(sessionId),
    stage,
    blobUrl: normalizePreparedSaveAsBlobUrl(blobUrl),
    filename: String(filename || '').slice(0, 240),
    ownerPage: ownerPage === 'options.html' ? 'options.html' : 'journal.html',
    operationId: String(operationId || '').slice(0, 180),
    updatedAt: Date.now()
  };
  if (stage === 'prepared') record.createdAt = record.updatedAt;
  if (stage === 'started') record.downloadId = Math.max(0, Math.floor(Number(downloadId) || 0));
  if (stage === 'released') record.reason = String(reason || '').slice(0, 160);
  return record;
}

function createPreparedSaveAsCheckpoint(details) {
  const record = preparedSaveAsCheckpointRecord({ ...details, stage: 'prepared' });
  const sessionId = record.sessionId;
  const preparedKey = preparedSaveAsCheckpointKey(sessionId, 'prepared');
  return queuePreparedSaveAsCheckpointMutation(async () => {
    const stored = await readChromeStorageBounded(
      () => chrome.storage.session.get(PREPARED_SAVE_AS_INDEX_KEY),
      'Чтение индекса prepared Save As'
    );
    const index = sanitizePreparedSaveAsIndex(stored?.[PREPARED_SAVE_AS_INDEX_KEY]);
    if (!index.includes(sessionId) && index.length >= MAX_PREPARED_SAVE_AS_CHECKPOINTS) {
      const error = new Error('Слишком много незавершённых prepared Save As операций в текущей browser session.');
      error.code = 'WEBCLIP_PREPARED_SAVE_AS_LIMIT';
      throw error;
    }
    const nextIndex = [...index.filter((id) => id !== sessionId), sessionId];
    await chrome.storage.session.set({
      [PREPARED_SAVE_AS_INDEX_KEY]: nextIndex,
      [preparedKey]: record
    });
    return record;
  }, 'Фиксация prepared Save As checkpoint');
}

function markPreparedSaveAsStarted(details) {
  const record = preparedSaveAsCheckpointRecord({ ...details, stage: 'started' });
  const sessionId = record.sessionId;
  const preparedKey = preparedSaveAsCheckpointKey(sessionId, 'prepared');
  const startedKey = preparedSaveAsCheckpointKey(sessionId, 'started');
  const releasedKey = preparedSaveAsCheckpointKey(sessionId, 'released');
  return queuePreparedSaveAsCheckpointMutation(async () => {
    const stored = await readChromeStorageBounded(
      () => chrome.storage.session.get([preparedKey, releasedKey]),
      'Проверка prepared Save As перед STARTED'
    );
    if (stored?.[releasedKey]) return { ...record, skipped: true, released: true };
    if (!stored?.[preparedKey]) {
      const error = new Error('Durable prepared Save As checkpoint не найден.');
      error.code = 'WEBCLIP_PREPARED_SAVE_AS_CHECKPOINT_MISSING';
      throw error;
    }
    await chrome.storage.session.set({ [startedKey]: record });
    return record;
  }, 'Фиксация STARTED prepared Save As checkpoint');
}

function releasePreparedSaveAsCheckpoint(details) {
  const record = preparedSaveAsCheckpointRecord({ ...details, stage: 'released' });
  const sessionId = record.sessionId;
  const preparedKey = preparedSaveAsCheckpointKey(sessionId, 'prepared');
  const startedKey = preparedSaveAsCheckpointKey(sessionId, 'started');
  const releasedKey = preparedSaveAsCheckpointKey(sessionId, 'released');
  return queuePreparedSaveAsCheckpointMutation(async () => {
    const stored = await readChromeStorageBounded(
      () => chrome.storage.session.get(PREPARED_SAVE_AS_INDEX_KEY),
      'Чтение индекса перед RELEASE prepared Save As'
    );
    const nextIndex = sanitizePreparedSaveAsIndex(stored?.[PREPARED_SAVE_AS_INDEX_KEY])
      .filter((id) => id !== sessionId);
    // RELEASE is a distinct durable tombstone key. It cannot be
    // overwritten by a late PREPARED/STARTED write from another
    // worker generation because those transitions use distinct keys.
    await chrome.storage.session.set({
      [PREPARED_SAVE_AS_INDEX_KEY]: nextIndex,
      [releasedKey]: record
    });
    await chrome.storage.session.remove([preparedKey, startedKey]);
    await revokeBlobUrl(record.blobUrl);
    return record;
  }, 'Фиксация RELEASED prepared Save As checkpoint');
}
function getChromeAlarmBounded(name, label = 'Чтение alarm Chrome') {
  return withOperationTimeout(Promise.resolve().then(() => chrome.alarms.get(name)), CHROME_ALARM_OPERATION_TIMEOUT_MS, label);
}

function mutateChromeAlarmSerialized(name, start, label) {
  return runSerializedLateSettlementOperation(
    chromeAlarmMutationSettlementChains,
    `alarm:${String(name || '')}`,
    start,
    label,
    CHROME_ALARM_OPERATION_TIMEOUT_MS
  );
}


async function getExtensionStorageEstimate({ required = false } = {}) {
  const unavailable = (cause = null) => {
    if (!required) return null;
    const error = new Error('Chrome не подтвердил доступную квоту хранилища; WebClip не начинает крупную запись без обязательного quota preflight.');
    error.code = 'WEBCLIP_STORAGE_ESTIMATE_UNAVAILABLE';
    if (cause) error.cause = cause;
    throw error;
  };
  try {
    if (!globalThis.navigator?.storage?.estimate) return unavailable();
    const estimate = await withOperationTimeout(
      navigator.storage.estimate(),
      STORAGE_ESTIMATE_TIMEOUT_MS,
      'Оценка квоты хранилища Chrome'
    );
    const usage = Number(estimate?.usage);
    const quota = Number(estimate?.quota);
    if (!Number.isFinite(usage) || usage < 0 || !Number.isFinite(quota) || quota <= 0) return unavailable();
    return { usage, quota, free: Math.max(0, quota - usage) };
  } catch (error) {
    if (error?.code === 'WEBCLIP_STORAGE_ESTIMATE_UNAVAILABLE') throw error;
    return unavailable(error);
  }
}

async function getStorageHealth() {
  const estimate = await getExtensionStorageEstimate();
  let persisted = null;
  try {
    if (globalThis.navigator?.storage?.persisted) persisted = Boolean(await withOperationTimeout(navigator.storage.persisted(), STORAGE_ESTIMATE_TIMEOUT_MS, 'Проверка persisted storage Chrome'));
  } catch (_) {
    persisted = null;
  }
  const usage = Math.max(0, Number(estimate?.usage || 0));
  const quota = Math.max(0, Number(estimate?.quota || 0));
  const free = quota > 0 ? Math.max(0, quota - usage) : 0;
  return {
    ok: true,
    supported: Boolean(quota),
    usage,
    quota,
    free,
    usagePercent: quota > 0 ? Math.min(100, Math.max(0, (usage / quota) * 100)) : null,
    reserve: STORAGE_SAFETY_RESERVE_BYTES,
    persisted,
    persistenceStatusSupported: persisted !== null
  };
}

async function ensureStorageBudget(requiredBytes = 0, reason = 'операция') {
  const required = Math.max(0, Math.floor(Number(requiredBytes) || 0));
  let estimate = await getExtensionStorageEstimate({ required: true });
  const needed = required + STORAGE_SAFETY_RESERVE_BYTES;
  if (estimate.free >= needed) return { ok: true, supported: true, ...estimate, required, reserve: STORAGE_SAFETY_RESERVE_BYTES };

  // Functional journal data has priority. Reclaim only disposable/diagnostic
  // stores; never delete Journal entries automatically to satisfy quota.
  await cleanupTransferPayloads().catch(() => {});
  await cleanupExpiredPdfCache().catch(() => {});
  try {
    const settings = await getOperationLogSettings();
    await cleanupExpiredOperationLogs(settings.retentionHours);
  } catch (_) {}

  estimate = await getExtensionStorageEstimate({ required: true });
  if (estimate.free >= needed) {
    return { ok: true, supported: true, ...estimate, required, reserve: STORAGE_SAFETY_RESERVE_BYTES, cleanupAttempted: true };
  }
  const error = new Error(`Недостаточно свободного хранилища Chrome для ${reason}. Требуется примерно ${Math.ceil(required / 1024 / 1024)} МБ плюс безопасный резерв ${Math.ceil(STORAGE_SAFETY_RESERVE_BYTES / 1024 / 1024)} МБ. Временные данные уже очищены; рабочий журнал не удалялся.`);
  error.code = 'WEBCLIP_STORAGE_QUOTA_LOW';
  error.storage = { ...estimate, required, reserve: STORAGE_SAFETY_RESERVE_BYTES };
  throw error;
}

function withStartupSecurityDeadline(promise, timeoutMs, label) {
  let timer = null;
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error(`${label} не завершилось за ${Math.ceil(timeoutMs / 1000)} с.`);
        error.code = 'WEBCLIP_SECURITY_INIT_TIMEOUT';
        reject(error);
      }, timeoutMs);
    })
  ]).finally(() => { if (timer) clearTimeout(timer); });
}

async function configureStorageAccessLevels() {
  // Content scripts do not need direct access to WebClip storage. Keep tokens,
  // settings and revision markers available only to trusted extension contexts.
  // setAccessLevel is a security boundary: every call is bounded and failures
  // are retained by storageAccessInitialization so content-message handling and
  // future injection fail closed instead of racing the initialization.
  if (chrome.storage?.local?.setAccessLevel) {
    await withStartupSecurityDeadline(
      chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }),
      STORAGE_ACCESS_LEVEL_TIMEOUT_MS,
      'Ограничение доступа chrome.storage.local'
    );
  }
  if (chrome.storage?.session?.setAccessLevel) {
    await withStartupSecurityDeadline(
      chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }),
      STORAGE_ACCESS_LEVEL_TIMEOUT_MS,
      'Ограничение доступа chrome.storage.session'
    );
  }
}

const storageAccessInitialization = configureStorageAccessLevels();
void storageAccessInitialization.catch((error) => console.warn('WebClip storage access level:', error));

async function ensureStorageAccessInitialized() {
  try {
    await storageAccessInitialization;
  } catch (error) {
    const wrapped = new Error(`WebClip не может безопасно открыть доступ к storage: ${normalizeError(error)}`);
    wrapped.code = error?.code || 'WEBCLIP_STORAGE_ACCESS_INIT_FAILED';
    throw wrapped;
  }
}

function makeOperationLogId(prefix = 'op') {
  const raw = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${raw}`;
}

function normalizeOperationLogRetentionHours(value) {
  const hours = Math.round(Number(value));
  if (!Number.isFinite(hours) || hours < 1) return DEFAULT_OPERATION_LOG_RETENTION_HOURS;
  return Math.min(MAX_OPERATION_LOG_RETENTION_HOURS, hours);
}

async function getOperationLogSettings() {
  const stored = await readChromeStorageBounded(
    () => chrome.storage.local.get(OPERATION_LOG_SETTINGS_KEY),
    'Чтение настроек хранения OperationLog'
  );
  const retentionHours = normalizeOperationLogRetentionHours(stored?.[OPERATION_LOG_SETTINGS_KEY]?.retentionHours);
  return { ok: true, retentionHours };
}

async function saveOperationLogSettings(settings = {}) {
  await waitForUserSettingsImportStorageSettlement('Ожидание импорта настроек перед изменением OperationLog');
  const retentionHours = normalizeOperationLogRetentionHours(settings.retentionHours);
  await mutateChromeStorageSerialized(
    `storage.local:${OPERATION_LOG_SETTINGS_KEY}`,
    () => chrome.storage.local.set({ [OPERATION_LOG_SETTINGS_KEY]: { retentionHours } }),
    'Сохранение настроек хранения OperationLog'
  );
  await cleanupExpiredOperationLogs(retentionHours);
  return { ok: true, retentionHours };
}

function assertUserSettingsPlainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} должен быть объектом.`);
  }
  return value;
}

function assertUserSettingsExactKeys(object, allowed, label) {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(object)) {
    if (!allowedSet.has(key)) throw new Error(`${label}: неизвестное поле «${String(key).slice(0, 120)}».`);
  }
  for (const key of allowed) {
    if (!Object.prototype.hasOwnProperty.call(object, key)) throw new Error(`${label}: отсутствует обязательное поле «${key}».`);
  }
}

function assertUserSettingsBoolean(value, label) {
  if (typeof value !== 'boolean') throw new Error(`${label} должен быть true/false.`);
  return value;
}

function assertUserSettingsInteger(value, min, max, label) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${label}: требуется целое число от ${min} до ${max}.`);
  }
  return value;
}

function assertNoUserSettingsSecretKeys(value) {
  const forbidden = /^(?:access[_-]?token|refresh[_-]?token|token|authorization|client[_-]?secret|code[_-]?verifier|verification[_-]?code|yandexauth|yandexoauthpending)$/i;
  const queue = [{ value, depth: 0 }];
  let visited = 0;
  while (queue.length) {
    const current = queue.shift();
    if (++visited > 512) throw new Error('Файл настроек содержит слишком сложную структуру.');
    if (!current?.value || typeof current.value !== 'object') continue;
    if (current.depth > 8) throw new Error('Файл настроек содержит слишком глубокую структуру.');
    for (const [key, child] of Object.entries(current.value)) {
      if (forbidden.test(String(key || '').replace(/\s+/g, ''))) {
        const error = new Error(`Файл настроек содержит запрещённое секретное поле «${String(key).slice(0, 120)}».`);
        error.code = 'WEBCLIP_USER_SETTINGS_SECRET_FIELD';
        throw error;
      }
      if (child && typeof child === 'object') queue.push({ value: child, depth: current.depth + 1 });
    }
  }
}

function normalizeUserSettingsDocument(document) {
  let json;
  try { json = JSON.stringify(document); }
  catch (_) { throw new Error('Файл настроек содержит неподдерживаемую структуру.'); }
  if (!json || json.length > USER_SETTINGS_MAX_JSON_CHARS) {
    throw new Error(`Файл настроек превышает безопасный предел ${Math.floor(USER_SETTINGS_MAX_JSON_CHARS / 1024)} КБ.`);
  }
  assertNoUserSettingsSecretKeys(document);
  const root = assertUserSettingsPlainObject(document, 'Файл настроек');
  assertUserSettingsExactKeys(root, ['schema', 'version', 'exportedAt', 'extensionVersion', 'settings'], 'Файл настроек');
  if (root.schema !== USER_SETTINGS_SCHEMA || root.version !== USER_SETTINGS_VERSION) {
    throw new Error(`Неподдерживаемая схема настроек. Ожидается ${USER_SETTINGS_SCHEMA} v${USER_SETTINGS_VERSION}.`);
  }
  if (typeof root.exportedAt !== 'string' || root.exportedAt.length > 128) throw new Error('Некорректная дата экспорта настроек.');
  if (typeof root.extensionVersion !== 'string' || root.extensionVersion.length > 64) throw new Error('Некорректная версия расширения в файле настроек.');

  const settings = assertUserSettingsPlainObject(root.settings, 'settings');
  assertUserSettingsExactKeys(settings, ['yandex', 'journal', 'operationLog'], 'settings');

  const yandex = assertUserSettingsPlainObject(settings.yandex, 'settings.yandex');
  assertUserSettingsExactKeys(yandex, [
    'clientId',
    'rootPath',
    'createPublicLinks',
    'journalBackupEnabled',
    'journalBackupIntervalMinutes',
    'journalBackupRetryMinutes'
  ], 'settings.yandex');
  const clientId = String(yandex.clientId || '').trim();
  if (clientId.length > MAX_YANDEX_CLIENT_ID_CHARS) throw new Error('Client ID Яндекс OAuth в файле настроек слишком длинный.');
  const rootPathRaw = String(yandex.rootPath || '').trim();
  let rootPath = '';
  if (rootPathRaw) {
    rootPath = normalizeDiskPath(rootPathRaw);
    if (!rootPath || rootPath === '/') throw new Error('Корневая папка Яндекс Диска в файле настроек должна быть отдельной папкой, а не корнем Диска.');
    if (rootPath.length > 2048) throw new Error('Корневая папка Яндекс Диска в файле настроек слишком длинная.');
    if (rootPath.split('/').filter(Boolean).length > 32) throw new Error('Корневая папка Яндекс Диска в файле настроек содержит слишком много уровней вложенности.');
  }
  const journalBackupEnabled = assertUserSettingsBoolean(yandex.journalBackupEnabled, 'settings.yandex.journalBackupEnabled');
  if (journalBackupEnabled && !rootPath) throw new Error('Нельзя импортировать включённый backup без выбранной корневой папки Яндекс Диска.');

  const journal = assertUserSettingsPlainObject(settings.journal, 'settings.journal');
  assertUserSettingsExactKeys(journal, ['groupByUrl'], 'settings.journal');
  const operationLog = assertUserSettingsPlainObject(settings.operationLog, 'settings.operationLog');
  assertUserSettingsExactKeys(operationLog, ['retentionHours'], 'settings.operationLog');

  return {
    yandex: {
      clientId,
      rootPath,
      createPublicLinks: assertUserSettingsBoolean(yandex.createPublicLinks, 'settings.yandex.createPublicLinks'),
      journalBackupEnabled,
      journalBackupIntervalMinutes: assertUserSettingsInteger(yandex.journalBackupIntervalMinutes, MIN_BACKGROUND_INTERVAL_MINUTES, 60 * 24 * 365, 'settings.yandex.journalBackupIntervalMinutes'),
      journalBackupRetryMinutes: assertUserSettingsInteger(yandex.journalBackupRetryMinutes, MIN_BACKGROUND_INTERVAL_MINUTES, 60 * 24 * 365, 'settings.yandex.journalBackupRetryMinutes')
    },
    journal: {
      groupByUrl: assertUserSettingsBoolean(journal.groupByUrl, 'settings.journal.groupByUrl')
    },
    operationLog: {
      retentionHours: assertUserSettingsInteger(operationLog.retentionHours, 1, MAX_OPERATION_LOG_RETENTION_HOURS, 'settings.operationLog.retentionHours')
    }
  };
}

async function exportUserSettings() {
  await waitForUserSettingsImportStorageSettlement('Ожидание завершения импорта перед экспортом настроек');
  const stored = await readChromeStorageBounded(
    () => chrome.storage.local.get(['yandexConfig', OPERATION_LOG_SETTINGS_KEY, USER_SETTINGS_JOURNAL_GROUP_KEY]),
    'Чтение пользовательских настроек для экспорта'
  );
  const yandexConfig = stored?.yandexConfig && typeof stored.yandexConfig === 'object' ? stored.yandexConfig : {};
  const operationLogSettings = stored?.[OPERATION_LOG_SETTINGS_KEY] && typeof stored[OPERATION_LOG_SETTINGS_KEY] === 'object'
    ? stored[OPERATION_LOG_SETTINGS_KEY]
    : {};
  const document = {
    schema: USER_SETTINGS_SCHEMA,
    version: USER_SETTINGS_VERSION,
    exportedAt: new Date().toISOString(),
    extensionVersion: String(chrome.runtime.getManifest()?.version || ''),
    settings: {
      yandex: {
        clientId: String(yandexConfig.clientId || '').trim(),
        rootPath: normalizeDiskPath(yandexConfig.rootPath || ''),
        createPublicLinks: yandexConfig.createPublicLinks !== false,
        journalBackupEnabled: Boolean(yandexConfig.journalBackupEnabled),
        journalBackupIntervalMinutes: normalizeIntervalMinutes(yandexConfig.journalBackupIntervalMinutes, DEFAULT_JOURNAL_BACKUP_INTERVAL_MINUTES),
        journalBackupRetryMinutes: normalizeIntervalMinutes(yandexConfig.journalBackupRetryMinutes, DEFAULT_JOURNAL_BACKUP_RETRY_MINUTES)
      },
      journal: {
        groupByUrl: Boolean(stored?.[USER_SETTINGS_JOURNAL_GROUP_KEY])
      },
      operationLog: {
        retentionHours: normalizeOperationLogRetentionHours(operationLogSettings.retentionHours)
      }
    }
  };
  // Reuse the import validator as an export self-check. If persistent storage
  // was corrupted by an older build, do not emit a malformed/unsafe file.
  normalizeUserSettingsDocument(document);
  return { ok: true, document };
}

async function waitForUserSettingsImportStorageSettlement(label = 'Ожидание сохранения импортированных настроек') {
  await withOperationTimeout(
    Promise.resolve(userSettingsImportStorageSettlement).catch(() => {}),
    CHROME_STORAGE_OPERATION_TIMEOUT_MS,
    label
  );
}

async function waitForUserSettingsMutationBarriers() {
  await waitForUserSettingsImportStorageSettlement('Ожидание предыдущего импорта настроек');
  await withOperationTimeout(
    Promise.resolve(yandexConfigStorageSettlementChain).catch(() => {}),
    YANDEX_CONFIG_STORAGE_TIMEOUT_MS,
    'Ожидание предыдущего изменения настроек Яндекс Диска перед импортом'
  );
  const operationLogBarrier = chromeStorageMutationSettlementChains.get(`storage.local:${OPERATION_LOG_SETTINGS_KEY}`);
  if (operationLogBarrier) {
    await withOperationTimeout(
      Promise.resolve(operationLogBarrier).catch(() => {}),
      CHROME_STORAGE_OPERATION_TIMEOUT_MS,
      'Ожидание предыдущего изменения настроек OperationLog перед импортом'
    );
  }
}

async function reconcileUserSettingsImportMarker(reason = 'settings-import-recovery') {
  const stored = await readChromeStorageBounded(
    () => chrome.storage.local.get(USER_SETTINGS_IMPORT_MARKER_KEY),
    'Проверка незавершённого импорта настроек'
  );
  const marker = stored?.[USER_SETTINGS_IMPORT_MARKER_KEY];
  if (!marker || typeof marker !== 'object' || Number(marker.version || 0) !== USER_SETTINGS_VERSION) {
    return { ok: true, reconciled: false };
  }
  await initializeJournalBackupScheduler(reason);
  await mutateChromeStorageSerialized(
    `storage.local:${USER_SETTINGS_IMPORT_MARKER_KEY}`,
    () => chrome.storage.local.remove(USER_SETTINGS_IMPORT_MARKER_KEY),
    'Завершение reconciliation импортированных настроек'
  );
  return { ok: true, reconciled: true };
}

async function importUserSettings(document) {
  const normalized = normalizeUserSettingsDocument(document);
  await waitForUserSettingsMutationBarriers();
  const previous = await readChromeStorageBounded(
    () => chrome.storage.local.get(['yandexConfig', OPERATION_LOG_SETTINGS_KEY, USER_SETTINGS_JOURNAL_GROUP_KEY]),
    'Чтение текущих настроек перед импортом'
  );
  const previousYandexConfig = previous?.yandexConfig && typeof previous.yandexConfig === 'object' ? { ...previous.yandexConfig } : {};
  const nextYandexConfig = {
    ...previousYandexConfig,
    clientId: normalized.yandex.clientId,
    rootPath: normalized.yandex.rootPath,
    createPublicLinks: normalized.yandex.createPublicLinks,
    journalBackupEnabled: normalized.yandex.journalBackupEnabled,
    journalBackupIntervalMinutes: normalized.yandex.journalBackupIntervalMinutes,
    journalBackupRetryMinutes: normalized.yandex.journalBackupRetryMinutes
  };
  const marker = {
    version: USER_SETTINGS_VERSION,
    createdAt: Date.now(),
    schema: USER_SETTINGS_SCHEMA
  };
  const actual = Promise.resolve().then(() => chrome.storage.local.set({
    yandexConfig: nextYandexConfig,
    [OPERATION_LOG_SETTINGS_KEY]: { retentionHours: normalized.operationLog.retentionHours },
    [USER_SETTINGS_JOURNAL_GROUP_KEY]: normalized.journal.groupByUrl,
    [USER_SETTINGS_IMPORT_MARKER_KEY]: marker
  }));
  userSettingsImportStorageSettlement = actual;
  void actual.finally(() => {
    if (userSettingsImportStorageSettlement === actual) userSettingsImportStorageSettlement = Promise.resolve();
  }).catch(() => {});

  try {
    await withOperationTimeout(actual, CHROME_STORAGE_OPERATION_TIMEOUT_MS, 'Сохранение импортированных пользовательских настроек');
  } catch (error) {
    if (error?.code === 'WEBCLIP_TIMEOUT') {
      // chrome.storage.set is non-cancellable. Keep a durable marker in the same
      // bundled write so a late success can be reconciled on the next worker
      // start. Never auto-retry an unknown-settlement settings import.
      void actual.then(() => reconcileUserSettingsImportMarker('settings-import-late')).catch(() => {});
      return {
        ok: true,
        pending: true,
        appliedCount: 0,
        schema: USER_SETTINGS_SCHEMA,
        version: USER_SETTINGS_VERSION,
        oauthSessionChanged: false
      };
    }
    throw error;
  }

  let reconciliationPending = false;
  let reconciliationError = '';
  try {
    await reconcileUserSettingsImportMarker('settings-import');
  } catch (error) {
    // Settings are already committed as one storage bundle. Keep the marker so
    // normal worker startup can retry alarm/scheduler reconciliation later.
    reconciliationPending = true;
    reconciliationError = normalizeError(error);
  }
  return {
    ok: true,
    pending: false,
    reconciliationPending,
    ...(reconciliationError ? { reconciliationError } : {}),
    appliedCount: 8,
    schema: USER_SETTINGS_SCHEMA,
    version: USER_SETTINGS_VERSION,
    oauthSessionChanged: false
  };
}

function openIndexedDbBounded(name, version, upgrade, errorMessage, timeoutMs = 10_000) {
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
      reject(error instanceof Error ? error : new Error(String(error || errorMessage)));
    };
    const timer = setTimeout(() => fail(new Error(`${errorMessage} Превышено время ожидания открытия IndexedDB.`)), timeoutMs);
    try {
      request = indexedDB.open(name, version);
    } catch (error) {
      fail(error);
      return;
    }
    request.onupgradeneeded = (event) => {
      if (settled) {
        abortLateUpgrade();
        return;
      }
      try {
        upgrade?.(request.result, request.transaction, event);
      } catch (error) {
        abortLateUpgrade();
        fail(error);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        try { db.close(); } catch (_) {}
      };
      if (settled) {
        try { db.close(); } catch (_) {}
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(db);
    };
    request.onerror = () => fail(request.error || new Error(errorMessage));
    request.onblocked = () => fail(new Error(`${errorMessage} Открытие заблокировано другой страницей WebClip; закройте/обновите её и повторите.`));
  });
}

function runIndexedDbTransactionBounded(db, storeNames, mode, label, task, timeoutMs = 20_000) {
  return new Promise((resolve, reject) => {
    let tx = null;
    let settled = false;
    let result;
    let explicitError = null;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };
    const fail = (error) => {
      explicitError = error instanceof Error ? error : new Error(String(error || `${label} завершилась с ошибкой.`));
      try { tx?.abort(); } catch (_) {}
    };
    const timer = setTimeout(() => {
      const error = new Error(`${label} не завершилась за ${Math.round(timeoutMs / 1000)} с.`);
      error.code = 'WEBCLIP_IDB_TIMEOUT';
      explicitError = error;
      try { tx?.abort(); } catch (_) {}
      finish(reject, error);
    }, Math.max(1, Number(timeoutMs) || 20_000));
    try {
      tx = db.transaction(storeNames, mode);
      task({
        tx,
        store: (name = null) => tx.objectStore(name || (Array.isArray(storeNames) ? storeNames[0] : storeNames)),
        setResult: (value) => { result = value; },
        fail
      });
    } catch (error) {
      fail(error);
      finish(reject, explicitError);
      return;
    }
    tx.oncomplete = () => finish(resolve, result);
    tx.onerror = () => finish(reject, explicitError || tx.error || new Error(`${label} завершилась с ошибкой IndexedDB.`));
    tx.onabort = () => finish(reject, explicitError || tx.error || new Error(`${label} была прервана.`));
  });
}

function openOperationLogDb() {
  return openIndexedDbBounded(
    OPERATION_LOG_DB_NAME,
    OPERATION_LOG_DB_VERSION,
    (db, tx) => {
      let store;
      if (!db.objectStoreNames.contains(OPERATION_LOG_STORE)) {
        store = db.createObjectStore(OPERATION_LOG_STORE, { keyPath: 'operationId' });
      } else {
        store = tx.objectStore(OPERATION_LOG_STORE);
      }
      if (!store.indexNames.contains('updatedAt')) store.createIndex('updatedAt', 'updatedAt', { unique: false });
      if (!store.indexNames.contains('createdAt')) store.createIndex('createdAt', 'createdAt', { unique: false });
      if (!store.indexNames.contains('status')) store.createIndex('status', 'status', { unique: false });
      if (!db.objectStoreNames.contains(OPERATION_LOG_EVENT_STORE)) {
        const eventStore = db.createObjectStore(OPERATION_LOG_EVENT_STORE, { keyPath: ['operationId', 'seq'] });
        eventStore.createIndex('operationId', 'operationId', { unique: false });
      }
    },
    'Не удалось открыть хранилище диагностических логов.'
  );
}

function sanitizeOperationLogValue(value, key = '', depth = 0) {
  const lowered = String(key || '').toLowerCase();
  if (/authorization|access.?token|refresh.?token|manual.?token|oauth.?token|(?:^|[_-])token$|codeverifier|client.?secret|oauth.?code|verification.?code|signature|signed.?secret/.test(lowered)) {
    return '[REDACTED]';
  }
  if (value == null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') {
    let text = value;
    text = text.replace(/\b(OAuth|Bearer)\s+[A-Za-z0-9._~+\/-]{8,}/gi, '$1 [REDACTED]');
    text = text.replace(/\b(access_token|refresh_token|client_secret|code_verifier|authorization|signature|sign|token)=([^&\s]+)/gi, '$1=[REDACTED]');
    text = text.replace(/https?:\/\/[^\s<>'"]+/gi, (raw) => {
      try {
        const suffix = /[),.;:]$/.test(raw) ? raw.slice(-1) : '';
        const candidate = suffix ? raw.slice(0, -1) : raw;
        const url = new URL(candidate);
        const host = url.hostname.toLowerCase();
        if (host === 'disk.yandex.net' || host.endsWith('.disk.yandex.net')) {
          return `${url.origin}/[REDACTED_SIGNED_PATH]${suffix}`;
        }
        return `${url.origin}${url.pathname}${url.search ? '?[REDACTED_QUERY]' : ''}${suffix}`;
      } catch (_) { return raw; }
    });
    if (/href|uploadurl|downloadurl|authurl|url$/.test(lowered)) {
      try {
        const url = new URL(text);
        const host = url.hostname.toLowerCase();
        text = (host === 'disk.yandex.net' || host.endsWith('.disk.yandex.net'))
          ? `${url.origin}/[REDACTED_SIGNED_PATH]`
          : `${url.origin}${url.pathname}${url.search ? '?[REDACTED_QUERY]' : ''}`;
      } catch (_) {}
    }
    return text.length > 4000 ? `${text.slice(0, 4000)}…[truncated]` : text;
  }
  if (depth >= 5) return '[max-depth]';
  if (Array.isArray(value)) {
    const result = value.slice(0, 100).map((item) => sanitizeOperationLogValue(item, key, depth + 1));
    if (value.length > 100) result.push(`[+${value.length - 100} items]`);
    return result;
  }
  if (typeof value === 'object') {
    const result = {};
    const entries = Object.entries(value).slice(0, 120);
    for (const [childKey, childValue] of entries) {
      result[childKey] = sanitizeOperationLogValue(childValue, childKey, depth + 1);
    }
    if (Object.keys(value).length > entries.length) result.__truncatedKeys = Object.keys(value).length - entries.length;
    return result;
  }
  return String(value);
}

function jsonSizeChars(value) {
  try { return JSON.stringify(value).length; } catch (_) { return Number.MAX_SAFE_INTEGER; }
}

function boundOperationLogObject(value, maxChars, label = 'data') {
  const size = jsonSizeChars(value);
  if (size <= maxChars) return value;
  return { truncated: true, reason: `${label}-too-large`, approximateJsonChars: Number.isFinite(size) ? size : null };
}

function boundOperationLogEvent(event) {
  if (jsonSizeChars(event) <= MAX_OPERATION_LOG_EVENT_JSON_CHARS) return event;
  return {
    timestamp: Number(event?.timestamp || Date.now()),
    category: String(event?.category || 'event').slice(0, 120),
    level: String(event?.level || 'info').slice(0, 40),
    stage: String(event?.stage || '').slice(0, 120),
    message: String(event?.message || '').slice(0, 4000),
    data: { truncated: true, reason: 'event-too-large' }
  };
}

function boundOperationLogRecord(record) {
  record.meta = boundOperationLogObject(record.meta || {}, MAX_OPERATION_LOG_META_JSON_CHARS, 'meta');
  record.events = Array.isArray(record.events) ? record.events.map(boundOperationLogEvent) : [];
  if (record.events.length > MAX_OPERATION_LOG_EVENTS) {
    record.events = record.events.slice(record.events.length - MAX_OPERATION_LOG_EVENTS);
    record.eventsTruncated = true;
  }
  if (jsonSizeChars(record) <= MAX_OPERATION_LOG_RECORD_JSON_CHARS) return record;

  const operationStart = record.events.find((event) => event?.category === 'operation-start') || null;
  const kept = [];
  let budget = MAX_OPERATION_LOG_RECORD_JSON_CHARS - Math.min(MAX_OPERATION_LOG_META_JSON_CHARS, jsonSizeChars(record.meta)) - 64 * 1024;
  for (let i = record.events.length - 1; i >= 0 && budget > 0; i -= 1) {
    const event = record.events[i];
    if (event === operationStart) continue;
    const size = Math.min(MAX_OPERATION_LOG_EVENT_JSON_CHARS, jsonSizeChars(event));
    if (size > budget && kept.length) break;
    kept.push(event);
    budget -= size;
  }
  kept.reverse();
  record.events = operationStart ? [operationStart, ...kept] : kept;
  record.eventsTruncated = true;
  record.eventsTruncatedReason = 'record-size-limit';
  return record;
}

function queueOperationLogWrite(operationId, task) {
  const id = String(operationId || '').trim();
  if (!id) return Promise.resolve();
  const previous = operationLogWriteChains.get(id) || Promise.resolve();
  const next = previous.catch(() => {}).then(task);
  operationLogWriteChains.set(id, next);
  next.finally(() => {
    if (operationLogWriteChains.get(id) === next) operationLogWriteChains.delete(id);
  }).catch(() => {});
  return next;
}

async function flushOperationLogWrites(operationId) {
  const id = String(operationId || '').trim();
  if (!id) return;
  for (let pass = 0; pass < 8; pass += 1) {
    const pending = operationLogWriteChains.get(id);
    if (!pending) return;
    await pending.catch(() => {});
    if (operationLogWriteChains.get(id) === pending) return;
  }
}

async function mutateOperationLogOnce(operationId, mutate) {
  const db = await openOperationLogDb();
  try {
    return await runIndexedDbTransactionBounded(
      db,
      OPERATION_LOG_STORE,
      'readwrite',
      'Изменение заголовка диагностического лога',
      ({ store, setResult, fail }) => {
        const operationStore = store();
        const get = operationStore.get(operationId);
        get.onsuccess = () => {
          try {
            const now = Date.now();
            const record = get.result || {
              operationId,
              type: 'operation',
              title: 'Операция WebClip',
              createdAt: now,
              updatedAt: now,
              status: 'running',
              summary: '',
              meta: {},
              events: []
            };
            let output = mutate(record, now) || record;
            if (!Array.isArray(output.events)) output.events = [];
            output.updatedAt = now;
            output = boundOperationLogRecord(output);
            operationStore.put(output);
            setResult(output);
          } catch (error) {
            fail(error);
          }
        };
        get.onerror = () => fail(get.error || new Error('Не удалось прочитать диагностический лог.'));
      },
      OPERATION_LOG_CRUD_IDB_TX_TIMEOUT_MS
    );
  } finally {
    db.close();
  }
}

function isStorageQuotaError(error) {
  const name = String(error?.name || '');
  const message = String(error?.message || error || '');
  return name === 'QuotaExceededError' || /quota|storage.*full|disk.*full/i.test(message);
}

async function mutateOperationLog(operationId, mutate) {
  try {
    return await mutateOperationLogOnce(operationId, mutate);
  } catch (error) {
    if (!isStorageQuotaError(error)) throw error;
    // Diagnostics must yield storage to functional data. Remove expired/oldest
    // log records only, then retry the single mutation once.
    try {
      const settings = await getOperationLogSettings();
      await cleanupExpiredOperationLogs(settings.retentionHours);
    } catch (cleanupError) {
      console.warn('WebClip operation log quota cleanup:', cleanupError);
    }
    return mutateOperationLogOnce(operationId, mutate);
  }
}

function describeOperation(type, title, meta = {}) {
  const normalizedType = String(type || 'operation');
  const destination = String(meta?.destination || '');
  const diskAction = String(meta?.diskAction || '');
  const reason = String(meta?.reason || '');
  const readingMode = String(meta?.readingMode || '');

  if (normalizedType === 'journal-delete') {
    if (destination === 'yandex' && diskAction === 'trash') return 'Удаление записи журнала с файлом на Яндекс Диске';
    if (destination === 'yandex') return 'Удаление записи журнала без удаления файла на Яндекс Диске';
    return 'Удаление локальной записи журнала';
  }
  if (normalizedType === 'journal-backup') {
    return reason && reason !== 'manual'
      ? 'Фоновый экспорт журнала на Яндекс Диск'
      : 'Экспорт журнала на Яндекс Диск по запросу пользователя';
  }
  if (normalizedType === 'journal-backup-check') return 'Фоновая проверка необходимости экспорта журнала на Яндекс Диск';
  if (normalizedType === 'background-log-cleanup' || normalizedType === 'background-maintenance') return 'Фоновое обслуживание WebClip: логи, временные данные и восстановление локального журнала';
  if (normalizedType === 'journal-export-file') return 'Экспорт журнала в JSON-файл по запросу пользователя';
  if (normalizedType === 'journal-import-file') return 'Импорт журнала из JSON-файла по запросу пользователя';
  if (normalizedType === 'journal-import-yandex') return 'Восстановление журнала из резервной копии на Яндекс Диске по запросу пользователя';
  if (normalizedType === 'journal-clear') return 'Очистка записей локального журнала по запросу пользователя';
  if (normalizedType === 'mark-read') return 'Перенос файла «Прочитать позже» в «Прочитано» на Яндекс Диске';
  if (normalizedType === 'local-pdf') return 'Сохранение PDF локально по запросу пользователя';
  if (normalizedType === 'yandex-pdf') {
    return readingMode === 'later'
      ? 'Сохранение страницы как «Прочитать позже» на Яндекс Диск по запросу пользователя'
      : 'Сохранение страницы как «Прочитано» на Яндекс Диск по запросу пользователя';
  }
  if (normalizedType === 'yandex-pdf-retry') return 'Повторная отправка ранее сформированного PDF на Яндекс Диск по запросу пользователя';
  if (normalizedType === 'cached-pdf-download') return 'Скачивание ранее сформированного PDF по запросу пользователя';
  return String(meta?.description || title || 'Операция WebClip');
}

function startOperationLog(operationId, type, title, meta = {}) {
  const id = String(operationId || '').trim();
  if (!id) return Promise.resolve();
  return queueOperationLogWrite(id, () => mutateOperationLog(id, (record, now) => {
    if (!record.events?.length && record.type === 'operation') {
      record.createdAt = now;
    }
    record.type = String(type || record.type || 'operation');
    record.title = String(title || record.title || 'Операция WebClip');
    record.description = describeOperation(record.type, record.title, meta);
    record.status = 'running';
    record.meta = { ...(record.meta || {}), ...sanitizeOperationLogValue(meta) };
    if (!Array.isArray(record.events)) record.events = [];
    const legacyStart = record.events.find((event) => event?.category === 'operation-start') || null;
    if (!record.operationStartEvent && !legacyStart) {
      record.operationStartEvent = boundOperationLogEvent({ timestamp: now, category: 'operation-start', level: 'info', message: 'Операция начата.', data: sanitizeOperationLogValue(meta) });
    }
    if (!Number.isFinite(Number(record.eventStoreCount))) record.eventStoreCount = 0;
    if (!Number.isFinite(Number(record.eventStoreChars))) record.eventStoreChars = 0;
    if (!Number.isFinite(Number(record.nextEventSeq)) || Number(record.nextEventSeq) < 1) record.nextEventSeq = 1;
    record.eventCount = Math.min(MAX_OPERATION_LOG_EVENTS, (record.operationStartEvent || legacyStart ? 1 : 0) + record.events.filter((event) => event?.category !== 'operation-start').length + Math.max(0, Number(record.eventStoreCount) || 0));
    return record;
  })).catch((error) => console.warn('WebClip operation log start:', error));
}

async function appendOperationLogEventOnce(operationId, event = {}) {
  const id = String(operationId || '').trim();
  if (!id) return null;
  const normalized = boundOperationLogEvent({
    timestamp: Number(event.timestamp || Date.now()),
    category: String(event.category || 'event'),
    level: String(event.level || 'info'),
    stage: String(event.stage || ''),
    message: String(sanitizeOperationLogValue(String(event.message || ''), 'message')),
    data: sanitizeOperationLogValue(event.data || {})
  });
  const eventChars = Math.min(MAX_OPERATION_LOG_EVENT_JSON_CHARS, jsonSizeChars(normalized));
  const db = await openOperationLogDb();
  try {
    return await runIndexedDbTransactionBounded(
      db,
      [OPERATION_LOG_STORE, OPERATION_LOG_EVENT_STORE],
      'readwrite',
      'Сохранение события диагностического лога',
      ({ tx, setResult, fail }) => {
        const operations = tx.objectStore(OPERATION_LOG_STORE);
        const events = tx.objectStore(OPERATION_LOG_EVENT_STORE);
        const get = operations.get(id);
        const abortWith = (error) => fail(error instanceof Error
          ? error
          : new Error(String(error || 'Не удалось сохранить событие диагностического лога.')));

        get.onsuccess = () => {
          try {
            const now = Date.now();
            const record = get.result || {
              operationId: id,
              type: 'operation',
              title: 'Операция WebClip',
              createdAt: now,
              updatedAt: now,
              status: 'running',
              summary: '',
              meta: {},
              events: []
            };

            // One-time migration for a legacy v1 record. Keep the start event in
            // the small operation header and move the remaining timeline to the
            // append-only event store so future events no longer rewrite history.
            const legacy = Array.isArray(record.events) ? record.events : [];
            if (legacy.length) {
              const startEvent = record.operationStartEvent || legacy.find((item) => item?.category === 'operation-start') || null;
              if (startEvent) record.operationStartEvent = boundOperationLogEvent(startEvent);
              const tail = legacy.filter((item) => item !== startEvent && item?.category !== 'operation-start').slice(-(MAX_OPERATION_LOG_EVENTS - 1));
              let seq = 1;
              let chars = 0;
              for (const item of tail) {
                const bounded = boundOperationLogEvent(item);
                const size = Math.min(MAX_OPERATION_LOG_EVENT_JSON_CHARS, jsonSizeChars(bounded));
                events.put({ operationId: id, seq, event: bounded, jsonChars: size });
                chars += size;
                seq += 1;
              }
              record.events = [];
              record.eventStoreCount = tail.length;
              record.eventStoreChars = chars;
              record.nextEventSeq = seq;
              if (legacy.length > tail.length + (startEvent ? 1 : 0)) record.eventsTruncated = true;
            }

            if (!record.operationStartEvent) {
              record.operationStartEvent = boundOperationLogEvent({ timestamp: Number(record.createdAt || now), category: 'operation-start', level: 'info', message: 'Операция начата.', data: {} });
            }
            let count = Math.max(0, Number(record.eventStoreCount) || 0);
            let chars = Math.max(0, Number(record.eventStoreChars) || 0);
            const seq = Math.max(1, Math.floor(Number(record.nextEventSeq) || 1));
            events.put({ operationId: id, seq, event: normalized, jsonChars: eventChars });
            count += 1;
            chars += eventChars;
            record.nextEventSeq = seq + 1;

            const needsPrune = () => count > (MAX_OPERATION_LOG_EVENTS - 1) || chars > MAX_OPERATION_LOG_EVENT_TOTAL_JSON_CHARS;
            const finalize = () => {
              record.eventStoreCount = count;
              record.eventStoreChars = chars;
              record.eventCount = 1 + count;
              if (event.status) record.status = String(event.status);
              if (event.summary) record.summary = String(sanitizeOperationLogValue(String(event.summary), 'summary'));
              record.updatedAt = now;
              const output = boundOperationLogRecord(record);
              operations.put(output);
              setResult(output);
            };

            if (!needsPrune()) {
              finalize();
              return;
            }

            const range = IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]);
            const cursorRequest = events.openCursor(range, 'next');
            cursorRequest.onsuccess = () => {
              try {
                const cursor = cursorRequest.result;
                if (!cursor || !needsPrune()) {
                  if (needsPrune()) {
                    abortWith(new Error('Не удалось ограничить размер timeline диагностического лога.'));
                    return;
                  }
                  finalize();
                  return;
                }
                const row = cursor.value || {};
                // Never delete the event we just appended unless it is individually
                // too large (boundOperationLogEvent already prevents that case).
                if (Number(row.seq) === seq && count <= 1) {
                  finalize();
                  return;
                }
                chars = Math.max(0, chars - Math.max(0, Number(row.jsonChars) || jsonSizeChars(row.event || {})));
                count = Math.max(0, count - 1);
                record.eventsTruncated = true;
                cursor.delete();
                cursor.continue();
              } catch (error) {
                abortWith(error);
              }
            };
            cursorRequest.onerror = () => abortWith(cursorRequest.error || new Error('Не удалось ограничить timeline диагностического лога.'));
          } catch (error) {
            abortWith(error);
          }
        };
        get.onerror = () => abortWith(get.error || new Error('Не удалось прочитать диагностический лог.'));
      },
      OPERATION_LOG_CRUD_IDB_TX_TIMEOUT_MS
    );
  } finally {
    db.close();
  }
}

async function appendOperationLogEventDurable(operationId, event = {}) {
  try {
    return await appendOperationLogEventOnce(operationId, event);
  } catch (error) {
    if (!isStorageQuotaError(error)) throw error;
    try {
      const settings = await getOperationLogSettings();
      await cleanupExpiredOperationLogs(settings.retentionHours);
    } catch (cleanupError) {
      console.warn('WebClip operation event quota cleanup:', cleanupError);
    }
    return appendOperationLogEventOnce(operationId, event);
  }
}

function appendOperationLogEvent(operationId, event = {}) {
  const id = String(operationId || '').trim();
  if (!id) return Promise.resolve();
  return queueOperationLogWrite(id, () => appendOperationLogEventDurable(id, event))
    .catch((error) => console.warn('WebClip operation log event:', error));
}

function finishOperationLog(operationId, status = 'success', summary = '') {
  const normalizedStatus = ['success', 'partial', 'error', 'canceled'].includes(String(status)) ? String(status) : 'success';
  return appendOperationLogEvent(operationId, {
    category: 'operation-finish',
    level: normalizedStatus === 'error' ? 'error' : normalizedStatus === 'partial' ? 'warning' : 'info',
    message: summary || (normalizedStatus === 'canceled' ? 'Операция отменена пользователем.' : 'Операция завершена.'),
    status: normalizedStatus,
    summary: summary || (normalizedStatus === 'canceled' ? 'Операция отменена пользователем.' : 'Операция завершена.')
  });
}

function recordOperationStage(operationId, stage, message, percent, state = 'running', details = {}) {
  if (!operationId) return;
  const status = state === 'success' ? 'success' : state === 'partial' ? 'partial' : state === 'error' ? 'error' : undefined;
  appendOperationLogEvent(operationId, {
    category: 'stage',
    level: state === 'error' ? 'error' : state === 'partial' ? 'warning' : 'info',
    stage,
    message,
    data: { percent: Math.max(0, Math.min(100, Number(percent) || 0)), state, ...details },
    status,
    summary: status ? message : ''
  });
}

function summarizeYandexResponse(endpoint, data) {
  if (!data || typeof data !== 'object') return {};
  const summary = {};
  const boundedSummaryScalar = (value, maxChars = 4000) => boundedYandexExternalText(value, maxChars);
  for (const key of ['name', 'path', 'type', 'modified', 'resource_id']) {
    if (data[key] !== undefined) summary[key] = boundedSummaryScalar(data[key]);
  }
  for (const key of ['size', 'total', 'limit', 'offset']) {
    if (data[key] !== undefined) summary[key] = normalizeYandexNonNegativeNumber(data[key]);
  }
  if (data.public_url !== undefined) summary.hasPublicUrl = Boolean(data.public_url);
  if (data.href) {
    try {
      const u = new URL(boundedSummaryScalar(data.href, MAX_YANDEX_SIGNED_URL_CHARS));
      summary.href = `${u.origin}${u.pathname}${u.search ? '?[REDACTED_QUERY]' : ''}`;
    } catch (_) { summary.href = '[signed-url]'; }
    if (data.method) summary.method = boundedSummaryScalar(data.method, 16);
  }
  if (Array.isArray(data.items)) {
    summary.itemsCount = data.items.length;
    summary.items = data.items.slice(0, 30).map((item) => ({
      name: boundedSummaryScalar(item?.name), path: boundedSummaryScalar(item?.path), type: boundedSummaryScalar(item?.type, 32),
      size: normalizeYandexNonNegativeNumber(item?.size), resource_id: boundedSummaryScalar(item?.resource_id, MAX_YANDEX_RESOURCE_ID_CHARS), hasPublicUrl: Boolean(item?.public_url)
    }));
  }
  if (data._embedded && typeof data._embedded === 'object') {
    const items = Array.isArray(data._embedded.items) ? data._embedded.items : [];
    summary.embeddedTotal = data._embedded.total ?? null;
    summary.embeddedItemsCount = items.length;
  }
  if (!Object.keys(summary).length) summary.keys = Object.keys(data).slice(0, 50);
  summary.endpoint = endpoint || '/';
  return summary;
}

async function listOperationLogs(limit = 100) {
  const capped = Math.max(1, Math.min(500, Number(limit) || 100));
  const db = await openOperationLogDb();
  try {
    return await runIndexedDbTransactionBounded(
      db,
      OPERATION_LOG_STORE,
      'readonly',
      'Чтение списка диагностических логов',
      ({ store, setResult, fail }) => {
        const index = store().index('updatedAt');
        const result = [];
        const request = index.openCursor(null, 'prev');
        request.onsuccess = () => {
          try {
            const cursor = request.result;
            if (!cursor || result.length >= capped) {
              setResult({ ok: true, operations: result });
              return;
            }
            const record = cursor.value || {};
            result.push({
              operationId: record.operationId || '', type: record.type || 'operation', title: record.title || 'Операция WebClip',
              description: record.description || describeOperation(record.type, record.title, record.meta || {}),
              createdAt: Number(record.createdAt || 0), updatedAt: Number(record.updatedAt || 0),
              status: record.status || 'running', summary: record.summary || '', eventCount: Math.max(0, Number(record.eventCount) || (Array.isArray(record.events) ? record.events.length : 0))
            });
            cursor.continue();
          } catch (error) {
            fail(error);
          }
        };
        request.onerror = () => fail(request.error || new Error('Не удалось прочитать список логов.'));
      },
      OPERATION_LOG_CRUD_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
}

async function clearOperationLogs() {
  const pending = [...operationLogWriteChains.values()];
  if (pending.length) await Promise.allSettled(pending);
  operationLogWriteChains.clear();
  const db = await openOperationLogDb();
  try {
    await runIndexedDbTransactionBounded(
      db,
      [OPERATION_LOG_STORE, OPERATION_LOG_EVENT_STORE],
      'readwrite',
      'Очистка диагностических логов',
      ({ tx, fail }) => {
        const operationRequest = tx.objectStore(OPERATION_LOG_STORE).clear();
        const eventRequest = tx.objectStore(OPERATION_LOG_EVENT_STORE).clear();
        operationRequest.onerror = () => fail(operationRequest.error || new Error('Не удалось удалить диагностические логи.'));
        eventRequest.onerror = () => fail(eventRequest.error || new Error('Не удалось удалить timeline диагностических логов.'));
      },
      OPERATION_LOG_CRUD_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
  return { ok: true };
}

function operationLogExportFilename(operationId) {
  const safeId = String(operationId || 'operation').replace(/[^a-z0-9._-]+/gi, '_').slice(0, 140);
  return `WebClip_Operation_${safeId}.json`;
}

async function prepareOperationLogExport(operationId) {
  const result = await getOperationLog(operationId);
  const rawLog = result.log || {};
  const { events: rawEvents, ...rawRest } = rawLog;
  const safeLog = sanitizeOperationLogValue(rawRest);
  safeLog.events = Array.isArray(rawEvents)
    ? rawEvents.map((event) => sanitizeOperationLogValue(event))
    : [];
  const exported = {
    schema: 'webclip-operation-log',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    extensionVersion: chrome.runtime.getManifest().version,
    retentionHours: (await getOperationLogSettings()).retentionHours,
    log: safeLog
  };
  const text = JSON.stringify(exported, null, 2);
  const blobUrl = await createTextBlobUrl(text, 'application/json;charset=utf-8');
  const filename = operationLogExportFilename(operationId);
  const saveAsSessionId = makePreparedSaveAsSessionId();
  try {
    await createPreparedSaveAsCheckpoint({
      sessionId: saveAsSessionId,
      blobUrl,
      filename,
      ownerPage: 'options.html',
      operationId: String(operationId || '')
    });
    return {
      ok: true,
      blobUrl,
      filename,
      operationId: String(operationId || ''),
      saveAsSessionId
    };
  } catch (error) {
    await releasePreparedSaveAsCheckpoint({
      sessionId: saveAsSessionId,
      blobUrl,
      ownerPage: 'options.html',
      operationId: String(operationId || ''),
      reason: 'prepare-failed'
    }).catch(() => {});
    throw error;
  }
}

async function getOperationLog(operationId) {
  const id = String(operationId || '').trim();
  if (!id) throw new Error('Укажите ID операции.');
  const pending = operationLogWriteChains.get(id);
  if (pending) await pending.catch(() => {});
  const db = await openOperationLogDb();
  try {
    const record = await runIndexedDbTransactionBounded(
      db,
      [OPERATION_LOG_STORE, OPERATION_LOG_EVENT_STORE],
      'readonly',
      'Чтение диагностического лога',
      ({ tx, setResult, fail }) => {
        const operations = tx.objectStore(OPERATION_LOG_STORE);
        const events = tx.objectStore(OPERATION_LOG_EVENT_STORE);
        const request = operations.get(id);
        let header = null;
        const storedEvents = [];
        request.onsuccess = () => {
          try {
            header = request.result || null;
            if (!header) {
              setResult(null);
              return;
            }
            const range = IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]);
            const cursorRequest = events.openCursor(range, 'next');
            cursorRequest.onsuccess = () => {
              try {
                const cursor = cursorRequest.result;
                if (!cursor) {
                  const legacy = Array.isArray(header.events) ? header.events : [];
                  const startEvent = header.operationStartEvent || legacy.find((item) => item?.category === 'operation-start') || null;
                  const legacyTail = legacy.filter((item) => item !== startEvent && item?.category !== 'operation-start');
                  const output = { ...header };
                  output.events = [startEvent, ...legacyTail, ...storedEvents].filter(Boolean).slice(-MAX_OPERATION_LOG_EVENTS);
                  if (startEvent && output.events[0] !== startEvent) {
                    output.events = [startEvent, ...output.events.slice(-(MAX_OPERATION_LOG_EVENTS - 1))];
                  }
                  delete output.operationStartEvent;
                  delete output.eventStoreCount;
                  delete output.eventStoreChars;
                  delete output.nextEventSeq;
                  output.eventCount = output.events.length;
                  setResult(output);
                  return;
                }
                storedEvents.push(cursor.value?.event || {});
                cursor.continue();
              } catch (error) {
                fail(error);
              }
            };
            cursorRequest.onerror = () => fail(cursorRequest.error || new Error('Не удалось прочитать timeline диагностического лога.'));
          } catch (error) {
            fail(error);
          }
        };
        request.onerror = () => fail(request.error || new Error('Не удалось получить диагностический лог.'));
      },
      OPERATION_LOG_CRUD_IDB_TX_TIMEOUT_MS
    );
    if (!record) throw new Error(`Лог операции ${id} не найден или уже удалён по сроку хранения.`);
    if (!record.description) record.description = describeOperation(record.type, record.title, record.meta || {});
    return { ok: true, log: record };
  } finally { db.close(); }
}

function deleteOperationLogEventsInTransaction(eventStore, operationId) {
  const id = String(operationId || '');
  if (!id) return;
  const range = IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]);
  const request = eventStore.openCursor(range, 'next');
  request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) return;
    cursor.delete();
    cursor.continue();
  };
}

async function cleanupExpiredOperationLogs(retentionOverride = null) {
  const retentionHours = retentionOverride == null
    ? (await getOperationLogSettings()).retentionHours
    : normalizeOperationLogRetentionHours(retentionOverride);
  const cutoff = Date.now() - retentionHours * 60 * 60 * 1000;
  const db = await openOperationLogDb();
  let deleted = 0;
  let sizeDeleted = 0;
  let retainedApproxChars = 0;
  try {
    await runIndexedDbTransactionBounded(
      db,
      [OPERATION_LOG_STORE, OPERATION_LOG_EVENT_STORE],
      'readwrite',
      'Очистка устаревших диагностических логов',
      ({ tx, fail }) => {
        const operationStore = tx.objectStore(OPERATION_LOG_STORE);
        const eventStore = tx.objectStore(OPERATION_LOG_EVENT_STORE);
        const index = operationStore.index('updatedAt');
        const range = IDBKeyRange.upperBound(cutoff, true);
        const request = index.openCursor(range);
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return;
          deleteOperationLogEventsInTransaction(eventStore, cursor.value?.operationId);
          cursor.delete();
          deleted += 1;
          cursor.continue();
        };
        request.onerror = () => fail(request.error || new Error('Не удалось очистить устаревшие диагностические логи.'));
      },
      MAINTENANCE_IDB_TX_TIMEOUT_MS
    );

    await runIndexedDbTransactionBounded(
      db,
      [OPERATION_LOG_STORE, OPERATION_LOG_EVENT_STORE],
      'readwrite',
      'Ограничение объёма диагностических логов',
      ({ tx, fail }) => {
        const operationStore = tx.objectStore(OPERATION_LOG_STORE);
        const eventStore = tx.objectStore(OPERATION_LOG_EVENT_STORE);
        const index = operationStore.index('updatedAt');
        const request = index.openCursor(null, 'prev');
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return;
          const header = cursor.value || {};
          const size = Math.min(MAX_OPERATION_LOG_RECORD_JSON_CHARS, jsonSizeChars(header) + Math.max(0, Number(header.eventStoreChars) || 0));
          if (retainedApproxChars + size > MAX_OPERATION_LOG_TOTAL_JSON_CHARS) {
            deleteOperationLogEventsInTransaction(eventStore, cursor.value?.operationId);
            cursor.delete();
            deleted += 1;
            sizeDeleted += 1;
          } else {
            retainedApproxChars += size;
          }
          cursor.continue();
        };
        request.onerror = () => fail(request.error || new Error('Не удалось ограничить объём диагностических логов.'));
      },
      MAINTENANCE_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
  return { ok: true, retentionHours, deleted, sizeDeleted, retainedApproxChars };
}

async function runLoggedOperationLogCleanup(trigger = 'scheduled') {
  const operationId = makeOperationLogId('background-maintenance');
  await startOperationLog(operationId, 'background-maintenance', 'Фоновое обслуживание WebClip', { trigger, background: true });
  try {
    recordOperationStage(operationId, 'settings', 'Читаем срок хранения диагностических логов…', 20);
    const settings = await getOperationLogSettings();
    const maintenanceErrors = [];
    const runStage = async (name, task, fallback) => {
      try { return await task(); }
      catch (error) {
        maintenanceErrors.push({ stage: name, error: normalizeError(error) });
        appendOperationLogEvent(operationId, { category: 'maintenance-error', level: 'warning', stage: name, message: `Фоновая стадия «${name}» завершилась ошибкой; остальные стадии продолжаются.`, data: { error: normalizeError(error) } });
        return typeof fallback === 'function' ? fallback(error) : fallback;
      }
    };
    recordOperationStage(operationId, 'cleanup', `Удаляем логи старше ${settings.retentionHours} ч.…`, 55, 'running', { retentionHours: settings.retentionHours });
    const result = await runStage('operation-log-cleanup', () => cleanupExpiredOperationLogs(settings.retentionHours), { deleted: 0, sizeDeleted: 0, retainedApproxChars: 0, retentionHours: settings.retentionHours });
    recordOperationStage(operationId, 'temporary-storage', 'Очищаем просроченные временные transfer/PDF данные…', 78, 'running');
    const [transferPayloadsDeleted, pdfCacheDeleted, staleRemoteCheckpointsDeleted, importStagingDeleted] = await Promise.all([
      runStage('transfer-cleanup', cleanupTransferPayloads, 0),
      runStage('pdf-cache-cleanup', cleanupExpiredPdfCache, 0),
      runStage('remote-checkpoint-cleanup', cleanupStalePendingRemoteSaves, 0),
      runStage('import-staging-cleanup', cleanupExpiredJournalImportStaging, 0)
    ]);
    recordOperationStage(operationId, 'journal-recovery', 'Проверяем очереди восстановления записей журнала, удалённых и локальных сохранений…', 90, 'running');
    const journalRecovery = await runStage('journal-recovery', () => recoverPendingJournalAppends(trigger), { pending: 0, recovered: 0, cancelled: 0, failed: 1 });
    const remoteSaves = await runStage('remote-save-recovery', () => recoverPendingRemoteSaves(trigger), { pending: 0, recovered: 0, failed: 1 });
    const localDownloads = await runStage('local-download-recovery', () => reconcilePendingLocalDownloads(trigger), { checked: 0, completed: 0, interrupted: 0, pending: 0, failed: 1 });
    const destructiveMoves = await runStage('destructive-move-recovery', () => reconcilePendingDestructiveMoves(trigger), { checked: 0, finalized: 0, cancelled: 0, preparedDropped: 0, manualResolution: 0, pending: 0, manualPending: 0, failed: 1 });
    recordOperationStage(operationId, 'stats-repair', 'Проверяем необходимость восстановления агрегированной статистики URL…', 94, 'running');
    const statsRepair = await runStage('stats-repair', () => ensureJournalStatsHealthy(`background-${trigger}`), { repaired: false, error: 'Ошибка восстановления статистики.' });
    const maintenancePartial = Boolean(
      maintenanceErrors.length
      || journalRecovery.failed
      || remoteSaves?.failed || remoteSaves?.error
      || localDownloads?.failed || localDownloads?.error
      || destructiveMoves?.failed || destructiveMoves?.error || destructiveMoves?.manualPending
      || statsRepair?.error
    );
    recordOperationStage(operationId, 'complete', `Фоновое обслуживание завершено. Удалено логов: ${result.deleted}, transfer-записей: ${transferPayloadsDeleted}, PDF-cache: ${pdfCacheDeleted}; import-staging: ${importStagingDeleted}; архивных remote-checkpoint: ${staleRemoteCheckpointsDeleted}; восстановлено записей журнала: ${journalRecovery.recovered}; удалённых сохранений: ${remoteSaves?.recovered || 0}; локальных загрузок подтверждено: ${localDownloads?.completed || 0}; destructive receipts локально финализировано: ${destructiveMoves?.finalized || 0}; manual-resolution: ${destructiveMoves?.manualPending || 0}; отменено устаревших recovery: ${journalRecovery.cancelled || 0}.`, 100, maintenancePartial ? 'partial' : 'success', {
      deleted: result.deleted,
      transferPayloadsDeleted,
      pdfCacheDeleted,
      staleRemoteCheckpointsDeleted,
      importStagingDeleted,
      journalRecovery,
      remoteSaves,
      localDownloads,
      destructiveMoves,
      statsRepair,
      retentionHours: settings.retentionHours,
      trigger,
      maintenanceErrors
    });
    return { ...result, transferPayloadsDeleted, pdfCacheDeleted, staleRemoteCheckpointsDeleted, importStagingDeleted, journalRecovery, remoteSaves, localDownloads, destructiveMoves, statsRepair, maintenanceErrors, operationId };
  } catch (error) {
    recordOperationStage(operationId, 'error', `Ошибка фонового обслуживания WebClip: ${normalizeError(error)}`, 100, 'error', { trigger });
    throw error;
  } finally {
    await flushOperationLogWrites(operationId);
  }
}

async function initializeOperationLogCleanup(trigger = 'initialize') {
  const settings = await getOperationLogSettings();
  const existingAlarm = await getChromeAlarmBounded(OPERATION_LOG_CLEANUP_ALARM, 'Проверка alarm очистки OperationLog');
  const startupLike = trigger === 'installed' || trigger === 'startup';
  if (startupLike) {
    // Do not launch a long maintenance promise from onStartup/onInstalled and
    // hope that MV3 keeps the worker alive. An alarm is a durable wake-up
    // boundary; run the first pass shortly after startup and then hourly.
    await mutateChromeAlarmSerialized(
      OPERATION_LOG_CLEANUP_ALARM,
      () => chrome.alarms.create(OPERATION_LOG_CLEANUP_ALARM, { delayInMinutes: 1, periodInMinutes: 60 }),
      'Планирование очистки OperationLog'
    );
    return { ok: true, retentionHours: settings.retentionHours, scheduled: true, startupMaintenanceScheduled: true };
  }
  if (!existingAlarm) {
    await mutateChromeAlarmSerialized(
      OPERATION_LOG_CLEANUP_ALARM,
      () => chrome.alarms.create(OPERATION_LOG_CLEANUP_ALARM, { delayInMinutes: 1, periodInMinutes: 60 }),
      'Планирование очистки OperationLog'
    );
  }
  // Do not recreate an existing alarm on every MV3 worker wake: doing so can
  // keep postponing the hourly maintenance deadline in an active browser.
  return { ok: true, retentionHours: settings.retentionHours, scheduled: true, alarmAlreadyPresent: Boolean(existingAlarm) };
}
let creatingOffscreenDocument = null;
let closingOffscreenDocument = null;
const journalBackupProgressPorts = new Set();
const journalOperationProgressPorts = new Set();

chrome.runtime.onConnect.addListener((port) => {
  const kind = runtimeSenderKind(port?.sender);
  if (kind !== 'extension') {
    try { port.disconnect(); } catch (_) {}
    return;
  }
  if (port?.name === 'webclip-journal-backup-progress') {
    journalBackupProgressPorts.add(port);
    port.onDisconnect.addListener(() => journalBackupProgressPorts.delete(port));
    return;
  }
  if (port?.name === 'webclip-journal-operation-progress') {
    journalOperationProgressPorts.add(port);
    port.onDisconnect.addListener(() => journalOperationProgressPorts.delete(port));
  }
});

function emitJournalBackupProgress(operationId, stage, message, percent, state = 'running', details = {}) {
  if (!operationId) return;
  recordOperationStage(operationId, stage, message, percent, state, details);
  const payload = {
    type: 'WEBCLIP_JOURNAL_BACKUP_PROGRESS',
    operationId,
    stage,
    message,
    percent: Math.max(0, Math.min(100, Number(percent) || 0)),
    state,
    ...details
  };
  for (const port of [...journalBackupProgressPorts]) {
    try { port.postMessage(payload); } catch (_) { journalBackupProgressPorts.delete(port); }
  }
}

function emitPageUploadProgress(tabId, operationId, stage, message, percent, state = 'running', details = {}) {
  if (!tabId || !operationId) return;
  recordOperationStage(operationId, stage, message, percent, state, details);
  chrome.tabs.sendMessage(tabId, {
    type: 'WEBCLIP_PAGE_UPLOAD_PROGRESS',
    operationId,
    stage,
    message,
    percent: Math.max(0, Math.min(100, Number(percent) || 0)),
    state,
    ...details
  }).catch(() => {});
}

function emitJournalOperationProgress(operationId, stage, message, percent, state = 'running', details = {}) {
  if (!operationId) return;
  recordOperationStage(operationId, stage, message, percent, state, details);
  const payload = {
    type: 'WEBCLIP_JOURNAL_OPERATION_PROGRESS', operationId, stage, message,
    percent: Math.max(0, Math.min(100, Number(percent) || 0)), state, ...details
  };
  for (const port of [...journalOperationProgressPorts]) {
    try { port.postMessage(payload); } catch (_) { journalOperationProgressPorts.delete(port); }
  }
}


function frameAgentPermissionPattern(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    const host = url.hostname;
    if (!host) return '';
    return `${url.protocol}//${host}/*`;
  } catch (_) {
    return '';
  }
}

function boundedFrameAgentUrl(value) {
  const text = String(value || '');
  return text.length <= MAX_IMPORTED_URL_CHARS ? text : text.slice(0, MAX_IMPORTED_URL_CHARS);
}

async function frameAgentHasGrantedHostPermission(value) {
  const pattern = frameAgentPermissionPattern(value);
  if (!pattern) return false;
  try {
    return Boolean(await withOperationTimeout(
      chrome.permissions.contains({ origins: [pattern] }),
      FRAME_AGENT_COMMAND_TIMEOUT_MS,
      'Проверка host permission iframe'
    ));
  } catch (_) {
    return false;
  }
}

function frameAgentRegistryForTab(tabId, create = false) {
  const id = Math.max(0, Math.floor(Number(tabId) || 0));
  if (!id) return null;
  let map = frameAgentsByTab.get(id) || null;
  if (!map && create) {
    map = new Map();
    frameAgentsByTab.set(id, map);
  }
  return map;
}

async function registerFrameAgent(sender) {
  const tabId = Number(sender?.tab?.id || 0);
  const frameId = Number(sender?.frameId || 0);
  const url = boundedFrameAgentUrl(sender?.url || sender?.origin || '');
  if (!tabId || !Number.isInteger(frameId) || frameId <= 0 || !/^https?:\/\//i.test(url)) {
    throw new Error('Frame-agent допускается только внутри http(s) iframe.');
  }
  if (!await frameAgentHasGrantedHostPermission(url)) {
    throw new Error('Для origin iframe не предоставлен optional host permission.');
  }
  const map = frameAgentRegistryForTab(tabId, true);
  if (!map.has(frameId) && map.size >= FRAME_AGENT_MAX_PER_TAB) {
    throw new Error(`Число подключённых iframe превышает безопасный предел ${FRAME_AGENT_MAX_PER_TAB}.`);
  }
  const record = {
    frameId,
    documentId: boundedContentString(sender?.documentId, 180),
    url,
    registeredAt: Date.now()
  };
  map.set(frameId, record);
  try {
    await withOperationTimeout(
      chrome.tabs.sendMessage(tabId, { type: 'WEBCLIP_REMOTE_FRAME_EVENT', event: 'register', frame: record }, { frameId: 0 }),
      FRAME_AGENT_COMMAND_TIMEOUT_MS,
      'Регистрация cross-origin iframe в top-frame'
    );
  } catch (_) {}
  return { ok: true, frameId };
}

async function forwardFrameAgentState(message, sender) {
  const tabId = Number(sender?.tab?.id || 0);
  const frameId = Number(sender?.frameId || 0);
  const map = frameAgentRegistryForTab(tabId, false);
  const record = map?.get(frameId);
  const senderDocumentId = boundedContentString(sender?.documentId, 180);
  if (!record || (record.documentId && senderDocumentId && record.documentId !== senderDocumentId) || !await frameAgentHasGrantedHostPermission(sender?.url || record.url)) {
    throw new Error('Frame-agent не зарегистрирован, устарел после навигации или permission отозван.');
  }
  const snapshot = sanitizeSelectionSnapshot(message?.snapshot || {}, { rejectOverflow: true });
  const payload = {
    type: 'WEBCLIP_REMOTE_FRAME_EVENT',
    event: 'state',
    frame: record,
    snapshot,
    phase: boundedContentString(message?.phase, 32)
  };
  try {
    await withOperationTimeout(
      chrome.tabs.sendMessage(tabId, payload, { frameId: 0 }),
      FRAME_AGENT_COMMAND_TIMEOUT_MS,
      'Передача состояния cross-origin iframe в top-frame'
    );
  } catch (_) {}
  return { ok: true };
}

function listRegisteredFrameAgents(tabId) {
  const map = frameAgentRegistryForTab(tabId, false);
  return [...(map?.values() || [])].slice(0, FRAME_AGENT_MAX_PER_TAB).map((item) => ({ ...item }));
}

async function sendFrameAgentCommand(tabId, frameId, command, payload = {}) {
  const id = Math.max(0, Math.floor(Number(tabId) || 0));
  const fid = Math.max(0, Math.floor(Number(frameId) || 0));
  const record = frameAgentRegistryForTab(id, false)?.get(fid);
  if (!id || !fid || !record) throw new Error('Cross-origin iframe не зарегистрирован.');
  if (!await frameAgentHasGrantedHostPermission(record.url)) {
    frameAgentRegistryForTab(id, false)?.delete(fid);
    throw new Error('Host permission для iframe отсутствует или был отозван.');
  }
  return withOperationTimeout(
    chrome.tabs.sendMessage(id, { type: 'WEBCLIP_FRAME_AGENT_COMMAND', command: String(command || ''), ...payload }, { frameId: fid }),
    FRAME_AGENT_COMMAND_TIMEOUT_MS,
    `Команда cross-origin iframe ${String(command || '')}`
  );
}

async function enableFrameAgentsForTab(tabId) {
  const id = Math.max(0, Math.floor(Number(tabId) || 0));
  if (!id) throw new Error('Не указана вкладка для подключения iframe.');
  let results = [];
  try {
    results = await executeScriptSingletonBounded(
    { target: { tabId: id, allFrames: true }, files: ['frame-agent.js'] },
    {
      requestKey: `frame-agent:${id}:all`,
      label: 'Инъекция frame-agent в разрешённые iframe',
      timeoutMs: SCRIPT_EXECUTION_TIMEOUT_MS
    }
  );
  } catch (error) {
    // Chrome может отказать allFrames, если ни один дочерний frame сейчас не
    // доступен по optional host permission. Это не должно ломать top-page flow.
    return { ok: true, injectedFrames: 0, registered: listRegisteredFrameAgents(id).length, warning: normalizeError(error) };
  }
  return {
    ok: true,
    injectedFrames: (Array.isArray(results) ? results : []).filter((item) => Number(item?.frameId || 0) > 0).length,
    registered: listRegisteredFrameAgents(id).length
  };
}

function makeScriptExecutionPendingError(label = 'Инъекция скрипта Chrome') {
  const error = new Error(`${label} ещё выполняется Chrome. WebClip не запускает повторную инъекцию, пока исходный scripting.executeScript() не завершится.`);
  error.code = 'WEBCLIP_SCRIPT_EXECUTION_PENDING';
  return error;
}

function scriptExecutionRequestKey(details = {}, requestKey = '') {
  const explicit = String(requestKey || '').trim();
  if (explicit) return `logical:${explicit.slice(0, 512)}`;
  const target = details?.target && typeof details.target === 'object' ? details.target : {};
  const tabId = Math.max(0, Math.floor(Number(target.tabId) || 0));
  const frameIds = (Array.isArray(target.frameIds) ? target.frameIds : []).map((value) => Math.floor(Number(value))).filter((value) => Number.isInteger(value) && value >= 0).sort((a, b) => a - b);
  const documentIds = (Array.isArray(target.documentIds) ? target.documentIds : []).map((value) => String(value || '').slice(0, 256)).filter(Boolean).sort();
  const files = (Array.isArray(details?.files) ? details.files : []).map((value) => String(value || '').slice(0, 512)).filter(Boolean);
  return `tab:${tabId}|all:${target.allFrames === true ? 1 : 0}|frames:${frameIds.join(',')}|documents:${documentIds.join(',')}|files:${files.join(',')}|world:${String(details?.world || 'ISOLATED')}`;
}

function clearScriptExecutionSettlement(key, entry) {
  if (entry?.cleanupTimer) clearTimeout(entry.cleanupTimer);
  if (scriptExecutionSettlements.get(key) === entry) scriptExecutionSettlements.delete(key);
}

function clearScriptExecutionSettlementsForTab(tabId) {
  const id = Math.max(0, Math.floor(Number(tabId) || 0));
  if (!id) return;
  for (const [key, entry] of [...scriptExecutionSettlements]) {
    if (key === `logical:content:${id}` || key === `logical:frame-agent:${id}:all` || key.startsWith(`tab:${id}|`)) {
      clearScriptExecutionSettlement(key, entry);
    }
  }
}

function waitForScriptExecutionSettlement(entry, label, timeoutMs = SCRIPT_EXECUTION_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };
    const timer = setTimeout(() => {
      entry.timedOut = true;
      finish(reject, makeScriptExecutionPendingError(label));
    }, Math.max(1, Number(timeoutMs) || SCRIPT_EXECUTION_TIMEOUT_MS));
    entry.raw.then((result) => finish(resolve, result), (error) => finish(reject, error));
  });
}

async function executeScriptSingletonBounded(details, { requestKey = '', label = 'Инъекция скрипта Chrome', timeoutMs = SCRIPT_EXECUTION_TIMEOUT_MS } = {}) {
  const key = scriptExecutionRequestKey(details, requestKey);
  const existing = scriptExecutionSettlements.get(key);
  if (existing) {
    if (existing.hasLateSuccess) {
      const result = existing.lateSuccess;
      clearScriptExecutionSettlement(key, existing);
      return result;
    }
    const result = await waitForScriptExecutionSettlement(existing, `${label}: ожидание уже начатого scripting.executeScript()`, timeoutMs);
    if (existing.timedOut) clearScriptExecutionSettlement(key, existing);
    return result;
  }

  let raw;
  try { raw = Promise.resolve(chrome.scripting.executeScript(details)); }
  catch (error) { raw = Promise.reject(error); }
  const entry = { raw, timedOut: false, hasLateSuccess: false, lateSuccess: null, cleanupTimer: 0 };
  scriptExecutionSettlements.set(key, entry);
  raw.then(
    (result) => {
      if (scriptExecutionSettlements.get(key) !== entry) return;
      if (entry.timedOut) {
        entry.hasLateSuccess = true;
        entry.lateSuccess = result;
        entry.cleanupTimer = setTimeout(() => clearScriptExecutionSettlement(key, entry), SCRIPT_EXECUTION_LATE_SUCCESS_TTL_MS);
      } else {
        clearScriptExecutionSettlement(key, entry);
      }
    },
    () => {
      if (scriptExecutionSettlements.get(key) === entry) clearScriptExecutionSettlement(key, entry);
    }
  );
  return waitForScriptExecutionSettlement(entry, label, timeoutMs);
}
function makeTabCreatePendingError(label = 'Создание вкладки Chrome') {
  const error = new Error(`${label} ещё выполняется Chrome. WebClip не запускает повтор, пока исходный tabs.create() не завершится, чтобы не создать дубликат вкладки.`);
  error.code = 'WEBCLIP_TAB_CREATE_PENDING';
  return error;
}

function tabCreateRequestKey(sourceTabId, url, active = true, requestKey = '') {
  const explicit = String(requestKey || '').trim();
  if (explicit) return `logical:${explicit.slice(0, 512)}`;
  const source = Math.max(0, Math.floor(Number(sourceTabId) || 0));
  return `source:${source}|active:${active !== false ? 1 : 0}|url:${String(url || '').slice(0, 8192)}`;
}

function clearTabCreateSettlement(key, entry) {
  if (entry?.cleanupTimer) clearTimeout(entry.cleanupTimer);
  if (tabCreateSettlements.get(key) === entry) tabCreateSettlements.delete(key);
}

function waitForTabCreateSettlement(entry, label, timeoutMs = TAB_CREATE_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };
    const timer = setTimeout(() => {
      entry.timedOut = true;
      finish(reject, makeTabCreatePendingError(label));
    }, Math.max(1, Number(timeoutMs) || TAB_CREATE_TIMEOUT_MS));
    entry.raw.then(
      (tab) => finish(resolve, tab),
      (error) => finish(reject, error)
    );
  });
}

async function createChromeTabBounded(create, { sourceTabId = 0, requestKey = '', label = 'Создание вкладки Chrome' } = {}) {
  const key = tabCreateRequestKey(sourceTabId, create?.url || '', create?.active !== false, requestKey);
  const existing = tabCreateSettlements.get(key);
  if (existing) {
    // A previous local timeout may already have settled successfully in
    // Chrome. Consume that late receipt once instead of creating a new
    // tab for the user's retry.
    if (existing.lateSuccess) {
      const tab = existing.lateSuccess;
      clearTabCreateSettlement(key, existing);
      return tab;
    }
    const tab = await waitForTabCreateSettlement(existing, `${label}: ожидание уже начатого tabs.create()`);
    // If this caller observed the settlement of an earlier timed-out
    // attempt, the result is now known and no longer needs a dedupe receipt.
    if (existing.timedOut) clearTabCreateSettlement(key, existing);
    return tab;
  }

  let raw;
  try { raw = Promise.resolve(chrome.tabs.create(create)); }
  catch (error) { raw = Promise.reject(error); }
  const entry = { raw, timedOut: false, settled: false, lateSuccess: null, error: null, cleanupTimer: 0 };
  tabCreateSettlements.set(key, entry);

  raw.then(
    (tab) => {
      entry.settled = true;
      if (entry.timedOut && tab) {
        // tabs.create() is non-cancellable. Preserve one late-success
        // receipt so an immediate identical retry returns the original
        // tab instead of creating a duplicate. The receipt is bounded.
        entry.lateSuccess = tab;
        entry.cleanupTimer = setTimeout(() => clearTabCreateSettlement(key, entry), TAB_CREATE_LATE_SUCCESS_TTL_MS);
      } else {
        clearTabCreateSettlement(key, entry);
      }
    },
    (error) => {
      entry.settled = true;
      entry.error = error;
      clearTabCreateSettlement(key, entry);
    }
  );

  return waitForTabCreateSettlement(entry, label);
}

function getChromeTabBounded(tabId, label = 'Чтение вкладки Chrome', timeoutMs = TAB_GET_TIMEOUT_MS) {
  const id = Math.max(0, Math.floor(Number(tabId) || 0));
  if (!id) {
    const error = new Error('Не указан корректный tabId для Chrome tabs.get().');
    error.code = 'WEBCLIP_INVALID_TAB_ID';
    return Promise.reject(error);
  }
  return withOperationTimeout(
    Promise.resolve().then(() => chrome.tabs.get(id)),
    Math.max(1, Number(timeoutMs) || TAB_GET_TIMEOUT_MS),
    label
  );
}
async function createTabNextTo(sourceTabId, url, active = true, requestKey = '') {
  const create = { url, active };
  const id = Number(sourceTabId || 0);
  if (id > 0) {
    try {
      const source = await getChromeTabBounded(id, 'Определение позиции новой вкладки');
      if (Number.isInteger(source?.index)) {
        create.index = source.index + 1;
        if (source.windowId != null) create.windowId = source.windowId;
      }
    } catch (_) {}
  }
  return createChromeTabBounded(create, {
    sourceTabId: id,
    requestKey,
    label: 'Создание вкладки Chrome'
  });
}

const CONTENT_SCRIPT_MESSAGE_TYPES = new Set([
  'WEBCLIP_GENERATE_PDF',
  'WEBCLIP_SEND_PDF_TO_YANDEX',
  'WEBCLIP_RETRY_PDF_TO_YANDEX',
  'WEBCLIP_DOWNLOAD_CACHED_PDF',
  'WEBCLIP_INVALIDATE_PDF_CACHE',
  'WEBCLIP_JOURNAL_LIST',
  'WEBCLIP_OPEN_JOURNAL_SAVED_FILE',
  'WEBCLIP_OPEN_OPTIONS',
  'WEBCLIP_OPEN_URL',
  'WEBCLIP_FRAME_AGENT_REGISTER',
  'WEBCLIP_FRAME_AGENT_STATE',
  'WEBCLIP_FRAME_AGENT_LIST',
  'WEBCLIP_FRAME_AGENT_TARGET'
]);

function runtimeSenderKind(sender) {
  if (sender?.id !== chrome.runtime.id) return 'external';
  const senderUrl = String(sender?.url || sender?.origin || '');
  if (senderUrl.startsWith(chrome.runtime.getURL(''))) return 'extension';
  if (sender?.tab?.id && /^https?:\/\//i.test(senderUrl || String(sender.tab?.url || ''))) return 'content';
  // Service worker / offscreen extension contexts may not expose sender.url.
  if (!sender?.tab) return 'extension';
  return 'unknown';
}

function extensionPagePath(sender) {
  const raw = String(sender?.url || sender?.origin || '');
  if (!raw.startsWith(chrome.runtime.getURL(''))) return '';
  try {
    const url = new URL(raw);
    return url.pathname.replace(/^\/+/, '');
  } catch (_) {
    return '';
  }
}

function assertSaveAsOwnerPage(sender, expectedPage = '') {
  const page = extensionPagePath(sender);
  if (!page || (expectedPage && page !== expectedPage)) {
    throw new Error(`Native Save As доступен только странице ${expectedPage || 'расширения WebClip'}.`);
  }
  return page;
}

function normalizePreparedSaveAsBlobUrl(value) {
  const raw = String(value || '');
  const prefix = `blob:${chrome.runtime.getURL('')}`;
  if (!raw || raw.length > 2048 || !raw.startsWith(prefix)) {
    throw new Error('Некорректный временный Blob URL Save As.');
  }
  return raw;
}

function assertRuntimeMessageSender(type, sender) {
  const kind = runtimeSenderKind(sender);
  if (kind === 'extension') return kind;
  if (kind === 'content' && CONTENT_SCRIPT_MESSAGE_TYPES.has(type)) {
    if (sender?.tab?.incognito && !['WEBCLIP_INVALIDATE_PDF_CACHE', 'WEBCLIP_OPEN_OPTIONS'].includes(type)) {
      throw new Error('WebClip не сохраняет и не раскрывает данные журнала в режиме Инкогнито. Откройте обычное окно Chrome для работы с журналом/PDF.');
    }
    return kind;
  }
  throw new Error(`Команда ${String(type || '')} недоступна из этого контекста.`);
}

function isAllowedContentOpenUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    return host === 'disk.yandex.ru' || host.endsWith('.disk.yandex.ru') || host === 'yadi.sk';
  } catch (_) {
    return false;
  }
}

function boundedYandexExternalText(value, maxChars, { rejectOverflow = false, label = 'поле ответа Яндекс' } = {}) {
  const text = String(value == null ? '' : value);
  const limit = Math.max(0, Number(maxChars) || 0);
  if (text.length <= limit) return text;
  if (rejectOverflow) {
    const error = new Error(`${label} превышает безопасный предел WebClip.`);
    error.code = 'YANDEX_RESPONSE_METADATA_TOO_LARGE';
    throw error;
  }
  return text.slice(0, limit);
}

function normalizeYandexPublicUrlFromApi(value) {
  const raw = boundedYandexExternalText(value, MAX_YANDEX_PUBLIC_URL_CHARS, {
    rejectOverflow: true,
    label: 'Публичная ссылка Яндекс Диска'
  }).trim();
  if (!raw) return '';
  if (!isAllowedContentOpenUrl(raw)) {
    const error = new Error('Яндекс Диск вернул некорректную публичную ссылку.');
    error.code = 'YANDEX_PUBLIC_URL_INVALID';
    throw error;
  }
  return new URL(raw).toString();
}

function normalizeYandexSignedTransferUrl(value) {
  const raw = boundedYandexExternalText(value, MAX_YANDEX_SIGNED_URL_CHARS, {
    rejectOverflow: true,
    label: 'Подписанный адрес передачи Яндекс Диска'
  }).trim();
  let url;
  try { url = new URL(raw); } catch (_) { url = null; }
  const host = url?.hostname?.toLowerCase?.() || '';
  if (!url || url.protocol !== 'https:' || !(host === 'disk.yandex.net' || host.endsWith('.disk.yandex.net'))) {
    const error = new Error('Яндекс Диск вернул некорректный подписанный адрес передачи.');
    error.code = 'YANDEX_SIGNED_URL_INVALID';
    throw error;
  }
  return url.toString();
}

function normalizeYandexResourceIdFromApi(value) {
  return boundedYandexExternalText(value, MAX_YANDEX_RESOURCE_ID_CHARS, {
    rejectOverflow: true,
    label: 'resourceId Яндекс Диска'
  }).trim();
}

function normalizeYandexDiskPathFromApi(value) {
  const raw = boundedYandexExternalText(value, MAX_YANDEX_ITEM_PATH_CHARS, {
    rejectOverflow: true,
    label: 'Путь ресурса Яндекс Диска'
  });
  return normalizeDiskPath(raw.replace(/^disk:/i, ''));
}

function normalizeYandexItemNameFromApi(value) {
  return boundedYandexExternalText(value, MAX_YANDEX_ITEM_NAME_CHARS, {
    rejectOverflow: true,
    label: 'Имя ресурса Яндекс Диска'
  });
}

function normalizeYandexNonNegativeNumber(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function requirePositiveByteSize(value, label = 'Ожидаемый размер файла') {
  const bytes = Number(value);
  if (!Number.isSafeInteger(bytes) || bytes <= 0) {
    const error = new Error(`${label} отсутствует или некорректен; подтверждать удалённое сохранение небезопасно.`);
    error.code = 'YANDEX_EXPECTED_SIZE_INVALID';
    throw error;
  }
  return bytes;
}

function assertExactYandexRemoteByteSize(expectedValue, actualValue, label = 'Удалённый файл') {
  const expectedBytes = requirePositiveByteSize(expectedValue, `Ожидаемый размер: ${label}`);
  const actualBytes = Number(actualValue);
  if (!Number.isSafeInteger(actualBytes) || actualBytes <= 0) {
    const error = new Error(`${label}: Яндекс Диск не вернул подтверждённый положительный размер файла (${String(actualValue ?? '') || 'нет значения'}).`);
    error.code = 'YANDEX_REMOTE_SIZE_UNVERIFIED';
    throw error;
  }
  if (actualBytes !== expectedBytes) {
    const error = new Error(`${label}: размер на Яндекс Диске не совпадает с ожидаемым (${actualBytes} вместо ${expectedBytes} байт).`);
    error.code = 'YANDEX_REMOTE_SIZE_MISMATCH';
    throw error;
  }
  return actualBytes;
}

function normalizeYandexOAuthExpiresIn(value) {
  if (value == null || value === '') return 0;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > Number.MAX_SAFE_INTEGER / 1000) {
    const error = new Error('Яндекс OAuth вернул некорректный срок действия токена.');
    error.code = 'YANDEX_OAUTH_RESPONSE_INVALID';
    throw error;
  }
  return seconds;
}

function normalizeYandexSignedMethod(value, fallback = 'GET') {
  const method = boundedYandexExternalText(value || fallback, 16, { rejectOverflow: true, label: 'HTTP-метод Яндекс Диска' }).toUpperCase();
  if (method !== 'GET' && method !== 'PUT') {
    const error = new Error('Яндекс Диск вернул неподдерживаемый HTTP-метод передачи.');
    error.code = 'YANDEX_SIGNED_METHOD_INVALID';
    throw error;
  }
  return method;
}

const MAX_OPERATION_ID_CHARS = 160;
const MAX_CONTENT_TITLE_CHARS = 4000;
const MAX_CONTENT_COMMENT_CHARS = 100000;
const MAX_PDF_RESOURCE_REPORT_FAILURES = 40;
const MAX_PDF_RESOURCE_REPORT_LABEL_CHARS = 500;
const MAX_PAGE_ANALYSIS_JSON_CHARS = 48 * 1024;
const MAX_PAGE_ANALYSIS_ITEMS = 16;
const MAX_PAGE_ANALYSIS_ANCESTORS = 10;

function normalizeOperationIdInput(value) {
  const id = String(value || '').trim();
  if (!id) return '';
  if (id.length > MAX_OPERATION_ID_CHARS || !/^[A-Za-z0-9._:-]+$/.test(id)) {
    throw new Error('Некорректный operationId.');
  }
  return id;
}

function boundedContentString(value, maxChars) {
  const text = String(value ?? '');
  return text.length > maxChars ? text.slice(0, maxChars) : text;
}

function sanitizePdfResourceDiagnosticLabel(value, kind = 'resource') {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^data:/i.test(text)) return '[data-url]';
  if (/^blob:/i.test(text)) return '[blob-url]';
  if (kind === 'font' && !/^[a-z][a-z0-9+.-]*:/i.test(text)) {
    return text.slice(0, MAX_PDF_RESOURCE_REPORT_LABEL_CHARS);
  }
  try {
    const url = new URL(text);
    if (!['http:', 'https:'].includes(url.protocol)) return `[${url.protocol.replace(':', '') || 'resource'}-url]`;
    return `${url.origin}${url.pathname}`.slice(0, MAX_PDF_RESOURCE_REPORT_LABEL_CHARS);
  } catch (_) {
    return text.replace(/[?#].*$/, '').slice(0, MAX_PDF_RESOURCE_REPORT_LABEL_CHARS);
  }
}

function sanitizePdfResourceReport(rawReport) {
  if (!rawReport || typeof rawReport !== 'object' || Array.isArray(rawReport) || Number(rawReport.version || 0) < 1) return null;
  const raw = rawReport;
  const count = (value, max = 1_000_000) => Math.max(0, Math.min(max, Math.floor(Number(value) || 0)));
  const failures = Array.isArray(raw.failures) ? raw.failures.slice(0, MAX_PDF_RESOURCE_REPORT_FAILURES) : [];
  return {
    version: 1,
    limit: count(raw.limit, 500),
    deadlineMs: count(raw.deadlineMs, 60_000),
    attempted: count(raw.attempted),
    loaded: count(raw.loaded),
    failed: count(raw.failed),
    omittedByLimit: count(raw.omittedByLimit),
    scanTruncated: Boolean(raw.scanTruncated),
    deadlineExceeded: Boolean(raw.deadlineExceeded),
    elapsedMs: count(raw.elapsedMs, 60_000),
    failures: failures.map((item) => {
      const kind = ['image', 'background', 'font'].includes(String(item?.kind)) ? String(item.kind) : 'resource';
      return {
        kind,
        resource: sanitizePdfResourceDiagnosticLabel(item?.resource || '', kind),
        reason: boundedContentString(item?.reason || 'load-error', 160)
      };
    })
  };
}

function pageDiagnosticString(value, maxChars = 240) {
  return boundedContentString(value, Math.max(0, Math.min(1000, Number(maxChars) || 0)));
}

function pageDiagnosticCount(value, max = 100_000_000) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(max, Math.round(number * 100) / 100));
}

function sanitizePageDiagnosticStyle(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    display: pageDiagnosticString(source.display, 80),
    visibility: pageDiagnosticString(source.visibility, 80),
    opacity: pageDiagnosticString(source.opacity, 40),
    position: pageDiagnosticString(source.position, 80),
    overflowX: pageDiagnosticString(source.overflowX, 80),
    overflowY: pageDiagnosticString(source.overflowY, 80),
    contentVisibility: pageDiagnosticString(source.contentVisibility, 80),
    contain: pageDiagnosticString(source.contain, 160),
    transform: source.transform === 'present' ? 'present' : 'none'
  };
}

function sanitizePageDiagnosticNode(raw, { ancestor = false } = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const classes = Array.isArray(raw.classes)
    ? raw.classes.slice(0, 8).map((value) => pageDiagnosticString(value, 120))
    : [];
  const safe = {
    tag: pageDiagnosticString(raw.tag, 80),
    id: pageDiagnosticString(raw.id, 160),
    classes,
    style: sanitizePageDiagnosticStyle(raw.style)
  };
  if (ancestor) return safe;
  const rect = raw.rect && typeof raw.rect === 'object' && !Array.isArray(raw.rect) ? raw.rect : null;
  safe.kind = raw.kind === 'exclude' ? 'exclude' : 'include';
  safe.index = pageDiagnosticCount(raw.index, 1000);
  safe.role = pageDiagnosticString(raw.role, 120);
  safe.topDocument = Boolean(raw.topDocument);
  safe.frameDepth = pageDiagnosticCount(raw.frameDepth, 32);
  safe.isBody = Boolean(raw.isBody);
  safe.connected = Boolean(raw.connected);
  safe.childElementCount = pageDiagnosticCount(raw.childElementCount, 1_000_000);
  safe.textChars = pageDiagnosticCount(raw.textChars, 10_000_000);
  safe.rect = rect ? {
    x: Math.max(-100_000_000, Math.min(100_000_000, Number(rect.x) || 0)),
    y: Math.max(-100_000_000, Math.min(100_000_000, Number(rect.y) || 0)),
    width: pageDiagnosticCount(rect.width),
    height: pageDiagnosticCount(rect.height)
  } : null;
  safe.scrollWidth = pageDiagnosticCount(raw.scrollWidth);
  safe.scrollHeight = pageDiagnosticCount(raw.scrollHeight);
  safe.ancestors = Array.isArray(raw.ancestors)
    ? raw.ancestors.slice(0, MAX_PAGE_ANALYSIS_ANCESTORS).map((item) => sanitizePageDiagnosticNode(item, { ancestor: true })).filter(Boolean)
    : [];
  return safe;
}

function sanitizePageDiagnosticRootLayout(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const style = raw.style && typeof raw.style === 'object' && !Array.isArray(raw.style) ? raw.style : {};
  const rect = raw.rect && typeof raw.rect === 'object' && !Array.isArray(raw.rect) ? raw.rect : null;
  return {
    tag: pageDiagnosticString(raw.tag, 16),
    style: {
      display: pageDiagnosticString(style.display, 80),
      position: pageDiagnosticString(style.position, 80),
      width: pageDiagnosticString(style.width, 120),
      minWidth: pageDiagnosticString(style.minWidth, 120),
      maxWidth: pageDiagnosticString(style.maxWidth, 120),
      height: pageDiagnosticString(style.height, 120),
      minHeight: pageDiagnosticString(style.minHeight, 120),
      maxHeight: pageDiagnosticString(style.maxHeight, 120),
      overflowX: pageDiagnosticString(style.overflowX, 80),
      overflowY: pageDiagnosticString(style.overflowY, 80),
      contain: pageDiagnosticString(style.contain, 160),
      contentVisibility: pageDiagnosticString(style.contentVisibility, 80),
      transform: style.transform === 'present' ? 'present' : 'none',
      top: pageDiagnosticString(style.top, 120),
      right: pageDiagnosticString(style.right, 120),
      bottom: pageDiagnosticString(style.bottom, 120),
      left: pageDiagnosticString(style.left, 120),
      clipPath: pageDiagnosticString(style.clipPath, 160)
    },
    rect: rect ? {
      width: pageDiagnosticCount(rect.width),
      height: pageDiagnosticCount(rect.height),
      top: pageDiagnosticCount(rect.top),
      right: pageDiagnosticCount(rect.right),
      bottom: pageDiagnosticCount(rect.bottom),
      left: pageDiagnosticCount(rect.left)
    } : null,
    scrollWidth: pageDiagnosticCount(raw.scrollWidth),
    scrollHeight: pageDiagnosticCount(raw.scrollHeight),
    clientWidth: pageDiagnosticCount(raw.clientWidth),
    clientHeight: pageDiagnosticCount(raw.clientHeight),
    offsetWidth: pageDiagnosticCount(raw.offsetWidth),
    offsetHeight: pageDiagnosticCount(raw.offsetHeight)
  };
}

function sanitizePageStructureDiagnostics(rawDiagnostics) {
  if (!rawDiagnostics || typeof rawDiagnostics !== 'object' || Array.isArray(rawDiagnostics) || Number(rawDiagnostics.version || 0) < 1) return null;
  const raw = rawDiagnostics;
  const doc = raw.document && typeof raw.document === 'object' && !Array.isArray(raw.document) ? raw.document : {};
  const selection = raw.selection && typeof raw.selection === 'object' && !Array.isArray(raw.selection) ? raw.selection : {};
  const print = raw.print && typeof raw.print === 'object' && !Array.isArray(raw.print) ? raw.print : {};
  const safe = {
    version: 1,
    phase: pageDiagnosticString(raw.phase, 80),
    capturedAt: pageDiagnosticCount(raw.capturedAt, Number.MAX_SAFE_INTEGER),
    document: {
      readyState: pageDiagnosticString(doc.readyState, 40),
      compatMode: pageDiagnosticString(doc.compatMode, 40),
      visibilityState: pageDiagnosticString(doc.visibilityState, 40),
      bodyChildElementCount: pageDiagnosticCount(doc.bodyChildElementCount, 1_000_000),
      bodyTextChars: pageDiagnosticCount(doc.bodyTextChars, 10_000_000),
      bodyScrollWidth: pageDiagnosticCount(doc.bodyScrollWidth),
      bodyScrollHeight: pageDiagnosticCount(doc.bodyScrollHeight),
      documentScrollWidth: pageDiagnosticCount(doc.documentScrollWidth),
      documentScrollHeight: pageDiagnosticCount(doc.documentScrollHeight),
      viewportWidth: pageDiagnosticCount(doc.viewportWidth),
      viewportHeight: pageDiagnosticCount(doc.viewportHeight),
      rootLayout: {
        html: sanitizePageDiagnosticRootLayout(doc?.rootLayout?.html),
        body: sanitizePageDiagnosticRootLayout(doc?.rootLayout?.body)
      }
    },
    selection: {
      includeCount: pageDiagnosticCount(selection.includeCount, 1000),
      excludeCount: pageDiagnosticCount(selection.excludeCount, 1000),
      localIncludeCount: pageDiagnosticCount(selection.localIncludeCount, 1000),
      localExcludeCount: pageDiagnosticCount(selection.localExcludeCount, 1000),
      remoteIncludeCount: pageDiagnosticCount(selection.remoteIncludeCount, 1000),
      remoteExcludeCount: pageDiagnosticCount(selection.remoteExcludeCount, 1000),
      bodyIncluded: Boolean(selection.bodyIncluded),
      topDocumentIncludeCount: pageDiagnosticCount(selection.topDocumentIncludeCount, 1000),
      frameDocumentCount: pageDiagnosticCount(selection.frameDocumentCount, 256),
      items: Array.isArray(selection.items)
        ? selection.items.slice(0, MAX_PAGE_ANALYSIS_ITEMS).map((item) => sanitizePageDiagnosticNode(item)).filter(Boolean)
        : [],
      itemsTruncated: Boolean(selection.itemsTruncated)
    },
    print: {
      headerConnected: Boolean(print.headerConnected),
      printStyleDocuments: pageDiagnosticCount(print.printStyleDocuments, 256),
      uiHidden: Boolean(print.uiHidden),
      remotePreparedCount: pageDiagnosticCount(print.remotePreparedCount, 256),
      frameMeasurements: (Array.isArray(print.frameMeasurements) ? print.frameMeasurements : []).slice(0, MAX_PAGE_ANALYSIS_ITEMS).map((item) => ({
        reason: pageDiagnosticString(item?.reason, 32),
        pass: pageDiagnosticCount(item?.pass, 8),
        depth: pageDiagnosticCount(item?.depth, 32),
        sameOrigin: Boolean(item?.sameOrigin),
        screenWidth: pageDiagnosticCount(item?.screenWidth, 200000),
        measureWidth: pageDiagnosticCount(item?.measureWidth, 200000),
        measuredHeight: pageDiagnosticCount(item?.measuredHeight, 200000),
        appliedHeight: pageDiagnosticCount(item?.appliedHeight, 200000)
      })),
      flattenedFrames: (Array.isArray(print.flattenedFrames) ? print.flattenedFrames : []).slice(0, MAX_PAGE_ANALYSIS_ITEMS).map((item) => ({
        mode: pageDiagnosticString(item?.mode, 48),
        mount: pageDiagnosticString(item?.mount, 48),
        depth: pageDiagnosticCount(item?.depth, 32),
        sameOrigin: Boolean(item?.sameOrigin),
        sourceTextChars: pageDiagnosticCount(item?.sourceTextChars, 100000000),
        cloneElementCount: pageDiagnosticCount(item?.cloneElementCount, 100000),
        styledElementCount: pageDiagnosticCount(item?.styledElementCount, 100000),
        removedScripts: pageDiagnosticCount(item?.removedScripts, 100000),
        removedExcludes: pageDiagnosticCount(item?.removedExcludes, 100000),
        styleBudgetTruncated: Boolean(item?.styleBudgetTruncated)
      }))
    }
  };
  if (jsonSizeChars(safe) > MAX_PAGE_ANALYSIS_JSON_CHARS) {
    safe.selection.items = safe.selection.items.slice(0, 4);
    safe.selection.itemsTruncated = true;
    safe.truncated = true;
  }
  return safe;
}

function sanitizePrintStructureDiagnostics(rawDiagnostics) {
  const raw = rawDiagnostics && typeof rawDiagnostics === 'object' && !Array.isArray(rawDiagnostics) ? rawDiagnostics : {};
  return {
    beforePrint: sanitizePageStructureDiagnostics(raw.beforePrint),
    afterPrint: sanitizePageStructureDiagnostics(raw.afterPrint),
    current: sanitizePageStructureDiagnostics(raw.current),
    unavailable: Boolean(raw.unavailable),
    error: pageDiagnosticString(raw.error, 1000)
  };
}

function sanitizeContentSaveMeta(rawMeta, sender) {
  const raw = rawMeta && typeof rawMeta === 'object' && !Array.isArray(rawMeta) ? rawMeta : {};
  const tabUrl = String(sender?.tab?.url || sender?.url || '');
  let parsed;
  try {
    parsed = new URL(tabUrl);
  } catch (_) {
    throw new Error('Не удалось определить URL страницы для сохранения.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Сохранение PDF разрешено только для HTTP/HTTPS страниц.');
  }
  return {
    hostname: parsed.hostname.toLowerCase().slice(0, 255),
    siteAddress: parsed.origin.slice(0, 2048),
    url: parsed.toString().slice(0, MAX_IMPORTED_URL_CHARS),
    title: boundedContentString(raw.title || 'Без названия', MAX_CONTENT_TITLE_CHARS),
    localDateTime: boundedContentString(raw.localDateTime, 128),
    filenameTimestamp: boundedContentString(raw.filenameTimestamp, 128),
    readingMode: raw.readingMode === 'later' ? 'later' : 'read',
    fileComment: boundedContentString(raw.fileComment, MAX_CONTENT_COMMENT_CHARS),
    selectionSnapshot: sanitizeSelectionSnapshot(raw.selectionSnapshot, { rejectOverflow: true }),
    resourceReport: sanitizePdfResourceReport(raw.resourceReport),
    pageAnalysis: sanitizePageStructureDiagnostics(raw.pageAnalysis)
  };
}

function journalEntryForContentTemplate(entry) {
  const snapshot = sanitizeSelectionSnapshot(entry?.selectionSnapshot || {});
  return {
    id: boundedContentString(entry?.id, 160),
    createdAt: Number(entry?.createdAt || 0),
    operationDateTime: boundedContentString(entry?.operationDateTime, 128),
    destination: entry?.destination === 'yandex' ? 'yandex' : 'download',
    readingMode: entry?.destination === 'yandex' && entry?.readingMode === 'later' ? 'later' : 'read',
    filename: boundedContentString(entry?.filename, 512),
    title: boundedContentString(entry?.title, MAX_CONTENT_TITLE_CHARS),
    url: normalizeImportedHttpUrl(entry?.url || ''),
    includeCount: snapshot.includes.length,
    excludeCount: snapshot.excludes.length,
    selectionSnapshot: snapshot,
    hasPublicUrl: Boolean(entry?.destination === 'yandex' && normalizeImportedHttpsUrl(entry?.publicUrl || ''))
  };
}

function boundContentJournalTemplateEntries(entries) {
  const result = [];
  let approximateChars = 2;
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (result.length >= MAX_CONTENT_JOURNAL_TEMPLATE_ENTRIES) break;
    const safe = journalEntryForContentTemplate(entry);
    let size = 0;
    try { size = JSON.stringify(safe).length; } catch (_) { continue; }
    if (size > MAX_CONTENT_JOURNAL_TEMPLATE_RESPONSE_CHARS) continue;
    if (approximateChars + size > MAX_CONTENT_JOURNAL_TEMPLATE_RESPONSE_CHARS) break;
    result.push(safe);
    approximateChars += size + 1;
  }
  return result;
}

let journalDestructiveMutationInFlight = '';

async function runExclusiveJournalDestructiveMutation(label, task) {
  if (journalDestructiveMutationInFlight) {
    const error = new Error(`Другая destructive-операция журнала уже выполняется: ${journalDestructiveMutationInFlight}. Дождитесь её завершения и повторите.`);
    error.code = 'JOURNAL_DESTRUCTIVE_BUSY';
    throw error;
  }
  journalDestructiveMutationInFlight = String(label || 'изменение журнала');
  try {
    return await task();
  } finally {
    journalDestructiveMutationInFlight = '';
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message?.type) {
    return false;
  }

  const asyncHandler = async () => {
    await ensureStorageAccessInitialized();
    const senderKind = assertRuntimeMessageSender(message.type, sender);
    switch (message.type) {
      case 'WEBCLIP_ENABLE_FRAME_AGENTS': {
        if (senderKind !== 'extension') throw new Error('Подключение iframe разрешено только UI расширения.');
        return enableFrameAgentsForTab(message.tabId);
      }

      case 'WEBCLIP_FRAME_AGENT_REGISTER': {
        if (senderKind !== 'content' || Number(sender?.frameId || 0) <= 0) throw new Error('Регистрация frame-agent разрешена только дочернему frame.');
        return registerFrameAgent(sender);
      }

      case 'WEBCLIP_FRAME_AGENT_STATE': {
        if (senderKind !== 'content' || Number(sender?.frameId || 0) <= 0) throw new Error('Состояние frame-agent разрешено только дочернему frame.');
        return forwardFrameAgentState(message, sender);
      }

      case 'WEBCLIP_FRAME_AGENT_LIST': {
        if (senderKind !== 'content' || Number(sender?.frameId || 0) !== 0) throw new Error('Список iframe доступен только top-frame content script.');
        return { ok: true, frames: listRegisteredFrameAgents(sender.tab?.id) };
      }

      case 'WEBCLIP_FRAME_AGENT_TARGET': {
        if (senderKind !== 'content' || Number(sender?.frameId || 0) !== 0) throw new Error('Управление iframe доступно только top-frame content script.');
        return sendFrameAgentCommand(sender.tab?.id, message.frameId, message.command, {
          mode: message.mode,
          clear: Boolean(message.clear),
          kind: message.kind === 'exclude' ? 'exclude' : 'include',
          locator: message.locator && typeof message.locator === 'object' ? message.locator : undefined
        });
      }

      case 'WEBCLIP_OFFSCREEN_IDLE_CLOSE_REQUEST': {
        if (String(sender?.url || '') !== chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)) {
          throw new Error('Закрытие offscreen разрешено только offscreen-документу WebClip.');
        }
        const nonce = Math.max(0, Math.floor(Number(message.nonce) || 0));
        return closeOffscreenDocumentIfIdle(nonce);
      }

      case 'WEBCLIP_OFFSCREEN_TRANSFER_HEARTBEAT': {
        if (String(sender?.url || '') !== chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)) {
          throw new Error('Transfer heartbeat разрешён только offscreen-документу WebClip.');
        }
        const operationId = normalizeOperationIdInput(message.operationId);
        if (operationId) {
          appendOperationLogEvent(operationId, {
            category: 'transfer-heartbeat', level: 'info', stage: 'transfer',
            message: 'Offscreen transfer продолжает выполняться.',
            data: {
              transferId: boundedContentString(message.transferId, 160),
              elapsedMs: Math.max(0, Math.min(5 * 60 * 1000, Number(message.elapsedMs) || 0))
            }
          });
        }
        return { ok: true };
      }

      case 'WEBCLIP_GENERATE_PDF': {
        const tabId = sender.tab?.id;
        if (!tabId) throw new Error('Не удалось определить вкладку для формирования PDF.');
        return generatePdfAndDownload(tabId, sanitizeContentSaveMeta(message.meta, sender), normalizeOperationIdInput(message.operationId));
      }

      case 'WEBCLIP_SEND_PDF_TO_YANDEX': {
        const tabId = sender.tab?.id;
        if (!tabId) throw new Error('Не удалось определить вкладку для формирования PDF.');
        return generatePdfAndUploadToYandex(tabId, sanitizeContentSaveMeta(message.meta, sender), normalizeOperationIdInput(message.operationId));
      }

      case 'WEBCLIP_RETRY_PDF_TO_YANDEX': {
        const tabId = sender.tab?.id;
        if (!tabId) throw new Error('Не удалось определить вкладку для повторной отправки PDF.');
        const currentSourceReceipt = await captureCurrentPdfRetrySourceReceipt(sender);
        return retryCachedPdfUploadToYandex(tabId, normalizeOperationIdInput(message.operationId), currentSourceReceipt);
      }

      case 'WEBCLIP_DOWNLOAD_CACHED_PDF': {
        const tabId = sender.tab?.id;
        if (!tabId) throw new Error('Не удалось определить вкладку для скачивания PDF.');
        const currentSourceReceipt = await captureCurrentPdfRetrySourceReceipt(sender);
        return downloadCachedPdf(tabId, normalizeOperationIdInput(message.operationId), currentSourceReceipt);
      }

      case 'WEBCLIP_INVALIDATE_PDF_CACHE': {
        const tabId = sender.tab?.id;
        if (tabId) await invalidatePdfRetryForTab(tabId);
        return { ok: true };
      }

      case 'WEBCLIP_JOURNAL_PING':
        return { ok: true, version: chrome.runtime.getManifest().version };

      case 'WEBCLIP_OPEN_JOURNAL_PAGE':
        return openJournalPage({
          mode: message.mode,
          sourceTabId: message.sourceTabId,
          sourceUrl: message.sourceUrl,
          anchorTabId: message.anchorTabId
        });

      case 'WEBCLIP_JOURNAL_LIST': {
        if (senderKind === 'content') {
          const currentUrl = String(sender?.tab?.url || sender?.url || '');
          const siteMode = Boolean(message.siteUrl) && !message.url;
          const listed = await listJournalEntries({
            url: siteMode ? '' : currentUrl,
            siteUrl: siteMode ? currentUrl : '',
            limit: Math.min(MAX_CONTENT_JOURNAL_TEMPLATE_ENTRIES, Math.max(1, Number(message.limit) || MAX_CONTENT_JOURNAL_TEMPLATE_ENTRIES))
          });
          return { ...listed, entries: boundContentJournalTemplateEntries(listed?.entries) };
        }
        return listJournalEntries({
          url: message.url || '',
          siteUrl: message.siteUrl || '',
          limit: message.limit || 500
        });
      }

      case 'WEBCLIP_JOURNAL_VIEW_META': {
        if (senderKind !== 'extension') throw new Error('Metadata представления журнала доступна только страницам расширения.');
        return scanJournalViewMeta({
          sourceUrl: message.source,
          readingFilter: message.readingFilter,
          domainSearch: message.domainSearch,
          textFilter: message.textFilter,
          includeDomains: message.includeDomains !== false
        });
      }

      case 'WEBCLIP_JOURNAL_VIEW_PAGE': {
        if (senderKind !== 'extension') throw new Error('Постраничное чтение журнала доступно только страницам расширения.');
        return queryJournalViewPage(message);
      }

      case 'WEBCLIP_JOURNAL_VIEW_GROUPS': {
        if (senderKind !== 'extension') throw new Error('Чтение URL-групп журнала доступно только страницам расширения.');
        return queryJournalViewGroups(message);
      }

      case 'WEBCLIP_JOURNAL_VIEW_GROUP_ENTRIES': {
        if (senderKind !== 'extension') throw new Error('Чтение записей URL-группы доступно только страницам расширения.');
        return queryJournalViewGroupEntries(message);
      }

      case 'WEBCLIP_JOURNAL_GET_MANY': {
        if (senderKind !== 'extension') throw new Error('Пакетное чтение журнала доступно только страницам расширения.');
        const ids = Array.isArray(message.ids) ? message.ids : [];
        return { ok: true, entries: await getJournalEntriesByIds(ids) };
      }

      case 'WEBCLIP_JOURNAL_DESTRUCTIVE_MANUAL_LIST':
        if (senderKind !== 'extension') throw new Error('Manual destructive recovery доступен только странице журнала WebClip.');
        assertSaveAsOwnerPage(sender, 'journal.html');
        return listPendingDestructiveManualReceipts(message.limit);

      case 'WEBCLIP_JOURNAL_DESTRUCTIVE_MANUAL_DISMISS':
        if (senderKind !== 'extension') throw new Error('Списание manual destructive recovery доступно только странице журнала WebClip.');
        assertSaveAsOwnerPage(sender, 'journal.html');
        return dismissPendingDestructiveManualReceipt(String(message.id || ''), message.updatedAt);

      case 'WEBCLIP_OPEN_JOURNAL_SAVED_FILE': {
        if (senderKind !== 'content' && senderKind !== 'extension') throw new Error('Команда недоступна из этого контекста.');
        const id = boundedContentString(message.id, 160).trim();
        if (!id) throw new Error('Не указана запись журнала.');
        const entry = await getJournalEntryById(id);
        const publicUrl = normalizeImportedHttpsUrl(entry?.publicUrl || '');
        if (!entry || entry.destination !== 'yandex' || !publicUrl || !isAllowedContentOpenUrl(publicUrl)) {
          throw new Error('Для этой записи нет доступной ссылки на сохранённый файл Яндекс Диска.');
        }
        if (senderKind === 'content') {
          const senderSiteKey = getJournalSiteKey(String(sender?.tab?.url || sender?.url || ''));
          const entrySiteKey = String(getJournalSiteKey(entry.url || entry.hostname || ''));
          if (!senderSiteKey || !entrySiteKey || senderSiteKey !== entrySiteKey) {
            throw new Error('Content script может открывать сохранённый файл только для записи текущего сайта.');
          }
        }
        const sourceTabId = Number(message.sourceTabId || sender.tab?.id || 0);
        const tab = await createTabNextTo(sourceTabId, publicUrl, true);
        return { ok: true, tabId: Number(tab?.id || 0) };
      }

      case 'WEBCLIP_JOURNAL_DELETE':
        return deleteJournalEntry(String(message.id || ''), {
          diskAction: String(message.diskAction || 'keep'),
          publicationAction: String(message.publicationAction || ''),
          operationId: String(message.operationId || '')
        });

      case 'WEBCLIP_JOURNAL_REVOKE_PUBLIC_ACCESS':
        if (senderKind !== 'extension') throw new Error('Отзыв публичной ссылки доступен только странице журнала WebClip.');
        assertSaveAsOwnerPage(sender, 'journal.html');
        return revokeJournalEntryPublicAccess(String(message.id || ''), String(message.operationId || ''));

      case 'WEBCLIP_JOURNAL_UPDATE_COMMENT':
        return updateJournalComment(String(message.id || ''), String(message.comment || ''));

      case 'WEBCLIP_JOURNAL_ADD_COMMENT':
        return addJournalComment(String(message.id || ''), String(message.comment || ''));

      case 'WEBCLIP_JOURNAL_EDIT_COMMENT':
        return editJournalComment(String(message.id || ''), String(message.commentId || ''), String(message.comment || ''));

      case 'WEBCLIP_JOURNAL_DELETE_COMMENT':
        return deleteJournalComment(String(message.id || ''), String(message.commentId || ''));

      case 'WEBCLIP_JOURNAL_MARK_READ':
        return moveReadLaterEntryToRead(String(message.id || ''), String(message.operationId || ''));

      case 'WEBCLIP_JOURNAL_CLEAR':
        return runExclusiveJournalDestructiveMutation('очистка журнала', () => clearJournalEntries({ url: message.url || '', siteUrl: message.siteUrl || '', operationId: String(message.operationId || '') }));

      case 'WEBCLIP_JOURNAL_EXPORT_PREPARE':
        if (senderKind !== 'extension') throw new Error('Экспорт журнала доступен только странице журнала WebClip.');
        assertSaveAsOwnerPage(sender, 'journal.html');
        return prepareFullJournalExport(String(message.operationId || ''));

      case 'WEBCLIP_JOURNAL_EXPORT_SAVE_AS_SETTLED': {
        if (senderKind !== 'extension') throw new Error('Результат Save As доступен только странице журнала WebClip.');
        assertSaveAsOwnerPage(sender, 'journal.html');
        const operationId = boundedContentString(message.operationId || '', MAX_OPERATION_ID_CHARS);
        const entryCount = Math.max(0, Math.floor(Number(message.entryCount) || 0));
        const status = String(message.status || '') === 'started' ? 'started' : 'error';
        if (status === 'started') {
          const downloadId = Number(message.downloadId);
          if (!Number.isInteger(downloadId) || downloadId < 0) throw new Error('Некорректный downloadId Save As.');
          recordOperationStage(operationId, 'complete', 'Файл экспорта передан в стандартные загрузки Chrome.', 100, 'success', { entryCount, downloadId });
          await finishOperationLog(operationId, 'success', `Полный журнал передан в загрузки Chrome. Записей: ${entryCount}.`);
          return { ok: true, operationId, downloadId };
        }
        const errorText = boundedContentString(message.error || 'Native Save As не был завершён.', 1000);
        recordOperationStage(operationId, 'error', `Save As не завершён: ${errorText}`, 100, 'error', { entryCount });
        await finishOperationLog(operationId, 'error', `Экспорт полного журнала не завершён: ${errorText}`);
        return { ok: true, operationId };
      }

      case 'WEBCLIP_JOURNAL_IMPORT_REPLACE': {
        const error = new Error('Inline import отключён: используйте bounded staged import, чтобы не передавать полный backup через runtime messaging.');
        error.code = 'JOURNAL_INLINE_IMPORT_DISABLED';
        throw error;
      }

      case 'WEBCLIP_JOURNAL_IMPORT_PREVIEW_STAGED':
        if (senderKind !== 'extension') throw new Error('Проверка резервной копии журнала доступна только странице расширения.');
        assertSaveAsOwnerPage(sender, 'journal.html');
        return previewStagedJournalImport(
          String(message.stagingKey || ''),
          String(message.operationId || ''),
          String(message.source || 'file'),
          String(message.ownerSessionId || '')
        );

      case 'WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED':
        if (senderKind !== 'extension') throw new Error('Замена журнала доступна только странице расширения.');
        assertSaveAsOwnerPage(sender, 'journal.html');
        return runExclusiveJournalDestructiveMutation('импорт подготовленного журнала', () => importJournalReplaceStaged(
          String(message.stagingKey || ''),
          String(message.operationId || ''),
          String(message.source || 'file'),
          message.previewReceipt,
          String(message.leaseToken || ''),
          String(message.ownerSessionId || '')
        ));

      case 'WEBCLIP_JOURNAL_IMPORT_DISCARD_STAGED':
        if (senderKind !== 'extension') throw new Error('Очистка подготовленного импорта доступна только странице расширения.');
        assertSaveAsOwnerPage(sender, 'journal.html');
        return discardOwnedJournalImport(
          String(message.stagingKey || ''),
          String(message.leaseToken || ''),
          String(message.ownerSessionId || '')
        );

      case 'WEBCLIP_JOURNAL_IMPORT_PENDING':
        if (senderKind !== 'extension') throw new Error('Checkpoint импорта доступен только странице расширения.');
        assertSaveAsOwnerPage(sender, 'journal.html');
        return getPendingJournalImportLease();

      case 'WEBCLIP_JOURNAL_IMPORT_LEASE_RENEW':
        if (senderKind !== 'extension') throw new Error('Продление lease импорта доступно только странице расширения.');
        assertSaveAsOwnerPage(sender, 'journal.html');
        return renewJournalImportLease(String(message.leaseToken || ''), String(message.ownerSessionId || ''));

      case 'WEBCLIP_JOURNAL_IMPORT_RESUME_PENDING':
        if (senderKind !== 'extension') throw new Error('Возобновление импорта доступно только странице расширения.');
        assertSaveAsOwnerPage(sender, 'journal.html');
        return resumePendingJournalImport(String(message.checkpointToken || ''), String(message.ownerSessionId || ''));

      case 'WEBCLIP_JOURNAL_IMPORT_CANCEL_PENDING':
        if (senderKind !== 'extension') throw new Error('Отмена checkpoint импорта доступна только странице расширения.');
        assertSaveAsOwnerPage(sender, 'journal.html');
        return cancelPendingJournalImport(String(message.checkpointToken || ''));

      case 'WEBCLIP_JOURNAL_YANDEX_EXPORT':
        return exportJournalBackupToYandex({
          reason: 'manual',
          operationId: String(message.operationId || '')
        });

      case 'WEBCLIP_JOURNAL_YANDEX_LIST_BACKUPS':
        return listJournalBackupsOnYandex(String(message.month || ''));

      case 'WEBCLIP_JOURNAL_YANDEX_FETCH_BACKUP':
        if (senderKind !== 'extension') throw new Error('Импорт backup доступен только странице расширения.');
        assertSaveAsOwnerPage(sender, 'journal.html');
        return fetchJournalBackupFromYandex(
          String(message.path || ''),
          String(message.operationId || ''),
          String(message.ownerSessionId || '')
        );

      case 'WEBCLIP_JOURNAL_BACKUP_STATUS':
        return getJournalBackupStatus();

      case 'WEBCLIP_JOURNAL_BACKUP_SAVE_SETTINGS':
        return saveJournalBackupSettings(message.settings || {});

      case 'WEBCLIP_STORAGE_PREFLIGHT': {
        if (senderKind !== 'extension') throw new Error('Проверка квоты доступна только страницам расширения.');
        const requiredBytes = Math.max(0, Math.min(256 * 1024 * 1024, Number(message.requiredBytes) || 0));
        return ensureStorageBudget(requiredBytes, boundedContentString(message.reason || 'операции WebClip', 160));
      }

      case 'WEBCLIP_STORAGE_HEALTH':
        if (senderKind !== 'extension') throw new Error('Состояние хранилища доступно только страницам расширения.');
        return getStorageHealth();

      case 'WEBCLIP_USER_SETTINGS_EXPORT':
        if (senderKind !== 'extension') throw new Error('Экспорт настроек доступен только страницам расширения.');
        return exportUserSettings();

      case 'WEBCLIP_USER_SETTINGS_IMPORT':
        if (senderKind !== 'extension') throw new Error('Импорт настроек доступен только страницам расширения.');
        return importUserSettings(message.document);

      case 'WEBCLIP_OPERATION_LOG_SETTINGS_GET':
        return getOperationLogSettings();

      case 'WEBCLIP_OPERATION_LOG_SETTINGS_SAVE':
        return saveOperationLogSettings(message.settings || {});

      case 'WEBCLIP_OPERATION_LOG_LIST':
        return listOperationLogs(message.limit || 100);

      case 'WEBCLIP_OPERATION_LOG_GET':
        return getOperationLog(String(message.operationId || ''));

      case 'WEBCLIP_OPERATION_LOG_EXPORT_PREPARE':
        if (senderKind !== 'extension') throw new Error('Экспорт OperationLog доступен только странице настроек WebClip.');
        assertSaveAsOwnerPage(sender, 'options.html');
        return prepareOperationLogExport(String(message.operationId || ''));

      case 'WEBCLIP_PREPARED_SAVE_AS_STARTED': {
        if (senderKind !== 'extension') throw new Error('Save As доступен только страницам расширения WebClip.');
        const ownerPage = assertSaveAsOwnerPage(sender);
        if (ownerPage !== 'journal.html' && ownerPage !== 'options.html') throw new Error('Эта страница WebClip не является владельцем Save As.');
        const blobUrl = normalizePreparedSaveAsBlobUrl(message.blobUrl);
        const saveAsSessionId = normalizePreparedSaveAsSessionId(message.saveAsSessionId);
        const downloadId = Number(message.downloadId);
        if (!Number.isInteger(downloadId) || downloadId < 0) throw new Error('Некорректный downloadId Save As.');
        revokeBlobUrlWhenDownloadFinishes(downloadId, blobUrl);
        const checkpoint = await markPreparedSaveAsStarted({
          sessionId: saveAsSessionId,
          blobUrl,
          ownerPage,
          downloadId
        });
        return { ok: true, downloadId, saveAsSessionId, checkpointReleased: Boolean(checkpoint?.released) };
      }

      case 'WEBCLIP_PREPARED_SAVE_AS_RELEASE': {
        if (senderKind !== 'extension') throw new Error('Освобождение Save As Blob доступно только страницам расширения WebClip.');
        const ownerPage = assertSaveAsOwnerPage(sender);
        if (ownerPage !== 'journal.html' && ownerPage !== 'options.html') throw new Error('Эта страница WebClip не является владельцем Save As.');
        const blobUrl = normalizePreparedSaveAsBlobUrl(message.blobUrl);
        const saveAsSessionId = normalizePreparedSaveAsSessionId(message.saveAsSessionId);
        await releasePreparedSaveAsCheckpoint({
          sessionId: saveAsSessionId,
          blobUrl,
          ownerPage,
          reason: String(message.reason || 'page-release')
        });
        return { ok: true, saveAsSessionId };
      }

      case 'WEBCLIP_OPERATION_LOG_CLEANUP':
        return cleanupExpiredOperationLogs();

      case 'WEBCLIP_OPERATION_LOG_CLEAR':
        return clearOperationLogs();

      case 'WEBCLIP_OPERATION_LOG_FINISH':
        await finishOperationLog(String(message.operationId || ''), String(message.status || 'success'), String(message.summary || ''));
        return { ok: true, operationId: String(message.operationId || '') };

      case 'WEBCLIP_OPEN_OPTIONS': {
        const sourceTabId = Number(message.sourceTabId || sender.tab?.id || 0);
        const tab = await createTabNextTo(sourceTabId, chrome.runtime.getURL('options.html'), true);
        return { ok: true, tabId: tab?.id || 0 };
      }

      case 'WEBCLIP_OPEN_INTERNAL_PAGE': {
        const page = String(message.page || '').replace(/^\/+/, '');
        if (!/^[a-z0-9._-]+\.html(?:\?.*)?$/i.test(page)) throw new Error('Некорректная внутренняя страница WebClip.');
        const sourceTabId = Number(message.sourceTabId || sender.tab?.id || 0);
        const tab = await createTabNextTo(sourceTabId, chrome.runtime.getURL(page), true);
        return { ok: true, tabId: tab?.id || 0 };
      }

      case 'WEBCLIP_OPEN_URL': {
        const url = String(message.url || '').trim();
        if (!/^https?:\/\//i.test(url)) throw new Error('Некорректная ссылка.');
        if (senderKind === 'content' && !isAllowedContentOpenUrl(url)) {
          throw new Error('Content script может открывать только сохранённые ссылки Яндекс Диска.');
        }
        const sourceTabId = Number(message.sourceTabId || sender.tab?.id || 0);
        const tab = await createTabNextTo(sourceTabId, url, true);
        return { ok: true, tabId: tab?.id || 0 };
      }

      case 'WEBCLIP_YANDEX_STATUS':
        return getYandexStatus();

      case 'WEBCLIP_YANDEX_START_AUTH':
        return startYandexOAuth(String(message.clientId || '').trim(), Number(sender.tab?.id || 0));

      case 'WEBCLIP_YANDEX_FINISH_AUTH':
        return finishYandexOAuth(String(message.code || '').trim());

      case 'WEBCLIP_YANDEX_SET_MANUAL_TOKEN':
        return setManualYandexToken(String(message.token || '').trim());

      case 'WEBCLIP_YANDEX_DISCONNECT':
        await writeYandexAuth(null);
        await runYandexAuthStorageOperation(() => chrome.storage.session.remove(['yandexOAuthPending']), 'Очистка pending PKCE состояния при отключении Яндекс Диска');
        return { ok: true, ...(await getYandexStatus()) };

      case 'WEBCLIP_YANDEX_SAVE_ROOT':
        return saveYandexRoot(message.rootPath);

      case 'WEBCLIP_YANDEX_SAVE_PREFERENCES':
        return saveYandexPreferences(message.preferences || {});

      case 'WEBCLIP_YANDEX_TEST':
        return testYandexConnection();

      case 'WEBCLIP_YANDEX_LIST_FOLDERS':
        return listYandexFolders(message.path || '/');

      case 'WEBCLIP_YANDEX_CREATE_FOLDER':
        return createYandexFolder(message.path || '/');

      default:
        return null;
    }
  };

  asyncHandler()
    .then(async (result) => {
      const response = result ?? { ok: false, error: 'Неизвестная команда.' };
      const operationId = String(response?.operationId || message?.operationId || '').trim();
      if (operationId) await flushOperationLogWrites(operationId).catch(() => {});
      sendResponse(response);
    })
    .catch(async (error) => {
      const operationId = String(message?.operationId || '').trim();
      if (operationId) await flushOperationLogWrites(operationId).catch(() => {});
      sendResponse({ ok: false, error: normalizeError(error), ...(operationId ? { operationId } : {}) });
    });

  return true;
});


chrome.tabs.onRemoved.addListener((tabId) => {
  clearScriptExecutionSettlementsForTab(tabId);
  frameAgentsByTab.delete(Number(tabId || 0));
  actionUpdateGenerationByTab.delete(Number(tabId || 0));
  actionRepairScheduledTabs.delete(Number(tabId || 0));
  invalidatePdfRetryForTab(tabId).catch(() => {});
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo?.url) {
    clearScriptExecutionSettlementsForTab(tabId);
    frameAgentsByTab.delete(Number(tabId || 0));
    invalidatePdfRetryForTab(tabId).catch(() => {});
  }
});

chrome.runtime.onInstalled.addListener(() => {
  initializeContextMenusCrashSafe(0).catch((error) => console.warn('WebClip context menu init:', error));
  initializeJournalBackupScheduler('installed').catch((error) => console.warn('WebClip backup init:', error));
  initializeOperationLogCleanup('installed').catch((error) => console.warn('WebClip log cleanup init:', error));
});

chrome.runtime.onStartup.addListener(() => {
  initializeContextMenusCrashSafe(0).catch((error) => console.warn('WebClip context menu startup repair:', error));
  initializeJournalBackupScheduler('startup').catch((error) => console.warn('WebClip backup startup:', error));
  initializeOperationLogCleanup('startup').catch((error) => console.warn('WebClip log cleanup startup:', error));
});

chrome.alarms.onAlarm.addListener((alarm) => {
  const contextMenuRepairAttempt = parseContextMenuRepairAttempt(alarm?.name);
  if (contextMenuRepairAttempt > 0) {
    initializeContextMenusCrashSafe(contextMenuRepairAttempt).catch((error) => console.warn('WebClip context menu repair:', error));
  } else if (alarm?.name === JOURNAL_BACKUP_ALARM) {
    runDueJournalBackup('periodic-alarm', false).catch((error) => console.warn('WebClip backup alarm:', error));
  } else if (alarm?.name === JOURNAL_BACKUP_RETRY_ALARM) {
    runDueJournalBackup('retry-alarm', true).catch((error) => console.warn('WebClip backup retry:', error));
  } else if (alarm?.name === OPERATION_LOG_CLEANUP_ALARM) {
    runLoggedOperationLogCleanup('alarm').catch((error) => console.warn('WebClip operation log cleanup:', error));
  }
});

const WEBCLIP_RUNTIME_VERSION_KEY = 'webclipRuntimeBuildVersion';

async function reloadOpenExtensionPagesAfterVersionChange() {
  const version = chrome.runtime.getManifest().version;
  const stored = await chrome.storage.local.get(WEBCLIP_RUNTIME_VERSION_KEY);
  if (stored?.[WEBCLIP_RUNTIME_VERSION_KEY] === version) return;

  await chrome.storage.local.set({ [WEBCLIP_RUNTIME_VERSION_KEY]: version });
  let tabs = [];
  try { tabs = await chrome.tabs.query({}); } catch (_) { return; }
  const extensionRoot = chrome.runtime.getURL('');
  await Promise.all(tabs.map(async (tab) => {
    if (!tab?.id || !String(tab.url || '').startsWith(extensionRoot)) return;
    try { await chrome.tabs.reload(tab.id); } catch (_) {}
  }));
}

// Service worker MV3 может быть выгружен между событиями. При каждом новом
// запуске проверяем, не пропущен ли настроенный период резервного копирования.
reloadOpenExtensionPagesAfterVersionChange().catch((error) => console.warn('WebClip extension-page refresh:', error));
reconcileUserSettingsImportMarker('worker-start').catch((error) => console.warn('WebClip settings import reconciliation:', error));
reapExpiredJournalImportCheckpoint('worker-start').catch((error) => console.warn('WebClip Journal import checkpoint cleanup:', error));
initializeJournalBackupScheduler('worker-start').catch((error) => console.warn('WebClip backup init:', error));
initializeOperationLogCleanup().catch((error) => console.warn('WebClip operation log init:', error));

chrome.tabs.onActivated.addListener(({ tabId }) => {
  updateActionForTab(tabId).catch(() => {});
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    updateActionForTab(tabId, changeInfo.url || tab?.url || '').catch(() => {});
  }
});

refreshActionForAllTabs().catch(() => {});

const CONTEXT_MENU_API_TIMEOUT_MS = 10_000;
const CONTEXT_MENU_REPAIR_ALARM_PREFIX = 'webclip-context-menu-repair:';
const CONTEXT_MENU_REPAIR_MAX_ATTEMPTS = 3;
let contextMenuLateMutationBarrier = Promise.resolve();
let contextMenuInitializationPromise = null;

async function runContextMenuCallbackMutation(start, label) {
  // contextMenus.removeAll/remove/update only gained Promise support in Chrome 123,
  // while this extension supports Chrome 118. Always use callbacks so Chrome
  // 118-122 actually signal completion and create() errors are observable via
  // runtime.lastError. If our local deadline wins, the Chrome side effect is
  // not cancelled; keep the real promise as a barrier so a later init in the
  // same worker cannot race an unknown late remove/create completion.
  await withOperationTimeout(
    contextMenuLateMutationBarrier,
    CONTEXT_MENU_API_TIMEOUT_MS,
    `${label}: ожидание предыдущей операции контекстного меню`
  );

  const actualSettlement = new Promise((resolve, reject) => {
    try {
      start(() => {
        const lastError = chrome.runtime.lastError;
        if (lastError) reject(new Error(lastError.message || String(lastError)));
        else resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
  contextMenuLateMutationBarrier = actualSettlement.catch(() => {});
  return withOperationTimeout(actualSettlement, CONTEXT_MENU_API_TIMEOUT_MS, label);
}

function createContextMenuItem(properties) {
  return runContextMenuCallbackMutation(
    (done) => chrome.contextMenus.create(properties, done),
    `Создание пункта контекстного меню ${String(properties?.id || '')}`
  );
}

async function initializeContextMenus() {
  if (contextMenuInitializationPromise) return contextMenuInitializationPromise;
  const run = (async () => {
    await runContextMenuCallbackMutation(
      (done) => chrome.contextMenus.removeAll(done),
      'Очистка контекстного меню WebClip'
    );

    await createContextMenuItem({
      id: CONTEXT_MENU_QUICK_START,
      title: 'Начать выделение WebClipper',
      contexts: ['all']
    });
    await createContextMenuItem({ id: CONTEXT_MENU_ROOT, title: 'WebClipper', contexts: ['all'] });

    const child = (id, title, options = {}) => createContextMenuItem({
      id: `webclipper-${id}`,
      parentId: CONTEXT_MENU_ROOT,
      title,
      contexts: ['all'],
      ...options
    });
    const sep = (id) => createContextMenuItem({
      id: `webclipper-sep-${id}`,
      parentId: CONTEXT_MENU_ROOT,
      type: 'separator',
      contexts: ['all']
    });

    await child('start', 'Начать / продолжить выделение');
    await child('auto-content', 'Выделить основной контент');
    await sep('selection-1');
    await child('mode-include', 'Режим: Добавить область');
    await child('mode-exclude', 'Режим: Исключить область');
    await child('suggest-ads', 'Найти предполагаемую рекламу');
    await child('clear', 'Очистить Включены / Исключены');
    await child('finish', 'Готово — выбрать способ сохранения');
    await sep('save');
    await child('download', 'Скачать PDF');
    await child('yandex', 'Отправить PDF на Яндекс Диск');
    await child('retry-yandex', 'Повторить отправку сформированного PDF');
    await sep('journal');
    await child('journal-url', 'Журнал текущего URL');
    await child('journal-site', 'Журнал текущего сайта');
    await child('journal-all', 'Весь журнал / импорт / очистка');
    await child('journal-export-file', 'Экспорт полного журнала в файл');
    await child('journal-export-yandex', 'Резервная копия журнала на Яндекс Диск');
    await sep('settings');
    await child('settings', 'Настройки Яндекс Диска');
    await child('auth-help', 'Инструкция по авторизации');
  })();

  contextMenuInitializationPromise = run.finally(() => {
    contextMenuInitializationPromise = null;
  });
  return contextMenuInitializationPromise;
}

function parseContextMenuRepairAttempt(name) {
  const text = String(name || '');
  if (!text.startsWith(CONTEXT_MENU_REPAIR_ALARM_PREFIX)) return -1;
  const raw = text.slice(CONTEXT_MENU_REPAIR_ALARM_PREFIX.length).split(':', 1)[0];
  const attempt = Number(raw);
  return Number.isInteger(attempt) && attempt >= 1 && attempt <= CONTEXT_MENU_REPAIR_MAX_ATTEMPTS ? attempt : -1;
}

async function armContextMenuRepairAlarm(nextAttempt) {
  if (!(nextAttempt >= 1 && nextAttempt <= CONTEXT_MENU_REPAIR_MAX_ATTEMPTS)) return '';
  const suffix = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const name = `${CONTEXT_MENU_REPAIR_ALARM_PREFIX}${nextAttempt}:${suffix}`;
  try {
    await withOperationTimeout(
      mutateChromeAlarmSerialized(
        name,
        () => chrome.alarms.create(name, { delayInMinutes: 0.5 }),
        'Планирование восстановления контекстного меню'
      ),
      CONTEXT_MENU_API_TIMEOUT_MS,
      'Планирование восстановления контекстного меню'
    );
    return name;
  } catch (error) {
    // The main rebuild is still worth attempting even if its durable retry
    // could not be armed. A late unique alarm is harmless because no newer
    // attempt reuses the same name.
    console.warn('WebClip context menu repair alarm:', error);
    return '';
  }
}

async function initializeContextMenusCrashSafe(previousAttempt = 0) {
  const nextAttempt = previousAttempt + 1;
  const repairAlarmName = await armContextMenuRepairAlarm(nextAttempt);
  try {
    await initializeContextMenus();
    if (repairAlarmName) {
      await withOperationTimeout(
        mutateChromeAlarmSerialized(
          repairAlarmName,
          () => chrome.alarms.clear(repairAlarmName),
          'Снятие alarm восстановления контекстного меню'
        ),
        CONTEXT_MENU_API_TIMEOUT_MS,
        'Снятие alarm восстановления контекстного меню'
      ).catch((error) => console.warn('WebClip context menu repair clear:', error));
    }
    return { ok: true };
  } catch (error) {
    // Keep the pre-armed one-shot alarm. If this was the last bounded repair
    // attempt, a future browser startup provides the next independent repair
    // opportunity without an infinite wake/retry loop.
    throw error;
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  handleContextMenuClick(info, tab).catch((error) => {
    console.warn('WebClip context menu:', error);
    if (tab?.id) {
      sendWebClipPageCommand(tab.id, 'notify-error', { message: normalizeError(error) }).catch(() => {});
    }
  });
});

async function handleContextMenuClick(info, tab) {
  const id = String(info?.menuItemId || '');
  if (!id.startsWith('webclipper-') || id.startsWith('webclipper-sep-') || id === CONTEXT_MENU_ROOT) return;

  const command = id === CONTEXT_MENU_QUICK_START ? 'start' : id.replace(/^webclipper-/, '');
  if (command === 'settings') {
    await createTabNextTo(tab?.id || 0, chrome.runtime.getURL('options.html'), true);
    return;
  }
  if (command === 'auth-help') {
    await createTabNextTo(tab?.id || 0, chrome.runtime.getURL('yandex-auth-help.html'), true);
    return;
  }
  if (command === 'journal-export-file') {
    // Do not own a long IDB/export/download flow from the contextMenus event
    // callback. A real extension page is a durable UI owner and can keep the
    // user informed while individual service-worker message handlers remain
    // bounded/restart-safe.
    const params = new URLSearchParams({ mode: 'all', autoExportFile: '1' });
    await createTabNextTo(tab?.id || 0, `${chrome.runtime.getURL('journal.html')}?${params}`, true);
    return;
  }
  if (command === 'journal-export-yandex') {
    const params = new URLSearchParams({
      mode: 'all',
      autoBackup: '1'
    });
    await createTabNextTo(tab?.id || 0, `${chrome.runtime.getURL('journal.html')}?${params}`, true);
    return;
  }
  if (command === 'journal-url' || command === 'journal-site' || command === 'journal-all') {
    const mode = command === 'journal-url' ? 'current' : command === 'journal-site' ? 'site' : 'all';
    if (mode === 'all') {
      await openJournalPage({ mode: 'all', sourceTabId: tab?.id || 0, sourceUrl: tab?.url || '' });
      return;
    }
    if (!tab?.id) throw new Error('Не удалось определить текущую вкладку.');
    await openJournalPage({ mode, sourceTabId: tab.id, sourceUrl: tab.url || '' });
    return;
  }

  if (!tab?.id || !/^https?:\/\//i.test(tab.url || '')) {
    throw new Error('WebClipper работает с обычными страницами http:// и https://.');
  }
  await ensureWebClipContentScript(tab.id);
  const response = await chrome.tabs.sendMessage(tab.id, {
    type: 'WEBCLIP_COMMAND',
    command
  });
  if (response && response.ok === false) {
    throw new Error(response.error || 'Команда WebClipper не выполнена.');
  }
}


let journalContextMutationChain = Promise.resolve();
const JOURNAL_CONTEXT_SESSION_TIMEOUT_MS = 10_000;

function waitJournalContextSessionOperation(actual, label, timeoutMs = JOURNAL_CONTEXT_SESSION_TIMEOUT_MS) {
  const waitMs = Math.max(1000, Math.min(60_000, Number(timeoutMs) || JOURNAL_CONTEXT_SESSION_TIMEOUT_MS));
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

function compareJournalContextAge(left, right) {
  const delta = Number(left?.createdAt || 0) - Number(right?.createdAt || 0);
  if (delta) return delta;
  const a = String(left?.name || '');
  const b = String(right?.name || '');
  return a < b ? -1 : a > b ? 1 : 0;
}

function journalContextHeapPush(heap, item) {
  heap.push(item);
  let index = heap.length - 1;
  while (index > 0) {
    const parent = Math.floor((index - 1) / 2);
    if (compareJournalContextAge(heap[parent], heap[index]) <= 0) break;
    [heap[parent], heap[index]] = [heap[index], heap[parent]];
    index = parent;
  }
}

function journalContextHeapReplaceOldest(heap, item) {
  const removed = heap[0];
  heap[0] = item;
  let index = 0;
  while (true) {
    const left = index * 2 + 1;
    const right = left + 1;
    let smallest = index;
    if (left < heap.length && compareJournalContextAge(heap[left], heap[smallest]) < 0) smallest = left;
    if (right < heap.length && compareJournalContextAge(heap[right], heap[smallest]) < 0) smallest = right;
    if (smallest === index) break;
    [heap[index], heap[smallest]] = [heap[smallest], heap[index]];
    index = smallest;
  }
  return removed;
}

function isFreshJournalContextCreatedAt(createdAt, now) {
  const value = Number(createdAt || 0);
  return Number.isFinite(value)
    && value > 0
    && value <= now
    && now - value <= JOURNAL_CONTEXT_TTL_MS;
}

async function storeJournalSourceContext(contextId, sourceTabId, sourceUrl) {
  const id = String(contextId || '').slice(0, MAX_JOURNAL_CONTEXT_ID_CHARS);
  if (!id) throw new Error('Некорректный идентификатор контекста журнала.');
  const key = `${JOURNAL_CONTEXT_PREFIX}${id}`;
  const boundedUrl = String(sourceUrl || '').slice(0, MAX_JOURNAL_CONTEXT_URL_CHARS);

  // chrome.storage.session mutations are not cancellable. Keep the serialized
  // chain bound to the *actual* settlement of get/remove/set, while exposing
  // only a bounded wait to openJournalPage. If Chrome times out locally, no
  // Journal tab is created and a newer context mutation cannot overtake the
  // still-unresolved older one.
  const actual = journalContextMutationChain.catch(() => {}).then(async () => {
    const now = Date.now();
    const all = await chrome.storage.session.get(null);
    const keep = [];
    let removeBatch = [];

    const flushRemovals = async () => {
      if (!removeBatch.length) return;
      const batch = removeBatch;
      removeBatch = [];
      await chrome.storage.session.remove(batch);
    };
    const queueRemoval = async (name) => {
      removeBatch.push(name);
      if (removeBatch.length >= JOURNAL_CONTEXT_REMOVE_BATCH) await flushRemovals();
    };

    for (const name in (all || {})) {
      if (!Object.prototype.hasOwnProperty.call(all, name) || !name.startsWith(JOURNAL_CONTEXT_PREFIX) || name === key) continue;
      const value = all[name];
      const createdAt = Number(value?.createdAt || 0);
      if (!value || typeof value !== 'object' || !isFreshJournalContextCreatedAt(createdAt, now)) {
        await queueRemoval(name);
        continue;
      }

      const item = { name, createdAt };
      if (keep.length < MAX_JOURNAL_SESSION_CONTEXTS - 1) {
        journalContextHeapPush(keep, item);
        continue;
      }
      if (compareJournalContextAge(item, keep[0]) > 0) {
        const evicted = journalContextHeapReplaceOldest(keep, item);
        await queueRemoval(evicted.name);
      } else {
        await queueRemoval(name);
      }
    }

    await flushRemovals();
    await chrome.storage.session.set({
      [key]: {
        sourceTabId: Math.max(0, Math.floor(Number(sourceTabId) || 0)),
        sourceUrl: boundedUrl,
        createdAt: now
      }
    });
    return key;
  });

  journalContextMutationChain = actual.then(() => undefined, () => undefined);
  return waitJournalContextSessionOperation(actual, 'Сохранение session-контекста журнала');
}

async function openJournalPage({ mode = 'all', sourceTabId = 0, sourceUrl = '', anchorTabId = 0 } = {}) {
  const normalizedMode = mode === 'current' || mode === 'site' ? mode : 'all';
  const tabId = Number(sourceTabId || 0);
  const placementTabId = Number(anchorTabId || 0) || tabId;
  let resolvedSourceUrl = String(sourceUrl || '');

  // Источник и начальный режим — разные понятия. Даже «Весь журнал» может
  // сохранить контекст исходной web-вкладки для последующего переключения
  // на «Текущий URL» / «Текущий сайт», но сам режим all этот URL не фильтрует.
  // Journal data is deliberately unavailable from Incognito tabs: extension
  // storage is not used as a bridge between normal browsing history and an
  // Incognito renderer/window.
  let sourceTab = null;
  if (tabId > 0) {
    try {
      sourceTab = await getChromeTabBounded(tabId, 'Проверка исходной вкладки журнала');
    } catch (error) {
      const blocked = new Error(`Не удалось достоверно определить контекст исходной вкладки журнала: ${normalizeError(error)}`);
      blocked.code = 'JOURNAL_SOURCE_CONTEXT_UNKNOWN';
      throw blocked;
    }
    if (sourceTab?.incognito) {
      throw new Error('Журнал WebClip недоступен из режима Инкогнито, чтобы не смешивать историю обычного и приватного просмотра.');
    }
    if (!/^https?:\/\//i.test(resolvedSourceUrl) && /^https?:\/\//i.test(sourceTab?.url || '')) {
      resolvedSourceUrl = sourceTab.url;
    }
  }
  if (placementTabId > 0 && placementTabId !== tabId) {
    let placementTab;
    try {
      placementTab = await getChromeTabBounded(placementTabId, 'Проверка anchor-вкладки журнала');
    } catch (error) {
      const blocked = new Error(`Не удалось достоверно определить контекст anchor-вкладки журнала: ${normalizeError(error)}`);
      blocked.code = 'JOURNAL_ANCHOR_CONTEXT_UNKNOWN';
      throw blocked;
    }
    if (placementTab?.incognito) {
      throw new Error('Журнал WebClip недоступен из режима Инкогнито, чтобы не раскрывать данные обычного профиля в приватном окне.');
    }
  }

  const hasWebContext = tabId > 0 && /^https?:\/\//i.test(resolvedSourceUrl);
  if (normalizedMode !== 'all' && !hasWebContext) {
    throw new Error('Не удалось определить исходную web-вкладку журнала.');
  }

  let contextId = '';
  if (hasWebContext) {
    contextId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    await storeJournalSourceContext(contextId, tabId, resolvedSourceUrl);
  }

  const params = new URLSearchParams({ mode: normalizedMode });
  if (contextId) params.set('contextId', contextId);
  const tab = await createTabNextTo(placementTabId, `${chrome.runtime.getURL('journal.html')}?${params.toString()}`, true);
  return { ok: true, tabId: tab?.id || 0, mode: normalizedMode, hasSourceContext: hasWebContext };
}

async function ensureWebClipContentScript(tabId) {
  await ensureStorageAccessInitialized();
  const id = Math.max(0, Math.floor(Number(tabId) || 0));
  if (!id) throw new Error('Не указана вкладка для подключения WebClip content script.');
  await executeScriptSingletonBounded(
    { target: { tabId: id }, files: ['content.js'] },
    {
      requestKey: `content:${id}`,
      label: 'Инъекция WebClip content script',
      timeoutMs: SCRIPT_EXECUTION_TIMEOUT_MS
    }
  );
}

async function sendWebClipPageCommand(tabId, command, extra = {}) {
  await ensureWebClipContentScript(tabId);
  return chrome.tabs.sendMessage(tabId, { type: 'WEBCLIP_COMMAND', command, ...extra });
}

function sanitizePdfSourceReceipt(value, { operationId = '', tabId = 0, required = false } = {}) {
  const receipt = value && typeof value === 'object' ? value : null;
  const fail = (code, message) => {
    if (!required) return null;
    const error = new Error(message || code);
    error.code = code;
    throw error;
  };
  if (!receipt) return fail('WEBCLIP_PDF_SOURCE_RECEIPT_REQUIRED', 'PDF lineage has no exact source receipt.');
  const sourceOperationId = String(receipt.operationId || '').trim().slice(0, MAX_OPERATION_ID_CHARS);
  const sourceTabId = Math.max(0, Math.floor(Number(receipt.tabId) || 0));
  const sourceDocumentId = String(receipt.sourceDocumentId || '').trim().slice(0, 256);
  const generation = Math.floor(Number(receipt.applicationGeneration?.generation) || 0);
  let href = '';
  try { href = new URL(String(receipt.applicationGeneration?.href || '')).href; }
  catch (_) { href = String(receipt.applicationGeneration?.href || '').slice(0, MAX_IMPORTED_URL_CHARS); }
  const selectionRevision = Math.floor(Number(receipt.selectionRevision) || 0);
  const selectedCount = Math.max(0, Math.floor(Number(receipt.selectedCount) || 0));
  const confirmedSelectionRevision = Math.floor(Number(receipt.confirmedSelectionRevision) || 0) || null;
  if (!sourceOperationId || !sourceTabId || !sourceDocumentId || !generation || !href || !selectionRevision) {
    return fail('WEBCLIP_PDF_SOURCE_RECEIPT_INVALID', 'PDF lineage source receipt is incomplete.');
  }
  const expectedOperationId = String(operationId || '').trim().slice(0, MAX_OPERATION_ID_CHARS);
  const expectedTabId = Math.max(0, Math.floor(Number(tabId) || 0));
  if (expectedOperationId && sourceOperationId !== expectedOperationId) {
    return fail('WEBCLIP_PDF_SOURCE_OPERATION_CHANGED', 'PDF lineage source receipt belongs to a different save operation.');
  }
  if (expectedTabId && sourceTabId !== expectedTabId) {
    return fail('WEBCLIP_PDF_SOURCE_TAB_CHANGED', 'PDF lineage source receipt belongs to a different source tab.');
  }
  return {
    schema: 'webclip-pdf-source-receipt/v1',
    operationId: sourceOperationId,
    tabId: sourceTabId,
    sourceDocumentId,
    sourceDocumentLifecycle: String(receipt.sourceDocumentLifecycle || '').slice(0, 64),
    applicationGeneration: { generation, href },
    selectionRevision,
    selectedCount,
    confirmedSelectionRevision,
    capturedAt: Math.max(0, Math.floor(Number(receipt.capturedAt) || 0))
  };
}

function captureActivePdfSourceReceipt(tabId, operationId) {
  const guard = globalThis.WebClipContentInjectionGuard;
  const active = typeof guard?.getActiveWorkerSourceReceipt === 'function'
    ? guard.getActiveWorkerSourceReceipt(globalThis, tabId)
    : null;
  return sanitizePdfSourceReceipt(active, { tabId, operationId, required: true });
}

function currentPdfRetrySourceProbe() {
  try {
    const admitted = globalThis.WebClipApplicationGeneration?.admitSelection?.();
    if (!admitted?.ok || !admitted?.receipt) {
      return {
        ok: false,
        code: String(admitted?.code || 'WEBCLIP_RETRY_SOURCE_APPLICATION_REQUIRED'),
        reason: String(admitted?.reason || 'Current application/selection generation is not admitted for retry.')
      };
    }
    const application = admitted.receipt.applicationGeneration;
    return {
      ok: true,
      receipt: {
        applicationGeneration: {
          generation: Math.floor(Number(application?.generation) || 0),
          href: String(application?.href || '')
        },
        selectionRevision: Math.floor(Number(admitted.receipt.selectionRevision) || 0),
        selectedCount: Math.max(0, Math.floor(Number(admitted.receipt.selectedCount) || 0))
      }
    };
  } catch (error) {
    return {
      ok: false,
      code: 'WEBCLIP_RETRY_SOURCE_APPLICATION_REQUIRED',
      reason: String(error?.message || error || 'Current application-generation probe failed.').slice(0, 500)
    };
  }
}

function normalizeCurrentPdfRetrySourceReceipt(value, { tabId = 0, sourceDocumentId = '' } = {}) {
  const receipt = value && typeof value === 'object' ? value : null;
  const application = receipt?.applicationGeneration;
  const generation = Math.floor(Number(application?.generation) || 0);
  let href = '';
  try { href = new URL(String(application?.href || '')).href; }
  catch (_) { href = String(application?.href || '').slice(0, MAX_IMPORTED_URL_CHARS); }
  const selectionRevision = Math.floor(Number(receipt?.selectionRevision) || 0);
  const selectedCount = Math.max(0, Math.floor(Number(receipt?.selectedCount) || 0));
  const normalizedTabId = Math.max(0, Math.floor(Number(tabId) || 0));
  const documentId = String(sourceDocumentId || '').trim().slice(0, 256);
  if (!normalizedTabId || !documentId || !generation || !href || !selectionRevision) {
    const error = new Error('Current retry source receipt is incomplete.');
    error.code = 'WEBCLIP_RETRY_SOURCE_RECEIPT_INVALID';
    throw error;
  }
  return Object.freeze({
    schema: 'webclip-pdf-live-retry-source/v1',
    tabId: normalizedTabId,
    sourceDocumentId: documentId,
    applicationGeneration: Object.freeze({ generation, href }),
    selectionRevision,
    selectedCount
  });
}

async function captureCurrentPdfRetrySourceReceipt(sender) {
  const tabId = Math.max(0, Math.floor(Number(sender?.tab?.id) || 0));
  const frameId = Math.floor(Number(sender?.frameId) || 0);
  const sourceDocumentId = String(sender?.documentId || '').trim().slice(0, 256);
  if (!tabId) {
    const error = new Error('Retry admission has no source tab.');
    error.code = 'WEBCLIP_RETRY_SOURCE_TAB_REQUIRED';
    throw error;
  }
  if (frameId !== 0) {
    const error = new Error('Only the top document may claim a live PDF retry generation.');
    error.code = 'WEBCLIP_RETRY_SOURCE_TOP_DOCUMENT_REQUIRED';
    throw error;
  }
  if (!sourceDocumentId) {
    const error = new Error('Retry admission has no exact browser document identity.');
    error.code = 'WEBCLIP_RETRY_SOURCE_DOCUMENT_REQUIRED';
    throw error;
  }

  let rows;
  try {
    rows = await withOperationTimeout(
      Promise.resolve(chrome.scripting.executeScript({
        target: { tabId, documentIds: [sourceDocumentId] },
        world: 'ISOLATED',
        func: currentPdfRetrySourceProbe
      })),
      SCRIPT_EXECUTION_TIMEOUT_MS,
      'Проверка exact source-document generation перед PDF retry'
    );
  } catch (_) {
    const error = new Error('The requesting source document is no longer available for PDF retry.');
    error.code = 'WEBCLIP_RETRY_SOURCE_DOCUMENT_CHANGED';
    throw error;
  }
  if (!Array.isArray(rows) || rows.length !== 1) {
    const error = new Error('Exact retry source-document probe did not resolve uniquely.');
    error.code = 'WEBCLIP_RETRY_SOURCE_DOCUMENT_CHANGED';
    throw error;
  }
  const row = rows[0];
  if (row?.documentId && String(row.documentId) !== sourceDocumentId) {
    const error = new Error('Exact retry source-document probe resolved a different document.');
    error.code = 'WEBCLIP_RETRY_SOURCE_DOCUMENT_CHANGED';
    throw error;
  }
  const result = row?.result;
  if (!result?.ok) {
    const error = new Error(String(result?.reason || 'Current application/selection generation is not admitted for retry.'));
    error.code = String(result?.code || 'WEBCLIP_RETRY_SOURCE_APPLICATION_REQUIRED');
    throw error;
  }
  return normalizeCurrentPdfRetrySourceReceipt(result.receipt, { tabId, sourceDocumentId });
}

function liveRetrySourceReceiptMatches(cachedSourceReceipt, currentSourceReceipt) {
  let cached;
  try {
    cached = sanitizePdfSourceReceipt(cachedSourceReceipt, {
      tabId: currentSourceReceipt?.tabId,
      required: true
    });
  } catch (_) {
    return false;
  }
  const current = currentSourceReceipt && typeof currentSourceReceipt === 'object' ? currentSourceReceipt : null;
  if (!current) return false;
  return Boolean(
    cached.sourceDocumentId === String(current.sourceDocumentId || '')
    && Number(cached.applicationGeneration?.generation || 0) === Number(current.applicationGeneration?.generation || 0)
    && String(cached.applicationGeneration?.href || '') === String(current.applicationGeneration?.href || '')
    && Number(cached.selectionRevision || 0) === Number(current.selectionRevision || 0)
    && Number(cached.selectedCount || 0) === Number(current.selectedCount || 0)
  );
}

async function generatePdfAndDownload(tabId, meta, operationId = '') {
  operationId = String(operationId || '') || makeOperationLogId('local-pdf');
  meta = { ...meta, readingMode: 'read' };
  const resourceReport = sanitizePdfResourceReport(meta.resourceReport) || { version: 1, limit: 500, deadlineMs: 15_000, attempted: 0, loaded: 0, failed: 0, omittedByLimit: 0, scanTruncated: false, deadlineExceeded: false, elapsedMs: 0, failures: [] };
  meta.resourceReport = resourceReport;
  const pageAnalysis = sanitizePageStructureDiagnostics(meta.pageAnalysis);
  meta.pageAnalysis = pageAnalysis;
  await startOperationLog(operationId, 'local-pdf', 'Сохранение PDF в загрузки Chrome', {
    tabId, url: String(meta.url || ''), title: String(meta.title || ''), readingMode: 'read', resourceReport, pageAnalysis
  });
  try {
    recordOperationStage(operationId, 'page-analysis', `Анализ структуры страницы перед PDF: Включены ${pageAnalysis?.selection?.includeCount || 0}, Исключены ${pageAnalysis?.selection?.excludeCount || 0}${pageAnalysis?.selection?.bodyIncluded ? '; выбран body' : ''}.`, 6, 'running', { pageAnalysis });
    const resourceState = resourceReport.failed || resourceReport.omittedByLimit || resourceReport.deadlineExceeded || resourceReport.scanTruncated ? 'partial' : 'running';
    recordOperationStage(
      operationId,
      'resource-prefetch',
      `Ресурсы перед PDF: проверено ${resourceReport.attempted}, готово ${resourceReport.loaded}, не загружено ${resourceReport.failed}${resourceReport.omittedByLimit ? `, не проверено по лимиту ${resourceReport.omittedByLimit}+` : ''}.`,
      12,
      resourceState,
      { resourceReport }
    );
    recordOperationStage(operationId, 'pdf', 'Формируем PDF средствами Chromium…', 20);
    let pdfBlob = await generatePdfBlob(tabId);
    const printDiagnostics = await collectPrintDiagnosticsForTab(tabId);
    const sourceReceipt = captureActivePdfSourceReceipt(tabId, operationId);
    const expectedPdfBytes = pdfBlob.size;
    recordOperationStage(operationId, 'copy-save', `Chromium сформировал PDF-копию (${expectedPdfBytes} байт). Фиксируем состояние структуры страницы и передаём копию в Chrome Downloads.`, 52, 'running', { pdfBytes: expectedPdfBytes, pageAnalysis, printDiagnostics, destination: 'download' });
    const filename = buildFilename(meta);
    const temporaryCacheKey = `local-download:${operationId}`.slice(0, 240);
    await putCachedPdf({
      key: temporaryCacheKey,
      tabId,
      filename,
      meta: {
        ...meta,
        selectionSnapshot: sanitizeSelectionSnapshot(meta.selectionSnapshot),
        resourceReport: sanitizePdfResourceReport(meta.resourceReport)
      },
      pdfBlob,
      sourceReceipt,
      createdAt: Date.now(),
      sourceUrl: normalizeJournalUrl(meta.url || ''),
      temporary: true
    });
    pdfBlob = null;
    recordOperationStage(operationId, 'download', 'Передаём PDF в менеджер загрузок Chrome через IndexedDB/offscreen…', 60, 'running', { filename });
    let blobUrl = '';
    try {
      blobUrl = await createPdfCacheBlobUrl(temporaryCacheKey);
    } finally {
      await deleteCachedPdfByKey(temporaryCacheKey).catch(() => {});
    }

    const pendingData = { destination: 'download', filename, meta: { ...meta, tabId }, sourceReceipt };
    // Persist the intent BEFORE starting the irreversible Chrome download. If
    // the MV3 worker is stopped immediately after downloads.download(), the
    // intent can still be matched to the DownloadItem by its exact blob URL.
    let intentKey = '';
    try {
      intentKey = await checkpointPendingLocalDownloadIntent(pendingData, operationId, blobUrl, expectedPdfBytes);
    } catch (error) {
      await revokeBlobUrl(blobUrl).catch(() => {});
      throw new Error(`Не удалось создать безопасный checkpoint перед локальной загрузкой: ${normalizeError(error)}`);
    }

    const downloadStart = await startAutomaticBlobDownloadBounded({ intentKey, blobUrl, filename, operationId });
    if (downloadStart.pending) {
      const journalWarning = 'Chrome не подтвердил запуск загрузки за 15 с. WebClip сохранил durable checkpoint и продолжит reconciliation после фактического settlement; не запускайте автоматический повтор этой же операции.';
      recordOperationStage(operationId, 'download-start-pending', journalWarning, 78, 'partial', { filename });
      await flushOperationLogWrites(operationId).catch(() => {});
      return { ok: true, filename, downloadId: 0, downloadStartPending: true, journalPendingDownload: true, journalWarning, operationId };
    }
    const downloadId = downloadStart.downloadId;
    if (downloadStart.bindWarning) {
      recordOperationStage(operationId, 'partial', `PDF передан в загрузки Chrome, но привязка downloadId к checkpoint будет восстановлена фоновым обслуживанием: ${downloadStart.bindWarning}`, 100, 'partial', { filename, downloadId });
      await flushOperationLogWrites(operationId).catch(() => {});
      return { ok: true, filename, downloadId, journalPendingDownload: true, journalWarning: downloadStart.bindWarning, operationId };
    }

    recordOperationStage(operationId, 'download-wait', 'Ожидаем подтверждение завершения загрузки Chrome перед записью в журнал…', 85, 'running', { filename, downloadId });
    const matches = await withOperationTimeout(chrome.downloads.search({ id: downloadId }), DOWNLOADS_SEARCH_TIMEOUT_MS, 'Проверка результата локальной загрузки Chrome').catch(() => []);
    const current = Array.isArray(matches) ? matches[0] : null;
    if (current?.state === 'complete' || current?.state === 'interrupted') {
      await finalizePendingLocalDownload(downloadId, current.state, current.error || '').catch(() => {});
    }
    return { ok: true, filename, downloadId, journalPendingDownload: true, operationId };
  } catch (error) {
    recordOperationStage(operationId, 'error', `Ошибка: ${normalizeError(error)}`, 100, 'error');
    throw error;
  }
}

async function generatePdfAndUploadToYandex(tabId, meta, operationId = '') {
  operationId = String(operationId || '') || makeOperationLogId('yandex-pdf');
  const readingMode = meta?.readingMode === 'later' ? 'later' : 'read';
  const resourceReport = sanitizePdfResourceReport(meta?.resourceReport) || { version: 1, limit: 500, deadlineMs: 15_000, attempted: 0, loaded: 0, failed: 0, omittedByLimit: 0, scanTruncated: false, deadlineExceeded: false, elapsedMs: 0, failures: [] };
  const pageAnalysis = sanitizePageStructureDiagnostics(meta?.pageAnalysis);
  meta = { ...meta, readingMode, resourceReport, pageAnalysis };
  await startOperationLog(operationId, 'yandex-pdf', readingMode === 'later' ? 'Сохранение «Прочитать позже» на Яндекс Диск' : 'Сохранение «Прочитано» на Яндекс Диск', {
    tabId, url: String(meta.url || ''), title: String(meta.title || ''), readingMode, fileCommentPresent: Boolean(String(meta.fileComment || '').trim()), resourceReport, pageAnalysis
  });

  let filename = '';
  let cachedSaved = false;
  try {
    recordOperationStage(operationId, 'page-analysis', `Анализ структуры страницы перед PDF: Включены ${pageAnalysis?.selection?.includeCount || 0}, Исключены ${pageAnalysis?.selection?.excludeCount || 0}${pageAnalysis?.selection?.bodyIncluded ? '; выбран body' : ''}.`, 12, 'running', { pageAnalysis });
    const resourceState = resourceReport.failed || resourceReport.omittedByLimit || resourceReport.deadlineExceeded || resourceReport.scanTruncated ? 'partial' : 'running';
    recordOperationStage(
      operationId,
      'resource-prefetch',
      `Ресурсы перед PDF: проверено ${resourceReport.attempted}, готово ${resourceReport.loaded}, не загружено ${resourceReport.failed}${resourceReport.omittedByLimit ? `, не проверено по лимиту ${resourceReport.omittedByLimit}+` : ''}.`,
      24,
      resourceState,
      { resourceReport }
    );
    emitPageUploadProgress(tabId, operationId, 'pdf', 'Формируем PDF из подготовленных областей страницы…', 32);
    let pdfBlob = await generatePdfBlob(tabId);
    const printDiagnostics = await collectPrintDiagnosticsForTab(tabId);
    const sourceReceipt = captureActivePdfSourceReceipt(tabId, operationId);
    recordOperationStage(operationId, 'copy-save', `Chromium сформировал PDF-копию (${pdfBlob.size} байт). Фиксируем состояние структуры страницы перед сохранением на Яндекс Диск.`, 40, 'running', { pdfBytes: pdfBlob.size, pageAnalysis, printDiagnostics, destination: 'yandex' });
    filename = buildYandexFilename(meta);
    emitPageUploadProgress(tabId, operationId, 'cache', 'Сохраняем сформированный PDF во временный кэш для безопасного повтора…', 44);
    const cacheGeneration = issuePdfCacheGeneration();
    const cached = {
      key: cacheGeneration.key, cacheGeneration: cacheGeneration.generation, sealed: true, tabId, filename,
      meta: {
        hostname: String(meta.hostname || 'site'),
        siteAddress: String(meta.siteAddress || ''),
        url: String(meta.url || ''),
        title: String(meta.title || ''),
        localDateTime: String(meta.localDateTime || ''),
        filenameTimestamp: String(meta.filenameTimestamp || ''),
        fileComment: String(meta.fileComment || ''),
        readingMode,
        selectionSnapshot: sanitizeSelectionSnapshot(meta.selectionSnapshot),
        resourceReport: sanitizePdfResourceReport(meta.resourceReport)
      },
      journalEntryId: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      sourceReceipt,
      pdfBlob, createdAt: Date.now(), sourceUrl: normalizeJournalUrl(meta.url || '')
    };
    const cachedMetadata = await putCachedPdf(cached);
    cached.pdfBlob = null;
    pdfBlob = null;
    Object.assign(cached, cachedMetadata);
    try {
      await publishPdfRetryIndex(tabId, cachedMetadata);
    } catch (error) {
      await deleteCachedPdfGeneration(cachedMetadata).catch(() => {});
      throw error;
    }
    cachedSaved = true;

    const result = await uploadCachedRecordToYandex(cached, { tabId, operationId });
    await deleteCachedPdfGeneration(cached).catch((error) => {
      console.warn('WebClip exact PDF cache cleanup after remote success:', error);
    });
    emitPageUploadProgress(
      tabId,
      operationId,
      'complete',
      result.journalWarning
        ? 'PDF успешно загружен на Яндекс Диск, но запись журнала ожидает автоматического восстановления.'
        : 'PDF успешно загружен и проверен на Яндекс Диске.',
      100,
      result.journalWarning ? 'partial' : 'success',
      result
    );
    await updateActionForTab(tabId).catch((error) => {
      recordOperationStage(operationId, 'ui-warning', `PDF сохранён, но badge вкладки не обновлён: ${normalizeError(error)}`, 100, 'partial', { tabId });
    });
    return { ...result, journalPendingRecovery: Boolean(result.journalWarning), operationId };
  } catch (error) {
    emitPageUploadProgress(tabId, operationId, 'error', `Ошибка: ${normalizeError(error)}`, 100, 'error');
    return { ok: false, cached: cachedSaved, filename, error: normalizeError(error), operationId };
  }
}

async function retryCachedPdfUploadToYandex(tabId, operationId = '', currentSourceReceipt = null) {
  operationId = String(operationId || '') || makeOperationLogId('yandex-retry');
  const cached = await getValidCachedPdfForTab(tabId, currentSourceReceipt);
  await startOperationLog(operationId, 'yandex-pdf-retry', 'Повторная отправка PDF на Яндекс Диск', {
    tabId, filename: String(cached?.filename || ''), url: String(cached?.meta?.url || ''), readingMode: cached?.meta?.readingMode === 'later' ? 'later' : 'read', retry: true, retryKind: 'manual-cached-upload'
  });
  if (!cached?.key || !cached?.pdfByteLength) {
    recordOperationStage(operationId, 'error', 'Ранее сформированный PDF не найден.', 100, 'error');
    return {
      ok: false,
      cached: false,
      error: 'Ранее сформированный PDF не найден. Вернитесь к выделению и запустите сохранение заново.',
      operationId
    };
  }

  try {
    emitPageUploadProgress(tabId, operationId, 'cache', 'Используем ранее сформированный PDF из временного кэша…', 44);
    const result = await uploadCachedRecordToYandex(cached, { tabId, operationId, allowExisting: true });
    await deleteCachedPdfGeneration(cached).catch((error) => {
      console.warn('WebClip exact PDF cache cleanup after retry success:', error);
    });
    emitPageUploadProgress(
      tabId,
      operationId,
      'complete',
      result.journalWarning
        ? 'PDF успешно загружен на Яндекс Диск, но запись журнала ожидает автоматического восстановления.'
        : 'PDF успешно загружен и проверен на Яндекс Диске.',
      100,
      result.journalWarning ? 'partial' : 'success',
      result
    );
    await updateActionForTab(tabId).catch((error) => {
      recordOperationStage(operationId, 'ui-warning', `PDF сохранён, но badge вкладки не обновлён: ${normalizeError(error)}`, 100, 'partial', { tabId });
    });
    return { ...result, journalPendingRecovery: Boolean(result.journalWarning), operationId };
  } catch (error) {
    emitPageUploadProgress(tabId, operationId, 'error', `Ошибка: ${normalizeError(error)}`, 100, 'error');
    return {
      ok: false,
      cached: true,
      filename: cached.filename,
      error: normalizeError(error),
      operationId
    };
  }
}

async function uploadCachedRecordToYandex(cached, { tabId = cached?.tabId || 0, operationId = '', allowExisting = false } = {}) {
  if (!isExactSealedPdfCacheIdentity(cached)) {
    const error = new Error('Yandex upload требует exact sealed PDF cache generation.');
    error.code = 'WEBCLIP_PDF_CACHE_GENERATION_REQUIRED';
    throw error;
  }
  const config = await getYandexConfig();
  if (!config.rootPath) throw new Error('Не выбрана корневая папка Яндекс Диска. Откройте настройки расширения.');

  const meta = cached.meta || {};
  const readingMode = meta.readingMode === 'later' ? 'later' : 'read';
  const branchName = readingMode === 'later' ? YANDEX_READ_LATER_DIR : YANDEX_UPLOAD_DIR;
  emitPageUploadProgress(tabId, operationId, 'disk-access', `Проверяем доступ к Яндекс Диску и служебной папке ${branchName}…`, 52);
  const structure = await ensureYandexServiceFolders({
    includeUpload: readingMode === 'read',
    includeReadLater: readingMode === 'later',
    operationId
  });

  const filename = cached.filename || buildYandexFilename(meta);
  const siteSegments = getSiteFolderSegments(meta.hostname || 'site');
  const branchPath = readingMode === 'later' ? structure.readLaterPath : structure.uploadPath;
  const targetFolder = joinDiskPath(branchPath, ...siteSegments);

  emitPageUploadProgress(tabId, operationId, 'site-folder', `Подготавливаем папку сайта: ${targetFolder}`, 60);
  try { await ensureYandexFolderTree(targetFolder, operationId); }
  catch (error) { throw new Error(`Не удалось подготовить папку сайта внутри ${branchPath}: ${normalizeError(error)}`); }

  const remotePath = joinDiskPath(targetFolder, filename);
  const accountUid = await getCurrentYandexAccountUid(operationId);
  const rootPath = normalizeDiskPath(config.rootPath || '');
  const expectedPdfBytes = requirePositiveByteSize(cached.pdfByteLength, 'Ожидаемый размер PDF');
  const remoteJournalEntryId = String(cached.journalEntryId || '').trim()
    || `remote-${Math.max(0, Number(cached.createdAt) || Date.now())}-${Math.max(0, Number(tabId) || 0)}`;
  let remoteCheckpoint = null;
  const ensureRemoteCheckpoint = async () => {
    if (remoteCheckpoint) return remoteCheckpoint;
    // This helper is reached only after either an upload URL was issued or
    // an existing remote file was observed. Persist admitted-unknown directly:
    // a separate prepared -> admitted write would leave a cross-DB race where
    // PDF TTL cleanup could consume a stale pre-admission snapshot.
    remoteCheckpoint = await checkpointPendingRemoteSaveIntent({
      destination: 'yandex', filename, remotePath, folder: targetFolder, publicUrl: '', resourceId: '', accountUid, rootPath,
      journalEntryId: remoteJournalEntryId,
      journalCreatedAt: Math.max(0, Number(cached.createdAt) || 0) || Date.now(),
      sourceReceipt: cached.sourceReceipt,
      meta
    }, {
      expectedPdfBytes,
      createPublicLinks: config.createPublicLinks,
      operationId,
      pdfCacheKey: String(cached.key || ''),
      pdfCacheGeneration: String(cached.cacheGeneration || '')
    });
    recordOperationStage(operationId, 'remote-checkpoint', 'Создан durable checkpoint удалённого сохранения до передачи/финализации файла.', 66, 'running', {
      journalEntryId: remoteCheckpoint.id, remotePath, expectedPdfBytes
    });
    return remoteCheckpoint;
  };
  let existingFileReused = false;

  if (allowExisting) {
    try {
      const existing = await yandexApi('/resources', {
        method: 'GET', query: { path: remotePath, fields: 'name,path,type,size,public_url,resource_id' }, operationId
      });
      if (existing?.type !== 'file') throw new Error(`Путь ${remotePath} уже существует, но не является файлом.`);
      assertExactYandexRemoteByteSize(expectedPdfBytes, existing?.size, 'Уже существующий PDF на Яндекс Диске');
      existingFileReused = true;
      emitPageUploadProgress(tabId, operationId, 'upload', 'Файл уже присутствует на Яндекс Диске после предыдущей попытки. Повторную передачу байтов пропускаем…', 78, 'running', { remotePath });
    } catch (error) { if (Number(error?.status) !== 404) throw error; }
  }

  if (!existingFileReused) {
    emitPageUploadProgress(tabId, operationId, 'upload-url', 'Получаем от Яндекс Диска адрес для загрузки PDF…', 68, 'running', { remotePath });
    const uploadLink = await yandexApi('/resources/upload', { method: 'GET', query: { path: remotePath, overwrite: 'false' }, operationId });
    if (!uploadLink?.href) throw new Error('Яндекс Диск не вернул адрес для загрузки файла.');
    await ensureRemoteCheckpoint();
    emitPageUploadProgress(tabId, operationId, 'upload', 'Передаём PDF на сервер загрузки Яндекс Диска…', 78, 'running', { remotePath });
    let uploadResponse;
    try {
      uploadResponse = await runOffscreenSignedTransfer({
        mode: 'pdf-cache-upload',
        url: uploadLink.href,
        method: uploadLink.method || 'PUT',
        pdfCacheKey: String(cached.key || ''),
        pdfCacheGeneration: String(cached.cacheGeneration || ''),
        expectedPdfBytes,
        contentType: 'application/pdf'
      }, { operationId, label: 'Загрузка PDF на Яндекс Диск', timeoutMs: 90_000 });
    } catch (error) { throw new Error(`Не удалось передать PDF на сервер загрузки Яндекс Диска: ${normalizeError(error)}`); }
    if (!uploadResponse.ok) {
      throw new Error(`Ошибка загрузки Яндекс Диска: HTTP ${uploadResponse.status}${uploadResponse.details ? ` — ${uploadResponse.details}` : ''}`);
    }
  }

  // For a reused file no upload was necessary, but journal metadata must still
  // have a durable checkpoint before public-link/verification/final append.
  await ensureRemoteCheckpoint();

  let publicUrl = '';
  if (config.createPublicLinks) {
    emitPageUploadProgress(tabId, operationId, 'public-link', 'Создаём постоянную ссылку на файл Яндекс Диска…', 88, 'running', { remotePath });
    publicUrl = await ensureYandexPublicUrl(remotePath, operationId);
  } else {
    emitPageUploadProgress(tabId, operationId, 'public-link', 'Создание постоянной ссылки отключено. Переходим к проверке файла…', 88, 'running', { remotePath });
  }

  emitPageUploadProgress(tabId, operationId, 'verify', 'Проверяем созданный файл и его метаданные на Яндекс Диске…', 95, 'running', { remotePath });
  const metadata = await yandexApi('/resources', { method: 'GET', query: { path: remotePath, fields: 'name,path,type,size,modified,public_url,resource_id' }, operationId });
  if (metadata?.type !== 'file') throw new Error('После загрузки PDF не найден на Яндекс Диске.');
  assertExactYandexRemoteByteSize(expectedPdfBytes, metadata?.size, 'Загруженный PDF на Яндекс Диске');
  if (!publicUrl) publicUrl = normalizeYandexPublicUrlFromApi(metadata?.public_url || '');

  remoteCheckpoint = await markPendingRemoteSaveVerified(remoteCheckpoint.id, {
    publicUrl,
    resourceId: normalizeYandexResourceIdFromApi(metadata?.resource_id || '')
  });
  const journalAppend = await appendJournalEntryFromDurableCheckpoint(remoteCheckpoint.data, operationId, {
    storeName: JOURNAL_PENDING_REMOTE_STORE,
    key: remoteCheckpoint.id,
    label: 'checkpoint удалённого сохранения'
  });
  const journalWarning = String(journalAppend?.warning || '');
  const journalRecoveryGuaranteed = Boolean(journalAppend?.recoveryGuaranteed);
  if (journalAppend?.cancelled) {
    // A reset may preserve this checkpoint only as reconciliation authority.
    // Remote verification is terminal, so retire it without recreating the
    // cleared/replaced Journal entry.
    await removePendingRemoteSave(remoteCheckpoint.id).catch((error) => {
      console.warn('WebClip reset-superseded remote checkpoint cleanup:', error);
    });
  } else if (!journalWarning) {
    await removePendingRemoteSave(remoteCheckpoint.id).catch((error) => {
      console.warn('WebClip remote-save checkpoint cleanup:', error);
    });
  }

  return {
    ok: true, filename, remotePath, folder: targetFolder, publicUrl, resourceId: normalizeYandexResourceIdFromApi(metadata?.resource_id || ''), accountUid, rootPath, readingMode,
    reusedCachedPdf: true, existingFileReused, journalWarning,
    journalRecoveryGuaranteed
  };
}

async function downloadCachedPdf(tabId, operationId = '', currentSourceReceipt = null) {
  operationId = String(operationId || '') || makeOperationLogId('cached-pdf-download');
  const cached = await getValidCachedPdfForTab(tabId, currentSourceReceipt);
  await startOperationLog(operationId, 'cached-pdf-download', 'Скачивание ранее сформированного PDF', {
    tabId, filename: cached?.filename || '', url: cached?.meta?.url || ''
  });
  if (!cached?.key || !cached?.pdfByteLength) {
    recordOperationStage(operationId, 'error', 'Ранее сформированный PDF не найден или относится к другой странице.', 100, 'error');
    throw new Error('Ранее сформированный PDF не найден или относится к другой странице.');
  }

  let blobUrl = '';
  try {
    recordOperationStage(operationId, 'download', 'Передаём готовый PDF в менеджер загрузок Chrome…', 55, 'running', { filename: cached.filename || '' });
    blobUrl = await createPdfCacheBlobUrl(cached.key);
    const meta = { ...(cached.meta || {}), readingMode: 'read', tabId };
    const pendingData = { destination: 'download', filename: cached.filename, meta, sourceReceipt: cached.sourceReceipt };
    let intentKey = '';
    try {
      intentKey = await checkpointPendingLocalDownloadIntent(pendingData, operationId, blobUrl, cached.pdfByteLength);
    } catch (error) {
      await revokeBlobUrl(blobUrl).catch(() => {});
      throw new Error(`Не удалось создать безопасный checkpoint перед локальной загрузкой: ${normalizeError(error)}`);
    }
    const downloadStart = await startAutomaticBlobDownloadBounded({ intentKey, blobUrl, filename: cached.filename, operationId });
    if (downloadStart.pending) {
      const journalWarning = 'Chrome не подтвердил запуск загрузки за 15 с. WebClip сохранил durable checkpoint и продолжит reconciliation после фактического settlement; не запускайте автоматический повтор этой же операции.';
      recordOperationStage(operationId, 'download-start-pending', journalWarning, 78, 'partial', { filename: cached.filename });
      await flushOperationLogWrites(operationId).catch(() => {});
      return { ok: true, filename: cached.filename, downloadId: 0, cached: true, downloadStartPending: true, journalPendingDownload: true, journalWarning, operationId };
    }
    const downloadId = downloadStart.downloadId;
    if (downloadStart.bindWarning) {
      recordOperationStage(operationId, 'partial', `PDF передан в загрузки Chrome, но привязка downloadId к checkpoint будет восстановлена фоновым обслуживанием: ${downloadStart.bindWarning}`, 100, 'partial', { filename: cached.filename, downloadId });
      await flushOperationLogWrites(operationId).catch(() => {});
      return { ok: true, filename: cached.filename, downloadId, cached: true, journalPendingDownload: true, journalWarning: downloadStart.bindWarning, operationId };
    }
    recordOperationStage(operationId, 'download-wait', 'Ожидаем подтверждение завершения загрузки Chrome перед записью в журнал…', 85, 'running', { filename: cached.filename, downloadId });
    const matches = await withOperationTimeout(chrome.downloads.search({ id: downloadId }), DOWNLOADS_SEARCH_TIMEOUT_MS, 'Проверка результата локальной загрузки Chrome').catch(() => []);
    const current = Array.isArray(matches) ? matches[0] : null;
    if (current?.state === 'complete' || current?.state === 'interrupted') {
      await finalizePendingLocalDownload(downloadId, current.state, current.error || '').catch(() => {});
    }
    return { ok: true, filename: cached.filename, downloadId, cached: true, journalPendingDownload: true, operationId };
  } catch (error) {
    if (blobUrl) await revokeBlobUrl(blobUrl).catch(() => {});
    recordOperationStage(operationId, 'error', `Ошибка: ${normalizeError(error)}`, 100, 'error');
    throw error;
  }
}

function normalizeJournalUrl(url) {
  try {
    const parsed = new URL(String(url || ''));
    parsed.hash = '';
    return parsed.toString();
  } catch (_) {
    return String(url || '').split('#')[0];
  }
}

function getJournalSiteKey(urlOrHostname) {
  const raw = String(urlOrHostname || '').trim();
  if (!raw) return '';
  let hostname = raw;
  try {
    hostname = new URL(raw).hostname;
  } catch (_) {
    hostname = raw.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];
  }
  return getSiteNameUpToThirdLevel(hostname).toLowerCase();
}

function sanitizeSelectionSnapshot(snapshot, { rejectOverflow = false } = {}) {
  let approximateChars = 64;
  let overflow = false;

  const safeSimpleLocator = (locator) => {
    if (!locator || typeof locator !== 'object') return null;
    return {
      cssPath: String(locator.cssPath || '').slice(0, 4000),
      domPath: Array.isArray(locator.domPath)
        ? locator.domPath.slice(0, 128).map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 0)
        : [],
      tag: String(locator.tag || '').slice(0, 64),
      id: String(locator.id || '').slice(0, 512),
      classes: Array.isArray(locator.classes) ? locator.classes.slice(0, 16).map((value) => String(value).slice(0, 240)) : [],
      text: String(locator.text || '').slice(0, 240),
      ariaLabel: String(locator.ariaLabel || '').slice(0, 240),
      name: String(locator.name || '').slice(0, 240),
      title: String(locator.title || '').slice(0, 240),
      src: String(locator.src || '').slice(0, 2000),
      role: String(locator.role || '').slice(0, 120),
      href: String(locator.href || '').slice(0, 2000),
      parentTag: String(locator.parentTag || '').slice(0, 64),
      parentId: String(locator.parentId || '').slice(0, 512),
      parentRole: String(locator.parentRole || '').slice(0, 120),
      parentText: String(locator.parentText || '').slice(0, 240),
      previousText: String(locator.previousText || '').slice(0, 180),
      nextText: String(locator.nextText || '').slice(0, 180),
      siblingIndex: Number.isInteger(Number(locator.siblingIndex)) && Number(locator.siblingIndex) >= 0
        ? Math.min(100000, Number(locator.siblingIndex))
        : -1,
      sameTagIndex: Number.isInteger(Number(locator.sameTagIndex)) && Number(locator.sameTagIndex) >= 0
        ? Math.min(100000, Number(locator.sameTagIndex))
        : -1
    };
  };

  const safeLocator = (locator) => {
    const base = safeSimpleLocator(locator);
    if (!base) return null;
    base.framePath = Array.isArray(locator.framePath)
      ? locator.framePath.slice(0, 16).map(safeSimpleLocator).filter(Boolean)
      : [];
    return base;
  };

  const cleanList = (items) => {
    if (!Array.isArray(items)) return [];
    if (items.length > 250) overflow = true;
    const result = [];
    for (const item of items.slice(0, 250)) {
      const locator = safeLocator(item);
      if (!locator) continue;
      const chars = jsonSizeChars(locator) + 1;
      if (approximateChars + chars > MAX_SELECTION_SNAPSHOT_JSON_CHARS) {
        overflow = true;
        break;
      }
      approximateChars += chars;
      result.push(locator);
    }
    return result;
  };

  const safe = {
    version: Number(snapshot?.version) >= 3 ? 3 : (Number(snapshot?.version) >= 2 ? 2 : 1),
    includes: cleanList(snapshot?.includes),
    excludes: []
  };
  safe.excludes = cleanList(snapshot?.excludes);

  if (overflow && rejectOverflow) {
    const error = new Error('Объём данных выбранных областей страницы превышает безопасный предел. Уменьшите число/сложность областей и повторите операцию.');
    error.code = 'SELECTION_SNAPSHOT_TOO_LARGE';
    throw error;
  }
  return safe;
}

let journalRevisionWriteInFlight = null;
let pendingJournalRevision = null;
let journalRuntimeNotificationInFlight = null;
let pendingJournalRuntimeNotification = null;

function drainJournalRevisionWrite() {
  if (journalRevisionWriteInFlight || !pendingJournalRevision) return;
  const revision = pendingJournalRevision;
  pendingJournalRevision = null;
  let actual;
  try {
    actual = Promise.resolve(chrome.storage.local.set({ webclipJournalRevision: revision }));
  } catch (error) {
    actual = Promise.reject(error);
  }
  // Do not start the next durable marker write until Chrome settles the
  // previous non-cancellable side effect. This prevents a late old set() from
  // rolling the revision marker back. Pending changes are coalesced to the
  // newest revision, so a degraded Storage API cannot grow an unbounded queue.
  journalRevisionWriteInFlight = actual.catch(() => {}).finally(() => {
    journalRevisionWriteInFlight = null;
    drainJournalRevisionWrite();
  });
}

function drainJournalRuntimeNotification() {
  if (journalRuntimeNotificationInFlight || !pendingJournalRuntimeNotification) return;
  const payload = pendingJournalRuntimeNotification;
  pendingJournalRuntimeNotification = null;
  let actual;
  try {
    actual = Promise.resolve(chrome.runtime.sendMessage(payload));
  } catch (error) {
    actual = Promise.reject(error);
  }
  journalRuntimeNotificationInFlight = actual.catch(() => {}).finally(() => {
    journalRuntimeNotificationInFlight = null;
    drainJournalRuntimeNotification();
  });
}

function notifyJournalChanged(reason = 'changed') {
  const changedAt = Date.now();
  const normalizedReason = String(reason || 'changed');
  const revision = {
    changedAt,
    reason: normalizedReason,
    nonce: `${changedAt}-${Math.random().toString(16).slice(2)}`
  };
  pendingJournalRevision = revision;
  pendingJournalRuntimeNotification = {
    type: 'WEBCLIP_JOURNAL_CHANGED',
    reason: normalizedReason,
    changedAt
  };
  drainJournalRevisionWrite();
  drainJournalRuntimeNotification();
}

let journalStatsMarkerSettlementChain = Promise.resolve();

function normalizeJournalStatsDirtyState(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (Array.isArray(raw.tokens)) {
    return {
      version: 2,
      tokens: raw.tokens.slice(0, 128).map((item) => ({
        token: String(item?.token || '').slice(0, 160),
        reason: String(item?.reason || 'journal-change').slice(0, 160),
        changedAt: Math.max(0, Number(item?.changedAt || 0))
      })).filter((item) => item.token),
      overflow: Boolean(raw.overflow),
      revision: String(raw.revision || '').slice(0, 160),
      changedAt: Math.max(0, Number(raw.changedAt || 0))
    };
  }
  // Legacy single-token marker from the first audit implementation.
  const legacyToken = String(raw.token || '').slice(0, 160);
  if (!legacyToken) return null;
  return {
    version: 2,
    tokens: [{
      token: legacyToken,
      reason: String(raw.reason || 'journal-change').slice(0, 160),
      changedAt: Math.max(0, Number(raw.changedAt || 0))
    }],
    overflow: false,
    revision: `legacy-${legacyToken}`.slice(0, 160),
    changedAt: Math.max(0, Number(raw.changedAt || 0))
  };
}

async function queueJournalStatsMarkerMutation(task, label = 'Изменение crash-consistency marker журнала') {
  let releaseTurn = null;
  const turn = new Promise((resolve) => { releaseTurn = resolve; });
  const previous = journalStatsMarkerSettlementChain.catch(() => {});
  journalStatsMarkerSettlementChain = turn;
  try {
    await withOperationTimeout(
      previous,
      CHROME_STORAGE_OPERATION_TIMEOUT_MS,
      `${label}: ожидание предыдущего marker mutation`
    );
  } catch (error) {
    // The previous chrome.storage mutation can settle after our local timeout.
    // Keep the marker queue closed until that real async chain finishes.
    void previous.finally(() => releaseTurn()).catch(() => releaseTurn());
    throw error;
  }
  let actual;
  try { actual = Promise.resolve().then(task); }
  catch (error) { actual = Promise.reject(error); }
  void actual.finally(() => releaseTurn()).catch(() => releaseTurn());
  return withOperationTimeout(actual, CHROME_STORAGE_OPERATION_TIMEOUT_MS, label);
}

async function beginJournalStatsMutation(reason) {
  const token = `${Date.now()}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)}`;
  await queueJournalStatsMarkerMutation(async () => {
    const stored = await chrome.storage.local.get(JOURNAL_STATS_DIRTY_KEY);
    const state = normalizeJournalStatsDirtyState(stored?.[JOURNAL_STATS_DIRTY_KEY]) || {
      version: 2, tokens: [], overflow: false, revision: '', changedAt: 0
    };
    if (state.tokens.length < 128) {
      state.tokens.push({ token, reason: String(reason || 'journal-change').slice(0, 160), changedAt: Date.now() });
    } else {
      // Never silently become "clean" when more concurrent mutations exist
      // than we retain individually. A full rebuild is required to clear overflow.
      state.overflow = true;
    }
    state.revision = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    state.changedAt = Date.now();
    await chrome.storage.local.set({ [JOURNAL_STATS_DIRTY_KEY]: state });
  }, 'Фиксация dirty marker перед изменением журнала');
  return token;
}

async function completeJournalStatsMutation(token) {
  if (!token) return;
  await queueJournalStatsMarkerMutation(async () => {
    const stored = await chrome.storage.local.get(JOURNAL_STATS_DIRTY_KEY);
    const state = normalizeJournalStatsDirtyState(stored?.[JOURNAL_STATS_DIRTY_KEY]);
    if (!state) return;
    state.tokens = state.tokens.filter((item) => item.token !== token);
    state.revision = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    state.changedAt = Date.now();
    if (!state.tokens.length && !state.overflow) {
      await chrome.storage.local.remove(JOURNAL_STATS_DIRTY_KEY);
    } else {
      await chrome.storage.local.set({ [JOURNAL_STATS_DIRTY_KEY]: state });
    }
  }, 'Завершение dirty marker после изменения журнала');
}

let journalStatsRepairPromise = null;
async function ensureJournalStatsHealthy(trigger = 'read') {
  const initial = normalizeJournalStatsDirtyState((await readChromeStorageBounded(
    () => chrome.storage.local.get(JOURNAL_STATS_DIRTY_KEY),
    'Чтение dirty marker журнала'
  ))?.[JOURNAL_STATS_DIRTY_KEY]);
  if (!initial) return { repaired: false };
  if (!journalStatsRepairPromise) {
    journalStatsRepairPromise = (async () => {
      const marker = normalizeJournalStatsDirtyState((await readChromeStorageBounded(
        () => chrome.storage.local.get(JOURNAL_STATS_DIRTY_KEY),
        'Повторное чтение dirty marker журнала'
      ))?.[JOURNAL_STATS_DIRTY_KEY]);
      if (!marker) return { repaired: false };
      const capturedRevision = marker.revision;
      await rebuildAllUrlStats();
      let cleared = false;
      await queueJournalStatsMarkerMutation(async () => {
        const current = normalizeJournalStatsDirtyState((await chrome.storage.local.get(JOURNAL_STATS_DIRTY_KEY))?.[JOURNAL_STATS_DIRTY_KEY]);
        if (current && current.revision === capturedRevision) {
          await chrome.storage.local.remove(JOURNAL_STATS_DIRTY_KEY);
          cleared = true;
        }
      }, 'Очистка dirty marker после восстановления статистики');
      console.info('WebClip urlStats repaired:', trigger, `tokens=${marker.tokens.length}`, marker.overflow ? 'overflow' : '');
      return { repaired: true, cleared, pendingMutations: cleared ? 0 : 1 };
    })().finally(() => { journalStatsRepairPromise = null; });
  }
  return journalStatsRepairPromise;
}

function openJournalDb(timeoutMs = 10_000) {
  return openIndexedDbBounded(
    JOURNAL_DB_NAME,
    JOURNAL_DB_VERSION,
    (db, tx) => {
      let store;
      if (!db.objectStoreNames.contains(JOURNAL_STORE)) {
        store = db.createObjectStore(JOURNAL_STORE, { keyPath: 'id' });
      } else {
        store = tx.objectStore(JOURNAL_STORE);
      }
      if (!store.indexNames.contains('createdAt')) store.createIndex('createdAt', 'createdAt', { unique: false });
      if (!store.indexNames.contains('urlKey')) store.createIndex('urlKey', 'urlKey', { unique: false });
      if (!store.indexNames.contains('urlKeyCreatedAt')) store.createIndex('urlKeyCreatedAt', ['urlKey', 'createdAt'], { unique: false });
      if (!store.indexNames.contains('siteKeyCreatedAt')) store.createIndex('siteKeyCreatedAt', ['siteKey', 'createdAt'], { unique: false });
      if (!db.objectStoreNames.contains(JOURNAL_STATS_STORE)) {
        db.createObjectStore(JOURNAL_STATS_STORE, { keyPath: 'urlKey' });
      }
      if (!db.objectStoreNames.contains(JOURNAL_META_STORE)) {
        db.createObjectStore(JOURNAL_META_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(JOURNAL_PENDING_STORE)) {
        const pendingStore = db.createObjectStore(JOURNAL_PENDING_STORE, { keyPath: 'id' });
        pendingStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      } else {
        const pendingStore = tx.objectStore(JOURNAL_PENDING_STORE);
        if (!pendingStore.indexNames.contains('updatedAt')) pendingStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(JOURNAL_PENDING_DOWNLOAD_STORE)) {
        const pendingDownloadStore = db.createObjectStore(JOURNAL_PENDING_DOWNLOAD_STORE, { keyPath: 'downloadId' });
        pendingDownloadStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      } else {
        const pendingDownloadStore = tx.objectStore(JOURNAL_PENDING_DOWNLOAD_STORE);
        if (!pendingDownloadStore.indexNames.contains('updatedAt')) pendingDownloadStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(JOURNAL_PENDING_REMOTE_STORE)) {
        const pendingRemoteStore = db.createObjectStore(JOURNAL_PENDING_REMOTE_STORE, { keyPath: 'id' });
        pendingRemoteStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      } else {
        const pendingRemoteStore = tx.objectStore(JOURNAL_PENDING_REMOTE_STORE);
        if (!pendingRemoteStore.indexNames.contains('updatedAt')) pendingRemoteStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(JOURNAL_PENDING_DESTRUCTIVE_STORE)) {
        const destructiveStore = db.createObjectStore(JOURNAL_PENDING_DESTRUCTIVE_STORE, { keyPath: 'id' });
        destructiveStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        destructiveStore.createIndex('sourceJournalEntryId', 'sourceJournalEntryId', { unique: false });
      } else {
        const destructiveStore = tx.objectStore(JOURNAL_PENDING_DESTRUCTIVE_STORE);
        if (!destructiveStore.indexNames.contains('updatedAt')) destructiveStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        if (!destructiveStore.indexNames.contains('sourceJournalEntryId')) destructiveStore.createIndex('sourceJournalEntryId', 'sourceJournalEntryId', { unique: false });
      }
      if (!db.objectStoreNames.contains(JOURNAL_IMPORT_STAGING_STORE)) {
        const importStore = db.createObjectStore(JOURNAL_IMPORT_STAGING_STORE, { keyPath: 'key' });
        importStore.createIndex('importId', 'importId', { unique: false });
        importStore.createIndex('createdAt', 'createdAt', { unique: false });
      } else {
        const importStore = tx.objectStore(JOURNAL_IMPORT_STAGING_STORE);
        if (!importStore.indexNames.contains('importId')) importStore.createIndex('importId', 'importId', { unique: false });
        if (!importStore.indexNames.contains('createdAt')) importStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    },
    'Не удалось открыть журнал WebClip.',
    Math.max(1, Math.min(20_000, Number(timeoutMs) || 10_000))
  );
}

function touchJournalDbRevision(tx, reason = 'changed') {
  const store = tx.objectStore(JOURNAL_META_STORE);
  const changedAt = Date.now();
  store.put({
    key: JOURNAL_META_REVISION_KEY,
    value: `${changedAt}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)}`,
    changedAt,
    reason: String(reason || 'changed').slice(0, 120)
  });
}

function normalizeJournalResetGeneration(value) {
  const generation = Number(value);
  return Number.isSafeInteger(generation) && generation >= JOURNAL_INITIAL_RESET_GENERATION
    ? generation
    : JOURNAL_INITIAL_RESET_GENERATION;
}

function normalizeJournalEntryRevision(value) {
  const revision = Number(value);
  return Number.isSafeInteger(revision) && revision >= JOURNAL_INITIAL_ENTRY_REVISION
    ? revision
    : JOURNAL_INITIAL_ENTRY_REVISION;
}

function nextJournalEntryRevision(value) {
  const current = normalizeJournalEntryRevision(value);
  if (current >= Number.MAX_SAFE_INTEGER) {
    const error = new Error('Revision записи журнала исчерпала безопасный числовой диапазон.');
    error.code = 'JOURNAL_ENTRY_REVISION_EXHAUSTED';
    throw error;
  }
  return current + 1;
}

function advanceJournalResetGeneration(tx, reason = 'reset', fail = () => {}) {
  const meta = tx.objectStore(JOURNAL_META_STORE);
  const request = meta.get(JOURNAL_RESET_GENERATION_KEY);
  request.onsuccess = () => {
    try {
      const current = normalizeJournalResetGeneration(request.result?.value);
      if (current >= Number.MAX_SAFE_INTEGER) {
        const error = new Error('Generation журнала исчерпала безопасный числовой диапазон.');
        error.code = 'JOURNAL_RESET_GENERATION_EXHAUSTED';
        fail(error);
        return;
      }
      const next = current + 1;
      const put = meta.put({
        key: JOURNAL_RESET_GENERATION_KEY,
        value: next,
        changedAt: Date.now(),
        reason: String(reason || 'reset').slice(0, 120)
      });
      put.onerror = () => fail(put.error || new Error('Не удалось обновить generation журнала.'));
    } catch (error) { fail(error); }
  };
  request.onerror = () => fail(request.error || new Error('Не удалось прочитать generation журнала.'));
  return request;
}

function journalEntryAuthorityToken(resetGeneration, entry = {}) {
  const entryId = String(entry?.id || '').trim();
  if (!entryId) return null;
  return Object.freeze({
    entryId,
    resetGeneration: normalizeJournalResetGeneration(resetGeneration),
    entryRevision: normalizeJournalEntryRevision(entry?.entryRevision)
  });
}

function normalizeJournalEntryAuthorityToken(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entryId = String(value.entryId || '').trim();
  const resetGeneration = Number(value.resetGeneration);
  const entryRevision = Number(value.entryRevision);
  if (
    !entryId
    || entryId.length > MAX_IMPORTED_ENTRY_ID_CHARS
    || !Number.isSafeInteger(resetGeneration) || resetGeneration < JOURNAL_INITIAL_RESET_GENERATION
    || !Number.isSafeInteger(entryRevision) || entryRevision < JOURNAL_INITIAL_ENTRY_REVISION
  ) return null;
  return Object.freeze({ entryId, resetGeneration, entryRevision });
}

async function rebuildUrlStatsForUrl(urlKey) {
  const key = String(urlKey || '');
  if (!key) return { urlKey: '', lastSavedAt: 0, uniqueDays: 0, dayCounts: {} };
  const db = await openJournalDb();
  try {
    return await runIndexedDbTransactionBounded(db, [JOURNAL_STORE, JOURNAL_STATS_STORE], 'readwrite', 'Пересчёт статистики URL', ({ tx, setResult, fail }) => {
      let lastSavedAt = 0; const dayCounts = {};
      const entries = tx.objectStore(JOURNAL_STORE); const statsStore = tx.objectStore(JOURNAL_STATS_STORE);
      const request = entries.index('urlKey').openCursor(IDBKeyRange.only(key));
      request.onsuccess = () => {
        try {
          const cursor = request.result;
          if (!cursor) { const result = { urlKey: key, lastSavedAt, uniqueDays: Object.keys(dayCounts).length, dayCounts, updatedAt: Date.now() }; if (result.uniqueDays) statsStore.put(result); else statsStore.delete(key); setResult(result); return; }
          const entry = cursor.value || {}; const createdAt = Number(entry.createdAt || 0); if (createdAt > lastSavedAt) lastSavedAt = createdAt; const day = String(entry.localDayKey || localDayKey(createdAt)); if (day) dayCounts[day] = Number(dayCounts[day] || 0) + 1; cursor.continue();
        } catch (error) { fail(error); }
      };
      request.onerror = () => fail(request.error || new Error('Не удалось пересчитать статистику URL.'));
    }, JOURNAL_CRUD_IDB_TX_TIMEOUT_MS);
  } finally { db.close(); }
}

async function rebuildAllUrlStats() {
  // urlStats is secondary/rebuildable data. Keep recovery memory bounded even
  // for 100k mostly-unique URLs: clear the derived store, read Journal in
  // primary-key batches, aggregate only one batch in memory, then merge that
  // batch into urlStats. If MV3 stops mid-rebuild, the dirty marker remains and
  // the next pass clears/restarts the derived store safely.
  const batchSize = 750;
  const deadline = Date.now() + 5 * 60 * 1000;

  const clearDb = await openJournalDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = clearDb.transaction(JOURNAL_STATS_STORE, 'readwrite');
      const timer = setTimeout(() => { try { tx.abort(); } catch (_) {} }, 20_000);
      tx.objectStore(JOURNAL_STATS_STORE).clear();
      tx.oncomplete = () => { clearTimeout(timer); resolve(); };
      tx.onerror = () => { clearTimeout(timer); reject(tx.error || new Error('Не удалось очистить статистику перед перестройкой.')); };
      tx.onabort = () => { clearTimeout(timer); reject(tx.error || new Error('Очистка статистики перед перестройкой была прервана.')); };
    });
  } finally { clearDb.close(); }

  let afterKey = null;
  let processed = 0;
  for (;;) {
    if (Date.now() >= deadline) {
      const error = new Error('Полная перестройка статистики URL превысила безопасный лимит 5 минут. Восстановление будет повторено фоновым обслуживанием.');
      error.code = 'JOURNAL_STATS_REBUILD_TIMEOUT';
      throw error;
    }

    const db = await openJournalDb();
    let batch;
    try {
      batch = await new Promise((resolve, reject) => {
        const tx = db.transaction(JOURNAL_STORE, 'readonly');
        const store = tx.objectStore(JOURNAL_STORE);
        const range = afterKey == null ? null : IDBKeyRange.lowerBound(afterKey, true);
        const request = store.openCursor(range, 'next');
        const aggregate = new Map();
        let count = 0;
        let lastKey = afterKey;
        let exhausted = false;
        const timer = setTimeout(() => { try { tx.abort(); } catch (_) {} }, 20_000);
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) { exhausted = true; return; }
          const entry = cursor.value || {};
          const key = String(entry.urlKey || normalizeJournalUrl(entry.url || ''));
          if (key) {
            const stat = aggregate.get(key) || { urlKey: key, lastSavedAt: 0, dayCounts: {} };
            const createdAt = Number(entry.createdAt || 0);
            stat.lastSavedAt = Math.max(stat.lastSavedAt, createdAt);
            const day = String(entry.localDayKey || localDayKey(createdAt));
            if (day) stat.dayCounts[day] = Number(stat.dayCounts[day] || 0) + 1;
            aggregate.set(key, stat);
          }
          count += 1;
          lastKey = cursor.primaryKey;
          if (count < batchSize) cursor.continue();
        };
        request.onerror = () => reject(request.error || new Error('Не удалось прочитать пакет журнала для перестройки статистики.'));
        tx.oncomplete = () => { clearTimeout(timer); resolve({ aggregate, count, lastKey, exhausted }); };
        tx.onerror = () => { clearTimeout(timer); reject(tx.error || new Error('Не удалось прочитать пакет журнала для перестройки статистики.')); };
        tx.onabort = () => { clearTimeout(timer); reject(tx.error || new Error('Пакетное чтение журнала для статистики было прервано.')); };
      });
    } finally { db.close(); }

    if (batch.aggregate.size) {
      const mergeDb = await openJournalDb();
      try {
        await new Promise((resolve, reject) => {
          const tx = mergeDb.transaction(JOURNAL_STATS_STORE, 'readwrite');
          const store = tx.objectStore(JOURNAL_STATS_STORE);
          const now = Date.now();
          const timer = setTimeout(() => { try { tx.abort(); } catch (_) {} }, 20_000);
          for (const [key, delta] of batch.aggregate) {
            const req = store.get(key);
            req.onsuccess = () => {
              const current = req.result || { urlKey: key, lastSavedAt: 0, dayCounts: {} };
              const dayCounts = current.dayCounts && typeof current.dayCounts === 'object' ? current.dayCounts : {};
              for (const [day, value] of Object.entries(delta.dayCounts || {})) {
                dayCounts[day] = Number(dayCounts[day] || 0) + Math.max(0, Number(value) || 0);
              }
              store.put({
                urlKey: key,
                lastSavedAt: Math.max(Number(current.lastSavedAt || 0), Number(delta.lastSavedAt || 0)),
                dayCounts,
                uniqueDays: Object.keys(dayCounts).length,
                updatedAt: now
              });
            };
            req.onerror = () => { try { tx.abort(); } catch (_) {} };
          }
          tx.oncomplete = () => { clearTimeout(timer); resolve(); };
          tx.onerror = () => { clearTimeout(timer); reject(tx.error || new Error('Не удалось объединить пакет статистики URL.')); };
          tx.onabort = () => { clearTimeout(timer); reject(tx.error || new Error('Объединение пакета статистики URL было прервано.')); };
        });
      } finally { mergeDb.close(); }
    }

    processed += batch.count;
    if (batch.exhausted || batch.count === 0) break;
    afterKey = batch.lastKey;
  }
  return { rebuilt: true, processed };
}

async function updateUrlStatsAfterAppend(entry) {
  const key = String(entry?.urlKey || '');
  if (!key) return;
  let needsRebuild = false;
  const db = await openJournalDb();
  try {
    await runIndexedDbTransactionBounded(db, JOURNAL_STATS_STORE, 'readwrite', 'Обновление статистики URL', ({ store, fail }) => {
      const statsStore = store(); const req = statsStore.get(key);
      req.onsuccess = () => {
        try {
          if (!req.result) { needsRebuild = true; return; }
          const stat = req.result; stat.dayCounts = stat.dayCounts && typeof stat.dayCounts === 'object' ? stat.dayCounts : {}; const day = String(entry.localDayKey || localDayKey(entry.createdAt)); if (day) stat.dayCounts[day] = Number(stat.dayCounts[day] || 0) + 1; stat.uniqueDays = Object.keys(stat.dayCounts).length; stat.lastSavedAt = Math.max(Number(stat.lastSavedAt || 0), Number(entry.createdAt || 0)); stat.updatedAt = Date.now(); statsStore.put(stat);
        } catch (error) { fail(error); }
      };
      req.onerror = () => fail(req.error || new Error('Не удалось обновить статистику URL.'));
    }, JOURNAL_CRUD_IDB_TX_TIMEOUT_MS);
  } finally { db.close(); }
  if (needsRebuild) await rebuildUrlStatsForUrl(key);
}

async function migrateLegacyPendingJournalAppends() {
  const stored = await readChromeStorageBounded(
    () => chrome.storage.local.get(JOURNAL_PENDING_APPENDS_KEY),
    'Чтение legacy очереди journal append'
  );
  const legacy = Array.isArray(stored?.[JOURNAL_PENDING_APPENDS_KEY])
    ? stored[JOURNAL_PENDING_APPENDS_KEY].filter((item) => item && typeof item === 'object')
    : [];
  if (!legacy.length) return { migrated: 0 };
  if (legacy.length > MAX_PENDING_JOURNAL_APPENDS) {
    throw new Error('Legacy-очередь восстановления журнала превышает безопасный лимит; автоматическая миграция остановлена без удаления данных.');
  }
  let totalChars = 0;
  const items = [];
  for (const raw of legacy) {
    const data = normalizePendingJournalAppendData(raw.data || {});
    const id = String(raw.id || data.journalEntryId || '').trim();
    if (!id) continue;
    const item = {
      id,
      createdAt: Number(raw.createdAt || Date.now()),
      updatedAt: Number(raw.updatedAt || Date.now()),
      attemptCount: Math.max(0, Number(raw.attemptCount || 0)),
      operationId: String(raw.operationId || '').slice(0, 180),
      lastError: String(raw.lastError || '').slice(0, 2000),
      data: { ...data, journalEntryId: id }
    };
    if (jsonSizeChars(item) > MAX_PENDING_JOURNAL_APPEND_JSON_CHARS) {
      item.data.meta.selectionSnapshot = { includes: [], excludes: [] };
    }
    totalChars += jsonSizeChars(item);
    items.push(item);
  }
  if (totalChars > MAX_PENDING_JOURNAL_QUEUE_JSON_CHARS) {
    throw new Error('Legacy-очередь восстановления журнала превышает безопасный общий размер; автоматическая миграция остановлена без удаления данных.');
  }
  const db = await openJournalDb();
  try {
    await runIndexedDbTransactionBounded(
      db,
      JOURNAL_PENDING_STORE,
      'readwrite',
      'Миграция legacy-очереди восстановления журнала в IndexedDB',
      ({ store }) => {
        const pending = store();
        for (const item of items) pending.put(item);
      },
      RECOVERY_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
  // Commit/remove split is idempotent: a stopped worker may repeat the same puts.
  await mutateChromeStorageSerialized(
    `storage.local:${JOURNAL_PENDING_APPENDS_KEY}`,
    () => chrome.storage.local.remove(JOURNAL_PENDING_APPENDS_KEY),
    'Удаление migrated legacy очереди journal append'
  );
  return { migrated: items.length };
}

function normalizePendingJournalAppendData(data = {}) {
  const createdAt = Number(data.journalCreatedAt || 0) > 0 ? Number(data.journalCreatedAt) : Date.now();
  const journalEntryId = String(data.journalEntryId || '').trim()
    || (crypto.randomUUID ? crypto.randomUUID() : `${createdAt}-${Math.random().toString(16).slice(2)}`);
  const meta = data.meta && typeof data.meta === 'object' ? data.meta : {};
  const prepared = {
    destination: data.destination === 'yandex' ? 'yandex' : 'download',
    filename: String(data.filename || '').slice(0, 512),
    remotePath: normalizeDiskPath(String(data.remotePath || '').slice(0, MAX_IMPORTED_PATH_CHARS)),
    folder: String(data.folder || '').slice(0, MAX_IMPORTED_PATH_CHARS),
    publicUrl: String(data.publicUrl || '').slice(0, MAX_IMPORTED_URL_CHARS),
    resourceId: String(data.resourceId || '').slice(0, MAX_YANDEX_RESOURCE_ID_CHARS),
    accountUid: String(data.accountUid || '').trim().slice(0, MAX_YANDEX_ACCOUNT_FIELD_CHARS),
    rootPath: normalizeDiskPath(String(data.rootPath || '').slice(0, MAX_IMPORTED_PATH_CHARS)),
    remoteIdentityProvenance: WebClipYandexRemoteIdentityAuthority.normalizeProvenance(data.remoteIdentityProvenance),
    journalEntryId,
    journalCreatedAt: createdAt,
    operationId: String(data.operationId || '').slice(0, MAX_OPERATION_ID_CHARS),
    sourceReceipt: sanitizePdfSourceReceipt(data.sourceReceipt),
    meta: {
      hostname: String(meta.hostname || '').slice(0, 255),
      siteAddress: String(meta.siteAddress || '').slice(0, MAX_IMPORTED_URL_CHARS),
      url: String(meta.url || '').slice(0, MAX_IMPORTED_URL_CHARS),
      title: String(meta.title || '').slice(0, 4000),
      localDateTime: String(meta.localDateTime || '').slice(0, 200),
      filenameTimestamp: String(meta.filenameTimestamp || '').slice(0, 100),
      tabId: Math.max(0, Math.floor(Number(meta.tabId) || 0)),
      fileComment: String(meta.fileComment || '').slice(0, MAX_IMPORTED_COMMENT_CHARS),
      readingMode: meta.readingMode === 'later' ? 'later' : 'read',
      selectionSnapshot: sanitizeSelectionSnapshot(meta.selectionSnapshot),
      resourceReport: sanitizePdfResourceReport(meta.resourceReport)
    }
  };
  if (jsonSizeChars(prepared) > MAX_PENDING_JOURNAL_APPEND_JSON_CHARS) {
    prepared.meta.selectionSnapshot = { includes: [], excludes: [] };
  }
  return prepared;
}

async function checkpointPendingJournalAppend(data, operationId = '') {
  const prepared = normalizePendingJournalAppendData({ ...data, operationId: String(operationId || data?.operationId || '').slice(0, MAX_OPERATION_ID_CHARS) });
  const item = { id: prepared.journalEntryId, createdAt: Date.now(), updatedAt: Date.now(), attemptCount: 0, operationId: String(operationId || '').slice(0, 180), lastError: '', data: prepared };
  if (jsonSizeChars(item) > MAX_PENDING_JOURNAL_APPEND_JSON_CHARS) item.data.meta.selectionSnapshot = { includes: [], excludes: [] };
  const itemChars = jsonSizeChars(item);
  if (itemChars > MAX_PENDING_JOURNAL_APPEND_JSON_CHARS) throw new Error('Checkpoint восстановления журнала превышает безопасный размер.');
  const db = await openJournalDb();
  try {
    await runIndexedDbTransactionBounded(db, JOURNAL_PENDING_STORE, 'readwrite', 'Создание checkpoint восстановления журнала', ({ tx, store, fail }) => {
      const pending = store();
      let count = 0; let totalChars = 0; let existingChars = 0; let capacityError = '';
      const cursorReq = pending.openCursor();
      cursorReq.onsuccess = () => {
        try {
          const cursor = cursorReq.result;
          if (cursor) { count += 1; const size = jsonSizeChars(cursor.value || {}); totalChars += size; if (String(cursor.key || '') === item.id) existingChars = size; cursor.continue(); return; }
          const isExisting = existingChars > 0;
          if (!isExisting && count >= MAX_PENDING_JOURNAL_APPENDS) { capacityError = 'Очередь восстановления журнала заполнена; существующие pending-записи не удалены.'; fail(new Error(capacityError)); return; }
          if ((totalChars - existingChars + itemChars) > MAX_PENDING_JOURNAL_QUEUE_JSON_CHARS) { capacityError = 'Очередь восстановления журнала превысила безопасный общий размер; существующие pending-записи не удалены.'; fail(new Error(capacityError)); return; }
          pending.put(item);
        } catch (error) { fail(error); }
      };
      cursorReq.onerror = () => fail(cursorReq.error || new Error('Не удалось проверить очередь восстановления журнала.'));
    }, RECOVERY_IDB_TX_TIMEOUT_MS);
  } finally { db.close(); }
  return prepared;
}

async function removePendingJournalAppend(journalEntryId) {
  const id = String(journalEntryId || '').trim();
  if (!id) return;
  const db = await openJournalDb();
  try {
    await runIndexedDbTransactionBounded(db, JOURNAL_PENDING_STORE, 'readwrite', 'Удаление checkpoint восстановления журнала', ({ store }) => store().delete(id), RECOVERY_IDB_TX_TIMEOUT_MS);
  } finally { db.close(); }
}

async function markPendingJournalAppendFailure(journalEntryId, error) {
  const id = String(journalEntryId || '').trim();
  if (!id) return;
  const message = normalizeError(error).slice(0, 2000);
  const db = await openJournalDb();
  try {
    await runIndexedDbTransactionBounded(db, JOURNAL_PENDING_STORE, 'readwrite', 'Обновление checkpoint восстановления журнала', ({ store, fail }) => {
      const pending = store(); const req = pending.get(id);
      req.onsuccess = () => { try { if (req.result) pending.put({ ...req.result, updatedAt: Date.now(), attemptCount: Number(req.result.attemptCount || 0) + 1, lastError: message }); } catch (e) { fail(e); } };
      req.onerror = () => fail(req.error || new Error('Не удалось прочитать checkpoint восстановления журнала.'));
    }, RECOVERY_IDB_TX_TIMEOUT_MS);
  } finally { db.close(); }
}

async function listPendingJournalAppends(maxItems = MAX_PENDING_JOURNAL_APPENDS) {
  const max = Math.max(1, Math.min(MAX_PENDING_JOURNAL_APPENDS, Number(maxItems) || MAX_PENDING_JOURNAL_APPENDS));
  const db = await openJournalDb();
  try {
    return (await runIndexedDbTransactionBounded(db, JOURNAL_PENDING_STORE, 'readonly', 'Чтение очереди восстановления журнала', ({ store, setResult, fail }) => {
      const items = []; const request = store().index('updatedAt').openCursor(null, 'next');
      request.onsuccess = () => { try { const cursor = request.result; if (!cursor || items.length >= max) { setResult(items); return; } items.push(cursor.value); cursor.continue(); } catch (e) { fail(e); } };
      request.onerror = () => fail(request.error || new Error('Не удалось прочитать очередь восстановления журнала.'));
    }, RECOVERY_IDB_TX_TIMEOUT_MS)) || [];
  } finally { db.close(); }
}

async function recoverPendingJournalAppends(trigger = 'maintenance', maxItems = 20) {
  await migrateLegacyPendingJournalAppends();
  const queue = await listPendingJournalAppends(maxItems);
  let recovered = 0;
  let cancelled = 0;
  let failed = 0;
  for (const item of queue) {
    if (!item?.data || !item?.id) continue;
    try {
      // The pending record is re-checked inside the SAME readwrite transaction
      // as the append. A concurrent clear/import can therefore cancel stale
      // recovery without allowing an old snapshot to resurrect the entry.
      const result = await appendJournalEntry(item.data, { requirePendingCheckpoint: true });
      if (result) recovered += 1;
      else cancelled += 1;
    } catch (error) {
      failed += 1;
      await markPendingJournalAppendFailure(item.id, error).catch(() => {});
    }
  }
  const remaining = await listPendingJournalAppends(MAX_PENDING_JOURNAL_APPENDS).catch(() => []);
  return { trigger, pending: remaining.length, recovered, cancelled, failed };
}


function normalizePendingRemotePdfCacheReceipt(value = {}) {
  const pdfCacheGeneration = String(value.pdfCacheGeneration || '').trim();
  const pdfCacheKey = String(value.pdfCacheKey || '').trim();
  const expectedPdfBytes = Math.max(0, Number(value.expectedPdfBytes) || 0);
  if (
    !pdfCacheGeneration ||
    pdfCacheGeneration.length > 80 ||
    pdfCacheKey !== `pdf:${pdfCacheGeneration}` ||
    expectedPdfBytes <= 0
  ) return null;
  return Object.freeze({ pdfCacheKey, pdfCacheGeneration, expectedPdfBytes });
}

function pendingRemoteResetDisposition(item = {}) {
  const phase = String(item.phase || '');
  const exactPdfReceipt = normalizePendingRemotePdfCacheReceipt(item);
  if (phase === 'admitted-unknown' || phase === 'stale-unverified') return 'preserve';
  if (phase === 'prepared' && !exactPdfReceipt) {
    // Upgrade safety: older builds could persist "prepared" after the remote
    // request had effectively crossed the admission boundary. Preserve that
    // ambiguity instead of treating local reset as external cancellation.
    return 'preserve';
  }
  return 'drop';
}

function pendingRemoteMatchesJournalResetScope(item = {}, { urlKey = '', siteKey = '' } = {}) {
  if (!urlKey && !siteKey) return true;
  const meta = item?.data?.meta || {};
  const pendingUrlKey = normalizeJournalUrl(meta.url || '');
  const pendingSiteKey = getJournalSiteKey(meta.url || meta.hostname || '');
  return Boolean(
    (urlKey && pendingUrlKey === urlKey) ||
    (siteKey && pendingSiteKey === siteKey)
  );
}

function pendingRemoteResetProvenance(item = {}) {
  if (item?.supersededByJournalReset !== true) return {};
  return {
    supersededByJournalReset: true,
    journalResetAt: Math.max(0, Number(item.journalResetAt) || 0),
    journalResetScope: String(item.journalResetScope || '').slice(0, 24)
  };
}

function markPendingRemoteSupersededByJournalReset(item = {}, { scope = 'all', resetAt = Date.now() } = {}) {
  return {
    ...item,
    supersededByJournalReset: true,
    journalResetAt: Math.max(0, Number(resetAt) || Date.now()),
    journalResetScope: String(scope || 'all').slice(0, 24),
    updatedAt: Math.max(0, Number(resetAt) || Date.now())
  };
}

function reconcilePendingRemoteStoreForJournalReset(
  pendingRemoteStore,
  { urlKey = '', siteKey = '', scope = 'all', resetAt = Date.now(), fail = () => {} } = {}
) {
  const request = pendingRemoteStore.openCursor();
  request.onsuccess = () => {
    try {
      const cursor = request.result;
      if (!cursor) return;
      const item = cursor.value || {};
      if (pendingRemoteMatchesJournalResetScope(item, { urlKey, siteKey })) {
        if (pendingRemoteResetDisposition(item) === 'preserve') {
          cursor.update(markPendingRemoteSupersededByJournalReset(item, { scope, resetAt }));
        } else {
          cursor.delete();
        }
      }
      cursor.continue();
    } catch (error) { fail(error); }
  };
  request.onerror = () => fail(request.error || new Error('Не удалось reconcile pending Yandex checkpoints при сбросе журнала.'));
  return request;
}

function pendingRemotePdfCacheRetentionIdentity(item = {}) {
  const phase = String(item.phase || '');
  const receipt = normalizePendingRemotePdfCacheReceipt(item);
  if (phase === 'admitted-unknown') {
    if (receipt) {
      return Object.freeze({
        exactIdentity: `${receipt.pdfCacheKey}\u0000${receipt.pdfCacheGeneration}`,
        legacyJournalEntryId: ''
      });
    }
    const journalEntryId = String(item.id || item.data?.journalEntryId || '').trim();
    return journalEntryId
      ? Object.freeze({ exactIdentity: '', legacyJournalEntryId: journalEntryId })
      : null;
  }
  if (phase === 'prepared' && !receipt) {
    // Older builds did not persist an admission phase or exact local-cache
    // receipt. Treat a legacy active row as ambiguous until recovery resolves
    // it; new exact "prepared" rows remain disposable before admission.
    const journalEntryId = String(item.id || item.data?.journalEntryId || '').trim();
    return journalEntryId
      ? Object.freeze({ exactIdentity: '', legacyJournalEntryId: journalEntryId })
      : null;
  }
  return null;
}

function pdfCacheGenerationMatchesRemoteRetention(record = {}, snapshot = {}) {
  if (!isExactSealedPdfCacheIdentity(record)) return false;
  const exactIdentity = `${String(record.key || '')}\u0000${String(record.cacheGeneration || '')}`;
  const journalEntryId = String(record.journalEntryId || '');
  return Boolean(
    (snapshot.exactIdentities || []).includes(exactIdentity) ||
    (journalEntryId && (snapshot.legacyJournalEntryIds || []).includes(journalEntryId))
  );
}

async function getPendingRemotePdfCacheRetentionSnapshot() {
  const db = await openJournalDb(RECOVERY_IDB_TX_TIMEOUT_MS);
  try {
    return await runIndexedDbTransactionBounded(
      db,
      JOURNAL_PENDING_REMOTE_STORE,
      'readonly',
      'Чтение durable-защиты PDF cache из checkpoints удалённых сохранений',
      ({ store, setResult, fail }) => {
        const exactIdentities = [];
        const legacyJournalEntryIds = [];
        const request = store().openCursor();
        request.onsuccess = () => {
          try {
            const cursor = request.result;
            if (!cursor) {
              setResult({ exactIdentities, legacyJournalEntryIds });
              return;
            }
            const retention = pendingRemotePdfCacheRetentionIdentity(cursor.value || {});
            if (retention?.exactIdentity) exactIdentities.push(retention.exactIdentity);
            if (retention?.legacyJournalEntryId) legacyJournalEntryIds.push(retention.legacyJournalEntryId);
            cursor.continue();
          } catch (error) { fail(error); }
        };
        request.onerror = () => fail(request.error || new Error('Не удалось прочитать durable-защиту PDF cache.'));
      },
      RECOVERY_IDB_TX_TIMEOUT_MS
    ) || { exactIdentities: [], legacyJournalEntryIds: [] };
  } finally { db.close(); }
}

async function checkpointPendingRemoteSaveIntent(data, { expectedPdfBytes = 0, createPublicLinks = false, operationId = '', pdfCacheKey = '', pdfCacheGeneration = '' } = {}) {
  const prepared = normalizePendingJournalAppendData({ ...data, destination: 'yandex', operationId: String(operationId || data?.operationId || '').slice(0, MAX_OPERATION_ID_CHARS) });
  WebClipYandexRecoveryNamespace.validateBoundRecoveryReceipt(prepared);
  const pdfCacheReceipt = normalizePendingRemotePdfCacheReceipt({ pdfCacheKey, pdfCacheGeneration, expectedPdfBytes });
  if (!pdfCacheReceipt) {
    const error = new Error('Checkpoint удалённого сохранения требует exact sealed PDF cache generation.');
    error.code = 'WEBCLIP_REMOTE_PDF_CACHE_RECEIPT_REQUIRED';
    throw error;
  }
  const now = Date.now();
  const item = {
    id: prepared.journalEntryId,
    phase: 'admitted-unknown',
    createdAt: now,
    updatedAt: now,
    attemptCount: 0,
    operationId: String(operationId || '').slice(0, 180),
    lastError: '',
    ...pdfCacheReceipt,
    createPublicLinks: Boolean(createPublicLinks),
    data: prepared
  };
  if (jsonSizeChars(item) > MAX_PENDING_JOURNAL_APPEND_JSON_CHARS) item.data.meta.selectionSnapshot = { includes: [], excludes: [] };
  if (jsonSizeChars(item) > MAX_PENDING_JOURNAL_APPEND_JSON_CHARS) throw new Error('Checkpoint удалённого сохранения превышает безопасный размер.');
  const db = await openJournalDb();
  try {
    await runIndexedDbTransactionBounded(db, JOURNAL_PENDING_REMOTE_STORE, 'readwrite', 'Создание checkpoint удалённого сохранения', ({ store, fail }) => {
      const pending = store(); const existingReq = pending.get(item.id);
      existingReq.onsuccess = () => {
        try {
          const existing = existingReq.result;
          if (existing) {
            const resetProvenance = pendingRemoteResetProvenance(existing);
            pending.put(
              existing.phase === 'remote-verified'
                ? { ...existing, updatedAt: now, operationId: item.operationId || existing.operationId, ...resetProvenance }
                : existing.phase === 'stale-unverified'
                  ? { ...item, createdAt: now, ...resetProvenance }
                  : { ...item, createdAt: Number(existing.createdAt || now), ...resetProvenance }
            );
            return;
          }
          let activeCount = 0; const countReq = pending.openCursor();
          countReq.onsuccess = () => { try { const cursor = countReq.result; if (cursor) { if (String(cursor.value?.phase || '') !== 'stale-unverified') activeCount += 1; cursor.continue(); return; } if (activeCount >= MAX_PENDING_REMOTE_SAVES) { fail(new Error(`Очередь активного восстановления удалённых сохранений заполнена (${MAX_PENDING_REMOTE_SAVES}).`)); return; } pending.put(item); } catch (e) { fail(e); } };
          countReq.onerror = () => fail(countReq.error || new Error('Не удалось проверить размер очереди удалённых сохранений.'));
        } catch (error) { fail(error); }
      };
      existingReq.onerror = () => fail(existingReq.error || new Error('Не удалось проверить checkpoint удалённого сохранения.'));
    }, RECOVERY_IDB_TX_TIMEOUT_MS);
  } finally { db.close(); }
  return item;
}

async function markPendingRemoteSaveVerified(id, { publicUrl = '', resourceId = '' } = {}) {
  const key = String(id || '').trim(); if (!key) throw new Error('Некорректный checkpoint удалённого сохранения.');
  const db = await openJournalDb();
  try {
    return await runIndexedDbTransactionBounded(db, JOURNAL_PENDING_REMOTE_STORE, 'readwrite', 'Подтверждение checkpoint удалённого сохранения', ({ store, setResult, fail }) => {
      const pending = store(); const req = pending.get(key);
      req.onsuccess = () => { try { const current = req.result; if (!current?.data) { fail(new Error('Durable checkpoint удалённого сохранения не найден перед финализацией.')); return; } const result = { ...current, phase: 'remote-verified', updatedAt: Date.now(), lastError: '', data: normalizePendingJournalAppendData({ ...current.data, publicUrl: String(publicUrl || current.data.publicUrl || ''), resourceId: String(resourceId || current.data.resourceId || ''), remoteIdentityProvenance: WebClipYandexRemoteIdentityAuthority.PROVIDER_VERIFIED, journalEntryId: key, journalCreatedAt: current.data.journalCreatedAt }) }; pending.put(result); setResult(result); } catch (e) { fail(e); } };
      req.onerror = () => fail(req.error || new Error('Не удалось прочитать checkpoint удалённого сохранения.'));
    }, RECOVERY_IDB_TX_TIMEOUT_MS);
  } finally { db.close(); }
}

async function removePendingRemoteSave(id) {
  const key = String(id || '').trim(); if (!key) return;
  const db = await openJournalDb();
  try { await runIndexedDbTransactionBounded(db, JOURNAL_PENDING_REMOTE_STORE, 'readwrite', 'Удаление checkpoint удалённого сохранения', ({ store }) => store().delete(key), RECOVERY_IDB_TX_TIMEOUT_MS); }
  finally { db.close(); }
}

async function markPendingRemoteSaveFailure(id, error) {
  const key = String(id || '').trim(); if (!key) return;
  const db = await openJournalDb();
  try {
    await runIndexedDbTransactionBounded(db, JOURNAL_PENDING_REMOTE_STORE, 'readwrite', 'Обновление ошибки checkpoint удалённого сохранения', ({ store, fail }) => {
      const pending = store(); const req = pending.get(key);
      req.onsuccess = () => { try { const current = req.result; if (current) pending.put({ ...current, updatedAt: Date.now(), attemptCount: Math.max(0, Number(current.attemptCount || 0)) + 1, lastError: normalizeError(error).slice(0, 2000) }); } catch (e) { fail(e); } };
      req.onerror = () => fail(req.error || new Error('Не удалось прочитать checkpoint удалённого сохранения.'));
    }, RECOVERY_IDB_TX_TIMEOUT_MS);
  } finally { db.close(); }
}

async function markPendingRemoteSaveStale(id, error) {
  const key = String(id || '').trim(); if (!key) return null;
  const db = await openJournalDb();
  try {
    return await runIndexedDbTransactionBounded(db, JOURNAL_PENDING_REMOTE_STORE, 'readwrite', 'Архивация checkpoint удалённого сохранения', ({ store, setResult, fail }) => {
      const pending = store(); const req = pending.get(key);
      req.onsuccess = () => { try { const current = req.result; if (!current) { setResult(null); return; } const result = { ...current, phase: 'stale-unverified', staleAt: Date.now(), updatedAt: Date.now(), attemptCount: Math.max(0, Number(current.attemptCount || 0)) + 1, lastError: normalizeError(error).slice(0, 2000) }; pending.put(result); setResult(result); } catch (e) { fail(e); } };
      req.onerror = () => fail(req.error || new Error('Не удалось прочитать устаревший checkpoint удалённого сохранения.'));
    }, RECOVERY_IDB_TX_TIMEOUT_MS);
  } finally { db.close(); }
}

async function cleanupStalePendingRemoteSaves() {
  const cutoff = Date.now() - PENDING_REMOTE_STALE_RETENTION_MS;
  const db = await openJournalDb(MAINTENANCE_IDB_TX_TIMEOUT_MS);
  let deleted = 0;
  try {
    const stale = await runIndexedDbTransactionBounded(
      db,
      JOURNAL_PENDING_REMOTE_STORE,
      'readonly',
      'Проверка архивных checkpoints удалённых сохранений',
      ({ store, setResult, fail }) => {
        const rows = [];
        const request = store().index('updatedAt').openCursor(null, 'next');
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) { setResult(rows); return; }
          const value = cursor.value || {};
          if (String(value.phase || '') === 'stale-unverified') {
            rows.push({ key: cursor.primaryKey, staleAt: Number(value.staleAt || value.updatedAt || 0) });
          }
          cursor.continue();
        };
        request.onerror = () => fail(request.error || new Error('Не удалось проверить архивные checkpoints удалённых сохранений.'));
      },
      MAINTENANCE_IDB_TX_TIMEOUT_MS
    ) || [];
    const removeKeys = new Set(stale.filter((row) => row.staleAt < cutoff).map((row) => row.key));
    const retained = stale.filter((row) => !removeKeys.has(row.key));
    const excess = Math.max(0, retained.length - MAX_PENDING_REMOTE_STALE_SAVES);
    for (let i = 0; i < excess; i += 1) removeKeys.add(retained[i].key);
    if (removeKeys.size) {
      await runIndexedDbTransactionBounded(
        db,
        JOURNAL_PENDING_REMOTE_STORE,
        'readwrite',
        'Очистка архивных checkpoints удалённых сохранений',
        ({ store }) => {
          const pending = store();
          for (const key of removeKeys) pending.delete(key);
        },
        MAINTENANCE_IDB_TX_TIMEOUT_MS
      );
      deleted = removeKeys.size;
    }
  } finally { db.close(); }
  return deleted;
}

async function countPendingRemoteSavePhases() {
  const db = await openJournalDb();
  try {
    return await runIndexedDbTransactionBounded(db, JOURNAL_PENDING_REMOTE_STORE, 'readonly', 'Подсчёт checkpoints удалённых сохранений', ({ store, setResult, fail }) => {
      let active = 0; let stale = 0; const request = store().openCursor();
      request.onsuccess = () => { try { const cursor = request.result; if (!cursor) { setResult({ active, stale }); return; } if (String(cursor.value?.phase || '') === 'stale-unverified') stale += 1; else active += 1; cursor.continue(); } catch (e) { fail(e); } };
      request.onerror = () => fail(request.error || new Error('Не удалось подсчитать checkpoints удалённых сохранений.'));
    }, RECOVERY_IDB_TX_TIMEOUT_MS);
  } finally { db.close(); }
}

async function appendJournalEntryFromDurableCheckpoint(data, operationId = '', { storeName = '', key = null, label = 'durable checkpoint' } = {}) {
  const prepared = normalizePendingJournalAppendData(data);
  try {
    const entry = await appendJournalEntry(prepared, {
      requiredDurableCheckpoint: { storeName, key }
    });
    if (!entry) {
      return {
        warning: `Запись журнала не добавлена: ${label} был удалён или superseded конкурентной очисткой/заменой журнала.`,
        recoveryGuaranteed: false,
        cancelled: true,
        journalEntryId: prepared.journalEntryId
      };
    }
    return { warning: '', recoveryGuaranteed: true, cancelled: false, journalEntryId: prepared.journalEntryId, entry };
  } catch (error) {
    const message = normalizeError(error);
    console.warn(`WebClip journal append from ${label}:`, error);
    return {
      warning: `${message} ${label} сохранён и будет повторно обработан автоматически.`,
      recoveryGuaranteed: true,
      cancelled: false,
      journalEntryId: prepared.journalEntryId
    };
  }
}

async function listPendingRemoteSaves(maxItems = MAX_PENDING_REMOTE_SAVES, { includeStale = false } = {}) {
  const max = Math.max(1, Math.min(MAX_PENDING_REMOTE_SAVES, Number(maxItems) || MAX_PENDING_REMOTE_SAVES));
  const db = await openJournalDb();
  try {
    return (await runIndexedDbTransactionBounded(db, JOURNAL_PENDING_REMOTE_STORE, 'readonly', 'Чтение очереди удалённых сохранений', ({ store, setResult, fail }) => {
      const items = []; const request = store().index('updatedAt').openCursor(null, 'next');
      request.onsuccess = () => { try { const cursor = request.result; if (!cursor || items.length >= max) { setResult(items); return; } if (includeStale || String(cursor.value?.phase || '') !== 'stale-unverified') items.push(cursor.value); cursor.continue(); } catch (e) { fail(e); } };
      request.onerror = () => fail(request.error || new Error('Не удалось прочитать очередь удалённых сохранений.'));
    }, RECOVERY_IDB_TX_TIMEOUT_MS)) || [];
  } finally { db.close(); }
}

async function recoverPendingRemoteSaves(trigger = 'maintenance', maxItems = 6) {
  const cappedItems = Math.max(1, Math.min(6, Number(maxItems) || 6));
  const deadline = Date.now() + 120_000;
  const queue = await listPendingRemoteSaves(cappedItems);
  if (!queue.length) return { trigger, pending: 0, recovered: 0, verified: 0, deferred: 0, failed: 0 };

  let recovered = 0;
  let verified = 0;
  let deferred = 0;
  let failed = 0;
  let stale = 0;
  let cancelled = 0;
  let authAvailable = true;
  let operationContext = null;
  try {
    // Replace the legacy getValidYandexAccessToken() preflight with one
    // single auth/config snapshot that all covered requests reuse.
    operationContext = await captureCurrentYandexOperationContext();
  } catch (_) {
    authAvailable = false;
  }

  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    if (Date.now() >= deadline - 2_000) {
      deferred += queue.length - queueIndex;
      break;
    }
    const raw = queue[queueIndex];
    const item = raw && typeof raw === 'object' ? raw : null;
    const id = String(item?.id || '').trim();
    if (!id || !item?.data) continue;
    try {
      const existingEntry = await getJournalEntryById(id);
      if (existingEntry && item?.supersededByJournalReset !== true) {
        await removePendingRemoteSave(id);
        recovered += 1;
        continue;
      }

      let current = item;
      WebClipYandexRecoveryNamespace.validateBoundRecoveryReceipt(current);
      if (current.phase !== 'remote-verified') {
        if (!authAvailable) {
          deferred += 1;
          continue;
        }
        const namespace = WebClipYandexRecoveryNamespace.proveRecoveryNamespace({
          receipt: current,
          currentAccountUid: operationContext?.accountUid
        });
        const recoveryContext = WebClipYandexOperationContext.proveRecoveryContext({
          context: operationContext,
          binding: namespace
        });
        const remotePath = namespace.remotePath;
        const remainingBeforeRead = deadline - Date.now();
        if (remainingBeforeRead <= 2_000) {
          deferred += 1;
          continue;
        }
        const metadata = await yandexApi('/resources', {
          method: 'GET',
          query: { path: remotePath, fields: 'name,path,type,size,public_url,resource_id' },
          timeoutMs: Math.max(1_000, Math.min(15_000, remainingBeforeRead)),
          operationId: String(current.operationId || ''),
          operationContext: recoveryContext
        });
        if (metadata?.type !== 'file') throw new Error('Удалённый файл из recovery-checkpoint не найден как файл.');
        const expectedBytes = requirePositiveByteSize(current.expectedPdfBytes, 'Размер PDF в recovery-checkpoint');
        assertExactYandexRemoteByteSize(expectedBytes, metadata?.size, 'PDF из recovery-checkpoint');
        let publicUrl = metadata?.public_url ? normalizeYandexPublicUrlFromApi(metadata.public_url) : String(current.data.publicUrl || '');
        if (current.createPublicLinks && !publicUrl) {
          if (deadline - Date.now() <= 2_000) {
            deferred += 1;
            continue;
          }
          const publicationContext = WebClipYandexOperationContext.proveRecoveryContext({
            context: recoveryContext,
            binding: namespace,
            requiresPublication: true
          });
          publicUrl = await ensureYandexPublicUrl(remotePath, String(current.operationId || ''), deadline, publicationContext);
        }
        current = await markPendingRemoteSaveVerified(id, {
          publicUrl,
          resourceId: metadata?.resource_id ? normalizeYandexResourceIdFromApi(metadata.resource_id) : String(current.data.resourceId || '')
        });
        verified += 1;
      }

      const journalAppend = await appendJournalEntryFromDurableCheckpoint(current.data, String(current.operationId || ''), {
        storeName: JOURNAL_PENDING_REMOTE_STORE,
        key: id,
        label: 'checkpoint удалённого сохранения'
      });
      if (journalAppend.cancelled) {
        // Missing or reset-superseded Journal authority must not resurrect the
        // old entry. The remote outcome is now verified, so its receipt may be
        // retired as terminal.
        await removePendingRemoteSave(id);
        cancelled += 1;
      } else if (!journalAppend.warning) {
        await removePendingRemoteSave(id);
        recovered += 1;
      } else {
        failed += 1;
        await markPendingRemoteSaveFailure(id, journalAppend.warning).catch(() => {});
      }
    } catch (error) {
      // A checkpoint that remains 404 for a long time must not occupy one of
      // the bounded active recovery slots forever. Archive it locally after a
      // conservative age/attempt threshold; a deliberate user retry with the
      // same journalEntryId re-activates the checkpoint.
      const ageMs = Date.now() - Number(item.createdAt || item.updatedAt || 0);
      const nextAttempt = Math.max(0, Number(item.attemptCount || 0)) + 1;
      if (Number(error?.status) === 404 && ageMs >= PENDING_REMOTE_STALE_AFTER_MS && nextAttempt >= PENDING_REMOTE_STALE_MIN_ATTEMPTS) {
        await markPendingRemoteSaveStale(id, error).catch(() => {});
        stale += 1;
      } else {
        failed += 1;
        await markPendingRemoteSaveFailure(id, error).catch(() => {});
      }
    }
  }
  const phaseCounts = await countPendingRemoteSavePhases().catch(() => ({ active: 0, stale: 0 }));
  return { trigger, pending: phaseCounts.active, stalePending: phaseCounts.stale, recovered, verified, deferred, failed, stale, cancelled, authRequired: !authAvailable };
}

function pendingLocalDownloadResetDisposition(item = {}) {
  const kind = String(item.kind || '');
  const admissionPhase = String(item.downloadAdmissionPhase || '');
  if (kind === PENDING_LOCAL_UNKNOWN_KIND) return 'preserve';
  if (kind === 'download') return 'preserve';
  if (kind === 'intent' && admissionPhase === 'admitted-unknown') return 'preserve';
  if (kind === 'intent' && !admissionPhase) {
    // Upgrade safety: older builds could call chrome.downloads.download while
    // the only durable row still looked like an unbound intent. Preserve that
    // ambiguity instead of treating Journal reset as Chrome cancellation.
    return 'preserve';
  }
  return 'drop';
}

function pendingLocalDownloadMatchesJournalResetScope(item = {}, { urlKey = '', siteKey = '' } = {}) {
  if (!urlKey && !siteKey) return true;
  const meta = item?.data?.meta || {};
  const pendingUrlKey = normalizeJournalUrl(meta.url || '');
  const pendingSiteKey = getJournalSiteKey(meta.url || meta.hostname || '');
  return Boolean(
    (urlKey && pendingUrlKey === urlKey) ||
    (siteKey && pendingSiteKey === siteKey)
  );
}

function markPendingLocalDownloadSupersededByJournalReset(item = {}, { scope = 'all', resetAt = Date.now() } = {}) {
  return {
    ...item,
    supersededByJournalReset: true,
    journalResetAt: Math.max(0, Number(resetAt) || Date.now()),
    journalResetScope: String(scope || 'all').slice(0, 24),
    updatedAt: Math.max(0, Number(resetAt) || Date.now())
  };
}

function reconcilePendingLocalDownloadStoreForJournalReset(
  pendingDownloadStore,
  { urlKey = '', siteKey = '', scope = 'all', resetAt = Date.now(), fail = () => {} } = {}
) {
  const request = pendingDownloadStore.openCursor();
  request.onsuccess = () => {
    try {
      const cursor = request.result;
      if (!cursor) return;
      const item = cursor.value || {};
      if (pendingLocalDownloadMatchesJournalResetScope(item, { urlKey, siteKey })) {
        if (pendingLocalDownloadResetDisposition(item) === 'preserve') {
          cursor.update(markPendingLocalDownloadSupersededByJournalReset(item, { scope, resetAt }));
        } else {
          cursor.delete();
        }
      }
      cursor.continue();
    } catch (error) { fail(error); }
  };
  request.onerror = () => fail(request.error || new Error('Не удалось reconcile pending local-download checkpoints при сбросе журнала.'));
  return request;
}

function normalizePendingLocalDownloadKey(value) {
  if (typeof value === 'string' && value.startsWith('intent:') && value.length <= 220) return value;
  const id = Number(value);
  return Number.isInteger(id) && id >= 0 ? id : null;
}

function isOwnExtensionDownload(download) {
  const extensionId = String(chrome.runtime.id || '').trim();
  return Boolean(extensionId) && String(download?.byExtensionId || '') === extensionId;
}

function makePendingLocalDownloadIntentKey(operationId = '') {
  const suffix = String(operationId || '').trim()
    || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  return `intent:${suffix}`.slice(0, 220);
}

async function checkpointPendingLocalDownloadIntent(data, operationId = '', blobUrl = '', expectedBytes = 0) {
  const key = makePendingLocalDownloadIntentKey(operationId);
  const prepared = normalizePendingJournalAppendData({ ...data, operationId: String(operationId || data?.operationId || '').slice(0, MAX_OPERATION_ID_CHARS) });
  const now = Date.now();
  const item = {
    downloadId: key,
    kind: 'intent',
    downloadAdmissionPhase: 'prepared',
    blobUrl: String(blobUrl || '').slice(0, 4096),
    createdAt: now,
    updatedAt: now,
    operationId: String(operationId || '').slice(0, 180),
    expectedBytes: Math.max(0, Math.floor(Number(expectedBytes) || 0)),
    data: prepared
  };
  const db = await openJournalDb();
  try {
    await runIndexedDbTransactionBounded(db, JOURNAL_PENDING_DOWNLOAD_STORE, 'readwrite', 'Сохранение intent локальной загрузки', ({ store, fail }) => {
      const pending = store(); let activeCount = 0; let unknownCount = 0; const cursorReq = pending.openCursor();
      cursorReq.onsuccess = () => {
        try {
          const cursor = cursorReq.result;
          if (cursor) {
            if (cursor.value?.kind === PENDING_LOCAL_UNKNOWN_KIND) {
              unknownCount += 1;
              if (unknownCount >= MAX_PENDING_LOCAL_DOWNLOADS) { fail(new Error('Слишком много локальных загрузок с неизвестным исходом. Разрешите старые recovery checkpoint вручную перед новой загрузкой.')); return; }
            } else {
              activeCount += 1;
              if (activeCount >= MAX_PENDING_LOCAL_DOWNLOADS) { fail(new Error('Слишком много незавершённых локальных загрузок WebClip; новая загрузка не запущена.')); return; }
            }
            cursor.continue();
            return;
          }
          pending.put(item);
        } catch (e) { fail(e); }
      };
      cursorReq.onerror = () => fail(cursorReq.error || new Error('Не удалось проверить очередь локальных загрузок.'));
    }, RECOVERY_IDB_TX_TIMEOUT_MS);
  } finally { db.close(); }
  return key;
}

async function markPendingLocalDownloadAdmitted(intentKey) {
  const key = normalizePendingLocalDownloadKey(intentKey);
  if (typeof key !== 'string') throw new Error('Некорректный durable intent локальной загрузки.');
  const db = await openJournalDb();
  try {
    return await runIndexedDbTransactionBounded(
      db,
      JOURNAL_PENDING_DOWNLOAD_STORE,
      'readwrite',
      'Фиксация admission локальной загрузки Chrome',
      ({ store, setResult, fail }) => {
        const pending = store();
        const request = pending.get(key);
        request.onsuccess = () => {
          try {
            const current = request.result;
            if (!current || String(current.kind || '') !== 'intent') {
              const error = new Error('Durable intent локальной загрузки исчез до admission Chrome.');
              error.code = 'WEBCLIP_DOWNLOAD_INTENT_MISSING_BEFORE_ADMISSION';
              fail(error);
              return;
            }
            if (current.supersededByJournalReset === true) {
              const error = new Error('Durable intent локальной загрузки уже superseded сбросом журнала.');
              error.code = 'WEBCLIP_DOWNLOAD_INTENT_SUPERSEDED_BEFORE_ADMISSION';
              fail(error);
              return;
            }
            if (String(current.downloadAdmissionPhase || '') === 'admitted-unknown') {
              setResult(current);
              return;
            }
            if (String(current.downloadAdmissionPhase || '') !== 'prepared') {
              const error = new Error('Durable intent локальной загрузки имеет неизвестную admission phase.');
              error.code = 'WEBCLIP_DOWNLOAD_INTENT_ADMISSION_INVALID';
              fail(error);
              return;
            }
            const admitted = {
              ...current,
              downloadAdmissionPhase: 'admitted-unknown',
              updatedAt: Date.now()
            };
            pending.put(admitted);
            setResult(admitted);
          } catch (error) { fail(error); }
        };
        request.onerror = () => fail(request.error || new Error('Не удалось прочитать durable intent перед admission Chrome.'));
      },
      RECOVERY_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
}

async function bindPendingLocalDownloadIntent(intentKey, downloadId) {
  const key = normalizePendingLocalDownloadKey(intentKey); const id = Number(downloadId);
  if (typeof key !== 'string' || !Number.isInteger(id) || id < 0) throw new Error('Некорректная привязка локальной загрузки Chrome.');
  const db = await openJournalDb();
  try {
    return await runIndexedDbTransactionBounded(db, JOURNAL_PENDING_DOWNLOAD_STORE, 'readwrite', 'Привязка downloadId к intent локальной загрузки', ({ store, setResult, fail }) => {
      const pending = store(); const req = pending.get(key);
      req.onsuccess = () => {
        try {
          const intent = req.result;
          if (!intent) { setResult(null); return; }
          const existingReq = pending.get(id);
          existingReq.onsuccess = () => {
            try {
              const existing = existingReq.result;
              if (existing) {
                const sameOperation = String(existing.operationId || '') && String(existing.operationId || '') === String(intent.operationId || '');
                if (sameOperation) {
                  const rebound = intent.supersededByJournalReset === true
                    ? {
                      ...existing,
                      supersededByJournalReset: true,
                      journalResetAt: Math.max(0, Number(intent.journalResetAt) || 0),
                      journalResetScope: String(intent.journalResetScope || '').slice(0, 24),
                      updatedAt: Date.now()
                    }
                    : existing;
                  if (rebound !== existing) pending.put(rebound);
                  pending.delete(key);
                  setResult(rebound);
                  return;
                }
                const error = new Error(`DownloadItem #${id} уже принадлежит другому durable intent WebClip.`);
                error.code = 'WEBCLIP_DOWNLOAD_ID_ALREADY_BOUND';
                fail(error);
                return;
              }
              const bound = { ...intent, downloadId: id, kind: 'download', updatedAt: Date.now() };
              pending.delete(key);
              pending.put(bound);
              setResult(bound);
            } catch (error) { fail(error); }
          };
          existingReq.onerror = () => fail(existingReq.error || new Error('Не удалось проверить существующего владельца downloadId.'));
        } catch (error) { fail(error); }
      };
      req.onerror = () => fail(req.error || new Error('Не удалось прочитать intent локальной загрузки.'));
    }, RECOVERY_IDB_TX_TIMEOUT_MS);
  } finally { db.close(); }
}

async function getPendingLocalDownload(downloadId) {
  const key = normalizePendingLocalDownloadKey(downloadId); if (key === null) return null;
  const db = await openJournalDb();
  try {
    return await runIndexedDbTransactionBounded(db, JOURNAL_PENDING_DOWNLOAD_STORE, 'readonly', 'Чтение checkpoint локальной загрузки', ({ store, setResult, fail }) => {
      const request = store().get(key); request.onsuccess = () => setResult(request.result || null); request.onerror = () => fail(request.error || new Error('Не удалось прочитать checkpoint локальной загрузки.'));
    }, RECOVERY_IDB_TX_TIMEOUT_MS);
  } finally { db.close(); }
}

async function removePendingLocalDownload(downloadId) {
  const key = normalizePendingLocalDownloadKey(downloadId); if (key === null) return;
  const db = await openJournalDb();
  try { await runIndexedDbTransactionBounded(db, JOURNAL_PENDING_DOWNLOAD_STORE, 'readwrite', 'Удаление checkpoint локальной загрузки', ({ store }) => store().delete(key), RECOVERY_IDB_TX_TIMEOUT_MS); }
  finally { db.close(); }
}

async function markPendingLocalDownloadUnknown(downloadId, reason = '', trigger = '') {
  const key = normalizePendingLocalDownloadKey(downloadId); if (key === null) return null;
  const db = await openJournalDb();
  try {
    return await runIndexedDbTransactionBounded(db, JOURNAL_PENDING_DOWNLOAD_STORE, 'readwrite', 'Перевод checkpoint локальной загрузки в unknown/manual-resolution', ({ store, setResult, fail }) => {
      const pending = store();
      const request = pending.get(key);
      request.onsuccess = () => {
        try {
          const current = request.result;
          if (!current) { setResult(null); return; }
          const now = Date.now();
          const next = {
            ...current,
            kind: PENDING_LOCAL_UNKNOWN_KIND,
            priorKind: String(current.priorKind || current.kind || '').slice(0, 32),
            recoveryState: 'manual-resolution',
            unknownAt: Number(current.unknownAt || 0) > 0 ? Number(current.unknownAt) : now,
            updatedAt: now,
            unknownReason: String(reason || '').slice(0, PENDING_LOCAL_UNKNOWN_REASON_MAX_CHARS),
            unknownTrigger: String(trigger || '').slice(0, 120)
          };
          pending.put(next);
          setResult(next);
        } catch (error) { fail(error); }
      };
      request.onerror = () => fail(request.error || new Error('Не удалось прочитать checkpoint локальной загрузки для unknown/manual-resolution.'));
    }, RECOVERY_IDB_TX_TIMEOUT_MS);
  } finally { db.close(); }
}

async function listPendingLocalDownloadFallbackIntents() {
  const db = await openJournalDb();
  try {
    return await runIndexedDbTransactionBounded(db, JOURNAL_PENDING_DOWNLOAD_STORE, 'readonly', 'Чтение intent для безопасной fallback-привязки локальных загрузок', ({ store, setResult, fail }) => {
      const out = [];
      const request = store().openCursor();
      request.onsuccess = () => {
        try {
          const cursor = request.result;
          if (!cursor) { setResult(out); return; }
          const value = cursor.value;
          if (typeof value?.downloadId === 'string' && value.downloadId.startsWith('intent:') && value.kind !== PENDING_LOCAL_UNKNOWN_KIND) {
            out.push(value);
            if (out.length >= MAX_PENDING_LOCAL_DOWNLOADS) { setResult(out); return; }
          }
          cursor.continue();
        } catch (error) { fail(error); }
      };
      request.onerror = () => fail(request.error || new Error('Не удалось прочитать intent для fallback-привязки локальных загрузок.'));
    }, RECOVERY_IDB_TX_TIMEOUT_MS);
  } finally { db.close(); }
}

async function startAutomaticBlobDownloadBounded({ intentKey, blobUrl, filename, operationId = '' }) {
  const key = normalizePendingLocalDownloadKey(intentKey);
  const sourceUrl = String(blobUrl || '');
  const targetFilename = String(filename || '');
  const logId = String(operationId || '');
  if (typeof key !== 'string' || !sourceUrl || !targetFilename) {
    throw new Error('Некорректные параметры автоматической локальной загрузки Chrome.');
  }

  if (automaticDownloadStartSettlements.size >= MAX_PENDING_AUTOMATIC_DOWNLOAD_STARTS) {
    await removePendingLocalDownload(key).catch(() => {});
    await revokeBlobUrl(sourceUrl).catch(() => {});
    const error = new Error('Chrome ещё завершает несколько предыдущих запусков локальной загрузки WebClip. Повторите позже.');
    error.code = 'WEBCLIP_DOWNLOAD_START_BUSY';
    throw error;
  }

  try {
    await markPendingLocalDownloadAdmitted(key);
  } catch (error) {
    await revokeBlobUrl(sourceUrl).catch(() => {});
    throw error;
  }

  let timedOut = false;
  let rawStart;
  try {
    rawStart = Promise.resolve(chrome.downloads.download({
      url: sourceUrl,
      filename: targetFilename,
      saveAs: false,
      conflictAction: 'uniquify'
    }));
  } catch (error) {
    await removePendingLocalDownload(key).catch(() => {});
    await revokeBlobUrl(sourceUrl).catch(() => {});
    throw error;
  }

  const settlement = rawStart.then(async (rawDownloadId) => {
    const downloadId = Number(rawDownloadId);
    if (!Number.isInteger(downloadId) || downloadId < 0) {
      await removePendingLocalDownload(key).catch(() => {});
      await revokeBlobUrl(sourceUrl).catch(() => {});
      return { status: 'failed', error: new Error('Chrome вернул некорректный идентификатор локальной загрузки.') };
    }

    let bindWarning = '';
    try {
      const bound = await bindPendingLocalDownloadIntent(key, downloadId);
      if (!bound) bindWarning = 'Durable intent локальной загрузки уже отсутствует; запись журнала не будет восстановлена из этого checkpoint.';
    } catch (error) {
      bindWarning = normalizeError(error);
    }

    revokeBlobUrlWhenDownloadFinishes(downloadId, sourceUrl);

    try {
      const matches = await withOperationTimeout(
        chrome.downloads.search({ id: downloadId }),
        DOWNLOADS_SEARCH_TIMEOUT_MS,
        'Проверка поздно подтверждённой локальной загрузки Chrome'
      );
      const current = Array.isArray(matches) ? matches[0] : null;
      if (current?.state === 'complete' || current?.state === 'interrupted') {
        await finalizePendingLocalDownload(downloadId, current.state, current.error || '').catch(() => {});
      }
    } catch (_) {
      // onChanged/background reconciliation remain authoritative when this
      // opportunistic state read is unavailable.
    }

    if (timedOut && logId) {
      recordOperationStage(logId, 'download-start-late', bindWarning
        ? `Chrome поздно подтвердил запуск локальной загрузки #${downloadId}, но привязка durable checkpoint требует фонового восстановления: ${bindWarning}`
        : `Chrome поздно подтвердил запуск локальной загрузки #${downloadId}; durable checkpoint привязан.`,
      82, bindWarning ? 'partial' : 'running', { downloadId, filename: targetFilename, bindWarning });
      await flushOperationLogWrites(logId).catch(() => {});
    }

    return { status: 'started', downloadId, bindWarning };
  }, async (error) => {
    await removePendingLocalDownload(key).catch(() => {});
    await revokeBlobUrl(sourceUrl).catch(() => {});
    if (timedOut && logId) {
      recordOperationStage(logId, 'error', `Chrome поздно завершил запуск локальной загрузки ошибкой: ${normalizeError(error)} Запись журнала не создана.`, 100, 'error', {
        filename: targetFilename,
        error: normalizeError(error)
      });
      await flushOperationLogWrites(logId).catch(() => {});
    }
    return { status: 'failed', error };
  });

  automaticDownloadStartSettlements.set(key, settlement);
  void settlement.finally(() => {
    if (automaticDownloadStartSettlements.get(key) === settlement) automaticDownloadStartSettlements.delete(key);
  }).catch(() => {});

  let result;
  try {
    result = await withOperationTimeout(settlement, AUTOMATIC_DOWNLOAD_START_TIMEOUT_MS, 'Запуск локальной загрузки Chrome');
  } catch (error) {
    if (error?.code !== 'WEBCLIP_TIMEOUT') throw error;
    timedOut = true;
    return { pending: true, downloadId: 0, bindWarning: '' };
  }

  if (result?.status === 'failed') throw result.error;
  return {
    pending: false,
    downloadId: Number(result?.downloadId || 0),
    bindWarning: String(result?.bindWarning || '')
  };
}

async function finalizePendingLocalDownload(downloadId, state = '', downloadError = '') {
  const pending = await getPendingLocalDownload(downloadId);
  if (!pending?.data) return { handled: false };
  const operationId = String(pending.operationId || '');
  if (state === 'complete') {
    const journalAppend = await appendJournalEntryFromDurableCheckpoint(pending.data, operationId, {
      storeName: JOURNAL_PENDING_DOWNLOAD_STORE,
      key: normalizePendingLocalDownloadKey(downloadId),
      label: 'checkpoint локальной загрузки'
    });
    const journalWarning = String(journalAppend?.warning || '');
    // Keep pendingDownloads on ordinary append failure. A reset-superseded
    // checkpoint remains only reconciliation authority; once Chrome reports
    // complete, the physical outcome is terminal and the checkpoint can be
    // retired without resurrecting old Journal metadata.
    if (journalAppend?.cancelled) {
      await removePendingLocalDownload(downloadId);
    } else if (!journalWarning) {
      await removePendingLocalDownload(downloadId);
    }
    if (pending.blobUrl) await revokeBlobUrl(String(pending.blobUrl)).catch(() => {});
    const tabId = Number(pending.data?.meta?.tabId || 0);
    if (tabId > 0) await updateActionForTab(tabId).catch(() => {});
    recordOperationStage(operationId, 'complete', journalWarning
      ? (journalAppend?.cancelled
        ? 'Локальный PDF скачан, но запись журнала не добавлена: durable checkpoint был superseded параллельной очисткой/заменой журнала.'
        : (journalAppend?.recoveryGuaranteed
          ? 'Локальный PDF скачан, но запись журнала ожидает автоматического восстановления.'
          : 'Локальный PDF скачан; метаданные журнала не удалось сохранить.'))
      : 'Локальный PDF успешно скачан; запись журнала сохранена.',
      100, journalWarning ? 'partial' : 'success',
      {
        downloadId: Number(downloadId), filename: pending.data.filename || '', journalWarning,
        journalRecoveryGuaranteed: Boolean(journalAppend?.recoveryGuaranteed)
      });
    await flushOperationLogWrites(operationId).catch(() => {});
    return { handled: true, completed: true, journalWarning, recoveryGuaranteed: Boolean(journalAppend?.recoveryGuaranteed), cancelled: Boolean(journalAppend?.cancelled) };
  }
  if (state === 'interrupted') {
    await removePendingLocalDownload(downloadId);
    recordOperationStage(operationId, 'error', `Локальная загрузка Chrome прервана${downloadError ? `: ${String(downloadError).slice(0, 500)}` : '.'} Запись журнала не создана.`, 100, 'error', {
      downloadId: Number(downloadId), filename: pending.data.filename || '', downloadError: String(downloadError || '').slice(0, 500)
    });
    await flushOperationLogWrites(operationId).catch(() => {});
    return { handled: true, completed: false };
  }
  return { handled: false };
}

async function reconcilePendingLocalDownloads(trigger = 'maintenance', maxItems = PENDING_LOCAL_RECONCILE_BATCH) {
  const db = await openJournalDb();
  let items = [];
  try {
    items = (await runIndexedDbTransactionBounded(
      db,
      JOURNAL_PENDING_DOWNLOAD_STORE,
      'readonly',
      'Чтение незавершённых локальных загрузок',
      ({ store, setResult, fail }) => {
        const out = [];
        const max = Math.max(1, Math.min(MAX_PENDING_LOCAL_DOWNLOADS, Number(maxItems) || MAX_PENDING_LOCAL_DOWNLOADS));
        const request = store().index('updatedAt').openCursor(null, 'next');
        request.onsuccess = () => {
          try {
            const cursor = request.result;
            if (!cursor || out.length >= max) { setResult(out); return; }
            if (cursor.value?.kind === PENDING_LOCAL_UNKNOWN_KIND) { cursor.continue(); return; }
            out.push(cursor.value);
            cursor.continue();
          } catch (error) { fail(error); }
        };
        request.onerror = () => fail(request.error || new Error('Не удалось прочитать незавершённые локальные загрузки.'));
      },
      RECOVERY_IDB_TX_TIMEOUT_MS
    )) || [];
  } finally { db.close(); }

  const fallbackIntents = items.some((item) => typeof item?.downloadId === 'string' && item.downloadId.startsWith('intent:'))
    ? await listPendingLocalDownloadFallbackIntents()
    : [];

  let completed = 0;
  let interrupted = 0;
  let pendingCount = 0;
  let expired = 0;
  let unknown = 0;
  let rebound = 0;
  let failed = 0;
  const finalizeForMaintenance = async (checkpoint, id, state, downloadError = '') => {
    try {
      const result = await finalizePendingLocalDownload(id, state, downloadError);
      return Boolean(result?.handled);
    } catch (error) {
      failed += 1;
      const operationId = String(checkpoint?.operationId || '');
      recordOperationStage(operationId, 'recovery-error', `Фоновая финализация локальной загрузки не завершена: ${normalizeError(error)} Durable checkpoint сохранён для следующей попытки.`, 100, 'partial', {
        trigger, downloadId: Number(id), downloadState: String(state || ''), error: normalizeError(error)
      });
      await flushOperationLogWrites(operationId).catch(() => {});
      return false;
    }
  };
  for (const item of items) {
    const rawKey = item?.downloadId;
    if (typeof rawKey === 'string' && rawKey.startsWith('intent:')) {
      const intentAge = Date.now() - Number(item.createdAt || item.updatedAt || 0);
      let matches = [];
      let searchError = null;
      try {
        const startedAfter = new Date(Math.max(0, Number(item.createdAt || 0) - 60_000)).toISOString();
        matches = await withOperationTimeout(chrome.downloads.search({ startedAfter, limit: 200 }), DOWNLOADS_SEARCH_TIMEOUT_MS, 'Поиск незавершённой локальной загрузки Chrome');
      } catch (error) { searchError = error; }
      if (searchError) {
        failed += 1;
        pendingCount += 1;
        const operationId = String(item.operationId || '');
        recordOperationStage(operationId, 'recovery-error', `Не удалось проверить загрузки Chrome: ${normalizeError(searchError)} Checkpoint не удалён и будет проверен позже.`, 100, 'partial', { trigger });
        await flushOperationLogWrites(operationId).catch(() => {});
        continue;
      }
      const expectedBlobUrl = String(item.blobUrl || '');
      const identity = globalThis.WebClipLocalDownloadIdentity?.chooseUniqueDownloadForIntent({
        intent: item,
        downloads: (Array.isArray(matches) ? matches : []).filter(isOwnExtensionDownload),
        allIntents: fallbackIntents,
        now: Date.now()
      }) || { download: null, mode: 'guard-unavailable' };
      const download = identity.download || null;
      if (download && Number.isInteger(Number(download.id))) {
        const id = Number(download.id);
        let bound = null;
        try {
          bound = await bindPendingLocalDownloadIntent(rawKey, id);
        } catch (error) {
          failed += 1;
          pendingCount += 1;
          const operationId = String(item.operationId || '');
          recordOperationStage(operationId, 'recovery-error', `Найдена подходящая загрузка Chrome #${id}, но durable checkpoint не удалось привязать: ${normalizeError(error)} Checkpoint сохранён для следующей попытки.`, 100, 'partial', { trigger, downloadId: id, error: normalizeError(error) });
          await flushOperationLogWrites(operationId).catch(() => {});
          continue;
        }
        if (bound) {
          rebound += 1;
          if (bound.blobUrl) revokeBlobUrlWhenDownloadFinishes(id, String(bound.blobUrl));
          if (download.state === 'complete') {
            if (await finalizeForMaintenance(bound, id, 'complete')) completed += 1;
            else pendingCount += 1;
          } else if (download.state === 'interrupted') {
            if (await finalizeForMaintenance(bound, id, 'interrupted', download.error || '')) interrupted += 1;
            else pendingCount += 1;
          } else {
            pendingCount += 1;
          }
          continue;
        }
      }
      if (intentAge > PENDING_LOCAL_DOWNLOAD_TTL_MS) {
        const operationId = String(item.operationId || '');
        const reason = 'Не удалось связать запущенную локальную загрузку Chrome с DownloadItem в течение 24 часов; физический исход неизвестен.';
        let marked = null;
        try { marked = await markPendingLocalDownloadUnknown(rawKey, reason, trigger); }
        catch (error) {
          failed += 1;
          pendingCount += 1;
          recordOperationStage(operationId, 'recovery-error', `Не удалось сохранить unknown/manual-resolution checkpoint локальной загрузки: ${normalizeError(error)} Исходный checkpoint оставлен активным.`, 100, 'partial', { trigger, error: normalizeError(error) });
          await flushOperationLogWrites(operationId).catch(() => {});
          continue;
        }
        if (!marked) { pendingCount += 1; continue; }
        if (expectedBlobUrl) await revokeBlobUrl(expectedBlobUrl).catch(() => {});
        recordOperationStage(operationId, 'recovery-unknown', 'Физический исход локальной загрузки Chrome не подтверждён. Durable metadata checkpoint сохранён для manual resolution; запись журнала автоматически не создана.', 100, 'partial', { trigger, recoveryState: 'manual-resolution' });
        await flushOperationLogWrites(operationId).catch(() => {});
        unknown += 1;
      } else {
        pendingCount += 1;
      }
      continue;
    }

    const id = Number(rawKey);
    if (!Number.isInteger(id) || id < 0) continue;
    let matches = [];
    let searchError = null;
    try { matches = await withOperationTimeout(chrome.downloads.search({ id }), DOWNLOADS_SEARCH_TIMEOUT_MS, `Проверка локальной загрузки Chrome #${id}`); } catch (error) { searchError = error; }
    if (searchError) {
      failed += 1;
      pendingCount += 1;
      const operationId = String(item.operationId || '');
      recordOperationStage(operationId, 'recovery-error', `Не удалось проверить состояние загрузки Chrome #${id}: ${normalizeError(searchError)} Checkpoint сохранён.`, 100, 'partial', { trigger, downloadId: id });
      await flushOperationLogWrites(operationId).catch(() => {});
      continue;
    }
    const identity = globalThis.WebClipLocalDownloadIdentity?.chooseUniqueBoundDownloadForReceipt({
      receipt: item,
      downloads: Array.isArray(matches) ? matches : [],
      extensionId: chrome.runtime.id
    }) || { download: null, mode: 'guard-unavailable' };
    const download = identity.download || null;
    if (download?.state === 'complete') {
      if (await finalizeForMaintenance(item, id, 'complete')) completed += 1;
      else pendingCount += 1;
      continue;
    }
    if (download?.state === 'interrupted') {
      if (await finalizeForMaintenance(item, id, 'interrupted', download.error || '')) interrupted += 1;
      else pendingCount += 1;
      continue;
    }
    if (!download && Date.now() - Number(item.createdAt || item.updatedAt || 0) > PENDING_LOCAL_DOWNLOAD_TTL_MS) {
      const operationId = String(item.operationId || '');
      const reason = `DownloadItem #${id} больше не доступен после 24 часов; физический исход локальной загрузки неизвестен.`;
      let marked = null;
      try { marked = await markPendingLocalDownloadUnknown(id, reason, trigger); }
      catch (error) {
        failed += 1;
        pendingCount += 1;
        recordOperationStage(operationId, 'recovery-error', `Не удалось сохранить unknown/manual-resolution checkpoint локальной загрузки #${id}: ${normalizeError(error)} Исходный checkpoint оставлен активным.`, 100, 'partial', { downloadId: id, trigger, error: normalizeError(error) });
        await flushOperationLogWrites(operationId).catch(() => {});
        continue;
      }
      if (!marked) { pendingCount += 1; continue; }
      if (item.blobUrl) await revokeBlobUrl(String(item.blobUrl)).catch(() => {});
      recordOperationStage(operationId, 'recovery-unknown', 'DownloadItem больше не найден, поэтому физический исход локальной загрузки считается unknown. Durable metadata checkpoint сохранён для manual resolution; запись журнала автоматически не создана.', 100, 'partial', { downloadId: id, trigger, recoveryState: 'manual-resolution' });
      await flushOperationLogWrites(operationId).catch(() => {});
      unknown += 1;
      continue;
    }
    if (download?.state === 'in_progress' && item.blobUrl) revokeBlobUrlWhenDownloadFinishes(id, String(item.blobUrl));
    pendingCount += 1;
  }
  return { trigger, checked: items.length, completed, interrupted, rebound, pending: pendingCount, unknown, expired, failed };
}

async function appendJournalEntry({ destination, filename, remotePath = '', folder = '', publicUrl = '', resourceId = '', accountUid = '', rootPath = '', remoteIdentityProvenance = '', meta = {}, journalEntryId = '', journalCreatedAt = 0, operationId = '', sourceReceipt = null }, options = {}) {
  const selectionSnapshot = sanitizeSelectionSnapshot(meta.selectionSnapshot);
  const createdAt = Number(journalCreatedAt || 0) > 0 ? Number(journalCreatedAt) : Date.now();
  const id = String(journalEntryId || '').trim()
    || (crypto.randomUUID ? crypto.randomUUID() : `${createdAt}-${Math.random().toString(16).slice(2)}`);
  const readingMode = meta.readingMode === 'later' && destination === 'yandex' ? 'later' : 'read';
  const journalSourceReceipt = sanitizePdfSourceReceipt(sourceReceipt, {
    operationId: String(operationId || '').slice(0, MAX_OPERATION_ID_CHARS)
  });
  const entry = {
    id,
    entryRevision: JOURNAL_INITIAL_ENTRY_REVISION,
    createdAt,
    localDayKey: localDayKey(createdAt),
    operationDateTime: String(meta.localDateTime || ''),
    operationId: String(operationId || '').slice(0, MAX_OPERATION_ID_CHARS),
    ...(journalSourceReceipt ? { sourceReceipt: journalSourceReceipt } : {}),
    destination: destination === 'yandex' ? 'yandex' : 'download',
    readingMode,
    filename: String(filename || ''),
    remotePath: String(remotePath || ''), folder: String(folder || ''), publicUrl: String(publicUrl || ''), resourceId: String(resourceId || ''),
    accountUid: String(accountUid || '').slice(0, MAX_YANDEX_ACCOUNT_FIELD_CHARS),
    rootPath: normalizeDiskPath(String(rootPath || '').slice(0, MAX_IMPORTED_PATH_CHARS)),
    remoteIdentityProvenance: destination === 'yandex'
      ? WebClipYandexRemoteIdentityAuthority.normalizeProvenance(remoteIdentityProvenance)
      : WebClipYandexRemoteIdentityAuthority.LEGACY_UNVERIFIED,
    hostname: String(meta.hostname || ''), siteAddress: String(meta.siteAddress || ''),
    url: String(meta.url || ''), urlKey: normalizeJournalUrl(meta.url || ''), siteKey: getJournalSiteKey(meta.url || meta.hostname || ''),
    title: String(meta.title || ''),
    fileComment: String(meta.fileComment || ''),
    resourceReport: sanitizePdfResourceReport(meta.resourceReport),
    journalComment: '',
    journalComments: [],
    movedToReadAt: 0,
    selectionSnapshot,
    includeCount: selectionSnapshot.includes.length,
    excludeCount: selectionSnapshot.excludes.length
  };

  const requirePendingCheckpoint = Boolean(options?.requirePendingCheckpoint);
  const requiredDurableCheckpoint = options?.requiredDurableCheckpoint && typeof options.requiredDurableCheckpoint === 'object'
    ? options.requiredDurableCheckpoint
    : null;
  const allowedDurableStores = new Set([JOURNAL_PENDING_DOWNLOAD_STORE, JOURNAL_PENDING_REMOTE_STORE]);
  const requiredDurableStoreName = allowedDurableStores.has(String(requiredDurableCheckpoint?.storeName || ''))
    ? String(requiredDurableCheckpoint.storeName)
    : '';
  const requiredDurableKey = requiredDurableCheckpoint?.key;
  const statsToken = await beginJournalStatsMutation('append');
  const db = await openJournalDb();
  let inserted = false;
  let pendingCheckpointMissing = false;
  let durableCheckpointMissing = false;
  let storedEntry = entry;
  try {
    const txStores = [JOURNAL_STORE, JOURNAL_META_STORE, JOURNAL_PENDING_STORE];
    if (requiredDurableStoreName && !txStores.includes(requiredDurableStoreName)) txStores.push(requiredDurableStoreName);
    await runIndexedDbTransactionBounded(
      db,
      txStores,
      'readwrite',
      'Запись операции в журнал WebClip',
      ({ tx, fail }) => {
        const store = tx.objectStore(JOURNAL_STORE);
        const pendingStore = tx.objectStore(JOURNAL_PENDING_STORE);
        const checkEntry = () => {
          const get = store.get(id);
          get.onsuccess = () => {
            try {
              pendingStore.delete(id);
              if (get.result) {
                storedEntry = get.result;
                return;
              }
              inserted = true;
              store.put(entry);
              touchJournalDbRevision(tx, 'append');
            } catch (error) { fail(error); }
          };
          get.onerror = () => fail(get.error || new Error('Не удалось проверить существующую запись журнала WebClip.'));
        };
        const checkPendingAppend = () => {
          if (requirePendingCheckpoint) {
            const pendingGet = pendingStore.get(id);
            pendingGet.onsuccess = () => {
              try {
                if (!pendingGet.result) {
                  pendingCheckpointMissing = true;
                  return;
                }
                checkEntry();
              } catch (error) { fail(error); }
            };
            pendingGet.onerror = () => fail(pendingGet.error || new Error('Не удалось проверить checkpoint восстановления журнала.'));
          } else {
            checkEntry();
          }
        };
        if (requiredDurableStoreName) {
          const durableStore = tx.objectStore(requiredDurableStoreName);
          const durableGet = durableStore.get(requiredDurableKey);
          durableGet.onsuccess = () => {
            try {
              if (!durableGet.result || durableGet.result?.supersededByJournalReset === true) {
                // Missing or reset-superseded durable authority cannot
                // resurrect metadata into the replacement Journal generation.
                durableCheckpointMissing = true;
                pendingStore.delete(id);
                return;
              }
              checkPendingAppend();
            } catch (error) { fail(error); }
          };
          durableGet.onerror = () => fail(durableGet.error || new Error('Не удалось повторно проверить durable checkpoint перед записью журнала.'));
        } else {
          checkPendingAppend();
        }
      },
      JOURNAL_CRUD_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }

  if (pendingCheckpointMissing || durableCheckpointMissing) {
    await completeJournalStatsMutation(statsToken).catch(() => {});
    return null;
  }
  if (!inserted) {
    await completeJournalStatsMutation(statsToken).catch(() => {});
    return storedEntry;
  }

  try {
    await updateUrlStatsAfterAppend(entry);
    await completeJournalStatsMutation(statsToken);
  } catch (error) {
    console.warn('WebClip urlStats append deferred repair:', error);
  }
  refreshActionForAllTabs().catch(() => {});
  notifyJournalChanged('append');
  return entry;
}

async function safeAppendJournalEntry(data, operationId = '') {
  let prepared = normalizePendingJournalAppendData(data);
  let checkpointed = false;
  let checkpointErrorText = '';
  try {
    prepared = await checkpointPendingJournalAppend(prepared, operationId);
    checkpointed = true;
  } catch (checkpointError) {
    checkpointErrorText = normalizeError(checkpointError);
    console.warn('WebClip journal recovery checkpoint:', checkpointError);
  }

  try {
    await appendJournalEntry(prepared);
    return { warning: '', recoveryGuaranteed: true, checkpointed, journalEntryId: prepared.journalEntryId };
  } catch (error) {
    console.warn('WebClip journal:', error);
    if (checkpointed) await markPendingJournalAppendFailure(prepared.journalEntryId, error).catch(() => {});
    const core = normalizeError(error);
    return {
      warning: checkpointed
        ? `${core} Метаданные сохранены в очереди восстановления журнала и будут повторно записаны автоматически.`
        : `${core} Не удалось создать резервный checkpoint метаданных журнала${checkpointErrorText ? `: ${checkpointErrorText}` : '.'}`,
      recoveryGuaranteed: checkpointed,
      checkpointed,
      journalEntryId: prepared.journalEntryId
    };
  }
}

async function listJournalEntries({ url = '', siteUrl = '', limit = 500 } = {}) {
  const urlKey = url ? normalizeJournalUrl(url) : '';
  const siteKey = siteUrl ? getJournalSiteKey(siteUrl) : '';
  const max = Math.max(1, Math.min(100000, Number(limit) || 500));
  const db = await openJournalDb();
  try {
    const entries = await runIndexedDbTransactionBounded(db, JOURNAL_STORE, 'readonly', 'Чтение журнала WebClip', ({ store, setResult, fail }) => {
      const result = []; const request = store().index('createdAt').openCursor(null, 'prev');
      request.onsuccess = () => { try { const cursor = request.result; if (!cursor || result.length >= max) { setResult(result); return; } const entry = cursor.value; const entrySiteKey = getJournalSiteKey(entry.url || entry.hostname || ''); const matches = urlKey ? entry.urlKey === urlKey : siteKey ? entrySiteKey === siteKey : true; if (matches) result.push({ ...entry, journalComments: normalizeJournalComments(entry) }); cursor.continue(); } catch (e) { fail(e); } };
      request.onerror = () => fail(request.error || new Error('Не удалось прочитать журнал WebClip.'));
    }, JOURNAL_CRUD_IDB_TX_TIMEOUT_MS);
    return { ok: true, entries: entries || [], urlKey, siteKey };
  } finally { db.close(); }
}

function journalViewSummary(entry = {}) {
  const url = String(entry.url || '').slice(0, MAX_IMPORTED_URL_CHARS);
  const hostname = String(entry.hostname || '').slice(0, 255);
  return {
    id: String(entry.id || '').slice(0, 180),
    createdAt: Number(entry.createdAt || 0),
    destination: entry.destination === 'yandex' ? 'yandex' : 'download',
    readingMode: entry.destination === 'yandex' && entry.readingMode === 'later' ? 'later' : 'read',
    hostname,
    url,
    urlKey: String(entry.urlKey || normalizeJournalUrl(url)).slice(0, MAX_IMPORTED_URL_CHARS),
    siteKey: String(getJournalSiteKey(url || hostname)).slice(0, 1024)
  };
}

function emptyJournalViewCounts() {
  const row = () => ({ all: 0, read: 0, later: 0 });
  return { current: row(), site: row(), all: row() };
}

function incrementJournalViewCount(counts, scope, readingMode) {
  const row = counts?.[scope];
  if (!row) return;
  const kind = readingMode === 'later' ? 'later' : 'read';
  row.all += 1;
  row[kind] += 1;
}

function normalizeJournalViewReadingFilter(value) {
  return value === 'later' ? 'later' : value === 'read' ? 'read' : 'all';
}

function journalViewDomainHierarchy(entry = {}) {
  const value = String(entry.url || entry.hostname || '');
  const resolver = globalThis.WebClipPublicSuffix;
  if (resolver?.hierarchy) return resolver.hierarchy(value);
  const site = getJournalSiteKey(value);
  return { base: site, third: site };
}

function makeJournalViewContext({ viewMode = 'all', source = '', reading = 'all', domainFilter = null, textFilter = null } = {}) {
  const normalizedMode = viewMode === 'current' ? 'current' : viewMode === 'site' ? 'site' : 'all';
  const sourceIsHttp = /^https?:\/\//i.test(String(source || ''));
  return {
    viewMode: normalizedMode,
    sourceUrlKey: sourceIsHttp ? normalizeJournalUrl(source) : '',
    sourceSiteKey: sourceIsHttp ? getJournalSiteKey(source) : '',
    reading: normalizeJournalViewReadingFilter(reading),
    domainFilter: domainFilter && typeof domainFilter === 'object'
      ? { level: String(domainFilter.level || 'all'), value: String(domainFilter.value || '') }
      : { level: 'all', value: '' },
    textFilter: WebClipJournalTextFilter.normalize(textFilter)
  };
}

function journalViewSummaryMatches(summary, context, { skipMode = false, entry = null } = {}) {
  if (!skipMode) {
    if (context.viewMode === 'current' && (!context.sourceUrlKey || summary.urlKey !== context.sourceUrlKey)) return false;
    if (context.viewMode === 'site' && (!context.sourceSiteKey || summary.siteKey !== context.sourceSiteKey)) return false;
  }
  if (context.reading !== 'all' && summary.readingMode !== context.reading) return false;
  if (context.viewMode === 'all' && context.domainFilter.level !== 'all') {
    const info = journalViewDomainHierarchy(summary);
    if (context.domainFilter.level === 'base' && String(info.base || '') !== context.domainFilter.value) return false;
    if (context.domainFilter.level === 'third' && String(info.third || '') !== context.domainFilter.value) return false;
  }
  if (!WebClipJournalTextFilter.matches(entry || summary, context.textFilter)) return false;
  return true;
}

function journalViewTimeoutError(label) {
  const error = new Error(`${label} превысило безопасный лимит ${Math.round(JOURNAL_VIEW_QUERY_DEADLINE_MS / 1000)} с.`);
  error.code = 'JOURNAL_VIEW_QUERY_TIMEOUT';
  return error;
}

function collectJournalDomainAggregate(state, summary, query, readingFilter) {
  const normalizedReading = normalizeJournalViewReadingFilter(readingFilter);
  if (normalizedReading !== 'all' && summary.readingMode !== normalizedReading) return;
  state.totalEntries += 1;
  const info = journalViewDomainHierarchy(summary);
  const base = String(info.base || '');
  const third = String(info.third || '');
  if (!base) return;
  const baseMatches = !query || base.includes(query);
  const thirdMatches = !query || third.includes(query);
  if (!state.groups.has(base)) {
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

function finalizeJournalDomainAggregate(state) {
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

async function scanJournalViewMeta({ sourceUrl = '', readingFilter = 'all', domainSearch = '', textFilter = null, includeDomains = true } = {}) {
  const sourceContext = makeJournalViewContext({ viewMode: 'all', source: sourceUrl, reading: 'all', textFilter });
  const counts = emptyJournalViewCounts();
  const domainState = { totalEntries: 0, groups: new Map(), childCount: 0, truncated: false, childrenTruncated: false };
  const query = String(domainSearch || '').trim().toLowerCase();
  const db = await openJournalDb();
  try {
    await new Promise((resolve, reject) => {
      let timedOut = false;
      let requestError = null;
      const tx = db.transaction(JOURNAL_STORE, 'readonly');
      const store = tx.objectStore(JOURNAL_STORE);
      const request = store.index('createdAt').openCursor(null, 'prev');
      const timer = setTimeout(() => { timedOut = true; try { tx.abort(); } catch (_) {} }, JOURNAL_VIEW_QUERY_DEADLINE_MS);
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const entry = cursor.value || {};
        const summary = journalViewSummary(entry);
        if (!WebClipJournalTextFilter.matches(entry, sourceContext.textFilter)) { cursor.continue(); return; }
        const isCurrent = Boolean(sourceContext.sourceUrlKey && summary.urlKey === sourceContext.sourceUrlKey);
        const isSite = Boolean(sourceContext.sourceSiteKey && summary.siteKey === sourceContext.sourceSiteKey);
        incrementJournalViewCount(counts, 'all', summary.readingMode);
        if (isCurrent) incrementJournalViewCount(counts, 'current', summary.readingMode);
        if (isSite) incrementJournalViewCount(counts, 'site', summary.readingMode);
        if (includeDomains) collectJournalDomainAggregate(domainState, summary, query, readingFilter);
        cursor.continue();
      };
      request.onerror = () => { requestError = request.error || new Error('Не удалось прочитать metadata представления журнала.'); };
      tx.oncomplete = () => { clearTimeout(timer); resolve(); };
      tx.onerror = () => { clearTimeout(timer); reject(requestError || tx.error || new Error('Ошибка чтения metadata журнала.')); };
      tx.onabort = () => { clearTimeout(timer); reject(timedOut ? journalViewTimeoutError('Чтение metadata журнала') : (requestError || tx.error || new Error('Чтение metadata журнала было прервано.'))); };
    });
    return {
      ok: true,
      counts,
      domains: includeDomains ? finalizeJournalDomainAggregate(domainState) : { totalEntries: 0, groups: [], truncated: false, childrenTruncated: false }
    };
  } finally { db.close(); }
}

function openJournalViewCursor(store, _context) {
  // Use the universal createdAt index so legacy entries without newer derived
  // compound-index fields remain visible; predicates are evaluated per cursor row.
  return store.index('createdAt').openCursor(null, 'prev');
}

async function queryJournalViewPage({ viewMode = 'all', source = '', reading = 'all', domainFilter = null, textFilter = null, page = 1, pageSize = 20 } = {}) {
  const context = makeJournalViewContext({ viewMode, source, reading, domainFilter, textFilter });
  const safePage = Math.max(1, Math.floor(Number(page) || 1));
  const safePageSize = Math.max(1, Math.min(100, Math.floor(Number(pageSize) || 20)));
  const offset = (safePage - 1) * safePageSize;
  if ((context.viewMode === 'current' && !context.sourceUrlKey) || (context.viewMode === 'site' && !context.sourceSiteKey)) return { ok: true, total: 0, entries: [] };
  const db = await openJournalDb();
  try {
    const result = await new Promise((resolve, reject) => {
      let total = 0;
      const entries = [];
      let timedOut = false;
      let requestError = null;
      const tx = db.transaction(JOURNAL_STORE, 'readonly');
      const store = tx.objectStore(JOURNAL_STORE);
      let request;
      try { request = openJournalViewCursor(store, context); }
      catch (error) { requestError = error; try { tx.abort(); } catch (_) {} return; }
      if (!request) { resolve({ total: 0, entries: [] }); return; }
      const timer = setTimeout(() => { timedOut = true; try { tx.abort(); } catch (_) {} }, JOURNAL_VIEW_QUERY_DEADLINE_MS);
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const entry = cursor.value || {};
        const summary = journalViewSummary(entry);
        if (journalViewSummaryMatches(summary, context, { entry })) {
          if (total >= offset && entries.length < safePageSize) entries.push(summary);
          total += 1;
        }
        cursor.continue();
      };
      request.onerror = () => { requestError = request.error || new Error('Не удалось прочитать страницу журнала.'); };
      tx.oncomplete = () => { clearTimeout(timer); resolve({ total, entries }); };
      tx.onerror = () => { clearTimeout(timer); reject(requestError || tx.error || new Error('Ошибка чтения страницы журнала.')); };
      tx.onabort = () => { clearTimeout(timer); reject(timedOut ? journalViewTimeoutError('Чтение страницы журнала') : (requestError || tx.error || new Error('Чтение страницы журнала было прервано.'))); };
    });
    return { ok: true, ...result };
  } finally { db.close(); }
}

function compareJournalViewGroups(a, b) {
  const timeDelta = Number(b?.latest || 0) - Number(a?.latest || 0);
  if (timeDelta) return timeDelta;
  const urlDelta = String(a?.url || '').localeCompare(String(b?.url || ''), 'ru');
  if (urlDelta) return urlDelta;
  return String(a?.key || '').localeCompare(String(b?.key || ''), 'ru');
}

function journalViewGroupAfterBoundary(group, boundary) {
  return !boundary || compareJournalViewGroups(group, boundary) > 0;
}

function insertBoundedJournalViewGroup(list, group, limit) {
  let low = 0;
  let high = list.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (compareJournalViewGroups(group, list[mid]) < 0) high = mid;
    else low = mid + 1;
  }
  list.splice(low, 0, group);
  if (list.length > limit) list.pop();
}

async function queryJournalViewGroups({ viewMode = 'all', source = '', reading = 'all', domainFilter = null, textFilter = null, boundary = null, pageSize = 20 } = {}) {
  const context = makeJournalViewContext({ viewMode, source, reading, domainFilter, textFilter });
  const safePageSize = Math.max(1, Math.min(100, Math.floor(Number(pageSize) || 20)));
  if ((context.viewMode === 'current' && !context.sourceUrlKey) || (context.viewMode === 'site' && !context.sourceSiteKey)) return { ok: true, total: 0, groups: [] };
  const db = await openJournalDb();
  try {
    const result = await new Promise((resolve, reject) => {
      let total = 0;
      const groups = [];
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
        if (journalViewGroupAfterBoundary(active, boundary)) insertBoundedJournalViewGroup(groups, active, safePageSize);
        active = null;
      };
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) { finalize(); return; }
        const entry = cursor.value || {};
        const summary = journalViewSummary(entry);
        const logicalKey = summary.urlKey || `entry:${summary.id}`;
        if (!active || active.key !== logicalKey) {
          finalize();
          active = { key: logicalKey, urlKey: summary.urlKey, url: summary.url || '', latest: 0, count: 0 };
        }
        if (journalViewSummaryMatches(summary, context, { entry })) {
          active.count += 1;
          if (!active.latest) {
            active.latest = Number(summary.createdAt || 0);
            active.url = summary.url || active.url;
          }
        }
        cursor.continue();
      };
      request.onerror = () => { requestError = request.error || new Error('Не удалось прочитать URL-группы журнала.'); };
      tx.oncomplete = () => { clearTimeout(timer); resolve({ total, groups }); };
      tx.onerror = () => { clearTimeout(timer); reject(requestError || tx.error || new Error('Ошибка чтения URL-групп журнала.')); };
      tx.onabort = () => { clearTimeout(timer); reject(timedOut ? journalViewTimeoutError('Чтение URL-групп журнала') : (requestError || tx.error || new Error('Чтение URL-групп журнала было прервано.'))); };
    });
    return { ok: true, ...result };
  } finally { db.close(); }
}

async function queryJournalViewGroupEntries({ groupKey = '', urlKey = '', viewMode = 'all', source = '', reading = 'all', domainFilter = null, textFilter = null, offset = 0, limit = 20 } = {}) {
  const context = makeJournalViewContext({ viewMode, source, reading, domainFilter, textFilter });
  const safeOffset = Math.max(0, Math.floor(Number(offset) || 0));
  const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(limit) || 20)));
  if (String(groupKey || '').startsWith('entry:')) {
    const entry = await getJournalEntryById(String(groupKey).slice(6));
    if (!entry || !journalViewSummaryMatches(journalViewSummary(entry), context, { entry }) || safeOffset > 0) return { ok: true, entries: [] };
    return { ok: true, entries: [{ ...entry, journalComments: normalizeJournalComments(entry) }] };
  }
  const key = String(urlKey || '');
  if (!key) return { ok: true, entries: [] };
  const db = await openJournalDb();
  try {
    const entries = await new Promise((resolve, reject) => {
      const result = [];
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
        if (journalViewSummaryMatches(journalViewSummary(entry), context, { entry })) {
          if (matched >= safeOffset && result.length < safeLimit) result.push({ ...entry, journalComments: normalizeJournalComments(entry) });
          matched += 1;
          if (result.length >= safeLimit) return;
        }
        cursor.continue();
      };
      request.onerror = () => { requestError = request.error || new Error('Не удалось прочитать записи URL-группы.'); };
      tx.oncomplete = () => { clearTimeout(timer); resolve(result); };
      tx.onerror = () => { clearTimeout(timer); reject(requestError || tx.error || new Error('Ошибка чтения записей URL-группы.')); };
      tx.onabort = () => { clearTimeout(timer); reject(timedOut ? journalViewTimeoutError('Чтение записей URL-группы') : (requestError || tx.error || new Error('Чтение URL-группы было прервано.'))); };
    });
    return { ok: true, entries };
  } finally { db.close(); }
}


async function getJournalEntryById(id) {
  if (!id) return null;
  const db = await openJournalDb();
  try {
    return await runIndexedDbTransactionBounded(db, JOURNAL_STORE, 'readonly', 'Чтение записи журнала', ({ store, setResult, fail }) => {
      const request = store().get(id); request.onsuccess = () => setResult(request.result || null); request.onerror = () => fail(request.error || new Error('Не удалось прочитать запись журнала.'));
    }, JOURNAL_CRUD_IDB_TX_TIMEOUT_MS);
  } finally { db.close(); }
}

function journalEntryAuthorityMatches(resetGeneration, entry, tokenValue) {
  const token = normalizeJournalEntryAuthorityToken(tokenValue);
  if (!token || !entry || typeof entry !== 'object') return false;
  return (
    String(entry.id || '') === token.entryId
    && normalizeJournalResetGeneration(resetGeneration) === token.resetGeneration
    && normalizeJournalEntryRevision(entry.entryRevision) === token.entryRevision
  );
}

async function journalResetGenerationSnapshot() {
  const db = await openJournalDb();
  try {
    return await runIndexedDbTransactionBounded(
      db,
      JOURNAL_META_STORE,
      'readonly',
      'Чтение generation журнала',
      ({ store, setResult, fail }) => {
        const request = store().get(JOURNAL_RESET_GENERATION_KEY);
        request.onsuccess = () => setResult(normalizeJournalResetGeneration(request.result?.value));
        request.onerror = () => fail(request.error || new Error('Не удалось прочитать generation журнала.'));
      },
      JOURNAL_CRUD_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
}

async function readJournalEntryWithAuthority(id) {
  const entryId = String(id || '').trim();
  if (!entryId) return null;
  const db = await openJournalDb();
  try {
    return await runIndexedDbTransactionBounded(
      db,
      [JOURNAL_STORE, JOURNAL_META_STORE],
      'readonly',
      'Чтение записи журнала с CAS authority',
      ({ tx, setResult, fail }) => {
        let entryReady = false;
        let generationReady = false;
        let entry = null;
        let resetGeneration = JOURNAL_INITIAL_RESET_GENERATION;
        const publish = () => {
          if (!entryReady || !generationReady) return;
          if (!entry) { setResult(null); return; }
          const normalizedEntry = {
            ...entry,
            entryRevision: normalizeJournalEntryRevision(entry.entryRevision)
          };
          setResult({
            entry: normalizedEntry,
            token: journalEntryAuthorityToken(resetGeneration, normalizedEntry)
          });
        };

        const entryRequest = tx.objectStore(JOURNAL_STORE).get(entryId);
        entryRequest.onsuccess = () => {
          entry = entryRequest.result || null;
          entryReady = true;
          publish();
        };
        entryRequest.onerror = () => fail(entryRequest.error || new Error('Не удалось прочитать запись журнала для CAS authority.'));

        const generationRequest = tx.objectStore(JOURNAL_META_STORE).get(JOURNAL_RESET_GENERATION_KEY);
        generationRequest.onsuccess = () => {
          resetGeneration = normalizeJournalResetGeneration(generationRequest.result?.value);
          generationReady = true;
          publish();
        };
        generationRequest.onerror = () => fail(generationRequest.error || new Error('Не удалось прочитать generation журнала для CAS authority.'));
      },
      JOURNAL_CRUD_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
}

async function captureJournalEntryAuthority(id) {
  const snapshot = await readJournalEntryWithAuthority(id);
  return snapshot?.token || null;
}

async function updateJournalEntryRecordCas(tokenValue, patch = {}) {
  const token = normalizeJournalEntryAuthorityToken(tokenValue);
  if (!token) {
    const error = new Error('Некорректный CAS token записи журнала.');
    error.code = 'JOURNAL_ENTRY_AUTHORITY_TOKEN_INVALID';
    throw error;
  }
  const db = await openJournalDb();
  try {
    return await runIndexedDbTransactionBounded(
      db,
      [JOURNAL_STORE, JOURNAL_META_STORE],
      'readwrite',
      'CAS обновление записи журнала',
      ({ tx, setResult, fail }) => {
        const entries = tx.objectStore(JOURNAL_STORE);
        const meta = tx.objectStore(JOURNAL_META_STORE);
        let entryReady = false;
        let generationReady = false;
        let current = null;
        let resetGeneration = JOURNAL_INITIAL_RESET_GENERATION;
        let compared = false;
        const compareAndWrite = () => {
          if (compared || !entryReady || !generationReady) return;
          compared = true;
          if (!journalEntryAuthorityMatches(resetGeneration, current, token)) {
            setResult({ ok: false, stale: true, entry: null, token: null });
            return;
          }
          try {
            const updated = {
              ...current,
              ...patch,
              id: current.id,
              entryRevision: nextJournalEntryRevision(current.entryRevision)
            };
            const put = entries.put(updated);
            put.onsuccess = () => {
              touchJournalDbRevision(tx, 'cas-update-entry');
              setResult({
                ok: true,
                stale: false,
                entry: updated,
                token: journalEntryAuthorityToken(resetGeneration, updated)
              });
            };
            put.onerror = () => fail(put.error || new Error('Не удалось CAS-обновить запись журнала.'));
          } catch (error) { fail(error); }
        };

        const entryRequest = entries.get(token.entryId);
        entryRequest.onsuccess = () => {
          current = entryRequest.result || null;
          entryReady = true;
          compareAndWrite();
        };
        entryRequest.onerror = () => fail(entryRequest.error || new Error('Не удалось прочитать запись журнала для CAS-обновления.'));

        const generationRequest = meta.get(JOURNAL_RESET_GENERATION_KEY);
        generationRequest.onsuccess = () => {
          resetGeneration = normalizeJournalResetGeneration(generationRequest.result?.value);
          generationReady = true;
          compareAndWrite();
        };
        generationRequest.onerror = () => fail(generationRequest.error || new Error('Не удалось прочитать generation журнала для CAS-обновления.'));
      },
      JOURNAL_CRUD_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
}

async function deleteJournalEntryRecordOnlyCas(tokenValue) {
  const token = normalizeJournalEntryAuthorityToken(tokenValue);
  if (!token) {
    const error = new Error('Некорректный CAS token записи журнала.');
    error.code = 'JOURNAL_ENTRY_AUTHORITY_TOKEN_INVALID';
    throw error;
  }
  const statsToken = await beginJournalStatsMutation('delete');
  const db = await openJournalDb();
  let result = null;
  try {
    result = await runIndexedDbTransactionBounded(
      db,
      [JOURNAL_STORE, JOURNAL_META_STORE],
      'readwrite',
      'CAS удаление записи журнала',
      ({ tx, setResult, fail }) => {
        const entries = tx.objectStore(JOURNAL_STORE);
        const meta = tx.objectStore(JOURNAL_META_STORE);
        let entryReady = false;
        let generationReady = false;
        let current = null;
        let resetGeneration = JOURNAL_INITIAL_RESET_GENERATION;
        let compared = false;
        const compareAndDelete = () => {
          if (compared || !entryReady || !generationReady) return;
          compared = true;
          if (!journalEntryAuthorityMatches(resetGeneration, current, token)) {
            setResult({ ok: false, stale: true, entry: null });
            return;
          }
          const del = entries.delete(token.entryId);
          del.onsuccess = () => {
            touchJournalDbRevision(tx, 'cas-delete-entry');
            setResult({ ok: true, stale: false, entry: current });
          };
          del.onerror = () => fail(del.error || new Error('Не удалось CAS-удалить запись журнала.'));
        };

        const entryRequest = entries.get(token.entryId);
        entryRequest.onsuccess = () => {
          current = entryRequest.result || null;
          entryReady = true;
          compareAndDelete();
        };
        entryRequest.onerror = () => fail(entryRequest.error || new Error('Не удалось прочитать запись журнала для CAS-удаления.'));

        const generationRequest = meta.get(JOURNAL_RESET_GENERATION_KEY);
        generationRequest.onsuccess = () => {
          resetGeneration = normalizeJournalResetGeneration(generationRequest.result?.value);
          generationReady = true;
          compareAndDelete();
        };
        generationRequest.onerror = () => fail(generationRequest.error || new Error('Не удалось прочитать generation журнала для CAS-удаления.'));
      },
      JOURNAL_CRUD_IDB_TX_TIMEOUT_MS
    );
  } catch (error) {
    await completeJournalStatsMutation(statsToken).catch(() => {});
    throw error;
  } finally { db.close(); }

  if (!result?.ok) {
    await completeJournalStatsMutation(statsToken).catch(() => {});
    return result || { ok: false, stale: true, entry: null };
  }

  const entry = result.entry;
  if (entry?.urlKey) {
    try {
      await rebuildUrlStatsForUrl(entry.urlKey);
      await completeJournalStatsMutation(statsToken);
    } catch (error) {
      console.warn('WebClip urlStats CAS delete deferred repair:', error);
    }
  } else {
    await completeJournalStatsMutation(statsToken);
  }
  return result;
}

async function updateJournalEntryRecord(id, patch = {}) {
  const db = await openJournalDb();
  try {
    return await runIndexedDbTransactionBounded(db, [JOURNAL_STORE, JOURNAL_META_STORE], 'readwrite', 'Обновление записи журнала', ({ tx, setResult, fail }) => {
      const store = tx.objectStore(JOURNAL_STORE); const req = store.get(id);
      req.onsuccess = () => { try { const current = req.result; if (!current) { setResult(null); return; } const updated = { ...current, ...patch, id: current.id, entryRevision: nextJournalEntryRevision(current.entryRevision) }; store.put(updated); touchJournalDbRevision(tx, 'update-entry'); setResult(updated); } catch (e) { fail(e); } };
      req.onerror = () => fail(req.error || new Error('Не удалось прочитать запись журнала для обновления.'));
    }, JOURNAL_CRUD_IDB_TX_TIMEOUT_MS);
  } finally { db.close(); }
}

function normalizeJournalComments(entry = {}) {
  const result = [];
  const raw = Array.isArray(entry.journalComments) ? entry.journalComments : [];
  for (let index = 0; index < raw.length; index += 1) {
    const item = raw[index];
    if (!item || typeof item !== 'object') continue;
    const text = String(item.text ?? item.comment ?? '');
    if (!text.trim()) continue;
    const createdAt = Number(item.createdAt || entry.createdAt || Date.now());
    const updatedAt = Number(item.updatedAt || createdAt);
    result.push({
      id: String(item.id || `comment-${entry.id || 'entry'}-${createdAt}-${index}`),
      text,
      createdAt,
      updatedAt,
      deletedAt: Math.max(0, Number(item.deletedAt || 0))
    });
  }
  if (!result.length) {
    const legacy = String(entry.journalComment || '');
    if (legacy.trim()) {
      const createdAt = Number(entry.journalCommentUpdatedAt || entry.createdAt || Date.now());
      result.push({
        id: `legacy-${entry.id || 'entry'}`,
        text: legacy,
        createdAt,
        updatedAt: Number(entry.journalCommentUpdatedAt || createdAt),
        deletedAt: 0
      });
    }
  }
  result.sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
  return result;
}

function journalCommentConflictResult() {
  return {
    ok: false,
    stale: true,
    conflict: true,
    code: 'JOURNAL_ENTRY_STALE',
    error: 'Запись журнала изменилась. Обновите журнал и повторите действие.'
  };
}

async function addJournalComment(id, comment) {
  if (!id) return { ok: false, error: 'Не указана запись журнала.' };
  const text = String(comment || '');
  if (!text.trim()) return { ok: false, error: 'Введите текст комментария.' };
  const snapshot = await readJournalEntryWithAuthority(id);
  const current = snapshot?.entry || null;
  const authority = snapshot?.token || null;
  if (!current || !authority) return { ok: false, error: 'Запись журнала не найдена.' };
  const comments = normalizeJournalComments(current);
  if (comments.length >= MAX_IMPORTED_COMMENTS_PER_ENTRY) return { ok: false, error: `В одной записи допускается не более ${MAX_IMPORTED_COMMENTS_PER_ENTRY} комментариев.` };
  if (text.length > MAX_IMPORTED_COMMENT_CHARS) return { ok: false, error: `Комментарий не должен превышать ${MAX_IMPORTED_COMMENT_CHARS} символов.` };
  try { assertJournalCommentBudget([...comments, { text }]); } catch (error) { return { ok: false, error: normalizeError(error) }; }
  const now = Date.now();
  comments.push({
    id: crypto.randomUUID ? crypto.randomUUID() : `comment-${now}-${Math.random().toString(16).slice(2)}`,
    text,
    createdAt: now,
    updatedAt: now,
    deletedAt: 0
  });
  const result = await updateJournalEntryRecordCas(authority, { journalComments: comments, journalComment: '', journalCommentUpdatedAt: 0 });
  if (result?.stale) return journalCommentConflictResult();
  if (!result?.ok || !result.entry) return { ok: false, error: 'Не удалось сохранить комментарий.' };
  notifyJournalChanged('comment-add');
  return { ok: true, entry: { ...result.entry, journalComments: comments } };
}

async function editJournalComment(id, commentId, comment) {
  if (!id) return { ok: false, error: 'Не указана запись журнала.' };
  if (!commentId) return { ok: false, error: 'Не указан комментарий.' };
  const text = String(comment || '');
  if (!text.trim()) return { ok: false, error: 'Введите текст комментария.' };
  const snapshot = await readJournalEntryWithAuthority(id);
  const current = snapshot?.entry || null;
  const authority = snapshot?.token || null;
  if (!current || !authority) return { ok: false, error: 'Запись журнала не найдена.' };
  const comments = normalizeJournalComments(current);
  const index = comments.findIndex((item) => item.id === commentId);
  if (index < 0) return { ok: false, error: 'Комментарий не найден.' };
  if (Number(comments[index].deletedAt || 0) > 0) {
    return { ok: false, error: 'Удалённый комментарий нельзя редактировать.' };
  }
  if (text.length > MAX_IMPORTED_COMMENT_CHARS) return { ok: false, error: `Комментарий не должен превышать ${MAX_IMPORTED_COMMENT_CHARS} символов.` };
  const prospective = comments.map((item, itemIndex) => itemIndex === index ? { ...item, text } : item);
  try { assertJournalCommentBudget(prospective); } catch (error) { return { ok: false, error: normalizeError(error) }; }
  comments[index] = { ...comments[index], text, updatedAt: Date.now() };
  const result = await updateJournalEntryRecordCas(authority, { journalComments: comments, journalComment: '', journalCommentUpdatedAt: 0 });
  if (result?.stale) return journalCommentConflictResult();
  if (!result?.ok || !result.entry) return { ok: false, error: 'Не удалось обновить комментарий.' };
  notifyJournalChanged('comment-edit');
  return { ok: true, entry: { ...result.entry, journalComments: comments } };
}

async function getJournalEntriesByIds(ids) {
  const uniqueIds = [...new Set((Array.isArray(ids) ? ids : []).map((id) => String(id || '').trim()).filter((id) => id && id.length <= 180))].slice(0, 500);
  if (!uniqueIds.length) return [];
  const db = await openJournalDb();
  try {
    return (await runIndexedDbTransactionBounded(db, JOURNAL_STORE, 'readonly', 'Пакетное чтение журнала', ({ store, setResult, fail }) => {
      const found = new Map(); const journalStore = store(); let remaining = uniqueIds.length;
      for (const id of uniqueIds) {
        const req = journalStore.get(id);
        req.onsuccess = () => { try { if (req.result) found.set(id, { ...req.result, journalComments: normalizeJournalComments(req.result) }); remaining -= 1; if (remaining === 0) setResult(uniqueIds.map((key) => found.get(key)).filter(Boolean)); } catch (e) { fail(e); } };
        req.onerror = () => fail(req.error || new Error('Не удалось прочитать запись журнала WebClip.'));
      }
    }, JOURNAL_CRUD_IDB_TX_TIMEOUT_MS)) || [];
  } finally { db.close(); }
}

async function updateJournalComment(id, comment) {
  if (!id) return { ok: false, error: 'Не указана запись журнала.' };
  const current = await getJournalEntryById(id);
  if (!current) return { ok: false, error: 'Запись журнала не найдена.' };
  const comments = normalizeJournalComments(current);
  const editable = comments.find((item) => Number(item.deletedAt || 0) <= 0);
  if (editable) return editJournalComment(id, editable.id, comment);
  return addJournalComment(id, comment);
}

async function deleteJournalComment(id, commentId) {
  if (!id) return { ok: false, error: 'Не указана запись журнала.' };
  if (!commentId) return { ok: false, error: 'Не указан комментарий.' };
  const snapshot = await readJournalEntryWithAuthority(id);
  const current = snapshot?.entry || null;
  const authority = snapshot?.token || null;
  if (!current || !authority) return { ok: false, error: 'Запись журнала не найдена.' };
  const comments = normalizeJournalComments(current);
  const index = comments.findIndex((item) => item.id === commentId);
  if (index < 0) return { ok: false, error: 'Комментарий не найден.' };
  if (Number(comments[index].deletedAt || 0) > 0) {
    return { ok: false, error: 'Комментарий уже помечен как удалённый.' };
  }
  comments[index] = { ...comments[index], deletedAt: Date.now() };
  const result = await updateJournalEntryRecordCas(authority, { journalComments: comments, journalComment: '', journalCommentUpdatedAt: 0 });
  if (result?.stale) return journalCommentConflictResult();
  if (!result?.ok || !result.entry) return { ok: false, error: 'Не удалось удалить комментарий.' };
  notifyJournalChanged('comment-delete');
  return { ok: true, entry: { ...result.entry, journalComments: comments } };
}

async function deleteJournalEntryRecordOnly(id) {
  const entry = await getJournalEntryById(id);
  if (!entry) return null;
  const statsToken = await beginJournalStatsMutation('delete');
  const db = await openJournalDb();
  try {
    await runIndexedDbTransactionBounded(db, [JOURNAL_STORE, JOURNAL_META_STORE], 'readwrite', 'Удаление записи журнала', ({ tx }) => { tx.objectStore(JOURNAL_STORE).delete(id); touchJournalDbRevision(tx, 'delete-entry'); }, JOURNAL_CRUD_IDB_TX_TIMEOUT_MS);
  } finally { db.close(); }
  if (entry.urlKey) { try { await rebuildUrlStatsForUrl(entry.urlKey); await completeJournalStatsMutation(statsToken); } catch (error) { console.warn('WebClip urlStats delete deferred repair:', error); } }
  else { await completeJournalStatsMutation(statsToken); }
  return entry;
}

async function findYandexFileForJournalEntry(entry, operationId = '') {
  const operationContext = arguments.length > 2 ? arguments[2] : null;
  const expectedResourceId = String(entry?.resourceId || '').trim();
  const expectedPublicUrl = String(entry?.publicUrl || '').trim();
  const expectedAccountUid = String(entry?.accountUid || '').trim();
  const expectedRootPath = normalizeDiskPath(entry?.rootPath || '');
  const storedPath = normalizeDiskPath(entry?.remotePath || '');
  const filename = String(entry?.filename || '').trim();
  const locateStartedAt = Date.now();
  const locateDeadline = locateStartedAt + 45_000;
  let storedPathMissing = false;

  const hasBoundOperationContext = Boolean(operationContext);
  const context = hasBoundOperationContext
    ? WebClipYandexOperationContext.validateOperationContext(operationContext)
    : null;
  const config = context ? { rootPath: context.rootPath } : await getYandexConfig();
  const currentRootPath = normalizeDiskPath(config.rootPath || '');
  if (expectedRootPath && currentRootPath && expectedRootPath !== currentRootPath) {
    const error = new Error(`Запись журнала относится к корневой папке ${expectedRootPath}, а сейчас выбрана ${currentRootPath}. Операция остановлена без изменения файла и журнала.`);
    error.code = 'YANDEX_ROOT_PATH_MISMATCH';
    throw error;
  }
  if (expectedAccountUid) {
    const currentAccountUid = context?.accountUid || await getCurrentYandexAccountUid(operationId);
    if (currentAccountUid !== expectedAccountUid) {
      const error = new Error('Запись журнала относится к другому аккаунту Яндекс Диска. Операция остановлена без изменения файла и журнала.');
      error.code = 'YANDEX_ACCOUNT_MISMATCH';
      throw error;
    }
  }

  const provenance = hasBoundOperationContext
    ? WebClipYandexRemoteIdentityAuthority.normalizeProvenance(entry?.remoteIdentityProvenance)
    : 'provider-verified';

  const remainingLocateMs = () => Math.max(0, locateDeadline - Date.now());
  const requestTimeoutMs = (cap = 8_000) => Math.max(1_000, Math.min(cap, remainingLocateMs()));
  const matchesKnownIdentity = (item, { discoveryByHint = false } = {}) => {
    if (!item || (item.type && item.type !== 'file')) return false;
    const itemId = item.resource_id ? normalizeYandexResourceIdFromApi(item.resource_id) : '';
    const itemPublic = item.public_url ? normalizeYandexPublicUrlFromApi(item.public_url) : '';
    if (provenance !== 'provider-verified') {
      if (!discoveryByHint) return true;
      return Boolean(
        (expectedResourceId && itemId && itemId === expectedResourceId)
        || (expectedPublicUrl && itemPublic && itemPublic === expectedPublicUrl)
      );
    }
    if (expectedResourceId) {
      if (itemId) {
        if (itemId !== expectedResourceId) return false;
        if (expectedPublicUrl && itemPublic && itemPublic !== expectedPublicUrl) return false;
        return true;
      }
      // A stored path alone is not identity proof once a stable resourceId is known.
      // Exact publicUrl may serve as a secondary stable identity for legacy/API responses
      // that omit resource_id, but a conflicting resource_id is never ignored.
      return Boolean(expectedPublicUrl && itemPublic && itemPublic === expectedPublicUrl);
    }
    if (expectedPublicUrl) return Boolean(itemPublic && itemPublic === expectedPublicUrl);
    return true;
  };
  const withObservedReceipt = (item) => {
    if (!hasBoundOperationContext) return item;
    return {
      ...item,
      remoteIdentityReceipt: WebClipYandexRemoteIdentityAuthority.createObservedReceipt({
        entry,
        metadata: item,
        operationContext: context,
        operationId,
        observedAt: Date.now()
      })
    };
  };

  if (storedPath) {
    emitJournalOperationProgress(operationId, 'locate', 'Проверяем сохранённый путь файла на Яндекс Диске…', 12, 'running', { storedPath });
    try {
      const direct = await yandexApi('/resources', {
        method: 'GET',
        timeoutMs: requestTimeoutMs(8_000),
        query: { path: storedPath, fields: 'name,path,type,size,public_url,resource_id' },
        operationId,
        operationContext: context
      }, false);
      if (direct?.type === 'file' && matchesKnownIdentity(direct)) {
        emitJournalOperationProgress(operationId, 'locate', 'Файл найден по сохранённому пути.', 24, 'running', { sourcePath: direct?.path || storedPath });
        return withObservedReceipt(direct);
      }
    } catch (error) {
      if (Number(error?.status) === 404) {
        storedPathMissing = true;
        appendOperationLogEvent(operationId, {
          category: 'locate-fallback',
          level: 'info',
          stage: 'locate',
          message: 'Файл отсутствует по сохранённому пути. Переходим к проверке известных расположений WebClip.',
          data: { storedPath, status: 404, hasResourceId: Boolean(expectedResourceId), hasPublicUrl: Boolean(expectedPublicUrl) }
        });
      } else {
        throw error;
      }
    }
  }

  // Для старых записей resourceId часто отсутствует. До глобального списка Диска
  // проверяем несколько детерминированных путей WebClip с тем же именем файла.
  // Это дешёвая операция и закрывает наиболее частый случай Upload <-> ReadmeLater.
  const candidates = [];
  const pushCandidate = (path, kind) => {
    const normalized = normalizeDiskPath(path || '');
    if (!normalized || normalized === storedPath || candidates.some((item) => item.path === normalized)) return;
    candidates.push({ path: normalized, kind });
  };
  if (filename && currentRootPath) {
    const siteSegments = getSiteFolderSegments(entry?.hostname || hostnameFromUrl(entry?.url));
    if (entry?.readMoveTargetPath) pushCandidate(entry.readMoveTargetPath, 'pending-move-target');
    if (entry?.readMoveSourcePath) pushCandidate(entry.readMoveSourcePath, 'pending-move-source');
    pushCandidate(joinDiskPath(currentRootPath, YANDEX_UPLOAD_DIR, ...siteSegments, filename), 'Upload');
    pushCandidate(joinDiskPath(currentRootPath, YANDEX_READ_LATER_DIR, ...siteSegments, filename), 'ReadmeLater');
    if (entry?.folder) pushCandidate(joinDiskPath(entry.folder, filename), 'saved-folder');

    // Если предыдущая попытка успела переместить файл в Trash, а локальная часть
    // затем не завершилась, повторная операция должна уметь безопасно найти файл.
    const now = new Date();
    for (let delta = 0; delta < 2; delta += 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - delta, 1);
      pushCandidate(joinDiskPath(currentRootPath, YANDEX_TRASH_DIR, journalBackupMonthFolderName(d), filename), 'Trash');
    }
  }

  for (let index = 0; index < Math.min(candidates.length, 6); index += 1) {
    if (remainingLocateMs() <= 1_000) break;
    const candidate = candidates[index];
    emitJournalOperationProgress(operationId, 'locate', `Проверяем известное расположение WebClip: ${candidate.kind}…`, 14 + Math.min(index, 5), 'running', {
      candidatePath: candidate.path,
      candidateKind: candidate.kind,
      hasResourceId: Boolean(expectedResourceId)
    });
    try {
      const data = await yandexApi('/resources', {
        method: 'GET', timeoutMs: requestTimeoutMs(5_000), operationId,
        query: { path: candidate.path, fields: 'name,path,type,size,public_url,resource_id' },
        operationContext: context
      }, false);
      if (data?.type === 'file' && matchesKnownIdentity(data)) {
        emitJournalOperationProgress(operationId, 'locate', 'Файл найден в известной папке WebClip.', 24, 'running', {
          sourcePath: data?.path || candidate.path,
          candidateKind: candidate.kind
        });
        return withObservedReceipt(data);
      }
    } catch (error) {
      if (Number(error?.status) === 404) continue;
      if (error?.code === 'YANDEX_TIMEOUT') {
        appendOperationLogEvent(operationId, {
          category: 'locate-warning', level: 'warn', stage: 'locate',
          message: 'Проверка одного из известных путей WebClip завершилась по таймауту; продолжаем ограниченный поиск.',
          data: { candidateKind: candidate.kind, candidatePath: candidate.path }
        });
        continue;
      }
      throw error;
    }
  }

  if (!expectedResourceId && !expectedPublicUrl) {
    const reason = storedPathMissing
      ? 'Файл отсутствует по сохранённому пути и не найден в известных папках WebClip. В старой записи нет resourceId или публичной ссылки для безопасного глобального сопоставления.'
      : 'В записи нет resourceId или публичной ссылки для безопасного поиска файла после изменения пути.';
    throw new Error(`${reason} Запись журнала оставлена без изменений.`);
  }

  const limit = 200;
  for (let offset = 0, page = 0; page < 250; page += 1, offset += limit) {
    if (remainingLocateMs() <= 1_000) {
      throw new Error('Поиск актуального расположения файла на Яндекс Диске не завершился за 45 с. Запись журнала и файл не изменены.');
    }

    const identityLabel = expectedResourceId ? 'resourceId' : 'публичной ссылке';
    emitJournalOperationProgress(
      operationId,
      'locate',
      page === 0
        ? `Известные расположения не подошли. Выполняем ограниченный поиск по ${identityLabel}…`
        : `Продолжаем ограниченный поиск: проверено ${offset} файлов…`,
      Math.min(23, 19 + Math.floor(page / 20)),
      'running',
      { offset, page: page + 1, limit, matchBy: expectedResourceId ? 'resourceId' : 'publicUrl' }
    );

    const query = {
      limit: String(limit), offset: String(offset),
      fields: 'items.name,items.path,items.type,items.public_url,items.resource_id,total,limit,offset'
    };
    let data;
    try {
      data = await yandexApi('/resources/files', {
        method: 'GET', timeoutMs: requestTimeoutMs(8_000), operationId, retryAttempt: 0, query,
        operationContext: context
      }, true);
    } catch (error) {
      if (error?.code !== 'YANDEX_TIMEOUT' || remainingLocateMs() <= 2_000) {
        if (error?.code === 'YANDEX_TIMEOUT') {
          throw new Error('Файл отсутствует по сохранённому пути. Поиск его актуального расположения на Яндекс Диске не завершился в отведённое время. Запись журнала и файл не изменены.');
        }
        throw error;
      }
      appendOperationLogEvent(operationId, {
        category: 'retry', level: 'warn', stage: 'locate',
        message: 'Страница списка файлов не ответила вовремя. Выполняем один повтор с уменьшенным таймаутом.',
        data: { endpoint: '/resources/files', offset, limit, retryAttempt: 1 }
      });
      try {
        data = await yandexApi('/resources/files', {
          method: 'GET', timeoutMs: requestTimeoutMs(5_000), operationId, retryAttempt: 1, query,
          operationContext: context
        }, false);
      } catch (retryError) {
        if (retryError?.code === 'YANDEX_TIMEOUT') {
          throw new Error('Файл отсутствует по сохранённому пути. Повторный поиск его актуального расположения на Яндекс Диске также завершился по таймауту. Запись журнала и файл не изменены.');
        }
        throw retryError;
      }
    }

    const items = Array.isArray(data?.items) ? data.items : [];
    const match = items.find((item) => matchesKnownIdentity(item, { discoveryByHint: true }));
    if (match) {
      emitJournalOperationProgress(operationId, 'locate', 'Актуальное расположение файла найдено.', 24, 'running', { sourcePath: match?.path || '' });
      return withObservedReceipt(match);
    }
    const total = Number(data?.total || 0);
    if (!items.length || (total && offset + items.length >= total) || items.length < limit) break;
  }

  throw new Error('Файл Яндекс Диска не найден по resourceId/публичной ссылке. Возможно, файл удалён или находится в другом аккаунте. Запись журнала оставлена без изменений.');
}

function trashConflictFilename(filename, date = new Date(), suffix = '') {
  const raw = String(filename || 'WebClip.pdf');
  const dot = raw.lastIndexOf('.');
  const base = dot > 0 ? raw.slice(0, dot) : raw;
  const ext = dot > 0 ? raw.slice(dot) : '';
  const pad = (v) => String(v).padStart(2, '0');
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
  return `${base}__deleted_${stamp}${suffix}${ext}`;
}

async function chooseYandexTrashTarget(monthFolder, filename, date = new Date(), operationId = '') {
  const operationContext = arguments.length > 4 ? arguments[4] : null;
  const deadline = Date.now() + 30_000;
  const timeoutForNextCheck = () => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('Подбор имени файла в Trash превысил 30 секунд. Запись журнала оставлена без изменений.');
    return Math.max(1_000, Math.min(8_000, remaining));
  };
  const preferred = joinDiskPath(monthFolder, filename || 'WebClip.pdf');
  try {
    await yandexApi('/resources', { method: 'GET', query: { path: preferred, fields: 'type' }, timeoutMs: timeoutForNextCheck(), operationId, operationContext });
  } catch (error) {
    if (Number(error?.status) === 404) return preferred;
    throw error;
  }
  for (let n = 0; n < 100; n += 1) {
    const candidateName = trashConflictFilename(filename, date, n ? `_${n + 1}` : '');
    const candidate = joinDiskPath(monthFolder, candidateName);
    try {
      await yandexApi('/resources', { method: 'GET', query: { path: candidate, fields: 'type' }, timeoutMs: timeoutForNextCheck(), operationId, operationContext });
    } catch (error) {
      if (Number(error?.status) === 404) return candidate;
      throw error;
    }
  }
  throw new Error('Не удалось подобрать свободное имя для файла в папке Trash.');
}

function isDiskPathInside(path, root) {
  const normalizedPath = normalizeDiskPath(path || '');
  const normalizedRoot = normalizeDiskPath(root || '');
  if (!normalizedPath || !normalizedRoot || normalizedRoot === '/') return false;
  return normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}/`);
}

function assertManagedYandexSourcePath(path, rootPath, allowedBranches) {
  const allowed = (allowedBranches || []).map((branch) => joinDiskPath(rootPath, branch));
  if (!allowed.some((root) => isDiskPathInside(path, root))) {
    throw new Error('Операция остановлена: исходный файл находится вне текущих служебных папок WebClip на Яндекс Диске. Файл и запись журнала не изменены.');
  }
}

async function revalidateYandexDestructiveReceipt(receipt, operationContext, operationId = '') {
  const sourcePath = normalizeDiskPath(receipt?.path || '');
  if (!sourcePath) {
    const error = new Error('Destructive-команда не получила exact source path из remote identity receipt.');
    error.code = 'WEBCLIP_REMOTE_IDENTITY_RECEIPT_REQUIRED';
    throw error;
  }
  const metadata = await yandexApi('/resources', {
    method: 'GET',
    query: { path: sourcePath, fields: 'name,path,type,size,public_url,resource_id' },
    timeoutMs: 8_000,
    operationId,
    operationContext
  }, false);
  return WebClipYandexRemoteIdentityAuthority.assertDestructiveCommand({
    receipt,
    operationContext,
    sourcePath,
    metadata
  });
}

async function readYandexPublicationStateByReceipt(receipt, operationContext, operationId = '', timeoutMs = 8_000) {
  const context = WebClipYandexOperationContext.proveRecoveryContext({
    context: operationContext,
    binding: { accountUid: receipt?.accountUid, rootPath: receipt?.rootPath }
  });
  const sourcePath = normalizeDiskPath(receipt?.sourcePath || receipt?.path || '');
  const sourceResourceId = String(receipt?.sourceResourceId || receipt?.resourceId || '').trim();
  if (!sourcePath || !sourceResourceId || !isDiskPathInside(sourcePath, context.rootPath)) {
    const error = new Error('Publication-revoke receipt не содержит exact path/resource_id внутри bound root.');
    error.code = 'WEBCLIP_PUBLICATION_REVOKE_IDENTITY_INVALID';
    throw error;
  }
  const metadata = await yandexApi('/resources', {
    method: 'GET',
    query: { path: sourcePath, fields: 'name,path,type,size,public_url,resource_id' },
    timeoutMs,
    operationId,
    operationContext: context
  }, false);
  const observedPath = metadata?.path ? normalizeYandexDiskPathFromApi(metadata.path) : sourcePath;
  const observedResourceId = metadata?.resource_id ? normalizeYandexResourceIdFromApi(metadata.resource_id) : '';
  if (metadata?.type !== 'file' || observedPath !== sourcePath || observedResourceId !== sourceResourceId) {
    const error = new Error('Publication-revoke reconciliation не подтвердил exact resource_id/path исходного файла.');
    error.code = 'WEBCLIP_PUBLICATION_REVOKE_IDENTITY_CONFLICT';
    throw error;
  }
  return Object.freeze({
    metadata,
    path: observedPath,
    resourceId: observedResourceId,
    publicUrl: metadata?.public_url ? normalizeYandexPublicUrlFromApi(metadata.public_url) : ''
  });
}

async function reconcilePendingPublicationRevokeReceipt(item, trigger = 'maintenance') {
  const context = await captureCurrentYandexOperationContext();
  const observed = await readYandexPublicationStateByReceipt(item, context, String(item?.operationId || ''), 10_000);
  if (observed.publicUrl) {
    return Object.freeze({
      settled: false,
      reason: `После ${trigger} exact remote object всё ещё содержит public_url. Automatic unpublish retry запрещён; требуется ручная проверка.`
    });
  }
  const verified = await markPendingDestructiveMoveVerified(item.id, {
    remotePath: observed.path,
    resourceId: observed.resourceId,
    filename: observed.metadata?.name ? normalizeYandexItemNameFromApi(observed.metadata.name) : '',
    folder: parentDiskPath(observed.path),
    publicUrl: ''
  });
  return Object.freeze({ settled: true, receipt: verified });
}

async function readYandexExactResourceAtReceiptPath(receipt, operationContext, path, operationId = '', timeoutMs = 8_000) {
  const context = WebClipYandexOperationContext.proveRecoveryContext({
    context: operationContext,
    binding: { accountUid: receipt?.accountUid, rootPath: receipt?.rootPath }
  });
  const expectedPath = normalizeDiskPath(path || '');
  const expectedResourceId = String(receipt?.sourceResourceId || '').trim();
  if (!expectedPath || !expectedResourceId || !isDiskPathInside(expectedPath, context.rootPath)) {
    const error = new Error('Composite revoke+Trash receipt не содержит exact path/resource_id внутри bound root.');
    error.code = 'WEBCLIP_PUBLICATION_REVOKE_TRASH_IDENTITY_INVALID';
    throw error;
  }
  const metadata = await yandexApi('/resources', {
    method: 'GET',
    query: { path: expectedPath, fields: 'name,path,type,size,public_url,resource_id' },
    timeoutMs,
    operationId,
    operationContext: context
  }, false);
  const observedPath = metadata?.path ? normalizeYandexDiskPathFromApi(metadata.path) : expectedPath;
  const observedResourceId = metadata?.resource_id ? normalizeYandexResourceIdFromApi(metadata.resource_id) : '';
  if (metadata?.type !== 'file' || observedPath !== expectedPath || observedResourceId !== expectedResourceId) {
    const error = new Error('Composite revoke+Trash reconciliation не подтвердил exact resource_id/path.');
    error.code = 'WEBCLIP_PUBLICATION_REVOKE_TRASH_IDENTITY_CONFLICT';
    throw error;
  }
  return Object.freeze({
    metadata,
    path: observedPath,
    resourceId: observedResourceId,
    publicUrl: metadata?.public_url ? normalizeYandexPublicUrlFromApi(metadata.public_url) : ''
  });
}

async function executePendingPublicationRevokeTrashMove(receiptId, operationContext, { recovery = false } = {}) {
  const key = String(receiptId || '');
  let receipt = await readPendingDestructiveMoveReceipt(key);
  if (!receipt || receipt.kind !== 'publication-revoke-trash' || receipt.phase !== 'revoke-verified') {
    const error = new Error('Composite revoke+Trash receipt не готов к отдельной move admission.');
    error.code = 'WEBCLIP_PUBLICATION_REVOKE_TRASH_MOVE_PHASE_INVALID';
    throw error;
  }
  if (receipt.supersededByJournalReset === true) {
    await removePendingDestructiveMove(key);
    return Object.freeze({ cancelled: true, receipt: null, supersededByJournalReset: true });
  }

  const operationId = String(receipt.operationId || '');
  const sourcePath = normalizeDiskPath(receipt.sourcePath || '');
  const targetPath = normalizeDiskPath(receipt.targetPath || '');
  const source = await readYandexExactResourceAtReceiptPath(receipt, operationContext, sourcePath, operationId, 8_000);
  if (source.publicUrl) {
    const error = new Error('Move admission запрещена: exact source снова содержит public_url.');
    error.code = 'WEBCLIP_PUBLICATION_REVOKE_TRASH_SOURCE_PUBLIC';
    throw error;
  }

  if (sourcePath === targetPath) {
    const verified = await markPendingDestructiveMoveVerified(key, {
      remotePath: source.path,
      resourceId: source.resourceId,
      filename: source.metadata?.name ? normalizeYandexItemNameFromApi(source.metadata.name) : '',
      folder: parentDiskPath(source.path),
      publicUrl: ''
    });
    return Object.freeze({ cancelled: false, receipt: verified, alreadyInTrash: true });
  }

  try {
    const occupied = await yandexApi('/resources', {
      method: 'GET',
      query: { path: targetPath, fields: 'type,path,resource_id' },
      timeoutMs: 8_000,
      operationId,
      operationContext
    }, false);
    if (occupied?.type) {
      const error = new Error('Подготовленный Trash target уже занят; immutable composite receipt не будет молча перенаправлен.');
      error.code = 'WEBCLIP_PUBLICATION_REVOKE_TRASH_TARGET_OCCUPIED';
      throw error;
    }
  } catch (error) {
    if (Number(error?.status) !== 404) throw error;
  }

  emitJournalOperationProgress(
    operationId,
    'move',
    recovery
      ? 'После restart приватное состояние доказано; фиксируем отдельную move admission и переносим exact файл в Trash…'
      : 'Приватное состояние доказано; фиксируем отдельную move admission и переносим exact файл в Trash…',
    72,
    'running',
    { sourcePath, targetPath, recovery }
  );
  await markPendingPublicationRevokeTrashRemoteAdmission(key, 'revoke-verified', 'move-admitted-unknown');

  let commandError = null;
  try {
    await yandexApi('/resources/move', {
      method: 'POST',
      query: { from: sourcePath, path: targetPath, overwrite: 'false', force_async: 'false' },
      timeoutMs: 15_000,
      operationId,
      operationContext
    }, false);
  } catch (error) {
    commandError = error;
    appendOperationLogEvent(operationId, {
      category: 'publication-revoke-trash-settlement', level: 'warn', stage: 'move',
      message: 'Move command не дал надёжного terminal result; проверяем immutable target без повторной команды.',
      data: { error: normalizeError(error), retryForbidden: true }
    });
  }

  emitJournalOperationProgress(operationId, 'verify-move', 'Проверяем private exact объект в подготовленном Trash target…', 86, 'running', { targetPath });
  const verifyDeadline = Date.now() + 45_000;
  let moved = null;
  let lastVerifyError = null;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    let remaining = verifyDeadline - Date.now();
    if (remaining <= 500) break;
    if (attempt) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(250 * attempt, Math.max(0, remaining - 500))));
      remaining = verifyDeadline - Date.now();
      if (remaining <= 500) break;
    }
    try {
      const observed = await readYandexExactResourceAtReceiptPath(
        receipt,
        operationContext,
        targetPath,
        operationId,
        Math.max(1_000, Math.min(8_000, remaining))
      );
      if (observed.publicUrl) {
        const error = new Error('Exact объект в Trash неожиданно содержит public_url.');
        error.code = 'WEBCLIP_PUBLICATION_REVOKE_TRASH_TARGET_PUBLIC';
        throw error;
      }
      moved = observed;
      break;
    } catch (error) {
      lastVerifyError = error;
      if (Number(error?.status) !== 404 && error?.code !== 'WEBCLIP_PUBLICATION_REVOKE_TRASH_IDENTITY_CONFLICT') throw error;
    }
  }
  if (!moved) {
    const error = new Error(`Яндекс Диск не подтвердил private exact объект в Trash target. Повтор move запрещён; durable receipt сохранён для observation-only reconciliation.${commandError ? ` Команда: ${normalizeError(commandError)}.` : ''}${lastVerifyError ? ` Проверка: ${normalizeError(lastVerifyError)}.` : ''}`);
    error.code = 'WEBCLIP_PUBLICATION_REVOKE_TRASH_MOVE_SETTLEMENT_UNKNOWN';
    throw error;
  }

  const verified = await markPendingDestructiveMoveVerified(key, {
    remotePath: moved.path,
    resourceId: moved.resourceId,
    filename: moved.metadata?.name ? normalizeYandexItemNameFromApi(moved.metadata.name) : '',
    folder: parentDiskPath(moved.path),
    publicUrl: ''
  });
  return Object.freeze({ cancelled: false, receipt: verified, alreadyInTrash: false });
}

async function reconcilePendingPublicationRevokeTrashReceipt(item, trigger = 'maintenance') {
  const id = String(item?.id || '');
  const operationId = String(item?.operationId || '');
  const context = await captureCurrentYandexOperationContext();
  let current = item;

  if (current.phase === 'revoke-admitted-unknown') {
    const observed = await readYandexExactResourceAtReceiptPath(current, context, current.sourcePath, operationId, 10_000);
    if (observed.publicUrl) {
      return Object.freeze({
        settled: false,
        reason: `После ${trigger} exact source всё ещё содержит public_url. Automatic unpublish retry запрещён; move не admitted.`
      });
    }
    current = await markPendingPublicationRevokeTrashPhase(id, 'revoke-admitted-unknown', 'revoke-verified', {
      revokeVerifiedAt: Date.now(),
      revokeVerifiedPath: observed.path,
      revokeVerifiedResourceId: observed.resourceId,
      revokeVerifiedPublicUrl: ''
    });
  }

  if (current?.supersededByJournalReset === true && current.phase === 'revoke-verified') {
    await removePendingDestructiveMove(id);
    return Object.freeze({ settled: false, cancelled: true, supersededByJournalReset: true });
  }

  if (current?.phase === 'revoke-verified') {
    const moved = await executePendingPublicationRevokeTrashMove(id, context, { recovery: true });
    if (moved.cancelled) return Object.freeze({ settled: false, cancelled: true, supersededByJournalReset: true });
    current = moved.receipt;
  } else if (current?.phase === 'move-admitted-unknown') {
    let observedTarget = null;
    try {
      observedTarget = await readYandexExactResourceAtReceiptPath(current, context, current.targetPath, operationId, 10_000);
    } catch (error) {
      if (Number(error?.status) === 404) {
        return Object.freeze({
          settled: false,
          reason: `После ${trigger} immutable Trash target отсутствует. Automatic move retry запрещён после durable admission.`
        });
      }
      throw error;
    }
    if (observedTarget.publicUrl) {
      return Object.freeze({
        settled: false,
        reason: `После ${trigger} exact Trash target содержит public_url; automatic local deletion запрещена.`
      });
    }
    current = await markPendingDestructiveMoveVerified(id, {
      remotePath: observedTarget.path,
      resourceId: observedTarget.resourceId,
      filename: observedTarget.metadata?.name ? normalizeYandexItemNameFromApi(observedTarget.metadata.name) : '',
      folder: parentDiskPath(observedTarget.path),
      publicUrl: ''
    });
  }

  if (current?.phase !== 'remote-verified') {
    return Object.freeze({ settled: false, reason: `Composite revoke+Trash receipt имеет неподдерживаемую recovery phase «${String(current?.phase || '')}».` });
  }
  return Object.freeze({ settled: true, receipt: current });
}

async function revokeJournalEntryPublicAccess(id, operationId = '', options = {}) {
  operationId = String(operationId || '') || makeOperationLogId('journal-revoke-public');
  const completionAction = normalizePublicationRevokeCompletionAction(options?.completionAction || '');
  if (!completionAction) {
    const error = new Error('Неподдерживаемое завершение операции отзыва публичной ссылки.');
    error.code = 'WEBCLIP_PUBLICATION_REVOKE_COMPLETION_INVALID';
    throw error;
  }
  const deleteJournalAfterRevoke = completionAction === PUBLICATION_REVOKE_COMPLETION_DELETE_KEEP;
  const deleteJournalAndTrashAfterRevoke = completionAction === PUBLICATION_REVOKE_COMPLETION_DELETE_TRASH;
  if (!id) return { ok: false, error: 'Не указана запись журнала.' };
  const authoritySnapshot = await readJournalEntryWithAuthority(id);
  const entry = authoritySnapshot?.entry || null;
  const journalAuthority = authoritySnapshot?.token || null;
  if (!entry || !journalAuthority) return { ok: false, error: 'Запись журнала уже отсутствует.' };
  const expectedPublicUrl = String(entry.publicUrl || '').trim();
  if (entry.destination !== 'yandex' || !expectedPublicUrl) {
    return { ok: false, error: 'У этой записи нет известной публичной ссылки Яндекс Диска.' };
  }

  await startOperationLog(
    operationId,
    deleteJournalAfterRevoke || deleteJournalAndTrashAfterRevoke ? 'journal-delete' : 'journal-publication-revoke',
    deleteJournalAndTrashAfterRevoke
      ? 'Отзыв публичного доступа, перенос exact файла в Trash и удаление записи журнала'
      : (deleteJournalAfterRevoke
        ? 'Отзыв публичного доступа и удаление записи журнала с сохранением файла'
        : 'Отзыв публичного доступа к файлу Яндекс Диска'),
    {
    journalEntryId: id,
    remotePath: entry.remotePath || '',
    resourceId: entry.resourceId || '',
    accountUid: entry.accountUid ? '[BOUND]' : '',
    rootPath: entry.rootPath || '',
    requestedPublicationOutcome: 'private',
    publicationAction: 'revoke',
    diskAction: deleteJournalAndTrashAfterRevoke ? 'trash' : (deleteJournalAfterRevoke ? 'keep' : 'none'),
    completionAction
    }
  );

  let detachedReceiptId = '';
  let revokeAdmitted = false;
  try {
    emitJournalOperationProgress(operationId, 'locate', 'Проверяем exact файл и текущую публичную ссылку…', 12);
    const operationContext = await captureCurrentYandexOperationContext();
    const current = await findYandexFileForJournalEntry(entry, operationId, operationContext);
    const identityReceipt = current?.remoteIdentityReceipt || null;
    const sourcePath = normalizeDiskPath(identityReceipt?.path || '');
    const observedPublicUrl = String(identityReceipt?.publicUrl || '').trim();
    if (!sourcePath || !identityReceipt?.resourceId) {
      const error = new Error('Яндекс Диск не подтвердил exact path/resource_id для отзыва ссылки.');
      error.code = 'WEBCLIP_PUBLICATION_REVOKE_IDENTITY_REQUIRED';
      throw error;
    }
    assertManagedYandexSourcePath(sourcePath, operationContext.rootPath, [YANDEX_UPLOAD_DIR, YANDEX_READ_LATER_DIR, YANDEX_TRASH_DIR]);

    if (!observedPublicUrl) {
      const entryResourceId = String(entry.resourceId || '').trim();
      if (!entryResourceId || entryResourceId !== String(identityReceipt.resourceId || '')) {
        const error = new Error('Файл по сохранённому пути уже приватный, но запись не содержит совпадающий stable resource_id. WebClip не будет очищать единственную известную публичную ссылку по одному пути.');
        error.code = 'WEBCLIP_PUBLICATION_REVOKE_ALREADY_PRIVATE_IDENTITY_UNPROVEN';
        throw error;
      }
      if (deleteJournalAndTrashAfterRevoke) {
        emitJournalOperationProgress(operationId, 'folder', 'Файл уже приватный; подготавливаем обычный exact Trash move…', 30);
        const moved = await moveJournalYandexFileToTrash(entry, operationId, journalAuthority);
        emitJournalOperationProgress(operationId, 'journal', 'Private exact файл подтверждён в Trash; удаляем исходную запись журнала…', 94);
        const finalized = await finalizeTrashDeleteFromReceipt(moved.detachedReceiptId);
        const journalSuperseded = Boolean(finalized?.cancelled);
        if (!journalSuperseded) notifyJournalChanged('delete');
        refreshActionForAllTabs().catch(() => {});
        emitJournalOperationProgress(operationId, 'complete', journalSuperseded
          ? 'Private exact файл подтверждён в Trash; replacement Journal state не изменён.'
          : 'Файл уже был приватным, перемещён в Trash; запись журнала удалена.', 100, journalSuperseded || finalized?.statsWarning ? 'partial' : 'success');
        return {
          ok: true,
          operationId,
          publicationOutcome: 'already-private-verified',
          completionAction,
          journalDeleted: !journalSuperseded,
          journalSuperseded,
          trashPath: moved.trashPath,
          trashMonth: moved.trashMonth,
          statsWarning: String(finalized?.statsWarning || '')
        };
      }
      emitJournalOperationProgress(
        operationId,
        'journal',
        deleteJournalAfterRevoke
          ? 'Файл уже приватный; удаляем exact запись журнала, сохраняя файл…'
          : 'Файл уже приватный; очищаем устаревшую ссылку в журнале…',
        86
      );
      const localResult = deleteJournalAfterRevoke
        ? await deleteJournalEntryRecordOnlyCas(journalAuthority)
        : await updateJournalEntryRecordCas(journalAuthority, {
          publicUrl: '',
          resourceId: identityReceipt.resourceId,
          remotePath: sourcePath,
          remoteIdentityProvenance: WebClipYandexRemoteIdentityAuthority.PROVIDER_VERIFIED,
          publicationRevokedAt: Date.now()
        });
      const journalSuperseded = Boolean(!localResult?.ok && localResult?.stale);
      if (!journalSuperseded) notifyJournalChanged(deleteJournalAfterRevoke ? 'delete' : 'publication-revoke');
      emitJournalOperationProgress(operationId, 'complete', journalSuperseded
        ? 'Файл подтверждён приватным; replacement Journal state не изменён.'
        : (deleteJournalAfterRevoke
          ? 'Файл подтверждён приватным; запись журнала удалена, файл сохранён.'
          : 'Файл уже был приватным. Устаревшая публичная ссылка удалена из журнала.'), 100, journalSuperseded ? 'partial' : 'success');
      return {
        ok: true,
        operationId,
        publicationOutcome: 'already-private-verified',
        completionAction,
        journalDeleted: deleteJournalAfterRevoke && !journalSuperseded,
        journalSuperseded
      };
    }
    if (observedPublicUrl !== expectedPublicUrl) {
      const error = new Error('Текущая public_url exact файла не совпадает со ссылкой записи журнала. Отзыв остановлен без изменения доступа.');
      error.code = 'WEBCLIP_PUBLICATION_REVOKE_PUBLIC_URL_CONFLICT';
      throw error;
    }

    let targetPath = sourcePath;
    let trashMonth = '';
    if (deleteJournalAndTrashAfterRevoke) {
      const deletionDate = new Date();
      trashMonth = journalBackupMonthFolderName(deletionDate);
      const trashRoot = joinDiskPath(operationContext.rootPath, YANDEX_TRASH_DIR);
      const monthFolder = joinDiskPath(trashRoot, trashMonth);
      emitJournalOperationProgress(operationId, 'folder', `До remote admission подготавливаем immutable Trash target ${YANDEX_TRASH_DIR}/${trashMonth}…`, 28, 'running', { sourcePath, monthFolder });
      await ensureYandexFolderTree(monthFolder, operationId, operationContext);
      const currentName = current?.name ? normalizeYandexItemNameFromApi(current.name) : String(entry?.filename || 'WebClip.pdf');
      const alreadyInTrash = sourcePath.startsWith(`${normalizeDiskPath(trashRoot)}/`);
      targetPath = alreadyInTrash ? sourcePath : await chooseYandexTrashTarget(monthFolder, currentName, deletionDate, operationId, operationContext);
    }

    const receipt = await checkpointPendingPublicationRevokeIntent(entry, {
      sourcePath,
      targetPath,
      trashMonth,
      sourceResourceId: identityReceipt.resourceId,
      sourcePublicUrl: observedPublicUrl,
      remoteIdentityReceipt: identityReceipt,
      operationId,
      journalAuthority,
      completionAction
    });
    detachedReceiptId = receipt.id;

    emitJournalOperationProgress(operationId, 'revoke', 'Фиксируем durable revoke admission и отзываем публичную ссылку…', deleteJournalAndTrashAfterRevoke ? 42 : 48);
    const revalidatedMetadata = await yandexApi('/resources', {
      method: 'GET',
      query: { path: sourcePath, fields: 'name,path,type,size,public_url,resource_id' },
      timeoutMs: 8_000,
      operationId,
      operationContext
    }, false);
    WebClipYandexRemoteIdentityAuthority.assertDestructiveCommand({
      receipt: identityReceipt,
      operationContext,
      sourcePath,
      metadata: revalidatedMetadata
    });
    const revalidatedPublicUrl = revalidatedMetadata?.public_url
      ? normalizeYandexPublicUrlFromApi(revalidatedMetadata.public_url)
      : '';
    if (revalidatedPublicUrl !== observedPublicUrl) {
      const error = new Error('Public_url изменилась после provider observation; unpublish admission запрещён.');
      error.code = 'WEBCLIP_PUBLICATION_REVOKE_REVALIDATION_CONFLICT';
      throw error;
    }
    if (deleteJournalAndTrashAfterRevoke) {
      await markPendingPublicationRevokeTrashRemoteAdmission(detachedReceiptId, 'prepared', 'revoke-admitted-unknown');
    } else {
      await markPendingDestructiveMoveAdmitted(detachedReceiptId);
    }
    revokeAdmitted = true;

    let commandError = null;
    try {
      await yandexApi('/resources/unpublish', {
        method: 'PUT',
        query: { path: sourcePath },
        timeoutMs: 15_000,
        operationId,
        operationContext
      }, false);
    } catch (error) {
      commandError = error;
      appendOperationLogEvent(operationId, {
        category: 'publication-revoke-settlement', level: 'warn', stage: 'revoke',
        message: 'Unpublish command не дал надёжного terminal result; проверяем authoritative resource metadata без повторной команды.',
        data: { error: normalizeError(error), retryForbidden: true }
      });
    }

    emitJournalOperationProgress(operationId, deleteJournalAndTrashAfterRevoke ? 'verify-revoke' : 'verify', 'Проверяем, что public_url действительно исчезла…', deleteJournalAndTrashAfterRevoke ? 58 : 72);
    const verifyDeadline = Date.now() + 45_000;
    let observedPrivate = null;
    let lastVerifyError = null;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      let remaining = verifyDeadline - Date.now();
      if (remaining <= 500) break;
      if (attempt) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(300 * attempt, Math.max(0, remaining - 500))));
        remaining = verifyDeadline - Date.now();
        if (remaining <= 500) break;
      }
      try {
        const observed = await readYandexPublicationStateByReceipt(receipt, operationContext, operationId, Math.max(1_000, Math.min(8_000, remaining)));
        if (!observed.publicUrl) { observedPrivate = observed; break; }
      } catch (error) {
        lastVerifyError = error;
      }
    }
    if (!observedPrivate) {
      const error = new Error(`Яндекс Диск не подтвердил приватное состояние exact файла. Повтор unpublish запрещён; durable receipt сохранён для reconciliation.${commandError ? ` Команда: ${normalizeError(commandError)}.` : ''}${lastVerifyError ? ` Проверка: ${normalizeError(lastVerifyError)}.` : ''}`);
      error.code = 'WEBCLIP_PUBLICATION_REVOKE_SETTLEMENT_UNKNOWN';
      throw error;
    }

    if (deleteJournalAndTrashAfterRevoke) {
      await markPendingPublicationRevokeTrashPhase(detachedReceiptId, 'revoke-admitted-unknown', 'revoke-verified', {
        revokeVerifiedAt: Date.now(),
        revokeVerifiedPath: observedPrivate.path,
        revokeVerifiedResourceId: observedPrivate.resourceId,
        revokeVerifiedPublicUrl: ''
      });
      const moved = await executePendingPublicationRevokeTrashMove(detachedReceiptId, operationContext);
      if (moved.cancelled) {
        return {
          ok: true,
          operationId,
          publicationOutcome: 'revoked-verified',
          completionAction,
          journalDeleted: false,
          journalSuperseded: true,
          trashPath: '',
          trashMonth
        };
      }
      emitJournalOperationProgress(operationId, 'journal', 'Private exact объект подтверждён в Trash; удаляем исходную запись журнала…', 94);
      const finalized = await finalizeTrashDeleteFromReceipt(detachedReceiptId);
      const journalSuperseded = Boolean(finalized?.cancelled);
      if (!journalSuperseded) notifyJournalChanged('delete');
      refreshActionForAllTabs().catch(() => {});
      const verifiedTrashPath = normalizeDiskPath(moved.receipt?.verifiedPath || targetPath);
      emitJournalOperationProgress(operationId, 'complete', journalSuperseded
        ? 'Публичный доступ отозван и private exact объект подтверждён в Trash; replacement Journal state не изменён.'
        : 'Публичный доступ отозван, private exact файл перемещён в Trash, запись журнала удалена.', 100, journalSuperseded || finalized?.statsWarning ? 'partial' : 'success');
      return {
        ok: true,
        operationId,
        publicationOutcome: 'revoked-verified',
        completionAction,
        journalDeleted: !journalSuperseded,
        journalSuperseded,
        trashPath: verifiedTrashPath,
        trashMonth,
        statsWarning: String(finalized?.statsWarning || '')
      };
    }

    await markPendingDestructiveMoveVerified(detachedReceiptId, {
      remotePath: observedPrivate.path,
      resourceId: observedPrivate.resourceId,
      filename: observedPrivate.metadata?.name ? normalizeYandexItemNameFromApi(observedPrivate.metadata.name) : String(entry.filename || ''),
      folder: parentDiskPath(observedPrivate.path),
      publicUrl: ''
    });
    emitJournalOperationProgress(
      operationId,
      'journal',
      deleteJournalAfterRevoke
        ? 'Приватное состояние подтверждено; удаляем exact запись журнала, сохраняя файл…'
        : 'Фиксируем подтверждённое приватное состояние в журнале…',
      90
    );
    const finalized = await finalizePublicationRevokeJournalFromReceipt(detachedReceiptId);
    const journalSuperseded = Boolean(finalized?.cancelled);
    const journalDeleted = deleteJournalAfterRevoke && !journalSuperseded;
    if (!journalSuperseded) notifyJournalChanged(deleteJournalAfterRevoke ? 'delete' : 'publication-revoke');
    refreshActionForAllTabs().catch(() => {});
    emitJournalOperationProgress(operationId, 'complete', journalSuperseded
      ? 'Публичный доступ отозван; replacement Journal state не изменён.'
      : (deleteJournalAfterRevoke
        ? 'Публичный доступ отозван; запись журнала удалена, файл сохранён на Яндекс Диске.'
        : 'Публичный доступ отозван и подтверждён метаданными Яндекс Диска.'), 100, journalSuperseded ? 'partial' : 'success');
    return {
      ok: true,
      operationId,
      publicationOutcome: 'revoked-verified',
      completionAction,
      journalDeleted,
      journalSuperseded
    };
  } catch (error) {
    if (detachedReceiptId) {
      if (revokeAdmitted) {
        await markPendingDestructiveMoveFailure(detachedReceiptId, error).catch(() => {});
        activeDestructiveMoveReceipts.delete(detachedReceiptId);
      } else {
        await removePendingDestructiveMove(detachedReceiptId).catch(() => {});
      }
    }
    emitJournalOperationProgress(operationId, 'error', `Ошибка: ${normalizeError(error)}`, 100, 'error');
    throw error;
  }
}

async function moveJournalYandexFileToTrash(entry, operationId = '', journalAuthority = null) {
  let detachedReceiptId = '';
  let moveAdmitted = false;
  try {
    emitJournalOperationProgress(operationId, 'locate', 'Ищем актуальное расположение файла на Яндекс Диске…', 12);
    const operationContext = await captureCurrentYandexOperationContext();
    const rootPath = normalizeDiskPath(operationContext.rootPath || '');
    const current = await findYandexFileForJournalEntry(entry, operationId, operationContext);
    const identityReceipt = current?.remoteIdentityReceipt || null;
    const sourcePath = normalizeDiskPath(identityReceipt?.path || '');
    if (!sourcePath) throw new Error('Яндекс Диск не вернул текущий путь файла.');
    assertManagedYandexSourcePath(sourcePath, rootPath, [YANDEX_UPLOAD_DIR, YANDEX_READ_LATER_DIR, YANDEX_TRASH_DIR]);

    const deletionDate = new Date();
    const monthName = journalBackupMonthFolderName(deletionDate);
    const trashRoot = joinDiskPath(rootPath, YANDEX_TRASH_DIR);
    const monthFolder = joinDiskPath(trashRoot, monthName);
    emitJournalOperationProgress(operationId, 'folder', `Подготавливаем папку ${YANDEX_TRASH_DIR}/${monthName}…`, 30, 'running', { sourcePath, monthFolder });
    await ensureYandexFolderTree(monthFolder, operationId, operationContext);

    const currentName = current?.name ? normalizeYandexItemNameFromApi(current.name) : String(entry?.filename || 'WebClip.pdf');
    const alreadyInTrash = normalizeDiskPath(sourcePath).startsWith(`${normalizeDiskPath(trashRoot)}/`);
    const targetPath = alreadyInTrash ? sourcePath : await chooseYandexTrashTarget(monthFolder, currentName, deletionDate, operationId, operationContext);

    const detachedReceipt = await checkpointPendingTrashMoveIntent(entry, {
      sourcePath,
      targetPath,
      sourceResourceId: identityReceipt.resourceId,
      sourcePublicUrl: identityReceipt.publicUrl,
      remoteIdentityReceipt: identityReceipt,
      operationId,
      journalAuthority
    });
    detachedReceiptId = detachedReceipt.id;

    emitJournalOperationProgress(operationId, 'move', alreadyInTrash ? 'Файл уже находится в Trash. Повторное перемещение не требуется…' : 'Перемещаем файл в папку Trash…', 55, 'running', { sourcePath, targetPath });
    if (!alreadyInTrash && normalizeDiskPath(sourcePath) !== normalizeDiskPath(targetPath)) {
      await revalidateYandexDestructiveReceipt(identityReceipt, operationContext, operationId);
      await markPendingDestructiveMoveAdmitted(detachedReceiptId);
      moveAdmitted = true;
      await yandexApi('/resources/move', {
        method: 'POST',
        query: { from: sourcePath, path: targetPath, overwrite: 'false', force_async: 'false' },
        timeoutMs: 15_000,
        operationId,
        operationContext
      });
    }

    emitJournalOperationProgress(operationId, 'verify', 'Проверяем результат перемещения на Яндекс Диске…', 78, 'running', { targetPath });
    let moved = null;
    const verifyDeadline = Date.now() + 45_000;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      let remaining = verifyDeadline - Date.now();
      if (remaining <= 500) break;
      if (attempt) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(250 * attempt, Math.max(0, remaining - 500))));
        remaining = verifyDeadline - Date.now();
        if (remaining <= 500) break;
      }
      try {
        moved = await yandexApi('/resources', {
          method: 'GET',
          query: { path: targetPath, fields: 'name,path,type,size,public_url,resource_id' },
          timeoutMs: Math.max(1_000, Math.min(8_000, remaining)),
          operationId,
          retryAttempt: attempt,
          operationContext
        });
        if (moved?.type === 'file') break;
      } catch (error) {
        if (Number(error?.status) !== 404) throw error;
      }
    }
    if (moved?.type !== 'file') {
      const error = new Error('Яндекс Диск не подтвердил перемещение файла в Trash за 45 с. Detached recovery receipt сохранён после remote admission.');
      error.code = 'YANDEX_TIMEOUT';
      throw error;
    }
    const movedResourceId = moved?.resource_id ? normalizeYandexResourceIdFromApi(moved.resource_id) : '';
    if (!movedResourceId || movedResourceId !== identityReceipt.resourceId) {
      const error = new Error('Яндекс Диск подтвердил target path, но exact resource_id не совпал с destructive receipt.');
      error.code = 'WEBCLIP_REMOTE_IDENTITY_MOVE_OUTCOME_CONFLICT';
      throw error;
    }

    const trashPath = moved?.path ? normalizeYandexDiskPathFromApi(moved.path) : targetPath;
    const resourceId = movedResourceId;
    await markPendingDestructiveMoveVerified(detachedReceiptId, {
      remotePath: trashPath,
      resourceId,
      filename: moved?.name ? normalizeYandexItemNameFromApi(moved.name) : currentName,
      folder: monthFolder,
      publicUrl: moved?.public_url ? normalizeYandexPublicUrlFromApi(moved.public_url) : String(identityReceipt.publicUrl || '')
    });
    return {
      sourcePath,
      trashPath,
      trashMonth: monthName,
      resourceId,
      detachedReceiptId
    };
  } catch (error) {
    if (detachedReceiptId) {
      if (moveAdmitted) {
        await markPendingDestructiveMoveFailure(detachedReceiptId, error).catch(() => {});
        activeDestructiveMoveReceipts.delete(detachedReceiptId);
      } else {
        await removePendingDestructiveMove(detachedReceiptId).catch(() => {});
      }
    }
    throw error;
  }
}

function makePendingDestructiveMoveId(kind = 'move') {
  const suffix = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `destructive:${String(kind || 'move').slice(0, 32)}:${suffix}`.slice(0, 220);
}

function normalizePublicationRevokeCompletionAction(value = '') {
  const action = String(value || '').trim();
  if (!action) return PUBLICATION_REVOKE_COMPLETION_CLEAR;
  if ([
    PUBLICATION_REVOKE_COMPLETION_CLEAR,
    PUBLICATION_REVOKE_COMPLETION_DELETE_KEEP,
    'delete-journal-trash-file'
  ].includes(action)) return action;
  return '';
}

function pendingDestructiveMoveResetDisposition(item = {}) {
  const phase = String(item.phase || '');
  return ['admitted-unknown', 'revoke-admitted-unknown', 'move-admitted-unknown', 'manual-resolution'].includes(phase)
    ? 'preserve'
    : 'drop';
}

function pendingDestructiveMoveMatchesJournalResetScope(item = {}, { urlKey = '', siteKey = '' } = {}) {
  if (!urlKey && !siteKey) return true;
  return Boolean(
    (urlKey && String(item.sourceUrlKey || '') === urlKey) ||
    (siteKey && String(item.sourceSiteKey || '') === siteKey)
  );
}

function markPendingDestructiveMoveSupersededByJournalReset(item = {}, { scope = 'all', resetAt = Date.now() } = {}) {
  return {
    ...item,
    supersededByJournalReset: true,
    journalResetAt: Math.max(0, Number(resetAt) || Date.now()),
    journalResetScope: String(scope || 'all').slice(0, 24),
    updatedAt: Math.max(0, Number(resetAt) || Date.now())
  };
}

function reconcilePendingDestructiveMoveStoreForJournalReset(
  destructiveStore,
  { urlKey = '', siteKey = '', scope = 'all', resetAt = Date.now(), fail = () => {} } = {}
) {
  const request = destructiveStore.openCursor();
  request.onsuccess = () => {
    try {
      const cursor = request.result;
      if (!cursor) return;
      const item = cursor.value || {};
      if (pendingDestructiveMoveMatchesJournalResetScope(item, { urlKey, siteKey })) {
        if (pendingDestructiveMoveResetDisposition(item) === 'preserve') {
          cursor.update(markPendingDestructiveMoveSupersededByJournalReset(item, { scope, resetAt }));
        } else {
          cursor.delete();
        }
      }
      cursor.continue();
    } catch (error) { fail(error); }
  };
  request.onerror = () => fail(request.error || new Error('Не удалось reconcile destructive-move receipts при сбросе журнала.'));
  return request;
}

function pendingDestructiveMoveEntryMatches(receipt = {}, entry = {}) {
  if (!receipt || !entry) return false;
  if (String(entry.id || '') !== String(receipt.sourceJournalEntryId || '')) return false;
  const sourceCreatedAt = Math.max(0, Number(receipt.sourceJournalCreatedAt) || 0);
  if (sourceCreatedAt && Number(entry.createdAt || 0) !== sourceCreatedAt) return false;
  const sourceResourceId = String(receipt.sourceResourceId || '');
  if (sourceResourceId && String(entry.resourceId || '') && String(entry.resourceId || '') !== sourceResourceId) return false;
  return entry.destination === 'yandex';
}

function pendingDestructiveMoveJournalAuthorityToken(receipt = {}) {
  return normalizeJournalEntryAuthorityToken({
    entryId: receipt.sourceJournalEntryId,
    resetGeneration: receipt.sourceJournalResetGeneration,
    entryRevision: receipt.sourceJournalEntryRevision
  });
}

function pendingDestructiveMoveJournalAuthorityMatches(receipt = {}, resetGeneration, entry = {}) {
  if (!pendingDestructiveMoveEntryMatches(receipt, entry)) return false;
  const token = pendingDestructiveMoveJournalAuthorityToken(receipt);
  // P0-076: local Journal mutation requires exact generation+revision authority.
  // Legacy receipts without this cursor retain remote evidence but cannot mutate
  // current Journal state automatically.
  return Boolean(token && journalEntryAuthorityMatches(resetGeneration, entry, token));
}

function pendingDestructiveMoveAdvanceJournalAuthority(receipt = {}, resetGeneration, entry = {}) {
  const token = journalEntryAuthorityToken(resetGeneration, entry);
  if (!token) return receipt;
  return {
    ...receipt,
    sourceJournalResetGeneration: token.resetGeneration,
    sourceJournalEntryRevision: token.entryRevision
  };
}

const PENDING_DESTRUCTIVE_REMOTE_IDENTITY_SCHEMA_VERSION = 1;

function pendingDestructiveMoveRemoteIdentityStatus(item = {}, { requireTerminal = false } = {}) {
  const invalid = (reason) => Object.freeze({ ok: false, reason: String(reason || 'invalid-remote-identity') });
  if (!item || typeof item !== 'object') return invalid('missing-receipt');
  if (Number(item.remoteIdentitySchemaVersion) !== PENDING_DESTRUCTIVE_REMOTE_IDENTITY_SCHEMA_VERSION) return invalid('unsupported-schema');
  if (item.remoteIdentityAuthority !== WebClipYandexRemoteIdentityAuthority.AUTHORITY) return invalid('missing-provider-authority');

  const operationId = String(item.operationId || '').trim();
  const remoteIdentityOperationId = String(item.remoteIdentityOperationId || '').trim();
  const accountUid = String(item.accountUid || '').trim();
  const rootPath = normalizeDiskPath(item.rootPath || '');
  const sourcePath = normalizeDiskPath(item.sourcePath || '');
  const targetPath = normalizeDiskPath(item.targetPath || '');
  const sourceResourceId = String(item.sourceResourceId || '').trim();
  const observedAt = Number(item.remoteIdentityObservedAt);
  const contextCapturedAt = Number(item.remoteIdentityContextCapturedAt);
  const sourceProvenance = String(item.sourceIdentityProvenance || '');
  const allowedProvenance = new Set([
    WebClipYandexRemoteIdentityAuthority.PROVIDER_VERIFIED,
    WebClipYandexRemoteIdentityAuthority.IMPORTED_UNVERIFIED,
    WebClipYandexRemoteIdentityAuthority.LEGACY_UNVERIFIED
  ]);

  if (!operationId || remoteIdentityOperationId !== operationId) return invalid('operation-mismatch');
  if (!accountUid || !rootPath) return invalid('missing-context');
  if (!sourcePath || !targetPath || !sourceResourceId) return invalid('missing-object-identity');
  if (!isDiskPathInside(sourcePath, rootPath) || !isDiskPathInside(targetPath, rootPath)) return invalid('path-outside-root');
  if (item.kind === 'publication-revoke' && targetPath !== sourcePath) return invalid('publication-path-retarget');
  if (item.kind === 'publication-revoke-trash' && !targetPath) return invalid('publication-trash-target-missing');
  if (!Number.isFinite(observedAt) || observedAt <= 0 || !Number.isFinite(contextCapturedAt) || contextCapturedAt <= 0) return invalid('invalid-observation-generation');
  if (!allowedProvenance.has(sourceProvenance)) return invalid('invalid-source-provenance');

  if (requireTerminal) {
    const verifiedPath = normalizeDiskPath(item.verifiedPath || '');
    const verifiedResourceId = String(item.verifiedResourceId || '').trim();
    const verifiedAt = Number(item.verifiedAt);
    if (String(item.phase || '') !== 'remote-verified') return invalid('terminal-phase-required');
    if (!verifiedPath || verifiedPath !== targetPath) return invalid('terminal-path-mismatch');
    if (!verifiedResourceId || verifiedResourceId !== sourceResourceId) return invalid('terminal-resource-mismatch');
    if (!Number.isFinite(verifiedAt) || verifiedAt <= 0) return invalid('terminal-observation-invalid');
    if (['publication-revoke-trash', 'publication-revoke'].includes(item.kind)
      && String(item.verifiedPublicUrl || '').trim()) return invalid('publication-still-public');
  }

  return Object.freeze({
    ok: true,
    reason: '',
    operationId,
    accountUid,
    rootPath,
    sourcePath,
    targetPath,
    sourceResourceId,
    observedAt,
    contextCapturedAt,
    sourceProvenance
  });
}

function pendingDestructiveMoveRemoteIdentityFields(remoteIdentityReceipt, {
  sourcePath = '',
  targetPath = '',
  sourceResourceId = '',
  operationId = ''
} = {}) {
  const fields = {
    remoteIdentitySchemaVersion: PENDING_DESTRUCTIVE_REMOTE_IDENTITY_SCHEMA_VERSION,
    remoteIdentityAuthority: String(remoteIdentityReceipt?.authority || ''),
    remoteIdentityOperationId: String(remoteIdentityReceipt?.operationId || '').slice(0, MAX_OPERATION_ID_CHARS),
    remoteIdentityObservedAt: Math.max(0, Number(remoteIdentityReceipt?.observedAt) || 0),
    remoteIdentityContextCapturedAt: Math.max(0, Number(remoteIdentityReceipt?.contextCapturedAt) || 0),
    sourceIdentityProvenance: String(remoteIdentityReceipt?.sourceProvenance || ''),
    accountUid: String(remoteIdentityReceipt?.accountUid || '').slice(0, MAX_YANDEX_ACCOUNT_FIELD_CHARS),
    rootPath: normalizeDiskPath(remoteIdentityReceipt?.rootPath || '')
  };
  const status = pendingDestructiveMoveRemoteIdentityStatus({
    ...fields,
    operationId: String(operationId || '').slice(0, MAX_OPERATION_ID_CHARS),
    sourcePath: normalizeDiskPath(sourcePath || ''),
    targetPath: normalizeDiskPath(targetPath || ''),
    sourceResourceId: String(sourceResourceId || '').slice(0, MAX_YANDEX_RESOURCE_ID_CHARS)
  });
  if (!status.ok) {
    const error = new Error(`Destructive-move receipt не получил exact provider-observed durable identity binding: ${status.reason}.`);
    error.code = 'WEBCLIP_REMOTE_IDENTITY_DURABLE_BINDING_INVALID';
    throw error;
  }
  return Object.freeze(fields);
}

async function checkpointPendingReadMoveIntent(entry, {
  sourcePath = '',
  targetPath = '',
  sourceResourceId = '',
  sourcePublicUrl = '',
  remoteIdentityReceipt = null,
  operationId = '',
  journalAuthority = null
} = {}) {
  const sourceJournalAuthority = normalizeJournalEntryAuthorityToken(journalAuthority);
  if (normalizeDiskPath(remoteIdentityReceipt?.path || '') !== normalizeDiskPath(sourcePath || '')
    || String(remoteIdentityReceipt?.resourceId || '') !== String(sourceResourceId || '')) {
    const error = new Error('Destructive read-move receipt требует exact provider-observed remote identity receipt.');
    error.code = 'WEBCLIP_REMOTE_IDENTITY_RECEIPT_REQUIRED';
    throw error;
  }
  const remoteIdentityFields = pendingDestructiveMoveRemoteIdentityFields(remoteIdentityReceipt, {
    sourcePath,
    targetPath,
    sourceResourceId,
    operationId
  });
  const now = Date.now();
  const item = {
    id: makePendingDestructiveMoveId('read-move'),
    kind: 'read-move',
    phase: 'prepared',
    createdAt: now,
    updatedAt: now,
    operationId: String(operationId || '').slice(0, 180),
    sourceJournalEntryId: String(entry?.id || '').slice(0, MAX_IMPORTED_ENTRY_ID_CHARS),
    sourceJournalCreatedAt: Math.max(0, Number(entry?.createdAt) || 0),
    sourceJournalResetGeneration: sourceJournalAuthority?.resetGeneration || 0,
    sourceJournalEntryRevision: sourceJournalAuthority?.entryRevision || 0,
    sourceUrlKey: normalizeJournalUrl(entry?.url || ''),
    sourceSiteKey: getJournalSiteKey(entry?.url || entry?.hostname || ''),
    sourcePath: normalizeDiskPath(sourcePath || ''),
    targetPath: normalizeDiskPath(targetPath || ''),
    sourceResourceId: String(sourceResourceId || entry?.resourceId || '').slice(0, MAX_YANDEX_RESOURCE_ID_CHARS),
    sourcePublicUrl: String(sourcePublicUrl || entry?.publicUrl || '').slice(0, MAX_YANDEX_PUBLIC_URL_CHARS),
    ...remoteIdentityFields,
    lastError: ''
  };
  if (!item.sourceJournalEntryId || !item.sourcePath || !item.targetPath) {
    throw new Error('Destructive read-move receipt требует exact source Journal id/source/target.');
  }
  if (!sourceJournalAuthority || sourceJournalAuthority.entryId !== item.sourceJournalEntryId) {
    const error = new Error('Destructive read-move receipt требует exact P0-076 Journal authority.');
    error.code = 'WEBCLIP_DESTRUCTIVE_MOVE_JOURNAL_AUTHORITY_INVALID';
    throw error;
  }
  const db = await openJournalDb();
  try {
    await runIndexedDbTransactionBounded(
      db,
      [JOURNAL_PENDING_DESTRUCTIVE_STORE, JOURNAL_STORE, JOURNAL_META_STORE],
      'readwrite',
      'Создание destructive-move receipt',
      ({ tx, fail }) => {
        const pending = tx.objectStore(JOURNAL_PENDING_DESTRUCTIVE_STORE);
        const entries = tx.objectStore(JOURNAL_STORE);
        const meta = tx.objectStore(JOURNAL_META_STORE);
        let queueReady = false;
        let entryReady = false;
        let generationReady = false;
        let current = null;
        let resetGeneration = JOURNAL_INITIAL_RESET_GENERATION;
        let added = false;
        const maybeAdd = () => {
          if (added || !queueReady || !entryReady || !generationReady) return;
          if (!pendingDestructiveMoveJournalAuthorityMatches(item, resetGeneration, current)) {
            const error = new Error('Journal authority устарела до создания destructive read-move receipt.');
            error.code = 'WEBCLIP_DESTRUCTIVE_MOVE_JOURNAL_AUTHORITY_STALE_BEFORE_RECEIPT';
            fail(error);
            return;
          }
          added = true;
          pending.add(item);
        };
        let count = 0;
        const cursorReq = pending.openCursor();
        cursorReq.onsuccess = () => {
          try {
            const cursor = cursorReq.result;
            if (cursor) {
              count += 1;
              const existing = cursor.value || {};
              if (['publication-revoke', 'publication-revoke-trash'].includes(existing.kind)
                && String(existing.sourceJournalEntryId || '') === item.sourceJournalEntryId) {
                const error = new Error('Для этой записи уже существует незавершённый publication-revoke receipt. Сначала дождитесь reconciliation или выполните ручное решение.');
                error.code = 'WEBCLIP_PUBLICATION_REVOKE_ALREADY_PENDING';
                fail(error);
                return;
              }
              if (count >= MAX_PENDING_DESTRUCTIVE_MOVES) {
                fail(new Error('Слишком много незавершённых destructive-move receipts. Требуется reconciliation/manual resolution.'));
                return;
              }
              cursor.continue();
              return;
            }
            queueReady = true;
            maybeAdd();
          } catch (error) { fail(error); }
        };
        cursorReq.onerror = () => fail(cursorReq.error || new Error('Не удалось проверить очередь destructive-move receipts.'));
        const entryReq = entries.get(item.sourceJournalEntryId);
        entryReq.onsuccess = () => { current = entryReq.result || null; entryReady = true; maybeAdd(); };
        entryReq.onerror = () => fail(entryReq.error || new Error('Не удалось проверить Journal row перед destructive read-move receipt.'));
        const generationReq = meta.get(JOURNAL_RESET_GENERATION_KEY);
        generationReq.onsuccess = () => { resetGeneration = normalizeJournalResetGeneration(generationReq.result?.value); generationReady = true; maybeAdd(); };
        generationReq.onerror = () => fail(generationReq.error || new Error('Не удалось проверить Journal generation перед destructive read-move receipt.'));
      },
      RECOVERY_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
  activeDestructiveMoveReceipts.add(item.id);
  return item;
}

async function checkpointPendingTrashMoveIntent(entry, {
  sourcePath = '',
  targetPath = '',
  sourceResourceId = '',
  sourcePublicUrl = '',
  remoteIdentityReceipt = null,
  operationId = '',
  journalAuthority = null
} = {}) {
  const sourceJournalAuthority = normalizeJournalEntryAuthorityToken(journalAuthority);
  if (normalizeDiskPath(remoteIdentityReceipt?.path || '') !== normalizeDiskPath(sourcePath || '')
    || String(remoteIdentityReceipt?.resourceId || '') !== String(sourceResourceId || '')) {
    const error = new Error('Destructive trash-move receipt требует exact provider-observed remote identity receipt.');
    error.code = 'WEBCLIP_REMOTE_IDENTITY_RECEIPT_REQUIRED';
    throw error;
  }
  const remoteIdentityFields = pendingDestructiveMoveRemoteIdentityFields(remoteIdentityReceipt, {
    sourcePath,
    targetPath,
    sourceResourceId,
    operationId
  });
  const now = Date.now();
  const item = {
    id: makePendingDestructiveMoveId('trash-move'),
    kind: 'trash-move',
    phase: 'prepared',
    createdAt: now,
    updatedAt: now,
    operationId: String(operationId || '').slice(0, 180),
    sourceJournalEntryId: String(entry?.id || '').slice(0, MAX_IMPORTED_ENTRY_ID_CHARS),
    sourceJournalCreatedAt: Math.max(0, Number(entry?.createdAt) || 0),
    sourceJournalResetGeneration: sourceJournalAuthority?.resetGeneration || 0,
    sourceJournalEntryRevision: sourceJournalAuthority?.entryRevision || 0,
    sourceUrlKey: normalizeJournalUrl(entry?.url || ''),
    sourceSiteKey: getJournalSiteKey(entry?.url || entry?.hostname || ''),
    sourcePath: normalizeDiskPath(sourcePath || ''),
    targetPath: normalizeDiskPath(targetPath || ''),
    sourceResourceId: String(sourceResourceId || entry?.resourceId || '').slice(0, MAX_YANDEX_RESOURCE_ID_CHARS),
    sourcePublicUrl: String(sourcePublicUrl || entry?.publicUrl || '').slice(0, MAX_YANDEX_PUBLIC_URL_CHARS),
    ...remoteIdentityFields,
    lastError: ''
  };
  if (!item.sourceJournalEntryId || !item.sourcePath || !item.targetPath) {
    throw new Error('Destructive trash-move receipt требует exact source Journal id/source/target.');
  }
  if (!sourceJournalAuthority || sourceJournalAuthority.entryId !== item.sourceJournalEntryId) {
    const error = new Error('Destructive trash-move receipt требует exact P0-076 Journal authority.');
    error.code = 'WEBCLIP_DESTRUCTIVE_MOVE_JOURNAL_AUTHORITY_INVALID';
    throw error;
  }
  const db = await openJournalDb();
  try {
    await runIndexedDbTransactionBounded(
      db,
      [JOURNAL_PENDING_DESTRUCTIVE_STORE, JOURNAL_STORE, JOURNAL_META_STORE],
      'readwrite',
      'Создание Trash destructive-move receipt',
      ({ tx, fail }) => {
        const pending = tx.objectStore(JOURNAL_PENDING_DESTRUCTIVE_STORE);
        const entries = tx.objectStore(JOURNAL_STORE);
        const meta = tx.objectStore(JOURNAL_META_STORE);
        let queueReady = false;
        let entryReady = false;
        let generationReady = false;
        let current = null;
        let resetGeneration = JOURNAL_INITIAL_RESET_GENERATION;
        let added = false;
        const maybeAdd = () => {
          if (added || !queueReady || !entryReady || !generationReady) return;
          if (!pendingDestructiveMoveJournalAuthorityMatches(item, resetGeneration, current)) {
            const error = new Error('Journal authority устарела до создания destructive Trash receipt.');
            error.code = 'WEBCLIP_DESTRUCTIVE_MOVE_JOURNAL_AUTHORITY_STALE_BEFORE_RECEIPT';
            fail(error);
            return;
          }
          added = true;
          pending.add(item);
        };
        let count = 0;
        const cursorReq = pending.openCursor();
        cursorReq.onsuccess = () => {
          try {
            const cursor = cursorReq.result;
            if (cursor) {
              count += 1;
              const existing = cursor.value || {};
              if (['publication-revoke', 'publication-revoke-trash'].includes(existing.kind)
                && String(existing.sourceJournalEntryId || '') === item.sourceJournalEntryId) {
                const error = new Error('Для этой записи уже существует незавершённый publication-revoke receipt. Перемещение в Trash пока запрещено.');
                error.code = 'WEBCLIP_PUBLICATION_REVOKE_ALREADY_PENDING';
                fail(error);
                return;
              }
              if (count >= MAX_PENDING_DESTRUCTIVE_MOVES) {
                fail(new Error('Слишком много незавершённых destructive-move receipts. Требуется reconciliation/manual resolution.'));
                return;
              }
              cursor.continue();
              return;
            }
            queueReady = true;
            maybeAdd();
          } catch (error) { fail(error); }
        };
        cursorReq.onerror = () => fail(cursorReq.error || new Error('Не удалось проверить очередь Trash destructive-move receipts.'));
        const entryReq = entries.get(item.sourceJournalEntryId);
        entryReq.onsuccess = () => { current = entryReq.result || null; entryReady = true; maybeAdd(); };
        entryReq.onerror = () => fail(entryReq.error || new Error('Не удалось проверить Journal row перед destructive Trash receipt.'));
        const generationReq = meta.get(JOURNAL_RESET_GENERATION_KEY);
        generationReq.onsuccess = () => { resetGeneration = normalizeJournalResetGeneration(generationReq.result?.value); generationReady = true; maybeAdd(); };
        generationReq.onerror = () => fail(generationReq.error || new Error('Не удалось проверить Journal generation перед destructive Trash receipt.'));
      },
      RECOVERY_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
  activeDestructiveMoveReceipts.add(item.id);
  return item;
}

async function checkpointPendingPublicationRevokeIntent(entry, {
  sourcePath = '',
  targetPath = '',
  trashMonth = '',
  sourceResourceId = '',
  sourcePublicUrl = '',
  remoteIdentityReceipt = null,
  operationId = '',
  journalAuthority = null,
  completionAction = PUBLICATION_REVOKE_COMPLETION_CLEAR
} = {}) {
  const sourceJournalAuthority = normalizeJournalEntryAuthorityToken(journalAuthority);
  const normalizedSourcePath = normalizeDiskPath(sourcePath || '');
  const normalizedPublicUrl = String(sourcePublicUrl || '').trim();
  const normalizedCompletionAction = normalizePublicationRevokeCompletionAction(completionAction);
  const compositeTrash = normalizedCompletionAction === PUBLICATION_REVOKE_COMPLETION_DELETE_TRASH;
  const normalizedTargetPath = compositeTrash ? normalizeDiskPath(targetPath || '') : normalizedSourcePath;
  if (!normalizedCompletionAction) {
    const error = new Error('Publication-revoke receipt получил неподдерживаемое локальное завершение.');
    error.code = 'WEBCLIP_PUBLICATION_REVOKE_COMPLETION_INVALID';
    throw error;
  }
  if (normalizeDiskPath(remoteIdentityReceipt?.path || '') !== normalizedSourcePath
    || String(remoteIdentityReceipt?.resourceId || '') !== String(sourceResourceId || '')
    || String(remoteIdentityReceipt?.publicUrl || '') !== normalizedPublicUrl) {
    const error = new Error('Publication-revoke receipt требует exact provider-observed path/resource_id/public_url.');
    error.code = 'WEBCLIP_PUBLICATION_REVOKE_IDENTITY_RECEIPT_REQUIRED';
    throw error;
  }
  if (!normalizedPublicUrl) {
    const error = new Error('Publication-revoke receipt нельзя создать без подтверждённой текущей публичной ссылки.');
    error.code = 'WEBCLIP_PUBLICATION_REVOKE_PUBLIC_URL_REQUIRED';
    throw error;
  }
  const remoteIdentityFields = pendingDestructiveMoveRemoteIdentityFields(remoteIdentityReceipt, {
    sourcePath: normalizedSourcePath,
    targetPath: normalizedTargetPath,
    sourceResourceId,
    operationId
  });
  const now = Date.now();
  const item = {
    id: makePendingDestructiveMoveId(compositeTrash ? 'publication-revoke-trash' : 'publication-revoke'),
    kind: compositeTrash ? 'publication-revoke-trash' : 'publication-revoke',
    phase: 'prepared',
    createdAt: now,
    updatedAt: now,
    operationId: String(operationId || '').slice(0, MAX_OPERATION_ID_CHARS),
    sourceJournalEntryId: String(entry?.id || '').slice(0, MAX_IMPORTED_ENTRY_ID_CHARS),
    sourceJournalCreatedAt: Math.max(0, Number(entry?.createdAt) || 0),
    sourceJournalResetGeneration: sourceJournalAuthority?.resetGeneration || 0,
    sourceJournalEntryRevision: sourceJournalAuthority?.entryRevision || 0,
    sourceUrlKey: normalizeJournalUrl(entry?.url || ''),
    sourceSiteKey: getJournalSiteKey(entry?.url || entry?.hostname || ''),
    sourcePath: normalizedSourcePath,
    targetPath: normalizedTargetPath,
    trashMonth: compositeTrash ? String(trashMonth || '').slice(0, 32) : '',
    sourceResourceId: String(sourceResourceId || '').slice(0, MAX_YANDEX_RESOURCE_ID_CHARS),
    sourcePublicUrl: normalizedPublicUrl.slice(0, MAX_YANDEX_PUBLIC_URL_CHARS),
    requestedPublicationOutcome: 'private',
    completionAction: normalizedCompletionAction,
    ...remoteIdentityFields,
    lastError: ''
  };
  if (!item.sourceJournalEntryId || !item.sourcePath || !item.targetPath || !item.sourceResourceId) {
    throw new Error('Publication-revoke receipt требует exact Journal id/path/resource_id.');
  }
  if (!sourceJournalAuthority || sourceJournalAuthority.entryId !== item.sourceJournalEntryId) {
    const error = new Error('Publication-revoke receipt требует exact P0-076 Journal authority.');
    error.code = 'WEBCLIP_PUBLICATION_REVOKE_JOURNAL_AUTHORITY_INVALID';
    throw error;
  }
  const db = await openJournalDb();
  try {
    await runIndexedDbTransactionBounded(
      db,
      [JOURNAL_PENDING_DESTRUCTIVE_STORE, JOURNAL_STORE, JOURNAL_META_STORE],
      'readwrite',
      compositeTrash ? 'Создание composite publication-revoke+Trash receipt' : 'Создание publication-revoke receipt',
      ({ tx, fail }) => {
        const pending = tx.objectStore(JOURNAL_PENDING_DESTRUCTIVE_STORE);
        const entries = tx.objectStore(JOURNAL_STORE);
        const meta = tx.objectStore(JOURNAL_META_STORE);
        let queueReady = false;
        let entryReady = false;
        let generationReady = false;
        let current = null;
        let resetGeneration = JOURNAL_INITIAL_RESET_GENERATION;
        let added = false;
        const maybeAdd = () => {
          if (added || !queueReady || !entryReady || !generationReady) return;
          if (!pendingDestructiveMoveJournalAuthorityMatches(item, resetGeneration, current)
            || String(current?.publicUrl || '').trim() !== item.sourcePublicUrl) {
            const error = new Error('Journal authority/public_url устарели до создания publication-revoke receipt.');
            error.code = 'WEBCLIP_PUBLICATION_REVOKE_JOURNAL_AUTHORITY_STALE_BEFORE_RECEIPT';
            fail(error);
            return;
          }
          added = true;
          pending.add(item);
        };
        let count = 0;
        const cursorReq = pending.openCursor();
        cursorReq.onsuccess = () => {
          try {
            const cursor = cursorReq.result;
            if (cursor) {
              count += 1;
              const existing = cursor.value || {};
              if (['read-move', 'trash-move', 'publication-revoke', 'publication-revoke-trash'].includes(existing.kind)
                && String(existing.sourceJournalEntryId || '') === item.sourceJournalEntryId) {
                const error = new Error('Для этой записи уже существует незавершённый remote destructive receipt. Новый publication revoke запрещён до reconciliation/manual resolution.');
                error.code = 'WEBCLIP_PUBLICATION_REVOKE_ALREADY_PENDING';
                fail(error);
                return;
              }
              if (count >= MAX_PENDING_DESTRUCTIVE_MOVES) {
                fail(new Error('Слишком много незавершённых destructive receipts. Требуется reconciliation/manual resolution.'));
                return;
              }
              cursor.continue();
              return;
            }
            queueReady = true;
            maybeAdd();
          } catch (error) { fail(error); }
        };
        cursorReq.onerror = () => fail(cursorReq.error || new Error('Не удалось проверить очередь publication-revoke receipts.'));
        const entryReq = entries.get(item.sourceJournalEntryId);
        entryReq.onsuccess = () => { current = entryReq.result || null; entryReady = true; maybeAdd(); };
        entryReq.onerror = () => fail(entryReq.error || new Error('Не удалось проверить Journal row перед publication-revoke receipt.'));
        const generationReq = meta.get(JOURNAL_RESET_GENERATION_KEY);
        generationReq.onsuccess = () => { resetGeneration = normalizeJournalResetGeneration(generationReq.result?.value); generationReady = true; maybeAdd(); };
        generationReq.onerror = () => fail(generationReq.error || new Error('Не удалось проверить Journal generation перед publication-revoke receipt.'));
      },
      RECOVERY_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
  activeDestructiveMoveReceipts.add(item.id);
  return item;
}

async function markPendingPublicationRevokeTrashPhase(id, expectedPhase, nextPhase, patch = {}) {
  const key = String(id || '');
  const expected = String(expectedPhase || '');
  const nextValue = String(nextPhase || '');
  const db = await openJournalDb();
  try {
    return await runIndexedDbTransactionBounded(
      db,
      JOURNAL_PENDING_DESTRUCTIVE_STORE,
      'readwrite',
      'Фиксация observation phase composite revoke+Trash',
      ({ store, setResult, fail }) => {
        const pending = store();
        const request = pending.get(key);
        request.onsuccess = () => {
          try {
            const current = request.result;
            if (!current || current.kind !== 'publication-revoke-trash') {
              const error = new Error('Composite revoke+Trash receipt отсутствует при observation transition.');
              error.code = 'WEBCLIP_PUBLICATION_REVOKE_TRASH_RECEIPT_MISSING';
              fail(error);
              return;
            }
            if (current.phase !== expected) {
              const error = new Error(`Composite revoke+Trash receipt ожидал phase ${expected}, получен ${String(current.phase || '')}.`);
              error.code = 'WEBCLIP_PUBLICATION_REVOKE_TRASH_PHASE_INVALID';
              fail(error);
              return;
            }
            const remoteIdentityStatus = pendingDestructiveMoveRemoteIdentityStatus(current);
            if (!remoteIdentityStatus.ok) {
              const error = new Error(`Composite revoke+Trash identity binding недействителен: ${remoteIdentityStatus.reason}.`);
              error.code = 'WEBCLIP_REMOTE_IDENTITY_DURABLE_BINDING_INVALID';
              fail(error);
              return;
            }
            if (expected === 'revoke-admitted-unknown' && nextValue === 'revoke-verified') {
              if (normalizeDiskPath(patch.revokeVerifiedPath || '') !== normalizeDiskPath(current.sourcePath || '')
                || String(patch.revokeVerifiedResourceId || '') !== String(current.sourceResourceId || '')
                || String(patch.revokeVerifiedPublicUrl || '').trim()) {
                const error = new Error('Revoke verification не сохранила exact source identity/private outcome.');
                error.code = 'WEBCLIP_PUBLICATION_REVOKE_TRASH_REVOKE_BINDING_INVALID';
                fail(error);
                return;
              }
            } else {
              const error = new Error('Неподдерживаемый observation transition composite revoke+Trash.');
              error.code = 'WEBCLIP_PUBLICATION_REVOKE_TRASH_PHASE_INVALID';
              fail(error);
              return;
            }
            const updatedAt = Date.now();
            const next = { ...current, ...patch, phase: nextValue, updatedAt, lastError: '' };
            pending.put(next);
            setResult(next);
          } catch (error) { fail(error); }
        };
        request.onerror = () => fail(request.error || new Error('Не удалось прочитать composite revoke+Trash receipt.'));
      },
      RECOVERY_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
}

async function markPendingPublicationRevokeTrashRemoteAdmission(id, expectedPhase, nextPhase) {
  const key = String(id || '');
  const expected = String(expectedPhase || '');
  const nextValue = String(nextPhase || '');
  const allowed = (expected === 'prepared' && nextValue === 'revoke-admitted-unknown')
    || (expected === 'revoke-verified' && nextValue === 'move-admitted-unknown');
  if (!allowed) {
    const error = new Error('Неподдерживаемая remote admission composite revoke+Trash.');
    error.code = 'WEBCLIP_PUBLICATION_REVOKE_TRASH_ADMISSION_INVALID';
    throw error;
  }
  const db = await openJournalDb();
  try {
    return await runIndexedDbTransactionBounded(
      db,
      [JOURNAL_PENDING_DESTRUCTIVE_STORE, JOURNAL_STORE, JOURNAL_META_STORE],
      'readwrite',
      'Фиксация отдельной remote admission composite revoke+Trash',
      ({ tx, setResult, fail }) => {
        const pending = tx.objectStore(JOURNAL_PENDING_DESTRUCTIVE_STORE);
        const entries = tx.objectStore(JOURNAL_STORE);
        const meta = tx.objectStore(JOURNAL_META_STORE);
        const request = pending.get(key);
        request.onsuccess = () => {
          try {
            const current = request.result;
            if (!current || current.kind !== 'publication-revoke-trash') {
              const error = new Error('Composite revoke+Trash receipt исчез до remote admission.');
              error.code = 'WEBCLIP_PUBLICATION_REVOKE_TRASH_RECEIPT_MISSING';
              fail(error);
              return;
            }
            if (current.supersededByJournalReset === true) {
              const error = new Error('Composite revoke+Trash receipt superseded сбросом журнала до следующей remote admission.');
              error.code = 'WEBCLIP_DESTRUCTIVE_MOVE_RECEIPT_SUPERSEDED_BEFORE_ADMISSION';
              fail(error);
              return;
            }
            if (current.phase !== expected) {
              const error = new Error(`Composite revoke+Trash admission ожидал phase ${expected}, получен ${String(current.phase || '')}.`);
              error.code = 'WEBCLIP_PUBLICATION_REVOKE_TRASH_PHASE_INVALID';
              fail(error);
              return;
            }
            const remoteIdentityStatus = pendingDestructiveMoveRemoteIdentityStatus(current);
            if (!remoteIdentityStatus.ok) {
              const error = new Error(`Composite revoke+Trash identity binding устарел до admission: ${remoteIdentityStatus.reason}.`);
              error.code = 'WEBCLIP_REMOTE_IDENTITY_DURABLE_BINDING_INVALID';
              fail(error);
              return;
            }

            let entryReady = false;
            let generationReady = false;
            let journalEntry = null;
            let resetGeneration = JOURNAL_INITIAL_RESET_GENERATION;
            let compared = false;
            const compareAndAdmit = () => {
              if (compared || !entryReady || !generationReady) return;
              compared = true;
              if (!pendingDestructiveMoveJournalAuthorityMatches(current, resetGeneration, journalEntry)) {
                const error = new Error('Journal authority устарела до remote admission composite revoke+Trash.');
                error.code = 'WEBCLIP_DESTRUCTIVE_MOVE_JOURNAL_AUTHORITY_STALE_BEFORE_ADMISSION';
                fail(error);
                return;
              }
              const next = { ...current, phase: nextValue, updatedAt: Date.now(), lastError: '' };
              pending.put(next);
              setResult(next);
            };
            const entryReq = entries.get(current.sourceJournalEntryId);
            entryReq.onsuccess = () => { journalEntry = entryReq.result || null; entryReady = true; compareAndAdmit(); };
            entryReq.onerror = () => fail(entryReq.error || new Error('Не удалось проверить Journal row перед composite remote admission.'));
            const generationReq = meta.get(JOURNAL_RESET_GENERATION_KEY);
            generationReq.onsuccess = () => {
              resetGeneration = normalizeJournalResetGeneration(generationReq.result?.value);
              generationReady = true;
              compareAndAdmit();
            };
            generationReq.onerror = () => fail(generationReq.error || new Error('Не удалось проверить Journal generation перед composite remote admission.'));
          } catch (error) { fail(error); }
        };
        request.onerror = () => fail(request.error || new Error('Не удалось прочитать composite revoke+Trash receipt перед admission.'));
      },
      RECOVERY_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
}

async function markPendingDestructiveMoveAdmitted(id) {
  const key = String(id || '');
  const db = await openJournalDb();
  try {
    return await runIndexedDbTransactionBounded(
      db,
      [JOURNAL_PENDING_DESTRUCTIVE_STORE, JOURNAL_STORE, JOURNAL_META_STORE],
      'readwrite',
      'Фиксация admission destructive move',
      ({ tx, setResult, fail }) => {
        const pending = tx.objectStore(JOURNAL_PENDING_DESTRUCTIVE_STORE);
        const entries = tx.objectStore(JOURNAL_STORE);
        const meta = tx.objectStore(JOURNAL_META_STORE);
        const request = pending.get(key);
        request.onsuccess = () => {
          try {
            const current = request.result;
            if (!current || !['read-move', 'trash-move', 'publication-revoke'].includes(current.kind)) {
              const error = new Error('Destructive-move receipt исчез до admission.');
              error.code = 'WEBCLIP_DESTRUCTIVE_MOVE_RECEIPT_MISSING_BEFORE_ADMISSION';
              fail(error);
              return;
            }
            if (current.supersededByJournalReset === true) {
              const error = new Error('Destructive-move receipt superseded сбросом журнала до admission.');
              error.code = 'WEBCLIP_DESTRUCTIVE_MOVE_RECEIPT_SUPERSEDED_BEFORE_ADMISSION';
              fail(error);
              return;
            }
            if (current.phase === 'admitted-unknown') { setResult(current); return; }
            if (current.phase !== 'prepared') {
              const error = new Error('Destructive-move receipt имеет неизвестную admission phase.');
              error.code = 'WEBCLIP_DESTRUCTIVE_MOVE_RECEIPT_PHASE_INVALID';
              fail(error);
              return;
            }
            const remoteIdentityStatus = pendingDestructiveMoveRemoteIdentityStatus(current);
            if (!remoteIdentityStatus.ok) {
              const error = new Error(`Destructive-move durable identity binding устарел до admission: ${remoteIdentityStatus.reason}.`);
              error.code = 'WEBCLIP_REMOTE_IDENTITY_DURABLE_BINDING_INVALID';
              fail(error);
              return;
            }

            let entryReady = false;
            let generationReady = false;
            let journalEntry = null;
            let resetGeneration = JOURNAL_INITIAL_RESET_GENERATION;
            let compared = false;
            const compareAndAdmit = () => {
              if (compared || !entryReady || !generationReady) return;
              compared = true;
              if (!pendingDestructiveMoveJournalAuthorityMatches(current, resetGeneration, journalEntry)) {
                const error = new Error('Journal authority устарела до admission destructive move.');
                error.code = 'WEBCLIP_DESTRUCTIVE_MOVE_JOURNAL_AUTHORITY_STALE_BEFORE_ADMISSION';
                fail(error);
                return;
              }
              const next = { ...current, phase: 'admitted-unknown', updatedAt: Date.now() };
              pending.put(next);
              setResult(next);
            };
            const entryReq = entries.get(current.sourceJournalEntryId);
            entryReq.onsuccess = () => { journalEntry = entryReq.result || null; entryReady = true; compareAndAdmit(); };
            entryReq.onerror = () => fail(entryReq.error || new Error('Не удалось проверить Journal row перед destructive admission.'));
            const generationReq = meta.get(JOURNAL_RESET_GENERATION_KEY);
            generationReq.onsuccess = () => {
              resetGeneration = normalizeJournalResetGeneration(generationReq.result?.value);
              generationReady = true;
              compareAndAdmit();
            };
            generationReq.onerror = () => fail(generationReq.error || new Error('Не удалось проверить Journal generation перед destructive admission.'));
          } catch (error) { fail(error); }
        };
        request.onerror = () => fail(request.error || new Error('Не удалось прочитать destructive-move receipt перед admission.'));
      },
      RECOVERY_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
}

async function updateReadMoveJournalCheckpointFromReceipt(receiptId, patch = {}) {
  const key = String(receiptId || '');
  const db = await openJournalDb();
  try {
    return await runIndexedDbTransactionBounded(
      db,
      [JOURNAL_PENDING_DESTRUCTIVE_STORE, JOURNAL_STORE, JOURNAL_META_STORE],
      'readwrite',
      'Обновление read-move checkpoint по detached receipt',
      ({ tx, setResult, fail }) => {
        const receipts = tx.objectStore(JOURNAL_PENDING_DESTRUCTIVE_STORE);
        const entries = tx.objectStore(JOURNAL_STORE);
        const meta = tx.objectStore(JOURNAL_META_STORE);
        const request = receipts.get(key);
        request.onsuccess = () => {
          try {
            const receipt = request.result;
            if (!receipt || receipt.supersededByJournalReset === true) { setResult(null); return; }
            let entryReady = false;
            let generationReady = false;
            let current = null;
            let resetGeneration = JOURNAL_INITIAL_RESET_GENERATION;
            let compared = false;
            const compareAndWrite = () => {
              if (compared || !entryReady || !generationReady) return;
              compared = true;
              if (!pendingDestructiveMoveJournalAuthorityMatches(receipt, resetGeneration, current)) {
                setResult(null);
                return;
              }
              try {
                const updated = { ...current, ...patch, id: current.id, entryRevision: nextJournalEntryRevision(current.entryRevision) };
                const advancedReceipt = pendingDestructiveMoveAdvanceJournalAuthority(receipt, resetGeneration, updated);
                entries.put(updated);
                receipts.put({ ...advancedReceipt, updatedAt: Date.now() });
                touchJournalDbRevision(tx, 'read-move-checkpoint');
                setResult(updated);
              } catch (error) { fail(error); }
            };
            const entryReq = entries.get(receipt.sourceJournalEntryId);
            entryReq.onsuccess = () => { current = entryReq.result || null; entryReady = true; compareAndWrite(); };
            entryReq.onerror = () => fail(entryReq.error || new Error('Не удалось проверить Journal authority для read-move checkpoint.'));
            const generationReq = meta.get(JOURNAL_RESET_GENERATION_KEY);
            generationReq.onsuccess = () => {
              resetGeneration = normalizeJournalResetGeneration(generationReq.result?.value);
              generationReady = true;
              compareAndWrite();
            };
            generationReq.onerror = () => fail(generationReq.error || new Error('Не удалось проверить Journal generation для read-move checkpoint.'));
          } catch (error) { fail(error); }
        };
        request.onerror = () => fail(request.error || new Error('Не удалось прочитать detached read-move receipt.'));
      },
      JOURNAL_CRUD_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
}

async function markPendingDestructiveMoveVerified(id, outcome = {}) {
  const key = String(id || '');
  const db = await openJournalDb();
  try {
    return await runIndexedDbTransactionBounded(
      db,
      JOURNAL_PENDING_DESTRUCTIVE_STORE,
      'readwrite',
      'Фиксация verified destructive move',
      ({ store, setResult, fail }) => {
        const pending = store();
        const request = pending.get(key);
        request.onsuccess = () => {
          try {
            const current = request.result;
            if (!current) {
              const error = new Error('Destructive-move receipt отсутствует при terminal verification.');
              error.code = 'WEBCLIP_DESTRUCTIVE_MOVE_RECEIPT_MISSING_AT_VERIFY';
              fail(error);
              return;
            }
            const terminalInputAllowed = current.kind === 'publication-revoke-trash'
              ? ['revoke-verified', 'move-admitted-unknown'].includes(current.phase)
              : ['prepared', 'admitted-unknown'].includes(current.phase);
            if (!terminalInputAllowed) {
              const error = new Error('Destructive-move receipt имеет недопустимую phase при terminal verification.');
              error.code = 'WEBCLIP_DESTRUCTIVE_MOVE_RECEIPT_PHASE_INVALID_AT_VERIFY';
              fail(error);
              return;
            }
            const remoteIdentityStatus = pendingDestructiveMoveRemoteIdentityStatus(current);
            const verifiedPath = normalizeDiskPath(outcome.remotePath || current.targetPath || '');
            const verifiedResourceId = String(outcome.resourceId || '').slice(0, MAX_YANDEX_RESOURCE_ID_CHARS);
            if (!remoteIdentityStatus.ok
              || verifiedPath !== normalizeDiskPath(current.targetPath || '')
              || !verifiedResourceId
              || verifiedResourceId !== String(current.sourceResourceId || '')) {
              const error = new Error(`Terminal destructive outcome не сохраняет exact provider-observed identity: ${remoteIdentityStatus.reason || 'target/resource-mismatch'}.`);
              error.code = 'WEBCLIP_REMOTE_IDENTITY_TERMINAL_BINDING_CONFLICT';
              fail(error);
              return;
            }
            if (['publication-revoke-trash', 'publication-revoke'].includes(current.kind)
              && String(outcome.publicUrl || '').trim()) {
              const error = new Error('Publication revoke нельзя подтвердить, пока metadata всё ещё содержит public_url.');
              error.code = 'WEBCLIP_PUBLICATION_REVOKE_NOT_PRIVATE';
              fail(error);
              return;
            }
            const verifiedAt = Date.now();
            const next = {
              ...current,
              phase: 'remote-verified',
              updatedAt: verifiedAt,
              verifiedAt,
              verifiedPath,
              verifiedResourceId,
              verifiedFilename: String(outcome.filename || '').slice(0, MAX_YANDEX_ITEM_NAME_CHARS),
              verifiedFolder: normalizeDiskPath(outcome.folder || ''),
              verifiedPublicUrl: String(outcome.publicUrl || '').slice(0, MAX_YANDEX_PUBLIC_URL_CHARS),
              manualResolutionRequired: false,
              lastError: ''
            };
            pending.put(next);
            setResult(next);
          } catch (error) { fail(error); }
        };
        request.onerror = () => fail(request.error || new Error('Не удалось прочитать destructive-move receipt при verification.'));
      },
      RECOVERY_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
}

async function markPendingDestructiveMoveFailure(id, error) {
  const key = String(id || '');
  if (!key) return null;
  const db = await openJournalDb();
  try {
    return await runIndexedDbTransactionBounded(
      db,
      JOURNAL_PENDING_DESTRUCTIVE_STORE,
      'readwrite',
      'Фиксация ошибки destructive move',
      ({ store, setResult, fail }) => {
        const pending = store();
        const request = pending.get(key);
        request.onsuccess = () => {
          try {
            const current = request.result;
            if (!current) { setResult(null); return; }
            const next = { ...current, updatedAt: Date.now(), lastError: normalizeError(error).slice(0, 2000) };
            pending.put(next);
            setResult(next);
          } catch (e) { fail(e); }
        };
        request.onerror = () => fail(request.error || new Error('Не удалось обновить destructive-move receipt после ошибки.'));
      },
      RECOVERY_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
}

function pendingDestructiveMoveRecoveryDisposition(item = {}) {
  if (item?.manualResolutionRequired === true) return 'retain-manual';
  const phase = String(item.phase || '');
  if (phase === 'prepared') return 'drop-prepared';
  if (phase === 'admitted-unknown') return 'manual-resolution';
  if (phase === 'revoke-admitted-unknown' || phase === 'move-admitted-unknown') return 'manual-resolution';
  if (phase === 'revoke-verified') return 'manual-resolution';
  if (phase === 'remote-verified') return 'finalize-local';
  if (phase === 'manual-resolution') return 'retain-manual';
  return 'manual-resolution';
}

async function markPendingDestructiveMoveManualResolution(id, reason = '', trigger = 'maintenance') {
  const key = String(id || '');
  if (!key) return null;
  const db = await openJournalDb();
  try {
    return await runIndexedDbTransactionBounded(
      db,
      JOURNAL_PENDING_DESTRUCTIVE_STORE,
      'readwrite',
      'Фиксация manual-resolution destructive move',
      ({ store, setResult, fail }) => {
        const pending = store();
        const request = pending.get(key);
        request.onsuccess = () => {
          try {
            const current = request.result;
            if (!current) { setResult(null); return; }
            const terminalVerified = current.phase === 'remote-verified';
            const now = Date.now();
            const next = {
              ...current,
              phase: terminalVerified ? 'remote-verified' : 'manual-resolution',
              manualResolutionRequired: true,
              manualResolutionAt: Math.max(0, Number(current.manualResolutionAt) || 0) || now,
              manualResolutionTrigger: String(trigger || 'maintenance').slice(0, 80),
              updatedAt: now,
              lastError: String(reason || current.lastError || 'Destructive move requires manual resolution.').slice(0, 2000)
            };
            pending.put(next);
            setResult(next);
          } catch (error) { fail(error); }
        };
        request.onerror = () => fail(request.error || new Error('Не удалось сохранить manual-resolution destructive-move receipt.'));
      },
      RECOVERY_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
}

function pendingDestructiveMoveIsManual(item = {}) {
  return Boolean(
    item
    && typeof item === 'object'
    && (String(item.phase || '') === 'manual-resolution' || item.manualResolutionRequired === true)
  );
}

function pendingDestructiveMoveManualReceiptForUi(item = {}) {
  if (!pendingDestructiveMoveIsManual(item)) return null;
  const kind = String(item.kind || '');
  const remoteIdentity = pendingDestructiveMoveRemoteIdentityStatus(item, { requireTerminal: item.phase === 'remote-verified' });
  return Object.freeze({
    id: String(item.id || '').slice(0, MAX_IMPORTED_ENTRY_ID_CHARS),
    kind: ['read-move', 'trash-move', 'publication-revoke', 'publication-revoke-trash'].includes(kind) ? kind : 'unknown',
    phase: String(item.phase || '').slice(0, 40),
    operationId: String(item.operationId || '').slice(0, MAX_OPERATION_ID_CHARS),
    sourceJournalEntryId: String(item.sourceJournalEntryId || '').slice(0, MAX_IMPORTED_ENTRY_ID_CHARS),
    sourceJournalCreatedAt: Math.max(0, Number(item.sourceJournalCreatedAt) || 0),
    sourceSiteKey: String(item.sourceSiteKey || '').slice(0, 512),
    sourcePath: normalizeDiskPath(String(item.sourcePath || '').slice(0, MAX_IMPORTED_PATH_CHARS)),
    targetPath: normalizeDiskPath(String(item.targetPath || '').slice(0, MAX_IMPORTED_PATH_CHARS)),
    verifiedPath: normalizeDiskPath(String(item.verifiedPath || '').slice(0, MAX_IMPORTED_PATH_CHARS)),
    sourceResourceId: String(item.sourceResourceId || '').slice(0, MAX_YANDEX_RESOURCE_ID_CHARS),
    verifiedResourceId: String(item.verifiedResourceId || '').slice(0, MAX_YANDEX_RESOURCE_ID_CHARS),
    rootPath: normalizeDiskPath(String(item.rootPath || '').slice(0, MAX_IMPORTED_PATH_CHARS)),
    hasAccountBinding: Boolean(String(item.accountUid || '').trim()),
    hasProviderIdentityBinding: remoteIdentity.ok,
    remoteIdentityProblem: remoteIdentity.ok ? '' : remoteIdentity.reason,
    remoteIdentityObservedAt: Math.max(0, Number(item.remoteIdentityObservedAt) || 0),
    remoteIdentityContextCapturedAt: Math.max(0, Number(item.remoteIdentityContextCapturedAt) || 0),
    sourceIdentityProvenance: String(item.sourceIdentityProvenance || '').slice(0, 40),
    verifiedAt: Math.max(0, Number(item.verifiedAt) || 0),
    updatedAt: Math.max(0, Number(item.updatedAt) || 0),
    manualResolutionAt: Math.max(0, Number(item.manualResolutionAt) || 0),
    manualResolutionTrigger: String(item.manualResolutionTrigger || '').slice(0, 80),
    lastError: String(item.lastError || '').slice(0, 2000),
    supersededByJournalReset: item.supersededByJournalReset === true
  });
}

async function listPendingDestructiveManualReceipts(maxItems = PENDING_DESTRUCTIVE_MANUAL_LIST_MAX) {
  const cap = Math.max(1, Math.min(PENDING_DESTRUCTIVE_MANUAL_LIST_MAX, Number(maxItems) || PENDING_DESTRUCTIVE_MANUAL_LIST_MAX));
  const db = await openJournalDb();
  try {
    return (await runIndexedDbTransactionBounded(
      db,
      JOURNAL_PENDING_DESTRUCTIVE_STORE,
      'readonly',
      'Чтение destructive receipts для ручного решения',
      ({ store, setResult, fail }) => {
        const receipts = [];
        let totalManual = 0;
        const request = store().index('updatedAt').openCursor(null, 'next');
        request.onsuccess = () => {
          try {
            const cursor = request.result;
            if (!cursor) {
              setResult({ ok: true, receipts, totalManual, truncated: totalManual > receipts.length });
              return;
            }
            const item = cursor.value || {};
            if (pendingDestructiveMoveIsManual(item)) {
              totalManual += 1;
              if (receipts.length < cap) {
                const safe = pendingDestructiveMoveManualReceiptForUi(item);
                if (safe?.id && safe.updatedAt > 0) receipts.push(safe);
              }
            }
            cursor.continue();
          } catch (error) { fail(error); }
        };
        request.onerror = () => fail(request.error || new Error('Не удалось прочитать destructive receipts для ручного решения.'));
      },
      RECOVERY_IDB_TX_TIMEOUT_MS
    )) || { ok: true, receipts: [], totalManual: 0, truncated: false };
  } finally { db.close(); }
}

async function dismissPendingDestructiveManualReceipt(id, expectedUpdatedAt) {
  const key = String(id || '').trim();
  const expected = Number(expectedUpdatedAt);
  if (!key || key.length > MAX_IMPORTED_ENTRY_ID_CHARS || !Number.isSafeInteger(expected) || expected <= 0) {
    const error = new Error('Некорректная authority ручного destructive receipt.');
    error.code = 'WEBCLIP_DESTRUCTIVE_MANUAL_AUTHORITY_INVALID';
    throw error;
  }
  const db = await openJournalDb();
  let result = null;
  try {
    result = await runIndexedDbTransactionBounded(
      db,
      JOURNAL_PENDING_DESTRUCTIVE_STORE,
      'readwrite',
      'Списание destructive receipt после ручной проверки',
      ({ store, setResult, fail }) => {
        const pending = store();
        const request = pending.get(key);
        request.onsuccess = () => {
          try {
            const current = request.result;
            if (!current) {
              setResult({ ok: false, stale: true, missing: true, error: 'Recovery receipt уже отсутствует. Обновите список.' });
              return;
            }
            if (!pendingDestructiveMoveIsManual(current)) {
              setResult({ ok: false, stale: true, notManual: true, error: 'Recovery receipt больше не находится в manual-resolution. Обновите список.' });
              return;
            }
            const currentUpdatedAt = Math.max(0, Number(current.updatedAt) || 0);
            if (currentUpdatedAt !== expected) {
              setResult({ ok: false, stale: true, updatedAt: currentUpdatedAt, error: 'Recovery receipt изменился после отображения. Обновите список и проверьте его заново.' });
              return;
            }
            if (activeDestructiveMoveReceipts.has(key)) {
              setResult({ ok: false, stale: true, busy: true, error: 'Recovery receipt снова принадлежит активной операции и не может быть списан.' });
              return;
            }
            const safe = pendingDestructiveMoveManualReceiptForUi(current);
            const del = pending.delete(key);
            del.onsuccess = () => setResult({ ok: true, stale: false, receipt: safe });
            del.onerror = () => fail(del.error || new Error('Не удалось списать manual-resolution destructive receipt.'));
          } catch (error) { fail(error); }
        };
        request.onerror = () => fail(request.error || new Error('Не удалось перечитать manual-resolution destructive receipt.'));
      },
      RECOVERY_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }

  if (!result?.ok) return result || { ok: false, stale: true, error: 'Recovery receipt не был списан.' };
  activeDestructiveMoveReceipts.delete(key);
  const receipt = result.receipt || {};
  const operationId = String(receipt.operationId || '');
  recordOperationStage(
    operationId,
    'manual-resolution-dismissed',
    'Пользователь списал destructive recovery receipt после внешней ручной проверки. WebClip удалил только recovery receipt и не изменял Journal или Яндекс Диск.',
    100,
    'partial',
    {
      receiptId: key,
      kind: String(receipt.kind || ''),
      sourcePath: String(receipt.sourcePath || ''),
      targetPath: String(receipt.targetPath || ''),
      verifiedPath: String(receipt.verifiedPath || ''),
      sourceResourceId: String(receipt.sourceResourceId || ''),
      verifiedResourceId: String(receipt.verifiedResourceId || ''),
      receiptUpdatedAt: expected
    }
  );
  await flushOperationLogWrites(operationId).catch(() => {});
  return result;
}

async function listPendingDestructiveMovesForRecovery(maxItems = PENDING_DESTRUCTIVE_RECONCILE_BATCH) {
  const cap = Math.max(1, Math.min(PENDING_DESTRUCTIVE_RECONCILE_BATCH, Number(maxItems) || PENDING_DESTRUCTIVE_RECONCILE_BATCH));
  const db = await openJournalDb();
  try {
    return (await runIndexedDbTransactionBounded(
      db,
      JOURNAL_PENDING_DESTRUCTIVE_STORE,
      'readonly',
      'Чтение destructive-move receipts для restart reconciliation',
      ({ store, setResult, fail }) => {
        const out = [];
        const request = store().index('updatedAt').openCursor(null, 'next');
        request.onsuccess = () => {
          try {
            const cursor = request.result;
            if (!cursor || out.length >= cap) { setResult(out); return; }
            const item = cursor.value || {};
            if (activeDestructiveMoveReceipts.has(String(item.id || ''))) {
              cursor.continue();
              return;
            }
            if (item.phase === 'manual-resolution' || item.manualResolutionRequired === true) {
              cursor.continue();
              return;
            }
            out.push(item);
            cursor.continue();
          } catch (error) { fail(error); }
        };
        request.onerror = () => fail(request.error || new Error('Не удалось прочитать destructive-move receipts для restart reconciliation.'));
      },
      RECOVERY_IDB_TX_TIMEOUT_MS
    )) || [];
  } finally { db.close(); }
}

async function countPendingDestructiveMovePhases() {
  const db = await openJournalDb();
  try {
    return (await runIndexedDbTransactionBounded(
      db,
      JOURNAL_PENDING_DESTRUCTIVE_STORE,
      'readonly',
      'Подсчёт destructive-move recovery states',
      ({ store, setResult, fail }) => {
        const counts = { total: 0, active: 0, manual: 0, prepared: 0, admitted: 0, verified: 0, unknown: 0 };
        const request = store().openCursor();
        request.onsuccess = () => {
          try {
            const cursor = request.result;
            if (!cursor) { setResult(counts); return; }
            const item = cursor.value || {};
            const phase = String(item.phase || '');
            counts.total += 1;
            if (phase === 'manual-resolution' || item.manualResolutionRequired === true) counts.manual += 1;
            else if (phase === 'prepared') { counts.prepared += 1; counts.active += 1; }
            else if (['admitted-unknown', 'revoke-admitted-unknown', 'move-admitted-unknown'].includes(phase)) { counts.admitted += 1; counts.active += 1; }
            else if (['revoke-verified', 'remote-verified'].includes(phase)) { counts.verified += 1; counts.active += 1; }
            else { counts.unknown += 1; counts.active += 1; }
            cursor.continue();
          } catch (error) { fail(error); }
        };
        request.onerror = () => fail(request.error || new Error('Не удалось подсчитать destructive-move recovery states.'));
      },
      RECOVERY_IDB_TX_TIMEOUT_MS
    )) || { total: 0, active: 0, manual: 0, prepared: 0, admitted: 0, verified: 0, unknown: 0 };
  } finally { db.close(); }
}

async function reconcilePendingDestructiveMoves(trigger = 'maintenance', maxItems = PENDING_DESTRUCTIVE_RECONCILE_BATCH) {
  const queue = await listPendingDestructiveMovesForRecovery(maxItems);
  let preparedDropped = 0;
  let finalized = 0;
  let cancelled = 0;
  let manualResolution = 0;
  let failed = 0;

  for (const raw of queue) {
    let item = raw && typeof raw === 'object' ? raw : {};
    const id = String(item.id || '').trim();
    const kind = String(item.kind || '');
    const operationId = String(item.operationId || '');
    if (!id) continue;
    let disposition = pendingDestructiveMoveRecoveryDisposition(item);
    try {
      if (kind === 'publication-revoke-trash'
        && ['revoke-admitted-unknown', 'revoke-verified', 'move-admitted-unknown'].includes(item.phase)) {
        try {
          const settlement = await reconcilePendingPublicationRevokeTrashReceipt(item, trigger);
          if (settlement.cancelled) {
            cancelled += 1;
            recordOperationStage(operationId, 'recovery-finalize', 'Composite revoke+Trash receipt superseded сбросом Journal после доказанного revoke; вторая remote admission не выполнялась.', 100, 'partial', {
              trigger, kind, cancelled: true, secondRemoteEffectAdmitted: false
            });
            await flushOperationLogWrites(operationId).catch(() => {});
            continue;
          }
          if (!settlement.settled) {
            await markPendingDestructiveMoveManualResolution(id, settlement.reason, trigger);
            manualResolution += 1;
            recordOperationStage(operationId, 'recovery-manual', settlement.reason, 100, 'partial', {
              trigger, kind, recoveryState: 'manual-resolution', retryForbidden: true
            });
            await flushOperationLogWrites(operationId).catch(() => {});
            continue;
          }
          item = settlement.receipt;
          disposition = 'finalize-local';
        } catch (error) {
          const reason = `Composite revoke+Trash settlement нельзя доказать безопасно: ${normalizeError(error)} Ни одна already-admitted remote команда не повторяется.`;
          await markPendingDestructiveMoveManualResolution(id, reason, trigger);
          manualResolution += 1;
          recordOperationStage(operationId, 'recovery-manual', reason, 100, 'partial', {
            trigger, kind, recoveryState: 'manual-resolution', retryForbidden: true
          });
          await flushOperationLogWrites(operationId).catch(() => {});
          continue;
        }
      }

      if (kind === 'publication-revoke' && item.phase === 'admitted-unknown') {
        try {
          const settlement = await reconcilePendingPublicationRevokeReceipt(item, trigger);
          if (!settlement.settled) {
            await markPendingDestructiveMoveManualResolution(id, settlement.reason, trigger);
            manualResolution += 1;
            recordOperationStage(operationId, 'recovery-manual', settlement.reason, 100, 'partial', {
              trigger, kind, recoveryState: 'manual-resolution', retryForbidden: true
            });
            await flushOperationLogWrites(operationId).catch(() => {});
            continue;
          }
          item = settlement.receipt;
          disposition = 'finalize-local';
        } catch (error) {
          const reason = `Publication-revoke settlement нельзя доказать после restart без повторной unpublish команды: ${normalizeError(error)}`;
          await markPendingDestructiveMoveManualResolution(id, reason, trigger);
          manualResolution += 1;
          recordOperationStage(operationId, 'recovery-manual', reason, 100, 'partial', {
            trigger, kind, recoveryState: 'manual-resolution', retryForbidden: true
          });
          await flushOperationLogWrites(operationId).catch(() => {});
          continue;
        }
      }

      if (disposition === 'drop-prepared') {
        await removePendingDestructiveMove(id);
        preparedDropped += 1;
        recordOperationStage(operationId, 'recovery-pre-admission', 'После restart удалён prepared destructive receipt: durable remote admission не был зафиксирован.', 100, 'partial', { trigger, kind });
        await flushOperationLogWrites(operationId).catch(() => {});
        continue;
      }

      if (disposition === 'manual-resolution' || !['read-move', 'trash-move', 'publication-revoke', 'publication-revoke-trash'].includes(kind)) {
        const reason = !['read-move', 'trash-move', 'publication-revoke', 'publication-revoke-trash'].includes(kind)
          ? `Неизвестный destructive-move kind «${kind || 'empty'}»; automatic recovery запрещён.`
          : 'Destructive move был durably admitted, но terminal exact remote outcome не был записан до restart. Automatic Yandex retry/verification запрещён; требуется manual resolution под P1-090.';
        await markPendingDestructiveMoveManualResolution(id, reason, trigger);
        manualResolution += 1;
        recordOperationStage(operationId, 'recovery-manual', reason, 100, 'partial', { trigger, kind, recoveryState: 'manual-resolution' });
        await flushOperationLogWrites(operationId).catch(() => {});
        continue;
      }

      if (disposition !== 'finalize-local') continue;

      const remoteIdentityStatus = pendingDestructiveMoveRemoteIdentityStatus(item, { requireTerminal: true });
      if (!remoteIdentityStatus.ok) {
        const reason = `Verified destructive receipt не содержит exact P0-022 provider identity continuity (${remoteIdentityStatus.reason}); automatic local finalization запрещена.`;
        await markPendingDestructiveMoveManualResolution(id, reason, trigger);
        manualResolution += 1;
        recordOperationStage(operationId, 'recovery-manual', reason, 100, 'partial', {
          trigger,
          kind,
          recoveryState: 'manual-resolution',
          remoteIdentityProblem: remoteIdentityStatus.reason
        });
        await flushOperationLogWrites(operationId).catch(() => {});
        continue;
      }

      // A reset-superseded verified receipt is history-only and can be retired
      // without touching Journal state. Otherwise, legacy verified receipts that
      // predate the P0-076 cursor cannot automatically patch/delete the current
      // row: preserve their terminal remote evidence for manual resolution.
      if (item.supersededByJournalReset !== true && !pendingDestructiveMoveJournalAuthorityToken(item)) {
        const reason = 'Verified legacy destructive receipt не содержит exact P0-076 Journal authority; automatic local Journal finalization запрещена. Remote terminal evidence сохранён для manual resolution.';
        await markPendingDestructiveMoveManualResolution(id, reason, trigger);
        manualResolution += 1;
        recordOperationStage(operationId, 'recovery-manual', reason, 100, 'partial', {
          trigger,
          kind,
          recoveryState: 'manual-resolution',
          legacyJournalAuthority: true
        });
        await flushOperationLogWrites(operationId).catch(() => {});
        continue;
      }

      if (kind === 'publication-revoke') {
        const result = await finalizePublicationRevokeJournalFromReceipt(id);
        const deletesJournal = result?.completionAction === PUBLICATION_REVOKE_COMPLETION_DELETE_KEEP;
        if (result?.cancelled) cancelled += 1;
        else {
          finalized += 1;
          notifyJournalChanged(deletesJournal ? 'delete' : 'publication-revoke');
          refreshActionForAllTabs().catch(() => {});
        }
        recordOperationStage(operationId, 'recovery-finalize', result?.cancelled
          ? 'Verified private publication receipt завершён как superseded/history-only без изменения replacement Journal state.'
          : (deletesJournal
            ? 'Verified private publication receipt после restart удалил exact Journal запись, сохранив файл на Яндекс Диске.'
            : 'Verified private publication receipt после restart очистил publicUrl исходной Journal записи.'), 100, result?.cancelled ? 'partial' : 'success', {
          trigger, kind, cancelled: Boolean(result?.cancelled), completionAction: result?.completionAction || ''
        });
        await flushOperationLogWrites(operationId).catch(() => {});
        continue;
      }

      if (kind === 'trash-move' || kind === 'publication-revoke-trash') {
        const result = await finalizeTrashDeleteFromReceipt(id);
        if (result?.cancelled) cancelled += 1;
        else {
          finalized += 1;
          notifyJournalChanged('delete');
          refreshActionForAllTabs().catch(() => {});
        }
        recordOperationStage(operationId, 'recovery-finalize', result?.cancelled
          ? 'Verified Trash receipt после restart завершён как superseded/history-only без удаления replacement Journal state.'
          : (kind === 'publication-revoke-trash'
            ? 'Verified composite revoke+Trash receipt после restart завершил локальное удаление исходной Journal записи.'
            : 'Verified Trash receipt после restart завершил локальное удаление исходной Journal записи.'), 100, result?.statsWarning ? 'partial' : 'success', {
          trigger, kind, cancelled: Boolean(result?.cancelled), statsWarning: String(result?.statsWarning || '')
        });
        await flushOperationLogWrites(operationId).catch(() => {});
        continue;
      }

      if (item.supersededByJournalReset === true) {
        const result = await finalizeReadMoveJournalFromReceipt(id, {});
        cancelled += result?.cancelled ? 1 : 0;
        recordOperationStage(operationId, 'recovery-finalize', 'Verified ReadLater receipt после restart завершён как superseded/history-only без восстановления старой Journal записи.', 100, 'partial', { trigger, kind, cancelled: true });
        await flushOperationLogWrites(operationId).catch(() => {});
        continue;
      }

      const verifiedPath = normalizeDiskPath(item.verifiedPath || '');
      const verifiedFolder = normalizeDiskPath(item.verifiedFolder || '');
      const verifiedFilename = String(item.verifiedFilename || '').slice(0, MAX_YANDEX_ITEM_NAME_CHARS);
      if (!verifiedPath || !verifiedFolder || !verifiedFilename) {
        const reason = 'Verified ReadLater receipt не содержит полного terminal local-finalization metadata из текущего receipt schema; automatic Journal patch после restart запрещён.';
        await markPendingDestructiveMoveManualResolution(id, reason, trigger);
        manualResolution += 1;
        recordOperationStage(operationId, 'recovery-manual', reason, 100, 'partial', { trigger, kind, recoveryState: 'manual-resolution' });
        await flushOperationLogWrites(operationId).catch(() => {});
        continue;
      }

      const result = await finalizeReadMoveJournalFromReceipt(id, {
        readingMode: 'read',
        remotePath: verifiedPath,
        folder: verifiedFolder,
        filename: verifiedFilename,
        publicUrl: String(item.verifiedPublicUrl || item.sourcePublicUrl || '').slice(0, MAX_YANDEX_PUBLIC_URL_CHARS),
        resourceId: String(item.verifiedResourceId || item.sourceResourceId || '').slice(0, MAX_YANDEX_RESOURCE_ID_CHARS),
        remoteIdentityProvenance: WebClipYandexRemoteIdentityAuthority.PROVIDER_VERIFIED,
        movedToReadAt: Math.max(0, Number(item.verifiedAt) || 0) || Date.now(),
        readMovePendingAt: 0,
        readMoveSourcePath: '',
        readMoveTargetPath: '',
        readMoveOperationId: '',
        readMoveLastError: ''
      });
      if (result?.cancelled) cancelled += 1;
      else {
        finalized += 1;
        notifyJournalChanged('mark-read');
        refreshActionForAllTabs().catch(() => {});
      }
      recordOperationStage(operationId, 'recovery-finalize', result?.cancelled
        ? 'Verified ReadLater receipt после restart не получил authority над replacement Journal state.'
        : 'Verified ReadLater receipt после restart завершил локальную Journal финализацию.', 100, result?.cancelled ? 'partial' : 'success', { trigger, kind, cancelled: Boolean(result?.cancelled) });
      await flushOperationLogWrites(operationId).catch(() => {});
    } catch (error) {
      failed += 1;
      await markPendingDestructiveMoveFailure(id, error).catch(() => {});
      recordOperationStage(operationId, 'recovery-error', `Restart reconciliation destructive move не завершён: ${normalizeError(error)} Receipt сохранён.`, 100, 'partial', { trigger, kind, error: normalizeError(error) });
      await flushOperationLogWrites(operationId).catch(() => {});
    }
  }

  const counts = await countPendingDestructiveMovePhases().catch(() => ({ total: 0, active: 0, manual: 0, prepared: 0, admitted: 0, verified: 0, unknown: 0 }));
  return {
    trigger,
    checked: queue.length,
    preparedDropped,
    finalized,
    cancelled,
    manualResolution,
    failed,
    pending: counts.active,
    manualPending: counts.manual,
    phaseCounts: counts
  };
}

async function readPendingDestructiveMoveReceipt(id) {
  const key = String(id || '');
  if (!key) return null;
  const db = await openJournalDb();
  try {
    return await runIndexedDbTransactionBounded(
      db,
      JOURNAL_PENDING_DESTRUCTIVE_STORE,
      'readonly',
      'Чтение destructive-move receipt',
      ({ store, setResult, fail }) => {
        const request = store().get(key);
        request.onsuccess = () => setResult(request.result || null);
        request.onerror = () => fail(request.error || new Error('Не удалось прочитать destructive-move receipt.'));
      },
      RECOVERY_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
}

async function removePendingDestructiveMove(id) {
  const key = String(id || '');
  if (!key) return;
  const db = await openJournalDb();
  try {
    await runIndexedDbTransactionBounded(
      db,
      JOURNAL_PENDING_DESTRUCTIVE_STORE,
      'readwrite',
      'Удаление terminal destructive-move receipt',
      ({ store }) => store().delete(key),
      RECOVERY_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
  activeDestructiveMoveReceipts.delete(key);
}

async function finalizeReadMoveJournalFromReceipt(receiptId, patch = {}) {
  const key = String(receiptId || '');
  const db = await openJournalDb();
  let result = null;
  try {
    result = await runIndexedDbTransactionBounded(
      db,
      [JOURNAL_PENDING_DESTRUCTIVE_STORE, JOURNAL_STORE, JOURNAL_META_STORE],
      'readwrite',
      'Финализация read-move Journal по detached receipt',
      ({ tx, setResult, fail }) => {
        const receipts = tx.objectStore(JOURNAL_PENDING_DESTRUCTIVE_STORE);
        const entries = tx.objectStore(JOURNAL_STORE);
        const meta = tx.objectStore(JOURNAL_META_STORE);
        const request = receipts.get(key);
        request.onsuccess = () => {
          try {
            const receipt = request.result;
            if (!receipt) { setResult({ cancelled: true, entry: null, receiptMissing: true }); return; }
            if (receipt.phase !== 'remote-verified') {
              const error = new Error('Destructive-move receipt не имеет terminal remote verification.');
              error.code = 'WEBCLIP_DESTRUCTIVE_MOVE_NOT_VERIFIED';
              fail(error);
              return;
            }
            if (receipt.supersededByJournalReset === true) {
              receipts.delete(key);
              setResult({ cancelled: true, entry: null, supersededByJournalReset: true });
              return;
            }

            let entryReady = false;
            let generationReady = false;
            let current = null;
            let resetGeneration = JOURNAL_INITIAL_RESET_GENERATION;
            let compared = false;
            const compareAndFinalize = () => {
              if (compared || !entryReady || !generationReady) return;
              compared = true;
              if (!pendingDestructiveMoveJournalAuthorityMatches(receipt, resetGeneration, current)) {
                receipts.delete(key);
                setResult({ cancelled: true, entry: null, sourceAuthorityLost: true });
                return;
              }
              try {
                const updated = { ...current, ...patch, id: current.id, entryRevision: nextJournalEntryRevision(current.entryRevision) };
                entries.put(updated);
                receipts.delete(key);
                touchJournalDbRevision(tx, 'read-move-finalize');
                setResult({ cancelled: false, entry: updated });
              } catch (error) { fail(error); }
            };
            const entryReq = entries.get(receipt.sourceJournalEntryId);
            entryReq.onsuccess = () => { current = entryReq.result || null; entryReady = true; compareAndFinalize(); };
            entryReq.onerror = () => fail(entryReq.error || new Error('Не удалось проверить Journal authority при terminal read-move finalize.'));
            const generationReq = meta.get(JOURNAL_RESET_GENERATION_KEY);
            generationReq.onsuccess = () => {
              resetGeneration = normalizeJournalResetGeneration(generationReq.result?.value);
              generationReady = true;
              compareAndFinalize();
            };
            generationReq.onerror = () => fail(generationReq.error || new Error('Не удалось проверить Journal generation при terminal read-move finalize.'));
          } catch (error) { fail(error); }
        };
        request.onerror = () => fail(request.error || new Error('Не удалось прочитать terminal destructive-move receipt.'));
      },
      JOURNAL_CRUD_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
  activeDestructiveMoveReceipts.delete(key);
  return result;
}

async function finalizePublicationRevokeJournalFromReceipt(receiptId) {
  const key = String(receiptId || '');
  const preview = await readPendingDestructiveMoveReceipt(key);
  if (!preview) {
    activeDestructiveMoveReceipts.delete(key);
    return { cancelled: true, entry: null, receiptMissing: true, completionAction: PUBLICATION_REVOKE_COMPLETION_CLEAR };
  }
  if (preview.kind !== 'publication-revoke' || preview.phase !== 'remote-verified') {
    const error = new Error('Publication-revoke receipt не имеет terminal private verification.');
    error.code = 'WEBCLIP_PUBLICATION_REVOKE_NOT_VERIFIED';
    throw error;
  }
  const previewIdentityStatus = pendingDestructiveMoveRemoteIdentityStatus(preview, { requireTerminal: true });
  if (!previewIdentityStatus.ok || String(preview.verifiedPublicUrl || '').trim()) {
    const error = new Error(`Publication-revoke terminal identity/private binding недействителен: ${previewIdentityStatus.reason || 'public-url-present'}.`);
    error.code = 'WEBCLIP_PUBLICATION_REVOKE_TERMINAL_BINDING_INVALID';
    throw error;
  }
  const completionAction = normalizePublicationRevokeCompletionAction(preview.completionAction || '');
  if (!completionAction) {
    const error = new Error('Publication-revoke receipt содержит неподдерживаемое локальное завершение.');
    error.code = 'WEBCLIP_PUBLICATION_REVOKE_COMPLETION_INVALID';
    throw error;
  }

  if (completionAction === PUBLICATION_REVOKE_COMPLETION_DELETE_KEEP) {
    if (preview.supersededByJournalReset === true) {
      await removePendingDestructiveMove(key);
      return { cancelled: true, entry: null, deletedEntry: null, supersededByJournalReset: true, completionAction };
    }
    const authority = pendingDestructiveMoveJournalAuthorityToken(preview);
    if (!authority) {
      const error = new Error('Publication-revoke delete completion не содержит exact P0-076 Journal authority.');
      error.code = 'WEBCLIP_PUBLICATION_REVOKE_DELETE_AUTHORITY_INVALID';
      throw error;
    }
    const statsToken = await beginJournalStatsMutation('delete');
    const deleteDb = await openJournalDb();
    let deleteResult = null;
    try {
      deleteResult = await runIndexedDbTransactionBounded(
        deleteDb,
        [JOURNAL_PENDING_DESTRUCTIVE_STORE, JOURNAL_STORE, JOURNAL_META_STORE],
        'readwrite',
        'Атомарная финализация publication revoke + Journal delete',
        ({ tx, setResult, fail }) => {
          const receipts = tx.objectStore(JOURNAL_PENDING_DESTRUCTIVE_STORE);
          const entries = tx.objectStore(JOURNAL_STORE);
          const meta = tx.objectStore(JOURNAL_META_STORE);
          const receiptRequest = receipts.get(key);
          receiptRequest.onsuccess = () => {
            try {
              const receipt = receiptRequest.result;
              const receiptCompletion = normalizePublicationRevokeCompletionAction(receipt?.completionAction || '');
              const identityStatus = pendingDestructiveMoveRemoteIdentityStatus(receipt, { requireTerminal: true });
              if (!receipt
                || receipt.kind !== 'publication-revoke'
                || receipt.phase !== 'remote-verified'
                || receiptCompletion !== PUBLICATION_REVOKE_COMPLETION_DELETE_KEEP
                || !identityStatus.ok
                || String(receipt.verifiedPublicUrl || '').trim()) {
                const error = new Error(`Publication-revoke delete receipt потерял terminal binding: ${identityStatus.reason || 'completion/private-state'}.`);
                error.code = 'WEBCLIP_PUBLICATION_REVOKE_DELETE_TERMINAL_BINDING_INVALID';
                fail(error);
                return;
              }
              if (receipt.supersededByJournalReset === true) {
                receipts.delete(key);
                setResult({ cancelled: true, entry: null, deletedEntry: null, supersededByJournalReset: true, completionAction });
                return;
              }

              let entryReady = false;
              let generationReady = false;
              let current = null;
              let resetGeneration = JOURNAL_INITIAL_RESET_GENERATION;
              let compared = false;
              const compareAndDelete = () => {
                if (compared || !entryReady || !generationReady) return;
                compared = true;
                if (!pendingDestructiveMoveJournalAuthorityMatches(receipt, resetGeneration, current)) {
                  receipts.delete(key);
                  setResult({
                    cancelled: true,
                    entry: null,
                    deletedEntry: null,
                    sourceAuthorityLost: true,
                    completionAction
                  });
                  return;
                }
                entries.delete(current.id);
                receipts.delete(key);
                touchJournalDbRevision(tx, 'publication-revoke-delete-finalize');
                setResult({ cancelled: false, entry: null, deletedEntry: current, completionAction });
              };
              const entryRequest = entries.get(receipt.sourceJournalEntryId);
              entryRequest.onsuccess = () => { current = entryRequest.result || null; entryReady = true; compareAndDelete(); };
              entryRequest.onerror = () => fail(entryRequest.error || new Error('Не удалось прочитать Journal row при publication-revoke delete finalize.'));
              const generationRequest = meta.get(JOURNAL_RESET_GENERATION_KEY);
              generationRequest.onsuccess = () => {
                resetGeneration = normalizeJournalResetGeneration(generationRequest.result?.value);
                generationReady = true;
                compareAndDelete();
              };
              generationRequest.onerror = () => fail(generationRequest.error || new Error('Не удалось прочитать Journal generation при publication-revoke delete finalize.'));
            } catch (error) { fail(error); }
          };
          receiptRequest.onerror = () => fail(receiptRequest.error || new Error('Не удалось повторно прочитать publication-revoke delete receipt.'));
        },
        JOURNAL_CRUD_IDB_TX_TIMEOUT_MS
      );
    } catch (error) {
      await completeJournalStatsMutation(statsToken).catch(() => {});
      throw error;
    } finally {
      deleteDb.close();
    }
    activeDestructiveMoveReceipts.delete(key);

    const deletedEntry = deleteResult?.deletedEntry || null;
    if (!deletedEntry) {
      await completeJournalStatsMutation(statsToken).catch(() => {});
      return { ...(deleteResult || { cancelled: true, entry: null }), completionAction, statsWarning: '' };
    }
    let statsWarning = '';
    try {
      if (deletedEntry.urlKey) await rebuildUrlStatsForUrl(deletedEntry.urlKey);
      await completeJournalStatsMutation(statsToken);
    } catch (error) {
      statsWarning = normalizeError(error);
      console.warn('WebClip urlStats publication-revoke delete deferred repair:', error);
    }
    return { ...deleteResult, completionAction, statsWarning };
  }

  const db = await openJournalDb();
  let result = null;
  try {
    result = await runIndexedDbTransactionBounded(
      db,
      [JOURNAL_PENDING_DESTRUCTIVE_STORE, JOURNAL_STORE, JOURNAL_META_STORE],
      'readwrite',
      'Финализация publication revoke по detached receipt',
      ({ tx, setResult, fail }) => {
        const receipts = tx.objectStore(JOURNAL_PENDING_DESTRUCTIVE_STORE);
        const entries = tx.objectStore(JOURNAL_STORE);
        const meta = tx.objectStore(JOURNAL_META_STORE);
        const request = receipts.get(key);
        request.onsuccess = () => {
          try {
            const receipt = request.result;
            if (!receipt) { setResult({ cancelled: true, entry: null, receiptMissing: true, completionAction }); return; }
            if (receipt.kind !== 'publication-revoke' || receipt.phase !== 'remote-verified') {
              const error = new Error('Publication-revoke receipt не имеет terminal private verification.');
              error.code = 'WEBCLIP_PUBLICATION_REVOKE_NOT_VERIFIED';
              fail(error);
              return;
            }
            const remoteIdentityStatus = pendingDestructiveMoveRemoteIdentityStatus(receipt, { requireTerminal: true });
            if (!remoteIdentityStatus.ok || String(receipt.verifiedPublicUrl || '').trim()) {
              const error = new Error(`Publication-revoke terminal identity/private binding недействителен: ${remoteIdentityStatus.reason || 'public-url-present'}.`);
              error.code = 'WEBCLIP_PUBLICATION_REVOKE_TERMINAL_BINDING_INVALID';
              fail(error);
              return;
            }
            if (receipt.supersededByJournalReset === true) {
              receipts.delete(key);
              setResult({ cancelled: true, entry: null, supersededByJournalReset: true, completionAction });
              return;
            }

            let entryReady = false;
            let generationReady = false;
            let current = null;
            let resetGeneration = JOURNAL_INITIAL_RESET_GENERATION;
            let compared = false;
            const compareAndFinalize = () => {
              if (compared || !entryReady || !generationReady) return;
              compared = true;
              if (!pendingDestructiveMoveJournalAuthorityMatches(receipt, resetGeneration, current)) {
                receipts.delete(key);
                setResult({ cancelled: true, entry: null, sourceAuthorityLost: true, completionAction });
                return;
              }
              const updated = {
                ...current,
                id: current.id,
                publicUrl: '',
                remotePath: normalizeDiskPath(receipt.verifiedPath || receipt.sourcePath || current.remotePath || ''),
                resourceId: String(receipt.verifiedResourceId || receipt.sourceResourceId || current.resourceId || '').slice(0, MAX_YANDEX_RESOURCE_ID_CHARS),
                remoteIdentityProvenance: WebClipYandexRemoteIdentityAuthority.PROVIDER_VERIFIED,
                publicationRevokedAt: Math.max(0, Number(receipt.verifiedAt) || 0) || Date.now(),
                entryRevision: nextJournalEntryRevision(current.entryRevision)
              };
              entries.put(updated);
              receipts.delete(key);
              touchJournalDbRevision(tx, 'publication-revoke-finalize');
              setResult({ cancelled: false, entry: updated, completionAction });
            };
            const entryReq = entries.get(receipt.sourceJournalEntryId);
            entryReq.onsuccess = () => { current = entryReq.result || null; entryReady = true; compareAndFinalize(); };
            entryReq.onerror = () => fail(entryReq.error || new Error('Не удалось проверить Journal authority при publication-revoke finalize.'));
            const generationReq = meta.get(JOURNAL_RESET_GENERATION_KEY);
            generationReq.onsuccess = () => {
              resetGeneration = normalizeJournalResetGeneration(generationReq.result?.value);
              generationReady = true;
              compareAndFinalize();
            };
            generationReq.onerror = () => fail(generationReq.error || new Error('Не удалось проверить Journal generation при publication-revoke finalize.'));
          } catch (error) { fail(error); }
        };
        request.onerror = () => fail(request.error || new Error('Не удалось прочитать terminal publication-revoke receipt.'));
      },
      JOURNAL_CRUD_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
  activeDestructiveMoveReceipts.delete(key);
  return result;
}

async function finalizeTrashDeleteFromReceipt(receiptId) {
  const key = String(receiptId || '');
  const statsToken = await beginJournalStatsMutation('delete');
  const db = await openJournalDb();
  let result = null;
  try {
    result = await runIndexedDbTransactionBounded(
      db,
      [JOURNAL_PENDING_DESTRUCTIVE_STORE, JOURNAL_STORE, JOURNAL_META_STORE],
      'readwrite',
      'Финализация Trash Journal delete по detached receipt',
      ({ tx, setResult, fail }) => {
        const receipts = tx.objectStore(JOURNAL_PENDING_DESTRUCTIVE_STORE);
        const entries = tx.objectStore(JOURNAL_STORE);
        const meta = tx.objectStore(JOURNAL_META_STORE);
        const request = receipts.get(key);
        request.onsuccess = () => {
          try {
            const receipt = request.result;
            if (!receipt) {
              setResult({ cancelled: true, deletedEntry: null, receiptMissing: true });
              return;
            }
            if (!['trash-move', 'publication-revoke-trash'].includes(receipt.kind) || receipt.phase !== 'remote-verified') {
              const error = new Error('Trash destructive-move receipt не имеет terminal remote verification.');
              error.code = 'WEBCLIP_TRASH_MOVE_NOT_VERIFIED';
              fail(error);
              return;
            }
            const remoteIdentityStatus = pendingDestructiveMoveRemoteIdentityStatus(receipt, { requireTerminal: true });
            if (!remoteIdentityStatus.ok
              || (receipt.kind === 'publication-revoke-trash' && String(receipt.verifiedPublicUrl || '').trim())) {
              const error = new Error(`Trash terminal identity/private binding недействителен: ${remoteIdentityStatus.reason || 'public-url-present'}.`);
              error.code = 'WEBCLIP_TRASH_MOVE_TERMINAL_BINDING_INVALID';
              fail(error);
              return;
            }
            if (receipt.supersededByJournalReset === true) {
              receipts.delete(key);
              setResult({ cancelled: true, deletedEntry: null, supersededByJournalReset: true });
              return;
            }

            let entryReady = false;
            let generationReady = false;
            let current = null;
            let resetGeneration = JOURNAL_INITIAL_RESET_GENERATION;
            let compared = false;
            const compareAndDelete = () => {
              if (compared || !entryReady || !generationReady) return;
              compared = true;
              if (!pendingDestructiveMoveJournalAuthorityMatches(receipt, resetGeneration, current)) {
                receipts.delete(key);
                setResult({ cancelled: true, deletedEntry: null, sourceAuthorityLost: true });
                return;
              }
              entries.delete(current.id);
              receipts.delete(key);
              touchJournalDbRevision(tx, 'trash-move-finalize');
              setResult({ cancelled: false, deletedEntry: current });
            };
            const entryReq = entries.get(receipt.sourceJournalEntryId);
            entryReq.onsuccess = () => { current = entryReq.result || null; entryReady = true; compareAndDelete(); };
            entryReq.onerror = () => fail(entryReq.error || new Error('Не удалось проверить Journal authority при terminal Trash finalize.'));
            const generationReq = meta.get(JOURNAL_RESET_GENERATION_KEY);
            generationReq.onsuccess = () => {
              resetGeneration = normalizeJournalResetGeneration(generationReq.result?.value);
              generationReady = true;
              compareAndDelete();
            };
            generationReq.onerror = () => fail(generationReq.error || new Error('Не удалось проверить Journal generation при terminal Trash finalize.'));
          } catch (error) { fail(error); }
        };
        request.onerror = () => fail(request.error || new Error('Не удалось прочитать terminal Trash destructive-move receipt.'));
      },
      JOURNAL_CRUD_IDB_TX_TIMEOUT_MS
    );
  } catch (error) {
    await completeJournalStatsMutation(statsToken).catch(() => {});
    throw error;
  } finally {
    db.close();
  }
  activeDestructiveMoveReceipts.delete(key);

  const deletedEntry = result?.deletedEntry || null;
  if (!deletedEntry) {
    await completeJournalStatsMutation(statsToken).catch(() => {});
    return { ...(result || { cancelled: true }), statsWarning: '' };
  }

  let statsWarning = '';
  try {
    if (deletedEntry.urlKey) await rebuildUrlStatsForUrl(deletedEntry.urlKey);
    await completeJournalStatsMutation(statsToken);
  } catch (error) {
    statsWarning = normalizeError(error);
    console.warn('WebClip urlStats Trash delete deferred repair:', error);
  }
  return { ...result, statsWarning };
}

function resolveJournalDeletePublicationOutcome(entry, publicationAction = '', diskAction = 'keep') {
  const hasKnownPublicAccess = entry?.destination === 'yandex' && Boolean(String(entry?.publicUrl || '').trim());
  if (!hasKnownPublicAccess) {
    return Object.freeze({ hasKnownPublicAccess: false, publicationAction: 'none', publicationOutcome: 'none' });
  }

  const action = String(publicationAction || '').trim().toLowerCase();
  if (action === 'revoke') {
    const normalizedDiskAction = String(diskAction || '').trim().toLowerCase();
    if (!['keep', 'trash'].includes(normalizedDiskAction)) {
      const error = new Error('Для отзыва публичной ссылки требуется точный file outcome: keep или Trash.');
      error.code = 'WEBCLIP_PUBLICATION_REVOKE_DISK_ACTION_INVALID';
      throw error;
    }
    return Object.freeze({
      hasKnownPublicAccess: true,
      publicationAction: 'revoke',
      publicationOutcome: normalizedDiskAction === 'trash' ? 'revoke-and-trash-requested' : 'revoke-requested'
    });
  }
  if (action !== 'preserve') {
    const error = new Error('Для опубликованного файла подтвердите, что публичный доступ по ссылке будет сохранён.');
    error.code = 'WEBCLIP_PUBLICATION_OUTCOME_REQUIRED';
    throw error;
  }
  return Object.freeze({
    hasKnownPublicAccess: true,
    publicationAction: 'preserve',
    publicationOutcome: 'preserved-by-user'
  });
}

async function deleteJournalEntry(id, { diskAction = 'keep', publicationAction = '', operationId = '' } = {}) {
  operationId = String(operationId || '') || makeOperationLogId('journal-delete');
  if (!id) return { ok: false, error: 'Не указан идентификатор записи журнала.' };
  const authoritySnapshot = await readJournalEntryWithAuthority(id);
  const entry = authoritySnapshot?.entry || null;
  const deleteAuthority = authoritySnapshot?.token || null;
  if (!entry || !deleteAuthority) return { ok: false, error: 'Запись журнала уже отсутствует.' };

  const isYandex = entry.destination === 'yandex';
  const action = String(diskAction || 'keep');
  if (isYandex && action !== 'keep' && action !== 'trash') return { ok: false, error: 'Выберите, оставить файл на Яндекс Диске или переместить его в Trash.' };
  // P0-069: settle the publication choice before logging or admitting any
  // remote/local destructive side effect. Both bounded compositions persist
  // their exact completion in a durable receipt. Revoke+Trash uses two distinct
  // admission phases so neither already-admitted remote command is replayed.
  const publication = resolveJournalDeletePublicationOutcome(entry, publicationAction, action);
  if (publication.publicationAction === 'revoke') {
    const revoked = await revokeJournalEntryPublicAccess(id, operationId, {
      completionAction: action === 'trash'
        ? PUBLICATION_REVOKE_COMPLETION_DELETE_TRASH
        : PUBLICATION_REVOKE_COMPLETION_DELETE_KEEP
    });
    return {
      ...revoked,
      destination: 'yandex',
      diskAction: action,
      trashPath: action === 'trash' ? String(revoked?.trashPath || '') : '',
      trashMonth: action === 'trash' ? String(revoked?.trashMonth || '') : '',
      publicationAction: 'revoke'
    };
  }
  await startOperationLog(operationId, 'journal-delete', isYandex && action === 'trash' ? 'Удаление записи журнала и перенос файла в Trash' : 'Удаление записи журнала', {
    journalEntryId: id, destination: entry.destination || '', diskAction: action, remotePath: entry.remotePath || '',
    resourceId: entry.resourceId || '', hasPublicUrl: publication.hasKnownPublicAccess,
    publicationAction: publication.publicationAction, publicationOutcome: publication.publicationOutcome,
    accountUid: entry.accountUid ? '[BOUND]' : '', rootPath: entry.rootPath || '', url: entry.url || '', filename: entry.filename || ''
  });

  let moved = null;
  try {
    let journalSuperseded = false;
    let statsWarning = '';
    if (isYandex && action === 'trash') {
      moved = await moveJournalYandexFileToTrash(entry, operationId, deleteAuthority);
      emitJournalOperationProgress(operationId, 'journal', 'Удаляем исходную запись журнала по verified Trash receipt…', 92);
      const finalized = await finalizeTrashDeleteFromReceipt(moved.detachedReceiptId);
      journalSuperseded = Boolean(finalized?.cancelled);
      statsWarning = String(finalized?.statsWarning || '');
    } else {
      emitJournalOperationProgress(operationId, 'journal', 'Удаляем запись из локального журнала…', 92);
      const finalized = await deleteJournalEntryRecordOnlyCas(deleteAuthority);
      journalSuperseded = Boolean(!finalized?.ok && finalized?.stale);
    }
    refreshActionForAllTabs().catch(() => {});
    if (!journalSuperseded) notifyJournalChanged('delete');
    emitJournalOperationProgress(
      operationId,
      'complete',
      journalSuperseded
        ? (moved
          ? 'Файл подтверждён в Trash; исходная запись журнала уже очищена/заменена и не была затронута старой операцией.'
          : 'Исходная запись журнала была изменена, очищена или заменена; поздняя операция удаления не затронула более новую версию.')
        : 'Удаление завершено.',
      100,
      journalSuperseded || statsWarning ? 'partial' : 'success',
      { trashPath: moved?.trashPath || '', journalSuperseded, statsWarning }
    );
    return {
      ok: true,
      destination: isYandex ? 'yandex' : 'download',
      diskAction: isYandex ? action : 'local-only',
      trashPath: moved?.trashPath || '',
      trashMonth: moved?.trashMonth || '',
      operationId,
      publicationAction: publication.publicationAction,
      publicationOutcome: publication.publicationOutcome,
      journalSuperseded,
      statsWarning
    };
  } catch (error) {
    emitJournalOperationProgress(operationId, 'error', `Ошибка: ${normalizeError(error)}`, 100, 'error');
    throw error;
  }
}

async function chooseAvailableTargetPath(folder, filename, operationId = '') {
  const operationContext = arguments.length > 3 ? arguments[3] : null;
  const raw = String(filename || 'WebClip.pdf');
  const dot = raw.lastIndexOf('.');
  const base = dot > 0 ? raw.slice(0, dot) : raw;
  const ext = dot > 0 ? raw.slice(dot) : '';
  const deadline = Date.now() + 45_000;
  for (let n = 0; n < 1000; n += 1) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('Подбор свободного имени файла в Upload превысил 45 секунд. Операция остановлена без изменения записи журнала.');
    const candidateName = n ? `${base}__${n + 1}${ext}` : raw;
    const candidate = joinDiskPath(folder, candidateName);
    try { await yandexApi('/resources', { method: 'GET', query: { path: candidate, fields: 'type' }, timeoutMs: Math.max(1_000, Math.min(8_000, remaining)), operationId, operationContext }); }
    catch (error) { if (Number(error?.status) === 404) return candidate; throw error; }
  }
  throw new Error('Не удалось подобрать свободное имя файла в папке Upload.');
}

async function moveReadLaterEntryToRead(id, operationId = '') {
  operationId = String(operationId || '') || makeOperationLogId('mark-read');
  const authoritySnapshot = await readJournalEntryWithAuthority(id);
  const entry = authoritySnapshot?.entry || null;
  const journalAuthority = authoritySnapshot?.token || null;
  if (!entry || !journalAuthority) return { ok: false, error: 'Запись журнала не найдена.' };
  if (entry.destination !== 'yandex' || entry.readingMode !== 'later') return { ok: false, error: 'Эта запись не относится к режиму «Прочитать позже».' };
  await startOperationLog(operationId, 'mark-read', 'Перенос «Прочитать позже» в «Прочитано»', {
    journalEntryId: id,
    remotePath: entry.remotePath || '',
    resourceId: entry.resourceId || '',
    url: entry.url || '',
    filename: entry.filename || '',
    resumePendingMove: Boolean(entry.readMovePendingAt || entry.readMoveTargetPath)
  });

  let checkpointWritten = false;
  let detachedReceiptId = '';
  let moveAdmitted = false;
  let checkpointTargetPath = String(entry.readMoveTargetPath || '');
  try {
    if (entry.readMovePendingAt || entry.readMoveTargetPath) {
      emitJournalOperationProgress(operationId, 'resume', 'Обнаружен незавершённый предыдущий перенос. Проверяем фактическое состояние файла…', 8, 'running', {
        pendingSince: Number(entry.readMovePendingAt || 0),
        pendingTargetPath: checkpointTargetPath
      });
    }

    emitJournalOperationProgress(operationId, 'locate', 'Ищем актуальное расположение файла «Прочитать позже»…', 12);
    const operationContext = await captureCurrentYandexOperationContext();
    const current = await findYandexFileForJournalEntry(entry, operationId, operationContext);
    const identityReceipt = current?.remoteIdentityReceipt || null;
    const sourcePath = normalizeDiskPath(identityReceipt?.path || '');
    const config = { rootPath: operationContext.rootPath };
    assertManagedYandexSourcePath(sourcePath, config.rootPath, [YANDEX_READ_LATER_DIR, YANDEX_UPLOAD_DIR]);
    const structure = await ensureYandexServiceFolders({ includeUpload: true, operationId, operationContext });
    const targetFolder = joinDiskPath(structure.uploadPath, ...getSiteFolderSegments(entry.hostname || hostnameFromUrl(entry.url)));
    emitJournalOperationProgress(operationId, 'folder', `Подготавливаем папку Прочитано: ${targetFolder}`, 34);
    await ensureYandexFolderTree(targetFolder, operationId, operationContext);
    const normalizedSource = normalizeDiskPath(sourcePath);
    const normalizedTargetFolder = normalizeDiskPath(targetFolder);
    const alreadyInUploadFolder = normalizedSource.startsWith(`${normalizedTargetFolder}/`);
    const targetPath = alreadyInUploadFolder
      ? normalizedSource
      : checkpointTargetPath && normalizeDiskPath(checkpointTargetPath).startsWith(`${normalizedTargetFolder}/`)
        ? normalizeDiskPath(checkpointTargetPath)
        : await chooseAvailableTargetPath(targetFolder, current?.name ? normalizeYandexItemNameFromApi(current.name) : String(entry.filename || 'WebClip.pdf'), operationId, operationContext);
    checkpointTargetPath = targetPath;

    // P0-072: destructive external authority lives outside the replaceable
    // Journal generation. The detached receipt is prepared first; Journal
    // checkpoint mutation is then guarded by that exact receipt in the same DB.
    const detachedReceipt = await checkpointPendingReadMoveIntent(entry, {
      sourcePath: normalizedSource,
      targetPath,
      sourceResourceId: identityReceipt.resourceId,
      sourcePublicUrl: identityReceipt.publicUrl,
      remoteIdentityReceipt: identityReceipt,
      operationId,
      journalAuthority
    });
    detachedReceiptId = detachedReceipt.id;
    const checkpoint = await updateReadMoveJournalCheckpointFromReceipt(detachedReceiptId, {
      readMovePendingAt: Number(entry.readMovePendingAt || 0) || Date.now(),
      readMoveSourcePath: normalizedSource,
      readMoveTargetPath: targetPath,
      readMoveOperationId: operationId,
      readMoveLastError: ''
    });
    if (!checkpoint) {
      await removePendingDestructiveMove(detachedReceiptId).catch(() => {});
      detachedReceiptId = '';
      const error = new Error('Journal reset superseded read-move authority до remote admission.');
      error.code = 'WEBCLIP_READ_MOVE_SUPERSEDED_BEFORE_ADMISSION';
      throw error;
    }
    checkpointWritten = true;
    appendOperationLogEvent(operationId, {
      category: 'checkpoint',
      level: 'info',
      stage: 'move-checkpoint',
      message: 'Сохранён detached recovery receipt перед перемещением файла на Яндекс Диске.',
      data: { sourcePath: normalizedSource, targetPath, detachedReceipt: true }
    });

    emitJournalOperationProgress(operationId, 'move', alreadyInUploadFolder ? 'Файл уже находится в нужной папке Upload. Повторное перемещение не требуется…' : 'Перемещаем файл из ReadmeLater в Upload…', 58);
    if (!alreadyInUploadFolder) {
      await revalidateYandexDestructiveReceipt(identityReceipt, operationContext, operationId);
      await markPendingDestructiveMoveAdmitted(detachedReceiptId);
      moveAdmitted = true;
      await yandexApi('/resources/move', {
        method: 'POST',
        query: { from: sourcePath, path: targetPath, overwrite: 'false', force_async: 'false' },
        timeoutMs: 15_000,
        operationId,
        operationContext
      });
    }

    emitJournalOperationProgress(operationId, 'verify', 'Проверяем файл в структуре Upload…', 80);
    let moved = null;
    const verifyDeadline = Date.now() + 45_000;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      let remaining = verifyDeadline - Date.now();
      if (remaining <= 500) break;
      if (attempt) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(220 * attempt, Math.max(0, remaining - 500))));
        remaining = verifyDeadline - Date.now();
        if (remaining <= 500) break;
      }
      try {
        moved = await yandexApi('/resources', {
          method: 'GET',
          query: { path: targetPath, fields: 'name,path,type,size,public_url,resource_id' },
          timeoutMs: Math.max(1_000, Math.min(8_000, remaining)),
          operationId,
          retryAttempt: attempt,
          operationContext
        });
        if (moved?.type === 'file') break;
      } catch (error) {
        if (Number(error?.status) !== 404) throw error;
      }
    }
    if (moved?.type !== 'file') {
      const error = new Error('Яндекс Диск не подтвердил перенос файла в Upload за 45 с. Recovery checkpoint сохранён.');
      error.code = 'YANDEX_TIMEOUT';
      throw error;
    }

    const verifiedPath = moved.path ? normalizeYandexDiskPathFromApi(moved.path) : targetPath;
    const verifiedResourceId = moved.resource_id ? normalizeYandexResourceIdFromApi(moved.resource_id) : '';
    if (!verifiedResourceId || verifiedResourceId !== identityReceipt.resourceId) {
      const error = new Error('Яндекс Диск подтвердил Upload path, но exact resource_id не совпал с destructive receipt.');
      error.code = 'WEBCLIP_REMOTE_IDENTITY_MOVE_OUTCOME_CONFLICT';
      throw error;
    }
    await markPendingDestructiveMoveVerified(detachedReceiptId, {
      remotePath: verifiedPath,
      resourceId: verifiedResourceId,
      filename: moved.name ? normalizeYandexItemNameFromApi(moved.name) : String(entry.filename || ''),
      folder: targetFolder,
      publicUrl: moved.public_url ? normalizeYandexPublicUrlFromApi(moved.public_url) : String(identityReceipt.publicUrl || '')
    });
    const finalized = await finalizeReadMoveJournalFromReceipt(detachedReceiptId, {
      readingMode: 'read',
      remotePath: verifiedPath,
      folder: targetFolder,
      filename: moved.name ? normalizeYandexItemNameFromApi(moved.name) : String(entry.filename || ''),
      publicUrl: moved.public_url ? normalizeYandexPublicUrlFromApi(moved.public_url) : String(identityReceipt.publicUrl || ''),
      resourceId: verifiedResourceId,
      remoteIdentityProvenance: WebClipYandexRemoteIdentityAuthority.PROVIDER_VERIFIED,
      movedToReadAt: Date.now(),
      readMovePendingAt: 0,
      readMoveSourcePath: '',
      readMoveTargetPath: '',
      readMoveOperationId: '',
      readMoveLastError: ''
    });
    if (finalized?.cancelled) {
      emitJournalOperationProgress(
        operationId,
        'complete',
        'Файл подтверждён в Upload; исходная запись журнала была очищена/заменена и не восстановлена.',
        100,
        'partial',
        { remotePath: verifiedPath, journalSuperseded: true }
      );
      return { ok: true, entry: null, remotePath: verifiedPath, operationId, journalSuperseded: true };
    }
    const updated = finalized?.entry || null;
    if (!updated) throw new Error('Не удалось атомарно финализировать запись журнала после перемещения.');
    notifyJournalChanged('mark-read');
    emitJournalOperationProgress(operationId, 'complete', 'Запись переведена в «Прочитано», файл находится в Upload.', 100, 'success', { remotePath: updated.remotePath });
    return { ok: true, entry: updated, remotePath: updated.remotePath, operationId };
  } catch (error) {
    if (checkpointWritten && detachedReceiptId) {
      if (moveAdmitted) {
        await markPendingDestructiveMoveFailure(detachedReceiptId, error).catch(() => {});
        activeDestructiveMoveReceipts.delete(detachedReceiptId);
        await updateReadMoveJournalCheckpointFromReceipt(detachedReceiptId, {
          readMovePendingAt: Number(entry.readMovePendingAt || 0) || Date.now(),
          readMoveTargetPath: checkpointTargetPath,
          readMoveOperationId: operationId,
          readMoveLastError: normalizeError(error).slice(0, 2000)
        }).catch(() => {});
      } else {
        await removePendingDestructiveMove(detachedReceiptId).catch(() => {});
      }
    }
    emitJournalOperationProgress(
      operationId,
      'error',
      checkpointWritten
        ? `Ошибка: ${normalizeError(error)} Detached recovery receipt сохранён после remote admission либо безопасно снят до admission.`
        : `Ошибка: ${normalizeError(error)}`,
      100,
      'error',
      { recoveryCheckpoint: checkpointWritten, detachedReceipt: Boolean(detachedReceiptId), pendingTargetPath: checkpointTargetPath }
    );
    throw error;
  }
}

function hostnameFromUrl(url) {
  try { return new URL(String(url || '')).hostname; } catch (_) { return ''; }
}

async function clearJournalEntries({ url = '', siteUrl = '', operationId = '' } = {}) {
  operationId = String(operationId || '') || makeOperationLogId('journal-clear');
  const urlKey = url ? normalizeJournalUrl(url) : '';
  const siteKey = siteUrl ? getJournalSiteKey(siteUrl) : '';
  const scope = urlKey ? 'url' : siteKey ? 'site' : 'all';
  await startOperationLog(operationId, 'journal-clear', scope === 'all' ? 'Очистка всего локального журнала' : scope === 'site' ? 'Очистка журнала сайта' : 'Очистка журнала URL', {
    scope, urlKey, siteKey
  });
  await migrateLegacyPendingJournalAppends();
  const statsToken = await beginJournalStatsMutation(`clear-${scope}`);
  let db = null;
  try {
    recordOperationStage(operationId, 'delete', scope === 'all' ? 'Удаляем все записи локального журнала…' : 'Удаляем записи выбранной области журнала…', 35, 'running', { scope });
    db = await openJournalDb();
    await runIndexedDbTransactionBounded(
      db,
      [JOURNAL_STORE, JOURNAL_META_STORE, JOURNAL_PENDING_STORE, JOURNAL_PENDING_DOWNLOAD_STORE, JOURNAL_PENDING_REMOTE_STORE, JOURNAL_PENDING_DESTRUCTIVE_STORE],
      'readwrite',
      `Очистка журнала (${scope})`,
      ({ tx, fail }) => {
        const store = tx.objectStore(JOURNAL_STORE);
        const pendingStore = tx.objectStore(JOURNAL_PENDING_STORE);
        const pendingDownloadStore = tx.objectStore(JOURNAL_PENDING_DOWNLOAD_STORE);
        const pendingRemoteStore = tx.objectStore(JOURNAL_PENDING_REMOTE_STORE);
        const destructiveStore = tx.objectStore(JOURNAL_PENDING_DESTRUCTIVE_STORE);
        touchJournalDbRevision(tx, `clear-${scope}`);
        advanceJournalResetGeneration(tx, `clear-${scope}`, fail);
        if (!urlKey && !siteKey) {
          store.clear();
          pendingStore.clear();
          reconcilePendingLocalDownloadStoreForJournalReset(pendingDownloadStore, {
            scope,
            resetAt: Date.now(),
            fail
          });
          reconcilePendingRemoteStoreForJournalReset(pendingRemoteStore, {
            scope,
            resetAt: Date.now(),
            fail
          });
          reconcilePendingDestructiveMoveStoreForJournalReset(destructiveStore, {
            scope,
            resetAt: Date.now(),
            fail
          });
          return;
        }
        const handleCursorError = (request, message) => {
          request.onerror = () => fail(request.error || new Error(message));
        };
        if (urlKey) {
          const request = store.index('urlKey').openCursor(IDBKeyRange.only(urlKey));
          request.onsuccess = () => {
            try { const cursor = request.result; if (!cursor) return; cursor.delete(); cursor.continue(); }
            catch (error) { fail(error); }
          };
          handleCursorError(request, 'Не удалось удалить записи выбранного URL из журнала.');
        } else {
          const request = store.openCursor();
          request.onsuccess = () => {
            try {
              const cursor = request.result;
              if (!cursor) return;
              const entry = cursor.value;
              if (getJournalSiteKey(entry.url || entry.hostname || '') === siteKey) cursor.delete();
              cursor.continue();
            } catch (error) { fail(error); }
          };
          handleCursorError(request, 'Не удалось удалить записи выбранного сайта из журнала.');
        }
        const prunePending = (pendingStoreToScan, label) => {
          const request = pendingStoreToScan.openCursor();
          request.onsuccess = () => {
            try {
              const cursor = request.result;
              if (!cursor) return;
              const pendingMeta = cursor.value?.data?.meta || {};
              const pendingUrlKey = normalizeJournalUrl(pendingMeta.url || '');
              const pendingSiteKey = getJournalSiteKey(pendingMeta.url || pendingMeta.hostname || '');
              if ((urlKey && pendingUrlKey === urlKey) || (siteKey && pendingSiteKey === siteKey)) cursor.delete();
              cursor.continue();
            } catch (error) { fail(error); }
          };
          handleCursorError(request, `Не удалось очистить ${label}.`);
        };
        prunePending(pendingStore, 'pending journal checkpoints');
        reconcilePendingLocalDownloadStoreForJournalReset(pendingDownloadStore, {
          urlKey,
          siteKey,
          scope,
          resetAt: Date.now(),
          fail
        });
        reconcilePendingRemoteStoreForJournalReset(pendingRemoteStore, {
          urlKey,
          siteKey,
          scope,
          resetAt: Date.now(),
          fail
        });
        reconcilePendingDestructiveMoveStoreForJournalReset(destructiveStore, {
          urlKey,
          siteKey,
          scope,
          resetAt: Date.now(),
          fail
        });
      },
      JOURNAL_CRUD_IDB_TX_TIMEOUT_MS
    );
    db.close();
    db = null;
    recordOperationStage(operationId, 'stats', 'Перестраиваем агрегированную статистику URL…', 75);
    let statsWarning = '';
    try {
      await rebuildAllUrlStats();
      await completeJournalStatsMutation(statsToken);
    } catch (error) {
      statsWarning = normalizeError(error);
      console.warn('WebClip urlStats clear deferred repair:', error);
    }
    refreshActionForAllTabs().catch(() => {});
    notifyJournalChanged('clear');
    recordOperationStage(operationId, 'complete', 'Очистка локального журнала завершена.', 100, 'success', { scope });
    return { ok: true, operationId, statsWarning };
  } catch (error) {
    if (db) db.close();
    recordOperationStage(operationId, 'error', `Ошибка очистки журнала: ${normalizeError(error)}`, 100, 'error', { scope });
    throw error;
  }
}

async function journalRevisionSnapshot(deadlineAt = Date.now() + JOURNAL_EXPORT_BATCH_TIMEOUT_MS) {
  const absoluteDeadline = Number(deadlineAt || 0);
  const remaining = () => {
    const value = absoluteDeadline - Date.now();
    if (value <= 0) {
      const error = new Error('Чтение ревизии журнала для экспорта превысило общий deadline.');
      error.code = 'JOURNAL_EXPORT_TIMEOUT';
      throw error;
    }
    return Math.max(1, Math.min(JOURNAL_EXPORT_BATCH_TIMEOUT_MS, value));
  };
  const db = await openJournalDb(remaining());
  try {
    let revision = '';
    try {
      await runIndexedDbTransactionBounded(
        db,
        JOURNAL_META_STORE,
        'readonly',
        'Чтение ревизии журнала для экспорта',
        ({ store, setResult, fail }) => {
          const request = store().get(JOURNAL_META_REVISION_KEY);
          request.onsuccess = () => {
            revision = String(request.result?.value || '');
            setResult(revision);
          };
          request.onerror = () => fail(request.error || new Error('Не удалось прочитать ревизию журнала.'));
        },
        remaining()
      );
    } catch (error) {
      if (error?.code === 'WEBCLIP_IDB_TIMEOUT') {
        const timeoutError = new Error('Чтение ревизии журнала для экспорта превысило общий deadline.');
        timeoutError.code = 'JOURNAL_EXPORT_TIMEOUT';
        throw timeoutError;
      }
      throw error;
    }
    return revision;
  } finally { db.close(); }
}

async function readJournalEntryBatch(afterId = '', limit = 250, deadline = 0) {
  const absoluteDeadline = deadline > 0 ? Number(deadline) : Date.now() + JOURNAL_EXPORT_BATCH_TIMEOUT_MS;
  const remaining = () => {
    const value = absoluteDeadline - Date.now();
    if (value <= 0) {
      const error = new Error('Чтение пакета журнала для экспорта превысило общий deadline.');
      error.code = 'JOURNAL_EXPORT_TIMEOUT';
      throw error;
    }
    return Math.max(1, Math.min(JOURNAL_EXPORT_BATCH_TIMEOUT_MS, value));
  };
  const db = await openJournalDb(remaining());
  try {
    return await new Promise((resolve, reject) => {
      // Keep serialized strings rather than a batch of full record objects so
      // a few very large records cannot multiply retained export heap.
      const items = [];
      let serializedChars = 0;
      let lastId = '';
      let pendingResult = null;
      let explicitError = null;
      const tx = db.transaction(JOURNAL_STORE, 'readonly');
      const store = tx.objectStore(JOURNAL_STORE);
      const range = afterId ? IDBKeyRange.lowerBound(afterId, true) : null;
      const request = store.openCursor(range, 'next');
      let settled = false;
      const timeoutMs = remaining();
      const finish = (fn, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fn(value);
      };
      const abortWith = (error) => {
        explicitError = error instanceof Error ? error : new Error(String(error || 'Ошибка пакетного чтения журнала.'));
        try { tx.abort(); } catch (_) { finish(reject, explicitError); }
      };
      const timer = setTimeout(() => {
        const error = new Error('Чтение пакета журнала для экспорта превысило допустимое время.');
        error.code = 'JOURNAL_EXPORT_TIMEOUT';
        abortWith(error);
      }, timeoutMs);
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || items.length >= limit) {
          pendingResult = { items, lastId, done: !cursor, serializedChars };
          // P1-086: do not settle on request.onsuccess. Leaving the cursor
          // without continue() lets the readonly transaction commit/complete;
          // only tx.oncomplete may publish this batch.
          return;
        }
        let json;
        try {
          const entry = cursor.value || {};
          const { entryRevision: _localEntryRevision, ...portableEntry } = entry;
          json = JSON.stringify({ ...portableEntry, journalComments: normalizeJournalComments(entry) });
        } catch (error) {
          abortWith(error);
          return;
        }
        if (json.length > JOURNAL_EXPORT_BATCH_MEMORY_CHARS) {
          const error = new Error('Одна запись журнала превышает безопасный memory budget пакетного экспорта.');
          error.code = 'JOURNAL_EXPORT_ENTRY_TOO_LARGE';
          abortWith(error);
          return;
        }
        if (items.length && serializedChars + json.length > JOURNAL_EXPORT_BATCH_MEMORY_CHARS) {
          // Do not advance this cursor: next batch resumes strictly after
          // lastId, so the current record is read exactly once on that batch.
          pendingResult = { items, lastId, done: false, serializedChars };
          return;
        }
        items.push(json);
        serializedChars += json.length;
        lastId = String(cursor.primaryKey || cursor.key || '');
        cursor.continue();
      };
      request.onerror = () => abortWith(request.error || new Error('Не удалось прочитать пакет записей журнала для экспорта.'));
      tx.oncomplete = () => finish(resolve, pendingResult || { items, lastId, done: true, serializedChars });
      tx.onerror = () => finish(reject, explicitError || tx.error || new Error('Не удалось завершить пакетное чтение журнала для экспорта.'));
      tx.onabort = () => finish(reject, explicitError || tx.error || new Error('Чтение пакета журнала для экспорта было прервано.'));
    });
  } finally { db.close(); }
}

function safeTextChunkEnd(text, desiredEnd) {
  let end = Math.max(0, Math.min(text.length, desiredEnd));
  if (end > 0 && end < text.length) {
    const code = text.charCodeAt(end - 1);
    if (code >= 0xD800 && code <= 0xDBFF) end -= 1;
  }
  return end;
}

async function stageFullJournalExportOnce(buildDeadline = Date.now() + JOURNAL_EXPORT_BUILD_TIMEOUT_MS) {
  const assertBuildDeadline = () => {
    if (Date.now() >= buildDeadline) {
      const error = new Error(`Формирование полного журнала превысило безопасный предел ${Math.round(JOURNAL_EXPORT_BUILD_TIMEOUT_MS / 60000)} мин.`);
      error.code = 'JOURNAL_EXPORT_TIMEOUT';
      throw error;
    }
  };
  assertBuildDeadline();
  const revisionBefore = await journalRevisionSnapshot(buildDeadline);
  const manifest = chrome.runtime.getManifest();
  const exportedAt = new Date().toISOString();
  const stagingKey = `journal-export-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  let chunkIndex = 0;
  let totalChars = 0;
  let totalBytes = 0;
  let entryCount = 0;
  let buffer = '';

  const flushBuffer = async () => {
    if (!buffer) return;
    assertBuildDeadline();
    const chunk = buffer;
    buffer = '';
    const blob = new Blob([chunk], { type: 'application/json;charset=utf-8' });
    totalBytes += blob.size;
    if (totalBytes > MAX_JOURNAL_EXPORT_BYTES) {
      throw new Error(`Полный журнал превышает безопасный предел экспорта ${Math.floor(MAX_JOURNAL_EXPORT_BYTES / 1024 / 1024)} МБ в UTF-8.`);
    }
    if (blob.size > 8 * 1024 * 1024) {
      throw new Error('Один chunk экспорта журнала превышает безопасный byte-limit.');
    }
    if (chunkIndex % 8 === 0) {
      await ensureStorageBudget(Math.max(blob.size, 8 * 1024 * 1024), 'chunked экспорта журнала');
    }
    await putTransferRecord({
      id: transferChunkId(stagingKey, chunkIndex),
      kind: 'journal-export-chunk-blob',
      baseId: stagingKey,
      chunkIndex,
      blob,
      charCount: chunk.length,
      createdAt: Date.now()
    }, buildDeadline);
    chunkIndex += 1;
  };

  const appendText = async (value) => {
    let text = String(value || '');
    if (totalChars + text.length > MAX_JOURNAL_EXPORT_TEXT_CHARS) {
      throw new Error(`Полный журнал превышает безопасный предел экспорта ${Math.floor(MAX_JOURNAL_EXPORT_TEXT_CHARS / 1024 / 1024)} МБ. Требуется уменьшить объём журнала или использовать будущий архивный формат.`);
    }
    totalChars += text.length;
    while (text) {
      const remaining = TRANSFER_TEXT_CHUNK_CHARS - buffer.length;
      if (remaining <= 0) {
        await flushBuffer();
        continue;
      }
      const end = safeTextChunkEnd(text, remaining);
      if (end <= 0) {
        await flushBuffer();
        continue;
      }
      buffer += text.slice(0, end);
      text = text.slice(end);
      if (buffer.length >= TRANSFER_TEXT_CHUNK_CHARS) await flushBuffer();
    }
  };

  try {
    const header = {
      schema: JOURNAL_EXPORT_SCHEMA,
      schemaVersion: JOURNAL_EXPORT_VERSION,
      backupKind: 'full-journal',
      exportedAt,
      extension: {
        name: String(manifest?.name || 'WebClip PDF Prototype'),
        version: String(manifest?.version || '')
      }
    };
    const headerJson = JSON.stringify(header);
    await appendText(`${headerJson.slice(0, -1)},"journal":{"entries":[`);

    let afterId = '';
    let first = true;
    for (let batchNo = 0; batchNo < 100000; batchNo += 1) {
      assertBuildDeadline();
      const batch = await readJournalEntryBatch(afterId, 250, buildDeadline);
      for (const json of batch.items) {
        await appendText(`${first ? '' : ','}${json}`);
        first = false;
        entryCount += 1;
      }
      if (!batch.items.length || batch.done) break;
      if (!batch.lastId || batch.lastId === afterId) throw new Error('Экспорт журнала остановлен: курсор IndexedDB не продвинулся.');
      afterId = batch.lastId;
    }
    await appendText(`],"entryCount":${entryCount}}}`);
    await flushBuffer();

    const revisionAfter = await journalRevisionSnapshot(buildDeadline);
    if (revisionBefore !== revisionAfter) {
      const error = new Error('Журнал изменился во время формирования резервной копии. Экспорт будет повторён с актуальным снимком.');
      error.code = 'JOURNAL_CHANGED_DURING_EXPORT';
      throw error;
    }

    await putTransferRecord({
      id: stagingKey,
      kind: 'journal-export-manifest',
      chunkCount: chunkIndex,
      totalChars,
      totalBytes,
      entryCount,
      exportedAt,
      createdAt: Date.now()
    }, buildDeadline);
    return { stagingKey, chunkCount: chunkIndex, totalChars, totalBytes, entryCount, exportedAt };
  } catch (error) {
    await deleteTransferPayloadGroup(stagingKey, buildDeadline).catch(() => {});
    throw error;
  }
}

async function stageFullJournalExport() {
  let lastError = null;
  const buildDeadline = Date.now() + JOURNAL_EXPORT_BUILD_TIMEOUT_MS;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await stageFullJournalExportOnce(buildDeadline);
    } catch (error) {
      lastError = error;
      if (error?.code !== 'JOURNAL_CHANGED_DURING_EXPORT' || attempt > 0) throw error;
    }
  }
  throw lastError || new Error('Не удалось сформировать согласованный снимок журнала.');
}

function boundedImportString(value, maxChars) {
  return String(value == null ? '' : value).slice(0, Math.max(0, Number(maxChars) || 0));
}

function normalizeImportedHttpUrl(value) {
  const raw = boundedImportString(value, MAX_IMPORTED_URL_CHARS).trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    url.hash = '';
    return url.toString();
  } catch (_) {
    return '';
  }
}

function normalizeImportedHttpsUrl(value) {
  const raw = boundedImportString(value, MAX_IMPORTED_URL_CHARS).trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch (_) {
    return '';
  }
}

function assertJournalCommentBudget(comments, legacyComment = '') {
  const list = Array.isArray(comments) ? comments : [];
  if (list.length > MAX_IMPORTED_COMMENTS_PER_ENTRY) {
    const error = new Error(`В одной записи журнала допускается не более ${MAX_IMPORTED_COMMENTS_PER_ENTRY} комментариев.`);
    error.code = 'JOURNAL_COMMENTS_TOO_MANY';
    throw error;
  }
  let totalChars = String(legacyComment || '').length;
  for (const item of list) {
    const text = String(item?.text ?? item?.comment ?? '');
    if (text.length > MAX_IMPORTED_COMMENT_CHARS) {
      const error = new Error(`Один комментарий превышает безопасный предел ${MAX_IMPORTED_COMMENT_CHARS} символов.`);
      error.code = 'JOURNAL_COMMENT_TOO_LARGE';
      throw error;
    }
    totalChars += text.length;
    if (totalChars > MAX_JOURNAL_COMMENTS_TOTAL_CHARS) {
      const error = new Error('Суммарный объём комментариев одной записи журнала превышает безопасный предел.');
      error.code = 'JOURNAL_COMMENTS_TOTAL_TOO_LARGE';
      throw error;
    }
  }
  return totalChars;
}

function sanitizeImportedComments(raw, entryMeta) {
  const list = Array.isArray(raw) ? raw : [];
  const legacy = String(entryMeta.journalComment || '');
  if (legacy.length > MAX_IMPORTED_COMMENT_CHARS) {
    const error = new Error(`Комментарий записи превышает безопасный предел ${MAX_IMPORTED_COMMENT_CHARS} символов.`);
    error.code = 'JOURNAL_COMMENT_TOO_LARGE';
    throw error;
  }
  assertJournalCommentBudget(list, legacy);
  return normalizeJournalComments({
    id: boundedImportString(entryMeta.id || '', MAX_IMPORTED_ENTRY_ID_CHARS),
    createdAt: Number(entryMeta.createdAt || 0),
    journalComments: list.map((item) => item && typeof item === 'object'
      ? {
          id: boundedImportString(item.id || '', MAX_IMPORTED_COMMENT_ID_CHARS),
          text: String(item.text ?? item.comment ?? ''),
          createdAt: Number(item.createdAt || entryMeta.createdAt || 0),
          updatedAt: Number(item.updatedAt || item.createdAt || entryMeta.createdAt || 0),
          deletedAt: Math.max(0, Number(item.deletedAt || 0))
        }
      : item),
    journalComment: legacy,
    journalCommentUpdatedAt: Number(entryMeta.journalCommentUpdatedAt || 0)
  });
}

function normalizeImportedJournalEntry(raw, index, seenIds = null, forcedId = '') {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`Некорректная запись журнала №${index + 1}.`);
  let id = boundedImportString(forcedId || raw.id || '', MAX_IMPORTED_ENTRY_ID_CHARS).trim();
  if (!id || (!forcedId && seenIds?.has(id))) id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`;
  if (seenIds) seenIds.add(id);
  const url = normalizeImportedHttpUrl(raw.url || '');
  const hostname = boundedImportString(raw.hostname || (() => { try { return new URL(url).hostname; } catch (_) { return ''; } })(), 255);
  const snapshot = sanitizeSelectionSnapshot(raw.selectionSnapshot || {}, { rejectOverflow: true });
  const createdAt = Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now();
  const importedDayKey = boundedImportString(raw.localDayKey || '', 32).trim();
  const importedOperationIdRaw = String(raw.operationId || '').trim();
  const importedOperationId = importedOperationIdRaw.length <= MAX_OPERATION_ID_CHARS && /^[A-Za-z0-9._:-]+$/.test(importedOperationIdRaw) ? importedOperationIdRaw : '';
  const importedSourceReceipt = importedOperationId
    ? sanitizePdfSourceReceipt(raw.sourceReceipt, { operationId: importedOperationId })
    : null;
  return {
    id,
    entryRevision: JOURNAL_INITIAL_ENTRY_REVISION,
    createdAt,
    localDayKey: /^\d{4}-\d{2}-\d{2}$/.test(importedDayKey) ? importedDayKey : localDayKey(createdAt),
    operationDateTime: boundedImportString(raw.operationDateTime || '', MAX_IMPORTED_DATETIME_CHARS),
    operationId: importedOperationId,
    ...(importedSourceReceipt ? { sourceReceipt: importedSourceReceipt } : {}),
    destination: raw.destination === 'yandex' ? 'yandex' : 'download',
    readingMode: raw.destination === 'yandex' && raw.readingMode === 'later' ? 'later' : 'read',
    filename: boundedImportString(raw.filename || '', 512),
    remotePath: normalizeDiskPath(boundedImportString(raw.remotePath || '', MAX_IMPORTED_PATH_CHARS)),
    folder: normalizeDiskPath(boundedImportString(raw.folder || '', MAX_IMPORTED_PATH_CHARS)),
    publicUrl: normalizeImportedHttpsUrl(raw.publicUrl || ''),
    resourceId: boundedImportString(raw.resourceId || '', MAX_YANDEX_RESOURCE_ID_CHARS),
    accountUid: boundedImportString(raw.accountUid || '', MAX_YANDEX_ACCOUNT_FIELD_CHARS),
    rootPath: normalizeDiskPath(boundedImportString(raw.rootPath || '', MAX_IMPORTED_PATH_CHARS)),
    remoteIdentityProvenance: WebClipYandexRemoteIdentityAuthority.normalizeProvenance(raw.remoteIdentityProvenance, { imported: true }),
    hostname,
    siteAddress: boundedImportString(raw.siteAddress || '', MAX_IMPORTED_URL_CHARS),
    url,
    urlKey: normalizeJournalUrl(url),
    siteKey: getJournalSiteKey(url || hostname),
    title: boundedImportString(raw.title || '', 4000),
    fileComment: boundedImportString(raw.fileComment || '', MAX_IMPORTED_COMMENT_CHARS),
    resourceReport: sanitizePdfResourceReport(raw.resourceReport),
    journalComment: boundedImportString(raw.journalComment || '', MAX_IMPORTED_COMMENT_CHARS),
    journalCommentUpdatedAt: Number(raw.journalCommentUpdatedAt || 0),
    journalComments: sanitizeImportedComments(raw.journalComments, {
      id,
      createdAt,
      journalComment: boundedImportString(raw.journalComment || '', MAX_IMPORTED_COMMENT_CHARS),
      journalCommentUpdatedAt: Number(raw.journalCommentUpdatedAt || 0)
    }),
    movedToReadAt: Number(raw.movedToReadAt || 0),
    readMovePendingAt: Number(raw.readMovePendingAt || 0),
    readMoveSourcePath: normalizeDiskPath(boundedImportString(raw.readMoveSourcePath || '', MAX_IMPORTED_PATH_CHARS)),
    readMoveTargetPath: normalizeDiskPath(boundedImportString(raw.readMoveTargetPath || '', MAX_IMPORTED_PATH_CHARS)),
    readMoveOperationId: boundedImportString(raw.readMoveOperationId || '', 180),
    readMoveLastError: boundedImportString(raw.readMoveLastError || '', 2000),
    selectionSnapshot: snapshot,
    includeCount: snapshot.includes.length,
    excludeCount: snapshot.excludes.length
  };
}

function makeJournalImportStageId() {
  return `normalized-import-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function makeJournalImportEntryStageKey(importId, entryId) {
  return `${String(importId || '')}:${String(entryId || '')}`;
}

async function writeJournalImportStageBatch(db, importId, batch) {
  if (!batch.length) return;
  await new Promise((resolve, reject) => {
    const tx = db.transaction(JOURNAL_IMPORT_STAGING_STORE, 'readwrite');
    const store = tx.objectStore(JOURNAL_IMPORT_STAGING_STORE);
    let position = 0;
    let abortError = null;
    const timer = setTimeout(() => {
      abortError = new Error('Подготовка нормализованных записей импорта превысила безопасный deadline.');
      abortError.code = 'JOURNAL_IMPORT_STAGING_TIMEOUT';
      try { tx.abort(); } catch (_) {}
    }, 30_000);

    const fail = (error) => {
      abortError = error instanceof Error ? error : new Error(String(error || 'Ошибка staging импорта.'));
      try { tx.abort(); } catch (_) {}
    };

    const writeNext = () => {
      if (position >= batch.length) return;
      const item = batch[position];
      let candidate = boundedImportString(item.raw?.id || '', MAX_IMPORTED_ENTRY_ID_CHARS).trim();
      if (!candidate) candidate = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${item.index}-${Math.random().toString(16).slice(2)}`;
      let attempts = 0;
      const findFreeId = () => {
        attempts += 1;
        if (attempts > 16) {
          candidate = `${Date.now()}-${item.index}-${Math.random().toString(16).slice(2)}`.slice(0, MAX_IMPORTED_ENTRY_ID_CHARS);
        }
        const key = makeJournalImportEntryStageKey(importId, candidate);
        const get = store.get(key);
        get.onerror = () => fail(get.error || new Error('Не удалось проверить идентификатор импортируемой записи.'));
        get.onsuccess = () => {
          if (get.result) {
            candidate = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${item.index}-${Math.random().toString(16).slice(2)}`;
            findFreeId();
            return;
          }
          let normalized;
          try {
            normalized = normalizeImportedJournalEntry(item.raw, item.index, null, candidate);
          } catch (error) {
            fail(error);
            return;
          }
          const put = store.put({
            key,
            importId,
            entryId: normalized.id,
            entry: normalized,
            createdAt: Date.now()
          });
          put.onerror = () => fail(put.error || new Error('Не удалось записать нормализованную запись импорта.'));
          put.onsuccess = () => {
            item.raw = null;
            position += 1;
            writeNext();
          };
        };
      };
      findFreeId();
    };

    writeNext();
    tx.oncomplete = () => { clearTimeout(timer); resolve(); };
    tx.onerror = () => { clearTimeout(timer); reject(abortError || tx.error || new Error('Ошибка staging нормализованных записей импорта.')); };
    tx.onabort = () => { clearTimeout(timer); reject(abortError || tx.error || new Error('Staging нормализованных записей импорта был прерван.')); };
  });
}

async function deleteJournalImportStage(importId) {
  const id = String(importId || '');
  if (!id) return 0;
  const db = await openJournalDb();
  let deleted = 0;
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(JOURNAL_IMPORT_STAGING_STORE, 'readwrite');
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        try { tx.abort(); } catch (_) {}
      }, 30_000);
      const req = tx.objectStore(JOURNAL_IMPORT_STAGING_STORE).index('importId').openCursor(IDBKeyRange.only(id));
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        cursor.delete();
        deleted += 1;
        cursor.continue();
      };
      req.onerror = () => reject(req.error || new Error('Не удалось очистить staging импорта.'));
      tx.oncomplete = () => { clearTimeout(timer); resolve(); };
      tx.onerror = () => { clearTimeout(timer); reject(tx.error || new Error('Ошибка очистки staging импорта.')); };
      tx.onabort = () => {
        clearTimeout(timer);
        const error = new Error(timedOut ? 'Очистка staging импорта превысила deadline.' : 'Очистка staging импорта прервана.');
        if (timedOut) error.code = 'JOURNAL_IMPORT_STAGING_TIMEOUT';
        reject(tx.error || error);
      };
    });
  } finally { db.close(); }
  return deleted;
}

async function cleanupExpiredJournalImportStaging() {
  const cutoff = Date.now() - JOURNAL_IMPORT_STAGING_TTL_MS;
  const db = await openJournalDb(MAINTENANCE_IDB_TX_TIMEOUT_MS);
  let deleted = 0;
  try {
    await runIndexedDbTransactionBounded(
      db,
      JOURNAL_IMPORT_STAGING_STORE,
      'readwrite',
      'Очистка просроченного staging импорта',
      ({ store, fail }) => {
        const range = IDBKeyRange.upperBound(cutoff, true);
        const req = store().index('createdAt').openCursor(range, 'next');
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) return;
          cursor.delete();
          deleted += 1;
          cursor.continue();
        };
        req.onerror = () => fail(req.error || new Error('Не удалось очистить просроченный staging импорта.'));
      },
      MAINTENANCE_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
  return deleted;
}

function journalImportStagingGeneration(manifest) {
  const createdAt = Math.max(0, Math.floor(Number(manifest?.createdAt) || 0));
  if (manifest?.kind === 'journal-import-manifest') {
    const chunkCount = Math.max(0, Math.floor(Number(manifest.chunkCount) || 0));
    const totalBytes = Math.max(0, Math.floor(Number(manifest.totalBytes) || 0));
    return `manifest:${createdAt}:${chunkCount}:${totalBytes}`;
  }
  const textLength = typeof manifest?.text === 'string' ? manifest.text.length : 0;
  return `legacy:${createdAt}:${textLength}`;
}

function createJournalImportStreamObservation() {
  const digest = WebClipSha256.create();
  let stagingGeneration = '';
  return {
    onManifest(manifest) {
      if (stagingGeneration) throw new Error('Поток импорта сообщил manifest более одного раза.');
      stagingGeneration = journalImportStagingGeneration(manifest);
    },
    onBytes(bytes) {
      digest.update(bytes);
    },
    finish(inspected) {
      if (!stagingGeneration) throw new Error('Поток импорта не сообщил поколение staging.');
      return {
        ...inspected,
        stagingGeneration,
        contentSha256: digest.digestHex()
      };
    }
  };
}

function journalImportPreviewMismatch(detail = '') {
  const suffix = String(detail || '').trim();
  const error = new Error(`Копия или параметры импорта изменились после проверки${suffix ? `: ${suffix}` : ''}. Повторите preview перед заменой журнала.`);
  error.code = 'JOURNAL_IMPORT_PREVIEW_MISMATCH';
  return error;
}

function journalImportStaleRevision() {
  const error = new Error('Журнал изменился после проверки резервной копии. Повторите preview перед заменой журнала.');
  error.code = 'JOURNAL_IMPORT_STALE_REVISION';
  return error;
}

function normalizeJournalImportPreviewReceipt(value, expected = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw journalImportPreviewMismatch('отсутствует квитанция preview');
  const fields = [
    'version',
    'mode',
    'stagingKey',
    'stagingGeneration',
    'source',
    'operationId',
    'contentSha256',
    'entryCount',
    'exportedAt',
    'expectedJournalRevision'
  ];
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = [...fields].sort();
  if (actualKeys.length !== expectedKeys.length || actualKeys.some((key, index) => key !== expectedKeys[index])) {
    throw journalImportPreviewMismatch('состав квитанции не совпадает с контрактом');
  }
  if (value.version !== JOURNAL_IMPORT_PREVIEW_RECEIPT_VERSION) throw journalImportPreviewMismatch('неподдерживаемая версия квитанции');
  if (value.mode !== 'replace') throw journalImportPreviewMismatch('режим не равен replace');
  const stagingKey = typeof value.stagingKey === 'string' ? value.stagingKey : '';
  const stagingGeneration = typeof value.stagingGeneration === 'string' ? value.stagingGeneration : '';
  const source = typeof value.source === 'string' ? value.source : '';
  const operationId = typeof value.operationId === 'string' ? value.operationId : '';
  const contentSha256 = typeof value.contentSha256 === 'string' ? value.contentSha256 : '';
  const exportedAt = typeof value.exportedAt === 'string' ? value.exportedAt : '';
  const expectedJournalRevision = typeof value.expectedJournalRevision === 'string' ? value.expectedJournalRevision : '';
  if (!stagingKey || stagingKey.length > 240 || stagingKey.trim() !== stagingKey) throw journalImportPreviewMismatch('некорректный stagingKey');
  if (!/^(?:manifest|legacy):[0-9]+:[0-9]+(?::[0-9]+)?$/.test(stagingGeneration) || stagingGeneration.length > 240) {
    throw journalImportPreviewMismatch('некорректное поколение staging');
  }
  if (source !== 'file' && source !== 'yandex') throw journalImportPreviewMismatch('некорректный источник');
  if (!operationId || operationId.length > 240) throw journalImportPreviewMismatch('некорректный operationId');
  if (!/^[0-9a-f]{64}$/.test(contentSha256)) throw journalImportPreviewMismatch('некорректный SHA-256');
  if (!Number.isSafeInteger(value.entryCount) || value.entryCount < 0 || value.entryCount > 100000) {
    throw journalImportPreviewMismatch('некорректное число записей');
  }
  if (exportedAt.length > MAX_IMPORTED_DATETIME_CHARS) throw journalImportPreviewMismatch('некорректная дата экспорта');
  if (expectedJournalRevision.length > 240) throw journalImportPreviewMismatch('некорректная ожидаемая ревизия журнала');
  const receipt = Object.freeze({
    version: JOURNAL_IMPORT_PREVIEW_RECEIPT_VERSION,
    mode: 'replace',
    stagingKey,
    stagingGeneration,
    source,
    operationId,
    contentSha256,
    entryCount: value.entryCount,
    exportedAt,
    expectedJournalRevision
  });
  for (const [key, expectedValue] of Object.entries(expected || {})) {
    if (!Object.prototype.hasOwnProperty.call(receipt, key) || receipt[key] !== expectedValue) {
      throw journalImportPreviewMismatch(`поле ${key} не совпадает`);
    }
  }
  return receipt;
}

function createJournalImportPreviewReceipt(stagingKey, source, operationId, inspected, expectedJournalRevision) {
  return normalizeJournalImportPreviewReceipt({
    version: JOURNAL_IMPORT_PREVIEW_RECEIPT_VERSION,
    mode: 'replace',
    stagingKey,
    stagingGeneration: inspected?.stagingGeneration,
    source,
    operationId,
    contentSha256: inspected?.contentSha256,
    entryCount: inspected?.entryCount,
    exportedAt: String(inspected?.exportedAt || ''),
    expectedJournalRevision: String(expectedJournalRevision || '')
  });
}

function assertPreparedJournalImportMatchesPreview(prepared, receipt) {
  normalizeJournalImportPreviewReceipt(receipt, {
    stagingGeneration: String(prepared?.stagingGeneration || ''),
    contentSha256: String(prepared?.contentSha256 || ''),
    entryCount: Math.max(0, Number(prepared?.entryCount) || 0),
    exportedAt: String(prepared?.exportedAt || '')
  });
}

function normalizeJournalImportOwnerSessionId(value) {
  const id = String(value || '').trim();
  if (!id || id.length > 180 || !/^[A-Za-z0-9._:-]+$/.test(id)) {
    const error = new Error('Некорректный идентификатор страницы-владельца импорта журнала.');
    error.code = 'JOURNAL_IMPORT_OWNER_INVALID';
    throw error;
  }
  return id;
}

function normalizeJournalImportLeaseToken(value) {
  const token = String(value || '').trim();
  if (!token || token.length > 180 || !/^[A-Za-z0-9._:-]+$/.test(token)) {
    const error = new Error('Некорректный токен владения импортом журнала.');
    error.code = 'JOURNAL_IMPORT_LEASE_INVALID';
    throw error;
  }
  return token;
}

function journalImportLeaseError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function journalImportGenerationCreatedAt(generation) {
  const match = /^(?:manifest|legacy):([0-9]+):/.exec(String(generation || ''));
  const value = match ? Number(match[1]) : 0;
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}

function normalizeJournalImportLeaseRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw journalImportLeaseError('JOURNAL_IMPORT_LEASE_CORRUPT', 'Checkpoint импорта журнала повреждён.');
  }
  const fields = [
    'version',
    'leaseToken',
    'ownerSessionId',
    'previewReceipt',
    'createdAt',
    'updatedAt',
    'leaseExpiresAt',
    'hardExpiresAt'
  ];
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = [...fields].sort();
  if (actualKeys.length !== expectedKeys.length || actualKeys.some((key, index) => key !== expectedKeys[index])) {
    throw journalImportLeaseError('JOURNAL_IMPORT_LEASE_CORRUPT', 'Состав checkpoint импорта журнала не совпадает с контрактом.');
  }
  if (value.version !== JOURNAL_IMPORT_LEASE_VERSION) {
    throw journalImportLeaseError('JOURNAL_IMPORT_LEASE_CORRUPT', 'Версия checkpoint импорта журнала не поддерживается.');
  }
  const leaseToken = normalizeJournalImportLeaseToken(value.leaseToken);
  const ownerSessionId = normalizeJournalImportOwnerSessionId(value.ownerSessionId);
  const previewReceipt = normalizeJournalImportPreviewReceipt(value.previewReceipt);
  const createdAt = Number(value.createdAt);
  const updatedAt = Number(value.updatedAt);
  const leaseExpiresAt = Number(value.leaseExpiresAt);
  const hardExpiresAt = Number(value.hardExpiresAt);
  if (
    ![createdAt, updatedAt, leaseExpiresAt, hardExpiresAt].every(Number.isSafeInteger)
    || createdAt <= 0
    || updatedAt < createdAt
    || leaseExpiresAt < createdAt
    || hardExpiresAt < leaseExpiresAt
    || hardExpiresAt > createdAt + JOURNAL_IMPORT_CHECKPOINT_TTL_MS
  ) {
    throw journalImportLeaseError('JOURNAL_IMPORT_LEASE_CORRUPT', 'Временные границы checkpoint импорта журнала повреждены.');
  }
  return Object.freeze({
    version: JOURNAL_IMPORT_LEASE_VERSION,
    leaseToken,
    ownerSessionId,
    previewReceipt,
    createdAt,
    updatedAt,
    leaseExpiresAt,
    hardExpiresAt
  });
}

function makeJournalImportLeaseRecord(previewReceiptValue, ownerSessionId, now = Date.now(), leaseToken = '') {
  const previewReceipt = normalizeJournalImportPreviewReceipt(previewReceiptValue);
  const owner = normalizeJournalImportOwnerSessionId(ownerSessionId);
  const createdAt = journalImportGenerationCreatedAt(previewReceipt.stagingGeneration);
  if (!createdAt || createdAt > now + 60_000) {
    throw journalImportLeaseError('JOURNAL_IMPORT_LEASE_CORRUPT', 'Поколение staging не содержит допустимое время создания.');
  }
  const hardExpiresAt = createdAt + JOURNAL_IMPORT_CHECKPOINT_TTL_MS;
  if (hardExpiresAt <= now) {
    throw journalImportLeaseError('JOURNAL_IMPORT_CHECKPOINT_EXPIRED', 'Подготовленный импорт уже превысил жёсткий срок хранения.');
  }
  const token = leaseToken
    ? normalizeJournalImportLeaseToken(leaseToken)
    : normalizeJournalImportLeaseToken(crypto.randomUUID ? crypto.randomUUID() : `${now}-${Math.random().toString(16).slice(2)}`);
  return normalizeJournalImportLeaseRecord({
    version: JOURNAL_IMPORT_LEASE_VERSION,
    leaseToken: token,
    ownerSessionId: owner,
    previewReceipt,
    createdAt,
    updatedAt: now,
    leaseExpiresAt: Math.min(hardExpiresAt, now + JOURNAL_IMPORT_LEASE_TTL_MS),
    hardExpiresAt
  });
}

async function readJournalImportLeaseRecord() {
  const db = await openJournalDb(MAINTENANCE_IDB_TX_TIMEOUT_MS);
  let value = null;
  try {
    await runIndexedDbTransactionBounded(
      db,
      JOURNAL_META_STORE,
      'readonly',
      'Чтение checkpoint импорта журнала',
      ({ store, setResult, fail }) => {
        const req = store().get(JOURNAL_IMPORT_LEASE_KEY);
        req.onsuccess = () => {
          value = req.result?.value || null;
          setResult(value);
        };
        req.onerror = () => fail(req.error || new Error('Не удалось прочитать checkpoint импорта журнала.'));
      },
      MAINTENANCE_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
  return value ? normalizeJournalImportLeaseRecord(value) : null;
}

async function removeJournalImportLeaseIfToken(leaseToken) {
  const token = normalizeJournalImportLeaseToken(leaseToken);
  const db = await openJournalDb(MAINTENANCE_IDB_TX_TIMEOUT_MS);
  let removed = null;
  try {
    await runIndexedDbTransactionBounded(
      db,
      JOURNAL_META_STORE,
      'readwrite',
      'Освобождение checkpoint импорта журнала',
      ({ store, setResult, fail }) => {
        const meta = store();
        const req = meta.get(JOURNAL_IMPORT_LEASE_KEY);
        req.onsuccess = () => {
          const raw = req.result?.value || null;
          if (!raw) return;
          let current;
          try { current = normalizeJournalImportLeaseRecord(raw); } catch (error) { fail(error); return; }
          if (current.leaseToken !== token) return;
          removed = current;
          meta.delete(JOURNAL_IMPORT_LEASE_KEY);
          setResult(current);
        };
        req.onerror = () => fail(req.error || new Error('Не удалось проверить checkpoint перед освобождением.'));
      },
      MAINTENANCE_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
  return removed;
}

async function acquireJournalImportLease(previewReceiptValue, ownerSessionId) {
  const previewReceipt = normalizeJournalImportPreviewReceipt(previewReceiptValue);
  const next = makeJournalImportLeaseRecord(previewReceipt, ownerSessionId);
  const now = Date.now();
  const db = await openJournalDb(MAINTENANCE_IDB_TX_TIMEOUT_MS);
  let orphanedStagingKey = '';
  try {
    await runIndexedDbTransactionBounded(
      db,
      JOURNAL_META_STORE,
      'readwrite',
      'Получение lease импорта журнала',
      ({ store, setResult, fail }) => {
        const meta = store();
        const req = meta.get(JOURNAL_IMPORT_LEASE_KEY);
        req.onsuccess = () => {
          const raw = req.result?.value || null;
          if (raw) {
            let current;
            try { current = normalizeJournalImportLeaseRecord(raw); } catch (error) { fail(error); return; }
            if (current.hardExpiresAt > now) {
              fail(journalImportLeaseError(
                'JOURNAL_IMPORT_CHECKPOINT_EXISTS',
                'Уже есть незавершённый импорт журнала. Возобновите или отмените его на странице Журнала.'
              ));
              return;
            }
            orphanedStagingKey = current.previewReceipt.stagingKey;
          }
          meta.put({ key: JOURNAL_IMPORT_LEASE_KEY, value: next, changedAt: now, reason: 'journal-import-preview-lease' });
          setResult(next);
        };
        req.onerror = () => fail(req.error || new Error('Не удалось проверить текущий lease импорта журнала.'));
      },
      MAINTENANCE_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
  if (orphanedStagingKey && orphanedStagingKey !== previewReceipt.stagingKey) {
    await deleteTransferPayloadGroup(orphanedStagingKey).catch(() => {});
  }
  return next;
}

function journalImportLeaseResponse(record, now = Date.now()) {
  const current = normalizeJournalImportLeaseRecord(record);
  const receipt = current.previewReceipt;
  return {
    ok: true,
    pending: true,
    available: current.leaseExpiresAt <= now,
    retryAfterMs: Math.max(0, current.leaseExpiresAt - now),
    checkpointToken: current.leaseToken,
    stagingKey: receipt.stagingKey,
    source: receipt.source,
    operationId: receipt.operationId,
    entryCount: receipt.entryCount,
    exportedAt: receipt.exportedAt,
    contentSha256: receipt.contentSha256,
    leaseExpiresAt: current.leaseExpiresAt,
    hardExpiresAt: current.hardExpiresAt
  };
}

async function getPendingJournalImportLease() {
  const current = await readJournalImportLeaseRecord();
  if (!current) return { ok: true, pending: false };
  const now = Date.now();
  const key = current.previewReceipt.stagingKey;
  if (current.hardExpiresAt <= now) {
    const removed = await removeJournalImportLeaseIfToken(current.leaseToken);
    if (removed) await deleteTransferPayloadGroup(key).catch(() => {});
    return { ok: true, pending: false, reclaimed: Boolean(removed) };
  }
  const manifest = await getTransferImportRecord(key, MAINTENANCE_IDB_TX_TIMEOUT_MS);
  const generation = manifest ? journalImportStagingGeneration(manifest) : '';
  if (!manifest || generation !== current.previewReceipt.stagingGeneration) {
    const removed = await removeJournalImportLeaseIfToken(current.leaseToken);
    if (removed) await deleteTransferPayloadGroup(key).catch(() => {});
    return { ok: true, pending: false, reclaimed: Boolean(removed), invalidated: true };
  }
  return journalImportLeaseResponse(current, now);
}

async function renewJournalImportLease(leaseToken, ownerSessionId) {
  const token = normalizeJournalImportLeaseToken(leaseToken);
  const owner = normalizeJournalImportOwnerSessionId(ownerSessionId);
  const now = Date.now();
  const db = await openJournalDb(MAINTENANCE_IDB_TX_TIMEOUT_MS);
  let renewed = null;
  try {
    await runIndexedDbTransactionBounded(
      db,
      JOURNAL_META_STORE,
      'readwrite',
      'Продление lease импорта журнала',
      ({ store, setResult, fail }) => {
        const meta = store();
        const req = meta.get(JOURNAL_IMPORT_LEASE_KEY);
        req.onsuccess = () => {
          let current;
          try { current = normalizeJournalImportLeaseRecord(req.result?.value || null); } catch (error) { fail(error); return; }
          if (current.leaseToken !== token || current.ownerSessionId !== owner) {
            fail(journalImportLeaseError('JOURNAL_IMPORT_LEASE_LOST', 'Владение подготовленным импортом перешло другой странице.'));
            return;
          }
          if (current.leaseExpiresAt <= now || current.hardExpiresAt <= now) {
            fail(journalImportLeaseError('JOURNAL_IMPORT_LEASE_EXPIRED', 'Lease подготовленного импорта истёк. Возобновите импорт явно.'));
            return;
          }
          renewed = normalizeJournalImportLeaseRecord({
            ...current,
            updatedAt: now,
            leaseExpiresAt: Math.min(current.hardExpiresAt, now + JOURNAL_IMPORT_LEASE_TTL_MS)
          });
          meta.put({ key: JOURNAL_IMPORT_LEASE_KEY, value: renewed, changedAt: now, reason: 'journal-import-lease-renew' });
          setResult(renewed);
        };
        req.onerror = () => fail(req.error || new Error('Не удалось прочитать lease перед продлением.'));
      },
      MAINTENANCE_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
  return {
    ok: true,
    leaseToken: renewed.leaseToken,
    leaseExpiresAt: renewed.leaseExpiresAt,
    hardExpiresAt: renewed.hardExpiresAt
  };
}

async function expireJournalImportLeaseIfToken(leaseToken) {
  const token = normalizeJournalImportLeaseToken(leaseToken);
  const now = Date.now();
  const db = await openJournalDb(MAINTENANCE_IDB_TX_TIMEOUT_MS);
  try {
    await runIndexedDbTransactionBounded(
      db,
      JOURNAL_META_STORE,
      'readwrite',
      'Возврат checkpoint импорта в состояние ожидания',
      ({ store, fail }) => {
        const meta = store();
        const req = meta.get(JOURNAL_IMPORT_LEASE_KEY);
        req.onsuccess = () => {
          let current;
          try { current = normalizeJournalImportLeaseRecord(req.result?.value || null); } catch (error) { fail(error); return; }
          if (current.leaseToken !== token) return;
          const expired = normalizeJournalImportLeaseRecord({
            ...current,
            updatedAt: now,
            leaseExpiresAt: Math.min(current.hardExpiresAt, now)
          });
          meta.put({ key: JOURNAL_IMPORT_LEASE_KEY, value: expired, changedAt: now, reason: 'journal-import-resume-failed' });
        };
        req.onerror = () => fail(req.error || new Error('Не удалось вернуть checkpoint импорта в ожидание.'));
      },
      MAINTENANCE_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
}

async function updateClaimedJournalImportLease(leaseToken, ownerSessionId, previewReceiptValue) {
  const token = normalizeJournalImportLeaseToken(leaseToken);
  const owner = normalizeJournalImportOwnerSessionId(ownerSessionId);
  const receipt = normalizeJournalImportPreviewReceipt(previewReceiptValue);
  const now = Date.now();
  const db = await openJournalDb(MAINTENANCE_IDB_TX_TIMEOUT_MS);
  let updated = null;
  try {
    await runIndexedDbTransactionBounded(
      db,
      JOURNAL_META_STORE,
      'readwrite',
      'Обновление возобновлённого checkpoint импорта',
      ({ store, setResult, fail }) => {
        const meta = store();
        const req = meta.get(JOURNAL_IMPORT_LEASE_KEY);
        req.onsuccess = () => {
          let current;
          try { current = normalizeJournalImportLeaseRecord(req.result?.value || null); } catch (error) { fail(error); return; }
          if (
            current.leaseToken !== token
            || current.ownerSessionId !== owner
            || current.hardExpiresAt <= now
            || current.previewReceipt.stagingKey !== receipt.stagingKey
          ) {
            fail(journalImportLeaseError('JOURNAL_IMPORT_LEASE_LOST', 'Возобновлённый checkpoint импорта больше не принадлежит этой странице.'));
            return;
          }
          updated = normalizeJournalImportLeaseRecord({
            ...current,
            previewReceipt: receipt,
            updatedAt: now,
            leaseExpiresAt: Math.min(current.hardExpiresAt, now + JOURNAL_IMPORT_LEASE_TTL_MS)
          });
          meta.put({ key: JOURNAL_IMPORT_LEASE_KEY, value: updated, changedAt: now, reason: 'journal-import-resume-revalidated' });
          setResult(updated);
        };
        req.onerror = () => fail(req.error || new Error('Не удалось обновить возобновлённый checkpoint импорта.'));
      },
      MAINTENANCE_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
  return updated;
}

async function resumePendingJournalImport(checkpointToken, ownerSessionId) {
  const token = normalizeJournalImportLeaseToken(checkpointToken);
  const owner = normalizeJournalImportOwnerSessionId(ownerSessionId);
  const pending = await getPendingJournalImportLease();
  if (!pending.pending || pending.checkpointToken !== token) {
    throw journalImportLeaseError('JOURNAL_IMPORT_CHECKPOINT_MISSING', 'Незавершённый импорт больше не найден.');
  }
  const now = Date.now();
  if (!pending.available) {
    throw journalImportLeaseError('JOURNAL_IMPORT_LEASE_BUSY', 'Импорт всё ещё принадлежит другой открытой странице Журнала.');
  }

  const db = await openJournalDb(MAINTENANCE_IDB_TX_TIMEOUT_MS);
  let claimed = null;
  try {
    await runIndexedDbTransactionBounded(
      db,
      JOURNAL_META_STORE,
      'readwrite',
      'Получение владения возобновляемым импортом',
      ({ store, setResult, fail }) => {
        const meta = store();
        const req = meta.get(JOURNAL_IMPORT_LEASE_KEY);
        req.onsuccess = () => {
          let current;
          try { current = normalizeJournalImportLeaseRecord(req.result?.value || null); } catch (error) { fail(error); return; }
          const claimNow = Date.now();
          if (current.leaseToken !== token || current.hardExpiresAt <= claimNow) {
            fail(journalImportLeaseError('JOURNAL_IMPORT_CHECKPOINT_MISSING', 'Checkpoint импорта изменился или истёк.'));
            return;
          }
          if (current.leaseExpiresAt > claimNow) {
            fail(journalImportLeaseError('JOURNAL_IMPORT_LEASE_BUSY', 'Импорт уже возобновлён другой страницей Журнала.'));
            return;
          }
          claimed = normalizeJournalImportLeaseRecord({
            ...current,
            leaseToken: normalizeJournalImportLeaseToken(crypto.randomUUID ? crypto.randomUUID() : `${claimNow}-${Math.random().toString(16).slice(2)}`),
            ownerSessionId: owner,
            updatedAt: claimNow,
            leaseExpiresAt: Math.min(current.hardExpiresAt, claimNow + JOURNAL_IMPORT_PARSE_TIMEOUT_MS + 60_000)
          });
          meta.put({ key: JOURNAL_IMPORT_LEASE_KEY, value: claimed, changedAt: claimNow, reason: 'journal-import-resume-claim' });
          setResult(claimed);
        };
        req.onerror = () => fail(req.error || new Error('Не удалось получить checkpoint для возобновления.'));
      },
      MAINTENANCE_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }

  try {
    const oldReceipt = claimed.previewReceipt;
    recordOperationStage(oldReceipt.operationId, 'resume-validate', 'Повторно проверяем backup после перезапуска…', 12);
    const inspected = await inspectStagedJournalImportStream(oldReceipt.stagingKey);
    const expectedJournalRevision = await journalRevisionSnapshot(Date.now() + JOURNAL_IMPORT_PARSE_TIMEOUT_MS);
    const receipt = createJournalImportPreviewReceipt(
      oldReceipt.stagingKey,
      oldReceipt.source,
      oldReceipt.operationId,
      inspected,
      expectedJournalRevision
    );
    const updated = await updateClaimedJournalImportLease(claimed.leaseToken, owner, receipt);
    appendOperationLogEvent(receipt.operationId, {
      category: 'checkpoint',
      level: 'info',
      stage: 'resume-await-confirmation',
      message: 'Незавершённый импорт заново проверен после перезапуска. Ожидается новое подтверждение замены журнала.',
      data: {
        source: receipt.source,
        entryCount: receipt.entryCount,
        contentSha256: receipt.contentSha256,
        expectedJournalRevision: receipt.expectedJournalRevision,
        stagingKey: '[INTERNAL]'
      }
    });
    return {
      ok: true,
      stagingKey: receipt.stagingKey,
      source: receipt.source,
      operationId: receipt.operationId,
      entryCount: receipt.entryCount,
      exportedAt: receipt.exportedAt,
      contentSha256: receipt.contentSha256,
      previewReceipt: receipt,
      leaseToken: updated.leaseToken,
      leaseExpiresAt: updated.leaseExpiresAt,
      hardExpiresAt: updated.hardExpiresAt
    };
  } catch (error) {
    await expireJournalImportLeaseIfToken(claimed.leaseToken).catch(() => {});
    throw error;
  }
}

async function cancelPendingJournalImport(checkpointToken) {
  const token = normalizeJournalImportLeaseToken(checkpointToken);
  const now = Date.now();
  const db = await openJournalDb(MAINTENANCE_IDB_TX_TIMEOUT_MS);
  let removed = null;
  try {
    await runIndexedDbTransactionBounded(
      db,
      JOURNAL_META_STORE,
      'readwrite',
      'Отмена незавершённого импорта журнала',
      ({ store, setResult, fail }) => {
        const meta = store();
        const req = meta.get(JOURNAL_IMPORT_LEASE_KEY);
        req.onsuccess = () => {
          let current;
          try { current = normalizeJournalImportLeaseRecord(req.result?.value || null); } catch (error) { fail(error); return; }
          if (current.leaseToken !== token) {
            fail(journalImportLeaseError('JOURNAL_IMPORT_LEASE_LOST', 'Checkpoint импорта уже изменился.'));
            return;
          }
          if (current.leaseExpiresAt > now) {
            fail(journalImportLeaseError('JOURNAL_IMPORT_LEASE_BUSY', 'Нельзя отменить импорт, пока им владеет другая открытая страница.'));
            return;
          }
          removed = current;
          meta.delete(JOURNAL_IMPORT_LEASE_KEY);
          setResult(current);
        };
        req.onerror = () => fail(req.error || new Error('Не удалось проверить checkpoint перед отменой.'));
      },
      MAINTENANCE_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
  if (removed) await deleteTransferPayloadGroup(removed.previewReceipt.stagingKey).catch(() => {});
  return { ok: true, canceled: Boolean(removed) };
}

async function discardOwnedJournalImport(stagingKey, leaseToken = '', ownerSessionId = '') {
  const key = String(stagingKey || '').trim();
  if (!key || key.length > 240) throw new Error('Некорректный идентификатор подготовленного импорта журнала.');
  const db = await openJournalDb(MAINTENANCE_IDB_TX_TIMEOUT_MS);
  try {
    await runIndexedDbTransactionBounded(
      db,
      JOURNAL_META_STORE,
      'readwrite',
      'Освобождение staged import журнала',
      ({ store, fail }) => {
        const meta = store();
        const req = meta.get(JOURNAL_IMPORT_LEASE_KEY);
        req.onsuccess = () => {
          const raw = req.result?.value || null;
          if (!raw) return;
          let current;
          try { current = normalizeJournalImportLeaseRecord(raw); } catch (error) { fail(error); return; }
          if (current.previewReceipt.stagingKey !== key) return;
          let token;
          let owner;
          try {
            token = normalizeJournalImportLeaseToken(leaseToken);
            owner = normalizeJournalImportOwnerSessionId(ownerSessionId);
          } catch (error) { fail(error); return; }
          if (current.leaseToken !== token || current.ownerSessionId !== owner) {
            fail(journalImportLeaseError('JOURNAL_IMPORT_LEASE_LOST', 'Эта страница больше не владеет подготовленным импортом.'));
            return;
          }
          meta.delete(JOURNAL_IMPORT_LEASE_KEY);
        };
        req.onerror = () => fail(req.error || new Error('Не удалось проверить владельца staged import.'));
      },
      MAINTENANCE_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
  await deleteTransferPayloadGroup(key);
  return { ok: true };
}

function assertJournalImportLeaseAuthority(currentValue, authority, now = Date.now()) {
  const current = normalizeJournalImportLeaseRecord(currentValue);
  const leaseToken = normalizeJournalImportLeaseToken(authority?.leaseToken);
  const ownerSessionId = normalizeJournalImportOwnerSessionId(authority?.ownerSessionId);
  const receipt = normalizeJournalImportPreviewReceipt(authority?.previewReceipt);
  if (
    current.leaseToken !== leaseToken
    || current.ownerSessionId !== ownerSessionId
    || current.leaseExpiresAt <= now
    || current.hardExpiresAt <= now
  ) {
    throw journalImportLeaseError('JOURNAL_IMPORT_LEASE_LOST', 'Lease импорта истёк или принадлежит другой странице. Журнал не изменён.');
  }
  for (const key of Object.keys(receipt)) {
    if (current.previewReceipt[key] !== receipt[key]) {
      throw journalImportLeaseError('JOURNAL_IMPORT_LEASE_LOST', 'Квитанция preview не совпадает с текущим checkpoint импорта.');
    }
  }
  return current;
}

async function reapExpiredJournalImportCheckpoint(reason = 'maintenance') {
  const pending = await getPendingJournalImportLease();
  if (pending.reclaimed) {
    console.info(`WebClip reclaimed expired Journal import checkpoint (${String(reason || 'maintenance')}).`);
  }
  return pending;
}

async function inspectStagedJournalImportStream(stagingKey) {
  const deadlineAt = Date.now() + JOURNAL_IMPORT_PARSE_TIMEOUT_MS;
  const observation = createJournalImportStreamObservation();
  const inspected = await WebClipJournalImportStream.process(streamStagedJournalImportText(stagingKey, deadlineAt, {
    onManifest: observation.onManifest,
    onBytes: observation.onBytes
  }), {
    expectedSchema: JOURNAL_EXPORT_SCHEMA,
    expectedVersion: JOURNAL_EXPORT_VERSION,
    maxTotalChars: MAX_JOURNAL_EXPORT_TEXT_CHARS,
    maxEntryChars: MAX_JOURNAL_IMPORT_ENTRY_CHARS,
    maxEntries: 100000,
    deadlineAt
  });
  return observation.finish(inspected);
}

async function normalizeStagedJournalImportStream(stagingKey) {
  const deadlineAt = Date.now() + JOURNAL_IMPORT_PARSE_TIMEOUT_MS;
  const sourceManifest = await getTransferImportRecord(String(stagingKey || ''), 20_000);
  const stagedBytes = sourceManifest?.kind === 'journal-import-manifest'
    ? Math.max(0, Number(sourceManifest.totalBytes) || 0)
    : Math.min(MAX_JOURNAL_IMPORT_BYTES, Math.max(0, String(sourceManifest?.text || '').length * 2));
  await ensureStorageBudget(Math.min(128 * 1024 * 1024, stagedBytes + 16 * 1024 * 1024), 'потоковой нормализации импорта журнала');
  const importId = makeJournalImportStageId();
  const observation = createJournalImportStreamObservation();
  const db = await openJournalDb();
  let batch = [];
  let batchChars = 0;
  const flushBatch = async () => {
    if (!batch.length) return;
    const current = batch;
    batch = [];
    batchChars = 0;
    await writeJournalImportStageBatch(db, importId, current);
  };
  try {
    const inspected = await WebClipJournalImportStream.process(streamStagedJournalImportText(stagingKey, deadlineAt, {
      onManifest: observation.onManifest,
      onBytes: observation.onBytes
    }), {
      expectedSchema: JOURNAL_EXPORT_SCHEMA,
      expectedVersion: JOURNAL_EXPORT_VERSION,
      maxTotalChars: MAX_JOURNAL_EXPORT_TEXT_CHARS,
      maxEntryChars: MAX_JOURNAL_IMPORT_ENTRY_CHARS,
      maxEntries: 100000,
      deadlineAt,
      onEntry: async (raw, index, info = {}) => {
        const sourceChars = Math.max(0, Number(info.sourceChars) || 0);
        if (batch.length && (batch.length >= JOURNAL_IMPORT_STAGE_BATCH_ENTRIES || batchChars + sourceChars > 2 * 1024 * 1024)) {
          await flushBatch();
        }
        batch.push({ raw, index });
        batchChars += sourceChars;
        if (batch.length >= JOURNAL_IMPORT_STAGE_BATCH_ENTRIES || batchChars >= 2 * 1024 * 1024) await flushBatch();
      }
    });
    await flushBatch();
    const observed = observation.finish(inspected);
    return {
      importId,
      entryCount: observed.entryCount,
      exportedAt: observed.exportedAt || '',
      stagingGeneration: observed.stagingGeneration,
      contentSha256: observed.contentSha256
    };
  } catch (error) {
    try { db.close(); } catch (_) {}
    await deleteJournalImportStage(importId).catch(() => {});
    throw error;
  } finally {
    try { db.close(); } catch (_) {}
  }
}

async function commitStagedJournalImport(prepared, operationId, expectedJournalRevision, leaseAuthority = null) {
  const importId = String(prepared?.importId || '');
  const expectedCount = Math.max(0, Number(prepared?.entryCount) || 0);
  const expectedRevision = String(expectedJournalRevision || '');
  const authorityReceipt = normalizeJournalImportPreviewReceipt(leaseAuthority?.previewReceipt);
  if (authorityReceipt.expectedJournalRevision !== expectedRevision) throw journalImportPreviewMismatch('ожидаемая ревизия lease не совпадает');
  if (!importId) throw new Error('Не подготовлены нормализованные записи импорта.');
  await migrateLegacyPendingJournalAppends();
  const revisionBefore = await journalRevisionSnapshot(Date.now() + JOURNAL_IMPORT_PARSE_TIMEOUT_MS);
  if (revisionBefore !== expectedRevision) throw journalImportStaleRevision();

  const statsToken = await beginJournalStatsMutation('import-replace');
  let db = null;
  let copiedCount = 0;
  let transactionCommitted = false;
  try {
    db = await openJournalDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction([
        JOURNAL_STORE,
        JOURNAL_META_STORE,
        JOURNAL_PENDING_STORE,
        JOURNAL_PENDING_DOWNLOAD_STORE,
        JOURNAL_PENDING_REMOTE_STORE,
        JOURNAL_PENDING_DESTRUCTIVE_STORE,
        JOURNAL_IMPORT_STAGING_STORE
      ], 'readwrite');
      const journalStore = tx.objectStore(JOURNAL_STORE);
      const importStore = tx.objectStore(JOURNAL_IMPORT_STAGING_STORE);
      const metaStore = tx.objectStore(JOURNAL_META_STORE);
      let timedOut = false;
      let abortError = null;
      const timer = setTimeout(() => {
        timedOut = true;
        try { tx.abort(); } catch (_) {}
      }, 5 * 60 * 1000);

      const abort = (error) => {
        abortError = error;
        try { tx.abort(); } catch (_) {}
      };
      const beginReplace = () => {
        tx.objectStore(JOURNAL_PENDING_STORE).clear();
        reconcilePendingLocalDownloadStoreForJournalReset(tx.objectStore(JOURNAL_PENDING_DOWNLOAD_STORE), {
          scope: 'import-replace',
          resetAt: Date.now(),
          fail: abort
        });
        reconcilePendingRemoteStoreForJournalReset(tx.objectStore(JOURNAL_PENDING_REMOTE_STORE), {
          scope: 'import-replace',
          resetAt: Date.now(),
          fail: abort
        });
        reconcilePendingDestructiveMoveStoreForJournalReset(tx.objectStore(JOURNAL_PENDING_DESTRUCTIVE_STORE), {
          scope: 'import-replace',
          resetAt: Date.now(),
          fail: abort
        });
        touchJournalDbRevision(tx, 'import-replace');
        advanceJournalResetGeneration(tx, 'import-replace', abort);
        const clearRequest = journalStore.clear();
        clearRequest.onerror = () => abort(clearRequest.error || new Error('Не удалось очистить старый журнал перед импортом.'));
        clearRequest.onsuccess = () => {
          const cursorRequest = importStore.index('importId').openCursor(IDBKeyRange.only(importId), 'next');
          cursorRequest.onerror = () => abort(cursorRequest.error || new Error('Не удалось прочитать нормализованный staging импорта.'));
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (!cursor) {
              if (copiedCount !== expectedCount) {
                const error = new Error(`Staging импорта содержит ${copiedCount} записей вместо ожидаемых ${expectedCount}.`);
                error.code = 'JOURNAL_IMPORT_STAGING_COUNT_MISMATCH';
                abort(error);
              }
              return;
            }
            const entry = cursor.value?.entry;
            if (!entry || typeof entry !== 'object') {
              abort(new Error('Staging импорта содержит повреждённую запись.'));
              return;
            }
            const put = journalStore.put({ ...entry, entryRevision: JOURNAL_INITIAL_ENTRY_REVISION });
            put.onerror = () => abort(put.error || new Error('Не удалось записать импортируемую запись журнала.'));
            put.onsuccess = () => {
              const del = cursor.delete();
              del.onerror = () => abort(del.error || new Error('Не удалось очистить использованную staging-запись импорта.'));
              del.onsuccess = () => {
                copiedCount += 1;
                cursor.continue();
              };
            };
          };
        };
      };

      const leaseRequest = metaStore.get(JOURNAL_IMPORT_LEASE_KEY);
      leaseRequest.onerror = () => abort(leaseRequest.error || new Error('Не удалось сверить lease импорта перед заменой журнала.'));
      leaseRequest.onsuccess = () => {
        try {
          assertJournalImportLeaseAuthority(leaseRequest.result?.value || null, {
            leaseToken: leaseAuthority?.leaseToken,
            ownerSessionId: leaseAuthority?.ownerSessionId,
            previewReceipt: authorityReceipt
          });
        } catch (error) {
          abort(error);
          return;
        }
        const revisionRequest = metaStore.get(JOURNAL_META_REVISION_KEY);
        revisionRequest.onerror = () => abort(revisionRequest.error || new Error('Не удалось сверить ревизию журнала перед импортом.'));
        revisionRequest.onsuccess = () => {
          const currentRevision = String(revisionRequest.result?.value || '');
          if (currentRevision !== expectedRevision) {
            abort(journalImportStaleRevision());
            return;
          }
          metaStore.delete(JOURNAL_IMPORT_LEASE_KEY);
          beginReplace();
        };
      };
      tx.oncomplete = () => { clearTimeout(timer); resolve(); };
      tx.onerror = () => { clearTimeout(timer); reject(abortError || tx.error || new Error('Не удалось восстановить журнал из staged import.')); };
      tx.onabort = () => {
        clearTimeout(timer);
        const error = new Error(timedOut
          ? 'Импорт журнала превысил безопасный лимит 5 минут и был атомарно отменён. Старый журнал не изменён.'
          : 'Восстановление журнала было прервано.');
        if (timedOut) error.code = 'JOURNAL_IMPORT_TIMEOUT';
        reject(abortError || (timedOut ? error : (tx.error || error)));
      };
    });
    transactionCommitted = true;
  } catch (error) {
    if (!transactionCommitted) await completeJournalStatsMutation(statsToken).catch(() => {});
    throw error;
  } finally {
    if (db) db.close();
  }

  recordOperationStage(operationId, 'stats', 'Перестраиваем агрегированную статистику URL…', 80);
  let statsWarning = '';
  try {
    await rebuildAllUrlStats();
    await completeJournalStatsMutation(statsToken);
  } catch (error) {
    statsWarning = normalizeError(error);
    console.warn('WebClip urlStats import deferred repair:', error);
  }
  refreshActionForAllTabs().catch(() => {});
  notifyJournalChanged('import');
  return { importedCount: copiedCount, statsWarning };
}

async function previewStagedJournalImport(stagingKey, operationId = '', source = 'file', ownerSessionId = '') {
  const key = String(stagingKey || '').trim();
  if (!key || key.length > 240) throw new Error('Некорректный идентификатор подготовленного импорта журнала.');
  operationId = String(operationId || '') || makeOperationLogId('journal-import');
  const sourceKind = source === 'yandex' ? 'yandex' : 'file';
  await startOperationLog(operationId, sourceKind === 'yandex' ? 'journal-import-yandex' : 'journal-import-file', sourceKind === 'yandex' ? 'Восстановление журнала с Яндекс Диска' : 'Импорт журнала из файла', {
    source: sourceKind
  });
  recordOperationStage(operationId, 'validate', 'Потоково проверяем подготовленную резервную копию журнала и вычисляем SHA-256…', 15);
  const inspected = await inspectStagedJournalImportStream(key);
  const expectedJournalRevision = await journalRevisionSnapshot(Date.now() + JOURNAL_IMPORT_PARSE_TIMEOUT_MS);
  const previewReceipt = createJournalImportPreviewReceipt(key, sourceKind, operationId, inspected, expectedJournalRevision);
  const importLease = await acquireJournalImportLease(previewReceipt, ownerSessionId);
  appendOperationLogEvent(operationId, {
    category: 'checkpoint', level: 'info', stage: 'await-confirmation',
    message: 'Резервная копия потоково проверена. Ожидается подтверждение замены локального журнала.',
    data: {
      source: sourceKind,
      entryCount: inspected.entryCount,
      contentSha256: inspected.contentSha256,
      expectedJournalRevision,
      stagingKey: '[INTERNAL]'
    }
  });
  return {
    ok: true,
    stagingKey: key,
    entryCount: inspected.entryCount,
    exportedAt: inspected.exportedAt || '',
    contentSha256: inspected.contentSha256,
    operationId,
    previewReceipt,
    leaseToken: importLease.leaseToken,
    leaseExpiresAt: importLease.leaseExpiresAt,
    hardExpiresAt: importLease.hardExpiresAt
  };
}

async function importJournalReplaceStaged(stagingKey, operationId = '', source = 'file', previewReceiptValue = null, leaseToken = '', ownerSessionId = '') {
  const key = String(stagingKey || '').trim();
  if (!key || key.length > 240) throw new Error('Некорректный идентификатор подготовленного импорта журнала.');
  operationId = String(operationId || '') || makeOperationLogId('journal-import');
  const sourceKind = source === 'yandex' ? 'yandex' : 'file';
  let prepared = null;
  await startOperationLog(operationId, sourceKind === 'yandex' ? 'journal-import-yandex' : 'journal-import-file', sourceKind === 'yandex' ? 'Восстановление журнала с Яндекс Диска' : 'Импорт журнала из файла', {
    source: sourceKind
  });
  try {
    const previewReceipt = normalizeJournalImportPreviewReceipt(previewReceiptValue, {
      stagingKey: key,
      source: sourceKind,
      operationId
    });
    recordOperationStage(operationId, 'validate', 'Повторно проверяем резервную копию и сверяем её с квитанцией preview…', 15);
    prepared = await normalizeStagedJournalImportStream(key);
    assertPreparedJournalImportMatchesPreview(prepared, previewReceipt);
    recordOperationStage(operationId, 'replace', `Атомарно заменяем локальный журнал. Записей: ${prepared.entryCount}.`, 45, 'running', {
      entryCount: prepared.entryCount,
      contentSha256: prepared.contentSha256
    });
    const committed = await commitStagedJournalImport(prepared, operationId, previewReceipt.expectedJournalRevision, {
      previewReceipt,
      leaseToken,
      ownerSessionId
    });
    await deleteTransferPayloadGroup(key).catch(() => {});
    recordOperationStage(operationId, 'complete', `Импорт завершён. Записей: ${committed.importedCount}.`, 100, 'success', { entryCount: committed.importedCount });
    return {
      ok: true,
      importedCount: committed.importedCount,
      exportedAt: prepared.exportedAt || '',
      contentSha256: prepared.contentSha256,
      operationId,
      statsWarning: committed.statsWarning || ''
    };
  } catch (error) {
    recordOperationStage(operationId, 'error', `Ошибка импорта: ${normalizeError(error)}`, 100, 'error');
    throw error;
  } finally {
    if (prepared?.importId) await deleteJournalImportStage(prepared.importId).catch(() => {});
  }
}

function journalExportDownloadFilename() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  return `WebClip_Journal_${stamp}.json`;
}

async function prepareFullJournalExport(operationId = '') {
  operationId = String(operationId || '') || makeOperationLogId('journal-export');
  await startOperationLog(operationId, 'journal-export-file', 'Экспорт полного журнала в файл', {});
  let blobUrl = '';
  let saveAsSessionId = '';
  try {
    recordOperationStage(operationId, 'read-journal', 'Читаем журнал пакетами и формируем ограниченный chunked JSON…', 20);
    const staged = await stageFullJournalExport();
    recordOperationStage(operationId, 'serialize', `Chunked JSON сформирован. Записей: ${staged.entryCount}.`, 50, 'running', { entryCount: staged.entryCount, totalBytes: staged.totalBytes, chunkCount: staged.chunkCount });
    try {
      blobUrl = await createStagedTextBlobUrl(staged.stagingKey, 'application/json;charset=utf-8');
    } finally {
      await deleteTransferPayloadGroup(staged.stagingKey).catch(() => {});
    }
    const filename = journalExportDownloadFilename();
    saveAsSessionId = makePreparedSaveAsSessionId();
    await createPreparedSaveAsCheckpoint({
      sessionId: saveAsSessionId,
      blobUrl,
      filename,
      ownerPage: 'journal.html',
      operationId
    });
    recordOperationStage(operationId, 'save-as-ready', 'Файл подготовлен. Ожидаем выбор места сохранения в стандартном диалоге Chrome.', 80, 'running', { entryCount: staged.entryCount });
    return { ok: true, blobUrl, filename, entryCount: staged.entryCount, operationId, saveAsSessionId };
  } catch (error) {
    if (blobUrl && saveAsSessionId) {
      await releasePreparedSaveAsCheckpoint({
        sessionId: saveAsSessionId,
        blobUrl,
        ownerPage: 'journal.html',
        operationId,
        reason: 'prepare-failed'
      }).catch(() => {});
    } else if (blobUrl) {
      await revokeBlobUrl(blobUrl).catch(() => {});
    }
    recordOperationStage(operationId, 'error', `Ошибка экспорта: ${normalizeError(error)}`, 100, 'error');
    await finishOperationLog(operationId, 'error', `Ошибка экспорта полного журнала: ${normalizeError(error)}`).catch(() => {});
    throw error;
  }
}


function normalizeIntervalMinutes(value, fallback) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(MIN_BACKGROUND_INTERVAL_MINUTES, Math.min(60 * 24 * 365, n));
}

function getJournalBackupFolderFromRoot(rootPath) {
  const root = normalizeDiskPath(rootPath || '');
  return root ? joinDiskPath(root, YANDEX_BACKUP_DIR, YANDEX_JOURNAL_DIR) : '';
}

function journalBackupMonthFolderName(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}

function journalBackupVersionFilename(date = new Date()) {
  const pad = (value, length = 2) => String(value).padStart(length, '0');
  const stamp = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-') + '_' + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('-') + '-' + pad(date.getMilliseconds(), 3);
  return `${JOURNAL_YANDEX_BACKUP_PREFIX}${stamp}.json`;
}

function isAllowedJournalBackupPath(path, journalRoot) {
  const normalized = normalizeDiskPath(path || '');
  const root = normalizeDiskPath(journalRoot || '');
  if (!normalized || !root) return false;
  return normalized.startsWith(`${root}/`) && /\.json$/i.test(normalized);
}

function readJournalBackupStorage(keys, label) {
  return readChromeStorageBounded(() => chrome.storage.local.get(keys), label);
}

function mutateJournalBackupPending(start, label) {
  return mutateChromeStorageSerialized(
    `storage.local:${JOURNAL_BACKUP_PENDING_KEY}`,
    start,
    label
  );
}

function mutateJournalBackupState(mutator, label) {
  return runSerializedLateSettlementOperation(
    chromeStorageMutationSettlementChains,
    'storage.local:journalBackupState',
    async () => {
      // Fresh read is deliberately inside the serialized turn: a queued state
      // update must observe the real settlement of every older storage write.
      const stored = await chrome.storage.local.get('journalBackupState');
      const previous = stored?.journalBackupState && typeof stored.journalBackupState === 'object'
        ? stored.journalBackupState
        : {};
      const next = mutator({ ...previous });
      if (!next || typeof next !== 'object') {
        throw new Error('Некорректное состояние резервного копирования журнала.');
      }
      await chrome.storage.local.set({ journalBackupState: next });
      return next;
    },
    label,
    CHROME_STORAGE_OPERATION_TIMEOUT_MS
  );
}

async function saveJournalBackupSettings(settings) {
  await updateYandexConfig((config) => {
    if (Object.prototype.hasOwnProperty.call(settings, 'enabled')) {
      const requestedEnabled = Boolean(settings.enabled);
      if (requestedEnabled && !normalizeDiskPath(config.rootPath || '')) {
        throw new Error('Сначала выберите корневую папку Яндекс Диска.');
      }
      config.journalBackupEnabled = requestedEnabled;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'intervalMinutes')) {
      config.journalBackupIntervalMinutes = normalizeIntervalMinutes(
        settings.intervalMinutes,
        DEFAULT_JOURNAL_BACKUP_INTERVAL_MINUTES
      );
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'retryMinutes')) {
      config.journalBackupRetryMinutes = normalizeIntervalMinutes(
        settings.retryMinutes,
        DEFAULT_JOURNAL_BACKUP_RETRY_MINUTES
      );
    }
    delete config.journalBackupFolder;
    return config;
  }, 'Сохранение настроек резервного копирования Яндекс Диска');
  await initializeJournalBackupScheduler('settings-change');

  // P1-077: settings mutations must not start a heavy backup fire-and-forget
  // inside runtime.onMessage. initializeJournalBackupScheduler() above owns
  // the durable alarm boundary and schedules a near-term alarm when due.
  return { ok: true, ...(await getJournalBackupStatus()) };
}

async function getJournalBackupStatus() {
  const [{ yandexConfig = {} }, { journalBackupState = {} }] = await Promise.all([
    readJournalBackupStorage('yandexConfig', 'Чтение настроек Яндекс Диска для backup scheduler'),
    readJournalBackupStorage('journalBackupState', 'Чтение состояния резервного копирования журнала')
  ]);

  const rootPath = normalizeDiskPath(yandexConfig.rootPath || '');
  const intervalMinutes = normalizeIntervalMinutes(
    yandexConfig.journalBackupIntervalMinutes,
    DEFAULT_JOURNAL_BACKUP_INTERVAL_MINUTES
  );
  const retryMinutes = normalizeIntervalMinutes(
    yandexConfig.journalBackupRetryMinutes,
    DEFAULT_JOURNAL_BACKUP_RETRY_MINUTES
  );
  const folderPath = getJournalBackupFolderFromRoot(rootPath);
  const lastSuccessAt = Number(journalBackupState.lastSuccessAt || 0);
  const lastFailureAt = Number(journalBackupState.lastFailureAt || 0);
  const lastAttemptAt = Number(journalBackupState.lastAttemptAt || 0);
  const lastBackgroundSuccessAt = Number(
    journalBackupState.lastBackgroundSuccessAt ||
    (journalBackupState.lastReason && journalBackupState.lastReason !== 'manual' ? journalBackupState.lastSuccessAt : 0) ||
    0
  );
  const lastBackgroundFailureAt = Number(
    journalBackupState.lastBackgroundFailureAt ||
    (journalBackupState.lastReason && journalBackupState.lastReason !== 'manual' ? journalBackupState.lastFailureAt : 0) ||
    0
  );
  const lastBackgroundError = String(journalBackupState.lastBackgroundError || '');
  const lastRemotePath = String(journalBackupState.lastRemotePath || '');
  const now = Date.now();
  const nextDueAt = lastSuccessAt ? lastSuccessAt + intervalMinutes * 60000 : 0;
  const nextRetryAt = lastFailureAt ? lastFailureAt + retryMinutes * 60000 : 0;

  return {
    ok: true,
    enabled: Boolean(yandexConfig.journalBackupEnabled),
    rootPath,
    folderPath,
    backupFilenamePattern: 'WebClip_Journal_YYYY-MM-DD_HH-MM-SS-SSS.json',
    remotePath: lastRemotePath || folderPath,
    intervalMinutes,
    retryMinutes,
    lastSuccessAt,
    lastFailureAt,
    lastAttemptAt,
    lastBackgroundSuccessAt,
    lastBackgroundFailureAt,
    lastBackgroundError,
    lastError: String(journalBackupState.lastError || ''),
    lastEntryCount: Number(journalBackupState.lastEntryCount || 0),
    lastReason: String(journalBackupState.lastReason || ''),
    lastRemotePath,
    nextDueAt,
    nextRetryAt,
    overdue: Boolean(yandexConfig.journalBackupEnabled && (!lastSuccessAt || now >= nextDueAt)),
    hasCurrentProblem: Boolean(lastBackgroundFailureAt && (!lastSuccessAt || lastBackgroundFailureAt > lastSuccessAt))
  };
}

async function ensureYandexServiceFolders({ includeUpload = false, includeReadLater = false, includeBackup = false, operationId = '' } = {}) {
  const operationContext = arguments[0]?.operationContext || null;
  const provenContext = operationContext
    ? WebClipYandexOperationContext.validateOperationContext(operationContext)
    : null;
  const config = provenContext ? { rootPath: provenContext.rootPath } : await getYandexConfig();
  if (!config.rootPath) throw new Error('Не выбрана корневая папка Яндекс Диска. Откройте настройки расширения.');

  if (!provenContext) await getValidYandexAccessToken();
  const result = { rootPath: config.rootPath, uploadPath: '', readLaterPath: '', backupPath: '', journalPath: '' };
  try {
    await ensureYandexFolderTree(config.rootPath, operationId, provenContext);
    if (includeUpload) {
      result.uploadPath = joinDiskPath(config.rootPath, YANDEX_UPLOAD_DIR);
      await ensureYandexFolderTree(result.uploadPath, operationId, provenContext);
    }
    if (includeReadLater) {
      result.readLaterPath = joinDiskPath(config.rootPath, YANDEX_READ_LATER_DIR);
      await ensureYandexFolderTree(result.readLaterPath, operationId, provenContext);
    }
    if (includeBackup) {
      result.backupPath = joinDiskPath(config.rootPath, YANDEX_BACKUP_DIR);
      result.journalPath = joinDiskPath(result.backupPath, YANDEX_JOURNAL_DIR);
      await ensureYandexFolderTree(result.journalPath, operationId, provenContext);
    }
  } catch (error) {
    const parts = [];
    if (includeUpload) parts.push(`/${YANDEX_UPLOAD_DIR}`);
    if (includeReadLater) parts.push(`/${YANDEX_READ_LATER_DIR}`);
    if (includeBackup) parts.push(`/${YANDEX_BACKUP_DIR}/${YANDEX_JOURNAL_DIR}`);
    throw new Error(`Не удалось проверить или создать служебные папки ${parts.join(' и ')} в ${config.rootPath}: ${normalizeError(error)}`);
  }
  return result;
}

async function acquireJournalBackupLease(operationId, reason) {
  const now = Date.now();
  const token = crypto.randomUUID ? crypto.randomUUID() : `${now}-${Math.random().toString(16).slice(2)}`;
  const lease = {
    token,
    operationId: String(operationId || '').slice(0, MAX_OPERATION_ID_CHARS),
    reason: String(reason || '').slice(0, 80),
    acquiredAt: now,
    expiresAt: now + JOURNAL_BACKUP_LEASE_TTL_MS
  };
  const db = await openJournalDb();
  try {
    await runIndexedDbTransactionBounded(
      db,
      JOURNAL_META_STORE,
      'readwrite',
      'Получение lease резервного копирования журнала',
      ({ tx, store, fail }) => {
        const meta = store();
        const req = meta.get(JOURNAL_BACKUP_LEASE_KEY);
        req.onsuccess = () => {
          const current = req.result?.value || null;
          if (current?.token && Number(current.expiresAt || 0) > now) {
            const error = new Error('Другая операция резервного копирования журнала уже выполняется. Повторите после её завершения.');
            error.code = 'JOURNAL_BACKUP_BUSY';
            fail(error);
            return;
          }
          meta.put({ key: JOURNAL_BACKUP_LEASE_KEY, value: lease, changedAt: now, reason: 'backup-lease-acquire' });
        };
        req.onerror = () => fail(req.error || new Error('Не удалось проверить lease резервного копирования журнала.'));
      },
      JOURNAL_BACKUP_LEASE_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
  // Remove pre-audit legacy lease copy; IndexedDB meta is the sole authority.
  await mutateChromeStorageSerialized(
    `storage.local:${JOURNAL_BACKUP_LEASE_KEY}`,
    () => chrome.storage.local.remove(JOURNAL_BACKUP_LEASE_KEY),
    'Очистка legacy lease резервного копирования'
  ).catch(() => {});
  return lease;
}

async function renewJournalBackupLease(lease) {
  if (!lease?.token) throw new Error('Не найден lease резервного копирования журнала.');
  const db = await openJournalDb();
  let renewed = null;
  try {
    await runIndexedDbTransactionBounded(
      db,
      JOURNAL_META_STORE,
      'readwrite',
      'Продление lease резервного копирования журнала',
      ({ store, setResult, fail }) => {
        const meta = store();
        const req = meta.get(JOURNAL_BACKUP_LEASE_KEY);
        req.onsuccess = () => {
          const current = req.result?.value || null;
          if (current?.token !== lease.token) {
            const error = new Error('Эксклюзивный lease резервного копирования был потерян. Операция остановлена, чтобы не создавать параллельные backup.');
            error.code = 'JOURNAL_BACKUP_LEASE_LOST';
            fail(error);
            return;
          }
          renewed = { ...current, expiresAt: Date.now() + JOURNAL_BACKUP_LEASE_TTL_MS };
          meta.put({ key: JOURNAL_BACKUP_LEASE_KEY, value: renewed, changedAt: Date.now(), reason: 'backup-lease-renew' });
          setResult(renewed);
        };
        req.onerror = () => fail(req.error || new Error('Не удалось прочитать lease резервного копирования журнала.'));
      },
      JOURNAL_BACKUP_LEASE_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
  lease.expiresAt = Number(renewed?.expiresAt || lease.expiresAt || 0);
  return lease;
}

async function releaseJournalBackupLease(lease) {
  if (!lease?.token) return;
  const db = await openJournalDb();
  try {
    await runIndexedDbTransactionBounded(
      db,
      JOURNAL_META_STORE,
      'readwrite',
      'Освобождение lease резервного копирования журнала',
      ({ store, fail }) => {
        const meta = store();
        const req = meta.get(JOURNAL_BACKUP_LEASE_KEY);
        req.onsuccess = () => {
          const current = req.result?.value || null;
          if (current?.token === lease.token) meta.delete(JOURNAL_BACKUP_LEASE_KEY);
        };
        req.onerror = () => fail(req.error || new Error('Не удалось прочитать lease перед освобождением.'));
      },
      JOURNAL_BACKUP_LEASE_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
}

async function uploadJournalExportStagedToYandex(staged, { backupDate = new Date(), operationId = '', reason = 'manual' } = {}) {
  if (!staged?.stagingKey) throw new Error('Не подготовлены временные данные резервной копии журнала.');
  emitJournalBackupProgress(operationId, 'yandex-access', 'Проверяем доступ к Яндекс Диску и корневую папку…', 38);
  const structure = await ensureYandexServiceFolders({ includeBackup: true, operationId });
  const journalRoot = structure.journalPath;
  if (!journalRoot) throw new Error('Не удалось определить папку резервной копии журнала.');

  const monthName = journalBackupMonthFolderName(backupDate);
  const monthFolder = joinDiskPath(journalRoot, monthName);
  emitJournalBackupProgress(operationId, 'month-folder', `Проверяем папку Journal/${monthName}…`, 50, 'running', { monthFolder });
  await ensureYandexFolderTree(monthFolder, operationId);

  const filename = journalBackupVersionFilename(backupDate);
  const remotePath = joinDiskPath(monthFolder, filename);
  emitJournalBackupProgress(operationId, 'upload-url', 'Получаем адрес для загрузки новой версии резервной копии…', 62, 'running', { remotePath });
  const uploadLink = await yandexApi('/resources/upload', {
    method: 'GET', query: { path: remotePath, overwrite: 'false' }, operationId
  });
  if (!uploadLink?.href) throw new Error('Яндекс Диск не вернул адрес для загрузки резервной копии журнала.');

  emitJournalBackupProgress(operationId, 'upload', 'Передаём chunked резервную копию на Яндекс Диск через offscreen transfer…', 76, 'running', { remotePath });
  const pending = {
    phase: 'prepared',
    operationId: String(operationId || '').slice(0, MAX_OPERATION_ID_CHARS),
    remotePath, filename, monthFolder, createdAt: Date.now(),
    attemptCount: 0, lastCheckedAt: 0,
    expectedBytes: requirePositiveByteSize(staged.totalBytes, 'Размер подготовленной резервной копии журнала'),
    entryCount: Math.max(0, Number(staged.entryCount) || 0),
    exportedAt: String(staged.exportedAt || '').slice(0, 120),
    reason: String(reason || '').slice(0, 80)
  };
  await mutateJournalBackupPending(() => chrome.storage.local.set({ [JOURNAL_BACKUP_PENDING_KEY]: pending }), 'Сохранение prepared backup checkpoint');
  let response;
  try {
    response = await runOffscreenSignedTransfer({
      mode: 'text-chunks-upload',
      url: uploadLink.href,
      method: uploadLink.method || 'PUT',
      payloadKey: staged.stagingKey,
      contentType: 'application/json; charset=utf-8'
    }, { operationId, label: 'Загрузка резервной копии журнала', timeoutMs: 90_000 });
  } catch (error) {
    throw new Error(`Не удалось передать резервную копию журнала на Яндекс Диск: ${normalizeError(error)}`);
  } finally {
    await deleteTransferPayloadGroup(staged.stagingKey).catch(() => {});
  }
  if (!response.ok) throw new Error(`Ошибка загрузки резервной копии журнала: HTTP ${response.status}${response.details ? ` — ${response.details}` : ''}`);

  emitJournalBackupProgress(operationId, 'verify', 'Проверяем, что новая версия файла появилась на Яндекс Диске…', 90, 'running', { remotePath });
  const metadata = await yandexApi('/resources', {
    method: 'GET', query: { path: remotePath, fields: 'name,path,type,size,modified,resource_id' }, operationId
  });
  if (metadata?.type !== 'file') throw new Error('Яндекс Диск не подтвердил создание файла резервной копии журнала.');
  const verifiedBackupBytes = assertExactYandexRemoteByteSize(pending.expectedBytes, metadata?.size, 'Резервная копия журнала на Яндекс Диске');
  const verifiedPending = {
    ...pending,
    phase: 'remote-verified',
    verifiedAt: Date.now(),
    actualBytes: verifiedBackupBytes,
    resourceId: metadata?.resource_id ? normalizeYandexResourceIdFromApi(metadata.resource_id).slice(0, 512) : ''
  };
  // Keep the verified checkpoint until journalBackupState is durably updated.
  // If MV3 stops in this window, the next run accepts the already-uploaded
  // file instead of creating a duplicate backup with a new timestamp.
  await mutateJournalBackupPending(() => chrome.storage.local.set({ [JOURNAL_BACKUP_PENDING_KEY]: verifiedPending }), 'Сохранение verified backup checkpoint');
  return { ok: true, remotePath, filename, monthFolder, entryCount: pending.entryCount, exportedAt: pending.exportedAt, size: verifiedBackupBytes };
}

async function recoverPendingJournalBackup(status, operationId = '') {
  const pending = (await readJournalBackupStorage(JOURNAL_BACKUP_PENDING_KEY, 'Чтение backup checkpoint'))?.[JOURNAL_BACKUP_PENDING_KEY];
  if (!pending?.remotePath) return null;
  const structure = await ensureYandexServiceFolders({ includeBackup: true, operationId });
  const remotePath = normalizeDiskPath(pending.remotePath);
  if (!remotePath || !isAllowedJournalBackupPath(remotePath, structure.journalPath)) {
    await mutateJournalBackupPending(() => chrome.storage.local.remove(JOURNAL_BACKUP_PENDING_KEY), 'Удаление некорректного backup checkpoint');
    appendOperationLogEvent(operationId, { category: 'recovery', level: 'warning', message: 'Отброшен некорректный checkpoint незавершённой резервной копии.' });
    return null;
  }
  appendOperationLogEvent(operationId, {
    category: 'recovery', level: 'info', stage: 'backup-recovery',
    message: 'Проверяем незавершённую предыдущую передачу резервной копии перед созданием нового файла.',
    data: { remotePath, previousOperationId: String(pending.operationId || '').slice(0, MAX_OPERATION_ID_CHARS), createdAt: Number(pending.createdAt || 0) }
  });
  try {
    const metadata = await yandexApi('/resources', {
      method: 'GET', query: { path: remotePath, fields: 'name,path,type,size,modified' }, operationId
    });
    if (metadata?.type !== 'file') throw new Error('Checkpoint указывает не на файл.');
    const expectedBytes = requirePositiveByteSize(pending.expectedBytes, 'Размер резервной копии в recovery-checkpoint');
    let actualBytes;
    try {
      actualBytes = assertExactYandexRemoteByteSize(expectedBytes, metadata?.size, 'Резервная копия из recovery-checkpoint');
    } catch (error) {
      if (error?.code === 'YANDEX_REMOTE_SIZE_MISMATCH') error.code = 'JOURNAL_BACKUP_RECOVERY_MISMATCH';
      throw error;
    }
    const verifiedPending = {
      ...pending,
      phase: 'remote-verified',
      verifiedAt: Number(pending.verifiedAt || Date.now()),
      actualBytes
    };
    await mutateJournalBackupPending(() => chrome.storage.local.set({ [JOURNAL_BACKUP_PENDING_KEY]: verifiedPending }), 'Сохранение recovered verified backup checkpoint');
    appendOperationLogEvent(operationId, { category: 'recovery', level: 'info', stage: 'backup-recovery', message: 'Предыдущая передача фактически завершилась: найден и принят уже загруженный backup. Checkpoint сохраняется до фиксации backup-state.', data: { remotePath, size: actualBytes } });
    return {
      remotePath,
      filename: pending.filename ? String(pending.filename).slice(0, 512) : normalizeYandexItemNameFromApi(metadata?.name || '').slice(0, 512),
      monthFolder: String(pending.monthFolder || '').slice(0, MAX_IMPORTED_PATH_CHARS),
      size: actualBytes, modified: boundedYandexExternalText(metadata?.modified, MAX_YANDEX_ITEM_MODIFIED_CHARS, { rejectOverflow: true, label: 'Дата backup Яндекс Диска' }),
      entryCount: Math.max(0, Number(pending.entryCount) || 0),
      exportedAt: String(pending.exportedAt || '').slice(0, 120),
      recovered: true
    };
  } catch (error) {
    if (Number(error?.status) === 404) {
      if (String(pending.phase || '') === 'remote-verified') {
        const missing = new Error('Ранее подтверждённая резервная копия временно не найдена на Яндекс Диске. Checkpoint сохранён; новый backup не создаётся, чтобы избежать дубликата/расхождения состояния.');
        missing.code = 'JOURNAL_BACKUP_VERIFIED_MISSING';
        throw missing;
      }
      const now = Date.now();
      const ageMs = now - Math.max(0, Number(pending.createdAt || 0));
      const attemptCount = Math.max(0, Number(pending.attemptCount || 0)) + 1;
      if (ageMs >= JOURNAL_BACKUP_PREPARED_404_GRACE_MS && attemptCount >= JOURNAL_BACKUP_PREPARED_404_MIN_ATTEMPTS) {
        await mutateJournalBackupPending(() => chrome.storage.local.remove(JOURNAL_BACKUP_PENDING_KEY), 'Удаление stale prepared backup checkpoint');
        appendOperationLogEvent(operationId, { category: 'recovery', level: 'warning', stage: 'backup-recovery', message: 'Prepared-checkpoint очищен только после нескольких 404 и истечения защитного окна; предыдущая передача считается не создавшей файл.', data: { attemptCount, ageMs } });
        return null;
      }
      await mutateJournalBackupPending(
        () => chrome.storage.local.set({
          [JOURNAL_BACKUP_PENDING_KEY]: {
            ...pending,
            attemptCount,
            lastCheckedAt: now,
            lastError: 'HTTP 404 while verifying prepared backup'
          }
        }),
        'Обновление prepared backup checkpoint после 404'
      );
      const waiting = new Error('Незавершённая резервная копия пока не найдена на Яндекс Диске. Checkpoint сохранён; новый backup временно не создаётся, чтобы исключить дубликат после задержки видимости файла.');
      waiting.code = 'JOURNAL_BACKUP_RECOVERY_WAIT';
      throw waiting;
    }
    throw error;
  }
}

async function finalizeJournalBackupSuccessHousekeeping({ successAt, status, pendingKey = JOURNAL_BACKUP_PENDING_KEY, operationId = '' } = {}) {
  const warnings = [];
  const run = async (label, task) => {
    try { await task(); }
    catch (error) {
      const message = `${label}: ${normalizeError(error)}`;
      warnings.push(message);
      appendOperationLogEvent(operationId, { category: 'recovery', level: 'warning', stage: 'backup-housekeeping', message });
    }
  };
  await run('Не удалось очистить verified backup checkpoint', () => mutateChromeStorageSerialized(`storage.local:${pendingKey}`, () => chrome.storage.local.remove(pendingKey), 'Очистка verified backup checkpoint'));
  await run('Не удалось очистить retry alarm резервного копирования', () => mutateChromeAlarmSerialized(JOURNAL_BACKUP_RETRY_ALARM, () => chrome.alarms.clear(JOURNAL_BACKUP_RETRY_ALARM), 'Очистка retry alarm резервного копирования'));
  if (status?.enabled) {
    await run('Не удалось запланировать следующий periodic backup', () => scheduleNextPeriodicBackup(successAt, status.intervalMinutes));
  }
  return warnings.join(' | ');
}

async function exportJournalBackupToYandex({ reason = 'manual', operationId = '' } = {}) {
  operationId = normalizeOperationIdInput(operationId) || makeOperationLogId('journal-backup');
  const isBackground = reason !== 'manual';
  const attemptAt = Date.now();
  const backupDate = new Date(attemptAt);
  await startOperationLog(operationId, 'journal-backup', isBackground ? 'Фоновая резервная копия журнала на Яндекс Диск' : 'Резервная копия журнала на Яндекс Диск', {
    reason
  });

  let lease = null;
  let status = null;
  try {
    lease = await acquireJournalBackupLease(operationId, reason);
    appendOperationLogEvent(operationId, {
      category: 'checkpoint', level: 'info', stage: 'backup-lease',
      message: 'Получен эксклюзивный lease резервного копирования журнала.',
      data: { expiresAt: lease.expiresAt, reason }
    });

    status = await getJournalBackupStatus();
    if (!status.rootPath) throw new Error('В настройках не выбрана корневая папка Яндекс Диска.');
    appendOperationLogEvent(operationId, { category: 'context', message: 'Определена корневая папка Яндекс Диска.', data: { rootPath: status.rootPath } });

    const recoveredUpload = await recoverPendingJournalBackup(status, operationId);
    if (recoveredUpload) {
      const successAt = Date.now();
      // Durable success commit point: fresh read + write are inside one
      // late-settlement queue turn, so an older timed-out set cannot land
      // after this newer verified success and resurrect stale state.
      await mutateJournalBackupState((previous) => {
        const state = {
          ...previous, lastSuccessAt: successAt, lastAttemptAt: attemptAt, lastError: '',
          lastReason: reason, lastRemotePath: recoveredUpload.remotePath,
          lastEntryCount: recoveredUpload.entryCount || previous.lastEntryCount || 0
        };
        if (isBackground) { state.lastBackgroundSuccessAt = successAt; state.lastBackgroundError = ''; }
        return state;
      }, 'Фиксация восстановленного успешного backup-state');
      const housekeepingWarning = await finalizeJournalBackupSuccessHousekeeping({ successAt, status, operationId });
      emitJournalBackupProgress(operationId, 'complete', housekeepingWarning
        ? 'Резервная копия подтверждена и success-state сохранён; часть фоновой уборки будет повторена позже.'
        : 'Восстановлен результат предыдущей прерванной передачи: резервная копия уже существует и проверена.',
        100, housekeepingWarning ? 'partial' : 'success', { remotePath: recoveredUpload.remotePath, recovered: true, housekeepingWarning });
      return { ok: true, ...recoveredUpload, successAt, background: isBackground, operationId, housekeepingWarning };
    }

    emitJournalBackupProgress(operationId, 'read-journal', 'Читаем локальный журнал пакетами и формируем согласованный chunked snapshot…', 10);
    const staged = await stageFullJournalExport();
    emitJournalBackupProgress(operationId, 'serialize', `Chunked JSON резервной копии сформирован. Записей: ${staged.entryCount}.`, 25, 'running', { entryCount: staged.entryCount, totalBytes: staged.totalBytes, chunkCount: staged.chunkCount });
    await renewJournalBackupLease(lease);
    appendOperationLogEvent(operationId, { category: 'checkpoint', level: 'info', stage: 'backup-lease', message: 'Lease резервного копирования продлён перед сетевой передачей.', data: { expiresAt: lease.expiresAt } });
    const uploaded = await uploadJournalExportStagedToYandex(staged, { backupDate, operationId, reason });
    const successAt = Date.now();
    // Durable success commit point. The actual Chrome Storage settlement, not
    // the local timeout, releases this queue turn. Everything after this
    // serialized fresh read-modify-write is secondary housekeeping.
    await mutateJournalBackupState((previous) => {
      const state = {
        ...previous,
        lastSuccessAt: successAt,
        lastAttemptAt: attemptAt,
        lastError: '',
        lastEntryCount: staged.entryCount,
        lastReason: reason,
        lastRemotePath: uploaded.remotePath
      };
      if (isBackground) {
        state.lastBackgroundSuccessAt = successAt;
        state.lastBackgroundError = '';
      }
      return state;
    }, 'Фиксация успешного backup-state');
    const housekeepingWarning = await finalizeJournalBackupSuccessHousekeeping({ successAt, status, operationId });
    emitJournalBackupProgress(operationId, 'complete', housekeepingWarning
      ? 'Резервная копия создана и success-state сохранён; часть фоновой уборки будет повторена позже.'
      : 'Резервная копия успешно создана и проверена на Яндекс Диске.',
      100, housekeepingWarning ? 'partial' : 'success', { remotePath: uploaded.remotePath, entryCount: staged.entryCount, housekeepingWarning });
    return {
      ok: true,
      remotePath: uploaded.remotePath,
      filename: uploaded.filename,
      monthFolder: uploaded.monthFolder,
      entryCount: staged.entryCount,
      exportedAt: staged.exportedAt,
      successAt,
      background: isBackground,
      operationId,
      housekeepingWarning
    };
  } catch (error) {
    const failureAt = Date.now();
    await mutateJournalBackupState((previous) => {
      const state = {
        ...previous,
        lastAttemptAt: attemptAt,
        lastError: normalizeError(error),
        lastReason: reason
      };
      if (isBackground) {
        state.lastFailureAt = failureAt;
        state.lastBackgroundFailureAt = failureAt;
        state.lastBackgroundError = normalizeError(error);
      }
      return state;
    }, 'Фиксация ошибки backup-state');
    if (status?.enabled && isBackground && error?.code !== 'JOURNAL_BACKUP_BUSY') {
      await scheduleBackupRetry(failureAt, status.retryMinutes);
    }
    emitJournalBackupProgress(operationId, 'error', `Ошибка: ${normalizeError(error)}`, 100, 'error');
    throw error;
  } finally {
    await releaseJournalBackupLease(lease).catch((error) => console.warn('WebClip backup lease release:', error));
  }
}

function parseJournalMonthFolder(name) {
  const match = /^(0[1-9]|1[0-2])-(\d{4})$/.exec(String(name || ''));
  if (!match) return null;
  return { month: Number(match[1]), year: Number(match[2]), sortKey: Number(`${match[2]}${match[1]}`) };
}

async function listYandexDirectoryItems(path, {
  operationId = '',
  maxItems = 50000,
  maxCollectedItems = null,
  deadlineMs = 45000,
  collectItem = null,
  itemFields = ['name', 'path', 'type', 'size', 'modified', 'mime_type']
} = {}) {
  const normalized = normalizeDiskPath(path || '/') || '/';
  const pageSize = 200;
  const hardLimit = Math.max(pageSize, Math.min(50000, Number(maxItems) || 50000));
  const collectedLimit = Math.max(1, Math.min(10000, Number(maxCollectedItems) || hardLimit));
  const collector = typeof collectItem === 'function' ? collectItem : (item) => item;
  const allowedItemFields = new Set(['name', 'path', 'type', 'size', 'modified', 'mime_type']);
  const selectedItemFields = [...new Set((Array.isArray(itemFields) ? itemFields : [])
    .map((field) => String(field || '').trim())
    .filter((field) => allowedItemFields.has(field)))];
  if (!selectedItemFields.includes('name')) selectedItemFields.unshift('name');
  if (!selectedItemFields.includes('path')) selectedItemFields.push('path');
  if (!selectedItemFields.includes('type')) selectedItemFields.push('type');
  const embeddedFields = selectedItemFields.map((field) => `_embedded.items.${field}`).join(',');
  const deadline = Date.now() + Math.max(5000, Math.min(120000, Number(deadlineMs) || 45000));
  const items = [];
  let offset = 0;
  let total = null;
  let rootMeta = null;

  while (true) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error(`Список папки ${normalized} не удалось получить за отведённое время.`);
    const data = await yandexApi('/resources', {
      method: 'GET',
      timeoutMs: Math.max(1000, Math.min(15000, remaining)),
      operationId,
      query: {
        path: normalized,
        limit: String(pageSize),
        offset: String(offset),
        fields: `name,path,type,${embeddedFields},_embedded.total,_embedded.limit,_embedded.offset`
      }
    });
    if (!rootMeta) rootMeta = data || {};
    const embedded = data?._embedded || {};
    const page = Array.isArray(embedded.items) ? embedded.items : [];
    const reportedTotal = Number(embedded.total);
    if (Number.isFinite(reportedTotal) && reportedTotal >= 0) total = reportedTotal;
    if (total != null && total > hardLimit) {
      throw new Error(`В папке ${normalized} слишком много элементов (${total}). Безопасный предел просмотра: ${hardLimit}.`);
    }
    if (offset + page.length > hardLimit) {
      throw new Error(`В папке ${normalized} превышен безопасный предел просмотра ${hardLimit} элементов.`);
    }
    for (const rawItem of page) {
      const collected = collector(rawItem);
      if (collected == null) continue;
      if (items.length >= collectedLimit) {
        throw new Error(`В папке ${normalized} слишком много подходящих элементов. Безопасный предел результата: ${collectedLimit}.`);
      }
      items.push(collected);
    }
    if (!page.length) break;
    offset += page.length;
    if ((total != null && offset >= total) || page.length < pageSize) break;
  }

  return { normalized, data: rootMeta || {}, items, total: total ?? offset, scannedItems: offset };
}

async function listYandexResourceItems(path, options = {}) {
  const filter = typeof options.filter === 'function' ? options.filter : null;
  const listed = await listYandexDirectoryItems(path, {
    ...options,
    collectItem: (item) => {
      const normalizedItem = {
        name: normalizeYandexItemNameFromApi(item?.name),
        path: normalizeYandexDiskPathFromApi(item?.path),
        type: boundedYandexExternalText(item?.type, MAX_YANDEX_ITEM_TYPE_CHARS),
        size: Number(item?.size || 0),
        modified: boundedYandexExternalText(item?.modified, MAX_YANDEX_ITEM_MODIFIED_CHARS, { rejectOverflow: true, label: 'Дата ресурса Яндекс Диска' }),
        mimeType: boundedYandexExternalText(item?.mime_type, MAX_YANDEX_ITEM_MIME_CHARS, { rejectOverflow: true, label: 'MIME-тип ресурса Яндекс Диска' })
      };
      return filter && !filter(normalizedItem) ? null : normalizedItem;
    }
  });
  return listed.items;
}

async function listJournalBackupsOnYandex(requestedMonth = '') {
  const status = await getJournalBackupStatus();
  if (!status.rootPath) throw new Error('В настройках не выбрана корневая папка Яндекс Диска.');
  const structure = await ensureYandexServiceFolders({ includeBackup: true });
  const journalRoot = structure.journalPath;

  const selectedMonth = String(requestedMonth || journalBackupMonthFolderName(new Date()));
  if (!parseJournalMonthFolder(selectedMonth)) {
    throw new Error('Некорректный месяц резервной копии. Ожидается формат MM-YYYY.');
  }

  const monthPath = joinDiskPath(journalRoot, selectedMonth);
  let items = [];
  try {
    items = await listYandexResourceItems(monthPath, {
      maxItems: 50000,
      maxCollectedItems: 5000,
      itemFields: ['name', 'path', 'type', 'size', 'modified'],
      filter: (item) => item.type === 'file' && /\.json$/i.test(item.name) && /^WebClip_Journal_/i.test(item.name)
    });
  } catch (error) {
    if (Number(error?.status) !== 404) throw error;
  }

  const files = items
    .map((item) => ({ ...item, monthFolder: selectedMonth, legacy: false }))
    .sort((a, b) => {
      const at = Date.parse(a.modified || '') || 0;
      const bt = Date.parse(b.modified || '') || 0;
      if (bt !== at) return bt - at;
      return b.name.localeCompare(a.name, 'ru');
    });

  return { ok: true, journalRoot, selectedMonth, monthPath, files };
}

async function fetchJournalBackupFromYandex(requestedPath, operationId = '', ownerSessionId = '') {
  operationId = String(operationId || '') || makeOperationLogId('journal-import-yandex');
  const remotePath = normalizeDiskPath(requestedPath || '');
  await startOperationLog(operationId, 'journal-import-yandex', 'Восстановление журнала с Яндекс Диска', { remotePath });
  try {
    recordOperationStage(operationId, 'locate-backup', 'Проверяем выбранную резервную копию на Яндекс Диске…', 10, 'running', { remotePath });
    const status = await getJournalBackupStatus();
    if (!status.rootPath) throw new Error('В настройках не выбрана корневая папка Яндекс Диска.');
    const structure = await ensureYandexServiceFolders({ includeBackup: true, operationId });
    if (!remotePath) throw new Error('Выберите конкретный файл резервной копии для импорта.');
    if (!isAllowedJournalBackupPath(remotePath, structure.journalPath)) {
      throw new Error('Выбранный файл находится вне папки резервных копий Journal.');
    }

    recordOperationStage(operationId, 'download-link', 'Получаем адрес скачивания резервной копии…', 25);
    const downloadLink = await yandexApi('/resources/download', {
      method: 'GET',
      query: { path: remotePath },
      operationId
    });
    if (!downloadLink?.href) throw new Error('Яндекс Диск не вернул адрес выбранной резервной копии журнала.');

    recordOperationStage(operationId, 'download', 'Скачиваем резервную копию журнала…', 42);
    const downloaded = await runOffscreenSignedTransfer({
      mode: 'text-download',
      url: downloadLink.href,
      method: downloadLink.method || 'GET',
      maxChars: 50 * 1024 * 1024
    }, { operationId, label: 'Скачивание резервной копии журнала', timeoutMs: 90_000 });
    if (!downloaded.ok) throw new Error(`Не удалось скачать выбранную резервную копию журнала: HTTP ${downloaded.status}${downloaded.details ? ` — ${downloaded.details}` : ''}`);
    const responsePayloadKey = String(downloaded.payloadKey || '');
    if (!responsePayloadKey) throw new Error('Offscreen transfer не вернул скачанные данные резервной копии.');
    try {
      recordOperationStage(operationId, 'validate', 'Потоково проверяем структуру скачанной резервной копии…', 60, 'running');
      const inspected = await inspectStagedJournalImportStream(responsePayloadKey);
      const expectedJournalRevision = await journalRevisionSnapshot(Date.now() + JOURNAL_IMPORT_PARSE_TIMEOUT_MS);
      const previewReceipt = createJournalImportPreviewReceipt(
        responsePayloadKey,
        'yandex',
        operationId,
        inspected,
        expectedJournalRevision
      );
      const importLease = await acquireJournalImportLease(previewReceipt, ownerSessionId);
      appendOperationLogEvent(operationId, {
        category: 'checkpoint', level: 'info', stage: 'await-confirmation',
        message: 'Резервная копия скачана и потоково проверена. Ожидается подтверждение замены локального журнала.',
        data: {
          remotePath,
          entryCount: inspected.entryCount,
          contentSha256: inspected.contentSha256,
          expectedJournalRevision
        }
      });
      return {
        ok: true,
        remotePath,
        stagingKey: responsePayloadKey,
        entryCount: inspected.entryCount,
        exportedAt: inspected.exportedAt || '',
        contentSha256: inspected.contentSha256,
        operationId,
        previewReceipt,
        leaseToken: importLease.leaseToken,
        leaseExpiresAt: importLease.leaseExpiresAt,
        hardExpiresAt: importLease.hardExpiresAt
      };
    } catch (error) {
      await deleteTransferPayloadGroup(responsePayloadKey).catch(() => {});
      throw error;
    }
  } catch (error) {
    recordOperationStage(operationId, 'error', `Ошибка восстановления: ${normalizeError(error)}`, 100, 'error');
    throw error;
  }
}

async function scheduleNextPeriodicBackup(baseAt, intervalMinutes) {
  const period = normalizeIntervalMinutes(intervalMinutes, DEFAULT_JOURNAL_BACKUP_INTERVAL_MINUTES);
  const when = Math.max(Date.now() + 60000, Number(baseAt || Date.now()) + period * 60000);
  await mutateChromeAlarmSerialized(
    JOURNAL_BACKUP_ALARM,
    () => chrome.alarms.create(JOURNAL_BACKUP_ALARM, { when }),
    'Планирование periodic backup alarm'
  );
}

async function scheduleBackupRetry(baseAt, retryMinutes) {
  const retry = normalizeIntervalMinutes(retryMinutes, DEFAULT_JOURNAL_BACKUP_RETRY_MINUTES);
  const when = Math.max(Date.now() + 60000, Number(baseAt || Date.now()) + retry * 60000);
  await mutateChromeAlarmSerialized(
    JOURNAL_BACKUP_RETRY_ALARM,
    () => chrome.alarms.create(JOURNAL_BACKUP_RETRY_ALARM, { when }),
    'Планирование retry backup alarm'
  );
}

async function scheduleDueBackupSoon() {
  // Use a durable alarm boundary instead of starting a long backup from a
  // worker-start/startup initialization chain. One minute is within the
  // extension's background cadence and ensures Chrome can wake the worker.
  await mutateChromeAlarmSerialized(
    JOURNAL_BACKUP_ALARM,
    () => chrome.alarms.create(JOURNAL_BACKUP_ALARM, { when: Date.now() + 60_000 }),
    'Планирование ближайшего backup alarm'
  );
}

async function initializeJournalBackupScheduler(reason = 'init') {
  const status = await getJournalBackupStatus();

  if (reason === 'worker-start') {
    if (!status.enabled) return { ok: true, enabled: false, lightweight: true };
    const [periodicAlarm, retryAlarm] = await Promise.all([
      getChromeAlarmBounded(JOURNAL_BACKUP_ALARM, 'Проверка periodic backup alarm'),
      getChromeAlarmBounded(JOURNAL_BACKUP_RETRY_ALARM, 'Проверка retry backup alarm')
    ]);
    if (periodicAlarm || retryAlarm) {
      return { ok: true, enabled: true, lightweight: true, alarmAlreadyPresent: true };
    }
    // Only reconstruct scheduling if both alarms are unexpectedly absent.
  } else {
    await mutateChromeAlarmSerialized(
      JOURNAL_BACKUP_ALARM,
      () => chrome.alarms.clear(JOURNAL_BACKUP_ALARM),
      'Очистка periodic backup alarm'
    );
    await mutateChromeAlarmSerialized(
      JOURNAL_BACKUP_RETRY_ALARM,
      () => chrome.alarms.clear(JOURNAL_BACKUP_RETRY_ALARM),
      'Очистка retry backup alarm'
    );
  }

  if (!status.enabled) {
    return { ok: true, enabled: false };
  }

  const now = Date.now();
  const due = !status.lastSuccessAt || now >= status.lastSuccessAt + status.intervalMinutes * 60000;
  const retryBlocked = status.lastFailureAt &&
    (!status.lastSuccessAt || status.lastFailureAt > status.lastSuccessAt) &&
    now < status.lastFailureAt + status.retryMinutes * 60000;

  if (due && retryBlocked) {
    await scheduleBackupRetry(status.lastFailureAt, status.retryMinutes);
  } else if (due) {
    // Если Chrome был закрыт дольше установленного периода, планируем ближайший
    // alarm вместо fire-and-forget тяжёлой операции из startup/worker-start.
    await scheduleDueBackupSoon();
  } else {
    await scheduleNextPeriodicBackup(status.lastSuccessAt, status.intervalMinutes);
  }
  return { ok: true, enabled: true };
}

async function runDueJournalBackup(reason = 'scheduled', forceRetry = false) {
  const operationId = makeOperationLogId('background-backup');
  await startOperationLog(operationId, 'journal-backup-check', 'Фоновая проверка резервного копирования журнала', {
    reason, forceRetry: Boolean(forceRetry), background: true
  });
  try {
    recordOperationStage(operationId, 'settings', 'Проверяем настройки фонового экспорта журнала…', 10, 'running', { reason, forceRetry: Boolean(forceRetry) });
    const status = await getJournalBackupStatus();
    if (!status.enabled || !status.rootPath) {
      recordOperationStage(operationId, 'complete', status.enabled ? 'Фоновый экспорт пропущен: не выбрана корневая папка Яндекс Диска.' : 'Фоновый экспорт пропущен: автоматический экспорт выключен.', 100, 'success', {
        skipped: true, enabled: Boolean(status.enabled), hasRootPath: Boolean(status.rootPath)
      });
      return { ok: true, skipped: true, operationId };
    }

    const now = Date.now();
    const unresolvedFailure = status.lastFailureAt && (!status.lastSuccessAt || status.lastFailureAt > status.lastSuccessAt);
    if (forceRetry && !unresolvedFailure) {
      // A retry alarm can already be queued when a newer backup succeeds. The
      // old alarm is stale and must not force an extra backup after success.
      await scheduleNextPeriodicBackup(status.lastSuccessAt || now, status.intervalMinutes);
      recordOperationStage(operationId, 'complete', 'Устаревший retry alarm пропущен: более новый backup уже завершился успешно.', 100, 'success', {
        skipped: true, staleRetryAlarm: true, lastSuccessAt: status.lastSuccessAt, lastFailureAt: status.lastFailureAt
      });
      return { ok: true, skipped: true, staleRetryAlarm: true, operationId };
    }
    const due = !status.lastSuccessAt || now >= status.lastSuccessAt + status.intervalMinutes * 60000;
    if (!due && !forceRetry) {
      await scheduleNextPeriodicBackup(status.lastSuccessAt, status.intervalMinutes);
      recordOperationStage(operationId, 'complete', 'Фоновый экспорт пока не требуется. Следующий запуск запланирован.', 100, 'success', {
        skipped: true, due: false, lastSuccessAt: status.lastSuccessAt, intervalMinutes: status.intervalMinutes
      });
      return { ok: true, skipped: true, due: false, operationId };
    }

    if (!forceRetry && unresolvedFailure) {
      const retryAt = status.lastFailureAt + status.retryMinutes * 60000;
      if (now < retryAt) {
        await scheduleBackupRetry(status.lastFailureAt, status.retryMinutes);
        recordOperationStage(operationId, 'complete', 'Фоновый экспорт отложен до запланированного повтора после предыдущей ошибки.', 100, 'success', {
          skipped: true, retryScheduled: true, retryAt, retryMinutes: status.retryMinutes
        });
        return { ok: true, skipped: true, retryScheduled: true, operationId };
      }
    }

    appendOperationLogEvent(operationId, {
      category: 'background-decision', level: 'info', stage: 'decision',
      message: 'Фоновый экспорт требуется. Переходим к формированию и отправке журнала.',
      data: { reason, forceRetry: Boolean(forceRetry), due: true }
    });
    return await exportJournalBackupToYandex({ reason, operationId });
  } catch (error) {
    recordOperationStage(operationId, 'error', `Ошибка фоновой операции: ${normalizeError(error)}`, 100, 'error', { reason });
    console.warn('WebClip journal backup:', error);
    return { ok: false, error: normalizeError(error), operationId };
  } finally {
    await flushOperationLogWrites(operationId);
  }
}

function openTransferPayloadDb(timeoutMs = 10_000) {
  return openIndexedDbBounded(
    TRANSFER_DB_NAME,
    TRANSFER_DB_VERSION,
    (db) => {
      if (!db.objectStoreNames.contains(TRANSFER_STORE)) {
        db.createObjectStore(TRANSFER_STORE, { keyPath: 'id' });
      }
    },
    'Не удалось открыть временное хранилище offscreen-передач.',
    Math.max(1, Math.min(20_000, Number(timeoutMs) || 10_000))
  );
}

async function putTransferTextPayload(text, kind = 'upload-text') {
  const value = String(text || '');
  if (value.length > MAX_TRANSFER_TEXT_CHARS) {
    throw new Error(`Данные передачи превышают безопасный предел ${Math.floor(MAX_TRANSFER_TEXT_CHARS / 1024 / 1024)} МБ.`);
  }
  await ensureStorageBudget(Math.min(Number.MAX_SAFE_INTEGER, value.length * 2), 'временных данных передачи');
  const id = `transfer-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  const db = await openTransferPayloadDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(TRANSFER_STORE, 'readwrite');
      tx.objectStore(TRANSFER_STORE).put({ id, kind: String(kind || 'text').slice(0, 80), text: value, createdAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Не удалось записать временные данные передачи.'));
      tx.onabort = () => reject(tx.error || new Error('Запись временных данных передачи была прервана.'));
    });
  } finally { db.close(); }
  return id;
}

async function putTransferRecord(record, deadlineAt = 0) {
  if (!record?.id || String(record.id).length > 240) throw new Error('Некорректный идентификатор временных данных передачи.');
  const absoluteDeadline = deadlineAt > 0 ? Number(deadlineAt) : Date.now() + 20_000;
  const remaining = () => {
    const value = absoluteDeadline - Date.now();
    if (value <= 0) {
      const error = new Error('Запись временных данных передачи превысила общий deadline экспорта.');
      error.code = deadlineAt > 0 ? 'JOURNAL_EXPORT_TIMEOUT' : 'WEBCLIP_IDB_TIMEOUT';
      throw error;
    }
    return Math.max(1, Math.min(20_000, value));
  };
  const db = await openTransferPayloadDb(remaining());
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(TRANSFER_STORE, 'readwrite');
      let settled = false;
      const finish = (fn, value) => { if (settled) return; settled = true; clearTimeout(timer); fn(value); };
      const timer = setTimeout(() => {
        try { tx.abort(); } catch (_) {}
        const error = new Error('Запись временных данных передачи превысила общий deadline экспорта.');
        error.code = deadlineAt > 0 ? 'JOURNAL_EXPORT_TIMEOUT' : 'WEBCLIP_IDB_TIMEOUT';
        finish(reject, error);
      }, remaining());
      tx.objectStore(TRANSFER_STORE).put(record);
      tx.oncomplete = () => finish(resolve);
      tx.onerror = () => finish(reject, tx.error || new Error('Не удалось записать временные данные передачи.'));
      tx.onabort = () => { if (!settled) finish(reject, tx.error || new Error('Запись временных данных передачи была прервана.')); };
    });
  } finally { db.close(); }
}

function transferChunkId(baseId, index) {
  return `${String(baseId || '')}:chunk:${String(index).padStart(6, '0')}`;
}

async function deleteTransferPayloadGroup(baseId, deadlineAt = 0) {
  const key = String(baseId || '');
  if (!key) return;
  const absoluteDeadline = deadlineAt > 0 ? Number(deadlineAt) : Date.now() + 20_000;
  const remaining = () => {
    const value = absoluteDeadline - Date.now();
    if (value <= 0) {
      const error = new Error('Удаление временного набора данных передачи превысило общий deadline экспорта.');
      error.code = deadlineAt > 0 ? 'JOURNAL_EXPORT_TIMEOUT' : 'WEBCLIP_IDB_TIMEOUT';
      throw error;
    }
    return Math.max(1, Math.min(20_000, value));
  };
  const db = await openTransferPayloadDb(remaining());
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(TRANSFER_STORE, 'readwrite');
      const store = tx.objectStore(TRANSFER_STORE);
      let settled = false;
      const finish = (fn, value) => { if (settled) return; settled = true; clearTimeout(timer); fn(value); };
      const timer = setTimeout(() => {
        try { tx.abort(); } catch (_) {}
        const error = new Error('Удаление временного набора данных передачи превысило общий deadline экспорта.');
        error.code = deadlineAt > 0 ? 'JOURNAL_EXPORT_TIMEOUT' : 'WEBCLIP_IDB_TIMEOUT';
        finish(reject, error);
      }, remaining());
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        const id = String(cursor.key || '');
        if (id === key || id.startsWith(`${key}:chunk:`)) cursor.delete();
        cursor.continue();
      };
      req.onerror = () => finish(reject, req.error || new Error('Не удалось удалить временный набор данных передачи.'));
      tx.oncomplete = () => finish(resolve);
      tx.onerror = () => finish(reject, tx.error || new Error('Не удалось удалить временный набор данных передачи.'));
      tx.onabort = () => { if (!settled) finish(reject, tx.error || new Error('Удаление временного набора данных передачи было прервано.')); };
    });
  } finally { db.close(); }
}

async function getTransferTextPayload(id) {
  const key = String(id || '');
  if (!key) throw new Error('Не указан идентификатор временных данных передачи.');
  const db = await openTransferPayloadDb();
  try {
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction(TRANSFER_STORE, 'readonly');
      const req = tx.objectStore(TRANSFER_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error('Не удалось прочитать временные данные передачи.'));
    });
    if (!record || typeof record.text !== 'string') throw new Error('Временные данные передачи не найдены.');
    if (record.text.length > MAX_TRANSFER_TEXT_CHARS) throw new Error('Временные данные передачи превышают безопасный предел.');
    return record.text;
  } finally { db.close(); }
}

async function getTransferImportRecord(id, timeoutMs = 20_000) {
  const key = String(id || '');
  if (!key || key.length > 240) throw new Error('Некорректный идентификатор подготовленного импорта журнала.');
  const db = await openTransferPayloadDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(TRANSFER_STORE, 'readonly');
      let settled = false;
      let result = null;
      const finish = (error = null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) reject(error); else resolve(result);
      };
      const timer = setTimeout(() => {
        try { tx.abort(); } catch (_) {}
        const error = new Error('Чтение staged import из IndexedDB превысило безопасный deadline.');
        error.code = 'JOURNAL_IMPORT_STAGING_TIMEOUT';
        finish(error);
      }, Math.max(1000, Number(timeoutMs) || 20_000));
      const req = tx.objectStore(TRANSFER_STORE).get(key);
      req.onsuccess = () => { result = req.result || null; };
      req.onerror = () => finish(req.error || new Error('Не удалось прочитать staged import.'));
      tx.oncomplete = () => finish();
      tx.onerror = () => finish(tx.error || new Error('Ошибка чтения staged import.'));
      tx.onabort = () => finish(tx.error || new Error('Чтение staged import было прервано.'));
    });
  } finally { db.close(); }
}

async function* streamStagedJournalImportText(
  stagingKey,
  deadlineAt = Date.now() + JOURNAL_IMPORT_PARSE_TIMEOUT_MS,
  observers = {}
) {
  const key = String(stagingKey || '').trim();
  const onManifest = typeof observers?.onManifest === 'function' ? observers.onManifest : null;
  const onBytes = typeof observers?.onBytes === 'function' ? observers.onBytes : null;
  const manifest = await getTransferImportRecord(key, Math.min(20_000, Math.max(1000, deadlineAt - Date.now())));
  if (!manifest) throw new Error('Подготовленные данные импорта журнала не найдены.');
  if (onManifest) await onManifest(manifest);

  if (manifest.kind === 'journal-import-manifest') {
    const chunkCount = Math.max(0, Number(manifest.chunkCount) || 0);
    const declaredBytes = Math.max(0, Number(manifest.totalBytes) || 0);
    if (!Number.isSafeInteger(chunkCount) || chunkCount < 1 || chunkCount > 64) throw new Error('Некорректный manifest потокового импорта журнала.');
    if (declaredBytes > MAX_JOURNAL_IMPORT_BYTES) throw new Error('Файл журнала больше безопасного предела 50 МБ.');
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let actualBytes = 0;
    for (let index = 0; index < chunkCount; index += 1) {
      if (Date.now() >= deadlineAt) {
        const error = new Error('Чтение потокового импорта превысило безопасный deadline.');
        error.code = 'JOURNAL_IMPORT_PARSE_TIMEOUT';
        throw error;
      }
      const chunkId = transferChunkId(key, index);
      const record = await getTransferImportRecord(chunkId, Math.min(20_000, Math.max(1000, deadlineAt - Date.now())));
      const blob = record?.blob instanceof Blob ? record.blob : null;
      if (!blob || record?.baseId !== key || Number(record?.chunkIndex) !== index) {
        throw new Error(`Не найден chunk ${index + 1}/${chunkCount} подготовленного импорта журнала.`);
      }
      if (blob.size > 2 * 1024 * 1024) throw new Error('Один chunk импорта журнала превышает безопасный предел.');
      actualBytes += blob.size;
      if (actualBytes > MAX_JOURNAL_IMPORT_BYTES) throw new Error('Файл журнала больше безопасного предела 50 МБ.');
      const remainingMs = Math.min(20_000, Math.max(1000, deadlineAt - Date.now()));
      const bytes = await withOperationTimeout(blob.arrayBuffer(), remainingMs, 'Чтение chunk импорта журнала');
      if (onBytes) await onBytes(new Uint8Array(bytes));
      const text = decoder.decode(bytes, { stream: index + 1 < chunkCount });
      if (text) yield text;
    }
    const tail = decoder.decode();
    if (tail) yield tail;
    if (declaredBytes !== actualBytes) {
      throw new Error(`Размер staged import не совпадает с manifest (${actualBytes} вместо ${declaredBytes} байт).`);
    }
    return;
  }

  // Compatibility only for a staging record created by an older extension page
  // before this worker upgrade. New imports never create a whole 50 MiB string.
  if (typeof manifest.text === 'string') {
    if (manifest.text.length > MAX_JOURNAL_EXPORT_TEXT_CHARS) throw new Error('Файл журнала превышает безопасный размер импорта.');
    const encoder = new TextEncoder();
    let actualBytes = 0;
    for (let offset = 0; offset < manifest.text.length;) {
      if (Date.now() >= deadlineAt) {
        const error = new Error('Чтение потокового импорта превысило безопасный deadline.');
        error.code = 'JOURNAL_IMPORT_PARSE_TIMEOUT';
        throw error;
      }
      let end = Math.min(manifest.text.length, offset + TRANSFER_TEXT_CHUNK_CHARS);
      const finalCodeUnit = manifest.text.charCodeAt(end - 1);
      const nextCodeUnit = manifest.text.charCodeAt(end);
      if (
        end < manifest.text.length
        && finalCodeUnit >= 0xd800 && finalCodeUnit <= 0xdbff
        && nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff
      ) end -= 1;
      const text = manifest.text.slice(offset, end);
      const bytes = encoder.encode(text);
      actualBytes += bytes.byteLength;
      if (actualBytes > MAX_JOURNAL_IMPORT_BYTES) throw new Error('Файл журнала больше безопасного предела 50 МБ.');
      if (onBytes) await onBytes(bytes);
      if (text) yield text;
      offset = end;
    }
    return;
  }
  throw new Error('Неподдерживаемый формат staged import журнала.');
}

async function deleteTransferPayload(id) {
  const key = String(id || '');
  if (!key) return;
  const db = await openTransferPayloadDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(TRANSFER_STORE, 'readwrite');
      tx.objectStore(TRANSFER_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Не удалось удалить временные данные передачи.'));
      tx.onabort = () => reject(tx.error || new Error('Удаление временных данных передачи было прервано.'));
    });
  } finally { db.close(); }
}

async function cleanupTransferPayloads() {
  const now = Date.now();
  const cutoff = now - TRANSFER_PAYLOAD_TTL_MS;
  let protectedImportKey = '';
  try {
    const lease = await readJournalImportLeaseRecord();
    if (lease && lease.hardExpiresAt > now) protectedImportKey = lease.previewReceipt.stagingKey;
  } catch (error) {
    // Corrupt/unknown ownership is fail-closed: do not age-delete Journal
    // import payloads until explicit recovery can inspect the checkpoint.
    console.warn('WebClip Journal import lease cleanup guard:', error);
    protectedImportKey = '*';
  }
  const db = await openTransferPayloadDb(MAINTENANCE_IDB_TX_TIMEOUT_MS);
  let deleted = 0;
  try {
    await runIndexedDbTransactionBounded(
      db,
      TRANSFER_STORE,
      'readwrite',
      'Очистка временных данных передач',
      ({ store, fail }) => {
        const req = store().openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) return;
          const id = String(cursor.key || '');
          const kind = String(cursor.value?.kind || '');
          const protectedByLease = protectedImportKey && (
            protectedImportKey === '*'
              ? (kind === 'journal-import-manifest' || kind === 'journal-import-chunk-blob')
              : (id === protectedImportKey || id.startsWith(`${protectedImportKey}:chunk:`))
          );
          if (!protectedByLease && Number(cursor.value?.createdAt || 0) < cutoff) {
            cursor.delete();
            deleted += 1;
          }
          cursor.continue();
        };
        req.onerror = () => fail(req.error || new Error('Не удалось проверить временные данные передач.'));
      },
      MAINTENANCE_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
  return deleted;
}


function pdfRetryIndexKey(tabId) {
  const id = Math.max(0, Math.floor(Number(tabId) || 0));
  return id > 0 ? `tab:${id}` : '';
}

function issuePdfCacheGeneration() {
  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
    const error = new Error('Не удалось выдать внутреннюю generation PDF cache.');
    error.code = 'WEBCLIP_PDF_CACHE_GENERATION_UNAVAILABLE';
    throw error;
  }
  const generation = crypto.randomUUID();
  return Object.freeze({ generation, key: `pdf:${generation}` });
}

function isExactSealedPdfCacheIdentity(record = {}) {
  const generation = String(record.cacheGeneration || '').trim();
  const key = String(record.key || '').trim();
  return Boolean(
    generation &&
    generation.length <= 80 &&
    key === `pdf:${generation}` &&
    record.sealed === true
  );
}

function pdfCacheMetadataFromRecord(record = {}) {
  const pdfBase64 = typeof record.pdfBase64 === 'string' ? record.pdfBase64 : '';
  const pdfBlob = record.pdfBlob instanceof Blob ? record.pdfBlob : null;
  const pdfByteLength = Math.max(0, Number(record.pdfByteLength) || (pdfBlob ? pdfBlob.size : 0) || (pdfBase64 ? base64DecodedByteLength(pdfBase64) : 0));
  return {
    key: String(record.key || ''),
    cacheGeneration: String(record.cacheGeneration || '').slice(0, 80),
    sealed: Boolean(record.sealed),
    tabId: Math.max(0, Number(record.tabId) || 0),
    filename: String(record.filename || '').slice(0, 512),
    meta: record.meta && typeof record.meta === 'object' ? record.meta : {},
    createdAt: Number(record.createdAt || Date.now()),
    sourceUrl: String(record.sourceUrl || '').slice(0, MAX_IMPORTED_URL_CHARS),
    pdfByteLength,
    pdfBase64Chars: pdfBase64 ? pdfBase64.length : Math.max(0, Number(record.pdfBase64Chars) || 0),
    cacheFormat: pdfBlob ? 'blob-v3' : pdfBase64 ? 'base64-legacy' : String(record.cacheFormat || ''),
    temporary: Boolean(record.temporary),
    journalEntryId: String(record.journalEntryId || '').slice(0, 220),
    sourceReceipt: sanitizePdfSourceReceipt(record.sourceReceipt)
  };
}


function pdfBase64ToBlob(base64) {
  const text = String(base64 || '');
  if (!text || text.length > MAX_PDF_BASE64_CHARS || text.length % 4 !== 0) {
    throw new Error('Некорректный или слишком большой Base64 PDF.');
  }
  const chunkChars = 4 * 1024 * 1024;
  const chunks = [];
  let offset = 0;
  while (offset < text.length) {
    let end = Math.min(text.length, offset + chunkChars);
    if (end < text.length) end -= (end - offset) % 4;
    if (end <= offset) throw new Error('Некорректный Base64 PDF.');
    const binary = atob(text.slice(offset, end));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    chunks.push(bytes);
    offset = end;
  }
  return new Blob(chunks, { type: 'application/pdf' });
}

function openPdfCacheDb() {
  return openIndexedDbBounded(
    PDF_CACHE_DB_NAME,
    PDF_CACHE_DB_VERSION,
    (db, tx, event) => {
      let pdfStore;
      if (!db.objectStoreNames.contains(PDF_CACHE_STORE)) {
        pdfStore = db.createObjectStore(PDF_CACHE_STORE, { keyPath: 'key' });
      } else {
        pdfStore = tx.objectStore(PDF_CACHE_STORE);
      }
      let metaStore;
      if (!db.objectStoreNames.contains(PDF_CACHE_META_STORE)) {
        metaStore = db.createObjectStore(PDF_CACHE_META_STORE, { keyPath: 'key' });
      } else {
        metaStore = tx.objectStore(PDF_CACHE_META_STORE);
      }
      if (!db.objectStoreNames.contains(PDF_CACHE_RETRY_INDEX_STORE)) {
        db.createObjectStore(PDF_CACHE_RETRY_INDEX_STORE, { keyPath: 'key' });
      }
      if (Number(event?.oldVersion || 0) < 2 && pdfStore && metaStore) {
        const request = pdfStore.openCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return;
          try { metaStore.put(pdfCacheMetadataFromRecord(cursor.value || {})); } catch (_) {}
          cursor.continue();
        };
      }
    },
    'Не удалось открыть локальный кэш PDF.'
  );
}

async function putCachedPdf(record) {
  if (!record?.key) throw new Error('Не указан ключ PDF cache.');
  const normalizedRecord = { ...record };
  const wantsSealedGeneration = normalizedRecord.sealed === true;
  if (wantsSealedGeneration && !isExactSealedPdfCacheIdentity(normalizedRecord)) {
    const error = new Error('Некорректная immutable generation PDF cache.');
    error.code = 'WEBCLIP_PDF_CACHE_GENERATION_INVALID';
    throw error;
  }
  if (!wantsSealedGeneration && String(normalizedRecord.key || '').startsWith('pdf:')) {
    const error = new Error('Пространство pdf:* разрешено только sealed PDF cache generations.');
    error.code = 'WEBCLIP_PDF_CACHE_GENERATION_INVALID';
    throw error;
  }

  const sourceBase64 = typeof normalizedRecord.pdfBase64 === 'string' ? normalizedRecord.pdfBase64 : '';
  const anticipatedPdfBytes = sourceBase64
    ? base64DecodedByteLength(sourceBase64)
    : normalizedRecord.pdfBlob instanceof Blob
      ? normalizedRecord.pdfBlob.size
      : Math.max(0, Number(normalizedRecord.pdfByteLength) || 0);
  await ensureStorageBudget(anticipatedPdfBytes, 'временного PDF cache');
  if (sourceBase64) {
    const blob = pdfBase64ToBlob(sourceBase64);
    normalizedRecord.pdfBlob = blob;
    normalizedRecord.pdfByteLength = blob.size;
    normalizedRecord.pdfBase64Chars = sourceBase64.length;
    normalizedRecord.cacheFormat = 'blob-v3';
    delete normalizedRecord.pdfBase64;
  }
  const metadata = pdfCacheMetadataFromRecord(normalizedRecord);
  normalizedRecord.pdfByteLength = metadata.pdfByteLength;
  normalizedRecord.pdfBase64Chars = metadata.pdfBase64Chars;
  normalizedRecord.cacheFormat = metadata.cacheFormat;
  normalizedRecord.cacheGeneration = metadata.cacheGeneration;
  normalizedRecord.sealed = metadata.sealed;
  normalizedRecord.sourceReceipt = metadata.sourceReceipt;

  const db = await openPdfCacheDb();
  try {
    await runIndexedDbTransactionBounded(
      db,
      [PDF_CACHE_STORE, PDF_CACHE_META_STORE],
      'readwrite',
      wantsSealedGeneration ? 'Создание sealed PDF retry-cache generation' : 'Сохранение PDF retry-cache',
      ({ tx, fail }) => {
        const pdfStore = tx.objectStore(PDF_CACHE_STORE);
        const metaStore = tx.objectStore(PDF_CACHE_META_STORE);
        const pdfRequest = wantsSealedGeneration ? pdfStore.add(normalizedRecord) : pdfStore.put(normalizedRecord);
        const metaRequest = wantsSealedGeneration ? metaStore.add(metadata) : metaStore.put(metadata);
        const handleWriteError = (request, fallback) => {
          if (wantsSealedGeneration && request.error?.name === 'ConstraintError') {
            const error = new Error('Immutable PDF cache generation уже существует.');
            error.code = 'WEBCLIP_PDF_CACHE_GENERATION_EXISTS';
            fail(error);
            return;
          }
          fail(request.error || new Error(fallback));
        };
        pdfRequest.onerror = () => handleWriteError(pdfRequest, 'Не удалось сохранить PDF для повторной отправки.');
        metaRequest.onerror = () => handleWriteError(metaRequest, 'Не удалось сохранить metadata PDF для повторной отправки.');
      },
      PDF_CACHE_CRUD_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
  return metadata;
}


async function getCachedPdfByKey(key) {
  const cacheKey = String(key || '');
  if (!cacheKey) return null;
  const db = await openPdfCacheDb();
  try {
    return await runIndexedDbTransactionBounded(
      db,
      PDF_CACHE_STORE,
      'readonly',
      'Чтение PDF retry-cache',
      ({ store, setResult, fail }) => {
        const request = store().get(cacheKey);
        request.onsuccess = () => setResult(request.result || null);
        request.onerror = () => fail(request.error || new Error('Не удалось прочитать локальный кэш PDF.'));
      },
      PDF_CACHE_CRUD_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
}

async function getCachedPdfMetadataByKey(key) {
  const cacheKey = String(key || '');
  if (!cacheKey) return null;
  const db = await openPdfCacheDb();
  try {
    const metadata = await runIndexedDbTransactionBounded(
      db,
      PDF_CACHE_META_STORE,
      'readonly',
      'Чтение metadata PDF retry-cache',
      ({ store, setResult, fail }) => {
        const request = store().get(cacheKey);
        request.onsuccess = () => setResult(request.result || null);
        request.onerror = () => fail(request.error || new Error('Не удалось прочитать metadata PDF cache.'));
      },
      PDF_CACHE_CRUD_IDB_TX_TIMEOUT_MS
    );
    if (metadata) return metadata;
  } finally { db.close(); }

  if (cacheKey.startsWith('pdf:')) return null;

  const legacy = await getCachedPdfByKey(cacheKey);
  if (!legacy) return null;
  const metadata = pdfCacheMetadataFromRecord(legacy);
  const repairDb = await openPdfCacheDb();
  try {
    await runIndexedDbTransactionBounded(
      repairDb,
      PDF_CACHE_META_STORE,
      'readwrite',
      'Восстановление metadata PDF retry-cache',
      ({ store, fail }) => {
        const request = store().put(metadata);
        request.onerror = () => fail(request.error || new Error('Не удалось восстановить metadata PDF cache.'));
      },
      PDF_CACHE_CRUD_IDB_TX_TIMEOUT_MS
    );
  } finally { repairDb.close(); }
  return metadata;
}

function normalizePdfRetryIndexPointer(raw = {}) {
  const tabId = Math.max(0, Math.floor(Number(raw.tabId) || 0));
  const key = pdfRetryIndexKey(tabId);
  const cacheKey = String(raw.cacheKey || '');
  const cacheGeneration = String(raw.cacheGeneration || '');
  if (!key || String(raw.key || '') !== key || !cacheGeneration || cacheKey !== `pdf:${cacheGeneration}`) return null;
  return {
    key,
    tabId,
    cacheKey,
    cacheGeneration,
    createdAt: Math.max(0, Number(raw.createdAt) || 0)
  };
}

async function publishPdfRetryIndex(tabId, metadata) {
  const normalizedTabId = Math.max(0, Math.floor(Number(tabId) || 0));
  if (!normalizedTabId || !isExactSealedPdfCacheIdentity(metadata) || Number(metadata.tabId || 0) !== normalizedTabId) {
    const error = new Error('Нельзя опубликовать retry pointer без exact sealed PDF generation.');
    error.code = 'WEBCLIP_PDF_RETRY_INDEX_INVALID';
    throw error;
  }
  const pointer = {
    key: pdfRetryIndexKey(normalizedTabId),
    tabId: normalizedTabId,
    cacheKey: String(metadata.key),
    cacheGeneration: String(metadata.cacheGeneration),
    createdAt: Math.max(0, Number(metadata.createdAt) || Date.now())
  };
  const db = await openPdfCacheDb();
  try {
    await runIndexedDbTransactionBounded(
      db,
      PDF_CACHE_RETRY_INDEX_STORE,
      'readwrite',
      'Публикация PDF retry index',
      ({ store, fail }) => {
        const request = store().put(pointer);
        request.onerror = () => fail(request.error || new Error('Не удалось обновить PDF retry index.'));
      },
      PDF_CACHE_CRUD_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
  return pointer;
}

async function getPdfRetryIndexForTab(tabId) {
  const key = pdfRetryIndexKey(tabId);
  if (!key) return null;
  const db = await openPdfCacheDb();
  try {
    const raw = await runIndexedDbTransactionBounded(
      db,
      PDF_CACHE_RETRY_INDEX_STORE,
      'readonly',
      'Чтение PDF retry index',
      ({ store, setResult, fail }) => {
        const request = store().get(key);
        request.onsuccess = () => setResult(request.result || null);
        request.onerror = () => fail(request.error || new Error('Не удалось прочитать PDF retry index.'));
      },
      PDF_CACHE_CRUD_IDB_TX_TIMEOUT_MS
    );
    return normalizePdfRetryIndexPointer(raw);
  } finally { db.close(); }
}

async function clearPdfRetryIndexIfMatches(tabId, expectedCacheKey, expectedGeneration) {
  const key = pdfRetryIndexKey(tabId);
  if (!key) return false;
  const cacheKey = String(expectedCacheKey || '');
  const cacheGeneration = String(expectedGeneration || '');
  const db = await openPdfCacheDb();
  try {
    return await runIndexedDbTransactionBounded(
      db,
      PDF_CACHE_RETRY_INDEX_STORE,
      'readwrite',
      'CAS-очистка PDF retry index',
      ({ store, setResult, fail }) => {
        const retryStore = store();
        const request = retryStore.get(key);
        request.onsuccess = () => {
          const current = normalizePdfRetryIndexPointer(request.result);
          if (!current || current.cacheKey !== cacheKey || current.cacheGeneration !== cacheGeneration) {
            setResult(false);
            return;
          }
          const remove = retryStore.delete(key);
          remove.onsuccess = () => setResult(true);
          remove.onerror = () => fail(remove.error || new Error('Не удалось очистить PDF retry index.'));
        };
        request.onerror = () => fail(request.error || new Error('Не удалось сверить PDF retry index.'));
      },
      PDF_CACHE_CRUD_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
}

async function invalidatePdfRetryForTab(tabId) {
  const current = await getPdfRetryIndexForTab(tabId);
  if (!current) return false;
  return clearPdfRetryIndexIfMatches(tabId, current.cacheKey, current.cacheGeneration);
}

async function getValidCachedPdfForTab(tabId, currentSourceReceipt) {
  const pointer = await getPdfRetryIndexForTab(tabId);
  if (!pointer) return null;
  const cached = await getCachedPdfMetadataByKey(pointer.cacheKey);
  if (
    !cached ||
    !isExactSealedPdfCacheIdentity(cached) ||
    String(cached.cacheGeneration || '') !== pointer.cacheGeneration ||
    Number(cached.tabId || 0) !== Number(tabId || 0)
  ) {
    await clearPdfRetryIndexIfMatches(tabId, pointer.cacheKey, pointer.cacheGeneration).catch(() => {});
    return null;
  }
  const createdAt = Number(cached.createdAt || 0);
  if (!createdAt || Date.now() - createdAt > PDF_CACHE_TTL_MS) {
    await deleteCachedPdfGeneration(cached).catch(() => {});
    return null;
  }
  if (!liveRetrySourceReceiptMatches(cached.sourceReceipt, currentSourceReceipt)) {
    await clearPdfRetryIndexIfMatches(tabId, pointer.cacheKey, pointer.cacheGeneration).catch(() => {});
    return null;
  }
  let currentUrl = '';
  try {
    currentUrl = normalizeJournalUrl((await getChromeTabBounded(tabId, 'Проверка текущего URL PDF retry cache'))?.url || '');
  } catch (_) {
    await clearPdfRetryIndexIfMatches(tabId, pointer.cacheKey, pointer.cacheGeneration).catch(() => {});
    return null;
  }
  const cachedUrl = normalizeJournalUrl(cached.sourceUrl || cached?.meta?.url || '');
  if (!currentUrl || !cachedUrl || currentUrl !== cachedUrl) {
    await clearPdfRetryIndexIfMatches(tabId, pointer.cacheKey, pointer.cacheGeneration).catch(() => {});
    return null;
  }
  return cached;
}


async function cleanupExpiredPdfCache() {
  const cutoff = Date.now() - PDF_CACHE_TTL_MS;
  // Read durable remote-effect ownership before opening the PDF-cache
  // maintenance transaction. If this read fails, cleanup fails closed and
  // ensureStorageBudget may reject new work rather than erase reconciliation
  // bytes whose external outcome is still unknown.
  const retentionSnapshot = await getPendingRemotePdfCacheRetentionSnapshot();
  const db = await openPdfCacheDb();
  let deleted = 0;
  try {
    await runIndexedDbTransactionBounded(
      db,
      [PDF_CACHE_STORE, PDF_CACHE_META_STORE, PDF_CACHE_RETRY_INDEX_STORE],
      'readwrite',
      'Очистка устаревшего временного кэша PDF',
      ({ tx, fail }) => {
        const pdfStore = tx.objectStore(PDF_CACHE_STORE);
        const metaStore = tx.objectStore(PDF_CACHE_META_STORE);
        const retryStore = tx.objectStore(PDF_CACHE_RETRY_INDEX_STORE);
        const request = metaStore.openCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return;
          const stale = cursor.value || {};
          const staleKey = String(cursor.primaryKey || '');
          const protectedByRemoteCheckpoint = pdfCacheGenerationMatchesRemoteRetention(stale, retentionSnapshot);
          if (Number(stale.createdAt || 0) < cutoff && !protectedByRemoteCheckpoint) {
            pdfStore.delete(cursor.primaryKey);
            cursor.delete();
            if (isExactSealedPdfCacheIdentity(stale)) {
              const retryKey = pdfRetryIndexKey(stale.tabId);
              if (retryKey) {
                const retryGet = retryStore.get(retryKey);
                retryGet.onsuccess = () => {
                  const current = normalizePdfRetryIndexPointer(retryGet.result);
                  if (current && current.cacheKey === staleKey && current.cacheGeneration === String(stale.cacheGeneration || '')) {
                    retryStore.delete(retryKey);
                  }
                };
                retryGet.onerror = () => fail(retryGet.error || new Error('Не удалось сверить PDF retry index при cleanup.'));
              }
            }
            deleted += 1;
          }
          cursor.continue();
        };
        request.onerror = () => fail(request.error || new Error('Не удалось проверить временный кэш PDF.'));
      },
      MAINTENANCE_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
  return deleted;
}

async function deleteCachedPdfByKey(key) {
  const cacheKey = String(key || '');
  if (!cacheKey) return;
  const db = await openPdfCacheDb();
  try {
    await runIndexedDbTransactionBounded(
      db,
      [PDF_CACHE_STORE, PDF_CACHE_META_STORE],
      'readwrite',
      'Удаление PDF retry-cache',
      ({ tx, fail }) => {
        const pdfRequest = tx.objectStore(PDF_CACHE_STORE).delete(cacheKey);
        const metaRequest = tx.objectStore(PDF_CACHE_META_STORE).delete(cacheKey);
        pdfRequest.onerror = () => fail(pdfRequest.error || new Error('Не удалось очистить локальный кэш PDF.'));
        metaRequest.onerror = () => fail(metaRequest.error || new Error('Не удалось очистить metadata локального кэша PDF.'));
      },
      PDF_CACHE_CRUD_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
}

async function deleteCachedPdfGeneration(record) {
  if (!isExactSealedPdfCacheIdentity(record)) {
    const error = new Error('Exact PDF cache generation не подтверждена для удаления.');
    error.code = 'WEBCLIP_PDF_CACHE_GENERATION_INVALID';
    throw error;
  }
  const cacheKey = String(record.key);
  const generation = String(record.cacheGeneration);
  const expectedTabId = Math.max(0, Number(record.tabId) || 0);
  const db = await openPdfCacheDb();
  try {
    await runIndexedDbTransactionBounded(
      db,
      [PDF_CACHE_STORE, PDF_CACHE_META_STORE, PDF_CACHE_RETRY_INDEX_STORE],
      'readwrite',
      'Удаление exact PDF cache generation',
      ({ tx, fail }) => {
        const pdfStore = tx.objectStore(PDF_CACHE_STORE);
        const metaStore = tx.objectStore(PDF_CACHE_META_STORE);
        const retryStore = tx.objectStore(PDF_CACHE_RETRY_INDEX_STORE);
        const metaGet = metaStore.get(cacheKey);
        metaGet.onsuccess = () => {
          const current = metaGet.result || null;
          if (
            !isExactSealedPdfCacheIdentity(current) ||
            String(current.cacheGeneration || '') !== generation ||
            Number(current.tabId || 0) !== expectedTabId
          ) {
            const error = new Error('Stored PDF cache generation не совпадает с exact cleanup receipt.');
            error.code = 'WEBCLIP_PDF_CACHE_GENERATION_MISMATCH';
            fail(error);
            return;
          }
          const pdfDelete = pdfStore.delete(cacheKey);
          const metaDelete = metaStore.delete(cacheKey);
          pdfDelete.onerror = () => fail(pdfDelete.error || new Error('Не удалось удалить exact PDF cache bytes.'));
          metaDelete.onerror = () => fail(metaDelete.error || new Error('Не удалось удалить exact PDF cache metadata.'));

          const retryKey = pdfRetryIndexKey(expectedTabId);
          if (retryKey) {
            const retryGet = retryStore.get(retryKey);
            retryGet.onsuccess = () => {
              const pointer = normalizePdfRetryIndexPointer(retryGet.result);
              if (pointer && pointer.cacheKey === cacheKey && pointer.cacheGeneration === generation) {
                const retryDelete = retryStore.delete(retryKey);
                retryDelete.onerror = () => fail(retryDelete.error || new Error('Не удалось CAS-очистить PDF retry index.'));
              }
            };
            retryGet.onerror = () => fail(retryGet.error || new Error('Не удалось сверить PDF retry index.'));
          }
        };
        metaGet.onerror = () => fail(metaGet.error || new Error('Не удалось сверить exact PDF cache metadata.'));
      },
      PDF_CACHE_CRUD_IDB_TX_TIMEOUT_MS
    );
  } finally { db.close(); }
}


function withOperationTimeout(promise, timeoutMs, label) {
  let timer = null;
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error(`${label} не завершилась за ${Math.round(timeoutMs / 1000)} с.`);
        error.code = 'WEBCLIP_TIMEOUT';
        reject(error);
      }, timeoutMs);
    })
  ]).finally(() => { if (timer) clearTimeout(timer); });
}

async function collectPrintDiagnosticsForTab(tabId) {
  try {
    const response = await withOperationTimeout(
      chrome.tabs.sendMessage(Number(tabId), { type: 'WEBCLIP_COLLECT_PRINT_DIAGNOSTICS' }),
      5_000,
      'Сбор диагностики структуры страницы после печати'
    );
    if (!response?.ok) {
      return sanitizePrintStructureDiagnostics({ unavailable: true, error: response?.error || 'Content script не вернул диагностику печати.' });
    }
    return sanitizePrintStructureDiagnostics(response.diagnostics || {});
  } catch (error) {
    return sanitizePrintStructureDiagnostics({ unavailable: true, error: normalizeError(error) });
  }
}

const debuggerActiveTabs = new Set();
const debuggerLateAttachCleanupByTab = new Map();
const debuggerPendingDetachByTab = new Map();
const debuggerPendingActualSettlements = new Set();

function trackDebuggerActualSettlement(actual) {
  const pending = Promise.resolve(actual);
  debuggerPendingActualSettlements.add(pending);
  void pending.finally(() => {
    debuggerPendingActualSettlements.delete(pending);
  }).catch(() => {});
  return pending;
}

function hasGlobalPdfPendingDebuggerWork() {
  return debuggerActiveTabs.size > 0 || debuggerPendingActualSettlements.size > 0;
}

function makeDebuggerBusyError(tabId) {
  const error = new Error(`Chrome Debugger для вкладки ${tabId} ещё завершает предыдущую операцию WebClip. Повторите позже.`);
  error.code = 'WEBCLIP_DEBUGGER_BUSY';
  return error;
}

function makeGlobalPdfBusyError() {
  const error = new Error('WebClip уже формирует PDF в другой вкладке. Дождитесь завершения текущего формирования.');
  error.code = 'WEBCLIP_PDF_BUSY';
  return error;
}

async function attachDebuggerBounded(debuggee) {
  const tabId = Number(debuggee?.tabId);
  let timedOut = false;
  const rawAttach = trackDebuggerActualSettlement(Promise.resolve(chrome.debugger.attach(debuggee, '1.3')));

  // If our local deadline wins, chrome.debugger.attach() is still not
  // cancelled. Keep the tab blocked until the browser settles the original
  // attach and, on late success, detach that exact session before allowing a
  // retry. Otherwise a late attach can survive after generatePdfBase64()
  // already returned and the next PDF attempt can inherit/race that session.
  const lateCleanup = rawAttach.then(async () => {
    if (!timedOut) return;
    try {
      await detachDebuggerBounded(debuggee, 'Отключение Chrome Debugger после позднего attach');
    } catch (error) {
      console.warn('WebClip late debugger attach cleanup:', error);
    }
  }).catch((error) => {
    if (timedOut) console.warn('WebClip late debugger attach settled with error:', error);
  });
  debuggerLateAttachCleanupByTab.set(tabId, lateCleanup);

  try {
    await withOperationTimeout(rawAttach, 15_000, 'Подключение Chrome Debugger');
  } catch (error) {
    timedOut = error?.code === 'WEBCLIP_TIMEOUT';
    throw error;
  } finally {
    if (timedOut) {
      void lateCleanup.finally(() => {
        if (debuggerLateAttachCleanupByTab.get(tabId) === lateCleanup) debuggerLateAttachCleanupByTab.delete(tabId);
      });
    } else if (debuggerLateAttachCleanupByTab.get(tabId) === lateCleanup) {
      debuggerLateAttachCleanupByTab.delete(tabId);
    }
  }
}

async function detachDebuggerBounded(debuggee, label = 'Отключение Chrome Debugger') {
  const tabId = Number(debuggee?.tabId);
  const rawDetach = trackDebuggerActualSettlement(Promise.resolve(chrome.debugger.detach(debuggee)));
  debuggerPendingDetachByTab.set(tabId, rawDetach);
  void rawDetach.finally(() => {
    if (debuggerPendingDetachByTab.get(tabId) === rawDetach) debuggerPendingDetachByTab.delete(tabId);
  }).catch(() => {});
  await withOperationTimeout(rawDetach, 10_000, label);
}

function makePdfRenderNavigationError(code, message) {
  const error = new Error(message || code);
  error.code = code;
  return error;
}

async function assertPdfSourceGenerationAfterAttach(tabId) {
  const guard = globalThis.WebClipContentInjectionGuard;
  if (!guard || typeof guard.assertActiveWorkerSourceCurrent !== 'function') {
    throw makePdfRenderNavigationError(
      'WEBCLIP_SOURCE_GENERATION_GUARD_UNAVAILABLE',
      'Exact source-generation guard is unavailable after debugger attach.'
    );
  }
  await guard.assertActiveWorkerSourceCurrent(globalThis, tabId);
  return true;
}

function createPdfRenderNavigationFence(debuggerApi, debuggee, maxBufferedEvents = 64) {
  const eventApi = debuggerApi?.onEvent;
  const tabId = Number(debuggee?.tabId);
  if (!tabId || !eventApi || typeof eventApi.addListener !== 'function' || typeof eventApi.removeListener !== 'function') {
    throw makePdfRenderNavigationError('WEBCLIP_PDF_NAVIGATION_FENCE_UNAVAILABLE', 'Chrome Debugger navigation events are unavailable for the PDF render fence.');
  }
  const buffered = [];
  const limit = Math.max(8, Math.min(256, Math.floor(Number(maxBufferedEvents) || 64)));
  let mainFrameId = '';
  let mainLoaderId = '';
  let stale = false;
  let staleMethod = '';
  let installed = false;
  let disposed = false;

  function eventIdentity(method, params) {
    if (method === 'Page.frameNavigated') {
      return {
        frameId: String(params?.frame?.id || ''),
        loaderId: String(params?.frame?.loaderId || '')
      };
    }
    if (method === 'Page.frameStartedNavigating' || method === 'Page.navigatedWithinDocument') {
      return { frameId: String(params?.frameId || ''), loaderId: '' };
    }
    return { frameId: '', loaderId: '' };
  }

  function markIfMain(event) {
    if (!mainFrameId || !event?.frameId || event.frameId !== mainFrameId) return;
    if (
      event.method === 'Page.frameNavigated'
      && mainLoaderId
      && event.loaderId
      && event.loaderId === mainLoaderId
    ) {
      return;
    }
    stale = true;
    if (!staleMethod) staleMethod = event.method;
  }

  function listener(source, method, params) {
    if (Number(source?.tabId) !== tabId) return;
    const identity = eventIdentity(method, params);
    if (!identity.frameId) return;
    const event = Object.freeze({
      method: String(method || ''),
      frameId: identity.frameId,
      loaderId: identity.loaderId
    });
    if (!mainFrameId) {
      // Page.enable may expose a baseline frameNavigated notification for the
      // already-current frame. A real navigation in this setup window is
      // represented by frameStartedNavigating (or same-document navigation),
      // so do not treat an unarmed frameNavigated snapshot as stale evidence.
      if (method === 'Page.frameNavigated') return;
      if (buffered.length >= limit) {
        stale = true;
        if (!staleMethod) staleMethod = 'WEBCLIP_PDF_NAVIGATION_EVENT_OVERFLOW';
        return;
      }
      buffered.push(event);
      return;
    }
    markIfMain(event);
  }

  function install() {
    if (installed) return false;
    eventApi.addListener(listener);
    installed = true;
    return true;
  }

  function arm(frame) {
    const next = String(frame?.id || frame || '').trim();
    const nextLoaderId = String(frame?.loaderId || '').trim();
    if (!next) throw makePdfRenderNavigationError('WEBCLIP_PDF_MAIN_FRAME_REQUIRED', 'Chrome did not expose the exact main frame for the PDF render fence.');
    if (mainFrameId && mainFrameId !== next) {
      stale = true;
      if (!staleMethod) staleMethod = 'WEBCLIP_PDF_MAIN_FRAME_CHANGED';
    } else {
      mainFrameId = next;
      if (nextLoaderId) mainLoaderId = nextLoaderId;
    }
    for (const event of buffered.splice(0)) markIfMain(event);
    return mainFrameId;
  }

  function assertClean() {
    if (!stale) return true;
    throw makePdfRenderNavigationError(
      'WEBCLIP_PDF_SOURCE_NAVIGATED',
      `The main document changed during PDF rendering (${staleMethod || 'navigation event'}).`
    );
  }

  function dispose() {
    if (!installed || disposed) return false;
    eventApi.removeListener(listener);
    disposed = true;
    return true;
  }

  function snapshot() {
    return Object.freeze({
      tabId,
      mainFrameId,
      mainLoaderId,
      stale,
      staleMethod,
      bufferedEvents: buffered.length,
      installed,
      disposed
    });
  }

  return Object.freeze({ install, arm, assertClean, dispose, snapshot, listener });
}

async function generatePdfBlob(tabId) {
  const debuggee = { tabId };
  let attached = false;
  let streamHandle = '';
  let navigationFence = null;
  let navigationFenceCleanupError = null;
  let primaryError = null;
  if (debuggerLateAttachCleanupByTab.has(tabId) || debuggerPendingDetachByTab.has(tabId)) {
    throw makeDebuggerBusyError(tabId);
  }
  if (hasGlobalPdfPendingDebuggerWork()) throw makeGlobalPdfBusyError();
  debuggerActiveTabs.add(tabId);

  try {
    await attachDebuggerBounded(debuggee);
    attached = true;
    navigationFence = createPdfRenderNavigationFence(chrome.debugger, debuggee);
    navigationFence.install();
    await assertPdfSourceGenerationAfterAttach(tabId);
    await withOperationTimeout(chrome.debugger.sendCommand(debuggee, 'Page.enable'), 15_000, 'Инициализация Page');
    const frameTreeResult = await withOperationTimeout(
      chrome.debugger.sendCommand(debuggee, 'Page.getFrameTree'),
      15_000,
      'Определение main frame для PDF'
    );
    const mainFrame = frameTreeResult?.frameTree?.frame || null;
    navigationFence.arm(mainFrame);
    navigationFence.assertClean();

    // Сохраняем экранные CSS media-правила: @media print сайта не должен
    // самовольно скрывать элементы, которые пользователь выбрал в WebClip.
    await withOperationTimeout(chrome.debugger.sendCommand(debuggee, 'Emulation.setEmulatedMedia', {
      media: 'screen'
    }), 15_000, 'Настройка media для PDF');

    navigationFence.assertClean();

    // ReturnAsStream avoids the full Base64 PDF copy in the MV3 worker heap.
    const result = await withOperationTimeout(chrome.debugger.sendCommand(debuggee, 'Page.printToPDF', {
      landscape: false,
      displayHeaderFooter: false,
      printBackground: true,
      scale: 1,
      preferCSSPageSize: true,
      transferMode: 'ReturnAsStream'
    }), DEBUGGER_COMMAND_TIMEOUT_MS, 'Формирование PDF Chromium');

    streamHandle = String(result?.stream || '');
    if (!streamHandle || streamHandle.length > 512) {
      throw new Error('Chrome не вернул поток PDF.');
    }
    navigationFence.assertClean();

    const deadlineAt = Date.now() + DEBUGGER_COMMAND_TIMEOUT_MS;
    const parts = [];
    let totalBytes = 0;
    let eof = false;
    while (!eof) {
      navigationFence.assertClean();
      const remaining = deadlineAt - Date.now();
      if (remaining <= 0) {
        const error = new Error(`Чтение PDF-потока превысило безопасный предел ${Math.round(DEBUGGER_COMMAND_TIMEOUT_MS / 1000)} с.`);
        error.code = 'WEBCLIP_TIMEOUT';
        throw error;
      }
      const chunk = await withOperationTimeout(chrome.debugger.sendCommand(debuggee, 'IO.read', {
        handle: streamHandle,
        size: PDF_STREAM_READ_CHUNK_BYTES
      }), Math.min(15_000, remaining), 'Чтение PDF-потока Chromium');
      navigationFence.assertClean();
      const data = String(chunk?.data || '');
      eof = Boolean(chunk?.eof);
      if (!data) {
        if (!eof) continue;
        break;
      }
      if (chunk?.base64Encoded !== true) {
        const error = new Error('Chrome вернул PDF-поток в неожиданном небинарном формате.');
        error.code = 'PDF_STREAM_ENCODING_UNEXPECTED';
        throw error;
      }
      if (data.length > Math.ceil(PDF_STREAM_READ_CHUNK_BYTES * 4 / 3) + 16) {
        const error = new Error('Chrome вернул слишком большой chunk PDF-потока.');
        error.code = 'PDF_STREAM_CHUNK_TOO_LARGE';
        throw error;
      }
      let binary;
      try {
        binary = atob(data);
      } catch (error) {
        const invalid = new Error(`Chrome вернул повреждённый Base64 chunk PDF: ${normalizeError(error)}`);
        invalid.code = 'PDF_STREAM_INVALID_BASE64';
        throw invalid;
      }
      totalBytes += binary.length;
      if (totalBytes > MAX_PDF_BYTES) {
        const error = new Error(`Сформированный PDF слишком большой (${Math.ceil(totalBytes / (1024 * 1024))} МБ). Безопасный предел WebClip ${Math.floor(MAX_PDF_BYTES / (1024 * 1024))} МБ превышен.`);
        error.code = 'PDF_TOO_LARGE';
        throw error;
      }
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      parts.push(bytes);
    }
    if (!totalBytes) throw new Error('Chrome вернул пустой PDF.');
    navigationFence.assertClean();
    return new Blob(parts, { type: 'application/pdf' });
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    if (navigationFence) {
      try {
        navigationFence.dispose();
      } catch (fenceCleanupError) {
        if (!primaryError) navigationFenceCleanupError = fenceCleanupError;
        else console.warn('WebClip PDF navigation fence cleanup after error:', fenceCleanupError);
      }
    }
    if (streamHandle && attached) {
      try {
        await withOperationTimeout(chrome.debugger.sendCommand(debuggee, 'IO.close', { handle: streamHandle }), 10_000, 'Закрытие PDF-потока Chromium');
      } catch (closeError) {
        // IO.close is always attempted. If PDF generation already failed, keep
        // the primary error; debugger detach below still tears down the CDP
        // session. On an otherwise-successful path, surface the cleanup error
        // so an unresolved stream is not silently treated as a clean success.
        if (!primaryError) throw closeError;
        console.warn('WebClip PDF stream close after error:', closeError);
      }
    }
    if (attached) {
      try {
        await detachDebuggerBounded(debuggee);
      } catch (_) {
        // Вкладка могла закрыться или соединение уже могло быть разорвано.
        // Если сам detach ещё выполняется после локального timeout, карта
        // debuggerPendingDetachByTab не позволит новому attach стартовать
        // раньше фактического settlement Chrome API promise.
      }
    }
    debuggerActiveTabs.delete(tabId);
    if (navigationFenceCleanupError && !primaryError) throw navigationFenceCleanupError;
  }
}

let yandexConfigStorageSettlementChain = Promise.resolve();

async function updateYandexConfig(mutator, label = 'Изменение настроек Яндекс Диска') {
  if (typeof mutator !== 'function') throw new Error('Некорректная операция изменения настроек Яндекс Диска.');
  await waitForUserSettingsImportStorageSettlement(`${label}: ожидание импорта пользовательских настроек`);

  let releaseTurn = null;
  const turn = new Promise((resolve) => { releaseTurn = resolve; });
  const previous = yandexConfigStorageSettlementChain.catch(() => {});
  yandexConfigStorageSettlementChain = turn;

  try {
    await withOperationTimeout(previous, YANDEX_CONFIG_STORAGE_TIMEOUT_MS, `${label}: ожидание предыдущего изменения yandexConfig`);
  } catch (error) {
    void previous.finally(() => releaseTurn()).catch(() => releaseTurn());
    throw error;
  }

  const actual = Promise.resolve().then(async () => {
    const stored = await chrome.storage.local.get('yandexConfig');
    const current = stored?.yandexConfig && typeof stored.yandexConfig === 'object'
      ? { ...stored.yandexConfig }
      : {};
    const mutated = await mutator(current);
    const nextConfig = mutated && typeof mutated === 'object' ? mutated : current;
    await chrome.storage.local.set({ yandexConfig: nextConfig });
    return nextConfig;
  });
  void actual.finally(() => releaseTurn()).catch(() => {});
  return withOperationTimeout(actual, YANDEX_CONFIG_STORAGE_TIMEOUT_MS, label);
}

let yandexAuthStorageSettlementChain = Promise.resolve();

async function runYandexAuthStorageOperation(start, label) {
  // chrome.storage operations are not cancellable when our local deadline
  // wins. Reserve a queue turn synchronously, then start the side effect only
  // if the previous *actual* settlement completed within the bounded wait.
  // A caller that times out while waiting never leaves behind a future token
  // write/remove that could execute after the UI already reported failure.
  let releaseTurn = null;
  const turn = new Promise((resolve) => { releaseTurn = resolve; });
  const previous = yandexAuthStorageSettlementChain.catch(() => {});
  yandexAuthStorageSettlementChain = turn;

  try {
    await withOperationTimeout(previous, YANDEX_AUTH_STORAGE_TIMEOUT_MS, `${label}: ожидание предыдущей OAuth storage операции`);
  } catch (error) {
    // Preserve ordering for later callers without starting this abandoned
    // operation. Once the previous real side effect settles, our empty turn
    // releases and the queue may continue.
    void previous.finally(() => releaseTurn()).catch(() => releaseTurn());
    throw error;
  }

  let actual;
  try {
    actual = Promise.resolve().then(start);
  } catch (error) {
    releaseTurn();
    throw error;
  }
  void actual.finally(() => releaseTurn()).catch(() => {});
  return withOperationTimeout(actual, YANDEX_AUTH_STORAGE_TIMEOUT_MS, label);
}

async function removeLegacyPersistentYandexAuth() {
  try {
    await runYandexAuthStorageOperation(() => chrome.storage.local.remove(YANDEX_AUTH_KEY), 'Удаление persistent OAuth-токена Яндекс Диска');
  } catch (error) {
    const cleanupError = new Error('Не удалось удалить устаревшую persistent-копию OAuth-токена Яндекс Диска. WebClip блокирует использование токена до успешной очистки локального хранилища.');
    cleanupError.code = 'YANDEX_LEGACY_TOKEN_CLEANUP_FAILED';
    cleanupError.cause = error;
    throw cleanupError;
  }
}

async function readYandexAuthState() {
  const [{ yandexConfig = {} }, sessionStored, localStored] = await Promise.all([
    chrome.storage.local.get('yandexConfig'),
    runYandexAuthStorageOperation(() => chrome.storage.session.get(YANDEX_AUTH_KEY), 'Чтение session OAuth-токена Яндекс Диска'),
    runYandexAuthStorageOperation(() => chrome.storage.local.get(YANDEX_AUTH_KEY), 'Проверка legacy persistent OAuth-токена Яндекс Диска')
  ]);
  const sessionAuth = sessionStored?.[YANDEX_AUTH_KEY] || null;
  if (sessionAuth?.accessToken) {
    // Не оставляем старую копию секрета в persistent storage. Security cleanup
    // is awaited and fail-closed: returning a usable token while the durable
    // legacy copy still exists would silently violate the session-only model.
    if (localStored?.[YANDEX_AUTH_KEY]) await removeLegacyPersistentYandexAuth();
    return { auth: sessionAuth, mode: YANDEX_AUTH_STORAGE_SESSION, yandexConfig };
  }

  const legacyAuth = localStored?.[YANDEX_AUTH_KEY] || null;
  if (legacyAuth?.accessToken) {
    // Миграция старых сборок: переносим токен из persistent storage в память
    // текущей browser session и сразу удаляем исходную копию.
    await runYandexAuthStorageOperation(() => chrome.storage.session.set({ [YANDEX_AUTH_KEY]: legacyAuth }), 'Миграция OAuth-токена Яндекс Диска в session storage');
    const migratedConfig = await updateYandexConfig((config) => ({ ...config, authStorageMode: YANDEX_AUTH_STORAGE_SESSION }), 'Фиксация session-only режима OAuth Яндекс Диска');
    await removeLegacyPersistentYandexAuth();
    return { auth: legacyAuth, mode: YANDEX_AUTH_STORAGE_SESSION, yandexConfig: migratedConfig };
  }
  return { auth: null, mode: YANDEX_AUTH_STORAGE_SESSION, yandexConfig };
}

async function writeYandexAuth(auth) {
  if (auth?.accessToken) {
    await runYandexAuthStorageOperation(() => chrome.storage.session.set({ [YANDEX_AUTH_KEY]: auth }), 'Сохранение OAuth-токена Яндекс Диска в session storage');
  } else {
    await runYandexAuthStorageOperation(() => chrome.storage.session.remove(YANDEX_AUTH_KEY), 'Удаление OAuth-токена Яндекс Диска из session storage');
  }
  // Security invariant: OAuth secrets are never intentionally persisted.
  await removeLegacyPersistentYandexAuth();
  const nextConfig = await updateYandexConfig((config) => ({ ...config, authStorageMode: YANDEX_AUTH_STORAGE_SESSION }), 'Фиксация session-only режима OAuth Яндекс Диска');
  return { mode: YANDEX_AUTH_STORAGE_SESSION, yandexConfig: nextConfig };
}

async function getYandexStatus() {
  const [authState, { yandexOAuthPending = null }] = await Promise.all([
    readYandexAuthState(),
    runYandexAuthStorageOperation(() => chrome.storage.session.get('yandexOAuthPending'), 'Чтение pending PKCE состояния Яндекс OAuth')
  ]);
  const yandexConfig = authState.yandexConfig || {};
  const yandexAuth = authState.auth;

  const pendingValid = Boolean(
    yandexOAuthPending?.clientId &&
    yandexOAuthPending?.codeVerifier &&
    yandexOAuthPending?.expiresAt > Date.now()
  );

  if (yandexOAuthPending && !pendingValid) {
    await runYandexAuthStorageOperation(() => chrome.storage.session.remove('yandexOAuthPending'), 'Удаление просроченного pending PKCE состояния Яндекс OAuth');
  }

  const rootPath = normalizeDiskPath(yandexConfig.rootPath || '');
  const backupIntervalMinutes = normalizeIntervalMinutes(
    yandexConfig.journalBackupIntervalMinutes,
    DEFAULT_JOURNAL_BACKUP_INTERVAL_MINUTES
  );
  const backupRetryMinutes = normalizeIntervalMinutes(
    yandexConfig.journalBackupRetryMinutes,
    DEFAULT_JOURNAL_BACKUP_RETRY_MINUTES
  );
  return {
    ok: true,
    connected: Boolean(yandexAuth?.accessToken),
    authSource: yandexAuth?.source || null,
    authStorageMode: authState.mode,
    clientId: yandexAuth?.clientId || yandexConfig.clientId || yandexOAuthPending?.clientId || '',
    rootPath,
    createPublicLinks: yandexConfig.createPublicLinks !== false,
    uploadPath: rootPath ? joinDiskPath(rootPath, YANDEX_UPLOAD_DIR) : '',
    backupPath: rootPath ? joinDiskPath(rootPath, YANDEX_BACKUP_DIR) : '',
    journalBackupPath: rootPath ? getJournalBackupFolderFromRoot(rootPath) : '',
    journalBackupEnabled: Boolean(yandexConfig.journalBackupEnabled),
    journalBackupIntervalMinutes: backupIntervalMinutes,
    journalBackupRetryMinutes: backupRetryMinutes,
    redirectUri: YANDEX_FIXED_REDIRECT_URI,
    account: yandexAuth?.account || null,
    scopes: YANDEX_SCOPES,
    authPending: pendingValid,
    authPendingExpiresAt: pendingValid ? yandexOAuthPending.expiresAt : 0
  };
}

async function getYandexConfig() {
  const { yandexConfig = {} } = await chrome.storage.local.get('yandexConfig');
  return {
    clientId: String(yandexConfig.clientId || '').trim(),
    rootPath: normalizeDiskPath(yandexConfig.rootPath || ''),
    createPublicLinks: yandexConfig.createPublicLinks !== false,
    journalBackupEnabled: Boolean(yandexConfig.journalBackupEnabled),
    journalBackupIntervalMinutes: normalizeIntervalMinutes(
      yandexConfig.journalBackupIntervalMinutes,
      DEFAULT_JOURNAL_BACKUP_INTERVAL_MINUTES
    ),
    journalBackupRetryMinutes: normalizeIntervalMinutes(
      yandexConfig.journalBackupRetryMinutes,
      DEFAULT_JOURNAL_BACKUP_RETRY_MINUTES
    )
  };
}

async function saveYandexPreferences(preferences = {}) {
  await updateYandexConfig((config) => {
    if (Object.prototype.hasOwnProperty.call(preferences, 'createPublicLinks')) {
      config.createPublicLinks = Boolean(preferences.createPublicLinks);
    }
    return config;
  }, 'Сохранение настроек Яндекс Диска');
  return { ok: true, ...(await getYandexStatus()) };
}

async function saveYandexRoot(rootPath) {
  const normalized = normalizeDiskPath(rootPath);
  if (!normalized || normalized === '/') {
    throw new Error('Выберите отдельную корневую папку, например /WebClips.');
  }
  if (normalized.length > 2048) throw new Error('Путь корневой папки Яндекс Диска слишком длинный.');
  if (normalized.split('/').filter(Boolean).length > 32) throw new Error('Корневая папка Яндекс Диска содержит слишком много уровней вложенности.');

  const authState = await readYandexAuthState();
  const yandexAuth = authState.auth;
  await updateYandexConfig((config) => {
    config.rootPath = normalized;
    delete config.journalBackupFolder;
    return config;
  }, 'Сохранение корневой папки Яндекс Диска');

  let structureVerified = false;
  if (yandexAuth?.accessToken) {
    // Проверяем и при необходимости создаём обе служебные ветки сразу.
    // Ошибка возвращается пользователю, но выбранный root остаётся сохранённым,
    // чтобы после исправления доступа операцию можно было повторить.
    await ensureYandexServiceFolders({ includeUpload: true, includeReadLater: true, includeBackup: true });
    structureVerified = true;
  }
  await initializeJournalBackupScheduler('root-change');
  return {
    ok: true,
    rootPath: normalized,
    structureVerified,
    uploadPath: joinDiskPath(normalized, YANDEX_UPLOAD_DIR),
    journalBackupPath: getJournalBackupFolderFromRoot(normalized)
  };
}

async function startYandexOAuth(clientId, sourceTabId = 0) {
  clientId = String(clientId || '').trim();
  if (clientId.length > MAX_YANDEX_CLIENT_ID_CHARS) throw new Error('Client ID Яндекс OAuth слишком длинный.');
  if (!clientId) {
    throw new Error('Укажите Client ID приложения Яндекс OAuth.');
  }

  const state = randomBase64Url(24);
  const codeVerifier = randomBase64Url(64);
  const codeChallenge = await sha256Base64Url(codeVerifier);
  const now = Date.now();

  const url = new URL(YANDEX_OAUTH_AUTHORIZE);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', YANDEX_FIXED_REDIRECT_URI);
  url.searchParams.set('scope', YANDEX_SCOPES.join(' '));
  url.searchParams.set('force_confirm', 'yes');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');

  await runYandexAuthStorageOperation(() => chrome.storage.session.set({
    yandexOAuthPending: {
      clientId,
      codeVerifier,
      state,
      createdAt: now,
      expiresAt: now + YANDEX_OAUTH_CODE_TTL_MS
    }
  }), 'Сохранение pending PKCE состояния Яндекс OAuth');

  await updateYandexConfig((config) => {
    config.clientId = clientId;
    return config;
  }, 'Сохранение Client ID Яндекс OAuth');

  try {
    await createTabNextTo(sourceTabId, url.toString(), true);
  } catch (error) {
    await runYandexAuthStorageOperation(() => chrome.storage.session.remove('yandexOAuthPending'), 'Откат pending PKCE состояния после ошибки открытия OAuth');
    throw new Error(`Не удалось открыть страницу Яндекс OAuth: ${normalizeError(error)}`);
  }

  return {
    ok: true,
    authUrl: url.toString(),
    ...(await getYandexStatus())
  };
}

async function finishYandexOAuth(code) {
  if (!code) {
    throw new Error('Введите код подтверждения, показанный Яндексом.');
  }

  const { yandexOAuthPending } = await runYandexAuthStorageOperation(() => chrome.storage.session.get('yandexOAuthPending'), 'Чтение pending PKCE состояния перед OAuth exchange');
  if (!yandexOAuthPending?.clientId || !yandexOAuthPending?.codeVerifier) {
    throw new Error('Нет активной попытки авторизации. Нажмите «1. Получить код» и пройдите авторизацию Яндекса.');
  }
  if (!yandexOAuthPending.expiresAt || yandexOAuthPending.expiresAt <= Date.now()) {
    await runYandexAuthStorageOperation(() => chrome.storage.session.remove('yandexOAuthPending'), 'Удаление просроченного pending PKCE состояния перед OAuth exchange');
    throw new Error('Код авторизации просрочен. Получите новый код Яндекса.');
  }

  // Код отображается пользователю на фиксированной странице verification_code.
  // PKCE связывает его с codeVerifier, сохранённым только в текущей сессии расширения.
  const normalizedCode = String(code).replace(/\s+/g, '').trim();
  if (normalizedCode.length > MAX_YANDEX_VERIFICATION_CODE_CHARS) throw new Error('Код подтверждения Яндекс OAuth слишком длинный.');
  const token = await exchangeAuthorizationCode({
    clientId: yandexOAuthPending.clientId,
    code: normalizedCode,
    codeVerifier: yandexOAuthPending.codeVerifier
  });

  const now = Date.now();
  const expiresInSeconds = normalizeYandexOAuthExpiresIn(token.expires_in);
  const yandexAuth = {
    source: 'oauth-pkce-code',
    clientId: yandexOAuthPending.clientId,
    accessToken: token.access_token,
    refreshToken: '',
    expiresAt: expiresInSeconds ? now + expiresInSeconds * 1000 : 0,
    scope: boundedYandexExternalText(token.scope || YANDEX_SCOPES.join(' '), MAX_YANDEX_SCOPE_CHARS),
    account: null
  };

  await updateYandexConfig((config) => {
    config.clientId = yandexOAuthPending.clientId;
    return config;
  }, 'Фиксация Client ID завершённого Яндекс OAuth');
  await writeYandexAuth(yandexAuth);
  await runYandexAuthStorageOperation(() => chrome.storage.session.remove('yandexOAuthPending'), 'Удаление использованного pending PKCE состояния Яндекс OAuth');

  try {
    const info = await yandexApi('');
    yandexAuth.account = extractDiskAccount(info);
    await writeYandexAuth(yandexAuth);
  } catch (_) {
    // Токен уже получен. Ошибка чтения профиля не должна уничтожать авторизацию.
  }

  return { ok: true, ...(await getYandexStatus()) };
}

async function exchangeAuthorizationCode({ clientId, code, codeVerifier }) {
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    code_verifier: codeVerifier
  });
  const controller = new AbortController();
  const timeoutMs = 25_000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(YANDEX_OAUTH_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      signal: controller.signal,
      redirect: 'error'
    });

    const data = await safeJson(response);
    if (!response.ok || !data?.access_token) {
      throw new Error(boundedYandexExternalText(data?.error_description || data?.error || `OAuth HTTP ${response.status}`, MAX_YANDEX_EXTERNAL_ERROR_CHARS));
    }
    if (String(data.access_token).length > MAX_YANDEX_ACCESS_TOKEN_CHARS) {
      throw new Error('Яндекс OAuth вернул токен неожиданно большого размера.');
    }
    return data;
  } catch (error) {
    if (controller.signal.aborted || error?.name === 'AbortError') {
      throw new Error(`Яндекс OAuth не ответил за ${Math.round(timeoutMs / 1000)} с. Повторите авторизацию.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function setManualYandexToken(token) {
  token = String(token || '').trim();
  if (token.length > MAX_YANDEX_ACCESS_TOKEN_CHARS) throw new Error('OAuth-токен превышает безопасный размер.');
  if (!token) {
    throw new Error('Вставьте OAuth-токен.');
  }

  const yandexAuth = {
    source: 'manual',
    clientId: '',
    accessToken: token,
    refreshToken: '',
    expiresAt: 0,
    scope: '',
    account: null
  };
  await writeYandexAuth(yandexAuth);

  try {
    const info = await yandexApi('');
    yandexAuth.account = extractDiskAccount(info);
    await writeYandexAuth(yandexAuth);
  } catch (error) {
    await writeYandexAuth(null);
    throw error;
  }

  return { ok: true, ...(await getYandexStatus()) };
}

async function getValidYandexAccessToken() {
  const { auth: yandexAuth } = await readYandexAuthState();
  if (!yandexAuth?.accessToken) {
    throw new Error('Яндекс Диск не подключён. Откройте настройки расширения и выполните авторизацию.');
  }

  if (yandexAuth.expiresAt && yandexAuth.expiresAt <= Date.now() + 60_000) {
    // Для refresh_token Яндекс документирует client_secret. Мы намеренно не храним
    // Client Secret внутри Chrome-расширения. Повторная PKCE-авторизация безопаснее.
    throw new Error('Срок действия OAuth-токена истёк. Откройте настройки и подключите Яндекс Диск заново.');
  }
  return yandexAuth.accessToken;
}

async function captureCurrentYandexOperationContext() {
  const { auth: yandexAuth, yandexConfig = {} } = await readYandexAuthState();
  if (!yandexAuth?.accessToken) {
    const error = new Error('Яндекс Диск не подключён. Невозможно зафиксировать контекст операции.');
    error.code = 'YANDEX_OPERATION_CONTEXT_AUTH_REQUIRED';
    throw error;
  }
  if (yandexAuth.expiresAt && yandexAuth.expiresAt <= Date.now() + 60_000) {
    const error = new Error('Срок действия OAuth-токена истёк. Невозможно зафиксировать контекст операции.');
    error.code = 'YANDEX_OPERATION_CONTEXT_TOKEN_EXPIRED';
    throw error;
  }
  return WebClipYandexOperationContext.validateOperationContext({
    accessToken: yandexAuth.accessToken,
    accountUid: yandexAuth.account?.uid,
    rootPath: yandexConfig.rootPath,
    createPublicLinks: yandexConfig.createPublicLinks !== false,
    capturedAt: Date.now()
  });
}

async function testYandexConnection() {
  const info = await yandexApi('');
  const account = extractDiskAccount(info);
  const authState = await readYandexAuthState();
  const yandexAuth = authState.auth;
  if (yandexAuth) {
    yandexAuth.account = account;
    await writeYandexAuth(yandexAuth);
  }
  const config = await getYandexConfig();
  let structure = null;
  if (config.rootPath) {
    structure = await ensureYandexServiceFolders({ includeUpload: true, includeReadLater: true, includeBackup: true });
  }
  return {
    ok: true,
    account,
    totalSpace: normalizeYandexNonNegativeNumber(info?.total_space),
    usedSpace: normalizeYandexNonNegativeNumber(info?.used_space),
    trashSize: normalizeYandexNonNegativeNumber(info?.trash_size),
    structure
  };
}

function extractDiskAccount(info) {
  const user = info?.user || {};
  return {
    login: boundedYandexExternalText(user.login, MAX_YANDEX_ACCOUNT_FIELD_CHARS),
    displayName: boundedYandexExternalText(user.display_name, MAX_YANDEX_ACCOUNT_FIELD_CHARS),
    uid: boundedYandexExternalText(user.uid, MAX_YANDEX_ACCOUNT_FIELD_CHARS)
  };
}

async function getCurrentYandexAccountUid(operationId = '') {
  const authState = await readYandexAuthState();
  const yandexAuth = authState.auth;
  const cachedUid = boundedYandexExternalText(yandexAuth?.account?.uid || '', MAX_YANDEX_ACCOUNT_FIELD_CHARS).trim();
  if (cachedUid) return cachedUid;

  const info = await yandexApi('', { method: 'GET', timeoutMs: 10_000, operationId });
  const account = extractDiskAccount(info);
  const uid = String(account.uid || '').trim();
  if (!uid) {
    const error = new Error('Яндекс Диск не вернул идентификатор текущего аккаунта. Операция остановлена без изменения файла и журнала.');
    error.code = 'YANDEX_ACCOUNT_UID_UNAVAILABLE';
    throw error;
  }
  if (yandexAuth?.accessToken) {
    try {
      await writeYandexAuth({ ...yandexAuth, account });
    } catch (error) {
      console.warn('WebClip Yandex account cache update:', error);
    }
  }
  return uid;
}

async function ensureYandexPublicUrl(remotePath, operationId = '', outerDeadlineAt = 0) {
  const operationContext = arguments.length > 3 ? arguments[3] : null;
  const localDeadline = Date.now() + 45_000;
  const requestedDeadline = Math.max(0, Number(outerDeadlineAt) || 0);
  const deadline = requestedDeadline > Date.now() ? Math.min(localDeadline, requestedDeadline) : localDeadline;
  const timeoutForRequest = (preferred = 10_000) => {
    const remaining = deadline - Date.now();
    if (remaining <= 500) {
      const error = new Error('Создание постоянной ссылки Яндекс Диска не завершилось за 45 с.');
      error.code = 'YANDEX_TIMEOUT';
      throw error;
    }
    return Math.max(1_000, Math.min(preferred, remaining));
  };
  const readPublicUrl = async () => {
    const data = await yandexApi('/resources', {
      method: 'GET',
      query: { path: remotePath, fields: 'type,public_url' },
      timeoutMs: timeoutForRequest(10_000),
      operationId,
      operationContext
    });
    return normalizeYandexPublicUrlFromApi(data?.public_url || '');
  };

  const existing = await readPublicUrl();
  if (existing) return existing;

  let publishError = null;
  try {
    await yandexApi('/resources/publish', {
      method: 'PUT',
      query: { path: remotePath },
      timeoutMs: timeoutForRequest(15_000),
      operationId,
      operationContext
    });
  } catch (error) {
    publishError = error;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const remaining = deadline - Date.now();
    if (remaining <= 500) break;
    if (attempt) await new Promise((resolve) => setTimeout(resolve, Math.min(250 * attempt, Math.max(0, remaining - 500))));
    try {
      const url = await readPublicUrl();
      if (url) return url;
    } catch (error) {
      if (error?.code === 'YANDEX_TIMEOUT') throw error;
      if (!publishError) publishError = error;
    }
  }
  if (Date.now() >= deadline - 500) {
    const error = new Error('Создание постоянной ссылки Яндекс Диска не завершилось за 45 с.');
    error.code = 'YANDEX_TIMEOUT';
    throw error;
  }
  if (publishError) throw publishError;
  throw new Error('Яндекс Диск не вернул постоянную публичную ссылку на загруженный файл.');
}

async function listYandexFolders(path) {
  const listed = await listYandexDirectoryItems(path, {
    maxItems: 50000,
    maxCollectedItems: 5000,
    deadlineMs: 45000,
    itemFields: ['name', 'path', 'type'],
    collectItem: (item) => boundedYandexExternalText(item?.type, MAX_YANDEX_ITEM_TYPE_CHARS) === 'dir'
      ? { name: normalizeYandexItemNameFromApi(item?.name), path: normalizeYandexDiskPathFromApi(item?.path) }
      : null
  });
  const { normalized, data, items, total } = listed;
  const folders = items.sort((a, b) => a.name.localeCompare(b.name, 'ru'));

  return {
    ok: true,
    path: data?.path ? normalizeYandexDiskPathFromApi(data.path) : normalized,
    name: data?.name ? normalizeYandexItemNameFromApi(data.name) : (normalized === '/' ? 'Диск' : normalized.split('/').pop()),
    folders,
    totalFoldersAndFiles: total
  };
}

async function createYandexFolder(path) {
  const normalized = normalizeDiskPath(path);
  if (!normalized || normalized === '/') {
    throw new Error('Нельзя создать корневую папку Диска.');
  }
  await ensureYandexFolderTree(normalized);
  return { ok: true, path: normalized };
}

function safeUrlForOperationLog(value) {
  try {
    const url = new URL(String(value || ''));
    const host = url.hostname.toLowerCase();
    if (host === 'disk.yandex.net' || host.endsWith('.disk.yandex.net')) {
      return `${url.origin}/[REDACTED_SIGNED_PATH]`;
    }
    return `${url.origin}${url.pathname}${url.search ? '?[REDACTED_QUERY]' : ''}`;
  } catch (_) {
    return '[invalid-url]';
  }
}

async function runOffscreenSignedTransfer(spec = {}, { operationId = '', label = 'Передача данных Яндекс Диска', timeoutMs = 60_000 } = {}) {
  const startedAt = Date.now();
  const method = normalizeYandexSignedMethod(spec.method, 'GET');
  const signedUrl = normalizeYandexSignedTransferUrl(spec.url);
  const safeUrl = safeUrlForOperationLog(signedUrl);
  const boundedTimeout = Math.max(1_000, Math.min(120_000, Number(timeoutMs) || 60_000));
  const transferId = `signed-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  if (operationId) {
    appendOperationLogEvent(operationId, {
      category: 'yandex-request', level: 'info', message: `${label}: ${method} (offscreen)`,
      data: { method, url: safeUrl, timeoutMs: boundedTimeout, transferId, executionContext: 'offscreen' }
    });
  }
  let result;
  try {
    result = await sendMessageToOffscreen({
      type: 'WEBCLIP_SIGNED_TRANSFER',
      transferId,
      operationId: normalizeOperationIdInput(operationId),
      timeoutMs: boundedTimeout,
      spec: {
        mode: String(spec.mode || ''),
        url: signedUrl,
        method,
        pdfCacheKey: String(spec.pdfCacheKey || ''),
        pdfCacheGeneration: String(spec.pdfCacheGeneration || ''),
        expectedPdfBytes: Math.max(0, Number(spec.expectedPdfBytes) || 0),
        payloadKey: String(spec.payloadKey || ''),
        contentType: String(spec.contentType || ''),
        maxChars: Number(spec.maxChars || 0)
      }
    }, boundedTimeout + 20_000, label, { retryTransportErrors: false });
  } catch (error) {
    if (operationId) appendOperationLogEvent(operationId, {
      category: 'yandex-response', level: 'error', message: `${label}: ошибка offscreen transfer`,
      data: { method, url: safeUrl, transferId, durationMs: Date.now() - startedAt, error: normalizeError(error), executionContext: 'offscreen' }
    });
    throw error;
  }
  if (!result?.transferCompleted) {
    const error = new Error(result?.error || 'Offscreen transfer завершился без результата.');
    error.code = result?.code || 'OFFSCREEN_TRANSFER_ERROR';
    if (operationId) appendOperationLogEvent(operationId, {
      category: 'yandex-response', level: 'error', message: `${label}: ${error.code === 'YANDEX_TIMEOUT' ? 'timeout' : 'ошибка'}`,
      data: { method, url: safeUrl, transferId, timeout: error.code === 'YANDEX_TIMEOUT', durationMs: Date.now() - startedAt, error: error.message, executionContext: 'offscreen' }
    });
    throw error;
  }
  if (operationId) appendOperationLogEvent(operationId, {
    category: 'yandex-response', level: result.ok ? 'info' : 'error', message: `${label}: HTTP ${Number(result.status || 0)}`,
    data: { method, url: safeUrl, status: Number(result.status || 0), ok: Boolean(result.ok), transferId, durationMs: Date.now() - startedAt, executionContext: 'offscreen', responseChars: Number(result.responseChars || 0) }
  });
  return {
    ok: Boolean(result.ok),
    status: Number(result.status || 0),
    details: String(result.details || '').slice(0, 500),
    payloadKey: String(result.payloadKey || ''),
    responseChars: Number(result.responseChars || 0),
    transferId
  };
}

async function ensureYandexFolderTree(path, operationId = '') {
  const operationContext = arguments.length > 2 ? arguments[2] : null;
  const normalized = normalizeDiskPath(path);
  if (!normalized || normalized === '/') return;
  if (normalized.length > 2048) throw new Error('Путь Яндекс Диска превышает безопасный предел длины.');

  const segments = normalized.split('/').filter(Boolean);
  if (segments.length > 32) throw new Error('Путь Яндекс Диска содержит слишком много уровней вложенности.');
  const deadline = Date.now() + 90_000;
  const timeoutForRequest = () => {
    const remaining = deadline - Date.now();
    if (remaining <= 500) {
      const error = new Error('Проверка/создание структуры папок Яндекс Диска не завершилась за 90 с.');
      error.code = 'YANDEX_TIMEOUT';
      throw error;
    }
    return Math.max(1_000, Math.min(15_000, remaining));
  };

  let current = '';
  for (const segment of segments) {
    current = joinDiskPath(current || '/', segment);
    try {
      await yandexApi('/resources', {
        method: 'PUT',
        query: { path: current },
        timeoutMs: timeoutForRequest(),
        operationId,
        operationContext
      });
    } catch (error) {
      // 409 обычно означает, что ресурс уже существует. Но для служебной
      // структуры WebClip недостаточно факта существования: это обязан
      // быть именно каталог, иначе дальнейшая запись внутрь него невозможна.
      if (Number(error?.status) !== 409) throw error;
      const existing = await yandexApi('/resources', {
        method: 'GET',
        query: { path: current, fields: 'name,path,type' },
        timeoutMs: timeoutForRequest(),
        operationId,
        operationContext
      });
      if (existing?.type !== 'dir') {
        throw new Error(`Путь ${current} уже существует на Яндекс Диске, но не является папкой.`);
      }
    }
  }
}

async function yandexApi(endpoint, options = {}, allowRetry = false) {
  const operationId = String(options.operationId || '');
  const method = String(options.method || 'GET').toUpperCase();
  const retryAttempt = Math.max(0, Math.floor(Number(options.retryAttempt) || 0));
  const startedAt = Date.now();
  const safeQuery = sanitizeOperationLogValue(options.query || {});
  if (operationId) {
    appendOperationLogEvent(operationId, {
      category: 'yandex-request',
      level: 'info',
      message: `Yandex API ${method} ${endpoint || '/'}`,
      data: { endpoint: endpoint || '/', method, query: safeQuery, timeoutMs: Number(options.timeoutMs) || 25_000, retryAllowed: Boolean(allowRetry), retryAttempt }
    });
  }
  let token;
  try {
    token = options.operationContext
      ? WebClipYandexOperationContext.validateOperationContext(options.operationContext).accessToken
      : await getValidYandexAccessToken();
  } catch (error) {
    if (operationId) {
      appendOperationLogEvent(operationId, {
        category: 'yandex-response', level: 'error',
        message: `Yandex API ${method} ${endpoint || '/'}: ошибка авторизации`,
        data: { durationMs: Date.now() - startedAt, retryAttempt, error: normalizeError(error) }
      });
    }
    throw error;
  }
  const url = new URL(`${YANDEX_API_BASE}${endpoint}`);
  for (const [key, value] of Object.entries(options.query || {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const requestedTimeout = Number(options.timeoutMs);
  const timeoutMs = Number.isFinite(requestedTimeout) && requestedTimeout > 0
    ? Math.max(1_000, Math.min(120_000, requestedTimeout))
    : 25_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  let data = null;
  try {
    response = await fetch(url.toString(), {
      method,
      headers: {
        'Authorization': `OAuth ${token}`,
        'Accept': 'application/json',
        ...(options.headers || {})
      },
      body: options.body,
      signal: controller.signal,
      redirect: 'error'
    });

    if (response.status !== 204 && response.headers.get('content-length') !== '0') {
      data = await safeJson(response);
    }
  } catch (error) {
    if (controller.signal.aborted || error?.name === 'AbortError') {
      if (operationId) {
        appendOperationLogEvent(operationId, {
          category: 'yandex-response', level: 'error',
          message: `Yandex API ${method} ${endpoint || '/'}: timeout`,
          data: { endpoint: endpoint || '/', method, timeout: true, timeoutMs, retryAttempt, durationMs: Date.now() - startedAt }
        });
      }
      const timeoutError = new Error(`Яндекс Диск не ответил за ${Math.round(timeoutMs / 1000)} с. Операция остановлена без изменения данных.`);
      timeoutError.code = 'YANDEX_TIMEOUT';
      throw timeoutError;
    }
    if (operationId) {
      appendOperationLogEvent(operationId, {
        category: 'yandex-response', level: 'error',
        message: `Yandex API ${method} ${endpoint || '/'}: ошибка сети`,
        data: { endpoint: endpoint || '/', method, retryAttempt, durationMs: Date.now() - startedAt, error: normalizeError(error) }
      });
    }
    throw new Error(`Нет соединения с Яндекс Диском: ${normalizeError(error)}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    if (operationId) {
      appendOperationLogEvent(operationId, {
        category: 'yandex-response', level: 'error',
        message: `Yandex API ${method} ${endpoint || '/'}: HTTP ${response.status}`,
        data: {
          endpoint: endpoint || '/', method, status: response.status, retryAttempt,
          durationMs: Date.now() - startedAt,
          response: summarizeYandexResponse(endpoint, data)
        }
      });
    }
    const error = new Error(boundedYandexExternalText(
      data?.message || data?.description || data?.error || `Яндекс Диск вернул HTTP ${response.status}`,
      MAX_YANDEX_EXTERNAL_ERROR_CHARS
    ));
    error.status = response.status;
    error.code = boundedYandexExternalText(data?.error || '', MAX_YANDEX_EXTERNAL_ERROR_CHARS);
    throw error;
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    if (operationId) {
      appendOperationLogEvent(operationId, {
        category: 'yandex-response', level: 'info',
        message: `Yandex API ${method} ${endpoint || '/'}: HTTP ${response.status}`,
        data: { endpoint: endpoint || '/', method, status: response.status, retryAttempt, durationMs: Date.now() - startedAt, response: {} }
      });
    }
    return {};
  }
  if (operationId) {
    appendOperationLogEvent(operationId, {
      category: 'yandex-response', level: 'info',
      message: `Yandex API ${method} ${endpoint || '/'}: HTTP ${response.status}`,
      data: {
        endpoint: endpoint || '/', method, status: response.status, retryAttempt,
        durationMs: Date.now() - startedAt,
        response: summarizeYandexResponse(endpoint, data)
      }
    });
  }
  return data || {};
}

function getSiteFolderSegments(hostname) {
  const hierarchy = globalThis.WebClipPublicSuffix?.hierarchy(hostname || 'site') || { host: '', base: '', third: '' };
  const host = hierarchy.host || String(hostname || 'site').toLowerCase().replace(/\.$/, '') || 'site';
  const baseDomain = hierarchy.base || host;
  const thirdDomain = hierarchy.third || baseDomain;
  const thirdLabel = thirdDomain !== baseDomain && thirdDomain.endsWith(`.${baseDomain}`)
    ? thirdDomain.slice(0, -(baseDomain.length + 1)).split('.').pop()
    : '';
  return thirdLabel
    ? [sanitizeDiskName(baseDomain), sanitizeDiskName(thirdLabel)]
    : [sanitizeDiskName(baseDomain)];
}

function sanitizeDiskName(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/[\u0000-\u001F\u007F]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[ .]+$/g, '')
    .slice(0, 120) || '_';
}

function normalizeDiskPath(value) {
  let path = String(value || '').trim().replace(/\\/g, '/').replace(/^disk:/i, '');
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

function joinDiskPath(base, ...parts) {
  const start = normalizeDiskPath(base || '/') || '/';
  const cleaned = parts
    .flatMap((part) => String(part || '').split('/'))
    .filter(Boolean)
    .map(sanitizeDiskName);
  const prefix = start === '/' ? '' : start;
  return normalizeDiskPath(`${prefix}/${cleaned.join('/')}`) || '/';
}

function parentDiskPath(path) {
  const normalized = normalizeDiskPath(path || '');
  if (!normalized || normalized === '/') return normalized;
  const slash = normalized.lastIndexOf('/');
  return slash <= 0 ? '/' : normalized.slice(0, slash);
}

async function closeOffscreenDocumentIfIdle(nonce) {
  if (!nonce) return { ok: true, closed: false, reason: 'invalid-nonce' };
  if (closingOffscreenDocument) {
    try {
      await withOperationTimeout(closingOffscreenDocument, 10_000, 'Ожидание уже начатого закрытия offscreen-документа');
      return { ok: true, closed: true, reason: 'already-closing' };
    } catch (error) {
      return { ok: false, closed: false, reason: error?.code === 'WEBCLIP_TIMEOUT' ? 'close-pending' : 'close-failed', error: normalizeError(error) };
    }
  }
  let closeStarted = false;
  try {
    const confirmation = await withOperationTimeout(chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'WEBCLIP_OFFSCREEN_CONFIRM_IDLE_CLOSE',
      nonce
    }), 5_000, 'Проверка idle-состояния offscreen');
    if (!confirmation?.ok || !confirmation.idle) {
      return { ok: true, closed: false, reason: 'became-active' };
    }
    closeStarted = true;
    const rawClose = Promise.resolve(chrome.offscreen.closeDocument());
    const trackedClose = rawClose.catch(async (error) => {
      // closeDocument() is a non-cancellable Chrome API side effect. If it
      // eventually rejects, reset the offscreen-side closingForIdle latch only
      // after the browser has actually settled the close attempt. Do not use a
      // failed getContexts() probe as evidence that the document is gone. A
      // best-effort CANCEL is harmless if the document already disappeared and
      // prevents a surviving offscreen page from remaining latched as closing.
      await withOperationTimeout(chrome.runtime.sendMessage({
        target: 'offscreen',
        type: 'WEBCLIP_OFFSCREEN_CANCEL_IDLE_CLOSE'
      }), 5_000, 'Сброс idle-close состояния offscreen после ошибки closeDocument').catch((cancelError) => {
        console.warn('WebClip offscreen idle-close latch reset:', cancelError);
      });
      throw error;
    });
    closingOffscreenDocument = trackedClose;
    void trackedClose.finally(() => {
      if (closingOffscreenDocument === trackedClose) closingOffscreenDocument = null;
    }).catch(() => {});

    await withOperationTimeout(trackedClose, 10_000, 'Закрытие offscreen-документа');
    return { ok: true, closed: true };
  } catch (error) {
    if (closeStarted && error?.code === 'WEBCLIP_TIMEOUT') {
      // Do not send CANCEL and do not clear closingOffscreenDocument here.
      // The underlying closeDocument() continues running. New work must stay
      // blocked until that exact promise settles, otherwise its late success
      // could close a newly-created offscreen document in the middle of a
      // signed transfer or Blob-backed download.
      console.warn('WebClip offscreen idle close remains pending after local timeout:', error);
      return { ok: false, closed: false, reason: 'close-pending', error: normalizeError(error) };
    }
    // If the document disappeared between confirmation and close, the desired
    // end state is already achieved. Other failures remain diagnostic only.
    let contexts;
    try {
      contexts = await withOperationTimeout(chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
      }), 5_000, 'Проверка offscreen после ошибки закрытия');
    } catch (contextError) {
      console.warn('WebClip offscreen idle close context state unknown:', contextError);
      return { ok: false, closed: false, reason: 'context-unknown', error: normalizeError(error), contextError: normalizeError(contextError) };
    }
    if (!contexts.length) return { ok: true, closed: true, reason: 'already-closed' };
    await withOperationTimeout(chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'WEBCLIP_OFFSCREEN_CANCEL_IDLE_CLOSE'
    }), 5_000, 'Сброс idle-close состояния offscreen').catch((cancelError) => {
      console.warn('WebClip offscreen idle-close cancel:', cancelError);
    });
    console.warn('WebClip offscreen idle close:', error);
    return { ok: false, closed: false, error: normalizeError(error) };
  }
}

async function ensureOffscreenDocument() {
  if (closingOffscreenDocument) {
    await withOperationTimeout(closingOffscreenDocument, 15_000, 'Ожидание завершения закрытия offscreen-документа');
  }
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
  const contexts = await withOperationTimeout(chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  }), 5_000, 'Проверка offscreen-документа');

  if (contexts.length > 0) return;

  if (!creatingOffscreenDocument) {
    creatingOffscreenDocument = chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: ['BLOBS'],
      justification: 'Создание Blob URL и устойчивые signed upload/download Яндекс Диска вне MV3 service worker.'
    }).finally(() => {
      creatingOffscreenDocument = null;
    });
  }
  await withOperationTimeout(creatingOffscreenDocument, 10_000, 'Создание offscreen-документа');
}

async function sendMessageToOffscreen(message, timeoutMs = 15_000, label = 'Offscreen операция', { retryTransportErrors = true } = {}) {
  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await ensureOffscreenDocument();
      const response = await withOperationTimeout(chrome.runtime.sendMessage({ target: 'offscreen', ...message }), timeoutMs, label);
      if (response?.code === 'OFFSCREEN_CLOSING' && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      // Unknown transport errors are safe to retry for idempotent helper RPCs,
      // but not for signed uploads/downloads: the first offscreen request may
      // still be running even if the service worker lost its response channel.
      if (attempt === 0 && retryTransportErrors) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }
      break;
    }
  }
  throw lastError || new Error(`${label}: offscreen-документ недоступен.`);
}

async function createPdfCacheBlobUrl(cacheKey) {
  const response = await sendMessageToOffscreen({
    type: 'WEBCLIP_CREATE_PDF_CACHE_BLOB_URL',
    pdfCacheKey: String(cacheKey || '')
  }, 30_000, 'Создание PDF Blob URL из IndexedDB cache', { retryTransportErrors: false });
  if (!response?.ok || !response.url) {
    throw new Error(response?.error || 'Не удалось подготовить PDF к скачиванию.');
  }
  return response.url;
}

async function createTextBlobUrl(text, mimeType = 'application/json;charset=utf-8') {
  const response = await sendMessageToOffscreen({
    type: 'WEBCLIP_CREATE_TEXT_BLOB_URL',
    text: String(text || ''),
    mimeType
  }, 30_000, 'Создание текстового Blob URL', { retryTransportErrors: false });
  if (!response?.ok || !response.url) {
    throw new Error(response?.error || 'Не удалось подготовить файл журнала к скачиванию.');
  }
  return response.url;
}

async function createStagedTextBlobUrl(payloadKey, mimeType = 'application/json;charset=utf-8') {
  const response = await sendMessageToOffscreen({
    type: 'WEBCLIP_CREATE_STAGED_TEXT_BLOB_URL',
    payloadKey: String(payloadKey || ''),
    mimeType
  }, 45_000, 'Создание Blob URL из chunked экспорта', { retryTransportErrors: false });
  if (!response?.ok || !response.url) {
    throw new Error(response?.error || 'Не удалось подготовить chunked экспорт к скачиванию.');
  }
  return response.url;
}

async function revokeBlobUrl(url) {
  if (!url) return;
  try {
    await sendMessageToOffscreen({
      type: 'WEBCLIP_REVOKE_BLOB_URL',
      url
    }, 10_000, 'Освобождение Blob URL');
  } catch (_) {}
}

chrome.downloads.onChanged.addListener((delta) => {
  if (!Number.isInteger(Number(delta?.id)) || !delta?.state?.current) return;
  const state = String(delta.state.current || '');
  if (state !== 'complete' && state !== 'interrupted') return;
  finalizePendingLocalDownload(Number(delta.id), state, String(delta?.error?.current || '')).catch((error) => {
    console.warn('WebClip pending local download finalize:', error);
  });
});

const downloadBlobCleanupWatchdogs = new Map();

function revokeBlobUrlWhenDownloadFinishes(downloadId, url) {
  const id = Number(downloadId);
  const blobUrl = String(url || '');
  if (!Number.isInteger(id) || id < 0 || !blobUrl) return;
  const existing = downloadBlobCleanupWatchdogs.get(id);
  if (existing?.url === blobUrl) return;
  if (existing?.cleanup) existing.cleanup();

  let cleaned = false;
  let watchdog = null;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    if (watchdog) clearTimeout(watchdog);
    chrome.downloads.onChanged.removeListener(listener);
    if (downloadBlobCleanupWatchdogs.get(id)?.cleanup === cleanup) downloadBlobCleanupWatchdogs.delete(id);
    revokeBlobUrl(blobUrl);
  };
  const listener = (delta) => {
    if (Number(delta.id) !== id || !delta.state?.current) return;
    if (delta.state.current === 'complete' || delta.state.current === 'interrupted') cleanup();
  };
  downloadBlobCleanupWatchdogs.set(id, { url: blobUrl, cleanup });
  chrome.downloads.onChanged.addListener(listener);
  watchdog = setTimeout(() => {
    (async () => {
      // A Blob URL is the backing source for the Chrome DownloadItem. Revoking
      // it while the item is still in_progress can turn a slow/paused download
      // into an unexplained interruption. Treat the watchdog as an explicit
      // operation deadline instead: ask Chrome to cancel first, then release
      // the Blob URL. This keeps the memory lifetime bounded without racing an
      // otherwise-active download.
      let item = null;
      try {
        const matches = await withOperationTimeout(chrome.downloads.search({ id }), 5_000, 'Проверка Blob-backed загрузки Chrome');
        item = Array.isArray(matches) ? matches[0] : null;
      } catch (error) {
        console.warn('WebClip Blob download deadline state check:', error);
      }
      if (!item || item.state === 'in_progress') {
        try {
          // If the state query itself failed/timed out, cancellation is still
          // the safer bounded action: Chrome treats cancel of a completed,
          // interrupted or missing item as a no-op/completed request.
          await withOperationTimeout(chrome.downloads.cancel(id), 10_000, 'Отмена Blob-backed загрузки Chrome по deadline');
        } catch (error) {
          console.warn('WebClip Blob download deadline cancel:', error);
        }
      }
      cleanup();
    })().catch((error) => {
      console.warn('WebClip Blob download deadline cleanup:', error);
      cleanup();
    });
  }, LOCAL_BLOB_DOWNLOAD_DEADLINE_MS);
}


function getSiteNameUpToThirdLevel(hostname) {
  const hierarchy = globalThis.WebClipPublicSuffix?.hierarchy(hostname || 'site') || { host: '', third: '' };
  return hierarchy.third || hierarchy.host || 'site';
}


function localDayKey(timestamp) {
  const date = new Date(Number(timestamp) || 0);
  if (!Number.isFinite(date.getTime())) return '';
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

async function getJournalSummaryForUrl(url) {
  await ensureJournalStatsHealthy('summary-read').catch((error) => console.warn('WebClip urlStats repair:', error));
  const urlKey = normalizeJournalUrl(url || '');
  if (!urlKey) return { lastSavedAt: 0, uniqueDays: 0 };
  const db = await openJournalDb();
  try {
    const stat = await runIndexedDbTransactionBounded(db, JOURNAL_STATS_STORE, 'readonly', 'Чтение статистики URL', ({ store, setResult, fail }) => { const req = store().get(urlKey); req.onsuccess = () => setResult(req.result || null); req.onerror = () => fail(req.error || new Error('Не удалось прочитать статистику URL.')); }, JOURNAL_CRUD_IDB_TX_TIMEOUT_MS);
    if (stat) return { lastSavedAt: Number(stat.lastSavedAt || 0), uniqueDays: Number(stat.uniqueDays || 0) };
  } finally { db.close(); }
  const rebuilt = await rebuildUrlStatsForUrl(urlKey);
  return { lastSavedAt: Number(rebuilt.lastSavedAt || 0), uniqueDays: Number(rebuilt.uniqueDays || 0) };
}

function makeActionIconImageData(size, color) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = color;
  const r = Math.max(2, Math.round(size * 0.22));
  ctx.beginPath();
  ctx.roundRect(1, 1, size - 2, size - 2, r);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${Math.max(9, Math.round(size * 0.56))}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('W', size / 2, size / 2 + size * 0.03);
  return ctx.getImageData(0, 0, size, size);
}

async function updateActionForTab(tabId, knownUrl = '') {
  if (!tabId) return;
  const generation = beginActionUpdateGeneration(tabId);
  let url = knownUrl;
  if (!url) {
    try {
      const tab = await getChromeTabBounded(tabId, 'Чтение URL вкладки для Chrome Action');
      url = tab?.url || '';
    } catch (_) {
      url = '';
    }
  }
  if (!isActionUpdateGenerationCurrent(tabId, generation)) return;

  if (!/^https?:\/\//i.test(url)) {
    if (!await applyChromeActionMutationBestEffort(tabId, generation, () => chrome.action.setIcon({
      tabId,
      imageData: {
        16: makeActionIconImageData(16, '#5f6368'),
        32: makeActionIconImageData(32, '#5f6368')
      }
    }), 'Обновление иконки Chrome Action')) return;
    if (!await applyChromeActionMutationBestEffort(tabId, generation, () => chrome.action.setBadgeText({ tabId, text: '' }), 'Очистка badge Chrome Action')) return;
    await applyChromeActionMutationBestEffort(tabId, generation, () => chrome.action.setTitle({ tabId, title: 'WebClip PDF' }), 'Обновление title Chrome Action');
    return;
  }

  const summary = await getJournalSummaryForUrl(url);
  if (!isActionUpdateGenerationCurrent(tabId, generation)) return;
  const age = summary.lastSavedAt ? Date.now() - summary.lastSavedAt : Infinity;
  const DAY = 24 * 60 * 60 * 1000;
  let color = '#9aa0a6';
  let stateText = 'Сохранений для этой страницы ещё нет';
  if (summary.lastSavedAt) {
    if (age <= 7 * DAY) {
      color = '#34a853';
      stateText = 'Последняя запись сохранения: не более 7 дней назад';
    } else if (age <= 30 * DAY) {
      color = '#f9ab00';
      stateText = 'Последняя запись сохранения: от 8 до 30 дней назад';
    } else {
      color = '#ea4335';
      stateText = 'Последняя запись сохранения: более 30 дней назад';
    }
  }

  if (!await applyChromeActionMutationBestEffort(tabId, generation, () => chrome.action.setIcon({
    tabId,
    imageData: {
      16: makeActionIconImageData(16, color),
      32: makeActionIconImageData(32, color)
    }
  }), 'Обновление иконки Chrome Action')) return;

  const badge = summary.uniqueDays ? String(summary.uniqueDays) : '';
  if (!await applyChromeActionMutationBestEffort(tabId, generation, () => chrome.action.setBadgeText({ tabId, text: badge }), 'Обновление badge Chrome Action')) return;
  if (!await applyChromeActionMutationBestEffort(tabId, generation, () => chrome.action.setBadgeBackgroundColor({ tabId, color: '#202124' }), 'Обновление фона badge Chrome Action')) return;
  await applyChromeActionMutationBestEffort(tabId, generation, () => chrome.action.setTitle({
    tabId,
    title: summary.uniqueDays
      ? `WebClip PDF · ${stateText} · Дней с записями журнала: ${summary.uniqueDays}`
      : `WebClip PDF · ${stateText}`
  }), 'Обновление title Chrome Action');
}

async function refreshActionForAllTabs() {
  let tabs = [];
  try { tabs = await chrome.tabs.query({}); } catch (_) { return; }
  await Promise.all(tabs.map((tab) => updateActionForTab(tab.id, tab.url || '').catch(() => {})));
}

const MAX_PDF_FILENAME_LENGTH = 100;
const PDF_EXTENSION = '.pdf';
const FILENAME_SEPARATOR = '__';

function buildPdfFilename(meta) {
  const siteRaw = getSiteNameUpToThirdLevel(meta.hostname || 'site');
  const site = sanitizePart(siteRaw, Number.MAX_SAFE_INTEGER) || 'site';
  const stamp = sanitizePart(meta.filenameTimestamp || 'date_time', Number.MAX_SAFE_INTEGER) || 'date_time';
  const rawTitle = sanitizePart(meta.title || 'Без названия', Number.MAX_SAFE_INTEGER) || 'Без названия';

  // Полное имя вместе с расширением не должно превышать 100 символов.
  // Домен до третьего уровня, дата/время и расширение имеют приоритет;
  // в штатном случае для соблюдения лимита обрезается только Title.
  const fixedLength =
    FILENAME_SEPARATOR.length * 2 +
    site.length +
    stamp.length +
    PDF_EXTENSION.length;

  let titleBudget = MAX_PDF_FILENAME_LENGTH - fixedLength;
  let finalSite = site;

  // Крайний случай: сам домен настолько длинный, что даже пустой Title
  // не позволяет уложиться в 100 символов. Чтобы гарантировать лимит,
  // сокращаем доменную часть только после исчерпания бюджета Title.
  if (titleBudget < 1) {
    const minTitleLength = 1;
    const maxSiteLength = Math.max(
      1,
      MAX_PDF_FILENAME_LENGTH -
        PDF_EXTENSION.length -
        stamp.length -
        FILENAME_SEPARATOR.length * 2 -
        minTitleLength
    );
    finalSite = site.slice(0, maxSiteLength).trim().replace(/[ .]+$/g, '') || 's';
    titleBudget = Math.max(
      1,
      MAX_PDF_FILENAME_LENGTH -
        PDF_EXTENSION.length -
        finalSite.length -
        stamp.length -
        FILENAME_SEPARATOR.length * 2
    );
  }

  let title = rawTitle.slice(0, titleBudget).trim().replace(/[ .]+$/g, '');
  if (!title) {
    title = 'X'.slice(0, titleBudget);
  }

  // Требуемый порядок: Title + домен до 3-го уровня + дата/время + расширение.
  // sanitizePart заменяет точки внутри частей на "_", поэтому единственная
  // точка в сформированном имени — перед расширением .pdf.
  let filename = `${title}${FILENAME_SEPARATOR}${finalSite}${FILENAME_SEPARATOR}${stamp}${PDF_EXTENSION}`;

  // Защитная гарантия на случай нестандартных входных данных.
  if (filename.length > MAX_PDF_FILENAME_LENGTH) {
    const overflow = filename.length - MAX_PDF_FILENAME_LENGTH;
    title = title.slice(0, Math.max(1, title.length - overflow)).trim().replace(/[ .]+$/g, '') || 'X';
    filename = `${title}${FILENAME_SEPARATOR}${finalSite}${FILENAME_SEPARATOR}${stamp}${PDF_EXTENSION}`;
  }

  return filename;
}

function buildYandexFilename(meta) {
  return buildPdfFilename(meta);
}

function buildFilename(meta) {
  return buildPdfFilename(meta);
}

function sanitizePart(value, maxLength) {
  let text = String(value ?? '').normalize('NFKC');
  text = text
    .replace(/\./g, '_')
    .replace(/[^\p{L}\p{N} _()\-]+/gu, '_')
    .replace(/\s+/g, ' ')
    .replace(/_+/g, '_')
    .trim()
    .replace(/[ .]+$/g, '');

  if (text.length > maxLength) {
    text = text.slice(0, maxLength).trim().replace(/[ .]+$/g, '');
  }
  return text;
}

function base64DecodedByteLength(base64Value) {
  const base64 = String(base64Value || '');
  if (!base64 || base64.length > MAX_PDF_BASE64_CHARS || base64.length % 4 !== 0) {
    throw new Error('Некорректный или слишком большой Base64 PDF.');
  }
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor(base64.length * 3 / 4) - padding;
}

function randomBase64Url(byteLength) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

async function sha256Base64Url(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function readResponseTextBounded(response, maxBytes = 8 * 1024 * 1024) {
  const cap = Math.max(1024, Number(maxBytes) || 8 * 1024 * 1024);
  const declared = Number(response?.headers?.get?.('content-length') || 0);
  if (declared && declared > cap) throw new Error(`Ответ внешнего сервиса превышает допустимый размер ${Math.ceil(cap / 1024 / 1024)} МБ.`);
  if (!response?.body?.getReader) {
    if (!declared) throw new Error('Внешний ответ не поддерживает потоковое чтение и не сообщает Content-Length; безопасно ограничить его размер невозможно.');
    const text = await response.text();
    if (new Blob([text]).size > cap) throw new Error(`Ответ внешнего сервиса превышает допустимый размер ${Math.ceil(cap / 1024 / 1024)} МБ.`);
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
        throw new Error(`Ответ внешнего сервиса превышает допустимый размер ${Math.ceil(cap / 1024 / 1024)} МБ.`);
      }
      parts.push(decoder.decode(value, { stream: true }));
    }
    parts.push(decoder.decode());
    return parts.join('');
  } finally {
    try { reader.releaseLock(); } catch (_) {}
  }
}

async function safeJson(response) {
  // Network/Abort/stream errors are part of the external-I/O contract and must
  // propagate to the caller. Only syntactically non-JSON bodies are tolerated.
  const text = (await readResponseTextBounded(response, 8 * 1024 * 1024)).trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) return {};
    throw error;
  }
}

async function safeResponseText(response) {
  try {
    const text = (await readResponseTextBounded(response, 64 * 1024)).trim();
    return text.slice(0, 500);
  } catch (_) {
    return '';
  }
}

function normalizeError(error) {
  return error?.message || String(error || 'Неизвестная ошибка.');
}