# Audit delta — legacy `journalComment` filter compatibility — 2026-08-28

Source-of-truth `main` immediately before this write: `ddae18f5929d822f5be72088f03616275db1b460`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines **P1-009** Journal filter correctness/scalability and documents its compatibility interaction with **P1-211** comment lifecycle.

The legacy single-comment field is generally normalized well at display/export/mutation boundaries, but the current **filter predicate runs before that normalization** and can therefore fail to find a legacy comment that the same UI later displays.

## Positive control — legacy comment has a canonical runtime adapter

`normalizeJournalComments(entry)` handles an old row with no `journalComments` array entries by materializing the legacy:

- `entry.journalComment` text;
- stable synthetic id `legacy-<entry.id>`;
- created/updated timestamps;
- `deletedAt:0`.

Many output/mutation paths use this adapter:

- ordinary list/hydration returns normalized comments;
- group child reads normalize comments before returning full entries;
- export serializes `{...entry, journalComments: normalizeJournalComments(entry)}`;
- Add/Edit/Delete first normalize the legacy comment, then write the canonical `journalComments` array and clear `journalComment`/`journalCommentUpdatedAt`.

Thus first successful comment mutation canonically migrates the legacy text rather than maintaining two active comment layers.

This is a useful compatibility pattern and should remain.

## Filter predicate bypasses the adapter

`queryJournalViewPage()` and grouped query paths evaluate:

`journalViewSummaryMatches(..., { entry })`

against the raw IndexedDB entry **before** the result is hydrated with `normalizeJournalComments(entry)`.

`WebClipJournalTextFilter.commentsContain(entry, term)` currently searches:

- `entry.fileComment`;
- every `entry.journalComments[].text`.

It does **not** search `entry.journalComment` and does not itself call the shared legacy normalizer.

Therefore an old persisted Journal entry whose only user comment is still in legacy `journalComment` can be visible with that comment in the card but excluded from a `Комментарии` text-filter result for the exact same text.

## Deterministic compatibility failure

1. old-version row L has `journalComment='needle'`, empty/missing `journalComments`;
2. current Journal without comment filter hydrates L and displays `needle` through `normalizeJournalComments()`;
3. user enters Comments filter `needle`;
4. worker scans raw L;
5. `commentsContain()` sees no `journalComments` item and ignores `journalComment`;
6. L does not match and disappears from results;
7. clearing filter makes L visible again with the exact supposedly non-matching comment.

This is user-visible search correctness, not only migration cleanup.

## Why this is not a new P-number

P1-009 already owns exact Journal filter semantics across all supported Journal records and fields. Legacy rows are still supported current data until canonical migration/compaction is complete.

P1-211 governs whether deleted/new comment history remains active/searchable and how capacity is reclaimed. It does not replace the basic requirement that an **active legacy comment shown by the UI** participate consistently in the normal Comments field search.

## Required repair direction

Use one canonical comment-content adapter for every semantic consumer.

Acceptable approaches:

### Normalize for predicate

Before `commentsContain`, expose a lightweight normalized comment iterator that yields:

- current `journalComments` according to P1-211 live/history semantics;
- legacy `journalComment` only when it has not already been superseded by canonical array data.

Avoid allocating full heavyweight comment objects merely to evaluate a search predicate.

### One-time bounded data migration

Migrate remaining legacy rows to canonical `journalComments` under a durable/versioned migration marker and bounded batches, then make old-field fallback temporary/explicit.

A migration must advance Journal revision and preserve P0-076/P1-206 semantics; worker crash cannot leave the migration falsely marked complete.

Either way, display/filter/export must agree on what comment content is semantically present.

## P1-211 composition

When P1-211 chooses hard-delete vs bounded soft-history semantics, the filter adapter must implement the same rule:

- live search should not accidentally include deleted history unless explicitly designed;
- legacy active comment remains searchable;
- a future history-search option may include bounded tombstones separately.

Do not fix legacy search by blindly scanning every retained tombstone forever.

## Required regressions

1. Legacy-only `journalComment='needle'` is displayed and matched by Comments filter `needle`.
2. Legacy-only row does not duplicate the comment after hydration/export/mutation.
3. First Add/Edit/Delete canonicalizes legacy into `journalComments` and clears old scalar fields exactly once.
4. Canonical entry with non-empty `journalComments` does not also search stale leftover legacy scalar text as a second comment.
5. P1-211 deleted-history policy is applied consistently to filter after canonicalization.
6. File comment and Journal comments remain distinct supported fields under existing query semantics.
7. Import/export of old schema/legacy record produces the same visible/searchable comment content after normalization.
8. Bounded migration, if chosen, survives worker restart and does not mark completion before all intended rows are canonical.
9. High-volume filter path remains bounded under P1-009; compatibility must not materialize ~2 MiB comment arrays repeatedly when a lightweight iterator/index can suffice.
10. Journal revision changes caused by migration invalidate stale view continuations under P1-206.

## Duplicate check / numbering

No new P-number is created.

- **P1-009** remains the filter correctness/performance owner.
- **P1-211** remains deleted-comment tombstone retention/search/capacity semantics.
- **P0-076/P1-206** remain mutation/view generation dependencies for any physical migration.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains prior evidence only: **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.
