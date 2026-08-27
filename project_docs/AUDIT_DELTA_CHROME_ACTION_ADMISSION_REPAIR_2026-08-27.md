# Audit delta — Chrome Action admission repair — 2026-08-27

Baseline HEAD before this audit block: `6b7fdbb334a3939a4f8c2ffb2f8c006a842d8427`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged. Canonical registry synchronization is not claimed.

## Scope

Fresh audit of Chrome Action actual-settlement admission and repair semantics around existing `P1-130`, with the Incognito classification dependency from `P0-045`.

## Result

`P1-130` must be treated as **PARTIAL / regression reopened by audit**. The global cap of 64 actual unresolved Chrome Action promises protects memory/lifetime, and late/stale promises that were actually started do schedule repair. However an update rejected because the cap is already full is rejected **before any actual promise exists**, and the runtime records no future repair obligation for that tab/generation. The caller often catches/discards the error. Once capacity later becomes available, the skipped tab can remain stale indefinitely until an unrelated future event refreshes it.

No new P-number is created.

## Exact runtime proof

`runChromeActionMutationBounded(tabId, generation, start, label)` currently does:

1. reject stale generation;
2. if `actionPendingActualSettlements.size >= MAX_PENDING_ACTION_ACTUAL_SETTLEMENTS` (`64`), throw `WEBCLIP_ACTION_PENDING_LIMIT` immediately;
3. only otherwise create `actual = Promise.resolve().then(start)` and insert it into `actionPendingActualSettlements`;
4. only that started promise's `.finally()` removes itself and calls `scheduleActionRepairForTab(tabId)` when the caller timed out or the generation became stale.

Therefore the cap rejection path has no `.finally()` and no repair receipt.

`applyChromeActionMutationBestEffort()` explicitly rethrows `WEBCLIP_TIMEOUT` and `WEBCLIP_ACTION_PENDING_LIMIT`.

`updateActionForTab()` applies several separate mutations (`setIcon`, `setBadgeText`, `setBadgeBackgroundColor`, `setTitle`) and returns/throws if one cannot be admitted. Event/fan-out callers generally invoke `updateActionForTab(...).catch(() => {})`, including:

- `tabs.onActivated` / `tabs.onUpdated` refresh paths;
- `refreshActionForAllTabs()` after Journal mutations;
- startup refresh.

Thus a cap rejection can be terminal from the application's point of view even though it is only temporary resource pressure.

## Concrete schedule

1. 64 Chrome Action promises are actually unresolved/hung.
2. tab X receives a newer Journal/action generation and calls `updateActionForTab(X)`.
3. its first Action mutation is rejected with `WEBCLIP_ACTION_PENDING_LIMIT`; no Chrome call starts.
4. the event caller catches/discards the error.
5. one of the original 64 promises eventually settles, freeing capacity. Its `.finally()` repairs only the tab/generation associated with that old promise (and only if timeout/stale conditions apply); it does not know X was skipped.
6. if no later activation/update/Journal fan-out touches X, its icon/badge/title remain stale.

This contradicts P1-130's stated repair semantics under its own admission cap.

## Required P1-130 refinement

Cap rejection must create a **bounded/coalesced repair obligation without creating another unresolved Chrome API promise**.

Suggested contract:

- keep at most one `needsRepair` receipt per tab (or another globally bounded structure), always representing only the newest Action generation;
- when admission is full, mark that tab/generation as needing repair and return/throw busy without starting `chrome.action.*`;
- when any actual Action promise settles and frees capacity, drain a bounded number of repair receipts through the same generation-aware updater;
- multiple skipped updates for one tab coalesce to the newest generation instead of adding Promise/closure waiters;
- tab removal deletes both generation and pending repair receipt;
- if capacity remains full, repair remains coalesced rather than recursively scheduling microtasks that spin;
- if a repair is superseded by a newer tab generation, only the newest state is eventually applied.

A global bound is still required for the repair set so a pathological stream of new tab IDs cannot replace the 64 actual-promise cap with an unbounded deferred-work registry. Under pressure, safe coalescing/eviction must prefer correctness of live/current tabs and never create an unbounded Promise chain.

## P0-045 dependency

After the Incognito audit, a repair is not allowed to carry only a stale URL. When X is private, the repair path must fresh-classify or retain trustworthy `tab.incognito` state and render the fixed neutral Action state without reading normal-profile Journal/urlStats. A deferred repair must not turn an Incognito tab into a normal-history lookup.

## Required regressions

1. Fill actual Action cap=64, request update for tab X, free one slot: X eventually receives its newest state without another external tab event.
2. Ten cap-rejected generations for X coalesce to one repair and apply only generation 10.
3. Cap remains full for a long interval: repair registry remains bounded and does not create recurring microtask/Promise growth.
4. X is removed before capacity frees: no repair Chrome call is made for removed tab.
5. X navigates while waiting: old generation is discarded and only latest generation can render.
6. Incognito X rejected by cap then repaired: zero Journal/urlStats reads and neutral Action state per P0-045.
7. Started Action promise times out and later settles: existing actual-settlement repair semantics remain intact and do not duplicate the cap-rejection repair.
8. `refreshActionForAllTabs()` under cap pressure eventually converges for admitted live tabs without O(T) unbounded retry fan-out; preserve P1-170 coalescing dependency.

## Classification

- Reopen/refine existing `P1-130` from REGRESSION to effectively PARTIAL until admission-pressure repair is implemented and tested.
- Preserve `P1-170` for global all-tabs fan-out/coalescing.
- Preserve `P0-045` for Incognito neutral Action state.
- No `P0-079`, `P1-198` or `P2-020` assigned by this block.

Previous product test gate was not re-run by this docs-only checkpoint.