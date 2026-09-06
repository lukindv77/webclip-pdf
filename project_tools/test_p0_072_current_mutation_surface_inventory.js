'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'service-worker.js'), 'utf8');

function count(pattern) {
  return [...source.matchAll(pattern)].length;
}

assert.equal(count(/chrome\.downloads\.download\s*\(/g), 1,
  'P0-072 closure sweep: current baseline has one automatic Chrome download mutation call-site.');
assert.equal(count(/runOffscreenSignedTransfer\s*\(\s*\{/g), 3,
  'P0-072 closure sweep: signed-transfer inventory changed; reclassify remote-save vs backup paths.');
assert.equal(count(/['"]\/resources\/publish['"]/g), 1,
  'P0-072 closure sweep: publish mutation surface changed; re-run placement audit.');
assert.equal(count(/['"]\/resources\/move['"]/g), 2,
  'P0-072 closure sweep: Yandex move mutation surface changed; re-run receipt/dependency audit.');
assert.equal(count(/async function migrateLegacy/g), 1,
  'P0-072 closure sweep: legacy materialization source inventory changed.');

assert.match(source,
  /await ensureRemoteCheckpoint\(\);[\s\S]{0,1200}?runOffscreenSignedTransfer\s*\(\s*\{\s*mode:\s*['"]pdf-cache-upload['"]/,
  'P0-072 positive control: Journal remote upload currently has a durable checkpoint before signed transfer.');
assert.match(source,
  /chrome\.downloads\.onChanged\.addListener\(\(delta\)\s*=>\s*\{[\s\S]{0,800}?finalizePendingLocalDownload/,
  'P0-072 positive control: terminal Chrome Download events funnel through durable finalization.');
assert.match(source,
  /async function recoverPendingRemoteSaves[\s\S]{0,12000}?ensureYandexPublicUrl/,
  'P0-072 positive control: remote recovery publication uses the audited centralized publish helper.');

console.log('P0-072 current mutation surface inventory: PASS');
