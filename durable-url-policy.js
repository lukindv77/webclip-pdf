(() => {
  'use strict';

  const POLICY_VERSION = 2;
  const EXACT_KEY_PREFIX = 'webclip-url-v2:';
  const LOCATOR_KEY_PREFIX = 'webclip-locator-url-v2:';
  const MAX_URL_CHARS = 8192;
  const MAX_LOCATOR_CHARS = 2000;
  const HTTP_PROTOCOLS = new Set(['http:', 'https:']);

  function text(value, limit = MAX_URL_CHARS) {
    return String(value == null ? '' : value).trim().slice(0, Math.max(0, Number(limit) || 0));
  }

  function utf8Bytes(value) {
    const input = String(value || '');
    if (typeof TextEncoder === 'function') return new TextEncoder().encode(input);
    const encoded = unescape(encodeURIComponent(input));
    const out = new Uint8Array(encoded.length);
    for (let i = 0; i < encoded.length; i += 1) out[i] = encoded.charCodeAt(i) & 0xff;
    return out;
  }

  // Small synchronous SHA-256 implementation. URL equality keys are used in
  // synchronous IndexedDB/index paths, so WebCrypto's async digest cannot be
  // the canonical primitive here.
  function sha256Hex(value) {
    const bytes = utf8Bytes(value);
    const K = [
      0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
      0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
      0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
      0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
      0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
      0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
      0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
      0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
    ];
    const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const bitLength = bytes.length * 8;
    const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
    const data = new Uint8Array(paddedLength);
    data.set(bytes);
    data[bytes.length] = 0x80;
    const view = new DataView(data.buffer);
    const high = Math.floor(bitLength / 0x100000000);
    const low = bitLength >>> 0;
    view.setUint32(paddedLength - 8, high >>> 0, false);
    view.setUint32(paddedLength - 4, low, false);
    const w = new Uint32Array(64);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let offset = 0; offset < data.length; offset += 64) {
      for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4, false);
      for (let i = 16; i < 64; i += 1) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let [a,b,c,d,e,f,g,h] = H;
      for (let i = 0; i < 64; i += 1) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0]=(H[0]+a)>>>0; H[1]=(H[1]+b)>>>0; H[2]=(H[2]+c)>>>0; H[3]=(H[3]+d)>>>0;
      H[4]=(H[4]+e)>>>0; H[5]=(H[5]+f)>>>0; H[6]=(H[6]+g)>>>0; H[7]=(H[7]+h)>>>0;
    }
    return H.map((n) => n.toString(16).padStart(8, '0')).join('');
  }

  function parseHttp(value, httpsOnly = false) {
    const raw = text(value);
    if (!raw) return null;
    let url;
    try { url = new URL(raw); } catch (_) { return null; }
    if (!HTTP_PROTOCOLS.has(url.protocol) || (httpsOnly && url.protocol !== 'https:')) return null;
    return url;
  }

  function canonicalExactHttpUrl(value, { httpsOnly = false } = {}) {
    const url = parseHttp(value, httpsOnly);
    if (!url) return '';
    url.hash = '';
    return url.toString();
  }

  function exactHttpUrlKey(value, options = {}) {
    const canonical = canonicalExactHttpUrl(value, options);
    return canonical ? `${EXACT_KEY_PREFIX}${sha256Hex(canonical)}` : '';
  }

  function isExactHttpUrlKey(value) {
    return new RegExp(`^${EXACT_KEY_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[0-9a-f]{64}$`).test(String(value || ''));
  }

  function sanitizeHttpUrl(value, { httpsOnly = false, maxChars = MAX_URL_CHARS } = {}) {
    const url = parseHttp(value, httpsOnly);
    if (!url) return '';
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return url.toString().slice(0, Math.max(0, Number(maxChars) || MAX_URL_CHARS));
  }

  function sanitizeHttpsUrl(value, options = {}) {
    return sanitizeHttpUrl(value, { ...options, httpsOnly: true });
  }

  function sanitizeSiteAddress(value) {
    const url = parseHttp(value);
    if (!url) return '';
    return url.origin.slice(0, 2048);
  }

  function locatorCanonical(value) {
    const raw = text(value, MAX_LOCATOR_CHARS);
    if (!raw) return { safe: '', exact: '' };
    if (/^\/\//.test(raw)) {
      try {
        const url = new URL(`https:${raw}`);
        const exact = `//${url.username ? `${url.username}${url.password ? `:${url.password}` : ''}@` : ''}${url.host}${url.pathname}${url.search}`;
        const safe = `//${url.host}${url.pathname}`;
        return { safe: safe.slice(0, MAX_LOCATOR_CHARS), exact: exact.slice(0, MAX_LOCATOR_CHARS) };
      } catch (_) { return { safe: '', exact: '' }; }
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
      const url = parseHttp(raw);
      if (!url) return { safe: '', exact: '' };
      url.hash = '';
      const exact = url.toString();
      url.username = '';
      url.password = '';
      url.search = '';
      url.hash = '';
      return { safe: url.toString().slice(0, MAX_LOCATOR_CHARS), exact: exact.slice(0, MAX_LOCATOR_CHARS) };
    }
    const hashAt = raw.indexOf('#');
    const noHash = hashAt >= 0 ? raw.slice(0, hashAt) : raw;
    const queryAt = noHash.indexOf('?');
    const safe = (queryAt >= 0 ? noHash.slice(0, queryAt) : noHash).trim();
    if (!safe || /^[?#]/.test(raw)) return { safe: '', exact: noHash.slice(0, MAX_LOCATOR_CHARS) };
    return { safe: safe.slice(0, MAX_LOCATOR_CHARS), exact: noHash.slice(0, MAX_LOCATOR_CHARS) };
  }

  function sanitizeLocatorUrl(value) {
    return locatorCanonical(value).safe;
  }

  function locatorUrlKey(value) {
    const exact = locatorCanonical(value).exact;
    return exact ? `${LOCATOR_KEY_PREFIX}${sha256Hex(exact)}` : '';
  }

  function isLocatorUrlKey(value) {
    return new RegExp(`^${LOCATOR_KEY_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[0-9a-f]{64}$`).test(String(value || ''));
  }

  function sanitizeSimpleLocator(locator) {
    if (!locator || typeof locator !== 'object') return locator;
    const out = { ...locator };
    const rawSrc = String(locator.src || '');
    const rawHref = String(locator.href || '');
    out.srcKey = isLocatorUrlKey(locator.srcKey) ? String(locator.srcKey) : locatorUrlKey(rawSrc);
    out.hrefKey = isLocatorUrlKey(locator.hrefKey) ? String(locator.hrefKey) : locatorUrlKey(rawHref);
    out.src = sanitizeLocatorUrl(rawSrc);
    out.href = sanitizeLocatorUrl(rawHref);
    return out;
  }

  function sanitizeSelectionSnapshotUrls(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return snapshot;
    const clean = (locator) => {
      if (!locator || typeof locator !== 'object') return locator;
      const out = sanitizeSimpleLocator(locator);
      out.framePath = Array.isArray(locator.framePath) ? locator.framePath.map(sanitizeSimpleLocator) : [];
      return out;
    };
    return {
      ...snapshot,
      includes: Array.isArray(snapshot.includes) ? snapshot.includes.map(clean) : [],
      excludes: Array.isArray(snapshot.excludes) ? snapshot.excludes.map(clean) : []
    };
  }

  function sanitizeMetaUrls(meta) {
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return meta;
    const rawUrl = String(meta.url || '');
    const out = { ...meta };
    out.urlKey = isExactHttpUrlKey(meta.urlKey) ? String(meta.urlKey) : exactHttpUrlKey(rawUrl);
    out.url = sanitizeHttpUrl(rawUrl);
    out.siteAddress = sanitizeSiteAddress(meta.siteAddress || rawUrl);
    if (meta.selectionSnapshot) out.selectionSnapshot = sanitizeSelectionSnapshotUrls(meta.selectionSnapshot);
    return out;
  }

  function sanitizeJournalEntryUrls(entry) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return entry;
    const rawUrl = String(entry.url || '');
    const out = { ...entry };
    out.urlKey = isExactHttpUrlKey(entry.urlKey) ? String(entry.urlKey) : exactHttpUrlKey(rawUrl || entry.urlKey);
    out.url = sanitizeHttpUrl(rawUrl);
    out.siteAddress = sanitizeSiteAddress(entry.siteAddress || rawUrl);
    out.publicUrl = sanitizeHttpsUrl(entry.publicUrl || '');
    if (entry.selectionSnapshot) out.selectionSnapshot = sanitizeSelectionSnapshotUrls(entry.selectionSnapshot);
    return out;
  }

  function sanitizePendingDataUrls(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
    const out = { ...data };
    out.publicUrl = sanitizeHttpsUrl(data.publicUrl || '');
    if (data.meta) out.meta = sanitizeMetaUrls(data.meta);
    if (data.selectionSnapshot) out.selectionSnapshot = sanitizeSelectionSnapshotUrls(data.selectionSnapshot);
    return out;
  }

  function sanitizeCachedPdfRecordUrls(record) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return record;
    const raw = String(record.sourceUrl || record.meta?.url || '');
    return {
      ...record,
      sourceUrlKey: isExactHttpUrlKey(record.sourceUrlKey) ? String(record.sourceUrlKey) : exactHttpUrlKey(raw),
      sourceUrl: sanitizeHttpUrl(raw),
      meta: sanitizeMetaUrls(record.meta || {})
    };
  }

  function abortMigration(tx) {
    try { tx?.abort?.(); } catch (_) {}
  }

  function migrateStoreCursor(store, mapper, tx) {
    if (!store?.openCursor) return;
    const request = store.openCursor();
    request.onerror = () => abortMigration(tx);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      try {
        const update = cursor.update(mapper(cursor.value));
        if (update && typeof update === 'object') update.onerror = () => abortMigration(tx);
        cursor.continue();
      } catch (_) {
        abortMigration(tx);
      }
    };
  }

  function migrateJournalDbV8(db, tx, oldVersion) {
    if (Number(oldVersion || 0) >= 8 || !tx) return;
    if (db.objectStoreNames.contains('entries')) migrateStoreCursor(tx.objectStore('entries'), sanitizeJournalEntryUrls, tx);
    for (const name of ['pendingAppends', 'pendingDownloads', 'pendingRemoteSaves']) {
      if (!db.objectStoreNames.contains(name)) continue;
      migrateStoreCursor(tx.objectStore(name), (value) => ({ ...value, data: sanitizePendingDataUrls(value?.data || {}) }), tx);
    }
    if (db.objectStoreNames.contains('importStaging')) {
      migrateStoreCursor(tx.objectStore('importStaging'), (value) => {
        const out = { ...value };
        if (value?.entry) out.entry = sanitizeJournalEntryUrls(value.entry);
        if (Array.isArray(value?.entries)) out.entries = value.entries.map(sanitizeJournalEntryUrls);
        return out;
      }, tx);
    }
    if (db.objectStoreNames.contains('urlStats')) {
      try {
        const clear = tx.objectStore('urlStats').clear();
        if (clear && typeof clear === 'object') clear.onerror = () => abortMigration(tx);
      } catch (_) {
        abortMigration(tx);
      }
    }
  }

  function migratePdfCacheDbV4(db, tx, oldVersion) {
    if (Number(oldVersion || 0) >= 4 || !tx) return;
    if (db.objectStoreNames.contains('pdfs')) migrateStoreCursor(tx.objectStore('pdfs'), sanitizeCachedPdfRecordUrls, tx);
    if (db.objectStoreNames.contains('meta')) migrateStoreCursor(tx.objectStore('meta'), sanitizeCachedPdfRecordUrls, tx);
  }

  globalThis.WebClipDurableUrlPolicy = Object.freeze({
    POLICY_VERSION,
    EXACT_KEY_PREFIX,
    LOCATOR_KEY_PREFIX,
    sha256Hex,
    canonicalExactHttpUrl,
    exactHttpUrlKey,
    isExactHttpUrlKey,
    sanitizeHttpUrl,
    sanitizeHttpsUrl,
    sanitizeSiteAddress,
    sanitizeLocatorUrl,
    locatorUrlKey,
    isLocatorUrlKey,
    sanitizeSimpleLocator,
    sanitizeSelectionSnapshotUrls,
    sanitizeMetaUrls,
    sanitizeJournalEntryUrls,
    sanitizePendingDataUrls,
    sanitizeCachedPdfRecordUrls,
    migrateJournalDbV8,
    migratePdfCacheDbV4
  });
})();