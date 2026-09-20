'use strict';

// P1-164 deterministic witness for the local append-only observation session.
// No network, OAuth credential, provider mutation, or physical qualification claim.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ledger = require('./yandex_p1_164_observation_session.js');

const ROOT = path.resolve(__dirname, '..');
let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }
function eq(actual, expected, message) { assert.equal(actual, expected, message); checks += 1; }
function deep(actual, expected, message) { assert.deepStrictEqual(actual, expected, message); checks += 1; }
function throwsCode(fn, code, message) {
  assert.throws(fn, (error) => error?.code === code, message || code);
  checks += 1;
}

const digest = (ch) => 'sha256:' + ch.repeat(64);
const observerLimitations = [...ledger.OBSERVER_LIMITATIONS];

function safeResource(overrides = {}) {
  return {
    state: 'present',
    type: 'file',
    pathMatches: true,
    resourceIdMatches: true,
    isPublic: false,
    publicUrlMatches: true,
    httpStatus: 200,
    errorClass: '',
    ...overrides
  };
}

function observation(overrides = {}) {
  const base = {
    schema: ledger.OBSERVATION_SCHEMA,
    generatedAt: '2026-09-20T11:00:00.000Z',
    evidenceClass: 'live-provider-observation-only',
    testedSourceSha: 'a'.repeat(40),
    subject: { rpf: digest('1'), yandexQcf: digest('2') },
    kind: ledger.KIND,
    phase: 'prepared',
    manualResolutionSourcePhase: '',
    effectivePhase: 'prepared',
    identityDigests: {
      operationId: digest('3'),
      accountUid: digest('4'),
      rootPath: digest('5'),
      sourcePath: digest('6'),
      targetPath: digest('7'),
      resourceId: digest('8'),
      publicUrl: digest('9'),
      currentRootPath: digest('a')
    },
    context: {
      accountState: 'present',
      accountMatches: true,
      rootMatches: true,
      sameSourceTargetPath: false
    },
    source: safeResource({ isPublic: true }),
    target: safeResource({
      state: 'missing',
      type: '',
      pathMatches: false,
      resourceIdMatches: false,
      isPublic: false,
      publicUrlMatches: false,
      httpStatus: 0
    }),
    classification: {
      state: 'pre-admission-ready',
      safeNextAction: 'return-to-webclip-for-admission',
      terminal: true
    },
    watch: {
      requestedSeconds: 0,
      elapsedMs: 5,
      attempts: [{ attempt: 1, elapsedMs: 5, state: 'pre-admission-ready' }]
    },
    limitations: observerLimitations
  };
  return {
    ...base,
    ...overrides,
    subject: { ...base.subject, ...(overrides.subject || {}) },
    identityDigests: { ...base.identityDigests, ...(overrides.identityDigests || {}) },
    context: { ...base.context, ...(overrides.context || {}) },
    source: { ...base.source, ...(overrides.source || {}) },
    target: { ...base.target, ...(overrides.target || {}) },
    classification: { ...base.classification, ...(overrides.classification || {}) },
    watch: {
      ...base.watch,
      ...(overrides.watch || {}),
      attempts: overrides.watch?.attempts || base.watch.attempts
    },
    limitations: overrides.limitations || base.limitations
  };
}

const prepared = observation();
const normalized = ledger.validateObservation(prepared);
eq(normalized.schema, ledger.OBSERVATION_SCHEMA, 'observer schema retained');
eq(normalized.identityDigests.operationId, digest('3'), 'hashed operation identity retained');
eq(normalized.identityDigests.currentRootPath, digest('a'), 'current root digest retained');
ok(!Object.prototype.hasOwnProperty.call(normalized, 'generatedAtMs'), 'no internal field leaks into portable observation');
eq(ledger.digestObject(prepared), ledger.digestObject(JSON.parse(JSON.stringify(prepared))), 'canonical digest stable across JSON round trip');

const subject = ledger.sessionSubject(prepared);
ok(!Object.prototype.hasOwnProperty.call(subject.receiptIdentityDigests, 'currentRootPath'), 'current root excluded from immutable receipt subject');
eq(subject.receiptIdentityDigests.accountUid, digest('4'), 'receipt account digest stays in immutable subject');

