'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const REGISTRY = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_REGISTRY.md'), 'utf8');
const EVIDENCE = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_P1_178_AUTH_ATTEMPT_SETTINGS_GENERATION_REFINEMENT_2026-09-10_EVIDENCE.md'), 'utf8');
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

function begin(state, kind, clientId = '') {
  const generation = state.generation + 1;
  const attempt = { attemptId: `${kind}-${generation}`, generation, kind, clientId };
  return { ...state, generation, pending: attempt };
}
function sameAttempt(a, b) {
  return Boolean(a && b && a.attemptId === b.attemptId && a.generation === b.generation);
}
function cleanupAttempt(state, receipt) {
  if (!sameAttempt(state.pending, receipt) || state.generation !== receipt.generation) return state;
  return { ...state, pending: null };
}
function disconnect(state) {
  return { ...state, generation: state.generation + 1, pending: null, auth: null, clientId: state.clientId };
}
function commitOAuth(state, receipt, auth) {
  if (!sameAttempt(state.pending, receipt) || state.generation !== receipt.generation) return { state, committed: false };
  const nextGeneration = state.generation + 1;
  return {
    committed: true,
    state: { ...state, generation: nextGeneration, pending: null, auth: { ...auth, generation: nextGeneration }, clientId: receipt.clientId }
  };
}
function commitManual(state, candidate, validationOk) {
  if (!validationOk) return { state, committed: false };
  const generation = state.generation + 1;
  return { committed: true, state: { ...state, generation, pending: null, auth: { ...candidate, generation } } };
}
function staleFailureClear(state, capturedGeneration) {
  if (state.generation !== capturedGeneration) return state;
  return { ...state, auth: null };
}
function enrichAccount(state, capturedGeneration, account) {
  if (!state.auth || state.generation !== capturedGeneration || state.auth.generation !== capturedGeneration) return { state, committed: false };
  return { committed: true, state: { ...state, auth: { ...state.auth, account } } };
}
function controlSecretFree(control) {
  const s = JSON.stringify(control).toLowerCase();
  return !['accesstoken', 'access_token', 'refreshtoken', 'refresh_token', 'codeverifier', 'oauthstate', 'authorization'].some((x) => s.includes(x));
}

check('O01 P1-178 active', () => has(REGISTRY, '| P1-178 | ACTIVE |'));
check('O02 P1-178 owner wording', () => has(REGISTRY, 'OAuth pending/token exchange/config commit is one auth-attempt + settings-generation state machine'));
check('O03 P1-165 remains separate', () => has(REGISTRY, '| P1-165 | ACTIVE |'));
check('O04 P1-177 remains separate', () => has(REGISTRY, '| P1-177 | ACTIVE |'));
check('O05 P1-179 remains separate', () => has(REGISTRY, '| P1-179 | ACTIVE |'));
check('O06 P1-196 remains separate', () => has(REGISTRY, '| P1-196 | ACTIVE |'));
check('O07 baseline exact', () => has(EVIDENCE, 'd09ec5cbb4666636c983fb3385481d3c6eb5d9e3'));
check('O08 no new p-code', () => has(EVIDENCE, 'New P-code: **NO**'));
check('O09 runtime none', () => has(EVIDENCE, 'Production/runtime modification: **NONE**'));
check('O10 L5 not run', () => has(EVIDENCE, 'Real Chrome/Yandex L5: **NOT RUN**'));
check('O11 S2 none', () => has(EVIDENCE, 'Release-policy activation: **NONE**'));
check('O12 manifest unchanged', () => assert.equal(MANIFEST.version, '0.9.8'));

check('S01 pending key exists', () => has(SOURCE, 'yandexOAuthPending'));
check('S02 auth storage serialization exists', () => has(SOURCE, 'runYandexAuthStorageOperation'));
check('S03 config serializer exists', () => has(SOURCE, 'updateYandexConfig'));
const start = asyncSection('async function startYandexOAuth(clientId, sourceTabId = 0)');
check('S04 start creates pending state', () => has(start, 'yandexOAuthPending'));
check('S05 start has PKCE verifier', () => has(start, 'codeVerifier'));
check('S06 start has oauth state', () => has(start, 'state'));
check('S07 start pending lacks attemptId', () => lacks(start, 'attemptId'));
check('S08 start pending lacks auth generation', () => lacks(start, 'authGeneration'));
check('S09 start cleanup removes shared pending key', () => has(start, "chrome.storage.session.remove('yandexOAuthPending')"));

