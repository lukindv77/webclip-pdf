'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const registry = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_REGISTRY.md'), 'utf8');
const evidence = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_P1_197_OPERATION_LOG_CLEAR_GENERATION_REFINEMENT_2026-09-11_EVIDENCE.md'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));

const BASELINE = 'c4e91cb3c4a95a3d6a1b19b469c3f57f779b0b8f';
const SCHEMA = 'webclip-operation-log-administrative-clear-generation/v1';
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

const clearLogs = functionSlice('clearOperationLogs', 24000);
const cleanupLogs = functionSlice('cleanupExpiredOperationLogs', 52000);

// Canonical ownership and current source census.
check(registry.includes('| P1-197 | ACTIVE | OperationLog administrative clear/delete needs durable history generation; late old writers cannot repopulate a cleared generation. |'),
  'P1-197 Registry owner/status drifted');
check(registry.includes('| P1-198 | ACTIVE | Physical live operation identity is worker-issued; caller textual `operationId` is correlation metadata, not ownership capability. |'),
  'P1-198 Registry owner/status drifted');
check(registry.includes('| P1-205 | ACTIVE | OperationLog retention cleanup and queued writes need one history-generation linearization so late writer cannot resurrect expired history. |'),
  'P1-205 Registry owner/status drifted');
check(worker.includes("const OPERATION_LOG_DB_NAME = 'WebClipOperationLogs';"), 'OperationLog DB name drifted');
check(worker.includes("const OPERATION_LOG_STORE = 'operations';"), 'OperationLog operations store drifted');
check(worker.includes("const OPERATION_LOG_EVENT_STORE = 'events';"), 'OperationLog events store drifted');
check(worker.includes('const OPERATION_LOG_DB_VERSION = 2;'), 'OperationLog DB version no longer current v2 census');
check(worker.includes('const operationLogWriteChains = new Map();'), 'same-worker OperationLog chain positive control disappeared');
check(Boolean(clearLogs), 'clearOperationLogs() missing');
check(clearLogs.includes('operationLogWriteChains.values()'), 'administrative clear no longer snapshots current write chains');
check(/Promise\.allSettled\s*\(\s*pending\s*\)/.test(clearLogs), 'administrative clear no longer drains current snapshot');
check(clearLogs.includes('operationLogWriteChains.clear()'), 'administrative clear no longer clears current chain map after drain');
check(clearLogs.includes('OPERATION_LOG_STORE'), 'administrative clear no longer references operations store');
check(clearLogs.includes('OPERATION_LOG_EVENT_STORE'), 'administrative clear no longer references events store');
check(/\.clear\s*\(/.test(clearLogs), 'administrative clear no longer visibly clears stores');
check(Boolean(cleanupLogs), 'cleanupExpiredOperationLogs() missing current P1-205 surface');

// Current gap: no durable global administrative history epoch in production source.
const currentEpochPattern = /OPERATION_LOG_HISTORY_GENERATION|operationLogHistoryGeneration|globalHistoryEpoch|operationLogHistoryEpoch/;
check(!currentEpochPattern.test(worker), 'current source unexpectedly contains a global OperationLog history epoch; refresh research');
check(!currentEpochPattern.test(clearLogs), 'clear path unexpectedly contains a history epoch; refresh research');

// Evidence/provenance requirements.
check(evidence.includes(`Canonical baseline: \`main = ${BASELINE}\``), 'evidence baseline mismatch');
check(evidence.includes('P1-197 = global administrative clear/delete history epoch'), 'evidence lacks P1-197 canonical split');
check(evidence.includes('P1-205 = automatic TTL/size per-operation retirement linearization'), 'evidence lacks P1-205 canonical split');
check(evidence.includes('P1-198 = worker-issued physical operation identity / correlation split'), 'evidence lacks P1-198 canonical split');
check(evidence.includes('Historical P1-197 material is only partially reusable'), 'historical selective-adoption rule missing');
check(evidence.includes('must not be cherry-picked or adopted wholesale'), 'wholesale historical adoption prohibition missing');
check(evidence.includes('https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle'), 'Chrome lifecycle source missing');
check(evidence.includes('https://developer.chrome.com/docs/extensions/how-to/test/test-serviceworker-termination-with-puppeteer'), 'Chrome termination test source missing');
check(evidence.includes('https://www.w3.org/TR/IndexedDB/'), 'W3C IndexedDB source missing');
check(evidence.includes('https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB'), 'MDN IndexedDB source missing');
check(evidence.includes('logical atomicity'), 'logical atomicity framing missing');
check(evidence.includes('P1-194'), 'P1-194 durability boundary missing');
check(evidence.includes('OperationLog remains diagnostic only'), 'diagnostic-only boundary missing');

// Model the current-shaped no-generation resurrection schedule.
function makeCurrentState() {
  return {
    rows: new Map([['physical-A', { status: 'running', updatedAt: 1 }]]),
    events: new Map([['physical-A', ['start']]])
  };
}

function currentAdministrativeClear(state) {
  state.rows.clear();
  state.events.clear();
  return { ok: true };
}

function currentLateWrite(state, physicalId, event) {
  if (!state.rows.has(physicalId)) {
    state.rows.set(physicalId, { status: 'running', updatedAt: 2 });
  }
  const list = state.events.get(physicalId) || [];
  list.push(event);
  state.events.set(physicalId, list);
  return { written: true };
}

const currentState = makeCurrentState();
check(currentState.rows.has('physical-A'), 'current model setup failed');
currentAdministrativeClear(currentState);
check(currentState.rows.size === 0 && currentState.events.size === 0, 'current clear model did not clear history');
currentLateWrite(currentState, 'physical-A', 'late-stage');
check(currentState.rows.has('physical-A'), 'current-shaped late writer did not reproduce header resurrection');
check(currentState.events.get('physical-A')?.includes('late-stage'), 'current-shaped late writer did not reproduce event resurrection');

// Target global administrative epoch model.
function makeTargetState() {
  return {
    epoch: 7,
    rows: new Map(),
    events: new Map(),
    retired: new Map(),
    functionalCheckpoints: new Set(['download-A', 'yandex-X'])
  };
}

function admitPhysicalOperation(state, physicalOperationId, clientOperationId, operationGeneration = 1) {
  return Object.freeze({
    physicalOperationId,
    clientOperationId,
    historyEpoch: state.epoch,
    operationGeneration
  });
}

function writeHeader(state, receipt, status = 'running') {
  if (receipt.historyEpoch !== state.epoch) return { outcome: 'stale-global-history' };
  const retiredThrough = Number(state.retired.get(receipt.physicalOperationId) || 0);
  if (receipt.operationGeneration <= retiredThrough) return { outcome: 'stale-retired' };
  state.rows.set(receipt.physicalOperationId, {
    physicalOperationId: receipt.physicalOperationId,
    clientOperationId: receipt.clientOperationId,
    historyEpoch: receipt.historyEpoch,
    operationGeneration: receipt.operationGeneration,
    status
  });
  return { outcome: 'written' };
}

function appendEvent(state, receipt, event) {
  if (receipt.historyEpoch !== state.epoch) return { outcome: 'stale-global-history' };
  const retiredThrough = Number(state.retired.get(receipt.physicalOperationId) || 0);
  if (receipt.operationGeneration <= retiredThrough) return { outcome: 'stale-retired' };
  if (!state.rows.has(receipt.physicalOperationId)) writeHeader(state, receipt);
  const list = state.events.get(receipt.physicalOperationId) || [];
  list.push(event);
  state.events.set(receipt.physicalOperationId, list);
  return { outcome: 'written' };
}

function administrativeClearAtomic(state, { abort = false } = {}) {
  // Model one IDB transaction: stage the new state and publish all-or-none.
  const staged = {
    epoch: state.epoch + 1,
    rows: new Map(),
    events: new Map(),
    retired: new Map(state.retired),
    functionalCheckpoints: new Set(state.functionalCheckpoints)
  };
  if (abort) return { outcome: 'aborted', epoch: state.epoch };
  state.epoch = staged.epoch;
  state.rows = staged.rows;
  state.events = staged.events;
  state.retired = staged.retired;
  state.functionalCheckpoints = staged.functionalCheckpoints;
  return { outcome: 'cleared', epoch: state.epoch };
}

function retireOperationForP1205(state, receipt) {
  // Composition model only: selective retirement does not bump the P1-197 global epoch.
  const current = Number(state.retired.get(receipt.physicalOperationId) || 0);
  state.retired.set(receipt.physicalOperationId, Math.max(current, receipt.operationGeneration));
  state.rows.delete(receipt.physicalOperationId);
  state.events.delete(receipt.physicalOperationId);
  return { outcome: 'retired-selectively', epoch: state.epoch };
}

const target = makeTargetState();
const a = admitPhysicalOperation(target, 'physical-A', 'same-client-text');
check(a.historyEpoch === 7, 'admission did not capture current epoch');
check(writeHeader(target, a).outcome === 'written', 'current-epoch header should write');
check(appendEvent(target, a, 'before-clear').outcome === 'written', 'current-epoch event should write');
check(target.rows.has('physical-A'), 'target setup missing A header');
check(target.events.get('physical-A')?.length === 1, 'target setup missing A event');

const clearResult = administrativeClearAtomic(target);
check(clearResult.outcome === 'cleared', 'target administrative clear did not commit');
check(target.epoch === 8, 'administrative clear did not advance global epoch exactly once');
check(target.rows.size === 0 && target.events.size === 0, 'administrative clear did not atomically empty old history');
check(writeHeader(target, a, 'late').outcome === 'stale-global-history', 'late pre-clear header writer was not rejected');
check(appendEvent(target, a, 'late-event').outcome === 'stale-global-history', 'late pre-clear event writer was not rejected');
check(!target.rows.has('physical-A'), 'stale header writer resurrected A');
check(!target.events.has('physical-A'), 'stale event writer resurrected A events');

// Late first telemetry must not lazily reacquire the new epoch.
const delayedA = Object.freeze({ physicalOperationId: 'physical-delayed-A', clientOperationId: 'delayed', historyEpoch: 7, operationGeneration: 1 });
check(writeHeader(target, delayedA).outcome === 'stale-global-history', 'pre-clear operation lazily reacquired post-clear authority');

// New post-clear physical work is allowed, even with reused correlation text.
const b = admitPhysicalOperation(target, 'physical-B', 'same-client-text');
check(b.historyEpoch === 8, 'new operation did not capture post-clear epoch');
check(b.clientOperationId === a.clientOperationId, 'correlation-reuse test setup failed');
check(b.physicalOperationId !== a.physicalOperationId, 'P1-198 physical identity composition failed');
check(writeHeader(target, b).outcome === 'written', 'new post-clear physical operation was incorrectly blocked');
check(appendEvent(target, b, 'new-event').outcome === 'written', 'new post-clear event was incorrectly blocked');

// Durable epoch survives modeled service-worker restart; JS queue loss is irrelevant.
const persisted = {
  epoch: target.epoch,
  rows: new Map(target.rows),
  events: new Map(target.events),
  retired: new Map(target.retired),
  functionalCheckpoints: new Set(target.functionalCheckpoints)
};
const workerMemoryAfterRestart = new Map();
check(workerMemoryAfterRestart.size === 0, 'restart queue model should be empty');
check(persisted.epoch === 8, 'durable epoch did not survive modeled restart');
check(writeHeader(persisted, a).outcome === 'stale-global-history', 'restart restored authority to pre-clear writer');
check(persisted.rows.has('physical-B'), 'restart model lost current post-clear history unexpectedly');

// Atomic abort: neither epoch nor rows are partially changed.
const abortState = makeTargetState();
const abortReceipt = admitPhysicalOperation(abortState, 'physical-abort', 'abort');
writeHeader(abortState, abortReceipt);
appendEvent(abortState, abortReceipt, 'keep-me');
const beforeAbortEpoch = abortState.epoch;
const beforeAbortRows = abortState.rows.size;
const beforeAbortEvents = abortState.events.size;
const aborted = administrativeClearAtomic(abortState, { abort: true });
check(aborted.outcome === 'aborted', 'abort model did not report aborted');
check(abortState.epoch === beforeAbortEpoch, 'aborted clear partially advanced epoch');
check(abortState.rows.size === beforeAbortRows, 'aborted clear partially removed headers');
check(abortState.events.size === beforeAbortEvents, 'aborted clear partially removed events');

// P1-205 composition: selective retirement of A must not globally invalidate B.
const retention = makeTargetState();
const ra = admitPhysicalOperation(retention, 'retention-A', 'corr-A');
const rb = admitPhysicalOperation(retention, 'retention-B', 'corr-B');
writeHeader(retention, ra);
writeHeader(retention, rb);
const epochBeforeRetention = retention.epoch;
const retireResult = retireOperationForP1205(retention, ra);
check(retireResult.outcome === 'retired-selectively', 'P1-205 composition retirement failed');
check(retention.epoch === epochBeforeRetention, 'selective retention incorrectly advanced P1-197 global epoch');
check(writeHeader(retention, ra).outcome === 'stale-retired', 'selectively retired A writer was not rejected');
check(writeHeader(retention, rb, 'still-live').outcome === 'written', 'selective retirement of A globally blocked unrelated B');
check(retention.rows.has('retention-B'), 'unrelated B disappeared during selective retirement');

// Quota retry may not refresh a stale global clear epoch.
const quota = makeTargetState();
const oldQuotaReceipt = admitPhysicalOperation(quota, 'quota-A', 'quota');
administrativeClearAtomic(quota);
const retrySameReceipt = oldQuotaReceipt;
check(writeHeader(quota, retrySameReceipt).outcome === 'stale-global-history', 'quota retry refreshed old global history authority');
check(retrySameReceipt.historyEpoch === 7 && quota.epoch === 8, 'quota retry receipt was not immutable across clear');

// Clearing diagnostics does not cancel functional authority/checkpoints.
const functional = makeTargetState();
check(functional.functionalCheckpoints.has('download-A'), 'functional checkpoint setup missing');
check(functional.functionalCheckpoints.has('yandex-X'), 'functional Yandex checkpoint setup missing');
administrativeClearAtomic(functional);
check(functional.functionalCheckpoints.has('download-A'), 'OperationLog clear cancelled download checkpoint');
check(functional.functionalCheckpoints.has('yandex-X'), 'OperationLog clear cancelled Yandex checkpoint');

// Durability language and release boundary.
check(evidence.includes('ordinary IndexedDB commit = guaranteed survival of OS crash / storage eviction / power loss'), 'durability anti-claim missing');
check(evidence.includes('broader durability classification remains P1-194/storage-policy territory'), 'P1-194 durability handoff missing');
check(evidence.includes('P1-197 research refinement != runtime implementation'), 'runtime boundary missing');
check(evidence.includes('real Chrome qualification != P1-231 S2 activation'), 'S2 boundary missing');
check(evidence.includes('P1-231 S2 activation != release readiness'), 'release boundary missing');
check(manifest.version === '0.9.8', `manifest version drifted: ${manifest.version}`);

if (failures.length) {
  console.error(`P1-197 OperationLog administrative clear generation refinement model: FAIL; cases=${cases}`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(
  `P1-197 OperationLog administrative clear generation refinement model: PASS; cases=${cases}; ` +
  `schema=${SCHEMA}; baseline=${BASELINE}; current_db=v2; current_history_epoch=missing; ` +
  `same_worker_drain=preserved; administrative_clear=global-epoch; retention_owner=P1-205; ` +
  `physical_identity_owner=P1-198; durability_owner=P1-194; runtime_modified=false; ` +
  `new_p_code=false; s2_authorized=false; release_authorized=false`
);
