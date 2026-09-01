# Research family evidence — Chrome/MV3 APIs / browser-owned state / extension-page transport

Family from `RESEARCH_DELTA_INDEX.md` section 10.

This document is a **lossless consolidation** of the detailed research deltas listed below. Current status and single-owner authority remain in `RESEARCH_REGISTRY.md`; this file preserves source proof, deterministic schedules, corrections, positive controls, acceptance cases and historical test/release interpretation.

Every retired source is embedded verbatim below and identified by its original filename plus SHA-256. Git history remains the secondary recovery path.

Primary owners from the navigation index: P1-123…P1-131, P1-157, P1-158, P1-166, P1-170, P1-173, P1-203, P1-204, P1-209, P1-210, P1-217.

Retired source count: **17**.

## P-code coverage

P0-001, P0-017, P0-023, P0-026, P0-039, P0-043, P0-045, P0-048, P0-050, P0-070, P0-073, P0-074, P0-075, P0-078, P0-079, P0-080, P1-004, P1-008, P1-052, P1-053, P1-057, P1-075, P1-076, P1-077, P1-086, P1-087, P1-094, P1-118, P1-120, P1-123, P1-124, P1-125, P1-129, P1-130, P1-136, P1-141, P1-156, P1-157, P1-158, P1-166, P1-169, P1-170, P1-171, P1-173, P1-175, P1-178, P1-179, P1-184, P1-192, P1-193, P1-194, P1-195, P1-196, P1-197, P1-198, P1-200, P1-201, P1-202, P1-203, P1-204, P1-205, P1-207, P1-208, P1-209, P1-210, P1-211, P1-217, P2-020

## Source ledger

| Original delta | SHA-256 | P-codes mentioned | Original title |
|---|---|---|---|
| `RESEARCH_DELTA_ACTION_DEGRADED_READ_STALE_URL_STATE_2026-08-28.md` | `cbb34002624fa4c249252e40b817007ebfdcb03d9ec32b6e56594bb14369a409` | P1-217 | Research delta — Chrome Action must not retain previous-URL truth after degraded Journal read — 2026-08-28 |
| `RESEARCH_DELTA_CHROME_ACTION_ADMISSION_REPAIR_2026-08-27.md` | `1e3f3d10659c65f79f9206ba58a4c0aeb1cffc06fb70113f30ad43e6ba46e8a0` | P0-045, P0-079, P1-130, P1-170, P1-198, P2-020 | Research delta — Chrome Action admission repair — 2026-08-27 |
| `RESEARCH_DELTA_CHROME_ACTION_PARTIAL_FAILURE_REPAIR_2026-08-28.md` | `58817f707451a793a4eb1d4ed7b66dfc22943db4cd7168f08430a5d4a23c53a8` | P0-045, P1-130, P1-170, P1-204, P1-211 | Research delta — Chrome Action partial mutation failure needs repair obligation — 2026-08-28 |
| `RESEARCH_DELTA_CHROME_READ_ADMISSION_2026-08-27.md` | `7fbcbdf8bebb787f88aee060b2a59f8d8cb221860dd5d573b76d7f1032ca0a38` | P0-074, P1-120, P1-123, P1-158, P1-170, P1-173, P1-178, P1-197 | Research delta — service-worker Chrome read admission / late precondition settlement |
| `RESEARCH_DELTA_CONTEXT_MENU_DOCUMENT_COMMAND_AUTHORITY_2026-08-28.md` | `cd9578d740a275b1a3d780209c4810b1afdbb07de5a310d6726dab8080111c6f` | P0-017, P0-023, P0-070, P1-125, P1-171 | Research delta — context-menu command authority vs source document — 2026-08-28 |
| `RESEARCH_DELTA_CONTEXT_MENU_WORKER_GENERATION_2026-08-27.md` | `a4f36dc5a3764b75a8e99c9d8f6358b89f13a476d1d6d8588e16a1f57da1b3d5` | P0-017, P0-043, P0-045, P1-086, P1-087, P1-118, P1-129, P1-130, P1-156, P1-169, P1-170, P1-173, P1-192, P1-203, P1-204 | Research delta — context-menu browser state across MV3 worker generations — 2026-08-27 |
| `RESEARCH_DELTA_DOCUMENT_COMMAND_IDENTITY_2026-08-27.md` | `0c9b7b6e92735d09b821a844da4b476b8dd28e5eeaac13d323fe1517d4d465e6` | P0-023, P0-070, P0-079, P1-125, P1-157, P1-171, P1-175, P1-193, P1-195, P1-196, P1-197, P2-020 | Document / command identity research delta — 2026-08-27 |
| `RESEARCH_DELTA_EXTENSION_PAGE_REFRESH_ACK_2026-08-28.md` | `56d90cf4825acfbc041f349a15dcd681d792a09e0ce2d96cf81ce4118aa3179a` | P1-141, P1-198, P1-201, P1-209, P1-210, P1-211 | Research delta — extension-page refresh acknowledgement / stale-read epoch composition — 2026-08-28 |
| `RESEARCH_DELTA_EXTENSION_PAGE_VERSION_REFRESH_COMMIT_POINT_2026-08-28.md` | `6b6331ccd0b9472dce59a08df71e654557207a2580de4ee7e3bd5c9eea8e37a5` | P1-008, P1-136, P1-158, P1-170, P1-192, P1-208, P1-209 | Research delta — extension-page version refresh commit point — 2026-08-28 |
| `RESEARCH_DELTA_FRAME_AGENT_WORKER_RESTART_LIFECYCLE_2026-08-27.md` | `f1858c85ba590ee47ddb8bad5f10f9b4bf867d55025981c5c8ac2c9c08b37f9a` | P0-075, P1-004, P1-171, P1-192, P1-193, P1-200, P1-201, P1-202, P1-203 | Research delta — cross-origin frame-agent lifecycle across MV3 worker restart — 2026-08-27 |
| `RESEARCH_DELTA_MV3_BACKGROUND_LIFECYCLE_2026-08-27.md` | `c7acd4ea3fa06dd71715aa3aa76d25d754a8e11866e75540e10bf886ad87699b` | P0-073, P0-074, P0-078, P1-052, P1-053, P1-075, P1-076, P1-077, P1-118, P1-179, P1-192, P1-194, P1-197 | Research delta — MV3 background lifecycle ownership / crash-safe wake scheduling |
| `RESEARCH_DELTA_POPUP_CHROME_API_SETTLEMENT_2026-08-28.md` | `2d82ad2129583a824f6b1c0cc09633db54fb236056b73eda3e7106179091dedd` | P0-023, P0-045, P0-070, P0-079, P1-125, P1-157, P1-171, P1-175, P1-193, P1-198, P1-201, P1-211 | Research delta — popup Chrome API settlement / exact-document command lifecycle — 2026-08-28 |
| `RESEARCH_DELTA_POPUP_CONTEXT_START_SELECTION_PARITY_2026-08-28.md` | `ea57070101d8314a93e60fd705acb4982ab581fb0a8c809903693483a9b6c84a` | P0-001, P0-017, P0-023, P0-070, P0-080, P1-125 | Research delta — popup/context-menu Start Selection semantic parity — 2026-08-28 |
| `RESEARCH_DELTA_POPUP_DOCUMENT_COMMAND_AND_FRAME_PERMISSION_AUTHORITY_2026-08-28.md` | `61436fb543b1bbbfc7849b2b0d661ad30320fbca459e566d7ad04e19e01b17b0` | P0-070, P1-004, P1-157, P1-171 | Research delta — popup command / iframe activation authority vs active document generation — 2026-08-28 |
| `RESEARCH_DELTA_RECONCILIATION_DISCOVERY_AFTER_PAGE_LOSS_2026-08-28.md` | `00f065daa7d8e3ad05b7efe5ad4055d1c2c2e3b000bbd3a837d2042cc0096735` | P0-023, P0-039, P0-048, P0-073, P0-074, P1-052, P1-156, P1-184, P1-197, P1-198, P1-205, P1-207, P1-209, P1-210, P1-211 | Research delta — durable reconciliation discovery after page loss/reload — 2026-08-28 |
| `RESEARCH_DELTA_SERIALIZED_QUEUE_ADMISSION_COVERAGE_2026-08-27.md` | `018e20d3bbaee89cbac9bd53e4500357784f1bd67b4a4fe895c92553916d3145` | P0-026, P0-050, P1-057, P1-094, P1-120, P1-123, P1-173 | Research delta — serialized actual-settlement queue admission coverage — 2026-08-27 |
| `RESEARCH_DELTA_TAB_CREATE_MV3_RECEIPT_2026-08-28.md` | `a61205b18137ef940e4856988dcd21eacb165e8e84a149a3f60cbe058161f12f` | P1-124, P1-125, P1-130, P1-136, P1-166, P1-170, P1-192, P1-204, P1-210 | Research delta — tabs.create MV3 crash receipt — 2026-08-28 |

## Lossless source transcripts

The sections below preserve the original UTF-8 Markdown text verbatim. Historical statements remain evidence, not independent current status authority; `RESEARCH_REGISTRY.md` controls status/ownership.
## Retired source: `RESEARCH_DELTA_ACTION_DEGRADED_READ_STALE_URL_STATE_2026-08-28.md`

SHA-256 of UTF-8 source text: `cbb34002624fa4c249252e40b817007ebfdcb03d9ec32b6e56594bb14369a409`

# Research delta — Chrome Action must not retain previous-URL truth after degraded Journal read — 2026-08-28

Docs-only research checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

**New P1-217** — Action icon/badge/title must have an explicit unknown/degraded state when the current URL's Journal summary cannot be read; failure of generation B must not leave generation A's visual state attached to the tab.

This composes with existing Action latest-generation fencing and `urlStats` dirty/rebuild recovery, but it is a separate presentation-truth invariant.

## Source proof

`updateActionForTab(tabId, knownUrl)` starts a fresh per-tab action generation.

For non-HTTP(S) URLs it explicitly installs a gray icon, clears badge and sets neutral title.

For HTTP(S) URLs the next major step is:

```js
const summary = await getJournalSummaryForUrl(url);
```

Only after the summary successfully returns does code calculate color/badge/title and mutate `chrome.action`.

If that summary read/rebuild throws, `updateActionForTab()` rejects before any new icon/badge/title is published.

Most event callers deliberately swallow the error:

```js
chrome.tabs.onActivated.addListener(({ tabId }) => {
  updateActionForTab(tabId).catch(() => {});
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    updateActionForTab(tabId, changeInfo.url || tab?.url || '').catch(() => {});
  }
});
```

Therefore Chrome keeps the previously installed per-tab action state.

## Deterministic stale-state schedule

1. Tab T is on URL A.
2. A has recent Journal history; Action displays A's green icon/badge/title.
3. T navigates to HTTP(S) URL B.
4. `tabs.onUpdated` starts new Action generation B.
5. `getJournalSummaryForUrl(B)` hits an IndexedDB timeout/error or a stats-repair failure that prevents summary completion.
6. Generation B rejects before publishing any state.
7. Caller swallows the error.
8. Chrome Action for T still shows the icon/badge/title last published for A even though T now displays B.

Latest-wins generation fencing does not help: there is no late A write here; the stale A visual state simply remains installed.

## Why this matters

The Action encodes user-facing facts such as:

- whether the current URL has Journal history;
- how recent the last save was;
- number of unique saved days.

Retaining A's state on B is stronger than a missing refresh indicator: it presents a positive statement about the wrong URL.

The same principle applies after import/dirty-marker recovery: failure to prove current summary must not be rendered as either stale prior truth or as a false confirmed zero.

## Required state model

For each tab/current URL generation distinguish at least:

1. `loading/unknown` — current summary not yet proven;
2. `known-empty` — exact current URL has no Journal history;
3. `known-history` — current summary is proven and icon/badge encode it;
4. optionally `degraded/error` — summary could not be read and retry/self-heal is pending.

On a URL/document generation change, old URL-specific visual state loses authority immediately.

Implementation options:

- synchronously/early publish a neutral unknown icon + empty badge before the asynchronous current-URL read, then replace it on success;
- or maintain an explicit action receipt keyed by `{tabId,url/documentGeneration}` and only expose state if its receipt matches the current tab generation.

A neutral degraded state must not be visually indistinguishable from a verified “never saved” state if product UX relies on that distinction.

## Error handling / repair

- failed `urlStats` repair remains recoverable through existing dirty-marker maintenance;
- Action may schedule a bounded best-effort refresh rather than polling;
- read failure must not trigger destructive repair or block unrelated PDF save;
- a later successful generation can publish current truth normally.

## Regression cases

1. A has green badge -> navigate B -> B summary read fails -> A badge/title disappear; B is shown unknown/degraded.
2. B summary later succeeds empty -> publish known-empty state.
3. B summary later succeeds with history -> publish B-specific badge.
4. A late read response after navigation cannot overwrite B (retain existing generation fence).
5. B read fails after import dirty-marker state -> no false zero and no stale pre-import URL state.
6. Non-HTTP URL continues to get neutral state.
7. Action mutation API itself failing does not cause an older queued generation to regain authority.
8. Refresh/retry remains bounded and does not create a wake loop.

## Numbering result

**P1-217 is assigned to this Action degraded-read presentation-truth root cause.**

Existing `urlStats` repair owns derived-data correctness; existing Action generation fencing owns late-write ordering. P1-217 owns what is displayed when the newest current-URL read itself cannot establish truth.

## Validation note

Documentation only. Product tests were not rerun; historical 88/88 JavaScript syntax + 74/74 deterministic PASS remains prior evidence only. Real Chrome Action regression is required. No build, tag or Release was created.

## Retired source: `RESEARCH_DELTA_CHROME_ACTION_ADMISSION_REPAIR_2026-08-27.md`

SHA-256 of UTF-8 source text: `1e3f3d10659c65f79f9206ba58a4c0aeb1cffc06fb70113f30ad43e6ba46e8a0`

# Research delta — Chrome Action admission repair — 2026-08-27

Baseline HEAD before this research block: `6b7fdbb334a3939a4f8c2ffb2f8c006a842d8427`.

Docs-only research checkpoint. Production runtime and `manifest.json` are unchanged. Canonical registry synchronization is not claimed.

## Scope

Fresh research of Chrome Action actual-settlement admission and repair semantics around existing `P1-130`, with the Incognito classification dependency from `P0-045`.

## Result

`P1-130` must be treated as **PARTIAL / regression reopened by research**. The global cap of 64 actual unresolved Chrome Action promises protects memory/lifetime, and late/stale promises that were actually started do schedule repair. However an update rejected because the cap is already full is rejected **before any actual promise exists**, and the runtime records no future repair obligation for that tab/generation. The caller often catches/discards the error. Once capacity later becomes available, the skipped tab can remain stale indefinitely until an unrelated future event refreshes it.

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

After the Incognito research, a repair is not allowed to carry only a stale URL. When X is private, the repair path must fresh-classify or retain trustworthy `tab.incognito` state and render the fixed neutral Action state without reading normal-profile Journal/urlStats. A deferred repair must not turn an Incognito tab into a normal-history lookup.

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

## Retired source: `RESEARCH_DELTA_CHROME_ACTION_PARTIAL_FAILURE_REPAIR_2026-08-28.md`

SHA-256 of UTF-8 source text: `58817f707451a793a4eb1d4ed7b66dfc22943db4cd7168f08430a5d4a23c53a8`

# Research delta — Chrome Action partial mutation failure needs repair obligation — 2026-08-28

Source-of-truth `main` immediately before this write: `0801e826f5bc22c5e7395c59367c966737f57fcc`.

Docs-only research checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

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

## Retired source: `RESEARCH_DELTA_CHROME_READ_ADMISSION_2026-08-27.md`

SHA-256 of UTF-8 source text: `7fbcbdf8bebb787f88aee060b2a59f8d8cb221860dd5d573b76d7f1032ca0a38`

