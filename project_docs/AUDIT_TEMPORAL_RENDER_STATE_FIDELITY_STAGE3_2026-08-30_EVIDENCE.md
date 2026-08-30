# Temporal render-state fidelity audit — Stage 3 — 2026-08-30 — Blocks 33–48

## Durable checkpoint

Continuation of the fresh-source temporal render-state tranche rooted at exact `main` `309dd6e446dbcc7188215fdbf979478cec645c96`.

Stage 1 commit: `91ed848dc2b2315ca106f93815f60da137f5e08e`.
Stage 2 commit: `610bb3f9ad02bbc72881485ca6a197da4705410a`.

No runtime/status/release mutation is made by this checkpoint.

## Blocks 33–36 — Web Animations API at the physical top-document cut

Fixture:

- one 120×120 black box at x=40, y=50;
- animation is created by JS with `Element.animate()`, not by CSS: transform 0→400 px, 4 s linear infinite;
- viewport 1200×800, DSF 1, forced screen media, A4 margin 0;
- direct `Page.printToPDF` physical probe.

At the retained sample:

- WAAPI currentTime≈1183.355 ms;
- source x≈158.336 px;
- playState=`running`.

Physical PDF raster bbox was `[158,50,278,170]`, SHA-256 `901318ca5e024e43477ff97300e73a53be6462bf15484fcc689c893cc5513dfd`.

This is a positive control parallel to the CSS-animation result: top-document Chromium PDF can capture the currently composited/interpolated WAAPI transform. The temporal state is physically representable when the actual animated element remains the rendering source.

## Blocks 37–40 — flattened representation loses script-created animation state

A second live box was used as a stand-in flattened proxy. At roughly 1.2 s:

- source x≈168.328 px;
- source `getAnimations().length = 1`;
- source computed transform `matrix(1,0,0,1,128.328,0)`;
- proxy x=40 px;
- proxy `getAnimations().length = 0`.

Screenshot geometry:

- source black bbox approximately `[167,50,286,170]`;
- proxy bbox `[40,200,160,320]`.

The decisive point is architectural: `cloneNode(true)` clones DOM/attributes/children but not a script-created `Animation` object/effect/timeline. Current flattened-frame code is clone-based and has no `getAnimations()`/Animation-state transfer path in the inspected source. Therefore JS-created visual animation state in a selected same-origin iframe is absent from the flattened proxy even before the PDF boundary.

This is distinct from the earlier GIF print behavior and distinct from the video `currentTime` reset: three temporal classes have three different failure/success modes.

## Blocks 41–43 — materialized computed-state positive control

A causal control copied the source box's current computed transform to the proxy as an inline transform, without transferring the `Animation` object.

Observed later screenshot:

- source was still running and had advanced to x≈163.328 px;
- proxy held the earlier sampled phase at x≈158.334 px;
- source still had 1 animation; proxy had 0;
- proxy bbox approximately `[159,200,278,320]`.

The small source/proxy difference is expected and useful: it demonstrates that a representation can freeze a specific sampled visual phase while the live source continues to advance. The control is not a general prescription to copy arbitrary computed styles; prior typography/layout/resource tranches already establish the bounds and dependency problems with that approach. Here it proves only that the tested WAAPI transform phase is representable independently of the live animation object.

## Blocks 44–46 — pausing the live host is page-observable and non-neutral

A hostile-but-ordinary page control continuously inspected its own animation playState from `requestAnimationFrame`. If it observed a state other than `running`, it durably appended a visible marker.

Sequence:

1. before WebClip-like intervention: marker text `BASE`;
2. external code called `document.getAnimations().forEach(a => a.pause())`;
3. page rAF observed the change and mutated text to `BASE|PAGE_OBSERVED_paused`;
4. external code resumed the animation;
5. animation returned to `running`, but the page mutation remained.

Therefore “freeze all animations on the live host, print, then resume” is not a neutral rollback-safe repair. Animation state itself is page-observable application input. A hostile or stateful page can react while frozen and permanently alter selected content, exactly the kind of live-host coupling covered by P0-075 and analogous to the already proven live-iframe-width responsive side effects.

The acceptable architectural direction is an isolated admitted representation whose temporal state is materialized/stabilized without asking the live application to enter a new state. The exact mechanism remains design work and must be bounded.

## Block 47 — current diagnostics truth boundary

Current `capturePageStructureDiagnostics()` records broad structural/layout facts such as body/document scroll width/height, `window.innerWidth/innerHeight`, root-layout snapshots, selection/frame diagnostics and text counts.

Current `content.js` search in this exact source found no `currentTime` handling and no `getAnimations()` capture path. The current print diagnostics therefore do not constitute a temporal-state receipt for:

- CSS/WAAPI animation phase at admission versus physical cut;
- animation playState/pending/finished state;
- animated-image displayed frame versus serialized PDF frame;
- video current playback time/frame in a flattened proxy;
- script-created animations that disappear during clone-based flattening.

This is a truthfulness issue: existing diagnostics can prove many structural dimensions while remaining silent on a renderer-significant temporal dimension. Silence must not be interpreted as temporal fidelity success.

## Block 48 — owner reconciliation before final stage

No new P-code is allocated.

Primary owner refinements:

- **P0-070 ACTIVE** — exact end-to-end save generation needs a defined temporal visual cut; current physical bytes can represent a later animation phase than the user-admitted one;
- **P0-004 ACTIVE** — selected visual fidelity includes the actually displayed temporal frame; animated GIF proves current-screen/PDF disagreement;
- **P1-187 ACTIVE** — flattened same-origin representation loses video playback phase and script-created Web Animations state;
- **P0-075 ACTIVE** — in-place pausing of live page animation is page-observable and can cause irreversible application mutation, so host mutation is not a trustworthy freeze boundary;
- **P1-003 ACTIVE** — resource readiness/completeness is not decoded/composited-frame fidelity;
- **P2-007 BACKLOG** — dynamic-content output semantics need an explicit mode/receipt: admitted-current-view freeze, physical-cut freeze, representative/static reduction, or truthful degraded/unknown.

Final Blocks 49–56 should complete acceptance semantics, duplicate/root-cause reconciliation against post-freeze/resource/frame families, inspect exact worker print contract only as needed, and decide whether any evidence justifies status/registry mutation. Current evidence still supports refinement without a new P-number or registry status change.
