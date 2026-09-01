# Текущие технические ограничения и замечания — WebClip PDF

Status: **CANONICAL CURRENT LIMITATIONS**

Этот документ фиксирует только ограничения, актуальные для текущего состояния проекта. Он не является журналом версий или историей изменения требований. Исторические формулировки доступны через Git history и не должны использоваться для реконструкции current requirements.

## Chrome sandbox и каталог расширения

Обычное Chrome Extension не имеет произвольного чтения/записи файловой системы и не должно использовать каталог установленного расширения как изменяемую runtime-базу. Для произвольной пользовательской папки потребовался бы отдельный browser-supported file access flow либо Native Messaging/local helper.

**Следствие:** Journal, operational state и настройки хранятся в предназначенных для extension storage mechanisms, а не в installation directory.

## IndexedDB / storage и extension identity

IndexedDB и `chrome.storage.*` принадлежат origin/identity установленного расширения. Другая независимая extension identity не получает автоматический доступ к данным предыдущей установки.

**Следствие:** переносимые export/import flows нужны для данных и настроек, которые пользователь должен переносить между профилями/установками.

## `chrome.debugger` / `Page.printToPDF`

Текущий PDF pipeline использует `chrome.debugger` и Chrome DevTools Protocol `Page.printToPDF`. Chrome может показывать пользователю индикатор подключения debugger.

**Следствие:** это видимая browser permission/runtime boundary текущей архитектуры и должна учитываться в UX и real Chrome QA.

## Статическая природа PDF

PDF является статическим архивным представлением. Видео, canvas, сложные интерактивные widgets, iframe, Shadow DOM, animations и custom components сохраняются только настолько, насколько текущая capture/representation architecture и Chromium способны корректно представить их в статическом render cut.

**Следствие:** «сохранить содержимое» не означает сохранить интерактивное runtime-поведение приложения внутри PDF. Fidelity оценивается по `WEBCLIP_PDF_FIDELITY_CONTRACT.md`.

## Bounded resource preparation не является offline bundling

Перед печатью WebClip bounded-подготавливает lazy images, CSS backgrounds и используемые fonts выбранного содержимого. Действуют ограниченные task/scan/concurrency/deadline boundaries.

WebClip при этом не становится произвольным сетевым crawler и не скачивает все response bytes страницы в self-contained offline bundle.

**Следствие:** недоступный внешний ресурс может остаться отсутствующим в PDF и должен отражаться в truthful resource diagnostics, а не маскироваться как гарантированно embedded resource.

## Disclosure / spoilers

Универсально определить безопасный «спойлер» произвольного приложения невозможно. Текущая архитектура допускает только безопасную native/inert/static representation и не даёт WebClip право выполнять arbitrary page-owned click/submit/navigation/business logic.

**Следствие:** часть нестандартного скрытого контента может потребовать пользовательского действия или остаться явно ограниченной, если безопасная статическая representation недоступна.

## «Основной контент» и «Найти рекламу»

Обе функции эвристические.

- «Основной контент» может предложить неидеальный container.
- «Найти рекламу» только подсвечивает кандидатов и не создаёт области «Исключены» автоматически.

**Следствие:** пользователь сохраняет authority над итоговым selection state.

## Yandex OAuth credentials

Access/session credentials browser extension не эквивалентны hardware/OS credential vault. Client Secret не используется как встроенный extension secret, потому что распространяемый extension package доступен пользователю и secret из него извлекаем.

Текущая архитектура не должна строить refresh-flow, требующий встроенного Client Secret; при необходимости повторной авторизации используется поддерживаемый user-visible OAuth flow.

**Следствие:** credential lifetime, storage scope, redaction и account/root identity остаются defensive-security boundaries.

## Public Suffix List

Проект использует bundled Public Suffix List resolver, генерируемый `project_tools/build_public_suffix_js.py` из `public_suffix_list.dat`; текущий `public-suffix.js` явно идентифицирует этот источник.

**Ограничение:** bundled PSL является snapshot внутри конкретного Git commit и не обновляется сам по сети во время работы extension.

