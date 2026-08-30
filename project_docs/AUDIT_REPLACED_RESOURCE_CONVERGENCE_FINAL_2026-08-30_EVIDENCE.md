# Durable audit evidence — renderer-owned replaced-resource convergence — final stage — 2026-08-30

Canonical P-code owner/status authority remains exclusively in `AUDIT_REGISTRY.md`. This file completes **Blocks 37–56**. Together with the stage-1 and stage-2 checkpoint files, the tranche contains **56 completed blocks** from exact fresh `main = 66c5cd43906254a583f692bcda3e9e451a29dce6`.

Managed Chromium remains `144.0.7559.96`; exact physical PDF probes use the worker-equivalent forced-screen `Page.printToPDF(...ReturnAsStream)` path. Real unpacked Chrome remains release QA.

No runtime source, registry row, manifest/version/build/tag/release state is changed.

## Blocks 37–43 — additional media/replaced renderer state

### Block 37 — delayed primary `<video src>` itself is outside current readiness tasks — P1-003

A selected autoplay/muted video used a controlled media response delayed roughly three seconds and no poster.

Before settlement:

- `readyState = 0`;
- `currentTime = 0`;
- exact `Page.printToPDF` returned in about **23 ms**;
- expected red/blue video-frame pixels were both **0**.

After settlement:

- `readyState = 4`;
- video was playing at about t≈0.69 s;
- PDF contained about **77,748 red pixels**.

Current top prefetch has no video-media readiness task. The actual media resource itself, not only the poster, is therefore a direct P1-003 selected renderer-resource case.

### Block 38 — known delayed ordinary `<img>` wait is a positive control

A controlled ordinary image began incomplete (`naturalWidth=0`) and settled after roughly two seconds. A production-shaped DOM-image load wait blocked for about **1.98 s**, after which `naturalWidth=300` and the exact PDF contained about **32,865 expected yellow pixels**.

This validates the existing ordinary-IMG readiness design pattern. The audit direction is to extend truthful renderer-resource coverage, not to remove a working bounded wait.

### Block 39 — SVG `<feImage>` is physically relevant in direct Chromium: positive control

A selected SVG filter whose output came from `<feImage href=...>` rendered the referenced yellow image into PDF, with about **32,760 yellow pixels** in the settled control.

The resource slot is a real selected visual dependency in this Chromium build.

### Block 40 — delayed SVG `<feImage href>` is not awaited by PDF or current explicit prefetch — P1-003

With the `feImage` response delayed by about three seconds:

- exact print returned in about **43 ms**;
- immediate PDF had **0** expected yellow pixels;
- settled PDF contained about **32,760 yellow pixels**.

Current prefetch does not scan `feImage href`, so this renderer-owned SVG resource is another truthful-omission case under P1-003.

### Block 41 — audio control renderer state also resets under cloning — P1-187 supporting

A four-second audio fixture with browser controls was paused around t≈2.14 s. Its deep clone reported `currentTime=0` with the same duration. Exact source-versus-clone PDF rasters differed across roughly **1,100 pixels** in the controls region.

This is the non-video media-control counterpart of Block 3. It does not justify a separate audio owner; P1-187 already owns renderer-owned state lost by the flattened secondary representation.

### Block 42 — nested `<source src>` URL provenance is a positive proxy control

A source-frame video used a relative nested `<source src="../v.webm">`. `source.src` resolved to the exact frame resource. Production-shaped URL copying assigned that absolute source URL in the adopted clone, and `clone.currentSrc` remained the correct resource URL.

URL identity was therefore preserved for the nested source.

### Block 43 — correct media URL still does not preserve the current frame

In the same control the source video was paused in the blue interval around t≈1.63 s, while the clone began at `currentTime=0`. Exact clone PDF rendered the red initial frame (~77,748 red pixels, 0 blue) despite correct absolute `currentSrc`.

