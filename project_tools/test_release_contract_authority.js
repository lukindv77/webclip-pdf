'use strict';

// P1-231 S0-C deterministic production witness.
// S0-C owns canonical projection/root inputs only. This test independently applies
// the already-canonical S0-E WEBCLIP_RELEASE_IDENTITY_V1 framing to prove that
// those inputs reproduce the current QCF/full-RCF identities.

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const authority = require('./release_contract_authority.js');

const ROOT = path.resolve(__dirname, '..');
const PROTOCOL = 'WEBCLIP_RELEASE_IDENTITY_V1';
const TAG_TEXT = 0x01;
const TAG_BYTES = 0x02;
const TAG_UINT64 = 0x03;
const TAG_LIST = 0x04;
const TAG_RECORD = 0x05;
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
function u32(value) { const out = Buffer.alloc(4); out.writeUInt32BE(value); return out; }
function u64(value) { const out = Buffer.alloc(8); out.writeBigUInt64BE(BigInt(value)); return out; }
function tagged(tag, ...parts) { return Buffer.concat([Buffer.from([tag]), ...parts]); }
function encodeText(value) {
  if (typeof value !== 'string') throw new Error('IDENTITY_TEXT_REQUIRED');
  const bytes = Buffer.from(value, 'utf8');
  return tagged(TAG_TEXT, u32(bytes.length), bytes);
}
function encodeBytes(value) {
  if (!Buffer.isBuffer(value)) throw new Error('IDENTITY_BYTES_REQUIRED');
  return tagged(TAG_BYTES, u64(value.length), value);
}
function encodeValue(value) {
  if (typeof value === 'string') return encodeText(value);
  if (Buffer.isBuffer(value)) return encodeBytes(value);
  if (typeof value === 'number') return tagged(TAG_UINT64, u64(value));
  if (typeof value === 'bigint') return tagged(TAG_UINT64, u64(value));
  if (Array.isArray(value)) return tagged(TAG_LIST, u32(value.length), ...value.map(encodeValue));
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const keys = Object.keys(value).sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
    return tagged(TAG_RECORD, u32(keys.length), ...keys.flatMap((key) => [encodeText(key), encodeValue(value[key])]));
  }
  throw new Error('IDENTITY_TYPE_UNSUPPORTED');
}
function fingerprint(domain, payload) {
  const preimage = Buffer.concat([encodeText(PROTOCOL), encodeText(domain), encodeValue(payload)]);
  return 'sha256:' + crypto.createHash('sha256').update(preimage).digest('hex');
}
function parseFingerprint(value) {
  if (!/^sha256:[0-9a-f]{64}$/.test(value)) throw new Error('IDENTITY_FINGERPRINT_INVALID');
  return Buffer.from(value.slice(7), 'hex');
}
function typedQcf(kind, manifest) {
  return fingerprint('QCF_V1:' + kind, authority.qcfPayload(kind, manifest));
}
function typedRcf(resolvedInputs, manifest, qcfValues) {
  const kinds = Object.keys(qcfValues).sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
  const payload = {
    release_contract_schema: manifest.schema,
    fingerprint_profile: manifest.fingerprint_profile,
    qcf: kinds.map((kind) => ({ kind, digest: parseFingerprint(qcfValues[kind]) })),
    blob_inputs: resolvedInputs.map((item) => ({ path: item.path, bytes: item.bytes }))
  };
  return fingerprint('RCF_V1', payload);
}

const manifest = authority.readCanonicalManifest();
eq(manifest.schema, 'webclip-release-contract-inputs/v1', 'canonical schema');
eq(manifest.fingerprint_profile, 'webclip-contract-fingerprint-v1', 'fingerprint profile');
eq(manifest.full_rcf.blob_inputs.length, 11, 'full RCF input count');
eq(manifest.projections['unpacked-chrome'].cases.length, 4, 'Chrome case count');
eq(manifest.projections['yandex-e2e'].cases.length, 4, 'Yandex case count');

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

const chromePayload = authority.qcfPayload('unpacked-chrome', manifest);
const yandexPayload = authority.qcfPayload('yandex-e2e', manifest);
eq(chromePayload.kind, 'unpacked-chrome', 'Chrome payload kind');
eq(yandexPayload.kind, 'yandex-e2e', 'Yandex payload kind');
eq(chromePayload.release_contract_schema, manifest.schema, 'Chrome schema binding');
eq(yandexPayload.fingerprint_profile, manifest.fingerprint_profile, 'Yandex profile binding');

const chromeQcf = typedQcf('unpacked-chrome', manifest);
const yandexQcf = typedQcf('yandex-e2e', manifest);
eq(chromeQcf, 'sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c', 'current typed Chrome QCF');
eq(yandexQcf, 'sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1', 'current typed Yandex QCF');

const chromeChanged = clone(manifest);
chromeChanged.projections['unpacked-chrome'].cases[0].assertions.push('synthetic-new-release-assertion');
const normalizedChromeChanged = authority.validateAuthority(chromeChanged);
ok(typedQcf('unpacked-chrome', normalizedChromeChanged) !== chromeQcf, 'Chrome semantic change changes Chrome QCF');
eq(typedQcf('yandex-e2e', normalizedChromeChanged), yandexQcf, 'Chrome semantic change leaves Yandex QCF');

