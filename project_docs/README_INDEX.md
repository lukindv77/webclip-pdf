# Индекс документации WebClip PDF

Рекомендуемый порядок чтения текущего проекта:

1. `CONTEXT_MANIFEST.json` — machine-readable bootstrap: canonical authorities, task profiles и handoff trigger.
2. `RESTORE_PROMPT.md` — восстановление контекста только из свежего GitHub `main`.
3. `CONTEXT_AUTOMATION_POLICY.md` — правила audit/development handoff без второго source of truth.
4. `AUDIT_REGISTRY.md` — **единый current registry P-кодов, owners и статусов**.
5. `AUDIT_COVERAGE_CYCLE2_FINAL_SYNTHESIS_2026-09-01.md` — current project-wide Cycle-2 Coverage Reconciliation / Final Synthesis: **`DEEP-AUDIT-COVERAGE-COMPLETE`**, при этом critical closure не заявлен и `RELEASE_READINESS.md` остаётся `NOT READY`.
6. `AUDIT_COVERAGE_CYCLE2_MATRIX_2026-08-31.md` — final reconciled Cycle-2 Matrix: **46/46 terminal, 0 revalidation**; PD1–PD5 `ARTIFACT-COVERED / FINDING`, PD6 bounded virtual-PDF PASS-control, PD7 WATCH; explicit L5 set C17/C37/C41/C42/C44/C46, C46 bounded UNKNOWN.
7. `AUDIT_CYCLE2_T5_SCROLL_TRIGGERED_ANIMATION_2026-09-01.md` — T5/PD1 current-Chrome physical evidence: identical admitted green/final scroll-trigger state can be reset by selected-only geometry before PDF; nested-scroll and no-user-scroll controls bound the finding.
8. `AUDIT_CYCLE2_T4_SCOPED_CUSTOM_ELEMENT_REGISTRY_2026-08-31.md` — T4/PD4 physical evidence: wrong-registry SelectionSnapshot restore and scoped-shadow Main Content blindness; Shadow/frame controls.
9. `AUDIT_CYCLE2_T3_TEXT_FIT_PAGE_MARGIN_SAFETY_2026-08-31.md` — T3/PD5+PD6: admitted `text-fit` geometry/pagination substitution and bounded virtual-PDF `page-margin-safety` control.
10. `AUDIT_CYCLE2_T2_PSEUDO_TOP_LAYER_SCROLL_MARKER_2026-08-31.md` — T2/PD3: admitted `::backdrop`/`::scroll-marker` state can be changed at print cut.
11. `AUDIT_CYCLE2_T1_VIEW_TRANSITION_RENDER_CUT_2026-08-31.md` — T1/PD2: admitted View Transition midpoint serializes as final underlying DOM state.
12. `AUDIT_COVERAGE_CYCLE2_KICKOFF_2026-08-31.md` — Cycle-2 campaign start, initial platform/external Change Impact and risk ranking.
13. `AUDIT_EXTERNAL_USER_INTENT_BASELINE_2026-08-31.md` — substantive external research baseline used by Cycle 2.
14. `AUDIT_COVERAGE_FINAL_SYNTHESIS_2026-08-31.md` — previous **Cycle 1** final synthesis; historical for that campaign only.
15. `AUDIT_COVERAGE_RECONSTRUCTION_2026-08-30.md` — Cycle-1 C01…C46 matrix and tranche history.
16. `AUDIT_COVERAGE_CAMPAIGN_POLICY.md` — mandatory deep-audit methodology, evidence ladder and project-wide completion gates.
17. `AUDIT_EXTERNAL_USER_INTENT_RESEARCH_POLICY.md` — external research/freshness contract.
18. `AUDIT_DELTA_INDEX.md` — navigation across consolidated audit families.
19. `AUDIT_CHANGE_WORKFLOW.md` — finding/owner/implementation/evidence/PR lifecycle.
20. `AUDIT_HISTORY_INDEX.md` — corrections, retractions, dedup and product/security decisions.
21. `TEST_STATUS.md` — current test/release-gate truth; historical PASS is not a current rerun.
22. `RELEASE_READINESS.md` — fail-closed current release declaration; currently `NOT READY`.
23. `PROJECT_OVERVIEW.md` — project purpose and invariants.
24. `USER_REQUIREMENTS.md` — current requirements and explicit supersessions.
25. `WEBCLIP_PDF_FIDELITY_CONTRACT.md` — current PDF fidelity/authority contract.
26. `ARCHITECTURE.md` — components, implemented behavior and open boundaries.
27. `DECISIONS_AND_RATIONALE.md` — architecture/product decisions and superseded history.
28. `DATA_MODELS.md` — IndexedDB/storage/snapshot/receipt models.
29. `TEST_PLAN.md` — regression plan and Git-first recovery gate.
30. `BUILD_AND_RECOVERY_RULES.md` — release/recovery/provenance architecture.
31. `GITHUB_WORKFLOW.md` — PR-first workflow, integrity and release gates.
32. `RELEASE_HISTORY_INDEX.md` — historical evidence-bearing release/tag retention.
33. `CHANGELOG_AND_RATIONALE.md` — functional change history.
34. `ASSISTANT_NOTES_AND_LIMITATIONS.md` — technical limitations.

