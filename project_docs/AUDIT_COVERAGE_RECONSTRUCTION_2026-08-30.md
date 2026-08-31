# WebClip — initial deep-audit coverage reconstruction — 2026-08-30

Date: 2026-08-30

Baseline canonical `main`: `bcf310b13dd8584d2e0d66ae4007b511a859843d`.

Stage-2 C22/C23 revalidation audited canonical `main`: `a0e1252317dfa1a1146dbed0e5b8bfe5bb760491`.

Stage-3 C26 hover-exclusion revalidation audited canonical `main`: `153d09c164473643229b29946dc35ba413715913`.

Stage-4 C24 inert-disclosure revalidation audited canonical `main`: `0ecfff217d8cc81099fadd9476532d8d7d845f28`.

Stage-5 C02 SelectionSnapshot restore -> physical-PDF revalidation audited canonical `main`: `07df33f5d1ed572bd4da3083411aef9dd94d21c0`.

Purpose: первая фактическая реконструкция deep-audit Coverage Matrix из уже существующих durable audit evidence, registry/history и merged physical-browser tranches. Этот документ **не заменяет P-code owner/status authority**: `AUDIT_REGISTRY.md` остаётся единственным canonical authority. Coverage rows ниже фиксируют achieved evidence/outcome и должны обновляться после targeted tranches.

Методика задаётся `AUDIT_COVERAGE_CAMPAIGN_POLICY.md`. PDF acceptance задаётся `WEBCLIP_PDF_FIDELITY_CONTRACT.md`.

## 1. Источники реконструкции

Current authority/context:

- `AUDIT_REGISTRY.md` — единственный current authority по P-code owner/status;
- `AUDIT_DELTA_INDEX.md` — navigation по supplemental durable audit evidence;
- `AUDIT_HISTORY_INDEX.md` — corrections/retractions/negative controls/status traps;
- `TEST_STATUS.md` / `TEST_EVIDENCE.md` — historical deterministic/managed-browser и current release-boundary interpretation;
- `WEBCLIP_PDF_FIDELITY_CONTRACT.md` — current PDF acceptance contract.

Основные recent physical/render audit tranches, реконструированные здесь:

- PR #35 / `AUDIT_SAVED_COPY_READABILITY_2026-08-30_EVIDENCE.md`;
- PR #36 / `AUDIT_DEFERRED_VIRTUALIZED_MATERIALIZATION_2026-08-30_EVIDENCE.md`;
- PR #37 / `AUDIT_LONGPAGE_TOPLAYER_PAGINATION*_2026-08-30_EVIDENCE.md`;
- PR #38 / `AUDIT_COMPOSED_RENDERED_SCOPE_CONVERGENCE*_2026-08-30_EVIDENCE.md`;
- PR #39 / `AUDIT_REPLACED_RESOURCE_CONVERGENCE*_2026-08-30_EVIDENCE.md`;
- PR #40 / `AUDIT_CSS_VISUAL_DEPENDENCY_GRAPH*_2026-08-30_EVIDENCE.md`;
- PR #41 / `AUDIT_FLATTENED_DOCUMENT_NAMESPACE*_2026-08-30_EVIDENCE.md`;
- PR #42 / `AUDIT_TYPOGRAPHY_LAYOUT_FIDELITY*_2026-08-30_EVIDENCE.md`;
- PR #43 / `AUDIT_FLATTENED_CSS_NAMED_ENVIRONMENT*_2026-08-30_EVIDENCE.md`;
- PR #44 / `AUDIT_VIEWPORT_ENVIRONMENT_FIDELITY*_2026-08-30_EVIDENCE.md`;
- PR #45 / `AUDIT_TEMPORAL_RENDER_STATE_FIDELITY*_2026-08-30_EVIDENCE.md`;
- PR #46 / `AUDIT_RESPONSIVE_REPLACED_MEDIA_FIDELITY*_2026-08-30_EVIDENCE.md`;
- PR #47 / `AUDIT_RESPONSIVE_IMAGE_CAPTURE_IDENTITY*_2026-08-30_EVIDENCE.md`;
- PR #48 / `AUDIT_FOCUS_INTERACTION_STATE_FIDELITY*_2026-08-30_EVIDENCE.md`;
- C22/C23 targeted tranche / `AUDIT_USER_REACHED_DYNAMIC_SCROLL_2026-08-30_EVIDENCE.md` plus its two managed-Chromium physical probes;
- C26 targeted tranche / `AUDIT_HOVER_EXCLUSION_CONTRACT_2026-08-30_EVIDENCE.md` plus `project_tools/audit_hover_exclusion_contract.py`;
- C24 targeted tranche / `AUDIT_INERT_DISCLOSURE_CONTRACT_2026-08-30_EVIDENCE.md` plus `project_tools/audit_inert_disclosure_contract.py`;
- C02 targeted tranche / `AUDIT_SELECTION_RESTORE_PHYSICAL_PDF_2026-08-31_EVIDENCE.md` plus `project_tools/audit_selection_restore_physical_pdf.py`.

