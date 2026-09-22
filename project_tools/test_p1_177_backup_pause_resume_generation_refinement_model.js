'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const REGISTRY = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_REGISTRY.md'), 'utf8');
const EVIDENCE = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_P1_177_BACKUP_PAUSE_RESUME_GENERATION_REFINEMENT_2026-09-10_EVIDENCE.md'), 'utf8');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));

let cases = 0;
function check(name, fn) {
  try { fn(); cases += 1; }
  catch (error) { error.message = `${name}: ${error.message}`; throw error; }
}
function has(text, needle) { assert.ok(text.includes(needle), `missing ${JSON.stringify(needle)}`); }
function lacks(text, needle) { assert.ok(!text.includes(needle), `unexpected ${JSON.stringify(needle)}`); }
function count(text, needle) { return text.split(needle).length - 1; }
function asyncSection(signature) {
  const start = SOURCE.indexOf(signature);
  assert.ok(start >= 0, `function missing: ${signature}`);
  const next = SOURCE.indexOf('\nasync function ', start + signature.length);
  return SOURCE.slice(start, next >= 0 ? next : SOURCE.length);
}
function switchCase(label) {
  const signature = `case '${label}':`;
  const start = SOURCE.indexOf(signature);
  assert.ok(start >= 0, `switch case missing: ${label}`);
  const next = SOURCE.indexOf('\n      case ', start + signature.length);
  return SOURCE.slice(start, next >= 0 ? next : SOURCE.length);
}
function ns(accountUid, rootPath) {
  const account = String(accountUid || '').trim();
  let root = String(rootPath || '').trim().replace(/\/+$/, '');
  if (!root) root = '/';
  if (!account || !root.startsWith('/')) return null;
  return Object.freeze({ accountUid: account, rootPath: root });
}
function sameNs(a, b) {
  return Boolean(a && b && a.accountUid === b.accountUid && a.rootPath === b.rootPath);
}
function makeControl({ generation = 1, mode = 'active', namespace = ns('A', '/R1'), authPresent = true } = {}) {
  return {
    generation,
    mode,
    namespace,
    authPresent,
    lastFailureAt: 0,
    lastBackgroundFailureAt: 0,
    retryScheduled: false,
    pendingEffect: null
  };
}
function scheduledReceipt(control, kind = 'periodic') {
  return Object.freeze({ kind, schedulerGeneration: control.generation });
}
function disconnect(control) {
  control.authPresent = false;
  control.generation += 1;
  control.mode = 'paused-no-auth';
  return control;
}
function pauseUser(control) {
  control.generation += 1;
  control.mode = 'paused-user';
  return control;
}
function resume(control, proof) {
  if (!proof?.authPresent || !proof?.namespace) return { ok: false, reason: 'proof-insufficient' };
  control.generation += 1;
  control.mode = 'active';
  control.authPresent = true;
  control.namespace = proof.namespace;
  return { ok: true, generation: control.generation };
}
function callbackAdmission(control, receipt, liveProof = {}) {
  if (!receipt || receipt.schedulerGeneration !== control.generation) return { outcome: 'stale-generation', startRemote: false };
  if (control.mode !== 'active' || !control.authPresent) return { outcome: 'paused', startRemote: false };
  if (!liveProof.authPresent) return { outcome: 'no-auth', startRemote: false };
  if (!sameNs(control.namespace, liveProof.namespace)) return { outcome: 'namespace-mismatch', startRemote: false };
  return { outcome: 'prepare-only', startRemote: false, ticket: { schedulerGeneration: control.generation, namespace: control.namespace } };
}
function childMutationAdmission(control, ticket, liveProof = {}) {
  if (!ticket || ticket.schedulerGeneration !== control.generation) return { outcome: 'stale-before-child', startRemote: false };
  if (control.mode !== 'active' || !control.authPresent || !liveProof.authPresent) return { outcome: 'paused-before-child', startRemote: false };
  if (!sameNs(ticket.namespace, control.namespace) || !sameNs(control.namespace, liveProof.namespace)) return { outcome: 'namespace-mismatch', startRemote: false };
  return { outcome: 'admitted', startRemote: true, effect: { schedulerGeneration: control.generation, namespace: control.namespace, phase: 'started-unknown' } };
}
function preserveStartedEffectAcrossDisconnect(control, effect) {
  control.pendingEffect = effect;
  disconnect(control);
  return control.pendingEffect;
}
function targetPausedSkip(control) {
  return { remoteCalls: 0, failureDelta: 0, backgroundFailureDelta: 0, retryScheduled: false, mode: control.mode };
}
function currentShapedNoAuthFailure() {
  return { remoteCalls: 0, failureDelta: 1, backgroundFailureDelta: 1, retryScheduled: true, outcome: 'ordinary-failure' };
}

