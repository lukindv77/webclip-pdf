# Research family evidence — Backup restore/import from Yandex

Family from `RESEARCH_DELTA_INDEX.md` section 4.

This document is a **lossless consolidation** of the detailed research deltas listed below. Current status and single-owner authority remain in `RESEARCH_REGISTRY.md`; this file preserves source proof, deterministic schedules, corrections, positive controls, acceptance cases and historical test/release interpretation.

Every retired source is embedded verbatim below and identified by its original filename plus SHA-256. Git history remains the secondary recovery path.

Primary owners from the navigation index: P0-013, P0-022, P0-073, P0-074, P1-035, P1-069, P1-184, P1-210, P1-215.

Retired source count: **4**.

## P-code coverage

P0-008, P0-012, P0-013, P0-074, P0-079, P1-052, P1-138, P1-139, P1-184, P1-195, P1-197, P1-198, P1-211, P2-011, P2-020

## Source ledger

| Original delta | SHA-256 | P-codes mentioned | Original title |
|---|---|---|---|
| `RESEARCH_DELTA_YANDEX_BACKUP_IMPORT_2026-08-27.md` | `7342551e4d1b244852a18101b49363e8fb40c49a39d41a0ba1562541ee9e239f` | P0-074, P0-079, P1-052, P1-138, P1-195, P1-197, P2-011 | Yandex backup / import research delta — 2026-08-27 |
| `RESEARCH_DELTA_YANDEX_BACKUP_SELECTION_IDENTITY_2026-08-27.md` | `759a4fe6247227eceb2d2c6f72b74a47dd632e948ded8fca98f4159c519416ae` | P0-013, P0-074, P0-079, P1-139, P1-198, P2-011, P2-020 | Research delta — Yandex backup selection identity — 2026-08-27 |
| `RESEARCH_DELTA_YANDEX_RESTORE_LIST_READ_CAPABILITY_2026-08-28.md` | `bb3c17b82774fe2f22e10fe89fc612017bd1ee446a2630ab7713c1a04849f4c0` | P0-008, P0-012, P0-013, P0-074, P1-184, P1-195, P1-211 | Research delta — Yandex restore listing must remain a read capability — 2026-08-28 |
| `RESEARCH_DELTA_YANDEX_RESTORE_SELECTED_OBJECT_RECEIPT_2026-08-28.md` | `babb42f9d714395412586a9b0f7d0d7f884719f77c7d4b4306069c4fd892ae46` | P0-013, P0-074, P1-184, P1-211 | Research delta — Yandex restore selected-backup object receipt — 2026-08-28 |

## Lossless source transcripts

The sections below preserve the original UTF-8 Markdown text verbatim. Historical statements remain evidence, not independent current status authority; `RESEARCH_REGISTRY.md` controls status/ownership.
## Retired source: `RESEARCH_DELTA_YANDEX_BACKUP_IMPORT_2026-08-27.md`

SHA-256 of UTF-8 source text: `7342551e4d1b244852a18101b49363e8fb40c49a39d41a0ba1562541ee9e239f`

# Yandex backup / import research delta — 2026-08-27

Baseline source HEAD: `8987a8367b73126331aeda60b57f65e5836e4f42`.

This is a lossless research checkpoint and not a canonical-registry replacement. No production/runtime/config/manifest change is made by this checkpoint.

## Existing-item status correction — P1-052 is not fully REGRESSION-closed

Current source keeps a `prepared` Journal-backup checkpoint across the first missing-file result, but after both conditions become true:

- age >= `JOURNAL_BACKUP_PREPARED_404_GRACE_MS` (15 minutes), and
- attempt count >= `JOURNAL_BACKUP_PREPARED_404_MIN_ATTEMPTS` (3),

`recoverPendingJournalBackup()` executes `chrome.storage.local.remove(JOURNAL_BACKUP_PENDING_KEY)` and logs that the previous transfer is considered not to have created a file. It then returns `null`; the calling backup flow proceeds to `stageFullJournalExport()` and may create a new timestamped backup version.

