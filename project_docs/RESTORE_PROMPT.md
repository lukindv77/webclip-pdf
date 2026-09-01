# Восстановление контекста проекта WebClip PDF

Актуальный проект находится в приватном GitHub-репозитории `lukindv77/webclip-pdf`, ветка `main`.

**Свежий GitHub `main` — единственный источник истины для текущего дерева.** Никогда не восстанавливать старый snapshot поверх более нового `main` и не считать handoff/recovery archive параллельным source of truth. Exact SHA, переданный из предыдущего чата, является только checkpoint для сверки: новый чат всё равно обязан заново получить текущий HEAD `main`.

## Быстрый bootstrap нового чата

1. Получить свежий HEAD `main` и зафиксировать exact commit SHA.
2. Прочитать `project_docs/CONTEXT_MANIFEST.json`.
3. Прочитать **фактический bootstrap-набор из текущего manifest**, не полагаясь на сохранённый список из старого чата. На момент этой редакции он включает:
   - `GITHUB_REPOSITORY_STATE.md`;
   - `project_docs/COMPREHENSIVE_PROJECT_RESEARCH_POLICY.md`;
   - `project_docs/RESEARCH_REGISTRY.md`;
   - `project_docs/RESEARCH_DELTA_INDEX.md`;
   - `project_docs/TEST_STATUS.md`.
4. Определить профиль текущей задачи: restore / research / development / release.
5. Читать только файлы нужного профиля из текущего `CONTEXT_MANIFEST.json` и релевантные `RESEARCH_FAMILY_*_EVIDENCE.md` через навигацию `RESEARCH_DELTA_INDEX.md`.
6. Для профиля **research** обязательно соблюдать `project_docs/COMPREHENSIVE_PROJECT_RESEARCH_POLICY.md` и `project_docs/CONTEXT_AUTOMATION_POLICY.md`, включая постоянную defensive-security границу.
7. Для исторического контекста использовать `RESEARCH_HISTORY_INDEX.md`, `RESEARCH_EVIDENCE.md`, `TEST_EVIDENCE.md`, retired evidence и Git history только по необходимости.
8. Проверить open Pull Request и open Issue: они могут содержать незавершённую фактическую работу/hand-off checkpoint, но не заменяют canonical status authority.

`COMPREHENSIVE_PROJECT_RESEARCH_POLICY.md` — постоянная scope authority для понятия **«Комплексное исследование, оценка и проработка проекта и его архитектуры»** и его допустимых сокращённых форм. `RESEARCH_REGISTRY.md` — единственный current authority для P-code owner/status. `RESEARCH_DELTA_INDEX.md` — только family navigation. Standalone historical delta-файлы не являются обязательным current read; подробное действующее proof хранится в consolidated `RESEARCH_FAMILY_*_EVIDENCE.md` и cross-cutting/history evidence.

Для security-вопросов комплексного исследования действует постоянная defensive-only граница из `COMPREHENSIVE_PROJECT_RESEARCH_POLICY.md` и `CONTEXT_AUTOMATION_POLICY.md`: анализировать защиту конфиденциальности, целостности, хранения и передачи данных/файлов/credentials расширения и внешних API-контекстов; не переходить к эксплуатации, обходу авторизации, атакам, вредоносному коду или инструкциям по проникновению. При необходимости класс угрозы описывается только концептуально через защищаемые данные, условие риска и defensive control.

## Постоянный триггер перехода в новый чат

Фраза пользователя:

**«Подготовь переход в новый чат»**

всегда запускает handoff-протокол, даже если разработка, комплексное исследование проекта, PR или обсуждение не завершены.

При таком handoff нельзя искусственно завершать работу, закрывать P-owner, повышать research status или объявлять acceptance только ради чистого перехода. Незавершённое состояние сохраняется через существующий open Pull Request; если PR нет и существенный незавершённый контекст ещё нигде не закреплён — через open Issue/checkpoint с exact `main`/branch/PR SHA и явной пометкой, что это working context, а не новый source of truth.

После подготовки GitHub ChatGPT обязан выдать пользователю готовый стартовый prompt для нового чата. Этот prompt должен требовать fresh-fetch `main`, чтение `CONTEXT_MANIFEST.json`, фактического bootstrap-набора и продолжение незавершённой работы из open PR/open Issue/Git history без предположения, что предыдущая работа завершена.

## Правило новых P-кодов

- Стабильные P-коды никогда не переиспользуются, включая DONE/MERGED/SUPERSEDED.
- Перед новым номером выполнить semantic duplicate/root-cause check по `RESEARCH_REGISTRY.md`, relevant family evidence, `RESEARCH_HISTORY_INDEX.md` и Git history.
- Если root cause уже принадлежит существующему owner, расширять/reopen его, а не создавать дубликат.
- Отсутствие номера в одном документе не означает, что номер свободен.

## Критические release/verification ограничения

- Manifest остаётся `0.9.8` / Manifest V3 / Chrome >=118 до применимого real release QA и отдельного решения о релизе.
- `0.9.9` в документации означает WIP, не released version.
- CI/deterministic PASS на SHA не заменяет real unpacked Chrome QA или real Yandex OAuth/API E2E.
- Не делать build/tag/GitHub Release без отдельного явного release decision и применимых gates.
- `not-admitted`, `unknown settlement`, `verified`, `superseded` — разные состояния.
- Caller timeout/AbortController не равен cancellation/rollback внешнего side effect.

## Recovery

- Exact Git commit SHA — canonical WIP snapshot.
- Annotated release tag — pointer на exact tested/released commit.
- Recovery ZIP — optional offline/disaster artifact exact clean commit, а не параллельное рабочее дерево.
- Старые handoff/checkpoint документы, удалённые после retirement comparison, восстанавливаются из Git history только при необходимости.
