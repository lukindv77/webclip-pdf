'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const EVIDENCE = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_P1_138_YANDEX_OBSERVATION_MUTATION_ADMISSION_2026-09-10_EVIDENCE.md'), 'utf8');
const SOURCE = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const OPTIONS = fs.readFileSync(path.join(ROOT, 'options.js'), 'utf8');
const REGISTRY = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_REGISTRY.md'), 'utf8');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));

let cases = 0;
function check(name, fn) {
  try {
    fn();
    cases += 1;
  } catch (error) {
    error.message = `${name}: ${error.message}`;
    throw error;
  }
}
function has(text, needle) { assert.ok(text.includes(needle), `missing ${JSON.stringify(needle)}`); }
function lacks(text, needle) { assert.ok(!text.includes(needle), `unexpected ${JSON.stringify(needle)}`); }

function auth({ id = 'A', gen = 7, uid = 'uid-A', read = true, write = true, publish = true, current = true } = {}) {
  return { authRecordId: id, authGeneration: gen, accountUid: uid, read, write, publish, current };
}
function observation({ ok = true, uid = 'uid-A', authId = 'A', authGen = 7, result = 'exists', timedOut = false } = {}) {
  return { kind: 'observation', ok, accountUid: uid, authRecordId: authId, authGeneration: authGen, result, timedOut, grantsMutation: false };
}
function deriveIntent(obs, { effectId = 'E1', target = '/root/x', root = '/root', capability = 'write', authId = obs.authRecordId, authGen = obs.authGeneration, uid = obs.accountUid, policyGeneration = 1 } = {}) {
  if (!obs || obs.kind !== 'observation' || !obs.ok || obs.timedOut) return { ok: false, reason: 'OBSERVATION_NOT_USABLE' };
  return {
    ok: true,
    intent: { effectId, target, root, capability, authRecordId: authId, authGeneration: authGen, accountUid: uid, policyGeneration, phase: 'prepared' }
  };
}
function admitMutation(a, intent, currentRoot = intent.root, currentPolicyGeneration = intent.policyGeneration) {
  if (!a || !a.current) return { ok: false, reason: 'AUTH_NOT_CURRENT' };
  if (a.authRecordId !== intent.authRecordId || a.authGeneration !== intent.authGeneration) return { ok: false, reason: 'AUTH_STALE' };
  if (a.accountUid !== intent.accountUid) return { ok: false, reason: 'ACCOUNT_MISMATCH' };
  if (currentRoot !== intent.root) return { ok: false, reason: 'ROOT_STALE' };
  if (intent.capability === 'publish' && currentPolicyGeneration !== intent.policyGeneration) return { ok: false, reason: 'POLICY_STALE' };
  if (a[intent.capability] !== true) return { ok: false, reason: 'CAPABILITY_INSUFFICIENT' };
  return { ok: true, effect: { ...intent, phase: 'admitted' } };
}
function startEffect(effect) {
  assert.equal(effect.phase, 'admitted');
  return { ...effect, phase: 'started-unknown', checkpointPersisted: true };
}
function settle(effect, transport) {
  assert.equal(effect.phase, 'started-unknown');
  if (transport === 'success') return { ...effect, phase: 'proven-success' };
  if (transport === 'failed-before-send') return { ...effect, phase: 'failed-before-effect' };
  return { ...effect, phase: 'started-unknown' };
}
function mayBlindRetry(effect) {
  return effect.phase !== 'started-unknown';
}
function reconcile(checkpoint, reader, { historicalRoot = checkpoint.root, currentRoot = checkpoint.root, exactIdentity = true } = {}) {
  if (!reader || reader.read !== true) return { ok: false, reason: 'READ_CAPABILITY_REQUIRED' };
  if (reader.accountUid !== checkpoint.accountUid) return { ok: false, reason: 'ACCOUNT_MISMATCH' };
  if (!exactIdentity) return { ok: false, reason: 'HISTORICAL_IDENTITY_INSUFFICIENT' };
  return { ok: true, mutating: false, target: checkpoint.target, root: historicalRoot, currentRootIgnoredForTarget: currentRoot !== historicalRoot };
}
function connectionComposite(readResult, provisioningResult = 'not-run') {
  return {
    connection: readResult.ok ? 'proven' : (readResult.timedOut ? 'unknown' : 'not-proven'),
    provisioning: provisioningResult
  };
}
function shouldRefreshBrowse(admittedGeneration, currentGeneration) {
  return admittedGeneration === currentGeneration;
}
function commitAccountMetadata(requestReceipt, currentAuth, returnedUid) {
  if (requestReceipt.authRecordId !== currentAuth.authRecordId || requestReceipt.authGeneration !== currentAuth.authGeneration) {
    return { ok: false, reason: 'STALE_ACCOUNT_RESPONSE', auth: currentAuth };
  }
  return { ok: true, auth: { ...currentAuth, accountUid: returnedUid } };
}

