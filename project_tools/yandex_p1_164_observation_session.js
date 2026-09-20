'use strict';

// P1-164 local observation-session ledger.
// Consumes sanitized GET-only observer outputs. It performs no provider call,
// accepts no OAuth credential, and never claims qualification PASS.

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const REAL_ROOT = fs.realpathSync(ROOT);

const OBSERVATION_SCHEMA = 'webclip-p1-164-live-observation/v1';
const HEADER_SCHEMA = 'webclip-p1-164-observation-session-header/v1';
const ENTRY_SCHEMA = 'webclip-p1-164-observation-session-entry/v1';
const SUMMARY_SCHEMA = 'webclip-p1-164-observation-session-summary/v1';
const KIND = 'publication-revoke-trash';

const MAX_OBSERVATION_BYTES = 256 * 1024;
const MAX_CHECKPOINTS = 128;
const MAX_ATTEMPTS = 256;

const PHASES = new Set([
  'prepared',
  'revoke-admitted-unknown',
  'revoke-verified',
  'move-admitted-unknown',
  'remote-verified',
  'manual-resolution'
]);
const EFFECTIVE_PHASES = Object.freeze([
  'prepared',
  'revoke-admitted-unknown',
  'revoke-verified',
  'move-admitted-unknown',
  'remote-verified'
]);
const PHASE_RANK = new Map(EFFECTIVE_PHASES.map((value, index) => [value, index]));

const LABELS = new Set([
  'baseline',
  'post-revoke-admission',
  'revoke-settlement-check',
  'pre-move-admission',
  'post-move-admission',
  'visibility-delay-check',
  'auth-expiry-check',
  'account-switch-check',
  'root-switch-check',
  'source-replacement-check',
  'target-occupation-check',
  'manual-resolution-check',
  'terminal-check',
  'other'
]);

const CLASSIFICATION_STATES = new Set([
  'auth-rejected',
  'rate-limited',
  'observation-error',
  'account-conflict',
  'root-conflict',
  'source-replaced',
  'source-missing',
  'public-url-conflict',
  'already-private',
  'target-occupied',
  'pre-admission-ready',
  'revoke-settlement-unknown',
  'revoke-settled-private',
  'revoke-not-observed',
  'source-conflict',
  'remote-terminal-private',
  'pre-move-ready',
  'phase-conflict',
  'target-replaced',
  'target-public',
  'dual-location',
  'move-settled-private',
  'source-public',
  'move-not-observed',
  'move-settlement-unknown',
  'terminal-replaced',
  'terminal-not-visible',
  'terminal-public',
  'terminal-confirmed',
  'phase-invalid',
  'observation-window-expired'
]);

const NEXT_ACTIONS = new Set([
  'reauthorize-then-observe-only',
  'delay-then-observe-only',
  'retry-read-only-observation',
  'stop-no-retry',
  'manual-resolution-no-retry',
  'manual-resolution-no-retarget',
  'manual-resolution-local-only',
  'use-normal-private-trash-path',
  'return-to-webclip-for-admission',
  'observe-only-never-repeat-unpublish',
  'continue-from-revoke-verified',
  'local-finalize-only',
  'return-to-webclip-for-single-move-admission',
  'observe-only-never-repeat-move'
]);

const ACCOUNT_STATES = new Set([
  'present',
  'auth-rejected',
  'rate-limited',
  'timeout',
  'network',
  'provider-5xx',
  'http-error',
  'missing',
  'error'
]);
const RESOURCE_STATES = new Set(['present', 'missing', 'auth-rejected', 'rate-limited', 'error']);
const RESOURCE_ERROR_CLASSES = new Set([
  '',
  'timeout',
  'network',
  'auth-rejected',
  'rate-limited',
  'provider-5xx',
  'http-error'
]);
const OBSERVER_LIMITATIONS = Object.freeze([
  'observer-issued-no-provider-mutation',
  'does-not-prove-webclip-command-admission-by-itself',
  'does-not-prove-running-extension-source-sha',
  'does-not-close-p1-164-by-itself',
  'does-not-advance-yandex-qcf-by-itself'
]);
const SESSION_LIMITATIONS = Object.freeze([
  'local-hash-chain-is-tamper-evident-not-authenticated',
  'does-not-authenticate-observer-origin',
  'operator-labels-are-non-evidentiary',
  'does-not-prove-webclip-command-admission',
  'does-not-prove-running-extension-source-sha',
  'does-not-close-p1-164',
  'does-not-advance-yandex-qcf'
]);
const DIGEST_KEYS = Object.freeze([
  'operationId',
  'accountUid',
  'rootPath',
  'sourcePath',
  'targetPath',
  'resourceId',
  'publicUrl',
  'currentRootPath'
]);
const RECEIPT_DIGEST_KEYS = Object.freeze(DIGEST_KEYS.filter((key) => key !== 'currentRootPath'));
const SENSITIVE_KEYS = new Set([
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'clientsecret',
  'codeverifier',
  'oauthaccesstoken',
  'oauthrefreshtoken'
]);

