# Архитектура WebClip PDF Prototype 0.9.8

## 1. Runtime-компоненты

### `popup.*`
Главная точка входа: запуск выделения, журналы URL/сайта/весь журнал, настройки, инструкция. Также показывает версию и состояние фонового backup: отдельно последнюю успешную и последнюю неудачную фоновую попытку.

### `content.js`
Page UI и selection engine. Модель состоит из двух независимых внутренних наборов `state.includes` и `state.excludes`, показываемых пользователю как «Включены» и «Исключены». Поддерживает same-origin `iframe/frame`: listeners ставятся во все доступные документы, локаторы содержат `framePath`, а геометрия переводится в координаты верхнего окна. «Основной контент» сравнивает кандидаты во всех доступных документах.

P1-004 добавляет отдельный `frame-agent.js` для cross-origin iframe. Он не используется в top frame и немедленно завершается в same-origin child frame, чтобы не дублировать P0-003 listeners. Manifest объявляет `optional_host_permissions` для HTTP(S), но они не выдаются при установке: popup сначала получает bounded список inaccessible iframe origins текущей страницы, затем только по пользовательскому действию вызывает `chrome.permissions.request`. Service worker принимает frame-agent только при `sender.frameId > 0`, проверяет действующий host permission и `documentId` и хранит bounded in-memory registry. Этот registry не переживает MV3 worker restart: текущая архитектурная граница P1-203/P1-171/P1-200 требует явного re-handshake/reconcile-or-cleanup с точной child-document/permission/session generation; автоматическое self-healing через одну лишь reinjection не считается доказанной гарантией.

Top content script не получает прямой DOM cross-origin frame. Он сопоставляет browser-frame с DOM `<iframe>` по exact normalized URL, а при redirect — только если origin-кандидат единственный. Несколько кандидатов дают ambiguity/fail-closed. Remote agent хранит свои внутренние `includes/excludes`, отдаёт bounded `SelectionSnapshot v3`; top добавляет к локатору frame prefix. Перед PDF agent устанавливает print-only CSS, bounded прогревает выбранные изображения и сообщает высоту документа; top временно расширяет внешний iframe и включает его frame chain. После print WebClip очищает только те стили/temporary attrs, которыми всё ещё владеет текущая print-generation: rollback выполняется compare-before-restore/по private receipt и не должен перезаписывать более новое состояние host page.

Во время PDF WebClip формирует печатное представление выбранного контента: добавляет информационную шапку, безопасно нормализует ссылки/изображения и готовит frame-chain. Disclosure-контент раскрывается только если это можно сделать без выполнения произвольного page-owned поведения; synthetic click/submit/navigation/business logic ради печати не разрешены (P0-067/P1-212). Временные DOM-изменения принадлежат конкретной print-generation и снимаются только compare-before-restore/по точному generated-node receipt, чтобы stale cleanup не затирал более новые изменения страницы (P1-218…P1-224).


### Независимый контекст страницы журнала (0.9.7)

Action popup не создаёт `journal.html` напрямую. Он передаёт команду service worker, который создаёт extension-tab. Контекст исходной вкладки (`tabId`, URL) хранится кратковременно в `chrome.storage.session` под случайным `contextId`; в URL журнала попадает только `mode` и `contextId`. Поэтому полный журнал не наследует и не использует origin активного сайта. Обычные представления Journal используют bounded/paged/streamed read-пути текущей реализации; параллельная материализация двух полных Journal-массивов не является текущей архитектурой. Публикуемый составной view обязан соответствовать одной доказанной Journal revision (P1-206).

### `service-worker.js`
Центральный orchestration layer:
- `Page.printToPDF` через `chrome.debugger`;
- локальные downloads;
- PDF retry cache IndexedDB;
- Яндекс OAuth/REST upload и публикация `public_url`;
- локальный Journal IndexedDB;
- экспорт/импорт полного журнала;
- background backup через `chrome.alarms`;
- tab-specific action icon/badge по истории точного URL;
- контекстное меню и маршрутизация команд в `content.js`.

### `journal.*`
Просмотр URL/site/all, иерархический фильтр `Все → base domain → third-level domain`, восстановление selection snapshot, ссылки на опубликованные Yandex PDF, удаление записи, экспорт/импорт, резервная копия Яндекс. Импорт с Диска листает месяцы `MM-YYYY` и показывает только файлы выбранного месяца. Опасные массовые операции используют визуальный dialog с случайным 9-значным кодом.

### `options.*`
OAuth, единственный `rootPath` Яндекс Диска, настройка создания постоянных `public_url`, интервалы background backup/retry в минутах, а также bounded экспорт/импорт пользовательских настроек P1-008.

### `offscreen.*`
Создание Blob URL для PDF/JSON, потому что service worker не является обычной DOM-страницей.

### User settings portability — P1-008

Options UI читает/пишет настройки только через privileged runtime-команды `WEBCLIP_USER_SETTINGS_EXPORT/IMPORT`. Service worker разрешает их только extension pages. Экспорт читает явный allowlist `storage.local` и формирует `webclip-user-settings` v1; `storage.session` и OAuth/PKCE keys не читаются.

