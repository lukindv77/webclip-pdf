# WebClip — Cycle 2 T2 modern pseudo/top-layer state evidence — 2026-08-31

Date: 2026-08-31

Campaign: `DEEP-RESEARCH-CYCLE-2-2026-08-31`

Tranche: **T2 / PD3 — `::backdrop` / `::scroll-marker` admitted state -> physical PDF**

Canonical source baseline: `main = 73a6c6f6f21ae0a32f331234474823c63cbb7820`

Final managed-browser evidence head: `014b944f6d7374414fcfbf54baf1674a38059152`

Final managed-browser run: GitHub Actions run `33353163299`, job `99370235973`

Browser: **Google Chrome for Testing 152.0.7977.64**

Outcome: **`PD3 ARTIFACT-COVERED / FINDING`**

This document closes the Cycle-2 PD3 coverage deficit. It does **not** claim implementation closure, release readiness, or completion of families that still contain another independent Cycle-2 variant.

## 1. Platform trigger

PD3 was promoted by the current browser/API delta rather than invented as an arbitrary new surface:

- Chrome 135 stable introduced `::scroll-marker` and `::scroll-marker-group` for scroll containers;
- Chrome 152 stable extends the JavaScript `CSSPseudoElement` interface to `::backdrop`, `::scroll-marker`, and `::view-transition`;
- Chrome 152 explicitly treats these pseudo-elements as interaction-addressable browser-owned state.

Official references used by this tranche:

- Chrome 152 release notes: `https://developer.chrome.com/release-notes/152`
- New in Chrome 152: `https://developer.chrome.com/blog/new-in-chrome-152`
- Chrome 135 release notes: `https://developer.chrome.com/release-notes/135`

The external platform evidence establishes feature relevance/current support. It does not by itself establish a WebClip bug; the WebClip finding is established by current-source and physical-PDF evidence below.

## 2. Research question

When page-owned modern pseudo/top-layer state is visible at WebClip admission, does the physical PDF remain bound to that admitted state, or can page-owned `beforeprint` logic silently retarget the browser-owned pseudo state at the actual print cut?

Two renderer-owned state classes are exercised:

1. native dialog top-layer `::backdrop` visual state;
2. active `::scroll-marker` state derived from a scroll container.

The required boundary is B2 Admission -> B3 Capture -> B4 Static Materialization -> B5 Renderer -> B6 Physical Artifact.

## 3. L1 current-source result

Current `content.js` was re-read at canonical source baseline `73a6c6f6f21ae0a32f331234474823c63cbb7820`.

No current WebClip mechanism was found that:

- recognizes or snapshots page-owned `::backdrop`;
- recognizes or snapshots `::scroll-marker` / `::scroll-marker-group` active state;
- materializes either pseudo state into a WebClip-owned inert print representation;
- binds the pseudo state to the admitted generation before `beforeprint` can alter it;
- verifies that `Page.printToPDF` serialized the admitted pseudo state;
- reports truthful degradation/unknown when such browser-owned pseudo state cannot be preserved.

The extension's own modal backdrop is an ordinary extension Shadow-DOM `<div class="backdrop">`; it is not a capture mechanism for a page's native top-layer `::backdrop`.

The current selected-only print preparation continues to install live-page print styles into selected documents and then relies on the live renderer through `beforeprint`/`Page.printToPDF`. Therefore current source contains no PD3-specific authority boundary that could prevent page-owned render-cut retargeting.

## 4. Owner/root-cause saturation before classification

The canonical Registry already contains the applicable root causes:

- **P0-070** — user save authority must remain the exact admitted full-document generation through physical print and later persistence;
- **P0-075** — the live host page is not a trusted print/control plane; print representation should be isolated;
- **P0-004** — the saved selected copy must preserve selected physical fidelity and must not silently substitute unowned presentation;
- **P1-003** — supporting resource/representation owner for pseudo/CSS visual graph preparation where resources are involved.

No independent root cause was established by PD3, so **no new P-code is allocated** and `RESEARCH_REGISTRY.md` remains unchanged.

## 5. L3/L4 managed-browser method

A self-contained synthetic probe was run under Chrome for Testing 152.0.7977.64. It does not load a real user page, credentials or external service.

Durable probe:

- `project_tools/research_pseudo_top_layer_scroll_marker.py`

The probe creates four physical scenarios:

1. stable blue native-dialog `::backdrop` positive control;
2. blue admitted `::backdrop` changed to red by page-owned `beforeprint`;
3. stable `::scroll-marker` with marker #2 current at admission;
4. marker #2 current at admission, then page-owned `beforeprint` scrolls to marker #3.

For every scenario it records current feature support, relevant JS `Element.pseudo()` objects, admission screenshot state, actual PDF bytes, 96-DPI PDF raster state, extracted PDF text, post-print page state and SHA-256 hashes.

Explicit Exclude and hover-only negative controls are retained. The first draft run was **not accepted** because its scroll fixture used `body:hover`, which made the hover control active. That fixture was corrected to a dedicated hover source and the full Chrome 152 run was repeated. Only final run `33353163299` / job `99370235973` is accepted as T2 evidence.

A temporary branch-only Actions workflow was used to execute the current-browser probe and was deleted before the delivery PR.

## 6. Current-feature proof on Chrome 152

Final run reports:

- browser version `152.0.7977.64`;
- `CSS.supports('selector(dialog::backdrop)') = true`;
- `CSS.supports('scroll-marker-group: after') = true`;
- `CSS.supports('selector(.x::scroll-marker)') = true`;
- `typeof Element.prototype.pseudo = "function"`;
- native dialog `d.pseudo('::backdrop')` returns a pseudo object of type `::backdrop`;
- each carousel item `item.pseudo('::scroll-marker')` returns a pseudo object of type `::scroll-marker`.

The tested states are therefore current renderer features, not unsupported syntax accidentally inferred from styling alone.

## 7. Physical results

### 7.1 Stable `::backdrop` positive control

Admitted native-dialog backdrop is blue.

- admission corner RGB: `[0,0,255]`
- physical PDF corner RGB at 96 DPI: `[0,0,255]`
- post-print computed backdrop remains `rgb(0, 0, 255)`
- PDF SHA-256: `d86eb5c6aa080f7250d60f89c2b12a05a39f05b723ac6516330002c8ca0ee637`
- admission PNG SHA-256: `ae7c97c0e6164564bb2208251c8a878b4b7257e660154e6e8b0e93c4e51abbb2`
- PDF-raster PNG SHA-256: `eef8a394a8b6bcf0cf68bbf4b9ab7c5cd1cfcc3cc136363dcff1990f01d9a4af`
- control label present in PDF text;
- Exclude absent;
- hover-only absent.

A stable modern top-layer pseudo state can therefore be serialized correctly by the renderer; PD3 is not a generic `::backdrop` unsupported/omission failure.

### 7.2 `::backdrop` retargeted at `beforeprint`

At admission the exact same fixture is blue. Page-owned `beforeprint` changes only the CSS variable driving the backdrop to red.

- before print computed `::backdrop`: `rgb(0, 0, 255)`
- admission corner RGB: `[0,0,255]`
- physical PDF corner RGB: `[255,0,0]`
- after print computed `::backdrop`: `rgb(255, 0, 0)`
- PDF SHA-256: `25e92a2976e5c8e267a69e4b7b1e603113eeef0da3e28059baa3c42ce267b415`
- PDF-raster PNG SHA-256: `5291a78c04e57240b3efe91cc28501d12d689d59d14f08510e3b3446a15a0ac7`
- Exclude absent;
- hover-only absent.

The physical PDF therefore reflects the later host-page mutation rather than the admitted visible backdrop state.

### 7.3 Stable active `::scroll-marker` positive control

The carousel is admitted at `scrollLeft=300`, where the second marker is current/blue and item `TWO` is the visible content.

Admission marker samples:

- marker #1 `[0,0,0]`
- marker #2 `[0,0,255]`
- marker #3 `[0,0,0]`

Physical PDF marker samples are identical, with active marker index `2`.

- post-print `scrollLeft=300`
- extracted PDF content includes `TWO`
- PDF SHA-256: `a4657481334401407a245989d16282506260e3301563b56fcca77681ddd4ad2f`
- admission PNG SHA-256: `ee5c070285c40943942c3242074d73d7973e8c584c28984b9ea754ed08c65ba5`
- PDF-raster PNG SHA-256: `af85a001dbd193ab5e5533e1eae3de05afc6d3f16e9c1b2cc2b7b9bb5ddb09f2`
- Exclude absent;
- hover-only absent.

