# Permanent context / research / development automation policy

Status: **CANONICAL / PERMANENT**

Этот документ задаёт правила использования GitHub как durable project memory WebClip PDF и правила перехода между инструментальными сессиями/чатами. Он не создаёт отдельный status registry.

## Current authorities

- source/WIP tree — fresh GitHub `main` exact SHA;
- current requirements/technical conditions — `USER_REQUIREMENTS.md`;
- current rationale — `DECISIONS_AND_RATIONALE.md`;
- P-owner/status — только `RESEARCH_REGISTRY.md`;
- research proof/navigation — `RESEARCH_FAMILY_*_EVIDENCE.md`, relevant history/cross-cutting evidence + `RESEARCH_DELTA_INDEX.md`;
- current automated/test narrative — `TEST_STATUS.md` + exact applicable execution evidence;
- release truth — `RELEASE_READINESS.md`.

Historical requirement revisions, old chats, dated handoffs and retired functional changelog не являются current authority. Они извлекаются из Git history только для конкретной provenance/regression/root-cause задачи.

## Current-baseline automation rule

Новая сессия не должна «собирать» текущее состояние требований по истории. Bootstrap обязан сначала прочитать фактический `CONTEXT_MANIFEST.json`, `USER_REQUIREMENTS.md` и `DECISIONS_AND_RATIONALE.md` из fresh `main`.

Если accepted requirement/decision изменён, current baseline и применимые architecture/policy docs должны быть синхронизированы обычным PR-first способом; chat-only delta не считается durable project state.

## Комплексное исследование проекта

Каноническое понятие: **«Комплексное исследование, оценка и проработка проекта и его архитектуры»**.

Для каждого существенного research-вопроса действует `COMPREHENSIVE_PROJECT_RESEARCH_POLICY.md`:

- fresh current WebClip source/architecture/requirements inspection;
- mandatory multi-source external research;
- аналоги и vendor materials;
- public GitHub/GitLab implementations;
- issues/discussions/postmortems;
- standards/browser/platform docs;
- форумы/Reddit/пользовательский опыт, когда релевантно;
- внешние решения используются как hypotheses/known failure modes/options, а не automatic requirements;
- окончательный вывод проверяется против fresh WebClip `main`.

Security scope — defensive security / защитный архитектурный анализ only.

## Инструментальные окна и interruption safety

`SESSION_EXECUTION_AND_INTERRUPTION_SAFETY_POLICY.md` обязателен для длинной работы.

Если полный качественный scope не помещается в текущую инструментальную сессию, он разбивается на несколько interruption-safe sessions/tranches с exact durable GitHub resume points. Количество сессий не является метрикой успеха; полнота, точность и доказательность имеют приоритет.

## Local-first automation policy

Automation and verification use local/built-in tools first whenever they can truthfully verify the required claim.

GitHub Actions are used only when:

1. required environment/physical/external evidence cannot be honestly obtained locally; or
2. the run is an explicitly mandatory independent delivery/release gate.

GitHub Actions must not be the default debugger for syntax/static/deterministic failures that available local tools can detect. Runner minimization cannot weaken exact-head/post-merge integrity, TOCTOU or required physical/external evidence.

## Постоянный триггер перехода в новый чат

Точная фраза пользователя:

**«Подготовь переход в новый чат»**

всегда запускает handoff protocol, даже если разработка, **Комплексное исследование проекта**, PR или discussion не завершены.

### Handoff protocol

