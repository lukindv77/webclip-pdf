# C21 lazy/offscreen resource evidence receipt — 2026-09-02

Status: **durable exact-evidence receipt**. `RESEARCH_REGISTRY.md` remains the sole current P-owner/status authority.

This receipt accompanies `RESEARCH_FULL_RESTART_C21_LAZY_OFFSCREEN_RESOURCES_2026-09-02.md` and binds the fresh C21 classification to exact current-source and physical evidence without duplicating the full matrix.

## Exact source baseline

- canonical C21 baseline: `main = c7f0416c356c7c6cca787bffcee00f68312ada4e`;
- exact `content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- runtime/product source is unchanged by this research tranche.

## Accepted physical evidence

- workflow run: `33602471295`;
- job: `100159038407`;
- exact accepted workflow head: `aa3d291b83f5727e5f3db15d9c0052ccc294feab`;
- browser: Google Chrome `151.0.7922.173`;
- conclusion: **SUCCESS**;
- primary raw result SHA-256: `3d78c8ba76617536baea85c765106049c61378fdcc7640117a371d76da43d614`;
- focused picture-control SHA-256: `93f688c8da66f853463bd6928ef5df5fb8082c8b1822ecc972ae0cd7bb27cfbd`.

Fresh positive controls show that WebClip prepares and physically prints far-offscreen native `IMG[loading=lazy]`, `IMG[data-src]`, `IMG[data-srcset]`, and an accessible same-origin-frame native lazy image without auto-scrolling the page. Each delayed asset moves from no request / no usable image to one request, decoded `220×140` image state and the expected physical PDF color signal.

The focused `<picture><source data-srcset>` case is a current finding: WebClip requests and completes the expected orange candidate and reports the resource set clean (`failed=0`), but the owning IMG remains on its transparent fallback `currentSrc`; the physical PDF contains zero expected orange pixels. An additional 2.5-second settlement wait does not change that state. Test-only final-IMG materialization of the already-known candidate restores the expected `220×140` current image and `17,056` orange pixels in the PDF.

## Owner reconciliation

No new P-code is allocated. The failure maps directly to **P1-003 ACTIVE**, whose current invariant requires bounded readiness of the actual renderer-selected visual resource graph rather than mere completion of a candidate URL load.

C09 responsive-image findings are adjacent context but do not create a second owner. P0-070/P0-075 remain supporting generation/isolation context. P1-187 is not implicated because the failing fixture is top-document, not a flattened secondary representation. P1-167/C38 and P1-230/C22/C23 are not exercised by this bounded matrix.

## Integrated classification

**C21 — `L4-REVALIDATED / FINDING + POSITIVE/NATIVE/CUSTOM/FRAME/SETTLED/CAUSAL CONTROLS (P1-003)`**.

No Registry wording/status, manifest/version, release-readiness, build, tag or GitHub Release change is made by this evidence tranche. After integration, C22 is the next sequential coordinate.
