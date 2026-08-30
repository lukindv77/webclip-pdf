# Durable audit evidence — post-freeze physical render cut — 2026-08-30

Canonical status and single-owner authority remain exclusively in `AUDIT_REGISTRY.md`. This file is the interruption-safe working evidence for a source-first deep-audit tranche on mutations that can occur after save admission/preparation and before or during the physical Chromium `Page.printToPDF` render.

## Interruption-safe baseline

- Fresh audited `main`: `2b2522130792d8d023b540216f9742c3f7226d2e`.
- Working branch: `audit/post-freeze-physical-render-cut-20260830`.
- Previous planning checkpoint survives in Git history as commit `45201bcc919f13b85abec8e1ec49d640e1a8dbed`.
- That earlier branch name was subsequently reused by the separately completed PR #26 privacy tranche, so this tranche intentionally moved to a new unique branch and fresh main rather than attempting to continue from the reused branch tip.
- PR #26 is audit/docs-only and does not alter the runtime source being audited here.
- `manifest.json` remains version `0.9.8`; no runtime/version/build/tag/release change is part of this checkpoint.
- Managed Chromium used for direct print probes: `144.0.7559.96` on Debian 13. These probes are deterministic engineering evidence, not real unpacked-extension release QA.

## Non-overlap boundary already established

Do not rediscover these as new roots:

1. PR #23: reviewed local+remote selection freeze, mutable remote state between review/meta/prepare, marker-write reentrancy, live selected-DOM pruning, pre-IPC locator bounds.
2. PR #24 / P1-229: cross-origin child print-media mismatch, screen-only selection decoration, pre-filter remote geometry.
3. PR #25: page-author `!important` cascade can override live-DOM selected-only hiding; P1-230 deliberately not allocated there.
4. PR #26: SelectionSnapshot privacy/minimization only; no runtime overlap with this tranche.

## Current source boundary

Fresh `content.js` proves:

- `downloadPdf()` constructs `meta`, enters `printing`, awaits `prepareForPrint(meta)`, then sends `WEBCLIP_GENERATE_PDF` to the worker.
- `prepareForPrint()` performs disclosure expansion, bounded resource prefetch, remote-frame prepare, header insertion, frame-chain/style mutation, link/image rewriting, frame-height stabilization and same-origin frame flattening.
- It records `meta.pageAnalysis = capturePageStructureDiagnostics('prepared')` and returns; there is no immutable DOM/render receipt or generation seal at this boundary.
- The content script registers `window` `beforeprint`/`afterprint` listeners. Its `beforeprint` handler re-measures frame heights and captures diagnostics, then hides WebClip UI; it does not freeze the host page or compare the physical render state to `meta.pageAnalysis`.

Fresh worker source proves `generatePdfBlob()` later invokes CDP `Page.printToPDF` (after setting emulated media), so the browser print event/render occurs after the content-side preparation promise has completed.

Current registry already contains strong candidate owners:

- P0-070 ACTIVE — exact full-document save generation from command admission through print/cache/download/upload/Journal finalization.
- P0-075 ACTIVE — host page is not a trusted UI/control plane; print representation should be isolated.
- P0-071 ACTIVE — safe URI schemes must hold on the actual printed representation, explicitly including hostile `beforeprint`/post-sanitization mutation.
- P0-080 ACTIVE — same-document application generation and live selected DOM are separate from browser document identity.
- P0-004 ACTIVE — selection-bounded PDF fidelity.
- P1-003 ACTIVE — actual rendered resource graph readiness.
- P1-187 ACTIVE — flattened iframe rendered-state provenance.
- P1-214/P1-229 ACTIVE — multi-frame physical preparation / cross-origin selected representation.

## Stage 1 duplicate/root-cause decision

The PDF family evidence was re-read after the first browser probes. Historical durable evidence already states the general root directly: after `prepareForPrint(meta)` returns, `Page.printToPDF` renders live DOM; hostile timers, MutationObservers and `beforeprint` can change the current representation; `beforeprint` diagnostics are observation, not authorization; the required direction is a frozen/inert representation whose content cannot be expanded by later host mutation.

Therefore the first fresh probes are **not a new root cause**. They directly revalidate and sharpen existing P0-070/P0-075/P0-004 acceptance. P0-071 remains the URI-specific sibling owner. No P1-230 is allocated.