1. Fresh-fetch `main`, зафиксировать exact current SHA и проверить current post-merge integrity state.
2. Проверить open Pull Request, open Issue, branches и durable commits/evidence.
3. Не закрывать P-owner, не менять research status, не объявлять acceptance/DONE и не выполнять release только ради перехода.
4. Если незавершённая работа уже находится в open Pull Request, использовать его как durable resume point; PR body должен отражать exact head, scope и remaining work.
5. Если полезная branch имеет commits без PR, сохранить exact head и открыть PR/checkpoint, когда это необходимо для предотвращения потери work state.
6. Если существенный контекст невозможно безопасно сохранить PR/branch и без checkpoint он потеряется, допускается open Issue/checkpoint как working context; Issue не становится status authority и не резервирует P-code автоматически.
7. Проверить, что `CONTEXT_MANIFEST.json`, `RESTORE_PROMPT.md`, current baseline и применимые policy docs не устарели из-за уже принятого изменения.
8. Выдать пользователю стартовый prompt следующего чата, требующий fresh GitHub bootstrap и продолжение от фактического durable state.
9. Новый чат не предполагает, что старый tranche завершён; он сначала проверяет GitHub.

## 14 постоянных правил автоматизации

### 1. Context bootstrap

`CONTEXT_MANIFEST.json` — machine navigation; `RESTORE_PROMPT.md` — краткий restore procedure. Они не дублируют owner/test/release status.

### 2. P work index

Любой `P_WORK_INDEX`/`p_context` может быть только navigation `P-code -> current evidence/source/tests/external acceptance/related owners`. Current P-status всегда читается из `RESEARCH_REGISTRY.md`.

### 3. Research coverage matrix

Derived matrix `P-code -> evidence -> source -> tests -> external verification` используется для обнаружения coverage gaps и не меняет owner status автоматически.

### 4. Differential research

Для runtime/research PR анализировать exact `base...head`, sensitive/trust-boundary surfaces, relevant owners и test/evidence impact. Derived result не меняет Registry автоматически.

### 5. Local-first research split

Deterministic/static/model checks выполняются локально, если это возможно. Remote Actions evidence запускается только по environment need или mandatory gate. Семантическое **Комплексное исследование проекта** выполняется по fresh current state и не переносится в CI как автоматический LLM authority.

### 6. Seeded race/concurrency sweeps

Race/concurrency/generation/late-settlement findings должны иметь воспроизводимые schedules/seeds/fixtures, когда такой класс доказательства применим.

### 7. P work packet

Перед работой по owner собирать current owner/acceptance, relevant family evidence, current requirements/architecture, source/tests, external verification needs и related owners.

### 8. External research input

Для substantive research packet добавлять multiple relevant external-source categories согласно `COMPREHENSIVE_PROJECT_RESEARCH_POLICY.md`; чужое решение не становится requirement автоматически.

### 9. P-to-test metadata

Targeted tests могут связываться с P-code для navigation/feedback, но не заменяют full required integrity/physical acceptance.

### 10. Root-cause clusters

Derived `cluster/related/depends_on` помогают планировать работу, но не заменяют individual P-owner/status.

### 11. Issues only for real active work

Не создавать GitHub Issues массово из Registry. Issue используется только для реальной незавершённой работы, нового finding или handoff checkpoint.

### 12. PR review automation

Перед merge требуется exact current head/base review и canonical PR contract. Если автоматического trigger нет, review выполняется доступным способом; нельзя притворяться, что event automation существует.

### 13. Post-merge review automation

После merge проверять exact canonical `main`, post-merge Repository Integrity, actual remaining work и current baseline consistency.

### 14. Regular GitHub health review

Периодически/по trigger выполнять read-only health review: `main`, branches, open PR/Issues, workflow/pins, context manifest, broken references, Registry/research indexes и release provenance. При отсутствии drift cleanup commit не создавать.

## Общие ограничения

- не создавать второй current requirement/status registry;
- не переводить P-code в DONE/IMPLEMENTED автоматически только по static/deterministic/LLM signal;
- не выполнять build/tag/GitHub Release автоматически;
- не удалять research/release evidence, необходимое для provenance, без отдельного lossless retirement proof;
- не давать workflow write permissions, если read-only verification достаточно;
- не хранить единственный substantive evidence только в ephemeral Actions artifact/log;
- не использовать GitHub Actions вместо доступной local проверки только ради удобства;
- изменения architecture/research truth проходят обычный PR-first review и применимое explicit acceptance.
