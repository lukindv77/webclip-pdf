'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'durable-url-policy.js'), 'utf8');
const context = { URL, TextEncoder, Uint8Array, Uint32Array, DataView };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: 'durable-url-policy.js' });
const policy = context.WebClipDurableUrlPolicy;
assert.ok(policy, 'policy export required');

(function testSha256Reference() {
  for (const value of ['', 'abc', 'WebClip π URL']) {
    assert.equal(policy.sha256Hex(value), crypto.createHash('sha256').update(value, 'utf8').digest('hex'));
  }
})();

(function testSourceProjectionAndExactKeySeparation() {
  const first = 'https://alice:secret@example.test/a/b?token=ONE&view=1#frag';
  const second = 'https://alice:secret@example.test/a/b?token=TWO&view=1#other';
  assert.equal(policy.sanitizeHttpUrl(first), 'https://example.test/a/b');
  assert.equal(policy.sanitizeSiteAddress(first), 'https://example.test');
  assert.notEqual(policy.exactHttpUrlKey(first), policy.exactHttpUrlKey(second), 'query-defined source identity must remain distinct without plaintext');
  assert.equal(policy.exactHttpUrlKey(first), policy.exactHttpUrlKey(first.replace('#frag', '#other')), 'fragment remains outside source identity, matching historical Journal semantics');
  assert.match(policy.exactHttpUrlKey(first), /^webclip-url-v2:[0-9a-f]{64}$/);
  assert.equal(policy.exactHttpUrlKey('data:text/html,secret'), '');
})();

(function testPublicAndLocatorProjection() {
  assert.equal(policy.sanitizeHttpsUrl('https://bob:pw@disk.yandex.ru/d/abc?utm=secret#fragment'), 'https://disk.yandex.ru/d/abc');
  assert.equal(policy.sanitizeHttpsUrl('http://disk.yandex.ru/d/abc?token=x'), '');

  assert.equal(policy.sanitizeLocatorUrl('/img/private.png?sig=SECRET#f'), '/img/private.png');
  assert.equal(policy.sanitizeLocatorUrl('asset/item?id=SECRET#f'), 'asset/item');
  assert.equal(policy.sanitizeLocatorUrl('//u:p@cdn.example/x.js?sig=SECRET#f'), '//cdn.example/x.js');
  assert.equal(policy.sanitizeLocatorUrl('https://u:p@cdn.example/x.js?sig=SECRET#f'), 'https://cdn.example/x.js');
  assert.equal(policy.sanitizeLocatorUrl('javascript:alert(SECRET)'), '');
  assert.equal(policy.sanitizeLocatorUrl('data:text/plain,SECRET'), '');
  assert.equal(policy.sanitizeLocatorUrl('blob:https://example.test/SECRET'), '');
  assert.notEqual(policy.locatorUrlKey('/img.png?v=1'), policy.locatorUrlKey('/img.png?v=2'));
  assert.equal(policy.locatorUrlKey('javascript:alert(1)'), '');
})();

(function testLegacyDurableObjectProjection() {
  const legacy = {
    id: 'j1',
    url: 'https://user:password@app.example/doc?access_token=TOPSECRET&route=one#selection',
    urlKey: 'https://user:password@app.example/doc?access_token=TOPSECRET&route=one',
    siteAddress: 'https://user:password@app.example/?leak=yes',
    publicUrl: 'https://disk.yandex.ru/d/public?tracking=PRIVATE#frag',
    selectionSnapshot: {
      version: 3,
      includes: [{ src: '/image.png?sig=LOCSECRET', href: 'https://x:y@cdn.example/item?token=HREFSECRET' }],
      excludes: []
    }
  };
  const safe = policy.sanitizeJournalEntryUrls(legacy);
  assert.equal(safe.url, 'https://app.example/doc');
  assert.equal(safe.siteAddress, 'https://app.example');
  assert.equal(safe.publicUrl, 'https://disk.yandex.ru/d/public');
  assert.match(safe.urlKey, /^webclip-url-v2:[0-9a-f]{64}$/);
  assert.equal(safe.selectionSnapshot.includes[0].src, '/image.png');
  assert.equal(safe.selectionSnapshot.includes[0].href, 'https://cdn.example/item');
  assert.match(safe.selectionSnapshot.includes[0].srcKey, /^webclip-locator-url-v2:[0-9a-f]{64}$/);
  assert.match(safe.selectionSnapshot.includes[0].hrefKey, /^webclip-locator-url-v2:[0-9a-f]{64}$/);
  const serialized = JSON.stringify(safe);
  for (const forbidden of ['user:', 'password', 'TOPSECRET', 'PRIVATE', 'LOCSECRET', 'HREFSECRET']) {
    assert.equal(serialized.includes(forbidden), false, `durable projection leaked ${forbidden}`);
  }
})();

(function testPendingAndCacheProjection() {
  const pending = policy.sanitizePendingDataUrls({
    publicUrl: 'https://disk.yandex.ru/d/x?secret=PUB',
    meta: {
      url: 'https://u:p@example.test/a?token=SRC',
      siteAddress: 'https://u:p@example.test/?x=SITE',
      selectionSnapshot: { version: 3, includes: [{ href: '/go?key=LOC' }], excludes: [] }
    }
  });
  assert.equal(pending.publicUrl, 'https://disk.yandex.ru/d/x');
  assert.equal(pending.meta.url, 'https://example.test/a');
  assert.match(pending.meta.urlKey, /^webclip-url-v2:[0-9a-f]{64}$/);
  assert.equal(pending.meta.selectionSnapshot.includes[0].href, '/go');

  const cached = policy.sanitizeCachedPdfRecordUrls({
    sourceUrl: 'https://u:p@example.test/a?generation=G1#f',
    meta: { url: 'https://u:p@example.test/a?generation=G1#f' }
  });
  assert.equal(cached.sourceUrl, 'https://example.test/a');
  assert.equal(cached.meta.url, 'https://example.test/a');
  assert.match(cached.sourceUrlKey, /^webclip-url-v2:[0-9a-f]{64}$/);
})();

console.log('P0-066 durable/display URL confidentiality policy: PASS');