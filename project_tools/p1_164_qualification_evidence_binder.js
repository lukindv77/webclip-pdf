'use strict';

// P1-164 passive cross-evidence binder.
// Joins already-produced browser/runtime, destructive-command, private-receipt,
// GET-only provider observation, observation-session and source-admission evidence.
// It performs no provider/browser call and never upgrades consistency to causality.

const fs = require('node:fs');
const path = require('node:path');
const runtime = require('./chrome_p1_164_runtime_attestor.js');
const commandObserver = require('./chrome_p1_164_command_observer.js');
const providerObserver = require('./yandex_p1_164_live_observer.js');
const ledger = require('./yandex_p1_164_observation_session.js');
const privateAdapter = require('./yandex_p1_164_private_export_adapter.js');
const admission = require('./yandex_p1_164_admission_contract.js');

const ROOT = path.resolve(__dirname, '..');
const REAL_ROOT = fs.realpathSync(ROOT);
const WORKER_PATH = path.join(ROOT, 'service-worker.js');
const SCHEMA = 'webclip-p1-164-qualification-evidence-binding/v1';
const EVIDENCE_CLASS = 'passive-cross-evidence-consistency-binding';
const KIND = 'publication-revoke-trash';
const MAX_JSON_BYTES = 1024 * 1024;
const NETWORK_OUTCOMES = new Set(['unknown', 'response', 'loading-failed']);

const LIMITATIONS = Object.freeze([
  'browser-cdp-request-id-is-local-observation-correlation-only',
  'no-provider-recognized-correlation-token-links-command-to-later-state',
  'matching-source-receipt-path-time-evidence-does-not-prove-provider-mutation-causality',
  'private-receipt-export-origin-is-not-cryptographically-authenticated',
  'local-session-hash-chain-proves-internal-consistency-not-external-authenticity',
  'does-not-close-p1-164',
  'does-not-advance-yandex-qcf',
  'does-not-claim-physical-qualification-pass',
  'does-not-authorize-release'
]);

function fail(code, detail) {
  const error = new Error(String(detail || code).slice(0, 240));
  error.code = code;
  throw error;
}

function exactKeys(value, expected, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((item, index) => item !== wanted[index])) {
    fail(code);
  }
}

function digest(value, code) {
  const text = String(value || '');
  if (!/^sha256:[0-9a-f]{64}$/.test(text)) fail(code);
  return text;
}

function sourceSha(value, code) {
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

function subject(value, code) {
  exactKeys(value, ['rpf', 'yandexQcf'], code);
  return Object.freeze({
    rpf: digest(value.rpf, code),
    yandexQcf: digest(value.yandexQcf, code)
  });
}

function sameSubject(expected, actual, code) {
  const a = subject(expected, code);
  const b = subject(actual, code);
  if (a.rpf !== b.rpf || a.yandexQcf !== b.yandexQcf) fail(code);
  return a;
}

function sameBrowser(expected, actual, code) {
  exactKeys(expected, ['product', 'targetType', 'extensionIdDigest'], code);
  exactKeys(actual, ['product', 'targetType', 'extensionIdDigest'], code);
  if (
    String(expected.product || '') !== String(actual.product || '')
    || expected.targetType !== 'service_worker'
    || actual.targetType !== 'service_worker'
    || digest(expected.extensionIdDigest, code) !== digest(actual.extensionIdDigest, code)
  ) fail(code);
  return Object.freeze({
    product: String(expected.product),
    targetType: 'service_worker',
    extensionIdDigest: String(expected.extensionIdDigest)
  });
}

function validateRuntimeAttestation(value, expectedContract) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('BINDER_RUNTIME_OBJECT_REQUIRED');
  if (value.schema !== runtime.ATTESTATION_SCHEMA) fail('BINDER_RUNTIME_SCHEMA_INVALID');
  if (value.evidenceClass !== runtime.EVIDENCE_CLASS) fail('BINDER_RUNTIME_EVIDENCE_CLASS_INVALID');
  if (sourceSha(value.testedSourceSha, 'BINDER_RUNTIME_SOURCE_SHA_INVALID') !== expectedContract.testedSourceSha) {
    fail('BINDER_RUNTIME_SOURCE_SHA_MISMATCH');
  }
  sameSubject(expectedContract.subject, value.subject, 'BINDER_RUNTIME_SUBJECT_MISMATCH');
  const generatedAt = iso(value.generatedAt, 'BINDER_RUNTIME_TIME_INVALID');
  const browser = sameBrowser(value.browser, value.browser, 'BINDER_RUNTIME_BROWSER_INVALID');
  if (
    !value.package || Number(value.package.memberCount) !== expectedContract.packageMembers.length
    || value.package.browserRpf !== expectedContract.subject.rpf
    || value.package.exactMemberDigestsMatch !== true
  ) fail('BINDER_RUNTIME_PACKAGE_INVALID');
  if (
    !value.runningWorker
    || value.runningWorker.serviceWorkerPath !== expectedContract.manifest.serviceWorkerPath
    || Number(value.runningWorker.loadedScriptCount) !== expectedContract.loadedWorkerScripts.length
    || value.runningWorker.parsedSourceDigestsMatch !== true
  ) fail('BINDER_RUNTIME_WORKER_INVALID');
  if (
    value.runningExtensionSourceProven !== true
    || value.commandExecutionProven !== false
    || value.providerMutationCausalityProven !== false
    || value.qualificationPass !== false
    || value.releaseAuthorized !== false
  ) fail('BINDER_RUNTIME_ASSERTION_BOUNDARY_INVALID');
  return Object.freeze({ value, generatedAt, browser });
}

