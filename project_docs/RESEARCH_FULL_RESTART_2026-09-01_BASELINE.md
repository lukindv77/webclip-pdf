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
| C24 | Spoilers/disclosures / inert expansion | `L4-REVALIDATED / FINDING + POSITIVE/GUARDED-ACTIVATION/INERT-STATIC/NAMED-DETAILS/CAUSAL CONTROLS (P0-075, P0-070, P0-004; P1-167 supporting)` |
| C25 | Dialog / popover / top layer | `L4-REVALIDATED / FINDING + POSITIVE/AUTO-LIGHT-DISMISS/MANUAL/MODAL/CLOSED/FRAME/CAUSAL CONTROLS (P0-075, P0-070, P1-187; P0-004 supporting)` |
| C26 | Hover exclusion | `L4-REVALIDATED / FINDING + POSITIVE/NATIVE/PAGE-CLEANED/FRAME/CAUSAL CONTROLS (P0-075, P0-070, P0-004)` |
| C27 | Focus / selection / interaction-induced page state | `L4-REVALIDATED / FINDING + POSITIVE/NATIVE/TRUSTED-CLICK/EXPLICIT-FOCUS/REFOCUS/SELECTION/FRAME/CAUSAL CONTROLS (P0-075, P0-070, P0-004; P1-187 supporting)` |
| C28 | Responsive/environment state | `L4-REVALIDATED / FINDING + POSITIVE/NARROW/DPR/SCHEME/FRAME/CAUSAL CONTROLS (P0-070, P0-004)` |
| C29 | Viewport units / container-query dependent geometry | `L4-REVALIDATED / FINDING + POSITIVE/DIRECT/ALIGNED/CONTAINER/FROZEN/CAUSAL CONTROLS (P0-070, P0-004)` |
| C30 | Clipping / overflow / paint containment | `L4-REVALIDATED / FINDING + POSITIVE/HIDDEN/CLIP/PAINT/CLIP-PATH/CAUSAL CONTROLS (P0-004)` |
| C31 | Fixed / sticky | `L4-REVALIDATED / FINDING + POSITIVE/FIXED-REPEAT/STICKY/TRANSFORMED/FRAME/CAUSAL CONTROLS (P0-004; P1-187 supporting)` |
| C32 | Pagination / physical page breaks | `L4-REVALIDATED / FINDING + POSITIVE/FORCED/ROOT-OVERRIDE/DESCENDANT-AVOID/OVERSIZED/WIDOW-ORPHAN/FRAME/RASTER/CAUSAL CONTROLS (P1-187)` |
| C33 | CSS/WAAPI animations/transitions | `L4-REVALIDATED / FINDING + POSITIVE/CSS/WAAPI/TRANSITION/PAUSED/FROZEN/FRAME/CAUSAL CONTROLS (P0-070, P1-187; P0-075 supporting)` |
| C34 | Animated image/GIF frame | `L4-REVALIDATED / FINDING + POSITIVE/DIRECT/STATIC-PNG/ADMISSION-RASTER/EMBEDDED-IMAGE/CAUSAL CONTROLS (P0-004, P0-070; P1-003 supporting)` |
| C35 | Mutation during preparation / beforeprint / physical render cut | `L4-REVALIDATED / FINDING + POSITIVE/PREPARATION/RENDER-STATE/BEFOREPRINT-GUARD/POST-CUT/FROZEN/CAUSAL CONTROLS (P0-070, P0-075, P0-004; P0-071 positive)` |
| C36 | Same locator/URL, different resource bytes/generation | `L4-REVALIDATED / FINDING + POSITIVE/STABLE-IMG/SAME-URL/SRCSET/BACKGROUND/CACHE-EVICTION/FROZEN/CAUSAL CONTROLS (P0-070, P0-004; P1-003 supporting)` |
| C37 | Failure/retry/rollback/convergence | `L4-REVALIDATED / FINDING + POSITIVE/CLEAN-RETRY/STALE-RESOURCE/DETACHED-LINK/WRAPPER-TOPOLOGY CONTROLS (P1-218, P1-219, P1-221; P1-199, P1-214 supporting/source)` |
| C38 | Node/byte/time/resource budgets | `L4-REVALIDATED / FINDING + POSITIVE/PREFLIGHT/SCAN-CAP/LINK-COLLECTOR/DIAGNOSTIC/DISCLOSURE/RESOURCE-PROMOTION CONTROLS (P1-167, P1-003; P1-154 supporting/source)` |
| C39 | Privacy / data minimization | `L4-REVALIDATED / FINDING + POSITIVE/PHYSICAL-PDF-TEXT/URI/SELECTION-SNAPSHOT/DURABLE-FLOW/SANITIZED CONTROLS (P0-066, P1-182; P0-045 supporting/source, P0-033 positive)` |
| C40 | Physical PDF bytes / cache identity | `L4-REVALIDATED / FINDING + POSITIVE/PHYSICAL-PDF/SAME-URL/ACTUAL-IDB/MUTABLE-KEY/IMMUTABLE-KEY CONTROLS (P0-023, P0-079; P0-070 supporting)` |
| C41 | Local download physical settlement / native Save As | `L4-REVALIDATED / PARTIAL/FINDING + POSITIVE/REAL-AUTOMATIC-DOWNLOAD/EXACT-ID/LATE-SETTLEMENT/PREPARED-STARTED-RELEASE/PAGE-OWNER CONTROLS; NATIVE-L5 OPEN (P1-146, P1-156; P1-064 supporting, P0-039/P0-048 positive)` |
| C42 | Yandex upload/object/public identity | `NOT-TRIAGED / UNKNOWN` |
| C43 | Journal / provenance / exact artifact linkage | `L4-REVALIDATED / PARTIAL/FINDING + POSITIVE/PHYSICAL-PDF/LOCAL-CHECKPOINT/ATOMIC-STALE-FINALIZATION/DIGEST-BOUND CONTROL; REMOTE-L5 OPEN (P0-070; P0-076 positive, P1-206/P1-190/P1-216 supporting/source)` |
| C44 | Backup / import / recovery | `L4-REVALIDATED / PARTIAL/FINDING + POSITIVE/REAL-UNPACKED/PRODUCTION-EXPORT-BLOB/ACTUAL-UI-IMPORT/FULL-BROWSER-RESTART/TRANSFER-PERSISTENCE/FRESH-RETRY/LEASE/CAS CONTROLS + PREVIEW-TO-COMMIT-RETARGET/STALE-REVISION/RECOVERY-CLEAR/RESTART-RESUME-LOSS/ORPHAN-STAGING FINDINGS; NATIVE-SAVE-AS/MERGE/REMOTE-L5 OPEN (P0-013, P0-072, P1-207, P1-215; P1-194 supporting; P0-077 positive)` |
| C45 | Later reading / reopened PDF usefulness | `L4-REVALIDATED / PARTIAL/FINDING + POSITIVE/PHYSICAL-PDF/TWO-INDEPENDENT-READERS/SELECTED-SCOPE/SEARCHABLE-TEXT/METADATA/EXTERNAL-URI/INTERNAL-DESTINATION/DEGRADED-DIAGNOSTIC CONTROLS + FAILED-RESOURCE-URI-QUERY FINDING; GUI/NATIVE-ACTIVATION-L5 OPEN (P0-066; P1-003 positive; P0-004/P1-187 supporting)` |
| C46 | Real unpacked Chrome / permission UI / actual chrome.debugger extension path | `L4-REVALIDATED / PARTIAL/FINDING + POSITIVE/REAL-UNPACKED/PRODUCTION-RENDER-STATE/PRODUCTION-DEBUGGER/PHYSICAL-PDF/DETACH-CLEANUP CONTROLS; NATIVE-PERMISSION/INCOGNITO/REVOKE-REGRANT/RESTART-L5 OPEN (P0-045, P1-157, P1-193, P1-201; P1-004 umbrella; P0-071 positive)` |

