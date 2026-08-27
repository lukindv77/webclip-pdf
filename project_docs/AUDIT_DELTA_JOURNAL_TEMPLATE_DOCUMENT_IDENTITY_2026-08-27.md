# Audit delta — Journal template apply document identity — 2026-08-27

Baseline HEAD before this audit block: `b6422112f67ed82bebd71241b45b1e56e13259de`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed.

## Scope

Fresh audit of Journal source-context storage and `Применить Включены/Исключены` authority, focused on existing `P1-157`, `P1-175`, `P1-125`, with dependencies `P0-070` / exact document generation.

## Confirmed context model

`openJournalPage()` creates a random `contextId` and stores `{ sourceTabId, sourceUrl, createdAt }` in `chrome.storage.session` under `webclipJournalContext:<id>`. Journal reads that random context, validates the 24-hour TTL and bounded URL, then attempts `chrome.tabs.get(sourceTabId)` to refresh `sourceUrl` from the current tab.

This is materially better than putting the source URL/tab id directly into user-controlled query parameters, and this pass found no new cross-extension/runtime sender ACL bypass in that context lookup.

However the context is only a **historical tab/source hint**. It is not an exact document capability.

## Exact stale-document authority

### 1. UI admission is computed from a prior source snapshot

When an entry card is rendered, Journal computes:

- `sameUrl` from `entry.url` vs current stored/resolved `sourceUrl`;
- `sameSite` from those URLs;
- `canApply = sourceTabId > 0 && sameSite`.

The Apply button is then enabled based on that previously observed state.

There is no immutable `documentId` or full-document navigation generation attached to the context/button.

### 2. Apply bypasses the worker scripting settlement/document layer

`journal.js::applyEntry(entry)` directly executes:

1. `chrome.scripting.executeScript({ target: { tabId: sourceTabId }, files: ['content.js'] })`;
2. `chrome.tabs.sendMessage(sourceTabId, { type: 'WEBCLIP_APPLY_SELECTION_SNAPSHOT', snapshot: ... })`;
3. `chrome.tabs.update(sourceTabId, { active: true })`.

These calls are made directly from the extension page rather than through the service-worker bounded/document-aware scripting machinery.

Therefore existing worker protections/repairs around `P1-125` do not protect this Apply path.

### 3. Navigation race

A deterministic schedule exists:

1. Journal resolves source tab A and renders an enabled Apply button for site S;
2. source tab navigates/reloads before the click or while direct scripting starts;
3. Journal does not fresh-compare an exact document receipt immediately before injection;
4. `executeScript(tabId)` and subsequent `sendMessage(tabId)` target whichever document currently owns that tab id.

A same-site navigation is especially dangerous because the previously rendered `sameSite` policy would still conceptually allow template reuse, yet the user may not have authorized applying the selected snapshot to that exact new document. A cross-site navigation can also race after the last check because there is no worker-side atomic/fresh document admission at dispatch.

This is the same root cause class as current document-generation findings; no new P-number is required.

## Required refinement of existing items

### P1-157 — centralize extension-page Chrome API side effects

Journal template Apply must stop being an ad-hoc direct `executeScript + sendMessage` chain. Route it through one worker-owned operation contract that provides:

- bounded Chrome reads/scripting actual-settlement semantics;
- exact source tab/document receipt;
- generation invalidation;
- one operationId/diagnostic timeline where appropriate;
- no blind second injection if first scripting settlement is unknown.

### P1-175 / P0-070 family — exact document authority

At the moment the user clicks Apply, capture/revalidate the **current exact source document**, not only tab id/site URL.

Immediately before injection/command and before accepting the response:

- verify tab still exists;
- verify full-document generation/documentId matches the admitted receipt;
- fail closed on reload/navigation, including same-URL replacement;
- never allow a stale Apply response from the old document to mutate/update UI as though it applied to the new one.

If product intent permits applying a template to a newly navigated page of the same site, require a new explicit admission for that current document rather than silently inheriting an old 24-hour context.

### P1-125 — scripting late-success receipts

The Apply path must use the same document-generation-aware scripting settlement model. A late successful injection into an old document must not satisfy a subsequent Apply attempt for a replacement document.

## Session context lifecycle

The random 24-hour session context can remain a navigation/UX hint, but it must not itself be treated as a durable capability to mutate whichever future document happens to reuse the tab.

A useful split is:

- context: `sourceTabId/sourceUrl` for display/filter/navigation only;
- short-lived exact document receipt: generated/refreshed at the actual user Apply action and invalidated by any full-document navigation.

## Required deterministic regressions

1. Render Apply on document A; navigate to different origin B before click: no injection/message reaches B.
2. Render on A; same-URL reload before click: old context cannot authorize replacement document.
3. Same-site navigation after render: requires fresh current-document admission; old receipt is rejected.
4. Navigation after `executeScript` starts but before it settles: late injection/response is stale and cannot satisfy the new document generation.
5. Two rapid Apply actions do not start overlapping unknown scripting operations against one tab generation.
6. Closed source tab produces a bounded clear error and never re-targets another tab.
7. Normal same-document Apply still restores the requested snapshot and activates the source tab.
8. Existing site-template product behavior remains available after explicit fresh admission for the current document.

## Classification

No new P-number created. Extend `P1-157`, `P1-175`, `P1-125`; preserve exact-document dependencies in `P0-070`/`P1-171` where shared infrastructure is used.

`P0-079` remains the newly evidence-reserved PDF cache operation-isolation defect. `P1-198` remains free at this checkpoint.

Previous product test gate was not re-run by this docs-only audit checkpoint.
