# Durable audit evidence — live iframe responsive-environment mutation — Blocks 17–32 — 2026-08-30

Continuation of `AUDIT_VIEWPORT_ENVIRONMENT_FIDELITY_2026-08-30_EVIDENCE.md` from fresh base `4d26fb5b6481861d0f11f37e8c3c8746afb5b6ab` on branch `audit/viewport-environment-fidelity-2026-08-30`.

Canonical owner/status authority remains `AUDIT_REGISTRY.md`. Audit/docs only; runtime, registry, manifest/version/build/tag/release state unchanged.

## Source path under test

Current same-origin live-frame preparation is not geometry-neutral:

- `applySelectedFramePrintFlow(frame,'frame',...)` sets selected iframe `width:100% !important`, `max-width:100% !important`;
- `measureSelectedFrameHeightAtPrintWidth(frame)` reads current frame width, chooses `measureWidth = min(screenWidth,640)`, temporarily sets the live iframe to that pixel width, forces layout, reads child document heights, then restores the iframe to `width:100%`;
- `stabilizeSelectedFramePrintHeights()` can execute up to `SELECTED_FRAME_PRINT_STABILIZE_PASSES = 3` passes.

The iframe is the real host-page element and its child is the real application document. Width mutations therefore participate in ordinary browser responsive lifecycle.

## Controlled fixture

Top screen viewport: 1200×800.

Source same-origin iframe:

- CSS width 420 px;
- child `innerWidth=420`;
- child `@media(min-width:800px)` false;
- visible generated state `CSS_NARROW`;
- 50vw child element = 210 px;
- 10vw child font = 42 px;
- responsive grid = one column.

Child installs both:

- `matchMedia('(min-width:800px)').change` listener;
- `ResizeObserver` on its document root.

For deterministic evidence each event appends a visible `MUT_<kind>_<width>` node to the child body. This models ordinary page-owned responsive code/materialization without synthetic WebClip control activation.

## Block 17 — source iframe responsive state is narrow

Initial frame width and child viewport are both **420 px**.

Child media state is narrow and the direct PDF physically contains `CSS_NARROW` plus the baseline content.

This is the admitted source-state control.

## Block 18 — WebClip `width:100%` changes the live child viewport

The current frame-normalization primitive changes the 420 px frame to approximately **1184 px** in the 1200 px top viewport.

Child `innerWidth` changes to 1184 px.

This occurs before physical PDF pagination and is not an A4-only renderer effect; it is a live page mutation made during preparation.

## Block 19 — child CSS media query flips because of WebClip preparation

At 1184 px the child's `@media(min-width:800px)` changes false → true and visible state changes `CSS_NARROW → CSS_WIDE`.

Thus WebClip can select a different responsive CSS branch than the user originally saw.

## Block 20 — child viewport-relative geometry also changes

In the same width normalization:

- child `50vw`: **210 → 592 px**;
- child `10vw` font: **42 → 118.4 px**;
- one-column responsive grid becomes two columns (`~590px + ~590px`).

This is a direct same-view fidelity change before printing.

## Block 21 — measurement width introduces a second responsive transition

With the normalized screen width around 1184, current measurement chooses the hard upper bound **640 px**.

The real child viewport therefore transitions again from 1184 → 640 during measurement.

For the test `min-width:800` query, this changes wide → narrow.

## Block 22 — restoring `100%` introduces a third transition

After reading child height, current code restores the live iframe to `width:100%`, taking the child 640 → 1184 and narrow → wide again.

One stabilization pass can therefore expose the page to at least two opposite responsive transitions after the initial normalization.

## Block 23 — three stabilization passes repeat the transitions

The production constant permits three passes.

The exact model executes the resulting responsive sequence repeatedly:

`1184 → 640 → 1184 → 640 → 1184 → 640 → 1184`.

This is bounded in count, but bounded does not mean capture-neutral.

## Block 24 — child `matchMedia` change events are physically real

The child listener recorded repeated transitions including:

- `MQ_WIDE:1184`;
- `MQ_NARROW:640`;
- `MQ_WIDE:1184`;

