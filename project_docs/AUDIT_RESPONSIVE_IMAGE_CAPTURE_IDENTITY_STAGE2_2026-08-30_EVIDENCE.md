# Durable audit evidence — responsive image capture identity — Blocks 17–32 — 2026-08-30

Continuation of the fresh responsive-image capture-identity tranche from exact baseline `309dd6e446dbcc7188215fdbf979478cec645c96` on branch `audit/responsive-image-capture-identity-2026-08-30`.

Blocks 1–16 established two independent `<picture>` paths by which the final printed candidate can differ from the user's admitted candidate: live selected-frame width mutation before flattening, and later `<picture><source>` re-evaluation inside the top-document flattened proxy. This checkpoint extends the proof to width-descriptor `IMG.srcset/sizes`, then retains density descriptors as a negative control.

Canonical owner/status authority remains `AUDIT_REGISTRY.md`. Audit/docs only; no runtime, registry status, manifest/version/build/tag/release change.

## Block 17 — width-descriptor `IMG.srcset/sizes` is a distinct responsive-candidate path

Fresh fixture removes `<picture>` entirely and uses one IMG:

`src="red.png"`

`srcset="red.png 400w, blue.png 1200w"`

`sizes="(min-width:800px) 1000px, 400px"`

The image fills the selected iframe visually. At child viewport 420 px / DSF1, browser candidate selection chooses `red.png`.

This isolates the live-frame environment issue from parent `<picture><source>` semantics.

## Block 18 — admitted physical screen state for width descriptors is red

At source frame width 420:

- child `innerWidth = 420`;
- `currentSrc = red.png`;
- `complete = true`;
- naturalWidth 400;
- request history initially contains only red.

Exact physical screen PDF:

- SHA-256 `0ac583306baf3eb1cf7b8390038a1b2935bf5830d7059d852b19b6d5ebaa061a`;
- 1,981 bytes;
- about 100,947 red pixels;
- 0 blue pixels.

The pre-mutation resource receipt is therefore the same red candidate the user physically sees.

## Block 19 — current selected-frame 100% width changes width-descriptor selection

After applying the current production-shaped frame width `100%` in the 1200 px top viewport:

- child width becomes 1200;
- the `sizes` media condition selects the 1000 px source-size branch;
- browser changes `currentSrc` red → blue;
- successful blue control reaches naturalWidth 1000.

Again this is WebClip-induced live responsive selection, not A4 paper geometry.

## Block 20 — successful wide candidate becomes the physical saved candidate

After the production-shaped width sequence, current flattened IMG copying reads the later source `currentSrc = blue.png`, assigns it to target `src`, and removes target `srcset`.

After proxy settlement:

- proxy `src/currentSrc = blue.png`;
- naturalWidth 1000;
- physical proxy PDF SHA `a637d65b97f22d9a1c2d10a469557d506171d24bb64457cc88ddc0d78f1c272f`;
- 3,135 bytes;
- 0 red / about 99,552 blue pixels.

The user's red responsive art is therefore replaced by a different physical asset even without `<picture>`.

## Block 21 — narrowing to 640 px is not a reliable candidate rollback after a successful upgrade

In the successful-wide-resource schedule, after blue had loaded at 1200 px, the current 640 px measurement step changed source-size geometry but Chromium retained `currentSrc = blue.png`; the reported naturalWidth reflected the smaller effective source-size density.

This contrasts with the `<picture media>` fixture, where making the wide `<source>` ineligible switched currentSrc back to red.

Do not rely on restoring/narrowing geometry to restore earlier responsive-resource identity. Browser candidate selection/cache policy can retain a higher-resolution candidate once selected. The acceptance contract must snapshot identity explicitly rather than infer rollback from width rollback.

## Block 22 — failed wide candidate follows a different transition history

A deterministic failure control aborts only `blue.png` while leaving admitted red fully ready.

Observed:

- 420 px: red ready, naturalWidth 400;
- 1200 px: `currentSrc = blue.png`, naturalWidth 0;
- 640 px: browser returns to ready `red.png`;
- restored 1200 px: browser selects failed `blue.png` again.

The exact candidate transition depends on both responsive eligibility and resource outcome. This makes post-hoc reconstruction from geometry alone even less trustworthy.

## Block 23 — failed later width candidate produces a blank physical proxy after successful red admission

The failed-wide control begins with a valid red screen PDF:

- SHA `f692c66826bc03f94878382902858090c7a057a184cc04ee59139eeef59b5a0b`;
- about 100,947 red / 0 blue pixels.

The pre-mutation receipt is red/complete/naturalWidth 400.

After current 100% restoration and flattening:

- source currentSrc is failed blue;
- proxy freezes blue into IMG `src` and removes `srcset`;
- proxy naturalWidth remains 0;
- physical proxy PDF SHA `9e5083cbad0ab399fdeb12c712defd679e6c871f5d8a8679681fff847ea277fb`;
- 0 red / 0 blue pixels.

