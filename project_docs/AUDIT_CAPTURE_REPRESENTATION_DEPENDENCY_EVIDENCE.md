# Durable audit evidence — capture representation dependency closure

Canonical status and single-owner authority remain exclusively in `AUDIT_REGISTRY.md`. This document preserves source proof, managed-Chromium reproductions, negative/positive controls, dedup decisions and external architecture comparison from the 2026-08-29 capture-representation deep-audit tranche.

Audited fresh source baseline: `main` at `26154e2a02a94b115d6e31e7593a2a3720834dab`.

Managed browser probes used Chromium `144.0.7559.96`. They are engineering evidence, not a substitute for real unpacked-Chrome, optional-host-permission/cross-origin or Yandex E2E release acceptance.

## Executive classification

This tranche completed **34 focused blocks** and does **not** justify a new P-number.

- **P0-004 remains ACTIVE.** Fresh proof shows that faithful selected-PDF rendering depends not only on retained ancestors. A selected region can depend on unselected siblings, anchors, counters, stacking/compositing/backdrop context and containing-block geometry. Removing those dependencies can collapse, move, renumber or repaint the selected content even when the selected DOM node itself remains.
- **P0-075 remains ACTIVE.** WebClip helper DOM and page-visible selection/print markers form a page-CSS capability as well as a page-script capability. Host CSS can react to the predictable WebClip root/header/attributes and alter or hide the content WebClip later claims to capture.
- **P1-187 remains ACTIVE.** The same-origin flattened iframe proxy loses a broad class of frame-local layout/style/generated/top-layer/browser-owned state and resource provenance. Hard style budgets can silently replace the tail with browser defaults. This is one secondary-representation root cause, not separate owners per CSS property.
- **P1-003 remains ACTIVE** from prior proven resource-readiness cases. Three new `mask-image` / `list-style-image` / `shape-outside` delayed-resource probes did not produce a valid new regression in this environment and are retained as controls rather than promoted.
- **P2-007 remains BACKLOG** as the architecture owner for a composed format-neutral capture representation and explicit current-view/static-expanded/reader/output mode semantics. No new P2 is needed.

The owner wording for P0-004 and P1-187 is refined in the same audit delivery. Their statuses do not change.

## Source boundary

Fresh `content.js` confirms the current capture boundary:

- WebClip inserts predictable helper elements into the live page: `#webclip-pdf-extension-root` is appended under `document.documentElement`; `#webclip-pdf-header` is inserted for print; selected/excluded host elements receive predictable `data-webclip-pdf-*` attributes.
- The WebClip UI root is an **open** Shadow DOM hosted inside the page document. Existing P0-075 evidence already owns host-readability/synthetic-control consequences.
- selected-only print is built on the live host DOM. Ordinary non-selected nodes are hidden through an author-origin `display:none !important` rule while ancestors/relevant frame nodes remain live.
- the same-origin frame proxy creates a top-document `<section>`, deep-clones the child body subtree with `cloneNode(true)`, then copies only `FLATTENED_FRAME_STYLE_PROPERTIES` for at most `FLATTENED_FRAME_MAX_STYLED_ELEMENTS = 2500` elements.
- the current flattened style allowlist intentionally covers a small subset of box/text/background/table properties. It does not represent many layout, transform, writing, generated, paint, SVG, fragmentation or top-layer semantics.
- fixed/sticky/absolute descendants in the proxy are intentionally converted to static flow.
- URL-state copying is tag-specific rather than a general frame-local resource-provenance model.

These facts make two distinct representation risks explicit: (1) live-DOM filtering changes the renderer dependency graph; (2) iframe secondary representation reconstructs an incomplete renderer state.

## Blocks 1–10 — selected rendering dependency closure (P0-004)

### Block 1 — percentage absolute child can collapse when an unselected sibling defined the containing block

Fixture:

- structural wrapper: `position:relative; display:inline-block`;
- unselected sibling gives the shrink-to-fit wrapper a 700 px width;
- selected child uses `position:absolute; left:10%; width:50%`.

Before selected-only filtering:

- wrapper width ≈ **700 px**;
- selected child x ≈ **70 px**, width ≈ **350 px**.

After WebClip-equivalent `display:none` on the unselected sibling:

- wrapper width became **0**;
- selected child became effectively **0×0**.

The missing sibling is not selected output content, yet it is a geometric dependency of the selected presentation. This materially extends P0-004 beyond ancestor clipping.

### Block 2 — CSS Anchor Positioning can depend on an unselected anchor

Chromium supports CSS Anchor Positioning in the tested build. A selected anchored target rendered around `(480, 230)` while its anchor element was not selected. After WebClip-equivalent hiding of the anchor, the selected target moved to approximately `(0, 0)`.

