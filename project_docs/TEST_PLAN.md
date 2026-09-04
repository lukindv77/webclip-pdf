# Регрессионный тест-план WebClip 0.9.8

## P0 перед каждой сборкой

### Manifest / recovery
- Manifest V3; runtime version берётся из `manifest.json` и не повышается из-за docs/research-only изменений.
- `contextMenus`, `alarms`, `debugger`, `offscreen`, `storage`, `downloads`, `scripting` присутствуют согласно current manifest.
- Все tracked JS проходят syntax check.
- `python project_tools/test_recovery_archive.py` подтверждает Git-first recovery: build только из clean exact commit, exact `source_commit` metadata, обязательные файлы, SHA-256/CRC и отказ на dirty tree.
- Пользовательский extension ZIP не обязан содержать nested recovery ZIP; P0-019 superseded old rule.

### Независимость полного журнала от активной вкладки (P0)
- Иметь минимум 2 записи журнала.
- На `chrome://newtab/` открыть popup → `Весь журнал`; число записей > 0.
- На уже открытой `https://` странице открыть popup → `Весь журнал`; число записей должно быть тем же.
- Открыть новую пустую вкладку, затем перейти в ней на произвольный `https://` URL и снова открыть `Весь журнал`; число записей не меняется.
- В Console журнала не должно быть необработанных ошибок; ordinary Journal view не материализует параллельно два полных списка. Публикуемый URL/site/all view должен соответствовать одной coherent Journal revision (P1-206).
- `Текущий URL` и `Текущий сайт` по-прежнему используют source context и фильтруют записи корректно.

### Включены / Исключены
- две соседние области «Включены»;
- выбор общего родителя поглощает дочерние области «Включены»;
- области «Исключены» внутри них сохраняется;
- автоматический «Основной контент» не создаёт области «Исключены»;
- «Найти рекламу» только подсвечивает кандидатов.

### iframe
- тестовая same-origin страница: article внутри iframe;
- курсор и click выбирают элементы внутри iframe, не только `<iframe>`;
- «Основной контент» выбирает article/body iframe при более высоком score;
- snapshot содержит `framePath`;
- journal restore возвращает области «Включены/Исключены» внутри iframe;
- длинный iframe не обрезается типовой фиксированной высотой при print preparation.
- cross-realm DOM elements из `iframe.contentDocument` не должны отбрасываться через `instanceof Element` верхнего окна; ручной click внутри same-origin iframe должен создать область «Включены» и v3 snapshot.

### P1-001 — resilient SelectionSnapshot v3 restore
- новый snapshot имеет `version=3` и bounded fingerprint: role/href, parent context, previous/next text, siblingIndex/sameTagIndex;
- DOM insertion, из-за которого сохранённые `cssPath` и `domPath` указывают на новый чужой sibling, не должен приводить к silent wrong restore: правильный contextual candidate выбирается с high confidence;
- при переносе элемента и ослаблении parent/structural evidence уникальный достаточный match допускается как medium confidence;
- два близких сильных candidate с малым score margin считаются ambiguity: ни один DOM node не получает области «Включены/Исключены»;
- Journal status показывает high/medium/legacy counts, ambiguity и missing; ambiguous считается ошибочным/неполным restore;
- v1/v2 snapshot остаётся читаемым через legacy resolver и явно диагностируется как legacy;
- v3 `framePath` проходит тем же contextual resolver и восстанавливает selection внутри same-origin iframe после DOM insertion;
- service-worker sanitizer/import boundary сохраняет v3 context fields, ограничивает их длину и сохраняет общий selection snapshot budget 2 MiB / 250 locators на список.

### PDF
- header содержит адрес сайта, clickable full URL, «Название страницы», local datetime;
- обычные ссылки/relative links кликабельны;
- linked image сохраняет исходную ссылку; unlinked image сохраняет безопасную ссылку на image URL;
- disclosure/details-контент попадает в PDF только через безопасную inert/static representation или допустимое состояние; arbitrary synthetic click/submit/navigation не выполняются (P0-067/P1-212);
- временные link/image/frame/resource изменения не blind-rollback поверх более новой host mutation: cleanup использует compare-before-restore/exact ownership (P1-218…P1-224);
- имя ≤100 символов и только одна точка перед `.pdf`.

### Яндекс PDF upload
Для root `/WebClips`:
- при отсутствии создаётся `/WebClips/Upload`;
- `its.1c.ru` → `/WebClips/Upload/1c.ru/its/<file>.pdf`;
- ошибка создания `Upload` даёт явную ошибку;
- если `Upload`, `Backup` или `Journal` уже существует как файл, а не каталог, операция завершается явной ошибкой;
- upload success создаёт journal entry;
- upload failure оставляет области «Включены/Исключены» и cached PDF;
- retry не вызывает новый `Page.printToPDF`.

### Journal local
- URL/site/all filters;
- domain filter использует siteKey до третьего уровня;
- P1-009: новая строка универсального фильтра имеет `Наименование` ON и остальные поля OFF;
- P1-009: фильтр по `Наименование`, `Комментарии`, `Сайт`, `URL` проверяется отдельно;
- P1-009: две строки проверяются в режимах `И` и `ИЛИ`;
- P1-009: совпадение, физически находящееся за первой 20-записной страницей исходного журнала, должно попасть на первую страницу filtered result — фильтрация выполняется до pagination;
- P1-009: group-by-URL и mode/domain counters считают только записи, прошедшие universal text filter;
- P1-009: более 8 строк и более 512 символов в строке не попадают в cursor query;
- delete one row → обычный confirm;
- clear domain → 9-digit dialog, неверный код не выполняет действие;
- clear all → 9-digit dialog;
- export JSON содержит все entries и selection snapshots;
- import JSON → 9-digit dialog → replace полного журнала;
- malformed/wrong-schema JSON не импортируется.

### Journal Yandex backup
- «Создать резервную копию сейчас» при непустом журнале не вызывает `IDBCursorDirection`/`openCursor` TypeError;
- полный журнал читается по индексу `createdAt` в возрастающем порядке через direction=`next`;
- отсутствующие `Backup/Journal/MM-YYYY` создаются автоматически;
- каждая новая копия получает новый timestamped filename; две последовательные выгрузки не заменяют предыдущую;
- upload backup использует `overwrite=false`;
- месяц `08-2026` формируется как `MM-YYYY` с ведущим нулём;
- список импорта показывает только backup JSON выбранной месячной папки `Journal/MM-YYYY`; месяцы перелистываются явно;
- import from Yandex не выполняет fetch до явного выбора файла;
- выбранный файл скачивается только из дерева `Backup/Journal`;
- после выбора import требует 9-digit confirmation перед replace local journal;
- folder creation/upload error сохраняет local journal без изменений;
- ручной export из Journal и «Создать резервную копию сейчас» в Options показывают этапы progress UI;
- во время активного ручного backup progress modal нельзя закрыть: Close скрыт/disabled, underlying `main.page` имеет `inert`, фокус находится в modal, фон не прокручивается; `beforeunload` включает системную защиту от случайного закрытия/перезагрузки вкладки; после success/error Close становится доступен, а после закрытия modal `inert` снимается и фокус возвращается на исходный элемент;
- после success/error защита снимается, окно можно закрыть вручную.

