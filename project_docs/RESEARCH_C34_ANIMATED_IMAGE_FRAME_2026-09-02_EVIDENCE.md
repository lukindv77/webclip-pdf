# C34 — Animated image / GIF current-frame evidence receipt — 2026-09-02

Canonical source baseline: `ba76db1e68ed2855f29fc040ed0ad40bfb898a7f`  
Exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`  
Classification: **`L4-REVALIDATED / FINDING + POSITIVE/DIRECT/STATIC-PNG/ADMISSION-RASTER/EMBEDDED-IMAGE/CAUSAL CONTROLS (P0-004, P0-070; P1-003 supporting)`**.

## Accepted physical execution

- workflow: `Research C34 animated image frame`;
- run: `33655118948`;
- job: `100331638249`;
- exact workflow head: `ceb314d811404886cdbfdcd93321015ce8011c07`;
- Chrome: `151.0.7922.173`;
- conclusion: SUCCESS;
- raw receipt commit: `df65820dba9b3806044aed96d5635c55ee214c1d`;
- result SHA-256: `734d5ece256669f898aa1d1bca141f358c0bf610e06f5027dd12da2981ddf844`;
- harness: `project_tools/research_c34_animated_image_frame.py`.

## Physical discriminator

Two-frame localhost GIF:

- frame A = red, 220×140, 300 ms;
- frame B = green, 220×140, 5000 ms.

Admission screen is directly sampled from the browser and contains exactly `30,800` green pixels / `0` red pixels.

Direct Chromium PDF:

- embedded image = 220×140 red PNG;
- embedded red `30,800`, green `0`;
- full-page raster also red (`39,184`).

Current WebClip selected PDF:

- admission/before-prepare screen = green `30,800` / red `0`;
- IMG `complete=true`, natural size `220×140`, exact GIF `currentSrc`;
- resource report `attempted=2, loaded=2, failed=0`, no deadline/scan truncation;
- selected token present, Exclude/outside absent;
- embedded PDF image = 220×140 red PNG, red `30,800`, green `0`.

Static green PNG positive control through the same WebClip path embeds green `30,800` / red `0`.

Causal admission-raster control:

- actual green element screenshot bytes are captured at admission;
- the exact screenshot PNG is re-served as the static image before preparation;
- physical WebClip PDF embeds green `30,800` / red `0`;
- Exclude/outside remain absent.

## Rejected measurement assumptions retained

Initial workflow run `33654306727` failed because:

1. post-prepare locator screenshots were occluded by WebClip UI and returned zero color pixels;
2. `canvas.drawImage(animated <img>)` returned the default/first GIF frame rather than the currently composited frame.

Those controls are rejected as measurement techniques, not hidden. The accepted run uses admission screenshot bytes and direct PDF embedded-image inspection.

## Ownership

- **P0-004 ACTIVE** — selected visual fidelity includes the actually visible animated-image frame.
- **P0-070 ACTIVE** — green admitted bitmap and red immutable PDF bitmap are different temporal representations/generations of the same selected resource.
- **P1-003 ACTIVE supporting** — resource load/decode readiness does not prove current composited-frame identity.
- P0-075 remains architecture support only; no new live-host mutation schedule is freshly revalidated here.
- P1-187 is not claimed because this fresh C34 tranche does not physically test frame parity.
- No new P-code.

External platform input: current W3C WebCodecs specifies that static `VideoFrame` construction from animated `HTMLImageElement` uses the animation default image or first frame, while `ImageDecoder` is explicitly frame-indexed. This supports the architecture conclusion that ordinary static image/resource APIs cannot be assumed to expose the browser's currently composited GIF frame.

No runtime, manifest/version, Registry status, release-readiness, build/tag or Release change.
