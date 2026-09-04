# P0-072 — rollout-compatible unresolved-liability reservation — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 5f40e7582cff95ba4420d3b0d677bd1fc5829c9f`  
Deterministic model commit: `2b82dfcce8f0b743c2d35a79b83f68a2515e522f`  
Owners: **P0-072 ACTIVE**; P0-039 remains **DONE** and must not regress.

This checkpoint refines the immediately preceding unresolved-liability reservation model so it composes with the already accepted P0-039 local-download capacity contract. Runtime/manifest are unchanged.

## 1. P0-039 is a hard compatibility constraint

P0-039 closure explicitly accepted:

- active local pending-download capacity = 100;
- unknown/manual-resolution capacity = 100;
- the two classes are counted independently;
- 99 active + 99 unknown remains admissible;
- the 100th row in either class independently closes that class.

P0-072 cannot silently replace that DONE behavior with a shared 100-row cap for every existing row.

## 2. Why future-manual reservation is still needed

A new explicit-stage download row can be admitted while still `prepared/admitted`, then later factually become unknown/manual.

If new rows continue to use only the historical independent counters, the runtime can admit work without reserving any place for that later truthful unknown transition.

Rejecting or deleting the transition later is unsafe.

Therefore future rows created under the new P0-072 stage protocol need a manual-liability reservation, but historical rows need rollout compatibility.

## 3. Grandfather old rows, reserve new-protocol liabilities

Classify local pending rows into:

### Historical / pre-stage rows

No valid `externalStages.version === 1`.

These keep the P0-039 compatibility semantics. They were admitted by old rules and cannot retroactively reserve a future unknown slot.

If such a row later becomes unknown and pushes manual evidence over a future reservation target, the truthful transition still commits. The overage is grandfathered and blocks new admission; it is never repaired by deleting evidence.

### New protocol rows

Valid v1 explicit stage state exists.

While their physical outcome remains unresolved (`downloadStart=prepared|admitted` and not already manual/terminal), they reserve one future manual slot.

Admission uses:

```text
activeCount < 100
unknownManualCount < 100
unknownManualCount + reservedNewProtocolLiabilities < 100
```

The third term is the new P0-072 protection.

## 4. P0-039 99+99 boundary remains valid

With:

```text
99 historical active
99 unknown/manual
0 new-protocol reservations
```

one new explicit-stage row may still be admitted.

After creation:

```text
active = 100
unknown = 99
reserved = 1
manualLiability = 100
```

A further new admission is blocked.

This preserves the accepted `99 + 99 remains admissible` boundary while ensuring the newly admitted row can later become unknown without requiring another capacity slot.

## 5. New-protocol transition to unknown consumes its reservation

When a reserved new row becomes `unknown/manual-resolution`:

```text
reserved -= 1
unknown += 1
```

Therefore:

```text
unknown + reserved
```

remains unchanged.

No capacity write is required beyond the existing row transition, and the factual transition cannot be rejected merely because unknown count is now at the budget boundary.

## 6. Historical transition can create grandfathered overage

A pre-stage active row may become unknown after upgrade.

Because it did not reserve a future slot, this can temporarily produce:

```text
unknown + reserved > 100
```

Safe behavior:

- commit the truthful unknown/manual transition;
- preserve every row;
- fail new irreversible local admissions until the liability falls back under budget;
- never delete an older unknown row just to restore the counter.

This is rollout debt from the old protocol, not new unbounded growth.

## 7. Terminal transition releases a new-protocol reservation

If a new prepared/admitted row reaches a proven terminal state instead of manual uncertainty, its reservation is released.

Examples under P0-072:

- reset wins before `download-start` admission -> `cancelled-before-start`;
- actual start Promise rejection where the Chrome API contract proves terminal start failure;
- exact `complete/interrupted` factual settlement after reset.

Terminal-retention policy remains separately bounded and may compact older proven terminal evidence.

## 8. Reset does not consume another reservation for an existing row

Reset only changes authority/classification of an already represented row.

For a new-protocol local row:

- prepared -> cancelled-before-start/terminal releases reservation;
- admitted -> detached/reconciling keeps reservation;
- later unknown consumes the same reservation;
- later terminal releases it.

For a legacy row, reset preserves the grandfathered status and never fabricates a reservation history that did not exist.

## 9. Preservation envelope vs new-admission budget

These are different concepts.

### Preservation envelope

The runtime must preserve already valid/possible historical state, including old combinations that can exceed the future reservation target.

For local downloads the old protocol could physically contain up to 100 active + 100 unknown rows. P0-072 must not delete or fail factual transitions solely because that historical combination exists.

### New-admission budget

Only new explicit-stage operations are required to reserve future manual capacity.

This prevents P0-072 from regressing old accepted states while making the new protocol strictly safer.

## 10. Remote-store analogue

The same rollout pattern should be applied conceptually to `pendingRemoteSaves`:

- old rows without explicit v1 upload/publish stage state are grandfathered under existing active/stale behavior;
- new v1 staged rows reserve future unresolved/manual liability while their external stage remains prepared/admitted;
- a factual transition of an old row may create grandfathered overage but is never rejected/deleted;
- new remote mutation admission stops while reserved+manual unresolved liability is over budget.

Exact remote caps/cleanup must remain compatible with existing `MAX_PENDING_REMOTE_SAVES` and stale-history behavior and do not close P0-073/P0-074/P1-090.

## 11. Deterministic model

Added:

`project_tools/test_p0_072_rollout_liability_reservation_model.js`

Local Node result before durable write:

```text
P0-072 rollout liability reservation model: PASS
```

Covered controls:

1. P0-039 `99 active + 99 unknown` still permits one new local row;
2. that new v1 row consumes the final future-manual reservation;
3. v1 admitted -> unknown converts reservation into manual occupancy without increasing total manual liability;
4. a legacy row may truthfully create grandfathered overage;
5. grandfathered overage blocks new admission but does not erase/reject evidence;
6. terminal v1 transition releases reservation.

The model is architecture evidence, not runtime PASS.

## 12. Acceptance additions

Runtime tests must prove:

- P0-039 accepted 99+99 boundary remains green;
- new v1 local rows reserve future-manual capacity;
- unknown transition of a reserved v1 row never needs another slot;
- legacy/pre-stage unknown transition is never rejected if it creates temporary grandfathered overage;
- grandfathered overage blocks only **new** irreversible admission;
- reset prepared->terminal releases reservation; admitted->detached keeps it;
- P0-039 remains DONE and its deterministic test is rerun unchanged.

## 13. Status

This checkpoint supersedes only the overly broad interpretation that one new shared unresolved cap can replace historical local active/unknown capacity semantics.

The retained rule is:

> **preserve historical states; reserve future manual liability for new explicit-stage work; never make a factual transition depend on finding a new slot after the external operation was already admitted.**

**P0-072 remains ACTIVE.** Runtime/manifest remain unchanged. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/GitHub Release is claimed.
