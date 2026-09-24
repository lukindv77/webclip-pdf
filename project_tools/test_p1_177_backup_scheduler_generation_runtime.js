'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');

let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }
function eq(actual, expected, message) { assert.strictEqual(actual, expected, message); checks += 1; }
function has(text, needle, message = needle) { ok(text.includes(needle), `missing ${message}`); }
function lacks(text, needle, message = needle) { ok(!text.includes(needle), `unexpected ${message}`); }

function section(startMarker, endMarker) {
  const start = SOURCE.indexOf(startMarker);
  const end = SOURCE.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start, `source section missing: ${startMarker} -> ${endMarker}`);
  return SOURCE.slice(start, end);
}

const control = section(
  'function normalizeJournalBackupSchedulerGeneration',
  'async function saveJournalBackupSettings'
);
const init = section(
  "async function initializeJournalBackupScheduler(reason = 'init')",
  "async function runDueJournalBackup"
);
const due = section(
  "async function runDueJournalBackup(reason = 'scheduled', forceRetry = false, scheduledGeneration = 0)",
  'function openTransferPayloadDb'
);
const listener = section(
  'chrome.alarms.onAlarm.addListener((alarm) => {',
  'const WEBCLIP_RUNTIME_VERSION_KEY'
);
const disconnect = section(
  "case 'WEBCLIP_YANDEX_DISCONNECT':",
  "case 'WEBCLIP_YANDEX_SAVE_ROOT':"
);
const finishAuth = section(
  'async function finishYandexOAuth(authAttemptId, code)',
  'async function exchangeAuthorizationCode'
);
const manualAuth = section(
  'async function setManualYandexToken(token)',
  'async function getValidYandexAccessToken'
);
const connection = section(
  'async function testYandexConnection()',
  'function extractDiskAccount'
);
const upload = section(
  'async function uploadJournalExportStagedToYandex(',
  'async function recoverPendingJournalBackup'
);
const recovery = section(
  'async function recoverPendingJournalBackup(',
  'async function finalizeJournalBackupSuccessHousekeeping'
);
const backup = section(
  'async function exportJournalBackupToYandex(',
  'function parseJournalMonthFolder'
);
const folderTree = section(
  'async function ensureYandexFolderTree(',
  'async function yandexApi('
);

// Durable scheduler authority is explicit and separate from alarm names.
has(SOURCE, "const JOURNAL_BACKUP_SCHEDULER_CONTROL_KEY = 'webclipJournalBackupSchedulerControl';");
has(SOURCE, 'const JOURNAL_BACKUP_SCHEDULER_CONTROL_VERSION = 1;');
has(control, "['active', 'paused-no-auth', 'paused-user', 'paused-unconfigured']");
has(control, 'nextJournalBackupSchedulerGeneration');
has(control, 'periodicGeneration');
has(control, 'periodicDueAt');
has(control, 'retryGeneration');
has(control, 'retryDueAt');
has(control, 'normalizeJournalBackupSchedulerDueAt');
has(control, 'authRecordId');
has(control, 'authControlGeneration');
has(control, 'accountUid');
has(control, 'rootPath');
lacks(control, 'accessToken:', 'scheduler control must not durably store OAuth secret');
lacks(control, 'refreshToken', 'scheduler control must not durably store refresh secret');

// Generation transitions clear scheduled receipts when a new generation is created.
has(control, 'const generation = (forceAdvance || identityChanged || modeChanged || !previous.generation)');
has(control, 'periodicGeneration: generation === previous.generation ? previous.periodicGeneration : 0');
has(control, 'retryGeneration: generation === previous.generation ? previous.retryGeneration : 0');
has(control, "transitionJournalBackupScheduler('paused-no-auth'");
has(control, 'await clearJournalBackupAlarms()');

// Active proof consumes current auth-generation/account/root authority without persisting token material.
has(control, 'const authState = await readYandexAuthState()');
has(control, 'describeYandexAuthTruth(auth, authState.authControlGeneration)');
has(control, 'makeYandexAuthRequestReceipt(auth, authState.authControlGeneration)');
has(control, 'Boolean(truth.authUsable && authReceipt.authorizationBound)');
has(control, "boundedYandexExternalText(auth?.account?.uid || ''");
has(control, "normalizeDiskPath(authState.yandexConfig?.rootPath || '')");

// Fixed alarm names receive an exact durable generation + due-time receipt.
has(control, 'recordJournalBackupScheduledReceipt(kind, generation, dueAt)');
has(control, 'previous.generation !== normalizedGeneration');
has(control, "return { ...previous, retryGeneration: normalizedGeneration");
has(control, "retryDueAt: normalizeJournalBackupSchedulerDueAt(dueAt)");
has(control, "return { ...previous, periodicGeneration: normalizedGeneration");
has(control, "periodicDueAt: normalizeJournalBackupSchedulerDueAt(dueAt)");
has(control, 'scheduleJournalBackupAlarm(kind, name, when, label)');
has(control, 'const dueAt = normalizeJournalBackupSchedulerDueAt(when)');
has(control, 'const currentReceipt = scheduledJournalBackupReceipt(current, kind)');
has(control, 'currentReceipt.generation !== generation');
has(control, 'currentReceipt.dueAt !== dueAt');
has(control, 'chrome.alarms.create(name, { when: dueAt })');

