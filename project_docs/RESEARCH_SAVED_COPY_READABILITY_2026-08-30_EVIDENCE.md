# Durable research evidence — saved-copy readability / hyperlink / logical-text / rendered-form state — 2026-08-30

Canonical P-code owner/status authority remains exclusively in `RESEARCH_REGISTRY.md`. This document preserves a completed **24-block** fresh-source research focused on whether the generated PDF remains useful after reopening: hyperlink navigation, internal destinations, searchable/selectable text, logical reading order and current rendered form state.

Exact fresh runtime baseline: `main = 4810f7a0228bd08028517c524c28cec15f0f19fc`.

Managed browser used for direct engineering probes: `Chromium 144.0.7559.96` on Debian 13. Key physical-result probes were repeated through the same CDP shape used by the current service worker: `Emulation.setEmulatedMedia({media:'screen'})` followed by `Page.printToPDF` with `displayHeaderFooter:false`, `printBackground:true`, `scale:1`, `preferCSSPageSize:true` and `transferMode:'ReturnAsStream'`. These are deterministic engineering probes, not real unpacked-extension release QA.

No runtime source, `manifest.json`, version, build, tag or GitHub Release is changed by this research tranche.

## Executive classification

**No new permanent P-code and no canonical status transition.** Duplicate/root-cause review across the registry, PDF/print family evidence, capture-representation dependency evidence, history and Git history places the fresh results under existing owners:

- **P0-004 ACTIVE — primary selected-PDF completeness / selection-bounded representation owner.** An included same-document fragment link can survive selected-only filtering as a PDF `/Dest` annotation even when its exact target was filtered out and no named destination exists in the PDF. The saved link then looks live but is dead. Acceptance must make the final hyperlink/destination graph representation-aware without silently re-including content the user excluded.
- **P1-187 ACTIVE — primary flattened same-origin iframe representation owner.** Current child-body `cloneNode(true)` representation changes frame-relative link base provenance after adoption into the top document and loses a runtime-selected `<select>` option. Managed Chromium physically prints the wrong top-document-relative URL and the default option instead of the option the user was viewing.
- **P0-068 / P1-213 ACTIVE — duplicate-identity/inert flattened-representation supporting owners.** Two flattened child regions with the same source-local fragment id collapse into one PDF named destination; both links target that one destination, so at least one is wrong. This is not a new owner separate from the already registered duplicate-identity boundary.
- **P2-007 BACKLOG — explicit output/capture-mode and later-reading semantics.** Current Chromium produces searchable/tagged PDF in the tested exact CDP path, but visual CSS Grid reordering can still diverge from extracted/logical reading order. CDP also documents `generateTaggedPDF` as an embedder-choice default and `generateDocumentOutline` as opt-in. Reader/Print/HTML mode semantics remain the correct architecture boundary rather than inventing a new P-code for browser-standard visual-vs-logical order.
- **P0-071 and P1-221 remain separate boundaries.** P0-071 owns safe schemes on the actual printed representation; P1-221 owns exact rollback of temporary live-link normalization. Neither is reclassified as the final saved-PDF destination-fidelity owner.

`P1-230` is **not allocated**. The fresh schedules refine existing representation owners and the already established output-mode architecture boundary.

## Blocks 1–8 — saved hyperlink and fragment-navigation fidelity

### Block 1 — product contract starts after the file is reopened

A successful `Page.printToPDF`, local download or Yandex upload is not enough. For later reading, an included hyperlink that appears actionable in the PDF must resolve to the intended saved destination or to an explicit safe fallback; it must not silently point to a missing or different representation object.

The relevant invariant is therefore:

`included link intent -> prepared representation target -> physical PDF annotation/destination -> reopened navigation`

must remain coherent and selection-bounded.

### Block 2 — fresh source normalizes top/light-DOM included links before printing

Current `content.js` prepares links through `absolutizeLinksInIncludedContent()`:

- it calls `collectIncludedElements('a[href], area[href]')`;
- stores the original raw `href` in `data-webclip-original-href`;
- writes `link.href` back into the `href` attribute;
- later restores the original value.

