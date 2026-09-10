'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const REGISTRY = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_REGISTRY.md'), 'utf8');
const EVIDENCE = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_P1_179_BACKUP_NAMESPACE_BINDING_REFINEMENT_2026-09-10_EVIDENCE.md'), 'utf8');
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
function objectAfter(text, anchor) {
  const i = text.indexOf(anchor);
  assert.ok(i >= 0, `object anchor missing: ${anchor}`);
  const end = text.indexOf('\n  };', i);
  assert.ok(end >= 0, `object end missing after ${anchor}`);
  return text.slice(i, end + 5);
}

function ns(accountUid, rootPath) {
  const account = String(accountUid || '').trim();
  let root = String(rootPath || '').trim().replace(/\/+$/, '');
  if (!root) root = '/';
  if (!account || !root.startsWith('/')) return null;
  return Object.freeze({ schema: 1, accountUid: account, rootPath: root, journalRootPath: `${root === '/' ? '' : root}/Backup/Journal` || '/Backup/Journal' });
}
function sameNs(a, b) {
  return Boolean(a && b && a.schema === b.schema && a.accountUid === b.accountUid && a.rootPath === b.rootPath);
}
function validateCheckpoint(cp) {
  if (!cp?.namespace?.accountUid || !cp?.namespace?.rootPath || !cp?.remotePath) return { ok: false, outcome: 'legacy-or-insufficient' };
  if (!cp.remotePath.startsWith(cp.namespace.journalRootPath + '/')) return { ok: false, outcome: 'target-outside-namespace' };
  return { ok: true };
}
function reconcile(cp, live) {
  const valid = validateCheckpoint(cp);
  if (!valid.ok) return { outcome: valid.outcome, remoteCalls: 0, mutating: false };
  if (cp.namespace.accountUid !== live.accountUid) return { outcome: 'foreign-account', remoteCalls: 0, mutating: false };
  return {
    outcome: 'read-only-reconcile',
    namespace: cp.namespace,
    remotePath: cp.remotePath,
    currentRootDiagnosticOnly: live.rootPath !== cp.namespace.rootPath,
    remoteCalls: 1,
    mutating: false,
  };
}
function renewLease(stored, offered) {
  return Boolean(stored && offered && stored.token === offered.token && sameNs(stored.namespace, offered.namespace));
}
function age404(cp, queryNs, queryPath, policyEligible = true) {
  if (!validateCheckpoint(cp).ok) return { increment: 0, retire: false };
  if (!sameNs(cp.namespace, queryNs) || queryPath !== cp.remotePath) return { increment: 0, retire: false };
  return { increment: policyEligible ? 1 : 0, retire: false };
}
function stateFor(map, namespace) {
  return map[`${namespace.accountUid}\u0000${namespace.rootPath}`] || {};
}
function due(map, namespace, now, interval) {
  const state = stateFor(map, namespace);
  return !state.lastSuccessAt || now >= state.lastSuccessAt + interval;
}
function retryBlocked(map, namespace, now, retry) {
  const state = stateFor(map, namespace);
  return Boolean(state.lastFailureAt && (!state.lastSuccessAt || state.lastFailureAt > state.lastSuccessAt) && now < state.lastFailureAt + retry);
}
function canConsume(cp, successNs) { return Boolean(validateCheckpoint(cp).ok && sameNs(cp.namespace, successNs)); }
function durableNamespaceIsSecretFree(namespace) {
  const s = JSON.stringify(namespace).toLowerCase();
  return !['accesstoken', 'access_token', 'refreshtoken', 'refresh_token', 'authorization', 'signedurl', 'oauthcode'].some((x) => s.includes(x));
}

// Canonical scope and owner authority.
check('O01 P1-179 ACTIVE', () => has(REGISTRY, '| P1-179 | ACTIVE |'));
check('O02 P1-179 exact owner', () => has(REGISTRY, 'Backup scheduler state and pending backup checkpoint are immutable account/root namespaces'));
check('O03 P0-073 exact scope', () => has(REGISTRY, 'Remote-save completion/recovery is immutable account/root scoped'));
check('O04 P0-074 immutable context', () => has(REGISTRY, 'Long Yandex operation uses one immutable auth/account/root/config/publication operation context and generation'));
check('O05 P1-138 observation split', () => has(REGISTRY, 'Read-like Yandex list/fetch/status flows must not hide provisioning/mutation authority'));
check('O06 P1-177 scheduler generation owner', () => has(REGISTRY, 'backup scheduler need explicit no-auth/paused/resume generation semantics'));
check('O07 P1-178 auth generation owner', () => has(REGISTRY, 'OAuth pending/token exchange/config commit is one auth-attempt + settings-generation state machine'));
check('O08 P1-184 exact receipt owner', () => has(REGISTRY, 'path+size cannot authorize adoption or publication'));
check('O09 no new P code', () => has(EVIDENCE, 'New P-code: **NO**'));
check('O10 runtime none', () => has(EVIDENCE, 'Production/runtime modification: **NONE**'));
check('O11 no L5', () => has(EVIDENCE, 'Real Chrome/Yandex L5: **NOT RUN**'));
check('O12 no S2', () => has(EVIDENCE, 'Release-policy activation: **NONE**'));
check('O13 baseline', () => has(EVIDENCE, '9ab02ceaa70057dc57bcdd0eb5bb937097496869'));
check('O14 manifest unchanged', () => assert.equal(MANIFEST.version, '0.9.8'));

