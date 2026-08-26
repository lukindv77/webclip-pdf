# Yandex backup / import audit delta — 2026-08-27

Baseline source HEAD: `8987a8367b73126331aeda60b57f65e5836e4f42`.

This is a lossless audit checkpoint and not a canonical-registry replacement. No production/runtime/config/manifest change is made by this checkpoint.

## Existing-item status correction — P1-052 is not fully REGRESSION-closed

Current source keeps a `prepared` Journal-backup checkpoint across the first missing-file result, but after both conditions become true:

- age >= `JOURNAL_BACKUP_PREPARED_404_GRACE_MS` (15 minutes), and
- attempt count >= `JOURNAL_BACKUP_PREPARED_404_MIN_ATTEMPTS` (3),

`recoverPendingJournalBackup()` executes `chrome.storage.local.remove(JOURNAL_BACKUP_PENDING_KEY)` and logs that the previous transfer is considered not to have created a file. It then returns `null`; the calling backup flow proceeds to `stageFullJournalExport()` and may create a new timestamped backup version.

This is stronger than the wording currently recorded by P1-052. A local/remote lookup returning 404 after an upload with unknown transport/response settlement is evidence that the object is not visible at that lookup instant; by itself WebClip has no durable authoritative receipt proving that the earlier signed PUT did not commit or cannot appear later. The current code therefore destroys the only recovery identity and upgrades an unknown result to a proven negative result.

The current public Yandex Disk REST documentation reviewed during this audit documents the service and ordinary resource operations, but the audit did not find a documented contract making "three 404 responses after 15 minutes" an authoritative negative settlement receipt for a previously unknown signed upload. Do not encode such a guarantee without an explicit API contract or real E2E evidence.

Required P1-052 correction:

- Treat the 15-minute/3-attempt values as retry/defer policy only, not proof of non-creation.
- Never delete the only prepared checkpoint solely because of elapsed wall-clock + repeated 404 after unknown upload settlement.
- Move long-unresolved prepared backup evidence to a bounded `stale-unverified`/manual-resolution state, analogous to the diagnostic preservation principle used for remote-save checkpoints, or retain another durable tombstone/receipt sufficient to prevent duplicate/orphan ambiguity.
- A new timestamped backup may be created automatically only when the prior upload is authoritatively proven not to exist/not to have committed, or when product policy explicitly accepts a duplicate while retaining the old unresolved identity for reconciliation.
- `remote-verified` behavior remains stricter: a later 404 must never silently erase a previously verified receipt.

Required regression: signed upload physically settles or has unknown late settlement -> worker loses response -> three GET 404 results across >15 min -> old checkpoint is still diagnosable/reconcilable and the system does not falsely log "transfer did not create a file" as a proven fact.

Classification: reopen/extend **P1-052** rather than assign P1-197.

## Existing-item status correction — P1-138 "read-only" Yandex backup list/fetch is not actually read-only

P1-138 currently treats backup status/list and similar UI RPCs as read-only and therefore says late responses after the UI deadline are safe. Source review disproves that assumption for the backup picker path.

`journal.js::loadYandexBackupList()` calls `sendReadOnlyRuntimeMessage({ type:'WEBCLIP_JOURNAL_YANDEX_LIST_BACKUPS', ... })`.

The worker dispatches that message to `listJournalBackupsOnYandex()`, which calls:

`ensureYandexServiceFolders({ includeBackup: true })`.

`ensureYandexServiceFolders()` in turn calls `ensureYandexFolderTree()` for `<root>/Backup/Journal`. That helper issues mutating `PUT /resources` calls when folders are absent. Therefore simply opening/navigating the "import backup" picker can create remote Yandex folders even though the UI classifies the request as read-only.

The same hidden side effect exists in `fetchJournalBackupFromYandex()`: before validating/downloading the selected existing backup it calls `ensureYandexServiceFolders({ includeBackup:true, operationId })`, which may create folders. A read/import path should not need to create missing directory structure merely to prove that an existing backup can be listed or fetched.

Consequences:

- P1-138's safety statement "late response is safe because operation is read-only" is false for this path.
- A timed-out/stale picker request can still create folders later.
- UI generation fencing prevents stale DOM rendering, but it cannot undo an already issued remote PUT.
- Capability modeling from P1-195 is also distorted: a user who only wants to list/read backups unexpectedly requires/uses write capability.

Required correction:

- Split pure path derivation/read lookup from mutating `ensure*` helpers.
- Backup list/import should compute the expected backup root without creating it; missing root/month should yield an empty list/404-style read result, not a PUT.
- Only explicit write flows (backup export, root-setup action where the user requested structure creation, upload/move destinations) may create service folders.
- Re-audit every RPC wrapped in `sendReadOnlyRuntimeMessage` / described as read-only and prove it has no hidden remote or Chrome-storage mutation except separately documented reconciliation that is generation-safe and intentionally classified.
- Update capability admission: listing/fetch requires only the capabilities genuinely needed for read, not write merely because a helper happens to create folders.

Required regression: configured root with no `Backup/Journal` -> open/import backup picker -> zero `PUT /resources`; result is empty/not-found UI. Late list response after UI timeout must have no remote side effect.

Classification: **P1-138 should be treated as PARTIAL/open for this regression**, not a new P1-197.

## Existing-item refinement — P0-074 multi-step backup selection is not bound to account/root generation

The Journal backup picker stores only:

`selectedYandexBackupPath = radio.value`.

`WEBCLIP_JOURNAL_YANDEX_LIST_BACKUPS` returns paths/files for whatever Yandex auth/root is current during listing. Later `importSelectedYandexBackup()` sends only `{ path, operationId }` to `WEBCLIP_JOURNAL_YANDEX_FETCH_BACKUP`.

`fetchJournalBackupFromYandex()` then re-reads the **current** backup status/config/auth, rebuilds the current service root, validates only that the stale path string is under that current `journalPath`, and downloads using the current Yandex session.

Therefore this sequence is possible:

1. Account A/root R lists backup path `R/Backup/Journal/MM-YYYY/X.json` and the user selects it.
2. Before Proceed, another Options page or auth action switches to account B while root string remains R.
3. The Journal page still holds only the old path string.
4. Proceed fetches the same textual path from B. If B has an object at that path, WebClip can stage a different backup than the object the user selected under A.

The later 9-digit replace confirmation protects against accidental destructive action, but it does not prove that the staged remote object is the one whose row the user selected; the displayed path can be identical across accounts.

Required P0-074 refinement:

- Multi-step remote object selection must carry an immutable selection/admission receipt, at least `accountUid + normalized rootPath + auth/config generation + selected path` and, where available/appropriate, a stable resource identity from the listing/fresh verification.
- Proceed must fresh-check the exact selection namespace/generation before any download-link request. A→B reauthorization or incompatible root change invalidates the picker selection and requires relisting.
- UI should close/disable stale picker state when auth/root generation changes, but worker remains authoritative and must reject a stale receipt even if the extension page missed the change.
- Do not weaken P2-011's metadata minimization casually; if a stable resource identity is required for safe selection, fetch only the minimum identity field justified by this contract and document the reason.

Regression: list/select under A -> reauth B with same textual root/path -> Proceed must fail closed before fetching B's object; relist under B produces a new valid receipt.

Classification: extend **P0-074** operation-scoped Yandex identity to user-interactive multi-step selection rather than create P0-079.

## Test / release evidence

Audit documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were not rerun for this checkpoint. Real unpacked Chrome and real Yandex backup/list/upload/import E2E remain release QA blockers.