This is stronger than the wording currently recorded by P1-052. A local/remote lookup returning 404 after an upload with unknown transport/response settlement is evidence that the object is not visible at that lookup instant; by itself WebClip has no durable authoritative receipt proving that the earlier signed PUT did not commit or cannot appear later. The current code therefore destroys the only recovery identity and upgrades an unknown result to a proven negative result.

The current public Yandex Disk REST documentation reviewed during this research documents the service and ordinary resource operations, but the research did not find a documented contract making "three 404 responses after 15 minutes" an authoritative negative settlement receipt for a previously unknown signed upload. Do not encode such a guarantee without an explicit API contract or real E2E evidence.

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
- Re-research every RPC wrapped in `sendReadOnlyRuntimeMessage` / described as read-only and prove it has no hidden remote or Chrome-storage mutation except separately documented reconciliation that is generation-safe and intentionally classified.
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

Research documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were not rerun for this checkpoint. Real unpacked Chrome and real Yandex backup/list/upload/import E2E remain release QA blockers.

## Retired source: `RESEARCH_DELTA_YANDEX_BACKUP_SELECTION_IDENTITY_2026-08-27.md`

SHA-256 of UTF-8 source text: `759a4fe6247227eceb2d2c6f72b74a47dd632e948ded8fca98f4159c519416ae`

# Research delta — Yandex backup selection identity — 2026-08-27

Baseline HEAD before this research block: `c80cd31ab606fc71ac62546484d0e92eb3126dad`.

Docs-only research checkpoint. Production runtime and `manifest.json` are unchanged. Canonical registry synchronization is not claimed.

## Scope

Fresh research of the explicit Yandex Journal backup picker from LIST through user selection, signed download and replace-import. Primary owner: existing `P0-013`; dependencies: `P0-074`, `P1-139`, `P2-011` and import staging safety.

## Result

`P0-013` must be refined/reopened from a path-selection guarantee to an **exact selected backup-object identity** guarantee. The UI currently displays metadata for one remote object but persists only its path. The worker later downloads whichever object currently occupies that path, without re-reading/comparing metadata before issuing `/resources/download`.

No new P-number is created.

## Exact runtime proof

### LIST already has useful object metadata

`listJournalBackupsOnYandex()` enumerates the selected month with:

- `name`;
- `path`;
- `type`;
- `size`;
- `modified`.

It filters to `WebClip_Journal_*.json`, returns those records, and sorts mainly by `modified`.

### UI discards the selection receipt

`journal.js` keeps only:

`let selectedYandexBackupPath = '';`

For each radio item, the change handler assigns only `radio.value` (the path) to `selectedYandexBackupPath`. The already returned/displayed `size` and `modified` are not retained as confirmation authority.

`importSelectedYandexBackup()` then copies only that path and sends:

`WEBCLIP_JOURNAL_YANDEX_FETCH_BACKUP { path, operationId }`.

### FETCH resolves the current path, not the selected object

`fetchJournalBackupFromYandex(requestedPath, operationId)`:

1. normalizes the path;
2. fresh-reads current backup root and checks path containment;
3. immediately calls `GET /resources/download?path=<remotePath>`;
4. follows the returned signed URL via offscreen `text-download`;
5. parses/previews the downloaded JSON and later requires the normal 9-digit replace confirmation.

There is no fresh `GET /resources` metadata lookup for the chosen file before obtaining the download link, and no comparison to the metadata the user selected in the picker.

Therefore a same-account/same-root replacement can change object A into object B under the identical path between LIST and FETCH. The user visibly selected A, but WebClip downloads B. If B is a syntactically valid WebClip backup, normal schema validation and the later 9-digit confirmation cannot detect that the selected remote object changed; the confirmation is then for the already downloaded replacement payload.

Path containment is necessary but does not prove selected-object identity.

## Classification

This is not a new `P1-198` root cause. `P0-013` already states that Yandex import must require explicit selection of a **concrete backup file**. A path that can resolve to a different object later is insufficient evidence that the concrete selected file is still the one being imported.

`P0-074` remains separate: it owns immutable account/root/auth/config generation across long Yandex operations and stale selection after reauth/root change. This checkpoint adds same account/root, same path, **different object generation**.

`P1-139` remains picker request ordering/single-flight and does not solve selected-object identity.

