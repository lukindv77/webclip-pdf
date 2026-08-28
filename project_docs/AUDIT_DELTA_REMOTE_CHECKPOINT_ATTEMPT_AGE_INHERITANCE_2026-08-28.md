# Audit delta — remote checkpoint attempt-age inheritance — 2026-08-28

Source-of-truth `main` immediately before this write: `3139c9da05a26c88c36087f1c606f88defba5648`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof adds a concrete lifecycle consequence to the existing immutable `pendingRemoteSaves` generation defect owned by **P1-184 + P0-074/P0-073**, with P0-079/P1-198 as attempt/content identity dependencies.

A newer physical attempt currently inherits the `createdAt` of the older row it overwrites. Recovery then uses that inherited timestamp as stale-classification authority. Therefore attempt B can be born already older than the stale threshold because it reused attempt A's Journal-id slot.

No new P-number is needed; this is another direct symptom of missing per-physical-attempt generation isolation.

## Current overwrite preserves old age

`checkpointPendingRemoteSaveIntent()` addresses the physical store by `item.id = journalEntryId`.

When an existing active row is present and is neither `remote-verified` nor `stale-unverified`, the transaction writes the new item approximately as:

`{ ...item, createdAt: Number(existing.createdAt || now) }`.

So most B fields become the new attempt's metadata, but its lifecycle birth time remains A's birth time.

The special stale-unverified retry branch does reset `createdAt: now`, which shows that the code already recognizes age as meaningful lifecycle state. The ordinary active-overwrite branch nevertheless carries old age into a distinct physical attempt.

## Recovery uses `createdAt` as physical-attempt stale evidence

`recoverPendingRemoteSaves()` computes:

`ageMs = Date.now() - Number(item.createdAt || item.updatedAt || 0)`

and when reconciliation returns 404, it can classify a row `stale-unverified` once both are true:

- age >= `PENDING_REMOTE_STALE_AFTER_MS` (24 hours);
- next attempt count >= `PENDING_REMOTE_STALE_MIN_ATTEMPTS` (6).

Those thresholds are already imperfect evidence semantics under P1-184, but even as a scheduling/archive heuristic they must describe the **same physical attempt generation**.

With current overwrite they do not.

## Deterministic age-inheritance schedule

1. Attempt A for Journal id J is prepared at time T0.
2. A remains active/unresolved for >24 hours.
3. User deliberately retries/restarts the same cached save, creating physical attempt B at T1 > T0+24h.
4. Because the physical key is still J and A is an active row, checkpoint admission writes B data while preserving `createdAt=T0`.
5. B has existed for seconds, but recovery computes `ageMs > 24h` immediately.
6. After B accumulates the minimum 404 checks, B can transition to `stale-unverified` without ever having lived through the intended 24-hour observation window.

The system therefore applies A's wall-clock history to B's external settlement.

## Attempt counters can become semantically mixed too

The replacement item normally resets fields from the newly prepared object, while later failure/recovery mutations increment whichever row currently occupies J.

Because the row does not have an immutable physical generation, there is no authoritative statement that:

- this `createdAt`;
- this `attemptCount`;
- these 404 observations;
- this account/root/path/content receipt

all belong to one external PUT/reuse attempt.

A lifecycle threshold over mixed-generation evidence is not meaningful.

## Why this matters even after changing stale retention wording

Prior audits already require that `stale-unverified` remain unresolved evidence rather than a proven negative. That avoids false certainty, but premature staling still has product consequences:

- the row stops consuming the active recovery cap;
- normal automatic recovery behavior changes;
- later retry can replace the stale row, potentially erasing/compacting evidence according to current generation defects;
- UI/OperationLog may present the attempt as old/unresolved even though the latest physical attempt is new;
- retention age calculations can eventually become detached from the physical attempt they describe.

Therefore generation-correct clocks remain required even when stale classification is made truthfully non-terminal.

## Required generation contract

Every immutable `remoteSaveGenerationId` must own its own lifecycle fields:

- `createdAt` = durable admission time of that exact physical generation;
- transfer-started/unknown timestamp;
- verification attempt count for that generation;
- last checked/error timestamps;
- stale/archive transition timestamp;
- account/root/config/publication/PDF/content receipts for the same generation.

A new physical B generation never inherits A's created/attempt clock merely because both target the same Journal id or same PDF logical save intent.

A user-facing latest-retry pointer may retain logical ancestry (`retryOf=A`) for diagnostics, but ancestry is not age inheritance.

## Recovery observations must be generation-local

A 404 or metadata result is evidence only for the exact generation/context/path queried.

If B is a new physical attempt:

- B's retry budget starts with B;
- B's age starts with B;
- A's previous 404s/age remain attached to A;
- archive policy may consider A and B independently or via an explicit family-level budget, but must not silently merge their physical settlement evidence.

## Capacity policy

Per-generation timestamps do not imply unbounded retries. Preserve hard aggregate admission caps.

If product policy wants a family-level maximum lifetime for repeated retries of one logical save, model that as a separate explicit `logicalSaveCreatedAt`/retry-family policy. Do not overload physical attempt `createdAt` with two meanings.

This distinction is important:

- logical intent age answers “how long has the user/save saga existed?”;
- physical generation age answers “how long has this external attempt's outcome been unresolved?”.

Only the second may be used to classify evidence about that attempt.

## Required regressions

1. A is 25h old; B starts now for same Journal id -> B physical `createdAt` is now, not A's timestamp.
2. Six immediate B 404 checks cannot satisfy a 24h B-age threshold.
3. A's age/404 counters remain attached to A after B begins.
4. A late result cannot increment/reset B counters or stale B.
5. B late result cannot change A archive age/state.
6. Retry from `stale-unverified` and retry from active-unresolved both produce fresh physical generations with explicit ancestry rather than row replacement semantics.
7. Same account/root/path and same PDF content still produce separate physical attempt clocks when two actual external attempts were admitted.
8. If no new external side effect is admitted and product is merely reconciling the **same** generation, its original createdAt/attempt history is retained.
9. Family-level rate/age caps, if introduced, are tested independently from physical-attempt stale classification.
10. Archive compaction never treats inherited logical age as proof that a new physical attempt is old.

## Duplicate check

- **P1-184** owns exact remote attempt/object/content reconciliation and truthful unresolved evidence.
- **P0-074/P0-073** require immutable Yandex operation/namespace generation.
- `AUDIT_DELTA_YANDEX_REMOTE_CHECKPOINT_GENERATION_2026-08-27.md` already requires a unique physical `remoteSaveGenerationId`.
- `AUDIT_DELTA_REMOTE_CHECKPOINT_FALSE_ADMISSION_RECEIPT_2026-08-28.md` covers fictional admission/phase overwrite; this checkpoint adds **cross-generation lifecycle-clock contamination**.

No P1-211 is created.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains **88/88 syntax + 74/74 deterministic PASS**. No build/tag/Release was created.
