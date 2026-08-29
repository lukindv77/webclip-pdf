# Правила сборки и recovery

## Канонический источник восстановления

**Точный Git commit ветки `main` является каноническим snapshot исходного кода и документации.**

Для выпущенной версии создаётся immutable release pointer — **annotated Git tag**, указывающий на exact tested/released commit. Для официального релиза целевая политика — криптографически подписанный annotated tag; если механизм подписи/ключ ещё не настроен, нельзя утверждать, что tag имеет verified signature, а отсутствие подписи должно быть явно видно как release-provenance gap до принятого решения пользователя.

GitHub Release и пользовательский ZIP являются производными артефактами и не заменяют commit/tag как source identity.

Отсюда следуют правила:

- один и тот же source snapshot не дублируется обязательным вложенным recovery ZIP внутри пользовательского extension ZIP;
- generated ZIP не является source of truth;
- восстановление всегда начинается с repository + exact commit/tag, если GitHub доступен;
- любой отдельный offline recovery artifact содержит exact source commit SHA и SHA-256 своего содержимого;
- официальный recovery artifact создаётся только из clean exact commit;
- release metadata должна позволять проверить цепочку `tag -> commit -> artifact -> SHA-256` без эвристик по имени файла/дате.

## Релизный порядок

При фактическом выпуске новой версии:

1. Завершить runtime/docs изменения и applicable audit owners.
2. Выполнить требуемые tests/real QA; historical PASS не заменяет текущий gate.
3. Обновить `manifest.json` version только после release decision.
4. Обновить актуальные project docs и changelog.
5. Получить clean commit, содержащий ровно выпускаемое состояние.
6. Повторно выполнить release gate на состоянии, которое будет tagged/released, либо доказать byte-identical tree относительно проверенного commit.
7. Создать annotated release tag на exact commit; при настроенном release-signing — создать **signed annotated tag** и проверить подпись до публикации.
8. Сформировать пользовательский extension ZIP **из этого commit**. В него не требуется вкладывать второй полный recovery ZIP.
9. При необходимости offline/disaster recovery отдельно запустить `project_tools/build_recovery_archive.py` на том же clean commit.
10. Рассчитать SHA-256 для каждого публикуемого бинарного артефакта и сформировать единый текстовый manifest `SHA256SUMS` (`<sha256>  <filename>`).
11. Если создаётся GitHub Release, прикрепить артефакты и `SHA256SUMS` к тому же release tag; в описании указать exact full commit SHA и статус подписи tag.
12. После публикации независимо перепроверить, что tag указывает на ожидаемый commit, checksums совпадают с загруженными assets, а manifest/runtime version соответствует release metadata.

Git commit сам по себе не является релизом и не требует изменения manifest version. Docs/audit cleanup не является основанием для нового tag/Release.

## Отдельный recovery artifact

`project_tools/build_recovery_archive.py` формирует самостоятельный архив:

`project_recovery/WebClip_Project_Recovery_vX_Y_Z.zip`

Его назначение — **offline/disaster recovery**, когда GitHub может быть недоступен. Он не вкладывается в пользовательский extension ZIP только ради дублирования исходников.

Допустимое содержимое recovery artifact:

- `RECOVERY_README.md`;
- `BUILD_METADATA.json` с exact source commit SHA и tags, указывающими на commit во время сборки;
- `FILE_HASHES.sha256` для содержимого recovery ZIP;
- `project_docs/`;
- `source/` — один offline snapshot исходников и project tools, без generated archives/secrets/caches.

Offline `source/` — резервная копия конкретного Git commit, а не независимая новая ветвь истины. При восстановлении SHA и hashes сверяются с metadata.

`project_tools/test_recovery_archive.py` является обязательным детерминированным self-test recovery builder: clean temporary Git clone должен успешно собрать и полностью проверить hashes/metadata; dirty clone обязан быть отвергнут.

## Восстановление проекта

### GitHub доступен

1. Открыть canonical repository `lukindv77/webclip-pdf`.
2. Разрешить требуемый exact commit/tag.
3. Проверить commit SHA и, для официального signed-tag релиза, подпись tag.
4. Прочитать `project_docs/RESTORE_PROMPT.md`, `README_INDEX.md`, current audit/test registries и архитектуру.
5. Считать Git tree этого commit единственным exact source snapshot.
6. Для release assets сверить `SHA256SUMS` с фактическими файлами.

### GitHub недоступен, есть recovery artifact

1. Распаковать recovery ZIP.
2. Прочитать `RECOVERY_README.md` и `BUILD_METADATA.json`.
3. Проверить `FILE_HASHES.sha256`.
4. Использовать `source/` только как offline representation указанного `source_commit`.
5. После восстановления Git-доступа сравнить tree/hashes и вернуться к canonical repository history.

## Handoff между чатами

Dated handoff не является состоянием проекта и не хранится в working tree. Если одноразовый handoff явно запросит пользователь, он создаётся как disposable export exact commit и после передачи не становится canonical source.

## Что запрещено

- считать recovery/handoff archive более актуальным, чем Git commit;
- выпускать два source snapshots одной версии без доказанной byte identity;
- создавать release/recovery из dirty tree как официальный exact snapshot;
- менять manifest version только из-за docs/audit commit;
- выдавать generated ZIP как релиз до требуемого real Chrome/Yandex release QA;
- заявлять signed/verified release provenance без фактически проверенной подписи;
- публиковать release asset без checksum, если он входит в официальный набор релиза.
