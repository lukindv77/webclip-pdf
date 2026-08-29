# Audit change workflow — WebClip

Этот документ задаёт обязательный жизненный цикл новых audit findings и изменений существующих P-owner после консолидации audit evidence.

`AUDIT_REGISTRY.md` остаётся единственным current authority по P-кодам, owner и status. Family evidence хранит доказательную базу; GitHub Issue/PR — рабочий процесс, но не заменяет registry.

## 1. Начало работы

1. Fresh-fetch `main` и зафиксировать exact baseline SHA.
2. Проверить `AUDIT_REGISTRY.md`, `AUDIT_DELTA_INDEX.md`, соответствующий `AUDIT_FAMILY_*_EVIDENCE.md`, `AUDIT_HISTORY_INDEX.md` и Git history.
3. Сначала определить, является ли наблюдение:
   - новым root cause;
   - уточнением существующего owner;
   - duplicate/merged finding;
   - historical/non-current observation.
4. Новый P-код выделяется только для нового самостоятельного owner. Существующий код никогда не переиспользуется.

## 2. Admission нового finding

Для анализа рекомендуется GitHub Issue по шаблону `Audit finding`.

Issue должен содержать:

- exact source/baseline SHA;
- затронутые файлы/подсистему;
- наблюдаемый дефект или нарушенный invariant;
- deterministic schedule/reproduction, если применимо;
- границу authority/generation/receipt, если finding связан с concurrency/recovery;
- предложение: existing owner / new owner / duplicate / reject;
- acceptance criteria.

Issue может существовать до присвоения P-кода. **Резервирование номера происходит только после записи в `AUDIT_REGISTRY.md`.**

## 3. Работа с P-кодом

Если finding уточняет существующий root cause:

- не создавать новый номер;
- уточнить описание owner/acceptance при необходимости;
- добавить доказательство в соответствующий family evidence или history evidence.

Если нужен новый номер:

1. повторно выполнить duplicate-check непосредственно перед записью;
2. выбрать следующий свободный номер только после проверки permanent reservations;
3. в одном PR добавить registry row и необходимую evidence-навигацию;
4. не считать номер свободным даже после DONE/MERGED/SUPERSEDED.

## 4. Ветка и PR

Нормальный путь изменения проекта:

`fresh main -> рабочая ветка -> изменение -> tests/evidence -> PR -> exact-head CI -> merge`

Поскольку `main` намеренно остаётся `protected=false`, защита обеспечивается проектным процессом:

- обычные изменения не пишутся напрямую в `main`;
- перед PR сравнивается полный diff с fresh `main`;
- PR description фиксирует exact reviewed head SHA;
- merge выполняется только если `repository-integrity` PASS на этом exact head;
- непосредственно перед merge повторно проверяются head SHA, mergeability и changed files;
- merge использует expected head SHA, когда интерфейс это поддерживает.

Прямое изменение `main` допускается только как явно документированное аварийное восстановление после отдельного решения пользователя. Оно не является обычным workflow.

## 5. Machine-readable audit impact

`project_tools/check_pr_change_contract.py` проверяет actual base/head diff PR, а не доверяет только описанию автора.

Если PR меняет runtime или canonical audit/evidence, в PR body выбирается ровно одно:

- `audit-impact: none` — P-owner/status/acceptance contract не меняется;
- `audit-impact: owner` — перечислены затронутые P-коды и durable evidence меняется в том же PR.

Для `audit-impact: owner` действуют дополнительные инварианты:

1. затронутый P-code указывается явно в PR body;
2. изменяется соответствующий family/history/registry evidence;
3. хотя бы один объявленный P-code присутствует в изменённом durable evidence;
4. runtime change сопровождается deterministic `project_tools/test_*.js`, если дефект можно проверить детерминированно;
5. если deterministic test неприменим и acceptance реально требует внешней границы, допускается только явный `test-impact: external-only` с сохранением Chrome/Yandex/другого external requirement в durable evidence.

`test-impact: external-only` не является освобождением от тестирования и не должен использоваться для обхода легко воспроизводимого deterministic regression.

Изменение `AUDIT_REGISTRY.md` требует в том же PR второго durable family/history evidence файла. Это не позволяет registry стать единственным местом, где существует новая acceptance-деталь.

Изменение `manifest.json` отдельно требует синхронного изменения `RELEASE_READINESS.md` и `TEST_STATUS.md`.

## 6. Implementation и tests

Изменение runtime для P-owner должно сопровождаться минимально необходимыми слоями:

- deterministic regression test, если дефект детерминируем без реального браузера/сервиса;
- обновление family evidence с тем, что именно доказано;
- обновление архитектуры/требований, если меняется invariant или contract;
- отдельное указание, какие real Chrome/Yandex проверки всё ещё необходимы.

`PASS` deterministic test не переводит finding в DONE, если acceptance требует real Chrome, permission UI, native Save As, реальный Yandex API или другой внешний boundary.

## 7. Status transitions

- `ACTIVE` -> implementation может быть добавлена, но owner остаётся ACTIVE до требуемой direct verification.
- `ACTIVE` -> `DONE` только после выполнения полного acceptance contract.
- `ACTIVE` -> `MERGED -> Px-nnn` только при доказанном совпадении root cause; старый номер остаётся permanently reserved.
- `ACTIVE` -> `SUPERSEDED` только при явном архитектурном/product решении, заменяющем старое требование.
- Historical PASS никогда автоматически не закрывает later-reopened owner.

## 8. Evidence после merge

После merge current truth должен быть восстанавливаем из:

1. `AUDIT_REGISTRY.md` — owner/status;
2. family evidence — proof/race/acceptance/corrections;
3. tests и exact Git commit;
4. `TEST_STATUS.md` / `TEST_EVIDENCE.md` — test/release interpretation;
5. GitHub PR/Issue — рабочая дискуссия и reviewed diff.

Нельзя оставлять единственную существенную acceptance-деталь только в тексте Issue/PR или чате.

## 9. Release boundary

Audit implementation и release readiness — разные состояния. Release-кандидат дополнительно проходит `.github/workflows/release-gate.yml` и правила `RELEASE_READINESS.md`.

Release gate не создаёт build/tag/Release и не заменяет explicit release decision.