## Current audit state

Cycle 2 is now **`DEEP-AUDIT-COVERAGE-COMPLETE`** after the separate final reconciliation. This means all material current campaign families are terminal at required evidence or explicit bounded external/out-of-scope state. It does **not** mean the findings are fixed.

Stronger states remain false/currently unclaimed:

- `DEEP-AUDIT-CRITICAL-CLOSURE-COMPLETE` — not claimed; ACTIVE P0/P1 owners remain in `AUDIT_REGISTRY.md`;
- `RELEASE-READY` — not claimed; `RELEASE_READINESS.md` remains `NOT READY` and real unpacked Chrome/native/Yandex evidence is pending.

Explicit residual external families remain C17, C37, C41, C42, C44 and C46. C46 remains `EXTERNAL-REQUIRED / UNKNOWN`; this is a bounded L5 evidence boundary, not a hidden audit gap.

## Functional Closure Sweep evidence

- `AUDIT_P0_077_JOURNAL_RESTORE_ENVELOPE_CLOSURE_2026-09-01_EVIDENCE.md` — same-version Journal self-restore envelope closure: export success is capped to 50 MiB UTF-8 / 100,000 entries, 4–8 MiB valid single records remain exportable, and import options cannot widen beyond the shared versioned envelope. **P0-077 is DONE.**
- `AUDIT_P0_048_LOCAL_DOWNLOAD_IDENTITY_CLOSURE_2026-09-01_EVIDENCE.md` — deterministic closure of local-download fallback identity ambiguity: exact Blob URL remains primary, filename/size fallback requires unique intent↔DownloadItem ownership, and numeric downloadId binding is transactional no-overwrite. **P0-048 is DONE.**
- `AUDIT_P0_039_LOCAL_DOWNLOAD_UNKNOWN_RECOVERY_CLOSURE_2026-09-01_EVIDENCE.md` — deterministic closure of unknown automatic local-download recovery: missing Chrome history after TTL now preserves bounded manual-resolution metadata/operation evidence instead of deleting it, with no false Journal success. **P0-039 is DONE.**
- `AUDIT_P0_033_SIGNED_YANDEX_LOG_REDACTION_CLOSURE_2026-09-01_EVIDENCE.md` — deterministic closure of signed Yandex Disk transport URL confidentiality in OperationLog. `.disk.yandex.net` and `.disk.yandex.ru` capability URLs now retain only origin + a constant redacted path in direct and nested metadata. **P0-033 is DONE.**
After Cycle-2 coverage completion, new audit work is risk-ranked against existing ACTIVE Registry owners rather than extending coverage for its own sake.