const yandexChanged = clone(manifest);
yandexChanged.projections['yandex-e2e'].cases[0].assertions.push('synthetic-new-provider-assertion');
const normalizedYandexChanged = authority.validateAuthority(yandexChanged);
eq(typedQcf('unpacked-chrome', normalizedYandexChanged), chromeQcf, 'Yandex semantic change leaves Chrome QCF');
ok(typedQcf('yandex-e2e', normalizedYandexChanged) !== yandexQcf, 'Yandex semantic change changes Yandex QCF');

const reordered = clone(manifest);
reordered.full_rcf.blob_inputs.reverse();
reordered.projections['unpacked-chrome'].environment_policy.reverse();
reordered.projections['unpacked-chrome'].cases.reverse();
for (const item of reordered.projections['unpacked-chrome'].cases) item.assertions.reverse();
reordered.projections['yandex-e2e'].environment_policy.reverse();
reordered.projections['yandex-e2e'].cases.reverse();
for (const item of reordered.projections['yandex-e2e'].cases) item.assertions.reverse();
const normalizedReordered = authority.validateAuthority(reordered);
eq(typedQcf('unpacked-chrome', normalizedReordered), chromeQcf, 'Chrome representation order invariant');
eq(typedQcf('yandex-e2e', normalizedReordered), yandexQcf, 'Yandex representation order invariant');

const head = git(ROOT, ['rev-parse', 'HEAD']);
const resolved = authority.resolveCandidate(head, manifest);
eq(resolved.candidate_sha, head, 'exact candidate sha');
eq(resolved.inputs.length, 11, 'resolved input count');
for (const input of resolved.inputs) {
  ok(/^[0-9a-f]{40}$/.test(input.git_oid), input.path + ' exact Git oid');
  ok(/^[0-9a-f]{64}$/.test(input.sha256), input.path + ' sha256');
  ok(Buffer.isBuffer(input.bytes), input.path + ' exact bytes');
}
const fullRcf = typedRcf(resolved.inputs, manifest, {
  'unpacked-chrome': chromeQcf,
  'yandex-e2e': yandexQcf
});
eq(fullRcf, 'sha256:9c0fc13d98bfa613f59d7ed68ecd414a0bd12172bee489c8fba4674284243d35', 'current typed full RCF');

const inputs = authority.identityInputs(head, manifest);
eq(inputs.schema, 'webclip-release-contract-identity-inputs/v1', 'identity-input schema');
eq(inputs.candidate_sha, head, 'identity-input candidate');
eq(inputs.policy_mutation, false, 'no policy mutation');
eq(inputs.receipt_interpretation, false, 'no receipt interpretation');
eq(inputs.release_authorized, false, 'no release authorization');
eq(inputs.full_rcf_blob_inputs.length, 11, 'identity-input root count');

const dirtyPath = path.join(ROOT, 'project_docs', 'USER_REQUIREMENTS.md');
const original = fs.readFileSync(dirtyPath);
try {
  fs.writeFileSync(dirtyPath, Buffer.concat([original, Buffer.from('\nworking-tree-not-authority\n')]));
  const dirtyResolved = authority.resolveCandidate(head, manifest);
  eq(
    typedRcf(dirtyResolved.inputs, manifest, { 'unpacked-chrome': chromeQcf, 'yandex-e2e': yandexQcf }),
    fullRcf,
    'dirty working tree cannot change exact Git RCF inputs'
  );
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
} finally {
  fs.rmSync(tempRepo, { recursive: true, force: true });
}

throwsCode(() => authority.resolveCandidate('main', manifest), 'RELEASE_CONTRACT_CANDIDATE_SHA_INVALID');
throwsCode(() => authority.qcfPayload('other', manifest), 'RELEASE_CONTRACT_PROJECTION_INVALID');

const researchS0c = fs.readFileSync(path.join(ROOT, 'project_tools', 'test_p1_231_s0c_qa_contract_authority_source_spec_model.js'), 'utf8');
const researchS0e = fs.readFileSync(path.join(ROOT, 'project_tools', 'test_p1_231_s0e_identity_engine_source_spec_model.js'), 'utf8');
ok(researchS0c.includes("const QCF_PREFIX = 'WEBCLIP_QCF_V1'"), 'historical S0-C framing marker retained as research history');
ok(researchS0e.includes("const PROTOCOL = 'WEBCLIP_RELEASE_IDENTITY_V1'"), 'current S0-E typed framing marker retained');

console.log(
  'P1-231 S0-C passive release-contract authority: PASS; checks=' + checks +
  '; full_inputs=' + manifest.full_rcf.blob_inputs.length +
  '; chrome_cases=' + manifest.projections['unpacked-chrome'].cases.length +
  '; yandex_cases=' + manifest.projections['yandex-e2e'].cases.length +
  '; typed_chrome_qcf=' + chromeQcf +
  '; typed_yandex_qcf=' + yandexQcf +
  '; typed_full_rcf=' + fullRcf +
  '; exact_git=true; s0c_hash_owner=false; receipt_interpretation=false; release_authorized=false'
);
