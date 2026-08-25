# WebClip 0.9.9 — QA status (UNRELEASED / BLOCKED)

Дата проверки: 2026-08-23.

Эта рабочая копия продолжена строго из `wip_0_9_9_unreleased/`. Она **не является релизом 0.9.9**. `manifest.json` намеренно остаётся на версии `0.9.8` до завершения реального Chrome/Yandex end-to-end QA.

## Найденные и исправленные дефекты WIP

1. В `popup.html` восстановлен требуемый текст основной команды: `Прочитано — начать выделение`.
2. Исправлен edge-case счётчика после upgrade IndexedDB v1 -> v2: если `urlStats` для старого URL ещё не создан, первое новое сохранение теперь пересчитывает агрегат по всем существующим `entries`, а не создаёт статистику только из новой записи.
3. Исправлено периодическое мерцание журнала и сброс прокрутки: 3-секундная страховочная синхронизация теперь проверяет только `webclipJournalRevision`; IndexedDB/DOM обновляются лишь при фактическом изменении ревизии. `loadJournal()` больше не очищает список до завершения асинхронного чтения, а реальный refresh сохраняет позицию прокрутки и текущее JS-состояние пагинации/раскрытых групп.
4. Восстановлено объявление `PAGE_UPLOAD_STAGES`, из-за отсутствия которого ветка `Прочитать позже` падала с `ReferenceError` и зависала на экране подготовки/отправки PDF.
5. Для режима `Прочитать позже` отмена теперь вызывает полный `stopSelection(true)`: overlay, toolbar, modal и выделения закрываются вместо возврата к интерфейсу обычного режима `Прочитано`.
6. Кнопка `Прочитать позже` оформлена красным текстом на белом фоне с красной рамкой и размещена сразу под строкой версии.
7. URL каждой записи журнала сделан кликабельной ссылкой; сохранён серый цвет, подчёркивание отображается постоянно, включая visited/hover/focus.

## Выполненные проверки

- `node --check` — OK для `content.js`, `journal.js`, `offscreen.js`, `options.js`, `popup.js`, `service-worker.js`, `yandex-auth-help.js`.
- `manifest.json` — корректный JSON; версия остаётся `0.9.8`.
- Смоделирован upgrade существующего store `entries` DB v1 -> v2: существующий store переиспользуется, добавляются `urlKeyCreatedAt`, `siteKeyCreatedAt` и `urlStats` — OK.
- Проверен отдельный upgrade-edge-case `urlStats` при первом новом append после обновления — OK после исправления.
- Счётчик: все типы записей участвуют одинаково; повторные записи одного URL за один `localDayKey` дают один день; после исчезновения последней записи дня день исчезает; границы цветов <=24ч / <=30д / >30д — OK в VM-тестах.
- `Прочитать позже` / `Прочитано`: маршрутизация `ReadmeLater`/`Upload`, физический move-before-journal-update и сохранение `later` при ошибке move — OK на mocked Yandex API.
- Удаление Yandex-записи: поиск по старому path + fallback `resourceId`, move в `Trash/MM-YYYY` до удаления записи, fail без удаления, повторная ветка `keep`/delete-only — OK на mocked Yandex API.
- Комментарий к файлу: пустой не добавляет строку в PDF header; непустой добавляет `Комментарий` — OK в DOM-independent тесте `prepareForPrint`.
- `fileComment` и `journalComment` сохраняются/нормализуются при export/import; локальный `later` принудительно нормализуется в `read` — OK.
- Полный title передаётся в журнал; ограничение 100 символов применяется к имени PDF — OK.
- Журнал: первичный reading filter, фильтр домена, сортировка, группировка нормализованного URL, порядок внутри групп, пагинация 20 по записям/группам — OK в VM-тестах чистой логики.
- `Весь журнал`: режим `all` по-прежнему не передаёт source URL в фильтры выборки; при наличии исходной web-вкладки сохраняется только session `contextId` для последующего переключения на URL/site — regression 0.9.7 сохраняется.
- Открытие новых вкладок проходит через `createTabNextTo`; helper ставит `index = source.index + 1` в том же окне — OK в VM-тесте; прямых `chrome.tabs.create` вне helper нет.
- Регрессия журнала «мерцание/scroll reset»: удалён периодический вызов полного `loadJournal()` каждые 3 секунды; таймер выполняет только revision-check, начальный `entriesEl.replaceChildren()` перед async-read отсутствует, после реального render восстанавливается `scrollX/scrollY` — OK по статическому поведенческому тесту и `node --check`.

## Что блокирует релизный QA

Системный Chromium среды управляется политикой `/etc/chromium/policies/managed/000_policy_merge.json`, где установлено `ExtensionInstallBlocklist: ["*"]`. При попытке загрузить WIP как unpacked extension Chromium показывает `Loading of unpacked extensions is disabled by the administrator`. Другого Chrome/Chromium/Chrome for Testing в среде нет; установка Playwright Chromium невозможна из-за отсутствия сетевого доступа.

Поэтому не выполнены обязательные реальные проверки из `TEST_STATUS.md`: установка unpacked extension, фактический Chrome PDF/download/UI, реальный IndexedDB upgrade в браузере, реальные move/upload/delete на Яндекс Диске и визуальный UI E2E.

## Release gate

До выполнения этих реальных сценариев **не делать**:

- bump manifest на `0.9.9`;
- синхронизацию README/project_docs как для выпущенной 0.9.9;
- сборку `WebClip_Project_Recovery_v0_9_9.zip`;
- сборку/выдачу `webclip_pdf_prototype_v0_9_9.zip` как релиза.

## 2026-08-23 — Read Later UI isolation

- User confirmed that `Прочитать позже` successfully completes saving after the `PAGE_UPLOAD_STAGES` fix.
- Fixed a UI regression where the manual-selection toolbar (`Основной контент`, `Найти рекламу`, journals, Включены/Исключены, Clear, Cancel, Done) was shown during `Прочитать позже`.
- `read-later` no longer calls the common `ensureSelecting()` path. It now starts an isolated automatic flow with the selection toolbar/layers hidden and without manual-selection page listeners.
- If automatic main-content detection fails, WebClip shows a dedicated error dialog and does not fall back to the `Прочитано` manual-selection UI.
- Static regression checks and `node --check` passed. Headed Playwright re-run was attempted through Xvfb but the browser harness timed out in this environment; user-side visual confirmation is still useful for this exact UI change.
## 2026-08-23 — Popup primary modes UI

- `Прочитать позже` moved down so it is directly above `Прочитано — начать выделение`.
- Both primary actions are grouped into a dedicated `Основные режимы работы` visual block.
- All enabled popup buttons now underline their text on hover; existing button colors/backgrounds remain unchanged.


## 2026-08-23 — непрерывный progress UI во время Page.printToPDF

