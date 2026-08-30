# Durable audit evidence — responsive/replaced-media fidelity — Blocks 1–16 — 2026-08-30

Canonical P-code status remains exclusively in `AUDIT_REGISTRY.md`. This evidence file is interruption-safe audit history only. No runtime, registry status, manifest/version, build, tag or GitHub Release change is made by this checkpoint.

Exact fresh audited base: `32e9672542482ba2a58d90258750261af75c5576`.
Working branch: `audit/responsive-replaced-media-fidelity-2026-08-30`.

Managed Chromium/CDP probes below are deterministic engineering evidence only. They are not a substitute for real unpacked-Chrome release QA.

## Scope and duplicate check

This tranche tests whether responsive/replaced media in the selected representation preserves the candidate and pixels the user actually saw at admission, especially across same-origin iframe flattening and WebClip's print-width preparation.

Neighboring evidence was checked before classification:

- `AUDIT_CAPTURE_ADMISSION_RESOURCE_FIDELITY_EVIDENCE_2026-08-29.md` already owns bounded renderer-resource readiness under P1-003 and has a direct top-document `<picture>` `currentSrc` positive control;
- viewport/environment fidelity already owns WebClip's live selected-iframe width transitions and the fact that temporary width mutation is page-observable;
- temporal render-state fidelity owns time-varying GIF/video/animation phase, not responsive candidate selection;
- saved-copy readability and typography/layout tranches already refine general flattened-frame representation P1-187.

The issue here is narrower and new as evidence: an iframe's responsive image candidate can be changed by WebClip preparation or reselected in the top-document flattened proxy under a different media/viewport environment. This is therefore a refinement of existing owners, not a new P-code.

Primary current owners: P1-187 / P0-004 / P0-070. Supporting boundaries: P1-003 / P0-075 / P1-167 / P0-064 / P2-007.

## Block 1 — exact current prefetch uses live `currentSrc`

Current `content.js::prefetchIncludedResources()` first promotes common lazy `data-src` / `data-srcset` attributes, yields one task turn, then scans selected resources.

For `IMG`, the resource key is effectively:

`element.currentSrc || element.getAttribute('src') || firstSrcsetUrl(element.getAttribute('srcset'))`.

The image wait considers `complete && naturalWidth > 0` ready.

This is useful for the current live candidate, but it does not establish that the current candidate is the same candidate the user saw when the selection/save was admitted. If WebClip itself changes iframe geometry first, `currentSrc` can legitimately change before this read.

## Block 2 — exact current flattened-frame URL copy freezes the then-current candidate

Current `content.js::copyFrameCloneUrlState(source, target)` special-cases `img`:

- reads `source.currentSrc || source.src`;
- writes that value to cloned `src`;
- removes cloned `srcset`;
- removes `loading`;
- forces `max-width:100%` and `height:auto`.

This intentionally resolves an ordinary `img/srcset` responsive choice to one URL. The unresolved question is *when* that choice was sampled. It is sampled during flattening, after live print preparation can already have changed the source iframe's environment.

## Block 3 — width-responsive `<picture>` source state changes under WebClip-like frame-width preparation

Deterministic fixture:

- top viewport: 1200 CSS px;
- selected same-origin iframe screen width: 420 px;
- child `<picture>` uses red fallback at narrow width and blue alternate source for `(min-width:800px)`;
- initial child `currentSrc = https://asset.test/red.png`.

WebClip-like width sequence produced:

- screen 420 -> red, media false;
- `width:100%` / child 1200 -> blue, media true;
- measurement width 640 -> red, media false;
- restore `100%` / child 1200 -> blue, media true.

Thus the source `currentSrc` available to flattening can already be different from the user's screen candidate solely because of WebClip preparation.

## Block 4 — physical screen-vs-prepared PDF control changes pixels

The initial 420 px iframe physical PDF contained the red resource only:

- raster red pixels: 100,947;
- blue pixels: 0.

After the live iframe width was expanded to 1200 px, an otherwise equivalent physical PDF contained the blue candidate instead:

- red pixels: 0;
- blue pixels: 169,092.

This is not merely a DOM metadata difference. The physical saved pixels change.

## Block 5 — `img srcset` width-descriptor candidate also changes

Fixture:

`srcset="red.png 400w, blue.png 1200w"`

`sizes="(min-width:800px) 1000px, 400px"`

At iframe width 420:

- `currentSrc = red.png`;
- natural width = 400.

After width 1200:

- `currentSrc = blue.png`;
- natural width = 1000 in the positive resource control.

After measure width 640, candidate selection can reevaluate again; after returning to 1200 it returns to blue. Therefore this defect is not limited to `<picture><source media>`.

## Block 6 — flattening after width mutation records the late candidate

In the width-descriptor positive control:

- admitted screen candidate: red;
- source candidate at flatten time after width preparation: blue;
- flattened clone receives `src=blue` and no `srcset`;
- clone loads blue successfully;
- physical proxy PDF contains blue pixels and no red pixels.

The implementation's `currentSrc -> src` rewrite is therefore internally deterministic but can deterministically preserve the *wrong generation* relative to user admission.

## Block 7 — failure of the newly selected candidate can turn a good admitted image into a blank PDF

Negative resource control keeps the narrow red resource available but makes the wide blue candidate fail.

At admission:

- red candidate loaded;
- physical screen PDF shows red correctly.

After WebClip-like frame expansion:

- `currentSrc` changes to blue;
- blue reports no usable natural width;
- flattened proxy receives blue as its resolved `src`;
- proxy PDF has neither red nor blue pixels for the image region.

