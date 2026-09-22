'use strict';

// P1-231 S1-A passive shadow-identity composition.
// Consumes already-computed S0-E identity, S0-F admission and (for PRs) trusted
// S0-I impact context. It does not execute a product build, settle receipts,
// mutate readiness, alter permanent workflows, or authorize release.

const identity = require('./release_identity.js');
const candidateGeneration = require('./release_candidate_generation.js');
const prImpactAuthority = require('./release_pr_impact.js');

const SCHEMA = 'webclip-shadow-identity/v1';

function fail(code, detail) {
  const error = new Error(String(detail || code).slice(0, 240));
  error.code = code;
  throw error;
}

function isSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{40}$/.test(value);
}

function isFingerprint(value) {
  return typeof value === 'string' && /^sha256:[0-9a-f]{64}$/.test(value);
}

function identityTuple(value) {
  if (
    !value
    || value.schema !== 'webclip-release-identities/v1'
    || value.protocol !== identity.PROTOCOL
    || !isSha(value.candidate_sha)
    || value.policy_mutation !== false
    || value.receipt_interpretation !== false
    || value.artifact_build !== false
    || value.release_authorized !== false
    || !isFingerprint(value.rpf)
    || !isFingerprint(value.rcf)
    || !isFingerprint(value.bcf)
    || !value.qcf
    || !isFingerprint(value.qcf['unpacked-chrome'])
    || !isFingerprint(value.qcf['yandex-e2e'])
  ) {
    fail('S1A_IDENTITY_INVALID');
  }
  return Object.freeze({
    candidate_sha: value.candidate_sha,
    rpf: value.rpf,
    qcf: Object.freeze({
      'unpacked-chrome': value.qcf['unpacked-chrome'],
      'yandex-e2e': value.qcf['yandex-e2e']
    }),
    rcf: value.rcf,
    bcf: value.bcf
  });
}

function generationTuple(value) {
  if (
    !value
    || value.schema !== candidateGeneration.RESULT_SCHEMA
    || !isSha(value.candidate_sha)
    || value.generation_state !== 'pass'
    || value.generator_rcf_binding !== 'bound'
    || value.policy_mutation !== false
    || value.receipt_interpretation !== false
    || value.evidence_settlement !== false
    || value.artifact_build !== false
    || value.release_authorized !== false
    || !value.identities
    || !isFingerprint(value.identities.rpf)
    || !value.identities.qcf
    || !isFingerprint(value.identities.qcf['unpacked-chrome'])
    || !isFingerprint(value.identities.qcf['yandex-e2e'])
    || !isFingerprint(value.identities.rcf)
    || !isFingerprint(value.identities.bcf)
  ) {
    fail('S1A_GENERATION_INVALID');
  }
  return Object.freeze({
    candidate_sha: value.candidate_sha,
    rpf: value.identities.rpf,
    qcf: Object.freeze({
      'unpacked-chrome': value.identities.qcf['unpacked-chrome'],
      'yandex-e2e': value.identities.qcf['yandex-e2e']
    }),
    rcf: value.identities.rcf,
    bcf: value.identities.bcf
  });
}

function sameTuple(left, right) {
  return (
    left.rpf === right.rpf
    && left.qcf['unpacked-chrome'] === right.qcf['unpacked-chrome']
    && left.qcf['yandex-e2e'] === right.qcf['yandex-e2e']
    && left.rcf === right.rcf
    && left.bcf === right.bcf
  );
}

function normalizePrImpact(value, expected) {
  if (
    !value
    || value.schema !== prImpactAuthority.SCHEMA
    || !value.provenance
    || value.provenance.baseSha !== expected.baseSha
    || value.provenance.prHeadSha !== expected.prHeadSha
    || value.provenance.candidateSha !== expected.candidateSha
    || !value.requires
    || !value.trust
    || value.policy_mutation !== false
    || value.identity_computation !== false
    || value.candidate_generation_verified !== false
    || value.release_authorized !== false
  ) {
    fail('S1A_PR_IMPACT_INVALID');
  }
  if (
    value.requires.trustedControlPlaneReview === true
    || value.trust.automaticClassificationTrusted !== true
  ) {
    fail('S1A_PR_CONTROL_PLANE_UNTRUSTED');
  }

  return Object.freeze({
    schema: value.schema,
    provenance: Object.freeze({ ...value.provenance }),
    touched: Object.freeze({ ...(value.touched || {}) }),
    requires: Object.freeze({ ...value.requires }),
    trust: Object.freeze({ ...value.trust })
  });
}

