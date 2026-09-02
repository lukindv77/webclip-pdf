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
| C13 | Form / renderer-owned controls | `NOT-TRIAGED / UNKNOWN` |
| C14 | Pseudo/generated content | `NOT-TRIAGED / UNKNOWN` |
| C15 | Links / anchors / internal destinations | `NOT-TRIAGED / UNKNOWN` |
| C16 | Same-origin iframe | `PARTIAL / L4 POSITIVE CONTROLS` |
| C17 | Cross-origin iframe capture/print boundary | `NOT-TRIAGED / UNKNOWN` |
| C18 | Shadow DOM / slots / composed tree | `NOT-TRIAGED / UNKNOWN` |
| C19 | Ordinary long-page existing content | `NOT-TRIAGED / UNKNOWN` |
| C20 | Nested scroll / retained scrollports | `NOT-TRIAGED / UNKNOWN` |
| C21 | Lazy/offscreen resources already belonging to content | `NOT-TRIAGED / UNKNOWN` |
| C22 | Scroll-triggered new logical content / user-reached max boundary | `NOT-TRIAGED / UNKNOWN` |
| C23 | Virtualized/windowed content history within user-reached range | `NOT-TRIAGED / UNKNOWN` |
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

## Delivery rule

This baseline is research evidence only. It does not change runtime, P-code status, manifest version or release readiness. Subsequent restart tranches update this document or add narrowly scoped durable evidence only when the current tree has actually been inspected/tested.