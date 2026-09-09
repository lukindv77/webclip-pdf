'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (name) => fs.readFileSync(name, 'utf8');
const sw = read('service-worker.js');
const content = read('content.js');
const journal = read('journal.js');
const options = read('options.js');
const saveAs = read('prepared-save-as.js');

function any(text, patterns, message) {
  assert.ok(patterns.some((p) => p.test(text)), `RED: ${message}`);
}

assert.match(sw, /UserOperationReconcileResult|USER_OPERATION_RECONCILE_RESULT|reconcileUserOperation/i,
  'no common user-operation reconciliation result/projection');
assert.match(sw, /lookupResolution/i, 'no explicit lookupResolution axis');
assert.match(sw, /operationClass/i, 'no explicit operationClass axis');
assert.match(sw, /retryDisposition/i, 'no explicit retryDisposition authority');
assert.match(sw, /not-admitted/i, 'missing not-admitted class');
assert.match(sw, /domain-pending/i, 'missing domain-pending class');
assert.match(sw, /effect-unknown/i, 'missing effect-unknown class');
assert.match(sw, /failed-before-effect/i, 'missing failed-before-effect class');
assert.match(sw, /failed-terminal/i, 'missing failed-terminal class');
assert.match(sw, /evidence-limited/i, 'missing evidence-limited class');
assert.match(sw, /canceled/i, 'missing canceled terminal class');

assert.match(sw, /clientRequestId|admissionCorrelation/i, 'no durable admission lookup correlation');
assert.match(sw, /physicalOperationId|workerOperationId|operationInstanceId/i, 'no worker-issued physical identity');
assert.match(sw, /subjectKey/i, 'no bounded subject discovery key');
assert.match(sw, /requestFingerprint/i, 'no immutable request fingerprint');
any(sw, [/WebClipOperationReceipts/i, /OPERATION_RECEIPT_STORE/i], 'no functional operation receipt store');
any(sw, [/WEBCLIP_USER_OPERATION_RECONCILE/i, /reconcileUserOperation/i], 'no read-only reconcile API');
assert.match(sw, /ambiguous/i, 'no explicit ambiguous-discovery handling');

assert.match(sw, /OperationLog[^\n]{0,180}(?:diagnostic|diagnostics)|(?:diagnostic|diagnostics)[^\n]{0,180}OperationLog/i,
  'source does not explicitly demote OperationLog to diagnostics');

assert.match(sw, /pdfGeneration/i, 'save reconciliation has no exact PDF generation');
assert.match(sw, /sha256/i, 'save reconciliation has no content digest authority');
assert.match(sw, /remote-verified/i, 'remote-save reconciliation has no verified remote phase');
assert.match(sw, /publicationPhase|publication.*generation/i, 'remote-save reconciliation lacks publication settlement authority');
assert.match(sw, /expectedJournalGeneration|journalGeneration/i, 'save finalization lacks Journal-generation authority');

any(sw, [/download-start-unknown/i, /settlement-unknown/i, /PENDING_LOCAL_UNKNOWN_KIND/i],
  'local-download unknown effect state is not represented');

any(sw, [/delete.*checkpoint/i, /trash.*checkpoint/i, /destructive.*receipt/i],
  'Journal delete has no exact destructive-domain receipt/checkpoint');
any(sw, [/mark-read.*checkpoint/i, /move.*checkpoint/i, /remoteMoveReceipt/i],
  'Mark Read has no exact remote-move receipt/checkpoint');
assert.match(sw, /resourceId/i, 'remote destructive reconciliation lacks exact resource identity field');

assert.match(sw, /sourceRevision|journalRevision/i, 'backup receipt lacks exact Journal source revision');
any(sw, [/freshnessCurrent/i, /currentPostcondition/i, /backupFreshness/i],
  'backup reconcile result does not distinguish operation success from current freshness');

assert.match(sw, /stagingId|stagingKey/i, 'staged import reconciliation lacks exact staging identity');
assert.match(sw, /leaseToken/i, 'staged import reconciliation lacks lease authority');
assert.match(sw, /expectedRevision|journalGeneration|stagingGeneration/i,
  'staged import reconciliation lacks generation/revision authority');

assert.match(saveAs, /saveAsSessionId/i, 'Save As page lacks exact session identity');
assert.match(sw, /prepared/i, 'Save As reconciliation lacks PREPARED state');
assert.match(sw, /started/i, 'Save As reconciliation lacks STARTED state');
assert.match(sw, /released/i, 'Save As reconciliation lacks RELEASED tombstone/state');
any(sw, [/downloadId/i, /DownloadItem/i], 'Save As reconciliation lacks exact DownloadItem binding');

for (const [name, text] of [['content', content], ['journal', journal], ['options', options]]) {
  any(text, [/clientRequestId/i, /physicalOperationId/i, /reconcile/i], `${name} UI has no operation-reconcile identity/state`);
}
assert.doesNotMatch(journal,
  /catch\s*\([^)]*\)[\s\S]{0,2500}(?:Запись журнала не удалена|Запись журнала оставлена|Резервная копия не создана)[\s\S]{0,2500}(?:Повторить|retry)/i,
  'Journal still turns transport loss into an authoritative negative plus blind retry');

console.log('Wave 1 user-operation reconciliation source gate: PASS');
