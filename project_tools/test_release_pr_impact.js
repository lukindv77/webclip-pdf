'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const impact = require('./release_pr_impact.js');
const packageAuthority = require('./release_package_authority.js');
const sourceAuthority = require('./release_source_generation_authority.js');

const ROOT = path.resolve(__dirname, '..');
let checks = 0;

function ok(value, message) { assert.ok(value, message); checks += 1; }
function eq(actual, expected, message) { assert.equal(actual, expected, message); checks += 1; }
function deep(actual, expected, message) { assert.deepStrictEqual(actual, expected, message); checks += 1; }
function throwsCode(fn, code, message) {
  assert.throws(fn, (error) => error && error.code === code, message || code);
  checks += 1;
}
function git(cwd, args, options = {}) {
  return execFileSync('git', args, {
    cwd,
    encoding: options.encoding === null ? null : 'utf8',
    input: options.input,
    maxBuffer: 64 * 1024 * 1024
  }).trim();
}
function sha256Digest(hex) { return 'sha256:' + hex; }

const currentPackage = packageAuthority.readCanonicalManifest();
const currentSource = sourceAuthority.readCanonicalManifest();

function packageView(files = currentPackage.files, digest = null) {
  const canonical = [...files].sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
  return {
    schema: packageAuthority.SCHEMA,
    files: canonical,
    topologyDigest: digest || sha256Digest(packageAuthority.topologyDigest({
      schema: packageAuthority.SCHEMA,
      path_profile: packageAuthority.PATH_PROFILE,
      files: canonical
    }))
  };
}

function sourceView(relations = currentSource.relations, digest = null) {
  const authority = {
    schema: sourceAuthority.SCHEMA,
    relations: relations.map((relation) => ({
      id: relation.id,
      runtime_profile: relation.runtime_profile,
      generator: relation.generator,
      inputs: [...relation.inputs],
      outputs: [...relation.outputs]
    }))
  };
  return {
    schema: sourceAuthority.SCHEMA,
    relations: authority.relations,
    topologyDigest: digest || sha256Digest(sourceAuthority.semanticTopology(authority))
  };
}

const BASE = 'a'.repeat(40);
const HEAD = 'b'.repeat(40);
const CANDIDATE = 'c'.repeat(40);

function run(changes, options = {}) {
  return impact.computeImpact({
    baseSha: BASE,
    prHeadSha: HEAD,
    candidateSha: CANDIDATE,
    candidateParents: [BASE, HEAD],
    changes,
    basePackage: options.basePackage || packageView(),
    candidatePackage: options.candidatePackage || packageView(),
    baseGeneration: options.baseGeneration || sourceView(),
    candidateGeneration: options.candidateGeneration || sourceView()
  });
}
function change(status, pathValue) { return { status, path: pathValue }; }

// Canonical predecessor truth comes from S0-A/S0-B, not duplicated production lists.
eq(currentPackage.files.length, 34, 'current package count');
eq(currentSource.relations.length, 1, 'current generation relation count');
eq(currentSource.relations[0].id, 'public-suffix-js', 'current relation id');
ok(currentPackage.files.includes('application-generation.js'), 'current package member present');
ok(currentPackage.files.includes('public-suffix.js'), 'generated output is package member');
ok(!currentPackage.files.includes('public_suffix_list.dat'), 'generation input not package member');

// Exact identity/provenance and normalized diff boundaries.
throwsCode(() => impact.computeImpact({
  baseSha: 'main', prHeadSha: HEAD, candidateSha: CANDIDATE,
  candidateParents: [BASE, HEAD], changes: [],
  basePackage: packageView(), candidatePackage: packageView(),
  baseGeneration: sourceView(), candidateGeneration: sourceView()
}), 'PR_IMPACT_SHA_INVALID');
throwsCode(() => run([change('R', 'content.js')]), 'PR_IMPACT_DIFF_STATUS_UNSUPPORTED');
throwsCode(() => run([change('M', '../content.js')]), 'PR_IMPACT_PATH_INVALID');
throwsCode(() => run([change('M', 'content.js'), change('A', 'content.js')]), 'PR_IMPACT_DUPLICATE_PATH');
throwsCode(
  () => run([], {
    candidateGeneration: {
      schema: sourceAuthority.SCHEMA,
      relations: [],
      topologyDigest: 'sha256:' + '0'.repeat(64)
    }
  }),
  'PR_IMPACT_SOURCE_GENERATION_TOPOLOGY_INVALID',
  'empty S0-B authority view fails closed'
);
throwsCode(
  () => run(Array.from({ length: impact.MAX_CHANGES + 1 }, (_, index) => change('A', 'x' + index + '.js'))),
  'PR_IMPACT_DIFF_FAILED'
);

