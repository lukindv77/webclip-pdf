# Fresh full-restart C28 research — responsive/environment state

Date: 2026-09-02

Status: **accepted fresh L4 physical evidence** for C28. This is research evidence, not a release declaration. `RESEARCH_REGISTRY.md` remains the sole current P-owner/status authority.

## 1. Coordinate and contract boundary

C28 asks whether the selected PDF preserves the responsive/environment representation that belonged to the admitted source state, rather than allowing A4/paged rendering to select another breakpoint or orientation.

The current PDF fidelity contract is explicit:

- preparation must not select another responsive variant merely because of print/A4 geometry;
- admission may need source viewport width/height, orientation and relevant zoom/device-scale context;
- responsive/media-query state belongs to the admitted representation;
- after source representation is fixed, pagination/scaling may transform format geometry;
- `media: screen` alone is not proof that this requirement is satisfied.

C28 deliberately does **not** complete C29. Viewport units and container-query-dependent geometry remain the next separate coordinate.

Fresh canonical source:

- `main = 880256a7d6bfd612c3abdd5f11c0ffdd33190033`;
- exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- manifest remains `0.9.8`; release readiness remains NOT READY.

## 2. Fresh current-source inspection

The accepted harness fails closed unless the researched source still contains all of these production facts:

1. the service worker calls `Emulation.setEmulatedMedia({ media: 'screen' })` before PDF rendering;
2. `Page.printToPDF` is called with `landscape:false`, `scale:1`, `preferCSSPageSize:true` and background printing;
3. current print preparation injects `@page { size: A4; margin: 12mm; }`;
4. top `html/body` are normalized with `width:auto`, `min-width:0`, `max-width:none` and related print-flow overrides;
5. the source document diagnostics already record bounded `viewportWidth` and `viewportHeight`.

The last point corrects an exploratory hypothesis. The problem is **not** absence of all viewport metadata: the generated PDF request contains `meta.pageAnalysis.document.viewportWidth` and `viewportHeight`. The missing link is that those values are diagnostic metadata; the renderer path does not use them to freeze or materialize the admitted responsive representation before paged-media evaluation.

No corresponding admitted DPR/orientation/media-query representation receipt is consumed by the worker to control final responsive rendering.

## 3. Platform semantics and external comparison

External sources establish why the current behavior is expected from a paged renderer. C28 advancement itself rests on the exact-source Chrome evidence in section 4.

### 3.1 Media Queries: paged width is page-box width

CSS Media Queries defines the `width` media feature against the viewport for continuous media, but against the **page box** for paged media. Orientation likewise follows the output/page geometry relevant to the media query.

References:

- <https://www.w3.org/TR/mediaqueries-4/>
- <https://www.w3.org/TR/mediaqueries-5/>

Therefore an A4 portrait print can legitimately re-evaluate a source 1200×700 desktop/landscape page as narrow/portrait even when the emulated media type remains `screen`.

### 3.2 CDP media emulation is not a static responsive snapshot

Chrome DevTools Protocol documents `Emulation.setEmulatedMedia` as emulation of a media type and media features for CSS media queries. It does not state that selecting `media:'screen'` causes a paged `Page.printToPDF` renderer to use the original screen viewport as the page-box width/orientation.

Reference: <https://chromedevtools.github.io/devtools-protocol/tot/Emulation/>

The C28 matrix also tests an adjacent simple remediation hypothesis: adding test-only `width`, `height` and `orientation` media-feature overrides to `setEmulatedMedia`. Chrome 151 still rendered the A4 output as mobile/portrait. That approach is therefore rejected as sufficient remediation for this pipeline.

### 3.3 Puppeteer reflects the same media-type boundary

Puppeteer documents PDF generation as print rendering and exposes `emulateMediaType('screen')` when screen styles are desired. This distinguishes media type from the broader question of preserving source viewport-responsive representation during paged rendering.

Reference: <https://pptr.dev/api/puppeteer.page.pdf>

### 3.4 Comparable archival tooling

SingleFile exposes separate options around alternative-device styles and alternative-resolution images. User discussions show that removing alternative-device resources can materially change saved-page behavior, so configuration around responsive alternatives is treated as fidelity-sensitive rather than a trivial size optimization.

References:

