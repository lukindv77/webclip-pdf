'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');

function section(startMarker, endMarker) {
  const start = SOURCE.indexOf(startMarker);
  const end = SOURCE.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start, `missing source section: ${startMarker} -> ${endMarker}`);
  return SOURCE.slice(start, end);
}

function throwsCode(fn, code, message) {
  assert.throws(fn, (error) => error?.code === code, message);
}

const helperSource = section('function normalizeJournalBackupNamespace', 'function readJournalBackupStorage');
const context = vm.createContext({
  Object,
  Number,
  String,
  Error,
  JOURNAL_BACKUP_NAMESPACE_VERSION: 1,
  MAX_YANDEX_ACCOUNT_FIELD_CHARS: 1024,
  boundedYandexExternalText(value, max) { return String(value || '').slice(0, max); },
  normalizeDiskPath(value) {
    let p = String(value || '').trim().replace(/\\/g, '/').replace(/^disk:/i, '');
    if (!p) return '';
    if (!p.startsWith('/')) p = `/${p}`;
    const stack = [];
    for (const segment of p.split('/')) {
      if (!segment || segment === '.') continue;
      if (segment === '..') { if (stack.length) stack.pop(); continue; }
      stack.push(segment);
    }
    return `/${stack.join('/')}` || '/';
  },
  getJournalBackupFolderFromRoot(rootPath) {
    const root = String(rootPath || '').replace(/\/$/, '');
    return root ? `${root}/Backup/Journal` : '';
  },
  WebClipYandexOperationContext: {
    validateOperationContext(value) {
      if (!value?.accessToken || !value?.accountUid || !value?.rootPath) {
        const error = new Error('bad context'); error.code = 'BAD_CONTEXT'; throw error;
      }
      return Object.freeze({ ...value });
    }
  }
});
vm.runInContext(`${helperSource}\nthis.ns = { normalizeJournalBackupNamespace, makeJournalBackupNamespace, sameJournalBackupNamespace, assertJournalBackupNamespaceForOperation };`, context);

let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks += 1; };
const eq = (actual, expected, message) => { assert.strictEqual(actual, expected, message); checks += 1; };

const A1 = context.ns.makeJournalBackupNamespace('acct-A', '/R1');
eq(A1.version, 1, 'namespace version');
eq(A1.accountUid, 'acct-A', 'semantic account retained');
eq(A1.rootPath, '/R1', 'root normalized');
eq(A1.journalRootPath, '/R1/Backup/Journal', 'journal root derived');
ok(Object.isFrozen(A1), 'namespace immutable');
ok(!/token|authorization|signed/i.test(JSON.stringify(A1)), 'namespace secret free');

const A1b = context.ns.makeJournalBackupNamespace(' acct-A ', 'disk:/R1/./Archive/../');
ok(context.ns.sameJournalBackupNamespace(A1, A1b), 'normalized same namespace matches');
const A2 = context.ns.makeJournalBackupNamespace('acct-A', '/R2');
const B1 = context.ns.makeJournalBackupNamespace('acct-B', '/R1');
ok(!context.ns.sameJournalBackupNamespace(A1, A2), 'same account different root differs');
ok(!context.ns.sameJournalBackupNamespace(A1, B1), 'different account same root differs');

eq(context.ns.normalizeJournalBackupNamespace({ version: 2, accountUid: 'acct-A', rootPath: '/R1', journalRootPath: '/R1/Backup/Journal' }), null, 'wrong version rejected');
eq(context.ns.normalizeJournalBackupNamespace({ version: 1, accountUid: '', rootPath: '/R1', journalRootPath: '/R1/Backup/Journal' }), null, 'missing account rejected');
eq(context.ns.normalizeJournalBackupNamespace({ version: 1, accountUid: 'acct-A', rootPath: '/R1', journalRootPath: '/R2/Backup/Journal' }), null, 'derived journal root mismatch rejected');

const opA1 = { accessToken: 'secret-token', accountUid: 'acct-A', rootPath: '/R1', createPublicLinks: true, capturedAt: 1 };
eq(context.ns.assertJournalBackupNamespaceForOperation(A1, opA1).accountUid, 'acct-A', 'matching operation context accepted');
throwsCode(() => context.ns.assertJournalBackupNamespaceForOperation(A2, opA1), 'JOURNAL_BACKUP_NAMESPACE_CONTEXT_MISMATCH', 'root mismatch rejected');
throwsCode(() => context.ns.assertJournalBackupNamespaceForOperation(B1, opA1), 'JOURNAL_BACKUP_NAMESPACE_CONTEXT_MISMATCH', 'account mismatch rejected');
throwsCode(() => context.ns.assertJournalBackupNamespaceForOperation(null, opA1), 'JOURNAL_BACKUP_NAMESPACE_INVALID', 'missing namespace rejected');
checks += 3;

const acquire = section('async function acquireJournalBackupLease(', 'async function renewJournalBackupLease(');
ok(acquire.includes('backupNamespace'), 'lease acquisition accepts namespace');
ok(acquire.includes('backupNamespace: namespace'), 'lease durably records namespace');
ok(acquire.indexOf('normalizeJournalBackupNamespace(backupNamespace)') < acquire.indexOf('const lease = {'), 'namespace validated before lease construction');

