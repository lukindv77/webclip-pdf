# Durable research evidence — selected-only CSS cascade authority — 2026-08-30

Canonical status and single-owner authority remain exclusively in `RESEARCH_REGISTRY.md`. This document preserves a **28-block** source-first / managed-Chromium research tranche focused on whether page-owned CSS can defeat WebClip's live-DOM selected-only Include/Exclude filtering during physical PDF generation.

Researched fresh source baseline: `main` at `fd852e63ef34c4600285667928dee17cefcdb83d` (P1-229 research already merged; runtime unchanged).

Managed Chromium: `144.0.7559.96`. PDF probes used deterministic local DOM fixtures, production-like WebClip selectors, CDP screen-media emulation and `Page.printToPDF`. They are engineering evidence, not real unpacked-extension release QA.

## Executive classification

**No new permanent P-code and no status transition are justified. P1-230 is deliberately not allocated.**

- **P0-075 ACTIVE — primary trust-boundary refinement.** Existing capture-representation evidence already establishes that selected-only printing is built on the hostile live page and that ordinary unselected nodes are hidden through an author-origin `display:none !important` rule. It also establishes host CSS as a capture capability and recommends an isolated/frozen print representation. Fresh Chromium proof closes the missing mechanism: page-owned author cascade can directly defeat WebClip's hide rule with inline/high-specificity/layered `!important`, causing unselected or explicitly Excluded content to enter immutable PDF bytes.
- **P0-004 ACTIVE — supporting fidelity refinement.** Selection-bounded PDF output cannot depend on WebClip winning a contest inside the page's own author cascade. A static page stylesheet is sufficient to enlarge physical scope and pagination.
- **P1-003 ACTIVE — supporting resource-graph refinement.** Resource preparation starts from selected scope; if page cascade makes an unselected subtree physically render, the actual PDF resource graph can exceed the graph WebClip prepared/reported.
- **P1-229 ACTIVE — acceptance refinement/correction.** The preceding media/geometry research proved that a media-independent child filter fixes the `screen`/`print` mismatch in a neutral fixture. This tranche explicitly narrows that positive control: an ordinary author stylesheet is not by itself a complete P1-229 fix because page `!important` cascade can still override the selected-only rule. “WebClip-owned” must mean effective representation authority, not merely a `<style>` element inserted by WebClip into page author origin.

No runtime, `manifest.json`, version, build, tag or GitHub Release is changed by this evidence.

## Source boundary

Top/same-origin `content.js::installPrintStylesForSelectionDocuments()` appends a normal `<style>` into the live document. Its core production rule is equivalent to:

```css
body *:not(...Include/ancestor/frame exceptions...) {
  display: none !important;
}
[data-webclip-pdf-exclude],
[data-webclip-pdf-exclude] * {
  display: none !important;
}
```

This is author-origin CSS in the same document as page-owned author CSS. Source order is only one cascade dimension; inline styles, specificity and cascade layers can outrank the WebClip declaration even when both use `!important`.

The already-registered P0-075 architecture explicitly prefers a bounded WebClip-owned frozen/isolated print representation rather than treating live page markers/styles as authoritative. This tranche adds direct physical-PDF proof for why that separation is required.

## Probe matrix

| Fixture | Computed `display` after WebClip-like rule | PDF result |
|---|---|---|
| plain unselected sibling | `none` | hidden |
| inline `display:block` (not important) | `none` | hidden |
| inline `display:block!important` | `block` | **unselected text printed** |
| inline `all:revert!important` | `block` | **unselected text printed** |
| high-specificity `#id{display:block}` (not important) | `none` | hidden |
| high-specificity `#id{display:block!important}` before WebClip style | `block` | **unselected text printed** |
| same high-specificity important rule after WebClip style | `block` | **unselected text printed** |
| lower-specificity class `!important` before WebClip | `none` | hidden |
| low-specificity `:where(#id)` important inside an earlier cascade layer | `block` | **unselected text printed** |
| Exclude node with inline `display:block!important` | `block` | **Excluded text printed** |
| `visibility:visible!important` only | `none` | hidden |
| display CSS animation | `none` | hidden |
| inline `display:contents!important` parent | `contents` | parent text did not leak in tested structure because descendants remained hidden |

A separate pagination fixture used selected content ~100px high plus an unselected 5000px tail:

- ordinary tail: **1 PDF page**, tail absent;
- tail with inline `display:block!important`: **6 PDF pages**, tail present.

A cross-origin-like positive/correction fixture then used the media-independent child filter proposed only as a media control in the P1-229 research. An unselected child and an Exclude carrying inline `display:block!important` both printed. Therefore “remove `@media print`” is insufficient as full P1-229 closure.

