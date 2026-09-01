# Concurrent reconciliation — responsive image identity vs replaced-media fidelity — 2026-08-30

Canonical P-code status/owner authority remains exclusively in `RESEARCH_REGISTRY.md`. This file records the post-research reconciliation caused by concurrent PR #47 landing while PR #46 was in delivery. It changes no runtime source, registry status, manifest/version, build, tag or GitHub Release.

## Source state

- PR #46 original researched base: `32e9672542482ba2a58d90258750261af75c5576`.
- PR #46 original completed head: `b19c4739295ea5dd8c0761023478843cf45c6ab5`.
- Concurrent PR #47 merged to main as `ff6142135cb7103ed2b9f9a2bf3dd1dadd750454`.
- PR #47 changed exactly four responsive-image evidence docs and no runtime/registry/release artifacts.
- PR #47 post-merge Repository integrity run #143 completed SUCCESS.
- Safe two-parent integration checkpoint: `bb296a1f221e7d974ed7670524307d37e083b968` with PR #46 head and `ff614213...` as parents; tree is current main plus the four PR #46 evidence docs.

## Overlap now owned by PR #47 evidence

The following PR #46 observations are independent cross-validation but are no longer unique after PR #47:

- selected same-origin iframe width mutation can move responsive `currentSrc` from the user-admitted narrow candidate to a later wide candidate;
- width-descriptor `srcset/sizes`, implicit/default sizes and `<picture><source media>` reproduce the responsive candidate drift;
- stable DPR `1x/2x` is a negative control;
- cloned `<picture>` source selection can re-evaluate in the top-document width/height/orientation environment;
- a proxy-selected candidate introduced after source prefetch has no second readiness barrier and can print blank while pending;
- final image-link semantics can be derived from a post-normalization `currentSrc` rather than the admitted candidate.

PR #47 is the primary navigation evidence for those candidate-identity facts. PR #46 does not create a second root cause or P-code for them.

## Unique complementary evidence retained by PR #46

The completed responsive/replaced-media tranche extends beyond candidate identity with physical controls not present in PR #47:

1. **Replaced-element crop/geometry state**: current flattened style transfer omits `object-fit` and `object-position` and forces `height:auto`. A 200×200 `object-fit:cover; object-position:right` source became a 200×100 fill/center proxy. An isolated control preserving box + object-fit/object-position produced a byte-identical source PDF SHA.

2. **Already-decoded resource vs locator lifetime**: a source image backed by a Blob URL remained physically printable after `URL.revokeObjectURL()` because decoded renderer pixels still existed, while a new proxy dereferencing the same revoked URL had naturalWidth 0 and printed blank/broken state.

3. **Actual resource URL truncation**: `PDF_RESOURCE_URL_MAX_CHARS = 8192` is used not only for diagnostics/discovery but also to slice the actual flattened IMG `src`. A 266,106-character data-image URL rendered correctly in the source; current-like truncation physically destroyed the bitmap.

4. **Same URL, different resource generation**: with cache disabled/no-store, two requests to the exact same URL returned different controlled image bytes/intrinsic geometry. Source printed red landscape while the proxy printed blue portrait. Bare URL/currentSrc equality is therefore not an admitted-pixel receipt.

5. **Structural `<picture>` invalidation by WebClip helper DOM**: `wrapUnlinkedImagesForPdf()` moves a direct `<picture> > img` under a generated `<a>`. In the physical control this broke picture-source association: the PDF visually switched from blue to red fallback while generated `/URI` annotations still pointed to blue. PR #47 proves link drift from frame normalization; this is a separate helper-topology mechanism.

6. **Candidate intrinsic-ratio pagination**: child red 400×200 at 420 px rendered ~420×210 and produced one page; top-proxy blue 200×400 at 650 px rendered ~650×1300 and produced two pages. Responsive identity can therefore alter pagination, not just local image pixels.

7. **Owner-document/base resource provenance beyond HTML IMG**: an ordinary flattened HTML IMG remained a positive control because current code pins absolute `currentSrc`, while relative SVG `<image href>` and retained relative `<picture><source srcset>` re-resolved under the top document base and physically changed from child-red to top-blue.

8. **Direct top-document viewport-relative density contrast**: `sizes="50vh"` geometry expanded under paged layout while Chromium retained the previously selected 400w candidate; geometry and responsive candidate selection therefore need not advance together. Same currentSrc does not itself prove equivalent sampling density.

9. **Truthful admission/final-representation receipt**: diagnostics currently lack admitted/proxy currentSrc, intrinsic dimensions, object-fit/object-position, decoded-pixel identity, source/base provenance and final proxy resource settlement. The final acceptance boundary is visual/resource state continuity, not URL copying alone.

## Owner reconciliation

No new P-code and no canonical status change.

Primary complementary owners remain:

- **P1-187 ACTIVE** — flattened-frame rendered/replaced-media state, including crop/intrinsic state, decoded resource state and nested resource provenance;
- **P0-004 ACTIVE** — selected visual/layout/pagination fidelity;
- **P0-070 ACTIVE** — exact admitted renderer/resource generation rather than later locator dereference;
- **P1-003 ACTIVE** — readiness of the actual final representation resource graph.

Supporting:

- **P0-075 ACTIVE** — live/helper DOM preparation is not neutral;
- **P1-219 ACTIVE** — temporary image-wrapper structural rollback remains its existing root; `<picture>` semantic invalidation is supporting evidence;
- **P1-167 ACTIVE / P0-064 ACTIVE** — any stronger pixel/byte materialization requires preflight/shared bounds;
- **P2-007 BACKLOG** — faithful-current-view vs deliberate responsive reflow must be explicit mode semantics.

`P1-230` remains deliberately unallocated.

## Delivery rule after reconciliation

PR #46 is safe to deliver only after a new exact-head Repository integrity SUCCESS on a branch that contains `ff614213...` and after fresh TOCTOU confirms the remaining diff against current main is documentation-only. The earlier CI #141 on pre-#47 head is historical and is not sufficient for the integrated head.
