# WebClip — fresh full-project research restart baseline — 2026-09-01

Date: 2026-09-01

Canonical source baseline: `94dd11a312a7e125ba74fa2a49e06938f674e0cd`.

Campaign state: **DEEP-RESEARCH-IN-PROGRESS / FRESH-RESTART**.

## Purpose

This campaign restarts the full project research from the beginning on current canonical source. Existing implementation, P-code ownership, durable evidence, tests, Git history and prior coverage work are retained; nothing is reverted or discarded.

However, prior PASS/FINDING/coverage outcomes are **not credited as evidence for this new campaign until independently rechecked against the current source and current product contracts**. Historical material may be used only as:

- duplicate/root-cause lookup;
- hypothesis and fixture input;
- historical comparison/provenance;
- evidence-location discovery.

`RESEARCH_REGISTRY.md` remains the single current authority for P-code owner/status. This restart does not reopen DONE owners, close ACTIVE owners, allocate new P-codes or change release readiness by itself.

## Normative basis

The new pass starts from the current normative chain:

1. `PROJECT_MISSION_AND_DEFENSIVE_SECURITY_POLICY.md` — user-selected truthful later-readable copy, defensive security and truthful degradation;
2. `WEBCLIP_COPY_ARCHITECTURE_POLICY.md` — selection/admitted generation -> format-neutral capture/provenance -> renderer;
3. `WEBCLIP_PDF_FIDELITY_CONTRACT.md` — current faithful-static-PDF contract;
4. `RESEARCH_COVERAGE_CAMPAIGN_POLICY.md` — B1…B9 coverage model, L1…L5 evidence ladder, controls, root-cause saturation and completion gates;
5. `RESEARCH_CHANGE_WORKFLOW.md` / `GITHUB_WORKFLOW.md` — owner/delivery and exact-head integration rules.

Current release state remains `NOT READY`; historical browser/external PASS does not substitute for evidence executed/revalidated under this restart.

## Restart semantics

The old `RESEARCH_COVERAGE_RECONSTRUCTION_2026-08-30.md` remains historical evidence and navigation. It is not overwritten.

For the restart matrix below:

- every material surface begins at `NOT-TRIAGED / UNKNOWN` for the new campaign;
- a row advances only after fresh inspection of current source plus the evidence level required by the current claim;
- historical evidence can reduce discovery cost but cannot itself advance the restart row;
- if a fresh observation is the same root cause as an existing owner, it is recorded under that owner rather than receiving a duplicate P-code;
- DONE owners remain DONE unless fresh current-source/current-runtime evidence independently proves a regression and the canonical workflow reopens them;
- external L5 claims remain external until freshly verified.

## Pipeline boundaries

Every tranche must explicitly map relevant work to:

- B1 User Intent;
- B2 Admission / exact page-document-frame-application generation;
- B3 Capture;
- B4 Static Materialization;
- B5 Renderer;
- B6 Physical Artifact;
- B7 Persistence / Transfer;
- B8 Journal / Provenance;
- B9 Later Reading / Recovery.

## Fresh restart matrix

All 46 previously identified material families are retained as coverage coordinates, but their previous outcomes are reset for this campaign.

