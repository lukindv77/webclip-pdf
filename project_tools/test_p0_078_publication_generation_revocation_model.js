'use strict';

// P0-078 deterministic research model: publication is generation/revocation
// authority, not a sticky createPublicLinks boolean on an upload checkpoint.

const assert = require('node:assert/strict');
let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }
function eq(actual, expected, message) { assert.equal(actual, expected, message); checks += 1; }
function throwsCode(fn, code, message) {
  let error = null;
  try { fn(); } catch (e) { error = e; }
  ok(error, `${message}: expected throw`);
  eq(error && error.code, code, `${message}: error code`);
}

function policyError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function makeRemote({ resourceId = 'RID-A', publicUrl = '', exactObject = true, namespaceOk = true } = {}) {
  return {
    resourceId,
    publicUrl,
    exactObject,
    namespaceOk,
    publishCalls: 0,
    unpublishCalls: 0
  };
}

function makePolicy({ enabled = true, generation = 1, revocationGeneration = 0 } = {}) {
  return { enabled: Boolean(enabled), generation: Number(generation), revocationGeneration: Number(revocationGeneration) };
}

function makeReceipt(overrides = {}) {
  return {
    operationId: 'op-A',
    accountUid: 'acct-A',
    rootPath: '/WebClip',
    remotePath: '/WebClip/Upload/a.pdf',
    createPublicLinks: true,
    publicationGeneration: 1,
    phase: 'prepared',
    localJournalGeneration: 7,
    ...overrides
  };
}

function publish(remote) {
  remote.publishCalls += 1;
  if (!remote.publicUrl) remote.publicUrl = `https://public.example/${remote.resourceId}`;
  return remote.publicUrl;
}

// Mirrors current publication decision semantics relevant to P0-078:
// live upload retains the admission-time config boolean; recovery retains the
// checkpoint boolean. Neither carries/compares a publication generation.
function currentStyleLivePublish(capturedConfigBoolean, remote) {
  if (capturedConfigBoolean && !remote.publicUrl) publish(remote);
  return remote.publicUrl;
}

function currentStyleRecovery(receipt, remote) {
  let observed = remote.publicUrl;
  if (receipt.createPublicLinks && !observed) observed = publish(remote);
  return observed;
}

function assertPublicationAuthority(receipt, currentPolicy, remote) {
  if (!remote.namespaceOk) throw policyError('NAMESPACE_UNPROVEN', 'namespace proof required first');
  if (!remote.exactObject) throw policyError('OBJECT_UNPROVEN', 'exact object proof required first');
  const generation = Number(receipt.publicationGeneration || 0);
  if (!generation) throw policyError('PUBLICATION_GENERATION_UNKNOWN', 'missing publication generation');
  if (!currentPolicy.enabled) throw policyError('PUBLICATION_REVOKED', 'current policy disables new publish');
  if (generation !== Number(currentPolicy.generation || 0)) {
    throw policyError('PUBLICATION_GENERATION_MISMATCH', 'stale publication generation');
  }
  if (Number(currentPolicy.revocationGeneration || 0) >= generation) {
    throw policyError('PUBLICATION_REVOKED', 'generation has been revoked');
  }
  return true;
}

function candidateStartPublish(receipt, currentPolicy, remote) {
  assertPublicationAuthority(receipt, currentPolicy, remote);
  const admitted = { ...receipt, phase: 'publish-admitted-unknown' };
  const url = publish(remote);
  return { receipt: { ...admitted, phase: 'publish-verified', publicUrl: url }, publicUrl: url };
}

function candidateRecovery(receipt, currentPolicy, remote) {
  // Observation is truthful regardless of policy. Authority to start a new
  // mutation is checked only if no public URL is currently observed.
  if (remote.publicUrl) return { action: 'observed-existing-public', publicUrl: remote.publicUrl, receipt };
  if (!receipt.createPublicLinks) return { action: 'no-publish-requested', publicUrl: '', receipt };
  const started = candidateStartPublish(receipt, currentPolicy, remote);
  return { action: 'published', publicUrl: started.publicUrl, receipt: started.receipt };
}

