'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const localDownload = fs.readFileSync(path.join(ROOT, 'local-download-identity.js'), 'utf8');
const registry = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_REGISTRY.md'), 'utf8');
const p1197 = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_P1_197_OPERATION_LOG_CLEAR_GENERATION_REFINEMENT_2026-09-11_EVIDENCE.md'), 'utf8');
const evidence = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_P1_198_WORKER_ISSUED_OPERATION_IDENTITY_REFINEMENT_2026-09-11_EVIDENCE.md'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));

const BASELINE = 'aa89e5a8ff6f08cdcf81bbd8e5fe8c79e4915670';
const SCHEMA = 'webclip-worker-issued-physical-operation-identity/v1';
let cases = 0;
const failures = [];

function check(condition, message) {
  cases += 1;
  if (!condition) failures.push(message);
}

function functionSlice(name, maxChars = 50000) {
  const asyncStart = worker.indexOf(`async function ${name}`);
  const syncStart = worker.indexOf(`function ${name}`);
  const start = asyncStart >= 0 ? asyncStart : syncStart;
  return start < 0 ? '' : worker.slice(start, start + maxChars);
}

const normalizeOperationId = functionSlice('normalizeOperationIdInput', 4000);
const startOperationLog = functionSlice('startOperationLog', 18000);
const pendingKey = functionSlice('makePendingLocalDownloadIntentKey', 18000);
const checkpointIntent = functionSlice('checkpointPendingLocalDownloadIntent', 26000);
const saveAsId = functionSlice('makePreparedSaveAsSessionId', 5000);
const importStageId = functionSlice('makeJournalImportStageId', 5000);

// Canonical ownership/current-source binding.
check(registry.includes('| P1-198 | ACTIVE | Physical live operation identity is worker-issued; caller textual `operationId` is correlation metadata, not ownership capability. |'),
  'P1-198 Registry owner/status drifted');
check(registry.includes('| P1-197 | ACTIVE | OperationLog administrative clear/delete needs durable history generation; late old writers cannot repopulate a cleared generation. |'),
  'P1-197 Registry owner/status drifted');
check(registry.includes('| P1-205 | ACTIVE | OperationLog retention cleanup and queued writes need one history-generation linearization so late writer cannot resurrect expired history. |'),
  'P1-205 Registry owner/status drifted');
check(registry.includes('| P1-190 | ACTIVE | Imported operationId is historical/unverified provenance and must not automatically link to an unrelated live local OperationLog record. |'),
  'P1-190 Registry owner/status drifted');
check(Boolean(normalizeOperationId), 'normalizeOperationIdInput() missing');
check(normalizeOperationId.includes("const id = String(value || '').trim();"), 'normalizeOperationIdInput no longer returns caller-shaped text');
check(normalizeOperationId.includes("throw new Error('Некорректный operationId.')"), 'operationId input hygiene positive control missing');
check(Boolean(startOperationLog), 'startOperationLog() missing');
check(startOperationLog.includes("const id = String(operationId || '').trim();"), 'startOperationLog no longer source-binds caller operationId key; refresh research');
check(startOperationLog.includes('queueOperationLogWrite(id'), 'startOperationLog no longer queues by caller-derived id; refresh research');
check(startOperationLog.includes('mutateOperationLog(id'), 'startOperationLog no longer mutates durable log by caller-derived id; refresh research');
check(Boolean(pendingKey), 'makePendingLocalDownloadIntentKey() missing');
check(pendingKey.includes("const suffix = String(operationId || '').trim()"), 'pending intent key no longer prefers caller operationId; refresh research');
check(pendingKey.includes("return `intent:${suffix}`.slice(0, 220);"), 'pending intent key shape drifted');
check(Boolean(checkpointIntent), 'checkpointPendingLocalDownloadIntent() missing');
check(checkpointIntent.includes('const key = makePendingLocalDownloadIntentKey(operationId);'), 'pending checkpoint no longer uses caller-derived key; refresh research');
check(checkpointIntent.includes("operationId: String(operationId || '').slice(0, 180)"), 'pending checkpoint no longer stores client operationId; refresh research');
check(worker.includes("const sameOperation = String(existing.operationId || '') && String(existing.operationId || '') === String(intent.operationId || '');"),
  'current operationId-equality physical-sameness surface disappeared; refresh research');

