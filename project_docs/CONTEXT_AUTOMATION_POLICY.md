# Permanent context / research / development automation policy

Этот документ фиксирует постоянные правила использования GitHub как машиночитаемой памяти проекта WebClip PDF. Он **не является** источником текущего статуса P-кодов, тестов или релиза.

Canonical authorities остаются:

- source/WIP tree — fresh `main` exact commit SHA;
- P-owner/status — `RESEARCH_REGISTRY.md`;
- detailed research proof — consolidated `RESEARCH_FAMILY_*_EVIDENCE.md` + history/cross-cutting evidence;
- current automated test truth — exact GitHub Actions run + `TEST_STATUS.md` как current narrative;
- release truth — `RELEASE_READINESS.md`.

## Постоянная продуктовая цель WebClip PDF и обязательные правила глубокого исследования

Главная цель существования WebClip PDF — **максимально качественно, точно и удобно позволять пользователю выделять нужную область веб-страницы, снимать максимально faithful копию выбранного содержимого и сохранять её для последующего чтения и/или долгосрочного архивного хранения**. PDF, Journal, backup/recovery, cloud storage, permissions, UI и остальные подсистемы оцениваются в том числе по тому, насколько они поддерживают эту основную цель.

### Selection fidelity — корректное и удобное выделение

Глубокий исследование обязан рассматривать пользовательское выделение как критический продуктовый контракт. Нужно проверять не только работу UI рамки/области, но и соответствие между тем, **что пользователь фактически видел и выбрал**, и тем, **что затем было захвачено и сохранено**.

Обязательные классы проверки включают как минимум:

- viewport/scroll, long pages и nested scrolling containers;
- browser zoom, CSS zoom, `devicePixelRatio`, transforms и разные coordinate spaces;
- fixed/sticky/overlay элементы и layout shifts;
- lazy loading, delayed rendering и динамически меняющийся DOM;
- SPA navigation, same-URL document replacement и stale selection state;
- iframe, cross-origin frame boundaries, frame/document identity и reload/navigation;
- shadow DOM и компоненты со сложной геометрией;
- изменение страницы между выбором, capture, print/render и сохранением;
- корректное восстановление страницы после любых временных mutation, применённых расширением.

Любое существенное расхождение между пользовательским намерением `я выделил это` и фактическим результатом `расширение сохранило другое` считается существенным WebClipping finding и должно анализироваться на root cause/owner.

### Archival fidelity — качество и точность сохранённой копии

Успешный API call, download или наличие PDF-файла сами по себе не доказывают успех WebClipping. Исследование обязан оценивать конечный результат как архивную копию конкретного состояния страницы и проверять, насколько она пригодна для последующего чтения и хранения.

Проверка должна включать как минимум:

- полноту и порядок текста;
- изображения, background images, SVG, canvas и другие визуальные ресурсы;
- layout, размеры, переносы, clipping/overflow и page breaks;
- fonts, styles, colors и существенные визуальные свойства;
- links и пригодность результата для последующего чтения;
- content outside viewport и long-page completeness;
- fixed/sticky content, чтобы он не терялся и не дублировался ошибочно;
- iframe/content boundaries там, где capture технически и по permissions допустим;
- отсутствие временных служебных DOM/style artifacts самого расширения;
- отсутствие случайной модификации исходной страницы после завершения операции;
- соответствие сохранённой копии именно той logical page/document generation, которую пользователь намеревался зафиксировать.

Ключевой invariant глубокого исследования:

**Selection intent -> captured source state -> rendered archival copy должны относиться к одной и той же логической версии документа, frame identity и выбранной области либо система обязана честно сигнализировать degraded/unknown/retry вместо выдачи неточного результата как успешного.**

### Обязательное внешнее исследование WebClipping

Глубокий исследование **обязан регулярно изучать опыт других разработчиков, вендоров и пользователей похожего WebClipping/WebArchiving функционала**, а не ограничиваться внутренним кодом проекта.

При релевантных вопросах нужно использовать внешнее исследование, включая глубокое исследование нескольких независимых источников, и изучать:

- архитектуры и технические подходы других WebClipping/WebArchiving решений;
- доступный open-source код, алгоритмы capture/snapshot/render/serialization и их trade-offs;
- issues, bug reports, discussions, postmortems и известные browser/platform limitations;
- пользовательские истории, complaints, usability problems и ожидания от clipping/archive fidelity;
- подходы к area selection, full-page capture, DOM snapshotting, print pipelines, offline copies, iframe/shadow DOM, dynamic/lazy content и long-page rendering;
- поведение решений уровня browser extensions, archival tools и vendor clipping products там, где сравнение помогает обнаружить пропущенный failure mode или более сильную архитектуру.

Внешняя реализация не считается автоматически правильной. Чужой опыт используется как источник гипотез и известных failure modes, после чего вывод обязательно проверяется против fresh `main`, текущей архитектуры и фактического поведения WebClip PDF.

Если исследование обнаруживает:

1. конкретный дефект/риск текущей реализации — выполнить обычный duplicate/root-cause check и привязать finding к существующему owner либо предложить новый owner по принятому процессу;
2. архитектурное улучшение, необходимое для fidelity/reliability основной WebClipping функции — вынести пользователю конкретное предложение с преимуществами, рисками и местом изменения;
3. новую продуктовую возможность, способную заметно улучшить selection UX, capture fidelity, archive readability или долговечность результата — предложить пользователю и, если это действительно новая accepted backlog-работа, оформить как P2 только после проверки `RESEARCH_REGISTRY.md`, family evidence, history и Git на отсутствие существующего owner/duplicate.

### Поведение глубокого исследования относительно основной цели

Приоритизация findings должна учитывать продуктовый impact. При прочих равных дефект, который способен привести к неверному выделению, неполному/неточному capture, потере части страницы, сохранению не той document generation или созданию misleading archival copy, имеет более высокий вес, чем внутренний дефект сопоставимой технической сложности, не влияющий на основное назначение расширения.

Глубокий исследование должен активно пытаться опровергать предположения реализации через controlled schedules: reorder, timeout, late settlement, worker restart, navigation/reload, frame reuse, permission revoke/regrant, account/root switch, DOM/layout change, clear/import races и stale UI. Цель — установить, какие invariants действительно гарантируются кодом, а какие только предполагаются.

### Defensive security scope — конфиденциальность, целостность, хранение и передача данных

Вопросы безопасности в глубоком исследовании WebClip PDF рассматриваются **только как defensive security / защитный архитектурный анализ**. Цель — определить, насколько проект защищает данные пользователя и учетные данные расширения при хранении, обработке и передаче во внешние сервисы/API.

В security-scope входят:

- конфиденциальность и целостность PDF, SelectionSnapshot, Journal, backup/recovery, cache, OperationLog, настроек и иной extension-owned информации;
- безопасное хранение OAuth/access credentials, account/root/config context и иных секретов расширения с корректным разделением session/durable lifetime и минимально необходимой retention;
- минимизация, redaction и отсутствие случайной долговременной фиксации чувствительных URL, metadata, locator-context, диагностических или пользовательских данных;
- передача файлов и метаданных во внешние сервисы/API только в рамках ожидаемого endpoint/account/root/operation context, с проверяемой транспортной и operation identity;
- недопущение смешивания данных, credentials, cache/recovery authority или результатов между вкладками, document/application generations, операциями, аккаунтами и внешними target contexts;
- целостность backup/export/import, upload/download/retry/recovery receipts и честное различение verified / unknown / failed settlement;
- безопасная обработка redirects, signed/capability URLs, внешних API-ответов и credential-bearing запросов без раскрытия учетных данных в durable metadata, URL или diagnostics;
- корректное удаление, lifecycle/retention и восстановление данных без ложного утверждения об удалении или успешном сохранении.

Не входят в scope и не должны становиться задачами исследования:

- поиск или разработка способов эксплуатации уязвимостей;
- создание exploit/PoC для проникновения или обхода защитных механизмов;
- обход авторизации, подбор способов взлома сервисов или получение несанкционированного доступа;
- проведение атак на сайты, внешние сервисы, API, браузер или инфраструктуру;
- создание вредоносного кода либо инструкций по проникновению, компрометации или захвату систем.

Если для оценки риска необходимо назвать класс угрозы, он описывается **только концептуально**: какие данные/authority защищаются, при каком условии возникает риск и какой defensive invariant/механизм должен его закрыть. Эксплуатационные шаги, offensive methodology и инструкции по использованию слабости не требуются и не документируются.

Это ограничение security-scope не сужает обычный исследование correctness, reliability, concurrency, generation/receipt, rollback, performance, selection fidelity и archival fidelity, когда эти вопросы сами по себе не являются offensive-security анализом.

## Постоянный триггер перехода в новый чат

Точная фраза пользователя:

**«Подготовь переход в новый чат»**

всегда означает: немедленно начать безопасную подготовку к новому чату, даже если текущая разработка, исследование, PR, исследование или обсуждение не завершены.

### Обязательный handoff-порядок

1. Fresh-fetch `main`, зафиксировать exact current SHA и убедиться, что canonical post-merge CI state известен.
2. Проверить open Pull Request, open Issue и существующую рабочую ветку/commit state.
3. Не завершать работу искусственно: не закрывать P-owner, не менять research status, не объявлять acceptance/DONE и не выполнять release только ради перехода между чатами.
4. Если существенная незавершённая работа уже представлена open Pull Request — сохранить её там; PR body должен позволять восстановить task scope, P-owner/impact и remaining work.
5. Если PR отсутствует, но существует существенный незавершённый контекст, который иначе потеряется, создать/обновить open Issue/checkpoint. Такой Issue — только рабочая точка продолжения, не второй source of truth и не основание автоматически резервировать новый P-код.
6. Если есть рабочая branch с полезными commits и без PR, сохранить exact head и открыть draft/normal PR, когда это безопаснее потери branch-state. Не merge незавершённую работу ради handoff.
7. Проверить `CONTEXT_MANIFEST.json` и `RESTORE_PROMPT.md`; если они устарели из-за уже принятого текущего изменения, синхронизировать их нормальным PR-first способом до handoff либо явно зафиксировать remaining synchronization work в checkpoint.
8. После подготовки GitHub выдать пользователю готовый prompt для нового чата. Prompt должен требовать fresh-fetch `main`, чтение `CONTEXT_MANIFEST.json` и bootstrap-набора, проверку open PR/open Issue и продолжение незавершённой работы без предположения о её завершении.
9. Новый чат после такого prompt обязан сначала восстановить фактический GitHub state, а уже затем продолжать обсуждение/разработку/исследование.

