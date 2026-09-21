'use strict';

// Research-only deterministic refinement for P1-231 S0-B.
// Closes raw-manifest parsing and v1 relation-composition semantics only.
// It does not create production authority files, fix the PSL generator, or activate release policy.

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA = 'webclip-source-generation/v1';
const PROFILE = 'cpython-3.12.10-v1';
const MAX_MANIFEST_BYTES = 256 * 1024;
const MAX_RELATIONS = 256;
const MAX_PATHS = 256;
const MAX_PATH_BYTES = 1024;
const TOP_KEYS = new Set(['schema', 'relations']);
const REL_KEYS = new Set(['id', 'runtime_profile', 'generator', 'inputs', 'outputs']);
const RESERVED = new Set([
  'con', 'prn', 'aux', 'nul',
  ...Array.from({ length: 9 }, (_, i) => `com${i + 1}`),
  ...Array.from({ length: 9 }, (_, i) => `lpt${i + 1}`),
]);
const PACKAGE_FILES = new Set([
  'content-injection-guard.js','content.js','frame-agent.js','frame-proxy-budget-guard.js',
  'frame-proxy-inert-guard.js','host-control-activation-guard.js','journal-import-digest.js',
  'journal-import-stream.js','journal-restore-envelope-guard.js','journal-text-filter.js','journal.css',
  'journal.html','journal.js','local-download-identity.js','manifest.json','offscreen-blob-admission-guard.js',
  'offscreen-bootstrap.js','offscreen.html','offscreen.js','operation-log-redaction-guard.js','options.css',
  'options.html','options.js','pdf-print-guard.js','popup.css','popup.html','popup.js','prepared-save-as.js',
  'public-suffix.js','service-worker.js','yandex-auth-help.css','yandex-auth-help.html','yandex-auth-help.js',
]);

let cases = 0;
function check(v, m) { cases += 1; assert(v, m); }
function eq(a, b, m) { cases += 1; assert.strictEqual(a, b, m); }
function deepEq(a, b, m) { cases += 1; assert.deepStrictEqual(a, b, m); }
function fail(code, detail) { const e = new Error(detail || code); e.code = code; throw e; }
function throwsCode(fn, code, msg) {
  cases += 1;
  assert.throws(fn, (e) => e && e.code === code, msg || `expected ${code}`);
}
function lowerAscii(s) { return s.replace(/[A-Z]/g, (c) => c.toLowerCase()); }
function git(...args) { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim(); }
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; }

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
    fail('SOURCE_GENERATION_MANIFEST_JSON_INVALID', 'unterminated string');
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
        try { key = JSON.parse(raw); } catch { fail('SOURCE_GENERATION_MANIFEST_JSON_INVALID'); }
        const frame = stack[stack.length - 1];
        if (frame.keys.has(key)) fail('SOURCE_GENERATION_MANIFEST_DUPLICATE_KEY', key);
        frame.keys.add(key);
        expectingKey = false;
      }
      continue;
    }
    if (ch === '{') { stack.push({ type: 'object', keys: new Set() }); i += 1; expectingKey = true; continue; }
    if (ch === '[') { stack.push({ type: 'array' }); i += 1; expectingKey = false; continue; }
    if (ch === '}' || ch === ']') { if (stack.length) stack.pop(); i += 1; expectingKey = false; continue; }
    if (ch === ',' && stack.length && stack[stack.length - 1].type === 'object') { i += 1; expectingKey = true; continue; }
    i += 1;
  }
}

