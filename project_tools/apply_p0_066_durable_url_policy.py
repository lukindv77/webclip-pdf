#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def load(name):
    return (ROOT / name).read_text(encoding='utf-8')


def save(name, text):
    (ROOT / name).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


def replace_all_exact(text, old, new, expected, label):
    count = text.count(old)
    if count != expected:
        raise SystemExit(f'{label}: expected {expected} matches, found {count}')
    return text.replace(old, new)


# Shared policy: migrate both PDF record and metadata stores.
p = load('durable-url-policy.js')
p = replace_once(
    p,
    """  function migratePdfCacheDbV4(db, tx, oldVersion) {\n    if (Number(oldVersion || 0) >= 4 || !tx || !db.objectStoreNames.contains('pdfs')) return;\n    migrateStoreCursor(tx.objectStore('pdfs'), sanitizeCachedPdfRecordUrls);\n  }\n""",
    """  function migratePdfCacheDbV4(db, tx, oldVersion) {\n    if (Number(oldVersion || 0) >= 4 || !tx) return;\n    if (db.objectStoreNames.contains('pdfs')) migrateStoreCursor(tx.objectStore('pdfs'), sanitizeCachedPdfRecordUrls);\n    if (db.objectStoreNames.contains('meta')) migrateStoreCursor(tx.objectStore('meta'), sanitizeCachedPdfRecordUrls);\n  }\n""",
    'policy cache migration'
)
save('durable-url-policy.js', p)

# Service worker wiring and durable persistence boundaries.
s = load('service-worker.js')
s = replace_once(
    s,
    "importScripts('public-suffix.js', 'journal-import-stream.js', 'journal-text-filter.js', 'local-download-identity.js');",
    "importScripts('public-suffix.js', 'durable-url-policy.js', 'journal-import-stream.js', 'journal-text-filter.js', 'local-download-identity.js');",
    'worker import'
)
s = replace_once(s, 'const PDF_CACHE_DB_VERSION = 3;', 'const PDF_CACHE_DB_VERSION = 4;', 'pdf cache version')
s = replace_once(s, 'const JOURNAL_DB_VERSION = 7;', 'const JOURNAL_DB_VERSION = 8;', 'journal db version')

