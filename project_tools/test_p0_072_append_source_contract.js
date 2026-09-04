'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');

function asyncFunctionBlock(name) {
  const marker = `async function ${name}`;
  const start = source.indexOf(marker);
  assert(start >= 0, `Missing source function ${name}.`);
  const next = source.indexOf('\nasync function ', start + marker.length);
  return source.slice(start, next >= 0 ? next : source.length);
}

(function appendHasStructuredRecoveryOutcome() {
  const append = asyncFunctionBlock('appendJournalEntry');
  assert.match(source, /suppressed-reset-detached/,
    'P0-072: runtime needs a machine-readable reset-detached Journal suppression outcome.');
  assert.match(source, /suppressed-missing/,
    'P0-072: missing durable authority must remain distinct from reset detachment.');
  assert.match(append, /journalResetDisposition/,
    'P0-072: append transaction must classify durable/pending reset disposition before Journal write.');
})();

(function inlinePendingDeletesAreFenced() {
  const append = asyncFunctionBlock('appendJournalEntry');
  assert.equal(
    /durableCheckpointMissing\s*=\s*true;\s*pendingStore\.delete\(id\)/s.test(append),
    false,
    'P0-072: missing durable checkpoint must not delete fallback pending evidence.'
  );
  assert.equal(
    /const checkEntry[\s\S]*?pendingStore\.delete\(id\)/.test(append),
    false,
    'P0-072: checkEntry must not perform key-only inline pending delete.'
  );
  assert.match(append, /operationId|sourceOperationId/,
    'P0-072: incidental pending cleanup needs operation identity for compare-delete.'
  );
})();

(function recoveryDoesNotCallDetachedCancellation() {
  const recover = asyncFunctionBlock('recoverPendingJournalAppends');
  assert.equal(/else\s+cancelled\s*\+=\s*1/.test(recover), false,
    'P0-072: reset-detached/manual rows must not be counted as generic cancellation.');
})();

(function durableHelperReturnsJournalOutcome() {
  const helper = asyncFunctionBlock('appendJournalEntryFromDurableCheckpoint');
  assert.match(helper, /journalOutcome/,
    'P0-072: durable finalization helper must expose structured Journal outcome.');
  assert.equal(/был удалён конкурентной очисткой\/заменой журнала/.test(helper), false,
    'P0-072: warning text must not equate missing checkpoint with reset cancellation.');
})();

(function dormantSafeAppendCannotBypassCheckpoint() {
  const safe = asyncFunctionBlock('safeAppendJournalEntry');
  assert.match(safe, /requirePendingCheckpoint\s*:\s*true|appendJournalEntryWithOutcome|return\s+appendJournalEntryFrom/i,
    'P0-072: dormant safeAppendJournalEntry must require its durable pending checkpoint or be retired.'
  );
})();

console.log('P0-072 append source contract: PASS');
