# Audit delta — Journal export revision writer coverage revalidation — 2026-08-28

## Scope

Docs-only positive-control audit of the Journal DB revision used by full export/backup. No new P-number.

This checkpoint narrows **P1-206** / backup source-revision work by verifying whether a missing revision writer is presently visible in the main Journal mutation inventory.

## Result — no uncovered source-row writer found in the current inventory

`stageFullJournalExportOnce()` captures `revisionBefore`, reads the Journal in bounded primary-key batches across multiple readonly transactions, then captures `revisionAfter` and rejects/retries when the two values differ.

That design is only valid if every authoritative `entries` mutation advances `JOURNAL_META_REVISION_KEY` in the same atomic IndexedDB transaction as the row change.

Fresh inventory confirms the current source-row mutation families satisfy that property:

### Append / recovery append

`appendJournalEntry()` writes a new row and calls `touchJournalDbRevision(tx, 'append')` inside the same transaction. Pending/recovery finalization ultimately uses this append path.

### Entry update

`updateJournalEntryRecord()` performs the row `put(updated)` and `touchJournalDbRevision(tx, 'update-entry')` in one transaction. Current comment mutations and Mark Read local checkpoint/finalization flow through this helper.

### Delete

`deleteJournalEntryRecordOnly()` deletes the entry and touches `delete-entry` in the same transaction.

### Clear

`clearJournalEntries()` touches `clear-<scope>` in the same transaction that deletes entries and relevant pending checkpoints.

### Replace import

`commitStagedJournalImport()` opens one transaction containing Journal/meta/pending/import staging stores, touches `import-replace`, clears the old Journal and writes every normalized replacement row. A transaction abort therefore aborts the revision write together with the row replacement.

Fresh search found no separate current production writer to `JOURNAL_STORE` that bypasses those revision-aware paths. Derived `urlStats`, pending stores and import staging are not authoritative Journal source rows and correctly do not pretend to be source revision changes by themselves.

## Why this positive control matters

The before/after revision fence would be dangerously false if even one source-row mutation bypassed it. The current inventory means the export can legitimately treat a stable revision as evidence that no committed authoritative row mutation occurred between its boundary snapshots.

This does **not** close other source-revision findings:

- P1-206 still requires composed Journal views/continuations to carry one revision;
- backup success still needs to bind the exported source revision to exact remote/account/root generation;
- high-mutation export can still hit bounded retry/timeout policy;
- a future new direct Journal writer must not be added without revision participation.

## Acceptance / regression guard

1. Static/deterministic inventory test fails if production code writes/deletes/clears `JOURNAL_STORE` outside an approved helper/transaction that also owns `JOURNAL_META_REVISION_KEY`.
2. Append during export changes revision and causes retry/reject.
3. Comment/update during export changes revision.
4. Delete during export changes revision.
5. Clear/import replacement changes revision atomically with the row set.
6. Aborted mutation transaction does not publish a revision that claims an uncommitted source change.
7. Derived-stat rebuild alone does not invalidate a source snapshot unless source rows also changed.
8. Future schema migration that mutates source rows must explicitly participate in the revision generation contract.

## Classification

No new blocker. This is a **positive audit checkpoint** for the existing P1-206 / backup source-revision architecture; it should be used as a regression guard rather than converted into a new P-item.

## Validation note

Documentation only. Product tests were not rerun; historical 88/88 JS syntax + 74/74 deterministic PASS remains prior evidence. Runtime/manifest unchanged; no build/tag/release.