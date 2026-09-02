# C31 compact evidence — fixed / sticky — 2026-09-02

Canonical source baseline: `2b47d4f47a90882b2c3466e8af9f5b7b8477a015`  
Exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`.

## Classification

**`L4-REVALIDATED / FINDING + POSITIVE/FIXED-REPEAT/STICKY/TRANSFORMED/FRAME/CAUSAL CONTROLS (P0-004; P1-187 supporting)`**.

No new P-code; no Registry wording/status change.

## Accepted physical evidence

- Chrome `151.0.7922.173`;
- workflow run `33636534741`;
- job `100268696867`;
- exact workflow head `a3ee43fa8e03219023b7240095c7b8f7d5a414ff`;
- conclusion SUCCESS;
- raw receipt commit `cc3fc3980be89db7671727fe2f18c3495bd0f952`;
- raw result SHA-256 `94775265ccf4c4992cfcda162d1625f160d2f931d8fcaae847f9e376b207899c`;
- durable harness `project_tools/research_c31_fixed_sticky.py`.

## Fresh result matrix

- top selected fixed descendant: remains `position:fixed`; 120/120 rows complete; **fixed token 6× on 6 pages**;
- top selected sticky descendant: sticky token **1×**;
- fixed descendant inside transformed containing block: token **1×**;
- unselected fixed sibling: token **0×**;
- test-only static normalization of top fixed: token **1×**;
- same-origin BODY flattened proxy: fixed and sticky descendants become computed `static`; each token **1×**, all 120 frame rows complete.

Exclude/outside controls remain absent in relevant WebClip outputs.

## Root cause

Current top selected-only representation preserves authored fixed/sticky positioning. Chromium then applies normal paged-media fixed repetition. The current PDF product contract explicitly prefers one meaningful static placement for ordinary decorative/navigation fixed/sticky content when literal pagination would repeat/overlap.

Current same-origin secondary representation already uses a different policy by static-normalizing fixed/sticky/absolute descendants. Thus the direct top failure maps to **P0-004 ACTIVE**, with **P1-187 ACTIVE** receiving supporting frame-parity evidence.

## External context

CSS fixed positioning in paged media is historically specified to repeat fixed boxes on every page. CSSWG issue #12481 (2025) explicitly documents the resulting overwrite/clipping problem and questions that default. Current snapDOM history contains dedicated sticky support and fixed-in-scroll-wrapper fixes, illustrating that capture engines need explicit positioned-state semantics.

Detailed evidence: `RESEARCH_FULL_RESTART_C31_FIXED_STICKY_2026-09-02.md`.
