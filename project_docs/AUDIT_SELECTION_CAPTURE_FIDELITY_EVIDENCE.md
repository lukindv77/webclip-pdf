# Durable audit evidence — selection / capture fidelity

Canonical status remains exclusively in `AUDIT_REGISTRY.md`. This file is durable supporting evidence for the current selection/capture fidelity findings first developed in `AUDIT_DELTA_SELECTION_CAPTURE_FIDELITY_2026-08-29.md`.

Baseline source for the finding tranche: `main` at `cef798f693ce5a7d4573484baf819389ace079af`. Runtime and `manifest.json` were not changed by the audit.

## P0-004 — selected copy completeness and selection-bounded presentation

Current `content.js::installPrintStylesForSelectionDocuments()` retains ancestors of an Include through `:has([data-webclip-pdf-include])`, while generic Include roots and ordinary ancestor chains keep page-owned clipping/layout/presentation constraints. Policy-safe Chromium probes reproduced loss of selected tail content under `height` combined with `overflow:hidden`, `overflow:auto`, `overflow:clip`, paint containment and fixed/sticky viewport-like containers. The same class also reproduces when `height + overflow` is on the Include root itself.

A separate control proved that an unselected structural ancestor can contribute its own `::before` / `::after` generated presentation to a selected-only PDF, even while ordinary unselected siblings are hidden. Therefore P0-004 is not merely pagination: the saved copy must be both complete for the user-selected content and bounded against presentation the user did not select.

Negative controls retained from the same tranche: ordinary long flex-column, grid, multi-column and table-like selected roots paginated through the tested Chromium path without losing the bottom marker; selected SVG text and same-document SVG `<use>` were preserved; the tested `content-visibility:auto` case also preserved content. The eventual fix must target proven clipping/selection-boundary causes rather than flattening all layout indiscriminately.

Historical P1-153 remains DONE for its exact root `html/body` / `its.1c.ru` pagination reproduction; it is a regression control, not blanket proof for arbitrary selected subtree fidelity.

## P1-226 — same-origin iframe selection geometry

`content.js::rectRelativeToTopViewport(element)` begins with the child `getBoundingClientRect()` and walks frame ancestors by adding only each frame element's `getBoundingClientRect().left/top`. Width and height remain the child rectangle dimensions.

This does not compose the child viewport coordinate space with the iframe content-box offset, iframe border box and outer CSS transform/scale/zoom. A Chromium reproduction using a bordered iframe with `transform:scale(.5)` produced materially different top-document position and dimensions from the simple-addition result. The error also exists with border alone and compounds through nested frames.

The geometry is authority-bearing, not cosmetic only: it drives hover/selected/excluded outlines, `isUsableCandidate()` and `elementsVisuallyOverlap()`. A wrong projection can therefore show a selection frame in the wrong place and can reject/allow independent selections based on false visual overlap.

Acceptance: use one truthful visual-coordinate model that composes content-box/border/transform/scale/zoom through nested same-origin frames, remains aligned under scrolling, and is shared by outlines, candidate usability and overlap decisions. Cross-origin identity/session/permission lifecycle remains owned by its existing frame owners.

## Dedup / related owners

No new owner was created for the following observations:

- Shadow DOM exact inner selection -> existing P2-006.
- Flattened same-origin iframe renderer-owned state such as canvas/current form selection -> existing P1-187.
- Custom disclosure `control.click()` during print preparation -> existing P0-067 / P1-212.
- Bounded current-resource readiness vs general virtualized/deferred-content materialization -> P1-003 plus P2-007 architecture boundary.
- Reader/article extraction heuristics -> P1-160 plus P2-007; Reader mode is not the fidelity definition for manual selection.

## External comparison evidence

The audit compared current WebClip behavior with Evernote Web Clipper mode separation, SingleFile deferred-resource/frame handling, Save Page WE lazy-content policy, Mozilla Readability's bounded article-extraction model and snapDOM's frozen-capture handling of Shadow DOM, renderer state and transform-aware geometry. These sources are hypothesis/architecture inputs only; P0-004 and P1-226 were registered from current WebClip source plus local browser reproduction, not from competitor behavior alone.

## Validation / release boundary

The evidence uses policy-safe Chromium semantic probes. It does not substitute for real unpacked Chrome QA, optional-host-permission QA or real Yandex OAuth/API E2E. No version/build/tag/Release change is implied.
