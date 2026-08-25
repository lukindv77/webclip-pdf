# Project recovery archive

## Изменения 0.9.7

- Контекст исходной вкладки теперь передаётся через `chrome.storage.session` по одноразовому `contextId`; URL и tabId исходного сайта больше не включаются в URL `journal.html`.
- Открытие журнала всегда выполняет service worker, а не action popup. Это исключает зависимость создания extension-вкладки от origin активной страницы.
- Для чтения журнала используется двойная проверка: прямое IndexedDB-чтение и независимая выборка service worker; интерфейс берёт более полную выборку и логирует расхождение в консоль.

- Режим «Весь журнал» полностью отвязан от активной web-вкладки **как фильтр данных**: список `all` всегда читает весь журнал и не передаёт URL/site в выборку.
- В WIP 0.9.9 при наличии HTTP(S)-источника `mode=all` сохраняет краткий `sourceTabId/sourceUrl` в `chrome.storage.session` через `contextId` только для последующего переключения на «Текущий URL»/«Текущий сайт».
- Открытие полного журнала из popup и контекстного меню централизовано через `WEBCLIP_OPEN_JOURNAL_PAGE`.
- Сырые `sourceTabId/sourceUrl` по-прежнему не включаются в URL `journal.html`; при отсутствии web-контекста `Весь журнал` работает самостоятельно.
- Добавлен регрессионный сценарий: полный журнал должен показывать одинаковое число записей при запуске с `chrome://newtab/` и с любой `https://` страницы.


Начиная с версии 0.7.1 каждая сборка WebClip содержит обязательный recovery-архив:

`project_recovery/WebClip_Project_Recovery_vX_Y_Z.zip`

Он предназначен для восстановления проекта в новом чате/среде разработки и содержит текущий snapshot исходников, архитектуру, требования, историю решений, P0/P1/P2, ограничения, тест-план и инструкции следующей сборки.

Правила выпуска находятся в `project_docs/BUILD_AND_RECOVERY_RULES.md`.


## Current build

Текущая сборка: **0.9.8**. Recovery-архив должен называться `WebClip_Project_Recovery_v0_9_8.zip` и содержать синхронизированные исходники и project_docs.

### Audit checkpoint P1-003

`P1-003 = REGRESSION`: `prepareForPrint()` выполняет bounded resource preparation выбранного DOM до Chromium print. Lazy `data-src/data-srcset` и `loading=lazy` временно активируются с rollback, CSS backgrounds прогреваются через page-context `Image`, fonts — через `Document.fonts.load/check`. Общий deadline 15 s, максимум 500 tasks, concurrency 8, DOM scan 5000 elements; scalar resource values bounded. Extension-level `fetch` не используется. `resourceReport` bounded/redacted, сохраняется в durable save metadata/Journal/import-export и выводится в PDF header/OperationLog. Добавлены deterministic `test_p1_003_resource_prefetch.js` и policy-safe Chromium runner `browser_p1_003_resource_prefetch.py`. Manifest остаётся `0.9.8`; release QA не выполнен.

### Audit checkpoint P1-001 / P0-003

`P1-001 = REGRESSION`: новые Journal selection snapshots имеют version 3 и bounded contextual fingerprints; v3 restore scored, возвращает high/medium confidence и fail-closed при ambiguity. v1/v2 остаются legacy-compatible. Добавлены `project_tools/test_p1_001_resilient_selection.js` и policy-safe Chromium runner `project_tools/browser_p1_001_selection_restore.py`.

P1-001 browser-run дал новый repro внутри уже закрытого `P0-003`: cross-realm iframe elements отбрасывались `instanceof Element`. P0-003 исправлен realm-neutral element checks и защищён тем же browser regression. Новый P-код не назначался. Manifest остаётся `0.9.8`; release QA не выполнен.

### Audit checkpoint P1-146

Автоматические PDF downloads (`saveAs:false`) используют settlement-aware start: 15-секундный caller deadline отделён от фактического settlement `chrome.downloads.download()`. При timeout durable intent/Blob не удаляются и retry автоматически не запускается; late success/reject reconciled по исходному checkpoint. Добавлен `project_tools/test_p1_146_download_start_settlement.js`. Это не release QA и не основание повышать manifest выше `0.9.8`.

## Изменения 0.9.8