### Background backup
- default interval=1440 min, retry=60 min;
- пользовательские целые минуты сохраняются;
- overdue при startup/worker start запускает attempt;
- failure записывает `lastBackgroundFailureAt`/error и ставит retry alarm;
- повторный failure переносит retry ещё на configured minutes;
- success записывает `lastBackgroundSuccessAt`, clears retry, schedules next interval;
- popup отдельно показывает last success и last failure;
- закрытый Chrome не считается выполненной попыткой; после запуска overdue догоняется.

### Context menu
- root `WebClipper` появляется после install/update;
- start/auto-content/include/exclude/suggest/clear/finish используют существующий content state;
- download/yandex из context menu используют обычные save handlers;
- journal URL/site/all открываются с корректным sourceTabId/sourceUrl;
- settings/help открываются;
- context action не создаёт параллельную отдельную selection model.

## Негативные сценарии
- `chrome://` не запускает page WebClip workflow;
- cross-origin iframe без host permission не обещает DOM selection;
- P1-004: optional host permission выдаётся только через явное действие popup; отказ пользователя не ломает top/same-origin flow;
- P1-004: frame-agent принимает команды только от extension runtime, service-worker принимает register/state только от `frameId > 0` с действующим permission и не принимает stale `documentId`;
- P1-004: exact URL / unique-origin frame identity; ambiguous outer frame fail-closed;
- P1-004: remote-области «Включены/Исключены» попадают в v3 snapshot, восстанавливаются через agent, выбранный frame получает print marker и временно расширяется по reported document height;
- P1-004: `frame-agent.js` не активируется в same-origin child, который уже покрывает P0-003;
- release QA: реальный Chrome/Chrome for Testing permission prompt + unpacked MV3 на реальном HTTP(S) cross-origin iframe, включая permission revoke/navigation/reload.
- Yandex token expired → понятная auth error;
- root отсутствует при включении auto backup → settings error;
- в месте ожидаемой папки Yandex существует файл → folder preparation error и status problem;
- вкладка закрыта после Yandex failure → cached PDF удаляется.


## Дополнительные P0 тесты 0.9.3

### Action icon / badge
- URL без истории: neutral icon, badge пуст.
- последнее успешное сохранение 1 час назад: green.
- 25 часов назад: orange.
- 29 дней назад: orange.
- 31 день назад: red.
- три успешные выгрузки на Яндекс Диск сегодня: badge=1.
- успешная Yandex-выгрузка вчера и три успешные Yandex-выгрузки сегодня: badge=2.
- failed Yandex upload без success journal entry не меняет badge.
- переход вкладки на другой URL обновляет tab-specific icon/badge.
- delete/clear/import журнала обновляет индикаторы открытых вкладок.

### Контекстное меню
- `Начать выделение WebClipper` — отдельный top-level item, создан до submenu `WebClipper`.
- команда вызывает тот же `start` handler и не создаёт вторую selection model.

### Domain filter
- `Все позиции` находится первым пунктом дерева.
- `aaa.com` отображается как base domain.
- `bbb.aaa.com` отображается вложенно.
- base/third groups сортируются по времени последней записи.
- после выбора любой группы entries остаются newest-first.

### Monthly backup picker
- открытие импорта начинает с текущего `MM-YYYY`.
- backend запрашивает только выбранную папку месяца, а не все месяцы сразу.
- previous month меняет folder и список.
- next month работает до текущего месяца; future disabled.
- пустой месяц показывает понятное состояние без автоматического выбора файла.

### Yandex public URL
- при включённой настройке после upload выполняется publish/get metadata.
- `public_url` сохраняется в journal entry и экспортируется в JSON backup.
- после import `publicUrl` восстанавливается.
- отдельная ссылка `Открыть сохранённый файл на Яндекс Диске` в journal отсутствует.
- для Yandex entry с валидным `publicUrl` нажатие на существующий badge `Яндекс Диск` открывает сохранённый файл справа от текущей вкладки/согласно общей политике открытия вкладок.
- внешний вид badge `Яндекс Диск` остаётся тем же и не ломает горизонтальную пару badges.
- для Yandex entry без валидного `publicUrl` badge не выполняет ложное открытие; отображается понятное недоступное состояние/подсказка.
- при отключённой настройке upload остаётся рабочим без обязательной публикации.
- UI настроек предупреждает о доступности файла обладателю публичной ссылки.


### P1-026 — русская терминология областей страницы
- в карточке записи журнала отсутствует отдельная строка `Сохранено областей: N · Исключено: N`.
- заголовок раскрываемого блока отображается как `Области страницы Включены/Исключены`.
- количества включённых/исключённых областей остаются видимы в заголовке блока и не дублируются ниже.
- во всех пользовательских элементах журнала, popup/progress/status и связанных настройках нет англоязычных терминов для областей страницы; используются `Включены`/`Исключены`.
- технические ключи данных `includes`/`excludes` сохраняют обратную совместимость с существующим журналом, backup/import и restore.

### Page upload progress
- до отправки появляется modal с расшифровкой этапов.
- этап `prepare` виден до print.
- UI скрыт непосредственно во время `Page.printToPDF`, чтобы не попасть в PDF, и возвращён после.
- далее видны disk-access → site-folder → upload-url → upload → public-link → verify.
- во время операции modal не имеет close action.
- `beforeunload` активен только пока операция выполняется.
- competing context-menu/page WebClip command возвращает понятную ошибку до завершения операции.
- success снимает защиту и показывает ссылку на Yandex при наличии `publicUrl`.
- failure снимает защиту, сохраняет области «Включены/Исключены» и cached PDF для retry.

### P1-003 — bounded prefetch/report ресурсов PDF

1. Выбрать область с `img loading=lazy data-src="..."`: перед `Page.printToPDF` изображение должно получить временный `src`/`loading=eager`, а после print исходные attributes должны восстановиться.
2. Проверить `picture/source[data-srcset]` и `img[data-srcset]`: source activation не должна сохраняться в исходном DOM после операции.
3. CSS `background-image` выбранного элемента должен быть прогрет renderer-side; ресурс вне областей «Включены» не должен специально запрашиваться P1-003.
4. Используемый web font должен пройти bounded `Document.fonts.load/check`; недоступный font не блокирует PDF после общего deadline.
5. Общий resource preparation deadline ≤15 s, максимум 500 tasks, concurrency 8, DOM scan ≤5000 элементов; huge URL/srcset/CSS/font values не должны обходить scalar boundaries.
6. Не должно быть extension-level `fetch()` в P1-003 path и чтения response bytes.
7. Недоступный image/background/font должен попасть в bounded `resourceReport`; максимум 40 failure rows.
8. URL вида `https://host/path.png?access_token=SECRET#x` в Journal/PDF/OperationLog должен отображаться без query/hash; `data:`/`blob:` — только opaque label.
9. `resourceReport` должен переживать local-download durable checkpoint, Yandex retry cache, Journal append и JSON export/import.
10. Старые entries без `resourceReport` должны отображаться без фиктивного resource block.
11. Реальный Chromium regression `browser_p1_003_resource_prefetch.py` должен подтверждать success + failure + redaction + rollback временных lazy attributes.


