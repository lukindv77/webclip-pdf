# WebClip — deep-research coverage and campaign policy

Этот документ задаёт постоянную методику систематического глубокого исследования WebClip. Он определяет, **что означает достаточная ширина и глубина исследования, какие уровни evidence требуются, как строится Coverage Matrix, как выбираются deep-dive tranches, когда исследование должно останавливаться и когда весь deep research можно считать coverage-complete**.

`RESEARCH_REGISTRY.md` остаётся единственным current authority по P-code owner/status. Эта policy не создаёт P-коды и не закрывает findings. `PROJECT_MISSION_AND_DEFENSIVE_SECURITY_POLICY.md` задаёт верхнеуровневую цель, `WEBCLIP_PDF_FIDELITY_CONTRACT.md` — contract текущего основного PDF, `RESEARCH_EXTERNAL_USER_INTENT_RESEARCH_POLICY.md` — обязательный внешний evidence-input, а `SESSION_EXECUTION_AND_INTERRUPTION_SAFETY_POLICY.md` — правила длительных инструментальных сессий.

## 1. Цель deep research

Deep research — это не максимизация количества найденных ошибок и не бесконечное углубление отдельных edge cases.

Его цель:

> систематически доказать end-to-end корректность основной пользовательской операции от user intent до later reading, сделать видимыми все material неизвестные области, классифицировать подтверждённые дефекты по одному root-cause owner и не путать отсутствие найденного P-code с доказанным PASS.

Research completeness и implementation completeness — разные состояния. Surface может быть research-complete с outcome `FINDING`, пока её owner остаётся ACTIVE.

## 2. Две оси Coverage Matrix

Coverage Matrix строится минимум по двум осям.

### 2.1. Pipeline boundaries

Обязательные end-to-end boundaries:

1. **B1 User Intent** — что пользователь явно попросил сохранить.
2. **B2 Admission** — какая exact page/document/frame/application/render generation была допущена к операции.
3. **B3 Capture** — что WebClip реально извлёк в captured representation/provenance.
4. **B4 Static Materialization** — какие разрешённые contract transformations применены для статического представления.
5. **B5 Renderer** — что происходит при формировании PDF/другого format-specific representation.
6. **B6 Physical Artifact** — фактические bytes/pixels/text/links/pages полученного файла.
7. **B7 Persistence / Transfer** — какой exact artifact реально скачан/закэширован/передан.
8. **B8 Journal / Provenance** — может ли durable record доказать, что именно было сохранено.
9. **B9 Later Reading / Recovery** — получает ли пользователь пригодную и правдивую копию позже.

### 2.2. Surface families

Матрица должна triage-ить как минимум следующие families, если они релевантны текущему режиму/операции:

- Include/Exclude и selection authority;
- restore/admission selected target;
- auto/main-content candidate selection;
- ordinary DOM/text;
- geometry/layout;
- colors/backgrounds/compositing;
- fonts/typography;
- raster images;
- responsive images/`picture`/`srcset`;
- SVG;
- canvas;
- video/replaced media;
- form/renderer-owned controls;
- pseudo/generated content;
- links/anchors/internal destinations;
- same-origin iframe;
- cross-origin iframe boundary;
- Shadow DOM/slots/composed tree;
- ordinary long-page scroll;
- nested scroll;
- lazy resources;
- scroll-triggered new logical content;
- virtualized/windowed content;
- spoilers/disclosures;
- dialog/popover/top layer;
- hover exclusion;
- focus/selection;
- responsive/environment state;
- viewport units/container queries;
- clipping/overflow;
- fixed/sticky;
- pagination;
- animations/transitions;
- animated images;
- mutation during capture/print cut;
- same-locator/different-resource-generation;
- failure/retry/recovery;
- node/byte/time/resource limits;
- privacy/data minimization;
- physical artifact identity;
- Yandex/local destination identity;
- Journal/provenance;
- backup/import/recovery;
- later-reading usability;
- real unpacked Chrome/native/permission/external service boundaries where applicable.

Полный Cartesian product не требуется. Каждая потенциальная комбинация должна быть хотя бы triage-нута как `RELEVANT`, `INDIRECT` или `NOT-APPLICABLE` с краткой причиной для N/A.

## 3. Evidence Ladder

Используются пять уровней доказательства.

### L1 — Source proof

Current source/code inspection, позволяющий доказать наличие/отсутствие конкретного path, state transfer, bound, sanitizer, generation fence и т. п.

L1 не доказывает browser-owned rendering или physical artifact.

### L2 — Deterministic model / unit / integration proof

Повторяемый локальный fixture/model/test для algorithm/state/race/serialization/selection/recovery logic.

L2 полезен для regression, но не заменяет renderer/physical/external evidence.

