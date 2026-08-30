# WebClip — initial deep-audit coverage reconstruction — 2026-08-30

Date: 2026-08-30

Baseline canonical `main`: `bcf310b13dd8584d2e0d66ae4007b511a859843d`.

Purpose: первая фактическая реконструкция deep-audit Coverage Matrix из уже существующих durable audit evidence, registry/history и merged physical-browser tranches. Этот документ **не меняет P-code owner/status**, не объявляет текущую реализацию соответствующей новому PDF contract и не заменяет `AUDIT_REGISTRY.md`.

Методика задаётся `AUDIT_COVERAGE_CAMPAIGN_POLICY.md`. PDF acceptance задаётся `WEBCLIP_PDF_FIDELITY_CONTRACT.md`.

## 1. Источники реконструкции

Current authority/context:

- `AUDIT_REGISTRY.md` — единственный current authority по P-code owner/status;
- `AUDIT_DELTA_INDEX.md` — navigation по supplemental durable audit evidence;
- `AUDIT_HISTORY_INDEX.md` — corrections/retractions/negative controls/status traps;
- `TEST_STATUS.md` / `TEST_EVIDENCE.md` — historical deterministic/managed-browser и current release-boundary interpretation;
- `WEBCLIP_PDF_FIDELITY_CONTRACT.md` — новый current PDF acceptance contract.

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
- PR #48 / `AUDIT_FOCUS_INTERACTION_STATE_FIDELITY*_2026-08-30_EVIDENCE.md`.

Также использованы supplemental summaries из `AUDIT_DELTA_INDEX.md`, включая selection/admission, selected-only cascade, post-freeze render cut, print rollback, local prepare budgets, source URL minimization, PDF byte transfer receipt и связанные Yandex/Journal/recovery boundaries.

## 2. Консервативное правило зачёта evidence

Historical evidence засчитывается только для того claim, который оно реально доказывало.

Особенно важно: новый `WEBCLIP_PDF_FIDELITY_CONTRACT.md` принят **после** многих physical tranches. Поэтому наличие L3/L4 probe для близкого механизма не означает PASS нового contract автоматически.

Три области сразу получают `REVALIDATION-REQUIRED`:

1. user-driven boundary для scroll-triggered new logical content;
2. inert spoiler/disclosure materialization без page-owned synthetic activation;
3. mandatory hover exclusion даже если hover active at admission.

Это не новые P-codes и не автоматический finding admission. Это доказательство того, что existing evidence ниже нового acceptance envelope и требуется targeted re-audit/owner reconciliation.

## 3. Family-level initial matrix

Это первая **family-level** реконструкция, а не окончательный полный cell-level Cartesian map. `Required` означает minimum evidence для material current-PDF claim. `Current` — strongest durable evidence, который можно честно зачесть сейчас.

