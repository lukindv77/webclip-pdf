# Durable audit evidence — responsive/replaced-media fidelity — Blocks 17–32 — 2026-08-30

Continuation of `AUDIT_RESPONSIVE_REPLACED_MEDIA_FIDELITY_2026-08-30_EVIDENCE.md` from exact base `32e9672542482ba2a58d90258750261af75c5576` on branch `audit/responsive-replaced-media-fidelity-2026-08-30`.

This checkpoint is docs/evidence only. Canonical P-code status remains exclusively in `AUDIT_REGISTRY.md`. Managed Chromium/CDP and local PDF raster probes are engineering evidence, not real unpacked-Chrome release QA.

## Block 17 — current flattened-frame style contract omits replaced-element crop state

`FLATTENED_FRAME_STYLE_PROPERTIES` contains a bounded set of box/font/background/table properties but does not include:

- `object-fit`;
- `object-position`;
- `aspect-ratio`;
- explicit computed `width` / `height`.

`copyFrameCloneUrlState()` additionally forces cloned `img`:

- `max-width:100% !important`;
- `height:auto !important`.

Therefore even when the correct resource URL is chosen, the pixels need not occupy the same box/crop as the source.

## Block 18 — physical `object-fit:cover` / `object-position:right` source control

Source image intrinsic size: 400 x 200, left half red and right half blue.

Source CSS:

- width 200 px;
- height 200 px;
- `object-fit:cover`;
- `object-position:100% 50%`.

Browser source state:

- rendered box 200 x 200;
- object-fit `cover`;
- object-position `100% 50%`.

Physical source PDF:

- SHA-256 `d0656351187e9d071de4ca236c442381e85cae8d8e56b103713ca16f3ca798d8`;
- raster contains 63,001 strong-blue pixels and zero strong-red pixels.

The right-hand crop is therefore physically observable.

## Block 19 — current-like proxy loses both geometry and crop semantics

A current-like clone copied the source URL, removed responsive state and applied the implementation's image override while not carrying object-fit/object-position.

Observed proxy:

- box 200 x 100 instead of 200 x 200;
- computed `object-fit:fill`;
- computed `object-position:50% 50%`.

Physical proxy PDF:

- SHA-256 `9b7243e804782bc53308e1acbbd615c24e338661406d03c0fce4b909302389b4`;
- ~15,876 red and ~15,750 blue pixels.

So the same resource is represented with different size and different visible pixels.

## Block 20 — crop-state-only control proves `object-fit` is independently significant

A control kept the 200 x 200 box but omitted object-fit/object-position.

Physical PDF contained both halves:

- ~31,626 red pixels;
- ~31,375 blue pixels.

Thus the defect is not only the forced `height:auto`; missing replaced-element crop state independently changes the visible result.

## Block 21 — isolated frozen crop control exactly reproduces the source PDF

An isolated proxy was given:

- the same resolved source URL;
- width/height 200 x 200;
- `object-fit:cover`;
- `object-position:100% 50%`.

Its physical PDF SHA-256 was exactly:

`d0656351187e9d071de4ca236c442381e85cae8d8e56b103713ca16f3ca798d8`

which is byte-for-byte identical to the source control.

The tested loss is therefore representable without modifying the live page.

## Block 22 — an already-decoded Blob image can outlive its resource URL

Browser-created Blob URL source:

- source `currentSrc = blob:null/...`;
- `complete=true`;
- natural width 400;
- physical source PDF is red (`45,451` red raster pixels).

After `URL.revokeObjectURL()` the already-decoded source still has a renderer-owned image and remains physically printable.

This is an important distinction: visible decoded image state is not equivalent to future URL dereferenceability.

## Block 23 — flattened re-fetch of the revoked Blob URL loses the admitted image

After revocation, a new current-like image proxy was constructed from the source's URL string.

Proxy state settled with:

- same Blob URL text;
- `complete=true`;
- natural width 0.

Physical proxy PDF had no red/blue image pixels and only a small broken-image/placeholder raster footprint.

P1-187 therefore needs renderer-owned replaced-media state/pixels where URL replay cannot reproduce an already-visible source.

## Block 24 — actual resource URL truncation is a fidelity boundary, not only a diagnostics bound

`copyFrameCloneUrlState()` writes cloned image `src` using:

`String(src).slice(0, PDF_RESOURCE_URL_MAX_CHARS)`

where `PDF_RESOURCE_URL_MAX_CHARS = 8192`.

A source data-URL PNG had:

- `currentSrc.length = 266,106`;
- natural size 300 x 300;
- physical source PDF size 126,266 bytes;
- ~90,572 non-white rendered pixels.

A current-like clone truncated that *actual resource URL* to 8192 characters.

## Block 25 — long data-URL truncation physically destroys the image

The truncated proxy's physical PDF:

- SHA-256 `e1879f195768267ed77741de2be4a49d5841e901a6976b9d67e0151a480f0e6b`;
- PDF size only 6,735 bytes;
- ~2,400 non-white pixels, corresponding to broken/placeholder rendering rather than the source bitmap.

This demonstrates that a limit appropriate for logging/diagnostics cannot be applied blindly to the renderer's actual resource capability/string without an explicit truthful degradation path.

No new owner is required: P1-187 owns frame representation and P1-003 owns required resource readiness/truth; P0-004 owns the visible loss.

## Block 26 — URL identity does not imply response-byte/pixel identity

