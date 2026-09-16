# Research evidence — P0-069 explicit publication outcome on Journal delete — 2026-09-17

Research-only closure-oriented tranche. Production runtime, `manifest.json`, workflows, build/tag/deploy/release state, `TEST_STATUS.md` and `RELEASE_READINESS.md` are unchanged.

## Scope and current owner

Current single-owner authority remains `RESEARCH_REGISTRY.md`.

`P0-069` is ACTIVE:

> Deleting a Journal entry with a public Yandex link requires explicit publication outcome; local deletion cannot silently strand public access/control.

This tranche revalidates that owner against fresh current source and external Yandex/public implementation evidence. It does not claim implementation or physical closure.

## Semantic duplicate / root-cause reconciliation

No new P-code is created.

The publication-delete problem remains owned by **P0-069**. Adjacent owners remain separate:

- **P0-022** — exact destructive remote object provenance: which physical Yandex object may be mutated;
- **P0-078** — publication-policy generation/revocation: whether not-yet-started publication authority remains allowed when policy changes;
- **P0-074** — immutable Yandex auth/account/root/config/publication operation context;
- **P0-076** — per-entry revision + Journal-generation CAS before the local Journal record is mutated;
- **P0-072** — bulk clear/replace versus admitted non-cancellable external side effects.

P0-069 composes these controls but owns a different question: **what becomes of already-existing public access when its Journal record is deleted?**

Historical `RESEARCH_FAMILY_YANDEX_REMOTE_IDENTITY_EVIDENCE.md` is used only for semantic dedup/provenance. Fresh conclusions below come from current source.

## Fresh current-source proof

### 1. Journal delete UI exposes only file-placement choices

Current `journal.html` asks:

`Что сделать с файлом на Яндекс Диске?`

and offers exactly two radio choices:

1. `Оставить файл на Яндекс Диске` — only local Journal record is removed;
2. `Так же удалить файл на Яндекс Диске` — the file is moved into WebClip `Trash/MM-YYYY`.

There is no separate publication-access choice and no publication outcome shown in the delete confirmation.

### 2. Journal page reduces the user's decision to `diskAction = keep | trash`

Current `journal.js::confirmDeleteEntry()` derives:

`const diskAction = deleteTrashFile.checked ? 'trash' : deleteKeepFile.checked ? 'keep' : '';`

and sends only that file-placement action to the worker.

No `publicationAction`, public-access receipt, or explicit preserve/revoke decision accompanies the delete request.

### 3. Worker knows a public link exists but does not settle its lifecycle

Current `service-worker.js::deleteJournalEntry()`:

- loads the Journal entry;
- recognizes whether it is a Yandex entry;
- accepts only `keep` or `trash`;
- records `hasPublicUrl: Boolean(entry.publicUrl)` in the OperationLog;
- if `trash`, resolves the exact Yandex file and calls `moveJournalYandexFileToTrash(...)`;
- then deletes the local Journal record and reports success.

The presence of `publicUrl` therefore affects logging, not the authorization/settlement contract of deletion.

### 4. File movement and publication revocation are different authorities

Current code has machinery that records a Yandex `publicUrl`/`resourceId` after save and uses strong remote identity when locating a Journal object. This is a positive control for adjacent owners, especially P0-022.

However, the delete path does not call an explicit Yandex unpublish/revoke operation and does not verify a public-access post-state before declaring local Journal deletion complete.

This finding does **not** assume that every Yandex move preserves a public link. The narrower defect is enough: WebClip does not request, observe, or durably settle a publication outcome, so it cannot prove whether public access was intentionally preserved, revoked, or became unknown.

## Deterministic failure schedule

Assume Journal entry `J` refers to exact Yandex resource `R` and contains a known public capability `P`.

### Current keep path

1. `J` has `publicUrl=P`.
2. User chooses “Оставить файл”.
3. Worker records only `diskAction=keep`.
4. No publication decision is captured.
5. `J` is deleted locally.
6. WebClip loses its Journal-owned control record while no explicit publication outcome has been settled.

The remaining access state may be platform-dependent, but WebClip has no durable proof that the user deliberately chose that outcome.

### Current trash path

1. `J` has `publicUrl=P`.
2. User chooses “переместить в Trash”.
3. P0-022-style exact object lookup can correctly identify `R`.
4. Worker moves `R` to WebClip Trash.
5. No explicit unpublish/revoke call or public-state verification occurs.
6. Worker deletes `J` locally and reports success.

Even if a specific server behavior happens to make `P` unusable, file movement is not a WebClip-controlled publication receipt. If access remains, changes asynchronously, or cannot be observed, the current UI/Journal has already discarded the control record.

## Vendor / standards evidence

Fresh Yandex documentation distinguishes sharing/publication from file deletion/movement:

- Yandex Disk sharing guidance describes a public/permanent link as continuing until access is explicitly revoked/restricted; restricting access is a distinct user action.
- Yandex 360 business sharing guidance similarly separates creating a permanent shared link from restricting all access.
- Yandex 360 audit-log event taxonomy distinguishes `disk_fs-set-public` from `disk_fs-set-private`; file/trash/removal events are separate event categories.
- Yandex Disk documentation treats Trash/file deletion as its own lifecycle rather than as the sharing-policy operation.

