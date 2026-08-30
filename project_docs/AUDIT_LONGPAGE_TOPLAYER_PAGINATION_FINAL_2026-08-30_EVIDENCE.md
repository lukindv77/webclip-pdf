# Final durable audit evidence — long-page / fixed / top-layer pagination fidelity — 2026-08-30

This file completes **Blocks 25–48** of the interruption-safe tranche whose Blocks 1–24 are preserved in `AUDIT_LONGPAGE_TOPLAYER_PAGINATION_2026-08-30_EVIDENCE.md`. Together the two files are the completed **48-block** tranche.

Canonical P-code owner/status authority remains exclusively in `AUDIT_REGISTRY.md`.

Exact fresh audited baseline: `main = a0325b25fc4c9d48ab41b8aa8f69b6b8f859891a`.

Managed Chromium: `144.0.7559.96`. Physical PDF probes use `Emulation.setEmulatedMedia({media:'screen'})` plus `Page.printToPDF(... transferMode:'ReturnAsStream')`, matching the current worker media/PDF shape. One explicit control switches only the emulated media to `print` to prove an author print expansion rule is capable of preventing the reproduced clipping when WebClip does not force screen media.

No runtime source, `AUDIT_REGISTRY.md`, manifest/version/build/tag/release artifact is changed by this tranche.

## Blocks 25–32 — ordinary scroll / clip / contain ancestor completeness

### Block 25 — ordinary `overflow:auto` ancestor truncates a complete included descendant

A non-positioned page-owned ancestor used `height:620px; overflow:auto`. Its child article carried the WebClip include marker and contained 140 mounted named paragraphs.

Exact screen-media PDF:

- **1 page**;
- only `OVAUTO_000` … `OVAUTO_020` present (**21/140**);
- `OVAUTO_139` absent.

This removes positioning/top-layer as a necessary condition. The direct P0-004 root cause is retained page-owned clipping/viewport layout around a complete selected descendant.

### Block 26 — current ordinary scroll position changes which selected content is saved

The same ordinary scroll container was set to a later `scrollTop` before print.

Exact PDF stayed **1 page** and contained only approximately `OVSCROLL_088` … `OVSCROLL_107` (**20/140**). The selected article still contained all 140 mounted paragraphs in the DOM.

Current nested scroll state therefore chooses a physical slice of selected content unless the output mode explicitly expands the retained scroll viewport.

### Block 27 — selecting the scroll container itself remains viewport-bounded

When the 620px `overflow:auto` element itself carried the include marker, exact PDF still produced **1 page** and only `SELFSCROLL_000` … `SELFSCROLL_020` (**21/140**).

This is an important product-mode boundary. If “faithful current view” means exactly the visible scroll viewport, this can be intentional. If selecting the container means “save all selected content”, it is incomplete. P2-007 must make that choice explicit; byte success alone cannot decide it.

### Block 28 — capture-only scroll expansion restores all mounted selected content

A positive control made the retained scroll ancestor auto-height / overflow-visible at capture time.

Exact PDF expanded to **5 pages** and contained all `OVSTATIC_000` … `OVSTATIC_139` (**140/140**).

The omitted paragraphs are physically printable; the loss is representation/flow policy.

### Block 29 — `overflow:clip` is equivalent selected-content loss

A retained `height:620px; overflow:clip` ancestor produced **1 page** and only `OVCLIP_000` … `OVCLIP_020` (**21/140**).

A future acceptance rule cannot look only for scrollbars or `overflow:auto`; paint/layout clipping classes must be considered under the same bounded ancestor dependency contract.

### Block 30 — `max-height` alone is a positive control when overflow remains visible

A retained ancestor with `max-height:620px` but `overflow:visible` produced **5 pages** and all 140 `MAXVIS_*` markers.

Therefore height constraints by themselves are not proof of truncation. The capture check must reason about effective clipping/paint containment, not use simplistic “height smaller than child” heuristics.

### Block 31 — `contain:paint` clips selected descendants even with `overflow:visible`

A retained ancestor used `height:620px; contain:paint; overflow:visible` around a 140-paragraph included article.

Exact PDF was **1 page** and contained only `CONPAINT_000` … `CONPAINT_020` (**21/140**).

This is a valuable refinement of P0-004: the ancestor can physically clip selected content without an overflow value that looks clipping-like.

A capture-only positive control that removed paint containment and the fixed height preserved all 140 paragraphs across **4 pages**.

### Block 32 — `contain:layout` is a positive counterexample

A corresponding `contain:layout` ancestor with no clipping height preserved all `CONLAYOUT_000` … `CONLAYOUT_139` across **5 pages**.

Do not generalize Block 31 into “all containment is unsafe”. The relevant acceptance is renderer-visible clipping/fragmentation semantics.

## Blocks 33–38 — top-layer scroll state + author print adaptation + fragmentation controls

### Block 33 — scrolled modal saves only its current middle slice

A long selected modal dialog had a live scroll offset before the physical cut.

The selected dialog reported a large internal content extent while exact PDF remained **1 page** and contained only `DSCROLL_049` … `DSCROLL_065` (**17/180**). Neither the beginning nor the ending article state was preserved.

