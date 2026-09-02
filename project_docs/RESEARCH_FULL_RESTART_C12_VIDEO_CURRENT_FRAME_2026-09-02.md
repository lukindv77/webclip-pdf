# WebClip — fresh full-restart C12 — Video / replaced media / current frame

Date: 2026-09-02

Canonical source baseline: `335423d995b15d77869b6b6a6dc4fde700ebf688`.

Current source binding:

- `content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- research branch: `research/full-restart-c12-video-current-frame-2026-09-02`;
- durable reproduction harness: `project_tools/research_c12_video_current_frame.py`.

Research outcome: **`L4-REVALIDATED / FINDING + POSITIVE/CAUSAL CONTROLS (P1-187)`**.

Supporting exact-generation/isolation context: **P0-070 / P0-075**. **P1-003** remains an adjacent media-resource-readiness owner, but this tranche does not add it to the fresh C12 outcome because no separate delayed-media readiness failure was physically established here.

No runtime source, `RESEARCH_REGISTRY.md`, P-owner status, manifest version, build, tag or GitHub Release is changed by this tranche.

## 1. Scope and termination envelope

C12 asks a deliberately narrower question than “can WebClip archive and replay an entire video stream?”:

> when the user selects content containing a video whose currently displayed frame is at a non-zero playback position, does the faithful static PDF preserve that current visible frame through current WebClip preparation and same-origin secondary representation?

Relevant pipeline boundaries:

- **B1 User Intent** — preserve the visible selected content as a useful static later-readable copy;
- **B2 Admission** — source `<video>` has a concrete current playback position/current decoded frame;
- **B3 Capture** — current WebClip sees the media element and URL/poster state but has no current-frame snapshot contract;
- **B4 Static Materialization** — same-origin selected BODY may be deep-cloned into a top-document proxy;
- **B5 Renderer** — Chromium renders whichever video frame belongs to the final representation's playback position;
- **B6 Physical Artifact** — PDF raster is measured for the expected red/blue current frame;
- **B7–B9** inherit the created bytes and are not separately exercised here.

Fresh evidence requirement: L1 current source + L3 managed Chromium + L4 physical PDF with positive and causal controls.

Explicit non-goals for this bounded C12 tranche:

- offline playback of the entire media stream;
- YouTube/Vimeo/MSE/HLS/DASH archival completeness;
- audio fidelity;
- text-track/caption completeness;
- autoplay policy;
- C33/C34 general animations and animated images;
- full C35 admission-to-render-cut mutation timing.

Those remain separate coordinates or architecture decisions.

## 2. Fresh current-source inspection

Fresh inspection of exact `main = 335423d995b15d77869b6b6a6dc4fde700ebf688` establishes the current same-origin flattening contract.

`copyFrameCloneUrlState(source, target)` currently:

- copies `src` for `video`, `audio` and `source`;
- copies `poster` for `video`;
- does **not** copy/materialize `video.currentTime`;
- does not preserve a decoded/composited current video frame as renderer-owned state.

Same-origin selected BODY flattening still begins from `cloneNode(true)` and later applies the bounded URL/style copying. A cloned media element can therefore refer to the same media resource while representing a different playback generation.

Current `prefetchIncludedResources()` has explicit selected visual-resource tasks for HTML `IMG`, CSS background images and fonts. Fresh source inspection finds no equivalent VIDEO/current-frame readiness task. That is relevant to existing P1-003, but source proof alone is not promoted to a fresh C12 physical readiness finding in this tranche.

## 3. Duplicate/root-cause reconciliation before new numbering

Current `RESEARCH_REGISTRY.md` is the only owner/status authority.

Fresh reconciliation against Registry and the historical temporal-render family establishes:

- **P1-187 ACTIVE** is the exact current owner for flattened iframe renderer-owned state. It already covers representation state such as canvas bitmap and is the natural owner for decoded/current video frame state;
- **P0-070 ACTIVE** owns exact save/document generation through physical bytes;
- **P0-075 ACTIVE** owns isolation from the live hostile/page-observable host;
- **P1-003 ACTIVE** owns actual selected visual-resource readiness, but readiness alone does not prove current decoded/composited frame identity.

Historical `RESEARCH_TEMPORAL_RENDER_STATE_FIDELITY_FINAL_2026-08-30_EVIDENCE.md` had already classified flattened video `currentTime` loss under P1-187 and explicitly separated media phase from generic resource readiness. That historical evidence is used only for duplicate/root-cause lookup and fixture design; it does **not** advance the fresh C12 row.

No materially independent root was found. **No new P-code is allocated.**

## 4. Fresh external research input

External sources are hypothesis/architecture inputs, not WebClip requirements by themselves.

### 4.1 WHATWG HTML media semantics

Current HTML Standard defines the rendered `<video>` state by media readiness/playback state. For a paused video with current-frame data available, the video represents the frame corresponding to the current playback position. The video also provides a paint source whose appearance is the frame at the current playback position, falling back to previous appearance/blackness when the requested frame is unavailable.

Sources:

- https://html.spec.whatwg.org/multipage/media.html
- https://html.spec.whatwg.org/multipage/rendering.html

This supports the acceptance hypothesis that “same `src`” is not equivalent to “same visible static video state”: `currentTime`/decoded current frame is renderer-significant state.

### 4.2 SingleFile security/representation boundary

SingleFile's current known-issues document states that for security reasons it is sometimes unable to save snapshots of video elements, alongside canvas image representation limitations.

Source:

- https://github.com/gildas-lormeau/SingleFile/blob/master/known-issues.md

This is useful architectural caution: a static-video representation should respect browser origin/security boundaries and truthfully degrade if snapshotting is not safely available; WebClip should not silently broaden authority into cross-origin media extraction.

### 4.3 Browsertrix/Webrecorder streaming-media experience

Browsertrix issues show that capturing replayable streaming media is a separate, materially larger problem from preserving one current static frame. Examples include partial Vimeo chunk capture and embedded YouTube replay failures.

Sources:

- https://github.com/webrecorder/browsertrix-crawler/issues/632
- https://github.com/webrecorder/browsertrix-crawler/issues/1030

This comparison supports keeping C12's current PDF contract bounded: current-frame static fidelity is one requirement; full offline stream capture/replay would be a different product/representation mode.

## 5. Fresh local-first L3/L4 evidence

The local tool environment contains `ffmpeg`, Chromium, Playwright and PyMuPDF, so no dedicated research GitHub Actions workflow is necessary.

Managed browser:

- Chromium `144.0.7559.96`;
- screen media;
- physical `Page.printToPDF`;
- PyMuPDF raster inspection.

Self-contained fixture:

- generated locally with `ffmpeg`;
- VP9 WebM, `320×180`, duration 2 s;
- `0–1 s` = solid red;
- `1–2 s` = solid blue;
- successful run fixture bytes `1749`;
- fixture SHA-256 `4f9af45bb44c155cda2006850bca530acb10bdb443daec28ca47407b071d2ecb`.

The physical probe is network-independent: video bytes are embedded as a `data:video/webm;base64,...` URL.

The private repository checkout is not mounted in the local browser container. Therefore exact-source L1 binding above is performed independently through fresh GitHub source inspection, while the physical probe executes the same current production-shaped primitives: child BODY `cloneNode(true)`, copy media `src`/`poster`, mount proxy, wait until clone `readyState >= HAVE_CURRENT_DATA`, then physically print. The committed harness additionally validates the real `content.js` function when run from a normal checkout.

Two earlier exploratory versions were discarded: one used an invalid Playwright call, another used an over-strict paused-video frame callback and timed out. Neither is used as evidence.

## 6. Physical controls and finding

### 6.1 Top-document paused current frame — positive control

The top-document video is fully ready (`readyState=4`), paused at `currentTime=1.5 s`, where the fixture is blue.

Physical PDF:

- SHA-256 `67a216a01cfbcf6f4a38344f37f12dd0da1c425ae7c662121a90a69318cedcf4`;
- bytes `1935`;
- red pixels `0`;
- blue pixels `130351`.

Conclusion: Chromium can physically serialize the tested current paused video frame.

### 6.2 Same-origin child video printed in place — positive control

The child-frame video is likewise:

- `currentTime=1.5`;
- paused;
- `readyState=4`;
- duration `2 s`.

Direct physical PDF:

- SHA-256 `19fc2a3d225967a35c6280e4b61e8e62ca4ed06220312ed26df4ed606ff3ebcd`;
- bytes `1928`;
- red `0`;
- blue `130351`.

This rejects a generic iframe/Chromium PDF failure and establishes the admitted source frame as physically blue.

### 6.3 Production-shaped flattened clone — FINDING / P1-187

At the moment the proxy is created:

- source `currentTime = 1.5`;
- cloned target `currentTime = 0`;
- cloned target initially `readyState = 0`;
- the same video `src` is transferred.

The test then explicitly waits until the cloned video is fully loaded and settled:

- clone `currentTime = 0`;
- clone `readyState = 4`;
- duration `2 s`.

Thus resource loading is not a confounder in the final discriminator.

Physical flattened PDF:

- SHA-256 `9004b2452579b284582ecf66d0b27fe356e0c1f843cdf7a29809f03259a6276b`;
- bytes `1934`;
- red pixels `130351`;
- blue pixels `0`.

The same media bytes are fully available, but the secondary representation has silently changed from the user's blue `1.5 s` frame to the red time-zero frame.

This is direct fresh L4 revalidation of **P1-187 ACTIVE**.

### 6.4 Transfer admitted playback time — causal control

A test-only control sets the final proxy video to `currentTime=1.5`, pauses, waits until seek settlement/current data, then prints.

Final state:

- `currentTime=1.5`;
- paused;
- `readyState=4`.

Physical PDF:

- SHA-256 `0889bd16a8d275948cba6f3a1e66967c87bee77487b8ac6bf6353f285537892a`;
- bytes `1935`;
- red `0`;
- blue `130351`.

The admitted physical frame is restored. This proves causality: the failure is missing temporal rendered-state materialization in the secondary representation, not inability of Chromium to print the frame and not incomplete loading of the cloned media resource.

## 7. Interpretation and architecture implications

C12 supports the following target properties under existing owners:

1. **The admitted static video state is more than the URL.** For faithful static PDF, the visible decoded frame/playback position is renderer-owned state.
2. **Materialization belongs in the final isolated representation.** Copying `currentTime` plus bounded seek/decode settlement is one proven causal control for the tested origin-clean self-contained media; it is not automatically the universal implementation.
3. **Resource-ready and frame-ready are distinct receipts.** `readyState=4` at time zero is not proof that the final proxy represents the admitted `1.5 s` frame.
4. **Do not mutate/freeze the live host as the primary solution.** That remains the P0-075 isolation boundary; page-observable media pause/seek can affect application behavior.
5. **Bound media work.** Any seek/decode/current-frame materialization needs node/media/time/pixel/byte budgets and truthful timeout/degraded semantics under P1-187/P1-167 and related representation limits.
6. **Respect browser/security boundaries.** Do not turn static-frame fidelity into unbounded cross-origin media fetch/readback authority. Unsupported or security-blocked frame extraction should become explicit degraded/unknown rather than silent substitution.
7. **Do not silently promise full stream archival.** A static current frame in PDF and an offline replayable video are different outputs with different resource/security/storage contracts.

## 8. Why P1-003 is not added to the fresh C12 outcome

Current source lacks a dedicated VIDEO/poster/current-frame task in `prefetchIncludedResources()`, and historical evidence places resource readiness under P1-003. However, this fresh C12 physical test intentionally uses a completely loaded self-contained media resource and still proves the defect.

That makes P1-187 independently sufficient for the observed failure. No separate delayed-media/poster fixture was freshly proven here, so C12 does **not** claim a new P1-003 physical finding merely from source inspection.

This keeps owner classification evidence-driven instead of accumulating every adjacent P-code.

## 9. Non-claims

C12 does not claim:

- complete WebGL/canvas/animated-GIF coverage;
- video audio/caption fidelity;
- full video stream preservation or replayability;
- MSE/HLS/DASH/DRM capture support;
- cross-origin video snapshot capability;
- that setting `currentTime` is the final production implementation for every media class;
- closure of P1-187/P0-070/P0-075;
- any release-readiness change.

## 10. C12 conclusion

Fresh C12 reaches:

**`L4-REVALIDATED / FINDING + POSITIVE/CAUSAL CONTROLS (P1-187)`**.

Fresh current-source and physical evidence proves:

- a top-document/current child video paused at `1.5 s` physically prints the blue current frame;
- current same-origin secondary representation transfers media URL/poster but not current playback position/current decoded frame;
- after fully loading the clone, it remains at `0 s` and the physical PDF contains the red first frame instead of the admitted blue frame;
- transferring the admitted playback time and waiting for the final representation to settle restores the blue physical frame;
- therefore the root is missing renderer-owned temporal state in the flattened representation, already owned by P1-187.

No new P-code or status transition occurs.

Next sequential fresh-restart coordinate: **C13 — Form / renderer-owned controls**.
