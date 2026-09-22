'use strict';

// P1-231 S1-A passive shadow identity.
// Composes S0-E identity, S0-F candidate admission and S0-I PR impact for one
// exact shadow candidate. It is read-only and intentionally not a release gate.

const path = require('node:path');
const { execFileSync } = require('node:child_process');
const packageAuthority = require('./release_package_authority.js');
const identity = require('./release_identity.js');
const candidateGeneration = require('./release_candidate_generation.js');
const prImpactAuthority = require('./release_pr_impact.js');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA = 'webclip-shadow-identity/v1';
const EVENT_PUSH = 'push';
const EVENT_PR = 'pull_request';

function fail(code, detail) {
  const error = new Error(String(detail || code).slice(0, 240));
  error.code = code;
  throw error;
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
    wrapped.code = 'S1A_GIT_FAILED';
    wrapped.cause = error;
    throw wrapped;
  }
}

function requireExactCheckout(repoRoot, candidateSha) {
  const candidate = packageAuthority.normalizeCandidateSha(candidateSha);
  let head;
  try { head = String(git(repoRoot, ['rev-parse', 'HEAD'])).trim(); }
  catch (_) { fail('S1A_GIT_FAILED'); }
  if (head !== candidate) fail('S1A_CHECKOUT_SHA_MISMATCH');
  return candidate;
}

function normalizeIdentityTuple(value, candidate) {
  if (
    !value
    || value.schema !== 'webclip-release-identities/v1'
    || value.protocol !== identity.PROTOCOL
    || value.candidate_sha !== candidate
    || value.policy_mutation !== false
    || value.receipt_interpretation !== false
    || value.artifact_build !== false
    || value.release_authorized !== false
  ) {
    fail('S1A_IDENTITY_INVALID');
  }

  const tuple = {
    rpf: value.rpf,
    chromeQcf: value.qcf && value.qcf['unpacked-chrome'],
    yandexQcf: value.qcf && value.qcf['yandex-e2e'],
    rcf: value.rcf,
    bcf: value.bcf
  };
  for (const [key, fingerprint] of Object.entries(tuple)) {
    if (!/^sha256:[0-9a-f]{64}$/.test(String(fingerprint || ''))) {
      fail('S1A_IDENTITY_INVALID', key);
    }
  }
  return Object.freeze(tuple);
}

function normalizeGenerationGate(value, candidate) {
  if (
    !value
    || value.schema !== candidateGeneration.RESULT_SCHEMA
    || value.candidate_sha !== candidate
    || value.generation_state !== 'pass'
    || value.generator_rcf_binding !== 'bound'
    || value.policy_mutation !== false
    || value.receipt_interpretation !== false
    || value.evidence_settlement !== false
    || value.artifact_build !== false
    || value.release_authorized !== false
  ) {
    fail('S1A_GENERATION_GATE_INVALID');
  }

  if (!value.identities || typeof value.identities !== 'object') {
    fail('S1A_GENERATION_GATE_INVALID');
  }
  const tuple = {
    rpf: value.identities.rpf,
    chromeQcf: value.identities.qcf && value.identities.qcf['unpacked-chrome'],
    yandexQcf: value.identities.qcf && value.identities.qcf['yandex-e2e'],
    rcf: value.identities.rcf,
    bcf: value.identities.bcf
  };
  for (const [key, fingerprint] of Object.entries(tuple)) {
    if (!/^sha256:[0-9a-f]{64}$/.test(String(fingerprint || ''))) {
      fail('S1A_GENERATION_GATE_INVALID', key);
    }
  }
  return Object.freeze(tuple);
}

function assertTupleEqual(left, right) {
  for (const key of ['rpf', 'chromeQcf', 'yandexQcf', 'rcf', 'bcf']) {
    if (left[key] !== right[key]) fail('S1A_GATE_IDENTITY_MISMATCH', key);
  }
}

function normalizePrImpact(value, baseSha, prHeadSha, candidateSha) {
  if (
    !value
    || value.schema !== prImpactAuthority.SCHEMA
    || !value.provenance
    || value.provenance.baseSha !== baseSha
    || value.provenance.prHeadSha !== prHeadSha
    || value.provenance.candidateSha !== candidateSha
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
    packageMember: value.touched.packageMember === true,
    generationClosure: value.touched.generationClosure === true,
    packageTopologyChanged: value.authority.packageTopologyChanged === true,
    sourceGenerationTopologyChanged: value.authority.sourceGenerationTopologyChanged === true,
    candidateGenerationVerification: value.requires.candidateGenerationVerification === true,
    shadowIdentityRecompute: value.requires.shadowIdentityRecompute === true,
    trustedControlPlaneReview: false,
    automaticClassificationTrusted: true
  });
}

