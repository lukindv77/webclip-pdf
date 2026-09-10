'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASELINE = 'd09ec5cbb4666636c983fb3385481d3c6eb5d9e3';
const EXPECTED_WORKER_BLOB = '6d61ac81befdbf2804ae9dbec425aa08d1194eb1';
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const registry = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_REGISTRY.md'), 'utf8');
const w5 = fs.readFileSync(path.join(ROOT, 'project_tools', 'test_w5_fixed_redirect_auth_core_refinement_model.js'), 'utf8');
const p1177 = fs.readFileSync(path.join(ROOT, 'project_tools', 'test_p1_177_backup_pause_resume_generation_refinement_model.js'), 'utf8');

let cases = 0;
function check(condition, message) {
  cases += 1;
  assert.ok(condition, message);
}
function equal(actual, expected, message) {
  cases += 1;
  assert.deepStrictEqual(actual, expected, message);
}
function gitBlobSha(text) {
  const bytes = Buffer.from(text, 'utf8');
  return crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
}
function functionSlice(name) {
  const markers = [`async function ${name}(`, `function ${name}(`];
  let start = -1;
  for (const marker of markers) {
    const candidate = worker.indexOf(marker);
    if (candidate >= 0 && (start < 0 || candidate < start)) start = candidate;
  }
  assert.ok(start >= 0, `cannot locate ${name}()`);
  const nextAsync = worker.indexOf('\nasync function ', start + 1);
  const nextSync = worker.indexOf('\nfunction ', start + 1);
  const ends = [nextAsync, nextSync].filter((value) => value > start);
  const end = ends.length ? Math.min(...ends) : worker.length;
  return worker.slice(start, end);
}

// ---------------------------------------------------------------------------
// Exact current-main source absorption census.
// ---------------------------------------------------------------------------

check(gitBlobSha(worker) === EXPECTED_WORKER_BLOB,
  'canonical runtime blob moved: refresh P1-178 absorption evidence before accepting this model');
check(registry.includes('| P1-178 | ACTIVE | OAuth pending/token exchange/config commit is one auth-attempt + settings-generation state machine; stale finish/cleanup cannot delete/overwrite newer attempt/settings. |'),
  'P1-178 canonical owner/status changed');
check(registry.includes('| P1-191 | ACTIVE | Manual-token replacement must validate candidate before generation-fenced commit'),
  'P1-191 owner boundary changed');
check(registry.includes('P1-196') && /Invalid-token\/401 demotion|auth validity|auth-validity/i.test(registry),
  'P1-196 exact-generation demotion owner is no longer visible in canonical registry');
check(/shared_generation=true/.test(w5), 'W5 composition no longer declares one shared auth generation');
check(/returned_state_authority=false/.test(w5), 'W5 unexpectedly claims returned-state authority');
check(/auth_generation_owner=P1-178/.test(p1177), 'P1-177 no longer consumes P1-178 auth generation');

const start = functionSlice('startYandexOAuth');
const finish = functionSlice('finishYandexOAuth');
const manual = functionSlice('setManualYandexToken');
const status = functionSlice('getYandexStatus');
const authQueue = functionSlice('runYandexAuthStorageOperation');

