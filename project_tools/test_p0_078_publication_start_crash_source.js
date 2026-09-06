'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const sw = fs.readFileSync('service-worker.js', 'utf8');

function asyncFunctionSlice(name, nextName) {
  const startNeedle = `async function ${name}`;
  const start = sw.indexOf(startNeedle);
  assert.notEqual(start, -1, `missing ${startNeedle}`);
  if (!nextName) return sw.slice(start);
  const endNeedle = `async function ${nextName}`;
  const end = sw.indexOf(endNeedle, start + startNeedle.length);
  assert.notEqual(end, -1, `missing ${endNeedle}`);
  return sw.slice(start, end);
}

// P0-078 restart safety requires mutation and reconciliation to be separate
// authorities. A combined GET -> PUT -> poll helper cannot be the only API.
assert.match(sw, /readYandexPublicUrl|reconcileYandexPublication/i,
  'RED: runtime has no explicit read-only public-link reconciliation helper');
assert.match(sw, /startYandexPublication|beginYandexPublication|publishYandexResource/i,
  'RED: runtime has no separately named publication mutation entrypoint');
assert.match(sw, /publish-intent|publishIntent|publicationMutationIntent/i,
  'RED: runtime has no durable unknown-start publication intent state');

const recovery = asyncFunctionSlice('recoverPendingRemoteSaves', 'normalizePendingLocalDownloadKey');
assert.doesNotMatch(recovery, /ensureYandexPublicUrl\s*\(/,
  'RED: recovery still calls combined mutating ensureYandexPublicUrl() and may re-PUT after unknown settlement');
assert.match(recovery, /reconcileYandexPublication|readYandexPublicUrl/i,
  'RED: unknown publication recovery is not visibly read-only first');

const ensure = asyncFunctionSlice('ensureYandexPublicUrl', 'listYandexFolders');
assert.match(ensure, /\/resources\/publish/,
  'baseline drift: expected current combined helper to contain publish mutation until it is split/refactored');

// Future source must make the policy fence visible at the mutation entrypoint.
const publishMutationMatch = sw.match(/async function (?:startYandexPublication|beginYandexPublication|publishYandexResource)[\s\S]*?(?=\nasync function |$)/i);
assert.ok(publishMutationMatch, 'RED: no dedicated publication mutation function found');
assert.match(publishMutationMatch[0], /publicLinkPolicy|publicationPolicyReceipt|policyGeneration/i,
  'RED: dedicated publication mutation is not visibly bound to exact privacy-policy authority');

console.log('P0-078 publication start crash source gate: PASS');
