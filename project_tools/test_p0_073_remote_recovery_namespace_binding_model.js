'use strict';

// P0-073 deterministic research model: remote-save recovery must remain bound
// to the account/root namespace captured by the durable checkpoint.

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

function normalizePath(value) {
  const raw = String(value || '').trim().replace(/\\/g, '/');
  if (!raw) return '';
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
  return withSlash.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}

function isWithinRoot(path, root) {
  const p = normalizePath(path);
  const r = normalizePath(root);
  return Boolean(p && r && (p === r || p.startsWith(`${r}/`)));
}

function namespaceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function makeRemote({ resourceId, size = 1000, publicUrl = '' } = {}) {
  return { type: 'file', resourceId: String(resourceId || ''), size, publicUrl: String(publicUrl || '') };
}

function makeContext(accountUid, rootPath, files = {}) {
  return { accountUid, rootPath: normalizePath(rootPath), files: new Map(Object.entries(files)), published: [] };
}

function makeCheckpoint(overrides = {}) {
  const { data: dataOverrides = {}, ...topOverrides } = overrides;
  return {
    id: 'cp-1',
    phase: 'prepared',
    expectedPdfBytes: 1000,
    createPublicLinks: true,
    operationId: 'op-A',
    ...topOverrides,
    data: {
      destination: 'yandex',
      journalEntryId: 'entry-A',
      accountUid: 'acct-A',
      rootPath: '/WebClip',
      remotePath: '/WebClip/Upload/example/a.pdf',
      publicUrl: '',
      resourceId: '',
      ...dataOverrides
    }
  };
}

// Mirrors the relevant current recovery semantics: any current auth is enough;
// recovery uses checkpoint.remotePath under the current account, checks type/size,
// may publish there, then combines observed identity with checkpoint metadata.
function currentStyleRecover(checkpoint, currentContext) {
  if (!currentContext || !currentContext.accountUid) throw namespaceError('AUTH_REQUIRED', 'auth required');
  const path = normalizePath(checkpoint.data.remotePath);
  const remote = currentContext.files.get(path);
  if (!remote || remote.type !== 'file') throw namespaceError('REMOTE_NOT_FOUND', 'remote file missing');
  if (Number(remote.size) !== Number(checkpoint.expectedPdfBytes)) throw namespaceError('SIZE_MISMATCH', 'size mismatch');
  let publicUrl = remote.publicUrl;
  if (checkpoint.createPublicLinks && !publicUrl) {
    publicUrl = `https://public.example/${currentContext.accountUid}/${remote.resourceId}`;
    currentContext.published.push({ path, resourceId: remote.resourceId });
  }
  return {
    destination: 'yandex',
    id: checkpoint.data.journalEntryId,
    remotePath: path,
    accountUid: checkpoint.data.accountUid,
    rootPath: normalizePath(checkpoint.data.rootPath),
    resourceId: remote.resourceId,
    publicUrl
  };
}

function assertCheckpointNamespace(checkpoint, currentContext) {
  const expectedAccount = String(checkpoint?.data?.accountUid || '').trim();
  const expectedRoot = normalizePath(checkpoint?.data?.rootPath);
  const remotePath = normalizePath(checkpoint?.data?.remotePath);
  if (!expectedAccount) throw namespaceError('NAMESPACE_ACCOUNT_UNKNOWN', 'checkpoint has no account binding');
  if (!expectedRoot) throw namespaceError('NAMESPACE_ROOT_UNKNOWN', 'checkpoint has no root binding');
  if (!remotePath || !isWithinRoot(remotePath, expectedRoot)) {
    throw namespaceError('NAMESPACE_PATH_OUTSIDE_ROOT', 'checkpoint path is outside bound root');
  }
  if (!currentContext || !currentContext.accountUid) throw namespaceError('AUTH_REQUIRED', 'auth required');
  if (String(currentContext.accountUid) !== expectedAccount) {
    throw namespaceError('NAMESPACE_ACCOUNT_MISMATCH', 'current account differs from checkpoint account');
  }
  return { accountUid: expectedAccount, rootPath: expectedRoot, remotePath };
}