// Current-main absorption audit: useful controls present, namespace scope absent.
check('S01 lease key exists', () => has(SOURCE, "const JOURNAL_BACKUP_LEASE_KEY = 'webclipJournalBackupLease'"));
check('S02 pending key exists', () => has(SOURCE, "const JOURNAL_BACKUP_PENDING_KEY = 'webclipJournalBackupPendingUpload'"));
check('S03 no runtime backupNamespace symbol yet', () => lacks(SOURCE, 'backupNamespace'));
const acquire = section('async function acquireJournalBackupLease(');
check('S04 acquire uses serialized storage mutation', () => has(acquire, 'mutateChromeStorageSerialized'));
const leaseObj = objectAfter(acquire, 'const lease = {');
check('S05 lease has token', () => has(leaseObj, 'token'));
check('S06 lease has operationId', () => has(leaseObj, 'operationId'));
check('S07 lease lacks accountUid', () => lacks(leaseObj, 'accountUid'));
check('S08 lease lacks rootPath', () => lacks(leaseObj, 'rootPath'));
const renew = section('async function renewJournalBackupLease(');
check('S09 renew checks token ownership', () => has(renew, 'current?.token !== lease.token'));
check('S10 renew lacks namespace identity', () => lacks(renew, 'namespace'));
const upload = section('async function uploadJournalExportStagedToYandex(');
const pendingObj = objectAfter(upload, 'const pending = {');
check('S11 prepared pending has phase', () => has(pendingObj, "phase: 'prepared'"));
check('S12 prepared pending has remotePath', () => has(pendingObj, 'remotePath'));
check('S13 prepared pending has expectedBytes', () => has(pendingObj, 'expectedBytes'));
check('S14 prepared pending lacks accountUid', () => lacks(pendingObj, 'accountUid'));
check('S15 prepared pending lacks rootPath', () => lacks(pendingObj, 'rootPath'));
const recovery = section("async function recoverPendingJournalBackup(status, operationId = '')");
check('S16 recovery loads pending', () => has(recovery, 'JOURNAL_BACKUP_PENDING_KEY'));
check('S17 recovery current ensure before historical target handling', () => {
  const ensureAt = recovery.indexOf('ensureYandexServiceFolders({ includeBackup: true, operationId })');
  const targetAt = recovery.indexOf('normalizeDiskPath(pending.remotePath)');
  assert.ok(ensureAt >= 0 && targetAt >= 0 && ensureAt < targetAt);
});
const status = section('async function getJournalBackupStatus()');
check('S18 status reads yandexConfig', () => has(status, 'yandexConfig'));
check('S19 status reads journalBackupState', () => has(status, 'journalBackupState'));
check('S20 status takes root from current config', () => has(status, "const rootPath = normalizeDiskPath(yandexConfig.rootPath || '')"));
check('S21 status uses global lastSuccessAt', () => has(status, 'journalBackupState.lastSuccessAt'));
check('S22 status uses global lastFailureAt', () => has(status, 'journalBackupState.lastFailureAt'));
check('S23 status uses global lastRemotePath', () => has(status, 'journalBackupState.lastRemotePath'));

// Identity semantics.
const ar1 = ns('A', '/R1');
const ar2 = ns('A', '/R2');
const br1 = ns('B', '/R1');
check('I01 namespace created', () => assert.ok(ar1));
check('I02 same account different root differs', () => assert.equal(sameNs(ar1, ar2), false));
check('I03 different account same root differs', () => assert.equal(sameNs(ar1, br1), false));
check('I04 exact account/root matches', () => assert.equal(sameNs(ar1, ns('A', '/R1/')), true));
check('I05 journal root deterministic', () => assert.equal(ar1.journalRootPath, '/R1/Backup/Journal'));
check('I06 namespace has no network authority', () => assert.equal(Object.prototype.hasOwnProperty.call(ar1, 'token'), false));
check('I07 namespace secret-free', () => assert.equal(durableNamespaceIsSecretFree(ar1), true));