s = replace_once(
    s,
    """function sanitizeContentSaveMeta(rawMeta, sender) {\n  const raw = rawMeta && typeof rawMeta === 'object' && !Array.isArray(rawMeta) ? rawMeta : {};\n  const tabUrl = String(sender?.tab?.url || sender?.url || '');\n  let parsed;\n  try {\n    parsed = new URL(tabUrl);\n  } catch (_) {\n    throw new Error('Не удалось определить URL страницы для сохранения.');\n  }\n  if (!['http:', 'https:'].includes(parsed.protocol)) {\n    throw new Error('Сохранение PDF разрешено только для HTTP/HTTPS страниц.');\n  }\n  return {\n    hostname: parsed.hostname.toLowerCase().slice(0, 255),\n    siteAddress: parsed.origin.slice(0, 2048),\n    url: parsed.toString().slice(0, MAX_IMPORTED_URL_CHARS),\n    title: boundedContentString(raw.title || 'Без названия', MAX_CONTENT_TITLE_CHARS),\n    localDateTime: boundedContentString(raw.localDateTime, 128),\n    filenameTimestamp: boundedContentString(raw.filenameTimestamp, 128),\n    readingMode: raw.readingMode === 'later' ? 'later' : 'read',\n    fileComment: boundedContentString(raw.fileComment, MAX_CONTENT_COMMENT_CHARS),\n    selectionSnapshot: sanitizeSelectionSnapshot(raw.selectionSnapshot, { rejectOverflow: true }),\n    resourceReport: sanitizePdfResourceReport(raw.resourceReport),\n    pageAnalysis: sanitizePageStructureDiagnostics(raw.pageAnalysis)\n  };\n}\n""",
    """function sanitizeContentSaveMeta(rawMeta, sender) {\n  const raw = rawMeta && typeof rawMeta === 'object' && !Array.isArray(rawMeta) ? rawMeta : {};\n  const tabUrl = String(sender?.tab?.url || sender?.url || '');\n  let parsed;\n  try {\n    parsed = new URL(tabUrl);\n  } catch (_) {\n    throw new Error('Не удалось определить URL страницы для сохранения.');\n  }\n  if (!['http:', 'https:'].includes(parsed.protocol)) {\n    throw new Error('Сохранение PDF разрешено только для HTTP/HTTPS страниц.');\n  }\n  const exactUrl = parsed.toString();\n  const safeUrl = WebClipDurableUrlPolicy.sanitizeHttpUrl(exactUrl);\n  const urlKey = WebClipDurableUrlPolicy.exactHttpUrlKey(exactUrl);\n  if (!safeUrl || !urlKey) throw new Error('Не удалось безопасно нормализовать URL страницы для сохранения.');\n  return {\n    hostname: parsed.hostname.toLowerCase().slice(0, 255),\n    siteAddress: WebClipDurableUrlPolicy.sanitizeSiteAddress(exactUrl),\n    url: safeUrl.slice(0, MAX_IMPORTED_URL_CHARS),\n    urlKey,\n    title: boundedContentString(raw.title || 'Без названия', MAX_CONTENT_TITLE_CHARS),\n    localDateTime: boundedContentString(raw.localDateTime, 128),\n    filenameTimestamp: boundedContentString(raw.filenameTimestamp, 128),\n    readingMode: raw.readingMode === 'later' ? 'later' : 'read',\n    fileComment: boundedContentString(raw.fileComment, MAX_CONTENT_COMMENT_CHARS),\n    selectionSnapshot: sanitizeSelectionSnapshot(raw.selectionSnapshot, { rejectOverflow: true }),\n    resourceReport: sanitizePdfResourceReport(raw.resourceReport),\n    pageAnalysis: sanitizePageStructureDiagnostics(raw.pageAnalysis)\n  };\n}\n""",
    'content save meta'
)

s = replace_once(
    s,
    """function normalizeJournalUrl(url) {\n  try {\n    const parsed = new URL(String(url || ''));\n    parsed.hash = '';\n    return parsed.toString();\n  } catch (_) {\n    return String(url || '').split('#')[0];\n  }\n}\n""",
    """function normalizeJournalUrl(url) {\n  return WebClipDurableUrlPolicy.exactHttpUrlKey(url);\n}\n""",
    'journal exact URL key'
)

s = replace_once(
    s,
    """      src: String(locator.src || '').slice(0, 2000),\n      role: String(locator.role || '').slice(0, 120),\n      href: String(locator.href || '').slice(0, 2000),\n""",
    """      src: WebClipDurableUrlPolicy.sanitizeLocatorUrl(locator.src || ''),\n      srcKey: WebClipDurableUrlPolicy.isLocatorUrlKey(locator.srcKey) ? String(locator.srcKey) : WebClipDurableUrlPolicy.locatorUrlKey(locator.src || ''),\n      role: String(locator.role || '').slice(0, 120),\n      href: WebClipDurableUrlPolicy.sanitizeLocatorUrl(locator.href || ''),\n      hrefKey: WebClipDurableUrlPolicy.isLocatorUrlKey(locator.hrefKey) ? String(locator.hrefKey) : WebClipDurableUrlPolicy.locatorUrlKey(locator.href || ''),\n""",
    'selection locator URL fields'
)

