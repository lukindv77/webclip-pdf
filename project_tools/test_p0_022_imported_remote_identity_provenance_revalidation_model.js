'use strict';

const assert = require('node:assert/strict');

let checks = 0;
function ok(v, m){ checks += 1; assert.ok(v, m); }
function eq(a,b,m){ checks += 1; assert.equal(a,b,m); }

function currentImport(raw={}) {
  return {
    remotePath: String(raw.remotePath || ''),
    publicUrl: String(raw.publicUrl || ''),
    resourceId: String(raw.resourceId || ''),
    accountUid: String(raw.accountUid || ''),
    rootPath: String(raw.rootPath || ''),
    imported: true,
    remoteIdentityProvenance: ''
  };
}

function currentDestructiveMatch(entry, candidate) {
  const expectedResourceId = String(entry.resourceId || '').trim();
  const expectedPublicUrl = String(entry.publicUrl || '').trim();
  const itemId = String(candidate.resourceId || '').trim();
  const itemPublic = String(candidate.publicUrl || '').trim();

  if (expectedResourceId) {
    if (itemId) {
      if (itemId !== expectedResourceId) return false;
      if (expectedPublicUrl && itemPublic && itemPublic !== expectedPublicUrl) return false;
      return true;
    }
    return Boolean(expectedPublicUrl && itemPublic && itemPublic === expectedPublicUrl);
  }
  if (expectedPublicUrl) return Boolean(itemPublic && itemPublic === expectedPublicUrl);
  return Boolean(entry.remotePath && candidate.path === entry.remotePath);
}

function verifiedReceipt({accountUid, rootPath, resourceId, path, publicUrl='', observedAt=1}) {
  if (!accountUid || !resourceId || !observedAt) return null;
  return Object.freeze({
    authority: 'yandex-api-observed-resource',
    accountUid, rootPath, resourceId, path, publicUrl, observedAt
  });
}

function candidateDestructiveAdmission(entry, observed, receipt) {
  if (!entry || !observed) return {ok:false, reason:'missing'};
  if (!receipt) return {ok:false, reason:'verified-receipt-required'};
  if (receipt.authority !== 'yandex-api-observed-resource') return {ok:false, reason:'bad-provenance'};
  if (receipt.accountUid !== observed.accountUid) return {ok:false, reason:'account-mismatch'};
  if (receipt.rootPath !== observed.rootPath) return {ok:false, reason:'root-mismatch'};
  if (receipt.resourceId !== observed.resourceId) return {ok:false, reason:'resource-mismatch'};
  if (entry.accountUid && entry.accountUid !== receipt.accountUid) return {ok:false, reason:'entry-account-conflict'};
  if (entry.rootPath && entry.rootPath !== receipt.rootPath) return {ok:false, reason:'entry-root-conflict'};
  if (entry.resourceId && entry.remoteIdentityProvenance === 'verified-current-api' && entry.resourceId !== receipt.resourceId) {
    return {ok:false, reason:'entry-resource-conflict'};
  }
  return {ok:true, resourceId:receipt.resourceId, path:receipt.path};
}

// Current import preserves locator/identity-looking strings without provenance.
const imported = currentImport({
  remotePath:'disk:/WebClip/Upload/a.pdf',
  publicUrl:'https://disk.yandex.ru/d/public-A',
  resourceId:'rid-B',
  accountUid:'account-A',
  rootPath:'disk:/WebClip'
});
ok(imported.imported, 'entry is imported');
eq(imported.resourceId, 'rid-B', 'import preserves resourceId string');
eq(imported.publicUrl, 'https://disk.yandex.ru/d/public-A', 'import preserves publicUrl string');
eq(imported.remoteIdentityProvenance, '', 'import has no verified provenance receipt');

// An imported arbitrary resourceId can become current expected identity.
const unrelatedObserved = {
  path:'disk:/Elsewhere/unrelated.pdf',
  resourceId:'rid-B',
  publicUrl:'',
  accountUid:'account-A',
  rootPath:'disk:/WebClip'
};
ok(currentDestructiveMatch(imported, unrelatedObserved), 'current matcher can accept imported resourceId as identity authority');

// Public URL can independently become matching authority when id is absent.
const publicOnly = currentImport({publicUrl:'https://disk.yandex.ru/d/public-X', accountUid:'account-A', rootPath:'disk:/WebClip'});
ok(currentDestructiveMatch(publicOnly, {
  path:'disk:/Elsewhere/x.pdf', resourceId:'', publicUrl:'https://disk.yandex.ru/d/public-X'
}), 'current matcher can accept imported public URL');

// Path-only legacy record is weaker and current code generally fails closed after relocation.
const pathOnly = currentImport({remotePath:'disk:/WebClip/Upload/old.pdf'});
ok(currentDestructiveMatch(pathOnly, {path:'disk:/WebClip/Upload/old.pdf'}), 'stored path can match at same path');
ok(!currentDestructiveMatch(pathOnly, {path:'disk:/WebClip/Trash/old.pdf'}), 'path does not survive move by itself');

// SHA/content staging integrity is not remote-object authority.
const contentReceipt = Object.freeze({contentSha256:'a'.repeat(64), stagingGeneration:'legacy:1:1'});
ok(Boolean(contentReceipt.contentSha256), 'import content receipt exists');
ok(!('resourceId' in contentReceipt), 'content digest receipt does not prove Yandex object identity');

