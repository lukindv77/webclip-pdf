# Восстановление контекста проекта WebClip PDF

Актуальный проект находится в приватном GitHub-репозитории `lukindv77/webclip-pdf`, ветка `main`.

**Свежий GitHub `main` — единственный источник истины.** Не восстанавливать более старый snapshot поверх более нового `main` и не считать handoff/recovery архив альтернативным исходным деревом.

## Обязательный порядок начала работы

1. Получить свежий HEAD `main` и фактическое дерево репозитория.
2. Прочитать `GITHUB_REPOSITORY_STATE.md`.
3. Прочитать **единый current registry**: `project_docs/AUDIT_REGISTRY.md`.
4. Для навигации по оставшемуся подробному audit evidence прочитать `project_docs/AUDIT_DELTA_INDEX.md`, затем только релевантные `project_docs/AUDIT_DELTA_*.md`.
5. Перед duplicate/number decision прочитать `project_docs/AUDIT_HISTORY_INDEX.md` и при необходимости:
   - `project_docs/AUDIT_RETIRED_DELTA_EVIDENCE.md`;
   - `project_docs/AUDIT_CROSSCUTTING_REVALIDATION_EVIDENCE.md`;
   - `project_docs/AUDIT_EVIDENCE.md`.
6. Для фактического состояния тестов прочитать:
   - `project_docs/TEST_STATUS.md`;
   - при необходимости historical proof — `project_docs/TEST_EVIDENCE.md`.
7. Для архитектуры/требований по теме читать текущие `project_docs/ARCHITECTURE.md`, `DATA_MODELS.md`, `DECISIONS_AND_RATIONALE.md`, `USER_REQUIREMENTS.md`, `TEST_PLAN.md` и актуальный runtime source.
8. Если нужен старый разговорный checkpoint, искать его только в Git history; dated handoff folders не являются current repository authority.

`project_docs/PRIORITIES_P0_P1_P2.md` теперь только compatibility pointer. Он **не** является вторым реестром статусов.

## Правило новых P-кодов

- Стабильные P-коды не переиспользовать никогда, включая DONE/MERGED/SUPERSEDED.
- P0-079/P0-080 и P1-195…P1-225 уже заняты; P1-072…P1-131 и P2-009/P2-010 имеют explicit history reservation.
- Не считать следующий числовой код свободным только по последовательности или отсутствию строки в compact table.
- Перед новым номером проверить `AUDIT_REGISTRY.md`, relevant family в `AUDIT_DELTA_INDEX.md`, remaining deltas, `AUDIT_HISTORY_INDEX.md`, текущий source и Git history.
- Если root cause уже принадлежит существующему owner, расширять/reopen его, а не создавать дубликат.

## Критические правила текущей ветки

- Manifest намеренно остаётся **`0.9.8` / Manifest V3 / Chrome >=118** до реального release QA и отдельного решения о релизе.
- `0.9.9` в документации означает WIP, а не выпущенную версию.
- Исторический gate **88/88 syntax + 74/74 deterministic** не является текущим rerun; точная формулировка находится в `TEST_STATUS.md`.
- Real unpacked Chrome QA и real Yandex OAuth/API/E2E остаются release requirements.
- Не обходить enterprise browser policy ради получения фиктивного unpacked PASS.
- Не делать build/tag/GitHub Release без отдельного явного запроса после применимого QA gate.
- Timeout/AbortController caller-side не равен cancellation/rollback внешнего side effect.
- `not-admitted`, `unknown settlement`, `verified`, `superseded` — разные состояния.
- Текущая архитектура требует exact generation / immutable receipt / CAS для stale async и irreversible side effects.

## Архитектурные инварианты высокого уровня

1. Области `Включены/Исключены` и frame-aware SelectionSnapshot должны быть привязаны к exact document/application/session generation.
2. Same-origin iframe и cross-origin optional-permission flow не должны смешивать child document identity, permission generation и selection/print generations.
3. PDF создаётся Chromium `Page.printToPDF`; caller timeout не доказывает прекращение browser-owned операции.
4. Native `Save As` принадлежит visible extension page; его пользовательский диалог не получает искусственного timeout/retry.
5. Yandex OAuth access token session-only; PKCE S256; auth/account/root/config/publication/object identity должны быть exact и immutable для одной операции.
6. Journal source of truth — IndexedDB; portable schema отделена от internal recovery/capability fields.
7. Durable correctness receipt не подменяется OperationLog/diagnostics.
8. Свежий lookup по textual id/path/URL сам по себе не является CAS и не должен ретаргетить stale action.
9. Stale asynchronous generation не имеет права переписывать более новый пользовательский intent/UI state.

## Recovery architecture

- Exact Git commit SHA — canonical WIP source snapshot.
- Annotated release tag — immutable pointer на exact tested/released commit.
- Пользовательский extension ZIP не обязан содержать вторую полную копию исходников/recovery ZIP.
- Отдельный recovery ZIP — только optional offline/disaster artifact одного clean exact commit; его metadata содержит source commit/tags/hashes.
- Handoff создаётся только как disposable export по прямому запросу и не сохраняется в working tree как параллельный source of truth.

## Исторические файлы

Root `P*_CLOSURE.md`, `STATIC_CHECKS_*.md`, `DEEP_AUDIT_2026-08-25.md`, `QA_STATUS_0_9_9.md` и `PROJECT_RECOVERY.md` уже прошли retirement comparison и удалены из current tree; их exact originals остаются в Git history.

`project_docs/HANDOFF_2026-08-29/` также retirement-compared и удалён; mapping сохранён в `HANDOFF_RETIREMENT_2026-08-29.md`, exact originals — в Git history.

Часть broad/correction/positive-control `AUDIT_DELTA_*` также уже lossless-консолидирована и удалена. Owner-specific deltas остаются до индивидуального retirement gate; уменьшать их количество ценой потери source proof/acceptance запрещено.