for each stabilization cycle.

No click or explicit application command is needed; changing the browsing-context viewport is sufficient.

## Block 25 — ResizeObserver also observes WebClip's preparation

The child root `ResizeObserver` fired on the live width transitions, including observations at 420, 1184 and 640 px.

Therefore pages implemented with ResizeObserver rather than media-query listeners are equally able to react to WebClip's temporary frame geometry.

## Block 26 — responsive page code can materialize new selected DOM

The deterministic child handlers append visible nodes such as:

`MUT_RESIZE_1184`, `MUT_MQ_WIDE_1184`, `MUT_RESIZE_640`, `MUT_MQ_NARROW_640`.

After the three-pass preparation model, these nodes are part of the real child document.

This is not hypothetical network behavior; the probe demonstrates ordinary synchronous DOM mutation caused solely by WebClip-observable responsive events.

## Block 27 — restoring the original iframe style restores CSS geometry only

After removing the temporary inline style, the source frame returns to:

- frame width 420 px;
- child `innerWidth=420`;
- visible CSS state `CSS_NARROW`.

Thus the basic frame-style rollback itself can appear successful.

## Block 28 — responsive application mutations survive rollback

Despite restored 420 px geometry, all DOM nodes appended by the responsive handlers remain in the child body.

Restoring an element's old inline style cannot undo arbitrary page application effects that were triggered while the temporary style was active.

This is the important generation boundary: style rollback is not application/renderer-state rollback.

## Block 29 — rollback itself causes another observable responsive transition

Returning 1184 → 420 generates further ResizeObserver and `MQ_NARROW:420` events.

Therefore even cleanup can mutate the host application again. “Restore to original CSS” does not imply “restore to original page state”.

## Block 30 — physical pre-preparation PDF is the positive control

Before the WebClip-like width sequence, direct PDF:

- SHA-256 `1481db3a46c4dad9bc93ea940e6afea361fcbcc5c123c8f4a39c78e6e190e9b7`;
- size 7,283 bytes;
- extracted text contains `CSS_NARROW`, `BASE` and only the initial benign observer scheduling marker from fixture setup.

This establishes the source artifact baseline.

## Block 31 — physical PDF after rollback contains preparation-created content

After the width sequence and full frame-style rollback, a second physical PDF:

- SHA-256 `590dfdab6a8c0abece1a2cba48e406ec099a1ffbb1e867f989790106ea1c185c`;
- size 7,993 bytes;
- extracted text contains the previously absent `MUT_RESIZE_1184`, `MUT_MQ_WIDE_1184`, `MUT_RESIZE_640`, `MUT_MQ_NARROW_640`, etc.

The final CSS branch is again narrow, but the saved document generation is no longer the one the user admitted before preparation.

## Block 32 — owner/dedup classification

No new P-code/status transition.

Primary refinements:

- **P0-075 ACTIVE** — host page is not a trusted/neutral preparation workspace. Temporary frame geometry is observable application input and can trigger irreversible page-owned effects;
- **P0-070 ACTIVE** — save authority must bind to the intended full renderer/application generation; a document mutated by WebClip preparation is a different generation even when browser `documentId` did not change;
- **P0-004 ACTIVE** — the physical saved copy can contain responsive materialization absent from the user-admitted visual state.

Supporting boundaries:

- **P1-167 ACTIVE** — three-pass stabilization is bounded, but any future measurement strategy still needs bounded work;
- historical frame-layout rollback owners remain relevant to exact style rollback but do not by themselves undo application side effects;
- **P2-007 BACKLOG** — a reflow/static mode may deliberately alter layout only if this is explicit; it still should not silently execute page application transitions and call the result the same state.

No offensive/security conclusion is made. This is fidelity/isolation architecture evidence.

## Acceptance direction

A faithful capture path should measure/materialize frame layout without repeatedly resizing the live application browsing context, or should operate on an isolated representation whose responsive reactions cannot mutate the authoritative source state. If the page must be mutated, the system needs a stronger admitted/frozen representation than best-effort CSS rollback.

Blocks 17–32 are complete and interruption-safe.