### Published open-task projection — C41–C46

This projection makes the remaining fresh-restart work executable without changing Registry ownership. Every row is **OPEN**; owner lists are existing direct/candidate owners for duplicate reconciliation, not new assignments or status changes.

| ID | Status | Next falsifiable task / exit evidence | Existing owner map | Required boundary |
|---|---|---|---|---|
| C41 | OPEN — L4 partial; native/restart L5 remains | In real interactive unpacked Chrome, exercise automatic response-loss/worker restart and native Save As success, cancel/unresolved dialog, owner-page/worker restart and retry; reconcile exact DownloadItem terminality and prove one durable intent maps to at most one DownloadItem and one truthful Journal/OperationLog outcome. | P1-146, P1-156; P1-064 supporting, P0-039/P0-048 positive | B6/B7/B8/B9; real Downloads UI/native dialog/restart (L5) |
| C42 | OPEN — unknown | With an explicitly authorized test account/root, bind upload/retry/unknown recovery/publication to exact PDF bytes, immutable account/root/config generation and exact remote object identity; record real object/public-link receipts. | P0-073, P0-074, P0-078, P1-184 | B7/B8; real Yandex account/network (L5) |
| C43 | OPEN — L4 partial; remote exact-object linkage remains | With an explicitly authorized Yandex test context, carry one exact PDF digest through immutable cache/remote checkpoint/upload/object/publication/final Journal append and reconcile it after unknown/retry; keep the accepted local stale-finalization CAS control and prove the remote object/public link belongs to that exact digest and operation generation. | P0-070; P0-076 positive, P1-206/P1-190/P1-216 supporting/source | B2/B6/B7/B8; real Yandex object/publication L5 plus exact digest provenance |
| C44 | OPEN — L4 partial; local discovery complete; post-remediation/native/merge/remote remain | Implement one immutable preview receipt bound to selected-backup digest, staging generation, expected Journal revision and explicit mode; add bounded lease plus restart resume/cancel/orphan reclamation; preserve or reconcile admitted side-effect checkpoints; rerun the accepted real-UI retarget/stale/restart matrix and prove fail-closed behavior. Record merge as unsupported or specify/test it separately. | P0-013, P0-072, P1-207, P1-215; P1-194 supporting; P0-077 DONE positive | B2/B6/B7/B8/B9; local post-remediation L4 first, native Save As and authorized remote context remain L5 |
| C45 | OPEN — L4 finding/positive; GUI/native activation L5 remains | Reopen the accepted degraded physical PDF in a real GUI reader, perform actual text selection/search, and activate the intended external and internal links. After P0-066 remediation, prove that the failed-resource target is omitted or query-sanitized while the visible degraded warning remains truthful and remains bound to the exact admitted artifact. | P0-066 direct; P1-003 positive; P0-004/P1-187 supporting | B6/B9; real GUI reader/native link activation plus post-remediation physical artifact (L5) |
| C46 | OPEN — L4 partial; native permission/incognito/revoke/restart L5 remains | In real interactive unpacked Chrome, exercise normal/incognito windows, the native optional-host permission prompt, revoke/regrant, service-worker/browser restart and browser-initiated debugger detach/recovery. Keep the accepted production `generatePdfBlob`/physical-PDF/normal-detach control and prove fail-closed private state plus exact permission/session/generation cleanup across restart. | P0-045, P1-157, P1-193, P1-201; P1-004 umbrella; P0-071 positive | B1/B2/B5/B6/B7/B9; production debugger L4 accepted, remaining user-owned/restart boundaries L5 |

Execution stays sequential unless an earlier row exposes a cross-boundary blocker. **C41 remains blocked on real native/restart L5; C42 remains blocked on an explicitly authorized Yandex test account/root; C43 remote shares the C42 external prerequisite. C44 now has accepted real-UI/full-browser-restart L4 evidence; its next local work is post-remediation digest/revision/lease/checkpoint closure, while native Save As, merge decision and remote recovery remain open. C45 has accepted degraded-resource physical-PDF L4 evidence and a P0-066 failed-resource URI-query finding; GUI/native activation and post-remediation proof remain L5 open. C46 has accepted production real-unpacked debugger/physical-PDF/normal-detach L4 evidence; its native permission, incognito, revoke/regrant, browser-initiated detach and restart boundaries remain L5 open.** External-account/user-owned UI work must not be simulated as L5; unavailable external prerequisites remain explicit blockers rather than inferred success.


## Fresh continuation checkpoint — focused C44 Backup / import / recovery

`RESEARCH_FULL_RESTART_C44_BACKUP_IMPORT_RECOVERY_2026-09-03.md` now records two accepted complementary tranches. The latest production-path tranche uses canonical source `4f23eb5b1c063b25f650a24969bafec1cca18c17`, Chrome `152.0.7977.54`, workflow run `33787642007`, job `100756187928`, exact accepted workflow head `917143718e565b2845f30dbdc5da43706100532c`, conclusion SUCCESS, result SHA-256 `9011a72b205b6304826e021fc509d650cd6cb92b041d056507aa31a6385f8e18` and retained machine-receipt artifact id `9906045429`. The earlier Chrome `151.0.7922.173` IDB/race tranche remains accepted at run `33723881258`, job `100548527410`, result SHA-256 `56f54b8e797f88361c9ba18c6359609a8a9401d53074afe35c7b8111095ca045`.

The real unpacked journal page now physically covers production export prepare/serialization, actual file-input transfer staging, visible destructive confirmation, production replace commit and a full browser-process restart in a disposable profile. The versioned envelope roundtrip is positive. A defensive causal integrity schedule proves the confirmation is not byte-bound: confirmation describes valid synthetic backup A, but changing the same mutable staging key to valid backup B causes production commit to import B. A concurrent Journal entry admitted after preview disappears, and production replace clears all three pending recovery stores.