// Candidate requires current provider-observed exact resource receipt.
let r = candidateDestructiveAdmission(imported, unrelatedObserved, null);
eq(r.ok, false, 'imported fields alone do not authorize destructive operation');
eq(r.reason, 'verified-receipt-required', 'provider observation receipt is required');

const forgedReceipt = Object.freeze({
  authority:'imported-metadata',
  accountUid:'account-A', rootPath:'disk:/WebClip', resourceId:'rid-B',
  path:'disk:/Elsewhere/unrelated.pdf', observedAt:1
});
r = candidateDestructiveAdmission(imported, unrelatedObserved, forgedReceipt);
eq(r.ok, false, 'imported metadata receipt is not provider authority');
eq(r.reason, 'bad-provenance', 'provenance class is checked');

const exact = verifiedReceipt({
  accountUid:'account-A', rootPath:'disk:/WebClip', resourceId:'rid-B',
  path:'disk:/Elsewhere/unrelated.pdf', observedAt:123
});
ok(exact && Object.isFrozen(exact), 'provider-observed receipt is immutable');
r = candidateDestructiveAdmission(imported, unrelatedObserved, exact);
ok(r.ok, 'current provider observation can authorize exact resource');
eq(r.resourceId, 'rid-B', 'receipt binds exact resource id');

// Account/root conflicts fail closed.
const wrongAccountObserved = {...unrelatedObserved, accountUid:'account-B'};
r = candidateDestructiveAdmission(imported, wrongAccountObserved, exact);
eq(r.ok, false, 'wrong observed account fails');
eq(r.reason, 'account-mismatch', 'account mismatch is explicit');

const wrongRootObserved = {...unrelatedObserved, rootPath:'disk:/Other'};
r = candidateDestructiveAdmission(imported, wrongRootObserved, exact);
eq(r.ok, false, 'wrong root fails');
eq(r.reason, 'root-mismatch', 'root mismatch is explicit');

// A newly verified native record may treat its stored identity as conflict evidence.
const native = {
  remotePath:'disk:/WebClip/Upload/native.pdf',
  resourceId:'rid-N',
  accountUid:'account-A',
  rootPath:'disk:/WebClip',
  remoteIdentityProvenance:'verified-current-api'
};
const nativeObserved = {
  path:'disk:/WebClip/Upload/native.pdf',
  resourceId:'rid-X',
  accountUid:'account-A',
  rootPath:'disk:/WebClip'
};
const nativeReceipt = verifiedReceipt({
  accountUid:'account-A', rootPath:'disk:/WebClip', resourceId:'rid-X',
  path:nativeObserved.path, observedAt:5
});
r = candidateDestructiveAdmission(native, nativeObserved, nativeReceipt);
eq(r.ok, false, 'verified stored identity conflict fails closed');
eq(r.reason, 'entry-resource-conflict', 'native conflict is explicit');

// Imported value remains locator/hint, not conflict-proof authority.
const importedConflict = {...imported, resourceId:'rid-old', remoteIdentityProvenance:''};
const observedNew = {
  path:'disk:/WebClip/Upload/a.pdf',
  resourceId:'rid-current',
  accountUid:'account-A',
  rootPath:'disk:/WebClip'
};
const observedNewReceipt = verifiedReceipt({
  accountUid:'account-A', rootPath:'disk:/WebClip', resourceId:'rid-current',
  path:observedNew.path, observedAt:7
});
r = candidateDestructiveAdmission(importedConflict, observedNew, observedNewReceipt);
ok(r.ok, 'unverified imported id may be superseded by current exact observation');
eq(r.resourceId, 'rid-current', 'current provider identity becomes authority');

// Public URL alone should be discovery evidence, followed by private-account exact observation.
const discoveredByPublic = {path:'disk:/WebClip/Upload/p.pdf', resourceId:'rid-P', accountUid:'account-A', rootPath:'disk:/WebClip'};
r = candidateDestructiveAdmission(publicOnly, discoveredByPublic, null);
eq(r.ok, false, 'public capability discovery alone is not destructive authority');
const publicReceipt = verifiedReceipt({...discoveredByPublic, observedAt:9});
r = candidateDestructiveAdmission(publicOnly, discoveredByPublic, publicReceipt);
ok(r.ok, 'public hint plus private exact observation may authorize');
eq(r.resourceId, 'rid-P', 'private observation controls target');

// Receipt must bind a real observation time and provider identity.
eq(verifiedReceipt({accountUid:'account-A',rootPath:'disk:/WebClip',resourceId:'',path:'x',observedAt:1}), null, 'empty resource id cannot form exact receipt');
eq(verifiedReceipt({accountUid:'',rootPath:'disk:/WebClip',resourceId:'rid',path:'x',observedAt:1}), null, 'missing account cannot form exact receipt');
eq(verifiedReceipt({accountUid:'account-A',rootPath:'disk:/WebClip',resourceId:'rid',path:'x',observedAt:0}), null, 'missing observation generation cannot form receipt');

// Destructive action must consume the receipt rather than re-reading imported fields.
function destructiveCommand(receipt, commandResourceId) {
  if (!receipt) return {ok:false, reason:'receipt-required'};
  if (commandResourceId !== receipt.resourceId) return {ok:false, reason:'retarget'};
  return {ok:true};
}
r = destructiveCommand(publicReceipt, 'rid-P');
ok(r.ok, 'command consumes receipt exact id');
r = destructiveCommand(publicReceipt, 'rid-other');
eq(r.ok, false, 'late retarget is blocked');
eq(r.reason, 'retarget', 'retarget failure is explicit');

console.log(`P0-022 imported remote-identity provenance model: PASS ${checks} checks`);
