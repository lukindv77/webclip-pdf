# Индекс документации WebClip PDF

Рекомендуемый порядок чтения текущего проекта:

1. `CONTEXT_MANIFEST.json` — machine-readable bootstrap: canonical authorities, task profiles и постоянный handoff trigger.
2. `RESTORE_PROMPT.md` — короткая инструкция восстановления контекста только из свежего GitHub `main`.
3. `CONTEXT_AUTOMATION_POLICY.md` — постоянные правила перехода между чатами, audit/development automation и ограничения против второго source of truth.
4. `AUDIT_REGISTRY.md` — **единый current registry P-кодов, owners и статусов**.
5. `AUDIT_COVERAGE_CYCLE2_MATRIX_2026-08-31.md` — current Cycle-2 Coverage Sweep / Matrix v2: C01…C46 re-triage; после T1+T2 **34 families terminal / 12 Change-Impact revalidation**. PD2 и PD3 закрыты как `ARTIFACT-COVERED / FINDING`; PD1/PD4/PD5/PD6 остаются в очереди, следующий tranche T3.
6. `AUDIT_CYCLE2_T2_PSEUDO_TOP_LAYER_SCROLL_MARKER_2026-08-31.md` — T2/PD3 current-Chrome physical evidence: stable `::backdrop`/`::scroll-marker` печатаются корректно, но page-owned `beforeprint` может молча подменить admitted backdrop и active marker/visible content; finding остаётся под P0-070/P0-075/P0-004 без нового P-кода.
7. `AUDIT_CYCLE2_T1_VIEW_TRANSITION_RENDER_CUT_2026-08-31.md` — T1/PD2 current-Chrome physical evidence: document/element/concurrent/Shadow View Transition midpoint не сохраняется в PDF; finding остаётся под P0-070/P0-075/P0-004 без нового P-кода.
8. `AUDIT_COVERAGE_CYCLE2_KICKOFF_2026-08-31.md` — second full deep-audit campaign start: fresh baseline, platform/external Change Impact variants, initial risk ranking и `DEEP-AUDIT-IN-PROGRESS` state.
9. `AUDIT_EXTERNAL_USER_INTENT_BASELINE_2026-08-31.md` — current substantive external user-intent/product-discovery baseline for Cycle 2, включая fresh peer/community/archive/browser-platform scan.
10. `AUDIT_COVERAGE_FINAL_SYNTHESIS_2026-08-31.md` — final synthesis **previous Cycle 1**; его `DEEP-AUDIT-COVERAGE-COMPLETE` остаётся исторически истинным для завершённой первой кампании, но не означает completion текущего Cycle 2.
11. `AUDIT_COVERAGE_RECONSTRUCTION_2026-08-30.md` — Cycle-1 family-level C01…C46 Coverage Matrix и последовательность targeted revalidation tranches.
12. `AUDIT_COVERAGE_CAMPAIGN_POLICY.md` — обязательная методика systematic deep audit, evidence ladder L1–L5 и project-wide completion gates.
13. `AUDIT_DELTA_INDEX.md` — навигация по полностью консолидированным audit families.
14. `AUDIT_CHANGE_WORKFLOW.md` — жизненный цикл нового finding / P-owner / implementation / evidence / PR / status transition.
15. `TEST_STATUS.md` — текущая правда о тестах/release gate; historical PASS не является current rerun.
16. `RELEASE_READINESS.md` — machine-readable current release-readiness declaration; `NOT READY` является нормальным WIP-состоянием.
17. `PROJECT_OVERVIEW.md` — назначение проекта и основные инварианты.
18. `USER_REQUIREMENTS.md` — актуальные требования и явно отмеченные superseded правила.
19. `ARCHITECTURE.md` — компоненты, current implemented behavior и явно обозначенные open audit boundaries.
20. `DECISIONS_AND_RATIONALE.md` — архитектурные решения, включая помеченные superseded historical decisions.
21. `DATA_MODELS.md` — IndexedDB/storage/snapshot/receipt models.
22. `TEST_PLAN.md` — regression plan и Git-first recovery gate.
23. `BUILD_AND_RECOVERY_RULES.md` — release/recovery/provenance architecture.
24. `GITHUB_WORKFLOW.md` — PR-first working policy, accepted `protected=false` posture, integrity/release gates.
25. `RELEASE_HISTORY_INDEX.md` — inventory и retention policy исторических evidence-bearing GitHub Releases/tags.
26. `CHANGELOG_AND_RATIONALE.md` — история функциональных изменений.
27. `ASSISTANT_NOTES_AND_LIMITATIONS.md` — технические ограничения.

