# Audit delta — Journal ungrouped offset pagination must be revision-bound — 2026-08-28

Source-of-truth `main` immediately before this write: `d2844c626fcef4a381dee4242a9425fa48591ec7`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines existing **P1-206 — coherent Journal view revision**.

The earlier grouped-pagination audit already proved that a group continuation boundary from revision A cannot be applied to revision B. This pass confirms the same class exists in the ordinary ungrouped page-number path through numeric offset, even though it uses a different algorithm and does not consume the grouped boundary token.

## Current ungrouped pagination

`queryJournalViewPage(...)` computes:

`offset = (page - 1) * pageSize`

and opens the universal `createdAt` index newest-first. Inside one readonly IndexedDB transaction it:

- scans matching entries;
- skips matches until `total >= offset`;
- collects at most `pageSize` summaries;
- returns `{ total, entries }`.

One individual page is therefore internally a coherent IndexedDB transaction snapshot. Preserve that positive property.

However the response carries no Journal revision, and `journal.js::readJournalPageViaServiceWorker()` keeps only `total` + `entries`.

A later page number is a new transaction over whichever Journal revision is current at that time.

## Deterministic inter-page schedules

### Newer insert duplicates an older boundary row

1. Revision A is ordered newest-first as E1…E40.
2. Page 1 (`offset=0`, size 20) shows E1…E20.
3. A new entry N is inserted ahead of E1, producing revision B.
4. User opens page 2; B's offset 20 now starts at former E20 rather than E21.
5. E20 appears on both the historical page 1 and current page 2 while another row is displaced farther back.

### Delete ahead of offset skips a row

1. Page 1 from A shows E1…E20.
2. One of E1…E20 is deleted before page 2.
3. Current B sequence shifts left.
4. Offset 20 starts after former E21.
5. E21 can be absent from both pages the user traversed.

### Filter-relevant mutation has the same effect

Changing reading mode/comment/filter-relevant metadata can move a row into/out of the match set without changing `createdAt`. Numeric offset over the newly filtered B set no longer corresponds to the A page boundary.

Import/clear can of course replace the entire set between pages.

## Why per-page transaction consistency is not enough

The defect is not an internally mixed page. Each page may be perfectly coherent on its own.

The user is traversing a logical ordered view across multiple requests. Numeric page number/offset is meaningful only relative to the same ordered revision or an explicitly refreshed traversal.

Without a revision receipt, page 2 cannot know that page 1's offset semantics are stale.

## Required P1-206 refinement

### Page response carries exact view revision

Every ungrouped page response should carry at least:

- Journal DB revision R;
- normalized view/filter/sort parameters;
- page/continuation identity.

The UI retains R for the current traversal.

### Continuation/page navigation validates R

Before consuming page 2+ from traversal R:

- request may include expected revision R;
- worker/read model must reject/restart if current revision differs;
- UI normally resets to page 1 or explicitly shows that the Journal changed and refresh is required.

Do not silently apply numeric offset from A to B.

### Prefer continuation semantics over naked offset where useful

An exact sort-key continuation bound to R can avoid rescanning skipped rows and make ordering intent explicit. If page numbers remain a UX requirement, map them through revision-bound continuations/cache rather than treating `(page-1)*N` as timeless authority.

Any continuation must include tie-breaker identity for equal `createdAt` rows and cannot cross filter/group mode changes.

### High mutation rate remains bounded

Do not retry indefinitely waiting for a quiescent Journal. After a bounded number of revision conflicts, render a controlled `Журнал изменился — обновите список` state or restart to the current page-1 view.

## Composition with rendered mutation authority

P1-206 coherent traversal does not replace P0-076.

Even on a stable page revision, a later button click must carry expected entry/comment generation because the Journal can change after render but before action.

Conversely P0-076 mutation CAS does not make a cross-revision page traversal coherent. Both layers are required.

## Required regressions

1. Page 1 on A -> newer insert before page 2 -> old traversal is invalidated/restarted; no silent duplicate boundary row.
2. Page 1 A -> delete ahead of offset -> page 2 does not silently skip the shifted row.
3. Row changes filter membership between pages -> old offset is rejected.
4. Import-replace between pages, including same textual ids/timestamps -> A traversal cannot enumerate B as page 2.
5. Clear between pages -> page 2 old continuation is invalid.
6. Stable revision -> ordinary page navigation preserves current deterministic order and counts.
7. Equal-createdAt rows have a stable tie-breaker in any continuation design.
8. Filter/sort/group toggle invalidates old pagination receipt even if DB revision is unchanged.
9. High mutation rate produces bounded refresh conflict, not infinite retries.
10. One page remains read in one readonly transaction; fixing inter-page coherence must not regress per-page snapshot consistency.

## Duplicate check / numbering

No new P-number is created.

- **P1-206** remains the owner of coherent Journal view/read revision and now explicitly includes ungrouped numeric offset traversal in addition to grouped boundary tokens.
- **P0-076** remains rendered action/mutation generation authority.
- **P1-009** remains filter scalability rather than pagination revision semantics.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains prior evidence only: **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.
