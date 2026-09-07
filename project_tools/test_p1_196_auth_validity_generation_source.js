'use strict';

const fs = require('fs');
const path = require('path');

const worker = fs.readFileSync(path.resolve(__dirname, '..', 'service-worker.js'), 'utf8');
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

function functionSlice(name, maxChars = 42000) {
  const start = worker.indexOf(`function ${name}`);
  if (start < 0) return '';
  return worker.slice(start, start + maxChars);
}

const readAuth = functionSlice('readYandexAuthState', 12000);
const writeAuth = functionSlice('writeYandexAuth', 10000);
const status = functionSlice('getYandexStatus', 18000);
const tokenRead = functionSlice('getValidYandexAccessToken', 12000);
const api = functionSlice('yandexApi', 52000);
const recovery = functionSlice('recoverPendingRemoteSaves', 52000);
const signedTransfer = functionSlice('runOffscreenSignedTransfer', 26000);

// Positive controls that must remain while P1-196 is implemented.
requireSource(Boolean(readAuth) && /chrome\.storage\.session/.test(readAuth),
  'Yandex auth is no longer visibly read from session storage');
requireSource(Boolean(writeAuth) && /chrome\.storage\.session/.test(writeAuth),
  'Yandex auth is no longer visibly written to session storage');
requireSource(Boolean(tokenRead) && /expiresAt/.test(tokenRead),
  'known-expiry admission positive control disappeared');
requireSource(Boolean(api) && /Authorization['"]?\s*:\s*`OAuth \$\{token\}`/.test(api),
  'Disk API OAuth Authorization-header positive control disappeared');
requireSource(Boolean(api) && /error\.status\s*=\s*response\.status/.test(api),
  'Yandex HTTP status propagation positive control disappeared');
requireSource(Boolean(signedTransfer) && /WEBCLIP_SIGNED_TRANSFER/.test(signedTransfer),
  'signed-transfer path positive control disappeared');

// P1-196 consumes the shared P1-178 auth generation. It must not invalidate
// whichever auth happens to be current after a delayed response.
requireSource(
  /YANDEX_AUTH_GENERATION|yandexAuthGeneration|authGeneration/.test(worker),
  'missing shared Yandex auth generation authority'
);
requireSource(
  /getYandexAuthSnapshot|captureYandexAuthContext|createYandexOperationContext|readYandexAuthGeneration|authGenerationReceipt/.test(worker),
  'missing exact auth-generation/request snapshot used to bind provider responses'
);
requireSource(
  /demoteYandexAuthIfGeneration|invalidateYandexAuthIfGeneration|markYandexAuthInvalidIfGeneration|transitionYandexAuthValidityIfGeneration/.test(worker),
  'missing generation-CAS auth invalidation/demotion helper'
);

// Status/admission must expose validity separately from token presence.
requireSource(Boolean(status), 'cannot locate getYandexStatus()');
requireSource(/authValidity|validityState|authUsable|authorizationUsable/.test(status),
  'Yandex status still lacks explicit auth validity/usability state');
requireSource(/authGeneration|yandexAuthGeneration/.test(status),
  'Yandex status does not expose/bind the current auth generation');

// Missing lifetime metadata must be explicit unknown, not zero meaning
// indefinitely usable. Exact field names may differ.
requireSource(
  /expiryUnknown|expiryState|expiryKnown|lifetimeKnown|authLifetime.*unknown|unknown.*authLifetime/i.test(worker),
  'missing explicit unknown token-lifetime/expiry state'
);
requireSource(
  /validity[^\n]{0,200}expired|expired[^\n]{0,200}validity|AUTH_(?:VALIDITY_)?EXPIRED/i.test(worker),
  'known local expiry does not transition/report an explicit expired auth state'
);

// The exact OAuth-bound Disk request must own the invalidation receipt. Caller
// header overrides or signed-URL responses cannot be mistaken for token-A proof.
requireSource(
  /authorizationBound|authRequestReceipt|usedAuthGeneration|expectedAuthGeneration/.test(api),
  'yandexApi() does not bind the response to the exact Authorization/auth generation actually sent'
);
requireSource(
  /response\.status\s*===\s*401[\s\S]{0,2200}(?:demoteYandexAuthIfGeneration|invalidateYandexAuthIfGeneration|markYandexAuthInvalidIfGeneration|transitionYandexAuthValidityIfGeneration)/.test(api),
  'authoritative Disk 401 does not generation-CAS demote the exact current auth'
);
requireSource(
  !/response\.status\s*===\s*403[\s\S]{0,1800}(?:demoteYandexAuthIfGeneration|invalidateYandexAuthIfGeneration|markYandexAuthInvalidIfGeneration)/.test(api),
  '403 is still blanket-routed to invalid-auth demotion instead of capability/resource classification'
);
requireSource(
  !/(?:demoteYandexAuthIfGeneration|invalidateYandexAuthIfGeneration|markYandexAuthInvalidIfGeneration)/.test(signedTransfer),
  'offscreen signed-transfer HTTP result can incorrectly demote OAuth auth'
);

// An expiry or 401 transition must be exact-generation fenced. A plain
// writeYandexAuth(null) in the API failure path is forbidden because a late A
// response could clear newer B.
requireSource(!/writeYandexAuth\(null\)/.test(api),
  'yandexApi() contains unconditional auth clear rather than generation-CAS demotion');
requireSource(
  /authGeneration[\s\S]{0,1800}(?:expired|expiry)|(?:expired|expiry)[\s\S]{0,1800}authGeneration/i.test(tokenRead + worker),
  'known-expiry handling is not tied to the exact auth generation'
);

// Recovery cannot cache token-presence once for an entire queue after P1-196:
// a current-generation 401 on item N must defer N+1 rather than continue using
// the old admission decision.
requireSource(Boolean(recovery), 'cannot locate recoverPendingRemoteSaves()');
requireSource(
  /recheckYandexAuth|authValidity|authGeneration|getYandexAuthSnapshot|captureYandexAuthContext/.test(recovery),
  'remote-save recovery lacks per-item/current auth validity re-evaluation'
);
requireSource(
  !/let\s+authAvailable\s*=\s*true\s*;[\s\S]{0,500}getValidYandexAccessToken\(\)[\s\S]{0,1200}for\s*\(/.test(recovery),
  'remote-save recovery still snapshots authAvailable once before the whole queue'
);

if (failures.length) {
  console.error('P1-196 auth validity generation source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-196 auth validity generation source gate: PASS');