// Canonical owner/scope checks.
check('O01 P1-177 ACTIVE', () => has(REGISTRY, '| P1-177 | ACTIVE |'));
check('O02 P1-177 exact owner', () => has(REGISTRY, 'Yandex Disconnect/re-auth and backup scheduler need explicit no-auth/paused/resume generation semantics'));
check('O03 P1-179 namespace owner', () => has(REGISTRY, 'Backup scheduler state and pending backup checkpoint are immutable account/root namespaces'));
check('O04 P1-076 lease owner', () => has(REGISTRY, 'Backup lease ownership is atomic but must remain valid for every stage'));
check('O05 P0-073 account/root owner', () => has(REGISTRY, 'Remote-save completion/recovery is immutable account/root scoped'));
check('O06 P0-074 operation context owner', () => has(REGISTRY, 'Long Yandex operation uses one immutable auth/account/root/config/publication operation context and generation'));
check('O07 P1-138 hidden mutation owner', () => has(REGISTRY, 'Read-like Yandex list/fetch/status flows must not hide provisioning/mutation authority'));
check('O08 P1-178 auth generation owner', () => has(REGISTRY, 'OAuth pending/token exchange/config commit is one auth-attempt + settings-generation state machine'));
check('O09 P1-184 exact receipt owner', () => has(REGISTRY, 'path+size cannot authorize adoption or publication'));
check('O10 baseline exact', () => has(EVIDENCE, '0e58f326a19f22611f3ddcb65e13bcf2cbd48670'));
check('O11 no new P code', () => has(EVIDENCE, 'New P-code: **NO**'));
check('O12 runtime none', () => has(EVIDENCE, 'Production/runtime modification: **NONE**'));
check('O13 no L5', () => has(EVIDENCE, 'Real Chrome/Yandex L5: **NOT RUN**'));
check('O14 no S2', () => has(EVIDENCE, 'Release-policy activation: **NONE**'));
check('O15 manifest unchanged', () => assert.equal(MANIFEST.version, '0.9.8'));

// Current-source absorption review: preserve real positive controls and prove missing scheduler-generation semantics.
check('S01 periodic alarm fixed name', () => has(SOURCE, "const JOURNAL_BACKUP_ALARM = 'webclip-journal-backup';"));
check('S02 retry alarm fixed name', () => has(SOURCE, 'const JOURNAL_BACKUP_RETRY_ALARM = `${JOURNAL_BACKUP_ALARM}-retry`;'));
check('S03 no paused-no-auth runtime symbol', () => lacks(SOURCE, 'paused-no-auth'));
check('S04 no backupSchedulerControl runtime symbol', () => lacks(SOURCE, 'backupSchedulerControl'));
check('S05 no backupSchedulerGeneration runtime symbol', () => lacks(SOURCE, 'backupSchedulerGeneration'));
check('S06 no scheduledGeneration runtime symbol', () => lacks(SOURCE, 'scheduledGeneration'));