- <https://github.com/gildas-lormeau/SingleFile/blob/master/src/ui/pages/help.html>
- <https://github.com/gildas-lormeau/SingleFile/discussions/1483>

This does not create a WebClip requirement. It is independent evidence that responsive/resource variant preservation is a recurring archival-capture problem.

The transferable architectural lesson is to capture the **rendered/admitted representation**, not to assume that preserving a media-type label is equivalent to preserving all responsive state.

## 4. Exact physical experiment

Accepted execution:

- workflow run `33623739974`;
- job `100226506745`;
- exact workflow head `4280a1b33c321bcff7de234ebb459c20dbe45e3b`;
- Google Chrome `151.0.7922.173`;
- conclusion **SUCCESS**;
- raw result SHA-256 `9715b5f36b39d9331302b815f7637ee12e286dd590d9090c5ac114991ac159d4`.

The synthetic fixture used mutually exclusive visual tokens for:

- desktop `min-width:1000px` versus mobile `max-width:800px`;
- landscape versus portrait;
- DPR2 versus DPR1;
- dark versus light color scheme;
- two-column versus single-column responsive layout;
- ordinary Include/Exclude/outside-scope controls.

The physical path uses the current WebClip guard prefix, `content.js` selection/download/prepare flow, current screen-media choice and production-shaped CDP `Page.printToPDF` options.

An earlier run `33623499118` is retained only as rejected harness-development evidence. It captured the same physical observations but failed because the harness incorrectly expected zero responsive metadata paths. Fresh inspection showed current `pageAnalysis` already records viewport width/height. That assertion was corrected without changing product semantics.

### 4.1 Native wide paged-media control

Source environment:

- viewport `1200×700`;
- DPR `2`;
- dark color scheme;
- source matches desktop + landscape + DPR2 + dark;
- source grid is two columns.

Even without WebClip selection filtering, production-shaped `media:'screen'` + A4 portrait `Page.printToPDF` physically contained:

- `C28_MOBILE_TOKEN` — present;
- `C28_PORTRAIT_TOKEN` — present;
- `C28_DESKTOP_TOKEN` — absent;
- `C28_LANDSCAPE_TOKEN` — absent;
- DPR2 — present;
- dark scheme — present.

This proves the width/orientation drift is a paged-renderer representation issue rather than a consequence of WebClip Include/Exclude filtering alone.

### 4.2 Current WebClip wide finding

The actual WebClip path admitted the same `1200×700 / DPR2 / dark` source. Immediately before printing, both pre-product and post-product `beforeprint` observers still reported:

- `innerWidth=1200`;
- `innerHeight=700`;
- desktop=true;
- landscape=true;
- DPR2=true;
- dark=true;
- two-column computed grid.

The physical selected PDF nevertheless contained the **mobile + portrait** variants and omitted the desktop + landscape variants. DPR2 and dark remained correct. Include boundaries also remained correct: selected content was present while Exclude and outside content were absent.

PDF SHA-256: `ccc1d17c89af9b16981b736b86eda1e57e9a0b94f7fc0ff554d46d3532933744`.

The request contained diagnostic `viewportWidth` and `viewportHeight`, demonstrating that recording two dimensions without tying them to final renderer representation does not prevent the drift.

### 4.3 Simple media-feature override is rejected

The harness additionally passed test-only emulated media features for the source width, height and landscape orientation while retaining the normal production-shaped A4 print.

The physical PDF still contained mobile + portrait and omitted desktop + landscape. PDF SHA-256: `299b2c050f516b89c0dafb67f9df80cfd3b30d259ad1375d875ab98873db4eb6`.

Therefore a simple `setEmulatedMedia.features` patch is not accepted as an architecture solution.

### 4.4 Admission-style static causal control

Before WebClip preparation, the harness captured a bounded test-only receipt of the fixture's **used/computed responsive state** for the selected representation. After current preparation, it materialized those admitted values inline before the same A4 renderer ran.

The physical PDF then contained:

- desktop — present;
- landscape — present;
- DPR2 — present;
- dark — present;
- mobile/portrait/DPR1/light — absent;
- Exclude/outside — absent.

PDF SHA-256: `d67094abda4bb056d53771e14fdb82ae6d12ca2b9f1ca4594d9a6ca060d559d4` in the rejected-development execution and an equivalent accepted-run result under the same causal discriminator.

