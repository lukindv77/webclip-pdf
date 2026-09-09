'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const sw = fs.readFileSync('service-worker.js', 'utf8');
const content = fs.readFileSync('content.js', 'utf8');
const options = fs.readFileSync('options.js', 'utf8');
const journal = fs.readFileSync('journal.js', 'utf8');

function requireAny(text, patterns, message) {
  assert.ok(patterns.some((pattern) => pattern.test(text)), `RED: ${message}`);
}

function around(text, needle, radius = 24000) {
  const i = text.indexOf(needle);
  if (i < 0) return '';
  return text.slice(Math.max(0, i - radius), Math.min(text.length, i + needle.length + radius));
}

assert.match(sw, /physicalOperationId|operationInstanceId|workerOperationId/i,
  'RED: no worker-issued physical operation identity');
assert.match(sw, /clientRequestId|admissionCorrelation/i,
  'RED: no caller request/admission correlation identity');
assert.match(sw, /clientCorrelationId|operationCorrelationId/i,
  'RED: no separate repeatable display/correlation identity');
requireAny(sw, [/createOperationContext/i, /admitUserOperation/i, /issuePhysicalOperation/i],
  'new-operation admission has no operation-context primitive');

requireAny(sw, [/OPERATION_RECEIPT_DB_NAME/i, /WebClipOperationReceipts/i, /OPERATION_RECEIPT_STORE/i],
  'no dedicated durable user-operation admission receipt store');
assert.match(sw, /requestFingerprint/i, 'RED: admission receipt has no immutable request fingerprint');
assert.match(sw, /subjectKey/i, 'RED: admission receipt has no bounded subject discovery key');
requireAny(sw, [/reconcileUserOperation/i, /WEBCLIP_USER_OPERATION_RECONCILE/i],
  'no read-only reconciliation protocol for lost outer responses');

