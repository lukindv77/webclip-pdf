# Permanent context / audit / development automation policy

Этот документ фиксирует постоянные правила использования GitHub как машиночитаемой памяти проекта WebClip PDF. Он **не является** источником текущего статуса P-кодов, тестов или релиза.

Canonical authorities остаются:

- source/WIP tree — fresh `main` exact commit SHA;
- P-owner/status — `AUDIT_REGISTRY.md`;
- detailed audit proof — consolidated `AUDIT_FAMILY_*_EVIDENCE.md` + history/cross-cutting evidence;
- current automated test truth — exact GitHub Actions run + `TEST_STATUS.md` как current narrative;
- release truth — `RELEASE_READINESS.md`.

## Постоянный триггер перехода в новый чат

Точная фраза пользователя:

**«Подготовь переход в новый чат»**

всегда означает: немедленно начать безопасную подготовку к новому чату, даже если текущая разработка, аудит, PR, исследование или обсуждение не завершены.

### Обязательный handoff-порядок

1. Fresh-fetch `main`, зафиксировать exact current SHA и убедиться, что canonical post-merge CI state известен.
2. Проверить open Pull Request, open Issue и существующую рабочую ветку/commit state.
3. Не завершать работу искусственно: не закрывать P-owner, не менять audit status, не объявлять acceptance/DONE и не выполнять release только ради перехода между чатами.
4. Если существенная незавершённая работа уже представлена open Pull Request — сохранить её там; PR body должен позволять восстановить task scope, P-owner/impact и remaining work.
5. Если PR отсутствует, но существует существенный незавершённый контекст, который иначе потеряется, создать/обновить open Issue/checkpoint. Такой Issue — только рабочая точка продолжения, не второй source of truth и не основание автоматически резервировать новый P-код.
6. Если есть рабочая branch с полезными commits и без PR, сохранить exact head и открыть draft/normal PR, когда это безопаснее потери branch-state. Не merge незавершённую работу ради handoff.
7. Проверить `CONTEXT_MANIFEST.json` и `RESTORE_PROMPT.md`; если они устарели из-за уже принятого текущего изменения, синхронизировать их нормальным PR-first способом до handoff либо явно зафиксировать remaining synchronization work в checkpoint.
8. После подготовки GitHub выдать пользователю готовый prompt для нового чата. Prompt должен требовать fresh-fetch `main`, чтение `CONTEXT_MANIFEST.json` и bootstrap-набора, проверку open PR/open Issue и продолжение незавершённой работы без предположения о её завершении.
9. Новый чат после такого prompt обязан сначала восстановить фактический GitHub state, а уже затем продолжать обсуждение/разработку/аудит.

## 14 постоянных правил автоматизации

### 1. Context bootstrap

Поддерживать `CONTEXT_MANIFEST.json` как машинную навигацию, а `RESTORE_PROMPT.md` — как короткую инструкцию старта. Они не дублируют current status. CI должен ловить broken/retired context references. В PR body для существенной работы желательно сохранять короткие `context-delta` и `remaining-work`.

### 2. P work index

Поддерживать/развивать машинный `P_WORK_INDEX` как навигацию `P-code -> family/source/tests/external acceptance/related owners`, но никогда не хранить в нём competing current status; status всегда читается из `AUDIT_REGISTRY.md`.

### 3. Audit coverage matrix

Автоматически строить производную матрицу `P-code -> evidence -> source -> deterministic tests -> external verification`. Она предназначена для обнаружения дыр покрытия, а не для автоматического изменения статуса owner.

### 4. Differential audit

Для runtime/audit PR автоматически анализировать exact `base...head`, sensitive/trust-boundary surface и потенциально затронутые owners. Результат — risk navigation; он не имеет права автоматически назначать P-owner или менять `AUDIT_REGISTRY.md`.

### 5. Regular deep audit split

GitHub Actions регулярно добывает детерминированные факты: consistency, indexes, static/surface signals, tests and reproducible schedules. Семантический глубокий аудит выполняется ChatGPT по fresh `main`/current evidence. Не помещать LLM verdict в CI как автоматический authority и не хранить OpenAI secret только ради такого аудита.

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

Не создавать сотни GitHub Issues задним числом по `AUDIT_REGISTRY`. Issue создаётся только для фактически выполняемой незавершённой работы, нового finding или handoff checkpoint. Registry остаётся authority по P-owner/status.

### 12. PR review automation

При появлении/изменении runtime/audit PR выполнять exact base/head review: audit-impact, owner, evidence, tests, architecture, sensitive surface и acceptance. Если текущая интеграция не поддерживает надёжный event trigger, не притворяться, что review автоматизирован: запускать его по доступному condition/schedule/user trigger до появления поддерживаемого event mechanism.

### 13. Post-merge review automation

После merge проверять canonical `main`, отдельный post-merge CI, фактический registry/evidence state, remaining work и следующую логичную owner/cluster задачу. Такой отчёт рабочий и не является новым status authority.

### 14. Regular GitHub health review

Проводить read-only health review по принятому steady-state threshold и/или безопасному schedule: repository posture, branches, open PR/Issues, permanent workflows/pins, Dependabot scope, context manifest, P/audit indexes, historical Releases/tags и broken references. При отсутствии drift cleanup commit не создавать.

## Общие ограничения всех автоматизаций

- Не создавать второй current status registry.
- Не переводить P-code в DONE/IMPLEMENTED автоматически только по тесту, static signal или LLM conclusion.
- Не выполнять build/tag/Release автоматически.
- Не удалять historical evidence/tags/releases без отдельного lossless retirement proof.
- Не давать workflow write permissions, если read-only verification достаточно.
- Не хранить единственное audit evidence только в ephemeral Actions artifact/log.
- Любая автоматическая рекомендация, затрагивающая architecture/audit truth, проходит обычный PR-first review и явное принятие там, где этого требует проектный процесс.
