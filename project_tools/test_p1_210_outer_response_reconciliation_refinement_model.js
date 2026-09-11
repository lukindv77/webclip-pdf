'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const registry = fs.readFileSync(path.join(root, 'project_docs', 'RESEARCH_REGISTRY.md'), 'utf8');
const evidence = fs.readFileSync(path.join(root, 'project_docs', 'RESEARCH_P1_210_OUTER_RESPONSE_RECONCILIATION_REFINEMENT_2026-09-11_EVIDENCE.md'), 'utf8');
const journal = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

const failures = [];
let checks = 0;
function check(condition, message) { checks += 1; if (!condition) failures.push(message); }

function makeStore() {
  return { historyGeneration: 1, nextReceipt: 1, nextPhysical: 1, aliases: new Map(), receipts: new Map(), retiredKeys: new Set(), effects: [] };
}
function aliasKey(kind, correlationId) { return `${String(kind)}\u0000${String(correlationId)}`; }
function boundedText(value, max = 240) { return String(value == null ? '' : value).slice(0, max); }

function admit(store, { kind, correlationId, fingerprint = '' }) {
  if (!kind || !correlationId) throw new Error('missing correlation admission fields');
  if (String(correlationId).length > 180) throw new Error('correlation too long');
  const key = aliasKey(kind, correlationId);
  const existing = store.aliases.get(key);
  if (existing && existing.historyGeneration === store.historyGeneration) {
    if (existing.fingerprint !== fingerprint) return { accepted: false, collision: true, receiptId: existing.receiptId };
    return { accepted: true, reused: true, receiptId: existing.receiptId };
  }
  const receiptId = `receipt-${store.nextReceipt++}`;
  store.receipts.set(receiptId, {
    receiptId,
    clientCorrelationId: String(correlationId),
    operationKind: String(kind),
    historyGeneration: store.historyGeneration,
    status: 'PENDING',
    physicalOperationId: '',
    result: null,
    error: '',
    admissionCommitted: true
  });
  store.aliases.set(key, { receiptId, historyGeneration: store.historyGeneration, fingerprint });
  store.retiredKeys.delete(key);
  return { accepted: true, reused: false, receiptId };
}

function startPhysical(store, receiptId) {
  const receipt = store.receipts.get(receiptId);
  if (!receipt || !receipt.admissionCommitted) throw new Error('no durable admission receipt');
  if (receipt.historyGeneration !== store.historyGeneration) throw new Error('stale receipt generation');
  if (receipt.status !== 'PENDING') return receipt.physicalOperationId;
  receipt.physicalOperationId = `physical-${store.nextPhysical++}`;
  receipt.status = 'RUNNING';
  store.effects.push({ receiptId, physicalOperationId: receipt.physicalOperationId, kind: receipt.operationKind });
  return receipt.physicalOperationId;
}

