# WebClip PDF — текущее состояние проекта

Текущая runtime version определяется `manifest.json`: **0.9.8**. Обозначение `0.9.9` относится к WIP и не является выпущенной версией.

Этот документ является кратким current overview, а не историей развития. Действующие требования и технические условия находятся в `USER_REQUIREMENTS.md`; причины принятых решений — в `DECISIONS_AND_RATIONALE.md`. Историю изменения этих требований не следует использовать для реконструкции current state при обычной работе.

## Назначение

WebClip PDF — Chrome Extension Manifest V3 для выборочного сохранения веб-контента в PDF с управляемыми областями «Включены/Исключены», frame-aware selection, кликабельными ссылками, локальным Journal, опциональной интеграцией с Яндекс Диском и Git-first recovery.

## Главная цель

WebClip должен позволять пользователю явно выбрать нужное содержимое страницы и получить максимально точную, пригодную для последующего чтения и архивного хранения копию именно выбранного состояния страницы, насколько это безопасно и технически представимо текущим PDF-режимом.

Технический успех создания/загрузки файла не заменяет fidelity. Selection intent, captured source state и rendered archival copy должны относиться к одной logical document/frame generation либо система должна честно сигнализировать degraded/unknown/failure.

Security scope проекта — только defensive security / защитный архитектурный анализ: конфиденциальность, целостность, availability/recovery, permission minimization, хранение и передача данных, credentials, external API boundaries и safe failure semantics. Offensive exploitation не является задачей проекта.

## Current authority model

- current source/WIP: fresh GitHub `main` exact SHA;
- current requirements/technical conditions: `USER_REQUIREMENTS.md`;
- current rationale/decisions: `DECISIONS_AND_RATIONALE.md`;
- current architecture: `ARCHITECTURE.md`, `DATA_MODELS.md`, специализированные contracts;
- P-code owner/status: только `RESEARCH_REGISTRY.md`;
- research navigation/evidence: `RESEARCH_DELTA_INDEX.md` и relevant family/history evidence;
- current test truth: `TEST_STATUS.md` + exact applicable execution evidence;
- release truth: `RELEASE_READINESS.md`.

Historical commits/evidence могут использоваться для provenance, regression investigation и duplicate/root-cause reconciliation, но не являются current requirement authority.

## Основной пользовательский поток

1. Запустить WebClip из popup/toolbar/context menu.
2. Выбрать одну или несколько областей «Включены» вручную либо через «Основной контент».
3. При необходимости создать области «Исключены».
4. Опционально использовать «Найти рекламу» только как подсказку кандидатов.
5. Подготовить bounded resources и статическое печатное представление без произвольных page-owned side effects.
6. Сформировать PDF и скачать локально либо отправить на Яндекс Диск.
7. При remote error сохранить selection state и позволить retry тех же PDF bytes без нового render.
8. Записать операцию в локальный IndexedDB Journal.
9. Использовать Journal для URL/site/all views, поиска/фильтрации, selection restore, export/import и remote backup.

## Selection и frame model

- `Включены` задают сохраняемые DOM-поддеревья; `Исключены` — явно вырезаемые вложенные поддеревья.
- Родительская область «Включены» может поглощать дочерние «Включены», сохраняя валидные «Исключены».
- Same-origin frames являются полноценными selection scopes.
- Cross-origin frame доступен только через user-granted host permission и frame agent; ambiguity разрешается fail-closed.
- Frame/document identity является частью selection snapshot и восстановления.

## PDF model

Текущий основной режим — печатный PDF через Chromium `Page.printToPDF` с screen-like representation и bounded static completeness.

Основные invariants:

- выбранный текст/структура/links/resources должны сохраняться максимально faithfully;
- уже существующее scrollable содержимое selected scope не должно теряться только из-за viewport;
- WebClip не должен сам создавать новое logical infinite/virtualized content за пользовательской reached boundary;
- useful disclosure content представляется inert/static способом без arbitrary synthetic click/submit/navigation;
- временные DOM/style mutations принадлежат конкретной print-generation и очищаются только при доказанном ownership;
- служебный UI WebClip не попадает в PDF;
- подробный contract задаёт `WEBCLIP_PDF_FIDELITY_CONTRACT.md`.

## Journal

Source of truth — локальный IndexedDB `WebClipJournal`.

- `Весь журнал` независим от active-tab origin;
- source context используется только для URL/site views и применения selection snapshot;
- открытая Journal page должна видеть новые committed entries;
- фильтры/поиск выполняются bounded до группировки/pagination;
- local и Yandex entries визуально различаются badges без дублирующих строк;
- public Yandex resource открывается по валидному `publicUrl`, если такой link authority существует.

## Яндекс Диск

Пользователь выбирает один `rootPath`. WebClip управляет служебными путями внутри него, включая:

```text
<root>/Upload/...
<root>/Backup/Journal/MM-YYYY/...
<root>/Trash/MM-YYYY/...
```

Remote operations должны иметь доказуемую operation/resource/account/root identity. Path/filename/size не являются достаточной identity сами по себе. Retry неизвестной/ошибочной передачи не создаёт новый PDF.

## Recovery и release

- exact fresh `main` commit — canonical WIP snapshot;
- handoff/chat/generated ZIP не являются параллельным source of truth;
- официальный release требует отдельного явного решения и применимых gates;
- release source привязывается к exact tested commit + annotated tag;
- пользовательский extension ZIP **не обязан** содержать вложенный полный recovery/source ZIP;
- отдельный offline/disaster recovery artifact создаётся только из clean exact commit с source metadata и hashes.

## Комплексное исследование проекта

Каноническая деятельность: **«Комплексное исследование, оценка и проработка проекта и его архитектуры»**.

`COMPREHENSIVE_PROJECT_RESEARCH_POLICY.md` задаёт обязательный scope. Для каждого существенного вопроса исследование должно сочетать fresh inspection WebClip с multi-source внешним исследованием аналогичных/смежных продуктов, vendor materials, public GitHub/GitLab projects, standards/platform documentation, issues/discussions и пользовательских форумов. Внешние решения рассматриваются как гипотезы и варианты, а не как автоматические требования.

Работа планируется в пределах инструментальной сессии; если качественное завершение требует большего объёма, она разбивается на interruption-safe sessions/tranches с durable GitHub checkpoints. Полнота и точность важнее минимального количества окон.

## GitHub и выполнение проверок

Перед содержательной работой выполняется fresh-fetch `main`; перед write/merge — повторная staleness/TOCTOU проверка. Принятые изменения доводятся до canonical GitHub state и не остаются только в чате.

Проверки выполняются local-first: доступные deterministic/static/analysis операции сначала запускаются локальными/встроенными инструментами. GitHub Actions используются только для недоступной локально environment-boundary evidence либо обязательных independent delivery/release gates. Экономия runner usage не отменяет required physical/external verification и exact-head/post-merge integrity.
