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

## P1-226 — fresh source/model revalidation, 2026-09-12

### Baseline, scope and provenance

Researched canonical `main`: `ecc3068a9763703ffa4f742754aff7d911338dde`; `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`. Current requirements, rationale, architecture, Registry, context manifest, research policy, navigation and Cycle 2 matrix were checked at that SHA. No open PR or Issue was present at admission. P1-226 remains **ACTIVE**; this section is supporting evidence, not a second status ledger.

This is a bounded revalidation of an existing selection/geometry owner: B1 intent/admission and B2 capture, with downstream outline/usability/overlap consumers. Mode: RESEARCH-ONLY. Required local evidence: current source execution with controlled geometry inputs and mathematical counterexamples; browser-owned geometry remains L3-required, physical saved-selection fidelity L4-required, real unpacked interaction L5-required. Termination envelope includes ordinary, bordered, scaled, reflected, rotated, nested, scrolled and invalid-chain variants, controls, alternatives and a concrete continuation contract. It does not claim project-wide coverage completion or refresh the complete product opportunity baseline.

Historical branch `research/p1-226-iframe-geometry-2026-09-08`, head `01223475f75449be73fba8c51226767e80c81821`, is 3 commits ahead / 60 behind this baseline; merge-base `d4f5b268fa3f7ced5a7bc68da52784863d614138`. Its `RESEARCH_P1_226_IFRAME_GEOMETRY_2026-09-08.md` was read for provenance. No wholesale branch import or historical test PASS reuse occurred. The prior affine model and proposed source-token gate do not establish a browser implementation. This pass executes the actual current functions and refines the model's information-loss and unknown-result boundaries.

The existing indexed selection/capture evidence file can hold this refinement without losing the older evidence above; no additional standalone report or navigation ledger is needed. Historical Chromium observations above remain historical, not newly executed renderer results.

### Current source and numerical counterexamples

`content.js:938` resolves the embedding frame, catching denied `frameElement` access. `rectRelativeToTopViewport()` at 974 adds only ancestor frame rectangle `left/top`, preserving the original child width/height. Its cycle guard and requirement to reach the top document are useful controls. It catches the initial element rectangle read but not a subsequent frame rectangle read.

`getDocumentRect()` at 1006 adds top scroll once. `isUsableCandidate()` at 845 uses the resulting dimensions and the 2 CSS-pixel threshold. `elementsVisuallyOverlap()` at 995 uses an axis-aligned intersection greater than 0.5 in both axes; missing geometry becomes `false`. That boolean influences manual Include admission around 750 and snapshot restoration around 1486. `updateHoverOutline()` at 2183 and `appendOutline()` at 2222 use the viewport projection directly.

The new test `project_tools/test_p1_226_frame_projection_revalidation_model.js` extracts and executes eight complete current functions with numeric DOM and outline-style doubles. It does not replace the production projection with a handwritten imitation.

| Controlled input | Current source result `(left, top, width, height)` | Projection from explicit affine inputs |
|---|---|---|
| Child `(10,20,30,40)`, frame origin `(100,200)`, inner border/padding offset `(13,17)` | `(110,220,30,40)` | `(123,237,30,40)` |
| Child `(20,30,100,40)`, frame scale `.5`, origin `(100,200)`, inner offset `(10,10)` | `(120,230,100,40)` | `(115,220,50,20)` |
| Nested inner scale `2` / outer scale `.5`, both with inner offsets | `(135,247,20,10)` | `(128,241,20,10)` |
| Child `(20,30,40,10)`, 90-degree frame rotation and inner offset | `(220,130,40,10)` | `(255,130,10,40)` |

These are deterministic coordinate experiments, not measurements from Chrome. The scale case reaches both actual outline consumers. A 3-by-3 child reduced by `.5` remains admissible in current source despite a 1.5-by-1.5 projected envelope; enlargement demonstrates the reverse error. Separate fixtures produce false overlap and false separation. An inaccessible chain returns no geometry, but current overlap converts this uncertainty into apparent separation. A throwing frame-rectangle double escapes the current projection; this establishes exception containment behavior only, not a claim that a particular native Chrome getter normally throws.

Positive controls: top-document coordinates, borderless nested translation, final top-scroll addition, detached source elements, denied frame lookup and cyclic chains behave as described by current source. Child rectangle values already include child scrolling; adding child scroll again would introduce another error.