Исправлена регрессия, при которой progress-модалка страницы визуально исчезала на несколько секунд во время формирования PDF и затем появлялась снова перед сетевыми этапами Яндекс Диска.

Причина: `service-worker.js` отправлял `WEBCLIP_PRINT_RENDER_STATE hidden:true` на всё время выполнения `Page.printToPDF`, поэтому extension host реально скрывался на экране пользователя.

Исправление:
- service worker больше не скрывает extension host на всю длительность `Page.printToPDF`;
- `content.js` скрывает WebClip UI только синхронно в `beforeprint` и восстанавливает в `afterprint`;
- старый `WEBCLIP_PRINT_RENDER_STATE` оставлен только как backward-compatible fallback;
- progress UI по-прежнему не попадает в PDF.

Проверено в Chromium:
- `beforeprint` и `afterprint` отрабатывают внутри одного print-render до следующего `requestAnimationFrame`;
- следующий animation frame видит WebClip host уже восстановленным (`display:block`);
- `pdftotext` подтверждает отсутствие текста тестовой WebClip progress-модалки в сформированном PDF;
- `node --check content.js` и `node --check service-worker.js` проходят.


## 2026-08-23 — переключение видов журнала без потери исходного URL

Исправлена потеря source-context после открытия журнала в отдельной вкладке:
- `Весь журнал` теперь сохраняет `sourceTabId/sourceUrl` в `chrome.storage.session`, если журнал открыт с HTTP(S)-страницы; сам режим `all` эти значения не использует для фильтрации записей;
- внутри одной страницы журнала кнопки `Текущий URL`, `Текущий сайт`, `Весь журнал` могут переключаться без открытия новой web-вкладки;
- если popup WebClip открыт уже поверх `journal.html`, он восстанавливает исходный контекст по `contextId`, а не принимает extension-tab за исходную страницу;
- source context (`sourceTabId`) отделён от anchor tab (`anchorTabId`), поэтому внутренние вкладки продолжают открываться справа от текущей вкладки;
- при `chrome://newtab/` или другом не-HTTP(S) источнике `Весь журнал` остаётся доступен без source-context, а URL/site закономерно недоступны.

Проверено:
- `node --check popup.js service-worker.js journal.js` — OK;
- VM regression test точной функции `openJournalPage`: `mode=all` + HTTP(S) создаёт session context, но `journal.js` оставляет `filterUrl/filterSiteUrl` пустыми для `all` — OK;
- VM test popup-context: `journal.html?contextId=...` корректно восстанавливает исходный `sourceTabId/sourceUrl` — OK;
- placement regression: при отдельном `anchorTabId` новая вкладка создаётся с `index = anchor.index + 1` — OK.

## UI: единый блок «Журнал»

- В popup три перехода в журнал объединены в отдельный блок `Журнал`.
- Порядок и подписи: `Текущего URL` → `Текущего сайта` → `Полный`; кнопки расположены горизонтально.
- На `journal.html` переключатели режимов оформлены тем же блоком, с тем же порядком и подписями.
- Существующие ID (`journalCurrent/journalSite/journalAll`, `showCurrent/showSite/showAll`) сохранены, логика обработчиков не менялась.

## UI journal entry actions — 2026-08-23
- [x] `Открыть страницу`, `Перенести в «Прочитано»` (для ReadLater) и `Удалить запись` перенесены в верхнюю часть карточки записи.
- [x] В полном журнале группа действий находится справа от блока `Сайт`/`Домен` и всегда остаётся в одной горизонтальной строке; перенос кнопок на вторую строку запрещён, при критически узкой ширине строка может прокручиваться горизонтально.
- [x] `Применить Включены/Исключены` намеренно оставлена в нижнем блоке действий.
- [x] Обработчики кнопок не менялись, изменено только размещение DOM/CSS.

## UI regression: размещение действия «Включены/Исключены»
- `Применить Включены/Исключены` moved inside the collapsed `Области страницы Включены/Исключены` details section.
- The action is the first control in the expanded section, above locator lists «Включены/Исключены».
- While the details section is collapsed, the action is not visible.
- Existing enable/disable rules and `applyEntry(entry)` handler are unchanged.
- Static JS/manifest validation passed after the change.


## Journal entry comments — multiple comments + edit

- `Комментарий записи журнала` переведён с одного поля на массив `journalComments[]`; каждый комментарий хранит `id`, `text`, `createdAt`, `updatedAt`.
- Старое одиночное поле `journalComment` не теряется: при чтении/первом редактировании оно автоматически представляется как legacy-комментарий и затем мигрирует в `journalComments[]`.
- Если комментариев нет, textarea и `Сохранить комментарий` по умолчанию не отображаются; доступна только `Добавить комментарий к записи журнала`.
- При нажатии `Добавить комментарий к записи журнала` открывается блок ввода, сама кнопка добавления скрывается до сохранения/отмены.
- Если комментарии есть, они показываются сразу при открытии журнала с датой; для каждого доступна отдельная кнопка `Редактировать`.
- Редактирование открывает именно выбранный комментарий и сохраняет его без создания дубликата; дата изменения отображается отдельно от даты создания.
- Export/backup нормализует legacy-комментарии в `journalComments[]`; import принимает как новый массив, так и старое `journalComment`.
- Добавлены отдельные runtime message handlers `WEBCLIP_JOURNAL_ADD_COMMENT` и `WEBCLIP_JOURNAL_EDIT_COMMENT`; старый `WEBCLIP_JOURNAL_UPDATE_COMMENT` оставлен как backward-compatible путь.
- `node --check` для `journal.js` и `service-worker.js` проходит.

## UI regression: top journal actions never wrap

- `Открыть страницу`, `Перенести в «Прочитано»`, `Удалить запись` имеют `flex-wrap: nowrap` и всегда остаются горизонтально.
- Родительская строка `Сайт/Домен + действия` также не переносится; при недостаточной ширине допускается горизонтальный overflow вместо переноса кнопок на следующую строку.

## 2026-08-23 — soft-delete комментариев записи журнала

- Для каждого активного комментария добавлена кнопка `Удалить` рядом с `Редактировать`.
- Удаление физически не удаляет текст: в `journalComments[]` сохраняется исходный комментарий и проставляется `deletedAt`.
- Удалённый комментарий отображается как свернутый `details` с меткой `Удалён` и датой удаления.
- После раскрытия удалённый текст можно прочитать; кнопок редактирования, восстановления или повторного удаления нет.
- Service worker отдельно запрещает редактирование уже удалённого комментария, поэтому запрет действует не только на уровне UI.
- `deletedAt` сохраняется при нормализации, export/backup и import; старые комментарии без этого поля считаются активными.
- Backward-compatible `WEBCLIP_JOURNAL_UPDATE_COMMENT` выбирает только неудалённый комментарий; если активных комментариев нет, создаёт новый.
- Тест фактических функций `normalize/add/edit/deleteJournalComment`, извлечённых из текущего `service-worker.js`, проходит: soft-delete сохраняет текст, выставляет `deletedAt`, повторное удаление и редактирование отклоняются.

