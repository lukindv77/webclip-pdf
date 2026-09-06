# P0-076 — fresh UI CAS vs admitted external-effect receipt settlement — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-076-journal-generation-cas-2026-09-06 @ 2f669ced77afdcecf8e5208e77bd2d7aa0e392df`  
Deterministic model commit: `76be19137293208a1fd3b1a514264b3dc5aae1d7`  
Owners: **P0-076 ACTIVE**, with P0-072/P1-183/P1-090 dependencies for external-effect receipts and remote settlement.

This checkpoint refines how exact per-entry revision authority composes with a durable external-effect receipt. Runtime/manifest remain unchanged.

## 1. Why one authority rule is insufficient

There are two materially different mutation moments:

1. a **fresh user/UI mutation admission** based on a rendered Journal row;
2. a **late local settlement** of an external effect that was already durably admitted earlier.

The first must reject any stale rendered state. The second must not repeat the external effect merely because unrelated local Journal data changed while the effect was in flight.

Using the same old rendered `entryRevision` for both moments would create a bad choice:

- accept stale revision -> risk mutating a replacement row;
- reject stale revision and retry whole operation -> risk duplicating the already admitted non-cancellable external effect.

The correct composition is to replace UI authority with worker-issued receipt authority once the effect is durably admitted.

## 2. Fresh admission still requires exact CAS

Before a user-driven point mutation or before preparing/admitting an external-effect receipt, require exact current authority:

```text
journalGeneration
entryGeneration
entryRevision
```

For legacy rows, use the previously defined same-transaction legacy bridge.

If any component is stale, do not create/admit the external-effect receipt and do not start the remote/browser mutation.

This applies to the beginning of Mark Read and future Delete→Trash durable-receipt admission.

## 3. Durable receipt becomes the continuation authority

Once a worker-issued receipt is atomically prepared/admitted from a successful exact CAS, the receipt stores immutable local linkage such as:

```text
journalGeneration
entryId
entryGeneration
operationId/effectId
admitted phase
```

It may also retain the admitted or post-checkpoint entry revision for diagnostics/strict intermediate transitions, but the old rendered revision is no longer the sole authority for factual settlement.

The receipt is local/nonportable and subject to the P0-072 reset barrier.

## 4. External mutation admission remains one-shot

The external-effect phase transition remains:

```text
prepared -> effect-admitted
```

Only a transaction that changes `prepared` to `effect-admitted` returns `permitMutation = true`.

A later call that sees `effect-admitted`, `verified`, reset-detached or another non-prepared state never permits repeating the physical move/upload/download/publish operation.

Thus a local CAS conflict after physical admission routes to reconciliation, not to another remote mutation.

## 5. Receipt-owned local settlement may preserve unrelated newer fields

After the physical effect is admitted/observed, a receipt-settlement transaction may update the same admitted entry incarnation when all are true:

- receipt is worker-issued and in the expected admitted/factual phase;
- receipt has no reset barrier;
- current Journal generation equals the receipt Journal generation;
- current textual id still has the same `entryGeneration`;
- operation-specific lineage has not been superseded (for Mark Read, the current checkpoint/operation marker still belongs to this receipt);
- the settlement patch is bounded to receipt-owned fields.

The transaction re-reads the **current** entry, merges only those receipt-owned fields, preserves unrelated fields such as comments, increments the current local revision, and commits.

This is not permission for a stale UI patch. It is settlement of an already admitted operation receipt.

## 6. Mark Read consequence

Current Mark Read writes a local `readMove*` checkpoint, performs `/resources/move`, then writes final `readingMode/remotePath/...` fields.

Target direction:

1. UI sends exact rendered mutation authority;
2. one authoritative transaction validates it, prepares worker-issued move receipt and writes the local operation checkpoint;
3. that local write advances the entry revision and returns/stores the continuation authority;
4. receipt admission CAS authorizes the move exactly once;
5. after move verification, settlement uses the receipt + same `journalGeneration` + same `entryGeneration` + same operation lineage;
6. it merges final read/move fields into the current row and preserves unrelated later comments;
7. reset-detached or replacement generation -> no Journal mutation.

If another operation superseded the same Mark Read lineage, the old receipt cannot overwrite it merely because the entry incarnation is the same.

## 7. Delete→Trash consequence

Delete→Trash still requires P1-183's durable exact pre-move receipt before the Yandex move.

P0-076 contribution is:

- exact rendered authority must be validated when that receipt is admitted;
- receipt binds the delete operation to the exact entry incarnation;
- after the remote move, local deletion/factual reconciliation must use that durable receipt rather than retrying the move because the original UI revision became stale;
- same-id replacement after clear/import/recreate must not be deleted.

The exact remote-object proof remains P1-090/P1-183 and is not solved here.

## 8. Reset remains stronger than receipt settlement

P0-072 reset detachment is checked before payload/settlement logic.

If clear/import wins after effect admission:

```text
receipt.resetDisposition present -> no Journal finalization
```

Even if the same textual id exists again, the old receipt cannot patch/delete it.

A bulk Journal-generation mismatch is an additional P0-076 negative control.

## 9. Same-id reincarnation remains blocked

If entry `A` is deleted and another local entry with id `A` appears without a bulk generation rotation, the fresh entry still receives a distinct `entryGeneration`.

Receipt settlement compares that immutable incarnation token and fails closed on mismatch.

Therefore same textual id and even matching operation-looking fields are insufficient.

## 10. Unrelated point mutation is not a duplicate-effect trigger

Example schedule proven by the model:

```text
A revision 1
-> Mark Read admission writes receipt/checkpoint, A revision 2
-> remote move admitted once
-> user adds comment, A revision 3
-> old UI revision 2 is stale
-> receipt settlement re-reads A generation unchanged
-> merges only move/read fields, preserving new comment
-> A revision 4
```

The remote move is not repeated.

This is the main liveness benefit of separating fresh UI CAS from admitted receipt settlement.

## 11. Deterministic model

Added:

`project_tools/test_p0_076_receipt_settlement_authority_model.js`

Local Node result before durable write:

```text
P0-076 receipt settlement authority model: PASS
```

Controls:

1. exact fresh admission succeeds once;
2. second admission attempt after `effect-admitted` has `permitMutation=false`;
3. unrelated comment advances entry revision and makes the old UI token stale;
4. receipt settlement still updates the same admitted incarnation and preserves that comment;
5. reset detachment blocks late settlement;
6. same-id replacement with a different entry generation blocks settlement.

Architecture/model evidence only; runtime remains RED.

## 12. Source-level acceptance direction

Future P0-076/P0-072 integration tests should require:

- Journal mutation messages carry exact rendered authority for fresh UI commands;
- Mark Read receipt creation validates that authority transactionally;
- the receipt stores exact local Journal/entry generation linkage;
- `prepared -> effect-admitted` is the only move-permitting transition;
- later finalization does not call the external move again on stale local state;
- receipt settlement re-reads current row and modifies only operation-owned fields;
- unrelated newer comments survive;
- reset/replacement/superseded operation prevent local settlement;
- same-id replacement is an explicit negative control.

## 13. Status / next research boundary

P0-076 remains **ACTIVE**.

Next block: complete token propagation for the synchronous comment paths and the Journal view/read surfaces, including exact machine outcomes (`stale-generation`, `stale-entry`, `missing`, `committed`) and one source-bound RED gate covering raw export leakage, id-only mutation messages, split `[entries]` view transactions and blind `updateJournalEntryRecord`/delete helpers.

Runtime/manifest unchanged; manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/GitHub Release is claimed.
