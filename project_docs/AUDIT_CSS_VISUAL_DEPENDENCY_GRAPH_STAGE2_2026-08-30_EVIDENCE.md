# CSS visual dependency graph audit — Stage 2 — Blocks 17–32

Interruption-safe continuation of `AUDIT_CSS_VISUAL_DEPENDENCY_GRAPH_2026-08-30_EVIDENCE.md`.

Exact tranche base remains `cd342ac548606ab93eba3d1f2ebc9a68f2f51c08`.

Current authority remains `AUDIT_REGISTRY.md`; this is evidence only.

## Blocks 17–32

### Block 17 — `image-set()` selected-candidate versus scanner graph

A 500-candidate `background-image:image-set(...)` fixture was measured in managed Chromium at DPR 1.

Before any WebClip-shaped preloader ran, Chromium itself issued exactly **one** image request: the 1x candidate. `getComputedStyle(element).backgroundImage`, however, retained all 500 candidate URLs and the current WebClip `url(...)` extractor pattern found **500 URLs** in the computed value.

This proves that the current background prefetch graph is not the same thing as Chromium's actually selected rendered resource graph for `image-set()`.

### Block 18 — exact-deadline `image-set()` false-partial schedule

A smaller 12-candidate schedule used the current top-document constants/semantics:

- one 1x candidate completed immediately and was the only candidate Chromium requested for rendering before the WebClip-shaped scan;
- 11 higher-density alternatives each delayed six seconds;
- WebClip-shaped scan extracted all 12 URLs;
- concurrency: 8;
- per-item wait: 5 seconds;
- overall deadline: 15 seconds.

Measured result:

- `urls=12`;
- `loaded=1`;
- `failed=11`;
- elapsed about **10,002 ms**.

The preloader itself started requests for all 11 non-selected alternatives.

Therefore readiness reporting can be pessimistic/false-partial even when Chromium's actual selected image-set candidate was already ready.

### Block 19 — resource-cap amplification

The 500-candidate control is 27,342 computed characters, below the current per-CSS-value 65,536-character bound, and all 500 URLs are recognized by the current extractor pattern.

The current task cap is also 500. One selected element can therefore consume the complete resource-task budget with image-set alternatives even though Chromium physically selected one candidate in the measured control.

This is an exact source + renderer admission mismatch under `P1-003`; it also supports `P1-167` because unnecessary alternatives can consume the global preparation time/work budget.

### Block 20 — multi-layer background positive control

A two-layer ordinary `background-image:url(...),url(...)` computed value retained two URLs and the current extractor recognizes both. Both layers are potentially composited simultaneously, so discovering both is a correct positive control. The image-set result must not be generalized into 'multiple URLs are always overfetch'.

### Block 21 — CSS custom property to covered background

`--u:url(...); background-image:var(--u)` computed to an ordinary absolute `url(...)` in `backgroundImage`.

Thus CSS custom properties are not intrinsically invisible: once the actual covered computed property resolves to a URL, current background discovery can see it.

### Block 22 — CSS custom property to uncovered border image

`--u:url(...); border-image-source:var(--u)` computed to the concrete absolute URL in `borderImageSource` while `backgroundImage` remained `none`.

Therefore the root cause is the set of admitted computed properties, not CSS-variable syntax.

### Block 23 — pseudo web-font physical readiness

Fixture:

- ordinary selected element font: Arial;
- `::before` generated text: `MMMMWWWW` at 64px using delayed `@font-face DelayFace` served from Lato Heavy TTF;
- font resource delay: 1.5 seconds.

Immediate `Page.printToPDF` completed in about **10.2 ms** while the delayed font request was still in flight. `pdffonts` on the immediate PDF showed only `Arimo` fallback. After settlement, the PDF contained both `Lato-Heavy` and `Arimo`.

This is a non-image pseudo visual resource missing from current element-only font readiness acquisition.

### Block 24 — why current font task misses the pseudo font

Current `prefetchIncludedResources()` derives the font task from `getComputedStyle(element).fontFamily/fontStyle/fontWeight/fontSize` and a text-node sample of that element. It does not acquire pseudo-element computed font state.

In the fixture the element remained Arial while `::before` required DelayFace. Thus the current font task cannot request/wait the font needed by that rendered pseudo text.

