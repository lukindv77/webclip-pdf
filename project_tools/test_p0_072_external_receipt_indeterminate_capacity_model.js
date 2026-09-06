'use strict';
const assert = require('node:assert/strict');

function classifyReceipt(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return 'indeterminate';
  if (record.version !== 1 || record.provenance !== 'worker-issued-live') return 'indeterminate';
  if (record.resolution === 'terminal') return 'terminal';
  if (record.resolution === 'manual-resolution') return 'manual';
  if (record.resolution === 'reconciling') return 'active';
  return 'indeterminate';
}

function admissionDecision(rows, { unresolvedCap = 3 } = {}) {
  let unresolved = 0;
  for (const row of rows) {
    if (row?.keyValid !== true) return { ok: false, reason: 'namespace-corrupt' };
    const classification = classifyReceipt(row.record);
    if (classification === 'active' || classification === 'manual' || classification === 'indeterminate') unresolved += 1;
  }
  if (unresolved >= unresolvedCap) return { ok: false, reason: 'unresolved-cap' };
  return { ok: true, unresolved };
}

assert.deepEqual(
  admissionDecision([{ keyValid: true, record: { version: 2, provenance: 'worker-issued-live' } }], { unresolvedCap: 2 }),
  { ok: true, unresolved: 1 },
  'a valid one-effect key with unsupported body consumes one unresolved liability instead of globally blocking unrelated admission'
);
assert.deepEqual(
  admissionDecision([{ keyValid: true, record: { version: 2, provenance: 'worker-issued-live' } }], { unresolvedCap: 1 }),
  { ok: false, reason: 'unresolved-cap' }
);
assert.deepEqual(
  admissionDecision([{ keyValid: false, record: { version: 1 } }]),
  { ok: false, reason: 'namespace-corrupt' },
  'an invalid key cannot prove the one-key/one-effect capacity invariant'
);
assert.deepEqual(
  admissionDecision([{ keyValid: true, record: { version: 1, provenance: 'worker-issued-live', resolution: 'manual-resolution' } }], { unresolvedCap: 1 }),
  { ok: false, reason: 'unresolved-cap' }
);
assert.equal(
  admissionDecision([{ keyValid: true, record: { version: 1, provenance: 'worker-issued-live', resolution: 'terminal' } }], { unresolvedCap: 1 }).ok,
  true
);

console.log('P0-072 external receipt indeterminate capacity model: PASS');
