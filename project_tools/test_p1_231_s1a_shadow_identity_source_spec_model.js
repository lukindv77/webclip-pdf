'use strict';

// Research-only deterministic source-spec model for P1-231 S1-A.
// It models permanent-CI shadow identity semantics, including the current dual-checkout
// PR contract: delivery verification stays on the literal PR head while the S1-A shadow
// candidate is the GitHub synthetic merge SHA in a separate execution workspace. It does
// not modify the permanent workflow, build a WebClip product ZIP, write readiness, or mint receipts.

const assert = require('assert');
const crypto = require('crypto');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA = 'webclip-shadow-identity/v1';
const IDENTITY_PROTOCOL = 'WEBCLIP_RELEASE_IDENTITY_V1';
const PR_IMPACT_SCHEMA = 'webclip-pr-impact/v1';

const CURRENT = Object.freeze({
  rpf: 'sha256:686505dd03013ccc9760eab3daf15062b8791cb86c4b6d13693eb6a8997d946b',
  chromeQcf: 'sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c',
  yandexQcf: 'sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1',
  rcf: 'sha256:a099e052fdd75038f40a8895d2f91a8e63cefc545387d9ddebef8b783eb90b07',
  bcf: 'sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff',
});

let cases = 0;
function check(v, m) { cases += 1; assert(v, m); }
function eq(a, b, m) { cases += 1; assert.strictEqual(a, b, m); }
function deepEq(a, b, m) { cases += 1; assert.deepStrictEqual(a, b, m); }
function fail(code, detail) { const e = new Error(detail || code); e.code = code; throw e; }
function throwsCode(fn, code, m) {
  cases += 1;
  assert.throws(fn, (e) => e && e.code === code, m || `expected ${code}`);
}
function git(...args) { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim(); }
function clone(v) { return structuredClone(v); }
function mutateFingerprint(fp) {
  const tail = fp.endsWith('0') ? '1' : '0';
  return fp.slice(0, -1) + tail;
}
function isSha(v) { return typeof v === 'string' && /^[0-9a-f]{40}$/.test(v); }
function isFp(v) { return typeof v === 'string' && /^sha256:[0-9a-f]{64}$/.test(v); }

function validateIdentity(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('S1A_IDENTITY_INVALID');
  const keys = ['rpf', 'chromeQcf', 'yandexQcf', 'rcf', 'bcf'];
  for (const k of keys) if (!isFp(raw[k])) fail('S1A_IDENTITY_INVALID', k);
  return Object.fromEntries(keys.map((k) => [k, raw[k]]));
}

function sameIdentity(a, b) {
  return ['rpf', 'chromeQcf', 'yandexQcf', 'rcf', 'bcf'].every((k) => a[k] === b[k]);
}

function validateGate(gate, candidateSha) {
  if (!gate || typeof gate !== 'object' || Array.isArray(gate)) fail('S1A_GATE_INVALID');
  if (!isSha(gate.candidateSha) || gate.candidateSha !== candidateSha) fail('S1A_GATE_CANDIDATE_MISMATCH');
  if (!['pass', 'blocked-portability', 'blocked-generation'].includes(gate.status)) fail('S1A_GATE_STATUS_UNSUPPORTED');
  if (gate.status === 'pass') {
    if (!gate.identities) fail('S1A_GATE_PASS_IDENTITY_MISSING');
    validateIdentity(gate.identities);
  } else if (gate.identities !== undefined && gate.identities !== null) {
    validateIdentity(gate.identities);
  }
  return gate;
}