| ID | Surface family | CORE | Required | Current strongest evidence | Current coverage / outcome | Current owner / главный следующий gap |
|---|---|---:|---|---|---|---|
| C01 | Manual Include/Exclude / selected-scope authority | yes | L2+L3+L4 for saved PDF | selection/capture, selected-only cascade, save-freeze, physical PDF evidence | `ARTIFACT-COVERED / FINDING` | P0-004, P0-070, P0-075, selection-specific owners; preserve Exclude through every materialization path |
| C02 | SelectionSnapshot restore -> admitted rendered target -> saved copy | yes | L3+L4 | restore-soundness/picker/admission managed Chromium | `RENDERER-COVERED / PARTIAL` | P1-001, P1-200, P1-171; missing systematic L4 saved-artifact closure after restore under generation/render drift |
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
| C19 | Ordinary long-page existing content | yes | L3+L4 | PR #37 complete-vs-clipped long-page controls | `ARTIFACT-COVERED / FINDING` | P0-004; current contract now explicitly requires full pre-existing scroll content |
| C20 | Nested scroll / retained scrollports | yes | L3+L4 | PR #37 physical slice-loss/current-scroll-state evidence | `ARTIFACT-COVERED / FINDING` | P0-004, P1-187/P2-007 supporting |
| C21 | Lazy/offscreen resources already belonging to content | yes | L3+L4 | PR #36/#39/#40 resource readiness evidence | `ARTIFACT-COVERED / FINDING` | P1-003, P1-167 and supporting representation owners |
| C22 | Scroll-triggered **new logical content** / user-reached max boundary | yes | L3+L4 under new PDF contract | PR #36 proves before/after explicit scroll behavior but predates new user-boundary acceptance | `REVALIDATION-REQUIRED / UNKNOWN` | likely intersects P0-070/P2-007/P1-003/P1-167; exact owner reconciliation required after targeted fresh tranche |
| C23 | Virtualized/windowed content history within user-reached range | yes | L3+L4 under new PDF contract | PR #36 proves only current 8-row window and recycled-selection drift | `REVALIDATION-REQUIRED / UNKNOWN` | P0-070/P0-004/P2-007 supporting; need fresh proof whether user-reached history can be reconstructed or truthfully degraded |
| C24 | Spoilers/disclosures / inert expansion | yes | L3+L4 under new PDF contract | historical disclosure/details and print-preparation evidence | `REVALIDATION-REQUIRED / UNKNOWN` | P0-067/P0-004/P0-070/P1-167 related; must prove inert expansion, Exclude preservation and no page-owned click |
| C25 | Dialog / popover / top layer | yes | L3+L4 | PR #37 physical clipping/repetition/current-scroll state | `ARTIFACT-COVERED / FINDING` | P0-004, P1-187, P0-070/P2-007 supporting |
| C26 | Hover exclusion | yes | L3+L4 under new PDF contract | PR #48 proves hover-only state is physically printable in Chromium and WebClip pointer movement can change it | `REVALIDATION-REQUIRED / UNKNOWN` | P0-075/P0-070/P0-004/P2-007 related; no proof current pipeline deliberately normalizes non-hover representation |
| C27 | Focus / selection / interaction-induced page state | yes | L3+L4 | PR #48 physical focus/hover/application-mutation evidence | `ARTIFACT-COVERED / FINDING` | P0-075, P0-070, P0-004, P1-187/P2-007 supporting |
| C28 | Responsive/environment state | yes | L3+L4 | PR #44/#47 physical viewport/resource evidence | `ARTIFACT-COVERED / FINDING` | P0-004, P0-070, P0-075, P1-187, P1-003 |
| C29 | Viewport units / container-query dependent geometry | yes | L3+L4 | PR #44 physical `vw/vh`/paged-geometry evidence; frame CSS evidence | `ARTIFACT-COVERED / FINDING` | P0-004/P1-187/P0-070/P0-075 supporting |
| C30 | Clipping / overflow / paint containment | yes | L3+L4 | PR #37 physical overflow/clip/contain controls | `ARTIFACT-COVERED / FINDING` | P0-004 |
| C31 | Fixed / sticky | yes | L3+L4 | PR #37 + complex-layout physical controls | `ARTIFACT-COVERED / FINDING` | P0-004/P1-187; flattening policy now explicit in PDF contract |
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

Реконструкция показывает, что WebClip уже имеет unusually deep engineering evidence для многих renderer/physical-PDF surfaces:

- direct managed-Chromium `Page.printToPDF` physical probes используются не эпизодически, а во многих independent tranches;
- layout/clipping/pagination, fonts, resources, frame flattening, responsive candidate identity, temporal state и focus были проверены именно на physical PDF, а не только source/model level;
- historical audits сохраняют positive/negative/rejected controls, что снижает риск повторного открытия отвергнутых broad hypotheses;
- registry уже разделяет многие exact-generation, resource, frame, persistence и recovery owners вместо одного неуправляемого «PDF fidelity bug».

То есть главный текущий deficiency — не отсутствие глубины вообще, а **отсутствие единой coverage accounting model и несколько новых contract-specific gaps после принятия PDF fidelity contract**.

## 5. Главные gaps после reconstruction

### G1 — user-driven dynamic-scroll boundary — самый прямой новый contract gap

PR #36 доказал platform/current behavior:

- без scroll infinite feed остаётся ограниченным;
- explicit user-like scroll materializes больше content;
- virtual list печатает только текущее mounted window;
- recycled selected node может сменить logical identity.

Но новый contract требует другого precise claim:

- WebClip не должен auto-scroll дальше пользователя;
- должен знать maximum user-reached boundary, даже если пользователь вернулся вверх;
- должен сохранить уже user-reached virtualized history либо truthfully объявить partial/degraded/unknown.

Это **не доказано** existing evidence и должно стать отдельным fresh deep-dive tranche.

