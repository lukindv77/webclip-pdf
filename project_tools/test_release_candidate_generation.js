'use strict';

// P1-231 S0-F passive production candidate-admission witness.
// Uses an injected exact-output executor under generic CI; the permanent CPython
// 3.12.10 lane runs the default executor separately.

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const candidateGate = require('./release_candidate_generation.js');
const packageAuthority = require('./release_package_authority.js');
const sourceAuthority = require('./release_source_generation_authority.js');
const contractAuthority = require('./release_contract_authority.js');
const identity = require('./release_identity.js');

const ROOT = path.resolve(__dirname, '..');
const CURRENT = Object.freeze({
  rpf: 'sha256:3ae12e58cb9bd58c05763cb320f01b2dbdac92b5090faf04e1c5c4c723ec1071',
  chrome: 'sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c',
  yandex: 'sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1',
  rcf: 'sha256:8e7fc4af3d14a07580008e64a9e9ca61744c39384db46a3b922bfdc92c8f707c',
  bcf: 'sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff'
});

let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }
function eq(actual, expected, message) { assert.equal(actual, expected, message); checks += 1; }
function throwsCode(fn, code, message) {
  assert.throws(fn, (error) => error && error.code === code, message || code);
  checks += 1;
}
function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}
function exactExecutor(relation) {
  return {
    generated: new Map(relation.outputs.map((item) => [item.path, Buffer.from(item.bytes)])),
    stdout_sha256: '0'.repeat(64),
    stderr_sha256: '0'.repeat(64)
  };
}

const head = git('rev-parse', 'HEAD');
eq(git('cat-file', '-t', head), 'commit', 'exact HEAD commit');

const packageManifest = packageAuthority.readCanonicalManifest();
const sourceManifest = sourceAuthority.readCanonicalManifest();
const contractManifest = contractAuthority.readCanonicalManifest();

eq(packageManifest.files.length, 34, 'package file count');
eq(sourceManifest.relations.length, 1, 'source relation count');
eq(sourceManifest.relations[0].runtime_profile, 'cpython-3.12.10-v1', 'runtime profile');
ok(contractManifest.full_rcf.blob_inputs.includes(sourceManifest.relations[0].generator), 'generator is full-RCF bound');

const binding = candidateGate.validateGeneratorBinding(sourceManifest, contractManifest);
eq(binding.bound, true, 'generator binding');
eq(binding.generators.length, 1, 'bound generator count');
eq(binding.generators[0], 'project_tools/build_public_suffix_js.py', 'bound generator path');

const result = candidateGate.admitCandidate(head, {
  sourceOptions: { executor: exactExecutor }
});
eq(result.schema, 'webclip-candidate-generation-result/v1', 'result schema');
eq(result.candidate_sha, head, 'candidate sha');
eq(result.generation_state, 'pass', 'generation state');
eq(result.package_files, 34, 'package count');
eq(result.generator_rcf_binding, 'bound', 'generator binding state');
eq(result.relations.length, 1, 'relation result count');
eq(result.relations[0].id, 'public-suffix-js', 'relation id');
eq(result.relations[0].runtime_profile, 'cpython-3.12.10-v1', 'relation runtime');
eq(result.relations[0].outputs.length, 1, 'output count');
eq(result.relations[0].outputs[0].exact_match, true, 'output exact match');
eq(result.relations[0].outputs[0].committed_sha256, result.relations[0].outputs[0].generated_sha256, 'output digest equality');

eq(result.identities.rpf, CURRENT.rpf, 'current RPF');
eq(result.identities.qcf['unpacked-chrome'], CURRENT.chrome, 'current Chrome QCF');
eq(result.identities.qcf['yandex-e2e'], CURRENT.yandex, 'current Yandex QCF');
eq(result.identities.rcf, CURRENT.rcf, 'current full RCF');
eq(result.identities.bcf, CURRENT.bcf, 'current BCF');

