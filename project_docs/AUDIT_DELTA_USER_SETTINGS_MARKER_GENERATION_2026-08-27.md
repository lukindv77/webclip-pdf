# Audit delta — user-settings import marker generation — 2026-08-27

Baseline HEAD before this audit block: `481f8f85751a4076e449b7212df6b0db9cf831c2`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged. Canonical registry synchronization is not claimed.

## Scope

Fresh crash-consistency audit of `webclip-user-settings` import, focused on existing `P1-008` and shared-settings ordering dependency `P1-157`.

## Result

`P1-008` needs a generation-owned reconciliation marker. Current bundled settings+marker write is valuable and must be preserved, but the marker has no unique import identity and marker reconciliation is not part of the same actual-settlement barrier as the import write. An older reconciliation pass can therefore consume/delete a newer import's marker.

No new P-number is created.

## Confirmed runtime facts

`importUserSettings()` first waits existing import/yandex-config/OperationLog mutation barriers, reads current settings, constructs a full bundled settings write and writes in one `chrome.storage.local.set`:

- `yandexConfig`;
- OperationLog retention;
- Journal group-by-URL preference;
- `USER_SETTINGS_IMPORT_MARKER_KEY`.

The marker contains only:

- schema version;
- `createdAt`;
- schema name.

It contains no immutable `importId`, generation, expected settings hash or ownership receipt.

`userSettingsImportStorageSettlement` tracks only the actual bundled `storage.set` promise. Its `.finally()` releases that barrier as soon as the bundled write settles.

Only **after** the write does normal success call `reconcileUserSettingsImportMarker('settings-import')`. On caller timeout, a late-success callback calls `reconcileUserSettingsImportMarker('settings-import-late')`.

`reconcileUserSettingsImportMarker()` independently:

1. reads whichever marker currently exists;
2. accepts any object with the current version;
3. runs backup scheduler reconciliation;
4. removes `USER_SETTINGS_IMPORT_MARKER_KEY` through the marker storage queue.

It does not verify that the marker it removes belongs to the import/reconcile invocation that started the work.

## Confirmed race

A deterministic cross-generation schedule exists:

1. import A's bundled `storage.set` settles and writes marker A;
2. `userSettingsImportStorageSettlement` is released immediately;
3. reconcile A starts and issues its marker read, but that read is delayed;
4. import B is now allowed through the import settlement barrier and commits settings B + marker B;
5. reconcile A's delayed read returns the **current marker B**;
6. reconcile A initializes the scheduler using current settings, then removes the marker key without comparing marker identity;
7. marker B is gone even though reconciliation ownership belonged to A.

If B itself later has unknown settlement/reconciliation, or the worker terminates after B's settings commit but before B finishes its own scheduler reconciliation, startup has no marker proving that B still requires reconciliation.

The same ownership problem exists between a worker-start reconciliation and a newly admitted import: marker read and marker removal are not one compare-and-delete transaction/serialized generation receipt.

## Why this is P1-008, not a new item

P1-008 already owns the requirement that settings import uses a durable reconciliation marker and survives unknown settlement/restart. This audit shows the existing marker is not generation-safe under overlapping **reconciliation lifecycle**, even though the bundled settings write itself is atomic.

P1-157 remains separate but related: Journal `groupByUrl` still has a direct extension-page storage write outside the shared worker mutation contract, so it can race with the bundled import write. This checkpoint does not duplicate that root cause.

## Required P1-008 refinement

Each import must have an immutable generated `importId` / generation stored inside its bundled marker.

Reconciliation must carry the expected marker id it owns. Marker removal must be compare-and-remove semantics:

- fresh-read the marker inside the serialized marker mutation turn;
- remove only if `current.importId === expectedImportId`;
- if a newer marker exists, do not consume it;
- startup reconciliation may claim the current marker generation, but a newly committed import must establish a newer generation that an older startup task cannot erase.

The actual import settlement barrier should include, or explicitly hand off to, a durable reconciliation ownership receipt so a new import cannot be admitted into an ambiguous gap where the previous generation's marker cleanup still has authority over the same key.

Do not auto-retry a timed-out settings `storage.set`; timeout remains unknown settlement. Reconciliation is scheduler/config-derived repair only.

The marker need not contain secrets or the full imported settings payload because settings+marker already commit atomically. It needs identity/generation and enough non-secret metadata to establish ownership and diagnostics.

P0-074/P0-078 generation rules still apply to consequences of changed Yandex account/root/publication policy; a settings-import marker is not itself an auth or publication authorization receipt.

## Required deterministic regressions

1. A commit → delayed reconcile A → B commit → reconcile A resumes: marker B survives.
2. A times out locally, settles late, late reconcile A overlaps B: A cannot remove B marker.
3. Worker-start reconcile reads A, B commits before old reconcile's remove: compare-and-remove leaves B marker intact.
4. B settings commit followed by worker termination before scheduler reconciliation: startup sees B marker and repairs B generation.
5. Two reconcilers for the same importId are idempotent; one removal does not create an error or affect a newer generation.
6. Import timeout never causes a second bundled settings write automatically.
7. Direct/shared settings mutations remain ordered through the P1-157 worker-owned contract and cannot be overwritten by a late import generation silently.

## Classification

- Extend/reopen existing `P1-008` reconciliation-marker acceptance.
- Preserve `P1-157` as the shared settings writer/order dependency.
- Preserve `P0-074` and `P0-078` for Yandex operation/privacy generations affected by config changes.
- No `P0-079`, `P1-198` or `P2-020` created by this block.

Previous product test gate was not re-run by this docs-only checkpoint.