The fresh value of this tranche is direct managed-Chromium proof of exact physical-PDF outcomes and diagnostic ordering on the current source architecture.

## Blocks 1–12 — direct physical-PDF mutation proof

### Block 1 — page `beforeprint` text replacement enters the PDF — P0-070/P0-075

Fixture starts with one stable connected element containing `PREPARED_TEXT`. A page-owned `beforeprint` listener changes only its `textContent` to `MUTATED_BEFOREPRINT_TEXT`; no selection marker, CSS cascade, frame identity or resource URL changes are involved.

Managed Chromium `Page.printToPDF` produced PDF text `MUTATED_BEFOREPRINT_TEXT`.

The page's `afterprint` listener then changed the live DOM to `MUTATED_AFTERPRINT_TEXT`, but that later value was absent from the PDF. This cleanly places the physical cut after `beforeprint` mutation and before `afterprint` mutation.

### Block 2 — new descendant inserted in `beforeprint` enters admitted selected content — P0-070/P0-004

Fixture starts with selected-like container text `ORIGINAL_CHILD`. `beforeprint` appends a new paragraph `INJECTED_BEFOREPRINT_CHILD`; `afterprint` appends `INJECTED_AFTERPRINT_CHILD`.

PDF text contains both `ORIGINAL_CHILD` and `INJECTED_BEFOREPRINT_CHILD`, but not the afterprint child. Thus descendant scope can expand after preparation without any new user confirmation.

This is the direct current-runtime manifestation of the historical frozen-print acceptance case “insert sensitive child S after confirmation -> S must be absent from frozen output”.

### Block 3 — selected content removed in `beforeprint` disappears from the PDF — P0-070/P0-004

Fixture contains stable `KEEP_HEADER` plus selected-like `REMOVED_SELECTED_TEXT`. The page removes the selected element during `beforeprint`.

PDF contains only `KEEP_HEADER`; the admitted selected text is physically absent.

This is the inverse of Block 2: live host mutation can silently shrink or expand the output cut.

### Block 4 — extension-like diagnostics can run first yet still describe the wrong PDF — P0-070/P0-075

Using a CDP isolated world as a content-script analogue:

1. isolated `beforeprint` listener is registered first;
2. it records shared order `ext>` and snapshots current selected text into a diagnostic attribute;
3. a later page-world `beforeprint` listener records `page-late>` and changes the text from `PREPARED_ORDER_TEXT` to `LATE_PAGE_TEXT`.

Observed order: `ext>page-late>`.

Extension-like diagnostic value: `PREPARED_ORDER_TEXT`.

Physical PDF value: `LATE_PAGE_TEXT`.

This directly proves that current-style `lastBeforePrintDiagnostics` cannot be treated as a receipt for the bytes Chromium renders even when the extension listener itself executes before the hostile page listener.

### Block 5 — earlier page listener mutates before diagnostics — ordering control

Reverse registration order:

1. page listener registered first changes text to `EARLY_PAGE_TEXT`;
2. isolated extension-like listener runs second and records diagnostics.

Observed order: `page-early>ext>`; diagnostic and PDF both contain `EARLY_PAGE_TEXT`.

This positive/ordering control shows there are two legitimate page-controlled cases:

- mutation before diagnostics, which diagnostics may observe but do not reject;
- mutation after diagnostics, which diagnostics may entirely miss.

Neither case has a generation invalidation/restart barrier.

### Block 6 — page can remove the WebClip provenance header after diagnostics — P0-070/P0-075

Fixture contains `#webclip-pdf-header` with `HEADER_PROVENANCE_TEXT`. Isolated extension-like `beforeprint` listener first records that the header is connected. A later page listener removes that exact node.

Diagnostic flag: `true` (header existed).

PDF: contains `BODY_STAYS` and does **not** contain `HEADER_PROVENANCE_TEXT`.

Current `prepareForPrint()` mounts the real metadata header into the shared page DOM with the predictable `webclip-pdf-header` id. A physical render contract cannot rely on its continued presence after preparation.

### Block 7 — page can remove WebClip selected-only style in `beforeprint` and reveal unselected content — P0-075/P0-004

Current architecture mounts selected-only filtering as a shared `<style data-webclip-print-style>` element in page documents.

Managed control without page mutation:

- PDF contains `SELECTED_OK`;
- PDF does not contain `UNSELECTED_SHOULD_HIDE`.

