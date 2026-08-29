# Audit delta — selection / capture fidelity — 2026-08-29

Baseline canonical `main`: `cef798f693ce5a7d4573484baf819389ace079af`.

This is audit evidence, not an implementation checkpoint. Production runtime, `manifest.json`, release state and historical product-test claims are unchanged.

Canonical current status remains in `AUDIT_REGISTRY.md`. This delta records source proof, policy-safe browser reproductions, dedup decisions, positive controls and external web-clipping research from a 16-block deep-audit tranche.

## Executive result

Two audit-status changes are justified:

1. **P0-004 is ACTIVE again with a broader selected-PDF fidelity contract.** The exact historical P1-153 `its.1c.ru` root-document pagination bug stays DONE; this is a different root cause. Current selected-only print CSS keeps ordinary ancestors of an Include alive without normalizing their clipping/layout/visual effects, and does not neutralize clipping on the Include root itself. Those constraints can truncate selected descendants or inject unselected presentation into the PDF.
2. **New P1-226 is ACTIVE.** Same-origin iframe selection geometry is projected to the top viewport by simple rectangle addition, which is wrong for iframe border/content-box offsets and CSS transform/scale/zoom. The same geometry drives hover/selected outlines, candidate usability and independent-selection overlap rejection.

No new owner is assigned for Shadow DOM, flattened-frame rendered state, disclosure activation, general deferred-content strategy, Reader-mode extraction, ordinary flex/grid/multicol/table pagination or the tested content-visibility/SVG cases: those observations either refine existing owners or are retained as negative controls.

## Block 1 — same-origin iframe geometry: new P1-226

### Source proof

`content.js::rectRelativeToTopViewport(element)` starts from the child element's `getBoundingClientRect()`, then walks to the top document and performs only:

```text
left += frame.getBoundingClientRect().left
top  += frame.getBoundingClientRect().top
```

The returned width/height remain the child rectangle width/height. `getDocumentRect()` derives from this result, and the result feeds:

- `isUsableCandidate()`;
- `elementsVisuallyOverlap()`;
- hover outline placement;
- selected/excluded/suggestion outline placement.

A child viewport coordinate is relative to the iframe's **content box**, while the parent `frame.getBoundingClientRect()` describes the transformed **border box**. An outer transform/scale also changes the child's rendered dimensions in the parent coordinate space. Simple addition therefore does not compose the coordinate spaces.

### Policy-safe browser reproduction

Chromium 144 probe:

- iframe parent position: left 100 px, top 50 px;
- iframe border: 10 px;
- iframe `transform: scale(.5); transform-origin: 0 0`;
- child element rect inside the iframe: left 30 px, top 40 px, width 100 px, height 50 px.

WebClip-equivalent simple addition predicts approximately:

```text
left=130, top=90, width=100, height=50
```

The rendered child box in top-document coordinates is approximately:

```text
left=120, top=75, width=50, height=25
```

The mismatch exists without transform because border must be accounted for; scale/transform magnifies the semantic error and nested frames compose it repeatedly.

### Why this is independent

- P1-004 is the cross-origin iframe feature umbrella.
- P1-171 owns cross-origin frame/document identity and navigation generation.
- P2-006 owns Shadow DOM selection scope.
- No current owner/family/history item found owns same-origin child-to-top visual coordinate transformation for selection UI and overlap authority.
- Git/code history search found no prior P1-226 assignment.

### P1-226 acceptance

1. Child coordinates are mapped through iframe content-box offset, border and transform/scale/zoom semantics rather than raw rect addition.
2. Nested same-origin frame transforms compose correctly at every level.
3. Hover and selected/excluded outlines match the actual rendered target.
4. `isUsableCandidate()` and `elementsVisuallyOverlap()` use the same truthful visual coordinate model.
5. Scrolling in child and ancestor documents preserves alignment.
6. A transformed/bordered iframe cannot make two visually independent selections appear overlapping or vice versa.
7. Cross-origin frame-agent selection remains separately generation/permission fenced by its existing owners.

## Block 2 — ordinary ancestor clipping truncates selected PDF: P0-004

### Source proof

`installPrintStylesForSelectionDocuments()` broadly normalizes `html, body`, and separately normalizes explicit selected iframe/frame-chain markers. For an ordinary top-document Include it keeps every ancestor alive through `:has([data-webclip-pdf-include])`, but does not neutralize ordinary ancestor `overflow`, fixed/sticky positioning, `contain`, height or clipping.