Full restart preserves transfer rows and Journal/recovery state but does not restore confirmation, selected File or operation id. A fresh retry succeeds and consumes its new staging while the abandoned pre-restart generation remains orphaned. Earlier fixed-TTL/lease and expected-revision CAS controls remain the causal feasibility evidence.

Duplicate/root-cause reconciliation keeps **P0-013 / P0-072 / P1-207 / P1-215 ACTIVE**, with **P1-194 ACTIVE** supporting storage-durability semantics; **P0-077 DONE** remains positive only. No new P-code, Registry wording/status, runtime/version or release change is warranted. C44 advances to `L4-REVALIDATED / PARTIAL/FINDING + POSITIVE/REAL-UNPACKED/PRODUCTION-EXPORT-BLOB/ACTUAL-UI-IMPORT/FULL-BROWSER-RESTART/TRANSFER-PERSISTENCE/FRESH-RETRY/LEASE/CAS CONTROLS + PREVIEW-TO-COMMIT-RETARGET/STALE-REVISION/RECOVERY-CLEAR/RESTART-RESUME-LOSS/ORPHAN-STAGING FINDINGS; NATIVE-SAVE-AS/MERGE/REMOTE-L5 OPEN (P0-013, P0-072, P1-207, P1-215; P1-194 supporting; P0-077 positive)`.

C44 remains OPEN, but its local discovery reproduction is complete. The next local exit task is post-remediation: bind immutable backup digest/staging/revision/mode, add bounded lease plus restart resume/cancel/orphan reclamation, preserve or reconcile pending side-effect checkpoints, and rerun the accepted actual-UI schedules. Native Save As stays user-owned L5; remote recovery requires an explicitly authorized isolated Yandex context; merge must be an explicit product decision or separately specified implementation.

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


## Fresh continuation checkpoint — focused C24 Spoilers/disclosures / inert expansion

`RESEARCH_FULL_RESTART_C24_INERT_DISCLOSURE_2026-09-02.md` records the fresh C24 exact-source physical tranche on canonical source `c2f4648cf073070f74c188e7ff9f50d3e30ed05b`, exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`, exact host-control guard blob `5b98e046a69f5389271f626536b02e6f073ca7fb`, Google Chrome `151.0.7922.173`, workflow run `33608253236`, job `100177131433`, exact accepted workflow head `445866d20f2caec910db6edb853b428524b9d51f` and conclusion SUCCESS.

Fresh production-shaped evidence corrects the older unguarded C24 narrative: P0-067's current isolated-world activation guard blocks all four tested page-owned programmatic disclosure clicks (`blockedPageClicks=4`, page `clicks=[]`, `submits=0`), so P0-067 remains DONE. C24 nevertheless remains a finding because current live `details.open=true` fires page-observable state transition and can admit post-admission page-created content into the physical PDF; fallback ARIA/hidden-panel expansion directly mutates the live source and persists after print; no `sourceState/staticRepresentation` disclosure receipt is emitted.

A disconnected static-materialization causal control preserves all tested pre-existing disclosure content with zero source click/submit/toggle-created/stateful-created content and leaves the source native details closed. A fresh `<details name="faq">` control additionally proves that live mutually-exclusive widget semantics can defeat the product's safe expanded-static completeness contract: current preparation leaves only one group member open/printed, while a private static representation can preserve both bodies without mutating source state.

Duplicate/root-cause reconciliation maps the remaining C24 failures to existing **P0-075 / P0-070 / P0-004 ACTIVE**, with **P1-167 ACTIVE** supporting bounded-preparation ownership. **P1-004 ACTIVE** remains the source-level cross-origin disclosure-parity umbrella. No new P-code or Registry status change is warranted. C24 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE/GUARDED-ACTIVATION/INERT-STATIC/NAMED-DETAILS/CAUSAL CONTROLS (P0-075, P0-070, P0-004; P1-167 supporting)`. C25 — Dialog / popover / top layer — is the next sequential coordinate.


## Fresh continuation checkpoint — focused C25 Dialog / popover / top layer

`RESEARCH_FULL_RESTART_C25_TOP_LAYER_2026-09-02.md` records the fresh C25 exact-source physical tranche on canonical source `6e61f8db7b77737c34a8290cea11bc8b8aff51e6`, exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e` and Google Chrome `151.0.7922.173`.

Fresh top-document controls distinguish browser semantics from WebClip drift. An open selected `popover=auto` physically prints with its backdrop when no trusted review click intervenes, but the real trusted WebClip `Готово` click light-dismisses it before render; save still proceeds and the selected token/backdrop disappear. The same click leaves `popover=manual` open and printable. A page `dialog.showModal()` keeps its own modal/backdrop state but makes WebClip same-document Finish UI inert; test-only forced preparation proves Chromium can physically print that admitted modal state. Corrected closed-state and genuinely-marked Exclude controls both pass.

Fresh same-origin BODY flattening independently revalidates **P1-187 ACTIVE**. Source popover starts `:popover-open=true`; the final proxy contains the popover text but `:popover-open=false`, and native child backdrop signal falls from `472830` blue pixels to `0`. Test-only top-layer re-entry on the connected final proxy restores about `388963` backdrop pixels while keeping Exclude omitted.

Accepted case-level execution: workflow run `33610993477`, job `100185833170`, exact head `040bee0dc466e9dec376405de6e0b48c9f7feb50`, SUCCESS, raw result SHA-256 `940b81c1b1ae52c0e7e1808e84daaa10e27605a36d4510989f758192d1fc732f`. Accepted final controls: run `33611864788`, job `100188651541`, exact head `c2bea7a0bf0d0454d55cb23ca570e0134cff44ad`, SUCCESS, raw result SHA-256 `1af09abbf1b44d257dc420d55a84791874c341506d81e644541a02fa4de8cc48`.

Duplicate/root-cause reconciliation maps C25 to existing **P0-075 / P0-070 / P1-187 ACTIVE**, with **P0-004 ACTIVE** supporting physical selected-copy consequences. No new P-code or Registry status/writing change is warranted. C25 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE/AUTO-LIGHT-DISMISS/MANUAL/MODAL/CLOSED/FRAME/CAUSAL CONTROLS (P0-075, P0-070, P1-187; P0-004 supporting)`. C26 — Hover exclusion — is the next sequential coordinate.
## Fresh continuation checkpoint — focused C26 Hover exclusion

