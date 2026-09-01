# Durable research evidence — complex selected layout / flattened iframe representation fidelity — 2026-08-29

Canonical status and single-owner authority remain exclusively in `RESEARCH_REGISTRY.md`. This document preserves source proof, managed-Chromium semantic reproductions, positive controls, dedup decisions and external web-clipping comparison from a 38-block deep-research tranche. Runtime, `manifest.json`, version, build/tag/release state and release readiness are unchanged.

Researched fresh source baseline: `main` at `ca906a363e88f5ce78281633370dbb644c080cae`.

Browser probes used managed Chromium `144.0.7559.96`. These are deterministic semantic/browser evidence, not final real-unpacked-Chrome, optional-host-permission or Yandex E2E release acceptance.

## Executive classification

No new P-number is justified by this tranche.

- **P0-004 ACTIVE** already owns selected-copy completeness and selection-bounded presentation. Fresh proof adds layout-context reflow, compositing-context loss and fixed-position paged duplication when unselected structural context is hidden.
- **P1-187 ACTIVE** already owns required rendered-state preservation in the flattened same-origin iframe proxy. Fresh proof expands that matrix from canvas/current select to layout properties, generated content, frame-local URL/resource provenance, object geometry, style-budget tail behavior and consistent fixed/static materialization semantics.
- **P1-160 ACTIVE** owns auto-content/page/frame discovery and graceful manual fallback. `display:contents` semantic roots demonstrate an eligibility/scoring refinement: large visible content may have a 0x0 principal-box rectangle and be rejected while BODY wins.
- **P1-003 ACTIVE** already owns the actual selected visual resource graph. Fresh delayed-resource probes add `border-image`, pseudo `content:url(...)` and external `clip-path:url(...)` examples. Transport-inconclusive SVG probes are explicitly not promoted.
- **P2-007 BACKLOG** remains the architecture owner for explicit capture/output modes and complete-static versus current-view materialization policy.

No existing status changes in this file. In particular, no P1-228 is allocated.

## Source boundary used by the tranche

Fresh `content.js` confirms:

- `isUsableCandidate()` accepts only an element whose projected rectangle has width and height at least 2 px;
- auto-content scoring reads the candidate's own `getBoundingClientRect()` and rejects geometrically tiny candidates even when descendants carry substantial visible content;
- selected-only printing hides ordinary unselected nodes while retaining structural ancestors;
- `FLATTENED_FRAME_STYLE_PROPERTIES` is an explicit partial computed-style allowlist;
- flattened iframe body materialization deep-clones the complete child subtree, copies computed styles only through `FLATTENED_FRAME_MAX_STYLED_ELEMENTS = 2500`, marks the rest but leaves browser defaults, removes scripts/excludes, mounts the proxy in the top document body and hides the original frame;
- flattened URL-state copying special-cases anchors, images and limited media source attributes rather than preserving every frame-relative resource reference;
- current top resource discovery explicitly extracts ordinary element `backgroundImage` URLs and element font state rather than a complete arbitrary CSS visual-resource graph.

Fresh `frame-agent.js` remains a separate remote-frame implementation and is not used as evidence that the same-origin flattened proxy is correct.

## Block 1 — `display:contents` semantic main has visible descendants but no usable root box — P1-160

Chromium fixture:

- `<main style="display:contents">` contained an article with 18 substantial paragraphs;
- main visible text length was about 2976 characters;
- `main.getBoundingClientRect()` was `0 x 0`;
- its visible article descendant occupied about `1200 x 852` CSS px.

Current `isUsableCandidate()` therefore rejects the semantic main itself even though the user can plainly see its descendants.

This is not a new geometry P-code. P1-160 already owns auto-content/page/frame discovery and graceful fallback; acceptance should not equate “no principal box” with “no meaningful visible region”.

## Block 2 — auto-content can fall back to BODY because a `display:contents` main scores `-Infinity` — P1-160

A fixture combined:

- navigation;
- a large semantic `main{display:contents}`;
- substantial article text under main;
- an unrelated sidebar.

The semantic main was rejected by the current geometric gate. Small paragraph descendants were individually below the normal main-content threshold, while BODY remained a high-scoring fallback. The resulting auto-content decision can therefore include navigation/sidebar instead of the semantic main content.

Required direction: bounded discovery may aggregate visible descendant geometry/semantics for boxless roots or fail gracefully to explicit manual selection rather than treating BODY as an exact article copy.

## Block 3 — inline selected content reflows after unselected inline context is hidden — P0-004