// Canonical ownership and boundary evidence.
check('R01 P1-138 remains ACTIVE', () => has(REGISTRY, '| P1-138 | ACTIVE |'));
check('R02 P1-138 canonical wording', () => has(REGISTRY, 'Read-like Yandex list/fetch/status flows must not hide provisioning/mutation authority'));
check('R03 P1-223 remains ACTIVE', () => has(REGISTRY, '| P1-223 | ACTIVE |'));
check('R04 P1-223 separate generations', () => has(REGISTRY, 'Create Folder remote mutation target and UI browse-refresh authority are separate generations'));
check('R05 no new P code claimed', () => has(EVIDENCE, 'New P-code: **NO**'));
check('R06 research only', () => has(EVIDENCE, 'RESEARCH-ONLY / CURRENT-BASELINE ADMISSION REFINEMENT'));
check('R07 runtime modification none', () => has(EVIDENCE, 'Production/runtime modification: **NONE**'));
check('R08 real L5 not run', () => has(EVIDENCE, 'Real Yandex L5: **NOT RUN**'));
check('R09 S2 none', () => has(EVIDENCE, 'Release-policy activation: **NONE**'));
check('R10 manifest unchanged', () => assert.equal(MANIFEST.version, '0.9.8'));

// Fresh source shape.
check('S01 current test handler exists', () => has(SOURCE, 'async function testYandexConnection()'));
check('S02 test uses generic API', () => has(SOURCE, "const info = await yandexApi('')"));
check('S03 test can ensure service folders', () => has(SOURCE, 'structure = await ensureYandexServiceFolders({ includeUpload: true, includeReadLater: true, includeBackup: true });'));
check('S04 folder tree helper exists', () => has(SOURCE, 'async function ensureYandexFolderTree(path, operationId = \'\')'));
check('S05 folder tree uses resources PUT', () => has(SOURCE, "method: 'PUT'"));
check('S06 generic yandexApi exists', () => has(SOURCE, 'async function yandexApi(endpoint, options = {}, allowRetry = false)'));
check('S07 current token helper exists', () => has(SOURCE, 'getValidYandexAccessToken()'));
check('S08 historical locator exists', () => has(SOURCE, 'async function findYandexFileForJournalEntry(entry, operationId = \'\')'));
check('S09 locator uses captured root or legacy config fallback', () => has(SOURCE, 'const config = context ? { rootPath: context.rootPath } : await getYandexConfig();'));
check('S10 locator uses captured account or legacy UID fallback', () => has(SOURCE, 'const currentAccountUid = context?.accountUid || await getCurrentYandexAccountUid(operationId);'));
check('S11 publication helper exists', () => has(SOURCE, 'async function ensureYandexPublicUrl(remotePath, operationId = \'\', outerDeadlineAt = 0)'));
check('S12 publication PUT exists', () => has(SOURCE, "await yandexApi('/resources/publish',"));
check('S13 options test message exists', () => has(OPTIONS, "type: 'WEBCLIP_YANDEX_TEST'"));
check('S14 options test wording is access proof', () => has(OPTIONS, 'Доступ подтверждён:'));
check('S15 create folder message exists', () => has(OPTIONS, "type: 'WEBCLIP_YANDEX_CREATE_FOLDER'"));
check('S16 create success reloads current browse path', () => has(OPTIONS, 'await loadFolders(currentBrowsePath);'));

// Evidence vocabulary locks.
[
  'observation authority != mutation authority',
  'Pure observation contract',
  'Composite command transition protocol',
  'ConnectionObservation',
  'ProvisioningResult?',
  'retry observation -> retry observation only',
  'Service-folder provisioning is a child-effect sequence',
  'Publication uses the same transition rule',
  'Create Folder composition with P1-223',
  'Historical reconciliation must not inherit current root intent',
  'Read failure cannot escalate to write',
  'Deadlines and fairness',
  'UI truth contract',
  'Source-cutover implications',
  'Current-call classification table',
  'P1-138 research refinement != runtime implementation'
].forEach((needle, i) => check(`E${String(i + 1).padStart(2, '0')}`, () => has(EVIDENCE, needle)));