function validatePrImpact(impact, { candidateSha, baseSha, prHeadSha }) {
  if (!impact || typeof impact !== 'object' || Array.isArray(impact)) fail('S1A_PR_IMPACT_MISSING');
  if (impact.schema !== PR_IMPACT_SCHEMA) fail('S1A_PR_IMPACT_SCHEMA_INVALID');
  if (!isSha(baseSha) || !isSha(prHeadSha)) fail('S1A_PR_PROVENANCE_INVALID');
  if (impact.baseSha !== baseSha) fail('S1A_PR_BASE_MISMATCH');
  if (impact.prHeadSha !== prHeadSha) fail('S1A_PR_HEAD_MISMATCH');
  if (impact.candidateSha !== candidateSha) fail('S1A_PR_CANDIDATE_MISMATCH');
  const trustedControlPlaneReview = impact.selfChange === true;
  const automaticClassificationTrusted = impact.trusted === true;
  if (trustedControlPlaneReview === automaticClassificationTrusted) fail('S1A_PR_TRUST_STATE_INVALID');
  return Object.freeze({
    ...impact,
    trustedControlPlaneReview,
    automaticClassificationTrusted,
  });
}

function shadowIdentity({
  eventKind,
  headSha,
  githubSha,
  baseSha = null,
  prHeadSha = null,
  identityProtocol = IDENTITY_PROTOCOL,
  identities,
  generationGate,
  prImpact = null,
}) {
  if (!['push', 'pull_request'].includes(eventKind)) fail('S1A_EVENT_UNSUPPORTED');
  if (!isSha(headSha) || !isSha(githubSha) || headSha !== githubSha) fail('S1A_CHECKOUT_SHA_MISMATCH');
  if (identityProtocol !== IDENTITY_PROTOCOL) fail('S1A_IDENTITY_PROTOCOL_UNSUPPORTED');

  const exactIdentity = validateIdentity(identities);
  const gate = validateGate(generationGate, githubSha);

  let impactContext;
  if (eventKind === 'pull_request') {
    const impact = validatePrImpact(prImpact, { candidateSha: githubSha, baseSha, prHeadSha });
    impactContext = Object.freeze({
      kind: 'pull_request',
      baseSha,
      prHeadSha,
      candidateSha: githubSha,
      classification: impact.classification,
      trustedControlPlaneReview: impact.trustedControlPlaneReview,
      automaticClassificationTrusted: impact.automaticClassificationTrusted,
    });
  } else {
    if (baseSha !== null || prHeadSha !== null || prImpact !== null) fail('S1A_PUSH_PR_CONTEXT_FORBIDDEN');
    impactContext = Object.freeze({ kind: 'push-main', candidateSha: githubSha });
  }

  let eligible = false;
  let shadowOutcome;
  if (gate.status === 'pass') {
    if (!sameIdentity(exactIdentity, validateIdentity(gate.identities))) fail('S1A_GATE_IDENTITY_MISMATCH');
    eligible = true;
    shadowOutcome = 'eligible';
  } else {
    if (gate.identities && !sameIdentity(exactIdentity, validateIdentity(gate.identities))) {
      fail('S1A_BLOCKED_IDENTITY_MISMATCH');
    }
    shadowOutcome = gate.status;
  }

  if (impactContext.trustedControlPlaneReview === true) {
    eligible = false;
    shadowOutcome = 'control-plane-review-required';
  }

  return Object.freeze({
    schema: SCHEMA,
    candidateSha: githubSha,
    eventKind,
    identityProtocol,
    ...exactIdentity,
    generationGate: gate.status,
    eligible,
    shadowOutcome,
    impactContext,
    policyMutation: false,
    receiptMutation: false,
    artifactBuild: false,
  });
}

