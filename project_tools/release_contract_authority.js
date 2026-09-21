'use strict';

// P1-231 S0-C passive release-contract projection authority.
// Owns the semantic inputs for per-kind QCF and full RCF. It reads exact Git blobs
// for candidate-bound full-RCF computation and never interprets QA receipts/outcomes.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { TextDecoder } = require('node:util');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'release_contract_inputs_v1.json');
const SCHEMA = 'webclip-release-contract-inputs/v1';
const FP_PROFILE = 'webclip-contract-fingerprint-v1';
const QCF_PREFIX = 'WEBCLIP_QCF_V1';
const RCF_PREFIX = 'WEBCLIP_RCF_V1';
const MAX_MANIFEST_BYTES = 512 * 1024;
const MAX_FULL_INPUTS = 128;
const MAX_CASES = 128;
const MAX_TOKENS = 128;
const MAX_TOKEN_BYTES = 256;
const MAX_PATH_BYTES = 1024;
const MAX_FILE_BYTES = 16 * 1024 * 1024;
const MAX_TOTAL_BYTES = 64 * 1024 * 1024;
const TOP_KEYS = Object.freeze(['fingerprint_profile', 'full_rcf', 'projections', 'schema']);
const FULL_KEYS = Object.freeze(['blob_inputs']);
const PROJECTION_KEYS = Object.freeze(['cases', 'environment_policy', 'schema', 'subject']);
const CASE_KEYS = Object.freeze(['assertions', 'id']);
const PROJECTION_NAMES = Object.freeze(['unpacked-chrome', 'yandex-e2e']);
const PROJECTION_CONTRACT = Object.freeze({
  'unpacked-chrome': Object.freeze({
    schema: 'webclip-qa-contract/unpacked-chrome/v1',
    subject: 'staged-unpacked',
    prefix: 'chrome.'
  }),
  'yandex-e2e': Object.freeze({
    schema: 'webclip-qa-contract/yandex-e2e/v1',
    subject: 'live-yandex-provider',
    prefix: 'yandex.'
  })
});
const FORBIDDEN_FULL_FILES = new Set([
  'project_docs/RELEASE_READINESS.md',
  'project_docs/TEST_STATUS.md',
  'project_docs/TEST_EVIDENCE.md'
]);
const FORBIDDEN_FULL_PREFIXES = Object.freeze([
  'project_docs/release_evidence/receipts/',
  'project_docs/release_evidence/summaries/'
]);
const RESERVED = new Set([
  'con', 'prn', 'aux', 'nul',
  ...Array.from({ length: 9 }, (_, i) => 'com' + (i + 1)),
  ...Array.from({ length: 9 }, (_, i) => 'lpt' + (i + 1))
]);

function fail(code, detail) {
  const error = new Error(String(detail || code).slice(0, 240));
  error.code = code;
  throw error;
}
function lowerAscii(value) {
  return value.replace(/[A-Z]/g, (char) => char.toLowerCase());
}
function asciiSort(values) {
  return [...values].sort((a, b) => Buffer.from(a, 'utf8').compare(Buffer.from(b, 'utf8')));
}
function sameKeys(raw, expected) {
  const keys = Object.keys(raw).sort();
  return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
}
function u32(value) {
  const out = Buffer.alloc(4);
  out.writeUInt32BE(value);
  return out;
}
function u64(value) {
  const out = Buffer.alloc(8);
  out.writeBigUInt64BE(BigInt(value));
  return out;
}
function pushString(hash, value) {
  const bytes = Buffer.from(value, 'utf8');
  hash.update(u32(bytes.length));
  hash.update(bytes);
}
function pushList(hash, values) {
  hash.update(u32(values.length));
  for (const value of values) pushString(hash, value);
}

function forbiddenJsonConstantOutsideString(text) {
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (/^(?:NaN|Infinity|-Infinity)(?![A-Za-z0-9_])/.test(text.slice(index))) return true;
  }
  return false;
}

