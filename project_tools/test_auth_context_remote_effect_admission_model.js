'use strict';

// Research-only deterministic model for immutable Yandex auth-context -> remote-effect admission.
// No production runtime, manifest, workflow, release-readiness or S2 behavior is modified here.

const assert = require('assert');
const fs = require('fs');
const { execFileSync, spawnSync } = require('child_process');

let cases = 0;
function check(v, m) { cases += 1; assert.ok(v, m); }
function eq(a, b, m) { cases += 1; assert.strictEqual(a, b, m); }
function deepEq(a, b, m) { cases += 1; assert.deepStrictEqual(a, b, m); }
function throwsCode(fn, code, m) {
  cases += 1;
  assert.throws(fn, (e) => e && e.code === code, m || `expected ${code}`);
}
function fail(code, detail) { const e = new Error(detail || code); e.code = code; throw e; }
function read(path) { return fs.readFileSync(path, 'utf8'); }
function git(...args) { return execFileSync('git', args, { encoding: 'utf8' }).trim(); }
function isAncestor(a, b = 'HEAD') { return spawnSync('git', ['merge-base', '--is-ancestor', a, b]).status === 0; }
function objectExists(sha) { return spawnSync('git', ['cat-file', '-e', `${sha}^{commit}`]).status === 0; }

const BASELINE = '2857ca6f3892e802ea9d3c0ee639999949b3002a';
const P0_074_HEAD = '771734b54715ef47cd1d9ad26383c0a5f02bbcdf';
const C0_C1_HEAD = 'c22fa2a7c7e61b18f3709597234516a3d95697c5';
const WAVE1_CONTEXT_HEAD = 'abfb6932a2a6d33953a20d754a9f269c4adf8449';
const HEX40 = /^[0-9a-f]{40}$/;

function auth(id, generation, accountUid, capabilities) {
  return {
    authRecordId: id,
    authGeneration: generation,
    accountUid,
    accountTruth: 'proven',
    capabilities: new Set(capabilities || []),
  };
}

function globalState(currentAuth, rootIdentity = 'root-A', publicationGeneration = 1) {
  return {
    currentAuth,
    rootIdentity,
    publicationGeneration,
    disconnectedGeneration: currentAuth ? currentAuth.authGeneration : 0,
  };
}

function acquireContext(g, physicalOperationId, requiredCapability) {
  const a = g.currentAuth;
  if (!a) fail('AUTH_REQUIRED');
  if (a.accountTruth !== 'proven' || !a.accountUid) fail('ACCOUNT_UNPROVEN');
  if (!a.capabilities.has(requiredCapability)) fail('CAPABILITY_INSUFFICIENT');
  return Object.freeze({
    contextId: `ctx:${physicalOperationId}:${a.authRecordId}:${a.authGeneration}`,
    physicalOperationId,
    authRecordId: a.authRecordId,
    authGeneration: a.authGeneration,
    accessToken: `secret:${a.authRecordId}`,
    accountUid: a.accountUid,
    accountTruth: 'proven',
    requiredCapability,
    rootIdentity: g.rootIdentity,
    publicationGeneration: g.publicationGeneration,
    acquiredAt: 1000,
  });
}

function isExactCurrent(g, c) {
  const a = g.currentAuth;
  return Boolean(a && a.authRecordId === c.authRecordId && a.authGeneration === c.authGeneration);
}

function admitFirstMutation(g, c) {
  if (!isExactCurrent(g, c)) fail('AUTH_CONTEXT_STALE');
  if (g.currentAuth.accountUid !== c.accountUid) fail('ACCOUNT_CHANGED');
  if (g.rootIdentity !== c.rootIdentity) fail('ROOT_CHANGED');
  if (!g.currentAuth.capabilities.has(c.requiredCapability)) fail('CAPABILITY_INSUFFICIENT');
  return true;
}

function makeCheckpoint(c, expectedObjectIdentity = 'sha256:pdf-A', expectedBytes = 100) {
  return {
    physicalOperationId: c.physicalOperationId,
    contextId: c.contextId,
    authRecordId: c.authRecordId,
    authGeneration: c.authGeneration,
    accountUid: c.accountUid,
    requiredCapability: c.requiredCapability,
    capabilityBasis: 'exact-context-admission',
    rootIdentity: c.rootIdentity,
    targetPathIdentity: `${c.rootIdentity}/Upload/a.pdf`,
    expectedObjectIdentity,
    expectedBytes,
    phase: 'prepared',
    attemptCount: 0,
    createdAt: 1000,
    updatedAt: 1000,
  };
}

