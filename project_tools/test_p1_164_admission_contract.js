'use strict';

// P1-164 deterministic witness for the source admission contract.
// No network, OAuth credential, provider mutation or live qualification claim.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const tool = require('./yandex_p1_164_admission_contract.js');
const ledger = require('./yandex_p1_164_observation_session.js');

const ROOT = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const source = fs.readFileSync(path.join(ROOT, 'project_tools', 'yandex_p1_164_admission_contract.js'), 'utf8');

let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }
function eq(actual, expected, message) { assert.equal(actual, expected, message); checks += 1; }
function deep(actual, expected, message) { assert.deepStrictEqual(actual, expected, message); checks += 1; }
function throwsCode(fn, code, message) {
  assert.throws(fn, (error) => error?.code === code, message || code);
  checks += 1;
}

const sha = 'a'.repeat(40);
const contract = tool.buildAdmissionContract(worker, sha);
eq(contract.schema, tool.CONTRACT_SCHEMA, 'contract schema');
eq(contract.evidenceClass, 'source-admission-contract-only', 'contract evidence class');
eq(contract.testedSourceSha, sha, 'contract binds tested source sha');
ok(/^sha256:[0-9a-f]{64}$/.test(contract.sourceFileDigest), 'contract binds service-worker digest');
ok(/^sha256:[0-9a-f]{64}$/.test(contract.contractDigest), 'contract has canonical digest');
eq(contract.kind, tool.KIND, 'contract kind');

eq(contract.commands.unpublish.endpoint, '/resources/unpublish', 'unpublish endpoint described');
eq(contract.commands.unpublish.method, 'PUT', 'unpublish method described');
eq(contract.commands.unpublish.admissionTransition, 'prepared->revoke-admitted-unknown', 'unpublish transition');
eq(contract.commands.unpublish.durableAdmissionBeforeCommand, true, 'unpublish durable admission precedes command');
eq(contract.commands.unpublish.exactCommandSiteCount, 1, 'one unpublish command site');
eq(contract.commands.unpublish.unknownSettlementRecovery, 'read-only-observation-no-replay', 'unpublish unknown is observation-only');
eq(contract.commands.unpublish.clientIdempotencyTokenUsed, false, 'no client idempotency token claimed');

eq(contract.commands.move.endpoint, '/resources/move', 'move endpoint described');
eq(contract.commands.move.method, 'POST', 'move method described');
eq(contract.commands.move.admissionTransition, 'revoke-verified->move-admitted-unknown', 'move transition');
eq(contract.commands.move.durableAdmissionBeforeCommand, true, 'move durable admission precedes command');
eq(contract.commands.move.exactCommandSiteCount, 1, 'one move command site');
eq(contract.commands.move.immutableTargetOverwrite, false, 'move cannot overwrite target');
eq(contract.commands.move.unknownSettlementRecovery, 'read-only-observation-no-replay', 'move unknown is observation-only');
eq(contract.commands.move.clientIdempotencyTokenUsed, false, 'no move client idempotency token claimed');

eq(contract.admissionStore.durablePhaseWrite, true, 'admission phase is durable');
eq(contract.admissionStore.remoteIdentityRechecked, true, 'remote identity is rechecked before admission');
eq(contract.admissionStore.journalAuthorityRechecked, true, 'journal authority is rechecked before admission');
eq(contract.recovery.admittedUnpublishReplayed, false, 'recovery does not replay admitted unpublish');
eq(contract.recovery.admittedMoveReplayed, false, 'recovery does not replay admitted move');
eq(contract.recovery.revokeVerifiedMayCreateFreshMoveAdmission, true, 'recovery may create only the later fresh move admission');

for (const limitation of tool.CONTRACT_LIMITATIONS) {
  ok(contract.limitations.includes(limitation), 'contract limitation: ' + limitation);
}

deep(tool.requiredAdmissionsForPhase('prepared'), [], 'prepared requires no prior destructive admission');
deep(tool.requiredAdmissionsForPhase('revoke-admitted-unknown'), ['unpublish'], 'unknown revoke binds unpublish admission');
deep(tool.requiredAdmissionsForPhase('revoke-verified'), ['unpublish'], 'verified revoke still binds unpublish admission');
deep(tool.requiredAdmissionsForPhase('move-admitted-unknown'), ['unpublish', 'move'], 'unknown move binds both admissions');
deep(tool.requiredAdmissionsForPhase('remote-verified'), ['unpublish', 'move'], 'terminal composite binds both admissions');
throwsCode(() => tool.requiredAdmissionsForPhase('manual-resolution'), 'ADMISSION_PHASE_INVALID', 'manual wrapper must be resolved before binding');

