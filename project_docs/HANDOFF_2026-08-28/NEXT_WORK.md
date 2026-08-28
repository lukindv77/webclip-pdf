# NEXT WORK — recommended first audit blocks in new chat

Do not treat this list as mandatory if newer `main` commits already cover a block. Duplicate-check and replace covered items.

1. **Fresh-head delta scan**: inspect every commit after handoff baseline `53c8b186...` (the handoff commit itself plus any later work) before taking new ownership.
2. **SPA P0-080 completion**: same-document route changes vs Action state, PDF retry cache, review modal, template Apply and source-context semantics. Separate `documentId` from application generation.
3. **Source-page operation gate**: audit every selection-mutating entry point beyond direct Start and Journal Apply (reset, auto-content, restore/template compatibility, retry paths) against active upload generation.
4. **Old terminal UI generation**: confirm all progress/terminal handlers are scoped to owning source-page operation so late U cannot overwrite later S even if queueing is introduced.
5. **Yandex folder/root mutation saga**: after picker receipt, verify multi-request service-folder operations consume one account/root/auth context end-to-end; unknown create/retry stays in captured namespace.
6. **Yandex auth replacement vs in-flight mutation**: manual token / PKCE / Disconnect while folder-tree or other multi-request operation is mid-flight; no remaining segment may switch account silently.
7. **Local download bind-pending receipt**: exact numeric `downloadId` is known but primary intent->numeric IDB bind fails; design durable fallback that never drops to heuristic authority after restart.
8. **Backup lease P1-076 + P1-158**: audit all prerequisites that can outlive lease and all stale-owner publication points; use the correction delta, do not blame bounded folder traversal.
9. **Destructive Journal receipts**: clear/import/entry mutation after page loss, revision advance, stale 9-digit confirmation and retry; discovery of committed generation must precede new destructive action.
10. **Cross-frame permission/document generation**: revoke/regrant, stale REGISTER and partial prepare/restore rollback; child command consumes exact document+permission generation.
11. **Yandex remote object identity**: any remaining path/size-only verification in upload/recovery/delete/move/restore should be checked against P1-184/P0-022 before creating new number.
12. **Portable/runtime state boundary**: find additional internal fields automatically serialized or imported despite being per-install/per-operation state.

Session protocol requested by user:
- begin from at least 10 large blocks;
- give short completion/risk estimate first;
- finish taken blocks in same session where possible;
- commit each classified delta to GitHub;
- no duplicate P-items;
- no release/test claims without actual execution.
