# Audit delta — urlStats rebuild isolation — 2026-08-27

Baseline HEAD before this audit block: `d2bc008b944521433aaae38529c5eb4b530a0133`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged. Canonical registry synchronization is not claimed.

## Scope

Fresh audit of Journal derived `urlStats` consistency during global rebuilds, focused on existing `P0-026` and `P0-050`.

## Result

`P0-050` must be treated as **PARTIAL / regression reopened by audit**. The bounded token-set dirty marker prevents one mutation from simply clearing another mutation's token, but the actual derived-store rebuild is not isolated from concurrent point updates. A global rebuild and normal append/delete can mutate the same `urlStats` key concurrently and produce an incorrect result that can subsequently become falsely clean.

No new P-number is created.

## Exact runtime proof

### Global rebuild is multi-transaction and additive

`rebuildAllUrlStats()`:

1. clears the whole `urlStats` store;
2. scans Journal entries in separate readonly primary-key batches (`batchSize = 750`), therefore not one IndexedDB snapshot;
3. for each batch opens a separate `urlStats` readwrite transaction;
4. for every URL key loads the current stats record and **adds** the batch delta to its existing `dayCounts`, while taking max `lastSavedAt`.

The additive merge is correct only while no independent writer updates the same derived key between clear and final batch merge.

### Concurrent append mutates the same derived key

Journal append owns a dirty token, commits the entry, then calls `updateUrlStatsAfterAppend(entry)` before completing its token.

That helper:

- if a stats record exists, increments its `dayCounts` directly;
- if no record exists, sets `needsRebuild` and then performs an exact `rebuildUrlStatsForUrl(key)` from the current Journal.

Both branches can race with the global additive rebuild.

A deterministic corruption schedule exists:

1. clear/import starts token B and global `rebuildAllUrlStats()`, which first clears `urlStats`;
2. concurrent append A commits an entry for URL X;
3. A observes X missing in `urlStats` and point-rebuilds X exactly from Journal, creating a complete X count;
4. A completes its dirty token while B's token still exists;
5. global rebuild later reaches one or more batches containing entries for X and **adds those batch counts onto the already-complete X record**;
6. B completes its token; with no other tokens/overflow, the marker is removed.

The resulting X statistics are over-counted but there is no remaining dirty marker requiring repair.

Even when X already exists, an incremental `+1` can be counted again if the random/primary-key position of the newly appended entry lies in a later rebuild batch. If it lies behind `afterKey`, the rebuild may instead miss it and rely on the concurrent increment. Therefore correctness depends on timing/key order rather than one authoritative snapshot.

### Concurrent delete has the symmetric problem

Delete commits the Journal deletion and then performs exact `rebuildUrlStatsForUrl(entry.urlKey)` before completing its dirty token.

A global rebuild can already have read a soon-to-be-deleted entry into a batch delta. The point rebuild writes the exact post-delete count, and the later stale global batch merge can add the deleted entry back into the derived count. When the bulk token then completes, the marker may again become clean.

## Why the current revision check is insufficient

`ensureJournalStatsHealthy()` captures marker revision before its repair rebuild and only clears the marker when the revision is unchanged. That protects the maintenance-repair path from a mutation that crosses the rebuild.

But clear/import explicitly own their own stats token, call `rebuildAllUrlStats()`, and then call `completeJournalStatsMutation(statsToken)`. A concurrent mutation may begin and complete entirely while the bulk token remains; its token/revision churn is no longer present when the bulk token is finally removed. Therefore the token-set protocol alone does not prove that the derived rebuild was isolated.

## Required P0-050 refinement

A full rebuild must have an explicit derived-index generation/lease or equivalent isolation contract, not only dirty tokens around Journal mutations.

Acceptable shapes include:

- build a new versioned `urlStats` generation from a stable Journal revision and atomically publish/swap it only if the Journal revision is unchanged; or
- hold a durable rebuild epoch that prevents point derived writes from merging into the in-progress generation, queueing/coalescing their URL keys for a post-build exact repair; or
- after rebuild, compare a durable Journal revision captured before the first scan with the current revision and refuse to mark clean if anything changed, regardless of whether the concurrent mutation's temporary token has already completed.

Do not rely on one long IndexedDB readonly transaction across up to 100k entries if that violates bounded transaction/lifecycle requirements. The solution should preserve batching while making publication of the derived generation atomic/versioned.

Point updates must target only the current published generation or be replayed deterministically after the new generation becomes authoritative; global batch merge must never add deltas onto an independently exact-rebuilt record from a different generation.

`P0-026` remains the higher-level import crash-consistency requirement; `P0-050` owns the concurrent dirty/rebuild isolation defect.

## Required deterministic regressions

1. Global rebuild pauses after clearing stats; append X point-rebuilds X; global resumes: final X count is exact, never doubled, and clean state is valid.
2. Global rebuild reads a batch containing entry E; concurrent delete E point-rebuilds X; stale batch resumes: deleted E is not resurrected in stats.
3. Concurrent mutation begins and completes entirely during a bulk rebuild: bulk completion cannot erase evidence unless the published derived generation is proven to match the final Journal revision.
4. New entry primary key falls before the rebuild cursor and after the rebuild cursor in separate cases; both yield the same exact stats.
5. Worker termination mid-rebuild retains a durable repair requirement; restart never publishes a partial generation as clean.
6. Overflow (>128 simultaneous tokens) remains fail-closed and does not bypass the rebuild-generation rule.

## Classification

- Reopen/refine existing `P0-050` from REGRESSION to effectively PARTIAL until this race is implemented and tested.
- Preserve `P0-026` dependency for import/clear crash consistency.
- No `P0-079`, `P1-198` or `P2-020` assigned by this block.
- Evidence-reserved `P1-195`, `P1-196`, `P1-197` remain separate.

Previous product test gate was not re-run by this docs-only checkpoint.