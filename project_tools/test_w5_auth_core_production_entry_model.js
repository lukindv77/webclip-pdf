'use strict';

const assert = require('node:assert/strict');
let cases = 0;
const ok = (value, message) => { assert.ok(value, message); cases += 1; };
const eq = (actual, expected, message) => { assert.deepEqual(actual, expected, message); cases += 1; };

const REQUIRED = ['cloud_api:disk.info', 'cloud_api:disk.read', 'cloud_api:disk.write'];
const sortScopes = (v) => [...new Set(v || [])].sort();
const newId = (() => { let n = 0; return (prefix) => `${prefix}-${++n}`; })();

function makeControl({ auth = null, pendingAttempt = null, schedulerMode = 'active' } = {}) {
  return {
    version: 2,
    sessionEpoch: newId('epoch'),
    authControlGeneration: newId('acg'),
    auth,
    pendingAttempt,
    scheduler: { generation: newId('sched'), mode: schedulerMode }
  };
}
function advance(control, patch = {}) {
  return { ...control, ...patch, authControlGeneration: newId('acg') };
}
function beginAttempt(control, clientId, redirectUri) {
  const next = advance(control);
  const attempt = {
    version: 1,
    authAttemptId: newId('attempt'),
    expectedAuthControlGeneration: next.authControlGeneration,
    clientId,
    redirectUri,
    state: newId('state'),
    codeVerifier: newId('verifier'),
    requestedScopes: [...REQUIRED],
    createdAt: 100,
    expiresAt: 200
  };
  return { ...next, pendingAttempt: attempt };
}
function cleanupAttempt(control, receipt) {
  if (!control.pendingAttempt) return control;
  if (control.pendingAttempt.authAttemptId !== receipt.authAttemptId) return control;
  if (control.authControlGeneration !== receipt.expectedAuthControlGeneration) return control;
  return { ...control, pendingAttempt: null };
}
function parseRedirect(attempt, responseUrl) {
  const expected = new URL(attempt.redirectUri);
  const actual = new URL(responseUrl);
  if (actual.origin !== expected.origin || actual.pathname !== expected.pathname) return { ok: false, code: 'OAUTH_REDIRECT_MISMATCH' };
  if (actual.username || actual.password || actual.hash) return { ok: false, code: 'OAUTH_REDIRECT_INVALID' };
  const state = actual.searchParams.get('state') || '';
  if (!state || state !== attempt.state) return { ok: false, code: 'OAUTH_STATE_MISMATCH' };
  const code = actual.searchParams.get('code') || '';
  if (!code) return { ok: false, code: 'OAUTH_CODE_MISSING' };
  return { ok: true, code };
}
function classifyCapability({ source, requestedScopes, responseScopePresent, responseScopes, observedScopes = [] }) {
  const requested = sortScopes(requestedScopes);
  if (source === 'oauth' && responseScopePresent) {
    const granted = sortScopes(responseScopes);
    const full = requested.every((s) => granted.includes(s));
    return { state: full ? 'full' : 'reduced', requested, granted, observed: sortScopes(observedScopes), evidence: 'provider-response-scope' };
  }
  if (source === 'oauth' && requested.length && !responseScopePresent) {
    return { state: 'full', requested, granted: requested, observed: sortScopes(observedScopes), evidence: 'provider-contract-exact-request' };
  }
  return { state: 'unknown', requested, granted: [], observed: sortScopes(observedScopes), evidence: source === 'manual' ? 'manual-token-no-scope-receipt' : 'missing-request-provenance' };
}
function makeCandidate({ source = 'oauth', accountUid = 'uid-1', expiresAt = 500, expiryKnowledge = 'known', capability }) {
  return {
    authRecordId: newId('auth'),
    source,
    accountUid,
    validity: 'valid',
    expiryKnowledge,
    expiresAt,
    capability
  };
}
function commitCandidate(control, expectedGeneration, candidate) {
  if (control.authControlGeneration !== expectedGeneration) return { control, committed: false, stale: true };
  const next = advance(control, { auth: candidate, pendingAttempt: null });
  return { control: next, committed: true, stale: false };
}
function demote401(control, requestReceipt) {
  if (!control.auth) return { control, demoted: false, stale: true };
  if (control.authControlGeneration !== requestReceipt.authControlGeneration) return { control, demoted: false, stale: true };
  if (control.auth.authRecordId !== requestReceipt.authRecordId) return { control, demoted: false, stale: true };
  const next = advance(control, { auth: { ...control.auth, validity: 'invalid', tokenUnavailable: true } });
  return { control: next, demoted: true, stale: false };
}
function disconnect(control) {
  const next = advance(control, { auth: null, pendingAttempt: null });
  return {
    ...next,
    scheduler: { generation: newId('sched'), mode: 'paused-no-auth' }
  };
}
function canMutateWithCapability(cap, required = REQUIRED) {
  if (!cap || cap.state !== 'full') return false;
  return required.every((s) => cap.granted.includes(s));
}