### New refinement: preserve geometry information and coordinate units

1. **A frame bounding box does not identify its coordinate basis.** An ordinary frame and a horizontally reflected frame can have identical outer rectangles while mapping the same child point to different top positions. Ratios of outer rectangle dimensions to layout dimensions cannot recover arbitrary rotation, skew or reflection. A nonzero transform origin and transformed non-frame ancestors must be included in the mapping, not just the iframe's own computed `transform` string.
2. **Carry points through the entire chain before deriving an envelope.** A 20-by-10 rectangle rotated 45 degrees and then inversely rotated returns to 20-by-10 when its corners are retained. Taking an axis-aligned bounding box between the rotations instead yields 30-by-30 at `(-5,-10)`. This is information loss even with perfect matrices. Transforming the corners of an already unioned/rotated child bounding box also cannot reconstruct lost fragments or the actual painted shape.
3. **Units must be explicit.** Each adapter maps the child geometry API's coordinate units into the parent geometry API's units. CSS zoom, CSS transform scale, browser page zoom, device pixels and visual-viewport zoom are not interchangeable. A synthetic already-normalized input demonstrates that blindly applying an inherited factor twice doubles dimensions. It does not assert which effective factor a specific Chrome version needs.
4. **Projection certainty differs from visible-intent certainty.** Correct projected points and their envelope do not prove visibility, clipping, hit target or polygon overlap. The model includes separated fragments whose envelope intersects a gap. That remaining rendered-intent problem belongs to P1-228. Current `positionFixedBox()` also clamps negative left/top to -2 while retaining dimensions; fixing projection alone does not make arbitrary offscreen/clipped outlines exact.
5. **Unknown must remain distinguishable from disjoint.** A missing, stale, unsupported or failed mapping must not be silently admitted as non-overlapping. Proposed UI handling is to refresh the exact chain/geometry once under bounds, then make uncertainty visible and defer the affected commit. This is a remediation proposal, not an adopted UX change. No automatic substitution with a different frame or whole-frame selection is authorized.

### External comparison, checked 2026-09-12