s = replace_once(
    s,
    """    publicUrl: String(data.publicUrl || '').slice(0, MAX_IMPORTED_URL_CHARS),\n""",
    """    publicUrl: WebClipDurableUrlPolicy.sanitizeHttpsUrl(data.publicUrl || '').slice(0, MAX_IMPORTED_URL_CHARS),\n""",
    'pending public URL'
)
s = replace_once(
    s,
    """      siteAddress: String(meta.siteAddress || '').slice(0, MAX_IMPORTED_URL_CHARS),\n      url: String(meta.url || '').slice(0, MAX_IMPORTED_URL_CHARS),\n      title: String(meta.title || '').slice(0, 4000),\n""",
    """      siteAddress: WebClipDurableUrlPolicy.sanitizeSiteAddress(meta.siteAddress || meta.url || ''),\n      url: WebClipDurableUrlPolicy.sanitizeHttpUrl(meta.url || '').slice(0, MAX_IMPORTED_URL_CHARS),\n      urlKey: WebClipDurableUrlPolicy.isExactHttpUrlKey(meta.urlKey) ? String(meta.urlKey) : normalizeJournalUrl(meta.url || ''),\n      title: String(meta.title || '').slice(0, 4000),\n""",
    'pending source URL'
)

s = replace_once(
    s,
    """    remotePath: String(remotePath || ''), folder: String(folder || ''), publicUrl: String(publicUrl || ''), resourceId: String(resourceId || ''),\n    accountUid: String(accountUid || '').slice(0, MAX_YANDEX_ACCOUNT_FIELD_CHARS),\n    rootPath: normalizeDiskPath(String(rootPath || '').slice(0, MAX_IMPORTED_PATH_CHARS)),\n    hostname: String(meta.hostname || ''), siteAddress: String(meta.siteAddress || ''),\n    url: String(meta.url || ''), urlKey: normalizeJournalUrl(meta.url || ''), siteKey: getJournalSiteKey(meta.url || meta.hostname || ''),\n""",
    """    remotePath: String(remotePath || ''), folder: String(folder || ''), publicUrl: WebClipDurableUrlPolicy.sanitizeHttpsUrl(publicUrl || ''), resourceId: String(resourceId || ''),\n    accountUid: String(accountUid || '').slice(0, MAX_YANDEX_ACCOUNT_FIELD_CHARS),\n    rootPath: normalizeDiskPath(String(rootPath || '').slice(0, MAX_IMPORTED_PATH_CHARS)),\n    hostname: String(meta.hostname || ''), siteAddress: WebClipDurableUrlPolicy.sanitizeSiteAddress(meta.siteAddress || meta.url || ''),\n    url: WebClipDurableUrlPolicy.sanitizeHttpUrl(meta.url || ''), urlKey: WebClipDurableUrlPolicy.isExactHttpUrlKey(meta.urlKey) ? String(meta.urlKey) : normalizeJournalUrl(meta.url || ''), siteKey: getJournalSiteKey(meta.url || meta.hostname || ''),\n""",
    'journal entry URL fields'
)

s = replace_once(
    s,
    """function normalizeImportedHttpUrl(value) {\n  const raw = boundedImportString(value, MAX_IMPORTED_URL_CHARS).trim();\n  if (!raw) return '';\n  try {\n    const url = new URL(raw);\n    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';\n    url.hash = '';\n    return url.toString();\n  } catch (_) {\n    return '';\n  }\n}\n\nfunction normalizeImportedHttpsUrl(value) {\n  const raw = boundedImportString(value, MAX_IMPORTED_URL_CHARS).trim();\n  if (!raw) return '';\n  try {\n    const url = new URL(raw);\n    return url.protocol === 'https:' ? url.toString() : '';\n  } catch (_) {\n    return '';\n  }\n}\n""",
    """function normalizeImportedHttpUrl(value) {\n  return WebClipDurableUrlPolicy.sanitizeHttpUrl(boundedImportString(value, MAX_IMPORTED_URL_CHARS));\n}\n\nfunction normalizeImportedHttpsUrl(value) {\n  return WebClipDurableUrlPolicy.sanitizeHttpsUrl(boundedImportString(value, MAX_IMPORTED_URL_CHARS));\n}\n""",
    'import URL normalizers'
)

