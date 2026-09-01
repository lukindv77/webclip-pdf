# Durable research evidence — flattened-frame live CSSOM / convergence — Stage 3 — 2026-08-30

This file preserves **Blocks 33–48**. Blocks 1–16 and 17–32 are in the preceding `RESEARCH_FLATTENED_CSS_NAMED_ENVIRONMENT*` evidence files.

Exact runtime baseline remains `4d26fb5b6481861d0f11f37e8c3c8746afb5b6ab`. Managed Chromium: `144.0.7559.96`. Physical PDF/raster evidence uses the current worker-equivalent screen-media CDP shape.

No runtime/status/version/build/tag/release change is made here.

## Block 33 — DOM stylesheet text is not the renderer's current stylesheet state

Current flatten uses `cloneNode(true)` on child body nodes. For a `<style>` node this copies DOM text/children, but browser CSSOM can have a different live rule set because the page may have mutated `style.sheet` after parsing.

For later-reading fidelity, the relevant input is the renderer's **current stylesheet state**, not merely the original text node.

## Block 34 — `deleteRule + insertRule` current blue state reverts to stale red text in the proxy

Source DOM contained:

```html
<style id="s">.chart{fill:#ff0000}</style>
```

Page code then executed CSSOM mutation equivalent to:

- delete rule 0;
- insert `.chart { fill:#0000ff }`.

Immediately before capture:

- `style.textContent` still said red;
- live `style.sheet.cssRules` said blue;
- source computed SVG fill was blue.

Physical direct PDF contained about `36,000` blue pixels, zero red.

`cloneNode(true)` copied the stale red DOM text. The connected proxy stylesheet contained the red rule and proxy fill became red.

Physical proxy PDF contained about `36,000` red pixels, zero blue.

This is a direct current-renderer-state loss under P1-187 and an active-stylesheet representation problem under P1-213.

## Block 35 — CSSOM `deleteRule` can resurrect a rule the user no longer sees

The same source `<style>` began red, but runtime CSSOM deleted its only rule.

Before capture:

- source CSSOM rule list was empty;
- source fill was browser-default black;
- direct PDF contained about `36,000` black pixels.

DOM text still contained the original red rule. The clone reconstructed that text as a new stylesheet, so the proxy became red.

Physical proxy PDF contained about `36,000` red pixels.

The flattened copy can therefore resurrect obsolete presentation that is still present in source text but absent from the current renderer stylesheet.

## Block 36 — runtime `sheet.disabled` is not preserved and disabled CSS becomes active again

Source style contained `.chart{fill:red}`. Runtime set:

```js
style.sheet.disabled = true
```

Fresh source state:

- `sheet.disabled === true`;
- no reflected `disabled` attribute;
- computed fill black;
- direct PDF about `36,000` black pixels.

After cloning/connection:

- cloned `sheet.disabled === false`;
- computed fill red;
- proxy PDF about `36,000` red pixels.

Thus current stylesheet enable/disable state is another renderer-owned property that the DOM clone does not preserve.

## Block 37 — acceptance must snapshot stylesheet state, not just nodes

Blocks 34–36 show three independent representations of the same `<style>` node can diverge:

1. DOM text;
2. live CSSOM rule list;
3. stylesheet enabled/disabled state.

A faithful capture cannot assert that cloning the element reproduces the state the user saw.

Any CSS materialization strategy must be based on the exact capture generation and must account for live CSSOM state where it is readable; unreadable/unsupported state needs an explicit degraded path.

## Block 38 — later proxy insertion retroactively changes an earlier already-materialized proxy

Two independent frames used body styles with the same `@counter-style Shared`:

- frame 1 = symbol `A`;
- frame 2 = symbol `B`.

Direct PDF: `A ONE  B TWO`.

Flattening frame 1 first produced a representation in which its marker remained `A`.

Connecting frame 2 added a later top-document definition. Without touching proxy 1's DOM, proxy 1's marker changed to `B`.

After both proxies, physical text was `B ONE  B TWO`.

Therefore "proxy 1 has been created" is not a frozen-render receipt. Its visual meaning can still change when another frame is materialized later.

## Block 39 — reversing flatten order reverses the winner

The same two source frames were flattened in reverse order.

Direct source remained `A ONE  B TWO`.

When frame 2 was connected first and frame 1 second, final physical proxy output became `A TWO  A ONE` (layout order reflects the appended proxy order, and both markers use the final `A` definition).

Thus final named-rule resolution depends on WebClip materialization order, not only on source frame state.

## Block 40 — output can differ solely because proxy traversal/order differs

Blocks 38–39 establish a deterministic sensitivity:

- source frame definitions are independently valid;
- changing only which proxy stylesheet is connected last changes which counter definition both regions use.

Any future parallelism/reordered frame traversal must not be allowed to silently alter the saved artifact. Required representation identity must be independent of incidental materialization order.