Required acceptance is not “include every unselected anchor as content”. The capture representation needs a bounded inert encoding of geometry/reference dependency, or an explicit truthful degradation when it cannot preserve it.

### Block 3 — default list numbering is selection-context dependent

Full page PDF text contained:

`1. ALPHA`, `2. BETA`, `3. GAMMA`.

With only the third list item retained by selected-only filtering, the output became `1. GAMMA`.

This is the ordinary-list counterpart of the previously proven CSS-counter issue. The selected text survives while its user-visible ordinal semantics change.

### Block 4 — `:nth-child()` is a negative control

Hiding earlier siblings with `display:none` does not remove them from the DOM tree. A selected third child that was styled through `:nth-child(3)` retained the tested style. Therefore the dependency problem is not “every structural selector breaks”.

### Block 5 — adjacent-sibling selector is a negative control

A target styled by `.trigger + .target` retained the selector-derived style after the trigger was hidden rather than removed. Again, the material defects arise from renderer/layout/paint dependencies, not every DOM relationship.

### Block 6 — inherited CSS custom property is a positive control

A selected descendant inheriting a color through an ancestor custom property retained the resolved value when ordinary unselected siblings were hidden. Ancestors kept alive by the selected-only rule can preserve some inheritance correctly.

### Block 7 — modal dialog backdrop is retained ancestor/top-layer presentation

A selected child inside an open modal dialog retained the tested backdrop pixel when the dialog ancestor remained structurally present. This is useful both as a positive top-layer control and as a reminder that retained structural ancestors can contribute presentation not explicitly selected. P0-004 remains complete **and** selection-bounded.

### Block 8 — SVG hidden-defs clip fixture rejected as invalid evidence

An exploratory clip-path fixture rendered the source itself fully clipped, so a post-filter visual difference could not establish a WebClip regression. The result is explicitly rejected rather than promoted.

### Block 9 — SVG filter hidden-defs control did not reproduce loss

The tested SVG filter referenced from a retained selected SVG remained visually equivalent after surrounding filtering. No generic “hidden defs always break” finding is registered.

### Block 10 — same-document SVG `<use>` hidden-defs control did not reproduce loss

A tested internal SVG symbol/use remained equivalent after the selected-only filtering schedule. Prior top-document SVG positive controls remain valid.

## Blocks 11–14 — helper DOM / host CSS is a capture capability (P0-075)

### Block 11 — page CSS can react to WebClip root insertion via `:has()`

Page CSS used a relation equivalent to:

`html:has(#webclip-pdf-extension-root) #article { ... }`

Before a WebClip-like root was appended, the article began around x=20 px and used the baseline color. After inserting the root exactly under `document.documentElement`, the article moved to approximately **x=420 px** and changed color.

No page JavaScript was required. Merely starting WebClip can change the admitted presentation through host-authored CSS.

### Block 12 — host CSS can hide the WebClip UI root

A page rule `#webclip-pdf-extension-root { display:none !important }` overrode the current root's ordinary inline `display` semantics. Computed display became `none`.

This complements existing P0-075 script/synthetic-control evidence: page CSS can also disable or reshape the trusted-looking WebClip surface.

### Block 13 — page CSS can react to the selection marker itself

A page rule `[data-webclip-pdf-include] { display:none !important }` caused a visible article to become `display:none` as soon as the WebClip include marker was added.

Therefore “selecting X” can itself mutate X's appearance before capture because the marker is placed in the hostile author-CSS namespace.

### Block 14 — page CSS can react to the print header and alter the saved content

A page rule equivalent to `body:has(#webclip-pdf-header) #article { opacity:0 }` changed the selected article opacity from 1 to **0** when the predictable WebClip header was inserted.

This schedule reaches the actual print preparation boundary: helper DOM can alter the page after selection and before `Page.printToPDF`, even without hostile script or `beforeprint`.

P0-075 acceptance therefore includes CSS isolation / non-observable representation mechanics, not only JavaScript confidentiality and synthetic-event admission.

## Blocks 15–24 — flattened iframe style/layout/browser-state loss (P1-187)

### Block 15 — transform and basic width/height semantics are lost

A frame-local element had a transform matrix including scale/translation and a 100×50 CSS box. Source rendered rectangle was approximately `[88, 8, 140, 70]`.

The production-like proxy lost `transform`/`transform-origin`, and because ordinary `width`/`height` are not part of the current flattened style allowlist, the proxy expanded toward the top-document width and auto height (roughly `[0, 154, 1000, 18]` in the fixture).

This is stronger than a transform-only defect: the proxy does not preserve even general explicit CSS box dimensions for arbitrary cloned descendants.

### Block 16 — `zoom` + `aspect-ratio` can collapse the proxy box

Source state:

- zoom 1.5;
- aspect ratio 2/1;
- visible rectangle about **180×90**.

