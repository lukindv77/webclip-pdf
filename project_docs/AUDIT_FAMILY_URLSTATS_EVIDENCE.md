# Audit family evidence — derived `urlStats` generation and consumers

This document losslessly consolidates:

- `AUDIT_DELTA_URLSTATS_REBUILD_ISOLATION_2026-08-27.md`;
- `AUDIT_DELTA_URLSTATS_DIRTY_CONSUMER_FAILOPEN_2026-08-28.md`.

No runtime/test/manifest change is implied. The single primary owner remains **P0-050**; P0-026 is the import/clear crash-consistency dependency, and Action/UI owners consume the derived truth but do not replace P0-050.

## Root cause — multi-transaction derived rebuild is not one published generation

`rebuildAllUrlStats()` clears the derived store, scans Journal rows in bounded batches across separate readonly transactions, then writes additive batch deltas through separate `urlStats` readwrite transactions. This batching is necessary for boundedness but does not provide one authoritative snapshot/generation.

Normal Journal append/delete operations can concurrently update or exact-point-rebuild the same `urlStats` key. The dirty-token protocol prevents one mutation from trivially deleting another live token, but it does not isolate the **derived data writes** themselves.

### Deterministic append corruption

1. Bulk clear/import/rebuild owns token B and clears `urlStats`.
2. Concurrent append A commits Journal row X.
3. A observes no stats row and exact-point-rebuilds X from current Journal, producing a complete count.
4. A completes its own dirty token while B remains live.
5. Bulk rebuild later reaches old/current rows for X and additively merges its batch into the already-complete point result.
6. B completes; marker can become clean although X is double-counted.

The symmetric delete schedule can re-add a row from a stale bulk batch after an exact post-delete point rebuild.

A mutation that starts and completes wholly inside the lifetime of B demonstrates why temporary token presence/revision churn is not sufficient proof that the final published derived store matches the final Journal revision.

## Required P0-050 generation contract

A full derived rebuild must use one explicit versioned generation/epoch or equivalent publication fence while preserving bounded batch work. Acceptable implementation classes include:

- build a new `urlStats` generation from a captured Journal revision and atomically publish/swap only if the source revision is unchanged;
- keep an explicit rebuild epoch so point updates never merge into the in-progress generation, then replay/coalesce affected URL keys after publication;
- compare durable Journal revision across the entire rebuild and refuse to publish/mark clean if it changed, even when transient mutation tokens have already completed.

Point updates target only the currently published generation or a deliberately isolated next-generation repair path. A stale global batch must never add into a point result built from a different source revision/generation.

Worker termination mid-rebuild preserves a durable repair obligation; boundedness must not be replaced by one huge long-lived transaction.

## Dirty state is an authority state, not a maintenance hint

`getJournalSummaryForUrl()` historically attempted `ensureJournalStatsHealthy(...)`, swallowed repair failure, and then read any existing `urlStats[urlKey]` as ordinary truth. `updateActionForTab()` could therefore publish stale/partial `lastSavedAt` and `uniqueDays` even while the durable dirty marker explicitly said the projection was unverified.

Row presence is not validity while the generation is dirty. A dirty store can contain a plausible but wrong row.

Required consumer behavior while derived state is unverified:

- never publish ordinary exact summary from an unproven generation;
- either perform a bounded exact point read/rebuild from authoritative Journal data with Journal-revision fencing, or return explicit unknown/degraded state;
- a point repair does not clear the global dirty obligation;
- Action may resume exact badge/color/title only after consuming a proven current generation or a separately proven exact point result.

## Deterministic regression set

1. Bulk rebuild clears; append X exact-point-rebuilds; bulk resumes -> exact final X, never doubled.
2. Bulk batch read includes E; concurrent delete E exact-point-rebuilds; stale bulk merge cannot resurrect E.
3. Mutation begins and completes entirely during bulk rebuild -> clean publication still requires final revision/generation proof.
4. New entry falls before vs after rebuild cursor -> identical correct final stats.
5. Worker termination mid-rebuild -> partial generation is never presented/marked clean.
6. Dirty marker + repair failure + stale row exists -> Action degrades or point-derives; it does not present stale row as authoritative.
7. Dirty marker + no row -> bounded point fallback cannot silently clear global dirty state.
8. Concurrent source mutation during point fallback -> publication is revision-fenced/retried/degraded.
9. Once a new versioned generation is atomically published, ordinary consumers become cheap again without full Journal scans.

## Retirement result

Both source deltas are fully represented here: source schedules, owner classification, generation acceptance and consumer fail-closed behavior are preserved. Their exact original prose and audit baselines remain in Git history.
