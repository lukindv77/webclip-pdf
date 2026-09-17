# Research evidence — P0-050 versioned `urlStats` generation revalidation — 2026-09-17

Research-only closure-oriented tranche. Production runtime, `manifest.json`, workflows, `TEST_STATUS.md`, `RELEASE_READINESS.md`, build/tag/deploy and GitHub Release state are unchanged.

## Current owner and classification

Canonical owner: **P0-050 ACTIVE** — derived `urlStats` rebuild/publication needs a versioned generation isolated from concurrent point mutations.

This tranche does not create a new P-code and does not claim implementation closure.

## Fresh canonical baseline

Fresh source baseline:

- canonical `main`: `db2cee8053be115c0a7a70aaed4fc9264e353036`;
- `service-worker.js` was re-read from that exact commit;
- current Registry still lists P0-050 ACTIVE;
- historical family evidence was used only for semantic dedup after fresh source confirmation.

## Fresh exact-source revalidation

### 1. `urlStats` is still one published mutable store

`JOURNAL_STATS_STORE = 'urlStats'` remains a single derived store.

`rebuildAllUrlStats()` still rebuilds that store in multiple transactions:

1. clear the currently published `urlStats` store;
2. scan authoritative Journal rows in bounded readonly batches;
3. aggregate one batch in memory;
4. merge that batch additively into the same `urlStats` store with a separate readwrite transaction;
5. repeat until exhausted.

The bounded-batch design is appropriate for memory and MV3 lifetime constraints, but each batch is a separate transaction and therefore does not constitute one atomic source snapshot or one isolated publication generation.

### 2. Point mutations still write into the same store

Normal append/delete paths can update or exact-point-rebuild `urlStats` while a full rebuild is in flight.

The current dirty-token mechanism is durable and prevents a simple lost-marker case, but it does not isolate derived data writes. A short point mutation may begin and complete while the bulk token remains live, after which the bulk rebuild can still merge stale batch data into the same published store.

### 3. Deterministic corruption schedule remains possible

Append schedule:

1. bulk rebuild clears published `urlStats`;
2. append commits Journal row X;
3. point repair computes X from the current authoritative Journal and writes the complete current point result;
4. point mutation completes while the bulk token remains live;
5. bulk rebuild later merges a stale batch containing older/current X rows into that already-complete point result;
6. bulk token completes and the marker can become clean.

The result may be numerically plausible while still double-counted.

Delete schedule is symmetric: a stale bulk batch can re-add a row contribution after a current post-delete point rebuild.

### 4. Dirty marker is repair authority, not data-generation identity

`beginJournalStatsMutation()` records durable mutation tokens; `completeJournalStatsMutation()` removes its token and removes the marker when no tokens/overflow remain.

No current field binds a `urlStats` row/store to:

- one captured Journal revision;
- one build generation;
- one publication epoch;
- one atomically selected current generation.

Therefore marker cleanliness does not prove that every row in the mutable published store was derived from one authoritative Journal revision.

### 5. Consumer fail-open remains relevant

`getJournalSummaryForUrl()` calls `ensureJournalStatsHealthy('summary-read')`, catches repair failure, and then reads `urlStats[urlKey]`.

A stale or partial row can therefore remain structurally plausible even when repair could not establish a current generation. P0-050 remains the root owner for authoritative derived-generation publication; consumer presentation must not upgrade an unverified row into exact truth.

## Why per-transaction IndexedDB atomicity is insufficient

IndexedDB provides atomicity/isolation **within a transaction** and serializes overlapping readwrite transactions. It does not automatically combine a sequence of separate clear/read/merge transactions into one logical rebuild snapshot.

Authoritative references:

- W3C Indexed Database API 3.0, transaction model and scheduling:
  `https://www.w3.org/TR/IndexedDB/`
- MDN IndexedDB key characteristics / transactional model:
  `https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology`
- MDN IndexedDB usage notes:
  `https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB`

These references support the distinction between atomicity of one transaction and application-level atomicity across many transactions.

## MV3 lifecycle relevance

Chrome documents that extension service workers may terminate after inactivity or during long-running work and recommends persisting state needed for recovery.

References:

- Chrome extension service-worker lifecycle:
  `https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle`
- Chrome service-worker termination testing guidance:
  `https://developer.chrome.com/docs/extensions/how-to/test/test-serviceworker-termination-with-puppeteer`

This reinforces the existing requirement that a partial next-generation rebuild must remain durably distinguishable from the currently published generation.

## Independent/public-project analogs

Fresh public examples show the same architecture class: expensive derived/index rebuilds under concurrent writes require explicit validation/publication fencing rather than trusting completion of independent work phases.

- OpenClaw issue #135754 describes full reindex into a replacement database and publication only if the live revision is unchanged; concurrent writes invalidate the build.
- ArcadeDB issue #5397 discusses concurrent index-build races and the requirement to publish tier-list changes atomically while expensive build work occurs outside the publication lock.
- W3C ServiceWorker issue #823 discusses races where independent cache operations are not equivalent to one atomic multi-step operation.

These projects are analog evidence only; they do not prove WebClip behavior. The WebClip defect is independently established from fresh current source.

## User/community relevance

Chrome-extension developers continue to report MV3 worker termination and lost in-memory progress/state in real projects. A recent Chrome extensions community report described a worker dying mid-operation and the need to persist operation state before the side effect. This is relevance evidence for the durability side of the acceptance contract, not proof of P0-050 itself.

Community reference:
`https://www.reddit.com/r/chrome_extensions/comments/1w6re6l/the_service_worker_dying_mid_rewrite_was_the/`

## Required P0-050 invariant

A full derived rebuild must not mutate the currently published `urlStats` generation in-place across independent source-scan batches.

A correct implementation must provide an equivalent of all of the following:

1. capture an authoritative Journal revision / source generation;
2. build into an isolated next generation while retaining bounded batch work;
3. point mutations target the current published generation or a deliberate repair/replay channel, never accidentally merge into the isolated next generation;
4. before publication, prove the source revision still matches, or replay/coalesce all admitted mutations under an explicit epoch protocol;
5. atomically publish/select the new generation;
6. only then retire the previous generation and clear the global dirty/rebuild obligation;
7. worker termination may leave a partial next generation, but that generation is never selected as current;
8. consumers return exact ordinary `urlStats` only from a proven current generation, or use a separately revision-fenced exact-point result; otherwise they degrade/return unknown.

## Deterministic model

Added model:

`project_tools/test_p0_050_urlstats_generation_revalidation_model.js`

Local validation:

- `node --check`: PASS
- execution: **PASS 27 checks**
- SHA-256: `54d70235a7fd39acce97f2ae441eb620f727bae71acdd0f605e6667059917af6`

The model proves:

- current append interleave can double-count after a complete point repair;
- current delete interleave can resurrect stale contribution;
- a point mutation may begin and complete entirely during the bulk dirty-token lifetime;
- token cleanup can reach a clean marker without proving one source generation;
- candidate isolated generation publication succeeds only when source revision is unchanged;
- concurrent append/delete blocks stale publication;
- point repair targets current generation and does not mutate the in-progress next generation;
- retry on the new revision publishes exact state;
- worker termination leaves partial next-generation data non-current;
- unverified rows degrade instead of being presented as exact.

## Semantic dedup

Fresh source confirms the same owner already documented in `RESEARCH_FAMILY_URLSTATS_EVIDENCE.md`. No new P-code is justified.

Related but distinct boundaries:

- P0-050: derived `urlStats` generation/rebuild/publication authority;
- P0-076: per-entry Journal revision + generation CAS;
- P0-072: bulk clear/replace versus already-admitted external side effects;
- Action/UI consumers may expose P0-050 symptoms but are not the root owner.

## Closure status

**P0-050 remains ACTIVE / ROOT-CAUSE-REVALIDATED.**

Pending implementation closure requires:

- versioned/isolated `urlStats` generation or equivalent epoch protocol;
- direct deterministic tests against production entry points for append/delete/rebuild interleavings;
- MV3 worker-termination/restart recovery proof;
- consumer degraded/point-fallback proof while generation is unverified;
- release-regression evidence as required by project policy.

No runtime implementation, release-readiness change, build, tag, deploy, or GitHub Release is performed by this tranche.
