# Audit delta — grouped Journal legacy-index visibility — 2026-08-28

## Scope

Docs-only audit of grouped Journal query/index behavior. No new P-number.

Refines the existing **P1-206 Journal composed-view coherence** contract. The performance/index owners (P1-009/P1-174) remain dependencies but are not renumbered.

## Finding

The current source explicitly recognizes that some legacy Journal rows may not contain newer derived compound-index fields.

`openJournalViewCursor()` therefore deliberately uses the universal `createdAt` index and comments that this keeps legacy entries without newer derived compound-index fields visible; predicates are recomputed from row data.

Grouped mode does not preserve that compatibility boundary:

- `queryJournalViewGroups()` opens `store.index('urlKeyCreatedAt').openCursor(...)` directly;
- `queryJournalViewGroupEntries()` also queries `urlKeyCreatedAt` for the selected `urlKey`.

IndexedDB compound indexes omit records whose indexed key path is missing/invalid. A row that is still readable through the primary/`createdAt` path can therefore disappear from grouped enumeration solely because its stored derived `urlKey`/compound key was never backfilled by an older build.

### Deterministic legacy schedule

1. Profile contains legacy Journal row L that is valid as a Journal record and has recoverable `url`/hostname/createdAt, but lacks the newer persisted `urlKey` field needed by `urlKeyCreatedAt`.
2. Ungrouped page query scans `createdAt`; `journalViewSummary(L)` can derive `urlKey` from L's URL, so L is visible.
3. User enables grouping by URL.
4. Group query enumerates only the compound index; L has no index entry and is absent.
5. Counts/metadata can still include L because other scans use broader indexes/row predicates.
6. UI can therefore report a count that grouped rows cannot enumerate, and toggling grouping appears to make data disappear.

This is a read-model/index compatibility failure, not Journal source corruption.

## Why this matters to P1-206

A coherent composed view requires not only one revision, but also one **membership universe**. Metadata/counts, ungrouped pages, grouped pages and group children cannot each silently define “all Journal entries” through different index-admission rules.

Revision fencing alone would still produce a perfectly consistent revision R in which grouped mode omits L forever.

## Required contract

Choose one explicit strategy:

### Backfill/rebuildable derived index fields

On upgrade/maintenance, version and backfill normalized `urlKey/siteKey` (and any future compound-index fields) for every source row, with a durable rebuild-generation/dirty marker. Grouped/indexed query may use the fast compound index only after the relevant derived-index generation is proven complete.

### Compatibility fallback

Until backfill is complete, grouped mode must include legacy rows through a bounded fallback path and merge them without duplicates. The fallback cannot devolve into an unbounded full-heavy-record scan on every page.

In either design:

- row source data remains authoritative;
- derived index absence is not interpreted as row deletion/filter mismatch;
- import/append/update keeps derived fields consistent for new generations;
- grouped header and child expansion use the same inclusion semantics.

## Acceptance cases

1. Legacy L missing persisted `urlKey` remains visible in ungrouped and grouped views.
2. Counts and grouped membership agree for one stable Journal revision.
3. Backfill interrupted by MV3 termination remains explicitly incomplete and resumes/rebuilds; partially indexed state is not published as complete.
4. Backfill racing with append/import cannot mark a stale derived generation current.
5. Modern rows already carrying valid compound fields retain fast indexed behavior.
6. A malformed/unrecoverable URL follows the product's explicit fallback grouping rule instead of disappearing only because an index key is absent.
7. Group child expansion returns the same legacy row represented by its header.
8. P1-206 pagination continuation remains revision-bound during/after index-generation changes.

## Classification

No new number. **P1-206** remains composed-view revision/membership owner; P1-009/P1-174 constrain any fallback/backfill architecture so the fix does not reintroduce unbounded heavy scans/materialization.

## Validation note

Documentation only. Runtime/tests/manifest unchanged. Product tests were not rerun; historical 88/88 JS syntax + 74/74 deterministic PASS remains prior evidence only. No build/tag/release.