This proves long top-layer content is not merely “first-page clipped”; its physical bytes track the current nested viewport slice.

### Block 34 — scrolled popover has the same slice semantics

The equivalent long selected popover, scrolled before print, produced **1 page** and only `PSCROLL_049` … `PSCROLL_064` (**16/180**).

Modal and popover therefore share the same archive-completeness boundary when admitted as live top-layer scroll boxes.

### Block 35 — forced screen media can suppress a site's own complete-static print adaptation

A fixed scroll shell defined an author `@media print` rule that converted itself to static/auto-height/overflow-visible.

Two direct controls on the exact same fixture:

- WebClip-style **screen media**: **1 page**, only `PRINTEXP_000` … `PRINTEXP_032` (**33/140**);
- explicit **print media**: **5 pages**, all `PRINTEXP_000` … `PRINTEXP_139` (**140/140**).

This extends the previously known “screen media can preserve fixed duplication” result into a direct **selected-content-loss** case. Forcing screen media is defensible against hostile/irrelevant site print CSS, but it means WebClip itself must own a safe paginated-flow policy rather than relying on site print adaptation.

### Block 36 — oversize `break-inside:avoid` is a positive Chromium fragmentation control

A giant included block containing 180 named paragraphs used `break-inside:avoid` while being far taller than one page.

Chromium generated **7 pages** and preserved all `BREAKGIANT_000` … `BREAKGIANT_179` plus start/end markers.

No generic “break-inside avoid causes clipping” defect is registered from this tranche.

### Block 37 — normalizing `contain:paint`/height restores complete flow: positive control

A dedicated control converted the retained paint-containing ancestor to `contain:none`, auto height and overflow-visible for capture.

All **140/140** `CPNORM_*` markers were preserved across **4 pages**.

### Block 38 — normalizing `overflow:hidden`/height also restores complete flow: positive control

A retained fixed-height `overflow:hidden` ancestor is a clipping case; capture-only conversion to auto height / overflow-visible preserved all **140/140** `OHNORM_*` markers across **4 pages**.

The correct direction is therefore a bounded representation policy for admitted ancestors, not acceptance of silent physical clipping.

## Blocks 39–44 — current diagnostics can observe the risk but do not gate save success

### Block 39 — current page diagnostics already collect the key selected/ancestor inputs

Fresh `content.js` `capturePageStructureDiagnostics()` records document/body scroll dimensions and text length. Per selection item it records rectangle, `scrollWidth`, `scrollHeight`, computed style and a bounded ancestor style chain (`PAGE_DIAGNOSTICS_MAX_ANCESTORS = 10`).

The instrumentation therefore has enough raw *signals* to notice many viewport/clipping mismatches, even though it is not yet a proof of PDF byte completeness.

### Block 40 — ordinary scroll-container physical repro contains a glaring diagnostic mismatch

Representative probe before print:

- selected article text: about **11,758 chars**;
- selected article `scrollHeight` / rendered height: about **4,135 px**;
- retained parent `scrollHeight`: about **4,151 px**;
- retained parent `clientHeight`: **620 px**;
- parent overflow: `auto`;
- whole document `scrollHeight`: only about **648 px**.

Physical PDF then contained only **21/140** named selected paragraphs.

This is a concrete example where the live structure exposes a large selected extent hidden behind a small retained viewport, yet the PDF is valid and one page long.

### Block 41 — `contain:paint` mismatch is visible even though overflow says `visible`

Representative paint-containment probe:

- selected article height: about **4,135 px**;
- retained ancestor client height: **620 px**;
- parent `overflow: visible`;
- parent `contain: paint`;
- document height: about **648 px**;
- physical PDF: only **21/140** named paragraphs.

A truthful detector therefore needs the existing style/dependency context, not just an overflow test.

### Block 42 — top-layer selected element exposes huge scroll extent versus tiny client viewport

Representative scrolled modal before print:

- selected dialog text: about **15,326 chars**;
- dialog `scrollHeight`: about **5,509 px**;
- dialog `clientHeight`: about **385 px**;
- document `scrollHeight`: only **441 px**;
- physical PDF: one middle slice (`DSCROLL_049` … `DSCROLL_065`).

The equivalent popover reported approximately **5,485 px** scroll height versus **361 px** client height and likewise printed only a middle slice.

### Block 43 — worker records print diagnostics after byte generation but does not use them as an admission gate

Fresh `service-worker.js` flow is explicit:

1. `generatePdfBlob(tabId)` returns the PDF bytes;
2. `collectPrintDiagnosticsForTab(tabId)` obtains the bounded snapshots;
3. `recordOperationStage(... 'copy-save' ...)` records `pdfBytes`, `pageAnalysis` and `printDiagnostics`;
4. local download/cache or Yandex cache/upload processing continues.

No source check in that path turns clipping-risk diagnostics into a failed/partial/unknown physical-copy outcome before the save pipeline proceeds.

### Block 44 — valid PDF bytes can therefore coexist with structurally incomplete selected content

