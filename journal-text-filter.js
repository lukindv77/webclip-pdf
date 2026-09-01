(() => {
  'use strict';

  const MAX_ROWS = 8;
  const MAX_QUERY_CHARS = 512;
  const MATCH_CHUNK_CHARS = 8192;
  const FIELD_NAMES = Object.freeze(['title', 'comments', 'site', 'url']);

  function normalizeNeedle(value) {
    return String(value || '').trim().slice(0, MAX_QUERY_CHARS).toLocaleLowerCase('ru-RU');
  }

  function normalize(input) {
    const source = input && typeof input === 'object' ? input : {};
    const logic = source.logic === 'or' ? 'or' : 'and';
    const rows = [];
    for (const raw of (Array.isArray(source.rows) ? source.rows : []).slice(0, MAX_ROWS)) {
      if (!raw || typeof raw !== 'object') continue;
      const text = String(raw.text || '').trim().slice(0, MAX_QUERY_CHARS);
      if (!text) continue;
      const rawFields = raw.fields && typeof raw.fields === 'object' ? raw.fields : {};
      const fields = {
        title: Boolean(rawFields.title),
        comments: Boolean(rawFields.comments),
        site: Boolean(rawFields.site),
        url: Boolean(rawFields.url)
      };
      if (!FIELD_NAMES.some((name) => fields[name])) fields.title = true;
      rows.push({ text, needle: normalizeNeedle(text), fields });
    }
    return { logic, rows };
  }

  function contains(value, needle) {
    const source = String(value || '');
    if (!source || !needle) return false;
    const overlap = Math.min(MAX_QUERY_CHARS, Math.max(0, needle.length - 1));
    for (let offset = 0; offset < source.length; offset += MATCH_CHUNK_CHARS) {
      const start = Math.max(0, offset - overlap);
      const end = Math.min(source.length, offset + MATCH_CHUNK_CHARS);
      if (source.slice(start, end).toLocaleLowerCase('ru-RU').includes(needle)) return true;
    }
    return false;
  }

  function commentsContain(entry, needle) {
    if (contains(entry?.fileComment, needle) || contains(entry?.journalComment, needle)) return true;
    const comments = Array.isArray(entry?.journalComments) ? entry.journalComments : [];
    for (const item of comments) {
      if (contains(item?.text ?? item?.comment ?? '', needle)) return true;
    }
    return false;
  }

  function siteValues(entry) {
    const values = [];
    const push = (value) => {
      const text = String(value || '');
      if (text && !values.includes(text)) values.push(text);
    };
    push(entry?.hostname);
    const rawUrl = String(entry?.url || '');
    if (rawUrl) {
      try { push(new URL(rawUrl).hostname); } catch (_) {}
    }
    try {
      const info = globalThis.WebClipPublicSuffix?.hierarchy?.(rawUrl || entry?.hostname || '');
      push(info?.host); push(info?.base); push(info?.third); push(info?.publicSuffix);
    } catch (_) {}
    return values;
  }

  function rowMatches(entry, row) {
    const needle = row?.needle || normalizeNeedle(row?.text);
    if (!needle) return true;
    const fields = row?.fields || {};
    if (fields.title && contains(entry?.title, needle)) return true;
    if (fields.comments && commentsContain(entry, needle)) return true;
    if (fields.site && siteValues(entry).some((value) => contains(value, needle))) return true;
    if (fields.url && (contains(entry?.url, needle) || contains(entry?.urlKey, needle))) return true;
    return false;
  }

  function matches(entry, input) {
    const filter = input && Array.isArray(input.rows) && input.rows.every((row) => typeof row?.needle === 'string')
      ? input
      : normalize(input);
    if (!filter.rows.length) return true;
    if (filter.logic === 'or') return filter.rows.some((row) => rowMatches(entry, row));
    return filter.rows.every((row) => rowMatches(entry, row));
  }

  globalThis.WebClipJournalTextFilter = Object.freeze({
    MAX_ROWS,
    MAX_QUERY_CHARS,
    FIELD_NAMES,
    normalize,
    matches
  });
})();

(() => {
  'use strict';

  // P0-077: one versioned envelope is the maximum promise made by a
  // self-generated full Journal backup and by same-version restore paths.
  const MIB = 1024 * 1024;
  const VERSION = 1;
  const MAX_BYTES = 50 * MIB;
  const MAX_TOTAL_CHARS = 50 * MIB;
  const MAX_ENTRIES = 100000;
  const MAX_ENTRY_CHARS = 8 * MIB;

  function error(code, message) {
    const value = new Error(message);
    value.code = code;
    return value;
  }

  function assertEntryChars(value) {
    const chars = Math.max(0, Math.floor(Number(value) || 0));
    if (chars > MAX_ENTRY_CHARS) {
      throw error('JOURNAL_RESTORE_ENTRY_TOO_LARGE', 'Одна запись журнала превышает restore-envelope текущей версии.');
    }
    return chars;
  }

  function assertExportReceipt(receipt = {}) {
    const totalBytes = Math.max(0, Math.floor(Number(receipt.totalBytes) || 0));
    const totalChars = Math.max(0, Math.floor(Number(receipt.totalChars) || 0));
    const entryCount = Math.max(0, Math.floor(Number(receipt.entryCount) || 0));
    if (totalBytes > MAX_BYTES) {
      throw error('JOURNAL_EXPORT_RESTORE_BYTES_LIMIT', 'Сформированная резервная копия превышает byte-limit same-version restore envelope.');
    }
    if (totalChars > MAX_TOTAL_CHARS) {
      throw error('JOURNAL_EXPORT_RESTORE_CHARS_LIMIT', 'Сформированная резервная копия превышает char-limit same-version restore envelope.');
    }
    if (entryCount > MAX_ENTRIES) {
      throw error('JOURNAL_EXPORT_RESTORE_ENTRY_COUNT_LIMIT', 'Сформированная резервная копия содержит больше записей, чем same-version restore envelope.');
    }
    return Object.freeze({ totalBytes, totalChars, entryCount });
  }

  function clampImportOptions(options = {}) {
    const source = options && typeof options === 'object' ? options : {};
    const bounded = (value, maximum) => {
      const numeric = Math.floor(Number(value) || 0);
      return numeric > 0 ? Math.min(numeric, maximum) : maximum;
    };
    return {
      ...source,
      maxTotalChars: bounded(source.maxTotalChars, MAX_TOTAL_CHARS),
      maxEntryChars: bounded(source.maxEntryChars, MAX_ENTRY_CHARS),
      maxEntries: bounded(source.maxEntries, MAX_ENTRIES)
    };
  }

  globalThis.WebClipJournalRestoreEnvelope = Object.freeze({
    VERSION,
    MAX_BYTES,
    MAX_TOTAL_CHARS,
    MAX_ENTRIES,
    MAX_ENTRY_CHARS,
    assertEntryChars,
    assertExportReceipt,
    clampImportOptions
  });
})();

// service-worker.js imports this shared helper synchronously. Keep worker-only
// security bootstraps here so extension pages using the journal filter remain
// unchanged while guards are installed before ordinary worker code runs.
if (typeof importScripts === 'function' && typeof document === 'undefined') {
  importScripts('pdf-print-guard.js', 'content-injection-guard.js', 'operation-log-redaction-guard.js', 'journal-restore-envelope-guard.js');
}
