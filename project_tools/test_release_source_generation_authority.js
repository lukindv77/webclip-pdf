'use strict';

// P1-231 S0-B deterministic production witness.
// Exercises the canonical source-generation manifest/authority without activating
// release policy or requiring the generic Repository Integrity Python to impersonate
// the separate cpython-3.12.10-v1 execution profile.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const authority = require('./release_source_generation_authority.js');
const packageAuthority = require('./release_package_authority.js');

const ROOT = path.resolve(__dirname, '..');
let checks = 0;

function ok(value, message) { assert.ok(value, message); checks += 1; }
function eq(actual, expected, message) { assert.equal(actual, expected, message); checks += 1; }
function deep(actual, expected, message) { assert.deepStrictEqual(actual, expected, message); checks += 1; }
function throwsCode(fn, code, message) {
  assert.throws(fn, (error) => error && error.code === code, message || code);
  checks += 1;
}
function git(cwd, args, options) {
  const opts = options || {};
  return execFileSync('git', args, {
    cwd: cwd,
    encoding: opts.encoding === null ? null : (opts.encoding || 'utf8'),
    maxBuffer: 64 * 1024 * 1024
  });
}
function currentHead() { return git(ROOT, ['rev-parse', 'HEAD']).trim(); }
function canonicalObject(value) { return Buffer.from(JSON.stringify(value), 'utf8'); }

const manifest = authority.readCanonicalManifest();
eq(manifest.schema, 'webclip-source-generation/v1', 'canonical schema');
eq(manifest.relations.length, 1, 'one bootstrap relation');
const relation = manifest.relations[0];
eq(relation.id, 'public-suffix-js', 'relation id');
eq(relation.runtime_profile, 'cpython-3.12.10-v1', 'runtime profile');
eq(relation.generator, 'project_tools/build_public_suffix_js.py', 'generator path');
deep([...relation.inputs], ['public_suffix_list.dat'], 'exact inputs');
deep([...relation.outputs], ['public-suffix.js'], 'exact outputs');
ok(packageAuthority.readCanonicalManifest().files.includes('public-suffix.js'), 'generated output is package member');
ok(!packageAuthority.readCanonicalManifest().files.includes('project_tools/build_public_suffix_js.py'), 'generator is not package member');

const topology = authority.semanticTopology(manifest);
ok(/^[0-9a-f]{64}$/.test(topology), 'topology digest shape');
const reordered = {
  schema: manifest.schema,
  relations: [{
    outputs: ['public-suffix.js'],
    inputs: ['public_suffix_list.dat'],
    generator: 'project_tools/build_public_suffix_js.py',
    runtime_profile: 'cpython-3.12.10-v1',
    id: 'public-suffix-js'
  }]
};
eq(authority.semanticTopology(reordered), topology, 'JSON key order does not change topology');

throwsCode(() => authority.parseManifestBytes(Buffer.alloc(0)), 'SOURCE_GENERATION_MANIFEST_JSON_INVALID');
throwsCode(() => authority.parseManifestBytes(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), canonicalObject(reordered)])), 'SOURCE_GENERATION_MANIFEST_BOM_FORBIDDEN');
throwsCode(() => authority.parseManifestBytes(Buffer.from([0xc3, 0x28])), 'SOURCE_GENERATION_MANIFEST_UTF8_INVALID');
throwsCode(() => authority.parseManifestBytes(Buffer.from('{"schema":"webclip-source-generation/v1","schema":"x","relations":[]}')), 'SOURCE_GENERATION_MANIFEST_DUPLICATE_KEY');
throwsCode(() => authority.parseManifestBytes(canonicalObject({ ...reordered, extra: true })), 'SOURCE_GENERATION_MANIFEST_UNKNOWN_FIELD');
throwsCode(() => authority.parseManifestBytes(canonicalObject({ ...reordered, schema: 'webclip-source-generation/v2' })), 'SOURCE_GENERATION_SCHEMA_UNSUPPORTED');
throwsCode(() => authority.parseManifestBytes(canonicalObject({ schema: authority.SCHEMA, relations: [] })), 'SOURCE_GENERATION_MANIFEST_SHAPE_INVALID');

const badProfile = structuredClone(reordered);
badProfile.relations[0].runtime_profile = 'python-any';
throwsCode(() => authority.parseManifestBytes(canonicalObject(badProfile)), 'SOURCE_GENERATION_RUNTIME_PROFILE_UNSUPPORTED');