s = replace_once(
    s,
    """  const url = normalizeImportedHttpUrl(raw.url || '');\n  const hostname = boundedImportString(raw.hostname || (() => { try { return new URL(url).hostname; } catch (_) { return ''; } })(), 255);\n""",
    """  const rawUrl = boundedImportString(raw.url || '', MAX_IMPORTED_URL_CHARS).trim();\n  const url = normalizeImportedHttpUrl(rawUrl);\n  const urlKey = WebClipDurableUrlPolicy.isExactHttpUrlKey(raw.urlKey) ? String(raw.urlKey) : normalizeJournalUrl(rawUrl);\n  const hostname = boundedImportString(raw.hostname || (() => { try { return new URL(url).hostname; } catch (_) { return ''; } })(), 255);\n""",
    'import raw URL key'
)
s = replace_once(
    s,
    """    siteAddress: boundedImportString(raw.siteAddress || '', MAX_IMPORTED_URL_CHARS),\n    url,\n    urlKey: normalizeJournalUrl(url),\n""",
    """    siteAddress: WebClipDurableUrlPolicy.sanitizeSiteAddress(raw.siteAddress || rawUrl),\n    url,\n    urlKey,\n""",
    'import safe site/key'
)

# New Journal schema migrates legacy plaintext durable state.
s = replace_once(s, '(db, tx) => {\n      let store;', '(db, tx, event) => {\n      let store;', 'journal upgrade signature')
s = replace_once(
    s,
    """      } else {\n        const importStore = tx.objectStore(JOURNAL_IMPORT_STAGING_STORE);\n        if (!importStore.indexNames.contains('importId')) importStore.createIndex('importId', 'importId', { unique: false });\n        if (!importStore.indexNames.contains('createdAt')) importStore.createIndex('createdAt', 'createdAt', { unique: false });\n      }\n    },\n    'Не удалось открыть журнал WebClip.',\n""",
    """      } else {\n        const importStore = tx.objectStore(JOURNAL_IMPORT_STAGING_STORE);\n        if (!importStore.indexNames.contains('importId')) importStore.createIndex('importId', 'importId', { unique: false });\n        if (!importStore.indexNames.contains('createdAt')) importStore.createIndex('createdAt', 'createdAt', { unique: false });\n      }\n      WebClipDurableUrlPolicy.migrateJournalDbV8(db, tx, event?.oldVersion || 0);\n    },\n    'Не удалось открыть журнал WebClip.',\n""",
    'journal v8 migration call'
)

