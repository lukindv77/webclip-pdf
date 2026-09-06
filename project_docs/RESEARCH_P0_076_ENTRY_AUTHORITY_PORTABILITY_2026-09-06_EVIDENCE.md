# P0-076 — per-entry incarnation/revision and portable-boundary contract — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-076-journal-generation-cas-2026-09-06 @ 47cb9f297bd00a754b2d30cbfb870b99b8df6380`  
Deterministic model commit: `ff81ded37b84d5341e08bf1e903feca087037f2d`  
Owner: **P0-076 ACTIVE**.

This checkpoint refines the first P0-076 two-level CAS model after source-wide single-entry mutation and import/export review. Runtime/manifest remain unchanged.

## 1. Current single-entry mutation surface

Current worker single-entry user mutation commands are:

- Journal Delete;
- Update/Add/Edit/Delete Comment;
- Mark Read (`ReadmeLater -> Upload`).

All of those commands identify the target Journal row by textual `entry.id` today. No rendered per-entry revision token is supplied by `journal.js`.

`updateJournalEntryRecord(id, patch)` reads the current row and blindly merges a caller-prepared patch. Comment handlers often read/construct comment arrays before that update transaction. Delete reads the entry before a later key-only delete transaction. Mark Read performs several asynchronous remote/read/checkpoint/finalization stages with repeated `updateJournalEntryRecord(id, ...)` calls.

Bulk clear/import are a different class: they replace/delete a Journal generation and already mutate the global Journal revision.

## 2. Why a single mutable per-entry token is not the cleanest model

The preceding P0-076 model used a strong opaque `entryRevision` token together with a Journal generation.

That is safe for stale-write rejection if the token is regenerated on every mutation, but it conflates two different facts:

1. whether textual id `A` still denotes the same local entry incarnation;
2. whether that incarnation is still at the exact state revision observed by the caller.

Keeping those facts separate gives better recovery and rollout semantics, especially for:

- same-id delete/recreate;
- multi-stage Mark Read settlement;
- lazy modernization of legacy entries;
- very large imports where an incrementing revision is cheaper than repeated random generation on every point mutation.

## 3. Selected local-only per-entry persisted shape

Use one local-only field inside each modern Journal entry:

```text
journalLocalRevision = {
  version: 1,
  generation: '<worker-issued UUID-v4>',
  revision: <positive safe integer>
}
```

Semantics:

- `generation` identifies one local incarnation of that textual Journal id;
- `revision` identifies one exact committed state of that incarnation;
- new local entry incarnation -> fresh strong UUID + `revision = 1`;
- successful point mutation -> same generation, `revision += 1`;
- delete/recreate same textual id -> fresh generation, revision restarts at 1;
- malformed/unsupported local revision metadata is fail-closed mutation authority, not legacy.

`revision` overflow is not silently wrapped. A corrupt/maxed value must fail closed or go through an explicit future versioned repair; practical normal operation cannot approach the safe-integer limit.

No `Math.random()` fallback is permitted for new P0-076 generation identifiers.

## 4. Global bulk-generation token remains separate

Keep one exact local meta key conceptually:

```text
journalMutationGeneration:v1 -> <worker-issued UUID-v4>
```

It represents the currently admitted Journal bulk generation.

Rotate it atomically in destructive bulk transactions (clear/replace/import). Point mutations of one entry do not rotate this global generation.

Mutation authority for a modern row is therefore the tuple:

```text
{
  journalGeneration,
  entryGeneration,
  entryRevision
}
```

This avoids coupling modern entry A to an unrelated point mutation of entry B while still invalidating pre-bulk authorities.

## 5. Legacy rollout bridge

Existing rows have no `journalLocalRevision`.

For them, a rendered mutation authority may temporarily use:

```text
{
  kind: 'legacy',
  journalGeneration: <current value or explicit missing state>,
  legacyDbRevision: <exact IDB meta revision observed with the row>
}
```

The row and both meta values must be observed in the **same readonly `[entries, meta]` transaction**. Split transactions are invalid because they can create a mixed old-entry/new-revision authority.

On the first successful CAS mutation of a legacy row:

- verify generation + legacy DB revision inside one readwrite transaction;
- perform the mutation;
- install fresh `journalLocalRevision` with revision 1;
- update ordinary DB revision;
- return modern authority to the caller.

Thus conservative global invalidation exists only for legacy rollout rows; it disappears lazily after their first successful mutation.

If `journalMutationGeneration:v1` is absent on an old database, the rendered authority records that absence. A mutation may create the first generation in the same readwrite transaction only if it is still absent when checked. If a bulk mutation won first and created/rotated the generation, the legacy action becomes stale.

## 6. Export is currently raw enough to leak a local token

Current export batching serializes conceptually:

```text
JSON.stringify({ ...entry, journalComments: normalizeJournalComments(entry) })
```

Therefore adding `journalLocalRevision` to the entry without changing export would automatically make local mutation authority portable.

That is not acceptable.

Introduce an explicit portable serializer, conceptually:

```text
makePortableJournalEntry(entry)
```