`P2-011` currently says backup listing should request only metadata actually used. Once selection identity uses additional metadata, requesting it is no longer overfetch and the P2-011 acceptance should be interpreted accordingly.

## Required P0-013 refinement

The picker must retain a bounded immutable selection receipt, not only a path. At minimum it should bind:

- account/root/config generation from the listing operation (P0-074);
- normalized path;
- size;
- modified/revision-like metadata when available;
- a stable Yandex `resource_id` when the actual API response exposes it and its semantics have been verified for this operation.

Immediately before `/resources/download`, the worker must fresh-read exact metadata for the path under the same immutable Yandex operation context and compare it with the selected receipt.

A stable verified object identifier should dominate weaker fields. Size/modified can be useful mismatch evidence but must not be presented as cryptographic/content identity. If the current API cannot provide a trustworthy stable object identity for this path, the safe fallback is to require all available selected metadata to remain unchanged and fail-closed/reselect on any mismatch rather than silently importing a replacement.

The selection receipt is authorization to import **that selected remote version**, not general authorization to import future content at the same path.

After issuing the signed download URL, preserve the same operation context. If object identity can change between metadata verification and signed-link issuance and the API offers no atomic conditional download, treat this as a bounded residual race requiring real Yandex E2E characterization; do not claim stronger atomicity than the API provides.

The downloaded JSON must still pass all existing streaming size/schema/import-provenance boundaries and the 9-digit destructive replace confirmation. Object identity validation is additional, not a replacement for content validation.

## Required regressions

1. LIST returns object A; A remains unchanged; FETCH imports A successfully after ordinary confirmation.
2. LIST A → external replacement B at same path with different size: Proceed fails and requires reselect; B is not imported.
3. LIST A → replacement B with same size but different stable `resource_id`/revision when available: Proceed fails.
4. LIST A → replacement valid WebClip JSON B at same path: schema validity does not bypass selected-object mismatch.
5. Account/root changes after selection: existing P0-074 fence fails closed before download.
6. Late/stale picker LIST response cannot replace a newer selection (preserve P1-139 generation semantics).
7. If API omits stable identity, changed `modified`/other selected metadata fails closed rather than being ignored.
8. Signed-download failure/timeout leaves the local Journal unchanged and does not automatically retry the destructive import.

## External API note

Current WebClip runtime already consumes Yandex `resource_id` on multiple private-resource metadata paths, and current third-party clients/spec-derived integrations expose `resource_id`/revision-like fields. This checkpoint does **not** assume undocumented atomic or immutable semantics from those fields. The implementation must verify real Yandex REST behavior/E2E before treating any field as a stable object receipt.

## Numbering

- Reopen/refine existing `P0-013`.
- Preserve `P0-074` for account/root/auth/config generation.
- Preserve `P1-139` for picker single-flight ordering.
- No `P0-079`, `P1-198` or `P2-020` assigned by this block.

Previous product test gate was not re-run by this docs-only checkpoint.

## Retired source: `RESEARCH_DELTA_YANDEX_RESTORE_LIST_READ_CAPABILITY_2026-08-28.md`

SHA-256 of UTF-8 source text: `bb3c17b82774fe2f22e10fe89fc612017bd1ee446a2630ab7713c1a04849f4c0`

# Research delta — Yandex restore listing must remain a read capability — 2026-08-28

Source-of-truth `main` immediately before this write: `583a46820aa6da57b0591adfbffc14f6559dacf6`.

Docs-only research checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

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

## Retired source: `RESEARCH_DELTA_YANDEX_RESTORE_SELECTED_OBJECT_RECEIPT_2026-08-28.md`

SHA-256 of UTF-8 source text: `babb42f9d714395412586a9b0f7d0d7f884719f77c7d4b4306069c4fd892ae46`

# Research delta — Yandex restore selected-backup object receipt — 2026-08-28

## Scope

Docs-only research of explicit Journal-backup selection from Yandex Disk through fetch/preview/replace. No new P-number.

Refines **P0-013** explicit selected-backup authority and composes with **P1-184** exact remote object/content proof plus P0-074 namespace generation.

