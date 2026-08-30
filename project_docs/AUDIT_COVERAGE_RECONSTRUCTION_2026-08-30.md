# WebClip — initial deep-audit coverage reconstruction — 2026-08-30

Date: 2026-08-30

Baseline canonical `main`: `bcf310b13dd8584d2e0d66ae4007b511a859843d`.

Stage-2 C22/C23 revalidation audited canonical `main`: `a0e1252317dfa1a1146dbed0e5b8bfe5bb760491`.

Stage-3 C26 hover-exclusion revalidation audited canonical `main`: `153d09c164473643229b29946dc35ba413715913`.

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
- C26 targeted tranche / `AUDIT_HOVER_EXCLUSION_CONTRACT_2026-08-30_EVIDENCE.md` plus `project_tools/audit_hover_exclusion_contract.py`.

Также использованы supplemental summaries из `AUDIT_DELTA_INDEX.md`, включая selection/admission, selected-only cascade, post-freeze render cut, print rollback, local prepare budgets, source URL minimization, PDF byte transfer receipt и связанные Yandex/Journal/recovery boundaries.

## 2. Консервативное правило зачёта evidence

Historical evidence засчитывается только для того claim, который оно реально доказывало.

Особенно важно: `WEBCLIP_PDF_FIDELITY_CONTRACT.md` принят **после** многих physical tranches. Поэтому наличие L3/L4 probe для близкого механизма не означает PASS нового contract автоматически.

Первоначально три области получили `REVALIDATION-REQUIRED`:

1. user-driven boundary для scroll-triggered new logical content;
2. inert spoiler/disclosure materialization без page-owned synthetic activation;
3. mandatory hover exclusion даже если hover active at admission.

C22/C23 и C26 теперь revalidated fresh targeted tranches: required L3+L4 evidence достигнуто и outcome классифицирован как FINDING. C22/C23 имеет independent owner P1-230; C26 уточняет existing P0-075/P0-070/P0-004 и не создаёт duplicate P1-231. C24 остаётся `REVALIDATION-REQUIRED`.

## 3. Family-level current matrix

Это **family-level** reconstruction, а не окончательный полный cell-level Cartesian map. `Required` означает minimum evidence для material current-PDF claim. `Current` — strongest durable evidence, который можно честно зачесть сейчас.

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
| C19 | Ordinary long-page existing content | yes | L3+L4 | PR #37 complete-vs-clipped long-page controls | `ARTIFACT-COVERED / FINDING` | P0-004; current contract explicitly requires full pre-existing scroll content |
| C20 | Nested scroll / retained scrollports | yes | L3+L4 | PR #37 physical slice-loss/current-scroll-state evidence + C22 nested additive positive control | `ARTIFACT-COVERED / FINDING` | P0-004, P1-187 supporting |
| C21 | Lazy/offscreen resources already belonging to content | yes | L3+L4 | PR #36/#39/#40 resource readiness evidence | `ARTIFACT-COVERED / FINDING` | P1-003, P1-167 and supporting representation owners |
| C22 | Scroll-triggered **new logical content** / user-reached max boundary | yes | L3+L4 under current PDF contract | fresh source + managed Chromium 144 + physical PDF controls: print does not generate N+1; user-materialized retained nodes survive scroll-back; current source has no generation-bound user max/history receipt | `ARTIFACT-COVERED / FINDING` | **P1-230 ACTIVE**; add trusted/generation-bound user-reached boundary capture, no WebClip auto-scroll beyond it, nested/frame parity, bounded truthful degradation |
| C23 | Virtualized/windowed content history within user-reached range | yes | L3+L4 under current PDF contract | gradual user-like traversal materialized/seen logical 1…57, returned to top, physical PDF retained only mounted 1…8; recycled selected row changed logical identity | `ARTIFACT-COVERED / FINDING` | **P1-230 ACTIVE** primary whole-history owner; P0-070/P0-080 remain supporting generation/selection identity owners |
| C24 | Spoilers/disclosures / inert expansion | yes | L3+L4 under current PDF contract | historical disclosure/details and print-preparation evidence | `REVALIDATION-REQUIRED / UNKNOWN` | P0-067/P1-212/P0-004/P0-070/P1-167 related; must prove inert expansion, Exclude preservation and no page-owned activation |
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
- layout/clipping/pagination, fonts, resources, frame flattening, responsive candidate identity, temporal state, focus, user-reached virtual-history и hover-exclusion behavior проверены именно на physical PDF, а не только source/model level;
- historical audits сохраняют positive/negative/rejected controls, что снижает риск повторного открытия отвергнутых broad hypotheses;
- registry разделяет exact-generation, resource, frame, persistence, recovery и user-reached-history owners вместо одного неуправляемого «PDF fidelity bug».