- `AUDIT_P0_064_FRAME_PROXY_BUDGET_CLOSURE_2026-09-01_EVIDENCE.md` — current Chrome-152 closure of flattened same-origin iframe materialization admission. A pointer-based preflight executes before complete `childNodes` materialization/deep clone/full descendant arrays; 5,001-node, 2,000,001-text-unit and 8,388,609-estimated-byte controls all reject with zero deep-clone delta, while an under-budget proxy remains physically printable. The same run revalidates the inert-proxy behavior under budget-first bootstrap. **P0-064 is DONE.**
- `AUDIT_P0_068_INERT_FRAME_PROXY_CLOSURE_2026-09-01_EVIDENCE.md` — current Chrome-152 closure of the flattened same-origin iframe active-clone root. Native deep cloning demonstrably executes custom-element lifecycle, inline handler and nested iframe/object loads; the isolated-world inert mirror prevents those effects before live insertion while preserving ordinary selected text/table and Exclude behavior in the physical PDF. **P0-068 is DONE; duplicate P1-213 is MERGED → P0-068.**
- `AUDIT_P0_071_PRINT_RENDER_GUARD_CLOSURE_2026-09-01_EVIDENCE.md` — current Chrome-152 closure of actual printed URI-scheme safety at the `Page.printToPDF` render cut. **P0-071 is DONE.**
- `AUDIT_FUNCTIONAL_P0_071_PRINT_LINK_SCHEME_RENDER_CUT_2026-09-01.md` — historical pre-fix Chrome-152 finding that proved page-owned `beforeprint` could substitute `javascript:`/`data:` URI annotations. Its then-current `ACTIVE` conclusion is superseded by the later direct closure record above; Registry current status is `DONE`.
- `AUDIT_FUNCTIONAL_P0_067_HOST_CONTROL_ACTIVATION_2026-09-01.md` — current Chrome-152 browser-level re-check of P0-067 through the exact `content.js` download/prepare path. A disclosure-looking `BUTTON type=submit` with `aria-controls` is accepted as safe, `triggerInternalClick()` executes the real `control.click()`, and host-page counters change `clicks 0→1`, `submits 0→1` before WebClip continues to `WEBCLIP_GENERATE_PDF`. **P0-067 remains ACTIVE; no new P-code.**
- `AUDIT_FUNCTIONAL_P0_023_P0_079_PDF_CACHE_AUTHORITY_2026-09-01.md` — exact-source deterministic re-check of the shared mutable PDF retry-cache boundary. Current `pdfCacheKey(tabId)` is `tab:<id>`; a same-tab document replacement makes an old retry resolve the newer document (P0-023), while a later same-tab save can overwrite the slot before offscreen dereference so transfer op-A resolves op-B bytes (P0-079). **Both owners remain ACTIVE; no new P-code.**
- `AUDIT_FUNCTIONAL_P0_004_SELECTED_ANCESTOR_2026-09-01.md` — current Chrome-152 physical re-check of P0-004. Exact product selected-only print CSS still allows an unselected ordinary ancestor to clip selected content (2 pages → 1; bottom sentinel lost) and inject its red/blue/magenta presentation into the PDF. A test-only normalization control restores complete selected output and removes ancestor paint. **P0-004 remains ACTIVE; no new P-code.**

## Main Cycle-2 evidence

- `AUDIT_COVERAGE_CYCLE2_FINAL_SYNTHESIS_2026-09-01.md` — final B1→B9 synthesis, terminality, staleness, external freshness, ownership and residual-risk decision.
- `AUDIT_COVERAGE_CYCLE2_MATRIX_2026-08-31.md` — final 46-family denominator and PD/EI disposition.
- `AUDIT_CYCLE2_T5_SCROLL_TRIGGERED_ANIMATION_2026-09-01.md` — PD1.
- `AUDIT_CYCLE2_T4_SCOPED_CUSTOM_ELEMENT_REGISTRY_2026-08-31.md` — PD4.
- `AUDIT_CYCLE2_T3_TEXT_FIT_PAGE_MARGIN_SAFETY_2026-08-31.md` — PD5/PD6.
- `AUDIT_CYCLE2_T2_PSEUDO_TOP_LAYER_SCROLL_MARKER_2026-08-31.md` — PD3.
- `AUDIT_CYCLE2_T1_VIEW_TRANSITION_RENDER_CUT_2026-08-31.md` — PD2.
- `AUDIT_EXTERNAL_USER_INTENT_BASELINE_2026-08-31.md` — external user-intent/platform input.

Historical consolidated evidence remains in `AUDIT_EVIDENCE.md`, `AUDIT_RETIRED_DELTA_EVIDENCE.md`, `AUDIT_CROSSCUTTING_REVALIDATION_EVIDENCE.md`, `AUDIT_FAMILY_*_EVIDENCE.md`, targeted `AUDIT_*_EVIDENCE.md` files and `TEST_EVIDENCE.md`.

