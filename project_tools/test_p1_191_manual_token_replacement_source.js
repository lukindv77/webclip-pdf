'use strict';

const fs = require('fs');
const path = require('path');

const worker = fs.readFileSync(path.resolve(__dirname, '..', 'service-worker.js'), 'utf8');
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

function functionSlice(name, maxChars = 26000) {
  const start = worker.indexOf(`function ${name}`);
  if (start < 0) return '';
  return worker.slice(start, start + maxChars);
}

requireSource(/YANDEX_AUTH_GENERATION|authGeneration|yandexAuthGeneration/.test(worker),
  'missing shared Yandex auth generation authority');
requireSource(/commitYandexAuthIfGeneration|writeYandexAuthIfGeneration|compareAndCommitYandexAuth/.test(worker),
  'missing generation-fenced Yandex auth commit helper');
requireSource(/validateYandexAuthCandidate|validateManualYandexTokenCandidate|yandexApiWithContext/.test(worker),
  'missing candidate-bound token validation primitive');

const manual = functionSlice('setManualYandexToken');
requireSource(Boolean(manual), 'cannot locate setManualYandexToken()');
requireSource(/validateYandexAuthCandidate|validateManualYandexTokenCandidate|yandexApiWithContext/.test(manual),
  'manual replacement does not validate the candidate through a candidate-bound primitive');
requireSource(/commitYandexAuthIfGeneration|writeYandexAuthIfGeneration|compareAndCommitYandexAuth/.test(manual),
  'manual replacement does not generation-CAS the proven candidate');
requireSource(!/await\s+writeYandexAuth\(yandexAuth\)[\s\S]{0,2400}(?:yandexApi\(''\)|validateYandexAuthCandidate|validateManualYandexTokenCandidate)/.test(manual),
  'manual candidate is still committed globally before validation');
requireSource(!/catch\s*\([^)]*\)\s*\{[\s\S]{0,1200}writeYandexAuth\(null\)/.test(manual),
  'manual candidate failure still clears the last proven auth');
requireSource(/unknown|WEBCLIP_TIMEOUT|validation.*unknown/i.test(manual),
  'manual replacement lacks truthful unknown-validation handling');

const finish = functionSlice('finishYandexOAuth');
requireSource(Boolean(finish), 'cannot locate finishYandexOAuth()');
requireSource(/authGeneration|YANDEX_AUTH_GENERATION|expectedAuthGeneration|authAttempt/.test(finish),
  'PKCE finish does not carry shared auth generation/attempt authority');
requireSource(/commitYandexAuthIfGeneration|writeYandexAuthIfGeneration|compareAndCommitYandexAuth/.test(finish),
  'PKCE finish can still write auth without generation-fenced commit');

// Positive controls that must remain: auth token storage is session-only and disconnect clears auth.
requireSource(/chrome\.storage\.session/.test(functionSlice('writeYandexAuth', 5000)),
  'session-only Yandex auth storage positive control disappeared');
requireSource(/WEBCLIP_YANDEX_DISCONNECT/.test(worker) && /writeYandexAuth\(null\)/.test(worker),
  'explicit disconnect auth-clear positive control disappeared');

if (failures.length) {
  console.error('P1-191 manual token replacement source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-191 manual token replacement source gate: PASS');
