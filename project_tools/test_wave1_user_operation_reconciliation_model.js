'use strict';

const assert = require('node:assert/strict');

const LOOKUP = Object.freeze({
  NONE: 'none',
  EXACT: 'exact',
  AMBIGUOUS: 'ambiguous',
  EVIDENCE_LIMITED: 'evidence-limited'
});

const CLASS = Object.freeze({
  NOT_ADMITTED: 'not-admitted',
  RUNNING: 'running',
  DOMAIN_PENDING: 'domain-pending',
  EFFECT_UNKNOWN: 'effect-unknown',
  SUCCEEDED: 'succeeded',
  FAILED_BEFORE_EFFECT: 'failed-before-effect',
  FAILED_TERMINAL: 'failed-terminal',
  CANCELED: 'canceled',
  EVIDENCE_LIMITED: 'evidence-limited'
});

const RETRY = Object.freeze({
  NEW_ATTEMPT_ALLOWED: 'new-attempt-allowed',
  SAME_OPERATION_ONLY: 'same-operation-only',
  RECONCILE_ONLY: 'reconcile-only',
  MANUAL_RESOLUTION: 'manual-resolution',
  NONE: 'none'
});

function resolveLookup(matches = [], { evidenceLimited = false } = {}) {
  if (evidenceLimited) return { lookupResolution: LOOKUP.EVIDENCE_LIMITED, receipt: null };
  if (!matches.length) return { lookupResolution: LOOKUP.NONE, receipt: null };
  if (matches.length > 1) return { lookupResolution: LOOKUP.AMBIGUOUS, receipt: null };
  return { lookupResolution: LOOKUP.EXACT, receipt: matches[0] };
}

function result(operationClass, retryDisposition, extra = {}) {
  return Object.freeze({ operationClass, retryDisposition, ...extra });
}

function reconcileExact(receipt) {
  assert.ok(receipt && receipt.physicalOperationId, 'exact reconciliation requires worker-issued physical id');
  if (receipt.evidenceLimited) return result(CLASS.EVIDENCE_LIMITED, RETRY.MANUAL_RESOLUTION);
  if (receipt.canceled && !receipt.effectAdmitted) return result(CLASS.CANCELED, RETRY.NEW_ATTEMPT_ALLOWED);
  if (receipt.failedBeforeEffect && !receipt.effectAdmitted) return result(CLASS.FAILED_BEFORE_EFFECT, RETRY.NEW_ATTEMPT_ALLOWED);
  if (receipt.effectUnknown) return result(CLASS.EFFECT_UNKNOWN, RETRY.RECONCILE_ONLY);
  if (receipt.failedTerminal) return result(CLASS.FAILED_TERMINAL, receipt.retryDisposition || RETRY.MANUAL_RESOLUTION);
  if (receipt.succeeded) return result(CLASS.SUCCEEDED, RETRY.NONE, { freshnessCurrent: receipt.freshnessCurrent !== false });
  if (receipt.domainPending || receipt.effectVerified || receipt.finalizationPending) return result(CLASS.DOMAIN_PENDING, RETRY.SAME_OPERATION_ONLY);
  return result(CLASS.RUNNING, RETRY.RECONCILE_ONLY);
}

function reconcileLookup(matches, opts = {}) {
  const lookup = resolveLookup(matches, opts);
  if (lookup.lookupResolution === LOOKUP.NONE) {
    return { ...lookup, ...result(CLASS.NOT_ADMITTED, RETRY.NEW_ATTEMPT_ALLOWED) };
  }
  if (lookup.lookupResolution === LOOKUP.AMBIGUOUS) {
    return { ...lookup, ...result(CLASS.EVIDENCE_LIMITED, RETRY.MANUAL_RESOLUTION, { reason: 'ambiguous-subject-discovery' }) };
  }
  if (lookup.lookupResolution === LOOKUP.EVIDENCE_LIMITED) {
    return { ...lookup, ...result(CLASS.EVIDENCE_LIMITED, RETRY.MANUAL_RESOLUTION, { reason: 'lookup-evidence-limited' }) };
  }
  return { ...lookup, ...reconcileExact(lookup.receipt) };
}

function op(id, kind, fields = {}) {
  return {
    physicalOperationId: `physical:${id}`,
    operationKind: kind,
    clientRequestId: `request:${id}`,
    ...fields
  };
}