`RESEARCH_FULL_RESTART_C26_HOVER_EXCLUSION_2026-09-02.md` records the fresh C26 exact-source physical tranche on canonical source `c5834ba0eb75fbf0ac1c637f42d7da1bff24b429`, exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`, Google Chrome `151.0.7922.173`, workflow run `33618234004`, job `100208967903`, exact accepted workflow head `be799886020c68e8984958d4843bf0709c56159e`, conclusion SUCCESS and raw result SHA-256 `a487b7773a8741ae530b45b15acfc92b7d54142cffb6d1db605c0a3b74435f62`.

Native Chrome physically prints active CSS hover, hover pseudo-content and page-JS hover-mounted DOM. Current WebClip's full-screen review backdrop changes hit-testing and fires page-observable `pointerleave`: ordinary CSS/pseudo hover clears, but a page-JS flyout deliberately retained after leave remains selected DOM and reaches the physical PDF. A page-owned cleanup control removes it, same-origin selected BODY flattening repeats the sticky-DOM result, and a test-only provenance control removes exactly the hover-created node while preserving legitimate pre-existing content, a non-hover dialog, Exclude and outside-shell boundaries.

Duplicate/root-cause reconciliation maps the fresh failure to existing **P0-075 / P0-070 / P0-004 ACTIVE**. Historical reservation against a standalone P1-231 remains correct: no new P-code or Registry wording/status change is warranted. C26 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE/NATIVE/PAGE-CLEANED/FRAME/CAUSAL CONTROLS (P0-075, P0-070, P0-004)`. C27 — Focus / selection / interaction-induced page state — is the next sequential coordinate.

## Fresh continuation checkpoint — focused C27 Focus / selection / interaction-induced page state

`RESEARCH_FULL_RESTART_C27_FOCUS_SELECTION_STATE_2026-09-02.md` records the fresh C27 exact-source physical tranche on canonical source `6fa613f24116c48a76ee45d7bf75d127884e79f5`, exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`, Google Chrome `151.0.7922.173`, workflow run `33620748418`, job `100216951047`, exact accepted workflow head `903d432f1d4f047f71b5f21e7cd11821ba2b3957`, conclusion SUCCESS and raw result SHA-256 `03b91d0f683b924de2ebea3a73749a2e38203a8d259cd5a3e2b3c44da230d036`.

Native Chrome preserves material `:focus`, `:focus-within` and `:focus-visible` presentation in physical PDF. Current WebClip's real trusted Finish activation and explicit review textarea focus instead dispatch page-observable `change → blur → focusout` before isolation; a blur-created mutation reaches the selected PDF while focus-only presentation is lost. Post-hoc refocus restores pixels but neither rolls back the blur mutation nor avoids a new focus mutation. Same-origin BODY flattening repeats the boundary. A live DOM Selection Range survives, but Chrome omits the visible `::selection` overlay. A pre-interaction disconnected static causal receipt preserves admitted focus pixels and content while excluding the later blur mutation.

Duplicate/root-cause reconciliation maps C27 to existing **P0-075 / P0-070 / P0-004 ACTIVE**, with **P1-187 ACTIVE** supporting frame parity. No new P-code or Registry wording/status change is warranted. C27 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE/NATIVE/TRUSTED-CLICK/EXPLICIT-FOCUS/REFOCUS/SELECTION/FRAME/CAUSAL CONTROLS (P0-075, P0-070, P0-004; P1-187 supporting)`. C28 — Responsive/environment state — remains the next unstarted sequential coordinate.


## Fresh continuation checkpoint — focused C28 Responsive/environment state

`RESEARCH_FULL_RESTART_C28_RESPONSIVE_ENVIRONMENT_2026-09-02.md` records the accepted C28 exact-source physical tranche on canonical source `880256a7d6bfd612c3abdd5f11c0ffdd33190033`, exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`, Google Chrome `151.0.7922.173`, workflow run `33623739974`, job `100226506745`, exact accepted workflow head `4280a1b33c321bcff7de234ebb459c20dbe45e3b`, conclusion SUCCESS and raw result SHA-256 `9715b5f36b39d9331302b815f7637ee12e286dd590d9090c5ac114991ac159d4`.

A source `1200×700`, DPR2, dark desktop/landscape representation remains desktop/landscape in live `matchMedia()` through both beforeprint observers, yet production-shaped `media:'screen'` + A4 portrait physical PDF selects the mobile/portrait branches while retaining DPR2/dark. The generated request already contains bounded diagnostic `viewportWidth`/`viewportHeight`; those values do not freeze renderer representation. Test-only CDP width/height/orientation media features also fail to prevent the switch. A bounded admission-style used-state materialization restores desktop/landscape under the same A4 renderer, while a narrow mobile/portrait source is a positive control. Same-origin BODY flattening is also positive in this coordinate because copied used state preserves the child desktop/landscape branch.

Duplicate/root-cause reconciliation maps C28 to existing **P0-070 / P0-004 ACTIVE**. P0-075 is not needed because the drift reproduces without WebClip UI interaction; P1-187 is a positive rather than a fresh finding here. No new P-code or Registry wording/status change is warranted. C28 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE/NARROW/DPR/SCHEME/FRAME/CAUSAL CONTROLS (P0-070, P0-004)`. C29 — Viewport units / container-query dependent geometry — is the next sequential coordinate.


## Fresh continuation checkpoint — focused C29 Viewport units / container-query dependent geometry

`RESEARCH_FULL_RESTART_C29_VIEWPORT_CONTAINER_GEOMETRY_2026-09-02.md` records the accepted C29 exact-source physical tranche on canonical source `4508b7abce73366fd796c0d662f15d3bbb112df8`, exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`, Google Chrome `151.0.7922.173`, workflow run `33626492404`, job `100235352749`, exact accepted workflow head `78ae97da0b1741529ec9736ab06ca25c608bc49d`, conclusion SUCCESS and raw result SHA-256 `b3d60e267efe3797f877ea1266fe94c1f084ce875a6ac1bc81b9d8a787d33d0a`.

At the admitted 1200×800 screen state, `50vw=600px`, the percentage query container is about `937.6px`, its `50cqw` child is about `458.8px`, and the container-query branch is WIDE. Current WebClip preparation and `beforeprint` continue to report that source-like geometry, yet the physical A4 PDF contains the NARROW branch. Direct Chromium and a source already aligned to 703×1031 produce the same scale-invariant physical geometry ratios as current WebClip (`viewport/fixed≈1.04`, `cqw/fixed≈0.779`). An explicit 800px query-container remains WIDE, rejecting a generic container-query failure.

A test-only freeze of admitted source used geometry into explicit pixel values preserves the WIDE branch and restores source-shaped physical ratios (`viewport/fixed≈1.542`, `cqw/fixed≈1.176`) while Exclude and outside-scope controls remain omitted. Two earlier runs are retained as rejected harness hypotheses: `beforeprint` was not a receipt of final paged used geometry, and absolute PDF pixel widths were not comparable across differently page-fitted documents; the accepted gate uses within-PDF scale-invariant ratios.

Duplicate/root-cause reconciliation maps C29 to existing **P0-070 / P0-004 ACTIVE**. No new P-code, Registry wording/status or runtime/release change is warranted. C29 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE/DIRECT/ALIGNED/CONTAINER/FROZEN/CAUSAL CONTROLS (P0-070, P0-004)`. C30 — Clipping / overflow / paint containment — is the next sequential coordinate.

## Fresh continuation checkpoint — focused C30 Clipping / overflow / paint containment