const cp = { phase: 'prepared', namespace: ar1, remotePath: '/R1/Backup/Journal/2026-09/a.json', attemptCount: 0 };
// Negative matrix N01-N28.
check('N01 A/R1 -> current A/R2 reconciles R1 read-only', () => {
  const r = reconcile(cp, { accountUid: 'A', rootPath: '/R2' });
  assert.equal(r.outcome, 'read-only-reconcile'); assert.equal(r.namespace.rootPath, '/R1'); assert.equal(r.mutating, false);
});
check('N02 A/R1 -> current B/R1 zero remote', () => assert.equal(reconcile(cp, { accountUid: 'B', rootPath: '/R1' }).remoteCalls, 0));
check('N03 A/R1 -> current B/R2 zero remote', () => assert.equal(reconcile(cp, { accountUid: 'B', rootPath: '/R2' }).remoteCalls, 0));
check('N04 token rotation same A/R1 is identity-neutral', () => assert.equal(reconcile(cp, { accountUid: 'A', rootPath: '/R1', tokenRevision: 9 }).outcome, 'read-only-reconcile'));
check('N05 token rotation current R2 cannot retarget', () => assert.equal(reconcile(cp, { accountUid: 'A', rootPath: '/R2', tokenRevision: 9 }).remotePath, cp.remotePath));
check('N06 missing account fails closed', () => assert.equal(reconcile({ ...cp, namespace: { ...ar1, accountUid: '' } }, { accountUid: 'A', rootPath: '/R1' }).outcome, 'legacy-or-insufficient'));
check('N07 missing root fails closed', () => assert.equal(reconcile({ ...cp, namespace: { ...ar1, rootPath: '' } }, { accountUid: 'A', rootPath: '/R1' }).outcome, 'legacy-or-insufficient'));
check('N08 wrong-account 404 no aging', () => assert.equal(age404(cp, br1, cp.remotePath).increment, 0));
check('N09 wrong-root 404 no aging', () => assert.equal(age404(cp, ar2, cp.remotePath).increment, 0));
check('N10 matching namespace 404 may age', () => assert.equal(age404(cp, ar1, cp.remotePath, true).increment, 1));
const states = {
  [`A\u0000/R1`]: { lastSuccessAt: 1000, lastFailureAt: 2000, lastRemotePath: cp.remotePath },
};
check('N11 A/R1 success cannot suppress B/R1', () => assert.equal(due(states, br1, 1100, 10000), true));
check('N12 A/R1 success cannot suppress A/R2', () => assert.equal(due(states, ar2, 1100, 10000), true));
check('N13 A/R1 failure cannot retry-block B/R1', () => assert.equal(retryBlocked(states, br1, 2100, 10000), false));
check('N14 A/R1 failure cannot retry-block A/R2', () => assert.equal(retryBlocked(states, ar2, 2100, 10000), false));
check('N15 stale retry trigger namespace does not authorize current different namespace', () => assert.equal(sameNs(ar1, br1), false));
check('N16 lease token match namespace mismatch cannot renew', () => assert.equal(renewLease({ token: 't', namespace: ar1 }, { token: 't', namespace: ar2 }), false));
check('N17 lease token and namespace match can renew', () => assert.equal(renewLease({ token: 't', namespace: ar1 }, { token: 't', namespace: ns('A', '/R1') }), true));
check('N18 remote-verified preserves namespace', () => assert.equal(sameNs({ ...cp, phase: 'remote-verified' }.namespace, ar1), true));
check('N19 matching housekeeping can consume', () => assert.equal(canConsume(cp, ar1), true));
check('N20 mismatched housekeeping cannot consume', () => assert.equal(canConsume(cp, ar2), false));
check('N21 current root cannot rewrite historical path', () => assert.equal(reconcile(cp, { accountUid: 'A', rootPath: '/R2' }).remotePath.startsWith('/R1/'), true));
check('N22 current ensure forbidden before reconciliation', () => has(EVIDENCE, 'Current `ensureYandexServiceFolders()` is not part of steps 1–8.'));
check('N23 new R2 provisioning is fresh mutation', () => has(EVIDENCE, 'create a fresh MutationIntent under current namespace'));
check('N24 durable namespace secret-free', () => assert.equal(durableNamespaceIsSecretFree({ schema: 1, accountUid: 'A', rootPath: '/R1', journalRootPath: '/R1/Backup/Journal' }), true));
check('N25 exact adoption composes P1-184', () => has(EVIDENCE, 'path + expectedBytes != exact remote content identity'));
check('N26 current source gap explicit', () => has(EVIDENCE, 'does **not** expose a durable `backupNamespace`'));
check('N27 manifest stays 0.9.8', () => assert.equal(MANIFEST.version, '0.9.8'));
check('N28 no runtime/L5/S2/release action', () => {
  has(EVIDENCE, 'runtime remains unchanged'); has(EVIDENCE, 'no real L5'); has(EVIDENCE, 'release-policy activation');
});

// Acceptance phrases bind the research artifact, not only the simulation.
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

console.log(`P1-179 backup namespace binding refinement model: PASS; cases=${cases}; schema=webclip-backup-namespace-binding/v1; baseline=9ab02ceaa70057dc57bcdd0eb5bb937097496869; current_namespace_absent=true; lease_token_cas=preserved; lease_namespace_cas=required; checkpoint_namespace=required; scheduler_state=namespace-local; wrong_namespace_404=no-aging; same_account_rotation=read-only-reconcile; exact_content_owner=P1-184; hidden_provision_owner=P1-138; runtime_modified=false; new_p_code=false; s2_authorized=false; release_authorized=false`);