const disconnectCase = switchCase('WEBCLIP_YANDEX_DISCONNECT');
const disconnectAuth = asyncSection('async function disconnectYandexAuthControl()');
check('S07 Disconnect enters shared auth-generation barrier', () => has(disconnectCase, 'await disconnectYandexAuthControl()'));
check('S08 Disconnect helper clears auth + pending PKCE in one session mutation', () => {
  has(disconnectAuth, '[YANDEX_OAUTH_PENDING_KEY]: null');
  has(disconnectAuth, '[YANDEX_AUTH_KEY]: null');
});
check('S09 Disconnect lacks scheduler init', () => lacks(disconnectCase, 'initializeJournalBackupScheduler'));
check('S10 Disconnect lacks pending-backup deletion', () => lacks(disconnectCase, 'JOURNAL_BACKUP_PENDING_KEY'));

const due = asyncSection("async function runDueJournalBackup(reason = 'scheduled', forceRetry = false)");
check('S11 due reads backup status', () => has(due, 'const status = await getJournalBackupStatus();'));
check('S12 due entry gates enabled/root', () => has(due, 'if (!status.enabled || !status.rootPath)'));
check('S13 due lacks explicit paused-no-auth', () => lacks(due, 'paused-no-auth'));
check('S14 due lacks scheduler generation', () => lacks(due, 'schedulerGeneration'));
check('S15 current stale-retry guard preserved', () => has(due, 'staleRetryAlarm: true'));
check('S16 stale-retry guard tied to newer success', () => has(due, 'if (forceRetry && !unresolvedFailure)'));

const backup = asyncSection("async function exportJournalBackupToYandex({ reason = 'manual', operationId = '' } = {})");
check('S17 background failure writes lastFailureAt', () => has(backup, 'state.lastFailureAt = failureAt;'));
check('S18 background failure writes lastBackgroundFailureAt', () => has(backup, 'state.lastBackgroundFailureAt = failureAt;'));
check('S19 background failure records error', () => has(backup, 'state.lastBackgroundError = normalizeError(error);'));
check('S20 enabled background failure schedules retry', () => has(backup, "if (status?.enabled && isBackground && error?.code !== 'JOURNAL_BACKUP_BUSY')"));
check('S21 retry scheduling call present', () => has(backup, 'await scheduleBackupRetry(failureAt, status.retryMinutes);'));

const init = asyncSection("async function initializeJournalBackupScheduler(reason = 'init')");
check('S22 init reads status', () => has(init, 'const status = await getJournalBackupStatus();'));
check('S23 worker-start trusts existing alarm presence as lightweight path', () => has(init, 'alarmAlreadyPresent: true'));
check('S24 non-worker init clears periodic alarm', () => has(init, 'chrome.alarms.clear(JOURNAL_BACKUP_ALARM)'));
check('S25 non-worker init clears retry alarm', () => has(init, 'chrome.alarms.clear(JOURNAL_BACKUP_RETRY_ALARM)'));
check('S26 init lacks generation receipt check', () => lacks(init, 'schedulerGeneration'));

const finishAuth = asyncSection('async function finishYandexOAuth(authAttemptId, code)');
check('S27 OAuth success commits exact auth attempt through CAS', () => has(finishAuth, 'commitYandexOAuthAttemptControl(captured, yandexAuth)'));
check('S28 OAuth success lacks explicit scheduler resume', () => lacks(finishAuth, 'initializeJournalBackupScheduler'));
const manualAuth = asyncSection('async function setManualYandexToken(token)');
check('S29 manual auth writes auth', () => has(manualAuth, 'await writeYandexAuth(yandexAuth);'));
check('S30 manual auth lacks explicit scheduler resume', () => lacks(manualAuth, 'initializeJournalBackupScheduler'));
check('S31 scheduler init call set excludes auth-resume labels', () => {
  assert.equal(count(SOURCE, "initializeJournalBackupScheduler('"), 5);
  lacks(SOURCE, "initializeJournalBackupScheduler('oauth");
  lacks(SOURCE, "initializeJournalBackupScheduler('auth");
  lacks(SOURCE, "initializeJournalBackupScheduler('reauth");
});
check('S32 alarm listener dispatches periodic directly', () => has(SOURCE, "runDueJournalBackup('periodic-alarm', false)"));
check('S33 alarm listener dispatches retry directly', () => has(SOURCE, "runDueJournalBackup('retry-alarm', true)"));
const upload = asyncSection('async function uploadJournalExportStagedToYandex(');
check('S34 physical upload path persists prepared checkpoint', () => has(upload, '[JOURNAL_BACKUP_PENDING_KEY]: pending'));
check('S35 physical upload uses offscreen signed transfer', () => has(upload, 'runOffscreenSignedTransfer'));

