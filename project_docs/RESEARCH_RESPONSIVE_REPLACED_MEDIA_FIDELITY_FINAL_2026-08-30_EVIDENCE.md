# Final durable evidence — responsive/replaced-media fidelity — Blocks 49–56 — 2026-08-30

This file completes the 56-block interruption-safe research tranche begun in:

- `RESEARCH_RESPONSIVE_REPLACED_MEDIA_FIDELITY_2026-08-30_EVIDENCE.md` — Blocks 1–16;
- `RESEARCH_RESPONSIVE_REPLACED_MEDIA_FIDELITY_STAGE2_2026-08-30_EVIDENCE.md` — Blocks 17–32;
- `RESEARCH_RESPONSIVE_REPLACED_MEDIA_FIDELITY_STAGE3_2026-08-30_EVIDENCE.md` — Blocks 33–48.

Exact researched base: `32e9672542482ba2a58d90258750261af75c5576`.
Branch: `research/responsive-replaced-media-fidelity-2026-08-30`.

No runtime, `RESEARCH_REGISTRY.md`, manifest/version, build, tag or GitHub Release changes are made by this tranche. Managed Chromium/CDP/PDF raster evidence is engineering evidence only; real unpacked Chrome remains release QA.

## Block 49 — the 8192-character resource limit currently affects both readiness discovery and actual proxy playback

Exact current source uses `PDF_RESOURCE_URL_MAX_CHARS = 8192` in two materially different roles:

1. `safeResourceUrl()` returns empty for resource URLs longer than the limit, so an otherwise already-visible selected image with a long data/blob-like locator can be omitted from the explicit prefetch task graph;
2. `copyFrameCloneUrlState()` slices the actual cloned image `src` string to that same length.

The long-data physical control shows why those roles cannot be conflated:

- source `currentSrc.length = 266,106` and renders correctly;
- current-like proxy truncation to 8192 physically destroys the bitmap.

A diagnostics/logging bound is not automatically a safe renderer-resource transformation.

## Block 50 — readiness of the source representation is not readiness of the final representation

Across the tranche the source image can be fully ready while the final representation is not:

- admitted red responsive image ready -> preparation selects unavailable blue -> proxy blank;
- admitted decoded Blob bitmap ready -> Blob URL revoked -> proxy reload fails;
- admitted picture source ready -> top-document picture source reselects a new delayed candidate -> immediate PDF blank;
- source long data URL ready -> proxy truncates the resource string -> proxy broken;
- source URL ready -> later same-URL request yields different bytes/pixels.

Therefore P1-003 acceptance must fence the **actual final representation resource graph**, not merely the live source graph sampled before proxy creation.

## Block 51 — top-document helper mutation and iframe flattening are two separate responsive-fidelity hazards

The evidence deliberately distinguishes two paths:

### Live top/source mutation

`wrapUnlinkedImagesForPdf()` can reparent `<picture> > img` under a generated `<a>`, invalidating picture-source association. This can change currentSrc/pixels *before* `Page.printToPDF`, even without iframe flattening.

### Isolated-ish flattened representation

`createFlattenedBodyFramePrintProxy()` can change:

- document media/base environment;
- picture source selection;
- ordinary image geometry/crop because object-fit/object-position are not copied;
- URL/resource generation because new top-document loads are created.

A repair that fixes only flattening would not fix the live `<picture>` wrapper mutation; a repair that only avoids the wrapper would not fix proxy resource provenance.

## Block 52 — required admission receipt is visual/resource state, not only DOM identity

For the product goal “later reading in the same state the user saw,” a selected replaced-media receipt needs enough information to distinguish at least:

- selected element/document generation;
- admitted `currentSrc`/source candidate where meaningful;
- intrinsic width/height and rendered box;
- object-fit/object-position/aspect behavior relevant to visible crop;
- decoded/current visual pixels when URL replay is not generation-stable;
- source document/base provenance for relative nested resources;
- whether final representation reused the admitted state or intentionally reflowed/reselected it;
- final resource settlement/degraded result.

The tranche does not prescribe one serialization format. It establishes the acceptance information that a faithful implementation must be able to prove or truthfully mark unknown/degraded.

## Block 53 — pixel/response materialization must be bounded before allocation

The positive controls show that snapshotting/materializing admitted pixels can preserve cases that URL replay cannot, but a naive “bitmap every image” solution is not acceptable.

Existing owners already define the required safety boundary:

- **P0-064** — preflight node/text/byte budget before full flattened materialization;
- **P1-167** — one shared node/time/mutation/string budget for PDF preparation;
- **P1-003** — bounded resource count/deadlines and truthful omissions.

