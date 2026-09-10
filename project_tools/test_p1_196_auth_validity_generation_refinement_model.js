'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const REGISTRY = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_REGISTRY.md'), 'utf8');
const EVIDENCE = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_P1_196_AUTH_VALIDITY_GENERATION_REFINEMENT_2026-09-10_EVIDENCE.md'), 'utf8');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));

let cases = 0;
function check(name, fn) {
  try { fn(); cases += 1; }
  catch (error) { error.message = `${name}: ${error.message}`; throw error; }
}
function has(text, needle) { assert.ok(text.includes(needle), `missing ${JSON.stringify(needle)}`); }
function lacks(text, needle) { assert.ok(!text.includes(needle), `unexpected ${JSON.stringify(needle)}`); }
function asyncSection(signature) {
  const start = SOURCE.indexOf(signature);
  assert.ok(start >= 0, `function missing: ${signature}`);
  const next = SOURCE.indexOf('\nasync function ', start + signature.length);
  return SOURCE.slice(start, next >= 0 ? next : SOURCE.length);
}

function auth(recordId, generation, validity = 'valid', expiryKnowledge = 'unknown', expiresAt = 0) {
  return { recordId, generation, validity, expiryKnowledge, expiresAt };
}
function requestReceipt(current, authorizationBound = true) {
  return { requestKind: 'disk-oauth', authGeneration: current.generation, authRecordId: current.recordId, authorizationBound };
}
function matchesReceipt(current, receipt) {
  return Boolean(current && receipt && receipt.authorizationBound && receipt.requestKind === 'disk-oauth' && current.generation === receipt.authGeneration && current.recordId === receipt.authRecordId);
}
function demote401(state, receipt) {
  if (!matchesReceipt(state.auth, receipt)) return { state, demoted: false, operationFailed: true };
  const generation = state.generation + 1;
  return { demoted: true, operationFailed: true, state: { ...state, generation, auth: { ...state.auth, generation, validity: 'invalid' } } };
}
function expireKnown(state, captured) {
  if (!matchesReceipt(state.auth, captured)) return { state, expired: false };
  if (state.auth.expiryKnowledge !== 'known' || !(state.auth.expiresAt > 0)) return { state, expired: false };
  const generation = state.generation + 1;
  return { expired: true, state: { ...state, generation, auth: { ...state.auth, generation, validity: 'expired' } } };
}
function classifyFailure(status, kind = 'disk-oauth') {
  if (kind !== 'disk-oauth') return 'operation-failure-only';
  if (status === 401) return 'invalid-auth-candidate';
  return 'operation-failure-only';
}
function statusTruth(current) {
  return {
    authPresent: Boolean(current),
    authValidity: current?.validity || 'unknown',
    authUsable: Boolean(current && current.validity === 'valid'),
    expiryKnowledge: current?.expiryKnowledge || 'unknown'
  };
}
function enrichAccount(state, receipt, account) {
  if (!matchesReceipt(state.auth, receipt)) return { state, committed: false };
  return { committed: true, state: { ...state, auth: { ...state.auth, account } } };
}
function receiptSecretFree(receipt) {
  const s = JSON.stringify(receipt).toLowerCase();
  return !['accesstoken', 'access_token', 'refreshtoken', 'refresh_token', 'authorization', 'oauth '].some((x) => s.includes(x));
}

// Owner and scope.
check('O01 P1-196 ACTIVE', () => has(REGISTRY, '| P1-196 | ACTIVE |'));
check('O02 P1-196 exact owner', () => has(REGISTRY, 'Invalid-token/401 demotion is exact auth-generation fenced; stale failure from auth A cannot clear/downgrade newer auth B.'));
check('O03 P1-178 ACTIVE', () => has(REGISTRY, '| P1-178 | ACTIVE |'));
check('O04 P1-191 ACTIVE', () => has(REGISTRY, '| P1-191 | ACTIVE |'));
check('O05 P1-195 ACTIVE', () => has(REGISTRY, '| P1-195 | ACTIVE |'));
check('O06 P1-177 ACTIVE', () => has(REGISTRY, '| P1-177 | ACTIVE |'));
check('O07 P1-179 ACTIVE', () => has(REGISTRY, '| P1-179 | ACTIVE |'));
check('O08 baseline exact', () => has(EVIDENCE, '07ba5d17569dd563102e6699431222742bec9dde'));
check('O09 no new P-code', () => has(EVIDENCE, 'New P-code: **NO**'));
check('O10 runtime unchanged', () => has(EVIDENCE, 'Production/runtime modification: **NONE**'));
check('O11 L5 not run', () => has(EVIDENCE, 'Real Chrome/Yandex L5: **NOT RUN**'));
check('O12 S2 untouched', () => has(EVIDENCE, 'Release-policy activation: **NONE**'));
check('O13 manifest remains 0.9.8', () => assert.equal(MANIFEST.version, '0.9.8'));