### G2 — hover exclusion теперь обязательный negative representation contract

PR #48 физически доказал, что Chromium может сериализовать hover-only pixels/text. Исторически это было evidence о transient-state fidelity/risk. Теперь product decision говорит обратное: hover всегда исключается.

Нужно доказать deliberate non-hover normalization без page-owned side effects и без уничтожения других admitted states.

### G3 — spoiler expansion должен быть inert и selection-bounded

Исторический проект умел раскрывать disclosures/spoilers, но новый contract требует одновременно:

- closed safe content включается;
- source closed/open provenance не подменяется;
- expansion происходит на inert capture/static representation;
- никакого page-owned synthetic click;
- Exclude не возвращается;
- network/stateful disclosure без user materialization не активируется молча.

Existing evidence покрывает части механизма, но не весь новый acceptance envelope.

### G4 — restore/main-content end-to-end physical artifact coverage слабее, чем renderer-selection evidence

Selection/picker/restore audits очень глубоки на admission/locator/rendered-target уровне, но family-level reconstruction не нашла столь же систематического L4 closure для `restored/auto-selected exact scope -> final physical PDF` во всех generation/frame variants.

### G5 — L5 external boundaries остаются сознательно незакрыты

Real unpacked Chrome, optional permission UI, native download/Save As и real Yandex API остаются `EXTERNAL-REQUIRED`, что согласуется с current `TEST_STATUS.md`/release policy. Это не должно ошибочно превращаться в managed PASS.

## 6. Приоритет следующего deep-dive tranche

По campaign ranking следующий tranche рекомендуется:

### **User-Reached Dynamic Scroll / Virtualized History Contract Tranche**

Почему он первый:

- новый explicit PDF contract materially изменил acceptance;
- высокий risk silent content omission;
- external user-intent baseline высоко ставит beyond-viewport/dynamic/lazy completeness;
- уже есть хороший historical L3/L4 foundation, поэтому fresh tranche может быть глубоким и конечным, а не начинать с нуля;
- owner boundary ещё нужно честно reconciliation-нуть после fresh current-source proof, не резервируя новый P-code заранее.

Предварительный envelope:

- B1 User Intent;
- B2 Admission/user-reached boundary;
- B3 Capture;
- B4 bounded materialization;
- B5 PDF renderer;
- B6 physical PDF;
- B8 provenance/degradation receipt, если current architecture это экспонирует.

Required variants:

1. finite ordinary pre-existing long content — positive control;
2. infinite feed no user scroll;
3. user scroll to N;
4. user scroll to N then back upward;
5. WebClip preparation must not generate N+1 by auto-scroll;
6. nested dynamic scroll container;
7. virtual list with DOM recycling after user reached earlier logical items;
8. selection on a recycled row across logical identity change;
9. bounded failure/non-reconstructible history -> truthful degradation/unknown;
10. physical PDF artifact verification.

Required evidence: **L3+L4**, plus source/model proof as needed for exact boundary tracking and owner classification.

## 7. Campaign state after this reconstruction

Current project state remains:

**`DEEP-AUDIT-IN-PROGRESS`**.

Причина не в том, что прошлые audits поверхностны — наоборот, многие CORE renderer families имеют L4 physical evidence. Причина в том, что:

- первая coverage matrix только сейчас реконструирована;
- family rows ещё нужно при необходимости разложить на exact cells;
- несколько new-contract surfaces имеют `REVALIDATION-REQUIRED`;
- L5 external boundaries остаются explicit pending;
- многие proven FINDING owners остаются ACTIVE.

Нельзя объявлять `DEEP-AUDIT-COVERAGE-COMPLETE`, пока эти nonterminal gaps не triage-нуты/доведены до required evidence и итоговая matrix не содержит material unexplained NOT-AUDITED областей.

## 8. Следующий durable checkpoint

После следующего targeted tranche этот документ/будущая canonical coverage matrix должны быть обновлены минимум по:

- C22 dynamic user-reached boundary;
- C23 virtualized history;
- related admission/materialization/provenance cells;
- exact owner/duplicate classification;
- achieved L3/L4 evidence;
- residual adjacent gaps.

После этого следующими кандидатами по current contract являются C26 hover exclusion и C24 inert spoiler expansion, если fresh evidence не изменит ranking.
