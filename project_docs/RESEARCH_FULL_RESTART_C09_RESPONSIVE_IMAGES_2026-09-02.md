# WebClip — fresh full-restart C09 — responsive images / `picture` / `srcset` / `currentSrc`

Date: 2026-09-02

Canonical source baseline: `da0775f0a06e58b12aabe53bfad80c9a76052c9c`.

Current source binding:

- `content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- research branch: `research/full-restart-c09-responsive-images-2026-09-02`;
- reproducible project harness: `project_tools/research_c09_responsive_images.py`.

Research outcome: **`L4-REVALIDATED / FINDING + POSITIVE/NEGATIVE/CAUSAL CONTROLS`**.

No runtime source, `RESEARCH_REGISTRY.md`, P-owner status, manifest version, build, tag or GitHub Release is changed by this tranche.

## 1. Scope and termination envelope

C09 examines whether responsive image identity observed in the admitted selected page remains the same through current WebClip preparation, secondary representation, Chromium rendering and the physical PDF.

Relevant pipeline boundaries:

- **B1 User Intent** — user intends to preserve the artwork actually visible in the selected content;
- **B2 Admission** — source frame/document environment selects a concrete `currentSrc`;
- **B3 Capture** — WebClip reads resource readiness and `currentSrc`;
- **B4 Static Materialization** — selected iframe geometry may be normalized and same-origin BODY may be flattened into the top document;
- **B5 Renderer** — Chromium re-evaluates `srcset` / `<picture><source>` under the resulting environment;
- **B6 Physical Artifact** — PDF raster is inspected for the actual red/blue/blank result;
- **B7–B9** are affected by the already-created wrong bytes, but this tranche does not separately exercise destination settlement, Journal or later reopening.

Required evidence under `RESEARCH_COVERAGE_CAMPAIGN_POLICY.md`: L1 source proof + L3 managed Chromium + L4 physical PDF, with positive, negative and causal controls.

## 2. Fresh current-source inspection

Fresh inspection of exact `main = da0775f0a06e58b12aabe53bfad80c9a76052c9c` establishes the current ordering:

1. `meta.resourceReport = await prefetchIncludedResources();`;
2. frame preparation later applies selected-frame print geometry;
3. image wrappers derive their URL from the then-current `image.currentSrc || image.src`;
4. `stabilizeSelectedFramePrintHeights('prepared')` runs;
5. `flattenSelectedSameOriginBodyFramesForPrint()` runs after resource convergence.

The selected iframe flow still applies `width:100% !important` / `max-width:100% !important`. The measurement path can temporarily narrow a same-origin frame and then restores it to `100%`.

For flattened same-origin BODY, current `copyFrameCloneUrlState(source, target)` freezes an `<img>` by copying `source.currentSrc || source.src` into `target.src` and removing the IMG's `srcset`, but it does **not** neutralize responsive `<picture><source media/srcset>` descendants. A cloned `<source>` therefore remains browser-owned responsive selection input after the subtree is mounted in the top document.

`prefetchIncludedResources()` waits the responsive IMG candidate that is current **before** frame normalization/flattening. It has no second convergence barrier after the flattened proxy introduces or reselects another candidate.

This is source evidence only; browser candidate behavior and physical bytes are proven separately below.

## 3. Fresh external research input

External sources were used only to form hypotheses and compare architecture; they are not WebClip requirements by themselves.

### Standards / browser semantics

- MDN `HTMLImageElement.currentSrc`: https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/currentSrc
  - `currentSrc` is the URL currently selected by the browser;
  - its value does not prove successful loading.
- MDN `HTMLImageElement.sizes`: https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/sizes
- MDN responsive images: https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images
  - candidate selection depends on slot size / viewport, DPR and media conditions.

These sources support the hypothesis that WebClip-induced frame/document environment changes can change browser-owned responsive candidate selection.

### Comparable open-source / vendor approaches and issues

- SingleFile help: https://github.com/gildas-lormeau/SingleFile/blob/master/src/ui/pages/help.html
- SingleFile discussion #1194: https://github.com/gildas-lormeau/SingleFile/discussions/1194
  - SingleFile exposes explicit treatment of alternative responsive images; keeping all alternatives versus pruning them is an intentional archival trade-off rather than an incidental browser side effect.
- Browsertrix Crawler issue #960: https://github.com/webrecorder/browsertrix-crawler/issues/960
  - real user report where `srcset` coverage depends on crawler window size/environment.
- Browsertrix Crawler issue #1128: https://github.com/webrecorder/browsertrix-crawler/issues/1128
  - 2026 report that a screenshot stage changes viewport to `1920x1080` and fails to restore it, so later capture occurs at the wrong environment. This is a close analogue to capture-induced responsive-state drift.
- GitLab SOSSE: https://gitlab.com/biolds1/sosse
  - browser-rendered archiving of dynamic content with downloaded assets.
- GitLab ArchiveBox mirror: https://gitlab.com/qingbeidushu/ArchiveBox-cn/-/tree/main
  - illustrates a multi-representation archival architecture: SingleFile, headless-Chrome PDF, screenshot, DOM/WARC outputs rather than assuming one renderer representation solves all fidelity concerns.

### User experience

- DataHoarder SingleFile / Save Page WE comparison: https://www.reddit.com/r/DataHoarder/comments/1inss7h/save_page_we_vs_singlefile_list/

The useful signal is the recurring user trade-off between higher-fidelity capture and larger/more expensive saved representations. It does not justify silently reselecting responsive artwork: fidelity/size trade-offs should be explicit product semantics.

## 4. Local-first physical evidence

The project policy now prefers local tools where they can truthfully prove the claim. The current tool environment contains Chromium and the required Playwright/PyMuPDF/Pillow stack, so no research GitHub Actions run was required.

Local browser:

- Chromium `144.0.7559.96` on Debian;
- headless managed Chromium;
- CDP `Emulation.setEmulatedMedia {media:'screen'}` followed by `Page.printToPDF`;
- deterministic local HTTP fixture serving red and blue SVG candidates;
- PDF bytes rasterized and counted for red/blue pixels.

The local private repository checkout was not mounted in the browser container. Therefore exact-source L1 binding was performed independently through GitHub on `main`/blob above, while the browser fixture executes the exact current IMG-copy semantics used by `copyFrameCloneUrlState`. The durable project harness contains the combined source-contract check plus these browser cases for reproduction from a normal checkout.

Local execution receipt:

- local probe SHA-256: `53c10ac4d2bd9410f907ba7bafe914d265f417c8fa7047c19228f3ecfa09f5ad`;
- machine result SHA-256: `bf9d4fce442436dc2ba65b19080cd44eb7a28f3045c24ff1e781edfa674b7901`.

Generated PDFs are not committed; their exact SHA-256 values and measured physical outcomes are retained below.

## 5. Physical controls and findings

### 5.1 Top-document ordinary `srcset` — positive control

Fixture:

- viewport 420 px, DPR 1;
- IMG candidates red `600w`, blue `1600w`;
- `sizes=400px`;
- no WebClip frame mutation.

Observed:

- admitted `currentSrc = red.svg`;
- after print `currentSrc = red.svg`;
- physical PDF red pixels `45000`, blue pixels `0`;
- PDF SHA-256 `c3ecc9ce115a31b4b984f5a6d396fe26c26160973a08c0b66ef24e272061f152`.

This rejects a generic hypothesis that forced screen-media PDF alone necessarily switches ordinary responsive images.

### 5.2 Live selected iframe width mutation — FINDING

Fixture:

- top viewport 1200 px, DPR 1;
- child iframe initially 420 px;
- child IMG uses `sizes=100vw`, red `600w`, blue `1600w`.

At admission:

- child `innerWidth = 420`;
- `currentSrc = red.svg`.

After the same selected-frame width normalization used by current WebClip:

- child `innerWidth = 1200`;
- `currentSrc = blue.svg`.

Physical PDF:

- red pixels `0`;
- blue pixels `116025`;
- PDF SHA-256 `55d2f8d0dd43b923ce9a37dd819903f7b8db08fd1579ce090984cf9db0a98491`.

The renderer is capable of printing either candidate; WebClip-shaped preparation changed the browser environment and therefore changed the artwork before the physical cut.

### 5.3 Density descriptor negative control

Fixture uses red `1x`, blue `2x`, DPR 1. The frame width changes 420 -> 1200 exactly as above.

Observed:

- red remains selected before and after width mutation;
- physical PDF red pixels `116025`, blue pixels `0`;
- PDF SHA-256 `5ac930ef0cfdcb827ab9863588cb4c73d5687592961e8c3edd6556cc57903f0c`.

This bounds the cause to responsive selection inputs actually affected by the changed environment; it is not arbitrary image corruption.

### 5.4 Plain IMG flattening — positive control

A plain responsive IMG is cloned using current product IMG semantics: admitted `currentSrc` is copied into `src` and IMG `srcset` is removed.

Observed:

- admitted red;
- flattened proxy red;
- physical PDF red pixels `45000`, blue `0`;
- PDF SHA-256 `442c7931a8f2304f03316192c5a4f8c0151d427e41d31411d35c6ca5fda24a24`.

This demonstrates that copying admitted IMG `currentSrc` can preserve the tested slot when no live `<picture><source>` can override it.

### 5.5 `<picture>` flattening reselects in the top document — FINDING

Fixture:

- child iframe width 420 px;
- `<picture>` contains `<source media="(min-width:600px)" srcset=blue>` plus fallback IMG red;
- child admission therefore selects red.

Current-product-shaped flattening copies the admitted IMG red `currentSrc` into cloned IMG `src`, but leaves the cloned `<source media/srcset>` present. Once mounted in the 1200 px top document:

- IMG `src` attribute remains red;
- browser `currentSrc` becomes blue;
- one responsive `<source>` remains active;
- physical PDF red pixels `0`, blue pixels `177310`;
- PDF SHA-256 `a40eb87a1207e793ad21c6845471bbc4f33c9388191aa1086004f5f36f4a32e1`.

This is a secondary-representation identity defect, not a generic Chromium inability.

### 5.6 Test-only frozen `<picture>` — causal control

Same fixture, except the test removes the cloned `<source>` before top-document mounting while keeping the copied admitted IMG URL.

Observed:

- proxy remains red;
- physical PDF red pixels `101250`, blue `0`;
- PDF SHA-256 `70132f0b26682f304c37a71aa15fbf22e3ded57241c040560ad31ecc5a6c8c15`.

This discriminates the root cause: later responsive re-selection in the new owner-document environment is necessary for the red -> blue failure.

### 5.7 New delayed proxy candidate after resource convergence — FINDING

Fixture:

- source child admits fully loaded red;
- flattened `<picture>` introduces a top-document blue candidate delayed by 2.5 s.

Immediately after proxy creation:

- proxy `currentSrc` is empty;
- `complete=false`, `naturalWidth=0`.

First physical cut:

- `Page.printToPDF` returns in `8.42 ms`;
- proxy is still unsettled immediately after print;
- physical PDF red pixels `0`, blue pixels `0`;
- PDF SHA-256 `d6419ff9ff9a5b888788fa9753d159ad04791848382e854b6fc69cc47c50d608`.

After the delayed candidate settles:

- `currentSrc = blue-delay.svg`;
- physical PDF blue pixels `177310`;
- PDF SHA-256 `727e78d2f23b371d93fc414555c965d6fcf9eaf4fa124098563da488e06c9eb9`.

Classification: `transitional-cut-before-new-candidate`.

This freshly proves that current ordering can introduce a final-representation image candidate after the only resource-readiness barrier, and Chromium print completion does not itself guarantee that new candidate has loaded.

## 6. Duplicate / root-cause reconciliation

`RESEARCH_REGISTRY.md` is the only current authority. Relevant owners remain ACTIVE.

Fresh C09 evidence maps to existing owners:

- **P0-075 ACTIVE** — the live host/frame is still a mutable control plane during preparation; WebClip-induced iframe geometry changes responsive browser state before isolation;
- **P0-070 ACTIVE** — save authority is not tied to one admitted renderer/image generation from admission through representation and physical bytes;
- **P0-004 ACTIVE** — the physical selected copy can contain different artwork or no artwork relative to the admitted view;
- **P1-187 ACTIVE** — flattened same-origin secondary representation does not preserve admitted responsive replaced-element state; cloned `<picture>` source selection is allowed to run in a different owner-document environment;
- **P1-003 ACTIVE** — final visual-resource convergence is performed before the final representation exists; the delayed test freshly proves a post-prefetch candidate can be missing from the immediate physical PDF;
- **P1-167 ACTIVE** is supporting for one shared bounded preparation/diagnostic budget and candidate lineage, but the C09 physical failure does not require a new status/owner split.

Historical responsive-image evidence was used only for duplicate/root-cause lookup and fixture design. Its final 56-block reconciliation already identified the same P1-003/P1-187/P0-075/P0-070/P0-004 ownership. The new campaign does not credit the old physical PASS/FINDING by itself; the owners above are advanced here only because current source inspection and fresh L3/L4 evidence independently reproduce the mechanisms.

**No new P-code is allocated. No owner status is changed.**

## 7. Rejected / bounded hypotheses

Fresh controls reject or bound several broader claims:

1. Ordinary top-document `srcset` does not generically change merely because PDF is printed with screen media.
2. Frame width mutation does not force every responsive candidate to change: the tested DPR-1 density case stays red.
3. Flattening does not inherently break every responsive IMG: the plain IMG path preserves admitted red when responsive alternatives are neutralized on the IMG itself.
4. The `<picture>` failure is causally tied to leaving `<source>` responsive selection live in the new top-document environment; removing those test-only alternatives preserves admitted red.
5. `Page.printToPDF` completion is not a reliable final-resource readiness barrier for a candidate introduced after preparation.

## 8. Architecture implications — hypotheses, not implementation mandate

External and fresh internal evidence supports the following weighted architecture direction:

1. **Admitted responsive slot identity should be explicit.** The representation needs to know which resource/art-direction choice the user actually saw, not only an arbitrary later valid `currentSrc`.
2. **Construct/freeze the actual printable representation before final resource convergence.** Waiting on the live source tree and then creating a new responsive proxy reverses the dependency order.
3. **Faithful-screen mode should not silently re-run art direction under a new owner-document/viewport.** If a future reader/reflow mode intentionally reselects responsive art, that should be a separate product contract rather than an accidental side effect.
4. **Pixels, readiness, generated image-link semantics and provenance should refer to one slot/generation.** Aggregate `attempted/loaded/failed` counts cannot prove candidate continuity.
5. **Do not solve this by indiscriminately fetching every alternative responsive resource.** SingleFile demonstrates that preserving/removing alternatives is a real archive size/fidelity trade-off; WebClip should choose behavior according to its PDF fidelity contract and bounded resource policy.

These are candidate architecture directions for the existing owners. This tranche does not change runtime.

## 9. C09 conclusion

C09 is terminal for the fresh restart at the required L3+L4 depth:

**`L4-REVALIDATED / FINDING + POSITIVE/NEGATIVE/CAUSAL CONTROLS (P0-004, P0-070, P0-075, P1-003, P1-187)`**.

The fresh evidence proves two independent current failure paths under one existing generation/representation/resource-authority cluster:

1. selected-frame geometry preparation can change live responsive `currentSrc` after admission;
2. flattened `<picture>` can reselect under top-document conditions and may introduce a new delayed candidate after the only convergence barrier, allowing a blank physical PDF before settlement.

No new P-code is warranted. The next sequential untriaged coordinate is **C10 — SVG visual state/resources**.