A successful responsive-image readiness result for the admitted candidate therefore does not prove the candidate ultimately printed.

## Block 24 — removing IMG `srcset` is a useful representation primitive but occurs too late

For a plain IMG, current flattened copying removes target `srcset` after copying source currentSrc to target src. This prevents the proxy IMG itself from re-running width-descriptor candidate selection.

That is a useful positive property, but the snapshot point is late: source currentSrc may already have been changed by WebClip's live-frame preparation. The failure is not “removing srcset is wrong”; it is “freezing the wrong generation”.

## Block 25 — freezing plain IMG at admission preserves the physical red art

Causal positive control, without live width mutation:

- admit source currentSrc red at 420 px;
- clone the IMG representation;
- assign admitted red to target src;
- remove target srcset/sizes.

Proxy settles with red currentSrc/naturalWidth 400.

Physical PDF:

- SHA `5725414ae3888d8c84aa04b87cdc27448d0c5733362bb5326827c67805f5be6a`;
- 2,614 bytes;
- about 96,327 red / 0 blue pixels.

This is the plain-IMG counterpart of the Block-15 `<picture>` causal repair control.

## Block 26 — density descriptors at DSF1 are stable across frame-width mutation

Negative control:

`srcset="red.png 1x, blue.png 2x"`, DSF1.

Across child widths 420 → 1200 → 640:

- devicePixelRatio remains 1;
- currentSrc remains red;
- only red is requested.

Current live width mutation does not generically change density-descriptor identity when the determining DPR dimension is stable.

## Block 27 — density descriptors at DSF2 are likewise stable across frame-width mutation

At DSF2, the same `1x/2x` fixture selects blue at source screen state.

Across 420 → 1200 → 640 px:

- devicePixelRatio remains 2;
- currentSrc remains blue;
- only blue is requested.

This aligns with the preceding viewport/environment tranche's result that DPR can remain stable while other environment dimensions change.

## Block 28 — responsive-image fidelity must be dimension-specific, not srcset-wide

Blocks 26–27 reject an over-broad “all srcset candidates are unstable” claim.

The demonstrated failures require an environment dimension that current capture changes or translates:

- width/media/source-size environment for width descriptors and `<picture media>`;
- top-document versus child-document media environment during flattening.

DPR-only density selection is a retained negative control in this fixture.

## Block 29 — exact image waiter proves readiness of element state, not a permanent candidate certificate

Current `waitForDomImage(image, deadlineAt)` checks the live element:

- if `image.complete`, it succeeds when `naturalWidth > 0`;
- otherwise it waits for that element's `load`/`error`, then validates naturalWidth.

The prefetch task separately records the URL resolved from currentSrc at task-construction time, but there is no immutable candidate token attached to the DOM element preventing later currentSrc changes after the task completes.

Current ordering prevents WebClip's own frame-width mutation until prefetch returns; Blocks 19–23 show that this is precisely why the successful receipt can immediately become stale afterward.

## Block 30 — current aggregate report has no successful-candidate identity receipt

`makePrefetchReport()` records aggregate attempted/loaded/failed/omitted/scan/deadline fields and bounded failure details. The visible print-header summary reports counts such as checked/ready/not-loaded/not-checked.

It does not record a stable list/hash of admitted successful responsive candidate identities and does not later compare them to source/proxy/final candidate identity.

Therefore even diagnostics cannot presently demonstrate that a clean `loaded` count corresponds to the responsive candidate frozen into the flattened representation.

## Block 31 — candidate identity is part of the selected renderer generation, not only URL readiness

For responsive images, three facts must agree for faithful capture:

1. the candidate identity whose pixels the user admitted on screen;
2. the resource/readiness proof for that identity;
3. the candidate/representation actually consumed by final physical PDF.

Current flow can prove (2) for red, mutate (1)'s live source slot to blue, and consume blue or blank in (3). Resource readiness and renderer state cannot be audited independently here.

## Block 32 — Stage-2 owner reconciliation

No new P-code/status transition.

Primary refinements remain:

- **P1-003 ACTIVE** — readiness must cover the actual final responsive candidate, not merely an earlier currentSrc;
- **P1-187 ACTIVE** — flattened representation must snapshot admitted responsive-renderer state before live mutation and prevent re-selection under the wrong owning environment;
- **P0-075 ACTIVE** — live frame geometry mutation changes page renderer state before isolation;
- **P0-070 ACTIVE** — final generation/receipt must prove candidate continuity;
- **P0-004 ACTIVE** — different/blank physical artwork is selected-copy fidelity loss.

Supporting **P1-167 / P0-064 / P2-007** remain unchanged. `P1-230` remains unallocated.

Blocks 17–32 are complete and interruption-safe.
