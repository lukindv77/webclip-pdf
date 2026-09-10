'use strict';

// Research-only deterministic model for P1-231 package-path and ZIP
// canonicalization. It builds only a tiny synthetic ZIP fixture; it never
// packages the WebClip extension and never activates release policy.

const assert = require('assert');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const PACKAGE_FILES = Object.freeze([
  'content-injection-guard.js',
  'content.js',
  'frame-agent.js',
  'frame-proxy-budget-guard.js',
  'frame-proxy-inert-guard.js',
  'host-control-activation-guard.js',
  'journal-import-digest.js',
  'journal-import-stream.js',
  'journal-restore-envelope-guard.js',
  'journal-text-filter.js',
  'journal.css',
  'journal.html',
  'journal.js',
  'local-download-identity.js',
  'manifest.json',
  'offscreen-blob-admission-guard.js',
  'offscreen-bootstrap.js',
  'offscreen.html',
  'offscreen.js',
  'operation-log-redaction-guard.js',
  'options.css',
  'options.html',
  'options.js',
  'pdf-print-guard.js',
  'popup.css',
  'popup.html',
  'popup.js',
  'prepared-save-as.js',
  'public-suffix.js',
  'service-worker.js',
  'yandex-auth-help.css',
  'yandex-auth-help.html',
  'yandex-auth-help.js',
]);

const PACKAGE_SCHEMA = 'webclip-extension-package/v1';
const PATH_PROFILE = 'portable-ascii-v1';
const PORTABLE_SEGMENT = /^[A-Za-z0-9._-]+$/;
const WINDOWS_RESERVED = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);
const GOLDEN_ZIP_SHA256 = '1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7';
const GOLDEN_ZIP_SIZE = 510;

let cases = 0;
function check(condition, message) {
  cases += 1;
  assert(condition, message);
}
function eq(actual, expected, message) {
  cases += 1;
  assert.strictEqual(actual, expected, message);
}
function deepEq(actual, expected, message) {
  cases += 1;
  assert.deepStrictEqual(actual, expected, message);
}
function expectThrow(fn, needle) {
  cases += 1;
  assert.throws(fn, needle);
}

function asciiBytesCompare(a, b) {
  return Buffer.from(a, 'ascii').compare(Buffer.from(b, 'ascii'));
}

function validatePortablePath(value) {
  if (typeof value !== 'string' || value.length === 0) throw new Error('path must be non-empty string');
  if (!/^[\x00-\x7f]+$/.test(value)) throw new Error('path must be ASCII');
  if (value.includes('\\')) throw new Error('backslash is forbidden');
  if (value.startsWith('/') || value.endsWith('/')) throw new Error('path must be relative file path');
  if (value.includes('//')) throw new Error('empty path segment');
  if (/[^\x20-\x7e]/.test(value)) throw new Error('control character is forbidden');

  const parts = value.split('/');
  for (const part of parts) {
    if (part === '.' || part === '..') throw new Error('dot traversal segment is forbidden');
    if (!PORTABLE_SEGMENT.test(part)) throw new Error('segment violates portable-ascii-v1');
    if (part.endsWith('.')) throw new Error('trailing dot is forbidden');
    const deviceBase = part.split('.', 1)[0].toUpperCase();
    if (WINDOWS_RESERVED.has(deviceBase)) throw new Error('Windows reserved device basename');
  }
  return value;
}

function canonicalCollisionKey(value) {
  validatePortablePath(value);
  return value.toLowerCase();
}

