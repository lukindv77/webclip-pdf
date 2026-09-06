# P0-050 — derived `urlStats` generation isolation — 2026-09-06

Canonical owner/status authority remains `project_docs/RESEARCH_REGISTRY.md`.

Fresh baseline:

- `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`;
- `service-worker.js` Git blob = `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`;
- runtime/manifest remains `0.9.8`;
- this branch is research-only.

Registry owner:

> P0-050 ACTIVE — Derived `urlStats` rebuild/publication needs a versioned generation isolated from concurrent point mutations.

This document revalidates the current source and fixes the implementation contract. It does not change Registry status and does not claim runtime or release closure.

## Classification

**Architecture-saturated for the current baseline; implementation remains absent.**

Current `urlStats` is correctly treated as secondary/rebuildable data, but full rebuild writes its partially reconstructed state directly into the same live store used by point updates and readers. The existing dirty-marker revision protects marker clearing, not publication of one coherent derived generation.

No new P-code is needed.

## Current positive controls

### Primary Journal already has an authoritative revision

`JOURNAL_META_REVISION_KEY = 'revision'` lives in the Journal IndexedDB meta store.

`touchJournalDbRevision(tx, reason)` writes a fresh revision inside the same IndexedDB transaction as primary Journal mutations.

Fresh current-source calls cover at least:

- append;
- update-entry;
- delete-entry;
- clear;
- import-replace.

This is the correct source-of-truth generation for P0-050. Do not create a parallel independent Journal generation in `chrome.storage.local`.

### Dirty marker is crash-safe enough to detect unfinished derived work

`beginJournalStatsMutation()` creates a token in `webclipJournalStatsDirty` before Journal mutation work.

`completeJournalStatsMutation()` removes that token only after the point/full derived update succeeds.

Token overflow remains dirty rather than silently clean.

This is useful recovery evidence and must be preserved, but it is not a snapshot/publication generation.

### Per-URL delete repair is locally exact

`rebuildUrlStatsForUrl(urlKey)` reads primary Journal and writes one derived row in a single IndexedDB readwrite transaction spanning Journal + stats stores.

That is a good point-repair shape when it targets the currently active derived generation.

### Readers repair before summary lookup

`getJournalSummaryForUrl()` calls `ensureJournalStatsHealthy('summary-read')` before reading `urlStats`.

This preserves the intended invariant that a known dirty derived index should be repaired/degraded before being trusted.

## Current full-rebuild behavior

`rebuildAllUrlStats()` intentionally keeps memory bounded:

1. clear `JOURNAL_STATS_STORE`;
2. read Journal in primary-key batches of 750;
3. aggregate one batch in a `Map`;
4. open a separate readwrite transaction on live `urlStats`;
5. `get(key)` current derived row;
6. add batch counts into that row;
7. repeat until Journal exhausted.

This is memory-bounded, but not generation-isolated.

## Existing dirty-marker revision is not enough

`ensureJournalStatsHealthy()`:

1. reads the dirty marker;
2. captures `marker.revision`;
3. calls `rebuildAllUrlStats()`;
4. re-enters the serialized storage marker mutation;
5. removes the dirty marker only if current marker revision still equals the captured revision.

A concurrent Journal mutation therefore prevents an old repair from declaring the system clean. That is a positive control.

However, the concurrent mutation does **not** prevent the old rebuild from writing stale/mixed rows into the live stats store before the marker comparison occurs.

The marker comparison happens after publication side effects.

## Deterministic stale-delete schedule

Current-shaped race:

1. Journal contains `e1` and `e2` for URL `u`.
2. full rebuild clears live `urlStats`.
3. rebuild batch reads both `e1` and `e2`, producing delta count 2.
4. concurrent delete removes `e2` from Journal and changes `JOURNAL_META_REVISION_KEY`.
5. delete path calls `rebuildUrlStatsForUrl(u)` and writes exact current count 1 into live stats.
6. older full rebuild now merges its previously captured batch delta count 2 into the same live row.
7. live `urlStats[u]` becomes count 3 / may retain `e2`'s latest timestamp even though Journal contains only `e1`.
8. dirty marker revision changed, so old repair cannot clear the marker.
9. nevertheless the mixed derived row has already been published.

