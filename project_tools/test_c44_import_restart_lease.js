const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// C44 defensive regression for P1-215, with P0-013 receipt binding preserved.
// It models only local ownership/integrity state and uses no remote services.
const root = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const journal = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');

function sourceSlice(source, start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  assert(a >= 0, `missing source marker: ${start}`);
  assert(b > a, `missing end marker: ${end}`);
  return source.slice(a, b);
}

const leaseBlock = sourceSlice(
  worker,
  'function normalizeJournalImportOwnerSessionId',
  'async function inspectStagedJournalImportStream'
);
const commit = sourceSlice(
  worker,
  'async function commitStagedJournalImport',
  'async function previewStagedJournalImport'
);
const acquire = sourceSlice(
  worker,
  'async function acquireJournalImportLease',
  'function journalImportLeaseResponse'
);
const renew = sourceSlice(
  worker,
  'async function renewJournalImportLease',
  'async function expireJournalImportLeaseIfToken'
);
const resume = sourceSlice(
  worker,
  'async function resumePendingJournalImport',
  'async function cancelPendingJournalImport'
);
const discard = sourceSlice(
  worker,
  'async function discardOwnedJournalImport',
  'function assertJournalImportLeaseAuthority'
);
const cleanup = sourceSlice(
  worker,
  'async function cleanupTransferPayloads',
  'function pdfCacheKey'
);
const handlerStart = worker.indexOf('chrome.runtime.onMessage.addListener');
assert(handlerStart >= 0);
const handler = worker.slice(handlerStart);

assert(worker.includes("const JOURNAL_IMPORT_LEASE_KEY = 'journalImportLease';"));
assert(worker.includes('const JOURNAL_IMPORT_LEASE_TTL_MS = 2 * 60 * 1000;'));
assert(worker.includes('const JOURNAL_IMPORT_CHECKPOINT_TTL_MS = JOURNAL_IMPORT_STAGING_TTL_MS;'));
assert(acquire.includes('if (current.hardExpiresAt > now)'));
assert(acquire.includes("'JOURNAL_IMPORT_CHECKPOINT_EXISTS'"));
assert(renew.includes('current.leaseToken !== token || current.ownerSessionId !== owner'));
assert(renew.includes('current.leaseExpiresAt <= now || current.hardExpiresAt <= now'));
assert(resume.includes('current.leaseExpiresAt > claimNow'));
assert(resume.includes('leaseToken: normalizeJournalImportLeaseToken(crypto.randomUUID'));
assert(resume.includes('inspectStagedJournalImportStream(oldReceipt.stagingKey)'));
assert(resume.includes('journalRevisionSnapshot'));
assert(discard.includes('current.previewReceipt.stagingKey !== key'));
assert(discard.includes('current.leaseToken !== token || current.ownerSessionId !== owner'));

const leaseRead = commit.indexOf('metaStore.get(JOURNAL_IMPORT_LEASE_KEY)');
const authorityCheck = commit.indexOf('assertJournalImportLeaseAuthority', leaseRead);
const revisionRead = commit.indexOf('metaStore.get(JOURNAL_META_REVISION_KEY)', authorityCheck);
const leaseDelete = commit.indexOf('metaStore.delete(JOURNAL_IMPORT_LEASE_KEY)', revisionRead);
const guardedReplace = commit.indexOf('beginReplace();', leaseDelete);
assert(leaseRead >= 0);
assert(authorityCheck > leaseRead);
assert(revisionRead > authorityCheck);
assert(leaseDelete > revisionRead);
assert(guardedReplace > leaseDelete);

assert(cleanup.includes("protectedImportKey = '*'"));
assert(cleanup.includes("kind === 'journal-import-manifest'"));
assert(cleanup.includes("kind === 'journal-import-chunk-blob'"));
assert(cleanup.includes('lease.hardExpiresAt > now'));
assert(worker.includes("reapExpiredJournalImportCheckpoint('worker-start')"));