# Research delta — service-worker Chrome read admission / late precondition settlement

Date: 2026-08-27
Source `main` HEAD researched immediately before this write: `08410536a45d931988db83f41d2e09e707167709`
Scope: research/docs only. Production runtime/config/manifest untouched.

## Classification

No new P-number created. Fresh inventory strengthens **P1-158 OPEN** and adds a specific read→write admission requirement. It also cross-references **P1-170 OPEN**, **P1-120 REGRESSION** and **P1-173 OPEN** without replacing their root causes.

## What is already correctly bounded

The current service worker has centralized bounded helpers for many read paths:

- OperationLog settings and settings export/import marker reads use `readChromeStorageBounded()`;
- backup storage reads use the same helper;
- prepared Save As session reads are bounded;
- `chrome.tabs.get()` has a bounded helper;
- `chrome.downloads.search()` reconciliation paths are bounded;
- `chrome.alarms.get()` is bounded;
- frame optional-permission `permissions.contains()` is bounded.

So P1-158 is not a blanket statement that every Chrome read is raw; the remaining gaps are identifiable.

## Critical remaining Yandex config reads

### `readYandexAuthState()`

It still performs:

`chrome.storage.local.get('yandexConfig')`

as a direct member of `Promise.all`, while session/legacy OAuth reads use the Yandex auth storage helper.

This is the already-registered P1-158 auth-critical proof: a hung local config read can hold token/config resolution before the network request/operation deadline meaningfully begins.

### `getYandexConfig()`

It still directly awaits `chrome.storage.local.get('yandexConfig')` with no bounded read helper.

This helper feeds multiple privileged/long operations, including upload/recovery, Yandex locate/move, backup/status and publication-policy decisions. Each caller should not have to remember an outer timeout that may not include this prerequisite.

Acceptance: use one bounded config-read primitive or immutable operation context with remaining-budget semantics; a late read result after returned timeout must not launch a later network/destructive side effect.

## Stronger P1-158 proof — read→write config mutation can start after caller timeout

`updateYandexConfig()` serializes config mutations correctly with an actual-settlement queue, but its `actual` task is:

1. direct `chrome.storage.local.get('yandexConfig')`;
2. call `mutator(current)`;
3. `chrome.storage.local.set({ yandexConfig: nextConfig })`.

The caller waits on the **whole actual task** with a 10-second local timeout.

If step 1 remains pending longer than that deadline:

- caller receives a terminal timeout;
- no config write has started yet;
- later, the raw `storage.get` may settle;
- the still-running `actual` continuation then executes the mutator and starts `storage.set` for the first time **after the caller was already told the operation timed out**.

This is distinct from the valid rule "timeout != cancellation" for a side effect that was already sent. Here the mutating phase had not begun when the deadline won.

### Required P1-158 acceptance refinement

For read→write helpers, use an explicit admission boundary:

- prerequisite reads are bounded before mutation admission;
- if their deadline wins, their late result is ignored and must not trigger the subsequent write;
- once the actual non-cancellable write is sent, keep the existing actual-settlement ordering barrier and treat timeout as unknown settlement, not cancellation;
- UI/result semantics must distinguish `timed out before mutation started` from `mutation started, outcome unknown`.

This requirement applies directly to `updateYandexConfig()` and should be used as the pattern for future Chrome read→mutation helpers.

## Crash-consistency stats marker cross-check

`beginJournalStatsMutation()` / `completeJournalStatsMutation()` execute direct `storage.local.get` inside their serialized marker task before set/remove. P1-120 already owns ordering of actual marker mutations.

Fresh research does **not** create a new stats item, but acceptance should make the phase distinction explicit:

- if a marker write/remove already started, retain actual-settlement ordering;
- if caller deadline wins while still waiting only on a prerequisite read, do not later start a new write solely because that read finally resolved, unless the helper intentionally defines and surfaces that delayed mutation as an accepted pending state.

For a begin-marker, a late extra dirty marker is safer than missing a required marker, so implementation policy may differ from user settings; nevertheless it must be deliberate/tested rather than an accidental consequence of an unbounded read continuation.

## Direct tab reads / fan-out

Two service-worker `chrome.tabs.query({})` paths remain direct:

- `reloadOpenExtensionPagesAfterVersionChange()`;
- `refreshActionForAllTabs()`.

The first is startup best-effort refresh and is not currently a critical operation blocker because it is launched fire-and-forget.

The second belongs mainly to P1-170: Journal changes can launch an O(T) action refresh wave; an unresolved `tabs.query` has no local deadline and the wider flow lacks global coalescing/concurrency control. P1-158 supplies the bounded-read requirement; P1-170 owns fan-out/coalescing.

## Journal context exception

`chrome.storage.session.get(null)` inside serialized Journal-context creation is also direct, but P1-123 intentionally binds the mutation chain to actual settlement while exposing a bounded caller wait and preventing `tabs.create` after local timeout. An orphan context produced by a late actual settlement is bounded by the existing TTL/cap.

Do not mechanically replace this with a helper that would release ordering early. The research requirement is phase-aware admission, not "put Promise.race around every Chrome call".

## Duplicate check

- P1-158 owns unbounded prerequisite reads and late read results that can cross a terminal deadline into later side effects.
- P1-173 owns unbounded queued turns behind a hung actual settlement.
- P1-120 owns stats-marker ordering/correctness.
- P1-170 owns action-refresh O(T) fan-out/coalescing.
- P1-178/P0-074 own auth/config generation authority, not API read lifetime.
- No P1-197 assigned.

## Test matrix

1. `getYandexConfig()` never settles -> controlled timeout before network/destructive call.
2. `readYandexAuthState()` config read never settles -> token path terminates bounded; no Yandex fetch starts later.
3. `updateYandexConfig()` prerequisite get settles after caller deadline -> **no later set** is started.
4. config set itself starts and settles after caller deadline -> next mutation remains ordered behind actual settlement and UI treats outcome as unknown/pending, not cancelled.
5. direct action-refresh `tabs.query` never settles -> future coalesced refresh can self-heal without unbounded waves (P1-170).
6. stats-marker delayed read behavior is explicitly tested according to the chosen safety policy.

## Retired source: `RESEARCH_DELTA_CONTEXT_MENU_DOCUMENT_COMMAND_AUTHORITY_2026-08-28.md`

SHA-256 of UTF-8 source text: `cd9578d740a275b1a3d780209c4810b1afdbb07de5a310d6726dab8080111c6f`

# Research delta — context-menu command authority vs source document — 2026-08-28

Source-of-truth `main` before this checkpoint: `4a20a5399ccd60c4e9fed6d59534a7d1c1a2794c`.

Docs-only research checkpoint. Runtime/config/tests/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh source proof refines **P0-017** and **P0-070**, and composes with **P0-023**, **P1-125** and **P1-171** document-generation requirements.

The new result is that the document-identity gap starts earlier than `WEBCLIP_GENERATE_PDF`: browser context-menu commands themselves lose the identity of the document on which the user invoked the menu.

## Current context-menu flow is tab-bound

`chrome.contextMenus.onClicked` calls `handleContextMenuClick(info, tab)`.

For ordinary page commands current code:

1. checks captured `tab.id` and captured `tab.url`;
2. calls `ensureWebClipContentScript(tab.id)`;
3. that helper executes `content.js` with `target: { tabId }`;
4. then the worker calls `chrome.tabs.sendMessage(tab.id, { type: 'WEBCLIP_COMMAND', command })`.

Neither the injection target nor the final message target contains the exact top-document `documentId`/navigation generation that existed when the context-menu action was invoked.

The scripting settlement helper is already capable of including `target.documentIds` in its logical key, but this caller does not supply one and explicitly uses request key `content:<tabId>`.

## Deterministic same-URL retarget schedule

1. Top document A is loaded at `https://example.test/item`.
2. User opens the Chrome context menu on A and selects `Скачать PDF`, `Основной контент`, `Прочитать позже` or another page command.
3. Chrome enters `contextMenus.onClicked` and WebClip receives a `tab` object describing A.
4. Before `ensureWebClipContentScript()` / `tabs.sendMessage()` settles, A performs a full reload to document B at the exact same URL.
5. The worker still sees the same `tab.id`; captured URL comparison cannot distinguish A from B.
6. `scripting.executeScript({ target:{tabId} })` installs/observes WebClip in B.
7. `tabs.sendMessage(tabId, WEBCLIP_COMMAND)` is delivered to B.
8. The command the user invoked on A has silently become a command on B.

For selection commands this changes the page/document the user is manipulating. For save commands it composes with P0-070 and can eventually print/cache/finalize B under command intent that originated on A.

## Cross-URL navigation has a second window

The current `handleContextMenuClick()` checks the captured `tab.url`, not a fresh exact document receipt immediately before delivery.

Therefore a cross-URL navigation after the event but before message delivery can also retarget the command. The new URL may still be HTTP(S), so even adding a fresh protocol-only `tabs.get()` check would not prove that the command still belongs to the clicked document.

A URL equality check would remain insufficient because same-URL full reload is the core failing schedule.

## Context-menu semantics are not just “current tab” semantics

The browser menu invocation is a concrete user action on a concrete rendered document. WebClip should not silently reinterpret that action as “whichever document happens to occupy this tab when asynchronous preparation finishes”.

This matters even before an irreversible side effect:

- `start` / `auto-content` can start selection on a page the user did not invoke the menu on;
- `clear` can clear a newer document's WebClip state;
- `finish` / `download` / `yandex` / `read-later` can act on a newer selection/document generation;
- `retry-yandex` additionally composes with P0-023 cached-PDF document identity;
- error notification sent after a failed old command can also target a replacement document, though that is secondary UX rather than the primary authority defect.

## Required P0-017/P0-070 interface

A context-menu page command needs an immutable source-document receipt at admission.

The receipt should bind at least:

- `tabId`;
- exact top `documentId` or equivalent full-navigation generation;
- canonical URL observed for that document;
- command/request generation;
- operation id where the command can lead to an irreversible save.

All later page-targeting steps must consume the same receipt:

1. content-script presence/injection;
2. `WEBCLIP_COMMAND` delivery;
3. selection/save-dialog state that the command opens;
4. final `WEBCLIP_GENERATE_PDF`/cached-PDF operation receipt when applicable.

If Chrome cannot target the original document because it has navigated away, the command must fail closed with a clear stale-document result. It must not be replayed automatically against the replacement document.

## Injection settlement key must include document generation

`scriptExecutionRequestKey()` already knows how to encode `target.documentIds`, but `ensureWebClipContentScript(tabId)` supplies an explicit `content:<tabId>` logical key.

Consequently an unresolved/late injection belonging to document A is logically shared at tab scope with a later request for document B.

The document-bound design should either:

- target the exact document generation and key the singleton receipt by that generation; or
- invalidate/reconcile the old receipt before admitting injection for a replacement document.

P1-125 continues to own generic `scripting.executeScript()` actual-settlement behavior; this delta adds the required document identity of this caller.

## Journal-opening context-menu commands

`journal-url` / `journal-site` use the captured `tab.url` to create Journal source context. They do not directly mutate the page, so they are less severe than page commands, but they still inherit event-time vs later-document semantics.

The product should define the source receipt consistently: a Journal page opened from document A should either remain explicitly a context for A's captured URL/document, or report that the source document became stale. It must not accidentally mix captured A metadata with live B command authority later when `Apply` is used.

Existing Journal exact-document command work remains the owner for downstream Apply behavior.

## Required regression cases

1. Invoke context-menu `start` on A; same-URL reload to B before injection -> B is not silently selected; stale-document result.
2. Invoke `auto-content` on A; navigate to another HTTP(S) origin before message delivery -> command cannot run on B.
3. Invoke `download`/`yandex` on A; same-URL reload before dialog command -> no save operation for B under A's receipt.
4. Invoke `read-later` on A; replacement document before final save -> no PDF/cache/Journal finalization for B.
5. Late `scripting.executeScript()` success for A after local timeout cannot authorize or suppress the exact-document injection required by B.
6. A fresh context-menu invocation on B receives a new document/command generation and works normally.
7. `retry-yandex` after same-URL reload remains constrained by P0-023 cached-PDF document receipt.
8. `journal-url` captures an explicit source context and later Journal Apply cannot use that old context as authority for a replacement document.

## Duplicate check / numbering

No new item is created.

- **P0-017** owns context-menu parity with the main page handlers.
- **P0-070** already owns exact live-document identity for save/PDF authority; this checkpoint moves the required fence earlier to context-menu command admission.
- **P0-023** remains cached-PDF retry document identity.
- **P1-125** remains generic scripting late-settlement ownership.
- **P1-171** remains cross-origin child-frame registry/command document binding.

## Test / release state

Docs-only research checkpoint. Product tests were not rerun. Historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** remains previous evidence only. Real unpacked Chrome same-URL context-menu navigation QA remains required. No build, tag or Release was created.

## Retired source: `RESEARCH_DELTA_CONTEXT_MENU_WORKER_GENERATION_2026-08-27.md`

SHA-256 of UTF-8 source text: `a4f36dc5a3764b75a8e99c9d8f6358b89f13a476d1d6d8588e16a1f57da1b3d5`

# Research delta — context-menu browser state across MV3 worker generations — 2026-08-27

Source-of-truth `main` immediately before this write: `527ba479b35637d77fa3872d280c5173b2bccba0`.

Docs-only research checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed.

## New confirmed item: P1-204 — context-menu destructive rebuild is fenced only inside one service-worker generation

**Classification:** P1 / evidence-reserved / confirmed by fresh runtime research.

Repository-wide duplicate-check covered current priorities and late research deltas. Adjacent items exist, but none owns this exact browser-owned side-effect lifecycle:

- **P0-017** — product requirement that context-menu actions exist and use the same handlers;
- **P1-118** — serialized late-settlement ordering for Chrome **alarm** create/clear operations, including context-menu repair alarms;
- **P1-130** — Chrome Action mutation deadlines/generation repair;
- **P1-170** — all-tabs Action refresh fan-out;
- **P1-173** — admission pressure in serialized actual-settlement queues;
- **P1-192** — lifecycle ownership of long background jobs.

P1-204 is narrower and different: `chrome.contextMenus.removeAll()/create()` mutate browser-owned menu state, while the ordering barrier that prevents a late old mutation from overtaking a newer rebuild exists only in module memory and disappears when the MV3 service worker generation disappears.

## Fresh source proof

### 1. Context-menu mutations deliberately track actual callback settlement

`service-worker.js` defines:

- `CONTEXT_MENU_API_TIMEOUT_MS = 10_000`;
- `contextMenuLateMutationBarrier = Promise.resolve()`;
- `contextMenuInitializationPromise = null`.

`runContextMenuCallbackMutation()` correctly uses callback APIs for Chrome 118–122 compatibility and explicitly documents the non-cancellation rule: if the local deadline wins, the Chrome side effect is still considered alive.

Before starting a new mutation in the **same worker**, it waits on `contextMenuLateMutationBarrier`. It then stores the new actual callback promise into that barrier and returns only a bounded caller wait.

This is a good same-generation control: a locally timed-out `removeAll/create` is not treated as cancelled and a later rebuild in the same worker cannot immediately overtake it.

### 2. The rebuild contains a destructive `removeAll()` boundary

`initializeContextMenus()` performs a full browser-state rebuild:

1. `chrome.contextMenus.removeAll(...)`;
2. create the WebClip menu items sequentially through the same callback-settlement wrapper.

Therefore ordering is stronger than ordinary idempotent reads: if an old `removeAll()` settles after a newer generation has recreated the menu, the newer menu can be erased.

Likewise a late old `create()` can repopulate browser state after a newer generation believed a different rebuild outcome was terminal.

### 3. The late-mutation barrier is not durable across worker restart

Both `contextMenuLateMutationBarrier` and `contextMenuInitializationPromise` are ordinary module variables.

If worker generation A terminates after issuing a browser-owned context-menu operation but before its callback settlement is observed, generation B starts with:

`contextMenuLateMutationBarrier = Promise.resolve()`.

Generation B therefore has no proof that generation A still has an outstanding browser mutation.

This is not fixed by the fact that generation A's JavaScript promise disappears: the browser API call was already issued, and local worker loss is not a cancellation/rollback acknowledgement for browser-owned state.

### 4. Existing crash-safe repair alarm is valuable but is a watchdog, not a generation fence

The current code does significantly better than an unguarded startup rebuild.

`initializeContextMenusCrashSafe(previousAttempt)` pre-arms a uniquely named Chrome alarm before entering `initializeContextMenus()`. If the worker dies during the rebuild, that durable alarm can wake a later worker and retry. Context-menu repair alarm create/clear uses the existing serialized Chrome-alarm contract from P1-118.

This is an important positive control and must be preserved.

However the repair protocol is finite:

- `CONTEXT_MENU_REPAIR_MAX_ATTEMPTS = 3`;
- each retry creates another rebuild generation;
- the browser context-menu API itself carries no WebClip generation token;
- the old `removeAll/create` operation is not proven settled merely because a later repair attempt completed.

A watchdog says “try convergence again later”; it does not prove “no older browser mutation can still arrive after this convergence.”

### 5. `runtime.onStartup` is not an ordinary service-worker restart hook

The code initializes context menus from `runtime.onInstalled` and `runtime.onStartup`, and repair alarms cover interrupted rebuilds.

`runtime.onStartup` corresponds to browser/profile startup, not every MV3 worker recreation. Therefore ordinary worker-generation correctness must come from durable repair state itself; it cannot rely on a fresh `onStartup` after every service-worker termination.

### 6. Deterministic failure schedules

#### Schedule A — old remove overtakes a repaired menu

1. Generation A arms repair alarm A1.
2. A issues `contextMenus.removeAll()`.
3. A is terminated before its callback settlement is known.
4. Repair alarm A1 wakes generation B.
5. B has an empty in-memory late-mutation barrier, arms A2, performs its own remove/create sequence and obtains callbacks that look successful.
6. B clears/supersedes its own repair state according to the current protocol.
7. Browser-side remove from generation A settles late after B's creates.
8. WebClip menu is absent again, even though the newest worker observed a successful rebuild.

A subsequent still-armed repair may happen to fix this, but correctness currently depends on the late old operation settling before the finite repair chain is exhausted.

#### Schedule B — never-observed callback consumes finite repairs

1. A browser mutation changes menu state but its callback is never observed by the owning worker generation.
2. Same-generation timeout correctly refuses to overtake the unknown actual settlement.
3. Repair alarms retry only a bounded number of times.
4. Without a durable terminal/reconciliation rule, browser menu state may remain incomplete until an unrelated browser startup/install event triggers another rebuild.

The desired property is eventual authoritative convergence, not only “three best-effort retries.”

## Why this is P1 rather than P0

The failure can remove or stale the extension's context-menu entry points and break a required product surface, but this source proof does not show Journal corruption, destructive Yandex mutation, credential disclosure or unauthorized page authority.

The normal popup/content flows remain available, so this is lifecycle/reliability and is classified P1.

If a future context-menu item performs a destructive operation whose stale identity itself can authorize the wrong target, that exact destructive authority should be evaluated separately under the relevant P0 generation/identity owner.

## Required P1-204 contract

### Durable rebuild generation

A context-menu rebuild needs an extension-owned durable generation/receipt that survives worker termination.

At minimum the protocol must distinguish:

- rebuild generation issued;
- destructive remove phase issued/unknown/settled;
- create phase issued/settled;
- authoritative convergence verified/terminal.

Do not infer old-operation cancellation from worker death or caller timeout.

### Old generation must not be able to declare newer state terminal

Because Chrome context-menu calls do not accept an application generation token, the implementation must design around that limitation.

Acceptable approaches may include a durable quiescence/reconciliation protocol, idempotent known-ID reconstruction plus a generation-aware watchdog, or another design that guarantees a final rebuild occurs only after every previously issued browser mutation is known settled/obsolete.

A finite retry count alone is not the proof.

### Preserve callback compatibility

The extension supports Chrome 118. The current callback-based completion observation for APIs that only gained Promise support later is intentional and must remain compatible with the minimum supported Chrome version.

Do not “fix” P1-204 by switching blindly to Promise forms unavailable on supported versions.

### Repair alarm remains durable and serialized

Keep the useful pre-armed repair alarm pattern, but tie it to the durable rebuild generation.

Late clear/create of the repair alarm itself remains governed by P1-118. An old alarm clear must not delete a newer recovery schedule.

### Boundedness without false terminal success

All browser API waits remain bounded for callers/workers. A timeout should expose `unknown/pending recovery`, not `success` and not `cancelled`.

If the implementation cannot prove convergence after the normal retry budget, retain a lower-frequency durable repair/check mechanism or explicit degraded state rather than silently abandoning recovery.

## Required deterministic / browser regressions

1. Generation A issues `removeAll`, worker is forcibly terminated before callback, repair generation B recreates menu, then A's simulated late remove settles: a later authoritative recovery restores the exact menu and no false terminal-success state remains.
2. Old `create` settlement after a newer rebuild cannot leave duplicate/stale menu structure as final state.
3. Same-generation local timeout still prevents a newer mutation from overtaking an actually unresolved old callback.
4. Worker death between pre-armed repair alarm and `removeAll` leaves a durable wake and converges without duplicate menu items.
5. Worker death after `removeAll` but before first `create` converges to the complete menu.
6. Worker death halfway through multiple creates converges to exactly one copy of every expected item.
7. Late repair-alarm `clear` cannot delete a newer repair generation (P1-118 composition).
8. Forced repeated worker termination beyond the ordinary three-attempt window does not leave context menus permanently absent solely because the finite counter was exhausted.
9. Chrome 118 callback path remains covered; no regression assumes Promise support added only in later Chrome versions.
10. Browser restart/onStartup rebuild remains a useful independent self-heal but is not required for ordinary worker-restart convergence.

## Duplicate check / numbering

- New evidence-reserved **P1-204** assigned.
- **P0-017** remains functional context-menu parity/availability.
- **P1-118** remains alarm mutation late-settlement ordering.
- **P1-130** remains Chrome Action per-tab mutation generation/repair.
- **P1-170** remains Action all-tabs fan-out/coalescing.
- **P1-173** remains unbounded waiting-turn admission for serialized queues.
- **P1-192** remains lifecycle ownership/wake of long background operations.
- **P1-203** remains injected cross-origin frame-agent lifecycle across worker restart.

No new P0 or P2 number is created.

Canonical `PRIORITIES_P0_P1_P2.md` / `DEEP_RESEARCH_2026-08-25.md` synchronization remains pending as a separate lossless registry-reconciliation step.

## Other major blocks completed in this pass

### Offscreen transfer/recovery

No new number. Durable transfer/result staging, TTL cleanup and offscreen actual-transfer admission were rechecked. Worker loss of a runtime response is already governed by existing unknown-settlement/checkpoint/reconciliation owners; current pass did not prove a separate result-generation adoption bug.

Existing **P1-086 PARTIAL** remains important: offscreen readonly IndexedDB helpers can publish request data before transaction completion and therefore can start Blob/fetch side effects from data whose readonly transaction later aborts. That is already explicitly registered and was not duplicated.

### Incognito shared state / optional permissions

No new number. Fresh popup/manifest research re-confirmed the missing Incognito fence around backup-status display and optional iframe host-permission request, but `RESEARCH_DELTA_INCOGNITO_POPUP_PERSISTENT_STATE_2026-08-27.md` already records both as an extension of **P0-045**.

### Local download / native Save As

No new number. Automatic-download durable intents remain owned by **P0-043/P1-087**. Native page-owned Save As ownership and recovery gaps remain owned by **P1-129/P1-156/P1-169**. No independent worker-generation receipt bug was proven beyond those contracts.

### Chrome Action convergence

No new number. Service-worker module evaluation already calls `refreshActionForAllTabs()`, so browser-persisted Action state receives a bootstrap refresh when a worker is recreated. The all-tabs read/mutation fan-out remains the existing **P1-170** problem and was not renumbered.

## Test / release state

No runtime/config/manifest change was made. Product tests were not rerun for this docs-only checkpoint. The last established product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** unless superseded by a newer independently recorded gate. No build, tag or GitHub Release was created by this research write.

## Retired source: `RESEARCH_DELTA_DOCUMENT_COMMAND_IDENTITY_2026-08-27.md`

SHA-256 of UTF-8 source text: `0c9b7b6e92735d09b821a844da4b476b8dd28e5eeaac13d323fe1517d4d465e6`

# Document / command identity research delta — 2026-08-27

Baseline source HEAD: `1ad02e5f0da6ad0402f23e81c7108720469797a8`.

This checkpoint records fresh evidence against existing document/navigation P-items. It is not a canonical registry replacement and does not assign a new P-number. Production/runtime/config/manifest are unchanged by this commit.

## Existing P1-175 refinement — generic privileged page-command dispatch is not document-bound

P1-175 currently describes stale Journal source-tab application. Fresh review confirms the same admission weakness in ordinary context-menu and popup commands.

### Context menu

`handleContextMenuClick(info, tab)` receives a tab snapshot when the user clicks the menu, but for page commands it subsequently performs asynchronous `ensureWebClipContentScript(tab.id)` and finally `chrome.tabs.sendMessage(tab.id, { type: 'WEBCLIP_COMMAND', command })` using only `tabId`.

Affected commands include at least:

- `start` / `auto-content`;
- `mode-include` / `mode-exclude`;
- `suggest-ads` / `clear` / `finish`;
- `download` / `yandex` / `retry-yandex`.

`content.js` confirms these commands are not inert notifications: they mutate selection state, open save workflows and can trigger cached-PDF retry. Navigation can therefore occur after the context-menu click but before injection/send, causing the user's command to execute in a different current document/site.

Required extension:

- Capture exact source document identity/generation at user-command admission, not merely `tabId` and a URL string.
- Immediately before any injection/send, fresh-check that the same top-document generation is still current; otherwise fail closed with an explicit stale-navigation result.
- Where Chrome supports exact `documentId` targeting, use it for the final message/injection. A tab-level navigation generation remains useful for coordinating code paths that do not expose documentId directly.
- A navigation after user admission must never silently retarget `download/yandex/start/clear/...` to the new document.

This is the same root cause as P1-175's stale source-tab command admission and should be implemented through one shared document-bound command helper rather than separate fixes.

## Existing P0-070 / P0-023 refinement — save/retry commands share the same admission fence

For `download` and `yandex`, the generic command race composes with P0-070: the save command itself can land in a different document before that document asks the worker to generate the PDF. P0-070 must therefore fence the entire save generation from user-command admission through `Page.printToPDF` and post-print cache/download/upload, not only the final debugger call.

For `retry-yandex`, same-URL navigation/reload still composes with P0-023: a cached PDF belongs to the originating document generation, so a new document with the same URL must not inherit retry authority.

Required regression:

1. Context menu `download` on document A → navigate to B before injection/send: B receives no save command and no PDF side effect starts.
2. Same-URL reload between context-menu retry admission and final retry check: old PDF cache is rejected by exact document generation.
3. Navigation after print but before cache/download/upload finalization remains covered by P0-070's post-print generation check.

## Existing P1-125 / P1-171 refinement — script-injection late receipt is keyed too coarsely

`ensureWebClipContentScript(tabId)` calls `executeScriptSingletonBounded({ target: { tabId }, files:['content.js'] }, requestKey=logical content per tab)` without exact document targeting.

`scriptExecutionSettlements` also persists a timed-out late-success receipt under a key derived primarily from tab/target details. `tabs.onUpdated` clears these settlements only when `changeInfo.url` is present, not on a same-URL full-document reload.

Consequences already belonging to P1-125/P1-171:

- an injection started for document A can settle after navigation/reload;
- a same-URL reload does not necessarily clear the logical per-tab late receipt;
- a retry in document B can consume an A-generation late-success receipt and skip a needed B-generation injection, or an old injection can land after the intended command generation has become stale.

Required direction:

- key script-execution receipts by exact top-document generation/documentId where meaningful;
- invalidate per-tab logical injection receipts on every full-document loading/navigation generation, not only URL-string changes;
- a late A-generation success is a receipt for A only and cannot satisfy B-generation admission.

No new P1 number is assigned; this is the already documented scripting/document-lifetime half of P1-125/P1-171.

## Existing P1-193 / P1-171 refinement — optional-permission flow must bind grant candidates to the exact document

Fresh `popup.js` review confirms:

- the grant click obtains `tab = getActiveSourceTab()`;
- discovery injects top `content.js`, sends `frame-access-candidates`, and computes host origins asynchronously;
- `chrome.permissions.request()` is then awaited;
- after grant, `enableGrantedFrameAgents(tab.id)` uses the old tab id without a fresh exact-document check.

P1-193 already requires a two-phase gesture-safe UX and says the candidate set should be bound to source tab/document generation. Fresh evidence shows this is required not only before the permission prompt but **again after the user-owned prompt settles**, because the tab may have navigated while the prompt was open.

Required regression:

- discover candidates on document A → user grants after A navigates to B → permission may remain granted at browser level, but WebClip must not inject/enable A-derived frame agents in B. Candidate generation becomes stale and requires fresh discovery.

## Existing P1-157 refinement — popup still has direct unbounded Chrome operations

Fresh popup review identifies concrete calls outside the existing `readPopupExtensionApiBounded()` helper:

- `startButton`: direct `chrome.tabs.query(...)`;
- `readLaterButton`: direct `chrome.scripting.executeScript(...)` and direct `chrome.tabs.sendMessage(...)`;
- `settingsButton` / `authHelpButton`: direct `chrome.runtime.sendMessage(...)`;
- the user-owned `chrome.permissions.request()` is currently wrapped in an ordinary local deadline helper, which P1-157 already says is incorrect because timeout is not cancellation of a browser permission prompt.

This strengthens P1-157 rather than creating a new item. Reads/idempotent page commands need bounded latest-generation handling; user-owned/non-idempotent prompts need actual-settlement semantics without blind timeout/retry.

## Number allocation

P1-195/P1-196 remain evidence-reserved from the OAuth checkpoint. **P1-197, P0-079 and P2-020 remain unassigned after this block.**

## Test / release evidence

Research documentation only. No production/runtime/config/manifest change. Product tests were not rerun; the earlier `88/88 syntax + 74/74 deterministic PASS` remains historical release-gate evidence only.

## Retired source: `RESEARCH_DELTA_EXTENSION_PAGE_REFRESH_ACK_2026-08-28.md`

SHA-256 of UTF-8 source text: `56d90cf4825acfbc041f349a15dcd681d792a09e0ce2d96cf81ce4118aa3179a`

# Research delta — extension-page refresh acknowledgement / stale-read epoch composition — 2026-08-28

Source-of-truth `main` immediately before this write: `67bca21a8c9ac5d002b36ec34dc79d7c8eae988b`.

Docs-only research checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Classification

Fresh research refines existing **P1-209** and records its composition with **P1-141**. No independent P1-211 root cause is created.

- **P1-209** remains the primary owner: extension-page version refresh needs a crash-safe pending→completed generation rather than publishing success before repair.
- **P1-141** remains the page-local read single-flight freshness owner across mutation epochs.
- **P1-198** worker-issued operation identity is conceptually reusable for exact repair/session receipts but is not replaced by this page-version protocol.

## Current source still commits version success before any page repair

Current `reloadOpenExtensionPagesAfterVersionChange()` still performs:

1. read manifest version;
2. read `webclipRuntimeBuildVersion`;
3. if unequal, write current version into `chrome.storage.local`;
4. only then enumerate tabs;
5. issue `chrome.tabs.reload(tab.id)` for extension-root tabs;
6. suppress individual reload errors.

Therefore original P1-209 remains fully reproducible.

