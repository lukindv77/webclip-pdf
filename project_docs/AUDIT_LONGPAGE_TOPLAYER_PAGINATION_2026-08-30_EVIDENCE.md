# Durable audit evidence — long-page / fixed / top-layer pagination fidelity — 2026-08-30

Canonical P-code owner/status authority remains exclusively in `AUDIT_REGISTRY.md`. This file is an interruption-safe fresh-source audit checkpoint. At this checkpoint **Blocks 1–24 are complete**; later blocks/final classification may extend this same file in the same audit branch.

Exact fresh audited baseline: `main = a0325b25fc4c9d48ab41b8aa8f69b6b8f859891a`.

Managed browser: `Chromium 144.0.7559.96`. Direct physical probes use the worker-equivalent CDP print shape: `Emulation.setEmulatedMedia({media:'screen'})`, then `Page.printToPDF` with `displayHeaderFooter:false`, `printBackground:true`, `scale:1`, `preferCSSPageSize:true`, `transferMode:'ReturnAsStream'`. Fixture HTML is installed into an already admitted blank managed page through CDP `Page.setDocumentContent` so enterprise navigation policy is not part of the test result. These are engineering probes, not real unpacked-Chrome release QA.

No runtime source, registry row, manifest/version/build/tag/release state is changed by this checkpoint.

## Stage-1 owner baseline

Fresh `AUDIT_REGISTRY.md` already makes **P0-004 ACTIVE** the direct owner for the strongest results below: “ordinary page-owned ancestor layout/clipping/positioning/visual effects cannot truncate included descendants or inject unselected ancestor presentation into the saved copy.” Existing **P2-007** remains the current-view versus expanded/static output-mode boundary. Existing **P0-070** remains the exact physical-generation owner. Existing **P1-187** remains relevant where equivalent fixed/top-layer state is converted to a secondary flattened iframe representation.

Prior complex-layout evidence already proved a *small fixed descendant* repeats on every PDF page under forced screen media and that an ordinary sticky descendant was a one-occurrence positive control. This tranche deliberately does not re-register that root cause; it extends the audit into long selected content retained through page-owned scroll/fixed/top-layer ancestors and explicit pagination loss.

## Blocks 1–12 — source boundary + fixed/sticky/top-layer physical baseline

### Block 1 — fresh source keeps only root `html/body` globally normalized

Current injected print CSS normalizes `html, body` to `overflow:visible`, `position:static`, auto height/width, `contain:none`, `content-visibility:visible`, `transform:none`, etc. It does **not** apply an equivalent general flow-normalization contract to arbitrary page-owned ancestors retained because they contain an included descendant.

This distinction is central to the long-page clipping results below.

### Block 2 — selected-only CSS retains ordinary ancestors structurally

Current print filtering hides ordinary nodes unless they are included, descendants of an include, or `:has()` an include. Therefore a page-owned fixed/absolute/sticky/overflow ancestor of a selected article stays in the physical representation even when the ancestor itself was never explicitly selected.

### Block 3 — frame-only print-flow normalization is not top-document ancestor normalization

`applySelectedFramePrintFlow()` explicitly makes selected frame shells/chain nodes static, unclipped and overflow-visible. That is a targeted frame path. An ordinary top-document ancestor of an included node does not receive this function merely because it is retained by `:has([data-webclip-pdf-include])`.

### Block 4 — known fixed-descendant repetition revalidated only as a control

A long selected ordinary-flow document with one fixed descendant produced **4 PDF pages**; `FIXED_MARKER` appeared **4 times**, while the long flow markers were preserved once each.

This matches prior P0-004 evidence and is retained only as a current-baseline control.

### Block 5 — forced screen media still defeats author print-time static conversion

A fixture whose page CSS made a fixed marker `position:static` under `@media print` still produced **4 copies on 4 pages** under the exact production-style forced-screen media path.

Again this revalidates, rather than newly registers, the prior screen-media/fixed duplication boundary.

### Block 6 — ordinary sticky descendant remains a positive control

The corresponding long-page sticky marker occurred **once** across **4 pages**. The audit must not turn fixed-page repetition into a blanket claim that all sticky/positioned content duplicates.

### Block 7 — included article inside a fixed scroll shell is physically truncated

Fixture: a fixed viewport shell (`position:fixed; inset:20px; overflow:auto`) contains a 140-paragraph article. The **article itself** carries the WebClip include marker; the shell is retained only as its ancestor.

Exact PDF result:

- document/PDF extent: **1 page**;
- preserved article paragraphs: `FIXSHELL_000` … `FIXSHELL_032` only (**33/140**);
- `FIXSHELL_139` absent.

This is direct selected-content loss, not merely visual reflow: the user-selected descendant contains 140 mounted paragraphs, but the retained page-owned ancestor clips 107 of them from the saved copy.

### Block 8 — current nested scroll position selects a different physical slice

Equivalent fixed-shell fixture set the shell's live `scrollTop` to a later position before print.

Exact PDF result remained **1 page**, but the surviving slice changed to approximately `FIXSCROLL_087` … `FIXSCROLL_119` (**33 paragraphs**). Earlier selected paragraphs and the final tail were absent.

Thus physical bytes depend on the nested viewport slice even though the selected DOM descendant itself still contains the complete mounted article.

### Block 9 — sticky fixed-height scroll ancestor also truncates included descendants

A retained ancestor with `position:sticky; top:10px; height:600px; overflow:auto` contained a 140-paragraph included article.

Exact PDF was **1 page** and contained only `STICKSHELL_000` … `STICKSHELL_019` (**20/140**). This separates “sticky marker normally occurs once” from the independent clipping risk of a sticky scroll-container ancestor.

### Block 10 — absolute fixed-height scroll ancestor has the same selected-content loss class

A retained `position:absolute; height:600px; overflow:auto` shell produced **1 page** and only `ABSSHELL_000` … `ABSSHELL_019` (**20/140**).

The root cause is therefore not specific to fixed positioning: retained ancestor clipping/scroll viewport semantics can bound the physical selected representation across several positioning modes.

### Block 11 — selecting a long fixed element itself can collapse the whole save to one viewport page

A long selected section itself used `position:fixed; inset:30px; overflow:auto` and contained 180 named paragraphs plus explicit start/end markers.

Exact PDF:

- **1 page**;
- `FIXED_LONG_START` present;
- only `FIXEDLONG_000` … `FIXEDLONG_016` present (**17/180**);
- `FIXEDLONG_179` and `FIXED_LONG_END` absent.

This is a stronger pagination failure than the known small-fixed-marker duplication case: a selected long fixed region can lose most of the selected content because it contributes no normal-flow document height and remains a viewport-scoped scroll box.

### Block 12 — open modal dialog with long selected content has the same one-page loss shape

A modal `<dialog>` opened with `showModal()`, itself included, held 180 named paragraphs and used `max-height:80vh; overflow:auto`.

Exact PDF:

- **1 page**;
- `DIALOG_START` and `DIALOG_000` present;
- only `DIALOG_000` … `DIALOG_014` present (**15/180**);
- `DIALOG_179` and `DIALOG_END` absent.

The browser can render the live top-layer state, but direct screen-media PDF represents only the modal viewport rather than a complete static expansion of the included long content.

## Blocks 13–20 — popover/dialog parity and static-flow controls

### Block 13 — open popover long content is also clipped to one page

An open `popover="manual"`, itself included and limited to `max-height:80vh; overflow:auto`, contained 180 named paragraphs.

Exact PDF was **1 page** and retained only `POPOVER_000` … `POPOVER_014`; `POPOVER_179` and `POPOVER_END` were absent.

This is live top-layer/current-viewport fidelity, but it is incomplete relative to the included DOM subtree.

### Block 14 — included child inside a modal is not rescued by retaining the modal ancestor

A modal dialog remained top-layer while only its internal article carried the include marker. The modal ancestor was structurally retained through `:has(include)`.

Exact PDF remained **1 page** and retained only `DCHILD_000` … `DCHILD_014` out of 180. Retaining the correct ancestor therefore does not guarantee selected-descendant completeness when that ancestor is itself a clipping/top-layer viewport.

### Block 15 — selected article plus selected modal causes modal/backdrop repetition across every article page

A 140-paragraph selected article plus a short selected open modal generated **5 pages**. `ARTICLE_000` and `ARTICLE_139` were both present, while `MODAL_OVERLAY` occurred **5 times**.

Raster controls show the modal backdrop dims the article on page 1 and again on page 2. This is Chromium top-layer paged behavior under forced screen media. Whether that is the intended archive depends on explicit current-screen versus static-reading semantics; it must not be confused with a single occurrence merely because the modal exists once in the live DOM.

### Block 16 — demoting a retained fixed scroll ancestor to static/unclipped flow restores the whole selected descendant: positive control

A control added capture-only flow normalization to the retained fixed shell: `position:static`, auto height, no max-height, `overflow:visible`.

