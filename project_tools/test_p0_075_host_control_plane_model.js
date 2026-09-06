'use strict';

const assert = require('assert/strict');

function canHostReadUi({ surface, shadowMode, containsSensitiveValue }) {
  if (!containsSensitiveValue) return false;
  if (surface === 'extension-page') return false;
  if (surface !== 'page-dom') throw new Error('unknown surface');
  return shadowMode !== 'closed';
}

function canHostReadSelectionAuthority({ authorityStore, pageMarkersAuthoritative }) {
  if (authorityStore !== 'isolated-world') return true;
  return Boolean(pageMarkersAuthoritative);
}

function admitPrivilegedSave({ controlPlane, eventTrusted, exactSourceReceipt, userConfirmed }) {
  if (controlPlane !== 'extension-page') return { admitted: false, reason: 'host-control-plane' };
  if (!eventTrusted || !userConfirmed) return { admitted: false, reason: 'no-trusted-confirmation' };
  if (!exactSourceReceipt) return { admitted: false, reason: 'no-source-receipt' };
  return { admitted: true, reason: 'ok' };
}

function acceptSelectionInteraction({ eventTrusted, targetConnected, sameSelectionSession }) {
  return Boolean(eventTrusted && targetConnected && sameSelectionSession);
}

function acceptPrintRepresentation({ owner, sourceReceiptMatches, sealedBeforeDestination }) {
  if (owner !== 'extension-owned') return { ok: false, reason: 'host-owned-render-tree' };
  if (!sourceReceiptMatches) return { ok: false, reason: 'source-generation-mismatch' };
  if (!sealedBeforeDestination) return { ok: false, reason: 'unsealed-render-result' };
  return { ok: true, reason: 'ok' };
}

assert.equal(canHostReadUi({ surface: 'page-dom', shadowMode: 'open', containsSensitiveValue: true }), true);
assert.equal(canHostReadUi({ surface: 'page-dom', shadowMode: 'closed', containsSensitiveValue: true }), false);
assert.equal(canHostReadUi({ surface: 'extension-page', shadowMode: 'none', containsSensitiveValue: true }), false);

assert.equal(canHostReadSelectionAuthority({ authorityStore: 'isolated-world', pageMarkersAuthoritative: true }), true);
assert.equal(canHostReadSelectionAuthority({ authorityStore: 'isolated-world', pageMarkersAuthoritative: false }), false);

assert.deepEqual(
  admitPrivilegedSave({ controlPlane: 'page-dom', eventTrusted: false, exactSourceReceipt: true, userConfirmed: true }),
  { admitted: false, reason: 'host-control-plane' }
);
assert.deepEqual(
  admitPrivilegedSave({ controlPlane: 'page-dom', eventTrusted: true, exactSourceReceipt: true, userConfirmed: true }),
  { admitted: false, reason: 'host-control-plane' }
);
assert.deepEqual(
  admitPrivilegedSave({ controlPlane: 'extension-page', eventTrusted: false, exactSourceReceipt: true, userConfirmed: true }),
  { admitted: false, reason: 'no-trusted-confirmation' }
);
assert.deepEqual(
  admitPrivilegedSave({ controlPlane: 'extension-page', eventTrusted: true, exactSourceReceipt: false, userConfirmed: true }),
  { admitted: false, reason: 'no-source-receipt' }
);
assert.deepEqual(
  admitPrivilegedSave({ controlPlane: 'extension-page', eventTrusted: true, exactSourceReceipt: true, userConfirmed: true }),
  { admitted: true, reason: 'ok' }
);

assert.equal(acceptSelectionInteraction({ eventTrusted: false, targetConnected: true, sameSelectionSession: true }), false);
assert.equal(acceptSelectionInteraction({ eventTrusted: true, targetConnected: false, sameSelectionSession: true }), false);
assert.equal(acceptSelectionInteraction({ eventTrusted: true, targetConnected: true, sameSelectionSession: false }), false);
assert.equal(acceptSelectionInteraction({ eventTrusted: true, targetConnected: true, sameSelectionSession: true }), true);

assert.deepEqual(
  acceptPrintRepresentation({ owner: 'host-page', sourceReceiptMatches: true, sealedBeforeDestination: true }),
  { ok: false, reason: 'host-owned-render-tree' }
);
assert.deepEqual(
  acceptPrintRepresentation({ owner: 'extension-owned', sourceReceiptMatches: false, sealedBeforeDestination: true }),
  { ok: false, reason: 'source-generation-mismatch' }
);
assert.deepEqual(
  acceptPrintRepresentation({ owner: 'extension-owned', sourceReceiptMatches: true, sealedBeforeDestination: false }),
  { ok: false, reason: 'unsealed-render-result' }
);
assert.deepEqual(
  acceptPrintRepresentation({ owner: 'extension-owned', sourceReceiptMatches: true, sealedBeforeDestination: true }),
  { ok: true, reason: 'ok' }
);

console.log('P0-075 host control-plane isolation model: PASS');
