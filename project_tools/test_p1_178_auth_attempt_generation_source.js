'use strict';

const fs = require('fs');
const path = require('path');

const worker = fs.readFileSync(path.resolve(__dirname, '..', 'service-worker.js'), 'utf8');
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

function functionSlice(name, maxChars = 32000) {
  const start = worker.indexOf(`function ${name}`);
  if (start < 0) return '';
  return worker.slice(start, start + maxChars);
}

requireSource(/YANDEX_AUTH_GENERATION|authGeneration|yandexAuthGeneration/.test(worker),
  'missing shared Yandex auth/settings generation');
requireSource(/authAttemptId|oauthAttemptId|attemptId/.test(worker),
  'missing worker-issued OAuth attempt identity');
requireSource(/compareAndRemoveYandexOAuthPending|removeYandexOAuthPendingIfCurrent|clearOAuthAttemptIfCurrent/.test(worker),
  'missing compare-and-remove pending OAuth cleanup helper');
requireSource(/commitYandexAuthIfGeneration|compareAndCommitYandexAuth|commitYandexOAuthIfCurrent/.test(worker),
  'missing generation-fenced OAuth/auth commit helper');

const start = functionSlice('startYandexOAuth');
requireSource(Boolean(start), 'cannot locate startYandexOAuth()');
requireSource(/authAttemptId|oauthAttemptId|attemptId/.test(start),
  'OAuth start does not mint/carry exact attempt identity');
requireSource(/authGeneration|YANDEX_AUTH_GENERATION|generation/.test(start),
  'OAuth start does not bind pending state to shared generation');
requireSource(!/catch\s*\([^)]*\)\s*\{[\s\S]{0,1400}chrome\.storage\.session\.remove\('yandexOAuthPending'\)/.test(start),
  'OAuth start failure still unconditionally removes whichever pending attempt is current');
requireSource(/compareAndRemoveYandexOAuthPending|removeYandexOAuthPendingIfCurrent|clearOAuthAttemptIfCurrent/.test(start),
  'OAuth start failure does not use exact-attempt cleanup');

const finish = functionSlice('finishYandexOAuth');
requireSource(Boolean(finish), 'cannot locate finishYandexOAuth()');
requireSource(/authAttemptId|oauthAttemptId|attemptId/.test(finish),
  'OAuth finish does not preserve exact pending attempt identity across exchange');
requireSource(/authGeneration|YANDEX_AUTH_GENERATION|expectedGeneration/.test(finish),
  'OAuth finish does not preserve expected shared generation across exchange');
requireSource(/commitYandexAuthIfGeneration|compareAndCommitYandexAuth|commitYandexOAuthIfCurrent/.test(finish),
  'OAuth finish can still commit auth/config without generation CAS');
requireSource(!/chrome\.storage\.session\.remove\('yandexOAuthPending'\)/.test(finish),
  'OAuth finish still unconditionally removes the global pending slot');
requireSource(/compareAndRemoveYandexOAuthPending|removeYandexOAuthPendingIfCurrent|clearOAuthAttemptIfCurrent/.test(finish),
  'OAuth finish does not consume only its exact pending attempt');

const status = functionSlice('getYandexStatus');
requireSource(Boolean(status), 'cannot locate getYandexStatus()');
requireSource(!/if\s*\(yandexOAuthPending\s*&&\s*!pendingValid\)[\s\S]{0,1000}chrome\.storage\.session\.remove\('yandexOAuthPending'\)/.test(status),
  'status/expiry cleanup can still delete a newer attempt from an older snapshot');

// Positive controls: PKCE remains S256 and secrets stay in session storage.
requireSource(/code_challenge_method['"],\s*['"]S256['"]/.test(worker),
  'PKCE S256 positive control disappeared');
requireSource(/chrome\.storage\.session/.test(worker) && /codeVerifier/.test(worker),
  'session-only PKCE secret storage positive control disappeared');

if (failures.length) {
  console.error('P1-178 auth attempt/settings generation source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-178 auth attempt/settings generation source gate: PASS');