| ID | Surface family | Restart state |
|---|---|---|
| C01 | Manual Include/Exclude / selected-scope authority | `L4-REVALIDATED / FINDING (P1-154)` |
| C02 | SelectionSnapshot restore -> admitted rendered target -> saved copy | `L4-REVALIDATED / FINDING + POSITIVE CONTROLS (P1-001, P0-080)` |
| C03 | Main Content / auto candidate -> actual saved scope | `L4-REVALIDATED / FINDING + POSITIVE CONTROLS (P1-160, P0-070/P0-075/P0-080)` |
| C04 | Ordinary DOM/text baseline | `L4-REVALIDATED / PASS` |
| C05 | Geometry/layout | `L4-REVALIDATED / FINDING + POSITIVE CONTROLS (P0-004)` |
| C06 | Colors/backgrounds/compositing | `L4-REVALIDATED / FINDING + POSITIVE CONTROLS (P0-004, P1-003)` |
| C07 | Fonts/typography | `L4-REVALIDATED / FINDING + POSITIVE CONTROLS (P1-003, P1-187)` |
| C08 | Raster images / crop/object-fit | `L4-REVALIDATED / FINDING + POSITIVE CONTROLS (P1-187)` |
| C09 | Responsive images / picture/srcset/currentSrc | `L4-REVALIDATED / FINDING + POSITIVE/NEGATIVE/CAUSAL CONTROLS (P0-004, P0-070, P0-075, P1-003, P1-187)` |
| C10 | SVG visual state/resources | `L4-REVALIDATED / FINDING + POSITIVE/CAUSAL CONTROLS (P1-003, P1-187)` |
| C11 | Canvas | `L4-REVALIDATED / FINDING + POSITIVE/CAUSAL CONTROLS (P1-187)` |
| C12 | Video / replaced media / current frame | `L4-REVALIDATED / FINDING + POSITIVE/CAUSAL CONTROLS (P1-187)` |
| C13 | Form / renderer-owned controls | `L4-REVALIDATED / FINDING + POSITIVE/NATIVE/CAUSAL CONTROLS (P1-187)` |
| C14 | Pseudo/generated content | `L4-REVALIDATED / FINDING + POSITIVE/CAUSAL CONTROLS (P0-004, P1-003, P1-187)` |
| C15 | Links / anchors / internal destinations | `L4-REVALIDATED / FINDING + POSITIVE/NATIVE/CAUSAL CONTROLS (P1-187)` |
| C16 | Same-origin iframe | `L4-REVALIDATED / FINDING + POSITIVE/NESTED/CAUSAL CONTROLS (P1-150; P0-004 supporting)` |
| C17 | Cross-origin iframe capture/print boundary | `L4-REVALIDATED / FINDING + POSITIVE/CAUSAL/NESTED-BOUNDARY CONTROLS (P1-229, P1-004 umbrella)` |
| C18 | Shadow DOM / slots / composed tree | `L4-REVALIDATED / FINDING + POSITIVE PHYSICAL CONTROL (P2-006)` |
| C19 | Ordinary long-page existing content | `L4-REVALIDATED / PASS` |
| C20 | Nested scroll / retained scrollports | `L4-REVALIDATED / FINDING + POSITIVE/SCROLL-POSITION/NESTED/CAUSAL CONTROLS (P0-004)` |
| C21 | Lazy/offscreen resources already belonging to content | `L4-REVALIDATED / FINDING + POSITIVE/NATIVE/CUSTOM/FRAME/SETTLED/CAUSAL CONTROLS (P1-003)` |
| C22 | Scroll-triggered new logical content / user-reached max boundary | `L4-REVALIDATED / FINDING + POSITIVE/NO-AUTOSCROLL/TRUSTED-WHEEL/SCROLL-BACK CONTROLS (P1-230)` |
| C23 | Virtualized/windowed content history within user-reached range | `L4-REVALIDATED / FINDING + POSITIVE/GRADUAL-WHEEL/SCROLL-BACK/RECYCLED-HISTORY/CAUSAL CONTROLS (P1-230)` |
| C24 | Spoilers/disclosures / inert expansion | `NOT-TRIAGED / UNKNOWN` |
| C25 | Dialog / popover / top layer | `NOT-TRIAGED / UNKNOWN` |
| C26 | Hover exclusion | `NOT-TRIAGED / UNKNOWN` |
| C27 | Focus / selection / interaction-induced page state | `NOT-TRIAGED / UNKNOWN` |
| C28 | Responsive/environment state | `NOT-TRIAGED / UNKNOWN` |
| C29 | Viewport units / container-query dependent geometry | `NOT-TRIAGED / UNKNOWN` |
| C30 | Clipping / overflow / paint containment | `NOT-TRIAGED / UNKNOWN` |
| C31 | Fixed / sticky | `NOT-TRIAGED / UNKNOWN` |
| C32 | Pagination / physical page breaks | `NOT-TRIAGED / UNKNOWN` |
| C33 | CSS/WAAPI animations/transitions | `NOT-TRIAGED / UNKNOWN` |
| C34 | Animated image/GIF frame | `NOT-TRIAGED / UNKNOWN` |
| C35 | Mutation during preparation / beforeprint / physical render cut | `PARTIAL / L4 FINDING` |
| C36 | Same locator/URL, different resource bytes/generation | `NOT-TRIAGED / UNKNOWN` |
| C37 | Failure/retry/rollback/convergence | `NOT-TRIAGED / UNKNOWN` |
| C38 | Node/byte/time/resource budgets | `NOT-TRIAGED / UNKNOWN` |
| C39 | Privacy / data minimization | `NOT-TRIAGED / UNKNOWN` |
| C40 | Physical PDF bytes / cache identity | `L2-REVALIDATED / FINDING (P0-023, P0-079)` |
| C41 | Local download physical settlement / native Save As | `NOT-TRIAGED / UNKNOWN` |
| C42 | Yandex upload/object/public identity | `NOT-TRIAGED / UNKNOWN` |
| C43 | Journal / provenance / exact artifact linkage | `NOT-TRIAGED / UNKNOWN` |
| C44 | Backup / import / recovery | `NOT-TRIAGED / UNKNOWN` |
| C45 | Later reading / reopened PDF usefulness | `NOT-TRIAGED / UNKNOWN` |
| C46 | Real unpacked Chrome / permission UI / actual chrome.debugger extension path | `NOT-TRIAGED / UNKNOWN` |

## Coverage Sweep 1 — execution/authority skeleton

The first fresh sweep starts at the beginning of the real operation rather than at a previous historical gap. Planned source-first blocks:

1. manifest, permissions, extension entrypoints and trust boundaries;
2. popup current-tab admission and contextual/private-mode authority;
3. content-script injection/bootstrap ordering;
4. manual selection state and Include/Exclude authority;
5. SelectionSnapshot serialization/restore boundary;
6. auto/main-content admission;
7. same-origin frame recursion and geometry projection;
8. cross-origin frame-agent registration/command authority;
9. save metadata / exact URL/document/application generation capture;
10. print preparation mutations and rollback;
11. resource readiness/materialization;
12. debugger/Page.printToPDF physical-render boundary;
13. PDF cache/generation identity and retry;
14. automatic download/native Save As settlement;
15. Yandex auth/account/root/object/publication operation context;
16. Journal/provenance mutation and exact-artifact linkage;
17. backup/import/restore authority;
18. restart/recovery/late-settlement queues and boundedness;
19. privacy/redaction/minimization across durable surfaces;
20. truthful success/degraded/unknown/error UI and later-reading recovery.

The sweep will expand only where a newly discovered high-risk adjacent mechanism shares the same evidence stack. It will not create a P-code before duplicate/root-cause reconciliation.

## Fresh finding FRS-001 — private-context authority is still absent on current main

Fresh L1 inspection of current `manifest.json` and `popup.js` re-demonstrates an unresolved private-context boundary on the exact restart baseline:

- manifest uses the ordinary `service-worker.js` and does not install a dedicated incognito-context bootstrap/guard;
- popup calls `loadBackupStatus()` immediately on startup before classifying the active tab context;
- explicit cross-origin iframe permission flow obtains the active tab and proceeds into frame discovery / `chrome.permissions.request()` without an `incognito === false` admission gate;
- Start injects top content code, enables granted frame agents and starts selection without an incognito-context gate.

This is not a new owner. It is a fresh restart revalidation of existing **P0-045 ACTIVE**. Required next evidence for this row remains source-complete worker-side authority review plus fresh L2/L5 controls before any closure claim.

Affected restart coordinates currently remain nonterminal: C17, C39, C43/C44 contextual shared-state surfaces, and C46 real extension/private-context behavior.

## Fresh continuation checkpoint — selection and generation

