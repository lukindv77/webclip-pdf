# Same-origin iframe SVG/chart author-style fidelity — Stage 2 evidence — 2026-08-30

Interruption-safe continuation of `AUDIT_IFRAME_SVG_AUTHOR_STYLE_FIDELITY_2026-08-30_EVIDENCE.md`.

Fresh baseline remains `013bea563f504a325f501ecc4521b1e41cdd11ef`; working branch `audit/iframe-svg-author-style-fidelity-2026-08-30`; managed Chromium `144.0.7559.96`. Runtime/manifest/version/release state are unchanged.

Blocks 17–32 keep **P1-187 ACTIVE** as the single primary rendered-state owner. P0-004 supports physical copy fidelity; P0-075 supports representation isolation/truth. No new P-code/status transition is justified.

## Block 17 — inherited SVG group paint from iframe-head CSS is lost

Source head CSS styles `<g class=series>` with red fill, blue stroke and 8 px stroke. Child rect inherits the paint.

Direct source PDF: about 24,411 strong-red + 6,495 strong-blue pixels. Proxy child computed fill/stroke fall to black/none; proxy has about 27,664 strong-black pixels. Raster difference: ~31,354 pixels.

This proves loss is not limited to a class directly on the painted leaf. Inherited SVG paint environment is also part of current rendered state.

## Block 18 — `visibility:hidden` can become visible in flattened PDF

Fixture: target rect is visually hidden through iframe-head `.secret { visibility:hidden; fill:red }`.

Source computed state: `visibility:hidden`; direct PDF has zero non-white target pixels.

Proxy loses the head rule and current property list does not materialize `visibility`; computed state becomes `visibility:visible` and default black fill. Proxy PDF contains ~28,386 non-white pixels (~27,664 strong black) where direct output had none.

This is a particularly important P1-187/P0-004 acceptance case: secondary representation can reveal content the user did **not** see, not merely restyle visible content.

## Block 19 — `display:none` is a positive hidden-state control

Same structure, but hidden via iframe-head `display:none`.

`display` is in `FLATTENED_FRAME_STYLE_PROPERTIES`; source computed `display:none` is materialized inline on the clone. Both direct and proxy PDFs contain zero target pixels and are pixel-identical.

Therefore the visibility regression is property-coverage/state-materialization specific, not proof that all hidden SVG state is lost.

## Block 20 — CSS-only SVG root size is lost

Isolated fixture uses presentation-attribute red paint (so color is not confounded) and iframe-head CSS only for `.chart { width:420px; height:220px }`.

Source SVG rect: 420×220 CSS px. Proxy SVG becomes approximately 500×250 in the test top representation because width/height are not in the copied property list and no width/height attributes constrain the SVG.

Direct/proxy raster differs by ~47,846 pixels; strong-red area grows from ~111,392 to ~157,922 pixels.

A chart can therefore retain all data nodes yet be rendered at materially different geometry/aspect sizing.

## Block 21 — SVG overflow state is lost and clips visible chart content

Isolated fixture uses fixed SVG attributes `width=160 height=140`, a red rect extending beyond the viewport, and iframe-head `.chart { overflow:visible }`.

Source computed overflow is `visible`; proxy falls to SVG default `hidden`. Direct PDF contains ~18,180 strong-red pixels; proxy only ~6,030. About 12,285 pixels differ, concentrated in the part outside the SVG viewport.

This is a concrete selected-chart clipping case under P1-187/P0-004.

## Block 22 — `vector-effect:non-scaling-stroke` is lost

A blue line sits inside `transform="scale(3)"`; stroke width is a presentation attribute, while `vector-effect:non-scaling-stroke` comes from iframe-head CSS.

Source computed vector-effect is `non-scaling-stroke`; proxy becomes `none`. Direct blue stroke occupies ~3,333 strong-blue pixels; proxy scaled stroke grows to ~10,302. Raster differs by ~7,625 pixels.

This isolates an SVG-specific geometry/paint property without relying on fill-class loss.

## Block 23 — stroke dash/linecap geometry is lost

Line has blue stroke/width attributes, while iframe-head CSS supplies `stroke-dasharray:18 12` and `stroke-linecap:round`.

Proxy falls to `stroke-dasharray:none` and `stroke-linecap:butt`. Physical raster differs in ~851 pixels. The line remains recognizably present, making this a “plausible but wrong” archival result rather than a blank/fail-obvious result.

## Block 24 — `fill-rule:evenodd` is lost

A compound red path relies on iframe-head `fill-rule:evenodd` to preserve a central hole. Proxy falls to SVG default `nonzero`.