# Cache records store safe display URL plus opaque exact key.
s = replace_once(
    s,
    """function pdfCacheMetadataFromRecord(record = {}) {\n  const pdfBase64 = typeof record.pdfBase64 === 'string' ? record.pdfBase64 : '';\n  const pdfBlob = record.pdfBlob instanceof Blob ? record.pdfBlob : null;\n  const pdfByteLength = Math.max(0, Number(record.pdfByteLength) || (pdfBlob ? pdfBlob.size : 0) || (pdfBase64 ? base64DecodedByteLength(pdfBase64) : 0));\n  return {\n    key: String(record.key || ''),\n    tabId: Math.max(0, Number(record.tabId) || 0),\n    filename: String(record.filename || '').slice(0, 512),\n    meta: record.meta && typeof record.meta === 'object' ? record.meta : {},\n    createdAt: Number(record.createdAt || Date.now()),\n    sourceUrl: String(record.sourceUrl || '').slice(0, MAX_IMPORTED_URL_CHARS),\n""",
    """function pdfCacheMetadataFromRecord(record = {}) {\n  const pdfBase64 = typeof record.pdfBase64 === 'string' ? record.pdfBase64 : '';\n  const pdfBlob = record.pdfBlob instanceof Blob ? record.pdfBlob : null;\n  const pdfByteLength = Math.max(0, Number(record.pdfByteLength) || (pdfBlob ? pdfBlob.size : 0) || (pdfBase64 ? base64DecodedByteLength(pdfBase64) : 0));\n  const safeRecord = WebClipDurableUrlPolicy.sanitizeCachedPdfRecordUrls(record);\n  return {\n    key: String(record.key || ''),\n    tabId: Math.max(0, Number(record.tabId) || 0),\n    filename: String(record.filename || '').slice(0, 512),\n    meta: safeRecord.meta && typeof safeRecord.meta === 'object' ? safeRecord.meta : {},\n    createdAt: Number(record.createdAt || Date.now()),\n    sourceUrl: String(safeRecord.sourceUrl || '').slice(0, MAX_IMPORTED_URL_CHARS),\n    sourceUrlKey: String(safeRecord.sourceUrlKey || ''),\n""",
    'cache metadata projection'
)
s = replace_once(
    s,
    """      if (Number(event?.oldVersion || 0) < 2 && pdfStore && metaStore) {\n        const request = pdfStore.openCursor();\n        request.onsuccess = () => {\n          const cursor = request.result;\n          if (!cursor) return;\n          try { metaStore.put(pdfCacheMetadataFromRecord(cursor.value || {})); } catch (_) {}\n          cursor.continue();\n        };\n      }\n""",
    """      if (Number(event?.oldVersion || 0) < 2 && pdfStore && metaStore) {\n        const request = pdfStore.openCursor();\n        request.onsuccess = () => {\n          const cursor = request.result;\n          if (!cursor) return;\n          try { metaStore.put(pdfCacheMetadataFromRecord(WebClipDurableUrlPolicy.sanitizeCachedPdfRecordUrls(cursor.value || {}))); } catch (_) {}\n          cursor.continue();\n        };\n      }\n      WebClipDurableUrlPolicy.migratePdfCacheDbV4(db, tx, event?.oldVersion || 0);\n""",
    'cache v4 migration call'
)
s = replace_once(s, '  const normalizedRecord = { ...record };', '  const normalizedRecord = WebClipDurableUrlPolicy.sanitizeCachedPdfRecordUrls({ ...record });', 'cache write projection')
s = replace_all_exact(
    s,
    "sourceUrl: normalizeJournalUrl(meta.url || '')",
    "sourceUrl: WebClipDurableUrlPolicy.sanitizeHttpUrl(meta.url || ''), sourceUrlKey: WebClipDurableUrlPolicy.isExactHttpUrlKey(meta.urlKey) ? String(meta.urlKey) : normalizeJournalUrl(meta.url || '')",
    2,
    'cache creation source URL'
)
s = replace_once(
    s,
    """  const cachedUrl = normalizeJournalUrl(cached.sourceUrl || cached?.meta?.url || '');\n  if (!currentUrl || !cachedUrl || currentUrl !== cachedUrl) {\n""",
    """  const cachedUrl = WebClipDurableUrlPolicy.isExactHttpUrlKey(cached.sourceUrlKey)\n    ? String(cached.sourceUrlKey)\n    : normalizeJournalUrl(cached.sourceUrl || cached?.meta?.url || '');\n  if (!currentUrl || !cachedUrl || currentUrl !== cachedUrl) {\n""",
    'cache exact key validation'
)

save('service-worker.js', s)