Импорт ограничен 256 KiB, строго проверяет schema/types/unknown fields и secret-like keys. Восемь пользовательских значений записываются одним bundled `chrome.storage.local.set`: обновлённый `yandexConfig` с сохранением внутренних non-user fields, `operationLogSettings`, `webclipJournalGroupByUrl` и `webclipUserSettingsImportPending`. Marker находится в том же non-cancellable Chrome side effect. При caller timeout автоматический retry запрещён; late success либо следующий запуск MV3 worker выполняет `reconcileUserSettingsImportMarker()` и пересобирает backup scheduler, после чего marker удаляется. OAuth session storage при этом не изменяется.

## 2. Permissions

- `activeTab`, `scripting` — внедрение page UI;
- `downloads` — локальный PDF/JSON export;
- `debugger` — CDP `Page.printToPDF`;
- `offscreen` — Blob URL;
- `storage` — config/auth/background state;
- `alarms` — scheduled journal backup;
- `contextMenus` — доступ к основным действиям через контекстное меню;
- `tabs` — обновление tab-specific иконки/badge при навигации и открытие устойчивых ссылок Яндекс Диска;
- Yandex host permissions — REST/OAuth/upload.

## 3. Selection model

`SelectionSnapshot v3`:

```json
{
  "version": 3,
  "includes": [{
    "framePath": [],
    "cssPath": "...",
    "domPath": [],
    "tag": "...",
    "id": "...",
    "classes": [],
    "text": "...",
    "role": "...",
    "href": "...",
    "parentTag": "...",
    "parentId": "...",
    "parentRole": "...",
    "parentText": "...",
    "previousText": "...",
    "nextText": "...",
    "siblingIndex": 0,
    "sameTagIndex": 0
  }],
  "excludes": []
}
```

`framePath` — цепочка локаторов iframe от top document до document элемента. В v3 frame locators используют тот же bounded contextual fingerprint, что и обычный элемент.

P1-001 меняет семантику restore только для новых v3 snapshots. `id`, `cssPath` и `domPath` являются структурными evidence, но не безусловным ответом: среди не более 5000 same-tag candidates считается score по устойчивым атрибутам, тексту, parent/neighbor context и sibling indices. Best candidate с score ниже 34 не применяется. Если второй сильный кандидат имеет score не ниже 28 и отстаёт менее чем на 18 points, restore считается неоднозначным и fail-closed ничего не выбирает. Уверенный результат классифицируется как `high` (score ≥60 и margin ≥22) либо `medium`; эти счётчики вместе с ambiguity/missing возвращаются в Journal diagnostics.

Старые v1/v2 snapshots остаются читаемыми через отдельный legacy resolver и не переписываются задним числом в v3. Aggregate boundary для selection snapshot остаётся 2 MiB / максимум 250 locators на список; новые context fields дополнительно ограничены по длине в service-worker import/journal boundary.

### Bounded resource preparation before PDF (P1-003)

`content.js::prepareForPrint()` после раскрытия безопасных disclosure-блоков запускает `prefetchIncludedResources()` и только затем добавляет print header/styles. Resource preparation работает исключительно внутри выбранного DOM и его CSS:

- common lazy image attributes `data-src` / `data-srcset` временно копируются в `src` / `srcset`; `loading=lazy` временно меняется на `eager`;
- изменения атрибутов checkpointed per print-generation; `restoreAfterPrint()` восстанавливает старое значение только если текущее значение всё ещё соответствует WebClip-временной записи, иначе host-page mutation сохраняется;
- DOM images ожидаются по `load/error/complete/naturalWidth`;
- computed `background-image` URL прогреваются detached `Image` того же document/window realm;
- используемые font specs проверяются/загружаются через соответствующий `Document.fonts`;
- extension-level `fetch()` для P1-003 не используется: расширение не читает response bytes и не расширяет scope за пределы уже присутствующих DOM/CSS ресурсов.

Boundaries: общий deadline 15 s, максимум 500 resource tasks, concurrency 8, максимум 5000 scanned elements, per-item wait не более 5 s. URL/srcset/CSS/font scalars дополнительно bounded по длине. Failure report содержит не более 40 элементов. Persisted diagnostic labels удаляют query/hash; `data:`/`blob:` URL заменяются opaque labels.

`resourceReport` мутируется в save meta до `WEBCLIP_GENERATE_PDF` / `WEBCLIP_SEND_PDF_TO_YANDEX`, bounded повторно в service worker, сохраняется в durable local/remote checkpoints и Journal entry, участвует в import/export, выводится в PDF header и как отдельный `resource-prefetch` event в OperationLog. Ошибка отдельного ресурса не блокирует сам PDF; она делает diagnostics partial, но не отменяет успешное сохранение файла.

## 4. Яндекс Диск

Пользователь задаёт только `rootPath`.

```text
<root>/
  Upload/
    <site hierarchy>/
      <PDF>
  Backup/
    Journal/
      MM-YYYY/
        WebClip_Journal_YYYY-MM-DD_HH-MM-SS-SSS.json
```