const header = ledger.makeHeader(prepared, {
  sessionId: 'session-fixture-0001',
  createdAt: '2026-09-20T11:00:01.000Z'
});
eq(header.evidenceClass, 'local-observation-chain-only', 'session evidence class is local chain only');
ok(header.limitations.includes('does-not-authenticate-observer-origin'), 'origin authentication is not overclaimed');
ok(header.limitations.includes('does-not-detect-consistent-rewrite-without-external-final-digest'), 'consistent rewrite limit is explicit');
ok(header.limitations.includes('does-not-detect-tail-truncation-without-external-final-digest'), 'tail truncation limit is explicit');
ok(header.limitations.includes('operator-labels-are-non-evidentiary'), 'operator labels are explicitly non-evidentiary');

const first = ledger.makeEntry(header, null, prepared, 'baseline', {
  recordedAt: '2026-09-20T11:00:02.000Z'
});
eq(first.sequence, 1, 'first checkpoint sequence');
eq(first.predecessorDigest, ledger.digestObject(header), 'first checkpoint binds header');
eq(first.observationDigest, ledger.digestObject(prepared), 'first checkpoint binds exact sanitized observation');
eq(first.operatorLabelEvidence, false, 'operator label has no evidence authority');

const revoke = observation({
  generatedAt: '2026-09-20T11:00:10.000Z',
  phase: 'revoke-admitted-unknown',
  effectivePhase: 'revoke-admitted-unknown',
  source: { isPublic: false },
  classification: {
    state: 'revoke-settled-private',
    safeNextAction: 'continue-from-revoke-verified',
    terminal: true
  },
  watch: {
    requestedSeconds: 5,
    elapsedMs: 1100,
    attempts: [
      { attempt: 1, elapsedMs: 10, state: 'revoke-not-observed' },
      { attempt: 2, elapsedMs: 1100, state: 'revoke-settled-private' }
    ]
  }
});
const second = ledger.makeEntry(header, first, revoke, 'revoke-settlement-check', {
  recordedAt: '2026-09-20T11:00:11.000Z'
});
eq(second.sequence, 2, 'second checkpoint sequence');
eq(second.predecessorDigest, ledger.digestObject(first), 'second checkpoint binds previous entry');

const windowExpired = observation({
  generatedAt: '2026-09-20T11:00:12.000Z',
  phase: 'revoke-admitted-unknown',
  effectivePhase: 'revoke-admitted-unknown',
  classification: {
    state: 'observation-window-expired',
    safeNextAction: 'observe-only-never-repeat-unpublish',
    terminal: true
  },
  watch: {
    requestedSeconds: 5,
    elapsedMs: 5000,
    attempts: [{ attempt: 1, elapsedMs: 10, state: 'revoke-not-observed' }]
  }
});
eq(ledger.validateObservation(windowExpired).classification.state, 'observation-window-expired', 'bounded watch expiry is a valid observer terminal wrapper');
throwsCode(
  () => ledger.validateObservation({
    ...windowExpired,
    watch: { ...windowExpired.watch, requestedSeconds: 0 }
  }),
  'SESSION_WINDOW_EXPIRY_WITHOUT_WATCH',
  'window-expired cannot be fabricated without a watch interval'
);
throwsCode(
  () => ledger.validateObservation({
    ...windowExpired,
    watch: { ...windowExpired.watch, elapsedMs: 4999 }
  }),
  'SESSION_WINDOW_EXPIRY_TOO_EARLY',
  'window-expired cannot predate its requested watch boundary'
);
throwsCode(
  () => ledger.validateObservation({
    ...windowExpired,
    watch: {
      ...windowExpired.watch,
      attempts: [{ attempt: 1, elapsedMs: 10, state: 'rate-limited' }]
    }
  }),
  'SESSION_FINAL_ATTEMPT_CLASSIFICATION_MISMATCH',
  'final attempt must match the underlying pure classification'
);

const rootSwitch = observation({
  generatedAt: '2026-09-20T11:00:20.000Z',
  phase: 'revoke-admitted-unknown',
  effectivePhase: 'revoke-admitted-unknown',
  identityDigests: { currentRootPath: digest('b') },
  context: { rootMatches: false },
  classification: {
    state: 'root-conflict',
    safeNextAction: 'stop-no-retry',
    terminal: true
  },
  watch: {
    requestedSeconds: 0,
    elapsedMs: 6,
    attempts: [{ attempt: 1, elapsedMs: 6, state: 'root-conflict' }]
  }
});
const third = ledger.makeEntry(header, second, rootSwitch, 'root-switch-check', {
  recordedAt: '2026-09-20T11:00:21.000Z'
});
eq(third.sequence, 3, 'same receipt subject accepts current-root change');
eq(third.observation.identityDigests.currentRootPath, digest('b'), 'root-switch checkpoint preserves changed current-root digest');

