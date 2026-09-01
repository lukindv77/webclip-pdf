# Durable research evidence — flattened-frame CSS named environment / isolation repair — Stage 2 — 2026-08-30

This file preserves **Blocks 17–32** of the fresh research whose Blocks 1–16 are in `RESEARCH_FLATTENED_CSS_NAMED_ENVIRONMENT_2026-08-30_EVIDENCE.md`.

Exact researched baseline remains `main = 4d26fb5b6481861d0f11f37e8c3c8746afb5b6ab`; production runtime is unchanged during this docs-only tranche. Managed Chromium is `144.0.7559.96`. Physical PDFs use worker-equivalent screen-media CDP printing.

Canonical status remains exclusively in `RESEARCH_REGISTRY.md`. No new P-code or status transition is made here.

## Block 17 — repair question: can an extension-owned ShadowRoot isolate the flattened CSS environment?

Blocks 1–16 show that connecting child `<style>` directly into the top document is simultaneously too weak for source structural semantics and too strong for top-document authority.

A useful repair primitive would need to satisfy both halves:

- child style/named rules can affect their own frozen representation where safe;
- those rules cannot restyle unrelated top content or global PDF page geometry.

An extension-owned shadow tree was therefore tested as an **engineering control only**, not as a proposed finished implementation.

## Block 18 — shadow tree blocks child global selector from restyling top content

Top document had a blue `#top` block. A shadow tree was attached to a separate host and contained:

```css
#top { background:#ff0000 !important }
```

plus its own `.own { color:red }` content.

Fresh result:

- top remained `rgb(0,0,255)`;
- shadow `.own` rendered `rgb(255,0,0)`;
- physical PDF text contained both `TOP` and `OWN_RED`.

This is a positive isolation control against the cross-region leak from Block 11.

## Block 19 — shadow-tree child `@page` does not override global PDF MediaBox

Top document retained `@page { size:8in 6in }`.

A shadow stylesheet contained `@page { size:4in 4in }`.

Physical PDF before and after adding the shadow representation remained `576 x 432 pt`.

This is a positive control against Block 12: a stylesheet inside the tested shadow tree did not acquire global paged-media authority.

## Block 20 — local ordinary style remains effective inside the shadow representation

The same shadow tree's `.own { color:red }` rule applied to its own content while the top remained blue.

Therefore the isolation control is not equivalent to deleting all CSS.

## Block 21 — same `@counter-style` name remains independent across two shadow trees

Two extension-owned shadow roots each defined a `SharedCounter`:

- shadow 1: symbol `A`;
- shadow 2: symbol `B`.

Each local OL used `list-style:SharedCounter`.

Physical PDF text was:

`A ONE  A TWO  B ONE  B TWO`.

The named counter environments remained independent in this Chromium control.

## Block 22 — top document counter-style with the same name does not override the two shadow-local definitions

The top document additionally defined `SharedCounter` as symbol `T`.

Physical shadow output still remained:

`A ONE  A TWO  B ONE  B TWO`.

This directly contrasts with current flattened top-document behavior from Block 13, where head-owned child `SharedCounter` values were rebound to top `T`.

## Block 23 — ShadowRoot isolation alone does not fix relative stylesheet provenance

A raw shadow `<link rel="stylesheet" href="theme.css">` in a top document with base `https://top.test/top/` requested:

`https://top.test/top/theme.css`.

Its content rendered using that top-relative stylesheet.

Therefore placing a cloned link inside a shadow tree does **not** preserve the source iframe's base URL.

## Block 24 — pre-absolutized frame stylesheet URL is a positive provenance control

When the same shadow link was set before connection to:

`https://frame.test/frame/theme.css`,

Chromium requested the exact frame URL and rendered the frame stylesheet's red content.

Required direction: provenance-sensitive resource attributes must be converted to exact admitted source identities before adoption/connection; CSS isolation and URL provenance are separate responsibilities.

## Block 25 — long shadow flow remains physically paginatable in this control

An extension-owned shadow tree contained 180 named paragraph items.

Worker-equivalent PDF result:

- 10 pages;
- `ITEM_001` present;
- `ITEM_180` present;
- all **180/180** named markers extracted.

Thus the tested shadow-flow primitive was not an atomic one-page clipping boundary. This is only a positive engineering control, not proof for every layout mode.

## Block 26 — body `@keyframes` names collide after current live-top flatten

Two source frames independently used the name `SharedAnim`:

- frame 1 keyframes fixed opacity to `0.2`;
- frame 2 keyframes fixed opacity to `0.8`.

Source computed opacities were `[0.2, 0.8]`.