function yandexSave(phase) {
  const base = op(`ys-${phase}`, 'pdf-yandex-save');
  switch (phase) {
    case 'admitted': return base;
    case 'rendering': return base;
    case 'render-failed': return { ...base, failedBeforeEffect: true };
    case 'pdf-sealed': return { ...base, domainPending: true };
    case 'remote-prepared': return { ...base, domainPending: true };
    case 'upload-admitted': return { ...base, effectAdmitted: true, effectUnknown: true };
    case 'remote-verified': return { ...base, effectAdmitted: true, effectVerified: true };
    case 'publication-admitted': return { ...base, effectAdmitted: true, effectUnknown: true };
    case 'publication-verified': return { ...base, effectAdmitted: true, effectVerified: true, finalizationPending: true };
    case 'journal-finalizing': return { ...base, effectAdmitted: true, effectVerified: true, finalizationPending: true };
    case 'done': return { ...base, effectAdmitted: true, effectVerified: true, succeeded: true };
    case 'remote-mismatch': return { ...base, effectAdmitted: true, failedTerminal: true, retryDisposition: RETRY.MANUAL_RESOLUTION };
    case 'legacy-unbound': return { ...base, evidenceLimited: true };
    default: throw new Error(`unknown yandex phase ${phase}`);
  }
}

function localPdf(phase) {
  const base = op(`lp-${phase}`, 'pdf-local-save');
  switch (phase) {
    case 'rendering': return base;
    case 'render-failed': return { ...base, failedBeforeEffect: true };
    case 'pdf-sealed': return { ...base, domainPending: true };
    case 'download-intent': return { ...base, domainPending: true };
    case 'download-start-unknown': return { ...base, effectAdmitted: true, effectUnknown: true };
    case 'download-bound': return { ...base, effectAdmitted: true, domainPending: true };
    case 'download-complete-journal-pending': return { ...base, effectAdmitted: true, effectVerified: true, finalizationPending: true };
    case 'done': return { ...base, effectAdmitted: true, effectVerified: true, succeeded: true };
    case 'interrupted': return { ...base, effectAdmitted: true, failedTerminal: true, retryDisposition: RETRY.NEW_ATTEMPT_ALLOWED };
    case 'history-lost': return { ...base, effectAdmitted: true, evidenceLimited: true };
    default: throw new Error(`unknown local phase ${phase}`);
  }
}

function journalDelete(phase, trash = false) {
  const base = op(`del-${trash ? 'trash' : 'keep'}-${phase}`, trash ? 'journal-delete-trash' : 'journal-delete-keep');
  if (!trash) {
    switch (phase) {
      case 'admitted': return base;
      case 'cas-pending': return { ...base, domainPending: true };
      case 'cas-failed-before-write': return { ...base, failedBeforeEffect: true };
      case 'done': return { ...base, succeeded: true };
      default: throw new Error(`unknown keep-delete phase ${phase}`);
    }
  }
  switch (phase) {
    case 'admitted': return base;
    case 'move-checkpoint': return { ...base, domainPending: true };
    case 'move-admitted': return { ...base, effectAdmitted: true, effectUnknown: true };
    case 'move-verified': return { ...base, effectAdmitted: true, effectVerified: true, finalizationPending: true };
    case 'publication-outcome-pending': return { ...base, effectAdmitted: true, domainPending: true };
    case 'journal-cas-pending': return { ...base, effectAdmitted: true, effectVerified: true, finalizationPending: true };
    case 'done': return { ...base, effectAdmitted: true, effectVerified: true, succeeded: true };
    case 'move-identity-ambiguous': return { ...base, effectAdmitted: true, evidenceLimited: true };
    default: throw new Error(`unknown trash-delete phase ${phase}`);
  }
}

function markRead(phase) {
  const base = op(`mr-${phase}`, 'journal-mark-read');
  switch (phase) {
    case 'admitted': return base;
    case 'move-checkpoint': return { ...base, domainPending: true };
    case 'move-admitted': return { ...base, effectAdmitted: true, effectUnknown: true };
    case 'move-verified': return { ...base, effectAdmitted: true, effectVerified: true, finalizationPending: true };
    case 'journal-cas-pending': return { ...base, effectAdmitted: true, effectVerified: true, finalizationPending: true };
    case 'done': return { ...base, effectAdmitted: true, effectVerified: true, succeeded: true };
    case 'identity-ambiguous': return { ...base, effectAdmitted: true, evidenceLimited: true };
    default: throw new Error(`unknown mark-read phase ${phase}`);
  }
}