### Block 25 — rejected `@counter-style symbols:url()` schedule

A tested `@counter-style` image-symbol fixture did not issue the expected image request and did not produce a green-pixel positive control in this managed Chromium schedule. It is rejected and not used as a WebClip finding.

### Block 26 — print-header insertion creates a post-scan resource graph

Current source performs local/remote resource prefetch before creating and inserting `#webclip-pdf-header`.

Physical model used ordinary page CSS:

`body:has(#webclip-pdf-header) #selected { background-image:url(delayed-red) }`.

Before insertion: computed background `none`.
After insertion: computed delayed URL.
Immediate print: about **7.4 ms**, **0 red pixels**.
After settlement: about **26,334 red pixels**.

The resource did not exist in the computed dependency graph at the earlier scan point.

### Block 27 — print-style insertion creates a post-scan resource graph

Current source appends a `style[data-webclip-print-style]` after prefetch.

Physical model:

`html:has(style[data-webclip-print-style]) #selected { background-image:url(delayed-blue) }`.

Before insertion: `none`.
After insertion: delayed URL.
Immediate PDF: **0 blue pixels**.
Settled PDF: about **26,334 blue pixels**.

### Block 28 — image-wrapper insertion creates a post-scan resource graph

Current source wraps unlinked selected `<img>` nodes in an anchor with `data-webclip-image-link` after prefetch.

Physical model used page CSS reacting to the newly inserted wrapper. Before wrapping the selected target had no background. After wrapper insertion it acquired a delayed green background URL. Immediate PDF had **0 green pixels**; settled PDF had about **26,332 green pixels**.

This establishes a generic graph-stability requirement: resource readiness acquired before page-observable preparation mutations is not a final graph receipt.

### Block 29 — classification of post-scan mutations

This is not a new P-code. Existing owners already divide the concern:

- `P1-003` — actual selected rendered resource graph must match the admitted generation and omissions must be truthful;
- `P0-075` — page-observable shared-DOM/helper mutations are not a trusted print control plane;
- `P0-070` — the user save must stay bound to one exact physical document/render generation.

A repair needs either an isolated representation/frozen graph or bounded convergence/revalidation after the final representation-changing mutation; simply adding more prefetch properties before those mutations is insufficient.

### Block 30 — cross-origin frame-agent background parity physical control

Fresh `frame-agent.js` resource preparation collects ordinary selected `<img>` elements only.

A frame-agent-shaped selected child fixture had no `<img>` but did have a delayed ordinary `body background-image`. The child-shaped resource report was `attempted=0` while computed background already contained the URL.

Top physical print completed in about **7.6 ms** with **0 yellow pixels**. After resource settlement the child region produced about **33,663 yellow pixels**.

Thus even ordinary backgrounds covered by top-document preparation are absent from the cross-origin frame-agent readiness graph.

### Block 31 — frame parity owner boundary

Primary ownership remains `P1-003`, because its canonical wording explicitly includes frame parity. `P1-004` and `P1-229` are supporting cross-origin lifecycle/representation boundaries; this resource-discovery mismatch does not need a new frame-specific P-code.

### Block 32 — stage classification

No new P-code and no canonical status transition after Blocks 17–32.

Primary refined owner:

- `P1-003 ACTIVE`.

Strong supporting owners:

- `P1-187 ACTIVE` — secondary representation can lose already-settled visual properties/pseudo state;
- `P1-167 ACTIVE` — image-set alternative over-admission consumes bounded work/time;
- `P0-075 ACTIVE` — WebClip's shared-DOM preparation mutations can cause page CSS to create a different graph after scan;
- `P0-070 ACTIVE` — physical generation truth;
- `P1-229 ACTIVE` / `P1-004 ACTIVE` — cross-origin representation/lifecycle boundary.

## Next-stage questions

Blocks 33+ should close the remaining high-value matrix:

- graph changes caused specifically by same-origin proxy insertion/copy;
- inherited/stylesheet resources whose selected descendants outlive source CSS removal;
- actual URL-base behavior for covered computed background versus omitted CSS properties;
- pseudo/image resource multiplicity and caps;
- truthful acceptance/receipt design: distinguish `ready`, `partial-known`, and `graph-unknown/non-converged`;
- final duplicate/history check before classification.
