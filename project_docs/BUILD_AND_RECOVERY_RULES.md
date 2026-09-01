# Правила сборки и recovery

Status: **CANONICAL CURRENT POLICY**

## Канонический источник восстановления

**Точный Git commit ветки `main` является каноническим snapshot исходного кода и документации.**

Действующие требования и технические условия берутся из `USER_REQUIREMENTS.md`, а rationale — из `DECISIONS_AND_RATIONALE.md`. Исторические редакции требований не собираются для восстановления current state.

Для выпущенной версии создаётся immutable release pointer — annotated Git tag, указывающий на exact tested/released commit. Для официального релиза целевая политика — cryptographically signed annotated tag, когда release-signing реально настроен и проверяем.

GitHub Release и пользовательский ZIP являются производными артефактами и не заменяют commit/tag как source identity.

Следствия:

- пользовательский extension ZIP не обязан содержать вложенный полный recovery/source ZIP;
- generated ZIP не является source of truth;
- восстановление начинается с repository + exact commit/tag, если GitHub доступен;
- отдельный offline recovery artifact содержит exact source commit SHA и SHA-256 своего содержимого;
- официальный recovery artifact создаётся только из clean exact commit;
- release provenance должна позволять проверить цепочку `tag -> commit -> artifact -> SHA-256` без эвристик по имени/дате.

## Релизный порядок

При фактическом выпуске новой версии:

1. Завершить применимые runtime/docs изменения и required research owners/gates.
2. Выполнить required deterministic и real QA; historical PASS не заменяет current gate.
3. Изменить `manifest.json` version только после отдельного release decision.
4. Синхронизировать current requirements/architecture/test/release docs и `RELEASE_HISTORY_INDEX.md` в объёме, требуемом фактическим релизом.
5. Получить clean exact commit, содержащий выпускаемое состояние.
6. Выполнить release gate на exact candidate state либо доказать byte-identical tree относительно проверенного commit.
7. Создать annotated release tag на exact commit; при настроенном signing — signed annotated tag и проверить подпись.
8. Сформировать пользовательский extension ZIP из exact release commit/tag. Вложенный полный recovery ZIP не требуется.
9. При необходимости offline/disaster recovery отдельно запустить `project_tools/build_recovery_archive.py` на том же clean commit.
10. Рассчитать SHA-256 каждого официального бинарного артефакта и сформировать `SHA256SUMS`.
11. Если создаётся GitHub Release, прикрепить assets и `SHA256SUMS` к тому же release tag; указать exact full commit SHA и фактический signature status.
12. После публикации перепроверить tag→commit, checksums, assets и manifest/runtime version.

Git commit сам по себе не является релизом и не требует изменения manifest version. Docs/research cleanup не является основанием для build/tag/Release.

## Отдельный recovery artifact

`project_tools/build_recovery_archive.py` формирует самостоятельный offline/disaster recovery archive:

`project_recovery/WebClip_Project_Recovery_vX_Y_Z.zip`

Допустимое содержимое:

- `RECOVERY_README.md`;
- `BUILD_METADATA.json` с exact source commit SHA и applicable tags;
- `FILE_HASHES.sha256`;
- `project_docs/`;
- `source/` — один offline snapshot exact source commit без generated archives/secrets/caches.

Offline `source/` — резервное представление конкретного Git commit, а не независимая ветвь истины.

`project_tools/test_recovery_archive.py` является обязательным deterministic self-test recovery builder: clean temporary Git clone должен успешно собрать/проверить hashes/metadata, dirty clone должен быть отвергнут.

## Восстановление при доступном GitHub

1. Открыть canonical repository `lukindv77/webclip-pdf`.
2. Fresh-fetch current `main` либо разрешить явно требуемый exact release commit/tag.
3. Проверить exact SHA и, для signed release, подпись tag.
4. Прочитать `CONTEXT_MANIFEST.json` и фактический bootstrap.
5. Использовать `USER_REQUIREMENTS.md` + `DECISIONS_AND_RATIONALE.md` как current requirement/rationale baseline.
6. Читать historical requirement revisions только по конкретной необходимости, а не для сборки current state.
7. Для release assets сверить `SHA256SUMS`.

## Восстановление без GitHub из recovery artifact

1. Распаковать recovery ZIP.
2. Прочитать `RECOVERY_README.md` и `BUILD_METADATA.json`.
3. Проверить `FILE_HASHES.sha256`.
4. Использовать `source/` только как offline representation указанного `source_commit`.
5. Использовать current-baseline docs, находящиеся внутри exact snapshot, а не реконструировать требования из более старых файлов.
6. После восстановления Git-доступа сравнить tree/hashes и вернуться к canonical repository history.

## Handoff между чатами

Dated handoff не является состоянием проекта и не хранится как competing current source. Handoff переносит exact durable identity/resume point; новый чат всё равно выполняет fresh GitHub bootstrap.

## Что запрещено

- считать recovery/handoff archive актуальнее fresh canonical Git state;
- использовать historical requirement chain вместо current baseline;
- выпускать два competing source snapshots одной версии без доказанной byte identity;
- создавать официальный release/recovery из dirty tree;
- менять manifest version только из-за docs/research commit;
- выдавать generated ZIP как release до требуемого real Chrome/Yandex QA;
- заявлять signed/verified provenance без фактически проверенной подписи;
- публиковать официальный asset без checksum;
- делать build/tag/GitHub Release без отдельного явного release decision.