## 2026-08-23 — подтверждение и дата `Прочитать позже` → `Прочитано`

- Перед запуском физического переноса файла теперь показывается отдельное подтверждение с кнопками `Отмена` и `Подтвердить`.
- `Отмена` закрывает подтверждение до установки `moveReadBusy` и до отправки `WEBCLIP_JOURNAL_MARK_READ`; progress переноса не запускается.
- После успешного подтверждённого Yandex move service worker обновляет запись только после проверки файла в `Upload` и записывает `movedToReadAt = Date.now()` вместе со сменой `readingMode` на `read`.
- При ошибке move запись остаётся `later`, `movedToReadAt` не создаётся.
- В карточке журнала дата показывается только для Yandex-записи, реально переведённой из `Прочитать позже`, в той же служебной строке справа от `Режим выгрузки: Яндекс Диск · Статус чтения: Прочитано`.
- Для изначально сохранённых как `Прочитано` дата перевода не выводится.
- `movedToReadAt` сохраняется при export/import; новые записи получают `movedToReadAt: 0`.
- Mocked integration test фактической `moveReadLaterEntryToRead()` из текущего `service-worker.js`: успешный move выставляет `readingMode=read`, `movedToReadAt>0` и путь `Upload`; ошибка move не вызывает обновление записи — OK.

## 2026-08-24 — скрытие пустого «Комментарий к файлу»

- Блок `Комментарий к файлу` в карточке журнала теперь создаётся только если `entry.fileComment` после `trim()` содержит текст.
- Для отсутствующего, пустого или состоящего только из пробелов `fileComment` блок вообще не добавляется в DOM; заглушка `—` больше не выводится.
- Для непустого комментария прежний текст и оформление блока сохранены.
- `node --check` для всех JS и JSON-проверка manifest проходят.

## 2026-08-24 — подписи контекста и счётчики режимов журнала

- В информационном блоке журнала `URL` переименован в `Текущий URL`, `Домен журнала` — в `Текущий домен`.
- Отдельная строка `Записей: N` из информационного блока удалена.
- Кнопки режимов журнала показывают количество записей в круглых скобках: `Текущего URL (N)`, `Текущего сайта (N)`, `Полный (N)`.
- Счётчики отражают общее количество записей соответствующего режима, а не количество на текущей странице пагинации.
- Первичный фильтр `Все / Прочитано / Прочитать позже` применяется и к этим трём счётчикам.
- Для legacy-записей без `urlKey/siteKey` счётчики используют fallback из сохранённого URL/hostname.

## 2026-08-24 — bounded Yandex delete/search + operation logs (current WIP)

Статус: **WIP, не релиз**. `manifest.json` остаётся `0.9.8` до реального Chrome/Yandex release QA.

### Исправление зависания удаления Yandex

- `findYandexFileForJournalEntry()` продолжает сначала проверять сохранённый `remotePath`, а при его устаревании ищет по `resourceId`/`publicUrl` через `/resources/files` с ограниченным набором полей.
- Общий budget поиска актуального файла — 45 секунд; отдельный API request ограничен оставшимся budget и максимум 15 секундами.
- Подбор свободного имени в `Trash/MM-YYYY` дополнительно ограничен 30 секундами.
- Подбор свободного имени при ReadLater -> Read (`Upload`) ограничен 45 секундами.
- Базовый `yandexApi()` имеет AbortController timeout (default 25 сек, максимум 120 сек); signed upload/download также имеют отдельные bounded timeouts. OAuth token exchange теперь тоже ограничен 25 секундами.
- При timeout/error Yandex ветка завершается до `deleteJournalEntryRecordOnly()`: локальная запись не удаляется.
- В delete UI после ошибки остаются действия `Повторить` и, для ветки Trash, `Удалить только запись журнала`.

### Диагностические operation logs

- Логи хранятся локально в IndexedDB `WebClipOperationLogs`; default retention 24 часа, настройка — целое число часов 1..8760, cleanup alarm — раз в час.
- Для операции сохраняются `operationId`, type/title/status, metadata и последовательный timeline событий/stages.
- Yandex API/signed-transfer events содержат endpoint/method, sanitized query/URL, timeout, duration, HTTP status, response summary и `retryAttempt` для повторных verify-запросов; ручной cached-upload retry помечается как retry operation.
- Redaction закрывает OAuth/access/refresh/manual token, Authorization, Client Secret, OAuth/verification code, code verifier, generic token fields, signatures/signed secrets и query signed URL. Authorization header никогда не добавляется в log payload.
- В настройках добавлены: retention hours, список последних операций, фильтр/получение по точному `operationId` (Enter делает прямой GET даже если операция не попала в первые 500 списка), просмотр JSON, копирование ID, экспорт одного JSON-лога и ручная очистка логов.
- Экспорт конкретного лога сохраняет полный retained timeline; defense-in-depth redaction применяется повторно без обрезки массива events до 100 элементов.
- Видимый/копируемый `operationId` добавлен в progress UI local/Yandex PDF, delete/Trash, ReadLater->Read, Yandex backup; в журнале есть постоянная строка `Последний operationId` для быстрых операций export/import/clear и завершённых modal-операций.
- Покрыты operation logs: local PDF, cached local PDF, Yandex `Прочитано`, Yandex `Прочитать позже`, ручной retry Yandex upload, ReadLater->Read, individual delete/Trash/keep, journal clear, export/import file, Yandex backup export и Yandex backup restore. Отмена restore после скачивания/валидации закрывает лог статусом `canceled`.

### UI badges

- `.entry-badges` изменён на `flex-wrap: nowrap`; badges `Яндекс Диск` и `Прочитано/Прочитать позже` не переносятся друг под друга. На критически узкой ширине контейнер допускает горизонтальный overflow вместо wrap.

### Проверки этого изменения

- `node --check` — OK для всех 7 JS-файлов.
- `git diff --check` — OK.
- `manifest.json` — корректный JSON, version `0.9.8`.
- JS -> HTML ID integrity для `journal`/`options` — OK; duplicate ID не найдено.
- Все прямые `fetch()` в `service-worker.js`, относящиеся к Yandex API/OAuth/signed transfer, используют AbortController signal.
- Redaction self-test с тестовыми access/OAuth token, Authorization, client secret, verification code, signed secret и signed URL query — PASS, секретная строка в JSON не остаётся.
- Operation-log export self-test на 150 событиях — PASS: экспортировано 150/150 events, secret metadata redacted, URL query redacted.
- Yandex API timeout self-test с никогда не отвечающим mocked fetch — PASS: request прерывается AbortController, возвращается `YANDEX_TIMEOUT`, timeout event записан, OAuth token в event payload отсутствует.
- Locate self-test: stale stored path -> 404 -> paged `/resources/files` -> match by `resourceId` — PASS.
- Delete fail-safe self-test: mocked Yandex timeout до move/verify -> local `deleteJournalEntryRecordOnly()` не вызывается — PASS.
- Статическая проверка error UI delete: `Повторить`, `Удалить только запись журнала` и явный текст `Запись журнала не удалена` присутствуют — PASS.