// Docs-only changes are outside S0-I release package/generation impact.
const docs = run([change('M', 'README.md')]);
eq(docs.touched.packageMember, false, 'docs not package');
eq(docs.touched.generationClosure, false, 'docs not generation closure');
eq(docs.requires.candidateGenerationVerification, false, 'docs do not require S0-F replay');
eq(docs.requires.shadowIdentityRecompute, false, 'docs do not require shadow identity');
eq(docs.trust.automaticClassificationTrusted, true, 'ordinary docs classification trusted');

// Package union blocks removal/addition evasion.
const member = run([change('M', 'content.js')]);
eq(member.touched.packageMember, true, 'current package member touched');
eq(member.requires.candidateGenerationVerification, true, 'package touch requires generation verification');

const candidateWithoutContent = packageView(currentPackage.files.filter((item) => item !== 'content.js'));
const removed = run([change('D', 'content.js')], { candidatePackage: candidateWithoutContent });
eq(removed.authority.packageTopologyChanged, true, 'package removal changes topology');
eq(removed.touched.packageMember, true, 'base union catches removed member');

const candidateWithNew = packageView([...currentPackage.files, 'new-runtime.js']);
const added = run([change('A', 'new-runtime.js')], { candidatePackage: candidateWithNew });
eq(added.authority.packageTopologyChanged, true, 'package addition changes topology');
eq(added.touched.packageMember, true, 'candidate union catches added member');

const nonmember = run([change('M', 'diagnostic.js')]);
eq(nonmember.touched.packageMember, false, 'root JS suffix is not package authority');
eq(nonmember.requires.candidateGenerationVerification, false, 'nonmember suffix cannot force package impact');

// Explicit S0-B relation roles, with no build_* filename inference.
for (const [pathValue, field] of [
  ['public_suffix_list.dat', 'generationInput'],
  ['project_tools/build_public_suffix_js.py', 'generationGenerator'],
  ['public-suffix.js', 'generatedOutput']
]) {
  const result = run([change('M', pathValue)]);
  eq(result.touched[field], true, pathValue + ' role');
  eq(result.touched.generationClosure, true, pathValue + ' closure');
  eq(result.affectedGenerationRelations.length, 1, pathValue + ' relation count');
  eq(result.affectedGenerationRelations[0].relationId, 'public-suffix-js', pathValue + ' relation id');
}
eq(
  run([change('M', 'project_tools/build_recovery_archive.py')]).touched.generationClosure,
  false,
  'unrelated build_* path is not inferred'
);

// Base+candidate generation union catches relation deletion/addition while both S0-B views remain valid.
const second = {
  id: 'second-gen',
  runtime_profile: 'cpython-3.12.10-v1',
  generator: 'project_tools/gen_second.py',
  inputs: ['second.dat'],
  outputs: ['second.js']
};
const relationRemoved = run(
  [change('D', 'project_tools/gen_second.py')],
  {
    baseGeneration: sourceView([...currentSource.relations, second]),
    candidateGeneration: sourceView(currentSource.relations)
  }
);
eq(relationRemoved.authority.sourceGenerationTopologyChanged, true, 'relation removal changes topology');
eq(relationRemoved.touched.generationGenerator, true, 'base union catches removed generator');
ok(
  relationRemoved.affectedGenerationRelations.some((item) =>
    item.relationId === 'second-gen' && item.reasons.includes('relation-removed')),
  'relation removal reason'
);

const relationAdded = run(
  [change('A', 'second.dat')],
  { candidateGeneration: sourceView([...currentSource.relations, second]) }
);
eq(relationAdded.authority.sourceGenerationTopologyChanged, true, 'relation addition changes topology');
eq(relationAdded.touched.generationInput, true, 'candidate union catches new input');
ok(
  relationAdded.affectedGenerationRelations.some((item) =>
    item.relationId === 'second-gen' && item.reasons.includes('relation-added')),
  'relation addition reason'
);

// Raw authority-source touch is distinct from semantic authority change.
const packageFormatting = run([change('M', impact.PACKAGE_AUTHORITY_SOURCE)]);
eq(packageFormatting.touched.packageAuthoritySource, true, 'package authority source touched');
eq(packageFormatting.authority.packageTopologyChanged, false, 'equal package semantics');
eq(packageFormatting.requires.candidateGenerationVerification, false, 'format-only package source does not force S0-F');

