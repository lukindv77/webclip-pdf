# Durable audit evidence — same-origin iframe SVG/chart author-style fidelity — 2026-08-30

Canonical P-code status remains exclusively in `project_docs/AUDIT_REGISTRY.md`. This file is an interruption-safe evidence checkpoint for Blocks 1–16 of a fresh-source deep-audit tranche. Runtime, `manifest.json`, version, build/tag/release state and release readiness are unchanged.

Fresh audited baseline: `main` at `013bea563f504a325f501ecc4521b1e41cdd11ef`.
Working branch: `audit/iframe-svg-author-style-fidelity-2026-08-30`.
Managed browser: Chromium `144.0.7559.96`.

Physical probes use direct Chromium PDF as the renderer-positive control and a production-shaped same-origin flattened-frame representation as the comparison. The proxy deep-clones iframe body children into a top-document-owned section, copies the current `FLATTENED_FRAME_STYLE_PROPERTIES` computed-style allowlist, removes scripts, hides the source frame, then prints with screen media and backgrounds enabled. These fixtures are engineering evidence only; they are not real unpacked-extension release QA.

## Executive checkpoint classification

No new P-code is justified by Blocks 1–16.

- **P1-187 ACTIVE** is the primary owner. The flattened iframe proxy loses SVG/chart rendered state that direct Chromium PDF preserves when that state is supplied by iframe-head author CSS or document-root custom-property state rather than body-cloned presentation/inline CSS.
- **P0-004 ACTIVE** is a supporting copy-fidelity boundary because visually selected chart/diagram content can remain present while its paint, clipping, compositing or geometry changes materially.
- **P1-003 ACTIVE** is supporting only where a lost SVG paint reference also represents a resource dependency; these first blocks primarily isolate already-loaded/local SVG presentation-state loss rather than network readiness.
- **P0-075 ACTIVE** remains a supporting representation-isolation boundary; copying a bounded final representation must not depend on live page CSS staying attached to the source frame after the secondary representation is constructed.

The important distinction is not “SVG unsupported”. Presentation attributes, inline style and body-cloned style rules are positive controls. The fresh defect surface is **author/document style state outside the flattened body plus SVG-specific computed properties absent from the current copy allowlist**.

## Fresh source boundary — Block 1

Fresh `content.js` at `013bea56...` defines `FLATTENED_FRAME_STYLE_PROPERTIES` as a finite list focused on ordinary HTML layout/text/background/table properties. It contains `color` and ordinary backgrounds but does not include SVG paint/compositing properties such as:

- `fill`, `fill-opacity`, `fill-rule`;
- `stroke`, `stroke-width`, `stroke-opacity`, `stroke-dasharray`, `stroke-linecap`, `stroke-linejoin`;
- `opacity`;
- `transform` / SVG transform-origin semantics;
- `marker-start`, `marker-mid`, `marker-end`;
- `clip-path`, `mask`, `filter`;
- gradient/filter primitive paint state such as `stop-color`, `stop-opacity`, `flood-color`;
- inherited/custom properties themselves.

The same flattened representation clones `sourceBody` content rather than iframe `head` stylesheets. Therefore an SVG class may remain in the proxy while the rule that gave the class its current paint no longer exists, and the current allowlist does not materialize that paint as inline computed state.

## Block 2 — direct Chromium preserves iframe-head SVG class paint

Fixture: iframe `<head><style>` applies red `fill`, blue `stroke` and 10 px stroke width to a body SVG rectangle through a class.

Direct source computed state:

- `fill = rgb(255, 0, 0)`;
- `stroke = rgb(0, 0, 255)`.

Direct physical PDF raster contained approximately 32,113 strongly red pixels and 8,910 strongly blue pixels. This is the positive browser control: Chromium itself can print the intended iframe SVG state.

## Block 3 — flattened proxy loses head-class fill/stroke

The production-shaped proxy keeps the rectangle and its class, but the iframe-head rule is absent and `fill`/`stroke` are not in the copied property list.

Proxy computed state became:

- `fill = rgb(0, 0, 0)` (SVG default);
- `stroke = none`.

Proxy PDF contained about 36,046 strongly black pixels and no corresponding red/blue chart paint. Direct vs proxy raster differed in about 41,884 pixels.

This is P1-187 rendered-state loss, not a PDF renderer limitation.

## Block 4 — SVG presentation attributes are a positive control

The same rectangle expressed paint with SVG presentation attributes:

`fill="#ff0000" stroke="#0000ff" stroke-width="10"`.

Source and flattened proxy computed paint remained equal, and direct/proxy physical rasters were pixel-identical in the audit render. The proxy therefore does preserve this declarative body-owned form.

Do not generalize Block 3 into a claim that every SVG paint is lost.

## Block 5 — element inline style is a positive control

The same paint supplied by `style="fill:...;stroke:...;stroke-width:..."` remained in `cloneNode(true)`. Source/proxy computed state matched and the physical direct/proxy rasters were pixel-identical.

A future fix should not blindly duplicate state already carried safely by the cloned body representation.

## Block 6 — iframe-head opacity is lost

Fixture: head rule applies `fill:red; opacity:.2`.

Source computed `opacity = 0.2`; proxy became `opacity = 1` and default black fill. Direct/proxy physical rasters differed in about 37,418 pixels.

Opacity is renderer-visible state and is absent from the current flattened computed-style property list.

## Block 7 — iframe-head SVG transform is lost

Fixture: class rule applies red fill and `transform:translate(120px,0)` to an SVG rect.

Source computed transform was `matrix(1, 0, 0, 1, 120, 0)`; proxy computed transform became `none`, and its paint fell back to black. Direct/proxy rasters differed in about 25,538 pixels, with the geometry occupying different locations.

This is stronger than a color-only regression: chart geometry can move.