`RESEARCH_FULL_RESTART_C30_CLIPPING_CONTAINMENT_2026-09-02.md` records the accepted fresh C30 exact-source physical tranche on canonical source `cd0f1d6aaf5bc874a2b8e791c2c0fd2c6a52fbd0`, exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`, Google Chrome `151.0.7922.173`, workflow run `33635043627`, job `100263691851`, exact workflow head `6969bcbfcf07d46fddf559fb1fe50dbe5f487ed3`, conclusion SUCCESS and accepted raw result SHA-256 `b45411ad9a8abdba69b438c29b69007714ccf7618879864918e562629f34dfca`.

Fresh current-path physical results preserve only `8/120` mounted selected rows under `overflow:hidden`, `overflow:clip`, and `contain:paint` even when the latter keeps authored `overflow:visible`. A separate `clip-path:inset(0)` variant preserves only 40 unique rows and loses LAST. In contrast, `contain:layout` and `max-height:360px + overflow:visible` preserve `120/120`, rejecting a broad height/containment hypothesis. Test-only normalization of the exact prepared hidden/paint ancestors to auto-height, visible overflow, `contain:none` and no clip-path restores `120/120` while Exclude/outside controls remain omitted.

Duplicate/root-cause reconciliation maps C30 directly to existing **P0-004 ACTIVE**; C20 remains adjacent retained-scrollport evidence under the same owner. No new P-code, Registry wording/status, runtime or release change is warranted. C30 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE/HIDDEN/CLIP/PAINT/CLIP-PATH/CAUSAL CONTROLS (P0-004)`. C31 — Fixed / sticky — is the next sequential coordinate.

## Fresh continuation checkpoint — focused C31 Fixed / sticky

`RESEARCH_FULL_RESTART_C31_FIXED_STICKY_2026-09-02.md` records the accepted fresh C31 exact-source physical tranche on canonical source `2b47d4f47a90882b2c3466e8af9f5b7b8477a015`, exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`, Google Chrome `151.0.7922.173`, workflow run `33636534741`, job `100268696867`, exact workflow head `a3ee43fa8e03219023b7240095c7b8f7d5a414ff` and conclusion SUCCESS.

Fresh physical output preserves all 120 selected rows in the top-document cases, but one admitted `position:fixed` token is repeated exactly `6` times across `6` PDF pages because current top preparation keeps viewport-fixed semantics. The sticky control occurs once, fixed inside a transformed containing block occurs once, unrelated unselected fixed content occurs zero times, and test-only fixed→static normalization reduces the admitted fixed token to one occurrence without losing selected content. Same-origin BODY flattening already converts fixed and sticky proxy descendants to `position:static`, and each appears once, proving a representation-path semantic split.

Duplicate/root-cause reconciliation maps the top-document repeated presentation directly to existing **P0-004 ACTIVE**, with **P1-187 ACTIVE** supporting frame-parity evidence. No new P-code, Registry wording/status, runtime or release change is warranted. C31 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE/FIXED-REPEAT/STICKY/TRANSFORMED/FRAME/CAUSAL CONTROLS (P0-004; P1-187 supporting)`. C32 — Pagination / physical page breaks — is the next sequential coordinate.


## Fresh continuation checkpoint — focused C32 Pagination / physical page breaks

`RESEARCH_FULL_RESTART_C32_PAGINATION_BREAKS_2026-09-02.md` records the accepted fresh C32 exact-source physical tranche on canonical source `dc068bf6a378f8846d57660303415d5761a32045`, exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`, Google Chrome `151.0.7922.173`, workflow run `33647162999`, job `100304713322`, exact workflow head `e177f6cfc4e22972daf6bffe54ab5030b9883071`, conclusion SUCCESS, primary result SHA-256 `851c17097ccc32b83c4d59aadf8a92ecc3e72aded30545b6d16e0ef54bbf9cdf` and raster-boundary result SHA-256 `af1430c3b7819b6d91210a68d25d0dc068366ee883a214d1cfa391cc47c1fa13`.

Fresh top-document controls preserve descendant `break-before:page`, descendant `break-inside:avoid-page`, oversized avoided content and `widows/orphans`; all selected tokens remain complete. WebClip explicitly normalizes an Include-root authored `avoid-page` to `auto`, changing page grouping but not content/order; reasserting only that root avoid hint moves the complete block to the next page. A red/green raster control independently proves the forced boundary is visibly painted on separate pages rather than existing only in the PDF text layer.

The material C32 finding is representation-path parity: an equivalent frame source computes `break-before=page` / `break-inside=avoid-page` and physically spans two pages, while the current same-origin BODY flattened proxy computes those descendants as `auto` / `auto` and puts all tokens on one page. Duplicate/root-cause reconciliation maps this directly to existing **P1-187 ACTIVE** rendered-state fidelity. No new P-code, Registry wording/status, runtime or release change is warranted. C32 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE/FORCED/ROOT-OVERRIDE/DESCENDANT-AVOID/OVERSIZED/WIDOW-ORPHAN/FRAME/RASTER/CAUSAL CONTROLS (P1-187)`. C33 — CSS/WAAPI animations/transitions — is the next sequential coordinate.


## Fresh continuation checkpoint — focused C33 CSS/WAAPI animations/transitions

`RESEARCH_FULL_RESTART_C33_CSS_WAAPI_TEMPORAL_2026-09-02.md` records the accepted fresh C33 exact-source physical tranche on canonical source `72a2efc2ca298b623d5650d44f8430163f0aa876`, exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`, exact `pdf-print-guard.js` blob `423c79143df37a80fbabf8cbbf7570a4a2ca4e2a`, Google Chrome `151.0.7922.173`, workflow run `33650829793`, job `100317097988`, exact workflow head `eea937d13bc5eb66a930a530c624d5f44e649845`, conclusion SUCCESS and raw result SHA-256 `29d5a8cbda55f1edcc2a7e91150a94a8029aa5a429050af73026a2f22c5b2388`.

Fresh top-document evidence proves CSS animation, WAAPI animation and CSS transition advance materially after admission and the physical PDF reflects the later render-cut phase rather than the admitted phase. Already-paused and sampled/frozen controls remain stable and physically reproduce the sampled state, proving current Chrome can serialize a stable non-zero temporal presentation when the final representation is made time-invariant. The current render-cut script-execution guard is therefore not a temporal timeline snapshot, and actual save metadata contains no temporal phase receipt.

Same-origin BODY flattening independently revalidates **P1-187 ACTIVE**: the source has one running WAAPI animation and non-zero sampled transform, while the final proxy has zero animations, `transform:none`, and zero temporal displacement. Applying only the admitted sampled transform to the final proxy restores the temporal displacement in physical PDF. The top-document drift maps primarily to **P0-070 ACTIVE**; **P0-075 ACTIVE** remains supporting isolation architecture. No new P-code or Registry wording/status change is warranted. C33 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE/CSS/WAAPI/TRANSITION/PAUSED/FROZEN/FRAME/CAUSAL CONTROLS (P0-070, P1-187; P0-075 supporting)`. C34 — Animated image/GIF frame — is the next sequential coordinate.