function settleSuccess(store, receiptId, result) {
  const r = store.receipts.get(receiptId);
  if (!r || r.historyGeneration !== store.historyGeneration || !['PENDING', 'RUNNING'].includes(r.status)) return false;
  r.status = 'SUCCESS'; r.result = boundedText(result); r.error = ''; return true;
}
function settleFailure(store, receiptId, error) {
  const r = store.receipts.get(receiptId);
  if (!r || r.historyGeneration !== store.historyGeneration || !['PENDING', 'RUNNING'].includes(r.status)) return false;
  r.status = 'FAILED'; r.result = null; r.error = boundedText(error); return true;
}
function resolveCorrelation(store, { kind, correlationId }) {
  const key = aliasKey(kind, correlationId);
  const a = store.aliases.get(key);
  if (!a) return { classification: store.retiredKeys.has(key) ? 'RETIRED_OR_UNRESOLVABLE' : 'UNKNOWN' };
  if (a.historyGeneration !== store.historyGeneration) return { classification: 'RETIRED_OR_UNRESOLVABLE' };
  const r = store.receipts.get(a.receiptId);
  if (!r || r.historyGeneration !== store.historyGeneration) return { classification: 'RETIRED_OR_UNRESOLVABLE' };
  return { classification: 'FOUND', receiptId: r.receiptId, status: r.status };
}
function getReceipt(store, receiptId) {
  const r = store.receipts.get(String(receiptId));
  if (!r || r.historyGeneration !== store.historyGeneration) return { classification: 'UNKNOWN_OR_RETIRED' };
  return { classification: 'FOUND', receiptId: r.receiptId, status: r.status, result: r.result, error: r.error, physicalOperationId: r.physicalOperationId };
}
function retireReceipt(store, receiptId) {
  const r = store.receipts.get(receiptId); if (!r) return false;
  const key = aliasKey(r.operationKind, r.clientCorrelationId);
  store.receipts.delete(receiptId); store.aliases.delete(key); store.retiredKeys.add(key); return true;
}
function clearHistoryGeneration(store) {
  const old = [...store.aliases.entries()].map(([key, value]) => ({ key, ...value }));
  for (const x of old) store.retiredKeys.add(x.key);
  store.aliases.clear(); store.receipts.clear(); store.historyGeneration += 1; return old;
}
function publishLateAlias(store, oldAlias) {
  if (oldAlias.historyGeneration !== store.historyGeneration) return false;
  store.aliases.set(oldAlias.key, oldAlias); return true;
}
function makeUi(kind, correlationId) { return { kind, correlationId, receiptId: '', phase: 'REQUEST_IN_FLIGHT', result: '', error: '' }; }
function outerResponseLost(ui) { ui.phase = 'UNKNOWN_OUTER_SETTLEMENT'; ui.result = ''; ui.error = ''; }
function reconcileUi(ui, store) {
  if (!ui.receiptId) {
    const resolved = resolveCorrelation(store, { kind: ui.kind, correlationId: ui.correlationId });
    if (resolved.classification !== 'FOUND') { ui.phase = 'UNRESOLVED'; return resolved; }
    ui.receiptId = resolved.receiptId;
  }
  const receipt = getReceipt(store, ui.receiptId);
  if (receipt.classification !== 'FOUND') { ui.phase = 'UNRESOLVED'; return receipt; }
  if (receipt.status === 'SUCCESS') { ui.phase = 'TERMINAL_SUCCESS'; ui.result = receipt.result || ''; }
  else if (receipt.status === 'FAILED') { ui.phase = 'TERMINAL_FAILURE'; ui.error = receipt.error || ''; }
  else ui.phase = 'RUNNING';
  return receipt;
}
function classifyNoReceipt({ admissionImpossibleProven = false, retired = false }) {
  if (retired) return 'RETIRED_OR_UNRESOLVABLE';
  return admissionImpossibleProven ? 'NOT_ADMITTED' : 'UNRESOLVED';
}

// Exact current owner/baseline/release fence bindings.
check(registry.includes('| P1-210 | ACTIVE | Lost/rejected outer user-operation transport response means unknown; UI reconciles worker-issued durable receipt read-only instead of starting blind fresh operation. |'), 'P1-210 Registry owner/status drifted');
check(evidence.includes('Canonical baseline: `main = b3bcb5ac0c3b1fda1a6d6952cdea960b3757c3de`.'), 'P1-210 evidence baseline drifted');
check(evidence.includes('research/p1-210-lost-outer-response-reconciliation-2026-09-08'), 'historical P1-210 provenance boundary missing');
check(evidence.includes('EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION'), 'hard release fence missing from P1-210 evidence');
check(manifest.version === '0.9.8', 'manifest version changed during P1-210 research');

