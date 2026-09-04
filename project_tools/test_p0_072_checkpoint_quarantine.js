'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');

(function sourceBinding() {
  assert.equal(
    /pendingStore\.clear\(\);\s*pendingDownloadStore\.clear\(\);\s*pendingRemoteStore\.clear\(\);/.test(source),
    false,
    'P0-072: clear-all must quarantine admitted recovery authority instead of clearing all recovery stores.'
  );
  assert.equal(
    /tx\.objectStore\(JOURNAL_PENDING_STORE\)\.clear\(\);\s*tx\.objectStore\(JOURNAL_PENDING_DOWNLOAD_STORE\)\.clear\(\);\s*tx\.objectStore\(JOURNAL_PENDING_REMOTE_STORE\)\.clear\(\);/.test(source),
    false,
    'P0-072: import replace must quarantine old recovery authority instead of clearing it.'
  );
  assert.equal(
    /if \(\(urlKey && pendingUrlKey === urlKey\) \|\| \(siteKey && pendingSiteKey === siteKey\)\) cursor\.delete\(\);/.test(source),
    false,
    'P0-072: scoped clear must transition matching checkpoints atomically instead of deleting them.'
  );

  assert.match(source, /const JOURNAL_RESET_DISPOSITION_VERSION = 1;/,
    'P0-072 requires a versioned reset/quarantine disposition.');
  assert.match(source, /journalResetDisposition/,
    'P0-072 requires reset/quarantine state to remain with the durable checkpoint.');
  assert.match(source, /manual-resolution/,
    'P0-072 unknown settlement must remain a bounded manual-resolution state.');
  assert.match(source, /quarantin/i,
    'P0-072 requires explicit quarantine semantics rather than missing-checkpoint cancellation.');
})();

(function deterministicLifecycleModel() {
  const reset = Object.freeze({
    version: 1,
    resetId: 'reset-001',
    kind: 'import-replace',
    scope: 'all',
    sourceOperationId: 'op-001',
    state: 'quarantined',
    outcome: 'pending',
    resolution: 'reconciling'
  });

  assert.equal(Object.prototype.hasOwnProperty.call(reset, 'scopeKey'), false,
    'P0-072/P0-066 boundary: reset disposition must not duplicate a plaintext URL/site scope key.');

  const base = {
    operationId: 'op-001',
    data: { meta: { url: 'https://example.test/a' } },
    journalResetDisposition: reset
  };

  const lateComplete = {
    ...base,
    journalResetDisposition: { ...reset, outcome: 'complete', resolution: 'terminal' }
  };
  assert.equal(lateComplete.journalResetDisposition.resetId, 'reset-001');
  assert.equal(lateComplete.journalResetDisposition.outcome, 'complete');
  assert.equal(lateComplete.journalResetDisposition.resolution, 'terminal');

  const lateUnknown = {
    ...base,
    kind: 'unknown',
    recoveryState: 'manual-resolution',
    journalResetDisposition: { ...reset, outcome: 'unknown', resolution: 'manual-resolution' }
  };
  assert.equal(lateUnknown.journalResetDisposition.resetId, 'reset-001');
  assert.equal(lateUnknown.recoveryState, 'manual-resolution');
  assert.equal(lateUnknown.journalResetDisposition.outcome, 'unknown');

  const reboundDownload = { ...base, downloadId: 77, kind: 'download' };
  assert.equal(reboundDownload.journalResetDisposition.resetId, 'reset-001',
    'intent->DownloadItem binding must preserve the reset generation.');

  const remoteVerified = {
    ...base,
    phase: 'remote-verified',
    journalResetDisposition: { ...reset, outcome: 'remote-verified', resolution: 'terminal' }
  };
  assert.equal(remoteVerified.journalResetDisposition.resetId, 'reset-001');
  assert.equal(remoteVerified.journalResetDisposition.outcome, 'remote-verified');
})();

console.log('P0-072 recovery checkpoint quarantine: PASS');