// Observation must never be mutation authority.
check('A01 observation carries no mutation grant', () => assert.equal(observation().grantsMutation, false));
check('A02 success observation can derive intent but is not the intent', () => {
  const o = observation(); const d = deriveIntent(o); assert.equal(o.kind, 'observation'); assert.equal(d.ok, true); assert.notEqual(d.intent, o);
});
check('A03 failed observation cannot derive intent', () => assert.equal(deriveIntent(observation({ ok: false })).ok, false));
check('A04 timed-out observation cannot derive intent', () => assert.equal(deriveIntent(observation({ timedOut: true })).ok, false));
check('A05 missing result still grants no mutation', () => assert.equal(observation({ result: 'missing' }).grantsMutation, false));
check('A06 404-style missing can only be evidence', () => assert.equal(observation({ result: 'missing' }).kind, 'observation'));
check('A07 derived intent has explicit effect id', () => assert.equal(deriveIntent(observation(), { effectId: 'E77' }).intent.effectId, 'E77'));
check('A08 derived intent captures root', () => assert.equal(deriveIntent(observation(), { root: '/R1' }).intent.root, '/R1'));
check('A09 derived intent captures capability', () => assert.equal(deriveIntent(observation(), { capability: 'publish' }).intent.capability, 'publish'));
check('A10 derived intent captures auth generation', () => assert.equal(deriveIntent(observation({ authGen: 9 })).intent.authGeneration, 9));

// Fresh mutation admission.
const obs = observation();
const intent = deriveIntent(obs).intent;
check('M01 exact authority admits', () => assert.equal(admitMutation(auth(), intent).ok, true));
check('M02 stale auth id blocks', () => assert.equal(admitMutation(auth({ id: 'B' }), intent).reason, 'AUTH_STALE'));
check('M03 stale auth generation blocks', () => assert.equal(admitMutation(auth({ gen: 8 }), intent).reason, 'AUTH_STALE'));
check('M04 disconnected/noncurrent blocks', () => assert.equal(admitMutation(auth({ current: false }), intent).reason, 'AUTH_NOT_CURRENT'));
check('M05 account mismatch blocks', () => assert.equal(admitMutation(auth({ uid: 'uid-B' }), intent).reason, 'ACCOUNT_MISMATCH'));
check('M06 root change before mutation blocks', () => assert.equal(admitMutation(auth(), intent, '/R2').reason, 'ROOT_STALE'));
check('M07 missing write capability blocks', () => assert.equal(admitMutation(auth({ write: false }), intent).reason, 'CAPABILITY_INSUFFICIENT'));
check('M08 publish capability independently checked', () => {
  const p = deriveIntent(obs, { capability: 'publish' }).intent; assert.equal(admitMutation(auth({ publish: false }), p).ok, false);
});
check('M09 stale publication generation blocks', () => {
  const p = deriveIntent(obs, { capability: 'publish', policyGeneration: 4 }).intent; assert.equal(admitMutation(auth(), p, p.root, 5).reason, 'POLICY_STALE');
});
check('M10 admitted effect remains prepared intent identity', () => assert.equal(admitMutation(auth(), intent).effect.effectId, intent.effectId));

// Started-unknown and retry semantics.
const admitted = admitMutation(auth(), intent).effect;
const started = startEffect(admitted);
check('U01 checkpoint persisted before transport model', () => assert.equal(started.checkpointPersisted, true));
check('U02 start phase is started-unknown', () => assert.equal(started.phase, 'started-unknown'));
check('U03 unknown timeout forbids blind retry', () => assert.equal(mayBlindRetry(settle(started, 'timeout')), false));
check('U04 lost response forbids blind retry', () => assert.equal(mayBlindRetry(settle(started, 'lost-response')), false));
check('U05 proven success no longer unknown', () => assert.equal(settle(started, 'success').phase, 'proven-success'));
check('U06 exact effect id survives unknown', () => assert.equal(settle(started, 'timeout').effectId, 'E1'));
check('U07 target survives unknown', () => assert.equal(settle(started, 'timeout').target, '/root/x'));
check('U08 root survives unknown', () => assert.equal(settle(started, 'timeout').root, '/root'));

