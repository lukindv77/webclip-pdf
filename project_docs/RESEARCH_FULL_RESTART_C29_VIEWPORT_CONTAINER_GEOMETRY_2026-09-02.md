# WebClip — fresh full-project research — C29 Viewport units / container-query dependent geometry — 2026-09-02

Date: 2026-09-02  
Canonical source baseline: `4508b7abce73366fd796c0d662f15d3bbb112df8`  
Exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`  
Scope: focused fresh-restart coordinate **C29 — Viewport units / container-query dependent geometry**.

## Result

**C29: `L4-REVALIDATED / FINDING + POSITIVE/DIRECT/ALIGNED/CONTAINER/FROZEN/CAUSAL CONTROLS (P0-070, P0-004)`.**

Fresh current-source Chrome evidence proves that the physical A4 renderer can reevaluate both viewport-relative used geometry and size-container-dependent presentation after admission even while live/beforeprint JavaScript continues to report the original screen geometry. The current WebClip physical result follows the paged/A4 geometry, not the admitted 1200×800 used geometry.

The decisive controls are:

- source/query state at 1200×800: `50vw = 600px`, percent query container ≈`937.6px`, `50cqw ≈ 458.8px`, query branch **wide**;
- current WebClip physical PDF: query branch **narrow** and scale-invariant physical geometry ratios matching a source that was already A4-aligned;
- explicit fixed `800px` query-container control remains **wide**, so the result is not a generic container-query failure;
- a test-only freeze of the admitted source used geometry into explicit pixel values preserves the **wide** branch and source-like scale-invariant ratios through the same A4 renderer.

No new P-code is allocated. The current root cause remains the already-owned gap between admitted rendered state and the representation/environment that produces the final PDF: **P0-070 ACTIVE** owns exact save/render generation, and **P0-004 ACTIVE** owns selected PDF visual/layout fidelity.

Runtime, manifest/version, Registry wording/status, release readiness and build/tag/Release state are unchanged.

## 1. Fresh GitHub change review before C29

The previous integrated research point in this conversation was C25 at `c5834ba0eb75fbf0ac1c637f42d7da1bff24b429`. Fresh GitHub `main` at C29 start was `4508b7abce73366fd796c0d662f15d3bbb112df8`.

The exact compare is three commits ahead and zero behind. The net change is ten research-only files:

- C26 detailed evidence + compact evidence + harness;
- C27 detailed evidence + compact evidence + harness;
- C28 detailed evidence + compact evidence + harness;
- the fresh-restart baseline row/checkpoint updates.

There are **no production runtime/source changes** in that interval. In particular the exact `content.js` blob remains `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`. C26–C28 therefore change the current research evidence/navigation state, not the implementation being measured by C29.

Fresh `main` had no open PRs or open issues. The post-C28 Repository Integrity run `33624516639` is SUCCESS on exact `4508b7abce73366fd796c0d662f15d3bbb112df8`.

The next sequential fresh-restart coordinate was therefore C29 rather than a recovery/delivery tail from C26–C28.

## 2. Current contract boundary

`WEBCLIP_PDF_FIDELITY_CONTRACT.md` requires the faithful-static PDF mode to preserve the admitted source responsive/environment state rather than silently selecting a different representation because the output is paged/A4. Pagination is allowed, but uncontrolled responsive/geometry substitution is not.

C28 freshly proved one adjacent dimension: physical A4 can select a different width/orientation responsive branch even with screen media emulation, while other environment dimensions such as DPR/color-scheme remain source-like.

C29 asks a narrower, independent renderer-geometry question:

1. Do viewport-relative lengths (`vw`/`vh`) retain their admitted used geometry through physical PDF generation?
2. Does a size query container whose width itself depends on the final layout retain its admitted container-query branch?
3. Do container-relative lengths (`cqw`) retain their admitted used value?
4. Can a query container whose size is explicitly fixed remain stable as a positive control?
5. Can source used geometry be materialized into a static representation that survives A4 pagination?

This is not a repeat of C28's media-query/environment branch test. C29 directly verifies **used box geometry and size-container semantics in physical bytes**.

## 3. Fresh source / architecture observations

Current WebClip still prepares the selected live document and hands it to Chromium for A4 physical PDF rendering. The current renderer path uses screen-media emulation while the WebClip print stylesheet provides A4 page geometry. Historical and C28 current-source evidence already established that this combination can create a hybrid environment.

The exact current `content.js` selection preparation does not replace arbitrary viewport/container-relative used values with an immutable admitted static representation before the physical render cut. The save metadata produced by the C29 exact content-script handoff contains the ordinary page/save/resource/selection fields; it does not contain a final renderer-used geometry receipt for the tested `vw`/query-container/`cqw` boxes.

`beforeprint` and live `getBoundingClientRect()` are also not sufficient proof of the final paged geometry: the first C29 physical run directly demonstrated that those live readings can remain source-like while the PDF's container-query branch has already changed.

## 4. External standards and independent architecture research

External sources are hypothesis/architecture inputs only. Fresh WebClip source and physical evidence control the verdict.

### CSS Values & Units Level 4

W3C defines viewport-percentage lengths relative to the initial containing block, and explicitly states that for **paged media** that basis is the **page area** rather than the continuous-media viewport. When the initial containing block dimensions change, the viewport units scale accordingly.

Reference:

- https://www.w3.org/TR/css-values-4/#viewport-relative-lengths

This means a correct browser is allowed/expected to resolve `vw`/`vh` from page geometry in paged media. The product question is therefore not “is Chromium wrong?” but whether WebClip's faithful-static mode owns an admitted representation before this permitted re-evaluation occurs.

### CSS Containment Level 3 / container units

W3C defines `cqw`, `cqh`, `cqi`, `cqb`, `cqmin`, and `cqmax` relative to the dimensions of the applicable query container; for each axis the query container is the nearest eligible ancestor container.

Reference:

- https://www.w3.org/TR/css-contain-3/#container-lengths

MDN and Chrome documentation describe the same semantics: `1cqw` is 1% of the query container width, and size queries select rules according to the current query-container dimensions.

References:

- https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries
- https://developer.chrome.com/blog/cq-polyfill

Thus a percentage-sized query container that changes under paged geometry can legitimately change both `@container` branch truth and descendant `cqw` used geometry.

### Independent capture-engine analogues

`html-to-image` issue #320 reports a related capture failure class: setting export width/height changes the output surface while responsive child layout does not automatically converge to the intended representation. It is not a WebClip proof, but it illustrates why output geometry and captured responsive state must be one explicit contract.

Reference:

- https://github.com/bubkoo/html-to-image/issues/320

Current snapDOM documents computed-style snapshots plus an optional measured `reconcile` phase that compares clone and live geometry and pins boxes whose sizes diverge. Its 2026 changelog also exposes capture geometry and pins DPR-dependent tests. This is an architecture analogue, not a requirement to adopt snapDOM.

References:

- https://github.com/zumerlab/snapdom/blob/main/FEATURES.md
- https://github.com/zumerlab/snapdom/blob/main/CHANGELOG.md

Transferable lesson: a faithful capture layer needs an explicit admitted renderer representation/geometry contract; changing the export surface and hoping authored responsive CSS resolves to the same visual state is not sufficient.

## 5. Fresh physical harness

Durable reproducer:

- `project_tools/research_c29_viewport_container_geometry.py`.

The fixture contains:

- `#viewportBox { width:50vw; height:20vh }`;
- an `80%`-width query container with `container-type:inline-size`;
- a descendant `#cqUnit { width:50cqw }`;
- a `@container (min-width:700px)` branch with explicit WIDE/NARROW text tokens;
- an independent `800px` fixed query container with its own `50cqw` descendant and WIDE/NARROW tokens;
- one WebClip Exclude token and outside-scope controls.