- Для Yandex-записей удаление требует явного выбора: оставить файл либо переместить его в `<root>/Trash/MM-YYYY`.
- При выборе перемещения сначала выполняется и проверяется операция Яндекс Диска, и только затем удаляется локальная journal entry. Ошибка не уничтожает запись журнала.
- Добавлен устойчивый `resourceId` для новых Yandex-upload journal entries и JSON export/import.
- Если исходный `remotePath` устарел из-за переименования/перемещения, WebClip ищет файл по `resourceId` или `publicUrl`.
- `Trash` является обычной папкой WebClip, не системной Корзиной Яндекс Диска.

### P1-004 closure

P1-004 закрыт как REGRESSION: добавлены `optional_host_permissions`, popup permission action, `frame-agent.js`, bounded frame registry/trust checks в service worker и remote selection/print/restore orchestration в `content.js`. Same-origin path P0-003 не заменён. Local gate: 57/57 JS syntax, 46/46 deterministic; Chromium P1-004/P1-001/P1-003/P1-007 PASS. Enterprise policy не позволяет настоящий unpacked permission prompt, поэтому этот сценарий остаётся release QA. Manifest `0.9.8`/MV3 не менялся.

### Audit checkpoint P1-008

`P1-008 = REGRESSION`: Options поддерживает `webclip-user-settings` v1 с explicit allowlist из 8 пользовательских настроек. OAuth access/refresh token, PKCE/session state, Journal, durable checkpoints, backup execution state и OperationLog contents не входят в экспорт; import не обращается к `chrome.storage.session`. Import ограничен 256 KiB, strict validation выполняется до side effects, затем настройки записываются одним bundled `chrome.storage.local.set` вместе с durable `webclipUserSettingsImportPending`. Caller timeout считается unknown settlement и не запускает retry; marker reconciles backup scheduler при late success или следующем worker start. Regression: 58/58 JS syntax, 47/47 deterministic, `browser_p1_008_user_settings.py` PASS и `browser_p1_007_managed_integration.py` PASS. Manifest `0.9.8`/MV3 не менялся; release QA не выполнен.


### Audit checkpoint P1-009

`P1-009 = REGRESSION`: Journal получил universal multiline filter с bounded 8 rows × 512 chars, field masks `title/comments/site/url`, default title ON и AND/OR. Новый общий `journal-text-filter.js` используется direct IndexedDB path и service-worker fallback. Text matching выполняется на `cursor.value` до mode counters/domain aggregation, URL grouping и pagination; comments не требуют materialization полного журнала. Deterministic `test_p1_009_universal_filter.js` и policy-safe Chromium `browser_p1_009_journal_filter.py` PASS. После изменений полный gate: 60/60 JS syntax, 48/48 deterministic; P1-001/P1-003/P1-004/P1-008 и managed P1-007 browser regressions PASS, последний selected-only PDF 37,692 bytes. Manifest остаётся `0.9.8`/MV3; release QA не выполнен. Handoff archive по этой задаче не создавался.


### Audit checkpoint P1-025

`P1-025 = REGRESSION`: отдельная Journal-ссылка `Открыть сохранённый файл на Яндекс Диске` удалена. Для `destination=yandex` существующий визуальный badge `Яндекс Диск` теперь button-action; он активируется только для валидного Yandex HTTPS `publicUrl`, а действие отправляет `WEBCLIP_OPEN_JOURNAL_SAVED_FILE` с `journalEntryId`. Authority P0-037 сохранена: service worker повторно читает entry и валидирует public URL перед `tabs.create`. Если ссылка отсутствует/невалидна, badge disabled с title/ARIA explanation. Local destination badge остаётся span/non-action; destructive Yandex flow не менялся. Deterministic `test_p1_025_yandex_badge.js` и policy-safe Chromium `browser_p1_025_yandex_badge.py` PASS. Full gate: 61/61 JS syntax, 49/49 deterministic; P1-009 browser regression PASS; managed P1-007 PASS с selected-only PDF 37,604 bytes, Journal PASS и Yandex mocks PASS. Manifest остаётся `0.9.8`/MV3; release QA не выполнен. Handoff archive не создавался.

### Audit checkpoint P1-026