### Не проверено здесь (release gate остаётся закрытым)

- Реальная загрузка unpacked extension в Chrome/Chromium этой среды: блокируется managed policy `/etc/chromium/policies/managed/000_policy_merge.json` (`ExtensionInstallBlocklist: ["*"]`).
- Реальный Yandex move/delete/upload/download, реальные HTTP timeout/retry условия, визуальный E2E progress/options/journal.
- Поэтому manifest **не** повышен до 0.9.9 и release/recovery ZIP 0.9.9 **не** собираются как релиз.

## WIP checkpoint — locate fallback / log UI / background logs

- Journal delete locate now checks deterministic WebClip paths before `/resources/files`: stored folder, `Upload`, `ReadmeLater`, and recent `Trash` candidates.
- Global Yandex fallback uses pages of 200 files, one explicit timeout retry, and the existing 45-second overall locate deadline; `retryAllowed` in Yandex log entries now reflects actual retry behavior.
- Operation logs now contain a human-readable `description` that distinguishes user-triggered and background operations.
- Scheduled operation-log cleanup is logged as a background operation; scheduled/retry journal-backup checks create background operation logs including skipped/decision outcomes and reuse the same operationId for an actual export.
- Log detail UI can collapse/expand the JSON and copy the entire displayed log to clipboard with one button.
- Operation-log retention button text changed to `Как записать настройки хранения` per requested UI wording.
- Manifest remains `0.9.8`; real Chrome/Yandex release QA is still required before version bump.


## Audit checkpoint 2026-08-24 — second deep pass

- `P0-021`: OAuth access token session-only; persistent storage mode removed; legacy local token migrates to `storage.session` and is deleted from `storage.local`.
- `P0-034`: unused Yandex `refresh_token` is no longer persisted.
- `P0-035`: WebClipJournal schema raised to v3 with transactional `meta/revision`; append/update/delete/clear/import touch revision in the same IDB transaction; chunked export detects concurrent journal mutations reliably.
- `P1-017`: full journal export/backup uses 1 MiB staging chunks in `WebClipOffscreenTransfers`, 50 MiB total bound, and no full journal array/JSON string in the service worker.
- `P1-029`: offscreen idle-close protocol includes cancel/recovery if `closeDocument()` fails after idle confirmation.
- `P1-030`: local/Yandex import uses IndexedDB staging keys instead of passing parsed full backup objects across runtime messaging; staging cleanup exists for success/cancel/error/TTL.
- `P1-031`: full `urlStats` rebuild uses a cursor instead of a full journal array.
- New remaining audit items: `P1-032` (full-journal UI materialization), `P1-033` (large Base64 cross-context Blob creation).
- Static check after these changes: all extension JS pass `node --check`; manifest parses and remains `0.9.8`.
- Real Chrome/Yandex regression remains blocked in this environment by managed Chromium extension-install policy and is not claimed as passed.


## Audit checkpoint 2026-08-24 — late IDB / journal recovery / ReadLater recovery

- `P0-038`: bounded IndexedDB open hardened against late `onupgradeneeded` after timeout/blocked. Implemented in service worker, offscreen, journal import/view open paths.
- `P0-039`: journal append now has an idempotent pending checkpoint before write; failed metadata write is visible as partial success and is retried by hourly background maintenance.
- `P1-037`: ReadLater→Read writes a recovery checkpoint before Yandex move and preserves target/source/error state until local journal finalization succeeds.
- `P1-030` corrected to `PARTIAL`: staging removed cross-context copies, but full JSON parse/normalization and one large atomic IndexedDB replace transaction remain memory-heavy.
- `P1-038` opened: key-based PDF Blob creation removed runtime Base64 copying but offscreen still has a Base64 + decoded Blob peak for very large PDFs.
- Static JS syntax check passed after this checkpoint. Real Chrome/Yandex regression remains required.

## Audit checkpoint 2026-08-24 — local-download intent / journal UI memory / staged export

- `P0-040` — Yandex paths canonicalized before managed-root boundary checks (`.`/`..` traversal removed).
- `P0-041` — journal recovery queue is in the same IndexedDB transactional domain as journal clear/import.
- `P0-042` — Abort/network/stream failures while reading external JSON body are no longer converted into an empty JSON object.
- `P0-043` strengthened: local Chrome download now writes a durable `intent:*` record **before** `chrome.downloads.download()`, binds the resulting `downloadId` afterward, and can recover an unbound intent by exact blob URL/recent download search. A completed local download keeps its pending metadata if the journal write failed before a separate journal recovery checkpoint was guaranteed.
- `P0-044` opened: successful Yandex file save still needs an equally durable remote-save metadata state machine for the rare double failure `journal checkpoint + journal append`.
- `P0-045` opened: Incognito persistence policy is not explicit; journal/operation-log metadata must not silently become a persistent browsing trace when the extension is enabled in Incognito.
- `P1-032` moved to `PARTIAL`: journal list state now stores lightweight summaries, full records are fetched only for the current page, and URL groups load 20 records at a time on expansion. Residual risk is the in-memory set of up to 100000 summaries used for exact counts/domain/group aggregation.
- `P1-041`: export staging chunks are stored as IndexedDB `Blob` records rather than UTF-16 strings; offscreen supports both new Blob chunks and legacy string chunks.
- `P1-042`: import preview validates only envelope/schema/version/count. Full entry normalization is deferred until confirmed replace.
- `P1-043` opened: global IndexedDB/quota budget across journal/cache/staging/logs still needs explicit policy and health telemetry.
- `P1-044`: post-move verify for Trash and ReadLater→Upload now has a 45-second overall deadline in addition to per-request timeouts.
- Static check after this checkpoint: all extension JS pass `node --check`; `manifest.json` parses and remains version `0.9.8`.
- Real Chrome/Yandex regression remains required before any `DONE`/release status.

## Audit checkpoint 2026-08-24 — remote-save durability / incognito / backup lease / quota

