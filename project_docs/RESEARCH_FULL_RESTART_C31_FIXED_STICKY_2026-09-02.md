# WebClip — fresh full-project research — C31 Fixed / sticky — 2026-09-02

Date: 2026-09-02  
Canonical source baseline: `2b47d4f47a90882b2c3466e8af9f5b7b8477a015`  
Exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`  
Scope: fresh-restart coordinate **C31 — Fixed / sticky**.

## Result

**C31: `L4-REVALIDATED / FINDING + POSITIVE/FIXED-REPEAT/STICKY/TRANSFORMED/FRAME/CAUSAL CONTROLS (P0-004; P1-187 supporting)`.**

Fresh exact-source Chrome evidence proves a narrow but material top-document semantic failure: an admitted selected `position:fixed` descendant is preserved as fixed by current WebClip preparation and is physically repeated once on every generated PDF page. In the test fixture the single source token appears **6 times on 6 pages**. This contradicts the current faithful-static PDF contract, which explicitly allows fixed/sticky flattening and expects decorative/navigation fixed content to receive one meaningful static placement rather than mechanical page duplication.

The broad claim “all positioned content repeats or breaks” is rejected. A selected `position:sticky` token appears once, a fixed descendant whose containing block is established by a transformed ancestor appears once, an unselected fixed sibling is fully omitted, and changing only the admitted fixed descendant to static after normal preparation produces one occurrence while preserving all selected rows.

Current same-origin BODY frame flattening already performs a different semantic transformation: fixed and sticky descendants in the proxy are explicitly converted to `position:static`; the fresh physical frame output contains each exactly once. This is supporting P1-187 parity evidence, while the direct top-document repeated selected presentation is owned by P0-004.

No new P-code, Registry wording/status, runtime, manifest/version or release-state change is required.

## 1. Current contract boundary

`WEBCLIP_PDF_FIDELITY_CONTRACT.md` permits fixed/sticky semantics to be statically flattened when literal viewport-relative behavior under pagination would repeat, overlap or otherwise create a false representation. Its default rule is that decorative/navigation fixed/sticky content should get one meaningful static placement rather than being mechanically duplicated on every PDF page.

C31 therefore tests whether current top-document selected-only preparation actually implements that contract, and whether equivalent content receives consistent semantics across the top-document and same-origin secondary representation.

## 2. Fresh current-source inspection

Current top-document selected-only stylesheet keeps an Include and all of its descendants in the live DOM but does not normalize ordinary selected descendants' `position` values. A selected page element authored as `position:fixed` or `position:sticky` remains so at the physical renderer cut.

In contrast, current frame-specific paths explicitly normalize positioning:

- `applySelectedFramePrintFlow()` sets selected iframe shells to `position:static` because absolute/fixed/sticky shells can break paginated flow;
- `copyComputedFrameCloneStyle()` checks the source computed position and, for `fixed`, `sticky` or `absolute`, sets the flattened target to `position:static` with `inset:auto`;
- comments explicitly state that the proxy must participate in normal paginated flow and must not preserve fixed positioning from the embedded viewport.

Thus current source already contains two different fixed/sticky archival semantics depending on representation path.

## 3. Fresh physical evidence

Accepted exact-source execution:

- workflow: `Research C31 fixed sticky`;
- run: `33636534741`;
- job: `100268696867`;
- exact workflow head: `a3ee43fa8e03219023b7240095c7b8f7d5a414ff`;
- browser: Google Chrome `151.0.7922.173`;
- conclusion: **SUCCESS**;
- exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- raw receipt commit: `cc3fc3980be89db7671727fe2f18c3495bd0f952`;
- raw result SHA-256: `94775265ccf4c4992cfcda162d1625f160d2f931d8fcaae847f9e376b207899c`;
- durable harness: `project_tools/research_c31_fixed_sticky.py`.

Every top-document selected fixture contains 120 already-mounted ordinary rows plus an early explicit Exclude. FIRST/MIDDLE/LAST must remain present, and outside-scope content must remain absent. The positioned marker is intentionally simple so occurrence count is unambiguous in extracted physical PDF text.

### 3.1 Top selected fixed descendant — repeated 6/6 pages

Before and after current WebClip preparation the marker remains:

- `position: fixed`;
- `top: 18px`.

Physical PDF:

- 6 pages;
- all 120 selected rows and FIRST/MIDDLE/LAST are present;
- Exclude/outside controls absent;
- `C31_FIXED_TOKEN` occurs **6 times**.

PDF SHA-256: `9b0c6a967009ad18a3de13fdb243f166c5f42a071890ae6c3c8e41bc68c252e1`.

This is not content truncation; it is false duplication/injection of selected presentation caused by retaining live fixed semantics into paged media.

### 3.2 Sticky descendant — one occurrence positive control

Current preparation preserves `position:sticky; top:8px`.

Physical PDF:

- 6 pages;
- 120/120 rows complete;
- sticky token occurs exactly **once**;
- Exclude/outside controls absent.

PDF SHA-256: `77f2ad2479cf18809a210103039739903516d18fea00b063ddc4206ed8e92809`.

Therefore C31 must not generalize fixed repetition into a blanket “positioned descendants repeat” rule.

### 3.3 Fixed descendant inside transformed containing block — one occurrence control

The marker remains computed `position:fixed`, but its parent has a non-none transform matrix and therefore establishes a fixed-position containing block.

Physical PDF preserves all 120 rows and the fixed marker occurs exactly **once** across 6 pages.

PDF SHA-256: `ce06b85de69d1374e772002f01e4a0e287da6f7efdbc15f56395aabb811e6d9e`.

This proves that the material failure depends on viewport/page-fixed semantics, not the fixed keyword alone.

### 3.4 Unselected fixed sibling — correct negative scope control

A fixed element outside the selected article is present in the source page but not inside Include.

Physical selected PDF contains all 120 selected rows and **zero** occurrences of `C31_UNSELECTED_FIXED`.

PDF SHA-256: `8ffba5258db053430481601fd06e8419a5d11c26be595bcc94b45ed4ef00a26a`.

Current selected-only filtering can therefore exclude an unrelated fixed region correctly; the defect is repeated presentation of a fixed region that actually belongs to selected scope.

### 3.5 Causal static normalization — one occurrence

After normal WebClip preparation, the test-only causal control changes only the selected fixed marker from fixed to static and clears inset positioning.

Physical PDF:

- 6 pages;
- 120/120 rows complete;
- fixed-causal token occurs exactly **once**;
- Exclude/outside controls absent.

PDF SHA-256: `b55bd9751c8a2240b5f5e93ef6b1b67f331d1e8a5e6b4c0a9af1a9a6a6f0de1d`.

This isolates the repeated top-document fixed semantics as the cause and proves one meaningful static placement is physically realizable without losing selected content.

### 3.6 Same-origin BODY frame proxy — fixed/sticky already become static

A selected same-origin frame BODY contains both fixed and sticky markers plus 120 rows.

After current production flattening:

- a flattened proxy exists;
- original iframe is hidden;
- fixed proxy descendant computed position is `static`;
- sticky proxy descendant computed position is `static`.

Physical PDF:

- 7 pages;
- all 120 frame rows and FIRST/MIDDLE/LAST present;
- frame fixed token occurs exactly once;
- frame sticky token occurs exactly once;
- Exclude/outside controls absent.

PDF SHA-256: `22f52767b3c362af79b96db18093fc1d563c4ee7016d8d135ea13ffe2326e276`.

This is a positive result for the frame's chosen static archival semantics but also demonstrates representation-path divergence: equivalent top-document fixed content repeats, while the secondary frame representation gets a one-occurrence static placement.

## 4. Standards and external comparison

### CSS fixed positioning in paged media

CSS 2.1 and historical/current CSS positioning specifications define fixed-position boxes in paged media as repeated on every page; fixed boxes are not paginated themselves. This explains the browser behavior when WebClip carries a screen fixed box unchanged into the paged renderer.

References:

- https://www.w3.org/TR/CSS22/visuren.html#fixed-positioning
- https://www.w3.org/TR/css-position-3/

This standards behavior is not a browser defect by itself. The WebClip issue is product/representation semantics: current faithful-static contract does not want mechanical repetition for ordinary decorative/navigation fixed content.

### CSSWG issue #12481 — known downside of repeated fixed boxes

A 2025 CSSWG issue explicitly questions mandatory repetition of `position:fixed` in paged media because browsers follow the rule and repeated fixed elements can overwrite/clobber page content on later pages.

Reference: https://github.com/w3c/csswg-drafts/issues/12481

This is direct ecosystem evidence for the same failure mode, but WebClip's ownership still comes from its own contract and fresh physical bytes.

### snapDOM — capture engines need explicit sticky/fixed handling

Current snapDOM history includes explicit sticky support and later fixes for fixed elements inside scroll wrappers. Its 2026 architecture also emphasizes clone/layout reconciliation rather than simply trusting authored positioning through a different output geometry.

Reference: https://github.com/zumerlab/snapdom/blob/main/CHANGELOG.md

The transferable lesson is only that fixed/sticky capture semantics require explicit representation policy; snapDOM's implementation is not an automatic WebClip requirement.

## 5. Duplicate/root-cause reconciliation

### P0-004 — primary C31 top-document owner

P0-004 requires the selected PDF to remain complete and selection-bounded when page-owned positioning/visual effects influence the saved copy. The fresh C31 failure is a direct selected-presentation consequence:

- one admitted selected fixed element becomes six physical occurrences;
- the duplication is deterministic and page-count bound;
- ordinary selected content remains complete, ruling out a generic content-loss explanation;
- static causal normalization restores one occurrence;
- unrelated fixed content remains excluded.

No new P-code is needed.

### P1-187 — supporting frame-parity evidence

The same-origin flattened representation already transforms fixed/sticky descendants to static. That behavior avoids the top-document duplication in this fixture, but it means equivalent source semantics differ according to whether content is top-level or represented through a frame proxy. P1-187 remains the existing secondary-rendered-state owner and receives supporting C31 evidence; no Registry wording/status change is required.

### P0-070 / P2-007 — architecture context only

P0-070 remains relevant to exact admitted-to-physical representation generation. P2-007 remains the broader explicit output-mode owner. Neither is required as an additional direct C31 owner.

## 6. Architecture implication

A future faithful-static implementation should not blindly turn every `fixed` or `sticky` element into static. The positive controls prove that containment context matters and sticky does not necessarily repeat.

The bounded target is to classify admitted positioned presentation by its renderer semantics and intended archival role:

- viewport/page-fixed decorative/navigation content that would mechanically repeat should receive one deterministic meaningful static placement;
- intentionally repeating semantic headers may require an explicit rule rather than blanket removal;
- fixed content in a non-viewport containing block may already have one meaningful placement and should not be unnecessarily rewritten;
- sticky behavior should be materialized only when needed for faithful static geometry;
- top/same-origin/remote supported representations should implement one explicit semantic contract, with truthful degradation where parity cannot be proven.

## 7. Pipeline mapping

- **B1 User Intent:** selected scope includes one visible positioned marker and ordinary content.
- **B2 Admission:** exact current fixed/sticky/containing-block state.
- **B3 Capture:** current top path keeps live authored positioning; frame proxy captures and rewrites it.
- **B4 Static Materialization:** top path has no fixed/sticky materialization; frame proxy does.
- **B5 Renderer:** Chromium correctly applies fixed paged-media repetition to the live top representation.
- **B6 Physical Artifact:** top fixed repeats 6×/6 pages; sticky/transformed/static/frame controls occur once.
- **B7–B9:** not independently exercised.

## 8. Verdict

Fresh C31 classification:

**`L4-REVALIDATED / FINDING + POSITIVE/FIXED-REPEAT/STICKY/TRANSFORMED/FRAME/CAUSAL CONTROLS (P0-004; P1-187 supporting)`**.

No new P-code; production runtime/version/release state unchanged. After C31 integration, next sequential coordinate is **C32 — Pagination / physical page breaks**.
