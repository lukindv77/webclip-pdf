'use strict';

// P1-231 S1-D passive migration rehearsal.
// Composes already-produced S1-A/S1-B/S1-C reports and immutable V1 rollback
// anchors. It does not recompute identities, settle receipts, build artifacts,
// mutate readiness, activate S2, or authorize release.

const path = require('node:path');
const { execFileSync } = require('node:child_process');
const packageAuthority = require('./release_package_authority.js');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA = 'webclip-shadow-migration-rehearsal/v1';
const S1A_SCHEMA = 'webclip-shadow-identity/v1';
const S1B_SCHEMA = 'webclip-shadow-settlement/v1';
const S1C_SCHEMA = 'webclip-builder-equivalence/v1';
const WORKFLOW_REF = 'lukindv77/webclip-pdf/.github/workflows/repository-integrity.yml@refs/heads/main';
const REQUIRED_SLOTS = Object.freeze([
  'unpacked-chrome',
  'yandex-e2e',
  'blocker-review',
  'release-decision'
]);
const V1_ANCHORS = Object.freeze({
  'project_docs/RELEASE_READINESS.md': '165766b248ffa48fc88f0140283adf0e855df22f',
  'project_tools/check_release_readiness.py': 'd3569428a3ea4e5d90be24426fd09c233c75b882',
  '.github/workflows/release-gate.yml': 'f6813f364d39932fb32a1cc2d527d2d7a489ed02',
  '.github/workflows/repository-integrity.yml': '4c60ecad7bcd525eb8da502e61c0cbc2857a6f31'
});

function fail(code, detail) {
  const error = new Error(String(detail || code).slice(0, 300));
  error.code = code;
  throw error;
}
function validDigest(value) {
  return /^sha256:[0-9a-f]{64}$/.test(String(value || ''));
}
function git(repoRoot, args) {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024
    });
  } catch (error) {
    const wrapped = new Error('git command failed');
    wrapped.code = 'S1D_GIT_FAILED';
    wrapped.cause = error;
    throw wrapped;
  }
}
function readRollbackAnchors(candidateSha, options = {}) {
  const candidate = packageAuthority.normalizeCandidateSha(candidateSha);
  const repoRoot = path.resolve(options.repoRoot || ROOT);
  const out = {};
  for (const rel of Object.keys(V1_ANCHORS)) {
    let oid;
    try { oid = String(git(repoRoot, ['rev-parse', candidate + ':' + rel])).trim(); }
    catch (_) { fail('S1D_V1_ROLLBACK_ANCHOR_MISSING', rel); }
    if (!/^[0-9a-f]{40}$/.test(oid)) fail('S1D_V1_ROLLBACK_ANCHOR_MISSING', rel);
    out[rel] = oid;
  }
  return Object.freeze(out);
}
function assertRollbackAnchors(observed) {
  if (!observed || typeof observed !== 'object' || Array.isArray(observed)) {
    fail('S1D_V1_ROLLBACK_ANCHOR_CHANGED');
  }
  const actualKeys = Object.keys(observed).sort();
  const expectedKeys = Object.keys(V1_ANCHORS).sort();
  if (
    actualKeys.length !== expectedKeys.length
    || actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    fail('S1D_V1_ROLLBACK_ANCHOR_CHANGED');
  }
  for (const [rel, oid] of Object.entries(V1_ANCHORS)) {
    if (observed[rel] !== oid) fail('S1D_V1_ROLLBACK_ANCHOR_CHANGED', rel);
  }
  return true;
}
function normalizeExecution(input, candidate) {
  if (!input || typeof input !== 'object') fail('S1D_EXECUTION_CONTEXT_INVALID');
  const checkoutSha = packageAuthority.normalizeCandidateSha(input.checkoutSha);
  const candidateAdmissionSha = packageAuthority.normalizeCandidateSha(input.candidateAdmissionSha);
  const evidenceMainSha = packageAuthority.normalizeCandidateSha(input.evidenceMainSha);
  const decisionMainSha = packageAuthority.normalizeCandidateSha(input.decisionMainSha);
  if (checkoutSha !== candidate) fail('S1D_CHECKED_OUT_CANDIDATE_MISMATCH');
  if (candidateAdmissionSha !== candidate) fail('S1D_CANDIDATE_ADMISSION_STALE');
  if (evidenceMainSha !== decisionMainSha) fail('S1D_MAIN_MOVED_AFTER_EVIDENCE');
  if (input.workflowRef !== WORKFLOW_REF) fail('S1D_WORKFLOW_REF_MISMATCH');
  if (input.workflowBlobSha !== V1_ANCHORS['.github/workflows/repository-integrity.yml']) {
    fail('S1D_WORKFLOW_SHA_MISMATCH');
  }
  if (input.receiptHistoryAppendOnly !== true) fail('S1D_RECEIPT_HISTORY_NOT_APPEND_ONLY');
  if (input.syntheticMergeRequired === true) {
    const prHeadSha = packageAuthority.normalizeCandidateSha(input.prHeadSha);
    if (prHeadSha === candidate) fail('S1D_PR_SYNTHETIC_MERGE_IDENTITY_INVALID');
  } else if (input.prHeadSha != null) {
    fail('S1D_EXECUTION_CONTEXT_INVALID');
  }
  return Object.freeze({
    checkoutSha,
    candidateAdmissionSha,
    evidenceMainSha,
    decisionMainSha,
    workflowRef: input.workflowRef,
    workflowBlobSha: input.workflowBlobSha,
    receiptHistoryAppendOnly: true,
    syntheticMergeRequired: input.syntheticMergeRequired === true,
    prHeadSha: input.syntheticMergeRequired === true ? input.prHeadSha : null
  });
}
function normalizeS1A(value, candidate) {
  if (
    !value
    || value.schema !== S1A_SCHEMA
    || value.candidate_sha !== candidate
    || value.generation_gate !== 'pass'
    || typeof value.eligible !== 'boolean'
    || !validDigest(value.rpf)
    || !validDigest(value.chrome_qcf)
    || !validDigest(value.yandex_qcf)
    || !validDigest(value.rcf)
    || !validDigest(value.bcf)
    || value.policy_mutation !== false
    || value.receipt_mutation !== false
    || value.evidence_settlement !== false
    || value.artifact_build !== false
    || value.release_authorized !== false
  ) fail('S1D_S1A_INVALID');
  if (value.eligible && value.shadow_outcome !== 'eligible') fail('S1D_S1A_ELIGIBILITY_INCONSISTENT');
  if (!value.eligible && value.shadow_outcome === 'eligible') fail('S1D_S1A_ELIGIBILITY_INCONSISTENT');
  return Object.freeze({
    eligible: value.eligible,
    shadowOutcome: value.shadow_outcome,
    rpf: value.rpf,
    chromeQcf: value.chrome_qcf,
    yandexQcf: value.yandex_qcf,
    rcf: value.rcf,
    bcf: value.bcf
  });
}
function exactSlotKeys(slots) {
  if (!slots || typeof slots !== 'object' || Array.isArray(slots)) return false;
  const actual = Object.keys(slots).sort();
  const expected = [...REQUIRED_SLOTS].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}
