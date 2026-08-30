# Same-origin iframe SVG/chart author-style fidelity — Stage 3 evidence — 2026-08-30

Interruption-safe continuation of Blocks 1–32. Fresh baseline remains `013bea563f504a325f501ecc4521b1e41cdd11ef`; branch `audit/iframe-svg-author-style-fidelity-2026-08-30`; managed Chromium `144.0.7559.96`.

No runtime/manifest/version/release changes. No new P-code/status transition.

Primary owner remains **P1-187 ACTIVE**. Supporting boundaries:

- **P0-004 ACTIVE** — physical selected-copy appearance/completeness;
- **P0-068 ACTIVE** — the flattened representation must not create duplicate-identity/live-insertion side effects; SVG fragment-ID namespace collisions are a concrete representation case;
- **P0-075 ACTIVE** — capture representation isolation from page-owned/live document state;
- **P1-003 ACTIVE** — final-representation font/resource readiness where source-document readiness does not imply proxy-document usability;
- **P1-167/P0-064** — any broader state materialization must remain budgeted.

Registry duplicate check confirms `P1-213 ACTIVE` is specifically “flattened same-origin iframe print proxy must be inert before live insertion”; no separate SVG-ID owner is created.

## Block 33 — inline custom property on source BODY is lost at the BODY→SECTION boundary

Source body itself carries `style="--chart:#ff0000"`; child SVG rect uses `style="fill:var(--chart)"`.

Direct source computed fill/PDF is red (~27,664 strong-red pixels). The flattened representation creates a new `<section>` rather than cloning the source `<body>` node, and custom properties are not in the copied computed-property list. Proxy rect falls to black (~27,664 black pixels), with ~28,386 raster pixels changed.

This is distinct from the earlier iframe-`:root` case: even **body inline custom state** is not automatically preserved because the body node itself is replaced by a synthetic proxy root.

## Block 34 — custom property inline on the cloned SVG is a positive control

`<svg style="--chart:#ff0000">` contains a child rect `fill:var(--chart)`.

The SVG element itself is cloned, including the custom inline declaration. Direct/proxy computed state and physical PDFs are pixel-identical (~27,664 strong-red pixels).

The BODY→SECTION boundary, not custom properties universally, causes Block 33.

## Block 35 — source BODY `visibility:hidden` becomes visible

Source `<body style="visibility:hidden">` contains a red SVG rect.

Direct PDF has zero target pixels. Proxy root does not clone body inline style and `visibility` is absent from the computed-style allowlist. Child becomes visible; proxy PDF contains ~28,386 non-white pixels (~27,664 strong red).

This extends the Stage-2 leaf-visibility finding to the entire same-origin frame representation.

## Block 36 — source BODY `display:none` is a positive control

Same structure uses `body style="display:none"`.

`display` is copied from source body computed state to the synthetic proxy root. Source and proxy remain zero-box/invisible; direct/proxy PDFs are pixel-identical blank controls.

Again, state preservation is selective and property-driven.

## Block 37 — source BODY opacity is lost as a group compositing effect

Source body has `opacity:.2`; child rect itself reports opacity 1 because opacity is applied at the body stacking/group level.

Direct PDF renders the red rect translucently. Proxy synthetic root lacks body opacity and renders full red (~27,664 strong-red pixels). Direct/proxy raster differs in ~28,948 pixels.

This is important diagnostically: inspecting only descendant computed `opacity` would miss the lost ancestor compositing state.

## Block 38 — source BODY transform is lost although child computed transform remains `none`

Source body has `transform:translateX(120px)`; child red rect's own computed transform is `none` but its source bounding x is 150 px.

Proxy root does not preserve body transform; child x becomes 30 px. Both rasters contain the same ~15,120 strong-red pixels but ~30,894 pixels differ because the entire chart moves.

Ancestor renderer state must be represented even when the selected descendant's own computed property looks unchanged.

## Block 39 — top-document SVG gradient ID collision retargets proxy paint

Isolated control removes layout confounds by storing the top conflicting `<defs>` in an absolutely positioned zero-size SVG.

Source iframe defines `linearGradient id="g"` as red and a rect `fill="url(#g)"`. Top document independently defines **the same id `g`** as blue.

- Direct iframe PDF: ~28,386 strong-red pixels.
- After body flattening into the top document: same target geometry, but proxy PDF is ~28,386 strong-blue pixels.
- Direct/proxy raster differs in ~28,386 pixels.

The DOM attribute is unchanged; its fragment dependency is now resolved in a different document-global ID namespace. This is P1-187 physical fidelity with P0-068 duplicate-identity/insertion support.

## Block 40 — local `<use href="#s">` can bind the top document's symbol

Source iframe has red rectangular `<symbol id=s>`; top document has a blue circular `<symbol id=s>` in hidden/zero-size defs.

Direct source renders the red rectangular symbol (~19,881 red pixels). Proxy keeps identical `<use href="#s">` geometry but renders the top blue symbol (~15,728 blue pixels). Raster differs in ~20,449 pixels.

