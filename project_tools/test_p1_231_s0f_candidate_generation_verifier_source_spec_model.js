'use strict';

// Research-only deterministic model for P1-231 S0-F candidate-generation verifier.
// It does not fix the current PSL generator, create production release authority,
// build a WebClip ZIP, or activate release policy.

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const packageAuthority = require('./release_package_authority.js');

const ROOT = path.resolve(__dirname, '..');
const S0E_MODEL = path.join(ROOT, 'project_tools', 'test_p1_231_s0e_identity_engine_source_spec_model.js');
const PROFILE = 'cpython-3.12.10-v1';
const RESULT_SCHEMA = 'webclip-candidate-generation-result/v1';

const PACKAGE_TOPOLOGY = packageAuthority.readCanonicalManifest();
const PACKAGE_FILES = Object.freeze([...PACKAGE_TOPOLOGY.files]);
const LEGACY_RPF = 'sha256:f709eb4c399a2bc5a88ac0d1c9963a24b393e7616156f090fd06ca1dfa18ec9e';

const CURRENT_RELATION = Object.freeze({
  id: 'public-suffix-js',
  runtime_profile: PROFILE,
  generator: 'project_tools/build_public_suffix_js.py',
  inputs: Object.freeze(['public_suffix_list.dat']),
  outputs: Object.freeze(['public-suffix.js']),
});

const EXPECTED_CONTRACT_IDENTITIES = Object.freeze({
  chromeQcf: 'sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c',
  yandexQcf: 'sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1',
  rcf: 'sha256:8a1e77fdd342393afaf9067952b9ea52b7860a4ffa5caae3fec2fc1a9f4f2f3a',
  bcf: 'sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff',
});

let cases = 0;
function check(value, message) { cases += 1; assert(value, message); }
function eq(actual, expected, message) { cases += 1; assert.strictEqual(actual, expected, message); }
function deepEq(actual, expected, message) { cases += 1; assert.deepStrictEqual(actual, expected, message); }
function fail(code, detail) { const e = new Error(detail || code); e.code = code; throw e; }
function throwsCode(fn, code, message) {
  cases += 1;
  assert.throws(fn, (e) => e && e.code === code, message || `expected ${code}`);
}
function gitText(...args) { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim(); }
function gitBytes(...args) { return execFileSync('git', args, { cwd: ROOT, encoding: null }); }
function sha256(buf) { return `sha256:${crypto.createHash('sha256').update(buf).digest('hex')}`; }
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; }
function u64(n) { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(n)); return b; }

function gitEntry(commit, rel) {
  const raw = execFileSync('git', ['ls-tree', commit, '--', rel], { cwd: ROOT, encoding: 'utf8' }).trim();
  if (!raw) return null;
  const tab = raw.indexOf('\t');
  const [mode, type, oid] = raw.slice(0, tab).split(/\s+/);
  return { mode, type, oid, path: raw.slice(tab + 1) };
}

function exactBlob(commit, rel) {
  const e = gitEntry(commit, rel);
  if (!e) fail('EXACT_BLOB_MISSING', rel);
  if (e.type !== 'blob' || e.mode !== '100644') fail('EXACT_BLOB_NOT_REGULAR', rel);
  return gitBytes('show', `${commit}:${rel}`);
}

function parseS0EOutput() {
  const line = execFileSync(process.execPath, [S0E_MODEL], { cwd: ROOT, encoding: 'utf8' }).trim().split(/\r?\n/).pop();
  function token(name, pattern) {
    const m = line.match(new RegExp(`(?:^|;\\s*)${name}=${pattern}(?=;|$)`));
    if (!m) fail('IDENTITY_COMPUTATION_FAILED', `${name} missing`);
    return m[1];
  }
  function pick(name) {
    return token(name, '(sha256:[0-9a-f]{64})');
  }
  function text(name) {
    return token(name, '([^;]+)').trim();
  }
  return {
    line,
    protocol: text('protocol'),
    packageFiles: Number(text('package_files')),
    legacyPackageFiles: Number(text('legacy_package_files')),
    legacyRpf: pick('legacy_rpf'),
    currentPackageComplete: text('current_package_complete') === 'true',
    rpf: pick('rpf'),
    chromeQcf: pick('chrome_qcf'),
    yandexQcf: pick('yandex_qcf'),
    rcf: pick('rcf'),
    bcf: pick('bcf'),
  };
}

