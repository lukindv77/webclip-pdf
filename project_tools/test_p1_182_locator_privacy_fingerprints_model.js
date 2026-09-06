'use strict';

const assert = require('assert');
const crypto = require('crypto');

const PRIVACY_VERSION = 1;

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function digest(kind, value) {
  const normalized = String(value || '');
  if (!normalized) return '';
  return crypto.createHash('sha256').update(`webclip-locator-v1\0${kind}\0${normalized}`, 'utf8').digest('hex');
}

function textFeature(kind, value) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  return {
    digest: digest(kind, normalized),
    lengthBucket: Math.min(4096, Math.ceil(normalized.length / 16) * 16)
  };
}

function projectHttpUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return { projection: '', digest: '' };
  let parsed;
  try { parsed = new URL(raw, 'https://example.invalid/'); } catch (_) { return { projection: '', digest: '' }; }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return { projection: '', digest: digest('url-non-http', raw) };
  const exact = parsed.toString();
  parsed.username = '';
  parsed.password = '';
  parsed.search = '';
  parsed.hash = '';
  return {
    projection: `${parsed.protocol}//${parsed.host}${parsed.pathname}`,
    digest: digest('url-exact', exact)
  };
}

function sanitizeLocator(raw) {
  const textKinds = ['text', 'ariaLabel', 'name', 'title', 'parentText', 'previousText', 'nextText'];
  const textFeatures = {};
  for (const kind of textKinds) {
    const feature = textFeature(kind, raw?.[kind]);
    if (feature) textFeatures[kind] = feature;
  }
  const href = projectHttpUrl(raw?.href);
  const src = projectHttpUrl(raw?.src);
  return {
    privacyVersion: PRIVACY_VERSION,
    tag: String(raw?.tag || '').slice(0, 64),
    id: String(raw?.id || '').slice(0, 512),
    role: String(raw?.role || '').slice(0, 120),
    classes: Array.isArray(raw?.classes) ? raw.classes.slice(0, 16).map(String) : [],
    domPath: Array.isArray(raw?.domPath) ? raw.domPath.filter(Number.isInteger).slice(0, 128) : [],
    textFeatures,
    hrefProjection: href.projection,
    hrefFingerprint: href.digest,
    srcProjection: src.projection,
    srcFingerprint: src.digest
  };
}

const raw = {
  tag: 'a',
  id: 'invoice-link',
  role: 'link',
  classes: ['cta'],
  domPath: [2, 1],
  text: 'Invoice 99123 for Alice',
  ariaLabel: 'Open private invoice',
  name: 'invoice-99123',
  title: 'Alice billing',
  parentText: 'Alice account balance 1234',
  previousText: 'Secret previous context',
  nextText: 'Secret next context',
  href: 'https://user:pass@example.test/account/invoice?token=SECRET#private',
  src: 'https://cdn.example.test/img.png?sig=SECRET2'
};

const safe = sanitizeLocator(raw);
assert.equal(safe.privacyVersion, 1);
assert.equal(safe.hrefProjection, 'https://example.test/account/invoice');
assert.equal(safe.srcProjection, 'https://cdn.example.test/img.png');
assert.match(safe.hrefFingerprint, /^[a-f0-9]{64}$/);
assert.match(safe.textFeatures.parentText.digest, /^[a-f0-9]{64}$/);

const serialized = JSON.stringify(safe);
for (const secret of [
  'Alice', '99123', 'balance 1234', 'Secret previous context', 'Secret next context',
  'user:pass', 'token=SECRET', '#private', 'sig=SECRET2'
]) {
  assert.equal(serialized.includes(secret), false, `durable locator leaked plaintext: ${secret}`);
}

// Same bounded current evidence can still produce exact secondary matches.
const same = sanitizeLocator({
  ...raw,
  text: '  INVOICE   99123 FOR ALICE  ',
  href: 'https://user:pass@example.test/account/invoice?token=SECRET#private'
});
assert.equal(same.textFeatures.text.digest, safe.textFeatures.text.digest);
assert.equal(same.hrefFingerprint, safe.hrefFingerprint);

// A different exact URL with the same durable projection is distinguishable without storing its query.
const changedQuery = sanitizeLocator({ ...raw, href: 'https://example.test/account/invoice?token=DIFFERENT' });
assert.equal(changedQuery.hrefProjection, safe.hrefProjection);
assert.notEqual(changedQuery.hrefFingerprint, safe.hrefFingerprint);

// Structural fallback remains usable even if privacy features do not match.
const changedText = sanitizeLocator({ ...raw, text: 'Updated invoice title' });
assert.equal(changedText.id, safe.id);
assert.deepEqual(changedText.domPath, safe.domPath);
assert.notEqual(changedText.textFeatures.text.digest, safe.textFeatures.text.digest);

// Non-http schemes never become durable openable locator URLs.
const nonHttp = sanitizeLocator({ href: 'javascript:secret()', src: 'data:text/plain,SECRET' });
assert.equal(nonHttp.hrefProjection, '');
assert.equal(nonHttp.srcProjection, '');
assert.equal(JSON.stringify(nonHttp).includes('javascript:'), false);
assert.equal(JSON.stringify(nonHttp).includes('data:text'), false);

console.log('P1-182 locator privacy fingerprints model: PASS');
