'use strict';

const assert = require('node:assert/strict');

let checks = 0;
function check(condition, message) {
  assert.ok(condition, message);
  checks += 1;
}
function eq(actual, expected, message) {
  assert.equal(actual, expected, message);
  checks += 1;
}

function currentNormalizeJournalUrl(value) {
  try {
    const parsed = new URL(String(value || ''));
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return String(value || '').split('#')[0];
  }
}

function currentNormalizeImportedHttpUrl(value) {
  const raw = String(value || '').slice(0, 8192).trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

function currentNormalizeImportedHttpsUrl(value) {
  const raw = String(value || '').slice(0, 8192).trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function currentLocatorValue(value) {
  return String(value || '').slice(0, 2000);
}

function currentNormalizeYandexPublicUrl(value) {
  const raw = String(value || '').trim();
  let url;
  try { url = new URL(raw); } catch { return ''; }
  const host = url.hostname.toLowerCase();
  const allowed =
    host === 'disk.yandex.ru' ||
    host.endsWith('.disk.yandex.ru') ||
    host === 'yadi.sk';
  return url.protocol === 'https:' && allowed ? url.toString() : '';
}

const SENSITIVE_QUERY_NAME =
  /(?:^|[_-])(token|auth|authorization|key|api[_-]?key|secret|signature|sig|session|sid|jwt|code|credential|password|passwd|pass|access[_-]?token|refresh[_-]?token)(?:$|[_-])/i;

function redactSensitiveQuery(url) {
  const entries = [...url.searchParams.entries()];
  url.search = '';
  for (const [name, value] of entries) {
    url.searchParams.append(name, SENSITIVE_QUERY_NAME.test(name) ? '[REDACTED]' : value);
  }
}

function sanitizeAbsoluteHttp(value, { keepSafeQuery = true } = {}) {
  let url;
  try { url = new URL(String(value || '').trim()); } catch { return ''; }
  if (!['http:', 'https:'].includes(url.protocol)) return '';
  url.username = '';
  url.password = '';
  url.hash = '';
  if (keepSafeQuery) redactSensitiveQuery(url);
  else url.search = '';
  return url.toString();
}

function sanitizeLocatorUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^data:/i.test(raw)) return '[data-url]';
  if (/^blob:/i.test(raw)) return '[blob-url]';
  if (/^javascript:/i.test(raw)) return '[javascript-url]';
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
    return sanitizeAbsoluteHttp(raw, { keepSafeQuery: true }) || '[non-durable-url]';
  }
  const hashIndex = raw.indexOf('#');
  const noHash = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw;
  const [path, query = ''] = noHash.split('?', 2);
  if (!query) return path.slice(0, 2000);
  const params = new URLSearchParams(query);
  const safe = new URLSearchParams();
  for (const [name, value] of params.entries()) {
    safe.append(name, SENSITIVE_QUERY_NAME.test(name) ? '[REDACTED]' : value);
  }
  const suffix = safe.toString();
  return `${path}${suffix ? `?${suffix}` : ''}`.slice(0, 2000);
}

function sanitizeYandexPublicCapability(value) {
  let url;
  try { url = new URL(String(value || '').trim()); } catch { return ''; }
  const host = url.hostname.toLowerCase();
  const allowed =
    host === 'disk.yandex.ru' ||
    host.endsWith('.disk.yandex.ru') ||
    host === 'yadi.sk';
  if (url.protocol !== 'https:' || !allowed) return '';
  if (url.username || url.password) return '';
  url.hash = '';
  return url.toString();
}

function durableUrlSanitizer(value, kind) {
  switch (kind) {
    case 'source':
    case 'journal':
    case 'import-source':
    case 'site-address':
      return sanitizeAbsoluteHttp(value, { keepSafeQuery: true });
    case 'locator':
      return sanitizeLocatorUrl(value);
    case 'public-capability':
      return sanitizeYandexPublicCapability(value);
    default:
      return '';
  }
}

