'use strict';

const fs = require('fs');
const path = require('path');

const worker = fs.readFileSync(path.resolve(__dirname, '..', 'service-worker.js'), 'utf8');
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

function functionSlice(name, maxChars = 42000) {
  const start = worker.indexOf(`function ${name}`);
  if (start < 0) return '';
  return worker.slice(start, start + maxChars);
}

requireSource(/MAX_IMPORTED_FUTURE_SKEW_MS|IMPORTED_TIMESTAMP_FUTURE_SKEW_MS/.test(worker),
  'missing explicit bounded imported-timestamp future skew policy');
requireSource(/normalizeImportedTimestamp|canonicalizeImportedTimestamp/.test(worker),
  'missing shared imported timestamp canonicalizer');

const imported = functionSlice('normalizeImportedJournalEntry');
requireSource(Boolean(imported), 'cannot locate normalizeImportedJournalEntry()');
requireSource(/normalizeImportedTimestamp|canonicalizeImportedTimestamp/.test(imported),
  'entry import does not use shared temporal canonicalizer');
requireSource(!/Number\.isFinite\(Number\(raw\.createdAt\)\)\s*\?\s*Number\(raw\.createdAt\)/.test(imported),
  'createdAt still accepts any finite number without safe-integer/future domain');
requireSource(!/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$/.test(imported),
  'raw localDayKey regex is still authoritative');
requireSource(/localDayKey\(createdAt\)|localDayKey\(canonicalCreatedAt\)/.test(imported),
  'localDayKey is not derived from canonical createdAt');
requireSource(!/movedToReadAt:\s*Number\(raw\.movedToReadAt/.test(imported),
  'movedToReadAt still uses raw Number() conversion');
requireSource(!/readMovePendingAt:\s*Number\(raw\.readMovePendingAt/.test(imported),
  'readMovePendingAt still uses raw Number() conversion');
requireSource(!/journalCommentUpdatedAt:\s*Number\(/.test(imported),
  'journalCommentUpdatedAt still uses raw Number() conversion');

requireSource(/referenceNow|importReferenceTime|stagingCreatedAt/.test(imported),
  'import normalization has no stable import-generation temporal reference');

if (failures.length) {
  console.error('P1-185 imported temporal domain source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-185 imported temporal domain source gate: PASS');
