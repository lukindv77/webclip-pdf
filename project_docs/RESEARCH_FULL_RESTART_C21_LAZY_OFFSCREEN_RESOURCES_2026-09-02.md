# WebClip — fresh full-project research — C21 Lazy/offscreen resources already belonging to content — 2026-09-02

Date: 2026-09-02
Canonical source baseline: `c7f0416c356c7c6cca787bffcee00f68312ada4e`
Exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`
Scope: focused fresh-restart coordinate **C21 — Lazy/offscreen resources already belonging to content**.

## Result

**C21: `L4-REVALIDATED / FINDING + POSITIVE/NATIVE/CUSTOM/FRAME/SETTLED/CAUSAL CONTROLS (P1-003)`.**

Fresh exact-source Chrome evidence demonstrates a useful current positive envelope: WebClip successfully prepares and physically prints far-offscreen native `IMG[loading=lazy]`, `IMG[data-src]`, `IMG[data-srcset]`, and a same-origin-frame native lazy image without auto-scrolling the live page.

The same matrix proves a narrower current failure for an already-owned responsive lazy resource: a far-offscreen `<picture><source data-srcset="…">` target URL is actually requested and the resource report remains clean, but the owning `<img>` never switches from its transparent fallback `currentSrc`; the expected visual resource is absent from the physical PDF even after an additional 2.5 s settlement wait. Test-only final-IMG materialization of that already-fetched candidate immediately restores the expected physical image.

This is a fresh revalidation of **P1-003 ACTIVE**: the preparation/readiness contract must describe the resource actually selected by the final renderer representation, not merely prove that a candidate URL loaded. No new P-code is allocated. Runtime, manifest/version, release readiness, build/tag/Release and Registry status are unchanged.

## 1. Bounded question

C21 asks whether already-existing resources that belong to admitted selected content but have not yet loaded because they are offscreen/lazy become ready before the physical PDF cut, without WebClip auto-scrolling the page to create new logical content.

The focused matrix covers:

1. native `loading="lazy"` image far below the viewport;
2. common custom `data-src` image;
3. IMG `data-srcset` image;
4. `<picture><source data-srcset>` with an existing IMG fallback;
5. native lazy image inside an accessible same-origin selected frame;
6. additional settlement and causal final-resource controls for the failing picture case.

This tranche does not re-cover every visual-resource vocabulary already exercised by C06–C14 (border-image, pseudo resources, unicode-range fonts, SVG `<image>`, flattened renderer-owned state), nor does it auto-scroll to create content (C22) or reconstruct virtualized history (C23/P1-230).

## 2. Fresh current-source inspection

Current `content.js` retains the P1-003 bounded resource-preparation envelope:

- common deadline: `15_000ms`;
- max resource tasks: `500`;
- concurrency: `8`;
- per-item timeout: `5_000ms`;
- selected DOM scan cap: `5_000` elements;
- bounded persisted failure report.

`prefetchIncludedResources()` starts from `includedElementsBounded()` and then performs a synchronous lazy-source promotion pass before task execution.

For selected `SOURCE[data-srcset]`, current code copies the bounded value into the real `srcset` attribute when a valid first candidate exists.

For selected `IMG` elements, current code:

- changes `loading="lazy"` to `loading="eager"` temporarily;
- copies safe `data-src` into `src`;
- copies bounded `data-srcset` into `srcset`;
- yields one task turn so `currentSrc` and computed styles can react to the promoted attributes.

The image readiness path waits for connected DOM images to complete and verifies nonzero `naturalWidth`; generic candidate URLs may also be probed through an Image object under the same deadline.

This is a materially stronger mechanism than relying on `Page.printToPDF` to opportunistically load whatever it encounters. However, the fresh picture finding below shows an important distinction: loading a candidate URL is not proof that the actual owning IMG selected that candidate as `currentSrc` in the final representation.

## 3. Current product contract

Current `USER_REQUIREMENTS.md` explicitly requires bounded preparation of resources already related to selected DOM/CSS, including lazy images and `data-src` / `data-srcset`, without turning WebClip into an arbitrary crawler.

`WEBCLIP_PDF_FIDELITY_CONTRACT.md` also requires already-existing offscreen resources belonging to admitted selected content to remain inside the static PDF completeness envelope, subject to bounded truthful degradation.

Therefore C21 tests only already-owned resource URLs represented by current DOM attributes. It does not require WebClip to infer arbitrary URLs hidden only in page JavaScript state or to synthesize application-owned scrolling/clicking.

## 4. Fresh exact-source physical evidence

Accepted execution:

- workflow: `Research C21 lazy offscreen resources`;
- run: `33602471295`;
- job: `100159038407`;
- exact workflow head: `aa3d291b83f5727e5f3db15d9c0052ccc294feab`;
- browser: Google Chrome `151.0.7922.173`;
- conclusion: **SUCCESS**;
- exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- primary raw result SHA-256: `3d78c8ba76617536baea85c765106049c61378fdcc7640117a371d76da43d614`;
- focused picture control SHA-256: `93f688c8da66f853463bd6928ef5df5fb8082c8b1822ecc972ae0cd7bb27cfbd`.

Durable reproduction harnesses:

- `project_tools/research_c21_lazy_offscreen_resources.py`;
- `project_tools/research_c21_picture_datasrcset_control.py`.

Each fixture places the resource roughly 12,000 CSS px below the viewport so the source page does not need user or WebClip scrolling. Delayed synthetic image responses take about 1.2 seconds. The harness records source image state and request counts before preparation, then drives actual `content.js` selection/download preparation, physically prints with Chrome and raster-checks expected color in the PDF. Explicit Exclude and an unselected outside control must remain absent.

### 4.1 Native lazy IMG — positive control

Before preparation:

- `loading = lazy`;
- `complete = false`;
- `naturalWidth = 0`;
- `currentSrc = ""`;
- asset request count `0`.

After current WebClip preparation:

- `loading = eager`;
- request count `1`;
- `naturalWidth = 220`, `naturalHeight = 140`;
- `currentSrc` is the expected delayed red SVG;
- resource report: attempted `2`, loaded `2`, failed `0`, no scan/deadline truncation;
- physical PDF: `17,056` red pixels, 12 pages;
- PDF SHA-256 `c7c7395b73f7f85aa3a7bb89e297b3212da26340a8663ed6a43334facf4ec561`.

This proves the current explicit lazy→eager promotion materially works before the physical cut; the result is not merely browser print opportunism.

### 4.2 `IMG[data-src]` — positive control

Before preparation the selected offscreen image has no effective source, no request and zero natural size.

Current preparation copies `data-src` into `src`, initiates one request and waits for the image. After preparation `currentSrc` is the expected green SVG and natural size is `220×140`.

Physical PDF contains `17,056` green pixels; Exclude/outside controls remain absent. Resource report is clean (`2/2`, failed `0`). PDF SHA-256: `d51b9bd6345abfd6f74651c5e9517ed52bbd7f538cd323bbdc23104ec181badf`.

### 4.3 `IMG[data-srcset]` — positive control

Before preparation:

- `loading=lazy`;
- no `currentSrc`;
- no `srcset` attribute;
- no request.

After preparation:

- `loading=eager`;
- promoted `srcset` contains the expected blue candidate;
- `currentSrc` is that candidate;
- natural size `220×140`;
- one request;
- clean resource report.

Physical PDF contains `17,056` blue pixels. PDF SHA-256: `8e1b5b095822ea0ae3e5ac9cbe3a5564b9ce23befd1d6ad0538a34efdd2d1d30`.

### 4.4 Same-origin-frame native lazy IMG — positive frame control

A selected non-BODY subtree inside an accessible same-origin frame contains a far-offscreen native lazy image.

Before preparation the image has no `currentSrc`, zero natural size and zero requests. Current WebClip preparation promotes it to eager and waits for the delayed purple asset.

After preparation:

- `currentSrc` is the expected purple URL;
- natural size `220×140`;
- request count `1`;
- resource report attempted `2`, loaded `2`, failed `0`;
- physical PDF contains `17,325` purple pixels over 14 pages;
- PDF SHA-256 `9b1c71dc8b4cbbc7f4a2dc97026a8128667f0a2e231d7dcbc007f59595a8b4ec`.

This rejects a blanket claim that already-existing lazy images fail merely because they are offscreen or inside an accessible same-origin frame.

## 5. Fresh finding — `<picture><source data-srcset>` can be reported loaded without becoming the renderer-selected image

The failing top-document fixture contains:

- a `<picture>`;
- `<source data-srcset="EXPECTED_ORANGE.svg 1x">`;
- an `IMG[loading=lazy]` with an existing transparent 1×1 data-URI fallback;
- the whole picture roughly 12,000 CSS px below the viewport.

Before preparation the IMG has no `currentSrc`, natural size zero and the orange asset has not been requested.

Current preparation performs its documented promotion and the server sees exactly one request for the orange target. Preparation spends about 1.42 seconds, matching the delayed resource response. The resource report nevertheless finishes clean:

- attempted `2`;
- loaded `2`;
- failed `0`;
- no scan truncation;
- no deadline exceeded.

But after preparation the actual owning IMG reports:

- `currentSrc =` the transparent fallback data URI;
- natural size `1×1`;
- no IMG `srcset`;
- `loading=eager`.

The physical PDF contains **0 orange pixels**. PDF SHA-256: `ff8b861bf8bbc762c2ca70f7fd1e795ed77675d15bab63b78307a8aade7050b2`.

This is not a network failure: the expected orange URL was requested and completed before preparation returned.

### 5.1 Additional settlement control rejects a merely late picture-selection hypothesis

The focused control repeats the same prepared page and then waits an additional 2.5 seconds with no WebClip/page mutation.

After the extra wait the IMG still reports the transparent fallback as `currentSrc` and natural size `1×1`.

A second physical PDF still contains **0 orange pixels**. PDF SHA-256: `6a20d23c79003ca72daa1f898e8f9231b7701bb20568466b4a6aa0b245777bdb`.

Therefore the accepted failure is not simply “one event-loop turn was slightly too short”.

### 5.2 Causal final-IMG materialization restores the already-fetched resource

On the same prepared page, the test-only causal control:

1. removes the responsive `<source>` from the test representation;
2. assigns the already-known orange candidate URL directly to the final IMG `src`;
3. keeps it eager and awaits decode;
4. physically prints again.

The IMG then reports the expected HTTP URL as `currentSrc`, natural size `220×140`, and the physical PDF contains `17,056` orange pixels. Exclude and outside controls remain absent.

Causal PDF SHA-256: `4459d5f6171d402ea82ac442db100ae920cb4442c5d81ef2cccea2b40ce94566`.

This rules out an invalid/unprintable asset and isolates the failure to final picture/resource selection/materialization.

## 6. Why the clean resource report is not enough

The current preparation machinery can successfully fetch/probe a URL that belongs to a promoted `<source data-srcset>` while the actual renderer-owned IMG remains on a different fallback candidate.

For the product contract, `loaded URL` and `final selected visual resource` are different facts.

A truthful readiness model therefore needs convergence on the final representation, for example by verifying the owning image candidate (`currentSrc`/decoded state) after responsive-source promotion or by materializing the admitted final candidate into a representation whose resource identity is explicit. The architecture must still remain bounded and must not mutate arbitrary page application logic.

## 7. Duplicate / root-cause reconciliation

### P1-003 — primary current owner

Current Registry wording for **P1-003 ACTIVE** requires PDF renderer-resource preparation to cover the actual selected visual resource graph under bounded deadlines and explicitly states that successful print completion is not resource-readiness proof.

The C21 picture failure is directly inside that invariant:

- target resource URL is known and fetched;
- bounded report says loaded/clean;
- actual final renderer-selected image remains the fallback;
- physical PDF therefore lacks the intended selected visual resource;
- causal final-resource materialization restores it.

No new P-code is warranted and P1-003 wording/status already covers the root.

### C09 / responsive-image owners are adjacent, not duplicated

C09 already established that responsive image selection/currentSrc can change across representation boundaries and that a final representation may introduce a candidate after an earlier convergence barrier. Those results are useful duplicate/root-cause context.

C21 adds a distinct fresh trigger shape — ordinary top-document offscreen lazy `<source data-srcset>` promotion — but not a distinct owner. P0-070/P0-075 remain supporting generation/isolation context; P1-187 is not implicated because this failing fixture is top-document and not a flattened secondary representation.

### P1-167 / C38 remain separate bounded-work ownership

The fresh matrix remains far below scan/task/deadline bounds and has no truncation. It therefore does not revalidate the P1-167 aggregate-computation issue or the later C38 budget coordinate.

### C22/C23/P1-230 remain out of scope

No fixture creates new logical items on scroll and no virtualized nodes are recycled. All resource-owning elements exist before capture. The run performs no live-page auto-scroll.

## 8. External standards / browser / comparable-product research

External material is architecture and failure-mode input only; the C21 verdict is controlled by fresh WebClip source plus the exact physical matrix.

### HTML Standard — lazy→eager has explicit resumption semantics

The current HTML Standard defines `loading` as a lazy-loading policy. When an IMG's loading state is changed to Eager, the user agent must run its stored lazy-load resumption steps if present.

References:

- https://html.spec.whatwg.org/multipage/embedded-content.html
- https://html.spec.whatwg.org/multipage/urls-and-fetching.html

This supports WebClip's current native-lazy strategy and the positive physical result. It does not prove custom `data-src`/responsive convergence automatically.

### Chromium print itself has a lazy-image preparation path, but that cannot replace WebClip's contract

Chromium issue `539765586` (2026-07-28) describes a crash in the printing preparation path where `Document::WillPrintSoon()` calls `LazyLoadMediaObserver::LoadAllImagesAndBlockLoadEvent()`.

Reference:

- https://issues.chromium.org/issues/539765586

This confirms that Chromium itself has print-time lazy-load behavior, and also shows it is version-sensitive code. The C21 positive controls are stronger for WebClip because the delayed images were already requested and decoded during WebClip preparation before the physical print call.

### SingleFile treats deferred-image recovery as explicit best-effort behavior

Current SingleFile help documents deferred-image saving options and explicitly says the feature does its best effort and is not guaranteed on all sites. It offers viewport zoom-out and optional synthetic scroll-event behavior as compatibility tools; a user report for Instagram confirms zoom-out can recover otherwise missing deferred images.

References:

- https://github.com/gildas-lormeau/SingleFile/blob/master/src/ui/pages/help.html
- https://github.com/gildas-lormeau/SingleFile/discussions/1398

The relevant architectural lesson is not to copy viewport manipulation. It is that lazy-resource capture needs an explicit contract and truthful failure semantics. WebClip's current policy intentionally avoids auto-scrolling the live page to create new logical content.

## 9. Architecture implications

C21 supports keeping the current bounded promotion strategy for resource identities already represented in admitted DOM attributes:

- native lazy IMG → eager;
- safe `data-src` → `src`;
- bounded `data-srcset` → `srcset`;
- frame-local positive parity where the same exact resource semantics are supported.

But the final readiness decision must move from **URL/task completion** to **final representation convergence**.

A candidate P1-003 target state should:

1. distinguish candidate URL load from owning-element final selection;
2. after responsive-source promotion, verify the final IMG has converged to a decoded intended candidate or record truthful unresolved/degraded state;
3. repeat the check after transformations that can create/reselect resources;
4. preserve bounded task/scan/time limits and avoid arbitrary crawling;
5. keep C22/C23 dynamic-content creation outside C21;
6. retain per-frame parity and explicit degraded diagnostics when a final candidate cannot be safely resolved.

The C21 evidence does not by itself prescribe rewriting every `<picture>` into a frozen IMG. C09 already shows responsive-state fidelity trade-offs; a final implementation should freeze only the admitted resource identity required by the chosen faithful-static representation and preserve appropriate provenance.

## 10. Pipeline mapping

- **B1 User Intent:** selected content includes resource-owning elements already present in DOM.
- **B2 Admission:** no new logical content is admitted through scrolling.
- **B3 Capture:** lazy/custom source attributes and responsive candidate identity are observed from current selected DOM.
- **B4 Static Materialization:** native/data-src/data-srcset cases converge; picture/source case fetches the candidate but fails to make it final IMG state.
- **B5 Renderer:** physical Chrome receives either the intended image or the retained transparent fallback.
- **B6 Physical Artifact:** positive cases contain expected colored resource; picture case has 0 expected pixels; causal control restores them.
- **B7–B9:** not independently exercised by this focused tranche.

## 11. Verdict and next checkpoint

Fresh C21 verdict:

**`L4-REVALIDATED / FINDING + POSITIVE/NATIVE/CUSTOM/FRAME/SETTLED/CAUSAL CONTROLS (P1-003)`**.

Current WebClip correctly prepares the tested ordinary native lazy, `data-src`, IMG `data-srcset` and same-origin-frame lazy resources before print. It does not yet prove final renderer-resource convergence for `<picture><source data-srcset>`: the target URL can be fetched and reported clean while the actual IMG and physical PDF retain the fallback. Additional settlement does not fix it; causal final-IMG materialization does.

Required durable integration:

- advance the C21 restart row to this classification;
- retain this evidence and both reproduction harnesses;
- do not allocate or modify a P-code;
- leave runtime/product code unchanged;
- keep release readiness `NOT READY` and manifest/runtime `0.9.8`.

After C21 integration, the next sequential coordinate is **C22 — Scroll-triggered new logical content / user-reached max boundary**.