function validateCommandObservation(value, expectedContract) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('BINDER_COMMAND_OBJECT_REQUIRED');
  if (value.schema !== commandObserver.SCHEMA) fail('BINDER_COMMAND_SCHEMA_INVALID');
  if (value.evidenceClass !== commandObserver.EVIDENCE_CLASS) fail('BINDER_COMMAND_EVIDENCE_CLASS_INVALID');
  if (value.kind !== KIND) fail('BINDER_COMMAND_KIND_INVALID');
  if (sourceSha(value.testedSourceSha, 'BINDER_COMMAND_SOURCE_SHA_INVALID') !== expectedContract.testedSourceSha) {
    fail('BINDER_COMMAND_SOURCE_SHA_MISMATCH');
  }
  sameSubject(expectedContract.subject, value.subject, 'BINDER_COMMAND_SUBJECT_MISMATCH');
  const generatedAt = iso(value.generatedAt, 'BINDER_COMMAND_GENERATED_AT_INVALID');
  const browser = sameBrowser(value.browser, value.browser, 'BINDER_COMMAND_BROWSER_INVALID');
  if (
    !value.runtime
    || Number(value.runtime.packageMemberCount) !== expectedContract.packageMembers.length
    || Number(value.runtime.loadedWorkerScriptCount) !== expectedContract.loadedWorkerScripts.length
    || value.runtime.exactMemberDigestsMatch !== true
    || value.runtime.parsedSourceDigestsMatch !== true
    || value.runtime.runningExtensionSourceProven !== true
  ) fail('BINDER_COMMAND_RUNTIME_INVALID');
  if (
    value.commandExecutionProven !== true
    || value.runningExtensionSourceProven !== true
    || value.providerStateObserved !== false
    || value.providerMutationCausalityProven !== false
    || value.qualificationPass !== false
    || value.releaseAuthorized !== false
  ) fail('BINDER_COMMAND_ASSERTION_BOUNDARY_INVALID');
  if (!value.watch || typeof value.watch !== 'object' || Array.isArray(value.watch)) fail('BINDER_COMMAND_WATCH_INVALID');
  const startedAt = iso(value.watch.startedAt, 'BINDER_COMMAND_WATCH_START_INVALID');
  const endedAt = iso(value.watch.endedAt, 'BINDER_COMMAND_WATCH_END_INVALID');
  if (endedAt.ms < startedAt.ms || generatedAt.ms < endedAt.ms) fail('BINDER_COMMAND_TIME_ORDER_INVALID');
  const expectedNames = commandObserver.requiredCommands(value.expectation);
  if (!Array.isArray(value.commands) || value.commands.length !== expectedNames.length) {
    fail('BINDER_COMMAND_SET_INVALID');
  }
  const commands = value.commands.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) fail('BINDER_COMMAND_ENTRY_INVALID');
    const name = String(item.command || '');
    if (name !== expectedNames[index] || Number(item.sequence) !== index + 1) fail('BINDER_COMMAND_SEQUENCE_INVALID');
    if (!['unpublish', 'move'].includes(name)) fail('BINDER_COMMAND_NAME_INVALID');
    if (name === 'unpublish') {
      if (item.method !== 'PUT' || item.endpoint !== '/resources/unpublish' || String(item.targetPathDigest || '') !== '') {
        fail('BINDER_UNPUBLISH_SHAPE_INVALID');
      }
    } else if (
      item.method !== 'POST'
      || item.endpoint !== '/resources/move'
      || item.overwriteFalse !== true
      || item.forceAsyncFalse !== true
    ) {
      fail('BINDER_MOVE_SHAPE_INVALID');
    }
    const responseStatus = Number(item.responseStatus);
    if (!Number.isSafeInteger(responseStatus) || responseStatus < 0 || responseStatus > 599) {
      fail('BINDER_COMMAND_RESPONSE_STATUS_INVALID');
    }
    if (!NETWORK_OUTCOMES.has(String(item.networkOutcome || ''))) fail('BINDER_COMMAND_NETWORK_OUTCOME_INVALID');
    return Object.freeze({
      sequence: index + 1,
      command: name,
      sourcePathDigest: digest(item.sourcePathDigest, 'BINDER_COMMAND_SOURCE_DIGEST_INVALID'),
      targetPathDigest: name === 'move'
        ? digest(item.targetPathDigest, 'BINDER_COMMAND_TARGET_DIGEST_INVALID')
        : '',
      networkOutcome: String(item.networkOutcome),
      responseStatus
    });
  });
  return Object.freeze({ value, generatedAt, browser, startedAt, endedAt, commands: Object.freeze(commands) });
}

