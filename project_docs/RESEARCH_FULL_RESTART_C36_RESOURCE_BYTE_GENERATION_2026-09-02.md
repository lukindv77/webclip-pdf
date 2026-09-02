# WebClip — fresh full-project research — C36 Same locator/URL, different resource bytes/generation — 2026-09-02

Date: 2026-09-02  
Canonical source baseline: `b6b008dceec0b787ca1283e6c822fcd5f3abddcb`  
Exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`  
Scope: fresh-restart coordinate **C36 — Same locator/URL, different resource bytes/generation**.

## Result

**C36: `L4-REVALIDATED / FINDING + POSITIVE/STABLE-IMG/SAME-URL/SRCSET/BACKGROUND/CACHE-EVICTION/FROZEN/CAUSAL CONTROLS (P0-070, P0-004; P1-003 supporting)`.**

Fresh exact-source physical Chrome evidence proves that one URL is not a sufficient identity for the visual resource generation admitted by the user.

A source image can display red bytes at admission under URL `U`; after browser HTTP-cache eviction, the server can provide green bytes at the exact same `U`. Current WebClip's temporary `data-srcset -> srcset` promotion can cause the owning IMG to resolve that same URL again and physically print the newer green generation. The DOM locator and `currentSrc` string remain the same while the pixels change from admitted red to saved green.

A CSS-background control demonstrates a different but equally important boundary: WebClip's background readiness probe can issue a second request and successfully fetch green bytes for the same URL while the live background/PDF continues using the earlier red generation. `resourceReport.loaded` therefore proves only that a URL task settled; it does not identify the byte generation actually rendered into the PDF.

A frozen admitted-byte representation using a data URL remains red after the server changes to green, proving the intended admission generation is physically printable when its bytes are made immutable.

No new P-code is allocated. The root maps to existing **P0-070 ACTIVE** exact save/render generation and **P0-004 ACTIVE** selected visual fidelity; **P1-003 ACTIVE** remains supporting because readiness is not resource-generation identity.

Runtime, `manifest.json`, Registry wording/status and release readiness are unchanged.

## 1. Contract boundary

The current PDF fidelity contract explicitly states that an identical URL is not proof of identical bytes/generation/pixels. C36 isolates that requirement from neighboring coordinates:

- C09 tests responsive candidate/currentSrc identity across representation geometry;
- C21 tests lazy/offscreen resource materialization/readiness;
- C34 tests animated-image temporal frame identity;
- C35 tests DOM mutation between admission and physical cut;
- C40 tests PDF/cache operation identity;
- **C36 tests the resource representation itself changing bytes while URL/locator remain stable**.

The focused fixture does not navigate/reload the document, change the selected DOM locator, change the resource URL, or rely on a page-side post-admission DOM mutation.

## 2. Fresh current-source inspection

Current `prefetchIncludedResources()` has two materially different image paths.

### 2.1 Existing DOM IMG readiness

For an IMG, WebClip resolves:

`element.currentSrc || element.getAttribute('src') || firstSrcsetUrl(...)`

and then waits through `waitForDomImage(element, deadlineAt)`.

If the IMG is already `complete` with `naturalWidth > 0`, that function returns success immediately. It does not fetch the URL again and does not compute/store a byte digest, ETag, decoded-generation identifier or raster fingerprint.

This is a useful current positive behavior for a stable already-decoded image: WebClip does not unnecessarily replace it merely because the server behind the URL could now return different bytes.

### 2.2 Lazy/srcset promotion can trigger new candidate selection

Before resource tasks run, WebClip temporarily promotes common lazy attributes:

- `data-src -> src`;
- `data-srcset -> srcset`;
- `loading=lazy -> eager`.

The code then yields one task turn so `currentSrc` can settle. If browser cache/resource state causes candidate selection to perform a new load, the same textual URL can now resolve to a newer server representation. Current provenance does not distinguish that byte generation from the admitted generation.

### 2.3 CSS-background readiness is a separate URL probe

For computed `background-image:url(...)`, current preparation creates a fresh `Image` object and assigns `probe.src = task.url`.

That proves the URL can load before the deadline. It does **not** prove that the page element's already-resolved background image, compositor resource or final PDF uses the same response bytes as the probe.

### 2.4 Current resource report has no representation validator

The durable/page metadata report records attempted/loaded/failed/limits/deadline and sanitized resource labels. Fresh source contains no byte hash, ETag/validator, response-generation receipt or final-renderer image identity tied to those task outcomes.

Therefore `loaded=1` is not equivalent to `the admitted bytes are the bytes rendered into PDF`.

## 3. External standards / comparable-engine research

External sources are architecture and failure-mode input only; fresh WebClip source plus physical Chrome evidence controls the verdict.

### HTTP representation semantics

RFC 9110 defines a resource representation separately from the URI identifying the resource. A resource can yield different selected representations over time while the URI remains unchanged.

Reference: https://www.rfc-editor.org/rfc/rfc9110.html

### Validators identify versions, not URLs

Current MDN conditional-request guidance describes validators such as ETag as identifiers for a particular resource version; strong validation is the mechanism used when byte-for-byte identity matters.

References:

- https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Conditional_requests
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/ETag

This is directly applicable to C36's architectural distinction: URL is resource identity, not necessarily representation-generation identity.

### Capture-engine comparison

Current snapDOM documentation resolves live image URLs and inlines fetched resources into data URLs, with explicit cache policies/invalidation. This is not automatically a WebClip requirement, but it demonstrates a common capture architecture: once exact resource bytes are fetched for a capture representation, the output can be decoupled from later server generations.

References:

- https://github.com/zumerlab/snapdom/blob/main/FEATURES.md
- https://github.com/zumerlab/snapdom/blob/main/CHANGELOG.md

The transferable lesson is representation ownership, not a mandate to adopt snapDOM.

## 4. Physical evidence

Accepted exact-source execution:

- workflow: `Research C36 resource byte generation`;
- run: `33658450070`;
- job: `100342779251`;
- exact workflow head: `c7ddbbd54b8c83d69b67f312a21a324a2bac211e`;
- browser: Google Chrome `152.0.7977.64`;
- conclusion: **SUCCESS**;
- exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- raw receipt commit: `b05278f13e6ea2ba296a59183a0d128c454111ea`;
- main-matrix result SHA-256: `0e364a58fc95ae41aa74f92c98d26c9272ce5fba029f7b2441f2b9c38932265e`;
- cache-eviction result SHA-256: `1d46d8ea5e36f042f1463d5f59944165f9123684dded7ee21272a6e86dd52257`.

Durable harnesses:

- `project_tools/research_c36_resource_byte_generation.py`;
- `project_tools/research_c36_cache_clear_control.py`.

The local deterministic server serves 240×160 SVGs at stable URLs. Red and green are different response bytes/ETags for the same path. The page is selected with actual current `content.js`; the server generation changes only after the red visual has been admitted by the test fixture. Physical PDF pixels are checked with PyMuPDF.

## 5. Main matrix — ordinary browser resource reuse

### 5.1 Stable decoded IMG — positive control

Admission:

- stable URL points to red bytes;
- screenshot contains ~21k red pixels;
- IMG is complete, natural width 240 and `currentSrc=U`.

Server is then changed to green at the same `U`.

Current WebClip preparation performs no second HTTP request for this already-decoded IMG. Physical PDF remains red (~21,480 red pixels, 0 green).

PDF SHA-256: `62b8b0c8cc70d24a124bc880e29cb588517709e401e161fd5618cd5a8b109357`.

This rejects the broad hypothesis that WebClip always refetches/replaces an already-decoded IMG simply because preparation runs.

### 5.2 Same-URL `data-srcset` without cache eviction — positive control

The IMG starts red with `src=U` and `data-srcset="U 1x"`. WebClip promotes the lazy attribute to real `srcset`, but the browser reuses its current resource in this ordinary cache state:

- no second request;
- textual `currentSrc` remains `U`;
- physical PDF stays red;
- clean resource report.

PDF SHA-256: `4a9832ed4b438bb0cc1d1e3ce3d7d37366a4fcd0429fe700bb8d046217a576bf`.

This demonstrates that promotion alone is not sufficient to reproduce generation drift; browser resource/cache state is part of the schedule.

### 5.3 CSS background without cache eviction — positive control

The selected element initially paints red from `background-image:url(U)`. After the origin changes to green, ordinary WebClip preparation produces a clean report and no second network request in this cache state. Physical PDF remains red.

PDF SHA-256: `adc098409086ef5390cac0eec50cb2900a1cceb1a7faeda8fd82d5e69731c744`.

### 5.4 Frozen admitted bytes — causal positive control

The exact red SVG bytes are represented as a data URL before preparation. The remote origin changes to green, but the static representation has no network dependency.

Physical PDF remains red (~21,480 red pixels, 0 green), with zero HTTP requests.

PDF SHA-256: `9d0a591a0a1718aef584892f9d67ff4bd95d5a9b2aaa0a2f5772f7eaf73b906a`.

This proves the admitted red resource generation is printable when it is made immutable.

## 6. Strong cache-eviction controls

After red admission, the test switches the origin to green and explicitly clears browser HTTP cache through CDP before current WebClip preparation. The page URL, selected locator and resource URL remain unchanged.

This is not proposed as a production operation. It is a causal mechanism that makes the latent same-URL multi-generation condition deterministic.

### 6.1 CSS background — URL readiness diverges from final rendered generation

Observed requests:

1. red response at admission;
2. green response after cache eviction during preparation.

Current resource report still says attempted 2 / loaded 2 / failed 0.

Yet physical PDF remains **red** (~21,480 red pixels, 0 green), SHA-256 `496dbdb48124356a5a9309d099b92da5a6b637b692313fcad947890934bd0b1d`.

Therefore the green probe response is not the resource generation rendered into the PDF. The report has no way to distinguish this from a case where green actually became final.

This directly supports **P1-003** as a readiness/provenance limitation: resource URL load success is not final renderer resource-generation proof.

### 6.2 Same-URL promoted `data-srcset` — admitted red becomes saved green

The stronger failure uses the same URL `U` for both original `src` and promoted `data-srcset`.

Admission:

- red response at `U`;
- red visual (~21k red pixels);
- IMG `currentSrc=U`.

After server generation becomes green and browser cache is cleared, current WebClip promotes `data-srcset` to `srcset`. Browser candidate resolution fetches `U` again and obtains the green representation.

Observed requests:

1. `U` -> red;
2. exact same `U` -> green.

After preparation the textual DOM identity is still:

- `src=U`;
- `srcset=U 1x`;
- `currentSrc=U`;
- natural width 240.

Those values cannot distinguish the two resource generations.

Physical PDF contains **green** (~21,480 green pixels, 0 red). PDF SHA-256:

`46a0e76673a5d5ecb3f2d5690f2d7a6dc41198fba515a7e965a8093ee1205874`.

This is the decisive C36 failure: identical URL/currentSrc/DOM locator does not preserve admitted resource bytes.

## 7. Owner / duplicate reconciliation

### P0-070 — primary generation owner

P0-070 requires exact full-document generation from command admission through physical PDF. Resource generation is part of the rendered document state when it changes selected pixels.

C36 shows a stable document/locator/URL can still cross a resource-generation boundary during WebClip preparation. The final PDF is therefore not guaranteed to represent the exact admitted visual generation merely because documentId, DOM locator and URL all match.

### P0-004 — physical visual-fidelity owner

The selected region was red at admission and green in the resulting PDF. This is a direct selected visual-fidelity mismatch, so P0-004 remains applicable to the physical consequence.

### P1-003 — supporting readiness/provenance owner

P1-003 already states that renderer-resource preparation must cover the actual selected visual resource graph and that `Page.printToPDF`/load completion is not readiness proof.

C36 refines that acceptance: successful loading of URL `U` is not enough when multiple byte generations of `U` exist. Final-resource readiness needs generation identity or an immutable representation.

### Not P0-023/P0-079/C40

No PDF retry cache is reused here and no old PDF bytes are adopted. The mismatch occurs **before initial PDF generation**, inside selected resource representation. C40 remains the separate PDF/cache identity coordinate.

### Not a new P-code

A new resource-generation owner would duplicate P0-070's exact generation and P0-004/P1-003's visual-resource acceptance. The existing owners already describe the root and required truthfulness.

## 8. Architecture implications

C36 does not imply that every resource must always be eagerly downloaded and hashed in production. It establishes the identity requirement.

A robust faithful-static representation needs, where resource generation materially affects selected output, one of:

- immutable admitted bytes/data URL/blob owned by the capture representation;
- a strong representation validator/digest tied to the admitted resource and verified at final materialization;
- a renderer-owned immutable snapshot/raster of the admitted pixels;
- explicit degraded/unknown truth when generation identity cannot be proven within budget/security constraints.

The representation should not treat `currentSrc===sameURL` or `resourceReport.loaded` as proof of same bytes.

Any solution must remain bounded under P1-167/P1-003 and must not become an arbitrary crawler.

## 9. Pipeline mapping

- **B1 User Intent:** selected visual scope contains existing image/background resource.
- **B2 Admission:** red resource generation is visibly admitted.
- **B3 Capture:** current source records URL/currentSrc/readiness but no byte-generation identity.
- **B4 Static Materialization:** ordinary cases reuse red; cache-evicted srcset case re-resolves same URL to green.
- **B5 Renderer:** Chrome consumes the final resolved generation available to the live representation.
- **B6 Physical Artifact:** decisive case changes admitted red pixels to saved green pixels.
- **B7–B9:** not independently exercised by this focused tranche.

## 10. Verdict / next checkpoint

Fresh C36 verdict:

**`L4-REVALIDATED / FINDING + POSITIVE/STABLE-IMG/SAME-URL/SRCSET/BACKGROUND/CACHE-EVICTION/FROZEN/CAUSAL CONTROLS (P0-070, P0-004; P1-003 supporting)`**.

No runtime or P-owner status transition occurs.

After integration, next sequential coordinate is **C37 — Failure / retry / rollback / convergence**.