Proxy state:

- zoom 1;
- aspect ratio auto;
- observed rectangle about **1000×0**.

### Block 17 — text shadow/stroke state is lost

Source used a visible text shadow and non-zero `-webkit-text-stroke`. Proxy computed state reverted to no shadow and zero stroke.

### Block 18 — advanced background semantics are lost

Source used non-default `background-clip`, `background-origin` and `background-blend-mode`. Proxy reverted to browser defaults such as border-box/padding-box/normal blending.

### Block 19 — CSS multi-column semantics are lost inside the proxy

Source used two columns and a 40 px gap; source height was about 714 px. Proxy reverted to `column-count:auto` / normal gap and a materially different height around 315 px.

This does not contradict prior top-document multicolumn positive controls. Direct Chromium can render columns; WebClip's secondary representation discards their state.

### Block 20 — text-layout controls are lost

Source used non-default `hyphens`, `word-spacing`, `tab-size` and text wrapping/balance semantics. Proxy reverted toward browser defaults and source/proxy height differed materially (about 92 px versus 23 px in the fixture).

### Block 21 — font-feature and kerning state is lost

Source disabled ligatures/kerning through CSS feature properties. Proxy reverted to normal/auto state. This can change glyph shaping, line length and pagination even when font-family/font-size are copied.

### Block 22 — CSS-styled SVG paint is lost

A frame stylesheet set SVG `fill`, `stroke` and `stroke-width` through a class. Source rendered the intended green-ish fill/red-ish stroke. The proxy reverted to black fill, no stroke and default stroke width.

This is an important boundary control because direct top-document SVG printing has already passed representative tests: PDF/SVG capability exists; the proxy loses frame-local presentation.

### Block 23 — fragmentation state is lost

Source used non-default `break-before`, `break-inside`, `orphans` and `widows`. Proxy reverted to auto/default values. These properties directly affect PDF pagination and cannot be dismissed as purely cosmetic.

### Block 24 — bidi override state is lost

Source used RTL plus `unicode-bidi:bidi-override`; proxy reverted toward LTR/isolate defaults. Prior direct RTL positive controls show this is a proxy representation gap rather than generic Chromium print inability.

## Blocks 25–29 — browser-owned / top-layer clone-state boundary (P1-187)

### Block 25 — textarea runtime value is a positive control

In the tested Chromium version, `cloneNode(true)` preserved a runtime-mutated textarea `.value`. Do not generalize the proxy defect into “all form runtime state is lost”.

### Block 26 — checkbox `indeterminate` is a positive control

A runtime `indeterminate=true` state survived cloning in the tested build.

### Block 27 — `<details open>` is a positive control

A runtime-open native `<details>` retained its `open` state in the clone.

### Block 28 — popover top-layer state is not cloned

An open popover had `:popover-open == true` and was displayed in the source. Its clone had `:popover-open == false` and ordinary hidden display semantics.

The visible state is browser-owned presentation state, not recoverable merely from the static `popover` attribute.

### Block 29 — modal dialog top-layer semantics are not cloned

A dialog opened with `showModal()` retained `open=true` in the clone, but the clone no longer matched `:modal` and no longer occupied modal top-layer semantics.

Static property copying is therefore insufficient for top-layer fidelity. The eventual static representation should materialize the *visible admitted result* inertly; it must not attempt to recreate dangerous live modality/interaction in an archival output.

## Blocks 30–32 — resource-readiness controls, no new finding

Three delayed-resource controls were run for additional P1-003 hypotheses:

- `mask-image`;
- `list-style-image`;
- `shape-outside:url(...)`.

In this managed environment the immediate and post-settlement PDF rasters did not produce a material difference, and the shape-outside text geometry control did not demonstrate delayed reflow. These cases are therefore **not registered as fresh P1-003 regressions**. P1-003 remains ACTIVE from already proven pseudo/background/border-image/clip-path/frame-resource cases.

This protects the audit from turning every theoretically unscanned CSS URL into a defect without a valid reproduction.

## Blocks 33–34 — browser snapshot boundary / architecture controls (P2-007)

### Block 33 — MHTML serializes some DOM state but not an explicit popover-open state

An exploratory CDP snapshot fixture compared closed/open top-layer controls:

- `dialog.showModal()` led MHTML to serialize the dialog `open` state;
- opening a popover did not create an equivalent explicit serialized “popover-open” marker in the tested MHTML markup.

This is consistent with the existing architecture conclusion: static DOM serialization can carry some state but is not a complete representation of browser-owned presentation.

A later snapshot operation affected the observed live popover state in the exploratory fixture, so no stronger claim about DOMSnapshot/popover behavior is made from this schedule.

### Block 34 — DOMSnapshot exposes useful dependency inputs but is not a complete canonical copy