## New acceptance refinement — `tabs.reload()` settlement is not a current-page-generation acknowledgement

Moving the completed marker from before `tabs.reload()` to immediately after all reload calls settle would improve commit ordering, but it is still weaker than the product invariant.

The Chrome Tabs API exposes `tabs.reload()` as `Promise<void>` and documents it as an operation that reloads a tab. It does not return a new document id, extension build version, or page-ready receipt.

Current WebClip source has no explicit post-reload handshake in which the newly loaded `journal.html`, `options.html` or other extension page proves to the worker:

- its exact page/document generation;
- the running extension build/manifest version;
- that its startup code reached a usable protocol-ready point.

Therefore `reload()` command settlement alone should be treated as **reload requested/accepted**, not as an authoritative proof that the target now runs current page code.

## Failure schedule after the obvious P1-209 fix

Even if the worker is changed to write completed B only after `Promise.all(reloadCalls)`:

1. version transition A→B is detected;
2. worker persists pending B;
3. `tabs.reload(X)` returns/resolves for an open extension tab X;
4. worker immediately persists completed B;
5. target page load is interrupted, crashes, remains invalidated, or otherwise never reaches current WebClip page startup/protocol readiness;
6. next worker start sees completed B and has no durable repair obligation for X;
7. X remains stale/broken until an unrelated/manual reload.

The exact browser failure mechanics may differ by reload/update mode, but the repository currently has no page-side evidence capable of disproving this schedule once the reload command itself has settled.

P1-209 should therefore define completion in terms of the repaired page generation, not merely the control API call that requested repair.

## Required P1-209 acknowledgement contract

### Pending generation first

Persist a bounded repair record before page repair:

- `targetVersion`;
- random `refreshGenerationId`;
- `phase: pending | completed | incomplete`;
- bounded attempt/failure metadata.

### Enumerate current extension pages per attempt

Re-enumerate current tabs on each repair attempt and validate extension-root URLs. Do not treat old tab ids as durable page identity.

For each target, capture an attempt-scoped target receipt sufficient to reject a stale old-page acknowledgement.

### Reload is an intermediate state

A successful `tabs.reload()` settlement moves a target to something equivalent to `reload-issued`, not directly to generation-complete.

### Current page must acknowledge its generation/version

After load, the extension page should send or answer a bounded worker handshake carrying at least:

- current manifest/build version observed by that page;
- page kind (`journal`, `options`, etc.);
- a fresh page/session nonce created by the current page document;
- enough sender/document identity to reject an acknowledgement from a superseded document.

The worker should accept completion only for a page that still corresponds to a current enumerated extension tab and proves version B/current protocol readiness.

Implementation may use a worker challenge, page startup registration, or another exact current-document handshake. Do not rely only on URL/tabId.

### Bounded incomplete state

A page that never acknowledges must not keep a hot retry loop forever. Retain a bounded durable repair obligation and retry on safe future wake(s), then expose truthful `incomplete/degraded` state if policy limits are exhausted.

False completed state is not acceptable.

## P1-141 composition — page-local read epochs must not cross current-page repair generations

Options currently keeps unresolved read-only RPCs in `readOnlyRuntimeInFlight` and may reuse one old actual Promise for a newer logical refresh unless a mutation epoch invalidates reuse.

A successful page reload naturally creates a fresh JS context and therefore discards the old page's in-memory read map. That is a useful positive control **only after the new page generation is proven loaded**.

Before P1-209 repair is acknowledged, a surviving/invalidated old Options page can still hold:

- old logical UI generations;
- unresolved single-flight actuals;
- old mutation/read epoch assumptions;
- old message schemas/validation behavior.

Therefore the refresh protocol must not use "worker marker says version B" as proof that page-local P1-141 state was reset. Only the current-page ACK can establish that a new page context actually exists.

Conversely, P1-141's mutation-epoch fix must not attempt to make an invalidated old page compatible with a new worker. Page-version repair and read freshness are separate layers:

1. P1-209 replaces/reloads stale page code and establishes current page generation;
2. P1-141 prevents a current page from relabelling a pre-mutation read actual as post-mutation truth.

## Worker/page protocol safety

Do not relax worker sender ACL or message schema to make stale pages work during the repair window.

A stale page may fail privileged calls cleanly. Repair correctness is to converge it to current code, not to accept old authority.

Page acknowledgements themselves must be treated as extension-internal protocol messages with exact sender/page-kind checks; a host/content-script message cannot self-declare an extension-page refresh complete.

## Required regressions

1. Marker A → start B → persist pending B → worker dies before enumeration: next worker retries.
2. `tabs.reload(X)` rejects: B stays pending/incomplete; no completed marker.
3. `tabs.reload(X)` resolves but no current-page ACK arrives: B is not marked completed solely from reload settlement.
4. Reload resolves; old/superseded document sends late ACK: rejected by exact page/document refresh generation.
5. Current B page starts and ACKs with fresh page nonce/version B: target becomes reconciled.
6. Two extension tabs: one ACKs, one fails; global B remains pending/incomplete until policy reconciles/retire-disappears the second.
7. Target closes during repair: re-enumeration treats disappearance idempotently; no permanent pin.
8. Worker dies after page ACK but before completed marker: next attempt safely rechecks/reloads/ACKs; duplicate repair is bounded and preferable to false success.
9. Worker dies after completed B: no unnecessary B repair on later start.
10. Version C starts while B pending: C supersedes B; late B page ACK cannot mark C complete.
11. Old Options page contains unresolved P1-141 read actual during forced reload: completed B is not published until a new page context proves current version; old read map is never treated as current B state.
12. Within the new B Options page, a read A overlapping a mutation B still obeys P1-141 mutation-epoch freshness; page-version ACK does not substitute for state-revision provenance.
13. Large number of extension pages uses bounded reload/ACK concurrency and does not create an unbounded registry of dead tab ids.
14. Normal non-extension tabs are never reloaded or admitted as ACK participants.
15. Protocol rejection from stale page remains fail-closed; repair does not weaken privileged message validation.

## Duplicate check / numbering

No new P0/P1/P2 number is created.

Primary owner: **P1-209**.

Composed read freshness: **P1-141**.

P1-201…P1-210 remain occupied and **P1-211 remains unassigned by this block**.

## Test / release state

Research documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were **not** rerun. The last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Version remains `0.9.8`; no build, tag or GitHub Release was created.

## Retired source: `RESEARCH_DELTA_EXTENSION_PAGE_VERSION_REFRESH_COMMIT_POINT_2026-08-28.md`

SHA-256 of UTF-8 source text: `6b6331ccd0b9472dce59a08df71e654557207a2580de4ee7e3bd5c9eea8e37a5`

# Research delta — extension-page version refresh commit point — 2026-08-28

Source-of-truth `main` immediately before this write: `560b3b08b3e89acd159eb9941e7427bf07118947`.

Docs-only research checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged by this commit.

## New confirmed item: P1-209 — extension-page refresh publishes the version-success marker before the best-effort page reloads have actually succeeded

**Classification:** P1 / evidence-reserved / update/recovery crash-consistency.

This finding is intentionally scoped. Standard Chrome Web Store update installation normally waits for the extension to become idle, and open extension pages participate in preventing that idle state. The concrete product risk here is forced/unpacked/runtime reload/update recovery and any startup state where a tab containing an older/invalidated extension page still exists and this worker-side repair is relied on to refresh it.

## Fresh source proof

Current worker-start code calls:

`reloadOpenExtensionPagesAfterVersionChange().catch(...)`.

The helper implements this order:

1. read current `chrome.runtime.getManifest().version`;
2. read `chrome.storage.local[webclipRuntimeBuildVersion]`;
3. if already equal, return;
4. **write `webclipRuntimeBuildVersion = currentVersion`;**
5. query all tabs;
6. reload tabs whose URL starts with the extension root;
7. suppress individual `tabs.reload()` errors.

The durable marker in step 4 is therefore a **pre-repair admission marker but is interpreted on future starts as a completed-success marker**.

## Failure windows

### 1. Worker termination after marker commit

A deterministic sequence is:

1. previous marker is version A;
2. worker for version B starts;
3. worker writes marker B;
4. worker is terminated before `tabs.query()` or before all `tabs.reload()` calls settle;
5. an old/invalidated extension page remains open;
6. later worker start reads marker B == current version B and returns immediately;
7. no durable obligation remains to retry that page refresh.

The operation is not crash-consistent because its commit point precedes the repair it claims.

### 2. `tabs.query()` error is silently terminal for the generation

Current code does:

`try { tabs = await chrome.tabs.query({}); } catch (_) { return; }`

Because marker B was already committed, a transient/bounded API failure leaves the generation permanently classified as refreshed.

There is no next-start retry unless the manifest version changes again.

### 3. Individual `tabs.reload()` errors are suppressed

Each matching tab is reloaded inside `try/catch (_) {}` and the aggregate `Promise.all()` therefore resolves even when one or more reloads failed.

Again, marker B is already durable and no per-tab or generation repair obligation survives.

### 4. This is distinct from ordinary stale-response generation fencing

There is no conflicting newer refresh required to reproduce the defect. One version transition B plus one failure after the marker write is sufficient.

The defect is therefore commit-point ordering / durable repair ownership rather than an out-of-order response race.

## Product effect

A surviving page from the previous/invalidated extension context can contain:

- older message shapes;
- older client-side validation/policy;
- older progress/session semantics;
- stale cached UI state;
- direct Chrome API paths from the old page implementation.

The new worker may reject those calls, which is preferable to accepting incompatible authority, but the user-visible page can remain broken until manual reload. If protocol compatibility is only partially changed, mixed-generation behavior can be subtler than a clean error.

This item therefore requires refresh **truthfulness and self-heal**, not relaxation of worker ACL/schema checks.

## Chrome lifecycle scope

Chrome's documented standard update lifecycle waits for an extension to become idle before installing an update; open extension pages can keep the extension non-idle. Therefore P1-209 should not be described as proof that normal Web Store updates always hot-swap underneath open options/journal pages.

However unpacked/developer reload and explicit runtime reload invalidate extension contexts, and the repository already contains this refresh helper precisely to repair surviving extension-page tabs after a version change. P1-209 researchs the correctness of that repair once it is attempted.

## Why this is not P1-158 / P1-170

- **P1-158** owns direct/unbounded Chrome reads in service-worker critical paths.
- **P1-170** owns unbounded/coalescing behavior of large all-tab Chrome Action refresh waves.

Bounding `tabs.query()` or limiting reload concurrency is useful but does not fix the semantic defect: even a bounded query can fail after the success marker has already been published.

## Why this is not P1-192

**P1-192** owns lifetime of long alarm-started background operations under MV3 service-worker suspension.

P1-209 reproduces even if the worker stays alive: an ordinary `tabs.query()` or per-tab `tabs.reload()` failure is swallowed after the durable marker was committed. The missing element is a crash-safe one-shot repair state machine, not only a keepalive/lifecycle owner.

## Positive controls elsewhere in the same startup layer

### Context menu rebuild

The current context-menu path explicitly pre-arms a repair alarm before destructive/rebuild work (`P1-136`) and only clears its repair obligation after successful rebuild.

That is the safer shape: failure does not silently convert incomplete repair into success.

### Settings import reconciliation

Settings import uses a durable reconciliation marker (`P1-008`, albeit still needing generation ownership). The intended architecture again distinguishes "data write may have settled" from "derived repair definitely finished".

Extension-page refresh currently has no equivalent pending/completed distinction.

## Required P1-209 contract

### Separate pending from completed generation

Do not write `webclipRuntimeBuildVersion = B` as the sole success marker before reload work.

Use a versioned refresh state such as:

- `targetVersion`;
- random refresh generation/id;
- `phase: pending | completed`;
- created/attempt timestamps;
- bounded failure diagnostics.

A worker restart that sees `pending B` must retry/reconcile B rather than assuming success.

### Success commit after actual repair

Publish `completed B` only after the intended bounded tab enumeration/refresh pass has actually settled according to the chosen policy.

If a tab disappeared concurrently, that may be a successful no-longer-needs-repair outcome. A reload error for a still-existing extension tab is not equivalent.

### Per-tab failures must create repair obligation or explicit degradation

Do not silently swallow failed reloads and still declare the whole version repaired.

Acceptable designs include:

- bounded retry on a later worker wake;
- retaining failed tab ids only as short-lived hints while re-enumerating current extension tabs on retry;
- a one-shot repair alarm similar to context-menu repair;
- explicit maximum retry count followed by truthful `refresh-incomplete` diagnostics rather than false completed state.

Do not rely on tab ids as permanent identity across arbitrary browser lifetime; re-enumerate and validate current extension-root URL on each repair pass.

### Keep work bounded

A browser can contain many tabs. Do not replace `Promise.all` with an unbounded retry storm.

Use bounded concurrency/admission and preserve P1-158/P1-170 Chrome-call deadline/queue requirements.

### Do not weaken protocol checks

A stale page that failed to refresh must not be granted compatibility by accepting unsafe/obsolete privileged messages. Current sender ACL/schema checks remain authoritative; page refresh is UX/runtime convergence, not a trust bypass.

## Required deterministic regressions

1. Marker A -> start B -> persist pending B -> terminate worker before tab enumeration: next worker retries B.
2. `tabs.query()` fails once: B is not marked completed; later wake repairs successfully.
3. Two extension tabs exist; reload of one succeeds and one fails: generation remains pending/incomplete until the surviving failed tab is reconciled or explicitly retired by bounded policy.
4. A target tab closes during repair: disappearance is handled idempotently and does not pin repair forever.
5. Worker terminates after all reloads succeed but before completed marker write: next pass may safely re-enumerate/reload again; duplicate page reload is preferable to false success and remains bounded.
6. Worker terminates after completed marker write: later wake performs no unnecessary repeat for the same version.
7. Newer version C arrives while B repair metadata exists: C supersedes B with an explicit generation rule; old B task cannot mark C completed.
8. Large number of open extension tabs is handled with bounded concurrency/API calls.
9. Non-extension tabs are never reloaded by this repair.
10. Standard page reload error does not cause the worker to relax runtime message validation for the stale page.
11. Unpacked/forced extension reload with an invalidated `journal.html` or `options.html` tab converges to the current page code or a truthful bounded incomplete state.
12. Fresh install with no extension pages reaches completed current-version state without unnecessary retries.

## Number allocation

- New evidence-reserved **P1-209** assigned.
- P1-208 remains remote-save recovery phase fairness.
- No P0/P2 number is assigned.

## Test / release state