function validatePath(p) {
  if (typeof p !== 'string' || !p) fail('SOURCE_GENERATION_PATH_INVALID');
  if (Buffer.byteLength(p, 'utf8') > MAX_PATH_BYTES) fail('SOURCE_GENERATION_PATH_INVALID');
  if (!/^[\x00-\x7f]+$/.test(p) || p.startsWith('/') || p.endsWith('/') || p.includes('//') || p.includes('\\')) {
    fail('SOURCE_GENERATION_PATH_INVALID');
  }
  if (/[\x00-\x1f\x7f]/.test(p)) fail('SOURCE_GENERATION_PATH_INVALID');
  for (const seg of p.split('/')) {
    if (!seg || !/^[A-Za-z0-9._-]+$/.test(seg) || seg === '.' || seg === '..' || seg.endsWith('.')) {
      fail('SOURCE_GENERATION_PATH_INVALID');
    }
    if (RESERVED.has(lowerAscii(seg.split('.')[0]))) fail('SOURCE_GENERATION_PATH_RESERVED');
  }
  return p;
}

function canonicalList(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_PATHS || value.some((p) => typeof p !== 'string')) {
    fail('SOURCE_GENERATION_RELATION_INVALID');
  }
  const exact = new Set();
  const folded = new Set();
  for (const raw of value) {
    const p = validatePath(raw);
    const f = lowerAscii(p);
    if (exact.has(p) || folded.has(f)) fail('SOURCE_GENERATION_RELATION_INVALID');
    exact.add(p); folded.add(f);
  }
  return [...exact].sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
}

function canonicalizeRelation(raw) {
  if (!raw || Array.isArray(raw) || typeof raw !== 'object') fail('SOURCE_GENERATION_RELATION_INVALID');
  for (const k of Object.keys(raw)) if (!REL_KEYS.has(k)) fail('SOURCE_GENERATION_MANIFEST_UNKNOWN_FIELD', k);
  for (const k of REL_KEYS) if (!Object.prototype.hasOwnProperty.call(raw, k)) fail('SOURCE_GENERATION_RELATION_INVALID', k);
  if (typeof raw.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(raw.id)) fail('SOURCE_GENERATION_RELATION_INVALID');
  if (raw.runtime_profile !== PROFILE) fail('SOURCE_GENERATION_RUNTIME_PROFILE_UNSUPPORTED');
  const generator = validatePath(raw.generator);
  const inputs = canonicalList(raw.inputs);
  const outputs = canonicalList(raw.outputs);
  const generatorFold = lowerAscii(generator);
  if (inputs.some((p) => lowerAscii(p) === generatorFold)) fail('SOURCE_GENERATION_RELATION_INVALID', 'generator duplicated as input');
  for (const out of outputs) if (!PACKAGE_FILES.has(out)) fail('SOURCE_GENERATION_OUTPUT_NOT_PACKAGE_MEMBER', out);
  return Object.freeze({ id: raw.id, runtime_profile: raw.runtime_profile, generator, inputs: Object.freeze(inputs), outputs: Object.freeze(outputs) });
}

function validateGlobalPathPrefixes(paths) {
  const unique = new Map();
  for (const p of paths) unique.set(lowerAscii(p), p);
  for (const [folded, original] of unique) {
    const parts = folded.split('/');
    for (let n = 1; n < parts.length; n += 1) {
      const prefix = parts.slice(0, n).join('/');
      if (unique.has(prefix)) fail('SOURCE_GENERATION_RELATION_INVALID', `path prefix collision: ${unique.get(prefix)} vs ${original}`);
    }
  }
}

