# WebClip PDF Prototype

Chrome Manifest V3 extension для сохранения выбранного содержимого веб-страницы в PDF с локальным Journal и опциональной интеграцией с Яндекс Диском.

## Текущий runtime

- Manifest V3
- версия `0.9.8`
- минимальный Chrome `118`
- `0.9.9` остаётся WIP и **не является выпущенной версией**

Номер runtime определяется `manifest.json`. Research/docs progress сам по себе не меняет version/build/tag/Release.

## Основные возможности

- выбор нескольких областей «Включены» и «Исключены»;
- same-origin iframe и permission-gated cross-origin frame architecture;
- печатный PDF через `chrome.debugger` / `Page.printToPDF`;
- локальное скачивание и native Save As flows;
- локальный Journal в IndexedDB с URL/site/all views, экспортом/импортом и шаблонами selection snapshot;
- опциональная загрузка PDF и резервных копий Journal на Яндекс Диск;
- OperationLog/receipts и recovery/reconciliation механизмы для асинхронных операций.

Часть архитектурных границ остаётся open research backlog. `RESEARCH_REGISTRY.md`, а не этот README, является authority по их статусам.

## Установка для разработки/QA

1. Получить exact нужный Git commit.
2. Открыть `chrome://extensions`.
3. Включить **Режим разработчика**.
4. Нажать **Загрузить распакованное расширение**.
5. Выбрать каталог checkout с `manifest.json`.

Release QA отдельно требует реальное unpacked MV3 поведение Chrome и реальные Yandex OAuth/API сценарии; deterministic CI не заменяет эти проверки.

## Проверки репозитория

GitHub Actions workflow `Repository integrity` запускает:

- `project_tools/check_repository_consistency.py`;
- `project_tools/check_release_readiness.py status` — проверка структуры readiness, при этом `NOT READY` допустим;
- `node --check` для tracked JavaScript;
- все `project_tools/test_*.js`;
- `project_tools/test_recovery_archive.py`.

Отдельный ручной workflow `Release gate` повторяет deterministic/recovery проверки для exact candidate SHA/version и затем fail-closed требует текущий real Chrome/Yandex/release-decision evidence. Он **не** строит и не публикует Release.

## Документация и исследование

Начинать с `project_docs/README_INDEX.md`.

Ключевые документы:

- `project_docs/RESEARCH_REGISTRY.md` — единый current P-code/status/owner registry;
- `project_docs/RESEARCH_CHANGE_WORKFLOW.md` — жизненный цикл finding/P-owner/implementation/evidence/PR;
- `project_docs/RESEARCH_DELTA_INDEX.md` — навигация по consolidated research families;
- `project_docs/RESEARCH_FAMILY_*_EVIDENCE.md` — подробные family evidence;
- `project_docs/ARCHITECTURE.md` — архитектура;
- `project_docs/USER_REQUIREMENTS.md` — требования;
- `project_docs/TEST_STATUS.md` — current test/release truth;
- `project_docs/RELEASE_READINESS.md` — current fail-closed release readiness;
- `project_docs/TEST_PLAN.md` — regression plan;
- `project_docs/BUILD_AND_RECOVERY_RULES.md` — Git-first recovery/release provenance;
- `project_docs/GITHUB_WORKFLOW.md` — PR-first policy и accepted private `protected=false` posture;
- `project_docs/RESTORE_PROMPT.md` — восстановление проектного контекста из свежего `main`.

Исторические closure/static-check/delta документы не дублируются в working tree после lossless consolidation: их доказательства сохранены в evidence-файлах, а точные предыдущие состояния — в Git history.

## Source-of-truth policy

`lukindv77/webclip-pdf` / `main` — canonical working source. Перед анализом или записью нужно fresh-fetch `main`. Exact commit SHA идентифицирует WIP snapshot; release source должен быть привязан к exact tested commit и annotated release tag.

Репозиторий намеренно остаётся private, а `main` — `protected=false`; обычные изменения поэтому проходят PR-first с exact-head CI и повторной TOCTOU-проверкой непосредственно перед merge.

## Comprehensive Project Research

Project-wide engineering research is governed by `project_docs/COMPREHENSIVE_PROJECT_RESEARCH_POLICY.md`. It covers requirements, architecture, implementation conformity, standards, technical debt, performance, reliability, defensive security, maintainability, dependencies, risks, improvement alternatives, architecture recommendations, comparable products, user expectations, usage trends and user stories.
