# P0-076 — local external-effect entry lock for Mark Read / Delete→Trash — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch: `research/p0-076-journal-generation-cas-2026-09-06`  
Deterministic model commit: `302ae37076f70c2935f0432324bf8c7745e7565f`  
Owners: **P0-076 ACTIVE**, with **P0-072 ACTIVE** and **P1-183/P1-090** dependencies.

This checkpoint resolves a concurrency gap between exact point-mutation CAS and long-running external-effect operations on the same Journal entry. Runtime/manifest remain unchanged.

## 1. Gap found after receipt-settlement modeling

For Mark Read, an admitted remote move can later merge its operation-owned fields into the same entry incarnation while preserving unrelated newer comments.

Delete→Trash is different: successful local settlement removes the entire entry. If another window adds a comment after Trash admission but before local delete settlement, one of two bad outcomes occurs without additional coordination:

- receipt settlement deletes the entry and silently loses a newer committed comment; or
- settlement refuses because revision changed, leaving the remote move completed/unknown while the logical delete cannot converge without special handling.

A stale UI revision alone cannot solve this after the remote effect is already admitted, because retrying the whole external operation risks duplicate move.

## 2. Selected local-only entry lock

Add one local-only persisted operational field for entry-level external effects:

```text
journalExternalEffectLock = {
  version: 1,
  kind: 'mark-read' | 'delete-trash',
  effectId: '<worker-issued UUID-v4>'
}
```

Properties:

- created atomically with the trusted external-effect receipt after exact fresh UI CAS;
- local/nonportable;
- not imported from backup;
- not exported;
- not a substitute for the receipt;
- contains no URL/path/account/object identity;
- the receipt remains the factual external-effect authority;
- the lock only coordinates which fresh Journal mutations may be admitted against this entry while the receipt is live.

No wall-clock field is needed for correctness.

## 3. Strict parsing / fail-closed behavior

Field absence means no current external-effect lock.

Present malformed/null/future-version lock is indeterminate and blocks fresh mutation rather than being treated as absent.

Only exact supported v1 may apply the compatibility matrix below.

A future incompatible lock schema bumps body version; local authority must not be silently normalized from unknown bytes.

## 4. Compatibility matrix

### No lock

Ordinary exact-CAS point mutation may proceed.

### `kind = mark-read`

Allowed fresh mutation:

```text
comment add/edit/delete/update
```

Blocked fresh mutations:

```text
another Mark Read
local/keep delete
delete-trash admission
other whole-entry/destructive mutation
```

Reason: comments can be preserved by receipt settlement; competing entry/file lifecycle operations cannot safely overlap the admitted move.

### `kind = delete-trash`

All ordinary fresh entry mutations are blocked while the delete receipt remains live/unresolved.

Reason: the already authorized operation intends to delete the complete Journal entry. Allowing new comments or another Mark Read after admission would create state that final delete necessarily discards or conflicts with.

Receipt settlement / explicit receipt-owned reconciliation is not an “ordinary fresh mutation” and may proceed only when effectId/incarnation/generation checks succeed.

## 5. Mark Read admission

After exact rendered authority validates:

1. create trusted move receipt;
2. attach `journalExternalEffectLock={kind:'mark-read',effectId}` to the exact current entry;
3. optionally update portable diagnostic `readMove*` projection;
4. advance entry revision;
5. commit;
6. receipt `prepared -> effect-admitted` CAS is the only permission to transmit `/resources/move`.

The lock is a local pointer to trusted receipt lineage. Portable `readMoveOperationId` remains diagnostic/projection and is not the lock.

## 6. Mark Read settlement

After verified move, settlement requires:

- trusted receipt in expected phase;
- no reset barrier;
- same Journal generation;
- same entry generation;
- current lock `kind='mark-read'` with the same effectId.

It then re-reads the current entry, preserves compatible newer fields such as comments, writes operation-owned read/move fields, removes the lock, increments current entry revision and commits.

If receipt becomes unknown/manual after admitted move, lock remains until factual/manual reconciliation resolves the entry operation. Age alone does not clear it.

A pre-start terminal failure may clear the lock through exact receipt-owned settlement because no external effect was admitted.

## 7. Delete→Trash admission

P1-183 still owns the exact durable pre-move receipt and P1-090 exact remote object proof.

When that receipt exists, P0-076 requires its admission transaction to also attach:

```text
journalExternalEffectLock={kind:'delete-trash',effectId}
```

under exact current Journal/entry authority.