Thus the print representation is still subject to host-page layout containers that were designed as viewports rather than archival flow.

### Browser reproduction matrix

A selected article contained `TOP_MARKER`, roughly 1100 px of content and `BOTTOM_MARKER`. It was placed inside one unselected structural ancestor. Under WebClip-equivalent selected-only print CSS:

- `height:180px; overflow:hidden` -> TOP present, BOTTOM missing;
- `height:180px; overflow:auto` -> BOTTOM missing;
- `height:180px; overflow:clip` -> BOTTOM missing;
- `height:180px; contain:paint` -> BOTTOM missing;
- `position:fixed; left:0; top:0; width:650px` -> long selected content truncated to one page, BOTTOM missing;
- `position:sticky; top:0; height:180px; overflow:auto` -> BOTTOM missing.

Control: `max-height:180px; overflow:visible` did not reproduce the loss, and transform-only/ordinary absolute-layout probes did not justify a blanket rule that every positioning/transform must be removed. The acceptance requirement is therefore outcome-based: structural ancestors must not clip selected archival content.

### Classification

No new P0 is allocated. Existing family evidence identifies **P0-004 as the PDF fidelity owner**. P1-153 remains DONE for its exact historical root html/body pagination root cause; its regression only proves root normalization, not arbitrary selected ancestor chains.

## Block 3 — unselected ancestor presentation leaks into selected PDF: P0-004

The same `:has([INCLUDE])` rule keeps structural ancestors in the printed tree as normal rendered elements.

Browser control:

- wrapper `::before` emitted `WRAPPER_BEFORE_UNSELECTED`;
- wrapper `::after` emitted `WRAPPER_AFTER_UNSELECTED`;
- only a child article carried Include;
- unrelated normal sibling text was correctly hidden.

Generated PDF text contained both unselected wrapper pseudo strings plus the selected article. This proves the ancestor is not merely structural scaffolding: page-owned ancestor pseudo/background/border/mask presentation can contaminate a supposedly selected-only copy.

P0-004 acceptance is therefore **complete and selection-bounded**, not merely “selected nodes remain present.”

## Block 4 — Shadow DOM selection scope: existing P2-006

Browser probe with an open shadow root showed document-level capture listeners receive the shadow host as `event.target`, while the inner clicked node appears only in `event.composedPath()[0]`. Current `onPageClick()`/`onMouseMove()` use `event.target`, and auto-content candidate queries do not traverse shadow roots.

Result: precise inner Shadow DOM selection is not supported. This is not new: **P2-006 already owns Shadow DOM as explicit selection scope**.

## Block 5 — pseudo-element positive control

When the explicitly Included element itself owns `::before`/`::after`, Chromium print preserves those generated contents. Therefore there is no generic “pseudo-elements are lost” finding. The defect from Block 3 is specifically unselected ancestor presentation leaking through structural ancestors.

## Block 6 — live form-state positive control

A policy-safe Chromium print probe changed DOM properties after initial markup:

- input `.value` to a new value;
- textarea `.value` to a new value.

The PDF contained the current values rather than the original markup defaults. Top-document live printing therefore preserves these basic current form-text states; no new owner is allocated from this probe.

## Block 7 — flattened same-origin iframe rendered state: P1-187 refinement

`createFlattenedBodyFramePrintProxy()` deep-clones child nodes and copies a bounded subset of computed styles. Browser `cloneNode(true)` controls showed:

- canvas bitmap is not carried into the clone;
- a `<select>` whose current selection differs from markup can revert to markup/default selection in the clone;
- several simpler properties such as ordinary checkbox checked state may survive in current Chromium and are not sufficient evidence of complete state preservation.

P1-187 already requires the flattened proxy to preserve required rendered state “such as canvas bitmap.” Refine its acceptance to include current select/form and other renderer-owned state where cloning does not preserve the visible value. No new P-code.

## Block 8 — disclosure expansion: active P0-067 / P1-212 confirmed

Native `<details>` has a safe local representation path: current code sets `details.open = true`, and a browser control confirmed closed details omit inner text from print while `open=true` makes it printable.

