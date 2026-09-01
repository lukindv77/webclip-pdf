# Audit family navigation index

This file is **navigation only**. Current P-code status and single-owner authority come exclusively from `AUDIT_REGISTRY.md`. Detailed source proof remains in durable evidence files and Git history.

## Consolidation state

The standalone `AUDIT_DELTA_*.md` working layer is fully retired in the current tree. The former 189-delta layer was embedded losslessly into family/cross-cutting evidence; the final temporary selection/capture delta is preserved verbatim in `AUDIT_RETIRED_DELTA_EVIDENCE.md` with exact Git provenance and a byte-for-byte CI self-test.

No standalone audit delta is a current status authority. If a future temporary delta is created during active analysis, it must be indexed here until it is folded losslessly into durable evidence under `AUDIT_CHANGE_WORKFLOW.md`.

## Primary evidence families

| # | Family | Consolidated evidence | Primary owners / scope | Retired deltas |
|---:|---|---|---|---:|
| 1 | Backup / scheduler / remote recovery generation | `AUDIT_FAMILY_BACKUP_RECOVERY_GENERATION_EVIDENCE.md` | P1-076, P1-077, P1-117, P1-177, P1-184, P1-194, P1-207, P1-208, P1-210, P0-074 | 25 |
| 2 | Yandex auth / config / immutable operation context / Settings UI | `AUDIT_FAMILY_YANDEX_AUTH_CONFIG_EVIDENCE.md` | P0-074, P0-078, P1-157, P1-158, P1-165, P1-175, P1-178, P1-184, P1-195, P1-196, P1-210, P1-222, P1-223 | 24 |
| 3 | Yandex remote identity / move / publication / destructive lifecycle | `AUDIT_FAMILY_YANDEX_REMOTE_IDENTITY_EVIDENCE.md` | P0-022, P0-040, P0-069, P0-072, P0-073, P0-074, P0-078, P1-090, P1-164, P1-175, P1-184, P1-210 | 21 |
| 4 | Backup restore/import from Yandex | `AUDIT_FAMILY_BACKUP_RESTORE_EVIDENCE.md` | P0-013, P0-022, P0-073, P0-074, P1-035, P1-069, P1-184, P1-210, P1-215 | 4 |
| 5 | Journal import / provenance / portable schema / legacy identity | `AUDIT_FAMILY_JOURNAL_IMPORT_PROVENANCE_EVIDENCE.md` | P0-013, P0-022, P0-073, P0-076, P0-077, P1-030, P1-035, P1-042, P1-069, P1-206, P1-211, P1-215, P1-216 | 15 |
| 6 | Journal read/view revision / pagination / open/apply / bulk authority | `AUDIT_FAMILY_JOURNAL_VIEW_AUTHORITY_EVIDENCE.md` | P0-076, P0-080, P1-001, P1-009, P1-175, P1-206, P1-210 | 18 |
| 7 | Journal comments / tombstones / edit generations | `AUDIT_FAMILY_JOURNAL_COMMENTS_EVIDENCE.md` | P0-076, P1-202, P1-211, P1-225 | previously consolidated |
| 8 | Operation receipt / OperationLog / user reconciliation | `AUDIT_FAMILY_OPERATION_RECEIPTS_EVIDENCE.md` | P1-145, P1-197, P1-198, P1-205, P1-210 and durability/maintenance owners | 15 |
| 9 | Local download / native Save As / file settlement | `AUDIT_FAMILY_LOCAL_DOWNLOAD_SAVEAS_EVIDENCE.md` | P0-039, P1-079, P1-080, P1-087, P1-129, P1-146, P1-156, P1-169, P1-210 | 12 |
| 10 | Chrome/MV3 APIs / browser-owned state / extension-page transport | `AUDIT_FAMILY_CHROME_MV3_SETTLEMENT_EVIDENCE.md` | P1-123…P1-131, P1-157, P1-158, P1-166, P1-170, P1-173, P1-203, P1-204, P1-209, P1-210, P1-217 | 17 |
| 11 | Frame permission / cross-origin frame identity and command generation | `AUDIT_FAMILY_FRAME_PERMISSION_IDENTITY_EVIDENCE.md` | P1-004, P1-157, P1-171, P1-193, P1-199…P1-203, P1-214, P1-229 | 12 |
| 12 | PDF/print / offscreen lifetime / rollback / source generation | `AUDIT_FAMILY_PDF_PRINT_OFFSCREEN_EVIDENCE.md` | P0-003, P0-004, P0-023, P0-063, P0-065, P0-067, P0-068, P0-070, P0-071, P0-075, P0-080, P1-003, P1-069, P1-149…P1-153, P1-160, P1-167, P1-187, P1-199, P1-212…P1-214, P1-218…P1-224, P1-226…P1-229 | 26 |
| 13 | Incognito / trust boundaries / signed-link redaction | `AUDIT_FAMILY_PRIVACY_TRUST_EVIDENCE.md` | P0-033, P0-045 | previously consolidated |
| 14 | Derived URL stats / view indexes | `AUDIT_FAMILY_URLSTATS_EVIDENCE.md` | P0-050 | previously consolidated |
| 15 | Broad revalidation / cross-cutting inventories | `AUDIT_CROSSCUTTING_REVALIDATION_EVIDENCE.md` | cross-cutting historical controls | previously consolidated |

