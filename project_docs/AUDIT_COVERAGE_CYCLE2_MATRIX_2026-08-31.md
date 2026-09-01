# WebClip — Cycle 2 Coverage Sweep / Matrix v2 — 2026-08-31

Date: 2026-09-01 checkpoint update

Campaign: `DEEP-AUDIT-CYCLE-2-2026-08-31`.

Canonical baseline for the original sweep: `main = 7a0280851133dbf87e3b25b90dbdd4c4ed5e4217`.

Latest deep-dive checkpoints:

- T1/PD2: `AUDIT_CYCLE2_T1_VIEW_TRANSITION_RENDER_CUT_2026-08-31.md`;
- T2/PD3: `AUDIT_CYCLE2_T2_PSEUDO_TOP_LAYER_SCROLL_MARKER_2026-08-31.md`;
- T3/PD5+PD6: `AUDIT_CYCLE2_T3_TEXT_FIT_PAGE_MARGIN_SAFETY_2026-08-31.md`;
- T4/PD4: `AUDIT_CYCLE2_T4_SCOPED_CUSTOM_ELEMENT_REGISTRY_2026-08-31.md`;
- T5/PD1: `AUDIT_CYCLE2_T5_SCROLL_TRIGGERED_ANIMATION_2026-09-01.md`, executed from canonical `main = 7b74ca7d6202f03342546da2dd46cfb98e25ad82` on Chrome for Testing 152.0.7977.64.

`AUDIT_REGISTRY.md` remains the only P-code owner/status authority. Cycle-1 evidence is reused only for exact claims that survive Change Impact. Current-family coverage completion does not imply implementation closure, critical-finding closure or release readiness.

## 1. Sweep method

Every C01…C46 family remains visible. `CARRY-FORWARD` means the previous required evidence remains applicable. A newly introduced stable-browser semantic remains `REVALIDATION-REQUIRED` until the required current evidence is reached. `EXTERNAL-REQUIRED` remains explicit where the true boundary is L5.

## 2. Cycle-2 family matrix

