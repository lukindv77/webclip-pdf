# Audit change workflow — WebClip

Этот документ задаёт обязательный жизненный цикл новых audit findings и изменений существующих P-owner после консолидации audit evidence.

`AUDIT_REGISTRY.md` остаётся единственным current authority по P-кодам, owner и status. Family evidence хранит доказательную базу; GitHub Issue/PR — рабочий процесс, но не заменяет registry.

Организация каждой инструментальной audit-сессии дополнительно и обязательно подчиняется `SESSION_EXECUTION_AND_INTERRUPTION_SAFETY_POLICY.md`: перед началом сообщается exact состояние незавершённой работы и план/риски сессии, объём рассчитывается на максимально полезное использование всего инструментального окна, а substantive progress сохраняется этапами в durable checkpoints так, чтобы неожиданное прерывание не требовало реконструкции работы из чата или локального ephemeral состояния.

Выбор и приоритизация крупных deep-audit user operations/surfaces дополнительно и обязательно подчиняются `AUDIT_EXTERNAL_USER_INTENT_RESEARCH_POLICY.md`. Deep audit должен регулярно сверять свою User Intent / Operation Map с актуальным внешним опытом похожих и пересекающихся продуктов: official developer materials/demos, GitHub projects/issues/discussions, user forums/Reddit, reviews/comparisons и web-archiving practices. Внешний опыт является evidence-input для того, **что** нужно аудировать и с каким приоритетом, но не автоматически меняет product contract WebClip и не создаёт P-owner без обычной root-cause/admission процедуры.

Для текущего основного PDF-режима `WEBCLIP_PDF_FIDELITY_CONTRACT.md` является обязательной PDF-specific acceptance authority. Deep audit не должен оценивать PDF по неопределённому критерию «похоже на страницу»: ordinary-scroll completeness, user-reached boundary для scroll-triggered dynamic content, spoiler materialization, hover exclusion, responsive/resource identity, temporal/focus state, pagination и truthful degradation проверяются относительно явно принятого contract.

`AUDIT_COVERAGE_CAMPAIGN_POLICY.md` является обязательной методикой систематического deep audit. Она разделяет coverage completeness и finding closure, задаёт Coverage Matrix по end-to-end boundaries/surface families, evidence ladder L1–L5, controls, tranche envelope, root-cause saturation, campaign ranking, closure re-audit и project-wide completion gates. Наличие большого P-registry или большого количества audit blocks не является доказательством полной coverage. Current initial reconstruction хранится в `AUDIT_COVERAGE_RECONSTRUCTION_2026-08-30.md` и должна обновляться/заменяться последующими durable coverage checkpoints.

## 1. Начало работы

1. Fresh-fetch `main` и зафиксировать exact baseline SHA.
2. Проверить `AUDIT_REGISTRY.md`, `AUDIT_DELTA_INDEX.md`, соответствующий `AUDIT_FAMILY_*_EVIDENCE.md`, `AUDIT_HISTORY_INDEX.md`, current Coverage Matrix/reconstruction и Git history.
3. Перед выбором нового крупного deep-audit tranche проверить freshness текущего external user-intent baseline по `AUDIT_EXTERNAL_USER_INTENT_RESEARCH_POLICY.md`; если baseline устарел или появился существенный новый peer-product/platform/user-intent signal, сначала выполнить и durably сохранить необходимый delta-scan/research refresh.
4. Выбирать следующий крупный tranche из nonterminal/high-risk coverage gaps согласно `AUDIT_COVERAGE_CAMPAIGN_POLICY.md`, а не только по наличию очередного интересного edge case. До старта определить boundaries, required evidence, controls, variant classes и termination envelope.
5. Если tranche затрагивает текущий основной PDF fidelity/completeness, сформулировать audit questions и acceptance относительно `WEBCLIP_PDF_FIDELITY_CONTRACT.md`, включая применимые transformation class и границу admitted/user-reached state.
6. Сначала определить, является ли наблюдение:
   - новым root cause;
   - уточнением существующего owner;
   - duplicate/merged finding;
   - historical/non-current observation.
7. Новый P-код выделяется только для нового самостоятельного owner. Существующий код никогда не переиспользуется.

## 2. Admission нового finding

Для анализа рекомендуется GitHub Issue по шаблону `Audit finding`.

Issue должен содержать:

- exact source/baseline SHA;
- затронутые файлы/подсистему;
- наблюдаемый дефект или нарушенный invariant;
- deterministic schedule/reproduction, если применимо;
- границу authority/generation/receipt, если finding связан с concurrency/recovery;
- proposal: existing owner / new owner / duplicate / reject;
- acceptance criteria;
- coverage cells/surfaces и required evidence level, если finding возник в systematic deep-audit campaign.

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

Новый symptom не получает отдельный owner только потому, что наблюдается на другом fixture. Новый owner нужен, если после полного исправления root cause A нарушение B может независимо остаться по другому механизму.

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