### L3 — Managed Chromium / renderer proof

Настоящий browser renderer/CDP на безопасной deterministic fixture. Требуется для layout, CSS, media/container queries, resources, browser-owned controls, frame behavior, animation/focus и других renderer semantics.

Managed Chromium является engineering evidence, а не автоматической заменой real unpacked extension QA.

### L4 — Physical artifact proof

Проверка фактически сформированного PDF/другого saved artifact: bytes, raster/pixels, text extraction, page count, PDF links/destinations, geometry, hashes, resource identity и т. п.

Для claims о PDF fidelity уровень L4 обычно обязателен, если дефект может возникнуть только при print/render/serialization.

### L5 — Real product / external boundary proof

Real unpacked Chrome, native download/Save As, permission UI, реальный Yandex/OAuth/API или другая boundary, которую невозможно правдиво закрыть managed fixture/model evidence.

## 4. Claims-based evidence requirement

Evidence level прикрепляется не к названию технологии, а к конкретному acceptance claim.

Пример для responsive image:

- «code читает `currentSrc`» — L1;
- «browser выбрал candidate X на admitted state» — L3;
- «physical PDF содержит именно admitted candidate X» — L4.

Низший слой не заменяет требуемый высший. Finding нельзя закрыть evidence ниже уровня, на котором проявляется заявленный defect.

## 5. Базовые minimum evidence expectations

Ниже — default minimum для current PDF campaign. Конкретный tranche может потребовать больше.

- selection/Include/Exclude logic: L2, frame/composed/generation cases L3; PDF claim L4;
- admission/document/frame/application generation: L3; physical saved-state claim L4;
- ordinary text/data transformation: L2; PDF text/readability L4;
- geometry/layout/colors/backgrounds/fonts/images/SVG/canvas/media/controls/pseudo: L3+L4;
- links: structural L2/L3, actual PDF annotation/destination L4;
- same-origin iframe/Shadow/composed tree: L3+L4;
- long-page/nested-scroll/pagination/clipping/fixed/sticky: L3+L4, причем physical PDF L4 обязателен;
- dynamic/virtualized/user-reached scroll boundary: L3+L4;
- spoilers/top-layer/hover/focus: L3+L4;
- responsive/environment/viewport/container queries: L3+L4;
- temporal/animation/mutation/render-cut: L3+L4;
- pure Journal/data models: обычно L2, browser integration L3;
- local native download/Yandex/permission UI/real external identity: L5 для claims о реальной boundary;
- privacy/minimization: L1+L2, плюс L4/L5 там, где утечка/передача observable только в artifact/external boundary;
- node/time/byte/resource budget: L2+L3;
- physical artifact identity: L4, external destination adoption/identity при необходимости L5.

## 6. Coverage state и research outcome разделены

Coverage state отвечает на вопрос **насколько глубоко исследовано**, outcome — **что доказано**.

### 6.1. Coverage states

Допустимые основные состояния:

- `NOT-TRIAGED`;
- `TRIAGED`;
- `SOURCE-REVIEWED`;
- `DETERMINISTIC-COVERED`;
- `RENDERER-COVERED`;
- `ARTIFACT-COVERED`;
- `EXTERNAL-VERIFIED`;
- `EXTERNAL-REQUIRED`;
- `REVALIDATION-REQUIRED`;
- `INTENTIONAL-LIMITATION`;
- `OUT-OF-SCOPE`.

### 6.2. Outcomes

- `PASS`;
- `FINDING`;
- `PARTIAL`;
- `UNKNOWN`.

`FINDING` может быть research-terminal: проблема доказана и owner известен, даже если implementation остаётся ACTIVE.

`UNKNOWN` является terminal только если причина неизвестности доказана, scope этой неизвестности bounded, а необходимый следующий evidence/external boundary явно записан. Такой UNKNOWN всё равно входит в residual-risk synthesis.

## 7. Controls обязательны

Серьёзный tranche должен использовать, где релевантно:

- **positive control** — ожидаемо корректный близкий случай;
- **negative control** — похожий случай, где transformation/include не должны происходить;
- **contract-boundary control** — точная граница обещания продукта;
- **failure/degradation control** — если полное достижение fidelity невозможно, outcome должен быть truthful, а не silent success.

Примеры текущего PDF contract:

- closed safe `<details>` внутри Include → inertly expanded;
- closed arbitrary account menu → не открывается;
- pre-existing nested-scroll content → сохраняется полностью;
- new logical items beyond user-reached scroll boundary → WebClip не auto-scroll-ит за ними;
- hover-only visible state → не попадает в PDF.

## 8. Deep-Dive Tranche envelope

До начала крупного tranche необходимо определить:

1. research surface/family;
2. relevant pipeline boundaries;
3. contract invariants;
4. planned coverage cells;
5. known owners и duplicate history;
6. external user-intent relevance;
7. required evidence level;
8. positive/negative/boundary/failure controls;
9. physical artifact requirement;
10. external verification requirement;
11. заранее понятный termination envelope.

После tranche durably фиксируются:

- proven findings;
- rejected hypotheses;
- duplicate/root-cause classification;
- current owners;
- owner candidates, если duplicate-check ещё не завершён;
- remaining unknowns;
- adjacent untested combinations;
- achieved evidence level по coverage cells.

Количество research blocks само по себе не является критерием полноты.

## 9. Required и discovered variants

`Required variants` задаются заранее по contract/risk model.

`Discovered variants` появляются в процессе и классифицируются:

- same root cause → исследуются до достаточного breadth proof;
- new high-risk adjacent root cause → могут войти в tranche, если не разрушают completion probability;
- отдельная крупная область/другой primary pipeline boundary/evidence stack → durable follow-up candidate;
- duplicate/irrelevant/rejected → закрываются классификацией.

Discovery не должен автоматически превращать конечный tranche в бесконечный.

## 10. Interaction-oriented state-space coverage

Полный Cartesian product сложных состояний не требуется.

Coverage строится так:

1. baseline;
2. одно контролируемое изменение состояния;
3. contract-boundary variant;
4. known dangerous interaction пары/тройки, если у них общий implementation boundary, owner, внешний signal или historical defect family.

Для серьёзного fidelity tranche должны быть осознанно рассмотрены следующие variant classes, где они применимы:

- baseline;
- state variant;
- boundary variant;
- nested/composed/frame variant;
- temporal/mutation variant;
- resource/generation variant;
- physical-artifact variant;
- negative control;
- failure/degradation variant.

Пропуск material variant class должен быть объяснён как N/A/отдельный tranche, а не происходить молча.

## 11. Root-cause depth и saturation

После первого воспроизводимого finding research не должен немедленно останавливаться на testcase. Нужно определить **минимальный самостоятельный механизм**, нарушающий contract, и его breadth.

Состояние `ROOT-CAUSE-SATURATED` достигается, когда:

- reproduction стабильна;
- mechanism достаточно понятен;
- positive/negative/boundary controls отделяют defect envelope;
- соседние manifestations объясняются тем же mechanism;
- additional variants перестают менять owner/acceptance;
- требуемый evidence level для заявленного claim достигнут.

После этого новые проявления того же root cause не требуют нового P-code или бесконечного deepening.

Новый owner нужен только если после полного исправления root cause A наблюдение B может независимо остаться нарушением contract по другой причине.

## 12. Breadth proof

Broad owner нельзя выводить из одного narrow fixture.

Минимальный breadth proof для широкого root-cause claim должен включать:

- canonical reproduction;
- близкий positive variant;
- negative/boundary control;
- materially different variant, если owner претендует на общий класс behavior.

## 13. Stopping rule для расширения tranche

Новый discovered issue обычно не расширяет текущий tranche, если для него требуется:

- иной primary pipeline boundary;
- другой evidence stack;
- отдельное крупное state-space исследование;
- значимая отдельная product/security semantics decision.

Observation сохраняется durable и попадает в campaign ranking.

## 14. Research и implementation разделены

Campaign может работать в режимах:

- `RESEARCH-ONLY` — исследование/классификация;
- `RESEARCH+SMALL-CLOSURE` — узкий безопасный fix полностью закрывается внутри текущего envelope;
- `DEFERRED-IMPLEMENTATION` — finding значим, но fix требует отдельной архитектурной работы.

Немедленный fix особенно оправдан для security/privacy regression, destructive data loss, blocker дальнейшего research или маленького root cause с полным closure. В остальных случаях research breadth не должен разрушаться из-за попытки сразу реализовать каждый finding.

## 15. Closure Sweep после implementation

После fix/rework P-owner нельзя проверять только старый reproduction.

Нужно re-research-ить relevant region Coverage Matrix:

`affected admission/capture/materialization/renderer/artifact/persistence/provenance cells`.

Если fix затрагивает shared capture/representation layer, closure sweep расширяется на соседние families, которые используют этот слой.

Это правило защищает от «исправили testcase, но contract всё ещё нарушается соседним способом».

## 16. Change Impact Map и staleness

Evidence не становится stale просто по возрасту. Surface получает `REVALIDATION-REQUIRED`, если materially изменились:

- relevant runtime subsystem;
- product/fidelity contract;
- dependent shared capture/materialization/renderer layer;
- browser/API semantics;
- fixture assumption;
- external boundary behavior.

