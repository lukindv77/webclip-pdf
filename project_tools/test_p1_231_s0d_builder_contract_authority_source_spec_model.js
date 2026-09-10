'use strict';

// Research-only deterministic source-spec model for P1-231 S0-D.
// It constructs only the predecessor synthetic ZIP fixture and parses its raw bytes.
// It never stages/packages the WebClip extension and never activates release policy.

const assert = require('assert');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { TextDecoder } = require('util');

const SCHEMA = 'webclip-release-builder-contract/v1';
const BUILDER_PROFILE = 'webclip-classic-zip-stored/v1';
const PACKAGE_SCHEMA = 'webclip-extension-package/v1';
const PATH_PROFILE = 'portable-ascii-v1';
const GOLDEN_ZIP_SHA256 = '1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7';
const GOLDEN_ZIP_SIZE = 510;
const MAX_MANIFEST_BYTES = 128 * 1024;
const EOCD_SIG = 0x06054b50;
const CENTRAL_SIG = 0x02014b50;
const LOCAL_SIG = 0x04034b50;
const DOS_DATE_1980_01_01 = 33;
const UNIX_REGULAR_0644 = 0o100644;
const EXTERNAL_ATTR = (UNIX_REGULAR_0644 * 0x10000) >>> 0;
const VERSION_MADE_BY_UNIX_20 = (3 << 8) | 20;

const TOP_KEYS = new Set(['schema', 'builder_profile', 'requires_package_schema', 'requires_path_profile', 'staging', 'zip', 'verification']);
const STAGING_KEYS = new Set(['source', 'membership', 'root_policy', 'symlinks', 'extra_files', 'filesystem_metadata']);
const ZIP_KEYS = new Set([
  'container', 'compression', 'zip64', 'member_order', 'filename_encoding', 'dos_datetime',
  'create_system', 'create_version', 'extract_version', 'external_mode', 'internal_attr',
  'flag_bits', 'extra_fields', 'member_comments', 'archive_comment', 'directory_entries',
  'data_descriptors', 'encryption', 'digital_signature', 'archive_extra_data', 'preamble', 'trailing_bytes',
]);
const VERIFY_KEYS = new Set(['local_central_agreement', 'crc32', 'stored_size_equality', 'exact_member_bytes', 'candidate_rpf_equality', 'artifact_sha256']);

const AUTHORITY = Object.freeze({
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
    filesystem_metadata: 'non-authoritative',
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
    external_mode: UNIX_REGULAR_0644,
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
    trailing_bytes: 'forbidden',
  }),
  verification: Object.freeze({
    local_central_agreement: 'required',
    crc32: 'required',
    stored_size_equality: 'required',
    exact_member_bytes: 'required',
    candidate_rpf_equality: 'required',
    artifact_sha256: 'required',
  }),
});

let cases = 0;
function check(v, m) { cases += 1; assert(v, m); }
function eq(a, b, m) { cases += 1; assert.strictEqual(a, b, m); }
function deepEq(a, b, m) { cases += 1; assert.deepStrictEqual(a, b, m); }
function fail(code, detail) { const e = new Error(detail || code); e.code = code; throw e; }
function throwsCode(fn, code, m) { cases += 1; assert.throws(fn, (e) => e && e.code === code, m || `expected ${code}`); }
function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
function asciiCompare(a, b) { return Buffer.from(a, 'ascii').compare(Buffer.from(b, 'ascii')); }

function rejectDuplicateObjectKeys(text) {
  const stack = [];
  let i = 0;
  function skipWs() { while (i < text.length && /[\x20\x09\x0a\x0d]/.test(text[i])) i += 1; }
  function readString() {
    const start = i;
    i += 1;
    let escaped = false;
    while (i < text.length) {
      const ch = text[i++];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') return text.slice(start, i);
    }
    fail('BUILDER_CONTRACT_JSON_INVALID', 'unterminated string');
  }
  while (i < text.length) {
    skipWs();
    if (i >= text.length) break;
    const ch = text[i];
    if (ch === '{') { stack.push({ type: 'object', keys: new Set(), expectingKey: true }); i += 1; continue; }
    if (ch === '[') { stack.push({ type: 'array' }); i += 1; continue; }
    if (ch === '}' || ch === ']') { if (stack.length) stack.pop(); i += 1; continue; }
    if (ch === '"') {
      const raw = readString();
      skipWs();
      const frame = stack[stack.length - 1];
      if (frame && frame.type === 'object' && frame.expectingKey && text[i] === ':') {
        let key;
        try { key = JSON.parse(raw); } catch { fail('BUILDER_CONTRACT_JSON_INVALID'); }
        if (frame.keys.has(key)) fail('BUILDER_CONTRACT_DUPLICATE_KEY', key);
        frame.keys.add(key);
        frame.expectingKey = false;
      }
      continue;
    }
    if (ch === ',' && stack.length) {
      const frame = stack[stack.length - 1];
      if (frame.type === 'object') frame.expectingKey = true;
      i += 1;
      continue;
    }
    i += 1;
  }
}

