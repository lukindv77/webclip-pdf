# Durable research evidence — responsive/replaced-media fidelity — Blocks 33–48 — 2026-08-30

Continuation of the interruption-safe responsive/replaced-media tranche from exact base `32e9672542482ba2a58d90258750261af75c5576`.

No runtime/status/release changes. Canonical P-code authority remains `RESEARCH_REGISTRY.md`. Managed Chromium/CDP/PDF raster evidence is engineering evidence only.

## Block 33 — direct top-document `vh` geometry changes during print without responsive candidate upgrade

A direct top-document width-descriptor fixture used:

- viewport 1200 x 800;
- `srcset="red400.png 400w, blue800.png 800w"`;
- `sizes="50vh"`;
- CSS width `50vh`;
- DPR 1.

Before print:

- currentSrc red400;
- natural size 400 x 200;
- rendered box 400 x 200.

Worker-shaped screen-media A4 print changed the rendered box to approximately 515.5 x 257.75, matching the previously proven paged `vh` basis, but Chromium did not request blue800 and currentSrc remained red400.

This is an important negative/contrast result: print geometry and responsive resource selection are not guaranteed to move together.

## Block 34 — fixed-size direct image control remains stable

With the same `srcset` but `sizes="400px"` and fixed CSS width 400 px:

- before/after currentSrc remained red400;
- rendered box remained 400 x 200;
- only red400 was requested.

This isolates the Block 33 geometry change to viewport-relative sizing rather than ordinary PDF conversion.

## Block 35 — stale candidate under larger print box can lower effective pixel density

In Block 33 the source candidate supplied 400 intrinsic pixels for a 400 CSS-pixel screen box, but the same candidate was used for an approximately 515.5 CSS-pixel print box.

The browser is allowed to retain a previously selected higher/lower candidate rather than continuously reselect on every layout change. Therefore future fidelity tests must not assume either:

- that `currentSrc` always follows final PDF geometry; or
- that keeping the same `currentSrc` proves equivalent visual sampling quality.

This is supporting P0-004/P0-070 evidence, not a new root cause.

## Block 36 — child document base is renderer/resource provenance

A same-origin `srcdoc` fixture used an explicit child base:

`<base href="https://asset.test/child/">`

while the top document used:

`<base href="https://asset.test/top/">`.

Child content contained:

- SVG `<image href="asset.png">`;
- ordinary `<img src="asset.png">`;
- `<picture><source media="(min-width:1px)" srcset="pic.png"><img ...>`.

Child routes resolved to red resources; corresponding top-base routes resolved to blue resources.

## Block 37 — source physical control is consistently child-red

Before flattening:

- ordinary img `currentSrc = https://asset.test/child/asset.png`;
- picture img `currentSrc = https://asset.test/child/pic.png`;
- SVG image attribute remains relative `asset.png` but resolves/rendered in the child document.

Physical source PDF:

- SHA-256 `e2f067897fd07b5a6a5ff95213d5a4067ef4c1f6c23d32eb9b8847824f33995c`;
- strong red pixels: 136,202;
- strong blue pixels: 0.

## Block 38 — ordinary `<img>` is a positive control for current URL normalization

A current-like top proxy applies the real `copyFrameCloneUrlState()` idea to the ordinary img:

- read child `currentSrc` absolute URL;
- write it to top clone `src`;
- remove responsive img srcset state.

The top clone therefore retains:

`https://asset.test/child/asset.png`

and remains red even though the top document has a different `<base>`.

This proves the current special case is useful when its sampled generation is correct.

## Block 39 — SVG `<image href>` relative resource provenance is not normalized

The cloned SVG keeps:

`<image href="asset.png">`

because `copyFrameCloneUrlState()` special-cases HTML anchors/images/media but not SVG `<image>`.

Once the SVG is inserted into the top document, the relative resource resolves under top base and requests:

`https://asset.test/top/asset.png`

which is blue in the controlled fixture.

Thus same markup string + moved document means different physical resource.

## Block 40 — retained `<picture><source srcset>` can override the pinned `<img src>` under the new base

The current-like picture proxy begins with the cloned img pinned to the child absolute currentSrc:

`https://asset.test/child/pic.png`.

However, the cloned `<source srcset="pic.png">` remains present. In the top document its relative srcset resolves under top base, the always-true media condition applies, and the browser sets proxy img currentSrc to:

`https://asset.test/top/pic.png`.

So pinning only the `<img src>` is not sufficient while higher-priority picture source-selection markup survives.

## Block 41 — physical proxy has mixed provenance exactly matching the source-code asymmetry

