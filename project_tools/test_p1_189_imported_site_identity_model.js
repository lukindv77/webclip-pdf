'use strict';

const assert = require('assert');

function normalizeHttpUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  let parsed;
  try { parsed = new URL(raw); } catch (_) { return ''; }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
  parsed.username = '';
  parsed.password = '';
  parsed.hash = '';
  return parsed.toString();
}

function deriveSiteIdentity(raw) {
  const url = normalizeHttpUrl(raw?.url);
  let hostname = '';
  try { hostname = url ? new URL(url).hostname.toLowerCase() : ''; } catch (_) { hostname = ''; }
  return {
    url,
    hostname,
    siteKey: hostname,
    importedHostnameIgnored: Boolean(String(raw?.hostname || '').trim())
  };
}

function routeFolder(entry) {
  const site = deriveSiteIdentity(entry);
  if (!site.hostname) return { ok: false, reason: 'missing-derived-site' };
  return { ok: true, folderSegments: site.hostname.split('.').filter(Boolean) };
}

let entry = deriveSiteIdentity({
  url: 'https://news.example.test/article?id=1#section',
  hostname: 'attacker.example'
});
assert.equal(entry.hostname, 'news.example.test');
assert.equal(entry.siteKey, 'news.example.test');
assert.equal(entry.importedHostnameIgnored, true);

let route = routeFolder({
  url: 'https://news.example.test/article?id=1',
  hostname: 'other.example'
});
assert.equal(route.ok, true);
assert.deepEqual(route.folderSegments, ['news', 'example', 'test']);

entry = deriveSiteIdentity({ url: 'not a url', hostname: 'trusted-looking.example' });
assert.equal(entry.hostname, '');
route = routeFolder({ url: 'not a url', hostname: 'trusted-looking.example' });
assert.equal(route.ok, false,
  'raw imported hostname must not rescue a missing/invalid canonical URL for privileged routing');

entry = deriveSiteIdentity({ url: 'javascript:alert(1)', hostname: 'example.test' });
assert.equal(entry.hostname, '');

// Same normalized URL always yields the same site identity regardless of duplicate backup fields.
const a = deriveSiteIdentity({ url: 'https://Example.Test/path', hostname: 'a.invalid' });
const b = deriveSiteIdentity({ url: 'https://example.test/path', hostname: 'b.invalid' });
assert.equal(a.hostname, b.hostname);
assert.equal(a.siteKey, b.siteKey);

console.log('P1-189 imported site identity model: PASS');