function reconcileAlreadyAdmitted(receipt, currentPolicy, remote) {
  if (receipt.phase !== 'publish-admitted-unknown') throw policyError('PUBLISH_NOT_ADMITTED', 'not an admitted publish');
  // Later disable cannot prove cancellation. Do not issue another publish call.
  if (remote.publicUrl) {
    return { phase: 'publish-verified', publicUrl: remote.publicUrl, policyEnabledNow: currentPolicy.enabled };
  }
  return { phase: 'publish-unknown', publicUrl: '', policyEnabledNow: currentPolicy.enabled };
}

function resetPreservingExternalReceipt(receipt) {
  if (receipt.phase === 'publish-admitted-unknown' || receipt.phase === 'publish-unknown') return { ...receipt, journalDiscarded: true };
  return null;
}

function finalizeLocal(receipt, expectedJournalGeneration, currentJournalGeneration) {
  if (expectedJournalGeneration !== currentJournalGeneration) {
    throw policyError('JOURNAL_GENERATION_MISMATCH', 'P0-076 CAS rejects stale finalization');
  }
  return { publicUrl: receipt.publicUrl || '', journalGeneration: currentJournalGeneration };
}

// 1. Live upload stale true boolean can publish after current policy is disabled.
const remote1 = makeRemote({ resourceId: 'RID-1' });
const currentDisabled = makePolicy({ enabled: false, generation: 2, revocationGeneration: 1 });
const liveUrl = currentStyleLivePublish(true, remote1);
ok(Boolean(liveUrl), 'current live path publishes from stale true snapshot');
eq(remote1.publishCalls, 1, 'current live path starts one publish after disable');
eq(currentDisabled.enabled, false, 'control: current policy is disabled');

// 2. Recovery stale checkpoint boolean can also publish after disable.
const remote2 = makeRemote({ resourceId: 'RID-2' });
const oldReceipt = makeReceipt({ publicationGeneration: 1, createPublicLinks: true });
const recoveryUrl = currentStyleRecovery(oldReceipt, remote2);
ok(Boolean(recoveryUrl), 'current recovery publishes from stale checkpoint boolean');
eq(remote2.publishCalls, 1, 'current recovery starts publish');

// 3. Candidate rejects stale generation/current disabled before mutation.
const remote3 = makeRemote({ resourceId: 'RID-3' });
throwsCode(() => candidateRecovery(oldReceipt, currentDisabled, remote3), 'PUBLICATION_REVOKED', 'disabled policy blocks old recovery');
eq(remote3.publishCalls, 0, 'blocked recovery performs no publish');

// 4. Same enabled boolean across generations is not authority equivalence.
const reenabled = makePolicy({ enabled: true, generation: 3, revocationGeneration: 2 });
const remote4 = makeRemote({ resourceId: 'RID-4' });
throwsCode(() => candidateRecovery(oldReceipt, reenabled, remote4), 'PUBLICATION_GENERATION_MISMATCH', 'true-false-true does not revive old receipt');
eq(remote4.publishCalls, 0, 'generation mismatch performs no publish');
ok(reenabled.enabled && oldReceipt.createPublicLinks, 'control: both booleans are true despite generation mismatch');

// 5. Exact current enabled generation succeeds.
const current1 = makePolicy({ enabled: true, generation: 1, revocationGeneration: 0 });
const remote5 = makeRemote({ resourceId: 'RID-5' });
const exact = candidateRecovery(oldReceipt, current1, remote5);
eq(exact.action, 'published', 'exact generation publishes');
eq(remote5.publishCalls, 1, 'exact generation sends one publish');
ok(exact.publicUrl.includes('RID-5'), 'exact publish returns object URL');
eq(exact.receipt.phase, 'publish-verified', 'exact publish reaches verified phase in model');

// 6. Checkpoint false never starts publication, independent of current enabled state.
const falseReceipt = makeReceipt({ createPublicLinks: false, publicationGeneration: 1 });
const remote6 = makeRemote({ resourceId: 'RID-6' });
const falseResult = candidateRecovery(falseReceipt, current1, remote6);
eq(falseResult.action, 'no-publish-requested', 'false checkpoint requests no publication');
eq(remote6.publishCalls, 0, 'false checkpoint emits no publish');
eq(falseResult.publicUrl, '', 'no public URL fabricated');

