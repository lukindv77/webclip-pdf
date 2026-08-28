# Audit delta — Chrome Action must not retain previous-URL truth after degraded Journal read — 2026-08-28

Docs-only audit checkpoint. Runtime/config/manifest/tests are unchanged.

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