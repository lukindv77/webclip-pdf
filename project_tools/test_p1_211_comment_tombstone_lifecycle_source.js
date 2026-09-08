'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const journal = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');
const textFilter = fs.readFileSync(path.join(root, 'journal-text-filter.js'), 'utf8');

function requirePattern(source, pattern, message) {
  assert.match(source, pattern, message);
}

function rejectPattern(source, pattern, message) {
  assert.doesNotMatch(source, pattern, message);
}

function functionSlice(source, functionName, nextFunctionName = '') {
  const startNeedle = `function ${functionName}`;
  const start = source.indexOf(startNeedle);
  assert.ok(start >= 0, `Missing function ${functionName}`);
  let end = source.length;
  if (nextFunctionName) {
    const candidate = source.indexOf(`function ${nextFunctionName}`, start + startNeedle.length);
    if (candidate >= 0) end = candidate;
  }
  return source.slice(start, end);
}

// Positive controls from current source: P1-211 must preserve bounded active
// data and deleted-state identity while changing lifecycle/accounting semantics.
requirePattern(worker, /MAX_IMPORTED_COMMENT_CHARS\s*=\s*100000/, 'Per-comment input bound must remain explicit.');
requirePattern(worker, /MAX_IMPORTED_COMMENTS_PER_ENTRY\s*=\s*500/, 'Current raw count bound is a source-proof positive control.');
requirePattern(worker, /MAX_JOURNAL_COMMENTS_TOTAL_CHARS\s*=\s*2\s*\*\s*1024\s*\*\s*1024/, 'Current aggregate text bound is a source-proof positive control.');
requirePattern(worker, /function\s+normalizeJournalComments\s*\(/, 'Journal comment normalization must remain explicit.');
requirePattern(worker, /async\s+function\s+deleteJournalComment\s*\(/, 'Delete mutation path must remain explicit.');
requirePattern(worker, /deletedAt/, 'Deleted lifecycle identity must remain represented.');
requirePattern(textFilter, /function\s+commentsContain\s*\(/, 'Comments search projection must remain explicit.');
requirePattern(worker, /stageFullJournalExport\s*\(/, 'Full Journal export snapshot path must remain explicit.');
requirePattern(worker, /sanitizeImportedComments\s*\(/, 'Imported comment normalization must remain explicit.');

// Target P1-211: active and deleted/history capacity must become separate
// first-class concepts. Exact production numbers are intentionally not fixed by
// this gate; only explicit separate policy/limits are required.
requirePattern(worker, /JOURNAL_COMMENT_(?:TOMBSTONE|LIFECYCLE)_POLICY_VERSION/, 'Missing versioned comment tombstone/lifecycle policy.');
requirePattern(worker, /MAX_ACTIVE_JOURNAL_COMMENTS_PER_ENTRY/, 'Missing active-comment count budget separate from tombstones.');
requirePattern(worker, /MAX_ACTIVE_JOURNAL_COMMENT(?:S)?_TOTAL_CHARS/, 'Missing active-comment aggregate text budget separate from retained deleted bodies.');
requirePattern(worker, /MAX_(?:DELETED_COMMENT_TOMBSTONES|JOURNAL_COMMENT_TOMBSTONES)_PER_ENTRY/, 'Missing structural tombstone count bound.');
requirePattern(worker, /MAX_RETAINED_DELETED_COMMENT(?:S)?_(?:TOTAL_)?CHARS/, 'Missing retained deleted-body budget.');

// A minimal tombstone must be valid even when its original body is absent.
requirePattern(worker, /bodyRetained|bodyState|tombstoneKind/, 'Missing explicit tombstone body-retention state.');
requirePattern(worker, /function\s+(?:normalizeJournalCommentLifecycle|normalizeJournalCommentRecord|projectJournalCommentLifecycle)\s*\(/, 'Missing lifecycle-aware comment normalization.');

// Active admission cannot keep using raw normalized array length/text as its
// admission domain.
const addSlice = functionSlice(worker, 'addJournalComment', 'editJournalComment');
rejectPattern(addSlice, /comments\.length\s*>=\s*MAX_IMPORTED_COMMENTS_PER_ENTRY/, 'Add Comment still charges deleted tombstones to the raw active count limit.');
requirePattern(addSlice, /activeComment|activeBudget|assertActiveJournalCommentBudget/, 'Add Comment does not use an explicit active-only capacity projection.');

const editSlice = functionSlice(worker, 'editJournalComment', 'getJournalEntriesByIds');
requirePattern(editSlice, /activeComment|activeBudget|assertActiveJournalCommentBudget/, 'Edit does not use an explicit active-only capacity projection.');

// Delete must apply the selected P1-202 body policy rather than only stamping
// deletedAt while preserving the body unconditionally.
const deleteSlice = functionSlice(worker, 'deleteJournalComment', 'deleteJournalEntryRecordOnly');
requirePattern(deleteSlice, /privacy-delete|research-history|commentLifecycle|bodyRetained|redact/i, 'Delete does not apply an explicit deleted-body lifecycle policy.');
rejectPattern(deleteSlice, /comments\[index\]\s*=\s*\{\s*\.\.\.comments\[index\],\s*deletedAt:\s*Date\.now\(\)\s*\}/, 'Delete is still only a full-text soft tombstone stamp.');

// Tombstone history must be bounded independently and compactable.
requirePattern(worker, /function\s+compactJournalCommentTombstones\s*\(|async\s+function\s+compactJournalCommentTombstones\s*\(/, 'Missing bounded tombstone compaction path.');
requirePattern(worker, /expectedEntryRevision|commentGeneration|expectedCommentGeneration/, 'Compaction/mutation source lacks exact generation/CAS vocabulary needed to avoid retargeting replacements.');

// Ordinary search must not blindly include every deleted body.
const commentsContainSlice = functionSlice(textFilter, 'commentsContain', 'siteValues');
requirePattern(commentsContainSlice, /deletedAt|bodyRetained|commentState/, 'Comments search still lacks deleted lifecycle awareness.');
rejectPattern(commentsContainSlice, /for\s*\(const\s+item\s+of\s+comments\)\s*\{\s*if\s*\(contains\(item\?\.text\s*\?\?\s*item\?\.comment/, 'Ordinary search still blindly matches every raw tombstone body.');

// Portable export must be an explicit lifecycle projection. Raw IndexedDB
// spread plus normalizeJournalComments is not a lifecycle contract.
requirePattern(worker, /function\s+projectJournalEntryForPortableExport\s*\(|function\s+projectPortableJournalEntry\s*\(/, 'Missing explicit portable comment lifecycle projection.');
rejectPattern(worker, /JSON\.stringify\(\{\s*\.\.\.entry,\s*journalComments:\s*normalizeJournalComments\(entry\)\s*\}\)/, 'Full Journal export still serializes raw entry tombstones without lifecycle projection.');
requirePattern(worker, /commentLifecycle(?:PolicyVersion|Mode|Policy)|commentLifecycle\s*:/, 'Portable export lacks comment lifecycle policy/version receipt.');

// Import/restore must deterministically migrate legacy full tombstones under
// the same selected policy before destructive replace.
requirePattern(worker, /migrateImportedCommentTombstones|applyImportedCommentLifecycle|normalizeImportedCommentLifecycle/, 'Missing explicit legacy tombstone import migration helper.');
requirePattern(worker, /sanitizeImportedComments[\s\S]{0,4000}(?:migrateImportedCommentTombstones|applyImportedCommentLifecycle|normalizeImportedCommentLifecycle)|(?:migrateImportedCommentTombstones|applyImportedCommentLifecycle|normalizeImportedCommentLifecycle)[\s\S]{0,4000}sanitizeImportedComments/, 'Import sanitization is not visibly composed with lifecycle migration.');

// File export and Yandex backup already share stageFullJournalExport. Preserve
// that positive control rather than creating divergent serializers.
const stageCalls = [...worker.matchAll(/await\s+stageFullJournalExport\s*\(\s*\)/g)];
assert.ok(stageCalls.length >= 2, 'File export and Yandex backup no longer visibly share full-Journal snapshot serialization.');

// Journal page may render a deleted history body only under explicit retained
// history semantics. Current unconditional comment.text disclosure must go.
requirePattern(journal, /journal-comment-item-deleted/, 'Deleted comment UI state must remain represented truthfully.');
rejectPattern(journal, /journal-comment-deleted-text[\s\S]{0,240}textContent\s*=\s*comment\.text|textContent\s*=\s*comment\.text[\s\S]{0,240}journal-comment-deleted-text/, 'Journal UI still unconditionally rediscloses deleted body text.');
requirePattern(journal, /bodyRetained|research-history|commentLifecycle|deleted history/i, 'Deleted-comment UI lacks explicit lifecycle/body-retention awareness.');

// P1-211 must not be "fixed" only by inflating the old shared raw limits.
assert.ok(/MAX_ACTIVE_JOURNAL_COMMENTS_PER_ENTRY/.test(worker) && /MAX_(?:DELETED_COMMENT_TOMBSTONES|JOURNAL_COMMENT_TOMBSTONES)_PER_ENTRY/.test(worker), 'Separate capacity domains are mandatory; larger old limits are not closure.');

// OperationLog is diagnostics, not a deleted-body archive. This rejects an
// obvious workaround where body text is copied into a deletion event payload.
rejectPattern(deleteSlice, /appendOperationLogEvent\([\s\S]{0,500}(?:text|comment)\s*:/i, 'Delete path appears to copy comment body into OperationLog diagnostics.');

console.log('P1-211 comment tombstone lifecycle source gate: PASS');