function bindPrivateReceipt(privateExportValue, providerObservation) {
  const privateExport = privateAdapter.validatePrivateExport(privateExportValue);
  const observerInput = privateAdapter.buildObserverInput(
    privateExport,
    providerObservation.testedSourceSha,
    providerObservation.watch.requestedSeconds
  );
  const config = providerObserver.validateConfig(observerInput);
  const expectedAnchor = providerObserver.receiptAnchor(config);
  const expectedDigests = providerObserver.digests(config);

  if (
    config.phase !== providerObservation.phase
    || config.manualResolutionSourcePhase !== providerObservation.manualResolutionSourcePhase
    || config.effectivePhase !== providerObservation.effectivePhase
  ) fail('BINDER_PRIVATE_PHASE_MISMATCH');
  if (ledger.canonicalJson(expectedAnchor) !== ledger.canonicalJson(providerObservation.receiptAnchor)) {
    fail('BINDER_PRIVATE_RECEIPT_ANCHOR_MISMATCH');
  }
  if (ledger.canonicalJson(expectedDigests) !== ledger.canonicalJson(providerObservation.identityDigests)) {
    fail('BINDER_PRIVATE_IDENTITY_MISMATCH');
  }
  return Object.freeze({
    receiptIdDigest: expectedAnchor.receiptIdDigest,
    receiptUpdatedAt: expectedAnchor.receiptUpdatedAt,
    receiptExportedAt: expectedAnchor.exportedAt,
    identityDigests: expectedDigests,
    privateReceiptIdentityBound: true,
    privateExportOriginAuthenticated: false
  });
}

