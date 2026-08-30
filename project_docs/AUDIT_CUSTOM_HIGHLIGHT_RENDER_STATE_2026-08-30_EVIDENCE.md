# Durable audit evidence — CSS Custom Highlight renderer state — Blocks 1–16 — 2026-08-30

Canonical P-code owner/status authority remains exclusively in `AUDIT_REGISTRY.md`. This is an interruption-safe fresh-source checkpoint focused on site-rendered annotations/search/highlight state represented by the CSS Custom Highlight API (`CSS.highlights`, `Highlight`, `Range`, `::highlight()`).

Exact fresh audited baseline: `main = 5650ff8de12b1245f7648d385fe659718e420afc`.

Working branch: `audit/custom-highlight-render-state-2026-08-30`.

Managed Chromium 144/CDP is deterministic engineering evidence only; real unpacked Chrome remains release QA. No runtime, canonical registry, manifest/version/build/tag/release changes are made by this checkpoint.

## Duplicate/root-cause decision

Fresh PR/history/code search found no dedicated `CSS.highlights` / `HighlightRegistry` / `::highlight()` audit tranche or runtime support. Existing neighboring evidence is deliberately separated:

- focus/interaction PR #48 tests `:focus`, `:focus-visible`, `:hover` and retains browser `::selection` as a negative control;
- flattened-frame P1-187 evidence covers canvas bitmap, current select state, pseudo/generated CSS and other renderer-owned state, but not Range-backed HighlightRegistry state;
- typography/CSS-environment tranches cover style rules and document-local CSS authority, not the runtime registry mapping named highlights to live Range endpoints;
- deferred/materialization evidence concerns unmounted DOM/resources, while Custom Highlight content can be fully mounted and text-complete yet visually annotated only through renderer state.

No new P-code is justified. Blocks 1–16 refine **P1-187 ACTIVE** (flattened frame rendered-state parity), **P0-004 ACTIVE** (selected visual fidelity) and **P0-070 ACTIVE** (exact renderer generation). **P0-064 / P1-167** remain supporting bounds for any future range/materialization representation. `P1-230` remains deliberately unallocated.

## Block 1 — CSS Custom Highlight API is available in the managed current Chromium generation

Fresh top-document fixture reported:

- `CSS.highlights` present;
- registry size after installation = 1;
- ordinary DOM/text remains unchanged.

A `Range` covering part of `CUSTOM_HIGHLIGHT_MARKER_ABCDEFG` was inserted into `new Highlight(range)` under registry key `mark`.

The visual state therefore exists outside ordinary element attributes/text content while remaining renderer-visible.

## Block 2 — `::highlight(mark)` is physically printable: positive renderer capability control

The fixture defined:

`::highlight(mark) { background: rgb(255,0,0); color:white }`

Screen raster contained about **16,575 red** highlight pixels.

The exact worker-shaped physical path (`Emulation.setEmulatedMedia({media:'screen'})` + `Page.printToPDF`, A4/12mm, backgrounds enabled) produced:

- PDF SHA-256 `ac2bd98956bc86d1e76b9e81f7834177f388817b9c7ba2d878e31f30dbd9424b`;
- 12,500 bytes;
- about **25,504 red** highlight pixels in the PDF raster;
- searchable extracted text `CUSTOM_HIGHLIGHT_MARKER_ABCDEFG`.

Chromium can serialize the tested site highlight state. Loss in a secondary representation is not a generic PDF limitation.

## Block 3 — Custom Highlight rendering does not require DOM wrappers

The selected text remains a normal text node. No `<mark>`, `<span>`, data attribute or inline style is introduced by the Highlight API.

Consequently a DOM-only preservation strategy can retain every character and element while still omitting the annotation the user saw.

This is directly relevant to later reading: site search hits, collaborative annotations and other Range-backed emphasis can be meaningful visual information despite no markup delta.

## Block 4 — HighlightRegistry state is document-local runtime state

A same-origin iframe fixture installed `mark` only in the child document:

- child `CSS.highlights.size = 1`;
- top `CSS.highlights.size = 0`;
- child text `FRAME_CUSTOM_HIGHLIGHT_ABCDEFG` remained ordinary DOM text.

The named range belongs to the child document's registry and its endpoints reference child text nodes. A top-document clone does not inherit that mapping.

## Block 5 — direct parent PDF preserves the child document's custom highlight

With the original same-origin iframe visible, the physical parent PDF produced:

- SHA-256 `587e88d53e87bf0e88cfafc64d9b84cf9327902030bd86649d90e29789033721`;
- 11,557 bytes;
- about **26,840 red** highlight pixels.

The child text was physically printed with its current custom-highlight presentation before flattening.

This is the required positive frame renderer capability control.

## Block 6 — production-shaped body cloning loses the HighlightRegistry mapping

A production-shaped secondary representation cloned the child BODY content into a top-document section and hid the original iframe.

After cloning:

- child registry still contained the `mark` Highlight;
- top registry remained empty;
- proxy text remained exactly `FRAME_CUSTOM_HIGHLIGHT_ABCDEFG`.

The Range endpoints still refer to source child nodes. Nothing maps them to the cloned proxy text nodes.

## Block 7 — physical flattened proxy keeps the text but loses all tested highlight pixels

The proxy physical PDF produced:

- SHA-256 `7aff1e2baa80ff5b874438331dac4b9284a8f267dbd115d17c5a06b019638ebf`;
- 7,729 bytes;
- **0 red** highlight pixels;
- extracted text still contains `FRAME_CUSTOM_HIGHLIGHT_ABCDEFG`.

This is a concrete P1-187 case where textual completeness and searchable PDF success coexist with loss of the rendered information the user saw.

## Block 8 — top-document availability of the `::highlight(mark)` rule is insufficient

The controlled top document also defined the same named `::highlight(mark)` visual rule. The proxy still had 0 red pixels because a pseudo rule alone does not create a Highlight Range.

The missing state is therefore not merely stylesheet text/provenance. It is the live HighlightRegistry + Range-to-node mapping.

This differentiates the finding from the flattened CSS environment tranche.

## Block 9 — ordinary `cloneNode(true)` loses highlight coverage even within the same document

A separate top-document control had one source node covered by registry key `mark`. Its focused source physical PDF was:

- SHA-256 `8dc82ee469ea025484db5aa1c41ebcdef3b23cac7115c1d2acb34faa743bd96e`;
- 12,092 bytes;
- about **23,053 red** highlight pixels.

After `cloneNode(true)`, the source node was hidden and the clone displayed. The registry still existed and its stored Range still returned text `HIGHLIGHT_MAPPING`, but its endpoints referenced the hidden source text nodes, not the clone.

## Block 10 — cloned visible text with an unchanged registry physically loses the annotation

The clone-without-remap PDF produced:

- SHA-256 `203fb9da5ce0d5fc7fd75483f8900cc1f2ec072cdacd1098033b97cd27eb22db`;
- 7,388 bytes;
- **0 red** highlight pixels.

Thus even preserving the same named registry in the same document does not make a structural clone visually equivalent. Range identity is node-specific.

## Block 11 — explicitly remapping the Range to clone text restores the physical highlight: causal positive control

The controlled clone then constructed a fresh Range over the equivalent offsets in the cloned text node and replaced `CSS.highlights['mark']` with a Highlight containing that clone Range.

The resulting physical PDF:

- SHA-256 `0ab5675521ad658b6699c03fe98fdda5b3d9bcf31bc514ba62ef28224cef0e82`;
- 12,092 bytes;
- about **23,053 red** pixels.

The tested visual category exactly returned. This isolates the loss to range/registry representation rather than text, font, PDF or highlight-pseudo capability.

## Block 12 — equivalent visible text is not sufficient identity for a Highlight Range

Both the source and clone contained identical text. The original Range's `toString()` remained `HIGHLIGHT_MAPPING` even while the visible clone was unhighlighted.

A future repair cannot infer “same text means same highlight” without an explicit node/range mapping policy. Repeated text, split text nodes, DOM mutation and composed/flattened transformations can make text matching ambiguous.

This is why P0-064/P1-167 bounds and truthful ambiguity are relevant to any generalized materialization.

## Block 13 — current flattened-frame source has no HighlightRegistry transfer phase

Exact current `content.js` flattened-body flow:

- deep-clones BODY descendants;
- copies an explicit subset of computed element styles;
- special-cases limited URL/media attributes;
- removes scripts/excludes;
- mounts the proxy into the top document and hides the original frame.

Fresh source/code search contains no `CSS.highlights`, `Highlight`, HighlightRegistry or Range-remapping logic in this pipeline.

Therefore the physical loss matches the exact current representation contract rather than an omitted harness step.

## Block 14 — current resource readiness cannot detect this loss

Custom highlight background/color in the tested fixture requires no delayed external resource. Ordinary DOM text is present and ready.

A resource report can therefore be fully clean while the final artifact has lost the Range-backed annotation. This is not primarily P1-003 resource readiness; the missing authority is renderer/document state under P1-187/P0-070.

If a `::highlight()` rule later references external renderer resources, that can compose with P1-003, but no such resource is needed for the core reproduction.

## Block 15 — existing `::selection` negative control prevents conflating Highlight API with browser Selection overlay

PR #48 physically showed that a live DOM Selection Range remained present while tested `::selection` highlight pixels did not serialize into PDF.

The Custom Highlight API behaves differently in this Chromium control: its `::highlight(mark)` pixels **do** serialize.

Therefore “Range-backed state” is not one uniform category. Acceptance must be based on actual renderer behavior/state class, not an assumption that all selection-like overlays are either printable or transient.

## Block 16 — Stage-1 owner/truth classification

No new P-code/status transition.

Primary refinements:

- **P1-187 ACTIVE** — same-origin flattened proxy must preserve required document-local renderer state; Custom Highlight registry/ranges are a newly proven instance;
- **P0-004 ACTIVE** — selected readable text can remain complete while visible annotation/emphasis is lost;
- **P0-070 ACTIVE** — exact physical artifact must correspond to one renderer/document generation including admitted document-local rendering registries where they materially affect output.

Supporting bounds:

- **P0-064 ACTIVE** — any preflight/materialization of range-backed secondary state must be bounded before expanding potentially large range sets;
- **P1-167 ACTIVE** — preparation/diagnostics need shared count/time/string/range budgets rather than unbounded traversal.

Current diagnostics do not receipt child/top HighlightRegistry size, named highlight coverage, Range endpoints or whether the final proxy preserves an admitted custom-highlight region.

Blocks 1–16 are complete and interruption-safe.