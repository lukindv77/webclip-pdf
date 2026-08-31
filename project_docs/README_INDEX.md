# Индекс документации WebClip PDF

Рекомендуемый порядок чтения текущего проекта:

1. `CONTEXT_MANIFEST.json` — machine-readable bootstrap: canonical authorities, task profiles и постоянный handoff trigger.
2. `RESTORE_PROMPT.md` — короткая инструкция восстановления контекста только из свежего GitHub `main`.
3. `CONTEXT_AUTOMATION_POLICY.md` — постоянные правила перехода между чатами, audit/development automation и ограничения против второго source of truth.
4. `AUDIT_REGISTRY.md` — **единый current registry P-кодов, owners и статусов**.
5. `AUDIT_COVERAGE_FINAL_SYNTHESIS_2026-08-31.md` — текущий project-wide deep-audit coverage state, Coverage Reconciliation и B1→B9 final synthesis; coverage-complete не означает closure/release-ready.
6. `AUDIT_COVERAGE_RECONSTRUCTION_2026-08-30.md` — family-level C01…C46 Coverage Matrix и последовательность targeted revalidation tranches, на которой основан final synthesis.
7. `AUDIT_COVERAGE_CAMPAIGN_POLICY.md` — обязательная методика systematic deep audit, evidence ladder L1–L5 и project-wide completion gates.
8. `AUDIT_DELTA_INDEX.md` — навигация по полностью консолидированным audit families.
9. `AUDIT_CHANGE_WORKFLOW.md` — жизненный цикл нового finding / P-owner / implementation / evidence / PR / status transition.
10. `TEST_STATUS.md` — текущая правда о тестах/release gate; historical PASS не является current rerun.
11. `RELEASE_READINESS.md` — machine-readable current release-readiness declaration; `NOT READY` является нормальным WIP-состоянием.
12. `PROJECT_OVERVIEW.md` — назначение проекта и основные инварианты.
13. `USER_REQUIREMENTS.md` — актуальные требования и явно отмеченные superseded правила.
14. `ARCHITECTURE.md` — компоненты, current implemented behavior и явно обозначенные open audit boundaries.
15. `DECISIONS_AND_RATIONALE.md` — архитектурные решения, включая помеченные superseded historical decisions.
16. `DATA_MODELS.md` — IndexedDB/storage/snapshot/receipt models.
17. `TEST_PLAN.md` — regression plan и Git-first recovery gate.
18. `BUILD_AND_RECOVERY_RULES.md` — release/recovery/provenance architecture.
19. `GITHUB_WORKFLOW.md` — PR-first working policy, accepted `protected=false` posture, integrity/release gates.
20. `RELEASE_HISTORY_INDEX.md` — inventory и retention policy исторических evidence-bearing GitHub Releases/tags.
21. `CHANGELOG_AND_RATIONALE.md` — история функциональных изменений.
22. `ASSISTANT_NOTES_AND_LIMITATIONS.md` — технические ограничения.

## Audit evidence

Standalone `AUDIT_DELTA_*.md` больше не являются рабочим слоем current tree. Все ранее существовавшие delta прошли lossless family retirement; исходный Markdown сохранён в family evidence с исходным именем и SHA-256, а полный historical state дополнительно остаётся в Git history.

Основные evidence/history документы:

- `AUDIT_COVERAGE_FINAL_SYNTHESIS_2026-08-31.md` — current project-wide audit coverage decision. На baseline `52786ca591b90700fb1ed90c2d36746e38c79b88` campaign reconciled C01…C46 как terminal at required evidence или explicit bounded external state и перешёл в `DEEP-AUDIT-COVERAGE-COMPLETE`; ACTIVE findings остаются открытыми, а `DEEP-AUDIT-CRITICAL-CLOSURE-COMPLETE` / `RELEASE-READY` не заявлены;
- `AUDIT_COVERAGE_RECONSTRUCTION_2026-08-30.md` — detailed family-level Coverage Matrix и pre-reconciliation tranche history. Его Stage-6 narrative сохраняет состояние до отдельного final reconciliation; current project-wide coverage state определяется final synthesis выше;
- `AUDIT_HISTORY_INDEX.md` — corrections, retractions, dedup/product-security decisions;
- `AUDIT_EVIDENCE.md` — historical implementation/browser proof;
- `AUDIT_RETIRED_DELTA_EVIDENCE.md` — ранее свёрнутые correction/positive-control deltas;
- `AUDIT_CROSSCUTTING_REVALIDATION_EVIDENCE.md` — broad revalidation/implementation taxonomy;
- `AUDIT_FAMILY_*_EVIDENCE.md` — consolidated family source proof, schedules, corrections, positive controls and acceptance boundaries;
- targeted `AUDIT_*_2026-08-30/31_EVIDENCE.md` files — current-contract L3/L4 physical tranches retained outside historical family compaction where needed for Coverage Matrix proof;
- `TEST_EVIDENCE.md` — historical test/browser checkpoints.

`project_tools/audit_coverage_reconciliation.py` — deterministic checkout guard for C01…C46 terminality, explicit external rows, external research freshness and runtime/fidelity-contract staleness against the initial reconstruction baseline. It is an audit-process checker, not a product-runtime test.

`CONTEXT_MANIFEST.json` — только машинная навигация; он не хранит competing current status.
`CONTEXT_AUTOMATION_POLICY.md` — process contract для chat handoff/audit/development automation; он не заменяет registry/evidence.
`AUDIT_DELTA_INDEX.md` — только навигация по consolidated families, не status registry.
`PRIORITIES_P0_P1_P2.md` — compatibility pointer на `AUDIT_REGISTRY.md`.
`AUDIT_CHANGE_WORKFLOW.md` — process contract; Issue/PR не заменяют registry/evidence.
`GITHUB_WORKFLOW.md` — canonical private remote, PR-first process, automated integrity gate и manual release gate.
`RELEASE_READINESS.md` — fail-closed release declaration, проверяемая `project_tools/check_release_readiness.py`.
`RELEASE_HISTORY_INDEX.md` — retention authority for existing historical pre-release artifacts; it does not promote them to current releases.