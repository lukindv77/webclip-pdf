'use strict';

// P0-022 production regression: imported/legacy locators are discovery hints;
// destructive Yandex commands require an immutable current-provider receipt.
// P1-231 binds the resulting runtime bytes to fresh exact-generation evidence.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const authorityStart = worker.indexOf('globalThis.WebClipYandexRecoveryNamespace = (() => {');
const authorityEnd = worker.indexOf('\n\nconst OFFSCREEN_DOCUMENT_PATH', authorityStart);
assert.ok(authorityStart >= 0 && authorityEnd > authorityStart, 'remote authority source must be extractable');
const context = vm.createContext({});
vm.runInContext(worker.slice(authorityStart, authorityEnd), context, { filename: 'service-worker-p0-022-authority.js' });
const authority = context.WebClipYandexRemoteIdentityAuthority;
const operationAuthority = context.WebClipYandexOperationContext;
let checks = 0;

function ok(value, message) { assert.ok(value, message); checks += 1; }
function eq(actual, expected, message) { assert.equal(actual, expected, message); checks += 1; }
function throwsCode(fn, code, message) {
  assert.throws(fn, (error) => error?.code === code, message);
  checks += 1;
}

function operationContext(overrides = {}) {
  return operationAuthority.validateOperationContext({
    accessToken: 'token-A', accountUid: 'acct-A', rootPath: '/WebClip',
    createPublicLinks: true, capturedAt: 1_700_000_000_000, ...overrides
  });
}

function metadata(overrides = {}) {
  return {
    type: 'file', path: 'disk:/WebClip/Upload/site/a.pdf',
    resource_id: 'rid-current', public_url: 'https://disk.yandex.ru/d/current',
    ...overrides
  };
}

ok(authority && typeof authority.createObservedReceipt === 'function', 'production authority is exported');
eq(authority.normalizeProvenance('provider-verified'), 'provider-verified', 'verified native provenance is retained');
eq(authority.normalizeProvenance('forged', { imported: true }), 'imported-unverified', 'import cannot assert provider provenance');
eq(authority.normalizeProvenance(''), 'legacy-unverified', 'missing provenance is legacy-unverified');

const imported = {
  accountUid: 'acct-A', rootPath: '/WebClip', resourceId: 'rid-stale',
  publicUrl: 'https://disk.yandex.ru/d/stale', remoteIdentityProvenance: 'imported-unverified'
};
const receipt = authority.createObservedReceipt({
  entry: imported, metadata: metadata(), operationContext: operationContext(), operationId: 'op-A', observedAt: 123
});
eq(receipt.authority, 'yandex-api-observed-resource', 'receipt records provider authority');
eq(receipt.resourceId, 'rid-current', 'current provider identity supersedes imported hint');
eq(receipt.path, '/WebClip/Upload/site/a.pdf', 'receipt binds normalized current path');
eq(receipt.sourceProvenance, 'imported-unverified', 'receipt records weak source provenance');
ok(Object.isFrozen(receipt), 'provider receipt is immutable');

const admitted = authority.assertDestructiveCommand({
  receipt, operationContext: operationContext(), sourcePath: receipt.path, metadata: metadata()
});
eq(admitted.resourceId, 'rid-current', 'exact re-observation authorizes command');
throwsCode(
  () => authority.assertDestructiveCommand({ receipt, operationContext: operationContext(), sourcePath: '/WebClip/Upload/site/other.pdf', metadata: metadata() }),
  'WEBCLIP_REMOTE_IDENTITY_PATH_RETARGET',
  'late path retarget fails closed'
);
throwsCode(
  () => authority.assertDestructiveCommand({ receipt, operationContext: operationContext(), sourcePath: receipt.path, metadata: metadata({ resource_id: 'rid-replacement' }) }),
  'WEBCLIP_REMOTE_IDENTITY_REVALIDATION_CONFLICT',
  'same-path replacement fails closed at admission'
);
throwsCode(
  () => authority.assertDestructiveCommand({ receipt, operationContext: operationContext({ capturedAt: 1_700_000_000_001 }), sourcePath: receipt.path, metadata: metadata() }),
  'WEBCLIP_REMOTE_IDENTITY_CONTEXT_RETARGET',
  'receipt cannot cross immutable context generations'
);

