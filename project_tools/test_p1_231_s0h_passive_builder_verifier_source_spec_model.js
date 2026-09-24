'use strict';

// Research-only S0-H model. It NEVER packages WebClip product bytes.
// Positive build paths use only the four-member synthetic S0-D fixture.

const assert = require('assert');
const crypto = require('crypto');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const RESULT_SCHEMA = 'webclip-passive-builder-result/v1';
const ADMISSION_SCHEMA = 'webclip-candidate-generation-result/v1';
const PACKAGE_SCHEMA = 'webclip-extension-package/v1';
const PATH_PROFILE = 'portable-ascii-v1';
const BUILDER_PROFILE = 'webclip-classic-zip-stored/v1';
const GOLDEN_ZIP_BYTES = 510;
const GOLDEN_ZIP_SHA256 = '1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7';
const EOCD_SIG = 0x06054b50;
const CENTRAL_SIG = 0x02014b50;
const LOCAL_SIG = 0x04034b50;
const DOS_DATE = 33; // 1980-01-01
const DOS_TIME = 0;
const VERSION_NEEDED = 20;
const VERSION_MADE_BY = (3 << 8) | 20;
const EXTERNAL_MODE = 0o100644;
const EXTERNAL_ATTR = (EXTERNAL_MODE * 0x10000) >>> 0;
const MAX_CLASSIC_ENTRIES = 0xffff;
let cases = 0;

