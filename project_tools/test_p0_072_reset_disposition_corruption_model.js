'use strict';
const assert = require('node:assert/strict');

const VALID_KINDS = new Set(['clear-all', 'clear-url', 'clear-site', 'import-replace']);
const VALID_SCOPES = new Set(['all', 'url', 'site']);
const VALID_OUTCOMES = new Set(['pending', 'complete', 'interrupted', 'remote-verified', 'unknown', 'cancelled-before-start', 'start-rejected']);
const VALID_RESOLUTIONS = new Set(['reconciling', 'terminal', 'manual-resolution']);

function parseResetDisposition(row) {
  if (!row || typeof row !== 'object') return { status: 'absent', value: null };
  if (!Object.prototype.hasOwnProperty.call(row, 'journalResetDisposition')) return { status: 'absent', value: null };
  const value = row.journalResetDisposition;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { status: 'invalid', value: null };
  if (Number(value.version) !== 1) return { status: 'unsupported-version', value: null };
  const ok = typeof value.resetId === 'string'
    && /^[0-9a-f-]{36}$/i.test(value.resetId)
    && VALID_KINDS.has(value.kind)
    && VALID_SCOPES.has(value.scope)
    && value.state === 'quarantined'
    && VALID_OUTCOMES.has(value.outcome)
    && VALID_RESOLUTIONS.has(value.resolution)
    && Number.isFinite(value.quarantinedAt)
    && Number.isFinite(value.updatedAt);
  return ok ? { status: 'valid', value } : { status: 'invalid', value: null };
}

function classifyAuthority(row) {
  if (!row) return 'missing';
  const parsed = parseResetDisposition(row);
  if (parsed.status === 'absent') return 'active';
  if (parsed.status === 'valid') return 'reset-detached';
  return 'reset-indeterminate';
}

const valid = {
  version: 1,
  resetId: '11111111-1111-4111-8111-111111111111',
  kind: 'clear-all',
  scope: 'all',
  state: 'quarantined',
  outcome: 'pending',
  resolution: 'reconciling',
  quarantinedAt: 1,
  updatedAt: 1
};

assert.equal(classifyAuthority(null), 'missing');
assert.equal(classifyAuthority({ id: 'a' }), 'active');
assert.equal(classifyAuthority({ id: 'a', journalResetDisposition: valid }), 'reset-detached');
assert.equal(classifyAuthority({ id: 'a', journalResetDisposition: null }), 'reset-indeterminate');
assert.equal(classifyAuthority({ id: 'a', journalResetDisposition: { ...valid, version: 2 } }), 'reset-indeterminate');
assert.equal(classifyAuthority({ id: 'a', journalResetDisposition: { ...valid, outcome: 'bogus' } }), 'reset-indeterminate');

function canReplay(row) { return classifyAuthority(row) === 'active'; }
function canGenericDelete(row) { return classifyAuthority(row) === 'active'; }
assert.equal(canReplay({ journalResetDisposition: { ...valid, version: 2 } }), false);
assert.equal(canGenericDelete({ journalResetDisposition: { ...valid, version: 2 } }), false);

function secondReset(row, nextDisposition) {
  const state = classifyAuthority(row);
  if (state === 'active') return { ...row, journalResetDisposition: nextDisposition };
  if (state === 'reset-detached') return row;
  if (state === 'reset-indeterminate') return row;
  return row;
}

const v2 = { ...valid, version: 2, resetId: '22222222-2222-4222-8222-222222222222' };
const row = { id: 'a', journalResetDisposition: v2 };
assert.deepEqual(secondReset(row, valid), row,
  'an older runtime must preserve unknown future reset bytes instead of reactivating or overwriting them');

console.log('P0-072 reset disposition corruption/rollback model: PASS');