`RESEARCH_FULL_RESTART_SELECTION_GENERATION_2026-09-01.md` records the accepted current Chrome 152 / deterministic tranche for C01–C03 plus narrow C16/C35 controls and C40 cache-generation authority. Its accepted external execution is workflow run `33500051622`, job `99831050769`, exact evidence head `d82f31f264c43ea1015cc1acc1c40ed390f33e6d`, conclusion SUCCESS.

The matrix above advances only those specifically exercised coordinates. No historical result is implicitly promoted and no P-owner status changes through this coverage update.

## Fresh continuation checkpoint — focused C04 ordinary DOM/text

`RESEARCH_FULL_RESTART_C04_ORDINARY_DOM_TEXT_2026-09-01.md` records the accepted focused C04 physical tranche. Its accepted execution is Chrome for Testing `152.0.7977.64`, workflow run `33503006214`, job `99840444990`, exact evidence head `3e55ab8a9c3965aedc9d3ad20ecc1b432f28d364`, conclusion SUCCESS.

Six physical PDF cases cover ordinary nested block/inline text, Cyrillic text, nested and inline Exclude behavior, `<br>`/`<pre>`/displayed entity text, visible heading/list/table-cell text order and multiple independent Includes. No C04-specific failure was observed, so C04 advances to `L4-REVALIDATED / PASS` within that explicit ordinary-DOM/text boundary.

A concurrent docs-only PR #109 recorded broader C04–C15 observations while this focused C04 evidence was being executed. Those broader observations remain available as supporting/reference evidence, but this matrix deliberately advances **only C04** under the current one-major-research-task-per-session rule. C05 and every later untested sequential coordinate remain unchanged here.

## Fresh continuation checkpoint — focused C05 geometry/layout

`RESEARCH_FULL_RESTART_C05_GEOMETRY_LAYOUT_2026-09-01.md` records the accepted focused C05 physical tranche. Its accepted execution is Chrome for Testing `152.0.7977.64`, workflow run `33506314081`, job `99851081249`, exact evidence head `9e59102234d8a9021a3c793a569161c461ea2958`, conclusion SUCCESS.

Fifteen physical PDF cases cover ordinary flow, flex, grid, inline fragmentation, relative/absolute/fixed positioning, selected descendant transforms, min/max/clamp sizing, page-owned width/transform contexts, nested percentage sizing, fixed table layout, vertical writing, multicolumn layout and Exclude-induced flex reflow. The acceptance model is scale-invariant where a uniform CSS-px -> PDF-point scaling is legitimate.

Fourteen cases are positive controls. `body_width_context` specifically demonstrates that root width normalization can change absolute CSS widths while preserving the selected/ancestor ratio in the physical PDF, so it is not misclassified as a defect. `body_transform_context` independently revalidates existing **P0-004 ACTIVE**: removing a page-owned ancestor transform changes the selected/ancestor geometry ratio materially beyond uniform page scaling. No new P-code is allocated.

C05 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE CONTROLS (P0-004)` within the explicit C05 boundary. C06 and every later untested sequential coordinate remain unchanged here.

## Fresh continuation checkpoint — focused C06 colors/backgrounds/compositing

`RESEARCH_FULL_RESTART_C06_COLORS_COMPOSITING_2026-09-01.md` records the accepted focused C06 physical tranche. Its accepted execution is Chrome for Testing `152.0.7977.64`, workflow run `33509590358`, job `99861754609`, exact evidence head `9e811cad5f7487651e51771602566ca13dbb78a1`, conclusion SUCCESS, artifact `9801146456`, artifact ZIP digest `sha256:af1622014f81f61d12a63abc101f8427d5517eb999a808f2a85f5044d4b007cf`.

Fresh positive controls physically preserve solid backgrounds, internal alpha compositing, gradients, borders/radius, box shadow, opacity, `filter:invert(1)`, internal `mix-blend-mode:screen`, and delayed `background-image` readiness. An outside-scope negative control confirms that arbitrary unselected colored content remains excluded.

Two independent compositing cases revalidate existing **P0-004 ACTIVE**. A selected semi-transparent red region changes from purple over the source blue root backdrop to pink over the normalized white print backdrop. A selected red `mix-blend-mode:screen` region changes from the source blended `[240,93,240]` appearance when its required blue sibling backdrop is visible to a different physical PDF appearance after that unselected dependency is hidden. Historical/current reconciliation confirms that P0-004 already owns unselected sibling/stacking/compositing/backdrop dependencies; no new P-code is allocated.

A delayed `background-image` positive control blocks preparation for about 3.2 seconds and physically renders after the current scanner admits it. In contrast, delayed `border-image-source` preparation returns in about 0.2 seconds with a clean report, its immediate PDF has zero red border-image pixels, and after settlement the same prepared page has `149480` red pixels. This independently revalidates existing **P1-003 ACTIVE** final visual-resource graph/readiness ownership.

C06 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE CONTROLS (P0-004, P1-003)` within the explicit C06 boundary. C07 and every later untested sequential coordinate remain unchanged here.

## Fresh continuation checkpoint — focused C07 fonts/typography

`RESEARCH_FULL_RESTART_C07_FONTS_TYPOGRAPHY_2026-09-01.md` records the accepted focused C07 physical tranche. Its accepted execution is Chrome for Testing `152.0.7977.64`, workflow run `33512505056`, job `99871390761`, exact evidence head `1b6a36b60adb6aa0f7e01cd962489bd3ae0915d7`, conclusion SUCCESS, artifact `9802235490`, artifact ZIP digest `sha256:d233fe0a85d964a9c073e963861c86fe5fc42dcd89c69f2042a103b8f6d9a87d`.

Top-document physical controls preserve font-size relationships, bold/italic state, letter spacing, line height, serif/monospace family metrics, decoration/text-shadow/stroke raster signal, multilingual text and current Chrome `text-wrap:balance` support. A delayed ordinary webfont is correctly awaited and embedded; an intentionally missing webfont is truthfully reported failed with fallback output.

