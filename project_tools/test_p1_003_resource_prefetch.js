const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const content = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const journal = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'journal.css'), 'utf8');

assert.match(content, /PDF_RESOURCE_PREFETCH_DEADLINE_MS\s*=\s*15_000/);
assert.match(content, /PDF_RESOURCE_PREFETCH_MAX_RESOURCES\s*=\s*500/);
assert.match(content, /PDF_RESOURCE_PREFETCH_CONCURRENCY\s*=\s*8/);
assert.match(content, /PDF_RESOURCE_PREFETCH_MAX_SCAN_ELEMENTS\s*=\s*5_000/);
assert.match(content, /meta\.resourceReport\s*=\s*await prefetchIncludedResources\(\)/);
assert.match(content, /appendResourceReportToPrintHeader\(header, meta\.resourceReport\)/);
assert.match(content, /data-src/);
assert.match(content, /data-srcset/);
assert.match(content, /style\.backgroundImage/);
assert.match(content, /ownerDoc\.fonts\?\.load/);
assert.match(content, /state\.changedResourceAttributes/);
assert.match(content, /resourceDiagnosticLabel/);

const prefetchStart = content.indexOf('async function prefetchIncludedResources()');
const restoreStart = content.indexOf('function restoreAfterPrint()');
assert(prefetchStart > 0 && restoreStart > prefetchStart, 'prefetch/restore functions missing');
const prefetchBlock = content.slice(prefetchStart, restoreStart);
assert(!/\bfetch\s*\(/.test(prefetchBlock), 'P1-003 must not use extension/page fetch for resource bytes');
assert.match(prefetchBlock, /tasks\.length >= PDF_RESOURCE_PREFETCH_MAX_RESOURCES/);
assert.match(prefetchBlock, /Date\.now\(\) >= deadlineAt/);
assert.match(prefetchBlock, /Promise\.all\(workers\)/);

assert.match(sw, /function sanitizePdfResourceReport\(/);
assert.match(sw, /return `\$\{url\.origin\}\$\{url\.pathname\}`/);
assert.match(sw, /resourceReport: sanitizePdfResourceReport\(meta\.resourceReport\)/);
assert.match(sw, /resourceReport: sanitizePdfResourceReport\(raw\.resourceReport\)/);
assert.match(sw, /'resource-prefetch'/);
assert.match(journal, /function buildResourceReportDetails\(/);
assert.match(journal, /Ресурсы PDF:/);
assert.match(css, /\.resource-details/);

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `missing function ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unterminated function ${name}`);
}

const sandbox = { URL, module: { exports: {} } };
vm.createContext(sandbox);
vm.runInContext(`
  const MAX_PDF_RESOURCE_REPORT_FAILURES = 40;
  const MAX_PDF_RESOURCE_REPORT_LABEL_CHARS = 500;
  ${extractFunction(sw, 'boundedContentString')}
  ${extractFunction(sw, 'sanitizePdfResourceDiagnosticLabel')}
  ${extractFunction(sw, 'sanitizePdfResourceReport')}
  module.exports = { sanitizePdfResourceReport };
`, sandbox);
const { sanitizePdfResourceReport } = sandbox.module.exports;
assert.strictEqual(sanitizePdfResourceReport(null), null, 'legacy/no-report must stay absent');
const sanitized = sanitizePdfResourceReport({
  version: 1,
  limit: 9999,
  deadlineMs: 999999,
  attempted: 3,
  loaded: 1,
  failed: 2,
  failures: Array.from({ length: 45 }, (_, i) => ({
    kind: i === 0 ? 'image' : 'font',
    resource: i === 0 ? 'https://example.test/a.png?access_token=SECRET#frag' : `Font ${i}`,
    reason: 'load-error'
  }))
});
assert.strictEqual(sanitized.limit, 500);
assert.strictEqual(sanitized.deadlineMs, 60000);
assert.strictEqual(sanitized.failures.length, 40);
assert.strictEqual(sanitized.failures[0].resource, 'https://example.test/a.png');
assert(!JSON.stringify(sanitized).includes('SECRET'));

console.log('P1-003 resource prefetch/report regression checks passed.');
