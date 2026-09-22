'use strict';

// Research-only deterministic model for the current fixed-redirect Yandex auth flow.
// It does not modify production auth, manifest, release readiness, workflows or S2.

const assert = require('assert');
const fs = require('fs');
const { execFileSync, spawnSync } = require('child_process');

let cases = 0;
function check(v, m) { cases += 1; assert.ok(v, m); }
function eq(a, b, m) { cases += 1; assert.strictEqual(a, b, m); }
function deepEq(a, b, m) { cases += 1; assert.deepStrictEqual(a, b, m); }
function throwsCode(fn, code, m) {
  cases += 1;
  assert.throws(fn, (e) => e && e.code === code, m || `expected ${code}`);
}
function fail(code, detail) { const e = new Error(detail || code); e.code = code; throw e; }
function read(path) { return fs.readFileSync(path, 'utf8'); }
function git(...args) { return execFileSync('git', args, { encoding: 'utf8' }).trim(); }
function isAncestor(a, b = 'HEAD') { return spawnSync('git', ['merge-base', '--is-ancestor', a, b]).status === 0; }

const BASELINE = '1529b174a99e7029db23c3e39b0548fc299b9ff5';
const REDIRECT = 'https://oauth.yandex.ru/verification_code';
const REQUIRED_SCOPES = Object.freeze(['cloud_api:disk.app_folder', 'cloud_api:disk.info']);
const HEX40 = /^[0-9a-f]{40}$/;

function state(currentAuth = null) {
  const generation = currentAuth ? currentAuth.authGeneration : 0;
  return { generation, pending: null, currentAuth: currentAuth ? structuredClone(currentAuth) : null };
}
function auth(id, generation, source = 'oauth') {
  return {
    authRecordId: id,
    authGeneration: generation,
    source,
    accountUid: `uid-${id}`,
    capability: 'full',
    expiry: source === 'oauth' ? 'known-expires-at' : 'unknown',
  };
}
function nextGeneration(s) { s.generation += 1; return s.generation; }
function startOAuth(s, attemptId, now = 1000, ttl = 600000) {
  const generation = nextGeneration(s);
  s.pending = {
    authAttemptId: attemptId,
    authGeneration: generation,
    clientId: 'client',
    codeVerifier: `verifier-${attemptId}`,
    oauthState: `state-${attemptId}`,
    requestedScopes: [...REQUIRED_SCOPES],
    createdAt: now,
    expiresAt: now + ttl,
    transport: 'yandex-verification-code-pkce-v1',
  };
  return { authAttemptId: attemptId, authGeneration: generation };
}
function captureFinish(s, attemptId, now = 1001) {
  if (!attemptId) fail('AUTH_ATTEMPT_ID_REQUIRED');
  const p = s.pending;
  if (!p || p.authAttemptId !== attemptId) fail('AUTH_ATTEMPT_NOT_CURRENT');
  if (p.authGeneration !== s.generation) fail('AUTH_ATTEMPT_STALE');
  if (now >= p.expiresAt) fail('AUTH_ATTEMPT_EXPIRED');
  return structuredClone(p);
}
function settleFinish(s, captured, recordId) {
  if (!captured || !s.pending) return false;
  if (captured.authGeneration !== s.generation) return false;
  if (s.pending.authAttemptId !== captured.authAttemptId) return false;
  if (s.pending.authGeneration !== captured.authGeneration) return false;
  s.currentAuth = auth(recordId, captured.authGeneration, 'oauth');
  if (s.pending && s.pending.authAttemptId === captured.authAttemptId && s.pending.authGeneration === captured.authGeneration) s.pending = null;
  return true;
}
function compareRemovePending(s, attemptId, generation) {
  if (!s.pending) return false;
  if (s.pending.authAttemptId !== attemptId || s.pending.authGeneration !== generation) return false;
  s.pending = null;
  return true;
}
function beginManual(s, candidateId) {
  const generation = nextGeneration(s);
  s.pending = null;
  return { candidateId, authGeneration: generation };
}
function settleManual(s, captured, outcome) {
  if (captured.authGeneration !== s.generation) return false;
  if (outcome === 'success') {
    s.currentAuth = auth(captured.candidateId, captured.authGeneration, 'manual');
    return true;
  }
  if (outcome === 'invalid' || outcome === 'unknown') return false;
  fail('MANUAL_OUTCOME_INVALID');
}
function disconnect(s) {
  nextGeneration(s);
  s.pending = null;
  s.currentAuth = null;
}
function demoteFromResponse(s, observed, status, endpointClass) {
  if (status !== 401) return false;
  if (endpointClass !== 'oauth-credential-validity') return false;
  if (!s.currentAuth) return false;
  if (s.currentAuth.authRecordId !== observed.authRecordId || s.currentAuth.authGeneration !== observed.authGeneration) return false;
  if (s.generation !== observed.authGeneration) return false;
  nextGeneration(s);
  s.pending = null;
  s.currentAuth = null;
  return true;
}
function normalizeHeaderName(name) { return String(name).trim().toLowerCase(); }
function buildHeaders(callerHeaders, token) {
  const out = {};
  for (const [k, v] of Object.entries(callerHeaders || {})) {
    if (normalizeHeaderName(k) === 'authorization') fail('RESERVED_AUTHORIZATION_HEADER');
    out[k] = v;
  }
  out.Accept = out.Accept || 'application/json';
  out.Authorization = `OAuth ${token}`;
  return out;
}
function capabilityTruth({ source, requestedScopes = REQUIRED_SCOPES, grantedScopes, providerOmittedScope = false }) {
  const requested = new Set(requestedScopes);
  if (source === 'manual' && !grantedScopes) return { state: 'unknown', basis: 'manual-no-grant-evidence' };
  if (Array.isArray(grantedScopes)) {
    const granted = new Set(grantedScopes);
    const full = [...requested].every((x) => granted.has(x));
    return full ? { state: 'full', basis: 'explicit-granted-set' } : { state: 'reduced', basis: 'explicit-subset' };
  }
  if (source === 'oauth' && providerOmittedScope) return { state: 'full', basis: 'provider-contract-omitted-not-reduced' };
  return { state: 'unknown', basis: 'insufficient-evidence' };
}
function expiryTruth(expiresInSeconds, now = 1000) {
  if (Number.isFinite(expiresInSeconds) && expiresInSeconds > 0) return { state: 'known-expires-at', expiresAt: now + expiresInSeconds * 1000 };
  return { state: 'unknown' };
}
function accountTruth(probe) {
  if (probe && probe.ok && probe.uid) return { state: 'proven', accountUid: probe.uid };
  return { state: 'unknown' };
}
function mayStartAccountBoundOperation(account) { return Boolean(account && account.state === 'proven' && account.accountUid); }
function statusDto(s) {
  const a = s.currentAuth;
  return {
    connected: Boolean(a),
    authRecordId: a ? a.authRecordId : null,
    authGeneration: a ? a.authGeneration : s.generation,
    capability: a ? a.capability : 'unknown',
    accountUid: a ? a.accountUid : null,
  };
}