## Fresh continuation checkpoint — focused C34 Animated image/GIF frame

`RESEARCH_FULL_RESTART_C34_ANIMATED_IMAGE_FRAME_2026-09-02.md` records the accepted C34 exact-source tranche on canonical source `ba76db1e68ed2855f29fc040ed0ad40bfb898a7f`, exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`, Chrome `151.0.7922.173`, workflow run `33655118948`, job `100331638249`, exact workflow head `ceb314d811404886cdbfdcd93321015ce8011c07`, conclusion SUCCESS and result SHA-256 `734d5ece256669f898aa1d1bca141f358c0bf610e06f5027dd12da2981ddf844`.

The admitted GIF is directly observed on its green second frame (`30,800` green pixels), while direct Chromium and the current WebClip selected PDF both serialize an embedded red first/default frame. WebClip's resource report remains clean (`attempted=2, loaded=2, failed=0`). A static green PNG and the exact green admission screenshot bytes re-served as a static PNG both remain green embedded images through the same WebClip PDF path. This separates renderer-resource readiness from admitted current-frame fidelity.

Duplicate/root-cause reconciliation maps C34 to existing **P0-004 / P0-070 ACTIVE**, with **P1-003 ACTIVE** supporting readiness semantics. No new P-code or Registry status/writing change is warranted. C34 advances to `L4-REVALIDATED / FINDING + POSITIVE/DIRECT/STATIC-PNG/ADMISSION-RASTER/EMBEDDED-IMAGE/CAUSAL CONTROLS (P0-004, P0-070; P1-003 supporting)`. C35 — Mutation during preparation / beforeprint / physical render cut — is next and requires completion/revalidation of its current `PARTIAL / L4 FINDING` state.


## Fresh continuation checkpoint — focused C35 Mutation during preparation / beforeprint / physical render cut

`RESEARCH_FULL_RESTART_C35_RENDER_CUT_MUTATION_2026-09-02.md` records the accepted fresh C35 exact-source tranche on canonical source `14619bd29c15f4ef901717afdf2ba7b8e8899818`, exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`, exact `pdf-print-guard.js` blob `423c79143df37a80fbabf8cbbf7570a4a2ca4e2a`, Chrome `152.0.7977.64`, workflow run `33656551111`, job `100336418242`, exact workflow head `0a91fdc8d290b5dc0752f5f2dba4bfbc93af0b8a`, conclusion SUCCESS and result SHA-256 `a6ce6374c9c99809021c10a17dd8d94461abad4f7f42befd9569e45d69c7dd30`.

Fresh evidence narrows the historical render-cut mutation surface. Current P0-071 script fencing suppresses the tested hostile `beforeprint` listener and its queued microtask, so P0-071 remains DONE. The remaining failure occurs before that fence: page MutationObservers react to WebClip print-header insertion during `prepareForPrint` and to live `WEBCLIP_PRINT_RENDER_STATE hidden:true`, append new content inside selected scope, and those post-admission nodes enter the immutable PDF. A mutation added only after `Page.printToPDF` returns is absent from already-generated bytes. A page-non-authoritative frozen admitted representation preserves the admitted selected payload without any preparation/render-state/beforeprint/post-cut mutation tokens.

Duplicate/root-cause reconciliation maps C35 to existing **P0-070 / P0-075 / P0-004 ACTIVE**, with **P0-071 DONE** as a positive current guard control. No new P-code or Registry wording/status change is warranted. C35 advances to `L4-REVALIDATED / FINDING + POSITIVE/PREPARATION/RENDER-STATE/BEFOREPRINT-GUARD/POST-CUT/FROZEN/CAUSAL CONTROLS (P0-070, P0-075, P0-004; P0-071 positive)`. C36 — Same locator/URL, different resource bytes/generation — is the next sequential coordinate.


## Fresh continuation checkpoint — focused C36 Same locator/URL, different resource bytes/generation

`RESEARCH_FULL_RESTART_C36_RESOURCE_BYTE_GENERATION_2026-09-02.md` records the accepted fresh C36 exact-source tranche on canonical source `b6b008dceec0b787ca1283e6c822fcd5f3abddcb`, exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`, Chrome `152.0.7977.64`, workflow run `33658450070`, job `100342779251`, exact workflow head `c7ddbbd54b8c83d69b67f312a21a324a2bac211e`, conclusion SUCCESS, main result SHA-256 `0e364a58fc95ae41aa74f92c98d26c9272ce5fba029f7b2441f2b9c38932265e` and cache-eviction result SHA-256 `1d46d8ea5e36f042f1463d5f59944165f9123684dded7ee21272a6e86dd52257`.

Fresh controls prove that ordinary already-decoded IMG/currentSrc reuse can preserve admitted bytes despite a newer server generation, and a frozen admission-byte data URL remains stable. The decisive case clears browser cache after admitted red pixels, changes the origin to green bytes at the exact same URL, then lets current WebClip promote same-URL `data-srcset`. Browser candidate resolution fetches green; DOM locator, src/currentSrc URL and natural dimensions remain textually unchanged, but physical PDF changes from admitted red to green. A background control separately fetches green during readiness probing while final PDF remains red despite a clean loaded report, proving URL task settlement is not final renderer byte-generation identity.

Duplicate/root-cause reconciliation maps C36 to existing **P0-070 / P0-004 ACTIVE**, with **P1-003 ACTIVE** supporting readiness/provenance. C40/P0-023/P0-079 are not exercised because no PDF retry/cache reuse occurs. No new P-code or Registry wording/status change is warranted. C36 advances to `L4-REVALIDATED / FINDING + POSITIVE/STABLE-IMG/SAME-URL/SRCSET/BACKGROUND/CACHE-EVICTION/FROZEN/CAUSAL CONTROLS (P0-070, P0-004; P1-003 supporting)`. C37 — Failure / retry / rollback / convergence — is the next sequential coordinate.


## Fresh continuation checkpoint — focused C37 Failure / retry / rollback / convergence

`RESEARCH_FULL_RESTART_C37_FAILURE_RETRY_ROLLBACK_2026-09-03.md` records the accepted fresh C37 exact-source tranche on canonical source `a6be4cfdb7a3affd385479f04d333e75847ee94c`, exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`, Google Chrome `151.0.7922.173`, workflow run `33702598102`, job `100484895616`, exact accepted workflow head `f5516c6f33e379d3fb9f99c0dcf666bda208d441`, conclusion SUCCESS and raw result SHA-256 `206ee2c9991f20864bc9f24e6c34fcbdd4e74e59c4d60914b58c137c4f9ddc36`.

