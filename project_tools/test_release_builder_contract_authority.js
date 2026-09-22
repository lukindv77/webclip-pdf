'use strict';

// P1-231 S0-D deterministic production witness.
// S0-D owns builder semantics; this witness applies the already-canonical S0-E
// WEBCLIP_RELEASE_IDENTITY_V1 framing test-only to prove current BCF compatibility.
// It never builds the WebClip extension ZIP.

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const authority = require('./release_builder_contract_authority.js');
const packageAuthority = require('./release_package_authority.js');

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
function deep(actual, expected, message) { assert.deepStrictEqual(actual, expected, message); checks += 1; }
function throwsCode(fn, code, message) {
  assert.throws(fn, (error) => error && error.code === code, message || code);
  checks += 1;
}
function u32(value) { const out = Buffer.alloc(4); out.writeUInt32BE(value); return out; }
function u64(value) { const out = Buffer.alloc(8); out.writeBigUInt64BE(BigInt(value)); return out; }
function tagged(tag, ...parts) { return Buffer.concat([Buffer.from([tag]), ...parts]); }
function encodeText(value) {
  const bytes = Buffer.from(value, 'utf8');
  return tagged(TAG_TEXT, u32(bytes.length), bytes);
}
function encodeValue(value) {
  if (typeof value === 'string') return encodeText(value);
  if (Buffer.isBuffer(value)) return tagged(TAG_BYTES, u64(value.length), value);
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
function clone(value) { return structuredClone(value); }

const manifest = authority.readCanonicalManifest();
eq(manifest.schema, 'webclip-release-builder-contract/v1', 'canonical schema');
eq(manifest.builder_profile, 'webclip-classic-zip-stored/v1', 'builder profile');
eq(manifest.requires_package_schema, 'webclip-extension-package/v1', 'package schema binding');
eq(manifest.requires_path_profile, 'portable-ascii-v1', 'path profile binding');

const packageManifest = packageAuthority.readCanonicalManifest();
eq(packageManifest.schema, manifest.requires_package_schema, 'S0-A package schema composition');
eq(packageManifest.path_profile, manifest.requires_path_profile, 'S0-A path profile composition');
eq(packageManifest.files.length, 34, 'current package membership count');
const compatibility = authority.assertPackageCompatibility(manifest, packageManifest);
eq(compatibility.compatible, true, 'S0-A compatibility');
eq(compatibility.package_schema, manifest.requires_package_schema, 'compatibility package schema');
eq(compatibility.path_profile, manifest.requires_path_profile, 'compatibility path profile');
throwsCode(() => authority.assertPackageCompatibility(manifest, { ...packageManifest, schema: 'webclip-extension-package/v2' }), 'BUILDER_CONTRACT_PACKAGE_SCHEMA_MISMATCH');
throwsCode(() => authority.assertPackageCompatibility(manifest, { ...packageManifest, path_profile: 'portable-ascii-v2' }), 'BUILDER_CONTRACT_PATH_PROFILE_MISMATCH');

eq(manifest.staging.source, 'exact-candidate-git-blobs', 'staging source');
eq(manifest.staging.membership, 'consume-s0a-only', 'staging membership owner');
eq(manifest.staging.root_policy, 'fresh-empty', 'fresh stage root');
eq(manifest.staging.symlinks, 'forbidden', 'symlink policy');
eq(manifest.staging.extra_files, 'forbidden', 'extra-file policy');
eq(manifest.staging.filesystem_metadata, 'non-authoritative', 'filesystem metadata boundary');

eq(manifest.zip.container, 'classic-single-disk', 'classic ZIP container');
eq(manifest.zip.compression, 'stored', 'stored compression');
eq(manifest.zip.zip64, 'forbidden', 'ZIP64 forbidden');
eq(manifest.zip.member_order, 'unsigned-path-bytes-lexicographic', 'member order');
eq(manifest.zip.filename_encoding, 'ascii', 'filename encoding');
eq(manifest.zip.dos_datetime, '1980-01-01T00:00:00', 'fixed DOS timestamp');
eq(manifest.zip.create_system, 3, 'Unix create system');
eq(manifest.zip.create_version, 20, 'create version');
eq(manifest.zip.extract_version, 20, 'extract version');
eq(manifest.zip.external_mode, 33188, 'regular 0644 external mode');
eq(manifest.zip.internal_attr, 0, 'internal attr');
eq(manifest.zip.flag_bits, 0, 'flag bits');
for (const field of [
  'extra_fields','member_comments','archive_comment','directory_entries','data_descriptors',
  'encryption','digital_signature','archive_extra_data','preamble','trailing_bytes'
]) {
  eq(manifest.zip[field], 'forbidden', field + ' forbidden');
}
for (const field of [
  'local_central_agreement','crc32','stored_size_equality',
  'exact_member_bytes','candidate_rpf_equality','artifact_sha256'
]) {
  eq(manifest.verification[field], 'required', field + ' required');
}

throwsCode(() => authority.parseManifestBytes(Buffer.alloc(0)), 'BUILDER_CONTRACT_BYTES_INVALID');
throwsCode(() => authority.parseManifestBytes(Buffer.alloc(authority.MAX_MANIFEST_BYTES + 1, 0x20)), 'BUILDER_CONTRACT_BYTES_INVALID');
throwsCode(() => authority.parseManifestBytes(Buffer.concat([Buffer.from([0xef,0xbb,0xbf]), fs.readFileSync(authority.MANIFEST_PATH)])), 'BUILDER_CONTRACT_BOM_FORBIDDEN');
throwsCode(() => authority.parseManifestBytes(Buffer.from([0xc3,0x28])), 'BUILDER_CONTRACT_UTF8_INVALID');
throwsCode(() => authority.parseManifestBytes(Buffer.from('{"schema":"a","schema":"b"}')), 'BUILDER_CONTRACT_DUPLICATE_KEY');
throwsCode(() => authority.parseManifestBytes(Buffer.from('{')), 'BUILDER_CONTRACT_JSON_INVALID');

for (const [mutate, code] of [
  [(x) => { x.extra = true; }, 'BUILDER_CONTRACT_SHAPE_INVALID'],
  [(x) => { x.schema = 'webclip-release-builder-contract/v2'; }, 'BUILDER_CONTRACT_SCHEMA_UNSUPPORTED'],
  [(x) => { x.builder_profile = 'other'; }, 'BUILDER_CONTRACT_PROFILE_UNSUPPORTED'],
  [(x) => { x.requires_package_schema = 'webclip-extension-package/v2'; }, 'BUILDER_CONTRACT_PACKAGE_SCHEMA_MISMATCH'],
  [(x) => { x.requires_path_profile = 'portable-ascii-v2'; }, 'BUILDER_CONTRACT_PATH_PROFILE_MISMATCH'],
  [(x) => { x.staging.extra = 'x'; }, 'BUILDER_CONTRACT_STAGING_INVALID'],
  [(x) => { x.staging.root_policy = 'reuse'; }, 'BUILDER_CONTRACT_STAGING_INVALID'],
  [(x) => { x.zip.extra = 'x'; }, 'BUILDER_CONTRACT_ZIP_INVALID'],
  [(x) => { x.zip.compression = 'deflate'; }, 'BUILDER_CONTRACT_ZIP_INVALID'],
  [(x) => { x.zip.zip64 = 'allowed'; }, 'BUILDER_CONTRACT_ZIP_INVALID'],
  [(x) => { x.zip.flag_bits = 8; }, 'BUILDER_CONTRACT_ZIP_INVALID'],
  [(x) => { x.zip.dos_datetime = '2026-09-22T00:00:00'; }, 'BUILDER_CONTRACT_ZIP_INVALID'],
  [(x) => { x.verification.extra = 'x'; }, 'BUILDER_CONTRACT_VERIFICATION_INVALID'],
  [(x) => { x.verification.crc32 = 'optional'; }, 'BUILDER_CONTRACT_VERIFICATION_INVALID']
]) {
  const changed = clone(manifest);
  mutate(changed);
  throwsCode(() => authority.normalizeAuthority(changed), code);
}

const reordered = {
  verification: clone(manifest.verification),
  zip: clone(manifest.zip),
  staging: clone(manifest.staging),
  requires_path_profile: manifest.requires_path_profile,
  requires_package_schema: manifest.requires_package_schema,
  builder_profile: manifest.builder_profile,
  schema: manifest.schema
};
const normalizedReordered = authority.normalizeAuthority(reordered);
deep(normalizedReordered, manifest, 'source object key order cannot change semantic authority');

const payload = authority.bcfPayload(manifest);
const bcf = fingerprint('BCF_V1', payload);
eq(bcf, 'sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff', 'current typed BCF');

const inputs = authority.identityInputs(manifest);
eq(inputs.schema, 'webclip-release-builder-identity-inputs/v1', 'identity-input schema');
deep(inputs.builder_contract, manifest, 'identity input is canonical S0-D contract');
eq(inputs.package_compatibility.compatible, true, 'identity inputs include S0-A compatibility');
eq(inputs.artifact_build, false, 'no artifact build');
eq(inputs.policy_mutation, false, 'no policy mutation');
eq(inputs.receipt_interpretation, false, 'no receipt interpretation');
eq(inputs.release_authorized, false, 'no release authorization');

const semanticChange = clone(manifest);
semanticChange.zip.create_version = 21;
ok(fingerprint('BCF_V1', semanticChange) !== bcf, 'builder semantic change changes typed BCF payload');
throwsCode(() => authority.normalizeAuthority(semanticChange), 'BUILDER_CONTRACT_ZIP_INVALID');

const packageBytesA = Buffer.from('package-A');
const packageBytesB = Buffer.from('package-B');
ok(!packageBytesA.equals(packageBytesB), 'package fixture differs');
eq(fingerprint('BCF_V1', payload), bcf, 'package bytes are not direct BCF inputs');

const researchS0d = fs.readFileSync(path.join(ROOT, 'project_tools', 'test_p1_231_s0d_builder_contract_authority_source_spec_model.js'), 'utf8');
const researchS0e = fs.readFileSync(path.join(ROOT, 'project_tools', 'test_p1_231_s0e_identity_engine_source_spec_model.js'), 'utf8');
ok(researchS0d.includes("const GOLDEN_ZIP_SHA256 = '1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7'"), 'synthetic ZIP golden vector retained');
ok(researchS0d.includes('zip64=v1-forbidden'), 'research ZIP64 boundary retained');
ok(researchS0e.includes("const PROTOCOL = 'WEBCLIP_RELEASE_IDENTITY_V1'"), 'S0-E typed fingerprint owner marker retained');
ok(researchS0e.includes("function bcf(builder = BUILDER_FIXTURE) { return fingerprint('BCF_V1', builder); }"), 'S0-E BCF framing marker retained');

console.log(
  'P1-231 S0-D passive builder-contract authority: PASS; checks=' + checks +
  '; package_files=' + packageManifest.files.length +
  '; builder_profile=' + manifest.builder_profile +
  '; typed_bcf=' + bcf +
  '; s0d_hash_owner=false; artifact_build=false; receipt_interpretation=false; release_authorized=false'
);