Также использованы supplemental summaries из `AUDIT_DELTA_INDEX.md`, включая selection/admission, selected-only cascade, post-freeze render cut, print rollback, local prepare budgets, source URL minimization, PDF byte transfer receipt и связанные Yandex/Journal/recovery boundaries.

## 2. Консервативное правило зачёта evidence

Historical evidence засчитывается только для того claim, который оно реально доказывало.

Особенно важно: `WEBCLIP_PDF_FIDELITY_CONTRACT.md` принят **после** многих physical tranches. Поэтому наличие L3/L4 probe для близкого механизма не означает PASS нового contract автоматически.

Первоначально три области получили `REVALIDATION-REQUIRED`:

1. user-driven boundary для scroll-triggered new logical content;
2. inert spoiler/disclosure materialization без page-owned synthetic activation;
3. mandatory hover exclusion даже если hover active at admission.

C22/C23, C26 и C24 теперь revalidated fresh targeted tranches: required L3+L4 evidence достигнуто и outcome классифицирован как FINDING. C22/C23 имеет independent owner P1-230; C26 уточняет existing P0-075/P0-070/P0-004; C24 revalidates existing P0-067/P1-212/P1-167/P0-075/P0-070/P0-004 with P1-004 supporting cross-origin parity. Ни C26, ни C24 не создают duplicate P1-231.

C02 также теперь имеет targeted current-source L3+L4 closure до physical PDF. Его outcome — FINDING под existing P1-001/P0-080/P0-070/P0-075/P0-004 с P1-200/P1-171 supporting; новый P-code не требуется.

## 3. Family-level current matrix

Это **family-level** reconstruction, а не окончательный полный cell-level Cartesian map. `Required` означает minimum evidence для material current-PDF claim. `Current` — strongest durable evidence, который можно честно зачесть сейчас.

