# C30 compact evidence — clipping / overflow / paint containment — 2026-09-02

Canonical source baseline: `cd0f1d6aaf5bc874a2b8e791c2c0fd2c6a52fbd0`  
Exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`.

## Classification

**`L4-REVALIDATED / FINDING + POSITIVE/HIDDEN/CLIP/PAINT/CLIP-PATH/CAUSAL CONTROLS (P0-004)`**.

No new P-code and no Registry status/wording change.

## Accepted physical evidence

- Chrome `151.0.7922.173`;
- workflow run `33635043627`;
- job `100263691851`;
- exact workflow head `6969bcbfcf07d46fddf559fb1fe50dbe5f487ed3`;
- conclusion SUCCESS;
- raw receipt commit `c44182fb578e9e652b39e61890160e9c8f4ca3de`;
- raw result SHA-256 `b45411ad9a8abdba69b438c29b69007714ccf7618879864918e562629f34dfca`;
- durable harness `project_tools/research_c30_clipping_containment.py`.

## Fresh result matrix

- direct normal flow: `120/120`, FIRST/MIDDLE/LAST, 5 pages;
- `overflow:hidden` 360px retained ancestor: `8/120`, FIRST only, 1 page;
- `overflow:clip` 360px retained ancestor: `8/120`, FIRST only, 1 page;
- `contain:paint; overflow:visible` 360px ancestor: `8/120`, FIRST only, 1 page;
- `clip-path:inset(0)` supporting shape case: `40/120`, LAST absent, 5 pages;
- `contain:layout; overflow:visible`: `120/120` complete;
- `max-height:360px; overflow:visible`: `120/120` complete;
- causal normalization of hidden ancestor: `120/120` complete;
- causal normalization of paint-contained ancestor: `120/120` complete.

Explicit Exclude and outside-scope controls remain absent from all WebClip positive/causal outputs.

## Root cause

Current selected-only top-document CSS retains ordinary ancestors via `:has([Include])` but does not give them the frame-specific visible-overflow/static-flow normalization. Page-owned clipping/paint bounds therefore remain authoritative at the physical cut.

The `contain:paint + overflow:visible` case is the key discriminator: effective paint clipping cannot be inferred from overflow keyword alone. Conversely, `contain:layout` and max-height+visible-overflow prove that height/containment by itself is not the failure condition.

## Owner reconciliation

**P0-004 ACTIVE** is the direct current owner: selected PDF completeness must not be silently truncated by page-owned ancestor clipping/visual effects. C20 is adjacent scrollport evidence under the same owner; C30 freshly covers hidden/clip/paint/shape clipping.

P0-070/P0-075/P1-167 remain supporting architecture/boundedness context only.

## External context

W3C CSS Overflow Level 3 defines clipping semantics for hidden/clip. CSS Containment Level 2 requires paint containment to clip contents to the overflow clip edge, effectively applying clip semantics to visible overflow. Chromium issue `546627207` is a separate page-boundary print bug and is not the C30 root. html2canvas #3273 is an analogous capture-visible-slice report under a different raster contract.

Detailed evidence: `RESEARCH_FULL_RESTART_C30_CLIPPING_CONTAINMENT_2026-09-02.md`.