This is a causal architecture control only. It does not claim that copying a small fixed list of computed properties is a complete production solution.

### 4.5 Narrow positive control

A source `700×1000`, DPR1, light environment already matched mobile + portrait. The current WebClip physical PDF preserved mobile + portrait + DPR1 + light and correctly omitted desktop/landscape/DPR2/dark, Exclude and outside content.

Accepted-run PDF SHA-256: `0480da52f78177c746e6eac2530b0f701534aea2a1c1e986ec3102a710898b81`.

This separates the failure from a generic inability to print media-query content: the defect appears when paged geometry selects a different responsive branch than the admitted source.

### 4.6 DPR and color-scheme positive controls

In the wide current path, DPR2 and dark remained selected in the physical PDF even while width/orientation flipped. In the narrow control, DPR1 and light remained selected.

C28 therefore does **not** claim that every environmental media feature is lost. The fresh failure is specifically proven for width/orientation responsive state under current A4 pagination; other environment features need evidence rather than generalization.

### 4.7 Same-origin BODY flattening positive/parity control

A selected same-origin child BODY had a `1100×620` source viewport and matched desktop + landscape + DPR2 + dark. Current BODY flattening produced the top-document proxy after source computed styles had already been resolved/copied.

The physical selected PDF retained desktop + landscape + DPR2 + dark and omitted mobile/portrait, Exclude and top outside content. PDF SHA-256: `49fc2ba391f3b5d8691bf735b775772373669c0c80b65f54ec3eeb0b2edc9422`.

This is important root-cause separation: C28 does not freshly revalidate P1-187. In this bounded case the secondary representation actually demonstrates the architecture property needed by the top-document path — materialized used state can survive paged-media re-evaluation.

## 5. Root-cause and ownership reconciliation

No new P-code is warranted.

- **P0-070 ACTIVE** is primary: the save pipeline must remain bound to the admitted full-document/render generation. The current path records viewport dimensions diagnostically but allows a later paged renderer to select a different responsive width/orientation representation.
- **P0-004 ACTIVE** owns the physical selected-copy fidelity consequence: selected content is rendered under materially different page-owned responsive rules.
- **P0-075** is not needed for this C28 root because the proven drift occurs even in the native/no-WebClip-control control and is not caused by page-hosted extension UI interaction.
- **P1-187** is not a fresh C28 finding; same-origin flattening is a positive control here.
- **P2-007 BACKLOG** remains architecture context for future multiple capture/output modes, not the current owner of this defect.

Fresh C28 classification:

**`L4-REVALIDATED / FINDING + POSITIVE/NARROW/DPR/SCHEME/FRAME/CAUSAL CONTROLS (P0-070, P0-004)`**

## 6. Architecture direction

The robust target is a two-stage pipeline:

`admitted source responsive state -> extension-owned static/materialized representation -> pagination/scaling -> PDF`

rather than:

`live source -> A4 paged media-query re-evaluation -> different responsive state -> PDF`.

The admission receipt should be generation-bound and sufficient to prove the responsive representation that was actually selected. At minimum the architecture must account for source viewport dimensions/orientation/DPR and materially relevant media-query/resource state, but metadata alone is insufficient.

The renderer input should materialize the admitted selected representation before page-box width/orientation can cause another breakpoint selection. Candidate implementation approaches include a composed static clone/representation with bounded used-style and resource identity capture, or another renderer-input mechanism that freezes the responsive branch while still allowing later uniform scaling and pagination.

The implementation should **not** attempt to solve C28 by hardcoding every media query or by assuming CDP `media:'screen'`/feature overrides force paged media to use the source viewport. Where representation closure exceeds node/style/resource budgets, the operation must truthfully degrade rather than silently save a different responsive generation.

C29 will separately test viewport-unit and container-query geometry. Its outcome may refine the eventual common static-representation architecture, but C28 does not pre-claim it.

## 7. Non-actions and next coordinate

This tranche does not change runtime source, Registry wording/status, manifest/version, build/tag/GitHub Release, or release readiness.

C28 advances from `NOT-TRIAGED / UNKNOWN` to the classification above. **C29 — Viewport units / container-query dependent geometry** is the next sequential coordinate.