- `P0-044`: Journal IndexedDB поднят до v6; добавлен `pendingRemoteSaves`. Yandex PDF получает stable journal id и durable checkpoint до transfer; `remote-verified` может быть дофинализирован background maintenance.
- `P0-045`: WebClip не сохраняет и не раскрывает Journal/PDF data из Incognito; incognito content commands блокируются до persistent side effects.
- `P0-046`: backup lease перенесён в атомарную транзакцию Journal `meta`; устранена get/set/get race manual vs background backup.
- `P1-015`: operation-log QuotaExceeded делает cleanup собственных логов + один retry.
- `P1-038`: new PDF cache = Blob-v3; legacy Base64 bounded/chunk-decoded only.
- `P1-043`: large-write storage preflight uses `navigator.storage.estimate()` and disposable cleanup; Journal не удаляется автоматически. Статус PARTIAL до health/UI/persist decision.
- `P1-045`: remote recovery bounded: <=6 checkpoints, <=120s per maintenance pass.
- Real Chrome/Yandex regression remains blocked in managed Chromium environment; manifest remains 0.9.8.


### Audit continuation — PSL / offscreen Blob budget / operation-log efficiency

- `P1-002`: bundled `public-suffix.js` подключён к service worker и journal; старые hardcoded compound suffix списки удалены. `project_tools/test_public_suffix.js` проверяет exact/private/wildcard/exception/IDN rules. Статус `REGRESSION`; нужен реальный journal/domain/Yandex-folder regression.
- `P1-054`: offscreen Blob URL ограничены максимум 12 активными объектами и 256 МБ суммарного размера; освобождение уменьшает счётчик и сохраняет idle-close. Статус `REGRESSION`.
- `P1-055`: подтверждён O(n²) write amplification operation logs из-за перезаписи всей записи с `events[]` на каждый event. Зафиксировано `AUDIT`; требуется event/chunk store.
- `P1-056`: удалён тяжёлый cleanup из `listOperationLogs()`; retention/size cleanup остаётся по alarm, настройкам и quota-retry. Статус `REGRESSION`.


## Audit checkpoint 2026-08-24 — late Chrome API races / storage health / OAuth cleanup / event ownership

- Manifest intentionally remains `0.9.8`; audit/release gate is still open.
- `P0-057`: legacy `storage.local` Yandex token cleanup is awaited and fail-closed; migration/write share the same cleanup helper.
- `P1-043`: storage health UI implemented in Options (`usage/quota/free/reserve`, `persisted()`); explicit `navigator.storage.persist()` requires user action and does not add `unlimitedStorage` or any new permission. Advanced per-store telemetry remains `P2-008`.
- `P1-065`: late `offscreen.closeDocument()` no longer permits recreate-before-settlement race.
- `P1-066`: debugger attach/detach late completion is reconciled; conflicting retries are blocked until actual settlement.
- `P1-067`: Blob-backed downloads use a 15-minute service-worker deadline with cancel-before-revoke and a 16-minute offscreen fallback lifetime.
- `P1-068`: non-idempotent Blob URL creation RPCs disable unknown transport retry.
- `P1-069`: signed offscreen transfer deadline now bounds its IndexedDB prep/finalization transactions, not only network fetch.
- `P1-070`: context-menu full-journal file export hands operation ownership to `journal.html?autoExportFile=1` instead of a long fire-and-forget event callback.
- `P1-071`: first semantic chunk validation failure aborts the remaining offscreen readonly transaction so queued reads do not retain payload parts after failure.
- OperationLog v1→v2 deterministic migration test now verifies first-append migration + second append without duplicate legacy events.

Local tests added/passed at this checkpoint:

- `project_tools/test_operation_log_v1_v2.js`
- `project_tools/test_late_chrome_api_races.js`
- `project_tools/test_offscreen_idb_deadline.js`
- `project_tools/test_yandex_legacy_token_cleanup.js`
- `project_tools/test_storage_health_policy.js`
- `project_tools/test_context_menu_export_owner.js`
- existing `project_tools/test_public_suffix.js`

Not claimed as passed: unpacked-extension Chrome UI regression, real Chrome download/offscreen/debugger timing, real Yandex OAuth/API/upload/move/backup, or visual Options/Journal E2E. Those remain release QA requirements before any `0.9.9` manifest bump.

## Runtime delta checkpoint — P1-132…P1-136 / P2-011 (2026-08-24)

Physical runtime recovery exposed only the P1-071-era snapshot, while later conversation history reserves P0-058…062/P1-072…131/P2-009…010. New identifiers were therefore allocated from the reserved history boundary and implemented as a mergeable delta, without reconstructing the missing canonical WIP. Static gate: 18 JS syntax checks PASS, 10/10 available deterministic tests PASS, manifest JSON PASS, manifest remains 0.9.8. Audit and real release QA remain open.


## Runtime delta checkpoint P1-137…P1-141 / P2-012…P2-013 — 2026-08-24

Recovery-gap applies: this mounted artifact is not the canonical physical P1-131 WIP. New identifiers remain mergeable delta only.

- P1-137: options folder navigation generation fence + active-load guard.
- P1-138: bounded read-only extension-page runtime RPC.
- P1-139: single-flight Yandex backup month listing.
- P1-140: Yandex picker DOM rendering batches of 250; no whole-list selection scan.
- P1-141: dedupe and max-4 budget for unresolved timed-out read-only RPC.
- P2-012: OperationLog list/detail/selection race fencing.
- P2-013: Options async init/event failures surfaced instead of unhandled rejection.
- Static gate on mounted artifact + delta: 29 JS syntax checks PASS; 21/21 deterministic tests PASS; manifest version remains 0.9.8.
- Real Chrome/Yandex E2E not performed; audit gate OPEN.

## 2026-08-24 — P0-014 manual backup blocking UX closure

`P0-014` переведён из `UX` в `REGRESSION`. В обоих ручных путях (`journal.html` и `options.html`) progress modal остаётся открытым на протяжении backup и получает реальные стадии service worker: `read-journal → serialize → yandex-access → month-folder → upload-url → upload → verify`. Пока операция активна, Close скрыт и disabled, underlying `main.page` переведён в `inert`, фон страницы не прокручивается, фокус переводится в modal, а `beforeunload` включает доступную Chrome защиту от случайного закрытия/перезагрузки вкладки. После success/error Close становится доступен; при закрытии modal `inert` снимается и фокус возвращается на исходный элемент.

Локальный regression: `node project_tools/test_p0_014_backup_progress_ux.js` — PASS. Реальный Chrome/Yandex E2E остаётся обязательным release QA; статус `DONE` до него не заявляется.



## P1-030 closure checkpoint — streaming import

