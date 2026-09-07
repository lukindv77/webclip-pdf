'use strict';

const assert = require('assert');

const REQUIRED = Object.freeze([
  'cloud_api:disk.read',
  'cloud_api:disk.write',
  'cloud_api:disk.info'
]);

function parseScopes(value) {
  return [...new Set(String(value || '')
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean))].sort();
}

function hasAll(actual, required) {
  const set = new Set(actual);
  return required.every((scope) => set.has(scope));
}

function classifyReceipt({
  source,
  authGeneration,
  requestedScopes = [],
  responseScopePresent = false,
  responseScope = '',
  exactRequiredOnlyRequest = false
}) {
  const requested = parseScopes(requestedScopes.join(' '));

  if (source === 'manual') {
    return {
      authGeneration,
      state: 'unknown',
      grantedScopes: [],
      evidence: 'manual-token-no-scope-receipt'
    };
  }

  if (source !== 'oauth-pkce-code') throw new Error('unsupported source');

  if (responseScopePresent) {
    const granted = parseScopes(responseScope);
    return {
      authGeneration,
      state: hasAll(granted, REQUIRED) ? 'full' : 'reduced',
      grantedScopes: granted,
      evidence: 'provider-response-scope'
    };
  }

  // Current WebClip sends only required `scope`, not optional_scope. Yandex
  // documents `scope` in the token response as optional and returned when a
  // smaller set was issued. Absence is therefore usable only when bound to the
  // exact required-only request receipt that produced this token.
  if (exactRequiredOnlyRequest) {
    return {
      authGeneration,
      state: hasAll(requested, REQUIRED) ? 'full' : 'reduced',
      grantedScopes: requested,
      evidence: 'provider-contract-exact-request'
    };
  }

  return {
    authGeneration,
    state: 'unknown',
    grantedScopes: [],
    evidence: 'missing-exact-request-receipt'
  };
}

function operationAdmission(capability, currentGeneration, requiredScopes) {
  if (!capability || capability.authGeneration !== currentGeneration) {
    return { state: 'unknown', admitted: false, reason: 'stale-or-missing-capability-receipt' };
  }
  if (capability.state === 'unknown') {
    return { state: 'unknown', admitted: false, reason: 'capability-unproven' };
  }
  const missing = requiredScopes.filter((scope) => !capability.grantedScopes.includes(scope));
  if (missing.length) {
    return { state: 'reduced', admitted: false, reason: 'known-missing-scope', missing };
  }
  return { state: 'proven', admitted: true, reason: 'required-scopes-proven' };
}

function observeReadSuccess(capability, currentGeneration, scope) {
  if (!capability || capability.authGeneration !== currentGeneration) return capability;
  if (capability.state !== 'unknown') return capability;
  const observed = new Set(capability.observedScopes || []);
  observed.add(scope);
  return { ...capability, observedScopes: [...observed].sort() };
}

function classifyProviderFailure(httpStatus) {
  if (httpStatus === 401) return 'auth-invalid-candidate-for-generation-fenced-demotion';
  if (httpStatus === 403) return 'capability-or-resource-denied';
  return 'other-or-unknown';
}

// Exact PKCE receipt with no returned scope: current required-only request can
// be inferred as full under the provider-specific response contract.
{
  const receipt = classifyReceipt({
    source: 'oauth-pkce-code',
    authGeneration: 7,
    requestedScopes: REQUIRED,
    responseScopePresent: false,
    exactRequiredOnlyRequest: true
  });
  assert.equal(receipt.state, 'full');
  assert.deepEqual(receipt.grantedScopes, [...REQUIRED].sort());
  assert.equal(operationAdmission(receipt, 7, ['cloud_api:disk.write']).admitted, true);
}

// Provider returns explicit reduced scope: never fall back to requested full set.
{
  const receipt = classifyReceipt({
    source: 'oauth-pkce-code',
    authGeneration: 9,
    requestedScopes: REQUIRED,
    responseScopePresent: true,
    responseScope: 'cloud_api:disk.read cloud_api:disk.info',
    exactRequiredOnlyRequest: true
  });
  assert.equal(receipt.state, 'reduced');
  assert.equal(operationAdmission(receipt, 9, ['cloud_api:disk.read']).admitted, true);
  const write = operationAdmission(receipt, 9, ['cloud_api:disk.write']);
  assert.equal(write.admitted, false);
  assert.deepEqual(write.missing, ['cloud_api:disk.write']);
}

// Manual token has no exact provider scope receipt. A successful info read must
// not promote it to full Disk capability.
{
  let receipt = classifyReceipt({ source: 'manual', authGeneration: 11 });
  assert.equal(receipt.state, 'unknown');
  receipt = observeReadSuccess(receipt, 11, 'cloud_api:disk.info');
  assert.deepEqual(receipt.observedScopes, ['cloud_api:disk.info']);
  assert.equal(operationAdmission(receipt, 11, ['cloud_api:disk.write']).admitted, false);
}

// Missing scope plus missing exact request provenance is unknown, not full.
{
  const receipt = classifyReceipt({
    source: 'oauth-pkce-code',
    authGeneration: 13,
    requestedScopes: REQUIRED,
    responseScopePresent: false,
    exactRequiredOnlyRequest: false
  });
  assert.equal(receipt.state, 'unknown');
}

// Capability evidence is generation-bound. Old full receipt cannot authorize B.
{
  const receiptA = classifyReceipt({
    source: 'oauth-pkce-code', authGeneration: 20,
    requestedScopes: REQUIRED, exactRequiredOnlyRequest: true
  });
  assert.equal(operationAdmission(receiptA, 21, ['cloud_api:disk.write']).admitted, false);
}

// 403 is not automatically equivalent to invalid token. Exact 401 demotion is
// delegated to P1-196/auth-generation ownership.
{
  assert.equal(classifyProviderFailure(401), 'auth-invalid-candidate-for-generation-fenced-demotion');
  assert.equal(classifyProviderFailure(403), 'capability-or-resource-denied');
}

console.log('P1-195 Yandex capability truth model: PASS');
