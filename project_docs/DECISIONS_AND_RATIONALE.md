# Текущие архитектурные и проектные решения — WebClip PDF

Status: **CANONICAL CURRENT RATIONALE**

Этот документ объясняет **почему текущий проект устроен именно так**. Он содержит только действующие решения и их rationale; отменённые варианты и последовательность их изменения не являются current baseline и остаются в Git history.

Текущее «что требуется» задаёт `USER_REQUIREMENTS.md`. Текущее «как реализовано» задают `ARCHITECTURE.md`, `DATA_MODELS.md` и специализированные contracts. При конфликте с историческим документом сначала используется fresh `main` и current authorities из `CONTEXT_MANIFEST.json`.

## DOM selection и модель «Включены/Исключены»

**Решение:** выбирать DOM-блоки, а не только текстовые диапазоны, и хранить явные области `Включены` + `Исключены`.

**Почему:** архивная копия должна сохранять структуру, изображения, таблицы и ссылки; модель вложенного исключения естественно выражает «сохранить крупный блок, кроме явно вырезанных поддеревьев».

## Пользователь сохраняет authority над исключением контента

**Решение:** «Основной контент» предлагает/выбирает область «Включены», а «Найти рекламу» только подсвечивает кандидатов. Автоматическое удаление предполагаемой рекламы запрещено.

**Почему:** эвристическая ошибка не должна необратимо ухудшать архивную копию.

## Frame identity является частью selection identity

**Решение:** same-origin iframe являются полноценными selection scopes; локатор включает frame identity. Cross-origin frame обрабатывается только permission-gated frame agent с fail-closed identity.

**Почему:** полезный документ часто находится внутри frame, но fidelity нельзя достигать обходом Same-Origin Policy или неоднозначным сопоставлением frame.

## Печатный PDF через Chromium вместо screenshot→PDF

**Решение:** основной output строится через `Page.printToPDF`.

**Почему:** текст остаётся текстом, ссылки могут сохраняться как annotations, а документ обычно получается пригоднее для чтения и архивирования, чем полный raster screenshot.

## Screen-like representation перед печатью

**Решение:** print pipeline ориентируется на сохранение пользовательского экранного содержимого и не принимает page-owned `@media print` как безусловную истину результата.

**Почему:** многие сайты скрывают нужные блоки в print CSS, тогда как WebClip должен сохранять выбранное пользователем содержимое.

## Disclosure как inert/static representation

**Решение:** скрытый полезный контент раскрывается только безопасным нативным или inert/static способом; произвольные page-owned synthetic click/submit/navigation не выполняются.

**Почему:** host control может иметь бизнес-эффект, поэтому полнота PDF не должна покупать side effects на исходной странице.

## Print-generation ownership для временных mutations

**Решение:** временные ссылки, lazy-атрибуты, wrapper nodes, styles и другие изменения получают точное ownership текущей operation/print-generation и очищаются compare-before-restore/по exact receipt.

**Почему:** stale cleanup не имеет права перезаписывать более новое состояние host page.

## Изображения сохраняют навигационную связь с источником

**Решение:** изображение внутри `<a>` сохраняет исходную ссылку; обычное изображение получает безопасную навигационную связь с исходным URL в печатном представлении, когда это допустимо.

**Почему:** изображение является частью архивного контекста и должно по возможности позволять перейти к исходному ресурсу.

## Bounded resource preparation

**Решение:** перед печатью WebClip ограниченно подготавливает только ресурсы, уже связанные с selected DOM/CSS; extension-level arbitrary crawler/fetcher не создаётся.

**Почему:** это повышает completeness lazy/background/font content, сохраняя контролируемые time/memory/network boundaries и минимальный authority.

## Journal и retry state хранятся в IndexedDB

**Решение:** persistent Journal и operation-owned retry/recovery state используют IndexedDB расширения.

**Почему:** каталог установленного extension не является надёжным runtime storage, а MV3 service worker может выгружаться между шагами операции.

## `Весь журнал` независим от origin активной вкладки

**Решение:** full Journal view читает один persistent dataset; source-tab context применяется только к URL/site views и восстановлению selection.

**Почему:** глобальная локальная история не должна исчезать или меняться из-за того, какая вкладка была активной при открытии Journal.

## Один `rootPath` Яндекс Диска

**Решение:** пользователь выбирает один root; WebClip владеет служебными поддеревьями `Upload`, `Backup/Journal` и применимыми managed paths.

**Почему:** меньше настроек и меньше риска рассогласования путей; background/recovery flows могут сами проверять и создавать ожидаемую структуру.

## PKCE и отсутствие Client Secret в расширении

**Решение:** Yandex OAuth использует Authorization Code + PKCE и поддерживаемый fixed redirect; Client Secret не встраивается в extension.

**Почему:** любой secret в распространяемом browser extension извлекаем и не может считаться настоящим секретом.

## Retry использует те же operation-owned bytes

**Решение:** повторная отправка после сетевой ошибки использует уже сформированный PDF и не запускает новый render.

**Почему:** retry должен повторять одну и ту же logical operation, а не создавать другой документ с новым временем/DOM state.

## Remote success и identity должны быть доказуемыми