// 7. Already-public remote state is observation, not new publication authority.
const remote7 = makeRemote({ resourceId: 'RID-7', publicUrl: 'https://public.example/RID-7' });
const observed = candidateRecovery(falseReceipt, currentDisabled, remote7);
eq(observed.action, 'observed-existing-public', 'existing public state remains observable while policy disabled');
eq(observed.publicUrl, 'https://public.example/RID-7', 'existing public URL remains truthful');
eq(remote7.publishCalls, 0, 'observation does not create another publication');
eq(remote7.unpublishCalls, 0, 'future-publish disable is not automatic unpublish');

// 8. Missing publication generation is unknown authority, never wildcard.
const legacyReceipt = makeReceipt({ publicationGeneration: 0 });
const remote8 = makeRemote({ resourceId: 'RID-8' });
throwsCode(() => candidateRecovery(legacyReceipt, current1, remote8), 'PUBLICATION_GENERATION_UNKNOWN', 'legacy missing generation fails closed');
eq(remote8.publishCalls, 0, 'legacy unknown generation performs no publish');

// 9. Revocation generation blocks even a numerically matching enabled policy.
const revokedSame = makePolicy({ enabled: true, generation: 4, revocationGeneration: 4 });
const receipt4 = makeReceipt({ publicationGeneration: 4 });
const remote9 = makeRemote({ resourceId: 'RID-9' });
throwsCode(() => candidateRecovery(receipt4, revokedSame, remote9), 'PUBLICATION_REVOKED', 'revocation receipt supersedes enabled bit');
eq(remote9.publishCalls, 0, 'revoked generation emits no publish');

// 10. P0-073 namespace proof is prerequisite to publication authority.
const wrongNamespace = makeRemote({ resourceId: 'RID-10', namespaceOk: false });
throwsCode(() => candidateRecovery(oldReceipt, current1, wrongNamespace), 'NAMESPACE_UNPROVEN', 'namespace mismatch blocks publication first');
eq(wrongNamespace.publishCalls, 0, 'namespace failure emits no publish');

// 11. P1-184 exact object proof is also prerequisite.
const wrongObject = makeRemote({ resourceId: 'RID-11', exactObject: false });
throwsCode(() => candidateRecovery(oldReceipt, current1, wrongObject), 'OBJECT_UNPROVEN', 'object mismatch blocks publication');
eq(wrongObject.publishCalls, 0, 'object failure emits no publish');

// 12. operationId equality cannot grant publication authority.
const reusedOperation = makeReceipt({ operationId: 'same-op', publicationGeneration: 1 });
const remote12 = makeRemote({ resourceId: 'RID-12' });
throwsCode(() => candidateRecovery(reusedOperation, reenabled, remote12), 'PUBLICATION_GENERATION_MISMATCH', 'operation id cannot reauthorize stale generation');
eq(reusedOperation.operationId, 'same-op', 'operation id control retained');

// 13. Once publish is admitted, later disable is not cancellation evidence.
const remote13 = makeRemote({ resourceId: 'RID-13' });
const admitted13 = { ...oldReceipt, phase: 'publish-admitted-unknown' };
const beforeCalls13 = remote13.publishCalls;
const unknown13 = reconcileAlreadyAdmitted(admitted13, currentDisabled, remote13);
eq(unknown13.phase, 'publish-unknown', 'post-admission disable keeps unknown settlement');
eq(remote13.publishCalls, beforeCalls13, 'reconciliation does not blind retry publish');
eq(unknown13.policyEnabledNow, false, 'reconciliation records newer disabled policy without pretending cancellation');

// 14. Late success after disable is recorded truthfully, without another publish.
const remote14 = makeRemote({ resourceId: 'RID-14', publicUrl: 'https://public.example/RID-14' });
const admitted14 = { ...oldReceipt, phase: 'publish-admitted-unknown' };
const late14 = reconcileAlreadyAdmitted(admitted14, currentDisabled, remote14);
eq(late14.phase, 'publish-verified', 'late admitted success can be observed after disable');
eq(late14.publicUrl, 'https://public.example/RID-14', 'late public state is not hidden');
eq(remote14.publishCalls, 0, 'late observation does not duplicate publish');