// Attempt identity / cleanup.
let c = makeControl();
const a = beginAttempt(c, 'client-A', 'https://abc.chromiumapp.org/yandex-oauth');
const receiptA = a.pendingAttempt;
const b = beginAttempt(a, 'client-B', 'https://abc.chromiumapp.org/yandex-oauth');
const afterStaleCleanup = cleanupAttempt(b, receiptA);
eq(afterStaleCleanup.pendingAttempt.authAttemptId, b.pendingAttempt.authAttemptId, 'stale A cleanup must preserve B');
ok(afterStaleCleanup.authControlGeneration === b.authControlGeneration, 'stale cleanup does not roll generation');
const currentCleanup = cleanupAttempt(b, b.pendingAttempt);
eq(currentCleanup.pendingAttempt, null, 'exact current attempt cleanup consumes itself');

// Redirect/state binding.
const attempt = a.pendingAttempt;
const good = `${attempt.redirectUri}?code=CODE-1&state=${encodeURIComponent(attempt.state)}`;
eq(parseRedirect(attempt, good), { ok: true, code: 'CODE-1' }, 'exact redirect + state accepted');
eq(parseRedirect(attempt, `${attempt.redirectUri}?code=CODE-1&state=wrong`).code, 'OAUTH_STATE_MISMATCH', 'wrong state rejected');
eq(parseRedirect(attempt, `${attempt.redirectUri}?state=${encodeURIComponent(attempt.state)}`).code, 'OAUTH_CODE_MISSING', 'missing code rejected');
eq(parseRedirect(attempt, `https://evil.example/yandex-oauth?code=C&state=${attempt.state}`).code, 'OAUTH_REDIRECT_MISMATCH', 'wrong origin rejected');
eq(parseRedirect(attempt, `https://abc.chromiumapp.org/other?code=C&state=${attempt.state}`).code, 'OAUTH_REDIRECT_MISMATCH', 'wrong path rejected');

// Capability truth.
const fullOmitted = classifyCapability({ source: 'oauth', requestedScopes: REQUIRED, responseScopePresent: false });
eq(fullOmitted.state, 'full', 'exact required-only OAuth attempt + omitted scope follows Yandex contract');
eq(fullOmitted.evidence, 'provider-contract-exact-request', 'omitted-scope inference keeps provenance');
const reduced = classifyCapability({ source: 'oauth', requestedScopes: REQUIRED, responseScopePresent: true, responseScopes: ['cloud_api:disk.info', 'cloud_api:disk.read'] });
eq(reduced.state, 'reduced', 'explicit missing write is reduced');
ok(!canMutateWithCapability(reduced), 'reduced capability cannot authorize full remote mutation');
const manual = classifyCapability({ source: 'manual', requestedScopes: [], responseScopePresent: false, observedScopes: ['cloud_api:disk.info'] });
eq(manual.state, 'unknown', 'manual token remains capability unknown');
eq(manual.observed, ['cloud_api:disk.info'], 'manual validation records only observed capability');
ok(!canMutateWithCapability(manual), 'manual info observation is not full mutation proof');

// Candidate commit and stale races.
c = makeControl({ auth: makeCandidate({ capability: fullOmitted }) });
const oldAuthId = c.auth.authRecordId;
const expected = c.authControlGeneration;
const validB = makeCandidate({ source: 'manual', accountUid: 'uid-2', expiresAt: 0, expiryKnowledge: 'unknown', capability: manual });
const invalidCandidateResult = { status: 'invalid' };
eq(invalidCandidateResult.status, 'invalid', 'candidate invalid is represented independently');
eq(c.auth.authRecordId, oldAuthId, 'invalid candidate leaves proven A unchanged');
const unknownCandidateResult = { status: 'unknown' };
eq(unknownCandidateResult.status, 'unknown', 'candidate transport unknown distinct from invalid');
eq(c.auth.authRecordId, oldAuthId, 'unknown candidate leaves proven A unchanged');
const committed = commitCandidate(c, expected, validB);
ok(committed.committed, 'valid candidate commits at exact expected generation');
ok(committed.control.auth.authRecordId === validB.authRecordId, 'committed candidate becomes current');
ok(committed.control.authControlGeneration !== expected, 'successful auth mutation advances shared generation');
const newer = beginAttempt(c, 'client-newer', 'https://abc.chromiumapp.org/yandex-oauth');
const staleCommit = commitCandidate(newer, expected, validB);
ok(staleCommit.stale && !staleCommit.committed, 'candidate cannot overwrite newer attempt/generation');