То есть главный текущий deficiency — не отсутствие глубины вообще, а **оставшиеся contract-specific gaps, ACTIVE findings и explicit L5 boundaries**.

## 5. Главные gaps после C22/C23 и C26 revalidation

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

### G3 — spoiler expansion должен быть inert и selection-bounded

Исторический проект умеет раскрывать disclosures/spoilers, но current contract требует одновременно:

- closed safe content включается;
- source closed/open provenance не подменяется;
- expansion происходит на inert capture/static representation;
- никакого page-owned synthetic activation;
- Exclude не возвращается;
- network/stateful disclosure без user materialization не активируется молча.

Existing evidence покрывает части механизма, но не весь acceptance envelope.

### G4 — restore/main-content end-to-end physical artifact coverage слабее, чем renderer-selection evidence

Selection/picker/restore audits очень глубоки на admission/locator/rendered-target уровне, но family-level reconstruction не нашла столь же систематического L4 closure для `restored/auto-selected exact scope -> final physical PDF` во всех generation/frame variants.

### G5 — L5 external boundaries остаются сознательно незакрыты

Real unpacked Chrome, optional permission UI, native download/Save As и real external-storage API остаются `EXTERNAL-REQUIRED`, что согласуется с current `TEST_STATUS.md`/release policy. Это не должно ошибочно превращаться в managed PASS.

## 6. Приоритет следующего deep-dive tranche

По current campaign ranking следующий tranche рекомендуется:

### **C24 — Inert Spoiler / Disclosure Expansion Contract Tranche**

Почему он следующий:

- current PDF contract прямо требует safe closed disclosure content для later reading;
- одновременно запрещена synthetic live page activation;
- historical source уже содержит disclosure/spoiler expansion logic, поэтому риск не теоретический: нужно разделить native inert state mutation от page-owned click/network/stateful expansion;
- Exclude имеет абсолютный приоритет и не может быть возвращён expansion/materialization;
- silent scope expansion и page-side mutation возможны одновременно, поэтому требуется exact L3+L4 contract test, а не только source inspection.

Предварительный envelope:

- B1 User Intent / Include+Exclude authority;
- B2 Admission: source open/closed state;
- B3 Capture: safe native disclosure descendants and provenance;
- B4 static materialization: inert expansion only, no live page-owned activation;
- B5 renderer;
- B6 physical PDF;
- B8 truthful degradation for network/stateful/unknown disclosures.

Required controls:

1. native closed `<details>` inside Include — content present in PDF;
2. source open `<details>` — content remains present, with no false source-closed claim;
3. Excluded descendant inside closed disclosure — remains absent after expansion;
4. nested native disclosures — finite bounded expansion;
5. page-owned click-backed accordion — must not be synthetic-clicked merely to reveal content;
6. page-owned activation with visible/network/mutation side effect — no side effect from WebClip materialization;
7. safe CSS/ARIA disclosure where content is already present but hidden — classify whether inert representation is provable without page events;
8. same-origin frame parity; cross-origin remains explicit boundary where necessary;
9. inability to materialize without page-owned state transition -> truthful degraded/unknown;
10. physical PDF verification.

Required evidence: **L3+L4**, plus L1 source proof for exact expansion/rollback ownership and bounded-work behavior.

After C24, campaign ranking should be recomputed rather than assuming C02/C03 order.

## 7. Campaign state after C26

Current project state remains:

**`DEEP-AUDIT-IN-PROGRESS`**.

C22/C23 and C26 are audit-complete at required L3+L4 in the important sense that their outcome is terminal **FINDING**, not because implementation is fixed. P1-230 owns C22/C23 implementation acceptance; C26 refines existing P0-075/P0-070/P0-004 acceptance.

Coverage is still not complete because:

- C24 remains `REVALIDATION-REQUIRED`;
- C02/C03 retain weaker end-to-end physical coverage;
- L5 external boundaries remain explicit pending;
- many proven FINDING owners remain ACTIVE;
- family rows still need decomposition when a future tranche reveals materially distinct cells.

Нельзя объявлять `DEEP-AUDIT-COVERAGE-COMPLETE`, пока эти nonterminal gaps не triage-нуты/доведены до required evidence и итоговая matrix не содержит material unexplained NOT-AUDITED областей.

## 8. Следующий durable checkpoint

Следующий targeted tranche должен обновить минимум:

- C24 spoiler/disclosure achieved L3/L4 outcome;
- exact owner/duplicate classification;
- positive/negative/contract-boundary controls;
- residual adjacent gaps;
- campaign ranking после C24.

После C24 нужно заново сравнить C02/C03 и explicit L5/other residual cells по текущему risk ranking.