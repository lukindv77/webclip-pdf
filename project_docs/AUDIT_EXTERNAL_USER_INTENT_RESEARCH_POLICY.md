# WebClip — recurring external user-intent research policy

Этот документ задаёт постоянное требование глубокого аудита WebClip: выбор пользовательских операций, намерений и audit surfaces должен опираться не только на внутреннюю архитектуру и уже известные P-owner, но и на регулярно обновляемое внешнее исследование того, какие задачи реально решают пользователи похожими или пересекающимися продуктами и какие проблемы у них возникают.

`PROJECT_MISSION_AND_DEFENSIVE_SECURITY_POLICY.md` остаётся верхнеуровневой продуктовой/security-нормой. `AUDIT_REGISTRY.md` остаётся единственным current authority по P-code owner/status. Внешнее исследование не меняет автоматически продуктовую цель WebClip, не создаёт P-коды само по себе и не означает копирование чужих решений; оно является обязательным evidence-input для формирования и приоритизации карты user intents, operations и audit surfaces.

## 1. Цель внешнего исследования

Перед глубоким аудитом и во время него необходимо поддерживать актуальное понимание:

- какие пользовательские намерения реально встречаются в продуктах сохранения/архивирования/клиппинга страниц;
- какие операции пользователи ожидают выполнять: сохранить всю страницу, выбранный фрагмент, frame, readable/article representation, archival/offline copy, screenshot/PDF, metadata-rich research snapshot, bulk/auto-save и другие близкие сценарии;
- какие качества результата пользователи считают существенными: визуальная fidelity, полнота за пределами viewport, offline durability, self-contained resources, working links, readable/searchable text, provenance, удобство повторного открытия, надёжность destination/storage, скорость и простота capture;
- какие recurring failure modes и неудовлетворённые ожидания обсуждаются пользователями;
- какие новые режимы, web-platform сложности и product expectations появились или стали заметно актуальнее.

Результат исследования должен влиять прежде всего на вопрос **что необходимо аудировать и с каким приоритетом**, а не автоматически предписывать конкретную реализацию WebClip.

## 2. Обязательные классы источников

Регулярный обзор должен по возможности включать несколько независимых классов источников:

1. официальные сайты разработчиков похожих продуктов, документацию, demos, help/known-issues, changelog/roadmap;
2. browser-extension stores и пользовательские reviews, когда они доступны и содержательно полезны;
3. GitHub/GitLab и другие открытые repositories похожих или пересекающихся проектов: README/docs, issues, discussions, roadmap, relevant implementation choices;
4. Reddit и другие пользовательские форумы/communities, где обсуждаются реальные workflows, failures, workarounds и причины перехода между продуктами;
5. независимые обзоры и сравнения продуктов;
6. проекты и практики web archiving/replay/capture, если они помогают понять archive completeness, materialization, provenance, replay или QA expectations.

Нельзя выводить распространённость проблемы из одного issue/post. Official product materials подтверждают заявленные use cases/features, но не пользовательскую удовлетворённость. Форумы/issues подтверждают существование reported pain, но сами по себе не доказывают prevalence. Сильнее весит повторяющаяся тема, подтверждённая несколькими независимыми источниками и/или несколькими продуктами.

## 3. Какие продукты считаются релевантными

В обзор включаются не только прямые аналоги WebClip. Нужны как минимум несколько семейств с пересекающимися пользовательскими целями:

- faithful/self-contained page saving;
- browser page snapshots и research/reference capture;
- PDF/print/full-page screenshot tools;
- web clippers с selection/highlight/article/reader semantics;
- archival/WARC/WACZ/replay tools;
- bulk/automatic/scheduled page capture;
- локальные/offline knowledge-base clippers и другие инструменты, где существенны provenance, later reading или user-selected scope.

Конкретный набор продуктов может меняться со временем. Нельзя навечно зафиксировать только текущие названия и тем самым перестать замечать новые решения.

## 4. Частота и freshness

Во время активного глубокого аудита внешний user-intent baseline должен быть достаточно свежим для принятия audit-priority решений.

Минимальное правило:

- полный baseline создаётся/обновляется при формировании или существенном пересмотре deep-audit coverage model;
- если активный глубокий аудит продолжается, обзор следует refresh не реже примерно одного раза в 30 дней;
- refresh выполняется раньше, если появляется значимый новый класс продукта/режима, заметное изменение browser/web-platform behavior, повторяющаяся новая пользовательская проблема, крупное изменение релевантного peer product или планируется существенная reprioritization audit surfaces;
- после длительного перерыва более 30 дней перед новым крупным audit cycle сначала выполняется freshness check внешнего baseline.

30 дней — максимальный target-age baseline во время активного audit, а не требование проводить искусственно полный research каждые 30 дней, если быстрый delta-scan подтверждает отсутствие существенных изменений. Delta-scan должен быть durably датирован и указывать, какие классы источников были просмотрены.

## 5. Обязательный результат исследования

Durable baseline/delta должен по возможности фиксировать:

- дату и research window;
- рассмотренные product families и representative products;
- классы и конкретные источники;
- observed user intent / operation;
- ожидаемый пользователем outcome;
- recurring pain/failure mode;
- подтверждающий evidence type и freshness;
- степень уверенности: isolated report / recurring theme / cross-product theme;
- предполагаемую релевантность для WebClip;
- какие audit surfaces/questions следует добавить, повысить или понизить в приоритете;
- какие выводы сознательно **не** переносятся в WebClip без отдельного product decision.

Приоритетный durable продукт этого анализа — **User Intent / Operation Map**, связанная с audit coverage model, а не каталог чужих функций.

## 6. Как внешний опыт используется в deep audit

При выборе следующего крупного audit tranche необходимо учитывать одновременно:

1. верхнеуровневую миссию WebClip;
2. gaps текущей audit coverage matrix;
3. known P-owner/root causes;
4. вероятность silent user-visible corruption или потери данных;
5. ширину затрагиваемых реальных страниц/workflows;
6. внешний evidence о том, что соответствующая операция/ожидание реально важно пользователям подобных решений;
7. freshness внешнего baseline.

Новая популярная функция конкурента сама по себе не является требованием WebClip. Но если внешние источники показывают устойчивое пользовательское намерение, которое пересекается с миссией WebClip, deep audit обязан либо включить соответствующую операцию/surface, либо durably объяснить, почему она intentionally out-of-scope или относится к отдельному будущему mode/product decision.

## 7. Особое правило для спорной fidelity semantics

Внешний опыт особенно важен там, где нет единственного технически очевидного ответа: current-view fidelity против complete-static materialization, closed disclosures, nested scroll, infinite/virtualized content, animation/temporal state, focus/selection, responsive state, selected content против whole-page context, offline resource completeness и deliberate reader/cleanup transformations.

Исследование должно показывать, какие пользовательские ожидания существуют и как их разделяют другие продукты, но окончательный fidelity contract WebClip устанавливается отдельным явным product decision под `PROJECT_MISSION_AND_DEFENSIVE_SECURITY_POLICY.md` и `WEBCLIP_COPY_ARCHITECTURE_POLICY.md`.

## 8. Глубина исследования

Обычный recurring refresh можно выполнять доступными web/repository research средствами. Если быстрый обзор обнаруживает противоречивую или быстро меняющуюся область, недостаточную выборку, значимый новый класс user intent или вопрос, который materially изменит fidelity/product contract, следует расширить исследование до отдельного глубокого research tranche.

Если такой отдельный research tranche требует существенно большего scope, специальных источников или отдельного продуктового решения, его scope можно предварительно согласовать с пользователем. Отсутствие согласования не является основанием молча считать внешний вопрос закрытым: он должен остаться явным research unknown.

## 9. Defensive-security граница

Внешний research остаётся defensive/product research. Изучение reported security problems допускается только для понимания защищаемого свойства, условия риска и защитного контроля WebClip. Не требуется offensive testing чужих продуктов, exploit development, authorization bypass или атаки на внешние сервисы.

## 10. Постоянный характер

Это постоянное требование deep-audit workflow. Новый чат, новый исполнитель, смена audit surface или наличие большого внутреннего P-registry не отменяют необходимость регулярно сверять карту пользовательских операций с актуальным внешним опытом.

Изменить или отменить это правило можно только последующим явным решением пользователя, durably зафиксированным в project policy.