function candidateRecover(checkpoint, currentContext) {
  const binding = assertCheckpointNamespace(checkpoint, currentContext);
  const remote = currentContext.files.get(binding.remotePath);
  if (!remote || remote.type !== 'file') throw namespaceError('REMOTE_NOT_FOUND', 'remote file missing');
  if (Number(remote.size) !== Number(checkpoint.expectedPdfBytes)) throw namespaceError('SIZE_MISMATCH', 'size mismatch');
  let publicUrl = remote.publicUrl;
  if (checkpoint.createPublicLinks && !publicUrl) {
    publicUrl = `https://public.example/${binding.accountUid}/${remote.resourceId}`;
    currentContext.published.push({ path: binding.remotePath, resourceId: remote.resourceId });
  }
  return {
    destination: 'yandex',
    id: checkpoint.data.journalEntryId,
    remotePath: binding.remotePath,
    accountUid: binding.accountUid,
    rootPath: binding.rootPath,
    resourceId: remote.resourceId,
    publicUrl
  };
}

const path = '/WebClip/Upload/example/a.pdf';
const ctxA = makeContext('acct-A', '/WebClip', { [path]: makeRemote({ resourceId: 'RID-A', size: 1000 }) });
const ctxB = makeContext('acct-B', '/WebClip', { [path]: makeRemote({ resourceId: 'RID-B', size: 1000 }) });
const cpA = makeCheckpoint();

// 1) Current behavior can consume B using A checkpoint when path+size collide.
const hybrid = currentStyleRecover(cpA, ctxB);
eq(hybrid.accountUid, 'acct-A', 'current hybrid keeps checkpoint account A');
eq(hybrid.rootPath, '/WebClip', 'current hybrid keeps checkpoint root A');
eq(hybrid.resourceId, 'RID-B', 'current hybrid adopts B resource identity');
ok(hybrid.publicUrl.includes('acct-B/RID-B'), 'current hybrid can publish B object');
eq(ctxB.published.length, 1, 'current recovery performs publication in B');
eq(ctxA.published.length, 0, 'A object was not published by the B recovery');

// 2) Candidate rejects cross-account recovery before any read/publication side effect.
const ctxB2 = makeContext('acct-B', '/WebClip', { [path]: makeRemote({ resourceId: 'RID-B2', size: 1000 }) });
throwsCode(() => candidateRecover(cpA, ctxB2), 'NAMESPACE_ACCOUNT_MISMATCH', 'candidate cross-account fence');
eq(ctxB2.published.length, 0, 'cross-account candidate does not publish');

// 3) Same textual root does not make two accounts the same namespace.
eq(ctxA.rootPath, ctxB.rootPath, 'control: textual roots are equal');
ok(ctxA.accountUid !== ctxB.accountUid, 'control: account namespaces differ');

// 4) Missing account binding is unknown, not wildcard.
const noAccount = makeCheckpoint({ data: { accountUid: '' } });
const ctxAny = makeContext('acct-B', '/WebClip', { [path]: makeRemote({ resourceId: 'RID-X' }) });
const wildcard = currentStyleRecover(noAccount, ctxAny);
eq(wildcard.accountUid, '', 'current style preserves empty legacy account while adopting current object');
eq(wildcard.resourceId, 'RID-X', 'current style can adopt current-account object for unbound checkpoint');
throwsCode(() => candidateRecover(noAccount, ctxAny), 'NAMESPACE_ACCOUNT_UNKNOWN', 'candidate rejects missing account binding');

// 5) Missing root binding is unknown, not wildcard.
const noRoot = makeCheckpoint({ data: { rootPath: '' } });
throwsCode(() => candidateRecover(noRoot, ctxA), 'NAMESPACE_ROOT_UNKNOWN', 'candidate rejects missing root binding');