`collectIncludedElements()` walks each local Include plus `include.querySelectorAll(selector)`. It does not enter frame documents or Shadow DOM.

Preparation order is material: top/light-DOM link normalization runs **before** `flattenSelectedSameOriginBodyFramesForPrint()`.

This is compatible with existing P1-221 rollback evidence but is not a final-PDF target-graph validator.

### Block 3 — valid same-document fragment survives absolute normalization: positive control

Fixture contained:

```html
<a href="#target">Jump target</a>
<h2 id="target">TARGET</h2>
```

WebClip-equivalent normalization replaced the raw fragment with the element's absolute `href` before print.

Physical PDF result in managed Chromium:

- link annotation remained `/Dest /target`;
- named destination `/target` existed;
- target text was present.

Therefore the finding is **not** “absolute-normalizing `#fragment` always breaks Chromium PDF links”. Same-document absolute normalization itself is a positive control.

### Block 4 — selected-only filtering can leave a dead internal PDF destination

Controlled schedule started from the same valid source link/target pair, then applied WebClip-equivalent selected-only filtering so the target no longer participated in print while the link remained included.

Exact-CDP physical PDF result:

- extracted text contained `Jump hidden` but not `TARGET`;
- link annotation still contained `/Dest /target`;
- PDF named-destination dictionary contained **no** `/target`.

The saved file therefore contains a visually actionable internal link whose target does not exist in the artifact.

This is a final-representation completeness issue under **P0-004**. It is distinct from unsafe-scheme handling under P0-071.

### Block 5 — acceptance cannot simply force the target back into selected content

The missing destination may be outside the user's Include or may be explicitly Excluded. Silently retaining it as visible PDF content would violate the selection-bounded half of P0-004.

A correct representation needs a bounded final hyperlink graph policy. Examples of acceptable architecture include:

- keep an internal destination only when the exact target survives uniquely in the saved representation;
- otherwise convert to a safe source-document fallback URL/fragment when privacy/minimization policy permits;
- or deliberately remove/degrade the hyperlink with truthful diagnostics when no faithful safe fallback exists.

Any source-URL fallback remains subject to P0-066 minimization and P0-071 scheme safety.

### Block 6 — external relative link is a positive control in the top document

A normal top-document relative link such as `next.html#next` was normalized to an absolute HTTP URL and emitted as a PDF URI action to that absolute location.

This verifies that Chromium can preserve useful external hyperlink annotations; the defect is not a generic lack of PDF link support.

### Block 7 — flattened iframe adoption changes relative-link base provenance

Current same-origin flattening creates a top-document `<section>` and deep-clones child body nodes with `cloneNode(true)`. Because link normalization does not traverse the child document before this step, a child-relative raw `href` is adopted into the top document unchanged.

Deterministic fixture used explicit bases:

- child base: `https://example.test/frames/child/index.html`;
- top base: `https://example.test/top/article.html`;
- child raw link: `details.html#frag`.

Before flattening the child resolved URL was:

`https://example.test/frames/child/details.html#frag`.

After WebClip-equivalent body cloning into the top document, the cloned link resolved as:

`https://example.test/top/details.html#frag`.

Exact-CDP physical PDF annotation was the **wrong top-document-relative URI**.

This is a fresh **P1-187** refinement: flattened representation must preserve source-document/base provenance for navigational state, not only pixels/CSS.

### Block 8 — duplicate frame-local fragment ids collapse into one physical destination

Fixture modeled two separately flattened child regions, each with a local `id="same"` and a local `href="#same"`.

Physical two-page PDF contained:

- one named destination `/same`;
- two link annotations, both `/Dest /same`.

At least one link therefore resolves to the wrong region. This is supporting evidence for the already registered duplicate-identity/inert-proxy owners **P0-068/P1-213**, with P1-187 providing the secondary-representation context. No new code is created.

## Blocks 9–16 — searchable/selectable text and logical reading order

### Block 9 — current exact CDP path produces real extractable text: positive control

