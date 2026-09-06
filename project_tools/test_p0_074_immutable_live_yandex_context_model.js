'use strict';

const assert = require('node:assert/strict');

function acquireContext(authSnapshot, configSnapshot, identityByToken) {
  const token = String(authSnapshot?.accessToken || '');
  if (!token) return { outcome: 'auth-unavailable', context: null };
  const accountUid = String(identityByToken(token) || '');
  if (!accountUid) return { outcome: 'identity-unverified', context: null };
  return {
    outcome: 'ready',
    context: Object.freeze({
      version: 1,
      accessToken: token,
      accountUid,
      rootPath: String(configSnapshot?.rootPath || ''),
      createPublicLinks: Boolean(configSnapshot?.createPublicLinks)
    })
  };
}

function admitExpectedScope(expectedScope, context) {
  if (!context) return 'deferred-auth-unavailable';
  if (String(expectedScope?.accountUid || '') !== context.accountUid) return 'deferred-account-mismatch';
  return 'admitted-live-context';
}

function makeContextApi(callLog) {
  return async function api(context, endpoint, { method = 'GET', path = '' } = {}) {
    assert.ok(Object.isFrozen(context), 'live context must be frozen');
    callLog.push({ token: context.accessToken, accountUid: context.accountUid, rootPath: context.rootPath, endpoint, method, path });
    return { ok: true, accountUid: context.accountUid, endpoint, path };
  };
}

function durableScopeFromContext(context) {
  return {
    version: 1,
    accountUid: context.accountUid,
    rootPath: context.rootPath
  };
}

(async function tokenSwitchCannotMixOneOperation() {
  const globals = {
    auth: { accessToken: 'token-A' },
    config: { rootPath: '/RA', createPublicLinks: true }
  };
  const identityByToken = (token) => ({ 'token-A': 'A', 'token-B': 'B' }[token] || '');
  const acquired = acquireContext({ ...globals.auth }, { ...globals.config }, identityByToken);
  assert.equal(acquired.outcome, 'ready');
  const ctx = acquired.context;

  globals.auth = { accessToken: 'token-B' };
  globals.config = { rootPath: '/RB', createPublicLinks: false };

  const calls = [];
  const api = makeContextApi(calls);
  await api(ctx, '/resources/upload', { method: 'GET', path: '/RA/x.pdf' });
  await api(ctx, '/resources', { method: 'GET', path: '/RA/x.pdf' });
  await api(ctx, '/resources/publish', { method: 'PUT', path: '/RA/x.pdf' });
  await api(ctx, '/resources', { method: 'GET', path: '/RA/x.pdf' });

  assert.deepEqual(new Set(calls.map((x) => x.token)), new Set(['token-A']));
  assert.deepEqual(new Set(calls.map((x) => x.accountUid)), new Set(['A']));
  assert.deepEqual(new Set(calls.map((x) => x.rootPath)), new Set(['/RA']));
})();

(async function signedUploadVerificationStaysWithIssuingAccount() {
  const identityByToken = (token) => ({ 'token-A': 'A', 'token-B': 'B' }[token] || '');
  const { context: ctx } = acquireContext(
    { accessToken: 'token-A' },
    { rootPath: '/RA', createPublicLinks: false },
    identityByToken
  );
  const calls = [];
  const api = makeContextApi(calls);

  const uploadLink = await api(ctx, '/resources/upload', { method: 'GET', path: '/RA/x.pdf' });
  assert.equal(uploadLink.accountUid, 'A');

  // A signed upload URL is already an account-A capability. A later global auth
  // switch must not move post-PUT verification to B.
  const mutableCurrentAuth = { accessToken: 'token-B' };
  assert.equal(mutableCurrentAuth.accessToken, 'token-B');

  await api(ctx, '/resources', { method: 'GET', path: '/RA/x.pdf' });
  assert.deepEqual(calls.map((x) => x.accountUid), ['A', 'A']);
})();

(function expectedAccountMismatchDefersBeforeRemoteCalls() {
  const identityByToken = (token) => ({ 'token-B': 'B' }[token] || '');
  const { context } = acquireContext(
    { accessToken: 'token-B' },
    { rootPath: '/RB' },
    identityByToken
  );
  const admission = admitExpectedScope({ accountUid: 'A', rootPath: '/RA' }, context);
  assert.equal(admission, 'deferred-account-mismatch');
})();

(function sameAccountNewTokenMayBeUsedOnlyByNewRecoveryCycle() {
  const identityByToken = (token) => ({ 'token-A1': 'A', 'token-A2': 'A' }[token] || '');
  const first = acquireContext({ accessToken: 'token-A1' }, { rootPath: '/current-root-1' }, identityByToken).context;
  const second = acquireContext({ accessToken: 'token-A2' }, { rootPath: '/current-root-2' }, identityByToken).context;
  assert.equal(admitExpectedScope({ accountUid: 'A', rootPath: '/checkpoint-root' }, first), 'admitted-live-context');
  assert.equal(admitExpectedScope({ accountUid: 'A', rootPath: '/checkpoint-root' }, second), 'admitted-live-context');
  assert.equal(first.accessToken, 'token-A1');
  assert.equal(second.accessToken, 'token-A2');
  assert.notStrictEqual(first, second);
})();

(function contextTokenIsNeverPartOfDurableScope() {
  const identityByToken = () => 'A';
  const { context } = acquireContext(
    { accessToken: 'secret-token-A' },
    { rootPath: '/RA', createPublicLinks: true },
    identityByToken
  );
  const durable = durableScopeFromContext(context);
  assert.deepEqual(durable, { version: 1, accountUid: 'A', rootPath: '/RA' });
  assert.equal(JSON.stringify(durable).includes('secret-token-A'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(durable, 'accessToken'), false);
})();

(function rootChangesDoNotRewriteCapturedOperationConfig() {
  const identityByToken = () => 'A';
  const mutableConfig = { rootPath: '/RA', createPublicLinks: true };
  const { context } = acquireContext({ accessToken: 'token-A' }, { ...mutableConfig }, identityByToken);
  mutableConfig.rootPath = '/RB';
  mutableConfig.createPublicLinks = false;
  assert.equal(context.rootPath, '/RA');
  assert.equal(context.createPublicLinks, true);
})();

(function invalidOldContextMustNotSilentlyAdoptNewToken() {
  const oldContext = Object.freeze({ version: 1, accessToken: 'expired-A', accountUid: 'A', rootPath: '/RA' });
  const mutableCurrentAuth = { accessToken: 'token-B' };
  const onUnauthorized = (context) => ({ outcome: 'context-auth-invalid', retryToken: context.accessToken });
  const result = onUnauthorized(oldContext);
  assert.equal(result.outcome, 'context-auth-invalid');
  assert.equal(result.retryToken, 'expired-A');
  assert.notEqual(result.retryToken, mutableCurrentAuth.accessToken);
})();

console.log('P0-074 immutable live Yandex context model: PASS');
