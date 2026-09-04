# P0-072 — destructive-path legacy snapshot / no ordinary pre-migrate — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 327cf76fd7d264efc4f7c68d1d527f5ed53fbd6a`  
Deterministic model commit: `5b36166271bc5d08ddf0f1f30a426a32b530495e`  
Owner: **P0-072 ACTIVE**.

This checkpoint refines the destructive-path treatment of the legacy Chrome Storage queue after the atomic-reset execution model. Runtime remains unchanged.

## 1. Fresh source fact — clear/import currently call ordinary migration first

Current `clearJournalEntries()` and `commitStagedJournalImport()` both execute:

```text
await migrateLegacyPendingJournalAppends()
```

before opening their authoritative destructive IndexedDB transaction.

The ordinary migration:

1. reads `chrome.storage.local.webclipPendingJournalAppends`;
2. normalizes the bounded legacy list;
3. opens a separate `pendingAppends` readwrite transaction;
4. performs whole-record `pending.put(item)` for each legacy item;
5. only after that transaction commits, separately removes the Chrome Storage key.

Therefore the destructive operation currently performs a committed recovery-state mutation before the Journal clear/import transaction even begins.

## 2. Why ordinary pre-migrate is no longer the right destructive prerequisite

The earlier P0-072 design treated pre-migration as a positive control because it tries to make hidden rows visible before reset.

After the later legacy-fence and atomic-capacity research, a stronger structure is available:

- destructive path needs a **read-only bounded snapshot** of the legacy source;
- reset transaction itself can materialize/quarantine the relevant hidden rows;
- ordinary maintenance migration remains responsible for non-destructive recovery outside reset.

Keeping ordinary pre-migrate adds avoidable problems.

### Problem A — preprocessing commits even if reset later aborts

If ordinary migration succeeds and the later clear/import transaction fails:

- Journal remains unchanged;
- legacy recovery state has already moved from Chrome Storage to IndexedDB;
- the destructive operation was not one atomic state transition.

This is not necessarily data loss, but it creates an unnecessary pre-commit side effect and makes reset reasoning harder.

### Problem B — whole-record migration writer can race quarantine

Current migration performs ordinary `pending.put(item)`.

P0-072 already requires writer fencing because a stale migration/whole-record writer must not overwrite a current reset disposition.

Calling that writer as a destructive prerequisite creates extra race surface immediately before the reset that is supposed to establish the barrier.

### Problem C — ordinary active semantics are wrong for reset-targeted hidden rows

A hidden row that the reset scope targets should become detached/manual authority.

Running it through ordinary migration first temporarily materializes it as active replay work.

The reset can then quarantine it, but that intermediate authority is unnecessary and may interact with concurrent recovery.

## 3. Replacement: dedicated bounded legacy snapshot reader

Destructive paths should use a helper conceptually like:

```text
readLegacyPendingJournalSnapshotBounded()
```

It must:

- perform only the bounded `chrome.storage.local.get`;
- validate the existing legacy count and serialized-size limits;
- normalize rows into the same safe internal shape used by migration;
- return the normalized snapshot;
- perform **no IndexedDB writes**;
- perform **no Chrome Storage remove**.

If the storage read fails/times out or the source exceeds its established bounds, clear/import fails closed before opening its destructive transaction.

Do not treat timeout as an empty legacy queue.

## 4. Destructive transaction owns target legacy materialization

Inside the authoritative reset transaction:

For each legacy snapshot row:

### `match`

- read current `pendingAppends[id]`;
- if absent, materialize the normalized row directly as reset-detached/manual;
- if present, merge against current durable row without overwriting a prior reset disposition;
- write the migration-only fence for the legacy id;
- include the row in reset capacity accounting.

### `indeterminate`

Same as `match`, but outcome becomes unknown/manual rather than pretending a definite scope match.

### `nonmatch`

For a scoped reset, do **not** fence/materialize merely because the row exists in the legacy source.

The row can remain hidden and later ordinary migration may materialize it as current active work because the reset proved it belongs outside the cleared scope.

This avoids making an unrelated pending row consume capacity solely because another URL/site was cleared.

For clear-all/import-replace, every legacy row is naturally `match`.

## 5. Why the migration fence remains necessary

Even when the destructive transaction immediately materializes a matching/indeterminate legacy row, the fence remains useful because a concurrent migration may already hold a stale in-memory snapshot.

After reset commit:

- late migration sees current detached `pendingAppends[id]` and must not overwrite it;
- if the row is unexpectedly missing, the fence still tells migration to materialize it detached rather than active;
- failed/timed-out post-reset removal of the Chrome Storage key cannot reactivate old authority.

The fence is therefore an anti-rematerialization barrier, not a deferred-capacity placeholder.

## 6. Scoped reset must not blindly remove the whole legacy storage key

A scoped reset may see a legacy snapshot containing both targeted and definite nonmatching rows.

If the destructive transaction materializes only targeted/indeterminate rows, removing the entire Chrome Storage key afterwards would delete the only source of the definite nonmatch rows.

Therefore:

- URL/site clear should normally leave the legacy storage array in place after commit; migration fencing prevents targeted ids from reactivating;
- optional future selective storage rewrite would require its own generation/late-settlement contract and is not needed for P0-072 closure;
- clear-all/import-replace may best-effort remove the whole legacy key after commit because every old row has already been materialized detached/fenced.