Physical top-proxy PDF:

- SHA-256 `aaf39cddd7b1f387ecba96c46e21a0e29563836a34d3fc68f008ce93fe1cb641`;
- strong red pixels: 45,450;
- strong blue pixels: 90,451.

The one ordinary HTML img remains child-red; SVG image and picture candidate become top-blue.

This differential result is especially strong because all three resources began in the same child document and were moved by the same proxy operation. The outcome follows exactly which resource state current code normalizes.

## Block 42 — absolute/frozen resource control restores child resource provenance

A positive control:

- materialized child absolute URL into SVG `<image href>` before insertion;
- removed the responsive `<source>` that could re-evaluate under top base;
- pinned picture img to the child admitted currentSrc.

Physical frozen proxy contained red pixels and zero blue pixels.

The test therefore distinguishes missing provenance materialization from a Chromium inability to print the resources.

## Block 43 — frame proxy creation introduces resource work after the top prefetch receipt

Exact current `prepareForPrint()` runs:

`meta.resourceReport = await prefetchIncludedResources()`

and remote frame preparation before later operations that include:

- temporary image wrapping;
- frame-height stabilization;
- `flattenSelectedSameOriginBodyFramesForPrint()`.

`createFlattenedBodyFramePrintProxy()` creates new top-document elements/resources after the original selected-DOM prefetch has already completed.

Thus the resource report is not automatically a readiness receipt for resources newly requested by the flattened proxy.

## Block 44 — the delayed-picture physical race is explained by this exact ordering

Existing fresh probe in this tranche:

- child source red candidate was already loaded and ready;
- top picture proxy insertion selected delayed blue;
- immediate `Page.printToPDF` completed in about 8.6 ms while proxy remained unresolved and produced no red/blue image pixels;
- after blue settled, the same proxy produced a blue physical PDF.

The source ordering in Block 43 explains why top prefetch can honestly report the original source ready while the physical flattened representation is still loading a different/new resource.

## Block 45 — current flattened diagnostics do not carry responsive/replaced-media receipts

Current flattened-frame diagnostics sanitize/report fields such as:

- mode/mount/depth/sameOrigin;
- sourceTextChars;
- cloneElementCount/styledElementCount;
- removedScripts/removedExcludes;
- styleBudgetTruncated.

They do not carry per-image:

- admitted currentSrc;
- proxy currentSrc;
- intrinsic dimensions;
- rendered object-fit/object-position;
- decoded-pixel identity;
- proxy load/decode settlement;
- source/proxy base provenance.

Therefore a successful diagnostic record cannot prove responsive/replaced-media parity.

## Block 46 — page diagnostics likewise do not receipt the actual image candidate

A source search of exact current `content.js` finds `currentSrc` only in resource prefetch, frame URL copying and image-link wrapping paths. `capturePageStructureDiagnostics()` does not snapshot currentSrc candidate identity for selected images.

This matters because before/after structural dimensions can look plausible while the physical pixels come from a different candidate or a broken proxy resource.

## Block 47 — resource identity needs three distinct concepts

Fresh evidence requires separating:

1. **admitted visual resource state** — what decoded pixels/crop the user actually saw;
2. **resource locator/candidate string** — e.g. currentSrc URL at a particular moment;
3. **future dereference result** — what bytes a later request under another document/base/policy/generation returns.

The current implementation often treats (2) as sufficient to recreate (1), but Blob revocation, same-URL changed response, relative SVG/picture base and delayed proxy selection prove that implication is false.

## Block 48 — third-stage owner reconciliation

No new P-code/status transition.

Primary current owners:

- **P1-187 ACTIVE** — flattened frame rendered-state/resource provenance must include replaced-media pixels/candidate/crop/intrinsic state and non-HTML resource URL parity.
- **P0-070 ACTIVE** — admitted resource/render generation must remain exact through later preparation and physical cut.
- **P0-004 ACTIVE** — physical visual/layout fidelity is the user-facing acceptance boundary.
- **P1-003 ACTIVE** — readiness must cover the actual final representation resource graph, including resources introduced/reselected after flattening.

Supporting:

- **P0-075 ACTIVE** — source page/frame is not a neutral mutable preparation workspace.
- **P1-167 / P0-064** — bounded computation/bitmap/resource materialization remains mandatory.
- **P2-007** — representation policy must explicitly choose current-view pixel freeze vs responsive reflow semantics.

The rejected local-navigation CSP/Referer experiments are not retained as evidence because managed Chromium in this environment blocks localhost/custom navigation by administrative policy. No product conclusion is drawn from those failed harness paths.
