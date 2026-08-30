# Durable audit evidence — renderer-owned replaced-resource convergence — stage 2 — 2026-08-30

Canonical P-code owner/status authority remains exclusively in `AUDIT_REGISTRY.md`. This interruption-safe continuation preserves **Blocks 21–36** of the fresh-source replaced/media/render-resource audit. Blocks 1–20 are already preserved in `AUDIT_REPLACED_RESOURCE_CONVERGENCE_2026-08-30_EVIDENCE.md`.

Exact audited baseline remains `main = 66c5cd43906254a583f692bcda3e9e451a29dce6`; working branch is `audit/replaced-resource-convergence-2026-08-30`.

No runtime, registry, manifest/version/build/tag/release state is changed.

## Blocks 21–26 — stylesheet settlement is part of the renderer resource graph

### Block 21 — a pending external stylesheet can change the selected physical result after a clean immediate print — P1-003

A selected 300×100 block initially had a white background. A controlled external stylesheet was dynamically attached with a three-second response delay; when settled it changed the block to yellow.

Exact forced-screen physical results:

- before stylesheet settlement, computed background was white;
- `Page.printToPDF` returned in about **26 ms**;
- immediate PDF had **0** expected yellow pixels;
- after stylesheet settlement computed background became yellow;
- settled PDF contained about **32,552 yellow pixels**.

The selected visual state can therefore still be materially unresolved even when no image/font task is currently visible to WebClip's computed-style scan.

### Block 22 — `getComputedStyle()` does not turn the pending stylesheet into a readiness barrier

A direct control attached the same delayed stylesheet and immediately called `getComputedStyle()` on the selected element. The call returned in about **3 ms** with the pre-stylesheet white state instead of waiting for the external stylesheet.

This matters because current `prefetchIncludedResources()` derives background/font tasks from the computed style *at scan time*. Merely reading computed style does not prove applicable author stylesheets have settled.

### Block 23 — one pending stylesheet can create a visual-resource URL only after WebClip's scan has already seen `none`

A second controlled schedule used a stylesheet delayed by roughly one second. When it arrived it introduced:

`background-image: url(graph.png)`

where `graph.png` itself had an additional ~2.5-second response delay.

Observed phases:

1. early computed background: `none`; immediate PDF had 0 yellow pixels;
2. after stylesheet settlement: computed style contained the background URL, but image was still pending; PDF still had 0 yellow pixels;
3. after image settlement: PDF contained about **32,865 yellow pixels**.

The actual selected resource graph can therefore *emerge after the bounded element/computed-style scan*. A finite scan of currently known URLs is not equivalent to a renderer-readiness receipt.

### Block 24 — this is not a request for extension-side CSS/resource byte fetching

The current privacy/origin design can remain intact. The acceptance requirement is that renderer-owned selected state be either:

- proven settled within bounded deadlines using browser-visible state;
- frozen/materialized into the admitted representation where appropriate; or
- truthfully reported as incomplete/unknown.

No audit result here requires WebClip to fetch arbitrary page response bytes itself.

### Block 25 — current report schema cannot distinguish “no applicable tasks” from “visual graph has not emerged yet”

A pending stylesheet that has not yet applied yields no background URL task. Current `makePrefetchReport()` therefore begins and may finish with ordinary zero/clean counters even though the eventual selected visual state differs materially.

P1-003's truthful-omission contract needs an explicit meaning for resource-graph settlement, not only task completion for URLs already visible at scan time.

### Block 26 — exact-generation ownership composes with P0-070

If a late stylesheet changes selected visual state between user save admission, resource scan and physical print, a resource report from one visual generation and PDF bytes from a later generation can be combined into one apparently successful operation.

This is supporting P0-070 generation truth, not a new stylesheet-specific owner.

## Blocks 27–31 — frame-local image-like provenance beyond ordinary `<img>`

### Block 27 — relative `input[type=image].src` is rebound by the flattened proxy — P1-187

A same-origin source frame used base `/frame/` and `<input type="image" src="icon.png">`; the source resource resolved to the controlled **green** `/frame/icon.png`.

A production-shaped clone was adopted into a top document with base `/top/`. Because current `copyFrameCloneUrlState()` has no image-input special case, the clone retained raw `src="icon.png"`, now resolving to controlled **red** `/top/icon.png`.

Exact PDF contained about **32,865 red pixels and 0 green pixels**.

This is secondary-representation resource provenance loss under P1-187.

### Block 28 — absolutizing the source image-input URL restores the source visual: positive control

When the cloned input was assigned the source element's absolute `.src` before adoption/print, exact PDF contained about **32,865 green pixels and 0 red pixels**.

