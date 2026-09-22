'use strict';

// Deterministic P1-164 cross-evidence binding witness.
// Synthetic evidence only; no browser/provider call and no physical qualification claim.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const binder = require('./p1_164_qualification_evidence_binder.js');
const runtime = require('./chrome_p1_164_runtime_attestor.js');
const command = require('./chrome_p1_164_command_observer.js');
const observer = require('./yandex_p1_164_live_observer.js');
const ledger = require('./yandex_p1_164_observation_session.js');
const adapter = require('./yandex_p1_164_private_export_adapter.js');
const admission = require('./yandex_p1_164_admission_contract.js');

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
function req(requestId, timestamp, method, url) {
  return { method: 'Network.requestWillBeSent', params: { requestId, timestamp, request: { method, url } } };
}
function response(requestId, status) {
  return { method: 'Network.responseReceived', params: { requestId, response: { status } } };
}

const head = git('rev-parse', 'HEAD');
const expectedRuntimeContract = runtime.expectedRuntimeContract(head);
eq(expectedRuntimeContract.testedSourceSha, head, 'runtime contract binds exact checkout');
eq(expectedRuntimeContract.packageMembers.length, 34, 'current package has 34 members');
eq(expectedRuntimeContract.loadedWorkerScripts.length, 10, 'current worker graph has 10 scripts');

const extensionId = 'b'.repeat(32);
const runtimeSnapshot = {
  extensionId,
  serviceWorkerUrl: 'chrome-extension://' + extensionId + '/service-worker.js',
  manifest: {
    manifest_version: expectedRuntimeContract.manifest.manifestVersion,
    name: expectedRuntimeContract.manifest.name,
    version: expectedRuntimeContract.manifest.version,
    minimum_chrome_version: expectedRuntimeContract.manifest.minimumChromeVersion,
    background: { service_worker: expectedRuntimeContract.manifest.serviceWorkerPath }
  },
  browserRpf: expectedRuntimeContract.subject.rpf,
  members: expectedRuntimeContract.packageMembers.map((item) => ({ ...item })),
  loadedScripts: expectedRuntimeContract.loadedWorkerScripts.map((item) => ({ ...item }))
};
const runtimeAttestation = structuredClone(
  runtime.finalizeLiveAttestation(expectedRuntimeContract, runtimeSnapshot, 'Chrome/153.0.0.0')
);
runtimeAttestation.generatedAt = '2026-09-22T10:00:00.000Z';

const sourcePath = '/WebClip/Upload/binder-fixture.pdf';
const targetPath = '/WebClip/Trash/09-2026/binder-fixture.pdf';
const unpublishUrl = 'https://cloud-api.yandex.net/v1/disk/resources/unpublish?path=' + encodeURIComponent(sourcePath);
const moveUrl = 'https://cloud-api.yandex.net/v1/disk/resources/move?from=' + encodeURIComponent(sourcePath)
  + '&path=' + encodeURIComponent(targetPath) + '&overwrite=false&force_async=false';

const commandObservation = structuredClone(command.finalizeLiveObservation(
  expectedRuntimeContract,
  runtimeAttestation,
  {
    startedAt: '2026-09-22T10:00:30.000Z',
    endedAt: '2026-09-22T10:01:00.000Z',
    totalEvents: 4,
    trace: [
      command.compactNetworkEvent(req('u-binder', 1, 'PUT', unpublishUrl)),
      command.compactNetworkEvent(response('u-binder', 200)),
      command.compactNetworkEvent(req('m-binder', 2, 'POST', moveUrl)),
      command.compactNetworkEvent(response('m-binder', 201))
    ]
  },
  'both'
));
commandObservation.generatedAt = '2026-09-22T10:01:10.000Z';