function runNode(rel) {
  const proc = spawnSync(process.execPath, [path.join(ROOT, rel)], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (proc.status !== 0) fail('S1A_PREDECESSOR_FAILED', `${rel}\n${proc.stdout}\n${proc.stderr}`);
  return `${proc.stdout || ''}${proc.stderr || ''}`;
}

function validateWorkflowExecutionContext({
  eventKind,
  deliveryHeadSha,
  githubSha,
  shadowHeadSha,
  baseSha = null,
  prHeadSha = null,
}) {
  for (const value of [deliveryHeadSha, githubSha, shadowHeadSha]) {
    if (!isSha(value)) fail('S1A_WORKFLOW_SHA_INVALID');
  }
  if (eventKind === 'push') {
    if (baseSha !== null || prHeadSha !== null) fail('S1A_PUSH_PR_CONTEXT_FORBIDDEN');
    if (deliveryHeadSha !== githubSha || shadowHeadSha !== githubSha) fail('S1A_WORKFLOW_CONTEXT_MISMATCH');
    return Object.freeze({ eventKind, deliveryHeadSha, shadowCandidateSha: shadowHeadSha });
  }
  if (eventKind !== 'pull_request') fail('S1A_EVENT_UNSUPPORTED');
  if (!isSha(baseSha) || !isSha(prHeadSha)) fail('S1A_PR_PROVENANCE_INVALID');
  if (deliveryHeadSha !== prHeadSha) fail('S1A_DELIVERY_HEAD_MISMATCH');
  if (shadowHeadSha !== githubSha) fail('S1A_SHADOW_CANDIDATE_MISMATCH');
  return Object.freeze({
    eventKind,
    deliveryHeadSha,
    baseSha,
    prHeadSha,
    shadowCandidateSha: shadowHeadSha,
  });
}

(function main() {
  const head = git('rev-parse', 'HEAD');
  check(isSha(head), 'HEAD must be exact SHA');

  // Prove the canonical predecessor models still execute on the same checkout.
  const eOut = runNode('project_tools/test_p1_231_s0e_identity_engine_source_spec_model.js');
  const fOut = runNode('project_tools/test_p1_231_s0f_candidate_generation_verifier_source_spec_model.js');
  const iOut = runNode('project_tools/test_p1_231_s0i_pr_checker_integration_source_spec_model.js');
  check(/S0-E identity engine source-spec model: PASS; cases=251/.test(eOut), 'S0-E predecessor PASS missing');
  check(/S0-F candidate-generation verifier source-spec model: PASS; cases=271/.test(fOut), 'S0-F predecessor PASS missing');
  check(/current_gate=pass/.test(fOut), 'current S0-F gate must pass after generator RCF binding');
  check(/S0-I PR checker integration source-spec model: PASS; cases=\d+/.test(iOut), 'S0-I predecessor PASS missing');
  check(/synthetic_merge_identity=required/.test(iOut) && /package_files=34/.test(iOut) && /current_s0f_gate=pass/.test(iOut), 'S0-I current authority truth missing');

  for (const fp of Object.values(CURRENT)) check(isFp(fp), `current identity must be typed fingerprint: ${fp}`);

  // Current real push-like shadow state: generation identity is admitted, but this
  // shadow layer remains non-authoritative and performs no build/receipt mutation.
  const current = shadowIdentity({
    eventKind: 'push',
    headSha: head,
    githubSha: head,
    identities: CURRENT,
    generationGate: { candidateSha: head, status: 'pass', identities: CURRENT },
  });
  eq(current.schema, SCHEMA);
  eq(current.candidateSha, head);
  eq(current.generationGate, 'pass');
  eq(current.eligible, true);
  eq(current.shadowOutcome, 'eligible');
  eq(current.impactContext.kind, 'push-main');
  eq(current.policyMutation, false);
  eq(current.receiptMutation, false);
  eq(current.artifactBuild, false);

  // Blocked-generation remains an explicit negative control.
  const blocked = shadowIdentity({
    eventKind: 'push',
    headSha: head,
    githubSha: head,
    identities: CURRENT,
    generationGate: { candidateSha: head, status: 'blocked-generation', identities: CURRENT },
  });
  eq(blocked.eligible, false);
  eq(blocked.shadowOutcome, 'blocked-generation');

  // PR path is deliberately dual-checkout. Repository Integrity delivery verification
  // stays on the literal PR head, while S1-A evaluates the GitHub synthetic merge SHA
  // in a separate shadow workspace.
  const baseSha = '1'.repeat(40);
  const prHeadSha = '2'.repeat(40);
  const candidateSha = '3'.repeat(40);
  const prExecution = validateWorkflowExecutionContext({
    eventKind: 'pull_request',
    deliveryHeadSha: prHeadSha,
    githubSha: candidateSha,
    shadowHeadSha: candidateSha,
    baseSha,
    prHeadSha,
  });
  eq(prExecution.deliveryHeadSha, prHeadSha);
  eq(prExecution.shadowCandidateSha, candidateSha);
  check(prExecution.deliveryHeadSha !== prExecution.shadowCandidateSha, 'delivery PR head must remain distinct from synthetic merge shadow candidate');
  const prResult = shadowIdentity({
    eventKind: 'pull_request',
    headSha: candidateSha,
    githubSha: candidateSha,
    baseSha,
    prHeadSha,
    identities: CURRENT,
    generationGate: { candidateSha, status: 'pass', identities: CURRENT },
    prImpact: {
      schema: PR_IMPACT_SCHEMA,
      baseSha,
      prHeadSha,
      candidateSha,
      classification: 'package-neutral',
      trusted: true,
      selfChange: false,
    },
  });
  eq(prResult.candidateSha, candidateSha);
  eq(prResult.impactContext.prHeadSha, prHeadSha);
  check(prResult.candidateSha !== prResult.impactContext.prHeadSha, 'synthetic merge candidate must remain distinct from PR head');
  eq(prResult.eligible, true);

  // Delivery/shadow workspace provenance fails closed before identity evaluation.
  throwsCode(() => validateWorkflowExecutionContext({
    eventKind: 'pull_request',
    deliveryHeadSha: candidateSha,
    githubSha: candidateSha,
    shadowHeadSha: candidateSha,
    baseSha,
    prHeadSha,
  }), 'S1A_DELIVERY_HEAD_MISMATCH');
  throwsCode(() => validateWorkflowExecutionContext({
    eventKind: 'pull_request',
    deliveryHeadSha: prHeadSha,
    githubSha: candidateSha,
    shadowHeadSha: prHeadSha,
    baseSha,
    prHeadSha,
  }), 'S1A_SHADOW_CANDIDATE_MISMATCH');
  const pushExecution = validateWorkflowExecutionContext({
    eventKind: 'push',
    deliveryHeadSha: head,
    githubSha: head,
    shadowHeadSha: head,
  });
  eq(pushExecution.deliveryHeadSha, head);
  eq(pushExecution.shadowCandidateSha, head);

  // Shadow-workspace HEAD/GITHUB_SHA and stale candidate fences.
  throwsCode(() => shadowIdentity({
    eventKind: 'push', headSha: '4'.repeat(40), githubSha: '5'.repeat(40), identities: CURRENT,
    generationGate: { candidateSha: '5'.repeat(40), status: 'blocked-portability', identities: CURRENT },
  }), 'S1A_CHECKOUT_SHA_MISMATCH');
  throwsCode(() => shadowIdentity({
    eventKind: 'push', headSha: head, githubSha: head, identities: CURRENT,
    generationGate: { candidateSha: '6'.repeat(40), status: 'blocked-portability', identities: CURRENT },
  }), 'S1A_GATE_CANDIDATE_MISMATCH');

  // PASS requires exact S0-E/S0-F tuple equality in every domain.
  for (const key of Object.keys(CURRENT)) {
    const bad = clone(CURRENT); bad[key] = mutateFingerprint(bad[key]);
    throwsCode(() => shadowIdentity({
      eventKind: 'push', headSha: head, githubSha: head, identities: CURRENT,
      generationGate: { candidateSha: head, status: 'pass', identities: bad },
    }), 'S1A_GATE_IDENTITY_MISMATCH', `PASS mismatch must fail for ${key}`);
  }

  // A blocked gate may not carry a contradictory identity tuple either.
  const blockedBad = clone(CURRENT); blockedBad.rpf = mutateFingerprint(blockedBad.rpf);
  throwsCode(() => shadowIdentity({
    eventKind: 'push', headSha: head, githubSha: head, identities: CURRENT,
    generationGate: { candidateSha: head, status: 'blocked-portability', identities: blockedBad },
  }), 'S1A_BLOCKED_IDENTITY_MISMATCH');

  // Malformed/unsupported predecessor state is structural CI failure.
  throwsCode(() => shadowIdentity({
    eventKind: 'push', headSha: head, githubSha: head,
    identities: { ...CURRENT, rpf: 'bad' },
    generationGate: { candidateSha: head, status: 'blocked-portability', identities: CURRENT },
  }), 'S1A_IDENTITY_INVALID');
  throwsCode(() => shadowIdentity({
    eventKind: 'push', headSha: head, githubSha: head, identities: CURRENT,
    generationGate: { candidateSha: head, status: 'mystery' },
  }), 'S1A_GATE_STATUS_UNSUPPORTED');
  throwsCode(() => shadowIdentity({
    eventKind: 'push', headSha: head, githubSha: head, identities: CURRENT,
    identityProtocol: 'WEBCLIP_RELEASE_IDENTITY_V2',
    generationGate: { candidateSha: head, status: 'blocked-portability', identities: CURRENT },
  }), 'S1A_IDENTITY_PROTOCOL_UNSUPPORTED');

  // PR trust/provenance fences.
  const baseImpact = {
    schema: PR_IMPACT_SCHEMA,
    baseSha,
    prHeadSha,
    candidateSha,
    classification: 'package-neutral',
    trusted: true,
    selfChange: false,
  };
  throwsCode(() => shadowIdentity({
    eventKind: 'pull_request', headSha: candidateSha, githubSha: candidateSha,
    baseSha, prHeadSha, identities: CURRENT,
    generationGate: { candidateSha, status: 'blocked-portability', identities: CURRENT },
    prImpact: { ...baseImpact, candidateSha: prHeadSha },
  }), 'S1A_PR_CANDIDATE_MISMATCH');
  throwsCode(() => shadowIdentity({
    eventKind: 'pull_request', headSha: candidateSha, githubSha: candidateSha,
    baseSha, prHeadSha, identities: CURRENT,
    generationGate: { candidateSha, status: 'blocked-portability', identities: CURRENT },
    prImpact: { ...baseImpact, baseSha: '7'.repeat(40) },
  }), 'S1A_PR_BASE_MISMATCH');
  throwsCode(() => shadowIdentity({
    eventKind: 'pull_request', headSha: candidateSha, githubSha: candidateSha,
    baseSha, prHeadSha, identities: CURRENT,
    generationGate: { candidateSha, status: 'blocked-portability', identities: CURRENT },
    prImpact: { ...baseImpact, prHeadSha: '8'.repeat(40) },
  }), 'S1A_PR_HEAD_MISMATCH');
  const reviewRequired = shadowIdentity({
    eventKind: 'pull_request', headSha: candidateSha, githubSha: candidateSha,
    baseSha, prHeadSha, identities: CURRENT,
    generationGate: { candidateSha, status: 'pass', identities: CURRENT },
    prImpact: { ...baseImpact, trusted: false, selfChange: true },
  });
  eq(reviewRequired.eligible, false);
  eq(reviewRequired.shadowOutcome, 'control-plane-review-required');
  eq(reviewRequired.impactContext.trustedControlPlaneReview, true);
  eq(reviewRequired.impactContext.automaticClassificationTrusted, false);
  throwsCode(() => shadowIdentity({
    eventKind: 'pull_request', headSha: candidateSha, githubSha: candidateSha,
    baseSha, prHeadSha, identities: CURRENT,
    generationGate: { candidateSha, status: 'pass', identities: CURRENT },
    prImpact: { ...baseImpact, trusted: false, selfChange: false },
  }), 'S1A_PR_TRUST_STATE_INVALID');
  throwsCode(() => shadowIdentity({
    eventKind: 'pull_request', headSha: candidateSha, githubSha: candidateSha,
    baseSha, prHeadSha, identities: CURRENT,
    generationGate: { candidateSha, status: 'pass', identities: CURRENT },
    prImpact: { ...baseImpact, trusted: true, selfChange: true },
  }), 'S1A_PR_TRUST_STATE_INVALID');
  throwsCode(() => shadowIdentity({
    eventKind: 'pull_request', headSha: candidateSha, githubSha: candidateSha,
    baseSha, prHeadSha, identities: CURRENT,
    generationGate: { candidateSha, status: 'blocked-portability', identities: CURRENT },
    prImpact: null,
  }), 'S1A_PR_IMPACT_MISSING');

  // Push must not invent PR provenance.
  throwsCode(() => shadowIdentity({
    eventKind: 'push', headSha: head, githubSha: head, baseSha, identities: CURRENT,
    generationGate: { candidateSha: head, status: 'blocked-portability', identities: CURRENT },
  }), 'S1A_PUSH_PR_CONTEXT_FORBIDDEN');

  // Policy/side-effect surface remains absent.
  for (const result of [current, blocked, prResult]) {
    const json = JSON.stringify(result);
    for (const forbidden of ['releaseReadiness', 'approvedForRelease', 'receiptId', 'artifactSha256', 'releaseId', 'deploymentId', 'tagName']) {
      check(!Object.prototype.hasOwnProperty.call(result, forbidden), `shadow result must not expose ${forbidden}`);
    }
    check(!json.includes('oauth'), 'shadow result must not contain OAuth material');
    check(!json.includes('signedUrl'), 'shadow result must not contain signed URL material');
  }

  // Delivery jobs remain explicit PR-head checkout while permanent S1-A uses a
  // separate exact github.sha synthetic-merge/push workspace.
  const workflow = git('show', `HEAD:.github/workflows/repository-integrity.yml`);
  check(workflow.includes("ref: ${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}"), 'delivery workflow must keep literal PR-head checkout');
  check(workflow.includes('p1-231-shadow-identity'), 'permanent S1-A job must be installed');
  check(workflow.includes('ref: ${{ github.sha }}'), 'permanent S1-A must use exact github.sha candidate');
  check(workflow.includes('release_shadow_identity.js'), 'permanent S1-A must invoke production shadow library');
  check(!workflow.includes('p1-231-shadow-settlement'), 'S1-B must remain inactive');

  // Stable framing sanity for bounded diagnostic output; this is not a new release fingerprint.
  const diagnostic = JSON.stringify({ schema: current.schema, candidateSha: current.candidateSha, eligible: current.eligible, shadowOutcome: current.shadowOutcome });
  const diagnosticSha = crypto.createHash('sha256').update(diagnostic).digest('hex');
  check(/^[0-9a-f]{64}$/.test(diagnosticSha), 'diagnostic hash sanity');
  check(!Object.prototype.hasOwnProperty.call(current, 'shadowFingerprint'), 'no aggregate shadow fingerprint may be introduced');

  console.log(
    `P1-231 S1-A shadow identity source-spec model: PASS; cases=${cases}; schema=${SCHEMA}; ` +
    `current_shadow=eligible; current_eligible=true; control_plane_review=report-only-ineligible; structural_errors=fail-closed; ` +
    `delivery_checkout=pr-head; pr_candidate=github-sha; shadow_workspace=synthetic-merge; synthetic_merge_required=true; s0f_owner=true; policy_mutation=false; ` +
    `receipt_mutation=false; product_zip=false; permanent_workflow_active=true; rpf=${CURRENT.rpf}; head=${head}`
  );
})();