function exactKeys(raw, allowed, code) {
  if (!raw || Array.isArray(raw) || typeof raw !== 'object') fail(code);
  const keys = Object.keys(raw);
  for (const k of keys) if (!allowed.has(k)) fail('BUILDER_CONTRACT_UNKNOWN_FIELD', k);
  for (const k of allowed) if (!Object.prototype.hasOwnProperty.call(raw, k)) fail(code, `missing ${k}`);
}

function validateAuthority(raw) {
  exactKeys(raw, TOP_KEYS, 'BUILDER_CONTRACT_SHAPE_INVALID');
  if (raw.schema !== SCHEMA) fail('BUILDER_CONTRACT_SCHEMA_UNSUPPORTED');
  if (raw.builder_profile !== BUILDER_PROFILE) fail('BUILDER_CONTRACT_PROFILE_UNSUPPORTED');
  if (raw.requires_package_schema !== PACKAGE_SCHEMA) fail('BUILDER_CONTRACT_PACKAGE_SCHEMA_MISMATCH');
  if (raw.requires_path_profile !== PATH_PROFILE) fail('BUILDER_CONTRACT_PATH_PROFILE_MISMATCH');
  exactKeys(raw.staging, STAGING_KEYS, 'BUILDER_CONTRACT_STAGING_INVALID');
  exactKeys(raw.zip, ZIP_KEYS, 'BUILDER_CONTRACT_ZIP_INVALID');
  exactKeys(raw.verification, VERIFY_KEYS, 'BUILDER_CONTRACT_VERIFICATION_INVALID');
  for (const [k, expected] of Object.entries(AUTHORITY.staging)) if (raw.staging[k] !== expected) fail('BUILDER_CONTRACT_STAGING_INVALID', k);
  for (const [k, expected] of Object.entries(AUTHORITY.zip)) if (raw.zip[k] !== expected) fail('BUILDER_CONTRACT_ZIP_INVALID', k);
  for (const [k, expected] of Object.entries(AUTHORITY.verification)) if (raw.verification[k] !== expected) fail('BUILDER_CONTRACT_VERIFICATION_INVALID', k);
  return raw;
}