function manualBackup(phase, freshnessCurrent = true) {
  const base = op(`bu-${phase}`, 'journal-backup');
  switch (phase) {
    case 'admitted': return base;
    case 'snapshot-staged': return { ...base, domainPending: true };
    case 'remote-prepared': return { ...base, domainPending: true };
    case 'upload-admitted': return { ...base, effectAdmitted: true, effectUnknown: true };
    case 'remote-verified': return { ...base, effectAdmitted: true, effectVerified: true, finalizationPending: true };
    case 'state-commit-pending': return { ...base, effectAdmitted: true, effectVerified: true, finalizationPending: true };
    case 'done': return { ...base, effectAdmitted: true, effectVerified: true, succeeded: true, freshnessCurrent };
    case 'lease-expired-after-upload': return { ...base, effectAdmitted: true, effectUnknown: true };
    default: throw new Error(`unknown backup phase ${phase}`);
  }
}

function stagedImport(phase) {
  const base = op(`im-${phase}`, 'journal-import');
  switch (phase) {
    case 'admitted': return base;
    case 'staged': return { ...base, domainPending: true };
    case 'awaiting-confirmation': return { ...base, domainPending: true };
    case 'canceled': return { ...base, canceled: true };
    case 'apply-pending': return { ...base, domainPending: true };
    case 'apply-failed-before-commit': return { ...base, failedBeforeEffect: true };
    case 'done': return { ...base, succeeded: true };
    case 'legacy-staging-evidence-limited': return { ...base, evidenceLimited: true };
    default: throw new Error(`unknown import phase ${phase}`);
  }
}

function saveAs(phase) {
  const base = op(`sa-${phase}`, 'save-as');
  switch (phase) {
    case 'admitted': return base;
    case 'prepared': return { ...base, domainPending: true };
    case 'native-dialog-owned': return { ...base, domainPending: true };
    case 'start-response-lost': return { ...base, effectAdmitted: true, effectUnknown: true };
    case 'started': return { ...base, effectAdmitted: true, domainPending: true };
    case 'complete': return { ...base, effectAdmitted: true, effectVerified: true, succeeded: true };
    case 'interrupted': return { ...base, effectAdmitted: true, failedTerminal: true, retryDisposition: RETRY.NEW_ATTEMPT_ALLOWED };
    case 'released-without-proof': return { ...base, effectAdmitted: true, evidenceLimited: true };
    case 'rejected-before-download': return { ...base, failedBeforeEffect: true };
    default: throw new Error(`unknown save-as phase ${phase}`);
  }
}

const cases = [];
function check(name, actual, expectedClass, expectedRetry, expectedLookup = LOOKUP.EXACT) {
  assert.equal(actual.lookupResolution, expectedLookup, `${name}: lookup`);
  assert.equal(actual.operationClass, expectedClass, `${name}: class`);
  assert.equal(actual.retryDisposition, expectedRetry, `${name}: retry`);
  cases.push(name);
}
function exact(receipt) { return reconcileLookup([receipt]); }

check('no admission receipt', reconcileLookup([]), CLASS.NOT_ADMITTED, RETRY.NEW_ATTEMPT_ALLOWED, LOOKUP.NONE);
check('ambiguous subject discovery', reconcileLookup([op('a','x'), op('b','x')]), CLASS.EVIDENCE_LIMITED, RETRY.MANUAL_RESOLUTION, LOOKUP.AMBIGUOUS);
check('lookup evidence lost', reconcileLookup([], { evidenceLimited: true }), CLASS.EVIDENCE_LIMITED, RETRY.MANUAL_RESOLUTION, LOOKUP.EVIDENCE_LIMITED);

