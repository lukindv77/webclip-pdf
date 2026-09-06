'use strict';

const fs = require('fs');
const path = require('path');

const worker = fs.readFileSync(path.resolve(__dirname, '..', 'service-worker.js'), 'utf8');
const journal = fs.readFileSync(path.resolve(__dirname, '..', 'journal.js'), 'utf8');
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

function functionSlice(source, name, maxChars = 30000) {
  const start = source.indexOf(`function ${name}`);
  if (start < 0) return '';
  return source.slice(start, start + maxChars);
}

requireSource(/OPERATION_LINK_VERSION|JOURNAL_OPERATION_LINK_VERSION/.test(worker),
  'missing versioned Journal-to-OperationLog link receipt');
requireSource(/operationProvenance|operationLink/.test(worker),
  'worker has no explicit operation-link provenance model');

const imported = functionSlice(worker, 'normalizeImportedJournalEntry');
requireSource(Boolean(imported), 'cannot locate normalizeImportedJournalEntry()');
requireSource(!/operationId:\s*importedOperationId/.test(imported),
  'import normalization still writes imported operationId into live linkage field');
requireSource(/historicalOperationId|importedOperationIdHistorical/.test(imported),
  'import normalization does not preserve historical id under an explicitly unverified field');
requireSource(/imported-unverified|legacy-unverified/.test(imported),
  'import normalization does not mark operation provenance as unverified');
requireSource(/operationLink:\s*null|stripImportedOperationLink|sanitizeImportedOperationLink/.test(imported),
  'import normalization does not strip/demote portable operationLink authority');

const append = functionSlice(worker, 'appendJournalEntry');
requireSource(Boolean(append), 'cannot locate appendJournalEntry()');
requireSource(/operationLink/.test(append) && /live-local/.test(append),
  'new live Journal rows do not receive a worker-minted local OperationLog link receipt');

const linked = functionSlice(journal, 'buildLinkedOperationLog');
requireSource(Boolean(linked), 'cannot locate buildLinkedOperationLog()');
requireSource(/operationLink|WEBCLIP_OPERATION_LOG_GET_LINKED/.test(linked),
  'Journal UI still lacks receipt-based linked-log admission');
requireSource(!/const\s+exactOperationId\s*=\s*\/\^\[A-Za-z0-9\._:\-\]\{1,160\}\$\/.test(linked),
  'Journal UI still treats regex-valid entry.operationId as sufficient exact linkage');
requireSource(!/WEBCLIP_OPERATION_LOG_GET['"],?\s*operationId:\s*exactOperationId/.test(linked),
  'Journal UI still fetches linked log directly from plain entry.operationId');

if (failures.length) {
  console.error('P1-190 imported operation provenance source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-190 imported operation provenance source gate: PASS');