throwsCode(
  () => authority.createObservedReceipt({ entry: imported, metadata: metadata({ resource_id: '' }), operationContext: operationContext(), observedAt: 1 }),
  'WEBCLIP_REMOTE_IDENTITY_RESOURCE_REQUIRED',
  'path/public URL without current resource_id cannot authorize'
);
throwsCode(
  () => authority.createObservedReceipt({ entry: imported, metadata: metadata({ path: '/OtherRoot/a.pdf' }), operationContext: operationContext(), observedAt: 1 }),
  'WEBCLIP_REMOTE_IDENTITY_PATH_OUTSIDE_ROOT',
  'provider object outside captured root fails closed'
);
throwsCode(
  () => authority.createObservedReceipt({ entry: { ...imported, accountUid: 'acct-B' }, metadata: metadata(), operationContext: operationContext(), observedAt: 1 }),
  'WEBCLIP_REMOTE_IDENTITY_ENTRY_ACCOUNT_CONFLICT',
  'entry/current-account conflict fails closed'
);
throwsCode(
  () => authority.createObservedReceipt({ entry: { ...imported, rootPath: '/OtherRoot' }, metadata: metadata(), operationContext: operationContext(), observedAt: 1 }),
  'WEBCLIP_REMOTE_IDENTITY_ENTRY_ROOT_CONFLICT',
  'entry/current-root conflict fails closed'
);

const native = { ...imported, resourceId: 'rid-native', publicUrl: '', remoteIdentityProvenance: 'provider-verified' };
throwsCode(
  () => authority.createObservedReceipt({ entry: native, metadata: metadata(), operationContext: operationContext(), observedAt: 1 }),
  'WEBCLIP_REMOTE_IDENTITY_VERIFIED_RESOURCE_CONFLICT',
  'verified native identity conflict fails closed'
);

const importStart = worker.indexOf('function normalizeImportedJournalEntry(');
const importEnd = worker.indexOf('\n\nasync function prepareJournalImport', importStart);
const importSource = worker.slice(importStart, importEnd > importStart ? importEnd : importStart + 8000);
ok(importSource.includes('normalizeProvenance(raw.remoteIdentityProvenance, { imported: true })'), 'import explicitly downgrades remote identity provenance');

const verifiedStart = worker.indexOf('async function markPendingRemoteSaveVerified(');
const verifiedEnd = worker.indexOf('\n\nasync function removePendingRemoteSave(', verifiedStart);
const verifiedSource = worker.slice(verifiedStart, verifiedEnd);
ok(verifiedSource.includes('remoteIdentityProvenance: WebClipYandexRemoteIdentityAuthority.PROVIDER_VERIFIED'), 'native remote verification promotes provenance');

const locateStart = worker.indexOf('async function findYandexFileForJournalEntry(');
const locateEnd = worker.indexOf('\n\nfunction trashConflictFilename(', locateStart);
const locateSource = worker.slice(locateStart, locateEnd);
ok(locateSource.includes('operationContext: context'), 'locator uses one immutable context for provider reads');
ok(locateSource.includes('createObservedReceipt({'), 'locator returns current provider-observed receipt');
ok(locateSource.includes('discoveryByHint: true'), 'portable identifiers are bounded discovery hints');

const trashStart = worker.indexOf('async function moveJournalYandexFileToTrash(');
const trashEnd = worker.indexOf('\n\nfunction makePendingDestructiveMoveId(', trashStart);
const trashSource = worker.slice(trashStart, trashEnd);
const readStart = worker.indexOf('async function moveReadLaterEntryToRead(');
const readEnd = worker.indexOf('\n\nasync function clearJournalEntries(', readStart);
const readSource = worker.slice(readStart, readEnd > readStart ? readEnd : readStart + 18000);
for (const [name, source] of [['trash', trashSource], ['read-move', readSource]]) {
  ok(source.includes('captureCurrentYandexOperationContext()'), `${name} captures one operation context`);
  ok(source.includes('remoteIdentityReceipt: identityReceipt'), `${name} checkpoints exact remote receipt`);
  ok(source.includes('revalidateYandexDestructiveReceipt(identityReceipt, operationContext, operationId)'), `${name} revalidates immediately before admission`);
  ok(source.includes('operationContext'), `${name} passes immutable context through physical calls`);
}

console.log(`P0-022 remote identity authority: PASS ${checks} checks`);