## Supplemental durable evidence

The following current documents preserve audit tranches that are useful outside a single family. Their detailed narratives are intentionally not duplicated in this navigation index.

### Selection, scope and frame topology

- `AUDIT_SELECTION_CAPTURE_FIDELITY_EVIDENCE.md` — P0-004 / P1-226 selection/capture fidelity summary; exact retired source is in `AUDIT_RETIRED_DELTA_EVIDENCE.md`.
- `AUDIT_INTERACTIVE_CAPTURE_FRAME_TOPOLOGY_EVIDENCE.md` — P1-227 live same-origin frame topology during manual selection.
- `AUDIT_MANUAL_PICKER_HITTEST_GEOMETRY_2026-08-29_EVIDENCE.md` — P1-228 rendered candidate/geometry authority and P1-001 restore admission.
- `AUDIT_SELECTION_INTENT_ADMISSION_CONVERGENCE_2026-08-30_EVIDENCE.md` — preview/commit/gesture/remote ordering convergence.
- `AUDIT_SELECTION_RESTORE_SOUNDNESS_2026-08-30_EVIDENCE.md` — SelectionSnapshot restore truth and bounded locator work.
- `AUDIT_SELECTION_SAVE_FREEZE_REENTRANCY_IPC_2026-08-30_EVIDENCE.md` — selection freeze, host reentrancy and pre-IPC locator admission.
- `AUDIT_SELECTION_SNAPSHOT_PRIVACY_FINAL_2026-08-30_EVIDENCE.md` — durable SelectionSnapshot data-minimization/privacy revalidation.

### PDF representation, resource and render-cut fidelity

- `AUDIT_CAPTURE_ADMISSION_RESOURCE_FIDELITY_EVIDENCE_2026-08-29.md`
- `AUDIT_COMPLEX_LAYOUT_FRAME_PROXY_FIDELITY_EVIDENCE_2026-08-29.md`
- `AUDIT_CAPTURE_REPRESENTATION_DEPENDENCY_EVIDENCE.md`
- `AUDIT_REMOTE_FRAME_PRINT_MEDIA_GEOMETRY_2026-08-30_EVIDENCE.md`
- `AUDIT_SELECTED_ONLY_CASCADE_AUTHORITY_2026-08-30_EVIDENCE.md`
- `AUDIT_POST_FREEZE_PHYSICAL_RENDER_CUT_FINAL_2026-08-30_EVIDENCE.md`
- `AUDIT_PRINT_ROLLBACK_RETRY_CONVERGENCE_2026-08-30_EVIDENCE.md`
- `AUDIT_PRINT_ROLLBACK_RETRY_HANDOFF_2026-08-30_EVIDENCE.md`
- `AUDIT_LOCAL_PREPARE_BUDGET_TASK_LIFETIME_2026-08-30_EVIDENCE.md`
- `AUDIT_SOURCE_URL_DATA_MINIMIZATION_2026-08-30_EVIDENCE.md`
- `AUDIT_PDF_BYTE_TRANSFER_RECEIPT_2026-08-30_EVIDENCE.md`
- `AUDIT_SAVED_COPY_READABILITY_2026-08-30_EVIDENCE.md`
- `AUDIT_DEFERRED_VIRTUALIZED_MATERIALIZATION_2026-08-30_EVIDENCE.md`
- `AUDIT_LONGPAGE_TOPLAYER_PAGINATION_2026-08-30_EVIDENCE.md`
- `AUDIT_LONGPAGE_TOPLAYER_PAGINATION_FINAL_2026-08-30_EVIDENCE.md`