A stable active scroll-marker state therefore survives physical printing when the page does not retarget it.

### 7.4 Active `::scroll-marker` retargeted at `beforeprint`

Admission is again `scrollLeft=300` / active marker #2 / visible `TWO`. Page-owned `beforeprint` changes the scroll position to `600`.

Admission active marker: **#2**.

Physical PDF samples:

- marker #1 `[0,0,0]`
- marker #2 `[0,0,0]`
- marker #3 `[0,0,255]`

Physical PDF active marker: **#3**.

Additional physical consequence:

- after print `scrollLeft=600`;
- extracted PDF content is `THREE`, not admitted `TWO`;
- PDF SHA-256: `bfa677fa1ae11eb7adef332c007d58467ed78ce9d7f2aafe8e06c7e73334b683`
- PDF-raster PNG SHA-256: `0c1a9c2b6fa66621f0d4c2707cfe3873dc04e4f2ac390206138f52d7d82e1612`
- Exclude absent;
- hover-only absent.

This proves both browser-owned pseudo interaction-state drift and ordinary visible-content drift at the same physical render cut.

## 8. Finding

**Current WebClip has no admitted-state boundary for modern page-owned pseudo/top-layer state, and the live `beforeprint` renderer boundary can silently replace an admitted `::backdrop` / active `::scroll-marker` state in the physical PDF.**

The renderer itself is capable of serializing stable PD3 state correctly. The defect is therefore the absence of WebClip-owned admission/materialization authority around the live host page, not a blanket inability of Chrome PDF printing to represent these pseudo-elements.

The scroll-marker fixture is especially consequential because the same `beforeprint` action changes both the marker's browser-owned active state and the physically serialized logical viewport content (`TWO -> THREE`).

## 9. Matrix consequence

PD3 moves from `REVALIDATION-REQUIRED` to:

**`ARTIFACT-COVERED / FINDING`**.

Family consequences:

- **C14** — PD2 + PD3 are both current-covered; family becomes terminal Cycle-2 `ARTIFACT-COVERED / FINDING`;
- **C20** — PD3 covered but **PD1 remains**, so family remains `REVALIDATION-REQUIRED`;
- **C25** — its PD3 deficit is covered; family becomes terminal Cycle-2 `ARTIFACT-COVERED / FINDING`;
- **C27** — its PD3 deficit is covered; EI1 remains ranking/closure context rather than a separate coverage deficit, so family becomes terminal Cycle-2 `ARTIFACT-COVERED / FINDING`.

Cycle-2 family metrics therefore move from **31 terminal / 15 revalidation families** to **34 terminal / 12 revalidation families**.

Remaining family-level revalidation set:

`C02, C03, C05, C07, C16, C18, C20, C28, C29, C32, C33, C35`.

Remaining current-stable platform-delta variants:

`PD1, PD4, PD5, PD6`.

PD7 remains WATCH until current-stable promotion.

## 10. Reproducibility / provenance

Accepted current-browser evidence:

- run: `33353163299`
- job: `99370235973`
- exact evidence head: `014b944f6d7374414fcfbf54baf1674a38059152`
- browser: `Google Chrome for Testing 152.0.7977.64`
- runner: GitHub hosted Ubuntu 24.04

The durable probe remains in the repository; the temporary workflow used only to execute it is intentionally removed before PR delivery.

## 11. T2 termination decision

T2 satisfies the required envelope:

- official current-platform trigger confirmed;
- current source has no PD3 preservation/materialization mechanism;
- Chrome 152 feature support and JS pseudo-object access proven;
- stable `::backdrop` positive control physically matches admission;
- `beforeprint` backdrop mutation physically diverges from admission;
- stable active `::scroll-marker` positive control physically matches admission;
- `beforeprint` scroll retarget changes both physical active marker and PDF content;
- actual PDF bytes/raster/text/hashes provide L4 evidence;
- Exclude and corrected hover controls remain negative;
- owner saturation maps to existing P0-070/P0-075/P0-004 with P1-003 support;
- no new P-code is needed.

Decision: **T2 COMPLETE — PD3 `ARTIFACT-COVERED / FINDING`.**

Cycle 2 remains **`DEEP-RESEARCH-IN-PROGRESS`**.

Next ranked tranche: **T3 / PD5+PD6 — CSS `text-fit` + print `page-margin-safety` typography/pagination -> physical PDF**.