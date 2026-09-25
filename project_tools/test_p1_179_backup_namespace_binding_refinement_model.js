'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const REGISTRY = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_REGISTRY.md'), 'utf8');
const EVIDENCE = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_P1_179_BACKUP_NAMESPACE_BINDING_REFINEMENT_2026-09-10_EVIDENCE.md'), 'utf8');
const IMPLEMENTATION = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_P1_179_BACKUP_NAMESPACE_RECOVERY_2026-09-24_EVIDENCE.md'), 'utf8');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));

let cases = 0;
function check(name, fn) {
  try { fn(); cases += 1; }
  catch (error) { error.message = `${name}: ${error.message}`; throw error; }
}
function has(text, needle) { assert.ok(text.includes(needle), `missing ${JSON.stringify(needle)}`); }
function lacks(text, needle) { assert.ok(!text.includes(needle), `unexpected ${JSON.stringify(needle)}`); }
function section(signature) {
  const i = SOURCE.indexOf(signature);
  assert.ok(i >= 0, `function missing: ${signature}`);
  const next = SOURCE.indexOf('\nasync function ', i + signature.length);
  return SOURCE.slice(i, next >= 0 ? next : SOURCE.length);
}
function objectLiteral(text, anchor) {
  const i = text.indexOf(anchor);
  assert.ok(i >= 0, `object anchor missing: ${anchor}`);
  const end = text.indexOf('\n  };', i);
  assert.ok(end >= 0, `object end missing after ${anchor}`);
  return text.slice(i, end + 5);
}

function makeNs(accountUid, rootPath) {
  const account = String(accountUid || '').trim();
  let root = String(rootPath || '').trim().replace(/\/+$/, '');
  if (!root) root = '/';
  if (!account || !root.startsWith('/')) return null;
  return Object.freeze({
    schema: 1,
    accountUid: account,
    rootPath: root,
    journalRootPath: `${root === '/' ? '' : root}/Backup/Journal` || '/Backup/Journal',
  });
}
function sameNs(a, b) {
  return Boolean(a && b && a.schema === b.schema && a.accountUid === b.accountUid && a.rootPath === b.rootPath);
}
function validCheckpoint(cp) {
  if (!cp?.namespace?.accountUid || !cp?.namespace?.rootPath || !cp?.remotePath) return false;
  return cp.remotePath.startsWith(`${cp.namespace.journalRootPath}/`);
}
function reconcile(cp, live) {
  if (!validCheckpoint(cp)) return { outcome: 'legacy-or-insufficient', remoteCalls: 0, mutating: false };
  if (cp.namespace.accountUid !== live.accountUid) return { outcome: 'foreign-account', remoteCalls: 0, mutating: false };
  return {
    outcome: 'read-only-reconcile',
    namespace: cp.namespace,
    remotePath: cp.remotePath,
    currentRootDiagnosticOnly: cp.namespace.rootPath !== live.rootPath,
    remoteCalls: 1,
    mutating: false,
  };
}
function renewLease(stored, offered) {
  return Boolean(stored && offered && stored.token === offered.token && sameNs(stored.namespace, offered.namespace));
}
function age404(cp, queryNs, queryPath, policyEligible = true) {
  if (!validCheckpoint(cp) || !sameNs(cp.namespace, queryNs) || queryPath !== cp.remotePath) return { increment: 0, retire: false };
  return { increment: policyEligible ? 1 : 0, retire: false };
}
function stateKey(namespace) { return `${namespace.accountUid}\u0000${namespace.rootPath}`; }
function stateFor(map, namespace) { return map[stateKey(namespace)] || {}; }
function due(map, namespace, now, interval) {
  const state = stateFor(map, namespace);
  return !state.lastSuccessAt || now >= state.lastSuccessAt + interval;
}
function retryBlocked(map, namespace, now, retry) {
  const state = stateFor(map, namespace);
  return Boolean(state.lastFailureAt && (!state.lastSuccessAt || state.lastFailureAt > state.lastSuccessAt) && now < state.lastFailureAt + retry);
}
function secretFree(namespace) {
  const text = JSON.stringify(namespace).toLowerCase();
  return !['accesstoken', 'access_token', 'refreshtoken', 'refresh_token', 'authorization', 'signedurl', 'oauthcode'].some((term) => text.includes(term));
}

