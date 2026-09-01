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

// service-worker.js already imports this shared helper synchronously. Keep the
// security bootstrap worker-only so journal.html remains unchanged while the
// PDF guard is installed before any Page.printToPDF path can run.
if (typeof importScripts === 'function' && typeof document === 'undefined') {
  importScripts('pdf-print-guard.js');
}