Перед PDF upload проверяется/создаётся `Upload`, затем site hierarchy. Перед journal backup проверяется/создаётся `Backup/Journal` и месячная папка `MM-YYYY`. Каждый backup создаётся как новый файл с `overwrite=false`; старые версии не удаляются.

Импорт открывается на текущем месяце и запрашивает только конкретную папку `Journal/MM-YYYY`; пользователь может листать месяцы назад/вперёд. UI требует явного выбора файла. Только после скачивания и проверки выбранной версии запускается 9-значное подтверждение replace локального журнала.

При обычном PDF upload, если `createPublicLinks=true`, после загрузки вызывается публикация ресурса и его `public_url` сохраняется в journal entry. Это отделяет ссылку журнала от сохранённого пути/имени файла. Публикация означает доступ по ссылке для её обладателя.

Ручной backup использует progress channel `chrome.runtime.connect`: service worker отправляет этапы операции в открытые extension pages. Journal/Options показывают блокирующий progress dialog и устанавливают `beforeunload` на время активной операции.

Обычная отправка страницы на Яндекс Диск использует page progress через сообщения service worker → content script. Progress UI остаётся видимым на сетевых этапах; непосредственно на время `Page.printToPDF` служебный root кратковременно скрывается, чтобы не попасть в PDF.

## 5. Journal

Source of truth — IndexedDB `WebClipJournal`, store `entries`. Яндекс Диск не является рабочим журналом.

Запись Yandex-upload дополнительно хранит `publicUrl`. Для индикатора панели используется `urlKey` и `localDayKey`: цвет определяется возрастом последней полностью успешной записи `destination=yandex` точного URL, badge — числом уникальных локальных дней только с такими Yandex-выгрузками. Локальные записи `destination=download` видны в журнале, но на индикатор не влияют.

JSON export содержит schema metadata и **все entries** с selection snapshots и `publicUrl`; import выполняет replace полного локального журнала после 9-значного UI confirmation.

### Bounded full-journal export (`P1-073`)

Формирование полного JSON snapshot использует единый абсолютный `buildDeadline` (5 минут), который не переинициализируется между стадиями и при единственном retry после изменения journal revision. Остаток deadline пересчитывается после каждого `IndexedDB.open` и перед следующей transaction для revision reads, cursor batch reads, temporary chunk/manifest writes и cleanup незавершённого staging.

### Bounded Journal import staging (`P1-074`)

Локальный `File` staging в `journal.html` не полагается на естественное завершение IndexedDB: open имеет 10-секундный deadline с закрытием late-open DB, chunk/manifest write transaction — 60 секунд с `abort()`. Service worker читает каждый manifest/chunk через `getTransferImportRecord()` с максимум 20 секунд на transaction и `JOURNAL_IMPORT_STAGING_TIMEOUT`; cleanup временной группы также bounded/abortable. Нормализация в `WebClipJournal.importStaging` использует 30-секундные abortable write/delete transactions, а чтение Blob chunk ограничено оставшимся parse deadline. Atomic replace старого Journal выполняется отдельно и timeout не превращается в partial commit.

### Bounded maintenance cleanup (`P1-075`)

Фоновое обслуживание не полагается на естественное завершение IndexedDB cleanup-транзакций. OperationLog retention/size cleanup, transfer payload TTL cleanup, PDF retry-cache TTL cleanup, stale remote-save checkpoint cleanup и expired Journal import staging используют общий abortable transaction helper с 20-секундным пределом. По timeout транзакция принудительно abort-ится и stage завершается ошибкой; `runLoggedOperationLogCleanup()` изолирует ошибку через `runStage`, записывает `maintenanceErrors` и продолжает journal/remote/local recovery и stats repair. Readonly cleanup scan возвращает накопленный результат только после `tx.oncomplete`, а не на последнем cursor callback.

### Bounded backup lease (`P1-076`)

Эксклюзивный backup lease остаётся authority в Journal IndexedDB `meta`. Acquire, renew и release выполняют read/check/write (или delete) внутри одной `readwrite` transaction, поэтому atomicity не заменяется storage compare-after-write. Каждая lease transaction ограничена `JOURNAL_BACKUP_LEASE_TX_TIMEOUT_MS = 20_000` через общий abortable helper. Acquire fail-closed возвращает `JOURNAL_BACKUP_BUSY` при действующем чужом lease; renew требует совпадения token и возвращает `JOURNAL_BACKUP_LEASE_LOST` при потере ownership; release удаляет запись только при совпадении token. Hung transaction abort-ится и не может держать backup path бесконечно.

### Durable alarm boundary для background backup (`P1-077`)

Runtime/settings request не владеет жизненным циклом тяжёлого backup. `saveJournalBackupSettings()` после serialized config mutation только вызывает scheduler. Если backup due, scheduler создаёт near-term one-shot `chrome.alarms` boundary; фактический `runDueJournalBackup()` вызывается только из `chrome.alarms.onAlarm` для periodic/retry alarm. Это исключает fire-and-forget long task из `runtime.onMessage`, который MV3 service worker мог потерять после отправки response/закрытия event lifetime.


