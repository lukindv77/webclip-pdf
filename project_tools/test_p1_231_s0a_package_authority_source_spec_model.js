'use strict';

// Research-only executable model for P1-231 S0-A explicit package authority.
// It does not create the production package manifest or activate release policy.

const assert = require('assert');
const crypto = require('crypto');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA = 'webclip-extension-package/v1';
const PROFILE = 'portable-ascii-v1';
const MAX_MANIFEST_BYTES = 256 * 1024;
const MAX_FILES = 4096;
const MAX_PATH_BYTES = 1024;
const REQUIRED_KEYS = ['files', 'path_profile', 'schema'];
const RESERVED = new Set([
  'con', 'prn', 'aux', 'nul',
  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
]);

const CURRENT_FILES = Object.freeze([
  'application-generation.js',
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

let cases = 0;
function check(value, message) { cases += 1; assert(value, message); }
function eq(actual, expected, message) { cases += 1; assert.strictEqual(actual, expected, message); }
function deepEq(actual, expected, message) { cases += 1; assert.deepStrictEqual(actual, expected, message); }
function throwsCode(fn, code, message) {
  cases += 1;
  assert.throws(fn, (err) => err && err.code === code, message || `expected ${code}`);
}
function fail(code, detail) {
  const err = new Error(detail || code);
  err.code = code;
  throw err;
}
function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}
function lowerAscii(s) { return s.replace(/[A-Z]/g, (c) => c.toLowerCase()); }
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; }

// Detect duplicate names in every JSON object without accepting last-wins semantics.
// The routine lexes strings/structural punctuation and tracks keys per object depth;
// JSON.parse remains the grammar/value parser after ambiguity has been rejected.
function rejectDuplicateObjectKeys(text) {
  const stack = [];
  let i = 0;
  let expectingKey = false;
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
    fail('PACKAGE_MANIFEST_JSON_INVALID', 'unterminated string');
  }
  while (i < text.length) {
    skipWs();
    if (i >= text.length) break;
    const ch = text[i];
    if (ch === '"') {
      const raw = readString();
      skipWs();
      if (stack.length && stack[stack.length - 1].type === 'object' && expectingKey && text[i] === ':') {
        let key;
        try { key = JSON.parse(raw); } catch { fail('PACKAGE_MANIFEST_JSON_INVALID'); }
        const frame = stack[stack.length - 1];
        if (frame.keys.has(key)) fail('PACKAGE_MANIFEST_DUPLICATE_KEY', key);
        frame.keys.add(key);
        expectingKey = false;
      }
      continue;
    }
    if (ch === '{') {
      stack.push({ type: 'object', keys: new Set() }); i += 1; expectingKey = true; continue;
    }
    if (ch === '[') {
      stack.push({ type: 'array' }); i += 1; expectingKey = false; continue;
    }
    if (ch === '}' || ch === ']') {
      if (stack.length) stack.pop(); i += 1; expectingKey = false; continue;
    }
    if (ch === ',' && stack.length && stack[stack.length - 1].type === 'object') {
      i += 1; expectingKey = true; continue;
    }
    i += 1;
  }
}

function validatePath(p) {
  if (typeof p !== 'string' || !p) fail('PACKAGE_PATH_INVALID');
  if (Buffer.byteLength(p, 'utf8') > MAX_PATH_BYTES) fail('PACKAGE_PATH_TOO_LONG');
  if (!/^[\x00-\x7f]+$/.test(p)) fail('PACKAGE_PATH_INVALID');
  if (p.startsWith('/') || p.endsWith('/') || p.includes('//') || p.includes('\\')) fail('PACKAGE_PATH_INVALID');
  if (/[\x00-\x1f\x7f]/.test(p)) fail('PACKAGE_PATH_INVALID');
  const segments = p.split('/');
  if (!segments.length) fail('PACKAGE_PATH_INVALID');
  for (const seg of segments) {
    if (!seg || !/^[A-Za-z0-9._-]+$/.test(seg) || seg === '.' || seg === '..' || seg.endsWith('.')) {
      fail('PACKAGE_PATH_INVALID');
    }
    const base = lowerAscii(seg.split('.')[0]);
    if (RESERVED.has(base)) fail('PACKAGE_PATH_RESERVED_NAME');
  }
  return p;
}

