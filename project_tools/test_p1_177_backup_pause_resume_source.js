'use strict';

const fs = require('fs');
const path = require('path');

const worker = fs.readFileSync(path.resolve(__dirname, '..', 'service-worker.js'), 'utf8');
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

function functionSlice(name, maxChars = 32000) {
  const start = worker.indexOf(`function ${name}`);
  if (start < 0) return '';
  return worker.slice(start, start + maxChars);
}

requireSource(/BACKUP_SCHEDULER_GENERATION|backupSchedulerGeneration|schedulerGeneration/.test(worker),
  'missing backup scheduler generation authority');
requireSource(/paused-no-auth|BACKUP_PAUSED_NO_AUTH|pauseJournalBackupScheduler/.test(worker),
  'missing explicit no-auth paused scheduler state');
requireSource(/resumeJournalBackupScheduler|resume.*backup.*generation/i.test(worker),
  'missing explicit scheduler resume generation transition');

const due = functionSlice('runDueJournalBackup');
requireSource(Boolean(due), 'cannot locate runDueJournalBackup()');
requireSource(/paused-no-auth|BACKUP_PAUSED_NO_AUTH|schedulerGeneration/.test(due),
  'due/retry handler does not check scheduler pause/generation before remote admission');
requireSource(/stale.*alarm|scheduledGeneration|alarmGeneration/.test(due),
  'due/retry handler lacks stale-alarm generation rejection');
requireSource(/connected|hasAuth|paused-no-auth|BACKUP_PAUSED_NO_AUTH/.test(due),
  'backup due decision still has no explicit auth/pause admission');

const disconnectArea = worker.slice(Math.max(0, worker.indexOf("case 'WEBCLIP_YANDEX_DISCONNECT'") - 400), Math.max(0, worker.indexOf("case 'WEBCLIP_YANDEX_DISCONNECT'") - 400) + 6000);
requireSource(/paused-no-auth|pauseJournalBackupScheduler|backupSchedulerGeneration/.test(disconnectArea),
  'Disconnect does not transition backup scheduler into a new paused generation');
requireSource(/writeYandexAuth\(null\)/.test(disconnectArea),
  'explicit Disconnect auth-clear positive control disappeared');

const exportFn = functionSlice('exportJournalBackupToYandex', 50000);
requireSource(Boolean(exportFn), 'cannot locate exportJournalBackupToYandex()');
requireSource(/pending|JOURNAL_BACKUP_PENDING_KEY/.test(exportFn),
  'signed backup path lost durable pending checkpoint positive control');
requireSource(!/paused-no-auth[\s\S]{0,1200}chrome\.storage\.local\.remove\(JOURNAL_BACKUP_PENDING_KEY\)/.test(worker),
  'pause path deletes pending signed-effect checkpoint as if cancellation were proven');

// Existing stale-retry-after-newer-success guard remains a positive control.
requireSource(/staleRetryAlarm|Устаревший retry alarm/.test(due),
  'existing stale retry-after-success positive control disappeared');

if (failures.length) {
  console.error('P1-177 backup pause/resume generation source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-177 backup pause/resume generation source gate: PASS');
