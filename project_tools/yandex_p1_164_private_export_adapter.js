'use strict';

// P1-164 private-export adapter.
// Converts one locally saved WebClip manual-recovery export into the exact
// GET-only observer input. It never accepts or reads an OAuth credential.

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const observer = require('./yandex_p1_164_live_observer.js');

const ROOT = path.resolve(__dirname, '..');
const PRIVATE_SCHEMA = 'webclip-p1-164-private-observer-export/v1';
const MAX_PRIVATE_BYTES = 64 * 1024;
const FORBIDDEN_CREDENTIAL_KEYS = new Set([
  'accesstoken', 'refreshtoken', 'token', 'authorization',
  'clientsecret', 'codeverifier', 'oauthaccesstoken', 'oauthrefreshtoken'
]);

function fail(code, message = code) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function exactKeys(value, allowed, code) {
  const keys = Object.keys(value || {}).sort();
  const want = [...allowed].sort();
  if (keys.length !== want.length || keys.some((key, index) => key !== want[index])) fail(code);
}

function outsideRepoPath(value, label = 'private file') {
  const raw = String(value || '').trim();
  if (!raw) fail('PRIVATE_PATH_REQUIRED', `${label}: path required`);
  const absolute = path.resolve(raw);
  const relative = path.relative(ROOT, absolute);
  if (!relative || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    fail('PRIVATE_PATH_INSIDE_REPOSITORY', `${label}: file must stay outside repository`);
  }
  return absolute;
}

function assertNoCredentialKeys(value, trail = '') {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoCredentialKeys(item, `${trail}[${index}]`));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_CREDENTIAL_KEYS.has(String(key).toLowerCase())) {
      fail('PRIVATE_EXPORT_CREDENTIAL_FIELD_FORBIDDEN', trail ? `${trail}.${key}` : key);
    }
    assertNoCredentialKeys(child, trail ? `${trail}.${key}` : key);
  }
}

function validatePrivateExport(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('PRIVATE_EXPORT_OBJECT_REQUIRED');
  exactKeys(value, [
    'schema', 'exportedAt', 'receiptId', 'receiptUpdatedAt', 'kind', 'phase',
    'manualResolutionSourcePhase', 'receipt', 'currentContext', 'watchSeconds',
    'containsSensitiveIdentity', 'containsOAuthCredentials'
  ], 'PRIVATE_EXPORT_SHAPE_INVALID');
  if (value.schema !== PRIVATE_SCHEMA) fail('PRIVATE_EXPORT_SCHEMA_INVALID');
  if (value.kind !== observer.KIND) fail('PRIVATE_EXPORT_KIND_INVALID');
  if (!/^publication-revoke-trash-[A-Za-z0-9._:-]+$/.test(String(value.receiptId || ''))
    && !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,179}$/.test(String(value.receiptId || ''))) {
    fail('PRIVATE_EXPORT_RECEIPT_ID_INVALID');
  }
  if (!Number.isSafeInteger(Number(value.receiptUpdatedAt)) || Number(value.receiptUpdatedAt) <= 0) {
    fail('PRIVATE_EXPORT_RECEIPT_UPDATED_AT_INVALID');
  }
  const exportedAt = Date.parse(String(value.exportedAt || ''));
  if (!Number.isFinite(exportedAt) || exportedAt <= 0) fail('PRIVATE_EXPORT_TIME_INVALID');
  if (value.containsSensitiveIdentity !== true || value.containsOAuthCredentials !== false) {
    fail('PRIVATE_EXPORT_SENSITIVITY_DECLARATION_INVALID');
  }
  exactKeys(value.receipt, [
    'operationId', 'accountUid', 'rootPath', 'sourcePath',
    'targetPath', 'sourceResourceId', 'sourcePublicUrl'
  ], 'PRIVATE_EXPORT_RECEIPT_SHAPE_INVALID');
  exactKeys(value.currentContext, ['rootPath'], 'PRIVATE_EXPORT_CONTEXT_SHAPE_INVALID');
  assertNoCredentialKeys(value);

  const probe = {
    schema: observer.INPUT_SCHEMA,
    testedSourceSha: 'a'.repeat(40),
    kind: value.kind,
    phase: value.phase,
    manualResolutionSourcePhase: value.manualResolutionSourcePhase,
    receipt: { ...value.receipt },
    currentContext: { ...value.currentContext },
    watchSeconds: value.watchSeconds
  };
  observer.validateConfig(probe);
  return Object.freeze({
    schema: value.schema,
    exportedAt: new Date(exportedAt).toISOString(),
    receiptId: String(value.receiptId),
    receiptUpdatedAt: Number(value.receiptUpdatedAt),
    kind: value.kind,
    phase: value.phase,
    manualResolutionSourcePhase: String(value.manualResolutionSourcePhase || ''),
    receipt: Object.freeze({ ...value.receipt }),
    currentContext: Object.freeze({ ...value.currentContext }),
    watchSeconds: Number(value.watchSeconds),
    containsSensitiveIdentity: true,
    containsOAuthCredentials: false
  });
}

