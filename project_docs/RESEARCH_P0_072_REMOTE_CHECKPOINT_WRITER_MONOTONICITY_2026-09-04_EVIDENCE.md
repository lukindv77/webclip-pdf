# P0-072 — remote checkpoint writer monotonicity — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 3985cfff8bc80d9639c8f92b12ba6a7b9214662b`  
Deterministic model commit: `dc2646283fcf3479c802ce3670333fb27b3cb4c2`  
Owner: **P0-072 ACTIVE**.

This checkpoint covers the existing whole-record behavior in `checkpointPendingRemoteSaveIntent()`. Runtime/manifest are unchanged.

## 1. Current source shape

When a row with the same id already exists, current code has three branches:

```text
remote-verified  -> {...existing, updatedAt, operationId: incoming || existing}
stale-unverified -> {...incomingItem, createdAt: now}
other active     -> {...incomingItem, createdAt: existing.createdAt}
```

The latter two branches replace the transaction-owned current row with a caller-built `item` and therefore can erase future reset/stage metadata. The stale branch also turns old unknown/manual history back into `prepared` semantics.

## 2. Stronger target contract

`checkpointPendingRemoteSaveIntent()` is a preparation writer, not a recovery-authority resurrection API.

For an existing row, current durable truth wins.

### Existing reset-detached row

Reject/return a structured `reset-detached` result without `put(incomingItem)`.

Checkpoint creation cannot erase or refresh the reset barrier and cannot restore Journal/external mutation authority.

### Existing `stale-unverified`

Do not replace it with a fresh `prepared` item.

A stale-unverified row means external outcome is not proven. Replacing it with `prepared` can both erase uncertainty and reset an already admitted external stage back to reusable permission.

Reactivation, if ever product-authorized, requires a dedicated generation/identity contract; it is not checkpoint idempotence.

### Existing same-operation active/verified row

Treat checkpoint creation as idempotent and preserve the current row, including current `externalStages` and immutable operation context.

In particular:

```text
upload=admitted + repeated checkpoint call
!= upload=prepared
```

Only the dedicated stage transition helper may change stage admission state.

### Existing different-operation row

Fail closed rather than overwrite the same key.

The exact general generation semantics remain P0-076/P0-074 territory; P0-072 only requires that its writer not destroy current reset/stage authority while those owners are still ACTIVE.

## 3. Why spread-preservation is not enough

Using `{...current, ...incoming}` would retain some unknown fields only if incoming does not overwrite them, but it still permits semantic regression of:

- `phase` from stale/verified to prepared;
- `externalStages.upload` from admitted to prepared;
- publication stage state;
- immutable operation context fields.

The preparation writer therefore needs explicit state-aware current-row handling, not a generic merge.

## 4. Legacy rollout

An existing legacy row with no `externalStages` remains legacy admission-unknown; checkpoint creation must not silently backfill it as fresh `prepared` if that row already represents an unresolved historical operation.

A new explicit v1 `prepared` stage is safe only when creating a genuinely absent row for the current operation.

This preserves the earlier rollout rule: missing stage metadata is never proof of pre-start state.

## 5. Interaction with factual transitions

Dedicated factual writers remain allowed to update a current row by re-reading and spreading current state, for example:

- `markPendingRemoteSaveVerified()`;
- failure/attempt counters;
- stale/manual transition;
- reset-detached factual outcome updates.

Those paths must preserve reset identity and cannot restore Journal authority, but they are semantically different from checkpoint creation.

## 6. Deterministic model

Added:

`project_tools/test_p0_072_remote_checkpoint_writer_monotonicity_model.js`

Local equivalent result before durable write:

```text
P0-072 remote checkpoint writer monotonicity model: PASS
```

Covered controls:

1. an absent row may create fresh explicit prepared stages;
2. repeated same-operation checkpoint cannot downgrade `admitted -> prepared`;
3. reset-detached current row wins unchanged;
4. stale-unverified history is not reactivated as prepared;
5. different-operation same-key writer fails closed rather than overwriting.

This is architecture/model evidence, not runtime PASS.

## 7. Runtime/source acceptance addition

Before P0-072 closure:

- `checkpointPendingRemoteSaveIntent()` re-reads the current row before any write;
- if current is reset-detached, no caller-built whole-record replacement occurs;
- existing explicit admitted/cancelled stage state is monotonic and cannot be reset by checkpoint preparation;
- existing legacy missing-stage row is not fabricated into fresh prepared certainty;
- `stale-unverified` cannot be reactivated by this helper;
- same-operation active/verified checkpoint use is idempotent/current-row preserving;
- different-operation same-key collision fails closed, while general generation resolution remains assigned to adjacent owners.

## 8. Owner boundaries

This does not close P0-074 immutable Yandex operation context, P0-076 Journal generation CAS, P0-073 account/root binding, P1-090 exact remote-object identity, P0-078 publication policy generation or P1-043 storage reservation.

No new P-code is allocated.

## 9. Status

P0-072 remains **ACTIVE**. Runtime and manifest remain unchanged. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/Release is claimed.