| ID | Surface family | CORE | Required | Current strongest evidence | Current coverage / outcome | Current owner / главный следующий gap |
|---|---|---:|---|---|---|---|
| C01 | Manual Include/Exclude / selected-scope authority | yes | L2+L3+L4 for saved PDF | selection/capture, selected-only cascade, save-freeze, physical PDF evidence | `ARTIFACT-COVERED / FINDING` | P0-004, P0-070, P0-075, selection-specific owners; preserve Exclude through every materialization path |
| C02 | SelectionSnapshot restore -> admitted rendered target -> saved copy | yes | L3+L4 | fresh actual-content-script restore + physical Chromium PDF controls: stable/Exclude/same-origin-frame positives; hidden/opacity success without physical content; fixed-5000 decoy physically serialized; stale disconnected selection admits empty selected artifact | `ARTIFACT-COVERED / FINDING` | **P1-001/P0-080** primary; P0-070/P0-075/P0-004 supporting physical/generation boundary, P1-200/P1-171 supporting remote/session. Need sound bounded candidate set, rendered-target admission and exact generation revalidation through physical cut |
| C03 | Main Content / auto candidate -> actual saved scope | yes | L3+L4 | selection/rendered-scope and auto-content evidence | `RENDERER-COVERED / PARTIAL` | P1-160/P1-228 family; needs explicit end-to-end artifact variants and boundary controls |
| C04 | Ordinary DOM/text baseline | yes | L2+L4 | PR #35 direct physical text/searchability controls | `ARTIFACT-COVERED / PASS-CONTROL` | baseline control only; does not imply layout/selection families PASS |
| C05 | Geometry/layout | yes | L3+L4 | complex-layout, long-page, typography, viewport physical tranches | `ARTIFACT-COVERED / FINDING` | P0-004, P1-187 and supporting owners |
| C06 | Colors/backgrounds/compositing | yes | L3+L4 | CSS visual dependency, frame CSS, post-freeze physical evidence | `ARTIFACT-COVERED / FINDING` | P1-003, P1-187, P0-004/P0-075 supporting boundaries |
| C07 | Fonts/typography | yes | L3+L4 | PR #42 physical font/layout/page-count controls | `ARTIFACT-COVERED / FINDING` | P1-187, P1-003, P0-004 |
| C08 | Raster images / crop/object-fit | yes | L3+L4 | PR #39/#46 physical resource/crop evidence | `ARTIFACT-COVERED / FINDING` | P1-003, P1-187, P0-004 |
| C09 | Responsive images / `picture` / `srcset` / `currentSrc` | yes | L3+L4 | PR #47 + #46 physical candidate identity evidence | `ARTIFACT-COVERED / FINDING` | P1-003, P1-187, P0-070/P0-075 supporting |
| C10 | SVG visual state/resources | yes | L3+L4 | PR #39/#41/#42/#46 physical SVG resource/namespace/paint evidence | `ARTIFACT-COVERED / FINDING` | P1-187, P1-003, P0-068/P0-004 supporting |
| C11 | Canvas | yes | L3+L4 | frame representation/post-freeze physical evidence and controls | `ARTIFACT-COVERED / FINDING` | P1-187, P0-070/P0-004 supporting |
| C12 | Video / replaced media / current frame | yes | L3+L4 | PR #39/#45/#46 physical media-time/frame evidence | `ARTIFACT-COVERED / FINDING` | P1-187, P1-003, P0-070 |
| C13 | Form / renderer-owned controls | yes | L3+L4 | PR #35/#41/#42/#48 physical control/focus evidence | `ARTIFACT-COVERED / FINDING` | P1-187 plus generation/focus owners; flattened select/current-state gap proven |
| C14 | Pseudo/generated content | yes | L3+L4 | saved-copy positive controls + CSS dependency/post-freeze evidence | `ARTIFACT-COVERED / FINDING` | P1-003/P1-187/P0-070 depending mechanism; resource and mutation parity remain broken |
| C15 | Links / anchors / internal destinations | yes | L4 | PR #35 physical annotations/destinations + namespace evidence | `ARTIFACT-COVERED / FINDING` | P0-004, P1-187, P0-068/P1-213, safe-URI/privacy supporting owners |
| C16 | Same-origin iframe | yes | L3+L4 | PR #35, #38–#47 frame/physical proxy evidence | `ARTIFACT-COVERED / FINDING` | P1-187, P0-068, P0-004, P0-070, P1-003 and related frame owners |
| C17 | Cross-origin iframe capture/print boundary | explicit-boundary | L3+L4 + L5 for real extension permission/session claims | remote-frame physical managed Chromium evidence | `ARTIFACT-COVERED / FINDING + EXTERNAL-REQUIRED` | P1-004, P1-171, P1-199/P1-200/P1-229; real permission/unpacked Chrome remains L5 |
| C18 | Shadow DOM / slots / composed tree | yes | L3+L4 | PR #38 physical composed/rendered scope evidence | `ARTIFACT-COVERED / FINDING` | P0-004/P0-070/P0-075/P1-003/P1-160/P1-227/P1-228 etc. |
| C19 | Ordinary long-page existing content | yes | L3+L4 | PR #37 complete-vs-clipped long-page controls | `ARTIFACT-COVERED / FINDING` | P0-004; current contract explicitly requires full pre-existing scroll content |
| C20 | Nested scroll / retained scrollports | yes | L3+L4 | PR #37 physical slice-loss/current-scroll-state evidence + C22 nested additive positive control | `ARTIFACT-COVERED / FINDING` | P0-004, P1-187 supporting |
| C21 | Lazy/offscreen resources already belonging to content | yes | L3+L4 | PR #36/#39/#40 resource readiness evidence | `ARTIFACT-COVERED / FINDING` | P1-003, P1-167 and supporting representation owners |
| C22 | Scroll-triggered **new logical content** / user-reached max boundary | yes | L3+L4 under current PDF contract | fresh source + managed Chromium 144 + physical PDF controls: print does not generate N+1; user-materialized retained nodes survive scroll-back; current source has no generation-bound user max/history receipt | `ARTIFACT-COVERED / FINDING` | **P1-230 ACTIVE**; add trusted/generation-bound user-reached boundary capture, no WebClip auto-scroll beyond it, nested/frame parity, bounded truthful degradation |
| C23 | Virtualized/windowed content history within user-reached range | yes | L3+L4 under current PDF contract | gradual user-like traversal materialized/seen logical 1…57, returned to top, physical PDF retained only mounted 1…8; recycled selected row changed logical identity | `ARTIFACT-COVERED / FINDING` | **P1-230 ACTIVE** primary whole-history owner; P0-070/P0-080 remain supporting generation/selection identity owners |
| C24 | Spoilers/disclosures / inert expansion | yes | L3+L4 under current PDF contract | fresh current-source + Chromium 144 physical controls: native closed/nested details become readable and Exclude stays absent, but live `open=true` fires page toggle side effects; ARIA/submit/anchor controls receive synthetic clicks; click/toggle-created DOM enters PDF; disclosure mutations persist; same-origin details expand while frame-agent has no cross-origin expansion | `ARTIFACT-COVERED / FINDING` | **P0-067/P1-212 existing owners** primary; P1-167/P0-075/P0-070/P0-004 supporting, P1-004 cross-origin umbrella. Need inert WebClip-owned representation, provenance, shared budget and frame parity/truthful degradation; no P1-231 |
| C25 | Dialog / popover / top layer | yes | L3+L4 | PR #37 physical clipping/repetition/current-scroll state | `ARTIFACT-COVERED / FINDING` | P0-004, P1-187, P0-070 supporting |
| C26 | Hover exclusion | yes | L3+L4 under current PDF contract | fresh current-source + Chromium 144 physical controls: review backdrop clears CSS/pseudo hover, but persistent JS hover-opened DOM remains in top and same-origin-frame PDFs; non-hover dialog positive preserved | `ARTIFACT-COVERED / FINDING` | **P0-075/P0-070/P0-004 existing owners**; no P1-231. Need trusted non-hover admitted representation or truthful degraded/unknown when hover provenance cannot be separated |
| C27 | Focus / selection / interaction-induced page state | yes | L3+L4 | PR #48 physical focus/hover/application-mutation evidence | `ARTIFACT-COVERED / FINDING` | P0-075, P0-070, P0-004, P1-187 supporting |
| C28 | Responsive/environment state | yes | L3+L4 | PR #44/#47 physical viewport/resource evidence | `ARTIFACT-COVERED / FINDING` | P0-004, P0-070, P0-075, P1-187, P1-003 |
| C29 | Viewport units / container-query dependent geometry | yes | L3+L4 | PR #44 physical `vw/vh`/paged-geometry evidence; frame CSS evidence | `ARTIFACT-COVERED / FINDING` | P0-004/P1-187/P0-070/P0-075 supporting |
| C30 | Clipping / overflow / paint containment | yes | L3+L4 | PR #37 physical overflow/clip/contain controls | `ARTIFACT-COVERED / FINDING` | P0-004 |
| C31 | Fixed / sticky | yes | L3+L4 | PR #37 + complex-layout physical controls | `ARTIFACT-COVERED / FINDING` | P0-004/P1-187; flattening policy explicit in PDF contract |
| C32 | Pagination / physical page breaks | yes | L4 | PR #37/#42/#44/#46 physical page-count/layout evidence | `ARTIFACT-COVERED / FINDING` | P0-004 and supporting representation/resource owners |
| C33 | CSS/WAAPI animations/transitions | yes | L3+L4 | PR #45 physical sampled-phase drift evidence | `ARTIFACT-COVERED / FINDING` | P0-070, P0-004, P1-187/P0-075 |
| C34 | Animated image/GIF frame | yes | L3+L4 | PR #45 physical second-frame -> first-frame PDF evidence | `ARTIFACT-COVERED / FINDING` | temporal/resource-generation owner set; exact current-frame receipt absent |
| C35 | Mutation during preparation / `beforeprint` / physical render cut | yes | L3+L4 | post-freeze physical-render-cut evidence | `ARTIFACT-COVERED / FINDING` | P0-070, P0-075, P0-004; P1-003/P1-187 supporting |
| C36 | Same locator/URL, different resource bytes/generation | yes | L2+L3+L4 | PR #46 + transfer/resource evidence | `ARTIFACT-COVERED / FINDING` | P0-070/P1-003/P1-187/P1-184 depending boundary |
| C37 | Failure/retry/rollback/convergence | yes | L2; L3/L5 where browser/external settlement matters | print rollback/retry + extensive deterministic lifecycle evidence | `DETERMINISTIC/RENDERER-COVERED / FINDING + EXTERNAL-REQUIRED` | P0-023/P0-039/P0-048/P0-073/P0-074/P0-079, P1-146/P1-156/P1-199/P1-214 etc. |
| C38 | Node/byte/time/resource budgets | yes | L2+L3 | local-prepare-budget, clone preflight, resource deadline evidence | `RENDERER-COVERED / FINDING` | P0-064/P0-065/P1-154/P1-167/P1-173 etc. |
| C39 | Privacy / data minimization | yes | L1+L2 plus L4/L5 where observable | source-URL physical PDF, SelectionSnapshot portability/privacy evidence | `ARTIFACT-COVERED / FINDING` | P0-066, P1-182 and supporting source/destination owners |
| C40 | Physical PDF bytes / cache identity | yes | L4 | PDF byte/cache/transfer receipt evidence | `ARTIFACT-COVERED / FINDING` | P0-079, P0-070, P1-184/P0-023 supporting |
| C41 | Local download physical settlement / native Save As | explicit-boundary | L5 for actual Chrome/native lifecycle claim | deterministic/model plus historical managed browser evidence | `EXTERNAL-REQUIRED / FINDING` | P0-039/P0-048/P1-146/P1-156/P1-169; real native boundary not current-main verified |
| C42 | Yandex upload/object/public identity | explicit-boundary | L5 | deterministic/mocked/receipt evidence, current owners active | `EXTERNAL-REQUIRED / FINDING` | P0-022/P0-073/P0-074/P0-078/P0-079, P1-090/P1-164/P1-184/P1-195 etc. |
| C43 | Journal / provenance / exact artifact linkage | yes | L2+L3, L5 for remote identity claims | deterministic Journal/recovery evidence + artifact receipt audits | `DETERMINISTIC/RENDERER-COVERED / FINDING` | P0-050/P0-070/P0-076/P1-182/P1-185/P1-186/P1-190 etc. |
| C44 | Backup / import / recovery | yes | L2; L5 for real Yandex restore | deterministic import/backup/recovery evidence; active registry owners | `DETERMINISTIC-COVERED / FINDING + EXTERNAL-REQUIRED` | P0-013/P0-022/P0-077, P1-035/P1-076/P1-179/P1-183/P1-194 etc. |
| C45 | Later reading / reopened PDF usefulness | yes | L4 | PR #35 plus many physical artifact tranches | `ARTIFACT-COVERED / FINDING` | link/readability/form/frame/layout owners; later-reading family has direct evidence, not inferred success |
| C46 | Real unpacked Chrome / optional permission UI / actual `chrome.debugger` extension path | explicit-boundary | L5 | historical managed evidence only; enterprise policy blocked real unpacked run | `EXTERNAL-REQUIRED / UNKNOWN` | release QA boundary; relevant active permission/frame/download owners remain open |

