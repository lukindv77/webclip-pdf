'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(ROOT, name), 'utf8');

const worker = read('service-worker.js');
const injection = read('content-injection-guard.js');
const content = read('content.js');
const journal = read('journal.js');
const journalHtml = read('journal.html');

assert.match(worker, /^importScripts\('public-suffix\.js', 'durable-url-policy\.js',/m, 'worker must load the policy before persistence code');
assert.match(worker, /const JOURNAL_DB_VERSION = 8;/);
assert.match(worker, /const PDF_CACHE_DB_VERSION = 4;/);
assert.match(worker, /function normalizeJournalUrl\(url\) \{\s*return WebClipDurableUrlPolicy\.exactHttpUrlKey\(url\);\s*\}/);
assert.match(worker, /const exactUrl = parsed\.toString\(\);[\s\S]*const safeUrl = WebClipDurableUrlPolicy\.sanitizeHttpUrl\(exactUrl\);[\s\S]*const urlKey = WebClipDurableUrlPolicy\.exactHttpUrlKey\(exactUrl\);/);
assert.doesNotMatch(worker, /url:\s*parsed\.toString\(\)\.slice\(/, 'raw admitted source URL must not become save metadata');
assert.match(worker, /publicUrl:\s*WebClipDurableUrlPolicy\.sanitizeHttpsUrl\(publicUrl \|\| ''\)/, 'Journal public URL must use shared sanitizer');
assert.match(worker, /sourceUrlKey:\s*String\(safeRecord\.sourceUrlKey \|\| ''\)/, 'PDF cache metadata must carry opaque exact key');
assert.match(worker, /WebClipDurableUrlPolicy\.migrateJournalDbV8\(db, tx, event\?\.oldVersion \|\| 0\)/, 'worker Journal migration must receive the actual upgrade version');
assert.match(worker, /WebClipDurableUrlPolicy\.migratePdfCacheDbV4\(db, tx, event\?\.oldVersion \|\| 0\)/, 'worker PDF migration must run on upgrade');
assert.doesNotMatch(worker, /src:\s*String\(locator\.src \|\| ''\)\.slice/, 'snapshot src plaintext must not persist');
assert.doesNotMatch(worker, /href:\s*String\(locator\.href \|\| ''\)\.slice/, 'snapshot href plaintext must not persist');

assert.match(injection, /const DURABLE_URL_HELPER_FILE = 'durable-url-policy\.js';/);
assert.match(injection, /REQUIRED_PREFIX = Object\.freeze\(\[BUDGET_HELPER_FILE, INERT_HELPER_FILE, HOST_CONTROL_HELPER_FILE, DURABLE_URL_HELPER_FILE\]\)/,
  'P0-066 policy must load after host-control guard and before content.js');
assert.ok(injection.indexOf('DURABLE_URL_HELPER_FILE') < injection.indexOf("CONTENT_FILE = 'content.js'"));

assert.match(content, /const durableUrlPolicy = globalThis\.WebClipDurableUrlPolicy;/);
assert.match(content, /srcKey:\s*durableUrlPolicy\.locatorUrlKey\(rawSrc\)/);
assert.match(content, /hrefKey:\s*durableUrlPolicy\.locatorUrlKey\(rawHref\)/);
assert.match(content, /exactLocatorUrlAttribute\('src', 'srcKey', 'src'/);
assert.match(content, /exactLocatorUrlAttribute\('href', 'hrefKey', 'href'/);

assert.match(journalHtml, /<script src="durable-url-policy\.js"><\/script>[\s\S]*<script src="journal\.js"><\/script>/, 'Journal page must load sanitizer before direct IndexedDB view code');
assert.match(journal, /const JOURNAL_DB_VERSION = 8;/);
assert.match(journal, /request\.onupgradeneeded = \(event\) => \{/);
assert.match(journal, /migrateJournalDbV8\(db, request\.transaction, event\?\.oldVersion \|\| 0\)/);
assert.match(journal, /sourceUrlEl\.textContent = safeSourceUrl/);
assert.match(journal, /function normalizeUrl\(url\) \{\s*return WebClipDurableUrlPolicy\.exactHttpUrlKey\(url\);\s*\}/);

console.log('P0-066 durable URL runtime wiring: PASS');