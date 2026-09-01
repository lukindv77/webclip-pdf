# Durable research evidence — typography/layout fidelity final controls — Blocks 49–56 — 2026-08-30

This file completes the interruption-safe 56-block typography/layout fidelity tranche begun in:

- `RESEARCH_TYPOGRAPHY_LAYOUT_FIDELITY_2026-08-30_EVIDENCE.md` — Blocks 1–16;
- `RESEARCH_TYPOGRAPHY_LAYOUT_FIDELITY_STAGE2_2026-08-30_EVIDENCE.md` — Blocks 17–32;
- `RESEARCH_TYPOGRAPHY_LAYOUT_FIDELITY_STAGE3_2026-08-30_EVIDENCE.md` — Blocks 33–48.

Fresh researched base remains `013bea563f504a325f501ecc4521b1e41cdd11ef`.

Canonical owner/status authority remains `RESEARCH_REGISTRY.md`; no runtime, registry, manifest/version, build/tag/release change is made by this tranche.

## Block 49 — direct/live child renderer is a positive typography-resource control

The Stage-3 source representation is a real live same-origin iframe whose child `FontFaceSet` contains the test faces. Chromium directly prints that source representation with the intended child font metrics.

Therefore the browser can render/print the child typography correctly. The defect is introduced when WebClip replaces the child renderer with a top-document flattened proxy.

This is consistent with earlier direct-render positive controls: a secondary representation must not regress state the renderer already owns correctly.

## Block 50 — transferring the same `@font-face` registration restores proxy metrics — causal P1-187/P1-003 control

A dedicated control uses one loaded child `FrameMono` face and a long fixed-width text block.

Before top-document font registration:

- child/source `FontFaceSet.size = 1`;
- top `FontFaceSet.size = 0`;
- source long-text height ≈ **10,139.06 px**;
- production-shaped proxy long-text height ≈ **6,759.38 px**.

Then the exact same face is explicitly registered by an equivalent `@font-face` rule in the top document and `document.fonts.ready` is awaited.

After registration:

- top `FontFaceSet.size = 1`;
- source height remains ≈ **10,139.06 px**;
- proxy height becomes ≈ **10,139.06 px**, matching source.

This is a strong causal control: the divergence is document-scoped font-face availability, not arbitrary clone text mutation.

It also sharpens P1-003: readiness must be checked for the renderer/document that will physically produce the artifact.

## Block 51 — complete computed-style transfer restores tested non-resource typography/layout state

A control intentionally copies **every enumerable computed CSS property** from source elements to their clones, rather than the production allowlist. It is an engineering diagnostic only, not an endorsed implementation (no size/work budget is claimed).

For four representative already-loaded cases, source/proxy state became equal:

- vertical writing: **124×184 px source = 124×184 px proxy**, `writing-mode:vertical-rl` preserved;
- ruby: **284×46 px = 284×46 px**, `ruby-position:under` preserved;
- 2-line clamp: **260×50 px = 260×50 px**, `-webkit-line-clamp:2`, vertical box orientation and hidden overflow preserved;
- SVG: **260×80 px = 260×80 px**, child fill/stroke/stroke-width preserved.

This proves the Stage-1/2 losses are caused by the partial style representation, not by an inherent inability of a top-document clone to express those particular computed states.

## Block 52 — full-style control does not establish a viable production solution

Block 51 is deliberately classified as a **causal positive control**, not a repair prescription.

A production closure still has to handle at least:

- explicit P1-167 shared work/time/string budget;
- P0-064 subtree/materialization admission;
- document-scoped resources such as `@font-face` and final renderer graph;
- pseudo/generated content and browser-owned state that ordinary element computed styles do not fully materialize;
- frame-local URL/resource provenance;
- representation generation/freezing and hostile-page mutation boundaries.

Therefore “copy every CSS property” is not accepted as a complete architecture from this evidence alone.

## Block 53 — body `lang`/`dir` attribute handling is a positive source control

Current `createFlattenedBodyFramePrintProxy()` explicitly copies `sourceBody` `dir` and `lang` attributes to the proxy, while ordinary descendant attributes survive DOM cloning.

This is useful and should be preserved. The research does not claim language/direction metadata is universally dropped at the markup level.

The demonstrated P1-187 issue is broader: CSS writing/bidi typography and renderer resources/styles can still diverge despite retained semantic attributes.

## Block 54 — current font readiness is source-document-scoped by implementation

Fresh `content.js::loadFontTask()` obtains:

`const fonts = task.ownerDoc?.fonts`

