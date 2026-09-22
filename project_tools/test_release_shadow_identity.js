'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const shadow = require('./release_shadow_identity.js');
const identity = require('./release_identity.js');

const ROOT = path.resolve(__dirname, '..');
let checks = 0;
function eq(a,b,m){ assert.equal(a,b,m); checks += 1; }
function ok(v,m){ assert.ok(v,m); checks += 1; }
function throwsCode(fn,code,m){ assert.throws(fn,e=>e&&e.code===code,m||code); checks += 1; }
function git(...args){ return execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim(); }

const head = git('rev-parse','HEAD');
const identities = identity.computeIdentities(head);

function gateFromIdentity(candidate, ids = identities) {
  return {
    schema: 'webclip-candidate-generation-result/v1',
    candidate_sha: candidate,
    generation_state: 'pass',
    generator_rcf_binding: 'bound',
    identities: {
      rpf: ids.rpf,
      qcf: {
        'unpacked-chrome': ids.qcf['unpacked-chrome'],
        'yandex-e2e': ids.qcf['yandex-e2e']
      },
      rcf: ids.rcf,
      bcf: ids.bcf
    },
    policy_mutation: false,
    receipt_interpretation: false,
    evidence_settlement: false,
    artifact_build: false,
    release_authorized: false
  };
}

const push = shadow.evaluateShadow(
  { eventKind: 'push', candidateSha: head },
  {
    identityComputer: () => identities,
    generationComputer: (candidate) => gateFromIdentity(candidate)
  }
);
eq(push.schema,'webclip-shadow-identity/v1','schema');
eq(push.candidate_sha,head,'candidate');
eq(push.event_kind,'push','event');
eq(push.identity_protocol,'WEBCLIP_RELEASE_IDENTITY_V1','protocol');
eq(push.generation_gate,'pass','generation gate');
eq(push.eligible,true,'eligible');
eq(push.shadow_outcome,'eligible','outcome');
eq(push.impact_context.kind,'push-main','push impact kind');
eq(push.policy_mutation,false,'no policy mutation');
eq(push.receipt_mutation,false,'no receipt mutation');
eq(push.evidence_settlement,false,'no evidence settlement');
eq(push.artifact_build,false,'no artifact build');
eq(push.release_authorized,false,'no release authorization');

throwsCode(
  () => shadow.evaluateShadow(
    { eventKind: 'push', candidateSha: head, baseSha: '1'.repeat(40) },
    { identityComputer: () => identities, generationComputer: c => gateFromIdentity(c) }
  ),
  'S1A_PUSH_PR_CONTEXT_FORBIDDEN'
);
throwsCode(
  () => shadow.evaluateShadow(
    { eventKind: 'push', candidateSha: '1'.repeat(40) },
    { identityComputer: () => identities, generationComputer: c => gateFromIdentity(c) }
  ),
  'S1A_CHECKOUT_SHA_MISMATCH'
);

const mismatched = {
  ...gateFromIdentity(head),
  identities: { ...gateFromIdentity(head).identities, rpf: 'sha256:' + '0'.repeat(64) }
};
throwsCode(
  () => shadow.evaluateShadow(
    { eventKind: 'push', candidateSha: head },
    { identityComputer: () => identities, generationComputer: () => mismatched }
  ),
  'S1A_GATE_IDENTITY_MISMATCH'
);

const base = '1'.repeat(40);
const prHead = '2'.repeat(40);
const trustedImpact = {
  schema: 'webclip-pr-impact/v1',
  provenance: { baseSha: base, prHeadSha: prHead, candidateSha: head },
  authority: {
    packageTopologyChanged: false,
    sourceGenerationTopologyChanged: false
  },
  touched: {
    packageMember: false,
    generationClosure: false
  },
  requires: {
    candidateGenerationVerification: false,
    shadowIdentityRecompute: false,
    trustedControlPlaneReview: false
  },
  trust: { automaticClassificationTrusted: true },
  policy_mutation: false,
  identity_computation: false,
  candidate_generation_verified: false,
  release_authorized: false
};

