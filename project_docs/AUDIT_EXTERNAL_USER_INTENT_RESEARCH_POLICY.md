# WebClip — recurring external user-intent and product-discovery research policy

Этот документ задаёт постоянное требование глубокого аудита и продуктового развития WebClip: выбор пользовательских операций, audit surfaces и кандидатных новых функций должен опираться не только на внутреннюю архитектуру и известные P-owner, но и на регулярно обновляемое внешнее исследование того, какие задачи реально решают пользователи похожими или пересекающимися продуктами, какие проблемы у них возникают и какие подходы/возможности других решений дают полезный продуктовый опыт.

`PROJECT_MISSION_AND_DEFENSIVE_SECURITY_POLICY.md` остаётся верхнеуровневой продуктовой/security-нормой. `AUDIT_REGISTRY.md` остаётся единственным current authority по P-code owner/status. Внешнее исследование не меняет автоматически product contract WebClip, не создаёт P-коды само по себе и не означает копирование чужих решений.

Внешнее исследование имеет **две обязательные цели**:

1. **Deep-audit input** — определять, какие реальные user intents, operations, failure modes и audit surfaces нужно проверять и с каким приоритетом.
2. **Product-discovery input** — систематически выявлять потенциальные новые функции, режимы, UX/workflow improvements и архитектурные возможности WebClip на основе подтверждённых пользовательских задач и опыта других решений.

## 1. Что необходимо изучать

Перед глубоким аудитом и во время него необходимо поддерживать актуальное понимание:

- какие пользовательские намерения реально встречаются в продуктах сохранения/архивирования/клиппинга страниц;
- какие операции пользователи ожидают выполнять: сохранить всю страницу, выбранный фрагмент, frame, readable/article representation, archival/offline copy, screenshot/PDF, metadata-rich research snapshot, bulk/auto-save и другие близкие сценарии;
- какие качества результата пользователи считают существенными: visual fidelity, полнота за пределами viewport, offline durability, self-contained resources, working links, readable/searchable text, provenance, удобство повторного открытия, надёжность destination/storage, скорость и простота capture;
- какие recurring failure modes и неудовлетворённые ожидания обсуждаются пользователями;
- какие функции/режимы пользователи ценят в peer products и какую конкретную задачу они ими решают;
- какие новые режимы, web-platform сложности, workflows и product expectations появились или стали заметно актуальнее;
- какие возможности отсутствуют или слабо решены в существующих инструментах и могут представлять продуктовую возможность для WebClip.

Результат исследования должен влиять одновременно на вопросы **что необходимо аудировать** и **какие новые продуктовые возможности стоит рассмотреть**, но не автоматически предписывать реализацию.

## 2. Обязательные классы источников

Регулярный обзор должен по возможности включать несколько независимых классов источников:

1. официальные сайты разработчиков похожих продуктов, документацию, demos, help/known-issues, changelog/roadmap;
2. browser-extension stores и пользовательские reviews, когда они доступны и содержательно полезны;
3. GitHub/GitLab и другие открытые repositories похожих или пересекающихся проектов: README/docs, issues, discussions, roadmap, relevant implementation choices;
4. Reddit и другие пользовательские форумы/communities, где обсуждаются реальные workflows, failures, workarounds, feature requests и причины перехода между продуктами;
5. независимые обзоры и сравнения продуктов;
6. проекты и практики web archiving/replay/capture, если они помогают понять archive completeness, materialization, provenance, replay, QA expectations или новые product patterns.

Нельзя выводить распространённость проблемы или ценность функции из одного issue/post. Official materials подтверждают заявленные use cases/features, но не пользовательскую удовлетворённость. Форумы/issues подтверждают существование reported pain/need, но сами по себе не доказывают prevalence. Сильнее весит повторяющаяся тема, подтверждённая несколькими независимыми источниками и/или несколькими продуктами.

## 3. Какие продукты считаются релевантными

В обзор включаются не только прямые аналоги WebClip. Нужны несколько семейств с пересекающимися пользовательскими целями:

- faithful/self-contained page saving;
- browser page snapshots и research/reference capture;
- PDF/print/full-page screenshot tools;
- web clippers с selection/highlight/article/reader semantics;
- archival/WARC/WACZ/replay tools;
- bulk/automatic/scheduled page capture;
- локальные/offline knowledge-base clippers;
- adjacent tools, где существенны provenance, later reading, user-selected scope, annotation, organization, synchronization или multi-format preservation.

Конкретный набор продуктов должен меняться со временем. Нельзя навечно ограничиваться текущим списком названий и тем самым перестать замечать новые решения.

## 4. Частота и freshness

Во время активного глубокого аудита внешний baseline должен быть достаточно свежим и для audit prioritization, и для product discovery.

Минимальное правило:

- полный baseline создаётся/обновляется при формировании или существенном пересмотре deep-audit coverage model или product direction;
- если активный глубокий аудит продолжается, обзор refresh-ится не реже примерно одного раза в **7 дней**;
- refresh выполняется раньше, если появляется значимый новый класс продукта/режима, заметное изменение browser/web-platform behavior, повторяющаяся новая пользовательская проблема/feature request, крупное изменение релевантного peer product или планируется существенная reprioritization audit/product surfaces;
- после перерыва более 7 дней перед новым крупным audit cycle сначала выполняется freshness check внешнего baseline.

7 дней — максимальный target-age baseline во время активного audit, а не требование искусственно проводить полный research каждую неделю, если быстрый delta-scan подтверждает отсутствие существенных изменений. Delta-scan должен быть durably датирован и указывать, какие классы источников были просмотрены.

