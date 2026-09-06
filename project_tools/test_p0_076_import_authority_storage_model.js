'use strict';

const assert = require('node:assert/strict');

const MAX_IMPORT_ENTRIES = 100000;
const MAX_JOURNAL_IMPORT_BYTES = 50 * 1024 * 1024;
const NORMALIZATION_HEADROOM_BYTES = 16 * 1024 * 1024;
const UUID = '00000000-0000-4000-8000-000000000000';
const MAX_REVISION = Number.MAX_SAFE_INTEGER;

function makeAuthority() {
  return { version: 1, generation: UUID, revision: MAX_REVISION };
}

function logicalAuthorityJsonOverheadBytes() {
  const base = { id: 'x' };
  const withAuthority = { ...base, journalLocalRevision: makeAuthority() };
  return Buffer.byteLength(JSON.stringify(withAuthority), 'utf8') - Buffer.byteLength(JSON.stringify(base), 'utf8');
}

const PER_ENTRY_LOGICAL_AUTHORITY_BYTES = logicalAuthorityJsonOverheadBytes();
assert.equal(PER_ENTRY_LOGICAL_AUTHORITY_BYTES, 117,
  'Exact compact UTF-8 JSON delta for one non-empty entry must remain source-auditable.');

function authoritySurchargeBytes(entryCount) {
  const count = Math.max(0, Math.floor(Number(entryCount) || 0));
  return count * PER_ENTRY_LOGICAL_AUTHORITY_BYTES;
}

(function boundaryCounts() {
  assert.equal(99999 <= MAX_IMPORT_ENTRIES, true);
  assert.equal(100000 <= MAX_IMPORT_ENTRIES, true);
  assert.equal(100001 <= MAX_IMPORT_ENTRIES, false);
  assert.equal(authoritySurchargeBytes(99999), 11699883);
  assert.equal(authoritySurchargeBytes(100000), 11700000);
  assert.equal(authoritySurchargeBytes(100001), 11700117);
})();

(function maxImportLogicalPreflightDelta() {
  const current = MAX_JOURNAL_IMPORT_BYTES + NORMALIZATION_HEADROOM_BYTES;
  const p0076Aware = current + authoritySurchargeBytes(MAX_IMPORT_ENTRIES);
  assert.equal(current, 69206016);
  assert.equal(p0076Aware, 80906016);
  assert.equal(p0076Aware - current, 11700000);
})();

function decideImportAdmission({ estimateAvailable, freeBytes, requiredLogicalBytes, transactionOutcome }) {
  if (!estimateAvailable) return 'reject-estimate-unavailable';
  if (freeBytes < requiredLogicalBytes) return 'reject-preflight-low';
  if (transactionOutcome === 'abort-quota' || transactionOutcome === 'abort-io') return 'failed-no-commit';
  if (transactionOutcome === 'complete') return 'committed';
  return 'unknown-no-success-claim';
}

(function estimateIsNotCommitTruth() {
  const required = 80906016;
  assert.equal(decideImportAdmission({ estimateAvailable: false, freeBytes: 0, requiredLogicalBytes: required, transactionOutcome: 'complete' }), 'reject-estimate-unavailable');
  assert.equal(decideImportAdmission({ estimateAvailable: true, freeBytes: required - 1, requiredLogicalBytes: required, transactionOutcome: 'complete' }), 'reject-preflight-low');
  assert.equal(decideImportAdmission({ estimateAvailable: true, freeBytes: required, requiredLogicalBytes: required, transactionOutcome: 'abort-quota' }), 'failed-no-commit');
  assert.equal(decideImportAdmission({ estimateAvailable: true, freeBytes: required + 1024 * 1024, requiredLogicalBytes: required, transactionOutcome: 'abort-io' }), 'failed-no-commit');
  assert.equal(decideImportAdmission({ estimateAvailable: true, freeBytes: required, requiredLogicalBytes: required, transactionOutcome: 'complete' }), 'committed');
})();

console.log('P0-076 import authority storage model: PASS');
