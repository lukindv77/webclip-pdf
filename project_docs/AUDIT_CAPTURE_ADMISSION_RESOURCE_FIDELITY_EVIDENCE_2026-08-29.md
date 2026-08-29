# Durable audit evidence — capture admission / responsive fidelity / renderer resource readiness — 2026-08-29

Canonical status remains exclusively in `AUDIT_REGISTRY.md`. This file preserves source/browser/external-comparison evidence from a 26-block semantic audit tranche. Runtime, `manifest.json`, version, build/tag/release state and release readiness are unchanged by this audit-only checkpoint.

Source baseline: fresh `main` at `f9ff401c3521433ffee40b8d48390c2477a018cb`.

Local browser controls used managed Chromium `144.0.7559.96`. They are deterministic semantic evidence, not a substitute for real unpacked Chrome, real optional-host-permission QA or real Yandex E2E.

## Executive classification

### P1-003 must reopen ACTIVE

Historical P1-003 implementation proved bounded preparation for ordinary selected `img`, element `background-image` and element font faces. Fresh source + Chromium proof shows the renderer resource graph is still materially incomplete:

- top selected `::before/::after` resources are not discovered;
- CSS `mask-image` is not discovered;
- `list-style-image` is not discovered;
- a font used only by a pseudo-element is not discovered by the element-level font scan;
- cross-origin `frame-agent.js::prefetchSelected()` only prepares `img` resources and does not proactively wait ordinary CSS backgrounds/fonts at all.

`Page.printToPDF` is not a readiness barrier for these cases. Delayed-resource probes returned an immediate PDF before the resource became ready and a later PDF with a different raster after resource settlement.

This is the same root cause as P1-003 — bounded renderer-resource readiness before PDF — and therefore reopens that existing owner rather than allocating P1-228.

### Existing ACTIVE owners receive stronger evidence

- **P0-004** — selected copy can clip nested scrollers, select different scroll-window content depending on `scrollTop`, change CSS counters when unselected siblings are hidden, lose page-owned `:first-child` presentation after WebClip inserts its header, and reevaluate container queries against A4 print geometry despite `media:'screen'`.
- **P0-075** — WebClip's own comment-dialog focus and live preparation mutations are observable/reactive host-page input. Focus can trigger host blur logic and change `:focus-within` presentation before capture; shared live-DOM print remains the trust-boundary root cause already documented by frozen-print evidence.
- **P0-070/P0-075/P0-004** — host timers/animations and `beforeprint` can change same-document visible state between user admission and render. Existing frozen-print evidence already owns this; no duplicate number.
- **P1-187** — renderer-owned state preserved by direct Chromium (forms/canvas/top layer) must not be lost by an intermediate iframe proxy/capture layer.
- **P2-007** — format-neutral capture architecture should preserve an admitted state before format rendering. DOMSnapshot and MHTML each expose useful but incomplete pieces; neither is a drop-in complete representation by itself.

## Block 1 — WebClip dialog focus changes host state — P0-075 / P0-004

Current `content.js::showFileCommentDialog()` displays the WebClip modal and then runs:

`setTimeout(() => textarea.focus(), 0);`

Chromium control:

1. host input is focused inside a container whose visible state uses `:focus-within`;
2. host registers a `blur` handler that mutates application state;
3. a WebClip-like shadow textarea is focused.

Observed:

- active element moves from host input to the shadow host;
- host `:focus-within` presentation changes from visible to hidden;
- host blur handler runs.

Therefore WebClip UI focus is not capture-neutral. This is not a new owner: P0-075 already requires an isolated UI/print boundary and P0-004 owns the resulting selected-copy fidelity.

## Block 2 — browser text Selection presentation is lost on WebClip focus

A document Range selecting `BETA` had `rangeCount=1` and visible selection text `BETA`. After focus moved into a WebClip-like shadow textarea, document selection text became empty while the range object still existed.

This is a UX/state-admission refinement under P0-075/P0-004, not a separate owner.

## Block 3 — `beforeprint` mutates the actual PDF even with screen media

Probe page began with `ADMITTED_TEXT` and registered a host `beforeprint` handler replacing it with `BEFOREPRINT_MUTATED`.

Worker-equivalent CDP sequence used `Emulation.setEmulatedMedia({media:'screen'})` then `Page.printToPDF`.

Observed PDF text: `BEFOREPRINT_MUTATED`; `ADMITTED_TEXT` was absent.

MDN documents that `beforeprint` exists specifically so a page can change content before printing. Existing frozen-print evidence already classifies this under P0-075/P0-004/P0-070 and P0-071 for URI safety. No new number.

## Block 4 — same-document timer drift reaches PDF

A selected text node changed every 100 ms. State at admission was `STATE_0`; after a prepare-like 850 ms delay it was `STATE_8`; the generated PDF contained `STATE_8`.