Для renderer-dependent evidence следует сохранять browser engine/version. Не требуется полный re-run после каждого Chrome update, но major renderer change или новая observed regression должны вызывать targeted revalidation.

В будущем проект может автоматизировать связь `runtime subsystem -> affected coverage surfaces` и CI-marking revalidation candidates.

## 17. Research Campaign Model

Основной цикл:

**Coverage Sweep -> Risk Ranking -> Deep-Dive Tranches -> Closure Sweep -> Coverage Reconciliation -> Final Synthesis**.

### Coverage Sweep

Сначала требуется видимость всей material surface: relevance, boundaries, current evidence, required evidence, owner/unknown.

Первый sweep не обязан доводить всё до L4/L5, но не должен оставлять material `NOT-TRIAGED`.

### Risk Ranking

Приоритет недостаточно исследованных cells оценивается по:

- user-visible impact;
- silent corruption/data loss risk;
- breadth;
- proximity к центральной mission;
- coverage deficit;
- external user-intent evidence;
- root-cause uncertainty.

При равенстве выше приоритет у silent user-visible corruption/data loss.

### Deep-Dive Tranches

Выбранные high-risk gaps доводятся до required evidence и root-cause saturation.

### Closure Sweep

После implementation выполняется matrix-region re-research.

### Coverage Reconciliation

После нескольких tranches durable checkpoint должен показывать, какие CORE cells terminal, какие findings/unknown/external остаются, что стало stale и какие high-risk gaps следующие.

### Final Synthesis

Итог строится по user journey/pipeline, а не только по списку P-кодов: `PROVEN / BROKEN / PARTIAL / EXTERNAL / INTENTIONAL-LIMITATION` от user intent до later reading.

## 18. Campaign metrics

Одна псевдоточная «готовность исследования 73%» не должна скрывать неоднородный denominator.

Допустимы две независимые метрики:

1. **Coverage completeness** — число/доля relevant cells в terminal research state.
2. **Finding closure** — число/доля confirmed findings, закрытых required evidence.

Пример: `Coverage 88/102 terminal; critical findings 14 total, 9 closed, 5 active`.

## 19. Terminal states и completion gates

Cell research-complete, когда:

1. relevance определена;
2. invariant сформулирован;
3. required evidence level достигнут либо есть explicit external/limitation boundary;
4. необходимые controls выполнены;
5. outcome классифицирован;
6. finding имеет owner либо limitation/unknown/external reason durably bounded;
7. нет скрытого unclassified observation.

Tranche complete только после:

- scope gate;
- evidence gate;
- controls gate;
- classification gate;
- ownership gate;
- unknown gate;
- durability gate;
- delivery tail, если результат должен быть интегрирован в canonical repository.

## 20. Project-wide states

Используются как минимум следующие состояния проекта deep research:

### `DEEP-RESEARCH-IN-PROGRESS`

Есть material untriaged/nonterminal coverage gaps.

### `DEEP-RESEARCH-COVERAGE-COMPLETE`

Все CORE families triaged; все material relevant cells terminal; required evidence достигнуто либо есть explicit external/limitation/out-of-scope state; все findings связаны с root-cause ownership; необъяснённых NOT-RESEARCHED областей нет.

Этот статус **не означает**, что все findings исправлены.

### `DEEP-RESEARCH-CRITICAL-CLOSURE-COMPLETE`

Coverage complete плюс все P0 и определённые product-blocking/silent-corruption findings выше принятого severity threshold закрыты required evidence.

### `RELEASE-READY`

Отдельный release status. Он не следует автоматически из deep-research completion и определяется `RELEASE_READINESS.md`/release gate/real external QA.

## 21. External user-intent и Product Discovery

Перед новым крупным tranche external baseline должен соответствовать `RESEARCH_EXTERNAL_USER_INTENT_RESEARCH_POLICY.md`, включая current ~7-day active-research freshness target.

Один внешний research cycle даёт два независимых выхода:

- **Research path** — user intents/pains повышают/понижают coverage priority;
- **Product Discovery path** — новые функции/modes/workflows попадают в Product Opportunity Map и требуют отдельного product decision.

Peer feature не становится P-owner или WebClip requirement автоматически.

## 22. Defensive-security граница

Campaign и fixtures остаются defensive. Hostile-page behavior исследуется только для доказательства защищаемого свойства WebClip на safe local/deterministic models. Не требуется offensive testing внешних сайтов/сервисов, exploit development, authorization bypass или compromise.

## 23. Постоянный характер

Эта policy является постоянной частью deep-research process. Новый чат, новая research family или большой существующий P-registry не отменяют Coverage Matrix, evidence ladder, campaign ranking, stopping rules, closure sweep и project completion gates.

Изменение возможно только последующим явным product/process decision, durably зафиксированным в project policy.
