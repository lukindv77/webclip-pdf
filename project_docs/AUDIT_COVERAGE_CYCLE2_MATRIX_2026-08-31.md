# WebClip — Cycle 2 Coverage Sweep / Matrix v2 — 2026-08-31

Date: 2026-08-31

Campaign: `DEEP-AUDIT-CYCLE-2-2026-08-31`.

Canonical baseline for this sweep: `main = 7a0280851133dbf87e3b25b90dbdd4c4ed5e4217` (Cycle-2 external baseline/kickoff already merged; post-merge Repository Integrity #179 SUCCESS).

This is the first Coverage Sweep checkpoint of the second full deep-audit campaign. `AUDIT_REGISTRY.md` remains the only P-code owner/status authority. Cycle-1 evidence is reused only for the exact claims that survive Change Impact; a new browser/platform variant does not invalidate unrelated historical evidence and historical evidence does not prove a newly introduced renderer semantic.

## 1. Sweep method

For every C01…C46 family this sweep records:

- relevance to the current faithful-static-PDF mission;
- required evidence level from `AUDIT_COVERAGE_CAMPAIGN_POLICY.md`;
- strongest Cycle-1 evidence that can still be reused;
- Cycle-2 Change Impact disposition;
- current owner/root-cause context or external boundary;
- new Cycle-2 variant, if any.

A family is nonterminal in Cycle 2 if at least one material newly introduced variant lacks the required current evidence, even when its historical baseline remains a proven FINDING.

No production runtime or fidelity-contract change occurred between the Cycle-1 final synthesis and this sweep. The principal new staleness trigger is **browser/API semantics**, plus the new external research priority input.

## 2. Cycle-2 family matrix

Legend:

- `CARRY-FORWARD` — prior required evidence remains applicable to the current claim; no material Change Impact identified for this family during this sweep.
- `REVALIDATION-REQUIRED` — the old claim remains evidence for its old variant, but at least one new stable renderer/platform variant is not covered.
- `EXTERNAL-REQUIRED` — real product/native/service boundary remains L5.
- FINDING/PASS-CONTROL/UNKNOWN are outcomes, not implementation statuses.

| ID | Surface family | Relevance | Required | Reusable strongest evidence | Cycle-2 coverage / outcome | Change Impact / next coverage cell | Owner / boundary context |
|---|---|---|---|---|---|---|---|
| C01 | Manual Include/Exclude / selected-scope authority | RELEVANT | L2+L3+L4 | selection/cascade/save-freeze/physical PDF | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | no new independent browser semantic identified; Exclude remains a required control in all new tranches | P0-004/P0-070/P0-075 + selection owners |
| C02 | SelectionSnapshot restore -> admitted rendered target -> saved copy | RELEVANT | L3+L4 | actual content-script restore + physical PDF decoy/hidden/stale/frame controls | `REVALIDATION-REQUIRED / FINDING retained` | **PD4** scoped custom-element registry: locator/identity ambiguity across scoped definitions; physical target proof | P1-001/P0-080; P0-070/P0-075/P0-004 support |
| C03 | Main Content / auto candidate -> actual saved scope | RELEVANT | L3+L4 | current-source + physical main-content controls | `REVALIDATION-REQUIRED / FINDING retained` | **PD4** custom-element/shadow candidate identity and semantic discovery variant | P1-160; P0-080/P0-070/P0-075/P0-004 support |
| C04 | Ordinary DOM/text baseline | RELEVANT | L2+L4 | direct physical searchable-text controls | `ARTIFACT-COVERED / PASS-CONTROL` **CARRY-FORWARD** | baseline only; must be repeated as positive control where a new renderer tranche needs it | baseline control |
| C05 | Geometry/layout | RELEVANT | L3+L4 | complex layout/viewport/typography/long-page physical evidence | `REVALIDATION-REQUIRED / FINDING retained` | **PD5** CSS `text-fit` fitted geometry; print/source layout comparison | P0-004/P1-187 |
| C06 | Colors/backgrounds/compositing | RELEVANT | L3+L4 | CSS visual dependency/frame/post-freeze physical evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | new pseudo/top-layer tranches must observe compositing as an interaction control, but no separate stable C06-only semantic gap identified | P1-003/P1-187/P0-004/P0-075 |
| C07 | Fonts/typography | RELEVANT | L3+L4 | physical font/layout/page-count controls | `REVALIDATION-REQUIRED / FINDING retained` | **PD5** `text-fit` font sizing/line-break/current geometry | P1-187/P1-003/P0-004 |
| C08 | Raster images / crop/object-fit | RELEVANT | L3+L4 | physical resource/crop evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | EI3 increases closure priority but does not stale the proved claim | P1-003/P1-187/P0-004 |
| C09 | Responsive images / picture/srcset/currentSrc | RELEVANT | L3+L4 | physical responsive candidate identity | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | no new currentSrc browser semantic found in platform delta | P1-003/P1-187/P0-070/P0-075 |
| C10 | SVG visual state/resources | RELEVANT | L3+L4 | physical SVG/resource/namespace/paint evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | EI3 priority only; no independent stable browser semantic delta identified | P1-187/P1-003/P0-068/P0-004 |
| C11 | Canvas | RELEVANT | L3+L4 | frame/post-freeze physical controls | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | no material platform delta identified | P1-187/P0-070/P0-004 |
| C12 | Video/replaced media/current frame | RELEVANT | L3+L4 | media-time/frame physical evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | no material current media semantic delta identified | P1-187/P1-003/P0-070 |
| C13 | Form / renderer-owned controls | RELEVANT | L3+L4 | physical renderer-control/focus evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | **EI1 high-priority implementation/closure signal**: fresh peer report reinforces current-value fidelity/privacy but does not make old WebClip evidence stale | P1-187 + generation/focus/privacy owners |
| C14 | Pseudo/generated content | RELEVANT | L3+L4 | generated-content/resource/post-freeze physical evidence | `REVALIDATION-REQUIRED / FINDING retained` | **PD2/PD3** `::view-transition`, `::backdrop`, `::scroll-marker` pseudo surfaces and page-driven pseudo state | P1-003/P1-187/P0-070/P0-075 depending mechanism |
| C15 | Links/anchors/internal destinations | RELEVANT | L4 | physical annotations/destinations + namespace evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | no new link/PDF annotation semantic identified | P0-004/P1-187/P0-068/P1-213 + safe-URI/privacy owners |
| C16 | Same-origin iframe | RELEVANT | L3+L4 | broad frame/physical evidence + admission positives | `REVALIDATION-REQUIRED / FINDING retained` | **PD4** scoped custom-element registry inside/alongside frame/shadow representation | P1-187/P0-068/P0-004/P0-070/P1-003 + frame owners |
| C17 | Cross-origin iframe capture/print boundary | EXPLICIT-BOUNDARY | L3+L4 + L5 for real permission/session | remote-frame managed physical evidence | `ARTIFACT-COVERED / FINDING + EXTERNAL-REQUIRED` **CARRY-FORWARD** | real unpacked permission/session path remains L5; new platform variants should include cross-origin only where the feature can materially cross the frame boundary | P1-004/P1-171/P1-199/P1-200/P1-229 |
| C18 | Shadow DOM/slots/composed tree | RELEVANT | L3+L4 | physical composed/rendered scope evidence | `REVALIDATION-REQUIRED / FINDING retained` | **PD2/PD4** element-scoped/nested View Transitions and scoped custom-element registries | P0-004/P0-070/P0-075/P1-003/P1-160/P1-227/P1-228 etc. |
| C19 | Ordinary long-page existing content | RELEVANT | L3+L4 | complete-vs-clipped long-page physical controls | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | no new ordinary-scroll completeness contract change | P0-004 |
| C20 | Nested scroll / retained scrollports | RELEVANT | L3+L4 | physical slice/current-scroll + dynamic nested controls | `REVALIDATION-REQUIRED / FINDING retained` | **PD1/PD3** scroll-triggered animation phase and `::scroll-marker`; PD7 Chrome 153 single-axis semantics remain WATCH | P0-004/P1-187 |
| C21 | Lazy/offscreen resources already belonging to content | RELEVANT | L3+L4 | deferred/resource readiness physical evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | EI3 priority only; existing lazy-resource distinction remains contractually unchanged | P1-003/P1-167 + representation owners |
| C22 | Scroll-triggered new logical content / user-reached max | RELEVANT | L3+L4 | current-source + Chromium-144 physical user-boundary controls | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | PD1 animations use scroll as a state trigger but do not redefine logical-content user-reached boundary; include C22 negative control in PD1 | P1-230 |
| C23 | Virtualized/windowed history within user-reached range | RELEVANT | L3+L4 | physical mounted-window/history-loss evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | no new virtualization contract change; use as boundary control where scroll-triggered animation fixture virtualizes | P1-230; P0-070/P0-080 support |
| C24 | Spoilers/disclosures / inert expansion | RELEVANT | L3+L4 | physical native/ARIA/synthetic-click/live-mutation evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | no contract/browser semantic change requiring new disclosure variant found in this sweep | P0-067/P1-212; P1-167/P0-075/P0-070/P0-004; P1-004 support |
| C25 | Dialog/popover/top layer | RELEVANT | L3+L4 | physical top-layer/dialog controls | `REVALIDATION-REQUIRED / FINDING retained` | **PD3** JS-addressable `::backdrop` as explicit modern top-layer pseudo state | P0-004/P1-187/P0-070 + representation owners |
| C26 | Hover exclusion | RELEVANT | L3+L4 | physical CSS/pseudo/JS hover controls | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | new pseudo fixtures must include hover-only negative control, but hover contract did not change | P0-075/P0-070/P0-004 |
| C27 | Focus/selection/interaction-induced state | RELEVANT | L3+L4 | physical focus/application-mutation evidence | `REVALIDATION-REQUIRED / FINDING retained` | **PD3** selected/active `::scroll-marker` and interaction state; EI1 form current-state control | P0-075/P0-070/P0-004/P1-187 |
| C28 | Responsive/environment state | RELEVANT | L3+L4 | viewport/responsive physical evidence | `REVALIDATION-REQUIRED / FINDING retained` | **PD5** `text-fit` interaction with responsive/container/source environment | P0-004/P0-070/P0-075/P1-187/P1-003 |
| C29 | Viewport units/container-query dependent geometry | RELEVANT | L3+L4 | physical vw/vh/paged geometry + frame CSS | `REVALIDATION-REQUIRED / FINDING retained` | **PD1/PD5** scroll timeline/trigger geometry and `text-fit` under container/source environment | P0-004/P1-187/P0-070/P0-075 |
| C30 | Clipping/overflow/paint containment | RELEVANT | L3+L4 | physical overflow/clip/contain controls | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | PD7 may promote a new overflow combination after Chrome 153 stable; current stable target unchanged for this claim | P0-004 |
| C31 | Fixed/sticky | RELEVANT | L3+L4 | physical fixed/sticky flattening controls | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | **PD7 WATCH only**: Chrome 153 beta single-axis scroll-container ancestry is not yet a current stable requirement | P0-004/P1-187 |
| C32 | Pagination / physical page breaks | RELEVANT | L4 | physical page-count/layout evidence | `REVALIDATION-REQUIRED / FINDING retained` | **PD5/PD6** `text-fit` page-count impact and print `page-margin-safety`/author `@page` interaction | P0-004 + representation/resource owners |
| C33 | CSS/WAAPI animations/transitions | RELEVANT | L3+L4 | physical sampled-phase drift evidence | `REVALIDATION-REQUIRED / FINDING retained` | **PD1/PD2** scroll-triggered animation and element-scoped/nested View Transition admitted phase | P0-070/P0-004/P1-187/P0-075 |
| C34 | Animated image/GIF frame | RELEVANT | L3+L4 | physical animated-frame evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | no material animated-image browser semantic delta identified | temporal/resource-generation owner set |
| C35 | Mutation during preparation/beforeprint/physical render cut | RELEVANT | L3+L4 | post-freeze physical render-cut evidence | `REVALIDATION-REQUIRED / FINDING retained` | **PD1/PD2** transition/scroll-triggered state can advance or swap around capture/print cut | P0-070/P0-075/P0-004; P1-003/P1-187 support |
| C36 | Same locator/URL, different resource bytes/generation | RELEVANT | L2+L3+L4 | physical resource-generation/transfer evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | EI3 reinforces priority; no new URL/resource generation semantic found | P0-070/P1-003/P1-187/P1-184 |
| C37 | Failure/retry/rollback/convergence | RELEVANT | L2; L3/L5 where needed | deterministic/renderer lifecycle + rollback | `DETERMINISTIC/RENDERER-COVERED / FINDING + EXTERNAL-REQUIRED` **CARRY-FORWARD** | **EI4** requires every new renderer tranche to include bounded failure/degradation controls; native settlement still L5 | P0-023/P0-039/P0-048/P0-073/P0-074/P0-079; P1-146/P1-156/P1-199/P1-214 etc. |
| C38 | Node/byte/time/resource budgets | RELEVANT | L2+L3 | local prepare/clone/resource deadline evidence | `RENDERER-COVERED / FINDING` **CARRY-FORWARD** | **EI4 supporting control** for PD tranches; no new standalone budget contract | P0-064/P0-065/P1-154/P1-160/P1-167/P1-173 etc. |
| C39 | Privacy/data minimization | RELEVANT | L1+L2 + L4/L5 where observable | source-URL/SelectionSnapshot privacy evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | **EI1** increases sensitivity of form-value fixtures; use synthetic non-secret data and verify receipts/external authority | P0-066/P1-182 + supporting owners |
| C40 | Physical PDF bytes/cache identity | RELEVANT | L4 | PDF byte/cache/transfer receipt evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | **EI2 high-priority closure signal**; new PD tranches must hash/extract the actual PDF | P0-079/P0-070/P1-184/P0-023 |
| C41 | Local download physical settlement/native Save As | EXPLICIT-BOUNDARY | L5 | deterministic/model + historical managed browser | `EXTERNAL-REQUIRED / FINDING` **CARRY-FORWARD** | real native current-Chrome settlement remains L5 | P0-039/P0-048/P1-146/P1-156/P1-169 |
| C42 | Yandex upload/object/public identity | EXPLICIT-BOUNDARY | L5 | deterministic/mocked/receipt evidence | `EXTERNAL-REQUIRED / FINDING` **CARRY-FORWARD** | real Yandex identity remains L5 | P0-022/P0-073/P0-074/P0-078/P0-079; P1-090/P1-164/P1-184/P1-195 etc. |
| C43 | Journal/provenance/exact artifact linkage | RELEVANT | L2+L3; L5 remote identity | deterministic Journal/recovery + artifact receipt audits | `DETERMINISTIC/RENDERER-COVERED / FINDING` **CARRY-FORWARD** | **EI2** increases closure priority; no source/data-model Change Impact identified | P0-050/P0-070/P0-076/P1-182/P1-185/P1-186/P1-190 etc. |
| C44 | Backup/import/recovery | RELEVANT | L2; L5 real Yandex restore | deterministic import/backup/recovery | `DETERMINISTIC-COVERED / FINDING + EXTERNAL-REQUIRED` **CARRY-FORWARD** | no local model change; real Yandex restore stays L5 | P0-013/P0-022/P0-077; P1-035/P1-076/P1-179/P1-183/P1-194 etc. |
| C45 | Later reading / reopened PDF usefulness | RELEVANT | L4 | direct physical later-reading/readability evidence | `ARTIFACT-COVERED / FINDING` **CARRY-FORWARD** | **EI2/EI3** require each new physical tranche to verify reopened/extracted artifact rather than generation-only success | link/readability/form/frame/layout/resource owners |
| C46 | Real unpacked Chrome / optional permission UI / actual chrome.debugger path | EXPLICIT-BOUNDARY | L5 | historical managed evidence only | `EXTERNAL-REQUIRED / UNKNOWN` **CARRY-FORWARD** | current real unpacked/native permission path remains bounded L5 unknown; no managed PASS inference | release-QA boundary + relevant permission/frame/download owners |

## 3. Sweep metrics

At the **family level** after first Cycle-2 triage:

- total required starting families: **46/46 triaged**;
- family-level `NOT-TRIAGED`: **0**;
- families carrying forward terminal required evidence: **31**;
- families with at least one new stable-browser variant requiring revalidation: **15**;
- explicit L5/external families remain bounded and visible: C17, C37, C41, C42, C44, C46 (mixed/local evidence where documented);
- new unallocated P-code created by this sweep: **0**.

Therefore Cycle 2 is correctly **`DEEP-AUDIT-IN-PROGRESS`**: the denominator is visible, but 15 families contain nonterminal new-variant cells.

## 4. Platform-delta variant matrix

| Variant | Stable/current status at 2026-08-31 | Families | Boundaries | Required evidence | Current state |
|---|---|---|---|---|---|
| **PD1** Scroll-triggered animations | Chrome 146 stable | C20/C29/C33/C35; C22 negative boundary | B2→B6 | L1 + L3+L4 | `REVALIDATION-REQUIRED` |
| **PD2** Element-scoped/nested View Transitions + transition pseudo tree | Chrome 147 stable; pseudo JS access expanded by Chrome 152 | C14/C18/C33/C35 | B2→B6 | L1 + L3+L4 | `REVALIDATION-REQUIRED` |
| **PD3** `::backdrop` / `::scroll-marker` modern pseudo state | pseudo access expanded in Chrome 152; underlying visual surfaces relevant to current renderer | C14/C20/C25/C27 | B2→B6 | L1 + L3+L4 | `REVALIDATION-REQUIRED` |
| **PD4** Scoped custom-element registries | Chrome 146 stable | C02/C03/C16/C18 | B2→B6 | L1 + L3+L4 for selection/visual claims | `REVALIDATION-REQUIRED` |
| **PD5** CSS `text-fit` | Chrome 150 stable | C05/C07/C28/C29/C32 | B2→B6 | L1 + L3+L4 | `REVALIDATION-REQUIRED` |
| **PD6** print `page-margin-safety` | Chrome 150-era print semantic | C32 | B5→B6 | L1 + L3+L4 | `REVALIDATION-REQUIRED` |
| **PD7** single-axis scroll-container combinations affecting sticky ancestry | Chrome 153 beta at research date | C20/C29/C30/C31 if promoted | B3→B6 | future L3+L4 if promoted | `OUT-OF-SCOPE (current stable target) / WATCH` |

## 5. External-signal matrix

External research changes **ranking**, not product truth by itself.

| Variant | Families / boundaries | Evidence effect | Cycle-2 disposition |
|---|---|---|---|
| **EI1** current form/control state + privacy | C13/C27/C39, B2→B7 | peer form-state loss reinforces silent-current-state risk | historical WebClip finding remains terminal; prioritize closure and include as interaction control |
| **EI2** preview/admission -> persisted/later-opened equivalence | C02/C03/C40/C43/C45, B2→B9 | recurring peer blank/incomplete persisted result | historical WebClip artifact/persistence findings remain terminal; every new tranche must verify actual artifact identity |
| **EI3** resource/CSS dependency identity | C06–C10/C14/C21/C36/C45 | peer CSS rewrite + missing image/caption reports | historical resource findings remain terminal; prioritize closure, include nested dependency/offline checks |
| **EI4** bounded termination | C37/C38, cross-cutting B2→B9 | peer hangs + archiving timeout practice | historical budget findings remain terminal; mandatory failure/degradation control for new tranches |

## 6. Risk ranking after Coverage Sweep

Ranking applies to **nonterminal coverage cells first**, then to implementation closure candidates. It uses user impact, silent corruption/data loss, breadth, mission proximity, coverage deficit, external evidence and root-cause uncertainty.

1. **T1 — PD2 View Transition active-state / physical render-cut fidelity** — high silent-corruption risk across generated pseudo state, composed tree, temporal state and B2→B6; entirely absent from Chromium-144 evidence.
2. **T2 — PD3 modern top-layer/scroll-marker pseudo state** — directly visible generated/interaction state with selected-scope, top-layer and negative hover controls.
3. **T3 — PD5/PD6 typography + pagination (`text-fit`, `page-margin-safety`)** — high physical-PDF/layout consequence and measurable L4 page/text/geometry outputs.
4. **T4 — PD4 scoped custom-element registries** — selection/semantic identity risk across Shadow/frame and automatic/manual admission.
5. **T5 — PD1 scroll-triggered animation** — temporal state tied to scroll/user boundary; must prove WebClip does not advance/reset admitted phase through preparation.
6. **Implementation/closure priority after coverage deficits** — EI1 form current state/privacy, EI2 persisted-object equivalence, EI3 resource dependency identity, EI4 shared budget/termination, subject to canonical P-owner priority/severity.
7. **PD7** remains watch until stable/current-target promotion.

Tie-breaker: silent wrong artifact > explicit failure/hang where other risk is comparable.

## 7. First deep-dive tranche envelope — T1

### Surface

**Element-scoped/nested View Transition admitted state -> physical PDF render cut**.

### Relevant families and boundaries

- C14 pseudo/generated content;
- C18 Shadow/composed tree;
- C33 animations/transitions;
- C35 capture/preparation/physical render cut;
- B2 Admission -> B3 Capture -> B4 Static Materialization -> B5 Renderer -> B6 Physical Artifact.

### Contract invariants

From current PDF contract:

- PDF is bound to admitted temporal/render state, not a later arbitrary print moment;
- preparation may not silently substitute another temporal/document/render generation;
- generated/pseudo state that materially changes the non-hover admitted presentation must be represented truthfully or degraded/unknown;
- WebClip-owned preparation state must not become source user state;
- inability to prove fidelity safely must not return silent full success.

### Required variants / controls

1. baseline without View Transition — positive control;
2. document-level or element-scoped stable non-transition state — positive control;
3. active element-scoped transition at admission;
4. nested/concurrent element transition where supported;
5. transition inside Shadow/composed scope;
6. selected Include with explicit Exclude descendant — authority boundary;
7. hover-only overlay absent — negative contract control;
8. mutation around print cut — temporal boundary;
9. bounded timeout/failure — truthful degradation control;
10. physical PDF text/pixels/geometry/hash, not renderer-only observation.

### Known owner/duplicate history to inspect before classification

Initial owner candidates are existing exact-generation/live-page/physical/temporal/representation owners (including P0-070, P0-075, P0-004, P1-187 and related composed/pseudo owners). **No new P-code is authorized by this matrix.** T1 must first inspect current registry/history and source paths, then classify any finding as duplicate/refinement versus independent root cause.

### Required evidence

- L1 current WebClip source handling of transition/pseudo/materialization state;
- L3 **Chrome/Chromium supporting the stable View Transition feature under test**;
- L4 physical PDF comparison;
- L5 not required for the renderer-semantic claim itself; real unpacked extension remains a separate C46 boundary.

### Termination envelope

T1 is complete when:

- supported active transition variants have stable reproduction;
- positive/negative/authority/failure controls distinguish the defect envelope;
- physical artifact effect is proven or absence is proven at L4;
- root-cause ownership is saturated/deduplicated;
- unsupported/current-runner limitations are bounded rather than silently treated as PASS;
- evidence/Matrix/History/Registry updates (Registry only if genuinely warranted) are durable and delivery-tail complete.

## 8. Environment consequence discovered during sweep

The currently available local managed Chromium executable is **144.0.7559.96**. It was sufficient for the prior campaign but cannot be assumed to implement all Chrome 146–152 stable semantics used by PD1–PD6.

Therefore T1 must not claim current-feature L3/L4 PASS from Chromium 144. The next execution step is to obtain/use a safe managed current Chromium/Chrome-for-Testing build that actually supports the feature, or, if unavailable in the execution environment, record a bounded environment requirement while still completing L1/owner/source analysis.

This environment limitation is a test-runner evidence boundary, not evidence that WebClip itself passes or fails T1.

## 9. Current campaign state

Cycle 2 remains:

**`DEEP-AUDIT-IN-PROGRESS`**.

Next action: T1 source/owner saturation plus a feature-capable managed-browser L3/L4 probe. If the current runner cannot support the feature, the tranche remains nonterminal with the exact missing evidence recorded; the campaign then proceeds only according to the policy's bounded-unknown/external/evidence rules, not by downgrading the requirement.
