# Durable research evidence — post-freeze physical render cut, stage 2 — 2026-08-30

This interruption-safe checkpoint continues `RESEARCH_POST_FREEZE_PHYSICAL_RENDER_CUT_2026-08-30_EVIDENCE.md` Blocks 1–12 from exact fresh runtime baseline `main = 2b2522130792d8d023b540216f9742c3f7226d2e` on branch `research/post-freeze-physical-render-cut-20260830`.

Canonical P-owner/status authority remains exclusively in `RESEARCH_REGISTRY.md`. No runtime, manifest, version, build, tag or GitHub Release change is made by this checkpoint.

Managed Chromium: `144.0.7559.96` on Debian 13. These are deterministic engineering probes, not real unpacked-extension release QA.

## Blocks 13–20 — cross-world/frame/resource/lifecycle render-cut proof

### Block 13 — opaque-origin sandboxed child `beforeprint` self-mutation enters the top PDF — P0-070/P0-075/P1-214/P1-229

A deterministic SOP-isolated fixture uses `<iframe sandbox="allow-scripts" srcdoc="…">` without `allow-same-origin`. The child therefore has an opaque origin and the top page cannot use ordinary same-origin DOM access as print authority.

The child starts with `REMOTE_PREPARED_SANDBOX` and owns its own `beforeprint` listener that changes the text to `REMOTE_MUTATED_SANDBOX`.

Top-side DOM access was not usable for reading the child document, yet the physical top-document PDF contained:

`TOP_HEADER`

`REMOTE_MUTATED_SANDBOX`

This is intentionally phrased as an **opaque-origin/SOP-isolated browser fixture**, not as optional-host-permission frame-agent release QA. It proves that a physically printed isolated child can execute its own page lifecycle mutation at the print cut and have that newer state enter the parent PDF.

The root remains the existing exact physical-generation / hostile live-representation contract. P1-229 remains the cross-origin selected-representation owner; no new frame P-code is justified.

### Block 14 — isolated-world-created print artifacts are still page-owned shared DOM — P0-075/P0-004/P1-187

Using a CDP isolated world as the content-script analogue, the extension side created:

- `#webclip-pdf-header` containing `ISO_HEADER`;
- `<style data-webclip-print-style>` hiding an unselected node;
- `<section data-webclip-pdf-flattened-frame>` containing `ISO_PROXY`.

Before print, the page main world could query all three artifacts (`header=true`, `style=true`, proxy text=`ISO_PROXY`). Its later `beforeprint` listener removed the style and header and changed the proxy text to `ISO_PROXY_MUTATED`.

Physical PDF text became:

- `ISO_UNSELECTED` — revealed because the style was removed;
- `ISO_SELECTED`;
- `ISO_PROXY_MUTATED`;
- no `ISO_HEADER`.

The isolated JavaScript world does **not** provide DOM ownership isolation. Current WebClip print header, selected-only style and flattened proxy therefore remain mutable page capabilities after they are constructed.

### Block 15 — an earlier page `beforeprint` listener can suppress WebClip's handler entirely — P0-075/P0-070/P0-004

Fixture registration order models an ordinary page listener that existed before the user later starts WebClip:

1. page main-world `beforeprint` listener records `page-stop>` and calls `event.stopImmediatePropagation()`;
2. isolated extension-like `beforeprint` listener would record `ext>` and hide WebClip UI.

Observed order was only:

`page-stop>`

The extension-like listener never ran. Physical PDF contained both `WEBCLIP_UI_VISIBLE_TEXT` and `PAGE_BODY`.

Current content script attaches the WebClip `beforeprint` listener only when the extension script is injected; a page can therefore legitimately have registered an earlier listener. The PDF family had no prior `stopImmediatePropagation` proof in its consolidated evidence search.

Acceptance refinement: correctness cannot depend on a page-dispatch event handler being guaranteed to execute. `beforeprint` is a useful observation/hide optimization, not an authorization or isolation boundary.

### Block 16 — a later page listener can undo WebClip's successful UI hide before layout — P0-075/P0-004

Reverse-order fixture:

1. isolated extension-like listener runs first, records `ext-hide>` and sets the extension-root analogue to `display:none`;
2. page listener registered later records `page-show>` and sets it back to `display:block`.

Observed order:

`ext-hide>page-show>`

Physical PDF contains `WEBCLIP_UI_RESHOW` and `PAGE_BODY`.

Thus even when WebClip's `beforeprint` handler is not suppressed, its shared-DOM mutation is not final authority over the subsequent physical layout.