// Deterministic target/race matrix.
const ar1 = ns('A', '/R1');
const ar2 = ns('A', '/R2');
const br2 = ns('B', '/R2');
check('N01 current-shaped no-auth is ordinary failure/retry gap', () => {
  const r = currentShapedNoAuthFailure();
  assert.equal(r.outcome, 'ordinary-failure'); assert.equal(r.failureDelta, 1); assert.equal(r.retryScheduled, true);
});
check('N02 Disconnect advances generation and pauses', () => {
  const c = makeControl({ generation: 4 }); disconnect(c); assert.equal(c.generation, 5); assert.equal(c.mode, 'paused-no-auth');
});
check('N03 paused alarm zero remote', () => {
  const c = makeControl(); const r = scheduledReceipt(c); disconnect(c); assert.equal(callbackAdmission(c, r, { authPresent: false, namespace: ar1 }).startRemote, false);
});
check('N04 paused skip zero failure bookkeeping', () => {
  const c = makeControl(); disconnect(c); const r = targetPausedSkip(c); assert.equal(r.failureDelta, 0); assert.equal(r.backgroundFailureDelta, 0);
});
check('N05 old periodic receipt stale after Disconnect', () => {
  const c = makeControl({ generation: 9 }); const r = scheduledReceipt(c, 'periodic'); disconnect(c); assert.equal(callbackAdmission(c, r, { authPresent: false, namespace: ar1 }).outcome, 'stale-generation');
});
check('N06 old retry receipt stale after Disconnect', () => {
  const c = makeControl({ generation: 9 }); const r = scheduledReceipt(c, 'retry'); disconnect(c); assert.equal(callbackAdmission(c, r, { authPresent: false, namespace: ar1 }).outcome, 'stale-generation');
});
check('N07 resume advances generation again', () => {
  const c = makeControl({ generation: 2 }); disconnect(c); const r = resume(c, { authPresent: true, namespace: ar1 }); assert.equal(r.ok, true); assert.equal(c.generation, 4);
});
check('N08 old receipt stays stale after same-namespace resume', () => {
  const c = makeControl({ generation: 2, namespace: ar1 }); const old = scheduledReceipt(c); disconnect(c); resume(c, { authPresent: true, namespace: ar1 }); assert.equal(callbackAdmission(c, old, { authPresent: true, namespace: ar1 }).outcome, 'stale-generation');
});
check('N09 old receipt stays stale after different-namespace resume', () => {
  const c = makeControl({ generation: 2, namespace: ar1 }); const old = scheduledReceipt(c); disconnect(c); resume(c, { authPresent: true, namespace: br2 }); assert.equal(callbackAdmission(c, old, { authPresent: true, namespace: br2 }).outcome, 'stale-generation');
});
check('N10 resume requires proven auth', () => {
  const c = makeControl(); disconnect(c); assert.equal(resume(c, { authPresent: false, namespace: ar1 }).ok, false);
});
check('N11 resume requires proven namespace', () => {
  const c = makeControl(); disconnect(c); assert.equal(resume(c, { authPresent: true, namespace: null }).ok, false);
});
check('N12 alarm delivery alone grants no remote start', () => {
  const c = makeControl(); const r = callbackAdmission(c, scheduledReceipt(c), { authPresent: true, namespace: ar1 }); assert.equal(r.outcome, 'prepare-only'); assert.equal(r.startRemote, false);
});
check('N13 Disconnect after callback check blocks later child', () => {
  const c = makeControl(); const observed = callbackAdmission(c, scheduledReceipt(c), { authPresent: true, namespace: ar1 }); disconnect(c); const child = childMutationAdmission(c, observed.ticket, { authPresent: false, namespace: ar1 }); assert.equal(child.outcome, 'stale-before-child'); assert.equal(child.startRemote, false);
});
check('N14 admitted child before Disconnect remains historical effect', () => {
  const c = makeControl(); const observed = callbackAdmission(c, scheduledReceipt(c), { authPresent: true, namespace: ar1 }); const child = childMutationAdmission(c, observed.ticket, { authPresent: true, namespace: ar1 }); assert.equal(child.startRemote, true); const preserved = preserveStartedEffectAcrossDisconnect(c, child.effect); assert.equal(preserved.phase, 'started-unknown');
});
check('N15 started effect is not marked cancelled by pause', () => {
  const c = makeControl(); const effect = { schedulerGeneration: c.generation, namespace: ar1, phase: 'started-unknown' }; const preserved = preserveStartedEffectAcrossDisconnect(c, effect); assert.notEqual(preserved.phase, 'cancelled');
});
check('N16 later not-started child after Disconnect blocked', () => {
  const c = makeControl(); const ticket = { schedulerGeneration: c.generation, namespace: ar1 }; disconnect(c); assert.equal(childMutationAdmission(c, ticket, { authPresent: false, namespace: ar1 }).startRemote, false);
});
check('N17 stale callback makes zero ordinary failure', () => {
  const c = makeControl(); const receipt = scheduledReceipt(c); disconnect(c); const r = callbackAdmission(c, receipt, { authPresent: false, namespace: ar1 }); assert.equal(r.outcome, 'stale-generation'); assert.equal(c.lastFailureAt, 0);
});
check('N18 stale callback schedules no ordinary retry', () => {
  const c = makeControl(); const receipt = scheduledReceipt(c); disconnect(c); callbackAdmission(c, receipt, { authPresent: false, namespace: ar1 }); assert.equal(c.retryScheduled, false);
});
check('N19 current-generation no-auth is a pause/veto, not failure', () => {
  const c = makeControl({ mode: 'paused-no-auth', authPresent: false }); const r = callbackAdmission(c, scheduledReceipt(c), { authPresent: false, namespace: ar1 }); assert.equal(r.outcome, 'paused'); assert.equal(c.lastFailureAt, 0);
});
check('N20 no-auth pause schedules no ordinary retry', () => {
  const c = makeControl({ mode: 'paused-no-auth', authPresent: false }); callbackAdmission(c, scheduledReceipt(c), { authPresent: false, namespace: ar1 }); assert.equal(c.retryScheduled, false);
});
check('N21 current staleRetryAlarm positive control represented', () => has(EVIDENCE, '`staleRetryAlarm`'));
check('N22 fixed name requires durable generation relation', () => has(EVIDENCE, 'fixed alarm name + durable scheduled receipt'));
check('N23 worker-start alarm existence not authority', () => has(EVIDENCE, 'alarm existence alone cannot prove current scheduling authority'));
check('N24 same-account rotation keeps namespace but new scheduler generation', () => {
  const c = makeControl({ generation: 5, namespace: ar1 }); disconnect(c); resume(c, { authPresent: true, namespace: ns('A', '/R1') }); assert.equal(sameNs(c.namespace, ar1), true); assert.equal(c.generation, 7);
});
check('N25 different namespace resume does not retarget old pending', () => {
  const old = { namespace: ar1, remotePath: '/R1/Backup/Journal/x.json' }; const c = makeControl({ namespace: ar1, pendingEffect: old }); disconnect(c); resume(c, { authPresent: true, namespace: br2 }); assert.equal(old.namespace.rootPath, '/R1'); assert.equal(c.namespace.rootPath, '/R2');
});
check('N26 namespace identity and scheduler generation distinct', () => {
  const c = makeControl({ generation: 1, namespace: ar1 }); disconnect(c); assert.equal(c.namespace, ar1); assert.equal(c.generation, 2);
});
check('N27 namespace match alone does not grant admission while paused', () => {
  const c = makeControl({ namespace: ar1 }); disconnect(c); const r = callbackAdmission(c, scheduledReceipt(c), { authPresent: false, namespace: ar1 }); assert.equal(r.startRemote, false);
});
check('N28 lease expiry remains not cancellation evidence', () => has(EVIDENCE, 'lease expiry is not cancellation evidence'));
check('N29 pending effect survives scheduler pause', () => {
  const c = makeControl(); c.pendingEffect = { namespace: ar1, phase: 'started-unknown' }; disconnect(c); assert.equal(c.pendingEffect.phase, 'started-unknown');
});
check('N30 user disable invalidates old scheduled generation', () => {
  const c = makeControl({ generation: 3 }); const old = scheduledReceipt(c); pauseUser(c); assert.equal(callbackAdmission(c, old, { authPresent: true, namespace: ar1 }).outcome, 'stale-generation');
});
check('N31 re-enable does not revive old retry receipt', () => {
  const c = makeControl({ generation: 3 }); const old = scheduledReceipt(c, 'retry'); pauseUser(c); resume(c, { authPresent: true, namespace: ar1 }); assert.equal(callbackAdmission(c, old, { authPresent: true, namespace: ar1 }).outcome, 'stale-generation');
});
check('N32 manifest remains 0.9.8', () => assert.equal(MANIFEST.version, '0.9.8'));
check('N33 no runtime/L5/S2/release action', () => {
  has(EVIDENCE, 'runtime remains unchanged'); has(EVIDENCE, 'no real Chrome/Yandex L5'); has(EVIDENCE, 'P1-231 S2 activation');
});

