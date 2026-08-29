# Audit consolidation index

Baseline `main` used for this consolidation: `3602a8dff0cf016443d6a7226220abb1711b070f`.

This document is an organizational registry checkpoint. It does not change runtime, tests, manifest, build or release state, and it does not replace detailed audit evidence.

## Authority model

GitHub `main` remains the only source of truth.

Until the large historical registry is safely rewritten losslessly, the P-number registry is intentionally partitioned by a non-overlapping boundary:

1. `project_docs/PRIORITIES_P0_P1_P2.md` is the canonical registry for the historical range already present there, ending at **P1-194**.
2. This file is the canonical late-number supplement for **P1-195 through P1-225**.
3. `project_docs/AUDIT_DELTA_*.md` remain the detailed source for root cause, source proof, invariants and regression requirements. They are not obsolete merely because a number is indexed here.
4. `P*_CLOSURE.md`, `STATIC_CHECKS_*.md`, `DEEP_AUDIT_2026-08-25.md` and `QA_STATUS_0_9_9.md` remain historical evidence until their unique information is migrated and verified.
5. Current runtime/source files override any stale descriptive statement in documentation.

This partition avoids maintaining two competing descriptions of the same P-number while also avoiding a risky whole-file rewrite of the large legacy priority registry.

## Numbering rule

**P1-195 through P1-225 are occupied and must not be reused.**

This consolidation allocates no new P-number. A later apparent next integer must still pass repository-wide semantic duplicate/history checks before assignment; do not infer availability from numeric sequence alone.

Registry state used below:

- `OPEN / late-canonical` — confirmed late audit owner indexed here; detailed acceptance contract remains in the referenced evidence.
- `OPEN / history-reconstructed` — confirmed owner recovered from Git history because the intended canonical synchronization did not land in the current large registry.

## Late P1 registry — P1-195…P1-225