which normalizes portable fields/comments and removes local authority before JSON serialization.

At minimum `journalLocalRevision` is never exported. The serializer should be the explicit boundary so a future local-only entry field does not silently become portable through another raw spread.

## 7. Import must never trust supplied local authority

Current `normalizeImportedJournalEntry()` already reconstructs a bounded whitelist of known portable fields rather than spreading the raw backup object. That is a positive control.

P0-076 requires an explicit regression:

- a backup containing `journalLocalRevision`, `entryGeneration`, `entryRevision` or similarly named authority fields cannot install those values;
- normalized/staged imported entries receive fresh local authority generated by the worker;
- imported same-id rows are new local incarnations even when the portable logical content is byte-identical to an older local row;
- import-replace rotates `journalMutationGeneration:v1` in the same authoritative transaction that replaces the Journal.

Fresh local per-entry generation can be assigned during bounded staging/normalization rather than inside the large commit transaction, because staging is local/nonportable and the commit is still bound to the import lease/revision. The raw backup never chooses the token.

## 8. New-entry creation must also be generation-bound

`appendJournalEntry()` is a creation path, not a point mutation.

For a fresh creation:

- assign fresh `journalLocalRevision = {version:1,generation:uuid,revision:1}`;
- preserve existing-id behavior as an exact existing-row result rather than overwrite;
- when the append is continuation of an earlier operation/checkpoint, compare that operation's **expected Journal generation** before creating the row.

This last rule is the P0-072/P0-076 integration point discovered during the P0-072 closure sweep.

Schedule:

```text
operation O admitted under Journal generation G1
-> no Journal row exists yet
-> clear/import rotates generation to G2
-> O settles late and tries to create its Journal row
```

Without expected-generation comparison, there was no P0-072 row to quarantine at reset time and O could create stale logical state after the reset.

With P0-076 generation authority:

```text
expected G1 != current G2 -> suppress/reject Journal creation
```

Physical side-effect truth remains with the relevant durable receipt owner; Journal is not resurrected.

New operations admitted under G2 may create entries normally.

## 9. Pending/recovery integration consequence

Any durable checkpoint whose later settlement may create a Journal entry must carry the exact expected Journal generation supplied by P0-076 once that mechanism exists.

This includes the P0-072 pending families where applicable:

- pending Journal append;
- pending local download;
- pending remote save;
- later external-effect receipts such as ReadLater move.

P0-072 still owns reset detachment and factual side-effect reconciliation. P0-076 owns the generation token used to prove whether logical Journal creation/finalization is still current.

Do not derive expected generation from textual id, URL, timestamps, operationId, remote path or imported `readMove*` projection.

## 10. Point-mutation CAS API direction

A future runtime seam should be explicit rather than continuing blind `updateJournalEntryRecord(id, patch)`:

```text
mutateJournalEntryCas(id, expectedAuthority, mutator)
deleteJournalEntryCas(id, expectedAuthority)
```

Within one `[entries, meta]` readwrite transaction:

1. read current Journal generation;
2. read exact current entry;
3. for legacy expected authority, read current DB revision in that same transaction;
4. validate the expected authority;
5. compute mutation from the transaction-current row, not an earlier stale full-row snapshot;
6. put/delete;
7. rotate/increment local revision when appropriate;
8. touch ordinary DB revision;
9. publish the new authority only after transaction commit.

A stale result is a machine-classified outcome, not permission to retry a non-cancellable external side effect.

## 11. Deterministic model

Added:

`project_tools/test_p0_076_entry_authority_portability_model.js`

Local Node result before durable write:

```text
P0-076 entry authority/portability model: PASS
```

Controls:

1. unrelated modern entry B mutation does not invalidate A;
2. stale same-entry revision is rejected;
3. first legacy mutation installs modern local authority;
4. bulk generation rotation invalidates pre-bulk authority;
5. same-id delete/recreate gets a distinct entry incarnation;
6. portable export strips local authority;
7. imported forged local authority is ignored and replaced locally;
8. operation admitted under old Journal generation cannot create a late row after bulk rotation;
9. fresh operation under current generation can create normally.

Architecture/model evidence only; runtime remains RED.

## 12. Owner boundaries

This remains **P0-076**.

It does not close:

- P0-072 reset-detached side-effect reconciliation;
- P1-183 Delete→Trash pre-move receipt;
- P1-090 exact remote-object reconciliation;
- P0-073/P0-074 remote account/root/context identity;
- P1-086 readonly IndexedDB publish-on-commit semantics;
- P2-019 shared IndexedDB schema/migration ownership.

No schema version bump is required for the selected local fields/meta key.

## 13. Status / next research boundary

P0-076 remains **ACTIVE**.

Next block: multi-stage token propagation for Mark Read and Delete, plus source-bound acceptance for comment mutations. Specifically prove that each successful local checkpoint returns the next authority, late external settlement never reuses an older authority, and a stale local CAS cannot trigger a duplicate remote mutation.

Runtime/manifest unchanged; manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/GitHub Release is claimed.
