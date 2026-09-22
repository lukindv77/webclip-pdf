'use strict';

// P1-164 deterministic witness for passive physical-qualification matrix authority.
// Fixtures are synthetic only; no browser/provider call and no physical PASS.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const matrix = require('./p1_164_qualification_matrix.js');
const binder = require('./p1_164_qualification_evidence_binder.js');
const runtime = require('./chrome_p1_164_runtime_attestor.js');
const releaseContract = require('./release_contract_authority.js');

const ROOT = path.resolve(__dirname, '..');
let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }
function eq(actual, expected, message) { assert.equal(actual, expected, message); checks += 1; }
function deep(actual, expected, message) { assert.deepStrictEqual(actual, expected, message); checks += 1; }
function throwsCode(fn, code, message) {
  assert.throws(fn, (error) => error && error.code === code, message || code);
  checks += 1;
}
function git(...args) { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim(); }
function dg(ch) { return 'sha256:' + ch.repeat(64); }

const head = git('rev-parse', 'HEAD');
const runtimeContract = runtime.expectedRuntimeContract(head);
eq(runtimeContract.testedSourceSha, head, 'exact current source');
const releaseRefs = matrix.validateReleaseRefs();
eq(releaseRefs.schema, 'webclip-qa-contract/yandex-e2e/v1', 'current Yandex QA schema');
eq(releaseRefs.subject, 'live-yandex-provider', 'current Yandex QA subject');
eq(releaseRefs.caseCount, 4, 'current Yandex release case count');
eq(releaseRefs.refsVerified, true, 'all P1-164 matrix release refs exist');

const baseBrowser = Object.freeze({
  product: 'Chrome/153.0.0.0',
  targetType: 'service_worker',
  extensionIdDigest: dg('a')
});

function commandResults(commands, outcomes = {}) {
  return commands.map((command) => {
    const value = outcomes[command] || {
      networkOutcome: 'response',
      responseStatus: command === 'unpublish' ? 200 : 201
    };
    return {
      command,
      networkOutcome: value.networkOutcome,
      responseStatus: value.responseStatus
    };
  });
}

function makeBinding(options = {}) {
  const providerPhase = options.providerPhase || 'move-admitted-unknown';
  const effectivePhase = options.providerEffectivePhase
    || (providerPhase === 'manual-resolution'
      ? (options.manualResolutionSourcePhase || 'move-admitted-unknown')
      : providerPhase);
  const manualSource = providerPhase === 'manual-resolution'
    ? (options.manualResolutionSourcePhase || effectivePhase)
    : '';
  const requiredAdmissions = options.requiredAdmissions || (
    effectivePhase === 'prepared'
      ? []
      : (effectivePhase === 'revoke-admitted-unknown' || effectivePhase === 'revoke-verified'
        ? ['unpublish']
        : ['unpublish', 'move'])
  );
  const observedCommands = options.observedCommands || [...requiredAdmissions];
  const classification = options.classification || {
    state: effectivePhase === 'move-admitted-unknown' ? 'move-settled-private' : 'revoke-settled-private',
    safeNextAction: effectivePhase === 'move-admitted-unknown' ? 'local-finalize-only' : 'continue-from-revoke-verified',
    terminal: true
  };
  const attempts = options.attempts || [{ attempt: 1, elapsedMs: 10, state: classification.state }];
  const seq = options.sequence || 1;
  const providerSecond = 10 + seq;
  const generatedSecond = 30 + seq;
  const outcomes = options.outcomes || {};

  return {
    schema: binder.SCHEMA,
    generatedAt: '2026-09-22T11:00:' + String(generatedSecond).padStart(2, '0') + '.000Z',
    evidenceClass: binder.EVIDENCE_CLASS,
    testedSourceSha: head,
    subject: {
      rpf: runtimeContract.subject.rpf,
      yandexQcf: runtimeContract.subject.yandexQcf
    },
    kind: binder.KIND,
    contractDigest: dg('b'),
    browser: { ...baseBrowser },
    evidence: {
      runtimeAttestationGeneratedAt: '2026-09-22T11:00:00.000Z',
      commandWindowStartedAt: '2026-09-22T11:00:01.000Z',
      commandWindowEndedAt: '2026-09-22T11:00:02.000Z',
      commandObservationGeneratedAt: '2026-09-22T11:00:03.000Z',
      providerObservationGeneratedAt: '2026-09-22T11:00:' + String(providerSecond).padStart(2, '0') + '.000Z',
      receiptIdDigest: dg('c'),
      receiptUpdatedAt: 1_790_060_000_000 + (options.receiptRevisionDelta || 0),
      receiptExportedAt: '2026-09-22T11:00:04.000Z',
      sourcePathDigest: dg('d'),
      targetPathDigest: dg('e'),
      providerPhase,
      manualResolutionSourcePhase: manualSource,
      providerEffectivePhase: effectivePhase,
      providerClassification: { ...classification },
      providerWatch: {
        requestedSeconds: options.requestedSeconds || 0,
        elapsedMs: options.elapsedMs === undefined ? attempts[attempts.length - 1].elapsedMs : options.elapsedMs,
        attemptCount: attempts.length,
        attempts: attempts.map((item) => ({ ...item }))
      },
      requiredAdmissions: [...requiredAdmissions],
      observedCommands: [...observedCommands],
      commandResults: commandResults(observedCommands, outcomes),
      requiredCommandCoverageComplete: options.requiredCommandCoverageComplete === undefined
        ? (requiredAdmissions.length === observedCommands.length
          && requiredAdmissions.every((name, index) => name === observedCommands[index]))
        : options.requiredCommandCoverageComplete,
      sessionIdDigest: dg('f'),
      sessionFinalDigest: dg(String((seq % 9) + 1)),
      sessionCheckpointSequence: seq,
      sessionObservationDigest: dg(String(((seq + 1) % 9) + 1)),
      sourceReceiptPathTimeConsistencyBound: true,
      providerObservationAfterCommandWindow: true,
      privateReceiptIdentityBound: true,
      sessionCheckpointBound: true
    },
    sourceContractSatisfied: true,
    runningExtensionSourceProven: true,
    commandExecutionProven: true,
    providerStateObserved: true,
    providerMutationCausalityProven: false,
    qualificationPass: false,
    releaseAuthorized: false,
    causalityAuthority: {
      providerRecognizedCorrelationTokenPresent: false,
      browserRequestIdProviderCorrelationClaimed: false,
      identityAndTimeConsistencyOnly: true
    },
    limitations: [...binder.LIMITATIONS]
  };
}

