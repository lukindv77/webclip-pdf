'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const registry = fs.readFileSync(path.join(root, 'project_docs', 'RESEARCH_REGISTRY.md'), 'utf8');
const evidence = fs.readFileSync(
  path.join(root, 'project_docs', 'RESEARCH_P1_210_OUTER_RESPONSE_RECONCILIATION_REFINEMENT_2026-09-11_EVIDENCE.md'),
  'utf8'
);
const journal = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

const failures = [];
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function makeStore() {
  return {
    historyGeneration: 1,
    nextReceipt: 1,
    nextPhysical: 1,
    aliases: new Map(),
    receipts: new Map(),
    retiredKeys: new Set(),
    effects: []
  };
}

function aliasKey(kind, correlationId) {
  return `${String(kind)}\u0000${String(correlationId)}`;
}

function boundedText(value, max = 160) {
  return String(value == null ? '' : value).slice(0, max);
}

function admit(store, { kind, correlationId, fingerprint = '' }) {
  if (!kind || !correlationId) throw new Error('missing correlation admission fields');
  if (String(correlationId).length > 180) throw new Error('correlation too long');
  const key = aliasKey(kind, correlationId);
  const existingAlias = store.aliases.get(key);
  if (existingAlias && existingAlias.historyGeneration === store.historyGeneration) {
    if (existingAlias.fingerprint !== fingerprint) {
      return { accepted: false, collision: true, receiptId: existingAlias.receiptId };
    }
    return { accepted: true, reused: true, receiptId: existingAlias.receiptId };
  }

  const receiptId = `receipt-${store.nextReceipt++}`;
  const receipt = {
    receiptId,
    clientCorrelationId: String(correlationId),
    operationKind: String(kind),
    historyGeneration: store.historyGeneration,
    status: 'PENDING',
    physicalOperationId: '',
    result: null,
    error: '',
    admissionCommitted: true
  };

  // Model the required atomic admission cut: receipt + lookup binding become
  // durable together before startPhysical() may create any side effect.
  store.receipts.set(receiptId, receipt);
  store.aliases.set(key, {
    receiptId,
    historyGeneration: store.historyGeneration,
    fingerprint
  });
  store.retiredKeys.delete(key);
  return { accepted: true, reused: false, receiptId };
}

function startPhysical(store, receiptId) {
  const receipt = store.receipts.get(receiptId);
  if (!receipt || !receipt.admissionCommitted) throw new Error('no durable admission receipt');
  if (receipt.historyGeneration !== store.historyGeneration) throw new Error('stale receipt generation');
  if (receipt.status !== 'PENDING') return receipt.physicalOperationId;
  const physicalOperationId = `physical-${store.nextPhysical++}`;
  receipt.physicalOperationId = physicalOperationId;
  receipt.status = 'RUNNING';
  store.effects.push({ receiptId, physicalOperationId, kind: receipt.operationKind });
  return physicalOperationId;
}

function settleSuccess(store, receiptId, result) {
  const receipt = store.receipts.get(receiptId);
  if (!receipt || receipt.historyGeneration !== store.historyGeneration) return false;
  if (!['PENDING', 'RUNNING'].includes(receipt.status)) return false;
  receipt.status = 'SUCCESS';
  receipt.result = boundedText(result, 240);
  receipt.error = '';
  return true;
}

function settleFailure(store, receiptId, error) {
  const receipt = store.receipts.get(receiptId);
  if (!receipt || receipt.historyGeneration !== store.historyGeneration) return false;
  if (!['PENDING', 'RUNNING'].includes(receipt.status)) return false;
  receipt.status = 'FAILED';
  receipt.result = null;
  receipt.error = boundedText(error, 240);
  return true;
}

function resolveCorrelation(store, { kind, correlationId }) {
  const key = aliasKey(kind, correlationId);
  const alias = store.aliases.get(key);
  if (!alias) {
    return store.retiredKeys.has(key)
      ? { classification: 'RETIRED_OR_UNRESOLVABLE' }
      : { classification: 'UNKNOWN' };
  }
  if (alias.historyGeneration !== store.historyGeneration) {
    return { classification: 'RETIRED_OR_UNRESOLVABLE' };
  }
  const receipt = store.receipts.get(alias.receiptId);
  if (!receipt || receipt.historyGeneration !== store.historyGeneration) {
    return { classification: 'RETIRED_OR_UNRESOLVABLE' };
  }
  return {
    classification: 'FOUND',
    receiptId: receipt.receiptId,
    status: receipt.status
  };
}