A focused `unicode-range` fixture exposes a current **P1-003 ACTIVE** readiness gap. The selected text starts with more than the bounded 64-character font sample and ends in Cyrillic. Preparation returns in about 0.216 seconds with a clean attempted=loaded=1 report while the required Cyrillic face remains loading. The immediate physical PDF omits the selected logical text; after the same prepared page settles, the Cyrillic face loads, the selected text appears using `DejaVuSerif`, and the PDF SHA changes. The final accepted discriminator requires that exact physical before/after loss, so the finding is not based on report vocabulary alone.

Two same-origin flattened-frame controls freshly revalidate **P1-187 ACTIVE**. Basic explicitly copied typography remains intact, while advanced text shadow/stroke, word spacing, kerning, OpenType feature/ligature state, RTL/bidi semantics and rendered width change in the proxy. A separate frame-local `@font-face` is ready in the child but lost as effective font authority after flattening; the physical PDF falls back to `LiberationSans` and changes width materially. These are one secondary-representation root, not new owners per CSS property.

C07 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE CONTROLS (P1-003, P1-187)` within the explicit C07 boundary. C08 and every later untested sequential coordinate remain unchanged here.

## Fresh continuation checkpoint — focused C08 raster images / crop / object-fit

`RESEARCH_FULL_RESTART_C08_RASTER_IMAGES_2026-09-02.md` records the accepted focused C08 physical tranche. Its accepted execution is Chrome for Testing `152.0.7977.64`, workflow run `33535640665`, job `99949160705`, research head `0e0081b9cca8a4c8752e75e3fd8bad6f1903cefc`, GitHub PR synthetic merge checkout `cdd3e09fa72d28c48c0375fa3355762b11a5af55`, conclusion SUCCESS, artifact `9811522342`, artifact ZIP digest `sha256:bb9e6bb141b39ac9b6d388352d793fb95d8e9e52b57f705fde9626877eaf8744`.

Fresh positive controls physically preserve ordinary top-document `object-fit:cover` with both left and right `object-position`, preserve `contain` letterboxing, wait for a controlled approximately four-second delayed raster image, and truthfully report an intentionally broken selected image as `failed=1` / `image-load-error`.

A same-origin selected-BODY control freshly revalidates **P1-187 ACTIVE**. The child stylesheet renders a `400×200` red/blue image as `220×220 / object-fit:cover / object-position:left`, producing a red-only admitted crop. Current flattened representation does not copy the stylesheet-owned used dimensions/object-fit/object-position: the proxy becomes `400×200 / fill / center`, shows both red and blue, and the physical PDF preserves that wrong proxy state while the resource report remains clean. This is the existing flattened-secondary-representation root, not a new raster-specific owner.

C08 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE CONTROLS (P1-187)` within the explicit C08 boundary. C09 and every later untested sequential coordinate remain unchanged here.

## Fresh continuation checkpoint — focused C09 responsive images / `picture` / `srcset` / `currentSrc`

`RESEARCH_FULL_RESTART_C09_RESPONSIVE_IMAGES_2026-09-02.md` records the fresh C09 tranche on exact canonical source `da0775f0a06e58b12aabe53bfad80c9a76052c9c`, with exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`.

Local-first managed Chromium `144.0.7559.96` L3/L4 evidence was used because the current tool environment could physically execute CDP/PDF/raster checks without consuming a research GitHub Actions runner. Exact-source L1 inspection was bound separately to current GitHub `main`; `project_tools/research_c09_responsive_images.py` is the durable reproduction harness for a normal checkout.

Positive/negative controls show that ordinary top-document width-descriptor `srcset` stays on the admitted red candidate and a DPR-1 `1x/2x` image does not switch merely because iframe width changes. A plain flattened IMG also stays red when the admitted `currentSrc` is copied to `src` and IMG `srcset` is removed.

Two fresh findings reproduce existing owners. First, current selected-frame `width:100%` normalization changes a 420 px child from admitted red to 1200 px blue and the physical PDF contains only blue. Second, a child `<picture>` admitted as red is cloned into the top document with its responsive `<source>` still active; browser selection becomes blue even though cloned IMG `src` remains red, and the physical PDF contains blue. A test-only frozen control that removes the responsive `<source>` preserves red, proving the owner-document re-selection cause.

A delayed 2.5 s candidate introduced only by the flattened proxy freshly revalidates resource-readiness ownership: the first `Page.printToPDF` returns in `8.42 ms` while the proxy is still incomplete and produces a PDF with neither red nor blue; after settlement, the same representation prints blue. Thus the final representation can introduce a resource after the current single convergence barrier.

Fresh duplicate/root-cause reconciliation maps C09 to existing **P0-004 / P0-070 / P0-075 / P1-003 / P1-187 ACTIVE** owners, with P1-167 supporting the bounded preparation/diagnostic layer. Historical responsive evidence was used only for hypothesis/duplicate lookup; no historical PASS/FINDING itself advanced C09. No new P-code or owner status transition occurs.

C09 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE/NEGATIVE/CAUSAL CONTROLS (P0-004, P0-070, P0-075, P1-003, P1-187)`. C10 is the next sequential untriaged coordinate.

## Fresh continuation checkpoint — focused C10 SVG visual state/resources

`RESEARCH_FULL_RESTART_C10_SVG_VISUAL_STATE_2026-09-02.md` records the fresh C10 tranche on exact canonical source `be223420aa8b060526e1699c477e89f9f37bb0d0`. Local-first managed Chromium `144.0.7559.96` plus `Page.printToPDF`/PyMuPDF physical checks were used; generated PDFs remain untracked and the durable project harness is `project_tools/research_c10_svg_visual_state.py`.

Positive controls prove that current Chromium physically preserves ordinary inline SVG with local `clipPath`, SVG `<foreignObject>` content/text, and a self-contained local `<use href="#sym">` through an ordinary clone. These controls reject a blanket Chromium/PDF SVG limitation.

A delayed selected SVG `<image href>` exposes a fresh **P1-003 ACTIVE** readiness gap: the immediate `Page.printToPDF` cut returns in about `9.235 ms` with zero red pixels while the SVG image resource is still pending; after the same resource settles, the same SVG prints `30374` red pixels. Current explicit resource convergence has an HTML `IMG` task but no corresponding SVG `<image>` task, so print completion is not final SVG-resource readiness proof.