## Blocks 1–12 — direct author-cascade outcomes

### Block 1 — WebClip selected-only filtering is ordinary author-origin CSS — P0-075

The production top/same-origin print stylesheet is appended to the live page as a normal `<style>`. It does not occupy a privileged cascade origin outside the page's author CSS.

### Block 2 — plain unselected node is correctly hidden — positive control

With no competing page declaration, the WebClip-equivalent rule produced computed `display:none` and the PDF contained only selected text.

### Block 3 — ordinary inline `display:block` does not defeat WebClip important rule — positive control

A non-important inline declaration was correctly overridden by WebClip's `display:none!important`; unselected text stayed out of the PDF.

### Block 4 — inline `display:block!important` defeats selected-only filtering — P0-075/P0-004

The same unselected node with an inline important display declaration computed to `block` and appeared in the physical PDF beside selected text.

No JavaScript, mutation or timing race is required.

### Block 5 — inline `display:flex!important` is an equivalent leak class — P0-075/P0-004

A separate probe using inline important `display:flex` likewise kept the unselected node rendered and printed. The defect is not specific to the literal value `block`.

### Block 6 — inline `all:revert!important` can also restore page display — P0-075

An unselected node with inline `all:revert!important` computed to a visible block and entered the PDF. Page CSS need not mention WebClip attributes or know the exact hide selector.

### Block 7 — high-specificity non-important page CSS remains suppressed — positive control

`#u { display:block }` without `!important` did not beat WebClip's important declaration. The problem is a real cascade boundary, not arbitrary source order.

### Block 8 — high-specificity page `!important` wins even when declared before WebClip — P0-075/P0-004

`#u { display:block!important }` in a page stylesheet that existed before WebClip print preparation still won because specificity dominates source order among otherwise comparable important author declarations.

The unselected text appeared in PDF.

### Block 9 — moving the same hostile rule after WebClip also leaks — control

The same higher-specificity important rule inserted after the WebClip-equivalent style also printed the unselected node. The root contract cannot be repaired by simply “append WebClip style last”.

### Block 10 — lower-specificity class important rule can lose — positive control

A page `.u { display:block!important }` rule declared before WebClip did not beat the more specific production-like hide selector in the tested fixture. This prevents the overclaim that every page `!important` automatically wins.

### Block 11 — cascade-layer precedence can beat WebClip even with deliberately low selector specificity — P0-075

A page rule inside an earlier author layer using `:where(#u) { display:block!important }` (zero selector specificity contribution from `:where`) nevertheless produced `display:block` and printed the unselected text.

Important declarations reverse normal layer precedence; unlayered WebClip author CSS is not a universal authority merely because its selector is complex.

### Block 12 — Exclude is vulnerable to the same cascade boundary — P0-004/P0-075

An explicitly Excluded descendant carrying inline `display:block!important` appeared in the PDF. This is stronger than an unrelated-sibling leak because it directly reverses an explicit user exclusion.

## Blocks 13–18 — negative controls and research restraint

### Block 13 — `visibility:visible!important` alone does not bypass `display:none` — negative control

The node remained `display:none` and absent from PDF. Do not generalize the defect to every important visual property.

### Block 14 — ordinary CSS animation did not override the important hide — negative control

A long-running display animation fixture still computed `display:none` after WebClip-equivalent filtering and did not print the unselected text.

### Block 15 — discrete display transition candidate was rejected as a PDF defect

An exploratory discrete display transition retained computed `display:block` shortly after WebClip style insertion, showing an interesting cascade/transition state. However immediate `Page.printToPDF` did **not** include the unselected transition text in the tested output.

This schedule is retained as a rejected hypothesis rather than promoted.

### Block 16 — `display:contents!important` parent did not leak its tested text — negative control

The parent computed to `display:contents`, but its child remained independently matched by the WebClip hide selector and the tested text did not enter the PDF. A visible computed display on one ancestor is not sufficient proof of a physical leak.

### Block 17 — selection marker reaction and cascade override are related but distinct schedules

Older P0-075 evidence proves page CSS can react *because* WebClip adds predictable root/header/marker selectors. The new cascade override does not need such observation: a pre-existing generic `#u` or inline important declaration is enough.

Both schedules belong to the same trust root — the hostile page co-authors the live print CSS/render tree.

### Block 18 — no race/session/document generation is required — duplicate boundary

The fixture uses one static document, stable selection and one clean print. It does not depend on P0-080 SPA mutation, P1-199 print-generation ordering, P1-200 selection-session ordering or P1-224 stale rollback.

## Blocks 19–23 — physical scope, pagination and resource consequences

