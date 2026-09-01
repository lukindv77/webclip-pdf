# WebClip — fresh full-project audit restart — C05 Geometry/layout — 2026-09-01

Date: 2026-09-01

Sequential restart coordinate: **C05 — Geometry/layout**.

Canonical product-source baseline exercised: `9dad0c02db8846ef7950f8fa21aecb200e62db38`.

Accepted focused evidence head: `9e59102234d8a9021a3c793a569161c461ea2958`.

Result: **`L4-REVALIDATED / FINDING + POSITIVE CONTROLS (P0-004)`**.

This document is a fresh-restart coverage/provenance checkpoint. `AUDIT_REGISTRY.md` remains the single status authority for P-code owners. This evidence does not reopen/close an owner and does not change release readiness.

## Scope and acceptance boundary

C05 asks whether the geometry/layout of already-admitted selected rendered content survives the current save/render path sufficiently faithfully for a static PDF. The focused tranche exercised current `content.js`, current selection preparation, Chromium layout and physical PDF output.

The acceptance model is deliberately **scale-invariant** where appropriate. A4 pagination/rendering may apply a uniform page-scale conversion from CSS pixels to PDF points. Therefore an absolute CSS-px -> PDF-point size change is not a defect by itself. A C05 finding requires loss of meaningful internal geometry, topology, relative layout/positioning, or a material change in the selected geometry relative to its page-owned layout context that cannot be explained by one uniform page scale or by intentional Exclude reflow.

This boundary is important because an earlier diagnostic interpretation of `body_width_context` looked suspicious when only absolute widths were compared. Physical ratio analysis showed that relative geometry survived. The accepted model rejects that false positive rather than weakening the product fidelity contract.

C05 does **not** claim pixel-exact color/font fidelity; those belong to later coordinates. It also does not advance SVG, canvas, replaced media, form-control, pseudo-content, link, frame, pagination, clipping/paint-containment, temporal mutation or runtime-failure coordinates. `position:fixed` here is a selected-element geometry control, not a claim about pagination repetition semantics.

## Current production render path checked before execution

Source-first inspection established the actual production geometry environment before the accepted run:

- `prepareForPrint()` installs selection print styles before the PDF request;
- the injected stylesheet sets `@page { size: A4; margin: 12mm; }`;
- for selected documents it forcibly normalizes `html, body`, including `overflow: visible`, `position: static`, `width: auto`, min/max width reset, height/min/max height reset, `inset: auto`, `float: none`, `contain: none`, `content-visibility: visible`, `transform: none`, `clip: auto` and `clip-path: none`;
- the worker production path sets emulated media to `screen` before `Page.printToPDF`;
- physical printing uses `scale: 1`, `printBackground: true`, and `preferCSSPageSize: true`.

An earlier development diagnostic used print-media emulation and was therefore explicitly rejected as acceptance evidence once this production detail was confirmed. The accepted execution below uses the screen-media model consistent with the product path.

## Accepted execution receipt

Accepted external execution:

- workflow run: `33506314081`;
- job: `99851081249`;
- exact evidence head: `9e59102234d8a9021a3c793a569161c461ea2958`;
- Chrome for Testing: `152.0.7977.64`;
- exercised `content.js` SHA-256: `9bc3b42db86d522a05cd261da420771eab721f1767bc13fc28d6b0c32f0ff47a`;
- artifact id: `9799739764`;
- artifact name: `c05-geometry-layout-9e59102234d8a9021a3c793a569161c461ea2958`;
- artifact ZIP SHA-256: `570c116caebe510791ee08b92b90df6abfe081eecb68c5c0c2b91d5abbc6edd1`;
- artifact payload: `c05-result.json` plus fifteen physical PDFs;
- workflow conclusion: **SUCCESS**;
- machine result: `accepted=true`;
- machine findings: `body_transform_context` only.

The temporary workflow and harness are intentionally not part of the final mergeable tree. Their exact accepted implementation remains recoverable from the evidence head above.

## Physical case matrix