Each body also contained the relevant style node, so current clone brought both keyframe definitions into one top document. After both proxies connected, computed opacity became `[0.8, 0.8]`: the later named animation definition won for both regions.

Physical raster supports the state change: direct output with one pale and one dark black region had dark-pixel average around `129`, while proxy output using the later 0.8 definition for both regions had average around `51` over the counted dark pixels.

This is another current-runtime CSS named-environment collision under P1-213/P1-187/P0-068.

## Block 27 — same keyframe name is isolated by separate shadow trees

Two shadow roots with the same `SharedAnim` name retained computed opacity `[0.2, 0.8]`.

This is a positive rule-class control: in the tested browser, keyframes can remain tree-local under shadow isolation.

## Block 28 — duplicate `@property` registration collides in the live top document

Two source frames independently registered the same custom property name:

```css
@property --tone { syntax:"<color>"; inherits:false; initial-value: ... }
```

Frame 1 initial value was red; frame 2 blue. SVG fill used `var(--tone)`.

Source computed fill was `[red, blue]`.

After current production-shaped flatten with both body styles active in one top document, proxy fills became `[blue, blue]`.

Physical PDF raster:

- direct: about `36,000` red + `36,000` blue pixels;
- proxy: `0` red + about `72,000` blue pixels.

Thus a CSS Properties & Values registration is another document-scoped named environment that can collapse across flattened frames.

## Block 29 — `@property` is a negative control for a simplistic ShadowRoot rule-copy repair

The same `@property --tone` rules were placed separately into two shadow stylesheets and used through `color:var(--tone)` without explicitly setting the property.

Fresh Chromium result was `[black, black]`, not red/blue.

Therefore the tested shadow-tree stylesheet did not provide the same registered initial-value semantics. ShadowRoot isolation is **not** a universal named-rule transfer mechanism.

This block prevents a premature architectural conclusion from Blocks 21/27.

## Block 30 — `document.adoptedStyleSheets` has no DOM node for `cloneNode(true)` to preserve

A child document used a constructed CSSStyleSheet assigned through `document.adoptedStyleSheets`. It defined `SharedCounter=A` and the list style.

Direct physical PDF text:

`A ONE  A TWO`.

The top document had `SharedCounter=T`. Current body cloning had no stylesheet node to copy. After flatten, physical proxy PDF became:

`T ONE  T TWO`.

Thus stylesheet fidelity cannot be reduced to `<style>/<link>` node handling. CSSOM/constructed stylesheet state is part of the renderer environment when it affects selected output.

This is a P1-187 refinement with P1-167 bounded CSS-state acquisition requirements.

## Block 31 — iframe viewport media-query environment changes after flatten

Source iframe viewport width was `360` CSS px. Body stylesheet contained:

```css
@media (max-width:500px) { .box { fill:red } }
@media (min-width:501px) { .box { fill:blue } }
```

Top viewport was `800` px.

Source computed fill: red.

After the same stylesheet was connected in the top-document proxy, the media query evaluated against the top viewport and proxy fill became blue.

Physical PDF raster:

- direct: about `36,000` red, `0` blue pixels;
- proxy: `0` red, about `36,000` blue pixels.

This is not a named-rule collision, but it is the same underlying error: a stylesheet is evaluated in a different owning-document environment than the one that produced the user's source pixels.

## Block 32 — moving arbitrary child CSS into ShadowRoot can activate previously meaningless `:host`

A child-document stylesheet containing:

```css
:host { display:none !important }
```

has no normal host element in an ordinary iframe document.

When the same stylesheet text was placed inside an extension-created shadow root, `:host` acquired new semantics and hid the shadow host; the tested document's visible text became empty.

Therefore a repair cannot blindly move arbitrary source stylesheet text into Shadow DOM either. It must account for selector/rule semantics that change when the stylesheet's tree context changes.

### Stage-2 architecture boundary

Fresh controls now distinguish at least these rule classes:

- ordinary selectors: shadow-scoped isolation can prevent top leakage, but source BODY/HTML/:root structure still needs materialization;
- `@page`: tested shadow copy does not leak global page authority;
- `@counter-style`: tested tree-local shadow definitions preserve independent names;
- `@keyframes`: tested tree-local shadow definitions preserve independent names;
- `@property`: tested shadow rule does **not** reproduce child registration semantics;
- constructed/adopted stylesheets: no DOM clone receipt exists;
- media queries: require source viewport/environment semantics, not merely selector scoping;
- resource links: require source-absolute provenance before connection.

A truthful repair must therefore be rule-class/environment aware, bounded, generation-bound and physically validated. No runtime change or canonical status transition is made by this checkpoint.