# WebClip PDF Prototype

Chrome Manifest V3 extension для сохранения выбранного содержимого веб-страницы в PDF с локальным Journal и опциональной интеграцией с Яндекс Диском.

## Текущий runtime

- Manifest V3
- версия `0.9.8`
- минимальный Chrome `118`
- `0.9.9` остаётся WIP и **не является выпущенной версией**

Runtime version определяется `manifest.json`. Research/docs progress сам по себе не создаёт build/tag/GitHub Release.

## Current baseline

Обычная разработка и **Комплексное исследование, оценка и проработка проекта и его архитектуры** начинаются от fresh GitHub `main`, а не от истории изменения требований.

- `project_docs/USER_REQUIREMENTS.md` — current requirements/technical conditions;
- `project_docs/DECISIONS_AND_RATIONALE.md` — current rationale;
- `project_docs/PROJECT_OVERVIEW.md` — краткий current product state;
- historical requirement revisions — Git history, on demand only.

Старый chat/handoff/changelog не является параллельным current baseline.

## Основные возможности

- выбор областей «Включены» и «Исключены»;
- same-origin iframe и permission-gated cross-origin frame architecture;
- печатный PDF через `chrome.debugger` / `Page.printToPDF`;
- локальное скачивание и native Save As flows;
- локальный Journal в IndexedDB с URL/site/all views, export/import и selection snapshots;
- опциональная загрузка PDF и versioned Journal backup на Яндекс Диск;
- OperationLog/receipts и recovery/reconciliation для asynchronous operations.

`project_docs/RESEARCH_REGISTRY.md`, а не README, является authority по current P-code owner/status.

## Установка для разработки/QA

1. Получить exact требуемый Git commit.
2. Открыть `chrome://extensions`.
3. Включить **Режим разработчика**.
4. Нажать **Загрузить распакованное расширение**.
5. Выбрать checkout с `manifest.json`.

Release/claim-specific QA отдельно может требовать real unpacked Chrome и real Yandex OAuth/API evidence; deterministic checks не заменяют такие boundaries.

## Проверки: local-first

До обращения к GitHub Actions выполняются все проверки, которые доступная local/built-in среда может достоверно выполнить: syntax/static checks, deterministic tests, repository/document consistency и другие применимые preflight operations.

GitHub Actions используются только когда:

- необходимая environment/physical/external boundary недоступна локально; либо
- run является обязательным independent delivery/release gate.

Canonical PR delivery сохраняет exact-head и post-merge `Repository integrity`; экономия runner usage не отменяет эти gates, TOCTOU или required physical/external evidence.

## Документация

Начинать с `project_docs/README_INDEX.md` и фактического `project_docs/CONTEXT_MANIFEST.json`.

Ключевые current документы:

- `project_docs/USER_REQUIREMENTS.md` — current requirements;
- `project_docs/DECISIONS_AND_RATIONALE.md` — current rationale;
- `project_docs/COMPREHENSIVE_PROJECT_RESEARCH_POLICY.md` — scope и mandatory multi-source external research;
- `project_docs/SESSION_EXECUTION_AND_INTERRUPTION_SAFETY_POLICY.md` — session windows/durable checkpoints/local-first;
- `project_docs/RESEARCH_REGISTRY.md` — current P-code/status/owner registry;
- `project_docs/RESEARCH_CHANGE_WORKFLOW.md` — lifecycle finding/P-owner/evidence/PR;
- `project_docs/RESEARCH_DELTA_INDEX.md` — research evidence navigation;
- `project_docs/ARCHITECTURE.md` — architecture;
- `project_docs/TEST_STATUS.md` — current test truth;
- `project_docs/RELEASE_READINESS.md` — current release truth;
- `project_docs/TEST_PLAN.md` — regression plan;
- `project_docs/BUILD_AND_RECOVERY_RULES.md` — Git-first recovery/release provenance;
- `project_docs/GITHUB_WORKFLOW.md` — PR-first process;
- `project_docs/RESTORE_PROMPT.md` — fresh GitHub restore.

Research/release history сохраняется как proof/provenance и читается по необходимости; она не используется для вычисления действующего requirement state.

## Source-of-truth policy

`lukindv77/webclip-pdf` / fresh `main` — canonical working source. Exact commit SHA идентифицирует WIP snapshot. Released source должен быть привязан к exact tested commit и annotated release tag.

Репозиторий остаётся private, `main` — `protected=false`; обычные изменения поэтому проходят PR-first с exact-head Repository Integrity, fresh TOCTOU и post-merge Repository Integrity.

## Комплексное исследование проекта

Каждый существенный исследуемый вопрос должен сочетать fresh WebClip inspection с внешним multi-source research: аналогичные/смежные продукты и vendor materials, public GitHub/GitLab проекты, issues/discussions, standards/platform docs и пользовательские форумы/опыт. Внешние решения являются гипотезами и comparison inputs, а не автоматическими требованиями.

Если полный качественный объём не помещается в одну инструментальную сессию, исследование разбивается на interruption-safe sessions/tranches с durable GitHub checkpoints. Полнота и точность важнее количества окон.