A later repair can eventually correct it, but P0-050 requires publication isolation, not eventual repair after publishing a mixed generation.

## Deterministic append/double-count schedule

Another allowed interleaving:

1. rebuild clears live stats;
2. rebuild batch observes a newly appended entry depending on cursor timing;
3. point append update independently increments the same live stats row;
4. rebuild merge adds the batch contribution containing that same entry;
5. count can be doubled until another repair.

Again the dirty marker may remain, but the derived store has already mixed two writers with different snapshot boundaries.

## Required architecture

## 1. Separate source revision from derived generation

Conceptually maintain:

```text
Journal source revision R
Derived stats generation G
Active stats generation pointer -> G
Generation metadata: { generation: G, sourceRevision: R, state }
```

`R` must come from the existing `JOURNAL_META_REVISION_KEY` authority.

`G` identifies one physical derived build. It may be numeric, UUID-based or another bounded opaque generation; its role is not to replace Journal revision.

## 2. Full rebuild never destroys or mutates the active generation while building

A rebuild must allocate a new non-active generation `Gnew`.

It may use:

- a generation-keyed stats store;
- a dedicated staging store;
- a two-bank/other equivalent storage layout.

The exact schema is implementation choice.

Required property: batch writes for `Gnew` are invisible to ordinary readers and do not merge with point mutations targeting the active generation.

Therefore current-shaped:

`tx.objectStore(JOURNAL_STATS_STORE).clear()`

against the active reader store before build is complete is not acceptable.

## 3. Capture source revision before scan

Before reading Journal batches, rebuild captures authoritative source revision `R0` from Journal meta.

Every staged row belongs to `(Gnew, R0)`.

No batch is individually considered published.

## 4. Publish with source-revision compare-and-switch

After the final batch is durable, perform one bounded IndexedDB transaction that:

1. reads current `JOURNAL_META_REVISION_KEY`;
2. compares it with `R0`;
3. if different -> mark/discard `Gnew`; active pointer remains unchanged;
4. if equal -> atomically switch the active stats generation pointer to `Gnew` and record `sourceRevision=R0`.

Because primary Journal mutation changes source revision in its own transaction, a mutation that commits before this compare makes the rebuild stale.

The staged bytes can exist physically without becoming reader authority.

## 5. Point mutations target the active generation at update time

Append/delete/per-URL rebuild must not capture an old active generation and then blindly update it after a generation switch.

After the primary Journal mutation commits, the derived point-update transaction should resolve the **current active generation** and write that generation.

Race reasoning:

- if rebuild publishes before primary mutation commit, mutation changes Journal revision afterward and point update applies to the new active generation;
- if primary mutation commits before rebuild publication compare, source revision mismatch prevents staged generation publication;
- if point derived update fails, dirty marker remains and a later full repair is required.

P0-050 does not turn the derived index into primary transaction authority.

## 6. Readers resolve one active generation

`getJournalSummaryForUrl()` and any other urlStats reader must:

1. resolve active generation metadata;
2. read rows only from that generation;
3. never merge active and staging generations;
4. never infer active generation by "latest timestamp" or partial row presence.

If dirty recovery cannot establish a trustworthy current generation within the bounded operation deadline, the reader must return truthful degraded/unavailable state according to its caller contract rather than silently treating a mixed/staging generation as clean.

## 7. Dirty marker remains recovery intent, not publication authority

`webclipJournalStatsDirty` remains useful for:

- crash between Journal mutation and point-derived update;
- crash during staged rebuild;
- failed generation publication;
- token overflow requiring full rebuild.

But its `revision` field only serializes marker mutation state. It must not be compared as if it were Journal source revision.

A successful generation publish may clear relevant dirty state only when all mutation tokens represented by the captured source state are reconciled and no newer marker mutation exists.

## 8. Abandoned/stale generation cleanup is bounded

A rejected/crashed staged generation may leave physical rows.