// Representative message boundary/current forwarding.
check(worker.includes("case 'WEBCLIP_GENERATE_PDF':"), 'WEBCLIP_GENERATE_PDF message path missing');
check(worker.includes('generatePdfAndDownload(tabId, sanitizeContentSaveMeta(message.meta, sender), normalizeOperationIdInput(message.operationId))'),
  'PDF message no longer forwards normalized caller operationId; refresh research');
check(worker.includes('generatePdfAndUploadToYandex(tabId, sanitizeContentSaveMeta(message.meta, sender), normalizeOperationIdInput(message.operationId))'),
  'Yandex PDF message no longer forwards normalized caller operationId; refresh research');
check(worker.includes('retryCachedPdfUploadToYandex(tabId, normalizeOperationIdInput(message.operationId))'),
  'Yandex retry message no longer forwards normalized caller operationId; refresh research');
check(worker.includes('downloadCachedPdf(tabId, normalizeOperationIdInput(message.operationId))'),
  'cached download message no longer forwards normalized caller operationId; refresh research');

// Positive controls that must survive P1-198 implementation.
check(Boolean(saveAsId), 'makePreparedSaveAsSessionId() missing');
check(saveAsId.includes('crypto.randomUUID()'), 'Save As worker/domain-issued opaque id positive control missing');
check(Boolean(importStageId), 'makeJournalImportStageId() missing');
check(importStageId.includes('crypto.randomUUID ? crypto.randomUUID()'), 'Journal import worker/domain-issued id positive control missing');
check(localDownload.includes('matchesExactBlobUrl'), 'exact Blob URL download identity positive control missing');
check(localDownload.includes('candidateBytes === expectedBytes'), 'exact byte-length fallback positive control missing');
check(localDownload.includes("mode: 'ambiguous-exact'"), 'exact-match ambiguity rejection missing');
check(localDownload.includes("mode: fallbackCandidates.length > 1 ? 'ambiguous-download' : 'none'"), 'fallback ambiguity rejection missing');
check(localDownload.includes("mode: 'ambiguous-intent'"), 'intent ambiguity rejection missing');

// Canonical P1-197 composition and evidence provenance.
check(p1197.includes('P1-197 = global administrative clear/delete history epoch'), 'canonical P1-197 global epoch split missing');
check(p1197.includes('P1-198 = worker-issued physical operation identity / correlation split'), 'P1-197 evidence does not hand off identity to P1-198');
check(evidence.includes(`Canonical baseline: \`main = ${BASELINE}\``), 'P1-198 evidence baseline mismatch');
check(evidence.includes('client operationId = optional correlation metadata'), 'three-axis correlation statement missing');
check(evidence.includes('worker physicalOperationId = physical execution identity'), 'three-axis physical identity statement missing');
check(evidence.includes('domain receipt/lease/checkpoint = continuation/effect authority'), 'three-axis domain authority statement missing');
check(evidence.includes('https://developer.chrome.com/docs/extensions/develop/concepts/messaging'), 'Chrome messaging source missing');
check(evidence.includes('https://developer.chrome.com/docs/extensions/develop/security-privacy/stay-secure'), 'Chrome security source missing');
check(evidence.includes('https://www.rfc-editor.org/rfc/rfc9562.html'), 'RFC 9562 source missing');
check(evidence.includes('https://www.w3.org/TR/trace-context/'), 'Trace Context source missing');
check(evidence.includes('must not use mere UUID possession as a security capability'), 'RFC UUID anti-capability boundary missing');
check(evidence.includes('must not be cherry-picked') || evidence.includes('no historical branch is imported wholesale'), 'historical selective-adoption boundary missing');

// Current-shaped conflation model: same caller id collapses physical namespaces.
function currentPhysicalKey(clientOperationId) {
  return String(clientOperationId || '').trim() || 'worker-fallback';
}