Current CDP documentation for `DOMSnapshot.captureSnapshot` provides:

- flattened document tree including iframes/template/imported documents and flattened Shadow DOM;
- whitelisted computed style values;
- layout tree and optional DOM rects;
- optional global paint order / stacking-context information;
- optional blended background colors and text opacity;
- per-document `baseURL`, `frameId`, scroll offsets and content dimensions.

These are directly relevant to the defects above: layout dependency closure, frame-local base provenance, stacking/compositing and geometry. But previous WebClip evidence already shows DOMSnapshot alone does not provide every renderer-owned bitmap/media/archive resource. It is therefore a candidate **input** to P2-007's composed capture layer, not a replacement for that architecture.

Primary reference: https://chromedevtools.github.io/devtools-protocol/tot/DOMSnapshot/

## External capture-engine comparison

External work is used only as hypothesis/architecture evidence.

### snapDOM

Current 2026 snapDOM changelog/features show the same engineering classes recurring in an independent capture engine:

- read iframe fonts from the capture element's `ownerDocument`;
- preserve/repair iframe capture realm and pseudo handling;
- freeze the image the browser actually shows rather than trusting static source attributes;
- disable animations on clones;
- prefetch mask/border-image resources;
- preserve a WebGL frame before canvas serialization;
- avoid mutating live source DOM during capture;
- isolate capture session maps/state;
- preserve form/canvas/video/Shadow DOM/same-origin iframe state;
- reconcile clone geometry against measured live layout where necessary.

References:
- https://github.com/zumerlab/snapdom/blob/main/CHANGELOG.md
- https://github.com/zumerlab/snapdom/blob/main/FEATURES.md

Transferable lesson: the failure mode is not solved by “copy more arbitrary CSS properties forever”. A robust capture layer needs a bounded representation of renderer state, exact source/clone/document identity and truthful degradation when the requested fidelity exceeds the admitted budget.

## Root-cause / duplicate decision

### P0-004

No new P-code for containing-block sibling loss, list renumbering or CSS anchors. They share the existing selected-copy fidelity root cause. The owner wording is refined so a future implementation does not repair only ancestors while leaving sibling/reference/anchor/compositing dependencies unresolved.

Required acceptance now explicitly includes:

1. hiding/removing unselected nodes cannot collapse or relocate selected content merely because those nodes supplied containing-block/intrinsic/anchor/reference geometry;
2. counters/list numbering needed for selected semantics are preserved or intentionally transformed under the chosen mode;
3. stacking/compositing/backdrop dependencies needed for the admitted selected appearance are inertly represented without leaking unrelated unselected content;
4. necessary dependencies are distinguished from saved user content: structural/paint context may be represented without becoming selectable/output content itself;
5. if a dependency cannot be preserved within the capture budget/mode, the saved result carries truthful degradation instead of silently claiming exact fidelity.

### P0-075

No new owner for page CSS reactions to WebClip helper DOM. Host CSS and host script are both parts of the untrusted page control plane. Acceptance should ensure capture-authority/helper mechanics do not create host-observable selectors/markers capable of changing the admitted state, or the representation is isolated before such changes can define the saved copy.

### P1-187

No new P-code per CSS/layout/top-layer property. The single root cause is incomplete reconstruction of the frame-local admitted renderer state in a secondary top-document tree.

Required acceptance now explicitly includes:

1. preserve layout/geometry/style properties actually required for the admitted frame appearance, not a tiny fixed allowlist that silently falls back to browser defaults;
2. preserve or inertly materialize generated/SVG/top-layer/control/canvas/video/browser-owned visible state where the selected mode requires it;
3. preserve exact frame/document/base/resource provenance for URL-bearing presentation;
4. preserve current selected-mode static-materialization semantics consistently across top document and frame boundaries;
5. budget exhaustion is explicit degraded/alternative-representation truth; a fully cloned tail with default styles is not acceptable as a faithful success;
6. compose with P0-064 preflight allocation and P0-068/P1-213 inertness rather than solving fidelity by executing live cloned page behavior.

### P2-007

No new P2. The existing format-neutral architecture policy already states the correct long-term boundary:

`selection + exact source/document/frame generation + admitted visible/interactable state`

→ bounded, inert, provenance-carrying captured representation

→ explicit PDF / Reader / HTML / future serializers.

This tranche adds concrete representation requirements but not a second architecture owner.

## Release / test boundary

No production runtime, manifest, version, build, tag or release is changed by this audit evidence. Managed Chromium semantic probes do not replace:

- real unpacked Chrome selection/print QA;
- real optional host-permission/revoke/regrant/cross-origin frame QA;
- actual debugger/Page.printToPDF release regression on representative sites;
- real Yandex OAuth/API E2E.

No release-readiness claim follows from this audit-only tranche.