// Connection/provisioning truth split.
check('C01 read success no provisioning', () => assert.deepEqual(connectionComposite(observation(), 'not-run'), { connection: 'proven', provisioning: 'not-run' }));
check('C02 read success provisioning success', () => assert.deepEqual(connectionComposite(observation(), 'proven-success'), { connection: 'proven', provisioning: 'proven-success' }));
check('C03 read success provisioning failed preserves connection', () => assert.equal(connectionComposite(observation(), 'failed-before-effect').connection, 'proven'));
check('C04 read success provisioning unknown preserves connection', () => assert.equal(connectionComposite(observation(), 'unknown').connection, 'proven'));
check('C05 read failure keeps provisioning not-run', () => assert.deepEqual(connectionComposite(observation({ ok: false }), 'not-run'), { connection: 'not-proven', provisioning: 'not-run' }));
check('C06 read timeout is connection unknown', () => assert.equal(connectionComposite(observation({ ok: false, timedOut: true })).connection, 'unknown'));
check('C07 provisioning truth is independent field', () => assert.equal(connectionComposite(observation(), 'partial').provisioning, 'partial'));
check('C08 connection success cannot imply provisioning', () => assert.notEqual(connectionComposite(observation()).connection, connectionComposite(observation()).provisioning));

// Folder child-effect semantics and publication transition evidence.
[
  'PUT segment        = irreversible/provisioning child mutation',
  '409 verification   = read/reconciliation for that exact segment',
  'next PUT segment   = another mutation boundary',
  'no blind second `PUT` after unknown settlement',
  'a later segment is not authorized merely because an earlier segment succeeded',
  'public_url absent” is not publication consent',
  'P0-078 publication policy generation',
  'started-unknown before PUT'
].forEach((needle, i) => check(`F${String(i + 1).padStart(2, '0')}`, () => has(EVIDENCE, needle)));

// Browse generation is presentation authority, not mutation target authority.
check('B01 unchanged generation permits refresh', () => assert.equal(shouldRefreshBrowse(10, 10), true));
check('B02 newer navigation suppresses stale refresh', () => assert.equal(shouldRefreshBrowse(10, 11), false));
check('B03 much newer navigation suppresses stale refresh', () => assert.equal(shouldRefreshBrowse(2, 20), false));
check('B04 mutation target independent of browse generation', () => {
  const target = '/A/X'; const admittedBrowse = 3; const currentBrowse = 4; assert.equal(target, '/A/X'); assert.equal(shouldRefreshBrowse(admittedBrowse, currentBrowse), false);
});
check('B05 evidence assigns P1-138 admission owner', () => has(EVIDENCE, 'P1-138 = whether/how remote mutation is admitted'));
check('B06 evidence assigns P1-223 presentation owner', () => has(EVIDENCE, 'P1-223 = whether post-result UI refresh is still presentation-current'));

// Historical reconciliation: historical target/root wins over current config.
const oldCheckpoint = { effectId: 'OLD1', target: '/R1/site/file.pdf', root: '/R1', accountUid: 'uid-A', phase: 'started-unknown' };
check('H01 same-account read can reconcile', () => assert.equal(reconcile(oldCheckpoint, auth({ gen: 9, write: false })).ok, true));
check('H02 reconciliation is read-only', () => assert.equal(reconcile(oldCheckpoint, auth({ gen: 9 })).mutating, false));
check('H03 historical root preserved with current R2', () => assert.equal(reconcile(oldCheckpoint, auth({ gen: 9 }), { historicalRoot: '/R1', currentRoot: '/R2' }).root, '/R1'));
check('H04 current R2 ignored as target authority', () => assert.equal(reconcile(oldCheckpoint, auth({ gen: 9 }), { historicalRoot: '/R1', currentRoot: '/R2' }).currentRootIgnoredForTarget, true));
check('H05 historical target preserved', () => assert.equal(reconcile(oldCheckpoint, auth({ gen: 9 }), { currentRoot: '/R2' }).target, '/R1/site/file.pdf'));
check('H06 different account cannot reconcile', () => assert.equal(reconcile(oldCheckpoint, auth({ uid: 'uid-B' })).reason, 'ACCOUNT_MISMATCH'));
check('H07 no read capability cannot reconcile', () => assert.equal(reconcile(oldCheckpoint, auth({ read: false })).reason, 'READ_CAPABILITY_REQUIRED'));
check('H08 missing exact historical identity fails', () => assert.equal(reconcile(oldCheckpoint, auth(), { exactIdentity: false }).reason, 'HISTORICAL_IDENTITY_INSUFFICIENT'));
check('H09 current root cannot rescue missing identity', () => assert.equal(reconcile(oldCheckpoint, auth(), { currentRoot: '/R2', exactIdentity: false }).ok, false));
check('H10 new R2 write would need new intent', () => {
  const next = deriveIntent(observation(), { effectId: 'NEW2', root: '/R2', target: '/R2/site/file.pdf' }).intent; assert.notEqual(next.effectId, oldCheckpoint.effectId); assert.equal(next.root, '/R2');
});

