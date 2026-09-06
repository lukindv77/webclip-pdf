'use strict';
const assert = require('node:assert/strict');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_AUTHORITY_JSON = 512;
const MAX_LEGACY_REVISION = 128;
function plain(v) { return Boolean(v) && typeof v === 'object' && !Array.isArray(v); }
function parseControl(record) {
  if (record == null) return { status: 'absent' };
  const value = record.value;
  if (!plain(value)) return { status: 'invalid' };
  if (value.version !== 1) return { status: 'unsupported-version' };
  if (!UUID.test(String(value.generation || '')) || typeof value.destructiveBoundarySeen !== 'boolean') return { status: 'invalid' };
  return { status: 'valid', value };
}
function parseLocal(entry) {
  if (!entry || !Object.prototype.hasOwnProperty.call(entry, 'journalLocalRevision')) return { status: 'absent' };
  const v = entry.journalLocalRevision;
  if (!plain(v)) return { status: 'invalid' };
  if (v.version !== 1) return { status: 'unsupported-version' };
  if (!UUID.test(String(v.generation || '')) || !Number.isSafeInteger(v.revision) || v.revision < 1) return { status: 'invalid' };
  return { status: 'valid', value: v };
}
function parseDbRevision(record) {
  if (record == null) return { status: 'absent', value: '' };
  const value = String(record.value || '');
  if (!value || value.length > MAX_LEGACY_REVISION) return { status: 'invalid' };
  return { status: 'valid', value };
}
function makeAuthority(entry, controlRecord, revisionRecord) {
  if (!entry) return { status: 'missing' };
  const control = parseControl(controlRecord);
  const local = parseLocal(entry);
  const revision = parseDbRevision(revisionRecord);
  if (control.status === 'invalid' || control.status === 'unsupported-version') return { status: 'indeterminate' };
  if (local.status === 'invalid' || local.status === 'unsupported-version') return { status: 'indeterminate' };
  if (revision.status === 'invalid') return { status: 'indeterminate' };
  if (local.status === 'valid') {
    if (control.status !== 'valid') return { status: 'indeterminate' };
    const value = { version: 1, kind: 'modern', journalGeneration: control.value.generation,
      entryGeneration: local.value.generation, entryRevision: local.value.revision };
    assert(JSON.stringify(value).length <= MAX_AUTHORITY_JSON);
    return { status: 'valid', value };
  }
  const value = { version: 1, kind: 'legacy', journalGeneration: control.status === 'valid' ? control.value.generation : '',
    legacyDbRevision: revision.value };
  assert(JSON.stringify(value).length <= MAX_AUTHORITY_JSON);
  return { status: 'valid', value };
}

const g = '11111111-1111-4111-8111-111111111111';
const e = '22222222-2222-4222-8222-222222222222';
const control = { key: 'journalMutationGeneration', value: { version: 1, generation: g, destructiveBoundarySeen: false } };
const rev = { key: 'revision', value: '1234567890-33333333-3333-4333-8333-333333333333' };
assert.deepEqual(makeAuthority({ id: 'L' }, null, null), { status: 'valid', value: { version: 1, kind: 'legacy', journalGeneration: '', legacyDbRevision: '' } });
assert.equal(makeAuthority({ id: 'L' }, control, rev).value.kind, 'legacy');
const modern = makeAuthority({ id: 'A', journalLocalRevision: { version: 1, generation: e, revision: 9 } }, control, rev);
assert.equal(modern.status, 'valid');
assert.equal(modern.value.kind, 'modern');
assert.equal(modern.value.entryRevision, 9);
assert.equal(makeAuthority({ id: 'A', journalLocalRevision: { version: 1, generation: e, revision: 9 } }, null, rev).status, 'indeterminate',
  'modern local authority without global control is inconsistent');
assert.equal(makeAuthority({ id: 'A', journalLocalRevision: null }, control, rev).status, 'indeterminate');
assert.equal(makeAuthority({ id: 'A' }, { key: 'journalMutationGeneration', value: { version: 2 } }, rev).status, 'indeterminate');
assert.equal(makeAuthority({ id: 'A' }, control, { key: 'revision', value: 'x'.repeat(129) }).status, 'indeterminate');
assert(JSON.stringify(modern.value).length <= MAX_AUTHORITY_JSON);

console.log('P0-076 shared authority helper model: PASS');