### Block 19 — 5000px unselected tail materially expands pagination — P0-004

With ordinary CSS the tail was hidden and the fixture printed as **1 page**. Adding inline `display:block!important` to the unselected 5000px tail made the PDF **6 pages** and printed the tail.

Selection-bounded fidelity therefore includes page-count/layout consequences, not only presence/absence of one text string.

### Block 20 — resource preparation can underdescribe physical output — P1-003

WebClip's resource preparation is intentionally selected-scope-oriented. Once an unselected subtree defeats the hide rule, its images/backgrounds/fonts can participate in the PDF without belonging to the graph WebClip intended to prepare/report.

The same representation parity requirement discovered for P1-229 remote media applies to top/same-origin cascade leaks.

### Block 21 — saved SelectionSnapshot can remain correct while bytes violate it — P0-004/P0-070 boundary

The locator/Include/Exclude metadata need not be corrupt. A correct snapshot can authorize selected A and exclude B while page cascade makes physical PDF contain B or unrelated C.

Thus metadata truth cannot substitute for a print-representation authority boundary.

### Block 22 — current post-print diagnostics are not a proof of cascade isolation

Computed/live diagnostics may describe marker counts and structure, but the acceptance requirement is that the exact representation rendered into immutable PDF bytes is selection-bounded. A page's successful cascade override must not be silently interpreted as WebClip selection success.

### Block 23 — local download and Yandex share the representation consequence

Both destinations render through the same prepared live page and Chromium PDF path before transport-specific persistence. A cascade leak is therefore not specific to local download or Yandex.

## Blocks 24–28 — P1-229 correction, dedup and closure contract

### Block 24 — media-independent child CSS is only a media positive control, not full P1-229 closure

The P1-229 research intentionally used a neutral fixture to prove that keeping worker media=`screen` while making WebClip child filtering media-independent resolves the screen-vs-print mismatch.

Fresh cross-origin-like control adds inline important page CSS: selected, unselected and Excluded text all print despite the media-independent filter.

Therefore the prior positive control remains valid for **media activation only** but must not be misread as a complete representation-security/fidelity design.

### Block 25 — “WebClip-owned” means effective authority, not DOM authorship — P1-229/P0-075

A `<style>` node created by extension code but inserted into the hostile page still participates in the page author cascade. Ownership of the DOM node is not ownership of the rendered result.

P1-229 closure must compose with P0-075: the effective selected-only child representation must not be overridable by ordinary page author CSS.

### Block 26 — no new P1-230: this is the already-owned live author-CSS trust root

Current `RESEARCH_CAPTURE_REPRESENTATION_DEPENDENCY_EVIDENCE.md` already states:

- selected-only print is built on the live host DOM;
- ordinary non-selected nodes are hidden through an author-origin `display:none !important` rule;
- host CSS is a capture capability;
- an isolated/frozen representation is the P0-075 direction.

The new Chromium proof supplies a missing concrete cascade schedule under that same root. A new number would duplicate P0-075/P0-004 rather than create an independent owner.

### Block 27 — implementation acceptance

Preferred closure remains a bounded inert/frozen WebClip-owned print representation whose selected scope is not co-authored by page CSS.

If an interim live-DOM strategy remains, it must at minimum:

1. not assume author `!important`/late source order gives WebClip final cascade authority;
2. account for inline important, high-specificity important and cascade-layer important declarations;
3. verify/fail truthfully when the effective rendered scope cannot be made selection-bounded;
4. apply Include and Exclude with the same authority model;
5. ensure resource preparation/diagnostics operate on the same effective rendered graph;
6. preserve page state with exact rollback/generation contracts from existing owners.

A scheme that walks every hidden node and overwrites inline `style` is not automatically acceptable: it creates mutation/budget/rollback/host-reentrancy problems already owned elsewhere.

### Block 28 — deterministic + external regression matrix

Closure regression should cover:

- plain unselected node (must remain hidden);
- non-important inline/high-specificity CSS positive controls;
- inline `display:block!important` and `all:revert!important`;
- high-specificity important rule declared both before and after WebClip preparation;
- important cascade-layer rule with low selector specificity;
- explicit Exclude with competing important display;
- very tall unselected subtree to verify page count stays selection-bounded;
- top document, same-origin iframe and cross-origin P1-229 representation;
- resource report/physical scope agreement;
- real unpacked Chrome as release QA after deterministic fixtures pass.

## Test / release boundary

This tranche changes research documentation only. No runtime tests are claimed executed by writing this file; managed Chromium fixture probes are engineering evidence. `manifest.json` remains `0.9.8`; no build/tag/release is created.