## Регрессия 0.9.4

1. Скачать PDF локально для нового URL: строка появляется в журнале с режимом `Файл`; иконка остаётся серой, badge пуст.
2. Успешно выгрузить тот же URL на Яндекс Диск: после проверки файла строка `Яндекс Диск` появляется в журнале; иконка становится зелёной, badge `1`.
3. Повторить Yandex-upload в тот же день: badge остаётся `1`; на следующий локальный день — `2`.
4. Оставить журнал открытым и выполнить новое сохранение в другой вкладке: список автоматически обновляется без создания новой вкладки журнала.
5. Проверить режимы `Текущий URL`, `Текущий сайт`, `Весь журнал`: ровно одна кнопка имеет активное оформление и `aria-pressed=true`.
6. Открыть `Весь журнал`: фильтр доменов закрыт; после раскрытия базовые домены с дочерними узлами также закрыты. Каждый раскрывается независимо.
7. Поиск `1c.ru` находит соответствующую базовую ветку; поиск `its.1c.ru` находит вложенный домен; очистка поиска возвращает полное дерево.
8. Проверить сортировку: базовые домены и дочерние домены с более свежей записью выше; строки журнала внутри фильтра — новые сверху.

## Регрессия 0.9.7

1. Открыть журнал, оставить вкладку открытой, успешно отправить новую страницу на Яндекс Диск — запись должна появиться без открытия новой вкладки.
2. Открыть журнал, затем обновить/перезагрузить распакованное расширение — открытая вкладка журнала должна автоматически перезагрузиться в новый extension-context.
3. После записи журнала переключиться на другую вкладку и вернуться — журнал должен перечитать состояние.
4. Убедиться, что `webclipJournalRevision` меняется после append/delete/clear/import и вызывает повторную выборку.
5. При искусственно инвалидированном контексте health-check должен показать сообщение о необходимости перезагрузки, а не оставлять молча устаревший список.


### Регрессия 0.9.7: журнал из существующих вкладок
1. Открыть несколько HTTP(S)-вкладок до сохранения.
2. Успешно отправить WebClip на Яндекс Диск из одной из них.
3. Из каждой ранее открытой вкладки открыть `Весь журнал`.
4. Во всех случаях число записей и набор карточек должны совпадать с журналом, открытым из новой вкладки Chrome.
5. Не открывая новую вкладку, создать ещё одну запись; открытый журнал должен обновиться автоматически не позднее 3 секунд.


### Регрессия 0.9.9: сохранение source-context между видами журнала
1. На обычной HTTP(S)-странице открыть `Весь журнал`.
2. В открывшейся вкладке `journal.html` кнопки `Текущий URL` и `Текущий сайт` должны быть доступны; переключение на них использует исходную web-страницу.
3. Переключиться обратно на `Весь журнал`: количество/набор записей должен совпадать с полным журналом независимо от исходного URL.
4. Не закрывая journal-tab, открыть popup WebClip и выбрать `Журнал текущего URL`, затем `Журнал текущего сайта`: оба должны использовать сохранённый source-context, а не URL `chrome-extension://.../journal.html`.
5. Новая внутренняя вкладка должна открываться справа от текущей journal-tab, при этом source-фильтр должен оставаться привязан к исходной web-вкладке.
6. Открыть `Весь журнал` из `chrome://newtab/`: полный журнал доступен; URL/site недоступны, так как корректного HTTP(S)-контекста нет.


### P1-094 — bounded session source-context retention

1. Seed `chrome.storage.session` более чем 512 ключами `webclipJournalContext:*`, включая записи старше 24 часов, future-dated/malformed записи и посторонние session keys (например OAuth state).
2. Открыть Journal из HTTP(S)-вкладки. После create/prune число `webclipJournalContext:*` должно быть не более 512; expired/future/oldest overflow удалены, посторонние session keys не изменены.
3. Передать source URL длиннее 8192 символов: сохранённый context не должен превышать 8192 символов; contextId перед формированием session key ограничен 180 символами.
4. Смоделировать несколько конкурентных открытий Journal при 510+ существующих context. Итоговый retained context count остаётся ≤512; create/prune операции не пересекаются так, чтобы нарушить cap.
5. Открыть journal-tab с context старше 24 часов, future timestamp или legacy URL >8192: `Текущий URL/сайт` не должны использовать такой context. Popup, открытый поверх journal-tab, также не должен переносить его в новый Journal.
6. Для свежего context открыть `Весь журнал`, затем переключаться `Текущий URL` ↔ `Текущий сайт` ↔ `Весь журнал`: source-context остаётся доступен в рамках открытой вкладки и не consume-on-open.
7. Deterministic regression: `node project_tools/test_p1_094_journal_context_retention.js`.

## 0.9.8 — удаление записи с управлением Yandex-файлом

1. Yandex entry → «Удалить запись»: ни один вариант не выбран, кнопка подтверждения disabled.
2. Выбрать «Оставить файл»: journal entry удаляется; файл по старому path остаётся.
3. Выбрать «Так же удалить файл»: создаётся `Trash/MM-YYYY`, файл перемещается туда, journal entry удаляется только после проверки целевого файла.
4. Смоделировать сетевую/API ошибку move: journal entry должна остаться, dialog показывает ошибку и позволяет выбрать другой вариант/повторить.
5. Переименовать или переместить опубликованный PDF вручную на Яндекс Диске: удаление должно найти его по `resourceId`/`publicUrl` и переместить в Trash.
6. Старую Yandex entry без `resourceId`, но с `publicUrl`, проверить через fallback-поиск.
7. Старую entry без `resourceId/publicUrl` и с несуществующим path: операция должна завершиться ошибкой без удаления journal entry.
8. Конфликт имени в `Trash/MM-YYYY`: новый target получает безопасный суффикс `__deleted_...`, существующий файл не перезаписывается.
9. Локальная `destination=download`: удаляется только запись; скачанный файл не затрагивается.
10. JSON export/import round-trip должен сохранять `resourceId` новых записей.
11. Новая Yandex entry должна сохранять `accountUid` и `rootPath`; JSON export/import round-trip сохраняет `accountUid/rootPath/resourceId/publicUrl/remotePath`.
12. Подключить другой Yandex account при той же структуре путей: delete/move должен fail-closed до поиска/изменения remote file.
13. Изменить выбранный rootPath после сохранения записи: destructive action для записи с сохранённым другим rootPath должна fail-closed.
14. При известном `resourceId` вернуть по старому path файл без `resource_id/public_url`: path-only candidate не принимается; поиск продолжается.
15. При отсутствующем `resource_id` у candidate точный сохранённый `publicUrl` может дать secondary match; если candidate возвращает другой `resource_id`, совпадающий publicUrl не должен перекрывать конфликт.


