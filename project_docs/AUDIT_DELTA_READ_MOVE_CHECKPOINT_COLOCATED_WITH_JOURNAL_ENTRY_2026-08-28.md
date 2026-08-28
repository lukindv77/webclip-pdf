# Audit delta — ReadLater move checkpoint is co-located with replaceable Journal entry — 2026-08-28

Source-of-truth `main` before this checkpoint: `4781cbfc534236ebf9f0c59e0c537558eec540fa`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh source proof refines **P1-090/P0-076** and the existing Journal-replace/external-recovery separation contract. It composes with **P0-074**, **P1-184**, physical-attempt lineage and imported-provenance requirements.

The concrete current runtime already has a durable pre-move checkpoint for ReadLater→Upload. Unlike future abstract move receipts, however, that checkpoint is stored inside the Journal entry itself. Bulk clear/import therefore destroys both the stale Journal capability and the only exact target/source evidence for a possibly admitted remote move.

## Positive control — ReadLater writes a checkpoint before `resources/move`

Current `moveReadLaterEntryToRead()` deliberately persists fields before the destructive remote action:

- `readMovePendingAt`;
- `readMoveSourcePath`;
- `readMoveTargetPath`;
- `readMoveOperationId`;
- clears prior error.

The source comment correctly explains the intent: if MV3 worker stops after the remote move, the next run can inspect the same target and finish the local part.

This is the correct ordering principle and is stronger than current Delete→Trash, which still lacks its own equivalent durable target receipt.

## The receipt lives only inside `JOURNAL_STORE` row E

`updateJournalEntryRecord(id, patch)` reads entry E, spreads the patch into E and writes the row back in `JOURNAL_STORE`, touching Journal revision.

There is no separate immutable move-attempt record/store whose lifetime can outlive the entry's membership in the current Journal generation.

Therefore the physical side-effect receipt and the mutable user-visible Journal row share one deletion lifecycle.

## Full clear deletes the receipt by deleting the row

The existing bulk-clear implementation clears `JOURNAL_STORE` for full Journal clear.

If E currently contains a genuine `readMovePending*` checkpoint, full clear removes it because it removes E.

That is correct for local Journal membership: old E must not reappear after clear.

It is not proof that a previously transmitted Yandex move did not or will not settle.

## Import-replace has the same effect

Atomic staged import replacement clears/replaces current Journal entries and advances Journal revision.

A pre-import E carrying a live ReadLater move checkpoint disappears unless that physical evidence has first been transferred into a detached generation.

Imported replacement data may even contain another entry with the same textual id E. The old move must never attach to that replacement row.

## Deterministic clear-during-move schedule

1. Entry E is `readingMode='later'`; exact source object S is located.
2. WebClip chooses exact Upload target T.
3. `updateJournalEntryRecord(E, readMovePending...S/T)` commits the local checkpoint.
4. `POST /resources/move S -> T` is transmitted.
5. Before its physical outcome is locally classified, user performs full Journal clear.
6. Clear transaction removes E and therefore removes S/T checkpoint.
7. Yandex may already have committed or later settle the move.
8. The old Journal generation correctly remains cleared, but WebClip has lost the exact physical move receipt required to explain/reconcile S→T.

The same schedule exists with import-replace instead of clear.

## Missing row must not mean cancelled remote side effect

After clear/import, a later worker cannot infer:

- whether the move was transmitted;
- whether S still exists;
- whether exact object arrived at T;
- which account/root/auth generation owned S/T;
- whether local finalization was intentionally invalidated versus physical checkpoint lost.

The absence of E means only `old Journal row no longer belongs to current generation`.

It must not be overloaded as `remote move did not happen`.

## Required separation

Before external move admission, create a physical move generation M independent of Journal row lifetime.

M should bind at minimum:

- random move generation id;
- worker-issued operation receipt;
- expected Journal entry/database generation at admission;
- exact source object identity/path;
- exact target path;
- Yandex account/root/auth/config operation context;
- publication/privacy state where relevant;
- phase/outcome evidence and timestamps.

The Journal row may carry a small pointer/display projection to M, but must not be M's only durable storage.

## Clear/import transition

When Journal generation changes destructively:

- old E mutation/finalization capability becomes stale;
- M remains if remote settlement is active/unknown/needs reconciliation;
- M transitions to `detached-stale-journal-generation` or equivalent;
- late M result cannot recreate E automatically;
- M can still prove/diagnose exact remote outcome and support explicit future cleanup/manual resolution if product policy allows.

This matches the prior local-download/remote-save detached receipt architecture and applies now to an already implemented ReadMove checkpoint.

## Successful move after detach

If M is later proven successful after E was cleared/replaced:

- record exact detached remote result;
- do not create a new `readingMode='read'` entry in the replacement Journal without a new explicit capability/product action;
- do not move the object back automatically just because local row disappeared;
- retain bounded management/object evidence according to policy.

The user chose clear/import of local Journal state, not rollback of an already admitted remote move.

## Failed/non-started move after detach

If provider semantics authoritatively prove the move never happened, M may transition to terminal no-side-effect and become eligible for compact retention/cleanup.

Clear/import itself is not that proof.

## Current row checkpoint remains useful as a UI projection

After implementing M, entry fields like `readMovePendingAt` can still be retained as a convenient view/state projection while E exists.

But their updates should reference exact M and expected Journal generation. Rebuilding UI from E alone must not recreate physical authority if M is absent/untrusted/imported.

This also solves the imported fake-checkpoint finding from the previous block: imported `readMove*` fields cannot manufacture M.

## Required deterministic regressions

1. Genuine checkpoint M/E committed -> move transmitted -> full clear -> remote success: no old Journal resurrection; M remains detached and exact.
2. Same with import-replace containing new entry with same id E: old M cannot mutate new E.
3. Move authoritatively rejected before side effect -> clear can retire local E and M later becomes terminal no-side-effect normally.
4. Worker restart after clear but before remote reconciliation -> detached M survives and retains S/T/context.
5. Account/root changes after detach -> M is reconciled only in historical context; no current namespace substitution.
6. Imported row with fake `readMove*` values has no locally issued M and cannot resume physical recovery.
7. Normal successful move with unchanged Journal generation finalizes E and retires M exactly once.
8. Local finalization fails after remote success due Journal CAS conflict -> M becomes verified/detached rather than losing outcome evidence.
9. Storage pressure may compact M after rich resources are unnecessary but never reinterpret eviction/clear as proof of no move.
10. OperationLog clear does not remove M.

## Duplicate check / numbering

No new item is created.

- **P1-090** remains exact destructive move settlement/identity owner.
- **P0-076** owns Journal generation/finalization authority.
- Existing Journal-replace recovery-evidence audit already establishes the general separation; this checkpoint proves the current ReadMove implementation is concretely affected today.
- **P0-074/P1-184** remain remote context/object receipt dependencies.

P1-211 remains unassigned.

## Test / release state

No product tests were rerun. Historical **88/88 syntax + 74/74 deterministic PASS** remains prior evidence only. No runtime/build/tag/Release change was made.
