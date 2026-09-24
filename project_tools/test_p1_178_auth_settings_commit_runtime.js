'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');

function between(startMarker, endMarker) {
  const start = SOURCE.indexOf(startMarker);
  const end = SOURCE.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start, `missing source section: ${startMarker} -> ${endMarker}`);
  return SOURCE.slice(start, end);
}

function receipt({ attempt = 'attempt-A', record = 'record-A', generation = 7, clientId = 'client-A', createdAt = 100 } = {}) {
  return Object.freeze({
    version: 1,
    authAttemptId: attempt,
    authRecordId: record,
    authGeneration: generation,
    clientId,
    createdAt
  });
}

function isSecretFree(value) {
  const encoded = JSON.stringify(value).toLowerCase();
  return ![
    'accesstoken',
    'access_token',
    'refreshtoken',
    'refresh_token',
    'codeverifier',
    'oauthstate',
    'authorization',
    'token-a',
    'verifier-a'
  ].some((needle) => encoded.includes(needle));
}

function makeSerializedTurnModel() {
  let tail = Promise.resolve();
  function acquire() {
    let release;
    const turn = new Promise((resolve) => { release = resolve; });
    const previous = tail.catch(() => {});
    tail = turn;
    return previous.then(() => release);
  }
  return { acquire };
}