function minimalWorkspaceRun({ generatorBytes, inputBytes }) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'webclip-s0f-'));
  try {
    const toolDir = path.join(tmp, 'project_tools');
    fs.mkdirSync(toolDir, { recursive: true });
    fs.writeFileSync(path.join(toolDir, 'build_public_suffix_js.py'), generatorBytes);
    fs.writeFileSync(path.join(tmp, 'public_suffix_list.dat'), inputBytes);
    check(!fs.existsSync(path.join(tmp, 'public-suffix.js')), 'output must not be pre-seeded');
    check(!fs.existsSync(path.join(tmp, 'service-worker.js')), 'unrelated candidate files must not be materialized');

    const python = process.platform === 'win32' ? 'python' : 'python3';
    let stdout = '';
    try {
      stdout = execFileSync(python, [path.join(toolDir, 'build_public_suffix_js.py')], {
        cwd: tmp,
        encoding: 'utf8',
        timeout: 30_000,
        env: { PATH: process.env.PATH || '' },
      });
    } catch (e) {
      fail('SOURCE_GENERATION_EXECUTION_FAILED', e.message);
    }
    const outPath = path.join(tmp, 'public-suffix.js');
    if (!fs.existsSync(outPath)) fail('SOURCE_GENERATION_MISSING_OUTPUT');
    const generated = fs.readFileSync(outPath);
    const top = fs.readdirSync(tmp).sort();
    const undeclared = top.filter((x) => !['project_tools', 'public_suffix_list.dat', 'public-suffix.js'].includes(x));
    if (undeclared.length) fail('SOURCE_GENERATION_UNDECLARED_OUTPUT', undeclared.join(','));
    return { generated, stdout, top };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function verifyRelation({
  candidateSha,
  relation = CURRENT_RELATION,
  regeneratedOutputs,
  portabilityReady,
  extraOutputs = [],
}) {
  if (relation.runtime_profile !== PROFILE) fail('SOURCE_GENERATION_PROFILE_UNSUPPORTED');
  if (extraOutputs.length) fail('SOURCE_GENERATION_UNDECLARED_OUTPUT');

  const generator = exactBlob(candidateSha, relation.generator);
  const inputs = relation.inputs.map((p) => ({ path: p, bytes: exactBlob(candidateSha, p) }));
  const outputs = relation.outputs.map((p) => {
    if (!PACKAGE_FILES.includes(p)) fail('SOURCE_GENERATION_ADMISSION_FAILED', `${p} not package`);
    return { path: p, candidate: exactBlob(candidateSha, p) };
  });

  if (!portabilityReady) fail('SOURCE_GENERATION_PORTABILITY_UNPROVEN');
  if (!(regeneratedOutputs instanceof Map)) fail('SOURCE_GENERATION_EXECUTION_FAILED');

  const resultOutputs = [];
  for (const output of outputs) {
    const regenerated = regeneratedOutputs.get(output.path);
    if (!Buffer.isBuffer(regenerated)) fail('SOURCE_GENERATION_MISSING_OUTPUT', output.path);
    if (!regenerated.equals(output.candidate)) fail('STALE_GENERATED_OUTPUT', output.path);
    resultOutputs.push(Object.freeze({
      path: output.path,
      bytes: output.candidate.length,
      candidateSha256: sha256(output.candidate),
      regeneratedSha256: sha256(regenerated),
    }));
  }
  return Object.freeze({
    id: relation.id,
    state: 'match',
    generatorSha256: sha256(generator),
    inputSha256: Object.freeze(inputs.map((x) => Object.freeze({ path: x.path, sha256: sha256(x.bytes) }))),
    outputs: Object.freeze(resultOutputs),
  });
}

function admitCandidate({ candidateSha, portabilityReady, generatorRcfBound, regeneratedOutputs, identities }) {
  if (typeof candidateSha !== 'string' || !/^[0-9a-f]{40}$/.test(candidateSha)) fail('CANDIDATE_SHA_INVALID');
  let type = '';
  try { type = gitText('cat-file', '-t', candidateSha); } catch { fail('CANDIDATE_NOT_COMMIT'); }
  if (type !== 'commit') fail('CANDIDATE_NOT_COMMIT');

  for (const rel of PACKAGE_FILES) exactBlob(candidateSha, rel);
  const relationResult = verifyRelation({ candidateSha, regeneratedOutputs, portabilityReady });
  if (!generatorRcfBound) fail('SOURCE_GENERATION_GENERATOR_NOT_RCF_BOUND');
  const requiredIdentityFields = ['rpf', 'chromeQcf', 'yandexQcf', 'rcf', 'bcf'];
  if (!identities || requiredIdentityFields.some((key) => !/^sha256:[0-9a-f]{64}$/.test(identities[key] || ''))) {
    fail('IDENTITY_COMPUTATION_FAILED');
  }
  return Object.freeze({
    schema: RESULT_SCHEMA,
    candidateSha,
    generationState: 'pass',
    relations: Object.freeze([relationResult]),
    identities: Object.freeze({
      rpf: identities.rpf,
      qcf: Object.freeze({ 'unpacked-chrome': identities.chromeQcf, 'yandex-e2e': identities.yandexQcf }),
      rcf: identities.rcf,
      bcf: identities.bcf,
    }),
  });
}

function consumeExact(result, expectedSha) {
  if (!result || result.schema !== RESULT_SCHEMA || result.generationState !== 'pass') fail('CANDIDATE_RESULT_INVALID');
  if (result.candidateSha !== expectedSha) fail('CANDIDATE_RESULT_SHA_MISMATCH');
  return true;
}

// Diagnostic old-style package hash used only to demonstrate why RPF-like hashing is insufficient.
function diagnosticPackageHash(overrides = new Map()) {
  const h = crypto.createHash('sha256');
  h.update(Buffer.from('S0F_DIAGNOSTIC_PACKAGE_BYTES_V1\0'));
  for (const rel of [...PACKAGE_FILES].sort((a, b) => Buffer.from(a).compare(Buffer.from(b)))) {
    const bytes = overrides.has(rel) ? overrides.get(rel) : fs.readFileSync(path.join(ROOT, rel));
    const p = Buffer.from(rel, 'utf8'); h.update(u32(p.length)); h.update(p); h.update(u64(bytes.length)); h.update(bytes);
  }
  return `sha256:${h.digest('hex')}`;
}

(function main() {
  const head = gitText('rev-parse', 'HEAD');
  eq(gitText('cat-file', '-t', head), 'commit', 'HEAD must be exact commit');
  check(/^[0-9a-f]{40}$/.test(head), 'HEAD sha shape');
  eq(PACKAGE_TOPOLOGY.schema, packageAuthority.SCHEMA, 'S0-A package schema');
  eq(PACKAGE_TOPOLOGY.path_profile, packageAuthority.PATH_PROFILE, 'S0-A path profile');
  eq(PACKAGE_FILES.length, 34, 'S0-A package count');
  eq(new Set(PACKAGE_FILES).size, 34, 'package paths unique');
  check(PACKAGE_FILES.includes('application-generation.js'), 'application-generation is current package member');
  check(PACKAGE_FILES.includes('public-suffix.js'), 'generated output remains package member');
  check(!PACKAGE_FILES.includes('public_suffix_list.dat'), 'generation input remains outside package');
  check(!PACKAGE_FILES.includes('project_tools/build_public_suffix_js.py'), 'generator remains outside package');

  // Exact Git-object census: package + generation roots.
  const resolvedPackage = packageAuthority.resolvePackage(head, PACKAGE_TOPOLOGY);
  eq(resolvedPackage.candidate_sha, head, 'S0-A resolved candidate');
  eq(resolvedPackage.members.length, PACKAGE_FILES.length, 'S0-A resolved package count');
  for (const member of resolvedPackage.members) {
    const e = gitEntry(head, member.path);
    check(Boolean(e), `missing package blob ${member.path}`);
    eq(e.type, 'blob', `${member.path} git type`);
    eq(e.mode, '100644', `${member.path} git mode`);
    eq(e.oid, member.git_oid, `${member.path} S0-A oid`);
    eq(sha256(exactBlob(head, member.path)), `sha256:${member.sha256}`, `${member.path} S0-A bytes`);
  }
  for (const rel of [CURRENT_RELATION.generator, ...CURRENT_RELATION.inputs, ...CURRENT_RELATION.outputs]) {
    const e = gitEntry(head, rel);
    check(Boolean(e), `missing generation blob ${rel}`);
    eq(e.type, 'blob', `${rel} generation git type`);
    eq(e.mode, '100644', `${rel} generation git mode`);
  }

  eq(CURRENT_RELATION.id, 'public-suffix-js');
  eq(CURRENT_RELATION.runtime_profile, PROFILE);
  deepEq(CURRENT_RELATION.inputs, ['public_suffix_list.dat']);
  deepEq(CURRENT_RELATION.outputs, ['public-suffix.js']);

  // Corrected exact generation roots are now physically portable; governance binding remains the current blocker.
  const s0b = fs.readFileSync(path.join(ROOT, 'project_tools', 'test_p1_231_s0b_source_generation_authority_source_spec_model.js'), 'utf8');
  const s0bStrict = fs.readFileSync(path.join(ROOT, 'project_tools', 'test_p1_231_s0b_strict_parser_composition_refinement_model.js'), 'utf8');
  check(s0b.includes('current_psl_windows_portable=true'), 'S0-B portability PASS marker');
  check(s0bStrict.includes('SOURCE_GENERATION_CHAIN_FORBIDDEN'), 'S0-B chain prohibition marker');
  check(s0bStrict.includes('current_psl_windows_portable=true'), 'strict refinement retains portability PASS');
  const generatorSource = exactBlob(head, CURRENT_RELATION.generator).toString('utf8');
  check(!generatorSource.includes("OUT.write_text(code, encoding='utf-8')"), 'text-mode generator must remain retired');
  check(!generatorSource.includes("newline='\\n'"), 'binary output must not depend on text newline policy');
  check(generatorSource.includes("OUT.write_bytes(code.encode('utf-8'))"), 'current generator must emit exact UTF-8 bytes');

  // Linux/current-runner positive control uses only exact candidate generator+input blobs.
  const generatorBytes = exactBlob(head, CURRENT_RELATION.generator);
  const inputBytes = exactBlob(head, CURRENT_RELATION.inputs[0]);
  const candidateOutput = exactBlob(head, CURRENT_RELATION.outputs[0]);
  const run = minimalWorkspaceRun({ generatorBytes, inputBytes });
  check(run.generated.equals(candidateOutput), 'current runner regeneration must match exact candidate output');
  eq(sha256(run.generated), sha256(candidateOutput), 'regenerated/candidate digest');
  deepEq(run.top, ['project_tools', 'public-suffix.js', 'public_suffix_list.dat'], 'minimal workspace top-level set');

  // The corrected exact roots now satisfy the cross-platform prerequisite; current-runner regeneration must therefore admit.
  const currentRelation = verifyRelation({
    candidateSha: head,
    portabilityReady: true,
    regeneratedOutputs: new Map([['public-suffix.js', run.generated]]),
  });
  eq(currentRelation.state, 'match', 'current portable relation state');

  // S0-E composition: use the predecessor model as the identity owner rather than redefining it here.
  const identities = parseS0EOutput();
  eq(identities.protocol, 'WEBCLIP_RELEASE_IDENTITY_V1', 'S0-E protocol');
  eq(identities.packageFiles, PACKAGE_FILES.length, 'S0-E current package count agrees with S0-A');
  eq(identities.legacyPackageFiles, 33, 'S0-E retains explicit legacy package count');
  eq(identities.legacyRpf, LEGACY_RPF, 'S0-E legacy RPF control');
  eq(identities.currentPackageComplete, true, 'S0-E current package identity is complete');
  check(/^sha256:[0-9a-f]{64}$/.test(identities.rpf), 'current RPF shape');
  check(identities.rpf !== identities.legacyRpf, 'current RPF differs from legacy incomplete RPF');
  eq(identities.chromeQcf, EXPECTED_CONTRACT_IDENTITIES.chromeQcf, 'current Chrome QCF');
  eq(identities.yandexQcf, EXPECTED_CONTRACT_IDENTITIES.yandexQcf, 'current Yandex QCF');
  eq(identities.rcf, EXPECTED_CONTRACT_IDENTITIES.rcf, 'current full RCF');
  eq(identities.bcf, EXPECTED_CONTRACT_IDENTITIES.bcf, 'current BCF');

  // Generator/full-RCF binding is current authority. Keep the old fail-closed path as a regression control.
  throwsCode(() => admitCandidate({
    candidateSha: head,
    portabilityReady: true,
    generatorRcfBound: false,
    regeneratedOutputs: new Map([['public-suffix.js', run.generated]]),
    identities,
  }), 'SOURCE_GENERATION_GENERATOR_NOT_RCF_BOUND', 'missing generator RCF binding must fail closed');

  // Current exact candidate is admitted after portable regeneration plus current generator/full-RCF binding.
  const admitted = admitCandidate({
    candidateSha: head,
    portabilityReady: true,
    generatorRcfBound: true,
    regeneratedOutputs: new Map([['public-suffix.js', run.generated]]),
    identities,
  });
  eq(admitted.schema, RESULT_SCHEMA);
  eq(admitted.candidateSha, head);
  eq(admitted.generationState, 'pass');
  eq(admitted.relations.length, 1);
  eq(admitted.relations[0].id, 'public-suffix-js');
  eq(admitted.relations[0].state, 'match');
  eq(admitted.relations[0].outputs.length, 1);
  eq(admitted.relations[0].outputs[0].path, 'public-suffix.js');
  eq(admitted.relations[0].outputs[0].candidateSha256, admitted.relations[0].outputs[0].regeneratedSha256);
  eq(admitted.identities.rpf, identities.rpf);
  eq(admitted.identities.qcf['unpacked-chrome'], EXPECTED_CONTRACT_IDENTITIES.chromeQcf);
  eq(admitted.identities.qcf['yandex-e2e'], EXPECTED_CONTRACT_IDENTITIES.yandexQcf);
  eq(admitted.identities.rcf, EXPECTED_CONTRACT_IDENTITIES.rcf);
  eq(admitted.identities.bcf, EXPECTED_CONTRACT_IDENTITIES.bcf);
  check(!Object.prototype.hasOwnProperty.call(admitted, 'candidateGenerationFingerprint'), 'no CGF axis');
  check(!Object.prototype.hasOwnProperty.call(admitted, 'artifactSha256'), 'ZIP digest is not S0-F identity');
  check(!Object.prototype.hasOwnProperty.call(admitted, 'outcome'), 'S0-F result is not S0-G evidence receipt');

  // Stale generated bytes: a package hash/RPF-like identity is still computable, but admission must fail.
  const staleCandidateOutput = Buffer.concat([candidateOutput, Buffer.from('\n// synthetic stale tracked output\n')]);
  check(diagnosticPackageHash(new Map([['public-suffix.js', staleCandidateOutput]])) !== diagnosticPackageHash(), 'stale package still has deterministic hash');
  throwsCode(() => verifyRelation({
    candidateSha: head,
    portabilityReady: true,
    regeneratedOutputs: new Map([['public-suffix.js', staleCandidateOutput]]),
  }), 'STALE_GENERATED_OUTPUT');

  // Semantically effective source change while committed generated output remains old -> fail.
  const changedInput = Buffer.concat([inputBytes, Buffer.from('\nsynthetic-invalid-example.test\n')]);
  const sourceChangedRun = minimalWorkspaceRun({ generatorBytes, inputBytes: changedInput });
  check(!sourceChangedRun.generated.equals(candidateOutput), 'changed source must regenerate different output');
  throwsCode(() => verifyRelation({
    candidateSha: head,
    portabilityReady: true,
    regeneratedOutputs: new Map([['public-suffix.js', sourceChangedRun.generated]]),
  }), 'STALE_GENERATED_OUTPUT');

  // Generator changed while candidate generated output remains old -> fail.
  const changedGeneratorText = generatorBytes.toString('utf8').replace('WebClip bundled Public Suffix List resolver.', 'WebClip changed Public Suffix List resolver.');
  check(changedGeneratorText !== generatorBytes.toString('utf8'), 'generator mutation fixture');
  const generatorChangedRun = minimalWorkspaceRun({ generatorBytes: Buffer.from(changedGeneratorText), inputBytes });
  check(!generatorChangedRun.generated.equals(candidateOutput), 'changed generator must regenerate different output');
  throwsCode(() => verifyRelation({
    candidateSha: head,
    portabilityReady: true,
    regeneratedOutputs: new Map([['public-suffix.js', generatorChangedRun.generated]]),
  }), 'STALE_GENERATED_OUTPUT');

  // CRLF is physically different; verifier-side normalization would hide a defect and is forbidden.
  const crlf = Buffer.from(run.generated.toString('utf8').replace(/\n/g, '\r\n'), 'utf8');
  check(!crlf.equals(candidateOutput), 'CRLF output must differ from canonical candidate bytes');
  check(Buffer.from(crlf.toString('utf8').replace(/\r\n/g, '\n')).equals(candidateOutput), 'normalization would mask the mismatch');
  throwsCode(() => verifyRelation({
    candidateSha: head,
    portabilityReady: true,
    regeneratedOutputs: new Map([['public-suffix.js', crlf]]),
  }), 'STALE_GENERATED_OUTPUT');

  // Profile/output admission failures.
  throwsCode(() => verifyRelation({
    candidateSha: head,
    relation: { ...CURRENT_RELATION, runtime_profile: 'python-any' },
    portabilityReady: true,
    regeneratedOutputs: new Map([['public-suffix.js', run.generated]]),
  }), 'SOURCE_GENERATION_PROFILE_UNSUPPORTED');
  throwsCode(() => verifyRelation({
    candidateSha: head,
    portabilityReady: true,
    regeneratedOutputs: new Map(),
  }), 'SOURCE_GENERATION_MISSING_OUTPUT');
  throwsCode(() => verifyRelation({
    candidateSha: head,
    portabilityReady: true,
    regeneratedOutputs: new Map([['public-suffix.js', run.generated]]),
    extraOutputs: ['undeclared.tmp'],
  }), 'SOURCE_GENERATION_UNDECLARED_OUTPUT');
  throwsCode(() => verifyRelation({
    candidateSha: head,
    relation: { ...CURRENT_RELATION, outputs: ['not-a-package.js'] },
    portabilityReady: true,
    regeneratedOutputs: new Map([['not-a-package.js', Buffer.from('x')]]),
  }), 'SOURCE_GENERATION_ADMISSION_FAILED');

  // Candidate identity boundary.
  throwsCode(() => admitCandidate({ candidateSha: 'HEAD', portabilityReady: true, generatorRcfBound: true, regeneratedOutputs: new Map(), identities }), 'CANDIDATE_SHA_INVALID');
  throwsCode(() => admitCandidate({ candidateSha: '0'.repeat(40), portabilityReady: true, generatorRcfBound: true, regeneratedOutputs: new Map(), identities }), 'CANDIDATE_NOT_COMMIT');
  throwsCode(() => admitCandidate({ candidateSha: head, portabilityReady: true, generatorRcfBound: true, regeneratedOutputs: new Map([['public-suffix.js', run.generated]]), identities: null }), 'IDENTITY_COMPUTATION_FAILED');
  eq(consumeExact(admitted, head), true, 'exact candidate result consumption');
  throwsCode(() => consumeExact(admitted, 'f'.repeat(40)), 'CANDIDATE_RESULT_SHA_MISMATCH');
  throwsCode(() => consumeExact({ ...admitted, generationState: 'blocked' }, head), 'CANDIDATE_RESULT_INVALID');

  // A docs-only commit could share RPF, but exact candidate SHA must remain distinct pipeline authority.
  const sameRpfOtherSha = 'f'.repeat(40);
  eq(admitted.identities.rpf, identities.rpf, 'RPF fixture follows S0-E current identity');
  check(admitted.candidateSha !== sameRpfOtherSha, 'candidate SHA axis stays explicit even for hypothetical same RPF');
  throwsCode(() => consumeExact(admitted, sameRpfOtherSha), 'CANDIDATE_RESULT_SHA_MISMATCH');

  // DAG/source boundaries remain canonical.
  const dag = fs.readFileSync(path.join(ROOT, 'project_tools', 'test_p1_231_consolidated_implementation_dag_model.js'), 'utf8');
  check(dag.includes("['S0-F-generation-gate', { stage: 'S0', deps: ['S0-A-package-authority', 'S0-B-source-generation', 'S0-E-identity-engine'], owner: 'candidate-generation-verifier'"), 'canonical S0-F DAG dependency drift');
  check(dag.includes("['S0-G-evidence-settlement', { stage: 'S0', deps: ['S0-E-identity-engine', 'S0-F-generation-gate']"), 'S0-G must depend on S0-F');
  check(dag.includes("['S0-H-passive-builder', { stage: 'S0', deps: ['S0-A-package-authority', 'S0-D-builder-contract', 'S0-E-identity-engine', 'S0-F-generation-gate']"), 'S0-H must depend on S0-F');

  const s0fSpec = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_P1_231_S0F_CANDIDATE_GENERATION_VERIFIER_SOURCE_SPEC_2026-09-10_EVIDENCE.md'), 'utf8');
  for (const marker of [
    'computed identity != admitted release-candidate identity',
    'SOURCE_GENERATION_PORTABILITY_UNPROVEN',
    'STALE_GENERATED_OUTPUT',
    'introduces **no new candidate fingerprint axis**',
    'S0-C must be revisited as part of the implementation package',
  ]) check(s0fSpec.includes(marker), `S0-F source-spec marker missing: ${marker}`);

  console.log(`P1-231 S0-F candidate-generation verifier source-spec model: PASS; cases=${cases}; package_files=${PACKAGE_FILES.length}; relations=1; linux_regen=match; current_gate=pass; current_blocker=none; portability=pass; generator_rcf_binding=bound; admitted_after_binding=${admitted.generationState}; rpf=${admitted.identities.rpf}; rcf=${admitted.identities.rcf}; no_cgf=true; head=${head}`);
})();