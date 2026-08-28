# Audit delta — deleting a legacy entry can leave ghost `urlStats` — 2026-08-28

Source-of-truth `main` before this checkpoint includes `89d2f5ef73bd30fb6ce62db839f169ce10b7577f`.

Docs-only audit checkpoint. Runtime/config/tests/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh proof refines **P0-026** and **P1-216**. P1-216 already established that supported legacy entries without persisted `urlKey` are handled inconsistently by current-view vs older list/scoped-clear paths. This checkpoint finds the same derived-key split in a mutation path that can leave persisted `urlStats` factually wrong after a successful user delete.

## Positive control — full stats rebuild understands legacy rows

`rebuildAllUrlStats()` deliberately derives the key as:

`entry.urlKey || normalizeJournalUrl(entry.url || '')`

Therefore a legacy Journal row that predates persisted `urlKey`, but still has a valid URL, contributes to the rebuilt derived statistics.

That is necessary for backward compatibility and means `urlStats` may legitimately contain counts whose source entry has no stored `entry.urlKey`.

## Delete path uses a narrower identity rule

`deleteJournalEntryRecordOnly(id)`:

1. reads the entry;
2. starts a Journal-stats mutation marker;
3. deletes the entry and advances Journal revision;
4. **only if `entry.urlKey` is truthy**, calls `rebuildUrlStatsForUrl(entry.urlKey)`;
5. otherwise it simply completes the stats mutation marker.

It does not use the same `entry.urlKey || normalizeJournalUrl(entry.url)` fallback as full rebuild/view compatibility.

## Deterministic ghost-stat schedule

1. Legacy entry L contains valid URL U but no persisted `urlKey`.
2. Full stats repair/rebuild runs.
3. `rebuildAllUrlStats()` derives K from U and writes `urlStats[K]` with L included.
4. Chrome Action for U truthfully shows L's saved-day count.
5. User deletes L by entry id.
6. Local Journal delete commits successfully.
7. Because `entry.urlKey` is empty, delete path skips `rebuildUrlStatsForUrl(K)` and marks stats mutation complete.
8. Journal now contains no L, while `urlStats[K]` still counts it.
9. `getJournalSummaryForUrl(U)` finds the existing stale stat and returns it without triggering fallback rebuild.
10. Action badge/title can therefore keep displaying history for a deleted entry until an unrelated global stats repair occurs.

The dirty-marker protocol cannot repair this automatically because current delete explicitly completes the mutation as though derived state were consistent.

## Why this is stronger than a display-only legacy omission

P1-216 already covers legacy rows being omitted by some URL-key-dependent list/clear paths.

Here the destructive mutation itself succeeds, but its derived state commit is incomplete while being marked healthy. This belongs directly to P0-026's invariant that `urlStats` is rebuildable secondary data whose dirty/repair state must truthfully track Journal mutations.

## Required canonical derived-key helper

All Journal code that needs URL identity should use one canonical function/normalization contract, conceptually:

`effectiveEntryUrlKey(entry) = validated entry.urlKey || normalizeJournalUrl(entry.url)`

with explicit rules for invalid/legacy rows.

Use it consistently in at least:

- view summaries;
- legacy/template list matching;
- scoped clear;
- full stats rebuild;
- single-entry delete stats repair;
- any future per-entry move/update that changes URL identity;
- migration/backfill.

A stronger migration option is to backfill missing derived keys transactionally and then require the persisted key, but the compatibility period still needs one semantic rule.

## Dirty-marker rule

If deletion cannot determine/rebuild the exact affected stat key:

- leave/mark `urlStats` dirty;
- do not call the mutation complete as healthy;
- background repair can then rebuild all stats safely.

It is better to show an explicit temporarily-unconfirmed Action state than to certify stale counts.

## Required regressions

1. Legacy L `{url:U,urlKey:''}` -> full stats rebuild -> delete L -> `urlStats[U]` becomes empty/deleted immediately or remains dirty until repair; never healthy stale count.
2. Two legacy/current entries for U -> delete one legacy row -> count/day aggregation reflects only the remaining row.
3. Legacy row without valid HTTP(S) URL -> delete succeeds and stats dirty/fallback behavior is deterministic; no invented key.
4. Modern row with persisted urlKey keeps current fast targeted rebuild path.
5. Crash/failure during targeted stats rebuild leaves dirty marker so next health pass repairs it.
6. Action read during dirty/failed repair does not present stale cached stat as proven current truth; compose with P1-217 degraded-state semantics.
7. Full global stats rebuild and targeted delete use identical normalization for case/fragment/default-port rules.
8. Import/backfill followed by delete does not create duplicate old/new stat keys.

## Duplicate check / numbering

No new item is created.

- **P0-026** owns Journal ↔ `urlStats` consistency and dirty/self-repair semantics.
- **P1-216** owns legacy missing-`urlKey` semantic parity across Journal paths.
- **P1-217** remains Action degraded truth when the current summary cannot be proven.

## Test / release state

Docs-only checkpoint. Product tests were not rerun. Historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** remains previous evidence only. No build, tag or Release was created.