`prepareForPrint()` contains larger legal asynchronous windows: disclosure work, selected-resource prefetch (common deadline 15 s), remote frame preparation and debugger handoff. Same documentId therefore does not imply same admitted renderer state.

Existing frozen-representation owners remain authoritative.

## Block 5 — CSS animation timing is not frozen

A continuously animated selected element was printed twice 600 ms apart without a capture freeze. Computed color changed red -> blue and page-1 raster SHA-256 changed.

This is another deterministic schedule for the existing frozen representation requirement, not a new root cause.

## Block 6 — `media: screen` does not preserve container-query screen geometry — P0-004

Screen viewport: 1200 CSS px. A 100%-width query container rendered pseudo text `SCREEN_WIDE_CONTAINER` under a `(max-width:900px)` container query.

With the production-equivalent `media:'screen'` + A4 `Page.printToPDF`, the PDF contained `PRINT_NARROW_CONTAINER`, while after printing the live page still measured 1200 px and rendered `SCREEN_WIDE_CONTAINER`.

Thus `Emulation.setEmulatedMedia(screen)` preserves media type, not the original selected container geometry. A4 formatting can reevaluate container queries and materially alter selected presentation. This directly confirms the warning already present in `WEBCLIP_COPY_ARCHITECTURE_POLICY.md` and strengthens P0-004.

## Block 7 — ordinary selected nested scroller clips offscreen selected content — P0-004

WebClip-equivalent selected-only CSS was applied to:

- selected root height about 122 px;
- `overflow:auto`;
- `scrollHeight` about 936 px;
- `SCROLLER_TOP` at start and `SCROLLER_BOTTOM` below the internal viewport.

PDF contained `SCROLLER_TOP` but not `SCROLLER_BOTTOM`.

The selected element exists and its full content is DOM-materialized, so this is not the virtualized-list P2-007 case. P0-004 must cover ordinary selected nested-scroll completeness or an explicit truthful current-viewport mode.

## Block 8 — selected output depends on current nested `scrollTop`

Same selected scroller printed at different scroll positions:

- `scrollTop=0` -> PDF `TOP_A`;
- `scrollTop=400` -> PDF `MIDDLE_B`;
- maximum observed `scrollTop=734` -> PDF `BOTTOM_C`.

The archive therefore contains an arbitrary 120 px scroll window rather than the complete selected DOM region. This is a stronger P0-004 acceptance case.

## Block 9 — selection filtering changes CSS counter semantics — P0-004

Screen/full print list:

`1. ALPHA / 2. BETA / 3. GAMMA`

After WebClip-equivalent selection filtering hides the first two counter-incrementing siblings, selecting only GAMMA produced:

`1. GAMMA`

The copied text content is correct but its generated presentation is not the presentation the user saw. Selection-bounded print materialization must preserve necessary generated/counter state instead of assuming `display:none` filtering is semantically neutral.

## Block 10 — WebClip header insertion changes page `:first-child` styling — P0-004 / P0-075

A first body card had page CSS `body > .card:first-child::before { content:'FIRST_CHILD_PRESENTATION' }`.

Before WebClip-like header insertion, PDF contained `FIRST_CHILD_PRESENTATION CARD_TEXT`.
After inserting a metadata section before `body.firstChild`, PDF contained header + `CARD_TEXT` and the selected card lost the original generated presentation.

Current `prepareForPrint()` inserts the real WebClip print header into live `document.body`. This is another concrete reason the source page cannot be both mutable preparation workspace and authoritative frozen representation.

## Block 11 — responsive `<picture>` currentSrc positive control

At viewport 1200 px a `<picture>` whose alternate source applied only below 900 px used the large resource. During `media:'screen'` PDF, `beforeprint` still reported the same large `currentSrc`, and the PDF rendered `LARGE`.

Do not generalize the container-query defect into a claim that every responsive image source necessarily changes. CurrentSrc must be captured/tested per representation.

## Block 12 — delayed pseudo background is not awaited — P1-003

A selected `::before` used `background:url(slow.png)`, whose request was deliberately held 2.5 s.

Immediate `Page.printToPDF` completed in about 10 ms before resource fulfillment. A PDF after fulfillment produced a different page raster.

Current top prefetch only reads `getComputedStyle(element).backgroundImage`; it never reads `getComputedStyle(element,'::before')` / `::after` for resource discovery.

## Block 13 — delayed `mask-image` is not awaited — P1-003

A selected element used delayed `-webkit-mask-image:url(slow.png)`. Immediate and post-settlement PDF rasters differed.

`prefetchIncludedResources()` has no mask-image resource extraction.

## Block 14 — delayed `list-style-image` is not awaited — P1-003

A selected list item used delayed `list-style-image:url(slow.png)`. Immediate and post-settlement PDF rasters differed.