### P1-027 — badge способа сохранения без дублирующей строки
- в карточке отсутствует строка `Режим выгрузки: ... · Статус чтения: ...` для всех режимов сохранения/чтения.
- Yandex entry показывает badge `Яндекс Диск` и отдельный badge `Прочитано` либо `Прочитать позже`.
- локальная `destination=download` показывает badge `Скачан локально` вместо `Яндекс Диск` и отдельный badge статуса чтения.
- `Скачан локально` оформлен в нейтральной чёрно-белой/серой гамме и визуально отличается от Yandex badge.
- пара badge способа сохранения + статус чтения остаётся горизонтальной и не переносится друг под друга при штатной ширине карточки.
- старые записи с `destination=download` и `destination=yandex` отображаются корректно без миграции базы.
- `Скачан локально` не открывает ложную/несуществующую ссылку на локальный файл.

### P1-025 — Yandex file action через destination badge
- для `destination=yandex` с валидным `https://disk.yandex.ru/...`, поддоменом `*.disk.yandex.ru` либо `https://yadi.sk/...` badge `Яндекс Диск` является `<button>` и вызывает `WEBCLIP_OPEN_JOURNAL_SAVED_FILE` только с `journalEntryId`;
- отдельная ссылка/строка `Открыть сохранённый файл на Яндекс Диске` в meta-блоке отсутствует;
- при пустом, HTTP, malformed либо постороннем HTTPS `publicUrl` badge остаётся видимым, disabled и сообщает, что ссылка недоступна;
- service worker остаётся authoritative boundary P0-037: повторно читает запись из Journal и валидирует разрешённый Yandex HTTPS URL до открытия вкладки;
- `destination=download` не превращается в действие открытия; destructive Journal+Yandex flow не меняется.

### P1-028 — перенос badge в строку даты/времени
- badge способа сохранения и badge статуса чтения отсутствуют в прежнем правом верхнем блоке карточки.
- оба badge находятся под названием страницы, в строке с датой и временем.
- дата/время расположены слева, группа badge — справа от них.
- размеры/высота/внутренние отступы badge визуально совпадают с текущей реализацией до переноса.
- `Яндекс Диск` + `Прочитано` и `Яндекс Диск` + `Прочитать позже` располагаются горизонтально.
- `Скачан локально` + соответствующий статус чтения также располагаются горизонтально.
- длинное название страницы не ломает строку метаданных и не вызывает наложение badge на дату/время.
- при узкой штатной ширине карточки не появляется наложение элементов; если места недостаточно, поведение должно быть предсказуемым и не менять размеры самих badge.
- после переноса в правом верхнем блоке не остаётся пустого зарезервированного места.
- кликабельность `Яндекс Диск` согласно P1-025 сохраняется; `Скачан локально` не становится кликабельным.


## Research regression additions — checkpoint 2026-08-24

- `P0-043`: terminate/reload the service worker after pre-download intent commit but before `downloadId` bind; maintenance must identify the Chrome DownloadItem and finalize exactly one journal record after `complete`.
- `P0-043`: Chrome download `interrupted` must never create a journal entry; pending intent/bound checkpoint must be removed and operation log must end in error.
- `P0-043`: force journal checkpoint+append failure after a completed local download; `pendingDownloads` metadata must remain available for a later maintenance retry.
- `P1-032`: with a large synthetic journal (target 100k entries), verify there is no all-journal `currentEntries`/100k summary materialization; exact mode/list/group totals remain correct; non-group page retains only 20 summaries and loads only 20 full records; URL-group pagination retains only 20 group aggregates per page and uses a stable boundary for next/previous navigation; an expanded URL group reads children in batches of 20 without retaining all child IDs; domain aggregation retains at most 500 base + 1500 child rows and clearly reports truncation while exact displayed/global counts remain correct; IDB view/get-many operations abort at 20 s and service-worker fallbacks are bounded at 25 s; expanded group/domain state is pruned to the retained view. Run `project_tools/test_p1_032_bounded_journal_view.js` plus real Chrome memory/interaction regression.
- `P1-041`: export a multi-chunk journal and verify staging chunks are Blob-backed; generated local JSON and Yandex upload bytes are identical to the logical export JSON. Verify legacy text chunks still render.
- `P1-042`: preview a large staged import and confirm it reports schema/count without mutating/normalizing the staged journal; full validation still rejects malformed individual records on confirmed import.
- `P1-044`: simulate Yandex move verify returning 404/timeouts until deadline; Trash and ReadLater→Upload must stop around the 45-second overall budget and preserve their local fail-safe/recovery semantics.
- `P0-044`: inject failure of both journal recovery checkpoint and journal append after a successful Yandex file upload; until the remote-save checkpoint design is implemented this test is expected to expose the open research gap.
- `P0-045`: if extension is enabled in Incognito, verify the chosen privacy policy prevents silent persistent URL/title leakage into normal-profile journal/operation logs.

### Research regression — P0-044/P0-045/P0-046/P1-043/P1-045

- Stop MV3 worker after Yandex upload starts/finishes but before Journal append; after wake/reauthorization verify the same stable entry id is recovered without duplicate remote upload or duplicate Journal row.
- Clear/import while `pendingRemoteSaves` exists: stale checkpoint must not resurrect replaced Journal data.
- Incognito: save/template/list/open-saved-file commands must fail before persistent Journal/PDF/log writes; opening Journal from an incognito source/anchor must fail with a privacy explanation.
- Launch manual and background backup concurrently: exactly one atomic lease acquire succeeds; losing operation gets `JOURNAL_BACKUP_BUSY`.
- Force operation-log quota failure: oldest/expired diagnostic records are reclaimed and one retry occurs; Journal is untouched.
- Simulate low origin quota before PDF/import/export staging: disposable data cleanup runs; if reserve is still insufficient the operation fails before download/upload/replace.
- Populate multiple prepared remote checkpoints with slow Yandex responses: one maintenance pass must stop within its 120 s budget and leave the remainder for the next pass.



### Research regression — P0-049…053 / P1-051…053

