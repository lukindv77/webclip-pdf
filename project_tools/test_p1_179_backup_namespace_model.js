'use strict';
const assert = require('assert');

function currentRecover(pending, currentScope) {
  const allowedPrefix = `${currentScope.rootPath}/Backup/Journal/`;
  if (!pending.remotePath.startsWith(allowedPrefix)) return { outcome: 'deleted-as-invalid' };
  return { outcome: 'probe-current-account', accountUid: currentScope.accountUid, path: pending.remotePath };
}

function sameScope(a, b) {
  return a && b && a.accountUid === b.accountUid && a.rootPath === b.rootPath;
}
function targetRecover(pending, liveScope) {
  if (!pending.scope) return { outcome: 'manual-missing-scope' };
  if (!sameScope(pending.scope, liveScope)) return { outcome: 'deferred-foreign-namespace', remoteCall: false };
  return { outcome: 'reconcile-own-namespace', remoteCall: true, scope: pending.scope };
}
function renewLease(lease, liveScope) {
  if (!sameScope(lease.scope, liveScope)) return { outcome: 'scope-mismatch', renewed: false };
  return { outcome: 'renewed', renewed: true };
}

{
  const pending = { remotePath: '/RA/Backup/Journal/A.json' };
  assert.equal(currentRecover(pending, { accountUid: 'A', rootPath: '/RB' }).outcome, 'deleted-as-invalid');
}

{
  const pending = { remotePath: '/R/Backup/Journal/A.json' };
  const r = currentRecover(pending, { accountUid: 'B', rootPath: '/R' });
  assert.equal(r.outcome, 'probe-current-account');
  assert.equal(r.accountUid, 'B');
}

{
  const pending = { remotePath: '/R/Backup/Journal/A.json', scope: { accountUid: 'A', rootPath: '/R' } };
  const r = targetRecover(pending, { accountUid: 'B', rootPath: '/R' });
  assert.equal(r.outcome, 'deferred-foreign-namespace');
  assert.equal(r.remoteCall, false);
}

{
  const scope = { accountUid: 'A', rootPath: '/RA' };
  const pending = { remotePath: '/RA/Backup/Journal/A.json', scope };
  const r = targetRecover(pending, scope);
  assert.equal(r.outcome, 'reconcile-own-namespace');
  assert.equal(r.remoteCall, true);
}

{
  const lease = { token: 'L', scope: { accountUid: 'A', rootPath: '/RA' } };
  assert.equal(renewLease(lease, { accountUid: 'B', rootPath: '/RB' }).outcome, 'scope-mismatch');
}

console.log('P1-179 backup namespace model: PASS');
