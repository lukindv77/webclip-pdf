'use strict';

const assert = require('node:assert/strict');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function cleanupStaleAtomic(rows, { cutoff = 0, retentionCap = 100 } = {}) {
  const current = clone(rows);
  const stale = Object.entries(current)
    .filter(([, row]) => String(row?.phase || '') === 'stale-unverified')
    .filter(([, row]) => !row?.journalResetDisposition)
    .sort((a, b) => Number(a[1]?.staleAt || 0) - Number(b[1]?.staleAt || 0));

  const remove = new Set(
    stale.filter(([, row]) => Number(row?.staleAt || 0) < cutoff).map(([key]) => key)
  );
  const retained = stale.filter(([key]) => !remove.has(key));
  const excess = Math.max(0, retained.length - retentionCap);
  for (let index = 0; index < excess; index += 1) remove.add(retained[index][0]);
  for (const key of remove) delete current[key];
  return { rows: current, removed: remove };
}

(function detachedRowsAreNeverGenericCleanupTargets() {
  const rows = {
    old: { phase: 'stale-unverified', staleAt: 1, operationId: 'op-old' },
    detached: {
      phase: 'stale-unverified', staleAt: 1, operationId: 'op-detached',
      journalResetDisposition: { version: 1, resetId: 'reset-1', resolution: 'manual-resolution' }
    }
  };
  const result = cleanupStaleAtomic(rows, { cutoff: 10, retentionCap: 100 });
  assert.equal(result.removed.has('old'), true);
  assert.equal(result.removed.has('detached'), false);
  assert.ok(result.rows.detached);
})();

(function countPressureStillSkipsDetachedRows() {
  const rows = {
    a: { phase: 'stale-unverified', staleAt: 100 },
    b: { phase: 'stale-unverified', staleAt: 101 },
    c: { phase: 'stale-unverified', staleAt: 102 },
    detached: {
      phase: 'stale-unverified', staleAt: 0,
      journalResetDisposition: { version: 1, resetId: 'reset-2', resolution: 'manual-resolution' }
    }
  };
  const result = cleanupStaleAtomic(rows, { cutoff: 0, retentionCap: 2 });
  assert.equal(result.removed.has('detached'), false);
  assert.equal(Object.keys(result.rows).filter((key) => /^[abc]$/.test(key)).length, 2);
})();

(function factualStateChangeBeforeAtomicScanPreventsDelete() {
  const rows = { x: { phase: 'remote-verified', staleAt: 1, operationId: 'op-x' } };
  const result = cleanupStaleAtomic(rows, { cutoff: 10, retentionCap: 100 });
  assert.equal(result.removed.size, 0);
  assert.ok(result.rows.x);
})();

(function genericCleanupDoesNotOwnDetachedTerminalRetention() {
  const rows = {
    x: {
      phase: 'stale-unverified', staleAt: 1,
      journalResetDisposition: { version: 1, resetId: 'reset-3', resolution: 'terminal', outcome: 'remote-verified' }
    }
  };
  const result = cleanupStaleAtomic(rows, { cutoff: 10, retentionCap: 0 });
  assert.equal(result.removed.size, 0,
    'Generic stale cleanup must not delete reset-detached rows; terminal receipt retention is a dedicated path.');
})();

console.log('P0-072 remote stale cleanup atomic model: PASS');