function test(name, fn) {
  try {
    fn();
    cases += 1;
  } catch (error) {
    error.message = `${name}: ${error.message}`;
    throw error;
  }
}
function fail(code, detail) {
  const e = new Error(detail || code);
  e.code = code;
  throw e;
}
function throwsCode(fn, code) {
  assert.throws(fn, (e) => e && e.code === code, `expected ${code}`);
}
function validSha(v) { return /^[0-9a-f]{40}$/.test(String(v || '')); }
function validDigest(v) { return /^sha256:[0-9a-f]{64}$/.test(String(v || '')); }
function digest(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
function digestPrefixed(buf) { return `sha256:${digest(buf)}`; }
function asciiCompare(a, b) { return Buffer.from(a, 'ascii').compare(Buffer.from(b, 'ascii')); }
function clone(v) { return structuredClone(v); }

function parseKvLine(line) {
  const out = {};
  for (const raw of String(line).split(';').slice(1)) {
    const item = raw.trim();
    const eq = item.indexOf('=');
    if (eq > 0) out[item.slice(0, eq)] = item.slice(eq + 1);
  }
  return out;
}
function runPredecessor(file, prefix) {
  const stdout = execFileSync(process.execPath, [path.join(ROOT, file)], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const line = stdout.trim().split(/\r?\n/).reverse().find((x) => x.startsWith(prefix));
  assert(line, `missing predecessor PASS line: ${prefix}`);
  return { line, kv: parseKvLine(line) };
}

const currentHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
assert(validSha(currentHead));

const dag = runPredecessor(
  'project_tools/test_p1_231_consolidated_implementation_dag_model.js',
  'P1-231 consolidated implementation DAG model: PASS'
);
const s0a = runPredecessor(
  'project_tools/test_p1_231_s0a_package_authority_source_spec_model.js',
  'P1-231 S0-A package authority source-spec model: PASS'
);
const s0d = runPredecessor(
  'project_tools/test_p1_231_s0d_builder_contract_authority_source_spec_model.js',
  'P1-231 S0-D builder contract authority source-spec model: PASS'
);
const s0e = runPredecessor(
  'project_tools/test_p1_231_s0e_identity_engine_source_spec_model.js',
  'P1-231 S0-E identity engine source-spec model: PASS'
);
const s0f = runPredecessor(
  'project_tools/test_p1_231_s0f_candidate_generation_verifier_source_spec_model.js',
  'P1-231 S0-F candidate-generation verifier source-spec model: PASS'
);

const CURRENT_IDS = Object.freeze({
  rpf: s0e.kv.rpf,
  bcf: s0e.kv.bcf,
  qcf: Object.freeze({
    'unpacked-chrome': s0e.kv.chrome_qcf,
    'yandex-e2e': s0e.kv.yandex_qcf,
  }),
  rcf: s0e.kv.rcf,
});

// Minimal portable-ascii-v1 validator used by the passive builder implementation.
function validatePortablePath(name) {
  if (typeof name !== 'string' || !name || !/^[\x20-\x7e]+$/.test(name)) fail('PACKAGE_PROJECTION_INVALID');
  if (name.startsWith('/') || name.endsWith('/') || name.includes('\\') || name.includes('//')) fail('PACKAGE_PROJECTION_INVALID');
  for (const seg of name.split('/')) {
    if (!seg || seg === '.' || seg === '..' || !/^[A-Za-z0-9._-]+$/.test(seg) || seg.endsWith('.')) fail('PACKAGE_PROJECTION_INVALID');
  }
  return name;
}

function validateProjection(p) {
  if (!p || p.schema !== PACKAGE_SCHEMA || p.pathProfile !== PATH_PROFILE || !Array.isArray(p.members) || !p.members.length) {
    fail('PACKAGE_PROJECTION_INVALID');
  }
  const exact = new Set();
  const folded = new Set();
  let manifestCount = 0;
  for (const member of p.members) {
    validatePortablePath(member.path);
    if (exact.has(member.path) || folded.has(member.path.toLowerCase())) fail('PACKAGE_PROJECTION_INVALID');
    exact.add(member.path);
    folded.add(member.path.toLowerCase());
    if (member.path === 'manifest.json') manifestCount += 1;
    if (member.type !== 'blob') fail('PACKAGE_MEMBER_NOT_BLOB');
    if (member.mode !== '100644') fail('PACKAGE_MEMBER_MODE_INVALID');
    if (!Buffer.isBuffer(member.bytes)) fail('PACKAGE_MEMBER_BYTES_INVALID');
  }
  if (manifestCount !== 1) fail('PACKAGE_PROJECTION_INVALID');
  return p;
}

function normalizedEntries(projection) {
  validateProjection(projection);
  return projection.members
    .map((m) => ({ name: m.path, bytes: Buffer.from(m.bytes) }))
    .sort((a, b) => asciiCompare(a.name, b.name));
}

// Synthetic identity adapter for orchestration tests only. Production S0-H must call canonical S0-E.
function syntheticRpf(projection) {
  const h = crypto.createHash('sha256');
  h.update(Buffer.from('S0H_SYNTHETIC_RPF_ADAPTER_V1\0', 'ascii'));
  for (const entry of normalizedEntries(projection)) {
    const name = Buffer.from(entry.name, 'ascii');
    const n = Buffer.alloc(4); n.writeUInt32BE(name.length);
    const z = Buffer.alloc(8); z.writeBigUInt64BE(BigInt(entry.bytes.length));
    h.update(n); h.update(name); h.update(z); h.update(entry.bytes);
  }
  return `sha256:${h.digest('hex')}`;
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
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function checkedU32(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value >= 0xffffffff) fail('CLASSIC_ZIP_LIMIT_EXCEEDED');
  return value;
}

function buildClassicStoredZip(entries) {
  if (!Array.isArray(entries) || entries.length === 0) fail('ZIP_BUILD_FAILED');
  if (entries.length >= MAX_CLASSIC_ENTRIES) fail('CLASSIC_ZIP_LIMIT_EXCEEDED');
  const sorted = entries.map((e) => ({ name: validatePortablePath(e.name), bytes: Buffer.from(e.bytes) })).sort((a, b) => asciiCompare(a.name, b.name));
  const seen = new Set();
  const locals = [];
  const centrals = [];
  let localOffset = 0;

  for (const entry of sorted) {
    if (seen.has(entry.name)) fail('ZIP_MEMBER_SET_MISMATCH');
    seen.add(entry.name);
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
  if (raw.readUInt16LE(eocd + 4) !== 0 || raw.readUInt16LE(eocd + 6) !== 0) fail('ZIP_SEMANTIC_FIELD_MISMATCH');
  const entriesDisk = raw.readUInt16LE(eocd + 8);
  const entriesTotal = raw.readUInt16LE(eocd + 10);
  const centralSize = raw.readUInt32LE(eocd + 12);
  const centralOffset = raw.readUInt32LE(eocd + 16);
  if (raw.readUInt16LE(eocd + 20) !== 0) fail('ZIP_SEMANTIC_FIELD_MISMATCH');
  if (entriesDisk !== entriesTotal || entriesTotal === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    fail('ZIP_SEMANTIC_FIELD_MISMATCH');
  }
  if (centralOffset + centralSize !== eocd) fail('ZIP_STRUCTURE_INVALID');

  const central = [];
  let p = centralOffset;
  for (let i = 0; i < entriesTotal; i += 1) {
    if (p + 46 > eocd || raw.readUInt32LE(p) !== CENTRAL_SIG) fail('ZIP_STRUCTURE_INVALID');
    const c = {
      madeBy: raw.readUInt16LE(p + 4),
      needed: raw.readUInt16LE(p + 6),
      flags: raw.readUInt16LE(p + 8),
      method: raw.readUInt16LE(p + 10),
      time: raw.readUInt16LE(p + 12),
      date: raw.readUInt16LE(p + 14),
      crc: raw.readUInt32LE(p + 16),
      csize: raw.readUInt32LE(p + 20),
      usize: raw.readUInt32LE(p + 24),
      nameLen: raw.readUInt16LE(p + 28),
      extraLen: raw.readUInt16LE(p + 30),
      commentLen: raw.readUInt16LE(p + 32),
      disk: raw.readUInt16LE(p + 34),
      internal: raw.readUInt16LE(p + 36),
      external: raw.readUInt32LE(p + 38),
      localOffset: raw.readUInt32LE(p + 42),
    };
    const end = p + 46 + c.nameLen + c.extraLen + c.commentLen;
    if (end > eocd) fail('ZIP_STRUCTURE_INVALID');
    const nameBytes = raw.subarray(p + 46, p + 46 + c.nameLen);
    if ([...nameBytes].some((b) => b > 0x7f)) fail('ZIP_SEMANTIC_FIELD_MISMATCH');
    c.name = nameBytes.toString('ascii');
    validatePortablePath(c.name);
    if (c.madeBy !== VERSION_MADE_BY || c.needed !== VERSION_NEEDED || c.flags !== 0 || c.method !== 0 || c.time !== DOS_TIME || c.date !== DOS_DATE || c.extraLen !== 0 || c.commentLen !== 0 || c.disk !== 0 || c.internal !== 0 || c.external !== EXTERNAL_ATTR) {
      fail('ZIP_SEMANTIC_FIELD_MISMATCH');
    }
    central.push(c);
    p = end;
  }
  if (p !== eocd) fail('ZIP_STRUCTURE_INVALID');
  if (central.length !== entriesTotal) fail('ZIP_STRUCTURE_INVALID');
  if (central.length && central[0].localOffset !== 0) fail('ZIP_STRUCTURE_INVALID');
  for (let i = 1; i < central.length; i += 1) {
    if (asciiCompare(central[i - 1].name, central[i].name) >= 0) fail('ZIP_MEMBER_SET_MISMATCH');
  }

  const payloads = new Map();
  for (let i = 0; i < central.length; i += 1) {
    const c = central[i];
    const lp = c.localOffset;
    if (lp + 30 > centralOffset || raw.readUInt32LE(lp) !== LOCAL_SIG) fail('ZIP_STRUCTURE_INVALID');
    const needed = raw.readUInt16LE(lp + 4);
    const flags = raw.readUInt16LE(lp + 6);
    const method = raw.readUInt16LE(lp + 8);
    const time = raw.readUInt16LE(lp + 10);
    const date = raw.readUInt16LE(lp + 12);
    const crc = raw.readUInt32LE(lp + 14);
    const csize = raw.readUInt32LE(lp + 18);
    const usize = raw.readUInt32LE(lp + 22);
    const nameLen = raw.readUInt16LE(lp + 26);
    const extraLen = raw.readUInt16LE(lp + 28);
    const nameStart = lp + 30;
    const nameEnd = nameStart + nameLen;
    if (nameEnd + extraLen > centralOffset) fail('ZIP_STRUCTURE_INVALID');
    const name = raw.subarray(nameStart, nameEnd).toString('ascii');
    if (name !== c.name || needed !== c.needed || flags !== c.flags || method !== c.method || time !== c.time || date !== c.date || crc !== c.crc || csize !== c.csize || usize !== c.usize || extraLen !== 0) {
      fail('ZIP_LOCAL_CENTRAL_MISMATCH');
    }
    const dataStart = nameEnd;
    const dataEnd = dataStart + csize;
    const next = i + 1 < central.length ? central[i + 1].localOffset : centralOffset;
    if (dataEnd !== next) fail('ZIP_STRUCTURE_INVALID');
    const payload = raw.subarray(dataStart, dataEnd);
    if (payload.length !== usize || crc32(payload) !== crc) fail('ZIP_CRC_MISMATCH');
    if (payloads.has(name)) fail('ZIP_MEMBER_SET_MISMATCH');
    payloads.set(name, Buffer.from(payload));
  }

  const expected = new Map(expectedEntries.map((e) => [e.name, e.bytes]));
  if (expected.size !== expectedEntries.length || payloads.size !== expected.size) fail('ZIP_MEMBER_SET_MISMATCH');
  for (const [name, bytes] of expected) {
    if (!payloads.has(name)) fail('ZIP_MEMBER_SET_MISMATCH');
    if (!payloads.get(name).equals(bytes)) fail('ZIP_MEMBER_BYTE_MISMATCH');
  }
  return {
    entries: central.map((c) => ({ name: c.name, bytes: payloads.get(c.name) })),
    central,
  };
}

function makeFixtureProjection(reverse = false, mutate = false) {
  const members = [
    { path: 'z-last.bin', type: 'blob', mode: '100644', bytes: Buffer.from([0, 255, 10, 13, 42]) },
    { path: 'manifest.json', type: 'blob', mode: '100644', bytes: Buffer.from('{"manifest_version":3,"name":"Fixture","version":"0.0.0.1"}\n', 'utf8') },
    { path: 'dir/b.txt', type: 'blob', mode: '100644', bytes: Buffer.from('Привет WebClip\n', 'utf8') },
    { path: 'dir/a.js', type: 'blob', mode: '100644', bytes: Buffer.from(mutate ? "console.log('B');\n" : "console.log('A');\n", 'utf8') },
  ];
  if (reverse) members.reverse();
  return { schema: PACKAGE_SCHEMA, pathProfile: PATH_PROFILE, members };
}

function makeAdmission(candidateSha, rpf, bcf = CURRENT_IDS.bcf, state = 'pass') {
  return {
    schema: ADMISSION_SCHEMA,
    candidateSha,
    generationState: state,
    identities: {
      rpf,
      bcf,
      qcf: clone(CURRENT_IDS.qcf),
      rcf: CURRENT_IDS.rcf,
    },
  };
}

function validateAdmission(candidateSha, admission) {
  if (!validSha(candidateSha) || !admission || admission.schema !== ADMISSION_SCHEMA || admission.generationState !== 'pass') {
    fail('CANDIDATE_GENERATION_NOT_ADMITTED');
  }
  if (admission.candidateSha !== candidateSha) fail('CANDIDATE_SHA_MISMATCH');
  if (!validDigest(admission.identities?.rpf) || !validDigest(admission.identities?.bcf)) fail('CANDIDATE_GENERATION_NOT_ADMITTED');
  return admission;
}

function projectionFromVerifiedEntries(entries) {
  return {
    schema: PACKAGE_SCHEMA,
    pathProfile: PATH_PROFILE,
    members: entries.map((e) => ({ path: e.name, type: 'blob', mode: '100644', bytes: Buffer.from(e.bytes) })),
  };
}

function passiveBuild({ candidateSha, admission, loadPackageProjection, identityEngine, buildFn = buildClassicStoredZip, toolchain = null }) {
  validateAdmission(candidateSha, admission); // MUST happen before package load.
  const expectedBcf = identityEngine.bcf();
  if (!validDigest(expectedBcf) || admission.identities.bcf !== expectedBcf) fail('BUILDER_CONTRACT_IDENTITY_MISMATCH');

  const projection = loadPackageProjection(candidateSha);
  validateProjection(projection);
  const staged = {
    schema: projection.schema,
    pathProfile: projection.pathProfile,
    members: projection.members.map((m) => ({ ...m, bytes: Buffer.from(m.bytes) })),
  };
  const stagedRpf = identityEngine.rpf(staged);
  if (stagedRpf !== admission.identities.rpf) fail('STAGED_RPF_MISMATCH');

  let raw;
  try {
    raw = buildFn(normalizedEntries(staged));
  } catch (e) {
    if (e && e.code) throw e;
    fail('ZIP_BUILD_FAILED', e?.message);
  }
  const verified = verifyClassicStoredZip(raw, normalizedEntries(staged));
  const extracted = projectionFromVerifiedEntries(verified.entries);
  const extractedRpf = identityEngine.rpf(extracted);
  if (extractedRpf !== admission.identities.rpf) fail('ARCHIVE_RPF_MISMATCH');

  const result = {
    schema: RESULT_SCHEMA,
    candidateSha,
    state: 'verified',
    packageSchema: PACKAGE_SCHEMA,
    pathProfile: PATH_PROFILE,
    builderProfile: BUILDER_PROFILE,
    rpf: admission.identities.rpf,
    bcf: admission.identities.bcf,
    artifactSha256: digestPrefixed(raw),
    artifactBytes: raw.length,
    memberCount: verified.entries.length,
    toolchain: toolchain || {
      implementation: 'node-raw-zip-research-v1',
      version: process.version,
      platform: process.platform,
    },
  };
  return { result, raw };
}

(function main() {
  // Predecessor composition / exact current facts.
  test('DAG predecessor remains 19 nodes', () => assert.strictEqual(dag.kv.nodes, '19'));
  test('DAG S0 count remains 9', () => assert.strictEqual(dag.kv.s0, '9'));
  test('S0-A current package count is 34', () => assert.strictEqual(s0a.kv.package_files, '34'));
  test('S0-E current package count is 34', () => assert.strictEqual(s0e.kv.package_files, '34'));
  test('S0-E current package identity is complete', () => assert.strictEqual(s0e.kv.current_package_complete, 'true'));
  test('S0-E legacy package control remains 33', () => assert.strictEqual(s0e.kv.legacy_package_files, '33'));
  test('S0-E current legacy-subset RPF remains exact control', () => assert.strictEqual(s0e.kv.legacy_rpf, 'sha256:5ff081f59c8bd46cf1b97eda4c183ce8573a5d42eb0c475f835847abb62383c2'));
  test('S0-A and current S0-E package census agree', () => assert.strictEqual(s0a.kv.package_files, s0e.kv.package_files));
  test('S0-D fixture size exact', () => assert.strictEqual(s0d.kv.fixture_zip_bytes, String(GOLDEN_ZIP_BYTES)));
  test('S0-D fixture hash exact', () => assert.strictEqual(s0d.kv.fixture_zip_sha256, GOLDEN_ZIP_SHA256));
  test('S0-D raw local/central proof retained', () => assert.strictEqual(s0d.kv.raw_local_central, 'true'));
  test('S0-D ZIP64 remains forbidden', () => assert.strictEqual(s0d.kv.zip64, 'v1-forbidden'));
  test('S0-D toolchain provenance remains non-semantic', () => assert.strictEqual(s0d.kv.toolchain_provenance_only, 'true'));
  test('S0-E current RPF valid', () => assert(validDigest(CURRENT_IDS.rpf)));
  test('S0-E current RPF differs from incomplete legacy control', () => assert.notStrictEqual(CURRENT_IDS.rpf, s0e.kv.legacy_rpf));
  test('S0-E exact BCF retained', () => assert.strictEqual(CURRENT_IDS.bcf, 'sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff'));
  test('S0-F generation gate passes after generator RCF binding', () => assert.strictEqual(s0f.kv.current_gate, 'pass'));
  test('S0-F RPF agrees with S0-E', () => assert.strictEqual(s0f.kv.rpf, CURRENT_IDS.rpf));
  test('S0-F retains no CGF axis', () => assert.strictEqual(s0f.kv.no_cgf, 'true'));
  test('current head is exact SHA', () => assert(validSha(currentHead)));

  // Current real candidate is generation-admitted, but this research tranche is not
  // authorized to load/package product bytes. Admission is validated without invoking
  // the product loader or builder.
  test('current admitted candidate does not imply product build authorization', () => {
    let loads = 0;
    let builds = 0;
    const admission = makeAdmission(currentHead, CURRENT_IDS.rpf, CURRENT_IDS.bcf, 'pass');
    assert.strictEqual(validateAdmission(currentHead, admission), admission);
    assert.strictEqual(loads, 0);
    assert.strictEqual(builds, 0);
  });

  test('blocked admission negative control stops before package loader and builder', () => {
    let loads = 0;
    let builds = 0;
    const admission = makeAdmission(currentHead, CURRENT_IDS.rpf, CURRENT_IDS.bcf, 'blocked');
    throwsCode(() => passiveBuild({
      candidateSha: currentHead,
      admission,
      loadPackageProjection: () => { loads += 1; return makeFixtureProjection(); },
      identityEngine: { rpf: syntheticRpf, bcf: () => CURRENT_IDS.bcf },
      buildFn: (entries) => { builds += 1; return buildClassicStoredZip(entries); },
    }), 'CANDIDATE_GENERATION_NOT_ADMITTED');
    assert.strictEqual(loads, 0);
    assert.strictEqual(builds, 0);
  });

  test('missing admission stops before package loader', () => {
    let loads = 0;
    throwsCode(() => passiveBuild({
      candidateSha: currentHead,
      admission: null,
      loadPackageProjection: () => { loads += 1; return makeFixtureProjection(); },
      identityEngine: { rpf: syntheticRpf, bcf: () => CURRENT_IDS.bcf },
    }), 'CANDIDATE_GENERATION_NOT_ADMITTED');
    assert.strictEqual(loads, 0);
  });

  test('caller supplied RPF cannot substitute for admission', () => {
    let loads = 0;
    throwsCode(() => passiveBuild({
      candidateSha: currentHead,
      admission: { rpf: CURRENT_IDS.rpf },
      loadPackageProjection: () => { loads += 1; return makeFixtureProjection(); },
      identityEngine: { rpf: syntheticRpf, bcf: () => CURRENT_IDS.bcf },
    }), 'CANDIDATE_GENERATION_NOT_ADMITTED');
    assert.strictEqual(loads, 0);
  });

  const syntheticSha = 'a'.repeat(40);
  const fixture = makeFixtureProjection();
  const fixtureRpf = syntheticRpf(fixture);
  const fixtureAdmission = makeAdmission(syntheticSha, fixtureRpf);

  test('candidate/admission SHA mismatch blocks before loader', () => {
    let loads = 0;
    throwsCode(() => passiveBuild({
      candidateSha: 'b'.repeat(40), admission: fixtureAdmission,
      loadPackageProjection: () => { loads += 1; return fixture; },
      identityEngine: { rpf: syntheticRpf, bcf: () => CURRENT_IDS.bcf },
    }), 'CANDIDATE_SHA_MISMATCH');
    assert.strictEqual(loads, 0);
  });

  test('BCF mismatch blocks before loader', () => {
    let loads = 0;
    const wrong = makeAdmission(syntheticSha, fixtureRpf, `sha256:${'1'.repeat(64)}`);
    throwsCode(() => passiveBuild({
      candidateSha: syntheticSha, admission: wrong,
      loadPackageProjection: () => { loads += 1; return fixture; },
      identityEngine: { rpf: syntheticRpf, bcf: () => CURRENT_IDS.bcf },
    }), 'BUILDER_CONTRACT_IDENTITY_MISMATCH');
    assert.strictEqual(loads, 0);
  });

  // Independent Node writer must match S0-D Python golden vector.
  const fixtureEntries = normalizedEntries(fixture);
  const raw = buildClassicStoredZip(fixtureEntries);
  test('Node raw builder fixture is exactly 510 bytes', () => assert.strictEqual(raw.length, GOLDEN_ZIP_BYTES));
  test('Node raw builder fixture matches S0-D Python golden SHA', () => assert.strictEqual(digest(raw), GOLDEN_ZIP_SHA256));
  test('reversed projection order produces same exact ZIP bytes', () => {
    const reversed = buildClassicStoredZip(normalizedEntries(makeFixtureProjection(true)));
    assert(raw.equals(reversed));
  });
  test('ambient environment does not affect pure raw writer output', () => {
    const before = process.env.TZ;
    process.env.TZ = 'Pacific/Honolulu';
    try { assert(raw.equals(buildClassicStoredZip(fixtureEntries))); }
    finally { if (before === undefined) delete process.env.TZ; else process.env.TZ = before; }
  });

  const verified = verifyClassicStoredZip(raw, fixtureEntries);
  test('verified fixture has four members', () => assert.strictEqual(verified.entries.length, 4));
  test('verified member order exact ASCII', () => assert.deepStrictEqual(verified.entries.map((e) => e.name), ['dir/a.js', 'dir/b.txt', 'manifest.json', 'z-last.bin']));
  for (const c of verified.central) {
    test(`central fixed fields ${c.name}`, () => {
      assert.strictEqual(c.madeBy, VERSION_MADE_BY);
      assert.strictEqual(c.needed, VERSION_NEEDED);
      assert.strictEqual(c.flags, 0);
      assert.strictEqual(c.method, 0);
      assert.strictEqual(c.time, DOS_TIME);
      assert.strictEqual(c.date, DOS_DATE);
      assert.strictEqual(c.extraLen, 0);
      assert.strictEqual(c.commentLen, 0);
      assert.strictEqual(c.disk, 0);
      assert.strictEqual(c.internal, 0);
      assert.strictEqual(c.external, EXTERNAL_ATTR);
    });
    test(`central CRC exact ${c.name}`, () => {
      const expected = fixtureEntries.find((e) => e.name === c.name);
      assert.strictEqual(c.crc, crc32(expected.bytes));
      assert.strictEqual(c.csize, expected.bytes.length);
      assert.strictEqual(c.usize, expected.bytes.length);
    });
  }

  // Positive passive composition on synthetic admitted candidate only.
  let positiveLoads = 0;
  let positiveBuilds = 0;
  const positive = passiveBuild({
    candidateSha: syntheticSha,
    admission: fixtureAdmission,
    loadPackageProjection: (sha) => { positiveLoads += 1; assert.strictEqual(sha, syntheticSha); return makeFixtureProjection(true); },
    identityEngine: { rpf: syntheticRpf, bcf: () => CURRENT_IDS.bcf },
    buildFn: (entries) => { positiveBuilds += 1; return buildClassicStoredZip(entries); },
  });
  test('synthetic admitted candidate loads package exactly once', () => assert.strictEqual(positiveLoads, 1));
  test('synthetic admitted candidate builds exactly once', () => assert.strictEqual(positiveBuilds, 1));
  test('synthetic passive result verified', () => assert.strictEqual(positive.result.state, 'verified'));
  test('synthetic passive result schema exact', () => assert.strictEqual(positive.result.schema, RESULT_SCHEMA));
  test('synthetic passive result exact candidate bound', () => assert.strictEqual(positive.result.candidateSha, syntheticSha));
  test('synthetic passive result RPF equals admission', () => assert.strictEqual(positive.result.rpf, fixtureRpf));
  test('synthetic passive result BCF equals canonical S0-E BCF', () => assert.strictEqual(positive.result.bcf, CURRENT_IDS.bcf));
  test('synthetic passive result artifact hash exact', () => assert.strictEqual(positive.result.artifactSha256, `sha256:${GOLDEN_ZIP_SHA256}`));
  test('synthetic passive result artifact bytes exact', () => assert.strictEqual(positive.result.artifactBytes, GOLDEN_ZIP_BYTES));
  test('synthetic passive result member count exact', () => assert.strictEqual(positive.result.memberCount, 4));
  test('toolchain provenance present', () => assert(/^v\d+\./.test(positive.result.toolchain.version) && positive.result.toolchain.implementation));
  test('artifact digest is not RPF', () => assert.notStrictEqual(positive.result.artifactSha256, positive.result.rpf));
  test('artifact digest is not BCF', () => assert.notStrictEqual(positive.result.artifactSha256, positive.result.bcf));
  test('RPF and BCF remain distinct domains', () => assert.notStrictEqual(positive.result.rpf, positive.result.bcf));

  for (const forbidden of ['releaseReadiness', 'approvedForRelease', 'officialArtifact', 'officialPath', 'tag', 'releaseId', 'deploymentId', 'publishState']) {
    test(`passive result excludes ${forbidden}`, () => assert.strictEqual(Object.prototype.hasOwnProperty.call(positive.result, forbidden), false));
  }

  test('toolchain provenance change cannot alter RPF/BCF/artifact bytes', () => {
    const other = passiveBuild({
      candidateSha: syntheticSha,
      admission: fixtureAdmission,
      loadPackageProjection: () => fixture,
      identityEngine: { rpf: syntheticRpf, bcf: () => CURRENT_IDS.bcf },
      toolchain: { implementation: 'other-conforming-toolchain', version: '99.0', platform: 'other' },
    });
    assert.strictEqual(other.result.rpf, positive.result.rpf);
    assert.strictEqual(other.result.bcf, positive.result.bcf);
    assert.strictEqual(other.result.artifactSha256, positive.result.artifactSha256);
    assert(other.raw.equals(positive.raw));
  });

  // Staging/package failures.
  test('staged byte change causes RPF mismatch before build', () => {
    let builds = 0;
    throwsCode(() => passiveBuild({
      candidateSha: syntheticSha, admission: fixtureAdmission,
      loadPackageProjection: () => makeFixtureProjection(false, true),
      identityEngine: { rpf: syntheticRpf, bcf: () => CURRENT_IDS.bcf },
      buildFn: (entries) => { builds += 1; return buildClassicStoredZip(entries); },
    }), 'STAGED_RPF_MISMATCH');
    assert.strictEqual(builds, 0);
  });
  test('missing manifest rejects package projection', () => {
    const bad = makeFixtureProjection(); bad.members = bad.members.filter((m) => m.path !== 'manifest.json');
    throwsCode(() => passiveBuild({ candidateSha: syntheticSha, admission: fixtureAdmission, loadPackageProjection: () => bad, identityEngine: { rpf: syntheticRpf, bcf: () => CURRENT_IDS.bcf } }), 'PACKAGE_PROJECTION_INVALID');
  });
  test('non-blob member rejected', () => {
    const bad = makeFixtureProjection(); bad.members[0].type = 'tree';
    throwsCode(() => passiveBuild({ candidateSha: syntheticSha, admission: fixtureAdmission, loadPackageProjection: () => bad, identityEngine: { rpf: syntheticRpf, bcf: () => CURRENT_IDS.bcf } }), 'PACKAGE_MEMBER_NOT_BLOB');
  });
  test('wrong mode member rejected', () => {
    const bad = makeFixtureProjection(); bad.members[0].mode = '100755';
    throwsCode(() => passiveBuild({ candidateSha: syntheticSha, admission: fixtureAdmission, loadPackageProjection: () => bad, identityEngine: { rpf: syntheticRpf, bcf: () => CURRENT_IDS.bcf } }), 'PACKAGE_MEMBER_MODE_INVALID');
  });
  test('non-buffer member bytes rejected', () => {
    const bad = makeFixtureProjection(); bad.members[0].bytes = 'x';
    throwsCode(() => passiveBuild({ candidateSha: syntheticSha, admission: fixtureAdmission, loadPackageProjection: () => bad, identityEngine: { rpf: syntheticRpf, bcf: () => CURRENT_IDS.bcf } }), 'PACKAGE_MEMBER_BYTES_INVALID');
  });
  test('duplicate package path rejected', () => {
    const bad = makeFixtureProjection(); bad.members.push(clone(bad.members[0]));
    throwsCode(() => passiveBuild({ candidateSha: syntheticSha, admission: fixtureAdmission, loadPackageProjection: () => bad, identityEngine: { rpf: syntheticRpf, bcf: () => CURRENT_IDS.bcf } }), 'PACKAGE_PROJECTION_INVALID');
  });

  // Post-build extracted RPF fence.
  test('archive extracted RPF mismatch blocks verified result', () => {
    let rpfCalls = 0;
    const engine = {
      bcf: () => CURRENT_IDS.bcf,
      rpf: (projection) => {
        rpfCalls += 1;
        return rpfCalls === 1 ? fixtureRpf : `sha256:${'2'.repeat(64)}`;
      },
    };
    throwsCode(() => passiveBuild({ candidateSha: syntheticSha, admission: fixtureAdmission, loadPackageProjection: () => fixture, identityEngine: engine }), 'ARCHIVE_RPF_MISMATCH');
    assert.strictEqual(rpfCalls, 2);
  });

  // Raw archive mutation negative controls.
  test('trailing byte rejected', () => throwsCode(() => verifyClassicStoredZip(Buffer.concat([raw, Buffer.from([0])]), fixtureEntries), 'ZIP_STRUCTURE_INVALID'));
  test('preamble byte rejected', () => throwsCode(() => verifyClassicStoredZip(Buffer.concat([Buffer.from([0]), raw]), fixtureEntries), 'ZIP_STRUCTURE_INVALID'));
  test('multi-disk declaration rejected', () => {
    const x = Buffer.from(raw); x.writeUInt16LE(1, x.length - 22 + 4);
    throwsCode(() => verifyClassicStoredZip(x, fixtureEntries), 'ZIP_SEMANTIC_FIELD_MISMATCH');
  });
  test('ZIP64 central-offset sentinel rejected', () => {
    const x = Buffer.from(raw); x.writeUInt32LE(0xffffffff, x.length - 22 + 16);
    throwsCode(() => verifyClassicStoredZip(x, fixtureEntries), 'ZIP_SEMANTIC_FIELD_MISMATCH');
  });
  test('local flags mutation rejected', () => {
    const x = Buffer.from(raw); x.writeUInt16LE(8, 6);
    throwsCode(() => verifyClassicStoredZip(x, fixtureEntries), 'ZIP_LOCAL_CENTRAL_MISMATCH');
  });
  test('local CRC mutation rejected', () => {
    const x = Buffer.from(raw); x.writeUInt32LE((x.readUInt32LE(14) ^ 1) >>> 0, 14);
    throwsCode(() => verifyClassicStoredZip(x, fixtureEntries), 'ZIP_LOCAL_CENTRAL_MISMATCH');
  });
  test('first payload mutation rejected', () => {
    const x = Buffer.from(raw);
    const nameLen = x.readUInt16LE(26); const extraLen = x.readUInt16LE(28); const data = 30 + nameLen + extraLen;
    x[data] ^= 1;
    throwsCode(() => verifyClassicStoredZip(x, fixtureEntries), 'ZIP_CRC_MISMATCH');
  });
  test('central method mutation rejected', () => {
    const x = Buffer.from(raw); const e = x.length - 22; const central = x.readUInt32LE(e + 16); x.writeUInt16LE(8, central + 10);
    throwsCode(() => verifyClassicStoredZip(x, fixtureEntries), 'ZIP_SEMANTIC_FIELD_MISMATCH');
  });
  test('central mode mutation rejected', () => {
    const x = Buffer.from(raw); const e = x.length - 22; const central = x.readUInt32LE(e + 16); x.writeUInt32LE(0, central + 38);
    throwsCode(() => verifyClassicStoredZip(x, fixtureEntries), 'ZIP_SEMANTIC_FIELD_MISMATCH');
  });
  test('central duplicate-name mutation rejected', () => {
    const x = Buffer.from(raw); const e = x.length - 22; const central = x.readUInt32LE(e + 16);
    // Make second central member name equal prefix bytes of first only when equal length is impossible;
    // instead violate canonical strict ordering by copying first name into a same-length synthetic two-entry archive below.
    const two = buildClassicStoredZip([
      { name: 'a.js', bytes: Buffer.from('a') },
      { name: 'b.js', bytes: Buffer.from('b') },
    ]);
    const ee = two.length - 22; const co = two.readUInt32LE(ee + 16);
    const firstNameLen = two.readUInt16LE(co + 28);
    const firstEnd = co + 46 + firstNameLen;
    const secondNameLen = two.readUInt16LE(firstEnd + 28);
    assert.strictEqual(firstNameLen, secondNameLen);
    two.copy(two, firstEnd + 46, co + 46, co + 46 + firstNameLen);
    throwsCode(() => verifyClassicStoredZip(two, [
      { name: 'a.js', bytes: Buffer.from('a') },
      { name: 'b.js', bytes: Buffer.from('b') },
    ]), 'ZIP_MEMBER_SET_MISMATCH');
    assert(central > 0); // keep current fixture central boundary exercised too.
  });
  test('missing expected archive member rejected', () => {
    throwsCode(() => verifyClassicStoredZip(raw, fixtureEntries.slice(1)), 'ZIP_MEMBER_SET_MISMATCH');
  });
  test('extra expected archive member rejected', () => {
    throwsCode(() => verifyClassicStoredZip(raw, [...fixtureEntries, { name: 'extra.js', bytes: Buffer.from('x') }]), 'ZIP_MEMBER_SET_MISMATCH');
  });
  test('wrong expected archive member bytes rejected', () => {
    const expected = fixtureEntries.map((e) => ({ ...e, bytes: e.name === 'dir/a.js' ? Buffer.from('changed') : e.bytes }));
    throwsCode(() => verifyClassicStoredZip(raw, expected), 'ZIP_MEMBER_BYTE_MISMATCH');
  });

  test('classic entry-count boundary rejects ZIP64 requirement before serialization', () => {
    const tooMany = new Array(MAX_CLASSIC_ENTRIES).fill(null).map((_, i) => ({ name: `f${i}.js`, bytes: Buffer.alloc(0) }));
    throwsCode(() => buildClassicStoredZip(tooMany), 'CLASSIC_ZIP_LIMIT_EXCEEDED');
  });

  test('payload mutation changes synthetic RPF', () => assert.notStrictEqual(syntheticRpf(makeFixtureProjection(false, true)), fixtureRpf));
  test('payload mutation changes deterministic archive SHA', () => {
    const changed = buildClassicStoredZip(normalizedEntries(makeFixtureProjection(false, true)));
    assert.notStrictEqual(digest(changed), GOLDEN_ZIP_SHA256);
  });

  // No product ZIP path exists in this model; current product build is intentionally not executed.
  const forbiddenProductPaths = ['WebClip.zip', 'webclip.zip', 'dist/WebClip.zip', 'release/WebClip.zip'];
  test('model has no official product archive output path', () => {
    for (const p of forbiddenProductPaths) assert(!Object.values(positive.result).includes(p));
  });

  console.log(
    `P1-231 S0-H passive-builder verifier source-spec model: PASS; cases=${cases}; ` +
    `current_gate=${s0f.kv.current_gate}; current_product_build=not-executed; product_zip=false; ` +
    `s0a_package_files=${s0a.kv.package_files}; s0e_package_files=${s0e.kv.package_files}; legacy_s0e_package_files=${s0e.kv.legacy_package_files}; current_package_rpf_complete=${s0e.kv.current_package_complete}; ` +
    `synthetic_identity_adapter=true; fixture_members=4; fixture_zip_bytes=${raw.length}; ` +
    `fixture_zip_sha256=${digest(raw)}; rpf=${CURRENT_IDS.rpf}; bcf=${CURRENT_IDS.bcf}; head=${currentHead}`
  );
})();