# Durable audit evidence — viewport/environment fidelity — final Blocks 49–56 — 2026-08-30

Continuation of the viewport/environment fidelity tranche from exact base `4d26fb5b6481861d0f11f37e8c3c8746afb5b6ab` on branch `audit/viewport-environment-fidelity-2026-08-30`.

Canonical owner/status authority remains `AUDIT_REGISTRY.md`. Audit/docs only. No runtime, registry status, manifest/version/build/tag/release change is made by this evidence commit.

Blocks 1–16 established the hybrid screen-media/paged-viewport-unit environment. Blocks 17–32 established that current live iframe preparation can mutate responsive application state. Blocks 33–48 established causal positive controls in which materializing already-computed screen geometry preserves the tested screen values through physical PDF generation.

## Block 49 — screen media-query truth is a negative/contrast control, not proof of screen geometry

In the managed Chromium control at source viewport 1200×800, forced `media:'screen'` keeps ordinary media-query state screen-like while viewport units resolve against the paged A4 content viewport during `printToPDF`.

Observed together:

- `window.innerWidth/innerHeight` remain 1200×800;
- `(max-width:800px)` remains false;
- orientation remains landscape;
- CSS generated branch remains `WIDE_LANDSCAPE` / `LANDSCAPE`;
- yet `50vw` changes from 600 px to about 351.5 px;
- `50vh` changes from 400 px to about 515.5 px.

Therefore “screen media is forced” is not sufficient evidence that the final print renderer uses the admitted screen viewport geometry. Current output is a hybrid environment: screen media-query truth plus paged viewport-unit geometry.

## Block 50 — device scale / resolution state is orthogonal to the viewport-unit split

A clean DSF control compared device scale factor 1 and 2 with the same 1200×800 screen viewport.

For both DSF values after print layout:

- `window.innerWidth` remains 1200;
- `devicePixelRatio` remains the configured 1 or 2 respectively;
- the corresponding resolution media state remains screen-like;
- `50vw` still becomes about 351.5 px.

Thus the identified viewport-unit divergence is not explained by device-pixel-ratio loss. Renderer environment contains multiple partly independent dimensions; preserving one (DPR/resolution truth) does not prove preservation of another (CSS viewport-unit basis).

## Block 51 — controlled preference/input media features are retained only as contrast evidence

A managed positive/contrast fixture also exercised controlled `prefers-color-scheme: dark`, `prefers-reduced-motion: reduce`, hover/pointer and landscape state.

Those controlled feature states remained screen-like under the tested setup while viewport-unit geometry still changed. This evidence is intentionally narrow:

- it does **not** claim these emulated values represent a real user's production settings;
- it does **not** identify color/reduced-motion/hover/pointer as the root cause of the current viewport-unit failure;
- it does show that “environment fidelity” cannot be represented by a single boolean such as `media === screen`.

A faithful capture contract must define which environment dimensions are admitted, materialized, intentionally reflowed, degraded or unknown.

## Block 52 — exact worker source contract creates the hybrid print environment

At exact source `service-worker.js` on base `4d26fb5b...`, `generatePdfBlob(tabId)` attaches the Chrome debugger and executes:

- `Emulation.setEmulatedMedia` with `{ media: 'screen' }`;
- then `Page.printToPDF` with `landscape:false`, `displayHeaderFooter:false`, `printBackground:true`, `scale:1`, `preferCSSPageSize:true`, and `transferMode:'ReturnAsStream'`.

At exact `content.js`, the injected print CSS includes `@page { size: A4; margin: 12mm; }`.

That source contract matches the physical probe configuration. It explains why media-query truth can remain screen-like while CSS viewport units are evaluated inside paged A4 geometry. The physical result is therefore production-shaped engineering evidence, not an unrelated print preset.

## Block 53 — exact live-frame source contract exposes responsive application state to WebClip preparation

At exact `content.js` source:

- `SELECTED_FRAME_PRINT_MEASURE_MAX_WIDTH_PX = 640`;
- `SELECTED_FRAME_PRINT_STABILIZE_PASSES = 3`;
- `applySelectedFramePrintFlow(..., 'frame', ...)` normalizes selected iframe print flow;
- `measureSelectedFrameHeightAtPrintWidth(frame)` reads current frame screen width, temporarily applies an important pixel width capped at 640 px, forces layout, measures child scroll/offset height, then restores important `width:100%` / `max-width:100%`;
- stabilization loops through selected frames for up to three passes and also runs again from `beforeprint`.