const base = makeBinding();
const normalized = matrix.validateBinding(base);
eq(normalized.testedSourceSha, head, 'binding exact source');
eq(normalized.providerPhase, 'move-admitted-unknown', 'binding provider phase');
eq(normalized.providerWatch.attemptCount, 1, 'binding watch attempts');
deep(normalized.observedCommands, ['unpublish', 'move'], 'binding command set');
deep(
  normalized.commandResults.map((item) => [item.command, item.networkOutcome, item.responseStatus]),
  [['unpublish', 'response', 200], ['move', 'response', 201]],
  'binding retains sanitized command outcomes'
);

const success = matrix.evaluateCase('success-revoke-trash', [base]);
eq(success.caseConsistencySatisfied, true, 'normal composite success consistency');
eq(success.physicalCasePass, false, 'normal success fixture never becomes physical pass');
eq(success.qualificationPass, false, 'normal success fixture never qualifies P1-164');
eq(success.yandexQcfAdvanced, false, 'matrix never advances Yandex QCF');
eq(success.p1_231ReleaseReceiptCreated, false, 'matrix never creates P1-231 receipt');
eq(success.releaseAuthorized, false, 'matrix never authorizes release');
ok(success.releaseRefs.includes('yandex.remote-effects/unpublish'), 'success maps to release unpublish assertion');
ok(success.releaseRefs.includes('yandex.remote-effects/move'), 'success maps to release move assertion');

const unpublishUnknown = makeBinding({
  providerPhase: 'revoke-admitted-unknown',
  requiredAdmissions: ['unpublish'],
  observedCommands: ['unpublish'],
  outcomes: { unpublish: { networkOutcome: 'loading-failed', responseStatus: 0 } },
  classification: {
    state: 'revoke-settled-private',
    safeNextAction: 'continue-from-revoke-verified',
    terminal: true
  }
});
const unpublishResult = matrix.evaluateCase('unpublish-transport-unknown', [unpublishUnknown]);
eq(unpublishResult.caseConsistencySatisfied, true, 'unpublish transport unknown consistency');
eq(unpublishResult.physicalCasePass, false, 'unpublish unknown fixture never physical pass');
ok(
  unpublishResult.releaseRefs.includes('yandex.failure-settlement/retry-no-duplicate-effect'),
  'unpublish unknown maps to no-duplicate release assertion'
);

const moveUnknown = makeBinding({
  providerPhase: 'move-admitted-unknown',
  observedCommands: ['move'],
  requiredCommandCoverageComplete: false,
  outcomes: { move: { networkOutcome: 'unknown', responseStatus: 0 } },
  classification: {
    state: 'move-not-observed',
    safeNextAction: 'observe-only-never-repeat-move',
    terminal: false
  }
});
const moveUnknownResult = matrix.evaluateCase('move-transport-unknown', [moveUnknown]);
eq(moveUnknownResult.caseConsistencySatisfied, true, 'move transport unknown consistency');
eq(moveUnknownResult.physicalCasePass, false, 'move unknown fixture never physical pass');