const finish = asyncSection('async function finishYandexOAuth(code)');
check('S10 finish reads pending', () => has(finish, 'yandexOAuthPending'));
check('S11 finish exchanges code', () => has(finish, 'exchangeAuthorizationCode'));
check('S12 finish updates config after capture', () => has(finish, 'updateYandexConfig'));
check('S13 finish writes auth', () => has(finish, 'writeYandexAuth'));
check('S14 finish removes pending', () => has(finish, "chrome.storage.session.remove('yandexOAuthPending')"));
check('S15 finish has no attemptId check', () => lacks(finish, 'attemptId'));
check('S16 finish has no auth generation check', () => lacks(finish, 'authGeneration'));

const manual = asyncSection('async function setManualYandexToken(token)');
check('S17 manual writes auth', () => has(manual, 'writeYandexAuth(yandexAuth)'));
check('S18 manual performs provider read', () => has(manual, "await yandexApi('')"));
check('S19 manual failure clears auth', () => has(manual, 'writeYandexAuth(null)'));
check('S20 manual has no auth generation guard', () => lacks(manual, 'authGeneration'));

check('S21 disconnect case exists', () => has(SOURCE, 'WEBCLIP_YANDEX_DISCONNECT'));
check('S22 disconnect clears auth', () => has(SOURCE, 'await writeYandexAuth(null)'));
check('S23 status observes pending', () => has(SOURCE, 'yandexOAuthPending'));
check('S24 source lacks shared authGeneration symbol', () => lacks(SOURCE, 'authGeneration'));