function getReceipt(store, receiptId) {
  const receipt = store.receipts.get(String(receiptId));
  if (!receipt || receipt.historyGeneration !== store.historyGeneration) {
    return { classification: 'UNKNOWN_OR_RETIRED' };
  }
  return {
    classification: 'FOUND',
    receiptId: receipt.receiptId,
    status: receipt.status,
    result: receipt.result,
    error: receipt.error,
    physicalOperationId: receipt.physicalOperationId
  };
}

function retireReceipt(store, receiptId) {
  const receipt = store.receipts.get(receiptId);
  if (!receipt) return false;
  const key = aliasKey(receipt.operationKind, receipt.clientCorrelationId);
  store.receipts.delete(receiptId);
  store.aliases.delete(key);
  store.retiredKeys.add(key);
  return true;
}

function clearHistoryGeneration(store) {
  const oldAliases = [...store.aliases.entries()].map(([key, alias]) => ({ key, ...alias }));
  for (const { key } of oldAliases) store.retiredKeys.add(key);
  store.aliases.clear();
  store.receipts.clear();
  store.historyGeneration += 1;
  return oldAliases;
}

function publishLateAlias(store, oldAlias) {
  if (oldAlias.historyGeneration !== store.historyGeneration) return false;
  store.aliases.set(oldAlias.key, {
    receiptId: oldAlias.receiptId,
    historyGeneration: oldAlias.historyGeneration,
    fingerprint: oldAlias.fingerprint || ''
  });
  return true;
}

function makeUi(kind, correlationId) {
  return {
    kind,
    correlationId,
    receiptId: '',
    phase: 'REQUEST_IN_FLIGHT',
    result: '',
    error: ''
  };
}

function outerResponseLost(ui) {
  ui.phase = 'UNKNOWN_OUTER_SETTLEMENT';
  ui.result = '';
  ui.error = '';
}

function reconcileUi(ui, store) {
  if (!ui.receiptId) {
    const resolved = resolveCorrelation(store, {
      kind: ui.kind,
      correlationId: ui.correlationId
    });
    if (resolved.classification !== 'FOUND') {
      ui.phase = 'UNRESOLVED';
      return resolved;
    }
    ui.receiptId = resolved.receiptId;
  }

  const receipt = getReceipt(store, ui.receiptId);
  if (receipt.classification !== 'FOUND') {
    ui.phase = 'UNRESOLVED';
    return receipt;
  }
  if (receipt.status === 'SUCCESS') {
    ui.phase = 'TERMINAL_SUCCESS';
    ui.result = receipt.result || '';
  } else if (receipt.status === 'FAILED') {
    ui.phase = 'TERMINAL_FAILURE';
    ui.error = receipt.error || '';
  } else {
    ui.phase = 'RUNNING';
  }
  return receipt;
}

function canBlindRetry(ui) {
  return false;
}

function mayStartExplicitNewOperation(ui, explicitUserAction) {
  return Boolean(explicitUserAction && ui.phase === 'TERMINAL_FAILURE');
}

function classifyNoReceipt({ admissionImpossibleProven = false, retired = false }) {
  if (retired) return 'RETIRED_OR_UNRESOLVABLE';
  return admissionImpossibleProven ? 'NOT_ADMITTED' : 'UNRESOLVED';
}

// Source bindings: current owner and baseline remain exact.
check(
  registry.includes('| P1-210 | ACTIVE | Lost/rejected outer user-operation transport response means unknown; UI reconciles worker-issued durable receipt read-only instead of starting blind fresh operation. |'),
  'P1-210 Registry owner/status drifted'
);
check(
  evidence.includes('Canonical baseline: `main = b3bcb5ac0c3b1fda1a6d6952cdea960b3757c3de`.'),
  'P1-210 evidence baseline drifted'
);
check(
  evidence.includes('research/p1-210-lost-outer-response-reconciliation-2026-09-08'),
  'historical P1-210 provenance boundary missing'
);
check(
  evidence.includes('EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION'),
  'hard release fence missing from P1-210 evidence'
);
check(manifest.version === '0.9.8', 'manifest version changed during P1-210 research');

