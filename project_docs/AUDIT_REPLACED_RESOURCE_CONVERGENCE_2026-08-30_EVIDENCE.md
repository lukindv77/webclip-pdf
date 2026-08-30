# Durable audit evidence — renderer-owned replaced-resource convergence — 2026-08-30

Canonical P-code owner/status authority remains exclusively in `AUDIT_REGISTRY.md`. This is an interruption-safe checkpoint for a fresh-source audit of renderer-owned replaced/media state and visual-resource readiness. **Blocks 1–20 are complete at this checkpoint.** Later stages may extend the tranche with additional media/SVG/form/frame-parity and truthful-degradation controls.

Exact fresh audited baseline: `main = 66c5cd43906254a583f692bcda3e9e451a29dce6`.

Managed browser: `Chromium 144.0.7559.96`. Physical probes use the current worker-equivalent CDP print shape: screen media emulation followed by `Page.printToPDF` with no headers/footers, backgrounds enabled, scale 1, CSS page size preferred and `ReturnAsStream`. Local HTTP fixtures are used only to control subresource settlement timing. These are focused engineering probes, not real unpacked-Chrome release QA.

No runtime source, `AUDIT_REGISTRY.md`, `manifest.json`, version, build, tag or GitHub Release is changed by this checkpoint.

## Interim owner decision

No new permanent P-code is justified by Blocks 1–20.

- **P1-187 ACTIVE** already owns required rendered state in the flattened same-origin iframe proxy. Fresh proof adds current paused video frame and frame-local text-track resource provenance to the same secondary-representation root cause; canvas is revalidated as a known control.
- **P1-003 ACTIVE** already owns the actual selected visual resource graph under bounded deadlines and truthful omissions. Fresh direct PDF proof adds `video poster`, SVG `<image href>` and `input[type=image]` resources that are physically relevant but currently absent from the explicit prefetch task taxonomy.
- **P0-070 ACTIVE** is supporting physical-generation truth: a clean-looking preparation report cannot prove the artifact contains all admitted renderer-owned resources if those resource classes never entered the report.
- **P0-004 ACTIVE** remains supporting selected-copy fidelity. The direct top-document positive controls show Chromium can render the state; the losses below arise from readiness/secondary representation boundaries rather than generic PDF inability.
- **P1-167 ACTIVE** remains the shared-budget boundary for any expanded renderer-resource graph.

`P1-230` is deliberately not allocated.

## Blocks 1–6 — current video frame versus static DOM cloning

### Block 1 — fresh source boundary: explicit resource tasks are narrower than the renderer-visible graph

`prefetchIncludedResources()` starts from the bounded included-element scan, promotes known lazy image/source attributes, then creates explicit readiness tasks for only:

1. HTML `<img>` using current `currentSrc`/`src`/first srcset URL;
2. each scanned element's computed `background-image` URLs;
3. each scanned element's computed font state through `FontFaceSet.load/check`.

The same scan does not create dedicated tasks for video poster/media/text tracks, SVG image-like href resources or `input[type=image]`. This is the source boundary tested in later blocks.

### Block 2 — direct top-document paused video frame is physically printable: positive control

A deterministic two-second WebM was generated with a red first second and blue second second. The top-document `<video>` was advanced to roughly 1.5 seconds and paused.

Before print the sampled video center was blue. The exact screen-media PDF raster contained about **62,937 blue pixels and 0 red pixels**.

Chromium therefore prints the *current decoded paused frame*, not merely the first frame or static poster. This is an important positive renderer capability control.

### Block 3 — `cloneNode(true)` resets the video renderer state — P1-187

The identical source video was paused in the blue interval and then represented by a production-shaped deep clone using the same media source while the source was hidden.

Observed clone state:

- source remained in the blue interval;
- clone `currentTime` began at 0;
- clone raster was red;
- exact PDF contained about **62,937 red pixels and 0 blue pixels**.

The current flattened-frame representation therefore cannot preserve the current video the user was actually viewing merely by cloning markup and copying URL attributes. This is the video counterpart of the already-owned P1-187 canvas/current-control state problem.

### Block 4 — poster-only video prints correctly in direct Chromium: positive control

A `<video>` with a green poster and no active media source rendered the poster both on screen and into PDF. The PDF raster contained about **62,937 green pixels**.

There is no generic “Chromium cannot print video poster” finding.

### Block 5 — flattened URL copying handles media URLs but not temporal renderer state

Fresh `copyFrameCloneUrlState()` explicitly copies absolute `src` for video/audio/source and absolute `poster` for video. It does not preserve `currentTime`, decoded frame, playback state or an equivalent inert bitmap of the current video representation.

Thus URL provenance alone cannot close Block 3.

### Block 6 — capture acceptance needs an inert current-frame policy, not live playback recreation

The required direction under P1-187 is to preserve the admitted rendered result under explicit pixel/byte/node budgets, or truthfully degrade. Recreating live playback in the top document would introduce timing, network and side-effect ambiguity and is not established by this audit as a safe repair.

## Blocks 7–10 — text-track and frame-local media provenance

### Block 7 — active WebVTT cue enters the physical PDF as text: positive control

A video with a default subtitle track was paused while the cue `CAPTION_MARKER` was active. The exact PDF text extraction contained `CAPTION_MARKER`.

Active media cue state is therefore part of the physically saved representation in current Chromium.

### Block 8 — flattened frame leaves relative `<track src>` bound to the wrong document — P1-187

A same-origin child document used a frame-local base and a video with relative `track src="c.vtt"`. In the source frame the track resolved under `/frame/` and produced active cue `FRAME_CAPTION`.

A production-shaped clone copied the video source URL but left the track's relative `src` unchanged. After adoption into the top document the track resolved under `/top/`, where the controlled server returned 404. The cloned representation had no active cue and the exact PDF contained no caption.