function fail(code, message = code) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function exactKeys(value, expected, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) fail(code);
}

function assertNoSensitiveKeys(value, trail = '') {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSensitiveKeys(item, `${trail}[${index}]`));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(String(key).toLowerCase())) {
      fail('SESSION_SENSITIVE_FIELD_FORBIDDEN', trail ? `${trail}.${key}` : key);
    }
    assertNoSensitiveKeys(child, trail ? `${trail}.${key}` : key);
  }
}

function sha256Text(value) {
  return 'sha256:' + crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function isDigest(value) {
  return /^sha256:[0-9a-f]{64}$/.test(String(value || ''));
}

function canonicalJson(value) {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) fail('SESSION_CANONICAL_NUMBER_INVALID');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
    return '{' + keys.map((key) => JSON.stringify(key) + ':' + canonicalJson(value[key])).join(',') + '}';
  }
  fail('SESSION_CANONICAL_TYPE_INVALID');
}

function digestObject(value) {
  return sha256Text(canonicalJson(value));
}

function validIso(value, code) {
  const text = String(value || '');
  const ms = Date.parse(text);
  if (!text || !Number.isFinite(ms)) fail(code);
  return { text: new Date(ms).toISOString(), ms };
}

function validateSafeResource(value, label) {
  exactKeys(value, [
    'state', 'type', 'pathMatches', 'resourceIdMatches',
    'isPublic', 'publicUrlMatches', 'httpStatus', 'errorClass'
  ], 'SESSION_RESOURCE_SHAPE_INVALID');
  if (!RESOURCE_STATES.has(String(value.state || ''))) fail('SESSION_RESOURCE_STATE_INVALID', label);
  if (!['', 'file'].includes(String(value.type || ''))) fail('SESSION_RESOURCE_TYPE_INVALID', label);
  for (const key of ['pathMatches', 'resourceIdMatches', 'isPublic', 'publicUrlMatches']) {
    if (typeof value[key] !== 'boolean') fail('SESSION_RESOURCE_BOOLEAN_INVALID', `${label}.${key}`);
  }
  const status = Number(value.httpStatus);
  if (!Number.isSafeInteger(status) || status < 0 || status > 599) fail('SESSION_RESOURCE_HTTP_STATUS_INVALID', label);
  if (!RESOURCE_ERROR_CLASSES.has(String(value.errorClass || ''))) fail('SESSION_RESOURCE_ERROR_CLASS_INVALID', label);
  return Object.freeze({
    state: String(value.state),
    type: String(value.type || ''),
    pathMatches: value.pathMatches,
    resourceIdMatches: value.resourceIdMatches,
    isPublic: value.isPublic,
    publicUrlMatches: value.publicUrlMatches,
    httpStatus: status,
    errorClass: String(value.errorClass || '')
  });
}