// Current source witness. These are intentionally bound to the actual current implementation names.
check(/activeDeleteOperationId\s*=\s*crypto\.randomUUID/.test(journal), 'Journal caller correlation creation missing');
check(/type:\s*['"]WEBCLIP_JOURNAL_DELETE['"]/.test(journal), 'Journal delete mutation message missing');
check(/operationId:\s*activeDeleteOperationId/.test(journal), 'Journal delete no longer carries caller operationId');
check(/deleteDialog\.className\s*=\s*['"]delete-dialog error['"]/.test(journal) && /deleteRetry\.classList\.remove\(['"]hidden['"]\)/.test(journal), 'Journal transport/error failure path missing');
check(/WEBCLIP_OPERATION_LOG_GET/.test(worker), 'read-only OperationLog GET positive control missing');
check(/async function deleteJournalEntry\([^)]*operationId/.test(worker), 'worker Journal delete operationId path missing');
check(/startOperationLog\(operationId,\s*['"]journal-delete['"]/.test(worker), 'Journal delete durable log start binding missing');
check(!/WEBCLIP_OPERATION_RECEIPT_RESOLVE/.test(worker), 'current runtime unexpectedly already contains target receipt resolver');
check(!/WEBCLIP_OPERATION_RECEIPT_GET/.test(worker), 'current runtime unexpectedly already contains target receipt GET protocol');

// Lost response is unknown; reconciliation is read-only and cannot blind-retry.
{
  const ui = makeUi('journal-delete', 'c-1'); outerResponseLost(ui);
  check(ui.phase === 'UNKNOWN_OUTER_SETTLEMENT', 'outer response loss was not classified unknown');
}

// Durable correlation->receipt binding must exist before first physical effect.
{
  const s = makeStore(); const a = admit(s, { kind: 'journal-delete', correlationId: 'c-2', fingerprint: 'entry:42' });
  check(a.accepted && !a.reused, 'fresh admission failed');
  check(resolveCorrelation(s, { kind: 'journal-delete', correlationId: 'c-2' }).receiptId === a.receiptId, 'receipt was not resolvable before side effect');
  check(s.effects.length === 0, 'admission itself started a physical effect');
  const p = startPhysical(s, a.receiptId);
  check(/^physical-/.test(p) && p !== a.receiptId && p !== 'c-2', 'receipt/physical/correlation identities collapsed');
  check(s.effects.length === 1, 'physical effect count drifted');
}
{
  const s = makeStore(); assert.throws(() => startPhysical(s, 'missing'), /durable admission/); check(s.effects.length === 0, 'missing receipt started effect');
}

// Success/running/failure after response loss reconcile without a second mutation.
for (const [terminal, expected] of [['SUCCESS', 'TERMINAL_SUCCESS'], ['FAILED', 'TERMINAL_FAILURE'], ['RUNNING', 'RUNNING']]) {
  const s = makeStore(); const ui = makeUi('journal-delete', `c-${terminal}`);
  const a = admit(s, { kind: ui.kind, correlationId: ui.correlationId }); startPhysical(s, a.receiptId);
  if (terminal === 'SUCCESS') settleSuccess(s, a.receiptId, 'deleted');
  if (terminal === 'FAILED') settleFailure(s, a.receiptId, 'provider rejected');
  outerResponseLost(ui); reconcileUi(ui, s);
  check(ui.phase === expected, `${terminal} reconciliation truth drifted`);
  check(s.effects.length === 1, `${terminal} reconciliation repeated physical work`);
}

// Same correlation/fingerprint is idempotent; conflicting reuse fails closed; kind namespaces correlation.
{
  const s = makeStore();
  const a = admit(s, { kind: 'journal-delete', correlationId: 'same', fingerprint: 'entry:A' }); startPhysical(s, a.receiptId);
  const same = admit(s, { kind: 'journal-delete', correlationId: 'same', fingerprint: 'entry:A' });
  const conflict = admit(s, { kind: 'journal-delete', correlationId: 'same', fingerprint: 'entry:B' });
  const otherKind = admit(s, { kind: 'journal-clear', correlationId: 'same', fingerprint: 'scope:all' });
  check(same.reused && same.receiptId === a.receiptId, 'same correlation did not reuse receipt');
  check(conflict.accepted === false && conflict.collision === true, 'conflicting correlation reuse was not rejected');
  check(otherKind.receiptId !== a.receiptId, 'correlation crossed operation-kind domain');
  check(s.effects.length === 1, 'idempotent redelivery created second physical effect');
}

// Restart preserves durable truth; retirement and clear are unresolved, never synthetic NOT_ADMITTED.
{
  const s = makeStore(); const ui = makeUi('journal-delete', 'restart');
  const a = admit(s, { kind: ui.kind, correlationId: ui.correlationId }); startPhysical(s, a.receiptId); settleSuccess(s, a.receiptId, 'after-restart');
  outerResponseLost(ui); reconcileUi(ui, s); check(ui.phase === 'TERMINAL_SUCCESS', 'restart lost durable receipt truth');
  retireReceipt(s, a.receiptId); ui.receiptId = ''; outerResponseLost(ui); const r = reconcileUi(ui, s);
  check(r.classification === 'RETIRED_OR_UNRESOLVABLE' && ui.phase === 'UNRESOLVED', 'retired receipt invented terminal/not-admitted truth');
}
{
  const s = makeStore(); admit(s, { kind: 'journal-delete', correlationId: 'clear' }); const old = clearHistoryGeneration(s);
  check(s.historyGeneration === 2, 'history generation did not advance');
  check(publishLateAlias(s, old[0]) === false, 'late old alias resurrected after clear');
  check(resolveCorrelation(s, { kind: 'journal-delete', correlationId: 'clear' }).classification === 'RETIRED_OR_UNRESOLVABLE', 'clear became fresh absence');
}
check(classifyNoReceipt({}) === 'UNRESOLVED', 'plain absence became NOT_ADMITTED');
check(classifyNoReceipt({ admissionImpossibleProven: true }) === 'NOT_ADMITTED', 'positive no-admission proof not expressible');
check(classifyNoReceipt({ retired: true, admissionImpossibleProven: true }) === 'RETIRED_OR_UNRESOLVABLE', 'retirement overwritten by no-admission inference');

// Bounded reconciliation summaries.
{
  const s = makeStore(); const a = admit(s, { kind: 'journal-delete', correlationId: 'bound-s' }); settleSuccess(s, a.receiptId, 'x'.repeat(1000));
  const b = admit(s, { kind: 'journal-delete', correlationId: 'bound-f' }); settleFailure(s, b.receiptId, 'e'.repeat(1000));
  check(getReceipt(s, a.receiptId).result.length === 240, 'success result unbounded');
  check(getReceipt(s, b.receiptId).error.length === 240, 'failure error unbounded');
}

// Current owner composition and external comparison boundaries.
check(evidence.includes('P1-198 is authoritative for physical operation identity.'), 'P1-198 composition missing');
check(evidence.includes('P1-197 owns administrative OperationLog clear/delete generation.'), 'P1-197 composition missing');
check(evidence.includes('P1-205 owns selective retention cleanup'), 'P1-205 composition missing');
check(evidence.includes('P1-194 owns the precise durability class'), 'P1-194 composition missing');
check(!/P1-211[^\n]{0,100}(?:generic recovery|bounded recovery)/i.test(evidence), 'stale P1-211 composition reintroduced');
check(evidence.includes('developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle'), 'Chrome MV3 evidence missing');
check(evidence.includes('docs.cloud.google.com/service-infrastructure/docs/polling-operations'), 'Google operation evidence missing');
check(evidence.includes('docs.aws.amazon.com/ec2/latest/devguide/ec2-api-idempotency.html'), 'AWS idempotency evidence missing');
check(evidence.includes('docs.stripe.com/api/idempotent_requests'), 'Stripe idempotency evidence missing');
check(evidence.includes('mozilla/webextension-polyfill/issues/384'), 'community response-channel evidence missing');
check(evidence.includes('Production/runtime modification: **NONE**.'), 'runtime research-only boundary missing');
check(evidence.includes('P1-210 remains **ACTIVE**'), 'P1-210 ACTIVE conclusion missing');

if (failures.length) {
  console.error(`P1-210 outer-response reconciliation refinement model: FAIL (${failures.length}/${checks})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`P1-210 outer-response reconciliation refinement model: PASS (${checks}/${checks}, webclip-outer-response-reconciliation/v2)`);