A selected inline span began around x=342 px inside a line containing earlier unselected inline siblings. After WebClip-equivalent selected-only hiding, the same span moved to about x=58 px while keeping similar intrinsic size.

The selected text is present, but the saved spatial presentation is not what the user selected. This is P0-004 selection-bounded presentation, not an independent inline-layout owner.

## Block 4 — flex item moves when unselected siblings disappear — P0-004

A selected flex item began around x=298 px. After ordinary unselected flex siblings were hidden, it moved to about x=58 px.

The print representation therefore recomputes flex placement from a different child set. Required fidelity must distinguish intentional “selected-only reflow” from a claimed faithful visual copy; current faithful-PDF semantics cannot silently conflate them.

## Block 5 — grid auto-placement changes when unselected items disappear — P0-004

A selected auto-placed grid item moved from roughly y=180 px to y=50 px after earlier unselected grid items were hidden.

This is the grid counterpart of the same P0-004 root cause: hiding structural siblings changes the layout algorithm that determined the selected element's original placement.

## Block 6 — selected table cell expands when the rest of the table is hidden — P0-004

A selected table cell changed from about 396 px wide to about 899 px wide and moved horizontally when unselected cells were hidden.

A table cell's visual meaning is often defined by the full row/column geometry. “Keep only the selected node” can materially redefine the selected presentation even though the selected text survives.

## Block 7 — `mix-blend-mode` loses its selected appearance when unselected backdrop is removed — P0-004

Screenshot control:

- selected red box used `mix-blend-mode:multiply` over an unselected blue backdrop;
- source center pixel was black `(0,0,0)`;
- after WebClip-equivalent hiding of the backdrop, center pixel became red `(255,0,0)`.

PDF rasterization reproduced the same qualitative difference: full context contained the blended dark region, selected-only output rendered the red element without the backdrop contribution.

The unselected node is not itself selected content, but it is part of the selected element's admitted visual compositing context. P0-004 must define how such context is retained/inertly materialized or truthfully degraded.

## Block 8 — `backdrop-filter` similarly depends on unselected visual context — P0-004

A selected translucent element with `backdrop-filter` rendered different sampled colors over its source backdrop. After the unselected backdrop was hidden, samples collapsed to the element's uniform pale-red appearance. PDF rasters likewise differed.

This is not permission to include arbitrary unselected page content. It proves faithful selection needs a bounded representation of the selected region's necessary visual backdrop/compositing inputs.

## Block 9 — top-document fixed descendant repeats on every PDF page — P0-004

A long selected document generated seven PDF pages and contained one selected/source descendant with `position:fixed`. Extracted PDF text contained `FIXED_MARKER` seven times — once on every page.

This is normal paged-media fixed-position behavior, but it is not necessarily an accurate archival copy of a screen element the user encountered once in the viewport.

## Block 10 — forcing `media:'screen'` can defeat a site's own print rule that would avoid fixed duplication — P0-004

Control page defined a screen fixed element plus a site `@media print` rule changing it to `position:static`.

- ordinary print media produced the marker once;
- production-style `Emulation.setEmulatedMedia({media:'screen'})` produced the marker on every page.

The project correctly uses screen media to prevent hostile/irrelevant site print CSS from removing selected content, but this control proves “force screen” also disables potentially fidelity-improving site print adaptation. P0-004 acceptance needs an explicit static-materialization policy rather than assuming screen CSS is always the correct paged representation.

## Block 11 — sticky is a positive control, not equivalent to fixed

In the corresponding long-page probe, `position:sticky` marker text appeared once rather than once per page. Do not generalize the fixed regression into a blanket ban on sticky or all positioned descendants.

## Block 12 — multicolumn positive control

A selected multicolumn fixture containing 60 individually named items retained all tested markers in the PDF. No generic multicolumn-loss owner is justified from this tranche.

## Block 13 — vertical writing-mode positive control

A selected vertical-writing fixture preserved all tested `VERTICAL_A/B/C` text. The top-document direct Chromium renderer can handle this primitive; a future capture layer should not regress it.

## Block 14 — RTL positive control

A selected RTL fixture preserved all tested `RTL_A/B/C` text. Again, no generic RTL defect is registered.

## Block 15 — selected transform positive control

A selected transformed top-document element retained the tested computed transform and rectangle across selected-only filtering. Transform is not automatically broken merely because other complex layout cases are.

## Block 16 — flattened iframe flex geometry loses gap and width context — P1-187

A same-origin frame body contained a flex row with a 500 px source width and 30 px gap. Source child x-positions were approximately 0, 150, 300.

