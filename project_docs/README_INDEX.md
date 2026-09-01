# Индекс документации WebClip PDF

Рекомендуемый порядок чтения текущего проекта:

1. `CONTEXT_MANIFEST.json` — machine-readable bootstrap: canonical authorities, task profiles и постоянный handoff trigger.
2. `RESTORE_PROMPT.md` — короткая инструкция восстановления контекста только из свежего GitHub `main`.
3. `CONTEXT_AUTOMATION_POLICY.md` — постоянные правила перехода между чатами, audit/development automation и ограничения против второго source of truth.
4. `AUDIT_REGISTRY.md` — **единый current registry P-кодов, owners и статусов**.
5. `AUDIT_COVERAGE_CYCLE2_MATRIX_2026-08-31.md` — current Cycle-2 Coverage Sweep / Matrix v2: после T1…T5 **46 families terminal / 0 Change-Impact revalidation**. PD1–PD5 закрыты как `ARTIFACT-COVERED / FINDING`, PD6 как bounded `ARTIFACT-COVERED / PASS-CONTROL (virtual PDF target)`; финальная Cycle-2 reconciliation ещё обязательна до объявления coverage completion.
6. `AUDIT_CYCLE2_T5_SCROLL_TRIGGERED_ANIMATION_2026-09-01.md` — T5/PD1 current-Chrome physical evidence: одинаковый admitted green/final scroll-trigger state сохраняется в stable whole-body control, но selected-only materialization может сдвинуть view-trigger из active range и reset его в red/origin до PDF; nested-scroll и no-user-scroll controls ограничивают вывод.
7. `AUDIT_CYCLE2_T4_SCOPED_CUSTOM_ELEMENT_REGISTRY_2026-08-31.md` — T4/PD4 current-Chrome physical evidence: SelectionSnapshot молча восстанавливает same-light-identity registry A→B без ambiguity, Main Content игнорирует сильнейший scoped-shadow article; manual top-level Shadow и same-origin scoped frame являются положительными физическими controls.
8. `AUDIT_CYCLE2_T3_TEXT_FIT_PAGE_MARGIN_SAFETY_2026-08-31.md` — T3/PD5+PD6 current-Chrome physical evidence: одинаковый admitted `text-fit` state может быть молча refit 680→300 px через host `beforeprint`, физический PDF меняет text geometry и pagination 2→1; `page-margin-safety` корректно парсится и не создаёт unsafe inset на virtual PDF target.
9. `AUDIT_CYCLE2_T2_PSEUDO_TOP_LAYER_SCROLL_MARKER_2026-08-31.md` — T2/PD3 current-Chrome physical evidence: stable `::backdrop`/`::scroll-marker` печатаются корректно, но page-owned `beforeprint` может молча подменить admitted backdrop и active marker/visible content.
10. `AUDIT_CYCLE2_T1_VIEW_TRANSITION_RENDER_CUT_2026-08-31.md` — T1/PD2 current-Chrome physical evidence: document/element/concurrent/Shadow View Transition midpoint не сохраняется в PDF.
11. `AUDIT_COVERAGE_CYCLE2_KICKOFF_2026-08-31.md` — second full deep-audit campaign start: fresh baseline, platform/external Change Impact variants, initial risk ranking и `DEEP-AUDIT-IN-PROGRESS` state.
12. `AUDIT_EXTERNAL_USER_INTENT_BASELINE_2026-08-31.md` — current substantive external user-intent/product-discovery baseline for Cycle 2.
13. `AUDIT_COVERAGE_FINAL_SYNTHESIS_2026-08-31.md` — final synthesis **previous Cycle 1**; его `DEEP-AUDIT-COVERAGE-COMPLETE` исторически истинно для первой кампании, но не означает completion Cycle 2.
14. `AUDIT_COVERAGE_RECONSTRUCTION_2026-08-30.md` — Cycle-1 family-level C01…C46 Coverage Matrix и targeted revalidation history.
15. `AUDIT_COVERAGE_CAMPAIGN_POLICY.md` — обязательная методика systematic deep audit, evidence ladder L1–L5 и project-wide completion gates.
16. `AUDIT_DELTA_INDEX.md` — навигация по полностью консолидированным audit families.
17. `AUDIT_CHANGE_WORKFLOW.md` — жизненный цикл finding / P-owner / implementation / evidence / PR / status transition.
18. `TEST_STATUS.md` — текущая правда о тестах/release gate; historical PASS не является current rerun.
19. `RELEASE_READINESS.md` — machine-readable current release-readiness declaration; `NOT READY` является нормальным WIP-состоянием.
20. `PROJECT_OVERVIEW.md` — назначение проекта и основные инварианты.
21. `USER_REQUIREMENTS.md` — актуальные требования и явно отмеченные superseded правила.
22. `ARCHITECTURE.md` — компоненты, current implemented behavior и открытые audit boundaries.
23. `DECISIONS_AND_RATIONALE.md` — архитектурные решения и superseded historical decisions.
24. `DATA_MODELS.md` — IndexedDB/storage/snapshot/receipt models.
25. `TEST_PLAN.md` — regression plan и Git-first recovery gate.
26. `BUILD_AND_RECOVERY_RULES.md` — release/recovery/provenance architecture.
27. `GITHUB_WORKFLOW.md` — PR-first working policy, accepted `protected=false` posture, integrity/release gates.
28. `RELEASE_HISTORY_INDEX.md` — inventory и retention policy исторических evidence-bearing GitHub Releases/tags.
29. `CHANGELOG_AND_RATIONALE.md` — история функциональных изменений.
30. `ASSISTANT_NOTES_AND_LIMITATIONS.md` — технические ограничения.