The selected WebClip cases drive actual current `content.js` Include/Exclude and download preparation before physical A4 PDF generation.

Physical geometry is measured from the PDF raster with three distinct flat background colors. Because Chromium may fit/scale an over-wide composition to the page, acceptance uses **within-PDF ratios** to the fixed-container `50cqw` box rather than comparing absolute PDF pixels across independent documents.

## 6. Rejected harness hypotheses retained honestly

C29 required two measurement corrections before the accepted run. Both failed runs are retained as provenance; neither is silently rewritten into a pass.

### Rejected hypothesis A — `beforeprint` reflects final paged used geometry

Run `33625929885`, job `100233535486`, exact head `56c7b693025d42c51843b656e4dbfcb020312763` executed the matrix and persisted raw result, but the final assertion failed.

The raw result showed why the assertion was wrong:

- source and `beforeprint` still reported 1200×800-derived geometry and the query branch **wide**;
- the physical PDF already contained **C29_CQ_NARROW**.

Therefore `beforeprint`/live DOM readings are a diagnostic contrast control, not a receipt of final paged used geometry.

### Rejected hypothesis B — absolute PDF pixels are comparable across documents

Run `33626272151`, job `100234637330`, exact head `e427da2694023b296b43556c0b0fc25a4f86f604` added physical raster boxes and again executed the full matrix. Raw physical observations were valid, but the assertion assumed the explicit 800px control would occupy the same absolute PDF pixel width in both current and frozen cases.