A simple heading/paragraph/list fixture printed through the current worker-equivalent CDP options produced text that `pypdf` extracted in ordinary Unicode form. The result was not a page-sized raster-only image.

This is an important positive control for later reading/search.

### Block 10 — tested exact CDP output is tagged, but source does not explicitly require it

On managed Chromium 144, the exact current `Page.printToPDF` argument set produced:

- `/StructTreeRoot` present;
- `/MarkInfo /Marked true`.

The Chrome DevTools Protocol documents `generateTaggedPDF` as an experimental boolean whose default is **embedder choice**. Current WebClip does not pass it explicitly.

Reference: https://chromedevtools.github.io/devtools-protocol/tot/Page/

Therefore this research records current Chromium tagging as a positive engineering control, **not** as a cross-version product guarantee.

### Block 11 — document outline/bookmarks are not requested: architecture control

The same exact-CDP control did not contain `/Outlines`. Repeating with `generateDocumentOutline:true` produced an outline object.

Current worker does not request `generateDocumentOutline`.

This is not classified as a current defect; bookmarks/outline policy belongs to explicit later-reading/output-mode design under P2-007.

### Block 12 — flex visual order can extract in visual order: positive control

A flex fixture visually reversed two DOM siblings. The tested PDF text extraction followed the visual order.

This prevents overgeneralizing the next Grid result into “Chromium always extracts DOM order regardless of layout”.

### Block 13 — CSS Grid can preserve DOM logical order while visual order differs

A Grid fixture placed the first DOM node in the right column and the second DOM node in the left column.

Visual left-to-right order was:

`DOM_B_LEFT -> DOM_A_RIGHT`.

Exact-CDP PDF extraction was:

`DOM_A_RIGHT -> DOM_B_LEFT`.

The PDF remained tagged, so tagging alone did not make the extracted/logical order follow this visual placement.

### Block 14 — the Grid result matches the web platform's visual-vs-logical distinction

MDN's Grid accessibility guidance, reflecting the CSS specification, states that Grid placement may visually reorder items without changing non-visual/speech or sequential navigation order.

Reference: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Accessibility

This is therefore primarily a **capture-mode semantics** issue rather than evidence that current Chromium printing is malfunctioning. A faithful Print PDF can preserve page visual placement while a Reader/semantic mode may intentionally prioritize logical source order. P2-007 already owns that distinction.

### Block 15 — generated pseudo text and SVG text remain searchable: positive controls

Exact-CDP fixture contained visible `::before` generated text and SVG `<text>`.

Extracted PDF text included both generated pseudo text and `SVG_TEXT`.

This shows Chromium's PDF text layer covers representative renderer-generated/SVG text in the tested path.

### Block 16 — canvas-drawn glyphs are not semantic PDF text: explicit output boundary

The same fixture drew visible words only through canvas pixels. Those canvas glyphs were absent from PDF text extraction.

That is expected for a bitmap rendering surface and should not be mislabeled as a WebClip regression by itself. It reinforces P2-007's need for explicit semantics between visually faithful Print output and formats/modes that promise semantic/searchable content.

## Blocks 17–24 — current rendered form state and flattened-frame loss

### Block 17 — top-document live `<input>` value is physically preserved: positive control

A top-document text input had source attribute `OLD`, then its live `.value` was changed to `LIVE_INPUT_NEW` before exact-CDP print.

Extracted PDF text contained `LIVE_INPUT_NEW`.

Current direct Chromium printing therefore captures this representative live control value without a WebClip-specific property-to-attribute snapshot.

### Block 18 — top-document live `<textarea>` value is physically preserved: positive control

A textarea's source text was `OLDT`, while live `.value` became `LIVE_TEXTAREA_NEW`.

Exact-CDP PDF text contained `LIVE_TEXTAREA_NEW`.

This is consistent with earlier P1-187 evidence that runtime textarea value cloning works in the tested Chromium build.

### Block 19 — top-document runtime `<select>` option is physically preserved: positive control