### Bounded durable recovery checkpoints (`P1-082`)

`pendingAppends`, `pendingRemoteSaves` и `pendingDownloads` входят в тот же `WebClipJournal` authority domain, но их обычный CRUD больше не может держать MV3 worker бесконечно при зависшей IndexedDB transaction. Create/read/update/delete/list, local-download reconciliation scan и IDB-стадия legacy pending migration используют `runIndexedDbTransactionBounded(..., RECOVERY_IDB_TX_TIMEOUT_MS)` с пределом 20 секунд. Timeout принудительно abort-ит transaction и возвращает `WEBCLIP_IDB_TIMEOUT`; readonly result становится видимым вызывающему коду только после `tx.oncomplete`.

Data-integrity atomicity не разбита ради deadline. Journal append, пришедший из `pendingDownloads`/`pendingRemoteSaves`, повторно проверяет исходный durable checkpoint и записывает `entries` в одной bounded `readwrite` transaction. Destructive clear также остаётся одной bounded transaction над `entries`, `meta` и всеми тремя pending stores, поэтому timeout abort-ит операцию целиком вместо частичной очистки.

### Bounded ordinary Journal CRUD (`P1-083`)

Обычные Journal append/list/get/get-many/update/delete/clear и point-операции `urlStats` выполняются через общий abortable helper с `JOURNAL_CRUD_IDB_TX_TIMEOUT_MS = 20_000`. Readonly helper не публикует накопленный результат на `request.onsuccess`; Promise завершается только после успешного transaction commit/completion.

Длинные специализированные scans сохраняют собственные более подходящие budgets: full `urlStats` rebuild имеет общий лимит 5 минут и abort timer 20 секунд на каждую clear/read/merge transaction; P1-032 cursor/index Full Journal queries в service worker и прямые reads в `journal.js` ограничены `JOURNAL_VIEW_QUERY_DEADLINE_MS` и abort-ят transaction по timeout. Export/import deadlines остаются владельцами своих уже закрытых P-кодов (`P1-073`, `P1-030`/import hardening), а не переопределяются P1-083.


### Readonly transaction completion boundary (`P1-086`)

Readonly IndexedDB request success не считается durable/complete boundary. Для Journal export revision используется `runIndexedDbTransactionBounded`, который только запоминает `setResult()` и публикует его после `tx.oncomplete`. `readJournalEntryBatch()` при достижении cursor/end/memory boundary сохраняет `pendingResult`, прекращает `cursor.continue()` и ждёт `tx.oncomplete`; `request.onsuccess` не resolve-ит Promise. Timeout/error abort-ит transaction и не может вернуть накопленный, но не подтверждённый transaction-completion результат.

### Chrome download ownership during recovery (`P1-087`)

Durable local-download recovery не доверяет filename/size/time/Blob URL как authority сами по себе. Каждый `DownloadItem`, рассматриваемый для intent fallback или уже привязанного `downloadId`, сначала проходит fail-closed ownership gate `byExtensionId === chrome.runtime.id`. Только после этого разрешено сопоставление Blob URL либо консервативного filename+exact-size fallback. Чужая загрузка с совпадающими признаками не может быть привязана к pending checkpoint и не создаёт Journal entry.

## 6. Background backup

Settings в `chrome.storage.local.yandexConfig`:
- `journalBackupEnabled`;
- `journalBackupIntervalMinutes` (default 1440);
- `journalBackupRetryMinutes` (default 60).

State в `journalBackupState` хранит общие timestamps и отдельные `lastBackgroundSuccessAt`, `lastBackgroundFailureAt`, `lastBackgroundError`.

Алгоритм:
1. one-shot periodic alarm планируется относительно последнего успешного backup;
2. при старте service worker выполняется lightweight overdue-check/reconstruction scheduler;
3. если срок пропущен и alarm отсутствует, scheduler ставит ближайший durable alarm вместо запуска тяжёлого backup из startup/runtime chain;
4. фактический background attempt выполняется из periodic/retry alarm handler с учётом retry backoff;
5. failure фиксируется и создаёт retry alarm через заданное число минут; success очищает retry alarm и планирует следующий normal interval.

## 7. Context menu

`chrome.contextMenus` сначала создаёт самостоятельный top-level пункт `Начать выделение WebClipper`, затем root `WebClipper`. Оба page entry points проходят через тот же `WEBCLIP_COMMAND/start` и существующие functions `content.js`; отдельной альтернативной selection/save логики нет. Journal/settings actions открывают соответствующие extension pages.

## 8. Recovery build

Каждая версия включает `project_recovery/WebClip_Project_Recovery_vX_Y_Z.zip`, создаваемый после обновления runtime и project docs.


## Журнал: live-update и UI доменов (0.9.4)

После commit операции записи/удаления/очистки/импорта service worker рассылает `WEBCLIP_JOURNAL_CHANGED`. Открытая `journal.html` debounce-перечитывает IndexedDB через существующий message API. Это исключает зависимость интерфейса от повторного открытия вкладки.

