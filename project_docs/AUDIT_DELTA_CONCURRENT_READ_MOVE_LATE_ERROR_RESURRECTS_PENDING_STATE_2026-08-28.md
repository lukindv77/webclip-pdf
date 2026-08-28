# Audit delta — concurrent Mark Read operations can resurrect pending move state after a newer success — 2026-08-28

Source-of-truth `main` before this checkpoint: `eef95543851916b763c62b679f60458c3a884bd3`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh source proof refines **P0-076** per-entry mutation generation/CAS and composes with **P1-090**, **P1-198** and the newly explicit independent ReadMove physical receipt requirement.

The concrete race is stronger than generic lost update: two Journal pages can start Mark Read for the same entry, and a late error handler from operation B can write `readMovePending*` fields back into the row after operation A has already successfully changed it to `readingMode='read'` and cleared pending state.

## Page busy state is local to one Journal document

`journal.js` uses module/page-local:

- `moveReadBusy`;
- `pendingMoveReadEntry`;
- `activeMoveReadOperationId`.

That correctly prevents duplicate clicks inside one page while its operation is active.

It does not serialize two Journal tabs/windows.

Journal A and Journal B can each render the same `readingMode='later'` entry and each confirm Mark Read before either receives a revision refresh.

## Worker has no per-entry exclusive admission for Mark Read

The runtime handler directly calls:

`moveReadLaterEntryToRead(id, operationId)`.

Unlike bulk clear/import, it is not wrapped in a shared exclusive destructive mutation primitive and it does not require an expected entry revision/generation from the page.

Each invocation fresh-reads the entry at its own start, but two invocations can both read the same initial generation before either writes its checkpoint.

## Checkpoint updates are ordinary patch writes without expected generation

`updateJournalEntryRecord(id, patch)` performs:

1. read current row by textual id;
2. spread `{...current, ...patch}`;
3. put result;
4. touch Journal revision.

The caller provides no expected row generation/revision.

Therefore every checkpoint/final/error patch is authorized against whichever row currently occupies the id at that transaction, even when the patch was computed from an older operation snapshot.

## Deterministic A/B race

Initial entry E:

- `readingMode='later'`;
- source S;
- no pending move fields.

Two pages start operations A and B.

### Admission/checkpoint phase

1. A reads E/later.
2. B reads E/later before A finalizes.
3. A locates S, chooses target TA, writes checkpoint fields with operation A.
4. B also locates from its old operation context and writes its checkpoint fields with operation B, overwriting the row-level pending projection.

Without immutable move generations the row can describe only whichever patch wrote last, even though both physical workflows may still exist.

### Late error after success

A particularly concrete final state is:

5. A performs/ verifies S→TA successfully.
6. A writes final entry state:
   - `readingMode='read'`;
   - remotePath under Upload;
   - `movedToReadAt`;
   - clears all `readMovePending*` fields.
7. B's external path fails later, for example because source S already moved.
8. B enters its `catch` with `checkpointWritten=true`.
9. B calls `updateJournalEntryRecord(id, {...readMovePendingAt, readMoveTargetPath, readMoveOperationId:B, readMoveLastError...})`.
10. That helper fresh-reads A's successful `readingMode='read'` row and merges B's old pending/error patch into it.

Final row can therefore be logically contradictory:

- `readingMode='read'` and successful moved metadata from A;
- nonzero `readMovePendingAt`, target and error from failed B.

B's stale error has resurrected an unfinished-move projection after the move already succeeded.

## Why fresh-reading current row makes this worse, not safer

The helper's fresh read prevents blind overwrite of unrelated fields such as A's `readingMode='read'`.

But for mutation authority that means the stale patch is **retargeted onto the newer row**.

The correct behavior after A advances the entry generation is for B's expected-generation comparison to fail and for B to reconcile its own physical receipt separately.

Merging only selected stale fields into current state is not a safe conflict strategy.

## Remote side-effect risk exists before the contradictory row

Both operations may reach external admission unless a per-entry operation lease/generation stops the loser.

Provider/source disappearance may make one fail, but correctness cannot rely on the first move always becoming visible before the second POST is admitted.

Required P1-090 behavior is one exact physical move generation per admitted attempt with deterministic reconciliation. Competing incompatible move attempts for the same source entry should not both be launched from one expected row generation.

## Required per-entry mutation/physical lease contract

When page A authorizes Mark Read it sends the rendered entry receipt required by P0-076.

Worker should atomically admit a move lease/generation MA only if:

- expected entry generation still matches;
- no incompatible current move lease exists for that generation;
- exact remote object/context is bound.

A concurrent B from the same old rendered generation then either:

- receives `busy/existing MA` and can observe/reconcile it; or
- fails stale after A advances the row;
- but never creates an independent conflicting physical move merely from the same textual id.

## Error/final patches must be generation-aware

Every local projection transition needs expected ownership:

- checkpoint created;
- target/source updated;
- error recorded;
- remote verified;
- final `readingMode='read'` commit;
- checkpoint cleanup.

A late B error may append diagnostics to B's own physical receipt/OperationLog, but it cannot mutate A's newer Journal entry generation.

## Independent move receipt eliminates row projection contention

The preceding audit block requires physical move receipt M outside the replaceable Journal row.

With that architecture:

- MA and hypothetical MB remain separate physical records;
- E contains only a pointer/current projection for the generation it owns;
- late MB failure updates MB, not E after E moved to MA-success generation;
- user/recovery UI derives current pending state from an exact pointer/generation relation.

This is preferable to attempting to make `readMovePending*` fields themselves carry every concurrency guarantee.

## Operation receipt/progress composition

A and B currently have distinct random textual page operation ids, so progress modals do not accidentally share a normal id.

P1-198 still requires worker-issued receipts and explicit lineage:

- user operation RA -> move generation MA;
- competing RB either references MA or is rejected/stale.

A late B OperationLog error remains valid historical diagnostics even when its Journal mutation authority is revoked.

## Required deterministic regressions

1. Two Journal pages render same E generation -> both confirm Mark Read -> exactly one physical move lease wins; loser cannot launch incompatible move.
2. A success commits `readingMode=read` -> late B error patch -> E remains free of B pending/error projection.
3. A checkpoint written -> B stale expected revision -> B returns conflict/busy without replacing A target/operation fields.
4. A remote success -> local finalization CAS loses because newer Journal generation exists -> MA becomes detached/verified; no stale row mutation.
5. B error after A success still appears in B OperationLog/physical receipt diagnostics without altering E.
6. Same textual entry id reused by import after A/B start -> neither old operation mutates replacement entry.
7. Worker restart with one valid move lease -> recovery resumes exact M; it does not admit a second attempt from entry id alone.
8. Two pages may both observe the same existing move operation, but only one underlying physical generation is authoritative.
9. Normal single-page Mark Read remains unchanged from user perspective.
10. Page-local `moveReadBusy` stays as UX optimization but is not relied on for cross-page correctness.

## Duplicate check / numbering

No new item is created.

- **P0-076** remains the primary per-entry expected-generation/CAS owner.
- **P1-090** owns exact move attempt/settlement.
- **P1-198** owns live operation receipt/lineage.
- Existing Journal concurrency deltas already require cross-tab mutation fencing; this checkpoint supplies an exact current ReadMove late-error corruption schedule.

P1-211 remains unassigned.

## Test / release state

No product tests were rerun. Historical **88/88 syntax + 74/74 deterministic PASS** remains prior evidence only. No runtime/build/tag/Release change was made.
