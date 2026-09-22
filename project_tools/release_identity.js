'use strict';

// P1-231 S0-E passive production identity engine.
// Owns only WEBCLIP_RELEASE_IDENTITY_V1 typed framing and SHA-256 fingerprints.
// Semantic authority remains in S0-A/S0-C/S0-D. No receipt settlement, build,
// readiness mutation, network/provider action, or release authorization occurs here.

const crypto = require('node:crypto');
const packageAuthority = require('./release_package_authority.js');
const contractAuthority = require('./release_contract_authority.js');
const builderAuthority = require('./release_builder_contract_authority.js');

const PROTOCOL = 'WEBCLIP_RELEASE_IDENTITY_V1';
const TAG_TEXT = 0x01;
const TAG_BYTES = 0x02;
const TAG_UINT64 = 0x03;
const TAG_LIST = 0x04;
const TAG_RECORD = 0x05;
const MAX_U32 = 0xffffffff;
const MAX_U64 = (1n << 64n) - 1n;

function fail(code, detail) {
  const error = new Error(String(detail || code).slice(0, 240));
  error.code = code;
  throw error;
}

function u32(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_U32) fail('IDENTITY_U32_RANGE');
  const out = Buffer.alloc(4);
  out.writeUInt32BE(value);
  return out;
}

function u64(value) {
  let parsed;
  try { parsed = typeof value === 'bigint' ? value : BigInt(value); }
  catch (_) { fail('IDENTITY_U64_RANGE'); }
  if (parsed < 0n || parsed > MAX_U64) fail('IDENTITY_U64_RANGE');
  const out = Buffer.alloc(8);
  out.writeBigUInt64BE(parsed);
  return out;
}

function tagged(tag, parts) {
  return Buffer.concat([Buffer.from([tag]), ...parts]);
}

function encodeText(value) {
  if (typeof value !== 'string') fail('IDENTITY_TEXT_REQUIRED');
  const bytes = Buffer.from(value, 'utf8');
  if (bytes.length > MAX_U32) fail('IDENTITY_U32_RANGE');
  return tagged(TAG_TEXT, [u32(bytes.length), bytes]);
}

function encodeBytes(value) {
  if (!Buffer.isBuffer(value)) fail('IDENTITY_BYTES_REQUIRED');
  return tagged(TAG_BYTES, [u64(value.length), value]);
}

function encodeValue(value) {
  if (typeof value === 'string') return encodeText(value);
  if (Buffer.isBuffer(value)) return encodeBytes(value);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) fail('IDENTITY_UINT64_REQUIRED');
    return tagged(TAG_UINT64, [u64(value)]);
  }
  if (typeof value === 'bigint') return tagged(TAG_UINT64, [u64(value)]);
  if (Array.isArray(value)) {
    if (value.length > MAX_U32) fail('IDENTITY_U32_RANGE');
    return tagged(TAG_LIST, [u32(value.length), ...value.map(encodeValue)]);
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const keys = Object.keys(value).sort((a, b) => Buffer.from(a, 'utf8').compare(Buffer.from(b, 'utf8')));
    if (keys.length > MAX_U32) fail('IDENTITY_U32_RANGE');
    return tagged(TAG_RECORD, [
      u32(keys.length),
      ...keys.flatMap((key) => [encodeText(key), encodeValue(value[key])])
    ]);
  }
  fail('IDENTITY_TYPE_UNSUPPORTED');
}

function preimage(domain, payload) {
  if (typeof domain !== 'string' || !domain) fail('IDENTITY_DOMAIN_INVALID');
  return Buffer.concat([encodeText(PROTOCOL), encodeText(domain), encodeValue(payload)]);
}

function fingerprint(domain, payload) {
  return 'sha256:' + crypto.createHash('sha256').update(preimage(domain, payload)).digest('hex');
}

function parseFingerprint(value) {
  if (typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(value)) {
    fail('IDENTITY_FINGERPRINT_INVALID');
  }
  return Buffer.from(value.slice(7), 'hex');
}