**Следствие:** корректность для новых/изменённых public suffix rules зависит от своевременного обновления source dataset и регенерации bundled resolver обычным reviewed project change.

## Имя файла и символы

Лимит имени WebClip задаётся на уровне пользовательского правила количества символов и browser/JavaScript normalization. Это не универсальная гарантия одинакового byte-length ограничения для всех файловых систем.

**Следствие:** filename contract ориентирован на переносимость и ограничение длины, но не заменяет правила конкретной ОС/файловой системы.

## Retry / operation identity

Retry одного сохранения должен использовать operation-owned PDF bytes, но asynchronous browser/storage/network boundaries могут иметь unknown settlement и generation/identity risks.

Current owner/status таких границ определяется только `RESEARCH_REGISTRY.md`; этот документ не переопределяет их состояние.

**Следствие:** timeout не считается доказательством cancellation/rollback, а weak path/size/tab identity не должна автоматически превращать неизвестный результат в verified success.

## Journal restore — recipe, а не immutable DOM snapshot

Selection snapshot хранит данные, достаточные для повторного поиска областей, но страница может измениться между сохранениями.

**Следствие:** restore может быть partial/ambiguous и должен fail-closed или явно сообщать confidence/limitations; пользователь проверяет восстановленный selection перед новым сохранением.

## Frame-aware ограничения

Same-origin frames доступны в рамках browser DOM rules. Cross-origin frames требуют применимого user-granted host permission и frame agent; exact document/frame identity должна быть доказана.

**Следствие:** WebClip не обещает обход Same-Origin Policy или гарантированный DOM-доступ к любому cross-origin frame. Navigation/reload/frame reuse могут требовать re-handshake/reconciliation.

## Background scheduling

`chrome.alarms` не является real-time scheduler и не выполняется, когда соответствующая browser execution environment недоступна.

**Следствие:** background backup использует overdue/retry reconciliation и семантику «выполнить при первой возможности», а не обещание запуска в точную секунду.

## `beforeunload` — защита от случайного закрытия, не запрет

Browser `beforeunload` может показать системное предупреждение, но окончательное решение о закрытии/перезагрузке остаётся за браузером/пользователем.

**Следствие:** UI должен описывать механизм как best-effort protection from accidental interruption, а не как абсолютную блокировку вкладки.

## `publicUrl` и публикация Yandex resource

Сохранённый `publicUrl` требует публикации ресурса и делает его доступным обладателю ссылки до снятия публикации.

**Следствие:** настройка должна быть явно понятна пользователю; `publicUrl` нельзя считать private credential-free locator без privacy impact.

## Journal отражает локально подтверждённую историю

Action icon/badge и Journal строятся на локально сохранённых verified operation records, а не на непрерывном live inventory всего Яндекс Диска.

**Следствие:** ручное удаление/повреждение локальной истории или внешнее изменение remote resource может привести к расхождению с фактическим состоянием Диска; recovery/reconciliation не должен скрывать такую неопределённость.

## Extension pages после reload/update

При reload/update unpacked extension Chrome может инвалидировать JavaScript context уже открытой `chrome-extension://` страницы, хотя старый DOM визуально ещё остаётся на экране.

**Следствие:** открытые extension pages должны reload/reconnect либо явно сигнализировать stale context; молчаливое продолжение работы на старом execution context недопустимо.

## Recovery artifact

Offline recovery ZIP является опциональным derived disaster-recovery artifact exact clean Git commit, а не обязательной частью каждой пользовательской сборки и не параллельным source of truth.

**Следствие:** если recovery artifact создаётся, он строится после фиксации exact clean commit, содержит source identity/hashes и проверяется как representation этого commit. Обычная разработка восстанавливается из fresh GitHub `main` и current baseline.

## Источник истины для открытых ограничений

Этот файл описывает технические ограничения по роли. Если ограничение связано с конкретным research owner/finding, его current status определяется `RESEARCH_REGISTRY.md` и applicable fresh evidence. Историческая формулировка или старый PASS не изменяют current status.