# Content injection: URL policy must share the isolated world with content.js.
g = load('content-injection-guard.js')
g = replace_once(
    g,
    """  // Any request that injects content.js must load the flattened-frame budget,\n  // inert-clone and page-control activation guards first, in that order, in\n  // the same isolated world.\n""",
    """  // Any request that injects content.js must load the flattened-frame budget,\n  // inert-clone, page-control activation and durable URL policy helpers first,\n  // in that order, in the same isolated world.\n""",
    'injection comment'
)
g = replace_once(
    g,
    """  const HOST_CONTROL_HELPER_FILE = 'host-control-activation-guard.js';\n  const CONTENT_FILE = 'content.js';\n  const REQUIRED_PREFIX = Object.freeze([BUDGET_HELPER_FILE, INERT_HELPER_FILE, HOST_CONTROL_HELPER_FILE]);\n""",
    """  const HOST_CONTROL_HELPER_FILE = 'host-control-activation-guard.js';\n  const DURABLE_URL_HELPER_FILE = 'durable-url-policy.js';\n  const CONTENT_FILE = 'content.js';\n  const REQUIRED_PREFIX = Object.freeze([BUDGET_HELPER_FILE, INERT_HELPER_FILE, HOST_CONTROL_HELPER_FILE, DURABLE_URL_HELPER_FILE]);\n""",
    'injection prefix'
)
g = replace_once(
    g,
    """    HOST_CONTROL_HELPER_FILE,\n    CONTENT_FILE,\n""",
    """    HOST_CONTROL_HELPER_FILE,\n    DURABLE_URL_HELPER_FILE,\n    CONTENT_FILE,\n""",
    'injection export'
)
save('content-injection-guard.js', g)

# Content snapshot capture/restore uses opaque locator keys while PDF header sees only safe source URL from worker.
c = load('content.js')
c = replace_once(
    c,
    """  globalThis.__WEBCLIP_PDF_PROTOTYPE_LOADED__ = true;\n\n  const INCLUDE_ATTR = 'data-webclip-pdf-include';\n""",
    """  globalThis.__WEBCLIP_PDF_PROTOTYPE_LOADED__ = true;\n  const durableUrlPolicy = globalThis.WebClipDurableUrlPolicy;\n  if (!durableUrlPolicy) throw new Error('P0-066: durable URL policy helper is not loaded before content.js.');\n\n  const INCLUDE_ATTR = 'data-webclip-pdf-include';\n""",
    'content policy binding'
)
c = replace_once(
    c,
    """  function createSimpleElementLocator(element, ownerDoc = element?.ownerDocument || document) {\n    const classes = [...(element?.classList || [])]\n""",
    """  function createSimpleElementLocator(element, ownerDoc = element?.ownerDocument || document) {\n    const rawSrc = String(element?.getAttribute?.('src') || '').slice(0, 1000);\n    const rawHref = String(element?.getAttribute?.('href') || '').slice(0, 1000);\n    const classes = [...(element?.classList || [])]\n""",
    'locator raw attrs'
)
c = replace_once(
    c,
    """      src: String(element?.getAttribute?.('src') || '').slice(0, 1000),\n      role: String(element?.getAttribute?.('role') || '').slice(0, 120),\n      href: String(element?.getAttribute?.('href') || '').slice(0, 1000),\n""",
    """      src: durableUrlPolicy.sanitizeLocatorUrl(rawSrc),\n      srcKey: durableUrlPolicy.locatorUrlKey(rawSrc),\n      role: String(element?.getAttribute?.('role') || '').slice(0, 120),\n      href: durableUrlPolicy.sanitizeLocatorUrl(rawHref),\n      hrefKey: durableUrlPolicy.locatorUrlKey(rawHref),\n""",
    'locator safe attrs'
)
c = replace_once(
    c,
    """      if (locator.title && candidate.getAttribute('title') === locator.title) score += 4;\n      if (locator.src && candidate.getAttribute('src') === locator.src) score += 4;\n""",
    """      if (locator.title && candidate.getAttribute('title') === locator.title) score += 4;\n      if (locator.srcKey && durableUrlPolicy.locatorUrlKey(candidate.getAttribute('src') || '') === locator.srcKey) score += 4;\n      else if (locator.src && durableUrlPolicy.sanitizeLocatorUrl(candidate.getAttribute('src') || '') === locator.src) score += 4;\n""",
    'legacy locator source match'
)
c = replace_once(
    c,
    """    const exactAttribute = (field, attrName, weight, mismatchPenalty = 0) => {\n      const wanted = String(locator?.[field] || '');\n      if (!wanted) return;\n      const actual = String(attrName === 'id' ? candidate.id || '' : candidate.getAttribute?.(attrName) || '');\n      if (actual === wanted) score += weight;\n      else score -= mismatchPenalty;\n    };\n\n    exactAttribute('id', 'id', 36, 10);\n""",
    """    const exactAttribute = (field, attrName, weight, mismatchPenalty = 0) => {\n      const wanted = String(locator?.[field] || '');\n      if (!wanted) return;\n      const actual = String(attrName === 'id' ? candidate.id || '' : candidate.getAttribute?.(attrName) || '');\n      if (actual === wanted) score += weight;\n      else score -= mismatchPenalty;\n    };\n    const exactLocatorUrlAttribute = (field, keyField, attrName, weight, mismatchPenalty = 0) => {\n      const wantedKey = String(locator?.[keyField] || '');\n      const wantedSafe = String(locator?.[field] || '');\n      if (!wantedKey && !wantedSafe) return;\n      const actualRaw = String(candidate.getAttribute?.(attrName) || '');\n      const matched = wantedKey\n        ? durableUrlPolicy.locatorUrlKey(actualRaw) === wantedKey\n        : durableUrlPolicy.sanitizeLocatorUrl(actualRaw) === wantedSafe;\n      if (matched) score += weight;\n      else score -= mismatchPenalty;\n    };\n\n    exactAttribute('id', 'id', 36, 10);\n""",
    'v3 locator URL matcher'
)
c = replace_once(c, "    exactAttribute('src', 'src', 10, 2);", "    exactLocatorUrlAttribute('src', 'srcKey', 'src', 10, 2);", 'v3 src match')
c = replace_once(c, "    exactAttribute('href', 'href', 14, 3);", "    exactLocatorUrlAttribute('href', 'hrefKey', 'href', 14, 3);", 'v3 href match')
save('content.js', c)