const renew = section('async function renewJournalBackupLease(', 'async function releaseJournalBackupLease(');
ok(renew.includes('sameJournalBackupNamespace(current?.backupNamespace, leaseNamespace)'), 'renew requires token plus namespace');
const release = section('async function releaseJournalBackupLease(', 'async function uploadJournalExportStagedToYandex(');
ok(release.includes('sameJournalBackupNamespace(current?.backupNamespace, leaseNamespace)'), 'release cannot delete another namespace lease');

const upload = section('async function uploadJournalExportStagedToYandex(', 'async function recoverPendingJournalBackup(');
ok(upload.includes('backupNamespace = null'), 'upload accepts namespace');
ok(upload.includes('assertJournalBackupNamespaceForOperation(backupNamespace, operationContext)'), 'upload binds namespace to immutable operation context');
ok(upload.includes('backupNamespace: namespace'), 'prepared checkpoint carries namespace');
ok(upload.includes('normalizeDiskPath(journalRoot) !== namespace.journalRootPath'), 'provisioned Journal path must equal namespace root');

const recovery = section('async function recoverPendingJournalBackup(', 'async function finalizeJournalBackupSuccessHousekeeping(');
const pendingNsAt = recovery.indexOf('const pendingNamespace = normalizeJournalBackupNamespace(pending?.backupNamespace)');
const unboundAt = recovery.indexOf("error.code = 'JOURNAL_BACKUP_NAMESPACE_UNBOUND_CHECKPOINT'");
const pathAt = recovery.indexOf('isAllowedJournalBackupPath(remotePath, pendingNamespace.journalRootPath)');
const mismatchAt = recovery.indexOf('!sameJournalBackupNamespace(pendingNamespace, currentNamespace)');
const ensureAt = recovery.indexOf('const structure = await ensureYandexServiceFolders');
const firstRemoteAt = recovery.indexOf("await yandexApi('/resources'");
ok(pendingNsAt >= 0, 'recovery reads durable namespace');
ok(unboundAt > pendingNsAt && unboundAt < ensureAt, 'legacy unbound checkpoint fails before provisioning');
ok(pathAt > pendingNsAt && pathAt < ensureAt, 'checkpoint path is validated against historical namespace before provisioning');
ok(mismatchAt > pathAt && mismatchAt < ensureAt, 'namespace mismatch fails before provisioning');
ok(ensureAt >= 0 && firstRemoteAt > ensureAt, 'remote verification occurs only after namespace gate');
ok(recovery.includes("error.code = 'JOURNAL_BACKUP_NAMESPACE_MISMATCH'"), 'mismatch has explicit fail-closed code');
ok(recovery.includes('backupNamespace: pendingNamespace'), 'recovered result preserves namespace');
const preEnsure = recovery.slice(0, ensureAt);
ok(!preEnsure.includes("chrome.storage.local.remove(JOURNAL_BACKUP_PENDING_KEY)"), 'legacy/mismatched checkpoint is preserved before remote authority');
const agingAt = recovery.indexOf('const attemptCount = Math.max(0, Number(pending.attemptCount || 0)) + 1');
ok(agingAt > mismatchAt, '404 aging is reachable only after exact namespace match');

const pipeline = section('async function exportJournalBackupToYandex(', 'function parseJournalMonthFolder(');
const statusAt = pipeline.indexOf('status = await getJournalBackupStatus()');
const manualContextAt = pipeline.indexOf('operationContext = await captureCurrentYandexOperationContext()');
const namespaceAt = pipeline.indexOf('const backupNamespace = makeJournalBackupNamespace(operationContext.accountUid, operationContext.rootPath)');
const staleStatusAt = pipeline.indexOf("error.code = 'JOURNAL_BACKUP_NAMESPACE_STATUS_STALE'");
const leaseAt = pipeline.indexOf('lease = await acquireJournalBackupLease(operationId, reason, backupNamespace)');
const recoverAt = pipeline.indexOf('recoverPendingJournalBackup(status, operationId');
const uploadAt = pipeline.indexOf('uploadJournalExportStagedToYandex(staged');
ok(statusAt >= 0, 'status read remains explicit');
ok(manualContextAt > statusAt, 'manual backup captures immutable operation context');
ok(namespaceAt > manualContextAt, 'namespace derives from operation context');
ok(staleStatusAt > namespaceAt && staleStatusAt < leaseAt, 'root race fails before lease/remote work');
ok(leaseAt > namespaceAt, 'lease is namespace-bound before staging/upload');
ok(recoverAt > leaseAt && pipeline.slice(recoverAt, uploadAt).includes('backupNamespace'), 'recovery receives namespace');
ok(uploadAt > recoverAt && pipeline.slice(uploadAt, uploadAt + 800).includes('backupNamespace'), 'new upload receives namespace');

const status = section('async function getJournalBackupStatus()', 'async function ensureYandexServiceFolders(');
ok(status.includes('journalBackupState.lastSuccessAt'), 'remaining scheduler state is still global');
ok(!SOURCE.includes('journalBackupStateByNamespace'), 'namespace-local scheduler state remains future P1-179 work');

console.log(`P1-179 backup namespace recovery runtime: PASS; checks=${checks}; checkpoint_namespace=true; lease_namespace=true; mismatch_remote_calls=0-by-source-order; legacy_checkpoint_preserved=true; scheduler_state_namespace_local=false; same_account_root_rotation=fail-closed-pending-later-readonly-reconcile; live_provider_calls=0`);