// 6) Bound root must actually contain the remote path.
const outside = makeCheckpoint({ data: { rootPath: '/WebClip', remotePath: '/OtherRoot/Upload/example/a.pdf' } });
const ctxAOutside = makeContext('acct-A', '/WebClip', {
  '/OtherRoot/Upload/example/a.pdf': makeRemote({ resourceId: 'RID-OUT', size: 1000 })
});
const currentOutside = currentStyleRecover(outside, ctxAOutside);
eq(currentOutside.resourceId, 'RID-OUT', 'current style does not enforce root containment');
throwsCode(() => candidateRecover(outside, ctxAOutside), 'NAMESPACE_PATH_OUTSIDE_ROOT', 'candidate enforces root containment');

// 7) Exact bound namespace succeeds even if path contains nested site folders.
const ctxA2 = makeContext('acct-A', '/WebClip', { [path]: makeRemote({ resourceId: 'RID-A2', size: 1000, publicUrl: 'https://public.example/A2' }) });
const exact = candidateRecover(cpA, ctxA2);
eq(exact.accountUid, 'acct-A', 'candidate exact account');
eq(exact.rootPath, '/WebClip', 'candidate exact root');
eq(exact.remotePath, path, 'candidate exact path');
eq(exact.resourceId, 'RID-A2', 'candidate exact resource');
eq(exact.publicUrl, 'https://public.example/A2', 'candidate preserves observed public URL');
eq(ctxA2.published.length, 0, 'existing public link needs no new publish');

// 8) Size remains necessary but is not namespace identity.
const ctxBWrongSize = makeContext('acct-B', '/WebClip', { [path]: makeRemote({ resourceId: 'RID-B3', size: 999 }) });
throwsCode(() => currentStyleRecover(cpA, ctxBWrongSize), 'SIZE_MISMATCH', 'current style rejects different size');
const ctxBSameSize = makeContext('acct-B', '/WebClip', { [path]: makeRemote({ resourceId: 'RID-B4', size: 1000 }) });
const sameSizeHybrid = currentStyleRecover(cpA, ctxBSameSize);
eq(sameSizeHybrid.resourceId, 'RID-B4', 'same size still permits cross-account hybrid today');
throwsCode(() => candidateRecover(cpA, ctxBSameSize), 'NAMESPACE_ACCOUNT_MISMATCH', 'candidate rejects same-size cross-account object');

// 9) Lack of current auth defers rather than guesses namespace.
throwsCode(() => candidateRecover(cpA, null), 'AUTH_REQUIRED', 'candidate requires an authenticated namespace');

// 10) Root normalization cannot erase account identity.
const normalized = makeCheckpoint({ data: { rootPath: 'WebClip/', remotePath: 'WebClip/Upload/example/a.pdf' } });
const normalizedExact = candidateRecover(normalized, ctxA2);
eq(normalizedExact.rootPath, '/WebClip', 'root normalization remains deterministic');
eq(normalizedExact.remotePath, path, 'path normalization remains deterministic');
throwsCode(() => candidateRecover(normalized, ctxB2), 'NAMESPACE_ACCOUNT_MISMATCH', 'normalized path/root still reject other account');

// 11) Disabled publication still must be namespace-bound.
const privateCp = makeCheckpoint({ createPublicLinks: false });
const ctxBPrivate = makeContext('acct-B', '/WebClip', { [path]: makeRemote({ resourceId: 'RID-BP', size: 1000 }) });
const privateHybrid = currentStyleRecover(privateCp, ctxBPrivate);
eq(privateHybrid.resourceId, 'RID-BP', 'current private recovery can still adopt B resource');
eq(privateHybrid.publicUrl, '', 'publication disabled control');
eq(ctxBPrivate.published.length, 0, 'publication disabled causes no publish');
throwsCode(() => candidateRecover(privateCp, ctxBPrivate), 'NAMESPACE_ACCOUNT_MISMATCH', 'namespace fence is independent of publication policy');