function exactHeadClean() {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  if (!/^[0-9a-f]{40}$/.test(head)) fail('CHECKOUT_HEAD_INVALID');
  const dirty = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: ROOT, encoding: 'utf8' }).trim();
  if (dirty) fail('TRACKED_WORKTREE_DIRTY');
  return head;
}

function buildObserverInput(privateExport, testedSourceSha, watchSecondsOverride = null) {
  const value = validatePrivateExport(privateExport);
  const head = String(testedSourceSha || '').trim();
  if (!/^[0-9a-f]{40}$/.test(head)) fail('TESTED_SOURCE_SHA_INVALID');
  const watchSeconds = watchSecondsOverride === null
    ? value.watchSeconds
    : Number(watchSecondsOverride);
  if (!Number.isInteger(watchSeconds) || watchSeconds < 0 || watchSeconds > 120) {
    fail('WATCH_SECONDS_INVALID');
  }
  const input = {
    schema: observer.INPUT_SCHEMA,
    testedSourceSha: head,
    kind: value.kind,
    phase: value.phase,
    manualResolutionSourcePhase: value.manualResolutionSourcePhase,
    receipt: { ...value.receipt },
    currentContext: { ...value.currentContext },
    watchSeconds
  };
  observer.validateConfig(input);
  return Object.freeze(input);
}

function readPrivateJson(filename) {
  const input = outsideRepoPath(filename, 'private export');
  let stat;
  try { stat = fs.statSync(input); } catch (_) { fail('PRIVATE_EXPORT_UNREADABLE'); }
  if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_PRIVATE_BYTES) fail('PRIVATE_EXPORT_FILE_INVALID');
  let value;
  try { value = JSON.parse(fs.readFileSync(input, 'utf8')); } catch (_) { fail('PRIVATE_EXPORT_JSON_INVALID'); }
  return validatePrivateExport(value);
}

function writeExclusivePrivateJson(filename, value) {
  const output = outsideRepoPath(filename, 'observer input');
  const parent = path.dirname(output);
  let stat;
  try { stat = fs.statSync(parent); } catch (_) { fail('PRIVATE_OUTPUT_PARENT_INVALID'); }
  if (!stat.isDirectory()) fail('PRIVATE_OUTPUT_PARENT_INVALID');
  let fd = -1;
  try {
    fd = fs.openSync(output, 'wx', 0o600);
    fs.writeFileSync(fd, JSON.stringify(value, null, 2) + '\n', { encoding: 'utf8' });
  } catch (error) {
    if (error?.code === 'EEXIST') fail('PRIVATE_OUTPUT_EXISTS');
    throw error;
  } finally {
    if (fd >= 0) fs.closeSync(fd);
  }
  try { fs.chmodSync(output, 0o600); } catch (_) {}
}

function parseArgs(argv) {
  const out = { input: '', output: '', watchSeconds: null, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help') { out.help = true; continue; }
    if (arg === '--private-export') { out.input = String(argv[++i] || ''); continue; }
    if (arg === '--out') { out.output = String(argv[++i] || ''); continue; }
    if (arg === '--watch-seconds') { out.watchSeconds = Number(argv[++i]); continue; }
    fail('ARGUMENT_INVALID', `unsupported argument: ${arg}`);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write('node project_tools/yandex_p1_164_private_export_adapter.js --private-export /absolute/private/export.json --out /absolute/private/observer-input.json [--watch-seconds 0..120]\n');
    return;
  }
  if (process.env.CI && String(process.env.CI).toLowerCase() !== 'false') fail('PRIVATE_ADAPTER_REFUSES_CI');
  if (!args.input || !args.output) fail('ARGUMENT_REQUIRED');
  const privateExport = readPrivateJson(args.input);
  const head = exactHeadClean();
  const input = buildObserverInput(privateExport, head, args.watchSeconds);
  writeExclusivePrivateJson(args.output, input);
  process.stdout.write(`P1-164 private observer adapter: PASS; testedSourceSha=${head}; output_created=true; raw_identity_stdout=false; oauth_credentials=false\n`);
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    process.stderr.write(`${String(error?.code || 'PRIVATE_ADAPTER_FAILED')}: ${String(error?.message || 'failed').slice(0, 200)}\n`);
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({
  PRIVATE_SCHEMA,
  outsideRepoPath,
  assertNoCredentialKeys,
  validatePrivateExport,
  buildObserverInput,
  parseArgs
});