function persistStartedUnknown(cp) {
  if (cp.phase !== 'prepared') fail('PHASE_NOT_PREPARED');
  cp.phase = 'started-unknown';
  cp.attemptCount += 1;
  cp.updatedAt += 1;
  return structuredClone(cp);
}

function mayBlindRetry(cp) {
  return cp.phase === 'prepared';
}

function reconciliationAdmission(cp, observer) {
  if (!observer) return { allowed: false, reason: 'auth-missing' };
  if (observer.accountTruth !== 'proven') return { allowed: false, reason: 'account-unproven' };
  if (observer.accountUid !== cp.accountUid) return { allowed: false, reason: 'different-account' };
  if (!observer.capabilities.has('read')) return { allowed: false, reason: 'read-capability-missing' };
  return { allowed: true, mode: 'read-only' };
}

function classifyObservedObject(cp, observed) {
  if (!observed) return 'proven-absent';
  if (observed.path !== cp.targetPathIdentity) return 'different-object';
  if (!(Number(observed.size) > 0) || Number(observed.size) !== cp.expectedBytes) return 'not-proven';
  if (!observed.contentIdentity) return 'size-only-not-proven';
  return observed.contentIdentity === cp.expectedObjectIdentity ? 'proven-success' : 'content-mismatch';
}

function freshRetry(cp, freshContext, absenceProof) {
  if (cp.phase !== 'started-unknown') fail('RETRY_NOT_FROM_UNKNOWN');
  if (absenceProof !== 'proven-absent') fail('ABSENCE_NOT_PROVEN');
  if (!freshContext || freshContext.physicalOperationId === cp.physicalOperationId) fail('FRESH_PHYSICAL_OPERATION_REQUIRED');
  return makeCheckpoint(freshContext, cp.expectedObjectIdentity, cp.expectedBytes);
}

function publicationAdmission(g, uploadCp, context) {
  if (uploadCp.phase !== 'proven-success') fail('UPLOAD_NOT_PROVEN');
  if (g.publicationGeneration !== context.publicationGeneration) fail('PUBLICATION_GENERATION_STALE');
  return {
    physicalOperationId: `${uploadCp.physicalOperationId}:publish:${g.publicationGeneration}`,
    phase: 'prepared',
    parentPhysicalOperationId: uploadCp.physicalOperationId,
    publicationGeneration: g.publicationGeneration,
  };
}

function exact401Demotion(g, observed) {
  const a = g.currentAuth;
  if (!a) return false;
  if (a.authRecordId !== observed.authRecordId || a.authGeneration !== observed.authGeneration) return false;
  g.currentAuth = null;
  g.disconnectedGeneration = Math.max(g.disconnectedGeneration, observed.authGeneration + 1);
  return true;
}

function durableProjection(cp) {
  return structuredClone(cp);
}

