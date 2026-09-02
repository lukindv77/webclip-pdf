# WebClip — fresh full-project research — C20 Nested scroll / retained scrollports — 2026-09-02

Date: 2026-09-02
Canonical source baseline: `ae2f6110901471b5a9968cc77c3a58dffe3d7700`
Exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`
Scope: focused fresh-restart coordinate **C20 — Nested scroll / retained scrollports**.

## Result

**C20: `L4-REVALIDATED / FINDING + POSITIVE/SCROLL-POSITION/NESTED/CAUSAL CONTROLS (P0-004)`.**

Fresh exact-source Chrome evidence proves that current selected-only preparation leaves ordinary top-document `overflow:auto` scrollports physically viewport-bounded. Already-existing selected DOM content beyond the retained scrollport is silently omitted from a valid PDF, and changing `scrollTop` changes which middle slice is serialized. A test-only static expansion of the exact same prepared nested scrollports restores the complete selected content.

This is a fresh current-source revalidation of **P0-004 ACTIVE**, not a new P-code. Runtime, manifest/version, release readiness, build/tag/Release and Registry status are unchanged by this research tranche.

## 1. Bounded question

C20 asks whether already-existing selected content inside ordinary retained scrollports is represented as complete static flow for the current primary PDF, including nested scroll containers, or whether Chromium receives the live scroll viewport and serializes only its current visible slice.

This tranche deliberately excludes:

- new logical content created only by further scrolling — C22;
- virtualized/windowed history and recycled nodes — C23 / P1-230;
- lazy/offscreen resource readiness — C21 / P1-003;
- special clipping/paint-containment variants beyond ordinary scrollports — broader P0-004/C30;
- detailed physical page-break quality — C32.

All C20 rows exist in the DOM before selection and remain mounted throughout the run.

## 2. Current product contract

`WEBCLIP_PDF_FIDELITY_CONTRACT.md` explicitly places already-existing content behind ordinary scrolling inside the PDF completeness envelope. The contract names `overflow:auto`, `overflow:scroll`, nested scroll containers and already-existing panels/lists as content that may be converted to complete static flow. Scrollbars themselves need not be preserved, but content and ordering must not be silently lost.

The separate dynamic-scroll rule limits WebClip from auto-scrolling to create new logical content. That boundary does not apply to the finite mounted C20 fixtures.

Therefore the current contract no longer leaves C20 as a P2-007 “current viewport versus expanded copy” ambiguity: for the primary faithful static PDF, already-existing scrollport content is expected to remain readable in the saved artifact or the result must be truthfully degraded/partial/unknown.

## 3. Fresh current-source inspection

Current `content.js` has an explicit print-flow normalization path for selected frames and their frame ancestor chain. `applySelectedFramePrintFlow()` sets frame/chain overflow visible, removes max-height/clipping/containment constraints and stabilizes selected iframe height.

That special path is keyed to frame handling (`FRAME_INCLUDE_ATTR` / `FRAME_CHAIN_ATTR`) and is invoked for selected iframe elements and their DOM ancestor chain.

Fresh inspection does not find an equivalent general pass that detects arbitrary selected/top-document scroll containers or retained non-frame ancestors with `overflow:auto` / `overflow:scroll` and expands their scrollable block content into static flow. The selected-only CSS retains ancestors needed to contain an Include, but retaining an ordinary scrollport also retains its clipping viewport unless some other mutation changes it.

This source observation is only the hypothesis. The physical matrix below controls the C20 classification.

## 4. Fresh physical evidence

Accepted exact-source execution:

- workflow: `Research C20 nested scroll`;
- run: `33601196091`;
- job: `100155044941`;
- exact run head: `7b48bd919e0ce6a16457893d50346abb0c929306`;
- browser: Google Chrome `151.0.7922.173`;
- conclusion: **SUCCESS**;
- raw result SHA-256: `a58e76e49b94dd52f95257e507c1220b66c656d6222b21896ccb15104e78a89f`;
- exact source receipt: `content.js` Git blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- durable harness: `project_tools/research_c20_nested_scroll.py`.

The harness drives actual current `content.js` selection, Exclude and download/preparation behavior, holds the mocked worker PDF reply, uses screen media to match the worker’s renderer-media posture, physically generates Chromium PDFs, and inspects PDF text with `pypdf`. Raw JSON is emitted before interpretation assertions.

### 4.1 Native normal-flow positive control

The same 120 mounted rows are printed directly in ordinary normal flow without a retained scrollport.

Observed:

- 120/120 unique row tokens;
- FIRST/MIDDLE/LAST all present;
- 5 pages;
- PDF SHA-256 `94c7256db70119fd974d8ee503017caeb3f7214c41ff3f29da5642aed951ce4f`.

This proves the fixture is physically printable and rejects a generic Chrome inability to paginate its content volume.

### 4.2 Selecting the scroll container itself still serializes only its viewport

Fixture:

- one selected `section` with `height:360px; overflow:auto`;
- 120 already-mounted rows inside it;
- one explicit Exclude;
- unselected top and bottom controls outside the selection.

Prepared geometry:

- `clientHeight = 354`;
- `scrollHeight = 5056`;
- `scrollTop = 0`;
- computed `overflow = auto`;
- computed height remains `360px`.

Physical PDF:

- only 8/120 row tokens (`1…8`);
- FIRST present;
- MIDDLE and LAST absent;
- 1 page;
- explicit Exclude absent;
- both outside controls absent;
- PDF SHA-256 `6856d2a34d750f9b665236cf9f99597f4762e213999fe4c2dc73364e94b50f2b`.

The selection boundary itself is correct; completeness beyond the live scroll viewport is not.

### 4.3 A retained scroll ancestor clips a selected descendant — P0-004 direct owner shape

The Include is moved from the scrollbox to the long `<article>` inside it. The ancestor remains required for the selected DOM chain and therefore stays in the prepared document.

Prepared ancestor geometry is again `clientHeight=354`, `scrollHeight=5056`, `overflow=auto`.

Physical PDF again contains only 8/120 rows (`1…8`), with FIRST present and MIDDLE/LAST absent, while Exclude and outside controls remain correctly absent.

PDF SHA-256: `7ba4322be16edfe16b8e0721e262a377fe6b9c3e94a21fc791f34799aa51f3c0`.

This is the exact canonical **P0-004** root shape: a page-owned retained ancestor clips admitted selected descendants.

### 4.4 Current `scrollTop` chooses a different physical slice

The same descendant-in-scroll-ancestor fixture is scrolled before selection/save. The browser settles the requested offset at `scrollTop=2404`.

Physical PDF:

- 8/120 rows;
- first extracted row `58`;
- last extracted row `65`;
- MIDDLE sentinel present;
- FIRST and LAST absent;
- 1 page;
- PDF SHA-256 `6989a1911aa969fd9f71aa389d84a6cb5d618ad3b0537c4ae6b24d2c8638ad8d`.

Thus the missing content is not merely a fixed “tail clipping” effect. The physical artifact follows the retained live viewport slice.

### 4.5 Nested scrollports reproduce the same failure through two retained viewports

The long selected article is placed inside an inner `height:300px; overflow:auto` scrollbox, itself inside an outer `height:440px; overflow:auto` scrollbox. The inner scrollport is positioned in the middle before save.

Before the physical cut:

- inner `clientHeight = 294`;
- inner `scrollHeight = 5056`;
- inner `scrollTop = 1164`;
- both containers retain computed `overflow=auto`.

Physical PDF:

- 7/120 rows;
- rows `28…34` only;
- FIRST/MIDDLE/LAST all absent;
- 1 page;
- Exclude and outside controls absent;
- PDF SHA-256 `8526affd75139e9a018c404a5819158738becacb9f1d11aceaa2ffed65ca217f`.

This is a direct C20 nested-scroll failure, not inference from a one-level scrollbox.

### 4.6 Causal static expansion restores the complete nested selection

After the exact same normal WebClip preparation, the test-only causal control changes only the two retained scroll containers to static-flow-compatible geometry:

- `height:auto`;
- `max-height:none`;
- `overflow/overflow-x/overflow-y:visible`.

The inner container then exposes approximately `5056px` of mounted content and the outer expands to approximately `5102px` client height.

Physical PDF:

- 120/120 rows;
- FIRST/MIDDLE/LAST all present;
- 6 pages;
- Exclude absent;
- outside controls absent;
- PDF SHA-256 `3dfe19d75cdfbe99ced237a359754fe6d7e1245ae1520c6780e66ebc8b9ea1b1`.

This causal control rules out missing DOM, Exclude semantics, generic renderer capacity and selection-filter failure. The discriminator is the retained scrollport representation.

## 5. External standards / browser / comparable-tool research

External sources are architecture and failure-mode input only; fresh WebClip source plus the exact Chrome matrix above determines the C20 verdict.

### 5.1 CSS Overflow Level 3 leaves print overflow handling insufficient as an archival guarantee

The current W3C CSS Overflow Module Level 3 defines `scroll`/`auto` as scroll-container behavior and explicitly notes that scrolling is not possible in static media. It advises authors to make content accessible for print and says overflowing content of a `scroll` container *may* be printed, without defining where it is printed.

Reference:

- https://www.w3.org/TR/css-overflow-3/

For WebClip this means browser CSS semantics do not provide a completeness guarantee strong enough for the product contract. A valid UA choice cannot substitute for WebClip’s explicit complete-static-copy semantics.

### 5.2 Current Chromium printing remains version-sensitive

Chromium issue `546627207` reports a current Print-to-PDF text-clipping regression at a physical page boundary in Canary 153. It is not the C20 root cause, but it reinforces why a historical browser outcome or a parseable PDF cannot be treated as permanent completeness proof.

Reference:

- https://issues.chromium.org/issues/546627207

### 5.3 Other capture tools expose the same need for an explicit scroll-container contract

A 2025 html2canvas issue reports a large scrolling DIV being captured only for the visible portion and asks how to capture the full content. html2canvas is raster-oriented and therefore not a WebClip design template, but the user-visible failure mode is directly analogous: a finite mounted scroll container cannot be assumed to expand merely because it is being captured.

Reference:

- https://github.com/niklasvh/html2canvas/issues/3273

Recent SingleFile user reports about infinite/virtualized scrolling describe saved pages retaining only loaded/visible segments even after manual scrolling. Those reports are adjacent C22/C23 evidence, not direct C20 proof, because they mix dynamic loading/virtualization with ordinary scrolling. They are useful mainly for preserving the boundary between finite mounted scrollports (C20) and user-reached dynamic history (P1-230).

References:

- https://github.com/gildas-lormeau/SingleFile/issues/1931
- https://github.com/gildas-lormeau/SingleFile/discussions/1737

## 6. Duplicate / root-cause reconciliation

### P0-004 — primary current owner

Current Registry wording already requires selected PDF fidelity to remain complete when ordinary page-owned ancestor layout/clipping/positioning/visual effects would otherwise truncate included descendants.

The fresh C20 one-level descendant, scroll-position and nested cases are direct instances of that same owner. No new P-code is allocated and P0-004 remains ACTIVE without wording change.

Historical 2026-08-30 long-page/top-layer evidence had already reproduced ordinary `overflow:auto` clipping and static-expansion controls under P0-004. It was used only to find the old root and avoid duplicate ownership; it did not advance fresh C20. The accepted run `33601196091` independently revalidates the issue against current source and Chrome 151.

### P1-230 — explicitly not this finding

P1-230 owns generation-bound logical content materialized/seen through dynamic or virtualized user scrolling, including scroll-back and DOM recycling. Every C20 row is present and mounted before capture; no node is generated, recycled or recovered from history. P1-230 is therefore not revalidated by C20.

### P2-007 — mode ambiguity no longer blocks C20 classification

P2-007 remains the backlog owner for multiple explicit capture/output modes. But the current primary PDF fidelity contract has already chosen complete static treatment for ordinary existing scroll content. C20 is therefore a current-contract defect rather than an unresolved product-choice question.

### Adjacent support owners

P0-070 remains relevant to truthful end-to-end success, P1-167 to bounded materialization work, and P0-075 to isolation from hostile live-page mutation. This focused C20 tranche does not change their Registry status or claim a separate fresh acceptance result for them.

## 7. Architecture implications

The evidence supports an explicit **retained-scrollport materialization layer** before pagination rather than relying on Chromium to choose how static media handles a live scroll container.

A candidate implementation direction under P0-004 is:

1. identify selected elements and retained ancestors whose effective block-axis scroll viewport hides already-mounted selected descendants;
2. operate on a WebClip-owned/static representation where possible rather than delegating correctness to mutable page print CSS;
3. expand only the clipping/scroll constructs required for admitted completeness, preserving meaningful width/layout/style dependencies;
4. compose through nested scrollports from inner to outer and retain absolute Exclude priority;
5. use finite node/layout/mutation/time budgets and settle as partial/degraded/unknown when safe convergence cannot be proven;
6. keep dynamic item creation and virtualized-history recovery out of this pass — those remain C22/C23/P1-230.

C20 does **not** justify blindly setting `overflow:visible` on every element. Historical positive controls and broader P0-004 evidence show that height, containment, positioning and overflow interact; a future implementation needs dependency-aware normalization and regressions for layout changes introduced by expansion.

## 8. Pipeline mapping

- **B1 User Intent:** user selects finite already-existing content inside one or more scroll containers.
- **B2 Admission:** actual current Include/Exclude state; scroll position is observed but does not shrink logical completeness for ordinary mounted content.
- **B3 Capture:** all required row nodes already exist and remain connected.
- **B4 Static Materialization:** current implementation retains live scrollport geometry; causal control expands it to complete static flow.
- **B5 Renderer:** Chrome 151 physically serializes the retained viewport slice versus the expanded complete flow.
- **B6 Physical Artifact:** current cases lose 112–113 of 120 rows; causal/native controls retain all 120.
- **B7–B9:** not independently exercised by this focused tranche.

## 9. Verdict and next checkpoint

Fresh C20 verdict:

**`L4-REVALIDATED / FINDING + POSITIVE/SCROLL-POSITION/NESTED/CAUSAL CONTROLS (P0-004)`**.

The current primary PDF silently serializes only the live viewport slice of ordinary retained scroll containers even though all selected content already exists in the DOM. A scrolled viewport changes the selected slice, nested scrollports reproduce the loss, and test-only static expansion restores the exact full selection.

Required durable integration for this tranche:

- advance the C20 restart matrix row to this classification;
- retain this evidence and the reproduction harness;
- do not allocate or modify a P-code;
- leave runtime/product code unchanged;
- keep release readiness `NOT READY` and manifest/runtime `0.9.8`.

After C20 integration, the next sequential fresh-restart coordinate is **C21 — Lazy/offscreen resources already belonging to content**.