function validateAuthority(value) {
  if (!value || Array.isArray(value) || typeof value !== 'object') fail('SOURCE_GENERATION_MANIFEST_SHAPE_INVALID');
  for (const k of Object.keys(value)) if (!TOP_KEYS.has(k)) fail('SOURCE_GENERATION_MANIFEST_UNKNOWN_FIELD', k);
  for (const k of TOP_KEYS) if (!Object.prototype.hasOwnProperty.call(value, k)) fail('SOURCE_GENERATION_MANIFEST_SHAPE_INVALID', k);
  if (value.schema !== SCHEMA) fail('SOURCE_GENERATION_SCHEMA_UNSUPPORTED');
  if (!Array.isArray(value.relations) || value.relations.length === 0 || value.relations.length > MAX_RELATIONS) {
    fail('SOURCE_GENERATION_MANIFEST_SHAPE_INVALID');
  }

  const ids = new Set();
  const outputOwners = new Map();
  const outputs = new Set();
  const dependencies = new Set();
  const allPaths = [];
  const relations = [];

  for (const raw of value.relations) {
    const r = canonicalizeRelation(raw);
    if (ids.has(r.id)) fail('SOURCE_GENERATION_RELATION_DUPLICATE', r.id);
    ids.add(r.id);
    const gf = lowerAscii(r.generator);
    dependencies.add(gf); allPaths.push(r.generator);
    for (const p of r.inputs) { dependencies.add(lowerAscii(p)); allPaths.push(p); }
    for (const p of r.outputs) {
      const f = lowerAscii(p);
      if (outputOwners.has(f)) fail('SOURCE_GENERATION_OUTPUT_OWNER_CONFLICT', p);
      outputOwners.set(f, r.id); outputs.add(f); allPaths.push(p);
    }
    relations.push(r);
  }

  for (const f of outputs) if (dependencies.has(f)) fail('SOURCE_GENERATION_CHAIN_FORBIDDEN', f);
  validateGlobalPathPrefixes(allPaths);
  relations.sort((a, b) => Buffer.from(a.id).compare(Buffer.from(b.id)));
  return Object.freeze({ schema: SCHEMA, relations: Object.freeze(relations) });
}

function parseStrictManifest(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) fail('SOURCE_GENERATION_MANIFEST_JSON_INVALID');
  if (bytes.length > MAX_MANIFEST_BYTES) fail('SOURCE_GENERATION_MANIFEST_TOO_LARGE');
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) fail('SOURCE_GENERATION_MANIFEST_BOM_FORBIDDEN');
  const text = bytes.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(bytes)) fail('SOURCE_GENERATION_MANIFEST_UTF8_INVALID');
  rejectDuplicateObjectKeys(text);
  let value;
  try { value = JSON.parse(text); } catch { fail('SOURCE_GENERATION_MANIFEST_JSON_INVALID'); }
  return validateAuthority(value);
}

function digest(auth) {
  const h = crypto.createHash('sha256');
  h.update(Buffer.from('WEBCLIP_SOURCE_GENERATION_TOPOLOGY_V1\0'));
  const sb = Buffer.from(auth.schema); h.update(u32(sb.length)); h.update(sb); h.update(u32(auth.relations.length));
  for (const r of auth.relations) {
    for (const s of [r.id, r.runtime_profile, r.generator]) { const b = Buffer.from(s); h.update(u32(b.length)); h.update(b); }
    for (const list of [r.inputs, r.outputs]) {
      h.update(u32(list.length));
      for (const p of list) { const b = Buffer.from(p); h.update(u32(b.length)); h.update(b); }
    }
  }
  return h.digest('hex');
}

function manifest(value) { return Buffer.from(JSON.stringify(value), 'utf8'); }
function relation(id, output, input = `${id}.dat`, generator = `tools/${id}.py`) {
  return { id, runtime_profile: PROFILE, generator, inputs: [input], outputs: [output] };
}
function gitEntry(commit, rel) {
  const raw = execFileSync('git', ['ls-tree', commit, '--', rel], { cwd: ROOT, encoding: 'utf8' }).trim();
  if (!raw) return null;
  const tab = raw.indexOf('\t');
  const [mode, type, oid] = raw.slice(0, tab).split(/\s+/);
  return { mode, type, oid, path: raw.slice(tab + 1) };
}

