# Audit delta — Yandex restore listing must remain a read capability — 2026-08-28

Source-of-truth `main` immediately before this write: `583a46820aa6da57b0591adfbffc14f6559dacf6`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines evidence-reserved **P1-195 — Yandex OAuth capability/scope truthfulness and operation-specific capability admission**.

This is not a new independent blocker: it is a concrete restore-path case showing why “folder creation/listing” cannot be one undifferentiated capability.

## Current restore-list flow performs remote writes

`listJournalBackupsOnYandex(requestedMonth)` begins by reading current backup status and then calls:

`ensureYandexServiceFolders({ includeBackup: true })`.

`ensureYandexServiceFolders()` derives:

- `<root>/Backup`;
- `<root>/Backup/Journal`;

and calls:

`ensureYandexFolderTree(result.journalPath, operationId)`.

That helper is the common ensure/create path used by write workflows. If one or more path components are absent, it creates them through Yandex Disk resource mutations.

Only after that ensure/create step does restore listing enumerate the selected month.

Therefore the UI action “show/list available backups” is not presently a pure remote read.

## Why this matters under P1-195

P1-195 already requires explicit modeling of granted/missing/unknown Disk capabilities and centralized per-operation admission.

Current composition makes restore discovery depend on a write-capable helper even though the intended action can be expressed as:

- observe configured backup root;
- list existing backup directory/month if present;
- fetch an explicitly selected existing file.

A token/session with proven read capability but without write capability can therefore be prevented from performing a restore-list/read workflow because WebClip first attempts folder creation.

Worse, merely opening the restore picker may mutate the remote filesystem by creating an empty `Backup/Journal` tree even when the user never starts backup and never selects a file.

That is a hidden side effect attached to an observational UI action.

## This is distinct from legitimate automatic folder creation

P0-008/P0-012 require WebClip to use and create its managed service folders for saves/backups. Preserve automatic ensure/create for operations that actually need to write:

- PDF upload;
- Journal backup upload;
- ReadLater/Upload move destinations;
- Trash destination where the destructive workflow requires it.

The finding is narrower: **restore discovery should not create missing backup folders merely to prove that there are no backups.**

A missing configured backup directory is a valid read result equivalent to an empty backup list / “backups not found”, subject to ordinary auth/resource error distinctions.

## Required restore read contract

### List

For backup listing:

1. capture immutable Yandex operation/namespace context per P0-074;
2. require only the capabilities actually needed to observe/list existing resources;
3. derive the expected managed backup path without creating it;
4. GET/list the directory/month;
5. classify authoritative “not found” as empty/no backups when API semantics support that result;
6. do not issue folder-creation mutations from the listing path.

### Fetch

Fetching the selected backup remains read-oriented until local staging/import work begins. It should not create the backup source path if it disappeared; disappearance/mismatch invalidates the selection receipt from P0-013/P1-184.

### Write workflows

Backup/export keeps its separate ensure/create path and explicitly requires write capability.

Do not weaken folder/path containment or exact managed-root checks merely to separate the capability classes.

## Capability-state consequence

P1-195 should distinguish at least enough operation classes that UI can say truthfully:

- token/session can read/list/restore existing backups;
- token/session cannot currently create/upload/move/publish because write capability is missing or unknown;
- full-ready only when all capabilities required for the chosen write operation are proven.

A successful restore listing must not be used as proof that write capability exists, and a write denial must not automatically make read-only restore unavailable if the token still has the necessary read authority.

## Required regressions

1. Existing backup tree + read-capable session -> list succeeds without any remote create request.
2. Missing `Backup/Journal` tree -> list returns controlled empty/not-found result and creates no folder.
3. Read-only/insufficient-write token can list/fetch an existing backup when read capability is proven.
4. Same token cannot enter backup upload/folder-create path requiring write.
5. Merely opening/cancelling restore picker leaves remote filesystem unchanged.
6. Backup upload still ensures/creates service folders under explicit write capability.
7. Account/root changes during list/fetch remain fenced by P0-074 and invalidate old selection receipt.
8. P0-013 exact selected-object receipt remains mandatory; removing folder creation from list does not permit arbitrary path fetch.
9. 404/not-found and 401/403 capability/auth errors remain semantically distinct; do not turn every failure into “no backups”.
10. Manual token with unknown scope is represented truthfully under P1-195 rather than silently probing write by creating a directory.

## Duplicate check / numbering

No new P-number is created.

- **P1-195** owns capability/scope truthfulness and per-operation capability admission.
- **P0-008/P0-012** retain automatic managed-folder creation for actual write operations.
- **P0-013/P1-184** retain exact restore object/content identity.
- **P0-074** retains immutable account/root/config generation.

P1-211 remains unassigned.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains prior evidence only: **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.