Fresh clean retry is a positive convergence control: after a failure and after a successful retry, temporary header/style/wrapper/link-marker counts return to zero and the retry PDF remains selection-correct. Three host-supersession schedules remain broken: stale resource rollback overwrites a newer host `src` and the retry physically serializes the old red candidate (**P1-218**); wrapper cleanup disconnects a page-added child inserted after WebClip wrapped the image (**P1-219**); and a detached normalized link skips cleanup, then retry turns the temporary absolute href into the new rollback identity and permanently loses the authored relative href (**P1-221**).

Current source still exposes the already-owned remote restore ordering/settlement boundary under **P1-199/P1-214** (fire-and-forget restore followed by a second awaited call after shared bookkeeping may already be consumed), but C37 does not claim a fresh remote-frame L4 result. No new P-code, Registry wording/status, runtime or release change is warranted. C37 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE/CLEAN-RETRY/STALE-RESOURCE/DETACHED-LINK/WRAPPER-TOPOLOGY CONTROLS (P1-218, P1-219, P1-221; P1-199, P1-214 supporting/source)`. C38 — Node / byte / time / resource budgets — is the next sequential coordinate.

## Fresh continuation checkpoint — focused C38 Node / byte / time / resource budgets

`RESEARCH_FULL_RESTART_C38_NODE_BYTE_TIME_RESOURCE_BUDGETS_2026-09-03.md` records the accepted fresh C38 exact-source tranche on canonical source `b07547385c5aed6a631d7e263f1f9d9c35da2c56`, exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`, Google Chrome `151.0.7922.173`, workflow run `33707672607`, job `100500232853`, exact accepted workflow head `2696ad9b2f9b19f9cdbbeb985af80feb14944dc2`, conclusion SUCCESS and raw result SHA-256 `145f435455e14115676e09b764b89032b178339114fd96c59d41260c572b6456`.

Fresh positive controls show that the flattened-frame preflight rejects node `5001` against the `5000`-node budget before full materialization and that the resource selected-element TreeWalker truncates at `5000` on a `12002`-descendant selection. Neighboring preparation domains remain independently unbounded: the link collector materializes and marks all `12000` matching links despite resource `scanTruncated=true`; `400` disclosure controls take about `17.10s` while the nominal `15000ms` resource deadline still reports `deadlineExceeded=false`; diagnostics materialize a full `2,097,152`-character body string before bounded output; and `800` lazy images trigger `800` URL promotions/HTTP requests even though resource task/report admission stops at `500`.

Duplicate/root-cause reconciliation maps the shared node/time/mutation/string preparation budget finding to **P1-167 ACTIVE** and the pre-admission resource/network side-effect finding to **P1-003 ACTIVE**, with **P1-154 ACTIVE** supporting/source. **P0-064 DONE** remains a positive architecture example and is not reopened. No new P-code, Registry wording/status, runtime or release change is warranted. C38 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE/PREFLIGHT/SCAN-CAP/LINK-COLLECTOR/DIAGNOSTIC/DISCLOSURE/RESOURCE-PROMOTION CONTROLS (P1-167, P1-003; P1-154 supporting/source)`. C39 — Privacy / data minimization — is the next sequential coordinate.

## Fresh continuation checkpoint — focused C39 Privacy / data minimization

`RESEARCH_FULL_RESTART_C39_PRIVACY_DATA_MINIMIZATION_2026-09-03.md` records the accepted fresh C39 exact-source tranche on canonical source `00871591c4ddea4680e54b03ad05e2390c9f9605`, exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`, exact `service-worker.js` blob `cffe46adbd0227bae51c95462d6d705b264838fe`, Google Chrome `151.0.7922.173`, workflow run `33713855080`, job `100518803841`, exact accepted workflow head `100940228d20b942a535c90eb62c1794dabcb59d`, conclusion SUCCESS and raw result SHA-256 `5374f858d32c0e50a3acaa0b6d1443d86486366b169205a85deee44dde8f56c5`.

Fresh physical evidence shows that synthetic query/fragment secrets from `location.href` enter visible PDF text, while a selected-content query secret enters an actual PDF `/URI` annotation. The actual SelectionSnapshot retains selected/parent/neighbor plaintext plus raw `href` and `src` markers. Exact-source durable-flow projection keeps userinfo/query data across cache, pending, Journal, template and export surfaces; current normalization removes only fragments from derived keys/templates. A single test-only origin/path projection removes all synthetic secrets from physical PDF text/URIs and every modeled durable surface while preserving selected content and usable links.

Duplicate/root-cause reconciliation maps the URL/display/durable finding to **P0-066 ACTIVE** and portable locator-context finding to **P1-182 ACTIVE**, with **P0-045 ACTIVE** supporting/source for the popup's unfenced persistent-status/permission boundary. **P0-033 DONE** remains a positive OperationLog redaction example. No new P-code, Registry wording/status, runtime or release change is warranted. C39 advances to `L4-REVALIDATED / FINDING + POSITIVE/PHYSICAL-PDF-TEXT/URI/SELECTION-SNAPSHOT/DURABLE-FLOW/SANITIZED CONTROLS (P0-066, P1-182; P0-045 supporting/source, P0-033 positive)`. C40 — Physical PDF bytes / cache identity — is the next sequential coordinate.

## Fresh continuation checkpoint — focused C40 Physical PDF bytes / cache identity

