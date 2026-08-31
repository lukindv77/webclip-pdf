# Индекс документации WebClip PDF

Рекомендуемый порядок чтения текущего проекта:

1. `CONTEXT_MANIFEST.json` — machine-readable bootstrap: canonical authorities, task profiles и постоянный handoff trigger.
2. `RESTORE_PROMPT.md` — короткая инструкция восстановления контекста только из свежего GitHub `main`.
3. `CONTEXT_AUTOMATION_POLICY.md` — постоянные правила перехода между чатами, audit/development automation и ограничения против второго source of truth.
4. `AUDIT_REGISTRY.md` — **единый current registry P-кодов, owners и статусов**.
5. `AUDIT_COVERAGE_CYCLE2_MATRIX_2026-08-31.md` — current Cycle-2 Coverage Sweep / Matrix v2: после T1+T2+T3 **38 families terminal / 8 Change-Impact revalidation**. PD2/PD3/PD5 закрыты как `ARTIFACT-COVERED / FINDING`, PD6 как bounded `ARTIFACT-COVERED / PASS-CONTROL (virtual PDF target)`; PD1/PD4 остаются, следующий tranche T4/PD4.
6. `AUDIT_CYCLE2_T3_TEXT_FIT_PAGE_MARGIN_SAFETY_2026-08-31.md` — T3/PD5+PD6 current-Chrome physical evidence: одинаковый admitted `text-fit` state может быть молча refit 680→300 px через host `beforeprint`, физический PDF меняет text geometry и pagination 2→1; `page-margin-safety` корректно парсится и не создаёт unsafe inset на virtual PDF target.
7. `AUDIT_CYCLE2_T2_PSEUDO_TOP_LAYER_SCROLL_MARKER_2026-08-31.md` — T2/PD3 current-Chrome physical evidence: stable `::backdrop`/`::scroll-marker` печатаются корректно, но page-owned `beforeprint` может молча подменить admitted backdrop и active marker/visible content; finding остаётся под P0-070/P0-075/P0-004 без нового P-кода.
8. `AUDIT_CYCLE2_T1_VIEW_TRANSITION_RENDER_CUT_2026-08-31.md` — T1/PD2 current-Chrome physical evidence: document/element/concurrent/Shadow View Transition midpoint не сохраняется в PDF; finding остаётся под P0-070/P0-075/P0-004 без нового P-кода.
9. `AUDIT_COVERAGE_CYCLE2_KICKOFF_2026-08-31.md` — second full deep-audit campaign start: fresh baseline, platform/external Change Impact variants, initial risk ranking и `DEEP-AUDIT-IN-PROGRESS` state.
10. `AUDIT_EXTERNAL_USER_INTENT_BASELINE_2026-08-31.md` — current substantive external user-intent/product-discovery baseline for Cycle 2.
11. `AUDIT_COVERAGE_FINAL_SYNTHESIS_2026-08-31.md` — final synthesis **previous Cycle 1**; его `DEEP-AUDIT-COVERAGE-COMPLETE` исторически истинно для первой кампании, но не означает completion Cycle 2.
12. `AUDIT_COVERAGE_RECONSTRUCTION_2026-08-30.md` — Cycle-1 family-level C01…C46 Coverage Matrix и targeted revalidation history.
13. `AUDIT_COVERAGE_CAMPAIGN_POLICY.md` — обязательная методика systematic deep audit, evidence ladder L1–L5 и project-wide completion gates.
14. `AUDIT_DELTA_INDEX.md` — навигация по полностью консолидированным audit families.
15. `AUDIT_CHANGE_WORKFLOW.md` — жизненный цикл finding / P-owner / implementation / evidence / PR / status transition.
16. `TEST_STATUS.md` — текущая правда о тестах/release gate; historical PASS не является current rerun.
17. `RELEASE_READINESS.md` — machine-readable current release-readiness declaration; `NOT READY` является нормальным WIP-состоянием.
18. `PROJECT_OVERVIEW.md` — назначение проекта и основные инварианты.
19. `USER_REQUIREMENTS.md` — актуальные требования и явно отмеченные superseded правила.
20. `ARCHITECTURE.md` — компоненты, current implemented behavior и открытые audit boundaries.
21. `DECISIONS_AND_RATIONALE.md` — архитектурные решения и superseded historical decisions.
22. `DATA_MODELS.md` — IndexedDB/storage/snapshot/receipt models.
23. `TEST_PLAN.md` — regression plan и Git-first recovery gate.
24. `BUILD_AND_RECOVERY_RULES.md` — release/recovery/provenance architecture.
25. `GITHUB_WORKFLOW.md` — PR-first working policy, accepted `protected=false` posture, integrity/release gates.
26. `RELEASE_HISTORY_INDEX.md` — inventory и retention policy исторических evidence-bearing GitHub Releases/tags.
27. `CHANGELOG_AND_RATIONALE.md` — история функциональных изменений.
28. `ASSISTANT_NOTES_AND_LIMITATIONS.md` — технические ограничения.