This is frame-local renderer-resource provenance loss under P1-187, analogous to previously proven relative SVG/picture/link cases but for a browser-rendered media cue.

### Block 9 — explicitly preserving the source track URL restores the caption: positive control

When the cloned track was assigned the source track's absolute URL before print, the same PDF contained `FRAME_CAPTION`.

This isolates the failure to the secondary representation rather than VTT/PDF capability.

### Block 10 — relative video poster provenance is already handled: positive control

A source-frame video used a relative poster under `/frame/`. The current proxy copier's `source.poster` absolute rewrite preserved that URL when moved to the top document, and the clone PDF rendered the expected green poster.

Future media-state repair should preserve this working URL-provenance behavior.

## Blocks 11–16 — canvas and responsive-resource negative controls

### Block 11 — top-document 2D canvas pixels print correctly: positive control

A direct 2D canvas contained an opaque red rectangle. Source pixel inspection returned `[255, 0, 0, 255]`; the exact PDF raster contained the expected red region.

### Block 12 — cloned canvas bitmap is absent — P1-187 confirmation

After `cloneNode(true)`, the corresponding clone pixel was transparent black `[0, 0, 0, 0]`, and the exact PDF had no red canvas region.

This revalidates the existing P1-187 canvas case on the current baseline; it does not allocate a new owner.

### Block 13 — WebGL hypothesis rejected in this managed environment

Multiple managed-Chromium launch variants, including SwiftShader-related flags, did not yield a usable WebGL context. No WebGL fidelity claim is registered from this environment. A future real-Chrome regression matrix may still include WebGL, but lack of a managed context is not evidence of a WebClip defect.

### Block 14 — ordinary `srcset` did not switch merely because PDF uses A4: negative control

At a 1200 px screen viewport an image with 400w/800w/1600w candidates and `sizes="100vw"` chose the 1600w blue candidate. Under the exact forced-screen PDF path `currentSrc` remained that candidate and the PDF stayed blue.

Do not claim that paper width intrinsically changes responsive image selection in the production screen-media path.

### Block 15 — `<picture media>` also retained screen-media source selection: negative control

A `<picture>` source guarded by `media="(max-width:800px)"` remained unmatched at the 1200 px screen viewport before and during the forced-screen PDF path. The wide-screen source remained current and physical PDF output matched it.

### Block 16 — tested `sizes="auto"` reflow did not force currentSrc reselection: rejected broad hypothesis

An exploratory image began in a ~300 px flex allocation and selected a 400w resource. After WebClip-shaped layout reflow grew the image toward ~1000 px, the tested Chromium instance retained the original resource rather than automatically switching candidates.

The schedule therefore does not justify a generic “selected-only reflow changes `currentSrc`” finding. Responsive-resource work below is limited to reproductions that materially change physical output.

## Blocks 17–20 — untracked visual-resource readiness and truthful reporting

### Block 17 — delayed video poster is not a print-readiness barrier — P1-003

A controlled video poster response was delayed by approximately three seconds.

- `Page.printToPDF` returned in about **8 ms** while the poster request was still pending;
- immediate PDF had **0** expected green pixels;
- after the poster request settled, otherwise identical PDF contained about **62,937 green pixels**.

Current explicit prefetch has no video-poster task, so this physically selected renderer resource is outside the current readiness proof.

### Block 18 — delayed SVG `<image href>` is likewise not awaited — P1-003

A selected SVG image referenced a controlled yellow PNG whose response was delayed roughly three seconds.

- print returned in about **30 ms**;
- immediate PDF contained **0** expected yellow pixels;
- post-settlement PDF contained about **62,937 yellow pixels**.

This is a direct actual-visual-resource-graph case, not merely a theoretical URL scanner gap.

### Block 19 — delayed `input[type=image]` resource is also omitted before settlement — P1-003

A selected image input used a controlled delayed red PNG.

- print returned in about **7 ms**;
- immediate PDF contained **0** expected red pixels;
- post-settlement PDF contained about **63,126 red pixels**.

The same current prefetch taxonomy has no dedicated image-input readiness task.

### Block 20 — current resource report can remain clean while a selected visual resource is physically absent — P1-003 / P0-070

The three resource classes in Blocks 17–19 never create a current explicit task. Therefore they do not increment `attempted`, `failed` or `omittedByLimit`; their absence is also not by itself `scanTruncated` or `deadlineExceeded`.

Fresh worker source classifies resource preparation as partial only when one of those known counters/flags signals a problem. It then proceeds to `generatePdfBlob()`.

Consequently valid PDF bytes can omit a selected poster/SVG image/image-input resource while the resource report contains no evidence that this renderer-visible input was unconfirmed. This is exactly the “bounded omissions must be truthful” part of P1-003 and a supporting P0-070 artifact-truth boundary.

## Stage-1 acceptance direction

Blocks 1–20 support a renderer-owned resource/state contract rather than an ever-growing ad-hoc list of HTML attributes:

1. the readiness graph must cover renderer-visible selected resources, including non-`<img>` replaced-resource slots, under one shared P1-167 budget;
2. untracked classes cannot be reported as fully prepared merely because they produced no task;
3. direct browser state that survives ordinary printing (current video frame, active VTT cue, canvas pixels) must either be preserved by the P1-187 secondary representation or explicitly reported as degraded;
4. URL copying is necessary but insufficient for renderer-owned temporal/bitmap state;
5. positive controls for working poster URL absolution and forced-screen responsive source selection must remain non-regressed;
6. no extension-level response-byte fetch is implied by this evidence — the existing renderer/privacy boundary can be preserved while waiting/materializing/truthfully reporting page-owned resource state.