## 5. Обязательные durable outputs

Каждый substantive baseline/delta должен поддерживать два связанных результата.

### 5.1 User Intent / Operation Map

Она по возможности фиксирует:

- observed user intent / operation;
- ожидаемый пользователем outcome;
- recurring pain/failure mode;
- evidence type/freshness и confidence: isolated report / recurring theme / cross-product theme;
- релевантность для WebClip;
- какие audit surfaces/questions следует добавить, повысить или понизить в приоритете;
- какие выводы intentionally out-of-scope или требуют отдельного fidelity/product decision.

### 5.2 Product Opportunity Map

Для потенциальной новой функции/режима/improvement фиксируются:

- какая конкретная пользовательская задача или неудовлетворённая потребность лежит в основе;
- какие продукты/источники подтверждают эту задачу и насколько силён сигнал;
- как peer products решают её и какие trade-offs/complaints наблюдаются;
- что уже умеет WebClip и какой gap остаётся;
- предлагаемая продуктовая гипотеза — **не готовое требование реализации**;
- ожидаемая пользовательская ценность и ширина применимости;
- влияние на fidelity/provenance/security/privacy/resource budgets и архитектуру;
- примерная сложность/зависимости и риск перегрузить основной workflow;
- нужен ли отдельный mode вместо изменения faithful-copy semantics;
- рекомендуемое состояние: `OBSERVED`, `NEEDS-RESEARCH`, `CANDIDATE`, `PROPOSE-FOR-DECISION`, `REJECTED/OUT-OF-SCOPE` или `ADOPTED-BY-EXPLICIT-DECISION`.

Product Opportunity Map является discovery/backlog evidence и **не является `AUDIT_REGISTRY`**. Идея функции не получает P-код только потому, что она полезна или популярна у другого продукта.

## 6. Как внешний опыт используется в deep audit

При выборе следующего крупного audit tranche учитываются одновременно:

1. миссия WebClip;
2. gaps audit coverage matrix;
3. known P-owner/root causes;
4. вероятность silent user-visible corruption или потери данных;
5. ширина затрагиваемых реальных pages/workflows;
6. внешний evidence важности соответствующей операции/ожидания;
7. freshness внешнего baseline.

Если внешние источники показывают устойчивое пользовательское намерение, пересекающееся с миссией WebClip, deep audit обязан либо включить соответствующую operation/surface, либо durably объяснить, почему она intentionally out-of-scope или относится к отдельному будущему mode/product decision.

## 7. Как внешний опыт используется для новых функций

Каждый recurring baseline/delta должен не только искать defects/pains, но и отдельно спрашивать:

- какую задачу peer product решает лучше или иначе;
- является ли эта задача значимой для текущих или вероятных пользователей WebClip;
- можно ли решить её, не разрушая основной faithful-copy contract;
- требуется ли новый режим/format/workflow вместо скрытого изменения существующего поведения;
- создаёт ли идея реальное преимущество или лишь копирует feature без подтверждённой потребности;
- какие complaints/trade-offs peer implementation следует не переносить в WebClip.

Сильный кандидат на новую функцию обычно имеет повторяющийся user need, подтверждение более чем одним источником/продуктом, хорошее соответствие миссии WebClip и понятный путь реализации без неприемлемого security/fidelity риска.

Обнаружение кандидата не разрешает автоматически менять runtime или roadmap. Значимые новые функции/режимы должны быть вынесены пользователю как отдельное product proposal/recommendation с evidence, альтернативами и trade-offs; принятие происходит только через отдельное явное product decision.

## 8. Особое правило для fidelity semantics

Внешний опыт особенно важен там, где нет единственного технически очевидного ответа: current-view fidelity против complete-static materialization, closed disclosures, nested scroll, infinite/virtualized content, animation/temporal state, focus/selection, responsive state, selected content против whole-page context, offline resource completeness и deliberate reader/cleanup transformations.

Исследование должно показывать и пользовательские ожидания, и существующие product patterns. Но окончательный fidelity contract WebClip устанавливается отдельным явным product decision под `PROJECT_MISSION_AND_DEFENSIVE_SECURITY_POLICY.md` и `WEBCLIP_COPY_ARCHITECTURE_POLICY.md`.

## 9. Глубина исследования

Обычный recurring refresh можно выполнять доступными web/repository research средствами. Если быстрый обзор обнаруживает противоречивую или быстро меняющуюся область, недостаточную выборку, значимый новый user intent/product opportunity или вопрос, который materially изменит fidelity/product contract, исследование расширяется до отдельного глубокого research tranche.

Если такой tranche требует существенно большего scope, специальных источников или отдельного продуктового решения, его scope можно предварительно согласовать с пользователем. Отсутствие согласования не является основанием молча считать вопрос закрытым: он остаётся явным research unknown/opportunity pending research.

## 10. Defensive-security граница

Внешний research остаётся defensive/product research. Изучение reported security problems допускается только для понимания защищаемого свойства, условия риска и защитного контроля WebClip. Не требуется offensive testing чужих продуктов, exploit development, authorization bypass или атаки на внешние сервисы.

## 11. Постоянный характер

Это постоянное требование deep-audit и product-discovery workflow. Новый чат, новый исполнитель, смена audit surface или наличие большого внутреннего P-registry не отменяют необходимость регулярно сверять как карту пользовательских операций, так и карту продуктовых возможностей с актуальным внешним опытом.

Изменить или отменить это правило можно только последующим явным решением пользователя, durably зафиксированным в project policy.