## Audit evidence

Standalone `AUDIT_DELTA_*.md` больше не являются рабочим слоем current tree. Все ранее существовавшие delta прошли lossless family retirement; исходный Markdown сохранён в family evidence с исходным именем и SHA-256, а полный historical state дополнительно остаётся в Git history.

Основные evidence/history документы:

- `AUDIT_COVERAGE_CYCLE2_MATRIX_2026-08-31.md` — current Cycle-2 Coverage Matrix. Все C01…C46 triaged; после T3 **38 families terminal, 8 revalidation**. Remaining set: C02/C03/C16/C18/C20/C29/C33/C35. PD2/PD3/PD5 `ARTIFACT-COVERED / FINDING`; PD6 bounded virtual-PDF PASS-CONTROL; PD1/PD4 pending; PD7 WATCH;
- `AUDIT_CYCLE2_T3_TEXT_FIT_PAGE_MARGIN_SAFETY_2026-08-31.md` — durable T3 evidence on Chrome for Testing 152.0.7977.64. Stable `text-fit` physically matches admitted geometry, while byte-identical admission plus page-owned `beforeprint` changes fitted width 680→300 px and physical pagination 2→1. `page-margin-safety:none|clamp|add` is parsed and produces identical virtual-PDF geometry/raster at zero margin; ordinary `@page margin:40px` discriminates. Existing P0-070/P0-075/P0-004 cover the finding; Registry unchanged;
- `AUDIT_CYCLE2_T2_PSEUDO_TOP_LAYER_SCROLL_MARKER_2026-08-31.md` — durable T2 evidence on Chrome 152. Stable blue `::backdrop` and marker #2 survive print; `beforeprint` changes physical state blue→red and #2/TWO→#3/THREE. Existing P0-070/P0-075/P0-004 cover the root cause;
- `AUDIT_CYCLE2_T1_VIEW_TRANSITION_RENDER_CUT_2026-08-31.md` — durable T1 evidence on Chrome 152. Admitted View Transition midpoint `x=240` serializes as final DOM `x=440` across document/element/concurrent/Shadow controls. Existing P0-070/P0-075/P0-004 cover the root cause;
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

- `project_tools/audit_text_fit_page_margin_safety.py` — reproducible managed-browser T3 probe for CSS `text-fit` admitted-vs-physical geometry/page count plus `page-margin-safety` virtual-PDF controls;
- `project_tools/audit_pseudo_top_layer_scroll_marker.py` — T2 probe for native `::backdrop` and active `::scroll-marker` admission-vs-physical-PDF state;
- `project_tools/audit_view_transition_render_cut.py` — T1 probe for document, element and concurrent View Transition admission-vs-physical-PDF geometry;
- `project_tools/audit_view_transition_shadow_scope.py` — T1 Shadow/composed-scope View Transition probe;
- `project_tools/audit_cycle2_coverage_sweep.py` — deterministic process guard for current Cycle-2 C01…C46 denominator, expected **8-family** revalidation set and PD1–PD7 states after T1+T2+T3; not a product-runtime test;
- `project_tools/audit_coverage_reconciliation.py` — deterministic historical guard for completed Cycle-1 C01…C46 reconciliation.

`CONTEXT_MANIFEST.json` — только машинная навигация; он не хранит competing current status.
`CONTEXT_AUTOMATION_POLICY.md` — process contract для chat handoff/audit/development automation; он не заменяет registry/evidence.
`AUDIT_DELTA_INDEX.md` — только навигация по consolidated families, не status registry.
`PRIORITIES_P0_P1_P2.md` — compatibility pointer на `AUDIT_REGISTRY.md`.
`AUDIT_CHANGE_WORKFLOW.md` — process contract; Issue/PR не заменяют registry/evidence.
`GITHUB_WORKFLOW.md` — canonical private remote, PR-first process, automated integrity gate и manual release gate.
`RELEASE_READINESS.md` — fail-closed release declaration, проверяемая `project_tools/check_release_readiness.py`.
`RELEASE_HISTORY_INDEX.md` — retention authority for existing historical pre-release artifacts; it does not promote them to current releases.