| Code | State | Stable owner / root cause | Primary evidence |
|---|---|---|---|
| P1-195 | OPEN / history-reconstructed | Yandex OAuth/token capability truth: token presence/read success must not be presented as proof that all required Disk read/write/info capabilities are granted; requested, granted, reduced and unknown scope must remain distinct. | Git history `b2d9ec47833f00fc4b0b42923d1671ae20286f31` (`Guarded P1-195 audit sync`) contains the lossless intended registry text. |
| P1-196 | OPEN / late-canonical | Yandex invalid-current-token demotion / token-validity state must be exact-auth-generation fenced: a stale 401/expiry from auth A must not clear or demote newer auth B; recovery/scheduler must react to loss of usable current auth without retargeting stale work. | `AUDIT_DELTA_YANDEX_MUTATION_RECOVERY_2026-08-27.md`; `AUDIT_DELTA_YANDEX_AUTH_CONFIG_WRITES_2026-08-27.md`; `AUDIT_DELTA_YANDEX_ACCOUNT_CACHE_GENERATION_2026-08-27.md`. |
| P1-197 | OPEN / late-canonical | OperationLog administrative clear/delete needs a durable history generation; late queued writers must not repopulate a generation the user cleared. | `AUDIT_DELTA_OPERATION_LOG_CLEAR_GENERATION_2026-08-27.md`. |
| P1-198 | OPEN / late-canonical | Live physical operation identity must be worker-issued; caller-selected textual `operationId` is correlation metadata, not durable/physical ownership authority. | `AUDIT_DELTA_LIVE_OPERATION_ID_PROVENANCE_2026-08-27.md`; refinements in `AUDIT_DELTA_OPERATION_RECEIPT_TERMINAL_AUTHORITY_2026-08-27.md`. |
| P1-199 | OPEN / late-canonical | Cross-origin iframe print prepare/restore is not print-operation-generation fenced; stale restore can undo a newer prepare. | `AUDIT_DELTA_CROSS_ORIGIN_PRINT_GENERATION_2026-08-27.md`. |
| P1-200 | OPEN / late-canonical | Remote-frame selection/control commands lack exact selection-session generation/ordering; stale commands/responses can mutate a newer child session. | `AUDIT_DELTA_REMOTE_FRAME_CONTROL_GENERATION_2026-08-27.md`. |
| P1-201 | OPEN / late-canonical | Revoking optional host permission can strand a live injected frame-agent; revoke/regrant requires exact permission/session lifecycle cleanup and must not revive old authority. | `AUDIT_DELTA_FRAME_PERMISSION_REVOCATION_LIFECYCLE_2026-08-27.md`. |
| P1-202 | OPEN / late-canonical | Journal comment deletion semantics retain and redisclose full text without an explicit retention/privacy contract. | `AUDIT_DELTA_COMMENT_DELETION_RETENTION_SEMANTICS_2026-08-27.md`. |
| P1-203 | OPEN / late-canonical | An injected cross-origin frame-agent can outlive the MV3 worker generation that owned its in-memory registry/control session; restart requires explicit re-registration/reconcile-or-cleanup. | `AUDIT_DELTA_FRAME_AGENT_WORKER_RESTART_LIFECYCLE_2026-08-27.md`. |
| P1-204 | OPEN / late-canonical | Browser-owned context-menu remove/create rebuild is fenced only within one service-worker generation; late old browser mutation can overtake a newer repaired menu after worker restart. | `AUDIT_DELTA_CONTEXT_MENU_WORKER_GENERATION_2026-08-27.md`. |
| P1-205 | OPEN / late-canonical | OperationLog retention cleanup can be overtaken by an already queued write and resurrect an expired operation; cleanup/write ordering needs one history-generation linearization contract. | `AUDIT_DELTA_OPERATION_LOG_RETENTION_WRITE_LINEARIZATION_2026-08-27.md`. |
| P1-206 | OPEN / late-canonical | One Journal render/composed view can mix metadata from revision A with entries from revision B and then baseline the mixed result as coherent. | `AUDIT_DELTA_JOURNAL_VIEW_REVISION_COHERENCE_2026-08-27.md`; grouped-pagination refinements remain under the same owner. |
| P1-207 | OPEN / late-canonical | Backup can upload Journal revision A, finish after revision B exists, and mark scheduler success/freshness as though B were backed up; success must carry exact source revision. | `AUDIT_DELTA_BACKUP_SOURCE_REVISION_SUCCESS_2026-08-27.md` plus later recovery-chain refinements. |
| P1-208 | OPEN / late-canonical | Bounded pending-remote recovery can starve `remote-verified` local finalization behind older auth-blocked PREPARED rows; recovery scheduling must be phase-fair. | `AUDIT_DELTA_REMOTE_RECOVERY_PHASE_FAIRNESS_2026-08-28.md`. |
| P1-209 | OPEN / late-canonical | Extension-page version refresh publishes success/version marker before actual page reload success; commit point and retry/recovery truth are inverted. | `AUDIT_DELTA_EXTENSION_PAGE_VERSION_REFRESH_COMMIT_POINT_2026-08-28.md`. |
| P1-210 | OPEN / late-canonical | Lost/rejected outer user-operation transport response does not prove terminal failure; UI needs an exact worker-issued durable receipt, explicit unknown state and read-only reconciliation instead of blind fresh retry. | `AUDIT_DELTA_USER_OPERATION_TRANSPORT_LOSS_RECONCILIATION_2026-08-28.md`. |
| P1-211 | OPEN / late-canonical | Deleted Journal comments retain full tombstone payload and consume active comment capacity; deletion/tombstone lifecycle, search/export/import and portable capacity debt require one explicit contract. | `AUDIT_DELTA_JOURNAL_COMMENT_TOMBSTONE_LIFECYCLE_2026-08-28.md`; `AUDIT_DELTA_DELETED_COMMENT_TOMBSTONE_PORTABLE_CAPACITY_2026-08-28.md`. |
| P1-212 | OPEN / late-canonical | Print preparation must not synthesize activation of page-owned controls merely to reveal content; save/print authority is not permission to execute host behavior. | `AUDIT_DELTA_PRINT_PREPARATION_PAGE_CONTROL_ACTIVATION_2026-08-28.md`. |
| P1-213 | OPEN / late-canonical | Flattened same-origin iframe print proxy must be inert; cloned print representation must not create live browsing/network/custom-element behavior. | `AUDIT_DELTA_FLATTENED_FRAME_PROXY_ACTIVE_CONTENT_2026-08-28.md`. |
| P1-214 | OPEN / late-canonical | Multi-frame remote print prepare/restore needs exact partial-success rollback receipts; every child already mutated must remain compensatable across later failure/timeout/retry. | `AUDIT_DELTA_REMOTE_FRAME_PRINT_PARTIAL_PREPARE_ROLLBACK_2026-08-28.md`; `AUDIT_DELTA_REMOTE_FRAME_RESTORE_RECEIPT_SETTLEMENT_2026-08-28.md`. |
| P1-215 | OPEN / late-canonical | Previewed Journal import staging presented in an active destructive confirmation needs an owner/lease and must not be reclaimed solely by generic payload age. | `AUDIT_DELTA_JOURNAL_IMPORT_CONFIRMATION_STAGING_LEASE_2026-08-28.md`. |
| P1-216 | OPEN / late-canonical | Supported legacy Journal rows and modern rows must share one derived URL identity domain for view, scoped clear/delete/stats/template behavior; missing persisted `urlKey` must not create false negatives. | `AUDIT_DELTA_LEGACY_URLKEY_SCOPED_CLEAR_PARITY_2026-08-28.md` plus legacy URL-key parity refinements. |
| P1-217 | OPEN / late-canonical | Chrome Action needs explicit unknown/degraded truth: failure to read current URL summary must not leave previous URL's icon/badge/title attached to the tab. | `AUDIT_DELTA_ACTION_DEGRADED_READ_STALE_URL_STATE_2026-08-28.md`. |
| P1-218 | OPEN / late-canonical | Temporary resource-prefetch attribute rollback is an unfenced stale writer; restore only if current DOM still contains the exact temporary value owned by the same preparation generation. | `AUDIT_DELTA_RESOURCE_PREFETCH_ROLLBACK_STALE_HOST_MUTATION_2026-08-29.md`; remote-frame parity: `AUDIT_DELTA_RESOURCE_PREFETCH_ROLLBACK_REMOTE_FRAME_PARITY_2026-08-29.md`. |
| P1-219 | OPEN / late-canonical | Temporary image-link wrapper rollback can reparent a page-owned image after the host superseded WebClip's topology mutation. | `AUDIT_DELTA_PRINT_IMAGE_WRAPPER_STRUCTURAL_ROLLBACK_2026-08-29.md`. |
| P1-220 | OPEN / late-canonical | Print-header cleanup re-resolves a textual DOM id and can delete a newer host-owned replacement; cleanup must remove the exact generated node/receipt. | `AUDIT_DELTA_PRINT_HEADER_TEXTUAL_ID_CLEANUP_2026-08-29.md`. |
| P1-221 | OPEN / late-canonical | Link-normalization rollback trusts host-mutable rollback metadata and can overwrite a newer page-owned `href`; rollback authority must be private and compare-before-restore. | `AUDIT_DELTA_LINK_NORMALIZATION_ROLLBACK_AUTHORITY_2026-08-29.md`. |
| P1-222 | OPEN / late-canonical | Options async status/mutation completion is not latest-user-edit-wins and can overwrite/clear newer unsaved draft fields. | `AUDIT_DELTA_OPTIONS_STATUS_REFRESH_FORM_EDIT_GENERATION_2026-08-29.md`; `AUDIT_DELTA_OPTIONS_MUTATION_COMPLETION_DRAFT_GENERATION_2026-08-29.md`. |
| P1-223 | OPEN / late-canonical | Late Create Folder completion can start a stale folder reload that supersedes a newer user browse intent; remote mutation target and UI refresh authority must be separate generations. | `AUDIT_DELTA_OPTIONS_CREATE_FOLDER_STALE_BROWSE_COMPLETION_2026-08-29.md`. |
| P1-224 | OPEN / late-canonical | Same-origin iframe/ancestor print-layout rollback restores whole old inline style/markers without proving the live state is still WebClip-owned, overwriting newer host style changes. | `AUDIT_DELTA_FRAME_LAYOUT_STYLE_ROLLBACK_STALE_HOST_MUTATION_2026-08-29.md`. |
| P1-225 | OPEN / late-canonical | Journal comment textarea remains editable after save admission; late success tears down editor and can silently discard newer unsent draft text. | `AUDIT_DELTA_JOURNAL_COMMENT_PENDING_SAVE_DRAFT_2026-08-29.md`. |