| ID | Surface family | Relevance | Required | Reusable strongest evidence | Cycle-2 coverage / outcome | Change Impact / current conclusion | Owner / boundary context |
|---|---|---|---|---|---|---|---|
| C01 | Manual Include/Exclude / selected-scope authority | RELEVANT | L2+L3+L4 | selection/cascade/save-freeze/physical PDF | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | Exclude repeated as physical control through current tranches | P0-004/P0-070/P0-075 + selection owners |
| C02 | SelectionSnapshot restore -> admitted rendered target -> saved copy | RELEVANT | L3+L4 | restore + physical decoy/stale/frame controls | `ARTIFACT-COVERED / FINDING` | PD4: same ordinary host identity can restore registry-A snapshot to registry-B with zero ambiguity; PDF follows B | P1-001/P0-080; P0-070/P0-075/P0-004 support |
| C03 | Main Content / auto candidate -> actual saved scope | RELEVANT | L3+L4 | current-source + physical main-content controls | `ARTIFACT-COVERED / FINDING` | PD4: stronger scoped-shadow main article is invisible to document-oriented auto discovery | P1-160; P0-080/P0-070/P0-075/P0-004 support |
| C04 | Ordinary DOM/text baseline | RELEVANT | L2+L4 | searchable-text physical controls | `ARTIFACT-COVERED / PASS-CONTROL` **CARRY-FORWARD** | baseline remains valid | baseline control |
| C05 | Geometry/layout | RELEVANT | L3+L4 | complex layout/viewport/typography/long-page physical evidence | `ARTIFACT-COVERED / FINDING` | PD5: admitted fitted geometry can be refit at render cut | P0-070/P0-075/P0-004; P1-187 support |
| C06 | Colors/backgrounds/compositing | RELEVANT | L3+L4 | CSS visual dependency/frame/post-freeze physical evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | no independent new stable semantic gap | P1-003/P1-187/P0-004/P0-075 |
| C07 | Fonts/typography | RELEVANT | L3+L4 | physical font/layout/page-count controls | `ARTIFACT-COVERED / FINDING` | PD5 `text-fit` used typography can change after admission | P0-070/P0-075/P0-004; P1-187/P1-003 support |
| C08 | Raster images / crop/object-fit | RELEVANT | L3+L4 | physical resource/crop evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | EI3 raises closure priority only | P1-003/P1-187/P0-004 |
| C09 | Responsive images / picture/srcset/currentSrc | RELEVANT | L3+L4 | physical responsive candidate identity | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | no new currentSrc gap | P1-003/P1-187/P0-070/P0-075 |
| C10 | SVG visual state/resources | RELEVANT | L3+L4 | physical SVG/resource/namespace/paint evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | EI3 priority only | P1-187/P1-003/P0-068/P0-004 |
| C11 | Canvas | RELEVANT | L3+L4 | frame/post-freeze physical controls | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | no material platform delta | P1-187/P0-070/P0-004 |
| C12 | Video/replaced media/current frame | RELEVANT | L3+L4 | media-time/frame physical evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | no material media delta | P1-187/P1-003/P0-070 |
| C13 | Form / renderer-owned controls | RELEVANT | L3+L4 | physical renderer-control/focus evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | EI1 remains implementation/closure priority | P1-187 + generation/focus/privacy owners |
| C14 | Pseudo/generated content | RELEVANT | L3+L4 | generated-content/resource/post-freeze physical evidence | `ARTIFACT-COVERED / FINDING` | PD2+PD3 covered | P0-070/P0-075/P0-004; P1-003 support |
| C15 | Links/anchors/internal destinations | RELEVANT | L4 | physical annotations/destinations + namespace evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | no new annotation semantic | P0-004/P1-187/P0-068/P1-213 + safe-URI/privacy owners |
| C16 | Same-origin iframe | RELEVANT | L3+L4 | broad frame/physical evidence + admission positives | `ARTIFACT-COVERED / FINDING + PD4 PASS-CONTROL` | PD4 scoped-registry-only frame render survives physical save; historical frame findings remain | P1-187/P0-068/P0-004/P0-070/P1-003 + frame owners |
| C17 | Cross-origin iframe capture/print boundary | EXPLICIT-BOUNDARY | L3+L4+L5 | remote-frame managed physical evidence | `ARTIFACT-COVERED / FINDING + EXTERNAL-REQUIRED` **CARRY-FORWARD** | real unpacked permission/session path stays L5 | P1-004/P1-171/P1-199/P1-200/P1-229 |
| C18 | Shadow DOM/slots/composed tree | RELEVANT | L3+L4 | physical composed/rendered-scope evidence | `ARTIFACT-COVERED / FINDING` | PD2+PD4 covered; scoped-shadow semantic discovery remains defective | P0-004/P0-070/P0-075/P1-003/P1-160/P1-227/P1-228 etc. |
| C19 | Ordinary long-page existing content | RELEVANT | L3+L4 | complete-vs-clipped long-page physical controls | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | no new ordinary-scroll contract | P0-004 |
| C20 | Nested scroll / retained scrollports | RELEVANT | L3+L4 | physical nested/current-scroll + dynamic controls | `ARTIFACT-COVERED / FINDING + PD1 PASS-CONTROL` | T5 nested scroll-trigger remains green/final through preparation and physical PDF; historical nested findings remain | P0-070/P0-075/P0-004; P1-187/P1-230 support |
| C21 | Lazy/offscreen resources already belonging to content | RELEVANT | L3+L4 | deferred/resource-readiness physical evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | EI3 priority only | P1-003/P1-167 + representation owners |
| C22 | Scroll-triggered new logical content / user-reached max | RELEVANT | L3+L4 | current-source + physical user-boundary controls | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | T5 negative control: no user scroll -> scrollTop stays 0 and no generated batch | P1-230 |
| C23 | Virtualized/windowed history within user-reached range | RELEVANT | L3+L4 | mounted-window/history-loss evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | historical user-reached virtualization finding remains | P1-230; P0-070/P0-080 support |
| C24 | Spoilers/disclosures / inert expansion | RELEVANT | L3+L4 | native/ARIA/synthetic-click/live-mutation physical evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | no new disclosure variant | P0-067/P1-212; P1-167/P0-075/P0-070/P0-004; P1-004 support |
| C25 | Dialog/popover/top layer | RELEVANT | L3+L4 | physical top-layer/dialog/backdrop controls | `ARTIFACT-COVERED / FINDING` | PD3 covered | P0-070/P0-075/P0-004; P1-003 support |
| C26 | Hover exclusion | RELEVANT | L3+L4 | physical CSS/pseudo/JS hover controls | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | hover-negative repeated in T2/T3/T5 | P0-075/P0-070/P0-004 |
| C27 | Focus/selection/interaction-induced state | RELEVANT | L3+L4 | physical focus/application-mutation + marker evidence | `ARTIFACT-COVERED / FINDING` | PD3 covered; EI1 closure context | P0-075/P0-070/P0-004; P1-187 support |
| C28 | Responsive/environment state | RELEVANT | L3+L4 | viewport/responsive physical evidence | `ARTIFACT-COVERED / FINDING` | PD5 covered | P0-070/P0-075/P0-004; P1-187/P1-003 support |
| C29 | Viewport units/container-query dependent geometry | RELEVANT | L3+L4 | physical viewport/container geometry | `ARTIFACT-COVERED / FINDING` | PD1: selected-only materialization moves `view()` trigger y=50→-758 and resets admitted phase | P0-004/P0-070/P0-075; P1-187 support |
| C30 | Clipping/overflow/paint containment | RELEVANT | L3+L4 | physical overflow/clip/contain controls | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | PD7 WATCH only | P0-004 |
| C31 | Fixed/sticky | RELEVANT | L3+L4 | physical fixed/sticky flattening controls | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | PD7 WATCH only | P0-004/P1-187 |
| C32 | Pagination / physical page breaks | RELEVANT | L4 | physical page-count/layout evidence | `ARTIFACT-COVERED / FINDING + PD6 PASS-CONTROL` | PD5+PD6 covered | P0-070/P0-075/P0-004 + representation/resource support |
| C33 | CSS/WAAPI animations/transitions | RELEVANT | L3+L4 | physical sampled-phase evidence | `ARTIFACT-COVERED / FINDING` | PD1: admitted finished/currentTime=220 state becomes paused/currentTime=0; PDF follows reset red state | P0-070/P0-075/P0-004; temporal owners support |
| C34 | Animated image/GIF frame | RELEVANT | L3+L4 | physical animated-frame evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | no material animated-image delta | temporal/resource-generation owner set |
| C35 | Mutation during preparation/beforeprint/physical render cut | RELEVANT | L3+L4 | post-freeze physical render-cut evidence | `ARTIFACT-COVERED / FINDING` | PD1: WebClip selected-only preparation itself invalidates active trigger before physical render | P0-070/P0-075/P0-004; P1-003/P1-187 support |
| C36 | Same locator/URL, different resource bytes/generation | RELEVANT | L2+L3+L4 | physical resource-generation/transfer evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | EI3 priority only | P0-070/P1-003/P1-187/P1-184 |
| C37 | Failure/retry/rollback/convergence | RELEVANT | L2; L3/L5 where needed | deterministic/renderer lifecycle + rollback | `DETERMINISTIC/RENDERER-COVERED / FINDING + EXTERNAL-REQUIRED` **CARRY-FORWARD** | native settlement remains L5 | P0-023/P0-039/P0-048/P0-073/P0-074/P0-079; P1-146/P1-156/P1-199/P1-214 etc. |
| C38 | Node/byte/time/resource budgets | RELEVANT | L2+L3 | local prepare/clone/resource deadline evidence | `RENDERER-COVERED / FINDING` **CARRY-FORWARD** | EI4 supporting control | P0-064/P0-065/P1-154/P1-160/P1-167/P1-173 etc. |
| C39 | Privacy/data minimization | RELEVANT | L1+L2+L4/L5 | source-URL/SelectionSnapshot privacy evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | EI1 fixture sensitivity; synthetic data only | P0-066/P1-182 + support |
| C40 | Physical PDF bytes/cache identity | RELEVANT | L4 | PDF byte/cache/transfer receipt evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | T5 hashes/extracts actual PDF and all-page rasters | P0-079/P0-070/P1-184/P0-023 |
| C41 | Local download physical settlement/native Save As | EXPLICIT-BOUNDARY | L5 | deterministic/model + historical managed browser | `EXTERNAL-REQUIRED / FINDING` **CARRY-FORWARD** | real native current-Chrome settlement stays L5 | P0-039/P0-048/P1-146/P1-156/P1-169 |
| C42 | Yandex upload/object/public identity | EXPLICIT-BOUNDARY | L5 | deterministic/mocked/receipt evidence | `EXTERNAL-REQUIRED / FINDING` **CARRY-FORWARD** | real Yandex identity stays L5 | P0-022/P0-073/P0-074/P0-078/P0-079; P1-090/P1-164/P1-184/P1-195 etc. |
| C43 | Journal/provenance/exact artifact linkage | RELEVANT | L2+L3; L5 remote | deterministic Journal/recovery + artifact receipt audits | `DETERMINISTIC/RENDERER-COVERED / FINDING` **CARRY-FORWARD** | EI2 closure priority | P0-050/P0-070/P0-076/P1-182/P1-185/P1-186/P1-190 etc. |
| C44 | Backup/import/recovery | RELEVANT | L2; L5 real Yandex restore | deterministic import/backup/recovery | `DETERMINISTIC-COVERED / FINDING + EXTERNAL-REQUIRED` **CARRY-FORWARD** | real Yandex restore stays L5 | P0-013/P0-022/P0-077; P1-035/P1-076/P1-179/P1-183/P1-194 etc. |
| C45 | Later reading / reopened PDF usefulness | RELEVANT | L4 | direct physical later-reading/readability evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | current tranches reopen/extract actual artifact | link/readability/form/frame/layout/resource owners |
| C46 | Real unpacked Chrome / optional permission UI / actual chrome.debugger path | EXPLICIT-BOUNDARY | L5 | historical managed evidence only | `EXTERNAL-REQUIRED / UNKNOWN` **CARRY-FORWARD** | real unpacked/native permission path remains bounded L5 UNKNOWN | release-QA boundary + permission/frame/download owners |