// Current failure: source Journal URL keeps userinfo and sensitive query.
{
  const raw = 'https://alice:supersecret@example.com/report?lang=en&access_token=TOPSECRET#section';
  const current = currentNormalizeJournalUrl(raw);
  check(current.includes('alice:supersecret@'), 'current Journal URL keeps userinfo');
  check(current.includes('access_token=TOPSECRET'), 'current Journal URL keeps sensitive query');
  check(!current.includes('#section'), 'current Journal URL already strips fragment');

  const safe = durableUrlSanitizer(raw, 'journal');
  check(!safe.includes('alice'), 'candidate strips username');
  check(!safe.includes('supersecret'), 'candidate strips password');
  check(!safe.includes('TOPSECRET'), 'candidate redacts sensitive query value');
  check(safe.includes('lang=en'), 'candidate preserves non-sensitive query semantics');
  check(safe.includes('access_token=%5BREDACTED%5D'), 'candidate leaves explicit redaction marker');
  check(!safe.includes('#section'), 'candidate strips fragment');
}

// Current failure: imported source URL has same defect.
{
  const raw = 'http://bob:pw@example.test/article?session=SESSIONSECRET&page=2#frag';
  const current = currentNormalizeImportedHttpUrl(raw);
  check(current.includes('bob:pw@'), 'import source keeps userinfo');
  check(current.includes('session=SESSIONSECRET'), 'import source keeps sensitive query');
  const safe = durableUrlSanitizer(raw, 'import-source');
  check(!safe.includes('bob'), 'import candidate strips userinfo');
  check(!safe.includes('SESSIONSECRET'), 'import candidate redacts sensitive query');
  check(safe.includes('page=2'), 'import candidate preserves benign query');
}

// Current failure: imported public URL accepts any HTTPS origin and credentials.
{
  const arbitrary = 'https://user:pw@attacker.example/share?token=SECRET';
  check(Boolean(currentNormalizeImportedHttpsUrl(arbitrary)), 'current imported public URL accepts arbitrary HTTPS origin');
  eq(durableUrlSanitizer(arbitrary, 'public-capability'), '', 'public capability rejects non-Yandex host');

  const yandexWithUserinfo = 'https://user:pw@disk.yandex.ru/d/abc?x=1#frag';
  check(Boolean(currentNormalizeYandexPublicUrl(yandexWithUserinfo)), 'current Yandex public URL accepts userinfo');
  eq(durableUrlSanitizer(yandexWithUserinfo, 'public-capability'), '', 'public capability rejects userinfo');
}

// Explicit public capability semantics: exact share path/query may remain when validated.
{
  const publicUrl = 'https://disk.yandex.ru/d/AbCdEf?source=webclip#client-fragment';
  const safe = durableUrlSanitizer(publicUrl, 'public-capability');
  check(safe.startsWith('https://disk.yandex.ru/d/AbCdEf'), 'validated Yandex public capability preserved');
  check(safe.includes('source=webclip'), 'public capability query preserved because it is intentional share identity');
  check(!safe.includes('#client-fragment'), 'public capability fragment stripped');
}

// Current failure: locator URLs are merely truncated.
{
  const href = 'https://cdn.example/file?X-Amz-Signature=ABC&token=LOCATORSECRET#frag';
  const current = currentLocatorValue(href);
  check(current.includes('LOCATORSECRET'), 'current locator keeps token');
  check(current.includes('X-Amz-Signature=ABC'), 'current locator keeps signature');
  const safe = durableUrlSanitizer(href, 'locator');
  check(!safe.includes('LOCATORSECRET'), 'locator candidate removes token value');
  check(!safe.includes('ABC'), 'locator candidate removes signature value');
  check(!safe.includes('#frag'), 'locator candidate strips fragment');
}

// Non-durable/unsafe locator schemes become opaque labels.
{
  eq(currentLocatorValue('data:text/plain,SECRET'), 'data:text/plain,SECRET', 'current locator keeps data URL payload');
  eq(currentLocatorValue('blob:https://example.com/uuid-secret'), 'blob:https://example.com/uuid-secret', 'current locator keeps blob URL');
  eq(currentLocatorValue('javascript:alert(document.cookie)'), 'javascript:alert(document.cookie)', 'current locator keeps javascript URL');

  eq(durableUrlSanitizer('data:text/plain,SECRET', 'locator'), '[data-url]', 'candidate labels data URL');
  eq(durableUrlSanitizer('blob:https://example.com/uuid-secret', 'locator'), '[blob-url]', 'candidate labels blob URL');
  eq(durableUrlSanitizer('javascript:alert(document.cookie)', 'locator'), '[javascript-url]', 'candidate labels javascript URL');
}