So preparation can replace a fully ready admitted resource with a newly selected failing resource. A resource-readiness report generated after the mutation does not prove fidelity to the admitted screen.

## Block 8 — freezing the admitted candidate is a positive representability control

Control records the admitted red `currentSrc` before width mutation and gives the isolated proxy only that URL, without carrying responsive source selection machinery.

Observed proxy:

- `src = red.png`;
- `currentSrc = red.png` after load;
- `complete = true`, natural width 400;
- physical PDF red pixels: 96,327;
- blue pixels: 0.

Therefore the tested failure is representational/timing policy, not an unavoidable Chromium PDF limitation.

## Block 9 — `<picture>` media conditions are evaluated in the proxy's new document environment

A separate `<picture>` control begins in a 420 px child iframe:

- child media `(min-width:800px)` is false;
- child `currentSrc = red.png`.

A clone retaining the `<source media>` subtree is inserted into the 1200 px top document. In that top-document environment the same media query becomes true.

Even though cloned `<img src>` remains red, the proxy settles to:

- `currentSrc = blue.png`;
- physical PDF blue pixels 96,327;
- red pixels 0.

Removing the responsive `<source>` subtree is a clean control: the same cloned `img src=red` stays red in physical PDF.

## Block 10 — orientation media can invert across iframe -> top-document flattening

Fixture child iframe: approximately 420 x 700 (portrait).

Child `<source media="(orientation: landscape)">` is false, so source `currentSrc = red` and screen PDF is red.

Top document is landscape. When the `<picture>` subtree is flattened there, that same source media condition becomes true; proxy `currentSrc` switches to blue and physical proxy PDF is blue.

A width-only explanation is insufficient: media environment provenance itself matters.

## Block 11 — height media can likewise invert

Fixture child iframe: approximately 420 x 260.

Child `<source media="(min-height:600px)">` is false, so source/current screen is red.

Top document satisfies the height condition. Flattened proxy reselects blue and physical proxy PDF becomes blue.

Therefore a future representation contract must either materialize the admitted candidate/pixels or preserve the child media environment exactly; moving responsive markup to a different document is not neutral.

## Block 12 — density-descriptor `srcset` is a useful contrast control

With `srcset="red.png 1x, blue.png 2x"`:

- DSF/DPR 1 consistently chooses red across 420/1200/640 width changes;
- DSF/DPR 2 consistently chooses blue across those same width changes.

This proves the width-transition defect is not a claim that every `srcset` necessarily changes. The selected candidate depends on the descriptor/media inputs actually used by the browser.

It also means an isolated representation must preserve the relevant device/environment semantics or resolve the admitted candidate before moving it.

## Block 13 — omitted `sizes` uses viewport-dependent default sizing

For a width-descriptor `srcset` with no explicit `sizes`, the browser's default source-size behavior was viewport-dependent in the managed control:

- width 420 -> red, natural width 420;
- width 1200 -> blue, natural width 1200;
- width 640 remained on the higher candidate in the tested cache/selection sequence.

Screen physical PDF was red. Thus even markup without an explicit media-bearing `sizes` string can be responsive to environment changes.

## Block 14 — image wrapping for PDF hyperlinks samples the current candidate too

Current image-link preparation uses:

`image.currentSrc || image.src`

for images not already inside an `<a href>` and creates a temporary link whose `href` is that image URL.

A deterministic control admitted red, then changed frame width so `currentSrc` became blue before wrapping.

Physical PDF annotations then pointed to blue. A control that froze the admitted red URL produced red annotations instead.

This makes the responsive-generation issue observable not only in pixels but also in saved-copy navigation semantics.

## Block 15 — resource readiness can race responsive reselection

Delayed-candidate control:

- source at 420 px: red loaded and ready;
- flattened responsive proxy inserted in the wider document requests blue;
- before blue settles, proxy has `complete=false`, natural width 0;
- immediate `Page.printToPDF` completed in about 8.6 ms and contained neither red nor blue pixels;
- after delayed blue fulfillment, the same proxy printed blue.

`Page.printToPDF` itself is therefore not a barrier for a responsive candidate selected during proxy construction, consistent with P1-003's broader readiness evidence.

## Block 16 — first-stage classification and acceptance boundary

No new P-code is allocated.

Primary refinement:

- **P1-187 ACTIVE** — same-origin flattened iframe representation must preserve the rendered/replaced-media state the child actually showed, including admitted responsive candidate/pixels and relevant intrinsic state, rather than re-evaluating child responsive markup in the top document.
- **P0-004 ACTIVE** — selected visual fidelity includes the actual responsive image pixels and crop/geometry seen by the user.
- **P0-070 ACTIVE** — the candidate belongs to the exact admitted full-document/render generation; later WebClip width preparation cannot silently replace it.

Supporting owners:

- **P1-003 ACTIVE** — any newly materialized candidate required by the chosen representation must have bounded truthful readiness; `printToPDF` completion is not readiness proof.
- **P0-075 ACTIVE** — mutating the live iframe width is page/application-observable and also changes browser responsive resource selection.
- **P1-167 ACTIVE / P0-064 ACTIVE** — future state/materialization work remains globally bounded and preflighted.
- **P2-007 BACKLOG** — current-view vs transformed/static capture semantics must specify whether responsive pixels are frozen at admission or intentionally reflowed.

Next stage should test intrinsic size/aspect/object-fit/object-position and separate already-loaded-pixel preservation from URL/candidate identity.
