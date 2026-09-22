'use strict';

// P1-164 passive physical-qualification matrix authority.
// It validates sanitized binder v2 outputs against explicit case patterns.
// It performs no browser/provider call and cannot promote structural consistency
// to physical qualification, provider causality, Yandex QCF evidence, or release.

const binder = require('./p1_164_qualification_evidence_binder.js');
const releaseContract = require('./release_contract_authority.js');

const SCHEMA = 'webclip-p1-164-qualification-matrix-evaluation/v1';
const EVIDENCE_CLASS = 'passive-physical-matrix-consistency-evaluation';
const KIND = 'publication-revoke-trash';
const NETWORK_OUTCOMES = new Set(['unknown', 'response', 'loading-failed']);
const COMMANDS = Object.freeze(['unpublish', 'move']);
const PROVIDER_PHASES = new Set([
  'prepared',
  'revoke-admitted-unknown',
  'revoke-verified',
  'move-admitted-unknown',
  'remote-verified',
  'manual-resolution'
]);
const EFFECTIVE_PHASES = new Set([
  'prepared',
  'revoke-admitted-unknown',
  'revoke-verified',
  'move-admitted-unknown',
  'remote-verified'
]);

const LIMITATIONS = Object.freeze([
  'binder-json-origin-is-not-authenticated-as-live-physical-evidence',
  'private-receipt-export-origin-is-not-cryptographically-authenticated',
  'browser-cdp-request-id-is-not-provider-recognized-correlation',
  'case-consistency-does-not-prove-provider-mutation-causality',
  'manual-operator-action-is-not-observed-by-this-tool',
  'does-not-close-p1-164',
  'does-not-advance-yandex-qcf',
  'does-not-create-p1-231-release-evidence-receipt',
  'does-not-claim-physical-qualification-pass',
  'does-not-authorize-release'
]);

const CASES = Object.freeze({
  'success-revoke-trash': Object.freeze({
    releaseRefs: Object.freeze([
      'yandex.remote-effects/unpublish',
      'yandex.remote-effects/move',
      'yandex.remote-effects/exact-object-reconciliation',
      'yandex.failure-settlement/reconciliation'
    ]),
    externalRequirements: Object.freeze(['authenticated-live-evidence-origin'])
  }),
  'unpublish-transport-unknown': Object.freeze({
    releaseRefs: Object.freeze([
      'yandex.remote-effects/unpublish',
      'yandex.remote-effects/exact-object-reconciliation',
      'yandex.failure-settlement/started-unknown',
      'yandex.failure-settlement/transport-failure',
      'yandex.failure-settlement/retry-no-duplicate-effect',
      'yandex.failure-settlement/reconciliation'
    ]),
    externalRequirements: Object.freeze(['authenticated-live-evidence-origin'])
  }),
  'move-transport-unknown': Object.freeze({
    releaseRefs: Object.freeze([
      'yandex.remote-effects/move',
      'yandex.remote-effects/exact-object-reconciliation',
      'yandex.failure-settlement/started-unknown',
      'yandex.failure-settlement/transport-failure',
      'yandex.failure-settlement/retry-no-duplicate-effect',
      'yandex.failure-settlement/reconciliation'
    ]),
    externalRequirements: Object.freeze(['authenticated-live-evidence-origin'])
  }),
  'target-visibility-delay': Object.freeze({
    releaseRefs: Object.freeze([
      'yandex.remote-effects/exact-object-reconciliation',
      'yandex.failure-settlement/timeout',
      'yandex.failure-settlement/retry-no-duplicate-effect',
      'yandex.failure-settlement/reconciliation'
    ]),
    externalRequirements: Object.freeze(['authenticated-live-evidence-origin'])
  }),
  'auth-expiry-reauth': Object.freeze({
    releaseRefs: Object.freeze([
      'yandex.oauth-context/real-oauth',
      'yandex.oauth-context/manual-resume-after-reauth',
      'yandex.oauth-context/reauth-fencing',
      'yandex.failure-settlement/auth-expiry',
      'yandex.failure-settlement/reconciliation'
    ]),
    externalRequirements: Object.freeze([
      'authenticated-live-evidence-origin',
      'operator-reauth-resume-evidence'
    ])
  }),
  'account-switch': Object.freeze({
    releaseRefs: Object.freeze([
      'yandex.oauth-context/account-identity',
      'yandex.oauth-context/account-switch-fails-stale-context',
      'yandex.failure-settlement/account-root-switching'
    ]),
    externalRequirements: Object.freeze(['authenticated-live-evidence-origin'])
  }),
  'root-switch': Object.freeze({
    releaseRefs: Object.freeze([
      'yandex.oauth-context/root-identity',
      'yandex.oauth-context/root-switch-fails-stale-context',
      'yandex.failure-settlement/account-root-switching'
    ]),
    externalRequirements: Object.freeze(['authenticated-live-evidence-origin'])
  }),
  'source-public-link-replacement': Object.freeze({
    releaseRefs: Object.freeze([
      'yandex.remote-effects/exact-object-reconciliation',
      'yandex.failure-settlement/reconciliation',
      'yandex.failure-settlement/retry-no-duplicate-effect'
    ]),
    externalRequirements: Object.freeze(['authenticated-live-evidence-origin'])
  }),
  'target-occupation-replacement': Object.freeze({
    releaseRefs: Object.freeze([
      'yandex.remote-effects/exact-object-reconciliation',
      'yandex.failure-settlement/reconciliation',
      'yandex.failure-settlement/retry-no-duplicate-effect'
    ]),
    externalRequirements: Object.freeze(['authenticated-live-evidence-origin'])
  }),
  'manual-resolution': Object.freeze({
    releaseRefs: Object.freeze([
      'yandex.failure-settlement/started-unknown',
      'yandex.failure-settlement/retry-no-duplicate-effect',
      'yandex.failure-settlement/reconciliation'
    ]),
    externalRequirements: Object.freeze([
      'authenticated-live-evidence-origin',
      'real-manual-resolution-operator-evidence'
    ])
  })
});