Two same-origin flattened-frame controls freshly revalidate **P1-187 ACTIVE**. Frame-local CSS `fill:red; stroke:blue; stroke-width:12px` becomes black fill / no stroke / 1px default in the proxy because SVG presentation properties are outside the current computed-style allowlist. Separately, relative SVG `<image href="asset.svg">` changes physical artwork from red to blue when flattening changes owner-document/base from `/nested/` to `/` while leaving the literal relative href unchanged.

Historical flattened-document namespace evidence was used only for duplicate/root-cause reconciliation. It already proves SVG fragment/gradient/`<use>` namespace collisions under the same secondary-representation family, so no new SVG-specific P-code is allocated. Registry status is unchanged.

C10 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE/CAUSAL CONTROLS (P1-003, P1-187)`. C11 — Canvas — is the next sequential untriaged coordinate.

## Fresh continuation checkpoint — focused C11 Canvas

`RESEARCH_FULL_RESTART_C11_CANVAS_2026-09-02.md` records the fresh C11 tranche on exact canonical source `b0e76d6c366434fbbd5feeb34af4ece7b0db1909`, with exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`.

Fresh source inspection finds no canvas-specific capture/materialization path. Local-first managed Chromium `144.0.7559.96` L3/L4 evidence physically proves that a top-document canvas and the same canvas printed directly inside an accessible child frame preserve the current red bitmap, while a production-shaped same-origin BODY `cloneNode(true)` preserves canvas dimensions/fallback DOM but loses the renderer-owned bitmap and prints blank.

A causal control copies the source canvas bitmap into the cloned target canvas before printing and restores the same red physical result. This directly revalidates existing **P1-187 ACTIVE**, whose canonical Registry wording already names canvas bitmap as required flattened rendered state. No new P-code is allocated.

A narrow live-mutation control additionally shows that a red canvas repainted blue before the render cut is physically printed blue. This is supporting evidence for existing exact-generation/isolation owners P0-070/P0-075 and C35, not a second C11 root or owner allocation.

External standards/comparable-tool research constrains the target architecture: WHATWG defines printed canvas as the current bitmap but also enforces origin-clean readback security; SingleFile documents that canvas image representation can sometimes be unavailable for security reasons. Therefore C11 does not prescribe unconditional `toDataURL()`/pixel readback. Safe bounded renderer-owned materialization or truthful degraded/unknown is required when preservation is unsupported, tainted or over budget.

C11 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE/CAUSAL CONTROLS (P1-187)`. C12 — Video / replaced media / current frame — is the next sequential untriaged coordinate.

## Fresh continuation checkpoint — focused C12 Video / replaced media / current frame

`RESEARCH_FULL_RESTART_C12_VIDEO_CURRENT_FRAME_2026-09-02.md` records the fresh C12 tranche on exact canonical source `335423d995b15d77869b6b6a6dc4fde700ebf688`, with exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`.

Fresh source inspection confirms that same-origin flattening copies video/media `src` and video `poster` but not `currentTime` or the decoded/composited current frame. A self-contained two-phase VP9 fixture (`0–1 s` red, `1–2 s` blue) avoids network timing. In Chromium `144.0.7559.96`, both top-document and direct child video paused at `1.5 s` physically print only blue (`130351` measured blue pixels). The production-shaped fully loaded clone resets to `currentTime=0` / `readyState=4` and physically prints only red (`130351` red pixels). A test-only seek of the final proxy back to `1.5 s` restores the blue physical result.

This is fresh direct revalidation of **P1-187 ACTIVE**: the final same-origin secondary representation preserves the media URL but not the admitted renderer-owned current video frame. P0-070/P0-075 remain supporting generation/isolation context. P1-003 remains adjacent resource-readiness ownership, but is deliberately not added to the fresh C12 outcome because this tranche did not physically prove a distinct delayed-media readiness failure.

External research reinforces the boundary rather than expanding scope: WHATWG defines paused video presentation by the current playback position/current frame; SingleFile documents security-related inability to snapshot some video elements; Browsertrix issues demonstrate that full streaming-media archival/replay is a separate resource problem. C12 therefore does not silently turn static current-frame fidelity into a promise to archive whole media streams.

C12 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE/CAUSAL CONTROLS (P1-187)`. C13 — Form / renderer-owned controls — is the next sequential untriaged coordinate.

## Fresh continuation checkpoint — focused C13 Form / renderer-owned controls

`RESEARCH_FULL_RESTART_C13_FORM_CONTROLS_2026-09-02.md` records the fresh C13 tranche on exact canonical source `77f6be5bbc67eb3193399ab182715e12369e7843`, with exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e` and exact `frame-proxy-inert-guard.js` blob `1197b4a5cf752c63ff3a3ecb3d1421aa51e59daa`.

Fresh source inspection shows that the flattened-frame `node.cloneNode(true)` call is intercepted by the P0-068 inert-clone guard. The guard constructs fresh elements from safe content attributes, marks HTML inert, disables form-control tags, and therefore bypasses browser element-specific cloning steps. Current post-clone URL/style materialization does not restore input/textarea values, checkedness/indeterminate, select selectedness or range state.

Managed Chromium `144.0.7559.96` L3/L4 controls distinguish the layers. Top-document and direct same-origin-frame PDFs preserve runtime `RUNTIME_INPUT`, `RUNTIME_TEXTAREA` and selected `RUNTIME_B`. Native Chromium cloning preserves input/textarea, checkbox indeterminate/checkedness, radio and range runtime state but reverts runtime select selectedness to markup defaults. The production-shaped WebClip inert mirror reverts all tested runtime-only control state to markup defaults (`RUNTIME_INPUT → DEFAULT_INPUT`, `RUNTIME_TEXTAREA → DEFAULT_TEXTAREA`, single select B → A, checkbox/radio/range to defaults) while remaining disabled/inert.

