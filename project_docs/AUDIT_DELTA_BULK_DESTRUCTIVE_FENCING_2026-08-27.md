# Audit delta — bulk destructive fencing vs entry/remote side effects — 2026-08-27

Baseline HEAD before this audit block: `08f7bc34db1deb9c6b384802f1176bcd6256bae9`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged. Canonical registry synchronization is not claimed.

## Scope

Fresh concurrency audit of clear/replace-import against local and remote single-entry mutations, focused on existing `P0-072`, `P0-076`, with dependencies `P1-183`, `P1-090`, `P0-074`.

## Worker guard is narrower than its name suggests

The only service-worker uses of `runExclusiveJournalDestructiveMutation()` are:

- `WEBCLIP_JOURNAL_CLEAR`;
- `WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED`.

The following mutating operations do **not** enter that worker-owned guard:

- `WEBCLIP_JOURNAL_DELETE` including remote Delete→Trash;
- `WEBCLIP_JOURNAL_MARK_READ` including remote ReadLater→Upload;
- comment add/edit/delete;
- ordinary append/finalization paths.

Therefore the guard prevents clear and replace-import from overlapping **each other**, but it is not a global Journal mutation/side-effect fence.

## Page-local guard also does not solve this

`journal.js::beginJournalDestructiveOperation()` is page-local state and disables only import/clear controls. Card-level delete/mark-read/comment operations use separate busy variables and are not part of the same exclusion contract.

Consequences:

- one Journal page can still overlap a bulk destructive operation with a card mutation if actions are reached through independent UI paths;
- two Journal pages always have independent page-local guards;
- service-worker remains the only place capable of enforcing the real invariant, and currently does not.

## P0-072 — external side effects are broader than upload/download

Current clear transaction correctly removes matching/all records from:

- `pendingAppends`;
- `pendingDownloads`;
- `pendingRemoteSaves`.

Replace-import clears all three pending stores atomically with replacing entries.

This prevents many old save completions from recreating Journal entries, but it does not account for already-started non-cancellable or remote side effects that are **not represented in those pending stores**, especially:

- Delete→Trash `resources/move`;
- ReadLater→Upload `resources/move`;
- future unpublish/revoke operations required by P0-069/P1-164.

A clear/import can therefore commit while such a remote operation is still in flight. Removing Journal state is not cancellation of the remote mutation.

P0-072's global durable-side-effect fence must include all irreversible/unknown-settlement entry operations, not only save/download checkpoints.

## P0-076 — exact stale replacement corruption

The current single-entry write helpers do not use expected revision/generation CAS.

`updateJournalEntryRecord(id, patch)` performs a fresh `store.get(id)` inside its final transaction and applies the stale precomputed patch to whatever record currently has that id.

`deleteJournalEntryRecordOnly(id)` likewise re-reads the current id and deletes it.

This creates exact replacement corruption after replace-import:

### Late Delete→Trash

1. old entry A begins delete and remote move;
2. replace-import commits entry B with the same id;
3. old remote move settles;
4. old `deleteJournalEntryRecordOnly(id)` reads B and deletes B.

The old operation has therefore deleted the replacement entry, not merely completed cleanup of A.

### Late ReadLater→Upload

1. old entry A begins mark-read and computes remote/checkpoint state;
2. replace-import commits B with the same id;
3. old move settles;
4. final `updateJournalEntryRecord(id, oldPatch)` reads B and overlays old remote path/resource/publication/read-mode fields onto B.

This can bind imported/replacement metadata to the wrong physical Yandex object.

### Comments

Comment helpers also read a record, compute a new comments array outside the final update transaction, then pass that stale array into `updateJournalEntryRecord`. Cross-tab concurrent comment mutations and replace-import can therefore lose/overwrite newer comment state.

## Required unified fencing model

Before any entry mutation with a delayed phase, capture:

- Journal database generation/revision;
- entry id;
- expected entry revision/version (or immutable locally issued mutation generation);
- operation generation;
- for remote actions, immutable Yandex operation context and exact object identity.

Final local commit must compare those expected values **inside the same IDB readwrite transaction** before update/delete. Mismatch means the old operation is stale: preserve/report remote outcome, but do not mutate replacement Journal state.

For remote side effects, stale local generation cannot undo a side effect that may already have happened. Therefore retain an outcome/tombstone receipt sufficient to reconcile the physical file without resurrecting or deleting the replacement entry.

## Bulk-operation admission contract

Before clear/replace-import commits:

- inspect a durable registry of active/unknown external side effects affecting the requested scope;
- either block/defer the bulk operation until actual settlement, or atomically write cancellation/replacement tombstones that forbid old local finalization while preserving physical-outcome reconciliation;
- scoped clear must only fence operations in that URL/site scope, while full replace/import fences all Journal entry generations;
- imported replacement generation must become authoritative immediately at commit.

Do not rely on a page staying open, page-local busy flags, or in-memory worker variables for this invariant.

## Required regressions

1. Delete A remote move in flight + import B with same id: B is not deleted when A settles.
2. Mark-read A in flight + import B same id: B does not receive A's remotePath/resourceId/read-state patch.
3. Comment edit from tab 1 + comment edit from tab 2: expected-revision conflict is surfaced/retried deliberately; no silent last-writer stale array overwrite.
4. Scoped clear during matching active upload/download/move does not treat checkpoint deletion as cancellation; physical outcome remains reconciliable without Journal resurrection.
5. Scoped clear for unrelated site does not unnecessarily block unrelated active side effects.
6. Full replace-import establishes a new Journal generation and invalidates all older final local commits.
7. Old delete/mark-read outcome receipt remains usable for cleanup/diagnostics without gaining authority over replacement entry.

## Classification

No new P-number created. Extend existing `P0-072` and `P0-076`; preserve `P1-183`, `P1-090`, `P0-074` dependencies.

Previous product test gate was not re-run by this docs-only audit checkpoint.