// 15. P0-072: reset must preserve admitted external publication receipt.
const preserved = resetPreservingExternalReceipt(admitted14);
ok(Boolean(preserved), 'reset preserves admitted publication receipt');
eq(preserved.journalDiscarded, true, 'preserved receipt records Journal discard');
eq(preserved.phase, 'publish-admitted-unknown', 'reset does not fabricate terminal publication state');
const preparedDropped = resetPreservingExternalReceipt(makeReceipt({ phase: 'prepared' }));
eq(preparedDropped, null, 'pre-admission publication work may be dropped by reset model');

// 16. P0-076: verified publication does not grant stale local Journal finalization.
const verifiedForLocal = { ...oldReceipt, phase: 'publish-verified', publicUrl: 'https://public.example/RID-16' };
throwsCode(() => finalizeLocal(verifiedForLocal, 7, 8), 'JOURNAL_GENERATION_MISMATCH', 'stale Journal generation blocks local finalization');
const localOk = finalizeLocal(verifiedForLocal, 7, 7);
eq(localOk.publicUrl, 'https://public.example/RID-16', 'exact Journal generation can record observed public URL');
eq(localOk.journalGeneration, 7, 'exact Journal generation retained');

// 17. Publication revocation does not erase a stable resource identity.
const remote17 = makeRemote({ resourceId: 'RID-17', publicUrl: 'https://public.example/RID-17' });
const observed17 = candidateRecovery(falseReceipt, currentDisabled, remote17);
eq(remote17.resourceId, 'RID-17', 'resource identity remains after future-publish disable');
eq(observed17.publicUrl, 'https://public.example/RID-17', 'public exposure remains visible until separately revoked');

// 18. Policy generation is object-independent: valid policy cannot bless weak object proof.
const validPolicyWrongObject = makeRemote({ resourceId: 'RID-18', exactObject: false });
throwsCode(() => candidateStartPublish(oldReceipt, current1, validPolicyWrongObject), 'OBJECT_UNPROVEN', 'valid generation cannot compensate for weak object proof');

// 19. Exact object cannot override revoked privacy policy.
const exactObjectRevoked = makeRemote({ resourceId: 'RID-19', exactObject: true, namespaceOk: true });
throwsCode(() => candidateStartPublish(oldReceipt, currentDisabled, exactObjectRevoked), 'PUBLICATION_REVOKED', 'exact object cannot override revoked policy');

// 20. A new explicit receipt under re-enabled generation can publish.
const newReceipt3 = makeReceipt({ operationId: 'op-new', publicationGeneration: 3, createPublicLinks: true });
const remote20 = makeRemote({ resourceId: 'RID-20' });
const newPublish = candidateRecovery(newReceipt3, reenabled, remote20);
eq(newPublish.action, 'published', 'new receipt under re-enabled generation may publish');
eq(remote20.publishCalls, 1, 'new generation emits one publish');
ok(newPublish.publicUrl.includes('RID-20'), 'new generation binds resulting URL');

// 21. Old receipt remains stale even after a new receipt has succeeded elsewhere.
const remote21 = makeRemote({ resourceId: 'RID-21' });
throwsCode(() => candidateRecovery(oldReceipt, reenabled, remote21), 'PUBLICATION_GENERATION_MISMATCH', 'unrelated new success does not reauthorize old receipt');
eq(remote21.publishCalls, 0, 'old receipt still emits no publish');

// 22. Observation of public URL must not be misused as authority to publish another object.
const publicA = makeRemote({ resourceId: 'RID-A', publicUrl: 'https://public.example/RID-A' });
const observedA = candidateRecovery(falseReceipt, currentDisabled, publicA);
const privateB = makeRemote({ resourceId: 'RID-B' });
eq(observedA.action, 'observed-existing-public', 'public A observation recorded');
throwsCode(() => candidateRecovery(oldReceipt, currentDisabled, privateB), 'PUBLICATION_REVOKED', 'public A observation grants no authority for B');
eq(privateB.publishCalls, 0, 'B remains private under revoked policy');

console.log(`PASS ${checks} checks`);