`RESEARCH_FULL_RESTART_C40_PHYSICAL_PDF_CACHE_IDENTITY_2026-09-03.md` records the accepted fresh C40 exact-source physical tranche on canonical source `6960fab35f914b1e1e3ffe1bafa3d1f8d7ca144e`, exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`, exact `service-worker.js` blob `cffe46adbd0227bae51c95462d6d705b264838fe`, exact `offscreen.js` blob `a5f84b928e530222c50c704b80ab30418349f68e`, Google Chrome `152.0.7977.64`, workflow run `33715164705`, job `100522698189`, exact accepted workflow head `577322daad134340d21a16a7938ff24c95c16174`, conclusion SUCCESS and result SHA-256 `658deaf3cd10c6b07734ea57c75f7397a4e1e931649a1046162618f851e4c034`.

Two current-path physical PDFs generated from the exact same URL have distinct SHA-256 values and mutually exclusive A/B text markers. In a real browser IndexedDB using the production cache schema, generation B overwrites `tab:77`; a retry for doc-A and a deferred offscreen-key dereference for op-A both resolve B's exact PDF hash, `doc-B` and `op-B`. Immutable operation/document keys preserve both exact hashes as the causal positive control.

Duplicate/root-cause reconciliation confirms existing **P0-023 / P0-079 ACTIVE**, with **P0-070 ACTIVE** supporting exact generation authority. No new P-code, Registry wording/status, runtime or release change is warranted. C40 advances to `L4-REVALIDATED / FINDING + POSITIVE/PHYSICAL-PDF/SAME-URL/ACTUAL-IDB/MUTABLE-KEY/IMMUTABLE-KEY CONTROLS (P0-023, P0-079; P0-070 supporting)` and leaves the open-task projection.

## Fresh continuation checkpoint — focused C41 Local download settlement / native Save As

`RESEARCH_FULL_RESTART_C41_LOCAL_DOWNLOAD_SAVE_AS_2026-09-03.md` records the accepted C41 tranche on the same canonical source and workflow run `33715164705` / job `100522698189`, exact accepted workflow head `577322daad134340d21a16a7938ff24c95c16174`, Google Chrome `152.0.7977.64`, conclusion SUCCESS and result SHA-256 `97f930df52c66a40bf7832d9d09b6347bc80af9f24d7db948287e4a6c4f0190a`.

The real unpacked automatic path creates one 29,827-byte PDF plus a Journal entry. Current-source controls pass for durable pre-start intent, one-call/late settlement, exact Blob/DownloadItem identity, unknown retention and PREPARED/STARTED/RELEASE ordering. The Save As page-owner browser control also proves one untimed pending call and no premature caller release, but uses a mocked Downloads API and does not exercise the native file chooser.

Fresh source evidence retains five material P1-156 gaps: the common 16-minute Blob TTL can expire PREPARED bytes before the native dialog settles; page loss can occur after a numeric id but before STARTED delivery; the worker watcher is armed before durable STARTED and is not reconstructed after restart; STARTED does not validate all immutable PREPARED fields; and Journal export STARTED is recorded as terminal OperationLog success before physical DownloadItem completion. Duplicate/root-cause reconciliation keeps **P1-146 / P1-156 ACTIVE**, with **P1-064 ACTIVE** supporting and **P0-039/P0-048 DONE** positive.

C41 advances to `L4-REVALIDATED / PARTIAL/FINDING + POSITIVE/REAL-AUTOMATIC-DOWNLOAD/EXACT-ID/LATE-SETTLEMENT/PREPARED-STARTED-RELEASE/PAGE-OWNER CONTROLS; NATIVE-L5 OPEN (P1-146, P1-156; P1-064 supporting, P0-039/P0-048 positive)`. It remains the next open coordinate for real automatic-response-loss/worker-restart and native Save As success/cancel/unresolved-dialog plus owner-page/worker-restart evidence; C42 stays queued.


## Fresh continuation checkpoint — focused C43 Journal / provenance / exact artifact linkage

`RESEARCH_FULL_RESTART_C43_JOURNAL_PROVENANCE_2026-09-03.md` records the accepted local C43 tranche on canonical source `ddb56d6b7c7ceabb3dcfefcfc80d0d288e9efb28`, Chrome `151.0.7922.173`, workflow run `33720292239`, job `100537851083`, exact accepted workflow head `f727a96e77a748fce23dfa9ad97485cc6bf20c75`, conclusion SUCCESS and result SHA-256 `ed8ae54695d688d644407e4549c3a525de36be313039285744231a4b7d940149`.

Two current-path physical PDFs from the same URL had distinct hashes (`6ebc998486a22afdc620a87d2d8fcf4f2d29b06f87a27d2848cfb9ee662e58f6` and `91b6127452b44c40e6508c55b948e2b81d9f0dbbea08014b713c9e367770a677`). Current pending-Journal normalization and PDF-cache metadata carry operation/Journal identity and byte length but no cryptographic PDF digest, so those receipts do not by themselves prove which exact bytes reach finalization. A digest-bound control rejects the substituted physical generation.

Current `appendJournalEntry()` remains a positive stale-finalization control: required durable and pending checkpoints are re-read on the append write path, a concurrently removed durable checkpoint sets `durableCheckpointMissing` instead of resurrecting stale in-memory metadata, and the successful append path touches the Journal DB revision. This preserves P0-076's CAS direction but does not close P0-070's end-to-end exact-generation requirement.

Duplicate/root-cause reconciliation maps the physical-byte/provenance gap to **P0-070 ACTIVE**. **P0-076 ACTIVE** is positive here; **P1-206/P1-190/P1-216 ACTIVE** remain supporting/source contracts with different direct root causes. No new P-code or Registry wording/status change is warranted. C43 advances to `L4-REVALIDATED / PARTIAL/FINDING + POSITIVE/PHYSICAL-PDF/LOCAL-CHECKPOINT/ATOMIC-STALE-FINALIZATION/DIGEST-BOUND CONTROL; REMOTE-L5 OPEN (P0-070; P0-076 positive, P1-206/P1-190/P1-216 supporting/source)`. The remote object/public-link digest chain remains blocked on the same explicitly authorized Yandex prerequisite as C42.

## Fresh continuation checkpoint — focused C45 degraded-resource truth

`RESEARCH_FULL_RESTART_C45_REOPENED_PDF_USEFULNESS_2026-09-03.md` now records the accepted degraded-resource C45 tranche on canonical source `e7db9600ad1710c8996fc1d22da42dec7295ab82`, exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`, Chrome `151.0.7922.173`, workflow run `33755066731`, job `100647417146`, exact accepted workflow head `daedc5cb95de26dc103a498c0b39d49ed0bf5eb4`, conclusion SUCCESS, result SHA-256 `1a0f0ef5f8a4f53b33bfaa6dae932e571b821e30591019113eb2e16b8229421f` and physical PDF SHA-256 `a647a28ac104efa29b72b61a6b8685241440ab211ec6b42415e1e81aeedc8fa8`.

The admitted request reports four attempted resources, three loaded and one failed broken image. Both pypdf and PyMuPDF reopen the exact physical PDF and confirm selected scope, searchable text, title metadata, the intended external URI, an internal destination and a visible failed-resource warning. The printed diagnostic strips the synthetic query token, but both parsers recover that token from two URI annotations for the failed image. Current `wrapUnlinkedImagesForPdf()` uses the exact `currentSrc || src` as a temporary link target, while only the diagnostic label is sanitized.

Duplicate/root-cause reconciliation maps the physical URI-query persistence finding directly to **P0-066 ACTIVE**. **P1-003 ACTIVE** is a positive bounded resource-truth control; **P0-004/P1-187 ACTIVE** remain supporting fidelity/link context. No new P-code, Registry wording/status, runtime/version or release change is warranted. C45 advances to `L4-REVALIDATED / PARTIAL/FINDING + POSITIVE/PHYSICAL-PDF/TWO-INDEPENDENT-READERS/SELECTED-SCOPE/SEARCHABLE-TEXT/METADATA/EXTERNAL-URI/INTERNAL-DESTINATION/DEGRADED-DIAGNOSTIC CONTROLS + FAILED-RESOURCE-URI-QUERY FINDING; GUI/NATIVE-ACTIVATION-L5 OPEN (P0-066; P1-003 positive; P0-004/P1-187 supporting)`.

## Delivery rule

This baseline is research evidence only. It does not change runtime, P-code status, manifest version or release readiness. Subsequent restart tranches update this document or add narrowly scoped durable evidence only when the current tree has actually been inspected/tested.