- `P0-049`: pause local/remote recovery after it reads its checkpoint, concurrently clear or replace the journal, then resume; no old entry may be appended and no generic pending append may resurrect it later.
- `P0-050`: run two overlapping journal mutations; make A's stats update fail while B succeeds. The dirty marker must still require repair after B completes. During a full rebuild, start another mutation; the rebuild must not clear the newer marker.
- `P0-051`: from a content script on site A, attempt `WEBCLIP_OPEN_JOURNAL_SAVED_FILE` with an id belonging to site B; it must fail. The journal extension page may still open B.
- `P0-052`: mock a signed `disk.yandex.net` transfer returning 30x to a non-Yandex host; offscreen must fail without following the redirect/request body.
- `P0-053`: mock `cloud-api.yandex.net` and OAuth token endpoint returning 30x; WebClip must fail without following the redirect, and neither `Authorization` nor OAuth code/PKCE verifier may be forwarded.
- `P1-051`: export Unicode-heavy journal data where character size stays below the char limit but UTF-8 bytes exceed the byte cap; producer/offscreen must reject it before oversized Blob/upload. Corrupt manifest `totalBytes` and chunk sizes must also be rejected.
- `P1-052`: after an ambiguous backup upload, return 404 once/twice inside the grace period; checkpoint must remain and a second backup must not be created. Only after the configured age + minimum 404 attempts may an unverified prepared checkpoint be discarded.
- `P1-053`: stall an IndexedDB export batch; snapshot construction must abort within the batch/overall deadlines and must not continue into Yandex upload after the timeout.
- `P1-049`: if a matching Chrome DownloadItem is found but binding its `downloadId` to the durable intent fails, maintenance must report partial/failed and keep the intent for a later pass.


### Research regression: aggregate payload bounds and lifecycle

- `P0-054`: verify a normal selection snapshot is preserved; >250 locators or >2 MiB aggregate locator JSON from a content/import boundary is rejected with a controlled error and no journal mutation.
- `P0-055`: verify add/edit at normal size; 501 comments, >100000-char single comment, or >2 MiB aggregate comment text is rejected; imported backup remains unchanged when rejected.
- `P1-055`: upgrade an OperationLog DB v1 fixture containing embedded `events[]`, append events, reload/list/get/copy/export, and verify event order, start event, truncation, quota cleanup and event-store deletion with retention.
- `P1-057`: rebuild urlStats for >100k synthetic entries / mostly unique URLs; verify bounded batches, counts, dirty-marker persistence after forced abort and clean full rebuild on next maintenance.
- `P1-058/P1-059`: simulate repeated worker wake without startup; existing alarm `scheduledTime` must not be pushed forward and no duplicate due-backup/maintenance operation may start.


### Research regression: import scalars / alarms / durable local downloads

- `P0-056`: import backup with multi-megabyte entry/comment IDs, invalid/huge localDayKey/operationDateTime and extra nested comment fields; verify controlled normalization/rejection and no unbounded duplicate copy.
- `P1-060`: remove backup alarms, simulate worker wake with overdue backup, verify a near-term alarm is created and no backup starts until `onAlarm`; after success verify next periodic alarm.
- `P1-061`: simulate startup/install and repeated ordinary worker wakes; first maintenance must be alarm-driven and ordinary wakes must not move an existing alarm.
- `P1-062`: force slow/blocked import puts past the 5-minute test deadline (shortened in harness); verify transaction abort and byte-for-byte logical preservation of the old journal.
- `P1-063`: oversized Client ID/code/token and oversized OAuth response token must fail without storing secrets; normal authorization remains unchanged.
- `P1-064`: seed >12 pending local downloads; one maintenance pass processes at most 12 oldest checkpoints and leaves the rest intact for the next pass.


## Research regression — P0-057 / P1-043 / P1-065…P1-071

- `P0-057`: seed both `chrome.storage.session[yandexAuth]` and legacy `chrome.storage.local[yandexAuth]`; make `storage.local.remove()` fail. Any status/API path must fail closed with `YANDEX_LEGACY_TOKEN_CLEANUP_FAILED` and must not return a usable token until a later cleanup succeeds. On success, verify the persistent key is gone.
- `P1-043`: Options → «Локальное хранилище» shows usage/quota/free/safety reserve and current persistence status. «Защитить локальное хранилище» calls the standard Storage API only after explicit user action. Verify manifest has no `unlimitedStorage` and no new permission is requested.
- `P1-055`: run `node project_tools/test_operation_log_v1_v2.js`; legacy v1 embedded `events[]` must migrate exactly once on first append; second append must not duplicate legacy timeline and `nextEventSeq` must advance monotonically. Real Chrome regression must additionally cover retention/quota/copy/export.
- `P1-065`: force `chrome.offscreen.closeDocument()` to resolve only after the local close timeout. A concurrent `ensureOffscreenDocument()` must not create a replacement while the original close promise is unresolved; creation is allowed only after actual settlement.
- `P1-066`: force `chrome.debugger.attach()` to resolve after local timeout. Immediate PDF retry must return `WEBCLIP_DEBUGGER_BUSY`; late attach must be detached before a new attach is allowed. Repeat with delayed detach.
- `P1-067`: keep a Blob-backed Chrome DownloadItem in `in_progress` through the 15-minute deadline. WebClip must call `downloads.cancel()` before revoking the Blob URL. If `downloads.search()` fails, best-effort cancel must still occur before revoke. `complete/interrupted` releases immediately.
- `P1-068`: simulate a lost response channel after offscreen Blob URL creation. `CREATE_PDF_CACHE_BLOB_URL`, `CREATE_TEXT_BLOB_URL` and `CREATE_STAGED_TEXT_BLOB_URL` must be sent exactly once; unknown transport failure must not auto-retry the side effect.
- `P1-069`: stall offscreen IndexedDB read/write during signed transfer. The transaction must hit its bounded phase/common deadline, abort, decrement `activeTransfers`, stop heartbeat and allow idle-close scheduling; it must not hang indefinitely before/after `fetch`.
- `P1-070`: choose context-menu «Экспорт полного журнала в файл». The handler must open a journal extension-tab with one-shot `autoExportFile=1`; the page removes the flag, runs the normal export UI flow, and the contextMenus callback itself must not directly execute `downloadFullJournalExport()`.
- `P1-079`: Full Journal file export must prepare JSON/Blob in the worker, then invoke `chrome.downloads.download({saveAs:true})` only from `journal.html`. Keep the native dialog promise pending for at least 250 ms in the regression harness: exactly one download call, no release/retry/timeout while pending; reject releases Blob, success arms terminal cleanup.
- `P1-080`: OperationLog JSON export must prepare sanitized Blob metadata in the worker, then invoke the same page-owned Save As helper only from `options.html`. Assert `service-worker.js` contains no `saveAs:true` call-site after closure and that foreign Blob URLs are rejected before any Chrome side effect.
- `P1-071`: provide a chunked transfer where an early chunk is missing/oversized. The first semantic failure must abort the readonly transaction immediately; later queued chunk requests must not continue building `values[]` after the operation has already failed.

Local deterministic tests for these invariants live in `project_tools/`; they do not replace real Chrome/Yandex E2E.

## Runtime delta regression — P1-132…P1-136 / P2-011

