# Восстановление контекста проекта WebClip PDF

Актуальный проект находится в приватном GitHub-репозитории `lukindv77/webclip-pdf`, ветка `main`.

**Свежий GitHub `main` — единственный источник истины.** Не восстанавливать более старый snapshot поверх более нового `main` и не считать handoff/recovery архив альтернативным исходным деревом.

## Обязательный порядок начала работы

1. Получить свежий HEAD `main` и фактическое дерево репозитория.
2. Прочитать `GITHUB_REPOSITORY_STATE.md`.
3. Прочитать текущие реестры аудита:
   - `project_docs/PRIORITIES_P0_P1_P2.md` — исторический canonical range до P1-194;
   - `project_docs/AUDIT_CONSOLIDATION_INDEX.md` — canonical supplement P1-195…P1-225;
   - `project_docs/AUDIT_HISTORY_INDEX.md` — corrections/retractions/dedup/negative findings, нужные для duplicate-check.
4. Для фактического состояния тестов прочитать:
   - `project_docs/TEST_STATUS.md`;
   - при необходимости historical proof — `project_docs/TEST_EVIDENCE.md`.
5. Для historical implementation/browser proof существующих P-item читать `project_docs/AUDIT_EVIDENCE.md`.
6. Для детального root cause/acceptance/refinement читать релевантные `project_docs/AUDIT_DELTA_*.md`; они пока остаются подробным evidence-слоем и не считаются устаревшими только потому, что номер уже внесён в registry.
7. Для архитектуры/требований по теме читать текущие `project_docs/ARCHITECTURE.md`, `DATA_MODELS.md`, `DECISIONS_AND_RATIONALE.md`, `USER_REQUIREMENTS.md`, `TEST_PLAN.md` и актуальный runtime source.
8. Если нужен краткий контекст предыдущей audit-сессии, использовать только текущий `project_docs/HANDOFF_2026-08-29/`, но свежий `main` и текущие registry/evidence документы всегда имеют приоритет.

## Правило новых P-кодов

- Стабильные P-коды не переиспользовать.
- P1-195…P1-225 уже заняты.
- Не считать следующий числовой код свободным только по последовательности.
- Перед новым номером проверить текущие registry, relevant `AUDIT_DELTA_*`, `AUDIT_HISTORY_INDEX.md`, текущий source и при необходимости Git history.
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

## Исторические файлы

Старые handoff ZIP/snapshots уже намеренно удалены из текущего дерева; их содержимое остаётся в Git history. Старые closure/static/deep/QA narratives постепенно заменяются compact registry/evidence документами и могут удаляться из текущего `main` только после lossless retirement comparison.