eq(result.policy_mutation, false, 'no policy mutation');
eq(result.receipt_interpretation, false, 'no receipt interpretation');
eq(result.evidence_settlement, false, 'no evidence settlement');
eq(result.artifact_build, false, 'no artifact build');
eq(result.release_authorized, false, 'no release authorization');
ok(!Object.prototype.hasOwnProperty.call(result, 'candidate_generation_fingerprint'), 'no CGF axis');
ok(!Object.prototype.hasOwnProperty.call(result, 'artifact_sha256'), 'no artifact identity');
ok(!Object.prototype.hasOwnProperty.call(result, 'outcome'), 'not an evidence receipt');
eq(candidateGate.consumeExact(result, head), true, 'exact result consumption');

const unbound = structuredClone(contractManifest);
unbound.full_rcf.blob_inputs = unbound.full_rcf.blob_inputs.filter(
  (item) => item !== sourceManifest.relations[0].generator
);
throwsCode(
  () => candidateGate.validateGeneratorBinding(sourceManifest, unbound),
  'SOURCE_GENERATION_GENERATOR_NOT_RCF_BOUND'
);

throwsCode(
  () => candidateGate.admitCandidate(head, {
    sourceOptions: {
      executor: (relation) => ({
        generated: new Map(relation.outputs.map((item) => [
          item.path,
          Buffer.concat([item.bytes, Buffer.from('\n// stale\n')])
        ]))
      })
    }
  }),
  'STALE_GENERATED_OUTPUT'
);

throwsCode(
  () => candidateGate.admitCandidate(head, {
    contractManifest: unbound,
    sourceOptions: { executor: exactExecutor }
  }),
  'SOURCE_GENERATION_GENERATOR_NOT_RCF_BOUND'
);

throwsCode(
  () => candidateGate.admitCandidate(head, {
    sourceOptions: { executor: exactExecutor },
    identityComputer: () => ({
      schema: 'webclip-release-identities/v1',
      protocol: identity.PROTOCOL,
      candidate_sha: head,
      rpf: CURRENT.rpf,
      qcf: { 'unpacked-chrome': CURRENT.chrome, 'yandex-e2e': CURRENT.yandex },
      rcf: CURRENT.rcf,
      bcf: CURRENT.bcf,
      policy_mutation: false,
      receipt_interpretation: false,
      artifact_build: false,
      release_authorized: true
    })
  }),
  'IDENTITY_COMPUTATION_FAILED'
);

throwsCode(
  () => candidateGate.admitCandidate('HEAD', { sourceOptions: { executor: exactExecutor } }),
  'PACKAGE_CANDIDATE_SHA_INVALID'
);

throwsCode(
  () => candidateGate.consumeExact(result, 'f'.repeat(40)),
  'CANDIDATE_RESULT_SHA_MISMATCH'
);

throwsCode(
  () => candidateGate.consumeExact({ ...result, generation_state: 'blocked' }, head),
  'CANDIDATE_RESULT_INVALID'
);

const sourcePass = sourceAuthority.verifySourceGeneration(head, sourceManifest, {
  executor: exactExecutor,
  packageTopology: packageManifest
});
eq(sourcePass.all_relations_pass, true, 'S0-B exact generation pass');
const identities = identity.computeIdentities(head, {
  packageManifest,
  contractManifest
});
eq(identities.candidate_sha, head, 'S0-E exact candidate');
eq(identities.rpf, result.identities.rpf, 'S0-F consumes S0-E RPF');
eq(identities.rcf, result.identities.rcf, 'S0-F consumes S0-E RCF');

console.log(
  'P1-231 S0-F passive candidate-generation admission: PASS; checks=' + checks +
  '; package_files=' + result.package_files +
  '; relations=' + result.relations.length +
  '; generation_state=' + result.generation_state +
  '; generator_rcf_binding=' + result.generator_rcf_binding +
  '; rpf=' + result.identities.rpf +
  '; rcf=' + result.identities.rcf +
  '; no_cgf=true; receipt_interpretation=false; evidence_settlement=false; artifact_build=false; release_authorized=false'
);