Production-like flattening preserved `display:flex` but did not preserve the required width/gap layout state from the current allowlist. The proxy expanded toward top-document width, gap became `normal`, and children collapsed near the beginning of the row.

This is P1-187 rendered-state loss introduced by the secondary WebClip representation, not a limitation of direct Chromium PDF.

## Block 17 — flattened iframe grid tracks/gaps collapse — P1-187

Source grid used explicit `120px 160px` tracks plus a 20 px gap. In the flattened proxy, computed tracks became a single wide column and items stacked vertically.

P1-187 acceptance must include layout primitives required to reconstruct the current rendered frame state, not only text/font/border basics.

## Block 18 — flattened iframe writing mode and direction are lost — P1-187

Source used `writing-mode:vertical-rl` and `direction:rtl`. Proxy computed state became `horizontal-tb` and `ltr` because those properties are absent from the copied style set.

This creates a direct inconsistency with the positive top-document vertical/RTL controls: Chromium can render the state; WebClip's proxy discards it.

## Block 19 — flattened iframe visual effects are lost — P1-187

Source element used opacity, `filter:blur(...)` and box shadow. Proxy rendered opacity 1, filter `none`, shadow `none`.

Top-document direct control retained filter and box-shadow. This isolates the defect to WebClip flattening rather than PDF capability.

## Block 20 — flattened iframe pseudo-generated content disappears — P1-187

Source iframe stylesheet generated `PSEUDO_PREFIX` through `::before`. The flattened proxy did not carry the iframe stylesheet/pseudo materialization; proxy pseudo content evaluated to `none`.

This is the same rendered-state owner as canvas/select, not a new pseudo-only P-code.

## Block 21 — flattened iframe custom `::marker` content disappears — P1-187

A source ordered list used custom marker content `SEC-<counter> →`. Source computed marker content contained the custom rule; proxy marker content became ordinary `normal` because the frame-local generated-style rule was not represented.

This also composes with P0-004 counter/presentation fidelity but the frame-specific representation loss is P1-187.

## Block 22 — flattened image CSS geometry/object-fit state is not preserved — P1-187

Source image had explicit CSS width/height plus `object-fit:cover` and non-default `object-position`. Proxy state lost these geometry/cropping semantics; the special image rewrite instead focuses on absolute `src`, `max-width:100%` and `height:auto`.

A faithful frame representation must preserve the image the browser actually displays, including sizing/cropping state where applicable.

## Block 23 — current `<select>` selection can revert in the proxy — P1-187 confirmation

Source select runtime value was changed to `b` while markup default remained `a`. Production-like deep clone reported proxy value `a`.

This reconfirms the existing P1-187 current-control-state acceptance case.

## Block 24 — current range/progress values are positive controls

In the same Chromium environment, a runtime-changed `input[type=range]` value (`77`) and `<progress>` value (`66`) survived cloning. The eventual fix should target state that actually requires materialization and avoid blindly rewriting every control.

## Block 25 — canvas pixels remain absent from `cloneNode(true)` representation — P1-187 confirmation

Source canvas sampled a nontransparent drawn pixel; cloned proxy canvas sampled transparent black. Existing P1-187 explicitly names canvas-like rendered state, and this remains a core regression control.

## Block 26 — scroll position is reset by cloning, but policy must be mode-explicit — P1-187 / P2-007

A clone does not preserve arbitrary nested `scrollTop` as live renderer state. For PDF, however, the architecture policy may intentionally expand a scroll container into complete static flow rather than preserve its viewport slice.

Therefore scrollTop loss alone is not registered as a separate defect here. P2-007 must define current-view versus complete-static semantics, while P1-187 must faithfully implement the selected mode.

## Block 27 — relative SVG `<use href>` is rebound to top-document base — P1-187

Source iframe had a frame-local `<base href="https://frame.example/sub/">` and `<use href="icons.svg#s">`.

Within the source frame the resource resolves to `https://frame.example/sub/icons.svg#s`. After raw cloning into a top document with a different base, the same relative attribute resolves under the top document.

Current flattened URL-state copying does not special-case `use[href]`. This is frame-local resource provenance loss under P1-187, not P0-071 clickable-link safety.

## Block 28 — relative `<picture><source srcset>` is also rebound while `<img>` is separately absolutized — P1-187

A source `<source srcset="choice.png">` remains relative in the clone and therefore resolves against the top document. The child `<img>` is separately rewritten using its source `currentSrc`/absolute `src` and has `srcset` removed.

The flattened picture can consequently contain internally inconsistent resource provenance. P1-187 acceptance must preserve the exact admitted frame-local resource identity/current choice, not merely HTML attributes.