## Evidence retention / migration ledger

The following source classes are **retained** at this consolidation stage. No file in these classes is safe to bulk-delete merely because its P-number appears above.

| Source class | Current role | Retirement gate |
|---|---|---|
| `project_docs/AUDIT_DELTA_*.md` | Detailed source proof, deterministic schedules, invariants, regressions and duplicate-check reasoning; many refinements compose several owners. | Retire an individual delta only after every unique requirement/evidence/refinement it contains is represented in canonical registry/evidence documents and cross-references are updated. |
| root `P*_CLOSURE.md` | Historical closure/reopen evidence, implementation commit/test/browser proof. | First migrate unique proof into a consolidated `AUDIT_EVIDENCE.md`; verify source commit/test references; then retire individually. |
| root `STATIC_CHECKS_*.md` | Historical test/browser gate evidence for specific implementations. | First migrate into `TEST_EVIDENCE.md` with commit/runtime identity and distinguish historical gate from current gate. |
| `DEEP_AUDIT_2026-08-25.md` | Historical root-cause/number-assignment source through the older audit stream. | Retain until all unique P assignments, rejected hypotheses and evidence needed for duplicate checks are represented elsewhere and verified. |
| `QA_STATUS_0_9_9.md` | Accumulated historical QA narrative plus current release blockers. | Split into a compact current `TEST_STATUS.md` and historical `TEST_EVIDENCE.md`; then retire the accumulated narrative if no unique evidence remains. |
| `PROJECT_RECOVERY.md` | Historical recovery/build narrative and old checkpoint accumulation. | Retain until recovery/build policy is explicitly redesigned and all still-live requirements are moved to the current policy documents. |
| `project_docs/HANDOFF_2026-08-29/` | Current context checkpoint only; subordinate to fresh `main`. | Replace only when a newer handoff is intentionally created; do not accumulate old handoffs in the working tree. |

