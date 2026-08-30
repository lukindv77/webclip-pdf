# Same-origin iframe SVG/chart author-style fidelity — Stage 4 evidence — 2026-08-30

Interruption-safe continuation of Blocks 1–48. Fresh baseline remains `013bea563f504a325f501ecc4521b1e41cdd11ef`; branch `audit/iframe-svg-author-style-fidelity-2026-08-30`; managed Chromium `144.0.7559.96`.

No runtime/manifest/version/release changes. No new P-code/status transition.

Primary owner remains **P1-187 ACTIVE**. Strong supporting boundaries:

- **P0-068 ACTIVE / P1-213 ACTIVE** — the flattened same-origin representation must be inert before insertion; merging previously independent DOM/SVG identity namespaces can retarget both proxy and already-existing top-document references;
- **P0-075 ACTIVE** — top/page author CSS becomes a control plane over the adopted proxy representation;
- **P1-003 ACTIVE** — final-representation font/resource identity must be proven in the document that is actually printed;
- **P0-004 ACTIVE** — selected physical appearance/completeness;
- **P1-167/P0-064** — any namespace/style materialization repair remains bounded.

## Block 49 — two independent frame-local gradients with the same id collapse to the first flattened definition

Two same-origin iframes independently define `linearGradient id="g"`:

- frame A: red;
- frame B: green.

Each local rect uses `fill="url(#g)"`.

Direct page PDF before flattening: approximately 18,462 strong-red + 18,462 strong-green pixels.

After production-shaped body flattening of both frames into one top document: approximately 36,924 strong-red pixels and no strong-green region. The second proxy resolves its originally local `#g` against the first flattened definition.

Direct/proxy raster differs in ~36,924 pixels.

This proves frame-local fragment identity is not preserved merely because each cloned subtree contains its own definition.

## Block 50 — two frame-local `<symbol id=s>` namespaces also collapse

Frame A defines a red rectangular symbol `id=s`; frame B defines a green circular symbol with the same id. Each frame uses `<use href="#s">`.

Direct page PDF: ~14,762 strong-red + ~11,555 strong-green pixels.

After flattening: ~29,642 strong-red pixels and no green symbol. The second proxy resolves to the earlier first-proxy symbol. Raster differs in ~26,706 pixels.

The risk therefore applies to generic SVG fragment identity, not only gradient paint servers.

## Block 51 — inserting a proxy can retarget an existing top-document gradient consumer

Top document already contains its own later `linearGradient id=g` (green) and an existing host rect using `fill="url(#g)"`. The source iframe contains a different red `id=g` definition. The proxy is inserted earlier in document order.

Before flattening, host content renders green (~18,462 strong-green pixels). After proxy insertion, the **host content itself** becomes red (~18,462 strong-red pixels), with ~20,453 raster pixels changed.

Thus the proxy can mutate the visual meaning of content outside the selected iframe. This is not only a wrong-proxy-output issue; it is a concrete P0-068/P1-213 insertion/duplicate-identity side effect.

## Block 52 — proxy symbol insertion can also mutate existing host `<use>`

Top host originally uses its own green circular `symbol id=s`. Flattened frame introduces an earlier red rectangular symbol with the same id.

Host before flattening: ~11,560 strong-green pixels. After proxy insertion: ~14,762 strong-red pixels. Raster differs in ~15,428 pixels.

Again, top-document content can be retargeted by the proxy's imported identifiers.

## Block 53 — ordinary top-document class CSS begins styling adopted iframe SVG

Iframe source rect uses a red presentation attribute and class `hot`; no iframe rule changes that paint. Top document defines `.hot { fill: blue }`.

Because iframe has its own document/cascade, direct source remains red (~27,664 strong-red pixels). Once adopted into the top document, the same class enters the top author cascade and proxy becomes blue (~27,664 strong-blue pixels), differing by ~28,386 pixels.

This is a final-representation cascade problem even when source inline/body paint state was otherwise clone-safe.

## Block 54 — top-document ID selectors likewise restyle the proxy

Source rect `id=t` is red. Top document defines `#t { fill: blue }`.

Source iframe remains red; flattened target becomes blue with ~28,386 changed raster pixels.

Frame-local IDs therefore carry both SVG-fragment and CSS-selector collision risk after adoption.

## Block 55 — top-document CSS can hide previously visible iframe content

Source red rect is visible. Top document defines an ordinary `rect { visibility:hidden }` rule.

Direct iframe PDF contains ~27,664 strong-red pixels. Proxy becomes hidden/blank after adoption; raster differs in ~28,386 pixels.

This is the opposite of the earlier lost-`visibility:hidden` case: depending on source/top cascade, flattening can reveal hidden content **or** suppress visible content.

## Block 56 — lost source custom property can silently inherit a wrong valid top value

Source body defines `--chart:red`; child rect uses inline `fill:var(--chart)`. Top document defines `:root { --chart:blue }`.