// Alarm delivery itself is not authority: exact scheduledTime must match the durable receipt.
has(control, 'dispatchJournalBackupAlarm(alarm)');
has(control, 'const scheduledReceipt = scheduledJournalBackupReceipt(control, kind)');
has(control, 'const scheduledGeneration = scheduledReceipt.generation');
has(control, 'const deliveryCurrent = journalBackupAlarmMatchesReceipt(alarm, scheduledReceipt)');
has(control, 'normalizeJournalBackupSchedulerDueAt(alarm?.scheduledTime) === receipt.dueAt');
has(control, 'scheduledGeneration !== control.generation');
has(control, "reason: !deliveryCurrent ? 'stale-delivery-receipt' : admission.reason");
has(control, "chrome.alarms.clear(alarm.name)");
has(listener, 'dispatchJournalBackupAlarm(alarm)');
lacks(listener, "runDueJournalBackup('periodic-alarm', false)");
lacks(listener, "runDueJournalBackup('retry-alarm', true)");

// Worker/startup may reuse an alarm only with the exact current generation + scheduledTime receipt.
has(init, "reason === 'worker-start' || reason === 'startup'");
has(init, "const periodicReceipt = scheduledJournalBackupReceipt(control, 'periodic')");
has(init, "const retryReceipt = scheduledJournalBackupReceipt(control, 'retry')");
has(init, 'journalBackupAlarmMatchesReceipt(periodicAlarm, periodicReceipt)');
has(init, 'journalBackupAlarmMatchesReceipt(retryAlarm, retryReceipt)');
has(init, 'periodicReceipt.generation === control.generation');
has(init, 'retryReceipt.generation === control.generation');
has(init, 'await clearJournalBackupAlarms()');
has(init, 'schedulerGeneration: control.generation');

// Callback and pre-pipeline admission are both rechecked.
eq((due.match(/proveJournalBackupSchedulerAdmission\(scheduledGeneration\)/g) || []).length, 2,
  'runDue must recheck scheduler generation twice before entering backup pipeline');
has(due, "schedulerReason: schedulerAdmission.reason");
has(due, "schedulerReason: finalAdmission.reason");
has(due, 'schedulerGeneration: scheduledGeneration');
has(due, 'exportJournalBackupToYandex({ reason, operationId, schedulerGeneration: scheduledGeneration })');
has(due, 'staleRetryAlarm: true', 'existing newer-success stale-retry guard remains');

// Explicit disconnect revokes future scheduler admission but preserves pending checkpoint truth.
has(disconnect, 'await disconnectYandexAuthControl()');
has(disconnect, "await pauseJournalBackupSchedulerNoAuth('explicit-disconnect')");
lacks(disconnect, 'JOURNAL_BACKUP_PENDING_KEY');

// Successful auth establishment/repair creates a new scheduler generation.
has(finishAuth, "initializeJournalBackupScheduler('auth-resume')");
has(manualAuth, "initializeJournalBackupScheduler('auth-resume')");
has(connection, "initializeJournalBackupScheduler('auth-resume')");

// Every later background remote child consumes a fresh scheduler-generation gate.
has(control, 'assertJournalBackupRemoteChildAdmission');
has(control, 'captureJournalBackupSchedulerOperationContext');
has(backup, 'backgroundSchedulerGeneration');
has(backup, 'captureJournalBackupSchedulerOperationContext(backgroundSchedulerGeneration)');
has(backup, 'beforeRemoteChild = (remoteChild) => assertJournalBackupRemoteChildAdmission');
has(backup, "error?.code === 'JOURNAL_BACKUP_SCHEDULER_STALE'");
ok(backup.indexOf("error?.code === 'JOURNAL_BACKUP_SCHEDULER_STALE'") < backup.indexOf('const failureAt = Date.now();'),
  'stale child veto must bypass ordinary backup failure bookkeeping');
has(upload, "await admitRemoteChild('upload-url')");
has(upload, "await admitRemoteChild('signed-upload')");
has(upload, "await admitRemoteChild('post-upload-verify')");
has(upload, 'schedulerGeneration: normalizeJournalBackupSchedulerGeneration(schedulerGeneration)');
ok(upload.indexOf('[JOURNAL_BACKUP_PENDING_KEY]: pending') < upload.indexOf("await admitRemoteChild('signed-upload')"),
  'prepared checkpoint must exist before signed transfer admission');
ok(upload.indexOf("await admitRemoteChild('signed-upload')") < upload.indexOf('runOffscreenSignedTransfer'),
  'fresh scheduler gate must precede signed transfer start');