`P1-026 = REGRESSION`: в Journal удалена отдельная строка `Сохранено областей: N · Исключено: N`; количества остаются в одном месте — `Области страницы Включены/Исключены (N/M)`. Пользовательские toolbar/history/Journal/progress/help/manifest тексты переведены на `Включены`/`Исключены`, при этом внутренние `includes/excludes`, `includeCount/excludeCount`, SelectionSnapshot и RPC schema сохранены для совместимости. `test_p1_026_russian_selection_terms.js` и `browser_p1_026_russian_selection_terms.py` PASS; полный gate 62/62 JS syntax и 50/50 deterministic. P1-025/P1-009/P1-007 browser regressions PASS; последний selected-only PDF 37,604 bytes. Manifest остаётся `0.9.8`/MV3; release QA не выполнен. Handoff archive не создавался.

### Audit checkpoint P1-027

`P1-027 = REGRESSION`: Journal больше не выводит отдельную строку `Режим выгрузки: ... · Статус чтения: ...`. Для Yandex-entry сохраняется action-badge `Яндекс Диск` из P1-025; для `destination=download` отображается информационный `Скачан локально` с нейтральной серой схемой и без click-action. Reading status остаётся отдельным badge `Прочитано`/`Прочитать позже`; `.entry-badges` остаётся `flex-wrap: nowrap`. Историческая metadata `Переведено в «Прочитано»` сохранена отдельно и не считается дублированием текущего статуса. Deterministic `test_p1_027_destination_badges.js` и Chromium `browser_p1_027_destination_badges.py` PASS. Full gate: 63/63 JS syntax, 51/51 deterministic; P1-025/P1-026/P1-009 browser regressions PASS; managed P1-007 PASS с selected-only PDF 37,604 bytes. Manifest остаётся `0.9.8`/MV3; release QA не выполнен. Handoff archive не создавался.



### Audit checkpoint P1-028

`P1-028 = REGRESSION`: Journal destination/read-status badges moved from the former upper-right `entry-head` sibling into `entry-title-meta` under the page title. Date/time stays left and the nowrap badge group is right-aligned in the same row. Base `.badge`/Yandex/download/read CSS was not resized; Chromium baseline dimensions remain identical after the move (`Яндекс Диск` 109.03×28, `Прочитано` 75.09×28, `Скачан локально` 111.80×24). Narrow layout clips date/time with ellipsis instead of overlapping badges. `test_p1_028_badge_placement.js` and `browser_p1_028_badge_placement.py` PASS. Full gate: 64/64 JS syntax, 52/52 deterministic; P1-027/P1-025/P1-009 and managed P1-007 browser regressions PASS, selected-only PDF 37,602 bytes. Manifest remains `0.9.8`/MV3; release QA not performed. Handoff archive not created.

`P1-090 = REGRESSION`: новые Yandex journal entries/durable remote checkpoints сохраняют `accountUid/rootPath/resourceId/publicUrl/remotePath`. Destructive locate fail-closed при account/root mismatch; известный resourceId запрещает path-only identity, publicUrl только secondary при отсутствующем candidate resource_id, конфликтующий ID не игнорируется. Legacy entries совместимы. `test_p1_090_yandex_identity.js` PASS. Shared delete→Trash flow не изменён.

`P1-074 = REGRESSION`: history-reserved import staging deadlines физически подтверждены без переиспользования номера: journal-page IDB open/write и service-worker staged read/delete/normalized staging все bounded/abortable; late open закрывается, timeout не запускает atomic replace. `test_p1_074_import_staging_deadlines.js` PASS.

### Audit checkpoint P1-079 / P1-080

`P1-079 = REGRESSION` and `P1-080 = REGRESSION`: native `saveAs:true` ownership was removed from the MV3 service worker. Full Journal export is prepared in the worker but the actual Save As call is owned by `journal.html`; OperationLog JSON is prepared in the worker but the actual call is owned by `options.html`. Shared `prepared-save-as.js` intentionally has no caller timeout/retry around the user-owned native dialog, releases Blob on reject and arms page/worker terminal cleanup on success. P1-129 durable prepared-session serialization remains separate. Regression: 68/68 syntax, 55/55 deterministic; browser P1-079/080, P1-008, P1-009 and managed P1-007 PASS; selected-only PDF 37,604 bytes. Manifest remains 0.9.8/MV3. No handoff archive created.