const revokeAdmission = "await markPendingPublicationRevokeTrashRemoteAdmission(detachedReceiptId, 'prepared', 'revoke-admitted-unknown')";
const moveAdmission = "await markPendingPublicationRevokeTrashRemoteAdmission(key, 'revoke-verified', 'move-admitted-unknown')";
throwsCode(
  () => tool.buildAdmissionContract(worker.replace(revokeAdmission, '/* removed admission */'), sha),
  'ADMISSION_UNPUBLISH_ORDER_INVALID',
  'missing revoke admission fails closed'
);
throwsCode(
  () => tool.buildAdmissionContract(worker.replace(moveAdmission, '/* removed admission */'), sha),
  'ADMISSION_MOVE_ORDER_INVALID',
  'missing move admission fails closed'
);
throwsCode(
  () => tool.buildAdmissionContract(
    worker.replace(
      "await yandexApi('/resources/unpublish', {\n        method: 'PUT'",
      "await yandexApi('/resources/unpublish', {\n        method: 'POST'"
    ),
    sha
  ),
  'ADMISSION_UNPUBLISH_METHOD_INVALID',
  'unexpected unpublish method fails closed'
);
throwsCode(
  () => tool.buildAdmissionContract(
    worker.replace(
      "await yandexApi('/resources/move', {\n      method: 'POST'",
      "await yandexApi('/resources/move', {\n      method: 'PUT'"
    ),
    sha
  ),
  'ADMISSION_MOVE_METHOD_INVALID',
  'unexpected move method fails closed'
);
throwsCode(
  () => tool.buildAdmissionContract(
    worker.replace(
      "const next = { ...current, phase: nextValue, updatedAt: Date.now(), lastError: '' };",
      "const next = { ...current, phase: nextValue, updatedAt: Date.now(), lastError: '' }; // pending.put removed\n              void next;"
    ).replace('              pending.put(next);\n              setResult(next);', '              setResult(next);'),
    sha
  ),
  'ADMISSION_DURABLE_WRITE_MISSING',
  'missing durable admission write fails closed'
);
throwsCode(
  () => tool.buildAdmissionContract(
    worker.replace(
      "async function reconcilePendingPublicationRevokeTrashReceipt(item, trigger = 'maintenance') {",
      "async function reconcilePendingPublicationRevokeTrashReceipt(item, trigger = 'maintenance') {\n  /* /resources/move */"
    ),
    sha
  ),
  'ADMISSION_RECOVERY_REPLAYS_MOVE',
  'recovery mutation site fails closed'
);