// Generation-fenced ancillary account metadata.
check('G01 same request generation may enrich account', () => {
  const r = commitAccountMetadata({ authRecordId: 'A', authGeneration: 7 }, auth({ uid: '' }), 'uid-A'); assert.equal(r.ok, true); assert.equal(r.auth.accountUid, 'uid-A');
});
check('G02 stale A response cannot enrich B', () => assert.equal(commitAccountMetadata({ authRecordId: 'A', authGeneration: 7 }, auth({ id: 'B', gen: 8, uid: 'uid-B' }), 'uid-A').reason, 'STALE_ACCOUNT_RESPONSE'));
check('G03 stale generation same id cannot enrich', () => assert.equal(commitAccountMetadata({ authRecordId: 'A', authGeneration: 7 }, auth({ gen: 8 }), 'uid-A').ok, false));
check('G04 A7 response cannot enrich A9 resemblance', () => assert.equal(commitAccountMetadata({ authRecordId: 'A', authGeneration: 7 }, auth({ gen: 9 }), 'uid-A').ok, false));
check('G05 stale response preserves current auth object', () => {
  const current = auth({ id: 'B', gen: 8, uid: 'uid-B' }); const r = commitAccountMetadata({ authRecordId: 'A', authGeneration: 7 }, current, 'uid-A'); assert.deepEqual(r.auth, current);
});

// Deadline/failure taxonomy and UI truth are explicit in evidence.
[
  'read timeout                 = observation unknown/failed',
  'pre-effect admission timeout = mutation not started',
  'post-start mutation timeout  = remote settlement unknown',
  'reconciliation timeout       = effect remains unresolved',
  'connection: proven | not-proven | unknown',
  'provisioning: not-run | success | partial | unknown | failed-before-effect',
  'refresh: applied | stale-skipped | failed',
  'mutation transport is unreachable from pure-observation paths without an explicit admitted mutation object'
].forEach((needle, i) => check(`T${String(i + 1).padStart(2, '0')}`, () => has(EVIDENCE, needle)));

// Hard boundaries: no production/release authority is claimed.
check('Z01 baseline pinned', () => has(EVIDENCE, 'b285aba3972687c25b190c776ff877dfb0832316'));
check('Z02 release readiness untouched', () => has(EVIDENCE, 'This tranche changes neither V1 release authority nor V1 readiness facts.'));
check('Z03 no official zip', () => has(EVIDENCE, 'No official ZIP is built.'));
check('Z04 no tag/release/deploy', () => has(EVIDENCE, 'No release receipt, manifest/version, tag, GitHub Release or deployment is changed.'));
check('Z05 S2 separation', () => has(EVIDENCE, 'real provider qualification != P1-231 S2 activation'));
check('Z06 release readiness separation', () => has(EVIDENCE, 'P1-231 S2 activation != release readiness'));
check('Z07 current source remains pre-cutover', () => has(EVIDENCE, 'current runtime source is described truthfully as pre-cutover'));
check('Z08 no accidental runtime source marker', () => lacks(SOURCE, 'webclip-yandex-observation-mutation-admission/v1'));

console.log(`P1-138 Yandex observation/mutation admission model: PASS; cases=${cases}; schema=webclip-yandex-observation-mutation-admission/v1; baseline=b285aba3972687c25b190c776ff877dfb0832316; observation_mutation_split=true; composite_transition=explicit; connection_provisioning_truth=separate; folder_ensure=mutation; publication_transition=read-to-admitted-child-effect; browse_owner=P1-223; historical_root=checkpoint-authority; current_root_retarget=false; same_account_reconcile=read-only; account_cache=generation-fenced; runtime_modified=false; new_p_code=false; s2_authorized=false; release_authorized=false`);