Responsive-media acceptance therefore needs an explicit pixel/byte/count envelope before creating large decoded bitmaps, canvas copies, data URLs or operation-owned resource byte copies. On budget exhaustion the result must be partial/degraded/unknown rather than silently switching to a different candidate.

## Block 54 — truthful degraded/unknown semantics need to name the representation boundary

Examples that should not be reported as fully faithful success without proof:

- source candidate ready but final proxy candidate still loading;
- final proxy candidate failed while an admitted source bitmap existed;
- source/proxy currentSrc differ unexpectedly;
- proxy object-fit/object-position/box differs from admitted state outside intentional reflow semantics;
- a long actual resource URL was rejected/truncated by a safety bound;
- relative nested media was moved without proven base/provenance normalization;
- final pixel/resource generation is not distinguishable from a later same-URL response.

A truthful user-facing model may choose current-view fidelity, static reflow, reader mode or another explicit mode under P2-007, but it must not label one mode as “same as viewed” when these receipts are absent.

## Block 55 — duplicate/root-cause reconciliation against neighboring tranches

No new P-code is justified.

This tranche does **not** duplicate:

- viewport/environment fidelity: that tranche proved live iframe width changes and paged viewport-unit geometry; this tranche proves the resulting responsive/replaced-media candidate/pixel consequences and proxy provenance losses;
- temporal render-state fidelity: that tranche owns animation/GIF/video time phase; this tranche owns responsive/static replaced-resource generation and crop/provenance;
- CSS visual dependency / typography-layout tranches: those prove broad missing computed style properties; this tranche adds replaced-element `object-fit/object-position`, candidate/resource generation and physical resource replay controls;
- saved-copy readability: that tranche owns link/destination/logical-state boundaries; this tranche adds the concrete picture-wrapper case where physical pixels become red while generated image link URI remains blue;
- deferred materialization: that tranche owns lazy/virtualized content; this tranche only uses readiness races to prove final-proxy resource fencing;
- post-freeze physical-render-cut: that tranche owns hostile/post-prepare mutation at physical cut; this tranche additionally shows WebClip's own helper/proxy transformations can change responsive resource state even without hostile mutation.

`P1-230` remains deliberately unallocated.

## Block 56 — final classification / acceptance matrix

No canonical status transition.

### Primary owners

**P1-187 ACTIVE — flattened iframe rendered-state parity**

Must cover responsive/replaced media including admitted candidate/pixels, intrinsic geometry, object-fit/object-position, picture/source/base provenance, already-decoded resource state and final proxy resource settlement.

**P0-004 ACTIVE — selected visual/layout fidelity**

User-facing acceptance includes actual image pixels/crop/size and pagination. Physical controls changed red<->blue pixels, 200x200 -> 200x100 crop geometry and one-page -> two-page pagination.

**P0-070 ACTIVE — exact admitted full-document/render generation**

`currentSrc` or a URL read after WebClip preparation is not automatically the admitted generation. Same URL can later produce different bytes; live frame-width preparation can select another responsive candidate before flattening.

**P1-003 ACTIVE — actual final renderer-resource graph readiness**

Prefetching the source graph before proxy creation does not prove resources introduced/reselected by the final representation are loaded/decoded. `Page.printToPDF` completion remains insufficient as a readiness receipt.

### Supporting owners

**P0-075 ACTIVE** — live frame width and temporary image-wrapper structural mutations are page-observable/non-neutral preparation.

**P1-219 ACTIVE** — same image-wrapper mechanism retains its existing exact structural rollback owner; new evidence adds `<picture>` semantic invalidation as a supporting acceptance case.

**P1-167 ACTIVE / P0-064 ACTIVE** — any stronger resource/pixel materialization must be preflighted and globally bounded.

**P2-007 BACKLOG** — capture architecture must explicitly distinguish “freeze the current viewed pixels/state” from deliberate responsive/static reflow and surface truthful degradation.

## Final conclusion

The current pipeline has no single immutable replaced-media representation spanning user admission through physical PDF. Depending on the path, it may preserve a live `currentSrc`, sample a later candidate after WebClip width mutation, re-evaluate `<picture>` sources in the top document, lose child-relative SVG resource provenance, discard object-fit/crop state, dereference a revoked/changed URL, truncate the actual resource locator, or create a new proxy resource after the reported source prefetch has already completed.

The common acceptance boundary is not “did we copy the image URL?” but “can the saved artifact prove or truthfully qualify the same admitted visual resource state under explicit mode and budget semantics?”