Mutation fixture removes the print style during `beforeprint`.

Resulting PDF contains both `SELECTED_OK` and `UNSELECTED_SHOULD_HIDE`.

This is distinct evidence from PR #25's author-cascade override: no competing page `!important` declaration is needed. The host can directly remove the extension-created shared-DOM style before Chromium layout.

Root ownership nevertheless remains P0-075/P0-004 because historical frozen-print evidence already requires host stylesheet mutation to be unable to expand output.

### Block 8 — flattened same-origin proxy text is page-mutable before render — P0-075/P0-004/P1-187

Fixture creates a print-only section identified like current `[data-webclip-pdf-flattened-frame]`, initially containing `PROXY_PREPARED_TEXT`. Page `beforeprint` changes the proxy text to `PROXY_MUTATED_TEXT`.

PDF contains `PROXY_MUTATED_TEXT`.

Removing scripts from the clone during construction does not make the connected proxy page-inaccessible or immutable. The page can mutate the shared proxy from an independent listener after construction.

### Block 9 — flattened proxy can be removed entirely before render — P0-075/P0-004/P1-187

Fixture contains stable `HEADER_REMAINS` plus a flattened-style proxy `PROXY_REMOVED_TEXT`. `beforeprint` removes the proxy.

PDF contains only `HEADER_REMAINS`.

Thus even an inert clone can fail physical-generation fidelity if it remains in the hostile shared DOM and can be removed or rewritten before print layout.

### Block 10 — same-origin iframe live content mutates during top `beforeprint` — P0-070/P0-004/P1-214

A same-origin iframe begins with `FRAME_PREPARED_TEXT`. Top page `beforeprint` synchronously changes the iframe document text to `FRAME_MUTATED_TEXT`.

PDF contains `FRAME_MUTATED_TEXT`.

This fixture does not model the special current body-flattening path; it proves the general live embedded-document render behavior that remains relevant for non-body selections and for any frame path left live at render time.

### Block 11 — microtask scheduled from `beforeprint` still wins the render cut — P0-070/P0-075

`beforeprint` schedules both:

- `Promise.resolve().then(() => text = 'MICROTASK_MUTATION')`;
- `setTimeout(..., 0)` changing text to `TIMEOUT_MUTATION`.

PDF contains `MICROTASK_MUTATION`.

After print completes and the timer runs, live DOM becomes `TIMEOUT_MUTATION`; that timer value is absent from the PDF.

So the vulnerable window includes the microtask checkpoint reached from page `beforeprint`, not only mutations performed inline inside the listener body.

### Block 12 — MutationObserver can react to extension-like UI hiding and alter selected content before print — P0-075/P0-070

Fixture installs a page MutationObserver on an extension-root analogue. The isolated extension-like `beforeprint` handler performs the current-shaped operation `root.style.display = 'none'`. The page observer reacts to that shared-DOM attribute mutation and changes selected text to `OBSERVER_REACTION_TEXT`.

PDF contains `OBSERVER_REACTION_TEXT`.

This is especially important because the page does not need its own `beforeprint` listener. WebClip's own `beforeprint` DOM mutation can create the observable trigger whose microtask changes the physical representation before Chromium commits layout.

The result composes with the earlier PR #23 finding that shared DOM mutations are page-reactive; here the timing is specifically the final print render boundary.

## Rejected fixture / non-finding retained

A quick `data:` iframe fixture produced no child text in the PDF at all, so it is not used as cross-origin mutation evidence. Cross-origin parity remains an explicit next-stage target and must use a real two-origin HTTP fixture or equivalent deterministic environment before any claim is made.

## Stage 2 checkpoint decision

Blocks 1–12 are complete and durable.

Current classification:

- no new P-code;
- no status transition;
- primary existing owners: P0-070, P0-075, P0-004;
- supporting boundaries: P0-071, P1-187, P1-214, P1-229 where the specific case crosses URI/proxy/frame representation;
- the strongest acceptance refinement is that **prepared diagnostics and even beforeprint diagnostics are not physical-render receipts**. A valid save generation needs an isolated/frozen representation or an equivalently enforced generation seal that the page cannot mutate between admission and Chromium layout.

Next blocks will target real two-origin iframe self-mutation, resource mutation after prefetch, page ability to mutate/remove wrapper/header/style nodes created in isolated world, and afterprint/rollback ordering controls.
