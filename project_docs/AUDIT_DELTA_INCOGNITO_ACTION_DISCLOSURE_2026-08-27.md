# Audit delta — Incognito Chrome Action disclosure — 2026-08-27

Baseline HEAD before this audit block: `e115775d361d45758d7b2abe7adc2cffa907dd50`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged. Canonical registry synchronization is not claimed.

## Scope

Fresh privacy-boundary audit of Incognito behavior, focused on existing `P0-045`: runtime sender admission, Journal opening, popup actions and Chrome Action state.

## Result

`P0-045` must be reopened/refined. Content-script save/Journal commands and Journal-page placement are correctly fail-closed for Incognito, but the per-tab Chrome Action path still reads normal-profile Journal statistics for an Incognito tab and exposes that state through the action icon/title.

No new P-number is created.

## Positive controls that still hold

`assertRuntimeMessageSender()` rejects Incognito content-script commands except the explicitly permitted cache invalidation / settings transition. Therefore URL/title/PDF save requests from an Incognito renderer do not enter the normal persistent Journal/PDF/OperationLog save path.

`openJournalPage()` fresh-reads source/anchor tabs and rejects Incognito placement, preventing the normal Journal extension page from being opened from/next to a private source as a storage-history bridge.

These protections must remain.

## Confirmed disclosure path

`updateActionForTab(tabId, knownUrl = '')`:

1. starts an Action generation;
2. if URL was not supplied, calls `tabs.get(tabId)` but copies only `tab.url` and discards `tab.incognito`;
3. for an ordinary HTTP(S) URL calls `getJournalSummaryForUrl(url)` against the shared normal WebClip Journal/urlStats;
4. derives icon color and title state from `summary.lastSavedAt`.

The visible states encode at least:

- no saved record for this page;
- saved no more than 7 days ago;
- saved 8–30 days ago;
- saved more than 30 days ago.

There is no Incognito branch before the Journal read.

Both Action event paths feed this function:

- `tabs.onActivated` calls `updateActionForTab(tabId)`; the helper fetches the tab but ignores its Incognito flag;
- `tabs.onUpdated` receives the full `tab` object, but passes only `changeInfo.url || tab.url`, again discarding `tab.incognito`.

Therefore visiting URL X in an Incognito window can reveal through WebClip's action state whether/when X was saved in the ordinary-profile Journal. No private data needs to be persisted for this to be a privacy-boundary violation: ordinary browsing history-derived state is being projected into a private-tab UI that P0-045 intended to keep neutral.

## Why this is P0-045

P0-045 already owns the Incognito privacy boundary and explicitly states that ordinary Journal state must not be bridged into a private window. This is a regression/coverage gap in that same boundary, not a new root cause.

Chrome's documented default Incognito mode for extensions is spanning unless overridden, and Chrome recommends checking the `incognito` property of the relevant tab/window before saving or exposing browsing-related state. WebClip already relies on `tab.incognito` elsewhere, so the required signal is available.

## Required P0-045 refinement

`updateActionForTab` must receive or fresh-resolve a trustworthy tab context, not only a URL.

For `tab.incognito === true`:

- do **not** call `getJournalSummaryForUrl`, `urlStats`, or any other persistent history-derived read;
- render a fixed neutral Incognito action icon/title/badge independent of normal Journal contents;
- do not infer normal-profile save recency or existence;
- if the Incognito state cannot be determined reliably, fail closed to the same neutral state rather than falling back to a normal Journal lookup.

The `onUpdated` path should pass the full tab/incognito fact into the Action updater. The `onActivated` path may bounded-read the tab once and branch before any Journal DB access.

A later repair triggered by a timed-out/stale Chrome Action mutation must retain the same Incognito classification; repair must not re-read Journal for a private tab merely because the prior action mutation settled late.

Normal tabs keep existing color/title semantics.

The popup's Start/iframe-permission UX can be reviewed separately, but this checkpoint does not classify those controls as a persistent-history disclosure because privileged save commands remain blocked. The concrete regression here is the normal-Journal read and action projection.

## Required deterministic/browser regressions

1. Normal tab X with recent Journal record: existing green/recent action state remains.
2. Incognito tab at the same URL X: Action is fixed neutral and zero Journal/urlStats reads occur.
3. Incognito tab at URL with no normal record and URL with an old/recent normal record render identically.
4. `tabs.onActivated` for Incognito performs tab classification before Journal lookup.
5. `tabs.onUpdated(..., tab.incognito=true)` does not bypass the fence by supplying `knownUrl`.
6. Unknown/failed `tabs.get` in an Action refresh produces neutral state, not a normal Journal lookup using stale URL.
7. Late Chrome Action settlement/repair cannot switch an Incognito tab to history-derived state.
8. Existing P0-045 save/Journal-open Incognito rejections remain passing in real Chrome with extension Incognito access enabled.

## External Chrome documentation note

Chrome documents `spanning` as the default Incognito behavior for extensions unless another manifest mode is selected, and recommends checking `tabs.Tab.incognito` / `windows.Window.incognito` when extension behavior involves browsing-related data. Chrome also documents that extensions require explicit user enablement for Incognito access. The implementation should continue to use the concrete tab flag, not assume popup/background execution context alone identifies private browsing.

## Numbering

- Reopen/refine existing `P0-045`.
- No `P0-079`, `P1-198` or `P2-020` assigned by this block.
- Evidence-reserved P1-195/P1-196/P1-197 remain separate.

Previous product test gate was not re-run by this docs-only checkpoint.