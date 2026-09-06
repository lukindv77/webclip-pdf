'use strict';

const assert = require('assert/strict');
const crypto = require('crypto');

const YANDEX_PUBLIC_HOSTS = new Set(['disk.yandex.ru', 'yadi.sk']);

function sanitizeSourceDisplayUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch (_) {
    return '';
  }
}

function sanitizeYandexPublicUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol !== 'https:') return '';
    const host = url.hostname.toLowerCase();
    const allowed = YANDEX_PUBLIC_HOSTS.has(host) || host.endsWith('.disk.yandex.ru');
    if (!allowed) return '';
    if (url.username || url.password) return '';
    url.hash = '';
    return url.toString();
  } catch (_) {
    return '';
  }
}

function sourceIdentityFingerprint(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  let parsed;
  try { parsed = new URL(raw); } catch (_) { return ''; }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
  return `sha256:${crypto.createHash('sha256').update(parsed.toString(), 'utf8').digest('hex')}`;
}

function durableUrlProjection({ kind, value }) {
  if (kind === 'source' || kind === 'display' || kind === 'imported-source') {
    return sanitizeSourceDisplayUrl(value);
  }
  if (kind === 'yandex-public' || kind === 'imported-yandex-public') {
    return sanitizeYandexPublicUrl(value);
  }
  if (kind === 'signed-transport') return '[REDACTED_SIGNED_URL]';
  if (kind === 'locator-raw') return '';
  throw new Error(`unknown durable URL class: ${kind}`);
}

function persistedSourceRecord(rawUrl) {
  return Object.freeze({
    urlSchemaVersion: 1,
    displayUrl: sanitizeSourceDisplayUrl(rawUrl),
    sourceIdentityFingerprint: sourceIdentityFingerprint(rawUrl)
  });
}

const secretSource = 'https://user:pass@example.test/private/report?access_token=QUERY_SECRET&doc=7#FRAGMENT_SECRET';
const display = sanitizeSourceDisplayUrl(secretSource);
assert.equal(display, 'https://example.test/private/report');
assert.equal(display.includes('user'), false);
assert.equal(display.includes('pass'), false);
assert.equal(display.includes('QUERY_SECRET'), false);
assert.equal(display.includes('FRAGMENT_SECRET'), false);

assert.equal(sanitizeSourceDisplayUrl('data:text/html,secret'), '');
assert.equal(sanitizeSourceDisplayUrl('blob:https://example.test/id'), '');
assert.equal(sanitizeSourceDisplayUrl('file:///tmp/private'), '');
assert.equal(sanitizeSourceDisplayUrl('javascript:alert(1)'), '');
assert.equal(sanitizeSourceDisplayUrl('not a url'), '');

const fpA = sourceIdentityFingerprint('https://example.test/app?route=A#x');
const fpB = sourceIdentityFingerprint('https://example.test/app?route=B#x');
assert.match(fpA, /^sha256:[0-9a-f]{64}$/);
assert.notEqual(fpA, fpB);
assert.equal(fpA.includes('route=A'), false);
assert.equal(sourceIdentityFingerprint('data:text/html,secret'), '');

const publicUrl = 'https://disk.yandex.ru/d/AbCdEf?public_token=needed#ui-fragment';
assert.equal(
  sanitizeYandexPublicUrl(publicUrl),
  'https://disk.yandex.ru/d/AbCdEf?public_token=needed'
);
assert.equal(sanitizeYandexPublicUrl('https://user:pass@disk.yandex.ru/d/AbCdEf'), '');
assert.equal(sanitizeYandexPublicUrl('https://evil.example/d/AbCdEf'), '');
assert.equal(sanitizeYandexPublicUrl('http://disk.yandex.ru/d/AbCdEf'), '');
assert.equal(sanitizeYandexPublicUrl('https://yadi.sk/d/AbCdEf#fragment'), 'https://yadi.sk/d/AbCdEf');

assert.equal(durableUrlProjection({ kind: 'signed-transport', value: 'https://uploader.disk.yandex.net/signed/path?sig=x' }), '[REDACTED_SIGNED_URL]');
assert.equal(durableUrlProjection({ kind: 'locator-raw', value: 'https://example.test/item?secret=x' }), '');
assert.equal(durableUrlProjection({ kind: 'imported-source', value: secretSource }), 'https://example.test/private/report');
assert.equal(durableUrlProjection({ kind: 'imported-yandex-public', value: 'https://evil.example/public' }), '');

const stored = persistedSourceRecord(secretSource);
assert.deepEqual(stored, {
  urlSchemaVersion: 1,
  displayUrl: 'https://example.test/private/report',
  sourceIdentityFingerprint: sourceIdentityFingerprint(secretSource)
});
assert.equal(JSON.stringify(stored).includes('QUERY_SECRET'), false);
assert.equal(JSON.stringify(stored).includes('FRAGMENT_SECRET'), false);
assert.equal(JSON.stringify(stored).includes('user:pass'), false);

console.log('P0-066 durable URL confidentiality model: PASS');