function rejectDuplicateObjectKeys(text) {
  const stack = [];
  let index = 0;
  function skipWs() {
    while (index < text.length && /[\x20\x09\x0a\x0d]/.test(text[index])) index += 1;
  }
  function readString() {
    const start = index++;
    let escaped = false;
    while (index < text.length) {
      const char = text[index++];
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === '"') return text.slice(start, index);
    }
    fail('RELEASE_CONTRACT_MANIFEST_JSON_INVALID');
  }
  while (index < text.length) {
    skipWs();
    if (index >= text.length) break;
    const char = text[index];
    if (char === '"') {
      const raw = readString();
      skipWs();
      const frame = stack[stack.length - 1];
      if (frame && frame.type === 'object' && frame.expectingKey && text[index] === ':') {
        let key;
        try { key = JSON.parse(raw); } catch (_) { fail('RELEASE_CONTRACT_MANIFEST_JSON_INVALID'); }
        if (frame.keys.has(key)) fail('RELEASE_CONTRACT_MANIFEST_DUPLICATE_KEY', key);
        frame.keys.add(key);
        frame.expectingKey = false;
      }
      continue;
    }
    if (char === '{') { stack.push({ type: 'object', keys: new Set(), expectingKey: true }); index += 1; continue; }
    if (char === '[') { stack.push({ type: 'array' }); index += 1; continue; }
    if (char === '}' || char === ']') { stack.pop(); index += 1; continue; }
    if (char === ',') {
      const frame = stack[stack.length - 1];
      if (frame && frame.type === 'object') frame.expectingKey = true;
      index += 1;
      continue;
    }
    index += 1;
  }
}

function validatePath(value) {
  if (typeof value !== 'string' || !value || Buffer.byteLength(value, 'utf8') > MAX_PATH_BYTES) {
    fail('RELEASE_CONTRACT_INPUT_INVALID', value);
  }
  if (!/^[\x00-\x7f]+$/.test(value) || value.startsWith('/') || value.endsWith('/') || value.includes('//') || value.includes('\\')) {
    fail('RELEASE_CONTRACT_INPUT_INVALID', value);
  }
  if (/[\x00-\x1f\x7f]/.test(value)) fail('RELEASE_CONTRACT_INPUT_INVALID', value);
  for (const segment of value.split('/')) {
    if (!segment || !/^[A-Za-z0-9._-]+$/.test(segment) || segment === '.' || segment === '..' || segment.endsWith('.')) {
      fail('RELEASE_CONTRACT_INPUT_INVALID', value);
    }
    if (RESERVED.has(lowerAscii(segment.split('.')[0]))) fail('RELEASE_CONTRACT_INPUT_INVALID', value);
  }
  if (FORBIDDEN_FULL_FILES.has(value) || FORBIDDEN_FULL_PREFIXES.some((prefix) => value.startsWith(prefix))) {
    fail('RELEASE_CONTRACT_MUTABLE_EVIDENCE_INPUT_FORBIDDEN', value);
  }
  return value;
}

function validateToken(value, prefix) {
  if (typeof value !== 'string' || !value || Buffer.byteLength(value, 'utf8') > MAX_TOKEN_BYTES) {
    fail('RELEASE_CONTRACT_CASE_INVALID');
  }
  if (!/^[a-z0-9][a-z0-9.-]*$/.test(value)) fail('RELEASE_CONTRACT_CASE_INVALID', value);
  if (prefix && !value.startsWith(prefix)) fail('RELEASE_CONTRACT_CASE_INVALID', value);
  return value;
}

function canonicalUniqueStrings(value, options) {
  const opts = options || {};
  const max = opts.max || MAX_TOKENS;
  if (!Array.isArray(value) || value.length === 0 || value.length > max) {
    fail(opts.pathMode ? 'RELEASE_CONTRACT_INPUT_INVALID' : 'RELEASE_CONTRACT_CASE_INVALID');
  }
  const exact = new Set();
  const folded = new Set();
  const out = [];
  for (const raw of value) {
    const item = opts.pathMode ? validatePath(raw) : validateToken(raw, opts.prefix || null);
    const lower = lowerAscii(item);
    if (exact.has(item) || folded.has(lower)) {
      fail(opts.pathMode ? 'RELEASE_CONTRACT_INPUT_INVALID' : 'RELEASE_CONTRACT_CASE_INVALID', item);
    }
    exact.add(item);
    folded.add(lower);
    out.push(item);
  }
  return Object.freeze(asciiSort(out));
}

