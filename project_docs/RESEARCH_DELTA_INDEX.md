# Research family navigation index

This file is **navigation only**. Current P-code status and single-owner authority come exclusively from `RESEARCH_REGISTRY.md`. Detailed source proof remains in durable evidence files and Git history.

## Consolidation state

The standalone `RESEARCH_DELTA_*.md` working layer is fully retired in the current tree. The former 189-delta layer was embedded losslessly into family/cross-cutting evidence; the final temporary selection/capture delta is preserved verbatim in `RESEARCH_RETIRED_DELTA_EVIDENCE.md` with exact Git provenance and a byte-for-byte CI self-test.

The interruption-safe staged evidence series covered by the 2026-09-01 cleanup are also fully compacted. Each completed compaction retains one compact current semantic document plus exact historical source commit/blob receipts verified by `project_tools/test_staged_evidence_compaction.py`. No staged checkpoint is a status authority.

Eight older staged families were already present outside that cleanup set when the steady-state repository-hygiene policy was introduced on 2026-09-01. They are a **frozen legacy baseline**, not active working series: they may only shrink through separately proven lossless compaction and must not gain new STAGE checkpoints. Exact retained checkpoint paths are listed below so repository hygiene can distinguish known historical debt from new growth.

## Primary evidence families

| # | Family | Consolidated evidence | Primary owners / scope | Retired deltas |
|---:|---|---|---|---:|
| 1 | Backup / scheduler / remote recovery generation | `RESEARCH_FAMILY_BACKUP_RECOVERY_GENERATION_EVIDENCE.md` | P1-076, P1-077, P1-117, P1-177, P1-184, P1-194, P1-207, P1-208, P1-210, P0-074 | 25 |
| 2 | Yandex auth / config / immutable operation context / Settings UI | `RESEARCH_FAMILY_YANDEX_AUTH_CONFIG_EVIDENCE.md` | P0-074, P0-078, P1-157, P1-158, P1-165, P1-175, P1-178, P1-184, P1-195, P1-196, P1-210, P1-222, P1-223 | 24 |
| 3 | Yandex remote identity / move / publication / destructive lifecycle | `RESEARCH_FAMILY_YANDEX_REMOTE_IDENTITY_EVIDENCE.md` | P0-022, P0-040, P0-069, P0-072, P0-073, P0-074, P0-078, P1-090, P1-164, P1-175, P1-184, P1-210 | 21 |
| 4 | Backup restore/import from Yandex | `RESEARCH_FAMILY_BACKUP_RESTORE_EVIDENCE.md` | P0-013, P0-022, P0-073, P0-074, P1-035, P1-069, P1-184, P1-210, P1-215 | 4 |
| 5 | Journal import / provenance / portable schema / legacy identity | `RESEARCH_FAMILY_JOURNAL_IMPORT_PROVENANCE_EVIDENCE.md` | P0-013, P0-022, P0-073, P0-076, P0-077, P1-030, P1-035, P1-042, P1-069, P1-206, P1-211, P1-215, P1-216 | 15 |
| 6 | Journal read/view revision / pagination / open/apply / bulk authority | `RESEARCH_FAMILY_JOURNAL_VIEW_AUTHORITY_EVIDENCE.md` | P0-076, P0-080, P1-001, P1-009, P1-175, P1-206, P1-210 | 18 |
| 7 | Journal comments / tombstones / edit generations | `RESEARCH_FAMILY_JOURNAL_COMMENTS_EVIDENCE.md` | P0-076, P1-202, P1-211, P1-225 | previously consolidated |
| 8 | Operation receipt / OperationLog / user reconciliation | `RESEARCH_FAMILY_OPERATION_RECEIPTS_EVIDENCE.md` | P1-145, P1-197, P1-198, P1-205, P1-210 and durability/maintenance owners | 15 |
| 9 | Local download / native Save As / file settlement | `RESEARCH_FAMILY_LOCAL_DOWNLOAD_SAVEAS_EVIDENCE.md` | P0-039, P1-079, P1-080, P1-087, P1-129, P1-146, P1-156, P1-169, P1-210 | 12 |
| 10 | Chrome/MV3 APIs / browser-owned state / extension-page transport | `RESEARCH_FAMILY_CHROME_MV3_SETTLEMENT_EVIDENCE.md` | P1-123…P1-131, P1-157, P1-158, P1-166, P1-170, P1-173, P1-203, P1-204, P1-209, P1-210, P1-217 | 17 |
| 11 | Frame permission / cross-origin frame identity and command generation | `RESEARCH_FAMILY_FRAME_PERMISSION_IDENTITY_EVIDENCE.md` | P1-004, P1-157, P1-171, P1-193, P1-199…P1-203, P1-214, P1-229 | 12 |
| 12 | PDF/print / offscreen lifetime / rollback / source generation | `RESEARCH_FAMILY_PDF_PRINT_OFFSCREEN_EVIDENCE.md` | P0-003, P0-004, P0-023, P0-063, P0-065, P0-067, P0-068, P0-070, P0-071, P0-075, P0-080, P1-003, P1-069, P1-149…P1-153, P1-160, P1-167, P1-187, P1-199, P1-212…P1-214, P1-218…P1-224, P1-226…P1-229 | 26 |
| 13 | Incognito / trust boundaries / signed-link redaction | `RESEARCH_FAMILY_PRIVACY_TRUST_EVIDENCE.md` | P0-033, P0-045 | previously consolidated |
| 14 | Derived URL stats / view indexes | `RESEARCH_FAMILY_URLSTATS_EVIDENCE.md` | P0-050 | previously consolidated |
| 15 | Broad revalidation / cross-cutting inventories | `RESEARCH_CROSSCUTTING_REVALIDATION_EVIDENCE.md` | cross-cutting historical controls | previously consolidated |