This is stronger than an attribute-rebase defect: a same-document fragment remains syntactically valid yet names the wrong physical definition after document merge.

## Block 41 — local clipPath can bind a top-document collision

Corrected fixture uses valid explicit SVG closing tags and an absolutely positioned top defs container.

Source iframe `clipPath id=c` is a large rectangle; top document `clipPath id=c` is a small circle. Target keeps `clip-path="url(#c)"` and identical bounding geometry.

Direct PDF contains ~27,664 strong-red pixels; proxy only ~2,457 because the top-document circle wins. About 25,643 raster pixels differ.

An earlier malformed exploratory clip fixture is rejected; only this corrected control is retained.

## Block 42 — `<textPath href="#p">` can bind the wrong top path

Source frame path `id=p` is horizontal; top document path with the same id is vertical.

Direct label bounds are roughly `(20,70,208.5,37)`. Proxy textPath resolves to the conflicting top path and bounds become approximately `(-11.3,-30,61.3,214.7)`. Physical raster differs in ~3,684 pixels.

Chart annotations can therefore remain present but move/reorient to a completely different geometry.

## Block 43 — iframe-scoped `@font-face` does not move with the flattened text

Fixture embeds a deterministic font as iframe-head `@font-face { font-family:AuditMono; ... }`; SVG text uses `AuditMono` at 40 px. Generic `font-family`/`font-size` are in the current style allowlist, deliberately isolating font-face document scope.

Source document:

- `document.fonts.size = 1`;
- `AuditMono` face status is loaded;
- text width ≈ 288.98 px.

Top document before/after clone has `document.fonts.size = 0`; proxy computed `font-family` still says `AuditMono`, but actual text width falls to ≈273.88 px and physical raster differs in ~6,357 pixels.

`FontFaceSet.check()` alone was observed to return a non-discriminating true value in the top document and is therefore **not** used as proof. The retained evidence is FontFaceSet inventory + physical glyph geometry/raster.

This creates a direct P1-003/P1-187 bridge: a font can be fully ready in the source document yet unavailable to the final proxy representation.

## Block 44 — SVG `text-anchor:middle` from iframe-head CSS is lost

Source label uses fixed x=210 and head CSS `text-anchor:middle`. Source text begins near x≈134 px. Proxy loses the property, falls to `text-anchor:start`, and begins at x=210 px while keeping the same text width.

Physical raster differs in ~3,127 pixels. This is a common chart-label positioning primitive.

## Block 45 — SVG `dominant-baseline:middle` from iframe-head CSS is lost

Corrected fixture uses valid explicit SVG markup. Source label bounding y≈73.17 px with `dominant-baseline:middle`; proxy falls to `auto`, y≈64 px.

Physical raster differs in ~3,583 pixels while label content/color remain present. An earlier malformed exploratory circle form is rejected.

## Block 46 — `stroke-opacity` is lost while stroke geometry remains

Line uses presentation attributes for blue stroke and width, with iframe-head CSS only for `stroke-opacity:.2`.

Source computed opacity is 0.2; proxy becomes 1. Direct/proxy raster differs in ~13,020 pixels; proxy has ~12,614 strongly blue pixels while translucent direct output has no pixels meeting that strong-blue threshold.

This isolates SVG paint state without head-defined stroke identity.

## Block 47 — runtime CSSOM mutation of a BODY `<style>` is not serialized by `cloneNode(true)`

Body contains `<style id=s>.hot{fill:blue}</style>`. Before capture, page code mutates `sheet.cssRules[0].style.fill = 'red'` through CSSOM.

Source computed/direct PDF is red (~27,664 strong-red pixels). Deep-cloned `<style>` carries the original text rule and proxy renders blue (~27,664 strong-blue pixels), changing ~28,386 pixels.

This deliberately refines Stage-1's static body-style positive control: **static DOM stylesheet text survives, but live CSSOM state need not be represented by cloned style text**.

## Block 48 — runtime CSSOM mutation of SVG-embedded `<style>` has the same serialization gap

The `<style>` node lives inside the cloned `<svg>` itself. Runtime CSSOM changes its rule blue→red before capture.

Source PDF is red; clone replays original blue rule text. Direct/proxy raster differs in ~28,386 pixels.

Therefore even “style node is inside the body/SVG and will be cloned” is insufficient to prove current renderer state if the CSSOM stylesheet object diverged from its original DOM text.

## Stage-3 acceptance boundary

The flattened representation currently changes at least four namespaces/state layers:

1. **root state:** source BODY is replaced by synthetic SECTION;
2. **document CSS/font state:** head/CSSOM/adopted FontFaceSet state does not automatically exist in top document;
3. **fragment identity namespace:** previously independent frame-local SVG ids merge with top-document ids;
4. **stylesheet object state:** cloning a `<style>` DOM node does not necessarily serialize live CSSOM mutations.

P1-187 acceptance must prove required state/dependency identity **in the final proxy document**, not only prove that source DOM nodes/attributes were cloned. P0-068 remains the supporting duplicate-identity/insertion owner; no new SVG-specific P-code is allocated.