| Case | Fresh result | C05 meaning |
|---|---|---|
| `normal_flow` | positive control | ordinary block flow geometry survived |
| `flex_row` | positive control | flex item widths/order/gap topology survived |
| `grid_2x2` | positive control | two-column/two-row grid topology survived |
| `inline_fragmentation` | positive control | inline wrapping/fragment topology survived |
| `relative_absolute` | positive control | relative/absolute relationship survived |
| `transform_child` | positive control | selected descendant transform survived |
| `fixed_position` | positive control | selected fixed-position element remained physically represented |
| `minmax_sizing` | positive control | min/max/clamp sizing relationship survived |
| `body_width_context` | positive control | page-owned width normalization preserved scale-invariant selected/ancestor geometry |
| `body_transform_context` | **P0-004 finding** | page-owned ancestor transform normalization changes relative selected geometry |
| `nested_percentages` | positive control | nested percentage sizing relationship survived |
| `table_fixed` | positive control | fixed-table column topology survived |
| `vertical_writing` | positive control | vertical writing geometry survived |
| `multicolumn` | positive control | multicolumn topology survived |
| `exclude_flex_reflow` | positive control | Exclude caused only the intended surviving-flex reflow |

## Positive-control receipts

### Ordinary flow

The ordinary block-flow fixture preserved its selected source/prepared geometry and both independent physical text markers were present in expected vertical order.

Physical PDF:

- bytes: `21666`;
- SHA-256: `6a42c765cbec3fa13c398b25061effdd658cf212f6f69f0e7eca3237ee443198`.

### Flex layout

Source and prepared geometry preserved the two fixed flex bases (`180px` and `260px`) and their horizontal relationship. Physical markers remained independent and horizontally separated.

Physical PDF SHA-256: `5bc0a16095c76670556112efc1a20537e0296ca862d2aeffaa93a17b823b038b`.

### Grid layout

The 2:1 column structure and row topology remained stable source -> prepared, and the physical marker topology remained a two-column/two-row arrangement.

Physical PDF SHA-256: `ffd729c9b3afd5980282e1082830374587514eb4995ea10171d677f0b25be93a`.

### Inline fragmentation

The fixture had four source fragments and four prepared-screen fragments. Physical start/end markers remained on distinct expected lines rather than collapsing or disappearing.

Physical PDF SHA-256: `be264d5bda4e570e2057528a3172ef465b6449e5510980ad7bbdf416c1faabba`.

### Relative / absolute positioning

The selected containing block and relative/absolute children kept stable source/prepared rectangles, and physical markers retained the expected offset relationship.

Physical PDF SHA-256: `29c1b59f6592eaa4cb0dc7684a775e6c64befa20a4dc1bf2b55b57a722bf7c35`.

### Selected descendant transform

The transformed selected descendant retained the computed transform `matrix(1.2, 0, 0, 1.2, 150, 45)` through preparation, and its physical marker remained displaced from the untransformed control as expected.

Physical PDF SHA-256: `46149419033a24a070f113fad92d25832456234b1cd9311c3d0b9c8062a152e8`.

### Fixed selected element

The selected fixture remained `position: fixed` through source/prepared measurement at approximately `x=280`, `y=190`, `width=320`, `height=90`; its physical marker was present. This proves only the focused selected-element geometry control, not repeated fixed content across page breaks.

Physical PDF SHA-256: `504a95350c75b6733b4664addf458c9358aff86edc5ad0dafa93402d0dfbe013`.

### Min/max/clamp sizing

The clamp fixture resolved to `269.59375px` in both source and prepared screen geometry; the companion minimum-sized box remained `330px`. The physical markers retained expected ordering.

Physical PDF SHA-256: `79708f4ba9e8cb43cffec929526e84e640da62d092b9103283c9b1abb47e0903`.

### Nested percentages

Nested source/prepared widths remained `600 -> 450 -> 225`, preserving the percentage chain.

Physical PDF SHA-256: `efde1aa0bfdff1829ccdd9d15732637803916011b5bf841c0393421e30518cc0`.

### Fixed table layout

The table remained `720px`; the two measured cells remained `216px / 504px` (30/70). Physical marker placement retained the column topology.

Physical PDF SHA-256: `a7dac04a655ce3a2e2b234fff83edfe7fbe30a09166d91ea4e60486bd644f4cc`.

### Vertical writing

`writing-mode: vertical-rl` survived source -> prepared and the physical markers retained the expected cross-axis separation.

Physical PDF SHA-256: `94cf3fe679a31a3bc18b2bc8abdb5f5836c55b1950b2c0beecd31799c87ce94d`.

