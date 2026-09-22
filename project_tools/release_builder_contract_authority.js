'use strict';

// P1-231 S0-D passive builder-contract input authority.
// Owns deterministic stage/ZIP semantics only. It does not build the WebClip ZIP,
// compute production BCF, interpret receipts, mutate readiness, or authorize release.

const fs = require('node:fs');
const path = require('node:path');
const { TextDecoder } = require('node:util');
const packageAuthority = require('./release_package_authority.js');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'release_builder_contract_v1.json');
const SCHEMA = 'webclip-release-builder-contract/v1';
const BUILDER_PROFILE = 'webclip-classic-zip-stored/v1';
const PACKAGE_SCHEMA = 'webclip-extension-package/v1';
const PATH_PROFILE = 'portable-ascii-v1';
const MAX_MANIFEST_BYTES = 128 * 1024;

const TOP_KEYS = Object.freeze([
  'builder_profile', 'requires_package_schema', 'requires_path_profile',
  'schema', 'staging', 'verification', 'zip'
]);
const STAGING_KEYS = Object.freeze([
  'extra_files', 'filesystem_metadata', 'membership', 'root_policy', 'source', 'symlinks'
]);
const ZIP_KEYS = Object.freeze([
  'archive_comment', 'archive_extra_data', 'compression', 'container', 'create_system',
  'create_version', 'data_descriptors', 'digital_signature', 'directory_entries',
  'dos_datetime', 'encryption', 'external_mode', 'extra_fields', 'extract_version',
  'filename_encoding', 'flag_bits', 'internal_attr', 'member_comments', 'member_order',
  'preamble', 'trailing_bytes', 'zip64'
]);
const VERIFY_KEYS = Object.freeze([
  'artifact_sha256', 'candidate_rpf_equality', 'crc32', 'exact_member_bytes',
  'local_central_agreement', 'stored_size_equality'
]);

const CANONICAL = Object.freeze({
  schema: SCHEMA,
  builder_profile: BUILDER_PROFILE,
  requires_package_schema: PACKAGE_SCHEMA,
  requires_path_profile: PATH_PROFILE,
  staging: Object.freeze({
    source: 'exact-candidate-git-blobs',
    membership: 'consume-s0a-only',
    root_policy: 'fresh-empty',
    symlinks: 'forbidden',
    extra_files: 'forbidden',
    filesystem_metadata: 'non-authoritative'
  }),
  zip: Object.freeze({
    container: 'classic-single-disk',
    compression: 'stored',
    zip64: 'forbidden',
    member_order: 'unsigned-path-bytes-lexicographic',
    filename_encoding: 'ascii',
    dos_datetime: '1980-01-01T00:00:00',
    create_system: 3,
    create_version: 20,
    extract_version: 20,
    external_mode: 33188,
    internal_attr: 0,
    flag_bits: 0,
    extra_fields: 'forbidden',
    member_comments: 'forbidden',
    archive_comment: 'forbidden',
    directory_entries: 'forbidden',
    data_descriptors: 'forbidden',
    encryption: 'forbidden',
    digital_signature: 'forbidden',
    archive_extra_data: 'forbidden',
    preamble: 'forbidden',
    trailing_bytes: 'forbidden'
  }),
  verification: Object.freeze({
    local_central_agreement: 'required',
    crc32: 'required',
    stored_size_equality: 'required',
    exact_member_bytes: 'required',
    candidate_rpf_equality: 'required',
    artifact_sha256: 'required'
  })
});

function fail(code, detail) {
  const error = new Error(String(detail || code).slice(0, 240));
  error.code = code;
  throw error;
}

function sameKeys(raw, expected) {
  const keys = Object.keys(raw).sort();
  return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
}

function forbiddenJsonConstantOutsideString(text) {
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (/^(?:NaN|Infinity|-Infinity)(?![A-Za-z0-9_])/.test(text.slice(index))) return true;
  }
  return false;
}

function rejectDuplicateObjectKeys(text) {
  const stack = [];
  let index = 0;
  function skipWs() {
    while (index < text.length && /[\x20\x09\x0a\x0d]/.test(text[index])) index += 1;
  }
  function readString() {
    const start = index++;
    let escaped = false;
    while (index < text.length) {
      const char = text[index++];
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === '"') return text.slice(start, index);
    }
    fail('BUILDER_CONTRACT_JSON_INVALID');
  }
  while (index < text.length) {
    skipWs();
    if (index >= text.length) break;
    const char = text[index];
    if (char === '"') {
      const raw = readString();
      skipWs();
      const frame = stack[stack.length - 1];
      if (frame && frame.type === 'object' && frame.expectingKey && text[index] === ':') {
        let key;
        try { key = JSON.parse(raw); } catch (_) { fail('BUILDER_CONTRACT_JSON_INVALID'); }
        if (frame.keys.has(key)) fail('BUILDER_CONTRACT_DUPLICATE_KEY', key);
        frame.keys.add(key);
        frame.expectingKey = false;
      }
      continue;
    }
    if (char === '{') { stack.push({ type: 'object', keys: new Set(), expectingKey: true }); index += 1; continue; }
    if (char === '[') { stack.push({ type: 'array' }); index += 1; continue; }
    if (char === '}' || char === ']') { stack.pop(); index += 1; continue; }
    if (char === ',') {
      const frame = stack[stack.length - 1];
      if (frame && frame.type === 'object') frame.expectingKey = true;
      index += 1;
      continue;
    }
    index += 1;
  }
}