const sourceFormatting = run([change('M', impact.SOURCE_AUTHORITY_SOURCE)]);
eq(sourceFormatting.touched.sourceGenerationAuthoritySource, true, 'source authority source touched');
eq(sourceFormatting.authority.sourceGenerationTopologyChanged, false, 'equal generation semantics');
eq(sourceFormatting.requires.candidateGenerationVerification, false, 'format-only source authority does not force S0-F');

// Actual production control-plane filenames fail closed on self-change.
for (const pathValue of impact.AUTHORITY_IMPLEMENTATION) {
  const result = run([change('M', pathValue)]);
  eq(result.touched.authorityImplementation, true, pathValue);
  eq(result.requires.trustedControlPlaneReview, true, pathValue);
  eq(result.trust.automaticClassificationTrusted, false, pathValue);
  eq(result.requires.candidateGenerationVerification, true, pathValue);
}
for (const pathValue of impact.CHECKER_CONTROL_PLANE) {
  const result = run([change('M', pathValue)]);
  eq(result.touched.prCheckerControlPlane, true, pathValue);
  eq(result.requires.trustedControlPlaneReview, true, pathValue);
  eq(result.trust.automaticClassificationTrusted, false, pathValue);
  eq(result.requires.shadowIdentityRecompute, true, pathValue);
}

// S0-I remains a classifier, not identity/admission/release authority.
const serialized = JSON.stringify(member);
for (const forbidden of [
  '"rpf"', '"qcf"', '"rcf"', '"bcf"', '"admitted"', '"generationPass"',
  '"releaseReady"', '"approvedForRelease"', '"officialArtifact"', '"tag"', '"deploymentId"'
]) {
  ok(!serialized.includes(forbidden), 'forbidden authority field ' + forbidden);
}
eq(member.policy_mutation, false, 'no policy mutation');
eq(member.identity_computation, false, 'no identity computation');
eq(member.candidate_generation_verified, false, 'no S0-F claim');
eq(member.release_authorized, false, 'no release authorization');

