'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const guardSource = fs.readFileSync(path.join(ROOT, 'operation-log-redaction-guard.js'), 'utf8');
const bootstrapSource = fs.readFileSync(path.join(ROOT, 'journal-text-filter.js'), 'utf8');
const workerSource = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');

function currentShapeSafeUrl(value) {
  try {
    const url = new URL(String(value || ''));
    const host = url.hostname.toLowerCase();
    if (host === 'disk.yandex.net' || host.endsWith('.disk.yandex.net')) {
      return `${url.origin}/[REDACTED_SIGNED_PATH]`;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return `${url.origin}${url.pathname}`;
  } catch (_) {
    return '';
  }
}

function makeContext() {
  const context = { URL, safeUrlForOperationLog: currentShapeSafeUrl };
  context.sanitizeOperationLogValue = function sanitizeOperationLogValue(value, key = '', depth = 0) {
    if (depth > 6) return '[TRUNCATED]';
    if (typeof value === 'string') {
      if (/url|href|link|uri/i.test(String(key || ''))) return context.safeUrlForOperationLog(value);
      return value;
    }
    if (Array.isArray(value)) return value.map((item) => context.sanitizeOperationLogValue(item, key, depth + 1));
    if (value && typeof value === 'object') {
      const out = {};
      for (const [childKey, childValue] of Object.entries(value)) {
        out[childKey] = context.sanitizeOperationLogValue(childValue, childKey, depth + 1);
      }
      return out;
    }
    return value;
  };
  context.globalThis = context;
  vm.createContext(context);
  return context;
}

const NET = 'https://uploader1d.disk.yandex.net/upload/opaque/secret?signature=AAA#fragment';
const RU = 'https://downloader.disk.yandex.ru/disk/opaque/secret?uid=42&hash=BBB#fragment';
const RU_SUB = 'https://downloader12h.disk.yandex.ru/disk/another/secret?token=CCC';
const API = 'https://cloud-api.yandex.net/v1/disk/resources/download?path=%2Fsafe-name.pdf';
const OTHER = 'https://example.com/private/path?token=x#fragment';

(function failureControl() {
  assert.equal(currentShapeSafeUrl(NET), 'https://uploader1d.disk.yandex.net/[REDACTED_SIGNED_PATH]');
  const leaked = currentShapeSafeUrl(RU);
  assert.equal(leaked, 'https://downloader.disk.yandex.ru/disk/opaque/secret', 'current pre-fix .ru behavior must reproduce path retention');
  assert.ok(leaked.includes('/disk/opaque/secret'));
})();

(function guardedDirectAndNestedRedaction() {
  const context = makeContext();
  vm.runInContext(guardSource, context, { filename: 'operation-log-redaction-guard.js' });
  const api = context.WebClipOperationLogRedactionGuard;
  assert.ok(api, 'guard must export deterministic helpers');
  assert.equal(api.isOpaqueYandexDiskSignedHost('disk.yandex.net'), true);
  assert.equal(api.isOpaqueYandexDiskSignedHost('uploader1d.disk.yandex.net'), true);
  assert.equal(api.isOpaqueYandexDiskSignedHost('disk.yandex.ru'), true);
  assert.equal(api.isOpaqueYandexDiskSignedHost('downloader12h.disk.yandex.ru'), true);
  assert.equal(api.isOpaqueYandexDiskSignedHost('cloud-api.yandex.net'), false);
  assert.equal(api.isOpaqueYandexDiskSignedHost('notdisk.yandex.ru'), false);

  assert.equal(context.safeUrlForOperationLog(NET), 'https://uploader1d.disk.yandex.net/[REDACTED_SIGNED_PATH]');
  assert.equal(context.safeUrlForOperationLog(RU), 'https://downloader.disk.yandex.ru/[REDACTED_SIGNED_PATH]');
  assert.equal(context.safeUrlForOperationLog(RU_SUB), 'https://downloader12h.disk.yandex.ru/[REDACTED_SIGNED_PATH]');
  assert.equal(context.safeUrlForOperationLog(API), 'https://cloud-api.yandex.net/v1/disk/resources/download');
  assert.equal(context.safeUrlForOperationLog(OTHER), 'https://example.com/private/path');

  const nested = context.sanitizeOperationLogValue({
    directUrl: RU,
    metadata: {
      signedHref: RU_SUB,
      neutralText: RU,
      apiUrl: API
    }
  }, 'metadata');
  assert.equal(nested.directUrl, 'https://downloader.disk.yandex.ru/[REDACTED_SIGNED_PATH]');
  assert.equal(nested.metadata.signedHref, 'https://downloader12h.disk.yandex.ru/[REDACTED_SIGNED_PATH]');
  assert.equal(nested.metadata.neutralText, 'https://downloader.disk.yandex.ru/[REDACTED_SIGNED_PATH]', 'opaque capability must be redacted even under a non-URL key');
  assert.equal(nested.metadata.apiUrl, 'https://cloud-api.yandex.net/v1/disk/resources/download');
  const serialized = JSON.stringify(nested);
  for (const secret of ['/disk/opaque/secret', '/disk/another/secret', 'signature=AAA', 'hash=BBB', 'token=CCC', '#fragment']) {
    assert.equal(serialized.includes(secret), false, `sanitized log must not retain ${secret}`);
  }
})();

(function classicWorkerHoistingControl() {
  const context = { URL };
  context.globalThis = context;
  context.importScripts = (name) => {
    assert.equal(name, 'operation-log-redaction-guard.js');
    vm.runInContext(guardSource, context, { filename: name });
  };
  vm.createContext(context);
  const workerShape = `
    importScripts('operation-log-redaction-guard.js');
    function safeUrlForOperationLog(value) {
      const url = new URL(String(value || ''));
      const host = url.hostname.toLowerCase();
      if (host === 'disk.yandex.net' || host.endsWith('.disk.yandex.net')) return \`${'${url.origin}'}/[REDACTED_SIGNED_PATH]\`;
      return \`${'${url.origin}'}${'${url.pathname}'}\`;
    }
    function sanitizeOperationLogValue(value, key = '', depth = 0) {
      if (typeof value === 'string' && /url|href|link|uri/i.test(String(key || ''))) return safeUrlForOperationLog(value);
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const out = {};
        for (const [childKey, childValue] of Object.entries(value)) out[childKey] = sanitizeOperationLogValue(childValue, childKey, depth + 1);
        return out;
      }
      return value;
    }
    globalThis.__bootstrapResult = {
      direct: safeUrlForOperationLog(${JSON.stringify(RU)}),
      nested: sanitizeOperationLogValue({ signedHref: ${JSON.stringify(RU_SUB)} }, 'metadata').signedHref
    };
  `;
  vm.runInContext(workerShape, context, { filename: 'service-worker-shape.js' });
  assert.equal(context.__bootstrapResult.direct, 'https://downloader.disk.yandex.ru/[REDACTED_SIGNED_PATH]');
  assert.equal(context.__bootstrapResult.nested, 'https://downloader12h.disk.yandex.ru/[REDACTED_SIGNED_PATH]');
})();

(function repositoryWiringAndSourceBinding() {
  assert.match(workerSource, /^importScripts\('public-suffix\.js', 'journal-import-stream\.js', 'journal-text-filter\.js'\);/);
  assert.match(bootstrapSource, /importScripts\('pdf-print-guard\.js', 'content-injection-guard\.js', 'operation-log-redaction-guard\.js'\)/);
  assert.match(workerSource, /function safeUrlForOperationLog\(value\)/);
  assert.match(workerSource, /host === 'disk\.yandex\.net' \|\| host\.endsWith\('\.disk\.yandex\.net'\)/);
})();

console.log('P0-033 signed Yandex OperationLog redaction: PASS');
