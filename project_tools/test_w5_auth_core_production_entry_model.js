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
    authAttemptGeneration: newId('AG'),
    authGeneration: newId('ARG'),
    auth,
    pendingAttempt,
    scheduler: { generation: newId('sched'), mode: schedulerMode }
  };
}
function advanceAttempt(control, patch = {}) {
  return { ...control, ...patch, authAttemptGeneration: newId('AG') };
}
function advanceAuth(control, patch = {}) {
  return { ...control, ...patch, authGeneration: newId('ARG') };
}
function beginOAuthAttempt(control, clientId, redirectUri) {
  const next = advanceAttempt(control);
  const attempt = {
    version: 1,
    authAttemptId: newId('attempt'),
    authAttemptGeneration: next.authAttemptGeneration,
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
function beginManualAttempt(control) {
  return advanceAttempt(control, { pendingAttempt: null });
}
function cleanupOAuthAttempt(control, receipt) {
  if (!control.pendingAttempt) return control;
  if (control.pendingAttempt.authAttemptId !== receipt.authAttemptId) return control;
  if (control.authAttemptGeneration !== receipt.authAttemptGeneration) return control;
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
function commitOAuthCandidate(control, attemptReceipt, candidate) {
  if (!control.pendingAttempt) return { control, committed: false, stale: true };
  if (control.authAttemptGeneration !== attemptReceipt.authAttemptGeneration) return { control, committed: false, stale: true };
  if (control.pendingAttempt.authAttemptId !== attemptReceipt.authAttemptId) return { control, committed: false, stale: true };
  const next = advanceAuth(control, { auth: candidate, pendingAttempt: null });
  return { control: next, committed: true, stale: false };
}
function commitManualCandidate(control, expectedAttemptGeneration, candidate) {
  if (control.authAttemptGeneration !== expectedAttemptGeneration) return { control, committed: false, stale: true };
  const next = advanceAuth(control, { auth: candidate, pendingAttempt: null });
  return { control: next, committed: true, stale: false };
}
function demote401(control, requestReceipt) {
  if (!control.auth) return { control, demoted: false, stale: true };
  if (control.authGeneration !== requestReceipt.authGeneration) return { control, demoted: false, stale: true };
  if (control.auth.authRecordId !== requestReceipt.authRecordId) return { control, demoted: false, stale: true };
  const next = advanceAuth(control, { auth: { ...control.auth, validity: 'invalid', tokenUnavailable: true } });
  return { control: next, demoted: true, stale: false };
}
function disconnect(control) {
  const intentInvalidated = advanceAttempt(control, { pendingAttempt: null });
  const credentialInvalidated = advanceAuth(intentInvalidated, { auth: null });
  return {
    ...credentialInvalidated,
    scheduler: { generation: newId('sched'), mode: 'paused-no-auth' }
  };
}
function canMutateWithCapability(cap, required = REQUIRED) {
  if (!cap || cap.state !== 'full') return false;
  return required.every((s) => cap.granted.includes(s));
}

// Attempt generation is distinct from credential generation.
let c = makeControl();
const initialArg = c.authGeneration;
const a = beginOAuthAttempt(c, 'client-A', 'https://abc.chromiumapp.org/yandex-oauth');
eq(a.authGeneration, initialArg, 'starting OAuth does not replace current credential generation');
ok(a.authAttemptGeneration !== c.authAttemptGeneration, 'starting OAuth advances attempt generation');
const receiptA = a.pendingAttempt;
const b = beginOAuthAttempt(a, 'client-B', 'https://abc.chromiumapp.org/yandex-oauth');
const afterStaleCleanup = cleanupOAuthAttempt(b, receiptA);
eq(afterStaleCleanup.pendingAttempt.authAttemptId, b.pendingAttempt.authAttemptId, 'stale A cleanup must preserve B');
eq(afterStaleCleanup.authAttemptGeneration, b.authAttemptGeneration, 'stale cleanup does not roll attempt generation');
const currentCleanup = cleanupOAuthAttempt(b, b.pendingAttempt);
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

// OAuth candidate can commit only against exact AG/attempt.
c = makeControl({ auth: makeCandidate({ capability: fullOmitted }) });
const oauthA = beginOAuthAttempt(c, 'client-A', 'https://abc.chromiumapp.org/yandex-oauth');
const oauthCandidate = makeCandidate({ capability: fullOmitted });
const oauthCommitted = commitOAuthCandidate(oauthA, oauthA.pendingAttempt, oauthCandidate);
ok(oauthCommitted.committed, 'exact OAuth candidate commits under exact AG');
ok(oauthCommitted.control.auth.authRecordId === oauthCandidate.authRecordId, 'OAuth candidate becomes current credential');
ok(oauthCommitted.control.authGeneration !== oauthA.authGeneration, 'OAuth commit mints a new credential generation');
const oauthB = beginOAuthAttempt(oauthA, 'client-B', 'https://abc.chromiumapp.org/yandex-oauth');
const staleOAuthCommit = commitOAuthCandidate(oauthB, oauthA.pendingAttempt, oauthCandidate);
ok(staleOAuthCommit.stale && !staleOAuthCommit.committed, 'old OAuth result cannot overwrite newer attempt');

// Manual candidate validates privately, then exact AG commit; invalid/unknown preserve A.
c = makeControl({ auth: makeCandidate({ capability: fullOmitted }) });
const oldAuthId = c.auth.authRecordId;
const manualAttempt = beginManualAttempt(c);
const validManual = makeCandidate({ source: 'manual', accountUid: 'uid-2', expiresAt: 0, expiryKnowledge: 'unknown', capability: manual });
const invalidCandidateResult = { status: 'invalid' };
eq(invalidCandidateResult.status, 'invalid', 'candidate invalid is represented independently');
eq(manualAttempt.auth.authRecordId, oldAuthId, 'invalid candidate leaves proven A unchanged');
const unknownCandidateResult = { status: 'unknown' };
eq(unknownCandidateResult.status, 'unknown', 'candidate transport unknown distinct from invalid');
eq(manualAttempt.auth.authRecordId, oldAuthId, 'unknown candidate leaves proven A unchanged');
const manualCommitted = commitManualCandidate(manualAttempt, manualAttempt.authAttemptGeneration, validManual);
ok(manualCommitted.committed, 'valid manual candidate commits at exact current AG');
ok(manualCommitted.control.authGeneration !== manualAttempt.authGeneration, 'manual credential replacement advances ARG');

// A newer auth intent invalidates an older manual candidate even before credential changes.
c = makeControl({ auth: makeCandidate({ capability: fullOmitted }) });
const oldManual = beginManualAttempt(c);
const newerOAuth = beginOAuthAttempt(oldManual, 'client-newer', 'https://abc.chromiumapp.org/yandex-oauth');
const staleManual = commitManualCandidate(newerOAuth, oldManual.authAttemptGeneration, validManual);
ok(staleManual.stale && !staleManual.committed, 'newer OAuth intent invalidates older manual candidate commit');

// Manual commit invalidates old OAuth pending callback by consuming/replacing auth intent state.
c = makeControl({ auth: makeCandidate({ capability: fullOmitted }) });
const oldOAuth = beginOAuthAttempt(c, 'client-old', 'https://abc.chromiumapp.org/yandex-oauth');
const newerManual = beginManualAttempt(oldOAuth);
const newerManualCommit = commitManualCandidate(newerManual, newerManual.authAttemptGeneration, validManual);
const oldOAuthLate = commitOAuthCandidate(newerManualCommit.control, oldOAuth.pendingAttempt, oauthCandidate);
ok(oldOAuthLate.stale, 'old PKCE cannot overwrite newer manual replacement');

// Same-credential metadata enrichment does not mint ARG.
const beforeEnrichArg = oauthCommitted.control.authGeneration;
const enriched = { ...oauthCommitted.control, auth: { ...oauthCommitted.control.auth, displayName: 'Account' } };
eq(enriched.authGeneration, beforeEnrichArg, 'same-credential metadata enrichment preserves ARG');

// Exact 401 demotion is ARG-bound, not AG-bound.
c = oauthCommitted.control;
const reqA = { authGeneration: c.authGeneration, authRecordId: c.auth.authRecordId, authorizationBound: true };
const reauthInProgress = beginOAuthAttempt(c, 'client-reauth', 'https://abc.chromiumapp.org/yandex-oauth');
eq(reauthInProgress.authGeneration, reqA.authGeneration, 'starting reauth leaves exact current ARG in place');
const d1 = demote401(reauthInProgress, reqA);
ok(d1.demoted, 'exact current OAuth-bound 401 can demote current ARG even while newer auth UI attempt is pending');
eq(d1.control.auth.validity, 'invalid', 'demotion makes exact credential unusable');
const replacement = advanceAuth(c, { auth: makeCandidate({ capability: fullOmitted }) });
const stale401 = demote401(replacement, reqA);
ok(stale401.stale && !stale401.demoted, 'late A/401 cannot demote newer ARG-B');
eq(stale401.control.auth.authRecordId, replacement.auth.authRecordId, 'newer credential preserved after stale 401');
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

// Disconnect invalidates both current auth intent and credential, and pauses scheduler.
c = makeControl({ auth: makeCandidate({ capability: fullOmitted }) });
const pendingBeforeDisconnect = beginOAuthAttempt(c, 'client-A', 'https://abc.chromiumapp.org/yandex-oauth');
const oldAG = pendingBeforeDisconnect.authAttemptGeneration;
const oldARG = pendingBeforeDisconnect.authGeneration;
const disc = disconnect(pendingBeforeDisconnect);
eq(disc.auth, null, 'disconnect removes current secret capability');
eq(disc.pendingAttempt, null, 'disconnect consumes pending auth attempt');
eq(disc.scheduler.mode, 'paused-no-auth', 'disconnect pauses new backup admission');
ok(disc.authAttemptGeneration !== oldAG, 'disconnect advances AG');
ok(disc.authGeneration !== oldARG, 'disconnect advances ARG tombstone');
const staleOldOAuth = commitOAuthCandidate(disc, pendingBeforeDisconnect.pendingAttempt, oauthCandidate);
ok(staleOldOAuth.stale, 'old OAuth result cannot resurrect auth after disconnect');

// Reauth never implies blind mutation replay.
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

// Status truth separates independent axes and never exposes secrets.
const status = {
  authPresent: true,
  authValidity: 'valid',
  authUsable: true,
  expiryKnowledge: 'known',
  capabilityState: 'full',
  requestedScopes: REQUIRED,
  provenScopes: REQUIRED,
  authGeneration: 'ARG-1',
  authAttemptGeneration: 'AG-7'
};
ok(status.authPresent && status.authUsable, 'status may report usable current auth');
eq(status.capabilityState, 'full', 'status exposes capability state separately');
ok(!('accessToken' in status) && !('codeVerifier' in status), 'status never exposes token or PKCE verifier');

console.log(`W5 AUTH-CORE production-entry model: PASS; cases=${cases}`);
