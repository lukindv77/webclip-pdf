# Durable audit evidence — post-freeze physical render cut, stage 4 — 2026-08-30

This interruption-safe checkpoint continues Blocks 1–32 from the three preceding physical-render-cut evidence files on exact fresh runtime baseline `main = 2b2522130792d8d023b540216f9742c3f7226d2e`.

Canonical owner/status authority remains `AUDIT_REGISTRY.md`. No runtime, manifest, version, build, tag or Release change is made. Managed Chromium is `144.0.7559.96` on Debian 13.

## Blocks 33–44 — rendered-state breadth and diagnostic blind spots

### Block 33 — form control current value changes at `beforeprint` and enters PDF — P0-070/P0-004

Fixture contains an `<input>` whose prepared value is `PREPARED_FORM_VALUE`.

Page `beforeprint` assigns `input.value = 'MUTATED_FORM_VALUE'`.

Physical PDF text contains `MUTATED_FORM_VALUE`, not the prepared value.

This is a rendered-state dimension distinct from ordinary element text: form control `.value` is a live property, not necessarily equivalent to the original HTML attribute or surrounding `innerText`.

### Block 34 — page can undo WebClip-style disclosure expansion before the physical cut — P0-070/P0-004/P0-067 boundary

Stable fixture with `<details open>` prints:

- `SUMMARY_TEXT`;
- `DETAIL_CONTENT_VISIBLE`.

Mutation fixture closes the details element in `beforeprint`.

Physical PDF prints only `SUMMARY_TEXT`.

Current `prepareForPrint()` deliberately expands recognized disclosure content before PDF generation. This positive browser result proves that an already-expanded live disclosure is not frozen by that preparation; the page can collapse it again before layout.

P0-067 remains the separate rule that WebClip itself must not synthesize arbitrary page control activation. This block is instead the physical-generation consequence of leaving the result in hostile live DOM.

### Block 35 — page `beforeprint` can replace WebClip's intended `@page` geometry — P0-075/P0-004

Stable fixture uses `@page { size:A4; margin:12mm }` and `preferCSSPageSize:true`, matching the worker's current print contract.

Stable PDF info:

- page size: approximately `594.96 × 841.92 pt` (A4);
- page count: `1`.

During `beforeprint`, page appends a later rule `@page { size:50mm 50mm; margin:0 }`.

Mutated PDF info:

- page size: approximately `142.08 × 142.08 pt`;
- page count: `5`.

Current worker explicitly asks `Page.printToPDF` to prefer CSS page size. Therefore the physical pagination/page-box contract is another live page-controlled dimension after preparation, not merely content visibility or text.

### Block 36 — a preloaded hidden iframe can be revealed in `beforeprint` and enter PDF — P0-070/P0-004/P1-214 boundary

Fixture contains `BASE_SELECTED` plus a fully loaded `srcdoc` iframe whose child text is `PRELOADED_HIDDEN_FRAME`; the iframe starts with `display:none`.

`beforeprint` changes only the iframe display to `block`.

Physical PDF contains both:

- `BASE_SELECTED`;
- `PRELOADED_HIDDEN_FRAME`.

This is deliberately a loaded same-document browser fixture, not cross-origin frame-agent QA. It proves that embedded representation already present before preparation can become physically visible after the preparation boundary without a new frame/resource admission pass.

### Block 37 — newly created iframe inside `beforeprint` did not load in time — negative timing control

A separate fixture creates a brand-new `srcdoc` iframe synchronously inside `beforeprint`.

The resulting PDF contained `BASE_SELECTED` but **not** `INJECTED_FRAME_CONTENT`; the child became available only after the print cut.

Retain this negative control. The audit should not claim that arbitrary newly navigated browsing contexts necessarily complete loading before `Page.printToPDF` layout. Block 36 is the supported claim: already-loaded hidden embedded content can be revealed and printed.

### Block 38 — provenance header values are pre-preparation metadata while body is later live state — P0-070

`buildSaveMeta()` captures `url`, `title`, local timestamp and comment before `prepareForPrint()`.

`prepareForPrint()` then constructs ordinary DOM header rows from those captured metadata values. Blocks 1–3/33–36 prove the physical body/rendered state can change afterwards.

Therefore one PDF can truthfully contain an **old admitted metadata header** next to **newer page content/state**. The header is not evidence that the rest of the PDF belongs to the same document/application/render generation.