function normalizeS1B(value, candidate, s1a) {
  if (
    !value
    || value.schema !== S1B_SCHEMA
    || value.candidate_sha !== candidate
    || value.namespace_valid !== true
    || value.policy_mutation !== false
    || value.receipt_mutation !== false
    || value.readiness_mutation !== false
    || value.artifact_build !== false
    || value.release_authorized !== false
    || !exactSlotKeys(value.slots)
  ) fail('S1D_S1B_INVALID');

  if (!s1a.eligible) {
    if (
      value.identity_eligible !== false
      || value.settlement_evaluated !== false
      || value.shadow_outcome !== 'candidate-ineligible'
      || value.blocker_reason !== s1a.shadowOutcome
      || value.s0g_settlement_state !== null
      || value.all_required_slots_pass !== false
      || REQUIRED_SLOTS.some((kind) => value.slots[kind].state !== 'not-evaluated')
    ) fail('S1D_CANDIDATE_INELIGIBLE_SEMANTICS_INVALID');
    return Object.freeze({
      state: 'candidate-ineligible',
      settlementEvaluated: false,
      allRequiredSlotsPass: false,
      s0gState: null
    });
  }

  if (
    value.identity_eligible !== true
    || value.settlement_evaluated !== true
    || !['settled-blocked', 'settled-pass'].includes(value.shadow_outcome)
    || !['evidence-missing', 'evidence-blocked', 'settled-pass'].includes(value.s0g_settlement_state)
  ) fail('S1D_S1B_INVALID');

  const states = REQUIRED_SLOTS.map((kind) => value.slots[kind] && value.slots[kind].state);
  if (states.some((state) => !['pass', 'missing', 'blocked'].includes(state))) {
    fail('S1D_S1B_INVALID');
  }
  const allPass = states.every((state) => state === 'pass');
  const anyBlocked = states.includes('blocked');
  const expectedS0gState = allPass ? 'settled-pass' : (anyBlocked ? 'evidence-blocked' : 'evidence-missing');
  if (allPass !== value.all_required_slots_pass) fail('S1D_S1B_INVALID');
  if (value.s0g_settlement_state !== expectedS0gState) fail('S1D_S1B_INVALID');
  if (allPass && value.shadow_outcome !== 'settled-pass') fail('S1D_S1B_INVALID');
  if (!allPass && value.shadow_outcome !== 'settled-blocked') fail('S1D_S1B_INVALID');

  return Object.freeze({
    state: value.shadow_outcome,
    settlementEvaluated: true,
    allRequiredSlotsPass: allPass,
    s0gState: expectedS0gState
  });
}
function normalizeS1C(value, candidate, s1a) {
  if (
    !value
    || value.schema !== S1C_SCHEMA
    || value.candidate_sha !== candidate
    || value.rpf !== s1a.rpf
    || value.bcf !== s1a.bcf
    || value.authoritative !== false
    || value.official_artifact !== false
    || value.product_projection_loaded !== false
    || value.product_zip_built !== false
    || value.policy_mutation !== false
    || value.receipt_mutation !== false
    || value.readiness_mutation !== false
    || value.release_authorized !== false
  ) fail('S1D_S1C_INVALID');

  if (!s1a.eligible) {
    if (
      value.state !== 'candidate-ineligible'
      || value.identity_eligible !== false
      || value.equivalence_evaluated !== false
    ) fail('S1D_CANDIDATE_INELIGIBLE_SEMANTICS_INVALID');
    return Object.freeze({ state: value.state, equivalenceEvaluated: false, rawBytesEqual: false });
  }

  if (value.identity_eligible !== true) fail('S1D_S1C_INVALID');
  if (value.state === 'not-evaluated') {
    if (
      value.equivalence_evaluated !== false
      || value.blocker_reason !== 'product-build-not-authorized'
      || value.raw_bytes_equal !== false
    ) fail('S1D_S1C_INVALID');
    return Object.freeze({ state: 'not-evaluated', equivalenceEvaluated: false, rawBytesEqual: false });
  }
  if (
    value.state !== 'equivalent'
    || value.equivalence_evaluated !== true
    || value.raw_bytes_equal !== true
    || value.fixture_only !== true
  ) fail('S1D_ARCHIVE_PHYSICAL_DRIFT');
  return Object.freeze({ state: 'equivalent', equivalenceEvaluated: true, rawBytesEqual: true });
}
function structural(candidate, code) {
  return Object.freeze({
    schema: SCHEMA,
    candidate_sha: candidate,
    state: 'structural-failure',
    failure: code,
    shadow: null,
    v1_authority: 'unchanged',
    rollback_target: 'v1-only',
    release_ready: false,
    release_authorized: false,
    s2_authorized: false,
    product_zip: false,
    authoritative: false,
    policy_mutation: false,
    receipt_mutation: false,
    readiness_mutation: false
  });
}
function rehearseMigration(input, options = {}) {
  let candidate = null;
  try {
    if (!input || typeof input !== 'object') fail('S1D_INPUT_INVALID');
    candidate = packageAuthority.normalizeCandidateSha(input.candidateSha);
    const observedAnchors = options.observedAnchors || readRollbackAnchors(candidate, options);
    assertRollbackAnchors(observedAnchors);
    normalizeExecution(input.execution, candidate);
    const s1a = normalizeS1A(input.s1a, candidate);
    const s1b = normalizeS1B(input.s1b, candidate, s1a);
    const s1c = normalizeS1C(input.s1c, candidate, s1a);

    return Object.freeze({
      schema: SCHEMA,
      candidate_sha: candidate,
      state: 'shadow-observed',
      failure: null,
      shadow: Object.freeze({
        identity: s1a.eligible ? 'eligible' : 'candidate-ineligible',
        settlement: s1b.s0gState || s1b.state,
        builder_equivalence: s1c.state
      }),
      v1_authority: 'unchanged',
      rollback_target: 'v1-only',
      release_ready: false,
      release_authorized: false,
      s2_authorized: false,
      product_zip: false,
      authoritative: false,
      policy_mutation: false,
      receipt_mutation: false,
      readiness_mutation: false
    });
  } catch (error) {
    return structural(candidate, String(error && error.code || 'S1D_STRUCTURAL_FAILURE'));
  }
}

module.exports = Object.freeze({
  ROOT,
  SCHEMA,
  S1A_SCHEMA,
  S1B_SCHEMA,
  S1C_SCHEMA,
  WORKFLOW_REF,
  REQUIRED_SLOTS,
  V1_ANCHORS,
  validDigest,
  readRollbackAnchors,
  assertRollbackAnchors,
  normalizeExecution,
  normalizeS1A,
  normalizeS1B,
  normalizeS1C,
  structural,
  rehearseMigration
});
