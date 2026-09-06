'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const journal = fs.readFileSync(path.join(ROOT, 'journal.js'), 'utf8');

(function persistedAuthorityContract() {
  assert.match(worker, /journalMutationGeneration/,
    'P0-076 requires one stable-key local Journal bulk-generation control.');
  assert.match(worker, /journalLocalRevision/,
    'P0-076 requires local per-entry incarnation/revision authority.');
  assert.match(worker, /journalExternalEffectLock/,
    'P0-076 requires local entry lifecycle locking for admitted external effects.');
})();

(function portableBoundaryContract() {
  assert.match(worker, /function\s+makePortableJournalEntry\s*\(/,
    'P0-076 requires an explicit portable Journal-entry serializer.');
  assert.equal(
    /JSON\.stringify\(\{\s*\.\.\.entry\s*,\s*journalComments\s*:/.test(worker),
    false,
    'P0-076 local entry authority must not leak through raw export object spread.'
  );
})();

(function renderedAuthoritySnapshotContract() {
  assert.match(journal, /journalMutationAuthority/,
    'P0-076 direct rendered Journal entries must carry ephemeral mutation authority.');
  assert.match(worker, /journalMutationAuthority/,
    'P0-076 service-worker fallback entry projections must carry the same mutation authority contract.');
  assert.match(
    journal,
    /db\.transaction\(\s*\[\s*JOURNAL_STORE\s*,\s*JOURNAL_META_STORE\s*\]\s*,\s*['"]readonly['"]\s*\)/,
    'P0-076 entry and meta authority must be observed in one readonly transaction.'
  );
})();

(function messagePropagationContract() {
  for (const type of [
    'WEBCLIP_JOURNAL_UPDATE_COMMENT',
    'WEBCLIP_JOURNAL_ADD_COMMENT',
    'WEBCLIP_JOURNAL_EDIT_COMMENT',
    'WEBCLIP_JOURNAL_DELETE_COMMENT',
    'WEBCLIP_JOURNAL_DELETE',
    'WEBCLIP_JOURNAL_MARK_READ'
  ]) {
    const index = journal.indexOf(type);
    assert.notEqual(index, -1, `P0-076 source control missing ${type}.`);
    const window = journal.slice(Math.max(0, index - 300), index + 900);
    assert.match(window, /journalMutationAuthority/,
      `P0-076 ${type} must propagate exact rendered mutation authority.`);
  }
  assert.match(journal, /result\.journalMutationAuthority/,
    'P0-076 successful point mutation must return and install the next authority.');
})();

(function clearConfirmationContract() {
  const clearSites = [];
  let cursor = 0;
  while ((cursor = journal.indexOf("type: 'WEBCLIP_JOURNAL_CLEAR'", cursor)) !== -1) {
    clearSites.push(cursor);
    cursor += 10;
  }
  assert(clearSites.length >= 2, 'P0-076 expects both scoped and full Journal clear UI call sites.');
  for (const index of clearSites) {
    const window = journal.slice(Math.max(0, index - 500), index + 900);
    assert.match(window, /journalClearAuthority/,
      'P0-076 every clear confirmation call must carry the exact target-revision authority shown to the user.');
  }
  assert.match(worker, /journalClearAuthority/,
    'P0-076 worker clear path must validate explicit clear target authority, not rely on import expectedJournalRevision by coincidence.');
  assert.match(worker, /stale-journal-revision/,
    'P0-076 stale clear confirmation must have a typed stale-journal-revision outcome.');
})();

(function blindMutationRemovalContract() {
  assert.equal(
    /const\s+updated\s*=\s*\{\s*\.\.\.current\s*,\s*\.\.\.patch\s*,\s*id:\s*current\.id\s*\}/.test(worker),
    false,
    'P0-076 blind current+patch point mutation must be replaced by exact CAS over transaction-current state.'
  );
  assert.equal(
    /async function deleteJournalEntryRecordOnly\([\s\S]*?tx\.objectStore\(JOURNAL_STORE\)\.delete\(id\)/.test(worker),
    false,
    'P0-076 single-entry delete must not perform an id-only delete after a separate stale read.'
  );
  assert.match(worker, /stale-journal-generation/,
    'P0-076 CAS must machine-classify stale Journal generation.');
  assert.match(worker, /stale-entry-generation/,
    'P0-076 CAS must machine-classify stale entry incarnation.');
  assert.match(worker, /stale-entry-revision/,
    'P0-076 CAS must machine-classify stale point revision.');
  assert.match(worker, /stale-legacy-revision/,
    'P0-076 legacy rollout must machine-classify stale exact DB revision.');
  assert.match(worker, /entry-busy/,
    'P0-076 incompatible mutation during a live external-effect lock must be machine-classified as entry-busy.');
})();

console.log('P0-076 committed-source CAS contract: PASS');
