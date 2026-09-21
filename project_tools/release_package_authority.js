'use strict';

// P1-231 S0-A passive package authority.
// Defines and validates package topology plus exact candidate Git blobs.
// It does not build ZIPs, mutate release readiness, run browser/provider QA,
// tag/deploy, or make any release decision.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { TextDecoder } = require('node:util');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'release_package_manifest_v1.json');

const SCHEMA = 'webclip-extension-package/v1';
const PATH_PROFILE = 'portable-ascii-v1';
const MAX_MANIFEST_BYTES = 256 * 1024;
const MAX_FILES = 4096;
const MAX_PATH_BYTES = 1024;
const MAX_BLOB_BYTES = 256 * 1024 * 1024;
const MAX_TOTAL_BYTES = 512 * 1024 * 1024;
const REQUIRED_KEYS = Object.freeze(['files', 'path_profile', 'schema']);

const RESERVED_BASENAMES = new Set([
  'con', 'prn', 'aux', 'nul',
  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'
]);

function fail(code, detail = code) {
  const error = new Error(String(detail || code).slice(0, 240));
  error.code = code;
  throw error;
}

function lowerAscii(value) {
  return String(value).replace(/[A-Z]/g, (ch) => ch.toLowerCase());
}

function asciiSort(values) {
  return [...values].sort((a, b) => Buffer.from(a, 'utf8').compare(Buffer.from(b, 'utf8')));
}

function u32(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) fail('PACKAGE_U32_RANGE');
  const out = Buffer.alloc(4);
  out.writeUInt32BE(value);
  return out;
}

function forbiddenJsonConstantOutsideString(text) {
  let quote = false;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const ch = text[index];
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') quote = false;
      continue;
    }
    if (ch === '"') { quote = true; continue; }
    const rest = text.slice(index);
    const match = /^(?:NaN|Infinity|-Infinity)(?![A-Za-z0-9_])/.exec(rest);
    if (match) return true;
  }
  return false;
}

function rejectDuplicateObjectKeys(text) {
  const stack = [];
  let index = 0;

  const skipWhitespace = () => {
    while (index < text.length && /[\x20\x09\x0a\x0d]/.test(text[index])) index += 1;
  };

  const readString = () => {
    const start = index;
    index += 1;
    let escaped = false;
    while (index < text.length) {
      const ch = text[index++];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') return text.slice(start, index);
    }
    fail('PACKAGE_MANIFEST_JSON_INVALID', 'unterminated JSON string');
  };

  while (index < text.length) {
    skipWhitespace();
    if (index >= text.length) break;
    const ch = text[index];

    if (ch === '"') {
      const raw = readString();
      skipWhitespace();
      const frame = stack[stack.length - 1];
      if (frame?.type === 'object' && frame.expectingKey && text[index] === ':') {
        let key;
        try { key = JSON.parse(raw); } catch (_) { fail('PACKAGE_MANIFEST_JSON_INVALID'); }
        if (frame.keys.has(key)) fail('PACKAGE_MANIFEST_DUPLICATE_KEY', key);
        frame.keys.add(key);
        frame.expectingKey = false;
      }
      continue;
    }

    if (ch === '{') {
      stack.push({ type: 'object', keys: new Set(), expectingKey: true });
      index += 1;
      continue;
    }
    if (ch === '[') {
      stack.push({ type: 'array' });
      index += 1;
      continue;
    }
    if (ch === '}' || ch === ']') {
      stack.pop();
      index += 1;
      continue;
    }
    if (ch === ',') {
      const frame = stack[stack.length - 1];
      if (frame?.type === 'object') frame.expectingKey = true;
      index += 1;
      continue;
    }
    index += 1;
  }
}