(function main() {
  const head = git('rev-parse', 'HEAD');
  check(HEX40.test(head), 'exact checkout SHA');
  check(isAncestor(BASELINE), 'research checkout descends from exact canonical baseline');
  check(objectExists(P0_074_HEAD), 'immutable P0-074 historical head is available');
  check(objectExists(C0_C1_HEAD), 'immutable C0/C1 historical head is available');
  check(objectExists(WAVE1_CONTEXT_HEAD), 'immutable Wave1 context/effect historical head is available');

  const worker = read('service-worker.js');
  const registry = read('project_docs/RESEARCH_REGISTRY.md');
  const evidence = read('project_docs/RESEARCH_AUTH_CONTEXT_REMOTE_EFFECT_ADMISSION_2026-09-10_EVIDENCE.md');
  const w5 = read('project_docs/RESEARCH_W5_FIXED_REDIRECT_AUTH_CORE_REFINEMENT_2026-09-10_EVIDENCE.md');
  const sizeTest = read('project_tools/test_yandex_exact_remote_size.js');
  const dag = read('project_docs/RESEARCH_P1_231_CONSOLIDATED_IMPLEMENTATION_DAG_2026-09-10_EVIDENCE.md');

  // Exact current-source/current-authority facts.
  check(worker.includes('const JOURNAL_DB_VERSION = 8;'), 'current Journal uses v8 for detached destructive receipts');
  check(worker.includes("const JOURNAL_PENDING_REMOTE_STORE = 'pendingRemoteSaves';"), 'current pendingRemoteSaves integration surface exists');
  check(worker.includes('async function recoverPendingRemoteSaves'), 'current remote-save recovery exists');
  check(worker.includes('async function uploadCachedRecordToYandex'), 'current remote upload path exists');
  check(worker.includes('async function yandexApi'), 'current global Yandex API helper exists');
  check(worker.includes('getValidYandexAccessToken()'), 'current Yandex API path can acquire current-global auth');
  check(sizeTest.includes('assertExactYandexRemoteByteSize'), 'current exact positive byte-size checker is covered');
  check(sizeTest.includes('expectedPdfBytes, metadata?.size'), 'current upload verification compares expected and remote bytes');
  check(!sizeTest.includes('sha256'), 'current remote-size regression is not a content-hash proof');
  check(registry.includes('| P0-074 | ACTIVE |'), 'P0-074 remains active existing owner');
  check(registry.includes('| P1-090 | ACTIVE |'), 'P1-090 remains active existing owner');
  check(registry.includes('| P1-165 | ACTIVE |'), 'P1-165 remains active/unresolved');
  check(registry.includes('| P1-178 | ACTIVE |'), 'P1-178 remains active existing owner');
  check(registry.includes('| P1-184 | ACTIVE |'), 'P1-184 remains active existing owner');
  check(registry.includes('| P1-195 | ACTIVE |'), 'P1-195 remains active existing owner');
  check(registry.includes('| P1-196 | IMPLEMENTED / RELEASE-REGRESSION |'), 'P1-196 remains explicit implemented late owner');
  check(registry.includes('| P1-198 | ACTIVE |'), 'P1-198 remains active existing owner');
  check(w5.includes('authRecordId'), 'canonical W5 research supplies authRecordId target');
  check(w5.includes('authGeneration'), 'canonical W5 research supplies shared authGeneration target');
  check(w5.includes('full | reduced | unknown'), 'canonical W5 research supplies tri-state capability target');
  check(w5.includes('NOT OBSERVED AUTHORITY'), 'canonical W5 does not fabricate returned-state authority');
  check(dag.includes('EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION'), 'S2 remains explicitly fenced');
  check(evidence.includes('JOURNAL_DB_VERSION = 7'), 'evidence preserves current Journal v7 authority');
  check(evidence.includes('size + same byte count != exact content proof') || evidence.includes('same path + same byte count != exact content proof'), 'evidence distinguishes byte-size from exact content proof');
  check(evidence.includes('P1-165 = unresolved'), 'evidence preserves unresolved P1-165');

  // E01: exact current, proven account, sufficient write capability admits.
  {
    const A = auth('A', 7, 'uid-X', ['read', 'write', 'info']);
    const g = globalState(A, 'root-R');
    const c = acquireContext(g, 'op-1', 'write');
    eq(admitFirstMutation(g, c), true);
    eq(c.authRecordId, 'A');
    eq(c.authGeneration, 7);
    eq(c.accountUid, 'uid-X');
    eq(c.rootIdentity, 'root-R');
  }

  // E02/E03/E04/E05: stale authority before first mutation denies.
  {
    const A = auth('A', 7, 'uid-X', ['read', 'write']);
    const g = globalState(A, 'root-R');
    const c = acquireContext(g, 'op-stale', 'write');
    g.currentAuth = auth('B', 8, 'uid-X', ['read', 'write']);
    throwsCode(() => admitFirstMutation(g, c), 'AUTH_CONTEXT_STALE');
  }
  {
    const A = auth('A', 7, 'uid-X', ['read', 'write']);
    const g = globalState(A, 'root-R');
    const c = acquireContext(g, 'op-disconnect', 'write');
    g.currentAuth = null;
    throwsCode(() => admitFirstMutation(g, c), 'AUTH_CONTEXT_STALE');
  }
  {
    const A = auth('A', 7, 'uid-X', ['read', 'write']);
    const g = globalState(A, 'root-R');
    const c = acquireContext(g, 'op-account', 'write');
    g.currentAuth = auth('B', 8, 'uid-Y', ['read', 'write']);
    throwsCode(() => admitFirstMutation(g, c), 'AUTH_CONTEXT_STALE');
  }
  {
    const A = auth('A', 7, 'uid-X', ['read', 'write']);
    const g = globalState(A, 'root-R');
    const c = acquireContext(g, 'op-root', 'write');
    g.rootIdentity = 'root-S';
    throwsCode(() => admitFirstMutation(g, c), 'ROOT_CHANGED');
  }

  // E06/E07: unknown/reduced capability cannot authorize write.
  {
    const g = globalState(auth('A', 1, 'uid-X', []));
    throwsCode(() => acquireContext(g, 'op-no-cap', 'write'), 'CAPABILITY_INSUFFICIENT');
  }
  {
    const g = globalState(auth('A', 1, 'uid-X', ['read']));
    throwsCode(() => acquireContext(g, 'op-reduced', 'write'), 'CAPABILITY_INSUFFICIENT');
  }

  // Unproven account cannot produce operation authority.
  {
    const A = auth('A', 1, 'uid-X', ['write']);
    A.accountTruth = 'unknown';
    const g = globalState(A);
    throwsCode(() => acquireContext(g, 'op-account-unknown', 'write'), 'ACCOUNT_UNPROVEN');
  }

  // E08-E10: started-unknown must precede transport and forbids blind retry/rebinding.
  {
    const A = auth('A', 4, 'uid-X', ['read', 'write']);
    const g = globalState(A, 'root-R');
    const c = acquireContext(g, 'op-unknown', 'write');
    const cp = makeCheckpoint(c);
    eq(cp.phase, 'prepared');
    eq(mayBlindRetry(cp), true, 'no provider mutation is possible yet in prepared state');
    const persisted = persistStartedUnknown(cp);
    eq(persisted.phase, 'started-unknown', 'unknown-risk checkpoint exists before transport');
    eq(persisted.attemptCount, 1);
    eq(mayBlindRetry(cp), false, 'unknown settlement cannot be blindly replayed');
    g.currentAuth = auth('B', 5, 'uid-X', ['read', 'write']);
    eq(cp.authRecordId, 'A', 'old possible effect remains bound to A observation identity');
    eq(cp.authGeneration, 4, 'old possible effect retains original generation');
    eq(cp.rootIdentity, 'root-R', 'old possible effect retains original root');
  }

  // E11-E13: same-account newer read credential may reconcile, never mutate; different account cannot.
  {
    const cp = makeCheckpoint(acquireContext(globalState(auth('A', 2, 'uid-X', ['write'])), 'op-r1', 'write'));
    persistStartedUnknown(cp);
    deepEq(reconciliationAdmission(cp, auth('B', 3, 'uid-X', ['read'])), { allowed: true, mode: 'read-only' });
    deepEq(reconciliationAdmission(cp, auth('B', 3, 'uid-X', ['write'])), { allowed: false, reason: 'read-capability-missing' });
    deepEq(reconciliationAdmission(cp, auth('C', 4, 'uid-Y', ['read', 'write'])), { allowed: false, reason: 'different-account' });
    const unknown = auth('D', 5, 'uid-X', ['read']);
    unknown.accountTruth = 'unknown';
    deepEq(reconciliationAdmission(cp, unknown), { allowed: false, reason: 'account-unproven' });
  }

  // E14/E15: durable checkpoint survives restart but has no secret/mutation authority.
  {
    const c = acquireContext(globalState(auth('A', 9, 'uid-X', ['read', 'write'])), 'op-restart', 'write');
    const cp = makeCheckpoint(c);
    persistStartedUnknown(cp);
    const disk = durableProjection(cp);
    check(!Object.prototype.hasOwnProperty.call(disk, 'accessToken'), 'checkpoint excludes access token');
    check(!Object.prototype.hasOwnProperty.call(disk, 'Authorization'), 'checkpoint excludes Authorization header');
    check(!Object.prototype.hasOwnProperty.call(disk, 'refreshToken'), 'checkpoint excludes refresh token');
    check(!Object.prototype.hasOwnProperty.call(disk, 'codeVerifier'), 'checkpoint excludes code verifier');
    check(!Object.prototype.hasOwnProperty.call(disk, 'signedUrl'), 'checkpoint excludes signed upload URL');
    deepEq(reconciliationAdmission(disk, auth('B', 10, 'uid-X', ['read'])), { allowed: true, mode: 'read-only' });
  }

  // E16/E17: old-context 401 cannot demote newer current auth; exact-current can.
  {
    const g = globalState(auth('B', 8, 'uid-X', ['read', 'write']));
    eq(exact401Demotion(g, { authRecordId: 'A', authGeneration: 7 }), false);
    eq(g.currentAuth.authRecordId, 'B');
    eq(exact401Demotion(g, { authRecordId: 'B', authGeneration: 8 }), true);
    eq(g.currentAuth, null);
  }

  // E29/E34-E36: path+size is not exact effect/content proof.
  {
    const c = acquireContext(globalState(auth('A', 1, 'uid-X', ['write'])), 'op-content', 'write');
    const cp = makeCheckpoint(c, 'sha256:expected', 123);
    persistStartedUnknown(cp);
    eq(classifyObservedObject(cp, null), 'proven-absent');
    eq(classifyObservedObject(cp, { path: cp.targetPathIdentity, size: 123 }), 'size-only-not-proven');
    eq(classifyObservedObject(cp, { path: cp.targetPathIdentity, size: 124, contentIdentity: 'sha256:expected' }), 'not-proven');
    eq(classifyObservedObject(cp, { path: cp.targetPathIdentity, size: 123, contentIdentity: 'sha256:other' }), 'content-mismatch');
    eq(classifyObservedObject(cp, { path: cp.targetPathIdentity, size: 123, contentIdentity: 'sha256:expected' }), 'proven-success');
    eq(classifyObservedObject(cp, { path: 'root-Z/other.pdf', size: 123, contentIdentity: 'sha256:expected' }), 'different-object');
  }

  // E37: root change after started-unknown cannot rewrite historical target.
  {
    const g = globalState(auth('A', 1, 'uid-X', ['write']), 'root-R');
    const cp = makeCheckpoint(acquireContext(g, 'op-root-late', 'write'));
    persistStartedUnknown(cp);
    g.rootIdentity = 'root-S';
    eq(cp.rootIdentity, 'root-R');
    eq(cp.targetPathIdentity.startsWith('root-R/'), true);
  }

  // E38: stronger newer auth does not mutate old checkpoint binding.
  {
    const g = globalState(auth('A', 1, 'uid-X', ['write']));
    const cp = makeCheckpoint(acquireContext(g, 'op-no-rebind', 'write'));
    persistStartedUnknown(cp);
    g.currentAuth = auth('B', 2, 'uid-X', ['read', 'write', 'info']);
    eq(cp.authRecordId, 'A');
    eq(cp.authGeneration, 1);
  }

  // E40-E42: retry only after proven absence and with fresh physical operation identity.
  {
    const g = globalState(auth('A', 1, 'uid-X', ['read', 'write']));
    const old = makeCheckpoint(acquireContext(g, 'op-old', 'write'));
    persistStartedUnknown(old);
    const fresh = acquireContext(g, 'op-new', 'write');
    throwsCode(() => freshRetry(old, fresh, 'unknown'), 'ABSENCE_NOT_PROVEN');
    const retry = freshRetry(old, fresh, 'proven-absent');
    eq(retry.physicalOperationId, 'op-new');
    eq(retry.phase, 'prepared');
    const same = { ...fresh, physicalOperationId: 'op-old' };
    throwsCode(() => freshRetry(old, same, 'proven-absent'), 'FRESH_PHYSICAL_OPERATION_REQUIRED');
  }

  // E25-E28: publication is a separate generation-fenced child effect; Journal authority is separate.
  {
    const g = globalState(auth('A', 1, 'uid-X', ['read', 'write']), 'root-R', 3);
    const c = acquireContext(g, 'op-upload', 'write');
    const upload = makeCheckpoint(c);
    upload.phase = 'proven-success';
    const publication = publicationAdmission(g, upload, c);
    check(publication.physicalOperationId !== upload.physicalOperationId, 'publication has separate physical identity');
    eq(publication.parentPhysicalOperationId, upload.physicalOperationId);
    eq(publication.phase, 'prepared');
    g.publicationGeneration = 4;
    throwsCode(() => publicationAdmission(g, upload, c), 'PUBLICATION_GENERATION_STALE');
    eq(upload.phase, 'proven-success', 'stale publication does not change upload truth');
  }

  // Explicit evidence-boundary assertions.
  check(evidence.includes('remote effect proven-success != automatic Journal write authority'), 'provider success and Journal authority remain separate');
  check(evidence.includes('J0-v8 fields'), 'future v8 authority is explicitly deferred');
  check(evidence.includes('READ-ONLY RECONCILIATION ONLY'), 'same-account newer credentials are observation-only for old effect');
  check(evidence.includes('NO RETARGET'), 'old possible effect cannot be retargeted after root change');
  check(evidence.includes('S2                                        = NOT AUTHORIZED'), 'evidence keeps S2 unauthorized');
  check(evidence.includes('Real Yandex L5: **NOT RUN**'), 'provider L5 is not claimed');
  check(!evidence.includes('product ZIP was built'), 'no product ZIP claim');

  console.log(
    `Auth-context remote-effect admission model: PASS; cases=${cases}; ` +
    `live_context=memory-only; checkpoint=non-secret; started_unknown=pre-transport; ` +
    `reconcile=same-account-read-only; content_identity=size-not-enough; journal=v7-current; ` +
    `p1_165=unresolved; returned_state_authority=false; s2_authorized=false; head=${head}`
  );
})();
