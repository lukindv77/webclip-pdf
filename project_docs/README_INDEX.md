# Индекс документации WebClip PDF

Рекомендуемый порядок чтения текущего проекта:

1. `CONTEXT_MANIFEST.json` — machine-readable bootstrap: canonical authorities, task profiles и постоянный handoff trigger.
2. `RESTORE_PROMPT.md` — короткая инструкция восстановления контекста только из свежего GitHub `main`.
3. `CONTEXT_AUTOMATION_POLICY.md` — постоянные правила перехода между чатами, audit/development automation и ограничения против второго source of truth.
4. `AUDIT_REGISTRY.md` — **единый current registry P-кодов, owners и статусов**.
5. `AUDIT_COVERAGE_CYCLE2_MATRIX_2026-08-31.md` — current Cycle-2 Coverage Sweep / Matrix v2: C01…C46 re-triage, 31 terminal carry-forward families, 15 Change-Impact revalidation families, PD1–PD7/EI1–EI4 variants и first tranche T1 envelope.
6. `AUDIT_COVERAGE_CYCLE2_KICKOFF_2026-08-31.md` — second full deep-audit campaign start: fresh baseline, platform/external Change Impact variants, initial risk ranking и `DEEP-AUDIT-IN-PROGRESS` state.
7. `AUDIT_EXTERNAL_USER_INTENT_BASELINE_2026-08-31.md` — current substantive external user-intent/product-discovery baseline for Cycle 2, включая fresh peer/community/archive/browser-platform scan.
8. `AUDIT_COVERAGE_FINAL_SYNTHESIS_2026-08-31.md` — final synthesis **previous Cycle 1**; его `DEEP-AUDIT-COVERAGE-COMPLETE` остаётся исторически истинным для завершённой первой кампании, но не означает completion текущего Cycle 2.
9. `AUDIT_COVERAGE_RECONSTRUCTION_2026-08-30.md` — Cycle-1 family-level C01…C46 Coverage Matrix и последовательность targeted revalidation tranches.
10. `AUDIT_COVERAGE_CAMPAIGN_POLICY.md` — обязательная методика systematic deep audit, evidence ladder L1–L5 и project-wide completion gates.
11. `AUDIT_DELTA_INDEX.md` — навигация по полностью консолидированным audit families.
12. `AUDIT_CHANGE_WORKFLOW.md` — жизненный цикл нового finding / P-owner / implementation / evidence / PR / status transition.
13. `TEST_STATUS.md` — текущая правда о тестах/release gate; historical PASS не является current rerun.
14. `RELEASE_READINESS.md` — machine-readable current release-readiness declaration; `NOT READY` является нормальным WIP-состоянием.
15. `PROJECT_OVERVIEW.md` — назначение проекта и основные инварианты.
16. `USER_REQUIREMENTS.md` — актуальные требования и явно отмеченные superseded правила.
17. `ARCHITECTURE.md` — компоненты, current implemented behavior и явно обозначенные open audit boundaries.
18. `DECISIONS_AND_RATIONALE.md` — архитектурные решения, включая помеченные superseded historical decisions.
19. `DATA_MODELS.md` — IndexedDB/storage/snapshot/receipt models.
20. `TEST_PLAN.md` — regression plan и Git-first recovery gate.
21. `BUILD_AND_RECOVERY_RULES.md` — release/recovery/provenance architecture.
22. `GITHUB_WORKFLOW.md` — PR-first working policy, accepted `protected=false` posture, integrity/release gates.
23. `RELEASE_HISTORY_INDEX.md` — inventory и retention policy исторических evidence-bearing GitHub Releases/tags.
24. `CHANGELOG_AND_RATIONALE.md` — история функциональных изменений.
25. `ASSISTANT_NOTES_AND_LIMITATIONS.md` — технические ограничения.

## Audit evidence

Standalone `AUDIT_DELTA_*.md` больше не являются рабочим слоем current tree. Все ранее существовавшие delta прошли lossless family retirement; исходный Markdown сохранён в family evidence с исходным именем и SHA-256, а полный historical state дополнительно остаётся в Git history.