function validatePath(value) {
  if (typeof value !== 'string' || !value) fail('PACKAGE_PATH_INVALID');
  if (Buffer.byteLength(value, 'utf8') > MAX_PATH_BYTES) fail('PACKAGE_PATH_TOO_LONG');
  if (!/^[\x00-\x7f]+$/.test(value)) fail('PACKAGE_PATH_INVALID');
  if (
    value.startsWith('/')
    || value.endsWith('/')
    || value.includes('//')
    || value.includes('\\')
    || /[\x00-\x1f\x7f]/.test(value)
  ) {
    fail('PACKAGE_PATH_INVALID');
  }

  const segments = value.split('/');
  if (!segments.length) fail('PACKAGE_PATH_INVALID');
  for (const segment of segments) {
    if (
      !segment
      || !/^[A-Za-z0-9._-]+$/.test(segment)
      || segment === '.'
      || segment === '..'
      || segment.endsWith('.')
    ) {
      fail('PACKAGE_PATH_INVALID');
    }
    const basename = lowerAscii(segment.split('.')[0]);
    if (RESERVED_BASENAMES.has(basename)) fail('PACKAGE_PATH_RESERVED_NAME');
  }
  return value;
}

function validateFiles(files) {
  if (!Array.isArray(files) || files.length === 0) fail('PACKAGE_MANIFEST_FILES_INVALID');
  if (files.length > MAX_FILES) fail('PACKAGE_MANIFEST_FILE_COUNT_EXCEEDED');

  const exact = new Set();
  const folded = new Map();
  for (const raw of files) {
    if (typeof raw !== 'string') fail('PACKAGE_MANIFEST_FILES_INVALID');
    const rel = validatePath(raw);
    if (exact.has(rel)) fail('PACKAGE_PATH_DUPLICATE');
    exact.add(rel);

    const foldedPath = lowerAscii(rel);
    if (folded.has(foldedPath)) fail('PACKAGE_PATH_CASE_COLLISION');
    folded.set(foldedPath, rel);
  }

  for (const rel of exact) {
    const parts = rel.split('/');
    for (let count = 1; count < parts.length; count += 1) {
      const prefix = lowerAscii(parts.slice(0, count).join('/'));
      if (folded.has(prefix)) fail('PACKAGE_PATH_PREFIX_COLLISION');
    }
  }

  if (![...exact].includes('manifest.json')) fail('PACKAGE_MANIFEST_REQUIRED_MEMBER_MISSING');
  return Object.freeze(asciiSort(exact));
}

function parseManifestBytes(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) fail('PACKAGE_MANIFEST_JSON_INVALID');
  if (bytes.length > MAX_MANIFEST_BYTES) fail('PACKAGE_MANIFEST_TOO_LARGE');
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail('PACKAGE_MANIFEST_BOM_FORBIDDEN');
  }

  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes);
  } catch (_) {
    fail('PACKAGE_MANIFEST_UTF8_INVALID');
  }

  if (forbiddenJsonConstantOutsideString(text)) fail('PACKAGE_MANIFEST_CONSTANT_INVALID');
  rejectDuplicateObjectKeys(text);

  let value;
  try { value = JSON.parse(text); } catch (_) { fail('PACKAGE_MANIFEST_JSON_INVALID'); }
  if (!value || Array.isArray(value) || typeof value !== 'object') fail('PACKAGE_MANIFEST_SHAPE_INVALID');

  const keys = Object.keys(value).sort();
  for (const key of keys) {
    if (!REQUIRED_KEYS.includes(key)) fail('PACKAGE_MANIFEST_UNKNOWN_FIELD', key);
  }
  for (const key of REQUIRED_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) fail('PACKAGE_MANIFEST_REQUIRED_FIELD_MISSING', key);
  }

  if (typeof value.schema !== 'string' || typeof value.path_profile !== 'string') {
    fail('PACKAGE_MANIFEST_SHAPE_INVALID');
  }
  if (value.schema !== SCHEMA) fail('PACKAGE_MANIFEST_SCHEMA_UNSUPPORTED');
  if (value.path_profile !== PATH_PROFILE) fail('PACKAGE_MANIFEST_PATH_PROFILE_UNSUPPORTED');

  return Object.freeze({
    schema: SCHEMA,
    path_profile: PATH_PROFILE,
    files: validateFiles(value.files)
  });
}

