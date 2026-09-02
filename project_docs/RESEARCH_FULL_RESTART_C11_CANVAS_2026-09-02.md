# WebClip — fresh full-restart C11 — Canvas

Date: 2026-09-02

Canonical source baseline: `b0e76d6c366434fbbd5feeb34af4ece7b0db1909`.

Current source binding:

- `content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- research branch: `research/full-restart-c11-canvas-2026-09-02`;
- durable reproduction harness: `project_tools/research_c11_canvas.py`.

Research outcome: **`L4-REVALIDATED / FINDING + POSITIVE/CAUSAL CONTROLS (P1-187)`**.

Supporting exact-generation/isolation context: **P0-070 / P0-075**. These are not promoted to additional primary C11 owners by this tranche.

No runtime source, `RESEARCH_REGISTRY.md`, P-owner status, manifest version, build, tag or GitHub Release is changed.

## 1. Scope and evidence envelope

C11 asks whether a canvas bitmap visibly present in admitted selected content remains present and faithful in the physical PDF, especially when same-origin selected BODY content is flattened into a secondary top-document representation.

Relevant boundaries:

- **B1 User Intent** — the user selected content containing a visible canvas bitmap;
- **B2 Admission** — a concrete current canvas bitmap exists in the admitted page/frame generation;
- **B3 Capture** — current WebClip has no canvas-specific capture/materialization branch;
- **B4 Static Materialization** — same-origin BODY flattening uses DOM deep cloning and selected computed-style/URL-state copying;
- **B5 Renderer** — Chromium prints the live/final canvas representation it owns at render cut;
- **B6 Physical Artifact** — PDF bytes are rasterized and measured for the expected bitmap signal;
- **B7–B9** inherit whatever bytes B6 produced and are not independently exercised here.

Required evidence: fresh L1 current-source inspection + L3 managed Chromium + L4 physical PDF, with positive and causal controls.

This tranche does not expand into C12 video, C33 animation, WebGL/WebGPU implementation completeness, OffscreenCanvas worker lifecycle, or the full C35 mutation family merely because those technologies can interact with canvas.

## 2. Fresh current-source inspection

Fresh inspection of exact `main = b0e76d6c366434fbbd5feeb34af4ece7b0db1909` and exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e` finds no canvas-specific materialization path.

Current same-origin BODY flattening still relies on a deep DOM clone plus bounded computed-style copying and selected URL/live-property copying. There is no branch that transfers the source `HTMLCanvasElement`'s renderer-owned bitmap into the cloned canvas.

This creates a precise hypothesis:

> a live source canvas can print correctly in place, while the cloned canvas keeps its DOM attributes/size but starts with a fresh empty bitmap.

Current Registry already has an exact owner for this mechanism:

- **P1-187 ACTIVE** — `Flattened iframe proxy must preserve required rendered state such as canvas bitmap under explicit node/pixel/byte budget.`

Therefore C11 starts with an existing owner candidate. A new P-code is not considered unless fresh evidence proves an independent mechanism outside that owner.

## 3. External standards / implementation / user evidence

External evidence is used only for hypotheses and architecture comparison. Current WebClip source plus fresh physical evidence below decide C11.

### 3.1 WHATWG HTML Standard — canvas is a current bitmap in static visual media

Current HTML Standard canvas semantics state that a canvas provides a dynamically created bitmap. In static visual media such as printing, a canvas that has already acquired a rendering context represents its **current bitmap and size**; otherwise fallback content is represented.

The same standard defines an `origin-clean` security flag. `toDataURL()`, `toBlob()` and `getImageData()` reject with `SecurityError` when the canvas bitmap is not origin-clean. When an `HTMLCanvasElement` is used as a `CanvasImageSource`, its bitmap is the source image.

Sources:

- https://html.spec.whatwg.org/multipage/canvas.html
- https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html

Implications for WebClip:

1. physical PDF fidelity is about the renderer-owned **bitmap**, not only `<canvas width height>` markup;
2. a faithful secondary representation may be able to copy a browser-owned bitmap without serializing raw pixels into extension data;
3. architecture must not assume `toDataURL()` / `getImageData()` is always permitted, because origin-tainted canvases deliberately prevent readback.

### 3.2 SingleFile — real archive tooling acknowledges canvas security limits

SingleFile's current known-issues material states that for security reasons it is sometimes unable to save the image representation of canvas and video snapshots.

Source:

- https://github.com/gildas-lormeau/SingleFile/blob/master/known-issues.md

SingleFile's FAQ also explains that dynamic elements can lose behavior when scripts are removed, reinforcing the distinction between preserving a static visible representation and trying to preserve arbitrary page execution.

Source:

- https://github.com/gildas-lormeau/SingleFile/blob/master/faq.md

For WebClip this is not a requirement to adopt SingleFile's implementation. It is a relevant warning against treating canvas readback as universally available or silently reporting success when the visible bitmap cannot be preserved safely.

## 4. Fresh local-first L3/L4 evidence

The current tool environment provided managed Chromium, Playwright and PyMuPDF, so no dedicated GitHub Actions research workflow was needed.

Successful core evidence used:

- Chromium `144.0.7559.96`;
- forced screen media;
- physical `Page.printToPDF` output;
- PDF raster inspection with PyMuPDF;
- deterministic red/blue canvas fixtures.

Successful core machine-result JSON SHA-256:

`2745003b28dda9d9d1902743987a658cae57b48c956e6dc67212ca09bcaf5926`

The durable harness intentionally contains only successful core acceptance paths. Two exploratory attempts to build a fresh origin-tainted network fixture were blocked by the execution environment with `ERR_BLOCKED_BY_ADMINISTRATOR`; those attempts are **not evidence** and none of their output is used below. The origin-clean/readback limitation is therefore recorded from the standards and comparable-tool documentation, not claimed as freshly reproduced WebClip browser evidence.

## 5. Physical controls and finding

### 5.1 Top-document 2D canvas current bitmap — positive control

Fixture:

- top-document `<canvas>`;
- bitmap size `240×180`;
- 2D context paints solid red;
- fallback DOM text `CANVAS-FALLBACK` exists inside the element.

Physical PDF:

- SHA-256 `c428cc2a48a0391cb4dcf4113b02ea2fb3fc1a971d0e50d7b542aefde8c60197`;
- bytes `1813`;
- red pixels `97200`;
- blue `0`;
- black `0`;
- no extracted fallback text.

Conclusion: current Chromium physically prints the canvas's current bitmap. C11 failures cannot be attributed to a blanket Chromium `printToPDF` inability to render canvas.

### 5.2 Same-origin child canvas printed in place — positive control

Source child state:

- canvas `240×180`;
- sampled source pixel `[255, 0, 0, 255]`;
- fallback DOM string `CANVAS-FALLBACK`.

Direct physical selected-frame PDF:

- SHA-256 `36f3bb47020cff9139132c732fad0cedc029d2c983f4bc1f25b41afcb3718c93`;
- bytes `1813`;
- red pixels `97200`;
- no extracted fallback text.

This proves the child renderer owns a valid red bitmap immediately before the secondary-representation experiment.

### 5.3 Production-shaped deep clone loses the bitmap — FINDING / P1-187

The selected child BODY is cloned with the current production-shaped primitive: `cloneNode(true)`, then connected in the top document while the original frame is hidden.

Before any target canvas context is requested:

- cloned width = `240`;
- cloned height = `180`;
- fallback DOM text is still `CANVAS-FALLBACK`.

Physical clone PDF:

- SHA-256 `21750d25b39443c6b2bb2ddc91a2b54d83d3762324e59cea3e7062cc01fd2e5d`;
- bytes `865`;
- red pixels `0`;
- black pixels `0`;
- extracted text is empty.

A separate diagnostic run that requested a 2D context from the clone measured target pixel `[0,0,0,0]` and produced the same qualitative blank result.

The significant boundary is not missing DOM geometry: dimensions and fallback children survived. What did not survive is the renderer-owned source bitmap.

This is exactly the existing **P1-187 ACTIVE** root and does not justify a canvas-specific new P-code.

### 5.4 Canvas-to-canvas bitmap materialization — causal control

A test-only representation performs:

`targetCanvas.getContext('2d').drawImage(sourceCanvas, 0, 0)`

before physical print.

Observed target pixel:

`[255,0,0,255]`

Physical PDF:

- SHA-256 `36f3bb47020cff9139132c732fad0cedc029d2c983f4bc1f25b41afcb3718c93`;
- bytes `1813`;
- red pixels `97200`.

This recovers the same physical discriminator as the direct source control. The result proves causality: the current failure is missing bitmap materialization in the secondary representation, not a PDF renderer limitation.

This control is an architecture option, **not** an instruction to implement unconditional 2D readback or unbounded bitmap copying.

