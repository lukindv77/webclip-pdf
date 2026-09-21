'use strict';

// P1-231 S0-B passive source-generation authority.
// Exact Git blobs are authoritative. Verification is read-only and never mutates
// package/runtime bytes, readiness, receipts, tags, deployments, or releases.

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { TextDecoder } = require('node:util');
const packageAuthority = require('./release_package_authority.js');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'release_source_generation_v1.json');
const SCHEMA = 'webclip-source-generation/v1';
const RUNTIME_PROFILE = 'cpython-3.12.10-v1';
const EXPECTED_PYTHON = '3.12.10';
const MAX_MANIFEST_BYTES = 256 * 1024;
const MAX_RELATIONS = 256;
const MAX_PATHS = 256;
const MAX_FILE_BYTES = 256 * 1024 * 1024;
const MAX_TOTAL_BYTES = 512 * 1024 * 1024;
const TOP_KEYS = Object.freeze(['relations', 'schema']);
const RELATION_KEYS = Object.freeze(['generator', 'id', 'inputs', 'outputs', 'runtime_profile']);

function fail(code, detail) {
  const error = new Error(String(detail || code).slice(0, 240));
  error.code = code;
  throw error;
}

function asciiSort(values) {
  return [...values].sort((a, b) => Buffer.from(a, 'utf8').compare(Buffer.from(b, 'utf8')));
}

function forbiddenJsonConstantOutsideString(text) {
  let quoted = false;
  let escaped = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') quoted = false;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (/^(?:NaN|Infinity|-Infinity)(?![A-Za-z0-9_])/.test(text.slice(i))) return true;
  }
  return false;
}

function rejectDuplicateObjectKeys(text) {
  const stack = [];
  let i = 0;
  function skipWs() { while (i < text.length && /[\x20\x09\x0a\x0d]/.test(text[i])) i += 1; }
  function readString() {
    const start = i++;
    let escaped = false;
    while (i < text.length) {
      const ch = text[i++];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') return text.slice(start, i);
    }
    fail('SOURCE_GENERATION_MANIFEST_JSON_INVALID');
  }
  while (i < text.length) {
    skipWs();
    if (i >= text.length) break;
    const ch = text[i];
    if (ch === '"') {
      const raw = readString();
      skipWs();
      const frame = stack[stack.length - 1];
      if (frame && frame.type === 'object' && frame.expectingKey && text[i] === ':') {
        let key;
        try { key = JSON.parse(raw); } catch (_) { fail('SOURCE_GENERATION_MANIFEST_JSON_INVALID'); }
        if (frame.keys.has(key)) fail('SOURCE_GENERATION_MANIFEST_DUPLICATE_KEY', key);
        frame.keys.add(key);
        frame.expectingKey = false;
      }
      continue;
    }
    if (ch === '{') { stack.push({ type: 'object', keys: new Set(), expectingKey: true }); i += 1; continue; }
    if (ch === '[') { stack.push({ type: 'array' }); i += 1; continue; }
    if (ch === '}' || ch === ']') { stack.pop(); i += 1; continue; }
    if (ch === ',') {
      const frame = stack[stack.length - 1];
      if (frame && frame.type === 'object') frame.expectingKey = true;
      i += 1;
      continue;
    }
    i += 1;
  }
}

function validatePath(value) {
  try { return packageAuthority.validatePath(value); }
  catch (_) { fail('SOURCE_GENERATION_PATH_INVALID', value); }
}

function validatePathList(values, label) {
  if (!Array.isArray(values) || values.length === 0 || values.length > MAX_PATHS) {
    fail('SOURCE_GENERATION_RELATION_INVALID', label);
  }
  const exact = new Set();
  const folded = new Set();
  const out = [];
  for (const raw of values) {
    if (typeof raw !== 'string') fail('SOURCE_GENERATION_RELATION_INVALID', label);
    const rel = validatePath(raw);
    const lower = packageAuthority.lowerAscii(rel);
    if (exact.has(rel) || folded.has(lower)) fail('SOURCE_GENERATION_RELATION_INVALID', label);
    exact.add(rel);
    folded.add(lower);
    out.push(rel);
  }
  return Object.freeze(asciiSort(out));
}