## 3. Sweep metrics

At the family level after T5/PD1 closure:

- total required starting families: **46/46 triaged**;
- family-level `NOT-TRIAGED`: **0**;
- families with terminal required evidence under current Cycle-2 Change Impact: **46**;
- families with at least one new stable-browser variant requiring revalidation: **0**;
- remaining revalidation set: **none**;
- explicit L5/external families remain bounded and visible: C17, C37, C41, C42, C44, C46;
- C46 remains explicitly bounded `EXTERNAL-REQUIRED / UNKNOWN`, not converted into a synthetic PASS;
- new unallocated P-code created by Cycle-2 T1/T2/T3/T4/T5: **0**;
- terminal finding platform-delta variants: **PD1, PD2, PD3, PD4, PD5 — `ARTIFACT-COVERED / FINDING`**;
- terminal bounded pass-control platform variant: **PD6 — `ARTIFACT-COVERED / PASS-CONTROL (virtual PDF target)`**;
- pending current-stable platform-delta variants: **none**;
- PD7 remains `OUT-OF-SCOPE (current stable target) / WATCH` for the campaign checkpoint.

All four pre-T5 revalidation families are now terminal. Cycle 2 nevertheless remains **`DEEP-AUDIT-IN-PROGRESS`** with **final reconciliation pending**; a separate synthesis gate must verify the complete denominator and campaign semantics on merged main before coverage completion is declared.

