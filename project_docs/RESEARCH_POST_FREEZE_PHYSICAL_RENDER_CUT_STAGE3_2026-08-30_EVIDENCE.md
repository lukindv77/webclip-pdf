# Durable research evidence — post-freeze physical render cut, stage 3 — 2026-08-30

This interruption-safe checkpoint continues Blocks 1–20 from:

- `RESEARCH_POST_FREEZE_PHYSICAL_RENDER_CUT_2026-08-30_EVIDENCE.md`;
- `RESEARCH_POST_FREEZE_PHYSICAL_RENDER_CUT_STAGE2_2026-08-30_EVIDENCE.md`.

Exact fresh runtime baseline remains `main = 2b2522130792d8d023b540216f9742c3f7226d2e`; branch is `research/post-freeze-physical-render-cut-20260830`. Canonical owner/status authority remains `RESEARCH_REGISTRY.md`.

No runtime, manifest, version, build, tag or Release change is made. Managed Chromium is `144.0.7559.96` on Debian 13; browser probes are engineering evidence only.

## Blocks 21–32 — resource/render state, diagnostic settlement and synthetic print lifecycle

### Block 21 — CSS background resource can switch after preparation and before rasterization — P1-003/P0-070/P0-075

A 240×120 selected-like box initially uses a red SVG data URL as `background-image`; an independent hidden element preloads the blue SVG data URL so the result is not a network-readiness race.

Stable control first-page raster:

- red pixels: `45,000`;
- blue pixels: `0`.

`beforeprint` changes only the box's `background-image` to the already-loaded blue resource.

Mutated PDF raster:

- red pixels: `0`;
- blue pixels: `45,000`.

This is the CSS visual-resource counterpart to Block 18's `<img>` switch. A prefetch report describes the graph inspected before print; it is not a physical-render generation seal. Existing P1-003 already owns actual-rendered-resource-graph truth.

### Block 22 — live inline SVG presentation state changes at the print cut — P0-070/P0-004

Inline SVG contains a 240×120 red rectangle.

Stable PDF raster:

- red pixels: `45,000`;
- blue pixels: `0`.

Page `beforeprint` changes the rectangle `fill` to blue.

Mutated PDF raster:

- red pixels: `0`;
- blue pixels: `45,000`.

Physical output authority therefore includes live SVG presentation state, not only text nodes, ordinary CSS and bitmap elements. This remains the existing frozen/selection-fidelity root.

### Block 23 — pseudo-element generated content can change after preparation — P0-070/P0-004/P1-003 boundary

Fixture initially renders `#x::before { content: 'PREPARED_PSEUDO'; }`.

During `beforeprint`, page script appends a later rule making the pseudo content `MUTATED_PSEUDO`.

Physical PDF text is `MUTATED_PSEUDO`.

This directly complements P1-003's existing requirement to cover pseudo/CSS visual resources: the actual pseudo representation is still page-mutable after resource/preparation admission.

### Block 24 — worker collects print diagnostics only after PDF bytes already exist — P0-070

Fresh worker source orders the save path as:

1. `pdfBlob = await generatePdfBlob(tabId)`;
2. `printDiagnostics = await collectPrintDiagnosticsForTab(tabId)`;
3. OperationLog stage records both `pdfBytes` and `printDiagnostics`.

The diagnostics are therefore retrospective evidence about a live page after Chromium already produced the blob. They cannot authorize, reject or change bytes already returned by `Page.printToPDF` unless the architecture adds an explicit compare-and-discard/retry contract.

### Block 25 — unavailable post-print diagnostics are fail-open telemetry, not a save barrier — P0-070

`collectPrintDiagnosticsForTab()` catches timeout/message/error and returns sanitized `{unavailable:true,...}` diagnostics instead of failing PDF generation.

This is a useful product resilience choice for telemetry, but proves diagnostic availability is not part of the current physical-byte acceptance gate.

Do not “fix” the root by making diagnostics merely more reliable; the required boundary is an enforceable render generation, not observation after the irreversible expensive render already happened.

### Block 26 — previous-operation diagnostics are explicitly cleared before preparation — positive control

Current `prepareForPrint(meta)` sets both:

- `state.lastBeforePrintDiagnostics = null`;
- `state.lastAfterPrintDiagnostics = null`.

before remote/resource/DOM preparation.

Thus suppression of a print event does not normally reuse a previous operation's old diagnostic object. Missing event evidence should appear null/unavailable/current, not be mislabeled as a stale successful prior capture.

This positive control narrows Block 17: the dangerous stale state is specifically `printUiHidden`/`printUiPreviousDisplay`, not these two diagnostic fields.

### Block 27 — `restoreAfterPrint()` restores host display but does not reset the print-UI latch — P0-075/P0-070

Fresh source `restoreAfterPrint()` ends with:

`if (state.host?.isConnected) state.host.style.display = '';`

It does **not** set:

- `state.printUiHidden = false`;
- `state.printUiPreviousDisplay = ''`.

The only normal current code that clears those fields is `restoreWebClipUiAfterPrintRender()`, which itself depends on receiving the page-dispatch `afterprint` event.

This source fact is the exact reason Block 17's suppressed-afterprint fixture can leave a logically hidden latch attached to a physically visible host after ordinary cleanup.

### Block 28 — the stale print-UI latch can survive stop/start into a newly created WebClip host — P0-075/P0-070

Fresh source ordering:

- `stopSelection()` calls `restoreAfterPrint()`, later removes `state.host`, and resets many UI references to null, but does not clear `printUiHidden` or `printUiPreviousDisplay`;
- `startSelection()` begins with `restoreAfterPrint()` and later `ensureUi()` creates/reconnects the WebClip host, but again does not clear those latch fields.

A source-shaped isolated-world browser model reproduced:

1. synthetic/suppressed lifecycle leaves `hidden=true`;
2. cleanup makes the old root visible, removes it, then a new-session root is created;
3. before the next real print the new root is connected and visible while the latch is still true;
4. current-like `beforeprint` returns early because it reads `hidden=true`;
5. PDF contains `NEW_SESSION_UI` plus `PAGE_BODY`.

This confirms the state leak is not necessarily limited to an immediate same-session retry.

### Block 29 — page synthetic `beforeprint` can pre-poison WebClip's print latch — P0-075/P0-070

Current `hideWebClipUiForPrintRender()` accepts no event argument and performs no `event.isTrusted` validation. Repository search found no `isTrusted` guard on the print lifecycle handlers.

Managed isolated-world fixture:

1. page main world dispatches `new Event('beforeprint')` before any real print;
2. isolated extension-like handler runs, observes `isTrusted=false`, hides root and sets its private `hidden=true` latch;
3. page makes the shared root visible again while it cannot directly clear the isolated latch;
4. real browser `beforeprint` arrives with `isTrusted=true`, but handler returns because `hidden=true`;
5. PDF contains `WEBCLIP_SYNTH_UI` and `PAGE_BODY`.

Observed extension handler invocation count was 2: synthetic then trusted real print. Actual `afterprint` eventually clears the latch, but only **after** the PDF has already leaked the UI.

Canonical P0-075 already forbids host synthetic-event authorization; this is a new deterministic print-lifecycle schedule under that owner, not a new P-code.

### Block 30 — page can synthesize `afterprint` *inside* the real `beforeprint` dispatch and re-show WebClip before layout — P0-075/P0-004

Managed fixture registers the extension-like `beforeprint/afterprint` pair first and a later page `beforeprint` listener second.

During the actual trusted print event:

1. extension handler receives trusted `beforeprint`, hides UI and sets latch;
2. page handler calls `dispatchEvent(new Event('afterprint'))`;
3. extension `afterprint` handler receives the synthetic event (`isTrusted=false`), restores UI and clears latch;
4. Chromium then lays out the page;
5. physical PDF contains `WEBCLIP_SYNTH_AFTER_UI` plus `PAGE_BODY`;
6. the later genuine `afterprint` also arrives but finds the latch already false.

Observed order:

`ext-before(true)>page-before>ext-after(false)>ext-after(true)>`

Thus checking only listener registration order is insufficient. Untrusted page-generated lifecycle events can directly drive the current internal print-UI state machine.

### Block 31 — an earlier page print listener is a normal reachable ordering, not an artificial registration race — P0-075

Fresh worker source injects `content.js` on demand through `ensureWebClipContentScript()` / `executeScriptSingletonBounded(... files:['content.js'])` when WebClip is started.

Ordinary page JavaScript can therefore have installed `beforeprint/afterprint` listeners long before the user invokes WebClip. Blocks 15 and 17 do not require the page to race extension startup or patch the isolated-world `addEventListener`; normal prior page initialization is sufficient to obtain earlier same-target event-listener order.

### Block 32 — correcting P1-229 media semantics alone still leaves child selected-only style removable — future-fix acceptance control

This is intentionally a **forward acceptance control**, not an additional current-media defect.

Opaque-origin sandboxed child contains:

- `REMOTE_SELECTED_KEEP` carrying a remote-Include marker;
- `REMOTE_UNSELECTED_HIDE` without one.

A current-shaped child style uses `@media print` selected-only hiding. Under an emulated-print positive-control environment:

- with style left intact, PDF shows only `REMOTE_SELECTED_KEEP`;
- if the child page removes `#webclip-remote-frame-print-style` in its own `beforeprint`, PDF shows both `REMOTE_SELECTED_KEEP` and `REMOTE_UNSELECTED_HIDE`.

Current worker actually forces `screen`, which is already P1-229's primary defect. This block says that a future fix must not stop at changing media mode or making the rule media-independent while leaving the authoritative selected-only filter as page-removable child DOM. P1-229 must compose with P0-075's isolated/frozen representation contract.

## Stage 3 classification

Blocks 21–32 are complete and durable.

Current aggregate classification remains:

- **no new P-code**;
- **no status transition**;
- primary roots: P0-070 exact physical save generation, P0-075 untrusted host/shared-DOM control plane, P0-004 selection-bounded physical PDF fidelity;
- supporting existing owners: P1-003 actual rendered resource graph; P1-187 rendered-state/proxy fidelity; P1-214/P1-229 frame physical representation; P0-071 URI-specific actual-print invariant.

Fresh acceptance refinements now include:

1. prepared/before/after diagnostics are telemetry, not physical-byte receipts;
2. print correctness must not depend on page-dispatch listener delivery or order;
3. synthetic `beforeprint/afterprint` cannot mutate extension print authority;
4. all print lifecycle state (`printUiHidden`, previous display and analogous latches) must be reset by operation-owned cleanup independent of event delivery;
5. resource/bitmap/SVG/pseudo state must come from the same frozen/equivalently fenced render generation;
6. P1-229 media repair must also remove page authority over the child selected-only representation.