function validateSessionBinding(sessionSummary, providerObservation) {
  if (!sessionSummary || typeof sessionSummary !== 'object' || Array.isArray(sessionSummary)) {
    fail('BINDER_SESSION_SUMMARY_REQUIRED');
  }
  if (sessionSummary.schema !== ledger.SUMMARY_SCHEMA) fail('BINDER_SESSION_SCHEMA_INVALID');
  if (sessionSummary.evidenceClass !== 'local-observation-chain-only') fail('BINDER_SESSION_EVIDENCE_CLASS_INVALID');
  if (sessionSummary.qualificationPass !== false) fail('BINDER_SESSION_QUALIFICATION_INVALID');
  const expectedSubject = ledger.sessionSubject(providerObservation);
  if (ledger.canonicalJson(sessionSummary.subject) !== ledger.canonicalJson(expectedSubject)) {
    fail('BINDER_SESSION_SUBJECT_MISMATCH');
  }
  if (!Array.isArray(sessionSummary.checkpoints) || sessionSummary.checkpoints.length < 1) {
    fail('BINDER_SESSION_CHECKPOINTS_INVALID');
  }
  const observationDigest = ledger.digestObject(ledger.publicObservation(providerObservation));
  const matches = sessionSummary.checkpoints.filter((item) => item && item.observationDigest === observationDigest);
  if (matches.length !== 1) fail('BINDER_SESSION_OBSERVATION_NOT_UNIQUE');
  const checkpoint = matches[0];
  if (
    checkpoint.phase !== providerObservation.phase
    || checkpoint.effectivePhase !== providerObservation.effectivePhase
    || checkpoint.receiptIdDigest !== providerObservation.receiptAnchor.receiptIdDigest
    || Number(checkpoint.receiptUpdatedAt) !== Number(providerObservation.receiptAnchor.receiptUpdatedAt)
  ) fail('BINDER_SESSION_CHECKPOINT_MISMATCH');
  return Object.freeze({
    sessionIdDigest: digest(sessionSummary.sessionIdDigest, 'BINDER_SESSION_ID_DIGEST_INVALID'),
    finalDigest: digest(sessionSummary.finalDigest, 'BINDER_SESSION_FINAL_DIGEST_INVALID'),
    checkpointSequence: Number(checkpoint.sequence),
    observationDigest,
    sessionCheckpointBound: true,
    sessionExternallyAuthenticated: false
  });
}

function validateCommandCoverage(commands, requiredAdmissions) {
  if (!Array.isArray(requiredAdmissions)) fail('BINDER_REQUIRED_ADMISSIONS_INVALID');
  if (!commands.length) fail('BINDER_COMMAND_EMPTY');
  const ranks = new Map(requiredAdmissions.map((name, index) => [name, index]));
  let prior = -1;
  for (const item of commands) {
    const rank = ranks.get(item.command);
    if (rank === undefined) fail('BINDER_COMMAND_NOT_REQUIRED_FOR_PHASE', item.command);
    if (rank <= prior) fail('BINDER_COMMAND_REQUIRED_ORDER_INVALID');
    prior = rank;
  }
  const observed = commands.map((item) => item.command);
  return Object.freeze({
    requiredAdmissions: Object.freeze([...requiredAdmissions]),
    observedCommands: Object.freeze(observed),
    requiredCommandCoverageComplete:
      observed.length === requiredAdmissions.length
      && observed.every((name, index) => name === requiredAdmissions[index])
  });
}

