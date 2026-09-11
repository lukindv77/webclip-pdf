'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const registry = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_REGISTRY.md'), 'utf8');
const p1197 = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_P1_197_OPERATION_LOG_CLEAR_GENERATION_REFINEMENT_2026-09-11_EVIDENCE.md'), 'utf8');
const p1198 = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_P1_198_WORKER_ISSUED_OPERATION_IDENTITY_REFINEMENT_2026-09-11_EVIDENCE.md'), 'utf8');
const evidence = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_P1_205_OPERATION_LOG_RETENTION_GENERATION_REFINEMENT_2026-09-11_EVIDENCE.md'), 'utf8');

const BASELINE = 'aa99d1c36dc472d723d0bb1839938bda3c9b3c91';
const SCHEMA = 'webclip-operation-log-selective-retirement/v1';
let cases = 0;
const failures = [];

function check(condition, message) {
  cases += 1;
  if (!condition) failures.push(message);
}

function functionSlice(name, maxChars = 60000) {
  const asyncStart = worker.indexOf(`async function ${name}(`);
  const syncStart = worker.indexOf(`function ${name}(`);
  const start = asyncStart >= 0 ? asyncStart : syncStart;
  return start < 0 ? '' : worker.slice(start, start + maxChars);
}

const queueWrite = functionSlice('queueOperationLogWrite', 9000);
const mutateOnce = functionSlice('mutateOperationLogOnce', 16000);
const mutateDurable = functionSlice('mutateOperationLog', 22000);
const appendOnce = functionSlice('appendOperationLogEventOnce', 32000);
const appendDurable = functionSlice('appendOperationLogEventDurable', 12000);
const cleanup = functionSlice('cleanupExpiredOperationLogs', 30000);
const maintenance = functionSlice('runLoggedOperationLogCleanup', 26000);

// Canonical ownership and evidence binding.
check(registry.includes('| P1-205 | ACTIVE | OperationLog retention cleanup and queued writes need one history-generation linearization so late writer cannot resurrect expired history. |'),
  'P1-205 Registry owner/status drifted');
check(registry.includes('| P1-197 | ACTIVE | OperationLog administrative clear/delete needs durable history generation; late old writers cannot repopulate a cleared generation. |'),
  'P1-197 Registry owner/status drifted');
check(registry.includes('| P1-198 | ACTIVE | Physical live operation identity is worker-issued; caller textual `operationId` is correlation metadata, not ownership capability. |'),
  'P1-198 Registry owner/status drifted');
check(evidence.includes(`Canonical baseline: \`main = ${BASELINE}\``), 'P1-205 evidence baseline mismatch');
check(evidence.includes('P1-197 = global administrative clear/delete history epoch'), 'P1-197 composition missing from P1-205 evidence');
check(evidence.includes('P1-198 = worker-issued physical execution identity'), 'P1-198 composition missing from P1-205 evidence');
check(evidence.includes('P1-205 = automatic TTL/size selective retirement + write fencing'), 'P1-205 ownership split missing from evidence');
check(p1197.includes('P1-205 = automatic TTL/size per-operation retirement linearization'), 'canonical P1-197 evidence no longer hands selective retention to P1-205');
check(p1198.includes('P1-205 owns selective retention/size retirement'), 'canonical P1-198 evidence no longer composes physical identity with P1-205');

// Current source positive controls and exact resurrection surfaces.
check(Boolean(queueWrite), 'queueOperationLogWrite() missing');
check(queueWrite.includes("const id = String(operationId || '').trim();"), 'OperationLog queue no longer derives textual operationId key; refresh research');
check(queueWrite.includes('operationLogWriteChains.get(id)'), 'per-id module write-chain positive control missing');
check(queueWrite.includes('operationLogWriteChains.set(id, next)'), 'per-id module write-chain update missing');
check(Boolean(mutateOnce), 'mutateOperationLogOnce() missing');
check(mutateOnce.includes("const record = get.result || {"), 'header absent-row default creation disappeared; refresh research');
check(mutateOnce.includes('operationStore.put(output)'), 'header writer put positive control missing');
check(Boolean(appendOnce), 'appendOperationLogEventOnce() missing');
check(appendOnce.includes("const record = get.result || {"), 'event absent-row default header creation disappeared; refresh research');
check(appendOnce.includes('events.put({ operationId: id, seq, event: normalized'), 'event append positive control missing');
check(appendOnce.includes('operations.put(output)'), 'event writer header put positive control missing');
check(Boolean(cleanup), 'cleanupExpiredOperationLogs() missing');
check(cleanup.includes('[OPERATION_LOG_STORE, OPERATION_LOG_EVENT_STORE]'), 'cleanup no longer spans header+event stores; refresh research');
check(cleanup.includes("const range = IDBKeyRange.upperBound(cutoff, true);"), 'TTL cutoff cleanup surface drifted');
check(cleanup.includes('deleteOperationLogEventsInTransaction(eventStore'), 'event deletion positive control missing');
check(cleanup.includes('cursor.delete();'), 'header deletion positive control missing');
check(cleanup.includes('MAX_OPERATION_LOG_TOTAL_JSON_CHARS'), 'aggregate-size cleanup surface missing');
check(cleanup.includes('sizeDeleted += 1'), 'size-deletion accounting surface missing');
check(!/OPERATION_LOG_(?:META|HISTORY|RETIREMENT)_STORE/.test(worker), 'durable OperationLog meta/history/retirement store now exists; refresh P1-205 research');
check(!/retiredPhysicalOperation|retiredOperationLog|operationLogRetirement|retirementFence/i.test(worker), 'selective OperationLog retirement primitive now exists; refresh P1-205 research');