function validateRelation(raw) {
  if (!raw || Array.isArray(raw) || typeof raw !== 'object') fail('SOURCE_GENERATION_RELATION_INVALID');
  const keys = Object.keys(raw).sort();
  if (keys.length !== RELATION_KEYS.length || keys.some((key, index) => key !== RELATION_KEYS[index])) {
    fail('SOURCE_GENERATION_MANIFEST_UNKNOWN_FIELD');
  }
  if (typeof raw.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(raw.id)) {
    fail('SOURCE_GENERATION_RELATION_INVALID', 'id');
  }
  if (raw.runtime_profile !== RUNTIME_PROFILE) fail('SOURCE_GENERATION_RUNTIME_PROFILE_UNSUPPORTED');
  const generator = validatePath(raw.generator);
  const inputs = validatePathList(raw.inputs, 'inputs');
  const outputs = validatePathList(raw.outputs, 'outputs');
  if (inputs.includes(generator) || outputs.includes(generator)) fail('SOURCE_GENERATION_RELATION_INVALID', 'generator-overlap');
  if (inputs.some((item) => outputs.includes(item))) fail('SOURCE_GENERATION_RELATION_INVALID', 'input-output-overlap');
  return Object.freeze({
    id: raw.id,
    runtime_profile: RUNTIME_PROFILE,
    generator: generator,
    inputs: inputs,
    outputs: outputs
  });
}

function parseManifestBytes(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) fail('SOURCE_GENERATION_MANIFEST_JSON_INVALID');
  if (bytes.length > MAX_MANIFEST_BYTES) fail('SOURCE_GENERATION_MANIFEST_TOO_LARGE');
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail('SOURCE_GENERATION_MANIFEST_BOM_FORBIDDEN');
  }
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes); }
  catch (_) { fail('SOURCE_GENERATION_MANIFEST_UTF8_INVALID'); }
  if (forbiddenJsonConstantOutsideString(text)) fail('SOURCE_GENERATION_MANIFEST_JSON_INVALID');
  rejectDuplicateObjectKeys(text);

  let value;
  try { value = JSON.parse(text); } catch (_) { fail('SOURCE_GENERATION_MANIFEST_JSON_INVALID'); }
  if (!value || Array.isArray(value) || typeof value !== 'object') fail('SOURCE_GENERATION_MANIFEST_SHAPE_INVALID');
  const keys = Object.keys(value).sort();
  if (keys.length !== TOP_KEYS.length || keys.some((key, index) => key !== TOP_KEYS[index])) {
    fail('SOURCE_GENERATION_MANIFEST_UNKNOWN_FIELD');
  }
  if (value.schema !== SCHEMA) fail('SOURCE_GENERATION_SCHEMA_UNSUPPORTED');
  if (!Array.isArray(value.relations) || value.relations.length === 0 || value.relations.length > MAX_RELATIONS) {
    fail('SOURCE_GENERATION_MANIFEST_SHAPE_INVALID');
  }

  const relations = value.relations.map(validateRelation).sort((a, b) => Buffer.from(a.id).compare(Buffer.from(b.id)));
  const ids = new Set();
  const outputOwners = new Map();
  for (const relation of relations) {
    if (ids.has(relation.id)) fail('SOURCE_GENERATION_RELATION_DUPLICATE', relation.id);
    ids.add(relation.id);
    for (const output of relation.outputs) {
      const folded = packageAuthority.lowerAscii(output);
      if (outputOwners.has(folded)) fail('SOURCE_GENERATION_OUTPUT_OWNER_CONFLICT', output);
      outputOwners.set(folded, relation.id);
    }
  }
  return Object.freeze({ schema: SCHEMA, relations: Object.freeze(relations) });
}

function readCanonicalManifest() {
  let bytes;
  try { bytes = fs.readFileSync(MANIFEST_PATH); }
  catch (_) { fail('SOURCE_GENERATION_MANIFEST_READ_FAILED'); }
  return parseManifestBytes(bytes);
}

function validateAuthority(value) {
  if (!value || value.schema !== SCHEMA || !Array.isArray(value.relations)) fail('SOURCE_GENERATION_AUTHORITY_INVALID');
  return parseManifestBytes(Buffer.from(JSON.stringify(value), 'utf8'));
}