Иерархия доменного фильтра строится только для режима `Весь журнал`: базовые домены сортируются по времени новейшей записи, вложенные домены — так же. Состояние ручного раскрытия хранится только в памяти страницы журнала; при новом открытии все узлы снова закрыты. Поиск фильтрует дерево без изменения данных журнала.

## Журнал: устойчивость extension-context (0.9.7)

`WEBCLIP_JOURNAL_CHANGED` остаётся быстрым runtime-сигналом. Дополнительно service worker изменяет `chrome.storage.local.webclipJournalRevision`; journal-page слушает `chrome.storage.onChanged`, а также обновляется при focus/visibility/pageshow. При смене `manifest.version` service worker перезагружает уже открытые extension-pages, потому что Chrome инвалидирует их старый JavaScript-контекст после reload/update распакованного расширения.


### Source-context переключения видов журнала (WIP 0.9.9)

Начальный `mode` и source-context разделены. `mode=all` никогда не передаёт `sourceUrl` в фильтры IndexedDB/service-worker, поэтому полный журнал остаётся глобальным. Если запуск произошёл с HTTP(S)-вкладки, service worker всё же создаёт session `contextId` со snapshot `sourceTabId/sourceUrl`; он нужен только для последующего перехода на `current/site`. Для открытия новой внутренней вкладки отдельно передаётся `anchorTabId`, чтобы правило «справа от текущей вкладки» не конфликтовало с исходной web-вкладкой, используемой как фильтр.

**P1-094 retention boundary.** Session source-context не является бессрочным журналом посещённых URL. `sourceUrl` ограничен 8192 символами, `contextId` — 180 символами, запись действительна не более 24 часов, а одновременно сохраняется максимум 512 `webclipJournalContext:*`. Writer сериализует create/prune и перед каждой новой записью удаляет expired/future-dated и overflow context, удерживая при сканировании только bounded набор из 511 newest survivors; остальные `chrome.storage.session` keys не затрагиваются. Journal/popup повторно проверяют TTL/размер при чтении legacy state. Контекст намеренно не удаляется после первого чтения: это нужно для подтверждённого пользовательского сценария переключения между `all/current/site` в уже открытой journal-tab.

## Journal read path (0.9.7)

`service-worker.js` remains the writer/owner of journal mutations and Yandex Disk operations. `journal.html`/`journal.js` reads the persistent `WebClipJournal` IndexedDB store directly for display. This removes source-tab/runtime-message state from the read path. Current URL/site/domain filters are applied in the journal page after/directly while reading the same IndexedDB store. Runtime/storage notifications plus a visible-page 3-second safety refresh trigger re-read; IndexedDB remains the single source of truth.

**P1-009 text-filter layer.** `journal-text-filter.js` — общий pure matcher, загружаемый `journal.html` и service worker. UI нормализует максимум 8 непустых строк по 512 символов; каждое условие имеет field mask `title/comments/site/url` и общую логику AND/OR. Direct IndexedDB path и runtime fallback передают одну и ту же bounded filter structure. Matcher выполняется непосредственно на `cursor.value` до mode counters/domain aggregates, page offset/total и URL-group counts. Комментарии сканируются из текущей записи cursor без materialization полного журнала; большие строки сравниваются chunked-поиском, чтобы не создавать вторую lowercase-копию всего комментария.

## Journal delete + WebClip Trash (0.9.8)

Служебная структура Яндекс Диска дополнена:

```text
<root>/
  Upload/
  Backup/
    Journal/
      MM-YYYY/
  Trash/
    MM-YYYY/
      <moved PDF>
```

`Trash` — обычная папка приложения, а не Yandex Disk system trash.

Алгоритм удаления Yandex journal entry:
1. service worker читает entry по `id` из `WebClipJournal`;
2. при `diskAction=trash` определяет актуальный файл: сначала `remotePath`, затем при необходимости flat resource search по `resourceId`/`publicUrl`;
3. создаёт `<root>/Trash/MM-YYYY` по локальной дате удаления;
4. выполняет `POST /resources/move` с `overwrite=false` и проверяет наличие целевого файла;
5. только после успешной проверки удаляет journal entry;
6. при любой ошибке удалённой части journal entry остаётся источником информации для повторной попытки.

Новые Yandex entries содержат identity/locator context `accountUid`, `rootPath`, `resourceId`, `publicUrl`, `remotePath`. Перед destructive locate сохранённые account/root сверяются с текущими и mismatch fail-closed. При известном `resourceId` path-only кандидат не принимается; exact `publicUrl` служит secondary identity только когда candidate не вернул `resource_id`, но не перекрывает конфликтующий ID. JSON export/import сохраняет поля; legacy entries без новых полей остаются совместимыми. Shared delete→Trash последовательность не изменена.

## Audit hardening: durable local downloads and bounded journal UI (2026-08-24)

### Local Chrome downloads

Local PDF download is modeled as a durable state transition instead of assuming that a returned `downloadId` means a saved file:

1. PDF Blob URL is prepared.
2. A `pendingDownloads` record with key `intent:<operationId>` is committed to `WebClipJournal` **before** `chrome.downloads.download()`.
3. After Chrome returns a numeric `downloadId`, the intent is replaced by the bound numeric record in one IndexedDB transaction.
4. `downloads.onChanged` or hourly maintenance finalizes the journal entry only for state `complete`; `interrupted` removes the pending record without creating journal metadata.
5. If the MV3 worker stops between steps 2 and 3, maintenance searches recent DownloadItems and binds the intent primarily by exact persisted blob URL.
6. If the journal append fails before its own recovery checkpoint is guaranteed, the already-confirmed `pendingDownloads` record remains as a second durable copy instead of being deleted.

### Journal list memory

`P1-032` is implemented as a bounded cursor/index/aggregate view. The journal page no longer owns an all-journal `currentEntries` array and the legacy materializing `WEBCLIP_JOURNAL_VIEW_SCAN` RPC is removed. Exact mode/reading totals are calculated by a streaming `createdAt` cursor without retaining rows. A non-group page keeps at most 20 lightweight summaries, then fetches only those 20 full records (including selection snapshots/comments). URL grouping streams the `urlKeyCreatedAt` index one URL at a time, retains only the best 20 groups after the current keyset boundary, and loads expanded group children in batches of 20 without retaining every child id. The domain tree is a streaming aggregate with a fixed retained budget of 500 base domains and 1500 third-level children; counts for retained rows and the global entry count are exact, while overflow is surfaced explicitly and the user can narrow domain search. All journal view cursor/get-many operations have a 20-second abort deadline; read-only runtime fallbacks have a 25-second deadline and a bounded in-flight pool. Expanded domain/group key sets are pruned to the currently retained model/page. This bounds retained memory independently of a 100k-entry journal while preserving exact list/group totals and pagination semantics.

### Chunked export staging

New journal export chunks are stored in `WebClipOffscreenTransfers` as `Blob` values rather than UTF-16 strings. The offscreen document builds the final download/upload Blob from Blob parts. Legacy staging records with `text` remain readable.

### Audit durability additions (2026-08-24)

- `WebClipJournal` schema v7 retains `pendingRemoteSaves` and adds `importStaging` for pre-side-effect Yandex save checkpoints. A checkpoint progresses `prepared → remote-verified → journal appended/removed`; clear/import cancels it in the same DB domain.
- Journal `meta` is the authority for the exclusive backup lease; acquire/renew/release are IndexedDB transactions, not storage.local compare-after-write.
- Incognito is a hard privacy boundary: persistent Journal/PDF/operation-log workflows are not exposed to an Incognito content context.
- Large temporary writes perform storage-budget preflight; disposable staging/cache/log data yields space before functional Journal data.



### Audit durability/security checkpoint — P0-049…053 / P1-051…053

- Journal append sourced from `pendingDownloads` or `pendingRemoteSaves` re-validates the source checkpoint inside the same IndexedDB transaction as the entry write. A concurrent clear/import therefore cancels the stale append instead of resurrecting data.
- `urlStats` dirty state is a bounded multi-token state in `storage.local`; individual successful mutations remove only their token. Full rebuild clears the state only when no newer marker revision appeared during the rebuild.
- Content-script opening of a saved Yandex file is same-site scoped; extension pages remain the privileged journal UI.
- **P1-025 Journal destination action:** `journal.js` не открывает сохранённый `publicUrl` напрямую. Yandex destination badge выполняет только extension RPC `WEBCLIP_OPEN_JOURNAL_SAVED_FILE` с bounded journal entry id. UI использует консервативную HTTPS/Yandex-host проверку лишь для disabled/enabled состояния; authority остаётся в service worker, который по P0-037 заново читает journal entry, нормализует `publicUrl`, проверяет Yandex allowlist и только затем создаёт вкладку. Отдельного DOM-link с `publicUrl` нет.
- Offscreen signed Yandex transfers reject redirects rather than following them with a PDF/backup request body.
- Ordinary Yandex API calls and OAuth token exchange also reject HTTP redirects so Authorization headers and OAuth code/PKCE verifier are never automatically forwarded.
- Chunked journal export enforces both character and UTF-8 byte limits at producer and offscreen consumer.
- Prepared backup recovery uses a conservative multi-404 grace window before deciding that an upload produced no file.
- Full journal snapshot construction has a 5-minute overall deadline and bounded IndexedDB batch reads, keeping it below the backup lease budget.


## Public Suffix resolver (0.9.9 WIP)

`public-suffix.js` — generated bundled snapshot официального Public Suffix List. Он загружается service worker через `importScripts()` и journal page до `journal.js`. Resolver `WebClipPublicSuffix.hierarchy()` является единым источником `publicSuffix/base/third` для `siteKey`, доменных фильтров и структуры папок Яндекс Диска. Runtime network request к publicsuffix.org отсутствует. Snapshot обновляется через `project_tools/build_public_suffix_js.py`; regression — `project_tools/test_public_suffix.js`.


## Operation log storage v2

