'use strict';

// P1-231 S0-H passive staged-package / ZIP builder-verifier.
// This module has no CLI and does not load the WebClip product by itself.
// Callers must provide an already-admitted exact candidate plus package inputs.
// Committed positive execution is fixture-only until explicit product-build approval.

const crypto = require('node:crypto');
const packageAuthority = require('./release_package_authority.js');
const builderAuthority = require('./release_builder_contract_authority.js');
const identity = require('./release_identity.js');
const candidateGate = require('./release_candidate_generation.js');

const RESULT_SCHEMA = 'webclip-passive-builder-result/v1';
const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;
const DOS_TIME = 0;
const DOS_DATE = 33;
const VERSION_NEEDED = 20;
const VERSION_MADE_BY = (3 << 8) | 20;
const EXTERNAL_MODE = 0o100644;
const EXTERNAL_ATTR = (EXTERNAL_MODE * 0x10000) >>> 0;
const MAX_CLASSIC_ENTRIES = 0xffff;
const MAX_CLASSIC_U32 = 0xffffffff;

function fail(code, detail) {
  const error = new Error(String(detail || code).slice(0, 240));
  error.code = code;
  throw error;
}

function digestPrefixed(bytes) {
  if (!Buffer.isBuffer(bytes)) fail('ARTIFACT_DIGEST_FAILED');
  return 'sha256:' + crypto.createHash('sha256').update(bytes).digest('hex');
}

function asciiCompare(a, b) {
  return Buffer.from(a, 'ascii').compare(Buffer.from(b, 'ascii'));
}

function validateEntryName(value) {
  try { packageAuthority.validatePath(value); }
  catch (_) { fail('PACKAGE_PROJECTION_INVALID', value); }
  if ([...Buffer.from(value, 'utf8')].some((byte) => byte > 0x7f)) fail('PACKAGE_PROJECTION_INVALID', value);
  return value;
}

function normalizePackageInputs(value, candidateSha) {
  let normalized;
  try { normalized = identity.normalizePackageInputs(value); }
  catch (_) { fail('PACKAGE_PROJECTION_INVALID'); }
  if (normalized.candidate_sha !== candidateSha) fail('CANDIDATE_SHA_MISMATCH');
  for (const member of normalized.members) validateEntryName(member.path);
  return normalized;
}

function packageRpf(inputs) {
  const envelope = {
    schema: 'webclip-package-identity-inputs/v1',
    candidate_sha: inputs.candidate_sha,
    package_schema: inputs.package_schema,
    path_profile: inputs.path_profile,
    members: inputs.members
  };
  try { return identity.fingerprintRpf(envelope); }
  catch (_) { fail('PACKAGE_PROJECTION_INVALID'); }
}

function validateAdmission(candidateSha, admission) {
  if (
    !admission
    || admission.schema !== candidateGate.RESULT_SCHEMA
    || admission.generation_state !== 'pass'
    || admission.candidate_sha !== candidateSha
    || admission.generator_rcf_binding !== 'bound'
    || !admission.identities
    || !/^sha256:[0-9a-f]{64}$/.test(String(admission.identities.rpf || ''))
    || !/^sha256:[0-9a-f]{64}$/.test(String(admission.identities.bcf || ''))
    || admission.release_authorized !== false
  ) {
    if (admission && admission.candidate_sha && admission.candidate_sha !== candidateSha) {
      fail('CANDIDATE_SHA_MISMATCH');
    }
    fail('CANDIDATE_GENERATION_NOT_ADMITTED');
  }
  return admission;
}

function expectedBcf(builderManifest, packageManifest) {
  let inputs;
  try { inputs = builderAuthority.identityInputs(builderManifest, packageManifest); }
  catch (error) {
    if (error && error.code) throw error;
    fail('BUILDER_CONTRACT_IDENTITY_MISMATCH');
  }
  try { return identity.fingerprintBcf(inputs); }
  catch (_) { fail('BUILDER_CONTRACT_IDENTITY_MISMATCH'); }
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  if (!Buffer.isBuffer(bytes)) fail('PACKAGE_MEMBER_BYTES_INVALID');
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function checkedU32(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value >= MAX_CLASSIC_U32) {
    fail('CLASSIC_ZIP_LIMIT_EXCEEDED');
  }
  return value;
}

