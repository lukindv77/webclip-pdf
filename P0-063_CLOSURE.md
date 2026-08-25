# P0-063 closure — global offscreen signed-transfer admission/memory budget

Status: **REGRESSION**

## Problem

Signed Yandex transfers previously incremented only an unbounded `activeTransfers` counter. Concurrent 50–64 MiB operations could materialize large IndexedDB records, Blob bodies and fetch payloads at the same time even though Blob URL resources had a separate budget.

## Fix

- global count cap: 2 actual unsettled signed transfers;
- global byte cap: 96 MiB;
- fail-safe mode upper bound is reserved before potentially large IDB/Blob materialization;
- after materialization, reservation is reduced to the actual Blob/staged byte size;
- admission failure is fail-fast with `OFFSCREEN_TRANSFER_BUDGET_EXCEEDED`;
- reservation release is idempotent and occurs only from the actual offscreen transfer promise `.finally()`; caller/runtime timeout is not treated as cancellation of the underlying fetch/IDB side effect;
- idle-close continues to depend on the same actual active-transfer count.

## Invariants preserved

Signed URL host/HTTPS validation, redirect fail-closed behavior, AbortController transfer deadline, trusted sender validation, existing Blob URL budget, bounded IDB operations and manifest 0.9.8 remain unchanged.

## Evidence

- `project_tools/test_p0_063_offscreen_transfer_budget.js` exercises count/byte rejection, actual-size shrink and idempotent settlement release;
- full JavaScript syntax gate;
- full deterministic `project_tools/test_*.js` gate;
- manifest/security invariant gate.

No unmanaged/unpacked browser rerun is claimed for P0-063.