Direct non-white area ~42,998 pixels; proxy ~55,013. About 12,285 pixels differ exactly in the intended hole region.

For maps/diagrams/icons, geometry semantics can therefore change even when `d` and `fill` attributes are preserved.

## Block 25 — local `<use>` target paint can disappear while `<use>` itself looks normal

Body SVG contains `<symbol id=s>` whose internal rect gets red/blue paint from iframe-head CSS; visible `<use href="#s">` remains in the clone.

The inspected `<use>` node has no obvious computed-property delta, yet direct PDF shows ~13,456 red + 4,536 blue pixels while proxy shows ~15,750 black pixels; ~18,632 pixels differ.

This is a diagnostics warning: inspecting only the visible `<use>` element can miss lost style dependencies inside its referenced local definition.

## Block 26 — SVG text paint from iframe-head CSS is lost

`<text>` receives red fill and bold 42 px Arial from iframe-head CSS. Generic font properties are copied, but SVG `fill` is not.

Text geometry stays the same, but direct PDF renders ~4,347 strong-red text pixels while proxy renders ~4,243 strong-black pixels. About 5,294 pixels differ.

Even searchable/visible text can therefore keep its glyph geometry while losing the visual state the user saw.

## Block 27 — `fill="currentColor"` + copied `color` is a positive control

Fixture uses presentation attribute `fill="currentColor"`; iframe-head CSS sets class `color:red`.

`color` is in the current generic allowlist, so it is materialized on the cloned node; `currentColor` continues to resolve correctly. Direct/proxy PDFs are pixel-identical with ~27,664 strong-red pixels.

This is an important bounded-fix clue: some SVG presentation dependencies can already be preserved through the existing generic state set.

## Block 28 — ordinary HTML inside SVG `<foreignObject>` is a positive control

A `<foreignObject>` contains an XHTML div styled from iframe-head CSS with red background, white text, font and padding.

The generic HTML properties required by this fixture are in the current computed-style allowlist. Source/proxy geometry and physical PDF are pixel-identical (~17,606 strong-red pixels).

Thus direct evidence separates SVG-specific paint/state omissions from all iframe-head CSS in general: ordinary HTML can survive because WebClip materializes the relevant computed properties.

## Block 29 — constructable `document.adoptedStyleSheets` SVG paint is lost

After load, fixture creates a `CSSStyleSheet`, adds `.hot{fill:red;stroke:blue;stroke-width:8px}`, and assigns it to `document.adoptedStyleSheets`.

Source PDF correctly contains ~24,411 red + 6,495 blue pixels. The stylesheet is not a body DOM node and SVG paint properties are not materialized by the allowlist; proxy becomes black/unstroked (~27,664 black pixels), differing by ~31,354 pixels.

Modern document-owned style state therefore has the same representation problem even without a conventional `<style>` in head.

## Block 30 — runtime CSSOM mutation of iframe stylesheet is lost

Fixture initially styles `.hot` blue, then mutates the live head stylesheet rule through CSSOM to red before capture.

Source computed state/direct PDF is red (~27,664 strong-red pixels). Proxy keeps the class but not the current head CSSOM state and falls to black (~27,664 strong-black pixels). About 28,386 pixels differ.

The acceptance contract is current renderer state, not static original stylesheet text.

## Block 31 — runtime SVG presentation-attribute mutation is a positive control

Source rect initially has blue `fill` attribute, then runtime changes the attribute to red before capture.

`cloneNode(true)` captures the current attribute value. Source/proxy computed state matches and physical PDFs are pixel-identical (~27,664 strong-red pixels).

## Block 32 — runtime element inline-style mutation is a positive control

Source rect starts with inline blue fill; runtime changes `element.style.fill` to red before capture.

The current inline declaration is cloned. Direct/proxy PDFs are pixel-identical (~27,664 strong-red pixels).

## Stage-2 boundary

The evidence now separates four representation classes:

1. **Body-owned explicit state** (presentation attrs, inline styles, body style nodes) — generally survives the tested proxy.
2. **Generic computed properties already in the allowlist** (`display`, `color`, ordinary foreignObject HTML styles) — can be materialized successfully.
3. **Document/head/CSSOM/adopted stylesheet state whose required SVG computed properties are not copied** — silently changes/losses paint/geometry.
4. **Referenced SVG definitions** — may remain in body while the styling/reference semantics that make them render correctly disappear.

P1-187 acceptance must therefore be current-renderer-state/dependency aware, not simply DOM-clone complete.