'use strict';

const assert = require('assert');
const crypto = require('crypto');

function selectRemoteObject(object, context) {
  return Object.freeze({
    version: 1,
    accountUid: context.accountUid,
    rootPath: context.rootPath,
    contextGeneration: context.generation,
    path: object.path,
    size: object.size,
    modified: object.modified,
    providerObjectGeneration: object.providerObjectGeneration || ''
  });
}

function authorizeFetch(receipt, live, context) {
  if (!receipt || receipt.version !== 1) return { ok: false, reason: 'missing-selection-receipt' };
  if (
    context.accountUid !== receipt.accountUid
    || context.rootPath !== receipt.rootPath
    || context.generation !== receipt.contextGeneration
  ) return { ok: false, reason: 'context-mismatch' };
  if (live.path !== receipt.path) return { ok: false, reason: 'path-mismatch' };
  if (!receipt.providerObjectGeneration) return { ok: false, reason: 'provider-generation-unproven' };
  if (live.providerObjectGeneration !== receipt.providerObjectGeneration) {
    return { ok: false, reason: 'selected-object-replaced' };
  }
  return { ok: true };
}

function makeStagingReceipt(bytes, generation) {
  return Object.freeze({
    stagingGeneration: generation,
    contentSha256: crypto.createHash('sha256').update(bytes).digest('hex')
  });
}

const ctxA = { accountUid: 'A', rootPath: '/WebClip', generation: 'ctx-A-1' };
const A = {
  path: '/WebClip/Backup/Journal/09-2026/WebClip_Journal_A.json',
  size: 100,
  modified: '2026-09-06T10:00:00Z',
  providerObjectGeneration: 'obj-A-v1',
  bytes: 'AAA'
};
const BsamePath = {
  ...A,
  modified: '2026-09-06T10:05:00Z',
  providerObjectGeneration: 'obj-B-v1',
  bytes: 'BBB'
};
const BsameMetadata = {
  ...A,
  providerObjectGeneration: 'obj-B-v2',
  bytes: 'CCC'
};

const receiptA = selectRemoteObject(A, ctxA);
assert.deepStrictEqual(authorizeFetch(receiptA, A, ctxA), { ok: true });
assert.deepStrictEqual(authorizeFetch(receiptA, BsamePath, ctxA), { ok: false, reason: 'selected-object-replaced' });
assert.deepStrictEqual(authorizeFetch(receiptA, BsameMetadata, ctxA), { ok: false, reason: 'selected-object-replaced' });
assert.deepStrictEqual(
  authorizeFetch(receiptA, A, { ...ctxA, generation: 'ctx-A-2' }),
  { ok: false, reason: 'context-mismatch' }
);
assert.deepStrictEqual(
  authorizeFetch(receiptA, A, { ...ctxA, accountUid: 'B' }),
  { ok: false, reason: 'context-mismatch' }
);

const weakReceipt = selectRemoteObject({ ...A, providerObjectGeneration: '' }, ctxA);
assert.deepStrictEqual(
  authorizeFetch(weakReceipt, A, ctxA),
  { ok: false, reason: 'provider-generation-unproven' }
);

// Strong staging identity after download does not retroactively prove that the
// downloaded object is the remote version the user selected earlier.
const stagedB = makeStagingReceipt(BsamePath.bytes, 'stage-1');
const stagedA = makeStagingReceipt(A.bytes, 'stage-A');
assert.ok(stagedB.contentSha256);
assert.notStrictEqual(stagedB.contentSha256, stagedA.contentSha256);
assert.deepStrictEqual(
  authorizeFetch(receiptA, BsamePath, ctxA),
  { ok: false, reason: 'selected-object-replaced' }
);

console.log('P0-013 selected backup object model: PASS');
