'use strict';

// Owner markers for PR contract: P0-073 P0-074 P0-078 P1-184

const crypto = require('node:crypto');

let checks = 0;
function assert(condition, message) {
  checks += 1;
  if (!condition) throw new Error(`FAIL ${checks}: ${message}`);
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function currentShapedAccept({ expectedPath, expectedBytes, remote }) {
  return Boolean(
    remote && remote.type === 'file' &&
    remote.path === expectedPath &&
    Number.isSafeInteger(remote.size) &&
    remote.size === expectedBytes
  );
}

function normalizeContext(value) {
  return {
    accountUid: String(value?.accountUid || ''),
    rootPath: String(value?.rootPath || ''),
    configGeneration: Number(value?.configGeneration),
    operationId: String(value?.operationId || '')
  };
}

function verifyExactObjectReceipt({ localBytes, expectedPath, context, remote }) {
  const ctx = normalizeContext(context);
  if (!Buffer.isBuffer(localBytes) || localBytes.length <= 0) return { ok: false, code: 'LOCAL_BYTES_INVALID' };
  if (!expectedPath || !ctx.accountUid || !ctx.rootPath || !Number.isSafeInteger(ctx.configGeneration) || !ctx.operationId) {
    return { ok: false, code: 'CONTEXT_INVALID' };
  }
  if (!remote || remote.type !== 'file' || remote.path !== expectedPath) return { ok: false, code: 'REMOTE_OBJECT_MISMATCH' };
  if (!Number.isSafeInteger(remote.size) || remote.size !== localBytes.length) return { ok: false, code: 'REMOTE_SIZE_MISMATCH' };
  if (!/^[0-9a-f]{64}$/.test(String(remote.sha256 || ''))) return { ok: false, code: 'REMOTE_DIGEST_UNAVAILABLE' };
  if (remote.sha256 !== sha256(localBytes)) return { ok: false, code: 'REMOTE_DIGEST_MISMATCH' };
  if (!String(remote.resource_id || '')) return { ok: false, code: 'REMOTE_IDENTITY_UNAVAILABLE' };
  if (String(remote.accountUid || '') !== ctx.accountUid) return { ok: false, code: 'ACCOUNT_MISMATCH' };
  if (String(remote.rootPath || '') !== ctx.rootPath) return { ok: false, code: 'ROOT_MISMATCH' };
  if (Number(remote.configGeneration) !== ctx.configGeneration) return { ok: false, code: 'GENERATION_MISMATCH' };
  if (String(remote.operationId || '') !== ctx.operationId) return { ok: false, code: 'OPERATION_MISMATCH' };
  return {
    ok: true,
    receipt: Object.freeze({
      path: remote.path,
      size: remote.size,
      sha256: remote.sha256,
      resourceId: String(remote.resource_id),
      accountUid: ctx.accountUid,
      rootPath: ctx.rootPath,
      configGeneration: ctx.configGeneration,
      operationId: ctx.operationId,
      publicUrl: String(remote.public_url || '')
    })
  };
}

function authorizePublication({ receipt, currentContext }) {
  const ctx = normalizeContext(currentContext);
  if (!receipt || !receipt.resourceId || !/^[0-9a-f]{64}$/.test(String(receipt.sha256 || ''))) return false;
  return receipt.accountUid === ctx.accountUid &&
    receipt.rootPath === ctx.rootPath &&
    receipt.configGeneration === ctx.configGeneration &&
    receipt.operationId === ctx.operationId;
}

const bytesA = Buffer.from('%PDF-A\n0123456789ABCDEF\n%%EOF\n');
const bytesB = Buffer.from('%PDF-B\n0123456789ABCDEF\n%%EOF\n');
assert(bytesA.length === bytesB.length, 'control PDFs must collide on byte size');
assert(sha256(bytesA) !== sha256(bytesB), 'control PDFs must differ on digest');

const context = Object.freeze({
  accountUid: 'uid-1',
  rootPath: 'disk:/WebClip',
  configGeneration: 17,
  operationId: 'op-42'
});
const path = 'disk:/WebClip/page.pdf';

const wrongSameSize = {
  type: 'file', path, size: bytesB.length,
  sha256: sha256(bytesB), resource_id: 'resource-old',
  accountUid: 'uid-1', rootPath: 'disk:/WebClip', configGeneration: 17, operationId: 'op-42'
};
assert(currentShapedAccept({ expectedPath: path, expectedBytes: bytesA.length, remote: wrongSameSize }), 'current-shaped path+size accepts different same-size bytes');
let result = verifyExactObjectReceipt({ localBytes: bytesA, expectedPath: path, context, remote: wrongSameSize });
assert(!result.ok && result.code === 'REMOTE_DIGEST_MISMATCH', 'digest-bound receipt rejects same-size wrong bytes');

const exact = { ...wrongSameSize, sha256: sha256(bytesA), resource_id: 'resource-new' };
result = verifyExactObjectReceipt({ localBytes: bytesA, expectedPath: path, context, remote: exact });
assert(result.ok, 'exact object receipt accepts exact bytes');
assert(result.receipt.sha256 === sha256(bytesA), 'receipt binds exact digest');
assert(result.receipt.resourceId === 'resource-new', 'receipt binds immutable remote identity');
assert(result.receipt.accountUid === 'uid-1', 'receipt binds account');
assert(result.receipt.rootPath === 'disk:/WebClip', 'receipt binds root');
assert(result.receipt.configGeneration === 17, 'receipt binds config generation');
assert(result.receipt.operationId === 'op-42', 'receipt binds operation identity');
assert(authorizePublication({ receipt: result.receipt, currentContext: context }), 'verified exact receipt authorizes publication in same context');

const noDigest = { ...exact }; delete noDigest.sha256;
result = verifyExactObjectReceipt({ localBytes: bytesA, expectedPath: path, context, remote: noDigest });
assert(!result.ok && result.code === 'REMOTE_DIGEST_UNAVAILABLE', 'missing server digest remains unknown instead of adopting by size');

const noResourceId = { ...exact, resource_id: '' };
result = verifyExactObjectReceipt({ localBytes: bytesA, expectedPath: path, context, remote: noResourceId });
assert(!result.ok && result.code === 'REMOTE_IDENTITY_UNAVAILABLE', 'missing remote object identity is fail-closed');

result = verifyExactObjectReceipt({ localBytes: bytesA, expectedPath: path, context, remote: { ...exact, path: 'disk:/WebClip/other.pdf' } });
assert(!result.ok && result.code === 'REMOTE_OBJECT_MISMATCH', 'different path is rejected');
result = verifyExactObjectReceipt({ localBytes: bytesA, expectedPath: path, context, remote: { ...exact, type: 'dir' } });
assert(!result.ok && result.code === 'REMOTE_OBJECT_MISMATCH', 'non-file is rejected');
result = verifyExactObjectReceipt({ localBytes: bytesA, expectedPath: path, context, remote: { ...exact, size: bytesA.length + 1 } });
assert(!result.ok && result.code === 'REMOTE_SIZE_MISMATCH', 'different size is rejected');
result = verifyExactObjectReceipt({ localBytes: bytesA, expectedPath: path, context, remote: { ...exact, accountUid: 'uid-2' } });
assert(!result.ok && result.code === 'ACCOUNT_MISMATCH', 'different account is rejected');
result = verifyExactObjectReceipt({ localBytes: bytesA, expectedPath: path, context, remote: { ...exact, rootPath: 'disk:/Other' } });
assert(!result.ok && result.code === 'ROOT_MISMATCH', 'different root is rejected');
result = verifyExactObjectReceipt({ localBytes: bytesA, expectedPath: path, context, remote: { ...exact, configGeneration: 18 } });
assert(!result.ok && result.code === 'GENERATION_MISMATCH', 'different config generation is rejected');
result = verifyExactObjectReceipt({ localBytes: bytesA, expectedPath: path, context, remote: { ...exact, operationId: 'op-new' } });
assert(!result.ok && result.code === 'OPERATION_MISMATCH', 'different operation is rejected');

const accepted = verifyExactObjectReceipt({ localBytes: bytesA, expectedPath: path, context, remote: exact }).receipt;
assert(!authorizePublication({ receipt: accepted, currentContext: { ...context, configGeneration: 18 } }), 'stale receipt cannot authorize publication after generation change');
assert(!authorizePublication({ receipt: accepted, currentContext: { ...context, accountUid: 'uid-2' } }), 'stale receipt cannot authorize publication after account change');
assert(!authorizePublication({ receipt: accepted, currentContext: { ...context, rootPath: 'disk:/Other' } }), 'stale receipt cannot authorize publication after root change');
assert(!authorizePublication({ receipt: accepted, currentContext: { ...context, operationId: 'op-other' } }), 'receipt cannot cross operation identity');
assert(!authorizePublication({ receipt: null, currentContext: context }), 'publication requires verified receipt');

const withPublic = verifyExactObjectReceipt({
  localBytes: bytesA, expectedPath: path, context,
  remote: { ...exact, public_url: 'https://disk.yandex.example/public-key' }
});
assert(withPublic.ok && withPublic.receipt.publicUrl.includes('public-key'), 'public URL is attached only to exact verified object receipt');
assert(Object.isFrozen(withPublic.receipt), 'receipt is immutable');

const modifiedRemote = { ...exact, resource_id: 'resource-replaced', sha256: sha256(bytesB) };
assert(currentShapedAccept({ expectedPath: path, expectedBytes: bytesA.length, remote: modifiedRemote }), 'positive collision control: current shape still cannot distinguish replacement');
result = verifyExactObjectReceipt({ localBytes: bytesA, expectedPath: path, context, remote: modifiedRemote });
assert(!result.ok && result.code === 'REMOTE_DIGEST_MISMATCH', 'candidate detects replacement at same path and size');

console.log(`PASS ${checks} checks`);