throwsCode(
  () => ledger.makeEntry(header, second, observation({ identityDigests: { accountUid: digest('c') } }), 'other'),
  'SESSION_SUBJECT_MISMATCH',
  'receipt account digest cannot retarget within session'
);
throwsCode(
  () => ledger.makeEntry(header, second, prepared, 'other'),
  'SESSION_OBSERVATION_TIME_REGRESSION',
  'older observation cannot append'
);
throwsCode(
  () => ledger.makeEntry(header, second, observation({
    generatedAt: '2026-09-20T11:00:30.000Z',
    phase: 'prepared',
    effectivePhase: 'prepared'
  }), 'other'),
  'SESSION_PHASE_REGRESSION',
  'effective phase cannot regress'
);
throwsCode(
  () => ledger.makeEntry(header, first, prepared, 'other', { recordedAt: '2026-09-20T11:00:03.000Z' }),
  'SESSION_DUPLICATE_OBSERVATION',
  'same sanitized observation cannot append twice'
);
throwsCode(
  () => ledger.validateObservation({
    ...prepared,
    classification: { ...prepared.classification, state: 'terminal-confirmed', safeNextAction: 'local-finalize-only' }
  }),
  'SESSION_CLASSIFICATION_MISMATCH',
  'classification must match the pure observer classifier'
);
throwsCode(
  () => ledger.validateObservation({ ...prepared, accessToken: 'secret' }),
  'SESSION_SENSITIVE_FIELD_FORBIDDEN',
  'credential-shaped top-level field is rejected before persistence'
);
throwsCode(
  () => ledger.validateObservation({ ...prepared, context: { ...prepared.context, authorization: 'secret' } }),
  'SESSION_SENSITIVE_FIELD_FORBIDDEN',
  'credential-shaped nested field is rejected'
);
throwsCode(
  () => ledger.validateObservation({ ...prepared, identityDigests: { ...prepared.identityDigests, sourcePath: '/raw/path' } }),
  'SESSION_IDENTITY_DIGEST_INVALID',
  'raw path cannot occupy a digest slot'
);
throwsCode(
  () => ledger.validateObservation({ ...prepared, limitations: observerLimitations.slice(1) }),
  'SESSION_OBSERVER_LIMITATIONS_INVALID',
  'observer limitation removal is rejected'
);
throwsCode(
  () => ledger.makeEntry(header, null, prepared, 'operator-says-pass'),
  'SESSION_LABEL_INVALID',
  'unbounded operator claim cannot become a checkpoint label'
);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'webclip-p1-164-session-'));
const sessionDir = path.join(tmp, 'session');
try {
  const initialized = ledger.initSession(sessionDir, prepared, 'baseline', {
    sessionId: 'session-fixture-0002',
    createdAt: '2026-09-20T11:01:00.000Z',
    recordedAt: '2026-09-20T11:01:01.000Z'
  });
  eq(initialized.entries.length, 1, 'filesystem init writes one immutable checkpoint');
  ok(fs.existsSync(path.join(sessionDir, '000000.header.json')), 'immutable header exists');
  ok(fs.existsSync(path.join(sessionDir, '000001.checkpoint.json')), 'first checkpoint exists');

  const appended = ledger.appendSession(sessionDir, revoke, 'revoke-settlement-check', {
    recordedAt: '2026-09-20T11:01:12.000Z'
  });
  eq(appended.entries.length, 2, 'filesystem append adds checkpoint without rewriting prior');
  const firstBytes = fs.readFileSync(path.join(sessionDir, '000001.checkpoint.json'), 'utf8');

  const switched = ledger.appendSession(sessionDir, rootSwitch, 'root-switch-check', {
    recordedAt: '2026-09-20T11:01:22.000Z'
  });
  eq(switched.entries.length, 3, 'root-switch observation appends in same receipt session');
  eq(fs.readFileSync(path.join(sessionDir, '000001.checkpoint.json'), 'utf8'), firstBytes, 'older checkpoint bytes remain unchanged');

  const verified = ledger.readSession(sessionDir);
  eq(verified.entries.length, 3, 'full chain verifies');
  const summary = ledger.summarizeSession(sessionDir);
  eq(summary.schema, ledger.SUMMARY_SCHEMA, 'summary schema');
  eq(summary.evidenceClass, 'local-observation-chain-only', 'summary does not claim provider attestation');
  eq(summary.qualificationPass, false, 'ledger never emits qualification PASS');
  eq(summary.checkpointCount, 3, 'summary checkpoint count');
  deep(
    summary.checkpoints.map((item) => item.classification.state),
    ['pre-admission-ready', 'revoke-settled-private', 'root-conflict'],
    'summary exposes only sanitized observed states'
  );
  ok(summary.limitations.includes('does-not-authenticate-observer-origin'), 'summary preserves authenticity limitation');
  ok(summary.limitations.includes('does-not-detect-consistent-rewrite-without-external-final-digest'), 'summary requires external final digest for rewrite detection');
  ok(summary.limitations.includes('does-not-detect-tail-truncation-without-external-final-digest'), 'summary requires external final digest for tail-truncation detection');
  ok(!JSON.stringify(summary).includes('/raw/'), 'summary has no fixture raw path');
  ok(!JSON.stringify(summary).includes('secret'), 'summary has no fixture credential');

  fs.writeFileSync(path.join(sessionDir, 'unexpected.txt'), 'x');
  throwsCode(() => ledger.readSession(sessionDir), 'SESSION_UNEXPECTED_FILE', 'unexpected session file fails closed');
  fs.unlinkSync(path.join(sessionDir, 'unexpected.txt'));

  const entry2Path = path.join(sessionDir, '000002.checkpoint.json');
  const original2 = fs.readFileSync(entry2Path, 'utf8');
  const tampered = JSON.parse(original2);
  tampered.predecessorDigest = digest('f');
  fs.writeFileSync(entry2Path, JSON.stringify(tampered, null, 2) + '\n');
  throwsCode(() => ledger.readSession(sessionDir), 'SESSION_PREDECESSOR_DIGEST_MISMATCH', 'tampered predecessor chain is detected');
  fs.writeFileSync(entry2Path, original2);

  const restored = ledger.readSession(sessionDir);
  eq(restored.finalDigest, ledger.digestObject(restored.entries[2]), 'final digest binds final immutable checkpoint');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

throwsCode(
  () => ledger.assertResolvedOutsideRepo(ROOT, 'repo'),
  'SESSION_PATH_INSIDE_REPOSITORY',
  'repository path is forbidden for physical session artifacts'
);

const parsed = ledger.parseArgs([
  '--append',
  '--session-dir', '/tmp/session',
  '--observation', '/tmp/observation.json',
  '--label', 'visibility-delay-check'
]);
eq(parsed.mode, 'append', 'CLI append mode parsed');
eq(parsed.label, 'visibility-delay-check', 'bounded checkpoint label parsed');
throwsCode(
  () => ledger.parseArgs(['--init', '--append']),
  'SESSION_MODE_CONFLICT',
  'CLI cannot combine init and append'
);

const toolSource = fs.readFileSync(path.join(ROOT, 'project_tools', 'yandex_p1_164_observation_session.js'), 'utf8');
ok(!toolSource.includes('fetch('), 'session ledger contains no network call');
ok(!toolSource.includes('WEBCLIP_YANDEX_OAUTH_TOKEN'), 'session ledger never consumes OAuth token');
ok(toolSource.includes("fs.openSync(filename, 'wx', 0o600)"), 'checkpoint files use exclusive restrictive creation');
ok(toolSource.includes("'does-not-authenticate-observer-origin'"), 'source states local chain authenticity limitation');
ok(toolSource.includes("'does-not-detect-consistent-rewrite-without-external-final-digest'"), 'source states consistent rewrite limitation');
ok(toolSource.includes('qualificationPass: false'), 'source cannot synthesize qualification pass');

console.log(
  `P1-164 observation session ledger: PASS; checks=${checks}; network_calls=0; provider_mutations=0; oauth_credentials=0; qualification_pass=false`
);
