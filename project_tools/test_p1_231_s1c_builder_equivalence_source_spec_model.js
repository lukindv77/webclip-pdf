'use strict';

// Research-only S1-C model.
// It NEVER packages WebClip product bytes. Positive builder-equivalence paths
// use only the established four-member synthetic S0-D/S0-H fixture.

const assert = require('assert');
const crypto = require('crypto');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const RESULT_SCHEMA = 'webclip-builder-equivalence/v1';
const SHADOW_SCHEMA = 'webclip-shadow-identity/v1';
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
function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
function digestPrefixed(buf) { return `sha256:${sha256(buf)}`; }
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
const canonicalZip = runPredecessor(
  'project_tools/test_p1_231_package_builder_canonicalization_model.js',
  'P1-231 package builder canonicalization model: PASS'
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
const s0h = runPredecessor(
  'project_tools/test_p1_231_s0h_passive_builder_verifier_source_spec_model.js',
  'P1-231 S0-H passive-builder verifier source-spec model: PASS'
);
const s1a = runPredecessor(
  'project_tools/test_p1_231_s1a_shadow_identity_source_spec_model.js',
  'P1-231 S1-A shadow identity source-spec model: PASS'
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

function validatePortablePath(name) {
  if (typeof name !== 'string' || !name || !/^[\x20-\x7e]+$/.test(name)) fail('PACKAGE_PROJECTION_INVALID');
  if (name.startsWith('/') || name.endsWith('/') || name.includes('\\') || name.includes('//')) fail('PACKAGE_PROJECTION_INVALID');
  for (const seg of name.split('/')) {
    if (!seg || seg === '.' || seg === '..' || !/^[A-Za-z0-9._-]+$/.test(seg) || seg.endsWith('.')) {
      fail('PACKAGE_PROJECTION_INVALID');
    }
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
    if (member.type !== 'blob' || member.mode !== '100644' || !Buffer.isBuffer(member.bytes)) fail('PACKAGE_PROJECTION_INVALID');
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
function projectionFromEntries(entries) {
  return {
    schema: PACKAGE_SCHEMA,
    pathProfile: PATH_PROFILE,
    members: entries.map((e) => ({ path: e.name, type: 'blob', mode: '100644', bytes: Buffer.from(e.bytes) })),
  };
}

// Fixture-only RPF adapter. Production S1-C must consume canonical S0-E.
function syntheticRpf(projection) {
  const h = crypto.createHash('sha256');
  h.update(Buffer.from('S1C_SYNTHETIC_RPF_ADAPTER_V1\0', 'ascii'));
  for (const entry of normalizedEntries(projection)) {
    const name = Buffer.from(entry.name, 'ascii');
    const nl = Buffer.alloc(4); nl.writeUInt32BE(name.length);
    const bl = Buffer.alloc(8); bl.writeBigUInt64BE(BigInt(entry.bytes.length));
    h.update(nl); h.update(name); h.update(bl); h.update(entry.bytes);
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
  if (!Number.isSafeInteger(value) || value < 0 || value >= 0xffffffff) fail('ZIP_SEMANTIC_MISMATCH');
  return value;
}

// Path A: manual raw Node writer, independent from Python zipfile.
function buildNodeRawZip(entries) {
  if (!Array.isArray(entries) || entries.length === 0 || entries.length >= MAX_CLASSIC_ENTRIES) fail('PATH_A_BUILD_FAILED');
  const sorted = entries.map((e) => ({ name: validatePortablePath(e.name), bytes: Buffer.from(e.bytes) }))
    .sort((a, b) => asciiCompare(a.name, b.name));
  const seen = new Set();
  const locals = [];
  const centrals = [];
  let localOffset = 0;
  for (const entry of sorted) {
    if (seen.has(entry.name)) fail('ZIP_MEMBER_SET_MISMATCH');
    seen.add(entry.name);
    const name = Buffer.from(entry.name, 'ascii');
    const crc = crc32(entry.bytes);
    checkedU32(entry.bytes.length);
    checkedU32(localOffset);

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

// Strict raw verifier used by the shadow comparison. It validates the fixed
// S0-D fields and returns exact extracted member bytes.
function verifyCanonicalZip(raw, expectedEntries) {
  if (!Buffer.isBuffer(raw) || raw.length < 22) fail('ZIP_SEMANTIC_MISMATCH');
  const eocd = raw.length - 22;
  if (raw.readUInt32LE(eocd) !== EOCD_SIG || raw.readUInt16LE(eocd + 20) !== 0) fail('ZIP_SEMANTIC_MISMATCH');
  if (raw.readUInt16LE(eocd + 4) !== 0 || raw.readUInt16LE(eocd + 6) !== 0) fail('ZIP_SEMANTIC_MISMATCH');
  const count = raw.readUInt16LE(eocd + 10);
  if (count === 0xffff || raw.readUInt16LE(eocd + 8) !== count) fail('ZIP_SEMANTIC_MISMATCH');
  const centralSize = raw.readUInt32LE(eocd + 12);
  const centralOffset = raw.readUInt32LE(eocd + 16);
  if (centralOffset === 0xffffffff || centralSize === 0xffffffff || centralOffset + centralSize !== eocd) fail('ZIP_SEMANTIC_MISMATCH');

  const central = [];
  let p = centralOffset;
  for (let i = 0; i < count; i += 1) {
    if (p + 46 > eocd || raw.readUInt32LE(p) !== CENTRAL_SIG) fail('ZIP_SEMANTIC_MISMATCH');
    const c = {
      madeBy: raw.readUInt16LE(p + 4), needed: raw.readUInt16LE(p + 6), flags: raw.readUInt16LE(p + 8),
      method: raw.readUInt16LE(p + 10), time: raw.readUInt16LE(p + 12), date: raw.readUInt16LE(p + 14),
      crc: raw.readUInt32LE(p + 16), csize: raw.readUInt32LE(p + 20), usize: raw.readUInt32LE(p + 24),
      nameLen: raw.readUInt16LE(p + 28), extraLen: raw.readUInt16LE(p + 30), commentLen: raw.readUInt16LE(p + 32),
      disk: raw.readUInt16LE(p + 34), internal: raw.readUInt16LE(p + 36), external: raw.readUInt32LE(p + 38),
      localOffset: raw.readUInt32LE(p + 42),
    };
    const end = p + 46 + c.nameLen + c.extraLen + c.commentLen;
    if (end > eocd) fail('ZIP_SEMANTIC_MISMATCH');
    const nameBytes = raw.subarray(p + 46, p + 46 + c.nameLen);
    if ([...nameBytes].some((b) => b > 0x7f)) fail('ZIP_SEMANTIC_MISMATCH');
    c.name = nameBytes.toString('ascii');
    validatePortablePath(c.name);
    if (c.madeBy !== VERSION_MADE_BY || c.needed !== VERSION_NEEDED || c.flags !== 0 || c.method !== 0 ||
        c.time !== DOS_TIME || c.date !== DOS_DATE || c.extraLen !== 0 || c.commentLen !== 0 || c.disk !== 0 ||
        c.internal !== 0 || c.external !== EXTERNAL_ATTR) fail('ZIP_SEMANTIC_MISMATCH');
    central.push(c);
    p = end;
  }
  if (p !== eocd) fail('ZIP_SEMANTIC_MISMATCH');
  for (let i = 1; i < central.length; i += 1) {
    if (asciiCompare(central[i - 1].name, central[i].name) >= 0) fail('ZIP_MEMBER_SET_MISMATCH');
  }

  const out = [];
  for (let i = 0; i < central.length; i += 1) {
    const c = central[i];
    const lp = c.localOffset;
    if (lp + 30 > centralOffset || raw.readUInt32LE(lp) !== LOCAL_SIG) fail('ZIP_SEMANTIC_MISMATCH');
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
    if (nameEnd + extraLen > centralOffset) fail('ZIP_SEMANTIC_MISMATCH');
    const name = raw.subarray(nameStart, nameEnd).toString('ascii');
    if (name !== c.name || needed !== c.needed || flags !== c.flags || method !== c.method || time !== c.time ||
        date !== c.date || crc !== c.crc || csize !== c.csize || usize !== c.usize || extraLen !== 0) {
      fail('ZIP_SEMANTIC_MISMATCH');
    }
    const dataStart = nameEnd;
    const dataEnd = dataStart + csize;
    const next = i + 1 < central.length ? central[i + 1].localOffset : centralOffset;
    if (dataEnd !== next) fail('ZIP_SEMANTIC_MISMATCH');
    const payload = Buffer.from(raw.subarray(dataStart, dataEnd));
    if (payload.length !== usize || crc32(payload) !== crc) fail('ZIP_SEMANTIC_MISMATCH');
    out.push({ name, bytes: payload });
  }

  const expected = [...expectedEntries].sort((a, b) => asciiCompare(a.name, b.name));
  if (out.length !== expected.length) fail('ZIP_MEMBER_SET_MISMATCH');
  for (let i = 0; i < expected.length; i += 1) {
    if (out[i].name !== expected[i].name) fail('ZIP_MEMBER_SET_MISMATCH');
    if (!out[i].bytes.equals(expected[i].bytes)) fail('ZIP_MEMBER_BYTE_MISMATCH');
  }
  return out;
}

const PYTHON_SCRIPT = String.raw`
import base64, hashlib, io, json, sys, zipfile
payload = json.load(sys.stdin)
variant = payload.get('variant', 'canonical')
entries = [(item['name'], base64.b64decode(item['data_b64'])) for item in payload['entries']]
entries.sort(key=lambda item: item[0].encode('ascii'))
buf = io.BytesIO()
with zipfile.ZipFile(buf, 'w', compression=zipfile.ZIP_STORED, allowZip64=False) as archive:
    archive.comment = b''
    for name, data in entries:
        dt = (1980, 1, 2, 0, 0, 0) if variant == 'timestamp-drift' else (1980, 1, 1, 0, 0, 0)
        info = zipfile.ZipInfo(name, date_time=dt)
        info.compress_type = zipfile.ZIP_STORED
        info.create_system = 3
        info.create_version = 20
        info.extract_version = 20
        info.external_attr = 0o100644 << 16
        info.internal_attr = 0
        info.extra = b''
        info.comment = b''
        info.flag_bits = 0
        archive.writestr(info, data)
raw = buf.getvalue()
with zipfile.ZipFile(io.BytesIO(raw), 'r') as archive:
    readback = [
        {'name': info.filename, 'data_b64': base64.b64encode(archive.read(info)).decode('ascii')}
        for info in archive.infolist()
    ]
result = {
    'raw_b64': base64.b64encode(raw).decode('ascii'),
    'zip_bytes': len(raw),
    'zip_sha256': hashlib.sha256(raw).hexdigest(),
    'members': readback,
    'python': sys.version.split()[0],
}
print(json.dumps(result, sort_keys=True, separators=(',', ':')))
`;

function pythonCommand() {
  for (const cmd of (process.platform === 'win32' ? ['python'] : ['python3', 'python'])) {
    const probe = spawnSync(cmd, ['--version'], { encoding: 'utf8' });
    if (probe.status === 0) return cmd;
  }
  fail('PATH_B_BUILD_FAILED', 'Python runtime unavailable');
}
function buildPythonZip(entries, variant = 'canonical', envPatch = {}) {
  const cmd = pythonCommand();
  const payload = {
    variant,
    entries: entries.map((e) => ({ name: e.name, data_b64: Buffer.from(e.bytes).toString('base64') })),
  };
  const proc = spawnSync(cmd, ['-c', PYTHON_SCRIPT], {
    cwd: ROOT,
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, ...envPatch },
  });
  if (proc.status !== 0) fail('PATH_B_BUILD_FAILED', proc.stderr || proc.stdout);
  const parsed = JSON.parse(proc.stdout.trim());
  return {
    raw: Buffer.from(parsed.raw_b64, 'base64'),
    members: parsed.members.map((m) => ({ name: m.name, bytes: Buffer.from(m.data_b64, 'base64') })),
    python: parsed.python,
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
function makeShadow(candidateSha, eligible, rpf, bcf = CURRENT_IDS.bcf) {
  return {
    schema: SHADOW_SCHEMA,
    candidateSha,
    eligible,
    state: eligible ? 'eligible' : 'blocked-generation',
    identities: { rpf, bcf, qcf: clone(CURRENT_IDS.qcf), rcf: CURRENT_IDS.rcf },
  };
}
function makeAdmission(candidateSha, rpf, bcf = CURRENT_IDS.bcf, generationState = 'pass') {
  return {
    schema: ADMISSION_SCHEMA,
    candidateSha,
    generationState,
    identities: { rpf, bcf, qcf: clone(CURRENT_IDS.qcf), rcf: CURRENT_IDS.rcf },
  };
}
function validateShadow(candidateSha, shadow) {
  if (!validSha(candidateSha) || !shadow || shadow.schema !== SHADOW_SCHEMA || shadow.candidateSha !== candidateSha ||
      typeof shadow.eligible !== 'boolean' || !validDigest(shadow.identities?.rpf) || !validDigest(shadow.identities?.bcf)) {
    fail('SHADOW_IDENTITY_INVALID');
  }
  return shadow;
}

function evaluateEquivalence({ candidateSha, shadowIdentity, admission, loadProjection, builderA, builderB, identityEngine }) {
  const shadow = validateShadow(candidateSha, shadowIdentity);
  if (!shadow.eligible) {
    return {
      schema: RESULT_SCHEMA,
      candidateSha,
      state: 'candidate-ineligible',
      identityEligible: false,
      equivalenceEvaluated: false,
      rpf: shadow.identities.rpf,
      bcf: shadow.identities.bcf,
      paths: null,
      rawBytesEqual: false,
      authoritative: false,
      productProjectionLoaded: false,
      productZipBuilt: false,
    };
  }

  if (!admission || admission.schema !== ADMISSION_SCHEMA || admission.generationState !== 'pass') {
    fail('CANDIDATE_GENERATION_NOT_ADMITTED');
  }
  if (admission.candidateSha !== candidateSha) fail('CANDIDATE_SHA_MISMATCH');
  if (!validDigest(admission.identities?.rpf) || !validDigest(admission.identities?.bcf)) fail('CANDIDATE_GENERATION_NOT_ADMITTED');
  if (shadow.identities.rpf !== admission.identities.rpf) fail('RPF_MISMATCH');
  if (shadow.identities.bcf !== admission.identities.bcf || admission.identities.bcf !== identityEngine.bcf()) fail('BCF_MISMATCH');

  const projection = loadProjection(candidateSha);
  validateProjection(projection);
  const projectionRpf = identityEngine.rpf(projection);
  if (projectionRpf !== admission.identities.rpf) fail('RPF_MISMATCH');
  const entries = normalizedEntries(projection);

  let rawA;
  let pathB;
  try { rawA = builderA(entries); }
  catch (e) { if (e?.code) throw e; fail('PATH_A_BUILD_FAILED', e?.message); }
  try { pathB = builderB(entries); }
  catch (e) { if (e?.code) throw e; fail('PATH_B_BUILD_FAILED', e?.message); }
  const rawB = pathB.raw;

  const extractedA = verifyCanonicalZip(rawA, entries);
  const extractedB = verifyCanonicalZip(rawB, entries);
  const rpfA = identityEngine.rpf(projectionFromEntries(extractedA));
  const rpfB = identityEngine.rpf(projectionFromEntries(extractedB));
  if (rpfA !== admission.identities.rpf || rpfB !== admission.identities.rpf) fail('EXTRACTED_RPF_MISMATCH');
  if (rawA.length !== rawB.length) fail('ARTIFACT_SIZE_MISMATCH');
  if (digestPrefixed(rawA) !== digestPrefixed(rawB)) fail('ARTIFACT_SHA_MISMATCH');
  if (!rawA.equals(rawB)) fail('ARTIFACT_BYTES_MISMATCH');

  return {
    schema: RESULT_SCHEMA,
    candidateSha,
    state: 'equivalent',
    identityEligible: true,
    equivalenceEvaluated: true,
    rpf: admission.identities.rpf,
    bcf: admission.identities.bcf,
    builderProfile: BUILDER_PROFILE,
    paths: {
      nodeRaw: { artifactBytes: rawA.length, artifactSha256: digestPrefixed(rawA), extractedRpf: rpfA },
      pythonZipfile: { artifactBytes: rawB.length, artifactSha256: digestPrefixed(rawB), extractedRpf: rpfB },
    },
    rawBytesEqual: true,
    authoritative: false,
    productProjectionLoaded: false,
    productZipBuilt: false,
  };
}

(function main() {
  // Canonical predecessor composition.
  test('DAG still has four S1 nodes', () => assert.strictEqual(dag.kv.s1, '4'));
  test('canonical Python golden size retained', () => assert.strictEqual(canonicalZip.kv.fixture_zip_bytes, String(GOLDEN_ZIP_BYTES)));
  test('canonical Python golden SHA retained', () => assert.strictEqual(canonicalZip.kv.fixture_zip_sha256, GOLDEN_ZIP_SHA256));
  test('canonical path profile retained', () => assert.strictEqual(canonicalZip.kv.path_profile, PATH_PROFILE));
  test('S0-D golden size retained', () => assert.strictEqual(s0d.kv.fixture_zip_bytes, String(GOLDEN_ZIP_BYTES)));
  test('S0-D golden SHA retained', () => assert.strictEqual(s0d.kv.fixture_zip_sha256, GOLDEN_ZIP_SHA256));
  test('S0-D raw local/central remains required', () => assert.strictEqual(s0d.kv.raw_local_central, 'true'));
  test('S0-E BCF exact', () => assert.strictEqual(CURRENT_IDS.bcf, 'sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff'));
  test('S0-F remains blocked on generation governance', () => assert.strictEqual(s0f.kv.current_gate, 'blocked-generation'));
  test('S0-H remains blocked before product load', () => assert.strictEqual(s0h.kv.current_product_build, 'blocked-before-load'));
  test('S0-H product ZIP remains false', () => assert.strictEqual(s0h.kv.product_zip, 'false'));
  test('S0-H manual Node path matches golden SHA', () => assert.strictEqual(s0h.kv.fixture_zip_sha256, GOLDEN_ZIP_SHA256));
  test('S1-A current identity remains ineligible', () => assert.strictEqual(s1a.kv.current_eligible, 'false'));
  test('S1-A current state remains blocked generation', () => assert.strictEqual(s1a.kv.current_shadow, 'blocked-generation'));
  test('current head exact SHA', () => assert(validSha(currentHead)));

  // Current real candidate must short-circuit before any product loading/building.
  test('current ineligible shadow performs zero projection loads and zero builds', () => {
    let loads = 0; let buildsA = 0; let buildsB = 0;
    const result = evaluateEquivalence({
      candidateSha: currentHead,
      shadowIdentity: makeShadow(currentHead, false, CURRENT_IDS.rpf),
      admission: null,
      loadProjection: () => { loads += 1; return makeFixtureProjection(); },
      builderA: (entries) => { buildsA += 1; return buildNodeRawZip(entries); },
      builderB: (entries) => { buildsB += 1; return buildPythonZip(entries); },
      identityEngine: { rpf: syntheticRpf, bcf: () => CURRENT_IDS.bcf },
    });
    assert.strictEqual(result.state, 'candidate-ineligible');
    assert.strictEqual(result.identityEligible, false);
    assert.strictEqual(result.equivalenceEvaluated, false);
    assert.strictEqual(result.authoritative, false);
    assert.strictEqual(result.productProjectionLoaded, false);
    assert.strictEqual(result.productZipBuilt, false);
    assert.strictEqual(loads, 0);
    assert.strictEqual(buildsA, 0);
    assert.strictEqual(buildsB, 0);
  });

  test('malformed shadow fails structurally before load', () => {
    let loads = 0;
    throwsCode(() => evaluateEquivalence({
      candidateSha: currentHead,
      shadowIdentity: { schema: SHADOW_SCHEMA, candidateSha: currentHead, eligible: false },
      admission: null,
      loadProjection: () => { loads += 1; return makeFixtureProjection(); },
      builderA: buildNodeRawZip,
      builderB: buildPythonZip,
      identityEngine: { rpf: syntheticRpf, bcf: () => CURRENT_IDS.bcf },
    }), 'SHADOW_IDENTITY_INVALID');
    assert.strictEqual(loads, 0);
  });

  const syntheticSha = 'a'.repeat(40);
  const fixture = makeFixtureProjection();
  const fixtureEntries = normalizedEntries(fixture);
  const fixtureRpf = syntheticRpf(fixture);
  const admittedShadow = makeShadow(syntheticSha, true, fixtureRpf);
  const admission = makeAdmission(syntheticSha, fixtureRpf);
  const identityEngine = { rpf: syntheticRpf, bcf: () => CURRENT_IDS.bcf };

  test('eligible shadow without admission fails before load', () => {
    let loads = 0;
    throwsCode(() => evaluateEquivalence({
      candidateSha: syntheticSha, shadowIdentity: admittedShadow, admission: null,
      loadProjection: () => { loads += 1; return fixture; }, builderA: buildNodeRawZip, builderB: buildPythonZip, identityEngine,
    }), 'CANDIDATE_GENERATION_NOT_ADMITTED');
    assert.strictEqual(loads, 0);
  });
  test('shadow/admission SHA mismatch fails before load', () => {
    let loads = 0;
    throwsCode(() => evaluateEquivalence({
      candidateSha: syntheticSha,
      shadowIdentity: admittedShadow,
      admission: makeAdmission('b'.repeat(40), fixtureRpf),
      loadProjection: () => { loads += 1; return fixture; }, builderA: buildNodeRawZip, builderB: buildPythonZip, identityEngine,
    }), 'CANDIDATE_SHA_MISMATCH');
    assert.strictEqual(loads, 0);
  });
  test('BCF mismatch fails before projection load', () => {
    let loads = 0;
    throwsCode(() => evaluateEquivalence({
      candidateSha: syntheticSha,
      shadowIdentity: admittedShadow,
      admission: makeAdmission(syntheticSha, fixtureRpf, `sha256:${'1'.repeat(64)}`),
      loadProjection: () => { loads += 1; return fixture; }, builderA: buildNodeRawZip, builderB: buildPythonZip, identityEngine,
    }), 'BCF_MISMATCH');
    assert.strictEqual(loads, 0);
  });
  test('staged RPF mismatch fails before builders', () => {
    let buildsA = 0; let buildsB = 0;
    throwsCode(() => evaluateEquivalence({
      candidateSha: syntheticSha, shadowIdentity: admittedShadow, admission,
      loadProjection: () => makeFixtureProjection(false, true),
      builderA: (entries) => { buildsA += 1; return buildNodeRawZip(entries); },
      builderB: (entries) => { buildsB += 1; return buildPythonZip(entries); },
      identityEngine,
    }), 'RPF_MISMATCH');
    assert.strictEqual(buildsA, 0);
    assert.strictEqual(buildsB, 0);
  });

  // Independent physical builders.
  const rawNode = buildNodeRawZip(fixtureEntries);
  const pyCanonical = buildPythonZip(fixtureEntries);
  test('Node manual writer exact golden size', () => assert.strictEqual(rawNode.length, GOLDEN_ZIP_BYTES));
  test('Node manual writer exact golden SHA', () => assert.strictEqual(sha256(rawNode), GOLDEN_ZIP_SHA256));
  test('Python zipfile writer exact golden size', () => assert.strictEqual(pyCanonical.raw.length, GOLDEN_ZIP_BYTES));
  test('Python zipfile writer exact golden SHA', () => assert.strictEqual(sha256(pyCanonical.raw), GOLDEN_ZIP_SHA256));
  test('independent raw buffers are byte-for-byte equal', () => assert(rawNode.equals(pyCanonical.raw)));
  test('independent raw buffer SHA values equal', () => assert.strictEqual(sha256(rawNode), sha256(pyCanonical.raw)));
  test('Python readback has exact member order', () => assert.deepStrictEqual(pyCanonical.members.map((m) => m.name), ['dir/a.js', 'dir/b.txt', 'manifest.json', 'z-last.bin']));
  test('Python readback bytes equal fixture', () => {
    const expected = fixtureEntries;
    assert.strictEqual(pyCanonical.members.length, expected.length);
    for (let i = 0; i < expected.length; i += 1) {
      assert.strictEqual(pyCanonical.members[i].name, expected[i].name);
      assert(pyCanonical.members[i].bytes.equals(expected[i].bytes));
    }
  });

  const extractedNode = verifyCanonicalZip(rawNode, fixtureEntries);
  const extractedPython = verifyCanonicalZip(pyCanonical.raw, fixtureEntries);
  test('Node extracted RPF equals admitted fixture RPF', () => assert.strictEqual(syntheticRpf(projectionFromEntries(extractedNode)), fixtureRpf));
  test('Python extracted RPF equals admitted fixture RPF', () => assert.strictEqual(syntheticRpf(projectionFromEntries(extractedPython)), fixtureRpf));

  // Full synthetic admitted orchestration.
  let positiveLoads = 0; let positiveA = 0; let positiveB = 0;
  const positive = evaluateEquivalence({
    candidateSha: syntheticSha,
    shadowIdentity: admittedShadow,
    admission,
    loadProjection: (sha) => { positiveLoads += 1; assert.strictEqual(sha, syntheticSha); return makeFixtureProjection(true); },
    builderA: (entries) => { positiveA += 1; return buildNodeRawZip(entries); },
    builderB: (entries) => { positiveB += 1; return buildPythonZip(entries); },
    identityEngine,
  });
  test('positive projection loaded exactly once', () => assert.strictEqual(positiveLoads, 1));
  test('positive Node builder called exactly once', () => assert.strictEqual(positiveA, 1));
  test('positive Python builder called exactly once', () => assert.strictEqual(positiveB, 1));
  test('positive result schema exact', () => assert.strictEqual(positive.schema, RESULT_SCHEMA));
  test('positive state equivalent', () => assert.strictEqual(positive.state, 'equivalent'));
  test('positive identity eligible', () => assert.strictEqual(positive.identityEligible, true));
  test('positive equivalence evaluated', () => assert.strictEqual(positive.equivalenceEvaluated, true));
  test('positive raw equality true', () => assert.strictEqual(positive.rawBytesEqual, true));
  test('positive remains non-authoritative', () => assert.strictEqual(positive.authoritative, false));
  test('positive fixture does not claim product projection', () => assert.strictEqual(positive.productProjectionLoaded, false));
  test('positive fixture does not claim product ZIP', () => assert.strictEqual(positive.productZipBuilt, false));
  test('positive Node artifact SHA exact', () => assert.strictEqual(positive.paths.nodeRaw.artifactSha256, `sha256:${GOLDEN_ZIP_SHA256}`));
  test('positive Python artifact SHA exact', () => assert.strictEqual(positive.paths.pythonZipfile.artifactSha256, `sha256:${GOLDEN_ZIP_SHA256}`));
  test('positive Node artifact bytes exact', () => assert.strictEqual(positive.paths.nodeRaw.artifactBytes, GOLDEN_ZIP_BYTES));
  test('positive Python artifact bytes exact', () => assert.strictEqual(positive.paths.pythonZipfile.artifactBytes, GOLDEN_ZIP_BYTES));
  test('positive BCF remains canonical', () => assert.strictEqual(positive.bcf, CURRENT_IDS.bcf));
  test('positive RPF remains admitted fixture RPF', () => assert.strictEqual(positive.rpf, fixtureRpf));

  // Ordering/environment invariance.
  const reversedEntries = normalizedEntries(makeFixtureProjection(true));
  test('Node reversed input order unchanged', () => assert(rawNode.equals(buildNodeRawZip(reversedEntries))));
  test('Python reversed input order unchanged', () => assert(pyCanonical.raw.equals(buildPythonZip(reversedEntries).raw)));
  test('Python TZ variation unchanged', () => assert(pyCanonical.raw.equals(buildPythonZip(fixtureEntries, 'canonical', { TZ: 'Pacific/Honolulu' }).raw)));
  test('Python SOURCE_DATE_EPOCH variation unchanged', () => assert(pyCanonical.raw.equals(buildPythonZip(fixtureEntries, 'canonical', { SOURCE_DATE_EPOCH: '2147483647' }).raw)));

  // Metadata-only drift must not be accepted merely because extracted payloads are equal.
  const pyTimestampDrift = buildPythonZip(fixtureEntries, 'timestamp-drift');
  test('timestamp drift preserves extracted member names', () => assert.deepStrictEqual(pyTimestampDrift.members.map((m) => m.name), pyCanonical.members.map((m) => m.name)));
  test('timestamp drift preserves extracted member bytes', () => {
    for (let i = 0; i < pyCanonical.members.length; i += 1) assert(pyTimestampDrift.members[i].bytes.equals(pyCanonical.members[i].bytes));
  });
  test('timestamp drift therefore preserves logical fixture RPF', () => assert.strictEqual(syntheticRpf(projectionFromEntries(pyTimestampDrift.members)), fixtureRpf));
  test('timestamp drift changes physical raw bytes', () => assert(!pyTimestampDrift.raw.equals(pyCanonical.raw)));
  test('timestamp drift changes physical artifact SHA', () => assert.notStrictEqual(sha256(pyTimestampDrift.raw), GOLDEN_ZIP_SHA256));
  test('timestamp drift fails canonical raw semantics', () => throwsCode(() => verifyCanonicalZip(pyTimestampDrift.raw, fixtureEntries), 'ZIP_SEMANTIC_MISMATCH'));
  test('timestamp-drift builder is rejected in full equivalence evaluation', () => {
    throwsCode(() => evaluateEquivalence({
      candidateSha: syntheticSha, shadowIdentity: admittedShadow, admission,
      loadProjection: () => fixture, builderA: buildNodeRawZip,
      builderB: (entries) => buildPythonZip(entries, 'timestamp-drift'), identityEngine,
    }), 'ZIP_SEMANTIC_MISMATCH');
  });

  // Raw corruption / trailing material must fail closed.
  test('central metadata mutation fails canonical semantics', () => {
    const tampered = Buffer.from(rawNode);
    const central = tampered.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    assert(central >= 0);
    tampered.writeUInt16LE(DOS_DATE + 1, central + 14);
    throwsCode(() => verifyCanonicalZip(tampered, fixtureEntries), 'ZIP_SEMANTIC_MISMATCH');
  });
  test('trailing bytes fail canonical semantics', () => {
    throwsCode(() => verifyCanonicalZip(Buffer.concat([rawNode, Buffer.from([0])]), fixtureEntries), 'ZIP_SEMANTIC_MISMATCH');
  });
  test('payload mutation changes logical RPF', () => {
    assert.notStrictEqual(syntheticRpf(makeFixtureProjection(false, true)), fixtureRpf);
  });

  // Artifact SHA never becomes a candidate identity axis.
  test('result identity contains canonical RPF', () => assert(validDigest(positive.rpf)));
  test('result identity contains canonical BCF', () => assert(validDigest(positive.bcf)));
  test('artifact digest is path evidence, not top-level candidate axis', () => assert(!Object.prototype.hasOwnProperty.call(positive, 'artifactIdentity')));
  test('no CGF axis reintroduced by S1-C', () => assert(!Object.prototype.hasOwnProperty.call(positive, 'cgf')));
  test('Python runtime is provenance only', () => assert(/^[0-9]+\.[0-9]+\.[0-9]+/.test(pyCanonical.python)));

  console.log(
    `P1-231 S1-C builder equivalence source-spec model: PASS; cases=${cases}; ` +
    `schema=${RESULT_SCHEMA}; current_state=candidate-ineligible; current_equivalence_evaluated=false; ` +
    `cross_language=node-python; fixture_members=4; fixture_zip_bytes=${GOLDEN_ZIP_BYTES}; ` +
    `fixture_zip_sha256=${GOLDEN_ZIP_SHA256}; raw_bytes_equal=true; extracted_rpf_equal=true; ` +
    `metadata_drift=fail-closed; current_product_load=false; product_zip=false; policy_mutation=false; ` +
    `permanent_workflow_unchanged=true; bcf=${CURRENT_IDS.bcf}; head=${currentHead}`
  );
})();