// Relative locators remain useful without persisting a sensitive query value.
{
  const safe = durableUrlSanitizer('/article?id=42&token=RELATIVESECRET#part', 'locator');
  check(safe.startsWith('/article?'), 'relative locator path preserved');
  check(safe.includes('id=42'), 'relative locator benign query preserved');
  check(!safe.includes('RELATIVESECRET'), 'relative locator token redacted');
  check(!safe.includes('#part'), 'relative locator fragment stripped');
}

// Scheme gate for durable page/source fields.
{
  eq(durableUrlSanitizer('data:text/html,secret', 'source'), '', 'source rejects data scheme');
  eq(durableUrlSanitizer('blob:https://example.com/id', 'source'), '', 'source rejects blob scheme');
  eq(durableUrlSanitizer('file:///tmp/private.pdf', 'source'), '', 'source rejects file scheme');
  eq(durableUrlSanitizer('chrome-extension://abc/page.html', 'source'), '', 'source rejects extension scheme');
  check(durableUrlSanitizer('https://example.com/a?view=compact', 'source').includes('view=compact'), 'source accepts normal HTTPS URL');
}

// A single policy function must be used by all durable/display sinks.
{
  const raw = 'https://u:p@example.com/a?auth=SECRET&q=ok#f';
  const journal = durableUrlSanitizer(raw, 'journal');
  const imported = durableUrlSanitizer(raw, 'import-source');
  const site = durableUrlSanitizer(raw, 'site-address');
  eq(journal, imported, 'Journal and import source use same sanitizer semantics');
  eq(imported, site, 'siteAddress uses same sanitizer semantics');
  check(!journal.includes('SECRET'), 'central policy removes secret everywhere');
  check(!journal.includes('u:p@'), 'central policy removes credentials everywhere');
}

// Sanitization is idempotent; re-import/export must not change semantics repeatedly.
{
  const raw = 'https://alice:pw@example.com/a?token=SECRET&lang=ru#frag';
  const once = durableUrlSanitizer(raw, 'journal');
  const twice = durableUrlSanitizer(once, 'journal');
  eq(twice, once, 'source sanitizer idempotent');

  const loc = durableUrlSanitizer('/a?sig=SECRET&n=1#frag', 'locator');
  eq(durableUrlSanitizer(loc, 'locator'), loc, 'locator sanitizer idempotent');
}

// Positive controls: safe URL identity remains usable.
{
  eq(
    durableUrlSanitizer('https://example.com/path/to/article?lang=ru&page=2', 'source'),
    'https://example.com/path/to/article?lang=ru&page=2',
    'safe source URL preserved'
  );
  eq(
    durableUrlSanitizer('/images/photo.jpg?width=1200', 'locator'),
    '/images/photo.jpg?width=1200',
    'safe relative locator preserved'
  );
}

// Public capability and generic source are intentionally different classes.
{
  const publicUrl = 'https://disk.yandex.ru/d/abc?public=1';
  eq(
    durableUrlSanitizer(publicUrl, 'public-capability'),
    'https://disk.yandex.ru/d/abc?public=1',
    'validated public capability remains exact enough to open'
  );
  check(
    durableUrlSanitizer(publicUrl, 'source').startsWith('https://disk.yandex.ru/d/abc'),
    'same URL is still a valid ordinary source'
  );
}

// Unknown policy kind fails closed.
eq(durableUrlSanitizer('https://example.com/', 'unknown'), '', 'unknown sanitizer kind fails closed');

// Current normalizers are not semantically interchangeable.
{
  const raw = 'https://u:p@example.com/a?token=S#f';
  check(currentNormalizeJournalUrl(raw) !== durableUrlSanitizer(raw, 'journal'), 'candidate changes current Journal confidentiality semantics');
  check(currentNormalizeImportedHttpUrl(raw) !== durableUrlSanitizer(raw, 'import-source'), 'candidate changes current import confidentiality semantics');
}

// Requirement reconciliation control: benign query remains to preserve meaningful full URL,
// while explicitly sensitive query values are redacted.
{
  const raw = 'https://example.com/search?q=webclip&sort=date&api_key=SECRET';
  const safe = durableUrlSanitizer(raw, 'source');
  check(safe.includes('q=webclip'), 'archive URL keeps benign search meaning');
  check(safe.includes('sort=date'), 'archive URL keeps benign sorting meaning');
  check(!safe.includes('SECRET'), 'archive URL cannot persist API key');
}

console.log(`P0-066 durable URL confidentiality model: PASS ${checks} checks`);
