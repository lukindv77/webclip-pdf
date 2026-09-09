'use strict';

const fs = require('fs');
const assert = require('assert');

const worker = fs.readFileSync('service-worker.js', 'utf8');
const journal = fs.readFileSync('journal.js', 'utf8');

function requireMatch(source, pattern, label) {
  assert.match(source, pattern, label);
}

function forbidMatch(source, pattern, label) {
  assert.doesNotMatch(source, pattern, label);
}

requireMatch(worker, /JOURNAL_DB_VERSION\s*=\s*8\b/, 'service worker must target WebClipJournal v8');
requireMatch(journal, /JOURNAL_DB_VERSION\s*=\s*8\b/, 'Journal page must target WebClipJournal v8');

requireMatch(worker, /journalFinalizations/, 'worker schema must define journalFinalizations');
requireMatch(worker, /pendingRemoteMutations/, 'worker schema must define pendingRemoteMutations');
requireMatch(worker, /datasetGeneration/, 'worker migration must seed/verify dataset generation');
requireMatch(worker, /passive-v8/, 'J0 migration must remain passive before D0 activation');
requireMatch(worker, /WEBCLIP_JOURNAL_SCHEMA_READY/, 'worker must expose bounded schema-ready bootstrap');

requireMatch(journal, /WEBCLIP_JOURNAL_SCHEMA_READY/, 'Journal page must bootstrap schema through worker');
requireMatch(journal, /onversionchange/, 'Journal page must close direct DB handle on versionchange');
requireMatch(journal, /onupgradeneeded[\s\S]{0,1200}(abort\(|transaction\.abort|SCHEMA_NOT_READY)/,
  'Journal page must abort/fail on unexpected upgradeneeded instead of becoming schema owner');

forbidMatch(journal, /createObjectStore\(JOURNAL_STORE/, 'Journal page must not create entries store');
forbidMatch(journal, /createObjectStore\(['"]urlStats['"]/, 'Journal page must not create urlStats store');
forbidMatch(journal, /createObjectStore\(['"]pendingAppends['"]/, 'Journal page must not create pendingAppends store');
forbidMatch(journal, /createObjectStore\(['"]pendingDownloads['"]/, 'Journal page must not create pendingDownloads store');
forbidMatch(journal, /createObjectStore\(['"]pendingRemoteSaves['"]/, 'Journal page must not create pendingRemoteSaves store');
forbidMatch(journal, /createObjectStore\(['"]importStaging['"]/, 'Journal page must not create importStaging store');
forbidMatch(journal, /createObjectStore\(['"]journalFinalizations['"]/, 'Journal page must not create finalization store');
forbidMatch(journal, /createObjectStore\(['"]pendingRemoteMutations['"]/, 'Journal page must not create remote mutation store');

console.log('Wave 1 Journal v8 migration source gate: PASS');
