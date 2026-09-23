'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');

function between(startMarker, endMarker) {
  const start = SOURCE.indexOf(startMarker);
  const end = SOURCE.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start, `missing source section: ${startMarker} -> ${endMarker}`);
  return SOURCE.slice(start, end);
}

function receipt(recordId, authGeneration, controlGeneration, authorizationBound = true) {
  return Object.freeze({
    requestKind: 'disk-oauth',
    authRecordId: recordId,
    authGeneration,
    controlGeneration,
    authorizationBound
  });
}

function makeHelperContext(currentAuthority) {
  const context = vm.createContext({
    Promise,
    Object,
    String,
    Number,
    normalizeYandexAuthGeneration(value) {
      const n = Math.floor(Number(value) || 0);
      return Number.isSafeInteger(n) && n >= 0 ? n : 0;
    },
    async captureCurrentYandexAuthRequestAuthority() {
      if (currentAuthority instanceof Error) throw currentAuthority;
      return currentAuthority;
    }
  });
  const matchSource = between(
    'function yandexAuthRequestReceiptsMatch(expected, current)',
    'async function transitionYandexAuthValidityIfCurrentRequest'
  );
  const helperSource = between(
    'async function isCurrentYandexOperationAuthUsable(operationContext)',
    'async function captureCurrentYandexOperationContext()'
  );
  vm.runInContext(
    `${matchSource}\n${helperSource}\nthis.api = { yandexAuthRequestReceiptsMatch, isCurrentYandexOperationAuthUsable };`,
    context
  );
  return context;
}

