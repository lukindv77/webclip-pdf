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
    const classification = classifyReceipt(row);
    if (classification === 'indeterminate') return { ok: false, reason: 'namespace-indeterminate' };
    if (classification === 'active' || classification === 'manual') unresolved += 1;
  }
  if (unresolved >= unresolvedCap) return { ok: false, reason: 'unresolved-cap' };
  return { ok: true };
}

assert.deepEqual(
  admissionDecision([{ version: 2, provenance: 'worker-issued-live' }]),
  { ok: false, reason: 'namespace-indeterminate' }
);
assert.deepEqual(
  admissionDecision([{ version: 1, provenance: 'worker-issued-live', resolution: 'manual-resolution' }], { unresolvedCap: 1 }),
  { ok: false, reason: 'unresolved-cap' }
);
assert.equal(
  admissionDecision([{ version: 1, provenance: 'worker-issued-live', resolution: 'terminal' }], { unresolvedCap: 1 }).ok,
  true
);

console.log('P0-072 external receipt indeterminate capacity model: PASS');
