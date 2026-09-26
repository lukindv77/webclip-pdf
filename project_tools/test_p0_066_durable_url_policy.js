'use strict';

// Owner marker for PR contract: P0-066

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const content = fs.readFileSync(path.join(root, 'content.js'), 'utf8');

let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }
function eq(actual, expected, message) { assert.strictEqual(actual, expected, message); checks += 1; }
function section(source, start, end) {
  const i = source.indexOf(start);
  const j = source.indexOf(end, i + start.length);
  assert.ok(i >= 0 && j > i, `missing source section: ${start} -> ${end}`);
  return source.slice(i, j + end.length);
}
const dedent = (text) => text.split('\n').map((line) => line.trimStart()).join('\n');

// One policy: the worker (authoritative) and content (PDF header) blocks are identical.
const BEGIN = '// >>> P0-066 durable URL policy v1';
const END = '// <<< P0-066 durable URL policy v1';
const swPolicy = section(sw, BEGIN, END);
const contentPolicy = section(content, BEGIN, END);
eq(dedent(contentPolicy), dedent(swPolicy), 'content.js and service-worker.js share one byte-identical URL policy');
eq(sw.split(BEGIN).length, 2, 'worker defines the policy exactly once');
eq(content.split(BEGIN).length, 2, 'content defines the policy exactly once');

const policy = vm.runInNewContext(`${swPolicy}\n({ webclipSanitizeDurableHttpUrl, webclipIsSensitiveUrlParamName })`, { URL });
const clean = policy.webclipSanitizeDurableHttpUrl;

// Credentials, fragments and credential-like query values never persist.
const leaked = clean('https://alice:supersecret@example.com/report?lang=en&access_token=TOPSECRET#section');
ok(!leaked.includes('alice') && !leaked.includes('supersecret'), 'userinfo removed');
ok(!leaked.includes('TOPSECRET'), 'access_token value redacted');
ok(leaked.includes('lang=en'), 'benign query preserved');
ok(leaked.includes('access_token=%5BREDACTED%5D'), 'explicit redaction marker kept');
ok(!leaked.includes('#section'), 'fragment removed');

for (const [name, value] of [
  ['token', 'T1'], ['session', 'S1'], ['sid', 'S2'], ['sig', 'G1'], ['signature', 'G2'], ['api_key', 'K1'],
  ['apiKey', 'K2'], ['authToken', 'A1'], ['refresh-token', 'R1'], ['code', 'C1'], ['password', 'P1'],
  ['X-Amz-Signature', 'Z1'], ['X-Amz-Credential', 'Z2'], ['X-Amz-Security-Token', 'Z3'], ['client_secret', 'Q1'], ['jwt', 'J1']
]) {
  const out = clean(`https://example.com/p?keep=1&${encodeURIComponent(name)}=${value}`);
  ok(!out.includes(`=${value}`), `${name} value redacted`);
  ok(out.includes('keep=1'), `${name}: benign parameter kept`);
}
for (const name of ['page', 'q', 'sort', 'id', 'lang', 'passport', 'keyboard', 'tokens_view']) {
  ok(!policy.webclipIsSensitiveUrlParamName(name), `${name} is benign`);
}

// No redaction needed => exact previous serialization (urlKey stability for existing rows).
for (const benign of [
  'https://example.com/a?q=hello%20world&page=2',
  'https://example.com/a?q=a+b&x=~y',
  'http://example.com/',
  'https://example.com/path/%D1%82%D0%B5%D1%81%D1%82'
]) {
  eq(clean(benign), new URL(benign).toString(), `no-op serialization preserved: ${benign}`);
}
eq(clean('https://example.com/a?q=1#frag'), 'https://example.com/a?q=1', 'benign URL only loses fragment');

// Idempotent across export/import cycles.
const once = clean('https://u:p@example.com/x?token=abc&page=3');
eq(clean(once), once, 'sanitizer is idempotent');

// Fail closed.
for (const bad of ['', 'not a url', 'javascript:alert(1)', 'data:text/html,hi', 'blob:https://example.com/x', 'file:///etc/passwd', 'chrome://settings']) {
  eq(clean(bad), '', `non-durable/unparsable value rejected: ${bad}`);
}