The production-shaped proxy PDF contains `DEFAULT_INPUT` / `DEFAULT_TEXTAREA` / `DEFAULT_A` rather than the admitted current text/select state. A causal final-proxy materialization pass restores `RUNTIME_INPUT`, `RUNTIME_TEXTAREA` and `RUNTIME_B` in the physical PDF while controls remain disabled/inert, proving a secondary-representation state gap rather than Chromium PDF inability or a requirement to re-enable interaction.

Fresh duplicate/root-cause reconciliation maps the failure to existing **P1-187 ACTIVE**. Historical capture-representation evidence had already treated browser-owned flattened state under P1-187, but it was used only for duplicate/hypothesis lookup and did not itself advance C13. P0-068 remains DONE: any P1-187 repair must preserve inertness and must not restore submission/action/event authority. Sensitive/password/autofill/file-picker semantics remain deferred to C39 privacy/data-minimization rather than being silently serialized.

C13 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE/NATIVE/CAUSAL CONTROLS (P1-187)`. C14 — Pseudo/generated content — is the next sequential untriaged coordinate.

## Fresh continuation checkpoint — focused C14 Pseudo/generated content

`RESEARCH_FULL_RESTART_C14_PSEUDO_GENERATED_2026-09-02.md` records the fresh C14 tranche on exact canonical source `baa0d0d747df5a0801511813c5a74913278733f8`, with exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`.

Fresh source inspection confirms that resource preparation derives CSS background/font work from ordinary selected DOM-element computed styles and does not acquire `::before` / `::after` / `::marker` computed resource state. Same-origin flattening clones real BODY DOM children and applies a bounded real-element computed-style allowlist; it does not explicitly reconstruct pseudo boxes.

Managed Chromium `144.0.7559.96` gives a clean positive control: direct top-document `::before` / DOM / `::after` text physically prints as `BEFORE_TOKEN BODY_TOKEN AFTER_TOKEN`. A generated-counter fixture then freshly revalidates **P0-004 ACTIVE**: full source prints `3. GAMMA`, but selected-only filtering that hides the two earlier counter-incrementing siblings prints `1. GAMMA`, proving that selected generated presentation can depend on unselected context.

A delayed 2.5 s image used only by `#x::before` freshly revalidates **P1-003 ACTIVE**. The real element reports `backgroundImage=none` while its pseudo reports the delayed URL; immediate physical PDF has `0` red pixels and SHA `317ef086fe610cc391a03c4c85435bcb19e79f51469e12414438259681d4d572`, whereas the settled PDF has `59643` red pixels and SHA `6b7bf9b66c5fdb604b68064ddf460f93e276b38c6a909cf186702a1edeb8624f`. `Page.printToPDF` is therefore not a substitute for the missing pseudo-resource readiness task.

A same-origin child `.x::before/.x::after` control freshly revalidates **P1-187 ACTIVE**. Direct child PDF contains `FRAME_BEFORE FRAME_BODY FRAME_AFTER`; after production-shaped BODY flattening the top proxy pseudo computed content is `none/none` and physical PDF contains only `FRAME_BODY`. Test-only static materialization of the admitted generated text into the final proxy restores `FRAME_BEFORE FRAME_BODY FRAME_AFTER`, proving a secondary-representation gap rather than Chromium PDF inability.

Historical pseudo/resource/counter findings were used only for duplicate/root-cause lookup. No new P-code is allocated and no owner status changes. C14 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE/CAUSAL CONTROLS (P0-004, P1-003, P1-187)`. C15 — Links / anchors / internal destinations — is the next sequential untriaged coordinate.

## Fresh continuation checkpoint — focused C15 Links / anchors / internal destinations

`RESEARCH_FULL_RESTART_C15_LINKS_ANCHORS_2026-09-02.md` records the fresh C15 tranche on exact canonical source `662bed0635d3cd909e4356fdc0b9cce5a2d7ae13`, with exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e` and `frame-proxy-inert-guard.js` blob `1197b4a5cf752c63ff3a3ecb3d1421aa51e59daa`.

Google Chrome `151.0.7922.173` provides clean native controls: direct top-document, current-shaped prepared top-document and direct child-document fragment links each produce a physical PDF annotation targeting page 1. Ordinary external, mail, telephone and image links remain URI annotations.

The production-shaped inert flattened-frame representation retains the visible destination text but strips its `id`, keeps the former child document's absolute fragment URL and emits no internal PDF destination. Instead, the annotation is a URI back to the child source URL. A test-only collision-safe final-document identity plus local fragment rewrite restores the internal target while preserving external/image URI controls.

Fresh duplicate/root-cause reconciliation maps the focused failure to existing **P1-187 ACTIVE**. No new P-code is allocated and no owner status changes. C15 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE/NATIVE/CAUSAL CONTROLS (P1-187)`.

## Fresh continuation checkpoint — focused C16 Same-origin iframe

`RESEARCH_FULL_RESTART_C16_SAME_ORIGIN_IFRAME_2026-09-02.md` records the accepted C16 exact-source physical tranche on canonical source `2bdd469be3e6a5a14f70123d42ec7fa01a7994e8`, exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`, evidence head `bda5f1e655e7276d6654a0a0051f97a184c4bb85`, Google Chrome `151.0.7922.173`, workflow run `33593581470`, job `100132387642`, conclusion SUCCESS and result JSON SHA-256 `73cc3a7f59c42cfa906cbc57132ee77c286199211df3c30ee544427975e05de3`.

Fresh positive controls reject the broad hypothesis that ordinary long live/nested same-origin selections necessarily clip: one-level BODY, long non-BODY, nested BODY and nested non-BODY cases preserve FIRST/MIDDLE/LAST through the physical PDF. A separate over-bound non-BODY case proves the narrower current failure: the frame requires approximately `210016px`, current stabilization applies about `200004px`, and the physical PDF loses the final selected sentinel/rows. Test-only top-document materialization of the same selected 4200-row content restores all rows and LAST.

