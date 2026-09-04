'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');

assert.equal(
  /const\s+removeKeys\s*=\s*new Set\(stale\.filter[\s\S]{0,1800}?for\s*\(const\s+key\s+of\s+removeKeys\)\s+pending\.delete\(key\)/.test(source),
  false,
  'P0-072: remote stale cleanup must not select candidates in one transaction and key-delete them later without current-row revalidation.'
);

assert.equal(
  /if\s*\(sameOperation\)\s*\{\s*pending\.delete\(key\);\s*setResult\(existing\);\s*return;\s*\}/.test(source),
  false,
  'P0-072: same-operation local numeric bind must preserve/validate reset and stage authority before deleting the intent.'
);

assert.equal(
  /existing\.phase\s*===\s*'stale-unverified'\s*\?\s*\{\s*\.\.\.item,\s*createdAt:\s*now\s*\}/.test(source),
  false,
  'P0-072: remote stale/manual history must not be reactivated through whole-record checkpoint replacement.'
);

assert.equal(
  /:\s*\{\s*\.\.\.item,\s*createdAt:\s*Number\(existing\.createdAt\s*\|\|\s*now\)\s*\}/.test(source),
  false,
  'P0-072: remote active current row must not be replaced by a caller snapshot that can reset admitted/reset authority.'
);

assert.match(source, /journalResetDisposition/,
  'P0-072: remaining call-site fixes require reset disposition in committed runtime.');
assert.match(source, /externalStages/,
  'P0-072: remaining call-site fixes require external stage state in committed runtime.');

console.log('P0-072 remaining call-site source contract: PASS');