## 4. Что уже можно считать сильной стороной текущего audit evidence

Реконструкция показывает, что проект уже имеет unusually deep engineering evidence для многих renderer/physical-PDF surfaces:

- direct managed-Chromium `Page.printToPDF` physical probes используются не эпизодически, а во многих independent tranches;
- layout/clipping/pagination, fonts, resources, frame flattening, responsive candidate identity, temporal state, focus, user-reached virtual-history, hover-exclusion, disclosure-expansion и SelectionSnapshot restore-to-artifact behavior проверены именно на physical PDF, а не только source/model level;
- historical audits сохраняют positive/negative/rejected controls, что снижает риск повторного открытия отвергнутых broad hypotheses;
- registry разделяет exact-generation, resource, frame, persistence, recovery и user-reached-history owners вместо одного неуправляемого «PDF fidelity bug».

То есть главный текущий deficiency — не отсутствие глубины вообще, а **оставшиеся contract-specific gaps, ACTIVE findings и explicit L5 boundaries**.

## 5. Главные gaps после C22/C23, C26, C24 и C02 revalidation

### G1 — user-driven dynamic-scroll / virtualized history — classified FINDING, owner P1-230

Fresh C22/C23 tranche доказал:

- без user scroll physical PDF не инициирует новый additive scroll-load — negative contract control PASS;
- user-driven additive/nested materialization до N остаётся в PDF после возврата вверх, если page сохраняет nodes mounted;
- current top-document и cross-origin frame-agent source не имеют generation-bound max-user-reached/history representation;
- gradual virtual traversal действительно materialized/seen logical range 1…57; после возврата вверх physical PDF содержит только current mounted 1…8;
- reusable selected DOM node может сменить logical identity до physical cut.