Custom disclosure fallback still calls `triggerInternalClick(control)`, which invokes `control.click()`. This is direct current-source confirmation of active **P0-067 / P1-212**, not a new root cause. The eventual isolated print representation should reveal printable content without firing page-owned control handlers.

## Block 9 — deferred/lazy resource capture: P1-003 plus P2-007 boundary

Current `prefetchIncludedResources()` has useful bounded support:

- common `data-src` and `data-srcset` promotion;
- `<source data-srcset>`;
- `loading=lazy` -> eager;
- computed CSS background-image preload;
- font readiness;
- shared 15 s deadline, 500-resource cap, concurrency 8, <=5000 element scan and bounded failure report.

Historical P1-003 browser regression proves this path for representative lazy images/background/fonts.

What it does not provide is a general deferred/virtualized-content materialization strategy. Site-specific lazy attributes, IntersectionObserver-only sections, virtual scrollers or content created only after scrolling can still be absent. This is not classified as a fresh P1 merely because arbitrary sites use different conventions. It is a deliberate architectural boundary between P1-003 resource readiness and P2-007 capture modes/strategies.

## Block 10 — cross-origin frame-agent fidelity parity: P0-004

`frame-agent.js::preparePrint()` injects selected-only print CSS but only normalizes `html,body { overflow:visible; height:auto; max-height:none }`. It does not normalize ordinary ancestor chains around a selected child.

Therefore the ancestor-clipping P0-004 reproduction is not top-document-only; the same class can exist inside a granted cross-origin frame. It remains the same fidelity root cause, not a new frame identity owner.

## Block 11 — auto-content / Reader extraction: P1-160 + P2-007

Current `detectMainContent()` scores semantic selectors and broad `div/section` candidates using text length, paragraph/headline/image/list/table counts, link density and marker heuristics across accessible same-origin documents.

The path is intentionally heuristic. P1-160 already owns bounded discovery. Mozilla Readability demonstrates a mature separate article-extraction architecture with explicit candidate scoring and `maxElemsToParse`; it is still a heuristic extractor, not a correctness oracle for every site.

Conclusion: a Reader/Simplified mode should remain a distinct capture mode under P2-007 rather than silently becoming the fidelity definition for manual Selection/Print PDF.

## Block 12 — external web-clipping architecture research

Fresh web research was performed as required by the project audit policy.

### Evernote Web Clipper

Reference: https://help.evernote.com/hc/en-us/articles/209125827-Clip-formats

Evernote separates Article, Multi-Select, Simplified Article, Full Page, Bookmark, Screenshot, PDF and Selection. Its help explicitly frames Full Page as a static copy preserving original format/layout while Simplified Article removes formatting/layout, and Multi-Select/Selection are user-directed scopes.

**Transferable lesson:** “faithful visual page,” “reader extraction,” and “exact selected content” are different user contracts. P2-007 is architecturally justified; correctness should be tested per mode.

### SingleFile

Reference: https://github.com/gildas-lormeau/SingleFile/blob/master/src/ui/pages/help.html

SingleFile supports current tab, selected content and selected frame. It exposes “save deferred images/frames” as best effort, bounded by configurable idle time, with optional scroll dispatch/zoom-out behavior and explicit warnings about site-dependent behavior.

**Transferable lesson:** deferred/virtualized content needs an explicit capture strategy and truthful best-effort/failure semantics; silently assuming current DOM is complete is insufficient.

### Save Page WE

Reference: https://chromewebstore.google.com/detail/save-page-we/dhhpefjklgkmgeafimnjhojgjamoafof

Save Page WE describes saving the page “as currently displayed” into a single HTML representation and exposes lazy-content loading behavior as an option.

**Transferable lesson:** archival fidelity and lazy materialization are product policy, not one universally safe hidden mutation.

### Mozilla Readability

Reference: https://github.com/mozilla/readability

Readability is a dedicated article extractor and exposes parsing limits such as `maxElemsToParse`.

**Transferable lesson:** Reader extraction should have explicit complexity limits and its own acceptance criteria instead of being conflated with exact manual selection.

### snapDOM

Reference: https://github.com/zumerlab/snapdom/blob/main/FEATURES.md

snapDOM documents a frozen-capture approach that traverses Shadow DOM, snapshots computed styles, rasterizes same-origin iframe content, converts canvas/video rendered state, preserves form-control state and composes transforms with matrix/origin-aware geometry.

