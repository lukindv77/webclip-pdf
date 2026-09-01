# WebClip — fresh full-project research restart — C08 raster images / crop / object-fit — 2026-09-02

Date: 2026-09-02

Canonical product-source baseline exercised: `06b1718446c8436e78cfcdc6aabf9e1faec887cf`.

Accepted focused evidence execution:

- research branch head associated with the workflow run: `0e0081b9cca8a4c8752e75e3fd8bad6f1903cefc`;
- pull-request synthetic merge checkout used by GitHub Actions: `cdd3e09fa72d28c48c0375fa3355762b11a5af55`;
- workflow run: `33535640665`;
- job: `99949160705`;
- conclusion: **SUCCESS**;
- browser: Google Chrome for Testing `152.0.7977.64`;
- `content.js` SHA-256: `9bc3b42db86d522a05cd261da420771eab721f1767bc13fc28d6b0c32f0ff47a`;
- artifact id: `9811522342`;
- artifact ZIP digest: `sha256:bb9e6bb141b39ac9b6d388352d793fb95d8e9e52b57f705fde9626877eaf8744`;
- machine result: `accepted=true`.

The workflow checkout was GitHub's synthetic PR merge commit. The exercised product runtime is byte-identical to canonical `main` for the product files: the temporary branch adds only the focused research harness/workflow. Product runtime was not changed to obtain the result.

## 1. C08 contract and source-first boundary

C08 researches whether ordinary raster images preserve the user-observed crop/fit/position semantics into the physical PDF, and whether image readiness/failure is reported truthfully enough for that physical result.

Fresh current-source inspection establishes:

- top-document image readiness uses the actual selected `IMG` element and waits for `complete` / load/error with a natural-size check;
- image task discovery prefers `currentSrc`, then `src`, then a bounded srcset fallback;
- same-origin BODY flattening creates a secondary top-document representation and copies a bounded allowlist of computed styles;
- the current flattened style allowlist does **not** include `width`, `height`, `object-fit` or `object-position`;
- current source has no `object-fit` handling path that separately freezes the admitted replaced-element crop semantics into the flattened proxy.

That source shape predicts two different acceptance paths: ordinary top-document images can rely on Chromium's native replaced-element rendering, while same-origin BODY flattening must explicitly reproduce the child document's rendered image box/crop semantics or it can drift.

Pipeline mapping for this tranche is primarily B3 Capture -> B4 Static Materialization -> B5 Renderer -> B6 Physical Artifact, with resource-readiness controls at the B4/B5 boundary. B1/B2 selection/generation owners are not advanced by this focused tranche.

## 2. External standards/vendor/community research

External research was used as hypothesis and comparison input, not as project authority.

Relevant standard/platform semantics:

- MDN's current replaced-element guidance describes `object-fit` as the control for how image/video content is fitted to the element's content box and `object-position` as the alignment of that content within the box. `cover` and `contain` preserve intrinsic aspect ratio rather than behaving like the default `fill`. Source: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Images/Replaced_element_properties
- The implication for WebClip is architectural rather than cosmetic: if a secondary representation preserves the image URL but loses the rendered box, `object-fit` or `object-position`, it no longer represents the same admitted visual state.

Comparable archival tooling reinforces the need to validate the final browser-rendered artifact rather than treating resource presence as sufficient:

- Browsertrix/Webrecorder explicitly positions browser-based capture as a high-fidelity approach for dynamic sites: https://webrecorder.net/browsertrix/
- SingleFile user reports include saved-page image display failures, demonstrating that users evaluate archival success by later-visible image output rather than by a nominally successful save operation; one representative issue is https://github.com/gildas-lormeau/SingleFile/issues/1357

These observations do not create WebClip requirements by themselves. They support the existing WebClip product contract that final later-readable visual output is the acceptance boundary, and they motivated direct physical PDF discrimination below.

## 3. Top-document `object-fit: cover` / `object-position` positive controls

The test image is 400×200: left half red, right half blue. It is rendered into a 220×220 square so `cover` must crop horizontally.

### Left crop

Source rendered state:

- box `220×220`;
- `object-fit: cover`;
- `object-position: 0% 50%`;
- source screenshot: `48,400` red pixels / `0` blue.

Physical PDF:

- `55,460` red pixels / `12` blue noise pixels;
- bytes: `21,551`;
- SHA-256: `e643848a1f45f201c56761aba4d177e804b20170039455867b2b8baae414f705`.

Resource report was clean: attempted `2`, loaded `2`, failed `0`, no limit/deadline truncation.

### Right crop

Source rendered state:

- box `220×220`;
- `object-fit: cover`;
- `object-position: 100% 50%`;
- source screenshot: `0` red / `48,400` blue.

Physical PDF:

- `0` red / `55,472` blue;
- bytes: `21,546`;
- SHA-256: `a046a137bfe7945854baf0890b92c51abf5a0bc51142dc49916cc60a20caf05b`.

This is a strong ordinary-path positive control: Chromium/WebClip can physically preserve both crop directions when the live selected image remains the renderer input.

## 4. Top-document `object-fit: contain` positive control

The same 2:1 image is rendered inside a square `220×220` green box using `object-fit: contain; object-position:center`.

Source screenshot:

- red `12,100`;
- blue `12,100`;
- green letterbox/background `24,200`.

Physical PDF:

- red `13,806`;
- blue `13,818`;
- green `27,028`;
- bytes `22,744`;
- SHA-256 `08ee8c310457b3edd438737fb766726cd40df8103087661646f1b2d0f0989b08`.

This rejects a generic hypothesis that physical PDF generation itself cannot represent raster `contain`/letterboxing semantics.

