# C20 nested scroll / retained scrollports — exact evidence receipt — 2026-09-02

Status: **durable exact-evidence receipt**. `RESEARCH_REGISTRY.md` remains the sole current P-owner/status authority.

## Exact source baseline

- canonical tranche baseline: `main = ae2f6110901471b5a9968cc77c3a58dffe3d7700`;
- exact `content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- current product contract: already-existing selected content inside `overflow:auto` / `overflow:scroll` and nested scroll containers belongs to the primary PDF completeness envelope.

## Accepted physical evidence

- workflow run: `33601196091`;
- job: `100155044941`;
- exact evidence head: `7b48bd919e0ce6a16457893d50346abb0c929306`;
- browser: Google Chrome `151.0.7922.173`;
- conclusion: **SUCCESS**;
- raw result SHA-256: `a58e76e49b94dd52f95257e507c1220b66c656d6222b21896ccb15104e78a89f`;
- durable harness: `project_tools/research_c20_nested_scroll.py`.

Physical discriminators:

- direct normal-flow control: `120/120`, FIRST/MIDDLE/LAST present, 5 pages;
- selected `height:360px; overflow:auto` scrollbox: `8/120` (`1…8`), LAST absent, 1 page;
- selected descendant behind the retained scroll ancestor: `8/120` (`1…8`), LAST absent, 1 page;
- same ancestor at `scrollTop=2404`: `8/120` (`58…65`), proving the physical artifact follows the current viewport slice;
- nested current scrollports: `7/120` (`28…34`), FIRST/MIDDLE/LAST absent, 1 page;
- same nested selection after test-only static expansion of both retained scrollports: `120/120`, FIRST/MIDDLE/LAST present, 6 pages.

In all WebClip-shaped cases the explicit Exclude and unselected top/bottom controls remain absent, so the failure is completeness inside the selected representation rather than selection-boundary leakage.

## Owner reconciliation

No new P-code is allocated.

**P0-004 ACTIVE** is the exact current owner: page-owned retained ancestor clipping/layout must not silently truncate admitted selected descendants in the physical PDF.

The fresh C20 evidence independently revalidates that owner on current source. Historical 2026-08-30 scroll-container evidence was used only for duplicate/root-cause lookup.

**P1-230 ACTIVE** is not exercised: all C20 nodes already exist and remain mounted; no dynamic creation, virtualization recycling or historical reconstruction occurs.

**P2-007 BACKLOG** remains the multi-mode architecture owner, but the current primary PDF contract already resolves ordinary existing scroll content in favor of complete static representation, so C20 is not blocked on a mode decision.

## Integrated classification

**C20 — `L4-REVALIDATED / FINDING + POSITIVE/SCROLL-POSITION/NESTED/CAUSAL CONTROLS (P0-004)`**.

No runtime source, manifest/version, P-owner status, build/tag/GitHub Release or release-readiness state is changed by this evidence receipt.