function topologyDigest(topologyValue) {
  const topology = validateTopology(topologyValue);
  const hash = crypto.createHash('sha256');
  hash.update(Buffer.from('WEBCLIP_PACKAGE_TOPOLOGY_V1\0', 'utf8'));
  for (const text of [topology.schema, topology.path_profile]) {
    const bytes = Buffer.from(text, 'utf8');
    hash.update(u32(bytes.length));
    hash.update(bytes);
  }
  hash.update(u32(topology.files.length));
  for (const rel of topology.files) {
    const bytes = Buffer.from(rel, 'utf8');
    hash.update(u32(bytes.length));
    hash.update(bytes);
  }
  return hash.digest('hex');
}

function validateTopology(value) {
  if (!value || Array.isArray(value) || typeof value !== 'object') fail('PACKAGE_TOPOLOGY_INVALID');
  if (value.schema !== SCHEMA || value.path_profile !== PATH_PROFILE) fail('PACKAGE_TOPOLOGY_INVALID');
  return Object.freeze({
    schema: SCHEMA,
    path_profile: PATH_PROFILE,
    files: validateFiles(value.files)
  });
}

function readCanonicalManifest() {
  let bytes;
  try { bytes = fs.readFileSync(MANIFEST_PATH); } catch (_) { fail('PACKAGE_MANIFEST_READ_FAILED'); }
  return parseManifestBytes(bytes);
}

function git(repoRoot, args, options = {}) {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: options.encoding === null ? null : (options.encoding || 'utf8'),
      maxBuffer: options.maxBuffer || 16 * 1024 * 1024
    });
  } catch (error) {
    const wrapped = new Error('git command failed');
    wrapped.code = 'PACKAGE_GIT_READ_FAILED';
    wrapped.cause = error;
    throw wrapped;
  }
}

function normalizeCandidateSha(value) {
  const text = String(value || '').trim();
  if (!/^[0-9a-fA-F]{40}$/.test(text)) fail('PACKAGE_CANDIDATE_SHA_INVALID');
  return text.toLowerCase();
}

function normalizedLimits(options = {}) {
  const lowerBound = (value, canonical, code) => {
    if (value == null) return canonical;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed > canonical) fail(code);
    return parsed;
  };
  return Object.freeze({
    maxBlobBytes: lowerBound(options.maxBlobBytes, MAX_BLOB_BYTES, 'PACKAGE_LIMIT_BLOB_INVALID'),
    maxTotalBytes: lowerBound(options.maxTotalBytes, MAX_TOTAL_BYTES, 'PACKAGE_LIMIT_TOTAL_INVALID')
  });
}