This supports P0-070 exact-generation output truth in addition to P1-213/P1-187.

## Block 41 — paged-media authority changes after each later proxy

Top document started with `@page { size:8in 6in }`.

Frame 1 body stylesheet supplied `@page { size:4in 4in }`.
Frame 2 body stylesheet supplied `@page { size:5in 3in }`.

Physical MediaBox sequence:

- before flatten: `576 x 432 pt` (8×6 in);
- after proxy 1: `288 x 288 pt` (4×4 in);
- after proxy 2: `360 x 216 pt` (5×3 in).

The whole artifact's geometry follows whichever later child paged-media rule currently participates in the top document.

## Block 42 — frame preparation is therefore not monotonic

A successful earlier frame materialization does not produce a stable partial artifact:

- later frame CSS can alter earlier proxy markers/animation/property registrations;
- later frame `@page` can alter global page geometry.

Acceptance needs one isolated/frozen representation graph whose parts do not gain new semantic dependencies on subsequently connected page-owned stylesheets.

## Block 43 — rebased cloned stylesheet creates a new delayed post-connection resource

A child body link started under frame base:

`https://frame.test/frame/theme.css`

and source physical fill was red.

On top-document adoption, the same raw `href="theme.css"` resolved as:

`https://top.test/top/theme.css`.

The new top stylesheet response was intentionally delayed by about 2 seconds.

Immediately after proxy connection:

- proxy computed fill was black (no applicable stylesheet yet);
- a new top-relative stylesheet request was in flight.

## Block 44 — `Page.printToPDF` does not wait for that new stylesheet settlement

Fresh timing:

- direct print: ~8 ms;
- immediate post-flatten print: ~9 ms;
- settled print: ~8 ms.

Physical rasters:

- source/direct: about `36,000` red pixels;
- immediate post-flatten PDF: about `36,000` black pixels;
- after delayed stylesheet settlement: about `36,000` blue pixels.

The immediate valid PDF therefore represented neither the original frame stylesheet nor the eventual top-rebased stylesheet.

This is strong P1-003 + P1-187 evidence: proxy connection created a new required stylesheet dependency after the earlier source resource state, and `Page.printToPDF` completion was not a convergence barrier.

## Block 45 — CSS resource readiness must bind to the final isolated representation

The correct readiness question is not "was the child stylesheet loaded?" and not "did a URL prefetch list finish?".

It is:

> Has the exact stylesheet/resource environment of the **final representation that will be printed** converged under its source-provenance and isolation rules?

If materialization changes base URL, stylesheet owner, rule scope or CSSOM state after prefetch, earlier readiness cannot be reused as proof.

This is a concrete refinement of P1-003's final renderer visual-resource graph requirement.

## Block 46 — renderer-used cross-origin stylesheet can be CSSOM-opaque

A child linked an external stylesheet at `https://cdn.test/theme.css` without CORS exposure.

Fresh browser result:

- stylesheet loaded and applied;
- source SVG fill was red;
- querying `link.sheet.cssRules` raised `SecurityError`.

Therefore a repair based on enumerating/re-writing all active CSS rules cannot cover every stylesheet that the renderer can use.

## Block 47 — opaque CSS makes full semantic rewrite an architecture boundary

For CSSOM-opaque external stylesheets, WebClip may still know the stylesheet URL and can preserve exact resource provenance, but cannot necessarily inspect/rewrite arbitrary selectors, `@page`, named rules or nested conditional rules in content-script JavaScript.

A truthful implementation therefore needs one of:

- a browser-isolated representation that can reuse the stylesheet without giving it unintended top authority;
- a static/materialized representation sufficient for the requested output mode;
- or an explicit degraded/unknown result when faithful transformation cannot be proven.

It cannot silently claim an exact semantic CSS rewrite that the platform does not permit it to inspect.

## Block 48 — stage-3 reconciliation / diagnostics boundary

No new P-code is allocated.

Current owner map remains:

- P1-213 / P0-068 — inert pre-connection representation and document/global side-effect isolation;
- P1-187 — exact rendered-state/CSS-environment fidelity;
- P0-075 — page/top-document stylesheet authority must not control the extension's frozen print representation;
- P1-003 — final representation resource convergence;
- P0-070 — exact full-document generation and stable final representation;
- P0-004 — selected visual completeness;
- P1-167 / P0-064 — bounded CSS/state/materialization work.

Current flattened diagnostics report structural counts such as clone/styled elements, scripts/excludes and style-budget truncation. They do not prove:

- live CSSOM rule equality;
- stylesheet disabled-state equality;
- page-rule isolation;
- named-rule collision freedom;
- source viewport/media environment equivalence;
- adopted stylesheet coverage;
- opaque stylesheet transformability;
- or final stylesheet/resource convergence after all proxies are connected.

These missing receipts are acceptance/truth gaps under the existing owners, not a new permanent issue number.