const badId = structuredClone(reordered);
badId.relations[0].id = '../x';
throwsCode(() => authority.parseManifestBytes(canonicalObject(badId)), 'SOURCE_GENERATION_RELATION_INVALID');

const dupId = structuredClone(reordered);
dupId.relations.push(structuredClone(dupId.relations[0]));
throwsCode(() => authority.parseManifestBytes(canonicalObject(dupId)), 'SOURCE_GENERATION_RELATION_DUPLICATE');

const ownerConflict = structuredClone(reordered);
ownerConflict.relations.push({
  id: 'second',
  runtime_profile: authority.RUNTIME_PROFILE,
  generator: 'project_tools/second.py',
  inputs: ['second.dat'],
  outputs: ['public-suffix.js']
});
throwsCode(() => authority.parseManifestBytes(canonicalObject(ownerConflict)), 'SOURCE_GENERATION_OUTPUT_OWNER_CONFLICT');

const pathCollision = structuredClone(reordered);
pathCollision.relations[0].inputs = ['Input.dat', 'input.dat'];
throwsCode(() => authority.parseManifestBytes(canonicalObject(pathCollision)), 'SOURCE_GENERATION_RELATION_INVALID');

const overlap = structuredClone(reordered);
overlap.relations[0].inputs = ['public-suffix.js'];
throwsCode(() => authority.parseManifestBytes(canonicalObject(overlap)), 'SOURCE_GENERATION_RELATION_INVALID');

const head = currentHead();
const resolved = authority.resolveGeneration(head, manifest);
eq(resolved.candidate_sha, head, 'exact candidate sha');
eq(resolved.relations.length, 1, 'one resolved relation');
eq(resolved.relations[0].generator.path, relation.generator, 'resolved generator');
eq(resolved.relations[0].inputs[0].path, relation.inputs[0], 'resolved input');
eq(resolved.relations[0].outputs[0].path, relation.outputs[0], 'resolved output');
eq(resolved.relations[0].outputs[0].sha256, '72aea4d8a8505ad90d9070bca539dff7d49391f034d0dd41f76d64867efc0b26', 'committed output sha256');

const exactExecutor = (resolvedRelation) => ({
  generated: new Map(resolvedRelation.outputs.map((item) => [item.path, Buffer.from(item.bytes)])),
  stdout_sha256: '0'.repeat(64),
  stderr_sha256: '1'.repeat(64)
});
const pass = authority.verifySourceGeneration(head, manifest, { executor: exactExecutor });
eq(pass.schema, 'webclip-source-generation-verification/v1', 'verification schema');
eq(pass.candidate_sha, head, 'verification candidate');
eq(pass.all_relations_pass, true, 'all relations pass');
eq(pass.relations[0].outputs[0].exact_match, true, 'exact output match');
eq(pass.policy_mutation, false, 'no policy mutation');
eq(pass.artifact_build, false, 'no artifact build');
eq(pass.release_authorized, false, 'no release authorization');

throwsCode(() => authority.verifySourceGeneration(head, manifest, {
  executor: (resolvedRelation) => ({
    generated: new Map([[resolvedRelation.outputs[0].path, Buffer.concat([resolvedRelation.outputs[0].bytes, Buffer.from([0])])]])
  })
}), 'STALE_GENERATED_OUTPUT');

throwsCode(() => authority.verifySourceGeneration(head, manifest, {
  executor: (resolvedRelation) => ({
    generated: new Map([
      [resolvedRelation.outputs[0].path, Buffer.from(resolvedRelation.outputs[0].bytes)],
      ['extra.js', Buffer.from('x')]
    ])
  })
}), 'SOURCE_GENERATION_OUTPUT_EXTRA');

throwsCode(() => authority.verifySourceGeneration(head, manifest, {
  executor: () => ({ generated: new Map() })
}), 'SOURCE_GENERATION_OUTPUT_MISSING');

throwsCode(() => authority.defaultExecutor(resolved.relations[0], { pythonExecutable: process.execPath }), 'SOURCE_GENERATION_RUNTIME_PROFILE_MISMATCH');

const packageWithoutOutput = {
  schema: packageAuthority.SCHEMA,
  path_profile: packageAuthority.PATH_PROFILE,
  files: packageAuthority.readCanonicalManifest().files.filter((item) => item !== 'public-suffix.js')
};
throwsCode(() => authority.resolveGeneration(head, manifest, { packageTopology: packageWithoutOutput }), 'SOURCE_GENERATION_OUTPUT_NOT_PACKAGE_MEMBER');