has(recovery, "await admitRemoteChild('recovery-verify')");
has(folderTree, "beforeRemoteChild('folder-provision')");
has(folderTree, "beforeRemoteChild('folder-verify')");
has(upload, 'operationContext');
has(recovery, 'operationContext');

// Compact race simulation mirrors the durable generation rules.
function controller({
  generation = 1,
  mode = 'active',
  periodicGeneration = 0,
  periodicDueAt = 0,
  retryGeneration = 0,
  retryDueAt = 0
} = {}) {
  return { generation, mode, periodicGeneration, periodicDueAt, retryGeneration, retryDueAt };
}
function transition(c, mode) {
  return {
    generation: c.generation + 1,
    mode,
    periodicGeneration: 0,
    periodicDueAt: 0,
    retryGeneration: 0,
    retryDueAt: 0
  };
}
function schedule(c, kind, dueAt = 1000) {
  if (c.mode !== 'active') return { ...c };
  return kind === 'retry'
    ? { ...c, retryGeneration: c.generation, retryDueAt: dueAt }
    : { ...c, periodicGeneration: c.generation, periodicDueAt: dueAt };
}
function receipt(c, kind) {
  return kind === 'retry'
    ? { generation: c.retryGeneration, dueAt: c.retryDueAt }
    : { generation: c.periodicGeneration, dueAt: c.periodicDueAt };
}
function admit(c, kind, alarmScheduledTime = receipt(c, kind).dueAt) {
  const r = receipt(c, kind);
  return c.mode === 'active'
    && r.generation > 0
    && r.generation === c.generation
    && r.dueAt > 0
    && r.dueAt === alarmScheduledTime;
}
function mayCreateAfterQueue(c, kind, preparedGeneration, preparedDueAt) {
  const r = receipt(c, kind);
  return c.mode === 'active'
    && c.generation === preparedGeneration
    && r.generation === preparedGeneration
    && r.dueAt === preparedDueAt;
}

{
  let c = schedule(controller({ generation: 4 }), 'periodic', 4000);
  ok(admit(c, 'periodic', 4000), 'current periodic generation+time receipt admits');
  ok(!admit(c, 'periodic', 3999), 'same generation with stale scheduledTime is rejected');
  c = transition(c, 'paused-no-auth');
  ok(!admit(c, 'periodic', 4000), 'disconnect invalidates old periodic receipt');
  eq(c.periodicGeneration, 0, 'disconnect clears periodic receipt');
  eq(c.periodicDueAt, 0, 'disconnect clears periodic due-time receipt');
}
{
  let c = schedule(controller({ generation: 7 }), 'retry');
  ok(admit(c, 'retry'), 'current retry receipt admits');
  c = transition(c, 'paused-no-auth');
  c = transition(c, 'active');
  ok(!admit(c, 'retry'), 'reauth does not revive pre-disconnect retry receipt');
  eq(c.generation, 9, 'disconnect and resume each create a generation');
}
{
  let c = transition(controller({ generation: 3 }), 'paused-user');
  c = schedule(c, 'periodic');
  ok(!admit(c, 'periodic'), 'paused-user cannot schedule authority');
}
{
  const delivered = schedule(controller({ generation: 12 }), 'periodic', 12000);
  const staleAfterLocalPrep = transition(delivered, 'paused-no-auth');
  ok(!admit(staleAfterLocalPrep, 'periodic', 12000), 'second pre-pipeline check blocks callback after disconnect');
}
{
  const prepared = schedule(controller({ generation: 20 }), 'periodic', 20000);
  const nextGeneration = transition(prepared, 'active');
  ok(!mayCreateAfterQueue(nextGeneration, 'periodic', 20, 20000),
    'late create prepared by an old generation is vetoed inside the serialized alarm mutation');
}
{
  const first = schedule(controller({ generation: 30 }), 'periodic', 30000);
  const superseded = schedule(first, 'periodic', 31000);
  ok(!mayCreateAfterQueue(superseded, 'periodic', 30, 30000),
    'same-generation older due-time cannot replace the newer exact receipt');
  ok(mayCreateAfterQueue(superseded, 'periodic', 30, 31000),
    'same-generation latest exact due-time may create');
  ok(!admit(superseded, 'periodic', 30000),
    'startup/dispatch rejects alarm whose scheduledTime no longer matches the durable receipt');
  ok(admit(superseded, 'periodic', 31000),
    'startup/dispatch accepts exact generation+scheduledTime receipt');
}

console.log(`P1-177 backup scheduler generation runtime: PASS; checks=${checks}; durable_generation=true; exact_due_time=true; late_stale_create=false; fixed_alarm_is_delivery_only=true; disconnect_pause=true; auth_resume_generation=true; callback_recheck=true; pre_pipeline_recheck=true; per_child_remote_recheck=true; started_effect_checkpoint=preserved; provider_calls=0`);
