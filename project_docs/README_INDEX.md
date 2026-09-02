# Индекс документации WebClip PDF

Этот индекс организован по принципу **current state first**. Обычная разработка и **Комплексное исследование проекта** не должны реконструировать действующие требования из последовательности прошлых изменений.

## 1. Обязательный current bootstrap

1. `CONTEXT_MANIFEST.json` — machine-readable authorities, bootstrap и task profiles.
2. `RESTORE_PROMPT.md` — восстановление только из fresh GitHub `main`.
3. `USER_REQUIREMENTS.md` — **единый current baseline требований и технических условий**.
4. `DECISIONS_AND_RATIONALE.md` — **current rationale: почему приняты действующие решения**.
5. `PROJECT_OVERVIEW.md` — краткая картина текущего продукта без истории изменения требований.
6. `SESSION_EXECUTION_AND_INTERRUPTION_SAFETY_POLICY.md` — instrument-window planning, durable checkpoints, GitHub freshness и local-first execution.

История изменения требований остаётся в Git history и читается только по конкретной необходимости. Она не является обычным bootstrap-слоем.

## 2. Архитектура и разработка

- `ARCHITECTURE.md` — current runtime/components/flows/open boundaries.
- `DATA_MODELS.md` — current IndexedDB/storage/snapshot/receipt models.
- `WEBCLIP_COPY_ARCHITECTURE_POLICY.md` — copy/representation architecture policy.
- `WEBCLIP_PDF_FIDELITY_CONTRACT.md` — current PDF fidelity/completeness contract.
- `PROJECT_MISSION_AND_DEFENSIVE_SECURITY_POLICY.md` — product mission и defensive-security boundary.
- `ASSISTANT_NOTES_AND_LIMITATIONS.md` — current technical limitations.
- `TEST_PLAN.md` — regression/evidence plan.

## 3. Комплексное исследование проекта

Каноническая деятельность: **«Комплексное исследование, оценка и проработка проекта и его архитектуры»**.

- `COMPREHENSIVE_PROJECT_RESEARCH_POLICY.md` — canonical scope, mandatory multi-source external research, evidence model, session-window и local-first requirements.
- `RESEARCH_REGISTRY.md` — **единственный current authority для P-code owner/status**.
- `RESEARCH_DELTA_INDEX.md` — навигация по durable research families.
- `RESEARCH_CHANGE_WORKFLOW.md` — lifecycle finding/owner/implementation/evidence/PR.
- `RESEARCH_COVERAGE_CAMPAIGN_POLICY.md` — systematic coverage methodology.
- `RESEARCH_EXTERNAL_USER_INTENT_RESEARCH_POLICY.md` — specialized external user-intent/freshness policy.
- `RESEARCH_FULL_RESTART_2026-09-01_BASELINE.md` — current sequential restart matrix/frontier.

Для каждого существенного research question current policy требует внешнее исследование по множеству источников: аналоги/вендоры, public GitHub/GitLab проекты, issues/discussions, standards/platform docs, форумы/Reddit/пользовательский опыт — с обязательной самостоятельной проверкой выводов против fresh WebClip `main`.

## 4. Research evidence и история — on demand

Эти документы нужны для proof/provenance, duplicate/root-cause reconciliation, regression investigation и campaign continuity; они **не заменяют current requirements baseline**:

- `RESEARCH_FAMILY_*_EVIDENCE.md` — consolidated family evidence;
- `RESEARCH_CROSSCUTTING_REVALIDATION_EVIDENCE.md` — cross-cutting evidence;
- `RESEARCH_HISTORY_INDEX.md` — research corrections/dedup/retractions/history;
- `RESEARCH_EVIDENCE.md` — consolidated historical/current evidence layer;
- `RESEARCH_RETIRED_DELTA_EVIDENCE.md` — retired research delta provenance;
- targeted `RESEARCH_*_EVIDENCE.md` — specialized durable proof;
- `TEST_EVIDENCE.md` — test evidence/history.

Historical PASS/FINDING не повышает текущую кампанию без свежего evidence, требуемого current policy.

## 5. GitHub process и context continuity

- `GITHUB_WORKFLOW.md` — PR-first workflow, exact-head integrity, TOCTOU, Actions minimization и repository hygiene.
- `CONTEXT_AUTOMATION_POLICY.md` — GitHub как durable project memory и handoff protocol.
- `SESSION_EXECUTION_AND_INTERRUPTION_SAFETY_POLICY.md` — exact resume point и interruption safety.
- `.github/pull_request_template.md` — PR contract.

Target delivery tail:

`fresh main -> branch -> bounded change -> PR -> exact-head Repository Integrity -> TOCTOU -> expected-head squash merge -> exact new main -> post-merge Repository Integrity`.

До Actions выполняются все доступные local/built-in checks. GitHub Actions используются для unavailable-local environment boundaries и обязательных independent delivery/release gates, а не как interactive debugger.

## 6. Test/release truth

- `TEST_STATUS.md` — current test truth; historical PASS отдельно от fresh execution.
- `RELEASE_READINESS.md` — fail-closed current release declaration; текущий статус остаётся `NOT READY`, пока canonical file не изменён применимым release process.
- `BUILD_AND_RECOVERY_RULES.md` — Git-first release/recovery provenance.
- `RELEASE_HISTORY_INDEX.md` — retained historical release/tag evidence; это release provenance, а не current requirement authority.

Manifest `0.9.8` остаётся current runtime version; `0.9.9` — WIP. Build/tag/GitHub Release требуют отдельного явного release decision и применимых gates.

## 7. Source-of-truth summary

- source/WIP: fresh `main` exact SHA;
- requirements: `USER_REQUIREMENTS.md`;
- rationale: `DECISIONS_AND_RATIONALE.md`;
- research owner/status: `RESEARCH_REGISTRY.md`;
- test truth: `TEST_STATUS.md` + exact applicable evidence;
- release truth: `RELEASE_READINESS.md`.

Old chat memory, dated handoff, generated archive, functional changelog и historical requirement revisions не являются параллельным current baseline.
