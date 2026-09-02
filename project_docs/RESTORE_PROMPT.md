# Восстановление контекста проекта WebClip PDF

Актуальный проект находится в приватном GitHub-репозитории `lukindv77/webclip-pdf`, canonical branch `main`.

**Fresh GitHub `main` — единственный source of truth для текущего дерева.** Exact SHA из старого чата/handoff — только checkpoint для сверки.

## Быстрый bootstrap нового чата

1. Fresh-fetch HEAD `main` и зафиксировать exact commit SHA.
2. Проверить open Pull Requests, open Issues и branches как возможное незавершённое durable state.
3. Прочитать `project_docs/CONTEXT_MANIFEST.json`.
4. Прочитать **фактический bootstrap-набор из текущего manifest**, не использовать сохранённый в старом чате список.
5. `USER_REQUIREMENTS.md` считать current authority для действующих требований/технических условий.
6. `DECISIONS_AND_RATIONALE.md` считать current rationale для принятых решений.
7. **Не реконструировать current requirements из старых commits, changelog, dated handoff, старого чата или последовательности historical evidence.** Git history используется только по конкретной необходимости: provenance, regression investigation, duplicate/root-cause reconciliation или явно исторический вопрос.
8. Определить профиль задачи: restore / research / development / release и прочитать соответствующие файлы текущего manifest.
9. Для research обязательно соблюдать `COMPREHENSIVE_PROJECT_RESEARCH_POLICY.md`, `SESSION_EXECUTION_AND_INTERRUPTION_SAFETY_POLICY.md` и `CONTEXT_AUTOMATION_POLICY.md`.

## Current authorities

- source/WIP tree — fresh `main` exact SHA;
- requirements/technical conditions — `USER_REQUIREMENTS.md`;
- current rationale — `DECISIONS_AND_RATIONALE.md`;
- P-code owner/status — только `RESEARCH_REGISTRY.md`;
- research navigation — `RESEARCH_DELTA_INDEX.md`;
- detailed research proof — `RESEARCH_FAMILY_*_EVIDENCE.md` + relevant history/cross-cutting evidence;
- current test truth — `TEST_STATUS.md` + applicable exact execution evidence;
- release truth — `RELEASE_READINESS.md`.

Historical evidence может помогать найти старый repro/root cause, но не повышает current research status само по себе.

## Комплексное исследование проекта

Каноническое понятие:

**«Комплексное исследование, оценка и проработка проекта и его архитектуры»**.

Допустимые сокращения: «Комплексное исследование проекта», «Глубокое комплексное исследование проекта», «Полное комплексное исследование проекта».

Для каждого существенного research-вопроса обязательно:

1. fresh source/architecture/current-baseline inspection;
2. multi-source внешнее исследование аналогичных/смежных продуктов и vendor materials;
3. анализ похожих/частично смежных public GitHub/GitLab проектов и relevant issues/discussions;
4. relevant standards/browser/platform documentation;
5. пользовательские дискуссии/форумы/Reddit и другие источники реального опыта, когда они релевантны;
6. использование внешних решений как гипотез/known failure modes/вариантов, а не как автоматических WebClip requirements;
7. самостоятельная взвешенная оценка applicability/trade-offs и обязательная проверка финального вывода против fresh WebClip `main`.

Security work — только defensive security / защитный архитектурный анализ.

## Инструментальное окно

Перед длинным research tranche оценивается объём работы, external/physical evidence и delivery tail. Если качественное завершение не помещается в текущую инструментальную сессию, work разбивается на несколько interruption-safe sessions/tranches с exact durable GitHub resume points.

Полнота, точность и детализация имеют приоритет над минимальным числом инструментальных окон. Нельзя уменьшать required scope/evidence только ради одного окна.

## Local-first

Доступные deterministic/static/analysis проверки сначала выполняются локальными/встроенными инструментами. GitHub Actions используются только если:

- требуемая environment/physical/external boundary недоступна локально; либо
- Actions-run является обязательным independent delivery/release gate проекта.

Экономия runner usage не отменяет exact-head/post-merge Repository Integrity, TOCTOU, physical Chrome/external QA или другой обязательный evidence layer.

## Новые P-коды

- Стабильные P-коды никогда не переиспользуются, включая DONE/MERGED/SUPERSEDED.
- Перед новым номером выполнить semantic duplicate/root-cause check по `RESEARCH_REGISTRY.md`, relevant family evidence, `RESEARCH_HISTORY_INDEX.md` и Git history.
- Если root cause уже принадлежит существующему owner, расширять/reopen его, а не создавать дубликат.
- Отсутствие номера в одном документе не означает, что номер свободен.
- `RESEARCH_REGISTRY.md` остаётся единственным current authority для owner/status.

## PR-first delivery

Обычный порядок изменений:

`fresh main -> отдельная branch -> bounded change -> PR -> Repository Integrity на exact reviewed PR head -> fresh TOCTOU -> expected-head squash merge -> Repository Integrity на exact new main`.

Использовать local-first preflight до GitHub Actions. Не использовать Actions как interactive debugger для доступных локально ошибок.

## Критические release/verification ограничения

- Manifest `0.9.8` остаётся current runtime version до отдельного release decision.
- `0.9.9` — WIP, не released version.
- Deterministic/CI PASS не заменяет real unpacked Chrome или real Yandex OAuth/API E2E, когда они требуются claim/release gate.
- Не делать build/tag/GitHub Release без отдельного явного release decision и применимых gates.
- `not-admitted`, `unknown settlement`, `verified`, `superseded` — разные состояния.
- Caller timeout/AbortController не равен cancellation/rollback внешнего side effect.

## Recovery

- Exact Git commit SHA — canonical WIP snapshot.
- Annotated release tag — pointer на exact tested/released commit.
- Пользовательский extension ZIP не обязан содержать вложенный полный source/recovery ZIP.
- Отдельный recovery ZIP — optional offline/disaster artifact clean exact commit с metadata/hashes.

## Триггер перехода в новый чат

Фраза пользователя **«Подготовь переход в новый чат»** запускает handoff protocol даже при незавершённой работе.

Нельзя искусственно закрывать P-owner, повышать research status, объявлять acceptance или делать release ради перехода. Незавершённое state сохраняется в существующем PR/branch либо, если это необходимо для предотвращения потери контекста и PR отсутствует, в явном durable checkpoint согласно `CONTEXT_AUTOMATION_POLICY.md`.

Новый чат всегда повторяет fresh GitHub bootstrap и продолжает от фактического durable state, а не от предположений старого чата.
