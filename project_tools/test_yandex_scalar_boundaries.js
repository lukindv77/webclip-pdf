const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const offscreen = fs.readFileSync(path.join(root, 'offscreen.js'), 'utf8');

function section(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Markers not found: ${startMarker} -> ${endMarker}`);
  return text.slice(start, end);
}

const context = vm.createContext({
  URL,
  String,
  Number,
  Math,
  Error,
  MAX_YANDEX_PUBLIC_URL_CHARS: 8192,
  MAX_YANDEX_SIGNED_URL_CHARS: 32 * 1024,
  MAX_YANDEX_ACCOUNT_FIELD_CHARS: 1024,
  MAX_YANDEX_RESOURCE_ID_CHARS: 1024
});
const helpers = section(sw, 'function isAllowedContentOpenUrl', 'const MAX_OPERATION_ID_CHARS');
vm.runInContext(`${helpers}\nthis.normalizePublic = normalizeYandexPublicUrlFromApi; this.normalizeSigned = normalizeYandexSignedTransferUrl; this.normalizeResourceId = normalizeYandexResourceIdFromApi; this.boundText = boundedYandexExternalText;`, context);

assert.strictEqual(context.normalizePublic('https://disk.yandex.ru/i/example'), 'https://disk.yandex.ru/i/example');
assert.throws(() => context.normalizePublic(`https://disk.yandex.ru/i/${'x'.repeat(9000)}`), (error) => error?.code === 'YANDEX_RESPONSE_METADATA_TOO_LARGE');
assert.throws(() => context.normalizePublic('https://example.com/not-yandex'), (error) => error?.code === 'YANDEX_PUBLIC_URL_INVALID');
assert.throws(() => context.normalizeSigned(`https://disk.yandex.net/${'x'.repeat(33000)}`), (error) => error?.code === 'YANDEX_RESPONSE_METADATA_TOO_LARGE');
assert.throws(() => context.normalizeSigned('https://example.com/file'), (error) => error?.code === 'YANDEX_SIGNED_URL_INVALID');
assert.strictEqual(context.normalizeResourceId('r'.repeat(1024)).length, 1024);
assert.throws(() => context.normalizeResourceId('r'.repeat(1025)), (error) => error?.code === 'YANDEX_RESPONSE_METADATA_TOO_LARGE');

const accountContext = vm.createContext({
  boundedYandexExternalText(value, maxChars) { return String(value == null ? '' : value).slice(0, maxChars); },
  MAX_YANDEX_ACCOUNT_FIELD_CHARS: 1024
});
const accountCode = section(sw, 'function extractDiskAccount', 'async function ensureYandexPublicUrl');
vm.runInContext(`${accountCode}\nthis.extractAccount = extractDiskAccount;`, accountContext);
const account = accountContext.extractAccount({ user: { login: 'l'.repeat(5000), display_name: 'd'.repeat(5000), uid: 'u'.repeat(5000) } });
assert.strictEqual(account.login.length, 1024);
assert.strictEqual(account.displayName.length, 1024);
assert.strictEqual(account.uid.length, 1024);

assert(sw.includes("scope: boundedYandexExternalText(token.scope || YANDEX_SCOPES.join(' '), MAX_YANDEX_SCOPE_CHARS)"), 'OAuth scope must be bounded before session persistence');
assert(sw.includes('MAX_YANDEX_EXTERNAL_ERROR_CHARS'), 'external Yandex/OAuth error strings must have their own scalar bound');
assert(sw.includes('const signedUrl = normalizeYandexSignedTransferUrl(spec.url);'), 'signed transfer URL must be bounded/validated before runtime IPC');
assert(sw.includes("publicUrl = normalizeYandexPublicUrlFromApi(metadata?.public_url || '')"), 'remote public_url must be bounded before journal/runtime use');

const offContext = vm.createContext({ URL, String, MAX_YANDEX_SIGNED_URL_CHARS: 32 * 1024 });
const offCode = section(offscreen, 'function isAllowedSignedYandexUrl', 'const blobUrls');
vm.runInContext(`${offCode}\nthis.allowed = isAllowedSignedYandexUrl;`, offContext);
assert.strictEqual(offContext.allowed('https://disk.yandex.net/a?x=1'), true);
assert.strictEqual(offContext.allowed(`https://disk.yandex.net/${'x'.repeat(33000)}`), false, 'offscreen must reject oversized signed URLs before URL parsing/fetch');
assert.strictEqual(offContext.allowed('https://example.com/a'), false);

console.log('Yandex external scalar boundary tests OK');