## Finding

The picker visibly asks the user to select a **specific backup file**, but the authority carried from list to fetch is only the textual path.

Current list flow returns backup rows containing fields such as:

- `name`;
- `path`;
- `size`;
- `modified`;
- month metadata.

The UI stores only:

`selectedYandexBackupPath`.

Proceed later calls:

`WEBCLIP_JOURNAL_YANDEX_FETCH_BACKUP { path, operationId }`.

The worker fresh-validates that this path is inside the current Journal backup root, obtains a new signed download URL for the path, downloads the current object and validates its JSON structure. It does **not** require a receipt proving that the current remote object is the same object instance/content the user selected in the picker.

### Deterministic path-replacement schedule

1. Picker lists remote object A at path P, showing A's name/time/size to the user.
2. User explicitly selects A; page stores only P.
3. Before Proceed/fetch, another client deletes/replaces P with different valid backup B.
4. Page sends only P.
5. Worker asks Yandex for a fresh download URL for current P and receives B.
6. B is structurally valid `webclip-journal` backup, so streaming preview succeeds.
7. User's later 9-digit confirmation authorizes replacement based on a flow that began with visually selected A, but the staged source is B.

Fresh parse/normalization at Proceed is a strong corruption defense, but it proves **current staged bytes are valid**, not that they are the remote object the user selected.

## Why path + display metadata are insufficient

Even if the UI forwarded `size/modified`, those are useful comparison metadata but not stable object/content identity under replacement or same-size recreation.

The list/fetch receipt should use the strongest Yandex object identity exposed and validated by real API/E2E semantics, plus a local content receipt once bytes are downloaded.

If `resource_id` is suitable/stable for this resource class, the list API should request/store it and fetch must compare current metadata before obtaining/consuming the signed body. If API semantics do not provide a trustworthy immutable object id, use another explicitly validated identity/content strategy; do not silently fall back to path-only authority.

## Required authority chain

The explicit restore source should have one receipt chain:

1. **selection receipt** — account/root/config generation + exact listed object identity + path as locator/display metadata;
2. **fetch precondition** — current remote metadata still matches the selected object receipt before body admission;
3. **download content receipt** — exact staged byte length/digest/generation after signed download;
4. **preview receipt** — validated schema/version/entry count tied to that exact staged content generation;
5. **destructive confirmation** — consumes that exact preview/staging receipt, not only a reusable path;
6. **replace commit** — still revalidates staged bytes/current Journal target generation before mutation.

A mismatch between listed object A and current P/B must invalidate selection and require the user to re-list/re-select, not silently upgrade B to the selected source.

## Namespace composition

Selection identity must also include current Yandex account/root generation. The same textual backup path in another account/root is not the object the user selected earlier.

Reauthentication/root change while picker is open therefore invalidates the old selection receipt even if P exists and contains a valid Journal backup.

## Acceptance cases

1. List A -> select A -> current object remains exact A -> fetch/preview succeeds.
2. List A -> path P replaced by B before Proceed -> stale selection fails and requires re-list/re-select; B is not downloaded as A.
3. A and B have same size/name/modified-like metadata -> strong object/content receipt still rejects substitution.
4. Account changes A-account→B-account while picker open -> old selected receipt cannot fetch same textual P in B.
5. Root/config changes while picker open -> selection becomes stale.
6. Signed download completes -> staged content digest/generation is bound to the selected remote receipt and later preview/confirmation.
7. Staged payload is deleted/expired after preview -> existing staging-lifetime rules require re-stage; worker does not re-fetch P automatically under the old destructive confirmation.
8. Fresh normalization at Replace remains mandatory and is not replaced by trusting list metadata.

## Classification

- **P0-013** remains the primary product authority: restore must use the exact backup explicitly selected by the user, not merely whatever later occupies the same path.
- **P1-184** supplies exact remote object/content proof mechanics.
- **P0-074** supplies account/root/config generation fencing.

No new P1-211 is allocated.

## Validation note

Documentation only. Runtime/tests/manifest unchanged. Product tests were not rerun; historical 88/88 JS syntax + 74/74 deterministic PASS remains prior evidence. No build/tag/release.