- `P1-030` status changed `PARTIAL → REGRESSION`.
- Local file staging no longer calls `File.text()`; 1 MiB `Blob` chunks are stored in `WebClipOffscreenTransfers`.
- Yandex journal download no longer calls `response.text()`/bounded whole-text join; offscreen streams response bytes directly into the same chunked staging format with a 50 MiB cap.
- Added bundled `journal-import-stream.js`: incremental JSON parser validates the envelope across arbitrary chunk boundaries, enforces total/entry/string/depth/container limits, and yields entries one by one.
- Preview streams/counts only; confirmed import materializes one bounded entry at a time and stages normalized entries into new `WebClipJournal.importStaging`.
- `WebClipJournal` schema is now v7. Final replace is one atomic transaction across `entries`, `meta`, pending stores and `importStaging`; timeout/abort preserves the old Journal.
- Inline full-object runtime import is disabled to prevent bypass of the streaming boundary.
- Added TTL cleanup for orphaned normalized import staging.
- Regression: `project_tools/test_p1_030_streaming_import.js`.
- Manifest intentionally remains `0.9.8`; real Chrome/Yandex release QA is still required.

## Audit checkpoint 2026-08-24 — P1-032 bounded Full Journal closure

- `P1-032` moved from `PARTIAL` to `REGRESSION` in WIP; this is **not** release/DONE status.
- Removed the all-journal `currentEntries` array and legacy `WEBCLIP_JOURNAL_VIEW_SCAN` path that could materialize up to 100000 lightweight summaries.
- Non-group list uses a bounded cursor query: exact total is counted while at most 20 summaries are retained; only those 20 full records are fetched for rendering.
- URL grouping streams the `urlKeyCreatedAt` index, retains only 20 group aggregates for the requested keyset page, and loads group children in batches of 20 without an all-child ID array.
- Domain filter uses streaming aggregation with fixed retained budgets of 500 base domains and 1500 child domains; overflow is explicit and searchable instead of silently materializing the entire domain tree.
- Re-audit bounded direct get-many with a 20 s IDB abort deadline and all read-only service-worker fallbacks with a 25 s runtime deadline; expanded domain/group keys are pruned to the current bounded view.
- Final merged local gate after P1-032: `node --check` 40/40 PASS; deterministic tests 31/31 PASS; manifest JSON PASS; Manifest V3; version `0.9.8`; previous recovery `ReturnAsStream` marker remains present.
- Journal-view cursor operations have a 20-second deadline and generation fencing remains in place.
- Added `project_tools/test_p1_032_bounded_journal_view.js`: synthetic 100000-domain aggregation and 10000 URL-group selection stay inside fixed retained budgets; next-page boundary ordering is checked deterministically.
- `manifest.json` remains `0.9.8`. Real Chrome large-journal interaction/memory regression remains required before release QA can close the gate.


## Audit checkpoint 2026-08-24 — P1-145 OperationLog latest-wins closure

- `P1-145` reconciled into the canonical working registry as `REGRESSION`; P1-138…P1-141 conflict is unchanged and P1-142…P1-144 remain reserved/pending reconciliation.
- OperationLog detail admission allows at most one actually unresolved `WEBCLIP_OPERATION_LOG_GET` plus one latest queued selection.
- A newer queued selection supersedes the older queued selection before start, so the superseded selection does not allocate an underlying runtime RPC.
- The existing 30-second UI deadline remains for user feedback, but timeout is not treated as cancellation: the active slot is released only after the underlying `chrome.runtime.sendMessage` actually settles.
- Generation fencing still prevents stale late detail data from becoming the selected/export target.
- Added `project_tools/test_p1_145_operation_log_latest_wins.js`, covering A→B→C latest-wins and local-timeout/actual-settlement serialization.
- Final local gate after P1-145: `node --check` 41/41 PASS; deterministic tests 32/32 PASS; manifest JSON PASS; Manifest V3; version `0.9.8`.
- Real Chrome/Yandex release QA is still required; audit gate remains OPEN.

## Audit checkpoint P1-146 — 2026-08-25

- `P1-146 = REGRESSION`: automatic `chrome.downloads.download({saveAs:false})` start uses a 15-second caller deadline separated from actual Chrome settlement; timeout preserves durable intent/Blob and never auto-retries; late success/reject reconciled; unresolved starts capped at four.
- Dedicated deterministic regression PASS: `project_tools/test_p1_146_download_start_settlement.js`.
- Full local gate after P1-146: `node --check` **52/52 PASS**; deterministic tests **42/42 PASS**; manifest JSON/MV3 PASS; version **0.9.8**.
- Managed Chromium P1-007 rerun PASS: Chromium `144.0.7559.96`, selected-only PDF **35,885 bytes**, Journal PASS, Yandex mock PASS.
- This remains WIP audit evidence, not real unpacked Chrome/Yandex release QA.

## Audit checkpoint P1-001 / P0-003 — 2026-08-25

- `P1-001 = REGRESSION`: new `SelectionSnapshot v3` stores bounded contextual fingerprints and uses scored restore. Structural paths are evidence only; accepted matches expose high/medium confidence; close strong competitors are ambiguity and fail closed. v1/v2 remain on a legacy compatibility path.
- Journal diagnostics surface confidence/ambiguity/missing counts; service-worker sanitizer preserves v3 under the existing aggregate selection budget.
- P1-001 browser regression reproduced an existing P0-003 same-origin iframe defect: top-realm `instanceof Element` rejected iframe-realm DOM elements. Fixed under `P0-003` with realm-neutral `nodeType === 1`; no new P-code assigned.
- New regressions PASS: `test_p1_001_resilient_selection.js`, `test_p0_003_iframe_cross_realm.js`, `browser_p1_001_selection_restore.py`.
- Full local gate after closure: `node --check` **54/54 PASS**; deterministic tests **44/44 PASS**; manifest JSON/MV3 PASS; version **0.9.8**.
- Final-package rerun exposed only a regression-harness timing flake in existing P1-117…P1-122 coverage; fixed by replacing synthetic 40/55 ms late-settlement timing with explicit deferred settlement. Corrected harness **60/60 stress PASS**; production runtime unchanged and no new P-code assigned.
- Managed Chromium P1-007 rerun PASS on `144.0.7559.96`: selected-only PDF **36,000 bytes**, Journal PASS, Yandex mock PASS.
- Real unpacked Chrome/Yandex release QA remains OPEN; no `0.9.9` manifest bump is claimed.

## Audit checkpoint P1-003 — 2026-08-25

- `P1-003 = REGRESSION`: before PDF, included DOM resources receive bounded preparation: common lazy image attrs are temporarily promoted with rollback, CSS backgrounds use renderer-side `Image`, and used fonts use `Document.fonts.load/check`; no extension-level `fetch()`/response-byte read is introduced.
- Boundaries: 15 s common deadline, 500 resource tasks, concurrency 8, 5000 scanned elements, per-item wait ≤5 s, bounded URL/srcset/CSS/font scalars and ≤40 persisted failures.
- `resourceReport` strips HTTP(S) query/hash, makes `data:`/`blob:` opaque, persists through local/remote durable save metadata and Journal JSON import/export, and is visible in PDF header + Journal + OperationLog.
- `project_tools/browser_p1_003_resource_prefetch.py` PASS on Chromium `144.0.7559.96`: 5 attempted / 2 loaded / 3 failed in synthetic fixture, sensitive query redaction PASS, temporary lazy attrs rollback PASS.
- Full local gate after P1-003: `node --check` **55/55 PASS**; deterministic tests **45/45 PASS**; P1-001 browser regression PASS; managed P1-007 browser integration PASS with selected-only PDF **37,600 bytes**; manifest JSON/MV3 PASS; version **0.9.8**.
- This is audit/browser closure, not real unpacked Chrome + real Yandex release QA.

