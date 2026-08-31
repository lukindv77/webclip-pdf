# WebClip — Cycle 2 Coverage Sweep / Matrix v2 — 2026-08-31

Date: 2026-08-31

Campaign: `DEEP-AUDIT-CYCLE-2-2026-08-31`.

Canonical baseline for this sweep: `main = 7a0280851133dbf87e3b25b90dbdd4c4ed5e4217` (Cycle-2 external baseline/kickoff already merged; post-merge Repository Integrity #179 SUCCESS).

Latest coverage checkpoints:

- T1/PD2 evidence executed from canonical `main = ceefea2e9d779912b0cc0270762ff1748d678683` on Chrome for Testing 152.0.7977.64 and recorded in `AUDIT_CYCLE2_T1_VIEW_TRANSITION_RENDER_CUT_2026-08-31.md`;
- T2/PD3 evidence executed from canonical `main = 73a6c6f6f21ae0a32f331234474823c63cbb7820` on Chrome for Testing 152.0.7977.64 and recorded in `AUDIT_CYCLE2_T2_PSEUDO_TOP_LAYER_SCROLL_MARKER_2026-08-31.md`;
- T3/PD5+PD6 evidence executed from canonical `main = f10c28a8612a64367423d7b60c7b4ad824f91faf` on Chrome for Testing 152.0.7977.64 and recorded in `AUDIT_CYCLE2_T3_TEXT_FIT_PAGE_MARGIN_SAFETY_2026-08-31.md`.

This is the current Coverage Sweep checkpoint of the second full deep-audit campaign. `AUDIT_REGISTRY.md` remains the only P-code owner/status authority. Cycle-1 evidence is reused only for exact claims that survive Change Impact; a new browser/platform variant does not invalidate unrelated historical evidence and historical evidence does not prove a newly introduced renderer semantic.

## 1. Sweep method

For every C01…C46 family this sweep records relevance, required evidence, strongest reusable evidence, Cycle-2 Change Impact, current owner/boundary context and any new platform/external variant.

A family is nonterminal in Cycle 2 if at least one material newly introduced stable variant lacks the required current evidence, even when its historical baseline remains a proven FINDING.

No production runtime or fidelity-contract change occurred between the Cycle-1 final synthesis and this sweep. The principal new staleness trigger is browser/API semantics plus refreshed external research priority input.

## 2. Cycle-2 family matrix

Legend:

- `CARRY-FORWARD` — prior required evidence remains applicable to the current claim;
- `REVALIDATION-REQUIRED` — at least one new stable variant remains uncovered;
- `ARTIFACT-COVERED / FINDING` — required direct physical evidence reached and a defect is proven;
- `ARTIFACT-COVERED / PASS-CONTROL` — required physical control reached without a defect for the bounded claim;
- `EXTERNAL-REQUIRED` — a real native/service boundary remains L5.

| ID | Surface family | Relevance | Required | Reusable strongest evidence | Cycle-2 coverage / outcome | Change Impact / next coverage cell | Owner / boundary context |
|---|---|---|---|---|---|---|---|
| C01 | Manual Include/Exclude / selected-scope authority | RELEVANT | L2+L3+L4 | selection/cascade/save-freeze/physical PDF | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | Exclude remains a required control in new renderer tranches | P0-004/P0-070/P0-075 + selection owners |
| C02 | SelectionSnapshot restore -> admitted rendered target -> saved copy | RELEVANT | L3+L4 | content-script restore + physical decoy/hidden/stale/frame controls | `REVALIDATION-REQUIRED / FINDING retained` | **PD4** scoped custom-element registry locator/identity ambiguity | P1-001/P0-080; P0-070/P0-075/P0-004 support |
| C03 | Main Content / auto candidate -> actual saved scope | RELEVANT | L3+L4 | current-source + physical main-content controls | `REVALIDATION-REQUIRED / FINDING retained` | **PD4** custom-element/shadow semantic-discovery identity | P1-160; P0-080/P0-070/P0-075/P0-004 support |
| C04 | Ordinary DOM/text baseline | RELEVANT | L2+L4 | searchable-text physical controls | `ARTIFACT-COVERED / PASS-CONTROL` **CARRY-FORWARD** | repeat as positive control where needed | baseline control |
| C05 | Geometry/layout | RELEVANT | L3+L4 | complex layout/viewport/typography/long-page physical evidence | `ARTIFACT-COVERED / FINDING` | **PD5 covered**: identical admitted state can be refit 680→300 px by `beforeprint`; physical PDF follows ≈676→296 px | P0-070/P0-075/P0-004; P1-187 support |
| C06 | Colors/backgrounds/compositing | RELEVANT | L3+L4 | CSS visual dependency/frame/post-freeze physical evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | no independent new C06-only stable semantic gap | P1-003/P1-187/P0-004/P0-075 |
| C07 | Fonts/typography | RELEVANT | L3+L4 | physical font/layout/page-count controls | `ARTIFACT-COVERED / FINDING` | **PD5 covered**: `text-fit` used typography changes after admission and is reflected in physical text geometry | P0-070/P0-075/P0-004; P1-187/P1-003 support |
| C08 | Raster images / crop/object-fit | RELEVANT | L3+L4 | physical resource/crop evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | EI3 raises closure priority only | P1-003/P1-187/P0-004 |
| C09 | Responsive images / picture/srcset/currentSrc | RELEVANT | L3+L4 | physical responsive candidate identity | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | no new currentSrc semantic found | P1-003/P1-187/P0-070/P0-075 |
| C10 | SVG visual state/resources | RELEVANT | L3+L4 | physical SVG/resource/namespace/paint evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | EI3 priority only | P1-187/P1-003/P0-068/P0-004 |
| C11 | Canvas | RELEVANT | L3+L4 | frame/post-freeze physical controls | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | no material platform delta | P1-187/P0-070/P0-004 |
| C12 | Video/replaced media/current frame | RELEVANT | L3+L4 | media-time/frame physical evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | no material current media semantic delta | P1-187/P1-003/P0-070 |
| C13 | Form / renderer-owned controls | RELEVANT | L3+L4 | physical renderer-control/focus evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | EI1 remains implementation/closure priority, not a coverage deficit | P1-187 + generation/focus/privacy owners |
| C14 | Pseudo/generated content | RELEVANT | L3+L4 | generated-content/resource/post-freeze physical evidence | `ARTIFACT-COVERED / FINDING` | **PD2 + PD3 covered**; no remaining Cycle-2 variant | P0-070/P0-075/P0-004; P1-003 support |
| C15 | Links/anchors/internal destinations | RELEVANT | L4 | physical annotations/destinations + namespace evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | no new link/PDF annotation semantic | P0-004/P1-187/P0-068/P1-213 + safe-URI/privacy owners |
| C16 | Same-origin iframe | RELEVANT | L3+L4 | broad frame/physical evidence + admission positives | `REVALIDATION-REQUIRED / FINDING retained` | **PD4** scoped custom-element registry inside/alongside frame/shadow representation | P1-187/P0-068/P0-004/P0-070/P1-003 + frame owners |
| C17 | Cross-origin iframe capture/print boundary | EXPLICIT-BOUNDARY | L3+L4 + L5 | remote-frame managed physical evidence | `ARTIFACT-COVERED / FINDING + EXTERNAL-REQUIRED` **CARRY-FORWARD** | real unpacked permission/session path stays L5 | P1-004/P1-171/P1-199/P1-200/P1-229 |
| C18 | Shadow DOM/slots/composed tree | RELEVANT | L3+L4 | physical composed/rendered-scope evidence | `REVALIDATION-REQUIRED / FINDING retained + PD2 ARTIFACT-COVERED / FINDING` | **PD4 remains** for scoped custom-element registries | P0-004/P0-070/P0-075/P1-003/P1-160/P1-227/P1-228 etc. |
| C19 | Ordinary long-page existing content | RELEVANT | L3+L4 | complete-vs-clipped long-page physical controls | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | no new ordinary-scroll contract | P0-004 |
| C20 | Nested scroll / retained scrollports | RELEVANT | L3+L4 | physical slice/current-scroll + dynamic nested controls | `REVALIDATION-REQUIRED / FINDING retained + PD3 ARTIFACT-COVERED / FINDING` | **PD1 remains** for scroll-triggered animation; PD7 WATCH | P0-070/P0-075/P0-004; P1-187 support |
| C21 | Lazy/offscreen resources already belonging to content | RELEVANT | L3+L4 | deferred/resource-readiness physical evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | EI3 priority only | P1-003/P1-167 + representation owners |
| C22 | Scroll-triggered new logical content / user-reached max | RELEVANT | L3+L4 | current-source + physical user-boundary controls | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | use as negative boundary in PD1 | P1-230 |
| C23 | Virtualized/windowed history within user-reached range | RELEVANT | L3+L4 | physical mounted-window/history-loss evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | use as boundary control if PD1 fixture virtualizes | P1-230; P0-070/P0-080 support |
| C24 | Spoilers/disclosures / inert expansion | RELEVANT | L3+L4 | native/ARIA/synthetic-click/live-mutation physical evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | no new disclosure variant | P0-067/P1-212; P1-167/P0-075/P0-070/P0-004; P1-004 support |
| C25 | Dialog/popover/top layer | RELEVANT | L3+L4 | physical top-layer/dialog + current backdrop controls | `ARTIFACT-COVERED / FINDING` | **PD3 covered** | P0-070/P0-075/P0-004; P1-003 support |
| C26 | Hover exclusion | RELEVANT | L3+L4 | physical CSS/pseudo/JS hover controls | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | corrected hover-negative repeated in T2/T3 | P0-075/P0-070/P0-004 |
| C27 | Focus/selection/interaction-induced state | RELEVANT | L3+L4 | physical focus/application-mutation + marker evidence | `ARTIFACT-COVERED / FINDING` | **PD3 covered**; EI1 is closure context | P0-075/P0-070/P0-004; P1-187 support |
| C28 | Responsive/environment state | RELEVANT | L3+L4 | viewport/responsive physical evidence | `ARTIFACT-COVERED / FINDING` | **PD5 covered**: fitted state depends on width/container environment and can be substituted after admission | P0-070/P0-075/P0-004; P1-187/P1-003 support |
| C29 | Viewport units/container-query dependent geometry | RELEVANT | L3+L4 | physical vw/vh/paged geometry + frame CSS | `REVALIDATION-REQUIRED / FINDING retained + PD5 ARTIFACT-COVERED / FINDING` | **PD5 covered**; **PD1 remains** for scroll timeline/trigger geometry | P0-004/P1-187/P0-070/P0-075 |
| C30 | Clipping/overflow/paint containment | RELEVANT | L3+L4 | physical overflow/clip/contain controls | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | PD7 may promote later | P0-004 |
| C31 | Fixed/sticky | RELEVANT | L3+L4 | physical fixed/sticky flattening controls | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | PD7 WATCH only | P0-004/P1-187 |
| C32 | Pagination / physical page breaks | RELEVANT | L4 | physical page-count/layout evidence | `ARTIFACT-COVERED / FINDING + PD6 PASS-CONTROL` | **PD5 covered**: identical admitted state physically changes 2 pages→1 after host refit; **PD6 covered** on virtual PDF target with no unsafe-printer inset | P0-070/P0-075/P0-004 + representation/resource support |
| C33 | CSS/WAAPI animations/transitions | RELEVANT | L3+L4 | physical sampled-phase drift evidence | `REVALIDATION-REQUIRED / FINDING retained + PD2 ARTIFACT-COVERED / FINDING` | **PD1 remains** for scroll-triggered animation | P0-070/P0-004/P1-187/P0-075 |
| C34 | Animated image/GIF frame | RELEVANT | L3+L4 | physical animated-frame evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | no material animated-image delta | temporal/resource-generation owner set |
| C35 | Mutation during preparation/beforeprint/physical render cut | RELEVANT | L3+L4 | post-freeze physical render-cut evidence | `REVALIDATION-REQUIRED / FINDING retained + PD2/PD3/PD5 ARTIFACT-COVERED / FINDING` | **PD5 covered** for fitted layout/pagination substitution; **PD1 remains** | P0-070/P0-075/P0-004; P1-003/P1-187 support |
| C36 | Same locator/URL, different resource bytes/generation | RELEVANT | L2+L3+L4 | physical resource-generation/transfer evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | EI3 priority only | P0-070/P1-003/P1-187/P1-184 |
| C37 | Failure/retry/rollback/convergence | RELEVANT | L2; L3/L5 where needed | deterministic/renderer lifecycle + rollback | `DETERMINISTIC/RENDERER-COVERED / FINDING + EXTERNAL-REQUIRED` **CARRY-FORWARD** | EI4 requires bounded failure controls; native settlement stays L5 | P0-023/P0-039/P0-048/P0-073/P0-074/P0-079; P1-146/P1-156/P1-199/P1-214 etc. |
| C38 | Node/byte/time/resource budgets | RELEVANT | L2+L3 | local prepare/clone/resource deadline evidence | `RENDERER-COVERED / FINDING` **CARRY-FORWARD** | EI4 supporting control | P0-064/P0-065/P1-154/P1-160/P1-167/P1-173 etc. |
| C39 | Privacy/data minimization | RELEVANT | L1+L2 + L4/L5 | source-URL/SelectionSnapshot privacy evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | EI1 increases fixture sensitivity; synthetic data only | P0-066/P1-182 + support |
| C40 | Physical PDF bytes/cache identity | RELEVANT | L4 | PDF byte/cache/transfer receipt evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | each new PD tranche hashes/extracts actual PDF | P0-079/P0-070/P1-184/P0-023 |
| C41 | Local download physical settlement/native Save As | EXPLICIT-BOUNDARY | L5 | deterministic/model + historical managed browser | `EXTERNAL-REQUIRED / FINDING` **CARRY-FORWARD** | real native current-Chrome settlement stays L5 | P0-039/P0-048/P1-146/P1-156/P1-169 |
| C42 | Yandex upload/object/public identity | EXPLICIT-BOUNDARY | L5 | deterministic/mocked/receipt evidence | `EXTERNAL-REQUIRED / FINDING` **CARRY-FORWARD** | real Yandex identity stays L5 | P0-022/P0-073/P0-074/P0-078/P0-079; P1-090/P1-164/P1-184/P1-195 etc. |
| C43 | Journal/provenance/exact artifact linkage | RELEVANT | L2+L3; L5 remote | deterministic Journal/recovery + artifact receipt audits | `DETERMINISTIC/RENDERER-COVERED / FINDING` **CARRY-FORWARD** | EI2 closure priority | P0-050/P0-070/P0-076/P1-182/P1-185/P1-186/P1-190 etc. |
| C44 | Backup/import/recovery | RELEVANT | L2; L5 real Yandex restore | deterministic import/backup/recovery | `DETERMINISTIC-COVERED / FINDING + EXTERNAL-REQUIRED` **CARRY-FORWARD** | real Yandex restore stays L5 | P0-013/P0-022/P0-077; P1-035/P1-076/P1-179/P1-183/P1-194 etc. |
| C45 | Later reading / reopened PDF usefulness | RELEVANT | L4 | direct physical later-reading/readability evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | new physical tranches reopen/extract actual artifact | link/readability/form/frame/layout/resource owners |
| C46 | Real unpacked Chrome / optional permission UI / actual chrome.debugger path | EXPLICIT-BOUNDARY | L5 | historical managed evidence only | `EXTERNAL-REQUIRED / UNKNOWN` **CARRY-FORWARD** | real unpacked/native permission path remains bounded L5 unknown | release-QA boundary + permission/frame/download owners |

## 3. Sweep metrics

At the **family level** after T3/PD5+PD6 closure:

- total required starting families: **46/46 triaged**;
- family-level `NOT-TRIAGED`: **0**;
- families with terminal required evidence under current Cycle-2 Change Impact: **38**;
- families with at least one new stable-browser variant requiring revalidation: **8**;
- remaining revalidation set: **C02, C03, C16, C18, C20, C29, C33, C35**;
- explicit L5/external families remain bounded and visible: C17, C37, C41, C42, C44, C46;
- new unallocated P-code created by Cycle-2 T1/T2/T3: **0**;
- terminal finding platform-delta variants: **PD2, PD3, PD5 — `ARTIFACT-COVERED / FINDING`**;
- terminal bounded pass-control platform variant: **PD6 — `ARTIFACT-COVERED / PASS-CONTROL (virtual PDF target)`**;
- pending current-stable platform-delta variants: **PD1, PD4**;
- PD7 remains current-stable out-of-scope/WATCH at this checkpoint.

C05, C07, C28 and C32 become family-terminal after T3. C29 remains nonterminal because independent PD1 is still pending. C02/C03/C16/C18 remain PD4 deficits; C20/C29/C33/C35 remain PD1 deficits.

Therefore Cycle 2 remains correctly **`DEEP-AUDIT-IN-PROGRESS`** with eight explicit family deficits.

## 4. Platform-delta variant matrix

| Variant | Stable/current status at 2026-08-31 | Families | Boundaries | Required evidence | Current state |
|---|---|---|---|---|---|
| **PD1** Scroll-triggered animations | Chrome 146 stable | C20/C29/C33/C35; C22 negative boundary | B2→B6 | L1 + L3+L4 | `REVALIDATION-REQUIRED` |
| **PD2** Element-scoped/nested View Transitions + transition pseudo tree | Chrome 147 stable; pseudo JS access expanded by Chrome 152 | C14/C18/C33/C35 | B2→B6 | L1 + L3+L4 | `ARTIFACT-COVERED / FINDING` — T1 complete on Chrome for Testing 152.0.7977.64 |
| **PD3** `::backdrop` / `::scroll-marker` modern pseudo state | current stable; pseudo JS access expanded in Chrome 152 | C14/C20/C25/C27 | B2→B6 | L1 + L3+L4 | `ARTIFACT-COVERED / FINDING` — T2 complete on Chrome for Testing 152.0.7977.64 |
| **PD4** Scoped custom-element registries | Chrome 146 stable | C02/C03/C16/C18 | B2→B6 | L1 + L3+L4 | `REVALIDATION-REQUIRED` |
| **PD5** CSS `text-fit` | Chrome 150 stable | C05/C07/C28/C29/C32 | B2→B6 | L1 + L3+L4 | `ARTIFACT-COVERED / FINDING` — T3 stable positive plus admitted-state geometry/page-count substitution on Chrome 152 |
| **PD6** print `page-margin-safety` | Chrome 150-era print semantic | C32 | B5→B6 | L1 + L3+L4 | `ARTIFACT-COVERED / PASS-CONTROL (virtual PDF target)` — descriptor parsed; none/clamp/add identical physical virtual-PDF geometry, ordinary margin control discriminates |
| **PD7** single-axis scroll-container combinations affecting sticky ancestry | Chrome 153 beta at research date | C20/C29/C30/C31 if promoted | B3→B6 | future L3+L4 | `OUT-OF-SCOPE (current stable target) / WATCH` |

## 5. External-signal matrix

External research changes ranking, not product truth by itself.

| Variant | Families / boundaries | Evidence effect | Cycle-2 disposition |
|---|---|---|---|
| **EI1** current form/control state + privacy | C13/C27/C39, B2→B7 | peer form-state loss reinforces silent-current-state risk | historical WebClip finding remains terminal; prioritize closure |
| **EI2** preview/admission -> persisted/later-opened equivalence | C02/C03/C40/C43/C45, B2→B9 | recurring peer incomplete persisted result | every new tranche verifies actual artifact identity |
| **EI3** resource/CSS dependency identity | C06–C10/C14/C21/C36/C45 | peer CSS/resource loss | historical findings terminal; prioritize closure |
| **EI4** bounded termination | C37/C38, B2→B9 | peer hangs/timeout practice | mandatory failure/degradation control for new tranches |

## 6. Risk ranking after T3

Ranking applies to nonterminal coverage cells before implementation closure candidates.

1. **T4 — PD4 scoped custom-element registries** — selection/semantic identity risk across Shadow/frame and automatic/manual admission.
2. **T5 — PD1 scroll-triggered animation** — temporal state tied to scroll/user boundary; must prove preparation does not advance/reset admitted phase.
3. **Implementation/closure priority after coverage deficits** — EI1 form current state/privacy, EI2 persisted-object equivalence, EI3 resource dependency identity, EI4 shared budget/termination, subject to canonical P-owner priority/severity.
4. **PD7** remains watch until current-target promotion.

Tie-breaker: silent wrong artifact > explicit failure/hang where comparable.

## 7. Completed deep-dive tranche — T1 / PD2

Document/element/concurrent/Shadow View Transition midpoint admitted at `x=240` was physically serialized as final DOM at `x=440`; stable/Exclude/hover controls discriminated. Required L1+L3+L4 reached on Chrome for Testing 152.0.7977.64. Durable evidence: `AUDIT_CYCLE2_T1_VIEW_TRANSITION_RENDER_CUT_2026-08-31.md`. No new P-code; existing P0-070/P0-075/P0-004 cover the root cause.

## 8. Completed deep-dive tranche — T2 / PD3

Stable blue `::backdrop` and active marker #2 print correctly, while page-owned `beforeprint` changes the physical PDF to red backdrop and marker/content #3/THREE. Exclude and corrected hover-negative controls remain absent. Required L1+L3+L4 reached on Chrome for Testing 152.0.7977.64. Durable evidence: `AUDIT_CYCLE2_T2_PSEUDO_TOP_LAYER_SCROLL_MARKER_2026-08-31.md`. No new P-code; P0-070/P0-075/P0-004 remain primary.

## 9. Completed deep-dive tranche — T3 / PD5+PD6

### PD5 physical finding

Stable `text-fit: grow per-line-all` proves Chrome can preserve a 680 px admitted fitted layout into the physical PDF. In the mutation case, the admission screenshot is byte-identical to the stable case, but page-owned `beforeprint` changes the fitted width to 300 px. The physical PDF follows the later state: text width changes ≈676→296 px and page count changes **2→1** while all intended fitted lines remain present. Exclude and hover-negative controls remain absent.

PD5 is terminal **`ARTIFACT-COVERED / FINDING`** under existing P0-070/P0-075/P0-004 with P1-187/P1-003 support.

### PD6 bounded pass-control

Chrome 152 parses `page-margin-safety:none|clamp|add`. With zero author margin, all three produce identical virtual-PDF text geometry and identical raster output. An ordinary `@page margin:40px` control moves content/margin-box geometry and changes the raster, proving the harness is sensitive. This is terminal **`ARTIFACT-COVERED / PASS-CONTROL (virtual PDF target)`**; no claim is made about a hardware printer's unprintable area.

Durable evidence: `AUDIT_CYCLE2_T3_TEXT_FIT_PAGE_MARGIN_SAFETY_2026-08-31.md`.

T3 advances family coverage from **34/12** to **38 terminal / 8 revalidation**.

## 10. Environment consequence and resolution

The local managed Chromium executable remains **144.0.7559.96** and cannot be assumed to implement Chrome 146–152 semantics used by PD1–PD6.

T1, T2 and T3 therefore use managed CI that downloads and executes **Google Chrome for Testing 152.0.7977.64** for current-feature physical evidence. Runner availability is an evidence boundary, never a reason to downgrade required L3/L4 evidence.

## 11. Current campaign state

Cycle 2 remains:

**`DEEP-AUDIT-IN-PROGRESS`**.

T1/PD2, T2/PD3 and T3/PD5 are terminal `ARTIFACT-COVERED / FINDING`; T3/PD6 is terminal `ARTIFACT-COVERED / PASS-CONTROL (virtual PDF target)`.

Current family metrics: **38 terminal / 8 revalidation**.

Next action: **T4 / PD4 — scoped custom-element registries across C02/C03/C16/C18**, with current-source/owner saturation followed by current-Chrome L3/L4 selection/semantic/physical-PDF controls.