function canonicalizeCase(raw, prefix) {
  if (!raw || Array.isArray(raw) || typeof raw !== 'object' || !sameKeys(raw, CASE_KEYS)) {
    fail('RELEASE_CONTRACT_CASE_INVALID');
  }
  return Object.freeze({
    id: validateToken(raw.id, prefix),
    assertions: canonicalUniqueStrings(raw.assertions)
  });
}

function canonicalizeProjection(kind, raw) {
  if (!raw || Array.isArray(raw) || typeof raw !== 'object' || !sameKeys(raw, PROJECTION_KEYS)) {
    fail('RELEASE_CONTRACT_PROJECTION_INVALID', kind);
  }
  const expected = PROJECTION_CONTRACT[kind];
  if (!expected) fail('RELEASE_CONTRACT_PROJECTION_SET_INVALID', kind);
  if (raw.schema !== expected.schema || raw.subject !== expected.subject) {
    fail('RELEASE_CONTRACT_PROJECTION_INVALID', kind);
  }
  if (!Array.isArray(raw.cases) || raw.cases.length === 0 || raw.cases.length > MAX_CASES) {
    fail('RELEASE_CONTRACT_PROJECTION_INVALID', kind);
  }
  const ids = new Set();
  const cases = raw.cases.map((item) => canonicalizeCase(item, expected.prefix));
  for (const item of cases) {
    const lower = lowerAscii(item.id);
    if (ids.has(lower)) fail('RELEASE_CONTRACT_CASE_INVALID', item.id);
    ids.add(lower);
  }
  cases.sort((a, b) => Buffer.from(a.id).compare(Buffer.from(b.id)));
  return Object.freeze({
    schema: raw.schema,
    subject: raw.subject,
    environment_policy: canonicalUniqueStrings(raw.environment_policy),
    cases: Object.freeze(cases)
  });
}

function validateAuthority(raw) {
  if (!raw || Array.isArray(raw) || typeof raw !== 'object' || !sameKeys(raw, TOP_KEYS)) {
    fail('RELEASE_CONTRACT_MANIFEST_SHAPE_INVALID');
  }
  if (raw.schema !== SCHEMA) fail('RELEASE_CONTRACT_SCHEMA_UNSUPPORTED');
  if (raw.fingerprint_profile !== FP_PROFILE) fail('RELEASE_CONTRACT_FINGERPRINT_PROFILE_UNSUPPORTED');
  if (!raw.full_rcf || Array.isArray(raw.full_rcf) || typeof raw.full_rcf !== 'object' || !sameKeys(raw.full_rcf, FULL_KEYS)) {
    fail('RELEASE_CONTRACT_MANIFEST_SHAPE_INVALID');
  }
  const blobInputs = canonicalUniqueStrings(raw.full_rcf.blob_inputs, {
    max: MAX_FULL_INPUTS,
    pathMode: true
  });
  if (!raw.projections || Array.isArray(raw.projections) || typeof raw.projections !== 'object') {
    fail('RELEASE_CONTRACT_PROJECTION_SET_INVALID');
  }
  const names = Object.keys(raw.projections).sort();
  const expectedNames = [...PROJECTION_NAMES].sort();
  if (JSON.stringify(names) !== JSON.stringify(expectedNames)) fail('RELEASE_CONTRACT_PROJECTION_SET_INVALID');

  const projections = {};
  for (const kind of PROJECTION_NAMES) projections[kind] = canonicalizeProjection(kind, raw.projections[kind]);

  return Object.freeze({
    schema: SCHEMA,
    fingerprint_profile: FP_PROFILE,
    full_rcf: Object.freeze({ blob_inputs: blobInputs }),
    projections: Object.freeze(projections)
  });
}

function parseManifestBytes(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) fail('RELEASE_CONTRACT_MANIFEST_JSON_INVALID');
  if (bytes.length > MAX_MANIFEST_BYTES) fail('RELEASE_CONTRACT_MANIFEST_TOO_LARGE');
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail('RELEASE_CONTRACT_MANIFEST_BOM_FORBIDDEN');
  }
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes); }
  catch (_) { fail('RELEASE_CONTRACT_MANIFEST_UTF8_INVALID'); }
  if (forbiddenJsonConstantOutsideString(text)) fail('RELEASE_CONTRACT_MANIFEST_JSON_INVALID');
  rejectDuplicateObjectKeys(text);
  let value;
  try { value = JSON.parse(text); } catch (_) { fail('RELEASE_CONTRACT_MANIFEST_JSON_INVALID'); }
  return validateAuthority(value);
}