Основные evidence/history документы:

- `AUDIT_COVERAGE_CYCLE2_MATRIX_2026-08-31.md` — current Cycle-2 Coverage Matrix. First sweep re-triaged all C01…C46: 31 families retain required historical evidence under Change Impact, while 15 contain newly stable Chrome 146–152 renderer variants marked `REVALIDATION-REQUIRED`; PD7 Chrome 153 remains a beta watch. T1 is active View Transition/render-cut fidelity;
- `AUDIT_COVERAGE_CYCLE2_KICKOFF_2026-08-31.md` — current campaign state. Новый полный аудит начат на canonical baseline `2ab1aaca13a34eb64fc6934bc2ebbd042bb070e8`; prior Cycle-1 evidence сохраняется, но affected modern-renderer/platform variants должны пройти explicit Change Impact revalidation;
- `AUDIT_EXTERNAL_USER_INTENT_BASELINE_2026-08-31.md` — current external research baseline. Он покрывает official peer docs/stores, GitHub issue evidence, Reddit/community, independent comparisons, web-archiving/QA patterns и Chrome 146–153 platform delta; Product Opportunity Map остаётся discovery evidence, а не requirement registry;
- `AUDIT_COVERAGE_FINAL_SYNTHESIS_2026-08-31.md` — final project-wide decision Cycle 1. На baseline `52786ca591b90700fb1ed90c2d36746e38c79b88` первая campaign reconciled C01…C46 как terminal at required evidence или explicit bounded external state и перешла в `DEEP-AUDIT-COVERAGE-COMPLETE`; этот статус не переносится автоматически на новый Cycle 2;
- `AUDIT_COVERAGE_RECONSTRUCTION_2026-08-30.md` — detailed Cycle-1 family-level Coverage Matrix и tranche history;
- `AUDIT_HISTORY_INDEX.md` — corrections, retractions, dedup/product-security decisions;
- `AUDIT_EVIDENCE.md` — historical implementation/browser proof;
- `AUDIT_RETIRED_DELTA_EVIDENCE.md` — ранее свёрнутые correction/positive-control deltas;
- `AUDIT_CROSSCUTTING_REVALIDATION_EVIDENCE.md` — broad revalidation/implementation taxonomy;
- `AUDIT_FAMILY_*_EVIDENCE.md` — consolidated family source proof, schedules, corrections, positive controls and acceptance boundaries;
- targeted `AUDIT_*_2026-08-30/31_EVIDENCE.md` files — historical/current-contract L3/L4 physical tranches retained outside family compaction where needed for exact evidence reuse;
- `TEST_EVIDENCE.md` — historical test/browser checkpoints.

`project_tools/audit_cycle2_coverage_sweep.py` — deterministic process guard for the current Cycle-2 Matrix v2 denominator, expected 15-family revalidation set and PD1–PD7 states. It is not a product-runtime test.
`project_tools/audit_coverage_reconciliation.py` — deterministic checkout guard for the completed Cycle-1 C01…C46 reconciliation. It is historical process evidence for Cycle 1 and must not be interpreted as proving Cycle-2 coverage completion.

`CONTEXT_MANIFEST.json` — только машинная навигация; он не хранит competing current status.
`CONTEXT_AUTOMATION_POLICY.md` — process contract для chat handoff/audit/development automation; он не заменяет registry/evidence.
`AUDIT_DELTA_INDEX.md` — только навигация по consolidated families, не status registry.
`PRIORITIES_P0_P1_P2.md` — compatibility pointer на `AUDIT_REGISTRY.md`.
`AUDIT_CHANGE_WORKFLOW.md` — process contract; Issue/PR не заменяют registry/evidence.
`GITHUB_WORKFLOW.md` — canonical private remote, PR-first process, automated integrity gate и manual release gate.
`RELEASE_READINESS.md` — fail-closed release declaration, проверяемая `project_tools/check_release_readiness.py`.
`RELEASE_HISTORY_INDEX.md` — retention authority for existing historical pre-release artifacts; it does not promote them to current releases.