Acceptance: provenance metadata and physical render must share one immutable/fenced generation, not merely coexist in the same PDF.

### Block 39 — `meta.pageAnalysis` is captured before the browser print lifecycle — P0-070

Fresh source captures:

`meta.pageAnalysis = capturePageStructureDiagnostics('prepared')`

at the end of `prepareForPrint()`, before the worker later invokes `Page.printToPDF` and before browser `beforeprint` listeners/microtasks execute.

Thus `pageAnalysis` is by definition a prepared-state snapshot, not a physical-byte receipt. OperationLog may legitimately contain useful prepared diagnostics that differ from the rendered bytes without current save failure.

### Block 40 — current diagnostics cannot detect same-length selected-text replacement — P0-070/P1-167 boundary

`diagnosticElementSnapshot()` records selected-element `textChars`, not the text itself or a cryptographic/structural content fingerprint. Page-level diagnostics likewise record aggregate body text character count.

A replacement such as one 8-character value with a different 8-character value can preserve:

- `textChars`;
- body text length;
- element count;
- bbox;
- scroll geometry;
- the limited style fields currently recorded;

while changing the physical PDF text.

This is not an argument to log raw selected content (which would create privacy cost). It proves the current bounded diagnostics schema cannot become authorization simply by comparing before/after objects. P1-167 remains the bounded diagnostics-computation owner; P0-070 owns the missing physical-generation receipt.

### Block 41 — form `.value` mutation is largely invisible to current structural diagnostics — P0-070

Block 33 changes an `<input>`'s live `.value` and PDF text.

Current selected diagnostics derive text length from `element.innerText || element.textContent`; an input's rendered value is not represented there. `diagnosticStyleSnapshot()` also contains no form-value state.

Thus even a perfectly delivered beforeprint diagnostic snapshot can omit a rendered state dimension Chromium actually prints.

### Block 42 — canvas bitmap mutation is invisible to current structural diagnostics — P0-070/P1-187

Block 19 changes only canvas pixels from red to blue and flips the PDF raster by roughly 29,040 pixels of each color.

Current diagnostics record DOM tag/id/classes, text length, geometry, selected style subset and ancestor layout. They do not read canvas bitmap pixels or a bounded bitmap fingerprint.

Consequently prepared/before/after diagnostics may remain structurally identical while physical bytes differ materially. P1-187 already owns required canvas bitmap fidelity for flattened frame representation; the top-level generation lesson remains P0-070.

### Block 43 — CSS background resource mutation is outside the current diagnostic style subset — P0-070/P1-003

Block 21 switches an already-loaded CSS background from red to blue and flips approximately 45,000 raster pixels.

`diagnosticStyleSnapshot()` records display, visibility, opacity, position, overflow, content-visibility, contain and only whether a transform is present. It does **not** record `background-image` or an admitted resource identity.

Therefore the diagnostic objects cannot prove that the resource rasterized by Chromium is the one prefetch/admission inspected. P1-003 remains the actual rendered resource graph owner.

### Block 44 — pseudo-element generated content is outside current text diagnostics — P0-070/P1-003

Block 23 changes `::before` generated text from `PREPARED_PSEUDO` to `MUTATED_PSEUDO`, and the PDF contains the mutated value.

CSS generated content is not ordinary descendant text returned by `innerText/textContent` in the same way as a DOM text node, and current diagnostics do not enumerate pseudo-element `content`.

Thus generated content is another direct example where physically rendered semantics can change without a corresponding current diagnostic content identity.

## Stage 4 classification

Blocks 33–44 are complete and durable. Total completed tranche size is now **44 blocks**.

No new owner has emerged. The fresh proof consistently converges on the already-registered architecture:

- P0-070 — exact physical save generation;
- P0-075 — hostile/shared page cannot be print authority;
- P0-004 — complete selection-bounded physical fidelity;
- supporting P1-003/P1-187/P1-214/P1-229/P0-071 as their specific resource/render/frame/URI dimensions apply.

A key final conclusion is now stronger than “beforeprint diagnostics can be ordered incorrectly”: **the current diagnostic schema intentionally omits multiple state dimensions Chromium renders**, so no ordering fix can turn those diagnostics into a render receipt. The closure direction must remain a frozen/inert representation or an equivalently enforceable immutable render-generation contract.
