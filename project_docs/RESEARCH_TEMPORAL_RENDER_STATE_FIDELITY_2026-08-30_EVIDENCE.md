# Temporal render-state fidelity research — 2026-08-30 — Blocks 1–16

## Durable checkpoint

This file is an interruption-safe engineering checkpoint for a fresh-source research tranche begun from exact `main` commit `309dd6e446dbcc7188215fdbf979478cec645c96`.

Product acceptance target: a selected saved copy intended for later reading should preserve the admitted visual state the user actually saw, including user-selected information, rather than silently substitute another temporal frame of otherwise identical content.

Managed Chromium/CDP probes below are deterministic engineering evidence only. They are not real unpacked-extension release QA.

## Blocks 1–4 — source/owner/duplicate boundary

1. Fresh source is `309dd6e446dbcc7188215fdbf979478cec645c96`; prior viewport/environment work is already merged as PR #44 and post-merge `Repository integrity` push run #138 is SUCCESS.
2. `RESEARCH_REGISTRY.md` remains the only status/owner authority. No new P-code is allocated by this checkpoint.
3. Existing navigation evidence was checked for the relevant root causes. The selected-only cascade tranche contains only a narrow animation negative control, while the post-freeze physical-render-cut tranche already owns page mutation after preparation under P0-070/P0-075/P0-004. This tranche therefore treats temporal phase as a refinement/representation problem, not as an excuse to duplicate those owners.
4. Current preliminary owner set: P0-070 (exact admitted document/render generation), P0-004 (selected visual fidelity), P0-075 (isolated immutable print representation), P1-003 (actual renderer-resource readiness), P1-187 where flattened same-origin frame representation is involved, and P2-007 for explicit capture-mode semantics. Final reconciliation remains open until later blocks.

## Blocks 5–8 — CSS animation physical control

Probe environment:

- Chromium 144 headless managed through CDP;
- CSS viewport 1200×800, DSF 1;
- `Emulation.setEmulatedMedia({media:'screen'})`;
- `@page { size:A4; margin:0 }`;
- `Page.printToPDF({printBackground:true, preferCSSPageSize:true})`;
- a 120×120 black box at x=40, y=100 with `animation: move 4s linear infinite`, translating 0→400 px.

Running-animation sample just before the print call:

- animation `currentTime ≈ 883.363 ms`, `playState=running`;
- source `getBoundingClientRect().x ≈ 128.336 px`;
- computed transform translation ≈ 88.336 px.

Physical 96-dpi PDF raster:

- black box bbox = `[128,100,248,220]`;
- PDF = 1,114 bytes;
- SHA-256 `0361fb5b7a0ae9877711fdd2ecf4f2924c0970a40ddb61a96029cc2181329db2`.

The print call itself completed in about 7.6 ms; after it, the running animation had advanced to about 899.965 ms / x≈129.996 px. The physical raster corresponds to the phase sampled at the print cut rather than to a reset to the keyframe origin.

Positive frozen control:

- same fixture, but all document animations were paused before the pre-print sample;
- `currentTime ≈ 883.321 ms`, `playState=paused`, x≈128.332 px before print;
- x and currentTime were unchanged after print;
- physical PDF bbox again `[128,100,248,220]`;
- PDF SHA-256 `f5650f37b1861bf70c69e908570c1618c56eb475f17eddd97da3e1a66a76e62c`.

Interpretation: Chromium can physically preserve an arbitrary CSS-animation phase when that phase is explicitly stabilized. Therefore a moving page state is representable; temporal instability is not inherently required by PDF output.

## Blocks 9–12 — animated GIF current-frame mismatch

A deterministic 400×120 two-frame GIF was generated in-memory:

- frame A, duration 500 ms: 80×80 black box at x=20..99;
- frame B, duration 500 ms: same box at x=280..359;
- infinite loop; white background.

The image was loaded as a data-URI `<img>`; `HTMLImageElement.complete` was `true` in all retained runs.

Physical controls:

| elapsed after load | screen screenshot bbox | PDF raster bbox |
|---|---|---|
| ~0.2 s | `[20,20,100,100]` (frame A) | `[20,20,100,100]` (frame A) |
| ~0.7 s | `[280,20,360,100]` (**frame B**) | `[20,20,100,100]` (**frame A**) |
| ~1.2 s | `[20,20,100,100]` (frame A) | `[20,20,100,100]` (frame A) |

The decisive 0.7 s run proves a visible current-frame substitution at the physical PDF boundary: the user-visible screenshot contained frame B, while the PDF contained frame A from the same fully loaded image element.

Retained PDF SHA-256 values:

- 0.2 s: `9a300df51a0c557acbe2436367bf4541f02ad506a859c898e8d2b03d8242ea47`;
- 0.7 s mismatch: `403a15c95cff8299ebb8d5589e2110e16be92c48f16694e6aab0d2b1b1d27dd2`;
- 1.2 s: `802111036e93d00f5345c13f567e4f622216608c8897b441907963df36774840`.

All three PDFs were 2,881 bytes. Byte equality is not expected because generated PDF metadata/object details vary; the retained claim is based on direct raster geometry, not hash comparison.

This establishes a concrete distinction between resource readiness and visual-frame readiness: `img.complete === true` proves the image resource is available, but does not prove that `Page.printToPDF` will serialize the animated frame the user currently sees.

## Blocks 13–15 — `<video>` contrast control

A deterministic two-second 400×120 WebM was generated:

- first second: black box at x=20..99;
- second second: black box at x=280..359;
- `<video autoplay muted loop playsinline>`; readyState 4 in retained samples.

At video `currentTime ≈ 0.402 s`:

- screenshot bbox `[20,20,100,100]`;
- PDF bbox `[20,20,100,100]`;
- PDF SHA-256 `0ae52a955b73262b858775a4ec671d032fef78c7d6a281479864e0c728e54886`.

At video `currentTime ≈ 1.302 s`:

- screenshot bbox `[280,20,360,100]`;
- PDF bbox `[280,20,360,100]`;
- PDF SHA-256 `969aa99e2c02b7d060ea5f92f7f57218047a8c35fd87fc33cfccee64fe6fc209`.

Thus the GIF mismatch is not a generic statement that Chromium always prints the first frame of every moving visual. In this controlled WebM case, physical PDF preserved the current video frame. Temporal representation is media-class-specific and must be tested/receipted rather than inferred from one resource-ready flag.

## Block 16 — current-source implications and next boundary

Current `content.js` has no page-owned animation freeze/snapshot phase in the inspected source path. Its explicit animation comment concerns only WebClip UI visibility around `beforeprint`/`afterprint`; it states that no animation frame is painted between those two events, which is not a receipt for page-owned animation/media phase.

The flattened-frame media copier copies `src` for `video`/`audio`/`source` and `poster` for `video`; copying source URLs alone does not prove preservation of a currently decoded media frame/time. This will be probed separately in the next stage rather than inferred.

Next durable stage should cover at least: (a) admission→print delay drift for running CSS/Web Animations and JS-driven visual state; (b) animated image stabilization controls such as rasterizing the current composited frame; (c) selected same-origin flattened-frame GIF/video/canvas temporal state; (d) current diagnostics truth — whether any receipt records temporal phase or substitution; (e) final owner reconciliation without creating a duplicate P-code.
