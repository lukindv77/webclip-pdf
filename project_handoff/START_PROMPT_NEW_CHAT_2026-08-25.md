# Стартовый промт для нового чата — WebClip PDF Prototype

Продолжай разработку Chrome extension **WebClip PDF Prototype** из приватного GitHub repository `lukindv77/webclip-pdf`, branch `main`.

## Главное правило

**GitHub `main` — единственный source of truth. Не реконструируй проект из памяти, старых сообщений или старого архива.**

Сначала через GitHub:

1. fetch branch `main` и зафиксируй текущий HEAD;
2. прочитай `project_handoff/HANDOFF_2026-08-25.md`;
3. прочитай `DEEP_AUDIT_2026-08-25.md`;
4. прочитай `project_docs/PRIORITIES_P0_P1_P2.md`;
5. прочитай `QA_STATUS_0_9_9.md` и `README.md`;
6. проверь наличие `project_handoff/HANDOFF_ARCHIVE_SOURCE.txt` и checksum handoff archive;
7. если текущий HEAD отличается от handoff baseline, сначала изучи новые commits/diff и только затем продолжай работу. Ничего не откатывай автоматически.

Канонический product/audit HEAD непосредственно перед handoff docs: `bccb2aa2debfcd32f3c585326829d9f3241e5c71`, commit `audit: register deep findings and optimize bounded UI work (P1-155 P1-159)`.

Manifest должен оставаться MV3, version `0.9.8`, minimum Chrome 118. Не повышай до 0.9.9 без прямого запроса пользователя после реального release QA.

## Подтверждённое состояние на handoff

Последний полный audit-remediation gate после P1-155/P1-159:

- JavaScript syntax **86/86 PASS**;
- deterministic `project_tools/test_*.js` **73/73 PASS**;
- manifest/security invariant gate **PASS**;
- temporary audit workflows/patch scripts удалены;
- P1-155 и P1-159 закрыты как `REGRESSION`;
- специальный managed/unpacked browser rerun для P1-155/P1-159 не выполнялся, поэтому не заявляй browser PASS для них;
- реальный Chrome repro P1-153 на исходной `its.1c.ru` странице ранее подтверждён: PDF 2 страницы и полный хвост статьи присутствует.

Повторный глубокий аудит сохранён в `DEEP_AUDIT_2026-08-25.md`. Permanent OperationLog diagnostics являются частью продукта и **не должны удаляться/урезаться как временная диагностика**.

## Текущий новый critical backlog аудита

Если пользователь не задаст другой приоритет, следующая работа должна начинаться с:

### P0-063 — OPEN
Global offscreen signed-transfer admission/memory budget. Несколько параллельных крупных transfer могут одновременно materialize 50–64 MiB IDB/Blob/fetch body. Нужен global actual-settlement count + byte reservation до materialization и release только после фактического settlement.

### P0-064 — OPEN
Flattened iframe deep-clone preflight budget. `cloneNode(true)` и полные descendant arrays формируются до существующего style budget. Нужен bounded node/text/estimated-byte preflight и incremental traversal/fail-safe OOM protection.

Затем:

- `P1-154` — top-document selection live-count budget;
- `P1-156` — prepared/native Save As cleanup lifecycle;
- `P1-157` — remaining direct Chrome API/runtime RPC deadlines in extension/content contexts;
- `P1-158` — residual service-worker Chrome maintenance/config reads;
- `P1-160` — auto-content/page-discovery traversal node/time budget.

Новые architectural P2: `P2-014`, `P2-015`, `P2-016`. Все ранее занятые P0/P1/P2 ID сохраняются и никогда не переиспользуются.

## Перед каждой новой P-задачей

Сначала дай пользователю короткую русскую **«Справку»**, содержащую:

- проблему;
- затронутый subsystem;
- влияние, если закрыть/не закрыть;
- критические invariants;
- tests/evidence, которыми будет доказано закрытие.

После этого fetch fresh `main` ещё раз непосредственно перед write, если между аудитом и изменением могли появиться новые commits.

## Non-negotiable architecture/security invariants

- Никогда не переписывай проект с нуля.
- OAuth access token — только `chrome.storage.session`; refresh token не сохранять.
- Legacy persistent token cleanup awaited/fail-closed; PKCE S256/state сохранять.
- Yandex managed paths/account/root/resource identity проверять fail-closed.
- Non-idempotent Chrome/network side effects не повторять blind retry после timeout; использовать durable checkpoint + actual late-settlement reconciliation.
- Native `saveAs:true` остаётся extension-page owned и не получает artificial timeout/retry системного диалога.
- Offscreen Blob/PDF/transfer lifecycle должен оставаться bounded.
- IDB/runtime operations bounded; completion-aware readonly semantics сохранять там, где они введены.
- OperationLog v2 append-only semantics и permanent structured diagnostics сохранять.
- Cross-origin iframe — только после explicit optional host permission; сохранять sender/frame/document validation.
- Full PSL, Incognito privacy boundary, storage access restrictions сохранять.
- `debugger` используется только в PDF lifecycle; не расширять privilege surface без необходимости.

## GitHub workflow

Для больших изменений в `service-worker.js`/`content.js` допустим one-shot GitHub Actions patch workflow, но:

1. guarded baseline SHA/anchor verification;
2. применить patch;
3. прогнать полный `node --check` и все deterministic `project_tools/test_*.js`;
4. commit product changes только после полного PASS;
5. удалить temporary workflow/patch files в том же финальном commit;
6. затем повторно fetch `main` и назвать пользователю точный итоговый HEAD.

Не считать исправление test harness доказательством исправления product runtime: сначала product architecture должна быть корректна, затем можно обновлять isolated VM dependency stubs/expectations.

## Release/build ограничения

Release gate остаётся **BLOCKED** до реального unmanaged unpacked Chrome + real optional host-permission prompt/revoke + реального Yandex OAuth/API/upload/move/backup E2E + remaining visual/timing/storage QA.

- Не создавай build или GitHub Release без прямого запроса пользователя.
- Не меняй manifest version 0.9.8 на 0.9.9 без прямого release request и завершённого реального QA.
- Старые diagnostic/pre-release builds не содержат P1-155/P1-159; не представлять их как текущую сборку.

## Что сделать в начале этого нового чата

Не начинай кодирование сразу. Сначала:

1. сверяй fresh GitHub `main`;
2. прочитай handoff/audit/priority/QA документы;
3. сообщи мне текущий HEAD, manifest version и найденные OPEN P0/P1 из последнего audit block;
4. подтверди, что временных handoff/audit workflow/patch-файлов нет;
5. затем дай «Справку» по ближайшей задаче `P0-063` и предложи начать её, если я не дал другое конкретное указание.

Работу продолжай только на основе актуального GitHub `main`.
