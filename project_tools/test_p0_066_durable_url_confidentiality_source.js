'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const maybeRead = (file) => {
  try { return read(file); } catch (_) { return ''; }
};

const worker = read('service-worker.js');
const content = read('content.js');
const journal = read('journal.js');
const injectionGuard = read('content-injection-guard.js');
const journalFilter = read('journal-text-filter.js');
const operationLogGuard = read('operation-log-redaction-guard.js');
const policy = maybeRead('durable-url-policy.js');

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

function functionBody(source, name) {
  const markers = [`async function ${name}(`, `function ${name}(`];
  let start = -1;
  for (const marker of markers) {
    start = source.indexOf(marker);
    if (start >= 0) break;
  }
  if (start < 0) return '';
  const open = source.indexOf('{', start);
  if (open < 0) return '';
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return '';
}

const saveMeta = functionBody(worker, 'sanitizeContentSaveMeta');
const normalizeJournal = functionBody(worker, 'normalizeJournalUrl');
const importedHttp = functionBody(worker, 'normalizeImportedHttpUrl');
const importedHttps = functionBody(worker, 'normalizeImportedHttpsUrl');
const prepare = functionBody(content, 'prepareForPrint');
const openUrlCaseAt = worker.indexOf("case 'WEBCLIP_OPEN_URL'");
const openUrlCaseEnd = openUrlCaseAt >= 0 ? worker.indexOf('\n      case ', openUrlCaseAt + 8) : -1;
const openUrlCase = openUrlCaseAt >= 0 ? worker.slice(openUrlCaseAt, openUrlCaseEnd > openUrlCaseAt ? openUrlCaseEnd : openUrlCaseAt + 2500) : '';

check(Boolean(policy), 'shared durable-url-policy.js is missing');
check(/VERSION/.test(policy), 'URL policy must be explicitly versioned');
check(/sanitizeSourceDisplayUrl/.test(policy), 'URL policy needs source/display projection');
check(/sanitizeYandexPublicUrl/.test(policy), 'URL policy needs provider-class Yandex public-link validation');
check(/username\s*=\s*['"]{2}|username/.test(policy) && /password\s*=\s*['"]{2}|password/.test(policy), 'source policy must explicitly handle URL userinfo');
check(/search\s*=\s*['"]{2}|\.search/.test(policy), 'source policy must explicitly handle query/search');
check(/hash\s*=\s*['"]{2}|\.hash/.test(policy), 'source/public policy must explicitly handle fragments');
check(/http:/.test(policy) && /https:/.test(policy), 'source policy must explicitly allow only HTTP(S)');
check(/disk\.yandex\.ru|yadi\.sk/.test(policy), 'Yandex public-link policy needs explicit provider host validation');
check(!/catch\s*\([^)]*\)\s*\{[^}]*return\s+String\([^)]*\)/s.test(policy), 'policy parse failure must not return raw input');

check(injectionGuard.includes('durable-url-policy.js') || content.includes('WebClipDurableUrlPolicy'), 'content injection path must load/use the shared URL policy before content.js print preparation');
check(worker.includes('durable-url-policy.js') || journalFilter.includes('durable-url-policy.js') || worker.includes('WebClipDurableUrlPolicy'), 'worker must load/use the shared URL policy');

check(/sanitizeSourceDisplayUrl|WebClipDurableUrlPolicy/.test(prepare), 'prepareForPrint must project source URL before adding printable text/href');
check(!/urlLink\.textContent\s*=\s*meta\.url/.test(prepare), 'raw meta.url must not become printable source URL text');
check(!/urlLink\.href\s*=\s*meta\.url/.test(prepare), 'raw meta.url must not become printable source URL href');

check(/sanitizeSourceDisplayUrl|WebClipDurableUrlPolicy/.test(saveMeta), 'worker save admission must independently compute source display projection from sender authority');
check(!/url\s*=\s*parsed\.toString\(\)/.test(saveMeta), 'worker must not persist parsed sender URL unchanged');

check(!/return\s+String\(value\s*\|\|\s*['"]['"]\)\.split\(\s*['"]#['"]\s*\)\[0\]/.test(normalizeJournal), 'normalizeJournalUrl raw-on-error fallback remains unsafe for durable use');
check(/sanitizeSourceDisplayUrl|WebClipDurableUrlPolicy/.test(importedHttp), 'imported HTTP source URL must use the shared source policy');
check(!(/\.hash\s*=\s*['"]['"]/.test(importedHttp) && !/\.search\s*=\s*['"]['"]|sanitizeSourceDisplayUrl|WebClipDurableUrlPolicy/.test(importedHttp)), 'import sanitizer cannot be hash-only privacy normalization');
check(/sanitizeYandexPublicUrl|WebClipDurableUrlPolicy/.test(worker), 'worker must use provider-class public-link sanitizer');
check(!(/function normalizeImportedHttpsUrl/.test(worker) && /publicUrl:\s*normalizeImportedHttpsUrl/.test(worker)), 'imported publicUrl must not use generic HTTPS normalization');

check(/sourceIdentity|identityReceipt|urlIdentity|source.*fingerprint/i.test(worker), 'durable exact/grouping authority must be separate from lossy display URL');
check(!/sourceUrl:\s*normalizeJournalUrl\(meta\.url\)/.test(worker), 'PDF cache source identity must not be raw/hash-only URL plaintext');

check(/sanitize.*url|durable.*url|WebClipDurableUrlPolicy/i.test(openUrlCase), 'WEBCLIP_OPEN_URL must parse/classify through the URL policy rather than prefix-only admission');
check(!/!\/\^https\?:\\\/\\\//i.test(openUrlCase), 'WEBCLIP_OPEN_URL must not rely only on textual http(s) prefix validation');
check(!/window\.open\(entry\.url/.test(journal), 'Journal must not bypass worker URL policy with direct raw window.open fallback');

check(operationLogGuard.includes('[REDACTED_SIGNED_PATH]'), 'P0-033 signed transport redaction must remain present');
check(journalFilter.includes("operation-log-redaction-guard.js"), 'P0-033 worker bootstrap must remain wired');

if (failures.length) {
  console.error('P0-066 durable URL confidentiality source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P0-066 durable URL confidentiality source gate: PASS');
