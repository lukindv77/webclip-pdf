'use strict';

const fs = require('fs');
const path = require('path');

const worker = fs.readFileSync(path.resolve(__dirname, '..', 'service-worker.js'), 'utf8');
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

function functionSlice(name, maxChars = 36000) {
  const start = worker.indexOf(`function ${name}`);
  if (start < 0) return '';
  return worker.slice(start, start + maxChars);
}

requireSource(/deriveJournalSiteIdentity|deriveSiteIdentityFromUrl|journalSiteIdentityFromUrl/.test(worker),
  'missing canonical URL-derived Journal site identity helper');

const imported = functionSlice('normalizeImportedJournalEntry');
requireSource(Boolean(imported), 'cannot locate normalizeImportedJournalEntry()');
requireSource(!/raw\.hostname\s*\|\|/.test(imported),
  'import normalization still lets raw.hostname override URL-derived identity');
requireSource(/deriveJournalSiteIdentity|deriveSiteIdentityFromUrl|journalSiteIdentityFromUrl/.test(imported),
  'import normalization is not wired to canonical URL-derived site identity');

// Privileged read-later/Yandex folder routing must not trust a duplicated cached hostname.
requireSource(!/getSiteFolderSegments\(entry\.hostname\s*\|\|\s*hostnameFromUrl\(entry\.url\)\)/.test(worker),
  'privileged Yandex site-folder routing still trusts entry.hostname before URL-derived hostname');
requireSource(/getSiteFolderSegments\([^\n]*(deriveJournalSiteIdentity|deriveSiteIdentityFromUrl|journalSiteIdentityFromUrl|hostnameFromUrl\(entry\.url\))/.test(worker),
  'cannot find URL-derived site-folder routing positive path');

// New live Journal rows should not mint an independent hostname/siteKey authority either.
const append = functionSlice('appendJournalEntry');
requireSource(Boolean(append), 'cannot locate appendJournalEntry()');
requireSource(!/hostname:\s*String\(meta\.hostname\s*\|\|\s*''\)/.test(append),
  'appendJournalEntry() still persists content-provided meta.hostname as independent authority');
requireSource(!/siteKey:\s*getJournalSiteKey\(meta\.url\s*\|\|\s*meta\.hostname/.test(append),
  'appendJournalEntry() still lets meta.hostname rescue/override site identity');

if (failures.length) {
  console.error('P1-189 imported site identity source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-189 imported site identity source gate: PASS');