**Решение:** path/filename/size сами по себе не считаются достаточной object identity. Для Yandex entries сохраняется доступный locator context (`accountUid`, `rootPath`, `resourceId`, `publicUrl`, `remotePath`), а destructive/recovery действия используют fail-closed reconciliation.

**Почему:** пользователь может перемещать/переименовывать файлы, а unknown settlement нельзя превращать в success по слабому совпадению.

## Удаление remote PDF через managed Trash

**Решение:** опция удаления связанного Yandex-файла перемещает ресурс в `<root>/Trash/MM-YYYY`; локальная Journal entry удаляется только после подтверждённого move.

**Почему:** двухшаговая операция сохраняет recoverability и не должна удалять локальное свидетельство, если remote side effect не подтверждён.

## `publicUrl` отделён от пути файла

**Решение:** при включённой публикации Journal открывает Yandex PDF через сохранённый `publicUrl`, а не формирует долговечную ссылку из первоначального пути.

**Почему:** путь и имя изменяемы пользователем; опубликованная URL identity лучше переживает move/rename, при этом UI обязан предупреждать о доступе по ссылке.

## Versioned full Journal backup

**Решение:** каждый remote backup — отдельный полный JSON snapshot в `Backup/Journal/MM-YYYY`, без автоматического overwrite; restore требует явного выбора конкретного файла.

**Почему:** пользователь должен выбирать точку восстановления, а не зависеть от неявно «последней» версии.

## One-shot background scheduling и retry

**Решение:** normal backup schedule ориентируется на последний подтверждённый success, startup выполняет overdue reconciliation, failure получает отдельный retry schedule.

**Почему:** `chrome.alarms` не выполняется при закрытом браузере, поэтому periodic timer сам по себе не гарантирует семантику «выполнить при первой возможности».

## Усиленное подтверждение массовых destructive Journal операций

**Решение:** import/clear-domain/clear-all требуют случайного 9-значного read-and-type code; удаление одной записи — обычный confirm.

**Почему:** цена случайной массовой потери данных существенно выше цены удаления одной строки.

## Context menu использует общую state machine

**Решение:** popup/toolbar/context menu маршрутизируются к одной бизнес-логике.

**Почему:** независимые реализации одинаковой команды быстро расходятся и создают труднообнаружимые regression paths.

## Перенос настроек — allowlist без session credentials

**Решение:** `webclip-user-settings` экспортирует только явный allowlist пользовательской конфигурации; OAuth/session secrets, Journal, OperationLog и operation checkpoints не экспортируются. Импорт проходит bounded schema validation и bundled storage mutation.

**Почему:** перенос настроек не должен превращаться в перенос credential/session authority или создавать частично применённую конфигурацию.

## Git-first recovery

**Решение:** exact `main` commit SHA — canonical WIP identity; release state привязывается к exact tested commit + annotated tag; offline recovery ZIP является производным disaster artifact clean commit и не вкладывается обязательно в пользовательскую сборку.

**Почему:** Git уже предоставляет версионированную source identity. Дублирующий вложенный source archive создаёт второй потенциально расходящийся snapshot и усложняет provenance.

## Current baseline вместо реконструкции истории требований

**Решение:** `USER_REQUIREMENTS.md` содержит нормализованный current requirement/condition state, этот файл — current rationale; отменённые требования и последовательность их изменений не остаются частью обычного working context.

**Почему:** следующая работа должна исходить из одного непротиворечивого состояния «как принято сейчас», а не вычислять его заново из нескольких старых редакций. История остаётся доступной через Git только по необходимости.

## Внешнее исследование как обязательный источник гипотез

**Решение:** для каждого существенного вопроса **Комплексного исследования проекта** выполняется multi-source внешний обзор: аналоги/вендоры, public GitHub/GitLab проекты, issues/discussions, standards/platform docs и пользовательские дискуссии, где они релевантны. Ни один внешний подход не становится требованием автоматически.

**Почему:** другие реализации и пользовательский опыт помогают обнаружить failure modes и альтернативы, но архитектурное решение должно учитывать миссию WebClip, фактический `main`, trade-offs, безопасность, complexity и maintainability.

## Fresh GitHub state как обязательное начало и конец работы

**Решение:** содержательная работа начинается с fresh `main`; перед write/merge выполняются staleness/TOCTOU checks; принятую работу необходимо довести до canonical GitHub state, а не оставлять только в чате.

**Почему:** stale snapshot или chat-only decision создаёт параллельную реальность проекта.

## Инструментальное окно не ограничивает полноту исследования

**Решение:** **Комплексное исследование проекта** делится на столько interruption-safe sessions/tranches, сколько нужно для точного результата. Каждая часть оставляет durable resume point.

**Почему:** минимизация числа сессий не является целью; доказательность, полнота и корректная детализация важнее.

## Local-first execution и ограниченное использование GitHub Actions

**Решение:** доступные deterministic/static/analysis операции выполняются локальными или встроенными инструментами. GitHub Actions используется только когда локальная среда не может честно дать необходимое evidence либо когда workflow является обязательным independent delivery/release gate.

**Почему:** GitHub Actions minutes следует сохранять для независимых/environment-boundary проверок, не ослабляя exact-head/post-merge integrity, physical Chrome/external QA или другие обязательные gates.
