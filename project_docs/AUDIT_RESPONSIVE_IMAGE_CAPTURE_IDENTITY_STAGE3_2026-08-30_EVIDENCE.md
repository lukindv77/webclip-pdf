# Durable audit evidence — responsive image capture identity — Blocks 33–48 — 2026-08-30

Continuation from exact baseline `309dd6e446dbcc7188215fdbf979478cec645c96`. Blocks 1–32 are already durable on branch `audit/responsive-image-capture-identity-2026-08-30`.

This stage tests implicit width-descriptor selection, non-flattened selected-frame paths, non-width picture media dimensions, and whether resources introduced only by the flattened representation receive any post-proxy readiness barrier.

Canonical status remains in `AUDIT_REGISTRY.md`. Docs only; no runtime/status/version/build/tag/release change.

## Block 33 — width descriptors can depend on viewport even with no authored `sizes`

Fresh plain-IMG fixture:

`srcset="red.png 600w, blue.png 1600w"`

No `sizes` attribute is authored. Browser therefore uses the responsive-image default source-size behavior based on viewport width (`100vw` semantics for this case).

At child width 420 / DSF1, currentSrc is red. The failure therefore does not require an explicit author breakpoint in `sizes`.

## Block 34 — implicit-sizes source screen is physically red

At 420 px:

- currentSrc red;
- effective natural/source width observed as 420;
- only red requested initially.

Physical screen PDF:

- SHA `54a173d73d7573f49e592556ed4c62cdee9c8d8c1d03a7440881b89895c4b3bc`;
- about 100,947 red / 0 blue pixels.

## Block 35 — widening the selected iframe switches implicit responsive selection red → blue

Changing the frame to 1200 px causes:

- child width 1200;
- currentSrc red → blue;
- blue requested;
- effective natural/source width 1200.

Thus a page using ordinary width-descriptor srcset with no explicit responsive media string is still exposed to the current live-frame normalization.

## Block 36 — narrowing after a successful high candidate does not necessarily restore candidate identity

After blue had been selected/loaded at 1200, reducing the child to 640 px retained blue currentSrc in this Chromium control, with the effective density/source sizing adjusted for the smaller slot.

As in Stage 2, geometric rollback is not a candidate-identity rollback contract. Candidate identity must be explicit if fidelity depends on it.

## Block 37 — the responsive-image failure is therefore common-mechanism, not breakpoint-only

Across Stages 1–3, candidate drift has now been reproduced through:

- `<picture><source media>`;
- explicit `sizes` media conditions with width descriptors;
- implicit/default source-size behavior with width descriptors.

Density-descriptor 1x/2x remains a negative control when DPR is unchanged. The relevant root is environment-dependent candidate identity, not one particular syntax.

## Block 38 — current same-origin flattening is conditional on selecting the child BODY

Exact current `selectedBodyForSameOriginFrame(frame)` returns the child body only when an include entry is exactly `childDoc.body`. `flattenSelectedSameOriginBodyFramesForPrint()` creates the top-document proxy only for that body-selection case.

Therefore selected descendants inside an iframe can remain in the live iframe rather than using the body-flattened representation. Responsive-image fidelity must be correct on both paths.

## Block 39 — non-flattened/live frame path starts physically red

A production-shaped live-frame control starts with a 420 px same-origin iframe containing the same narrow/wide picture selection:

- before preparation currentSrc red;
- physical source PDF SHA `1a3ecfb7b9b21551d303d2e1b8f90bbff777a6d3d824984bad4d86a93350f25a`;
- about 100,947 red / 0 blue pixels.

No flattened proxy is needed for this test.

## Block 40 — current 100% live-frame normalization alone changes the physical PDF to blue

After the current frame-style operation `width:100%` in the 1200 px top viewport:

- child width becomes 1200;
- currentSrc becomes blue;
- physical PDF SHA `1539581e766a339caa0090b964a61af3e03f5dd3a6afbe7d985f7b321e8b5bb1`;
- 0 red / about 169,092 blue pixels.

This proves the fidelity problem is not confined to P1-187 flattened-body cloning. A selected descendant that remains in its live frame can also print different responsive artwork because preparation changed the live viewport.

## Block 41 — owner split for the live non-flattened path

For Block 40 the immediate root is primarily:

- **P0-075** — live host/frame preparation changes page-observable renderer input;
- **P0-004** — physical selected visual state differs;
- **P0-070** — final renderer generation differs from admitted screen generation;
- **P1-003** — any resource readiness completed before that candidate switch is stale for the final candidate.