function validateFileSet(files) {
  if (!Array.isArray(files) || files.length === 0) throw new Error('package files must be non-empty array');
  const exact = new Set();
  const folded = new Map();
  for (const file of files) {
    validatePortablePath(file);
    if (exact.has(file)) throw new Error(`duplicate exact package path: ${file}`);
    exact.add(file);
    const key = canonicalCollisionKey(file);
    if (folded.has(key)) throw new Error(`case-insensitive package collision: ${folded.get(key)} vs ${file}`);
    folded.set(key, file);
  }
  if (!exact.has('manifest.json')) throw new Error('manifest.json missing at package root');
  if (files.filter((p) => p.toLowerCase() === 'manifest.json').length !== 1) throw new Error('manifest root identity is ambiguous');

  const keys = [...folded.keys()].sort();
  for (let i = 0; i < keys.length; i += 1) {
    for (let j = i + 1; j < keys.length; j += 1) {
      if (keys[j].startsWith(`${keys[i]}/`)) {
        throw new Error(`file/directory prefix collision: ${folded.get(keys[i])} vs ${folded.get(keys[j])}`);
      }
    }
  }
  return [...files].sort(asciiBytesCompare);
}

function semanticTopologyDigest(files) {
  const sorted = validateFileSet(files);
  const h = crypto.createHash('sha256');
  h.update('WEBCLIP_PACKAGE_TOPOLOGY_V1\0', 'ascii');
  h.update(PACKAGE_SCHEMA, 'ascii');
  h.update('\0', 'ascii');
  h.update(PATH_PROFILE, 'ascii');
  h.update('\0', 'ascii');
  for (const item of sorted) {
    const bytes = Buffer.from(item, 'ascii');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(bytes.length);
    h.update(len);
    h.update(bytes);
  }
  return h.digest('hex');
}

const PYTHON_SCRIPT = String.raw`
import base64, hashlib, io, json, sys, zipfile
payload = json.load(sys.stdin)
entries = {item['name']: base64.b64decode(item['data_b64']) for item in payload['entries']}
buf = io.BytesIO()
with zipfile.ZipFile(buf, 'w', compression=zipfile.ZIP_STORED, allowZip64=False) as archive:
    archive.comment = b''
    for name in sorted(entries, key=lambda s: s.encode('ascii')):
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
        archive.writestr(info, entries[name])
raw = buf.getvalue()
with zipfile.ZipFile(io.BytesIO(raw), 'r') as archive:
    infos = []
    bad = archive.testzip()
    for info in archive.infolist():
        infos.append({
            'filename': info.filename,
            'date_time': list(info.date_time),
            'compress_type': info.compress_type,
            'create_system': info.create_system,
            'create_version': info.create_version,
            'extract_version': info.extract_version,
            'mode': info.external_attr >> 16,
            'internal_attr': info.internal_attr,
            'flag_bits': info.flag_bits,
            'extra_len': len(info.extra),
            'comment_len': len(info.comment),
            'is_dir': info.is_dir(),
            'size': info.file_size,
            'sha256': hashlib.sha256(archive.read(info)).hexdigest(),
        })
    result = {
        'zip_size': len(raw),
        'zip_sha256': hashlib.sha256(raw).hexdigest(),
        'archive_comment_len': len(archive.comment),
        'testzip': bad,
        'infos': infos,
    }
print(json.dumps(result, sort_keys=True, separators=(',', ':')))
`;

function pythonCommand() {
  const candidates = process.platform === 'win32' ? ['python'] : ['python3', 'python'];
  for (const cmd of candidates) {
    const probe = spawnSync(cmd, ['--version'], { encoding: 'utf8' });
    if (probe.status === 0) return cmd;
  }
  throw new Error('Python runtime not found for research ZIP golden-vector test');
}

function fixtureEntries(order = 'normal', mutate = false) {
  const raw = [
    ['z-last.bin', Buffer.from([0, 255, 10, 13, 42])],
    ['manifest.json', Buffer.from('{"manifest_version":3,"name":"Fixture","version":"0.0.0.1"}\n', 'utf8')],
    ['dir/b.txt', Buffer.from('Привет WebClip\n', 'utf8')],
    ['dir/a.js', Buffer.from("console.log('A');\n", 'utf8')],
  ];
  if (mutate) raw[3][1] = Buffer.from("console.log('B');\n", 'utf8');
  if (order === 'reverse') raw.reverse();
  return raw.map(([name, bytes]) => ({ name, data_b64: bytes.toString('base64') }));
}