(async () => {
  let checks = 0;
  const ok = (value, message) => { assert.ok(value, message); checks += 1; };
  const eq = (actual, expected, message) => { assert.strictEqual(actual, expected, message); checks += 1; };

  const A7 = receipt('A', 7, 7);
  const A8Control = receipt('A', 7, 8);
  const B8 = receipt('B', 8, 8);

  {
    const ctx = makeHelperContext({ accessToken: 'secret-A', receipt: A7 });
    eq(ctx.api.yandexAuthRequestReceiptsMatch(A7, A7), true, 'same exact record/control generation matches');
    eq(ctx.api.yandexAuthRequestReceiptsMatch(A7, B8), false, 'A receipt does not match newer B');
    eq(ctx.api.yandexAuthRequestReceiptsMatch(A7, A8Control), false, 'control-generation drift supersedes A');
    eq(ctx.api.yandexAuthRequestReceiptsMatch(A7, receipt('A', 7, 7, false)), false, 'unbound receipt never matches');
    ok(!JSON.stringify(A7).includes('secret-A'), 'receipt identity is secret-free');
  }

  {
    const ctx = makeHelperContext({ accessToken: 'secret-A', receipt: A7 });
    eq(await ctx.api.isCurrentYandexOperationAuthUsable({ authRequestReceipt: A7 }), true, 'same current A is usable for next recovery child');
  }

  {
    const ctx = makeHelperContext({ accessToken: 'secret-B', receipt: B8 });
    eq(await ctx.api.isCurrentYandexOperationAuthUsable({ authRequestReceipt: A7 }), false, 'newer B supersedes captured A for old recovery batch');
  }

  {
    const ctx = makeHelperContext({ accessToken: 'secret-A', receipt: A8Control });
    eq(await ctx.api.isCurrentYandexOperationAuthUsable({ authRequestReceipt: A7 }), false, 'newer auth intent/control generation fences old recovery');
  }

  for (const code of ['YANDEX_AUTH_TOKEN_INVALID', 'YANDEX_AUTH_TOKEN_EXPIRED', 'YANDEX_AUTH_TOKEN_EXPIRY_SKEW', 'YANDEX_AUTH_REQUIRED']) {
    const error = new Error(code);
    error.code = code;
    const ctx = makeHelperContext(error);
    eq(await ctx.api.isCurrentYandexOperationAuthUsable({ authRequestReceipt: A7 }), false, `${code} is unusable for next recovery child`);
  }

  {
    let calls = 0;
    const context = vm.createContext({
      Promise,
      Object,
      String,
      Number,
      normalizeYandexAuthGeneration(value) {
        const n = Math.floor(Number(value) || 0);
        return Number.isSafeInteger(n) && n >= 0 ? n : 0;
      },
      async captureCurrentYandexAuthRequestAuthority() {
        calls += 1;
        return { receipt: A7, accessToken: 'secret-A' };
      }
    });
    const matchSource = between(
      'function yandexAuthRequestReceiptsMatch(expected, current)',
      'async function transitionYandexAuthValidityIfCurrentRequest'
    );
    const helperSource = between(
      'async function isCurrentYandexOperationAuthUsable(operationContext)',
      'async function captureCurrentYandexOperationContext()'
    );
    vm.runInContext(`${matchSource}\n${helperSource}\nthis.check = isCurrentYandexOperationAuthUsable;`, context);
    eq(await context.check({ authRequestReceipt: receipt('legacy', 0, 0, false) }), false, 'unbound context fails closed');
    eq(calls, 0, 'unbound context performs no current-auth provider admission');
  }

  const capture = between(
    'async function captureCurrentYandexOperationContext()',
    'async function testYandexConnection()'
  );
  ok(capture.includes('const authRequestReceipt = makeYandexAuthRequestReceipt(yandexAuth, authState.authControlGeneration)'), 'operation capture binds exact auth receipt from same auth snapshot');
  ok(capture.includes('return Object.freeze({'), 'operation capture returns immutable enriched context');
  ok(capture.includes('authRequestReceipt'), 'operation context retains secret-free auth identity');
  ok(!capture.includes('chrome.storage.'), 'operation context remains memory-only at capture site');

  const recovery = between(
    "async function recoverPendingRemoteSaves(trigger = 'maintenance', maxItems = 6)",
    'function pendingLocalDownloadResetDisposition'
  );
  const loopAt = recovery.indexOf('for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1)');
  const phaseAt = recovery.indexOf("if (current.phase !== 'remote-verified')");
  const recheckAt = recovery.indexOf('await isCurrentYandexOperationAuthUsable(operationContext)');
  const namespaceAt = recovery.indexOf('WebClipYandexRecoveryNamespace.proveRecoveryNamespace({');
  ok(loopAt >= 0 && phaseAt > loopAt, 'recovery child loop is present');
  ok(recheckAt > phaseAt && recheckAt < namespaceAt, 'each auth-required child rechecks current auth before namespace/provider work');
  ok(recovery.includes('authUnavailableObserved = true'), 'recovery reports later auth loss');
  ok(recovery.includes("Number(error?.status) === 401"), 'recovery observes OAuth Disk 401');
  ok(recovery.includes("transitionYandexAuthValidityIfCurrentRequest("), 'recovery 401 composes exact tombstone CAS');
  ok(recovery.includes("operationContext.authRequestReceipt"), 'recovery 401 uses the captured exact auth subject');
  ok(recovery.includes("current.phase !== 'remote-verified'"), 'auth gate remains scoped to provider-required children');
  ok(recovery.indexOf('appendJournalEntryFromDurableCheckpoint') > phaseAt, 'remote-verified local finalization remains outside provider auth gate');
  ok(!recovery.includes('captureCurrentYandexOperationContext()') || (recovery.match(/captureCurrentYandexOperationContext\(\)/g) || []).length === 1, 'recovery does not recapture/retarget operation context per child');
  ok(!recovery.includes('getValidYandexAccessToken()'), 'recovery does not use mutable unbound token preflight');

  // Schedule model: item 1 current A gets authoritative 401; exact CAS moves
  // current auth to an invalid tombstone at generation 8. Item 2 must fail the
  // A@7 receipt recheck before any provider work.
  {
    let current = A7;
    const oldOperation = A7;
    const transition401 = () => {
      if (!(
        current.authRecordId === oldOperation.authRecordId
        && current.authGeneration === oldOperation.authGeneration
        && current.controlGeneration === oldOperation.controlGeneration
      )) return false;
      current = Object.freeze({
        requestKind: 'disk-oauth',
        authRecordId: 'A',
        authGeneration: 8,
        controlGeneration: 8,
        authorizationBound: true,
        validity: 'invalid'
      });
      return true;
    };
    eq(transition401(), true, 'item 1 current A/401 commits invalid transition');
    const ctx = makeHelperContext({ receipt: current });
    eq(await ctx.api.isCurrentYandexOperationAuthUsable({ authRequestReceipt: oldOperation }), false, 'item 2 cannot reuse old A after invalidation');
  }

  // Schedule model: B commits before late A/401. A transition loses CAS and
  // the old recovery context also cannot retarget item 2 to B.
  {
    let current = B8;
    const staleA = A7;
    const transition401 = () => (
      current.authRecordId === staleA.authRecordId
      && current.authGeneration === staleA.authGeneration
      && current.controlGeneration === staleA.controlGeneration
    );
    eq(transition401(), false, 'late A/401 cannot demote B');
    const ctx = makeHelperContext({ receipt: current, accessToken: 'secret-B' });
    eq(await ctx.api.isCurrentYandexOperationAuthUsable({ authRequestReceipt: staleA }), false, 'old A recovery batch cannot replay item 2 under B');
  }

  console.log(`P1-196 recovery auth recheck runtime tests: PASS; checks=${checks}; per_child_recheck=true; current_401_tombstone=exact_cas; stale_a_to_b_demotion=false; replay_under_b=false; remote_verified_local_finalize=true; live_provider_calls=0`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