Therefore WebClip must not infer an exact publication result merely from a successful path move or local record deletion.

## Public implementation evidence

Independent Yandex Disk clients expose publication lifecycle as a separate API concept:

- `ilyabrin/disk` exposes distinct `PublishResource`, `UnpublishResource`, and deletion/trash operations.
- `RomiC/ya-disk` exposes separate `publish`, `unpublish`, and `remove`.
- `yandex-disk-restapi-java` exposes `unpublish(path)`.
- `ufee/yandex-disk` represents the same distinction through `setPublish(false)`.

These projects are not normative for WebClip, but they are useful independent controls showing that clients model public-access revocation separately from file placement/deletion.

## User-facing relevance

Yandex's own end-user sharing documentation presents “share by link” and “restrict/remove access” as explicit actions. A user who deletes WebClip's local Journal record should therefore not have to infer what happened to a capability that was previously exposed to anyone holding the link.

A broad community search did not surface a reliable independent WebClip/Yandex report precise enough to use as defect proof; no such anecdote is asserted here.

## Required invariant

For a Journal record whose Yandex resource has known public access, deletion must produce one **explicit publication outcome**:

- **preserve** public access; or
- **revoke** public access.

A file move, path deletion, local Journal deletion, missing URL field, or generic remote success is not a substitute for that outcome.

If revocation is selected:

1. the operation must target the exact P0-022 resource under the immutable P0-074 context;
2. durable intent/checkpoint must exist before the non-cancellable external side effect is admitted;
3. an explicit unpublish/revoke action must be started;
4. success must be positively settled/verified before Journal deletion is reported successful;
5. timeout/unknown settlement remains durable and recoverable instead of being converted to local success.

If preservation is selected, the product may delete the local record only after recording that the user deliberately accepted continued public access. The UI must not disguise preserve as merely “keep the file”.

## Acceptance shape

1. **Published-state detection.** A known `publicUrl` / verified publication receipt makes publication outcome part of delete admission.
2. **Two independent choices.** File placement (`keep` / `trash`) and publication access (`preserve` / `revoke`) are separate concepts.
3. **Explicit preserve.** If supported, preserve requires a deliberate user choice and clear warning that link access remains.
4. **Exact revoke target.** Revoke consumes P0-022 exact object provenance; path/name alone cannot authorize it.
5. **Immutable operation context.** Revoke and its verification stay within one P0-074 account/root/auth/config generation.
6. **Durable side-effect checkpoint.** Before admitting revoke, write a recovery-safe receipt carrying operationId, entry identity/revision, remote identity, public capability identity as appropriate, requested outcome, and operation context.
7. **Unknown is not success.** Timeout/restart/ambiguous external settlement keeps a pending or manual-resolution state; do not delete the only control record as if access were settled.
8. **Verify revocation.** A successful revoke must have an authoritative post-state showing public access is no longer active according to the selected Yandex API contract.
9. **Final Journal CAS.** P0-076 entry revision + Journal generation still gate local deletion after remote settlement.
10. **Bulk composition.** P0-072 must account for admitted publication side effects before clear/replace can discard local checkpoints.
11. **Unpublished positive control.** An entry with no public-access receipt does not invent an unnecessary revoke step.
12. **No conflation with policy generation.** P0-078 governs future/not-yet-started publish authority; P0-069 settles already-existing publication during destructive Journal lifecycle.

## Deterministic model

`project_tools/test_p0_069_publication_outcome_revalidation_model.js`

Local preflight:

- `node --check`: PASS
- deterministic execution: **PASS 47 checks**
- SHA-256: `d9284a26a853d8f4e456efa5a51570fd1061ddaf092dea70299dc6af1448c8cf`
- Git blob: `69a7d57f702d663566210118dea94f2d6176ed4b`

The model covers:

- current `keep`/`trash` behavior without publication settlement;
- explicit preserve as a deliberate outcome;
- revoke requiring exact remote identity;
- revoke failure and unknown settlement blocking local success;
- durable pending recovery after timeout/restart;
- immutable publication-outcome receipt;
- unpublished normal deletion;
- separation of publish/unpublish/move authorities.

## Closure boundary

This tranche is **research revalidation only**.

P0-069 remains **ACTIVE / ROOT-CAUSE-REVALIDATED**. Implementation closure still requires production code plus direct deterministic regression and real Yandex E2E evidence for at least:

- known published object + explicit preserve;
- known published object + successful revoke;
- revoke timeout/unknown outcome + worker restart/recovery;
- exact resource replaced/moved before revoke;
- account/root context switch during the operation;
- Journal replace/clear racing an admitted revoke;
- unpublished entry normal deletion.

No release-readiness change is implied. Release remains **NOT READY** unless current canonical `RELEASE_READINESS.md` is explicitly changed by an authorized release tranche.