function semanticTopology(value) {
  const authority = validateAuthority(value);
  const hash = crypto.createHash('sha256');
  hash.update(Buffer.from('WEBCLIP_SOURCE_GENERATION_TOPOLOGY_V1\0', 'utf8'));
  function pushString(text) {
    const bytes = Buffer.from(text, 'utf8');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(bytes.length);
    hash.update(len);
    hash.update(bytes);
  }
  pushString(authority.schema);
  const relationCount = Buffer.alloc(4);
  relationCount.writeUInt32BE(authority.relations.length);
  hash.update(relationCount);
  for (const relation of authority.relations) {
    pushString(relation.id);
    pushString(relation.runtime_profile);
    pushString(relation.generator);
    for (const list of [relation.inputs, relation.outputs]) {
      const count = Buffer.alloc(4);
      count.writeUInt32BE(list.length);
      hash.update(count);
      for (const item of list) pushString(item);
    }
  }
  return hash.digest('hex');
}

function git(repoRoot, args, options) {
  const opts = options || {};
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: opts.encoding === null ? null : (opts.encoding || 'utf8'),
      maxBuffer: opts.maxBuffer || 32 * 1024 * 1024
    });
  } catch (error) {
    const wrapped = new Error('git command failed');
    wrapped.code = 'SOURCE_GENERATION_GIT_READ_FAILED';
    wrapped.cause = error;
    throw wrapped;
  }
}

function readGitBlob(repoRoot, candidate, rel, aggregate) {
  let raw;
  try { raw = String(git(repoRoot, ['ls-tree', candidate, '--', rel])).trim(); }
  catch (_) { fail('SOURCE_GENERATION_GIT_READ_FAILED', rel); }
  if (!raw) fail('SOURCE_GENERATION_MEMBER_MISSING', rel);
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length !== 1) fail('SOURCE_GENERATION_MEMBER_TYPE_INVALID', rel);
  const tab = lines[0].indexOf('\t');
  if (tab <= 0) fail('SOURCE_GENERATION_GIT_READ_FAILED', rel);
  const left = lines[0].slice(0, tab).split(/\s+/);
  const mode = left[0];
  const type = left[1];
  const oid = left[2];
  if (lines[0].slice(tab + 1) !== rel) fail('SOURCE_GENERATION_GIT_READ_FAILED', rel);
  if (type !== 'blob') fail('SOURCE_GENERATION_MEMBER_TYPE_INVALID', rel);
  if (mode !== '100644') fail('SOURCE_GENERATION_MEMBER_MODE_INVALID', rel);
  if (!/^[0-9a-f]{40}$/.test(oid)) fail('SOURCE_GENERATION_GIT_READ_FAILED', rel);
  const size = Number(String(git(repoRoot, ['cat-file', '-s', oid])).trim());
  if (!Number.isSafeInteger(size) || size < 0) fail('SOURCE_GENERATION_GIT_READ_FAILED', rel);
  if (size > MAX_FILE_BYTES) fail('SOURCE_GENERATION_MEMBER_TOO_LARGE', rel);
  aggregate.value += size;
  if (aggregate.value > MAX_TOTAL_BYTES) fail('SOURCE_GENERATION_TOTAL_BYTES_EXCEEDED');
  const bytes = git(repoRoot, ['cat-file', 'blob', oid], {
    encoding: null,
    maxBuffer: Math.max(32 * 1024 * 1024, size + 1024)
  });
  if (!Buffer.isBuffer(bytes) || bytes.length !== size) fail('SOURCE_GENERATION_GIT_READ_FAILED', rel);
  return Object.freeze({
    path: rel,
    git_oid: oid,
    byte_length: size,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes
  });
}