Even for full reset, failed removal is safe because repeat migration is fenced.

## 7. Migration-first ordering remains safe

If ordinary migration commits before the destructive reset transaction:

1. the row is already present in `pendingAppends`;
2. reset transaction sees it;
3. reset applies the current in-place quarantine rules;
4. hidden-snapshot processing sees the same id and merges/fences rather than creating a duplicate.

If reset wins first:

1. the reset transaction materializes/fences the target hidden row;
2. stale migration executes later;
3. writer fencing/current-row check prevents overwrite/reactivation.

Thus both transaction orderings converge.

## 8. Same-id hidden/current mismatch is not resolved by last writer wins

Current ordinary migration's whole-record `put()` semantics are incompatible with a reset barrier if current and hidden snapshots disagree.

Destructive merge rule remains:

```text
same legacy id + conflicting current/hidden operation/scope facts -> indeterminate/manual
```

A stale hidden snapshot never replaces a newer/current reset-disposition row.

Ordinary migration after P0-072 must likewise stop using unconditional whole-record overwrite as authority when a current row already exists.

## 9. Interaction with active capacity

Leaving scoped definite nonmatches hidden is deliberate.

It avoids requiring the reset to reserve ordinary active capacity for work that is outside the user's destructive scope.

Only `match/indeterminate` rows must consume detached/manual capacity inside the reset transaction.

Later ordinary migration of a definite nonmatch remains subject to its normal active-queue admission semantics.

This keeps P0-072's reset capacity envelope scoped rather than turning a URL clear into global pending-queue normalization.

## 10. Current migration writer needs a separate fenced contract

The ordinary maintenance `migrateLegacyPendingJournalAppends()` still remains valid outside destructive paths, but its transaction must be upgraded under the existing P0-072 writer-fence rules:

- transaction scope includes `pendingAppends + meta`;
- current row is read before put;
- existing reset disposition wins over stale legacy snapshot;
- matching migration fence forces detached/manual materialization;
- same-id operation/scope conflict fails closed/manual rather than last-write-wins;
- repeated migration after Chrome Storage remove timeout remains idempotent;
- normal future current writers are not globally poisoned by migration-only fences.

This is part of the first runtime tranche, not a new owner.

## 11. Deterministic model

Added:

`project_tools/test_p0_072_destructive_legacy_snapshot_model.js`

Local Node result before durable write:

```text
P0-072 destructive legacy snapshot model: PASS
```

Durable model commit:

`5b36166271bc5d08ddf0f1f30a426a32b530495e`

Covered controls:

1. destructive path can use a read-only legacy snapshot without mutating IDB before reset;
2. scoped matching hidden row is materialized detached;
3. scoped definite nonmatch receives no fence/materialization and may migrate later as active;
4. late migration cannot overwrite/reactivate a detached row;
5. migration-first then reset still converges to one detached row;
6. clear-all can safely tolerate failed legacy-key removal because repeated migration remains fenced.

This is architecture/model evidence, not runtime PASS.

## 12. Source-level implementation consequences

The first runtime tranche should introduce a pure/read-only legacy snapshot helper and change destructive call sites approximately as follows:

### Current

```text
clear/import
 -> await migrateLegacyPendingJournalAppends()
 -> destructive IDB transaction
```

### Target

```text
clear/import
 -> await readLegacyPendingJournalSnapshotBounded()
 -> one destructive IDB transaction:
      current pending quarantine
      hidden target materialization
      legacy fences
      capacity checks
      Journal clear/replace
 -> optional post-commit whole-key removal only when every legacy row was included (all/import)
```

Ordinary maintenance recovery keeps:

```text
recoverPendingJournalAppends()
 -> fenced migrateLegacyPendingJournalAppends()
 -> replay only current active rows
```

## 13. New direct acceptance cases

Add to P0-072 runtime/source tests:

- `clearJournalEntries()` no longer invokes ordinary mutating legacy migration as its prerequisite;
- `commitStagedJournalImport()` no longer invokes ordinary mutating legacy migration as its prerequisite;
- destructive legacy snapshot helper performs no IDB/storage mutation;
- legacy read timeout/overflow rejects reset before IDB mutation;
- scoped target legacy row is detached/fenced inside reset transaction;
- scoped definite nonmatch is not consumed or deleted by reset;
- scoped reset does not blindly remove mixed legacy storage array after commit;
- full clear/import may remove whole legacy key only after all legacy rows have durable detached/fenced representation;
- failed full-reset legacy-key removal followed by repeated migration cannot reactivate rows;
- ordinary migration current-row check prevents whole-record overwrite of reset disposition.

## 14. Owner boundaries

This remains P0-072 because it addresses recovery authority crossing a destructive Journal generation boundary.

It does not close:

- P0-076 Journal-generation CAS;
- P1-146 Chrome download actual settlement;
- P1-043 global storage reservation;
- P0-066/P1-216 final URL identity/sanitization;
- P1-210 user-facing manual reconciliation.

No new P-code is allocated.

## 15. Status

The earlier statement “clear/import first migrate the legacy queue, then quarantine it” is superseded for the destructive path.

The target is now:

> **read legacy source, do not mutate it; make the destructive IndexedDB transaction itself own the target legacy materialization/quarantine/fence.**

Ordinary migration remains for maintenance/recovery and must become fence-aware.

**P0-072 remains ACTIVE.** Runtime/manifest remain unchanged. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/GitHub Release is claimed.