`WebClipOperationLogs` version 2 separates the small operation header (`operations`) from append-only timeline rows (`events`, key `[operationId, seq]`). New events are appended independently, avoiding O(n²) rewrites of the accumulated timeline. `WEBCLIP_OPERATION_LOG_GET`, copy and JSON export reconstruct the bounded historical `events[]` view. Legacy v1 embedded events are migrated lazily on first append; retention/clear remove both header and timeline rows in one IndexedDB transaction.

`P1-145` adds a UI-side latest-wins admission queue for OperationLog detail reads. The Options page permits at most one actually unresolved detail runtime RPC and retains only the latest not-yet-started selection. Replacing a queued selection resolves it locally without sending `WEBCLIP_OPERATION_LOG_GET`. The 30-second UI deadline is not treated as cancellation: the active slot remains occupied until the underlying `chrome.runtime.sendMessage` settles, preventing several multi-MB detail responses from accumulating after local timeouts. Generation fencing remains authoritative for late active responses, so stale detail data cannot become the selected/export target.


## Audit invariants — late Chrome API settlement, storage health and event ownership

- **Non-cancellable Chrome API side effects:** a local `Promise.race` timeout is not treated as cancellation. `chrome.offscreen.closeDocument()` remains tracked until its real settlement, and a replacement offscreen cannot be created while a late close is pending. `chrome.debugger.attach/detach` use the same reconciliation principle: retries are blocked until the previous transition actually settles; a late successful attach is detached.
- **Blob-backed downloads:** automatic PDF downloads remain service-worker-owned; native `saveAs:true` exports are page-owned by `journal.html` / `options.html` (P1-079/P1-080). Blob URLs are released on terminal `complete/interrupted` through page cleanup plus the worker watchdog; otherwise the worker 15-minute deadline performs state check + best-effort cancel before revoke. Offscreen keeps a 16-minute fallback TTL if both owners disappear. Count/byte budgets remain 12 URLs / 256 MiB.
- **Automatic download start settlement (P1-146):** `chrome.downloads.download()` for automatic PDF saves (`saveAs:false`) is treated as a non-cancellable side effect. A 15-second caller deadline does not delete the prewritten `pendingDownloads` intent, revoke its Blob URL or start a retry. The underlying promise remains tracked to actual settlement: late success binds the same intent to `downloadId`; late rejection alone performs intent/Blob cleanup. At most four actually unresolved starts are kept in the worker admission budget. Native `saveAs:true` is intentionally separate: the visible extension page owns the uncapped user-dialog wait and never retries it after an unknown/pending settlement.
- **Native Save As ownership (P1-079/P1-080):** the worker prepares only bounded Blob URL + filename metadata. `journal.html` owns Full Journal `chrome.downloads.download({saveAs:true})`; `options.html` owns OperationLog JSON `Save As`. There is no caller timeout/`Promise.race` around the native dialog. Cancel/rejection releases the prepared Blob without retry; successful start arms terminal cleanup. Durable prepared-session mutation/late-settlement serialization remains the separate history-reserved P1-129 scope.
- **Offscreen signed transfer deadline:** the same transfer budget now covers pre/post-network IndexedDB work. PDF cache reads, transfer payload/chunk reads and downloaded-text writes have bounded open/transaction phases and abort hung transactions instead of allowing heartbeat to run forever after the intended deadline. Chunked reads also abort the transaction on the first semantic validation failure, so queued reads cannot keep retaining payload parts after failure.
- **Non-idempotent offscreen RPC:** Blob URL creation RPCs are never automatically repeated after an unknown transport/response-channel failure. Explicit `OFFSCREEN_CLOSING` is safe to retry because no side effect was accepted.
- **Storage health:** large-write preflight remains in the worker. Options exposes a read-only quota/free/reserve report and `StorageManager.persisted()` status. `StorageManager.persist()` is invoked only from the user-visible extension page after explicit user action; `unlimitedStorage` is intentionally not added. Expanded per-store telemetry remains `P2-008`.
- **OAuth legacy cleanup:** session-only auth is fail-closed with respect to old persistent tokens. If a `storage.local` legacy token exists, deletion is awaited before a session token is considered usable; cleanup failure is surfaced instead of silently continuing with a durable secret.
- **Long user operations from Chrome events:** `contextMenus.onClicked` must not directly own a full journal export. It opens `journal.html` with a one-shot command; the extension page owns progress/lifetime while service-worker requests remain bounded. Yandex backup already follows the same page-owned pattern.

### Streaming journal import (P1-030)

Large Journal import is bounded end-to-end. Local files are staged in `WebClipOffscreenTransfers` as 1 MiB Blob chunks; Yandex backup downloads are streamed by the offscreen document directly into the same Blob-chunk format instead of `response.text()`. `journal-import-stream.js` parses the export envelope incrementally and never builds the root backup object or the full `journal.entries[]` array. Preview only validates schema/version/structure and counts entries.