function readCanonicalManifest() {
  let bytes;
  try { bytes = fs.readFileSync(MANIFEST_PATH); }
  catch (_) { fail('RELEASE_CONTRACT_MANIFEST_READ_FAILED'); }
  return parseManifestBytes(bytes);
}

function qcf(kind, authorityValue) {
  const authority = validateAuthority(authorityValue);
  const projection = authority.projections[kind];
  if (!projection) fail('RELEASE_CONTRACT_PROJECTION_INVALID', kind);
  const hash = crypto.createHash('sha256');
  pushString(hash, QCF_PREFIX + ':' + kind);
  pushString(hash, projection.schema);
  pushString(hash, projection.subject);
  pushList(hash, projection.environment_policy);
  hash.update(u32(projection.cases.length));
  for (const item of projection.cases) {
    pushString(hash, item.id);
    pushList(hash, item.assertions);
  }
  return 'sha256:' + hash.digest('hex');
}

function semanticAuthorityDigest(authorityValue) {
  const authority = validateAuthority(authorityValue);
  const hash = crypto.createHash('sha256');
  pushString(hash, 'WEBCLIP_RELEASE_CONTRACT_AUTHORITY_SEMANTICS_V1');
  pushString(hash, authority.schema);
  pushString(hash, authority.fingerprint_profile);
  pushList(hash, authority.full_rcf.blob_inputs);
  for (const kind of [...PROJECTION_NAMES].sort()) pushString(hash, qcf(kind, authority));
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
    wrapped.code = 'RELEASE_CONTRACT_GIT_READ_FAILED';
    wrapped.cause = error;
    throw wrapped;
  }
}

function normalizeCandidateSha(value) {
  const candidate = String(value || '').toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(candidate)) fail('RELEASE_CONTRACT_CANDIDATE_SHA_INVALID');
  return candidate;
}

function readGitBlob(repoRoot, candidate, rel, aggregate) {
  let raw;
  try { raw = String(git(repoRoot, ['ls-tree', candidate, '--', rel])).trim(); }
  catch (_) { fail('RELEASE_CONTRACT_GIT_READ_FAILED', rel); }
  if (!raw) fail('RELEASE_CONTRACT_INPUT_MISSING', rel);
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length !== 1) fail('RELEASE_CONTRACT_INPUT_TYPE_INVALID', rel);
  const tab = lines[0].indexOf('\t');
  if (tab <= 0) fail('RELEASE_CONTRACT_GIT_READ_FAILED', rel);
  const fields = lines[0].slice(0, tab).split(/\s+/);
  const mode = fields[0];
  const type = fields[1];
  const oid = fields[2];
  if (lines[0].slice(tab + 1) !== rel) fail('RELEASE_CONTRACT_GIT_READ_FAILED', rel);
  if (type !== 'blob') fail('RELEASE_CONTRACT_INPUT_TYPE_INVALID', rel);
  if (mode !== '100644') fail('RELEASE_CONTRACT_INPUT_MODE_INVALID', rel);
  if (!/^[0-9a-f]{40}$/.test(oid)) fail('RELEASE_CONTRACT_GIT_READ_FAILED', rel);
  const size = Number(String(git(repoRoot, ['cat-file', '-s', oid])).trim());
  if (!Number.isSafeInteger(size) || size < 0) fail('RELEASE_CONTRACT_GIT_READ_FAILED', rel);
  if (size > MAX_FILE_BYTES) fail('RELEASE_CONTRACT_INPUT_TOO_LARGE', rel);
  aggregate.value += size;
  if (aggregate.value > MAX_TOTAL_BYTES) fail('RELEASE_CONTRACT_TOTAL_BYTES_EXCEEDED');
  const bytes = git(repoRoot, ['cat-file', 'blob', oid], {
    encoding: null,
    maxBuffer: Math.max(32 * 1024 * 1024, size + 1024)
  });
  if (!Buffer.isBuffer(bytes) || bytes.length !== size) fail('RELEASE_CONTRACT_GIT_READ_FAILED', rel);
  return Object.freeze({
    path: rel,
    git_oid: oid,
    byte_length: size,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    bytes
  });
}