// Canonical owner and scope contract.
check('O01 P1-179 active', () => has(REGISTRY, '| P1-179 | ACTIVE |'));
check('O02 P1-179 namespace wording', () => has(REGISTRY, 'Backup scheduler state and pending backup checkpoint are immutable account/root namespaces'));
check('O03 P0-073 immutable account/root', () => has(REGISTRY, 'Remote-save completion/recovery is immutable account/root scoped'));
check('O04 P0-074 immutable operation context', () => has(REGISTRY, 'Long Yandex operation uses one immutable auth/account/root/config/publication operation context and generation'));
check('O05 P1-138 observation boundary', () => has(REGISTRY, 'Read-like Yandex list/fetch/status flows must not hide provisioning/mutation authority'));
check('O06 P1-177 scheduler generation owner remains distinct and implemented', () => has(REGISTRY, 'Backup scheduler no-auth/user pause, proven-auth resume generation, exact alarm `(generation,dueAt)` receipts'));
check('O07 P1-178 auth generation contract implemented', () => lacks(REGISTRY, '| P1-178 | ACTIVE |'));
check('O08 P1-184 exact content owner', () => has(REGISTRY, 'path+size cannot authorize adoption or publication'));
check('O09 research only', () => has(EVIDENCE, 'RESEARCH-ONLY / CURRENT-MAIN ABSORPTION REFINEMENT'));
check('O10 no new P code', () => has(EVIDENCE, 'New P-code: **NO**'));
check('O11 runtime unchanged', () => has(EVIDENCE, 'Production/runtime modification: **NONE**'));
check('O12 no L5', () => has(EVIDENCE, 'Real Chrome/Yandex L5: **NOT RUN**'));
check('O13 no release activation', () => has(EVIDENCE, 'Release-policy activation: **NONE**'));
check('O14 baseline pinned', () => has(EVIDENCE, '9ab02ceaa70057dc57bcdd0eb5bb937097496869'));
check('O15 manifest unchanged', () => assert.equal(MANIFEST.version, '0.9.8'));

// Current-main absorption review: namespace authority is partially implemented.
check('S01 lease key', () => has(SOURCE, "const JOURNAL_BACKUP_LEASE_KEY = 'webclipJournalBackupLease'"));
check('S02 pending key', () => has(SOURCE, "const JOURNAL_BACKUP_PENDING_KEY = 'webclipJournalBackupPendingUpload'"));
check('S03 runtime namespace authority exists', () => has(SOURCE, 'normalizeJournalBackupNamespace'));
const acquire = section('async function acquireJournalBackupLease(');
check('S04 lease acquisition remains serialized', () => has(acquire, 'runIndexedDbTransactionBounded'));
const leaseObject = objectLiteral(acquire, 'const lease = {');
check('S05 lease token present', () => has(leaseObject, 'token'));
check('S06 lease operationId present', () => has(leaseObject, 'operationId'));
check('S07 lease carries backupNamespace', () => has(leaseObject, 'backupNamespace: namespace'));
check('S08 lease namespace is validated before construction', () => has(acquire, 'normalizeJournalBackupNamespace(backupNamespace)'));
const renew = section('async function renewJournalBackupLease(');
check('S09 renewal token CAS preserved', () => has(renew, 'current?.token !== lease.token'));
check('S10 renewal also requires namespace CAS', () => has(renew, 'sameJournalBackupNamespace(current?.backupNamespace, leaseNamespace)'));
const upload = section('async function uploadJournalExportStagedToYandex(');
const pendingObject = objectLiteral(upload, 'const pending = {');
check('S11 prepared phase present', () => has(pendingObject, "phase: 'prepared'"));
check('S12 pending remotePath present', () => has(pendingObject, 'remotePath'));
check('S13 pending expectedBytes present', () => has(pendingObject, 'expectedBytes'));
check('S14 pending checkpoint carries namespace', () => has(pendingObject, 'backupNamespace: namespace'));
check('S15 upload binds namespace to immutable operation context', () => has(upload, 'assertJournalBackupNamespaceForOperation(backupNamespace, operationContext)'));
const recovery = section("async function recoverPendingJournalBackup(status, operationId = '', { operationContext = null, beforeRemoteChild = null, backupNamespace = null } = {})");
check('S16 recovery loads pending checkpoint', () => has(recovery, 'JOURNAL_BACKUP_PENDING_KEY'));
check('S17 namespace/path/mismatch gates precede current provisioning', () => {
  const namespaceAt = recovery.indexOf('normalizeJournalBackupNamespace(pending?.backupNamespace)');
  const pathAt = recovery.indexOf('isAllowedJournalBackupPath(remotePath, pendingNamespace.journalRootPath)');
  const mismatchAt = recovery.indexOf('!sameJournalBackupNamespace(pendingNamespace, currentNamespace)');
  const ensureAt = recovery.indexOf('ensureYandexServiceFolders({');
  assert.ok(namespaceAt >= 0 && pathAt > namespaceAt && mismatchAt > pathAt && ensureAt > mismatchAt);
});
check('S17b legacy/mismatch checkpoints fail closed before remote calls', () => {
  const ensureAt = recovery.indexOf('ensureYandexServiceFolders({');
  const preEnsure = recovery.slice(0, ensureAt);
  has(preEnsure, 'JOURNAL_BACKUP_NAMESPACE_UNBOUND_CHECKPOINT');
  has(preEnsure, 'JOURNAL_BACKUP_NAMESPACE_MISMATCH');
  lacks(preEnsure, "chrome.storage.local.remove(JOURNAL_BACKUP_PENDING_KEY)");
});
const status = section('async function getJournalBackupStatus()');
check('S18 status reads yandexConfig', () => has(status, 'yandexConfig'));
check('S19 status reads versioned backup state store', () => has(status, 'journalBackupState'));
check('S20 status root from current config', () => has(status, "const rootPath = normalizeDiskPath(yandexConfig.rootPath || '')"));
check('S21 status derives current semantic account/root namespace', () => has(status, 'makeJournalBackupNamespace(accountUid, rootPath)'));
check('S22 status selects namespace-local state', () => has(status, 'getJournalBackupStateForNamespace(journalBackupState, backupNamespace)'));
check('S23 namespace-local success/failure/path', () => { has(status, 'namespaceState.lastSuccessAt'); has(status, 'namespaceState.lastFailureAt'); has(status, 'namespaceState.lastRemotePath'); });
const stateStore = section('function journalBackupNamespaceStateKey(');
check('S24 state store versioned', () => has(stateStore, 'JOURNAL_BACKUP_STATE_VERSION'));
check('S25 state store preserves legacy flat state only as unbound', () => has(stateStore, 'legacyUnboundState'));
check('S26 state mutation requires namespace', () => { has(stateStore, 'mutateJournalBackupStateForNamespace'); has(stateStore, 'JOURNAL_BACKUP_STATE_NAMESPACE_REQUIRED'); });
check('S27 pipeline outcome writes are namespace-bound', () => { has(SOURCE, 'mutateJournalBackupStateForNamespace(backupNamespace'); lacks(SOURCE, 'await mutateJournalBackupState((previous)'); });

