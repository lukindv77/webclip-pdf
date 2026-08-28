# Audit delta — Chrome Action partial mutation failure needs repair obligation — 2026-08-28

Source-of-truth `main` immediately before this write: `0801e826f5bc22c5e7395c59367c966737f57fcc`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines existing **P1-130** Chrome Action admission/repair and **P1-170** all-tabs refresh convergence/coalescing.

The current per-tab Action generation/actual-settlement wrapper is a useful positive control. This pass finds a remaining convergence gap for **ordinary deterministic Chrome Action API rejection in the middle of a multi-call icon/badge/title update**: the error is swallowed without scheduling a repair, so a partially applied generation can remain visible indefinitely until another unrelated refresh happens.

No new root cause is needed because Action state is convergent browser-owned UI, not an irreversible physical side effect.

## Positive control — timeout/stale actual settlements have generation-aware repair

`beginActionUpdateGeneration(tabId)` issues a new per-tab generation.

`runChromeActionMutationBounded(...)`:

- refuses work whose generation is already stale;
- retains the actual Chrome API promise after logical timeout;
- on actual settlement, schedules `updateActionForTab(tabId)` when caller timed out or generation became stale;
- enforces a global pending-actual cap.

This is the right pattern for non-cancellable browser-owned UI mutations: late old settlement triggers convergence rather than being mistaken for cancellation.

## Multi-property Action update is deliberately sequential

`updateActionForTab()` updates properties in steps, typically:

1. `chrome.action.setIcon`;
2. `setBadgeText`;
3. `setBadgeBackgroundColor`;
4. `setTitle`.

Each step uses `applyChromeActionMutationBestEffort()` and generation checks between operations.

This avoids a stale old generation continuing once a newer generation has been issued.

## Ordinary Chrome API rejection is treated as “continue”

`applyChromeActionMutationBestEffort(...)` catches errors from `runChromeActionMutationBounded`.

For timeout or pending-cap errors it rethrows.

For **other errors** it returns whether the generation is still current rather than scheduling repair or returning failure.

Therefore a deterministic rejection of one Action mutation is effectively ignored if no newer generation exists.

## Deterministic partial-state schedule

1. Generation G computes desired icon/badge/title for current page state.
2. `setIcon(G)` succeeds, so the new icon is visible.
3. `setBadgeText(G)` rejects for an ordinary Chrome API error that is neither timeout nor pending-cap.
4. `applyChromeActionMutationBestEffort` returns `true` because G is still current.
5. Code proceeds to badge background/title updates, which may succeed.
6. G finishes with icon/title from new state but badge text from the previous browser state.
7. No timeout/stale-settlement hook scheduled a repair, and no explicit deterministic-failure repair exists.
8. If the tab remains otherwise quiet, the mixed UI can persist until a later navigation/Journal event/worker bootstrap happens to refresh it.

The same pattern applies to failures of badge background or title at other points in the sequence.

## Why best-effort does not mean “no convergence obligation”

It is appropriate that a single Action API error does not fail a PDF/Journal operation. Chrome Action UI is secondary/convergent.

But best-effort user-visible state should still have a bounded repair obligation:

- do not throw a product operation solely because badge update failed;
- do mark the tab/action generation dirty and retry/recompute later;
- retries must be bounded/coalesced under P1-130/P1-170.

Swallowing the error with no repair changes “best effort” into “possibly permanently inconsistent until unrelated activity.”

## Required repair contract

On any Action property mutation failure that prevents proving the desired generation was fully published:

1. retain current product operation outcome independently;
2. mark/schedule the tab for Action convergence repair;
3. repair recomputes the **whole desired Action state from authoritative current data**, not just the failed property from a stale closure;
4. issue a new generation for repair;
5. coalesce repeated failures/events;
6. use bounded backoff/cap so a persistently failing Action API cannot create a tight wake loop.

A repair may wait for the next existing durable/near-term refresh trigger if policy guarantees a bounded opportunity; otherwise schedule one explicitly.

## Full-state publication semantics

Because Chrome exposes separate mutation calls rather than one atomic Action transaction, WebClip cannot guarantee users never observe a transient partial state between calls.

The achievable invariant is eventual generation convergence:

- every completed/repaired generation either fully publishes its desired icon/badge/title state;
- or leaves a durable/bounded repair obligation;
- stale generations cannot claim convergence merely because one property succeeded.

Do not add a “generation current” flag that means only the JS computation is current; success means all required browser properties for that desired state are confirmed or repair remains pending.

## Non-http neutral state

The neutral branch also performs multiple calls:

- gray icon;
- empty badge;
- default title.

A failure clearing the badge can leave a stale numeric badge on a non-http/internal page while the icon/title look neutral. The same repair rule applies.

## Worker restart

Current bootstrap `refreshActionForAllTabs()` is a valuable eventual repair source after worker recreation.

It is not a bounded same-worker repair contract for a deterministic failure that occurs immediately after bootstrap and then receives no further trigger.

P1-130 should therefore keep per-tab dirty/repair semantics independent of requiring another worker restart.

## Required regressions

1. setIcon succeeds, setBadgeText deterministic-rejects -> product operation continues, but tab obtains bounded repair obligation.
2. Repair reruns with current data and converges icon/badge/title as one desired generation.
3. setBadgeBackgroundColor rejects -> repair is scheduled; successful title write does not erase dirty status.
4. setTitle rejects -> generation remains not fully converged and is retried boundedly.
5. Neutral non-http update: badge clear fails -> stale badge does not remain indefinitely; repair clears it.
6. Old G deterministic failure followed immediately by newer H -> repair coalesces into H/current rather than replaying G.
7. Old timed-out actual settlement lands after H -> existing late-settlement repair still converges to current state.
8. Pending actual cap rejection retains the existing P1-130 repair obligation and does not spin.
9. Persistent Chrome API deterministic failure uses backoff/cap and does not keep MV3 worker alive continuously.
10. Worker restart with dirty browser state recomputes current desired state; no stale property is treated as authority.
11. Incognito/fail-closed neutral state preserves P0-045 requirements during repair.
12. Normal successful generation adds no unnecessary repeated refresh.

## Duplicate check

- **P1-130** primary per-tab Action admission/repair owner.
- **P1-170** all-tabs wave coalescing/bounded convergence.
- Worker bootstrap Action refresh remains a positive recovery control.
- This is not P1-204 context-menu state: Action mutations are convergent and do not require durable destructive browser-generation receipt.

No P1-211 is assigned.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains **88/88 syntax + 74/74 deterministic PASS**. No build/tag/Release was created.