// Current-source witness remains present.
check(/activeDeleteOperationId\s*=\s*crypto\.randomUUID/.test(journal), 'Journal caller correlation creation missing');
check(/type:\s*['"]WEBCLIP_JOURNAL_DELETE['"]/.test(journal), 'Journal delete mutation message missing');
check(/operationId:\s*activeDeleteOperationId/.test(journal), 'Journal delete no longer carries caller operationId');
check(/finishDeleteFailure\(/.test(journal), 'Journal transport/error failure path missing');
check(/deleteRetry/.test(journal), 'Journal retry UI positive control missing');
check(/WEBCLIP_OPERATION_LOG_GET/.test(worker), 'read-only OperationLog GET positive control missing');
check(/async function deleteJournalEntry\([^)]*operationId/.test(worker), 'worker Journal delete operationId path missing');
check(/startOperationLog\(operationId,\s*['"]journal\.unlink['"]/.test(worker), 'Journal delete durable log start binding missing');
check(!/WEBCLIP_OPERATION_RECEIPT_RESOLVE/.test(worker), 'current runtime unexpectedly already contains target receipt resolver');
check(!/WEBCLIP_OPERATION_RECEIPT_GET/.test(worker), 'current runtime unexpectedly already contains target receipt GET protocol');

// 1. Lost outer response is unknown, not mutation failure.
{
  const ui = makeUi('journal.unlink', 'c-1');
  outerResponseLost(ui);
  check(ui.phase === 'UNKNOWN_OUTER_SETTLEMENT', 'outer response loss was not classified unknown');
  check(canBlindRetry(ui) === false, 'unknown outer settlement allowed blind retry');
}

// 2. Admission commits correlation -> worker receipt before physical execution.
{
  const store = makeStore();
  const admission = admit(store, { kind: 'journal.unlink', correlationId: 'c-2', fingerprint: 'entry:42' });
  const resolvedBeforeEffect = resolveCorrelation(store, { kind: 'journal.unlink', correlationId: 'c-2' });
  check(admission.accepted && !admission.reused, 'fresh admission failed');
  check(resolvedBeforeEffect.receiptId === admission.receiptId, 'receipt was not resolvable before side effect');
  check(store.effects.length === 0, 'admission itself started a physical side effect');
  const physical = startPhysical(store, admission.receiptId);
  check(/^physical-/.test(physical), 'physical identity was not worker-issued after admission');
  check(store.effects.length === 1, 'physical side effect was not recorded exactly once');
}

// 3. A physical action cannot start without durable receipt admission.
{
  const store = makeStore();
  assert.throws(() => startPhysical(store, 'receipt-missing'), /durable admission/);
  check(store.effects.length === 0, 'missing receipt still created a physical effect');
}

// 4. Lost final response after success is recovered read-only through C -> R -> SUCCESS.
{
  const store = makeStore();
  const ui = makeUi('journal.unlink', 'c-success');
  const { receiptId } = admit(store, { kind: ui.kind, correlationId: ui.correlationId, fingerprint: 'entry:A' });
  startPhysical(store, receiptId);
  settleSuccess(store, receiptId, 'deleted:A');
  outerResponseLost(ui);
  const result = reconcileUi(ui, store);
  check(result.receiptId === receiptId, 'success reconciliation resolved the wrong receipt');
  check(ui.phase === 'TERMINAL_SUCCESS', 'lost success did not recover terminal success');
  check(ui.result === 'deleted:A', 'lost success did not recover bounded original result');
  check(store.effects.length === 1, 'success reconciliation repeated the physical action');
}

// 5. Running work remains running and does not permit a fresh mutation.
{
  const store = makeStore();
  const ui = makeUi('journal.unlink', 'c-running');
  const { receiptId } = admit(store, { kind: ui.kind, correlationId: ui.correlationId });
  startPhysical(store, receiptId);
  outerResponseLost(ui);
  reconcileUi(ui, store);
  check(ui.phase === 'RUNNING', 'running receipt was not truthfully recovered');
  check(canBlindRetry(ui) === false, 'running receipt allowed blind retry');
}

// 6. Terminal failure is recovered as failure; only explicit new user intent may start new work.
{
  const store = makeStore();
  const ui = makeUi('journal.unlink', 'c-failed');
  const { receiptId } = admit(store, { kind: ui.kind, correlationId: ui.correlationId });
  startPhysical(store, receiptId);
  settleFailure(store, receiptId, 'provider rejected');
  outerResponseLost(ui);
  reconcileUi(ui, store);
  check(ui.phase === 'TERMINAL_FAILURE', 'terminal worker failure was not recovered');
  check(ui.error === 'provider rejected', 'terminal failure summary was not preserved');
  check(mayStartExplicitNewOperation(ui, false) === false, 'failure permitted implicit new operation');
  check(mayStartExplicitNewOperation(ui, true) === true, 'explicit user action cannot start a new logical operation after terminal failure');
}

// 7. Caller correlation is namespaced by operation kind.
{
  const store = makeStore();
  const a = admit(store, { kind: 'journal.unlink', correlationId: 'same-c' });
  const b = admit(store, { kind: 'journal.clear-domain', correlationId: 'same-c' });
  check(a.receiptId !== b.receiptId, 'same correlation crossed operation-kind domains');
  check(resolveCorrelation(store, { kind: 'journal.unlink', correlationId: 'same-c' }).receiptId === a.receiptId,
    'unlink correlation resolved to another kind');
}

// 8. Re-delivery of the same correlation/fingerprint resolves the same admitted receipt without new physical work.
{
  const store = makeStore();
  const first = admit(store, { kind: 'journal.unlink', correlationId: 'c-redeliver', fingerprint: 'entry:X' });
  startPhysical(store, first.receiptId);
  const second = admit(store, { kind: 'journal.unlink', correlationId: 'c-redeliver', fingerprint: 'entry:X' });
  check(second.reused === true && second.receiptId === first.receiptId, 'same admitted correlation did not resolve existing receipt');
  check(store.effects.length === 1, 'same correlation re-delivery created a second physical action');
}

// 9. Same correlation with conflicting mutation fingerprint fails closed.
{
  const store = makeStore();
  const first = admit(store, { kind: 'journal.unlink', correlationId: 'c-collision', fingerprint: 'entry:A' });
  const conflict = admit(store, { kind: 'journal.unlink', correlationId: 'c-collision', fingerprint: 'entry:B' });
  check(first.accepted === true, 'initial correlation admission failed');
  check(conflict.accepted === false && conflict.collision === true, 'conflicting correlation reuse was not rejected');
  check(store.receipts.size === 1, 'conflicting correlation reuse minted another receipt');
}

// 10. Worker receipt and physical identity are intentionally distinct domains.
{
  const store = makeStore();
  const { receiptId } = admit(store, { kind: 'journal.unlink', correlationId: 'c-ids' });
  const physicalOperationId = startPhysical(store, receiptId);
  check(receiptId !== physicalOperationId, 'receiptId collapsed into physicalOperationId');
  check(receiptId !== 'c-ids' && physicalOperationId !== 'c-ids', 'caller correlation became worker identity');
}

// 11. Worker restart does not erase durable receipt truth in the model.
{
  const store = makeStore();
  const ui = makeUi('journal.unlink', 'c-restart');
  const { receiptId } = admit(store, { kind: ui.kind, correlationId: ui.correlationId });
  startPhysical(store, receiptId);
  // A new worker instance reads the same durable store; no volatile token is required.
  settleSuccess(store, receiptId, 'after-restart');
  outerResponseLost(ui);
  reconcileUi(ui, store);
  check(ui.phase === 'TERMINAL_SUCCESS' && ui.result === 'after-restart', 'restart lost durable reconciliation truth');
}

// 12. Receipt retirement yields unresolved truth, never synthetic not-admitted.
{
  const store = makeStore();
  const ui = makeUi('journal.unlink', 'c-retired');
  const { receiptId } = admit(store, { kind: ui.kind, correlationId: ui.correlationId });
  settleSuccess(store, receiptId, 'old-success');
  retireReceipt(store, receiptId);
  outerResponseLost(ui);
  const resolved = reconcileUi(ui, store);
  check(resolved.classification === 'RETIRED_OR_UNRESOLVABLE', 'retired correlation was not classified fail-closed');
  check(ui.phase === 'UNRESOLVED', 'retired receipt became a terminal invented state');
  check(canBlindRetry(ui) === false, 'retired receipt absence allowed blind replay');
}

// 13. Plain absence is unresolved unless an independent admission fence proves no mutation could have started.
{
  check(classifyNoReceipt({}) === 'UNRESOLVED', 'plain receipt absence became NOT_ADMITTED');
  check(classifyNoReceipt({ admissionImpossibleProven: true }) === 'NOT_ADMITTED', 'proven no-admission fence cannot express NOT_ADMITTED');
  check(classifyNoReceipt({ retired: true, admissionImpossibleProven: true }) === 'RETIRED_OR_UNRESOLVABLE', 'retirement was overwritten by no-admission inference');
}

// 14. Administrative history generation prevents late old alias resurrection.
{
  const store = makeStore();
  admit(store, { kind: 'journal.unlink', correlationId: 'c-clear' });
  const oldAliases = clearHistoryGeneration(store);
  check(store.historyGeneration === 2, 'history generation did not advance');
  check(publishLateAlias(store, oldAliases[0]) === false, 'late old-generation alias repopulated current lookup');
  const resolved = resolveCorrelation(store, { kind: 'journal.unlink', correlationId: 'c-clear' });
  check(resolved.classification === 'RETIRED_OR_UNRESOLVABLE', 'cleared correlation became fresh/unknown authority');
}

// 15. A stale old receipt cannot settle a newer generation.
{
  const store = makeStore();
  const old = admit(store, { kind: 'journal.unlink', correlationId: 'c-old' });
  clearHistoryGeneration(store);
  const fresh = admit(store, { kind: 'journal.unlink', correlationId: 'c-new' });
  check(settleSuccess(store, old.receiptId, 'late-old') === false, 'stale old receipt settled after generation advance');
  check(getReceipt(store, fresh.receiptId).status === 'PENDING', 'stale old settlement mutated fresh receipt');
}

// 16. Result/error summaries are bounded; reconciliation is not a shadow unbounded log transport.
{
  const store = makeStore();
  const a = admit(store, { kind: 'journal.unlink', correlationId: 'c-bound-success' });
  settleSuccess(store, a.receiptId, 'x'.repeat(1000));
  check(getReceipt(store, a.receiptId).result.length === 240, 'success reconciliation result was unbounded');
  const b = admit(store, { kind: 'journal.unlink', correlationId: 'c-bound-failure' });
  settleFailure(store, b.receiptId, 'e'.repeat(1000));
  check(getReceipt(store, b.receiptId).error.length === 240, 'failure reconciliation error was unbounded');
}

// 17. The research evidence preserves current owner composition rather than historical stale adjacency.
check(evidence.includes('P1-198 is authoritative for physical operation identity.'), 'P1-198 composition missing');
check(evidence.includes('P1-197 owns administrative OperationLog clear/delete generation.'), 'P1-197 composition missing');
check(evidence.includes('P1-205 owns selective retention cleanup'), 'P1-205 composition missing');
check(evidence.includes('P1-194 owns the precise durability class'), 'P1-194 composition missing');
check(!/P1-211[^\n]{0,100}(?:generic recovery|bounded recovery)/i.test(evidence), 'stale historical P1-211 owner composition reintroduced');

// 18. External comparison evidence is diverse and explicitly non-authoritative.
check(evidence.includes('developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle'), 'Chrome MV3 lifecycle evidence missing');
check(evidence.includes('docs.cloud.google.com/service-infrastructure/docs/polling-operations'), 'Google long-running operation evidence missing');
check(evidence.includes('docs.aws.amazon.com/ec2/latest/devguide/ec2-api-idempotency.html'), 'AWS idempotency comparison missing');
check(evidence.includes('docs.stripe.com/api/idempotent_requests'), 'Stripe idempotency comparison missing');
check(evidence.includes('mozilla/webextension-polyfill/issues/384'), 'community message-channel evidence missing');

// 19. Research scope explicitly leaves runtime and release planes untouched.
check(evidence.includes('Production/runtime modification: **NONE**.'), 'runtime research-only boundary missing');
check(evidence.includes('P1-210 remains **ACTIVE**'), 'P1-210 ACTIVE conclusion missing');

if (failures.length) {
  console.error(`P1-210 outer-response reconciliation refinement model: FAIL (${failures.length}/${checks})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`P1-210 outer-response reconciliation refinement model: PASS (${checks}/${checks})`);