Duplicate/root-cause reconciliation reactivates historical **P1-150 ACTIVE** rather than allocating a new P-code; **P0-004 ACTIVE** remains supporting selected-PDF completeness ownership. C16 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE/NESTED/CAUSAL CONTROLS (P1-150; P0-004 supporting)`. C17 — Cross-origin iframe capture/print boundary — is the next sequential coordinate.


## Fresh continuation checkpoint — focused C17 Cross-origin iframe

`RESEARCH_FULL_RESTART_C17_CROSS_ORIGIN_IFRAME_2026-09-02.md` records the accepted C17 exact-source physical tranche on canonical source `f1f5de60d7de901eb8249ae3376b07c29a196961`, exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`, exact `frame-agent.js` blob `ce55145dc7ee1a4abf485b7fad3134ac39b61751`, Google Chrome `151.0.7922.173`, workflow run `33596133152`, job `100139834463`, conclusion SUCCESS and result JSON SHA-256 `e85ec2f6f72e204de597ba5811abe27e7d1dd9db3bca448c7f83ab72948fe896`.

The one-level remote positive control receives one Include plus one nested Exclude and reaches current print preparation. Under the worker-shaped `screen` media cut, all 120 selected rows remain but the physical PDF also contains the explicit Exclude and 159 unselected child rows. The same prepared document under causal `print` media preserves 120/120 selected rows while omitting Exclude and all unselected child rows. Fresh source inspection confirms the cause: the child selected-only stylesheet is scoped to `@media print`, while the worker explicitly sets CDP media to `screen`; remote height is also measured before that selected-only representation becomes effective. This directly revalidates existing **P1-229 ACTIVE**.

A nested `top A -> cross-origin outer B -> same-origin inner B` control shows the outer agent active and selectable while the inner agent self-exits because its immediate parent is same-origin; top recursion cannot cross the outer SOP boundary, so inner selection remains unchanged. This strengthens existing **P1-004 ACTIVE** umbrella rather than allocating a new P-code. A supplementary geometry development run is retained only as rejected-harness provenance: after top had already expanded the iframe, child `scrollHeight` was lower-bounded by that viewport, invalidating a post-hoc shrink assertion; it does not change the accepted primary C17 result.

C17 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE/CAUSAL/NESTED-BOUNDARY CONTROLS (P1-229, P1-004 umbrella)`. Existing permission/session/print-generation/rollback owners remain open and C46 real unpacked permission/debugger UI is not claimed exercised. C18 — Shadow DOM / slots / composed tree — is the next sequential untriaged coordinate.

## Fresh continuation checkpoint — focused C18 Shadow DOM / slots / composed tree

`RESEARCH_FULL_RESTART_C18_SHADOW_DOM_2026-09-02.md` records the fresh C18 tranche on exact canonical source `3082da345ad49f10969211d20ad45d04bbb1238f`, with exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`.

Google Chrome `151.0.7922.173` exact-source evidence at workflow run `33599090493`, job `100148598093`, evidence head `2db00d627ca72b2281e8ac89e29a970e2629a49c`, conclusion SUCCESS, proves the current manual-selection boundary: composed clicks on open- or closed-shadow descendants are observed as the light-DOM host, while a slotted light-DOM node remains independently selectable. An attempted Exclude on an internal open-shadow descendant cannot create an internal Exclude and leaves the host Include unchanged.

A physical selected-host positive control contains both open-shadow descendants and the slotted token while excluding an outside light-DOM sibling. Thus the focused defect is not a blanket Chromium/PDF Shadow DOM rendering failure; it is the already-owned explicit-selection-scope product gap **P2-006 BACKLOG**. No new P-code or P0/P1 status transition occurs.

C18 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE PHYSICAL CONTROL (P2-006)`. C19 — Ordinary long-page existing content — is the next sequential coordinate.

## Fresh continuation checkpoint — focused C19 Ordinary long-page existing content

`RESEARCH_FULL_RESTART_C19_ORDINARY_LONG_PAGE_2026-09-02.md` records the fresh C19 tranche on exact canonical source `6c1c55a241d5df1bd464da5ab57ac2cbd89f5249`, with exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`.

Google Chrome `151.0.7922.173` exact-source physical evidence at workflow run `33599773162`, job `100150672109`, run head `97ddf3b8abc820e8fa06a0babfac0de80f0d581a`, conclusion SUCCESS, proves complete ordinary already-materialized top-document flow beyond the iframe-specific height guard. A selected `210192px` document preserves all 4200 rows and FIRST/MIDDLE/LAST through 206 physical PDF pages while omitting the explicit Exclude and both outside controls. Three far-separated Includes produce exactly the intended selected token set. Raw result SHA-256 is `55e50b601b94ffadfe58d0defda6ec6eae9a3e9cdcbb1e84d6ec37f9dc7ff9fc`.

No C19-specific defect was observed and no P-code changes. This fresh PASS is deliberately limited to ordinary already-mounted top-document content: P1-150 remains the iframe-specific >200000px owner and P1-230 dynamic/virtualized history remains outside this fixture.

C19 therefore advances to `L4-REVALIDATED / PASS`. C20 — Nested scroll / retained scrollports — is the next sequential coordinate.

## Fresh continuation checkpoint — focused C20 Nested scroll / retained scrollports

`RESEARCH_FULL_RESTART_C20_NESTED_SCROLL_2026-09-02.md` records the accepted C20 exact-source physical tranche on canonical source `ae2f6110901471b5a9968cc77c3a58dffe3d7700`, exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`, evidence head `7b48bd919e0ce6a16457893d50346abb0c929306`, Google Chrome `151.0.7922.173`, workflow run `33601196091`, job `100155044941`, conclusion SUCCESS and raw result SHA-256 `a58e76e49b94dd52f95257e507c1220b66c656d6222b21896ccb15104e78a89f`.

Fresh normal-flow control preserves all `120/120` mounted rows. Current WebClip keeps an ordinary selected `overflow:auto` scrollbox at its `360px` live viewport and physically preserves only rows `1…8`; moving the Include to the long descendant behind that retained ancestor still yields only `1…8`. Setting the same ancestor to `scrollTop=2404` changes the PDF to rows `58…65`. A two-level nested scrollport case preserves only rows `28…34`. Test-only static expansion of the exact prepared nested scrollports to auto height / visible overflow restores all `120/120` rows and FIRST/MIDDLE/LAST while Exclude and outside controls remain omitted.

Duplicate/root-cause reconciliation maps the fresh failure directly to existing **P0-004 ACTIVE**; no new P-code or Registry wording/status change is required. P1-230 remains the separate dynamic/virtualized user-reached-history owner and is not exercised because every C20 node already exists and remains mounted. C20 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE/SCROLL-POSITION/NESTED/CAUSAL CONTROLS (P0-004)`. C21 — Lazy/offscreen resources already belonging to content — is the next sequential coordinate.