Direct iframe renders red. Because source BODY is replaced by a synthetic SECTION, the frame-local variable is lost; the cloned descendant then inherits the top-document blue variable and renders blue (~27,664 pixels), not a conspicuous default-black failure. Raster differs in ~28,386 pixels.

This is especially dangerous for archival truth: missing source state can be replaced by plausible-but-wrong host state.

## Block 57 — top-document filter rules become active on the proxy

Source class `hot` has no filter. Top document defines `.hot { filter: blur(8px) }`.

Direct iframe remains sharp; proxy computed filter becomes blur(8px) and raster differs in ~29,872 pixels.

Adoption therefore changes compositing, not merely color.

## Block 58 — top-document text-anchor changes chart-label geometry

Source SVG text class `lab` uses default `text-anchor:start`, with x=210. Top document defines `.lab { text-anchor:end }`.

Source label begins at x≈210. Proxy begins around x≈57.98. Raster differs in ~3,659 pixels.

Text/annotation geometry can silently change under otherwise ordinary top CSS.

## Block 59 — per-element materialized `color` is a positive isolation control

Source body color is red and child SVG uses `fill="currentColor"`. Top document has a non-important rule targeting only `[data-webclip-pdf-flattened-frame] { color:blue }`.

Current style copying writes the source element's computed `color` inline onto each cloned descendant, not only the proxy root. The cloned SVG/rect therefore retains red currentColor and direct/proxy PDFs are pixel-identical.

This is a useful design clue: materializing a dependency on the actual consumer can isolate it from ancestor-level top cascade.

## Block 60 — root-level `!important` color still does not defeat descendant materialization in this control

The same fixture uses `[data-webclip-pdf-flattened-frame] { color:blue !important }` on the proxy root.

The child SVG/rect still has source-computed red `color` materialized directly on itself by the production-shaped copy loop, so inherited root blue does not replace the specified descendant value. Direct/proxy PDFs remain pixel-identical.

This is a **positive/negative control**, not proof that top `!important` CSS is generally harmless. Block 61 targets the child directly and demonstrates the opposite.

## Block 61 — top `!important` rule directly targeting a cloned child overrides copied generic state

Iframe `<foreignObject>` contains an XHTML `.card` styled red-background/white-text in iframe head. The generic background/color/font/padding values are copied inline to the child.

Top document defines:

`[data-webclip-pdf-flattened-frame] .card { background:blue !important; color:yellow !important }`.

After adoption, the direct child rule wins over WebClip's non-important inline materialization. Proxy becomes blue/yellow; physical raster differs in ~19,942 pixels.

Therefore merely copying computed values inline does not isolate the final representation from hostile or accidental top author-important cascade.

## Block 62 — predictable flattened-proxy marker gives the page an explicit styling hook

Top document defines:

`[data-webclip-pdf-flattened-frame] rect { fill:blue !important }`.

Source iframe red rect is unaffected while isolated. After flattening, the predictable WebClip-owned marker matches and proxy becomes blue (~27,664 strong-blue pixels), differing from source by ~28,386 pixels.

This is direct P0-075/P1-187 evidence: the host page can deliberately detect and alter the secondary representation through its public author-CSS namespace.

## Block 63 — adoption can start top-document animation on iframe classes

Top document defines `.pulse { animation:recolor 1ms linear forwards }` and keyframes ending in blue fill. Source iframe rect class `pulse` is red and has no such animation in its own document.

Direct iframe remains red. After adoption, top animation applies and proxy becomes blue; raster differs by ~28,386 pixels.

The final representation can therefore enter a new time-dependent state machine that did not exist in the source frame.

## Block 64 — identical font-family text can resolve to a different top-document font face

Source iframe and top document both define a family named `SharedAudit`, but with different deterministic embedded font bytes. SVG text uses the family name and generic font properties that the current proxy copies.

Source text uses the iframe's face with width ≈288.98 px. Proxy computed `font-family` string remains `SharedAudit`, but after adoption it resolves the top-document face and width becomes ≈316.72 px. Physical raster differs in ~6,142 pixels.

Thus copying the font-family string and merely observing that a face of that name exists in the final document does not prove **font identity**. P1-003/P1-187 acceptance needs exact final-representation font dependency identity/readiness.

## Stage-4 acceptance boundary

A faithful same-origin flattened representation must preserve not only nodes/computed values but also the **scope in which those values and references are interpreted**:

1. frame-local SVG fragment ids must not collide across proxies or with top content;
2. proxy insertion must not retarget existing host references;
3. iframe classes/ids must not silently enter arbitrary top-document author CSS/animation semantics;
4. custom-property inheritance must remain bound to the source representation rather than inheriting plausible top values;
5. materialized styles need an isolation model robust to directly targeted author-important rules;
6. font dependency identity is document-scoped and cannot be represented by family text alone.

These are refinements of P1-187 plus the existing P0-068/P1-213 inert/duplicate-identity boundary and P0-075 host-control boundary. No new SVG/cascade P-code is allocated.