## 4. Platform-delta variant matrix

| Variant | Stable/current status at campaign checkpoint | Families | Boundaries | Required evidence | Current state |
|---|---|---|---|---|---|
| **PD1** Scroll-triggered animations | Chrome 146 stable | C20/C29/C33/C35; C22 negative boundary | B2→B6 | L1+L3+L4 | `ARTIFACT-COVERED / FINDING` — T5 proves selected-only geometry can reset admitted trigger; nested and no-user-scroll controls bound the result |
| **PD2** Element-scoped/nested View Transitions | Chrome 147 stable; pseudo access expanded by Chrome 152 | C14/C18/C33/C35 | B2→B6 | L1+L3+L4 | `ARTIFACT-COVERED / FINDING` — T1 complete |
| **PD3** `::backdrop` / `::scroll-marker` modern pseudo state | current stable; pseudo access expanded by Chrome 152 | C14/C20/C25/C27 | B2→B6 | L1+L3+L4 | `ARTIFACT-COVERED / FINDING` — T2 complete |
| **PD4** Scoped custom-element registries | Chrome 146 stable | C02/C03/C16/C18 | B2→B6 | L1+L3+L4 | `ARTIFACT-COVERED / FINDING` — T4 complete; same-origin frame bounded PASS-control |
| **PD5** CSS `text-fit` | Chrome 150 stable | C05/C07/C28/C29/C32 | B2→B6 | L1+L3+L4 | `ARTIFACT-COVERED / FINDING` — T3 complete |
| **PD6** print `page-margin-safety` | Chrome 150-era print semantic | C32 | B5→B6 | L1+L3+L4 | `ARTIFACT-COVERED / PASS-CONTROL (virtual PDF target)` |
| **PD7** single-axis scroll-container combinations affecting sticky ancestry | Chrome 153 beta at research date | C20/C29/C30/C31 if promoted | B3→B6 | future L3+L4 | `OUT-OF-SCOPE (current stable target) / WATCH` |

## 5. External-signal matrix

External research changes ranking, not product truth by itself.