for (const [phase, klass, retry] of [
  ['admitted', CLASS.RUNNING, RETRY.RECONCILE_ONLY], ['render-failed', CLASS.FAILED_BEFORE_EFFECT, RETRY.NEW_ATTEMPT_ALLOWED],
  ['pdf-sealed', CLASS.DOMAIN_PENDING, RETRY.SAME_OPERATION_ONLY], ['remote-prepared', CLASS.DOMAIN_PENDING, RETRY.SAME_OPERATION_ONLY],
  ['upload-admitted', CLASS.EFFECT_UNKNOWN, RETRY.RECONCILE_ONLY], ['remote-verified', CLASS.DOMAIN_PENDING, RETRY.SAME_OPERATION_ONLY],
  ['publication-admitted', CLASS.EFFECT_UNKNOWN, RETRY.RECONCILE_ONLY], ['journal-finalizing', CLASS.DOMAIN_PENDING, RETRY.SAME_OPERATION_ONLY],
  ['done', CLASS.SUCCEEDED, RETRY.NONE], ['remote-mismatch', CLASS.FAILED_TERMINAL, RETRY.MANUAL_RESOLUTION],
  ['legacy-unbound', CLASS.EVIDENCE_LIMITED, RETRY.MANUAL_RESOLUTION]
]) check(`yandex ${phase}`, exact(yandexSave(phase)), klass, retry);

for (const [phase, klass, retry] of [
  ['render-failed', CLASS.FAILED_BEFORE_EFFECT, RETRY.NEW_ATTEMPT_ALLOWED], ['pdf-sealed', CLASS.DOMAIN_PENDING, RETRY.SAME_OPERATION_ONLY],
  ['download-intent', CLASS.DOMAIN_PENDING, RETRY.SAME_OPERATION_ONLY], ['download-start-unknown', CLASS.EFFECT_UNKNOWN, RETRY.RECONCILE_ONLY],
  ['download-bound', CLASS.DOMAIN_PENDING, RETRY.SAME_OPERATION_ONLY], ['download-complete-journal-pending', CLASS.DOMAIN_PENDING, RETRY.SAME_OPERATION_ONLY],
  ['done', CLASS.SUCCEEDED, RETRY.NONE], ['interrupted', CLASS.FAILED_TERMINAL, RETRY.NEW_ATTEMPT_ALLOWED],
  ['history-lost', CLASS.EVIDENCE_LIMITED, RETRY.MANUAL_RESOLUTION]
]) check(`local ${phase}`, exact(localPdf(phase)), klass, retry);

for (const [phase, klass, retry] of [
  ['admitted', CLASS.RUNNING, RETRY.RECONCILE_ONLY], ['cas-pending', CLASS.DOMAIN_PENDING, RETRY.SAME_OPERATION_ONLY],
  ['cas-failed-before-write', CLASS.FAILED_BEFORE_EFFECT, RETRY.NEW_ATTEMPT_ALLOWED], ['done', CLASS.SUCCEEDED, RETRY.NONE]
]) check(`delete keep ${phase}`, exact(journalDelete(phase, false)), klass, retry);

for (const [phase, klass, retry] of [
  ['move-checkpoint', CLASS.DOMAIN_PENDING, RETRY.SAME_OPERATION_ONLY], ['move-admitted', CLASS.EFFECT_UNKNOWN, RETRY.RECONCILE_ONLY],
  ['move-verified', CLASS.DOMAIN_PENDING, RETRY.SAME_OPERATION_ONLY], ['journal-cas-pending', CLASS.DOMAIN_PENDING, RETRY.SAME_OPERATION_ONLY],
  ['done', CLASS.SUCCEEDED, RETRY.NONE], ['move-identity-ambiguous', CLASS.EVIDENCE_LIMITED, RETRY.MANUAL_RESOLUTION]
]) check(`delete trash ${phase}`, exact(journalDelete(phase, true)), klass, retry);

for (const [phase, klass, retry] of [
  ['move-checkpoint', CLASS.DOMAIN_PENDING, RETRY.SAME_OPERATION_ONLY], ['move-admitted', CLASS.EFFECT_UNKNOWN, RETRY.RECONCILE_ONLY],
  ['move-verified', CLASS.DOMAIN_PENDING, RETRY.SAME_OPERATION_ONLY], ['journal-cas-pending', CLASS.DOMAIN_PENDING, RETRY.SAME_OPERATION_ONLY],
  ['done', CLASS.SUCCEEDED, RETRY.NONE], ['identity-ambiguous', CLASS.EVIDENCE_LIMITED, RETRY.MANUAL_RESOLUTION]
]) check(`mark-read ${phase}`, exact(markRead(phase)), klass, retry);

