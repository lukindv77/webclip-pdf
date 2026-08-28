# Audit delta — Journal deleted-comment tombstone lifecycle — 2026-08-28

Source-of-truth `main` immediately before this write: `c53be9ad967d4a57f1c28963bf65ece245ced797`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged.

## New confirmed item: P1-211 — deleted Journal comments retain full active payload and permanently consume comment capacity

**Classification:** P1 / evidence-reserved / confirmed by fresh runtime audit.

Repository-wide duplicate-check covered canonical priorities and current audit-delta filenames/content. Adjacent items exist but none owns this exact lifecycle contract:

- **P0-055** — hard limits for comment count/per-comment/aggregate content;
- **P1-009** — filter/search CPU scalability;
- **P1-174** — eager heavy Journal card materialization, including deleted comment text;
- **P0-076** — exact Journal entry mutation generation/CAS;
- **P1-206** — coherent rendered Journal revision.

P1-211 is different: the user-facing Delete action creates an indefinitely retained full-text tombstone that continues to participate in search, export/backup/import and the same active count/character admission limits. Repeated legitimate create/delete cycles can therefore make an entry permanently unable to accept new comments even though the UI shows old comments as deleted.

## Fresh source proof

### 1. Delete is soft-delete only

`service-worker.js::deleteJournalComment(entryId, commentId, operationId)` normalizes the existing comment array and, for the matching item, returns:

- all existing fields via spread, including the full `text`;
- `updatedAt = now`;
- `deletedAt = now`;
- operation id.

It then writes that full array back through `updateJournalEntryRecord()`.

The comment text is not erased, replaced by a digest, moved into a separately bounded history store, or excluded from active-capacity accounting.

### 2. UI deliberately exposes retained deleted text

`journal.js` renders a deleted comment as a deleted item with a `<details>` control whose summary is `Удалён`. Expanding the details renders metadata and the original full comment text.

Therefore current product semantics are not “secure erase on Delete”. They are closer to “soft delete with recoverable/audit history”.

This positive observation matters for classification: the defect should not be overstated as a hidden privacy erasure failure when the UI itself currently exposes the retained history.

The missing contract is bounded lifecycle and truthful capacity/search semantics for that retained history.

### 3. Deleted text remains searchable as active comment content

`journal-text-filter.js::commentsContain(entry, term)`:

1. checks legacy `fileComment`;
2. iterates every `entry.journalComments` item;
3. searches `item.text`;
4. never checks `item.deletedAt`.

Thus a query in the `Комментарии` field can match a comment the user has deleted and bring the entry into search results solely because deleted text still exists.

If search is intended to include history, the UI/query semantics must say so explicitly. If normal comment search means live comments, tombstones must be excluded or exposed through a distinct historical-search option.

### 4. Export/backup/import preserve the full tombstone

`sanitizeJournalCommentEntry()` retains normalized:

- `id`;
- `text`;
- created/updated/deleted timestamps;
- operation id.

`normalizeJournalComments()` includes deleted items rather than compacting them.

Consequently full deleted text survives full Journal export, Yandex backup, restore/import and future round trips. Tombstones are not local/session-only history.

Again, preservation may be a deliberate audit-history feature, but it requires an explicit retention/export contract rather than accidental indefinite inheritance from the ordinary live-comment schema.

### 5. Deleted comments count against the hard 500-comment admission cap

`addJournalComment()` obtains:

`const comments = normalizeJournalComments(current)`

and then rejects when:

`comments.length >= MAX_IMPORTED_COMMENTS_PER_ENTRY`.

`normalizeJournalComments()` includes deleted tombstones.

`MAX_IMPORTED_COMMENTS_PER_ENTRY = 500`.

Deterministic permanent-cap schedule:

1. user creates comment C1 and deletes it;
2. repeat with C2…C500;
3. all 500 tombstones remain in `journalComments`;
4. visible/live comment count may be zero;
5. `addJournalComment()` still observes `comments.length === 500`;
6. every future Add Comment is rejected with the 500-comment limit.

There is no current tombstone GC/compaction path that restores active capacity.

This is a direct user-visible lifecycle failure, not merely storage overhead.

