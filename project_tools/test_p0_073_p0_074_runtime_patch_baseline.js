'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const sourcePath = path.resolve(__dirname, '..', 'service-worker.js');
const sourceBytes = fs.readFileSync(sourcePath);
const source = sourceBytes.toString('utf8');

function gitBlobSha1(buffer) {
  return crypto.createHash('sha1')
    .update(Buffer.from(`blob ${buffer.length}\0`, 'utf8'))
    .update(buffer)
    .digest('hex');
}

function countExact(text, needle) {
  let count = 0;
  let offset = 0;
  while (true) {
    const index = text.indexOf(needle, offset);
    if (index < 0) return count;
    count += 1;
    offset = index + needle.length;
  }
}

const expectedBlobSha = '6d61ac81befdbf2804ae9dbec425aa08d1194eb1';
const actualBlobSha = gitBlobSha1(sourceBytes);
assert.equal(
  actualBlobSha,
  expectedBlobSha,
  `P0-073/P0-074 patch baseline mismatch: expected service-worker.js blob ${expectedBlobSha}, got ${actualBlobSha}`
);

const uniqueAnchors = [
  'async function getYandexConfig()',
  'async function updateYandexConfig(',
  'async function writeYandexAuth(',
  'async function getValidYandexAccessToken()',
  'async function yandexApi(',
  'async function getCurrentYandexAccountUid(',
  'async function ensureYandexServiceFolders(',
  'async function ensureYandexPublicUrl(',
  'async function uploadCachedRecordToYandex(',
  'async function checkpointPendingRemoteSaveIntent(',
  'async function markPendingRemoteSaveVerified(',
  'async function recoverPendingRemoteSaves('
];

for (const anchor of uniqueAnchors) {
  assert.equal(
    countExact(source, anchor),
    1,
    `P0-073/P0-074 patch baseline anchor must occur exactly once: ${anchor}`
  );
}

const defectAnchors = [
  "try { await getValidYandexAccessToken(); } catch (_) { authAvailable = false; }",
  "existing.phase === 'stale-unverified' ? { ...item, createdAt: now }",
  "publicUrl = await ensureYandexPublicUrl(remotePath, String(current.operationId || ''), deadline);",
  "const uploadLink = await yandexApi('/resources/upload'"
];

for (const anchor of defectAnchors) {
  assert.equal(
    countExact(source, anchor),
    1,
    `P0-073/P0-074 expected baseline defect anchor must occur exactly once: ${anchor}`
  );
}

console.log(`P0-073/P0-074 runtime patch baseline: PASS (${actualBlobSha})`);
