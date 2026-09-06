'use strict';

const fs = require('fs');
const path = require('path');

const worker = fs.readFileSync(path.resolve(__dirname, '..', 'service-worker.js'), 'utf8');
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

function functionSlice(name, maxChars = 26000) {
  const start = worker.indexOf(`function ${name}`);
  if (start < 0) return '';
  return worker.slice(start, start + maxChars);
}

requireSource(/uniqueImportedCommentIds|dedupeImportedCommentIds|normalizeUniqueCommentIds/.test(worker),
  'missing deterministic imported comment-id uniqueness helper');

const imported = functionSlice('sanitizeImportedComments');
requireSource(Boolean(imported), 'cannot locate sanitizeImportedComments()');
requireSource(/uniqueImportedCommentIds|dedupeImportedCommentIds|normalizeUniqueCommentIds/.test(imported),
  'sanitizeImportedComments() is not wired to the uniqueness helper');
requireSource(/Set\(/.test(imported) || /seenCommentIds|seenIds/.test(imported),
  'imported comment normalization has no per-entry seen-id set');
requireSource(!/crypto\.randomUUID|Math\.random|Date\.now/.test(imported),
  'imported duplicate-id repair uses randomness or wall-clock time');
requireSource(/MAX_IMPORTED_COMMENT_ID_CHARS/.test(imported),
  'imported comment-id normalization is no longer explicitly bounded');

// The current ambiguous first-match mutation API is acceptable only after durable uniqueness is guaranteed.
const edit = functionSlice('editJournalComment', 14000);
const del = functionSlice('deleteJournalComment', 14000);
requireSource(Boolean(edit) && Boolean(del), 'cannot locate comment edit/delete mutations');
requireSource(/findIndex/.test(edit) && /findIndex/.test(del),
  'comment mutation addressing changed; re-audit uniqueness assumptions');

// Live add should preserve the same durable invariant even with UUID generation.
const add = functionSlice('addJournalComment', 14000);
requireSource(/ensureUniqueCommentId|uniqueCommentId|reserveCommentId/.test(add),
  'live comment add does not explicitly enforce unique id against current entry');

if (failures.length) {
  console.error('P1-186 imported comment id uniqueness source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-186 imported comment id uniqueness source gate: PASS');
