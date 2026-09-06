'use strict';
const assert = require('node:assert/strict');

const STAGES = new Set(['prepared', 'admitted', 'cancelled-before-start', 'not-applicable']);

function parseExternalStages(row, kind) {
  if (!row || typeof row !== 'object') return { status: 'absent' };
  if (!Object.prototype.hasOwnProperty.call(row, 'externalStages')) return { status: 'absent' };
  const value = row.externalStages;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { status: 'invalid' };
  if (Number(value.version) !== 1) return { status: 'unsupported-version' };
  const required = kind === 'local' ? ['downloadStart'] : kind === 'remote' ? ['upload', 'publish'] : [];
  if (!required.length) return { status: 'invalid' };
  if (!required.every((name) => STAGES.has(value[name]))) return { status: 'invalid' };
  return { status: 'valid', value };
}

function admissionClass(row, kind, stage) {
  const parsed = parseExternalStages(row, kind);
  if (parsed.status === 'absent') return 'legacy-admission-unknown';
  if (parsed.status !== 'valid') return 'stage-indeterminate';
  return parsed.value[stage];
}

function canAdmitNow(row, kind, stage) {
  return admissionClass(row, kind, stage) === 'prepared';
}

function resetStageOutcome(row, kind, stage) {
  const state = admissionClass(row, kind, stage);
  if (state === 'prepared') return 'cancelled-before-start';
  if (state === 'not-applicable') return 'not-applicable';
  if (state === 'admitted' || state === 'legacy-admission-unknown') return 'reconciling';
  return 'manual-resolution';
}

assert.equal(admissionClass({}, 'local', 'downloadStart'), 'legacy-admission-unknown');
assert.equal(canAdmitNow({}, 'local', 'downloadStart'), false,
  'legacy rows must reconcile rather than gain a fresh start permission');
assert.equal(admissionClass({ externalStages: null }, 'local', 'downloadStart'), 'stage-indeterminate');
assert.equal(canAdmitNow({ externalStages: null }, 'local', 'downloadStart'), false);
assert.equal(admissionClass({ externalStages: { version: 2, downloadStart: 'prepared' } }, 'local', 'downloadStart'), 'stage-indeterminate');
assert.equal(canAdmitNow({ externalStages: { version: 2, downloadStart: 'prepared' } }, 'local', 'downloadStart'), false,
  'an older runtime must not reinterpret a future prepared stage as its own permission');

const prepared = { externalStages: { version: 1, downloadStart: 'prepared' } };
assert.equal(canAdmitNow(prepared, 'local', 'downloadStart'), true);
assert.equal(resetStageOutcome(prepared, 'local', 'downloadStart'), 'cancelled-before-start');
assert.equal(resetStageOutcome({}, 'local', 'downloadStart'), 'reconciling');
assert.equal(resetStageOutcome({ externalStages: null }, 'local', 'downloadStart'), 'manual-resolution');

console.log('P0-072 external stage corruption/rollback model: PASS');