# Journal page loads policy and uses opaque exact keys for grouping while displaying only safe URL.
h = load('journal.html')
h = replace_once(
    h,
    '  <script src="public-suffix.js"></script>\n  <script src="journal-text-filter.js"></script>',
    '  <script src="public-suffix.js"></script>\n  <script src="durable-url-policy.js"></script>\n  <script src="journal-text-filter.js"></script>',
    'journal helper script'
)
save('journal.html', h)

j = load('journal.js')
j = replace_once(j, 'const JOURNAL_DB_VERSION = 7;', 'const JOURNAL_DB_VERSION = 8;', 'journal page db version')
j = replace_once(
    j,
    """function applySourceContextToUi() {\n  const hasSourceContext = /^https?:\\/\\//i.test(sourceUrl);\n  sourceUrlEl.textContent = sourceUrl || (mode === 'all' ? 'контекст страницы не задан' : 'не определён');\n""",
    """function applySourceContextToUi() {\n  const hasSourceContext = /^https?:\\/\\//i.test(sourceUrl);\n  const safeSourceUrl = WebClipDurableUrlPolicy.sanitizeHttpUrl(sourceUrl);\n  sourceUrlEl.textContent = safeSourceUrl || (mode === 'all' ? 'контекст страницы не задан' : 'не определён');\n""",
    'journal source display'
)
j = replace_once(
    j,
    """function normalizeUrl(url) {\n  try {\n    const parsed = new URL(url);\n    parsed.hash = '';\n    return parsed.toString();\n  } catch (_) {\n    return String(url || '').split('#')[0];\n  }\n}\n""",
    """function normalizeUrl(url) {\n  return WebClipDurableUrlPolicy.exactHttpUrlKey(url);\n}\n""",
    'journal exact key'
)
j = replace_once(
    j,
    """      if (!db.objectStoreNames.contains('importStaging')) {\n        const importStore = db.createObjectStore('importStaging', { keyPath: 'key' });\n        importStore.createIndex('importId', 'importId', { unique: false });\n        importStore.createIndex('createdAt', 'createdAt', { unique: false });\n      } else {\n        const importStore = request.transaction.objectStore('importStaging');\n        if (!importStore.indexNames.contains('importId')) importStore.createIndex('importId', 'importId', { unique: false });\n        if (!importStore.indexNames.contains('createdAt')) importStore.createIndex('createdAt', 'createdAt', { unique: false });\n      }\n    };\n""",
    """      if (!db.objectStoreNames.contains('importStaging')) {\n        const importStore = db.createObjectStore('importStaging', { keyPath: 'key' });\n        importStore.createIndex('importId', 'importId', { unique: false });\n        importStore.createIndex('createdAt', 'createdAt', { unique: false });\n      } else {\n        const importStore = request.transaction.objectStore('importStaging');\n        if (!importStore.indexNames.contains('importId')) importStore.createIndex('importId', 'importId', { unique: false });\n        if (!importStore.indexNames.contains('createdAt')) importStore.createIndex('createdAt', 'createdAt', { unique: false });\n      }\n      WebClipDurableUrlPolicy.migrateJournalDbV8(db, request.transaction, request.oldVersion || 0);\n    };\n""",
    'journal page migration'
)
j = replace_once(
    j,
    """function journalEntryViewSummary(entry = {}) {\n  const url = String(entry.url || '').slice(0, 8192);\n""",
    """function journalEntryViewSummary(entry = {}) {\n  const url = WebClipDurableUrlPolicy.sanitizeHttpUrl(entry.url || '').slice(0, 8192);\n""",
    'journal view safe URL'
)
j = replace_once(
    j,
    """    urlKey: String(entry.urlKey || normalizeUrl(url)).slice(0, 8192),\n""",
    """    urlKey: String(WebClipDurableUrlPolicy.isExactHttpUrlKey(entry.urlKey) ? entry.urlKey : normalizeUrl(entry.url || '')).slice(0, 8192),\n""",
    'journal view exact key'
)
# Direct-view compatibility paths should prefer the durable opaque key stored on the entry.
j = j.replace('normalizeUrl(entry.url) === normalizeUrl(sourceUrl)', "String(entry.urlKey || normalizeUrl(entry.url)) === normalizeUrl(sourceUrl)")
j = j.replace('normalizeUrl(entry.url || \'\') === normalizeUrl(sourceUrl)', "String(entry.urlKey || normalizeUrl(entry.url || '')) === normalizeUrl(sourceUrl)")
save('journal.js', j)