// Worker boundaries consume the policy.
const saveMeta = section(sw, 'function sanitizeContentSaveMeta(', 'function journalEntryForContentTemplate(');
ok(saveMeta.includes('url: webclipSanitizeDurableHttpUrl(parsed.toString())'), 'content save admission sanitizes the trusted tab URL');
const journalUrl = section(sw, 'function normalizeJournalUrl(', '\n}');
ok(journalUrl.includes('return webclipSanitizeDurableHttpUrl(url);'), 'urlKey derivation uses the central policy');
ok(!journalUrl.includes(".split('#')[0]"), 'no raw-string fallback for unparsable urlKey');
const imported = section(sw, 'function normalizeImportedHttpUrl(', 'function assertJournalCommentBudget(');
ok(imported.includes('return webclipSanitizeDurableHttpUrl(raw);'), 'imported source URL uses the central policy');
ok(imported.includes('return normalizeYandexPublicCapabilityUrl(raw);'), 'imported publicUrl uses the public-capability policy');
const batch = section(sw, 'async function readJournalEntryBatch(', 'cursor.continue();');
ok(batch.includes('sanitizePortableJournalEntryUrls(portableEntry)'), 'export/backup serialize sanitized legacy rows');
const openUrl = section(sw, 'function isAllowedContentOpenUrl(', '\n}');
ok(openUrl.includes('if (url.username || url.password) return false;'), 'public/open URL rejects userinfo');

// Public capability + portable entry behaviour.
const capability = vm.runInNewContext(
  `${swPolicy}\n${openUrl}\n${section(sw, 'function normalizeYandexPublicCapabilityUrl(', '\n}')}\n`
  + `${journalUrl}\n${section(sw, 'function sanitizePortableJournalEntryUrls(', '\n}')}\n`
  + '({ normalizeYandexPublicCapabilityUrl, sanitizePortableJournalEntryUrls })',
  { URL }
);
eq(capability.normalizeYandexPublicCapabilityUrl('https://disk.yandex.ru/d/abc?src=webclip#x'), 'https://disk.yandex.ru/d/abc?src=webclip', 'public link keeps share query, loses fragment');
eq(capability.normalizeYandexPublicCapabilityUrl('https://yadi.sk/d/abc'), 'https://yadi.sk/d/abc', 'yadi.sk public link accepted');
eq(capability.normalizeYandexPublicCapabilityUrl('https://user:pw@disk.yandex.ru/d/abc'), '', 'public link with userinfo rejected');
eq(capability.normalizeYandexPublicCapabilityUrl('https://evil.example/d/abc'), '', 'non-Yandex public link rejected');
eq(capability.normalizeYandexPublicCapabilityUrl('http://disk.yandex.ru/d/abc'), '', 'non-HTTPS public link rejected');

const legacy = {
  id: 'e1',
  url: 'https://bob:pw@example.com/doc?session=SESSIONSECRET&page=2#p',
  urlKey: 'https://bob:pw@example.com/doc?session=SESSIONSECRET&page=2',
  publicUrl: 'https://disk.yandex.ru/d/pub',
  title: 'T'
};
const portable = capability.sanitizePortableJournalEntryUrls(legacy);
ok(!JSON.stringify(portable).includes('SESSIONSECRET'), 'portable legacy row carries no session secret');
ok(!JSON.stringify(portable).includes('bob:pw'), 'portable legacy row carries no credentials');
ok(portable.url.includes('page=2') && portable.urlKey === portable.url, 'portable url and urlKey agree and keep benign query');
eq(portable.publicUrl, 'https://disk.yandex.ru/d/pub', 'valid public link survives export');
eq(legacy.url.includes('SESSIONSECRET'), true, 'local legacy row is not mutated by export serialization');

// PDF header gets the sanitized URL from content-side save meta.
const buildMeta = section(content, 'function buildSaveMeta(', 'selectionSnapshot: serializeSelectionSnapshot()');
ok(buildMeta.includes('url: webclipSanitizeDurableHttpUrl(location.href) || location.origin'), 'PDF header URL is sanitized at the source');
ok(!buildMeta.includes('url: location.href'), 'raw location.href no longer enters save meta');
// Journal template "same page" detection compares sanitized with sanitized.
ok(content.includes('const currentDurableUrl = webclipSanitizeDurableHttpUrl(location.href);'), 'template compares against sanitized current URL');
ok(!content.includes('entry.url !== location.href'), 'no raw location.href comparison against sanitized entry URLs');

console.log(`P0-066 durable URL policy: PASS (${checks} checks)`);