Exact PDF expanded to **5 pages** and contained all `FIXSTATIC_000` … `FIXSTATIC_139` (**140/140**).

This proves Chromium can paginate the already-mounted selected content completely once the retained viewport shell no longer clips it.

### Block 17 — static-flow materialization also restores a long selected fixed region

Applying capture-only static/unclipped flow to the long selected fixed region expanded output from 1 to **6 pages** and preserved all `FSTATIC_000` … `FSTATIC_179` plus the end marker.

The missing data in Block 11 is therefore not a renderer inability to paginate those nodes; it is representation/flow policy.

### Block 18 — CSS flow normalization can make an open modal's long content fully paginatable

Keeping the dialog open/modal but overriding its capture-time geometry to static/unclipped flow produced **10 pages** and preserved all 180 named dialog paragraphs plus the end marker.

This is a useful engineering control, not yet a proposed implementation: top-layer/modal interaction, backdrop, semantics and hostile page CSS still require a bounded inert representation contract.

### Block 19 — inert static dialog materialization is also complete

A separate control removed modal state, made the dialog inertly visible/static/unclipped, and printed all 180 paragraphs plus the end marker across **10 pages**.

The eventual architecture may choose inert static materialization rather than preserving live modality; this result only proves the complete content can be represented physically.

### Block 20 — popover has the same complete-static controls

Both (a) an open popover with capture-only static/unclipped geometry and (b) a hidden-from-top-layer but inertly visible static popover produced **10 pages** and preserved all 180 named paragraphs plus the end marker.

The problem is therefore the current live top-layer/scroll-box representation, not generic inability to print popover descendants.

## Blocks 21–24 — controls preventing unsafe overgeneralization

### Block 21 — unselected open modal is successfully filtered: positive selection-bounded control

A long selected article was printed while an unrelated modal dialog was open but **not selected**. Selected-only filtering removed the unrelated modal/top-layer presentation; the PDF preserved all 120 article markers and did not contain `UNSELECTED_MODAL`.

Therefore the top-layer problem is not “open dialogs always leak into PDF”. It arises when the admitted selection/ancestor path intentionally retains them.

### Block 22 — selected short popover over long selected article repeats on every page

A long selected article plus a short selected open popover produced **4 pages**; article markers remained complete and `POPOVER_OVERLAY` occurred **4 times**.

Dialog and popover therefore share a paged repetition boundary for short admitted top-layer content.

### Block 23 — fixed content inside a transformed ancestor is a positive counterexample to blanket fixed demotion

A long included ancestor used `transform:translateZ(0)` and contained a fixed child. Because the transform establishes a containing block for that descendant, the `TRANS_FIXED` marker appeared **once**, not once per page; all 120 flow markers survived across **4 pages**.

Any future capture-time fixed/static normalization must be renderer/dependency aware. “Every computed `position:fixed` becomes static” is not a safe universal rule.

### Block 24 — long transformed selected flow itself paginates successfully

A long selected element with `transform:translateZ(0)` produced **6 pages** and preserved all 180 named markers plus start/end markers.

This rejects a broad hypothesis that any transformed long selected block is intrinsically unfragmentable in current Chromium. The proven regression remains retained viewport/clipping/top-layer flow, not transforms as a class.

## Interim checkpoint classification

At **24 completed blocks**, no new permanent P-code is justified.

- **P0-004 ACTIVE** is the direct current owner for selected descendants physically truncated by retained ordinary page-owned fixed/sticky/absolute/overflow/top-layer ancestors and for repeated admitted ancestor/top-layer presentation.
- **P2-007 BACKLOG** remains the architecture/product boundary between faithful *current viewport/top-layer state* and an *expanded/static reading copy*. The same live modal can be faithfully current-view yet incomplete as an archive of the selected subtree; that conflict needs explicit mode semantics.
- **P0-070 ACTIVE** remains supporting physical-generation truth: save success cannot imply selected-content completeness when the chosen representation silently contains only a nested viewport slice.
- **P1-187 ACTIVE** remains the frame-secondary-representation parity boundary; previous evidence already shows flattened frame fixed/sticky/absolute descendants are forced static, so equivalent content currently has different semantics depending on whether it lives directly in the top document or inside a flattened same-origin frame.

Further planned blocks will probe ordinary overflow/contain/clip ancestor classes, nested scroll-position dependence, author print-rule suppression under forced screen media, page-break/fragmentation controls, and truthful diagnostic/acceptance requirements before final classification.