| Primary source | Relevant observation and applicability boundary |
|---|---|
| [CSSOM View draft](https://drafts.csswg.org/cssom-view/#dom-element-getboundingclientrect) | Bounding rectangles enclose client rectangles, are snapshots and use CSS coordinates. The draft GeometryUtils section describes fragment quads and coordinate conversion with same-origin checks. Draft API descriptions are not evidence that target Chrome implements those APIs. |
| [CSS Transforms 1](https://drafts.csswg.org/css-transforms-1/#transform-rendering) | Transform origins and ordered matrix composition determine coordinate mappings; transformed client rectangles reflect rendering. This supports carrying a basis/points, not reconstructing a general transform from a bounding rectangle. |
| [CSS Viewport draft](https://drafts.csswg.org/css-viewport/#zoom-property) | Geometry APIs and computed-style/layout lengths can expose different scaled/unscaled units; effective zoom can extend into nested frames. This makes adapter unit normalization a separate renderer acceptance item. The draft is not a measurement of the supported runtime. |
| [Floating UI implementation](https://github.com/floating-ui/floating-ui/blob/master/packages/dom/src/utils/getBoundingClientRect.ts) | Fetched Git blob `58d5d1324f7b9a2762763ef0bd15513bb7ff1561`: the iframe loop accounts for scale, inner border/padding offsets, positions and dimensions. Useful evidence for a narrow axis-aligned adapter; its scalar mapping is not proof for arbitrary affine or perspective selection geometry. No code/dependency is imported. |
| [Floating UI issue 2184](https://github.com/floating-ui/floating-ui/issues/2184) | A reporter described misplaced overlays across scaled iframe/page coordinates; a maintainer linked a Floating UI resolution. This is an isolated adjacent-product failure report, not WebClip evidence, a present-day Popper claim or prevalence measurement. |
| [MDN rectangle API](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect) | Border/padding inclusion and viewport-relative coordinates support separate content-origin and final document-scroll handling. Documentation does not prove our DOM adapter or overlay implementation. |

Searches also sought implementation issues and Reddit/community experiences. Much returned material was generic or irrelevant; it was excluded. The linked firsthand issue supplies a concrete reported use case, but the search establishes no trend, prevalence estimate or broad user consensus. This focused refresh supports the existing operation: select content inside an embedded page with an outline aligned to that content. A separate product mode is not proposed.

### Alternatives and proposed implementation sequence

| Alternative | Benefit | Cost / limitation |
|---|---|---|
| Add border offsets only | Small change, helps ordinary bordered frames | Still fails scale and every general transformed-basis case; insufficient for P1-226 closure |
| Proven axis-aligned adapter | Bounded geometry work, can cover common positive-scale cases | Must prove absence of unsupported transforms along the full relevant ancestor chain and normalize zoom units; unknown cases need truthful handling |
| Native quad/conversion capability or a validated full adapter | Can preserve ordered points across nested affine mappings | Capability/version proof required; deriving complete layout, origin, scroll and transform mappings by hand is costly and easy to get wrong; perspective remains a distinct proof obligation |
| Render outlines inside each child document | Avoids some top-overlay projection work | Does not solve cross-document overlap authority; introduces style/listener/lifetime and clipping integration costs |

Recommended sequence: define a typed geometry result with coordinate-domain and certainty fields; build and browser-validate the same-origin mapping adapter; carry bounded fragment points through every exact embedding document; derive an envelope only for consumers that explicitly accept one; migrate hover, selection outlines, usability, manual overlap and restore overlap together. Revalidate geometry at commit as well as preview. A shared document/frame identity is necessary but insufficient for caches: the same frame can move, resize, scroll, animate or change zoom without navigation. Cache lifetime must be bounded to a proven geometry sample or invalidated/recomputed, not keyed only by element identity. Coalesce repeated reads within that sample to avoid repeated layout work across N selections and D frame ancestors; no latency claim is measured here.

The proposed pure model rejects wrong document/frame bindings, stale synthetic epoch/revision receipts, inaccessible/missing mappings, nonfinite coordinates, degenerate matrices, cycles, excessive chain depth and excessive point counts. It publishes all points or an explicit unknown result, never a partial ancestor projection. Its 32-edge / 64-point / coordinate and determinant bounds are illustrative test limits, not new canonical product requirements. The model assumes plain trusted adapter records; it does not implement DOM acquisition, real invalidation detection or a browser-atomic layout snapshot.

Defensive boundary: geometry stays local and transient; no page text, URL, credential or selection coordinates need to be sent to a new service. No optional permission expansion or cross-origin DOM bypass is proposed. P1-227 retains topology discovery/listener cleanup/session work; P1-228 retains rendered-intent, clipping, fragmented geometry and hit testing. P0-004 retains saved-copy fidelity; P1-199…P1-203 and P1-229 retain remote-frame lifecycle/print representation. No new P-code is needed.

### Validation and exact continuation

Local Node `v24.19.0`: syntax check and execution of the final model file passed, **24 named checks**. The local `content.js` Git blob was calculated and matched the exact GitHub blob above. The test executes current source defects as expected counterexamples and proposal properties as model checks; PASS does not mean production fixed. Permanent CI separately runs its pinned Node version and repository gates.

Current coverage from this pass: B1/B2 same-origin coordinate projection and consumer logic are L1/L2-covered with FINDING/PARTIAL outcomes. L3 geometry acquisition and native rendering are not rerun here: no Chrome/Chromium executable was found through the local executable lookup. No renderer-support, physical PDF, real extension or external-service PASS is claimed. Historical browser evidence remains in the earlier section with its original scope.

Next implementation/closure tranche must use real supported Chrome fixtures for border plus padding, positive/nonuniform scale, zoom and inherited zoom, transformed non-frame ancestors, nonzero transform origins, nested rotation/reflection/skew, child/top scroll, frame movement/resize, clipped and partially offscreen content, unavailable geometry and changing frame documents. Verify actual pointer target, hover/Include/Exclude outline, minimum-size and overlap decisions together. Define truthful handling or prove support for perspective/3D and fragment geometry. Then verify saved selected scope in physical PDF and real unpacked interaction where claimed. These gates remain open; P1-226 is ACTIVE.

Delivery is research evidence plus this deterministic model only. Runtime, requirements, architecture decisions, Registry status, release readiness and workflows are unchanged. `EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION` remains the hard fence; P1-231 S2 authorization, release authorization and product ZIP authorization remain false. P1-231 S0-F portability work is outside this tranche.
