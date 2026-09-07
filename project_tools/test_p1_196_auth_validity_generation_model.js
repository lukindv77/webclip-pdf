'use strict';

const assert = require('assert');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function freshState({ tokenId = 'TOKEN_A', generation = 7, expiresAt = 0 } = {}) {
  return {
    generation,
    auth: { tokenId, expiresAt },
    tombstone: null
  };
}

// Deliberately unsafe shape: any late invalid-auth result clears whichever auth
// happens to be current when the result is processed.
function currentNaiveDemote(state) {
  state.auth = null;
  state.generation += 1;
  return { demoted: true };
}

function classifyProviderFailure({ requestKind, status = 0, transportError = false }) {
  if (transportError) return 'unknown-transport';
  if (requestKind !== 'disk-oauth') return 'not-current-oauth-authority';
  if (status === 401) return 'access-token-invalid';
  if (status === 403) return 'forbidden-capability-or-resource';
  return 'other-http';
}

function demoteIfExactCurrent(state, receipt, failureKind, now = 1000) {
  if (failureKind !== 'access-token-invalid') {
    return { demoted: false, reason: failureKind };
  }
  if (!receipt || receipt.requestKind !== 'disk-oauth' || !receipt.authorizationBound) {
    return { demoted: false, reason: 'unbound-response' };
  }
  if (!state.auth || state.generation !== receipt.authGeneration || state.auth.tokenId !== receipt.tokenId) {
    return { demoted: false, reason: 'stale-auth-generation' };
  }

  const invalidatedGeneration = state.generation;
  state.auth = null;
  state.generation += 1;
  state.tombstone = {
    validity: 'invalid',
    invalidatedGeneration,
    changedAt: now,
    reason: 'provider-401'
  };
  return { demoted: true, reason: 'exact-current-invalidated' };
}

function expireIfExactCurrent(state, receipt, now, skewMs = 60_000) {
  if (!state.auth || !receipt || state.generation !== receipt.authGeneration || state.auth.tokenId !== receipt.tokenId) {
    return { expired: false, reason: 'stale-auth-generation' };
  }
  const expiresAt = Number(state.auth.expiresAt || 0);
  if (!expiresAt) return { expired: false, reason: 'expiry-unknown' };
  if (expiresAt > now + skewMs) return { expired: false, reason: 'not-known-expired' };

  const expiredGeneration = state.generation;
  state.auth = null;
  state.generation += 1;
  state.tombstone = {
    validity: 'expired',
    invalidatedGeneration: expiredGeneration,
    changedAt: now,
    reason: 'known-expiry'
  };
  return { expired: true, reason: 'known-expiry' };
}

function normalizeLifetime(expiresIn) {
  if (expiresIn == null || expiresIn === '') {
    return { knowledge: 'unknown', expiresInSeconds: null };
  }
  const seconds = Number(expiresIn);
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > Number.MAX_SAFE_INTEGER / 1000) {
    return { knowledge: 'invalid', expiresInSeconds: null };
  }
  return { knowledge: 'known', expiresInSeconds: seconds };
}

function makeReceipt(state, requestKind = 'disk-oauth') {
  return {
    requestKind,
    authGeneration: state.generation,
    tokenId: state.auth?.tokenId || '',
    authorizationBound: requestKind === 'disk-oauth'
  };
}

// 1. Current-shaped late invalidation can destroy a newer auth session.
{
  const state = freshState({ tokenId: 'TOKEN_A', generation: 7 });
  const requestA = makeReceipt(state);
  state.auth = { tokenId: 'TOKEN_B', expiresAt: 0 };
  state.generation = 8;
  currentNaiveDemote(state, requestA);
  assert.equal(state.auth, null);
  assert.equal(state.generation, 9);
}

// 2. Target stale 401 from A cannot demote newer B.
{
  const state = freshState({ tokenId: 'TOKEN_A', generation: 7 });
  const requestA = makeReceipt(state);
  state.auth = { tokenId: 'TOKEN_B', expiresAt: 0 };
  state.generation = 8;
  const failure = classifyProviderFailure({ requestKind: 'disk-oauth', status: 401 });
  const result = demoteIfExactCurrent(state, requestA, failure);
  assert.deepEqual(result, { demoted: false, reason: 'stale-auth-generation' });
  assert.equal(state.auth.tokenId, 'TOKEN_B');
  assert.equal(state.generation, 8);
}

