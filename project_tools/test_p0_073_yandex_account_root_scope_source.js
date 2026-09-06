'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sourcePath = path.resolve(__dirname, '..', 'service-worker.js');
const source = fs.readFileSync(sourcePath, 'utf8');

function extractFunction(name) {
  const marker = `async function ${name}`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `P0-073 source gate: ${name}() not found`);
  const brace = source.indexOf('{', start);
  assert.notEqual(brace, -1, `P0-073 source gate: ${name}() body not found`);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  assert.fail(`P0-073 source gate: unterminated ${name}() body`);
}

function requireText(haystack, needle, label) {
  assert.notEqual(haystack.indexOf(needle), -1, `P0-073 source gate: missing ${label}: ${needle}`);
}

const checkpoint = extractFunction('checkpointPendingRemoteSaveIntent');
const recover = extractFunction('recoverPendingRemoteSaves');
const markVerified = extractFunction('markPendingRemoteSaveVerified');

// Durable scope must be explicit and versioned. Loose optional accountUid/rootPath
// fields are not sufficient authority for recovery admission.
requireText(source, 'yandexAccountRootScope', 'durable account/root scope record');
requireText(recover, 'yandexAccountRootScope', 'recovery consumption of durable scope');
requireText(recover, 'deferred-account-mismatch', 'cross-account defer outcome');
requireText(recover, 'deferred-auth-unavailable', 'auth-unavailable defer outcome');
requireText(recover, 'manual-missing-scope', 'legacy/malformed scope fail-closed outcome');
requireText(recover, 'manual-path-outside-scope', 'remotePath-under-root validation outcome');

// The account/scope admission must happen before the first remote resource call.
const accountAdmission = recover.indexOf('deferred-account-mismatch');
const firstRemoteRead = recover.indexOf("yandexApi('/resources'");
assert.ok(firstRemoteRead > accountAdmission,
  'P0-073 source gate: account admission must precede remote Yandex resource probing');

// remote-verified is a local-only phase. It must remain outside the remote
// reconciliation branch so an account switch cannot block a completed remote fact.
requireText(recover, "current.phase !== 'remote-verified'", 'remote-verified local-only branch');

// Existing unresolved checkpoints may not be replaced wholesale by a new item.
assert.equal(
  /existing\.phase\s*===\s*['"]stale-unverified['"]\s*\?\s*\{\s*\.\.\.item/.test(checkpoint),
  false,
  'P0-073 source gate: stale checkpoint is still rebound in place to a new item'
);
assert.equal(
  /:\s*\{\s*\.\.\.item,\s*createdAt:\s*Number\(existing\.createdAt/.test(checkpoint),
  false,
  'P0-073 source gate: active/prepared checkpoint is still rebound in place to a new item'
);

// A durable expected resource id is immutable evidence. Fetched metadata may not
// silently replace it before remote verification/publication.
requireText(recover, 'manual-resource-id-mismatch', 'resource-id mismatch fail-closed outcome');
requireText(markVerified, 'manual-resource-id-mismatch', 'verified-writer resource-id conflict guard');

// Context mismatch is not a remote failure and therefore must not consume the
// remote failure/stale budget. Keep the explicit defer branch separate from the
// generic failure accounting paths.
const mismatchPos = recover.indexOf('deferred-account-mismatch');
const failurePos = recover.indexOf('markPendingRemoteSaveFailure');
const stalePos = recover.indexOf('markPendingRemoteSaveStale');
assert.ok(mismatchPos >= 0 && failurePos > mismatchPos && stalePos > mismatchPos,
  'P0-073 source gate: defer admission must occur before generic failure/stale accounting');

// Durable pendingRemoteSaves state must not carry raw authentication material.
assert.equal(/accessToken|tokenRef|Authorization\s*:/i.test(checkpoint), false,
  'P0-073 source gate: raw auth material must not be persisted in pendingRemoteSaves');

console.log('P0-073 Yandex account/root source gate: PASS');