// Current-source positive controls and gaps.
const statusSection = asyncSection('async function getYandexStatus()');
check('S01 status token presence drives connected', () => has(statusSection, 'connected: Boolean(yandexAuth?.accessToken)'));
const validToken = asyncSection('async function getValidYandexAccessToken()');
check('S02 known expiry skew exists', () => has(validToken, 'yandexAuth.expiresAt && yandexAuth.expiresAt <= Date.now() + 60_000'));
check('S03 expiry throws unusable error', () => has(validToken, 'Срок действия OAuth-токена истёк'));
check('S04 expiry function has no auth demotion write', () => lacks(validToken, 'writeYandexAuth'));
const api = asyncSection('async function yandexApi(endpoint, options = {}, allowRetry = false)');
check('S05 API attaches response status', () => has(api, 'error.status = response.status'));
check('S06 API attaches bounded provider code', () => has(api, "error.code = boundedYandexExternalText(data?.error || '', MAX_YANDEX_EXTERNAL_ERROR_CHARS)"));
check('S07 API has no explicit exact 401 demotion branch', () => lacks(api, 'response.status === 401'));
check('S08 API builds OAuth Authorization', () => has(api, "'Authorization': `OAuth ${token}`"));
check('S09 caller headers are spread after OAuth header', () => {
  const authAt = api.indexOf("'Authorization': `OAuth ${token}`");
  const spreadAt = api.indexOf('...(options.headers || {})');
  assert.ok(authAt >= 0 && spreadAt > authAt);
});
check('S10 runtime has no authGeneration field yet', () => lacks(SOURCE, 'authGeneration'));
check('S11 OAuth unknown expiry stored as zero', () => has(SOURCE, 'expiresAt: expiresInSeconds ? now + expiresInSeconds * 1000 : 0'));
const recovery = asyncSection("async function recoverPendingRemoteSaves(trigger = 'startup')");
check('S12 recovery snapshots authAvailable before loop', () => {
  const authAt = recovery.indexOf('let authAvailable = true');
  const loopAt = recovery.indexOf('for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1)');
  assert.ok(authAt >= 0 && loopAt > authAt);
});
check('S13 recovery uses same snapshot inside loop', () => has(recovery, 'if (!authAvailable)'));

