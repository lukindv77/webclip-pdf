# C28 responsive/environment fresh evidence receipt — 2026-09-02

Status: **durable fresh-restart evidence receipt**. `RESEARCH_REGISTRY.md` remains the sole current P-owner/status authority.

Coordinate: **C28 — Responsive/environment state**.

Canonical researched baseline:

- `main = 880256a7d6bfd612c3abdd5f11c0ffdd33190033`;
- `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- Google Chrome `151.0.7922.173`.

Fresh classification:

**`L4-REVALIDATED / FINDING + POSITIVE/NARROW/DPR/SCHEME/FRAME/CAUSAL CONTROLS (P0-070, P0-004)`**

## Exact accepted physical receipt

- workflow run `33623739974`;
- job `100226506745`;
- exact workflow head `4280a1b33c321bcff7de234ebb459c20dbe45e3b`;
- conclusion **SUCCESS**;
- raw result SHA-256 `9715b5f36b39d9331302b815f7637ee12e286dd590d9090c5ac114991ac159d4`.

The harness binds to the exact baseline and current `content.js`, current WebClip guard prefix, current A4 print preparation, `Emulation.setEmulatedMedia({media:'screen'})` and production-shaped `Page.printToPDF`. Synthetic local fixtures only were used.

Development run `33623499118` is explicitly rejected as acceptance evidence because its final assertion incorrectly expected no responsive metadata. Its physical observation was useful diagnostically; fresh source inspection established that current `pageAnalysis` already records viewport width/height.

## Fresh observations

1. A source `1200×700`, DPR2, dark page matched desktop + landscape + DPR2 + dark and used a two-column layout. Native production-shaped screen-media A4 PDF rendering selected mobile + portrait while retaining DPR2 + dark. This proves the breakpoint/orientation switch is paged-renderer behavior, not Include/Exclude filtering.
2. The actual WebClip wide path still reported desktop + landscape at both beforeprint observer stages, but its physical selected PDF contained mobile + portrait. DPR2 + dark stayed correct; selected content remained, Exclude and outside content remained absent. PDF SHA-256 `ccc1d17c89af9b16981b736b86eda1e57e9a0b94f7fc0ff554d46d3532933744`.
3. The generated PDF request already contained `meta.pageAnalysis.document.viewportWidth` and `viewportHeight`. Those values are diagnostic receipts only; they do not freeze the renderer's responsive branch.
4. Test-only CDP media features for the original width/height/orientation did not change the physical result: mobile + portrait still won. PDF SHA-256 `299b2c050f516b89c0dafb67f9df80cfd3b30d259ad1375d875ab98873db4eb6`.
5. A test-only admission-style static materialization of the fixture's used responsive styles, applied before the same A4 render, restored desktop + landscape + DPR2 + dark while keeping Exclude/outside absent. Accepted-run PDF SHA-256 `ebc39fda8180faf122b68b419f7e184e6bb53d54377c8bc84fbc913651261124`.
6. A narrow `700×1000`, DPR1, light source already matched the A4-side branch and remained mobile + portrait + DPR1 + light in the selected PDF. PDF SHA-256 `0480da52f78177c746e6eac2530b0f701534aea2a1c1e986ec3102a710898b81`.
7. Same-origin selected-BODY flattening was a positive control in this coordinate. A `1100×620`, DPR2, dark child admitted desktop + landscape and its flattened physical PDF retained desktop + landscape + DPR2 + dark while omitting mobile/portrait, Exclude and top outside content. PDF SHA-256 `49fc2ba391f3b5d8691bf735b775772373669c0c80b65f54ec3eeb0b2edc9422`.

## Root-cause decision

No new P-code is warranted.

- **P0-070 ACTIVE** is primary: the admitted responsive representation is not carried as authoritative renderer input through the PDF generation boundary.
- **P0-004 ACTIVE** owns the resulting physical selected-copy fidelity mismatch.
- P0-075 is not needed for this root; the drift reproduces without WebClip UI interaction.
- P1-187 is not freshly revalidated by C28; same-origin flattening is a positive control here.
- P2-007 remains architecture context only.

## Architecture direction

Preserve a generation-bound admitted responsive representation before paged-media evaluation. Source viewport metadata alone is insufficient. The renderer input should materialize the responsive branch/used state first, then paginate or uniformly scale it. `media:'screen'` and simple CDP width/orientation feature overrides are not sufficient by themselves. If bounded materialization cannot prove the requested representation, report degraded/unknown rather than silently allowing A4 to select another responsive variant.

Detailed proof and external standards/analog analysis are in `RESEARCH_FULL_RESTART_C28_RESPONSIVE_ENVIRONMENT_2026-09-02.md`.

C29 — viewport units / container-query dependent geometry — remains unclaimed and is the next sequential coordinate. Runtime source, Registry wording/status, manifest/version, build/tag/Release and release readiness remain unchanged.
