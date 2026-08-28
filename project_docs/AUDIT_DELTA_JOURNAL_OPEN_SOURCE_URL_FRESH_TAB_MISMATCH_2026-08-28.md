# Audit delta — Journal open source URL vs fresh tab mismatch — 2026-08-28

## Scope

Docs-only audit of `openJournalPage()` source-context construction. No new P-number.

Refines **P1-175** source-document admission and composes with **P0-070** exact downstream save/document generation. It is distinct from P0-030's content-supplied foreign-tab-id issue: `WEBCLIP_OPEN_JOURNAL_PAGE` is not a content-script-allowed message, and context-menu callers use Chrome-provided tab data.

## Finding

`openJournalPage({ sourceTabId, sourceUrl, ... })` fresh-reads `chrome.tabs.get(sourceTabId)`, but a syntactically valid caller/event `sourceUrl` remains authoritative even when the fresh tab already has a different current URL.

Current logic is equivalent to:

1. `resolvedSourceUrl = String(sourceUrl || '')`;
2. fresh `sourceTab = tabs.get(tabId)`;
3. only when `resolvedSourceUrl` is **not** HTTP(S), replace it with `sourceTab.url`;
4. persist `{sourceTabId: tabId, sourceUrl: resolvedSourceUrl}` into Journal session context.

Therefore the worker can create a context whose tab id and URL never described the same current browser document at the time the context was stored.

### Deterministic browser-event rollover schedule

1. Context-menu click is delivered with Chrome tab snapshot A at URL `UA`.
2. `handleContextMenuClick()` calls `openJournalPage({sourceTabId:T, sourceUrl:UA})`.
3. Before `openJournalPage()` performs its fresh `tabs.get(T)`, T navigates to document B at URL `UB`.
4. Fresh `tabs.get(T)` successfully proves the tab now exists as B/UB.
5. Because supplied `UA` is already a valid HTTP URL, current code does not replace/compare it with UB.
6. Worker stores context `{sourceTabId:T, sourceUrl:UA}` and opens Journal.
7. Initial current-URL/site view can be based on UA while the actionable source tab is B.

The same class applies to a trusted extension-page caller carrying an older URL observation while the tab has already navigated.

## Why fresh `tabs.get()` is not currently providing the intended proof

The worker already pays the cost of a fresh privileged tab read and fails closed when it cannot determine the source tab. That is a useful positive control.

But the read is presently used only to:

- reject Incognito;
- supply a URL when caller URL is absent/non-http.

It is not used as an expected-vs-current precondition when the caller URL is valid. Thus stale caller/event metadata can override fresher browser observation.

## Required source-context contract

When `sourceTabId > 0`:

- the fresh Chrome tab observation is authoritative for current browser URL/window/incognito state;
- caller/event `sourceUrl` is at most an **expected prior observation**, not a newer source of truth;
- if expected URL differs from current URL, either explicitly rebind the requested Journal mode to the current tab/document under product rules or fail/reconfirm; never persist the mixed pair;
- stored Journal context should carry exact current document/navigation generation in addition to tabId/current URL once the P1-175/P0-070 document-receipt design exists;
- same-URL full reload must still invalidate the old document generation even though URL comparison succeeds.

`anchorTabId` remains placement authority only; it must not replace source identity.

## Acceptance cases

1. Event/caller supplies UA and fresh tab is still A/UA -> context stores one coherent A receipt.
2. Event/caller supplies stale UA but fresh tab is B/UB -> no `{T,UA}` mixed context is stored.
3. Current/site mode after navigation either explicitly uses current UB or fails stale according to chosen UX; it never silently filters UA while targeting B.
4. Same-URL reload UA→UA still changes document generation and old source receipt becomes stale.
5. Missing/closed source tab remains fail-closed.
6. Incognito classification continues to come from fresh Chrome tab state, not caller URL.
7. A later Journal Apply/save consumes the exact context generation and cannot retarget through tab-id reuse/navigation.

## Classification

- **P1-175** remains primary source-context/page-command admission owner.
- **P0-070** remains exact document generation through live PDF/save finalization.
- **P0-030** remains content-sender payload/tab authority and is not expanded merely because this extension/context-menu stale-observation schedule exists.

No new P1-211 is allocated.

## Validation note

Documentation only. Runtime/tests/manifest unchanged. Product tests were not rerun; historical 88/88 JS syntax + 74/74 deterministic PASS remains prior evidence. No build/tag/release.