function bindEvidence(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('BINDER_INPUT_REQUIRED');
  const expectedContract = input.expectedRuntimeContract;
  if (!expectedContract || expectedContract.schema !== runtime.CONTRACT_SCHEMA) fail('BINDER_RUNTIME_CONTRACT_INVALID');
  const admissionContract = input.admissionContract;
  if (!admissionContract || admissionContract.schema !== admission.CONTRACT_SCHEMA) fail('BINDER_ADMISSION_CONTRACT_INVALID');
  if (admissionContract.testedSourceSha !== expectedContract.testedSourceSha) fail('BINDER_AUTHORITY_SOURCE_SHA_MISMATCH');

  const runtimeAttestation = validateRuntimeAttestation(input.runtimeAttestation, expectedContract);
  const commandObservation = validateCommandObservation(input.commandObservation, expectedContract);
  const providerObservation = ledger.validateObservation(input.providerObservation);
  if (providerObservation.testedSourceSha !== expectedContract.testedSourceSha) fail('BINDER_PROVIDER_SOURCE_SHA_MISMATCH');
  sameSubject(expectedContract.subject, providerObservation.subject, 'BINDER_PROVIDER_SUBJECT_MISMATCH');
  if (providerObservation.kind !== KIND) fail('BINDER_PROVIDER_KIND_INVALID');

  const browser = sameBrowser(runtimeAttestation.browser, commandObservation.browser, 'BINDER_BROWSER_TARGET_MISMATCH');
  if (runtimeAttestation.generatedAt.ms > commandObservation.startedAt.ms) fail('BINDER_RUNTIME_AFTER_COMMAND_START');
  const providerGeneratedAt = iso(providerObservation.generatedAt, 'BINDER_PROVIDER_TIME_INVALID');
  if (providerGeneratedAt.ms < commandObservation.endedAt.ms) fail('BINDER_PROVIDER_BEFORE_COMMAND_WINDOW_END');

  const privateReceipt = bindPrivateReceipt(input.privateExport, providerObservation);
  const session = validateSessionBinding(input.sessionSummary, providerObservation);
  const admissionBinding = admission.bindObservation(admissionContract, providerObservation);
  if (
    admissionBinding.testedSourceSha !== expectedContract.testedSourceSha
    || admissionBinding.sourceContractSatisfied !== true
    || admissionBinding.providerStateObserved !== true
    || admissionBinding.commandExecutionProven !== false
    || admissionBinding.runningExtensionSourceProven !== false
    || admissionBinding.providerMutationCausalityProven !== false
    || admissionBinding.qualificationPass !== false
  ) fail('BINDER_ADMISSION_BINDING_INVALID');

  const coverage = validateCommandCoverage(commandObservation.commands, admissionBinding.requiredAdmissions);
  for (const item of commandObservation.commands) {
    if (item.sourcePathDigest !== providerObservation.identityDigests.sourcePath) {
      fail('BINDER_COMMAND_SOURCE_PATH_MISMATCH', item.command);
    }
    if (item.command === 'move' && item.targetPathDigest !== providerObservation.identityDigests.targetPath) {
      fail('BINDER_COMMAND_TARGET_PATH_MISMATCH');
    }
  }

  return Object.freeze({
    schema: SCHEMA,
    generatedAt: new Date().toISOString(),
    evidenceClass: EVIDENCE_CLASS,
    testedSourceSha: expectedContract.testedSourceSha,
    subject: expectedContract.subject,
    kind: KIND,
    contractDigest: admissionContract.contractDigest,
    browser,
    evidence: Object.freeze({
      runtimeAttestationGeneratedAt: runtimeAttestation.generatedAt.text,
      commandWindowStartedAt: commandObservation.startedAt.text,
      commandWindowEndedAt: commandObservation.endedAt.text,
      commandObservationGeneratedAt: commandObservation.generatedAt.text,
      providerObservationGeneratedAt: providerGeneratedAt.text,
      receiptIdDigest: privateReceipt.receiptIdDigest,
      receiptUpdatedAt: privateReceipt.receiptUpdatedAt,
      receiptExportedAt: privateReceipt.receiptExportedAt,
      sourcePathDigest: providerObservation.identityDigests.sourcePath,
      targetPathDigest: providerObservation.identityDigests.targetPath,
      providerEffectivePhase: providerObservation.effectivePhase,
      providerClassification: providerObservation.classification,
      requiredAdmissions: coverage.requiredAdmissions,
      observedCommands: coverage.observedCommands,
      requiredCommandCoverageComplete: coverage.requiredCommandCoverageComplete,
      sessionIdDigest: session.sessionIdDigest,
      sessionFinalDigest: session.finalDigest,
      sessionCheckpointSequence: session.checkpointSequence,
      sessionObservationDigest: session.observationDigest,
      sourceReceiptPathTimeConsistencyBound: true,
      providerObservationAfterCommandWindow: true,
      privateReceiptIdentityBound: true,
      sessionCheckpointBound: true
    }),
    sourceContractSatisfied: true,
    runningExtensionSourceProven: true,
    commandExecutionProven: true,
    providerStateObserved: true,
    providerMutationCausalityProven: false,
    qualificationPass: false,
    releaseAuthorized: false,
    causalityAuthority: Object.freeze({
      providerRecognizedCorrelationTokenPresent: false,
      browserRequestIdProviderCorrelationClaimed: false,
      identityAndTimeConsistencyOnly: true
    }),
    limitations: LIMITATIONS
  });
}

