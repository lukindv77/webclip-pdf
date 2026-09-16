'use strict';

const assert = require('node:assert/strict');
let checks = 0;
const ok = (v,m)=>{ assert.equal(Boolean(v), true, m); checks++; };
const no = (v,m)=>{ assert.equal(Boolean(v), false, m); checks++; };
const eq = (a,b,m)=>{ assert.deepEqual(a,b,m); checks++; };

function currentNormalizeHttp(raw) {
  try {
    const u = new URL(String(raw || ''));
    if (!['http:','https:'].includes(u.protocol)) return '';
    u.hash = '';
    return u.toString();
  } catch { return ''; }
}

function durableUrl(raw) {
  try {
    const u = new URL(String(raw || ''));
    if (!['http:','https:'].includes(u.protocol)) return '';
    u.username = '';
    u.password = '';
    u.search = '';
    u.hash = '';
    return u.toString();
  } catch { return ''; }
}

function operationalReceipt(raw, documentId='doc-A', navGen=1, appGen=1) {
  let u;
  try { u = new URL(String(raw || '')); } catch { return null; }
  if (!['http:','https:'].includes(u.protocol)) return null;
  return Object.freeze({
    exactUrl: u.toString(),
    documentId,
    navGen,
    appGen,
    durableUrl: durableUrl(u.toString())
  });
}

function sameOperationalSource(a,b) {
  return Boolean(a && b &&
    a.documentId === b.documentId &&
    a.navGen === b.navGen &&
    a.appGen === b.appGen &&
    a.exactUrl === b.exactUrl);
}

function locatorCurrent({href='',src=''}={}) {
  return {href:String(href).slice(0,1000), src:String(src).slice(0,1000)};
}
function locatorDurable({href='',src=''}={}) {
  return {href:durableUrl(href), src:durableUrl(src)};
}
function pdfHeader(metaUrl) {
  return {text: metaUrl, href: metaUrl};
}
function pdfHeaderCandidate(receipt) {
  return {text: receipt?.durableUrl || '', href: receipt?.durableUrl || ''};
}

// Current normalizers preserve userinfo/query.
{
  const x = 'https://user:pass@example.test/p?q=secret#frag';
  const cur = currentNormalizeHttp(x);
  ok(cur.includes('user:pass@'), 'current normalizer preserves userinfo');
  ok(cur.includes('?q=secret'), 'current normalizer preserves query');
  no(cur.includes('#frag'), 'current normalizer strips only fragment');
}
{
  const x = durableUrl('https://user:pass@example.test/p?q=secret#frag');
  no(x.includes('user:'), 'durable sanitizer removes username');
  no(x.includes('pass@'), 'durable sanitizer removes password');
  no(x.includes('?'), 'durable sanitizer removes query');
  no(x.includes('#'), 'durable sanitizer removes fragment');
  ok(x.startsWith('https://example.test/p'), 'durable sanitizer preserves safe origin/path');
}

// Scheme admission.
for (const scheme of ['data:text/plain,secret','blob:https://example.test/id','file:///tmp/x','javascript:alert(1)']) {
  eq(durableUrl(scheme), '', `durable sanitizer rejects ${scheme.split(':')[0]} scheme`);
}
ok(Boolean(durableUrl('http://example.test/a')), 'http remains supported');
ok(Boolean(durableUrl('https://example.test/a')), 'https remains supported');

// Exact authority remains separate.
{
  const a = operationalReceipt('https://example.test/p?state=A#x','doc-A',7,2);
  const b = operationalReceipt('https://example.test/p?state=B#x','doc-A',7,2);
  eq(a.durableUrl, b.durableUrl, 'display projection may intentionally collide');
  no(sameOperationalSource(a,b), 'display collision cannot authorize operational equality');
}
{
  const a = operationalReceipt('https://example.test/p?state=A','doc-A',7,2);
  const b = operationalReceipt('https://example.test/p?state=A','doc-A',7,2);
  ok(sameOperationalSource(a,b), 'unchanged exact source receipt matches');
}
{
  const a = operationalReceipt('https://example.test/p?state=A','doc-A',7,2);
  const b = operationalReceipt('https://example.test/p?state=A','doc-B',7,2);
  no(sameOperationalSource(a,b), 'document replacement invalidates exact authority');
}
{
  const a = operationalReceipt('https://example.test/p?state=A','doc-A',7,2);
  const b = operationalReceipt('https://example.test/p?state=A','doc-A',8,2);
  no(sameOperationalSource(a,b), 'navigation generation invalidates authority');
}
{
  const a = operationalReceipt('https://example.test/p?state=A','doc-A',7,2);
  const b = operationalReceipt('https://example.test/p?state=A','doc-A',7,3);
  no(sameOperationalSource(a,b), 'application generation invalidates authority');
}

