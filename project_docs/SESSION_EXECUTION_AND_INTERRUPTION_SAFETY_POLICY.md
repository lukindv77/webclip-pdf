# WebClip — session execution and interruption-safety policy

Status: **CANONICAL / PERMANENT**

Этот документ задаёт постоянные правила выполнения содержательной проектной работы в инструментальных сессиях WebClip: **Комплексного исследования проекта**, реализации, исправлений, тестирования, документации, release/recovery и repository maintenance.

`USER_REQUIREMENTS.md` и `DECISIONS_AND_RATIONALE.md` задают current baseline «что требуется / почему принято». `COMPREHENSIVE_PROJECT_RESEARCH_POLICY.md` задаёт scope исследования. `RESEARCH_CHANGE_WORKFLOW.md` задаёт lifecycle findings/P-owner. Настоящий документ задаёт **как организовывать инструментальную сессию, использовать доступное окно и сохранять точную точку продолжения**.

## 1. Обязательное начало содержательной сессии

Перед новой работой необходимо:

1. fresh-fetch текущего GitHub `main` и зафиксировать exact HEAD SHA;
2. прочитать current baseline из фактического `CONTEXT_MANIFEST.json`;
3. проверить open PR, open Issues, branches и durable commits/evidence как возможную незавершённую работу;
4. отличить содержательно незавершённый tranche от пустой/stale ветки;
5. при наличии незавершённой работы определить точную resume point: branch/head SHA, завершённые шаги, оставшийся scope и delivery tail;
6. не начинать новый независимый tranche до reconciliation существующего durable state;
7. кратко сообщить пользователю точку продолжения, план и существенные риски переноса/внешних boundaries.

Старый handoff/main SHA является только checkpoint. Если `main` изменился, current truth определяется заново.

## 2. Планирование по инструментальному окну

Перед **Комплексным исследованием проекта** и другой длинной работой оцениваются:

- размер содержательного scope;
- объём fresh source/architecture inspection;
- объём обязательного внешнего исследования;
- deterministic/physical/external evidence;
- duplicate/root-cause reconciliation;
- expected GitHub delivery tail;
- наличие безопасных durable checkpoints.

Если планируемый объём нельзя качественно завершить в текущем инструментальном окне, работа делится на несколько interruption-safe sessions/tranches.

Постоянные правила:

- число инструментальных окон **не является метрикой успеха**;
- приоритет имеют полнота, точность, глубина проработки деталей и доказательность;
- нельзя искусственно уменьшать исследовательский scope или evidence level только ради одного окна;
- сначала берётся блок, который можно довести до устойчивого результата;
- по фактическому темпу объём можно расширять либо дополнительно дробить;
- большой tranche обязан иметь промежуточные durable checkpoints, достаточные для продолжения без скрытого контекста;
- если независимый следующий tranche начат в оставшейся части окна, до окончания сессии должен существовать точный durable checkpoint либо честная нулевая точка без ложного заявления о результате.

## 3. Local-first execution и экономия GitHub Actions

Все операции, которые доступная локальная/встроенная среда может **достоверно** выполнить, сначала выполняются без GitHub Actions. К ним относятся, где применимо:

- source/document inspection;
- static/syntax checks;
- Python/JavaScript deterministic tests;
- repository/document consistency checks;
- fixture generation и result parsing;
- diff/semantic comparison;
- локальная браузерная проверка, если текущая локальная browser/runtime среда действительно подходит для проверяемого claim.

GitHub Actions используется только когда:

1. требуемую environment/physical/external boundary нельзя честно воспроизвести локально; либо
2. Actions-run является обязательным independent delivery/release gate по canonical workflow, включая exact PR-head и post-merge Repository Integrity.

Запрещено использовать GitHub Actions как default interactive debugger или повторять push→runner только для обнаружения ошибок, которые можно было найти локально.

Экономия Actions **не позволяет** пропускать required physical Chrome/external verification, exact-SHA integrity, TOCTOU, post-merge validation или иной evidence layer, необходимый для правдивого вывода.

Если локальная среда отсутствует/ограничена, это фиксируется как limitation и не превращается в ложный local PASS.

## 4. Durable checkpoints

Любая длинная работа разбивается на значимые этапы. Существенный уникальный результат должен переходить из ephemeral состояния в durable GitHub state.

Durable checkpoint может быть:

- commit с current docs/research evidence;
- commit с runtime + tests + evidence;
- безопасный integration commit;
- branch head с exact SHA и достаточным checkpoint-документом;
- открытый PR с exact head и remaining-work contract;
- подтверждённый exact-head CI;
- merged exact new `main` + post-merge integrity.

Нельзя оставлять единственный экземпляр существенного результата только:

- в тексте чата;
- во внутренней памяти инструментов;
- в незакоммиченном локальном файле;
- в ephemeral browser state.

## 5. Что обязан содержать checkpoint незавершённого tranche

По возможности фиксируются:

- exact researched `main` baseline SHA;
- branch и durable head SHA;
- completed scope;
- remaining scope;
- rejected hypotheses/negative controls;
- relevant external sources или точная граница ещё не выполненного external research;
- duplicate/root-cause reconciliation и current P-owner, если уже определены;
- reproduction parameters и physical/external evidence identities;
- known risks/unknowns;
- следующий точный шаг.

Наличие branch без новых durable результатов не считается содержательным checkpoint.

## 6. Защита от неожиданного прерывания

Рабочий порядок предполагает, что инструментальная среда может завершиться после любого значимого действия.

Поэтому:

1. не накапливать длинную цепочку уникальных результатов без durable фиксации;
2. сначала закреплять доказанное, затем переходить к следующей группе экспериментов;
3. перед rebase/integration/merge иметь recoverable exact head;
4. после движения `main` выполнять overlap/TOCTOU reconciliation, а не blind merge;
5. после существенного изменения ветки знать её exact head SHA;
6. не считать доставку завершённой до подтверждения canonical `main` и обязательного post-merge integrity.

## 7. Актуальность GitHub во время сессии

Freshness проверяется не только на старте.

Перед:

- созданием рабочей ветки;
- существенным integration step;
- открытием/finalization PR;
- exact-head acceptance;
- merge;
- началом нового независимого tranche после предыдущего merge

необходимо убедиться, что используемый base/head всё ещё актуален для выполняемого действия.

Принятые user requirements, architecture decisions и project policy не должны существовать только в чате: они фиксируются в canonical GitHub current documents обычным PR-first способом.

## 8. Промежуточные сообщения пользователю

Во время длинной сессии следует коротко сообщать о значимых стадиях:

- подтверждённый finding/negative control;
- важный внешний comparison result;
- durable checkpoint SHA;
- изменение root-cause/объёма;
- движение `main` или concurrent work;
- переход к delivery/TOCTOU;
- точная оставшаяся работа.

Не требуется перечислять каждый низкоуровневый tool call.

## 9. Продолжение следующей сессии

Следующая сессия начинается так:

`fresh main -> current baseline -> PR/Issue/branches/checkpoints -> exact resume point -> continuation`.

Если ранее незавершённый tranche уже интегрирован другой работой, сначала это подтверждается по `main`, diff и evidence, после чего дублирование не выполняется.

Historical requirements не собираются заново: current work исходит из `USER_REQUIREMENTS.md` + `DECISIONS_AND_RATIONALE.md`. Git history читается только по конкретной необходимости.

## 10. Delivery tail является частью взятого блока

Если цель включает доставку изменений, normal tail:

`fresh main -> work branch -> bounded change -> PR -> exact-head Repository Integrity SUCCESS -> fresh TOCTOU (main/base/head/mergeability/files) -> expected-head squash merge -> confirm exact new main -> post-merge Repository Integrity SUCCESS`.

Если сессия прерывается внутри tail, checkpoint должен точно назвать последнюю завершённую ступень.

## 11. Правдивость статуса

Нельзя:

- объявлять tranche завершённым до завершения реально взятого acceptance/delivery scope;
- обещать фоновое/асинхронное продолжение вне инструмента;
- выдавать exploratory result без durable evidence за canonical finding;
- выдавать stale branch за current baseline;
- использовать historical PASS как fresh evidence без применимой revalidation;
- урезать required research/evidence ради экономии одной сессии или GitHub Actions minutes.

Частично выполненная работа допустима, если она честно классифицирована и оставляет точную durable resume point.

## 12. Постоянный характер

Эта policy применяется по умолчанию ко всем следующим содержательным инструментальным сессиям WebClip и изменяется только явным последующим решением пользователя, интегрированным в canonical project policy.
