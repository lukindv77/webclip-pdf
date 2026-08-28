# Audit delta — popup/context-menu Start Selection semantic parity — 2026-08-28

Source-of-truth `main` immediately before this write: `a2871e2a8a65f42e218e2c455b4b672748fd38ad` plus docs-only `ae9e3baaa38e9030336d3042bf435785ea5ef697` on `main`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged.

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

No dedicated repository audit checkpoint was found for the divergence between `WEBCLIP_START_SELECTION -> startSelection()` and `WEBCLIP_COMMAND start -> ensureSelecting()`.

The root is not a new feature class: P0-017 already requires common page behavior and P0-001 owns preservation of explicit selections. No new P-number is needed.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build, tag or GitHub Release was created.