function validateFiles(files) {
  if (!Array.isArray(files) || files.length === 0) fail('PACKAGE_MANIFEST_FILES_INVALID');
  if (files.length > MAX_FILES) fail('PACKAGE_MANIFEST_FILE_COUNT_EXCEEDED');
  const exact = new Set();
  const folded = new Map();
  for (const raw of files) {
    if (typeof raw !== 'string') fail('PACKAGE_MANIFEST_FILES_INVALID');
    const p = validatePath(raw);
    if (exact.has(p)) fail('PACKAGE_PATH_DUPLICATE');
    exact.add(p);
    const f = lowerAscii(p);
    if (folded.has(f)) fail('PACKAGE_PATH_CASE_COLLISION');
    folded.set(f, p);
  }
  for (const p of exact) {
    const parts = p.split('/');
    for (let n = 1; n < parts.length; n += 1) {
      const prefix = lowerAscii(parts.slice(0, n).join('/'));
      if (folded.has(prefix)) fail('PACKAGE_PATH_PREFIX_COLLISION');
    }
  }
  const manifestMatches = [...exact].filter((p) => p === 'manifest.json');
  if (manifestMatches.length !== 1) fail('PACKAGE_MANIFEST_REQUIRED_MEMBER_MISSING');
  return [...exact].sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
}

function parseStrictManifest(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) fail('PACKAGE_MANIFEST_JSON_INVALID');
  if (bytes.length > MAX_MANIFEST_BYTES) fail('PACKAGE_MANIFEST_TOO_LARGE');
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) fail('PACKAGE_MANIFEST_BOM_FORBIDDEN');
  let text;
  try {
    const round = Buffer.from(bytes.toString('utf8'), 'utf8');
    if (!round.equals(bytes)) fail('PACKAGE_MANIFEST_UTF8_INVALID');
    text = bytes.toString('utf8');
  } catch (err) {
    if (err && err.code) throw err;
    fail('PACKAGE_MANIFEST_UTF8_INVALID');
  }
  if (/\b(?:NaN|Infinity|-Infinity)\b/.test(text)) fail('PACKAGE_MANIFEST_CONSTANT_INVALID');
  rejectDuplicateObjectKeys(text);
  let value;
  try { value = JSON.parse(text); } catch { fail('PACKAGE_MANIFEST_JSON_INVALID'); }
  if (!value || Array.isArray(value) || typeof value !== 'object') fail('PACKAGE_MANIFEST_SHAPE_INVALID');
  const keys = Object.keys(value).sort();
  for (const key of keys) if (!REQUIRED_KEYS.includes(key)) fail('PACKAGE_MANIFEST_UNKNOWN_FIELD');
  for (const key of REQUIRED_KEYS) if (!Object.prototype.hasOwnProperty.call(value, key)) fail('PACKAGE_MANIFEST_REQUIRED_FIELD_MISSING');
  if (typeof value.schema !== 'string' || typeof value.path_profile !== 'string') fail('PACKAGE_MANIFEST_SHAPE_INVALID');
  if (value.schema !== SCHEMA) fail('PACKAGE_MANIFEST_SCHEMA_UNSUPPORTED');
  if (value.path_profile !== PROFILE) fail('PACKAGE_MANIFEST_PATH_PROFILE_UNSUPPORTED');
  return Object.freeze({ schema: SCHEMA, path_profile: PROFILE, files: Object.freeze(validateFiles(value.files)) });
}

function topologyDigest(topology) {
  const hash = crypto.createHash('sha256');
  hash.update(Buffer.from('WEBCLIP_PACKAGE_TOPOLOGY_V1\0', 'utf8'));
  for (const s of [topology.schema, topology.path_profile]) {
    const b = Buffer.from(s, 'utf8'); hash.update(u32(b.length)); hash.update(b);
  }
  hash.update(u32(topology.files.length));
  for (const p of topology.files) { const b = Buffer.from(p, 'utf8'); hash.update(u32(b.length)); hash.update(b); }
  return hash.digest('hex');
}

function canonicalManifest(files = CURRENT_FILES) {
  return Buffer.from(JSON.stringify({ schema: SCHEMA, path_profile: PROFILE, files }), 'utf8');
}

function parseLsTree(commit) {
  const out = git('ls-tree', '-r', commit);
  const map = new Map();
  for (const line of out.split(/\r?\n/)) {
    if (!line) continue;
    const tab = line.indexOf('\t');
    const [mode, type, oid] = line.slice(0, tab).split(/\s+/);
    const rel = line.slice(tab + 1);
    map.set(rel, { mode, type, oid });
  }
  return map;
}

