# Готовый prompt для восстановления проекта в новом чате

Актуальный основной remote проекта: приватный GitHub-репозиторий `lukindv77/webclip-pdf`, ветка `main`.
Если новый чат получил handoff ZIP, распаковать его и использовать `current_recovery_snapshot/current_wip/` как точный physical WIP той же ревизии, что синхронизирована в GitHub.

## Обязательный порядок начала работы

1. Прочитать `README_FIRST.md`, `CURRENT_STATE.md`, `AUDIT_STATUS.md`, `PENDING_WORK.md`, `STATIC_CHECKS.md` из handoff, если они приложены.
2. Затем прочитать `REGISTRY_CONFLICTS_AND_GAPS.md` и `AUDIT_HISTORY_RESERVED_CODES.md`.
3. В physical WIP прочитать `PROJECT_RECOVERY.md`, `README.md`, `project_docs/USER_REQUIREMENTS.md`, `ARCHITECTURE.md`, `DATA_MODELS.md`, `TEST_PLAN.md`, `PRIORITIES_P0_P1_P2.md`.
4. Перед новым P-кодом обязательно сверять registry/history. Не переиспользовать занятые номера.

## Критические правила текущей ветки

- Manifest намеренно остаётся **`0.9.8` / Manifest V3** до закрытия audit gate и реального Chrome/Yandex release QA. Не повышать версию только из-за очередной задачи или commit.
- Не переписывать проект с нуля и не заменять current WIP более старым recovery snapshot.
- Не считать разговорный progress доказательством наличия кода: статус закрывается только physical code + tests/evidence.
- Handoff/recovery ZIP для перехода между чатами создаётся **только по прямому запросу пользователя**. Исключение: versioned release/recovery archive, обязательный при реальной смене версии согласно `BUILD_AND_RECOVERY_RULES.md`.
- Не обходить enterprise browser policy ради unpacked tests. Full unpacked MV3 + real Yandex остаётся release QA.
- Shared Journal+Yandex destructive flow не менять без нового repro/OperationLog.

## Архитектурные инварианты

1. Области `Включены/Исключены` и frame-aware `SelectionSnapshot v3`.
2. Same-origin iframe — обычные selection scopes; cross-origin iframe — только через `frame-agent.js` после explicit optional host permission.
3. PDF создаётся Chromium `Page.printToPDF`; automatic local download имеет durable checkpoint/actual-settlement reconciliation.
4. Native `Save As` для полного Journal и OperationLog принадлежит visible extension page, не MV3 worker.
5. Yandex OAuth access token session-only; refresh token не хранится; PKCE S256; legacy persistent token cleanup awaited/fail-closed.
6. Journal source of truth — IndexedDB; large import/export/backup bounded и crash-consistent.
7. Yandex identity новых Journal entries: `accountUid + rootPath + resourceId + publicUrl + remotePath`; ambiguous/mismatched destructive locate fail-closed.
8. OperationLog v2 — локальный append-only диагностический журнал с bounded retention/redaction.