const pr = shadow.evaluateShadow(
  { eventKind: 'pull_request', candidateSha: head, baseSha: base, prHeadSha: prHead },
  {
    identityComputer: () => identities,
    generationComputer: c => gateFromIdentity(c),
    prImpactComputer: () => trustedImpact
  }
);
eq(pr.impact_context.kind,'pull-request-synthetic-merge','PR impact kind');
eq(pr.impact_context.baseSha,base,'PR base');
eq(pr.impact_context.prHeadSha,prHead,'PR head');
eq(pr.impact_context.candidateSha,head,'synthetic merge candidate');
eq(pr.impact_context.automaticClassificationTrusted,true,'trusted PR impact');

const reviewImpact = {
  ...trustedImpact,
  requires: { ...trustedImpact.requires, trustedControlPlaneReview: true },
  trust: { automaticClassificationTrusted: false }
};
const review = shadow.evaluateShadow(
  { eventKind: 'pull_request', candidateSha: head, baseSha: base, prHeadSha: prHead },
  {
    identityComputer: () => identities,
    generationComputer: c => gateFromIdentity(c),
    prImpactComputer: () => reviewImpact
  }
);
eq(review.eligible,false,'control-plane review is not eligible');
eq(review.shadow_outcome,'control-plane-review-required','control-plane review outcome');
eq(review.impact_context.trustedControlPlaneReview,true,'review requirement preserved');
eq(review.impact_context.automaticClassificationTrusted,false,'automatic trust remains false');
eq(review.release_authorized,false,'review state does not authorize release');

for (const invalidTrust of [
  {
    ...trustedImpact,
    requires: { ...trustedImpact.requires, trustedControlPlaneReview: false },
    trust: { automaticClassificationTrusted: false }
  },
  {
    ...trustedImpact,
    requires: { ...trustedImpact.requires, trustedControlPlaneReview: true },
    trust: { automaticClassificationTrusted: true }
  }
]) {
  throwsCode(
    () => shadow.evaluateShadow(
      { eventKind: 'pull_request', candidateSha: head, baseSha: base, prHeadSha: prHead },
      {
        identityComputer: () => identities,
        generationComputer: c => gateFromIdentity(c),
        prImpactComputer: () => invalidTrust
      }
    ),
    'S1A_PR_TRUST_STATE_INVALID'
  );
}

throwsCode(
  () => shadow.evaluateShadow(
    { eventKind: 'pull_request', candidateSha: head, baseSha: base, prHeadSha: base },
    {
      identityComputer: () => identities,
      generationComputer: c => gateFromIdentity(c),
      prImpactComputer: () => trustedImpact
    }
  ),
  'S1A_PR_PROVENANCE_INVALID'
);

const badImpact = {
  ...trustedImpact,
  provenance: { ...trustedImpact.provenance, candidateSha: '3'.repeat(40) }
};
throwsCode(
  () => shadow.evaluateShadow(
    { eventKind: 'pull_request', candidateSha: head, baseSha: base, prHeadSha: prHead },
    {
      identityComputer: () => identities,
      generationComputer: c => gateFromIdentity(c),
      prImpactComputer: () => badImpact
    }
  ),
  'S1A_PR_IMPACT_INVALID'
);

for (const pathValue of [
  'project_tools/release_contract_authority.js',
  'project_tools/release_builder_contract_authority.js',
  'project_tools/release_identity.js',
  'project_tools/release_candidate_generation.js',
  'project_tools/release_pr_impact.js',
  'project_tools/release_shadow_identity.js',
  'project_tools/check_ci_pins.py',
  'project_tools/check_pr_change_contract.py',
  '.github/workflows/repository-integrity.yml'
]) {
  const source = require('./release_pr_impact.js');
  ok(source.CHECKER_CONTROL_PLANE.includes(pathValue), pathValue + ' is S1 shadow trust surface');
}

const workflow = require('node:fs').readFileSync(
  path.join(ROOT,'.github','workflows','repository-integrity.yml'),'utf8'
);
ok(!workflow.includes('release_shadow_identity.js'),'bootstrap tranche does not self-install workflow');
ok(!workflow.includes('p1-231-shadow-identity'),'bootstrap tranche has no permanent S1-A job');

console.log(
  'P1-231 S1-A passive shadow identity: PASS; checks=' + checks +
  '; candidate=' + head +
  '; push=eligible; pr_control_plane=review-required; malformed_trust=fail-closed; workflow_activation=false; ' +
  'policy_mutation=false; receipt_mutation=false; artifact_build=false; release_authorized=false'
);