const s0 = { generation: 0, pending: null, auth: { tokenTag: 'old', generation: 0 }, clientId: 'old' };
const sA = begin(s0, 'oauth', 'client-A');
const a = sA.pending;
const sB = begin(sA, 'oauth', 'client-B');
const b = sB.pending;
check('N01 late A cleanup cannot remove B', () => assert.ok(sameAttempt(cleanupAttempt(sB, a).pending, b)));
check('N02 expired A cleanup cannot remove B', () => assert.ok(sameAttempt(cleanupAttempt(sB, a).pending, b)));
check('N03 old exchange A cannot commit after B starts', () => assert.equal(commitOAuth(sB, a, { tokenTag: 'A' }).committed, false));
check('N04 old exchange cannot resurrect after disconnect', () => {
  const d = disconnect(sA); assert.equal(commitOAuth(d, a, { tokenTag: 'A' }).committed, false); assert.equal(d.auth, null);
});
check('N05 old OAuth cannot overwrite manual B', () => {
  const mb = commitManual(sA, { tokenTag: 'B' }, true).state;
  assert.equal(commitOAuth(mb, a, { tokenTag: 'A' }).committed, false); assert.equal(mb.auth.tokenTag, 'B');
});
check('N06 late manual A failure cannot clear newer OAuth B', () => {
  const initial = begin({ generation: 2, pending: null, auth: null, clientId: '' }, 'oauth', 'B');
  const committed = commitOAuth(initial, initial.pending, { tokenTag: 'B' }).state;
  assert.equal(staleFailureClear(committed, 2).auth.tokenTag, 'B');
});
check('N07 late manual enrichment cannot overwrite newer manual B', () => {
  const aCommit = commitManual({ generation: 0, pending: null, auth: null, clientId: '' }, { tokenTag: 'A' }, true).state;
  const bCommit = commitManual(aCommit, { tokenTag: 'B' }, true).state;
  const r = enrichAccount(bCommit, aCommit.generation, { uid: 'A' });
  assert.equal(r.committed, false); assert.equal(r.state.auth.tokenTag, 'B');
});
check('N08 exact current OAuth commits once', () => assert.equal(commitOAuth(sA, a, { tokenTag: 'A' }).committed, true));
check('N09 consumed OAuth cannot commit twice', () => {
  const once = commitOAuth(sA, a, { tokenTag: 'A' }).state;
  assert.equal(commitOAuth(once, a, { tokenTag: 'A2' }).committed, false);
});
check('N10 stale finish cannot remove newer pending', () => assert.ok(sameAttempt(cleanupAttempt(sB, a).pending, b)));
check('N11 stale finish cannot overwrite newer clientId', () => {
  const r = commitOAuth(sB, a, { tokenTag: 'A' }); assert.equal(r.state.clientId, sB.clientId);
});
check('N12 exact start cleanup consumes itself', () => assert.equal(cleanupAttempt(sA, a).pending, null));
check('N13 exact expiry cleanup consumes its own receipt', () => assert.equal(cleanupAttempt(sA, a).pending, null));
check('N14 control identity is secret-free', () => assert.equal(controlSecretFree({ generation: 4, attemptId: 'oauth-4', kind: 'oauth', clientId: 'public-client-id' }), true));
check('N15 disconnect is generation barrier', () => assert.equal(disconnect(sA).generation, sA.generation + 1));
check('N16 failed manual candidate does not mutate current state', () => {
  const r = commitManual(sB, { tokenTag: 'bad' }, false); assert.strictEqual(r.state, sB); assert.equal(r.committed, false);
});
check('N17 account enrichment requires generation match', () => {
  const m = commitManual({ generation: 0, pending: null, auth: null, clientId: '' }, { tokenTag: 'A' }, true).state;
  assert.equal(enrichAccount(m, m.generation, { uid: 'A' }).committed, true);
  assert.equal(enrichAccount(m, m.generation - 1, { uid: 'stale' }).committed, false);
});
check('N18 serialization is not generation authority', () => has(EVIDENCE, 'It does **not** prove that a writer still owns current logical authority'));
check('N19 P1-165 state verification separate', () => has(EVIDENCE, 'P1-165 remains unresolved separately'));
check('N20 P1-177 scheduler generation separate', () => has(EVIDENCE, 'scheduler generation remains separate'));
check('N21 P1-179 namespace separate', () => has(EVIDENCE, 'is not the auth-attempt generation'));
check('N22 P1-196 shared generation composition', () => has(EVIDENCE, 'Both must use the same generation rather than independent counters'));
check('N23 manifest stays 0.9.8', () => assert.equal(MANIFEST.version, '0.9.8'));
check('N24 no runtime/L5/S2/release action', () => {
  has(EVIDENCE, 'runtime remains unchanged'); has(EVIDENCE, 'no real L5'); has(EVIDENCE, 'V1 readiness and release authority are untouched.');
});

[
  'cleanup(A) may consume only exact attemptId+generation A',
  'An old expired snapshot is not deletion authority over a newer attempt.',
  'A successful exchange result does not reserve future commit authority indefinitely.',
  'advance shared auth/settings generation first',
  'A failed or unknown candidate does not gain authority to clear a newer proven auth generation.',
  'matching clientId and auth commit as one logical generation transition',
  'cross-storage partial commit has explicit recoverable semantics'
].forEach((needle, i) => check(`E${String(i + 1).padStart(2, '0')}`, () => has(EVIDENCE, needle)));

console.log(`P1-178 auth attempt/settings generation refinement model: PASS; cases=${cases}; schema=webclip-auth-attempt-settings-generation/v1; baseline=d09ec5cbb4666636c983fb3385481d3c6eb5d9e3; pending_attempt_generation=current-gap; start_cleanup_compare_remove=required; expiry_cleanup_compare_remove=required; finish_post_exchange_cas=required; disconnect_generation_barrier=required; manual_late_failure_guard=required; account_enrichment_guard=required; storage_serialization=preserved; returned_state_owner=P1-165; scheduler_generation_owner=P1-177; namespace_owner=P1-179; auth_validity_owner=P1-196; runtime_modified=false; new_p_code=false; s2_authorized=false; release_authorized=false`);