### 5.5 Live bitmap mutation before physical render cut — supporting generation control

A top-document canvas is first painted red and sampled as admitted red. Before `Page.printToPDF`, the same live canvas bitmap is repainted blue.

Physical PDF:

- SHA-256 `e8d614c82d2a266a3ee517b433e394a14112d9018528718dfbe4e3e332b63111`;
- bytes `1814`;
- red pixels `0`;
- blue pixels `97200`.

Conclusion: physical print consumes the latest live bitmap at render cut. This supports the already-existing exact-generation/isolation architecture under **P0-070 / P0-075** and the broader C35 render-cut family. It is not classified as a new independent canvas owner in C11.

## 6. Duplicate / root-cause reconciliation

Current Registry is the sole owner/status authority.

Primary C11 owner:

- **P1-187 ACTIVE** — explicitly already requires the flattened proxy to preserve rendered state **such as canvas bitmap** under bounded node/pixel/byte work.

Supporting adjacent owners:

- **P0-070 ACTIVE** — one exact admitted save/document generation through final bytes;
- **P0-075 ACTIVE** — live hostile page is not a trusted final representation and print should be isolated.

Fresh evidence does not reveal a materially independent root after those existing owners:

- direct source bitmap prints correctly;
- DOM deep clone loses renderer-owned bitmap;
- explicitly materializing that bitmap in the target restores physical output;
- live mutation affects the later render cut because no independent canvas snapshot/generation has been frozen.

Therefore:

**No new P-code is allocated. No P-owner status changes.**

## 7. Architecture implications — weighted options, not runtime change

C11 supports the following target properties for the existing owners:

1. **Treat canvas bitmap as renderer-owned admitted state.** DOM attributes and fallback descendants do not represent the bitmap the user saw.
2. **Materialize into the actual final printable representation before printing.** For an origin-clean 2D control, canvas-to-canvas `drawImage` is a proven causal mechanism; `ImageBitmap`/renderer-owned equivalents may also be considered.
3. **Do not make raw readback a universal requirement.** `toDataURL()`, `toBlob()` and `getImageData()` can be forbidden by the browser's origin-clean security model. WebClip must not weaken that boundary or introduce extension-level cross-origin pixel extraction merely for fidelity.
4. **Budget bitmap work before allocation/materialization.** Width×height, pixel count, encoded/intermediate bytes, node count and time must remain bounded under P1-187/P0-064/P1-167 style envelopes. One large or many canvases must not create unbounded memory work.
5. **Preserve logical presentation as well as bitmap identity.** Bitmap dimensions and CSS used size/object-fit/compositing remain relevant to physical fidelity; C08/C05/C06 owners still apply where those independent mechanisms are involved.
6. **Freeze/isolate the admitted representation before later host mutation when fidelity requires it.** The red→blue supporting control shows that printing a live canvas later is not an admission snapshot. This remains the existing P0-070/P0-075 architecture problem rather than a second canvas defect.
7. **Truthful degradation is required when safe materialization is unavailable.** An unsupported/tainted/over-budget canvas should not silently become blank while the operation reports a fully faithful success. A bounded degraded/unknown receipt is preferable.

## 8. Non-claims

C11 does **not** claim:

- fresh physical proof for an origin-tainted canvas; the attempted local network fixture was blocked and discarded as evidence;
- complete WebGL/WebGL2/WebGPU/OffscreenCanvas coverage;
- that `drawImage` is the final production design;
- that every canvas must be converted to an encoded raster file;
- any runtime implementation or owner closure;
- any release readiness change.

These boundaries prevent C11 from absorbing neighboring surfaces without evidence.

## 9. C11 conclusion

C11 reaches terminal fresh-restart evidence depth for the core current PDF canvas path:

**`L4-REVALIDATED / FINDING + POSITIVE/CAUSAL CONTROLS (P1-187)`**.

Fresh evidence proves:

- current Chromium can physically serialize a live top-document/current-frame canvas bitmap;
- current WebClip source has no canvas-specific secondary-representation materialization path;
- a production-shaped same-origin BODY deep clone preserves canvas DOM shape but loses the rendered bitmap and produces a blank physical artifact;
- materializing the source bitmap into the target canvas restores the physical result;
- later live bitmap mutation reaches the final physical cut, supporting existing generation/isolation owners without creating a new canvas owner.

Next sequential coordinate after C11: **C12 — Video / replaced media / current frame**.
