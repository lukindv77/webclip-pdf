# Audit delta — dirty urlStats consumer fail-open — 2026-08-28

## Scope

Docs-only audit of `getJournalSummaryForUrl()` / Chrome Action consumption of derived Journal statistics. No new P-number.

Refines existing **P0-050** derived `urlStats` generation/isolation and the Chrome Action display contract.

## Finding

`getJournalSummaryForUrl(url)` currently does:

1. `await ensureJournalStatsHealthy('summary-read').catch(...)`;
2. regardless of repair failure, open Journal DB and read `urlStats[urlKey]`;
3. if a stat record exists, return `lastSavedAt/uniqueDays` as ordinary summary;
4. `updateActionForTab()` uses that summary to choose badge count, color and title.

The dirty marker means exactly that the derived store may not correspond to authoritative Journal rows. Swallowing repair failure and then consuming an existing derived row as normal truth makes the marker advisory rather than an authority boundary.

### Deterministic schedule

1. A clear/import/global stats rebuild begins and leaves `JOURNAL_STATS_DIRTY_KEY` durable.
2. The rebuild partially changes `urlStats`, then fails/times out/worker loses the repair pass.
3. Dirty marker correctly remains, proving derived state is unverified.
4. Chrome Action refresh calls `getJournalSummaryForUrl(X)`.
5. `ensureJournalStatsHealthy()` fails again; caller logs and deliberately continues.
6. Existing partial/stale `urlStats[X]` is returned.
7. Action badge/color/title are published as though the derived summary were authoritative.

The underlying Journal is not corrupted, but a correctness marker saying “do not trust this projection” is ignored by one of its primary consumers.

## Why exact point rebuild fallback is not enough

Current code only calls `rebuildUrlStatsForUrl(urlKey)` when **no** stat row exists.

A dirty store can contain a plausible but wrong row. Presence is therefore not proof of correctness while the dirty marker is active.

P0-050's future versioned derived-generation repair should make this explicit: consumers either read a proven current generation or degrade/fallback; they never infer validity from row existence.

## Required consumer contract

When `urlStats` is dirty/unverified:

- do not publish an ordinary exact `uniqueDays/lastSavedAt` from the dirty generation;
- attempt a bounded exact point read/rebuild from authoritative Journal rows when affordable and generation-safe; or
- return an explicit `unknown/degraded` summary and render neutral Action state until repair succeeds;
- do not clear the global dirty obligation merely because one URL was point-repaired;
- if a point result is used, bind it to current Journal revision so a concurrent source mutation cannot make it stale before publication.

The preferred P0-050 versioned-generation architecture can make ordinary consumers cheap: only the currently published proven derived generation is readable as authoritative.

## Acceptance cases

1. Clean current stats -> Action behavior unchanged.
2. Dirty marker + repair succeeds -> consume only the newly proven current generation.
3. Dirty marker + repair fails + stale row exists -> Action shows degraded/unknown or exact point-derived result, not stale row as normal truth.
4. Dirty marker + no row -> bounded point fallback does not falsely clear global dirty state.
5. Worker termination mid-rebuild -> next Action refresh cannot certify partial stats merely because IndexedDB contains rows.
6. Concurrent append/delete during point fallback -> published result is revision-fenced or explicitly retried/degraded.
7. Once P0-050 atomically publishes a new derived generation, Action can resume exact badge/color without scanning full Journal.

## Classification

No new blocker. This is a **consumer-side refinement of P0-050**: dirty/rebuild generation is an authority state, not only a maintenance hint.

## Validation note

Documentation only. Runtime/tests/manifest unchanged. Product tests were not rerun; historical 88/88 JS syntax + 74/74 deterministic PASS remains prior evidence. No build/tag/release.