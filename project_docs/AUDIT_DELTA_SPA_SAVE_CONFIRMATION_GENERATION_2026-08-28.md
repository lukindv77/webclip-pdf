# Audit delta — Save confirmation must remain bound to SPA/application generation — 2026-08-28

Source-of-truth `main` immediately before this write: `0baaa84eaa34e4b1eac73ee308e0caffa83faf5c`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged. No new P-number is assigned.

## Classification

Primary owner: **P0-080 — same-document SPA/application-generation selection authority**.

Adjacent:

- P0-075 — frozen printable representation after user authorization;
- P0-070 — exact browser document generation across content/worker/print handoff;
- P1-157/P1-210 — truthful user-operation settlement and retry semantics.

## Fresh source proof

`showFileCommentDialog()` creates a long-lived user confirmation surface. The Proceed handler does not carry any route/application-generation receipt captured when the dialog was opened. It simply reads the comment and later calls `downloadPdf()` / `sendPdfToYandex()`.

`downloadPdf()` then calls `buildSaveMeta(...)` **at Proceed time**. Thus metadata is intentionally fresh at the moment of final action.

That is normally useful, but under P0-080 it can create a mixed-generation operation:

- selection/review decision was made while SPA route A was visible;
- the same browser document performs `pushState()`/`replaceState()`/`popstate` to route B while the modal remains open;
- old selected Element references from A can remain in `state.includes` even when detached;
- user presses Proceed on the still-open A confirmation;
- `buildSaveMeta()` observes current route/title B;
- save/print operation is admitted from the old dialog without proving that its selection/review generation is still current.

The user confirmation is therefore itself an authority object whose lifetime can cross an application-generation change.

## Deterministic schedule

1. Route A is current and selection EA is live.
2. User opens Download/Yandex comment/confirmation dialog.
3. Dialog content visually represents the operation the user initiated on A.
4. Page performs same-document navigation A -> B and replaces the route subtree.
5. Content script remains loaded; dialog remains open because it belongs to the extension shadow UI.
6. No route-generation receipt invalidates the modal.
7. User presses Proceed.
8. `buildSaveMeta()` now observes B, while the old selection/review authority may still refer to A.
9. WebClip can create a B-labelled save from an A-authorized/stale selection state.

This is distinct from a route change that occurs before the user opens the dialog: the confirmation itself crossed the generation boundary.

## Required P0-080 refinement

A save/review/confirmation dialog must capture an immutable expected application-generation receipt when it is opened, including enough information to prove at Proceed time that:

- current browser document generation is unchanged under P0-070;
- current SPA/history/application generation is the same as the one reviewed;
- all authoritative selected local elements are still connected and belong to that generation;
- remote child-frame selections remain valid under P1-171;
- the URL/title metadata generation matches the reviewed selection generation.

On any mismatch:

- invalidate/close the stale confirmation;
- do not silently rebuild metadata for a newer route;
- return the user to selection/review with an explicit stale-page message;
- require a fresh confirmation.

The same rule applies to retry buttons that reuse old `options` after an error: retry may reuse user-entered comment/options, but it must not reuse stale page/application authority without revalidation.

## Composition with frozen print representation

P0-080 validation at Proceed time is necessary but not sufficient. After Proceed, P0-075 still requires the actual printable representation to be frozen/verified so host DOM mutation cannot alter the accepted content before `Page.printToPDF`.

The intended chain is:

`selection generation -> review/confirmation receipt -> Proceed generation check -> frozen printable generation -> exact document PDF receipt`.

No step may silently rebind to a newer route merely because the same browser document remains alive.

## Required regressions

1. Open save dialog on A -> no navigation -> Proceed succeeds normally.
2. Open dialog on A -> `pushState` B -> Proceed is rejected as stale before PDF/Yandex/local side effect.
3. Open dialog on A -> same URL but selected subtree is replaced -> Proceed fails live-selection validation.
4. Open dialog on A -> route B -> back to A via `popstate` -> old dialog is not automatically resurrected as current; require fresh confirmation unless an exact application-generation receipt proves equivalence by design.
5. Comment text entered before invalidation may be preserved as UI draft, but it cannot preserve stale save authority.
6. Retry after a PDF/Yandex error must revalidate current application generation before reusing old options.
7. P0-070 full-document replacement and P0-080 same-document route replacement both invalidate stale confirmation, through their respective generation receipts.

## Duplicate check

The existing P0-080 delta proves stale selection survival across SPA navigation. Repository search found no dedicated checkpoint for the **confirmation lifetime** crossing the same application-generation boundary. This file is therefore an acceptance refinement of P0-080, not a new item.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build/tag/Release was created.