function exactObject(raw, keys, code) {
  if (!raw || Array.isArray(raw) || typeof raw !== 'object' || !sameKeys(raw, keys)) fail(code);
  return raw;
}

function equalScalar(actual, expected, code, detail) {
  if (actual !== expected) fail(code, detail);
  return actual;
}

function normalizeAuthority(raw) {
  exactObject(raw, TOP_KEYS, 'BUILDER_CONTRACT_SHAPE_INVALID');

  equalScalar(raw.schema, SCHEMA, 'BUILDER_CONTRACT_SCHEMA_UNSUPPORTED');
  equalScalar(raw.builder_profile, BUILDER_PROFILE, 'BUILDER_CONTRACT_PROFILE_UNSUPPORTED');
  equalScalar(raw.requires_package_schema, PACKAGE_SCHEMA, 'BUILDER_CONTRACT_PACKAGE_SCHEMA_MISMATCH');
  equalScalar(raw.requires_path_profile, PATH_PROFILE, 'BUILDER_CONTRACT_PATH_PROFILE_MISMATCH');

  exactObject(raw.staging, STAGING_KEYS, 'BUILDER_CONTRACT_STAGING_INVALID');
  exactObject(raw.zip, ZIP_KEYS, 'BUILDER_CONTRACT_ZIP_INVALID');
  exactObject(raw.verification, VERIFY_KEYS, 'BUILDER_CONTRACT_VERIFICATION_INVALID');

  for (const [key, expected] of Object.entries(CANONICAL.staging)) {
    equalScalar(raw.staging[key], expected, 'BUILDER_CONTRACT_STAGING_INVALID', key);
  }
  for (const [key, expected] of Object.entries(CANONICAL.zip)) {
    equalScalar(raw.zip[key], expected, 'BUILDER_CONTRACT_ZIP_INVALID', key);
  }
  for (const [key, expected] of Object.entries(CANONICAL.verification)) {
    equalScalar(raw.verification[key], expected, 'BUILDER_CONTRACT_VERIFICATION_INVALID', key);
  }

  return Object.freeze({
    schema: SCHEMA,
    builder_profile: BUILDER_PROFILE,
    requires_package_schema: PACKAGE_SCHEMA,
    requires_path_profile: PATH_PROFILE,
    staging: Object.freeze({ ...CANONICAL.staging }),
    zip: Object.freeze({ ...CANONICAL.zip }),
    verification: Object.freeze({ ...CANONICAL.verification })
  });
}

function assertPackageCompatibility(authorityValue, packageManifestValue) {
  const authority = normalizeAuthority(authorityValue);
  const packageManifest = packageManifestValue || packageAuthority.readCanonicalManifest();
  if (!packageManifest || packageManifest.schema !== authority.requires_package_schema) {
    fail('BUILDER_CONTRACT_PACKAGE_SCHEMA_MISMATCH');
  }
  if (packageManifest.path_profile !== authority.requires_path_profile) {
    fail('BUILDER_CONTRACT_PATH_PROFILE_MISMATCH');
  }
  return Object.freeze({
    package_schema: packageManifest.schema,
    path_profile: packageManifest.path_profile,
    compatible: true
  });
}

function parseManifestBytes(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) fail('BUILDER_CONTRACT_BYTES_INVALID');
  if (bytes.length > MAX_MANIFEST_BYTES) fail('BUILDER_CONTRACT_BYTES_INVALID');
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail('BUILDER_CONTRACT_BOM_FORBIDDEN');
  }
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes); }
  catch (_) { fail('BUILDER_CONTRACT_UTF8_INVALID'); }
  if (forbiddenJsonConstantOutsideString(text)) fail('BUILDER_CONTRACT_JSON_INVALID');
  rejectDuplicateObjectKeys(text);

  let raw;
  try { raw = JSON.parse(text); } catch (_) { fail('BUILDER_CONTRACT_JSON_INVALID'); }
  return normalizeAuthority(raw);
}

function readCanonicalManifest() {
  let bytes;
  try { bytes = fs.readFileSync(MANIFEST_PATH); }
  catch (_) { fail('BUILDER_CONTRACT_MANIFEST_READ_FAILED'); }
  return parseManifestBytes(bytes);
}

function bcfPayload(authorityValue) {
  return normalizeAuthority(authorityValue);
}

function identityInputs(authorityValue, packageManifestValue) {
  const authority = normalizeAuthority(authorityValue);
  const packageCompatibility = assertPackageCompatibility(authority, packageManifestValue);
  return Object.freeze({
    schema: 'webclip-release-builder-identity-inputs/v1',
    builder_contract: authority,
    package_compatibility: packageCompatibility,
    artifact_build: false,
    policy_mutation: false,
    receipt_interpretation: false,
    release_authorized: false
  });
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') {
    process.stdout.write('node project_tools/release_builder_contract_authority.js\n');
    return;
  }
  if (args.length !== 0) fail('BUILDER_CONTRACT_ARGUMENT_INVALID');
  const result = identityInputs(readCanonicalManifest());
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    process.stderr.write(String(error && error.code || 'BUILDER_CONTRACT_AUTHORITY_FAILED') + ': ' +
      String(error && error.message || 'failed').slice(0, 240) + '\n');
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({
  ROOT,
  MANIFEST_PATH,
  SCHEMA,
  BUILDER_PROFILE,
  PACKAGE_SCHEMA,
  PATH_PROFILE,
  MAX_MANIFEST_BYTES,
  CANONICAL,
  parseManifestBytes,
  normalizeAuthority,
  readCanonicalManifest,
  bcfPayload,
  assertPackageCompatibility,
  identityInputs
});
