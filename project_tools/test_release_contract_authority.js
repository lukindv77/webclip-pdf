'use strict';

// P1-231 S0-C deterministic production witness.
// Verifies the canonical release-contract manifest, exact-Git full-RCF inputs,
// and current QCF/full-RCF values without interpreting receipts or release status.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const authority = require('./release_contract_authority.js');

const ROOT = path.resolve(__dirname, '..');
let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }
function eq(actual, expected, message) { assert.equal(actual, expected, message); checks += 1; }
function throwsCode(fn, code, message) {
  assert.throws(fn, (error) => error && error.code === code, message || code);
  checks += 1;
}
function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
}
function clone(value) { return structuredClone(value); }

const manifest = authority.readCanonicalManifest();
eq(manifest.schema, 'webclip-release-contract-inputs/v1', 'canonical schema');
eq(manifest.fingerprint_profile, 'webclip-contract-fingerprint-v1', 'fingerprint profile');
eq(manifest.full_rcf.blob_inputs.length, 11, 'full RCF input count');
eq(manifest.projections['unpacked-chrome'].cases.length, 4, 'Chrome case count');
eq(manifest.projections['yandex-e2e'].cases.length, 4, 'Yandex case count');

const chromeQcf = authority.qcf('unpacked-chrome', manifest);
const yandexQcf = authority.qcf('yandex-e2e', manifest);
eq(chromeQcf, 'sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c', 'current Chrome QCF');
eq(yandexQcf, 'sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1', 'current Yandex QCF');
ok(chromeQcf !== yandexQcf, 'QCFs remain independent');

throwsCode(() => authority.parseManifestBytes(Buffer.alloc(0)), 'RELEASE_CONTRACT_MANIFEST_JSON_INVALID');
throwsCode(() => authority.parseManifestBytes(Buffer.concat([Buffer.from([0xef,0xbb,0xbf]), fs.readFileSync(authority.MANIFEST_PATH)])), 'RELEASE_CONTRACT_MANIFEST_BOM_FORBIDDEN');
throwsCode(() => authority.parseManifestBytes(Buffer.from([0xc3,0x28])), 'RELEASE_CONTRACT_MANIFEST_UTF8_INVALID');
throwsCode(() => authority.parseManifestBytes(Buffer.from('{"schema":"webclip-release-contract-inputs/v1","schema":"x"}')), 'RELEASE_CONTRACT_MANIFEST_DUPLICATE_KEY');

const unknown = clone(manifest);
unknown.command = 'run-tests';
throwsCode(() => authority.validateAuthority(unknown), 'RELEASE_CONTRACT_MANIFEST_SHAPE_INVALID');

const wrongSchema = clone(manifest);
wrongSchema.schema = 'webclip-release-contract-inputs/v2';
throwsCode(() => authority.validateAuthority(wrongSchema), 'RELEASE_CONTRACT_SCHEMA_UNSUPPORTED');

const missingProjection = clone(manifest);
delete missingProjection.projections['yandex-e2e'];
throwsCode(() => authority.validateAuthority(missingProjection), 'RELEASE_CONTRACT_PROJECTION_SET_INVALID');

const wrongSubject = clone(manifest);
wrongSubject.projections['yandex-e2e'].subject = 'mock-provider';
throwsCode(() => authority.validateAuthority(wrongSubject), 'RELEASE_CONTRACT_PROJECTION_INVALID');

const wrongDomain = clone(manifest);
wrongDomain.projections['unpacked-chrome'].cases[0].id = 'yandex.wrong';
throwsCode(() => authority.validateAuthority(wrongDomain), 'RELEASE_CONTRACT_CASE_INVALID');

const duplicatePolicy = clone(manifest);
duplicatePolicy.projections['unpacked-chrome'].environment_policy.push('REAL-UNPACKED-MV3');
throwsCode(() => authority.validateAuthority(duplicatePolicy), 'RELEASE_CONTRACT_CASE_INVALID');

for (const forbidden of [
  'project_docs/RELEASE_READINESS.md',
  'project_docs/TEST_STATUS.md',
  'project_docs/TEST_EVIDENCE.md',
  'project_docs/release_evidence/receipts/r1.json',
  'project_docs/release_evidence/summaries/r1.md'
]) {
  const value = clone(manifest);
  value.full_rcf.blob_inputs = [forbidden];
  throwsCode(() => authority.validateAuthority(value), 'RELEASE_CONTRACT_MUTABLE_EVIDENCE_INPUT_FORBIDDEN', forbidden);
}

const chromeChanged = clone(manifest);
chromeChanged.projections['unpacked-chrome'].cases[0].assertions.push('synthetic-new-release-assertion');
const chromeAuthority = authority.validateAuthority(chromeChanged);
ok(authority.qcf('unpacked-chrome', chromeAuthority) !== chromeQcf, 'Chrome semantic change changes Chrome QCF');
eq(authority.qcf('yandex-e2e', chromeAuthority), yandexQcf, 'Chrome semantic change leaves Yandex QCF');

const yandexChanged = clone(manifest);
yandexChanged.projections['yandex-e2e'].cases[0].assertions.push('synthetic-new-provider-assertion');
const yandexAuthority = authority.validateAuthority(yandexChanged);
eq(authority.qcf('unpacked-chrome', yandexAuthority), chromeQcf, 'Yandex semantic change leaves Chrome QCF');
ok(authority.qcf('yandex-e2e', yandexAuthority) !== yandexQcf, 'Yandex semantic change changes Yandex QCF');