| Variant | Families / boundaries | Evidence effect | Cycle-2 disposition |
|---|---|---|---|
| **EI1** current form/control state + privacy | C13/C27/C39, B2→B7 | peer form-state loss reinforces silent-current-state risk | coverage terminal; prioritize implementation closure |
| **EI2** preview/admission -> persisted/later-opened equivalence | C02/C03/C40/C43/C45, B2→B9 | recurring peer incomplete persisted result | coverage terminal; physical artifact identity remains mandatory |
| **EI3** resource/CSS dependency identity | C06–C10/C14/C21/C36/C45 | peer CSS/resource loss | coverage terminal; prioritize closure |
| **EI4** bounded termination | C37/C38, B2→B9 | peer hangs/timeout practice | coverage terminal with explicit external boundaries; retain budgets |

## 6. Ranking after T5

There are no remaining current-stable platform-delta coverage cells.

1. **Cycle-2 final reconciliation / synthesis** — verify C01…C46 denominator, zero revalidation, explicit L5 boundaries, owner deduplication and completion semantics on merged main.
2. After coverage synthesis, implementation/critical-closure prioritization remains a separate activity under canonical P-owner severity/priority.
3. PD7 remains WATCH until promoted into the current stable target by a future campaign/Change Impact review.

## 7. Completed deep-dive tranche — T1 / PD2

View Transition midpoint admitted at x=240 was physically serialized as final DOM x=440 across document/element/concurrent/Shadow controls. Existing P0-070/P0-075/P0-004 cover the root cause.

## 8. Completed deep-dive tranche — T2 / PD3

Stable backdrop/marker controls print correctly; page-owned `beforeprint` can change the physical PDF backdrop and active marker/content after admission. Existing P0-070/P0-075/P0-004 remain primary.

## 9. Completed deep-dive tranche — T3 / PD5+PD6

PD5 proves byte-identical admitted `text-fit` state can be changed from 680px to 300px before physical render, changing text geometry and page count 2→1. PD6 is a bounded virtual-PDF PASS-control for `page-margin-safety`.

## 10. Completed deep-dive tranche — T4 / PD4

PD4 proves wrong-registry SelectionSnapshot restore and scoped-shadow Main Content blindness; manual scoped Shadow and same-origin scoped-frame rendering are positive/bounded controls. Existing owners remain sufficient.

## 11. Completed deep-dive tranche — T5 / PD1

Chrome for Testing 152.0.7977.64 accepts `timeline-trigger` and `animation-trigger`. Stable-body and selection-only cases have the same admitted green/final target and identical admission target PNG SHA-256 `a67a7b236fbe39fb4df41218c2a317fe1fd0944379272443a6835b42099ca42c`.

Stable-body preparation preserves the trigger final state and the physical PDF contains 18,678 green pixels, 0 red pixels. Selected-only preparation hides a 1000px predecessor, moves the trigger subject y=50→≈-758, resets the animation from finished/currentTime=220/+260px to paused/currentTime=0/0px, and the physical PDF contains 18,646 red pixels, 0 green pixels. Nested-scroll active state remains green/final as a C20 breadth control. With no user scroll, scrollTop remains 0 and no generated logical sentinel appears, strengthening C22/P1-230 authority.

PD1 is terminal `ARTIFACT-COVERED / FINDING` under P0-070/P0-075/P0-004 with P1-230 support; no new P-code.

Durable evidence: `AUDIT_CYCLE2_T5_SCROLL_TRIGGERED_ANIMATION_2026-09-01.md`.

T5 advances family coverage from **42/4** to **46 terminal / 0 revalidation**.

## 12. Environment consequence and resolution

The local managed Chromium executable remains **144.0.7559.96** and cannot be assumed to implement Chrome 146–152 semantics used by PD1–PD6.

T1–T5 therefore use managed CI with **Google Chrome for Testing 152.0.7977.64** for current-feature physical evidence. Runner availability is an evidence boundary, never a reason to downgrade required evidence.

## 13. Current campaign state

Cycle 2 remains:

**`DEEP-AUDIT-IN-PROGRESS`** — final reconciliation pending.

Current family metrics: **46 terminal / 0 revalidation**.

All current-stable PD1–PD6 variants are terminal under their required evidence. Explicit L5 families remain visible and bounded; C46 remains UNKNOWN at its real external boundary.

Next action: **Cycle-2 final reconciliation / synthesis**. This must decide coverage completion separately from critical-finding closure and `RELEASE_READINESS.md`, which remains unchanged / `NOT READY`.