No current P1-003 discovery path includes list marker image resources.

## Block 15 — font used only by pseudo-element is not awaited — P1-003

A delayed `@font-face` was used exclusively by `#x::before`, while the host element itself used the fallback/default font.

Immediate and post-font-settlement PDF rasters differed. Current font task construction reads computed font family/style/weight/size from ordinary selected DOM elements only, so a pseudo-only face is absent from its explicit `Document.fonts.load/check` work.

## Block 16 — permitted remote-frame resource parity is weaker — P1-003 + P1-004

Current `frame-agent.js::prefetchSelected()`:

- enumerates selected `img` only;
- caps output at 100 image records / roughly 5 s;
- may promote `data-src` and `loading=eager`;
- has no CSS background scan;
- has no font preparation;
- has no pseudo/mask/list-image resource scan.

A browser control with iframe content and a delayed ordinary CSS background produced different immediate vs settled PDF rasters. This is not full optional-permission E2E, but it proves the renderer behavior that the source path currently fails to fence. Real unpacked Chrome cross-origin permission QA remains required.

Classification: resource readiness remains P1-003; P1-004 remains the cross-origin feature umbrella. Do not create a second resource owner merely because the incomplete scanner is in `frame-agent.js`.

## Block 17 — P1-003 historical gate remains a positive control, not closure for the new scope

`AUDIT_EVIDENCE.md` records the historical P1-003 implementation:

- 15 s common deadline;
- max 500 tasks;
- concurrency 8;
- per-item <=5 s;
- DOM scan <=5000;
- persistent failure list <=40;
- redacted report propagation;
- managed Chromium resource regression PASS.

`TEST_PLAN.md` explicitly tested ordinary selected image/lazy srcset, **element** CSS background-image and used web fonts. It does not include pseudo-element background/font, mask/list marker resources or remote CSS/font parity.

The correct status transition is therefore IMPLEMENTED/RELEASE-REGRESSION -> ACTIVE refinement, not erasing the historical implementation evidence.

## Block 18 — scan truncation remains bounded and durable

Top resource report carries `scanTruncated`; worker sanitization preserves it and treats it as a `partial` OperationLog state. Current textual stage/header wording does not fully explain scan truncation, but durable metadata retains the fact.

No separate status/UI owner is assigned in this tranche; P1-003 acceptance should require truthful user-facing degradation when required renderer resources were outside the bounded scan graph.

## Block 19 — direct canvas is a positive renderer control

Direct Chromium PDF captured a drawn top-document canvas raster. Future format-neutral capture must not replace a renderer-supported canvas state with a weaker DOM clone. Flattened iframe canvas preservation remains P1-187.

## Block 20 — WebGL environment control

Managed/headless Chromium in this audit environment returned no WebGL context (`WEBGL_NONE`). No positive or negative WebClip conclusion is drawn from WebGL here. Real Chrome/GPU QA remains necessary before claiming WebGL archival fidelity.

## Block 21 — top-layer dialog/popover positive controls

Direct Chromium PDF preserved tested open modal `<dialog>` and open popover content. With WebClip-equivalent selection filtering, an unselected open dialog was excluded and selected dialog content remained printable.

Again, future capture architecture must not regress browser-owned top-layer state that the direct renderer already preserves.

## Block 22 — current top-document form/contenteditable state positive control

After runtime mutations, direct PDF contained current:

- input value;
- textarea value;
- selected `<option>`;
- contenteditable text.

This contrasts with flattened `cloneNode(true)` behavior already proven under P1-187, where current `<select>` state can revert.

## Block 23 — DOMSnapshot is useful but not a complete archival representation — P2-007 architecture research

Chromium `DOMSnapshot.captureSnapshot` primary documentation says it can return flattened DOM including iframes/template contents, flattened Shadow DOM, layout, selected computed styles, DOM rects and paint order.

Local probe confirmed it exposed:

- current `inputValue`;
- current textarea `textValue`;
- current checked/selected state through `inputChecked` / `optionSelected` sparse fields;
- pseudo-element nodes;
- flattened open Shadow DOM;
- layout/DOM information.

The same snapshot did **not** serialize canvas pixels. DOMSnapshot is therefore a strong format-neutral structural/state input, but needs renderer-owned supplements for canvas/video and explicit resource/inertness/budget policy.

## Block 24 — MHTML is also useful but incomplete — P2-007 architecture research

CDP `Page.captureSnapshot(format:'mhtml')` documentation says MHTML serialization includes iframes, Shadow DOM, external resources and element-inline styles.

Local probe confirmed Shadow DOM content was present, but live runtime input/textarea values were not substituted for markup defaults and canvas bitmap state was not embedded as pixels.

Therefore MHTML should be evaluated as a resource/DOM preservation component, not assumed to be the single canonical selected-state snapshot.

