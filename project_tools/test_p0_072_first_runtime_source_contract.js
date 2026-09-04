'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');

assert.match(source, /const\s+JOURNAL_RESET_DISPOSITION_VERSION\s*=\s*1\s*;/,
  'P0-072: versioned reset disposition constant is required.');
assert.match(source, /const\s+JOURNAL_EXTERNAL_STAGE_VERSION\s*=\s*1\s*;/,
  'P0-072: explicit external stage schema version is required.');
assert.match(source, /journalLocalTokenSalt:v1/,
  'P0-072: installation-local token salt control key is required.');
assert.match(source, /legacyPendingFence:v1:/,
  'P0-072: legacy anti-rematerialization fence namespace is required.');
assert.match(source, /externalStages/,
  'P0-072: new local/remote rows require explicit persisted stage state.');
assert.match(source, /downloadStart/,
  'P0-072: local download-start stage must be explicit.');
assert.match(source, /admitted-now/,
  'P0-072: stage admission requires a one-shot admitted-now result.');
assert.match(source, /already-admitted/,
  'P0-072: already-admitted must be distinguishable from new mutation permission.');
assert.match(source, /suppressed-reset-detached/,
  'P0-072: Journal append must expose reset-detached suppression.');
assert.match(source, /suppressed-missing/,
  'P0-072: missing authority must remain distinct from reset-detached suppression.');
assert.match(source, /readLegacyPendingJournalSnapshotBounded/,
  'P0-072: destructive paths require a read-only bounded legacy snapshot helper.');

assert.equal(
  /async function clearJournalEntries[\s\S]{0,3000}?await migrateLegacyPendingJournalAppends\(\)/.test(source),
  false,
  'P0-072: clearJournalEntries must not perform ordinary mutating pre-migration.'
);
assert.equal(
  /async function commitStagedJournalImport[\s\S]{0,3000}?await migrateLegacyPendingJournalAppends\(\)/.test(source),
  false,
  'P0-072: import-replace must not perform ordinary mutating pre-migration.'
);
assert.equal(
  /pendingStore\.clear\(\);\s*pendingDownloadStore\.clear\(\);\s*pendingRemoteStore\.clear\(\);/.test(source),
  false,
  'P0-072: full reset must not clear recovery stores.'
);
assert.equal(
  /if \(\(urlKey && pendingUrlKey === urlKey\) \|\| \(siteKey && pendingSiteKey === siteKey\)\) cursor\.delete\(\);/.test(source),
  false,
  'P0-072: scoped reset must not delete matching recovery authority.'
);

console.log('P0-072 first runtime source contract: PASS');