// Acceptance phrases bind the research artifact, not only the simulation.
[
  'Missing auth after explicit Disconnect is scheduler pause truth, not backup failure truth.',
  'alarm delivery != mutation authority',
  'scheduler generation/mode must be revalidated immediately before each not-yet-started remote mutation admission',
  'Disconnect cannot prove cancellation.',
  'Scheduler pause controls future work. It does not falsify physical history.',
  'lastFailureAt delta = 0',
  'Timestamp freshness is not scheduler-generation authority.',
  'worker-start cannot infer authority merely from a fixed alarm\'s existence',
  'namespace identity = where durable remote state belongs',
  'scheduler generation = whether a particular scheduling decision may still admit new work',
  'V1 readiness and release authority are untouched.'
].forEach((needle, i) => check(`E${String(i + 1).padStart(2, '0')}`, () => has(EVIDENCE, needle)));

console.log(`P1-177 backup pause/resume generation refinement model: PASS; cases=${cases}; schema=webclip-backup-scheduler-generation/v1; baseline=0e58f326a19f22611f3ddcb65e13bcf2cbd48670; disconnect_pause_missing=current-gap; due_auth_generation_gate_missing=current-gap; fixed_alarm_generation_missing=current-gap; explicit_auth_resume_missing=current-gap; stale_retry_success_guard=preserved; callback_recheck=required-before-each-child; started_effect=persist-reconcile; namespace_owner=P1-179; auth_generation_owner=P1-178; scheduler_owner=P1-177; runtime_modified=false; new_p_code=false; s2_authorized=false; release_authorized=false`);