function validateObservation(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('SESSION_OBSERVATION_OBJECT_REQUIRED');
  assertNoSensitiveKeys(value);
  exactKeys(value, [
    'schema', 'generatedAt', 'evidenceClass', 'testedSourceSha', 'subject',
    'kind', 'phase', 'manualResolutionSourcePhase', 'effectivePhase',
    'identityDigests', 'context', 'source', 'target', 'classification',
    'watch', 'limitations'
  ], 'SESSION_OBSERVATION_SHAPE_INVALID');

  if (value.schema !== OBSERVATION_SCHEMA) fail('SESSION_OBSERVATION_SCHEMA_INVALID');
  if (value.evidenceClass !== 'live-provider-observation-only') fail('SESSION_OBSERVATION_EVIDENCE_CLASS_INVALID');
  if (!/^[0-9a-f]{40}$/.test(String(value.testedSourceSha || ''))) fail('SESSION_TESTED_SOURCE_SHA_INVALID');
  if (value.kind !== KIND) fail('SESSION_KIND_INVALID');
  if (!PHASES.has(String(value.phase || ''))) fail('SESSION_PHASE_INVALID');
  if (!PHASE_RANK.has(String(value.effectivePhase || ''))) fail('SESSION_EFFECTIVE_PHASE_INVALID');

  const expectedEffective = value.phase === 'manual-resolution'
    ? String(value.manualResolutionSourcePhase || '')
    : String(value.phase || '');
  if (String(value.effectivePhase || '') !== expectedEffective) fail('SESSION_PHASE_LINEAGE_INVALID');
  if (value.phase !== 'manual-resolution' && String(value.manualResolutionSourcePhase || '') !== '') {
    fail('SESSION_MANUAL_PHASE_UNEXPECTED');
  }

  const generated = validIso(value.generatedAt, 'SESSION_GENERATED_AT_INVALID');

  exactKeys(value.subject, ['rpf', 'yandexQcf'], 'SESSION_SUBJECT_SHAPE_INVALID');
  if (!isDigest(value.subject.rpf) || !isDigest(value.subject.yandexQcf)) fail('SESSION_SUBJECT_DIGEST_INVALID');

  exactKeys(value.identityDigests, DIGEST_KEYS, 'SESSION_IDENTITY_DIGEST_SHAPE_INVALID');
  const identityDigests = {};
  for (const key of DIGEST_KEYS) {
    if (!isDigest(value.identityDigests[key])) fail('SESSION_IDENTITY_DIGEST_INVALID', key);
    identityDigests[key] = String(value.identityDigests[key]);
  }

  exactKeys(value.context, ['accountState', 'accountMatches', 'rootMatches', 'sameSourceTargetPath'], 'SESSION_CONTEXT_SHAPE_INVALID');
  if (!ACCOUNT_STATES.has(String(value.context.accountState || ''))) fail('SESSION_ACCOUNT_STATE_INVALID');
  for (const key of ['accountMatches', 'rootMatches', 'sameSourceTargetPath']) {
    if (typeof value.context[key] !== 'boolean') fail('SESSION_CONTEXT_BOOLEAN_INVALID', key);
  }

  const source = validateSafeResource(value.source, 'source');
  const target = validateSafeResource(value.target, 'target');

  exactKeys(value.classification, ['state', 'safeNextAction', 'terminal'], 'SESSION_CLASSIFICATION_SHAPE_INVALID');
  if (!CLASSIFICATION_STATES.has(String(value.classification.state || ''))) fail('SESSION_CLASSIFICATION_STATE_INVALID');
  if (!NEXT_ACTIONS.has(String(value.classification.safeNextAction || ''))) fail('SESSION_NEXT_ACTION_INVALID');
  if (typeof value.classification.terminal !== 'boolean') fail('SESSION_CLASSIFICATION_TERMINAL_INVALID');

  exactKeys(value.watch, ['requestedSeconds', 'elapsedMs', 'attempts'], 'SESSION_WATCH_SHAPE_INVALID');
  const requestedSeconds = Number(value.watch.requestedSeconds);
  const elapsedMs = Number(value.watch.elapsedMs);
  if (!Number.isSafeInteger(requestedSeconds) || requestedSeconds < 0 || requestedSeconds > 120) fail('SESSION_WATCH_SECONDS_INVALID');
  if (!Number.isSafeInteger(elapsedMs) || elapsedMs < 0 || elapsedMs > 10 * 60 * 1000) fail('SESSION_WATCH_ELAPSED_INVALID');
  if (!Array.isArray(value.watch.attempts) || value.watch.attempts.length < 1 || value.watch.attempts.length > MAX_ATTEMPTS) {
    fail('SESSION_WATCH_ATTEMPTS_INVALID');
  }
  let previousElapsed = -1;
  const attempts = value.watch.attempts.map((attempt, index) => {
    exactKeys(attempt, ['attempt', 'elapsedMs', 'state'], 'SESSION_ATTEMPT_SHAPE_INVALID');
    const number = Number(attempt.attempt);
    const attemptElapsed = Number(attempt.elapsedMs);
    if (number !== index + 1) fail('SESSION_ATTEMPT_SEQUENCE_INVALID');
    if (!Number.isSafeInteger(attemptElapsed) || attemptElapsed < previousElapsed || attemptElapsed > elapsedMs) {
      fail('SESSION_ATTEMPT_ELAPSED_INVALID');
    }
    if (!CLASSIFICATION_STATES.has(String(attempt.state || '')) || attempt.state === 'observation-window-expired') {
      fail('SESSION_ATTEMPT_STATE_INVALID');
    }
    previousElapsed = attemptElapsed;
    return Object.freeze({ attempt: number, elapsedMs: attemptElapsed, state: String(attempt.state) });
  });

  if (!Array.isArray(value.limitations)
    || value.limitations.length !== OBSERVER_LIMITATIONS.length
    || OBSERVER_LIMITATIONS.some((item) => !value.limitations.includes(item))) {
    fail('SESSION_OBSERVER_LIMITATIONS_INVALID');
  }

  return Object.freeze({
    schema: OBSERVATION_SCHEMA,
    generatedAt: generated.text,
    evidenceClass: 'live-provider-observation-only',
    testedSourceSha: String(value.testedSourceSha),
    subject: Object.freeze({ rpf: String(value.subject.rpf), yandexQcf: String(value.subject.yandexQcf) }),
    kind: KIND,
    phase: String(value.phase),
    manualResolutionSourcePhase: String(value.manualResolutionSourcePhase || ''),
    effectivePhase: String(value.effectivePhase),
    identityDigests: Object.freeze(identityDigests),
    context: Object.freeze({
      accountState: String(value.context.accountState),
      accountMatches: value.context.accountMatches,
      rootMatches: value.context.rootMatches,
      sameSourceTargetPath: value.context.sameSourceTargetPath
    }),
    source,
    target,
    classification: Object.freeze({
      state: String(value.classification.state),
      safeNextAction: String(value.classification.safeNextAction),
      terminal: value.classification.terminal
    }),
    watch: Object.freeze({ requestedSeconds, elapsedMs, attempts: Object.freeze(attempts) }),
    limitations: Object.freeze([...OBSERVER_LIMITATIONS])
  });
}