function assertOutsideRepo(value, label) {
  const raw = String(value || '').trim();
  if (!raw) fail('BINDER_PATH_REQUIRED', label);
  const absolute = path.resolve(raw);
  const relative = path.relative(REAL_ROOT, absolute);
  if (!relative || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    fail('BINDER_PATH_INSIDE_REPOSITORY', label);
  }
  return absolute;
}

function readJsonOutside(filename, label) {
  const lexical = assertOutsideRepo(filename, label);
  let lst;
  let resolved;
  try {
    lst = fs.lstatSync(lexical);
    if (!lst.isFile() || lst.isSymbolicLink() || lst.size <= 0 || lst.size > MAX_JSON_BYTES) {
      fail('BINDER_FILE_INVALID', label);
    }
    resolved = assertOutsideRepo(fs.realpathSync(lexical), label);
  } catch (error) {
    if (error && error.code && String(error.code).startsWith('BINDER_')) throw error;
    fail('BINDER_FILE_UNREADABLE', label);
  }
  try { return JSON.parse(fs.readFileSync(resolved, 'utf8')); }
  catch (_) { fail('BINDER_JSON_INVALID', label); }
}

function parseArgs(argv) {
  const out = {
    runtimeAttestation: '',
    commandObservation: '',
    providerObservation: '',
    privateExport: '',
    sessionDir: '',
    help: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') { out.help = true; continue; }
    if (arg === '--runtime-attestation') { out.runtimeAttestation = String(argv[++index] || ''); continue; }
    if (arg === '--command-observation') { out.commandObservation = String(argv[++index] || ''); continue; }
    if (arg === '--provider-observation') { out.providerObservation = String(argv[++index] || ''); continue; }
    if (arg === '--private-export') { out.privateExport = String(argv[++index] || ''); continue; }
    if (arg === '--session-dir') { out.sessionDir = String(argv[++index] || ''); continue; }
    fail('BINDER_ARGUMENT_INVALID', arg);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      'node project_tools/p1_164_qualification_evidence_binder.js '
      + '--runtime-attestation /absolute/private/runtime.json '
      + '--command-observation /absolute/private/command.json '
      + '--provider-observation /absolute/private/provider.json '
      + '--private-export /absolute/private/receipt-export.json '
      + '--session-dir /absolute/private/session\n'
    );
    return;
  }
  if (process.env.CI && String(process.env.CI).toLowerCase() !== 'false') fail('BINDER_CLI_REFUSES_CI');
  for (const [name, value] of Object.entries(args)) {
    if (name !== 'help' && !value) fail('BINDER_ARGUMENT_REQUIRED', name);
  }

  const head = runtime.exactHeadClean();
  const expectedRuntimeContract = runtime.expectedRuntimeContract(head);
  const admissionContract = admission.buildAdmissionContract(fs.readFileSync(WORKER_PATH, 'utf8'), head);
  const result = bindEvidence({
    expectedRuntimeContract,
    admissionContract,
    runtimeAttestation: readJsonOutside(args.runtimeAttestation, 'runtime attestation'),
    commandObservation: readJsonOutside(args.commandObservation, 'command observation'),
    providerObservation: readJsonOutside(args.providerObservation, 'provider observation'),
    privateExport: readJsonOutside(args.privateExport, 'private receipt export'),
    sessionSummary: ledger.summarizeSession(assertOutsideRepo(args.sessionDir, 'observation session'))
  });
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    process.stderr.write(
      String(error && error.code || 'BINDER_FAILED') + ': '
      + String(error && error.message || 'failed').slice(0, 240) + '\n'
    );
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({
  SCHEMA,
  EVIDENCE_CLASS,
  KIND,
  LIMITATIONS,
  validateRuntimeAttestation,
  validateCommandObservation,
  bindPrivateReceipt,
  validateSessionBinding,
  validateCommandCoverage,
  bindEvidence,
  assertOutsideRepo,
  readJsonOutside,
  parseArgs
});