function parseAuthorityBytes(buf) {
  if (!Buffer.isBuffer(buf) || buf.length === 0 || buf.length > MAX_MANIFEST_BYTES) fail('BUILDER_CONTRACT_BYTES_INVALID');
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) fail('BUILDER_CONTRACT_BOM_FORBIDDEN');
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { fail('BUILDER_CONTRACT_UTF8_INVALID'); }
  rejectDuplicateObjectKeys(text);
  let raw;
  try { raw = JSON.parse(text); } catch { fail('BUILDER_CONTRACT_JSON_INVALID'); }
  return validateAuthority(raw);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort(asciiCompare).map((k) => `${JSON.stringify(k)}:${stableJson(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
function researchSemanticDigest(raw) {
  validateAuthority(raw);
  return sha256(Buffer.from(`WEBCLIP_BUILDER_CONTRACT_RESEARCH_V1\0${stableJson(raw)}`, 'utf8'));
}

function validatePortableAsciiPath(name) {
  if (typeof name !== 'string' || !name || !/^[\x20-\x7e]+$/.test(name)) fail('BUILDER_STAGE_PATH_INVALID');
  if (name.startsWith('/') || name.endsWith('/') || name.includes('\\') || name.includes('//')) fail('BUILDER_STAGE_PATH_INVALID');
  for (const part of name.split('/')) if (part === '.' || part === '..' || !/^[A-Za-z0-9._-]+$/.test(part) || part.endsWith('.')) fail('BUILDER_STAGE_PATH_INVALID');
  return name;
}

function validateStage(packageEntries, stageEntries) {
  if (!Array.isArray(packageEntries) || !Array.isArray(stageEntries)) fail('BUILDER_STAGE_INVALID');
  const expected = new Map();
  for (const e of packageEntries) {
    validatePortableAsciiPath(e.name);
    if (expected.has(e.name) || !Buffer.isBuffer(e.bytes)) fail('BUILDER_STAGE_INVALID');
    expected.set(e.name, e.bytes);
  }
  const actual = new Map();
  for (const e of stageEntries) {
    validatePortableAsciiPath(e.name);
    if (actual.has(e.name) || e.type !== 'file' || !Buffer.isBuffer(e.bytes)) fail(e.type !== 'file' ? 'BUILDER_STAGE_NON_REGULAR' : 'BUILDER_STAGE_INVALID');
    actual.set(e.name, e.bytes);
  }
  if (expected.size !== actual.size) fail('BUILDER_STAGE_MEMBERSHIP_MISMATCH');
  for (const [name, bytes] of expected) {
    if (!actual.has(name)) fail('BUILDER_STAGE_MEMBERSHIP_MISMATCH');
    if (!actual.get(name).equals(bytes)) fail('BUILDER_STAGE_BYTE_MISMATCH', name);
  }
  return [...actual.keys()].sort(asciiCompare);
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

function parseClassicZip(raw, expectedEntries) {
  if (!Buffer.isBuffer(raw) || raw.length < 22) fail('BUILDER_ZIP_STRUCTURE_INVALID');
  const eocd = raw.length - 22;
  if (raw.readUInt32LE(eocd) !== EOCD_SIG) fail('BUILDER_ZIP_EOCD_NOT_FINAL');
  eq(raw.readUInt16LE(eocd + 4), 0, 'EOCD disk number must be zero');
  eq(raw.readUInt16LE(eocd + 6), 0, 'EOCD central-directory disk must be zero');
  const entriesDisk = raw.readUInt16LE(eocd + 8);
  const entriesTotal = raw.readUInt16LE(eocd + 10);
  const centralSize = raw.readUInt32LE(eocd + 12);
  const centralOffset = raw.readUInt32LE(eocd + 16);
  eq(raw.readUInt16LE(eocd + 20), 0, 'archive comment must be empty');
  eq(entriesDisk, entriesTotal, 'single-disk entry counts must match');
  check(entriesTotal !== 0xffff, 'ZIP64 entry-count sentinel forbidden');
  check(centralSize !== 0xffffffff && centralOffset !== 0xffffffff, 'ZIP64 EOCD sentinel forbidden');
  eq(centralOffset + centralSize, eocd, 'central directory must end exactly at EOCD');

  const central = [];
  let p = centralOffset;
  for (let i = 0; i < entriesTotal; i += 1) {
    if (p + 46 > eocd || raw.readUInt32LE(p) !== CENTRAL_SIG) fail('BUILDER_ZIP_CENTRAL_INVALID');
    const madeBy = raw.readUInt16LE(p + 4);
    const needed = raw.readUInt16LE(p + 6);
    const flags = raw.readUInt16LE(p + 8);
    const method = raw.readUInt16LE(p + 10);
    const time = raw.readUInt16LE(p + 12);
    const date = raw.readUInt16LE(p + 14);
    const crc = raw.readUInt32LE(p + 16);
    const csize = raw.readUInt32LE(p + 20);
    const usize = raw.readUInt32LE(p + 24);
    const nameLen = raw.readUInt16LE(p + 28);
    const extraLen = raw.readUInt16LE(p + 30);
    const commentLen = raw.readUInt16LE(p + 32);
    const diskStart = raw.readUInt16LE(p + 34);
    const internalAttr = raw.readUInt16LE(p + 36);
    const externalAttr = raw.readUInt32LE(p + 38);
    const localOffset = raw.readUInt32LE(p + 42);
    const end = p + 46 + nameLen + extraLen + commentLen;
    if (end > eocd) fail('BUILDER_ZIP_CENTRAL_INVALID');
    const nameBytes = raw.subarray(p + 46, p + 46 + nameLen);
    if ([...nameBytes].some((b) => b > 0x7f)) fail('BUILDER_ZIP_NON_ASCII_NAME');
    const name = nameBytes.toString('ascii');
    central.push({ madeBy, needed, flags, method, time, date, crc, csize, usize, nameLen, extraLen, commentLen, diskStart, internalAttr, externalAttr, localOffset, name });
    p = end;
  }
  eq(p, eocd, 'no central-directory digital signature or extra data is allowed');
  eq(central.length, entriesTotal, 'central entry count drift');

  const names = new Set();
  for (const c of central) {
    if (names.has(c.name)) fail('BUILDER_ZIP_DUPLICATE_MEMBER', c.name);
    names.add(c.name);
    validatePortableAsciiPath(c.name);
    eq(c.madeBy, VERSION_MADE_BY_UNIX_20, `version-made-by drift: ${c.name}`);
    eq(c.needed, 20, `extract version drift: ${c.name}`);
    eq(c.flags, 0, `flag bits drift: ${c.name}`);
    eq(c.method, 0, `compression method drift: ${c.name}`);
    eq(c.time, 0, `DOS time drift: ${c.name}`);
    eq(c.date, DOS_DATE_1980_01_01, `DOS date drift: ${c.name}`);
    eq(c.csize, c.usize, `STORED size mismatch: ${c.name}`);
    check(c.csize !== 0xffffffff && c.usize !== 0xffffffff && c.localOffset !== 0xffffffff, `ZIP64 sentinel forbidden: ${c.name}`);
    eq(c.extraLen, 0, `central extra field forbidden: ${c.name}`);
    eq(c.commentLen, 0, `member comment forbidden: ${c.name}`);
    eq(c.diskStart, 0, `member disk start must be zero: ${c.name}`);
    eq(c.internalAttr, 0, `internal attributes drift: ${c.name}`);
    eq(c.externalAttr, EXTERNAL_ATTR, `external Unix mode drift: ${c.name}`);
    check(!c.name.endsWith('/'), `explicit directory entry forbidden: ${c.name}`);
  }
  deepEq(central.map((x) => x.name), [...central.map((x) => x.name)].sort(asciiCompare), 'central member order must be canonical');

  const actualPayloads = new Map();
  for (let i = 0; i < central.length; i += 1) {
    const c = central[i];
    const lp = c.localOffset;
    if (i === 0) eq(lp, 0, 'preamble forbidden; first local header must start at byte zero');
    if (lp + 30 > centralOffset || raw.readUInt32LE(lp) !== LOCAL_SIG) fail('BUILDER_ZIP_LOCAL_INVALID');
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
    if (nameEnd + extraLen > centralOffset) fail('BUILDER_ZIP_LOCAL_INVALID');
    const nameBytes = raw.subarray(nameStart, nameEnd);
    const name = nameBytes.toString('ascii');
    eq(name, c.name, `local/central filename mismatch: ${c.name}`);
    eq(needed, c.needed, `local/central extract version mismatch: ${c.name}`);
    eq(flags, c.flags, `local/central flags mismatch: ${c.name}`);
    eq(method, c.method, `local/central method mismatch: ${c.name}`);
    eq(time, c.time, `local/central time mismatch: ${c.name}`);
    eq(date, c.date, `local/central date mismatch: ${c.name}`);
    eq(crc, c.crc, `local/central CRC mismatch: ${c.name}`);
    eq(csize, c.csize, `local/central compressed size mismatch: ${c.name}`);
    eq(usize, c.usize, `local/central uncompressed size mismatch: ${c.name}`);
    eq(extraLen, 0, `local extra field forbidden: ${c.name}`);
    const dataStart = nameEnd + extraLen;
    const dataEnd = dataStart + csize;
    const nextBoundary = i + 1 < central.length ? central[i + 1].localOffset : centralOffset;
    eq(dataEnd, nextBoundary, `data descriptor/undeclared bytes forbidden after ${c.name}`);
    const payload = raw.subarray(dataStart, dataEnd);
    eq(payload.length, c.usize, `payload size drift: ${c.name}`);
    eq(crc32(payload), c.crc, `payload CRC mismatch: ${c.name}`);
    actualPayloads.set(c.name, Buffer.from(payload));
  }

  if (expectedEntries) {
    const expected = new Map(expectedEntries.map((e) => [e.name, e.bytes]));
    eq(actualPayloads.size, expected.size, 'ZIP member count must equal expected package projection');
    for (const [name, bytes] of expected) {
      if (!actualPayloads.has(name)) fail('BUILDER_ZIP_MEMBERSHIP_MISMATCH', name);
      if (!actualPayloads.get(name).equals(bytes)) fail('BUILDER_ZIP_PAYLOAD_MISMATCH', name);
    }
  }
  return { central, actualPayloads, centralOffset, centralSize, eocd };
}

const PYTHON_SCRIPT = String.raw`
import base64, io, json, sys, zipfile
payload = json.load(sys.stdin)
entries = [(item['name'], base64.b64decode(item['data_b64'])) for item in payload['entries']]
buf = io.BytesIO()
with zipfile.ZipFile(buf, 'w', compression=zipfile.ZIP_STORED, allowZip64=False) as archive:
    archive.comment = b''
    for name, data in sorted(entries, key=lambda item: item[0].encode('ascii')):
        info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
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
print(json.dumps({'raw_b64': base64.b64encode(raw).decode('ascii'), 'python': sys.version.split()[0]}, sort_keys=True, separators=(',', ':')))
`;

function pythonCommand() {
  for (const cmd of (process.platform === 'win32' ? ['python'] : ['python3', 'python'])) {
    const p = spawnSync(cmd, ['--version'], { encoding: 'utf8' });
    if (p.status === 0) return cmd;
  }
  fail('BUILDER_RESEARCH_PYTHON_UNAVAILABLE');
}
function buildSyntheticZip(entries, envPatch = {}) {
  const proc = spawnSync(pythonCommand(), ['-c', PYTHON_SCRIPT], {
    input: JSON.stringify({ entries: entries.map((e) => ({ name: e.name, data_b64: e.bytes.toString('base64') })) }),
    encoding: 'utf8',
    env: { ...process.env, ...envPatch },
  });
  if (proc.status !== 0) fail('BUILDER_SYNTHETIC_ZIP_FAILED', proc.stderr || proc.stdout);
  const out = JSON.parse(proc.stdout.trim());
  return { raw: Buffer.from(out.raw_b64, 'base64'), python: out.python };
}

function fixtureEntries(reverse = false) {
  const entries = [
    { name: 'z-last.bin', bytes: Buffer.from([0, 255, 10, 13, 42]) },
    { name: 'manifest.json', bytes: Buffer.from('{"manifest_version":3,"name":"Fixture","version":"0.0.0.1"}\n', 'utf8') },
    { name: 'dir/b.txt', bytes: Buffer.from('Привет WebClip\n', 'utf8') },
    { name: 'dir/a.js', bytes: Buffer.from("console.log('A');\n", 'utf8') },
  ];
  return reverse ? entries.reverse() : entries;
}
function cloneAuthority() { return JSON.parse(JSON.stringify(AUTHORITY)); }

(function main() {
  const authorityText = JSON.stringify(AUTHORITY, null, 2);
  const parsed = parseAuthorityBytes(Buffer.from(authorityText, 'utf8'));
  eq(parsed.schema, SCHEMA, 'valid authority parse drift');
  check(/^[0-9a-f]{64}$/.test(researchSemanticDigest(parsed)), 'research semantic digest must be SHA-256 hex');

  const reordered = {
    verification: cloneAuthority().verification,
    zip: cloneAuthority().zip,
    staging: cloneAuthority().staging,
    requires_path_profile: PATH_PROFILE,
    requires_package_schema: PACKAGE_SCHEMA,
    builder_profile: BUILDER_PROFILE,
    schema: SCHEMA,
  };
  eq(researchSemanticDigest(reordered), researchSemanticDigest(AUTHORITY), 'source JSON key order must not change semantic projection');

  throwsCode(() => parseAuthorityBytes(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(authorityText)])), 'BUILDER_CONTRACT_BOM_FORBIDDEN');
  throwsCode(() => parseAuthorityBytes(Buffer.from([0xc3, 0x28])), 'BUILDER_CONTRACT_UTF8_INVALID');
  throwsCode(() => parseAuthorityBytes(Buffer.from('{"schema":"a","schema":"b"}')), 'BUILDER_CONTRACT_DUPLICATE_KEY');
  throwsCode(() => parseAuthorityBytes(Buffer.alloc(MAX_MANIFEST_BYTES + 1, 0x20)), 'BUILDER_CONTRACT_BYTES_INVALID');
  throwsCode(() => parseAuthorityBytes(Buffer.from('{')), 'BUILDER_CONTRACT_JSON_INVALID');

  for (const [mutate, code] of [
    [(x) => { x.extra = true; }, 'BUILDER_CONTRACT_UNKNOWN_FIELD'],
    [(x) => { x.schema = 'webclip-release-builder-contract/v2'; }, 'BUILDER_CONTRACT_SCHEMA_UNSUPPORTED'],
    [(x) => { x.builder_profile = 'other'; }, 'BUILDER_CONTRACT_PROFILE_UNSUPPORTED'],
    [(x) => { x.requires_package_schema = 'webclip-extension-package/v2'; }, 'BUILDER_CONTRACT_PACKAGE_SCHEMA_MISMATCH'],
    [(x) => { x.requires_path_profile = 'portable-ascii-v2'; }, 'BUILDER_CONTRACT_PATH_PROFILE_MISMATCH'],
    [(x) => { x.staging.extra = 'x'; }, 'BUILDER_CONTRACT_UNKNOWN_FIELD'],
    [(x) => { x.staging.root_policy = 'reuse'; }, 'BUILDER_CONTRACT_STAGING_INVALID'],
    [(x) => { x.zip.extra = 'x'; }, 'BUILDER_CONTRACT_UNKNOWN_FIELD'],
    [(x) => { x.zip.compression = 'deflate'; }, 'BUILDER_CONTRACT_ZIP_INVALID'],
    [(x) => { x.zip.zip64 = 'allowed'; }, 'BUILDER_CONTRACT_ZIP_INVALID'],
    [(x) => { x.zip.flag_bits = 8; }, 'BUILDER_CONTRACT_ZIP_INVALID'],
    [(x) => { x.zip.dos_datetime = '2026-09-10T00:00:00'; }, 'BUILDER_CONTRACT_ZIP_INVALID'],
    [(x) => { x.verification.extra = 'x'; }, 'BUILDER_CONTRACT_UNKNOWN_FIELD'],
    [(x) => { x.verification.crc32 = 'optional'; }, 'BUILDER_CONTRACT_VERIFICATION_INVALID'],
  ]) {
    const x = cloneAuthority(); mutate(x); throwsCode(() => validateAuthority(x), code);
  }

  const packageEntries = fixtureEntries(false);
  const stageA = packageEntries.map((e) => ({ name: e.name, type: 'file', bytes: Buffer.from(e.bytes), mtime: 123, uid: 999 }));
  const stageB = [...stageA].reverse().map((e) => ({ ...e, mtime: 999999, uid: 1 }));
  deepEq(validateStage(packageEntries, stageA), validateStage(packageEntries, stageB), 'filesystem metadata/input order must not affect stage projection');
  throwsCode(() => validateStage(packageEntries, stageA.slice(1)), 'BUILDER_STAGE_MEMBERSHIP_MISMATCH');
  throwsCode(() => validateStage(packageEntries, [...stageA, { name: 'extra.js', type: 'file', bytes: Buffer.from('x') }]), 'BUILDER_STAGE_MEMBERSHIP_MISMATCH');
  const stageBadBytes = stageA.map((e) => ({ ...e, bytes: e.name === 'dir/a.js' ? Buffer.from('changed') : e.bytes }));
  throwsCode(() => validateStage(packageEntries, stageBadBytes), 'BUILDER_STAGE_BYTE_MISMATCH');
  const stageLink = stageA.map((e) => ({ ...e, type: e.name === 'dir/a.js' ? 'symlink' : 'file' }));
  throwsCode(() => validateStage(packageEntries, stageLink), 'BUILDER_STAGE_NON_REGULAR');

  const builtA = buildSyntheticZip(packageEntries, { SOURCE_DATE_EPOCH: '0', TZ: 'UTC' });
  const builtB = buildSyntheticZip(fixtureEntries(true), { SOURCE_DATE_EPOCH: '2000000000', TZ: 'Pacific/Honolulu' });
  eq(builtA.raw.length, GOLDEN_ZIP_SIZE, 'predecessor synthetic ZIP size drift');
  eq(sha256(builtA.raw), GOLDEN_ZIP_SHA256, 'predecessor synthetic ZIP hash drift');
  eq(sha256(builtB.raw), GOLDEN_ZIP_SHA256, 'input ordering/environment must not alter exact ZIP bytes');
  check(typeof builtA.python === 'string' && builtA.python.length > 0, 'toolchain version must be capturable as provenance');
  eq(researchSemanticDigest(AUTHORITY), researchSemanticDigest(AUTHORITY), 'toolchain provenance is not semantic contract input');

  const parsedZip = parseClassicZip(builtA.raw, packageEntries);
  eq(parsedZip.central.length, 4, 'synthetic member count drift');
  deepEq(parsedZip.central.map((x) => x.name), ['dir/a.js', 'dir/b.txt', 'manifest.json', 'z-last.bin'], 'canonical member order drift');

  const trailing = Buffer.concat([builtA.raw, Buffer.from([0])]);
  throwsCode(() => parseClassicZip(trailing, packageEntries), 'BUILDER_ZIP_EOCD_NOT_FINAL');

  const preamble = Buffer.concat([Buffer.from([0]), builtA.raw]);
  throwsCode(() => parseClassicZip(preamble, packageEntries), 'ERR_ASSERTION');

  const firstLocalFlags = Buffer.from(builtA.raw);
  firstLocalFlags.writeUInt16LE(8, 6);
  throwsCode(() => parseClassicZip(firstLocalFlags, packageEntries), 'ERR_ASSERTION');

  const firstLocalCrc = Buffer.from(builtA.raw);
  firstLocalCrc.writeUInt32LE((firstLocalCrc.readUInt32LE(14) ^ 1) >>> 0, 14);
  throwsCode(() => parseClassicZip(firstLocalCrc, packageEntries), 'ERR_ASSERTION');

  const firstPayloadMutation = Buffer.from(builtA.raw);
  const firstNameLen = firstPayloadMutation.readUInt16LE(26);
  const firstExtraLen = firstPayloadMutation.readUInt16LE(28);
  const firstData = 30 + firstNameLen + firstExtraLen;
  firstPayloadMutation[firstData] ^= 1;
  throwsCode(() => parseClassicZip(firstPayloadMutation, packageEntries), 'ERR_ASSERTION');

  const eocd = builtA.raw.length - 22;
  const centralOffset = builtA.raw.readUInt32LE(eocd + 16);
  const wrongMethodCentral = Buffer.from(builtA.raw);
  wrongMethodCentral.writeUInt16LE(8, centralOffset + 10);
  throwsCode(() => parseClassicZip(wrongMethodCentral, packageEntries), 'ERR_ASSERTION');

  const wrongMode = Buffer.from(builtA.raw);
  wrongMode.writeUInt32LE(0, centralOffset + 38);
  throwsCode(() => parseClassicZip(wrongMode, packageEntries), 'ERR_ASSERTION');

  const multiDisk = Buffer.from(builtA.raw);
  multiDisk.writeUInt16LE(1, eocd + 4);
  throwsCode(() => parseClassicZip(multiDisk, packageEntries), 'ERR_ASSERTION');

  const zip64Sentinel = Buffer.from(builtA.raw);
  zip64Sentinel.writeUInt32LE(0xffffffff, eocd + 16);
  throwsCode(() => parseClassicZip(zip64Sentinel, packageEntries), 'ERR_ASSERTION');

  const packageByteChange = fixtureEntries(false).map((e) => ({ ...e, bytes: e.name === 'dir/a.js' ? Buffer.from("console.log('B');\n") : e.bytes }));
  const builtChanged = buildSyntheticZip(packageByteChange);
  check(sha256(builtChanged.raw) !== GOLDEN_ZIP_SHA256, 'artifact SHA must change when package payload changes');
  eq(researchSemanticDigest(AUTHORITY), researchSemanticDigest(AUTHORITY), 'package payload must not be a builder-contract input');

  const contractChanged = cloneAuthority(); contractChanged.zip.create_version = 21;
  throwsCode(() => validateAuthority(contractChanged), 'BUILDER_CONTRACT_ZIP_INVALID');
  check(stableJson(contractChanged) !== stableJson(AUTHORITY), 'builder semantic change must be distinguishable from candidate package identity');

  console.log(
    `P1-231 S0-D builder contract authority source-spec model: PASS; cases=${cases}; ` +
    `fixture_zip_bytes=${builtA.raw.length}; fixture_zip_sha256=${sha256(builtA.raw)}; ` +
    `research_contract_sha256=${researchSemanticDigest(AUTHORITY)}; raw_local_central=true; zip64=v1-forbidden; ` +
    `toolchain_provenance_only=true`
  );
})();
