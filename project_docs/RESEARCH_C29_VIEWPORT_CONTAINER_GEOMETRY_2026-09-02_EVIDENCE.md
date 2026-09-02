# C29 compact evidence — viewport/container-dependent geometry — 2026-09-02

Canonical C29 source baseline: `4508b7abce73366fd796c0d662f15d3bbb112df8`.  
Exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`.

## Classification

**`L4-REVALIDATED / FINDING + POSITIVE/DIRECT/ALIGNED/CONTAINER/FROZEN/CAUSAL CONTROLS (P0-070, P0-004)`**.

No new P-code and no Registry status/wording change.

## Accepted physical evidence

- Chrome `151.0.7922.173`;
- workflow run `33626492404`;
- job `100235352749`;
- exact accepted workflow head `78ae97da0b1741529ec9736ab06ca25c608bc49d`;
- conclusion SUCCESS;
- raw-result receipt commit `4f39f8fdd875a19e95c03e648ef530383b25b650`;
- raw result SHA-256 `b3d60e267efe3797f877ea1266fe94c1f084ce875a6ac1bc81b9d8a787d33d0a`;
- durable harness `project_tools/research_c29_viewport_container_geometry.py`.

## Fresh finding

At a 1200×800 admitted source:

- `50vw = 600px`;
- percent query container ≈`937.6px`;
- `50cqw ≈458.8px`;
- query branch = **wide**.

Current WebClip preparation and `beforeprint` still report that source-like state, but the physical A4 PDF contains the **narrow** container branch.

Scale-invariant physical geometry ratios in current WebClip PDF:

- viewport box / fixed-container cqw control = `1.0395`;
- percent-container cqw box / fixed-container cqw control = `0.7787`.

A source already aligned to 703×1031 produces the same physical ratios and narrow branch. Direct Chromium wide-source control likewise produces narrow branch and ratios `1.0456` / `0.7789`.

A test-only admitted-used-geometry freeze preserves the wide branch and restores source-shaped physical ratios `1.5417` / `1.1759` through the same A4 renderer. Exclude and outside-scope controls remain absent.

The explicit 800px query-container remains **wide** in every case, rejecting a generic container-query-engine failure.

## Rejected harness assumptions

Two earlier runs are retained as rejected measurement hypotheses, not accepted evidence gates:

1. run `33625929885` / job `100233535486`: assumption that `beforeprint` reflects final paged used geometry was false; physical branch already differed while live metrics remained source-like;
2. run `33626272151` / job `100234637330`: absolute PDF-pixel widths were not cross-document comparable because Chromium applies whole-page fit scaling; acceptance was corrected to within-PDF ratios.

## Owner reconciliation

- **P0-070 ACTIVE** — final physical renderer/environment generation must correspond to the admitted representation or be truthfully classified as reflow/degraded;
- **P0-004 ACTIVE** — selected visual/layout fidelity includes viewport/container-dependent used geometry and query branch, not only selected text/DOM completeness.

P0-075 is broader isolated-representation context; P1-187 frame parity was not freshly exercised; P2-007 remains mode-architecture context only.

## Architecture implication

For faithful-static PDF, WebClip needs a bounded immutable admitted representation of renderer-significant viewport/container-dependent used state before paged rendering, or explicit truthful reflow/degradation. `media:'screen'`, `beforeprint` live metrics, and pre-print DOM geometry do not prove the final physical representation.

Detailed evidence: `RESEARCH_FULL_RESTART_C29_VIEWPORT_CONTAINER_GEOMETRY_2026-09-02.md`.
