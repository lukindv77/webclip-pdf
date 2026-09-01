# Research evidence — format-neutral capture and faithful PDF research — 2026-08-29

This file is durable research/product-architecture evidence. It does **not** define current P-code status; `RESEARCH_REGISTRY.md` remains the sole status/owner authority.

Baseline for source inspection: `main` at `0ec05ec7ea478494eeb8589c14826e8914f61e4b`. Runtime and `manifest.json` were not changed by this research.

## Executive classification

This tranche did not justify a new P-code.

- PDF responsive/layout-state manifestations refine current **P0-004** faithful selected-PDF acceptance.
- Live/timing capture manifestations compose with existing P0-004/P0-070/P0-075 frozen-generation direction.
- Flattened-frame renderer-owned state remains **P1-187**.
- Disclosure activation remains **P0-067 / P1-212**.
- Format-neutral capture plus explicit faithful/reader/HTML/future modes remains naturally under existing **P2-007** backlog scope.

## 1. Screen media type is a useful positive control, but not a frozen screen layout

Current worker uses CDP `Emulation.setEmulatedMedia({media:'screen'})` before `Page.printToPDF` and requests `printBackground:true`.

Browser control:

- site `@media print` would replace `SCREEN_ONLY` with `PRINT_ONLY` under ordinary print;
- WebClip-equivalent `media:'screen'` preserved `SCREEN_ONLY`.

This is correct and should remain a regression control.

## 2. Responsive width can silently switch desktop -> mobile in PDF

Policy-safe Chromium reproduction:

- source viewport: `1200x800`;
- screen CSS default displays `DESKTOP_VIEW`;
- `@media screen and (max-width:900px)` displays `MOBILE_VIEW`;
- live page at admission: `DESKTOP_VIEW`;
- A4 `Page.printToPDF` with `media:'screen'`: `MOBILE_VIEW`.

Thus media type is preserved while layout-dependent media conditions are reevaluated against print geometry. Faithful PDF cannot equate `media:'screen'` with “what the user saw”.

## 3. Orientation can silently switch

At the same original `1200x800` landscape viewport, a screen orientation query displayed `LANDSCAPE_VIEW`. Portrait A4 PDF selected `PORTRAIT_VIEW` even though CDP media type remained `screen`.

Classification: same P0-004 responsive-layout root cause.

## 4. Container-query state can silently switch

A container at the original wide viewport displayed its wide branch. The PDF page geometry narrowed the same container enough to select its narrow container-query branch.

Classification: same P0-004 responsive-layout root cause.

## 5. Viewport units are recomputed from page geometry

A selected red block sized `50vw x 50vh` measured `600 x 400` CSS px on a `1200 x 800` source viewport. Rasterized A4 PDF at 96 dpi measured approximately `397 x 561` px on a `794 x 1123` page: exactly the print-page 50vw/50vh interpretation rather than the admitted source geometry.

Classification: same P0-004 visual-layout fidelity acceptance.

## 6. Resolution and color-scheme controls did not reproduce the layout failure

Controls in the same Chromium environment:

- `deviceScaleFactor=2` plus `@media (min-resolution:1.5dppx)` stayed in the high-resolution branch in PDF;
- `prefers-color-scheme:dark` stayed in the dark branch.

The finding is specifically that viewport/layout-dependent state can be recomputed, not that every media feature is lost.

## 7. Time-varying animation state is not deterministic in the live print path

A CSS animation moving a visual element was printed twice from the same loaded page about 500 ms apart. Rasterized object position was materially different between outputs.

This is direct evidence that live `Page.printToPDF` samples the current rendering timeline. Existing frozen-generation evidence already owns the broader admission-to-render TOCTOU; animations/transitions are a concrete visual-state regression case.

## 8. WebClip UI can itself destroy page `:focus` state before capture

Current `content.js::showFileCommentDialog()` calls `textarea.focus()` asynchronously in the WebClip shadow UI.

A browser control with a page button whose visible content changes under `:focus` showed:

1. before WebClip-like shadow focus: `PAGE_FOCUSED_VISIBLE_STATE`;
2. after shadow textarea focus: `PAGE_NOT_FOCUSED`;
3. PDF: `PAGE_NOT_FOCUSED`.

Independent controls proved Chromium can print an existing focused/hovered state. Therefore the loss is not inherently a PDF limitation; capture admission occurs after WebClip UI may already have changed the source presentation.

Faithful capture needs a defined admission point before extension UI destroys relevant visible interaction state, or an explicit mode contract excluding that transient state.

## 9. Top-layer/URL interaction-state positive controls

Direct browser print preserved visible content of:

- open `<dialog>`;
- open popover;
- `:target` state.

These are useful controls for future frozen representation tests.

## 10. PDF visual-style positive controls

With `printBackground:true`, rasterized PDF preserved tested:

- solid background color;
- gradient;
- opacity blending;
- grayscale CSS filter.

