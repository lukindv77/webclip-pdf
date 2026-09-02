# WebClip — fresh full-project research — C34 Animated image/GIF current frame — 2026-09-02

Date: 2026-09-02  
Canonical source baseline: `ba76db1e68ed2855f29fc040ed0ad40bfb898a7f`  
Exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`  
Scope: fresh-restart coordinate **C34 — Animated image/GIF frame**.

## Result

**C34: `L4-REVALIDATED / FINDING + POSITIVE/DIRECT/STATIC-PNG/ADMISSION-RASTER/EMBEDDED-IMAGE/CAUSAL CONTROLS (P0-004, P0-070; P1-003 supporting)`.**

Fresh exact-source Chrome evidence proves that renderer-resource readiness and animated-image current-frame fidelity are different facts. A two-frame GIF is deliberately admitted while the browser visibly composites its second **green** frame. Both direct Chromium `Page.printToPDF` and the current WebClip selected PDF serialize an embedded **red first/default frame** instead. WebClip's current resource report is nevertheless clean (`attempted=2`, `loaded=2`, `failed=0`), and the image remains `complete` with the expected intrinsic size and GIF `currentSrc`.

A test-only causal representation freezes the **actual admission screenshot bytes** — not `canvas.drawImage(animated <img>)` — and re-serves those exact green PNG bytes through the same WebClip selected-PDF path. The physical PDF then embeds the same 220×140 green image. A normal static green PNG positive control behaves identically.

This freshly revalidates **P0-004 ACTIVE** selected visual fidelity and **P0-070 ACTIVE** exact admission→physical-render generation. **P1-003 ACTIVE** is supporting evidence because `complete`, successful decode/resource loading and a clean resource report do not prove current composited-frame identity. No new P-code is allocated.

No production runtime, manifest/version, Registry wording/status, release readiness, build/tag/Release is changed by this tranche.

## 1. Contract boundary

`WEBCLIP_PDF_FIDELITY_CONTRACT.md` requires static PDF temporal state to be bound to admitted state rather than a random later/default frame. For animated image/GIF specifically, the contract requires WebClip to strive to preserve the frame actually visible at admission; `img.complete` and generic resource readiness are explicitly insufficient proof of frame identity.

C34 therefore asks a narrower question than C33:

- C33 covers CSS/WAAPI/transition temporal drift and frame-proxy animation state;
- C34 covers an already-decoded animated image whose **currently composited bitmap** differs from the default/static image serialized by the PDF path.

## 2. Fresh source inspection

Current `content.js` resource preparation can establish useful IMG facts:

- image is connected;
- `complete` / non-zero `naturalWidth`;
- `currentSrc` / `src` identity;
- lazy/data-src/data-srcset promotion;
- bounded resource load/decode settlement.

Fresh source still has no animated-image composited-frame receipt, frame index, playback phase, or API that snapshots the bitmap actually visible to the user. The PDF worker ultimately consumes the live prepared document through Chromium printing. Thus an animated resource can be fully ready while the physical PDF chooses a different static frame.

This is not a generic resource-fetch failure and cannot be closed by treating `img.complete` as stronger evidence.

## 3. External platform research

External material is architecture/hypothesis input only; the fresh WebClip physical matrix controls the verdict.

### WebCodecs: animated HTMLImageElement defaults to default/first frame

The current W3C WebCodecs specification explicitly states that when a `VideoFrame` is constructed from an animated `HTMLImageElement`, bitmap data is taken only from the animation's default image, or the first frame if no default exists. This independently demonstrates that common image-to-static-bitmap APIs cannot be assumed to expose the currently composited browser animation frame.

Reference: https://www.w3.org/TR/webcodecs/

### ImageDecoder is frame-addressable, but WebClip lacks a current-frame index

WebCodecs `ImageDecoder.decode({frameIndex})` can decode an explicit animation frame. That is useful implementation vocabulary, but it does not solve admission by itself: current `<img>` does not expose a general cross-format authoritative current animation frame index that WebClip can simply read.

### Current browser evolution confirms this is still an explicit playback-state problem

Recent Chromium/Blink work on CSS animated-image playback controls further illustrates that animated image playback/current presentation is browser-managed state rather than ordinary static DOM resource identity. Any WebClip implementation must therefore define its own bounded admitted-frame capture/materialization contract rather than infer fidelity from URL/decode completion.

## 4. First failed measurement run — retained as rejected harness evidence

The initial C34 run was workflow `33654306727` on exact head `1abe0132ed5a6d3c9bd5077971548c7d513b807b` and concluded FAILURE because two measurement assumptions were invalid.

Useful valid observation from that run:

- direct source screen at admission was green;
- direct Chromium PDF serialized red first/default frame.

Rejected measurement assumptions:

1. screenshots taken **after** WebClip PDF preparation were occluded by WebClip's review/progress overlay and therefore produced zero red/green pixels; they cannot describe the underlying page image;
2. `canvas.drawImage(animated <img>)` produced the GIF's first/default red frame rather than the visible green frame, so it is not a valid admitted-current-frame freeze mechanism.

The failed run is not accepted as C34 completion. It was used to correct the physical measurement design.

A subsequent intermediate raw receipt (`62a720c5b82402ccbd857087702f1edc777a6b0f85c60a16e3587dbe22242a91`) confirmed that using the actual green element screenshot as freeze bytes fixes the second problem, while also confirming the post-prepare overlay problem.

## 5. Accepted physical evidence

Accepted exact-source execution:

- workflow: `Research C34 animated image frame`;
- run: `33655118948`;
- job: `100331638249`;
- exact workflow head: `ceb314d811404886cdbfdcd93321015ce8011c07`;
- browser: Google Chrome `151.0.7922.173`;
- conclusion: **SUCCESS**;
- raw receipt commit: `df65820dba9b3806044aed96d5635c55ee214c1d`;
- result SHA-256: `734d5ece256669f898aa1d1bca141f358c0bf610e06f5027dd12da2981ddf844`;
- durable harness: `project_tools/research_c34_animated_image_frame.py`.

Fixture image:

- frame A: red `(240,20,20)`, 220×140, 300 ms;
- frame B: green `(20,210,20)`, 220×140, 5000 ms;
- looping GIF served from a deterministic localhost endpoint.

The harness waits until a real browser element screenshot contains >10,000 green pixels and <1,500 red pixels before declaring admission. Thus the tested user-visible frame is not inferred from time; it is directly sampled from composited screen output.

## 6. Direct Chromium discriminator

At admission:

- green pixels: `30,800`;
- red pixels: `0`;
- screenshot size: `220×140`.

Immediately before direct print the element remains green with the same counts.

Direct `Page.printToPDF` output:

- page raster: red `39,184`, green `0`;
- embedded image XObject: 220×140 PNG, red `30,800`, green `0`;
- PDF SHA-256: `8e2915ce461770159b316d363bcb0bc4f4728b94fb83b1bdc31e3855bbb358f3`.

This proves the browser's static PDF representation chooses the GIF's first/default red frame even while the screen is visibly on green frame B. The defect substrate is therefore not introduced solely by WebClip selection filtering.

## 7. Current WebClip selected-PDF case

At admission and immediately before opening the PDF preparation modal:

- green `30,800`;
- red `0`.

Current image state after preparation:

- `complete = true`;
- `naturalWidth = 220`;
- `naturalHeight = 140`;
- `currentSrc` remains the exact animated GIF URL.

Current WebClip resource report:

- attempted `2`;
- loaded `2`;
- failed `0`;
- `deadlineExceeded = false`;
- no scan truncation.

Physical selected PDF:

- selected token present;
- explicit Exclude absent;
- outside-scope token absent;
- one embedded 220×140 PNG XObject;
- embedded image red `30,800`, green `0`;
- PDF SHA-256 `db9b39f1683a4aad8369c034d9270955793bc2700ea6589a9a82a49b83d64c7e`.

The current WebClip operation therefore reports a completely ready resource while the immutable PDF contains a different temporal frame from the admitted screen.

PyMuPDF full-page raster returned zero saturated red/green for this WebClip-shaped PDF, so the accepted conclusion does **not** use that raster as its sole image-presence authority. The PDF's referenced embedded image XObject is extracted and inspected directly; static and causal controls below demonstrate the same path embeds green when given a green static bitmap.

## 8. Static PNG positive control

A non-animated 220×140 green PNG is passed through the same WebClip selection, Exclude, preparation and guarded PDF path.

Before preparation it visibly contains green `30,800` / red `0`.

Physical PDF:

- selected token present;
- Exclude/outside absent;
- one embedded 220×140 PNG XObject;
- embedded green `30,800`, red `0`;
- PDF SHA-256 `0ca4e318d0cc37efee45168b10955aad1c054a538dd1ca868519724d6deaf3df`.

Thus the selected-PDF pipeline can preserve a static green bitmap; the GIF result is not a blanket “WebClip images vanish” failure.

## 9. Admission-raster causal control

The causal control waits for the same visible green GIF frame and captures the **actual element screenshot bytes** at admission. Those PNG bytes independently contain green `30,800` / red `0`.

The exact screenshot bytes are then served as `/freeze.png` and replace only the animated IMG resource before WebClip preparation. Before preparation the replacement still visually contains green `30,800` / red `0`.

Physical PDF:

- selected token present;
- Exclude/outside absent;
- embedded 220×140 PNG XObject;
- embedded green `30,800`, red `0`;
- PDF SHA-256 `5b3a3a0af170a6dfdbb24335b54c7eca1f046f6c10252bd3dfe8a47d50eed922`.

This is the decisive causal discriminator: when the already-admitted composited bitmap is converted into an explicit static representation, the current WebClip/Chromium PDF path preserves it. No auto-scroll, page interaction or application mutation is needed.

## 10. Root-cause / duplicate reconciliation

### P0-004 — selected visual fidelity

P0-004 already owns selected PDF visual fidelity. C34 proves an explicitly selected image can be physically saved with the wrong visible temporal frame even though content scope and resource URL are correct. This is directly within that invariant.

### P0-070 — exact admitted-to-physical generation

P0-070 requires one exact user save generation from admission through physical PDF. C34's green admission bitmap and red immutable PDF bitmap are different temporal generations/representations of the same resource. A future closure must establish an explicit admitted-frame cut or truthfully degrade.

### P1-003 — supporting readiness boundary

P1-003 owns actual selected visual-resource readiness. C34 narrows the meaning of readiness: `complete`, successful load/decode and clean resource report do not prove current animated-frame identity. Resource readiness and temporal-frame fidelity need separate receipts.

### P0-075 — architecture support, not freshly revalidated

A future implementation should avoid page-observable mutation merely to freeze GIF playback; C33/C24 already establish the hostile live page is not a trusted freeze workspace. C34 itself does not perform or reproduce a new hostile-page mutation schedule, so P0-075 is supporting architecture context only.

### P1-187 — not claimed in this fresh tranche

Historical temporal evidence shows flattened-frame animated/media state has adjacent problems, but the accepted fresh C34 matrix is top-document only. C34 therefore does not claim a fresh P1-187 revalidation by inference.

### No new P-code

The failure can be resolved under existing visual-fidelity and exact-generation owners. A separate permanent “GIF owner” would duplicate those roots.

## 11. Architecture implications

A safe C34 implementation direction is a bounded **admitted rendered-bitmap materialization** for animated images when exact current-frame fidelity is required.

Important constraints:

1. do not infer current frame from `img.complete`, URL or natural dimensions;
2. do not assume `canvas.drawImage(animated <img>)` returns the currently composited frame;
3. preserve the exact admitted resource/document/application generation;
4. avoid observable live-page pause/play mutation as the capture authority;
5. materialize only images in selected/admitted scope and apply node/pixel/byte/time limits;
6. preserve Exclude and geometry/object-fit/object-position semantics around the static bitmap;
7. if the current composited bitmap cannot be safely obtained, report truthful degraded/unknown instead of full fidelity success;
8. keep resource readiness and temporal-frame readiness as distinct provenance facts.

The accepted harness's element-screenshot route is a causal proof, not automatically the production implementation. A final architecture may use renderer/CDP snapshot facilities or another bounded capture representation, but it must prove equivalence to the admitted visible bitmap.

## 12. Pipeline mapping

- **B1 User Intent:** user selects content containing the animated image.
- **B2 Admission:** actual composited green frame is observed and sampled.
- **B3 Capture:** current source records resource identity/readiness but no animated-frame identity.
- **B4 Static Materialization:** current live GIF remains animated/unfrozen; causal control materializes exact admission raster.
- **B5 Renderer:** Chromium static PDF resolves animated GIF to default/first red frame.
- **B6 Physical Artifact:** WebClip PDF embeds red frame; static/captured-PNG controls embed green.
- **B7–B9:** not independently exercised by this focused tranche.

## 13. Verdict / next coordinate

Fresh C34 verdict:

**`L4-REVALIDATED / FINDING + POSITIVE/DIRECT/STATIC-PNG/ADMISSION-RASTER/EMBEDDED-IMAGE/CAUSAL CONTROLS (P0-004, P0-070; P1-003 supporting)`**.

No P-code/status transition, runtime/version or release change occurs.

After C34 integration, the next sequential coordinate is **C35 — Mutation during preparation / beforeprint / physical render cut**, which already has `PARTIAL / L4 FINDING` and therefore needs focused fresh completion/revalidation rather than from-zero discovery.