This sharply separates media **resource provenance** from media **renderer state**. Both belong to P1-187, but one cannot substitute for the other.

## Blocks 44–48 — physical generation and current-view semantics

### Block 44 — poster-to-decoded-frame transition can be selected purely by preparation timing — P0-070 / P2-007 supporting

A video had an already available green poster plus a controlled delayed media source.

Early physical PDF while `readyState=0` contained about **77,748 green poster pixels**. After media settlement and autoplay (`readyState=4`, t≈0.81 s), the otherwise identical PDF contained about **77,748 red decoded-frame pixels** and no green poster pixels.

Neither state is intrinsically a browser bug. The product must define whether the saved copy means renderer state at save admission, at physical cut, or a stable static-media representation. P0-070 owns exact generation; P2-007 owns explicit capture/output semantics.

### Block 45 — preparation latency can move an already playing video between materially different frames

The earlier red-to-blue current-frame schedule began near t≈0.19 s with a red rendered frame. After ~1.2 seconds of asynchronous preparation-equivalent delay, the physical PDF captured the blue interval at t≈1.57 s.

A future freeze contract must cover renderer-owned temporal media state if the product claims an exact current-view copy. Waiting for resources without freezing the admitted generation is not sufficient by itself.

### Block 46 — paused direct video remains a stable positive current-view control

When the top-document source video is deliberately paused, Chromium directly prints that current decoded frame correctly. Therefore current-frame freezing/materialization is technically meaningful; WebClip should not degrade a stable paused state merely because secondary cloning lacks temporal state.

### Block 47 — static poster mode remains a valid explicit degradation candidate

When a video has no available current media frame, Chromium's poster representation is physically printable. An explicit mode/policy may choose poster/static-media representation, but it must not silently substitute poster/first frame for a current paused frame while claiming faithful current-view fidelity.

### Block 48 — active text cues can carry useful later-reading semantics

Because active WebVTT cues enter PDF text, preserving the current cue can improve saved-copy accessibility/searchability. Static media materialization should consider cue text as renderer-owned semantic state, not only raster pixels, under the selected output-mode policy.

## Blocks 49–52 — report/representation architecture

### Block 49 — a per-tag URL patch list will continue to miss renderer-owned dependency classes

Across this tranche alone, physically relevant resource/state inputs include:

- ordinary IMG current candidate;
- video media source;
- video poster;
- active text track;
- SVG image href;
- SVG filter `feImage`;
- image-input source;
- stylesheet settlement that later creates new computed visual URLs;
- current canvas bitmap;
- current video/audio temporal state.

Prior evidence already adds backgrounds, pseudo content, border-image, clip-path and frame-local generated state. The durable solution is a bounded renderer-resource/state contract rather than indefinitely enumerating isolated attributes without settlement semantics.

### Block 50 — frame parity must use the same resource/state vocabulary

Top content currently has IMG/background/font tasks; frame-agent currently has only ordinary IMG waiting. A repaired P1-003 contract should expose the same bounded resource-state categories and truthful unknown/omission semantics for top and selected remote frames, while P1-229 retains its separate selected-only media/geometry authority.

### Block 51 — secondary frame materialization needs explicit state budgets

P1-187 acceptance for canvas/video/media cannot mean unbounded rasterization of arbitrary renderer surfaces. Required controls include explicit node/pixel/byte/time budgets, deterministic handling when a current frame/bitmap cannot be captured, and no recreation of live playback or other active content merely to make the copy look right.

### Block 52 — diagnostics and OperationLog remain telemetry rather than artifact proof

Current generic page diagnostics and resource counters can help explain a failure, but they do not cryptographically or semantically prove the final PDF contains the same video frame, cue, canvas bitmap or late stylesheet state. Artifact success must not be inferred from the absence of a known resource failure counter.

## Blocks 53–56 — regression matrix and final classification

### Block 53 — required regression matrix for P1-003 / P1-187 convergence

A future implementation should retain at least these cases:

1. delayed ordinary IMG -> bounded wait/known positive path;
2. delayed video poster -> either ready before print or truthful omission;
3. delayed primary video source -> defined current/static-media behavior and truthful readiness;
4. delayed SVG image -> ready or truthful omission;
5. delayed SVG `feImage` -> ready or truthful omission;
6. delayed image input -> ready or truthful omission;
7. pending stylesheet that later changes selected paint -> do not claim settled visual graph prematurely;
8. pending stylesheet that later introduces background/font resource URLs -> newly emerging graph remains bounded and truthful;
9. paused current top video frame -> direct current frame survives faithful current-view mode;
10. flattened same-origin paused video -> current frame does not reset to first frame/poster without explicit degradation;
11. relative frame text track -> source cue/resource provenance retained;
12. relative frame image-input and SVG image -> source resource identity retained;
13. nested relative video `<source>` remains correctly absolutized;
14. current canvas bitmap remains preserved under the existing P1-187 budget contract;
15. audio/video browser-owned control state follows the declared static/current-view mode;
16. active caption text remains available when semantically admitted;
17. ordinary `srcset` and `<picture media>` forced-screen positive controls remain stable;
18. WebGL remains a real-browser regression item because this managed environment could not obtain a usable context.

### Block 54 — negative/rejected controls remain part of the evidence

Do not promote these into unsupported broad defects:

- A4 forced-screen print did not by itself reselect tested ordinary srcset/picture candidates.
- Tested `sizes="auto"` reflow did not force a resource switch.
- Relative frame video poster and nested media source URLs are already correctly absolutized by current proxy copying.
- Object/embed fixtures were inconclusive in this headless environment and are not registered as WebClip regressions.
- External SVG `<use>` delayed transport did not produce a valid rendered positive control in the tested schedule and is not used as a fresh defect.
- WebGL was unavailable in the managed browser and is explicitly not counted as a failure.

### Block 55 — duplicate/root-cause review rejects a new P-number

Fresh registry makes P1-003 directly authoritative for the actual selected visual resource graph, frame parity, Page.printToPDF-not-a-readiness-barrier and truthful bounded omissions. P1-187 directly owns required rendered state in the flattened iframe proxy.

Git history also contains prior deliberate decisions not to allocate `P1-230` for adjacent physical-copy refinements. The fresh media/replaced-resource evidence materially strengthens those existing owners but does not establish an independent root cause.

### Block 56 — final acceptance and tranche closure

The 56-block tranche converges on one rule:

> **WebClip must account for the renderer state/resources that actually determine the admitted saved representation, not only HTML attributes or URLs that happen to be easy to enumerate.**

Required architecture direction:

1. `P1-003`: one bounded renderer-visible resource-settlement model for top + selected frames, including truthful `unknown/omitted` when the graph is still emerging or a supported class cannot be confirmed;
2. `P1-187`: one bounded inert materialization contract for renderer-owned state lost by cloning, including current canvas/video/media/cue state and exact frame-local resource provenance;
3. `P0-070`: bind that representation to the declared save generation from admission to physical PDF bytes;
4. `P0-004`: preserve complete selected visual/semantic content without silently substituting materially different renderer state;
5. `P1-167`: keep resource/state enumeration, waiting and raster/materialization work under shared node/time/pixel/byte limits;
6. `P2-007`: explicitly distinguish faithful current-view media state from static-reading/poster/fallback semantics where both are reasonable product choices;
7. preserve direct working browser behavior instead of flattening everything indiscriminately;
8. require real unpacked-Chrome regressions for media controls/WebGL/real-site behavior before release closure.

## Final owner/status decision

No registry edit and no status transition.

Primary refined owners:

`P1-003, P1-187`.

Supporting owner/boundaries:

`P0-070, P0-004, P1-167, P2-007, P0-075, P1-229`.

No new P-code is created; `P1-230` remains unallocated.