The physical probes above return valid, parseable PDFs while losing 80–90% of named selected content in some long viewport/top-layer cases. Current diagnostics are telemetry, not a byte-level completeness receipt.

This directly refines the product priority “do not report success for degraded/unknown/incomplete result”. The existing owners are sufficient: P0-004 owns completeness, P0-070 owns full save-generation truth, and P2-007 owns the chosen current-view versus expanded/static semantics.

## Blocks 45–48 — duplicate/root-cause decision and final acceptance matrix

### Block 45 — duplicate check: no new fixed/sticky/top-layer P-code

Relevant prior evidence already owns adjacent dimensions:

- complex-layout tranche: small top-document fixed descendant repeats per page under screen media; sticky is a one-occurrence control; flattened frame fixed/sticky/absolute descendants are converted to static;
- capture-representation tranche: modal backdrop can be retained; open popover/modal top-layer state is not faithfully reproduced by raw clone;
- current registry P0-004 explicitly names ordinary page-owned ancestor layout/**clipping/positioning/visual effects** truncating included descendants or injecting ancestor presentation.

The new long-scroll/top-layer physical results are therefore a strong **P0-004 refinement**, not a distinct root cause. No `P1-230` or other new code is allocated.

### Block 46 — frame parity remains P1-187 support, not a second owner

Top-document direct printing currently keeps live viewport/top-layer semantics, while the flattened same-origin iframe representation already converts fixed/sticky/absolute descendants to static flow and loses browser-owned top-layer state.

Equivalent source content can therefore receive different archival semantics depending on frame placement. This is supporting P1-187 evidence; P0-004 remains the direct top-document selected-copy owner.

### Block 47 — bounded fix direction

A safe implementation must not blindly static-normalize every positioned node. Positive controls prove:

- ordinary sticky marker need not duplicate;
- fixed descendant inside a transformed containing block occurred once;
- long transformed selected flow fragmented completely;
- `max-height` with visible overflow and `contain:layout` controls were complete.

Required direction is a bounded, dependency-aware admitted-ancestor representation. It should detect/normalize only flow/clipping constructs that would otherwise truncate the selected representation, preserve necessary visual semantics where possible, and emit explicit partial/unknown truth when a complete static materialization cannot be proven within budget.

### Block 48 — final owner / acceptance matrix

This **48-block tranche is complete**. No current status transition and no new permanent P-code.

1. **P0-004 ACTIVE — primary owner.** Complete selected descendants must not be physically truncated by retained fixed/sticky/absolute/overflow/clip/paint-containing/top-layer ancestors; admitted ancestor presentation must not repeat/inject beyond the defined selection semantics.
2. **P2-007 BACKLOG — primary product/architecture boundary.** Define explicit behavior for nested scrollports and top-layer UI: exact current viewport, expanded/static reading copy, Reader/Print/HTML/visual-region alternatives. One implicit mode cannot truthfully promise both exact live viewport state and complete selected-subtree expansion.
3. **P0-070 ACTIVE — supporting end-to-end truth.** A valid PDF blob is not proof of complete intended content. The chosen capture-mode/materialization receipt must remain exact through download/Yandex/Journal finalization.
4. **P1-187 ACTIVE — supporting frame parity.** Secondary flattened frame representation must implement the same chosen fixed/scroll/top-layer semantics, rather than silently differing from direct top-document behavior.
5. **P1-167 ACTIVE — bounded-work support.** Any ancestor-flow expansion/materialization pass needs one finite node/time/layout/mutation/geometry budget and truthful partial/unknown result on non-convergence.
6. **P0-075 ACTIVE — supporting isolation.** Capture-only normalization should not be delegated to mutable page-author CSS as an authority; the existing live-author-origin selected-only representation remains hostile-page influenced.
7. Real unpacked Chrome remains the release-QA boundary. Managed Chromium here is deterministic renderer evidence only.

### Final physical summary

Representative exact-CDP outcomes:

- fixed ancestor + selected 140-paragraph child: **33/140**, 1 page;
- ordinary overflow-auto ancestor + selected child: **21/140**, 1 page;
- ordinary scrolled ancestor: **20/140 middle-slice**, 1 page;
- paint containment + visible overflow: **21/140**, 1 page;
- selected long fixed region: **17/180**, 1 page;
- selected long modal: **15/180**, 1 page;
- selected long popover: **15/180**, 1 page;
- scrolled modal/popover: only middle slices;
- screen-media fixed shell despite author print expansion: **33/140**, 1 page;
- same fixture under print media: **140/140**, 5 pages;
- capture-only static/unclipped controls: complete 140/140 or 180/180 outputs;
- oversize `break-inside:avoid`, transformed long flow, `contain:layout`, max-height+visible-overflow: complete positive controls.

These results sharpen the existing P0-004 acceptance from “ancestor clipping can be wrong” to a directly measurable physical invariant: **if the user includes a mounted descendant whose selected representation contains content outside a retained page-owned viewport/paint clip, WebClip must either preserve the chosen explicit current-view semantics or materialize a bounded complete static representation; it must not silently label a one-viewport PDF as a complete saved copy.**