### P1-004 browser regression

- `test_p1_004_cross_origin_iframe.js` PASS.
- `browser_p1_004_cross_origin_iframe.py` PASS on Chromium `144.0.7559.96`: SOP-blocked opaque-origin iframe, remote «Включены»=1, v3 outer `framePath` length=1, restore=1, prepare/restore print PASS, outer iframe expanded to 944 px for long document.
- Post-change regressions: P1-001 PASS; P1-003 PASS (`5 attempted / 2 loaded / 3 failed`); P1-007 managed integration PASS, selected-only PDF 37,499 bytes, Journal/Yandex mocks PASS.
- Real unpacked MV3 + real Chrome optional-host permission prompt is still release QA because enterprise policy blocks that test environment.
- Manifest remains `0.9.8`; do not publish WIP as `0.9.9`.

## P1-008 — user settings portability (2026-08-25)

- Status: **REGRESSION**.
- Schema: `webclip-user-settings` v1; 8 allowlisted user values only.
- Security: OAuth/PKCE/session credentials are neither exported nor written by import; import runtime commands are extension-page only.
- Bounds: Options file <=256 KiB; strict schema/types/unknown/secret-field validation.
- Integrity: one bundled `chrome.storage.local.set` carries settings + durable reconciliation marker; local timeout is surfaced as unknown settlement and is not retried automatically.
- Recovery: late success / MV3 worker start reconciles backup scheduler and removes marker.
- Local gate after implementation: 58/58 JavaScript syntax PASS; 47/47 deterministic tests PASS; Chromium P1-008 Options regression PASS; P1-007 managed integration PASS with selected-only PDF 37,501 bytes, Journal PASS, mocked Yandex worker PASS.
- Manifest remains MV3 / `0.9.8`. Full unpacked Chrome + real Yandex remains release QA.


## P1-009 — universal multiline Journal filter (2026-08-25)

- `P1-009 = REGRESSION`.
- Production UI: до 8 строк, 512 chars/query, `Наименование` default ON; `Комментарии`, `Сайт`, `URL`; AND default / OR optional.
- Shared `journal-text-filter.js` используется journal direct-IDB path и service-worker fallback.
- Filter predicate выполняется до mode counters/domain aggregation, page totals/offset и URL-group aggregation; full Journal не materialize'ится.
- `test_p1_009_universal_filter.js`: PASS, включая all fields, AND/OR, bounds и chunk-boundary substring.
- `browser_p1_009_journal_filter.py`: PASS на Chromium 144.0.7559.96; initial 25 rows, 20 on page 1, filtered title result correctly returns 2 rows including one originally beyond first page; comments/site/url and AND/OR PASS.
- Full gate: JavaScript syntax **60/60 PASS**; deterministic `project_tools/test_*.js` **48/48 PASS**.
- Browser regressions after P1-009: P1-001 PASS; P1-003 PASS; P1-004 PASS; P1-008 PASS; managed P1-007 PASS with selected-only PDF **37,692 bytes**, Journal PASS and mocked Yandex worker PASS.
- Manifest JSON remains Manifest V3 / version `0.9.8`. Full unpacked Chrome + real Yandex remains release QA. No handoff archive created.


## P1-025 — Yandex destination badge opens saved file (2026-08-25)

- `P1-025 = REGRESSION`.
- Standalone `Открыть сохранённый файл на Яндекс Диске` link removed from Journal card metadata.
- Yandex destination badge is a real button but keeps existing badge dimensions/colors; valid `disk.yandex.ru`/subdomain or `yadi.sk` HTTPS URL enables it.
- Missing/HTTP/malformed/non-Yandex `publicUrl` leaves badge visible but disabled with title + aria-label explanation.
- Click sends only `journalEntryId` via `WEBCLIP_OPEN_JOURNAL_SAVED_FILE`; P0-037 service-worker re-read/URL validation remains authoritative.
- Local destination badge remains a non-action span. Destructive Journal+Yandex flow unchanged.
- `test_p1_025_yandex_badge.js`: PASS.
- `browser_p1_025_yandex_badge.py`: PASS on Chromium 144.0.7559.96, including clickable valid badge, disabled unavailable badge, standalone-link absence and local non-action badge.
- Full gate: JavaScript syntax **61/61 PASS**; deterministic `project_tools/test_*.js` **49/49 PASS**.
- Browser regressions after P1-025: P1-009 PASS; managed P1-007 PASS with selected-only PDF **37,604 bytes**, Journal PASS and mocked Yandex worker PASS.
- Manifest remains Manifest V3 / `0.9.8`. Full unpacked Chrome + real Yandex remains release QA. No handoff archive created.

## P1-026 — Russian selection terminology
- [x] Journal card no longer renders the duplicate `Сохранено областей: N · Исключено: N` row.
- [x] Selection details summary is `Области страницы Включены/Исключены (N/M)` and keeps the only visible pair of counts in the card.
- [x] Selection toolbar uses `Включены: N · Исключены: M`.
- [x] Journal/history/progress/help/manifest user-facing strings use `Включены`/`Исключены`; internal `includes/excludes` compatibility fields are unchanged.
- [x] `test_p1_026_russian_selection_terms.js` PASS.
- [x] `browser_p1_026_russian_selection_terms.py` PASS on Chromium 144.0.7559.96.
- [x] P1-025, P1-009 and managed P1-007 browser regressions PASS; selected-only PDF 37,604 bytes.

## P1-027 — destination/read-status badges without duplicate mode row
- [x] Journal card no longer renders `Режим выгрузки: ... · Статус чтения: ...`.
- [x] Yandex entries keep `Яндекс Диск` + reading badge; P1-025 action semantics are unchanged.
- [x] Local `destination=download` entries render informational `Скачан локально` + reading badge.
- [x] `Скачан локально` uses neutral gray styling and remains non-clickable.
- [x] Destination + reading badges remain in one `flex-wrap: nowrap` group.
- [x] `test_p1_027_destination_badges.js` PASS.
- [x] `browser_p1_027_destination_badges.py` PASS on Chromium 144.0.7559.96.
- [x] Full gate: 63/63 JS syntax, 51/51 deterministic; P1-025/P1-026/P1-009 and managed P1-007 browser regressions PASS; selected-only PDF 37,604 bytes.
- [x] Manifest remains MV3 / 0.9.8; no handoff archive created.