(function main() {
  const head = git('rev-parse', 'HEAD');
  check(HEX40.test(head), 'exact checkout SHA');
  check(isAncestor(BASELINE), 'research checkout descends from exact canonical baseline');

  const requirements = read('project_docs/USER_REQUIREMENTS.md');
  const decisions = read('project_docs/DECISIONS_AND_RATIONALE.md');
  const registry = read('project_docs/RESEARCH_REGISTRY.md');
  const worker = read('service-worker.js');
  const options = read('options.js');
  const manifest = JSON.parse(read('manifest.json'));
  const evidence = read('project_docs/RESEARCH_W5_FIXED_REDIRECT_AUTH_CORE_REFINEMENT_2026-09-10_EVIDENCE.md');
  const dag = read('project_docs/RESEARCH_P1_231_CONSOLIDATED_IMPLEMENTATION_DAG_2026-09-10_EVIDENCE.md');

  // Current canonical product/source facts.
  check(requirements.includes('Authorization Code + PKCE'), 'canonical requirements keep Authorization Code + PKCE');
  check(requirements.includes(REDIRECT), 'canonical requirements keep exact fixed redirect');
  check(decisions.includes('Client Secret не встраивается'), 'canonical rationale rejects embedded client secret');
  check(worker.includes(`const YANDEX_FIXED_REDIRECT_URI = '${REDIRECT}';`), 'worker uses exact fixed redirect');
  check(worker.includes("code_challenge_method', 'S256'"), 'worker requests PKCE S256');
  check(worker.includes("case 'WEBCLIP_YANDEX_START_AUTH':"), 'worker exposes start-auth boundary');
  check(worker.includes("case 'WEBCLIP_YANDEX_FINISH_AUTH':"), 'worker exposes finish-auth boundary');
  check(options.includes('WEBCLIP_YANDEX_START_AUTH'), 'Options starts fixed-redirect flow');
  check(options.includes('WEBCLIP_YANDEX_FINISH_AUTH'), 'Options finishes by user-supplied code');
  check(!worker.includes('chrome.identity.launchWebAuthFlow'), 'current worker does not use Chrome Identity callback transport');
  check(!worker.includes('chrome.identity.getRedirectURL'), 'current worker does not derive chromiumapp redirect');
  check(!manifest.permissions.includes('identity'), 'current manifest has no identity permission');

  // Current source now implements the P1-178 attempt/generation subset while
  // adjacent P1-191/P1-195/P1-196 gaps remain independently owned.
  check(worker.includes('yandexOAuthPending'), 'current worker retains one pending OAuth authority slot');
  check(worker.includes('authAttemptId'), 'current production worker carries explicit authAttemptId');
  check(options.includes('authAttemptId: activeYandexAuthAttemptId'), 'current Options finish carries exact page attempt identity');
  check(worker.includes('authGeneration'), 'current production worker carries shared auth generation');
  check(worker.includes('commitYandexOAuthAttemptControl(captured, yandexAuth)'), 'current OAuth finish uses post-network generation CAS');
  check(worker.includes("advanceYandexAuthControlGeneration('Поколение manual-token intent Яндекс Диска')"), 'manual intent fences older OAuth attempt');
  check(worker.includes('await disconnectYandexAuthControl()'), 'disconnect is a shared-generation barrier');
  const manualFunction = worker.slice(
    worker.indexOf('async function setManualYandexToken(token)'),
    worker.indexOf('async function getValidYandexAccessToken')
  );
  const manualValidate = manualFunction.indexOf('validateManualYandexTokenCandidate(token)');
  const manualCommit = manualFunction.indexOf('commitManualYandexAuthIfGeneration(authGeneration, yandexAuth)');
  check(manualValidate >= 0 && manualCommit > manualValidate, 'current manual candidate validates privately before generation-CAS commit');
  check(!manualFunction.includes('writeYandexAuth(yandexAuth)'), 'manual candidate is not globally published before validation');
  check(!manualFunction.includes('compareClearYandexAuthRecord'), 'invalid/unknown manual candidate cannot clear proven current auth');
  const authHeader = worker.indexOf("'Authorization': `OAuth ${token}`");
  check(authHeader >= 0, 'current worker emits OAuth Authorization');
  check(worker.includes('sanitizeYandexApiCallerHeaders(options.headers || {})'), 'current worker rejects caller Authorization override');
  check(!worker.includes('...(options.headers || {})'), 'raw caller header spread no longer follows worker Authorization');
  check(registry.includes('| P1-178 | ACTIVE |'), 'P1-178 remains existing owner');
  check(!registry.includes('| P1-191 | ACTIVE |'), 'P1-191 leaves ACTIVE after validate-before-commit implementation');
  check(registry.includes('| P1-195 | ACTIVE |'), 'P1-195 remains existing owner');
  check(registry.includes('| P1-196 | ACTIVE |'), 'P1-196 remains existing owner');
  check(registry.includes('| P0-074 | ACTIVE |'), 'P0-074 immutable operation context remains existing owner');
  check(dag.includes('EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION'), 'S2 remains explicitly fenced');

  // W01/W10: exact attempt identity and compare-remove.
  {
    const s = state();
    const A = startOAuth(s, 'A');
    const B = startOAuth(s, 'B');
    eq(A.authGeneration + 1, B.authGeneration, 'new OAuth intent advances one shared generation');
    eq(s.pending.authAttemptId, 'B', 'newer pending attempt owns slot');
    eq(compareRemovePending(s, 'A', A.authGeneration), false, 'stale A cleanup cannot remove B');
    eq(s.pending.authAttemptId, 'B', 'B remains after stale cleanup');
    eq(compareRemovePending(s, 'B', B.authGeneration), true, 'exact B cleanup succeeds');
    eq(s.pending, null, 'exact B cleanup removes B');
  }

  // W02: stale network settlement after a newer OAuth start cannot commit.
  {
    const s = state(auth('OLD', 1));
    startOAuth(s, 'A');
    const capA = captureFinish(s, 'A');
    startOAuth(s, 'B');
    eq(settleFinish(s, capA, 'AUTH-A'), false, 'A cannot commit after B starts');
    eq(s.pending.authAttemptId, 'B', 'A stale settlement does not clear B');
    eq(s.currentAuth.authRecordId, 'OLD', 'candidate start does not erase last proven auth');
  }

  // W03/W07: manual success invalidates old OAuth settlement and becomes exact current authority.
  {
    const s = state(auth('OLD', 1));
    startOAuth(s, 'A');
    const capA = captureFinish(s, 'A');
    const m = beginManual(s, 'MANUAL-B');
    eq(settleManual(s, m, 'success'), true, 'current manual B commits');
    eq(s.currentAuth.authRecordId, 'MANUAL-B');
    eq(s.pending, null, 'manual intent invalidates older pending OAuth attempt');
    eq(settleFinish(s, capA, 'AUTH-A'), false, 'old OAuth A cannot overwrite manual B');
    eq(s.currentAuth.authRecordId, 'MANUAL-B', 'manual B remains current');
  }

  // W04/W26: disconnect advances same generation and stale exchange cannot resurrect auth.
  {
    const s = state(auth('OLD', 1));
    startOAuth(s, 'A');
    const capA = captureFinish(s, 'A');
    const before = s.generation;
    disconnect(s);
    eq(s.generation, before + 1, 'disconnect advances shared generation');
    eq(s.currentAuth, null, 'disconnect clears current auth for new operations');
    eq(s.pending, null, 'disconnect clears pending attempt');
    eq(settleFinish(s, capA, 'AUTH-A'), false, 'stale OAuth completion cannot resurrect after disconnect');
    eq(s.currentAuth, null, 'disconnected state remains authoritative');
  }

  // W05/W06: invalid or evidence-unknown manual replacement preserves last proven auth.
  for (const outcome of ['invalid', 'unknown']) {
    const s = state(auth('PROVEN-A', 5));
    const m = beginManual(s, `B-${outcome}`);
    eq(settleManual(s, m, outcome), false, `${outcome} manual candidate does not commit`);
    eq(s.currentAuth.authRecordId, 'PROVEN-A', `${outcome} manual candidate preserves proven A`);
  }

  // W08/W09/W11: finish must own exact nonexpired attempt.
  {
    const s = state();
    startOAuth(s, 'A', 1000, 100);
    throwsCode(() => captureFinish(s, null, 1001), 'AUTH_ATTEMPT_ID_REQUIRED');
    throwsCode(() => captureFinish(s, 'lost-page-attempt', 1001), 'AUTH_ATTEMPT_NOT_CURRENT');
    throwsCode(() => captureFinish(s, 'A', 1100), 'AUTH_ATTEMPT_EXPIRED');
  }

  // Current exact finish commits and compare-removes only itself.
  {
    const s = state();
    const started = startOAuth(s, 'A');
    const cap = captureFinish(s, 'A');
    eq(cap.authGeneration, started.authGeneration);
    eq(cap.transport, 'yandex-verification-code-pkce-v1');
    eq(settleFinish(s, cap, 'AUTH-A'), true);
    eq(s.currentAuth.authRecordId, 'AUTH-A');
    eq(s.currentAuth.authGeneration, started.authGeneration);
    eq(s.pending, null);
  }

  // W12-W16: capability truth.
  deepEq(capabilityTruth({ source: 'oauth', grantedScopes: [...REQUIRED_SCOPES] }), { state: 'full', basis: 'explicit-granted-set' });
  deepEq(capabilityTruth({ source: 'oauth', grantedScopes: [REQUIRED_SCOPES[0]] }), { state: 'reduced', basis: 'explicit-subset' });
  deepEq(capabilityTruth({ source: 'oauth', providerOmittedScope: true }), { state: 'full', basis: 'provider-contract-omitted-not-reduced' });
  deepEq(capabilityTruth({ source: 'manual' }), { state: 'unknown', basis: 'manual-no-grant-evidence' });
  eq(capabilityTruth({ source: 'manual' }).state, 'unknown', 'read success alone cannot upgrade unproven manual grants');

  // W17/W18: expiry truth.
  deepEq(expiryTruth(3600, 1000), { state: 'known-expires-at', expiresAt: 3601000 });
  deepEq(expiryTruth(null, 1000), { state: 'unknown' });
  deepEq(expiryTruth(0, 1000), { state: 'unknown' });

  // W19-W22: exact-generation and endpoint-class-scoped 401 demotion.
  {
    const s = state(auth('A', 7));
    const obsA = { authRecordId: 'A', authGeneration: 7 };
    const m = beginManual(s, 'B');
    settleManual(s, m, 'success');
    eq(demoteFromResponse(s, obsA, 401, 'oauth-credential-validity'), false, 'late 401 for A cannot clear newer B');
    eq(s.currentAuth.authRecordId, 'B');
    const obsB = { authRecordId: 'B', authGeneration: s.currentAuth.authGeneration };
    eq(demoteFromResponse(s, obsB, 403, 'oauth-credential-validity'), false, '403 is not blanket invalid-token authority');
    eq(s.currentAuth.authRecordId, 'B');
    eq(demoteFromResponse(s, obsB, 401, 'signed-public-url'), false, 'signed/public URL 401 does not demote OAuth credential');
    eq(s.currentAuth.authRecordId, 'B');
    const before = s.generation;
    eq(demoteFromResponse(s, obsB, 401, 'oauth-credential-validity'), true, 'exact-current OAuth credential 401 may demote');
    eq(s.generation, before + 1, 'exact demotion advances shared generation');
    eq(s.currentAuth, null);
  }

  // W23-W25: Authorization is worker-owned and injected last.
  throwsCode(() => buildHeaders({ Authorization: 'Bearer attacker' }, 'secret'), 'RESERVED_AUTHORIZATION_HEADER');
  throwsCode(() => buildHeaders({ authorization: 'Bearer attacker' }, 'secret'), 'RESERVED_AUTHORIZATION_HEADER');
  throwsCode(() => buildHeaders({ ' AuThOrIzAtIoN ': 'Bearer attacker' }, 'secret'), 'RESERVED_AUTHORIZATION_HEADER');
  {
    const h = buildHeaders({ 'Content-Type': 'application/json' }, 'secret');
    eq(h.Authorization, 'OAuth secret');
    eq(h['Content-Type'], 'application/json');
    eq(h.Accept, 'application/json');
  }

  // W27/W28/W32: one generation space and semantic CAS after network, not mere storage serialization.
  {
    const s = state(auth('A', 2));
    const oauth = startOAuth(s, 'O');
    const cap = captureFinish(s, 'O');
    const manual = beginManual(s, 'M');
    eq(manual.authGeneration, oauth.authGeneration + 1, 'manual and OAuth share generation sequence');
    eq(settleFinish(s, cap, 'O-AUTH'), false, 'post-network currentness check rejects stale captured OAuth');
    eq(settleManual(s, manual, 'success'), true);
    eq(s.currentAuth.authGeneration, manual.authGeneration);
  }

  // W29: status projection excludes secrets.
  {
    const s = state(auth('A', 3));
    s.currentAuth.accessToken = 'SECRET';
    s.currentAuth.refreshToken = 'REFRESH';
    s.currentAuth.codeVerifier = 'VERIFIER';
    const dto = statusDto(s);
    check(!Object.hasOwn(dto, 'accessToken'));
    check(!Object.hasOwn(dto, 'refreshToken'));
    check(!Object.hasOwn(dto, 'codeVerifier'));
    eq(dto.authRecordId, 'A');
    eq(dto.authGeneration, 3);
  }

  // W30/W31: account truth is independent and fail-closed for account-bound operations.
  deepEq(accountTruth({ ok: false }), { state: 'unknown' });
  deepEq(accountTruth(null), { state: 'unknown' });
  deepEq(accountTruth({ ok: true, uid: 'u1' }), { state: 'proven', accountUid: 'u1' });
  eq(mayStartAccountBoundOperation(accountTruth({ ok: false })), false);
  eq(mayStartAccountBoundOperation(accountTruth({ ok: true, uid: 'u1' })), true);

  // W33-W36: fixed transport and release boundaries remain explicit.
  check(evidence.includes('returned state in current pasted-code UX = NOT OBSERVED AUTHORITY'), 'evidence does not invent returned-state authority');
  check(evidence.includes('shared authorization generation         = REQUIRED'), 'evidence requires one shared generation');
  check(evidence.includes('manual validate-before-commit           = REQUIRED'), 'evidence requires private manual validation');
  check(evidence.includes('caller Authorization override           = FORBIDDEN'), 'evidence reserves Authorization header');
  check(evidence.includes('capability truth                         = full | reduced | unknown'), 'evidence defines tri-state capability');
  check(evidence.includes(`current auth transport                  = fixed Yandex verification-code redirect + PKCE S256`), 'evidence preserves current transport');
  check(evidence.includes('S2                                      = NOT AUTHORIZED'), 'evidence preserves S2 boundary');
  check(evidence.includes('release readiness                       = UNCHANGED / NOT READY'), 'evidence preserves release readiness boundary');
  eq(REDIRECT, 'https://oauth.yandex.ru/verification_code');
  eq(manifest.version, '0.9.8', 'research tranche does not mutate manifest version');

  console.log(
    `W5 fixed-redirect auth-core refinement model: PASS; cases=${cases}; ` +
    `redirect=fixed-verification-code; pkce=S256; returned_state_authority=false; ` +
    `shared_generation=true; manual_preserves_proven_auth=true; capability=tri-state; ` +
    `authorization_header=worker-owned; s2_authorized=false; head=${head}`
  );
})();