// Namespace identity semantics.
const ar1 = makeNs('A', '/R1');
const ar2 = makeNs('A', '/R2');
const br1 = makeNs('B', '/R1');
check('I01 namespace valid', () => assert.ok(ar1));
check('I02 same account different root differs', () => assert.equal(sameNs(ar1, ar2), false));
check('I03 different account same root differs', () => assert.equal(sameNs(ar1, br1), false));
check('I04 normalized same namespace matches', () => assert.equal(sameNs(ar1, makeNs('A', '/R1/')), true));
check('I05 journal root derived', () => assert.equal(ar1.journalRootPath, '/R1/Backup/Journal'));
check('I06 no token material', () => assert.equal(Object.prototype.hasOwnProperty.call(ar1, 'token'), false));
check('I07 durable namespace secret free', () => assert.equal(secretFree(ar1), true));

const cp = { phase: 'prepared', namespace: ar1, remotePath: '/R1/Backup/Journal/2026-09/a.json', attemptCount: 0 };
const states = { [stateKey(ar1)]: { lastSuccessAt: 1000, lastFailureAt: 2000, lastRemotePath: cp.remotePath } };

// Deterministic negative matrix N01-N28.
check('N01 A/R1 to current A/R2 reconciles historical R1', () => assert.equal(reconcile(cp, { accountUid: 'A', rootPath: '/R2' }).namespace.rootPath, '/R1'));
check('N02 A/R1 to B/R1 zero remote', () => assert.equal(reconcile(cp, { accountUid: 'B', rootPath: '/R1' }).remoteCalls, 0));
check('N03 A/R1 to B/R2 zero remote', () => assert.equal(reconcile(cp, { accountUid: 'B', rootPath: '/R2' }).remoteCalls, 0));
check('N04 token rotation same account/root permits read reconcile', () => assert.equal(reconcile(cp, { accountUid: 'A', rootPath: '/R1', tokenRevision: 2 }).outcome, 'read-only-reconcile'));
check('N05 current R2 cannot retarget R1', () => assert.equal(reconcile(cp, { accountUid: 'A', rootPath: '/R2' }).remotePath, cp.remotePath));
check('N06 missing account fails closed', () => assert.equal(reconcile({ ...cp, namespace: { ...ar1, accountUid: '' } }, { accountUid: 'A', rootPath: '/R1' }).remoteCalls, 0));
check('N07 missing root fails closed', () => assert.equal(reconcile({ ...cp, namespace: { ...ar1, rootPath: '' } }, { accountUid: 'A', rootPath: '/R1' }).remoteCalls, 0));
check('N08 wrong-account 404 no aging', () => assert.equal(age404(cp, br1, cp.remotePath).increment, 0));
check('N09 wrong-root 404 no aging', () => assert.equal(age404(cp, ar2, cp.remotePath).increment, 0));
check('N10 matching namespace 404 may age', () => assert.equal(age404(cp, ar1, cp.remotePath).increment, 1));
check('N11 A/R1 success cannot suppress B/R1', () => assert.equal(due(states, br1, 1100, 10000), true));
check('N12 A/R1 success cannot suppress A/R2', () => assert.equal(due(states, ar2, 1100, 10000), true));
check('N13 A/R1 failure cannot retry-block B/R1', () => assert.equal(retryBlocked(states, br1, 2100, 10000), false));
check('N14 A/R1 failure cannot retry-block A/R2', () => assert.equal(retryBlocked(states, ar2, 2100, 10000), false));
check('N15 stale retry namespace is not current authority', () => assert.equal(sameNs(ar1, br1), false));
check('N16 token match plus namespace mismatch cannot renew', () => assert.equal(renewLease({ token: 't', namespace: ar1 }, { token: 't', namespace: ar2 }), false));
check('N17 token and namespace match can renew', () => assert.equal(renewLease({ token: 't', namespace: ar1 }, { token: 't', namespace: makeNs('A', '/R1') }), true));
check('N18 remote-verified preserves namespace', () => assert.equal(sameNs({ ...cp, phase: 'remote-verified' }.namespace, ar1), true));
check('N19 matching housekeeping may consume', () => assert.equal(validCheckpoint(cp) && sameNs(cp.namespace, ar1), true));
check('N20 mismatched housekeeping cannot consume', () => assert.equal(validCheckpoint(cp) && sameNs(cp.namespace, ar2), false));
check('N21 current root never rewrites historical path', () => assert.equal(reconcile(cp, { accountUid: 'A', rootPath: '/R2' }).remotePath.startsWith('/R1/'), true));
check('N22 current ensure excluded from historical steps', () => has(EVIDENCE, 'Current `ensureYandexServiceFolders()` is not part of steps 1–8.'));
check('N23 new provisioning needs fresh mutation intent', () => has(EVIDENCE, 'create a fresh MutationIntent under current namespace'));
check('N24 namespace contains no durable secret', () => assert.equal(secretFree(ar1), true));
check('N25 exact adoption remains P1-184', () => has(EVIDENCE, 'path + expectedBytes != exact remote content identity'));
check('N26 bounded namespace implementation evidence is explicit', () => { has(IMPLEMENTATION, 'legacy/unbound checkpoint'); has(IMPLEMENTATION, 'exact-current-namespace'); });
check('N27 manifest still 0.9.8', () => assert.equal(MANIFEST.version, '0.9.8'));
check('N28 release boundary intact', () => { has(IMPLEMENTATION, 'No live Yandex request'); has(IMPLEMENTATION, 'release readiness remains **NOT READY**'); });

