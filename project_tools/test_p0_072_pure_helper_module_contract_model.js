'use strict';
const assert = require('node:assert/strict');

const RESET_VERSION = 1;
const STAGE_VERSION = 1;
const MAX_RESET_JSON_CHARS = 512;
const MAX_SOURCE_OPERATION_ID_CHARS = 180;
const RESET_KEYS = Object.freeze(['version', 'resetId', 'kind', 'scope', 'sourceOperationId', 'quarantinedAt', 'state', 'outcome', 'resolution', 'updatedAt']);
const KINDS = new Set(['clear-all', 'clear-url', 'clear-site', 'import-replace']);
const SCOPES = new Set(['all', 'url', 'site']);
const KIND_SCOPE = new Map([
  ['clear-all', 'all'],
  ['clear-url', 'url'],
  ['clear-site', 'site'],
  ['import-replace', 'all']
]);
const OUTCOME_RESOLUTION = new Map([
  ['pending', new Set(['reconciling', 'manual-resolution'])],
  ['complete', new Set(['terminal'])],
  ['interrupted', new Set(['terminal'])],
  ['remote-verified', new Set(['terminal'])],
  ['unknown', new Set(['manual-resolution'])],
  ['cancelled-before-start', new Set(['terminal'])],
  ['start-rejected', new Set(['terminal'])]
]);
const STAGE_VALUES = new Set(['prepared', 'admitted', 'cancelled-before-start', 'not-applicable']);
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function own(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }
function plain(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function safeTime(value) { return Number.isSafeInteger(value) && value >= 0; }
function exactKeys(value, expected) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function validateResetValue(value) {
  if (!plain(value) || !exactKeys(value, RESET_KEYS)) return false;
  if (value.version !== RESET_VERSION || !UUID_V4.test(value.resetId)) return false;
  if (!KINDS.has(value.kind) || !SCOPES.has(value.scope) || KIND_SCOPE.get(value.kind) !== value.scope) return false;
  if (typeof value.sourceOperationId !== 'string' || value.sourceOperationId.length > MAX_SOURCE_OPERATION_ID_CHARS) return false;
  if (!safeTime(value.quarantinedAt) || !safeTime(value.updatedAt)) return false;
  if (value.state !== 'quarantined') return false;
  const allowedResolutions = OUTCOME_RESOLUTION.get(value.outcome);
  if (!allowedResolutions || !allowedResolutions.has(value.resolution)) return false;
  return JSON.stringify(value).length <= MAX_RESET_JSON_CHARS;
}

function parseResetDispositionField(row) {
  if (!plain(row) || !own(row, 'journalResetDisposition')) return { status: 'absent', value: null };
  const value = row.journalResetDisposition;
  if (!plain(value)) return { status: 'invalid', value: null };
  if (value.version !== RESET_VERSION) return { status: 'unsupported-version', value: null };
  return validateResetValue(value) ? { status: 'valid', value } : { status: 'invalid', value: null };
}

function classifyCheckpointAuthority(row) {
  if (row == null) return 'missing';
  const parsed = parseResetDispositionField(row);
  if (parsed.status === 'absent') return 'active';
  if (parsed.status === 'valid') return 'reset-detached';
  return 'reset-indeterminate';
}

function makeResetDisposition(input) {
  const value = {
    version: RESET_VERSION,
    resetId: String(input?.resetId || ''),
    kind: String(input?.kind || ''),
    scope: String(input?.scope || ''),
    sourceOperationId: String(input?.sourceOperationId || ''),
    quarantinedAt: Number(input?.quarantinedAt),
    state: 'quarantined',
    outcome: String(input?.outcome || ''),
    resolution: String(input?.resolution || ''),
    updatedAt: Number(input?.updatedAt)
  };
  if (!validateResetValue(value)) throw new TypeError('Invalid journal reset disposition v1.');
  return value;
}

function parseExternalStagesField(row, kind) {
  if (!plain(row) || !own(row, 'externalStages')) return { status: 'absent', value: null };
  const value = row.externalStages;
  if (!plain(value)) return { status: 'invalid', value: null };
  if (value.version !== STAGE_VERSION) return { status: 'unsupported-version', value: null };
  const expected = kind === 'local'
    ? ['version', 'downloadStart']
    : kind === 'remote'
      ? ['version', 'upload', 'publish']
      : null;
  if (!expected || !exactKeys(value, expected)) return { status: 'invalid', value: null };
  const names = expected.filter((key) => key !== 'version');
  if (!names.every((name) => STAGE_VALUES.has(value[name]))) return { status: 'invalid', value: null };
  return { status: 'valid', value };
}

function classifyExternalStage(row, kind, stage) {
  const parsed = parseExternalStagesField(row, kind);
  if (parsed.status === 'absent') return 'legacy-admission-unknown';
  if (parsed.status !== 'valid') return 'stage-indeterminate';
  if (!own(parsed.value, stage)) return 'stage-indeterminate';
  return parsed.value[stage];
}

const valid = makeResetDisposition({
  resetId: '11111111-1111-4111-8111-111111111111',
  kind: 'clear-url',
  scope: 'url',
  sourceOperationId: 'op-1',
  quarantinedAt: 10,
  outcome: 'pending',
  resolution: 'reconciling',
  updatedAt: 10
});
assert.equal(classifyCheckpointAuthority({ journalResetDisposition: valid }), 'reset-detached');
assert.equal(classifyCheckpointAuthority({ journalResetDisposition: { ...valid, version: 2 } }), 'reset-indeterminate');
assert.equal(classifyCheckpointAuthority({}), 'active');
assert.throws(() => makeResetDisposition({ ...valid, kind: 'clear-site', scope: 'url' }));
assert.throws(() => makeResetDisposition({ ...valid, outcome: 'unknown', resolution: 'terminal' }));
const clockRollback = makeResetDisposition({ ...valid, updatedAt: 9 });
assert.equal(clockRollback.updatedAt, 9,
  'wall-clock ordering is not durable authority; backward clock adjustment must not invalidate reset state');
assert.equal(classifyExternalStage({}, 'local', 'downloadStart'), 'legacy-admission-unknown');
assert.equal(classifyExternalStage({ externalStages: { version: 1, downloadStart: 'prepared' } }, 'local', 'downloadStart'), 'prepared');
assert.equal(classifyExternalStage({ externalStages: { version: 2, downloadStart: 'prepared' } }, 'local', 'downloadStart'), 'stage-indeterminate');
assert.equal(parseExternalStagesField({ externalStages: { version: 1, downloadStart: 'prepared', extra: true } }, 'local').status, 'invalid');

console.log('P0-072 pure helper module contract model: PASS');