function resolveGeneration(candidateSha, authorityValue, options) {
  const opts = options || {};
  const candidate = packageAuthority.normalizeCandidateSha(candidateSha);
  const authority = validateAuthority(authorityValue);
  const repoRoot = path.resolve(opts.repoRoot || ROOT);

  let type;
  try { type = String(git(repoRoot, ['cat-file', '-t', candidate])).trim(); }
  catch (_) { fail('SOURCE_GENERATION_CANDIDATE_NOT_COMMIT'); }
  if (type !== 'commit') fail('SOURCE_GENERATION_CANDIDATE_NOT_COMMIT');

  const packageTopology = opts.packageTopology || packageAuthority.readCanonicalManifest();
  const packageFiles = new Set(packageTopology.files.map((item) => packageAuthority.lowerAscii(item)));
  const aggregate = { value: 0 };
  const relations = [];

  for (const relation of authority.relations) {
    for (const output of relation.outputs) {
      if (!packageFiles.has(packageAuthority.lowerAscii(output))) {
        fail('SOURCE_GENERATION_OUTPUT_NOT_PACKAGE_MEMBER', output);
      }
    }
    const generator = readGitBlob(repoRoot, candidate, relation.generator, aggregate);
    const inputs = relation.inputs.map((item) => readGitBlob(repoRoot, candidate, item, aggregate));
    const outputs = relation.outputs.map((item) => readGitBlob(repoRoot, candidate, item, aggregate));
    relations.push(Object.freeze({
      id: relation.id,
      runtime_profile: relation.runtime_profile,
      generator: generator,
      inputs: Object.freeze(inputs),
      outputs: Object.freeze(outputs)
    }));
  }

  return Object.freeze({
    schema: authority.schema,
    candidate_sha: candidate,
    topology_sha256: semanticTopology(authority),
    relations: Object.freeze(relations),
    aggregate_bytes: aggregate.value
  });
}