### 6. Deleted text also consumes the aggregate character budget

Before adding a comment the worker calls:

`assertJournalCommentBudget([...comments, { text }])`.

That helper sums text length across the entire normalized list. Deleted tombstones remain full-text list elements, so their characters continue consuming `MAX_JOURNAL_COMMENTS_TOTAL_CHARS`.

An entry can therefore become unable to accept new modest comments after enough large comments were created and deleted, even well before the 500-count cap.

The same retained payload contributes to import normalization and the heavy-card pressure already observed by P1-174.

## Why P1 rather than P0

Fresh source does not show:

- unauthorized remote mutation;
- credential disclosure;
- silent Journal source corruption;
- promise of cryptographic/secure erase that current UI contradicts.

The UI explicitly labels and exposes deleted history. The confirmed failure is lifecycle/capacity/search/export truthfulness and eventual usability of a Journal entry, so P1 is appropriate.

If product requirements later define Delete as privacy erasure, that stronger requirement should be evaluated separately and may change classification. Current evidence alone does not justify that claim.

## Required P1-211 product decision

Choose and document one explicit model.

### Model A — hard delete

On Delete:

- remove the comment payload from the authoritative entry;
- advance entry revision/CAS under P0-076;
- search/export/backup no longer contain it;
- active count/aggregate capacity is immediately reclaimed.

If a minimal audit receipt is needed, retain only bounded non-content metadata in a separate/history structure.

### Model B — intentional soft-delete history

If deleted text must remain recoverable:

- define a bounded tombstone retention/count/byte budget distinct from active comments;
- deleted tombstones do not permanently consume the active 500-comment admission limit;
- active aggregate comment budget and history budget are separate;
- old tombstones compact/expire according to an explicit policy;
- storage pressure uses generation-safe compaction, not arbitrary silent deletion;
- UI clearly distinguishes live comments from deleted history;
- normal search specifies whether deleted history is included, ideally as an explicit option;
- export/backup schema states that deleted history is included, or provides an explicit omission/privacy option if product requires it.

Do not solve the capacity bug by simply increasing the 500/2 MiB limits; indefinite tombstone accumulation would only move the failure point.

## Mutation-generation requirements

Whatever model is chosen, comment deletion/compaction must obey existing P0-076/P1-206 generation rules:

- stale rendered delete cannot mutate a replacement entry with the same textual id;
- concurrent add/edit/delete uses expected entry/comment generation;
- background tombstone compaction cannot delete a newly recreated/newer comment generation with a reused id;
- export/search view either observes one coherent Journal revision or retries/restarts boundedly.

## Required regressions

1. Create C, delete C: resulting behavior matches the chosen hard-delete or explicit soft-history model exactly.
2. Under hard delete, original text is absent from Journal record/search/export/backup after commit.
3. Under soft history, deleted text is visibly historical and governed by a separate bounded retention budget.
4. Normal live-comment search does not unexpectedly match deleted text unless historical search was explicitly selected/documented.
5. Create/delete 500 comments: entry can still add a new live comment under the chosen bounded-history policy; deleted history cannot permanently exhaust active count.
6. Large deleted comments cannot permanently consume the active aggregate text budget.
7. Export/import roundtrip preserves only the intended history class and re-applies its separate limits.
8. Backup/restore does not silently turn expired/compacted tombstones back into active capacity consumers.
9. Concurrent stale delete vs newer edit/add obeys exact comment/entry generation and cannot delete replacement state.
10. Tombstone cleanup under storage pressure is bounded, generation-safe and does not block ordinary comment use indefinitely.
11. P1-174 heavy rendering benefits from compact/lazy history but remains a separate performance requirement.
12. P1-009 search scalability remains separate from the semantic decision whether historical comments participate in a query.

## Duplicate check / numbering

New **P1-211** is assigned.

- **P0-055** remains the hard input/aggregate limit owner; P1-211 defines which lifecycle classes consume which limits.
- **P1-009** remains filter CPU/index scalability.
- **P1-174** remains heavy Journal card materialization.
- **P0-076** remains mutation CAS/generation.
- **P1-206** remains coherent rendered/read revision.

No new P0/P2 number is created.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains prior evidence only: **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.