## Current audit tools

- `project_tools/test_p0_077_journal_restore_envelope.js` — deterministic P0-077 regression for byte/count/per-entry same-version restore boundaries, real guarded cursor batching, staging cleanup and import-option clamping.
- `project_tools/test_p0_048_local_download_identity.js` — deterministic P0-048 regression for exact Blob URL precedence, ambiguous filename/size fallback, unique active-intent ownership and atomic numeric downloadId collision refusal.
- `project_tools/test_p0_039_local_download_dead_letter.js` — deterministic P0-039 regression for both TTL paths, bounded unknown/manual-resolution state, metadata preservation, maintenance exclusion and late exact settlement compatibility.
- `project_tools/test_p0_033_signed_yandex_log_redaction.js` — deterministic P0-033 failure/closure regression for direct/nested signed Yandex URL redaction and classic-worker bootstrap binding order.
- `project_tools/audit_p0_064_frame_proxy_budget.py` — P0-064 Chrome-152 closure harness for pre-clone node/text/estimated-byte admission, unrelated-DOM negative controls and under-budget physical PDF output.
- `project_tools/test_p0_064_frame_proxy_budget.js` — deterministic P0-064 preflight limits, fail-before-clone ordering and budget→inert→content injection regression.
- `project_tools/audit_p0_068_inert_frame_proxy.py` — P0-068/P1-213 Chrome-152 physical closure/revalidation harness with native deep-clone failure control, real MV3 isolated-world injection proof, active-context/lifecycle/network side-effect checks and physical PDF positive controls.
- `project_tools/test_p0_068_inert_frame_proxy.js` — deterministic inert-clone and injection-order regression for the single audited `content.js` deep-clone boundary.
- `project_tools/audit_print_link_scheme_render_cut.py` — historical functional P0-071 Chrome-152 finding harness; current closure is guarded by `audit_p0_071_print_render_guard.py`.
- `project_tools/audit_p0_071_print_render_guard.py` — current P0-071 Chrome-152 physical closure harness for actual printed URI-scheme safety.
- `project_tools/audit_host_control_activation.py` — functional P0-067 Chrome-152 browser regression through exact current `content.js`: proves that PDF disclosure preparation can execute a real host submit control and then continue to PDF generation.
- `project_tools/audit_pdf_cache_generation_authority.py` — functional P0-023/P0-079 deterministic regression bound to exact current `service-worker.js`/`offscreen.js`: proves same-tab document-generation replacement and save-operation byte substitution through the mutable `tab:<id>` cache slot.
- `project_tools/audit_selected_ancestor_presentation.py` — functional P0-004 Chrome-152 physical regression: extracts exact current selected-only CSS from `content.js`, checks selected-content completeness and unselected ancestor presentation, and includes an explicit test-only causal discriminator.
- `project_tools/audit_cycle2_final_reconciliation.py` — deterministic final guard: C01…C46 terminality, zero revalidation, explicit L5/C46 UNKNOWN, synthesis/release separation, canonical-owner presence and git-based Cycle-2 runtime/contract staleness check.
- `project_tools/audit_cycle2_coverage_sweep.py` — deterministic final Matrix guard for 46/0 and PD1–PD7 states.
- `project_tools/audit_scroll_triggered_animation.py` — T5 Chrome-152 physical probe.
- `project_tools/audit_scoped_custom_element_registry.py` — T4 Chrome-152 physical probe.
- `project_tools/audit_text_fit_page_margin_safety.py` — T3 physical probe.
- `project_tools/audit_pseudo_top_layer_scroll_marker.py` — T2 physical probe.
- `project_tools/audit_view_transition_render_cut.py` and `audit_view_transition_shadow_scope.py` — T1 physical probes.
- `project_tools/audit_coverage_reconciliation.py` — historical Cycle-1 reconciliation guard.

`CONTEXT_MANIFEST.json` is navigation only; it does not compete with Registry/Matrix/synthesis status. `PRIORITIES_P0_P1_P2.md` remains a compatibility pointer to `AUDIT_REGISTRY.md`. No audit coverage decision creates a build/tag/Release.