### Block 17 — suppressed `afterprint` leaves stale `printUiHidden`, enabling second-print UI leakage — P0-075/P0-070/P0-004

This fixture models the current `printUiHidden` latch and source ordering exactly enough to test lifecycle semantics:

- extension-like `beforeprint` hides the root and sets `hidden=true`;
- an **earlier page `afterprint` listener** calls `stopImmediatePropagation()`, so the extension-like `afterprint` restore handler never executes;
- first PDF correctly contains only `PAGE_BODY`;
- after the first print, `hidden=true` remains stale;
- the source-shaped `restoreAfterPrint()` analogue makes the root visible again but deliberately does **not** clear the hidden latch, matching current `restoreAfterPrint()` which sets `state.host.style.display=''` but does not reset `state.printUiHidden`;
- on the second `Page.printToPDF`, extension `beforeprint` sees the stale hidden flag and returns without hiding the now-visible root.

Observed event order:

`ext-before>page-after-stop>ext-before>page-after-stop>`

First PDF: no WebClip UI.

Second PDF: `WEBCLIP_LATCH_UI` plus `PAGE_BODY`.

`hidden` remained true after both cycles.

This is a sharper lifecycle consequence than the general live-DOM root, but numbering remains undecided until the exact historical UI/rollback owners are checked. At minimum it refines P0-075/P0-070/P0-004: page event suppression can strand extension-local print lifecycle state, and ordinary cleanup must restore both DOM and internal latch state without trusting `afterprint` delivery.

### Block 18 — already-loaded image resource can switch after prefetch and change PDF pixels — P1-003/P0-070/P0-075

Fixture prepares a target `<img>` with a red SVG data URL while a blue SVG data URL is separately preloaded/cached. This avoids interpreting the result as a network-readiness race.

Stable control raster:

- red pixels: `28,800`;
- blue pixels: `0`.

Mutation fixture changes the target image `src` to the already-loaded blue resource in `beforeprint`.

Mutated PDF raster:

- red pixels: `0`;
- blue pixels: `28,800`.

A bounded prefetch report can therefore be truthful for the resource graph it inspected and still not seal the resource actually rasterized later. This is already within P1-003's actual-rendered-resource-graph contract and P0-070's exact save generation; no new resource P-code is needed.

### Block 19 — canvas bitmap mutation in `beforeprint` changes raster bytes — P0-070/P0-004/P1-187 boundary

Canvas starts as a solid red bitmap.

Stable control raster:

- red pixels: `29,040`;
- blue pixels: `0`.

`beforeprint` repaints the same live canvas solid blue.

Mutated PDF raster:

- red pixels: `0`;
- blue pixels: `29,040`.

The physical cut includes renderer/live bitmap state, not only DOM text/attributes. P1-187 already owns canvas bitmap fidelity for flattened iframe proxies; this block broadens the supporting rendered-state lesson but does not justify a new owner beyond P0-070/P0-004.

### Block 20 — `requestAnimationFrame` does not currently win the print cut — negative timing control

`beforeprint` schedules `requestAnimationFrame(() => text = 'RAF_MUTATION')` while the prepared text is `RAF_PREPARED`.

Physical PDF contains `RAF_PREPARED`.

After print completes and an animation frame later runs, live DOM becomes `RAF_MUTATION`.

This negative control is retained because it narrows the timing claim. Current Chromium runs synchronous listeners and a microtask checkpoint before print layout (Block 11), but does not paint an animation frame between WebClip's `beforeprint` and `afterprint` lifecycle around `Page.printToPDF`.

Do not overstate the defect as “every asynchronous task queued in beforeprint enters the PDF.”

## Stage 2 classification

Blocks 13–20 are complete and durable.

So far:

- **no new P-code**;
- **no status transition**;
- the SOP-isolated child proves cross-frame parity of the same live render-cut problem without claiming real optional-host-permission QA;
- isolated-world construction does not protect shared DOM artifacts from page mutation;
- page event propagation can prevent WebClip `beforeprint`/`afterprint` lifecycle handlers from running;
- `beforeprint` can change already-ready resource/bitmap state after preparation;
- rAF is a useful current negative control while microtasks remain a positive mutation window.

The next stage must perform a targeted dedup on Block 17 (`printUiHidden` / afterprint suppression / rollback), then either assign it to an existing late print-cleanup owner or retain it as a P0-075/P0-070 acceptance refinement. After that, continue with direct wrapper/rollback and remote-frame print-style mutation controls before final tranche classification.