That assumption was false because the frozen source-wide geometry creates a wider composition and Chromium applies a different whole-page fit scale. The correct comparison is scale-invariant: divide each responsive box width by the fixed-container control width **inside the same PDF**.

These rejected assumptions do not weaken the finding; they improve the measurement model and prevent a false causal claim.

## 7. Accepted exact-source physical execution

Accepted workflow:

- workflow: `Research C29 viewport container geometry`;
- run: `33626492404`;
- job: `100235352749`;
- exact workflow head: `78ae97da0b1741529ec9736ab06ca25c608bc49d`;
- browser: Google Chrome `151.0.7922.173`;
- conclusion: **SUCCESS**;
- accepted raw-result receipt commit: `4f39f8fdd875a19e95c03e648ef530383b25b650`;
- accepted raw result SHA-256: `b3d60e267efe3797f877ea1266fe94c1f084ce875a6ac1bc81b9d8a787d33d0a`.

### 7.1 Direct Chromium wide-source control

At source 1200×800:

- `50vw = 600px`;
- `20vh = 160px`;
- percent query container ≈`937.6px`;
- `50cqw ≈ 458.8px`;
- query branch: **wide**;
- fixed query container: `800px`, fixed branch **wide**.

Even though `beforeprint` still reports those source-like metrics, the physical PDF contains the **narrow** percent-container branch while the fixed 800px container remains **wide**.

Physical ratios:

- viewport-box / fixed-cqw-box = `1.0456`;
- percent-container cqw-box / fixed-cqw-box = `0.7789`.

This proves the branch/used-geometry change exists in Chromium's physical paged renderer independently of WebClip selection code.

### 7.2 Current WebClip wide-source case — primary C29 finding

At the same 1200×800 source, after real current WebClip selection and preparation:

- live `afterPrepare` and `beforeprint` still report `50vw=600`, query container ≈`937.6`, `50cqw≈458.8`, branch **wide**;
- physical PDF contains **narrow**, not wide;
- fixed `800px` query container remains **wide**;
- Exclude is absent;
- both outside-scope controls are absent.

Physical ratios:

- viewport/fixed = `1.0395`;
- cqw/fixed = `0.7787`.

These ratios are essentially identical to the direct Chromium paged control and not to the admitted screen geometry.

The physical PDF SHA-256 is `61e8c8b83862b28d6d534699666589913c23f4564e10b6c2e5d24cf45c0873ac`.

### 7.3 A4-aligned source positive control

A source viewport of 703×1031 begins in the **narrow** container branch with:

- `50vw ≈ 351.5px`;
- query container `540px`;
- `50cqw = 260px`.

Its physical PDF remains **narrow**, fixed container remains **wide**, and its physical ratios are exactly the same as current wide-source WebClip within the asserted tolerance:

- viewport/fixed `1.0395`;
- cqw/fixed `0.7787`.

This is a strong discriminator: the wide-source WebClip artifact behaves like a source already laid out at the paged/A4 geometry.

### 7.4 Frozen admitted-used-geometry causal control

The test-only causal control snapshots the source used widths/heights and replaces the tested `vw`, percentage query-container, and `cqw` dimensions with explicit pixel values before WebClip preparation.

Source remains:

- query branch **wide**;
- `viewportBox=600×160`;
- query container ≈`937.6`;
- `cqUnit≈458.8`.

The physical PDF now also remains **wide**. Exclude and outside controls remain absent.

Scale-invariant physical ratios rise to the source-shaped values:

- viewport/fixed = `1.5417`;
- cqw/fixed = `1.1759`.

The physical PDF SHA-256 is `fa23fce76d42971ca7cfd5d6215473b10de342f6d7fc6ff6e1a7bb75513669bc`.