(function main() {
  const bootstrap = {
    schema: SCHEMA,
    relations: [{
      id: 'public-suffix-js',
      runtime_profile: PROFILE,
      generator: 'project_tools/build_public_suffix_js.py',
      inputs: ['public_suffix_list.dat'],
      outputs: ['public-suffix.js'],
    }],
  };

  const auth = parseStrictManifest(manifest(bootstrap));
  eq(auth.relations.length, 1, 'bootstrap relation count');
  eq(auth.relations[0].id, 'public-suffix-js');
  deepEq(auth.relations[0].inputs, ['public_suffix_list.dat']);
  deepEq(auth.relations[0].outputs, ['public-suffix.js']);

  // Raw-byte parser boundary.
  throwsCode(() => parseStrictManifest(Buffer.alloc(0)), 'SOURCE_GENERATION_MANIFEST_JSON_INVALID');
  throwsCode(() => parseStrictManifest(Buffer.alloc(MAX_MANIFEST_BYTES + 1, 0x20)), 'SOURCE_GENERATION_MANIFEST_TOO_LARGE');
  throwsCode(() => parseStrictManifest(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), manifest(bootstrap)])), 'SOURCE_GENERATION_MANIFEST_BOM_FORBIDDEN');
  throwsCode(() => parseStrictManifest(Buffer.from([0xc3, 0x28])), 'SOURCE_GENERATION_MANIFEST_UTF8_INVALID');
  throwsCode(() => parseStrictManifest(Buffer.from('{')), 'SOURCE_GENERATION_MANIFEST_JSON_INVALID');
  throwsCode(() => parseStrictManifest(Buffer.from('{"schema":"webclip-source-generation/v1","schema":"x","relations":[]}')), 'SOURCE_GENERATION_MANIFEST_DUPLICATE_KEY');
  throwsCode(() => parseStrictManifest(Buffer.from('{"schema":"webclip-source-generation/v1","relations":[{"id":"x","id":"y","runtime_profile":"cpython-3.12.10-v1","generator":"g.py","inputs":["i"],"outputs":["popup.js"]}]}')), 'SOURCE_GENERATION_MANIFEST_DUPLICATE_KEY');
  throwsCode(() => parseStrictManifest(Buffer.from('{"schema":"webclip-source-generation/v1","relations":[],"x":{"a":1,"a":2}}')), 'SOURCE_GENERATION_MANIFEST_DUPLICATE_KEY');
  throwsCode(() => parseStrictManifest(Buffer.from('{"schema":"webclip-source-generation/v1","relations":NaN}')), 'SOURCE_GENERATION_MANIFEST_JSON_INVALID');

  // Closed schema / command-injection surface.
  throwsCode(() => validateAuthority({ ...bootstrap, command: 'python x.py' }), 'SOURCE_GENERATION_MANIFEST_UNKNOWN_FIELD');
  throwsCode(() => validateAuthority({ schema: SCHEMA, relations: [{ ...bootstrap.relations[0], command: 'python x.py' }] }), 'SOURCE_GENERATION_MANIFEST_UNKNOWN_FIELD');
  throwsCode(() => validateAuthority({ schema: SCHEMA, relations: [{ ...bootstrap.relations[0], args: ['--x'] }] }), 'SOURCE_GENERATION_MANIFEST_UNKNOWN_FIELD');
  throwsCode(() => validateAuthority({ schema: SCHEMA, relations: [{ ...bootstrap.relations[0], env: { TOKEN: 'x' } }] }), 'SOURCE_GENERATION_MANIFEST_UNKNOWN_FIELD');
  throwsCode(() => validateAuthority({ schema: 'v2', relations: bootstrap.relations }), 'SOURCE_GENERATION_SCHEMA_UNSUPPORTED');
  throwsCode(() => validateAuthority({ schema: SCHEMA, relations: [] }), 'SOURCE_GENERATION_MANIFEST_SHAPE_INVALID');
  throwsCode(() => validateAuthority({ schema: SCHEMA, relations: new Array(MAX_RELATIONS + 1).fill(bootstrap.relations[0]) }), 'SOURCE_GENERATION_MANIFEST_SHAPE_INVALID');
  throwsCode(() => validateAuthority({ schema: SCHEMA, relations: [{ ...bootstrap.relations[0], runtime_profile: 'python-any' }] }), 'SOURCE_GENERATION_RUNTIME_PROFILE_UNSUPPORTED');

  const tooManyInputs = Array.from({ length: MAX_PATHS + 1 }, (_, i) => `i${i}.dat`);
  throwsCode(() => validateAuthority({ schema: SCHEMA, relations: [{ ...bootstrap.relations[0], inputs: tooManyInputs }] }), 'SOURCE_GENERATION_RELATION_INVALID');
  throwsCode(() => validateAuthority({ schema: SCHEMA, relations: [{ ...bootstrap.relations[0], inputs: [] }] }), 'SOURCE_GENERATION_RELATION_INVALID');
  throwsCode(() => validateAuthority({ schema: SCHEMA, relations: [{ ...bootstrap.relations[0], outputs: [] }] }), 'SOURCE_GENERATION_RELATION_INVALID');

  // Path / collision matrix.
  for (const p of ['/x', 'x/', 'a//b', 'a\\b', '../x', 'a/../b', 'café', 'x.', 'a b', 'a\u0001b']) {
    throwsCode(() => validatePath(p), 'SOURCE_GENERATION_PATH_INVALID', p);
  }
  for (const p of ['CON', 'nul.txt', 'x/COM1.js', 'Lpt9.bin']) throwsCode(() => validatePath(p), 'SOURCE_GENERATION_PATH_RESERVED', p);
  throwsCode(() => validateAuthority({ schema: SCHEMA, relations: [{ ...bootstrap.relations[0], inputs: ['a.dat', 'A.dat'] }] }), 'SOURCE_GENERATION_RELATION_INVALID');
  throwsCode(() => validateAuthority({ schema: SCHEMA, relations: [{ ...bootstrap.relations[0], generator: 'public_suffix_list.dat' }] }), 'SOURCE_GENERATION_RELATION_INVALID');
  throwsCode(() => validateAuthority({ schema: SCHEMA, relations: [relation('a', 'popup.js', 'dir/file.dat', 'dir')] }), 'SOURCE_GENERATION_RELATION_INVALID');

  // Global ownership and flat-v1 composition.
  throwsCode(() => validateAuthority({ schema: SCHEMA, relations: [relation('a', 'popup.js'), relation('a', 'options.js')] }), 'SOURCE_GENERATION_RELATION_DUPLICATE');
  throwsCode(() => validateAuthority({ schema: SCHEMA, relations: [relation('a', 'popup.js'), relation('b', 'popup.js')] }), 'SOURCE_GENERATION_OUTPUT_OWNER_CONFLICT');
  throwsCode(() => validateAuthority({ schema: SCHEMA, relations: [relation('a', 'not-package.js')] }), 'SOURCE_GENERATION_OUTPUT_NOT_PACKAGE_MEMBER');
  throwsCode(() => validateAuthority({ schema: SCHEMA, relations: [relation('a', 'popup.js'), relation('b', 'options.js', 'popup.js')] }), 'SOURCE_GENERATION_CHAIN_FORBIDDEN');
  throwsCode(() => validateAuthority({ schema: SCHEMA, relations: [relation('a', 'popup.js'), relation('b', 'options.js', 'b.dat', 'popup.js')] }), 'SOURCE_GENERATION_CHAIN_FORBIDDEN');
  throwsCode(() => validateAuthority({ schema: SCHEMA, relations: [relation('a', 'popup.js'), relation('b', 'options.js', 'POPUP.js')] }), 'SOURCE_GENERATION_CHAIN_FORBIDDEN');
  throwsCode(() => validateAuthority({ schema: SCHEMA, relations: [{ ...relation('a', 'popup.js'), inputs: ['popup.js'] }] }), 'SOURCE_GENERATION_CHAIN_FORBIDDEN');

  // Explicit sharing of non-generated roots remains legal.
  const shared = validateAuthority({ schema: SCHEMA, relations: [
    relation('a', 'popup.js', 'shared.dat', 'tools/shared.py'),
    relation('b', 'options.js', 'shared.dat', 'tools/shared.py'),
  ] });
  eq(shared.relations.length, 2, 'shared root dependencies are allowed');

  // Representation invariance and semantic changes.
  const two = {
    schema: SCHEMA,
    relations: [
      { id: 'a', runtime_profile: PROFILE, generator: 'tools/a.py', inputs: ['z.dat', 'a.dat'], outputs: ['popup.js'] },
      { id: 'b', runtime_profile: PROFILE, generator: 'tools/b.py', inputs: ['b.dat'], outputs: ['options.js'] },
    ],
  };
  const d1 = digest(validateAuthority(two));
  const d2 = digest(validateAuthority({ relations: [
    { ...two.relations[1] },
    { ...two.relations[0], inputs: [...two.relations[0].inputs].reverse() },
  ], schema: SCHEMA }));
  eq(d1, d2, 'relation/list order must not change topology digest');
  check(digest(validateAuthority({ ...two, relations: [{ ...two.relations[0], generator: 'tools/a2.py' }, two.relations[1]] })) !== d1, 'generator change changes topology');
  check(digest(validateAuthority({ ...two, relations: [{ ...two.relations[0], inputs: ['a.dat'] }, two.relations[1]] })) !== d1, 'input change changes topology');
  check(digest(validateAuthority({ ...two, relations: [{ ...two.relations[0], outputs: ['journal.js'] }, two.relations[1]] })) !== d1, 'output change changes topology');

  // Exact candidate Git-object facts for current bootstrap.
  const head = git('rev-parse', 'HEAD');
  eq(git('cat-file', '-t', head), 'commit', 'HEAD must resolve to commit for research proof');
  for (const rel of ['project_tools/build_public_suffix_js.py', 'public_suffix_list.dat', 'public-suffix.js']) {
    const e = gitEntry(head, rel);
    check(Boolean(e), `missing ${rel}`);
    eq(e.type, 'blob', `${rel} type`);
    eq(e.mode, '100644', `${rel} mode`);
    check(/^[0-9a-f]{40}$/.test(e.oid), `${rel} oid`);
  }
  check(PACKAGE_FILES.has('public-suffix.js'), 'bootstrap output must be S0-A package member');
  check(!PACKAGE_FILES.has('public_suffix_list.dat'), 'source input is not package member');
  check(!PACKAGE_FILES.has('project_tools/build_public_suffix_js.py'), 'generator is not package member');

  // Refinement is additive to #188, whose empirical blocker remains present.
  const predecessor = fs.readFileSync(path.join(ROOT, 'project_tools', 'test_p1_231_s0b_source_generation_authority_source_spec_model.js'), 'utf8');
  check(predecessor.includes('current_psl_windows_portable=false'), '#188 portability-blocker marker must remain');
  check(!predecessor.includes('parseStrictManifest'), '#188 model intentionally did not prove raw parser boundary');
  const generator = fs.readFileSync(path.join(ROOT, 'project_tools', 'build_public_suffix_js.py'), 'utf8');
  check(!generator.includes("OUT.write_text(code, encoding='utf-8')"), 'text-mode PSL generator must remain retired');
  check(!generator.includes("newline='\\n'"), 'binary output must not depend on text newline policy');
  check(generator.includes("OUT.write_bytes(code.encode('utf-8'))"), 'PSL exact-byte portability fix must remain present');
  const recovery = fs.readFileSync(path.join(ROOT, 'project_tools', 'build_recovery_archive.py'), 'utf8');
  check(recovery.includes('offline/disaster-recovery'), 'recovery builder role drift');
  check(!auth.relations.some((r) => r.generator === 'project_tools/build_recovery_archive.py'), 'recovery builder must stay outside extension generation authority');

  const topo = digest(auth);
  check(/^[0-9a-f]{64}$/.test(topo), 'research topology digest shape');
  console.log(`P1-231 S0-B strict parser/composition refinement model: PASS; cases=${cases}; relations=${auth.relations.length}; chaining=v1-forbidden; strict_raw_parser=true; topology_sha256=${topo}; current_psl_windows_portable=false; head=${head}`);
})();
