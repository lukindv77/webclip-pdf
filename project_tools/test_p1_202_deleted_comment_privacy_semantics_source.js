'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const journal = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');
const filter = fs.readFileSync(path.join(root, 'journal-text-filter.js'), 'utf8');
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

const all = `${worker}\n${journal}\n${filter}`;

// Positive controls that should remain after the privacy fix.
requireSource(/deletedAt/.test(worker) && /deletedAt/.test(journal), 'missing deleted-comment tombstone positive control');
requireSource(/WEBCLIP_JOURNAL_DELETE_COMMENT/.test(worker) && /WEBCLIP_JOURNAL_DELETE_COMMENT/.test(journal), 'missing explicit comment-delete flow');
requireSource(/MAX_IMPORTED_COMMENT_CHARS/.test(worker) && /MAX_JOURNAL_COMMENTS_TOTAL_CHARS/.test(worker), 'missing bounded comment payload positive controls');
requireSource(/JOURNAL_EXPORT_SCHEMA/.test(worker) && /sanitizeImportedComments/.test(worker), 'missing full export/import positive controls');

// Target 1: source names one privacy-delete/redaction contract centrally.
requireSource(/privacy[-_ ]?delete|deletedCommentPrivacy|redactDeletedComment|sanitizeDeletedComment/i.test(all),
  'no explicit central privacy-delete/redaction contract for deleted comments');

// Target 2: delete mutation removes/redacts body, not only deletedAt.
requireSource(
  /deleteJournalComment[\s\S]{0,7000}(?:text\s*:\s*['"]{2}|delete\s+[^;\n]*\.text|redactDeletedComment|sanitizeDeletedComment)/i.test(worker),
  'deleteJournalComment() does not visibly remove/redact the deleted body'
);

// Target 3: normalization cannot materialize deleted body text back into current records.
requireSource(
  /normalizeJournalComments[\s\S]{0,8000}deletedAt[\s\S]{0,3500}(?:text\s*:\s*['"]{2}|delete\s+[^;\n]*\.text|redactDeletedComment|sanitizeDeletedComment)/i.test(worker),
  'normalizeJournalComments() does not visibly enforce bodyless deleted tombstones'
);
requireSource(
  /normalizeEntryJournalComments[\s\S]{0,8000}deletedAt[\s\S]{0,3500}(?:text\s*:\s*['"]{2}|redactDeletedComment|sanitizeDeletedComment|bodyless)/i.test(journal),
  'journal page normalization does not visibly enforce bodyless deleted tombstones'
);

// Target 4: UI must not redisclose deleted body.
requireSource(
  /journal-comment-item-deleted[\s\S]{0,3500}(?:deletedAt|Удал[её]н)/i.test(journal),
  'deleted-comment UI tombstone marker disappeared'
);
requireSource(
  !/journal-comment-item-deleted[\s\S]{0,3500}textContent\s*=\s*comment\.text/i.test(journal),
  'deleted-comment UI still rediscloses comment.text'
);

// Target 5: ordinary search ignores deleted bodies even if legacy data still contains them.
requireSource(
  /commentsContain[\s\S]{0,6000}deletedAt/i.test(filter),
  'ordinary comment search has no deletedAt/privacy filter'
);

// Target 6: export path uses privacy-normalized comments before serialization.
requireSource(
  /readJournalEntryBatch[\s\S]{0,10000}(?:privacy|redact|sanitizeDeleted|normalizeJournalComments)/i.test(worker),
  'full Journal export does not visibly pass comments through privacy normalization'
);

// Target 7: imported deleted tombstones cannot carry verbatim body into current record.
requireSource(
  /sanitizeImportedComments[\s\S]{0,10000}deletedAt[\s\S]{0,5000}(?:privacy|redact|sanitizeDeleted|text\s*:\s*['"]{2})/i.test(worker),
  'import does not visibly redact body from deleted tombstones'
);

// Target 8: source states pre-delete backups are outside active-record erasure guarantee.
requireSource(
  /pre[- ]?delete|before deletion|historical backup|existing backup|предыдущ[^\n]{0,80}резерв/i.test(all),
  'missing explicit boundary that pre-delete historical backups are not falsely claimed erased'
);

// Target 9: source explicitly avoids storing derivative deleted-body copies in ordinary audit/tombstone metadata.
requireSource(
  /deleted[^\n]{0,160}(?:body|text)[^\n]{0,160}(?:must not|cannot|не должен|не хран)/i.test(all),
  'missing explicit invariant against derivative deleted-body copies'
);

// Target 10: P1-211 retention/capacity remains separate from P1-202 privacy semantics.
requireSource(
  /P1-211/.test(all) && /retention|capacity|tombstone/i.test(all),
  'source does not preserve P1-211 as separate tombstone retention/capacity owner'
);

if (failures.length) {
  console.error('P1-202 deleted comment privacy semantics source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-202 deleted comment privacy semantics source gate: PASS');