check(/code_challenge_method['"],\s*['"]S256['"]/.test(worker), 'PKCE S256 positive control disappeared');
check(/const YANDEX_AUTH_STORAGE_SESSION = ['"]session['"]/.test(worker), 'session-only auth storage mode positive control disappeared');
check(/chrome\.storage\.session\.set/.test(worker) && /codeVerifier/.test(start), 'PKCE verifier is not visibly kept in session storage');
check(/yandexAuthStorageSettlementChain/.test(authQueue), 'Yandex auth storage actual-settlement serialization disappeared');
check(/withOperationTimeout/.test(authQueue), 'bounded Yandex auth storage wait disappeared');
check(!/(?:authAttemptId|oauthAttemptId|attemptId)/.test(start), 'current start unexpectedly gained OAuth attempt identity; refresh refinement');
check(!/(?:YANDEX_AUTH_GENERATION|yandexAuthGeneration|authGeneration|expectedGeneration)/.test(start), 'current start unexpectedly gained shared generation binding; refresh refinement');
check(/yandexOAuthPending\s*:\s*\{[\s\S]*clientId[\s\S]*codeVerifier[\s\S]*state[\s\S]*expiresAt/.test(start),
  'current pending PKCE shape changed unexpectedly');
check(/chrome\.storage\.session\.remove\(['"]yandexOAuthPending['"]\)/.test(start),
  'current late start-failure global cleanup is no longer present; refresh refinement');
check(!/(?:compareAndRemove|removeIfCurrent|clearOAuthAttemptIfCurrent)/.test(start),
  'current start now appears to use exact pending cleanup; refresh refinement');
check(/chrome\.storage\.session\.get\(['"]yandexOAuthPending['"]\)/.test(finish),
  'finish no longer captures global pending slot as expected by current-gap census');
check(/exchangeAuthorizationCode/.test(finish), 'finish no longer crosses the token-exchange boundary');
check(/updateYandexConfig/.test(finish) && /writeYandexAuth\(yandexAuth\)/.test(finish),
  'finish config/auth commit shape changed');
check((finish.match(/writeYandexAuth\(yandexAuth\)/g) || []).length >= 2,
  'delayed account-enrichment second auth write is no longer present; refresh refinement');
check(/chrome\.storage\.session\.remove\(['"]yandexOAuthPending['"]\)/.test(finish),
  'finish no longer globally consumes pending; refresh refinement');
check(!/(?:authAttemptId|oauthAttemptId|attemptId|expectedGeneration|authGeneration|yandexAuthGeneration)/.test(finish),
  'finish unexpectedly gained generation/attempt fencing; refresh refinement');
check(/chrome\.storage\.session\.remove\(['"]yandexOAuthPending['"]\)/.test(status),
  'status/expiry global pending cleanup no longer present; refresh refinement');
check(/await writeYandexAuth\(yandexAuth\)/.test(manual), 'manual candidate is no longer globally installed before validation; refresh P1-191 composition');
check(/await yandexApi\(['"]['"]\)/.test(manual), 'manual validation no longer uses global Yandex API path; refresh P1-191 composition');
check(/catch\s*\([^)]*\)\s*\{[\s\S]*writeYandexAuth\(null\)/.test(manual),
  'manual failure no longer clears global auth; refresh P1-191 composition');
check(/case ['"]WEBCLIP_YANDEX_DISCONNECT['"][\s\S]{0,700}writeYandexAuth\(null\)[\s\S]{0,700}yandexOAuthPending/.test(worker),
  'Disconnect auth+pending clear shape changed');
check(!/(?:YANDEX_AUTH_GENERATION|yandexAuthGeneration|authGeneration)/.test(worker),
  'production worker now contains an auth-generation symbol; current-gap conclusion must be refreshed');

// ---------------------------------------------------------------------------
// Target single-generation state machine.
// This is a model, not production code.
// ---------------------------------------------------------------------------

function makeState() {
  return {
    generation: 0,
    pending: null,
    auth: { id: 'proven-0', generation: 0, token: 'A0', account: null },
    configClientId: 'client-0',
    transition: null,
    connectedTruth: true
  };
}

function beginOauth(state, attemptId, clientId) {
  state.generation += 1;
  state.pending = {
    attemptId,
    generation: state.generation,
    clientId,
    codeVerifier: `verifier-${attemptId}`,
    oauthState: `state-${attemptId}`,
    createdAt: 1000 + state.generation,
    expiresAt: 5000 + state.generation
  };
  return { ...state.pending };
}

function samePending(state, receipt) {
  return Boolean(state.pending &&
    state.pending.attemptId === receipt.attemptId &&
    state.pending.generation === receipt.generation);
}

function cleanupPendingIfCurrent(state, receipt) {
  if (state.generation !== receipt.generation || !samePending(state, receipt)) return false;
  state.pending = null;
  return true;
}

function commitOauthIfCurrent(state, receipt, token) {
  if (state.generation !== receipt.generation) return { outcome: 'stale-generation' };
  if (!samePending(state, receipt)) return { outcome: 'stale-attempt' };
  const successorGeneration = state.generation + 1;
  state.generation = successorGeneration;
  state.auth = {
    id: `oauth:${receipt.attemptId}:${successorGeneration}`,
    generation: successorGeneration,
    token,
    account: null
  };
  state.configClientId = receipt.clientId;
  state.pending = null;
  state.connectedTruth = true;
  return { outcome: 'committed', generation: successorGeneration, authId: state.auth.id };
}

function manualCandidateResult(state, expectedGeneration, candidate, validation) {
  if (validation !== 'valid') return { outcome: validation, generation: state.generation };
  if (state.generation !== expectedGeneration) return { outcome: 'stale-generation', generation: state.generation };
  state.generation += 1;
  state.auth = { id: `manual:${state.generation}`, generation: state.generation, token: candidate, account: null };
  state.pending = null;
  state.connectedTruth = true;
  return { outcome: 'committed', generation: state.generation };
}

function disconnect(state) {
  state.generation += 1;
  state.auth = null;
  state.pending = null;
  state.connectedTruth = false;
  return state.generation;
}

function requestReceipt(state) {
  assert.ok(state.auth, 'request requires current auth');
  return { authId: state.auth.id, generation: state.auth.generation, authorizationBound: true };
}

function demote401IfCurrent(state, receipt) {
  if (!receipt.authorizationBound || !state.auth) return { outcome: 'stale' };
  if (state.auth.id !== receipt.authId || state.auth.generation !== receipt.generation || state.generation !== receipt.generation) {
    return { outcome: 'stale' };
  }
  state.generation += 1;
  state.auth = null;
  state.connectedTruth = false;
  return { outcome: 'demoted', generation: state.generation };
}

function enrichAccountIfCurrent(state, expectedGeneration, authId, account) {
  if (!state.auth || state.generation !== expectedGeneration || state.auth.generation !== expectedGeneration || state.auth.id !== authId) {
    return false;
  }
  state.auth = { ...state.auth, account };
  return true;
}

// A01/A02: exact cleanup cannot consume newer pending state.
for (let i = 0; i < 12; i += 1) {
  const s = makeState();
  const a = beginOauth(s, `A-${i}`, `client-A-${i}`);
  const b = beginOauth(s, `B-${i}`, `client-B-${i}`);
  equal(cleanupPendingIfCurrent(s, a), false, 'late A start/status cleanup consumed newer B');
  equal(s.pending.attemptId, b.attemptId, 'newer pending attempt identity changed after stale cleanup');
  equal(s.pending.generation, b.generation, 'newer pending generation changed after stale cleanup');
}

// A03: old exchange cannot commit after a newer OAuth attempt begins.
for (let i = 0; i < 10; i += 1) {
  const s = makeState();
  const a = beginOauth(s, `exchange-A-${i}`, `ca-${i}`);
  const b = beginOauth(s, `exchange-B-${i}`, `cb-${i}`);
  equal(commitOauthIfCurrent(s, a, `token-A-${i}`).outcome, 'stale-generation', 'old exchange committed after newer attempt');
  equal(s.pending.attemptId, b.attemptId, 'old exchange removed newer pending attempt');
}

// A04: successful manual replacement invalidates older OAuth finish authority.
for (let i = 0; i < 10; i += 1) {
  const s = makeState();
  const a = beginOauth(s, `manual-race-${i}`, `oauth-client-${i}`);
  const expected = s.generation;
  equal(manualCandidateResult(s, expected, `manual-${i}`, 'valid').outcome, 'committed', 'valid manual replacement did not commit');
  equal(commitOauthIfCurrent(s, a, `oauth-stale-${i}`).outcome, 'stale-generation', 'old PKCE overwrote successful manual replacement');
  equal(s.auth.token, `manual-${i}`, 'manual auth was not preserved against stale OAuth finish');
}

// A05: Disconnect invalidates in-flight OAuth completion.
for (let i = 0; i < 8; i += 1) {
  const s = makeState();
  const a = beginOauth(s, `disconnect-race-${i}`, `client-${i}`);
  const disconnectedGeneration = disconnect(s);
  equal(commitOauthIfCurrent(s, a, `resurrect-${i}`).outcome, 'stale-generation', 'stale OAuth finish resurrected auth after Disconnect');
  equal(s.auth, null, 'auth resurrected after Disconnect');
  equal(s.generation, disconnectedGeneration, 'stale finish changed Disconnect successor generation');
}

// A06/A11/A12: exact current finish advances once; stale account enrichment and duplicate receipt are fenced.
for (let i = 0; i < 8; i += 1) {
  const s = makeState();
  const a = beginOauth(s, `finish-${i}`, `client-${i}`);
  const committed = commitOauthIfCurrent(s, a, `oauth-${i}`);
  equal(committed.outcome, 'committed', 'current OAuth finish failed to commit');
  equal(s.pending, null, 'successful finish did not consume its exact receipt');
  equal(cleanupPendingIfCurrent(s, a), false, 'consumed receipt remained cleanup-authoritative');
  const oldAuthId = committed.authId;
  const oldGeneration = committed.generation;
  const manualExpected = s.generation;
  manualCandidateResult(s, manualExpected, `newer-${i}`, 'valid');
  equal(enrichAccountIfCurrent(s, oldGeneration, oldAuthId, { uid: `old-${i}` }), false,
    'stale account enrichment overwrote newer auth generation');
  equal(s.auth.token, `newer-${i}`, 'stale account enrichment changed newer token');
}

// A07/A08/A09: exact-generation 401 demotion, stale 401 protection and idempotency.
for (let i = 0; i < 8; i += 1) {
  const current = makeState();
  const pending = beginOauth(current, `auth-${i}`, `client-${i}`);
  commitOauthIfCurrent(current, pending, `auth-token-${i}`);
  const r = requestReceipt(current);
  const demoted = demote401IfCurrent(current, r);
  equal(demoted.outcome, 'demoted', 'current authoritative 401 did not demote exact auth');
  equal(current.auth, null, 'demoted auth remained usable');
  equal(demote401IfCurrent(current, r).outcome, 'stale', 'duplicate old 401 was not idempotently stale');

  const stale = makeState();
  const old = requestReceipt(stale);
  const expected = stale.generation;
  manualCandidateResult(stale, expected, `B-${i}`, 'valid');
  equal(demote401IfCurrent(stale, old).outcome, 'stale', 'late A/401 demoted newer B');
  equal(stale.auth.token, `B-${i}`, 'newer B was erased by stale 401');
}

// A10/A17/A18: invalid/unknown manual candidate and non-authoritative failures do not mutate auth generation.
for (const validation of ['invalid', 'unknown']) {
  for (let i = 0; i < 6; i += 1) {
    const s = makeState();
    const before = JSON.stringify(s);
    const generation = s.generation;
    equal(manualCandidateResult(s, generation, `bad-${validation}-${i}`, validation).outcome, validation,
      'manual validation outcome changed');
    equal(s.generation, generation, 'invalid/unknown candidate advanced shared generation');
    equal(JSON.stringify(s), before, 'invalid/unknown candidate mutated proven auth state');
  }
}

// A13/A14: cross-storage logical transition is restart-detectable and cannot overwrite newer generation.
function beginLogicalTransition(state, receipt, token) {
  if (state.generation !== receipt.generation || !samePending(state, receipt)) return null;
  const tx = {
    id: `tx:${receipt.attemptId}:${receipt.generation + 1}`,
    fromGeneration: receipt.generation,
    toGeneration: receipt.generation + 1,
    attemptId: receipt.attemptId,
    clientId: receipt.clientId,
    token,
    phase: 'preparing'
  };
  state.transition = tx;
  state.connectedTruth = false;
  return { ...tx };
}
function recoverLogicalTransition(state, tx) {
  if (!state.transition || state.transition.id !== tx.id) return 'not-owner';
  if (state.generation !== tx.fromGeneration || !samePending(state, { attemptId: tx.attemptId, generation: tx.fromGeneration })) {
    state.transition = null;
    return 'stale-transition';
  }
  state.generation = tx.toGeneration;
  state.auth = { id: `oauth:${tx.attemptId}:${tx.toGeneration}`, generation: tx.toGeneration, token: tx.token, account: null };
  state.configClientId = tx.clientId;
  state.pending = null;
  state.transition = null;
  state.connectedTruth = true;
  return 'recovered-commit';
}
for (let i = 0; i < 8; i += 1) {
  const recoverable = makeState();
  const a = beginOauth(recoverable, `tx-A-${i}`, `tx-client-${i}`);
  const tx = beginLogicalTransition(recoverable, a, `tx-token-${i}`);
  check(Boolean(tx), 'current logical transition was not admitted');
  equal(recoverable.connectedTruth, false, 'preparing mixed transition was exposed as coherent connected truth');
  equal(recoverLogicalTransition(recoverable, tx), 'recovered-commit', 'exact interrupted logical transition was not recoverable');
  equal(recoverable.generation, tx.toGeneration, 'recovered transition published wrong successor generation');

  const stale = makeState();
  const old = beginOauth(stale, `tx-old-${i}`, `old-client-${i}`);
  const staleTx = beginLogicalTransition(stale, old, `old-token-${i}`);
  // A newer user intent wins before old recovery resumes.
  stale.transition = null;
  beginOauth(stale, `tx-new-${i}`, `new-client-${i}`);
  equal(recoverLogicalTransition(stale, staleTx), 'not-owner', 'old recovery receipt regained authority after newer transition');
  equal(stale.pending.attemptId, `tx-new-${i}`, 'old recovery disturbed newer pending attempt');
}

// A15/A16/A19/A20 policy-level controls.
for (let i = 0; i < 6; i += 1) {
  const s = makeState();
  const oldGeneration = s.generation;
  // Storage serialization determines physical order only; generation check still rejects stale receipts.
  const a = beginOauth(s, `serialized-${i}`, `client-${i}`);
  const b = beginOauth(s, `serialized-new-${i}`, `client-new-${i}`);
  equal(cleanupPendingIfCurrent(s, a), false, 'serialization was incorrectly treated as stale logical authority');
  equal(s.pending.attemptId, b.attemptId, 'serialized stale callback consumed newer attempt');
  check(s.generation > oldGeneration, 'new user intent did not advance shared generation');

  // Signed-transfer/non-authoritative HTTP evidence carries no OAuth-bound receipt.
  equal(demote401IfCurrent(s, { authId: 'signed-url', generation: s.generation, authorizationBound: false }).outcome, 'stale',
    'signed-transfer response became OAuth demotion authority');
}

check(cases >= 180, `insufficient P1-178 race coverage: ${cases} cases`);

console.log(
  `P1-178 auth-attempt/settings generation refinement model: PASS; cases=${cases}; ` +
  `schema=webclip-yandex-auth-generation/v1; baseline=${BASELINE}; ` +
  'current_shared_generation_missing=true; current_attempt_identity_missing=true; ' +
  'start_cleanup_compare_remove_missing=true; status_cleanup_compare_remove_missing=true; ' +
  'finish_generation_cas_missing=true; delayed_enrichment_fence_missing=true; ' +
  'storage_serialization=preserved; pkce=S256; secrets=session-only; ' +
  'manual_owner=P1-191; invalidation_owner=P1-196; scheduler_owner=P1-177; namespace_owner=P1-179; ' +
  'operation_context_owner=P0-074; p1_165=unresolved; returned_state_authority=false; ' +
  'cross_storage=recoverable-logical-transition-required; runtime_modified=false; new_p_code=false; ' +
  's2_authorized=false; release_authorized=false'
);