Это больше не product-mode ambiguity P2-007: текущий PDF contract уже определяет user-reached dynamic content как входящий в completeness envelope. Whole-history loss классифицирован как independent **P1-230 ACTIVE**. Implementation остаётся отдельным будущим closure tranche.

### G2 — hover exclusion — classified FINDING under existing owners

Fresh C26 tranche уточнил historical PR #48 против current contract:

- direct Chromium физически сериализует CSS `:hover`, hover pseudo-content и JS hover-mounted DOM;
- current WebClip-shaped review backdrop естественно снимает tested CSS/pseudo hover и вызывает pointerleave — broad CSS-hover failure rejected;
- если page сама удаляет hover UI on leave, physical PDF чистый;
- если hover-opened JS flyout остаётся mounted, current preparation не имеет provenance/non-hover representation boundary и physical PDF сохраняет его;
- same-origin frame повторяет механизм;
- independent non-hover open dialog остаётся, поэтому blanket transient-state deletion недопустим;
- inability to distinguish hover provenance currently не превращается в truthful degraded/unknown.

Root-cause saturation показывает existing **P0-075 / P0-070 / P0-004** sufficient. Новый P1-231 не выделяется.

### G3 — inert spoiler/disclosure expansion — classified FINDING under existing owners

Fresh C24 tranche доказал одновременно positive и failing controls:

- native closed и nested `<details>` можно физически сделать читаемыми; already-open остаётся open;
- Excluded descendant внутри раскрытого details остаётся отсутствующим в physical PDF;
- но current helper меняет live `details.open`, и page-owned `toggle` side effect может создать новый DOM, который затем попадает в PDF;
- ARIA/accordion fallback вызывает реальный page-owned `.click()`; disclosure-like `button[type=submit]` и non-hash anchor могут пройти текущую эвристику;
- stateful content, созданный именно synthetic click, попадает в physical PDF;
- disclosure mutations намеренно не rollback-ятся после print;
- sourceState=closed и staticRepresentation=expanded не имеют отдельного provenance receipt;
- selected same-origin frame получает top-helper expansion, а current cross-origin frame-agent disclosure expansion не реализует;
- serial 40-ms waits и broad candidate scans остаются вне one shared prepare budget.

Root causes уже принадлежат **P0-067/P1-212** (synthetic control activation), **P1-167** (shared preparation budget), **P0-075/P0-070/P0-004** (live-page/static-generation/physical consequences), с **P1-004** как supporting cross-origin feature umbrella. Новый P1-231 не выделяется.

### G4 — SelectionSnapshot restore -> physical PDF — classified FINDING under existing owners

Fresh C02 tranche закрыл прежний renderer-only gap до B6:

- stable visible restore после benign insertion physically preserves intended selected marker;
- restored Exclude remains physically absent;
- equal plausible candidates fail closed while a stable selected guard preserves a valid artifact path;
- same-origin framePath restore reaches physical PDF;
- `visibility:hidden` и `opacity:0` targets сохраняют non-zero geometry and can receive high-confidence successful restore, но intended marker physically отсутствует;
- exact intended target beyond the first-5000 tag prefix can lose to an in-prefix high-confidence decoy, and physical PDF contains the decoy rather than intended target;
- post-restore same-document replacement can leave a disconnected Element in `state.includes`; save admission still sees a non-zero Include count while physical selected artifact contains no intended live selected content.

Root causes already belong to **P1-001** (restore/candidate/rendered admission) and **P0-080** (stale disconnected same-document selection), with **P0-070/P0-075/P0-004** supporting exact-generation/live-page/physical consequences and **P1-200/P1-171** remaining remote/session supporting owners. Новый P-code не выделяется.

### G5 — Main Content end-to-end physical artifact coverage remains weaker than required

C03 remains `RENDERER-COVERED / PARTIAL`. Existing auto-content/source/rendered-scope evidence is substantial, but the campaign still lacks one current systematic L3+L4 tranche proving what the auto-selected candidate becomes in the final physical saved artifact across benign/adversarial candidate competition, nested/frame/environment variants and post-admission drift.