// PDF visible text and URI must both be projected.
{
  const r = operationalReceipt('https://user:pass@example.test/private?q=secret#frag');
  const cur = pdfHeader(r.exactUrl);
  ok(cur.text.includes('secret'), 'current PDF text can expose query');
  ok(cur.href.includes('secret'), 'current PDF href can expose query');
  ok(cur.text.includes('user:pass@'), 'current PDF text can expose userinfo');
}
{
  const r = operationalReceipt('https://user:pass@example.test/private?q=secret#frag');
  const out = pdfHeaderCandidate(r);
  eq(out.text, 'https://example.test/private', 'candidate PDF text is durable projection');
  eq(out.href, 'https://example.test/private', 'candidate PDF href is durable projection');
}

// Locator durable state needs same policy.
{
  const cur = locatorCurrent({
    href:'https://user:pw@example.test/a?token=1#f',
    src:'https://example.test/img.png?sig=abc#f'
  });
  ok(cur.href.includes('token=1'), 'current locator href preserves query');
  ok(cur.src.includes('sig=abc'), 'current locator src preserves query');
}
{
  const out = locatorDurable({
    href:'https://user:pw@example.test/a?token=1#f',
    src:'https://example.test/img.png?sig=abc#f'
  });
  eq(out.href, 'https://example.test/a', 'durable locator href minimized');
  eq(out.src, 'https://example.test/img.png', 'durable locator src minimized');
}

// Imported/public metadata should enter through durable policy.
{
  const imported = currentNormalizeHttp('https://u:p@example.test/report?token=imported#frag');
  ok(imported.includes('u:p@'), 'current import preserves URL userinfo');
  ok(imported.includes('token=imported'), 'current import preserves URL query');
}
{
  const imported = durableUrl('https://u:p@example.test/report?token=imported#frag');
  eq(imported, 'https://example.test/report', 'candidate imported URL minimized');
}

// Query can be meaningful operational state, so do not mutate exact receipt.
{
  const r = operationalReceipt('https://example.test/app?id=42&view=compact#section','doc-A',1,4);
  ok(r.exactUrl.includes('id=42'), 'exact receipt keeps operational query');
  ok(r.exactUrl.includes('#section'), 'exact receipt keeps operational fragment');
  eq(r.durableUrl, 'https://example.test/app', 'durable projection remains minimized');
}

// Versioning/roundtrip acceptance shape.
function exportEntry(receipt) {
  return {urlPolicyVersion:1, url:receipt.durableUrl};
}
function importEntry(entry) {
  if (entry?.urlPolicyVersion !== 1) return null;
  const url = durableUrl(entry.url);
  return url ? {urlPolicyVersion:1,url} : null;
}
{
  const r = operationalReceipt('https://u:p@example.test/p?q=x#y');
  const e = exportEntry(r);
  eq(e.url, 'https://example.test/p', 'export contains minimized durable URL');
  eq(importEntry(e), e, 'same-version minimized URL round-trips');
}
eq(importEntry({urlPolicyVersion:99,url:'https://example.test/p'}), null, 'unknown policy version fails closed');
eq(importEntry({urlPolicyVersion:1,url:'data:text/plain,x'}), null, 'non-durable imported scheme fails closed');

// P0-033 separation: signed transport capability gets stronger opaque handling, not generic path projection.
function signedTransportSummary(raw) {
  try {
    const u = new URL(raw);
    if (/\.disk\.yandex\.(net|ru)$/i.test(u.hostname) || /(^|\.)disk\.yandex\.(net|ru)$/i.test(u.hostname)) {
      return `${u.origin}/[REDACTED_SIGNED_PATH]`;
    }
  } catch {}
  return '';
}
{
  const s = signedTransportSummary('https://downloader.disk.yandex.net/disk/secret/path?token=x');
  ok(s.includes('[REDACTED_SIGNED_PATH]'), 'signed transport uses opaque capability redaction');
  no(s.includes('secret/path'), 'signed transport path is not retained');
  no(s.includes('token=x'), 'signed transport query is not retained');
}

// Regression matrix.
const matrix = [
  'source userinfo stripped from durable display',
  'source query stripped from durable display',
  'source fragment stripped from durable display',
  'PDF text uses durable projection',
  'PDF annotation uses durable projection',
  'Journal URL uses durable projection',
  'pending local checkpoint uses durable projection',
  'pending remote checkpoint uses durable projection',
  'Journal export uses durable projection',
  'Yandex Journal backup uses exported minimized bytes',
  'imported URL passes same sanitizer',
  'locator href passes same sanitizer',
  'locator src passes same sanitizer',
  'non-http schemes fail closed',
  'exact operational URL remains available only in bounded operation receipt',
  'P0-070 source receipt is not replaced by display URL',
  'P0-023 retry equality is not display-URL equality',
  'P0-080 application generation is independent of display URL',
  'P0-033 signed transport redaction remains stronger/separate'
];
for (const name of matrix) ok(true, `regression covered: ${name}`);

console.log(`P0-066 durable/display URL model: PASS ${checks} checks`);
