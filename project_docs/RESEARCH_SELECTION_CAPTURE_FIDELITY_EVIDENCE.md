# Durable research evidence — selection / capture fidelity

Canonical status remains exclusively in `RESEARCH_REGISTRY.md`. This file is durable supporting evidence for the current selection/capture fidelity findings first developed in `RESEARCH_DELTA_SELECTION_CAPTURE_FIDELITY_2026-08-29.md`.

Baseline source for the finding tranche: `main` at `cef798f693ce5a7d4573484baf819389ace079af`. Runtime and `manifest.json` were not changed by the research.

## P0-004 — selected copy completeness and selection-bounded presentation

Current `content.js::installPrintStylesForSelectionDocuments()` retains ancestors of an Include through `:has([data-webclip-pdf-include])`, while generic Include roots and ordinary ancestor chains keep page-owned clipping/layout/presentation constraints. Policy-safe Chromium probes reproduced loss of selected tail content under `height` combined with `overflow:hidden`, `overflow:auto`, `overflow:clip`, paint containment and fixed/sticky viewport-like containers. The same class also reproduces when `height + overflow` is on the Include root itself.

A separate control proved that an unselected structural ancestor can contribute its own `::before` / `::after` generated presentation to a selected-only PDF, even while ordinary unselected siblings are hidden. Therefore P0-004 is not merely pagination: the saved copy must be both complete for the user-selected content and bounded against presentation the user did not select.

### Responsive screen-state is not frozen by `media: screen`

The current worker deliberately calls CDP `Emulation.setEmulatedMedia({media:'screen'})` before `Page.printToPDF`, which is a useful positive control: a site `@media print` branch no longer silently replaces an explicitly selected screen element. `printBackground:true` is also requested.

However policy-safe Chromium probes show that screen **media type** is not equivalent to the user's original screen **layout state**:

- original viewport `1200x800` selected the desktop branch of `@media screen and (max-width:900px)`;
- the PDF selected the mobile branch because responsive screen queries were reevaluated against the paginated print geometry;
- the same original landscape viewport selected `orientation:landscape`, while the portrait A4 PDF selected `orientation:portrait`;
- a CSS container-query control likewise switched from the wide branch on screen to the narrow branch in the PDF.

Controls: the tested DPR/resolution query (`deviceScaleFactor=2`, `min-resolution:1.5dppx`) remained in its high-resolution branch, and `prefers-color-scheme:dark` remained dark. The finding is therefore not “all media state is lost”; it is that layout-dependent responsive state is recomputed from print geometry rather than frozen from what the user saw.

P0-004 acceptance therefore includes preserving or truthfully representing the admitted responsive visual state instead of silently changing desktop/mobile/orientation/container-query variants during PDF rendering.

### WebClip UI can destroy a visible interaction state before capture

`content.js::showFileCommentDialog()` schedules `textarea.focus()` inside WebClip's shadow UI. Focusing an extension-owned shadow descendant makes the WebClip host the top document's active element and blurs the page-owned element that previously had focus.

A browser control reproduced the consequence: before WebClip-like shadow focus, a page button rendered its `:focus` branch; after the shadow textarea received focus, the page rendered the non-focused branch, and that non-focused branch was what `Page.printToPDF` captured. In contrast, independent controls showed that browser print itself can preserve an already-present `:focus`/`:hover` state, open `<dialog>`, open popover and `:target` state.

This is a capture-admission/fidelity manifestation rather than a new owner: a future frozen representation must define the user-visible state at admission before WebClip UI interaction destroys it, or explicitly declare which transient interaction states are intentionally outside the fidelity contract. It must not silently claim to preserve “what the user saw” after WebClip itself has changed that state.

### Time-varying visual state

A CSS animation control printed the same loaded page at two different moments and produced materially different object positions. This confirms that current live-DOM `Page.printToPDF` samples the page timeline at render time. Existing frozen-generation evidence already owns the broader TOCTOU/root-cause direction; animation/transition timelines are a concrete visual-state acceptance case, not a new P-code.

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
- Live-DOM changes and time-varying visual state between admission and render -> existing frozen-generation / P0-004, P0-070 and P0-075 direction; responsive and focus probes above add concrete fidelity acceptance cases.

## External comparison evidence

The research compared current WebClip behavior with Evernote Web Clipper mode separation, SingleFile deferred-resource/frame handling, Save Page WE lazy-content policy, Mozilla Readability's bounded article-extraction model and snapDOM's frozen-capture handling of Shadow DOM, renderer state and transform-aware geometry. These sources are hypothesis/architecture inputs only; P0-004 and P1-226 were registered from current WebClip source plus local browser reproduction, not from competitor behavior alone.

## Validation / release boundary

The evidence uses policy-safe Chromium semantic probes. It does not substitute for real unpacked Chrome QA, optional-host-permission QA or real Yandex OAuth/API E2E. No version/build/tag/Release change is implied.