## P1-028 — badge placement regression (2026-08-25)
- [x] Destination/read-status badges removed from the old upper-right `entry-head` sibling.
- [x] Badges render under title in the same row as date/time; date left, badges right.
- [x] Existing badge dimensions preserved against pre-change Chromium baseline.
- [x] Narrow-width layout has no date/badge overlap; date uses ellipsis and badge group remains nowrap/fixed-size.
- [x] Yandex badge remains a button and local `Скачан локально` remains a non-action span.
- [x] `test_p1_028_badge_placement.js` PASS.
- [x] `browser_p1_028_badge_placement.py` PASS on Chromium 144.0.7559.96.
- [x] Full gate: 64/64 JS syntax; 52/52 deterministic.
- [x] P1-027/P1-025/P1-009 browser regressions PASS.
- [x] Managed P1-007 integration PASS; selected-only PDF 37,602 bytes, Journal PASS, mocked Yandex worker PASS.
- [x] Manifest remains MV3 / 0.9.8. Full unpacked Chrome + real Yandex remains release QA.
- [x] No handoff archive created.

- P1-090 identity regression: account/root mismatch fail-before-lookup; resourceId rejects path-only/conflict; exact publicUrl secondary only when resource_id absent; legacy path compatibility — PASS.
- P1-074 import staging deadline regression: file-page open/write + worker read/delete hung-IDB abort/deadline paths — PASS.
- Current post P1-090/P1-074 gate: 66/66 JS syntax, 54/54 deterministic; Chromium P1-009 + managed P1-007 PASS; selected-only PDF 37,604 bytes; manifest 0.9.8/MV3.

## P1-079 / P1-080 — page-owned native Save As (2026-08-25)

- [x] Full Journal worker path stops before native dialog and returns prepared Blob metadata to `journal.html`.
- [x] OperationLog worker path stops before native dialog and returns prepared Blob metadata to `options.html`.
- [x] `service-worker.js` has no `saveAs:true` call-site after closure.
- [x] Shared `prepared-save-as.js` owns exactly one `chrome.downloads.download({saveAs:true})` call with no caller timeout/Promise.race/retry.
- [x] Reject/cancel releases prepared Blob; success arms page terminal cleanup and worker secondary watchdog.
- [x] Journal prepare/settlement restricted to `journal.html`; OperationLog prepare restricted to `options.html`; foreign Blob URLs fail before Chrome side effects.
- [x] `test_p1_079_080_save_as_owner.js` PASS.
- [x] `browser_p1_079_080_save_as_owner.py` PASS on Chromium 144.0.7559.96, including a 250 ms pending-dialog simulation with exactly one call and no release/retry.
- [x] Full gate: 68/68 JS syntax; 55/55 deterministic.
- [x] P1-008 Options, P1-009 Journal and managed P1-007 browser regressions PASS; selected-only PDF 37,604 bytes.
- [x] Manifest remains MV3 / 0.9.8. Real unpacked Chrome native Save As remains release QA.
- [x] P1-129 durable prepared-session late-settlement serialization is not claimed here.

## 2026-08-25 — P1-081 / P1-084: bounded ordinary IDB CRUD

- P1-081: обычные OperationLog v2 mutate/append/list/get/clear переведены на общий abortable transaction helper с отдельным deadline 20 с; append-only timeline и v1→v2 migration сохранены.
- P1-084: обычные PDF retry-cache put/get/meta-repair/delete переведены на тот же completion-aware helper с отдельным deadline 20 с; `pdfs`+`meta` остаются атомарной парой, TTL/URL binding не изменены.
- Maintenance cleanup сохраняет свой deadline domain; offscreen retry-cache reads уже имели independent bounded deadline и не менялись.
- Добавлен deterministic regression `project_tools/test_p1_081_084_idb_deadlines.js`, включая hung transaction abort и запрет readonly publication до `tx.oncomplete`.
- Manifest намеренно остаётся `0.9.8`; это не release QA.

## 2026-08-25 — P1-085 / P1-124

- P1-085: direct Journal readonly IDB get-many/meta/page/group/group-entry paths keep explicit deadline+abort and `tx.oncomplete` result publication; timeout/error uses the existing bounded SW fallback. Defensive early completion edges were removed.
- P1-124: `tabs.create()` has a 10 s local deadline with actual-settlement tracking; same request while unresolved reuses the pending promise and late success is retained for one bounded retry receipt instead of creating a duplicate tab.
- Dedicated deterministic regressions: `test_p1_085_journal_direct_read_deadline.js`, `test_p1_124_tab_create_late_settlement.js`.
- Manifest remains `0.9.8`; real unpacked Chrome tab-creation timing remains release regression QA.

## 2026-08-25 — P1-125 / P1-126

- P1-125: оба service-worker `scripting.executeScript()` пути используют bounded actual-settlement helper. Unknown local timeout держит request barrier; identical retry не reinject'ит, late success возвращается один раз, navigation очищает stale receipt/pending state. Script singleton guards сохранены.
- P1-126: все пять service-worker `tabs.get()` мест сведены к `getChromeTabBounded()` (5 с); низкоуровневый `chrome.tabs.get()` остался ровно в одном helper.
- Dedicated regressions: `test_p1_125_execute_script_settlement.js`, `test_p1_126_tabs_get_deadlines.js`.
- Manifest остаётся `0.9.8`; реальные Chrome timing/navigation races остаются release regression QA.

## 2026-08-25 — P1-128 / P1-129

- P1-128: offscreen idle-close request bounded 10 с; raw runtime message single-flight до actual settlement; timeout/reject/`closed:false` reschedule future cleanup.
- P1-129: Full Journal и OperationLog prepared Save As фиксируют durable session checkpoint до передачи Blob странице; STARTED/RELEASE проходят actual-settlement barrier, RELEASED хранится отдельным tombstone. Native `saveAs:true` по-прежнему page-owned без timeout/retry.
- Dedicated regressions: `test_p1_128_offscreen_idle_close_request.js`, `test_p1_129_prepared_save_as_checkpoint.js`.
- Manifest остаётся `0.9.8`; real unpacked Chrome Save As/offscreen lifecycle остаются release regression QA.

## 2026-08-25 — P1-130 / P1-131

- P1-130: Chrome Action mutations bounded 5 s, generation-fenced per tab, global actual-promise pending cap 64, late/stale settlement schedules latest-state repair.
- P1-131: raw debugger attach/detach promises remain in global PDF pending budget through actual settlement; different-tab PDF starts are blocked after local timeout until Chrome settles the original side effect.
- Dedicated regressions: `test_p1_130_action_deadline_fencing.js`, `test_p1_131_debugger_global_pending_budget.js`.
- Manifest remains `0.9.8`; real unpacked Chrome Action/debugger timing remains release regression QA.