Для **любого runtime change** дополнительно обязателен конкретный `audit-rationale:`. Он должен объяснять либо почему существующие P-owner/invariants действительно не затронуты, либо каким образом затронуты объявленные owner. Пустой, placeholder, `none` или `n/a` rationale не принимается.

Для `audit-impact: owner` действуют дополнительные инварианты:

1. затронутые P-code указываются явно в PR body;
2. изменяется соответствующий family/history/registry evidence;
3. хотя бы один объявленный P-code присутствует в изменённом durable evidence;
4. runtime change сопровождается deterministic `project_tools/test_*.js`, если дефект можно проверить детерминированно;
5. каждый объявленный P-code должен присутствовать в исходном тексте изменённого deterministic test, чтобы тест нельзя было формально заменить несвязанным файлом;
6. если deterministic test неприменим и acceptance реально требует внешней границы, допускается только явный `test-impact: external-only` с сохранением Chrome/Yandex/другого external requirement в durable evidence.

`test-impact: external-only` взаимоисключается с добавлением/изменением deterministic test в том же PR: это escape hatch только для действительно внешней проверки, а не способ обойти regression test.

Изменение `AUDIT_REGISTRY.md` требует в том же PR второго durable family/history evidence файла. Это не позволяет registry стать единственным местом, где существует новая acceptance-деталь.

Изменение `manifest.json` отдельно требует синхронного изменения `RELEASE_READINESS.md` и `TEST_STATUS.md`.

## 6. Implementation и tests

Изменение runtime для P-owner должно сопровождаться минимально необходимыми слоями:

- deterministic regression test, если дефект детерминируем без реального браузера/сервиса;
- обновление family evidence с тем, что именно доказано;
- обновление архитектуры/требований, если меняется invariant или contract;
- отдельное указание, какие real Chrome/Yandex проверки всё ещё необходимы.

`PASS` deterministic test не переводит finding в DONE, если acceptance требует real Chrome, permission UI, native Save As, реальный Yandex API или другой внешний boundary.

Finding нельзя закрывать evidence ниже уровня, на котором проявляется дефект. Если дефект observable только в physical PDF, unit/source proof не заменяет L4 closure.

## 7. Closure re-audit

После implementation owner нельзя проверять только старый reproduction. Согласно `AUDIT_COVERAGE_CAMPAIGN_POLICY.md` выполняется Closure Sweep соответствующего region Coverage Matrix.

Минимально повторно рассматриваются affected admission/capture/materialization/renderer/artifact/persistence/provenance cells. Если изменился shared capture/materialization layer, revalidation scope расширяется на соседние families, которые используют этот слой.

Результат closure должен обновить durable evidence/coverage state и отдельно показать, какие claims остаются external/unknown/partial.

## 8. Status transitions

- `ACTIVE` -> implementation может быть добавлена, но owner остаётся ACTIVE до требуемой direct verification.
- `ACTIVE` -> `DONE` только после выполнения полного acceptance contract.
- `ACTIVE` -> `MERGED -> Px-nnn` только при доказанном совпадении root cause; старый номер остаётся permanently reserved.
- `ACTIVE` -> `SUPERSEDED` только при явном архитектурном/product решении, заменяющем старое требование.
- Historical PASS никогда автоматически не закрывает later-reopened owner.

Coverage outcome и P-status различаются: `ARTIFACT-COVERED / FINDING` может быть terminal audit cell при ACTIVE owner.

## 9. Evidence после merge

После merge current truth должен быть восстанавливаем из:

1. `AUDIT_REGISTRY.md` — owner/status;
2. family evidence — proof/race/acceptance/corrections;
3. Coverage Matrix/reconstruction — систематическая видимость proved/broken/partial/external/uncovered surfaces;
4. tests и exact Git commit;
5. `TEST_STATUS.md` / `TEST_EVIDENCE.md` — test/release interpretation;
6. GitHub PR/Issue — рабочая дискуссия и reviewed diff.

Нельзя оставлять единственную существенную acceptance-деталь только в тексте Issue/PR или чате.

## 10. Deep-audit completion boundary

Project state `DEEP-AUDIT-COVERAGE-COMPLETE` допустим только по gates `AUDIT_COVERAGE_CAMPAIGN_POLICY.md`: все CORE families triaged, все material relevant cells terminal с required evidence либо explicit external/limitation boundary, все findings имеют root-cause ownership и нет unexplained NOT-AUDITED областей.

Этот статус не означает, что все findings исправлены. `DEEP-AUDIT-CRITICAL-CLOSURE-COMPLETE` и `RELEASE-READY` являются отдельными более сильными состояниями.

## 11. Release boundary

Audit implementation и release readiness — разные состояния. Release-кандидат дополнительно проходит `.github/workflows/release-gate.yml` и правила `RELEASE_READINESS.md`.

Release gate не создаёт build/tag/Release и не заменяет explicit release decision.