const privateExport = {
  schema: adapter.PRIVATE_SCHEMA,
  exportedAt: '2026-09-22T10:01:30.000Z',
  receiptId: 'destructive:publication-revoke-trash:binder-fixture',
  receiptUpdatedAt: 1790060000000,
  kind: observer.KIND,
  phase: 'move-admitted-unknown',
  manualResolutionSourcePhase: '',
  receipt: {
    operationId: 'op-binder-fixture',
    accountUid: 'uid-binder-fixture',
    rootPath: '/WebClip',
    sourcePath,
    targetPath,
    sourceResourceId: 'resource-binder-fixture',
    sourcePublicUrl: 'https://disk.yandex.ru/d/binder-fixture'
  },
  currentContext: { rootPath: '/WebClip' },
  watchSeconds: 0,
  containsSensitiveIdentity: true,
  containsOAuthCredentials: false
};
const privateNormalized = adapter.validatePrivateExport(privateExport);
const providerConfig = observer.validateConfig(adapter.buildObserverInput(privateNormalized, head, 0));
const source = observer.res('missing', {
  type: '', pathMatches: false, resourceIdMatches: false, isPublic: false,
  publicUrlMatches: false, httpStatus: 404
});
const target = observer.res('present', {
  type: 'file', pathMatches: true, resourceIdMatches: true, isPublic: false,
  publicUrlMatches: true, httpStatus: 200
});
const classification = observer.classifyObservation({
  phase: providerConfig.effectivePhase,
  accountState: 'present',
  accountMatches: true,
  rootMatches: true,
  samePath: false,
  source,
  target
});
eq(classification.state, 'move-settled-private', 'provider fixture observes moved private object');
const providerObservation = structuredClone(observer.output(providerConfig, expectedRuntimeContract.subject, {
  account: { state: 'present' },
  accountMatches: true,
  rootMatches: true,
  samePath: false,
  source,
  target,
  classification,
  elapsedMs: 25,
  attempts: [{ attempt: 1, elapsedMs: 25, state: classification.state }]
}));
providerObservation.generatedAt = '2026-09-22T10:02:00.000Z';
ledger.validateObservation(providerObservation);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'webclip-p1-164-binder-'));
const sessionDir = path.join(tmp, 'session');
let sessionSummary;
try {
  ledger.initSession(sessionDir, providerObservation, 'post-move-admission', {
    sessionId: 'p1-164-binder-fixture',
    createdAt: '2026-09-22T10:02:10.000Z',
    recordedAt: '2026-09-22T10:02:11.000Z'
  });
  sessionSummary = ledger.summarizeSession(sessionDir);

  const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
  const admissionContract = admission.buildAdmissionContract(worker, head);
  const bound = binder.bindEvidence({
    expectedRuntimeContract,
    admissionContract,
    runtimeAttestation,
    commandObservation,
    providerObservation,
    privateExport,
    sessionSummary
  });

  eq(bound.schema, binder.SCHEMA, 'binder schema');
  eq(bound.evidenceClass, binder.EVIDENCE_CLASS, 'binder evidence class');
  eq(bound.testedSourceSha, head, 'binder exact source SHA');
  eq(bound.subject.rpf, expectedRuntimeContract.subject.rpf, 'binder current RPF');
  eq(bound.subject.yandexQcf, expectedRuntimeContract.subject.yandexQcf, 'binder current Yandex QCF');
  eq(bound.kind, observer.KIND, 'binder kind');
  eq(bound.sourceContractSatisfied, true, 'source admission contract satisfied');
  eq(bound.runningExtensionSourceProven, true, 'live source evidence axis can be joined');
  eq(bound.commandExecutionProven, true, 'live command evidence axis can be joined');
  eq(bound.providerStateObserved, true, 'live GET-only provider evidence axis can be joined');
  eq(bound.providerMutationCausalityProven, false, 'consistency never becomes provider causality');
  eq(bound.qualificationPass, false, 'binder never synthesizes qualification PASS');
  eq(bound.releaseAuthorized, false, 'binder never authorizes release');
  deep(bound.evidence.requiredAdmissions, ['unpublish', 'move'], 'move phase requires both source admissions');
  deep(bound.evidence.observedCommands, ['unpublish', 'move'], 'composite command trace joined');
  eq(bound.evidence.requiredCommandCoverageComplete, true, 'full synthetic command coverage reported as coverage only');
  eq(bound.evidence.privateReceiptIdentityBound, true, 'private receipt identity bound');
  eq(bound.evidence.sessionCheckpointBound, true, 'provider observation bound into verified session checkpoint');
  eq(bound.evidence.providerObservationAfterCommandWindow, true, 'provider observation ordered after command watch');
  eq(bound.causalityAuthority.providerRecognizedCorrelationTokenPresent, false, 'no invented provider correlation token');
  eq(bound.causalityAuthority.browserRequestIdProviderCorrelationClaimed, false, 'CDP request id not promoted across provider boundary');
  eq(bound.causalityAuthority.identityAndTimeConsistencyOnly, true, 'binder states consistency-only authority');
  for (const limitation of binder.LIMITATIONS) ok(bound.limitations.includes(limitation), 'limitation retained: ' + limitation);

  const serialized = JSON.stringify(bound);
  ok(!serialized.includes(sourcePath), 'raw source path absent from binder output');
  ok(!serialized.includes(targetPath), 'raw target path absent from binder output');
  ok(!serialized.includes(privateExport.receipt.accountUid), 'raw account uid absent from binder output');
  ok(!serialized.includes(privateExport.receipt.sourceResourceId), 'raw resource id absent from binder output');
  ok(!serialized.includes(privateExport.receipt.sourcePublicUrl), 'raw public URL absent from binder output');
  ok(!serialized.includes(privateExport.receiptId), 'raw receipt id absent from binder output');

  const mismatchedPath = structuredClone(commandObservation);
  mismatchedPath.commands[0].sourcePathDigest = 'sha256:' + '0'.repeat(64);
  throwsCode(() => binder.bindEvidence({
    expectedRuntimeContract, admissionContract, runtimeAttestation,
    commandObservation: mismatchedPath, providerObservation, privateExport, sessionSummary
  }), 'BINDER_COMMAND_SOURCE_PATH_MISMATCH', 'command/provider source path mismatch fails closed');

  const mismatchedBrowser = structuredClone(commandObservation);
  mismatchedBrowser.browser.extensionIdDigest = 'sha256:' + '1'.repeat(64);
  throwsCode(() => binder.bindEvidence({
    expectedRuntimeContract, admissionContract, runtimeAttestation,
    commandObservation: mismatchedBrowser, providerObservation, privateExport, sessionSummary
  }), 'BINDER_BROWSER_TARGET_MISMATCH', 'runtime/command browser target mismatch fails closed');

  const providerTooEarlyCommand = structuredClone(commandObservation);
  providerTooEarlyCommand.watch.endedAt = '2026-09-22T10:03:00.000Z';
  providerTooEarlyCommand.generatedAt = '2026-09-22T10:03:10.000Z';
  throwsCode(() => binder.bindEvidence({
    expectedRuntimeContract, admissionContract, runtimeAttestation,
    commandObservation: providerTooEarlyCommand, providerObservation, privateExport, sessionSummary
  }), 'BINDER_PROVIDER_BEFORE_COMMAND_WINDOW_END', 'provider state before command window end fails closed');

  const changedPrivate = structuredClone(privateExport);
  changedPrivate.receipt.targetPath = '/WebClip/Trash/09-2026/other.pdf';
  throwsCode(() => binder.bindEvidence({
    expectedRuntimeContract, admissionContract, runtimeAttestation,
    commandObservation, providerObservation, privateExport: changedPrivate, sessionSummary
  }), 'BINDER_PRIVATE_IDENTITY_MISMATCH', 'private receipt retarget mismatch fails closed');

  const missingCheckpoint = structuredClone(sessionSummary);
  missingCheckpoint.checkpoints[0].observationDigest = 'sha256:' + '2'.repeat(64);
  throwsCode(() => binder.bindEvidence({
    expectedRuntimeContract, admissionContract, runtimeAttestation,
    commandObservation, providerObservation, privateExport, sessionSummary: missingCheckpoint
  }), 'BINDER_SESSION_OBSERVATION_NOT_UNIQUE', 'provider observation must exist exactly once in session summary');

  const moveOnly = structuredClone(command.finalizeLiveObservation(
    expectedRuntimeContract,
    runtimeAttestation,
    {
      startedAt: '2026-09-22T10:00:30.000Z',
      endedAt: '2026-09-22T10:01:00.000Z',
      totalEvents: 2,
      trace: [
        command.compactNetworkEvent(req('m-only', 2, 'POST', moveUrl)),
        command.compactNetworkEvent(response('m-only', 201))
      ]
    },
    'move'
  ));
  moveOnly.generatedAt = '2026-09-22T10:01:10.000Z';
  const partial = binder.bindEvidence({
    expectedRuntimeContract, admissionContract, runtimeAttestation,
    commandObservation: moveOnly, providerObservation, privateExport, sessionSummary
  });
  deep(partial.evidence.observedCommands, ['move'], 'bounded binder permits honest partial command coverage');
  eq(partial.evidence.requiredCommandCoverageComplete, false, 'partial command evidence not promoted to full coverage');
  eq(partial.providerMutationCausalityProven, false, 'partial coverage still has no causality claim');
  eq(partial.qualificationPass, false, 'partial coverage still has no qualification claim');

  const wrongPhaseProvider = structuredClone(providerObservation);
  wrongPhaseProvider.phase = 'revoke-admitted-unknown';
  wrongPhaseProvider.effectivePhase = 'revoke-admitted-unknown';
  const wrongClass = observer.classifyObservation({
    phase: 'revoke-admitted-unknown', accountState: 'present', accountMatches: true,
    rootMatches: true, samePath: false, source, target
  });
  wrongPhaseProvider.classification = wrongClass;
  wrongPhaseProvider.watch.attempts[0].state = wrongClass.state;
  const wrongPrivate = structuredClone(privateExport);
  wrongPrivate.phase = 'revoke-admitted-unknown';
  throwsCode(() => binder.bindEvidence({
    expectedRuntimeContract, admissionContract, runtimeAttestation,
    commandObservation: moveOnly, providerObservation: wrongPhaseProvider,
    privateExport: wrongPrivate, sessionSummary
  }), 'BINDER_SESSION_OBSERVATION_NOT_UNIQUE', 'cross-phase evidence cannot silently reuse session authority');

  const sourceText = fs.readFileSync(path.join(ROOT, 'project_tools', 'p1_164_qualification_evidence_binder.js'), 'utf8');
  ok(!sourceText.includes('WEBCLIP_YANDEX_OAUTH_TOKEN'), 'binder does not consume OAuth token');
  ok(!sourceText.includes("fetch('https://cloud-api.yandex.net"), 'binder constructs no provider request');
  ok(sourceText.includes('providerMutationCausalityProven: false'), 'source hard-codes no causality promotion');
  ok(sourceText.includes('qualificationPass: false'), 'source hard-codes no qualification promotion');
  ok(sourceText.includes('releaseAuthorized: false'), 'source hard-codes no release authorization');
  ok(sourceText.includes('providerRecognizedCorrelationTokenPresent: false'), 'source explicitly records missing correlation authority');

  const args = binder.parseArgs([
    '--runtime-attestation', '/tmp/runtime.json',
    '--command-observation', '/tmp/command.json',
    '--provider-observation', '/tmp/provider.json',
    '--private-export', '/tmp/private.json',
    '--session-dir', '/tmp/session'
  ]);
  eq(args.runtimeAttestation, '/tmp/runtime.json', 'runtime path arg');
  eq(args.commandObservation, '/tmp/command.json', 'command path arg');
  eq(args.providerObservation, '/tmp/provider.json', 'provider path arg');
  eq(args.privateExport, '/tmp/private.json', 'private export arg');
  eq(args.sessionDir, '/tmp/session', 'session dir arg');
  throwsCode(() => binder.parseArgs(['--unknown']), 'BINDER_ARGUMENT_INVALID', 'unknown CLI argument rejected');
  throwsCode(() => binder.assertOutsideRepo(ROOT, 'repo'), 'BINDER_PATH_INSIDE_REPOSITORY', 'repository path cannot host physical evidence inputs');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(
  'P1-164 qualification evidence binder: PASS; checks=' + checks
  + '; synthetic_evidence=true'
  + '; browser_calls=0'
  + '; provider_calls=0'
  + '; provider_mutations=0'
  + '; causality=false'
  + '; qualification_pass=false'
  + '; release_authorized=false'
);
