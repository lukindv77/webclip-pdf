'use strict';

// P1-231 S0-F passive candidate-generation admission.
// Composes exact candidate package/source-generation/contract/identity authorities.
// It does not interpret release evidence, build artifacts, mutate readiness, or authorize release.

const packageAuthority = require('./release_package_authority.js');
const sourceGeneration = require('./release_source_generation_authority.js');
const contractAuthority = require('./release_contract_authority.js');
const identity = require('./release_identity.js');

const RESULT_SCHEMA = 'webclip-candidate-generation-result/v1';

function fail(code, detail) {
  const error = new Error(String(detail || code).slice(0, 240));
  error.code = code;
  throw error;
}

function normalizeIdentityResult(value, candidate) {
  if (
    !value
    || value.schema !== 'webclip-release-identities/v1'
    || value.candidate_sha !== candidate
    || value.protocol !== identity.PROTOCOL
    || value.policy_mutation !== false
    || value.receipt_interpretation !== false
    || value.artifact_build !== false
    || value.release_authorized !== false
  ) {
    fail('IDENTITY_COMPUTATION_FAILED');
  }
  for (const field of ['rpf', 'rcf', 'bcf']) {
    if (!/^sha256:[0-9a-f]{64}$/.test(String(value[field] || ''))) {
      fail('IDENTITY_COMPUTATION_FAILED', field);
    }
  }
  if (
    !value.qcf
    || !/^sha256:[0-9a-f]{64}$/.test(String(value.qcf['unpacked-chrome'] || ''))
    || !/^sha256:[0-9a-f]{64}$/.test(String(value.qcf['yandex-e2e'] || ''))
  ) {
    fail('IDENTITY_COMPUTATION_FAILED', 'qcf');
  }
  return value;
}

function validateGeneratorBinding(sourceManifestValue, contractManifestValue) {
  const sourceManifest = sourceGeneration.validateAuthority(sourceManifestValue);
  const contractManifest = contractAuthority.validateAuthority(contractManifestValue);
  const roots = new Set(contractManifest.full_rcf.blob_inputs);

  for (const relation of sourceManifest.relations) {
    if (!roots.has(relation.generator)) {
      fail('SOURCE_GENERATION_GENERATOR_NOT_RCF_BOUND', relation.generator);
    }
  }

  return Object.freeze({
    bound: true,
    generators: Object.freeze(sourceManifest.relations.map((relation) => relation.generator))
  });
}

function summarizeGeneration(verification) {
  if (
    !verification
    || verification.schema !== 'webclip-source-generation-verification/v1'
    || verification.all_relations_pass !== true
    || verification.policy_mutation !== false
    || verification.artifact_build !== false
    || verification.release_authorized !== false
  ) {
    fail('SOURCE_GENERATION_ADMISSION_FAILED');
  }

  return Object.freeze(verification.relations.map((relation) => Object.freeze({
    id: relation.id,
    runtime_profile: relation.runtime_profile,
    generator: relation.generator.path,
    generator_sha256: relation.generator.sha256,
    inputs: Object.freeze(relation.inputs.map((item) => Object.freeze({
      path: item.path,
      sha256: item.sha256
    }))),
    outputs: Object.freeze(relation.outputs.map((item) => Object.freeze({
      path: item.path,
      committed_sha256: item.committed_sha256,
      generated_sha256: item.generated_sha256,
      exact_match: item.exact_match === true
    })))
  })));
}

function admitCandidate(candidateSha, options = {}) {
  const candidate = packageAuthority.normalizeCandidateSha(candidateSha);
  const packageManifest = options.packageManifest || packageAuthority.readCanonicalManifest();
  const sourceManifest = options.sourceManifest || sourceGeneration.readCanonicalManifest();
  const contractManifest = options.contractManifest || contractAuthority.readCanonicalManifest();

  // Explicitly validate S0-A before generation/identity consumption.
  const packageResolved = packageAuthority.resolvePackage(
    candidate,
    packageManifest,
    options.packageOptions || {}
  );
  if (packageResolved.candidate_sha !== candidate) fail('CANDIDATE_RESULT_SHA_MISMATCH');

  const binding = validateGeneratorBinding(sourceManifest, contractManifest);

  const verification = sourceGeneration.verifySourceGeneration(
    candidate,
    sourceManifest,
    {
      ...(options.sourceOptions || {}),
      packageTopology: packageManifest
    }
  );
  if (verification.candidate_sha !== candidate) fail('CANDIDATE_RESULT_SHA_MISMATCH');

  let identities;
  try {
    identities = (options.identityComputer || identity.computeIdentities)(
      candidate,
      {
        ...(options.identityOptions || {}),
        packageManifest,
        contractManifest
      }
    );
  } catch (error) {
    if (error && error.code) throw error;
    fail('IDENTITY_COMPUTATION_FAILED');
  }
  identities = normalizeIdentityResult(identities, candidate);

  const generation = summarizeGeneration(verification);
  if (generation.some((relation) => relation.outputs.some((output) => output.exact_match !== true))) {
    fail('SOURCE_GENERATION_ADMISSION_FAILED');
  }

  return Object.freeze({
    schema: RESULT_SCHEMA,
    candidate_sha: candidate,
    generation_state: 'pass',
    package_files: packageResolved.members.length,
    source_generation_schema: sourceManifest.schema,
    generator_rcf_binding: binding.bound ? 'bound' : 'unbound',
    relations: generation,
    identities: Object.freeze({
      rpf: identities.rpf,
      qcf: Object.freeze({
        'unpacked-chrome': identities.qcf['unpacked-chrome'],
        'yandex-e2e': identities.qcf['yandex-e2e']
      }),
      rcf: identities.rcf,
      bcf: identities.bcf
    }),
    policy_mutation: false,
    receipt_interpretation: false,
    evidence_settlement: false,
    artifact_build: false,
    release_authorized: false
  });
}

function consumeExact(result, expectedSha) {
  const expected = packageAuthority.normalizeCandidateSha(expectedSha);
  if (
    !result
    || result.schema !== RESULT_SCHEMA
    || result.generation_state !== 'pass'
    || result.generator_rcf_binding !== 'bound'
    || result.release_authorized !== false
    || result.evidence_settlement !== false
  ) {
    fail('CANDIDATE_RESULT_INVALID');
  }
  if (result.candidate_sha !== expected) fail('CANDIDATE_RESULT_SHA_MISMATCH');
  return true;
}

function parseArgs(argv) {
  const out = { candidate: '', help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') { out.help = true; continue; }
    if (arg === '--candidate') {
      if (out.candidate) fail('CANDIDATE_ARGUMENT_INVALID');
      out.candidate = String(argv[++index] || '');
      continue;
    }
    fail('CANDIDATE_ARGUMENT_INVALID', arg);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write('node project_tools/release_candidate_generation.js --candidate <exact-40-hex-commit>\n');
    return;
  }
  if (!args.candidate) fail('CANDIDATE_SHA_REQUIRED');
  process.stdout.write(JSON.stringify(admitCandidate(args.candidate), null, 2) + '\n');
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    process.stderr.write(String(error && error.code || 'CANDIDATE_GENERATION_FAILED') + ': ' +
      String(error && error.message || 'failed').slice(0, 240) + '\n');
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({
  RESULT_SCHEMA,
  normalizeIdentityResult,
  validateGeneratorBinding,
  summarizeGeneration,
  admitCandidate,
  consumeExact,
  parseArgs
});
