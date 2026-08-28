# Audit delta — Journal backup vs transient ReadLater move recovery state — 2026-08-28

Docs-only audit checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

No new P-number.

Primary existing owner: **P0-022** imported remote/destructive provenance. This also composes with **P0-074** operation/account generation, **P0-076** Journal generation fencing, **P1-090** exact Yandex move identity and **P1-190/P1-198** operation-receipt provenance.

The fresh acceptance point is that a user backup is a portable Journal-data artifact, while `readMove*` is transient local recovery state for one destructive saga. Those two classes must not be silently serialized/restored as equivalent durable history.

## Source proof

The current full Journal export reads each raw IndexedDB entry and serializes:

```js
JSON.stringify({ ...entry, journalComments: normalizeJournalComments(entry) })
```

Therefore every current internal field in the entry is included, including:

- `readMovePendingAt`;
- `readMoveSourcePath`;
- `readMoveTargetPath`;
- `readMoveOperationId`;
- `readMoveLastError`.

`normalizeImportedJournalEntry()` then explicitly accepts and restores those same fields from a backup.

Current Mark Read treats `readMovePendingAt/readMoveTargetPath` as recovery evidence: it announces a previous unfinished move, reuses the stored target when it is inside the current Upload folder and records new recovery state around that target.

## Why this is different from normal historical metadata

`title`, URL, filename, comments and selection snapshot are portable user history.

A `readMove*` checkpoint is not merely history. It represents an unfinished local-to-remote destructive transaction tied to:

- one Journal entry generation;
- one Yandex account/root generation;
- one source remote object identity;
- one chosen target path generation;
- one operation attempt and unknown/known settlement state.

Exporting it as an ordinary entry field and importing it later loses those authority bindings.

## Deterministic honest-backup schedule

No crafted backup is required:

1. Journal entry J is in `ReadmeLater`.
2. Mark Read chooses target T and commits `readMove*` checkpoint before remote move.
3. While the saga is pending/unknown, a full Journal backup snapshot includes the raw entry and therefore T/source/operation checkpoint fields.
4. The original saga later completes, fails, changes account/root, or becomes otherwise historical.
5. At a later time the user restores that perfectly legitimate backup, possibly on another extension installation or Yandex session.
6. Import recreates J with the old transient `readMove*` state.
7. Journal UI/worker can now treat that historical checkpoint as an unfinished local recovery saga.

P0-022 prevents the imported path hints from becoming unchecked destructive authority, but the backup format should also stop confusing portable history with live recovery state in the first place.

## Required contract

Choose and document one versioned model:

### Preferred: portable backup excludes live recovery capability

- full Journal export/backup strips transient `readMove*` authority fields;
- portable entry keeps stable historical outcome fields only (`readingMode`, `movedToReadAt`, current verified remote metadata where policy permits);
- after restore, no old move attempt is automatically resumable.

### Alternative: export recovery evidence as explicitly inert historical metadata

If product value requires preserving it for diagnostics:

- store it under a versioned `historicalRecovery`/source namespace;
- mark provenance as imported/unverified;
- never feed it directly into live `moveReadLaterEntryToRead()` recovery selection;
- an explicit rebind/reconciliation flow must establish current account/root/object/generation before authority is regained.

## Backup snapshot timing

The solution must work even when export legitimately overlaps a live move. It is not sufficient to hope backups normally happen between mutations.

A coherent snapshot may faithfully observe `readMovePendingAt` — that proves the snapshot is internally consistent, not that the checkpoint is portable authority.

## Regression cases

1. Backup taken before Mark Read checkpoint -> restore has no pending move.
2. Backup taken after checkpoint but before POST -> restore does not resume old T automatically.
3. Backup taken after POST with outcome unknown -> restore does not infer current remote settlement from old checkpoint.
4. Backup taken after final verified local commit -> stable `readingMode=read`/verified remote metadata round-trips normally.
5. Restore under different Yandex account/root -> no old move capability survives merely because strings are inside managed paths.
6. Restore into same account/root after original saga already completed -> historical checkpoint does not initiate a second destructive move.
7. Crafted backup carrying `readMove*` remains covered by P0-022 and fails closed.
8. OperationLog/history may preserve diagnostic operation id separately, but it is not a live move receipt.

## Duplicate check

P0-022 already owns the strongest safety boundary for imported remote/path provenance. This delta does not allocate a new item; it clarifies the portable-backup schema acceptance condition that prevents honest backups from recreating stale transient recovery authority.

## Validation note

Documentation only. Product tests were not rerun; historical 88/88 JavaScript syntax + 74/74 deterministic PASS remains prior evidence only. No build, tag or Release was created.