## Supplemental durable evidence

### 2026-09-12/13/16 closure-oriented revalidation tranche

These files are fresh-current-source owner/coverage evidence added after the older family consolidation. They are listed here for navigation only: `RESEARCH_REGISTRY.md` still controls current owner/status, and none of these pointers by itself implies implementation closure or release readiness.

- `RESEARCH_P1_227_LIVE_FRAME_TOPOLOGY_REVALIDATION_2026-09-12_EVIDENCE.md` — P1-227 live same-origin frame-topology revalidation; deterministic model `project_tools/test_p1_227_live_frame_topology_revalidation_model.js` plus browser control `project_tools/research_p1_227_live_frame_topology_browser_control.js` (PR #241).
- `RESEARCH_FULL_RESTART_C42_YANDEX_UPLOAD_OBJECT_PUBLIC_IDENTITY_2026-09-12_EVIDENCE.md` — C42 exact Yandex upload/object/public identity evidence, with deterministic object-receipt model `project_tools/test_c42_yandex_exact_object_receipt_model.js` (PR #242).
- `RESEARCH_EXTERNAL_USER_INTENT_DELTA_2026-09-12.md` — fresh external user-intent evidence stream used by the final coverage reconciliation (PR #242).
- `RESEARCH_FULL_RESTART_COVERAGE_RECONCILIATION_FINAL_SYNTHESIS_2026-09-12.md` — project-wide research-coverage synthesis. Its `DEEP-RESEARCH-COVERAGE-COMPLETE` declaration means research coverage complete only; it does **not** mean critical closure complete or release ready (PR #242).
- `RESEARCH_P0_072_BULK_RESET_EXTERNAL_EFFECT_FENCE_REVALIDATION_2026-09-12_EVIDENCE.md` — P0-072 bulk clear/replace versus admitted external side-effect receipts; deterministic model `project_tools/test_p0_072_bulk_reset_external_effect_fence_model.js` (PR #243).
- `RESEARCH_P0_076_SINGLE_ENTRY_GENERATION_CAS_REVALIDATION_2026-09-12_EVIDENCE.md` — P0-076 stale single-entry writes versus replacement Journal generation/CAS; deterministic model `project_tools/test_p0_076_single_entry_generation_cas_model.js` (PR #244).
- `RESEARCH_P0_074_YANDEX_OPERATION_CONTEXT_GENERATION_REVALIDATION_2026-09-13_EVIDENCE.md` — P0-074 immutable Yandex auth/account/root/config/publication operation context; deterministic model `project_tools/test_p0_074_yandex_operation_context_generation_model.js` (PR #245).
- `RESEARCH_P0_073_REMOTE_RECOVERY_NAMESPACE_BINDING_REVALIDATION_2026-09-13_EVIDENCE.md` — P0-073 restart recovery bound to the exact account/root namespace; deterministic model `project_tools/test_p0_073_remote_recovery_namespace_binding_model.js` (PR #246).
- `RESEARCH_P0_078_PUBLICATION_GENERATION_REVOCATION_REVALIDATION_2026-09-13_EVIDENCE.md` — P0-078 publication policy generation/revocation authority; deterministic model `project_tools/test_p0_078_publication_generation_revocation_model.js` (PR #247).
- `RESEARCH_P0_079_OPERATION_OWNED_PDF_CACHE_REVALIDATION_2026-09-13_EVIDENCE.md` — P0-079 operation-owned immutable PDF byte generation for Yandex upload/retry; deterministic model `project_tools/test_p0_079_operation_owned_pdf_cache_model.js` (PR #248).
- `RESEARCH_P0_080_SPA_APPLICATION_GENERATION_REVALIDATION_2026-09-16_EVIDENCE.md` — P0-080 same-document SPA/application generation and live-selection authority; deterministic model `project_tools/test_p0_080_spa_application_generation_revalidation_model.js`.
- `RESEARCH_P0_070_END_TO_END_SOURCE_GENERATION_REVALIDATION_2026-09-16_EVIDENCE.md` — P0-070 end-to-end exact source-document/application generation authority from save admission through print and downstream lineage; deterministic model `project_tools/test_p0_070_end_to_end_source_generation_revalidation_model.js`.
- `RESEARCH_P0_023_RETRY_SOURCE_DOCUMENT_GENERATION_REVALIDATION_2026-09-16_EVIDENCE.md` — P0-023 exact source-document generation binding for current-page cached-PDF retry/download after same-URL reload/replacement; deterministic model `project_tools/test_p0_023_retry_source_document_generation_revalidation_model.js`.
- `RESEARCH_P0_075_HOST_PAGE_CONTROL_PLANE_REVALIDATION_2026-09-16_EVIDENCE.md` — P0-075 host-page control-plane isolation for sensitive input, trusted user authorization and extension-held selection/print authority; deterministic model `project_tools/test_p0_075_host_page_control_plane_revalidation_model.js`.
- `RESEARCH_P0_045_INCOGNITO_ISOLATION_REVALIDATION_2026-09-16_EVIDENCE.md` — P0-045 Incognito fail-closed isolation across Action, contextual popup and optional frame-permission capability paths; deterministic model `project_tools/test_p0_045_incognito_isolation_revalidation_model.js`.

### Selection, scope and frame topology

- `RESEARCH_SELECTION_CAPTURE_FIDELITY_EVIDENCE.md` — P0-004 / P1-226 selection/capture fidelity summary; exact retired source is in `RESEARCH_RETIRED_DELTA_EVIDENCE.md`.
- `RESEARCH_INTERACTIVE_CAPTURE_FRAME_TOPOLOGY_EVIDENCE.md` — P1-227 live same-origin frame topology during manual selection.
- `RESEARCH_MANUAL_PICKER_HITTEST_GEOMETRY_2026-08-29_EVIDENCE.md` — P1-228 rendered candidate/geometry authority and P1-001 restore admission.
- `RESEARCH_SELECTION_INTENT_ADMISSION_CONVERGENCE_2026-08-30_EVIDENCE.md` — preview/commit/gesture/remote ordering convergence.
- `RESEARCH_SELECTION_RESTORE_SOUNDNESS_2026-08-30_EVIDENCE.md` — SelectionSnapshot restore truth and bounded locator work.
- `RESEARCH_SELECTION_SAVE_FREEZE_REENTRANCY_IPC_2026-08-30_EVIDENCE.md` — selection freeze, host reentrancy and pre-IPC locator admission.
- `RESEARCH_SELECTION_SNAPSHOT_PRIVACY_FINAL_2026-08-30_EVIDENCE.md` — durable SelectionSnapshot data-minimization/privacy revalidation.

### PDF representation, resource and render-cut fidelity

- `RESEARCH_FULL_RESTART_C16_SAME_ORIGIN_IFRAME_2026-09-02.md` — fresh exact-source C16 physical evidence for ordinary/nested same-origin selections and the P1-150 `200000px` stabilization-boundary finding.
- `RESEARCH_CAPTURE_ADMISSION_RESOURCE_FIDELITY_EVIDENCE_2026-08-29.md`
- `RESEARCH_COMPLEX_LAYOUT_FRAME_PROXY_FIDELITY_EVIDENCE_2026-08-29.md`
- `RESEARCH_CAPTURE_REPRESENTATION_DEPENDENCY_EVIDENCE.md`
- `RESEARCH_REMOTE_FRAME_PRINT_MEDIA_GEOMETRY_2026-08-30_EVIDENCE.md`
- `RESEARCH_SELECTED_ONLY_CASCADE_AUTHORITY_2026-08-30_EVIDENCE.md`
- `RESEARCH_POST_FREEZE_PHYSICAL_RENDER_CUT_FINAL_2026-08-30_EVIDENCE.md`
- `RESEARCH_PRINT_ROLLBACK_RETRY_CONVERGENCE_2026-08-30_EVIDENCE.md`
- `RESEARCH_PRINT_ROLLBACK_RETRY_HANDOFF_2026-08-30_EVIDENCE.md`
- `RESEARCH_LOCAL_PREPARE_BUDGET_TASK_LIFETIME_2026-08-30_EVIDENCE.md`
- `RESEARCH_SOURCE_URL_DATA_MINIMIZATION_2026-08-30_EVIDENCE.md`
- `RESEARCH_PDF_BYTE_TRANSFER_RECEIPT_2026-08-30_EVIDENCE.md`
- `RESEARCH_SAVED_COPY_READABILITY_2026-08-30_EVIDENCE.md`
- `RESEARCH_DEFERRED_VIRTUALIZED_MATERIALIZATION_2026-08-30_EVIDENCE.md`
- `RESEARCH_LONGPAGE_TOPLAYER_PAGINATION_2026-08-30_EVIDENCE.md`
- `RESEARCH_LONGPAGE_TOPLAYER_PAGINATION_FINAL_2026-08-30_EVIDENCE.md`
- `RESEARCH_REPLACED_RESOURCE_CONVERGENCE_FINAL_2026-08-30_EVIDENCE.md` — compact current representation of Blocks 1–56; original checkpoint blobs are recoverable from pre-compaction Git and verified in CI.
- `RESEARCH_CSS_VISUAL_DEPENDENCY_GRAPH_FINAL_2026-08-30_EVIDENCE.md` — compact current representation of Blocks 1–56; original checkpoint blobs are recoverable from pre-compaction Git and verified in CI.
- `RESEARCH_FLATTENED_DOCUMENT_NAMESPACE_FINAL_2026-08-30_EVIDENCE.md` — compact current representation of Blocks 1–56 with historical status wording reconciled to current Registry; original checkpoint blobs are recoverable from pre-compaction Git and verified in CI.
- `RESEARCH_COMPOSED_RENDERED_SCOPE_CONVERGENCE_FINAL_2026-08-30_EVIDENCE.md` — compact current representation of Blocks 1–56 with historical P-number wording separated from current Registry truth; original checkpoint blobs are recoverable from pre-compaction Git and verified in CI.

### Completed staged-evidence compactions

The cleanup set is complete. These four current FINAL documents replace their former interruption-safe BASE/STAGE checkpoint sets while preserving exact history:

1. `RESEARCH_REPLACED_RESOURCE_CONVERGENCE_FINAL_2026-08-30_EVIDENCE.md`;
2. `RESEARCH_CSS_VISUAL_DEPENDENCY_GRAPH_FINAL_2026-08-30_EVIDENCE.md`;
3. `RESEARCH_FLATTENED_DOCUMENT_NAMESPACE_FINAL_2026-08-30_EVIDENCE.md`;
4. `RESEARCH_COMPOSED_RENDERED_SCOPE_CONVERGENCE_FINAL_2026-08-30_EVIDENCE.md`.

`project_tools/test_staged_evidence_compaction.py` verifies every original source path/blob from its recorded pre-compaction commit and fails if a retired checkpoint path returns to the current tree.

### Frozen legacy staged-evidence baseline

These staged checkpoint files pre-date the steady-state hygiene contract. They are retained as historical evidence for now, are not active working series, and must not be extended. Future cleanup may only remove them through separately proven lossless compaction.

- Flattened CSS named environment: `RESEARCH_FLATTENED_CSS_NAMED_ENVIRONMENT_STAGE2_2026-08-30_EVIDENCE.md`, `RESEARCH_FLATTENED_CSS_NAMED_ENVIRONMENT_STAGE3_2026-08-30_EVIDENCE.md`.
- Focus/interaction state fidelity: `RESEARCH_FOCUS_INTERACTION_STATE_FIDELITY_STAGE2_2026-08-30_EVIDENCE.md`, `RESEARCH_FOCUS_INTERACTION_STATE_FIDELITY_STAGE3_2026-08-30_EVIDENCE.md`.
- Post-freeze physical render cut: `RESEARCH_POST_FREEZE_PHYSICAL_RENDER_CUT_STAGE2_2026-08-30_EVIDENCE.md`, `RESEARCH_POST_FREEZE_PHYSICAL_RENDER_CUT_STAGE3_2026-08-30_EVIDENCE.md`, `RESEARCH_POST_FREEZE_PHYSICAL_RENDER_CUT_STAGE4_2026-08-30_EVIDENCE.md`.
- Responsive image capture identity: `RESEARCH_RESPONSIVE_IMAGE_CAPTURE_IDENTITY_STAGE2_2026-08-30_EVIDENCE.md`, `RESEARCH_RESPONSIVE_IMAGE_CAPTURE_IDENTITY_STAGE3_2026-08-30_EVIDENCE.md`.
- Responsive replaced-media fidelity: `RESEARCH_RESPONSIVE_REPLACED_MEDIA_FIDELITY_STAGE2_2026-08-30_EVIDENCE.md`, `RESEARCH_RESPONSIVE_REPLACED_MEDIA_FIDELITY_STAGE3_2026-08-30_EVIDENCE.md`.
- Temporal render-state fidelity: `RESEARCH_TEMPORAL_RENDER_STATE_FIDELITY_STAGE2_2026-08-30_EVIDENCE.md`, `RESEARCH_TEMPORAL_RENDER_STATE_FIDELITY_STAGE3_2026-08-30_EVIDENCE.md`.
- Typography/layout fidelity: `RESEARCH_TYPOGRAPHY_LAYOUT_FIDELITY_STAGE2_2026-08-30_EVIDENCE.md`, `RESEARCH_TYPOGRAPHY_LAYOUT_FIDELITY_STAGE3_2026-08-30_EVIDENCE.md`.
- Viewport/environment fidelity: `RESEARCH_VIEWPORT_ENVIRONMENT_FIDELITY_STAGE2_2026-08-30_EVIDENCE.md`, `RESEARCH_VIEWPORT_ENVIRONMENT_FIDELITY_STAGE3_2026-08-30_EVIDENCE.md`.

## Historical and closure evidence

- `RESEARCH_HISTORY_INDEX.md` — corrections, retractions, dedup decisions and negative findings.
- `RESEARCH_EVIDENCE.md` — historical implementation/browser proof.
- `RESEARCH_RETIRED_DELTA_EVIDENCE.md` — retired delta corrections/positive controls plus the verbatim final selection/capture delta source.
- `TEST_EVIDENCE.md` — historical test/browser checkpoints.
- `RESEARCH_P0_*_CLOSURE_*_EVIDENCE.md` — direct closure records for terminal P0 items retained by the registry.

## Reading rule

1. Read `RESEARCH_REGISTRY.md` first for current status and ownership.
2. Use the relevant family and supplemental evidence for detailed proof and acceptance boundaries.
3. Use `RESEARCH_HISTORY_INDEX.md`, `RESEARCH_EVIDENCE.md`, `RESEARCH_RETIRED_DELTA_EVIDENCE.md`, `TEST_EVIDENCE.md` and Git history for historical context.
4. Never infer that a P-number is free from absence in one family or supplemental document; permanent numbering rules in `RESEARCH_REGISTRY.md` control allocation.