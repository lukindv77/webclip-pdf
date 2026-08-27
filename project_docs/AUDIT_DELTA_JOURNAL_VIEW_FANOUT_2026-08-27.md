# Audit delta — Journal view materialization and action refresh fan-out — 2026-08-27

Baseline HEAD before this audit block: `20fc5362a6678763b02f2b1cc4326d177c75674f`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged by this commit. Canonical registry synchronization is not claimed.

## Scope

Fresh audit of Journal rendering/scanning and Chrome Action refresh behavior, focused on existing `P1-009`, `P1-170`, `P1-174`.

## P1-174 — fresh exact proof

The service-worker page query itself is lightweight: `WEBCLIP_JOURNAL_VIEW_PAGE` returns view summaries. However the extension page immediately defeats that saving:

1. `journal.js` receives the summaries.
2. It immediately calls `readJournalEntriesByIdsForView(summaries.map(entry => entry.id))` for the whole visible page.
3. It then calls `renderEntries(fullEntries)`.

Therefore up to the current page size are again materialized as complete Journal records before cards are rendered.

The card builder eagerly materializes heavy fields:

- full `fileComment` is assigned to a DOM text node;
- `buildJournalComments(entry)` iterates all comments and assigns each `comment.text` to DOM, including deleted comments inside collapsed `<details>`;
- `buildSelectionDetails(entry.selectionSnapshot || {}, ...)` is constructed for each card;
- resource-report details are also constructed eagerly.

A collapsed `<details>` element is only visually collapsed; its child DOM/text is already allocated. Therefore a page with 20 maximally sized valid entries can still create the previously identified tens-of-MiB text/DOM footprint.

### Required P1-174 acceptance

- Keep the summary page genuinely lightweight end-to-end.
- Do not point-read all full entries immediately after receiving summaries.
- Heavy fields (`fileComment`, complete comments/deleted-comment text, selection locators, full resource diagnostics) should be loaded/materialized only on explicit expansion/action and only for that entry/section.
- Summary must carry only bounded small previews/counts/status fields required to render the closed card.
- Expanded heavy point-read must be generation-fenced; closing/superseding a card must prevent stale late data from mutating the current DOM.
- A single entry can still approach existing multi-MiB limits, so heavy expansion needs its own rendering/text budget and graceful truncation/secondary view rather than a large synchronous DOM burst.

## P1-170 — fresh exact caller/fan-out inventory

`refreshActionForAllTabs()` currently does:

- direct `chrome.tabs.query({})`;
- `Promise.all(tabs.map(updateActionForTab(...)))` across every open tab.

`updateActionForTab()` reads per-URL Journal statistics and performs several Chrome Action mutations. Existing action settlement caps cover the Chrome Action mutation promises, but they do not bound the preceding O(number-of-tabs) reads/tasks or overlapping refresh waves.

Confirmed production callers that start a new fire-and-forget all-tab wave:

- Journal append;
- single-entry delete;
- bulk clear;
- replace import;
- initial worker load/start refresh.

Comment add/edit/delete do **not** call `refreshActionForAllTabs()` in the current runtime, so P1-170 implementation/tests can focus on the real fan-out callers rather than every Journal mutation.

There is no global coalescing/generation owner around these waves. Rapid successive saves/import/clear events can therefore overlap multiple all-tab `Promise.all` traversals. Per-tab Chrome Action generation prevents an older action write from winning visually, but does not cancel or coalesce the expensive old reads/task fan-out.

### Required P1-170 acceptance

- One global refresh generation/coalescer for all-tab refresh requests.
- At most one bounded worker pool over tabs, not `Promise.all` over the entire browser tab set.
- If a refresh arrives while one is running, coalesce to one latest pending generation; do not create a wave per event.
- Skip stale generation before expensive per-tab Journal read where possible, not only before final action writes.
- Keep direct single-tab refreshes (`onActivated`, relevant `onUpdated`) separate from all-tab invalidation, but coordinate per-tab generations so they cannot be overwritten by stale bulk work.
- `tabs.query` itself should use the bounded Chrome-read contract from P1-158 rather than an unbounded direct await.
- Preserve correctness of badge/title/icon after append/delete/clear/import and after same-url/tab navigation fixes.

## P1-009 relation

Fresh review confirms the heavy full-Journal scan remains conditional on the text-filter path: `journalViewSummaryMatches(..., { entry })` calls `WebClipJournalTextFilter.matches(entry, ...)`, so comment-text filtering still evaluates the complete entry payload while scanning candidates. That remains the root cause already recorded in P1-009.

Do not “solve” P1-174 by removing full point-reads while leaving P1-009 to synchronously rescan multi-MiB comments across up to 100k entries. They are distinct costs:

- P1-009: query CPU/deadline and full-payload scanning;
- P1-174: visible-page full-record/DOM materialization;
- P1-170: all-tab action refresh fan-out.

## Required regressions

1. Normal page view of 20 heavy entries does not fetch/materialize their full comments/snapshots until expansion.
2. Deleted comment text is not inserted into DOM merely because its collapsed details exists.
3. Expanding one card loads only that card's heavy fields; stale late point-read after collapse/page change is ignored.
4. 100 rapid appends coalesce all-tab Action refresh work instead of producing 100 `tabs.query + all-tabs` waves.
5. Large tab count uses bounded concurrency and latest-generation semantics.
6. Comment add/edit/delete do not unnecessarily trigger an all-tab wave unless a future badge requirement explicitly needs it.
7. P1-009 filtered query semantics remain exact while moving toward a bounded index/summary architecture.

## Classification

No new P-number created. Fresh proof extends existing `P1-170` and `P1-174`; `P1-009` remains a separate OPEN query-cost item.

Previous product test gate was not re-run by this docs-only audit checkpoint.