## Audit evidence

Standalone `AUDIT_DELTA_*.md` больше не являются рабочим слоем current tree. Все ранее существовавшие delta прошли lossless family retirement; исходный Markdown сохранён в family evidence с исходным именем и SHA-256, а полный historical state дополнительно остаётся в Git history.

Основные evidence/history документы:

- `AUDIT_COVERAGE_CYCLE2_MATRIX_2026-08-31.md` — current Cycle-2 Coverage Matrix. Все C01…C46 triaged; после T1/PD2 и T2/PD3 **34 families terminal, 12 revalidation**. Remaining set: C02/C03/C05/C07/C16/C18/C20/C28/C29/C32/C33/C35. PD2+PD3 `ARTIFACT-COVERED / FINDING`; PD1/PD4/PD5/PD6 pending; PD7 Chrome 153 remains WATCH;
- `AUDIT_CYCLE2_T2_PSEUDO_TOP_LAYER_SCROLL_MARKER_2026-08-31.md` — durable T2 evidence on Chrome for Testing 152.0.7977.64. Stable blue `::backdrop` and active marker #2 survive physical print, while page-owned `beforeprint` changes physical backdrop blue→red and active marker/content #2/TWO→#3/THREE. Exclude and corrected hover controls remain absent. Existing P0-070/P0-075/P0-004 cover the root cause; Registry unchanged;
- `AUDIT_CYCLE2_T1_VIEW_TRANSITION_RENDER_CUT_2026-08-31.md` — durable T1 evidence on Chrome for Testing 152.0.7977.64. Admitted midpoint visual state at `x=240` is physically serialized as final DOM `x=440` for document, single element, concurrent element and Shadow/composed View Transitions, after which transition animations are gone. Existing P0-070/P0-075/P0-004 cover the root cause; Registry is unchanged;
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

`project_tools/audit_pseudo_top_layer_scroll_marker.py` — reproducible managed-browser T2 probe for native `::backdrop` and active `::scroll-marker` admission-vs-physical-PDF state, including `beforeprint`, Exclude and hover-negative controls.
`project_tools/audit_view_transition_render_cut.py` — reproducible managed-browser T1 probe for document, element and concurrent View Transition admission-vs-physical-PDF geometry plus Exclude/hover controls.
`project_tools/audit_view_transition_shadow_scope.py` — reproducible T1 Shadow/composed-scope View Transition admission-vs-physical-PDF probe.
`project_tools/audit_cycle2_coverage_sweep.py` — deterministic process guard for the current Cycle-2 Matrix v2 denominator, expected **12-family** revalidation set and PD1–PD7 states after T1+T2. It is not a product-runtime test.
`project_tools/audit_coverage_reconciliation.py` — deterministic checkout guard for the completed Cycle-1 C01…C46 reconciliation. It is historical process evidence for Cycle 1 and must not be interpreted as proving Cycle-2 coverage completion.

`CONTEXT_MANIFEST.json` — только машинная навигация; он не хранит competing current status.
`CONTEXT_AUTOMATION_POLICY.md` — process contract для chat handoff/audit/development automation; он не заменяет registry/evidence.
`AUDIT_DELTA_INDEX.md` — только навигация по consolidated families, не status registry.
`PRIORITIES_P0_P1_P2.md` — compatibility pointer на `AUDIT_REGISTRY.md`.
`AUDIT_CHANGE_WORKFLOW.md` — process contract; Issue/PR не заменяют registry/evidence.
`GITHUB_WORKFLOW.md` — canonical private remote, PR-first process, automated integrity gate и manual release gate.
`RELEASE_READINESS.md` — fail-closed release declaration, проверяемая `project_tools/check_release_readiness.py`.
`RELEASE_HISTORY_INDEX.md` — retention authority for existing historical pre-release artifacts; it does not promote them to current releases.