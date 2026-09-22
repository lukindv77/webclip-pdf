'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const EVIDENCE = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_P1_191_MANUAL_TOKEN_REPLACEMENT_REFINEMENT_2026-09-11_EVIDENCE.md'), 'utf8');
const SOURCE = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const REGISTRY = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_REGISTRY.md'), 'utf8');
const P178 = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_P1_178_AUTH_ATTEMPT_SETTINGS_GENERATION_REFINEMENT_2026-09-10_EVIDENCE.md'), 'utf8');
const P195 = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_P1_195_CAPABILITY_TRUTH_REFINEMENT_2026-09-11_EVIDENCE.md'), 'utf8');
const P196 = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_P1_196_AUTH_VALIDITY_GENERATION_REFINEMENT_2026-09-10_EVIDENCE.md'), 'utf8');
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
function sliceBetween(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert.ok(start >= 0, `cannot find start ${JSON.stringify(startNeedle)}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert.ok(end > start, `cannot find end ${JSON.stringify(endNeedle)}`);
  return text.slice(start, end);
}

const MANUAL = sliceBetween(SOURCE, 'async function setManualYandexToken(token)', 'async function getValidYandexAccessToken()');
const PKCE_FINISH = sliceBetween(SOURCE, 'async function finishYandexOAuth(authAttemptId, code)', 'async function exchangeAuthorizationCode');

function makeState(auth = null, generation = 1, disconnected = false) {
  return { auth, generation, disconnected };
}

function currentShapedManualReplace(state, candidate, validationResult) {
  state.auth = candidate;
  if (validationResult !== 'valid') {
    state.auth = null;
    return { outcome: validationResult, committed: false };
  }
  state.auth = { ...candidate, account: 'candidate-account' };
  return { outcome: 'committed', committed: true };
}

function validateCandidate(candidate, outcome, accountUid = 'uid-b') {
  if (outcome === 'valid') {
    return {
      outcome: 'valid',
      candidateRecordId: candidate.recordId,
      accountUid,
      observedCapabilities: ['disk-info-read-success']
    };
  }
  return {
    outcome,
    candidateRecordId: candidate.recordId,
    accountUid: '',
    observedCapabilities: []
  };
}

function targetManualReplace(state, candidate, validation, expectedGeneration) {
  if (validation.outcome !== 'valid') {
    return { outcome: validation.outcome, committed: false, generation: state.generation };
  }
  if (state.generation !== expectedGeneration) {
    return { outcome: 'stale-generation', committed: false, generation: state.generation };
  }
  const nextGeneration = state.generation + 1;
  state.auth = {
    recordId: candidate.recordId,
    source: 'manual',
    accountUid: validation.accountUid,
    capabilityState: 'unknown',
    capabilityEvidence: 'manual-token-no-scope-receipt',
    observedCapabilities: [...validation.observedCapabilities]
  };
  state.generation = nextGeneration;
  state.disconnected = false;
  return { outcome: 'committed', committed: true, generation: nextGeneration };
}

function targetPkceCommit(state, candidate, expectedGeneration) {
  if (state.generation !== expectedGeneration) {
    return { outcome: 'stale-generation', committed: false };
  }
  state.auth = candidate;
  state.generation += 1;
  state.disconnected = false;
  return { outcome: 'committed', committed: true };
}

function disconnect(state) {
  state.generation += 1;
  state.auth = null;
  state.disconnected = true;
  return state.generation;
}

function enrichCandidateIfCurrent(state, expectedGeneration, candidateRecordId, accountUid) {
  if (state.generation !== expectedGeneration) return { outcome: 'stale-generation', committed: false };
  if (!state.auth || state.auth.recordId !== candidateRecordId) return { outcome: 'stale-record', committed: false };
  state.auth = { ...state.auth, accountUid };
  return { outcome: 'committed', committed: true };
}

function candidateRejectionTransition(state, candidateValidation) {
  assert.notEqual(candidateValidation.outcome, 'valid');
  return {
    outcome: `candidate-${candidateValidation.outcome}`,
    globalAuthMutation: false,
    state
  };
}

function committedInvalidationTransition(state, requestGeneration, authoritativeInvalidAuth) {
  if (!authoritativeInvalidAuth || state.generation !== requestGeneration) {
    return { outcome: 'no-global-demotion', demoted: false };
  }
  state.generation += 1;
  state.auth = null;
  return { outcome: 'p1-196-demoted-current', demoted: true };
}

function makeControlReceipt({ validationId, expectedAuthGeneration, result, accountUid = '', capabilityState = 'unknown' }) {
  return { validationId, expectedAuthGeneration, result, accountUid, capabilityState };
}

function receiptHasSecret(receipt) {
  const forbiddenKey = /(?:accessToken|refreshToken|oauthToken|bearerToken|authorizationHeader|candidateToken)$/i;
  return Object.entries(receipt || {}).some(([key, value]) => {
    if (forbiddenKey.test(key)) return true;
    return typeof value === 'string' && /Authorization:\s*(?:OAuth|Bearer)\s+/i.test(value);
  });
}

// Canonical ownership/boundary locks.
check('R01 P1-191 remains ACTIVE', () => has(REGISTRY, '| P1-191 | ACTIVE |'));
check('R02 exact P1-191 owner wording', () => has(REGISTRY, 'Manual-token replacement must validate candidate before generation-fenced commit and preserve last proven auth on failure/unknown; old PKCE cannot later overwrite it.'));
check('R03 P1-178 shared generation owner', () => has(P178, 'P1-178 = shared auth-attempt/settings commit generation'));
check('R04 P1-178 calls manual replacement a newer mutation', () => has(P178, 'disconnect/manual replacement invalidating older completion authority'));
check('R05 P1-195 names P1-191 owner', () => has(P195, 'P1-191 = manual-token candidate validation/replacement policy'));
check('R06 P1-195 manual capability unknown', () => has(P195, 'a manual token without exact request/provider scope receipt remains capability `unknown`'));
check('R07 P1-196 separates manual replacement ownership', () => has(P196, 'P1-191 = manual-token candidate validation/replacement'));
check('R08 research-only mode', () => has(EVIDENCE, 'RESEARCH-ONLY / CURRENT-MAIN ABSORPTION REVIEW'));
check('R09 runtime unchanged boundary', () => has(EVIDENCE, 'Production/runtime modification: **NONE**'));
check('R10 L5 not run', () => has(EVIDENCE, 'Real Chrome/Yandex L5: **NOT RUN**'));
check('R11 release policy not activated', () => has(EVIDENCE, 'Release-policy activation: **NONE**'));
check('R12 no new P-code', () => has(EVIDENCE, 'New P-code: **NO**'));
check('R13 exact baseline bound', () => has(EVIDENCE, 'main = 5da21c26cb0bfd0415b4369203f631e5e3f0615e'));

// Current source census: prove today's defect, do not demand target runtime.
check('S01 manual function found', () => assert.ok(MANUAL.length > 100));
check('S02 manual candidate source marker', () => has(MANUAL, "source: 'manual'"));
check('S03 manual candidate contains access token before validation', () => has(MANUAL, 'accessToken: token'));
check('S04 manual candidate scope remains empty', () => has(MANUAL, "scope: ''"));
check('S05 candidate global write exists', () => has(MANUAL, 'await writeYandexAuth(yandexAuth);'));
check('S06 ordinary global yandexApi validation exists', () => has(MANUAL, "const info = await yandexApi('');"));
check('S07 failure exact-record clear exists after candidate publication', () => has(MANUAL, 'await compareClearYandexAuthRecord(yandexAuth);'));
check('S08 write precedes validation', () => assert.ok(MANUAL.indexOf('await writeYandexAuth(yandexAuth);') < MANUAL.indexOf("const info = await yandexApi('');")));
check('S09 validation precedes exact-record catch clear', () => assert.ok(MANUAL.indexOf("const info = await yandexApi('');") < MANUAL.indexOf('await compareClearYandexAuthRecord(yandexAuth);')));
check('S10 account enrichment is exact-record fenced', () => has(MANUAL, 'await compareUpdateYandexAuthRecord(yandexAuth, { account: extractDiskAccount(info) });'));
check('S11 candidate-bound helper absent current', () => lacks(SOURCE, 'validateManualYandexTokenCandidate'));
check('S12 generic candidate helper absent current', () => lacks(SOURCE, 'validateYandexAuthCandidate'));
check('S13 manual generation-CAS helper absent current', () => lacks(SOURCE, 'commitManualYandexAuthIfGeneration'));
check('S14 PKCE finish now uses P1-178 exact-attempt CAS', () => has(PKCE_FINISH, 'commitYandexOAuthAttemptControl(captured, yandexAuth)'));
check('S15 input length positive control', () => has(MANUAL, 'MAX_YANDEX_ACCESS_TOKEN_CHARS'));
check('S16 empty candidate positive control', () => has(MANUAL, "throw new Error('Вставьте OAuth-токен.');"));

// Evidence + external provenance locks.
[
  'Historical provenance retained selectively',
  'candidate is still published before validation',
  'failure clears global auth',
  'Current validation is coupled to mutable global auth',
  'Fresh provider recheck: Yandex manual/debug token',
  'Standards cross-check: RFC 6750',
  'Candidate-bound validation target',
  'Validation result is tri-state',
  'Required replacement protocol',
  'Old PKCE completion after manual replacement',
  'Disconnect versus in-flight manual candidate',
  'Concurrent manual candidates',
  'Account enrichment belongs to the exact candidate',
  'valid manual is not full-capability proof',
  'candidate rejection is not global demotion',
  'Candidate request authority must be exact',
  'Candidate secret lifecycle',
  'Current positive controls to preserve',
  'P1-191 replacement refinement != runtime implementation'
].forEach((needle, index) => check(`E${String(index + 1).padStart(2, '0')}`, () => has(EVIDENCE, needle)));
check('E20 Yandex manual token official URL recorded', () => has(EVIDENCE, 'https://yandex.com/dev/id/doc/en/tokens/debug-token'));
check('E21 Yandex general token URL recorded', () => has(EVIDENCE, 'https://yandex.com/dev/id/doc/en/access'));
check('E22 RFC6750 URL recorded', () => has(EVIDENCE, 'https://www.rfc-editor.org/rfc/rfc6750.html'));
check('E23 Yandex OAuth header distinction recorded', () => has(EVIDENCE, 'Authorization: OAuth <token>'));

// Demonstrate current-shaped destructive replacement.
{
  const state = makeState({ recordId: 'A', source: 'oauth', accountUid: 'uid-a' }, 7);
  const result = currentShapedManualReplace(state, { recordId: 'B', source: 'manual', accessToken: 'secret-b' }, 'invalid');
  check('C01 current-shaped invalid candidate reports invalid', () => assert.equal(result.outcome, 'invalid'));
  check('C02 current-shaped invalid candidate erases proven A', () => assert.equal(state.auth, null));
  check('C03 current-shaped generation does not protect A', () => assert.equal(state.generation, 7));
}
{
  const state = makeState({ recordId: 'A', source: 'oauth', accountUid: 'uid-a' }, 8);
  currentShapedManualReplace(state, { recordId: 'B', source: 'manual', accessToken: 'secret-b' }, 'unknown');
  check('C04 current-shaped unknown candidate also erases A', () => assert.equal(state.auth, null));
}

// Target invalid/unknown candidates preserve last proven auth and generation.
{
  const state = makeState({ recordId: 'A', source: 'oauth', accountUid: 'uid-a' }, 10);
  const before = JSON.stringify(state);
  const validation = validateCandidate({ recordId: 'B' }, 'invalid');
  const result = targetManualReplace(state, { recordId: 'B' }, validation, 10);
  check('T01 invalid B not committed', () => assert.equal(result.committed, false));
  check('T02 invalid B result preserved', () => assert.equal(result.outcome, 'invalid'));
  check('T03 invalid B preserves A/G', () => assert.equal(JSON.stringify(state), before));
}
{
  const state = makeState({ recordId: 'A', source: 'oauth', accountUid: 'uid-a' }, 11);
  const before = JSON.stringify(state);
  const validation = validateCandidate({ recordId: 'B' }, 'unknown');
  const result = targetManualReplace(state, { recordId: 'B' }, validation, 11);
  check('T04 unknown B not committed', () => assert.equal(result.committed, false));
  check('T05 unknown B result preserved', () => assert.equal(result.outcome, 'unknown'));
  check('T06 unknown B preserves A/G', () => assert.equal(JSON.stringify(state), before));
}

// Valid B commits exactly once under expected generation and remains capability unknown.
{
  const state = makeState({ recordId: 'A', source: 'oauth', accountUid: 'uid-a' }, 20);
  const validation = validateCandidate({ recordId: 'B' }, 'valid', 'uid-b');
  const result = targetManualReplace(state, { recordId: 'B' }, validation, 20);
  check('T07 valid B commits', () => assert.equal(result.outcome, 'committed'));
  check('T08 valid B increments generation once', () => assert.equal(state.generation, 21));
  check('T09 valid B becomes current record', () => assert.equal(state.auth.recordId, 'B'));
  check('T10 valid B account comes from B validation', () => assert.equal(state.auth.accountUid, 'uid-b'));
  check('T11 valid manual B remains capability unknown', () => assert.equal(state.auth.capabilityState, 'unknown'));
  check('T12 valid manual B records manual-no-scope provenance', () => assert.equal(state.auth.capabilityEvidence, 'manual-token-no-scope-receipt'));
  check('T13 Disk-info observation recorded narrowly', () => assert.deepEqual(state.auth.observedCapabilities, ['disk-info-read-success']));
  const duplicate = targetManualReplace(state, { recordId: 'B' }, validation, 20);
  check('T14 duplicate old expected generation cannot commit twice', () => assert.equal(duplicate.outcome, 'stale-generation'));
  check('T15 duplicate does not increment generation twice', () => assert.equal(state.generation, 21));
}

// Stale candidate cannot overwrite newer manual/OAuth auth.
{
  const state = makeState({ recordId: 'A' }, 30);
  const bValidation = validateCandidate({ recordId: 'B' }, 'valid', 'uid-b');
  const cValidation = validateCandidate({ recordId: 'C' }, 'valid', 'uid-c');
  const c = targetManualReplace(state, { recordId: 'C' }, cValidation, 30);
  const b = targetManualReplace(state, { recordId: 'B' }, bValidation, 30);
  check('G01 newer C commits first', () => assert.equal(c.committed, true));
  check('G02 stale B is rejected', () => assert.equal(b.outcome, 'stale-generation'));
  check('G03 stale B cannot overwrite C', () => assert.equal(state.auth.recordId, 'C'));
  check('G04 stale B cannot advance C generation', () => assert.equal(state.generation, 31));
}

// Older PKCE loses commit authority after manual B.
{
  const state = makeState({ recordId: 'A' }, 40);
  const b = targetManualReplace(state, { recordId: 'B' }, validateCandidate({ recordId: 'B' }, 'valid'), 40);
  const oldPkce = targetPkceCommit(state, { recordId: 'P-old', source: 'oauth-pkce-code' }, 40);
  check('G05 manual B commits from G', () => assert.equal(b.committed, true));
  check('G06 old PKCE becomes stale', () => assert.equal(oldPkce.outcome, 'stale-generation'));
  check('G07 old PKCE cannot overwrite B', () => assert.equal(state.auth.recordId, 'B'));
}

// Disconnect is a generation barrier against in-flight B.
{
  const state = makeState({ recordId: 'A' }, 50);
  const validation = validateCandidate({ recordId: 'B' }, 'valid');
  disconnect(state);
  const b = targetManualReplace(state, { recordId: 'B' }, validation, 50);
  check('D01 disconnect increments generation', () => assert.equal(state.generation, 51));
  check('D02 disconnect publishes no auth', () => assert.equal(state.auth, null));
  check('D03 late B cannot resurrect auth', () => assert.equal(b.outcome, 'stale-generation'));
  check('D04 disconnected state remains true', () => assert.equal(state.disconnected, true));
}

// Late invalid/unknown candidate has zero global mutation authority.
{
  const state = makeState({ recordId: 'C' }, 61);
  const invalid = candidateRejectionTransition(state, validateCandidate({ recordId: 'B' }, 'invalid'));
  const unknown = candidateRejectionTransition(state, validateCandidate({ recordId: 'D' }, 'unknown'));
  check('L01 invalid candidate rejection has zero global mutation', () => assert.equal(invalid.globalAuthMutation, false));
  check('L02 unknown candidate rejection has zero global mutation', () => assert.equal(unknown.globalAuthMutation, false));
  check('L03 current C remains after both candidate outcomes', () => assert.equal(state.auth.recordId, 'C'));
  check('L04 generation remains current', () => assert.equal(state.generation, 61));
}

// Account enrichment is record + generation bound.
{
  const state = makeState({ recordId: 'B', source: 'manual', accountUid: '' }, 71);
  const result = enrichCandidateIfCurrent(state, 71, 'B', 'uid-b');
  check('A01 current B enrichment commits', () => assert.equal(result.committed, true));
  check('A02 B enrichment writes B account only', () => assert.equal(state.auth.accountUid, 'uid-b'));
  state.auth = { recordId: 'C', source: 'oauth', accountUid: 'uid-c' };
  state.generation = 72;
  const stale = enrichCandidateIfCurrent(state, 71, 'B', 'uid-b-late');
  check('A03 stale B enrichment rejected', () => assert.equal(stale.outcome, 'stale-generation'));
  check('A04 stale B enrichment cannot overwrite C', () => assert.equal(state.auth.accountUid, 'uid-c'));
}

// Candidate rejection versus committed-auth invalidation ownership.
{
  const state = makeState({ recordId: 'A' }, 80);
  const candidateInvalid = candidateRejectionTransition(state, validateCandidate({ recordId: 'B' }, 'invalid'));
  check('V01 invalid uncommitted B is candidate rejection', () => assert.equal(candidateInvalid.outcome, 'candidate-invalid'));
  check('V02 invalid uncommitted B does not demote A', () => assert.equal(state.auth.recordId, 'A'));
  const staleCommittedFailure = committedInvalidationTransition(state, 79, true);
  check('V03 stale committed invalidation cannot demote A', () => assert.equal(staleCommittedFailure.demoted, false));
  const currentCommittedFailure = committedInvalidationTransition(state, 80, true);
  check('V04 current committed invalidation can enter P1-196 transition', () => assert.equal(currentCommittedFailure.outcome, 'p1-196-demoted-current'));
  check('V05 P1-196 demotion advances shared generation', () => assert.equal(state.generation, 81));
}

// Non-secret candidate control receipt.
{
  const receipt = makeControlReceipt({
    validationId: 'manual-validation-1',
    expectedAuthGeneration: 90,
    result: 'valid',
    accountUid: 'uid-b',
    capabilityState: 'unknown'
  });
  check('Q01 control receipt has no candidate secret', () => assert.equal(receiptHasSecret(receipt), false));
  check('Q02 validation id is safe metadata', () => assert.equal(receipt.validationId, 'manual-validation-1'));
  check('Q03 expected generation is safe metadata', () => assert.equal(receipt.expectedAuthGeneration, 90));
  check('Q04 accessToken key is secret-bearing', () => assert.equal(receiptHasSecret({ ...receipt, accessToken: 'secret' }), true));
  check('Q05 candidateToken key is secret-bearing', () => assert.equal(receiptHasSecret({ ...receipt, candidateToken: 'secret' }), true));
  check('Q06 Authorization OAuth value is secret-bearing', () => assert.equal(receiptHasSecret({ ...receipt, note: 'Authorization: OAuth secret' }), true));
  check('Q07 Authorization Bearer value is secret-bearing', () => assert.equal(receiptHasSecret({ ...receipt, note: 'Authorization: Bearer secret' }), true));
}

// Canonical capability composition: one observed read is not write/full proof.
{
  const state = makeState({ recordId: 'A' }, 100);
  targetManualReplace(state, { recordId: 'B' }, validateCandidate({ recordId: 'B' }, 'valid'), 100);
  check('P01 manual validation does not grant scopes', () => assert.equal(Object.prototype.hasOwnProperty.call(state.auth, 'grantedScopes'), false));
  check('P02 manual validation capability remains unknown', () => assert.equal(state.auth.capabilityState, 'unknown'));
  check('P03 only Disk-info observation is recorded', () => assert.deepEqual(state.auth.observedCapabilities, ['disk-info-read-success']));
  check('P04 no write observation is fabricated', () => assert.ok(!state.auth.observedCapabilities.includes('disk-write-success')));
}

// Project/release boundary.
check('B01 manifest remains 0.9.8', () => assert.equal(MANIFEST.version, '0.9.8'));
check('B02 evidence separates runtime implementation', () => has(EVIDENCE, 'P1-191 replacement refinement != runtime implementation'));
check('B03 evidence separates real qualification', () => has(EVIDENCE, 'runtime implementation != real Yandex qualification'));
check('B04 evidence separates S2 activation', () => has(EVIDENCE, 'real Yandex qualification != P1-231 S2 activation'));
check('B05 evidence separates release readiness', () => has(EVIDENCE, 'P1-231 S2 activation != release readiness'));
check('B06 official ZIP remains forbidden in tranche', () => has(EVIDENCE, 'official ZIP'));
check('B07 tag/Release/deployment remain outside tranche', () => has(EVIDENCE, 'tag, Release or deployment'));

console.log(`P1-191 manual token replacement refinement model: PASS; cases=${cases}; schema=webclip-manual-token-replacement/v1; baseline=5da21c26cb0bfd0415b4369203f631e5e3f0615e; current_prevalidation_publish=true; current_failure_clear=true; candidate_validation=private-bound; invalid_preserves_old=true; unknown_preserves_old=true; commit=shared-generation-cas; stale_pkce=blocked; manual_capability=unknown; validity_owner=P1-196; capability_owner=P1-195; generation_owner=P1-178; runtime_modified=false; new_p_code=false; s2_authorized=false; release_authorized=false`);