## Block 8 — CSS marker-end/arrow presentation disappears

Fixture: an SVG line receives blue stroke and `marker-end:url(#arrow)` from iframe-head CSS; the marker path receives red fill from the same stylesheet. `<defs>` itself is inside the body SVG and therefore survives cloning.

Direct source computed `marker-end = url("#arrow")`; direct PDF contained about 2,259 blue line pixels and 4,878 red marker pixels.

Proxy computed `stroke = none` and `marker-end = none`; the tested marker/line region produced no corresponding non-white content. Direct/proxy raster differed in about 7,529 pixels.

The dependency definition survived. The presentation reference that activates it did not.

## Block 9 — CSS clip-path is lost although `<defs>` survives

Fixture: body SVG contains a local `<clipPath>`, while iframe-head CSS applies red fill plus `clip-path:url(#clip)`.

Source computed `clip-path = url("#clip")`; direct PDF showed the clipped red shape (about 7,986 strong-red pixels).

Proxy computed `clip-path = none`; the full rectangle rendered with default black paint (about 36,046 black pixels). Direct/proxy raster differed in about 36,856 pixels.

This is presentation-state loss independent of external SVG transport.

## Block 10 — CSS mask is lost although local mask definition survives

Corrected deterministic fixture: local body `<mask>` plus iframe-head rule `fill:red; mask:url(#m)` on the target rectangle.

Source computed `mask = url("#m")`; direct PDF contained about 9,862 strong-red pixels in the masked region.

Proxy computed `mask = none`, `fill = black`; proxy contained about 36,046 strong-black pixels. Direct/proxy raster differed in about 37,418 pixels.

An earlier exploratory mask probe used an ambiguous `rect` selector because the mask itself also contained a rect. That run was rejected. Only this explicit `rect.hot` control is retained.

## Block 11 — SVG filter reference from iframe-head CSS is lost

Fixture: local body `<filter id=f>` with Gaussian blur; iframe-head CSS applies red fill and `filter:url(#f)`.

Source computed `filter = url("#f")`; proxy became `filter = none` and default black fill. Direct/proxy raster differed in about 41,524 pixels.

Again, the local filter definition is present in the cloned body; what disappears is the author-CSS connection/current paint state.

## Block 12 — gradient stop colors styled from iframe head collapse

Fixture: body SVG contains `<linearGradient id=g>` and rect `fill="url(#g)"`; the two `<stop>` elements receive red/blue `stop-color` through iframe-head classes.

The rect's `fill:url(#g)` attribute survives, but the head rules for the stops do not. Direct PDF contained approximately 8,024 strongly red and 10,744 strongly blue pixels. Proxy gradient rendered effectively black, with about 36,856 pixels changed against the direct raster.

This is a chart-specific example where the resource/reference identifier survives yet the definition's current authored paint does not.

## Block 13 — iframe-root custom-property dependency is lost

Fixture: iframe `:root { --chart:#ff0000 }`; body SVG rect uses inline `fill:var(--chart)`.

The inline declaration is cloned, but the custom property lives on the iframe document root/head cascade rather than the cloned body subtree.

Source computed fill was red; proxy computed fill fell back to black. Direct PDF had about 36,046 strong-red pixels, while proxy had about 36,046 strong-black pixels; roughly 36,856 raster pixels differed.

Thus preserving the inline property text is not equivalent to preserving the resolved renderer state.

## Block 14 — runtime-mutated root custom property is also lost

The iframe initially defines `--chart:blue`, then runtime state sets the document root custom property to red before capture. The source rect's computed fill is red at admission.

The flattened proxy keeps `fill:var(--chart)` but does not carry the current root custom-property environment. Its computed fill becomes black. Physical result matches Block 13: direct red versus proxy black with roughly 36,856 differing pixels.

This makes the acceptance requirement explicitly about **current computed/document style state**, not merely copying static stylesheet text.

## Block 15 — `<style>` inside the body SVG is a positive control

Fixture places `.hot { fill:red; stroke:blue; ... }` in an SVG `<style>` element inside the body `<svg>`.

That style node is part of the cloned body. Source/proxy computed paint matched and direct/proxy PDFs were pixel-identical.

This proves body-cloned author CSS can survive when its scope/dependencies remain self-contained.

## Block 16 — ordinary body `<style>` is also a positive control

Fixture places the `.hot` SVG paint rule in a normal `<style>` element in iframe body before the SVG.

The body style node is cloned; source/proxy paint matched and physical PDF rasters were again pixel-identical.

Therefore the fresh finding is narrowly attributable to the representation boundary: iframe-head/document-root author style and current SVG computed properties are not fully materialized into the flattened body representation.

## Rejected / harness controls

- An initial exploratory SVG fixture used unquoted values immediately followed by `/>`; HTML foreign-content parsing produced malformed attribute values such as `height="120/"`. Its raster observations are rejected. All retained physical results use corrected SVG syntax.
- The first mask inspection used a selector matching both the mask definition rect and target rect; it is rejected and replaced by the explicit `rect.hot` result in Block 10.
- Managed Chromium evidence does not substitute for real unpacked Chrome extension execution.

## Checkpoint acceptance direction

P1-187 cannot close merely by preserving DOM nodes or a small generic HTML computed-style subset. A truthful same-origin flattened representation must either:

1. preserve/materialize the **required final rendered state** for SVG/chart descendants (including document/head cascade, inherited/custom properties and SVG paint/compositing properties) under explicit budgets; or
2. use another representation strategy that retains those semantics; or
3. truthfully degrade/fail rather than silently emitting plausible default-black/unclipped/unfiltered chart content.

The positive controls show that an indiscriminate full-style rewrite is not required for every SVG node; acceptance should be dependency/state driven and bounded under existing P1-167/P0-064 limits.