function normalizePackageInputs(value) {
  if (!value || value.schema !== 'webclip-package-identity-inputs/v1') fail('IDENTITY_PACKAGE_INPUTS_INVALID');
  if (!Array.isArray(value.members) || value.members.length === 0) fail('IDENTITY_PACKAGE_INPUTS_INVALID');
  const members = [];
  let previous = null;
  for (const item of value.members) {
    if (!item || typeof item.path !== 'string' || !Buffer.isBuffer(item.bytes)) {
      fail('IDENTITY_PACKAGE_INPUTS_INVALID');
    }
    if (previous !== null && Buffer.from(previous).compare(Buffer.from(item.path)) >= 0) {
      fail('IDENTITY_PACKAGE_INPUTS_NOT_CANONICAL');
    }
    previous = item.path;
    members.push(Object.freeze({ path: item.path, bytes: item.bytes }));
  }
  return Object.freeze({
    candidate_sha: packageAuthority.normalizeCandidateSha(value.candidate_sha),
    package_schema: value.package_schema,
    path_profile: value.path_profile,
    members: Object.freeze(members)
  });
}

function rpfPayload(packageInputsValue) {
  const inputs = normalizePackageInputs(packageInputsValue);
  return Object.freeze({
    package_schema: inputs.package_schema,
    path_profile: inputs.path_profile,
    members: inputs.members
  });
}

function fingerprintRpf(packageInputsValue) {
  return fingerprint('RPF_V1', rpfPayload(packageInputsValue));
}

function normalizeContractInputs(value) {
  if (!value || value.schema !== 'webclip-release-contract-identity-inputs/v1') {
    fail('IDENTITY_CONTRACT_INPUTS_INVALID');
  }
  if (!value.qcf_payloads || typeof value.qcf_payloads !== 'object' || Array.isArray(value.qcf_payloads)) {
    fail('IDENTITY_CONTRACT_INPUTS_INVALID');
  }
  const kinds = Object.keys(value.qcf_payloads).sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
  if (JSON.stringify(kinds) !== JSON.stringify([...contractAuthority.PROJECTION_NAMES].sort())) {
    fail('IDENTITY_CONTRACT_INPUTS_INVALID');
  }
  if (!Array.isArray(value.full_rcf_blob_inputs) || value.full_rcf_blob_inputs.length === 0) {
    fail('IDENTITY_CONTRACT_INPUTS_INVALID');
  }
  let previous = null;
  const roots = value.full_rcf_blob_inputs.map((item) => {
    if (!item || typeof item.path !== 'string' || !Buffer.isBuffer(item.bytes)) {
      fail('IDENTITY_CONTRACT_INPUTS_INVALID');
    }
    if (previous !== null && Buffer.from(previous).compare(Buffer.from(item.path)) >= 0) {
      fail('IDENTITY_CONTRACT_INPUTS_NOT_CANONICAL');
    }
    previous = item.path;
    return Object.freeze({ path: item.path, bytes: item.bytes });
  });
  return Object.freeze({
    candidate_sha: contractAuthority.normalizeCandidateSha(value.candidate_sha),
    qcf_payloads: value.qcf_payloads,
    full_rcf_blob_inputs: Object.freeze(roots)
  });
}

function fingerprintQcf(kind, contractInputsValue) {
  const inputs = normalizeContractInputs(contractInputsValue);
  if (!Object.prototype.hasOwnProperty.call(inputs.qcf_payloads, kind)) {
    fail('IDENTITY_QCF_KIND_INVALID');
  }
  return fingerprint('QCF_V1:' + kind, inputs.qcf_payloads[kind]);
}

function rcfPayload(contractInputsValue, qcfValues) {
  const inputs = normalizeContractInputs(contractInputsValue);
  if (!qcfValues || typeof qcfValues !== 'object' || Array.isArray(qcfValues)) {
    fail('IDENTITY_QCF_SET_INVALID');
  }
  const kinds = Object.keys(inputs.qcf_payloads).sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
  const supplied = Object.keys(qcfValues).sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
  if (JSON.stringify(kinds) !== JSON.stringify(supplied)) fail('IDENTITY_QCF_SET_INVALID');

  const first = inputs.qcf_payloads[kinds[0]];
  return Object.freeze({
    release_contract_schema: first.release_contract_schema,
    fingerprint_profile: first.fingerprint_profile,
    qcf: Object.freeze(kinds.map((kind) => Object.freeze({
      kind,
      digest: parseFingerprint(qcfValues[kind])
    }))),
    blob_inputs: inputs.full_rcf_blob_inputs
  });
}