## Block 29 — 2500-element style budget silently converts the tail to browser defaults — P1-187 / P0-004

Production has `FLATTENED_FRAME_MAX_STYLED_ELEMENTS = 2500`. A 2605-element styled frame fixture demonstrated:

- an early source/proxy element retained the expected red-ish text, green-ish background, 23 px bold font and padding;
- source element around index 2550 had the same intended styles;
- corresponding proxy tail rendered black text, transparent background, 16 px normal-weight font and zero padding.

The complete subtree was already cloned; only style materialization stopped. Therefore budget exhaustion does not currently mean “bounded omission with explicit degraded state”; it can produce a silently plausible but incorrect tail.

P0-064 separately owns preflight subtree allocation. P1-187 owns truthful rendered-state behavior after admission.

## Block 30 — flattened fixed descendants are forcibly converted to static, unlike top-document fixed content — P0-004 / P1-187

`copyComputedFrameCloneStyle()` intentionally forces fixed/sticky/absolute proxy descendants to `position:static` so the proxy participates in paginated flow. A browser control confirmed a source fixed node becomes static in the proxy.

Combined with Block 9, WebClip currently has different static-capture semantics depending on whether equivalent content lives in the top document or a flattened same-origin iframe: top fixed may repeat on every page, flattened frame fixed is demoted to static.

The direction (static materialization) may be appropriate, but fidelity semantics must be consistent and explicit across frame boundaries.

## Block 31 — direct top-document filter/shadow is a positive control

Direct top-document source state retained the tested `filter:blur(2px)` and box shadow. This reinforces the architectural rule: secondary capture representation should not discard renderer behavior the direct browser renderer already provides.

## Block 32 — delayed CSS `border-image` is outside current explicit resource wait — P1-003

A selected element used a deliberately delayed border-image URL. Immediate `Page.printToPDF` returned well before resource settlement; a post-settlement PDF raster differed.

Current top resource discovery explicitly scans ordinary element `backgroundImage` and element font state, not border-image URLs. This is another example of the already-ACTIVE P1-003 visual-resource-graph contract.

## Block 33 — delayed pseudo `content:url(...)` is outside current explicit resource wait — P1-003

A selected pseudo-element used delayed `content:url(...)`. Immediate and settled PDF rasters differed, while current resource discovery does not inspect pseudo computed content/resource URLs.

No new owner: P1-003 now explicitly covers pseudo/CSS visual resources.

## Block 34 — delayed external `clip-path:url(...)` is outside current explicit resource wait — P1-003

A delayed clip-path resource likewise produced different immediate versus settled PDF raster results. Current scanner does not discover this CSS URL class.

Required acceptance remains bounded graph discovery/readiness plus truthful omissions, not an unbounded crawl of every possible URL-bearing CSS property.

## Block 35 — SVG external-resource transport controls were inconclusive and are not promoted

In the research environment:

- an SVG `<image>` request could be observed but the immediate/settled raster control did not establish a reliable visual difference;
- tested external SVG `<use>` / filter variants did not establish a usable network/readiness control in the `about:blank`-style managed fixture.

These are deliberately **not** classified as WebClip defects. Future real HTTP(S)/unpacked-browser testing may revisit them, but research evidence must not promote an unproven hypothesis merely because it fits the same conceptual category.

## Block 36 — mature capture-engine architecture corroborates iframe owner-document/state requirements

Fresh snapDOM primary project documentation describes explicit handling of same-origin iframes, canvas, video, form state, Shadow DOM, frame-owned fonts and pre-cached visual resources. Its 2026 issue/fix history is especially relevant:

- issue #371 reproduced missing pseudo-elements inside iframe capture;
- issue #441 traced iframe font loss to using global `document` instead of the capture element's `ownerDocument`;
- recent releases explicitly added/fixed visual-resource prefetch such as mask/border-image and current image-state freezing.

Transferable lesson: frame-local document/resource provenance and renderer-owned state are ordinary capture-engine architecture concerns. WebClip should solve them once in the shared captured-representation boundary where possible rather than add isolated per-symptom hacks.

References:

- https://github.com/zumerlab/snapdom/blob/main/FEATURES.md
- https://github.com/zumerlab/snapdom/issues/371
- https://github.com/zumerlab/snapdom/issues/441
- https://github.com/zumerlab/snapdom/releases

These references are hypothesis/architecture inputs only; WebClip ownership above comes from current source + local browser reproduction.

## Block 37 — other capture engines reproduce the nested-scroll completeness problem