// 3. Authoritative 401 for the exact current auth demotes it once and advances generation.
{
  const state = freshState({ tokenId: 'TOKEN_A', generation: 11 });
  const requestA = makeReceipt(state);
  const failure = classifyProviderFailure({ requestKind: 'disk-oauth', status: 401 });
  const first = demoteIfExactCurrent(state, requestA, failure, 2000);
  assert.equal(first.demoted, true);
  assert.equal(state.auth, null);
  assert.equal(state.generation, 12);
  assert.equal(state.tombstone.validity, 'invalid');
  assert.equal(state.tombstone.invalidatedGeneration, 11);

  const duplicate = demoteIfExactCurrent(state, requestA, failure, 3000);
  assert.equal(duplicate.demoted, false);
  assert.equal(duplicate.reason, 'stale-auth-generation');
  assert.equal(state.generation, 12);
}

// 4. 403 is capability/resource denial, not blanket invalid-auth authority.
{
  const state = freshState({ tokenId: 'TOKEN_A', generation: 20 });
  const request = makeReceipt(state);
  const failure = classifyProviderFailure({ requestKind: 'disk-oauth', status: 403 });
  const result = demoteIfExactCurrent(state, request, failure);
  assert.equal(result.demoted, false);
  assert.equal(state.auth.tokenId, 'TOKEN_A');
  assert.equal(state.generation, 20);
}

// 5. Network/timeout unknown cannot demote auth.
{
  const state = freshState({ tokenId: 'TOKEN_A', generation: 22 });
  const request = makeReceipt(state);
  const failure = classifyProviderFailure({ requestKind: 'disk-oauth', transportError: true });
  const result = demoteIfExactCurrent(state, request, failure);
  assert.equal(result.demoted, false);
  assert.equal(state.auth.tokenId, 'TOKEN_A');
}

// 6. A 401 on an offscreen signed URL is not OAuth-token invalidation evidence.
{
  const state = freshState({ tokenId: 'TOKEN_A', generation: 23 });
  const signedReceipt = makeReceipt(state, 'signed-transfer');
  const failure = classifyProviderFailure({ requestKind: 'signed-transfer', status: 401 });
  const result = demoteIfExactCurrent(state, signedReceipt, failure);
  assert.equal(result.demoted, false);
  assert.equal(state.auth.tokenId, 'TOKEN_A');
}

// 7. Known local expiry is an exact-generation transition and blocks use without a request.
{
  const now = 1_000_000;
  const state = freshState({ tokenId: 'TOKEN_A', generation: 30, expiresAt: now + 30_000 });
  const receipt = makeReceipt(state);
  const result = expireIfExactCurrent(state, receipt, now);
  assert.equal(result.expired, true);
  assert.equal(state.auth, null);
  assert.equal(state.generation, 31);
  assert.equal(state.tombstone.validity, 'expired');
}

// 8. Missing/empty lifetime is explicit unknown, never an invented infinite lifetime.
{
  assert.deepEqual(normalizeLifetime(undefined), { knowledge: 'unknown', expiresInSeconds: null });
  assert.deepEqual(normalizeLifetime(''), { knowledge: 'unknown', expiresInSeconds: null });
  assert.deepEqual(normalizeLifetime(3600), { knowledge: 'known', expiresInSeconds: 3600 });
  assert.equal(normalizeLifetime(0).knowledge, 'invalid');
  assert.equal(normalizeLifetime(-1).knowledge, 'invalid');
}

// 9. Expiry result from old A cannot expire newer B.
{
  const now = 2_000_000;
  const state = freshState({ tokenId: 'TOKEN_A', generation: 40, expiresAt: now - 1 });
  const receiptA = makeReceipt(state);
  state.auth = { tokenId: 'TOKEN_B', expiresAt: now + 3_600_000 };
  state.generation = 41;
  const result = expireIfExactCurrent(state, receiptA, now);
  assert.equal(result.expired, false);
  assert.equal(result.reason, 'stale-auth-generation');
  assert.equal(state.auth.tokenId, 'TOKEN_B');
}

// 10. Recovery must re-evaluate current auth after a current-generation invalidation.
{
  const state = freshState({ tokenId: 'TOKEN_A', generation: 50 });
  const queue = ['item-1', 'item-2'];
  const actions = [];
  for (const item of queue) {
    if (!state.auth) {
      actions.push(`${item}:deferred-no-usable-auth`);
      continue;
    }
    const receipt = makeReceipt(state);
    actions.push(`${item}:attempted`);
    if (item === 'item-1') {
      const failure = classifyProviderFailure({ requestKind: 'disk-oauth', status: 401 });
      demoteIfExactCurrent(state, receipt, failure);
    }
  }
  assert.deepEqual(actions, ['item-1:attempted', 'item-2:deferred-no-usable-auth']);
}

console.log('P1-196 auth validity generation model: PASS');