function publicObservation(value) {
  return validateObservation(value);
}

function sessionSubject(observation) {
  const value = validateObservation(observation);
  const receiptIdentityDigests = {};
  for (const key of RECEIPT_DIGEST_KEYS) receiptIdentityDigests[key] = value.identityDigests[key];
  return Object.freeze({
    testedSourceSha: value.testedSourceSha,
    rpf: value.subject.rpf,
    yandexQcf: value.subject.yandexQcf,
    kind: KIND,
    receiptIdentityDigests: Object.freeze(receiptIdentityDigests)
  });
}

function assertSameSubject(expected, observation) {
  const actual = sessionSubject(observation);
  if (canonicalJson(actual) !== canonicalJson(expected)) fail('SESSION_SUBJECT_MISMATCH');
}

function sessionId(value = '') {
  const id = String(value || '').trim() || crypto.randomUUID();
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(id)) fail('SESSION_ID_INVALID');
  return id;
}

function makeHeader(observation, options = {}) {
  const value = validateObservation(observation);
  const created = validIso(options.createdAt || new Date().toISOString(), 'SESSION_CREATED_AT_INVALID');
  return Object.freeze({
    schema: HEADER_SCHEMA,
    sessionId: sessionId(options.sessionId),
    createdAt: created.text,
    evidenceClass: 'local-observation-chain-only',
    subject: sessionSubject(value),
    limitations: Object.freeze([...SESSION_LIMITATIONS])
  });
}

function validateHeader(value) {
  exactKeys(value, ['schema', 'sessionId', 'createdAt', 'evidenceClass', 'subject', 'limitations'], 'SESSION_HEADER_SHAPE_INVALID');
  if (value.schema !== HEADER_SCHEMA) fail('SESSION_HEADER_SCHEMA_INVALID');
  const id = sessionId(value.sessionId);
  const created = validIso(value.createdAt, 'SESSION_CREATED_AT_INVALID');
  if (value.evidenceClass !== 'local-observation-chain-only') fail('SESSION_HEADER_EVIDENCE_CLASS_INVALID');

  exactKeys(value.subject, ['testedSourceSha', 'rpf', 'yandexQcf', 'kind', 'receiptIdentityDigests'], 'SESSION_HEADER_SUBJECT_SHAPE_INVALID');
  if (!/^[0-9a-f]{40}$/.test(String(value.subject.testedSourceSha || ''))) fail('SESSION_TESTED_SOURCE_SHA_INVALID');
  if (!isDigest(value.subject.rpf) || !isDigest(value.subject.yandexQcf)) fail('SESSION_SUBJECT_DIGEST_INVALID');
  if (value.subject.kind !== KIND) fail('SESSION_KIND_INVALID');
  exactKeys(value.subject.receiptIdentityDigests, RECEIPT_DIGEST_KEYS, 'SESSION_HEADER_IDENTITY_SHAPE_INVALID');
  const receiptIdentityDigests = {};
  for (const key of RECEIPT_DIGEST_KEYS) {
    if (!isDigest(value.subject.receiptIdentityDigests[key])) fail('SESSION_IDENTITY_DIGEST_INVALID', key);
    receiptIdentityDigests[key] = String(value.subject.receiptIdentityDigests[key]);
  }

  if (!Array.isArray(value.limitations)
    || value.limitations.length !== SESSION_LIMITATIONS.length
    || SESSION_LIMITATIONS.some((item) => !value.limitations.includes(item))) {
    fail('SESSION_LIMITATIONS_INVALID');
  }

  return Object.freeze({
    schema: HEADER_SCHEMA,
    sessionId: id,
    createdAt: created.text,
    evidenceClass: 'local-observation-chain-only',
    subject: Object.freeze({
      testedSourceSha: String(value.subject.testedSourceSha),
      rpf: String(value.subject.rpf),
      yandexQcf: String(value.subject.yandexQcf),
      kind: KIND,
      receiptIdentityDigests: Object.freeze(receiptIdentityDigests)
    }),
    limitations: Object.freeze([...SESSION_LIMITATIONS])
  });
}