const currentClient = 'same-client-correlation';
const currentA = currentPhysicalKey(currentClient);
const currentB = currentPhysicalKey(currentClient);
check(currentA === currentB, 'current-shaped caller-key conflation was not reproduced');
const currentPendingA = `intent:${currentA}`;
const currentPendingB = `intent:${currentB}`;
check(currentPendingA === currentPendingB, 'current-shaped pending-intent collision was not reproduced');
const currentLog = new Map();
currentLog.set(currentA, { attempt: 'A' });
currentLog.set(currentB, { attempt: 'B' });
check(currentLog.size === 1, 'current-shaped OperationLog physical collapse was not reproduced');
check(currentLog.get(currentA).attempt === 'B', 'current-shaped second action did not overwrite/reopen same key');

// Target state-machine model.
let physicalCounter = 0;
function issuePhysicalId() {
  physicalCounter += 1;
  return `worker-physical-${physicalCounter}`;
}

function admitNewOperation({ clientOperationId = '', historyEpoch = 1, issuanceFails = false } = {}) {
  const client = String(clientOperationId || '').trim();
  if (issuanceFails) return { admitted: false, reason: 'physical-id-issuance-failed' };
  return {
    admitted: true,
    context: Object.freeze({
      physicalOperationId: issuePhysicalId(),
      clientOperationId: client,
      historyEpoch
    })
  };
}

function makeDomainReceipt(context, generation = 1) {
  return Object.freeze({
    physicalOperationId: context.physicalOperationId,
    generation,
    nonce: `domain-${context.physicalOperationId}-${generation}`
  });
}

function continueWithReceipt(context, receipt) {
  if (!receipt || receipt.physicalOperationId !== context.physicalOperationId) return 'reject-wrong-physical';
  if (receipt.generation !== 1) return 'reject-stale-generation';
  return 'continue';
}

function logWrite(context, currentHistoryEpoch) {
  return context.historyEpoch === currentHistoryEpoch ? 'write' : 'stale-history';
}

function pendingIntentId(context) {
  return `intent:${context.physicalOperationId}`;
}

function samePhysical(a, b) {
  return Boolean(a && b && a.physicalOperationId === b.physicalOperationId);
}

const ta = admitNewOperation({ clientOperationId: currentClient, historyEpoch: 7 });
const tb = admitNewOperation({ clientOperationId: currentClient, historyEpoch: 7 });
check(ta.admitted && tb.admitted, 'target same-correlation admissions failed');
check(ta.context.clientOperationId === tb.context.clientOperationId, 'target did not preserve equal correlation metadata');
check(ta.context.physicalOperationId !== tb.context.physicalOperationId, 'two independent actions received same physical identity');
check(!samePhysical(ta.context, tb.context), 'correlation equality was treated as physical equality');
check(pendingIntentId(ta.context) !== pendingIntentId(tb.context), 'same correlation collided in target pending namespace');

// Correlation replay/forgery does not select existing physical identity.
const replay = admitNewOperation({ clientOperationId: currentClient, historyEpoch: 7 });
check(replay.context.physicalOperationId !== ta.context.physicalOperationId, 'replayed correlation reclaimed A physical identity');
check(replay.context.physicalOperationId !== tb.context.physicalOperationId, 'replayed correlation reclaimed B physical identity');
check(replay.context.clientOperationId === currentClient, 'replay correlation was not preserved as metadata');

// Correlation may be absent; physical identity is still mandatory for new work.
const noCorrelation = admitNewOperation({ clientOperationId: '', historyEpoch: 7 });
check(noCorrelation.admitted, 'empty correlation incorrectly prevented new physical admission');
check(noCorrelation.context.clientOperationId === '', 'empty correlation was not preserved as optional');
check(Boolean(noCorrelation.context.physicalOperationId), 'empty correlation caused missing physical identity');