An open html2canvas issue (#3273, December 2025) reports a large scrolling DIV where capture returns only the currently visible portion at any scroll position while the user expects the whole div content.

Reference: https://github.com/niklasvh/html2canvas/issues/3273

This independently validates that “selected scroll viewport versus complete reachable content” is a real user-facing capture contract, not a synthetic WebClip-only fixture. Ownership remains P0-004/P2-007 according to WebClip's registry.

## Block 38 — real web-clipper user reports reinforce selection/fidelity as the product metric

Fresh/relevant reports include:

- SingleFile issue #1932 (2026): Save Selection on a LinkedIn job listing can produce only the background instead of selected text;
- Joplin issue #15770 (2026): complete HTML capture visibly changes page styling and users explicitly expect the captured page to look like the browser;
- Joplin issue #4105: clipping modes omitted code snippets;
- Joplin issue #6076: images appeared online but were unavailable offline after clipping.

References:

- https://github.com/gildas-lormeau/SingleFile/issues/1932
- https://github.com/laurent22/joplin/issues/15770
- https://github.com/laurent22/joplin/issues/4105
- https://github.com/laurent22/joplin/issues/6076

Transferable lesson: successful file creation is not enough. Selection correctness, visual fidelity, complete resources and offline durability are the user-visible success criteria.

## Consolidated acceptance refinements

### P0-004 — selected-copy fidelity

Preserve or explicitly/materially transform under a declared capture mode:

1. layout context required to keep selected inline/flex/grid/table presentation meaningful;
2. compositing/backdrop dependencies required for the admitted selected appearance without leaking unrelated page content;
3. a coherent static policy for fixed/sticky/viewport-attached content across top documents and frames;
4. generated/counter presentation needed for selected meaning;
5. complete reachable nested-scroll content versus current-view semantics according to explicit mode;
6. truthful degraded diagnostics when a required context cannot be safely/materially captured.

### P1-187 — flattened same-origin iframe rendered state

Acceptance should cover, under bounded node/pixel/byte/time budgets:

1. flex/grid/gap/sizing and writing-direction state required by the admitted frame layout;
2. opacity/filter/shadow and other meaningful visual effects;
3. pseudo/marker/generated content and counters;
4. current control/canvas/media state where cloning is insufficient;
5. exact frame-local base/resource provenance (`use`, picture/source/current resource and similar URL-bearing representation state);
6. image sizing/cropping (`object-fit`/position) and equivalent current renderer state;
7. style-budget exhaustion must be explicit degraded/fail/alternate representation — never silently browser-default the tail;
8. static fixed/sticky/materialization semantics consistent with the top-document capture contract;
9. preserve current positive controls rather than rewriting renderer state that clone/direct print already handles correctly.

### P1-160 — auto-content discovery

A candidate with no principal CSS box but meaningful visible descendants (notably `display:contents`) must not be treated as intrinsically empty. Discovery remains bounded; if a trustworthy region cannot be derived, graceful explicit manual fallback is preferred to silently broad BODY capture.

### P1-003 — visual resource readiness

Current ACTIVE owner already covers the direction. Add border-image, pseudo content URLs and clip-path/resource-bearing CSS to the deterministic resource-graph matrix, while preserving global deadlines/count/byte/string limits and truthful omission diagnostics.

### P2-007 — mode separation

The evidence further supports explicit semantics for:

- faithful current visual selection;
- complete static/archival materialization of reachable scrolling/deferred content;
- Reader/simplified extraction;
- future HTML/archive output.

One mode must not silently substitute for another.

## Duplicate/numbering decision

No new code is assigned.

- P0-004 is the existing selected-PDF fidelity root owner.
- P1-187 is the existing flattened-frame rendered-state owner and is intentionally broad enough to include frame-local layout/resource provenance.
- P1-160 owns auto-content discovery/fallback; `display:contents` is a semantic eligibility refinement.
- P1-003 was already reopened ACTIVE by the immediately preceding research tranche and now explicitly covers the actual selected visual resource graph.
- P2-007 owns product/architecture mode separation.

P1-228 remains unassigned by this tranche; this file makes no statement that any absent number is globally free.

## Validation / release boundary

This is research-only evidence. Managed Chromium semantic probes do not substitute for:

- real unpacked Chrome/Chrome for Testing extension QA;
- real same-origin/cross-origin permission/revoke/regrant navigation cases;
- GPU-dependent WebGL/video cases;
- real Yandex OAuth/API E2E.

No production runtime, manifest, version, build, tag or release change is implied.