assert.doesNotMatch(sw,
  /(?:generatePdfAndDownload|generatePdfAndUploadToYandex|retryCachedPdfUploadToYandex)\([^\n]{0,600}normalizeOperationIdInput\s*\(\s*message\.operationId\s*\)/,
  'RED: save handlers still pass caller operationId directly into physical execution');
assert.doesNotMatch(sw,
  /operationId\s*=\s*String\(operationId\s*\|\|\s*['"]['"]\)\s*\|\|\s*makeOperationLogId/,
  'RED: execution helper still chooses caller operationId or worker fallback as one conflated identity');

const startLog = around(sw, 'function startOperationLog');
assert.ok(startLog, 'missing startOperationLog');
assert.match(startLog, /physicalOperationId|operationContext/i,
  'RED: startOperationLog does not consume physical operation context');
assert.match(startLog, /clientRequestId|clientCorrelationId/i,
  'RED: OperationLog does not preserve client request/correlation separately');
assert.doesNotMatch(startLog, /const\s+id\s*=\s*String\(operationId\s*\|\|\s*['"]['"]\)/,
  'RED: OperationLog physical key is still caller text');

const pageProgress = around(sw, 'function emitPageUploadProgress');
assert.match(pageProgress, /physicalOperationId|operationContext/i,
  'RED: page progress has no physical operation identity');
assert.match(pageProgress, /clientRequestId|clientCorrelationId/i,
  'RED: page progress has no client correlation fields');
assert.doesNotMatch(pageProgress,
  /recordOperationStage\(operationId\s*,/,
  'RED: page progress still writes OperationLog using the presentation operationId');

const backupProgress = around(sw, 'function emitJournalBackupProgress');
assert.match(backupProgress, /physicalOperationId|operationContext/i,
  'RED: backup progress has no physical operation identity');
assert.match(backupProgress, /clientRequestId|clientCorrelationId/i,
  'RED: backup progress has no client correlation fields');

assert.match(content, /clientRequestId/i, 'RED: content UI has no clientRequestId state');
assert.match(content, /physicalOperationId/i, 'RED: content UI has no physicalOperationId state');
assert.match(options, /clientRequestId/i, 'RED: options progress has no clientRequestId state');
assert.match(options, /physicalOperationId/i, 'RED: options progress has no physicalOperationId state');
assert.match(journal, /clientRequestId/i, 'RED: journal operation UI has no clientRequestId state');
assert.match(journal, /physicalOperationId/i, 'RED: journal operation UI has no physicalOperationId state');

const pendingLocalKey = around(sw, 'function makePendingLocalDownloadIntentKey');
assert.ok(pendingLocalKey, 'missing local-download intent key helper');
assert.match(pendingLocalKey, /physicalOperationId|downloadIntentId|pendingIntentId/i,
  'RED: local-download intent key has no physical/domain identity');
assert.doesNotMatch(pendingLocalKey, /String\(operationId\s*\|\|/,
  'RED: local-download intent key still derives from caller operationId');

const pendingLocal = around(sw, 'checkpointPendingLocalDownloadIntent');
assert.match(pendingLocal, /physicalOperationId/i,
  'RED: local-download checkpoint does not retain physical operation provenance');
assert.match(pendingLocal, /clientRequestId|clientCorrelationId/i,
  'RED: local-download checkpoint does not separate client correlation');

const pendingRemote = around(sw, 'checkpointPendingRemoteSaveIntent');
assert.match(pendingRemote, /physicalOperationId/i,
  'RED: remote-save checkpoint has no physical operation provenance');
assert.match(pendingRemote, /sourceGenerationId|sourceReceipt/i,
  'RED: remote-save checkpoint has no exact source-generation provenance');
assert.match(pendingRemote, /clientRequestId|clientCorrelationId/i,
  'RED: remote-save checkpoint does not preserve client correlation separately');

const saveAs = around(sw, 'createPreparedSaveAsCheckpoint');
assert.match(saveAs, /saveAsSessionId/i, 'RED: Save As session positive control missing');
assert.match(saveAs, /physicalOperationId/i,
  'RED: prepared Save As checkpoint has no physical operation provenance');

assert.match(sw, /operationLink/i, 'RED: new Journal rows have no explicit worker-minted local operation link');
assert.match(sw, /historicalOperationId|imported-unverified|legacy-unverified/i,
  'RED: imported/legacy operation identifiers are not explicitly demoted');
assert.doesNotMatch(journal,
  /WEBCLIP_OPERATION_LOG_GET[\s\S]{0,700}operationId:\s*exactOperationId/,
  'RED: Journal still auto-links a portable/plain operationId by string equality');

const dispatcherFinish = around(sw, "case 'WEBCLIP_OPERATION_LOG_FINISH'", 5000);
if (dispatcherFinish) {
  requireAny(dispatcherFinish,
    [/domainReceipt/i, /stagingId/i, /leaseToken/i, /operationContinuationReceipt/i, /deprecated.*reject/i],
    'generic WEBCLIP_OPERATION_LOG_FINISH still accepts a bare id without domain authority');
}

assert.match(sw, /sourceGenerationId|sourceGenerationReceipt/i,
  'RED: sourceGenerationId/source receipt is not propagated through operation context');
assert.match(sw, /pdfGeneration|pdfCacheGeneration/i,
  'RED: PDF generation identity positive control missing');

requireAny(sw, [
  /clientRequestId[^\n]{0,180}(?:not|never)[^\n]{0,100}(?:ownership|physical|capability)/i,
  /(?:not|never)[^\n]{0,100}(?:ownership|physical|capability)[^\n]{0,180}clientRequestId/i,
  /clientCorrelationId[^\n]{0,180}(?:not|never)[^\n]{0,100}(?:ownership|physical|capability)/i
], 'missing explicit trust rule separating caller correlation from physical ownership');

console.log('Wave 1 operation-context cutover source contract: PASS');