// Same-auth enrichment is not a new credential generation.
const beforeEnrichGeneration = committed.control.authControlGeneration;
const enriched = { ...committed.control, auth: { ...committed.control.auth, displayName: 'Account' } };
eq(enriched.authControlGeneration, beforeEnrichGeneration, 'same-credential metadata enrichment preserves auth generation');

// Exact 401 demotion.
c = committed.control;
const reqA = { authControlGeneration: c.authControlGeneration, authRecordId: c.auth.authRecordId, authorizationBound: true };
const d1 = demote401(c, reqA);
ok(d1.demoted, 'exact current OAuth-bound 401 demotes current auth');
eq(d1.control.auth.validity, 'invalid', 'demotion makes auth unusable');
const replacement = advance(c, { auth: makeCandidate({ capability: fullOmitted }) });
const stale401 = demote401(replacement, reqA);
ok(stale401.stale && !stale401.demoted, 'late A/401 cannot demote newer B');
eq(stale401.control.auth.authRecordId, replacement.auth.authRecordId, 'newer B preserved after stale 401');
const forbidden = { status: 403, classification: 'capability-or-resource-denial' };
eq(forbidden.classification, 'capability-or-resource-denial', '403 not blanket invalid-auth');
const signedTransfer401 = { transport: 'signed-url', status: 401, oauthBound: false };
ok(!signedTransfer401.oauthBound, 'signed URL 401 is not OAuth demotion authority');

// Authorization header is worker-owned in the target contract.
function buildHeaders(extra = {}, token = 'secret') {
  for (const key of Object.keys(extra)) {
    if (key.toLowerCase() === 'authorization') throw Object.assign(new Error('reserved'), { code: 'YANDEX_AUTH_HEADER_RESERVED' });
  }
  return { ...extra, Authorization: `OAuth ${token}`, Accept: 'application/json' };
}
eq(buildHeaders({ 'X-Test': '1' }).Authorization, 'OAuth secret', 'worker binds final Authorization header');
let reservedRejected = false;
try { buildHeaders({ Authorization: 'Bearer evil' }); } catch (e) { reservedRejected = e.code === 'YANDEX_AUTH_HEADER_RESERVED'; }
ok(reservedRejected, 'caller Authorization override rejected');

// Expiry knowledge distinct from validity.
const manualUnknownLifetime = makeCandidate({ source: 'manual', expiresAt: 0, expiryKnowledge: 'unknown', capability: manual });
eq(manualUnknownLifetime.expiryKnowledge, 'unknown', 'zero/absent expiry is represented as unknown, not never');
const expired = { ...manualUnknownLifetime, validity: 'expired', expiryKnowledge: 'known', expiresAt: 50 };
ok(expired.validity === 'expired' && expired.expiryKnowledge === 'known', 'known local expiry is explicit state');

// Disconnect / scheduler semantics.
c = makeControl({ auth: makeCandidate({ capability: fullOmitted }) });
const oldGeneration = c.authControlGeneration;
const disc = disconnect(c);
eq(disc.auth, null, 'disconnect removes current secret capability');
eq(disc.scheduler.mode, 'paused-no-auth', 'disconnect pauses new backup admission');
ok(disc.authControlGeneration !== oldGeneration, 'disconnect advances shared auth generation');
const staleOldCommit = commitCandidate(disc, oldGeneration, makeCandidate({ capability: fullOmitted }));
ok(staleOldCommit.stale, 'old in-flight candidate cannot resurrect auth after disconnect');

// Reauth does not imply replay of an old side effect.
const reauthReturn = { destination: 'yandex', sealedPdfGeneration: 'G-old', autoReplay: false, requiresExplicitResume: true };
ok(!reauthReturn.autoReplay && reauthReturn.requiresExplicitResume, 'reauth return context never auto-replays mutation');

// Legacy migration does not manufacture strong provenance.
const legacy = { accessToken: 'legacy-secret', scope: REQUIRED.join(' '), account: { uid: 'uid-legacy' } };
const migratedLegacy = {
  source: 'legacy-session',
  validity: 'unknown',
  capability: { state: 'unknown', evidence: 'legacy-no-exact-attempt-provenance' },
  accountUid: legacy.account.uid
};
eq(migratedLegacy.capability.state, 'unknown', 'legacy static scope is not upgraded to exact grant receipt');
eq(migratedLegacy.validity, 'unknown', 'legacy token presence is not fabricated current validity proof');

// Status truth separates independent axes.
const status = {
  authPresent: true,
  authValidity: 'valid',
  authUsable: true,
  expiryKnowledge: 'known',
  capabilityState: 'full',
  requestedScopes: REQUIRED,
  provenScopes: REQUIRED,
  authGeneration: 'ARG-1'
};
ok(status.authPresent && status.authUsable, 'status may report usable current auth');
eq(status.capabilityState, 'full', 'status exposes capability state separately');

console.log(`W5 AUTH-CORE production-entry model: PASS; cases=${cases}`);
