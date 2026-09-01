'use strict';

(() => {
  const DEFAULT_FALLBACK_MAX_AGE_MS = 10 * 60 * 1000;

  function normalizeFilename(value) {
    return String(value || '').replace(/\\/g, '/').split('/').pop() || '';
  }

  function normalizeExpectedBytes(value) {
    return Math.max(0, Math.floor(Number(value) || 0));
  }

  function intentAgeMs(intent, now = Date.now()) {
    return Math.max(0, Number(now || 0) - Number(intent?.createdAt || intent?.updatedAt || 0));
  }

  function matchesExactBlobUrl(download, intent) {
    const expectedBlobUrl = String(intent?.blobUrl || '');
    if (!expectedBlobUrl) return false;
    return String(download?.url || '') === expectedBlobUrl || String(download?.finalUrl || '') === expectedBlobUrl;
  }

  function matchesFallback(download, intent, now = Date.now(), maxAgeMs = DEFAULT_FALLBACK_MAX_AGE_MS) {
    const expectedFilename = normalizeFilename(intent?.data?.filename || '');
    const expectedBytes = normalizeExpectedBytes(intent?.expectedBytes);
    if (!expectedFilename || !expectedBytes) return false;
    if (intentAgeMs(intent, now) > Math.max(0, Number(maxAgeMs) || 0)) return false;
    const filename = normalizeFilename(download?.filename || '');
    const candidateBytes = Math.max(0, Number(download?.fileSize || 0), Number(download?.totalBytes || 0));
    return filename === expectedFilename && candidateBytes > 0 && candidateBytes === expectedBytes;
  }

  function intentKey(intent) {
    return String(intent?.downloadId || '');
  }

  function chooseUniqueDownloadForIntent({ intent, downloads = [], allIntents = [], now = Date.now(), maxAgeMs = DEFAULT_FALLBACK_MAX_AGE_MS } = {}) {
    const candidates = Array.isArray(downloads) ? downloads.filter(Boolean) : [];
    const exact = candidates.filter((candidate) => matchesExactBlobUrl(candidate, intent));
    if (exact.length === 1) return { download: exact[0], mode: 'blob-url' };
    if (exact.length > 1) return { download: null, mode: 'ambiguous-exact' };

    const fallbackCandidates = candidates.filter((candidate) => matchesFallback(candidate, intent, now, maxAgeMs));
    if (fallbackCandidates.length !== 1) {
      return { download: null, mode: fallbackCandidates.length > 1 ? 'ambiguous-download' : 'none' };
    }

    const candidate = fallbackCandidates[0];
    const contenders = (Array.isArray(allIntents) ? allIntents : []).filter((other) =>
      other && String(other?.kind || '') !== 'unknown' && matchesFallback(candidate, other, now, maxAgeMs));
    const currentKey = intentKey(intent);
    const distinct = new Set(contenders.map(intentKey).filter(Boolean));
    if (!currentKey || !distinct.has(currentKey) || distinct.size !== 1) {
      return { download: null, mode: 'ambiguous-intent' };
    }
    return { download: candidate, mode: 'fallback-unique' };
  }

  globalThis.WebClipLocalDownloadIdentity = Object.freeze({
    DEFAULT_FALLBACK_MAX_AGE_MS,
    normalizeFilename,
    matchesExactBlobUrl,
    matchesFallback,
    chooseUniqueDownloadForIntent
  });
})();
