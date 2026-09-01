# WebClip — Cycle 2 Coverage Sweep / Matrix v2 — final reconciled checkpoint

Date: 2026-09-01

Campaign: `DEEP-RESEARCH-CYCLE-2-2026-08-31`.

Original Cycle-2 sweep baseline: `main = 7a0280851133dbf87e3b25b90dbdd4c4ed5e4217`.

Final reconciliation baseline: `main = 508b3c4c3c0f3385f524beb3d1bce33d2d5c302e` (T5 merged; Repository Integrity #191 SUCCESS).

Durable deep-dive evidence:

- T1/PD2 — `RESEARCH_CYCLE2_T1_VIEW_TRANSITION_RENDER_CUT_2026-08-31.md`;
- T2/PD3 — `RESEARCH_CYCLE2_T2_PSEUDO_TOP_LAYER_SCROLL_MARKER_2026-08-31.md`;
- T3/PD5+PD6 — `RESEARCH_CYCLE2_T3_TEXT_FIT_PAGE_MARGIN_SAFETY_2026-08-31.md`;
- T4/PD4 — `RESEARCH_CYCLE2_T4_SCOPED_CUSTOM_ELEMENT_REGISTRY_2026-08-31.md`;
- T5/PD1 — `RESEARCH_CYCLE2_T5_SCROLL_TRIGGERED_ANIMATION_2026-09-01.md`;
- final synthesis — `RESEARCH_COVERAGE_CYCLE2_FINAL_SYNTHESIS_2026-09-01.md`.

`RESEARCH_REGISTRY.md` remains the sole P-code owner/status authority. A terminal `FINDING` is research-complete but not implementation-complete. Explicit L5/UNKNOWN/OUT-OF-SCOPE boundaries remain visible rather than being converted into synthetic PASS.

## 1. Final family matrix

| ID | Surface family | Relevance | Required evidence | Final Cycle-2 coverage / outcome | Final Change-Impact conclusion | Owner / boundary context |
|---|---|---|---|---|---|---|
| C01 | Manual Include/Exclude / selected-scope authority | RELEVANT | L2+L3+L4 | `ARTIFACT-COVERED / FINDING` | terminal; selection authority repeatedly exercised as control | P0-004/P0-070/P0-075 + selection owners |
| C02 | SelectionSnapshot restore -> admitted target -> saved copy | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING` | PD4 closes current registry-identity delta | P1-001/P0-080; P0-070/P0-075/P0-004 support |
| C03 | Main Content / auto candidate -> saved scope | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING` | PD4 closes scoped-shadow semantic-discovery delta | P1-160; P0-080/P0-070/P0-075/P0-004 support |
| C04 | Ordinary DOM/text baseline | RELEVANT | L2+L4 | `ARTIFACT-COVERED / PASS-CONTROL` | terminal baseline | baseline control |
| C05 | Geometry/layout | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING` | PD5 closes current fitted-layout delta | P0-070/P0-075/P0-004; P1-187 support |
| C06 | Colors/backgrounds/compositing | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING` | terminal carry-forward; no independent new stable gap | P1-003/P1-187/P0-004/P0-075 |
| C07 | Fonts/typography | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING` | PD5 closes `text-fit` typography delta | P0-070/P0-075/P0-004; P1-187/P1-003 support |
| C08 | Raster images / crop/object-fit | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING` | terminal carry-forward | P1-003/P1-187/P0-004 |
| C09 | Responsive images / picture/srcset/currentSrc | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING` | terminal carry-forward | P1-003/P1-187/P0-070/P0-075 |
| C10 | SVG visual state/resources | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING` | terminal carry-forward | P1-187/P1-003/P0-068/P0-004 |
| C11 | Canvas | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING` | terminal carry-forward | P1-187/P0-070/P0-004 |
| C12 | Video/replaced media/current frame | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING` | terminal carry-forward | P1-187/P1-003/P0-070 |
| C13 | Form / renderer-owned controls | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING` | terminal; EI1 remains closure priority | P1-187 + generation/focus/privacy owners |
| C14 | Pseudo/generated content | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING` | PD2+PD3 terminal | P0-070/P0-075/P0-004; P1-003 support |
| C15 | Links/anchors/internal destinations | RELEVANT | L4 | `ARTIFACT-COVERED / FINDING` | terminal carry-forward | P0-004/P1-187/P0-068/P1-213 + safe-URI/privacy owners |
| C16 | Same-origin iframe | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING + PD4 PASS-CONTROL` | scoped-registry frame control closes current PD4 delta; historical findings remain | P1-187/P0-068/P0-004/P0-070/P1-003 + frame owners |
| C17 | Cross-origin iframe capture/print boundary | EXPLICIT-BOUNDARY | L3+L4+L5 | `ARTIFACT-COVERED / FINDING + EXTERNAL-REQUIRED` | managed coverage terminal; real permission/session path remains L5 | P1-004/P1-171/P1-199/P1-200/P1-229 |
| C18 | Shadow DOM/slots/composed tree | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING` | PD2+PD4 terminal | P0-004/P0-070/P0-075/P1-003/P1-160/P1-227/P1-228 etc. |
| C19 | Ordinary long-page existing content | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING` | terminal carry-forward | P0-004 |
| C20 | Nested scroll / retained scrollports | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING + PD1 PASS-CONTROL` | T5 nested trigger remains stable; historical nested findings remain | P0-070/P0-075/P0-004; P1-187/P1-230 support |
| C21 | Lazy/offscreen resources already belonging to content | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING` | terminal carry-forward | P1-003/P1-167 + representation owners |
| C22 | Scroll-triggered new logical content / user-reached max | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING` | T5 negative control confirms no auto-scroll/generated batch without user scroll | P1-230 |
| C23 | Virtualized/windowed history within user-reached range | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING` | terminal historical user-reached-history finding | P1-230; P0-070/P0-080 support |
| C24 | Spoilers/disclosures / inert expansion | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING` | terminal carry-forward | P0-067/P1-212/P1-167/P0-075/P0-070/P0-004; P1-004 support |
| C25 | Dialog/popover/top layer | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING` | PD3 terminal | P0-070/P0-075/P0-004; P1-003 support |
| C26 | Hover exclusion | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING` | terminal; negative control repeated in current tranches | P0-075/P0-070/P0-004 |
| C27 | Focus/selection/interaction-induced state | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING` | PD3 terminal; EI1 remains closure context | P0-075/P0-070/P0-004; P1-187 support |
| C28 | Responsive/environment state | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING` | PD5 terminal | P0-070/P0-075/P0-004; P1-187/P1-003 support |
| C29 | Viewport/container-dependent geometry | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING` | PD1+PD5 terminal; T5 active view trigger is reset by selected-only geometry | P0-004/P0-070/P0-075; P1-187 support |
| C30 | Clipping/overflow/paint containment | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING` | terminal; PD7 WATCH only | P0-004 |
| C31 | Fixed/sticky | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING` | terminal; PD7 WATCH only | P0-004/P1-187 |
| C32 | Pagination / physical page breaks | RELEVANT | L4 | `ARTIFACT-COVERED / FINDING + PD6 PASS-CONTROL` | PD5 finding + bounded PD6 virtual-PDF control terminal | P0-070/P0-075/P0-004 + representation/resource support |
| C33 | CSS/WAAPI animations/transitions | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING` | PD1+PD2 terminal; T5 finished phase resets to zero before artifact | P0-070/P0-075/P0-004; temporal owners support |
| C34 | Animated image/GIF frame | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING` | terminal carry-forward | temporal/resource-generation owner set |
| C35 | Mutation during preparation/beforeprint/render cut | RELEVANT | L3+L4 | `ARTIFACT-COVERED / FINDING` | PD1/PD2/PD3/PD5 terminal; multiple physical substitutions proven | P0-070/P0-075/P0-004; P1-003/P1-187 support |
| C36 | Same locator/URL, different resource bytes/generation | RELEVANT | L2+L3+L4 | `ARTIFACT-COVERED / FINDING` | terminal carry-forward; EI3 closure priority | P0-070/P1-003/P1-187/P1-184 |
| C37 | Failure/retry/rollback/convergence | RELEVANT | L2; L3/L5 where needed | `DETERMINISTIC/RENDERER-COVERED / FINDING + EXTERNAL-REQUIRED` | in-repo failure semantics terminal; native/external settlement remains explicit | P0-023/P0-039/P0-048/P0-073/P0-074/P0-079; P1-146/P1-156/P1-199/P1-214 etc. |
| C38 | Node/byte/time/resource budgets | RELEVANT | L2+L3 | `RENDERER-COVERED / FINDING` | terminal under required level | P0-064/P0-065/P1-154/P1-160/P1-167/P1-173 etc. |
| C39 | Privacy/data minimization | RELEVANT | L1+L2+L4/L5 | `ARTIFACT-COVERED / FINDING` | terminal; EI1 remains implementation priority | P0-066/P1-182 + support |
| C40 | Physical PDF bytes/cache identity | RELEVANT | L4 | `ARTIFACT-COVERED / FINDING` | terminal; current tranches hash/reopen actual PDFs | P0-079/P0-070/P1-184/P0-023 |
| C41 | Local download physical settlement/native Save As | EXPLICIT-BOUNDARY | L5 | `EXTERNAL-REQUIRED / FINDING` | bounded real native settlement remains L5 | P0-039/P0-048/P1-146/P1-156/P1-169 |
| C42 | Yandex upload/object/public identity | EXPLICIT-BOUNDARY | L5 | `EXTERNAL-REQUIRED / FINDING` | bounded real Yandex identity remains L5 | P0-022/P0-073/P0-074/P0-078/P0-079; P1-090/P1-164/P1-184/P1-195 etc. |
| C43 | Journal/provenance/exact artifact linkage | RELEVANT | L2+L3; L5 remote | `DETERMINISTIC/RENDERER-COVERED / FINDING` | terminal local/browser semantics; exact remote-object aspects owned/external separately | P0-050/P0-070/P0-076/P1-182/P1-185/P1-186/P1-190 etc. |
| C44 | Backup/import/recovery | RELEVANT | L2; L5 real Yandex restore | `DETERMINISTIC-COVERED / FINDING + EXTERNAL-REQUIRED` | in-repo recovery terminal; real Yandex restore remains L5 | P0-013/P0-022/P0-077; P1-035/P1-076/P1-179/P1-183/P1-194 etc. |
| C45 | Later reading / reopened PDF usefulness | RELEVANT | L4 | `ARTIFACT-COVERED / FINDING` | terminal physical later-reading evidence | link/readability/form/frame/layout/resource owners |
| C46 | Real unpacked Chrome / permission UI / actual chrome.debugger path | EXPLICIT-BOUNDARY | L5 | `EXTERNAL-REQUIRED / UNKNOWN` | bounded real-product/native boundary; no managed PASS is claimed | release-QA boundary + permission/frame/download owners |

## 2. Final metrics

At final Cycle-2 reconciliation:

- total required starting families: **46/46 triaged**;
- family-level `NOT-TRIAGED`: **0**;
- families with terminal required evidence under current Cycle-2 Change Impact: **46**;
- families with at least one new stable-browser variant requiring revalidation: **0**;
- remaining revalidation set: **none**;
- explicit L5/external families: **C17, C37, C41, C42, C44, C46**;
- C46 remains bounded `EXTERNAL-REQUIRED / UNKNOWN`;
- new P-codes allocated by Cycle-2 T1–T5: **0**;
- terminal finding platform-delta variants: **PD1, PD2, PD3, PD4, PD5 — `ARTIFACT-COVERED / FINDING`**;
- terminal bounded pass-control platform variant: **PD6 — `ARTIFACT-COVERED / PASS-CONTROL (virtual PDF target)`**;
- pending current-stable platform-delta variants: **none**;
- PD7 remains `OUT-OF-SCOPE (current stable target) / WATCH` at this campaign checkpoint.

Coverage completeness and finding closure remain independent metrics. This Matrix does not claim that the many ACTIVE findings are fixed.

## 3. Platform-delta matrix

| Variant | Campaign checkpoint status | Families | Required | Final state |
|---|---|---|---|---|
| **PD1** Scroll-triggered animations | Chrome 146 stable | C20/C29/C33/C35; C22 boundary | L1+L3+L4 | `ARTIFACT-COVERED / FINDING` — T5 complete |
| **PD2** Element-scoped/nested View Transitions | Chrome 147 stable | C14/C18/C33/C35 | L1+L3+L4 | `ARTIFACT-COVERED / FINDING` — T1 complete |
| **PD3** `::backdrop` / `::scroll-marker` state | current stable | C14/C20/C25/C27 | L1+L3+L4 | `ARTIFACT-COVERED / FINDING` — T2 complete |
| **PD4** Scoped custom-element registries | Chrome 146 stable | C02/C03/C16/C18 | L1+L3+L4 | `ARTIFACT-COVERED / FINDING` — T4 complete, same-origin frame bounded control |
| **PD5** CSS `text-fit` | Chrome 150 stable | C05/C07/C28/C29/C32 | L1+L3+L4 | `ARTIFACT-COVERED / FINDING` — T3 complete |
| **PD6** print `page-margin-safety` | Chrome 150-era print semantic | C32 | L1+L3+L4 | `ARTIFACT-COVERED / PASS-CONTROL (virtual PDF target)` — T3 complete |
| **PD7** single-axis scroll-container combinations affecting sticky ancestry | Chrome 153 beta at research checkpoint | C20/C29/C30/C31 if promoted | future L3+L4 | `OUT-OF-SCOPE (current stable target) / WATCH` |

## 4. External-signal disposition

External research changed risk ranking, not WebClip requirements by itself.

- **EI1 form/control state + privacy** — coverage terminal; implementation/closure priority remains.
- **EI2 admission→persisted/later-opened equivalence** — coverage terminal; exact artifact identity remains a closure concern.
- **EI3 resource/CSS dependency identity** — coverage terminal; implementation priority remains.
- **EI4 bounded termination** — coverage terminal with explicit failure/budget/external boundaries.

## 5. Change Impact / staleness

Cycle 2 began from `main = 2ab1aaca13a34eb64fc6934bc2ebbd042bb070e8`. Fresh compare to final reconciliation baseline `508b3c4c3c0f3385f524beb3d1bce33d2d5c302e` contains only `project_docs/**` and `project_tools/**` research/process changes. Production runtime, `manifest.json`, release files and the current PDF fidelity contract did not change during the campaign.

The external baseline `RESEARCH_EXTERNAL_USER_INTENT_BASELINE_2026-08-31.md` is one day old at reconciliation and inside the active-research freshness target.

## 6. Final campaign state

The separate final synthesis applies `RESEARCH_COVERAGE_CAMPAIGN_POLICY.md` completion gates to this merged 46/0 Matrix and bounded external set.

Cycle 2 is therefore:

**`DEEP-RESEARCH-COVERAGE-COMPLETE`**.

The stronger states are explicitly not implied:

- `DEEP-RESEARCH-CRITICAL-CLOSURE-COMPLETE` — **not claimed**;
- `RELEASE-READY` — **not claimed**; `RELEASE_READINESS.md` remains `NOT READY`.

Next work is risk-ranked implementation + Closure Sweep under canonical Registry ownership. A future material runtime/contract/platform/external change may mark affected cells `REVALIDATION-REQUIRED` again.
