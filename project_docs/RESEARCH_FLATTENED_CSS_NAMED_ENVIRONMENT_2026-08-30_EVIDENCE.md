# Durable research evidence — flattened-frame CSS named environment / live stylesheet isolation — 2026-08-30

Canonical P-code owner/status authority remains exclusively in `RESEARCH_REGISTRY.md`. This document preserves **Blocks 1–16** of a fresh-source research focused on whether a same-origin iframe flattened into the top document can retain the page as the user saw it for later reading without importing the child document's stylesheet authority into unrelated top/proxy content.

Exact fresh baseline for this tranche: `main = 4d26fb5b6481861d0f11f37e8c3c8746afb5b6ab` (post-merge Repository integrity #134 SUCCESS).

Managed browser for deterministic physical probes: Chromium `144.0.7559.96` on Debian. PDF probes use worker-equivalent `Emulation.setEmulatedMedia({media:'screen'})` + `Page.printToPDF`, `printBackground:true`, `preferCSSPageSize:true`. These are engineering probes only; real unpacked Chrome remains release QA.

No runtime, `RESEARCH_REGISTRY.md`, manifest/version, build, tag or Release change is made by this research checkpoint.

## Executive classification for Blocks 1–16

No new permanent P-code is justified so far.

Primary existing owner relationships:

- **P1-213 ACTIVE** — current flattened same-origin iframe proxy is connected as live top-document content; cloned child `<style>` / stylesheet nodes can become active merely because the proxy is connected. This is another concrete form of the existing "proxy must be inert before live insertion" root cause.
- **P1-187 ACTIVE** — secondary flattened representation must preserve required rendered state. Head-owned CSS named rules can disappear/rebind, while body-owned stylesheet rules can instead acquire top-document meaning and alter other content.
- **P0-068 ACTIVE** — flattened representation must not create duplicate/document-global side effects. Named CSS environments and live body stylesheet rules extend the already-established document-namespace isolation requirement.
- **P0-075 ACTIVE** — host/top document must not become the authority or mutation target of page-owned print preparation. Fresh physical proof shows a child body stylesheet can restyle unrelated top-selected content and change top paged-media geometry.
- **P0-004 ACTIVE** — final selected PDF fidelity is affected when structural selector context or CSS dependency context is lost.
- **P1-003 ACTIVE** — cloned `<link rel=stylesheet>` can resolve/request a different top-document resource after adoption, outside the earlier resource graph.
- **P1-167 ACTIVE** — any eventual stylesheet/reference materialization must be bounded; this evidence does not authorize copying arbitrary full child stylesheets.

`@font-face` document-scope is **not** a fresh finding here. It was already preserved by PR #42 / `RESEARCH_TYPOGRAPHY_LAYOUT_FIDELITY_*` and is explicitly deduplicated.

## Block 1 — previous interrupted branch is superseded, not resumed blindly

The previous session created `research/flattened-css-name-context-2026-08-30` at `36369597...` but made no durable commit. Before this session, `main` advanced through docs-only PR #42 to `4d26fb5b...`.

PR #42 already preserves the earlier ephemeral `@font-face` observation, including document-local FontFaceSet provenance, physical fallback, changed line metrics/pagination and a causal top-registration repair control. The old empty branch is therefore not a valid source of new evidence and is not rebased or merged.

This tranche starts from fresh `4d26fb5b...` and deliberately excludes duplicate font-face claims.

## Block 2 — current flattening boundary copies all body child nodes, then connects them to the top document

Fresh source keeps a fixed `FLATTENED_FRAME_STYLE_PROPERTIES` allowlist. It includes `font-family` and `list-style-type`, but is not a stylesheet or named-rule representation.

The same-origin body proxy deep-clones body child nodes, removes scripts and Exclude subtrees, copies the bounded computed-property allowlist, then appends the proxy to the **top document body** and hides the original iframe.

There is no current pre-connection neutralization of `<style>` or `<link rel=stylesheet>` nodes. Therefore a style node that was merely a child-document stylesheet can become an active top-document stylesheet at connection time.

Preparation ordering remains material: the WebClip print style exists before same-origin body flattening, so a later connected child stylesheet can participate later in the author cascade and paged-media rule set.

## Block 3 — simple body stylesheet is a positive control

Child body:

```html
<style>.chart { fill: #ff0000 }</style>
<svg><rect class="chart" ...></rect></svg>
```

Production-shaped flatten retained the `<style>` (`styleCount=1`).

Physical direct and proxy rasters both contained about `94,500` red pixels and the pixel diff was zero.

Therefore the finding is **not** "body stylesheets are always lost". A stylesheet whose selector remains meaningful in the top document can preserve its own cloned content.

## Block 4 — source `body > child` structural selector loses its document context

Child rule:

```css
body > .chart { fill: #ff0000 }
```

Source computed fill was red. After flatten, `.chart` is no longer a direct child of BODY; it is a child of the generated SECTION proxy.

Fresh physical result:

- direct PDF: about `94,500` red pixels;
- proxy PDF: `0` red, about `94,500` black pixels.

The stylesheet survived but its source structural meaning did not.

## Block 5 — `html > body > child` loses the same source structure

`html > body > .chart { fill:red }` was red in the child document and black in the flattened proxy. Direct/proxy raster counts again changed from about `94,500` red to about `94,500` black pixels.

This reinforces that copying a live stylesheet is not equivalent to preserving the document tree in which its selectors were authored.

## Block 6 — descendant selector is a positive boundary

`body .chart { fill:red }` remained red after flatten because the generated proxy remains inside the top BODY and the selector still matches.

This prevents overgeneralizing Blocks 4–5 to every rule mentioning BODY.

## Block 7 — body class happens to be copied and can preserve class-dependent CSS

With source `<body class="theme">` and `.theme .chart { fill:red }`, current proxy copies the body class onto the SECTION. Direct and proxy physical output remained red.

This is another useful positive control: some source body selector context is deliberately projected into the proxy.

## Block 8 — source body id is not projected

Source `<body id="frameRoot">` plus:

```css
#frameRoot .chart { fill:red }
```

was red in the source. Proxy SECTION had no copied id; physical proxy output became black.

This is not permission to copy the raw body id unchanged because PR #41 / P0-068 already proves document-local identity collisions. A repair needs a representation-safe selector/reference strategy rather than reintroducing duplicate top-document ids.

## Block 9 — arbitrary body data attribute is also not projected

Source `<body data-theme="red">` plus `[data-theme="red"] .chart { fill:red }` became black after flatten because the generated SECTION did not retain that attribute.

A complete fix therefore cannot be described only as "copy body id"; selector context can depend on arbitrary attributes/classes/tree relations.

## Block 10 — child body stylesheet can mutate top-document custom-property state

Controlled top document initially set:

```css
body { --chart: #0000ff }
```

Child body contained:

```html
<style>body { --chart: #ff0000 }</style>
```

Before flatten, top BODY computed `--chart` was blue. After connecting the proxy, the cloned child `<style>` became active in the top document and top BODY computed `--chart` changed to `#ff0000`.

The proxy also inherited the same red variable. This is a direct cross-document stylesheet-authority leak caused by representation connection.

## Block 11 — cross-region leak changes physical top-selected pixels

A stronger fixture used unrelated top content:

```css
#top { width:220px; height:100px; background:#0000ff !important }
```

and child body stylesheet:

```css
#top { background:#ff0000 !important }
```

Before flatten, top computed background was `rgb(0,0,255)` and the PDF raster contained about `49,223` blue pixels, zero red.

After proxy connection, top computed background became `rgb(255,0,0)` and the physical PDF contained about `49,223` red pixels, zero blue.

Thus child-frame CSS introduced solely for the flattened print representation can alter an unrelated top-document region in the actual saved copy.

## Block 12 — child `@page` rule changes the physical MediaBox of the entire PDF

Top document control defined:

```css
@page { size: 8in 6in; margin:0 }
```

The selected child body contained:

```html
<style>@page { size:4in 4in; margin:0 }</style>
```

Before flatten, worker-equivalent PDF page MediaBox was `576 x 432 pt` (8×6 in).

After connecting the flattened proxy, the child style became part of the top document paged-media rule set. Physical PDF MediaBox changed to **`288 x 288 pt`** (4×4 in).

This is a byte-level saved-artifact geometry change, not merely a computed-style diagnostic difference.

It strongly refines P1-213/P0-075/P1-187/P0-004. Child page CSS must not gain authority over the whole top PDF merely because a selected iframe was flattened.

## Block 13 — head-owned named counter style can disappear or rebind

Two child documents independently defined in HEAD:

- `@counter-style SharedCounter` with symbol `A`;
- the same name with symbol `B`.

Their lists used `list-style-type:SharedCounter`.

Direct physical PDF text was:

`A ONE  A TWO  B ONE  B TWO`.

Because child HEAD is not cloned, the flattened representation retains only the computed name `SharedCounter`. In a top document that defines its own `SharedCounter` with symbol `T`, physical proxy PDF becomes:

`T ONE  T TWO  T ONE  T TWO`.

The same computed identifier now resolves against a different stylesheet environment.

This is analogous to, but distinct from, the already-deduplicated `@font-face` provenance case: here the user-visible list markers are generated by a named counter-style rule.

## Block 14 — body-owned named counter styles collide between independently valid frames

A second fixture placed each `@counter-style SharedCounter` rule in the corresponding child BODY `<style>`, so current clone **does** bring both definitions into the top document.

Direct PDF again contained the intended independent markers:

`A ONE  A TWO  B ONE  B TWO`.

After the first proxy, its list still computed `list-style-type: SharedCounter`. After the second proxy was connected, both live stylesheets shared one top-document namespace; the later `B` definition won.

Physical flattened PDF text became:

`B ONE  B TWO  B ONE  B TWO`.

Therefore the failure has two directions:

1. definitions that lived in child HEAD may be absent/rebound;
2. definitions cloned from child BODY may collide with definitions from another independent frame.

## Block 15 — relative body stylesheet rebases and creates a new request after adoption

Top document base: `https://top.test/top/`.

Child base: `https://frame.test/frame/`.

Child body contained `<link rel="stylesheet" href="theme.css">`.

Before flatten:

- link resolved to `https://frame.test/frame/theme.css`;
- only that frame URL had been requested.

After adoption/connection:

- cloned link resolved to `https://top.test/top/theme.css`;
- Chromium initiated a new request for the top-relative stylesheet.

In this exact control the tested background remained red because WebClip had already copied the resolved `background-color` inline with `!important`; therefore this block is classified only as **P1-003/P1-187 resource/provenance evidence**, not as a proven pixel regression.

This distinction is intentional: a new request is not automatically proof of a changed saved appearance.

## Block 16 — Exclude/style dependency, rejected controls and checkpoint acceptance

A child Exclude subtree can contain an active stylesheet dependency for a selected sibling. In the isolated SVG control, source fill was red because a stylesheet inside the excluded container applied to the selected chart. Current flatten copies computed allowlisted properties first, then removes the Exclude subtree; `fill` is outside the allowlist, so physical output changed from about `94,500` red pixels to about `94,500` black pixels.

This case is retained as a supporting P0-004/P1-187 dependency example, not a new owner; PR #42 already establishes broader SVG paint loss and earlier capture-dependency evidence owns selection-required presentation context.

Rejected/positive controls retained:

- simple body stylesheet: exact red-to-red physical positive control;
- descendant BODY selector: positive;
- copied body class selector: positive;
- an exploratory inline `symbols()` list-style control serialized as ordinary decimal markers in this Chromium build, so it is **not** used as a counter-style repair proof;
- relative stylesheet rebase is not promoted to a visual regression because the chosen copied property prevented the alternate stylesheet from changing pixels.

### Interim acceptance direction

A flattened iframe cannot be treated as "clone body children into the live top document and then copy some computed properties" while claiming faithful later-reading output.

At minimum, the representation needs a bounded **pre-connection CSS isolation/materialization contract**:

1. child stylesheet nodes cannot become unrestricted top-document author styles merely because they were cloned;
2. required source selector/named-rule semantics must either be materialized into a proxy-scoped inert representation or marked degraded;
3. document-local named definitions require per-representation identity/reference handling when retained;
4. paged-media rules from a frame must not silently override the global saved-PDF page contract;
5. stylesheet/resource URLs must preserve source provenance and participate in the final generation-bound resource graph;
6. any repair that scans/transforms CSS is subject to P1-167/P0-064 bounded-work/materialization limits.

This checkpoint makes no implementation claim and does not change canonical statuses.