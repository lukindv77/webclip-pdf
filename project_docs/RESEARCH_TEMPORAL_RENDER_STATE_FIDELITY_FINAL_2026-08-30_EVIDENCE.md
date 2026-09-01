# Temporal render-state fidelity research — Final — 2026-08-30 — Blocks 49–56

## Durable completion checkpoint

This file completes the 56-block temporal render-state fidelity tranche begun from exact fresh `main`:

`309dd6e446dbcc7188215fdbf979478cec645c96`

Earlier durable checkpoints:

- Blocks 1–16: `RESEARCH_TEMPORAL_RENDER_STATE_FIDELITY_2026-08-30_EVIDENCE.md`;
- Blocks 17–32: `RESEARCH_TEMPORAL_RENDER_STATE_FIDELITY_STAGE2_2026-08-30_EVIDENCE.md`;
- Blocks 33–48: `RESEARCH_TEMPORAL_RENDER_STATE_FIDELITY_STAGE3_2026-08-30_EVIDENCE.md`.

No runtime, registry status, manifest/version, build, tag or GitHub Release change is part of this tranche.

## Block 49 — exact current worker physical-PDF contract

Fresh exact-source inspection confirms the worker attaches the debugger, enables Page, forces:

`Emulation.setEmulatedMedia({ media: 'screen' })`

and then calls `Page.printToPDF` with the current production-shaped settings including:

- `landscape:false`;
- `displayHeaderFooter:false`;
- `printBackground:true`;
- `scale:1`;
- `preferCSSPageSize:true`;
- `transferMode:'ReturnAsStream'`.

There is no worker-side temporal-frame snapshot parameter in this CDP call. The renderer consumes whatever live/flattened representation exists at the physical cut, subject to Chromium's own media-class serialization behavior.

This source contract directly matches the retained managed-CDP probes rather than relying on a synthetic alternative PDF path.

## Block 50 — temporal classes are observably non-uniform

Retained evidence distinguishes at least four renderer-significant temporal classes:

1. **CSS animation in the actual top document** — physical PDF captured the currently interpolated transform phase; admission→print delay changed the saved phase.
2. **WAAPI animation in the actual top document** — physical PDF likewise captured the current interpolated transform phase.
3. **animated GIF `<img>`** — at the decisive second-frame screen sample, physical PDF serialized the first GIF frame instead of the currently displayed frame even though `img.complete` was true.
4. **`<video>`** — direct top-document PDF captured the currently displayed video frame, but clone-based flattened representation reset playback toward time zero unless playback time was explicitly transferred/stabilized.

A single generic statement such as “Chromium prints the current animation frame” or “Chromium freezes dynamic content” is therefore false for the tested environment.

## Block 51 — exact admission semantics required by the product goal

For “save now, read later in the same visual state” the implementation needs an explicit temporal acceptance contract. The minimum truthful distinction is:

- **admission-time current view**: the frame/state the user saw when save authority was accepted;
- **physical-cut current view**: whatever the live renderer shows later when PDF layout occurs;
- **static representative reduction**: a deliberately chosen poster/first/current frame with disclosed semantics;
- **degraded/unknown**: exact temporal preservation could not be proven within bounds.

Current behavior mixes these implicitly: running animation uses physical-cut phase; animated GIF can fall back to first frame; top video can use current cut phase; flattened video can restart near zero; script-created iframe WAAPI state can disappear entirely.

That mixed policy is not one coherent “same as displayed” semantic.

## Block 52 — isolated representation is required, but blanket live freeze is unsafe

The live-host pause control proved that pausing page animations is observable by page JS: a page rAF detected `playState=paused`, changed visible DOM, and that mutation persisted after animations resumed.

Therefore an implementation that temporarily pauses all live-page animations/media before `printToPDF` can itself change the application generation it is trying to preserve. This reinforces P0-075: stabilization belongs in an isolated admitted representation, not in a page-observable mutation of the host.

Any isolated solution still needs global node/time/pixel/byte/resource bounds and truthful partial/degraded reporting under P1-167/P0-064/P1-003; this tranche does not prescribe an unbounded universal rasterization pass.

## Block 53 — flattened-frame runtime-state contract is materially incomplete

Current same-origin flattening uses `cloneNode(true)` and selected runtime copying. Fresh source inspection plus probes show at least these temporal gaps:

- video/audio/source URL is copied and video poster may be copied, but `currentTime` is absent;
- script-created `Animation` objects/effects/timelines are not cloned by DOM cloning and current source has no `getAnimations()` transfer path;
- a fully ready cloned video therefore represents the same media resource but a different playback generation;
- an otherwise identical proxy node can have zero animations while the selected source has an active WAAPI effect.

P1-187 remains the single current flattened rendered-state owner. This is a refinement, not a new root-cause number.

## Block 54 — current diagnostics are not a temporal fidelity receipt

Current page diagnostics record useful structural/layout dimensions including viewport width/height, body/document scroll geometry, root layout, text and selection/frame information. Fresh exact-source search found no `currentTime` receipt and no `getAnimations()` temporal snapshot.

Consequently current diagnostics cannot prove:

- which CSS/WAAPI phase was user-admitted;
- whether that phase changed before physical cut;
- whether an animated image's composited screen frame equals its PDF frame;
- whether flattened video retained source playback time;
- whether script-created frame animations survived flattening.

The correct truth state for those dimensions is presently unproven, not implicitly successful.

## Block 55 — duplicate/root-cause reconciliation

No new P-code is allocated. In particular, no reason was found to consume the deliberately unallocated next late number merely because temporal evidence is new.

This tranche intersects but does not duplicate neighboring families:

- post-freeze physical-render-cut already owns host mutation after preparation under P0-070/P0-075/P0-004; this tranche adds temporal-phase/media-class evidence and isolated-representation controls;
- resource-readiness P1-003 already owns actual selected visual resource readiness; this tranche proves readiness/completeness is insufficient for animated-frame identity;
- viewport/environment evidence covers mixed screen/paged geometry, not time-dependent frame identity;
- typography/layout and complex-frame evidence cover static rendered-state omissions; this tranche adds media playback phase and script-created animation state;
- deferred/virtualized materialization concerns which logical content exists, whereas this tranche concerns which temporal visual generation of already-existing content is serialized.

Canonical owner set:

- **P0-070 ACTIVE** — primary exact save/render generation and temporal cut;
- **P0-004 ACTIVE** — selected visual fidelity, including current animated-image frame;
- **P1-187 ACTIVE** — flattened iframe temporal rendered state;
- **P0-075 ACTIVE** — live host cannot be the trusted freeze workspace;
- **P1-003 ACTIVE** — readiness does not prove current decoded/composited frame identity;
- supporting **P1-167 ACTIVE**, **P0-064 ACTIVE** for bounded representation work;
- **P2-007 BACKLOG** — explicit dynamic-content capture semantics/output architecture.

No registry status transition is warranted by docs-only evidence.

## Block 56 — completed tranche conclusion / acceptance checklist

The 56-block tranche is complete.

A future implementation can claim temporal visual fidelity for a tested class only when all applicable points are proven:

- one exact user-admitted source/application generation is identified;
- the intended temporal cut semantics are explicit;
- the representation is isolated from page-observable freeze mutations;
- CSS/WAAPI phase is materialized or otherwise proven stable when required;
- animated image output is compared against the actually composited admitted frame, not merely `img.complete`;
- flattened media preserves or truthfully degrades playback/frame state under bounded seek/decode rules;
- script-created animation effects that influence selected visuals are either represented or explicitly degraded;
- resource readiness and temporal-frame readiness are separate receipts;
- physical PDF bytes/raster are the authority for renderer claims;
- bounded non-convergence or unsupported media returns truthful degraded/unknown rather than success by silence.

### High-value retained physical facts

- running CSS animation admission x≈98.33 px → delayed physical PDF x≈225 px;
- explicit pause/stabilization control held the tested CSS phase near x≈100 px;
- animated GIF at user-visible frame-B x=280 produced PDF frame-A x=20;
- top-document video at currentTime≈1.302 s produced both screen and PDF x=280 current frame;
- cloned video at source time≈1.301 s restarted near 0.099 s / x=20, while explicit seek+pause restored clone x=280;
- top-document WAAPI animation printed at current interpolated x≈158 px;
- clone-based proxy had zero WAAPI animations and base x=40 while source was animated around x≈168;
- materializing the sampled computed transform on an isolated proxy preserved that sampled phase while source continued advancing;
- pausing the live host was page-observable and caused a persistent visible mutation.

These facts are engineering evidence only. Real unpacked Chrome release QA remains separately required for any runtime implementation.