function normalizedEntries(packageInputs) {
  return packageInputs.members
    .map((member) => ({ name: validateEntryName(member.path), bytes: Buffer.from(member.bytes) }))
    .sort((a, b) => asciiCompare(a.name, b.name));
}

function buildClassicStoredZip(entries) {
  if (!Array.isArray(entries) || entries.length === 0) fail('ZIP_BUILD_FAILED');
  if (entries.length >= MAX_CLASSIC_ENTRIES) fail('CLASSIC_ZIP_LIMIT_EXCEEDED');

  const sorted = entries
    .map((entry) => ({
      name: validateEntryName(entry.name),
      bytes: Buffer.isBuffer(entry.bytes) ? Buffer.from(entry.bytes) : fail('PACKAGE_MEMBER_BYTES_INVALID')
    }))
    .sort((a, b) => asciiCompare(a.name, b.name));

  const names = new Set();
  const locals = [];
  const centrals = [];
  let localOffset = 0;

  for (const entry of sorted) {
    if (names.has(entry.name)) fail('ZIP_MEMBER_SET_MISMATCH');
    names.add(entry.name);

    const name = Buffer.from(entry.name, 'ascii');
    if (name.length > 0xffff) fail('CLASSIC_ZIP_LIMIT_EXCEEDED');
    checkedU32(entry.bytes.length);
    checkedU32(localOffset);
    const crc = crc32(entry.bytes);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(LOCAL_SIG, 0);
    local.writeUInt16LE(VERSION_NEEDED, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(entry.bytes.length, 18);
    local.writeUInt32LE(entry.bytes.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    const localRecord = Buffer.concat([local, name, entry.bytes]);
    locals.push(localRecord);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(CENTRAL_SIG, 0);
    central.writeUInt16LE(VERSION_MADE_BY, 4);
    central.writeUInt16LE(VERSION_NEEDED, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(entry.bytes.length, 20);
    central.writeUInt32LE(entry.bytes.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(EXTERNAL_ATTR, 38);
    central.writeUInt32LE(localOffset, 42);
    centrals.push(Buffer.concat([central, name]));

    localOffset = checkedU32(localOffset + localRecord.length);
  }

  const centralOffset = localOffset;
  const centralBytes = Buffer.concat(centrals);
  checkedU32(centralBytes.length);
  checkedU32(centralOffset);
  checkedU32(centralOffset + centralBytes.length);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(EOCD_SIG, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(sorted.length, 8);
  eocd.writeUInt16LE(sorted.length, 10);
  eocd.writeUInt32LE(centralBytes.length, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...locals, centralBytes, eocd]);
}

function verifyClassicStoredZip(raw, expectedEntries) {
  if (!Buffer.isBuffer(raw) || raw.length < 22) fail('ZIP_STRUCTURE_INVALID');
  const eocd = raw.length - 22;
  if (raw.readUInt32LE(eocd) !== EOCD_SIG) fail('ZIP_STRUCTURE_INVALID');
  if (raw.readUInt16LE(eocd + 4) !== 0 || raw.readUInt16LE(eocd + 6) !== 0) {
    fail('ZIP_SEMANTIC_FIELD_MISMATCH');
  }
  const entriesDisk = raw.readUInt16LE(eocd + 8);
  const entriesTotal = raw.readUInt16LE(eocd + 10);
  const centralSize = raw.readUInt32LE(eocd + 12);
  const centralOffset = raw.readUInt32LE(eocd + 16);
  if (raw.readUInt16LE(eocd + 20) !== 0) fail('ZIP_SEMANTIC_FIELD_MISMATCH');
  if (
    entriesDisk !== entriesTotal
    || entriesTotal === 0xffff
    || centralSize === 0xffffffff
    || centralOffset === 0xffffffff
    || centralOffset + centralSize !== eocd
  ) {
    fail('ZIP_STRUCTURE_INVALID');
  }

  const central = [];
  let cursor = centralOffset;
  for (let index = 0; index < entriesTotal; index += 1) {
    if (cursor + 46 > eocd || raw.readUInt32LE(cursor) !== CENTRAL_SIG) fail('ZIP_STRUCTURE_INVALID');
    const item = {
      madeBy: raw.readUInt16LE(cursor + 4),
      needed: raw.readUInt16LE(cursor + 6),
      flags: raw.readUInt16LE(cursor + 8),
      method: raw.readUInt16LE(cursor + 10),
      time: raw.readUInt16LE(cursor + 12),
      date: raw.readUInt16LE(cursor + 14),
      crc: raw.readUInt32LE(cursor + 16),
      csize: raw.readUInt32LE(cursor + 20),
      usize: raw.readUInt32LE(cursor + 24),
      nameLen: raw.readUInt16LE(cursor + 28),
      extraLen: raw.readUInt16LE(cursor + 30),
      commentLen: raw.readUInt16LE(cursor + 32),
      disk: raw.readUInt16LE(cursor + 34),
      internal: raw.readUInt16LE(cursor + 36),
      external: raw.readUInt32LE(cursor + 38),
      localOffset: raw.readUInt32LE(cursor + 42)
    };
    const end = cursor + 46 + item.nameLen + item.extraLen + item.commentLen;
    if (end > eocd) fail('ZIP_STRUCTURE_INVALID');
    const nameBytes = raw.subarray(cursor + 46, cursor + 46 + item.nameLen);
    if ([...nameBytes].some((byte) => byte > 0x7f)) fail('ZIP_SEMANTIC_FIELD_MISMATCH');
    item.name = nameBytes.toString('ascii');
    validateEntryName(item.name);
    if (
      item.madeBy !== VERSION_MADE_BY
      || item.needed !== VERSION_NEEDED
      || item.flags !== 0
      || item.method !== 0
      || item.time !== DOS_TIME
      || item.date !== DOS_DATE
      || item.extraLen !== 0
      || item.commentLen !== 0
      || item.disk !== 0
      || item.internal !== 0
      || item.external !== EXTERNAL_ATTR
    ) {
      fail('ZIP_SEMANTIC_FIELD_MISMATCH');
    }
    central.push(item);
    cursor = end;
  }
  if (cursor !== eocd) fail('ZIP_STRUCTURE_INVALID');
  for (let index = 1; index < central.length; index += 1) {
    if (asciiCompare(central[index - 1].name, central[index].name) >= 0) fail('ZIP_MEMBER_SET_MISMATCH');
  }

  const payloads = new Map();
  for (let index = 0; index < central.length; index += 1) {
    const item = central[index];
    const local = item.localOffset;
    if (local + 30 > centralOffset || raw.readUInt32LE(local) !== LOCAL_SIG) fail('ZIP_STRUCTURE_INVALID');
    const needed = raw.readUInt16LE(local + 4);
    const flags = raw.readUInt16LE(local + 6);
    const method = raw.readUInt16LE(local + 8);
    const time = raw.readUInt16LE(local + 10);
    const date = raw.readUInt16LE(local + 12);
    const crc = raw.readUInt32LE(local + 14);
    const csize = raw.readUInt32LE(local + 18);
    const usize = raw.readUInt32LE(local + 22);
    const nameLen = raw.readUInt16LE(local + 26);
    const extraLen = raw.readUInt16LE(local + 28);
    const nameStart = local + 30;
    const nameEnd = nameStart + nameLen;
    if (nameEnd + extraLen > centralOffset) fail('ZIP_STRUCTURE_INVALID');
    const name = raw.subarray(nameStart, nameEnd).toString('ascii');
    if (
      name !== item.name
      || needed !== item.needed
      || flags !== item.flags
      || method !== item.method
      || time !== item.time
      || date !== item.date
      || crc !== item.crc
      || csize !== item.csize
      || usize !== item.usize
      || extraLen !== 0
    ) {
      fail('ZIP_LOCAL_CENTRAL_MISMATCH');
    }
    const dataStart = nameEnd;
    const dataEnd = dataStart + csize;
    const nextOffset = index + 1 < central.length ? central[index + 1].localOffset : centralOffset;
    if (dataEnd !== nextOffset) fail('ZIP_STRUCTURE_INVALID');
    const payload = raw.subarray(dataStart, dataEnd);
    if (payload.length !== usize || crc32(payload) !== crc) fail('ZIP_CRC_MISMATCH');
    if (payloads.has(name)) fail('ZIP_MEMBER_SET_MISMATCH');
    payloads.set(name, Buffer.from(payload));
  }

  const expected = new Map(expectedEntries.map((entry) => [entry.name, entry.bytes]));
  if (expected.size !== expectedEntries.length || payloads.size !== expected.size) fail('ZIP_MEMBER_SET_MISMATCH');
  for (const [name, bytes] of expected) {
    if (!payloads.has(name)) fail('ZIP_MEMBER_SET_MISMATCH');
    if (!payloads.get(name).equals(bytes)) fail('ZIP_MEMBER_BYTE_MISMATCH');
  }

  return Object.freeze({
    entries: Object.freeze(central.map((item) => Object.freeze({
      name: item.name,
      bytes: payloads.get(item.name)
    })))
  });
}

function extractedInputs(candidateSha, packageInputs, verified) {
  return Object.freeze({
    schema: 'webclip-package-identity-inputs/v1',
    candidate_sha: candidateSha,
    package_schema: packageInputs.package_schema,
    path_profile: packageInputs.path_profile,
    members: Object.freeze(verified.entries.map((entry) => Object.freeze({
      path: entry.name,
      bytes: entry.bytes
    })))
  });
}

function passiveBuild(options) {
  const candidateSha = packageAuthority.normalizeCandidateSha(options && options.candidateSha);
  const admission = validateAdmission(candidateSha, options && options.candidateAdmission);
  const builderManifest = (options && options.builderManifest) || builderAuthority.readCanonicalManifest();
  const packageManifest = options && options.packageManifest;
  if (!packageManifest) fail('PACKAGE_PROJECTION_INVALID');

  const bcf = expectedBcf(builderManifest, packageManifest);
  if (admission.identities.bcf !== bcf) fail('BUILDER_CONTRACT_IDENTITY_MISMATCH');

  if (!options || typeof options.loadPackageInputs !== 'function') fail('PACKAGE_PROJECTION_INVALID');
  const packageInputs = normalizePackageInputs(options.loadPackageInputs(candidateSha), candidateSha);
  const stagedRpf = packageRpf(packageInputs);
  if (stagedRpf !== admission.identities.rpf) fail('STAGED_RPF_MISMATCH');

  const entries = normalizedEntries(packageInputs);
  let raw;
  try {
    raw = (options.buildFn || buildClassicStoredZip)(entries);
  } catch (error) {
    if (error && error.code) throw error;
    fail('ZIP_BUILD_FAILED');
  }
  const verified = verifyClassicStoredZip(raw, entries);
  const extracted = extractedInputs(candidateSha, packageInputs, verified);
  const extractedRpf = packageRpf(extracted);
  if (extractedRpf !== admission.identities.rpf) fail('ARCHIVE_RPF_MISMATCH');

  return Object.freeze({
    result: Object.freeze({
      schema: RESULT_SCHEMA,
      candidate_sha: candidateSha,
      state: 'verified',
      package_schema: packageInputs.package_schema,
      path_profile: packageInputs.path_profile,
      builder_profile: builderManifest.builder_profile,
      rpf: admission.identities.rpf,
      bcf: admission.identities.bcf,
      artifact_sha256: digestPrefixed(raw),
      artifact_bytes: raw.length,
      member_count: verified.entries.length,
      toolchain: Object.freeze({
        implementation: 'node-raw-zip-v1',
        version: process.version,
        platform: process.platform
      }),
      policy_mutation: false,
      receipt_mutation: false,
      readiness_mutation: false,
      official_artifact: false,
      release_authorized: false
    }),
    raw
  });
}

module.exports = Object.freeze({
  RESULT_SCHEMA,
  LOCAL_SIG,
  CENTRAL_SIG,
  EOCD_SIG,
  DOS_TIME,
  DOS_DATE,
  VERSION_NEEDED,
  VERSION_MADE_BY,
  EXTERNAL_MODE,
  EXTERNAL_ATTR,
  MAX_CLASSIC_ENTRIES,
  digestPrefixed,
  validateEntryName,
  normalizePackageInputs,
  packageRpf,
  validateAdmission,
  expectedBcf,
  crc32,
  normalizedEntries,
  buildClassicStoredZip,
  verifyClassicStoredZip,
  extractedInputs,
  passiveBuild
});