// Issuance failure must not fall back to caller text as physical identity.
const failedIssuance = admitNewOperation({ clientOperationId: 'caller-wants-this-id', historyEpoch: 7, issuanceFails: true });
check(failedIssuance.admitted === false, 'issuance failure incorrectly admitted physical operation');
check(!failedIssuance.context, 'issuance failure leaked fallback caller identity as context');

// Domain continuation remains separate from identity possession/correlation.
const receiptA = makeDomainReceipt(ta.context);
check(continueWithReceipt(ta.context, receiptA) === 'continue', 'valid exact domain receipt could not continue A');
check(continueWithReceipt(tb.context, receiptA) === 'reject-wrong-physical', 'A domain receipt continued independent B');
check(continueWithReceipt(ta.context, null) === 'reject-wrong-physical', 'physical context alone became continuation authority');
const staleReceiptA = Object.freeze({ ...receiptA, generation: 0 });
check(continueWithReceipt(ta.context, staleReceiptA) === 'reject-stale-generation', 'stale domain generation was accepted');

// P1-197 global history epoch composition.
check(logWrite(ta.context, 7) === 'write', 'current-epoch A diagnostic was rejected');
const epochAfterClear = 8;
check(logWrite(ta.context, epochAfterClear) === 'stale-history', 'pre-clear A diagnostics survived H->H+1');
const afterClearSameCorrelation = admitNewOperation({ clientOperationId: currentClient, historyEpoch: epochAfterClear });
check(afterClearSameCorrelation.context.clientOperationId === ta.context.clientOperationId, 'post-clear correlation reuse setup failed');
check(afterClearSameCorrelation.context.physicalOperationId !== ta.context.physicalOperationId, 'post-clear new operation reused old physical id');
check(logWrite(afterClearSameCorrelation.context, epochAfterClear) === 'write', 'new post-clear physical operation was poisoned by reused correlation');

// P1-205 selective retirement composition: retire exact physical A only.
const retiredPhysical = new Set([ta.context.physicalOperationId]);
function retentionWrite(context) {
  return retiredPhysical.has(context.physicalOperationId) ? 'stale-retired' : 'write';
}
check(retentionWrite(ta.context) === 'stale-retired', 'P1-205 modeled retirement did not reject exact A');
check(retentionWrite(tb.context) === 'write', 'P1-205 retirement of A incorrectly rejected B with same correlation');
check(retentionWrite(afterClearSameCorrelation.context) === 'write', 'P1-205 retirement poisoned later same-correlation operation');

// P1-190 imported history may retain correlation but cannot select live physical identity.
const importedHistorical = { operationId: currentClient, source: 'backup-history' };
const liveFromImported = admitNewOperation({ clientOperationId: importedHistorical.operationId, historyEpoch: epochAfterClear });
check(liveFromImported.context.clientOperationId === importedHistorical.operationId, 'imported historical correlation not preserved as correlation');
check(liveFromImported.context.physicalOperationId !== ta.context.physicalOperationId, 'imported historical id reclaimed A physical identity');
check(liveFromImported.context.physicalOperationId !== tb.context.physicalOperationId, 'imported historical id reclaimed B physical identity');

// Lost outer response: repeating correlation is not idempotency/reconciliation authority.
const lostResponseOperation = admitNewOperation({ clientOperationId: 'lost-response', historyEpoch: epochAfterClear });
const exactDurableReceipt = makeDomainReceipt(lostResponseOperation.context);
const blindRetry = admitNewOperation({ clientOperationId: 'lost-response', historyEpoch: epochAfterClear });
check(blindRetry.context.physicalOperationId !== lostResponseOperation.context.physicalOperationId,
  'repeated lost-response correlation silently deduped to old physical operation');
check(continueWithReceipt(lostResponseOperation.context, exactDurableReceipt) === 'continue',
  'exact durable receipt could not identify/reconcile original physical operation');

// Modeled restart: correlation alone remains insufficient; durable domain receipt retains exact identity.
const persistedReceipt = JSON.parse(JSON.stringify(exactDurableReceipt));
const callerAfterRestart = { clientOperationId: 'lost-response' };
check(!Object.prototype.hasOwnProperty.call(callerAfterRestart, 'physicalOperationId'), 'caller correlation unexpectedly persisted physical authority');
check(persistedReceipt.physicalOperationId === lostResponseOperation.context.physicalOperationId,
  'durable exact receipt lost physical identity across modeled restart');