for (const [phase, klass, retry] of [
  ['snapshot-staged', CLASS.DOMAIN_PENDING, RETRY.SAME_OPERATION_ONLY], ['remote-prepared', CLASS.DOMAIN_PENDING, RETRY.SAME_OPERATION_ONLY],
  ['upload-admitted', CLASS.EFFECT_UNKNOWN, RETRY.RECONCILE_ONLY], ['remote-verified', CLASS.DOMAIN_PENDING, RETRY.SAME_OPERATION_ONLY],
  ['state-commit-pending', CLASS.DOMAIN_PENDING, RETRY.SAME_OPERATION_ONLY], ['done', CLASS.SUCCEEDED, RETRY.NONE],
  ['lease-expired-after-upload', CLASS.EFFECT_UNKNOWN, RETRY.RECONCILE_ONLY]
]) check(`backup ${phase}`, exact(manualBackup(phase)), klass, retry);
const staleBackup = exact(manualBackup('done', false));
check('backup succeeded but no longer current', staleBackup, CLASS.SUCCEEDED, RETRY.NONE);
assert.equal(staleBackup.freshnessCurrent, false);

for (const [phase, klass, retry] of [
  ['staged', CLASS.DOMAIN_PENDING, RETRY.SAME_OPERATION_ONLY], ['awaiting-confirmation', CLASS.DOMAIN_PENDING, RETRY.SAME_OPERATION_ONLY],
  ['canceled', CLASS.CANCELED, RETRY.NEW_ATTEMPT_ALLOWED], ['apply-pending', CLASS.DOMAIN_PENDING, RETRY.SAME_OPERATION_ONLY],
  ['apply-failed-before-commit', CLASS.FAILED_BEFORE_EFFECT, RETRY.NEW_ATTEMPT_ALLOWED], ['done', CLASS.SUCCEEDED, RETRY.NONE],
  ['legacy-staging-evidence-limited', CLASS.EVIDENCE_LIMITED, RETRY.MANUAL_RESOLUTION]
]) check(`import ${phase}`, exact(stagedImport(phase)), klass, retry);

for (const [phase, klass, retry] of [
  ['prepared', CLASS.DOMAIN_PENDING, RETRY.SAME_OPERATION_ONLY], ['native-dialog-owned', CLASS.DOMAIN_PENDING, RETRY.SAME_OPERATION_ONLY],
  ['start-response-lost', CLASS.EFFECT_UNKNOWN, RETRY.RECONCILE_ONLY], ['started', CLASS.DOMAIN_PENDING, RETRY.SAME_OPERATION_ONLY],
  ['complete', CLASS.SUCCEEDED, RETRY.NONE], ['interrupted', CLASS.FAILED_TERMINAL, RETRY.NEW_ATTEMPT_ALLOWED],
  ['released-without-proof', CLASS.EVIDENCE_LIMITED, RETRY.MANUAL_RESOLUTION], ['rejected-before-download', CLASS.FAILED_BEFORE_EFFECT, RETRY.NEW_ATTEMPT_ALLOWED]
]) check(`save-as ${phase}`, exact(saveAs(phase)), klass, retry);

const logErrorButRemoteUnknown = exact({ ...yandexSave('upload-admitted'), operationLogStatus: 'error' });
check('OperationLog error cannot downgrade remote unknown', logErrorButRemoteUnknown, CLASS.EFFECT_UNKNOWN, RETRY.RECONCILE_ONLY);

const sameCorrelationA = op('corr-a', 'pdf-yandex-save', { clientCorrelationId: 'support:one' });
const sameCorrelationB = op('corr-b', 'pdf-yandex-save', { clientCorrelationId: 'support:one' });
assert.notEqual(sameCorrelationA.physicalOperationId, sameCorrelationB.physicalOperationId);
cases.push('same display correlation preserves distinct physical ids');

for (const klass of [CLASS.RUNNING, CLASS.DOMAIN_PENDING, CLASS.EFFECT_UNKNOWN, CLASS.EVIDENCE_LIMITED]) {
  const r = reconcileExact(op(`guard-${klass}`, 'guard', klass === CLASS.RUNNING ? {} : klass === CLASS.DOMAIN_PENDING ? { domainPending: true } : klass === CLASS.EFFECT_UNKNOWN ? { effectAdmitted: true, effectUnknown: true } : { evidenceLimited: true }));
  assert.notEqual(r.retryDisposition, RETRY.NEW_ATTEMPT_ALLOWED, `${klass} must not permit blind fresh mutation`);
}
cases.push('blind-retry guard across nonterminal/unknown classes');

console.log('Wave 1 user-operation reconciliation model: PASS');
console.log(`cases=${cases.length}`);