The earlier deterministic fixture observed this as the width sequence `1184 → 640 → 1184 → 640 → 1184 → 640 → 1184`, with live child `matchMedia` and `ResizeObserver` callbacks appending persistent visible DOM markers.

Restoring inline style therefore restores only style text/geometry, not page-script application generation. Current preparation is page-observable input to the live selected document.

## Block 54 — current diagnostics cannot prove viewport/environment fidelity or absence of preparation side effects

Current `capturePageStructureDiagnostics` records top-document `window.innerWidth` / `window.innerHeight`, root layout, selection counts/items and print preparation state. Worker sanitization preserves these as `document.viewportWidth` / `viewportHeight` and records selected-frame measurements such as screenWidth, measureWidth, measuredHeight and appliedHeight.

However the current receipt does not separately record/prove:

- the CSS viewport-unit basis actually used by the paged renderer;
- source-screen computed values versus final print-layout values for viewport-dependent selected geometry/typography;
- media-query truth together with the paged viewport-unit basis as distinct dimensions;
- responsive `matchMedia`, `ResizeObserver` or page-script mutations triggered by WebClip's temporary live-frame widths;
- whether rollback returned the selected application DOM/state to its admitted generation.

Therefore a successful `Page.printToPDF`, complete text, `viewportWidth:1200`, and normal-looking frame measurements cannot truthfully establish “same as displayed”. This is a diagnostics/receipt boundary supporting P0-070/P0-004/P0-075, not a new owner.

## Block 55 — acceptance semantics must distinguish faithful screen capture from intentional reflow

The product goal in this audit is a later-readable copy in the same visual state the user selected on the site, subject to explicit bounded degradation.

For that mode, acceptance needs an immutable admitted screen representation/environment contract before live preparation can alter it. At minimum, renderer-relevant viewport/environment dependencies must be either:

1. represented/materialized in an isolated capture representation so the tested screen appearance survives paged rendering; or
2. explicitly declared unsupported/degraded/unknown with a truthful receipt.

A separate reader/print mode may intentionally reflow to A4-relative geometry, but that is a different product semantic and must not be silently substituted for screen-faithful capture.

The stage-3 causal controls prove tested screen values can be preserved physically when the viewport dependency is materialized. They do not prescribe unbounded copying of arbitrary computed state: overflow, scaling, page width, resource identity, pseudo state, frame parity and admission budgets remain separate acceptance work.

## Block 56 — duplicate/root-cause reconciliation; no new P-code

Fresh registry/root-cause reconciliation does not justify a new code.

Primary current owners refined by this tranche:

- **P0-004 ACTIVE** — selected PDF visual fidelity includes viewport-dependent size, typography and layout; text completeness alone is insufficient;
- **P0-070 ACTIVE** — save authority is an exact full-document/renderer generation, including the admitted environment used to produce final physical bytes;
- **P0-075 ACTIVE** — the live host page is not a neutral/trusted print workspace; capture preparation should be isolated rather than inducing page-observable responsive state transitions.

Supporting owners:

- **P1-187 ACTIVE** — flattened/frame representation parity includes renderer-significant visual state;
- **P1-167 ACTIVE** — any materialization/diagnostic strategy needs shared bounded node/time/mutation/string admission;
- **P0-064 ACTIVE** — deep frame materialization needs preflight budget before allocation;
- **P2-007 BACKLOG** — faithful screen mode versus intentionally reflowed reader/print semantics must be explicit.

No registry status transition is made. `P1-230` remains unallocated.

## Final tranche conclusion

The current pipeline can produce a physically complete PDF whose selected content is materially different from the user's admitted screen appearance even though screen media queries remain true. The divergence is causally demonstrated for viewport-relative width, height, typography, padding and downstream aspect geometry, including an 8-page versus 24-page physical pagination split for identical text/DOM.

Separately, current selected-iframe preparation mutates the live renderer/application environment through `100%` and 640 px width transitions; page scripts can persist those transitions into the final copy even after inline style rollback.

The combined root is not “Chromium printing is imperfect”. It is that the capture architecture currently mixes live-page mutation, screen media-query truth and paged renderer geometry without one immutable isolated admitted representation/environment generation and without a diagnostic receipt capable of proving that boundary.

Blocks 49–56 are complete and interruption-safe. The full viewport/environment tranche is now complete at 56/56 blocks and ready for index/delivery work.