function defaultExecutor(relation, options) {
  const opts = options || {};
  if (relation.runtime_profile !== RUNTIME_PROFILE) fail('SOURCE_GENERATION_RUNTIME_PROFILE_UNSUPPORTED');
  const python = String(opts.pythonExecutable || 'python');
  const timeout = Number(opts.timeoutMs || 30000);
  const maxOutput = Number(opts.maxOutputBytes || (1024 * 1024));
  if (!Number.isSafeInteger(timeout) || timeout <= 0 || timeout > 120000) fail('SOURCE_GENERATION_EXECUTION_OPTIONS_INVALID');
  if (!Number.isSafeInteger(maxOutput) || maxOutput <= 0 || maxOutput > 16 * 1024 * 1024) {
    fail('SOURCE_GENERATION_EXECUTION_OPTIONS_INVALID');
  }

  const probe = spawnSync(
    python,
    ['-c', 'import platform; print(platform.python_implementation()+"|"+platform.python_version())'],
    { encoding: 'utf8', timeout: timeout, maxBuffer: maxOutput }
  );
  if (probe.error || probe.status !== 0 || String(probe.stdout || '').trim() !== 'CPython|' + EXPECTED_PYTHON) {
    fail('SOURCE_GENERATION_RUNTIME_PROFILE_MISMATCH');
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'webclip-s0b-'));
  try {
    const initial = new Map();
    for (const item of [relation.generator, ...relation.inputs]) {
      const target = path.join(dir, item.path);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, item.bytes);
      initial.set(item.path, item.bytes);
    }

    const env = {};
    for (const key of ['PATH', 'Path', 'SYSTEMROOT', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'PATHEXT']) {
      if (process.env[key] != null) env[key] = process.env[key];
    }
    env.PYTHONHASHSEED = '0';
    env.PYTHONIOENCODING = 'utf-8';
    env.PYTHONDONTWRITEBYTECODE = '1';
    env.TZ = 'UTC';

    const proc = spawnSync(python, [relation.generator.path], {
      cwd: dir,
      encoding: null,
      env: env,
      timeout: timeout,
      maxBuffer: maxOutput
    });
    if (proc.error && proc.error.code === 'ETIMEDOUT') fail('SOURCE_GENERATION_TIMEOUT');
    if (proc.error || proc.status !== 0) fail('SOURCE_GENERATION_EXECUTION_FAILED');

    for (const pair of initial) {
      const rel = pair[0];
      const expected = pair[1];
      const target = path.join(dir, rel);
      if (!fs.existsSync(target) || !fs.readFileSync(target).equals(expected)) {
        fail('SOURCE_GENERATION_INPUT_MUTATED', rel);
      }
    }

    const generated = new Map();
    for (const output of relation.outputs) {
      const target = path.join(dir, output.path);
      if (!fs.existsSync(target) || !fs.statSync(target).isFile()) fail('SOURCE_GENERATION_OUTPUT_MISSING', output.path);
      generated.set(output.path, fs.readFileSync(target));
    }

    const allowed = new Set([relation.generator.path, ...relation.inputs.map((x) => x.path), ...relation.outputs.map((x) => x.path)]);
    function walk(current, prefix) {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const rel = prefix ? prefix + '/' + entry.name : entry.name;
        const target = path.join(current, entry.name);
        if (entry.isDirectory()) { walk(target, rel); continue; }
        if (!entry.isFile() || !allowed.has(rel)) fail('SOURCE_GENERATION_OUTPUT_EXTRA', rel);
      }
    }
    walk(dir, '');

    return Object.freeze({
      generated: generated,
      stdout_sha256: crypto.createHash('sha256').update(proc.stdout || Buffer.alloc(0)).digest('hex'),
      stderr_sha256: crypto.createHash('sha256').update(proc.stderr || Buffer.alloc(0)).digest('hex')
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function verifySourceGeneration(candidateSha, authorityValue, options) {
  const opts = options || {};
  const resolved = resolveGeneration(candidateSha, authorityValue, opts);
  const executor = opts.executor || function (relation) { return defaultExecutor(relation, opts); };
  const verified = [];

  for (const relation of resolved.relations) {
    const execution = executor(relation);
    if (!execution || !(execution.generated instanceof Map)) fail('SOURCE_GENERATION_EXECUTION_FAILED');
    const outputs = [];
    for (const committed of relation.outputs) {
      if (!execution.generated.has(committed.path)) fail('SOURCE_GENERATION_OUTPUT_MISSING', committed.path);
      const generated = execution.generated.get(committed.path);
      if (!Buffer.isBuffer(generated)) fail('SOURCE_GENERATION_EXECUTION_FAILED');
      if (!generated.equals(committed.bytes)) fail('STALE_GENERATED_OUTPUT', committed.path);
      outputs.push(Object.freeze({
        path: committed.path,
        committed_git_oid: committed.git_oid,
        committed_sha256: committed.sha256,
        generated_sha256: crypto.createHash('sha256').update(generated).digest('hex'),
        byte_length: generated.length,
        exact_match: true
      }));
    }
    if (execution.generated.size !== relation.outputs.length) fail('SOURCE_GENERATION_OUTPUT_EXTRA');
    verified.push(Object.freeze({
      id: relation.id,
      runtime_profile: relation.runtime_profile,
      generator: Object.freeze({
        path: relation.generator.path,
        git_oid: relation.generator.git_oid,
        sha256: relation.generator.sha256
      }),
      inputs: Object.freeze(relation.inputs.map((item) => Object.freeze({
        path: item.path,
        git_oid: item.git_oid,
        sha256: item.sha256,
        byte_length: item.byte_length
      }))),
      outputs: Object.freeze(outputs),
      stdout_sha256: String(execution.stdout_sha256 || ''),
      stderr_sha256: String(execution.stderr_sha256 || '')
    }));
  }

  return Object.freeze({
    schema: 'webclip-source-generation-verification/v1',
    candidate_sha: resolved.candidate_sha,
    authority_schema: resolved.schema,
    topology_sha256: resolved.topology_sha256,
    relations: Object.freeze(verified),
    all_relations_pass: true,
    policy_mutation: false,
    artifact_build: false,
    release_authorized: false
  });
}

function parseArgs(argv) {
  const out = { candidate: '', help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help') { out.help = true; continue; }
    if (arg === '--candidate') {
      if (out.candidate) fail('SOURCE_GENERATION_ARGUMENT_INVALID');
      out.candidate = String(argv[++i] || '');
      continue;
    }
    fail('SOURCE_GENERATION_ARGUMENT_INVALID', arg);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write('node project_tools/release_source_generation_authority.js --candidate <exact-40-hex-commit>\n');
    return;
  }
  if (!args.candidate) fail('SOURCE_GENERATION_CANDIDATE_SHA_REQUIRED');
  const result = verifySourceGeneration(args.candidate, readCanonicalManifest());
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    process.stderr.write(String(error && error.code || 'SOURCE_GENERATION_AUTHORITY_FAILED') + ': ' + String(error && error.message || 'failed').slice(0, 240) + '\n');
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({
  ROOT,
  MANIFEST_PATH,
  SCHEMA,
  RUNTIME_PROFILE,
  EXPECTED_PYTHON,
  MAX_MANIFEST_BYTES,
  MAX_RELATIONS,
  MAX_PATHS,
  parseManifestBytes,
  readCanonicalManifest,
  validateAuthority,
  semanticTopology,
  resolveGeneration,
  defaultExecutor,
  verifySourceGeneration,
  parseArgs
});
