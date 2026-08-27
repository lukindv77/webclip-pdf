# Audit delta — Journal grouped-pagination boundary vs revision — 2026-08-28

Source-of-truth `main` immediately before this write: `170d829ff9f8ccfabfa86ca8da02b89780273c92`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines existing **P1-206 — Journal composed-view revision coherence**.

P1-206 already requires one end-to-end Journal revision receipt for metadata/counts/groups/entries/child expansion. This checkpoint adds a deterministic pagination-specific manifestation: the cached group boundary of page N can belong to Journal revision A while page N+1 is computed from revision B, causing a logical URL group to be skipped or duplicated.

Related but separate:

- **P1-009** remains search/filter CPU/index scalability;
- **P1-127** remains polling/timer read fanout;
- **P1-174** remains eager heavy Journal view materialization;
- **P0-050** remains derived `urlStats` rebuild isolation.

## Fresh source proof

### 1. Group pagination stores a boundary outside IndexedDB

`journal.js::renderCurrentEntries()` keeps page boundaries in module memory:

`urlGroupPageBoundaries`.

After rendering a grouped page, it stores the returned last group as the boundary for the next page. The boundary contains values equivalent to:

- `key` / normalized URL identity;
- `url`;
- `latest` timestamp used by the group sort order.

The boundary does not carry the Journal DB revision from which it was derived.

### 2. The next page is a new database read

A later page request calls the grouped reader again and performs fresh IndexedDB transactions over the current Journal contents.

The grouped reader recomputes logical URL groups, including each group's `latest` timestamp, and orders groups by the current sort comparator (newest group first, then deterministic URL/key tie-breakers).

It then applies `groupComesAfterBoundary(group, boundary)` using the cached boundary from the previous page.

There is no assertion that current Journal revision equals the revision that created that boundary.

### 3. A Journal mutation can move a group across the old boundary

The order key of a group is mutable because adding or removing an entry for that URL changes the group's `latest` timestamp.

Deterministic schedule:

1. Revision A contains groups `G1 ... Gn`; page 1 is rendered and caches boundary `Bn` from the last visible group.
2. Before page 2 is requested, a Journal mutation creates revision B.
3. The mutation changes the newest entry of an existing group G so G moves from one side of `Bn` to the other in the sorted order.
4. Page 2 is read from revision B but filtered with boundary `Bn` from A.
5. Depending on direction of movement, G can be omitted from both pages or appear on both pages across the user's navigation history.

The same issue exists if deletion changes/removes the boundary group itself, or if import/clear replaces the whole Journal between page requests.

### 4. This is stronger than a cosmetic count mismatch

P1-206 was initially proven with metadata/counts from revision A and entries from revision B in one render.

Grouped pagination adds an inter-page consequence:

- a user can fail to see a group that exists in the current Journal;
- a group can be shown twice while another is displaced;
- cached page boundaries no longer describe one coherent ordered snapshot;
- navigating back/forward can produce different membership without an explicit refresh signal.

The underlying Journal source of truth is not corrupted, but the read model does not provide a coherent traversal of it.

### 5. Child expansion has the same revision requirement

When a grouped row is expanded, child entries for that URL are read separately. The group header/count/latest metadata and the expanded child page must also carry/validate the same view revision contract; otherwise a group header from A can expand children from B and then establish B as the polling baseline.

This remains part of P1-206 rather than a separate item.

## Required P1-206 refinement

### Every continuation token must be revision-bound

Grouped pagination must return a continuation/boundary receipt containing at least:

- exact Journal DB revision;
- normalized sort/filter/grouping parameters;
- boundary sort key (`latest`, URL/key tie-breakers) from that revision.

A continuation may be consumed only while that Journal revision is still current.

If revision changed, do not apply the old boundary to the new data. Restart the logical view from a defined page (normally page 1) or obtain a fresh coherent continuation sequence and visibly refresh the UI.

### Metadata, group page and baseline must agree

A successful render should publish only when:

1. metadata/counts/filter domains were derived from revision R;
2. grouped page/entry page was derived from R;
3. any page continuation used also belongs to R;
4. immediate post-read revision validation still says R is current;
5. only then is R stored as the polling baseline.

If any component reports a different revision, discard that composed result and retry/restart within a bounded policy.

### Do not solve with one unbounded long transaction

A single readonly transaction over the entire 100k-entry Journal is not required and may conflict with existing bounded-IDB/lifecycle goals.

Acceptable designs include revision-before/revision-after fences around bounded component reads, versioned continuation receipts, or a versioned read-model/index generation. Any retry loop must be bounded under a high-mutation workload and surface a controlled `view changed, refresh required` state rather than spin indefinitely.

## Required deterministic regressions

1. Page 1 on revision A -> append to a group originally after boundary so it moves before boundary in B -> page 2 cannot silently omit/duplicate groups; old continuation is rejected/restarted.
2. Page 1 on A -> delete newest entry of a group so it moves after boundary in B -> same coherent behavior.
3. Boundary group itself is deleted between page 1 and page 2 -> old boundary is not applied as if still authoritative.
4. Import-replace between pages, including reuse of the same URL strings -> A continuation cannot enumerate replacement Journal B.
5. Clear between pages -> no stale page-2 continuation yields entries after the UI accepted empty/new metadata.
6. Group header from R expands children only under R; revision change forces bounded refresh/re-expansion.
7. Metadata A + group page B is rejected before the polling baseline is advanced to B.
8. A high mutation rate causes bounded retries/explicit refresh state, not an infinite transaction or render loop.
9. Stable Journal with no mutation preserves current deterministic pagination order and page size.
10. Filter/grouping toggle invalidates all prior continuation receipts even if Journal revision itself did not change.

## Duplicate check / numbering

No new number is created.

- **P1-206** remains the owner of coherent Journal view revision receipts and now explicitly includes pagination continuation/boundary tokens.
- **P1-009**, **P1-127**, **P1-174** and **P0-050** remain separate as described above.

This is specifically not a new `P1-208`.

## Test / release state

Audit documentation only. Product tests were not rerun. The last proven product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime/config/manifest are unchanged; version remains `0.9.8`. No build, tag or GitHub Release was created.