const digest = (ch) => 'sha256:' + ch.repeat(64);
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
    generatedAt: '2026-09-20T16:00:10.000Z',
    evidenceClass: 'live-provider-observation-only',
    testedSourceSha: sha,
    subject: { rpf: digest('1'), yandexQcf: digest('2') },
    kind: ledger.KIND,
    phase: 'move-admitted-unknown',
    manualResolutionSourcePhase: '',
    effectivePhase: 'move-admitted-unknown',
    receiptAnchor: {
      receiptIdDigest: digest('b'),
      receiptUpdatedAt: 1700000000200,
      exportedAt: '2026-09-20T16:00:00.000Z'
    },
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
    source: safeResource({
      state: 'missing',
      type: '',
      pathMatches: false,
      resourceIdMatches: false,
      isPublic: false,
      publicUrlMatches: false,
      httpStatus: 404
    }),
    target: safeResource({ isPublic: false }),
    classification: {
      state: 'move-settled-private',
      safeNextAction: 'local-finalize-only',
      terminal: true
    },
    watch: {
      requestedSeconds: 0,
      elapsedMs: 5,
      attempts: [{ attempt: 1, elapsedMs: 5, state: 'move-settled-private' }]
    },
    limitations: [...ledger.OBSERVER_LIMITATIONS]
  };
  return {
    ...base,
    ...overrides,
    subject: { ...base.subject, ...(overrides.subject || {}) },
    receiptAnchor: { ...base.receiptAnchor, ...(overrides.receiptAnchor || {}) },
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

const bound = tool.bindObservation(contract, observation());
eq(bound.schema, tool.BINDING_SCHEMA, 'binding schema');
eq(bound.evidenceClass, 'source-contract-plus-sanitized-provider-observation', 'binding evidence class');
eq(bound.testedSourceSha, sha, 'binding preserves exact source sha');
eq(bound.contractDigest, contract.contractDigest, 'binding carries source contract digest');
eq(bound.receiptAnchor.receiptIdDigest, digest('b'), 'binding carries only sanitized receipt identity');
eq(bound.receiptAnchor.receiptUpdatedAt, 1700000000200, 'binding carries receipt revision');
deep(bound.requiredAdmissions, ['unpublish', 'move'], 'move-admitted observation requires both source admissions');
eq(bound.observedClassification.state, 'move-settled-private', 'binding retains provider observation state');
eq(bound.sourceContractSatisfied, true, 'source contract is satisfied');
eq(bound.providerStateObserved, true, 'provider state came from sanitized observer');
eq(bound.commandExecutionProven, false, 'source contract does not prove command execution');
eq(bound.providerMutationCausalityProven, false, 'provider state does not prove mutation causality');
eq(bound.runningExtensionSourceProven, false, 'source checkout is not running-extension attestation');
eq(bound.qualificationPass, false, 'binding cannot synthesize qualification pass');
ok(!JSON.stringify(bound).includes('destructive:publication-revoke-trash:'), 'binding exposes no raw receipt id');

const prepared = observation({
  phase: 'prepared',
  effectivePhase: 'prepared',
  source: safeResource({ isPublic: true }),
  target: safeResource({
    state: 'missing',
    type: '',
    pathMatches: false,
    resourceIdMatches: false,
    isPublic: false,
    publicUrlMatches: false,
    httpStatus: 404
  }),
  classification: {
    state: 'pre-admission-ready',
    safeNextAction: 'return-to-webclip-for-admission',
    terminal: true
  },
  watch: { attempts: [{ attempt: 1, elapsedMs: 5, state: 'pre-admission-ready' }] }
});
deep(tool.bindObservation(contract, prepared).requiredAdmissions, [], 'pre-admission observation binds no destructive admission');

throwsCode(
  () => tool.bindObservation(contract, observation({ testedSourceSha: 'c'.repeat(40) })),
  'ADMISSION_OBSERVATION_SOURCE_SHA_MISMATCH',
  'observation from another source sha cannot bind'
);
throwsCode(
  () => tool.bindObservation({ ...contract, evidenceClass: 'tampered' }, observation()),
  'ADMISSION_CONTRACT_CONTENT_MISMATCH',
  'contract field drift fails closed even when digest field is copied'
);
throwsCode(
  () => tool.bindObservation({ ...contract, contractDigest: digest('f') }, observation()),
  'ADMISSION_CONTRACT_DIGEST_MISMATCH',
  'contract digest drift fails closed'
);

throwsCode(() => tool.assertOutsideRepo(ROOT), 'ADMISSION_OBSERVATION_PATH_INSIDE_REPOSITORY', 'repo-local observation path forbidden');
const parsed = tool.parseArgs(['--observation', '/tmp/observation.json']);
eq(parsed.observation, '/tmp/observation.json', 'observation CLI path parsed');
eq(parsed.contractOnly, false, 'binding mode default');
eq(tool.parseArgs(['--contract-only']).contractOnly, true, 'contract-only mode parsed');
throwsCode(
  () => tool.parseArgs(['--contract-only', '--observation', '/tmp/observation.json']),
  'ADMISSION_ARGUMENT_CONFLICT',
  'CLI modes cannot conflict'
);

ok(!source.includes('fetch('), 'admission witness performs no network call');
ok(!source.includes('yandexApi('), 'admission witness cannot issue Yandex API calls');
ok(!source.includes('WEBCLIP_YANDEX_OAUTH_TOKEN'), 'admission witness consumes no OAuth token');
ok(source.includes('qualificationPass: false'), 'admission binding cannot emit qualification PASS');
ok(source.includes('source-contract-only-not-runtime-execution-evidence'), 'runtime execution limitation is explicit');

console.log(
  `P1-164 admission contract witness: PASS; checks=${checks}; network_calls=0; provider_mutations=0; oauth_credentials=0; command_execution_proven=false; qualification_pass=false`
);
