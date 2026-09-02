# C32 compact evidence — pagination / physical page breaks — 2026-09-02

Canonical source baseline: `dc068bf6a378f8846d57660303415d5761a32045`  
Exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`.

## Classification

**`L4-REVALIDATED / FINDING + POSITIVE/FORCED/ROOT-OVERRIDE/DESCENDANT-AVOID/OVERSIZED/WIDOW-ORPHAN/FRAME/RASTER/CAUSAL CONTROLS (P1-187)`**.

No new P-code; no Registry wording/status change.

## Accepted physical evidence

- Chrome `151.0.7922.173`;
- workflow run `33647162999`;
- job `100304713322`;
- exact workflow head `e177f6cfc4e22972daf6bffe54ab5030b9883071`;
- conclusion SUCCESS;
- raw receipt commit `6afcc04a9dac0a8b9752cf024baf5b8e386bc6cb`;
- primary result SHA-256 `851c17097ccc32b83c4d59aadf8a92ecc3e72aded30545b6d16e0ef54bbf9cdf`;
- raster boundary result SHA-256 `af1430c3b7819b6d91210a68d25d0dc068366ee883a214d1cfa391cc47c1fa13`;
- durable harnesses:
  - `project_tools/research_c32_pagination_breaks.py`;
  - `project_tools/research_c32_visual_boundary.py`.

## Fresh matrix

- top descendant `break-before:page`: preserved; BEFORE page 1, AFTER/TAIL page 2;
- raster forced-boundary control: page 1 has `41,137` red / `0` green pixels, page 2 has `40,579` green / `0` red;
- Include-root authored `break-inside:avoid-page`: WebClip changes it to `auto`; complete 12-row block spans pages 1–2;
- causal reassertion of only root `avoid-page`: same complete block moves to page 2 only;
- descendant `break-inside:avoid-page`: preserved and complete on page 2;
- oversized avoided descendant: 80/80 rows complete across pages 2–5;
- `widows:6; orphans:6`: preserved; 18/18 lines split 11/7;
- direct frame source: `break-before=page`, `break-inside=avoid-page`, 2 pages;
- final same-origin BODY proxy: corresponding descendants compute `auto` / `auto`, all tokens on page 1.

Exclude/outside controls remain absent from relevant WebClip outputs.

## Root cause / ownership

The top path deliberately normalizes only the Include root to `break-inside:auto`; this is recorded as a current pagination-policy boundary, not a separate defect, because selected content/order remain complete and the current PDF contract permits page splitting to change.

The material fresh finding is the frame secondary representation: fragmentation state that remains effective in the direct source disappears because `FLATTENED_FRAME_STYLE_PROPERTIES` does not carry break/widow/orphan properties and the child stylesheet is not preserved as final authority.

This maps directly to **P1-187 ACTIVE** rendered-state fidelity. No new pagination owner is warranted.

## External context

- W3C CSS Fragmentation Level 3 defines forced breaks, avoid preferences, widows/orphans and fallback fragmentation for oversized content: https://www.w3.org/TR/css-break-3/
- Chromium issue `546627207` documents a separate Chrome 151/153 page-boundary visible-clipping risk even when text remains in the PDF text layer: https://issues.chromium.org/issues/546627207
- Paged.js issue #295 reports engine-specific `avoid-page` behavior: https://github.com/pagedjs/pagedjs/issues/295
- current WeasyPrint docs list page support for break-before/after/inside and widows/orphans: https://doc.courtbouillon.org/weasyprint/latest/api_reference.html

Detailed evidence: `RESEARCH_FULL_RESTART_C32_PAGINATION_BREAKS_2026-09-02.md`.
