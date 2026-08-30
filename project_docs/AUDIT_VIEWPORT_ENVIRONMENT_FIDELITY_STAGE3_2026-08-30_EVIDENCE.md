# Durable audit evidence — frozen screen-geometry causal controls — Blocks 33–48 — 2026-08-30

Continuation of the viewport/environment fidelity tranche from exact base `4d26fb5b6481861d0f11f37e8c3c8746afb5b6ab` on branch `audit/viewport-environment-fidelity-2026-08-30`.

Canonical owner/status authority remains `AUDIT_REGISTRY.md`. Audit/docs only.

## Stage purpose

Blocks 1–16 proved that forced screen media combines screen media-query truth with A4-relative viewport units. Blocks 17–32 proved current live iframe resizing can itself mutate page application state.

Stage 3 asks a causal question: is viewport-unit divergence an unavoidable limitation of Chromium PDF, or can an isolated representation preserve the already-computed screen geometry by materializing it before print?

The controls below show the latter is possible for the tested cases. This is engineering causality, not a prescription to copy arbitrary computed styles without bounds.

## Block 33 — long source typography uses 36 px screen text

Screen viewport is 1200×800. A 600 px wide article uses `font-size:3vw`, `line-height:1.25` and 120 named paragraphs.

Before print:

- computed font size = **36 px**;
- article height ≈ **23,098.66 px**;
- media-query branch remains wide.

This is the admitted screen-layout baseline.

## Block 34 — ordinary print recomputes viewport-relative font size

With forced `media:'screen'` and A4/12mm page geometry, the same live CSS computes to **21.09 px** during print layout.

The authored declaration did not change; its viewport dependency did.

## Block 35 — typography reflow reduces long document height dramatically

The ordinary print-layout article height becomes ≈ **7,203.88 px**, compared with ≈23,098.66 px on screen.

This is a >3× layout-density change generated solely by the capture environment.

## Block 36 — ordinary viewport-unit PDF is physically 8 pages

Physical live/unit-resolved PDF:

- SHA-256 `e3e450a64f3f3c960ff3f4a822ee799e06f0a83b15d2349358b6b7cf7aadd706`;
- size 50,358 bytes;
- **8 pages**.

## Block 37 — complete text remains a positive control

The live/unit-resolved PDF still contains the terminal marker `ROW_120`.

Therefore the page-count reduction is not evidence that paragraphs disappeared. It is evidence that the same selected content is typeset at materially different visual scale/line density.

## Block 38 — screen font size can be materialized before print

In an isolated causal control, immediately before printing the article's already-computed screen `font-size` (`36px`) is written as an absolute inline pixel value.

No content is added/removed and the media-query branch is unchanged.

## Block 39 — frozen typography keeps exact source font size through print

With the screen font size materialized:

- before print: 36 px;
- print-layout state: **36 px**.

The A4 renderer can therefore physically honor the screen-computed type size when the viewport dependency is removed from the final representation.

## Block 40 — frozen typography keeps exact source long-text height

The frozen article remains ≈ **23,098.66 px** high through print layout, matching its screen state.

This is a causal positive control for the viewport-unit root cause.

## Block 41 — frozen-screen typography PDF is physically 24 pages

Physical frozen-screen-font PDF:

- SHA-256 `123b51a8fb2b29c1147edfff9e804ba43ab063eae224f86494f432af3f2423e2`;
- size 60,036 bytes;
- **24 pages**.

Thus the exact same DOM/content can produce **8 or 24 pages** depending only on whether the screen-computed viewport-relative typography is preserved.

## Block 42 — frozen PDF also preserves complete text

The frozen PDF also contains `ROW_120`.

Both artifacts are text-complete; only one preserves the screen typography scale. Completeness checks alone therefore cannot establish visual fidelity.

## Block 43 — page-count divergence is a mode/representation decision

Neither 8 pages nor 24 pages is universally “correct” independent of product semantics:

- faithful-same-as-screen mode should preserve the admitted screen appearance as far as the output format allows;
- an intentionally reflowed reader/print mode may choose A4-relative typography only if that change is explicit.

This is P0-004/P2-007 semantics, not a browser failure.

## Block 44 — width viewport unit can be frozen exactly

A separate fixture uses `width:50vw`:

- screen: **600 px**;
- ordinary print: **351.5 px**;
- isolated screen-materialized control: **600 px during print**.

The physical PDF renderer accepts the preserved pixel width.

## Block 45 — height viewport unit can be frozen exactly

`height:50vh`:

- screen: **400 px**;
- ordinary print: **515.5 px**;
- screen-materialized control: **400 px**.

Again the divergence is representational, not unavoidable.

## Block 46 — aspect-ratio propagation is restored by freezing the driving width

Case: `width:50vw; aspect-ratio:2/1`.

- screen: **600×300 px**;
- ordinary print: **351.5×175.75 px**;
- frozen computed width: **600×300 px** during print.

A downstream intrinsic constraint can therefore recover automatically once the viewport-dependent driver is materialized.

## Block 47 — viewport-relative padding and font size can be frozen together

A 300 px content box uses `padding:2vw; font-size:2vw`.

Screen:

- padding 24 px;
- font size 24 px;
- outer geometry ≈348×75 px.

Ordinary print:

- padding/font ≈14.06 px;
- geometry ≈328.09×45.09 px.

Frozen screen-computed values:

- padding 24 px;
- font 24 px;
- geometry returns exactly ≈348×75 px.

## Block 48 — causal classification and limits

The geometric frozen-control PDF differs from the live viewport-unit PDF:

- live SHA-256 `9cb2334b3736b2375b21b3b4351e66ef2b2bea85bcf8d0c7cb64599271fdd7e9`;
- frozen SHA-256 `2cdbc7085f1b36fb528ea9293373ccaf15e89da6b62713a0848aa3b3a598102e`.

No new P-code/status transition.

Primary refinements:

- **P0-004 ACTIVE** — visual fidelity includes viewport-dependent sizing/typography, not only DOM completeness;
- **P0-070 ACTIVE** — the renderer environment belongs to the exact admitted representation generation.

Supporting:

- **P2-007 BACKLOG** — screen-faithful versus intentionally A4-reflowed modes must be explicit;
- **P1-167/P0-064** — production materialization cannot simply copy unlimited computed state; it needs bounded representation admission;
- **P0-075** — any solution should use an isolated representation rather than mutating the live page to force geometry.

The controls prove feasibility for tested properties, not a complete implementation strategy. Freezing large screen dimensions can exceed A4 width/height and may require an explicit scale/viewport snapshot policy. That policy is a product/capture-mode decision, not a reason to silently mix screen media queries with paged viewport-unit geometry.

Blocks 33–48 are complete and interruption-safe.
