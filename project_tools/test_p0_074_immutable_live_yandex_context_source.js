'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'service-worker.js'), 'utf8');
const failures = [];

function fail(message) { failures.push(message); }
function requireText(haystack, needle, label) {
  if (!haystack.includes(needle)) fail(`${label}: missing ${needle}`);
}
function forbidText(haystack, needle, label) {
  if (haystack.includes(needle)) fail(`${label}: forbidden ${needle}`);
}
function extractFunction(name) {
  const asyncMarker = `async function ${name}`;
  const syncMarker = `function ${name}`;
  let start = source.indexOf(asyncMarker);
  if (start < 0) start = source.indexOf(syncMarker);
  if (start < 0) { fail(`function ${name}() not found`); return ''; }
  const brace = source.indexOf('{', start);
  if (brace < 0) { fail(`function ${name}() body not found`); return ''; }
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
  fail(`function ${name}() body is unterminated`);
  return '';
}

requireText(source, 'acquireYandexOperationContext', 'immutable context acquisition primitive');
requireText(source, 'yandexApiWithContext', 'context-bound Yandex API primitive');

const acquire = extractFunction('acquireYandexOperationContext');
const apiWithContext = extractFunction('yandexApiWithContext');
const recover = extractFunction('recoverPendingRemoteSaves');
const upload = extractFunction('uploadCachedRecordToYandex');
const ensurePublic = extractFunction('ensureYandexPublicUrl');
const ensureFolders = extractFunction('ensureYandexServiceFolders');
const checkpoint = extractFunction('checkpointPendingRemoteSaveIntent');

if (acquire) {
  requireText(acquire, 'Object.freeze', 'operation context must be immutable');
  requireText(acquire, 'accountUid', 'operation context must bind account identity');
  requireText(acquire, 'rootPath', 'operation context must bind operation config/root snapshot');
}

if (apiWithContext) {
  forbidText(apiWithContext, 'getValidYandexAccessToken(', 'context-bound API must not reread current auth');
  forbidText(apiWithContext, 'readYandexAuthState(', 'context-bound API must not reread current auth state');
  requireText(apiWithContext, 'context', 'context-bound API must consume explicit context');
}

if (recover) {
  requireText(recover, 'acquireYandexOperationContext', 'remote recovery must acquire one live context per unverified item');
  requireText(recover, 'yandexApiWithContext', 'remote recovery must use context-bound resource API');
  forbidText(recover, 'try { await getValidYandexAccessToken(); }', 'availability preflight is not immutable context authority');
  requireText(recover, "current.phase !== 'remote-verified'", 'remote-verified must stay local-only');
}

if (upload) {
  requireText(upload, 'acquireYandexOperationContext', 'new upload must acquire one immutable context');
  requireText(upload, 'yandexApiWithContext', 'upload-link and verification must use one context-bound API');
  requireText(upload, 'ensureYandexServiceFolders', 'upload must pass context into service-folder preparation');
}

if (ensurePublic) {
  requireText(ensurePublic, 'context', 'public-link flow must receive immutable context');
  requireText(ensurePublic, 'yandexApiWithContext', 'GET/publish/poll must use context-bound API');
  forbidText(ensurePublic, 'yandexApi(', 'public-link flow must not reread mutable token via ordinary API');
}

if (ensureFolders) {
  requireText(ensureFolders, 'context', 'service-folder preparation must consume captured context');
  forbidText(ensureFolders, 'getYandexConfig(', 'service-folder preparation must not reread mutable root/config');
  forbidText(ensureFolders, 'getValidYandexAccessToken(', 'service-folder preparation must not reread mutable auth');
}

if (checkpoint) {
  forbidText(checkpoint, 'accessToken', 'pendingRemoteSaves must not persist live token');
  forbidText(checkpoint, 'Authorization', 'pendingRemoteSaves must not persist auth header');
  forbidText(checkpoint, 'tokenRef', 'pendingRemoteSaves must not persist live credential handle');
}

if (failures.length) {
  console.error('P0-074 immutable live Yandex context source gate: RED');
  for (const message of failures) console.error(` - ${message}`);
  process.exitCode = 1;
} else {
  console.log('P0-074 immutable live Yandex context source gate: PASS');
}

assert.equal(failures.length, 0, `P0-074 source gate has ${failures.length} unsatisfied invariant(s)`);