function resolvePackage(candidateSha, topologyValue, options = {}) {
  const candidate = normalizeCandidateSha(candidateSha);
  const topology = validateTopology(topologyValue);
  const repoRoot = path.resolve(options.repoRoot || ROOT);
  const limits = normalizedLimits(options);

  let type;
  try {
    type = String(git(repoRoot, ['cat-file', '-t', candidate])).trim();
  } catch (_) {
    fail('PACKAGE_CANDIDATE_NOT_COMMIT');
  }
  if (type !== 'commit') fail('PACKAGE_CANDIDATE_NOT_COMMIT');

  const entries = [];
  let aggregateBytes = 0;

  for (const rel of topology.files) {
    let raw;
    try {
      raw = String(git(repoRoot, ['ls-tree', candidate, '--', rel])).trim();
    } catch (_) {
      fail('PACKAGE_GIT_READ_FAILED', rel);
    }
    if (!raw) fail('PACKAGE_MEMBER_MISSING', rel);

    const lines = raw.split(/\r?\n/).filter(Boolean);
    if (lines.length !== 1) fail('PACKAGE_MEMBER_TYPE_INVALID', rel);
    const tab = lines[0].indexOf('\t');
    if (tab <= 0) fail('PACKAGE_GIT_READ_FAILED', rel);
    const [mode, objectType, oid] = lines[0].slice(0, tab).split(/\s+/);
    const returnedPath = lines[0].slice(tab + 1);
    if (returnedPath !== rel) fail('PACKAGE_GIT_READ_FAILED', rel);
    if (objectType !== 'blob') fail('PACKAGE_MEMBER_TYPE_INVALID', rel);
    if (mode !== '100644') fail('PACKAGE_MEMBER_MODE_INVALID', rel);
    if (!/^[0-9a-f]{40}$/.test(oid)) fail('PACKAGE_GIT_READ_FAILED', rel);

    let size;
    try {
      size = Number(String(git(repoRoot, ['cat-file', '-s', oid])).trim());
    } catch (_) {
      fail('PACKAGE_GIT_READ_FAILED', rel);
    }
    if (!Number.isSafeInteger(size) || size < 0) fail('PACKAGE_GIT_READ_FAILED', rel);
    if (size > limits.maxBlobBytes) fail('PACKAGE_MEMBER_TOO_LARGE', rel);
    aggregateBytes += size;
    if (aggregateBytes >= limits.maxTotalBytes) fail('PACKAGE_TOTAL_BYTES_EXCEEDED');

    let bytes;
    try {
      bytes = git(repoRoot, ['cat-file', 'blob', oid], {
        encoding: null,
        maxBuffer: Math.max(16 * 1024 * 1024, size + 1024)
      });
    } catch (_) {
      fail('PACKAGE_GIT_READ_FAILED', rel);
    }
    if (!Buffer.isBuffer(bytes) || bytes.length !== size) fail('PACKAGE_GIT_READ_FAILED', rel);

    entries.push(Object.freeze({
      path: rel,
      git_oid: oid,
      byte_length: size,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex')
    }));
  }

  return Object.freeze({
    candidate_sha: candidate,
    schema: topology.schema,
    path_profile: topology.path_profile,
    canonical_files: topology.files,
    topology_digest: topologyDigest(topology),
    members: Object.freeze(entries),
    aggregate_bytes: aggregateBytes
  });
}

function parseArgs(argv) {
  const out = { candidate: '', help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') { out.help = true; continue; }
    if (arg === '--candidate') {
      if (out.candidate) fail('PACKAGE_ARGUMENT_CONFLICT');
      out.candidate = String(argv[++index] || '');
      continue;
    }
    fail('PACKAGE_ARGUMENT_INVALID', arg);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      'node project_tools/release_package_authority.js --candidate <exact-40-hex-commit>\n'
    );
    return;
  }
  if (!args.candidate) fail('PACKAGE_CANDIDATE_SHA_REQUIRED');
  const topology = readCanonicalManifest();
  const result = resolvePackage(args.candidate, topology);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    process.stderr.write(`${String(error?.code || 'PACKAGE_AUTHORITY_FAILED')}: ${String(error?.message || 'failed').slice(0, 240)}\n`);
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({
  ROOT,
  MANIFEST_PATH,
  SCHEMA,
  PATH_PROFILE,
  MAX_MANIFEST_BYTES,
  MAX_FILES,
  MAX_PATH_BYTES,
  MAX_BLOB_BYTES,
  MAX_TOTAL_BYTES,
  lowerAscii,
  asciiSort,
  forbiddenJsonConstantOutsideString,
  rejectDuplicateObjectKeys,
  validatePath,
  validateFiles,
  parseManifestBytes,
  validateTopology,
  topologyDigest,
  readCanonicalManifest,
  normalizeCandidateSha,
  normalizedLimits,
  resolvePackage,
  parseArgs
});