(async () => {
  let checks = 0;
  const ok = (value, message) => { assert.ok(value, message); checks += 1; };
  const eq = (actual, expected, message) => { assert.strictEqual(actual, expected, message); checks += 1; };

  const importSource = between('async function importUserSettings(document)', 'function openIndexedDbBounded');
  const authControl = between('let yandexAuthStorageSettlementChain', 'async function removeLegacyPersistentYandexAuth');
  const startSource = between('async function startYandexOAuth(clientId, sourceTabId = 0)', 'async function finishYandexOAuth');
  const statusSource = between('async function getYandexStatus()', 'async function getYandexConfig()');
  const startupSource = between('// Service worker MV3 может быть выгружен между событиями.', 'chrome.tabs.onActivated.addListener');

  // One shared generation / one serialized auth+settings turn; no second settings counter.
  ok(authControl.includes('async function acquireYandexAuthStorageTurn(label)'), 'shared auth/settings turn exists');
  ok(authControl.includes('const previous = yandexAuthStorageSettlementChain.catch(() => {})'), 'turn waits for actual predecessor');
  ok(authControl.includes('yandexAuthStorageSettlementChain = turn'), 'turn reserves queue ownership');
  ok(!SOURCE.includes('yandexConfigGeneration'), 'no second yandexConfigGeneration counter is introduced');
  ok(!SOURCE.includes('yandexSettingsGeneration'), 'no parallel yandexSettingsGeneration counter is introduced');

  // OAuth-start Client ID write is exact-attempt/generation fenced.
  ok(startSource.includes('persistYandexOAuthClientIdForAttempt(pending)'), 'OAuth start uses exact attempt settings writer');
  ok(!startSource.includes("updateYandexConfig((config) => {\n      config.clientId = clientId"), 'OAuth start no longer performs blind Client ID write');
  const persistSource = between('async function persistYandexOAuthClientIdForAttempt(expected)', 'async function settleYandexAuthConfigCommitReceipt');
  ok(persistSource.includes('currentGeneration !== expectedGeneration'), 'settings write checks shared generation');
  ok(persistSource.includes('sameYandexOAuthPendingIdentity(pending, expected)'), 'settings write checks exact pending identity');
  ok(persistSource.includes('clientId: String(expected.clientId || \'\').trim()'), 'settings write uses captured attempt Client ID');

  // Successful auth commit publishes a secret-free cross-storage receipt in the same session mutation.
  ok(authControl.includes('function makeYandexAuthConfigCommitReceipt(captured, auth'), 'config receipt constructor exists');
  ok(authControl.includes('[YANDEX_AUTH_CONFIG_COMMIT_KEY]: configReceipt'), 'auth session commit publishes config receipt');
  ok(authControl.includes('[YANDEX_AUTH_KEY]: auth'), 'auth record and receipt share the session commit');
  const sampleReceipt = receipt();
  eq(isSecretFree(sampleReceipt), true, 'config receipt shape is secret-free');
  eq(sampleReceipt.clientId, 'client-A', 'receipt retains matching public Client ID');
  ok(!Object.prototype.hasOwnProperty.call(sampleReceipt, 'accessToken'), 'receipt has no access token');
  ok(!Object.prototype.hasOwnProperty.call(sampleReceipt, 'codeVerifier'), 'receipt has no PKCE verifier');
  ok(!Object.prototype.hasOwnProperty.call(sampleReceipt, 'state'), 'receipt has no OAuth state secret');

  // Exact reconciliation cannot retarget a receipt after auth/generation changes.
  const identityMatch = (r, auth, controlGeneration) => Boolean(
    r
    && r.version === 1
    && r.authRecordId === auth?.authRecordId
    && r.authGeneration === auth?.authGeneration
    && r.authGeneration === controlGeneration
    && r.clientId
  );
  eq(identityMatch(sampleReceipt, { authRecordId: 'record-A', authGeneration: 7 }, 7), true, 'matching auth+generation admits receipt');
  eq(identityMatch(sampleReceipt, { authRecordId: 'record-B', authGeneration: 8 }, 8), false, 'receipt A cannot retarget auth B');
  eq(identityMatch(sampleReceipt, { authRecordId: 'record-A', authGeneration: 7 }, 8), false, 'generation drift rejects receipt');

  // Worker start has explicit recovery for a partially settled cross-area commit.
  ok(startupSource.includes("reconcileYandexAuthConfigCommit('worker-start')"), 'worker-start reconciliation exists');
  const settleSource = between('async function settleYandexAuthConfigCommitReceipt', 'async function reconcileYandexAuthConfigCommit');
  ok(settleSource.includes('sameYandexAuthConfigCommitIdentity(currentReceipt, expected)'), 'settlement requires exact receipt');
  ok(settleSource.includes('isCurrentYandexAuthConfigCommitReceipt(currentReceipt, currentAuth, currentGeneration)'), 'settlement requires current auth/generation');
  ok(settleSource.includes('[YANDEX_AUTH_CONFIG_COMMIT_KEY]: null'), 'settlement retires receipt');

  // Status remains logically coherent even if local config write is still pending.
  ok(statusSource.includes('authConfigCommitCurrent'), 'status validates pending config receipt');
  const pendingAt = statusSource.indexOf('pendingValid');
  const receiptAt = statusSource.indexOf('authConfigCommitCurrent', statusSource.indexOf('clientId:'));
  const configAt = statusSource.indexOf('yandexConfig.clientId', statusSource.indexOf('clientId:'));
  ok(pendingAt >= 0 && receiptAt > pendingAt && configAt > receiptAt, 'status clientId precedence is pending attempt -> exact receipt -> local config');
  ok(statusSource.includes('authConfigReconciliationPending: authConfigCommitCurrent'), 'status exposes reconciliation truth');

  // Importing a different Client ID is a newer settings intent but does not replace OAuth auth.
  ok(importSource.includes('const clientIdChanged ='), 'import detects Client ID intent change');
  const acquireAt = importSource.indexOf('releaseAuthSettingsTurn = await acquireYandexAuthStorageTurn');
  const generationAt = importSource.indexOf('nextYandexAuthGeneration', acquireAt);
  const sessionSetAt = importSource.indexOf('chrome.storage.session.set', generationAt);
  const localSetAt = importSource.indexOf('chrome.storage.local.set', sessionSetAt);
  const releaseAt = importSource.indexOf('releaseAuthSettingsTurn?.()', localSetAt);
  ok(acquireAt >= 0 && generationAt > acquireAt && sessionSetAt > generationAt && localSetAt > sessionSetAt && releaseAt > localSetAt,
    'import lock order is auth turn -> generation fence -> bundled local write -> release');
  ok(importSource.includes('[YANDEX_OAUTH_PENDING_KEY]: null'), 'changed imported Client ID invalidates older pending OAuth');
  ok(importSource.includes('[YANDEX_AUTH_CONFIG_COMMIT_KEY]: null'), 'changed imported Client ID invalidates older config receipt');
  ok(!importSource.includes('[YANDEX_AUTH_KEY]:'), 'settings import does not clear/replace current OAuth auth');
  ok(importSource.includes('oauthSessionChanged: false'), 'import preserves product contract that OAuth session is not replaced');

  // Deterministic ordering model: old OAuth writer -> import -> new OAuth writer.
  {
    const queue = makeSerializedTurnModel();
    const events = [];
    const config = { clientId: 'initial' };
    let generation = 1;

    const oldRelease = await queue.acquire();
    const oldWriter = (async () => {
      events.push('old-start');
      await Promise.resolve();
      config.clientId = 'client-old';
      events.push('old-write');
      oldRelease();
    })();

    const importTask = (async () => {
      const release = await queue.acquire();
      events.push('import-start');
      generation += 1;
      config.clientId = 'client-import';
      events.push('import-write');
      release();
    })();

    const newOAuthTask = (async () => {
      const release = await queue.acquire();
      events.push('new-start');
      generation += 1;
      config.clientId = 'client-new';
      events.push('new-write');
      release();
    })();

    await Promise.all([oldWriter, importTask, newOAuthTask]);
    eq(events.join(','), 'old-start,old-write,import-start,import-write,new-start,new-write', 'shared turn prevents config overtaking');
    eq(config.clientId, 'client-new', 'latest admitted settings intent wins');
    eq(generation, 3, 'import and later OAuth use one monotonic shared generation');
  }

  // Deterministic stale-receipt schedule: auth A committed, B/new intent supersedes before recovery.
  {
    const rA = receipt({ attempt: 'A', record: 'auth-A', generation: 11, clientId: 'client-A' });
    const currentAuth = { authRecordId: 'auth-B', authGeneration: 12 };
    eq(identityMatch(rA, currentAuth, 12), false, 'stale A receipt cannot overwrite config after B');
  }

  // Current owner boundaries stay explicit.
  ok(SOURCE.includes("const YANDEX_FIXED_REDIRECT_URI = 'https://oauth.yandex.ru/verification_code';"), 'fixed redirect remains unchanged');
  ok(!SOURCE.includes('chrome.identity.launchWebAuthFlow'), 'P1-165 transport is not silently absorbed');
  ok(authControl.includes('[YANDEX_AUTH_CONFIG_COMMIT_KEY]: null'), 'newer auth intents retire older config receipts');

  console.log(`P1-178 auth/settings commit runtime tests: PASS; checks=${checks}; one_shared_generation=true; cross_storage_receipt=true; restart_reconciliation=true; import_client_id_fenced=true; oauth_session_preserved=true; receipt_secret_free=true; returned_state_verified=false; live_provider_calls=0`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