function fingerprintRcf(contractInputsValue, qcfValues) {
  return fingerprint('RCF_V1', rcfPayload(contractInputsValue, qcfValues));
}

function normalizeBuilderInputs(value) {
  if (!value || value.schema !== 'webclip-release-builder-identity-inputs/v1') {
    fail('IDENTITY_BUILDER_INPUTS_INVALID');
  }
  if (!value.builder_contract || !value.package_compatibility || value.package_compatibility.compatible !== true) {
    fail('IDENTITY_BUILDER_INPUTS_INVALID');
  }
  return Object.freeze({ builder_contract: builderAuthority.bcfPayload(value.builder_contract) });
}

function fingerprintBcf(builderInputsValue) {
  return fingerprint('BCF_V1', normalizeBuilderInputs(builderInputsValue).builder_contract);
}

function computeIdentities(candidateSha, options = {}) {
  const candidate = packageAuthority.normalizeCandidateSha(candidateSha);
  const packageManifest = options.packageManifest || packageAuthority.readCanonicalManifest();
  const contractManifest = options.contractManifest || contractAuthority.readCanonicalManifest();
  const builderManifest = options.builderManifest || builderAuthority.readCanonicalManifest();

  const packageInputs = packageAuthority.identityInputs(candidate, packageManifest, options.packageOptions || {});
  const contractInputs = contractAuthority.identityInputs(candidate, contractManifest, options.contractOptions || {});
  const builderInputs = builderAuthority.identityInputs(builderManifest, packageManifest);

  if (packageInputs.candidate_sha !== contractInputs.candidate_sha) fail('IDENTITY_CANDIDATE_MISMATCH');
  if (
    builderInputs.package_compatibility.package_schema !== packageInputs.package_schema
    || builderInputs.package_compatibility.path_profile !== packageInputs.path_profile
  ) {
    fail('IDENTITY_AUTHORITY_COMPOSITION_MISMATCH');
  }

  const rpf = fingerprintRpf(packageInputs);
  const qcf = {};
  for (const kind of contractAuthority.PROJECTION_NAMES) qcf[kind] = fingerprintQcf(kind, contractInputs);
  const rcf = fingerprintRcf(contractInputs, qcf);
  const bcf = fingerprintBcf(builderInputs);

  return Object.freeze({
    schema: 'webclip-release-identities/v1',
    protocol: PROTOCOL,
    candidate_sha: candidate,
    package_files: packageInputs.members.length,
    full_rcf_inputs: contractInputs.full_rcf_blob_inputs.length,
    rpf,
    qcf: Object.freeze({ ...qcf }),
    rcf,
    bcf,
    policy_mutation: false,
    receipt_interpretation: false,
    artifact_build: false,
    release_authorized: false
  });
}

function parseArgs(argv) {
  const out = { candidate: '', help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') { out.help = true; continue; }
    if (arg === '--candidate') {
      if (out.candidate) fail('IDENTITY_ARGUMENT_INVALID');
      out.candidate = String(argv[++index] || '');
      continue;
    }
    fail('IDENTITY_ARGUMENT_INVALID', arg);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write('node project_tools/release_identity.js --candidate <exact-40-hex-commit>\n');
    return;
  }
  if (!args.candidate) fail('IDENTITY_CANDIDATE_SHA_REQUIRED');
  process.stdout.write(JSON.stringify(computeIdentities(args.candidate), null, 2) + '\n');
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    process.stderr.write(String(error && error.code || 'IDENTITY_FAILED') + ': ' +
      String(error && error.message || 'failed').slice(0, 240) + '\n');
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({
  PROTOCOL,
  TAG_TEXT,
  TAG_BYTES,
  TAG_UINT64,
  TAG_LIST,
  TAG_RECORD,
  MAX_U32,
  MAX_U64,
  u32,
  u64,
  encodeText,
  encodeBytes,
  encodeValue,
  preimage,
  fingerprint,
  parseFingerprint,
  normalizePackageInputs,
  rpfPayload,
  fingerprintRpf,
  normalizeContractInputs,
  fingerprintQcf,
  rcfPayload,
  fingerprintRcf,
  normalizeBuilderInputs,
  fingerprintBcf,
  computeIdentities,
  parseArgs
});
