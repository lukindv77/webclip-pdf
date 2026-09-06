# P1-187 — flattened iframe rendered-state fidelity and raster admission — 2026-09-07

Status: **ACTIVE / architecture-saturated, implementation not present on `main`**.

Canonical source baseline inspected: `main` at `d4f5b268fa3f7ced5a7bc68da52784863d614138`.

Canonical Registry owner:

> `P1-187 | ACTIVE | Flattened iframe proxy must preserve required rendered state such as canvas bitmap under explicit node/pixel/byte budget.`

This document narrows that owner to the current concrete flattened same-origin iframe BODY path. It does not change Registry status and does not claim runtime closure.

## 1. Current source proof

### 1.1 Flattening clones structure, not canvas bitmap state

`content.js::createFlattenedBodyFramePrintProxy()` creates a detached print-only proxy and deep-clones each top-level child of the selected iframe BODY.

The deep clone is intercepted by `frame-proxy-inert-guard.js::cloneNodeInert()` so active elements/custom elements are neutralized before the representation can enter the top document.

For an ordinary HTML element the inert guard:

1. creates a new element with `ownerDoc.createElement(localName)`;
2. copies safe attributes;
3. recursively mirrors descendants.

`canvas` is not in the active-element neutralization list, so a source `<canvas>` becomes a fresh target `<canvas>` with copied attributes, but there is no current bitmap-copy step.

`content.js` later copies computed CSS for corresponding source/target elements. CSS does not restore the source canvas backing bitmap.

The only current `canvas` occurrence in `content.js` is discovery scoring (`img,picture,figure,svg,canvas`), not flattened-proxy state preservation.

### 1.2 The platform itself does not make `cloneNode()` sufficient

MDN documents that `Node.cloneNode()` does not copy the painted image of a `<canvas>` element.

The HTML Standard defines an `HTMLCanvasElement` as a `CanvasImageSource` whose current bitmap is the source image for 2D rendering APIs. Therefore the current bitmap can be copied into a fresh target canvas with `CanvasRenderingContext2D.drawImage(sourceCanvas, 0, 0)` without requiring `getImageData()` or data-URL serialization.

Relevant references:

- https://developer.mozilla.org/en-US/docs/Web/API/Node/cloneNode
- https://html.spec.whatwg.org/multipage/canvas.html

### 1.3 P0-064 deliberately did not close rendered-state fidelity

`frame-proxy-budget-guard.js` already provides the accepted P0-064 preflight boundary before `sourceBody.childNodes`, deep clone, complete descendant arrays and proxy connection.

Current explicit P0-064 envelope:

- nodes: 5,000;
- text/comment UTF-16 units: 2,000,000;
- estimated DOM/string bytes: 8,388,608.

The P0-064 closure evidence explicitly says that its allocation/work budget does **not** close rendered-state fidelity.

That separation remains correct: P1-187 composes with P0-064 instead of replacing it.

## 2. Two independent current defects

P1-187 is not only a visual-fidelity issue.

### 2.1 Fidelity defect

Schedule:

1. selected same-origin iframe BODY contains a canvas;
2. page draws meaningful visible pixels into that canvas;
3. WebClip enters selected-print preparation;
4. inert deep clone creates a fresh target canvas;
5. attributes/styles are copied but the source bitmap is not;
6. flattened proxy replaces the original iframe for print;
7. PDF can complete successfully with a blank/default canvas.

DOM structure can therefore be complete while the selected rendered representation is incomplete.

### 2.2 Pre-clone raster-allocation defect

A naive future fix that checks canvas pixels only after deep clone is too late.

During `cloneNodeInert()` a fresh target canvas is created and its `width`/`height` attributes are copied. The browser may need to materialize the target backing bitmap at that point.

Therefore a huge or numerous canvas set could create raster allocation before a post-clone P1-187 budget is consulted.

The existing P0-064 pointer-based source walk is the correct admission cut because it already executes before the first deep clone.

## 3. Required combined preflight receipt

P1-187 should extend the **existing** P0-064 source-tree preflight. It must not introduce a second traversal that occurs after deep clone.

The receipt needs independent rendered-state counters, conceptually:

```text
{
  ...existingP0064Receipt,
  renderedStateNodes,
  canvasPixels,
  renderedStateBytes,
  limits: {
    ...existingP0064Limits,
    renderedStateNodes,
    canvasPixels,
    renderedStateBytes
  }
}
```