### Multicolumn

The two-column fixture retained its source/prepared column structure and physical markers remained in separate columns.

Physical PDF SHA-256: `d4df081e06351f6e59d45a4b7e41dd7ba0f589c290aa6b9e3fdb69bed8c503dc`.

### Intentional Exclude reflow

Before Exclude the third flex item began at approximately `x=397`; after hiding the middle selected child it moved to approximately `x=217`. The excluded marker was absent from the physical PDF and the two surviving items reflected the expected reflow. That is intended selection semantics, not a geometry defect.

Physical PDF SHA-256: `68d701fb0d6233243a4782935a89265b4d157bd526e94ad9466218c826e4606f`.

## False-positive control — body width normalization

This case is important because it distinguishes legitimate page scaling from a layout fidelity failure.

Source:

- selected `#scope` width: `350px`;
- source `body` width: `700px`;
- selected/body ratio: `0.5`.

Prepared screen after WebClip root normalization:

- selected width: `475px`;
- body width: `950px`;
- ratio remains `0.5`.

Physical PDF:

- selected scope border width: `207.0pt`;
- page-owned ancestor box width: `415.5pt`;
- physical ratio: `0.4981949458483754`;
- delta from source ratio: `0.0018050541516245744`.

This is consistent with uniform page scaling. It is therefore classified as a **positive control**, not a P0-004 finding.

Physical PDF SHA-256: `023ffbe2ff384ffb3c2d6fffb479d998f3fec9f43a26e1bd4588f0b270e7b2ce`.

## Fresh finding — body/page-owned ancestor transform normalization

`body_transform_context` independently revalidates existing **P0-004 ACTIVE**.

Source rendered state:

- `body` computed transform: `matrix(0.82, 0, 0, 0.82, 140, 0)`;
- selected `#scope` rendered width: `508.4000244140625px`;
- rendered body width: `862.6400146484375px`;
- selected/body ratio: `0.5893536304610877`.

Prepared screen state after current WebClip root normalization:

- body transform becomes `none`;
- selected scope width becomes `620px`;
- body width becomes `1052px`.

Physical PDF:

- selected scope border width: `464.25pt`;
- page-owned ancestor box width: `492.0pt`;
- physical ratio: `0.9435975609756098`;
- absolute ratio delta from source: `0.3542439305145221`.

That large relative-geometry change is not explainable by one uniform CSS-px -> PDF-point scale. The selected rendered target depended on a page-owned ancestor transform that current preparation removes. This is therefore a fresh current-Chrome revalidation of the existing P0-004 ancestor layout/positioning fidelity root cause.

Physical PDF:

- bytes: `22973`;
- SHA-256: `1e77a6b6c66a730918ff7107b675738245cc723e7b721d1516fb8156212b5c47`.

No new P-code is allocated. `P1-228` is not the owner because that owner concerns picker/candidate/outline geometry; this observation is on the admitted save/render path.

## Root-cause reconciliation

Fresh C05 observations were reconciled against current Registry ownership before classification:

- `P0-004 ACTIVE` already owns selected-PDF ancestor layout/clipping/positioning fidelity and therefore owns `body_transform_context`;
- `P1-228 ACTIVE` is a picker/candidate geometry owner and is not duplicated here;
- no independent C05 root cause requiring a new P-code was demonstrated by this tranche.

The Registry status itself is unchanged by this evidence checkpoint.

## Pipeline boundary

The focused C05 execution exercises the geometry-relevant path across:

- B1/B2 — explicit Include/Exclude admission for the fixture;
- B3/B4 — current selected DOM state and WebClip print preparation/materialization;
- B5 — Chromium screen-media render environment used by the product PDF path;
- B6 — physical PDF bytes and extracted marker/border geometry.

It does not make new claims for B7-B9 persistence, Journal, recovery or later-reading semantics.

## Decision

Within the explicit focused boundary above:

**C05 advances from `NOT-TRIAGED / UNKNOWN` to `L4-REVALIDATED / FINDING + POSITIVE CONTROLS (P0-004)`.**

C06 and every later untested sequential coordinate remain unchanged. This evidence changes no product runtime, manifest/version, Registry owner status, release-readiness state, build, tag or GitHub Release.