function validateExecutionContext(input) {
  if (!input || typeof input !== 'object') fail('S1A_WORKFLOW_CONTEXT_INVALID');
  const eventKind = input.eventKind;
  const deliveryHeadSha = input.deliveryHeadSha;
  const githubSha = input.githubSha;
  const shadowHeadSha = input.shadowHeadSha;

  for (const value of [deliveryHeadSha, githubSha, shadowHeadSha]) {
    if (!isSha(value)) fail('S1A_WORKFLOW_SHA_INVALID');
  }

  if (eventKind === 'push') {
    if (input.baseSha != null || input.prHeadSha != null) fail('S1A_PUSH_PR_CONTEXT_FORBIDDEN');
    if (deliveryHeadSha !== githubSha || shadowHeadSha !== githubSha) {
      fail('S1A_WORKFLOW_CONTEXT_MISMATCH');
    }
    return Object.freeze({
      eventKind,
      deliveryHeadSha,
      shadowCandidateSha: shadowHeadSha
    });
  }

  if (eventKind !== 'pull_request') fail('S1A_EVENT_UNSUPPORTED');
  if (!isSha(input.baseSha) || !isSha(input.prHeadSha)) fail('S1A_PR_PROVENANCE_INVALID');
  if (deliveryHeadSha !== input.prHeadSha) fail('S1A_DELIVERY_HEAD_MISMATCH');
  if (shadowHeadSha !== githubSha) fail('S1A_SHADOW_CANDIDATE_MISMATCH');
  if (new Set([input.baseSha, input.prHeadSha, shadowHeadSha]).size !== 3) {
    fail('S1A_PR_PROVENANCE_INVALID');
  }

  return Object.freeze({
    eventKind,
    deliveryHeadSha,
    baseSha: input.baseSha,
    prHeadSha: input.prHeadSha,
    shadowCandidateSha: shadowHeadSha
  });
}

function composeShadowIdentity(input) {
  if (!input || typeof input !== 'object') fail('S1A_INPUT_INVALID');
  if (!['push', 'pull_request'].includes(input.eventKind)) fail('S1A_EVENT_UNSUPPORTED');
  if (!isSha(input.shadowHeadSha) || !isSha(input.githubSha)) fail('S1A_WORKFLOW_SHA_INVALID');
  if (input.shadowHeadSha !== input.githubSha) fail('S1A_CHECKOUT_SHA_MISMATCH');

  const exactIdentity = identityTuple(input.identityResult);
  const generation = generationTuple(input.generationResult);
  const candidate = input.githubSha;

  if (exactIdentity.candidate_sha !== candidate) fail('S1A_IDENTITY_CANDIDATE_MISMATCH');
  if (generation.candidate_sha !== candidate) fail('S1A_GENERATION_CANDIDATE_MISMATCH');
  if (!sameTuple(exactIdentity, generation)) fail('S1A_GENERATION_IDENTITY_MISMATCH');

  let impactContext;
  if (input.eventKind === 'pull_request') {
    if (!isSha(input.baseSha) || !isSha(input.prHeadSha)) fail('S1A_PR_PROVENANCE_INVALID');
    const impact = normalizePrImpact(input.prImpact, {
      baseSha: input.baseSha,
      prHeadSha: input.prHeadSha,
      candidateSha: candidate
    });
    impactContext = Object.freeze({
      kind: 'pull_request',
      baseSha: input.baseSha,
      prHeadSha: input.prHeadSha,
      candidateSha: candidate,
      touched: impact.touched,
      requires: impact.requires
    });
  } else {
    if (input.baseSha != null || input.prHeadSha != null || input.prImpact != null) {
      fail('S1A_PUSH_PR_CONTEXT_FORBIDDEN');
    }
    impactContext = Object.freeze({ kind: 'push-main', candidateSha: candidate });
  }

  return Object.freeze({
    schema: SCHEMA,
    candidate_sha: candidate,
    event_kind: input.eventKind,
    identity_protocol: identity.PROTOCOL,
    identities: Object.freeze({
      rpf: exactIdentity.rpf,
      qcf: exactIdentity.qcf,
      rcf: exactIdentity.rcf,
      bcf: exactIdentity.bcf
    }),
    generation_state: 'pass',
    eligible: true,
    shadow_outcome: 'eligible',
    impact_context: impactContext,
    policy_mutation: false,
    receipt_mutation: false,
    readiness_mutation: false,
    artifact_build: false,
    authoritative: false,
    release_authorized: false
  });
}

module.exports = Object.freeze({
  SCHEMA,
  isSha,
  isFingerprint,
  identityTuple,
  generationTuple,
  sameTuple,
  normalizePrImpact,
  validateExecutionContext,
  composeShadowIdentity
});