After commit:

- comments are blocked;
- Mark Read is blocked;
- local/keep delete from another ordinary stale card is blocked;
- another Trash operation is blocked.

Thus the admitted whole-entry delete intent owns the logical entry lifecycle until receipt settlement/manual override.

## 8. Delete settlement

After remote move is verified, local delete may complete from the trusted receipt without requiring the old UI entry revision, but only when:

- no reset barrier;
- current Journal generation equals receipt generation;
- current entry generation equals receipt entry generation;
- current local lock is exactly `delete-trash` with the same effectId.

Then the exact current entry can be deleted in one transaction and DB revision advanced.

Same textual id with a different entry generation survives.

## 9. “Delete only Journal entry” after remote error

Current UI offers an explicit fallback after Trash failure/unknown settlement.

Future safe semantics depend on P1-183 receipt phase:

- **pre-start rejected / proven no move admission**: receipt-owned settlement clears lock and returns fresh authority; user may perform normal local/keep delete;
- **move admitted but outcome unknown**: do not discard receipt simply to unlock the row. An explicit local-only abandonment must preserve the remote receipt as unresolved/manual while deleting/detaching local Journal authority;
- **move verified but local delete failed**: retry local receipt settlement only; never repeat remote move.

The fallback action must therefore compose with the existing delete receipt rather than create an unrelated operation that loses unknown remote truth.

Exact user-facing reconciliation UX remains P1-210/P1-183 scope.

## 10. Why a local lock is distinct from the receipt

The trusted receipt answers:

```text
what external effect was prepared/admitted/observed?
```

The local entry lock answers:

```text
which new Journal mutations are compatible with that live effect on this exact entry incarnation?
```

Keeping these roles separate avoids scanning the external-effect receipt namespace on every comment click while still preventing unsafe local concurrency.

The lock cannot authorize/replay the remote effect; only receipt phase CAS can.

## 11. Portable boundary

`journalExternalEffectLock` is local operational authority and must follow the same nonportable rules as `journalLocalRevision`:

- strip from full Journal export;
- ignore any backup-supplied field on import;
- do not expose raw lock in generic outbound entry projection;
- UI may receive a bounded derived busy state if needed, not the lock as mutation capability.

A reset/import-created replacement entry never inherits the old lock.

## 12. Scoped reset interaction

Matching scoped reset:

- P0-072 detaches receipt;
- matching Journal entry may be deleted by the reset;
- local lock disappears with the old entry and cannot authorize anything.

Definite nonmatching reset:

- receipt expected Journal generation is transactionally rebased under the scoped-reset rebase contract;
- entry remains the same incarnation with the same lock;
- factual operation may continue under the new global generation.

Indeterminate scope is detached/manual, never blindly rebased.

## 13. Deterministic model

Added:

`project_tools/test_p0_076_external_effect_entry_lock_model.js`

Local Node result before durable write:

```text
P0-076 external-effect entry lock model: PASS
```

Controls:

1. Mark Read admission installs a lock;
2. comment mutation remains allowed while Mark Read is in flight;
3. local delete/Trash admission is blocked during Mark Read;
4. Mark Read settlement preserves the comment and clears the lock;
5. Delete→Trash admission installs exclusive lock;
6. comment and Mark Read are blocked after delete admission;
7. verified delete settlement removes the exact entry;
8. same-id replacement with different entry generation survives an old delete receipt.

Architecture/model evidence only; runtime remains RED.

## 14. Acceptance matrix correction

Add `entry-busy` to point-mutation machine outcomes when a valid local external-effect lock disallows the requested mutation.

The core P0-076 acceptance matrix sections for Mark Read/Delete are refined:

- fresh UI CAS admission must atomically create the corresponding local lock with receipt preparation;
- receipt settlement checks exact lock effectId/kind in addition to generation/incarnation;
- malformed/future lock blocks fresh mutation;
- local lock is stripped from portable/outbound raw projections.

## 15. Owner boundaries

P0-076 owns local single-entry mutation coordination and exact entry incarnation/revision.

P0-072 owns trusted ReadLater receipt/reset detachment.

P1-183 owns Delete→Trash durable pre-move receipt; P1-090 owns exact remote-object reconciliation; P1-210 owns complete manual user reconciliation surface.

No new P-code is required.

## 16. Status

P0-076 remains **ACTIVE**. P0-072/P1-183/P1-090 dependencies remain as above.

Runtime/manifest unchanged; manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/GitHub Release is claimed.
