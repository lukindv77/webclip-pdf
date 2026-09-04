'use strict';

const assert = require('node:assert/strict');

function clone(v) { return JSON.parse(JSON.stringify(v)); }

function makeRow(operationId, stages) {
  const stageAdmissions = {};
  for (const stage of stages) stageAdmissions[stage] = { state: 'prepared' };
  return { operationId, stageAdmissions, journalResetDisposition: null };
}

function admit(row, operationId, stage) {
  if (!row || row.operationId !== operationId) return { ok: false, code: 'OPERATION_MISMATCH' };
  if (row.journalResetDisposition) return { ok: false, code: 'JOURNAL_RESET_DETACHED' };
  const current = row.stageAdmissions?.[stage];
  if (!current || current.state !== 'prepared') return { ok: false, code: 'STAGE_NOT_PREPARED' };
  const next = clone(row);
  next.stageAdmissions[stage] = { ...next.stageAdmissions[stage], state: 'admitted' };
  return { ok: true, row: next };
}

function reset(row, resetId) {
  const next = clone(row);
  next.journalResetDisposition = next.journalResetDisposition || { version: 1, resetId, state: 'quarantined' };
  for (const [stage, state] of Object.entries(next.stageAdmissions || {})) {
    if (state.state === 'prepared') next.stageAdmissions[stage] = { ...state, state: 'cancelled-before-start' };
  }
  return next;
}

function settle(row, stage, outcome) {
  const next = clone(row);
  assert.equal(next.stageAdmissions[stage].state, 'admitted');
  next.stageAdmissions[stage] = { ...next.stageAdmissions[stage], state: 'terminal', outcome };
  return next;
}

(function resetBeforeLocalAdmissionPreventsChromeStart() {
  let row = makeRow('op-local', ['download-start']);
  row = reset(row, 'r1');
  const attempt = admit(row, 'op-local', 'download-start');
  assert.equal(attempt.ok, false);
  assert.equal(attempt.code, 'JOURNAL_RESET_DETACHED');
  assert.equal(row.stageAdmissions['download-start'].state, 'cancelled-before-start');
})();

(function localAdmissionBeforeResetPreservesUncertainty() {
  let row = makeRow('op-local', ['download-start']);
  row = admit(row, 'op-local', 'download-start').row;
  row = reset(row, 'r1');
  assert.equal(row.stageAdmissions['download-start'].state, 'admitted');
  row = settle(row, 'download-start', 'complete');
  assert.equal(row.stageAdmissions['download-start'].outcome, 'complete');
  assert.equal(row.journalResetDisposition.resetId, 'r1');
})();

(function uploadBeforeResetCannotAuthorizePublishAfterReset() {
  let row = makeRow('op-remote', ['upload', 'publish']);
  row = admit(row, 'op-remote', 'upload').row;
  row = reset(row, 'r1');
  assert.equal(row.stageAdmissions.upload.state, 'admitted');
  assert.equal(row.stageAdmissions.publish.state, 'cancelled-before-start');
  const publish = admit(row, 'op-remote', 'publish');
  assert.equal(publish.ok, false);
})();

(function publishAdmissionBeforeResetMayOnlySettleFactually() {
  let row = makeRow('op-remote', ['publish']);
  row = admit(row, 'op-remote', 'publish').row;
  row = reset(row, 'r1');
  row = settle(row, 'publish', 'published');
  assert.equal(row.stageAdmissions.publish.outcome, 'published');
  assert.equal(row.journalResetDisposition.resetId, 'r1');
})();

(function cachedSnapshotCannotBypassTransactionOwnedRow() {
  const cached = makeRow('op-remote', ['publish']);
  const current = reset(cached, 'r1');
  assert.equal(cached.journalResetDisposition, null, 'stale snapshot still looks active');
  const authoritativeAttempt = admit(current, 'op-remote', 'publish');
  assert.equal(authoritativeAttempt.ok, false, 'stage admission must re-read current durable row, not cached snapshot');
})();

(function operationMismatchFailsClosed() {
  const row = makeRow('op-a', ['upload']);
  const attempt = admit(row, 'op-b', 'upload');
  assert.equal(attempt.ok, false);
  assert.equal(attempt.code, 'OPERATION_MISMATCH');
})();

(function secondResetKeepsFirstIdentity() {
  let row = makeRow('op', ['upload']);
  row = reset(row, 'r1');
  row = reset(row, 'r2');
  assert.equal(row.journalResetDisposition.resetId, 'r1');
})();

console.log('P0-072 external stage admission model: PASS');