## 5. Delayed raster readiness positive control

A selected raster image was assigned a controlled response delayed by about four seconds after selection.

Observed preparation:

- elapsed about `4.020 s`;
- resource-report elapsed `3799 ms`;
- attempted `2`, loaded `2`, failed `0`;
- no omitted/truncated/deadline state.

Physical PDF:

- magenta raster signal `66,006` pixels;
- bytes `21,587`;
- SHA-256 `c3aa8fd0d9d584c3f36f752b55dd4d2514823aeaf40c63f78620b92c4c752ebe`.

This freshly proves that the current ordinary `IMG` readiness path does wait for an admitted delayed raster image in this bounded case.

## 6. Broken raster truthful-failure control

An intentionally missing selected image produced:

- attempted `2`;
- loaded `1`;
- failed `1`;
- failure kind `image`;
- failure reason `image-load-error`;
- no deadline/limit truncation.

Physical artifact SHA-256: `d5585a7335bd2e6be87e09be989e88a00b9737a8ba0b38d77e70f71396e5560a`.

This is another important discriminator: C08's finding below is not a generic inability to detect broken ordinary images.

## 7. Fresh finding — same-origin flattened BODY loses raster crop/fit state — P1-187

The selected same-origin child BODY contains one image whose rendered state is supplied by the child stylesheet:

- intrinsic image: `400×200`, red left half / blue right half;
- rendered source box: `220×220`;
- `object-fit: cover`;
- `object-position: left center` (`0% 50%`).

Before flattening, the source screenshot is exactly the expected left crop:

- red `48,400`;
- blue `0`.

After current WebClip same-origin BODY flattening, the top-document proxy computes:

- width `400`;
- height `200`;
- `object-fit: fill`;
- `object-position: 50% 50%`.

The proxy screenshot therefore contains both halves:

- red `40,000`;
- blue `40,000`.

The physical PDF preserves that **wrong proxy state**, not the source crop:

- red `48,620`;
- blue `48,646`;
- bytes `22,694`;
- SHA-256 `b30d220e42881bc23016f07e47d28fefbf4a9be98437ddca59db27cbe087788d`.

The resource report simultaneously remains clean: attempted `2`, loaded `2`, failed `0`, no omission/truncation/deadline. Therefore resource readiness is not sufficient evidence of raster visual fidelity when the secondary representation loses the admitted replaced-element geometry/crop state.

## 8. Duplicate/root-cause reconciliation

No new P-code is allocated.

Fresh Registry authority and historical family evidence reconcile this result to existing **P1-187 ACTIVE**:

- P1-187 already owns required rendered-state preservation in the flattened iframe proxy under explicit bounded materialization;
- historical responsive/replaced-media evidence already identified replaced-media pixels/candidate/crop/intrinsic state as part of that same secondary-representation root;
- the fresh C08 fixture now provides current-source/current-Chrome physical proof specifically for ordinary raster `width`/`height`/`object-fit`/`object-position`, which the current flattened allowlist still omits.

Existing **P0-004 ACTIVE** remains the broader physical selected-copy consequence boundary, but the direct independent implementation root demonstrated here is P1-187. There is no separate C08-specific owner to create merely because a new CSS property combination reproduces the same flattened-representation incompleteness.

No owner status changes. P1-187 remains ACTIVE.

## 9. Architecture implication and recommended target state

The result reinforces the existing architecture direction: a flattened secondary representation cannot be treated as faithful merely because it clones markup and pins the image URL/currentSrc. It needs a bounded rendered-state contract for replaced elements.

For raster images, the target representation should preserve, at minimum where materially different from defaults:

- the admitted rendered content box / used dimensions;
- `object-fit`;
- `object-position`;
- intrinsic source dimensions/candidate identity needed to explain the crop;
- final proxy load/decode settlement;
- bounded diagnostics/receipt sufficient to compare admitted image state with the final renderer-owned representation.

The implementation must remain under existing P1-187/P0-064/P1-167 node/pixel/byte/time constraints rather than snapshotting arbitrary unbounded bitmaps by default. Where exact visual state cannot be materialized safely, the project should preserve the existing truthful-degradation principle instead of silently producing a different crop.

This tranche does **not** implement that target state; it establishes current evidence and owner reconciliation only.

## 10. Fresh restart classification

C08 advances from `NOT-TRIAGED / UNKNOWN` to:

**`L4-REVALIDATED / FINDING + POSITIVE CONTROLS (P1-187)`**

Freshly established boundary:

- ordinary top-document `cover-left`, `cover-right` and `contain` raster rendering physically pass;
- an admitted delayed ordinary image is awaited;
- an ordinary broken image is truthfully reported failed;
- same-origin flattened BODY representation loses stylesheet-owned image box/crop semantics and physically serializes the wrong crop/state -> **P1-187 ACTIVE**.

No new P-code is allocated. No P-owner status changes.

## 11. Non-claims and next coordinate

C08 does not claim exhaustive coverage of responsive `picture/srcset/currentSrc` candidate identity, density changes, animated raster frames, SVG/image resources, canvas, video, cross-origin frames, EXIF/orientation edge cases, color-management profiles or every image codec. Those mechanisms have separate sequential coordinates/evidence stacks.

The next genuinely unadvanced sequential coordinate after this C08 tranche is **C09 — Responsive images / picture/srcset/currentSrc**.

This evidence changes research coverage/provenance only:

- no product runtime change;
- no `RESEARCH_REGISTRY.md` owner/status/acceptance change;
- no manifest/version change;
- no `RELEASE_READINESS.md` change;
- no build/tag/GitHub Release;
- release remains **NOT READY**.