function normalizeLabel(value) {
  const label = String(value || '').trim();
  if (!LABELS.has(label)) fail('SESSION_LABEL_INVALID');
  return label;
}

function makeEntry(header, previousEntry, observation, label, options = {}) {
  const h = validateHeader(header);
  const value = validateObservation(observation);
  assertSameSubject(h.subject, value);
  const sequence = previousEntry ? Number(previousEntry.sequence) + 1 : 1;
  if (!Number.isSafeInteger(sequence) || sequence < 1 || sequence > MAX_CHECKPOINTS) fail('SESSION_SEQUENCE_INVALID');

  const predecessorDigest = previousEntry ? digestObject(previousEntry) : digestObject(h);
  const observationSafe = publicObservation(value);
  const observationDigest = digestObject(observationSafe);
  const recorded = validIso(options.recordedAt || new Date().toISOString(), 'SESSION_RECORDED_AT_INVALID');

  if (previousEntry) {
    const previous = validateEntry(previousEntry, h);
    const previousObservation = validateObservation(previous.observation);
    if (Date.parse(value.generatedAt) < Date.parse(previousObservation.generatedAt)) fail('SESSION_OBSERVATION_TIME_REGRESSION');
    if (PHASE_RANK.get(value.effectivePhase) < PHASE_RANK.get(previousObservation.effectivePhase)) {
      fail('SESSION_PHASE_REGRESSION');
    }
    if (observationDigest === previous.observationDigest) fail('SESSION_DUPLICATE_OBSERVATION');
    if (recorded.ms < Date.parse(previous.recordedAt)) fail('SESSION_RECORDED_AT_REGRESSION');
  }

  return Object.freeze({
    schema: ENTRY_SCHEMA,
    sessionId: h.sessionId,
    sequence,
    recordedAt: recorded.text,
    operatorLabel: normalizeLabel(label),
    operatorLabelEvidence: false,
    predecessorDigest,
    observationDigest,
    observation: observationSafe
  });
}

function validateEntry(value, header) {
  const h = validateHeader(header);
  exactKeys(value, [
    'schema', 'sessionId', 'sequence', 'recordedAt', 'operatorLabel',
    'operatorLabelEvidence', 'predecessorDigest', 'observationDigest', 'observation'
  ], 'SESSION_ENTRY_SHAPE_INVALID');
  if (value.schema !== ENTRY_SCHEMA) fail('SESSION_ENTRY_SCHEMA_INVALID');
  if (String(value.sessionId || '') !== h.sessionId) fail('SESSION_ENTRY_ID_MISMATCH');
  const sequence = Number(value.sequence);
  if (!Number.isSafeInteger(sequence) || sequence < 1 || sequence > MAX_CHECKPOINTS) fail('SESSION_SEQUENCE_INVALID');
  const recorded = validIso(value.recordedAt, 'SESSION_RECORDED_AT_INVALID');
  if (value.operatorLabelEvidence !== false) fail('SESSION_OPERATOR_LABEL_AUTHORITY_INVALID');
  const label = normalizeLabel(value.operatorLabel);
  if (!isDigest(value.predecessorDigest) || !isDigest(value.observationDigest)) fail('SESSION_ENTRY_DIGEST_INVALID');
  const observation = publicObservation(value.observation);
  assertSameSubject(h.subject, observation);
  if (digestObject(observation) !== value.observationDigest) fail('SESSION_OBSERVATION_DIGEST_MISMATCH');
  return Object.freeze({
    schema: ENTRY_SCHEMA,
    sessionId: h.sessionId,
    sequence,
    recordedAt: recorded.text,
    operatorLabel: label,
    operatorLabelEvidence: false,
    predecessorDigest: String(value.predecessorDigest),
    observationDigest: String(value.observationDigest),
    observation
  });
}