This is causal evidence that the content is printable and that freezing admitted used geometry can preserve the tested source representation through the same A4 renderer. It does **not** prescribe freezing every computed style/property without bounds.

## 8. Interpretation

The fresh C29 failure is not “container queries are broken” and not “Chromium cannot print this content”.

The correct interpretation is:

1. CSS standards make viewport and container-relative values depend on the current rendering geometry.
2. The A4 physical renderer has a different geometry from the admitted screen.
3. WebClip's current faithful-static path leaves those dependencies live until the paged renderer.
4. Therefore the final physical PDF can validly recompute them into a different visual state.
5. Current live/beforeprint diagnostics can still report the source state and therefore cannot prove the final physical used geometry.
6. A bounded admitted static representation can preserve the tested source used geometry, as the causal control proves.

For a mode claiming source-screen fidelity, the architecture must therefore capture/materialize the relevant admitted used representation or truthfully report that the result is an intentional reflow/degraded/unknown representation. Merely forcing `media:'screen'` is insufficient.

## 9. Duplicate / root-cause reconciliation

### P0-070 — primary generation/environment owner

P0-070 requires user save authority to remain exact full-document generation through physical PDF finalization. C29 demonstrates that the renderer/environment portion of that generation is materially different from the admitted used geometry unless it is explicitly represented/frozen.

No new owner is needed.

### P0-004 — primary visual/layout consequence owner

P0-004 requires selected PDF fidelity to preserve the intended selected representation without silent visual/layout substitution. C29 proves selected viewport/container-dependent geometry and query branch can change while the selected DOM/text remains otherwise intact.

No new owner is needed.

### P0-075 — architecture context, not primary C29 finding

P0-075 remains relevant to the broader isolated-representation architecture. However C29 does not require hostile page mutation to reproduce: direct Chromium and current WebClip both show the same paged-geometry re-evaluation. C29 therefore does not list P0-075 as a primary fresh owner.

### P1-187 — not freshly exercised

C29 intentionally stays in the top document. Same-origin flattened-frame parity remains important but is not claimed revalidated by this fixture.

### P2-007 — architecture mode context only

The broader distinction between source-faithful capture and intentional reader/print reflow remains a P2-007 architecture concern. C29 does not change P2 status and does not make it a release blocker by itself.

## 10. Acceptance direction

A future P0-070/P0-004 implementation for faithful-static PDF should prove, within explicit bounds:

1. exact admitted viewport/container-dependent representation is captured before pagination can change it;
2. relevant `vw`/`vh`/container-query/container-relative used geometry is preserved or explicitly declared reflowed/degraded;
3. container-query branch truth used by the final representation corresponds to the admitted representation, not silently to A4 geometry;
4. fixed-size query-container controls remain stable;
5. Include/Exclude remains exact;
6. diagnostics/receipts describe the **final represented geometry**, not merely pre-print live DOM dimensions;
7. the solution does not depend on unbounded computed-style copying or layout iteration;
8. any frame parity work remains generation-bound and budgeted under the existing frame/boundedness owners.

An intentionally reflowed print/reader mode may choose page-relative/container-relative A4 layout, but it must be an explicit product mode rather than a silent substitute for faithful screen-state capture.

## 11. Pipeline mapping

- **B1 User Intent:** user selects content in the current responsive screen state.
- **B2 Admission:** 1200×800 source geometry/branch and Include/Exclude are the admitted state for the primary case.
- **B3 Capture:** current source retains authored viewport/container dependencies; no immutable used-geometry representation is created for C29.
- **B4 Static Materialization:** current path leaves those dependencies live; causal control materializes the admitted used geometry.
- **B5 Renderer:** A4 paged renderer reevaluates `vw`, percentage container size, `cqw`, and `@container` truth.
- **B6 Physical Artifact:** current/direct artifact matches A4-aligned geometry and narrow branch; frozen artifact preserves source-like ratios and wide branch.
- **B7–B9:** not independently exercised by this focused tranche.

## 12. Verdict / next coordinate

Fresh C29 verdict:

**`L4-REVALIDATED / FINDING + POSITIVE/DIRECT/ALIGNED/CONTAINER/FROZEN/CAUSAL CONTROLS (P0-070, P0-004)`**.

No runtime, version, Registry status, release readiness, build, tag, or GitHub Release change is made.

After C29 integration, the next sequential coordinate is **C30 — Clipping / overflow / paint containment**.