Research documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were not rerun; historical gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`. No build, tag or GitHub Release was created.

## Retired source: `RESEARCH_DELTA_FRAME_AGENT_WORKER_RESTART_LIFECYCLE_2026-08-27.md`

SHA-256 of UTF-8 source text: `f1858c85ba590ee47ddb8bad5f10f9b4bf867d55025981c5c8ac2c9c08b37f9a`

# Research delta — cross-origin frame-agent lifecycle across MV3 worker restart — 2026-08-27

Source-of-truth `main` immediately before this write: `e371cbca9e1a92261c5da04accaae0132943b05a`.

Docs-only research checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed.

## New confirmed item: P1-203 — an injected cross-origin frame-agent can outlive the MV3 worker generation that owns its registry/control session

**Classification:** P1 / evidence-reserved / confirmed by fresh runtime research.

Repository-wide semantic duplicate-check was performed against the canonical priorities, previously read late research deltas, the current P1-202 comment-deletion commits, and focused search for `P1-203` / worker-restart frame-agent lifecycle. Existing items cover adjacent but different failures:

- **P1-171** — child/top document identity across navigation, same-URL reload, reused frameId, stale LIST/COMMAND/REGISTER/STATE;
- **P1-201** — optional host permission revocation while an injected agent remains alive;
- **P1-192** — ownership/wake/recovery of long background operations when the service worker terminates;
- **P1-200** — command/control generation and stale response ordering within a remote-frame session;
- feature-level **P1-004** — cross-origin iframe functionality.

None of those owns the independent MV3 process-lifetime boundary in which the **same child document and same granted permission remain alive**, `frame-agent.js` remains injected and stateful, but the service worker is restarted and loses its in-memory registry.

## Fresh runtime proof

### 1. Frame-agent authority is stored only in service-worker module memory

`service-worker.js` declares:

`const frameAgentsByTab = new Map();`

The registry is not persisted and has no worker-generation receipt outside the current service-worker instance.

Therefore ordinary MV3 worker termination/restart initializes an empty registry even when already injected content/frame scripts in web documents remain alive.

### 2. The child agent registers only on script evaluation/re-evaluation

At `frame-agent.js` startup:

- if the script has already run in that child document (`__WEBCLIP_FRAME_AGENT_LOADED__`), a repeated injection sends one `WEBCLIP_FRAME_AGENT_REGISTER` and returns;
- on first evaluation the agent installs its implementation and sends one REGISTER at the end.

There is no periodic registration heartbeat, worker-generation challenge, reconnect port, or runtime-restart notification that causes the already-loaded agent to register with a newly created service worker.

Thus worker restart by itself does not re-run the agent and does not reconstruct `frameAgentsByTab`.

### 3. Ordinary STATE traffic cannot self-heal the missing registry

The agent sends `WEBCLIP_FRAME_AGENT_STATE` through `sendState()` after selection changes and several phase transitions.

Fresh worker `forwardFrameAgentState()` does:

1. derive tabId/frameId;
2. get `frameAgentsByTab` record;
3. reject when `!record` (also when documentId changed or permission is absent).

The error says the frame-agent is not registered/stale/permission-revoked.

Therefore the first STATE event after worker restart is **not** treated as a safe re-registration handshake. It fails closed at the worker boundary, while the child-side state remains alive.

### 4. The orphan agent can retain active page interception

`frame-agent.js` keeps state in the child document:

`{ phase, mode, includes, excludes, printStyle, changedAttrs, ... }`.

During `selecting` it installs capture-phase `click` and `keydown` listeners. During `review` or `printing`, the click handler calls `preventDefault`, `stopPropagation` and `stopImmediatePropagation`.

Worker restart does not remove these listeners because they live in the child renderer/document, not the service-worker process.

So a frame can remain locally in a WebClip control phase while the new worker has no registry entry through which the top frame/worker can reliably address and stop it.

### 5. `printing` is the strongest concrete orphan state

`preparePrint()`:

- sets `state.phase = 'printing'`;
- performs resource mutations tracked in `changedAttrs`;
- inserts `PRINT_STYLE_ID` and stores the style element in `state.printStyle`.

Normal rollback requires `restorePrint()` to remove the print style and restore changed attributes.

The Escape handler only:

- changes phase to idle;
- removes click/keydown listeners;
- sends STATE.

It does **not** remove `state.printStyle` and does not replay `changedAttrs` rollback.

Therefore forced worker termination after remote `prepare-print` but before matching `restore-print` can leave a cross-origin child document with WebClip print CSS/resource mutations installed even though the new worker no longer knows the agent exists. This is stronger than a temporary stale registry display: it is an orphaned DOM-control lifecycle.

### 6. Re-injection can recover registration, but it is not a crash-safe lifecycle contract

If some later flow explicitly executes `frame-agent.js` again in the same document, the loaded guard sends REGISTER and can reconstruct a new worker record.

That is a useful positive control, but it is event-dependent:

- worker restart does not guarantee such an injection;
- an orphan printing/review state can persist until an unrelated future feature path performs injection;
- registration alone does not tell the new worker whether the old session should be resumed or forcibly cleaned up;
- a new top/content session must not accidentally adopt stale selections/print state without exact generation proof.

Recovery must therefore be explicit rather than relying on future incidental reinjection.

## Why this is independent from P1-171

P1-171 is primarily a **document/navigation identity** problem: the worker has stale registry records and may address the wrong document/frame generation after reload/navigation/detach.

P1-203 reproduces with:

- no navigation;
- same tabId;
- same frameId;
- same child `documentId`;
- same top document;
- permission still granted.

Only the service-worker generation changes. The old registry disappears while the child-side agent state survives.

The fixes compose: P1-203 re-registration/recovery must still satisfy P1-171 exact child/top document identity. It must not weaken P1-171 by accepting any message from the same frameId as current authority.

## Why this is independent from P1-201

P1-201 is permission lifecycle: the agent can remain active after host permission is revoked and ordinary cleanup commands themselves become permission-blocked.

P1-203 reproduces while permission remains valid. The lost authority is the worker-memory generation, not permission state.

A unified implementation may use the same agent session-generation protocol for both restart and revoke, but the triggers and required evidence are different.

## Required P1-203 contract

### Worker-generation/session handshake

The cross-origin control plane needs an explicit worker/session generation protocol rather than assuming a module-memory map lives as long as injected agents.

A safe design should include a fresh worker-issued nonce/generation for the active top-frame selection/print session. Child agents must be able to discover that their previous worker/session is gone and reconcile without trusting host-page data.

Possible mechanisms include a bounded heartbeat/re-registration handshake or an extension-owned port/session protocol. Exact mechanism is implementation choice; the invariants below are mandatory.

### Re-registration after worker restart

An already injected child agent may re-register with a new worker only after fresh validation of:

- extension sender identity;
- still-granted exact optional host permission (including exact port scope per current research refinement);
- exact child `documentId` / frameId;
- exact current top-document generation/documentId per P1-171;
- current feature/session generation.

Do not infer authority from tabId/frameId alone.

### Reconcile state, do not silently adopt it

When a new worker encounters an old agent with state from an unknown previous worker generation, it must make an explicit decision:

1. **resume** only if there is a durable/current top-session receipt proving the exact selection/print generation is still owned; or
2. **fail-closed cleanup** the child-local state and start from a clean idle state.

A new worker must not silently accept stale includes/excludes/printing state as belonging to a newly opened selection session merely because the same child document survived.

### Crash-safe local cleanup path

The protocol needs a way to restore child-local state even when the worker registry was lost.

For orphan `printing`, cleanup must include:

- remove `PRINT_STYLE_ID` / `state.printStyle`;
- restore all `changedAttrs` exactly once;
- restore the appropriate post-print phase or idle state;
- remove stale interception listeners when the old session is not resumed.

Cleanup addressing must itself satisfy current document/permission identity. Do not introduce a generic command surface that hostile pages can invoke.

### Top-frame convergence

The top content script must not keep stale remote-frame snapshots/session mappings after the worker generation is lost. Re-registration should either:

- reconstruct exact current child state under the same proven top-session generation; or
- emit a bounded explicit reset/removal event so top-frame selection state converges.

### Permission revoke composition

If permission was revoked while the worker was dead:

- re-registration must fail as authority;
- local child state still requires fail-closed cleanup per P1-201;
- regrant creates a **new** permission/session generation and must not automatically resurrect old selection/print state.

### No artificial persistence of hostile-page data

Do not solve restart by blindly persisting raw frame-agent snapshots/DOM locators in unrestricted storage. Any minimal recovery receipt must remain bounded, extension-owned and carry exact document/session provenance; host DOM is hostile and snapshot/privacy bounds still apply.

## Required deterministic / real-browser regressions

1. Inject agent, enter selecting, forcibly terminate service worker while child/top documents remain unchanged, wake a new worker: agent re-registers/reconciles or is cleanly stopped; it never stays indefinitely orphaned.
2. Same test in review phase: capture click interception cannot remain orphaned after restart recovery.
3. `prepare-print` succeeds, service worker is killed before `restore-print`, new worker wakes: print style and all temporary attributes are deterministically restored unless the exact same proven print session intentionally resumes.
4. Worker restart followed by child STATE before any reinjection: protocol self-heals safely; current behavior (STATE rejected forever until incidental injection) is not accepted.
5. Restart with same frameId/documentId but **new top-document generation**: P1-171 prevents adoption into the new top session.
6. Restart after same-URL child reload with reused frameId: old child/session cannot register as current generation.
7. Permission revoked while worker is down: wake/re-registration does not restore authority; child local control state is cleaned up fail-closed.
8. Permission revoked then regranted after restart: old selections/print state do not revive automatically under the new permission generation.
9. Two successive worker restarts while one child document survives: registry/session state remains bounded and converges without duplicate records/listeners.
10. >64 sequential dynamic frame lifecycles plus worker restart preserves P1-171 stale-record pruning and does not turn re-registration into unbounded registry growth.
11. Hostile child sends fake STATE/REGISTER messages after restart: extension sender/document/permission/session checks prevent self-authorization beyond the already granted exact frame capability.
12. Top-frame UI is informed of reset/resume exactly once and cannot combine pre-restart remote snapshot with a new unrelated selection generation.
13. Forced restart during `prefetchSelected()` before print-style insertion still rolls back any `changedAttrs` recorded before termination/reconciliation.
14. Worker restart while agent is idle causes only bounded handshake work and no unwanted user-visible selection/print mutation.

## Relationship to existing items

- **P1-203** owns worker-generation loss while the same injected frame document survives.
- **P1-171** owns exact top/child document generation and frameId reuse/navigation/detach.
- **P1-200** owns command/control operation generations and stale responses within a session; its receipt can be reused as part of P1-203 restart reconciliation.
- **P1-201** owns permission revocation cleanup and revoke→regrant behavior.
- **P1-193** owns user-gesture-safe permission admission and candidate generation.
- **P1-192** remains background-operation lifetime/wake scheduling; it does not own renderer-side frame-agent state.
- **P0-075** remains hostile synthetic-input/control-plane trust; restart recovery must not weaken trusted-event requirements.
- **P1-004** remains feature-level PARTIAL until all cross-origin iframe lower-level contracts and unpacked Chrome QA pass.

## Duplicate check / numbering

The fresh `main` introduced P1-202 in `RESEARCH_DELTA_COMMENT_DELETION_RETENTION_SEMANTICS_2026-08-27.md`, so P1-202 is not reused.

Focused repository search found no existing P1-203 assignment or frame-agent worker-restart lifecycle delta. This checkpoint therefore evidence-reserves **P1-203**.

No new P0/P2 number is created.

## Test / release state

No production runtime/config/manifest changes were made. Product tests were not rerun for this docs-only research checkpoint. The last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Version remains `0.9.8`; no build, tag or Release was created.

## Retired source: `RESEARCH_DELTA_MV3_BACKGROUND_LIFECYCLE_2026-08-27.md`

SHA-256 of UTF-8 source text: `c7acd4ea3fa06dd71715aa3aa76d25d754a8e11866e75540e10bf886ad87699b`

# Research delta — MV3 background lifecycle ownership / crash-safe wake scheduling

Date: 2026-08-27
Source `main` HEAD researched immediately before this write: `912210a6d9b68c1e415026af0f3d6c4ed4098d65`
Scope: research/docs only. Production runtime/config/manifest untouched.

## Classification

No new P-number created. Fresh proof strengthens **P1-192 OPEN** and provides a concrete crash-safe scheduling acceptance. Existing stage deadlines/lease work remains useful but does not solve worker lifetime by itself.

## Alarm callback still does not own long async work

Current `chrome.alarms.onAlarm` invokes background work as fire-and-forget promises:

- `runDueJournalBackup('periodic-alarm', false).catch(...)`;
- `runDueJournalBackup('retry-alarm', true).catch(...)`;
- `runLoggedOperationLogCleanup('alarm').catch(...)`.

The listener returns immediately. There is no explicit lifecycle owner around the full async operation.

## Strong backup schedule-loss sequence

The periodic Journal backup alarm is created as a one-shot `{ when }`, not `periodInMinutes`.

`runDueJournalBackup()` reaches `exportJournalBackupToYandex()`, which:

1. obtains the backup lease;
2. may reconcile a pending upload;
3. otherwise runs `stageFullJournalExport()`;
4. only after the snapshot renews the lease and starts network/offscreen upload;
5. schedules the next periodic alarm after success, or schedules retry in the error path for background failures;
6. releases the lease in `finally`.

`stageFullJournalExport()` has a five-minute overall build deadline and performs primarily IndexedDB/JSON staging work before the later offscreen/network heartbeat phase.

If MV3 terminates the worker during that pure-IDB window:

- the one-shot periodic alarm that woke the worker has already been consumed;
- success path never schedules the next periodic alarm;
- catch path never schedules a retry alarm;
- finally never releases the lease;
- the durable lease will eventually expire, but **lease expiry is not itself a Chrome wake source**.

The only recovery is a future unrelated worker wake followed by scheduler self-heal. That is not a guaranteed background schedule.

## Required P1-192 crash-safe scheduling refinement

Before entering a potentially >30 s background phase, pre-arm a durable wake/watchdog that survives worker death.

One safe model:

1. acquire durable operation/lease state;
2. arm a recovery alarm for a time compatible with the stage/lease maximum before heavy pure-IDB work begins;
3. run the bounded operation under an explicit lifecycle owner if supported/appropriate;
4. on verified success, atomically/serialized clear or supersede the watchdog and schedule the next periodic alarm;
5. on handled failure, replace watchdog with normal retry schedule;
6. after worker crash, watchdog wakes a new worker, which sees expired/abandoned lease/checkpoint and reconciles before retrying.

The exact implementation may use a dedicated watchdog alarm or reuse a generation-tagged retry alarm, but it must not create overlapping backups or allow an old late `alarm.clear()` to delete a newer schedule; existing serialized alarm mutation rules remain required.

## Lifecycle owner requirement remains separate from wake scheduling

A watchdog prevents indefinite schedule loss, but does not make a five-minute pure-IDB snapshot finish in one worker lifetime. P1-192 therefore still needs one of:

- move the heavy snapshot/serialization phase into an appropriate durable/offscreen execution context; or
- use an explicit bounded keepalive/lifecycle mechanism for the actual operation, releasing it only when the real promise settles.

Do not use lifecycle ownership to hide infinite hangs: current 5-minute export budget, per-IDB transaction deadlines and transfer deadlines remain mandatory.

## Maintenance comparison

OperationLog/background maintenance uses a recurring hourly alarm (`periodInMinutes:60`). If a maintenance pass is killed, the durable periodic schedule generally remains, so the **schedule-loss** failure is weaker than for one-shot backup.

However `runLoggedOperationLogCleanup()` also performs pure IndexedDB work, stats repair and recovery phases. Without a lifecycle owner, a deterministic >30 s maintenance workload can be interrupted every hour at roughly the same point and never make forward progress. Acceptance must therefore test resumability/progress across forced worker termination, not only existence of the next alarm.

## Lease/checkpoint semantics

A lease/checkpoint is recovery data, not a lifetime owner and not a wake source. Tests must not treat "lease exists" as proof the operation will resume automatically.

Crash recovery must also preserve:

- P1-052 prepared-backup unknown settlement;
- P0-073/P0-074 account/root/auth generation;
- P1-179 backup namespace identity;
- P1-194 truthful durability class;
- P0-078 publication policy generation.

## Test matrix

1. Forced worker termination during `stageFullJournalExport()` after one-shot periodic alarm fired but before next alarm scheduling -> a pre-armed durable wake remains and recovery runs.
2. Forced termination after lease acquisition -> stale lease does not permanently block future backup.
3. Forced termination after remote transfer started -> recovery reconciles checkpoint/outcome, does not blind-retry unknown side effect.
4. Successful backup clears/supersedes watchdog and leaves exactly one correct future periodic schedule.
5. Old watchdog/retry generation cannot clear a newer alarm after late settlement.
6. Repeated >30 s maintenance workload either finishes under lifecycle ownership or makes durable resumable progress across hourly wakes.

## Duplicate check

- P1-077 owns use of durable alarm boundary instead of launching heavy work from ordinary runtime message/startup.
- P1-192 owns lifetime of the operation **after that alarm actually fires**.
- P1-075/P1-076/P1-053 own bounded stages/lease/snapshot correctness.
- P1-118 owns late-settlement ordering of alarm create/clear.
- No P1-197 assigned.

## Retired source: `RESEARCH_DELTA_POPUP_CHROME_API_SETTLEMENT_2026-08-28.md`

SHA-256 of UTF-8 source text: `2d82ad2129583a824f6b1c0cc09633db54fb236056b73eda3e7106179091dedd`

# Research delta — popup Chrome API settlement / exact-document command lifecycle — 2026-08-28

Source-of-truth `main` immediately before this write: `f662ddedcf976859e2371cc043a779698bc488f2`.

Docs-only research checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Classification

Fresh source + current Chrome API contract review refines existing:

- **P1-157** — direct extension-page Chrome API/RPC calls need operation-class-specific deadline/actual-settlement handling;
- **P1-193** — optional host permission request requires gesture-safe two-phase admission and exact candidate document generation;
- **P1-125** — `scripting.executeScript()` actual-settlement receipt must be exact-document-bound;
- **P1-175** — privileged page command dispatch must not retarget after navigation;
- **P1-171** — remote-frame/top-document command generation;
- **P0-070/P0-023** — save/retry authority must remain tied to exact source document generation;
- **P1-201** — granted optional permission lifecycle/revocation after admission;
- **P0-045** — Incognito source must not create persistent optional host permission.

No separate P1-211 root cause is required. The fresh value of this pass is that the popup currently uses one generic 10-second `Promise.race` helper for both read-only operations and browser-owned/user-owned side effects, while other popup commands bypass even that helper. Chrome's current API exposes exact document identity primitives that make a stronger design feasible.

## Current generic popup deadline helper is semantically over-broad

`readPopupExtensionApiBounded(start, label, timeoutMs=10000)`:

1. creates the raw `actual = Promise.resolve().then(start)`;
2. creates a timeout Promise;
3. returns `Promise.race([actual, deadline])`;
4. clears only the timer when the race settles.

It does not:

- retain the actual promise in a singleton registry after caller timeout;
- retain/return a late success receipt;
- bind the operation to a tab/document generation;
- schedule a repair/reconciliation path when the actual promise settles late;
- classify whether the wrapped operation is read-only, idempotent, browser-owned or user-owned.

This helper is appropriate as a bounded **caller wait** for pure reads only when late results cannot trigger later side effects. It is not a complete lifecycle owner for `permissions.request()` or `scripting.executeScript()`.

## Optional permission prompt — timeout is not cancellation and the actual grant can be lost from WebClip's state machine

### Current flow

`grantFrameAccessButton` performs:

1. `getActiveSourceTab()`;
2. `collectCrossOriginFrameOrigins(tab.id)`;
3. `ensureTopContentScript(tab.id)`;
4. top-content `frame-access-candidates` RPC;
5. candidate normalization;
6. `readPopupExtensionApiBounded(() => chrome.permissions.request(...), ..., 10s)`;
7. if the returned boolean is true, `enableGrantedFrameAgents(tab.id)`.

P1-193 already owns the pre-prompt user-gesture problem: the request occurs after several asynchronous discovery steps rather than as the immediate activation-sensitive action.

P1-157 already records that a user-owned permission prompt must not be terminated semantically by an arbitrary 10-second local timeout.

### Fresh exact outer-settlement consequence

If the browser permission prompt remains visible longer than 10 seconds:

1. popup caller wait rejects with `WEBCLIP_TIMEOUT`;
2. catch renders an error and `finally` re-enables the Grant control;
3. the real `permissions.request()` promise remains alive in Chrome;
4. the user can still approve that original browser prompt;
5. the actual promise can then resolve `true`, but WebClip has already discarded the promise's result path and therefore does not run `enableGrantedFrameAgents()` for that settlement;
6. the extension can now possess the persistent optional host permission while the popup has reported failure and holds no exact grant/candidate/session transition acknowledging it.

A second click may then rediscover/request the same or another candidate set while the first actual result is still unresolved or already granted.

This is not merely duplicate UI. Permission is durable extension capability state. P1-157 must therefore require an actual-settlement owner for the prompt, while P1-193 owns admission and P1-201 owns later revoke/re-grant lifecycle.

### Required prompt settlement contract

After the second, gesture-safe Grant click required by P1-193:

- `permissions.request()` becomes one actual browser-owned operation bound to a prepared candidate receipt/document generation;
- no artificial terminal timeout while the browser prompt is active;
- popup/page close may lose the visible owner, but the underlying permission settlement must later be reconciled from browser permission state + prepared receipt;
- an unresolved request remains single-flight for that candidate generation;
- after actual settlement, fresh-check current exact top document and exact granted scopes before enabling agents;
- if source document is stale, the browser-level grant may remain according to permission policy, but it must not authorize injection into the replacement document from the stale candidate receipt;
- Incognito P0-045 blocks the persistent grant before this lifecycle starts.

## Direct popup script injection bypasses the worker's P1-125 actual-settlement machinery

### Bounded path used by Start / candidate discovery

`ensureTopContentScript(tabId)` calls:

`readPopupExtensionApiBounded(() => chrome.scripting.executeScript({ target:{tabId}, files:['content.js'] }), ...)`.

This is a separate raw Chrome promise from the worker's `executeScriptSingletonBounded()` registry.

If the 10-second caller deadline wins:

- popup reports injection failure;
- actual injection may still settle later;
- no late-success receipt is stored;
- no global unresolved script count/singleton is shared with worker execution;
- the user can start another popup attempt while the old injection settlement is unknown.

The loaded sentinel in `content.js` is a useful same-document duplicate-execution mitigation, but it is not an exact actual-settlement/document-generation receipt. It cannot prove which document a late injection reached after navigation/reload.

### Completely unbounded Read Later injection

`readLaterButton` bypasses `readPopupExtensionApiBounded()` entirely:

`await chrome.scripting.executeScript({ target:{tabId:tab.id}, files:['content.js'] });`

then:

`await chrome.tabs.sendMessage(tab.id, { type:'WEBCLIP_COMMAND', command:'read-later' });`

A never-settling scripting Promise can therefore hold the popup action indefinitely. A late injection after navigation has no worker P1-125 receipt or document-generation check.

### Required P1-157/P1-125 architecture

All popup content-script admission should route through one worker-owned/document-bound scripting operation or an equivalent shared receipt protocol.

The operation must:

- capture current exact top `documentId`/navigation generation;
- inject the exact intended document generation;
- retain actual Chrome settlement beyond caller deadline;
- reject/ignore late success for a stale document generation;
- deduplicate identical same-generation injection attempts;
- bound actual unresolved scripting operations globally/per-tab;
- return an exact injection/document receipt used by the following page command.

## Chrome platform supports stronger exact-document targeting

Current Chrome documentation confirms:

- `chrome.scripting` `InjectionTarget.documentIds` is available from Chrome 106;
- `InjectionResult.documentId` identifies the document associated with an injection;
- `chrome.tabs.sendMessage(..., {documentId})` can target a specific document from Chrome 106;
- `permissions.request()` is documented to be invoked from within a user gesture.

WebClip's declared minimum Chrome is 118, so these document-targeting primitives are inside the supported platform range.

Therefore the current tabId-only pipeline is not a compatibility necessity.

## Start Selection can retarget after active-tab admission

`startButton` currently:

1. performs a direct unbounded `chrome.tabs.query({active:true,currentWindow:true})`;
2. validates the returned URL;
3. awaits `ensureTopContentScript(tab.id)`;
4. awaits `enableGrantedFrameAgents(tab.id)`;
5. sends `WEBCLIP_START_SELECTION` via `chrome.tabs.sendMessage(tab.id, ...)` with no `documentId`;
6. closes the popup on success.

The initial `tab` object is only a historical snapshot. Navigation/reload can occur during injection or frame-agent enable.

The final command is addressed to whichever top content script occupies `tab.id` at dispatch time. Thus an explicit user Start action admitted on document A can mutate selection state in replacement document B.

This is already the P1-175 generic privileged-command root cause documented for context menus/Journal. Fresh popup source confirms that Start itself still uses the unsafe shape.

Required regression:

- user clicks Start on A;
- A navigates/reloads while injection/agent enable is pending;
- final `WEBCLIP_START_SELECTION` targets exact A document receipt or fails stale;
- B never inherits A's Start action implicitly.

## Read Later has the same retarget plus an irreversible-save consequence

`readLaterButton` obtains active tab A, executes content.js by tabId, then sends `WEBCLIP_COMMAND/read-later` by tabId.

A navigation between any of those steps can deliver the user command to document B. `read-later` is not an inert UI command: it can enter the save/Journal/Yandex workflow for the receiving page.

Therefore this path composes with the stronger provenance rules:

- P1-175 owns command admission retarget;
- P0-070 owns exact document throughout PDF generation;
- P0-023 owns retry authority for cached PDF;
- P1-198/P0-079 own operation/PDF generation after save admission.

A worker-side exact document check at `WEBCLIP_GENERATE_PDF` is necessary but not sufficient UX authority: the original popup user gesture must not silently become authorization for a different document to initiate that save request.

## Candidate discovery command also needs exact-document result validation

`collectCrossOriginFrameOrigins(tabId)` injects top content and sends `frame-access-candidates` by tabId.

Even before the browser permission prompt, navigation can occur after the original active-tab read. A replacement document can answer the candidates request and return origins not present in the document the user intended to authorize.

P1-193's prepared candidate receipt therefore must be created from a **proven exact current document**, not merely a tab id, and the returned candidate response must carry/prove that same document generation.

## Post-permission enable is tabId-only

After `permissions.request()` returns `true`, popup calls:

`enableGrantedFrameAgents(tab.id)`

with the old tab id.

The worker endpoint then operates on whatever current document occupies the tab. Existing research already classifies this under P1-193/P1-171; fresh source confirms there is no post-prompt exact-document ACK/revalidation in popup.

Required sequence:

`prepared candidate receipt(A) -> immediate request under gesture -> actual grant settlement -> fresh prove current document == A -> fresh prove granted exact scope -> inject/enable exact A documents`.

If A changed at any point, candidate generation is stale. Do not transfer A's grant action into B.

## Universal bounded helper should be split by operation class

A robust popup API layer should not have one timeout policy for everything.

### Pure reads

Examples: `tabs.query`, `tabs.get`, `storage.session.get`, read-only status RPC.

- bounded caller wait is appropriate;
- late read result may be ignored;
- if a later side effect depends on the read, generation/freshness must still be revalidated immediately before side effect admission.

### Idempotent/document injection with observable late settlement

`scripting.executeScript` requires:

- bounded caller response if UX demands it;
- actual promise retained to settlement;
- exact document generation receipt;
- duplicate suppression and late-success adoption only by that generation.

### User-owned browser prompt

`permissions.request` requires:

- gesture-safe admission;
- no arbitrary semantic timeout while user owns the prompt;
- one actual settlement owner/reconciliation path;
- exact candidate/scope/document generation.

### Page command

`tabs.sendMessage` that changes selection/save state requires:

- exact admitted document targeting;
- bounded response only after dispatch authority is proven;
- stale response cannot mutate current popup/page generation.

## Required deterministic/browser regressions

1. `permissions.request()` remains pending >10s, then user grants: popup must not have already classified the request as terminal failure; exactly one grant settlement is reconciled.
2. Same case followed by popup close/reopen: browser grant state is reconciled to the prepared permission generation; no blind second request.
3. Timed-out/late `executeScript` on A followed by same-URL reload B: A receipt cannot satisfy B and late A injection cannot authorize B command.
4. Two rapid/retried Start attempts while the first raw injection is unresolved do not create uncontrolled independent scripting promises.
5. Read Later `executeScript` never settles: action has a controlled bounded/busy state rather than holding popup indefinitely.
6. Read Later A -> navigation B before final command: B receives no `read-later` and starts no PDF/Journal/Yandex side effect.
7. Start A -> navigation B during `enableGrantedFrameAgents`: B receives no inherited `WEBCLIP_START_SELECTION`.
8. Candidate discovery A -> navigation B before candidates reply: B candidates cannot become A's permission receipt.
9. Candidate A -> browser prompt -> navigation B -> grant: persistent permission settlement is handled, but no A-derived agent enable occurs in B.
10. `tabs.sendMessage` exact `documentId` mismatch fails closed rather than falling back to frameId/tabId.
11. Direct context-menu and Journal Apply use the same shared document-bound command/injection primitive rather than parallel incompatible fixes.
12. `permissions.request` remains a real user gesture and no implementation attempts to auto-grant/auto-retry after prompt denial.
13. Permission revoke/re-grant still creates fresh P1-201 permission generation.
14. Incognito source never reaches persistent optional-permission admission under P0-045.
15. Chrome 118 unpacked QA proves `scripting`/`tabs.sendMessage` documentId targeting and real permission prompt behavior used by the implementation.

## Duplicate check / numbering

No new P-number is assigned.

- **P1-157** owns popup direct Chrome API lifetime/actual-settlement classification.
- **P1-125** owns script-injection actual settlement + exact document receipt.
- **P1-193** owns prompt admission/candidate generation and gesture.
- **P1-175** owns generic privileged command exact-document authority.
- **P1-171/P1-201** own remote-frame/permission lifecycle after grant.
- **P0-070/P0-023** remain stronger save/retry document provenance owners.

P1-211 remains unassigned by this block.

## External Chrome documentation revalidation

Current Chrome for Developers documentation was rechecked on 2026-08-28:

- `chrome.permissions.request()` is documented as a user-gesture operation and returns the actual grant decision;
- `chrome.scripting.InjectionTarget.documentIds` and `InjectionResult.documentId` are available from Chrome 106;
- `chrome.tabs.sendMessage` accepts `options.documentId` from Chrome 106.

These are platform-support facts only. Real unpacked Chrome 118+ QA remains required before implementation closure.

## Test / release state

No runtime/config/manifest changes were made. Product tests were not rerun. The last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.

## Retired source: `RESEARCH_DELTA_POPUP_CONTEXT_START_SELECTION_PARITY_2026-08-28.md`

SHA-256 of UTF-8 source text: `ea57070101d8314a93e60fd705acb4982ab581fb0a8c809903693483a9b6c84a`

# Research delta — popup/context-menu Start Selection semantic parity — 2026-08-28

Source-of-truth `main` immediately before this write: `a2871e2a8a65f42e218e2c455b4b672748fd38ad` plus docs-only `ae9e3baaa38e9030336d3042bf435785ea5ef697` on `main`.

Docs-only research checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Primary existing owner: **P0-017** — context menu and normal extension UI must invoke the same page behavior/handlers.

Adjacent owner: **P0-001** — explicit Include/Exclude selection is user state and must not be removed unexpectedly.

Document-generation transport remains separately owned by P0-070/P1-125.

## Fresh source proof

There are currently two different “start selection” entry points in `content.js`.

### Direct popup message

`popup.js` finishes its Start flow with:

`chrome.tabs.sendMessage(tab.id, { type: 'WEBCLIP_START_SELECTION' })`.

The top-level content message handler receives that type and calls:

`startSelection()`.

`startSelection()` performs, among other setup:

- `restoreAfterPrint()`;
- `invalidatePdfCache()`;
- **`clearSelections()`**;
- sets phase to selecting.

Thus invoking Start from the popup always starts a destructive fresh selection session.

### Context-menu command

The context-menu path sends a generic `WEBCLIP_COMMAND` with command `start`.

`handleExternalCommand('start')` calls `ensureSelecting()`.

When selection state already exists, `ensureSelecting()` restores the UI/listeners and does **not** call `clearSelections()`.

The toast explicitly distinguishes this case:

- no includes: selection mode started;
- existing includes: selection mode **continued** and current Include/Exclude regions preserved.

## User-visible divergence

Deterministic schedule:

1. User manually selects Include I and Exclude E.
2. WebClip UI is hidden/reviewed or the user simply reopens the extension entry point.
3. If the user chooses context-menu Start, I/E survive and the session continues.
4. If the user opens popup and chooses Start, direct `WEBCLIP_START_SELECTION` calls `startSelection()` and removes I/E.

The two controls represent the same product action but have opposite state-retention semantics.

This is especially surprising because P0-017's requirement is that context menu use the same page handlers rather than a subtly different workflow.

## Required refinement

### One semantic command contract

Popup and context menu should converge on one page command for ordinary “Start/Continue selection”.

Preferred behavior is implementation/product-policy dependent, but it must be explicit and consistent.

A clean split would be:

- `start/continue` — preserve existing explicit selection when the same valid application/document generation is still active;
- `reset/new selection` — destructive clear, exposed only through an explicit reset action or a generation change requiring reset.

Do not overload one UI surface with reset semantics and another with resume semantics.

### Preserve P0-080 generation safety

Consistency must not mean blindly preserving stale selection across an SPA/application generation change.

P0-080 still requires disconnected/stale selection to fail/reset on a proven new application state. The parity requirement applies when the same valid selection generation remains current.

### Preserve PDF cache semantics

If ordinary Start merely resumes a valid selection, it should not invalidate a retry-cache artifact solely because the user reopened the selection UI unless product policy explicitly treats that as a new editing generation.

Any cache invalidation should follow the same selection/application generation receipt used by P0-023/P0-080.

## Required regressions

1. Existing Include/Exclude, same valid generation -> popup Start and context Start produce the same resulting selection state.
2. Explicit Reset -> both surfaces clear only when the user selected reset semantics.
3. Fresh page with no selection -> both surfaces enter selecting mode identically.
4. SPA/application generation changed -> stale I/E do not survive merely to satisfy parity; P0-080 wins.
5. Cross-origin frame selections follow the same start/resume policy as local selections.
6. Popup and context menu share the same operation/page command contract rather than separate direct-message semantics.

## Duplicate check

No dedicated repository research checkpoint was found for the divergence between `WEBCLIP_START_SELECTION -> startSelection()` and `WEBCLIP_COMMAND start -> ensureSelecting()`.

The root is not a new feature class: P0-017 already requires common page behavior and P0-001 owns preservation of explicit selections. No new P-number is needed.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build, tag or GitHub Release was created.

## Retired source: `RESEARCH_DELTA_POPUP_DOCUMENT_COMMAND_AND_FRAME_PERMISSION_AUTHORITY_2026-08-28.md`

SHA-256 of UTF-8 source text: `61436fb543b1bbbfc7849b2b0d661ad30320fbca459e566d7ad04e19e01b17b0`

# Research delta — popup command / iframe activation authority vs active document generation — 2026-08-28

Source-of-truth `main` before this checkpoint includes `debd34721afcd010bdb4ecc86a8ddbcdd5cf37f3`.

Docs-only checkpoint. Runtime/config/tests/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh proof refines **P0-070**, **P1-004/P1-171** and composes with **P1-157** permission-prompt settlement. The context-menu source-document delta proved the same class for browser-menu commands; this checkpoint confirms an independent command producer with a longer permission-prompt window.

## Popup `start` is tab-bound, not document-bound

Current popup flow:

1. `chrome.tabs.query({active:true,currentWindow:true})` returns tab A;
2. URL is checked as HTTP(S);
3. `ensureTopContentScript(tab.id)` calls `scripting.executeScript({target:{tabId}, files:['content.js']})`;
4. `enableGrantedFrameAgents(tab.id)` asks worker to inject/enable already-granted frame agents;
5. `chrome.tabs.sendMessage(tab.id, {type:'WEBCLIP_START_SELECTION'})` starts selection.

Any full navigation/reload between these asynchronous steps can replace A with B while keeping the same tab id. The final message has no expected `documentId`.

Same-URL reload is invisible to URL-only validation.

## Popup `read-later` has the same admission gap

`readLaterButton`:

1. resolves active tab;
2. checks captured URL scheme;
3. directly executes `content.js` by tab id;
4. sends `WEBCLIP_COMMAND/read-later` by tab id.

A -> B replacement between query and message silently retargets the user command. If B later reaches save/PDF, P0-070 remains the final irreversible fence, but the command was already admitted against the wrong document.

## Cross-origin frame permission flow creates a longer decision window

`grantFrameAccessButton` currently:

1. gets active tab A;
2. injects top content script by tab id;
3. asks A for `frame-access-candidates`;
4. derives up to 16 origin permission patterns;
5. awaits `chrome.permissions.request({origins})`;
6. after the user grants, calls `enableGrantedFrameAgents(tab.id)`.

The Chrome permission prompt is user-owned and may remain open for an arbitrary practical duration. During that time tab A can reload/navigate to B.

The host permission itself is permission for the explicitly shown/requested origins and is not automatically invalid merely because A navigated. The problem is the **page-scoped post-grant activation**: WebClip can enable/inject frame agents into whatever document B now occupies the tab without proving that B is the page for which the popup collected candidates and initiated the request.

This can make one UI decision span two page generations:

- candidate/intent generation A;
- activation/selection generation B.

## Existing permission timeout issue remains separate

The same popup wraps `chrome.permissions.request()` in generic `readPopupExtensionApiBounded()` with the default 10-second deadline.

P1-157 already records that a user-owned permission prompt cannot be treated like a cancellable read: local timeout does not cancel Chrome's actual request and can permit a second prompt/retry over unknown settlement.

This checkpoint does not create another timeout item. It adds the required **document receipt carried across the actual permission settlement**.

## Required popup command receipt

At active-tab resolution, create/capture an exact top-document receipt containing at least:

- tab id;
- exact top document id/navigation generation;
- canonical URL;
- popup command generation.

Every later page-targeted step must consume that receipt:

- top content-script injection;
- frame-candidate collection;
- post-permission frame-agent activation;
- start/read-later command delivery.

If the original document disappears, do not automatically reinterpret the action for replacement B. Return stale-document and require a fresh popup action on B.

## Permission grant vs activation distinction

If Chrome settles the host grant after A has disappeared, WebClip should preserve truthful permission state — the origins may now genuinely be granted in Chrome.

But it must **not** use that late grant as authority to activate a replacement page automatically.

A safe outcome is:

- report/remember that the requested origin permission settled;
- invalidate the old page activation receipt;
- require a fresh command on the current document before frame agents are enabled/selection begins there.

This is the same actual-settlement-vs-authority separation used elsewhere in the project.

## Required regressions

1. Popup Start resolves A -> same-URL reload B before injection -> B does not silently enter selection.
2. A -> B between injection and `WEBCLIP_START_SELECTION` -> stale result; no B command.
3. Read Later resolves A -> same-URL B before final message -> no B save operation.
4. Frame candidates collected from A -> permission prompt remains open -> B replaces A -> user grants -> grant state is truthful but B frame agents are not automatically activated under A's receipt.
5. Fresh popup action on B after the grant can use current permission normally under a new document generation.
6. Cross-URL navigation to another HTTP(S) page is rejected even though tab id is unchanged.
7. Late `scripting.executeScript()` settlement from A cannot satisfy B's exact-document injection request.
8. Permission request local timeout followed by late grant remains single-flight/actual-settlement under P1-157 and still cannot activate stale page generation.
9. Journal-open buttons retain their own explicit source-context semantics and are not treated as page mutation commands.

## Duplicate check / numbering

No new item is created.

- **P0-070** owns exact live top-document identity for the save/command generation.
- **P1-004/P1-171** own cross-origin frame activation/registry/child document binding.
- **P1-157** owns non-cancellable permission prompt settlement.
- The context-menu delta `RESEARCH_DELTA_CONTEXT_MENU_DOCUMENT_COMMAND_AUTHORITY_2026-08-28.md` is the sibling producer-path proof, not a replacement for this popup-specific permission window.

## Test / release state

Docs-only checkpoint. Product tests were not rerun. Historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** remains previous evidence only. Real popup/permission/unpacked-Chrome navigation QA remains required. No build, tag or Release was created.

## Retired source: `RESEARCH_DELTA_RECONCILIATION_DISCOVERY_AFTER_PAGE_LOSS_2026-08-28.md`

SHA-256 of UTF-8 source text: `00f065daa7d8e3ad05b7efe5ad4055d1c2c2e3b000bbd3a837d2042cc0096735`

# Research delta — durable reconciliation discovery after page loss/reload — 2026-08-28

Source-of-truth `main` immediately before this write: `84c0ea97dd8c28becb3090d5f34baf00080022c4`.

Docs-only research checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines **P1-210** user-facing unknown-result reconciliation and composes with **P1-198** worker-issued operation receipts plus the physical subsystem owners **P0-039/P0-048** (local download), **P1-184/P0-073/P0-074** (remote save), **P1-156** (Save As), and **P1-052/P1-207** (backup attempts).

The missing acceptance condition is **discoverability**. A durable physical checkpoint is not sufficient for user-facing reconciliation if only the destroyed old page knows the operation id/session key needed to ask about it.

No new root cause is required.

## Two kinds of mutations need different reconciliation discovery

### Current-state mutations

Options mutations such as:

- current auth/disconnect;
- root/config/public-link preference;
- backup settings;
- imported settings generation;

can often be reconciled after page reload by reading the authoritative **current state/revision**. The new page does not necessarily need the old operation receipt just to learn whether the setting is currently enabled/rooted/connected.

P1-210 still needs generation-aware explanation when the old physical/ancillary operation matters, but current-state reads provide a natural discovery surface.

### Physical side-effect attempts

Local Downloads, Yandex uploads/publication, prepared Save As, backup uploads and destructive remote moves have a different shape.

Their durable truth is not reducible to one current global setting. Multiple attempts/generations can coexist, remain unresolved, become detached after Journal replacement, or settle after the initiating page disappears.

These require exact physical attempt discovery.

## Current local/remote pending stores are internal recovery authority

Service worker has durable stores/functions for:

- `pendingDownloads`;
- `pendingRemoteSaves`;
- backup pending checkpoint;
- prepared Save As session/index;
- future generation-aware move/delete receipts.

Background maintenance can enumerate/reconcile those stores.

For remote saves, `recoverPendingRemoteSaves()` eventually returns aggregate fields such as `pending`, `stalePending`, `recovered`, `verified`, `deferred`, `failed`, etc. `countPendingRemoteSavePhases()` exists only as an internal helper used by recovery.

Fresh runtime switch/source review did not find a page-facing endpoint exposing a bounded list/query of current local/remote physical generations to a newly loaded content/Journal/Options page.

The internal maintenance owner can therefore know that something is pending while the replacement UI has no exact receipt to present/reconcile.

## Old content page owns correlation only in ephemeral DOM/JS state

Content upload/download UI generates/stores a textual operation id in the live content script and renders retry/reconciliation affordances in the modal.

For Yandex retry, a new `retryCachedPdfToYandex()` creates another operation id when the user presses Retry. The modal warnings can tell the user not to repeat while a checkpoint is pending **only while that document/UI remains alive**.

Navigation/reload/page close/extension update destroys:

- `state.pageUploadOperationId`;
- modal state/operation card;
- local knowledge of which physical attempt is currently unknown;
- any page-only retry suppression based on that old UI.

The physical checkpoint may correctly survive in IndexedDB.

This creates a discoverability gap rather than a durability gap.

## Deterministic page-loss schedule

1. Content document A starts Yandex upload physical generation RA.
2. Durable remote checkpoint RA is committed and transfer is admitted.
3. Outer result becomes unknown or page A navigates/reloads before terminal response.
4. RA remains durable and background recovery can later reconcile it.
5. New content document B has no old modal/operation id/receipt.
6. No current page-facing status API tells B that this tab/source/logical save has an unresolved RA.
7. User invokes WebClip again and sees a fresh operation surface.
8. Without discoverable RA/current logical-owner state, UI can offer/start a new retry/save generation RB even though RA remains unresolved, unless another subsystem-specific gate happens to reject it.

P1-210's rule “while A is unknown, ordinary retry must not silently create B” therefore requires a way for a **replacement page** to discover A.

## Same issue for local download unknown settlement

A durable `pendingDownloads` row can survive page/worker changes and background recovery may exact-search Chrome Downloads.

If the initiating content UI disappears, a fresh page cannot infer physical completion/non-completion from the Journal alone:

- absence of Journal entry does not mean file did not save;
- Chrome DownloadItem may still be pending/unknown;
- clear/import may intentionally detach old Journal authority while preserving physical receipt.

User-facing reconciliation needs a bounded representation of the exact pending/detached generation when relevant, not only silent hourly maintenance.

## Save As/backup have owner-specific discovery sources

Prepared Save As already has a durable active index/session store. P1-156 should use that index for worker/page reconstruction rather than requiring the old page's closure variables.

Backup has scheduler/status UI, but after the pending-generation multiplicity repair status must be able to distinguish current backup coverage from historical unresolved attempts. One singleton `lastError/lastSuccessAt` is not a complete physical-generation discovery surface.

The common principle is the same; implementation can remain subsystem-specific.

## Required discovery model

### Bounded subsystem status/query API

Expose a privacy-minimized worker-owned status/query surface that allows an authorized current extension/content context to discover physical generations relevant to its logical owner.

It need not expose all recovery stores or sensitive metadata.

Useful query keys/filters may include:

- exact worker-issued operation receipt when the page still has it;
- current tab + exact source-document/logical save family where safe;
- Journal entry/generation for extension-page actions;
- prepared Save As owner/session index;
- backup current/historical attempt class;
- explicit recent/detached physical operation view in Journal/Options when no content document owner remains.

The worker determines matches from authoritative durable receipts.

### Do not reconstruct identity from OperationLog alone

OperationLog can be cleared/retained independently. The prior operation-receipt/diagnostic-separation delta applies.

A missing log cannot make an unresolved physical attempt undiscoverable.

### Privacy minimization

A fresh arbitrary content document must not receive a global list of private operations/URLs.

Queries should return only the minimum status/receipt class appropriate to the caller and exact document/tab/site ownership rules. Extension pages may expose a broader user-controlled recovery/status view with redacted metadata.

### Generation-aware UI state

Replacement UI should distinguish:

- no relevant admitted attempt;
- in-flight/pending;
- outcome unknown/reconciliation running;
- verified physical result/local finalization pending;
- detached by Journal generation change;
- terminal success/failure where proven;
- diagnostic history unavailable.

Only “no admitted attempt/proven safe to retry” permits automatic fresh-generation behavior.

## Repair/reconciliation triggering

Discovery may optionally trigger one bounded reconciliation pass for the exact generation, but it must not start a new irreversible side effect.

If the state cannot be resolved immediately:

- display pending/unknown;
- background maintenance continues;
- allow explicit manual refresh/reconcile;
- do not create a polling/wake loop.

## Extension update/reload composition

P1-209 requires old extension pages to reload into the current runtime version. After that reload, they must be able to rediscover current durable operations rather than losing retry suppression simply because the old JS generation was intentionally discarded.

Worker-issued receipts/state schemas should be versioned/migratable enough that a new page generation can read bounded status for compatible outstanding physical attempts.

## Required regressions

1. Remote RA admitted -> content A reloads before result -> content B/status surface discovers RA pending/unknown and does not blindly create RB.
2. RA later verifies in background -> replacement UI refresh discovers verified/terminal result without old A operationId.
3. Local download pending -> content page closes -> fresh relevant UI can show/reconcile exact pending generation; absence of Journal success is not treated as safe retry proof.
4. Clear/import detaches RA -> replacement Journal/recovery view reports detached physical state while imported Journal remains untouched.
5. OperationLog is cleared while RA pending -> discovery still works from physical receipt; history is shown unavailable rather than “operation absent”.
6. Save As page crashes after STARTED -> worker reconstructs from active session index and replacement extension page can show/reconcile session state if product exposes it.
7. Backup has historical unresolved A plus current B -> status distinguishes generations/current coverage instead of collapsing them into one last result.
8. Unrelated content tab/site cannot enumerate another tab's/private operation metadata.
9. Same-URL reload does not inherit old retry authority automatically; discovery uses exact source/logical receipt rules and P0-023 document-generation policy.
10. A truly pre-admission failure leaves no physical receipt -> fresh retry is allowed after current-state check.
11. Reconciliation query timeout leaves status unknown and does not start a new physical generation.
12. Multiple relevant generations are presented/reconciled distinctly; aggregate `pending=2` alone is not used as exact ownership proof.
13. Worker restart does not erase discoverability because the authoritative index is durable, not module memory.
14. Resolved old receipts are retired/archived under bounded policy so discovery index does not grow without limit.

## Duplicate check

- **P1-210** primary: user-facing unknown-result reconciliation/retry admission.
- **P1-198** supplies worker-issued operation/generation identity.
- **P0-039/P0-048**, **P1-184**, **P1-156**, **P1-052/P1-207** retain physical subsystem truth.
- **P1-209** extension-page version reload must preserve ability to rediscover durable current work.
- OperationLog remains diagnostic only under P1-197/P1-205.

No P1-211 is assigned.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains **88/88 JavaScript syntax + 74/74 deterministic PASS**. No runtime/manifest/build/tag/Release change was made.

## Retired source: `RESEARCH_DELTA_SERIALIZED_QUEUE_ADMISSION_COVERAGE_2026-08-27.md`

SHA-256 of UTF-8 source text: `018e20d3bbaee89cbac9bd53e4500357784f1bd67b4a4fe895c92553916d3145`

# Research delta — serialized actual-settlement queue admission coverage — 2026-08-27

Source-of-truth `main` immediately before this write: `d2d74d040de06539e3e81413493d7343f0345e77`.

Docs-only research checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof expands the implementation coverage of existing **P1-173** and reopens the admission-pressure aspect of two otherwise valuable bounded/serialized fixes:

- **P1-123** — Journal source-context `chrome.storage.session` mutation lifecycle;
- **P1-120** — `webclipJournalStatsDirty` crash-consistency marker lifecycle.

The common root cause is already P1-173: caller timeout + actual-settlement serialization prevents stale side-effect overtaking, but a never-settling actual Chrome Storage promise can still accumulate an unbounded chain of **waiting turns that have not started a side effect**.

This checkpoint records two ad-hoc queue implementations that were not called out explicitly in the original P1-173 coverage wording.

## Positive control

Both implementations correctly reject the unsafe alternative of treating local timeout as cancellation.

A late old `storage.set/remove/get` must not be overtaken by a newer mutation that assumes the older call did not happen. Both paths therefore retain a barrier until the actual Chrome promise settles.

That ordering property must be preserved.

The defect is only that every later caller can allocate another Promise/closure behind the same permanently unresolved barrier.

## 1. Journal source-context mutation chain

`storeJournalSourceContext()` uses a module-global:

`journalContextMutationChain = Promise.resolve()`.

For every requested Journal context it constructs:

`actual = journalContextMutationChain.catch(() => {}).then(async () => { ... })`

and then publishes:

`journalContextMutationChain = actual.then(() => undefined, () => undefined)`.

The inner turn performs a potentially multi-call Chrome Storage session mutation:

1. `chrome.storage.session.get(null)`;
2. zero or more batched `chrome.storage.session.remove(...)` calls for expired/overflow contexts;
3. final `chrome.storage.session.set({ [key]: context })`.

The caller waits only through the bounded `waitJournalContextSessionOperation(...)` deadline. That is the P1-123 protection that prevents `openJournalPage()` from waiting forever and prevents `tabs.create` from starting after an unresolved context write.

However the underlying chain itself has no waiting-turn admission limit or coalescing.

### Deterministic failure schedule

1. Context mutation A starts and its actual `chrome.storage.session.get(null)` never settles.
2. A's caller receives its bounded timeout.
3. `journalContextMutationChain` still represents A's unresolved actual chain, correctly preserving ordering.
4. User requests Open Journal again; mutation B allocates a new `then(async () => ...)` waiting behind A.
5. B times out before its body starts, but B remains an unresolved waiting turn because A never settled.
6. Repeating the action creates C, D, E, ... as additional Promise/closure turns.
7. No later storage side effect has started, so the durable context cap of 512 is irrelevant to this memory/lifetime growth.

The cap controls **stored records**, not unresolved JS queue turns.

A degraded Chrome Storage API can therefore turn an otherwise bounded P1-123 failure into unbounded worker-memory/lifecycle pressure under repeated user requests.

## 2. Journal stats dirty-marker settlement chain

The same root cause exists in the separate module-global:

`journalStatsMarkerSettlementChain = Promise.resolve()`.

`queueJournalStatsMarkerMutation(task, label)` reserves a new Promise turn synchronously, reads the current previous chain, publishes the new `turn`, and waits for the previous settlement with a bounded timeout.

If waiting times out, the code deliberately leaves `releaseTurn()` attached to the real previous settlement. This is correct for ordering: a late old marker write/remove cannot be overtaken.

But the next call can reserve another new turn behind the still-unresolved turn. There is no per-key/global cap and no shared/coalesced busy receipt.

### Why this path is more frequent

The stats marker is not only an administrative UI path.

Journal mutations use `beginJournalStatsMutation(...)` / `completeJournalStatsMutation(...)` around append/delete/clear/import and repair-related flows so `urlStats` can be reconstructed after worker interruption.

Therefore a hung marker Chrome Storage mutation can receive repeated callers from ordinary product activity and background repair, not only from repeated Open Journal clicks.

The marker record itself can remain tiny while the in-memory waiting chain grows without bound.

## Relationship to existing P1-173

This is not a new queueing primitive/root cause.

P1-173 already states the required invariant for serialized actual-settlement queues:

- one hung actual side effect may retain one ordering barrier;
- repeated callers after bounded timeout must not add an unlimited number of waiting Promise/closure turns;
- use per-key/global admission cap, a coalesced wait receipt, or another bounded busy model;
- do not start a newer non-cancellable mutation until the real older settlement is known.

The implementation inventory for P1-173 must explicitly include at least:

- `runSerializedLateSettlementOperation(...)` users;
- Yandex auth/config mutation chains;
- prepared Save As checkpoint chain;
- **`journalContextMutationChain` / `storeJournalSourceContext()`**;
- **`journalStatsMarkerSettlementChain` / `queueJournalStatsMarkerMutation()`**.

Future research/fix should search for equivalent ad-hoc module-global Promise barriers rather than fixing only the generic helper.

## P1-123 refinement

P1-123 remains correct about bounded caller behavior and ordering, but cannot remain considered fully closed with respect to repeated timeout pressure until its queue admission is bounded.

Required behavior:

- at most one actual context-storage mutation runs at a time;
- at most a bounded/coalesced representation waits behind a hung actual mutation;
- repeated Open Journal attempts while the barrier is unresolved return a deterministic busy/timeout result without allocating a new chain turn each time;
- once the actual mutation settles, the newest still-relevant context request may be retried/admitted according to explicit policy;
- do not create a Journal tab from a request whose context store was not authoritatively committed;
- the existing TTL=24 h / cap=512 / bounded-heap pruning rules remain unchanged.

A useful design is a single `contextMutationBusy`/generation receipt plus at most one coalesced newest pending intent rather than one Promise per click.

## P1-120 refinement

P1-120 must preserve crash-consistency ordering without making every later Journal mutation a permanent waiter.

Required behavior:

- one unresolved actual marker mutation owns the real settlement barrier;
- additional begin/complete/repair-clear requests are bounded and safely coalesced by marker semantics/generation;
- dirty state must fail safe: pressure must not incorrectly clear a newer dirty token or claim stats clean;
- if precise coalescing of begin vs complete cannot be proven, reject/busy later mutations rather than allocating unlimited turns;
- once settlement returns, repair must converge using current durable Journal/meta generation, not replay an arbitrarily long historical JS queue.

Because marker transitions protect `urlStats` correctness, admission pressure must not be "solved" by dropping dirty evidence.

## Required deterministic regressions

1. Never-settling `storage.session.get(null)` in context mutation A -> 100 later Open Journal requests -> bounded number of queue objects/intents; no 100-turn Promise chain.
2. Same test -> no later `tabs.create` starts from a request whose context mutation was not committed.
3. A eventually settles after many busy callers -> context storage remains correctly ordered and only explicitly admitted newest work runs.
4. Context cap/TTL pruning still works after pressure recovery and never exceeds 512 durable contexts.
5. Never-settling stats marker actual write -> repeated Journal append/update/delete attempts do not grow one waiting Promise per mutation indefinitely.
6. Late old dirty-marker `set` cannot overtake a newer marker transition after recovery from pressure.
7. Late old marker `remove` cannot falsely erase a newer dirty generation.
8. If admission is full/busy, Journal/urlStats state remains explicitly dirty/recoverable rather than being reported clean.
9. Worker restart after a hung in-memory chain reconstructs truth from durable marker/Journal revision and does not require replaying lost JS waiters.
10. Generic P1-173 queues, context queue and stats-marker queue share one deterministic admission-pressure test pattern so future ad-hoc barriers are difficult to omit.

## Duplicate check / numbering

No new P0/P1/P2 number is created.

- **P1-173** remains the primary root-cause owner: unbounded waiting turns behind one unresolved actual settlement.
- **P1-123** remains the Journal source-context correctness/timeout owner and is refined to require bounded repeated-caller admission.
- **P1-120** remains the stats dirty-marker ordering owner and is refined to require bounded repeated-caller admission.
- **P1-094** remains the durable Journal context TTL/cap semantics; it does not bound in-memory waiting turns.
- **P0-050/P0-026/P1-057** remain urlStats/Journal mutation crash-consistency dependencies and are not renumbered by this checkpoint.

## Test / release state

No runtime/config/manifest change was made. Product tests were not rerun for this docs-only checkpoint. The historical product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or Release was created.

## Retired source: `RESEARCH_DELTA_TAB_CREATE_MV3_RECEIPT_2026-08-28.md`

SHA-256 of UTF-8 source text: `a61205b18137ef940e4856988dcd21eacb165e8e84a149a3f60cbe058161f12f`

# Research delta — tabs.create MV3 crash receipt — 2026-08-28

Source-of-truth `main` immediately before this write: `47b5f615ff170f399d3dd53004ea54af680e50f3`.

Docs-only research checkpoint. Production runtime/config/manifest/tests are unchanged.

## Classification

No new P-number is assigned.

Fresh source proof **reopens/refines existing P1-124**. P1-124 correctly solved local-timeout duplicate tabs inside one service-worker lifetime, but its late-success receipt is module-memory only. A service-worker restart can erase the only unknown-settlement receipt while the browser-created tab survives.

Adjacent items are different:

- P1-125 — `executeScript()` document-generation / late-success receipt; injected content/frame scripts are additionally protected by idempotent load sentinels, so a worker restart does not have the same duplicate-tab side effect.
- P1-130/P1-170 — Chrome Action mutation/refresh; a fresh worker runs `refreshActionForAllTabs()` and can reconstruct desired browser Action state.
- P1-136/P1-204 — context-menu crash repair; menu rebuild uses a Chrome alarm repair obligation.
- P1-192 — background backup alarm/lifecycle; different durable operation.

## Fresh source proof

### 1. P1-124 state is entirely in module memory

`service-worker.js` declares:

`const tabCreateSettlements = new Map();`

`createChromeTabBounded()` builds a logical key from requestKey or `sourceTabId + active + url`, then keeps:

- the raw `chrome.tabs.create()` Promise;
- timedOut/settled flags;
- a one-use `lateSuccess` tab receipt;
- a cleanup timer.

If an identical retry happens while the same worker still owns this map, WebClip either:

- waits for the existing actual call;
- returns `WEBCLIP_TAB_CREATE_PENDING`;
- or consumes the one-use late-success tab instead of issuing a second `tabs.create()`.

That remains a useful same-worker control.

### 2. No durable/browser-reconstructible generation backs the map

The map is not mirrored in `chrome.storage.session`, IndexedDB, a target URL nonce, a Chrome alarm, or another crash-recoverable receipt.

`createTabNextTo()` ultimately calls `createChromeTabBounded()` and does not first reconcile a prior unknown create against current Chrome tabs.

On worker restart, `tabCreateSettlements` starts empty.

### 3. Non-idempotent browser state can survive the worker

A `tabs.create()` request is a browser side effect. The created tab belongs to Chrome, not to the JS heap that initiated it.

Deterministic crash-consistency schedule:

1. request A calls `chrome.tabs.create()`;
2. Chrome accepts/creates the tab, or its outcome is otherwise unknown to WebClip;
3. before the worker publishes/retains a usable `lateSuccess` receipt, the MV3 worker terminates/restarts;
4. the browser tab remains;
5. the user/extension retries the same logical Open Journal / Open Options / internal-page action;
6. the new worker has an empty `tabCreateSettlements` map and starts a second `chrome.tabs.create()`;
7. two tabs represent one logical user action.

The existing local 10-second timeout protection cannot bridge process lifetime.

### 4. Existing target flows have different reconciliation opportunities

Journal tabs commonly include a random `contextId` in their extension URL. That nonce can be used as a strong browser-visible identity if carried durably through the create intent.

Static Options/help URLs are weaker: merely finding any existing tab with the same URL is not proof that it is the unknown result of this exact request. Reusing an unrelated old Options tab would change product semantics.

Therefore the repair should be receipt/generation based, not a broad "if same URL exists, reuse it" heuristic.

## Required P1-124 refinement

### Crash-recoverable create intent

Before issuing non-idempotent `tabs.create()`, record a bounded session-scoped create intent containing an immutable request nonce/generation and only the metadata needed to reconcile the exact create.

Acceptable designs include:

- encode a unique request nonce into extension-page target URL where product-compatible and persist the intent in `chrome.storage.session` until settlement/reconciliation;
- or use another bounded durable/session receipt that lets a new worker prove whether the exact request already produced a Chrome tab.

Do not persist ordinary browsing URLs unnecessarily; extension-page navigation identity should remain privacy-minimal.

### Actual settlement still matters

- local timeout is not cancellation;
- same-worker `tabCreateSettlements` may remain as a fast barrier;
- worker restart must not convert `unknown` into `not started`;
- reconciliation must fail closed when more than one browser tab could match the intent;
- no blind second `tabs.create()` until the old intent is proved absent/failed or reconciled.

### Bounded lifecycle

Session create intents require:

- cap/TTL;
- compare-and-delete of only the exact request generation;
- cleanup on proven success/failure;
- restart reconciliation that cannot keep stale intents forever;
- no unbounded Promise queue behind a hung Chrome API.

## Deterministic regressions

1. `tabs.create()` settles normally before deadline -> one tab, receipt cleaned.
2. Caller timeout, same worker, late success -> current P1-124 one-use receipt prevents duplicate.
3. Chrome creates target, worker dies before JS receipt -> new worker + identical retry -> exactly one target tab after reconciliation.
4. Worker dies before Chrome actually creates target -> retry waits/reconciles boundedly, then creates at most one tab.
5. Journal target with unique context nonce -> exact tab is recovered, unrelated Journal tabs are not reused.
6. Existing unrelated Options/help tab + unknown new create -> heuristic same-URL reuse is not accepted as proof unless exact request identity exists.
7. Ambiguous candidate set -> fail closed / explicit retry state, not arbitrary attachment.
8. Stale intent TTL cleanup cannot remove a newer generation with the same logical action.
9. Incognito placement rules for Journal remain unchanged/fail-closed.
10. P1-166 global pending-admission requirements remain independent for unresolved in-memory Chrome calls.

## Numbering result

No P1-210 is allocated.

Primary owner remains **P1-124**, expanded from same-worker timeout reconciliation to MV3 crash-consistent exact-create reconciliation.

## Test / release state

No product tests were rerun. Historical product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or Release was created.

