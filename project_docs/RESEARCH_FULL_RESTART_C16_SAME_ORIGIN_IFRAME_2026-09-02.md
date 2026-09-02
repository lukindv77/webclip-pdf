# WebClip — fresh full-project research restart — C16 same-origin iframe — 2026-09-02

Date: 2026-09-02

Fresh canonical baseline at tranche start:

`main = 2bdd469be3e6a5a14f70123d42ec7fa01a7994e8`

Fresh product-source identity:

- `content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- `RESEARCH_REGISTRY.md` remains the only current P-owner/status authority.

Fresh restart coordinate:

**C16 — Same-origin iframe**

Recommended integrated classification:

**`L4-REVALIDATED / FINDING + POSITIVE/NESTED/CAUSAL CONTROLS (P1-150; P0-004 supporting)`**

No new P-code is allocated. The fresh failure is a direct refinement/reopen of the historically assigned same-origin selected-iframe print-height stabilization owner **P1-150**, with **P0-004 ACTIVE** owning the broader physical selected-PDF completeness consequence. Runtime, manifest/version, build, tag, Release and release readiness are unchanged by this research tranche.

## 1. Bounded question

C16 asks whether current same-origin frame representation preserves the selected logical content through physical Chromium PDF when the selected scope is not limited to the one-level BODY-flattening case.

The focused fresh matrix separates three questions that the older one-level regression chain did not distinguish cleanly:

1. Does current one-level BODY flattening still preserve an ordinary long selected child BODY?
2. Can current live-frame height stabilization preserve ordinary long selected non-BODY and nested same-origin selections even though they remain behind one or more live iframe boundaries?
3. What happens when a valid selected live-frame representation exceeds the current hard `200000px` stabilization clamp?

C16 does not claim exhaustive coverage of cross-origin frames, dynamic frame navigation, transform/zoom geometry, renderer-owned state already covered by P1-187, resource readiness, hostile mutation during print, or every browser/PDF viewer. Those remain under their existing owners and later coordinates.

## 2. Fresh current-source inspection

### 2.1 BODY flattening is deliberately narrow

Current `selectedBodyForSameOriginFrame(frame)` returns a flattening candidate only when the frame is same-origin and the selected Include is exactly `childDoc.body`.

`createFlattenedBodyFramePrintProxy()` creates the secondary representation in `frame.ownerDocument`, appends the proxy to that owner document's BODY and hides the original frame.

Consequences on current source:

- a one-level selected child BODY can be materialized in the top document;
- a nested selected inner BODY is materialized only in its immediate outer document, so the outer iframe remains a live frame boundary;
- a selected non-BODY subtree does not receive the BODY proxy and remains in its live iframe.

This source fact originally motivated the hypothesis that arbitrary/nested selected content might still be clipped. Fresh physical evidence below rejects that broad hypothesis for the ordinary tested lengths.

### 2.2 Non-flattened frames use current height stabilization

Current `stabilizeSelectedFramePrintHeights()` skips frames already represented by a flattened proxy and processes the remaining selected same-origin frames deepest-first.

The stabilization path:

- measures the accessible selected frame document at a bounded measurement width;
- repeats the pass to account for layout feedback;
- removes ordinary max-height/overflow restrictions on the frame representation;
- grows the iframe height from the measured child-document height plus padding.

The physical matrix below shows that this current path is sufficient for the tested ordinary long non-BODY and nested cases in Chrome 151. Therefore live iframe presence alone is not a current C16 failure discriminator.

### 2.3 The stabilization path has an explicit `200000px` hard ceiling

Fresh exact-source inspection finds the same ceiling at multiple related points:

- remote prepared frame height: `Math.min(200000, ...)`;
- selected-frame flow height: `Math.min(200000, ...)`;
- returned measured height: `Math.min(200000, ...)`;
- stabilization target height: `Math.min(200000, ...)`.

This is not a newly invented mechanism. Git history maps the bounded selected-iframe measurement/stabilization mechanism to historical **P1-150** (`fix: stabilize selected iframe print height (P1-150)`, commit `ab217c56d7ba1d4f0ff58c329a1a70203e25a676`).

The current product contract, however, requires long same-origin selected content not to disappear merely because of a fixed frame/scroll geometry boundary. A bounded implementation is allowed, but the bound cannot silently convert admitted selected content into an apparently successful partial PDF.

## 3. External standards / browser / comparable implementation research

External material is used as architecture/risk input only. The C16 verdict rests on fresh current WebClip source plus the exact Chrome/PDF evidence in section 4.

### 3.1 CSS Fragmentation explains why embedded/replaced boundaries are risky, not whether WebClip currently fails

CSS Fragmentation Level 3 defines fragmentation behavior and monolithic/non-fragmentable content. Replaced elements are among the classes for which user agents may avoid internal fragmentation, and the specification recommends avoiding breaks inside monolithic content where possible.

Reference:

- https://www.w3.org/TR/css-break-3/

This supports the decision to test iframe pagination physically rather than infer completeness from CSS height alone. It does not prove a WebClip defect by itself.

### 3.2 HTML defines iframe as a nested document/navigable boundary

The HTML Standard defines `iframe` as embedded content that creates a nested browsing context/navigable with its own document.

Reference:

- https://html.spec.whatwg.org/multipage/iframe-embed-object.html

That separate-document boundary explains why WebClip needs an explicit frame capture/representation contract. It does not imply that every live iframe necessarily clips in current Chromium.

### 3.3 Chromium print behavior remains version-sensitive

Recent Chromium issue history still contains physical Print-to-PDF clipping regressions around page boundaries, including visible text being omitted in a newer Canary print pipeline. This is not the same WebClip root cause, but it supports browser-version-specific physical verification instead of treating a historical Chrome result as permanent truth.

Reference:

- https://issues.chromium.org/issues/546627207

Historical browser/community iframe-print reports likewise show that multi-page iframe behavior has varied by browser/version. They are failure-mode hypotheses only, not current WebClip proof.

### 3.4 SingleFile explicitly captures frame document content rather than relying on a live frame to define the saved artifact

At inspected SingleFile commit `8ce3eb5cabcf79589335ea58d70a20d33562cd97`, the saving pipeline treats frame documents as explicit capture inputs and injects frame content into the saved representation rather than assuming the live browsing-context boundary itself is an archival contract.

Reference:

- https://github.com/gildas-lormeau/SingleFile/tree/8ce3eb5cabcf79589335ea58d70a20d33562cd97

The architectural lesson for WebClip is not “copy SingleFile”, but that frame contents need explicit representation/completeness semantics.

### 3.5 snapDOM chooses a different iframe contract

At inspected snapDOM commit `5766151f8867eb2e64a6321a0af6f01fe25d65f0`, capture helpers explicitly model a viewport clip using document `clientWidth/clientHeight`, and the project documents raster treatment of same-origin iframe content.

References:

- https://github.com/zumerlab/snapdom/tree/5766151f8867eb2e64a6321a0af6f01fe25d65f0
- https://github.com/zumerlab/snapdom

That is a legitimate screenshot/raster contract, but it does not satisfy WebClip's current requirement that the primary PDF retain logical selected text and ordinary-scroll existing content across pages. It is useful precisely because it makes the frame-capture contract explicit rather than accidental.

## 4. Fresh exact-source Chrome physical-PDF evidence

Accepted environment:

- GitHub-hosted `ubuntu-24.04` runner;
- Google Chrome `151.0.7922.173`;
- actual repository `content.js` loaded from checkout;
- Playwright `1.55.0` driving the selected/download/preparation path;
- `pypdf 6.0.0` physical PDF text inspection;
- synthetic local same-origin `srcdoc` fixtures containing no user data;
- exact accepted evidence head `bda5f1e655e7276d6654a0a0051f97a184c4bb85`;
- workflow run `33593581470`;
- job `100132387642`;
- conclusion **SUCCESS**;
- accepted result JSON SHA-256 `73cc3a7f59c42cfa906cbc57132ee77c286199211df3c30ee544427975e05de3`.

Durable reproduction harness:

`project_tools/research_c16_same_origin_iframe.py`

The harness drives actual WebClip Include/Exclude state and the current download/prepare path. The worker PDF reply is deliberately held while the exact prepared document is physically printed. Raw result JSON is printed before interpretation assertions so a failed hypothesis remains observable.

### 4.1 Rejected development run

Run `33593452539`, job `100132005123`, is **not** accepted as the canonical pass/fail authority. It exposed an over-strict harness assertion: in nested cases `pypdf` omitted two intermediate row tokens at physical page boundaries even though FIRST, MIDDLE and LAST were all present and the extracted last row was `180`.

The harness was changed only to tolerate up to five missing intermediate extractor tokens while still requiring FIRST/MIDDLE/LAST and the exact final-row marker. Product source and physical frame behavior were not changed.

The accepted rerun above completed with that extractor-only correction.

### 4.2 Physical matrix

| Case | Physical completeness | Key geometry | Pages | PDF SHA-256 |
|---|---|---|---:|---|
| direct long child document | 180/180 rows; FIRST/MIDDLE/LAST | native control | 6 | `9797970e55543a64cd76e6d4aff70c08c874845121b84ed2ae2ca3cf36a405d4` |
| one-level selected long BODY | 180/180; FIRST/MIDDLE/LAST; Exclude/top shell omitted | measured `6284`, applied `6332` | 7 | `150a9598b5f99a6c97d6cb7507a3b73ff29339ebbded130d5dc6aa0c40d58633` |
| short selected non-BODY | 12/12; FIRST/MIDDLE/LAST; Exclude/top shell omitted | max measured `738`, applied `786` | 1 | `08ff24973d2f5e1166cac8c4a106d98beaafd0b7ae2a698295add865f4544348` |
| long selected non-BODY | 180/180; FIRST/MIDDLE/LAST; Exclude/top shell omitted | max measured `6450`, applied `6498` | 9 | `1b20be17802a910deb827245038aa4bc042446a8919079bb2898db21f23c56e9` |
| nested selected BODY | FIRST/MIDDLE/LAST and final row 180; 178 intermediate tokens extracted | deepest measured `6284`; outer beforeprint `6488` / applied `6536` | 9 | `734f5260f04a835ab652acd14558204d6abafc92c1ed80c8b8d3e8ec566e2f3a` |
| nested selected non-BODY | FIRST/MIDDLE/LAST and final row 180; 178 intermediate tokens extracted | deepest and outer stabilized; outer `6522` / `6570` | 9 | `34652adf505f5b053d60458facb3c8b9e72edf566a4e52e7f1a2ac195dec325b` |
| **over-cap selected non-BODY — current path** | **FIRST/MIDDLE present; LAST absent; extracted 3984/4200, last extracted row 4000** | **measured `210016`, applied `200004`** | 196 | `a36956ac27125d24f46bcf6a1aa9df991cc8b264a28a317635521a79bfa30348` |
| **same over-cap selection — causal top materialization** | **4200/4200; FIRST/MIDDLE/LAST; Exclude/top shell omitted** | same source selection; test-only top flow | 206 | `1c6ad83b9185241f2e8e786cdee81e5ffb1b4cf70e6051e8a54e358d98b474e8` |

### 4.3 Ordinary live-frame and nested controls reject the broad historical hypothesis

The ordinary long non-BODY case remains a live iframe but prints all 180 rows and all three sentinels. The nested BODY and nested non-BODY cases also retain FIRST/MIDDLE/LAST through a live outer iframe after deepest-first stabilization.

Therefore the bounded C16 conclusion is **not** that one-level-only BODY flattening makes arbitrary nested/live same-origin selections inherently unprintable. Current Chrome 151 plus current stabilization physically handles the tested ordinary lengths.

This matters architecturally: C16 should not force universal flattening solely to solve a pagination failure that no longer reproduces for these cases.

### 4.4 The `200000px` boundary is a fresh physical finding

The over-cap current case intentionally keeps the selection as a non-BODY subtree in a live same-origin iframe. The fixture contains 4200 50px rows plus bounded surrounding layout.

Current diagnostics observe a required frame height of approximately `210016px`, but the applied iframe height is held at about `200004px` by the current ceiling. The resulting PDF:

- contains FIRST;
- contains MIDDLE;
- does **not** contain LAST;
- extracts only 3984 unique row tokens;
- reaches extracted row 4000 rather than 4200;
- still correctly omits the explicit Exclude and the unselected top shell.

This is a selection-bounded completeness failure, not accidental admission of unrelated content.

### 4.5 Causal top materialization proves the missing tail exists and is printable

After the same normal WebClip preparation, the causal control takes the same selected 4200-row article, removes the already-marked Exclude in the test representation, appends the selected subtree into top-document normal flow and hides the live iframe.

Chrome then produces a 206-page PDF containing all 4200 rows and FIRST/MIDDLE/LAST.

This rules out the broader explanations that:

- the source selected tail never existed;
- Chrome cannot create a PDF of that content volume at all;
- the fixture's final rows are intrinsically non-printable;
- the missing tail is caused by Exclude semantics.

The discriminator is the capped live-frame representation.

## 5. Duplicate / root-cause reconciliation

### 5.1 No new C16 P-code

Fresh Registry, family/history evidence and Git-history reconciliation identify historical **P1-150** as the owner that introduced and validated selected same-origin iframe print-height stabilization.

The fresh defect is directly inside that same mechanism: a hard `200000px` clamp silently changes an admitted selected scope into a physically partial PDF.

Allocating a new late P1 solely because the fresh fixture crosses the old bound would duplicate the owner rather than identify a new subsystem.

### 5.2 P1-150 must be reactivated by the integrated Registry change

Before this tranche, P1-150 is a historically assigned code not explicitly listed as ACTIVE, so the Registry's compact default classifies it as `IMPLEMENTED / RELEASE-REGRESSION`.

Fresh exact-current-source L4 evidence now demonstrates an unresolved acceptance contract. The integrated Registry should therefore list **P1-150 ACTIVE** with the refined owner invariant:

> Same-origin selected iframe print-height stabilization must not silently truncate admitted selected content at the `200000px` guard; over-bound content requires a complete bounded final representation or a truthful degraded/failed outcome instead of partial-PDF success.

This is a reopen/refinement, not a new P-code.

### 5.3 P0-004 remains the supporting physical-fidelity owner

**P0-004 ACTIVE** remains relevant because its invariant forbids selected PDF fidelity from being silently truncated by ancestor/layout/clipping representation.

For this exact C16 defect, however, P1-150 is the more precise mechanism owner because the causal path is the selected-frame height stabilization ceiling itself.

### 5.4 Adjacent owners are not duplicated

- **P1-187 ACTIVE** remains the flattened same-origin renderer-owned-state representation owner. The C16 ordinary BODY text-completeness control passes; this cap finding does not establish a new P1-187 renderer-state failure.
- **P1-226 ACTIVE** concerns frame geometry chains/transform/zoom; the static fixture does not depend on transform/zoom.
- **P1-227 ACTIVE** concerns dynamic same-origin frame topology/listener generation; the fixture is static after setup.
- **P0-064 DONE** remains the flattened-BODY preflight budget closure; the over-cap failing case is non-BODY and never enters that proxy materialization path.
- **P0-068 DONE** remains the inert flattened-proxy boundary and is not reopened.

## 6. Architectural implications

### 6.1 Do not replace a proven boundedness requirement with an unbounded iframe height

The finding does **not** justify changing `200000` to Infinity or removing all resource/geometry bounds. Host-page dimensions are untrusted inputs, and frame preparation must remain bounded.

The defect is the combination of:

1. admitting selected content beyond the representable live-frame bound;
2. truncating its representation at that bound;
3. proceeding as if the PDF were complete.

A correct architecture can retain a hard budget while changing the settlement semantics.

### 6.2 Preferred direction: explicit final representation or truthful degraded/failure

Within current architecture, candidate solutions under P1-150/P0-004 include:

- materialize the selected same-origin subtree into a bounded final-document representation that can paginate in normal flow, when safe and within representation budgets; or
- detect that the selected frame exceeds the supported live-frame representation envelope and produce a first-class degraded/partial/failure outcome before claiming ordinary success.

A future format-neutral capture layer may make this cleaner by representing selected frame contents independently from their live browsing-context geometry. That direction is already consistent with `WEBCLIP_COPY_ARCHITECTURE_POLICY.md` and does not authorize an immediate large runtime rewrite in this research tranche.

### 6.3 Universal flattening is not established by C16

Ordinary long non-BODY and nested cases physically succeed in current Chrome 151. Therefore a universal “flatten every same-origin selection” rule would add representation cost and renderer-state risk without this C16 evidence proving it necessary for ordinary sizes.

The implementation decision should target the actual boundary: content that cannot be truthfully represented within the live-frame stabilization envelope.

## 7. Verdict and next checkpoint

Fresh C16 verdict:

**`L4-REVALIDATED / FINDING + POSITIVE/NESTED/CAUSAL CONTROLS (P1-150; P0-004 supporting)`**

The broad pre-run hypothesis is rejected: current one-level-only BODY flattening does **not** by itself imply clipping for ordinary long non-BODY or nested same-origin selections in Chrome 151.

A narrower and directly current-source failure is proven: admitted selected non-BODY same-origin content exceeding the current `200000px` stabilization envelope is silently truncated in the physical PDF, while causal top-document materialization preserves the same complete content.

Required durable integration for this tranche:

- reactivate P1-150 in `RESEARCH_REGISTRY.md` with the refined non-silent-truncation invariant;
- update the restart baseline C16 row to this classification;
- retain this evidence and the reproduction harness;
- leave runtime/product code unchanged in this research PR;
- keep `RELEASE_READINESS.md` at **NOT READY** and manifest/runtime at `0.9.8`.

After C16 integration, the next sequential restart coordinate is **C17 — Cross-origin iframe capture/print boundary**.