A controlled endpoint `https://asset.test/same.png` was served with `Cache-Control:no-store`, CDP cache disabled:

- first request returned a red 400 x 200 image;
- a later request for the exact same URL returned a blue 200 x 400 image.

Source state:

- currentSrc is the exact URL;
- request count 1;
- physical PDF red pixels: 45,451, blue 0.

A newly created proxy assigned the exact same URL and caused request count 2.

Proxy state then had natural size 200 x 400 and physical PDF blue pixels 180,901, red 0.

The URL string remained identical while the resource generation changed completely.

## Block 27 — responsive/replaced fidelity therefore needs a generation or pixel receipt

The same-URL control means a future implementation cannot claim admitted-pixel preservation merely because it stores `currentSrc` exactly.

Possible representational families include, subject to budget/policy:

- immutable operation-owned response bytes;
- an admitted decoded bitmap/snapshot for visual output;
- a renderer snapshot with exact resource generation receipt;
- a proven immutable cache/resource identity.

This evidence does not prescribe which mechanism is required. It rules out bare URL equality as proof of visual identity.

## Block 28 — current temporary image-link helper structurally mutates `<picture>` before flattening

Exact current `prepareForPrint()` ordering includes:

1. install selection print styles;
2. absolutize links;
3. `wrapUnlinkedImagesForPdf()`;
4. stabilize selected frame heights;
5. flatten selected same-origin body frames.

`wrapUnlinkedImagesForPdf()` selects included `img[src], img[srcset]`, skips only images already under `a[href]`, creates an `<a>`, inserts it before the image and moves the image inside it.

For an ordinary `<picture><source ...><img></picture>`, this changes the required direct-child structure to `<picture><source ...><a><img></a></picture>` on the live page.

## Block 29 — moving `<picture> > img` into the helper link changes `currentSrc`

Clean top-document fixture, viewport 1200:

- `<source media="(min-width:800px)" srcset="blue.png">`;
- fallback `<img src="red.png">`;
- before helper mutation, `currentSrc = blue.png`, natural size 200 x 400.

The WebClip-like helper first sampled `imageUrl = blue.png` and set wrapper `href=blue.png`.

Immediately after reparenting the image under `<a>`, the old candidate can remain transiently observable; after browser source-selection settlement:

- `currentSrc = red.png`;
- natural size becomes 400 x 200;
- `<picture>` children are now `source, a` rather than `source, img`.

Thus the helper DOM topology itself invalidates picture-source association.

## Block 30 — the physical PDF can show one image while linking to another

After the helper mutation settled:

- physical PDF raster contained 70,688 strong-red pixels and zero strong-blue pixels;
- PDF `/URI` actions contained `https://asset.test/blue.png` twice.

So the saved copy visually shows the fallback red resource while its generated image hyperlink points to the formerly admitted blue resource.

This is a direct saved-copy correctness/readability defect, not merely an internal DOM transient.

Positive control: when the author link wraps the whole `<picture>` (`<a><picture>...<img></picture></a>`), current code skips the temporary wrapper because `img.closest('a[href]')` succeeds; the `img` remains a direct picture child and the blue candidate is retained.

## Block 31 — candidate aspect-ratio inversion changes pagination

Same-origin child iframe control:

- child viewport width 420;
- narrow fallback red intrinsic 400 x 200;
- child rendered image box 420 x 210;
- tail marker begins around y=214;
- physical source PDF is one page and red.

The `<picture>` subtree was cloned to the 1200 px top document with current-like behavior:

- cloned `<img src>` initially set from source red `currentSrc`;
- cloned `<source media="(min-width:800px)" srcset=blue>` remains present;
- top document satisfies the media query;
- proxy reselects blue intrinsic 200 x 400;
- width attribute 650 plus `height:auto` gives a 650 x 1300 image;
- tail marker moves to y=1300.

Physical proxy PDF is two pages and overwhelmingly blue (~1,322,751 strong-blue pixels), while the source PDF is one page and red (~138,075 red pixels).

Responsive candidate fidelity can therefore alter pagination, not just local image color.

## Block 32 — second-stage owner reconciliation

No new P-code/status transition.

Primary owners remain:

- **P1-187 ACTIVE** — frame proxy must preserve rendered replaced-media state, including responsive candidate, intrinsic geometry, object-fit/object-position and already-decoded pixels that URL replay cannot reproduce.
- **P0-004 ACTIVE** — these losses materially change selected visual pixels, geometry and pagination.
- **P0-070 ACTIVE** — admitted renderer/resource generation must not be silently replaced by later URL response or preparation generation.

Supporting refinements:

- **P1-003 ACTIVE** — proxy-introduced/newly selected resources need bounded readiness and truthful failure; `Page.printToPDF` is not a readiness barrier.
- **P0-075 ACTIVE** — temporary helper DOM/iframe mutations on the live host are not capture-neutral.
- **P1-219 ACTIVE** — the same temporary image-wrapper mechanism already has structural rollback ownership; this tranche adds semantic `<picture>` invalidation evidence without replacing P1-219's current rollback root cause.
- **P1-167 / P0-064** — bitmap/resource materialization must remain globally bounded/preflighted.
- **P2-007** — architecture must state whether current-view pixels or responsive reflow is the chosen capture semantics.

Next stage should inspect readiness/diagnostic truth for flattened proxy resources, image-map/SVG/replaced-element semantic state, and whether top-level direct images differ from same-origin proxy behavior under the same controls.