## Fresh continuation checkpoint — focused C21 Lazy/offscreen resources already belonging to content

`RESEARCH_FULL_RESTART_C21_LAZY_OFFSCREEN_RESOURCES_2026-09-02.md` records the accepted C21 exact-source physical tranche on canonical source `c7f0416c356c7c6cca787bffcee00f68312ada4e`, exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`, Google Chrome `151.0.7922.173`, workflow run `33602471295`, job `100159038407`, exact accepted workflow head `aa3d291b83f5727e5f3db15d9c0052ccc294feab`, conclusion SUCCESS, primary raw result SHA-256 `3d78c8ba76617536baea85c765106049c61378fdcc7640117a371d76da43d614` and focused picture-control SHA-256 `93f688c8da66f853463bd6928ef5df5fb8082c8b1822ecc972ae0cd7bb27cfbd`.

Fresh positive controls prove that current bounded preparation loads and physically preserves far-offscreen native `IMG[loading=lazy]`, `IMG[data-src]`, `IMG[data-srcset]`, and an accessible same-origin-frame native lazy image without live-page auto-scroll. A narrower `<picture><source data-srcset>` case proves that URL completion is not final renderer-resource convergence: the expected candidate is requested and the resource report is clean, yet the owning IMG remains on its transparent fallback and the physical PDF contains zero expected orange pixels even after an additional 2.5-second settlement wait. Test-only final-IMG materialization of the already-known candidate restores the expected `220×140` image and `17,056` orange pixels.

Duplicate/root-cause reconciliation maps the fresh failure directly to existing **P1-003 ACTIVE**; no new P-code or Registry wording/status change is required. C09 responsive-image findings are adjacent context, while P1-167/C38 and P1-230/C22/C23 remain outside this bounded matrix. C21 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE/NATIVE/CUSTOM/FRAME/SETTLED/CAUSAL CONTROLS (P1-003)`. C22 — Scroll-triggered new logical content / user-reached max boundary — is the next sequential coordinate.

## Fresh continuation checkpoint — focused C22 User-reached dynamic scroll

`RESEARCH_FULL_RESTART_C22_USER_REACHED_DYNAMIC_SCROLL_2026-09-02.md` records the accepted C22 exact-source physical tranche on canonical source `05dc44e43765c37a24a8b4a6d6621c92e7e0b759`, exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`, Google Chrome `151.0.7922.173`, workflow run `33606163625`, job `100170513908`, exact accepted workflow head `a0f0ded486020e0b3b9405903f4b14fdd1717ff1`, conclusion SUCCESS and raw result SHA-256 `803d23630e2f50ee78446e532b489e936d08be7373c1c9411af03a921ca92911`.

The no-user-scroll control remains at exactly 20 additive items through current WebClip preparation and physical print, proving that the current save path does not auto-scroll/create N+1 content. A browser wheel trajectory grows the selected feed to 40, returns to `scrollY=0`, and the physical selected PDF preserves exactly items 1…40 while WebClip preparation/print creates no 41+ batch. Exclude/outside controls remain omitted.

Fresh source and actual save-request inspection still find no WebClip-owned generation-bound maximum user-reached boundary/history receipt: scroll handling is outline-update only and `userBoundaryMetaPaths=[]`. Duplicate/root-cause reconciliation therefore revalidates existing **P1-230 ACTIVE** without a new P-code or Registry change. C22 advances to `L4-REVALIDATED / FINDING + POSITIVE/NO-AUTOSCROLL/TRUSTED-WHEEL/SCROLL-BACK CONTROLS (P1-230)`. C23 — Virtualized/windowed content history within user-reached range — is the next sequential coordinate.

## Fresh continuation checkpoint — focused C23 Virtualized/windowed user-reached history

`RESEARCH_FULL_RESTART_C23_VIRTUALIZED_HISTORY_2026-09-02.md` records the accepted C23 exact-source physical tranche on canonical source `7d0774054d434b4dd897af3a14a51732018c4cb9`, exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`, Google Chrome `151.0.7922.173`, workflow run `33606883094`, job `100172789243`, exact accepted workflow head `355cc40f5d754b45d3da29c69fb466b50e187ef5`, conclusion SUCCESS and raw result SHA-256 `67d332fc775670fec9b2c42a4d6952a9f8df948f40d2e8789e246b18211d3964`.

A window-scrolling virtualizer reuses eight DOM rows. Browser wheel input gradually mounts every logical ID `1…57`; at the deepest point the current window is `50…57`, and after returning to `scrollY=0` the current DOM window is again `1…8` while the fixture still proves every `1…57` was actually mounted/seen. Current WebClip physical PDF after scroll-back contains only IDs `1…8`. Test-only static materialization of the exact seen history inside the same selected host restores IDs `1…57` and the reached-last sentinel, with Exclude/outside controls still omitted.

Duplicate/root-cause reconciliation maps this direct B6 history-loss finding to existing **P1-230 ACTIVE**. No new P-code or Registry wording/status change is required; C20 is excluded by fixture design because no retained nested scrollport exists. C23 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE/GRADUAL-WHEEL/SCROLL-BACK/RECYCLED-HISTORY/CAUSAL CONTROLS (P1-230)`. C24 — Spoilers/disclosures / inert expansion — is next.

## Delivery rule

This baseline is research evidence only. It does not change runtime, P-code status, manifest version or release readiness. Subsequent restart tranches update this document or add narrowly scoped durable evidence only when the current tree has actually been inspected/tested.