for (const type of [
  'WEBCLIP_JOURNAL_IMPORT_PENDING',
  'WEBCLIP_JOURNAL_IMPORT_LEASE_RENEW',
  'WEBCLIP_JOURNAL_IMPORT_RESUME_PENDING',
  'WEBCLIP_JOURNAL_IMPORT_CANCEL_PENDING'
]) {
  const pos = handler.indexOf(`case '${type}'`);
  assert(pos >= 0, `missing handler: ${type}`);
  assert(handler.slice(pos, pos + 500).includes("assertSaveAsOwnerPage(sender, 'journal.html')"));
}

assert(journal.includes('const JOURNAL_IMPORT_LEASE_HEARTBEAT_MS = 30 * 1000;'));
assert(journal.includes("type: 'WEBCLIP_JOURNAL_IMPORT_LEASE_RENEW'"));
assert(journal.includes("type: 'WEBCLIP_JOURNAL_IMPORT_RESUME_PENDING'"));
assert(journal.includes("type: 'WEBCLIP_JOURNAL_IMPORT_CANCEL_PENDING'"));
assert(journal.includes('ownerSessionId: journalImportOwnerSessionId'));
assert(journal.includes('.then(() => checkForPendingJournalImport())'));
assert(journal.includes('Кнопка «Отмена» удалит только временный staged import; текущий журнал не изменится.'));
assert(journal.includes('journalImportReplaceConfirmationText(preview, sourceLabel)'));

const sandbox = {
  console,
  crypto: { randomUUID: () => 'lease-test-token' }
};
vm.createContext(sandbox);
vm.runInContext(`
  const JOURNAL_IMPORT_LEASE_VERSION = 1;
  const JOURNAL_IMPORT_LEASE_TTL_MS = 2 * 60 * 1000;
  const JOURNAL_IMPORT_CHECKPOINT_TTL_MS = 2 * 60 * 60 * 1000;
  function normalizeJournalImportPreviewReceipt(value) {
    if (!value || typeof value !== 'object') throw new Error('receipt');
    return Object.freeze({ ...value });
  }
  ${leaseBlock}
  globalThis.__leaseTest = {
    makeJournalImportLeaseRecord,
    normalizeJournalImportLeaseRecord,
    assertJournalImportLeaseAuthority
  };
`, sandbox);

const now = Date.now();
const stagedAt = now - 1000;
const receipt = {
  version: 1,
  mode: 'replace',
  stagingKey: 'journal-import-test',
  stagingGeneration: `manifest:${stagedAt}:1:42`,
  source: 'file',
  operationId: 'operation-test',
  contentSha256: 'a'.repeat(64),
  entryCount: 1,
  exportedAt: '2026-09-04T00:00:00.000Z',
  expectedJournalRevision: 'revision-test'
};
const api = sandbox.__leaseTest;
const lease = api.makeJournalImportLeaseRecord(receipt, 'journal-page-test', now);
assert.equal(lease.leaseToken, 'lease-test-token');
assert.equal(lease.ownerSessionId, 'journal-page-test');
assert.equal(lease.createdAt, stagedAt);
assert.equal(lease.hardExpiresAt, stagedAt + 2 * 60 * 60 * 1000);
assert.equal(lease.leaseExpiresAt, now + 2 * 60 * 1000);
assert.throws(
  () => api.normalizeJournalImportLeaseRecord({ ...lease, unexpected: true }),
  /состав checkpoint/
);
assert.doesNotThrow(() => api.assertJournalImportLeaseAuthority(lease, {
  leaseToken: lease.leaseToken,
  ownerSessionId: lease.ownerSessionId,
  previewReceipt: receipt
}, now + 1));
assert.throws(() => api.assertJournalImportLeaseAuthority(lease, {
  leaseToken: 'different-token',
  ownerSessionId: lease.ownerSessionId,
  previewReceipt: receipt
}, now + 1), /другой странице|истёк/);
assert.throws(() => api.assertJournalImportLeaseAuthority(lease, {
  leaseToken: lease.leaseToken,
  ownerSessionId: lease.ownerSessionId,
  previewReceipt: receipt
}, lease.leaseExpiresAt), /другой странице|истёк/);

console.log('C44 P1-215 durable import lease/restart ownership regression PASS');