- `P1-132`: emulate Chrome 118 callback-only `contextMenus.removeAll/create`; no create may run before removeAll callback, and `runtime.lastError` from create must reject initialization.
- `P1-133`: scan hundreds/thousands of Yandex items with few matching folders/backups; scanned count may grow to the bounded scan limit while retained objects contain only matching results and respect the result cap.
- `P1-134`: disconnect progress Port during an active operation and verify a new Port is established and receives the same progress handler.
- `P1-135`: with no active operation, a Port disconnect must not schedule reconnect/wake cycles; pagehide permanently stops reconnect; terminal operation state closes the Port.
- `P1-136`: context-menu initialization is paired with a unique repair alarm, retry count is bounded to three, and startup invokes the same self-heal path.
- `P2-011`: folder listing requests only `name/path/type`; backup listing requests only metadata actually consumed by the UI.

These deterministic tests are a delta against the physically mounted checkpoint and do not replace real Chrome/Yandex E2E.


## P1-137…P1-141 delta regression

- Options folder picker: start two navigations out of order; only latest may update path/list; while active load, Save/Create/second Browse must not start conflicting navigation.
- Read-only extension-page RPC: simulate never-settling runtime handler; UI must time out; retry of identical request must not emit a second underlying RPC; fifth distinct unresolved read must be rejected locally.
- Yandex backup month picker: while one month list is active, Prev/Next and second list launch remain blocked; after timeout/settlement navigation becomes available.
- Yandex folder/backup picker with 600+ items: initial live DOM contains at most 250 rows plus one `Показать ещё`; selecting a backup must not query all rows.
- OperationLog: list refresh started before a newer detail selection must not clear/reopen the new selection; superseded detail request must not become export target.
- `P1-145`: start detail A, then while A is unresolved request B and C. There must be only one active detail RPC; B must be superseded in the single queued slot and must never start an underlying RPC; after A actually settles only C may start, stale A must not become selected/exportable, and C must become selected. Separately force the UI deadline of T while its underlying runtime read remains unresolved, request U, and verify U does not start until T's actual settlement. Run `project_tools/test_p1_145_operation_log_latest_wins.js`.
- Options startup/open-auth-help/copy-redirect failure paths must display a controlled error instead of an unhandled rejection.

### P1-030 — streaming large import regression

- Local file import: verify `File.text()` is not used; a near-limit JSON backup is staged as 1 MiB Blob chunks and preview reports schema/count without building full `journal.entries[]`.
- Yandex restore: verify offscreen response body is streamed into Blob chunks; no `response.text()`/whole UTF-16 backup is created.
- Split UTF-8/JSON tokens across arbitrary chunk boundaries, including emoji/escaped Unicode; streaming parser must reproduce the same entry values.
- Confirmed import: verify only one bounded entry/small batch is materialized at a time, normalization limits still reject malformed entries, and duplicate imported entry IDs are resolved without an in-memory 100k-ID set.
- Atomicity: force final `entries <- importStaging` transaction abort/timeout midway; old Journal and recovery state must remain unchanged and staged normalized records must be recoverably cleaned.
- Crash cleanup: leave raw transfer chunks and `WebClipJournal.importStaging` records behind, advance TTL, run maintenance, and verify both staging domains are bounded/cleaned.
- Verify legacy `WEBCLIP_JOURNAL_IMPORT_REPLACE` full-object runtime command is rejected; current UI uses only staged import.
- Run `node project_tools/test_p1_030_streaming_import.js`.

### P1-215 — renewable Journal import lease / restart ownership

- preview must create exactly one strict `journalImportLease` meta checkpoint bound to the receipt, staging generation, owner session, two-minute renewable lease and two-hour hard deadline;
- a second Journal page and generic TTL cleanup must not claim/delete hard-live staging while the current owner lease is valid;
- after full browser-process restart, current Journal/pending state and raw staging remain unchanged; no destructive action resumes automatically;
- after short-lease expiry, explicit resume rotates both token and owner, re-reads/re-hashes the same staging generation, captures a fresh Journal revision and shows a second nine-digit destructive confirmation;
- the previous token must fail closed inside the destructive transaction; Journal/pending rows and raw staging must remain available to the current owner;
- valid current-owner confirmation commits once, clears pending stores according to the still-open P0-072 policy, and removes both lease checkpoint and consumed staging;
- explicit cancel after restart must preserve Journal/pending rows and remove only the expired checkpoint plus its raw staging;
- hard-expired, missing or generation-invalid checkpoint may be reclaimed; corrupt/unknown checkpoint metadata must make generic cleanup protect Journal-import rows rather than guess ownership;
- run `node project_tools/test_c44_import_restart_lease.js` and the physical `project_tools/research_c44_full_ui_browser_restart.mjs` matrix in real unpacked Chrome.

### P1-073 — единый deadline полного Journal export
- fault-injection: задержать `IndexedDB.open` для Journal revision/batch; последующая transaction получает только остаток общего `buildDeadline`, а не новый полный timeout;
- fault-injection: задержать открытие transfer staging DB; chunk/manifest write transaction получает только post-open remainder;
- при ошибке snapshot staging cleanup использует тот же оставшийся `buildDeadline`;
- изменить journal revision между первым и вторым snapshot: допускается один retry, второй attempt использует исходный 5-минутный deadline;
- deterministic `project_tools/test_p1_073_export_deadline.js` должен проходить; manifest остаётся `0.9.8` до реального Chrome/Yandex release QA.

### P1-075 — bounded maintenance IndexedDB cleanup
- fault-injection: оставить maintenance IndexedDB transaction навсегда незавершённой; через 20 с она должна получить `abort()` и stage должен завершиться `WEBCLIP_IDB_TIMEOUT`, а не удерживать worker бесконечно;
- проверить OperationLog retention/size cleanup, transfer TTL, PDF retry-cache TTL, stale remote checkpoint cleanup и expired import staging — каждый путь использует bounded helper `runIndexedDbTransactionBounded(..., MAINTENANCE_IDB_TX_TIMEOUT_MS)`;
- readonly stale-checkpoint scan не должен публиковать rows до `tx.oncomplete`;
- ошибка/timeout cleanup-stage должна оставаться изолированной `runStage`, чтобы journal/remote/local recovery и stats repair могли продолжиться;
- deterministic `project_tools/test_p1_075_maintenance_idb_deadlines.js` должен проходить; manifest остаётся `0.9.8` до реального Chrome/Yandex release QA.