check(persistedReceipt.nonce !== callerAfterRestart.clientOperationId, 'domain receipt collapsed into client correlation after restart');

// Identity is not enough to settle local download object truth.
function adoptDownload({ context, observedBlobUrl, expectedBlobUrl, observedBytes, expectedBytes }) {
  if (!context?.physicalOperationId) return 'reject-no-physical';
  const exactBlob = Boolean(expectedBlobUrl) && observedBlobUrl === expectedBlobUrl;
  const exactBytes = Number(expectedBytes) > 0 && Number(observedBytes) === Number(expectedBytes);
  return exactBlob || exactBytes ? 'candidate-evidence' : 'reject-no-domain-evidence';
}
check(adoptDownload({ context: ta.context, observedBlobUrl: 'blob:a', expectedBlobUrl: 'blob:a', observedBytes: 0, expectedBytes: 10 }) === 'candidate-evidence',
  'exact Blob URL evidence was not preserved');
check(adoptDownload({ context: ta.context, observedBlobUrl: 'blob:x', expectedBlobUrl: 'blob:a', observedBytes: 10, expectedBytes: 10 }) === 'candidate-evidence',
  'exact byte evidence was not preserved');
check(adoptDownload({ context: ta.context, observedBlobUrl: 'blob:x', expectedBlobUrl: 'blob:a', observedBytes: 9, expectedBytes: 10 }) === 'reject-no-domain-evidence',
  'physical id alone incorrectly authorized download adoption');

// Secret/capability boundary.
function isOpaqueNonSecretPhysicalId(id) {
  return typeof id === 'string' && /^worker-physical-\d+$/.test(id) && !/oauth|token|https?:|blob:/i.test(id);
}
check(isOpaqueNonSecretPhysicalId(ta.context.physicalOperationId), 'physical identity contains semantic/secret material in model');
check(!Object.values(ta.context).some((value) => String(value).includes('OAuth ')), 'OperationContext contains Authorization secret');
check(evidence.includes('Physical operation identifier must contain no access token'), 'secret exclusion evidence missing');
check(evidence.includes('Physical operation identity is useful for namespacing and lifecycle distinction'), 'identity-vs-domain-evidence boundary missing');

// Release/non-goal boundary.
check(manifest.version === '0.9.8', `manifest version drifted: ${manifest.version}`);
check(evidence.includes('Production/runtime modification: **NONE**'), 'runtime non-goal missing');
check(evidence.includes('Real unpacked Chrome/Yandex L5: **NOT RUN**'), 'physical QA non-goal missing');
check(evidence.includes('Release-policy activation: **NONE**'), 'release-policy non-goal missing');
check(evidence.includes('New P-code: **NO**'), 'new-P-code non-goal missing');
check(evidence.includes('P1-198 research refinement != runtime implementation'), 'runtime boundary missing');
check(evidence.includes('real Chrome qualification != P1-231 S2 activation'), 'S2 boundary missing');
check(evidence.includes('P1-231 S2 activation != release readiness'), 'release boundary missing');

if (failures.length) {
  console.error(`P1-198 worker-issued physical operation identity refinement model: FAIL; cases=${cases}`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(
  `P1-198 worker-issued physical operation identity refinement model: PASS; cases=${cases}; ` +
  `schema=${SCHEMA}; baseline=${BASELINE}; current_start_log_key=caller-operationId; ` +
  `current_pending_key=caller-operationId; current_same_operation=correlation-equality; ` +
  `physical_identity=worker-issued-opaque; client_identity=correlation-only; ` +
  `continuation=domain-receipt; history_epoch_owner=P1-197; retention_owner=P1-205; ` +
  `imported_operation_owner=P1-190; uuid_capability=false; runtime_modified=false; ` +
  `new_p_code=false; s2_authorized=false; release_authorized=false`
);