**P1-187** remains primary only where the separate flattened representation itself changes/reselects state. This distinction prevents overloading one owner for two causal paths.

## Block 42 — flattened `<picture>` media mismatch is not width-only: orientation

Fresh source iframe is 420×700, portrait. Top document viewport is 1200×800, landscape.

Picture source condition: `(orientation: landscape)` → blue; fallback red.

At source:

- child media false;
- top media true;
- source currentSrc red.

Source physical PDF SHA `4754b1908db5e591e67c2f479dc5ed257e600136eebfc94ca9ce44a665709d88` contains about 96,327 red / 0 blue pixels.

## Block 43 — orientation is re-evaluated in the flattened owner document

Production-shaped clone copies admitted red currentSrc into IMG src but retains the cloned picture SOURCE `media/srcset`.

Once mounted in the landscape top document:

- proxy IMG currentSrc becomes blue;
- physical proxy PDF SHA `c73f805e7d70c48b53f53972cf3a1c50d0a038de26823160c37358ef03796b46`;
- 0 red / about 96,327 blue pixels.

Thus child→top responsive environment translation includes orientation, not merely width breakpoints.

## Block 44 — height media conditions reproduce the same owner-document translation

Fresh child viewport 420×260; top viewport 1200×800.

Picture source condition `(min-height:600px)`:

- false in child → red currentSrc;
- true in top document.

Source physical PDF SHA `caeff53cdda8a88f30bb41f62298be365cde971df2fa67718ead8285d331931c` is red (~96,327 pixels).

Flattened proxy reselects blue and physical PDF SHA `841c559292ae6e8dde45a182b9dfae8d3eff0eb624b6ebd74c1cd75c7cf1a1f8` is blue (~96,327 pixels).

This closes the “perhaps only width differs” alternative.

## Block 45 — a flattened proxy can introduce a responsive resource only after prefetch is over

Controlled async fixture keeps the source iframe at original 420 px throughout admission and cloning:

- source/admitted currentSrc red, complete, naturalWidth 400;
- source physical PDF SHA `c7a428b45a3ac9b690613ddef9d804fbd766972f4a4e45bfd9dac6b5393658f8`, ~96,327 red / 0 blue pixels.

The production-shaped proxy copies red into IMG src but retains `<source media="(min-width:800px)" srcset="blue.png">`. Mounting into top 1200 px starts a **new blue request only in the secondary representation**.

Blue response is deterministically delayed about 2.2 seconds. This request did not exist when the source red image passed resource preparation.

## Block 46 — `Page.printToPDF` does not provide a second readiness barrier for the newly selected proxy resource

While proxy blue was still pending:

- proxy image not complete, naturalWidth 0;
- `Page.printToPDF` returned in about **8.65 ms**, far before the 2.2 s controlled blue response;
- immediate physical PDF SHA `f713241b22b255b4fb198cb11b350d7fd09b6fa4c216e2bdf3259e1162bbecd6`;
- 0 red / 0 blue pixels.

Therefore final printing itself does not close the resource-readiness gap introduced after `prefetchIncludedResources()` by flattening.

## Block 47 — after the same proxy resource settles, identical print contains blue

After the delayed blue response settled:

- proxy currentSrc blue;
- complete true, naturalWidth 400;
- otherwise identical PDF print returned in about 10.85 ms;
- PDF SHA `f04625f8ec0de7ab367c81c86969b93e6744b0ce0f3ca7c0340150933b394822`;
- 0 red / about 96,327 blue pixels.

The immediate/settled pair isolates a concrete missing post-representation resource convergence barrier, not a generic Chromium inability to print the image.

## Block 48 — Stage-3 truth boundary and owner reconciliation

Current source contains currentSrc handling in prefetch, flatten IMG copying and image-link wrapping, but page/worker diagnostics do not retain a bounded per-selected-image chain such as:

`admittedCurrentSrc → prefetchedCurrentSrc → post-frameCurrentSrc → proxyCurrentSrc → final readiness`.

The physically blank immediate proxy in Blocks 45–47 can therefore coexist with an earlier successful source-image preparation receipt.

No new P/status transition. Primary owners remain **P1-003, P1-187, P0-075, P0-070, P0-004**, supporting **P1-167, P0-064, P2-007**. `P1-230` remains unallocated.

Blocks 33–48 are complete and interruption-safe.
