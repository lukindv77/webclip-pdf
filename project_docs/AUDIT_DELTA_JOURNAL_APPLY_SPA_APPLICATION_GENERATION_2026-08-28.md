# Audit delta — Journal Apply must revalidate same-document SPA/application generation — 2026-08-28

Source-of-truth `main` immediately before this write: `27bea6bf84016856da8047dfb8cc83532f1e5f0d`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged. No new P-number is assigned.

## Classification

Primary existing owners:

- **P1-175** — Journal source-context exact target authority;
- **P0-080** — same-document SPA/application-generation selection authority;
- **P0-018** — applying a Journal template to another URL of the same site;
- **P1-001** — locator restore confidence/ambiguity.

P0-070 still owns full browser-document replacement, but is not sufficient for this case because `documentId` may remain unchanged.

## Fresh source proof

`resolveSourceContext()` loads stored `{sourceTabId, sourceUrl}` and performs a bounded `chrome.tabs.get(sourceTabId)` read. If the tab currently has an HTTP(S) URL it overwrites `sourceUrl`.

That refresh is useful, but it is not performed at every Apply click.

Entry rendering computes `sameUrl`, `sameSite` and `canApply` from the page-level variables `sourceTabId/sourceUrl`. The button closure calls `applyEntry(entry)`.

`applyEntry(entry)` currently proceeds directly to:

- `chrome.scripting.executeScript({ target:{tabId:sourceTabId}, files:['content.js'] })`;
- `chrome.tabs.sendMessage(sourceTabId, { type:'WEBCLIP_APPLY_SELECTION_SNAPSHOT', ... })`;
- `chrome.tabs.update(sourceTabId, {active:true})`.

It does not fresh-read current source URL/application generation immediately before admission.

## Deterministic same-document schedule

1. Journal is opened from source tab T while SPA route A is current.
2. `resolveSourceContext()` records/refreshes `sourceUrl=A`.
3. Journal renders an entry E and enables Apply because E is same-site with A.
4. Source tab T remains the same browser document but SPA performs `history.pushState()` / `replaceState()` / `popstate` to route B.
5. Browser `documentId` may remain unchanged.
6. Journal page is not necessarily notified and still holds `sourceUrl=A`.
7. User presses Apply on E.
8. `applyEntry()` targets only tabId T and the current content document receives the snapshot on route B.
9. Any `crossUrl` diagnostics are still computed against stale page-level `sourceUrl=A`, not the actual route B accepted by the command.

Thus a source observation from A becomes live mutation authority for B.

## Why exact documentId alone is insufficient

P1-175/P0-070 require exact browser-document targeting and remain necessary for full reload/navigation. But SPA route changes can keep the same documentId.

The Apply receipt therefore needs both:

- browser document generation;
- same-document application/navigation generation or, at minimum, a fresh URL/application observation immediately before command admission plus a content-side current-generation check.

A textual URL read only at Journal initialization is not a durable command capability.

## Required contract

Before every Apply:

1. re-read the source tab/document through a bounded Chrome API call;
2. prove current browser document generation is the expected one under P1-175;
3. prove current application/route generation is current under P0-080;
4. recompute same-site/cross-URL policy from the **current** route;
5. if route changed, update the Journal UI and require a fresh user decision instead of silently applying;
6. carry expected document/application receipt through script injection and message delivery, not just the page-level `sourceTabId`.

For deliberate cross-URL same-site template use under P0-018, the new target route is allowed only after a fresh explicit decision under the current target receipt. A stale earlier decision cannot be silently reused.

## Interaction with locator restore

Even if the target route is allowed, P1-001 still governs locator quality. Application-generation validation does not convert a low-confidence/ambiguous locator into a valid one.

The intended chain is:

`current source target receipt -> deliberate same-URL/cross-URL policy -> exact application/document command -> locator confidence restore`.

## Required regressions

1. Journal opens on A -> no source change -> Apply succeeds normally.
2. Journal opens on A -> SPA route B before click -> stale Apply is invalidated/reconfirmed before any injection/message.
3. Same browser document, same textual URL but app root replaced -> content-side application-generation/live-DOM check prevents stale authority.
4. Full reload A->A with new documentId -> P1-175 fails closed even though URL is equal.
5. A->B same site and user deliberately reconfirms cross-URL template use -> Apply may proceed under B receipt and P1-001 confidence checks.
6. A->different site -> Apply remains disabled/rejected after fresh revalidation.
7. Late script/message settlement for old target generation cannot become success for newer route.

## Duplicate check

Existing Journal target deltas cover tab/document replacement and stale source context. Repository search found no dedicated checkpoint for **same-document SPA route change between Journal source resolution/render and Apply click**. This is therefore an acceptance refinement of P1-175 + P0-080, not a new item.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build/tag/Release was created.