The current concrete rendered-state node is `canvas`.

For every source canvas encountered during the pre-clone pointer walk:

1. increment rendered-state node count;
2. read intrinsic `width` and `height` as finite safe non-negative integers;
3. checked-multiply `width * height`;
4. checked-add aggregate pixels;
5. checked-multiply the logical bitmap byte estimate;
6. checked-add aggregate rendered-state bytes;
7. fail before the native `childNodes` getter if any count, arithmetic or limit is invalid.

Unsafe integer arithmetic is a rejection condition, not a clamp.

### Why all source canvases are initially charged

Current inert cloning materializes the complete subtree and removes Exclude-marked target subtrees only later in `content.js`.

Therefore an excluded source canvas can still allocate a target canvas during the deep clone. Until clone-time Exclude pruning is separately implemented and proven, P1-187 allocation admission must conservatively count every canvas that the current inert clone can materialize.

This can reject more often than an ideal future implementation, but it remains fail-closed and allocation-truthful.

## 4. Explicit budgets without inventing unverified production numbers

Registry requires an explicit node/pixel/byte budget. Runtime closure therefore requires finite named constants, for example:

```text
MAX_RENDERED_STATE_NODES
MAX_RENDERED_STATE_PIXELS
MAX_RENDERED_STATE_BYTES
```

This research intentionally does **not** canonize arbitrary production values without physical Chrome memory/print evidence.

Closure requires:

- finite positive constants committed in source;
- exact-boundary deterministic tests;
- Chrome evidence for ordinary under-budget capture;
- Chrome evidence that each overflow rejects before target canvas/deep-clone raster materialization;
- evidence that the chosen envelope does not reopen worker/page preparation liveness budgets.

The deterministic model uses deliberately small injected limits to prove the ordering and all-or-nothing semantics independently of final production tuning.

## 5. Bitmap-copy mechanism

After the aggregate P0-064 + P1-187 preflight succeeds, the inert mirror may copy a source canvas while it still has both the source and fresh target element in `cloneNodeInert()`.

Preferred conceptual operation:

```text
if source canvas has non-zero intrinsic area:
    target2d = target.getContext('2d')
    target2d.drawImage(source, 0, 0)
```

This preserves the browser's current source bitmap rather than reconstructing author drawing commands.

### No JS pixel export

P1-187 should not use these as the normal path:

- `getImageData()`;
- `toDataURL()`;
- `toBlob()` followed by persisted/serialized page pixels.

Reasons:

1. unnecessary extra memory/copy work;
2. `toDataURL()` creates potentially huge strings;
3. pixel-read APIs have origin-clean restrictions;
4. page bitmap content must not leak into Journal, logs, diagnostics or storage.

The HTML canvas model permits an `HTMLCanvasElement` to be used directly as the draw source. A non-origin-clean source propagates its origin-clean state to the destination instead of requiring JS to read the pixels.

P1-187 diagnostics therefore contain only bounded numeric/status receipts, never bitmap bytes.

## 6. Copy failures are representation failures

Current `content.js` deep-clone loop catches individual `node.cloneNode(true)` failures and continues.

That is incompatible with P1-187 if the inert clone starts throwing on a failed required bitmap copy: silently continuing could omit one top-level subtree and still publish the rest of the flattened proxy.

Introduce a dedicated error contract, conceptually:

`WEBCLIP_FLATTENED_FRAME_RENDERED_STATE_COPY_FAILED`

For that failure class:

- do not swallow the clone failure;
- do not connect the partial proxy;
- do not hide the original iframe because of that proxy;
- discard any disconnected partially populated representation;
- surface a truthful degraded/failed print-preparation outcome through the existing owner composition.

A physical copy failure can occur after one or more **disconnected** target canvases were already populated. That is acceptable only if the complete proxy is then discarded and never becomes printable state.

## 7. Zero-area canvas

`width === 0` or `height === 0` has zero bitmap pixels.

It still counts as a rendered-state node but contributes zero pixels/bitmap bytes. No `drawImage()` is required for the zero-area source.

This avoids treating an empty canvas as an implementation failure.

## 8. Owner composition

### P0-064

Owns source-tree DOM/text/estimated-byte admission before materialization. P1-187 extends the same pre-clone walk with raster counters; it must preserve P0-064's accepted fail-before-deep-clone property.