## Audit evidence

Standalone `AUDIT_DELTA_*.md` больше не являются рабочим слоем current tree. Все ранее существовавшие delta прошли lossless family retirement; исходный Markdown сохранён в family evidence с исходным именем и SHA-256, а полный historical state дополнительно остаётся в Git history.

Основные evidence/history документы:

- `AUDIT_COVERAGE_CYCLE2_MATRIX_2026-08-31.md` — current Cycle-2 Coverage Matrix. Все C01…C46 triaged; после T5 **46 families terminal, 0 revalidation**. PD1/PD2/PD3/PD4/PD5 `ARTIFACT-COVERED / FINDING`; PD6 bounded virtual-PDF PASS-CONTROL; PD7 WATCH. Campaign всё ещё `DEEP-AUDIT-IN-PROGRESS` до отдельной final reconciliation;
- `AUDIT_CYCLE2_T5_SCROLL_TRIGGERED_ANIMATION_2026-09-01.md` — durable T5 evidence on Chrome for Testing 152.0.7977.64. Stable-body и selection-only controls имеют одинаковый admitted target hash и green/final state. Selected-only preparation скрывает 1000px predecessor, переносит view-trigger y=50→≈-758, reset-ит animation 220→0 и физический PDF становится red/origin. Nested-scroll final state сохраняется; без user scroll новый логический batch не создаётся. Existing P0-070/P0-075/P0-004 с P1-230 support покрывают finding; Registry unchanged;
- `AUDIT_CYCLE2_T4_SCOPED_CUSTOM_ELEMENT_REGISTRY_2026-08-31.md` — durable T4 evidence on Chrome 152: registry A→B SelectionSnapshot identity substitution и scoped-shadow Main Content blindness; manual Shadow/frame controls;
- `AUDIT_CYCLE2_T3_TEXT_FIT_PAGE_MARGIN_SAFETY_2026-08-31.md` — durable T3 evidence: `text-fit` admitted-vs-render-cut substitution и bounded `page-margin-safety` virtual-PDF control;
- `AUDIT_CYCLE2_T2_PSEUDO_TOP_LAYER_SCROLL_MARKER_2026-08-31.md` — durable T2 evidence: admitted backdrop/marker state can change at `beforeprint`;
- `AUDIT_CYCLE2_T1_VIEW_TRANSITION_RENDER_CUT_2026-08-31.md` — durable T1 evidence: admitted View Transition midpoint serializes as final DOM state;
- `AUDIT_COVERAGE_CYCLE2_KICKOFF_2026-08-31.md` — current campaign start and PD/EI variant definitions;
- `AUDIT_EXTERNAL_USER_INTENT_BASELINE_2026-08-31.md` — current external research baseline and product-opportunity discovery evidence;
- `AUDIT_COVERAGE_FINAL_SYNTHESIS_2026-08-31.md` — final project-wide Cycle-1 decision; it does not automatically prove Cycle-2 completion;
- `AUDIT_COVERAGE_RECONSTRUCTION_2026-08-30.md` — detailed Cycle-1 family-level Coverage Matrix and tranche history;
- `AUDIT_HISTORY_INDEX.md` — corrections, retractions, dedup/product-security decisions;
- `AUDIT_EVIDENCE.md` — historical implementation/browser proof;
- `AUDIT_RETIRED_DELTA_EVIDENCE.md` — retired correction/positive-control deltas;
- `AUDIT_CROSSCUTTING_REVALIDATION_EVIDENCE.md` — broad revalidation/implementation taxonomy;
- `AUDIT_FAMILY_*_EVIDENCE.md` — consolidated family source proof, schedules, corrections, positive controls and acceptance boundaries;
- targeted `AUDIT_*_2026-08-30/31_EVIDENCE.md` files — retained L3/L4 physical tranches;
- `TEST_EVIDENCE.md` — historical test/browser checkpoints.