**Transferable lesson:** WebClip's existing P0-075 direction toward an isolated/frozen print representation is technically sound. In particular, P1-226 geometry and P1-187 live rendered state are known capture-engine concerns rather than exotic edge cases.

## Block 13 — clipping on the Include root itself: P0-004 refinement

The previous ancestor reproduction is not the full boundary. Current print CSS only gives `[INCLUDE] { break-inside:auto; }`; it does not neutralize `height + overflow` on the selected root itself.

Chromium 144 policy-safe probes with the Include carrying `height:180px` showed:

- `overflow:auto` -> TOP present, BOTTOM missing;
- `overflow:hidden` -> TOP present, BOTTOM missing.

Therefore the P0-004 contract must cover **both the Include root and structural ancestor chain**. A user selecting a scrollable article/card/document viewport is authorizing the contained selected content, but current print semantics can preserve only the viewport slice.

## Block 14 — paged-layout negative controls

The audit must not infer “all non-block layout is unsafe” from the clipping reproductions. Long Include roots were tested with ordinary:

- `display:flex; flex-direction:column`;
- `display:grid`;
- `column-count:2`;
- table-like flow.

In these probes both TOP and BOTTOM markers survived pagination. No independent flex/grid/multicol/table root cause is registered from this tranche.

This matters for implementation: the P0-004 fix should target proven clipping/selection-boundary constraints rather than flattening every selected layout into generic block flow.

## Block 15 — content-visibility negative control

A long Include using `content-visibility:auto; contain-intrinsic-size:2000px` retained both TOP and BOTTOM markers in the tested Chromium PDF path. Current `html/body` print normalization also forces root `content-visibility:visible`, but this probe shows no basis for a generic “content-visibility always loses selected content” owner.

Site-specific virtualized DOM can still be incomplete before print and remains part of the explicit deferred-content strategy boundary from Block 9.

## Block 16 — SVG print positive control and rendered-state boundary

Top-document selected SVG text and a same-document SVG `<use href="#...">` control both appeared in generated PDF text under the selected-only print stylesheet. No generic SVG-loss owner is registered from this pass.

This contrasts usefully with Block 7: live browser-native print preserves ordinary top-document rendered state better than `cloneNode(true)`-based iframe flattening. The architectural problem is not “PDF cannot represent these primitives”; it is the fidelity gap introduced when WebClip builds a secondary cloned representation without explicitly freezing renderer-owned state.

## Consolidated acceptance impact

### P0-004

1. Included content inside `overflow:hidden|auto|clip`, paint containment, fixed/sticky and equivalent clipping **on the Include root or its structural ancestors** remains complete in the actual PDF.
2. Structural ancestors needed to preserve layout do not contribute unselected pseudo/generated/background/border/mask presentation unless the user selected that presentation by the defined mode.
3. The same completeness/selection-bound contract holds in granted cross-origin frame-agent printing.
4. Selecting the ancestor itself can still preserve its intended appearance; the solution must distinguish structural scaffolding from selected presentation.
5. Ordinary flex/grid/multicol/table layouts that already paginate correctly must not be needlessly flattened or degraded by the fix.
6. The solution composes with P0-075 isolated/frozen representation and does not rely on unsafe permanent host DOM mutation.
7. Historical P1-153 root-document pagination remains a regression control but is not treated as blanket proof of selected-subtree fidelity.

### P1-187

Add current `<select>`/form and other non-markup renderer state to the existing flattened-frame live-state matrix alongside canvas, under explicit budget and inertness requirements.

### P0-067 / P1-212

Current `control.click()` remains a live reproducer; native-details behavior demonstrates that disclosure fidelity can be achieved without page-owned activation for at least the native case.

### P1-003 / P2-007

Retain bounded current resource readiness; treat general lazy/virtualized materialization as explicit capture-mode policy with truthful completeness diagnostics rather than unlimited scrolling or hidden side effects.

## Test / release boundary

- Browser probes in this audit tranche are policy-safe Chromium semantic reproductions, not real unpacked-extension release QA.
- No production code was changed by this audit delta.
- No manifest/version/build/tag/Release change is implied.
- Historical 88/88 JavaScript syntax + 74/74 deterministic PASS remains historical evidence until the repository CI for this audit PR runs.
- Real unpacked Chrome, optional-host permission UI and real Yandex OAuth/API E2E remain mandatory external release gates.