### P1-076 / P1-077 — bounded backup lease и durable alarm boundary
- fault-injection: оставить acquire/renew/release lease transaction незавершённой; через 20 с bounded helper должен вызвать `abort()` и завершить её `WEBCLIP_IDB_TIMEOUT`;
- acquire: действующий чужой lease должен atomically abort/reject с `JOURNAL_BACKUP_BUSY`, без записи нового token;
- renew: token mismatch должен fail-closed вернуть `JOURNAL_BACKUP_LEASE_LOST`; совпавший token продлевает expiry в той же readwrite transaction;
- release: token mismatch не удаляет lease; удаление разрешено только владельцу token;
- settings: включить backup при due-state и убедиться, что `saveJournalBackupSettings()` не вызывает `runDueJournalBackup()` напрямую, а только `initializeJournalBackupScheduler('settings-change')`; scheduler создаёт near-term alarm;
- production call-sites `runDueJournalBackup()` допускаются только из periodic/retry `chrome.alarms.onAlarm`;
- deterministic `project_tools/test_p1_076_077_backup_lease_alarm_boundary.js` должен проходить; manifest остаётся `0.9.8` до реального Chrome/Yandex release QA.


### P1-082 / P1-083 — bounded recovery stores и ordinary Journal CRUD
- fault-injection: оставить transaction `pendingAppends`, `pendingRemoteSaves` или `pendingDownloads` незавершённой; не позднее 20 с helper должен вызвать `abort()` и вернуть `WEBCLIP_IDB_TIMEOUT`, не удаляя/не публикуя неподтверждённый checkpoint;
- проверить create/read/update/delete/list для всех трёх recovery stores, legacy pending IDB migration и initial scan local-download reconciliation — raw `db.transaction(...)` без bounded helper там не допускается;
- durable append из `pendingDownloads`/`pendingRemoteSaves`: source checkpoint recheck + Journal write остаются одной bounded readwrite transaction; timeout/abort не должен воскресить stale metadata после concurrent clear/import;
- destructive clear: entries/meta + `pendingAppends` + `pendingDownloads` + `pendingRemoteSaves` должны очищаться атомарно одной bounded transaction; forced timeout оставляет pre-transaction состояние без partial commit;
- обычные Journal append/list/get/get-many/update/delete/clear и point `urlStats` read/update/rebuild должны использовать `JOURNAL_CRUD_IDB_TX_TIMEOUT_MS=20s`;
- readonly Journal/recovery helper result не должен resolve до `tx.oncomplete`, даже если последний request/cursor уже отдал данные;
- Full Journal direct view (`journal.js` и service-worker fallback) должен сохранять `JOURNAL_VIEW_QUERY_DEADLINE_MS` + `tx.abort()`; full `urlStats` rebuild — общий 5-минутный budget и 20-секундный per-transaction abort;
- deterministic `project_tools/test_p1_082_083_journal_recovery_idb_deadlines.js` должен проходить; manifest остаётся `0.9.8` до реального Chrome/Yandex release QA.


### P1-086 / P1-087 — readonly completion boundary и identity local-download recovery
- Journal export revision: `request.onsuccess` может только передать значение completion-aware bounded helper; Promise не должен settle до `tx.oncomplete`, а helper должен получить только остаток общего P1-073 deadline;
- export batch: довести cursor до batch/end boundary и не вызывать `tx.oncomplete`; результат должен оставаться pending. После `tx.oncomplete` публикуются staged `items/lastId/done`;
- abort/error/timeout readonly export transaction не должны публиковать `pendingResult`;
- local-download intent recovery: вернуть два одинаковых filename/size кандидата — чужой extension и WebClip; только `byExtensionId === chrome.runtime.id` может участвовать в Blob URL/fallback matching;
- foreign-only candidate, включая совпадающий Blob URL/filename/size, должен остаться unmatched; durable checkpoint не должен финализироваться как чужая загрузка;
- reconciliation уже привязанного `downloadId` также обязан отфильтровать `DownloadItem` другого extension;
- выполнить `node project_tools/test_p1_086_087_readonly_download_identity.js`; manifest остаётся `0.9.8` до реального Chrome/Yandex release QA.


### P1-117…P1-122 — Chrome Storage / alarms late-settlement integrity

- P1-117 backup checkpoint/state: force a `storage.set/remove` to exceed the local 10-second deadline while remaining unresolved; a newer mutation of the same checkpoint/state must not start until the older underlying promise actually settles. After settlement, retry may proceed from a fresh read and must not resurrect stale backup state/checkpoint.
- P1-118 alarms: force an old `alarms.clear(name)` to time out locally and settle late; a newer `alarms.create(name)` must not start before that real clear settlement. After retry, the final alarm must remain present. Verify all production create/clear call-sites use the serialized per-alarm helper.
- P1-119 scheduler: make `storage.local.get` or `alarms.get` never settle and verify backup/OperationLog scheduler returns bounded `WEBCLIP_TIMEOUT` rather than hanging the MV3 event indefinitely. Normal missing-alarm path must still self-heal by scheduling the alarm.
- P1-120 stats dirty marker: force an older marker mutation to time out locally; begin/complete/repair-clear for a newer mutation must not start until the previous actual storage chain settles. A late stale remove must not make a newer dirty token disappear.
- P1-121 OperationLog retention: verify settings read uses bounded storage read and write uses the serialized storage mutation queue; late stale write may not overtake a newer retention value.
- P1-122 legacy pending append migration: storage read is bounded; IndexedDB migration commits before legacy key removal; removal uses serialized/bounded storage mutation. Timeout before commit/remove must leave source data available for idempotent retry.
- Run `node project_tools/test_p1_117_122_storage_alarm_integrity.js` plus the full deterministic suite. Manifest must remain `0.9.8`; these tests do not replace Chrome/Yandex release QA.

### P1-123 / P1-127 — Journal session-context and extension-page Chrome API deadlines

- Force `chrome.storage.session.get(null)` during source-context creation to remain unresolved past the 10-second local deadline. `openJournalPage()`/context store must reject boundedly, no `tabs.create` may occur, and a second context mutation must not start its underlying session read until the first actual Chrome promise settles.
- Force pruning `storage.session.remove` to time out locally. The final context `set` must not overtake the unresolved remove; after actual remove settlement the serialized mutation may finish.
- Force context `storage.session.set` to time out locally, then request another context creation. The second get/remove/set sequence must remain queued until the first actual set settles.
- Journal extension page: make source `storage.session.get`, source `tabs.get`, `webclipJournalGroupByUrl` restore, `webclipJournalRevision` restore, or health ping never settle. Each caller must leave loading/startup wait after the 10-second deadline instead of hanging indefinitely.
- Health ping must continue to use the bounded read-only runtime helper/in-flight cap, so repeated timeout/retry cannot create unlimited unresolved `runtime.sendMessage` calls.
- Popup Journal context/status restoration: make backup status, active-tab query, session context read, source-tab refresh, or open-Journal runtime request never settle and verify the popup receives a bounded error path.
- Verify context remains non-consume-on-open and P1-094 TTL/cap/URL bounds remain intact.
- Run `node project_tools/test_p1_123_127_extension_api_deadlines.js`, `node project_tools/test_p1_094_journal_context_retention.js`, and `node project_tools/test_readonly_ui_rpc_deadlines.js`, then the full deterministic suite. Manifest remains `0.9.8`; Chrome/Yandex release QA is still required.