function assertResolvedOutsideRepo(resolvedPath, label) {
  const absolute = path.resolve(String(resolvedPath || ''));
  const relative = path.relative(REAL_ROOT, absolute);
  if (!relative || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    fail('SESSION_PATH_INSIDE_REPOSITORY', `${label}: resolved path must remain outside repository`);
  }
  return absolute;
}

function resolveExistingOutside(value, label, kind) {
  const raw = String(value || '').trim();
  if (!raw) fail('SESSION_PATH_REQUIRED', label);
  const lexical = path.resolve(raw);
  let real;
  let stat;
  try {
    real = assertResolvedOutsideRepo(fs.realpathSync(lexical), label);
    stat = fs.lstatSync(lexical);
  } catch (error) {
    if (error?.code === 'SESSION_PATH_INSIDE_REPOSITORY') throw error;
    fail('SESSION_PATH_UNREADABLE', label);
  }
  if (stat.isSymbolicLink()) fail('SESSION_SYMLINK_FORBIDDEN', label);
  if (kind === 'file' && !stat.isFile()) fail('SESSION_FILE_REQUIRED', label);
  if (kind === 'dir' && !stat.isDirectory()) fail('SESSION_DIRECTORY_REQUIRED', label);
  return real;
}

function createOutsideSessionDir(value) {
  const raw = String(value || '').trim();
  if (!raw) fail('SESSION_PATH_REQUIRED', 'session directory');
  const absolute = path.resolve(raw);
  if (fs.existsSync(absolute)) fail('SESSION_DIRECTORY_EXISTS');
  const parent = path.dirname(absolute);
  let realParent;
  let parentStat;
  try {
    realParent = assertResolvedOutsideRepo(fs.realpathSync(parent), 'session parent');
    parentStat = fs.lstatSync(parent);
  } catch (error) {
    if (error?.code === 'SESSION_PATH_INSIDE_REPOSITORY') throw error;
    fail('SESSION_PARENT_INVALID');
  }
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) fail('SESSION_PARENT_INVALID');
  const target = assertResolvedOutsideRepo(path.join(realParent, path.basename(absolute)), 'session directory');
  fs.mkdirSync(target, { mode: 0o700 });
  try { fs.chmodSync(target, 0o700); } catch (_) {}
  return target;
}

function writeExclusiveJson(filename, value) {
  let fd = -1;
  let created = false;
  try {
    fd = fs.openSync(filename, 'wx', 0o600);
    created = true;
    fs.writeFileSync(fd, JSON.stringify(value, null, 2) + '\n', { encoding: 'utf8' });
    fs.closeSync(fd);
    fd = -1;
    try { fs.chmodSync(filename, 0o600); } catch (_) {}
  } catch (error) {
    if (fd >= 0) {
      try { fs.closeSync(fd); } catch (_) {}
    }
    if (created) {
      try { fs.unlinkSync(filename); } catch (_) {}
    }
    if (error?.code === 'EEXIST') fail('SESSION_FILE_EXISTS');
    throw error;
  }
}

function readJsonFile(filename, maxBytes, code) {
  let stat;
  try { stat = fs.lstatSync(filename); } catch (_) { fail(code); }
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size <= 0 || stat.size > maxBytes) fail(code);
  try { return JSON.parse(fs.readFileSync(filename, 'utf8')); } catch (_) { fail(code); }
}

function readObservationFile(filename) {
  const file = resolveExistingOutside(filename, 'observation file', 'file');
  return validateObservation(readJsonFile(file, MAX_OBSERVATION_BYTES, 'SESSION_OBSERVATION_FILE_INVALID'));
}

function checkpointFilename(sequence) {
  return String(sequence).padStart(6, '0') + '.checkpoint.json';
}

