'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'service-worker.js'), 'utf8');

assert.equal(
  /const existingEntry = await getJournalEntryById\(id\);\s*if \(existingEntry\) \{\s*await removePendingRemoteSave\(id\);/m.test(source),
  false,
  'P0-072: remote recovery must not delete a durable receipt solely because a same-id Journal row exists.'
);
assert.match(source, /suppressed-reset-detached/,
  'P0-072: remote recovery requires structured reset-detached Journal suppression.');

console.log('P0-072 remote existing-entry source contract: PASS');