// 12) Operation id equality is not namespace authority.
const reusedOp = makeCheckpoint({ operationId: 'same-op-id' });
const ctxBOp = makeContext('acct-B', '/WebClip', { [path]: makeRemote({ resourceId: 'RID-BOP' }) });
throwsCode(() => candidateRecover(reusedOp, ctxBOp), 'NAMESPACE_ACCOUNT_MISMATCH', 'operation id cannot rebind namespace');
eq(reusedOp.operationId, 'same-op-id', 'operation id control retained');

// 13) Changing only account must fail; changing only remote object within exact namespace
// is an object-identity question owned by P1-184, not silently solved by P0-073.
const ctxANewObject = makeContext('acct-A', '/WebClip', { [path]: makeRemote({ resourceId: 'RID-A-OTHER', size: 1000 }) });
const namespaceOnly = candidateRecover(cpA, ctxANewObject);
eq(namespaceOnly.accountUid, 'acct-A', 'namespace gate accepts exact account');
eq(namespaceOnly.resourceId, 'RID-A-OTHER', 'namespace gate alone does not prove exact physical object');
ok(namespaceOnly.resourceId !== 'RID-A', 'control demonstrates P1-184 remains separate');

// 14) Checkpoint-bound root remains authority even if current configured root is different;
// P0-074 decides config-generation supersession. P0-073 only prevents namespace rebind.
const ctxASameAccountDifferentConfiguredRoot = makeContext('acct-A', '/AnotherConfiguredRoot', {
  [path]: makeRemote({ resourceId: 'RID-A3', size: 1000 })
});
const originalRootRecovery = candidateRecover(cpA, ctxASameAccountDifferentConfiguredRoot);
eq(originalRootRecovery.rootPath, '/WebClip', 'P0-073 preserves checkpoint root rather than rebinding to current configured root');
eq(originalRootRecovery.resourceId, 'RID-A3', 'same account can observe original bound path in namespace model');

// 15) A malicious/malformed relative sibling cannot pass containment after normalization.
const sibling = makeCheckpoint({ data: { rootPath: '/WebClip', remotePath: '/WebClip-Evil/Upload/a.pdf' } });
throwsCode(() => candidateRecover(sibling, makeContext('acct-A', '/WebClip', {
  '/WebClip-Evil/Upload/a.pdf': makeRemote({ resourceId: 'RID-SIB' })
})), 'NAMESPACE_PATH_OUTSIDE_ROOT', 'prefix sibling is outside root');

// 16) Empty remote path fails containment before remote access.
const emptyPath = makeCheckpoint({ data: { remotePath: '' } });
throwsCode(() => candidateRecover(emptyPath, ctxA2), 'NAMESPACE_PATH_OUTSIDE_ROOT', 'empty remote path is invalid');

// 17) Candidate publication, when needed, occurs only in exact bound account.
const ctxAPublish = makeContext('acct-A', '/WebClip', { [path]: makeRemote({ resourceId: 'RID-AP', size: 1000 }) });
const publishedA = candidateRecover(cpA, ctxAPublish);
eq(ctxAPublish.published.length, 1, 'exact namespace may publish');
eq(ctxAPublish.published[0].resourceId, 'RID-AP', 'published exact namespace object');
ok(publishedA.publicUrl.includes('acct-A/RID-AP'), 'public URL belongs to exact namespace model');

// 18) Durable account/root fields must survive local finalization unchanged.
eq(publishedA.accountUid, cpA.data.accountUid, 'finalized entry keeps checkpoint account binding');
eq(publishedA.rootPath, normalizePath(cpA.data.rootPath), 'finalized entry keeps checkpoint root binding');

console.log(`PASS ${checks} checks`);