// Real Git adapter: exact merge parents, exact authority blobs and --no-renames diff.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'webclip-s0i-'));
try {
  git(tmp, ['init', '-q']);
  git(tmp, ['config', 'user.email', 'webclip@example.invalid']);
  git(tmp, ['config', 'user.name', 'WebClip Test']);
  fs.mkdirSync(path.join(tmp, 'project_tools'), { recursive: true });
  fs.mkdirSync(path.join(tmp, '.github', 'workflows'), { recursive: true });
  fs.writeFileSync(
    path.join(tmp, impact.PACKAGE_AUTHORITY_SOURCE),
    fs.readFileSync(path.join(ROOT, impact.PACKAGE_AUTHORITY_SOURCE))
  );
  fs.writeFileSync(
    path.join(tmp, impact.SOURCE_AUTHORITY_SOURCE),
    fs.readFileSync(path.join(ROOT, impact.SOURCE_AUTHORITY_SOURCE))
  );
  fs.writeFileSync(path.join(tmp, 'public_suffix_list.dat'), 'base\n');
  fs.writeFileSync(path.join(tmp, 'README.md'), 'base\n');
  git(tmp, ['add', '--all']);
  git(tmp, ['commit', '-q', '-m', 'base']);
  const base = git(tmp, ['rev-parse', 'HEAD']);

  fs.writeFileSync(path.join(tmp, 'public_suffix_list.dat'), 'head\n');
  git(tmp, ['add', '--all']);
  git(tmp, ['commit', '-q', '-m', 'head']);
  const head = git(tmp, ['rev-parse', 'HEAD']);
  const headTree = git(tmp, ['rev-parse', head + '^{tree}']);
  const candidate = git(tmp, ['commit-tree', headTree, '-p', base, '-p', head], { input: 'merge\n' });

  const exact = impact.classifyPrImpact(base, head, candidate, { repoRoot: tmp });
  eq(exact.provenance.baseSha, base, 'exact adapter base');
  eq(exact.provenance.prHeadSha, head, 'exact adapter head');
  eq(exact.provenance.candidateSha, candidate, 'exact adapter candidate');
  eq(exact.changedPaths.length, 1, 'exact diff count');
  eq(exact.changedPaths[0].status, 'M', 'exact diff status');
  eq(exact.changedPaths[0].path, 'public_suffix_list.dat', 'exact diff path');
  eq(exact.touched.generationInput, true, 'exact adapter generation input');
  eq(exact.trust.automaticClassificationTrusted, true, 'ordinary exact adapter trusted');

  throwsCode(
    () => impact.classifyPrImpact(base, head, head, { repoRoot: tmp }),
    'PR_IMPACT_CANDIDATE_RELATION_INVALID',
    'branch head cannot substitute merge candidate'
  );
  throwsCode(
    () => impact.classifyPrImpact('main', head, candidate, { repoRoot: tmp }),
    'PR_IMPACT_SHA_INVALID',
    'moving base ref rejected'
  );

  // Formatting-only package authority change: raw source touch, equal semantic digest.
  git(tmp, ['checkout', '-q', base]);
  const packagePretty = JSON.stringify({
    files: [...currentPackage.files].reverse(),
    path_profile: currentPackage.path_profile,
    schema: currentPackage.schema
  }, null, 4) + '\n';
  fs.writeFileSync(path.join(tmp, impact.PACKAGE_AUTHORITY_SOURCE), packagePretty);
  git(tmp, ['add', '--all']);
  git(tmp, ['commit', '-q', '-m', 'format package authority']);
  const formatHead = git(tmp, ['rev-parse', 'HEAD']);
  const formatTree = git(tmp, ['rev-parse', formatHead + '^{tree}']);
  const formatCandidate = git(
    tmp,
    ['commit-tree', formatTree, '-p', base, '-p', formatHead],
    { input: 'merge format\n' }
  );
  const formatImpact = impact.classifyPrImpact(base, formatHead, formatCandidate, { repoRoot: tmp });
  eq(formatImpact.touched.packageAuthoritySource, true, 'exact formatting source touch');
  eq(formatImpact.authority.packageTopologyChanged, false, 'exact formatting semantic equality');
  eq(formatImpact.requires.candidateGenerationVerification, false, 'exact formatting no S0-F replay');

  // Self-changing classifier is classified but cannot automatically self-certify.
  git(tmp, ['checkout', '-q', base]);
  fs.writeFileSync(path.join(tmp, 'project_tools', 'release_pr_impact.js'), 'candidate self change\n');
  git(tmp, ['add', '--all']);
  git(tmp, ['commit', '-q', '-m', 'self change']);
  const selfHead = git(tmp, ['rev-parse', 'HEAD']);
  const selfTree = git(tmp, ['rev-parse', selfHead + '^{tree}']);
  const selfCandidate = git(
    tmp,
    ['commit-tree', selfTree, '-p', base, '-p', selfHead],
    { input: 'merge self\n' }
  );
  const selfImpact = impact.classifyPrImpact(base, selfHead, selfCandidate, { repoRoot: tmp });
  eq(selfImpact.touched.prCheckerControlPlane, true, 'exact self-change detected');
  eq(selfImpact.requires.trustedControlPlaneReview, true, 'exact self-change requires review');
  eq(selfImpact.trust.automaticClassificationTrusted, false, 'exact self-change cannot self-certify');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

// Historical source-spec remains predecessor evidence; production checker is not modified here.
const research = fs.readFileSync(
  path.join(ROOT, 'project_tools', 'test_p1_231_s0i_pr_checker_integration_source_spec_model.js'),
  'utf8'
);
ok(research.includes("const SCHEMA = 'webclip-pr-impact/v1'"), 'research schema retained');
ok(research.includes('base_candidate_union=true'), 'research union marker retained');
ok(research.includes('self_change=fail-closed'), 'research self-change marker retained');

const checker = fs.readFileSync(path.join(ROOT, 'project_tools', 'check_pr_change_contract.py'), 'utf8');
const workflow = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'repository-integrity.yml'), 'utf8');
ok(checker.includes('def is_runtime_path('), 'legacy checker remains independently present');
ok(checker.includes('RUNTIME_SUFFIXES'), 'legacy runtime heuristic remains unchanged in bootstrap tranche');
ok(!workflow.includes('release_pr_impact.js'), 'S0-I not permanently invoked yet');

console.log(
  'P1-231 S0-I passive PR impact: PASS; checks=' + checks +
  '; schema=' + impact.SCHEMA +
  '; package_files=' + currentPackage.files.length +
  '; relations=' + currentSource.relations.length +
  '; base_candidate_union=true; synthetic_merge_identity=required; no_renames=true' +
  '; self_change=fail-closed; production_checker_activated=false; release_authorized=false'
);
