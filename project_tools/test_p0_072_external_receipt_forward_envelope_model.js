'use strict';
const assert = require('node:assert/strict');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX64 = /^[0-9a-f]{64}$/;
const ENVELOPE_KEYS = new Set([
  'key', 'envelopeVersion', 'effectId', 'provenance',
  'scopeTokenVersion', 'urlScopeToken', 'siteScopeToken',
  'payloadVersion', 'payload'
]);
const ENVELOPE_KEYS_DETACHED = new Set([...ENVELOPE_KEYS, 'resetDisposition']);

function own(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function plain(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseEnvelope(row) {
  if (!plain(row)) return { status: 'invalid' };
  if (row.envelopeVersion !== 1) return { status: 'unsupported-envelope' };
  if (!UUID.test(String(row.effectId || ''))) return { status: 'invalid' };
  if (row.key !== `externalEffect:${row.effectId}`) return { status: 'invalid' };
  if (row.provenance !== 'worker-issued-live') return { status: 'invalid' };

  const allowedKeys = own(row, 'resetDisposition') ? ENVELOPE_KEYS_DETACHED : ENVELOPE_KEYS;
  const actualKeys = Object.keys(row);
  if (actualKeys.length !== allowedKeys.size || actualKeys.some((key) => !allowedKeys.has(key))) {
    return { status: 'invalid' };
  }

  if (!Number.isSafeInteger(row.scopeTokenVersion) || row.scopeTokenVersion < 1) return { status: 'invalid' };
  if (typeof row.urlScopeToken !== 'string' || row.urlScopeToken.length < 1 || row.urlScopeToken.length > 256) return { status: 'invalid' };
  if (typeof row.siteScopeToken !== 'string' || row.siteScopeToken.length < 1 || row.siteScopeToken.length > 256) return { status: 'invalid' };
  if (!Number.isSafeInteger(row.payloadVersion) || row.payloadVersion < 1 || !plain(row.payload)) return { status: 'invalid' };

  // Presence itself is the cross-version mutation barrier. A worker does not
  // need to understand a future disposition body in order to honor it.
  if (own(row, 'resetDisposition')) return { status: 'detached', row };

  return {
    status: row.payloadVersion === 1 ? 'current' : 'opaque-future-payload',
    row
  };
}

function fullResetDetach(row, resetDisposition) {
  const parsed = parseEnvelope(row);
  if (parsed.status === 'unsupported-envelope' || parsed.status === 'invalid') {
    return { ok: false, reason: parsed.status };
  }
  if (parsed.status === 'detached') {
    return { ok: true, row: structuredClone(row), changed: false };
  }
  const next = structuredClone(row);
  next.resetDisposition = structuredClone(resetDisposition);
  return { ok: true, row: next, changed: true };
}

function scopedResetDetach(row, supportedScopeTokenVersion, token, kind, resetDisposition) {
  const parsed = parseEnvelope(row);
  if (parsed.status === 'unsupported-envelope' || parsed.status === 'invalid') {
    return { ok: false, reason: parsed.status };
  }
  if (parsed.status === 'detached') {
    return { ok: true, row: structuredClone(row), changed: false };
  }
  if (row.scopeTokenVersion !== supportedScopeTokenVersion) {
    return { ok: false, reason: 'unsupported-scope-token-version' };
  }
  if (supportedScopeTokenVersion === 1 && (!HEX64.test(row.urlScopeToken) || !HEX64.test(row.siteScopeToken))) {
    return { ok: false, reason: 'invalid-supported-scope-token' };
  }
  const actual = kind === 'url' ? row.urlScopeToken : row.siteScopeToken;
  if (actual !== token) {
    return { ok: true, row: structuredClone(row), changed: false, match: false };
  }
  return { ...fullResetDetach(row, resetDisposition), match: true };
}

const effectId = '11111111-1111-4111-8111-111111111111';
const urlToken = 'a'.repeat(64);
const siteToken = 'b'.repeat(64);
const resetDisposition = {
  version: 1,
  resetId: '22222222-2222-4222-8222-222222222222',
  kind: 'clear-all'
};

const futurePayloadReceipt = {
  key: `externalEffect:${effectId}`,
  envelopeVersion: 1,
  effectId,
  provenance: 'worker-issued-live',
  scopeTokenVersion: 1,
  urlScopeToken: urlToken,
  siteScopeToken: siteToken,
  payloadVersion: 2,
  payload: {
    futureField: { nested: ['keep-me', 7] },
    remoteIdentityV2: 'opaque-to-v1'
  }
};

assert.equal(parseEnvelope(futurePayloadReceipt).status, 'opaque-future-payload');

const detached = fullResetDetach(futurePayloadReceipt, resetDisposition);
assert.equal(detached.ok, true);
assert.equal(detached.changed, true);
assert.deepEqual(detached.row.payload, futurePayloadReceipt.payload,
  'full reset must preserve an opaque future payload while adding the envelope barrier');
assert.notStrictEqual(detached.row.payload, futurePayloadReceipt.payload,
  'the detached record is a structured clone, not a shared mutable payload reference');
assert.equal(parseEnvelope(detached.row).status, 'detached');

const futureDisposition = {
  ...futurePayloadReceipt,
  resetDisposition: { version: 9, opaqueFutureDisposition: true }
};
const preserved = fullResetDetach(futureDisposition, resetDisposition);
assert.equal(preserved.ok, true);
assert.equal(preserved.changed, false);
assert.deepEqual(preserved.row.resetDisposition, futureDisposition.resetDisposition,
  'an existing unknown/future reset barrier must be honored and never overwritten by an old worker');

const scoped = scopedResetDetach(futurePayloadReceipt, 1, urlToken, 'url', resetDisposition);
assert.equal(scoped.ok, true);
assert.equal(scoped.match, true);
assert.equal(parseEnvelope(scoped.row).status, 'detached');

const nonmatch = scopedResetDetach(futurePayloadReceipt, 1, 'c'.repeat(64), 'url', resetDisposition);
assert.equal(nonmatch.ok, true);
assert.equal(nonmatch.match, false);
assert.equal(own(nonmatch.row, 'resetDisposition'), false);

const futureScopeEncoding = {
  ...futurePayloadReceipt,
  scopeTokenVersion: 2,
  urlScopeToken: 'future:url:v2',
  siteScopeToken: 'future:site:v2'
};
assert.equal(fullResetDetach(futureScopeEncoding, resetDisposition).ok, true,
  'full reset must not require understanding a future scope-token encoding');
assert.deepEqual(
  scopedResetDetach(futureScopeEncoding, 1, urlToken, 'url', resetDisposition),
  { ok: false, reason: 'unsupported-scope-token-version' },
  'scoped reset cannot classify a future scope-token algorithm'
);

assert.deepEqual(
  fullResetDetach({ ...futurePayloadReceipt, unexpectedAuthorityField: true }, resetDisposition),
  { ok: false, reason: 'invalid' },
  'new top-level authority fields require an envelope version bump'
);

assert.deepEqual(
  fullResetDetach({ ...futurePayloadReceipt, envelopeVersion: 2 }, resetDisposition),
  { ok: false, reason: 'unsupported-envelope' },
  'a future envelope version remains a hard compatibility boundary'
);

console.log('P0-072 external receipt forward-compatible envelope model: PASS');