### G6 — L5 external boundaries остаются сознательно незакрыты

Real unpacked Chrome, optional permission UI, native download/Save As и real external-storage API остаются `EXTERNAL-REQUIRED`, что согласуется с current `TEST_STATUS.md`/release policy. Это не должно ошибочно превращаться в managed PASS.

## 6. Приоритет следующего deep-dive tranche после C02

После перевода C02 в `ARTIFACT-COVERED / FINDING` единственным оставшимся material in-repo CORE family gap с weaker-than-required end-to-end artifact evidence в текущем ranking является C03. Explicit L5 rows C41/C42/C46 нельзя закрыть managed evidence и поэтому они не вытесняют доступный in-repo coverage work.

Следующий tranche рекомендуется:

### **C03 — Main Content / Auto Candidate → Final Physical PDF Contract Tranche**

Почему C03 теперь следующий:

- это последний явно отмеченный CORE admission-source family с `RENDERER-COVERED / PARTIAL` вместо required L3+L4 artifact evidence;
- auto-content is a user-triggered authority source: an incorrect or stale candidate can silently define the entire saved scope before renderer/resource checks;
- current registry already has P1-160/P1-228 family ownership for bounded discovery/rendered-scope semantics, with P0-070/P0-075/P0-004 likely supporting generation/physical consequences;
- safe deterministic fixtures can exercise the actual `detectMainContent()`/selection/save path without L5 external dependencies;
- C02 just demonstrated that renderer-level selection success alone cannot be promoted to saved-artifact truth, so C03 must receive the same B2→B6 discipline rather than inferred closure.

Предварительный envelope C03:

- semantic `article/main/[role=main]` positive candidate -> final physical marker;
- fallback body/container candidate -> bounded truthful scope rather than whole unrelated shell;
- competing article/sidebar/promo/link-dense candidates -> intended main content wins or selection truth degrades explicitly;
- same-origin frame candidate -> physical parity and exact frame scope;
- post-auto-selection replacement/disconnection before save -> no stale authority;
- nested selected/excluded and selected-only physical controls;
- bounded-work controls for large candidate sets/link text scans;
- no inference of cross-origin/L5 permission closure from managed same-origin results.

Required evidence: **L3+L4**, with L1 source proof and L2 deterministic candidate/budget controls where needed.

After C03 the matrix must be reranked again rather than automatically declaring coverage complete: remaining RENDERER/DETERMINISTIC rows, explicit L5 cells and any newly decomposed material family cells still need conservative triage.

## 7. Campaign state after C02

Current project state remains:

**`DEEP-AUDIT-IN-PROGRESS`**.

C22/C23, C26, C24 and C02 are audit-complete at their required L3+L4 in the important sense that their outcome is terminal **FINDING**, not because implementation is fixed. P1-230 owns C22/C23 implementation acceptance; C26 refines existing P0-075/P0-070/P0-004; C24 refines existing P0-067/P1-212/P1-167/P0-075/P0-070/P0-004 with P1-004 supporting cross-origin parity; C02 refines existing P1-001/P0-080/P0-070/P0-075/P0-004 with P1-200/P1-171 supporting remote/session variants.

Coverage is still not complete because:

- C03 retains weaker end-to-end physical coverage;
- C46 remains `EXTERNAL-REQUIRED / UNKNOWN` and C41/C42 retain external L5 boundaries;
- several other family rows intentionally remain deterministic/renderer-covered rather than artifact-complete where required level differs;
- many proven FINDING owners remain ACTIVE;
- family rows still need decomposition when a future tranche reveals materially distinct cells.

Нельзя объявлять `DEEP-AUDIT-COVERAGE-COMPLETE`, пока эти nonterminal gaps не triage-нуты/доведены до required evidence и итоговая matrix не содержит material unexplained NOT-AUDITED областей.

## 8. Следующий durable checkpoint

Следующий targeted tranche должен быть C03 и обновить минимум:

- achieved L3/L4 outcome for Main Content / auto candidate -> final physical PDF;
- exact owner/duplicate classification against P1-160/P1-228 and adjacent generation/physical owners;
- positive/negative/adversarial auto-candidate controls;
- residual deterministic/renderer-only rows and explicit L5 gaps;
- campaign ranking after C03.

После C03 нужно заново сравнить оставшиеся in-repo rows и explicit L5/other residual cells по текущему risk ranking.