const reordered = clone(manifest);
reordered.full_rcf.blob_inputs.reverse();
reordered.projections['unpacked-chrome'].environment_policy.reverse();
reordered.projections['unpacked-chrome'].cases.reverse();
for (const item of reordered.projections['unpacked-chrome'].cases) item.assertions.reverse();
reordered.projections['yandex-e2e'].environment_policy.reverse();
reordered.projections['yandex-e2e'].cases.reverse();
for (const item of reordered.projections['yandex-e2e'].cases) item.assertions.reverse();
const normalizedReordered = authority.validateAuthority(reordered);
eq(authority.qcf('unpacked-chrome', normalizedReordered), chromeQcf, 'Chrome representation order invariant');
eq(authority.qcf('yandex-e2e', normalizedReordered), yandexQcf, 'Yandex representation order invariant');

const head = git(ROOT, ['rev-parse', 'HEAD']);
const resolved = authority.resolveCandidate(head, manifest);
eq(resolved.candidate_sha, head, 'exact candidate sha');
eq(resolved.inputs.length, 11, 'resolved input count');
for (const input of resolved.inputs) {
  ok(/^[0-9a-f]{40}$/.test(input.git_oid), input.path + ' exact Git oid');
  ok(/^[0-9a-f]{64}$/.test(input.sha256), input.path + ' sha256');
  ok(Buffer.isBuffer(input.bytes), input.path + ' exact bytes');
}
const fullRcf = authority.fullRcfFromResolved(resolved);
eq(fullRcf, 'sha256:cb34076d37c8dbe99392fac120fb21b03d192e4b53bc7a40650b5cd277311ffb', 'current full RCF');

const fps = authority.fingerprints(head, manifest);
eq(fps.chrome_qcf, chromeQcf, 'fingerprint Chrome QCF');
eq(fps.yandex_qcf, yandexQcf, 'fingerprint Yandex QCF');
eq(fps.full_rcf, fullRcf, 'fingerprint full RCF');
eq(fps.policy_mutation, false, 'no policy mutation');
eq(fps.receipt_interpretation, false, 'no receipt interpretation');
eq(fps.release_authorized, false, 'no release authorization');

const statusBefore = fs.readFileSync(path.join(ROOT, 'project_docs', 'TEST_STATUS.md'));
const statusAfter = Buffer.concat([statusBefore, Buffer.from('\nsynthetic receipt status\n')]);
ok(!statusBefore.equals(statusAfter), 'status mutation fixture differs');
eq(authority.qcf('unpacked-chrome', manifest), chromeQcf, 'status not Chrome QCF input');
eq(authority.qcf('yandex-e2e', manifest), yandexQcf, 'status not Yandex QCF input');
eq(authority.fullRcfFromResolved(resolved), fullRcf, 'status not full-RCF input');

const dirtyPath = path.join(ROOT, 'project_docs', 'USER_REQUIREMENTS.md');
const original = fs.readFileSync(dirtyPath);
try {
  fs.writeFileSync(dirtyPath, Buffer.concat([original, Buffer.from('\nworking-tree-not-authority\n')]));
  const dirtyResolved = authority.resolveCandidate(head, manifest);
  eq(authority.fullRcfFromResolved(dirtyResolved), fullRcf, 'dirty working tree cannot change exact Git RCF');
} finally {
  fs.writeFileSync(dirtyPath, original);
}
eq(fs.readFileSync(dirtyPath).equals(original), true, 'working-tree authority root restored');

const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'webclip-s0c-authority-'));
try {
  git(tempRepo, ['init', '-q']);
  git(tempRepo, ['config', 'user.email', 'webclip@example.invalid']);
  git(tempRepo, ['config', 'user.name', 'WebClip Test']);
  fs.writeFileSync(path.join(tempRepo, 'a.txt'), 'a\n');
  git(tempRepo, ['add', '--all']);
  git(tempRepo, ['commit', '-q', '-m', 'fixture']);
  const fixtureSha = git(tempRepo, ['rev-parse', 'HEAD']);

  const missing = clone(manifest);
  missing.full_rcf.blob_inputs = ['missing.txt'];
  throwsCode(() => authority.resolveCandidate(fixtureSha, missing, { repoRoot: tempRepo }), 'RELEASE_CONTRACT_INPUT_MISSING');

  fs.mkdirSync(path.join(tempRepo, 'dir'));
  git(tempRepo, ['add', 'dir']);
  const badMode = clone(manifest);
  badMode.full_rcf.blob_inputs = ['dir'];
  throwsCode(() => authority.resolveCandidate(fixtureSha, badMode, { repoRoot: tempRepo }), 'RELEASE_CONTRACT_INPUT_MISSING');
} finally {
  fs.rmSync(tempRepo, { recursive: true, force: true });
}

throwsCode(() => authority.resolveCandidate('main', manifest), 'RELEASE_CONTRACT_CANDIDATE_SHA_INVALID');
throwsCode(() => authority.qcf('other', manifest), 'RELEASE_CONTRACT_PROJECTION_INVALID');

console.log(
  'P1-231 S0-C passive release-contract authority: PASS; checks=' + checks +
  '; full_inputs=' + manifest.full_rcf.blob_inputs.length +
  '; chrome_cases=' + manifest.projections['unpacked-chrome'].cases.length +
  '; yandex_cases=' + manifest.projections['yandex-e2e'].cases.length +
  '; chrome_qcf=' + chromeQcf +
  '; yandex_qcf=' + yandexQcf +
  '; full_rcf=' + fullRcf +
  '; exact_git=true; receipt_interpretation=false; release_authorized=false'
);
