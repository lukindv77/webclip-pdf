# P0-076 / P0-072 — scoped reset Journal-generation rebase contract — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-076-journal-generation-cas-2026-09-06`  
Deterministic model commit: `15b67050d7066f08505451f201e78c0173aa670d`  
Owners: **P0-076 ACTIVE** + **P0-072 ACTIVE**.

This checkpoint resolves a liveness/correctness tension found while applying one global Journal mutation generation to scoped URL/site clears. Runtime/manifest remain unchanged.

## 1. Problem with naive global generation rotation

P0-076 selected one local meta generation:

```text
journalMutationGeneration:v1
```

Rotating it on full clear/import is straightforward: every old operation belongs to the replaced Journal generation.

A scoped URL/site clear is different. Only matching old Journal/recovery authority should be detached. A durable operation for another exact URL/site may legitimately continue.

If scoped clear simply rotates the global generation from G1 to G2 and does nothing else, every durable nonmatching checkpoint still carries expected G1 and becomes stale. That would over-cancel unrelated saves/recovery and conflict with P0-072's exact scoped reset semantics.

Creating a permanent per-URL/per-site generation map would avoid that but introduces an unbounded namespace/GC problem and duplicates P0-072's already selected scope classifier.

## 2. Selected solution — rotate globally, transactionally rebase definite nonmatches

Keep one global generation and rotate it for every destructive clear/import boundary.

In the same authoritative reset transaction that P0-072 already uses to classify pending/receipt rows:

```text
old generation = G1
new generation = G2
```

For each durable old checkpoint/receipt:

```text
relation = match
  -> attach reset/quarantine barrier
  -> keep expected generation as historical G1
  -> do not rebase

relation = indeterminate
  -> attach manual/unresolved reset barrier
  -> keep G1
  -> do not rebase

relation = definite nonmatch
  -> preserve active/non-detached authority
  -> atomically change expectedJournalGeneration G1 -> G2
```

Then write `journalMutationGeneration:v1 = G2` and perform the scoped Journal mutation before committing the same transaction.

This makes global generation rotation compatible with scoped semantics without a per-scope meta ledger.

## 3. Why only the reset transaction may rebase

Generation rebase is not an ordinary writer operation.

A stale asynchronous checkpoint writer that captured G1 before reset must not later overwrite the transaction-owned G2 value.

Therefore every whole-record writer follows compare-before-put:

```text
read current row
-> current expected generation differs from caller snapshot?
-> caller is stale; preserve current row / fail closed
```

Only the authoritative reset transaction may advance a nonmatching row's expected Journal generation without creating a new operation.

This composes directly with P0-072's existing writer-fence contract.

## 4. Operation with no durable checkpoint cannot self-rebase

Consider an operation admitted in memory under G1 that has not yet created any durable checkpoint/receipt when scoped reset commits G2.

There is no persisted authority for reset to classify as a definite nonmatch, so it cannot safely be rebased.

Required rule:

```text
old in-memory expected G1 != current G2
-> fail closed before later durable checkpoint / external-effect admission / Journal creation
```

This is safe because a non-cancellable external effect must not have been admitted before its durable checkpoint. If such an effect was already admitted without durable authority, that is a separate defect in its admission owner.

The user may retry/restart the logical operation under G2.

## 5. Full clear/import never rebase old authority

For clear-all/import-replace every old row is a match by definition.

Therefore:

- generation rotates;
- all old durable authority is detached/quarantined according to P0-072;
- no old checkpoint is rebased to the new Journal generation.

A future operation created after commit receives G2 normally.

## 6. Existing Journal UI cards

Global rotation makes all already-rendered UI mutation authorities stale, including cards outside a scoped clear.

This is conservative but acceptable because the current product already uses a global Journal revision notification to reload open Journal views after any mutation. A user point mutation racing a scoped clear may receive `stale-journal-generation`, reload, and retry from fresh rendered authority.

This UI retry does not duplicate an already admitted external effect because external-effect continuation uses worker-issued receipt authority after admission.

## 7. Pending families requiring expected generation

Once P0-076 is implemented, any P0-072 durable row that may later finalize/create Journal state must preserve:

```text
expectedJournalGeneration
```

or equivalent exact token.

Scoped reset relation handling then becomes:

- matching/indeterminate rows -> detach, never rebase;
- definite nonmatch rows -> transaction-owned rebase to the new generation.

Relevant current/later families include pending Journal append, local download, remote save and external-effect receipts.

Do not update generation merely because textual URL/site happens to match a caller-supplied stale object; relation must be derived from the transaction-current durable row using the P0-072 scope rules.

## 8. Admission/reset linearization

This protocol preserves the existing P0-072 serialization model.

When stage/effect admission and reset both write the same pending/meta authority stores, IndexedDB serializes their overlapping readwrite transactions.

If admission wins first:

- reset sees the admitted current row;
- match -> detach admitted effect;
- definite nonmatch -> rebase current admitted receipt to G2 and allow its factual continuation.

If reset wins first:

- match -> later admission sees reset barrier and cannot start;
- definite nonmatch -> later admission sees rebased G2 and may proceed under current generation.

No stale caller snapshot grants rebase authority.

## 9. Deterministic model

Added:

`project_tools/test_p0_076_scoped_reset_generation_rebase_model.js`

Local Node result before durable write:

```text
P0-076/P0-072 scoped reset generation rebase model: PASS
```

Controls:

1. scoped matching row is detached;
2. definite nonmatch is atomically rebased G1 -> G2 and may continue;
3. indeterminate row is detached/manual rather than rebased;
4. stale pre-reset writer cannot overwrite the rebased generation;
5. pre-reset operation with no durable checkpoint cannot self-rebase;
6. full reset detaches all old authority and rebases none.

Architecture/model evidence only; runtime remains RED.

## 10. Owner boundaries

P0-076 owns the exact Journal generation token and CAS meaning.

P0-072 owns reset relation classification, quarantine, writer fencing and transactionally applying the rebase/detach decision to its durable rows.

P1-043 still owns shared-origin physical byte reservation. P1-064/P1-208 still own recovery fairness. P0-073/P0-074/P1-090/P1-183 remain remote-operation identity dependencies.

No new P-code is needed.

## 11. Status / implementation consequence

P0-076 and P0-072 remain **ACTIVE**.

This checkpoint corrects an over-broad naive design before implementation: a global Journal generation is viable for scoped clears only with transaction-owned rebase of exact nonmatching durable authority.

The P0-072 first-tranche acceptance must consume this rule when P0-076 generation is integrated; this does not reopen its already saturated storage/quarantine mechanism research.

Runtime/manifest unchanged; manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/GitHub Release is claimed.