Chromium can render the intended image input; the production-shaped relative-attribute clone changed its resource identity.

### Block 29 — relative SVG `<image href>` is rebound by the same proxy — P1-187

A source frame under `/frame/` rendered a relative SVG image resource as controlled **yellow**. The raw cloned `<image href="svg.png">` moved under top base `/top/` and resolved to controlled **blue** instead.

Exact PDF contained about **19,635 blue pixels and 0 yellow pixels** in the uncorrected clone control.

### Block 30 — absolutizing SVG image provenance restores the expected PDF: positive control

When the clone's SVG image href was rewritten to the source frame's absolute resource URL, exact PDF contained about **32,760 yellow pixels and 0 blue pixels**.

This again isolates P1-187 secondary representation rather than generic SVG/PDF inability.

### Block 31 — `copyFrameCloneUrlState()` remains intentionally tag-specific

Fresh source has special handling for anchor, ordinary image, video/audio/source and video poster. Image inputs, SVG image href and text-track src are not part of that URL-state copier.

The repeated lesson is not “add one more property forever”; P1-187 needs a bounded frame-local renderer/resource provenance representation shared across relevant replaced/resource nodes.

## Blocks 32–34 — cross-origin frame resource parity remains narrower

### Block 32 — frame-agent prefetch currently processes ordinary `<img>` only — P1-003 frame parity

Fresh `frame-agent.js::prefetchSelected()` constructs an image list using only selected roots matching `img` or `root.querySelectorAll('img')`, capped at 100. It promotes known `data-src`, makes lazy images eager and waits/decodes those images.

It does not perform the top-document computed background/font task scan and has no dedicated video poster/track, SVG image or image-input task.

This is supporting evidence for the already-ACTIVE P1-003 frame-parity contract, not a separate cross-origin media owner.

### Block 33 — remote resource aggregation cannot report a class that the child never attempted

`prepareRemoteFramesForPrint()` aggregates only each selected child response's `attempted`, `loaded` and `failed`. If a remote selected video poster/SVG image/image input/track never entered the child image list, its omission contributes none of those values.

The top report cannot recover information the child never emitted.

### Block 34 — known ordinary HTML image waiting remains a useful positive design pattern

Top content has explicit `waitForDomImage()` task ownership and frame-agent has a bounded ordinary-image decode/wait path. The repair direction should generalize truthful renderer-state/resource accounting while preserving those bounded known-image controls rather than replacing them with unbounded “wait for network idle”.

## Blocks 35–36 — renderer time and diagnostic receipt boundary

### Block 35 — a playing video's physical frame can change during ordinary preparation latency — P0-070 / P1-187 supporting

The same deterministic red-then-blue video was started near t≈0.19 s, where a screen capture was red (~71,200 red pixels, 0 blue). After approximately 1.2 seconds of ordinary asynchronous delay — representative of resource/disclosure preparation time — the video had advanced to about t≈1.57 s. The subsequent exact PDF contained **0 red and ~77,748 blue pixels**.

This does not mean a playing video must be frozen in every output mode. It proves that “the selected renderer state” needs an explicit generation/mode policy: current screen at command admission, current state at physical cut, or an inert representative frame must not be silently conflated. P0-070 owns exact save generation; P2-007 may govern product-mode semantics; P1-187 implements the secondary representation once the mode is defined.

### Block 36 — current diagnostics are telemetry, not a renderer-owned state receipt

Fresh `diagnosticElementSnapshot()` records generic tag/id/classes/role, text length, rectangle, scroll dimensions, a small computed-style subset and ancestors. It does not record video `currentTime`, decoded frame identity, poster/current source, text-track cue state, canvas bitmap state, SVG external-resource settlement or equivalent media-generation receipts.

Fresh flattened-frame diagnostics similarly record clone/style counts and truncation metadata, not preserved media/resource state.

Therefore page/print diagnostics cannot prove the physical artifact represents the same renderer-owned state observed during preparation. This is consistent with prior P0-070 evidence that diagnostics are bounded telemetry rather than byte receipts.

## Stage-2 owner decision

No registry edit is justified at 36 completed blocks.

Primary existing owners remain:

- `P1-003` — actual renderer visual-resource graph, stylesheet/resource emergence, frame parity and truthful unknown/omission reporting;
- `P1-187` — same-origin flattened secondary representation for current video frame, text-track provenance, image-input/SVG image resource identity and previously known canvas state.

Supporting boundaries: `P0-070, P0-004, P1-167, P2-007`.

No new P-code is created; `P1-230` remains unallocated.