## Block 25 — comparison with mature capture engines

Current snapDOM documentation is a useful falsifiable checklist rather than authority. It explicitly preserves or reconstructs:

- Shadow DOM/slots;
- same-origin iframe visual representation;
- canvas bitmap;
- current video frame;
- form state including select selection;
- resolved img/srcset state;
- SVG `<use>` references;
- scroll position;
- full computed-style capture including pseudo/counter handling;
- font/cache invalidation.

These features align closely with the renderer-state losses and positive controls reproduced in WebClip PDF. The lesson is not to adopt snapDOM wholesale, but to require an explicit canonical-capture contract rather than an ever-growing hand-written style/resource allowlist.

Webrecorder/Browsertrix provides a different architectural lesson: high-fidelity archival of dynamic sites is behavior-aware. Autoscroll and site/custom behaviors deliberately materialize dynamic/infinite content and are continuously tested because site behavior changes. WebClip should keep this materialization policy explicit under P2-007 rather than pretend a static CSS expansion can archive virtualized logical content.

## Block 26 — real user stories confirm selection/completeness/truthfulness as first-class product requirements

External user reports used only as product/failure-mode evidence:

- Joplin Web Clipper issue #4105: selected/main/complete clipping omitted code snippets; labeled high-priority clipper bug.
- Joplin issue #15770 (2026): complete HTML capture visibly altered paragraph styling; expected result was browser-faithful appearance.
- SingleFile issue #1932 (2026): saving a LinkedIn text selection yielded effectively blank/background-only output while full-page save worked.
- SingleFile issue #1931 (2026): Instagram infinite-scroll archive retained only some loaded segments even after manual scrolling.
- SingleFile issue #843: user explicitly valued a warning when resources could not be saved, even when the tool could not fix them.
- OneNote user report (2025): clipping a page longer than the visible monitor area remained a major usability complaint.

These reports reinforce three WebClip priorities already present in project policy: selection must mean the intended region, incomplete resource/materialization results must be truthful, and long/dynamic content requires explicit behavior rather than silent partial output.

## P1-003 refined acceptance contract

Keep all historical P1-003 bounds and add:

1. Build the required renderer-resource graph from the **actual selected visual representation**, not only ordinary element `img/background/font` properties.
2. At minimum account for visible pseudo-element resources, mask/border/list-marker/CSS images and pseudo-specific fonts when they contribute to selected output.
3. Same-origin selected frame documents use the same semantic resource policy as top document, within aggregate P1-167/P1-154 budgets.
4. Permitted cross-origin frame preparation reaches equivalent fidelity classes where technically observable; otherwise the operation/report explicitly says the frame resource readiness is partial/unknown rather than implying success.
5. Bounded scanning remains mandatory. The fix must not replace P1-003's caps with unbounded full computed-style/resource traversal.
6. Resource graph construction must happen against the admitted/frozen capture generation; a late live-page resource replacement cannot silently become the archived source.
7. `Page.printToPDF` completion is **not** used as proof that pending visual resources were ready.
8. If a required visual resource cannot be prepared within deadline/budget, durable + user-visible result must disclose partial fidelity without persisting sensitive URLs.
9. Add deterministic delayed-resource regressions for pseudo background, mask/list marker, pseudo-only font and selected frame CSS background.
10. Real unpacked Chrome regression must exercise at least one real network-delayed visual resource and one permitted cross-origin frame before release closure.

## Dedup / numbering decision

No P1-228 is allocated.

- incomplete renderer-resource readiness -> **P1-003**;
- selected layout/clipping/counters/responsive geometry -> **P0-004**;
- host-reactive WebClip focus/header/live preparation and frozen representation -> **P0-075**, composing P0-070/P0-071 where applicable;
- iframe clone state loss -> **P1-187**;
- dynamic/virtualized/materialization/canonical format-neutral architecture -> **P2-007**;
- cross-origin feature parity -> P1-004 umbrella plus the specific resource owner P1-003.

The tranche therefore changes exactly one canonical status: **P1-003 becomes ACTIVE** with the refined resource-graph acceptance above. No other P status transitions are justified.

## External research references

- Chrome DevTools Protocol — `DOMSnapshot.captureSnapshot`.
- Chrome DevTools Protocol — `Emulation.setEmulatedMedia` and `Page.printToPDF`.
- MDN — `Window: beforeprint` event.
- snapDOM `FEATURES.md`.
- Webrecorder Browsertrix / Autopilot behavior documentation.
- SingleFile FAQ/help and issues #843, #1931, #1932.
- Joplin issues #4105 and #15770.
- Microsoft community OneNote Web Clipper long-page report (2025).

These are comparison/hypothesis sources. Canonical WebClip status remains source/reproduction-driven through `AUDIT_REGISTRY.md`.