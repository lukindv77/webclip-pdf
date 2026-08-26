# Стартовый промт для нового чата — WebClip PDF

Продолжай полный аудит и разработку приватного GitHub-репозитория `lukindv77/webclip-pdf` (Chrome Manifest V3 extension WebClip PDF Prototype).

## Главное правило

**GitHub `main` — единственный источник истины.** Ничего не восстанавливай из памяти и не переписывай проект с нуля. Архив handoff — только аварийная копия, а не более новый источник, чем `main`.

В самом начале нового чата:

1. Получи свежий HEAD ветки `main`.
2. Прочитай `GITHUB_REPOSITORY_STATE.md`.
3. Прочитай `handoff/LATEST.md` и указанный там `CURRENT_STATE_2026-08-26_1047.md`.
4. Прочитай `project_docs/PRIORITIES_P0_P1_P2.md` и хвост `DEEP_AUDIT_2026-08-25.md`.
5. Прочитай `manifest.json`; должно оставаться MV3 / `0.9.8` / minimum Chrome `118`.
6. Если текущий HEAD новее handoff source HEAD, сначала изучи новые commits/diff и продолжай **с фактического нового HEAD**. Никогда не reset/revert к handoff без явной причины.

Handoff source baseline перед упаковкой: `a57042fe82e9c8659a6241b23728f613ae905531`. На этой точке реестр аудита уже дошёл до **P0-077 / P1-188 / P2-019**. Перед присвоением нового номера обязательно проверь актуальный хвост реестра; ориентировочно следующие свободные номера были P0-078 / P1-189 / P2-020.

## Состояние production-кода

Manifest остаётся `0.9.8`; не повышай версию до `0.9.9` и не создавай build/GitHub Release без отдельного явного запроса пользователя после реального release QA.

Production runtime/config код после P0-063 не менялся: последний product commit `ef0e12bda980d947b8a02da816cf6f64be47ceb8`; между ним и handoff source HEAD менялись только `DEEP_AUDIT_2026-08-25.md` и `project_docs/PRIORITIES_P0_P1_P2.md`. Последний доказанный product gate: **88/88 JS syntax PASS + 74/74 deterministic tests PASS**. Не утверждай, что эти тесты были повторно прогнаны для docs-only audit commits.

Release QA по-прежнему BLOCKED до реального unmanaged unpacked Chrome, optional host permission prompt/revoke, реального Yandex OAuth/API/upload/move/backup E2E и оставшегося visual/timing/storage QA.

## Что сейчас делали

Мы продолжали **полный аудит** и по ходу аудита синхронизировали подтверждённые findings в GitHub небольшими docs-only пакетами. Продолжай этот режим, если пользователь не поменяет задачу: проверяй security/trust boundaries, внешние I/O, recovery/crash consistency, CPU/memory на больших данных, storage/parser, UX/admin/diagnostics, dead/duplicate code, стандарты и архитектуру.

Новый finding сначала докажи на актуальном коде и проверь на дубль. Если root cause уже покрыт существующим P-item — расширь его acceptance criteria/status, не создавай новый номер. Подтверждённые стабильные пакеты синхронизируй в `project_docs/PRIORITIES_P0_P1_P2.md` + `DEEP_AUDIT_2026-08-25.md` **во время аудита**, а не только в самом конце. Перед каждым write заново fetch fresh `main`. Docs-only sync не должен менять production/manifest; временный workflow/patch должен быть удалён в финальном commit.

## Критичные открытые ориентиры

Полный список — только в текущем реестре. Среди наиболее важных незакрытых пунктов на handoff:

- P0-064/065 — memory admission до iframe deep-clone / Blob materialization.
- P0-066 — единая confidentiality sanitation source URL до PDF/Journal/backup.
- P0-067/068 — host-page side effects и live iframe clone при PDF preparation.
- P0-069 — public-link lifecycle при destructive Journal/Yandex действиях.
- P0-070 — `Page.printToPDF` должен быть document-generation fenced.
- P0-071 — unsafe PDF URI schemes.
- P0-072 — clear/import нельзя считать отменой реально живых upload/download side effects.
- P0-073/074 — immutable Yandex account/root/auth/config operation fencing.
- P0-075 — hostile host page видит/может синтетически управлять WebClip DOM UI/selection; shared DOM нельзя считать trusted control-plane.
- P0-076 — stale single-entry mutations после clear/import; нужен Journal generation/per-entry CAS.
- P0-077 — единый self-restorable backup envelope.
- P0-022/P0-023/P0-048 — PARTIAL, не считать закрытыми.
- P1-181…P1-188 — последние новые audit items; особенно locator privacy, delete→Trash recovery, Yandex content proof, temporal import, duplicate comment IDs, canvas fidelity, imported CSS selector grammar.
- P2-019 — единый owner IndexedDB schema migrations.

## Зафиксированные продуктовые решения

`createPublicLinks` **должен оставаться включённым по умолчанию** — это не дефект.

Нужно добавить точечное снятие публичной ссылки у конкретной Journal entry. Перед **каждым** таким `unpublish` обязательно получить явное подтверждение пользователя. После подтверждённого unpublish запись становится path-only: `publicUrl/resourceId` больше не являются связью, но пока сохранённый `remotePath` существует, Journal должен уметь открыть файл через авторизованный Yandex API. Если пользователь потом вручную переместил файл, потеря связи допустима; не делай скрытый глобальный поиск/автоповтор upload.

## Инварианты, которые нельзя ломать

- OAuth access token — только `chrome.storage.session`; refresh token не хранить plaintext/persistently без отдельного архитектурного решения.
- PKCE S256; manual verification-code flow сейчас не делает полноценную returned-state validation — P1-165.
- Не хранить `client_secret` в extension. Шифрование token в `storage.local` ключом, который лежит там же, не считать реальной защитой.
- Content/page input и host DOM — attacker-controlled. Privileged operations только в trusted extension context с sender/frame/document/account validation.
- Incognito fail-closed.
- Yandex paths/account/root/object identity fail-closed; non-idempotent operation timeout не означает cancellation.
- Никаких blind retry для неизвестно завершившегося upload/move/download/Chrome side effect; только durable checkpoints + actual-settlement reconciliation.
- `chrome.downloads.download({saveAs:true})` остаётся extension-page owned и без искусственного timeout системного диалога. P1-156 требует также не дать backing Blob истечь скрытым 16-минутным TTL пока диалог реально открыт.
- Offscreen/Blob/PDF/IDB/runtime payloads bounded; readonly publish только после completion.
- OperationLog v2 и постоянная структурная диагностика — продуктовая функция, не удалять ради упрощения.
- Cross-origin iframe только после explicit optional host permission; revoke/stale document fail-closed.
- Full PSL сохранить. `debugger` сейчас функционально нужен для `Page.printToPDF`.

## Режим GitHub

Пользователь явно потребовал фиксировать изменения в GitHub **во время аудита**. Делай небольшие, но завершённые audit sync commits по подтверждённым findings. Не коммить каждую гипотезу.

Перед каждой новой implementation P-задачей дай короткую русскую **«Справку»**: проблема, подсистема, эффект закрытия/незакрытия, инварианты, тесты/доказательство. Перед write снова fetch fresh `main`. Для крупных `service-worker.js`/`content.js` изменений разрешён guarded one-shot GitHub Actions patch: exact baseline, targeted tests, `node --check`, все `project_tools/test_*.js`, manifest invariants, temp workflow/patch удаляется финальным commit.

Не создавай handoff/archive после каждой задачи. Этот handoff создан только потому, что пользователь специально попросил перейти в новый чат.

Начни новый чат с подтверждения свежего HEAD и краткого резюме того, что ты прочитал из `handoff/LATEST.md`/`CURRENT_STATE` и текущего хвоста реестра. Затем продолжай аудит от фактического GitHub `main`.
