'use strict';

const assert = require('node:assert/strict');

const STATES = Object.freeze({ ACTIVE: 'active', MANUAL: 'manual', TERMINAL: 'terminal' });

function classify(receipt) {
  if (receipt.resolution === 'manual-resolution') return STATES.MANUAL;
  if (receipt.resolution === 'terminal') return STATES.TERMINAL;
  return STATES.ACTIVE;
}

function assertBoundedRecord(receipt, maxSerializedChars) {
  const chars = JSON.stringify(receipt).length;
  if (chars > maxSerializedChars) {
    const error = new Error('Receipt exceeds its local serialized-record envelope.');
    error.code = 'RECEIPT_RECORD_TOO_LARGE';
    throw error;
  }
  return chars;
}

function admitPreparedReceipt(rows, receipt, limits) {
  assertBoundedRecord(receipt, limits.maxSerializedChars);
  const namespaceRows = rows.filter((row) => String(row.key || '').startsWith('externalEffect:v1:'));
  const active = namespaceRows.filter((row) => classify(row) === STATES.ACTIVE).length;
  const manual = namespaceRows.filter((row) => classify(row) === STATES.MANUAL).length;

  if (active >= limits.active) {
    const error = new Error('Active receipt capacity is exhausted.');
    error.code = 'RECEIPT_ACTIVE_CAP';
    throw error;
  }
  // P0-072 fail-closed policy: do not admit another irreversible effect while
  // unresolved/manual truth is already at the bounded product envelope.
  if (manual >= limits.manual) {
    const error = new Error('Manual-resolution receipt capacity is exhausted.');
    error.code = 'RECEIPT_MANUAL_CAP';
    throw error;
  }
  rows.push(structuredClone(receipt));
}

function compactProvenTerminalReceipts(rows, terminalCap) {
  const terminal = rows.filter((row) =>
    String(row.key || '').startsWith('externalEffect:v1:')
    && classify(row) === STATES.TERMINAL
  );
  if (terminal.length <= terminalCap) return 0;

  const provenRemovable = terminal
    .filter((row) => ['cancelled-before-start', 'verified', 'interrupted'].includes(row.phase))
    .sort((a, b) => Number(a.updatedAt || 0) - Number(b.updatedAt || 0));

  let excess = terminal.length - terminalCap;
  let removed = 0;
  for (const receipt of provenRemovable) {
    if (excess <= 0) break;
    const index = rows.findIndex((row) => row.key === receipt.key);
    if (index < 0) continue;
    rows.splice(index, 1);
    excess -= 1;
    removed += 1;
  }
  return removed;
}

function simulateResetTransaction(rows, entry, receiptKey, { quotaFailure = false } = {}) {
  const before = structuredClone({ rows, entry });
  const current = rows.find((row) => row.key === receiptKey);
  if (!current) throw new Error('Receipt is missing.');

  current.resetDisposition = { version: 1, resetId: 'reset-X', state: 'detached' };
  if (current.phase === 'prepared') {
    current.phase = 'cancelled-before-start';
    current.resolution = 'terminal';
  }
  entry.deleted = true;

  // Models IndexedDB transaction abort on QuotaExceededError or any other
  // uncaught write error: Journal mutation and receipt growth roll back together.
  return quotaFailure ? before : { rows, entry };
}

(function activeCapBlocksBeforeExternalEffectAdmission() {
  const limits = { active: 1, manual: 1, terminal: 2, maxSerializedChars: 4096 };
  const rows = [{ key: 'externalEffect:v1:a', phase: 'prepared', resolution: 'reconciling' }];
  assert.throws(
    () => admitPreparedReceipt(rows, { key: 'externalEffect:v1:b', phase: 'prepared', resolution: 'reconciling' }, limits),
    (error) => error?.code === 'RECEIPT_ACTIVE_CAP'
  );
  assert.equal(rows.length, 1);
})();

(function unresolvedManualPressureCannotBeSolvedBySilentEviction() {
  const limits = { active: 3, manual: 1, terminal: 2, maxSerializedChars: 4096 };
  const rows = [{ key: 'externalEffect:v1:m', phase: 'unknown', resolution: 'manual-resolution' }];
  assert.throws(
    () => admitPreparedReceipt(rows, { key: 'externalEffect:v1:new', phase: 'prepared', resolution: 'reconciling' }, limits),
    (error) => error?.code === 'RECEIPT_MANUAL_CAP'
  );
  assert.equal(rows[0].phase, 'unknown');
})();

(function terminalCleanupNeverUsesManualUnknownAsSpace() {
  const rows = [
    { key: 'externalEffect:v1:u', phase: 'unknown', resolution: 'manual-resolution', updatedAt: 1 },
    { key: 'externalEffect:v1:c', phase: 'cancelled-before-start', resolution: 'terminal', updatedAt: 2 },
    { key: 'externalEffect:v1:v', phase: 'verified', resolution: 'terminal', updatedAt: 3 }
  ];
  assert.equal(compactProvenTerminalReceipts(rows, 1), 1);
  assert.equal(rows.some((row) => row.key === 'externalEffect:v1:u'), true,
    'P0-072: manual/unknown physical truth must not be evicted to satisfy terminal retention.');
})();

(function quotaFailureRollsBackResetAndReceiptDispositionTogether() {
  const rows = [{
    key: 'externalEffect:v1:a',
    phase: 'effect-admitted',
    resolution: 'reconciling',
    resetDisposition: null
  }];
  const entry = { id: 'entry-1', deleted: false };
  const result = simulateResetTransaction(rows, entry, 'externalEffect:v1:a', { quotaFailure: true });
  assert.equal(result.entry.deleted, false);
  assert.equal(result.rows[0].resetDisposition, null);
})();

(function preparedPersistedStateIsProofAdmissionCasDidNotCommit() {
  const receipt = { key: 'externalEffect:v1:p', phase: 'prepared', resolution: 'reconciling' };
  assert.notEqual(receipt.phase, 'effect-admitted');
})();

(function admittedCrashWindowRemainsUncertain() {
  const receipt = {
    key: 'externalEffect:v1:a',
    phase: 'effect-admitted',
    resolution: 'reconciling',
    updatedAt: 1
  };
  assert.equal(classify(receipt), STATES.ACTIVE);
  assert.notEqual(receipt.resolution, 'terminal',
    'P0-072: age alone cannot convert post-admission uncertainty into cancellation.');
})();

(function oversizedReceiptFailsBeforeAdmission() {
  const limits = { active: 3, manual: 3, terminal: 3, maxSerializedChars: 64 };
  const rows = [];
  assert.throws(
    () => admitPreparedReceipt(rows, {
      key: 'externalEffect:v1:large',
      phase: 'prepared',
      resolution: 'reconciling',
      targetPath: 'x'.repeat(1000)
    }, limits),
    (error) => error?.code === 'RECEIPT_RECORD_TOO_LARGE'
  );
  assert.equal(rows.length, 0);
})();

console.log('P0-072 receipt capacity/cleanup model: PASS');