then performs `check/load/check` against that `FontFaceSet`.

`prefetchIncludedResources()` constructs the font task from each selected element's `ownerDoc` and deduplicates by owner document URL + font spec.

This is a correct source-resource readiness check for the source renderer. It does **not** prove equivalence after `createFlattenedBodyFramePrintProxy()` changes the physical owner document of the printed nodes.

The Stage-3/Block-50 controls show the acceptance criterion must distinguish source-ready from final-representation-ready.

## Block 55 — current diagnostics cannot prove typography/SVG fidelity — P1-187 / P1-003 truth boundary

Fresh source diagnostics are structurally useful but insufficient as a rendered-fidelity receipt.

`createFlattenedBodyFramePrintProxy()` records only bounded fields such as:

- mode / mount / depth / same-origin;
- source text char count;
- clone element count;
- styled element count;
- removed script/exclude counts;
- style-budget truncation flag.

General page style diagnostics report a limited set such as display, visibility, opacity, position, overflow, content-visibility, containment and transform presence.

They do **not** prove:

- resolved physical font face identity;
- source-vs-proxy `FontFaceSet` equivalence;
- writing mode/orientation/bidi typography;
- line clamp / ellipsis disclosure equivalence;
- ruby position;
- advanced decoration/shaping state;
- SVG fill/stroke/dash/paint-order equivalence;
- native control accent/color-scheme equivalence.

Therefore clean diagnostic counts cannot be interpreted as evidence that the PDF retained the visual state tested in this tranche.

Any future degraded/success reporting should remain truthful when required representation equivalence is unknown.

## Block 56 — final duplicate/root-cause reconciliation and acceptance contract

### No new P-code

Fresh evidence does not justify P1-230.

Existing owners already provide the correct decomposition:

**Primary**

- **P1-187 ACTIVE** — same-origin flattened iframe proxy must preserve the renderer state required by the selected saved representation. This tranche expands that contract to typography, writing systems, disclosure/truncation, SVG paint, native-control theme and document-scoped font-face identity.

**Supporting**

- **P0-004 ACTIVE** — selected saved copy must remain visually faithful/complete rather than silently reflowing/repainting/revealing different content;
- **P1-003 ACTIVE** — actual final visual resource graph/readiness includes the resource environment of the physically printed representation, not merely the pre-flatten source document;
- **P0-070 ACTIVE** — artifact must represent the intended exact renderer generation;
- **P1-167 ACTIVE** and **P0-064 ACTIVE** — any richer style/font representation needs bounded admission/work before large materialization;
- **P2-007 BACKLOG** — faithful-current-view versus intentionally expanded/reader/static modes must be explicit. In particular, line-clamped/ellipsized text cannot be silently expanded while still claiming “same as displayed”.

### Relationship to prior evidence

`RESEARCH_COMPLEX_LAYOUT_FRAME_PROXY_FIDELITY_EVIDENCE_2026-08-29.md` already demonstrated flex/grid, writing-mode/direction, visual effects, generated content, object-fit, canvas/select, URL provenance and style-budget-tail issues.

The present tranche deliberately treats overlapping writing-mode/direction cases as fresh revalidation. Its materially new refinement areas are:

- text emphasis, spacing/tab and advanced underline geometry;
- shaping/variant/synthesis/size-adjust policies;
- ruby position;
- line clamp/ellipsis/custom quotes/line-break disclosure and reading conventions;
- stylesheet-owned SVG paint model;
- native `accent-color` / `color-scheme` presentation;
- document-scoped `@font-face` registry/descriptor/unicode-range provenance;
- physical pagination drift caused by loaded-source-font → top-proxy-fallback transition;
- causal controls showing top face registration and sufficiently complete computed style can restore the tested dimensions.

### Final acceptance direction

A future closure of P1-187/P1-003 for this surface should prove, with physical differential PDF tests, that the selected representation preserves or truthfully classifies at least:

1. writing/bidi/ruby system;
2. visible-vs-clamped/ellipsized text disclosure;
3. shaping and font metrics/variants;
4. exact required font-face availability in the final printing document/renderer;
5. SVG paint and native control presentation;
6. pagination/line-break consequences;
7. boundedness and truthful degradation on unsupported/omitted state.

A short hand-maintained CSS allowlist plus source-document font check is not sufficient proof of visual equivalence.

## Tranche completion

**56/56 blocks complete.**

No unfinished content block remains after this file. Delivery/index/PR/CI remains a separate repository lifecycle step.