// Current quota recovery retries the same logical writer after cleanup without a retirement receipt.
check(Boolean(mutateDurable), 'mutateOperationLog() missing');
check(mutateDurable.includes('await cleanupExpiredOperationLogs(settings.retentionHours);'), 'header quota cleanup path drifted');
check(mutateDurable.includes('return mutateOperationLogOnce(operationId, mutate);'), 'header quota retry surface drifted');
check(Boolean(appendDurable), 'appendOperationLogEventDurable() missing');
check(appendDurable.includes('await cleanupExpiredOperationLogs(settings.retentionHours);'), 'event quota cleanup path drifted');
check(appendDurable.includes('return appendOperationLogEventOnce(operationId, event);'), 'event quota retry surface drifted');
check(!/receipt|retirement|retired/i.test(mutateDurable), 'header quota retry now appears receipt/fence-aware; refresh research');
check(!/receipt|retirement|retired/i.test(appendDurable), 'event quota retry now appears receipt/fence-aware; refresh research');

// Maintenance self-log remains a current composition surface.
check(Boolean(maintenance), 'runLoggedOperationLogCleanup() missing');
check(maintenance.includes("makeOperationLogId('background-maintenance')"), 'maintenance self-log identity surface drifted');
check(maintenance.includes('cleanupExpiredOperationLogs(settings.retentionHours)'), 'maintenance no longer calls OperationLog cleanup; refresh research');
check(maintenance.includes('recordOperationStage(operationId'), 'maintenance no longer logs around cleanup; refresh research');

// External source provenance and historical-branch refinement.
check(evidence.includes('https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle'), 'Chrome lifecycle source missing');
check(evidence.includes('https://developer.chrome.com/docs/extensions/how-to/test/test-serviceworker-termination-with-puppeteer'), 'Chrome termination-test source missing');
check(evidence.includes('https://www.w3.org/TR/IndexedDB/'), 'W3C IndexedDB source missing');
check(evidence.includes('https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction'), 'MDN IDBTransaction source missing');
check(evidence.includes('https://cassandra.apache.org/doc/latest/cassandra/managing/operating/compaction/tombstones.html'), 'Apache Cassandra tombstone comparison source missing');
check(evidence.includes('second reusable per-physical generation counter is not proven mandatory'), 'historical per-physical generation refinement missing');
check(evidence.includes('No historical branch is imported wholesale'), 'historical selective-adoption boundary missing');
check(evidence.includes('P1-205 remains **ACTIVE**'), 'P1-205 ACTIVE implementation boundary missing');
check(evidence.includes('EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION'), 'release-policy hard fence missing');

// Current-shaped semantic witness: bare delete followed by absent-row default creation resurrects history.
function currentShapedHeaderWrite(db, id, now) {
  const row = db.get(id) || { operationId: id, createdAt: now, updatedAt: now, status: 'running' };
  row.updatedAt = now;
  db.set(id, row);
  return row;
}

{
  const db = new Map([['A', { operationId: 'A', createdAt: 1, updatedAt: 1 }]]);
  db.delete('A');
  currentShapedHeaderWrite(db, 'A', 100);
  check(db.has('A'), 'current-shaped bare-delete/default-create resurrection was not reproduced');
  check(db.get('A').updatedAt === 100, 'current-shaped resurrected row did not become fresh');
}

// Target semantic model. Fresh independent work always gets a new physical id (P1-198),
// so a second reusable per-physical generation counter is not needed by this minimal model.
function makeState() {
  return {
    globalHistoryEpoch: 7,
    nextPhysical: 0,
    operations: new Map(),
    events: new Map(),
    retired: new Map()
  };
}