const delayed = makeBinding({
  providerPhase: 'move-admitted-unknown',
  requestedSeconds: 30,
  elapsedMs: 1500,
  attempts: [
    { attempt: 1, elapsedMs: 20, state: 'move-not-observed' },
    { attempt: 2, elapsedMs: 1500, state: 'move-settled-private' }
  ],
  classification: {
    state: 'move-settled-private',
    safeNextAction: 'local-finalize-only',
    terminal: true
  }
});
const delayedResult = matrix.evaluateCase('target-visibility-delay', [delayed]);
eq(delayedResult.caseConsistencySatisfied, true, 'visibility delay captured by bounded attempt history');
eq(delayedResult.physicalCasePass, false, 'visibility fixture never physical pass');

const authRejected = makeBinding({
  sequence: 1,
  providerPhase: 'move-admitted-unknown',
  classification: {
    state: 'auth-rejected',
    safeNextAction: 'reauthorize-then-observe-only',
    terminal: true
  }
});
const afterReauth = makeBinding({
  sequence: 2,
  providerPhase: 'move-admitted-unknown',
  receiptRevisionDelta: 1,
  classification: {
    state: 'move-settled-private',
    safeNextAction: 'local-finalize-only',
    terminal: true
  }
});
const authResult = matrix.evaluateCase('auth-expiry-reauth', [authRejected, afterReauth]);
eq(authResult.caseConsistencySatisfied, true, 'auth rejected then same-receipt observation recovery');
ok(authResult.externalRequirements.includes('operator-reauth-resume-evidence'), 'real operator reauth evidence remains external');
eq(authResult.physicalCasePass, false, 'auth fixture never physical pass');

const accountConflict = makeBinding({
  classification: { state: 'account-conflict', safeNextAction: 'stop-no-retry', terminal: true }
});
eq(matrix.evaluateCase('account-switch', [accountConflict]).caseConsistencySatisfied, true, 'account switch conflict');

const rootConflict = makeBinding({
  classification: { state: 'root-conflict', safeNextAction: 'stop-no-retry', terminal: true }
});
eq(matrix.evaluateCase('root-switch', [rootConflict]).caseConsistencySatisfied, true, 'root switch conflict');

const sourceConflict = makeBinding({
  classification: { state: 'public-url-conflict', safeNextAction: 'manual-resolution-no-retry', terminal: true }
});
eq(
  matrix.evaluateCase('source-public-link-replacement', [sourceConflict]).caseConsistencySatisfied,
  true,
  'source/public-link replacement conflict'
);

const targetConflict = makeBinding({
  classification: { state: 'target-replaced', safeNextAction: 'manual-resolution-no-retry', terminal: true }
});
eq(
  matrix.evaluateCase('target-occupation-replacement', [targetConflict]).caseConsistencySatisfied,
  true,
  'target replacement conflict'
);

const manual = makeBinding({
  providerPhase: 'manual-resolution',
  manualResolutionSourcePhase: 'move-admitted-unknown',
  providerEffectivePhase: 'move-admitted-unknown',
  classification: {
    state: 'move-settlement-unknown',
    safeNextAction: 'observe-only-never-repeat-move',
    terminal: false
  }
});
const manualResult = matrix.evaluateCase('manual-resolution', [manual]);
eq(manualResult.caseConsistencySatisfied, true, 'manual wrapper preserves effective source phase');
ok(
  manualResult.externalRequirements.includes('real-manual-resolution-operator-evidence'),
  'real manual operator evidence stays external'
);
eq(manualResult.physicalCasePass, false, 'manual fixture never physical pass');

const badIdentity = structuredClone(afterReauth);
badIdentity.evidence.receiptIdDigest = dg('0');
throwsCode(
  () => matrix.evaluateCase('auth-expiry-reauth', [authRejected, badIdentity]),
  'MATRIX_BINDING_SUBJECT_MISMATCH',
  'cross-receipt case evidence rejected'
);

const badSequence = structuredClone(afterReauth);
badSequence.evidence.sessionCheckpointSequence = 1;
throwsCode(
  () => matrix.evaluateCase('auth-expiry-reauth', [authRejected, badSequence]),
  'MATRIX_SESSION_SEQUENCE_NOT_STRICT',
  'session checkpoint reuse rejected'
);