function evaluateShadow(input, options = {}) {
  if (!input || typeof input !== 'object') fail('S1A_INPUT_INVALID');
  const repoRoot = path.resolve(options.repoRoot || ROOT);
  const eventKind = String(input.eventKind || '');
  if (eventKind !== EVENT_PUSH && eventKind !== EVENT_PR) fail('S1A_EVENT_UNSUPPORTED');

  const candidate = requireExactCheckout(repoRoot, input.candidateSha);
  const identityComputer = options.identityComputer || identity.computeIdentities;
  const generationComputer = options.generationComputer || candidateGeneration.admitCandidate;
  const prImpactComputer = options.prImpactComputer || prImpactAuthority.classifyPrImpact;

  let identities;
  try {
    identities = identityComputer(candidate, {
      ...(options.identityOptions || {}),
      packageOptions: {
        ...(options.identityOptions && options.identityOptions.packageOptions || {}),
        repoRoot
      },
      contractOptions: {
        ...(options.identityOptions && options.identityOptions.contractOptions || {}),
        repoRoot
      }
    });
  } catch (error) {
    if (error && error.code) throw error;
    fail('S1A_IDENTITY_COMPUTATION_FAILED');
  }
  const identityTuple = normalizeIdentityTuple(identities, candidate);

  let gate;
  try {
    gate = generationComputer(candidate, {
      ...(options.generationOptions || {}),
      packageOptions: {
        ...(options.generationOptions && options.generationOptions.packageOptions || {}),
        repoRoot
      },
      sourceOptions: {
        ...(options.generationOptions && options.generationOptions.sourceOptions || {}),
        repoRoot
      },
      identityOptions: {
        ...(options.generationOptions && options.generationOptions.identityOptions || {}),
        packageOptions: {
          ...(options.generationOptions
            && options.generationOptions.identityOptions
            && options.generationOptions.identityOptions.packageOptions || {}),
          repoRoot
        },
        contractOptions: {
          ...(options.generationOptions
            && options.generationOptions.identityOptions
            && options.generationOptions.identityOptions.contractOptions || {}),
          repoRoot
        }
      }
    });
  } catch (error) {
    if (error && error.code) throw error;
    fail('S1A_GENERATION_COMPUTATION_FAILED');
  }
  const gateTuple = normalizeGenerationGate(gate, candidate);
  assertTupleEqual(identityTuple, gateTuple);

  let impactContext;
  if (eventKind === EVENT_PUSH) {
    if (input.baseSha != null || input.prHeadSha != null) fail('S1A_PUSH_PR_CONTEXT_FORBIDDEN');
    impactContext = Object.freeze({
      kind: 'push-main',
      automaticClassificationTrusted: true,
      trustedControlPlaneReview: false
    });
  } else {
    const baseSha = prImpactAuthority.validateSha(input.baseSha);
    const prHeadSha = prImpactAuthority.validateSha(input.prHeadSha);
    if (new Set([baseSha, prHeadSha, candidate]).size !== 3) {
      fail('S1A_PR_PROVENANCE_INVALID');
    }
    let impact;
    try {
      impact = prImpactComputer(baseSha, prHeadSha, candidate, { repoRoot });
    } catch (error) {
      if (error && error.code) throw error;
      fail('S1A_PR_IMPACT_FAILED');
    }
    impactContext = Object.freeze({
      kind: 'pull-request-synthetic-merge',
      baseSha,
      prHeadSha,
      candidateSha: candidate,
      ...normalizePrImpact(impact, baseSha, prHeadSha, candidate)
    });
  }

  return Object.freeze({
    schema: SCHEMA,
    candidate_sha: candidate,
    event_kind: eventKind,
    identity_protocol: identity.PROTOCOL,
    rpf: identityTuple.rpf,
    chrome_qcf: identityTuple.chromeQcf,
    yandex_qcf: identityTuple.yandexQcf,
    rcf: identityTuple.rcf,
    bcf: identityTuple.bcf,
    generation_gate: 'pass',
    eligible: true,
    shadow_outcome: 'eligible',
    impact_context: impactContext,
    policy_mutation: false,
    receipt_mutation: false,
    evidence_settlement: false,
    artifact_build: false,
    release_authorized: false
  });
}

function parseArgs(argv) {
  const out = {
    eventKind: '',
    candidateSha: '',
    baseSha: null,
    prHeadSha: null,
    help: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') { out.help = true; continue; }
    if (arg === '--event') { out.eventKind = String(argv[++index] || ''); continue; }
    if (arg === '--candidate') { out.candidateSha = String(argv[++index] || ''); continue; }
    if (arg === '--base') { out.baseSha = String(argv[++index] || ''); continue; }
    if (arg === '--pr-head') { out.prHeadSha = String(argv[++index] || ''); continue; }
    fail('S1A_ARGUMENT_INVALID', arg);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      'node project_tools/release_shadow_identity.js --event <push|pull_request> ' +
      '--candidate <exact-sha> [--base <exact-sha> --pr-head <exact-sha>]\n'
    );
    return;
  }
  if (!args.eventKind || !args.candidateSha) fail('S1A_ARGUMENT_INVALID');
  if (args.eventKind === EVENT_PR && (!args.baseSha || !args.prHeadSha)) fail('S1A_ARGUMENT_INVALID');
  if (args.eventKind === EVENT_PUSH && (args.baseSha || args.prHeadSha)) fail('S1A_ARGUMENT_INVALID');
  process.stdout.write(JSON.stringify(evaluateShadow(args), null, 2) + '\n');
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    process.stderr.write(String(error && error.code || 'S1A_FAILED') + ': ' +
      String(error && error.message || 'failed').slice(0, 240) + '\n');
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({
  ROOT,
  SCHEMA,
  EVENT_PUSH,
  EVENT_PR,
  requireExactCheckout,
  normalizeIdentityTuple,
  normalizeGenerationGate,
  assertTupleEqual,
  normalizePrImpact,
  evaluateShadow,
  parseArgs
});