const originalWorkingOutput = fs.readFileSync(path.join(ROOT, 'public-suffix.js'));
const tempWorking = path.join(ROOT, 'public-suffix.js.webclip-s0b-test-tmp');
try {
  fs.renameSync(path.join(ROOT, 'public-suffix.js'), tempWorking);
  fs.writeFileSync(path.join(ROOT, 'public-suffix.js'), Buffer.from('working-tree-not-authority'));
  const dirtyResolved = authority.resolveGeneration(head, manifest);
  eq(dirtyResolved.relations[0].outputs[0].sha256, resolved.relations[0].outputs[0].sha256, 'dirty working tree cannot change exact Git output authority');
} finally {
  try { fs.unlinkSync(path.join(ROOT, 'public-suffix.js')); } catch (_) {}
  fs.renameSync(tempWorking, path.join(ROOT, 'public-suffix.js'));
}
eq(fs.readFileSync(path.join(ROOT, 'public-suffix.js')).equals(originalWorkingOutput), true, 'working output restored');

const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'webclip-s0b-authority-'));
try {
  git(tempRepo, ['init', '-q']);
  git(tempRepo, ['config', 'user.email', 'webclip@example.invalid']);
  git(tempRepo, ['config', 'user.name', 'WebClip Test']);
  fs.mkdirSync(path.join(tempRepo, 'project_tools'), { recursive: true });
  fs.writeFileSync(path.join(tempRepo, 'project_tools', 'build_public_suffix_js.py'), 'print("x")\n');
  fs.writeFileSync(path.join(tempRepo, 'public_suffix_list.dat'), 'x\n');
  fs.writeFileSync(path.join(tempRepo, 'public-suffix.js'), 'x\n');
  git(tempRepo, ['add', '--all']);
  git(tempRepo, ['commit', '-q', '-m', 'fixture']);
  const fixtureSha = git(tempRepo, ['rev-parse', 'HEAD']).trim();
  const fixturePackage = {
    schema: packageAuthority.SCHEMA,
    path_profile: packageAuthority.PATH_PROFILE,
    files: ['manifest.json', 'public-suffix.js']
  };
  throwsCode(() => authority.resolveGeneration(fixtureSha, manifest, {
    repoRoot: tempRepo,
    packageTopology: fixturePackage
  }), 'SOURCE_GENERATION_MEMBER_MISSING');

  fs.writeFileSync(path.join(tempRepo, 'project_tools', 'build_public_suffix_js.py'), 'print("x")\n');
  git(tempRepo, ['add', '--all']);
  git(tempRepo, ['update-index', '--chmod=+x', 'project_tools/build_public_suffix_js.py']);
  git(tempRepo, ['commit', '-q', '-m', 'executable generator']);
  const executableSha = git(tempRepo, ['rev-parse', 'HEAD']).trim();
  throwsCode(() => authority.resolveGeneration(executableSha, manifest, {
    repoRoot: tempRepo,
    packageTopology: fixturePackage
  }), 'SOURCE_GENERATION_MEMBER_MODE_INVALID');
} finally {
  fs.rmSync(tempRepo, { recursive: true, force: true });
}

const physical = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_P1_231_S0B_PSL_PORTABILITY_REPROOF_2026-09-21_EVIDENCE.md'), 'utf8');
const runtimeProfile = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_P1_231_PSL_RUNTIME_PROFILE_RECONCILIATION_2026-09-21_EVIDENCE.md'), 'utf8');
ok(physical.includes('35566109810') && physical.includes('72aea4d8a8505ad90d9070bca539dff7d49391f034d0dd41f76d64867efc0b26'), 'canonical Linux/Windows physical proof retained');
ok(runtimeProfile.includes('cpython-3.12.10-v1') && runtimeProfile.includes('35577180521'), 'runtime-profile reconciliation retained');

console.log(
  'P1-231 S0-B passive source-generation authority: PASS; checks=' + checks +
  '; relations=' + manifest.relations.length +
  '; runtime_profile=' + authority.RUNTIME_PROFILE +
  '; topology_sha256=' + topology +
  '; output_sha256=' + resolved.relations[0].outputs[0].sha256 +
  '; exact_git=true; isolated_executor_contract=true; policy_mutation=false; release_authorized=false'
);