const badRevision = structuredClone(afterReauth);
badRevision.evidence.receiptUpdatedAt = authRejected.evidence.receiptUpdatedAt - 1;
throwsCode(
  () => matrix.evaluateCase('auth-expiry-reauth', [authRejected, badRevision]),
  'MATRIX_RECEIPT_REVISION_REGRESSION',
  'receipt revision regression rejected'
);

const badOutcome = structuredClone(base);
badOutcome.evidence.commandResults[1].networkOutcome = 'loading-failed';
badOutcome.evidence.commandResults[1].responseStatus = 201;
throwsCode(() => matrix.validateBinding(badOutcome), 'MATRIX_COMMAND_RESULT_INVALID', 'failed network cannot carry HTTP response status');

const badManual = structuredClone(manual);
badManual.evidence.manualResolutionSourcePhase = 'revoke-admitted-unknown';
throwsCode(() => matrix.validateBinding(badManual), 'MATRIX_MANUAL_PHASE_LINEAGE_INVALID', 'manual phase lineage mismatch rejected');

const missingSuccess = makeBinding({
  outcomes: { move: { networkOutcome: 'loading-failed', responseStatus: 0 } }
});
const missingSuccessResult = matrix.evaluateCase('success-revoke-trash', [missingSuccess]);
eq(missingSuccessResult.caseConsistencySatisfied, false, 'normal success case requires terminal 2xx command responses');
eq(missingSuccessResult.physicalCasePass, false, 'incomplete consistency remains non-pass');

const authority = structuredClone(releaseContract.readCanonicalManifest());
const remoteCase = authority.projections['yandex-e2e'].cases.find((item) => item.id === 'yandex.remote-effects');
remoteCase.assertions = remoteCase.assertions.filter((item) => item !== 'unpublish');
throwsCode(() => matrix.validateReleaseRefs(authority), 'MATRIX_RELEASE_REFERENCE_INVALID', 'release-contract mapping drift fails closed');

for (const id of Object.keys(matrix.CASES)) {
  ok(/^[a-z0-9-]+$/.test(id), 'case id bounded: ' + id);
  ok(matrix.CASES[id].releaseRefs.length >= 1, 'case has current release projection refs: ' + id);
}
eq(Object.keys(matrix.CASES).length, 10, 'matrix has ten bounded P1-164 cases');

for (const limitation of matrix.LIMITATIONS) {
  ok(success.limitations.includes(limitation), 'matrix limitation retained: ' + limitation);
}
eq(success.evidenceOriginAuthenticated, false, 'binder file origin is not authenticated as live');
eq(success.providerMutationCausalityProven, false, 'matrix never claims provider causality');

const parsed = matrix.parseArgs([
  '--case', 'move-transport-unknown',
  '--binding', '/tmp/a.json',
  '--binding', '/tmp/b.json'
]);
eq(parsed.caseId, 'move-transport-unknown', 'CLI case parsed');
deep(parsed.bindings, ['/tmp/a.json', '/tmp/b.json'], 'CLI binding paths parsed');
throwsCode(() => matrix.parseArgs(['--unknown']), 'MATRIX_ARGUMENT_INVALID', 'unknown CLI arg rejected');
throwsCode(() => matrix.evaluateCase('not-a-case', [base]), 'MATRIX_CASE_UNKNOWN', 'unknown case rejected');

const toolSource = fs.readFileSync(path.join(ROOT, 'project_tools', 'p1_164_qualification_matrix.js'), 'utf8');
ok(!toolSource.includes('WEBCLIP_YANDEX_OAUTH_TOKEN'), 'matrix consumes no OAuth token');
ok(!toolSource.includes('cloud-api.yandex.net'), 'matrix constructs no Yandex provider endpoint');
ok(!toolSource.includes('fetch('), 'matrix performs no network request');
ok(toolSource.includes('physicalCasePass: false'), 'matrix cannot synthesize physical PASS');
ok(toolSource.includes('qualificationPass: false'), 'matrix cannot synthesize P1-164 PASS');
ok(toolSource.includes('p1_231ReleaseReceiptCreated: false'), 'matrix cannot synthesize P1-231 receipt');
ok(toolSource.includes('releaseAuthorized: false'), 'matrix cannot authorize release');
ok(toolSource.includes('P1-164'), 'deterministic test/tool remains explicitly owned by P1-164');

console.log(
  'P1-164 passive physical qualification matrix: PASS; checks=' + checks
  + '; cases=' + Object.keys(matrix.CASES).length
  + '; synthetic_only=true'
  + '; browser_calls=0'
  + '; provider_calls=0'
  + '; provider_mutations=0'
  + '; physical_case_pass=false'
  + '; qualification_pass=false'
  + '; release_authorized=false'
);
