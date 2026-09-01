# Temporal render-state fidelity research — Stage 2 — 2026-08-30 — Blocks 17–32

## Durable checkpoint

Continuation of the fresh-source tranche rooted at `309dd6e446dbcc7188215fdbf979478cec645c96`. Stage 1 is durably preserved in `RESEARCH_TEMPORAL_RENDER_STATE_FIDELITY_2026-08-30_EVIDENCE.md`.

No runtime, registry, manifest/version, build, tag or release changes are made here.

## Blocks 17–20 — admission-to-physical-cut animation drift

A deterministic running CSS animation was sampled at an explicit logical “admission” instant, then allowed to continue for 1.25 s before `Page.printToPDF`.

Fixture: 120×120 black box; left=40 px; top=100 px; 4 s linear infinite transform 0→400 px; screen media; 1200×800 CSS viewport; A4 margin 0.

Running case:

- admission: animation time ≈583.344 ms, x≈98.334 px;
- immediately before print after the intentional delay: time≈1849.950 ms, x≈224.995 px;
- physical 96-dpi PDF bbox `[225,100,345,220]`;
- PDF SHA-256 `6b43106332cf292b8cecba5a6a370f7d22984cfe6b529b867354ee713342a742`.

Therefore the saved bytes correspond to the later physical-cut phase, not the phase visible at admission. For a moving selected visual, an exact document/selection generation alone does not identify the visual generation unless temporal phase is also stabilized or represented.

Frozen control:

- animations were paused at the admission boundary;
- admission x≈98.329 px, currentTime≈583.292 ms;
- the first post-pause tick settled near x≈100.005/currentTime≈600.048 ms and then remained paused through the retained physical cut;
- PDF bbox `[100,100,220,220]`;
- SHA-256 `d0fc985de85dab607e1f9a2b3fb390896513615276f33e9242de38cf13f7a8e9`.

The small one-frame pause-settlement is itself useful acceptance evidence: a future freeze contract must wait for one explicit stable temporal receipt rather than assuming the same synchronous call stack is already the final visual phase.

## Blocks 21–24 — animated GIF is not rescued by ordinary resource completeness

Stage 1 established that at ~0.7 s the user-visible GIF screenshot showed frame B at x=280 while physical PDF showed frame A at x=20, even with `img.complete === true`.

An exploratory attempt to materialize the GIF through `canvas.drawImage(img, 0, 0)` at roughly the second-frame window produced a PDF raster at x=20, i.e. the first-frame geometry in that run. Because this control did not independently prove the source frame at the exact draw call, it is retained only as a rejected/simple-fix warning: “draw the `<img>` once to canvas” must not be assumed sufficient without a composited-frame receipt. It is **not** used as a positive repair claim.

A same-document `cloneNode(true)` contrast at the second-frame window showed both source and cloned GIF rendering frame B in the live screen screenshot:

- source bbox `[280,20,360,100]`;
- clone bbox `[280,160,360,240]`.

Thus the observed physical-PDF first-frame substitution is not explained merely by `cloneNode(true)` resetting the GIF animation timeline in this control. The problematic boundary remains the print serialization of an animated `<img>`.

## Blocks 25–28 — flattened-frame `<video>` clone loses temporal phase

Current source proof:

- `createFlattenedBodyFramePrintProxy()` clones each selected same-origin frame body child with `node.cloneNode(true)` into a top-document proxy;
- the runtime-state copier explicitly copies `src` for `video`/`audio`/`source` and `poster` for video;
- no `currentTime` handling is present in current `content.js`.

A deterministic WebM source video was allowed to reach currentTime≈1.301 s, where the user-visible source frame has the black box at x=280.

After `video.cloneNode(true)` was appended to the proxy and started:

- source: currentTime≈1.301 s, readyState=4, screenshot bbox `[280,20,360,100]`;
- clone after ~100 ms: currentTime≈0.099 s, readyState=4, screenshot bbox `[20,160,100,240]`.

This is an exact temporal-state loss caused by the representation boundary: the flattened proxy has the same media source but begins from the start rather than from the user-visible playback phase.

This is a direct P1-187 rendered-state refinement, with P0-004/P0-070 supporting end-to-end fidelity ownership. Resource readiness cannot repair it because both source and clone are fully decodable; the missing state is playback position/decoded frame identity.

## Blocks 29–31 — representability positive control for video

A separate control cloned the same video but explicitly copied the source playback time to the clone and paused the clone after seeking.

Observed:

- time at clone creation ≈1.321 s;
- later source time≈1.561 s;
- clone time≈1.326 s, readyState=4, paused=true;
- source screenshot bbox `[280,20,360,100]`;
- clone screenshot bbox `[280,160,360,240]`.

So the currently visible video frame/time is representable in an isolated proxy when temporal state is deliberately transferred and stabilized. The current source simply does not include that state in its flattened-frame runtime-state contract.

This does **not** prescribe blindly copying `currentTime`: live streams, MSE, DRM/protected media, seek failures, media with no seekable range, autoplay policies, tainted/cross-origin surfaces and byte/time budgets all require bounded truthful degraded/unknown handling. The control only proves the tested omission is not an unavoidable cloning limitation.

## Block 32 — Stage 2 classification

No new P-code is allocated.

Primary refinements now supported by direct physical/live rendering evidence:

- **P0-070 ACTIVE** — admitted exact save generation currently lacks a temporal visual-phase identity/stabilization receipt between user-visible state and physical PDF cut;
- **P0-004 ACTIVE** — animated GIF physical output can substitute a different frame than the user-visible frame;
- **P1-187 ACTIVE** — same-origin flattened-frame video representation copies source URL/poster but not current playback phase, and `cloneNode(true)` resets playback to the beginning in the retained control;
- **P1-003 ACTIVE** — `img.complete`/media readiness is not visual-frame fidelity proof;
- **P0-075 ACTIVE** — an immutable isolated representation remains the natural boundary for stabilization rather than mutating the live host state;
- **P2-007 BACKLOG** — product/output semantics must state whether dynamic visuals are frozen at admission, frozen at physical cut, reduced to a representative frame, or truthfully degraded.

Next stage should inspect current diagnostics and actual flattened-frame copier around media/canvas state, add Web Animations/JS-driven controls, and determine whether animation freezing itself is page-observable/unsafe on the live host. The latter is important because a repair that pauses page-owned animations in-place may trigger page observers/events or visibly alter the site and would conflict with P0-075.
