# Правила сборки и recovery

## Канонический источник восстановления

**Точный Git commit ветки `main` является каноническим snapshot исходного кода и документации.**

Для выпущенной версии дополнительно создаётся immutable release pointer — предпочтительно annotated Git tag, указывающий на exact tested/released commit. GitHub Release и пользовательский ZIP являются производными артефактами и не заменяют commit/tag как source identity.

Отсюда следуют правила:

- один и тот же source snapshot не должен обязательно дублироваться как вложенный recovery ZIP внутри пользовательского extension ZIP;
- generated ZIP не является source of truth;
- восстановление всегда начинается с repository + exact commit/tag, если GitHub доступен;
- любой отдельный offline recovery artifact обязан содержать exact source commit SHA и SHA-256 своего содержимого;
- recovery artifact нельзя считать соответствующим commit, если он создан из dirty working tree без явной фиксации этого состояния. Официальный recovery artifact создаётся только из clean exact commit.

## Релизный порядок

При фактическом выпуске новой версии:

1. Завершить runtime/docs изменения и applicable audit owners.
2. Выполнить требуемые tests/real QA; historical PASS не заменяет текущий gate.
3. Обновить `manifest.json` version только после release decision.
4. Обновить актуальные project docs и changelog.
5. Получить clean commit, содержащий ровно выпускаемое состояние.
6. Повторно выполнить release gate на состоянии, которое будет tagged/released, либо доказать byte-identical tree относительно проверенного commit.
7. Создать annotated release tag на exact commit.
8. Сформировать пользовательский extension ZIP **из этого commit**. В него не требуется вкладывать второй полный recovery ZIP.
9. При необходимости offline/disaster recovery отдельно запустить `project_tools/build_recovery_archive.py` на том же clean commit.
10. Если создаётся GitHub Release, прикрепить производные артефакты к этому tag и зафиксировать checksums.

Git commit сам по себе не является релизом и не требует изменения manifest version.

## Отдельный recovery artifact

`project_tools/build_recovery_archive.py` формирует самостоятельный архив:

`project_recovery/WebClip_Project_Recovery_vX_Y_Z.zip`

Его назначение — **offline/disaster recovery**, когда GitHub может быть недоступен. Он не должен вкладываться в пользовательский extension ZIP только ради дублирования исходников.

Допустимое содержимое recovery artifact:

- `RECOVERY_README.md`;
- `BUILD_METADATA.json` с exact source commit SHA и, если применимо, release tag;
- `FILE_HASHES.sha256`;
- `project_docs/`;
- `source/` — один offline snapshot исходников и project tools, без generated archives/secrets/caches.

Offline `source/` — резервная копия конкретного Git commit, а не независимая новая ветвь истины. При восстановлении SHA и hashes должны быть сверены с metadata.

## Восстановление проекта

### GitHub доступен

1. Открыть canonical repository `lukindv77/webclip-pdf`.
2. Разрешить требуемый exact commit/tag.
3. Проверить commit SHA.
4. Прочитать `project_docs/RESTORE_PROMPT.md`, `README_INDEX.md`, current audit/test registries и архитектуру.
5. Считать Git tree этого commit единственным exact source snapshot.

### GitHub недоступен, есть recovery artifact

1. Распаковать recovery ZIP.
2. Прочитать `RECOVERY_README.md` и `BUILD_METADATA.json`.
3. Проверить `FILE_HASHES.sha256`.
4. Использовать `source/` только как offline representation указанного `source_commit`.
5. После восстановления Git-доступа сравнить tree/hashes и вернуться к canonical repository history.

## Handoff между чатами

Handoff ZIP не является обязательным состоянием проекта и не создаётся после каждой P-задачи. Он формируется только по прямому запросу пользователя.

Если handoff создаётся:

- он должен ссылаться на exact Git commit SHA;
- не должен становиться параллельным source of truth;
- transient conversation context можно хранить отдельно от исходников;
- после успешной консолидации handoff может быть удалён из текущего дерева, поскольку commit/history сохраняют проектное состояние.

## Что запрещено

- считать вложенный recovery ZIP более актуальным, чем Git commit;
- выпускать два source snapshots одной версии без доказанной byte identity;
- создавать release/recovery из dirty tree как официальный exact snapshot;
- менять manifest version только из-за docs/audit commit;
- выдавать generated ZIP как релиз до требуемого real Chrome/Yandex release QA.