function fail(code, detail) {
  const error = new Error(String(detail || code).slice(0, 240));
  error.code = code;
  throw error;
}
function exactKeys(value, expected, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((item, index) => item !== wanted[index])) fail(code);
}
function digest(value, code) {
  const text = String(value || '');
  if (!/^sha256:[0-9a-f]{64}$/.test(text)) fail(code);
  return text;
}
function sha(value, code) {
  const text = String(value || '');
  if (!/^[0-9a-f]{40}$/.test(text)) fail(code);
  return text;
}
function iso(value, code) {
  const text = String(value || '');
  const ms = Date.parse(text);
  if (!Number.isFinite(ms) || ms <= 0) fail(code);
  return Object.freeze({ text: new Date(ms).toISOString(), ms });
}
function token(value, code) {
  const text = String(value || '');
  if (!/^[a-z0-9][a-z0-9-]{0,95}$/.test(text)) fail(code);
  return text;
}
function sameJson(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

function validateReleaseRefs(authorityValue = releaseContract.readCanonicalManifest()) {
  const authority = releaseContract.validateAuthority(authorityValue);
  const projection = authority.projections['yandex-e2e'];
  const caseMap = new Map(projection.cases.map((item) => [item.id, new Set(item.assertions)]));
  for (const [caseId, spec] of Object.entries(CASES)) {
    for (const ref of spec.releaseRefs) {
      const slash = ref.indexOf('/');
      const releaseCase = ref.slice(0, slash);
      const assertion = ref.slice(slash + 1);
      if (!caseMap.has(releaseCase) || !caseMap.get(releaseCase).has(assertion)) {
        fail('MATRIX_RELEASE_REFERENCE_INVALID', caseId + ':' + ref);
      }
    }
  }
  return Object.freeze({
    schema: projection.schema,
    subject: projection.subject,
    caseCount: projection.cases.length,
    refsVerified: true
  });
}

function validateBinding(value) {
  exactKeys(value, [
    'schema', 'generatedAt', 'evidenceClass', 'testedSourceSha', 'subject', 'kind',
    'contractDigest', 'browser', 'evidence', 'sourceContractSatisfied',
    'runningExtensionSourceProven', 'commandExecutionProven', 'providerStateObserved',
    'providerMutationCausalityProven', 'qualificationPass', 'releaseAuthorized',
    'causalityAuthority', 'limitations'
  ], 'MATRIX_BINDING_SHAPE_INVALID');
  if (value.schema !== binder.SCHEMA) fail('MATRIX_BINDING_SCHEMA_INVALID');
  if (value.evidenceClass !== binder.EVIDENCE_CLASS) fail('MATRIX_BINDING_EVIDENCE_CLASS_INVALID');
  if (value.kind !== KIND) fail('MATRIX_BINDING_KIND_INVALID');
  const testedSourceSha = sha(value.testedSourceSha, 'MATRIX_BINDING_SOURCE_SHA_INVALID');

  exactKeys(value.subject, ['rpf', 'yandexQcf'], 'MATRIX_BINDING_SUBJECT_INVALID');
  const subject = Object.freeze({
    rpf: digest(value.subject.rpf, 'MATRIX_BINDING_RPF_INVALID'),
    yandexQcf: digest(value.subject.yandexQcf, 'MATRIX_BINDING_QCF_INVALID')
  });
  const contractDigest = digest(value.contractDigest, 'MATRIX_BINDING_CONTRACT_DIGEST_INVALID');

  exactKeys(value.browser, ['product', 'targetType', 'extensionIdDigest'], 'MATRIX_BINDING_BROWSER_INVALID');
  if (value.browser.targetType !== 'service_worker') fail('MATRIX_BINDING_BROWSER_INVALID');
  const browser = Object.freeze({
    product: String(value.browser.product || ''),
    targetType: 'service_worker',
    extensionIdDigest: digest(value.browser.extensionIdDigest, 'MATRIX_BINDING_BROWSER_DIGEST_INVALID')
  });

  if (
    value.sourceContractSatisfied !== true
    || value.runningExtensionSourceProven !== true
    || value.commandExecutionProven !== true
    || value.providerStateObserved !== true
    || value.providerMutationCausalityProven !== false
    || value.qualificationPass !== false
    || value.releaseAuthorized !== false
  ) fail('MATRIX_BINDING_ASSERTION_BOUNDARY_INVALID');

  exactKeys(value.causalityAuthority, [
    'providerRecognizedCorrelationTokenPresent',
    'browserRequestIdProviderCorrelationClaimed',
    'identityAndTimeConsistencyOnly'
  ], 'MATRIX_BINDING_CAUSALITY_INVALID');
  if (
    value.causalityAuthority.providerRecognizedCorrelationTokenPresent !== false
    || value.causalityAuthority.browserRequestIdProviderCorrelationClaimed !== false
    || value.causalityAuthority.identityAndTimeConsistencyOnly !== true
  ) fail('MATRIX_BINDING_CAUSALITY_INVALID');

  if (
    !Array.isArray(value.limitations)
    || value.limitations.length !== binder.LIMITATIONS.length
    || binder.LIMITATIONS.some((item) => !value.limitations.includes(item))
  ) fail('MATRIX_BINDING_LIMITATIONS_INVALID');

  const e = value.evidence;
  exactKeys(e, [
    'runtimeAttestationGeneratedAt', 'commandWindowStartedAt', 'commandWindowEndedAt',
    'commandObservationGeneratedAt', 'providerObservationGeneratedAt', 'receiptIdDigest',
    'receiptUpdatedAt', 'receiptExportedAt', 'sourcePathDigest', 'targetPathDigest',
    'providerPhase', 'manualResolutionSourcePhase', 'providerEffectivePhase',
    'providerClassification', 'providerWatch', 'requiredAdmissions', 'observedCommands',
    'commandResults', 'requiredCommandCoverageComplete', 'sessionIdDigest',
    'sessionFinalDigest', 'sessionCheckpointSequence', 'sessionObservationDigest',
    'sourceReceiptPathTimeConsistencyBound', 'providerObservationAfterCommandWindow',
    'privateReceiptIdentityBound', 'sessionCheckpointBound'
  ], 'MATRIX_BINDING_EVIDENCE_SHAPE_INVALID');

  const generatedAt = iso(value.generatedAt, 'MATRIX_BINDING_GENERATED_AT_INVALID');
  const commandWindowStartedAt = iso(e.commandWindowStartedAt, 'MATRIX_COMMAND_WINDOW_START_INVALID');
  const commandWindowEndedAt = iso(e.commandWindowEndedAt, 'MATRIX_COMMAND_WINDOW_END_INVALID');
  const commandObservationGeneratedAt = iso(e.commandObservationGeneratedAt, 'MATRIX_COMMAND_TIME_INVALID');
  const providerObservationGeneratedAt = iso(e.providerObservationGeneratedAt, 'MATRIX_PROVIDER_TIME_INVALID');
  if (
    commandWindowEndedAt.ms < commandWindowStartedAt.ms
    || commandObservationGeneratedAt.ms < commandWindowEndedAt.ms
    || providerObservationGeneratedAt.ms < commandWindowEndedAt.ms
    || generatedAt.ms < providerObservationGeneratedAt.ms
  ) fail('MATRIX_BINDING_TIME_ORDER_INVALID');

  const providerPhase = token(e.providerPhase, 'MATRIX_PROVIDER_PHASE_INVALID');
  const manualResolutionSourcePhase = String(e.manualResolutionSourcePhase || '');
  const providerEffectivePhase = token(e.providerEffectivePhase, 'MATRIX_PROVIDER_EFFECTIVE_PHASE_INVALID');
  if (!PROVIDER_PHASES.has(providerPhase) || !EFFECTIVE_PHASES.has(providerEffectivePhase)) {
    fail('MATRIX_PROVIDER_PHASE_INVALID');
  }
  if (providerPhase === 'manual-resolution') {
    if (manualResolutionSourcePhase !== providerEffectivePhase) fail('MATRIX_MANUAL_PHASE_LINEAGE_INVALID');
  } else if (manualResolutionSourcePhase !== '' || providerPhase !== providerEffectivePhase) {
    fail('MATRIX_PROVIDER_PHASE_LINEAGE_INVALID');
  }

  exactKeys(e.providerClassification, ['state', 'safeNextAction', 'terminal'], 'MATRIX_CLASSIFICATION_INVALID');
  const providerClassification = Object.freeze({
    state: token(e.providerClassification.state, 'MATRIX_CLASSIFICATION_INVALID'),
    safeNextAction: token(e.providerClassification.safeNextAction, 'MATRIX_CLASSIFICATION_INVALID'),
    terminal: e.providerClassification.terminal === true
  });
  if (typeof e.providerClassification.terminal !== 'boolean') fail('MATRIX_CLASSIFICATION_INVALID');

  exactKeys(e.providerWatch, ['requestedSeconds', 'elapsedMs', 'attemptCount', 'attempts'], 'MATRIX_WATCH_INVALID');
  const requestedSeconds = Number(e.providerWatch.requestedSeconds);
  const elapsedMs = Number(e.providerWatch.elapsedMs);
  const attemptCount = Number(e.providerWatch.attemptCount);
  if (
    !Number.isSafeInteger(requestedSeconds) || requestedSeconds < 0 || requestedSeconds > 120
    || !Number.isSafeInteger(elapsedMs) || elapsedMs < 0 || elapsedMs > 10 * 60 * 1000
    || !Number.isSafeInteger(attemptCount) || attemptCount < 1 || attemptCount > 256
    || !Array.isArray(e.providerWatch.attempts) || e.providerWatch.attempts.length !== attemptCount
  ) fail('MATRIX_WATCH_INVALID');
  let priorElapsed = -1;
  const attempts = e.providerWatch.attempts.map((item, index) => {
    exactKeys(item, ['attempt', 'elapsedMs', 'state'], 'MATRIX_WATCH_ATTEMPT_INVALID');
    const attempt = Number(item.attempt);
    const attemptElapsed = Number(item.elapsedMs);
    const state = token(item.state, 'MATRIX_WATCH_ATTEMPT_INVALID');
    if (
      attempt !== index + 1
      || !Number.isSafeInteger(attemptElapsed)
      || attemptElapsed < priorElapsed
      || attemptElapsed > elapsedMs
    ) fail('MATRIX_WATCH_ATTEMPT_INVALID');
    priorElapsed = attemptElapsed;
    return Object.freeze({ attempt, elapsedMs: attemptElapsed, state });
  });

  if (!Array.isArray(e.requiredAdmissions) || !Array.isArray(e.observedCommands) || !Array.isArray(e.commandResults)) {
    fail('MATRIX_COMMAND_ARRAY_INVALID');
  }
  const requiredAdmissions = e.requiredAdmissions.map((name) => {
    const command = String(name || '');
    if (!COMMANDS.includes(command)) fail('MATRIX_REQUIRED_COMMAND_INVALID');
    return command;
  });
  const observedCommands = e.observedCommands.map((name) => {
    const command = String(name || '');
    if (!COMMANDS.includes(command)) fail('MATRIX_OBSERVED_COMMAND_INVALID');
    return command;
  });
  if (new Set(requiredAdmissions).size !== requiredAdmissions.length || new Set(observedCommands).size !== observedCommands.length) {
    fail('MATRIX_COMMAND_DUPLICATE');
  }
  if (e.commandResults.length !== observedCommands.length) fail('MATRIX_COMMAND_RESULT_COUNT_INVALID');
  const commandResults = e.commandResults.map((item, index) => {
    exactKeys(item, ['command', 'networkOutcome', 'responseStatus'], 'MATRIX_COMMAND_RESULT_INVALID');
    const command = String(item.command || '');
    const networkOutcome = String(item.networkOutcome || '');
    const responseStatus = Number(item.responseStatus);
    if (
      command !== observedCommands[index]
      || !NETWORK_OUTCOMES.has(networkOutcome)
      || !Number.isSafeInteger(responseStatus)
      || responseStatus < 0 || responseStatus > 599
      || (networkOutcome === 'response' && responseStatus < 100)
      || (networkOutcome !== 'response' && responseStatus !== 0)
    ) fail('MATRIX_COMMAND_RESULT_INVALID');
    return Object.freeze({ command, networkOutcome, responseStatus });
  });

  if (
    typeof e.requiredCommandCoverageComplete !== 'boolean'
    || e.sourceReceiptPathTimeConsistencyBound !== true
    || e.providerObservationAfterCommandWindow !== true
    || e.privateReceiptIdentityBound !== true
    || e.sessionCheckpointBound !== true
  ) fail('MATRIX_BINDING_EVIDENCE_BOUNDARY_INVALID');

  const receiptUpdatedAt = Number(e.receiptUpdatedAt);
  const sessionCheckpointSequence = Number(e.sessionCheckpointSequence);
  if (!Number.isSafeInteger(receiptUpdatedAt) || receiptUpdatedAt <= 0) fail('MATRIX_RECEIPT_REVISION_INVALID');
  if (!Number.isSafeInteger(sessionCheckpointSequence) || sessionCheckpointSequence < 1) {
    fail('MATRIX_SESSION_SEQUENCE_INVALID');
  }

  return Object.freeze({
    raw: value,
    testedSourceSha,
    subject,
    contractDigest,
    browser,
    generatedAt,
    commandWindowStartedAt,
    commandWindowEndedAt,
    providerObservationGeneratedAt,
    receiptIdDigest: digest(e.receiptIdDigest, 'MATRIX_RECEIPT_DIGEST_INVALID'),
    receiptUpdatedAt,
    sourcePathDigest: digest(e.sourcePathDigest, 'MATRIX_SOURCE_PATH_DIGEST_INVALID'),
    targetPathDigest: digest(e.targetPathDigest, 'MATRIX_TARGET_PATH_DIGEST_INVALID'),
    providerPhase,
    manualResolutionSourcePhase,
    providerEffectivePhase,
    providerClassification,
    providerWatch: Object.freeze({
      requestedSeconds,
      elapsedMs,
      attemptCount,
      attempts: Object.freeze(attempts)
    }),
    requiredAdmissions: Object.freeze(requiredAdmissions),
    observedCommands: Object.freeze(observedCommands),
    commandResults: Object.freeze(commandResults),
    requiredCommandCoverageComplete: e.requiredCommandCoverageComplete,
    sessionIdDigest: digest(e.sessionIdDigest, 'MATRIX_SESSION_ID_DIGEST_INVALID'),
    sessionFinalDigest: digest(e.sessionFinalDigest, 'MATRIX_SESSION_FINAL_DIGEST_INVALID'),
    sessionCheckpointSequence,
    sessionObservationDigest: digest(e.sessionObservationDigest, 'MATRIX_SESSION_OBSERVATION_DIGEST_INVALID')
  });
}

function normalizeBindings(values) {
  if (!Array.isArray(values) || values.length < 1 || values.length > 64) fail('MATRIX_BINDINGS_INVALID');
  const bindings = values.map(validateBinding).sort(
    (a, b) => a.providerObservationGeneratedAt.ms - b.providerObservationGeneratedAt.ms
  );
  const first = bindings[0];
  let previousTime = -1;
  let previousSequence = 0;
  let previousRevision = 0;
  for (const item of bindings) {
    if (
      item.testedSourceSha !== first.testedSourceSha
      || !sameJson(item.subject, first.subject)
      || item.contractDigest !== first.contractDigest
      || !sameJson(item.browser, first.browser)
      || item.receiptIdDigest !== first.receiptIdDigest
      || item.sourcePathDigest !== first.sourcePathDigest
      || item.targetPathDigest !== first.targetPathDigest
      || item.sessionIdDigest !== first.sessionIdDigest
    ) fail('MATRIX_BINDING_SUBJECT_MISMATCH');
    if (item.providerObservationGeneratedAt.ms <= previousTime) fail('MATRIX_PROVIDER_TIME_NOT_STRICT');
    if (item.sessionCheckpointSequence <= previousSequence) fail('MATRIX_SESSION_SEQUENCE_NOT_STRICT');
    if (item.receiptUpdatedAt < previousRevision) fail('MATRIX_RECEIPT_REVISION_REGRESSION');
    previousTime = item.providerObservationGeneratedAt.ms;
    previousSequence = item.sessionCheckpointSequence;
    previousRevision = item.receiptUpdatedAt;
  }
  return Object.freeze(bindings);
}

function result(name, satisfied, detail = '') {
  return Object.freeze({ id: name, satisfied: Boolean(satisfied), detail: String(detail || '') });
}
function commandResult(binding, command) {
  return binding.commandResults.find((item) => item.command === command) || null;
}
function response2xx(binding, command) {
  const item = commandResult(binding, command);
  return Boolean(item && item.networkOutcome === 'response' && item.responseStatus >= 200 && item.responseStatus < 300);
}
function transportUnknown(binding, command) {
  const item = commandResult(binding, command);
  return Boolean(item && (item.networkOutcome === 'unknown' || item.networkOutcome === 'loading-failed'));
}
function hasState(binding, states) {
  return states.includes(binding.providerClassification.state);
}
function hasSafeNext(binding, actions) {
  return actions.includes(binding.providerClassification.safeNextAction);
}
function hasAttemptState(binding, states) {
  return binding.providerWatch.attempts.some((item) => states.includes(item.state));
}

function evaluateRequirements(caseId, bindings) {
  const last = bindings[bindings.length - 1];
  switch (caseId) {
    case 'success-revoke-trash': {
      const success = bindings.find((item) =>
        item.requiredCommandCoverageComplete === true
        && sameJson(item.observedCommands, ['unpublish', 'move'])
        && response2xx(item, 'unpublish')
        && response2xx(item, 'move')
        && ['move-admitted-unknown', 'remote-verified'].includes(item.providerEffectivePhase)
        && hasState(item, ['move-settled-private', 'terminal-confirmed'])
      );
      return Object.freeze([
        result('complete-unpublish-move-command-coverage', Boolean(success)),
        result('both-destructive-commands-have-2xx-response', Boolean(success)),
        result('private-terminal-object-observed', Boolean(success))
      ]);
    }
    case 'unpublish-transport-unknown': {
      const observed = bindings.find((item) =>
        item.providerEffectivePhase === 'revoke-admitted-unknown'
        && item.requiredCommandCoverageComplete === true
        && sameJson(item.observedCommands, ['unpublish'])
        && transportUnknown(item, 'unpublish')
        && hasState(item, [
          'revoke-settled-private',
          'revoke-not-observed',
          'revoke-settlement-unknown',
          'observation-window-expired'
        ])
        && hasSafeNext(item, [
          'continue-from-revoke-verified',
          'local-finalize-only',
          'observe-only-never-repeat-unpublish'
        ])
      );
      return Object.freeze([
        result('unpublish-command-has-no-terminal-network-response', Boolean(observed)),
        result('provider-observation-remains-in-revoke-unknown-lineage', Boolean(observed)),
        result('safe-next-action-forbids-blind-unpublish-replay', Boolean(observed))
      ]);
    }
    case 'move-transport-unknown': {
      const observed = bindings.find((item) =>
        item.providerEffectivePhase === 'move-admitted-unknown'
        && item.observedCommands.includes('move')
        && transportUnknown(item, 'move')
        && hasState(item, [
          'move-settled-private',
          'move-not-observed',
          'move-settlement-unknown',
          'dual-location',
          'observation-window-expired'
        ])
        && hasSafeNext(item, ['local-finalize-only', 'observe-only-never-repeat-move'])
      );
      return Object.freeze([
        result('move-command-has-no-terminal-network-response', Boolean(observed)),
        result('provider-observation-remains-in-move-unknown-lineage', Boolean(observed)),
        result('safe-next-action-forbids-blind-move-replay', Boolean(observed))
      ]);
    }
    case 'target-visibility-delay': {
      const delayed = bindings.find((item) =>
        item.providerEffectivePhase === 'move-admitted-unknown'
        && item.providerWatch.requestedSeconds > 0
        && item.providerWatch.attemptCount > 1
        && hasAttemptState(item, ['move-not-observed', 'move-settlement-unknown', 'dual-location'])
        && hasState(item, ['move-settled-private', 'observation-window-expired'])
      );
      const later = delayed && (
        delayed.providerClassification.state === 'move-settled-private'
        || bindings.some((item) =>
          item.providerObservationGeneratedAt.ms > delayed.providerObservationGeneratedAt.ms
          && hasState(item, ['move-settled-private', 'terminal-confirmed'])
        )
      );
      return Object.freeze([
        result('bounded-watch-observed-pre-terminal-move-state', Boolean(delayed)),
        result('watch-used-more-than-one-provider-observation-attempt', Boolean(delayed)),
        result('same-receipt-later-reached-private-terminal-state', Boolean(later))
      ]);
    }
    case 'auth-expiry-reauth': {
      const authIndex = bindings.findIndex((item) => item.providerClassification.state === 'auth-rejected');
      const recovered = authIndex >= 0 && bindings.slice(authIndex + 1).some(
        (item) => item.providerClassification.state !== 'auth-rejected'
      );
      return Object.freeze([
        result('auth-rejected-provider-state-observed', authIndex >= 0),
        result('same-receipt-later-observable-after-reauth', recovered),
        result('operator-reauth-resume-still-external-evidence', false, 'matrix tool cannot observe real operator resume')
      ]);
    }
    case 'account-switch': {
      const conflict = bindings.find((item) =>
        item.providerClassification.state === 'account-conflict'
        && item.providerClassification.safeNextAction === 'stop-no-retry'
      );
      return Object.freeze([
        result('stale-account-context-detected', Boolean(conflict)),
        result('account-conflict-stops-without-retry', Boolean(conflict))
      ]);
    }
    case 'root-switch': {
      const conflict = bindings.find((item) =>
        item.providerClassification.state === 'root-conflict'
        && item.providerClassification.safeNextAction === 'stop-no-retry'
      );
      return Object.freeze([
        result('stale-root-context-detected', Boolean(conflict)),
        result('root-conflict-stops-without-retry', Boolean(conflict))
      ]);
    }
    case 'source-public-link-replacement': {
      const conflict = bindings.find((item) =>
        hasState(item, [
          'source-replaced',
          'public-url-conflict',
          'source-conflict',
          'source-public',
          'terminal-replaced',
          'terminal-public'
        ])
        && hasSafeNext(item, [
          'stop-no-retry',
          'manual-resolution-no-retry',
          'manual-resolution-local-only'
        ])
      );
      return Object.freeze([
        result('source-or-public-link-conflict-detected', Boolean(conflict)),
        result('conflict-does-not-authorize-destructive-retry', Boolean(conflict))
      ]);
    }
    case 'target-occupation-replacement': {
      const conflict = bindings.find((item) =>
        hasState(item, ['target-occupied', 'target-replaced', 'target-public'])
        && hasSafeNext(item, ['stop-no-retarget', 'manual-resolution-no-retarget', 'manual-resolution-no-retry'])
      );
      return Object.freeze([
        result('immutable-target-conflict-detected', Boolean(conflict)),
        result('conflict-does-not-authorize-retarget-or-retry', Boolean(conflict))
      ]);
    }
    case 'manual-resolution': {
      const manual = bindings.find((item) =>
        item.providerPhase === 'manual-resolution'
        && EFFECTIVE_PHASES.has(item.manualResolutionSourcePhase)
        && item.manualResolutionSourcePhase === item.providerEffectivePhase
      );
      return Object.freeze([
        result('manual-resolution-wrapper-phase-observed', Boolean(manual)),
        result('pre-manual-effective-phase-preserved', Boolean(manual)),
        result('real-operator-action-evidence-is-external', false, 'matrix tool cannot observe the operator UI action')
      ]);
    }
    default:
      fail('MATRIX_CASE_UNKNOWN', caseId);
  }
}

function evaluateCase(caseId, bindingValues, options = {}) {
  const id = String(caseId || '');
  const spec = CASES[id];
  if (!spec) fail('MATRIX_CASE_UNKNOWN', id);
  const release = validateReleaseRefs(options.releaseAuthority);
  const bindings = normalizeBindings(bindingValues);
  const requirements = evaluateRequirements(id, bindings);
  const structurallyCheckable = requirements.filter((item) => !item.id.includes('external'));
  const consistencySatisfied = structurallyCheckable.every((item) => item.satisfied);
  const externalRequirements = Object.freeze([...spec.externalRequirements]);

  const first = bindings[0];
  const last = bindings[bindings.length - 1];
  return Object.freeze({
    schema: SCHEMA,
    generatedAt: new Date().toISOString(),
    evidenceClass: EVIDENCE_CLASS,
    caseId: id,
    kind: KIND,
    testedSourceSha: first.testedSourceSha,
    subject: first.subject,
    contractDigest: first.contractDigest,
    browser: first.browser,
    releaseContract: release,
    releaseRefs: spec.releaseRefs,
    receiptIdDigest: first.receiptIdDigest,
    sourcePathDigest: first.sourcePathDigest,
    targetPathDigest: first.targetPathDigest,
    sessionIdDigest: first.sessionIdDigest,
    bindingCount: bindings.length,
    firstProviderObservationAt: first.providerObservationGeneratedAt.text,
    lastProviderObservationAt: last.providerObservationGeneratedAt.text,
    lastSessionCheckpointSequence: last.sessionCheckpointSequence,
    requirements,
    caseConsistencySatisfied: consistencySatisfied,
    evidenceOriginAuthenticated: false,
    providerMutationCausalityProven: false,
    physicalCasePass: false,
    qualificationPass: false,
    yandexQcfAdvanced: false,
    p1_231ReleaseReceiptCreated: false,
    releaseAuthorized: false,
    externalRequirements,
    limitations: LIMITATIONS
  });
}

function parseArgs(argv) {
  const out = { caseId: '', bindings: [], help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') { out.help = true; continue; }
    if (arg === '--case') {
      if (out.caseId) fail('MATRIX_ARGUMENT_INVALID', arg);
      out.caseId = String(argv[++index] || '');
      continue;
    }
    if (arg === '--binding') {
      out.bindings.push(String(argv[++index] || ''));
      continue;
    }
    fail('MATRIX_ARGUMENT_INVALID', arg);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      'node project_tools/p1_164_qualification_matrix.js --case <case-id> '
      + '--binding /absolute/private/binding-v2.json [--binding /absolute/private/binding-v2-2.json ...]\n'
      + 'cases: ' + Object.keys(CASES).join(', ') + '\n'
    );
    return;
  }
  if (!args.caseId || args.bindings.length < 1) fail('MATRIX_ARGUMENT_REQUIRED');
  const values = args.bindings.map((filename) => binder.readJsonOutside(filename, 'matrix binding'));
  process.stdout.write(JSON.stringify(evaluateCase(args.caseId, values), null, 2) + '\n');
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    process.stderr.write(
      String(error && error.code || 'MATRIX_FAILED') + ': '
      + String(error && error.message || 'failed').slice(0, 240) + '\n'
    );
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({
  SCHEMA,
  EVIDENCE_CLASS,
  KIND,
  CASES,
  LIMITATIONS,
  validateReleaseRefs,
  validateBinding,
  normalizeBindings,
  evaluateRequirements,
  evaluateCase,
  parseArgs
});