function resolveCandidate(candidateSha, authorityValue, options) {
  const opts = options || {};
  const repoRoot = path.resolve(opts.repoRoot || ROOT);
  const candidate = normalizeCandidateSha(candidateSha);
  const authority = validateAuthority(authorityValue);
  let type;
  try { type = String(git(repoRoot, ['cat-file', '-t', candidate])).trim(); }
  catch (_) { fail('RELEASE_CONTRACT_CANDIDATE_NOT_COMMIT'); }
  if (type !== 'commit') fail('RELEASE_CONTRACT_CANDIDATE_NOT_COMMIT');

  const aggregate = { value: 0 };
  const inputs = authority.full_rcf.blob_inputs.map((rel) => readGitBlob(repoRoot, candidate, rel, aggregate));
  return Object.freeze({
    schema: 'webclip-release-contract-resolution/v1',
    candidate_sha: candidate,
    authority,
    inputs: Object.freeze(inputs),
    aggregate_bytes: aggregate.value
  });
}

function fullRcfFromResolved(resolved) {
  if (!resolved || !resolved.authority || !Array.isArray(resolved.inputs)) {
    fail('RELEASE_CONTRACT_RESOLUTION_INVALID');
  }
  const authority = validateAuthority(resolved.authority);
  if (resolved.inputs.length !== authority.full_rcf.blob_inputs.length) fail('RELEASE_CONTRACT_RESOLUTION_INVALID');
  const hash = crypto.createHash('sha256');
  pushString(hash, RCF_PREFIX);
  pushString(hash, semanticAuthorityDigest(authority));
  for (let index = 0; index < authority.full_rcf.blob_inputs.length; index += 1) {
    const rel = authority.full_rcf.blob_inputs[index];
    const input = resolved.inputs[index];
    if (!input || input.path !== rel || !Buffer.isBuffer(input.bytes)) fail('RELEASE_CONTRACT_RESOLUTION_INVALID');
    pushString(hash, rel);
    hash.update(u64(input.bytes.length));
    hash.update(input.bytes);
  }
  return 'sha256:' + hash.digest('hex');
}

function fingerprints(candidateSha, authorityValue, options) {
  const authority = validateAuthority(authorityValue);
  const resolved = resolveCandidate(candidateSha, authority, options);
  return Object.freeze({
    schema: 'webclip-release-contract-fingerprints/v1',
    candidate_sha: resolved.candidate_sha,
    chrome_qcf: qcf('unpacked-chrome', authority),
    yandex_qcf: qcf('yandex-e2e', authority),
    full_rcf: fullRcfFromResolved(resolved),
    policy_mutation: false,
    receipt_interpretation: false,
    release_authorized: false
  });
}

function parseArgs(argv) {
  const out = { candidate: '', help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') { out.help = true; continue; }
    if (arg === '--candidate') {
      if (out.candidate) fail('RELEASE_CONTRACT_ARGUMENT_INVALID');
      out.candidate = String(argv[++index] || '');
      continue;
    }
    fail('RELEASE_CONTRACT_ARGUMENT_INVALID', arg);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write('node project_tools/release_contract_authority.js --candidate <exact-40-hex-commit>\n');
    return;
  }
  if (!args.candidate) fail('RELEASE_CONTRACT_CANDIDATE_SHA_REQUIRED');
  const result = fingerprints(args.candidate, readCanonicalManifest());
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    process.stderr.write(String(error && error.code || 'RELEASE_CONTRACT_AUTHORITY_FAILED') + ': ' +
      String(error && error.message || 'failed').slice(0, 240) + '\n');
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({
  ROOT,
  MANIFEST_PATH,
  SCHEMA,
  FP_PROFILE,
  PROJECTION_NAMES,
  parseManifestBytes,
  readCanonicalManifest,
  validateAuthority,
  qcf,
  semanticAuthorityDigest,
  normalizeCandidateSha,
  resolveCandidate,
  fullRcfFromResolved,
  fingerprints,
  parseArgs
});