function admitPhysical(state, clientOperationId = '') {
  state.nextPhysical += 1;
  return Object.freeze({
    globalHistoryEpoch: state.globalHistoryEpoch,
    physicalOperationId: `worker-physical-${state.nextPhysical}`,
    clientOperationId: String(clientOperationId || '').trim()
  });
}

function retirementKey(receipt) {
  return `${receipt.globalHistoryEpoch}:${receipt.physicalOperationId}`;
}

function receiptState(state, receipt) {
  if (receipt.globalHistoryEpoch !== state.globalHistoryEpoch) return 'stale-global-history';
  if (state.retired.has(retirementKey(receipt))) return 'stale-retired';
  return 'current';
}

function writeHeader(state, receipt, now, extra = {}) {
  const status = receiptState(state, receipt);
  if (status !== 'current') return status;
  const existing = state.operations.get(receipt.physicalOperationId);
  if (existing && existing.receipt.globalHistoryEpoch !== receipt.globalHistoryEpoch) return 'stale-global-history';
  const row = existing || {
    receipt,
    createdAt: now,
    updatedAt: now,
    status: 'running',
    approxChars: 1
  };
  Object.assign(row, extra, { updatedAt: now });
  state.operations.set(receipt.physicalOperationId, row);
  return 'written';
}

function appendEvent(state, receipt, now, message = 'event') {
  const header = writeHeader(state, receipt, now);
  if (header !== 'written') return header;
  const list = state.events.get(receipt.physicalOperationId) || [];
  list.push({ at: now, message });
  state.events.set(receipt.physicalOperationId, list);
  return 'written';
}

function retireExact(state, receipt) {
  if (receipt.globalHistoryEpoch !== state.globalHistoryEpoch) return 'stale-global-history';
  state.retired.set(retirementKey(receipt), { retired: true });
  state.events.delete(receipt.physicalOperationId);
  state.operations.delete(receipt.physicalOperationId);
  return 'retired';
}

function ttlCleanup(state, cutoff) {
  const retired = [];
  for (const row of [...state.operations.values()]) {
    if (row.updatedAt < cutoff) {
      retireExact(state, row.receipt);
      retired.push(row.receipt.physicalOperationId);
    }
  }
  return retired;
}