## Safe file-retirement checklist

A historical audit/evidence file may be removed from the current tree only when all conditions are true:

1. every P-number in the file is already reserved in a canonical registry;
2. every unique root cause or refinement is represented in the canonical owner contract;
3. every unique acceptance/regression requirement remains available;
4. implementation/source commit, browser evidence and test evidence remain traceable where they matter;
5. the file is not the sole proof of a reopen, rejection, numbering correction or positive control;
6. current `GITHUB_REPOSITORY_STATE.md`, handoff and live documentation no longer depend on that file as a required restoration source;
7. a final compare confirms the cleanup is docs/history-only and does not modify runtime/tests/configuration accidentally.

Git history is the archive after these conditions are satisfied. Deleting a file from current `main` does not erase its earlier commits.

## Next consolidation sequence

The safe next order is:

1. Build `project_docs/AUDIT_EVIDENCE.md` from `P*_CLOSURE.md` and closure/reopen evidence, preserving only unique proof and exact commit/test identities.
2. Build `project_docs/TEST_EVIDENCE.md` and a compact current `project_docs/TEST_STATUS.md` from `STATIC_CHECKS_*.md` + `QA_STATUS_0_9_9.md`; never promote historical 88/88 + 74/74 to a current rerun.
3. Reconcile historical `DEEP_AUDIT_2026-08-25.md` against `PRIORITIES_P0_P1_P2.md` and this late registry, recording rejected hypotheses/number corrections that are still needed for duplicate checks.
4. Only after steps 1–3, retire redundant closure/static/deep-audit files individually with compare verification.
5. Consolidate detailed `AUDIT_DELTA_*` last. Deltas are the most recent source proof and must not be bulk-deleted before their unique acceptance contracts are migrated.
6. When a full lossless replacement can be produced safely, merge the non-overlapping `PRIORITIES` <= P1-194 and this P1-195…P1-225 supplement into one compact canonical registry. Until then the boundary in this document is deliberate and authoritative.

## Branch note

Repository branch cleanup is separate from audit-document cleanup. `cleanup-stage1-safety` is a temporary safety branch that currently points at the same cleanup state as `main`; `work/p0-063-offscreen-budget` historically diverged and contains a unique commit, so it must not be deleted without first reconciling that commit against current `main`.
