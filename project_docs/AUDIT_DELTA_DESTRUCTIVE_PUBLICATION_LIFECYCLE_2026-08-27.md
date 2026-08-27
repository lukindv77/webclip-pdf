# Audit delta — destructive publication lifecycle — 2026-08-27

Baseline HEAD before this audit block: `ca3fac175dfd8f88de510d16b8373b52635ddb5c`.

This is a lossless audit checkpoint only. It does not claim canonical registry synchronization and does not modify production runtime or `manifest.json`.

## Scope

Fresh audit of published Yandex objects and single-entry Journal deletion, focused on existing `P0-069`, `P1-164`, `P1-183`, `P1-090`, plus compatibility with `P0-022` and `P0-074`.

## Confirmed runtime facts

1. `journal.html` offers only two Yandex delete choices:
   - keep the file on Yandex Disk and delete only the local Journal entry;
   - move the file into WebClip `Trash/MM-YYYY` and delete the local Journal entry.
   The dialog does not distinguish a published entry and does not warn that a public link can remain usable after the local management reference disappears.

2. `deleteJournalEntry()` likewise has only `diskAction = keep | trash`. It records `hasPublicUrl` in OperationLog metadata but performs no publication decision/revocation flow. For `trash`, it calls `moveJournalYandexFileToTrash()` and then unconditionally deletes the local Journal record after that helper reports success. For `keep`, it immediately proceeds to local deletion.

3. Current `service-worker.js` contains no `/resources/unpublish` call at all. Therefore P0-069/P1-164 are not partially hidden behind another helper: unpublish lifecycle is genuinely absent.

4. `moveJournalYandexFileToTrash()` has no durable delete-move target checkpoint before the destructive `POST /resources/move`. The target path is computed in memory. This reconfirms `P1-183`: MV3 termination after the remote move but before local finalization can leave a stale Journal entry with no exact durable chosen target, especially when the collision path uses a generated `__deleted_<timestamp>` suffix.

5. Post-move verification polls `GET /resources` for `targetPath` and accepts success when the returned target is merely `type === file`. It does not compare the target `resource_id` with the immutable source object identity. This reconfirms `P1-090`: a target-path collision/replacement can be adopted as the result of the move.

6. A local 15-second timeout from `POST /resources/move` exits before the target verification loop. Since timeout is not cancellation, the move can have settled remotely while this attempt does not reconcile it. This remains part of P1-090/P1-183 rather than a new item.

## P0-069 acceptance refinement

Published-object deletion needs a privacy outcome before the local entry can disappear.

For any entry with a currently known/confirmed publication state, the delete UI must explicitly show that state and require an explicit user decision:

- **revoke publication first** — durable/reconciled `resources/unpublish`, then verify that publication is absent, then continue with keep/trash and finally local deletion; or
- **keep public access intentionally** — explicit acknowledgement that the public link may continue working and WebClip will no longer manage it from this Journal entry.

No hidden automatic bulk/single-entry unpublish. Unknown unpublish settlement must retain a durable privacy checkpoint and must not blind-retry a non-idempotent/unknown side effect merely because the UI timed out.

The local Journal entry must not be deleted while the user-selected privacy outcome is unresolved.

## P1-164 acceptance correction

The current canonical P1-164 wording says that after confirmed unpublish WebClip should clear both `publicUrl` **and stable `resourceId`**, preserving only `remotePath` so the entry becomes path-only.

That requirement conflicts with the stronger object-identity contracts already established by P1-090/P0-022.

A confirmed unpublish changes publication state; it does not by itself justify discarding the stable identity of the file. If WebClip deliberately clears `resourceId`, a later replacement file created at the same path can be accepted by the path-only locator and then moved/deleted as though it were the original object.

Required correction:

- after confirmed unpublish, clear `publicUrl` / publication state;
- preserve the proven `resourceId` whenever the API supplied it and the object identity is still valid;
- only degrade to a weaker legacy/path-only state when the API genuinely cannot provide/retain stable identity, and then destructive operations must use the stricter P0-022 fail-closed/rebind rules rather than automatic path authority.

Badge/open-file UX can still use authenticated exact-path access when public URL is absent, but path must not silently replace stable identity for destructive capability.

## P1-183 durable checkpoint contract

Before `resources/move` to Trash, persist a versioned delete checkpoint containing at minimum:

- Journal entry id + Journal generation / expected entry revision;
- operation generation / operationId;
- immutable account/root/auth-config context required by P0-074;
- exact source path;
- proven source `resourceId` (or explicitly weaker legacy proof class);
- exact chosen target path, including collision-generated name;
- publication state / selected privacy outcome and unpublish reconciliation state when applicable.

On retry/restart: verify target and source first; do not choose a second target or issue another move until the first outcome is classified.

Import/clear generation replacement must prevent an old delete checkpoint from deleting a replacement entry (P0-076).

## P1-090 post-move proof

Before move, snapshot immutable source identity. After move/unknown settlement, success requires the target to prove the same object identity (`resource_id` exact match; only already-defined legacy secondary proof where the API actually omits resource_id). A target file existing at the expected path is not sufficient.

When source and target observations conflict or identity cannot be proved, keep the checkpoint/entry and fail closed.

## External API verification

Current Yandex documentation still exposes distinct `publish` and `unpublish` operations; publication is a separately managed property/action, not a reason to erase the underlying file's local stable identity. No production assumption was made here about undocumented resource-id mutation across unpublish; real Yandex E2E remains required before implementation closure.

## Classification

- No new `P0-079`, `P1-197` or `P2-020` created.
- Extend/refine existing: `P0-069`, `P1-164`, `P1-183`, `P1-090`.
- Preserve dependencies: `P0-022`, `P0-074`, `P0-076`.

## Required regressions before closure

1. Published entry + `keep`: local deletion is blocked until user explicitly acknowledges retained public access or chooses revoke.
2. Published entry + revoke: local entry remains until unpublish outcome is proven; timeout/unknown does not blind-retry or falsely report private.
3. Confirmed unpublish clears publication URL/state but preserves stable `resourceId` when available.
4. Delete→Trash persists exact collision-resolved target before POST; worker restart resumes by verifying the same target.
5. Target path containing a different `resourceId` is rejected even if `type=file`.
6. POST timeout followed by exact original resource at target finalizes safely; conflicting source/target retains checkpoint.
7. Import/clear replacing the Journal entry invalidates stale delete finalization by generation/revision.

Previous product test gate is not re-run by this docs-only audit checkpoint.