Cleanup must be bounded and must never delete the active generation.

The active-generation pointer is authoritative; TTL alone is not sufficient ownership proof for deletion of a generation that could still be active.

This cleanup concern can compose with existing maintenance/deadline owners; P0-050 requires only that stale generations cannot become active by cleanup/restart ambiguity.

## 9. Worker restart

After restart:

- read active generation metadata from IndexedDB;
- read dirty marker;
- if dirty, start/restart a new staged generation from a fresh source revision;
- never resume publication merely because partially staged rows exist without a complete generation receipt;
- never clear the current active generation at rebuild start.

## Why one long IndexedDB snapshot transaction is not required

The project intentionally supports large Journal datasets and bounded transaction lifetimes.

P0-050 does not require holding a 100k-entry readonly transaction open for the whole rebuild.

Multiple bounded batch reads are safe **if and only if** any primary mutation during those reads changes `JOURNAL_META_REVISION_KEY`, causing final publication rejection.

This keeps current memory/deadline intent while restoring snapshot publication semantics.

## Migration direction

Current `urlStats` store uses keyPath `urlKey`, so it cannot hold multiple physical generations of the same URL simultaneously.

An implementation will therefore need a schema/storage-layout change before true staged publication is possible. Possible safe migrations include:

- new generation-keyed store with keyPath `[generation, urlKey]` plus active-generation meta;
- separate staging/active stores with an explicit versioned bank pointer.

Do not overwrite legacy live stats in-place during migration and then call the migration atomic.

Because `urlStats` is fully derived, stale legacy rows can be retired after a complete new generation is published; primary Journal records must not be modified or truncated for this migration.

## Owner boundaries

- **P0-050** — coherent versioned urlStats build/publication versus concurrent point mutation.
- **P0-076** — exact Journal entry/revision mutation CAS; does not replace derived stats generation.
- **P1-009** — Journal filter/search scalability; separate from stats snapshot publication.
- **P1-206** — coherent Journal view revision receipts/pagination; a view may be revision-correct even while derived stats generation is separately wrong.
- existing dirty-marker/recovery mechanisms remain supporting controls; their presence is not P0-050 closure.

## Deterministic model

Branch tool:

`project_tools/test_p0_050_urlstats_generation_isolation_model.js`

It proves:

1. current-shaped stale-delete merge can resurrect/double derived state;
2. stable staged generation publishes;
3. delete during build changes source revision and rejects build;
4. append during build cannot double-count because staged build is rejected;
5. crash before pointer switch leaves old active generation untouched;
6. point append after a successful switch updates the new active generation.

Local result during creation:

`P0-050 urlStats generation isolation model: PASS`

Model PASS is architecture evidence only.

## Required source-bound gate

The runtime gate should remain RED until source demonstrates:

- explicit stats generation metadata/active pointer;
- full rebuild stages into a non-active generation;
- rebuild captures/compares `JOURNAL_META_REVISION_KEY` before publish;
- no pre-build clear of the active live store;
- summary reads resolve the active generation;
- append/per-url updates resolve the active generation rather than a stale captured one;
- existing primary `touchJournalDbRevision()` coverage remains;
- dirty marker remains fail-safe for unfinished mutations.

## Required deterministic/runtime schedules after implementation

1. full rebuild + concurrent append before first batch;
2. append after a batch read but before staged write;
3. delete after batch read before publish;
4. clear/import replace during build;
5. point mutation after successful generation switch;
6. worker stop after first staged batch;
7. worker stop after all staged rows but before active-pointer switch;
8. worker stop immediately after pointer switch but before dirty-marker cleanup;
9. stale-generation GC with active pointer changed concurrently;
10. 100k mostly-unique URLs remains bounded by existing batch/time/memory policy.

## Status

P0-050 remains **ACTIVE**.

Current source has useful dirty-marker and primary Journal revision controls, but still writes full-rebuild batches directly into live `urlStats`. A versioned staged generation plus source-revision-fenced active publication is required before implementation/Chrome or deterministic committed-source closure can be considered.
