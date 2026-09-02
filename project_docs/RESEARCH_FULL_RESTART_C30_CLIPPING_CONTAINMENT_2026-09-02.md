# WebClip — fresh full-project research — C30 Clipping / overflow / paint containment — 2026-09-02

Date: 2026-09-02  
Canonical source baseline: `cd0f1d6aaf5bc874a2b8e791c2c0fd2c6a52fbd0`  
Exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`  
Scope: fresh-restart coordinate **C30 — Clipping / overflow / paint containment**.

## Result

**C30: `L4-REVALIDATED / FINDING + POSITIVE/HIDDEN/CLIP/PAINT/CLIP-PATH/CAUSAL CONTROLS (P0-004)`.**

Fresh exact-source Chrome evidence proves that current selected-only top-document PDF preparation leaves ordinary page-owned clipping/paint bounds intact around an Include. Already-mounted selected descendants are therefore physically truncated by `overflow:hidden`, `overflow:clip`, and `contain:paint`, even when `overflow` is otherwise `visible`. A separate `clip-path` control also loses selected content, but with a different fragmentation/shape pattern and is retained only as a supporting clipping variant.

The broad hypothesis “height/containment itself is unsafe” is rejected: `contain:layout` without a clipping bound and `max-height:360px` with `overflow:visible` preserve all tested content. Test-only normalization of the same prepared hidden/paint fixtures to auto-height, visible overflow and `contain:none` restores all selected rows. No new P-code is required: this is a direct fresh revalidation of **P0-004 ACTIVE**.

Runtime, manifest/version, Registry wording/status, release readiness, build/tag/Release are unchanged.

## 1. Bounded question

C30 asks whether ordinary page-owned clipping and paint-containment constructs can silently truncate already-existing selected content in the final PDF after current WebClip Include/Exclude preparation.

The tranche deliberately separates C30 from C20:

- C20 already established retained `overflow:auto` / nested scrollport completeness failures;
- C30 focuses on non-scroll clipping and paint bounds: `overflow:hidden`, `overflow:clip`, `contain:paint`, and `clip-path`;
- non-clipping controls establish that a finite box height or containment keyword is not sufficient by itself to classify a defect.

All fixture rows exist in the DOM before selection. There is no lazy logical growth, virtualization, frame boundary, resource delay or page-owned dynamic materialization.

## 2. Fresh current-source inspection

Current `installPrintStylesForSelectionDocuments()` normalizes the root `html, body` to visible/static/uncontained flow and hides ordinary unselected descendants through a selector that retains Includes, descendants and ancestors via `:has([data-webclip-pdf-include])`.

However, ordinary selected ancestors are not given the frame-specific print-flow normalization. The dedicated override:

`[FRAME_INCLUDE_ATTR], :has(> [FRAME_INCLUDE_ATTR]), [FRAME_CHAIN_ATTR] { overflow: visible !important; max-height: none !important; }`

is frame-specific. An ordinary ancestor kept alive only because it contains an Include retains its authored `overflow`, `contain`, `clip-path`, fixed/max height and related paint bounds.

Current diagnostics already record relevant signals including `overflowX`, `overflowY`, `contain`, sizing and a bounded ancestor chain. They are telemetry: current source does not convert those clipping-risk signals into a complete static representation or a partial/degraded/error gate before byte success.

This source shape predicts a P0-004 physical completeness failure without requiring a new owner.

## 3. Fresh physical evidence

Accepted execution:

- workflow: `Research C30 clipping containment`;
- run: `33635043627`;
- job: `100263691851`;
- exact workflow head: `6969bcbfcf07d46fddf559fb1fe50dbe5f487ed3`;
- browser: Google Chrome `151.0.7922.173`;
- conclusion: **SUCCESS**;
- exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- raw result SHA-256: `b45411ad9a8abdba69b438c29b69007714ccf7618879864918e562629f34dfca`;
- raw receipt commit: `c44182fb578e9e652b39e61890160e9c8f4ca3de`;
- durable harness: `project_tools/research_c30_clipping_containment.py`.

The selected article contains 120 mounted 42px rows with FIRST/MIDDLE/LAST sentinels and an explicit early Exclude. Outside top/bottom controls must remain absent from WebClip PDFs.

### 3.1 Direct normal-flow positive control

Direct Chrome prints all `120/120` rows, FIRST/MIDDLE/LAST, across 5 pages.

PDF SHA-256: `84f2ea2b5ffd57c2f789754038b4301a1cb5c1493726e416e76c124151051224`.

This proves the selected content is physically printable and establishes the renderer control.

### 3.2 `overflow:hidden` ancestor — 8/120

Prepared ancestor geometry:

- client height `354px`;
- scroll height `5056px`;
- `overflow:hidden`;
- height `360px`.

Physical PDF:

- `8/120` rows;
- rows 1…8 only;
- FIRST present;
- MIDDLE/LAST absent;
- 1 page;
- Exclude and outside controls absent.

PDF SHA-256: `a5cbda0ea619c72fd34400dfe66535e66e217ed2f40b1efaf68fb4e6ccd0e627`.

### 3.3 `overflow:clip` ancestor — 8/120

With the same 360px geometry but `overflow:clip`, the physical result is again `8/120`, FIRST only, one page, with MIDDLE/LAST absent.

PDF SHA-256: `2d04c60fe55e1f69ca1aab835492757027fd63e8c5dda87180420df1aebec975`.

The result is consistent with the standards distinction: `clip` clips at the overflow clip edge and is not a scroll container.

### 3.4 `contain:paint` + `overflow:visible` — 8/120

Prepared ancestor:

- client height `354px`;
- scroll height `5048px`;
- authored `overflow:visible`;
- `contain:paint`;
- height `360px`.

Physical PDF still contains only rows 1…8; MIDDLE/LAST are absent and output is one page.

PDF SHA-256: `f93a05c7993134a05083e27661fab9ccbdc40103d7c9b947e5e6a5cc852efb4d`.

This is a critical C30 discriminator: checking only `overflow` for a clipping-looking value is insufficient. Paint containment itself imposes a paint clip.

### 3.5 `clip-path:inset(0)` — supporting shape-clipping variant

The 360px ancestor keeps `overflow:visible` and no containment, but uses `clip-path:inset(0)`.

Physical PDF contains 40 unique row tokens across 5 pages, includes FIRST and MIDDLE, but omits LAST. This is not the same 8-row viewport slice as hidden/clip/paint. It is retained as a separate shape/fragmentation clipping variant rather than being used to redefine the core root cause.

PDF SHA-256: `bb1b8aa4cd487fa8386db7cc3fc6a824889d7a2a4f3e96dc2f463704e24ae3ea`.

### 3.6 `contain:layout` — complete positive control

A non-clipping `contain:layout; overflow:visible` ancestor grows to the selected content (`~5056px` client height).

Physical PDF preserves `120/120`, FIRST/MIDDLE/LAST, 5 pages, while Exclude/outside controls remain absent.

PDF SHA-256: `afcdb83a96ec6192287031b730ce703c5339994773d229f0e5e874060c27faac`.

Do not generalize `contain:paint` into “all containment is unsafe”.

### 3.7 `max-height:360px; overflow:visible` — complete positive control

The ancestor's layout/client height is `354px` and scroll height is `5048px`, but overflow remains visible.

Physical PDF preserves all `120/120` rows and FIRST/MIDDLE/LAST across 5 pages.

PDF SHA-256: `0cf2c278667019a468394f0ea8573f74d0695e45570c5fd23a50064b1a5874d3`.

Therefore finite/max-height geometry by itself is not evidence of physical truncation; effective paint/clipping semantics matter.

### 3.8 Causal normalization restores hidden and paint cases

After normal current WebClip preparation, the test-only causal control changes only the retained clipping ancestor to:

- `height:auto`;
- `max-height:none`;
- `overflow/overflow-x/overflow-y:visible`;
- `contain:none`;
- `clip-path:none`.

For both the original `overflow:hidden` and `contain:paint` fixtures, physical PDF then preserves `120/120`, FIRST/MIDDLE/LAST and 5 pages, with Exclude/outside controls still absent.

Hidden-causal PDF SHA-256: `3f37b1f26d4a47393518ff5a03e5d024e3f20cf218099bfdf2043593c16750b9`.

Paint-causal PDF SHA-256: `2228906fcb4f141ff4cf565d1f00c0700325c98ccbb2ac210643229d531e6ddd`.

The causal result isolates retained clipping/paint representation as the physical loss mechanism.

## 4. Standards and external comparison

### CSS Overflow Module Level 3

W3C CSS Overflow Level 3 defines `overflow-x/y` as controlling whether overflow is clipped and whether a box becomes a scroll container. It separately defines `overflow:clip` and the overflow clip edge.

Reference: https://www.w3.org/TR/css-overflow-3/

This is standards context for why current page-owned clipping remains meaningful in print; it is not itself a WebClip requirement.

### CSS Containment Module Level 2

W3C CSS Containment Level 2 states that paint containment clips contents, including ink and scrollable overflow, to the paint containment box's overflow clip edge. It explicitly describes paint containment as effectively turning visible overflow into clip at used-value time for this purpose.

Reference: https://www.w3.org/TR/css-contain-2/

This exactly matches the fresh `contain:paint + overflow:visible` physical discriminator.

### Chromium issue 546627207 — separate print bug, not the C30 root

A current Chromium printing issue reports text missing at a page boundary in Chrome Canary 153 even though text can remain in the PDF text layer. That is useful evidence that print clipping remains version-sensitive, but it is a separate renderer/page-boundary problem. C30 reproduces deterministic WebClip-selected ancestor clipping and includes causal representation controls, so it is not assigned to that Chromium bug.

Reference: https://issues.chromium.org/issues/546627207

### html2canvas issue #3273 — analogous visible-slice capture

A recent html2canvas issue reports only the visible part of a scrollable DIV being captured. Its raster capture contract differs from WebClip PDF, so it is only an analogous failure mode. The transferable lesson is that capture engines must explicitly decide whether retained viewport clipping represents current view or complete selected content.

Reference: https://github.com/niklasvh/html2canvas/issues/3273

## 5. Duplicate/root-cause reconciliation

### P0-004 — primary owner

Current P0-004 already requires selected PDF fidelity to remain complete and selection-bounded despite page-owned ancestor layout/clipping/positioning/visual effects.

C30 is an exact fit:

- selected descendants are already mounted;
- ordinary ancestor remains in final live representation because it contains Include;
- page-owned clipping/paint semantics physically truncate selected descendants;
- positive controls show the renderer can print all rows;
- causal removal of the clipping bound restores all rows.

No new P-code is justified and no Registry wording/status change is required.

### C20 — adjacent, not duplicate evidence

C20 focused retained scrollports, scroll position and nested `overflow:auto`. C30 expands the current fresh evidence to `hidden`, `clip`, paint containment and shape clipping. Both map to P0-004, but C30 is not credited from C20 by inference.

### P0-070 / P0-075 / P1-167 — supporting architecture only

P0-070 remains relevant to truthful final artifact identity and P0-075 to future isolated representation. P1-167 governs the budget of any dependency-aware normalization/materialization pass. None is needed as an additional primary C30 owner.

## 6. Architecture implication

A robust faithful-static implementation should not blindly set every ancestor to `overflow:visible` or `contain:none`; that would destroy intentional visual semantics.

The required direction is a bounded dependency-aware static representation that can distinguish:

- selected content physically clipped by a retained page-owned bound and therefore incomplete under the current completeness contract;
- non-clipping height/layout constraints that can remain as-is;
- visual clipping that is part of an explicitly chosen visual/current-view mode;
- cases whose correct static representation cannot be proven within node/time/layout/mutation budgets and must be reported partial/degraded/unknown.

The existing diagnostics already expose several required inputs, but byte success plus telemetry is not a completeness receipt.

## 7. Pipeline mapping

- **B1 User Intent:** Include a mounted long descendant; Exclude remains absolute.
- **B2 Admission:** exact current top-document selection and page-owned clipping state.
- **B3 Capture:** current source observes selected DOM and ancestor styles but does not materialize ordinary clipping dependencies.
- **B4 Static Materialization:** live selected-only representation retains hidden/clip/paint/clip-path bounds.
- **B5 Renderer:** Chrome correctly applies those retained clipping semantics.
- **B6 Physical Artifact:** hidden/clip/paint lose 112/120 rows; shape clip loses a different subset; positive/causal controls preserve complete content.
- **B7–B9:** not independently exercised by this focused tranche.

## 8. Verdict

Fresh C30 classification:

**`L4-REVALIDATED / FINDING + POSITIVE/HIDDEN/CLIP/PAINT/CLIP-PATH/CAUSAL CONTROLS (P0-004)`**.

No new P-code; production source/version/release state unchanged. After C30 integration, the next sequential coordinate is **C31 — Fixed / sticky**.