### P1-007 — automated browser integration gate

- Run `CHROMIUM_BIN=/usr/bin/chromium /opt/pyvenv/bin/python project_tools/browser_p1_007_managed_integration.py` in policy-managed CI. This runner must not bypass enterprise policy: it uses `about:blank` + `set_content()` and executes production scripts in real Chromium while mocking only unavailable Chrome/network boundaries.
- Selection/PDF: execute production `content.js`, start selection through its captured runtime listener, click a real article DOM node, open the production download dialog, hold mocked `WEBCLIP_GENERATE_PDF` pending after `prepareForPrint()`, render through real Chromium PDF, and verify with `pdftotext` that selected article text is present while unselected noise is absent.
- Journal: execute production `public-suffix.js` + `journal.js` against the documented service-worker fallback boundary; mocked runtime returns bounded view metadata/page/get-many, and the real Journal DOM must render the fixture entry and correct `Полный (1)` count.
- Yandex mock: execute production `service-worker.js` inside a real browser Worker with mocked `chrome.*` and mocked `fetch`; drive `WEBCLIP_YANDEX_SET_MANUAL_TOKEN`, `WEBCLIP_YANDEX_SAVE_ROOT`, `WEBCLIP_YANDEX_TEST`, and `WEBCLIP_YANDEX_LIST_FOLDERS`. Verify account UID, creation/listing of `Upload`, `ReadmeLater`, `Backup`, OAuth header use, and that access token is present only in mocked session storage and not local storage.
- Normal Chrome/CfT unpacked path: run `WEBCLIP_CHROME_FOR_TESTING=/path/to/chrome node project_tools/browser_p1_007_unpacked_integration.js`. It must load the real temporary extension copy via CDP `Extensions.loadUnpacked` over `--remote-debugging-pipe`, never guess extension IDs, and exercise real selection → debugger PDF/download → Journal → HTTP Yandex mock flow.
- If managed Chromium returns `P1-007_BROWSER_POLICY_BLOCKED` for `Extensions.loadUnpacked`, this is environment evidence, not a test skip or a reason to weaken the unpacked runner. Real unpacked Chrome/Yandex release QA remains mandatory before manifest `0.9.9`.
- Run `node project_tools/test_p1_007_browser_harness.js` to protect both runner boundaries.
- P1-127 regression: `journalHealthTimer` must have an explicit lifecycle handle before `scheduleJournalHealthCheck()`; `test_p1_123_127_extension_api_deadlines.js` protects this browser-discovered defect.

### P1-146 — automatic Blob download start late settlement

- Force automatic `chrome.downloads.download({saveAs:false})` to remain unresolved past the 15-second caller deadline. The request must return an explicit pending/unknown-settlement result; the durable `pendingDownloads` intent and Blob URL must remain present and no second `downloads.download()` may be started automatically.
- Resolve the original Chrome promise after the local timeout. The same intent must bind to that late `downloadId`, Blob lifecycle tracking must start, and the unresolved-start admission slot must be released only after this actual settlement.
- Reject the original Chrome promise after the local timeout. Intent removal and Blob revoke must happen only after the actual rejection; OperationLog must receive the late error.
- Keep four automatic download-start promises unresolved and attempt a fifth. The fifth must fail before invoking another Chrome side effect and must clean only its not-started intent/Blob.
- Both `generatePdfAndDownload()` and `downloadCachedPdf()` must route through the P1-146 helper and content UI must distinguish `downloadStartPending` from a completed/started download.
- Run `node project_tools/test_p1_146_download_start_settlement.js` and the full deterministic suite. Manifest remains `0.9.8`; real Chrome/Yandex release QA remains mandatory.

### P1-008 — безопасный экспорт/импорт пользовательских настроек

- `node project_tools/test_p1_008_user_settings.js`: проверить schema `webclip-user-settings` v1, explicit non-secret storage allowlist, reject secret/unknown fields до writes, сохранение внутренних non-user полей `yandexConfig`, отсутствие любого `storage.session` доступа.
- Подтвердить, что все 8 переносимых значений и durable import marker записываются одним bundled `chrome.storage.local.set`, а actual rejection не меняет старые настройки.
- Смоделировать timeout bundled `storage.set`: UI/result должен быть `pending/unknown settlement`, второй write не стартует; late success применяет тот же bundle, запускает `settings-import-late` reconciliation и удаляет marker.
- Проверить worker-start recovery marker: `reconcileUserSettingsImportMarker('worker-start')` восстанавливает backup scheduler и очищает marker.
- `/opt/pyvenv/bin/python project_tools/browser_p1_008_user_settings.py`: production Options DOM/JS должен экспортировать JSON, принять file input, показать неизменность OAuth session и не содержать OAuth/PKCE secrets в экспортированном документе.
- Повторить `browser_p1_007_managed_integration.py`, полный deterministic suite и `node --check`. Manifest остаётся `0.9.8`; настоящий unpacked release QA по-прежнему обязателен.

## P1-074 — bounded file-page import staging

1. Смоделировать зависший `indexedDB.open()` в `journal.html`: через 10 с UI получает ошибку; поздний `onsuccess` закрывает DB и не продолжает staging.
2. Смоделировать hung chunk/manifest readwrite transaction: через 60 с `tx.abort()` и import не переходит к preview.
3. Service-worker staged manifest/chunk read: hung readonly transaction abort/reject с `JOURNAL_IMPORT_STAGING_TIMEOUT` не позднее 20 с.
4. Staged cleanup/delete: hung transaction abort/reject; повторный импорт не должен ждать бесконечно старый staging.
5. Normalized import-staging write/delete timeout abort-ит transaction; atomic replace старого Journal не выполняется после staging failure.
6. Deterministic regression: `node project_tools/test_p1_074_import_staging_deadlines.js`.

## C44 — preview receipt, SHA-256 and revision CAS

1. `node project_tools/test_c44_import_preview_receipt.js`: verify SHA-256 standard vectors and irregular incremental chunk boundaries against Node crypto.
2. Reject missing/extra receipt fields, unsupported mode/version, invalid digest/generation/bounds and caller staging/source/operation mismatches with `JOURNAL_IMPORT_PREVIEW_MISMATCH`.
3. Re-read the same staging generation and reject digest/generation/count/export-time mismatch before Journal replacement.
4. Preserve Journal and all pending stores when the expected Journal revision changes after preview; compare again inside the destructive transaction before `beginReplace()`.
5. Through the actual unpacked Journal UI, preserve staging key, manifest, generation and byte length while changing only valid backup bytes; confirmation must show A's digest and commit must reject B on `contentSha256`.
6. Through separate real-UI schedules, prove stale revision rejection, unchanged clean-import success and the truthful full-browser-restart boundary.
7. Keep native Save As, remote Yandex recovery and any explicit merge behavior outside this local synthetic-data control.