### Interruption-safe staged evidence series retained in the working tree

These series still contain staged source evidence and are candidates for a later, separately proven lossless compaction. Their presence here is navigation, not status authority.

- `AUDIT_COMPOSED_RENDERED_SCOPE_CONVERGENCE_2026-08-30_EVIDENCE.md`, `AUDIT_COMPOSED_RENDERED_SCOPE_CONVERGENCE_STAGE2_2026-08-30_EVIDENCE.md`, `AUDIT_COMPOSED_RENDERED_SCOPE_CONVERGENCE_STAGE3_2026-08-30_EVIDENCE.md`, `AUDIT_COMPOSED_RENDERED_SCOPE_CONVERGENCE_FINAL_2026-08-30_EVIDENCE.md`
- `AUDIT_REPLACED_RESOURCE_CONVERGENCE_2026-08-30_EVIDENCE.md`, `AUDIT_REPLACED_RESOURCE_CONVERGENCE_STAGE2_2026-08-30_EVIDENCE.md`, `AUDIT_REPLACED_RESOURCE_CONVERGENCE_FINAL_2026-08-30_EVIDENCE.md`
- `AUDIT_CSS_VISUAL_DEPENDENCY_GRAPH_2026-08-30_EVIDENCE.md`, `AUDIT_CSS_VISUAL_DEPENDENCY_GRAPH_STAGE2_2026-08-30_EVIDENCE.md`, `AUDIT_CSS_VISUAL_DEPENDENCY_GRAPH_STAGE3_2026-08-30_EVIDENCE.md`, `AUDIT_CSS_VISUAL_DEPENDENCY_GRAPH_FINAL_2026-08-30_EVIDENCE.md`
- `AUDIT_FLATTENED_DOCUMENT_NAMESPACE_2026-08-30_EVIDENCE.md`, `AUDIT_FLATTENED_DOCUMENT_NAMESPACE_STAGE2_2026-08-30_EVIDENCE.md`, `AUDIT_FLATTENED_DOCUMENT_NAMESPACE_STAGE3_2026-08-30_EVIDENCE.md`, `AUDIT_FLATTENED_DOCUMENT_NAMESPACE_FINAL_2026-08-30_EVIDENCE.md`

## Historical and closure evidence

- `AUDIT_HISTORY_INDEX.md` — corrections, retractions, dedup decisions and negative findings.
- `AUDIT_EVIDENCE.md` — historical implementation/browser proof.
- `AUDIT_RETIRED_DELTA_EVIDENCE.md` — retired delta corrections/positive controls plus the verbatim final selection/capture delta source.
- `TEST_EVIDENCE.md` — historical test/browser checkpoints.
- `AUDIT_P0_*_CLOSURE_*_EVIDENCE.md` — direct closure records for terminal P0 items retained by the registry.

## Reading rule

1. Read `AUDIT_REGISTRY.md` first for current status and ownership.
2. Use the relevant family and supplemental evidence for detailed proof and acceptance boundaries.
3. Use `AUDIT_HISTORY_INDEX.md`, `AUDIT_EVIDENCE.md`, `AUDIT_RETIRED_DELTA_EVIDENCE.md`, `TEST_EVIDENCE.md` and Git history for historical context.
4. Never infer that a P-number is free from absence in one family or supplemental document; permanent numbering rules in `AUDIT_REGISTRY.md` control allocation.