Current audit tools:

- `project_tools/audit_scroll_triggered_animation.py` — reproducible T5 Chrome-152 probe for scroll-trigger feature support, stable vs selected-only trigger-state fidelity, nested-scroll breadth and no-auto-scroll C22 boundary;
- `project_tools/audit_scoped_custom_element_registry.py` — reproducible T4 probe for scoped-registry feature support, SelectionSnapshot registry identity, Main Content scoped-shadow discovery and same-origin frame representation;
- `project_tools/audit_text_fit_page_margin_safety.py` — T3 probe for CSS `text-fit` admitted-vs-physical geometry/page count plus `page-margin-safety` virtual-PDF controls;
- `project_tools/audit_pseudo_top_layer_scroll_marker.py` — T2 probe for native `::backdrop` and active `::scroll-marker` admission-vs-physical-PDF state;
- `project_tools/audit_view_transition_render_cut.py` — T1 probe for document, element and concurrent View Transition admission-vs-physical-PDF geometry;
- `project_tools/audit_view_transition_shadow_scope.py` — T1 Shadow/composed-scope View Transition probe;
- `project_tools/audit_cycle2_coverage_sweep.py` — deterministic process guard for current Cycle-2 C01…C46 denominator, expected **zero-family** revalidation set and PD1–PD7 states after T1…T5; final synthesis remains a separate gate;
- `project_tools/audit_coverage_reconciliation.py` — deterministic historical guard for completed Cycle-1 C01…C46 reconciliation.

`CONTEXT_MANIFEST.json` — только машинная навигация; он не хранит competing current status.
`CONTEXT_AUTOMATION_POLICY.md` — process contract для chat handoff/audit/development automation; он не заменяет registry/evidence.
`AUDIT_DELTA_INDEX.md` — только навигация по consolidated families, не status registry.
`PRIORITIES_P0_P1_P2.md` — compatibility pointer на `AUDIT_REGISTRY.md`.
`AUDIT_CHANGE_WORKFLOW.md` — process contract; Issue/PR не заменяют registry/evidence.
`GITHUB_WORKFLOW.md` — canonical private remote, PR-first process, automated integrity gate и manual release gate.
`RELEASE_READINESS.md` — fail-closed release declaration, проверяемая `project_tools/check_release_readiness.py`.
`RELEASE_HISTORY_INDEX.md` — retention authority for existing historical pre-release artifacts; it does not promote them to current releases.