After the 9-digit confirmation, entries are materialized one at a time, normalized with the existing import validators, and written in small batches into `WebClipJournal.importStaging` (schema v7). The final replacement is one readwrite transaction spanning `entries`, `meta`, pending recovery stores and `importStaging`: old entries are cleared, staged entries are copied, recovery checkpoints are cleared, the revision is touched, and consumed staging records are deleted atomically. If that transaction aborts or times out, the previous Journal remains unchanged. Orphaned normalized staging has a bounded TTL cleanup. Legacy inline full-object runtime import is disabled so large imports cannot bypass the streaming boundary.

### Chrome Storage / alarms actual-settlement integrity — P1-117…P1-122

Chrome Storage and alarms are non-cancellable Chrome API side effects. WebClip therefore distinguishes a **local UI/worker deadline** from the **actual settlement** of the underlying Chrome promise:

- `runSerializedLateSettlementOperation()` owns a per-key queue turn. A timed-out operation may reject its caller after 10 seconds, but its queue turn remains occupied until the real Chrome promise settles. A newer mutation for the same key/alarm cannot start early and be overtaken by the late older side effect.
- Backup checkpoint mutations (`webclipJournalBackupPendingUpload`) are serialized by storage key. `journalBackupState` uses a fresh read-modify-write performed inside the same settlement queue turn, so success/failure/recovery state updates cannot be reordered by late `storage.set()` settlement.
- Alarm mutations are serialized per alarm name. Backup periodic/retry alarms, OperationLog maintenance and context-menu repair use this path; bounded `alarms.get()` is read-only and does not release/alter mutation ordering.
- `webclipJournalStatsDirty` has its own actual-settlement chain. Dirty-token begin/complete and repair-clear cannot cross after a local timeout; a late remove cannot erase a newer dirty marker.
- OperationLog retention settings use bounded reads and serialized writes. Legacy pending-append migration uses bounded storage read, bounded IndexedDB commit, then serialized removal of the legacy storage key.

The queue is intentionally **not** released by `Promise.race` timeout. If the previous real Chrome mutation never settles, later mutations fail/timeout rather than violating ordering. This is a fail-closed data-integrity choice; future maintenance/wake attempts can retry once the previous Chrome promise eventually settles.

## P1-123 / P1-127 — bounded Journal session context and extension-page Chrome API reads

Journal source context remains session-only and non-consume-on-open. `storeJournalSourceContext()` serializes retention/pruning and context writes on an actual-settlement chain. The UI-facing wait is capped at 10 seconds, but a local timeout does not release the serialization barrier: unresolved `chrome.storage.session.get/remove/set` promises must actually settle before a newer context mutation can start. `openJournalPage()` waits for that bounded context-store result before tab creation; on timeout/error it fails closed and no Journal tab is created from an unconfirmed source context.

`journal.js` uses a 10-second bounded read helper for source-context `storage.session.get`, source `tabs.get`, restored `webclipJournalGroupByUrl`, durable `webclipJournalRevision`, and the service-worker health ping. The health ping goes through the existing read-only runtime in-flight budget so a timeout cannot create unbounded duplicate unresolved RPCs. The popup applies the same 10-second boundary to Journal backup status, active-tab/source-context restoration, source-tab refresh, and the request that opens Journal. These are read-only/context-establishment operations: late results are ignored by the already-settled caller and cannot mutate durable data.

P1-123 does not consume Journal context on first read; this preserves switching an already-open Journal between `all`, current URL, and current site. P1-127 does not imply closure of unrelated long-running mutating Journal RPCs or history-reserved P1-124/P1-125/P1-126/P1-128+.



## P1-007 browser integration architecture

P1-007 uses two complementary automated browser runners so browser policy does not force the project to replace integration coverage with static tests. `project_tools/browser_p1_007_managed_integration.py` is the policy-safe CI layer: it runs real production `content.js`, `journal.js`, and `service-worker.js` in Chromium. Because the managed browser blocks all navigation and unpacked extension installation, this layer stays on `about:blank` and mocks only the unavailable boundaries (`chrome.*`, Journal runtime fallback data, and Yandex `fetch`). DOM behavior, Shadow DOM selection UI, print preparation, Chromium PDF rendering, Journal rendering code, Web Worker execution, and service-worker Yandex/auth logic are real production code.

`project_tools/browser_p1_007_unpacked_integration.js` is the full unpacked MV3 layer for Chrome for Testing or an unmanaged Chrome. It launches with `--remote-debugging-pipe --enable-unsafe-extension-debugging`, calls CDP `Extensions.loadUnpacked`, consumes the returned real extension ID, and drives the extension through its own `chrome.scripting`, `chrome.debugger`, `chrome.downloads`, IndexedDB Journal, and local HTTP Yandex mock paths. It intentionally avoids an external DevTools attachment to the article target while WebClip owns `chrome.debugger`, preventing debugger-client conflicts.

The managed runner is sufficient for the local P1-007 regression gate; the unpacked runner remains required evidence in real Chrome release QA. Neither runner changes the production manifest version or production Yandex endpoint. A browser-discovered P1-127 regression (`journalHealthTimer` used without declaration) is fixed by an explicit timer lifecycle handle and covered by the P1-123/P1-127 deterministic regression.