// Deterministic schedules.
const a = auth('A', 1, 'valid');
const stateA = { generation: 1, auth: a };
const rA = requestReceipt(a);
check('N01 current A/401 demotes once', () => assert.equal(demote401(stateA, rA).demoted, true));
check('N02 duplicate old A/401 stale after demotion', () => {
  const once = demote401(stateA, rA).state;
  assert.equal(demote401(once, rA).demoted, false);
});
check('N03 A request then B commit then late A/401 leaves B', () => {
  const stateB = { generation: 2, auth: auth('B', 2, 'valid') };
  const out = demote401(stateB, rA);
  assert.equal(out.demoted, false); assert.equal(out.state.auth.recordId, 'B');
});
check('N04 stale A expiry cannot demote B', () => {
  const expA = auth('A', 1, 'valid', 'known', 100);
  const receipt = requestReceipt(expA);
  const stateB = { generation: 2, auth: auth('B', 2, 'valid', 'known', 1000) };
  assert.equal(expireKnown(stateB, receipt).expired, false);
});
check('N05 current known expiry becomes unusable', () => {
  const expA = auth('A', 1, 'valid', 'known', 100);
  const out = expireKnown({ generation: 1, auth: expA }, requestReceipt(expA));
  assert.equal(out.expired, true); assert.equal(statusTruth(out.state.auth).authUsable, false);
});
check('N06 unknown expiry remains unknown', () => assert.equal(statusTruth(auth('A', 1, 'valid', 'unknown', 0)).expiryKnowledge, 'unknown'));
check('N07 token presence and validity are distinct', () => {
  const t = statusTruth(auth('A', 1, 'invalid')); assert.equal(t.authPresent, true); assert.equal(t.authUsable, false);
});
check('N08 current source connected is presence-based', () => has(EVIDENCE, 'connected: Boolean(yandexAuth?.accessToken)'));
check('N09 current source lacks 401 demotion', () => has(EVIDENCE, 'There is no current exact-generation branch'));
check('N10 caller Authorization override is structurally possible', () => has(EVIDENCE, 'caller-supplied `Authorization` can theoretically override'));
check('N11 exact bound receipt permits current demotion', () => assert.equal(demote401(stateA, rA).demoted, true));
check('N12 unbound receipt cannot mutate auth', () => assert.equal(demote401(stateA, requestReceipt(a, false)).demoted, false));
check('N13 generic 403 does not demote', () => assert.equal(classifyFailure(403), 'operation-failure-only'));
check('N14 timeout does not demote', () => assert.equal(classifyFailure(0), 'operation-failure-only'));
check('N15 5xx does not demote', () => assert.equal(classifyFailure(503), 'operation-failure-only'));
check('N16 signed-transfer 401 does not demote OAuth', () => assert.equal(classifyFailure(401, 'signed-transfer'), 'operation-failure-only'));
check('N17 stale enrichment cannot overwrite B', () => {
  const stateB = { generation: 2, auth: auth('B', 2, 'valid') };
  const out = enrichAccount(stateB, rA, { uid: 'A' }); assert.equal(out.committed, false); assert.equal(out.state.auth.recordId, 'B');
});
check('N18 stale negative read cannot invalidate B', () => {
  const stateB = { generation: 2, auth: auth('B', 2, 'valid') };
  assert.equal(demote401(stateB, rA).demoted, false);
});
check('N19 manual late A failure cannot clear B', () => has(EVIDENCE, 'late failure for stale candidate A -> cannot clear/demote current B'));
check('N20 same shared generation gates positive and negative writes', () => has(EVIDENCE, 'same exact auth generation must fence both positive enrichment and negative validity transitions'));
check('N21 capability remains separate', () => has(EVIDENCE, 'P1-195 = Disk capability truth, separate from auth validity'));
check('N22 scheduler consumes unusable auth for new admission', () => has(EVIDENCE, 'feeds P1-177 as `no usable auth`'));
check('N23 historical namespace survives invalidation', () => has(EVIDENCE, 'delete P1-179 historical namespace checkpoints'));
check('N24 no automatic mutation replay under B', () => has(EVIDENCE, 'M(A) does not silently become M(B)'));
check('N25 later recovery child must recheck auth', () => has(EVIDENCE, 'before each auth-required child'));
check('N26 pre-loop authAvailable snapshot is insufficient', () => has(EVIDENCE, 'If item 2 consumes the old `authAvailable=true` snapshot'));
check('N27 receipt is secret-free', () => assert.equal(receiptSecretFree(rA), true));
check('N28 manifest stays 0.9.8', () => assert.equal(MANIFEST.version, '0.9.8'));
check('N29 no runtime/L5/S2/release action', () => {
  has(EVIDENCE, 'runtime remains unchanged'); has(EVIDENCE, 'no real L5'); has(EVIDENCE, 'V1 readiness and release authority are untouched.');
});

[
  'P1-196 does **not** create a second auth-generation counter.',
  'Stale for demotion',
  'Naive `401 -> writeYandexAuth(null)` is forbidden.',
  'generic `403 => invalid auth` rule is unsafe',
  'signed-transfer 401/403',
  'expiryKnowledge = unknown',
  'A new auth generation is not replay authority for an old physical mutation.'
].forEach((needle, i) => check(`E${String(i + 1).padStart(2, '0')}`, () => has(EVIDENCE, needle)));

console.log(`P1-196 auth validity generation refinement model: PASS; cases=${cases}; schema=webclip-auth-validity-generation/v1; baseline=07ba5d17569dd563102e6699431222742bec9dde; connected_presence_only=current-gap; explicit_validity=current-gap; expiry_unknown=explicit-required; current_401_demotion=missing; stale_401=must-not-demote; request_binding=final-authorization-required; caller_authorization_override=current-surface; generic_403=no-demotion; signed_transfer_401=no-oauth-demotion; recovery_auth_recheck=required; shared_generation_owner=P1-178; capability_owner=P1-195; scheduler_owner=P1-177; namespace_owner=P1-179; runtime_modified=false; new_p_code=false; s2_authorized=false; release_authorized=false`);