function sizeCleanup(state, maxChars) {
  const rows = [...state.operations.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  let retained = 0;
  const retired = [];
  for (const row of rows) {
    const size = Math.max(1, Number(row.approxChars) || 1);
    if (retained + size > maxChars) {
      retireExact(state, row.receipt);
      retired.push(row.receipt.physicalOperationId);
    } else {
      retained += size;
    }
  }
  return { retained, retired };
}

function administrativeClear(state) {
  state.globalHistoryEpoch += 1;
  state.operations.clear();
  state.events.clear();
  // Once H->H+1 is durable and every writer checks H, old-H selective fences
  // can be compacted without reviving an old receipt.
  state.retired.clear();
}

// Cleanup-before-header write: exact old physical receipt is stale and cannot recreate a header.
{
  const state = makeState();
  const a = admitPhysical(state, 'corr');
  writeHeader(state, a, 1);
  retireExact(state, a);
  check(writeHeader(state, a, 2) === 'stale-retired', 'late header write resurrected retired physical A');
  check(!state.operations.has(a.physicalOperationId), 'retired physical A header exists after stale header write');
}

// Cleanup-before-event write: neither header nor event may reappear.
{
  const state = makeState();
  const a = admitPhysical(state, 'corr');
  appendEvent(state, a, 1, 'before');
  retireExact(state, a);
  check(appendEvent(state, a, 2, 'late') === 'stale-retired', 'late event write was not rejected as retired');
  check(!state.operations.has(a.physicalOperationId), 'late event recreated retired header');
  check(!state.events.has(a.physicalOperationId), 'late event recreated retired timeline');
}

// Writer-before-TTL cleanup refreshes current state; cleanup evaluates committed updatedAt and retains A.
{
  const state = makeState();
  const a = admitPhysical(state);
  writeHeader(state, a, 1);
  writeHeader(state, a, 100);
  check(ttlCleanup(state, 50).length === 0, 'TTL cleanup used stale eligibility after writer-first commit');
  check(state.operations.get(a.physicalOperationId).updatedAt === 100, 'writer-first TTL current state was lost');
}

// Size pruning uses the same exact retirement authority, even for a fresh row when current policy selects it.
{
  const state = makeState();
  const newer = admitPhysical(state, 'same-corr');
  const older = admitPhysical(state, 'same-corr');
  writeHeader(state, older, 10, { approxChars: 8 });
  writeHeader(state, newer, 20, { approxChars: 8 });
  const result = sizeCleanup(state, 8);
  check(result.retired.length === 1, 'size cleanup did not retire one over-budget physical lifecycle');
  check(result.retired[0] === older.physicalOperationId, 'size cleanup did not select current oldest over-budget lifecycle');
  check(writeHeader(state, older, 30) === 'stale-retired', 'size-retired physical lifecycle was resurrected');
  check(writeHeader(state, newer, 30) === 'written', 'size cleanup poisoned unrelated retained physical lifecycle');
}

// Quota retry preserves the original receipt; it cannot recapture authority for the same physical A.
{
  const state = makeState();
  const original = admitPhysical(state, 'quota');
  writeHeader(state, original, 1);
  retireExact(state, original); // models quota cleanup selecting A
  check(writeHeader(state, original, 2) === 'stale-retired', 'quota retry with original receipt bypassed retirement');
  const newAction = admitPhysical(state, original.clientOperationId);
  check(newAction.physicalOperationId !== original.physicalOperationId, 'new work recycled retired physical identity');
}

// Same correlation does not couple independent physical lifecycles.
{
  const state = makeState();
  const a = admitPhysical(state, 'same-client-correlation');
  const b = admitPhysical(state, 'same-client-correlation');
  writeHeader(state, a, 1);
  writeHeader(state, b, 1);
  retireExact(state, a);
  check(a.clientOperationId === b.clientOperationId, 'same-correlation setup failed');
  check(a.physicalOperationId !== b.physicalOperationId, 'independent work shared a physical identity');
  check(writeHeader(state, a, 2) === 'stale-retired', 'retired A was writable');
  check(writeHeader(state, b, 2) === 'written', 'retiring A incorrectly fenced B');
}

// Restart-like loss of module queues cannot erase durable retirement truth.
{
  const state = makeState();
  const a = admitPhysical(state);
  writeHeader(state, a, 1);
  retireExact(state, a);
  const serialized = JSON.stringify([...state.retired.entries()]);
  state.retired = new Map(JSON.parse(serialized));
  check(writeHeader(state, a, 2) === 'stale-retired', 'recovered durable retirement failed after modeled queue loss');
}

// Unsafe same-epoch tombstone compaction demonstrates why fence GC needs a proof.
{
  const state = makeState();
  const a = admitPhysical(state);
  writeHeader(state, a, 1);
  retireExact(state, a);
  state.retired.clear();
  check(writeHeader(state, a, 2) === 'written', 'unsafe tombstone purge no longer demonstrates resurrection risk; refresh model');
}

// P1-197 H->H+1 can safely subsume old selective fences: old A remains stale by global epoch,
// while fresh B with the same client correlation is independently admitted under H+1.
{
  const state = makeState();
  const a = admitPhysical(state, 'same-client-correlation');
  writeHeader(state, a, 1);
  retireExact(state, a);
  administrativeClear(state);
  check(writeHeader(state, a, 2) === 'stale-global-history', 'global clear failed to stale old A after selective-fence compaction');
  const b = admitPhysical(state, a.clientOperationId);
  check(b.globalHistoryEpoch === state.globalHistoryEpoch, 'fresh B did not capture new global history epoch');
  check(b.physicalOperationId !== a.physicalOperationId, 'fresh B reused old physical A identity');
  check(writeHeader(state, b, 2) === 'written', 'fresh B under new epoch was incorrectly rejected');
}

// Current maintenance self-log remains writable if it is not selected by policy.
{
  const state = makeState();
  const expired = admitPhysical(state, 'old');
  const maintenanceReceipt = admitPhysical(state, 'maintenance');
  writeHeader(state, expired, 1);
  writeHeader(state, maintenanceReceipt, 100);
  const retired = ttlCleanup(state, 50);
  check(retired.length === 1 && retired[0] === expired.physicalOperationId, 'TTL cleanup did not select only expired physical lifecycle');
  check(appendEvent(state, maintenanceReceipt, 110, 'cleanup-complete') === 'written', 'selective cleanup globally fenced maintenance self-log');
}

// Minimal receipt intentionally has no second per-physical generation counter.
{
  const state = makeState();
  const a = admitPhysical(state, 'corr');
  check(!Object.prototype.hasOwnProperty.call(a, 'operationHistoryGeneration'), 'minimal P1-205 model unexpectedly requires a second per-physical generation');
  retireExact(state, a);
  const b = admitPhysical(state, 'corr');
  check(b.physicalOperationId !== a.physicalOperationId, 'fresh action should use fresh P1-198 physical identity rather than next generation of A');
}

if (failures.length) {
  console.error(`P1-205 selective retirement refinement model: FAIL (${failures.length}/${cases})`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(`P1-205 selective retirement refinement model: PASS (${cases} checks, ${SCHEMA})`);