function readSession(sessionDir) {
  const dir = resolveExistingOutside(sessionDir, 'session directory', 'dir');
  const names = fs.readdirSync(dir).sort();
  if (!names.includes('000000.header.json')) fail('SESSION_HEADER_MISSING');
  const allowed = new Set(['000000.header.json']);
  const checkpointNames = names.filter((name) => /^\d{6}\.checkpoint\.json$/.test(name));
  if (checkpointNames.length > MAX_CHECKPOINTS) fail('SESSION_TOO_MANY_CHECKPOINTS');
  checkpointNames.forEach((name) => allowed.add(name));
  const unexpected = names.filter((name) => !allowed.has(name));
  if (unexpected.length) fail('SESSION_UNEXPECTED_FILE', unexpected[0]);

  const header = validateHeader(readJsonFile(path.join(dir, '000000.header.json'), MAX_OBSERVATION_BYTES, 'SESSION_HEADER_INVALID'));
  const entries = [];
  let previousDigest = digestObject(header);
  let previousGeneratedAt = -1;
  let previousRecordedAt = -1;
  let previousRank = -1;
  const seenObservationDigests = new Set();

  for (let index = 0; index < checkpointNames.length; index += 1) {
    const expectedName = checkpointFilename(index + 1);
    if (checkpointNames[index] !== expectedName) fail('SESSION_SEQUENCE_GAP');
    const entry = validateEntry(
      readJsonFile(path.join(dir, expectedName), MAX_OBSERVATION_BYTES, 'SESSION_ENTRY_INVALID'),
      header
    );
    if (entry.sequence !== index + 1) fail('SESSION_SEQUENCE_MISMATCH');
    if (entry.predecessorDigest !== previousDigest) fail('SESSION_PREDECESSOR_DIGEST_MISMATCH');
    if (seenObservationDigests.has(entry.observationDigest)) fail('SESSION_DUPLICATE_OBSERVATION');
    seenObservationDigests.add(entry.observationDigest);

    const observation = validateObservation(entry.observation);
    if (observation.generatedAtMs < previousGeneratedAt) fail('SESSION_OBSERVATION_TIME_REGRESSION');
    const rank = PHASE_RANK.get(observation.effectivePhase);
    if (rank < previousRank) fail('SESSION_PHASE_REGRESSION');
    const recordedAt = Date.parse(entry.recordedAt);
    if (recordedAt < previousRecordedAt) fail('SESSION_RECORDED_AT_REGRESSION');

    entries.push(entry);
    previousDigest = digestObject(entry);
    previousGeneratedAt = Date.parse(observation.generatedAt);
    previousRecordedAt = recordedAt;
    previousRank = rank;
  }

  return Object.freeze({ dir, header, entries: Object.freeze(entries), finalDigest: previousDigest });
}

function initSession(sessionDir, observation, label, options = {}) {
  const obs = validateObservation(observation);
  const dir = createOutsideSessionDir(sessionDir);
  const header = makeHeader(obs, options);
  let headerWritten = false;
  let entryWritten = false;
  try {
    writeExclusiveJson(path.join(dir, '000000.header.json'), header);
    headerWritten = true;
    const entry = makeEntry(header, null, obs, label, options);
    writeExclusiveJson(path.join(dir, checkpointFilename(1)), entry);
    entryWritten = true;
    return readSession(dir);
  } catch (error) {
    if (entryWritten) {
      try { fs.unlinkSync(path.join(dir, checkpointFilename(1))); } catch (_) {}
    }
    if (headerWritten) {
      try { fs.unlinkSync(path.join(dir, '000000.header.json')); } catch (_) {}
    }
    try { fs.rmdirSync(dir); } catch (_) {}
    throw error;
  }
}

function appendSession(sessionDir, observation, label, options = {}) {
  const chain = readSession(sessionDir);
  if (chain.entries.length >= MAX_CHECKPOINTS) fail('SESSION_TOO_MANY_CHECKPOINTS');
  const obs = validateObservation(observation);
  const previous = chain.entries.length ? chain.entries[chain.entries.length - 1] : null;
  const entry = makeEntry(chain.header, previous, obs, label, options);
  writeExclusiveJson(path.join(chain.dir, checkpointFilename(entry.sequence)), entry);
  return readSession(chain.dir);
}

