'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const journal = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');
const options = fs.existsSync(path.join(root, 'options.js')) ? fs.readFileSync(path.join(root, 'options.js'), 'utf8') : '';
const popup = fs.existsSync(path.join(root, 'popup.js')) ? fs.readFileSync(path.join(root, 'popup.js'), 'utf8') : '';
const content = fs.existsSync(path.join(root, 'content.js')) ? fs.readFileSync(path.join(root, 'content.js'), 'utf8') : '';
const pages = `${journal}\n${options}\n${popup}\n${content}`;
const all = `${worker}\n${pages}`;
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

function bodyAround(source, needle, maxChars = 20000) {
  const start = source.indexOf(needle);
  if (start < 0) return '';
  return source.slice(start, Math.min(source.length, start + maxChars));
}

// Positive controls: current mutation/log surfaces must remain recognizable.
requireSource(/WEBCLIP_JOURNAL_DELETE/.test(all), 'journal delete mutation positive control missing');
requireSource(/WEBCLIP_JOURNAL_MARK_READ/.test(all), 'journal mark-read mutation positive control missing');
requireSource(/WEBCLIP_OPERATION_LOG_GET/.test(worker), 'OperationLog read positive control missing');
requireSource(/startOperationLog|makeOperationLogId/.test(worker), 'worker operation/log identity positive control missing');
requireSource(/chrome\.runtime\.sendMessage/.test(pages), 'runtime messaging positive control missing');

// Target 1: caller correlation must be explicit and semantically separate from physical operationId.
requireSource(/clientRequestId|requestCorrelationId|admissionCorrelationId/.test(all),
  'no explicit caller admission correlation separate from physical operationId');
requireSource(/physicalOperationId|workerOperationId|issuedOperationId|operationReceipt/i.test(worker),
  'no visible worker-issued physical operation receipt field/helper');