This does not prove all CSS fidelity; it prevents misclassifying the responsive-layout defect as a generic inability of Chromium PDF to preserve visual styling.

## 11. Current form/control and link behavior positive controls

Direct top-document PDF preserved the current selected `<select>` value in text extraction. A custom-rendered checkbox whose `.checked` property was changed after markup rendered the checked visual state in the PDF.

A normal HTTP(S) anchor produced a real PDF `/Link` annotation with its URI. Therefore safe clickable-link preservation is technically compatible with faithful PDF; P0-071 remains responsible for enforcing safe schemes on the exact immutable printed representation.

## 12. Direct top-document canvas is printable; flattened cloning is the weaker boundary

A canvas filled half red/half blue was printed directly and both color regions were present in the rasterized PDF. This is a positive control showing Chromium PDF can preserve current canvas bitmap.

Current same-origin iframe flattening relies on deep cloning and is already covered by P1-187 because `cloneNode(true)` does not preserve canvas bitmap and does not uniformly preserve all renderer-owned state. The solution should not regress the stronger direct-print capability while making iframe representation inert/paginatable.

## 13. WebClip frame width normalization can create a responsive iframe mismatch

Control A: a same-origin iframe with fixed `width:1000px` displayed its wide screen branch and retained that branch in PDF.

Control B: the same child with iframe `width:100%` displayed the wide branch at the original 1200 px top viewport but switched to the narrow branch in A4 PDF.

Current WebClip print preparation explicitly normalizes selected frames to `width:100%` / `max-width:100%`, so the second behavior is directly relevant to WebClip-specific iframe preparation. P0-004 faithful responsive-state acceptance therefore applies to embedded content as well as the top document.

## 14. Closed/revealable content requires an explicit mode policy

Current preparation automatically sets closed native `<details>.open = true` and also attempts custom disclosure expansion. Separately, P0-067/P1-212 already prohibit activating page-owned controls to reveal content.

For a future **faithful current-view PDF**, silently turning closed presentation into expanded presentation conflicts with “copy what the user actually saw at admission”. For an explicit **expanded/reader** mode, revealable content may be materialized into an inert representation so that static output remains useful.

This is not a new root cause; it strengthens the reason P2-007 must distinguish capture/output modes instead of having one hidden transformation policy.

## 15. Chromium snapshot primitives are useful inputs, not a complete canonical copy

Primary CDP documentation says:

- `Page.captureSnapshot` MHTML serialization includes iframes, Shadow DOM, external resources and inline styles;
- `DOMSnapshot.captureSnapshot` returns flattened DOM including iframe/template/imported documents, flattened Shadow DOM, layout and requested computed styles, with optional DOM rects/paint order/background information.

Local runtime-state probe:

- MHTML contained the markup input value, not a later `.value` property mutation;
- MHTML did not materialize a later checkbox checked property into the tested markup and did not contain the canvas bitmap;
- MHTML did contain open Shadow DOM text;
- `DOMSnapshot.captureSnapshot` exposed the runtime input value, `inputChecked`, `optionSelected`, Shadow DOM and layout information;
- DOMSnapshot did not itself provide the canvas pixel bitmap as an archival resource.

Conclusion: neither primitive alone should be declared the canonical WebClip snapshot. They are promising inputs to a composed, bounded, provenance-fenced format-neutral capture layer.

## 16. External architecture and user-experience evidence

External research used as hypothesis/architecture input:

- SingleFile distinguishes selected content/selected frame/full page and documents deferred image/frame materialization as best-effort; its known issues explicitly acknowledge cases where canvas/video representation and sandboxed iframe content cannot be saved.
- Webrecorder/Browsertrix uses real browsers for high-fidelity dynamic capture and exposes WARC/WACZ replay-oriented archival workflows, illustrating a capture/replay model distinct from PDF rendering.
- User reports across other clippers repeatedly describe the failure mode in product terms: only URL saved, only first article part saved, text saved without images, or clipped content disappearing later. This supports measuring WebClip success by self-contained truthful copy rather than “file/API call succeeded”.

These external sources did not assign any WebClip P-code. Current-source/browser evidence above controls classification.

## Architecture consequence for P2-007

Long-term direction should be:

`selection + exact source/document/frame generation + admitted visible/interactable state`

-> bounded, inert, provenance-carrying **format-neutral captured representation**

-> explicit renderers/serializers such as faithful PDF, simplified/reader PDF, HTML and future archival formats.

The capture layer should preserve state once where possible; renderer-specific transformations then have explicit contracts. PDF-specific pagination/live-DOM mutation must not become the canonical definition of all future copies.

## Release boundary

All browser reproductions in this file are policy-safe local Chromium probes. They are not real unpacked Chrome release QA. Real optional host-permission flows and real Yandex OAuth/API E2E remain external release gates. No build/tag/Release/version change is implied.