## 14 постоянных правил автоматизации

### 1. Context bootstrap

Поддерживать `CONTEXT_MANIFEST.json` как машинную навигацию, а `RESTORE_PROMPT.md` — как короткую инструкцию старта. Они не дублируют current status. CI должен ловить broken/retired context references. В PR body для существенной работы желательно сохранять короткие `context-delta` и `remaining-work`.

### 2. P work index

Поддерживать/развивать машинный `P_WORK_INDEX` как навигацию `P-code -> family/source/tests/external acceptance/related owners`, но никогда не хранить в нём competing current status; status всегда читается из `RESEARCH_REGISTRY.md`.

### 3. Research coverage matrix

Автоматически строить производную матрицу `P-code -> evidence -> source -> deterministic tests -> external verification`. Она предназначена для обнаружения дыр покрытия, а не для автоматического изменения статуса owner.

### 4. Differential research

Для runtime/research PR автоматически анализировать exact `base...head`, sensitive/trust-boundary surface и потенциально затронутые owners. Результат — risk navigation; он не имеет права автоматически назначать P-owner или менять `RESEARCH_REGISTRY.md`.

### 5. Regular deep research split

GitHub Actions регулярно добывает детерминированные факты: consistency, indexes, static/surface signals, tests and reproducible schedules. Семантический глубокий исследование выполняется ChatGPT по fresh `main`/current evidence. Не помещать LLM verdict в CI как автоматический authority и не хранить OpenAI secret только ради такого исследования.

### 6. Seeded race/concurrency sweeps

Для generation/late-settlement/MV3/restart/CAS классов постепенно поддерживать расширенные reproducible seeded schedules. Найденный дефект должен ссылаться на воспроизводимый seed/schedule; случайный fuzz без воспроизводимости не является достаточным evidence.

### 7. P work packet

Перед разработкой P0/P1/P2 формировать рабочий пакет: canonical owner/acceptance, relevant family evidence, architecture, source files/symbols, deterministic tests, related owners, external verification и relevant Git/PR history.

### 8. `p_context` fast path

Развивать команду/скрипт, позволяющий по одному P-коду получить компактный machine/human-readable work packet, включая JSON mode. Это ускоритель навигации, не authority.

### 9. P-to-test metadata

Связывать targeted deterministic tests с P-кодами машинно читаемым metadata/index. Targeted P-tests используются для быстрого feedback, но никогда не заменяют полный repository integrity suite перед merge.

### 10. Root-cause clusters

Поддерживать производные связи `cluster / related / depends_on`, чтобы планировать fixes по общему root cause и по возможности закрывать несколько owners одним архитектурно корректным изменением. Cluster не заменяет individual P-owner/status.

### 11. Issues only for real active work

Не создавать сотни GitHub Issues задним числом по `RESEARCH_REGISTRY`. Issue создаётся только для фактически выполняемой незавершённой работы, нового finding или handoff checkpoint. Registry остаётся authority по P-owner/status.

### 12. PR review automation

При появлении/изменении runtime/research PR выполнять exact base/head review: research-impact, owner, evidence, tests, architecture, sensitive surface и acceptance. Если текущая интеграция не поддерживает надёжный event trigger, не притворяться, что review автоматизирован: запускать его по доступному condition/schedule/user trigger до появления поддерживаемого event mechanism.

### 13. Post-merge review automation

После merge проверять canonical `main`, отдельный post-merge CI, фактический registry/evidence state, remaining work и следующую логичную owner/cluster задачу. Такой отчёт рабочий и не является новым status authority.

### 14. Regular GitHub health review

Проводить read-only health review по принятому steady-state threshold и/или безопасному schedule: repository posture, branches, open PR/Issues, permanent workflows/pins, Dependabot scope, context manifest, P/research indexes, historical Releases/tags и broken references. При отсутствии drift cleanup commit не создавать.

## Общие ограничения всех автоматизаций

- Не создавать второй current status registry.
- Не переводить P-code в DONE/IMPLEMENTED автоматически только по тесту, static signal или LLM conclusion.
- Не выполнять build/tag/Release автоматически.
- Не удалять historical evidence/tags/releases без отдельного lossless retirement proof.
- Не давать workflow write permissions, если read-only verification достаточно.
- Не хранить единственное research evidence только в ephemeral Actions artifact/log.
- Любая автоматическая рекомендация, затрагивающая architecture/research truth, проходит обычный PR-first review и явное принятие там, где этого требует проектный процесс.