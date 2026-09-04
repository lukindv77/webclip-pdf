'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');

function asyncFunctionBlock(name) {
  const marker = `async function ${name}`;
  const start = source.indexOf(marker);
  assert(start >= 0, `Missing source function ${name}.`);
  const next = source.indexOf('\nasync function ', start + marker.length);
  return source.slice(start, next >= 0 ? next : source.length);
}

(function destructivePathsUseReadOnlyLegacySnapshot() {
  const clearBlock = asyncFunctionBlock('clearJournalEntries');
  const importBlock = asyncFunctionBlock('commitStagedJournalImport');

  assert.equal(clearBlock.includes('await migrateLegacyPendingJournalAppends()'), false,
    'P0-072: destructive clear must not commit ordinary legacy migration before its atomic reset transaction.');
  assert.equal(importBlock.includes('await migrateLegacyPendingJournalAppends()'), false,
    'P0-072: import replace must not commit ordinary legacy migration before its atomic reset transaction.');

  assert.match(source, /async function readLegacyPendingJournalSnapshotBounded\s*\(/,
    'P0-072: destructive paths need a bounded read-only legacy snapshot helper.');
  assert.match(clearBlock, /readLegacyPendingJournalSnapshotBounded\s*\(/,
    'P0-072: clear must acquire the bounded legacy snapshot before its reset transaction.');
  assert.match(importBlock, /readLegacyPendingJournalSnapshotBounded\s*\(/,
    'P0-072: import replace must acquire the bounded legacy snapshot before its reset transaction.');
})();

(function ordinaryMigrationIsFenceAware() {
  const migrationBlock = asyncFunctionBlock('migrateLegacyPendingJournalAppends');

  assert.match(source, /legacyPendingFence:v1:/,
    'P0-072: legacy rematerialization needs a versioned migration-fence namespace.');
  assert.match(migrationBlock, /JOURNAL_META_STORE/,
    'P0-072: legacy migration transaction must include meta so reset fences serialize with rematerialization.');
  assert.equal(/for \(const item of items\)\s+pending\.put\(item\);/.test(migrationBlock), false,
    'P0-072: legacy migration must not whole-record overwrite current pending authority.');
  assert.match(migrationBlock, /journalResetDisposition|legacyPendingFence/,
    'P0-072: migration must preserve current reset disposition or consume a legacy fence.');
})();

(function legacyFenceKeyIsBounded() {
  assert.match(source, /legacyPendingFenceKey|legacyPendingFenceDigest/,
    'P0-072: fence lookup needs a dedicated bounded key helper.');
  assert.match(source, /WebClipSha256/,
    'P0-072: exact legacy ids should use the bundled synchronous SHA-256 primitive for bounded fence keys.');
  assert.equal(/legacyPendingFence:v1:\$\{(?:legacy)?id\}/.test(source), false,
    'P0-072: raw legacy id must not be concatenated directly into a meta fence key.');
})();

console.log('P0-072 destructive legacy source contract: PASS');