(function main() {
  eq(CURRENT_FILES.length, 34, 'current migration census must be 34 files');
  eq(new Set(CURRENT_FILES).size, 34, 'current migration census must have no duplicates');

  const topo = parseStrictManifest(canonicalManifest());
  eq(topo.schema, SCHEMA);
  eq(topo.path_profile, PROFILE);
  eq(topo.files.length, 34);
  eq(topo.files.filter((p) => p === 'manifest.json').length, 1);

  // Source parser fail-closed matrix.
  throwsCode(() => parseStrictManifest(Buffer.alloc(0)), 'PACKAGE_MANIFEST_JSON_INVALID');
  throwsCode(() => parseStrictManifest(Buffer.alloc(MAX_MANIFEST_BYTES + 1, 0x20)), 'PACKAGE_MANIFEST_TOO_LARGE');
  throwsCode(() => parseStrictManifest(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), canonicalManifest()])), 'PACKAGE_MANIFEST_BOM_FORBIDDEN');
  throwsCode(() => parseStrictManifest(Buffer.from([0xc3, 0x28])), 'PACKAGE_MANIFEST_UTF8_INVALID');
  throwsCode(() => parseStrictManifest(Buffer.from('{')), 'PACKAGE_MANIFEST_JSON_INVALID');
  throwsCode(() => parseStrictManifest(Buffer.from('{"schema":"x","schema":"y","path_profile":"portable-ascii-v1","files":["manifest.json"]}')), 'PACKAGE_MANIFEST_DUPLICATE_KEY');
  throwsCode(() => parseStrictManifest(Buffer.from('{"schema":"webclip-extension-package/v1","path_profile":"portable-ascii-v1","files":["manifest.json"],"x":{"a":1,"a":2}}')), 'PACKAGE_MANIFEST_DUPLICATE_KEY');
  throwsCode(() => parseStrictManifest(Buffer.from('{"schema":"webclip-extension-package/v1","path_profile":"portable-ascii-v1","files":["manifest.json"],"n":NaN}')), 'PACKAGE_MANIFEST_CONSTANT_INVALID');
  throwsCode(() => parseStrictManifest(Buffer.from('[]')), 'PACKAGE_MANIFEST_SHAPE_INVALID');
  throwsCode(() => parseStrictManifest(Buffer.from('null')), 'PACKAGE_MANIFEST_SHAPE_INVALID');
  throwsCode(() => parseStrictManifest(Buffer.from('{"schema":"webclip-extension-package/v1","path_profile":"portable-ascii-v1","files":["manifest.json"],"extra":true}')), 'PACKAGE_MANIFEST_UNKNOWN_FIELD');
  throwsCode(() => parseStrictManifest(Buffer.from('{"schema":"webclip-extension-package/v1","files":["manifest.json"]}')), 'PACKAGE_MANIFEST_REQUIRED_FIELD_MISSING');
  throwsCode(() => parseStrictManifest(Buffer.from('{"schema":1,"path_profile":"portable-ascii-v1","files":["manifest.json"]}')), 'PACKAGE_MANIFEST_SHAPE_INVALID');
  throwsCode(() => parseStrictManifest(Buffer.from('{"schema":"v2","path_profile":"portable-ascii-v1","files":["manifest.json"]}')), 'PACKAGE_MANIFEST_SCHEMA_UNSUPPORTED');
  throwsCode(() => parseStrictManifest(Buffer.from('{"schema":"webclip-extension-package/v1","path_profile":"unicode-v2","files":["manifest.json"]}')), 'PACKAGE_MANIFEST_PATH_PROFILE_UNSUPPORTED');
  throwsCode(() => parseStrictManifest(Buffer.from('{"schema":"webclip-extension-package/v1","path_profile":"portable-ascii-v1","files":[]}')), 'PACKAGE_MANIFEST_FILES_INVALID');
  throwsCode(() => validateFiles(new Array(MAX_FILES + 1).fill(0).map((_, i) => `f${i}.js`).concat(['manifest.json'])), 'PACKAGE_MANIFEST_FILE_COUNT_EXCEEDED');
  throwsCode(() => validateFiles(['manifest.json', 1]), 'PACKAGE_MANIFEST_FILES_INVALID');

  // Path profile fail-closed matrix.
  const badPaths = [
    '/manifest.json', 'dir/', 'dir//x.js', 'dir\\x.js', './x.js', '../x.js', 'dir/../x.js',
    'foo bar.js', 'foo?.js', 'foo:.js', 'café.js', 'foo.', 'dir/.', 'dir/..', 'a\u0001.js',
  ];
  for (const p of badPaths) throwsCode(() => validatePath(p), 'PACKAGE_PATH_INVALID', p);
  for (const p of ['CON', 'nul.txt', 'dir/COM1.js', 'PrN.css', 'x/Lpt9.bin']) {
    throwsCode(() => validatePath(p), 'PACKAGE_PATH_RESERVED_NAME', p);
  }
  throwsCode(() => validatePath('a'.repeat(MAX_PATH_BYTES + 1)), 'PACKAGE_PATH_TOO_LONG');
  throwsCode(() => validateFiles(['manifest.json', 'a.js', 'a.js']), 'PACKAGE_PATH_DUPLICATE');
  throwsCode(() => validateFiles(['manifest.json', 'Foo.js', 'foo.js']), 'PACKAGE_PATH_CASE_COLLISION');
  throwsCode(() => validateFiles(['manifest.json', 'a', 'a/b.js']), 'PACKAGE_PATH_PREFIX_COLLISION');
  throwsCode(() => validateFiles(['manifest.json', 'A', 'a/b.js']), 'PACKAGE_PATH_PREFIX_COLLISION');
  throwsCode(() => validateFiles(['x.js']), 'PACKAGE_MANIFEST_REQUIRED_MEMBER_MISSING');
  throwsCode(() => validateFiles(['Manifest.json']), 'PACKAGE_MANIFEST_REQUIRED_MEMBER_MISSING');

  for (const p of CURRENT_FILES) eq(validatePath(p), p, `current path must satisfy portable-ascii-v1: ${p}`);

  // Semantic canonicalization: representation reorder/whitespace do not matter.
  const reverseTopo = parseStrictManifest(canonicalManifest([...CURRENT_FILES].reverse()));
  eq(topologyDigest(reverseTopo), topologyDigest(topo), 'files array order must not affect semantic topology');
  const pretty = Buffer.from(JSON.stringify({ files: CURRENT_FILES, path_profile: PROFILE, schema: SCHEMA }, null, 2));
  eq(topologyDigest(parseStrictManifest(pretty)), topologyDigest(topo), 'JSON formatting/key order must not affect semantic topology');
  const added = parseStrictManifest(canonicalManifest([...CURRENT_FILES, 'synthetic.bin']));
  check(topologyDigest(added) !== topologyDigest(topo), 'membership addition must change topology');
  const removed = parseStrictManifest(canonicalManifest(CURRENT_FILES.filter((p) => p !== 'popup.css')));
  check(topologyDigest(removed) !== topologyDigest(topo), 'membership removal must change topology');

  // Exact canonical Git tree bootstrap proof.
  const head = git('rev-parse', 'HEAD');
  check(/^[0-9a-f]{40}$/.test(head), 'execution HEAD must resolve to exact commit SHA');
  eq(git('cat-file', '-t', head), 'commit', 'candidate must be a commit');
  const tree = parseLsTree(head);
  for (const rel of CURRENT_FILES) {
    const e = tree.get(rel);
    check(Boolean(e), `current package member missing from exact tree: ${rel}`);
    eq(e.type, 'blob', `current package member must be blob: ${rel}`);
    eq(e.mode, '100644', `current package member must be mode 100644: ${rel}`);
    check(/^[0-9a-f]{40}$/.test(e.oid), `current package member must have Git oid: ${rel}`);
  }

  // Authority/control separation.
  check(!CURRENT_FILES.includes('public_suffix_list.dat'), 'generation source must stay outside package');
  check(!CURRENT_FILES.includes('release_package_manifest_v1.json'), 'future package authority file must not package itself');
  check(!CURRENT_FILES.some((p) => p.startsWith('project_docs/')), 'research docs must stay outside package');
  check(!CURRENT_FILES.some((p) => p.startsWith('project_tools/')), 'project tooling must stay outside package');
  check(!CURRENT_FILES.some((p) => p.startsWith('.github/')), 'GitHub control plane must stay outside package');

  // Legacy classifier is demonstrably not S0-A authority.
  const legacy = require('fs').readFileSync(path.join(ROOT, 'project_tools', 'check_pr_change_contract.py'), 'utf8');
  check(legacy.includes('RUNTIME_SUFFIXES'), 'legacy PR checker heuristic still exists at S0-A research baseline');
  check(legacy.includes('RUNTIME_DIRS'), 'legacy PR checker directory heuristic still exists at S0-A research baseline');
  check(!legacy.includes('release_package_manifest_v1.json'), 'legacy PR checker must not already be mistaken for package authority');

  const digest = topologyDigest(topo);
  check(/^[0-9a-f]{64}$/.test(digest), 'topology digest must be SHA-256 hex');
  console.log(`P1-231 S0-A package authority source-spec model: PASS; cases=${cases}; package_files=${topo.files.length}; topology_sha256=${digest}; head=${head}`);
})();
