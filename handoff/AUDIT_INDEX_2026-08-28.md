# Audit/handoff index — 2026-08-28

## Mandatory new-chat read order
1. Fresh-fetch actual `main` HEAD and compare with handoff source.
2. `GITHUB_REPOSITORY_STATE.md`
3. `handoff/LATEST.md`
4. `handoff/CURRENT_STATE_2026-08-28.md`
5. `handoff/CURRENT_STATE_2026-08-28.json`
6. `PROMPT_FOR_NEW_CHAT.md`
7. `handoff/NEW_CHAT_PROMPT_2026-08-28.md`
8. `manifest.json`
9. `project_docs/PRIORITIES_P0_P1_P2.md`
10. `DEEP_AUDIT_2026-08-25.md`
11. **all** `project_docs/AUDIT_DELTA_*.md`
12. Architecture/data-model/test docs as needed.

## Deltas dated 2026-08-28 that must not be skipped
- `project_docs/AUDIT_DELTA_EXTENSION_PAGE_VERSION_REFRESH_COMMIT_POINT_2026-08-28.md`
- `project_docs/AUDIT_DELTA_JOURNAL_GROUP_BOUNDARY_REVISION_2026-08-28.md`
- `project_docs/AUDIT_DELTA_MULTI_BLOCK_REVALIDATION_2026-08-28.md`
- `project_docs/AUDIT_DELTA_MULTI_BLOCK_REVALIDATION_PART2_2026-08-28.md`
- `project_docs/AUDIT_DELTA_OPTIONS_READ_SINGLEFLIGHT_FRESHNESS_2026-08-28.md`
- `project_docs/AUDIT_DELTA_REMOTE_RECOVERY_PHASE_FAIRNESS_2026-08-28.md`
- `project_docs/AUDIT_DELTA_REMOTE_STALE_CLEANUP_REACTIVATION_2026-08-28.md`
- `project_docs/AUDIT_DELTA_SIGNED_URL_OPERATION_LOG_REDACTION_REGRESSION_2026-08-28.md`
- `project_docs/AUDIT_DELTA_TAB_CREATE_MV3_RECEIPT_2026-08-28.md`
- `project_docs/AUDIT_DELTA_USER_OPERATION_TRANSPORT_LOSS_RECONCILIATION_2026-08-28.md`

They include P1-208/P1-209/P1-210 and reopens/refinements of older owners. Do not infer number availability from filenames or canonical table alone.

## Latest three source-audit commits
- `47b5f615ff170f399d3dd53004ea54af680e50f3` — P1-167 + P1-035/P1-043 refinements and revalidation.
- `78d199c37b270c944a73ffb69517a9bbe62ab697` — P1-124 `tabs.create` MV3 crash-receipt refinement.
- `bcdf3e5235b0c1bd3df3b36ac3d46c88a40762a6` — new P1-210 outer transport-loss durable-state reconciliation.

## Numbering
Never assume a P-number is free from canonical docs. Search canonical + all deltas + closure/history + current source semantics. Stable numbers are never reused.