function buildSyntheticZip(entries, envPatch = {}) {
  const cmd = pythonCommand();
  const proc = spawnSync(cmd, ['-c', PYTHON_SCRIPT], {
    input: JSON.stringify({ entries }),
    encoding: 'utf8',
    env: { ...process.env, ...envPatch },
  });
  if (proc.status !== 0) {
    throw new Error(`synthetic ZIP builder failed: ${proc.stderr || proc.stdout}`);
  }
  return JSON.parse(proc.stdout.trim());
}

(function main() {
  // Current WebClip package paths must fit the proposed v1 portability profile.
  eq(PACKAGE_FILES.length, 33, 'current package path census drift');
  const sortedCurrent = validateFileSet(PACKAGE_FILES);
  eq(sortedCurrent.length, 33, 'validated current package set size drift');
  eq(sortedCurrent.filter((p) => p === 'manifest.json').length, 1, 'manifest root uniqueness drift');
  for (const rel of PACKAGE_FILES) {
    eq(validatePortablePath(rel), rel, `current package path must be portable-ascii-v1: ${rel}`);
  }

  // Valid examples.
  for (const rel of ['manifest.json', 'content.js', 'dir/a.js', 'assets/icon-16.png', 'a_b-c.d', '.hidden']) {
    eq(validatePortablePath(rel), rel, `valid portable path rejected: ${rel}`);
  }

  // Invalid syntax/traversal/portability examples.
  for (const [rel, needle] of [
    ['', /non-empty/],
    ['/absolute.js', /relative/],
    ['trailing/', /relative/],
    ['a//b.js', /empty path segment/],
    ['./a.js', /dot traversal/],
    ['a/./b.js', /dot traversal/],
    ['../a.js', /dot traversal/],
    ['a/../b.js', /dot traversal/],
    ['a\\b.js', /backslash/],
    ['a b.js', /portable-ascii/],
    ['a:b.js', /portable-ascii/],
    ['a?.js', /portable-ascii/],
    ['a|b.js', /portable-ascii/],
    ['a*b.js', /portable-ascii/],
    ['a"b.js', /portable-ascii/],
    ['café.js', /ASCII/],
    ['foo.', /trailing dot/],
    ['a/..', /dot traversal/],
  ]) {
    expectThrow(() => validatePortablePath(rel), needle);
  }

  // Windows-reserved basenames, including names followed by extensions.
  for (const rel of ['CON', 'con.txt', 'NUL', 'nul.json', 'COM1', 'COM1.js', 'LPT9.bin', 'dir/aux.css']) {
    expectThrow(() => validatePortablePath(rel), /reserved device/);
  }

  // Collision and manifest-set rules.
  expectThrow(() => validateFileSet(['manifest.json', 'Foo.js', 'foo.js']), /case-insensitive/);
  expectThrow(() => validateFileSet(['manifest.json', 'A/B.js', 'a/b.js']), /case-insensitive/);
  expectThrow(() => validateFileSet(['manifest.json', 'file', 'file/sub.js']), /prefix collision/);
  expectThrow(() => validateFileSet(['manifest.json', 'same.js', 'same.js']), /duplicate exact/);
  expectThrow(() => validateFileSet(['content.js']), /manifest.json missing/);
  expectThrow(() => validateFileSet(['Manifest.json', 'manifest.json']), /case-insensitive|ambiguous/);
  expectThrow(() => validateFileSet([]), /non-empty/);

  // Semantic topology fingerprint ignores source JSON ordering/formatting analogues,
  // but not schema/profile/member semantics.
  const topoA = semanticTopologyDigest(['manifest.json', 'dir/a.js', 'z.js']);
  const topoB = semanticTopologyDigest(['z.js', 'manifest.json', 'dir/a.js']);
  eq(topoA, topoB, 'semantic topology digest must canonicalize manifest file order');
  check(semanticTopologyDigest(['manifest.json', 'dir/a.js', 'z2.js']) !== topoA, 'member change must alter semantic topology digest');
  check(/^[0-9a-f]{64}$/.test(topoA), 'topology digest must be SHA-256 hex');

  // Synthetic ZIP golden vector: no WebClip product bytes are packaged here.
  const first = buildSyntheticZip(fixtureEntries('normal'), { SOURCE_DATE_EPOCH: '0', TZ: 'UTC' });
  const reordered = buildSyntheticZip(fixtureEntries('reverse'), { SOURCE_DATE_EPOCH: '2000000000', TZ: 'Pacific/Honolulu' });
  eq(first.zip_size, GOLDEN_ZIP_SIZE, 'synthetic canonical ZIP size drift');
  eq(first.zip_sha256, GOLDEN_ZIP_SHA256, 'synthetic canonical ZIP golden hash drift');
  eq(reordered.zip_sha256, GOLDEN_ZIP_SHA256, 'input order/timezone/SOURCE_DATE_EPOCH must not alter explicit canonical ZIP');
  deepEq(first, reordered, 'canonical ZIP inspection must be identical across reordered/environment-varied builds');
  eq(first.archive_comment_len, 0, 'archive comment must be empty');
  eq(first.testzip, null, 'ZIP CRC verification must pass');
  eq(first.infos.length, 4, 'synthetic ZIP member count drift');
  deepEq(first.infos.map((x) => x.filename), ['dir/a.js', 'dir/b.txt', 'manifest.json', 'z-last.bin'], 'ZIP members must use canonical ASCII order');

  for (const info of first.infos) {
    deepEq(info.date_time, [1980, 1, 1, 0, 0, 0], `ZIP timestamp drift for ${info.filename}`);
    eq(info.compress_type, 0, `ZIP method must be STORED for ${info.filename}`);
    eq(info.create_system, 3, `ZIP create_system must be Unix for ${info.filename}`);
    eq(info.create_version, 20, `ZIP create_version drift for ${info.filename}`);
    eq(info.extract_version, 20, `ZIP extract_version drift for ${info.filename}`);
    eq(info.mode, 0o100644, `ZIP external mode drift for ${info.filename}`);
    eq(info.internal_attr, 0, `ZIP internal_attr drift for ${info.filename}`);
    eq(info.flag_bits, 0, `ZIP flag bits drift for ASCII member ${info.filename}`);
    eq(info.extra_len, 0, `ZIP extra fields must be empty for ${info.filename}`);
    eq(info.comment_len, 0, `ZIP member comment must be empty for ${info.filename}`);
    eq(info.is_dir, false, `ZIP must contain file entries only: ${info.filename}`);
    check(/^[0-9a-f]{64}$/.test(info.sha256), `member digest must be SHA-256 hex: ${info.filename}`);
  }

  const mutated = buildSyntheticZip(fixtureEntries('normal', true), { SOURCE_DATE_EPOCH: '0', TZ: 'UTC' });
  check(mutated.zip_sha256 !== GOLDEN_ZIP_SHA256, 'changing one member byte must change exact ZIP artifact hash');
  deepEq(mutated.infos.map((x) => x.filename), first.infos.map((x) => x.filename), 'payload mutation must not alter member topology');

  // Explicit file-list model: no recursive-directory admission and no directory ZIP entries.
  check(!PACKAGE_FILES.some((p) => p.endsWith('/')), 'current package manifest model must contain files only');
  check(PACKAGE_FILES.every((p) => !p.includes('**')), 'recursive glob admission is forbidden in file-only v1 manifest');

  console.log(
    `P1-231 package builder canonicalization model: PASS; cases=${cases}; ` +
    `package_paths=${PACKAGE_FILES.length}; path_profile=${PATH_PROFILE}; ` +
    `fixture_zip_bytes=${first.zip_size}; fixture_zip_sha256=${first.zip_sha256}`
  );
})();
