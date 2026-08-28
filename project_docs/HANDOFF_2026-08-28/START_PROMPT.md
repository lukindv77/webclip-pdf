# START PROMPT — WebClip PDF / продолжение разработки и глубокого аудита

Продолжаем проект **WebClip PDF / расширение Chrome** из репозитория `lukindv77/webclip-pdf`.

## Главный источник истины

Сначала синхронизируйся с GitHub `main` и считай **текущее состояние репозитория главным источником истины**. Handoff был подготовлен от audit-baseline HEAD:

`53c8b18634cdd5d807363a85c6ff40efc266fa66`

После добавления самого handoff HEAD станет новее. Поэтому первым действием:
1. получи свежий HEAD `main`;
2. открой каталог `project_docs/HANDOFF_2026-08-28/`;
3. прочитай `README.md`, `CURRENT_STATE.md`, `AUDIT_PROGRESS.md`, `ARCHITECTURE_INVARIANTS.md`, `NEXT_WORK.md`;
4. открой `project_docs/PRIORITIES_P0_P1_P2.md` и последние `project_docs/AUDIT_DELTA_*.md`;
5. только после этого продолжай работу.

## Как продолжать аудит

Продолжай **глубокий аудит несколькими крупными объёмами по множеству блоков**. Каждую новую сессию начинай минимум с **10 крупных блоков**, оценивай шанс закончить их в той же сессии и риск переноса. Если тема уже полностью покрыта canonical priorities или audit delta — не дублируй, а замени её соседней незакрытой границей.

Перед любым новым P-номером делай repository-wide semantic duplicate-check по canonical priorities + всем актуальным audit deltas. Последние назначенные в предыдущих сессиях номера включают P0-080 и P1-211…P1-217, но **не предполагай, что следующий номер свободен**: сначала проверь текущий `main`.

Каждый завершённый audit finding/positive-control оформляй lossless отдельным `project_docs/AUDIT_DELTA_*.md` и коммить в `main`. Не переписывай массово старые canonical docs без необходимости. Если runtime не менялся, не изображай новый test gate и не делай Release.

## Критические правила корректности

Архитектурная модель проекта строится вокруг:
- exact generation / immutable receipt / CAS;
- различия `not-admitted`, `unknown`, `verified`, `superseded`;
- запрета считать caller timeout отменой non-cancellable Chrome/Yandex side effect;
- exact document/application generation вместо одного `tabId` или URL;
- exact Yandex account/auth/root/config context вместо независимых fresh reads;
- exact physical DownloadItem/remote-object identity вместо filename/path/size эвристик;
- durable recovery receipt отдельно от очищаемой diagnostics/OperationLog;
- portable backup schema отдельно от внутренних runtime/recovery полей;
- old async generation никогда не получает право переписать более новую user-visible state.

Не исправляй найденные симптомы локальными «retry/clear/reset» патчами, если они нарушают эти инварианты.

## Состояние runtime/test/release

`manifest.json` на момент handoff:
- version `0.9.8`;
- Manifest V3;
- minimum Chrome `118`.

`PRIORITIES_P0_P1_P2.md` уже ведёт работу как `0.9.9 WIP`, но runtime manifest пока 0.9.8.

Последнее историческое доказательство тестов: **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Эти тесты **не перезапускались** после большого массива docs-only audit commits. Не называй их новым gate текущего HEAD. Real unpacked Chrome QA и реальные Yandex E2E остаются отдельными release checks.

## Где продолжить в первую очередь

После синхронизации проверь `NEXT_WORK.md`. На момент handoff наиболее перспективны:
- SPA / same-document application generation (P0-080) и все команды/selection/template/save boundaries;
- source-page operation admission: popup/context-menu/direct Start/Journal Apply vs active upload generation;
- Yandex account/auth generation для multi-request folder/root/remote operations;
- local-download exact `downloadId` / bind-pending receipt / recovery;
- backup lease vs unbounded auth/config prerequisite (P1-076 + P1-158 correction);
- remaining cross-frame exact document + rollback/permission generations;
- destructive Journal confirmation/operation receipts after page loss or revision advance.

## Стиль работы

- GitHub `main` — source of truth.
- Давай краткие progress updates каждые несколько tool calls.
- Не заявляй о тестах, которые не запускал.
- Не создавай build/tag/Release при docs-only изменениях.
- В конце каждой сессии проверяй HEAD/compare и перечисляй реально созданные commits.
- При обнаружении ошибки в собственном аудите делай correction delta, а не замалчивай её (пример: backup lease correction вокруг P1-034/P1-076/P1-158 уже есть в истории).

Начни с fresh HEAD-check и кратко подтверди, какие handoff-файлы прочитаны. Затем предложи план минимум из 10 крупных блоков и продолжай аудит без потери текущей архитектурной модели.