function summarizeSession(chainValue) {
  const chain = chainValue?.header && Array.isArray(chainValue?.entries)
    ? chainValue
    : readSession(chainValue);
  const header = validateHeader(chain.header);
  const checkpoints = chain.entries.map((raw) => {
    const entry = validateEntry(raw, header);
    const observation = validateObservation(entry.observation);
    return Object.freeze({
      sequence: entry.sequence,
      generatedAt: observation.generatedAt,
      recordedAt: entry.recordedAt,
      operatorLabel: entry.operatorLabel,
      operatorLabelEvidence: false,
      phase: observation.phase,
      effectivePhase: observation.effectivePhase,
      currentRootPathDigest: observation.identityDigests.currentRootPath,
      accountState: observation.context.accountState,
      accountMatches: observation.context.accountMatches,
      rootMatches: observation.context.rootMatches,
      sourceState: observation.source.state,
      targetState: observation.target.state,
      classification: observation.classification,
      watch: Object.freeze({
        requestedSeconds: observation.watch.requestedSeconds,
        elapsedMs: observation.watch.elapsedMs,
        attemptCount: observation.watch.attempts.length
      }),
      observationDigest: entry.observationDigest,
      entryDigest: digestObject(entry)
    });
  });
  return Object.freeze({
    schema: SUMMARY_SCHEMA,
    evidenceClass: 'local-observation-chain-only',
    sessionIdDigest: sha256Text(header.sessionId),
    createdAt: header.createdAt,
    subject: header.subject,
    checkpointCount: checkpoints.length,
    finalDigest: chain.finalDigest || (checkpoints.length ? checkpoints[checkpoints.length - 1].entryDigest : digestObject(header)),
    checkpoints: Object.freeze(checkpoints),
    qualificationPass: false,
    limitations: Object.freeze([...SESSION_LIMITATIONS])
  });
}

function parseArgs(argv) {
  const out = { mode: '', sessionDir: '', observation: '', label: '' };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--init' || arg === '--append' || arg === '--verify') {
      if (out.mode) fail('SESSION_MODE_CONFLICT');
      out.mode = arg.slice(2);
      continue;
    }
    if (arg === '--session-dir') { out.sessionDir = String(argv[++index] || ''); continue; }
    if (arg === '--observation') { out.observation = String(argv[++index] || ''); continue; }
    if (arg === '--label') { out.label = String(argv[++index] || ''); continue; }
    if (arg === '--help') { out.mode = 'help'; continue; }
    fail('SESSION_ARGUMENT_INVALID', arg);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.mode === 'help') {
    process.stdout.write(
      'node project_tools/yandex_p1_164_observation_session.js --init|--append --session-dir /absolute/private/session --observation /absolute/private/observer-output.json --label <checkpoint>\n' +
      'node project_tools/yandex_p1_164_observation_session.js --verify --session-dir /absolute/private/session\n'
    );
    return;
  }
  if (process.env.CI && String(process.env.CI).toLowerCase() !== 'false') fail('SESSION_CLI_REFUSES_CI');
  if (!['init', 'append', 'verify'].includes(args.mode)) fail('SESSION_MODE_REQUIRED');
  if (!args.sessionDir) fail('SESSION_PATH_REQUIRED', 'session directory');

  if (args.mode === 'verify') {
    if (args.observation || args.label) fail('SESSION_VERIFY_ARGUMENT_INVALID');
    process.stdout.write(JSON.stringify(summarizeSession(readSession(args.sessionDir)), null, 2) + '\n');
    return;
  }

  if (!args.observation || !args.label) fail('SESSION_OBSERVATION_AND_LABEL_REQUIRED');
  const observation = readObservationFile(args.observation);
  const chain = args.mode === 'init'
    ? initSession(args.sessionDir, observation, args.label)
    : appendSession(args.sessionDir, observation, args.label);
  const summary = summarizeSession(chain);
  process.stdout.write(
    `P1-164 observation session: PASS; mode=${args.mode}; checkpoints=${summary.checkpointCount}; final_digest=${summary.finalDigest}; ` +
    'provider_calls=0; provider_mutations=0; oauth_credentials=0; raw_identity_stdout=false; qualification_pass=false\n'
  );
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    process.stderr.write(`${String(error?.code || 'SESSION_FAILED')}: ${String(error?.message || 'failed').slice(0, 240)}\n`);
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({
  OBSERVATION_SCHEMA,
  HEADER_SCHEMA,
  ENTRY_SCHEMA,
  SUMMARY_SCHEMA,
  KIND,
  LABELS,
  OBSERVER_LIMITATIONS,
  SESSION_LIMITATIONS,
  canonicalJson,
  digestObject,
  validateObservation,
  publicObservation,
  sessionSubject,
  makeHeader,
  validateHeader,
  makeEntry,
  validateEntry,
  assertResolvedOutsideRepo,
  initSession,
  appendSession,
  readSession,
  summarizeSession,
  parseArgs
});