# Revalidate injection-order regression contracts without weakening their owner assertions.
for name in [
    'project_tools/test_p0_064_frame_proxy_budget.js',
    'project_tools/test_p0_068_inert_frame_proxy.js',
    'project_tools/test_p0_067_host_control_activation_guard.js',
]:
    t = load(name)
    t = t.replace("'host-control-activation-guard.js', 'content.js'", "'host-control-activation-guard.js', 'durable-url-policy.js', 'content.js'")
    t = t.replace("'frame-proxy-inert-guard.js', 'content.js'", "'frame-proxy-inert-guard.js', 'host-control-activation-guard.js', 'durable-url-policy.js', 'content.js'")
    t = t.replace("'frame-proxy-budget-guard.js', 'frame-proxy-inert-guard.js', 'content.js'", "'frame-proxy-budget-guard.js', 'frame-proxy-inert-guard.js', 'host-control-activation-guard.js', 'durable-url-policy.js', 'content.js'")
    # Regex source assertions in these tests use escaped dots and optional whitespace.
    t = t.replace("'host-control-activation-guard\\.js',\\s*'content\\.js'", "'host-control-activation-guard\\.js',\\s*'durable-url-policy\\.js',\\s*'content\\.js'")
    t = t.replace("'frame-proxy-inert-guard\\.js',\\s*'content\\.js'", "'frame-proxy-inert-guard\\.js',\\s*'host-control-activation-guard\\.js',\\s*'durable-url-policy\\.js',\\s*'content\\.js'")
    save(name, t)

print('P0-066 runtime patch applied')