// Current delete path is an intentional RED control until P1-198/P1-210 composition is implemented.
const deleteWorker = bodyAround(worker, 'async function deleteJournalEntry');
requireSource(!/operationId\s*=\s*String\(operationId\s*\|\|\s*['"]['"]\)\s*\|\|\s*makeOperationLogId/.test(deleteWorker),
  'journal delete still accepts caller textual operationId as physical identity authority');

// Target 2: durable admission lookup/index before side effects.
requireSource(/UserOperationAdmission|USER_OPERATION_ADMISSION|userOperationAdmission|admissionReceipt/i.test(worker),
  'no visible durable user-operation admission receipt/index');
requireSource(/clientRequestId[\s\S]{0,2000}(?:operationId|physicalOperationId)[\s\S]{0,2000}(?:put|set|persist|store)|(?:put|set|persist|store)[\s\S]{0,2000}clientRequestId/i.test(worker),
  'no visible durable correlation-to-worker-receipt persistence');
requireSource(/requestFingerprint|operationFingerprint|admissionFingerprint|fingerprint/i.test(worker),
  'admission receipt has no immutable request fingerprint evidence');
requireSource(/CORRELATION_MISMATCH|correlation mismatch|несовпад.*корреляц/i.test(all),
  'same-correlation payload mismatch is not visibly rejected');

// Target 3: common read-only reconciliation surface exists.
requireSource(/WEBCLIP_(?:USER_)?OPERATION_(?:RECONCILE|STATUS)|USER_OPERATION_RECONCILE/.test(all),
  'no common user-operation read-only reconciliation message is visible');
requireSource(/reconcileUserOperation|readUserOperationReceipt|getUserOperationStatus|discoverOutstandingUserOperation/i.test(worker),
  'no common read-only reconciliation helper is visible');
requireSource(/not-admitted|settlement-unknown|failed-before-effect|receipt-detached/i.test(all),
  'reconciliation result model does not visibly distinguish admission/settlement classes');

// Target 4: page reload/lost globals can discover unresolved operations by bounded logical subject.
requireSource(/discoverOutstandingUserOperation|USER_OPERATION_DISCOVER|reconcile.*subject|subjectKey/i.test(all),
  'no visible bounded unresolved-operation discovery by logical subject');
requireSource(/operationKind|subjectKey|logicalSubject|journalEntryId/.test(worker),
  'reconciliation receipt lacks visible operation-kind/subject scoping');

// Target 5: outer transport loss must render unknown/reconcile, not an authoritative negative.
requireSource(/result.*unknown|operation.*unknown|результат.*неизвест|неизвест.*результат|Проверить результат/i.test(pages),
  'page mutation UI has no explicit unknown/reconcile state for lost outer response');
requireSource(/Проверить результат|reconcile/i.test(journal),
  'Journal destructive-operation UI does not visibly offer/perform read-only reconciliation');

const deleteUi = bodyAround(journal, "type: 'WEBCLIP_JOURNAL_DELETE'", 14000);
const markReadUi = bodyAround(journal, "type: 'WEBCLIP_JOURNAL_MARK_READ'", 12000);
requireSource(!/Запись журнала не удалена\./.test(deleteUi) || /reconcile|неизвест/i.test(deleteUi),
  'delete catch can still assert “Запись журнала не удалена” without reconciliation evidence');
requireSource(!/Запись журнала оставлена в режиме «Прочитать позже»/.test(markReadUi) || /reconcile|неизвест/i.test(markReadUi),
  'mark-read catch can still assert old reading state without reconciliation evidence');
requireSource(!/Резервная копия не создана/.test(journal) || /результат.*неизвест|reconcile/i.test(journal),
  'backup UI can still assert backup non-creation from an outer failure without reconciliation state');

// Target 6: transport loss must not directly unlock a fresh non-idempotent retry.
requireSource(/retryEligible|canRetry.*not-admitted|failed-before-effect|retry.*reconcile/i.test(pages),
  'no visible retry-admission policy tied to authoritative reconciliation state');
requireSource(!/deleteRetry\.addEventListener\([^\n]*runDeleteOperation\(deleteRetryAction\)/.test(journal) ||
  /deleteRetry[\s\S]{0,3000}(?:reconcile|not-admitted|failed-before-effect)/i.test(journal),
  'delete Retry still directly starts a mutation without visible reconciliation admission');

// Target 7: reconciliation is presentation-generation fenced.
requireSource(/reconciliationGeneration|operationReconcileGeneration|reconcileGeneration|requestGeneration/i.test(pages),
  'no visible UI generation fence for late reconciliation responses');

// Target 8: OperationLog stays diagnostic; subsystem receipt truth remains visible.
requireSource(/effectReceipt|settlementReceipt|remote.*receipt|pendingRemote|pendingLocalDownload/i.test(worker),
  'no visible subsystem receipt source for user-operation reconciliation');
requireSource(!/WEBCLIP_OPERATION_LOG_GET[\s\S]{0,6000}(?:canRetry|safeToRetry|not-admitted)/i.test(pages),
  'OperationLog GET appears to be used directly as retry authority');

// Target 9: reconciliation reads must not themselves invoke mutation helpers as a side effect.
const reconcileWorker = bodyAround(worker, 'reconcileUserOperation', 14000);
if (reconcileWorker) {
  requireSource(!/deleteJournalEntry\(|markJournal.*Read\(|upload|downloads\.download\(|yandexApi\([^)]*(?:PUT|POST|DELETE)/i.test(reconcileWorker),
    'read-only reconciliation helper appears to invoke mutation/effect code');
}

// Target 10: no hot loop merely to keep recovery alive.
requireSource(!/setInterval\([^\n]{0,300}(?:reconcile|operation.*status|receipt)/i.test(pages),
  'user-operation reconciliation appears to use a hot setInterval loop');

// Target 11: bounded identity / diagnostics; no secret token should be part of correlation fingerprint.
requireSource(!/(?:clientRequestId|requestFingerprint|admissionFingerprint)[\s\S]{0,400}(?:accessToken|refreshToken|manualToken)/i.test(worker),
  'admission correlation/fingerprint appears to include OAuth secret material');
requireSource(/MAX_.*(?:OPERATION|RECEIPT|CORRELATION)|slice\(0,\s*\d+\)|bounded.*(?:operation|receipt|correlation)/i.test(all),
  'no visible bounded-size policy for operation reconciliation metadata');

if (failures.length) {
  console.error('P1-210 lost outer response reconciliation source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-210 lost outer response reconciliation source gate: PASS');
