# Audit delta — Deleted Journal comment tombstones preserve capacity debt across backup/import — 2026-08-28

Source-of-truth `main` immediately before this write: `ab2aec8d206ae0bcea93985d7276b03b3c1c0227`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged. No new P-number is assigned.

## Classification

Primary existing owner: **P1-211 — deleted Journal comment tombstone lifecycle/capacity policy**.

Adjacent:

- P0-010 — complete Journal export/import roundtrip;
- P1-030 — import schema/identity normalization;
- P1-009 — comment search cost/semantics;
- portable Journal schema refinement requiring explicit v1 projection.

## Existing positive control

Deleted comments do not silently resurrect on roundtrip.

Runtime normalization represents a comment with:

- id;
- text;
- createdAt;
- updatedAt;
- `deletedAt > 0`.

Import normalization explicitly restores `deletedAt` with a non-negative numeric value. Therefore a comment exported as deleted remains deleted after import rather than becoming editable/active.

This is the correct identity/history direction.

## Fresh lifecycle consequence — capacity debt is also portable

P1-211 established that Delete is a soft tombstone:

- full comment text remains stored;
- tombstones remain in `journalComments[]`;
- search/export/history can still observe them;
- count/text budgets include them.

`assertJournalCommentBudget()` counts **all** array elements against `MAX_IMPORTED_COMMENTS_PER_ENTRY` and sums every comment text against the aggregate text budget. It does not exclude tombstones.

Journal export serializes the entry/comment history, including deleted comments. Import restores both tombstone state and full text, then enforces the same aggregate limits.

Therefore the lifecycle/capacity debt created on device A is portable to backup B and restored device/session C.

## Deterministic roundtrip

1. Entry E accumulates many normal comments.
2. User deletes them over time; each becomes a full-text tombstone rather than being physically removed.
3. E approaches the 500-comment and/or ~2 MiB aggregate budget even though few/no active comments remain.
4. User exports/backs up the Journal.
5. Backup contains the full deleted history and `deletedAt` markers.
6. User later imports/restores that backup.
7. Tombstones correctly remain deleted, but their count/text capacity is restored unchanged.
8. E can immediately reject a new active comment because historical deleted data consumes the same active capacity budget.

The backup therefore faithfully transfers a storage-policy side effect that the user may reasonably expect Delete to have relieved.

## Required P1-211 refinement

Define an explicit **portable tombstone retention/compaction contract**, not just an in-memory UI behavior.

Possible implementation policy is product-defined, but it must provide bounded semantics such as:

- retain full deleted text only for a documented bounded history window/count;
- compact older tombstones to identity/timestamp-only records;
- or physically purge them after a documented retention condition;
- separate active-comment capacity from retained-history capacity so normal create/delete use cannot permanently exhaust active functionality.

Whichever policy is chosen must apply consistently to:

- local runtime mutation;
- search/indexing;
- Journal export;
- Yandex backup;
- import/restore;
- storage-pressure/maintenance cleanup where applicable.

Do not implement cleanup only in the UI while exporting old full tombstones indefinitely.

## Schema/version considerations

If compacted tombstones have a different portable representation, Journal v1 serializer/importer must define it explicitly. The general portable-schema audit already requires an allowlisted serializer rather than spreading internal DB records.

A compaction migration must preserve enough identity to avoid turning a stale Edit/Delete action into a different comment and must maintain deterministic import behavior for older v1 backups containing full tombstones.

## Required regressions

1. Active comment roundtrip preserves text/identity normally.
2. Deleted comment roundtrip remains deleted and never becomes editable merely because of import.
3. A long create/delete history cannot permanently consume all active-comment capacity under the chosen P1-211 policy.
4. Backup/import applies the same bounded tombstone policy as local runtime.
5. Older backups with many full tombstones import deterministically: compact/migrate according to explicit policy or fail with a precise compatibility/capacity result; never partially resurrect history.
6. Search behavior for deleted comments matches the chosen product policy before and after roundtrip.
7. Compaction does not create duplicate comment ids or stale-action retargeting.

## Duplicate check

The original P1-211 checkpoint owns soft-delete retention/search/export/capacity. Repository search found no dedicated checkpoint spelling out that the **capacity debt itself survives official backup/import roundtrip**. This is therefore an acceptance/schema refinement of P1-211, not a new number.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build/tag/Release was created.