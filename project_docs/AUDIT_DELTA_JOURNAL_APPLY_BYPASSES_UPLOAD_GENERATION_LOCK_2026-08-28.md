# Audit delta — Journal Apply bypasses active upload generation lock — 2026-08-28

Source-of-truth `main` immediately before this write: `a56796186da77a04928bbc6ef0693e08dbb8253e`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Primary existing owners:

- **P1-175/P0-070** — Journal Apply command/source-document authority;
- **P0-001** — explicit selection state preservation;
- **P1-198/P1-210** — operation-generation/terminal receipt separation;
- **P0-017** — shared command semantics on the source page.

## Fresh source proof

The content-script top-level runtime handler has a direct branch:

`WEBCLIP_APPLY_SELECTION_SNAPSHOT` -> `startSelection()` -> `applySelectionSnapshot(...)`.

This branch does not pass through `handleExternalCommand()`.

`handleExternalCommand()` contains the active-upload gate:

- while `state.pageUploadActive` is true, ordinary commands are rejected and told to wait for the Yandex save to finish.

The direct Apply branch does not test `pageUploadActive` before clearing/replacing selection state.

## Deterministic cross-window race

1. Source page has selection A and starts Yandex upload U.
2. PDF/meta for U are already captured; `pageUploadActive=true` while remote work continues.
3. A separate Journal page contains template T and targets the same source tab/document.
4. User presses Apply in Journal.
5. Even after future P1-175 exact-document validation succeeds, the delivered `WEBCLIP_APPLY_SELECTION_SNAPSHOT` currently bypasses U's page-operation lock.
6. `startSelection()` clears current source-page selection/UI and begins a new selection generation.
7. `applySelectionSnapshot(T)` installs template T while U is still active.
8. Old U later reaches terminal state and its completion path sets `phase='review'` and rewrites the modal for U.
9. The newer template/application session is therefore interrupted/overwritten by terminal UI belonging to the older upload generation.

The remote bytes of U remain the earlier artifact; the defect is local page-operation ownership and user-state loss.

## Required refinement

### One source-page operation admission gate

All selection-mutating entry points must consume the same page-operation state machine, including:

- popup/direct Start;
- context-menu Start/Reset/Auto Content;
- Journal `APPLY_SELECTION_SNAPSHOT`;
- future restore/import selection commands.

When upload U is active, Apply must either:

- fail/ask the user to wait; or
- be explicitly queued as a new operation generation that starts after U terminal.

It must not clear/replace selection underneath U.

### Document authority and operation authority are independent

P1-175/P0-070 answers **which document** receives Apply.

This checkpoint answers **whether that exact document is currently available for a new selection mutation**.

Both checks are required. Exact document identity alone does not authorize concurrent mutation of an already-owned page workflow.

### Terminal events are generation-scoped

Old U progress/terminal UI may update U's operation receipt, but it must not overwrite a newer Apply generation if explicit queueing is ever supported.

## Required regressions

1. No active upload -> Journal Apply works normally after exact document/site validation.
2. Active U -> Journal Apply is rejected/deferred; source selection is unchanged.
3. Active U -> direct forged/stale compatibility Apply cannot bypass the same gate.
4. Apply queued after U, if supported -> U terminal UI completes before template mutation begins.
5. Exact source-document replacement still fails under P1-175/P0-070 independently of upload lock.
6. Application generation changed under P0-080 -> stale template decision is revalidated even when upload is idle.

## Duplicate check

Repository history already covered Journal Apply exact document authority and the immediately preceding popup Start upload-lock bypass. No dedicated checkpoint covered the direct `WEBCLIP_APPLY_SELECTION_SNAPSHOT` branch bypassing `pageUploadActive`.

This is a new manifestation of existing owners, not a new P-number.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build, tag or GitHub Release was created.