### P0-068

Owns inertness of the flattened proxy. Canvas bitmap preservation must stay inside the inert isolated-world representation and must not re-enable scripts/custom elements/nested browsing contexts.

### P1-150

Owns truthful handling of selected iframe height above the 200000px print-height guard. A flattened proxy can satisfy P1-150 only when its representation is itself complete. If P1-187 raster admission/copy fails, that proxy cannot be used as proof of a complete alternate representation.

### P1-003

Owns renderer-resource readiness for selected visual resources. P1-187 is narrower: it preserves current in-memory canvas bitmap state once that state exists. It does not define external CSS/image/font fetch readiness.

### P0-075 / P0-070

Host mutation and exact save/document generation remain separate authorities. P1-187 does not claim a coherent page-freeze protocol for canvases that continue mutating while preparation runs.

### P1-167

Owns the shared operation-wide preparation/diagnostic computation budget. P1-187's raster admission must be included in, not exempt from, that broader operation budget when P1-167 is implemented.

## 9. Deterministic model

`project_tools/test_p1_187_flattened_frame_rendered_state_model.js` proves:

- under-budget canvas state is admitted as one aggregate before target allocation;
- rendered-state node overflow creates zero target canvases;
- pixel overflow creates zero target canvases;
- byte overflow creates zero target canvases;
- unsafe multiplication fails closed before target allocation;
- zero-area canvas is valid and requires no bitmap copy;
- a later physical copy failure discards the entire disconnected representation rather than publishing a partial proxy.

Observed research run:

`P1-187 flattened-frame rendered-state model: PASS`

This is an architecture/model result only.

## 10. Source-bound runtime gate

`project_tools/test_p1_187_flattened_frame_rendered_state_source.js` is intentionally RED on the current runtime.

It requires source evidence for:

- explicit rendered-state node/pixel/byte limits in the pre-clone budget guard;
- canvas dimension accounting in `preflightFlattenedBody()`;
- safe integer arithmetic;
- bitmap copy via `drawImage()`;
- no `toDataURL()` / `getImageData()` pixel-export path in the inert mirror;
- dedicated copy-failure propagation instead of the current broad clone-error swallowing;
- preservation of the existing disconnected-proxy publication boundary.

## 11. Required real Chrome closure evidence

P1-187 must remain ACTIVE until source implementation plus direct Chrome evidence exists.

Minimum discriminating browser matrix:

1. **2D positive control** — canvas contains a deterministic visible sentinel graphic; flattened proxy PDF physically contains that graphic rather than the blank clone state.
2. **DOM-only negative discriminator** — demonstrate that an ordinary structural clone without P1-187 bitmap copy loses the sentinel.
3. **non-origin-clean source** — current bitmap is copied through browser drawing semantics without JS pixel-read/data-URL extraction and without a `SecurityError`-driven silent omission.
4. **rendered-state node overflow** — rejected before first target canvas/deep-clone raster allocation.
5. **pixel overflow** — same pre-allocation rejection.
6. **byte overflow** — same pre-allocation rejection.
7. **copy failure** — partially prepared detached proxy is discarded, original iframe is not replaced by that incomplete proxy, and save does not claim complete alternate representation.
8. **zero-area canvas** — ordinary representation remains valid.
9. **P0-064/P0-068 regressions** — prior budget-first and inertness evidence remains green on the exact implementation head.
10. **P1-150 composition** — over-height iframe cannot use a raster-incomplete flattened proxy to claim successful completeness.

A textual assertion that `drawImage()` was called is not sufficient browser evidence; the physical PDF must discriminate copied bitmap from blank cloned canvas.

## 12. Current conclusion

P1-187 is **architecture-saturated but ACTIVE**.

The root cause is now source-bound:

- current flattened representation loses canvas bitmap state;
- a post-clone-only raster budget would itself be too late because target canvas allocation begins during inert deep clone;
- the accepted P0-064 preflight is the correct place to add aggregate rendered-state admission;
- after admission, bitmap preservation can use browser-native `drawImage()` without exporting page pixels to JS strings;
- any required bitmap-copy failure must discard the whole disconnected proxy instead of being swallowed as a partial success.

No runtime, manifest, Registry, release-readiness, build, tag or GitHub Release change is made by this research branch.