A top-document select defaulted to `OPT_A`, then live `selectedIndex` changed to `OPT_B`.

Exact-CDP PDF text contained `OPT_B`.

Direct Chromium can therefore print the current selected option correctly. The later failure is specifically introduced by WebClip's flattened child representation.

### Block 20 — top-document current contenteditable text is physically preserved

A contenteditable region was changed from `EDIT_OLD` to `EDIT_LIVE_NEW` before print. Exact-CDP PDF extraction contained `EDIT_LIVE_NEW`.

Checkbox/radio live properties were also changed in the fixture. Text extraction alone is not used as proof of their visual mark state, so no unsupported conclusion is made from those controls here.

### Block 21 — `cloneNode(true)` preserves several runtime form properties: positive boundary

A direct clone control reproduced current Chromium behavior:

- text-input `.value` survived cloning even when the original HTML `value` attribute was older;
- textarea `.value` survived cloning while its source text node remained older;
- checkbox `.checked` survived cloning.

This matches prior evidence that some native control state is cloned and prevents the false claim that the entire form-state surface is lost.

### Block 22 — runtime `<select>` choice does **not** survive the current flattening primitive

The same clone control changed a source select from default option `ALPHA` to live option `BETA` before `cloneNode(true)`.

Source live state was `BETA`; cloned select state reverted to `ALPHA`.

This is a browser clone-semantics boundary that current WebClip flattening does not compensate for.

### Block 23 — physical flattened-frame PDF prints the wrong option

A same-origin-frame model used the exact production flattening primitive: clone each child body node into a top-document proxy, then print through the worker-equivalent exact CDP path.

Before flattening:

- child select live value: `BETA`;
- child input live value: `NEWI`;
- child textarea live value: `NEWT`.

After flattening:

- cloned select value: `ALPHA`;
- cloned input value: `NEWI`;
- cloned textarea value: `NEWT`.

Physical PDF text was:

`Choice ALPHA Text NEWI Area NEWT`.

The user-visible child choice `BETA` was therefore replaced by the default `ALPHA` in the saved artifact. This is a concrete **P1-187** rendered-state fidelity refinement.

### Block 24 — acceptance / owner boundaries

This completed tranche requires no new P-code. Durable acceptance refinements are:

1. **P0-004:** final selected-PDF hyperlink graph is part of saved-copy completeness. Included internal links cannot remain silently actionable when their exact saved destination is absent/ambiguous; repair must remain selection-bounded.
2. **P1-187:** flattened frame representation preserves frame-local URL/base provenance and current browser-owned/form presentation state needed for faithful reading, including runtime select choice, under existing bounded representation budgets.
3. **P0-068/P1-213:** flattening must not create duplicate identities that collapse distinct local fragment targets into one saved destination.
4. **P2-007:** distinguish visual Print fidelity from semantic/Reader accessibility/search order; do not promise that every complex visual rearrangement becomes logical reading order in the PDF.
5. **P0-071/P0-066:** any fallback hyperlink remains safe-scheme and privacy/minimization governed.
6. Real unpacked Chrome remains release QA. Managed Chromium proof above is engineering evidence only.

## Reproduction notes

The strongest physical schedules can be reproduced without extension policy bypass:

- create a controlled page fixture;
- apply only the exact representation mutation under test (selected-only target removal or child-body `cloneNode(true)` adoption);
- call CDP `Emulation.setEmulatedMedia({media:'screen'})`;
- call `Page.printToPDF` with the current worker's options and `ReturnAsStream`;
- inspect PDF text, `/Annots`, named destinations, `/StructTreeRoot`, `/MarkInfo` and `/Outlines`.

The probes deliberately do not claim full unpacked-extension QA and do not exercise external Yandex state.

## External references used only for platform/architecture interpretation

- Chrome DevTools Protocol `Page.printToPDF`: https://chromedevtools.github.io/devtools-protocol/tot/Page/
- MDN Grid layout and accessibility: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Accessibility

The platform references are not treated as substitutes for the direct fresh-source and physical-PDF evidence above.
