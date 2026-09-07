'use strict';

const fs = require('fs');
const path = require('path');

const worker = fs.readFileSync(path.resolve(__dirname, '..', 'service-worker.js'), 'utf8');
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

function functionSlice(name, maxChars = 36000) {
  const start = worker.indexOf(`function ${name}`);
  if (start < 0) return '';
  return worker.slice(start, start + maxChars);
}

// Durable coordinator state must exist independently of worker globals and
// independently of the alarm object that happened to wake the worker.
requireSource(
  /BACKGROUND_MAINTENANCE_(?:CURSOR|STATE)_KEY|MAINTENANCE_(?:PHASE_)?CURSOR_KEY|backgroundMaintenance(?:Cursor|State)/.test(worker),
  'missing durable background-maintenance phase cursor/state authority'
);
requireSource(
  /JOURNAL_BACKUP_(?:WORKFLOW|PROGRESS|CURSOR)_KEY|backgroundBackup(?:Workflow|Cursor|State)/.test(worker),
  'missing durable backup workflow/cursor authority across worker wakes'
);

// Maintenance must dispatch bounded resumable slices instead of running the
// whole fixed pipeline from phase 1 on every alarm wake.
requireSource(
  /run(?:Bounded)?(?:Background)?Maintenance(?:Wake)?Slice|runMaintenancePhaseSlice|advanceMaintenanceCursor/.test(worker),
  'missing bounded maintenance wake-slice dispatcher'
);

const maintenance = functionSlice('runLoggedOperationLogCleanup');
requireSource(Boolean(maintenance), 'cannot locate runLoggedOperationLogCleanup()');
requireSource(
  /maintenance(?:Cursor|State|Phase)|run(?:Bounded)?(?:Background)?Maintenance(?:Wake)?Slice|runMaintenancePhaseSlice/i.test(maintenance),
  'background maintenance does not consume durable phase/cursor state'
);
requireSource(
  !/cleanupExpiredOperationLogs[\s\S]*cleanupTransferPayloads[\s\S]*recoverPendingJournalAppends[\s\S]*recoverPendingRemoteSaves[\s\S]*reconcilePendingLocalDownloads[\s\S]*ensureJournalStatsHealthy/.test(maintenance),
  'background maintenance is still one fixed full pipeline that can restart from phase 1 after every MV3 termination'
);

// Long Journal staging must have restartable durable progress, not only a
// five-minute in-memory promise that creates a fresh stagingKey after restart.
const stage = functionSlice('stageFullJournalExportOnce', 42000);
requireSource(Boolean(stage), 'cannot locate stageFullJournalExportOnce()');
requireSource(
  /stage(?:Cursor|Progress|Checkpoint)|resume.*journal.*export|journalExport(?:Cursor|Progress)/i.test(stage),
  'Journal backup staging lacks a durable resumable cursor/checkpoint across worker termination'
);

// Unknown external effects remain reconciliation work. Lease expiry must only
// release execution ownership; it must not authorize a fresh signed effect.
const backup = functionSlice('exportJournalBackupToYandex', 42000);
requireSource(Boolean(backup), 'cannot locate exportJournalBackupToYandex()');
requireSource(
  /recoverPendingJournalBackup|reconcile.*backup/i.test(backup),
  'backup workflow lost its pending-effect reconciliation positive control'
);
requireSource(
  /pendingEffect|unknownEffect|reconcilePendingJournalBackup|JOURNAL_BACKUP_PENDING_KEY/.test(worker),
  'missing durable pending external-effect receipt/reconciliation authority'
);
requireSource(
  /lease.*(?:execution|ownership)|execution.*lease|lease.*not.*cancel|expiry.*not.*cancel/i.test(worker),
  'source does not make the lease-expiry-is-not-cancellation invariant explicit'
);

// Existing positive controls that P1-192 must preserve.
requireSource(/chrome\.alarms\.onAlarm\.addListener/.test(worker),
  'alarm wake-up boundary disappeared');
requireSource(/initializeJournalBackupScheduler\('worker-start'\)/.test(worker),
  'worker-start backup alarm reconstruction positive control disappeared');
requireSource(/initializeOperationLogCleanup\(\)/.test(worker),
  'worker-start maintenance alarm reconstruction positive control disappeared');
requireSource(/JOURNAL_BACKUP_PENDING_KEY/.test(worker) && /runOffscreenSignedTransfer/.test(worker),
  'durable backup checkpoint/offscreen-transfer positive control disappeared');
requireSource(/JOURNAL_BACKUP_LEASE_KEY/.test(worker),
  'backup lease positive control disappeared');

if (failures.length) {
  console.error('P1-192 MV3 lifecycle/fair progress source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-192 MV3 lifecycle/fair progress source gate: PASS');