// Evidence acceptance anchors.
[
  'lease token CAS != account/root namespace CAS',
  'same remotePath string under account A != same object/namespace under account B',
  'historical namespace proof must precede both current provisioning and remote reconciliation',
  'lastSuccessAt(A,R1) does not suppress due(A,R2)',
  'lastFailureAt(A,R1) does not retry-block B/R1',
  'stored token == lease token',
  'AND stored namespace == operation namespace',
  'attemptCount delta = 0',
  'checkpoint deletion = forbidden',
  'success namespace == checkpoint namespace == state namespace',
  'legacy remotePath + current account/root => synthesized authority',
  'V1 readiness and release authority are untouched.'
].forEach((needle, i) => check(`E${String(i + 1).padStart(2, '0')}`, () => has(EVIDENCE, needle)));

console.log(`P1-179 backup namespace binding refinement model: PASS; cases=${cases}; schema=webclip-backup-namespace-binding/v1; baseline=9ab02ceaa70057dc57bcdd0eb5bb937097496869; current_namespace_absent=false; lease_token_cas=preserved; lease_namespace_cas=implemented; checkpoint_namespace=implemented; exact_current_namespace_recovery=implemented; legacy_mismatch=fail-closed-zero-remote; scheduler_state_namespace_local=implemented; legacy_flat_state_authority=false; same_account_root_rotation_readonly=remaining; exact_content_owner=P1-184; hidden_provision_owner=P1-138; runtime_modified=true; new_p_code=false; s2_authorized=false; release_authorized=false`);
