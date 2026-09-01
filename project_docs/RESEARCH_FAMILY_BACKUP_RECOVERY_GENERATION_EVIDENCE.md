# Research family evidence — Backup / scheduler / remote recovery generation

Family from `RESEARCH_DELTA_INDEX.md` section 1.

This document is a **lossless consolidation** of the detailed research deltas listed below. Current status and single-owner authority remain in `RESEARCH_REGISTRY.md`; this file preserves source proof, deterministic schedules, corrections, positive controls, acceptance cases and historical test/release interpretation.

Every retired source is embedded verbatim below and identified by its original filename plus SHA-256. Git history remains the secondary recovery path.

Primary owners from the navigation index: P1-076, P1-077, P1-117, P1-177, P1-184, P1-194, P1-207, P1-208, P1-210, P0-074.

Retired source count: **25**.

## P-code coverage

P0-012, P0-013, P0-015, P0-016, P0-022, P0-039, P0-046, P0-048, P0-063, P0-065, P0-073, P0-074, P0-076, P0-078, P0-079, P0-080, P1-008, P1-035, P1-043, P1-047, P1-052, P1-054, P1-064, P1-069, P1-073, P1-076, P1-077, P1-090, P1-117, P1-139, P1-146, P1-156, P1-157, P1-169, P1-173, P1-177, P1-178, P1-179, P1-184, P1-190, P1-192, P1-194, P1-195, P1-196, P1-197, P1-198, P1-201, P1-205, P1-206, P1-207, P1-208, P1-210, P1-211

## Source ledger

| Original delta | SHA-256 | P-codes mentioned | Original title |
|---|---|---|---|
| `RESEARCH_DELTA_BACKUP_PENDING_ACCOUNT_OBJECT_IDENTITY_2026-08-28.md` | `35ccad93428a21bd9e6c97bc291716f11d70b9b988f0f57f0a8874c58c9ba8fb` | P0-073, P0-074, P1-184 | Research delta — backup pending account/object identity (2026-08-28) |
| `RESEARCH_DELTA_BACKUP_PENDING_CONTEXT_SWITCH_EVIDENCE_RETENTION_2026-08-28.md` | `68e68356c86eedf5f996bd10bde602da3dbe5cda098ebfbb8787bed248f23d4b` | P0-074, P1-047, P1-177, P1-194 | Research delta — pending Journal backup context switch must retain recovery evidence — 2026-08-28 |
| `RESEARCH_DELTA_BACKUP_PENDING_GENERATION_MULTIPLICITY_2026-08-28.md` | `79161d15093ef4ee0865f8ea56f4620cbd39c293b10b9e80fa4fd4a443536fd7` | P0-046, P0-073, P0-074, P1-052, P1-184, P1-207, P1-211 | Research delta — Journal backup pending-generation multiplicity — 2026-08-28 |
| `RESEARCH_DELTA_BACKUP_RECOVERY_NAMESPACE_2026-08-27.md` | `59273959cb55af3e4becd5d5456873f1a892c47163288ed98c46d6172231300b` | P0-073, P0-074, P1-052, P1-177, P1-184, P1-196, P1-198 | Research delta — Journal backup recovery namespace provenance — 2026-08-27 |
| `RESEARCH_DELTA_BACKUP_RESTORE_AUTHORITY_SWITCH_TO_STAGING_2026-08-28.md` | `046c26299230844387b7364c697bbbd6b3a5187f5e06eba1ca2380397a39ae6d` | P0-013, P0-076, P1-035, P1-211 | Research delta — Yandex backup restore authority switches from remote object to staged bytes — 2026-08-28 |
| `RESEARCH_DELTA_BACKUP_SCHEDULER_GENERATION_2026-08-27.md` | `22453fc5077219056abd17fdcbf01acfa2fa8f83decb80de8ad5f4174c319b68` | P0-074, P1-173, P1-177, P1-178, P1-196 | Research delta — Journal backup scheduler/settings generation fencing — 2026-08-27 |
| `RESEARCH_DELTA_BACKUP_SELECTED_OBJECT_STAGING_RECEIPT_2026-08-28.md` | `ca243871ea0df3a61591661a50cec83a89c11a2b0597d2196d4db13ab9896a05` | P0-013, P0-074, P0-076, P1-035, P1-043, P1-139 | Research delta — selected Yandex backup object through staging receipt — 2026-08-28 |
| `RESEARCH_DELTA_BACKUP_SOURCE_REVISION_RECOVERY_CHAIN_2026-08-28.md` | `fd9581feae2295cea5d2e5f40628456bf6de63f14e8b7cab6c993fed525354d6` | P0-073, P0-074, P0-076, P1-052, P1-177, P1-184, P1-207 | Research delta — backup source revision through crash recovery — 2026-08-28 |
| `RESEARCH_DELTA_BACKUP_SOURCE_REVISION_SUCCESS_2026-08-27.md` | `0be391f00781d8325b9c09bf3a16c47db9bee175dfd1fa78664d9775816629b0` | P0-012, P0-015, P0-073, P0-074, P1-073, P1-076, P1-077, P1-117, P1-177, P1-179, P1-184, P1-205, P1-206, P1-207 | Research delta — Journal backup source revision vs success state — 2026-08-27 |
| `RESEARCH_DELTA_BACKUP_STAGING_RELEASE_AFTER_LEASE_LOSS_2026-08-28.md` | `a856bbce6619818272d0a6b7bebbbf50ad1b6a7083a4acd2eb5b27fac1db8014` | P0-063, P1-035 | Research delta — staged Journal backup release after lease loss — 2026-08-28 |
| `RESEARCH_DELTA_BACKUP_STATE_CONTEXT_PROVENANCE_2026-08-28.md` | `ad638d55f7297bc028acb2ad55fe5c366b9fc5569e077a40b62a8bff9fb0012d` | P0-016, P0-074, P1-177 | Research delta — Journal backup state must be scoped to account/root generation — 2026-08-28 |
| `RESEARCH_DELTA_BACKUP_SUCCESS_NAMESPACE_COVERAGE_GENERATION_2026-08-28.md` | `1e85eb6bac2f94c62d185a5da89ed42f4701283ceebc2003f552f200ab9ab225` | P0-073, P0-074, P1-177, P1-207, P1-211 | Research delta — backup success freshness must be scoped to Yandex namespace generation — 2026-08-28 |
| `RESEARCH_DELTA_CROSS_WAKE_RECOVERY_ARBITRATION_2026-08-28.md` | `5e69df29980893c3477f5a3706734df6029310da2821ca93e49c9b3033096416` | P0-063, P1-043, P1-064, P1-173, P1-192, P1-208 | Research delta — cross-wake recovery arbitration — 2026-08-28 |
| `RESEARCH_DELTA_DIRECT_ROOT_CHANGE_SCHEDULER_RECONCILIATION_OBLIGATION_2026-08-28.md` | `3d4e4a61b82ff2f6e2d77bbcea6f4f5ec29d60bf6ea7ff5fb7dd608979fe43c8` | P0-074, P1-008, P1-157, P1-177 | Research delta — direct root change scheduler reconciliation obligation — 2026-08-28 |
| `RESEARCH_DELTA_JOURNAL_BACKUP_TRANSIENT_MOVE_STATE_2026-08-28.md` | `846bf5daf246be7ef7f487ee0ae4439a664c308099b17d50a0c3a2cd385c75e2` | P0-022, P0-074, P0-076, P1-090, P1-190, P1-198 | Research delta — Journal backup vs transient ReadLater move recovery state — 2026-08-28 |
| `RESEARCH_DELTA_OFFSCREEN_PARTIAL_RESTORE_STAGING_CLEANUP_2026-08-28.md` | `c5ebd24242647612f91473bf34228754c2728eaa4873ebd18dcbaeb99f90fbfc` | P0-063, P1-035, P1-069 | Research delta — offscreen partial restore staging cleanup — 2026-08-28 |
| `RESEARCH_DELTA_RECOVERY_CAPACITY_STORAGE_ADMISSION_2026-08-28.md` | `66f9a91fc5f72ee61246c0233cf31f3e316283e0428d5aba6bb3ca3087a96862` | P0-013, P0-039, P0-048, P0-065, P0-073, P0-074, P0-079, P1-035, P1-043, P1-054, P1-146, P1-156, P1-169, P1-173, P1-184, P1-194, P1-197, P1-198, P1-205, P1-210, P1-211 | Research delta — recovery capacity / storage-admission matrix — 2026-08-28 |
| `RESEARCH_DELTA_REMOTE_CHECKPOINT_ATTEMPT_AGE_INHERITANCE_2026-08-28.md` | `16ab57552dba5f3ef09a115dc28cce571e783b8617a983f4f7a1bbbdcf633025` | P0-073, P0-074, P0-079, P1-184, P1-198, P1-211 | Research delta — remote checkpoint attempt-age inheritance — 2026-08-28 |
| `RESEARCH_DELTA_REMOTE_CHECKPOINT_FALSE_ADMISSION_RECEIPT_2026-08-28.md` | `f20ebb73a5e76af8da386eae521460656a9ec7b26a2d2218dfbcc2b9c61b0cf3` | P0-073, P0-074, P0-076, P0-078, P0-079, P1-184, P1-198 | Research delta — remote checkpoint false admission receipt / archive reactivation — 2026-08-28 |
| `RESEARCH_DELTA_REMOTE_RECOVERY_PHASE_FAIRNESS_2026-08-28.md` | `f33d02aeedec721b370cd38dc87da035afd6d82ded65fd8deb2c6935a90096ac` | P0-074, P0-076, P1-064, P1-184, P1-195, P1-196, P1-208 | Research delta — pending remote-save phase fairness — 2026-08-28 |
| `RESEARCH_DELTA_REMOTE_STALE_CLEANUP_REACTIVATION_2026-08-28.md` | `aa3c8658584ff37f5ab3e0d40efc39d8df95d954d381ac19771ee2e72054a577` | P0-073, P0-074, P0-076, P0-079, P0-080, P1-184, P1-208 | Research delta — remote stale cleanup vs reactivation generation — 2026-08-28 |
| `RESEARCH_DELTA_REMOTE_STALE_CLEANUP_REACTIVATION_CAS_2026-08-28.md` | `501d0542444b5e709e7c2ef676cd13014cd00e510ec970c540c5f6300c11cd0c` | P0-074, P1-043, P1-173, P1-184, P1-211 | Research delta — stale remote-checkpoint cleanup vs retry reactivation CAS — 2026-08-28 |
| `RESEARCH_DELTA_REMOTE_STALE_EVIDENCE_RETENTION_2026-08-27.md` | `22f2e5b55fc3da525ff3eaa060dd35e602c825d94320b4174a5284d500b4c2ef` | P0-039, P0-073, P0-074, P0-076, P0-079, P1-184, P1-194 | Research delta — remote stale-evidence retention / unknown-settlement tombstone — 2026-08-27 |
| `RESEARCH_DELTA_USER_SETTINGS_SCHEDULER_RECONCILIATION_GENERATION_2026-08-28.md` | `1f56c0c837ad8d5cb404fd019742c222606953cc79f432a0028aa5155508eaea` | P0-074, P1-008, P1-157, P1-177, P1-210 | Research delta — user-settings marker vs scheduler generation reconciliation — 2026-08-28 |
| `RESEARCH_DELTA_YANDEX_REMOTE_CHECKPOINT_GENERATION_2026-08-27.md` | `abbd52987ab733a83b49f7d87e91dc5f709bb824841ca2653091a6adf114d431` | P0-073, P0-074, P0-076, P0-078, P0-079, P0-080, P1-184, P1-198, P1-201 | Research delta — Yandex remote-save checkpoint generation ownership — 2026-08-27 |

## Lossless source transcripts

The sections below preserve the original UTF-8 Markdown text verbatim. Historical statements remain evidence, not independent current status authority; `RESEARCH_REGISTRY.md` controls status/ownership.
## Retired source: `RESEARCH_DELTA_BACKUP_PENDING_ACCOUNT_OBJECT_IDENTITY_2026-08-28.md`

SHA-256 of UTF-8 source text: `35ccad93428a21bd9e6c97bc291716f11d70b9b988f0f57f0a8874c58c9ba8fb`

# Research delta — backup pending account/object identity (2026-08-28)

## Scope

Docs-only continuation of the deep research against `main` starting from commit `195d53de0d6918e80de19ce231effccae14f85c7` and current `service-worker.js` blob `9c81d080051ee14d468b78c575dcd9f21ecda803`.

No new P-number is assigned. This delta refines **P0-073**, **P0-074** and **P1-184** for Journal backup recovery.

## Finding

`uploadJournalExportStagedToYandex()` durably writes `JOURNAL_BACKUP_PENDING_KEY` before the signed upload, but that pending receipt contains only operation/path/time/size/export metadata:

- `phase`
- `operationId`
- `remotePath`
- `filename`
- `monthFolder`
- `createdAt`
- `attemptCount`
- `expectedBytes`
- `entryCount`
- `exportedAt`
- `reason`

It does **not** bind the physical attempt to the immutable Yandex account UID, auth/config generation, root generation, or a pre-transfer object/content identity receipt.

`recoverPendingJournalBackup()` later evaluates that receipt under the *current* Yandex context. It calls `ensureYandexServiceFolders({ includeBackup: true })`, checks that the old textual `remotePath` is inside the current `journalPath`, then accepts a current-account object after `GET /resources` when it is a file and its byte size equals `pending.expectedBytes`.

Therefore account/root path containment is not object provenance.

### Deterministic cross-account schedule

1. Account A, root `/WebClips`, prepares backup `P` at `/WebClips/Backup/Journal/MM-YYYY/F.json`; `P.expectedBytes = N` is durably stored.
2. Signed transfer settlement becomes unknown to the worker, so `P` remains pending.
3. User disconnects A and authenticates account B. B happens to use the same textual root `/WebClips`.
4. B contains an unrelated file at the same `remotePath` with byte size `N` (or the path is populated independently before recovery).
5. `recoverPendingJournalBackup()` builds the current B `journalPath`; textual containment succeeds.
6. `GET /resources` in B returns `type=file,size=N`.
7. Recovery promotes the old A checkpoint to `remote-verified`, and `exportJournalBackupToYandex()` can commit `journalBackupState.lastSuccessAt/lastRemotePath` as though A's unresolved attempt had been proven.

The receipt has silently crossed account generations.

The same root cause remains even without an account switch: **path + exact size is not exact physical object/content identity**, already covered generally by P1-184. Backup recovery must not be a weaker special case.

## Required contract

A prepared Journal-backup receipt must carry an immutable operation context at admission, at minimum:

- locally issued backup-attempt generation / receipt id;
- Yandex account UID generation;
- normalized root path + root/config generation;
- source Journal revision represented by the staged snapshot;
- expected byte size;
- stronger content/creation proof required by P1-184;
- once first trustworthy verify succeeds, the stable remote `resourceId` (if the real API/E2E establishes its semantics).

Recovery must revalidate the current authenticated account and root/config generation against that exact receipt **before** adopting or mutating a remote object. A mismatch is a visible deferred/fail-closed state; it must not consume, relabel, or overwrite the old receipt.

`remote-verified` must mean that the exact physical/content outcome for that backup generation was proven in its original account/root namespace. A same-path/same-size object in another account is not recovery evidence.

## Acceptance cases

1. A prepared receipt from account A cannot be recovered while authenticated to B, even when root/path/size are identical.
2. Root generation change cannot rebind an unresolved receipt merely because its textual path remains syntactically inside the new root.
3. A same-size unrelated object at the expected path remains unresolved and does not update global backup success state.
4. A proved exact object in the original account/root can be promoted once and used to complete backup-state commit after worker restart.
5. Re-authentication back to the original account may resume the retained receipt; the mismatch itself must not destroy evidence.

## Classification

- **P0-073**: immutable account/root fencing for remote completion/recovery.
- **P0-074**: operation-scoped Yandex auth/config generation.
- **P1-184**: exact remote object/content proof; path+size is insufficient, including Journal backup.

No new blocker is needed.

## Validation note

Documentation only. Runtime/tests/manifest are unchanged. No product test suite was rerun; historical gate remains 88/88 JS syntax + 74/74 deterministic tests PASS until a real rerun is performed. No build/tag/release was created.

## Retired source: `RESEARCH_DELTA_BACKUP_PENDING_CONTEXT_SWITCH_EVIDENCE_RETENTION_2026-08-28.md`

SHA-256 of UTF-8 source text: `68e68356c86eedf5f996bd10bde602da3dbe5cda098ebfbb8787bed248f23d4b`

# Research delta — pending Journal backup context switch must retain recovery evidence — 2026-08-28

Source-of-truth `main` before this checkpoint includes `73e7774579eb186886ddeb709e8e6c8ec216171a`.

Docs-only research checkpoint. Runtime/config/tests/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh proof refines **P0-074**, **P1-047** and **P1-194**. It composes with backup status context provenance but is a stronger recovery-evidence issue: current code can permanently delete the only durable checkpoint for an old physical backup attempt merely because the user changed the current root/account context.

## Prepared backup checkpoint does not capture Yandex context

`uploadJournalExportStagedToYandex()` currently persists `webclipJournalBackupPendingUpload` before signed upload with fields equivalent to:

- `phase: prepared`;
- textual `operationId`;
- `remotePath`;
- `filename`;
- `monthFolder`;
- `createdAt` / attempts;
- exact expected bytes;
- entry count / export date;
- reason.

The pending record shown in current source does **not** contain:

- verified Yandex account UID;
- normalized root path as a separately bound context value;
- auth/config generation;
- immutable Yandex operation context receipt.

`remotePath` alone is not a complete account/root authority receipt.

## Recovery interprets the checkpoint under current config

`recoverPendingJournalBackup()`:

1. reads the singleton pending record;
2. calls `ensureYandexServiceFolders({ includeBackup:true })` using current auth/config;
3. derives current `structure.journalPath`;
4. normalizes the old `pending.remotePath`;
5. if that old path is not contained in the **current** Journal root, it immediately removes `JOURNAL_BACKUP_PENDING_KEY` and logs it as an invalid checkpoint.

This conflates two very different states:

- malformed/untrusted checkpoint that never described an admitted WebClip backup;
- valid checkpoint from an earlier account/root generation that no longer matches current settings.

Only the first is grounds for destructive cleanup of evidence.

## Deterministic root-switch evidence-loss schedule

1. Backup A is admitted under root `RA`.
2. A obtains upload URL and WebClip durably stores PREPARED checkpoint `C_A` pointing to `RA/Backup/Journal/.../A.json`.
3. Signed upload starts or physically completes, but page/worker loses the terminal result before `remote-verified` / success-state finalization.
4. User changes configured root to `RB` before the next recovery pass.
5. New worker calls `recoverPendingJournalBackup()` under current root RB.
6. `C_A.remotePath` is outside `RB/Backup/Journal`.
7. Current code deletes `C_A` as “incorrect”.
8. Recovery returns `null`, allowing the new backup flow to create a fresh backup B under RB.
9. A may still exist physically, but WebClip discarded the only durable operation metadata needed to prove/reconcile that fact.

The extension has converted `old context / unresolved physical result` into `no pending backup` without proof.

## Account switch is more severe

If the textual root is identical across two Yandex accounts, path containment can even succeed while recovery queries **account B** for a checkpoint created under account A.

Because the checkpoint lacks captured account UID/generation, current recovery cannot reliably distinguish:

- A file missing in original account A;
- querying the wrong current account B;
- same textual path occupied by an unrelated object in B.

Thus both mismatch branches are unsafe:

- different root can cause premature evidence deletion;
- same root across changed account can cause recovery against the wrong namespace.

P0-074's immutable Yandex operation context is mandatory for backup checkpoints too.

## `remote-verified` does not justify deletion either

A `remote-verified` checkpoint records a stronger historical fact: WebClip previously verified the remote backup and intentionally retains the checkpoint until `journalBackupState` success commit.

Changing current root/account after that verification cannot revoke the historical fact or make the checkpoint malformed. If current recovery cannot access the original context, the proper state is unresolved/context-unavailable, not evidence deletion.

## Required context-bound checkpoint

Before any external upload attempt, durable backup checkpoint should bind at least:

- immutable backup generation / worker-issued operation receipt;
- verified account UID and account/auth generation;
- normalized root path and config generation;
- exact `remotePath`;
- expected bytes and staged export/content revision receipt;
- phase (`prepared`, transfer outcome unknown, `remote-verified`, local-success-commit pending, etc.);
- remote resource/object receipt once verified.

Recovery then compares captured context A with current context B.

### If contexts match

Reconcile normally against the exact captured object/path.

### If contexts differ but original context is still accessible

Implementation may explicitly reconcile A under its captured account/root receipt if product/auth model safely supports it.

### If original context is unavailable

Move/retain the checkpoint as bounded quarantined/dead-letter evidence:

- do not claim failure/non-existence;
- do not use it as authority against current account B;
- do not delete it merely to free the singleton active slot;
- expose enough diagnostics/manual resolution state;
- allow current-context backup B under an explicit separate generation if product policy chooses, without pretending A was disproven.

This parallels other project's stale/unverified evidence retention contracts.

## Capacity must not force evidence destruction

The singleton active checkpoint currently blocks new backup creation until recovery decides it can proceed.

Fixing context provenance must not replace evidence loss with permanent global lockout.

A suitable model is:

- active checkpoint for current/reconcilable generation;
- bounded archived/quarantined checkpoints for old-context unresolved attempts;
- explicit caps/retention/manual resolution consistent with P1-194 durability classification;
- no automatic conversion of `unknown` into `failed/not-created` solely from context switch or wall-clock age.

## Relationship to backup state context provenance

The sibling backup-state context delta covers terminal historical `lastSuccessAt/lastRemotePath` being mixed into current status/scheduler.

This checkpoint covers **pre-terminal recovery evidence**.

Both need the same account/root/config generation receipt, but their consequences differ:

- status provenance can delay/misreport current backup health;
- pending-checkpoint context loss can destroy the only evidence for an actual physical side effect.

## Required regressions

1. PREPARED A under root RA -> switch to RB before recovery -> A checkpoint is retained/quarantined, not deleted as malformed.
2. Signed upload A physically succeeds -> response lost -> root switch -> later recovery preserves A evidence even if current context cannot verify it.
3. `remote-verified` A -> switch root before local success-state commit -> verified evidence remains and is not erased.
4. Account A/root X checkpoint -> switch to account B/root X -> recovery cannot query B and treat B's namespace as A.
5. Same path exists in B with same byte size -> B object cannot satisfy A checkpoint without captured account/object proof.
6. Switch back to the exact original account/root generation while evidence is retained -> recovery may reconcile A normally if receipt is still valid.
7. Malformed path that never passed original admission remains distinguishable and may still be rejected/cleaned.
8. Old-context unresolved A does not permanently prevent an explicitly admitted independent backup B under current context; both generations retain truthful state.
9. B success does not overwrite/archive A evidence as if A failed.
10. Bounded retention/capacity does not silently delete `unknown physical result` without an explicit durability policy/manual-resolution record.

## Duplicate check / numbering

No new item is created.

- **P0-074** supplies immutable account/root/auth/config operation context.
- **P1-047** owns backup PREPARED -> remote-verified -> local success recovery lifecycle.
- **P1-194** owns truthful durability classification/retention of unresolved recovery evidence.
- P1-177 remains scheduler policy and is not the primary owner here.

## Test / release state

Docs-only checkpoint. Product tests were not rerun. Historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** remains previous evidence only. Real root/account-switch + interrupted Yandex backup E2E remains required. No build, tag or Release was created.

## Retired source: `RESEARCH_DELTA_BACKUP_PENDING_GENERATION_MULTIPLICITY_2026-08-28.md`

SHA-256 of UTF-8 source text: `79161d15093ef4ee0865f8ea56f4620cbd39c293b10b9e80fa4fd4a443536fd7`

# Research delta — Journal backup pending-generation multiplicity — 2026-08-28

Source-of-truth `main` immediately before this write: `f14330969bf5e3a78fbfb4e11967bf8071096746`.

Docs-only research checkpoint. Production runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

This block refines the already established composition of **P1-052** (unknown backup upload settlement evidence), **P0-073/P0-074** (namespace/operation generation), **P1-184** (exact remote content/object proof), and **P1-207** (exact source Journal revision covered by a backup).

The fresh architectural conclusion is that the current singleton backup pending key cannot represent the required state once the existing findings are fixed correctly. A correct design must support **multiple independently addressable backup attempt generations** or an equivalent active/archive model.

No new P-number is needed because multiplicity is the storage-model consequence of preserving already-known unresolved physical generations.

## Current storage model is one global slot

Current runtime defines one key:

`JOURNAL_BACKUP_PENDING_KEY = 'webclipJournalBackupPendingUpload'`.

All prepared/verified/recovered backup checkpoint mutations serialize on the same Chrome Storage queue key and then execute either:

- `chrome.storage.local.set({ [JOURNAL_BACKUP_PENDING_KEY]: pending })`; or
- `chrome.storage.local.remove(JOURNAL_BACKUP_PENDING_KEY)`.

This correctly serializes late Chrome Storage settlement for the singleton. It does **not** make the singleton capable of representing more than one physical backup attempt.

## Current workflow avoids coexistence by deleting/consuming the old slot

Before starting a new backup, recovery reads the singleton pending object.

For a prepared checkpoint that repeatedly returns 404, current code eventually removes the key after the grace/attempt threshold and then later workflow can create a new timestamped backup.

P1-052 already establishes that this removal is unsafe: repeated 404 + time is not authoritative proof that the old signed PUT did not settle.

Once P1-052 is fixed by retaining the old unresolved generation, the singleton becomes a hard data-model conflict:

- keep A in the only slot -> no place to checkpoint a newly allowed B;
- overwrite the slot with B -> destroy A's exact recovery identity;
- encode both ad hoc in one object -> effectively reinvent a bounded generation collection without explicit lifecycle/CAS semantics.

## A new backup can legitimately coexist with an unresolved historical attempt

The product need not block all backup forever merely because a historical physical attempt cannot currently be reconciled.

Examples already required by existing researchs:

### Namespace change

Attempt A belongs to account/root generation A/R1 and becomes unresolved. User intentionally configures current B/R2. The new namespace may need a current backup while A/R1 remains retained as historical unresolved evidence.

The existing backup namespace research explicitly requires that a new B/R2 generation must not erase A/R1.

### Explicit duplicate-accepting policy

P1-052 permits a future product policy where a new timestamped backup is created even though an older upload outcome remains unknown, **provided the old unresolved identity is retained** and the duplicate risk is represented truthfully.

Again, this requires two generations to coexist.

### Source revision follow-up

P1-207 requires source revision A to remain associated with its historical uploaded object while current Journal revision B can remain backup-due. A follow-up backup for B may start while reconciliation/history for A still exists.

## Lease does not solve checkpoint multiplicity

The atomic Journal backup lease is a valuable positive control: it prevents two active backup builders from simultaneously acquiring the ordinary backup critical section.

But the lease is about **concurrent execution ownership**, not historical physical attempt storage.

After operation A ends/crashes/loses usable auth, its unresolved remote receipt may need to persist for days. A later operation B can correctly acquire the lease while A remains archival/reconciliation state.

Making the lease remain occupied until every historical unknown is solved would turn recovery evidence into a permanent availability lock. Deleting the evidence to free the lease would violate P1-052.

Therefore execution lease and attempt-generation storage must remain separate concepts.

## Required generation-aware storage model

Use a bounded durable collection keyed by a random backup attempt generation, or an equivalent active + unresolved archive representation.

Each generation should carry at minimum the already required receipts:

- random local backup attempt generation;
- operation receipt;
- phase (`prepared`, transfer-started/unknown, remote-verified, state-committed, stale-unverified/manual, etc.);
- account UID/root/config/auth operation context;
- exact remote path;
- source Journal revision from P1-207;
- exact staged export generation/content digest/expected bytes;
- remote object/content receipt when verified;
- created/attempt/reconciliation timestamps and bounded diagnostic state.

The scheduler may designate at most one current active generation per current policy/lease, but historical unresolved generations remain independently addressable.

## Compare-and-mutate is required

Moving from one singleton key to a collection is not sufficient by itself.

Every phase transition/delete/archive operation must prove the exact generation it is updating. A late A write must not:

- overwrite B;
- clear B because it believes the singleton belongs to A;
- mark B `remote-verified` using A metadata;
- consume B's source revision or remote path.

The existing Chrome Storage late-settlement serialization can remain an implementation primitive, but generation CAS/identity is still required above serialization.

## Bounded retention without false negative settlement

Multiple unresolved attempts require capacity policy. Follow the same evidence principle as pending remote saves/local downloads:

- active generations have a small hard admission cap;
- new optional backup may be rejected/deferred when safety capacity is full;
- unresolved old generations may move to compact archival/dead-letter form;
- archive pressure may discard expensive body/staging resources when ownership ends, but must retain enough compact identity to avoid converting `unknown` into `did not happen`;
- any final evidence eviction must be explicitly represented as evidence unavailable, not remote absence.

Do not solve multiplicity by restoring the current repeated-404 deletion heuristic.

## Success-state interaction

A `remote-verified` generation A may update backup history only with its own:

- namespace;
- source Journal revision;
- remote object receipt;
- scheduler/settings generation reconciliation.

It must not consume or delete a distinct newer B checkpoint merely because the singleton housekeeping path historically removes one global pending key after success.

Housekeeping should remove/archive by exact generation.

## Required regressions

1. A prepared upload has unknown settlement -> policy permits B -> B obtains a distinct checkpoint; A remains independently reconcilable.
2. A/R1 unresolved -> switch current config to B/R2 -> B backup succeeds; A/R1 receipt survives and is not queried under B.
3. B completes first -> success housekeeping removes/archives only B, not A.
4. A later verifies -> historical A result cannot overwrite current B success/source-revision state; it is recorded under A's exact namespace/revision semantics.
5. Late Chrome Storage write for A settles after B checkpoint creation -> cannot replace B.
6. Old A recovery returns 404 -> counters/status update only A generation.
7. A is `remote-verified` but backup-state commit crashes -> B may not consume A's verified receipt or vice versa.
8. Two generations reference equal textual path/size in different accounts -> namespace/generation keeps them distinct.
9. Two generations happen to reference same source Journal revision -> still separate physical attempts/content receipts.
10. Active-generation capacity reached -> new backup is deferred/rejected without evicting unresolved identities.
11. Archive compaction retains enough generation/path/namespace/content identity to avoid false negative claims.
12. Normal case with no unresolved history behaves as one ordinary active backup and preserves existing lease behavior.

## Duplicate check

- **P1-052** is the primary unknown-settlement preservation owner.
- **P0-073/P0-074** define per-generation Yandex namespace/context.
- **P1-184** defines exact remote physical result proof.
- **P1-207** defines exact source Journal revision carried by each attempt.
- Backup lease P0-046 remains execution mutual exclusion and is not repurposed as historical storage.

No new P1-211 is allocated.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build/tag/Release was created.

## Retired source: `RESEARCH_DELTA_BACKUP_RECOVERY_NAMESPACE_2026-08-27.md`

SHA-256 of UTF-8 source text: `59273959cb55af3e4becd5d5456873f1a892c47163288ed98c46d6172231300b`

# Research delta — Journal backup recovery namespace provenance — 2026-08-27

Source-of-truth `main` immediately before this write: `df6b1de638223a53b435f968b83e5d5ac1e8c07f`.

Docs-only research checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof refines the composition of:

- **P0-073** — exact Yandex account/root namespace identity for remote objects and recovery;
- **P0-074** — immutable auth/config/root operation generation across multi-step Yandex work;
- **P1-052** — unknown Journal-backup upload settlement must preserve durable recovery evidence instead of turning repeated 404 into a proven negative;
- **P1-184** — remote object/content proof must identify the exact object/content produced by the exact operation.

Adjacent scheduler/auth dependencies remain **P1-177/P1-196**. This checkpoint does not replace their invalid-token retry/demotion contracts.

The new evidence is backup-specific and is not the already documented backup-picker selection race. The defect exists after an irreversible backup PUT has started and survives MV3 restart because the durable backup checkpoint itself lacks the namespace/generation receipt needed for correct reconciliation.

## Fresh source proof

### 1. Prepared backup checkpoint stores path/size, but no account/root/auth generation

`uploadJournalExportStagedToYandex()` obtains the upload link for the newly chosen backup `remotePath`, then writes `JOURNAL_BACKUP_PENDING_KEY` before the signed PUT.

The current prepared object stores approximately:

- `phase: 'prepared'`;
- textual `operationId`;
- `remotePath`, `filename`, `monthFolder`;
- timestamps / attempt counters;
- `expectedBytes`;
- export `entryCount` / `exportedAt` / reason.

It does **not** store an immutable receipt for:

- Yandex `accountUid`;
- normalized configured `rootPath`;
- auth generation/token identity;
- config/root generation;
- signed-transfer attempt generation;
- strong local backup-content digest/fingerprint;
- remote resource identity/content proof.

Therefore the checkpoint can identify a textual path and expected size, but not the Yandex namespace in which the irreversible upload was actually admitted.

### 2. Recovery resolves current namespace again

`recoverPendingJournalBackup(status, operationId)` reads the durable pending object, then calls:

`ensureYandexServiceFolders({ includeBackup: true, operationId })`.

That helper resolves the **current** Yandex auth/config/root and returns the current `journalPath`.

Recovery then normalizes the old `pending.remotePath` and checks it using:

`isAllowedJournalBackupPath(remotePath, structure.journalPath)`.

The `status` argument does not provide an immutable old operation namespace receipt. It is current scheduler/config state.

Thus recovery of a previously admitted physical upload is retargeted through mutable current account/root state after restart or concurrent reconfiguration.

### 3. Root change can delete the only old recovery identity

If upload A was admitted under root `R1`, its checkpoint contains for example:

`R1/Backup/Journal/08-2026/webclip-journal-....json`.

If the user later changes the configured root to `R2` before recovery, `ensureYandexServiceFolders()` returns the current `R2/.../Journal` branch.

The old A path no longer passes the current-root containment check. Current code treats it as an invalid checkpoint, removes `JOURNAL_BACKUP_PENDING_KEY`, logs that an invalid unfinished-backup checkpoint was discarded, and returns `null`.

This is a provenance bug, not a path-containment bug. The old path may be perfectly valid for the historical operation A; it is merely outside the **new** root generation B.

Consequences:

1. A signed PUT may already have physically settled under R1.
2. The only durable identity needed to reconcile A can be erased merely because configuration changed to R2.
3. The backup flow can then stage/upload a new backup under R2.
4. The R1 object becomes an untracked remote side effect even though WebClip had a checkpoint capable of identifying it before the root change.

P1-052 already forbids destroying unknown-settlement evidence solely from time/404 heuristics. The same preservation rule must apply to configuration/namespace changes.

### 4. Account switch with the same textual root can falsely accept the wrong object

The stronger symmetric case occurs when account changes but textual root/path remains the same.

Schedule:

1. Account A/root R prepares backup checkpoint C for path P and expected byte size N.
2. A's signed PUT has unknown settlement / worker restarts before local success commit.
3. User reauthorizes to account B. B uses the same textual root R.
4. Recovery reads C, but all Yandex calls execute under current account B.
5. B happens to contain an object at textual path P whose reported size is also N.
6. Recovery accepts exact byte-size equality, writes `phase:'remote-verified'`, and returns the object as the recovered result.
7. `journalBackupState.lastSuccessAt/lastRemotePath` can then be advanced as though A's interrupted upload was proven.

The checkpoint contains no accountUid/auth generation allowing recovery to detect that it queried B rather than A.

This can therefore create a false success receipt across accounts even without an attacker and even when path containment is correct.

### 5. Size equality is not content identity

Current recovery verifies `metadata.size` against `pending.expectedBytes`. Exact size is useful corruption evidence but is not a strong content receipt.

Two different JSON backups can legitimately have equal byte length. If a same-path object exists in the newly current account/root, byte-size equality cannot prove it is the exact staged backup whose PUT had unknown settlement.

This is a direct backup manifestation of P1-184: exact remote content/object proof must compose with the exact local content receipt, not only byte count/path.

### 6. Account switch + 404 can destroy A evidence indirectly

If B does **not** contain P, recovery gets 404 under B. The existing P1-052 weakness then increments the prepared-checkpoint retry counters and can eventually delete the checkpoint after the configured grace/attempt heuristic.

Those 404s say nothing about whether A's upload committed in account A. They were queries against the wrong namespace.

Therefore fixing P1-052's repeated-404 policy without namespace binding is insufficient: a retained checkpoint still cannot be reconciled correctly unless it tells recovery which account/root/auth generation owns it.

### 7. Switching back to A cannot reconstruct a deleted receipt

Once the shared pending key is removed while B is current, later reauthorizing to A does not restore the checkpoint. The system no longer knows the exact old path/operation/expected body relation except incidental logs or remote listing.

A later generic list/search cannot safely reconstruct the old operation receipt because filename/path/size are not sufficient content provenance and OperationLog is diagnostic, not durable side-effect authority.

## Relationship to existing backup-picker research

`RESEARCH_DELTA_YANDEX_BACKUP_IMPORT_2026-08-27.md` already proves a multi-step **user selection** race:

- list/select under account A;
- reauth to B;
- later fetch by stale textual path under B.

This checkpoint is different:

- no picker or user-selected backup object is required;
- an irreversible **write** has already been admitted;
- the durable recovery record itself lacks the namespace receipt;
- incorrect behavior survives worker restart and can either erase old unknown-settlement evidence or falsely finalize a different current-account object.

The shared fix primitive should still be the same immutable Yandex operation/namespace receipt rather than two unrelated patches.

## Required unified contract

### Namespace-bound backup generation receipt

Before requesting/using the signed upload side effect, issue a durable backup-attempt generation receipt that binds at minimum:

- random local backup generation / transfer-attempt id;
- worker-issued operation receipt (P1-198 direction where used);
- proven Yandex `accountUid`;
- immutable auth generation/token identity;
- normalized configured `rootPath` + config generation;
- exact intended backup `remotePath`;
- local staged-export generation/key;
- exact expected byte count;
- strong digest/fingerprint of the staged bytes;
- export metadata required to commit `journalBackupState`;
- phase timestamps / retry diagnostics.

Textual `operationId`, path and byte count remain descriptive fields, not sufficient authority.

### Recovery must use the historical namespace receipt

A pending attempt created under A/R1 must be reconciled only against A/R1.

If the required old auth session is no longer available:

- do not retarget the checkpoint to current B/R2;
- do not delete it merely because it is outside current root containment;
- transition/defer it as namespace-unavailable / auth-unavailable while retaining bounded recovery evidence;
- allow the user to reauthenticate/reconcile under the matching namespace or explicitly abandon that generation under a deliberate policy.

A newly configured root/account may start a separate newer backup generation only according to duplicate/unknown-side-effect policy, without overwriting or destroying the older unresolved generation.

### Separate historical containment from current configuration

Path containment must be evaluated against the root captured in the historical attempt receipt, not the mutable current root.

Changing current root must not make a previously valid operation path "malformed". It makes the historical generation non-current for new work, but still valid as reconciliation evidence.

### Strong content/object verification

P1-184 verification for backup recovery must prove that the remote object is the exact content generation that was staged/uploaded.

At minimum, preserve a strong local digest and use the strongest authoritative remote evidence the Yandex API can safely provide. If the API cannot provide a trustworthy remote content hash, design a versioned backup-object receipt/content envelope or another exact-proof strategy; do not silently upgrade `same path + same size` to exact identity.

### Success-state admission

`journalBackupState.lastSuccessAt`, `lastRemotePath`, entry count and background success diagnostics may advance only from a recovery receipt that proves:

- exact historical namespace/account/root generation;
- exact backup attempt generation;
- exact intended object/content result;
- current local scheduler/config generation may differ, but that difference is represented rather than silently retargeting the old attempt.

A recovered historical A/R1 upload may be recorded as historical success while current config is B/R2, but must not be misrepresented as a successful B/R2 backup or used to reschedule stale policy without a current-generation check.

### Scheduler/config composition

After a success/failure/recovery result, scheduling decisions must fresh-check the current backup settings generation. A stale operation snapshot must not re-enable periodic/retry alarms after the user disabled backup or changed policy. This is the scheduler consequence already adjacent to P0-074/P1-177; no new number is created here.

## Deterministic regression matrix

1. A/R1 prepared checkpoint -> unknown PUT -> switch root to R2 -> recovery retains A/R1 generation; it is not deleted as invalid merely because current root is R2.
2. Same schedule -> current R2 starts a new permitted backup generation -> A/R1 unresolved receipt remains independently diagnosable and cannot be overwritten by one global pending key.
3. Account A/root R unknown upload -> switch to B/root R with no object -> B 404 does not increment evidence as though A was queried and cannot erase A checkpoint.
4. A/root R unknown upload -> B/root R contains same path and same byte length with different content -> recovery rejects B as proof for A.
5. A/root R unknown upload -> B/root R contains exact same bytes coincidentally -> account namespace mismatch still prevents using B object as A receipt.
6. Reauthenticate matching A later -> retained A generation can be reconciled against A without reconstructing identity from logs/filename.
7. Historical A object is proven -> success state records the correct historical namespace/generation and does not claim current B/R2 was backed up.
8. Current config changes during recovery network request -> late result is fenced to the captured historical attempt; it cannot mutate a newer attempt/current namespace row.
9. Two physical backup attempts for the same intended Journal snapshot remain separate generations; one late verification cannot consume/overwrite the other.
10. Equal-size different staged backups have different content receipts and cannot be interchanged.
11. Repeated 404 in the correct historical namespace remains P1-052 unknown-settlement evidence; time/attempt count alone never becomes authoritative non-creation proof.
12. User disables automatic backup while an older attempt finishes -> current settings generation prevents stale periodic/retry alarm resurrection.
13. MV3 restart with unresolved historical namespace and unavailable matching auth -> checkpoint remains bounded/deferred, not silently retargeted to current auth.
14. Pressure/retention policy remains globally bounded; unresolved generations cannot grow without limit, but eviction must preserve enough dead-letter identity to avoid falsely declaring remote absence.

## Duplicate check / numbering

No new number is created.

- **P0-073** owns exact account/root namespace identity.
- **P0-074** owns immutable auth/config/root operation generation.
- **P1-052** owns preservation/reconciliation of unknown Journal-backup upload settlement.
- **P1-184** owns exact remote object/content proof.
- **P1-177/P1-196** remain scheduler/auth-demotion dependencies.

Do not assign a new P0/P1 solely for this backup manifestation.

## Test / release state

No runtime/config/manifest change was made. Product tests were not rerun for this docs-only checkpoint. The historical product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**; real Yandex account/root-switch + unknown-upload recovery remains release QA.

## Retired source: `RESEARCH_DELTA_BACKUP_RESTORE_AUTHORITY_SWITCH_TO_STAGING_2026-08-28.md`

SHA-256 of UTF-8 source text: `046c26299230844387b7364c697bbbd6b3a5187f5e06eba1ca2380397a39ae6d`

# Research delta — Yandex backup restore authority switches from remote object to staged bytes — 2026-08-28

Source-of-truth `main` immediately before this write: `2adcc852d813ab0c1d85bbda87ecd3c0d27019e6`.

Docs-only research checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

This block records a positive current behavior and an acceptance boundary for existing **P0-013** exact selected backup-object identity, composed with **P1-035** staging lifetime and **P0-076** destructive replace generation.

The selected-object staging research already requires a receipt chain from picker object A through signed download into immutable local staging generation S. Fresh source confirmation shows the later Journal confirmation/replace path already uses S directly rather than re-fetching the Yandex path.

That is the correct authority switch and should be preserved while P0-013 is fixed.

## Positive source proof — fetch returns the staged generation

After signed Yandex download and streaming validation, `fetchJournalBackupFromYandex()` returns fields including:

- `remotePath` for display/provenance;
- `stagingKey: responsePayloadKey`;
- entry count/exported timestamp;
- operation id.

The actual importable bytes are therefore represented by a local staging key once download/inspection succeeds.

## Journal carries the same staging key through confirmation

Journal's Yandex restore flow:

1. receives `fetched.stagingKey`;
2. stores it in page state while opening the dangerous 9-digit confirmation;
3. if user cancels, explicitly discards `fetched.stagingKey`;
4. if user confirms, sends:
   `WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED { stagingKey: fetched.stagingKey, ... }`.

There is no second Yandex `/resources/download` request at Proceed.

This is important correctness: the destructive confirmation refers to the already downloaded/previewed byte generation, not to whatever object might later occupy the same remote path.

## Correct authority transition

Before staging exists, safe authority is:

`picker selection receipt A -> current exact remote object verification -> signed download under A context`.

Once immutable staged payload S has been created and bound to A:

`S` becomes the source bytes for preview and destructive replace.

The remote path/object is then **provenance metadata**, not a mutable pointer that must be dereferenced again at confirmation time.

Conceptually:

`remote object A --download--> staged bytes S --preview/confirm--> Journal replacement`

not:

`remote path P --preview--> wait --re-fetch P--> replacement`.

## Why revalidating current remote object at Proceed can be wrong

Suppose exact P0-013 implementation successfully proves selected object A and downloads its bytes into S. The user then spends several minutes reviewing the preview/confirmation. During that time an external Yandex client replaces/deletes path P.

S has not changed.

If WebClip were to require the current remote path still resolve to A before allowing Proceed, it would unnecessarily invalidate an already exact local byte generation the user reviewed.

Worse, if it re-fetched P and silently replaced S with new object B, the original confirmation/preview would no longer describe the imported bytes.

Therefore remote currentness after staging is not the destructive-import authority.

## What must still invalidate Proceed

Proceed remains valid only while the exact staged receipt S remains valid.

Invalidation conditions include:

- P1-035 staging payload expired/was cleaned or owner lease lost;
- staging manifest/chunk byte count/digest no longer matches S receipt;
- operation/staging generation is stale or belongs to another page/session;
- preview validation generation does not match S;
- current Journal replace-generation policy rejects the destructive action under P0-076;
- imported content fails schema/provenance normalization during the mandatory fresh replace-time validation.

A change to remote path P **after S was correctly bound/downloaded** is not by itself a reason to substitute bytes.

## Fresh validation at replace remains a positive control

Current `WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED` path re-normalizes/revalidates the staged source before commit rather than blindly trusting the earlier preview.

This should remain. It proves current integrity of S; it is not a remote re-fetch.

The ideal final chain is:

1. exact selected remote object receipt A;
2. exact staged bytes receipt S bound to A, including byte count/digest;
3. preview receipt V bound to S;
4. user confirmation generation C bound to V/S;
5. replace-time fresh validation of exact S;
6. P0-076 current Journal destructive CAS;
7. atomic replacement.

## Display semantics

The confirmation may display original `remotePath`, selected file metadata and export timestamp to explain provenance.

It should also conceptually make clear that the operation will restore the **downloaded/validated backup**. If remote object later changes, WebClip does not need to confuse the user by pretending it will follow the path again.

If the staging lease expires, UI should say the downloaded backup expired and requires a fresh selection/download/preview — not silently fetch the path under the old confirmation.

## Cleanup semantics

Cancel discards exact S.

Successful replace should delete/release exact S after commit according to staging lifecycle.

Page crash/owner loss uses P1-035 bounded orphan cleanup. No cleanup operation may rebind the same staging key to different bytes.

## Required regressions

1. Select/prove/download A -> create S -> remote A unchanged -> confirm -> exact S imports normally.
2. Create S from A -> external client replaces path with B before user confirms -> Proceed imports validated S/A bytes, never B, provided S is still valid.
3. Create S -> remote A deleted before confirmation -> valid S can still be imported according to product policy; no path re-fetch is required.
4. Create S -> staging payload expires/cleanup wins -> Proceed fails explicitly and requires fresh download/preview; it never re-fetches P silently.
5. Two staged generations S1/S2 from same remote path remain distinct; confirmation C1 can consume only S1.
6. Remote account/root auth changes after S exists -> no re-fetch under new namespace; S provenance remains historical A while local replace authority is checked separately.
7. Replace-time validation detects corrupted/missing S chunk -> no Journal mutation despite valid old preview.
8. User cancel removes/releases only exact S; another staged generation is unaffected.
9. Page reload cannot inherit S merely from displayed remote path unless exact staging-owner/session recovery policy explicitly grants it.
10. Import provenance sanitization remains mandatory; exact selected remote object does not make backup contents privileged/local.
11. P1-035 owner lease protects active S or UI explicitly expires it; raw two-hour wall clock cannot leave enabled Proceed pointing at deleted bytes.
12. P0-076 stale current-Journal generation can reject replace even though S remains valid; S validity and Journal mutation authority are separate.

## Duplicate check

- **P0-013** owns exact selected remote backup object through the download handoff.
- **P1-035** owns exact staging generation lifetime/owner cleanup.
- **P0-076** owns destructive current Journal replace generation.
- This checkpoint is intentionally a positive architecture boundary: once P0-013 has safely produced S, do not reintroduce mutable path authority later.

No P1-211 is created.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains **88/88 syntax + 74/74 deterministic PASS**. Real Yandex exact object/version semantics remain E2E work. No build/tag/Release was created.

## Retired source: `RESEARCH_DELTA_BACKUP_SCHEDULER_GENERATION_2026-08-27.md`

SHA-256 of UTF-8 source text: `22453fc5077219056abd17fdcbf01acfa2fa8f83decb80de8ad5f4174c319b68`

# Research delta — Journal backup scheduler/settings generation fencing — 2026-08-27

Source-of-truth `main` immediately before this write: `e6cf3e7c8981d4f372fd142a91713b3b1d0f4079`.

Docs-only research checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical registry synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof refines:

- **P1-177** — backup scheduler must enter a real paused/no-auth/disabled state and not keep/resurrect obsolete alarms;
- **P0-074** — long Yandex/config-dependent operations must not publish scheduling/verification decisions from stale settings generations.

Adjacent: **P1-196** for authoritative invalid-token demotion and **P1-178** for auth generation. The finding below reproduces without OAuth failure: ordinary Settings disable/interval change while a backup is already running is sufficient.

## Positive control — settings change normally rebuilds alarms

`saveJournalBackupSettings(settings)` serially updates `yandexConfig` and then calls:

`initializeJournalBackupScheduler('settings-change')`.

For non-worker-start initialization, the scheduler clears both periodic and retry alarms before applying current settings. If current `status.enabled` is false, it returns without scheduling new work.

That is the correct immediate reaction to a settings change.

The defect is that an older in-flight backup can publish a later scheduling mutation from its stale status snapshot after this cleanup has already completed.

## Fresh source proof

### 1. Backup operation snapshots status before long work

`exportJournalBackupToYandex()` acquires its lease and then assigns current backup status to local `status`.

That status contains at least current:

- enabled policy;
- interval/retry minutes;
- root/config state;
- last success/failure/attempt state.

The operation can then perform recovery, full Journal staging, folder work, signed upload, metadata verification and durable success/failure commits before terminal housekeeping.

No immutable backup-settings generation is captured and no final current-policy compare is performed before alarm scheduling.

### 2. Success housekeeping trusts the old `status.enabled`

After a newly uploaded or recovered backup is durably recorded as success, the flow calls:

`finalizeJournalBackupSuccessHousekeeping({ successAt, status, operationId })`.

That helper:

1. clears the pending checkpoint;
2. clears retry alarm;
3. if `status?.enabled`, calls `scheduleNextPeriodicBackup(successAt, status.intervalMinutes)`.

`status` is the old operation snapshot, not a fresh read performed after the long operation settled.

### 3. Failure path has the same stale scheduling authority

In the catch path, after recording failure state, current code checks:

`if (status?.enabled && isBackground && error?.code !== 'JOURNAL_BACKUP_BUSY')`

and then calls:

`scheduleBackupRetry(failureAt, status.retryMinutes)`.

Again the decision and retry interval come from the stale operation-local status snapshot.

### 4. Disable race can resurrect an alarm after Settings cleared it

Deterministic schedule:

1. automatic backup A starts while policy generation G1 has `enabled=true`;
2. A snapshots `status.enabled=true` and old interval/retry values;
3. user opens Settings and disables automatic backup, committing generation G2 with `enabled=false`;
4. `initializeJournalBackupScheduler('settings-change')` clears periodic + retry alarms and returns disabled;
5. A settles later;
6. success path sees stale G1 `status.enabled=true` and creates a new periodic alarm, or failure path creates a retry alarm;
7. persistent Chrome alarm state now contradicts current disabled settings G2.

Serialized alarm mutation prevents physical create/clear overtaking for one alarm name, but it cannot make the later stale G1 create logically valid. The stale create occurs **after** the correct G2 clear.

### 5. Interval/retry changes have the same generation problem

The user need not disable backup.

If G1 has interval/retry values I1/R1 and Settings commits newer G2 values I2/R2 while A is active, late A success/failure can schedule using I1/R1.

The next alarm handler re-reads current status and may self-correct some cases, but until that wake the durable alarm time does not represent current user policy. It can wake far too early or too late.

A scheduler contract should not rely on a stale alarm firing later in order to repair itself.

### 6. `worker-start` disabled fast path does not clean stale alarms

`initializeJournalBackupScheduler('worker-start')` begins with current status and, when `!status.enabled`, returns immediately with `{ enabled:false, lightweight:true }`.

It does not inspect/clear periodic or retry alarms in that disabled fast path.

Therefore if an older in-flight completion recreated an alarm after Settings disabled backup, a later worker restart does not proactively reconcile the contradiction. The stale one-shot alarm can remain until its scheduled wake, at which point `runDueJournalBackup()` notices disabled state and skips.

This is bounded rather than an infinite retry storm in the ordinary Settings-disable case, but it violates the explicit disabled scheduler state and causes avoidable future background wake/activity.

P1-177's disconnect case is stronger because disconnect currently leaves enabled preferences and can repeatedly feed retry policy. The same fix primitive should handle both cases.

### 7. `runDueJournalBackup()` current-status check is a useful defense, not sufficient ownership

The alarm handler itself fresh-reads `getJournalBackupStatus()` and skips when disabled or root is unavailable. This prevents a resurrected stale alarm from blindly performing a full backup under disabled policy.

That is a positive control.

However it does not justify creating stale durable alarms:

- disabled means no background backup scheduling should remain active;
- stale interval can trigger unnecessary early wake;
- stale retry alarm can remain after the error condition/policy was superseded;
- relying on future alarm delivery for cleanup complicates P1-177 no-auth pause and MV3 lifecycle behavior.

## Required scheduler-generation contract

### Immutable settings/policy generation

Every backup settings/config mutation relevant to scheduling should advance an immutable generation/receipt covering at least:

- enabled/paused policy;
- interval minutes;
- retry minutes;
- relevant root/config generation;
- auth-availability generation where scheduler admission depends on it.

A long backup operation may retain the generation it was admitted under for diagnostics and physical side-effect reconciliation, but that historical generation does not own future scheduling after current policy changes.

### Terminal result vs future schedule are separate authorities

An old operation may legitimately settle after policy changes. Its remote/local outcome still needs to be recorded/reconciled under its own operation receipt.

But **after** terminal success/failure is known, any creation/clearing of future periodic/retry alarms must use a fresh current scheduler-policy receipt.

Do not infer current scheduling authority from the operation's original `status.enabled` or interval values.

### Compare-and-schedule current generation

Before creating a periodic/retry alarm:

1. fresh-read current scheduler policy/generation;
2. prove it is still enabled and otherwise eligible;
3. compute time from current interval/retry policy;
4. commit the alarm mutation associated with that expected scheduler generation;
5. if generation changed while scheduling, re-evaluate current policy rather than publishing the stale alarm.

Exact implementation may use a serialized current-policy helper, generation marker, or idempotent reconciler. The important invariant is logical generation ownership, not only physical alarm serialization.

### Disabled/no-auth reconciliation

When current scheduler state is disabled or explicitly paused/no-auth:

- periodic and retry alarms must converge to absent;
- `worker-start` should be able to repair unexpected stale alarms without starting heavy backup work;
- explicit Disconnect P1-177 should pause/clear alarms while preserving user interval/enabled preference for later reauth;
- a late physical backup/upload settlement is still reconciled and logged, but cannot re-enable scheduling.

### Alarm payload/state generation

Chrome alarm names are currently stable singleton names. If the design keeps them, the worker must compare current scheduler generation on alarm admission.

Optionally store expected scheduler generation in durable scheduler state accompanying the singleton alarm. Stale alarm delivery then becomes an explicit no-op/repair event rather than being inferred only from timestamps.

## Deterministic regression matrix

1. G1 enabled backup starts -> G2 disables and clears alarms -> late G1 success creates **no** new periodic alarm.
2. Same schedule with G1 failure -> no retry alarm under disabled G2.
3. G1 interval=1 min -> G2 interval=1 day during active backup -> late G1 success schedules according to G2, not G1.
4. G1 retry=1 min -> G2 retry=6 h -> late G1 failure cannot publish 1-minute retry.
5. Settings disable happens between final success-state commit and housekeeping -> housekeeping fresh-checks G2 and leaves scheduler disabled.
6. Settings change happens during alarm create actual settlement -> expected-generation reconciliation produces state matching newest policy.
7. Unexpected stale periodic/retry alarm exists while current settings disabled -> worker-start lightweight reconciliation clears it without heavy backup.
8. Stale alarm delivery after disable remains harmless and does not write a false failure/retry loop.
9. Disconnect while backup active -> old signed transfer may settle/reconcile, but current scheduler remains paused/no-auth and no old completion resurrects alarms.
10. Reauth after paused state -> current generation intentionally rebuilds scheduler exactly once using current preferences.
11. Root/config generation changes while old backup settles -> old operation result remains historical, while future alarm scheduling uses current root/config policy.
12. Two extension pages rapidly save backup settings -> actual alarm state converges to the latest committed settings generation.

## Duplicate check / numbering

No new P-number is created.

- **P1-177** remains primary scheduler pause/disable/no-auth owner.
- **P0-074** supplies generation consistency for config-dependent long operations and their post-operation publication decisions.
- **P1-196/P1-178** remain auth demotion/auth-generation dependencies.

The finding is not P1-173: the issue is not merely a queued Chrome API call waiting too long. It is a logically stale operation publishing future scheduler state after a newer policy mutation already won.

## Test / release state

No runtime/config/manifest files were changed. Product tests were not rerun for this docs-only checkpoint. The historical product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**.

## Retired source: `RESEARCH_DELTA_BACKUP_SELECTED_OBJECT_STAGING_RECEIPT_2026-08-28.md`

SHA-256 of UTF-8 source text: `ca243871ea0df3a61591661a50cec83a89c11a2b0597d2196d4db13ab9896a05`

# Research delta — selected Yandex backup object through staging receipt — 2026-08-28

Source-of-truth `main` immediately before this write: `be45c49ad28c761c70d2aba020c36cd5fdd092ea`.

Docs-only research checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

No new P-number is assigned.

Fresh current-source proof extends **P0-013** from picker-row identity through signed download and local staging. It composes with **P0-074** Yandex account/root/auth generation, **P1-139** picker request ordering, **P1-043** staging storage reservation, imported-provenance controls and replace-import Journal generation **P0-076**.

## Fresh source proof

### 1. Picker still reduces a displayed object to path text

Current Journal picker renders backup metadata but on radio change stores only:

`selectedYandexBackupPath = radio.value`.

Proceed therefore carries no immutable copy of the selected row's size/modified/resource identity/account/root generation.

This remains the existing P0-013 root.

### 2. Worker fetch is path-oriented

`fetchJournalBackupFromYandex(requestedPath, operationId)` normalizes the path, derives current backup structure, checks containment, then requests:

`GET /resources/download?path=<remotePath>`.

It does not current-source re-read exact metadata for the selected object and compare it with the picker selection before requesting the signed link.

### 3. Signed transfer produces staged bytes, but current chain does not preserve selected-object identity

Worker passes the returned signed URL into offscreen `text-download` with a 50 MiB cap. The downloaded response is staged into extension IndexedDB for preview/import.

At this boundary the important correctness fact becomes the **actual staged payload bytes**. A textual remote path is no longer sufficient provenance for those bytes.

Current flow has no selection receipt linking:

`picker object A -> fresh remote metadata A' -> signed download capability -> staged payload generation S`.

### 4. Pre-download metadata verification alone would still need a handoff receipt

The existing P0-013 delta correctly requires a fresh exact metadata comparison before `/resources/download`. This pass clarifies that such a patch is not complete unless the accepted identity is carried into the staged payload/import preview lifecycle.

If the provider permits an object replacement between metadata verification and signed-link generation/use, WebClip must not claim atomic object identity unless Yandex offers a documented conditional/version-bound mechanism.

At minimum the system must know exactly which selected metadata generation was authorized and which local byte generation was downloaded, so residual provider race semantics can be explicit and tested rather than silently collapsed to path.

### 5. Destructive confirmation confirms staged payload, not historical path

The later 9-digit confirmation is valuable user intent before replace-import. But once the network download has happened, the thing the user can safely authorize is the **validated staged payload S and its proven remote-selection receipt**, not merely the path originally clicked in the picker.

If S cannot be proven to derive from selected object A under the accepted provider contract, the preview must identify the mismatch/reselection requirement before destructive replace.

## Required P0-013 receipt chain

### Picker selection receipt

On list/select retain bounded identity for exact object A:

- immutable Yandex operation/account/root/config generation from P0-074;
- normalized path;
- listed size;
- listed modified/revision-like metadata;
- stable resource/object id where API semantics are documented/verified;
- picker list generation P1-139.

### Fresh worker revalidation

Proceed sends the selection receipt, not just path. Worker fresh-reads exact metadata under the same Yandex operation context and compares all authoritative/available identity fields.

Mismatch invalidates selection before signed download side effect.

### Signed-link handoff

The request for `/resources/download` must remain under the same exact account/root/auth operation generation.

If the API exposes a version/object identity that can be bound into conditional download or later response verification, use it. If not, document the residual race and fail closed when post-download evidence contradicts selected receipt.

### Staged payload generation

Offscreen/local staging returns an immutable staging receipt binding:

- staging generation/key;
- exact byte count;
- strong local digest;
- selected remote-object receipt/generation;
- operation receipt;
- schema/preview validation generation.

Do not reconstruct this relation later from path or filename.

### Preview and replace confirmation

The UI preview/confirmation refers to staging receipt S. Replace-import sends S (or worker-owned token for S), not independently supplied remote path/operation text.

P0-076 then validates current Journal replace generation at destructive commit.

### Cleanup/expiry

P1-035 staging lifetime/cleanup must compare the exact S owner generation. Expiring a picker or selected remote object does not allow an old staging key to be rebound to new bytes.

## Deterministic regressions

1. LIST/select A; A unchanged through fresh metadata and download -> S binds A and import succeeds after normal confirmation.
2. A replaced by B with different size before Proceed -> revalidation rejects before signed download.
3. A replaced by equal-size B with different stable resource/revision id -> reject.
4. A replaced after metadata check but before signed-link use; provider exposes version-bound proof -> mismatch/rejection according to documented contract.
5. Same residual window where provider exposes no stable conditional proof -> implementation records/handles limitation conservatively; path equality is never claimed as exact-object proof.
6. Signed response bytes differ from expected/verified content receipt where detectable -> S is rejected, no replace.
7. Reauth A->B with same root/path between list and Proceed -> P0-074 invalidates selection before B fetch.
8. Root change invalidates selection; no automatic retarget to new root.
9. Late old picker list response cannot create a valid selection receipt under newer list generation.
10. Preview shows validated S; remote path changes afterward -> confirmed replace still consumes only already validated S, not a re-fetch by path.
11. Staging S expires/cleanup wins before confirmation -> Proceed fails explicitly; it cannot regenerate/re-fetch path silently under old confirmation.
12. Two staged imports for same remote path remain distinct staging generations/digests and cannot consume each other.
13. Imported Journal provenance checks remain applied to every entry inside S; exact remote-object identity does not make backup contents trusted authority.
14. 50 MiB persistent staging participates in P1-043 global reservation before materialization.

## Numbering result

No new item. **P0-013** remains primary owner. P0-074/P1-139/P1-043/P1-035/P0-076 remain required composition layers.

## Test / release state

No product tests were rerun. Historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** remains prior evidence only. Real Yandex selected-object/version semantics still require E2E characterization. No build, tag or Release was created.

## Retired source: `RESEARCH_DELTA_BACKUP_SOURCE_REVISION_RECOVERY_CHAIN_2026-08-28.md`

SHA-256 of UTF-8 source text: `fd9581feae2295cea5d2e5f40628456bf6de63f14e8b7cab6c993fed525354d6`

# Research delta — backup source revision through crash recovery — 2026-08-28

Source-of-truth `main` immediately before this write: `d5e7c430132518088e0871840676fc0f7dc12cf9`.

Docs-only research checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

No new P-number is assigned.

Fresh source proof refines **P1-207**: the coherent Journal revision proved during backup staging is lost before the durable remote-upload checkpoint is created, so a restart/recovery path cannot know which Journal revision a successfully recovered remote backup covers.

This composes with **P0-073/P0-074** namespace generation, **P1-052/P1-184** unknown remote settlement/object proof and scheduler generation **P1-177**.

## Fresh source proof

### 1. Export build proves a coherent Journal revision

`stageFullJournalExportOnce(buildDeadline)` reads `revisionBefore`, streams/builds the staged export, then reads `revisionAfter`.

If they differ it throws `JOURNAL_CHANGED_DURING_EXPORT` and the bounded caller may retry.

Thus when staging succeeds, WebClip has actually proven a valuable fact: the staged bytes represent one accepted Journal revision A.

### 2. The staging return value drops that proof

After the equality check, the function returns only approximately:

`{ stagingKey, chunkCount, totalChars, totalBytes, entryCount, exportedAt }`.

`revisionBefore/revisionAfter` is not returned as a source revision receipt.

So the caller has a coherent snapshot but no longer carries its identity.

### 3. Durable pending upload also omits source revision

Before signed PUT, `uploadJournalExportStagedToYandex()` writes `JOURNAL_BACKUP_PENDING_KEY` with fields including:

- `phase:'prepared'`;
- operationId;
- remotePath/filename/monthFolder;
- expectedBytes;
- entryCount/exportedAt/reason;
- retry timestamps/counters.

There is no source Journal revision/token.

Therefore MV3 restart after the external side effect begins loses the only locally proven relation between the remote backup attempt and Journal revision A.

### 4. Fast success state also has no source revision

Normal completion writes backup state fields such as:

- `lastSuccessAt`;
- `lastEntryCount`;
- `lastReason`;
- `lastRemotePath`;
- background success timestamp.

No exact `lastBackedUpJournalRevision` is committed.

This is the existing P1-207 stale-freshness root.

### 5. Recovered success is necessarily weaker today

`recoverPendingJournalBackup()` returns remotePath/filename/entryCount/exportedAt/size after current recovery checks. The recovered-success branch then advances `lastSuccessAt`, `lastRemotePath` and `lastEntryCount`.

Because the pending checkpoint never contained source revision, this branch cannot distinguish:

- remote backup A represents the currently active Journal revision; from
- remote backup A is a valid historical snapshot predating an import/replace or ordinary mutations.

### 6. Import-replace makes the lost identity user-visible

Deterministic schedule:

1. Journal revision A is coherently staged; equality before/after is proven.
2. Pending upload checkpoint is written, but without revision A.
3. Signed PUT begins/settles with result unknown to local worker.
4. User performs replace-import, producing Journal generation/revision B.
5. Worker stops/restarts.
6. Recovery proves some acceptable remote result for the pending backup and records a success timestamp after B exists.
7. There is no retained field from which recovery can state “this backup covers A, not B”.
8. Scheduler/status can therefore postpone backup of B for a full interval, exactly the P1-207 failure.

Even a future exact remote content digest cannot reconstruct source revision if the local attempt never persisted the A→content relation.

## Required P1-207 refinement

### Source revision must be part of the staged receipt

On successful before/after equality, return and persist an immutable source Journal revision/token with the staged export identity.

The staged manifest should bind at least:

- staging generation/key;
- source Journal revision;
- entry count;
- exact byte count;
- export time;
- strong local content digest when available.

### Propagate the same revision into remote attempt generation

Before signed PUT, the durable pending backup generation must copy/bind the exact source revision from the staged receipt. It may not re-read “current revision” at PUT time and substitute it, because Journal may already have advanced after snapshot creation.

The chain must remain:

`Journal revision A -> staged content generation C -> remote attempt R -> verified remote object O -> backup success receipt S`.

Every arrow must be represented by immutable/generation-safe evidence.

### Recovery preserves historical truth

After restart, recovery of R/O reads the stored source revision A and records:

- upload/recovery success time;
- exact source revision A;
- remote object/content receipt;
- current Journal revision B at reconciliation time, if useful for status.

If A != B, the remote backup remains a valid historical version but current B remains backup-due.

### Replace-import is a Journal generation boundary

A replace-import may reuse/normalize records and revisions in implementation-specific ways. The source receipt must therefore be strong enough to distinguish a pre-replace Journal generation from the replacement state even if simple counters/timestamps can collide.

If current `webclipJournalRevision` token is not globally generation-safe across replace/import, P1-207 should consume the same Journal database/generation identity being introduced for P0-076 rather than inventing a weaker backup-only counter.

### Scheduler freshness uses coverage receipt, not completion time

A recent `lastSuccessAt` is only evidence that a backup operation finished recently. “Current Journal backed up” requires equality between current Journal generation/revision and the exact revision in the latest accepted backup receipt.

When unequal, schedule/coalesce a bounded near-term follow-up under current scheduler policy.

## Required deterministic regressions

1. Stage A, no Journal mutation, upload/recovery succeeds -> success receipt says source=A and current=A; normal schedule.
2. Stage A -> append/edit B -> fast upload A succeeds -> A historical success, B remains due.
3. Stage A -> replace-import B -> fast upload A succeeds -> B is not marked covered.
4. Stage A -> replace-import B -> worker restart -> recover A -> source=A survives through pending checkpoint and B remains due.
5. Stage A -> signed PUT unknown -> multiple worker restarts -> revision identity is never reconstructed from current Journal/time/path heuristics.
6. Strong remote content digest matches staged bytes but source revision differs from current -> exact content proof does not falsely imply current coverage.
7. Equal entryCount/byte size between A and B cannot merge source revisions.
8. Backup account/root change during same operation still requires P0-073/P0-074 namespace generation; source revision alone does not authorize remote recovery.
9. Current settings disabled while historical A recovers -> P1-177 policy generation prevents follow-up alarm resurrection, while A historical result can still be recorded truthfully.
10. Continuous Journal mutations coalesce latest due revision and do not create unbounded backup loop.
11. Replace-import reuses a numeric/simple revision value -> Journal generation identity still distinguishes pre/post replace source state.
12. Backup export manifest/diagnostics expose revision receipt without leaking unnecessary Journal content.

## Numbering result

No new item. **P1-207** remains primary owner; P0-073/P0-074/P1-052/P1-184/P1-177 and P0-076 remain required composition layers.

## Test / release state

No product tests were rerun. Historical gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS** as prior evidence only. No build, tag or Release was created.

## Retired source: `RESEARCH_DELTA_BACKUP_SOURCE_REVISION_SUCCESS_2026-08-27.md`

SHA-256 of UTF-8 source text: `0be391f00781d8325b9c09bf3a16c47db9bee175dfd1fa78664d9775816629b0`

# Research delta — Journal backup source revision vs success state — 2026-08-27

Source-of-truth `main` immediately before this write: `50ee0f90a12b5eafc415236ba5e9258299e5801d`.

Docs-only research checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed.

## New confirmed item: P1-207 — a backup can upload revision A, succeed after Journal revision B exists, and then mark the backup scheduler fresh for B even though B was never backed up

**Classification:** P1 / evidence-reserved / confirmed by fresh source research.

Repository-wide semantic duplicate-check was performed against the current backup/scheduler/recovery items and late research deltas. Adjacent owners are different:

- **P0-012** — each backup is a new versioned Yandex file and older versions are retained;
- **P0-015/P1-077/P1-177** — background scheduling/settings/alarm lifecycle;
- **P1-073** — absolute bounded export build deadline;
- **P1-076** — atomic backup lease;
- **P1-117** — backup checkpoint/state Chrome Storage late-settlement ordering;
- **P0-073/P0-074/P1-179/P1-184** — account/root/operation namespace, pending upload recovery and exact remote proof;
- existing backup scheduler generation delta — stale enabled/interval/retry policy after settings changes.

P1-207 concerns a different provenance dimension: **which exact local Journal revision the successful remote backup contains**, and whether that exact source revision is still the current Journal when scheduler freshness is committed.

## Fresh source proof

### 1. Snapshot construction correctly fences mutations during the build

`stageFullJournalExportOnce(buildDeadline)` reads:

`const revisionBefore = await journalRevisionSnapshot(buildDeadline);`

It builds the chunked export and then reads:

`const revisionAfter = await journalRevisionSnapshot(buildDeadline);`

If the two differ it throws `JOURNAL_CHANGED_DURING_EXPORT`, and `stageFullJournalExport()` retries once within the same absolute deadline.

This is a strong positive control: the staged JSON itself is intended to represent one coherent Journal revision.

### 2. The proven revision is discarded when staging completes

The staging result returned to the backup caller is currently:

`{ stagingKey, chunkCount, totalChars, totalBytes, entryCount, exportedAt }`

It does **not** include `revisionBefore/revisionAfter` or another immutable source-revision receipt.

The staged manifest likewise records export metadata/size/count but the operation-level success path does not retain an exact Journal revision as part of the backup receipt/state.

Therefore after staging completes the caller knows it has a coherent snapshot, but no longer carries proof of **which** Journal revision that snapshot represents.

### 3. The backup lease is renewed before network transfer, but the Journal revision is not revalidated

Backup flow does:

1. `const staged = await stageFullJournalExport()`;
2. renew backup lease;
3. `uploadJournalExportStagedToYandex(staged, ...)`;
4. after successful remote upload/verification set `successAt = Date.now()`;
5. persist success state.

There is no Journal revision check between step 1 and the final success-state commit.

The lease proves exclusive backup-operation ownership, not immutability of the Journal. Normal append/edit/delete/clear/import remains allowed while the network transfer is in progress.

### 4. Success state is timestamp-based, not source-revision-based

After upload the state mutation records fields including:

- `lastSuccessAt = successAt`;
- `lastAttemptAt`;
- `lastReason`;
- `lastRemotePath`;
- `lastEntryCount = staged.entryCount`;
- for background runs, `lastBackgroundSuccessAt = successAt` and clears background error.

The status/scheduler therefore sees a **fresh success timestamp** after the network operation completes.

No `lastBackedUpJournalRevision` or equivalent source receipt distinguishes “the upload finished now” from “the uploaded JSON represents the Journal that is current now”.

### 5. Deterministic stale-success schedule

1. Background backup starts when local Journal revision is A.
2. `stageFullJournalExport()` proves a coherent snapshot A and returns staged chunks.
3. A user/import/other tab changes the Journal and commits revision B.
4. The backup continues to upload the already staged snapshot A.
5. Remote object A is valid and is correctly verified; P0-012 allows this historical versioned backup to exist.
6. The worker records `lastBackgroundSuccessAt = now`, where `now` is **after B was committed**.
7. Scheduler freshness is now calculated from that success time.
8. Current Journal B may not receive another background backup until the full configured interval elapses.

The uploaded file is not corrupt. The false statement is the local scheduler/status implication that the current Journal state is covered by the latest successful backup.

### 6. Import-replace is the strongest concrete mutation

A full import-replace can radically replace the Journal after A staging while the A upload is in flight.

The eventual A upload can then be the most recent successful backup timestamp even though it contains the pre-import Journal rather than the newly restored Journal B.

This can leave the newly imported source-of-truth without a corresponding fresh remote backup for an entire interval.

Ordinary append/edit/delete reproduces the same provenance defect with smaller divergence.

## Why this is not P0-012

P0-012 correctly requires immutable/versioned backup files and no overwrite. Under P1-207, the uploaded A file is still a legitimate historical backup and should generally **not** be deleted or overwritten merely because the Journal changed afterward.

The bug is scheduler/provenance bookkeeping after that historical backup succeeds.

## Why this is not the existing scheduler-generation finding

The existing backup scheduler-generation research covers a different race:

- backup starts under settings generation A;
- user disables/changes scheduling to B;
- late A completion can recreate stale alarms/settings effects.

P1-207 reproduces with settings completely unchanged. Only the **Journal data revision** changes.

A correct implementation needs both policy generation and source-data revision receipts.

## Required P1-207 contract

### Persist exact source revision in the staged backup receipt

A coherent export must retain at least:

- exact Journal revision/token proved by the before/after fence;
- `entryCount`;
- export/staging identity;
- content identity/digest when introduced by the P1-184 signed-transfer work;
- operation/backup generation;
- account/root namespace generation where applicable.

The revision receipt must survive long enough to be associated with remote verification and success-state commit.

### Distinguish upload completion time from coverage freshness

Persist separate concepts such as:

- `lastUploadSuccessAt` / remote operation completion time;
- `lastBackedUpJournalRevision` / exact local revision contained in that file;
- current Journal revision at success-state reconciliation.

Do not infer current-revision coverage solely from a recent wall-clock success timestamp.

### A changed Journal does not invalidate the historical backup

If remote upload of A succeeds after current Journal became B:

- keep A as a valid versioned backup;
- record A's exact source revision/object receipt;
- mark/schedule B as still needing backup;
- for background mode, arm a bounded near-term follow-up rather than waiting a full interval measured from the A-upload completion time.

Avoid an infinite backup loop under continuous mutation: coalesce follow-up need by latest Journal revision/generation and use bounded scheduler policy.

### Success/status wording must be precise

UI/status may report “backup file uploaded successfully” for A, but any “current Journal protected/current backup fresh” state must depend on revision equality, not only `lastSuccessAt`.

### Recovery must preserve source revision

If a backup upload outcome is recovered after MV3 restart, the pending checkpoint/recovery receipt must retain the same source Journal revision. A recovered remote object cannot be promoted to coverage of whatever revision happens to be current at recovery time.

This composes with P0-073/P0-074/P1-179/P1-184 namespace/content proof.

## Required deterministic regressions

1. Stage A → append B → upload A success: A remains a valid backup file, but B remains backup-due and a follow-up is scheduled.
2. Stage A → import-replace B → upload A success: success state records A source revision and does not claim B is covered.
3. Stage A → no mutation → upload success: current revision equals source revision and normal interval scheduling remains unchanged.
4. Journal changes repeatedly during upload/follow-up: scheduler coalesces to latest revision and remains bounded.
5. Manual backup A succeeds after Journal changes to B: UI distinguishes successful historical A upload from current-revision coverage.
6. MV3 restart after A upload/unknown response → recovery verifies A: recovered state retains A revision and does not adopt current B.
7. Settings disable/change during the same window still obeys the separate scheduler policy-generation fence; P1-207 must not weaken it.
8. Account/root change during transfer remains fail-closed under P0-073/P0-074; source revision alone is not sufficient remote authority.
9. Exact remote content proof introduced for P1-184 is associated with the same source revision receipt.
10. Versioned backup naming/no-overwrite behavior P0-012 is preserved.

## Number allocation

- New evidence-reserved **P1-207** assigned.
- **P1-206** remains Journal composed-view revision coherence.
- **P1-205** remains OperationLog cleanup/write linearization.

No new P0 or P2 number is created by this checkpoint.

## Test / release state

No runtime/config/manifest change was made. Product tests were not rerun for this docs-only checkpoint. The last established product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** unless superseded by a newer independently recorded gate. No build, tag or GitHub Release was created.

## Retired source: `RESEARCH_DELTA_BACKUP_STAGING_RELEASE_AFTER_LEASE_LOSS_2026-08-28.md`

SHA-256 of UTF-8 source text: `a856bbce6619818272d0a6b7bebbbf50ad1b6a7083a4acd2eb5b27fac1db8014`

# Research delta — staged Journal backup release after lease loss — 2026-08-28

## Scope

Docs-only research of large Journal-backup staging ownership between snapshot creation and signed-upload admission. No new P-number.

Refines temporary-staging lifecycle/resource ownership (P1-035 family) and composes with the bounded resource principles behind **P0-063**. The issue occurs **before** offscreen signed-transfer admission, so it is not a failure of P0-063's active-transfer reservation itself.

## Finding

`exportJournalBackupToYandex()` currently has this order for a new backup:

1. acquire backup lease;
2. `stageFullJournalExport()` creates a chunked transfer payload, up to the configured full Journal export limits;
3. `renewJournalBackupLease(lease)`;
4. only after renewal succeeds call `uploadJournalExportStagedToYandex(staged, ...)`.

`uploadJournalExportStagedToYandex()` owns cleanup of `staged.stagingKey` in its signed-transfer `finally` block.

If step 3 rejects because the lease was lost/expired/replaced, step 4 is never called. The large staged payload has already been committed, but no local `finally` in `exportJournalBackupToYandex()` deletes it. It remains until generic transfer TTL/maintenance cleanup.

### Deterministic schedule

1. Backup A acquires lease LA.
2. A spends long enough staging a large Journal snapshot that LA expires or a later valid owner B replaces it under the lease protocol.
3. A completes `stageFullJournalExport()` and now owns staged group S, potentially tens of MiB.
4. `renewJournalBackupLease(LA)` correctly detects that LA is no longer current and throws `JOURNAL_BACKUP_LEASE_LOST`.
5. A never enters `uploadJournalExportStagedToYandex()`, so that helper's cleanup `finally` is unreachable for S.
6. S remains in `WebClipOffscreenTransfers` until the generic 2-hour orphan cleanup/pressure path.
7. Repeated lost-lease attempts can retain multiple large dead staging groups even though each operation has already received authoritative proof that it will not consume its own S.

The generic TTL is a valuable crash fallback, but after a **proven local ownership loss** there is no uncertainty that justifies retaining the body for this operation.

## Required lifecycle rule

Large temporary payload ownership must be explicit from creation to transfer/recovery handoff.

After `stageFullJournalExport()` returns S:

- the calling backup attempt owns S until exact handoff to a signed-transfer/recovery receipt;
- every exit path before that handoff must compare-and-delete S when the operation is proven unable to consume it;
- unknown outcomes that may still have an external consumer must retain evidence according to the signed-transfer/recovery contract;
- proven lease loss before offscreen admission is a safe immediate-release case;
- generic TTL remains only an orphan/crash safety net, not the normal cleanup mechanism for a synchronously rejected owner.

A straightforward implementation shape is an outer `staged` variable plus a `handedOff/consumed` receipt and `finally` cleanup for any pre-handoff failure. The exact design may differ, but cleanup must be generation-exact so attempt A cannot delete staging B.

## Resource-accounting composition

P0-063 limits **active offscreen signed-transfer** reservations. S in this failure schedule never reaches that admission layer, so it consumes IndexedDB storage outside active-transfer accounting.

The broader storage budget therefore also needs to count/limit committed staging generations awaiting handoff, not only currently active offscreen transfers. Existing storage preflight is useful, but it does not replace prompt release of dead generations.

## Acceptance cases

1. Stage S -> lease renewal succeeds -> exact handoff occurs and ordinary upload helper owns S cleanup.
2. Stage S -> lease renewal proves lease lost -> S is deleted promptly; no two-hour wait.
3. Stage S -> worker dies before renewal -> S may remain as orphan and generic bounded TTL/maintenance eventually cleans it.
4. Stage S -> renewal result is unknown rather than proven lost -> cleanup policy does not erase data that a valid continuation may still own until exact reconciliation decides.
5. New backup B has staging T while late cleanup A runs -> compare-and-delete A cannot touch T.
6. Repeated lease-loss attempts cannot accumulate one full staging payload each beyond the intended global temporary-storage budget.
7. Failure before staging completed leaves partial S group cleanup under the existing `stageFullJournalExportOnce()` failure path.
8. Once signed transfer is admitted, its payload/evidence lifetime is governed by the existing signed-transfer attempt/recovery contract, not this pre-handoff cleanup rule.

## Classification

No new blocker. This refines temporary staging ownership/cleanup (**P1-035 family**) and composes with **P0-063** bounded resource admission. It does not reopen P0-063's actual offscreen reservation mechanics.

## Validation note

Documentation only. Runtime/tests/manifest unchanged. Product tests were not rerun; historical 88/88 JS syntax + 74/74 deterministic PASS remains prior evidence. No build/tag/release.

## Retired source: `RESEARCH_DELTA_BACKUP_STATE_CONTEXT_PROVENANCE_2026-08-28.md`

SHA-256 of UTF-8 source text: `ad638d55f7297bc028acb2ad55fe5c366b9fc5569e077a40b62a8bff9fb0012d`

# Research delta — Journal backup state must be scoped to account/root generation — 2026-08-28

Source-of-truth `main` before this checkpoint includes `7e4ea3141fcc3f1ac056c28bc4487c51eeb474d9`.

Docs-only research checkpoint. Runtime/config/tests/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh proof refines **P0-074**, **P0-016** and **P1-177**. It is distinct from the existing backup scheduler-generation delta: that delta covers an *old in-flight operation* publishing stale future alarms after Settings changed. This checkpoint reproduces with no old operation running at all — persisted historical backup success/failure state from context A is interpreted as current state for context B.

## Current backup status mixes two provenance domains

`getJournalBackupStatus()` reads in parallel:

- current `yandexConfig`;
- persisted `journalBackupState`.

It derives current:

- `rootPath` from `yandexConfig.rootPath`;
- current Journal backup folder path from that root;
- enabled/interval/retry policy from current config.

But it reads historical unscoped fields from `journalBackupState`:

- `lastSuccessAt`;
- `lastFailureAt`;
- `lastAttemptAt`;
- `lastBackgroundSuccessAt` / failure fields;
- `lastRemotePath`;
- `lastEntryCount`;
- `lastReason`.

The persisted state shown in current code does not bind those fields to the Yandex account UID, root path/config generation, or an immutable backup-context generation.

The returned status then combines them directly:

- current `rootPath` / `folderPath`;
- `remotePath: lastRemotePath || folderPath`;
- old `lastSuccessAt`;
- `nextDueAt = lastSuccessAt + current interval`;
- `overdue = enabled && (!lastSuccessAt || now >= nextDueAt)`.

Thus the status object itself can describe a combination that never existed as one backup context.

## Deterministic root-change schedule

1. Current Yandex context is root **A**.
2. Background backup succeeds at time `t0` to `A/Backup/Journal/.../A.json`.
3. `journalBackupState` stores `lastSuccessAt=t0`, `lastRemotePath=A/.../A.json`, entry count and related timestamps.
4. User changes WebClip root to **B** shortly afterwards.
5. No old backup operation remains active; this is now a clean new worker/status read.
6. `getJournalBackupStatus()` reads current config B and historical state A.
7. It returns `rootPath=B` and `folderPath=B/Backup/Journal`, while `lastRemotePath` still points to A and `lastSuccessAt=t0` still counts as the latest success.
8. Scheduler computes the next B backup from `t0 + interval` instead of treating B as having no compatible successful backup yet.

The new root can therefore wait almost a complete interval before its first automatic backup solely because a different root was backed up recently.

## Account change is the stronger provenance case

The same issue applies when auth/account changes while persistent `journalBackupState` remains.

A success under account A should not prove current account B has a recent Journal backup, even when the configured textual root happens to be identical.

Without an account/config generation receipt the status layer cannot distinguish:

- same account + same root historical success;
- same account + changed root;
- changed account + same textual root;
- changed account + changed root.

P0-074 already requires immutable account/root/auth/config context for Yandex operations. Persisted backup health must consume the same context model rather than dropping provenance at terminal success.

## User-visible truth problem

P0-016 requires popup to show the latest successful and failed background attempts.

Those timestamps are meaningful only with their context.

After root/account change, current UI can otherwise imply that the currently configured backup destination has a recent success while the displayed/returned `lastRemotePath` belongs to the previous destination.

Acceptable UX families include:

- display the historical success explicitly as belonging to the previous account/root and separately show `no success yet` for current context;
- retain per-context bounded history and select the record matching current context;
- reset only the *current-context derived status* on context change while preserving old history for diagnostics.

Do not silently erase useful historical evidence merely to make the UI look clean.

## Failure/retry state has the same provenance requirement

Old `lastFailureAt` / `lastBackgroundFailureAt` / `lastError` are also unscoped.

A failure under A should not necessarily mark B as currently unhealthy or schedule current-context retry timing from A's failure. Conversely, switching context must not erase the fact that A had an unresolved failure if that is still useful history.

The key is classification:

- historical event A remains historical evidence;
- current scheduler/health decision B may consume only compatible B-generation evidence.

## Required backup-context receipt

A terminal backup state record should bind at least:

- Yandex account UID / verified account generation;
- normalized root path;
- relevant config generation;
- scheduler/settings generation where interval/enabled policy matters;
- operation receipt;
- exact backup remote path/object receipt;
- success/failure/attempt timestamps and entry count.

Current status should compare the stored context receipt to the current authoritative Yandex/scheduler context before treating an old timestamp as current-context success/failure.

## Scheduler semantics after context change

When current account/root generation has no compatible successful backup:

- `lastSuccessAt` for **current context** is logically empty;
- automatic backup should be considered due according to explicit first-backup policy, not postponed by success from another context;
- old A history may still be displayed separately;
- an old failure from A cannot dictate B's retry interval/state.

This composes with P1-177 scheduler-generation fencing: future alarm creation still needs current policy generation, while this checkpoint defines which historical success/failure record is eligible to calculate that current policy's due/retry state.

## Required regressions

1. Backup succeeds under root A -> switch to root B immediately -> B reports no compatible success and schedules first B backup according to first-backup policy, not A's `t0+interval`.
2. A and B use the same account but different root -> old A `lastRemotePath` is not presented as B's current backup path.
3. Backup succeeds under account A/root X -> reauth to account B/root X -> A success does not prove B is backed up.
4. Switch away A -> B -> back to exact proven A context -> implementation may recover A historical status if its context receipt still matches.
5. Failure under A -> switch to B -> B is not marked as currently failing solely from A's failure.
6. Current-context failure after switch to B is recorded against B and displayed truthfully.
7. Old historical status remains available for diagnostics without controlling current alarms.
8. Settings interval changes without account/root change continue to use the current compatible success timestamp but future scheduling uses the newest settings generation per P1-177.
9. Account/root change while an operation is physically in flight remains governed by P0-074 operation-context reconciliation; this historical-state contract does not rewrite that old result into B.
10. Popup/Options status cannot return a mixed object whose current root is B while its unlabelled current `remotePath` is A.

## Duplicate check / numbering

No new P-number is created.

- **P0-074** is the primary account/root/config-generation owner.
- **P0-016** owns truthful background-backup status presented in popup.
- **P1-177** owns scheduler state under current enabled/auth/config policy.
- `RESEARCH_DELTA_BACKUP_SCHEDULER_GENERATION_2026-08-27.md` remains the sibling stale in-flight alarm-publication finding; this checkpoint covers persisted historical state provenance after the old operation is already gone.

## Test / release state

Docs-only checkpoint. Product tests were not rerun. Historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** remains previous evidence only. Real account/root-switch Yandex E2E remains required. No build, tag or Release was created.

## Retired source: `RESEARCH_DELTA_BACKUP_SUCCESS_NAMESPACE_COVERAGE_GENERATION_2026-08-28.md`

SHA-256 of UTF-8 source text: `1e85eb6bac2f94c62d185a5da89ed42f4701283ceebc2003f552f200ab9ab225`

# Research delta — backup success freshness must be scoped to Yandex namespace generation — 2026-08-28

Source-of-truth `main` before this checkpoint: `f152829fe0dd0e8dc4d55d8e5a2b3d24fd82a376`.

Docs-only research checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh source proof composes existing **P1-207** source-revision coverage with **P0-073/P0-074** Yandex account/root/config generation and **P1-177** scheduler convergence.

The result is a deterministic ordinary-success case: a recent backup that correctly succeeded in namespace A can make the scheduler consider namespace B fresh after the user changes account/root, even though no backup exists in B.

## Current backup success state is global

`journalBackupState` success bookkeeping currently stores fields such as:

- `lastSuccessAt`;
- `lastBackgroundSuccessAt`;
- `lastRemotePath`;
- `lastEntryCount`;
- `lastReason`.

The current state does not bind the success/freshness record to:

- exact Yandex account UID;
- root/config generation;
- normalized root path as a verified namespace receipt;
- exact source Journal revision required by P1-207.

`lastRemotePath` is descriptive path text, not sufficient namespace authority.

## Status combines current config with historical global success timestamp

`getJournalBackupStatus()` reads in parallel:

- current `yandexConfig`;
- current `journalBackupState`.

It derives the **current** rootPath/interval/retry policy from `yandexConfig`, but derives:

`nextDueAt = lastSuccessAt + current interval`

from the global historical `lastSuccessAt`.

Thus one returned status object can semantically combine:

- namespace/config B;
- success timestamp produced under namespace A.

No equality/provenance check proves that the success covers B.

## Root change explicitly restarts scheduler, but freshness stays global

`saveYandexRoot(rootPath)` correctly:

1. commits the new root through `updateYandexConfig()`;
2. verifies/creates service folders when auth exists;
3. calls `initializeJournalBackupScheduler('root-change')`.

This is a useful positive control: root changes are not ignored by scheduler setup.

However restarting the scheduler does not help if the status model itself says the new namespace is not due because `lastSuccessAt` came from the old namespace.

## Deterministic root-switch suppression schedule

1. Current Yandex namespace is account A/root R1.
2. Background backup of Journal revision J succeeds at time T under A/R1.
3. `journalBackupState.lastSuccessAt = T` is committed.
4. Shortly afterward the user changes root to R2.
5. `saveYandexRoot(R2)` commits R2 and invokes scheduler initialization.
6. `getJournalBackupStatus()` reads current R2 but historical `lastSuccessAt=T`.
7. With default 24-hour interval, `nextDueAt = T + 24h` and `overdue=false`.
8. Scheduler can therefore defer backup for R2 until the full interval passes.
9. R2 may contain service folders but no successful backup of J at all.

The old A/R1 backup is valid historical data. The false statement is using it as freshness coverage for R2.

## Account switch with same textual root is stronger

Suppose account A and B both use textual root `/WebClips`.

After successful A backup, the user reauthorizes B. `getJournalBackupStatus()` can still see the same path string and recent global `lastSuccessAt`.

Without account UID/generation in the coverage receipt, there is no way to distinguish:

- `/WebClips` in A, which was backed up;
- `/WebClips` in B, which may be empty.

Path equality therefore cannot make the global timestamp safe.

This is precisely why P0-073 requires account/root namespace identity rather than path-only semantics.

## Journal source revision and namespace generation are conjunctive coverage

P1-207 already proves that a successful upload of Journal revision JA cannot make newer local revision JB fresh.

This checkpoint adds the orthogonal namespace dimension.

A backup coverage receipt is current only when both are true:

1. exact source Journal revision covered by the file equals the revision/policy state being evaluated;
2. exact Yandex namespace generation/account/root for that file equals the namespace whose freshness is being evaluated.

Conceptually:

`coverage = { sourceJournalRevision, accountUid, root/config generation, remote object/content receipt, successAt }`.

A recent timestamp alone is insufficient.

## Successful historical backup remains success

Changing namespace after A succeeds must not rewrite A into failure.

Status should be able to report separately:

- latest successful historical backup A/R1 at T;
- current configured namespace B/R2 has no matching coverage yet;
- current Journal revision is backup-due for B/R2.

This preserves truthful history while driving the correct scheduler action.

## Root/account changes should create current-namespace backup due state

After a namespace generation changes:

- scheduler reconciliation should evaluate coverage against the new generation;
- absent matching coverage means current namespace is due, regardless of recent success elsewhere;
- use bounded near-term scheduling rather than uncontrolled immediate loops;
- if backup is disabled, do not force a backup merely because namespace changed;
- re-enabling later evaluates current generation coverage normally.

A->B->A with visually equal values should use explicit generation/provenance policy. If a previous A coverage receipt is still considered valid for the exact same authenticated account/root generation under product semantics, that decision must be explicit and proven, not inferred from path equality.

## Recovery composition

The existing backup-recovery namespace research already requires pending upload checkpoints to retain historical account/root/content identity.

When recovery later proves old A/R1 upload success while current config is B/R2:

- record A/R1 as historical success;
- do not update B/R2 coverage freshness;
- scheduler remains due for current B/R2 if no matching file covers it.

The same rule must apply to ordinary non-recovered success. Recovery is not a special exception.

## Settings/scheduler generation composition

P1-177/P0-074 still require old scheduler tasks not to overwrite current policy.

Even a perfectly generation-fenced scheduler will produce the wrong decision if its input coverage model treats A's timestamp as B's success. Therefore two layers are required:

- scheduler execution generation correctness;
- namespace/source coverage correctness.

## Required deterministic regressions

1. Backup J succeeds under A/R1 -> root changes to R2 immediately -> current R2 is backup-due; old success remains historical.
2. A/R1 success -> reauth B/R1 same textual root -> B is due; A timestamp cannot suppress it.
3. A/R1 success -> interval changes but namespace unchanged and source Journal revision unchanged -> normal current coverage may be reused according to policy.
4. Stage/source revision A succeeds after Journal revision B -> P1-207 keeps B due even in same namespace.
5. Namespace changes while old backup upload is in flight -> old result is attributed to old context and cannot satisfy new namespace coverage.
6. MV3 recovery proves historical A object while current B is configured -> B remains due.
7. Backup disabled before root switch -> scheduler remains disabled; coverage status can say current namespace unprotected without starting work.
8. Re-enable after switch -> due calculation uses current namespace coverage, not global historical timestamp.
9. Account/root change and then switch back -> any reuse of old coverage requires exact account/root generation/object policy, never path-only equality.
10. UI can display latest historical success and current-namespace protection state separately.
11. `lastRemotePath` from old root is not used as proof current root is covered.
12. Current namespace successful backup commits a new coverage receipt and normal interval scheduling resumes.

## Duplicate check / numbering

No new item is created.

- **P1-207** remains source Journal revision coverage owner.
- **P0-073/P0-074** own Yandex namespace/operation generation.
- **P1-177** owns scheduler convergence to current policy.
- Existing backup recovery namespace/provenance delta remains the recovery-side companion.

This checkpoint makes the conjunction explicit for ordinary scheduler freshness: **backup success coverage is revision + namespace generation, not a global timestamp.**

P1-211 remains unassigned.

## Test / release state

No product tests were rerun. Historical **88/88 syntax + 74/74 deterministic PASS** remains prior evidence only. No runtime/build/tag/Release change was made.

## Retired source: `RESEARCH_DELTA_CROSS_WAKE_RECOVERY_ARBITRATION_2026-08-28.md`

SHA-256 of UTF-8 source text: `5e69df29980893c3477f5a3706734df6029310da2821ca93e49c9b3033096416`

# Research delta — cross-wake recovery arbitration — 2026-08-28

Source-of-truth `main` immediately before this write: `e829458295079b1afa9ba4862d46997181c9c730`.

Docs-only research checkpoint. Production runtime/config/manifest/tests are unchanged.

## Classification

No new P-number is assigned.

Fresh review extends **P1-192** from fixed-order maintenance-phase fairness to arbitration between **independent durable wake classes** that can overlap in one MV3 worker: periodic/retry Journal backup alarms and hourly background maintenance.

Queue-local owners remain:

- P1-064 local-download recovery fairness;
- P1-208 remote-save recovery fairness;
- P1-173 pending-turn admission;
- P1-043 shared persistent-storage reservation;
- P0-063 signed-transfer active reservations.

## Fresh source proof

### 1. Background backup and maintenance have independent alarm entry points

`chrome.alarms.onAlarm` currently dispatches:

- `JOURNAL_BACKUP_ALARM` -> `runDueJournalBackup('periodic-alarm', false).catch(...)`;
- `JOURNAL_BACKUP_RETRY_ALARM` -> `runDueJournalBackup('retry-alarm', true).catch(...)`;
- `OPERATION_LOG_CLEANUP_ALARM` -> `runLoggedOperationLogCleanup('alarm').catch(...)`.

Each alarm callback starts a long async chain and returns synchronously. P1-192 already owns the lifecycle consequence of those fire-and-forget chains.

There is no common durable scheduler receipt that says which background work class currently owns the next bounded slice or which class must be serviced next after restart.

### 2. Backup has an appropriate subsystem-local lease

Journal backup itself uses a durable `JOURNAL_BACKUP_LEASE_KEY` in Journal metadata. The lease has a token, operation id, acquisition/expiry times and compare-by-token renew/release semantics.

This is a strong positive control: periodic and retry backup paths cannot freely run two physical backup generations in parallel.

But the backup lease deliberately protects **backup against backup**. It does not coordinate backup with maintenance recovery of pending Journal appends, remote saves, local downloads or stats repair.

### 3. Maintenance owns a different long pipeline

`runLoggedOperationLogCleanup()` performs cleanup work and then recovery in fixed order:

1. pending Journal appends;
2. pending remote saves;
3. pending local downloads;
4. Journal stats repair.

The prior maintenance-phase research already proved a persistent early remote backlog can consume a worker generation before later phases are entered.

### 4. Backup can overlap the maintenance window

`runDueJournalBackup()` is an independently alarm-started operation. It may perform:

- status/auth/root reads;
- recovery of a pending backup;
- Journal snapshot/export staging;
- Yandex folder/API work;
- signed transfer and verification;
- durable success/failure and future scheduling.

Nothing in the current backup lease prevents hourly maintenance from executing its own IDB/recovery/Yandex work concurrently, and nothing in maintenance waits for or gives scheduling priority to a current backup generation.

This is not automatically corruption: subsystem checkpoints/leases still provide important correctness barriers. The issue is lifecycle/resource fairness.

### 5. Local resource caps turn accidental overlap into deferral/failure pressure

The two chains share finite resources:

- same MV3 worker lifetime;
- same extension-origin IndexedDB/storage budget;
- Yandex API/network activity;
- offscreen signed-transfer count/byte reservations where applicable;
- OperationLog write queues.

P0-063 correctly caps signed transfers rather than allowing unbounded concurrency. P1-043 requires global persistent-byte reservation. Those controls are necessary, but once capacity is bounded an accidental earlier background class can cause another class to defer/fail admission.

Without a durable cross-class scheduling policy, repeated coincidence/restart can keep selecting the same class first even when each individual queue has a fair cursor.

## Required P1-192 refinement

### Durable background-work arbitration

P1-192's scheduler/lifecycle repair should cover at least these classes:

- backup due/retry;
- Journal append recovery;
- remote-save recovery;
- local-download recovery;
- stats/repair maintenance;
- bounded cleanup work that must precede/compose with them.

The implementation need not serialize all background work globally. It must provide deterministic bounded ownership/admission so one class cannot repeatedly consume every usable worker generation or scarce global slot.

Possible designs include a tiny durable next-class cursor plus per-class bounded slices, or a durable work coordinator that merges simultaneous wakes into one current generation.

### Preserve subsystem leases

The backup lease remains necessary and must not be replaced by a coarse global lock. A global lock held through a hung Yandex operation would make fairness worse.

Use layered ownership:

- short-lived global/class scheduling receipt for who receives the next slice;
- subsystem-specific exact operation/checkpoint generations for correctness;
- bounded actual-settlement reservations for shared physical resources.

### Simultaneous alarm delivery should coalesce intent, not erase it

If backup and maintenance wake together:

- both intents become durable/current scheduling demand;
- execution may serialize/round-robin according to bounded policy;
- servicing backup must not mark maintenance done;
- servicing maintenance must not consume the next backup obligation;
- worker termination preserves whichever class still needs a turn.

### User operations remain higher-value but cannot erase recovery

An explicit user save/import may reasonably receive interactive priority, but background recovery receipts must remain pending and receive a later guaranteed wake/slice. Interactive pressure is not proof that unknown external outcomes can be forgotten.

## Deterministic regressions

1. Periodic backup alarm and hourly maintenance alarm fire in the same worker generation: at most intended bounded work runs concurrently and both obligations remain represented until serviced.
2. Backup snapshot consumes >30s/pure IDB and worker is killed: next durable wake eventually services local-download recovery rather than always restarting backup/front phases.
3. Persistent remote-save backlog plus due backup: both receive progress within bounded wakes; remote queue cannot monopolize every generation.
4. Repeated backup retry failures do not prevent local-download terminal checkpoints from being reconciled.
5. Heavy local-download recovery does not indefinitely suppress a due backup or Journal stats repair.
6. Backup lease continues to block duplicate backup physical generations while cross-class scheduler still permits unrelated recovery slices.
7. Offscreen signed-transfer capacity full: denied/deferred class keeps its durable scheduling obligation and is retried fairly after actual reservations release.
8. Persistent-storage reservation pressure: one background class is deferred before materialization; deferral does not delete its checkpoint or reset scheduler to another class forever.
9. Old worker's late scheduler/cursor write cannot rewind a newer background-work generation.
10. No work pending: coordinator converges idle and does not create high-frequency wake loops.
11. Simultaneous periodic+retry backup alarms still collapse to the one backup lease/generation while maintenance remains independently schedulable.
12. Explicit user operation gets interactive priority but unknown background recovery remains durable and later receives a turn.

## Numbering result

No new item is created. **P1-192** remains primary owner, now explicitly including cross-wake/cross-class background arbitration in addition to phase resume and lifecycle ownership.

## Test / release state

No product tests were rerun. Historical gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS** as prior evidence only. No build, tag or Release was created.

## Retired source: `RESEARCH_DELTA_DIRECT_ROOT_CHANGE_SCHEDULER_RECONCILIATION_OBLIGATION_2026-08-28.md`

SHA-256 of UTF-8 source text: `3d4e4a61b82ff2f6e2d77bbcea6f4f5ec29d60bf6ea7ff5fb7dd608979fe43c8`

# Research delta — direct root change scheduler reconciliation obligation — 2026-08-28

## Scope

Docs-only research of `saveYandexRoot()` and the Journal backup scheduler. No new P-number.

Refines **P1-177**, **P0-074** and the settings-generation/reconciliation direction already established by P1-157/P1-008.

## Finding

`saveYandexRoot(rootPath)` intentionally commits the new `yandexConfig.rootPath` **before** verifying/creating service folders. The source comment explicitly says a service-folder failure is returned to the user while the selected root remains saved.

The method then performs:

1. current auth read;
2. durable root config write;
3. when authorized, `ensureYandexServiceFolders(...)`;
4. only after that succeeds, `initializeJournalBackupScheduler('root-change')`.

Therefore a failure in step 3 is a legitimate **partial commit**: root generation R2 is durable, but scheduler reconciliation for R2 has never been attempted and no durable marker records that obligation.

This differs from user-settings import, which bundles a reconciliation marker with the settings commit.

### Deterministic schedule

1. Scheduler/alarm state reflects root/config generation R1 and prior backup success timestamps.
2. User saves new root R2.
3. `updateYandexConfig()` commits R2 successfully.
4. Service-folder verification under R2 fails/times out.
5. `saveYandexRoot()` throws before `initializeJournalBackupScheduler('root-change')`.
6. Browser remains open and the existing worker remains alive, so module-start initialization is not automatically repeated.
7. Old periodic/retry alarm state from R1 remains installed until some unrelated future reconciliation trigger.
8. A later stale alarm wake fresh-reads current R2 and may avoid a wrong physical backup, but durable scheduler state was nevertheless inconsistent with current committed configuration for the whole interval.

If R2 also invalidates the namespace coverage of `lastSuccessAt`, the existing backup-success-generation findings compound the problem: the old due time can suppress or delay the first required R2 backup.

## Required contract

A settings/config mutation that commits state requiring ancillary browser reconciliation must durably record that obligation **at the same commit boundary or before returning terminal success/failure**.

For direct root change:

- root config generation R2 is authoritative once the storage write settles;
- service-folder verification is a separate result (`verified / failed / unknown`);
- scheduler reconciliation is another separate obligation/result;
- failure of folder verification must not make the scheduler obligation disappear;
- worker startup/current settings page may resume the exact current-generation obligation;
- if newer root R3 supersedes R2, reconciliation converges to R3 rather than forcing R2 back.

A common generation-aware config-reconciliation marker may cover both direct writes and imported settings; separate ad-hoc markers are not required if one shared current-generation reconciler is authoritative.

## UI truthfulness

Because root persistence is intentionally retained after folder verification failure, the returned error/state should distinguish:

- `root committed`;
- `remote structure verification failed/pending`;
- `backup scheduler reconciliation pending`.

A generic save failure must not encourage a blind second config mutation merely to repair ancillary state.

## Acceptance cases

1. R1 -> root R2 commit -> folder verification fails: R2 remains stored and an exact scheduler-reconciliation obligation remains discoverable.
2. Same schedule without worker restart: reconciliation can still converge to current R2; it is not dependent on future `runtime.onStartup`.
3. Existing R1 periodic/retry alarms cannot remain authoritative after R2 commit.
4. R2 verification failure followed by intentional R3 save: R3 supersedes the obligation; late R2 work cannot restore R2 scheduling.
5. Storage write for R2 fails before commit: no R2 ancillary obligation is published.
6. Storage write times out but actually commits late: actual settlement publishes/retains the R2 reconciliation obligation; timeout is not cancellation.
7. Backup `lastSuccess` coverage is re-evaluated for current namespace generation rather than reused globally.

## Classification

- **P1-177**: scheduler must converge to current policy/root and not leave obsolete alarms authoritative.
- **P0-074**: root/config generation consistency for Yandex-dependent decisions.
- **P1-157/P1-008** provide the shared settings-generation / post-commit reconciliation pattern.

No new blocker is allocated.

## Validation note

Documentation only. Product tests were not rerun. Historical gate remains 88/88 JS syntax + 74/74 deterministic tests PASS. No build/tag/release.

## Retired source: `RESEARCH_DELTA_JOURNAL_BACKUP_TRANSIENT_MOVE_STATE_2026-08-28.md`

SHA-256 of UTF-8 source text: `846bf5daf246be7ef7f487ee0ae4439a664c308099b17d50a0c3a2cd385c75e2`

# Research delta — Journal backup vs transient ReadLater move recovery state — 2026-08-28

Docs-only research checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

No new P-number.

Primary existing owner: **P0-022** imported remote/destructive provenance. This also composes with **P0-074** operation/account generation, **P0-076** Journal generation fencing, **P1-090** exact Yandex move identity and **P1-190/P1-198** operation-receipt provenance.

The fresh acceptance point is that a user backup is a portable Journal-data artifact, while `readMove*` is transient local recovery state for one destructive saga. Those two classes must not be silently serialized/restored as equivalent durable history.

## Source proof

The current full Journal export reads each raw IndexedDB entry and serializes:

```js
JSON.stringify({ ...entry, journalComments: normalizeJournalComments(entry) })
```

Therefore every current internal field in the entry is included, including:

- `readMovePendingAt`;
- `readMoveSourcePath`;
- `readMoveTargetPath`;
- `readMoveOperationId`;
- `readMoveLastError`.

`normalizeImportedJournalEntry()` then explicitly accepts and restores those same fields from a backup.

Current Mark Read treats `readMovePendingAt/readMoveTargetPath` as recovery evidence: it announces a previous unfinished move, reuses the stored target when it is inside the current Upload folder and records new recovery state around that target.

## Why this is different from normal historical metadata

`title`, URL, filename, comments and selection snapshot are portable user history.

A `readMove*` checkpoint is not merely history. It represents an unfinished local-to-remote destructive transaction tied to:

- one Journal entry generation;
- one Yandex account/root generation;
- one source remote object identity;
- one chosen target path generation;
- one operation attempt and unknown/known settlement state.

Exporting it as an ordinary entry field and importing it later loses those authority bindings.

## Deterministic honest-backup schedule

No crafted backup is required:

1. Journal entry J is in `ReadmeLater`.
2. Mark Read chooses target T and commits `readMove*` checkpoint before remote move.
3. While the saga is pending/unknown, a full Journal backup snapshot includes the raw entry and therefore T/source/operation checkpoint fields.
4. The original saga later completes, fails, changes account/root, or becomes otherwise historical.
5. At a later time the user restores that perfectly legitimate backup, possibly on another extension installation or Yandex session.
6. Import recreates J with the old transient `readMove*` state.
7. Journal UI/worker can now treat that historical checkpoint as an unfinished local recovery saga.

P0-022 prevents the imported path hints from becoming unchecked destructive authority, but the backup format should also stop confusing portable history with live recovery state in the first place.

## Required contract

Choose and document one versioned model:

### Preferred: portable backup excludes live recovery capability

- full Journal export/backup strips transient `readMove*` authority fields;
- portable entry keeps stable historical outcome fields only (`readingMode`, `movedToReadAt`, current verified remote metadata where policy permits);
- after restore, no old move attempt is automatically resumable.

### Alternative: export recovery evidence as explicitly inert historical metadata

If product value requires preserving it for diagnostics:

- store it under a versioned `historicalRecovery`/source namespace;
- mark provenance as imported/unverified;
- never feed it directly into live `moveReadLaterEntryToRead()` recovery selection;
- an explicit rebind/reconciliation flow must establish current account/root/object/generation before authority is regained.

## Backup snapshot timing

The solution must work even when export legitimately overlaps a live move. It is not sufficient to hope backups normally happen between mutations.

A coherent snapshot may faithfully observe `readMovePendingAt` — that proves the snapshot is internally consistent, not that the checkpoint is portable authority.

## Regression cases

1. Backup taken before Mark Read checkpoint -> restore has no pending move.
2. Backup taken after checkpoint but before POST -> restore does not resume old T automatically.
3. Backup taken after POST with outcome unknown -> restore does not infer current remote settlement from old checkpoint.
4. Backup taken after final verified local commit -> stable `readingMode=read`/verified remote metadata round-trips normally.
5. Restore under different Yandex account/root -> no old move capability survives merely because strings are inside managed paths.
6. Restore into same account/root after original saga already completed -> historical checkpoint does not initiate a second destructive move.
7. Crafted backup carrying `readMove*` remains covered by P0-022 and fails closed.
8. OperationLog/history may preserve diagnostic operation id separately, but it is not a live move receipt.

## Duplicate check

P0-022 already owns the strongest safety boundary for imported remote/path provenance. This delta does not allocate a new item; it clarifies the portable-backup schema acceptance condition that prevents honest backups from recreating stale transient recovery authority.

## Validation note

Documentation only. Product tests were not rerun; historical 88/88 JavaScript syntax + 74/74 deterministic PASS remains prior evidence only. No build, tag or Release was created.

## Retired source: `RESEARCH_DELTA_OFFSCREEN_PARTIAL_RESTORE_STAGING_CLEANUP_2026-08-28.md`

SHA-256 of UTF-8 source text: `c5ebd24242647612f91473bf34228754c2728eaa4873ebd18dcbaeb99f90fbfc`

# Research delta — offscreen partial restore staging cleanup — 2026-08-28

Source-of-truth `main` immediately before this write: `6ce7c1e406b90729f3cc80a9f349001006d99274`.

Docs-only positive-control checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Scope

`text-download` restore staging writes the downloaded response into multiple IndexedDB chunk transactions before the final import-manifest/result is available. This block checked whether an oversize/network/deadline/IDB failure can leave every already-written chunk permanently orphaned merely because no successful `payloadKey` is returned to the service worker.

## Positive result — the staging producer owns explicit failure cleanup

`stageResponseBodyAsJournalImport(response, payloadKey, maxBytes, deadlineAt)` wraps the streamed read/chunk-write sequence in a `try/catch/finally`.

On any error from the staging pipeline it performs:

`await deleteTransferPayloadGroup(payloadKey, chunkCount + 2).catch(() => {})`

and then rethrows the original failure.

The cleanup is therefore attempted by the context that still knows the exact generated `payloadKey`, even when the worker never receives a successful response containing that key.

This is an important ownership property: cleanup does not depend exclusively on a higher-level caller having learned the staging identifier.

## Oversize path composes correctly

The streamed byte counter cancels/rejects once `totalBytes > cap`. That exception enters the same local cleanup catch.

Thus a body that crosses the 50 MiB boundary after, for example, dozens of 1 MiB chunks does not intentionally leave those completed chunks as ordinary live staging.

The same catch covers network/read exceptions and bounded IDB helper failures thrown during the producer pipeline.

## Cleanup failure remains best-effort, not false success

The cleanup attempt itself is caught so the original transfer error is preserved. If the delete transaction also fails or the offscreen document is terminated at an unlucky point, some orphan chunks can still remain.

That residual class is why shared transfer TTL/hourly cleanup and storage-pressure handling remain necessary. The positive result is not “orphans are impossible”; it is:

- normal producer-observed failure has exact immediate cleanup ownership;
- fallback TTL is for crash/cleanup-failure uncertainty rather than the expected success/failure path;
- the operation does not report a successful staged payload after the producer catch.

Do not weaken this by moving all cleanup responsibility to the service worker, which may never learn the key after response-channel loss or producer failure.

## Atomicity boundary

Chunked staging is intentionally not one giant IndexedDB transaction. That keeps transaction lifetime/memory bounded.

Correctness therefore requires two levels:

1. each chunk/manifest write has bounded transactional semantics;
2. the logical multi-transaction staging generation has producer-side compensation plus later orphan cleanup.

A future refactor should not try to make a 50 MiB network stream one monolithic IDB transaction merely to obtain rollback semantics.

## Composition with unknown transport settlement

If the offscreen pipeline **succeeds** and durable staging exists but the runtime response to the worker is lost, producer-side error cleanup must not run merely because the caller did not receive the result. The actual `handleSignedTransfer()` promise has succeeded.

That class remains the existing offscreen/result-discovery/unknown-settlement problem and is different from producer-observed failure.

Similarly the active transfer reservation remains owned until the actual offscreen promise settles, not until caller timeout.

## Regression guard

1. Oversized streamed restore after several committed chunks -> producer attempts exact group cleanup and returns failure.
2. Network read error after several chunks -> same immediate cleanup attempt.
3. IDB chunk write failure -> no success result; exact group cleanup is attempted.
4. Final manifest write failure -> already-written chunks are cleanup candidates under the same key.
5. Cleanup transaction itself fails -> original error remains visible; fallback orphan TTL/maintenance can later reclaim leftovers.
6. Successful staging -> producer does not delete the group before handing the payloadKey/result to the worker.
7. Successful staging + lost runtime response -> do not confuse caller loss with producer failure and destroy a valid result prematurely.
8. Offscreen transfer reservation remains tied to actual promise settlement throughout cleanup.
9. No one giant long-lived IDB transaction is introduced as the fix.
10. Storage-pressure cleanup remains generation-safe and never treats a currently successful/live result as an expired orphan solely because the worker response is delayed.

## Classification

No new P-item. This is a positive lifecycle checkpoint adjacent to P1-035/P1-069/P0-063 and the transfer-result reconciliation work.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains prior evidence only: **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.

## Retired source: `RESEARCH_DELTA_RECOVERY_CAPACITY_STORAGE_ADMISSION_2026-08-28.md`

SHA-256 of UTF-8 source text: `66f9a91fc5f72ee61246c0233cf31f3e316283e0428d5aba6bb3ca3087a96862`

# Research delta — recovery capacity / storage-admission matrix — 2026-08-28

Source-of-truth `main` immediately before this write: `4347cdf6826668c9de341fef5aea31f391a40221`.

Docs-only research checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Scope

Fresh cross-system research of bounded recovery queues, TTL/dead-letter cleanup, storage-pressure cleanup and large-writer admission.

Primary existing owners reviewed:

- **P0-039/P0-048** — local DownloadItem unknown-settlement evidence and exact binding;
- **P0-079** — immutable operation-owned PDF generation/body lifetime;
- **P1-035** — transfer/import staging active-owner lifetime vs TTL;
- **P1-043** — shared extension storage quota preflight/reservation;
- **P1-054/P0-065** — offscreen Blob/materialization admission and memory reservation;
- **P1-184** — remote unknown-settlement evidence/dead-letter retention;
- **P1-197/P1-205/P1-173** — OperationLog active ownership, cleanup/write ordering and queued-turn admission;
- **P1-194** — truthful persistent-storage/durability class;
- **P1-156/P1-169** — prepared Save As active-session / tombstone lifecycle.

The research goal was to determine whether there is another independent root cause in the interaction among these caps, or whether the remaining gaps are refinements of the existing owners.

## Result

No new P-number is required.

The strongest fresh finding is a concrete **P1-043 coverage gap**: remote Yandex Journal-backup import performs the large persistent staging write inside offscreen `text-download` without participating in the service-worker/global persistent-storage preflight/reservation contract. Local file import, PDF cache and chunked export have explicit `ensureStorageBudget()`/`WEBCLIP_STORAGE_PREFLIGHT` calls; Yandex download staging does not.

The rest of the cross-queue pass confirms useful fail-closed behavior: hard queue caps generally reject **new** admission rather than evicting existing active checkpoints. The dangerous data-loss mechanisms remain the already registered TTL/dead-letter semantics, not the capacity checks themselves.

## Positive control — low-storage cleanup does not delete Journal/recovery stores arbitrarily

`ensureStorageBudget(requiredBytes, reason)` obtains a required `navigator.storage.estimate()` snapshot, adds the 32 MiB safety reserve, and if free space is low runs only the existing cleanup classes:

1. `cleanupTransferPayloads()`;
2. `cleanupExpiredPdfCache()`;
3. `cleanupExpiredOperationLogs(retentionHours)`.

It then obtains a fresh storage estimate. If the requested bytes + reserve still do not fit, it throws `WEBCLIP_STORAGE_QUOTA_LOW`.

The code explicitly does **not** delete functional Journal entries automatically to satisfy admission.

This is a valuable boundary. There is no fresh evidence that quota pressure itself scans/deletes `pendingDownloads`, active `pendingRemoteSaves`, Journal entries, or prepared Save As checkpoints merely to make room.

Therefore a new generic `storage pressure destroys recovery` item is not justified.

## P1-043 remains snapshot-only for persistent quota

Canonical P1-043 already records that `ensureStorageBudget()` has no global reservation between the estimate and the eventual write. Two concurrent large writers can both observe the same free bytes and each pass admission.

Fresh research reconfirms the concrete large-writer set:

- `putCachedPdf()` preflights anticipated PDF bytes;
- streaming import normalization preflights staged bytes + working reserve;
- `putTransferTextPayload()` preflights the text payload;
- chunked Journal export periodically preflights before groups of chunk writes;
- local Journal-file staging performs page-side `WEBCLIP_STORAGE_PREFLIGHT` before writing the selected File into transfer storage.

These calls remain snapshot-only; none reserves the promised bytes against other contexts.

## Fresh P1-043 coverage gap — Yandex backup `text-download` stages up to 50 MiB without persistent-storage preflight

### Worker flow

`fetchJournalBackupFromYandex()` obtains a signed download link and directly calls:

`runOffscreenSignedTransfer({ mode:'text-download', ..., maxChars: 50 * 1024 * 1024 }, { timeoutMs: 90_000 })`.

The fresh whole-worker inventory of `ensureStorageBudget(...)` call sites contains no preflight in this Yandex backup download path.

### Offscreen flow

Offscreen admission for `text-download` reserves against:

- `MAX_ACTIVE_SIGNED_TRANSFERS = 2`;
- `MAX_ACTIVE_SIGNED_TRANSFER_BYTES = 96 MiB`;
- up to the requested download cap, bounded to 50 MiB for Journal import.

This is a **memory/active-transfer reservation**. It follows the actual offscreen promise and is correctly retained if the service-worker caller times out or loses the response.

After the HTTP response arrives, `stageResponseBodyAsJournalImport()` streams the response into `WebClipOffscreenTransfers` records and finally writes a manifest. On error it best-effort deletes the partial payload group.

There is no corresponding persistent-origin quota reservation/preflight before these IndexedDB writes.

### Why offscreen transfer budget does not close P1-043

`activeSignedTransferBytes` measures the offscreen transfer/memory envelope. It does not subtract promised bytes from `navigator.storage.estimate().free` and does not coordinate with simultaneous large persistent writers in the service worker or Journal page.

A valid schedule remains:

1. free origin quota is only enough for one ~50 MiB staging operation plus safety reserve;
2. local file import or PDF cache writer A runs `ensureStorageBudget()` and passes;
3. Yandex backup download B is admitted by offscreen's independent signed-transfer budget;
4. A and B write into the same extension-origin persistent quota concurrently;
5. B can hit `QuotaExceededError` after downloading part/all of the remote backup, or A can fail after its earlier preflight despite both operations individually passing their local admission rules.

No silent Journal corruption is proven because partial offscreen staging is cleaned and replace-import is not admitted from a missing/failed manifest. The defect is global resource admission/truthfulness and avoidable late failure after expensive network/IDB work.

### Required P1-043 refinement

Remote backup `text-download` staging must participate in the same global storage reservation contract as local import/PDF/export writers.

A safe design should:

- reserve anticipated download staging bytes **before** offscreen starts materializing the response into IndexedDB;
- use the selected/fresh verified remote object size when P0-013 exact selection receipt supplies it; otherwise reserve the bounded maximum conservatively;
- carry a reservation/operation generation into offscreen staging rather than relying on an unrelated memory-transfer counter;
- account for the 32 MiB safety reserve once globally, not once independently per concurrent caller snapshot;
- release only after actual staging commit/abort/cleanup settlement;
- treat `QuotaExceededError` as a second fail-safe, not normal admission control;
- never reclaim Journal/recovery evidence merely to make a new optional import fit.

This naturally composes with P0-013: a fresh exact backup-object metadata read can provide trustworthy current byte size for both selection identity and quota admission.

## Local pending-download capacity — fail-closed admission is a positive control

`MAX_PENDING_LOCAL_DOWNLOADS = 100`.

Before creating a new pending local-download intent, `checkpointPendingLocalDownloadIntent()` counts existing rows in the `pendingDownloads` store. If capacity is reached it fails with:

`Слишком много незавершённых локальных загрузок WebClip; новая загрузка не запущена.`

It does not evict the oldest checkpoint to admit the new download.

This is the correct capacity shape for unknown browser side effects: preserve existing recovery authority and reject new irreversible work.

The known exception is identity collision from caller-selected `operationId` / `intent:<operationId>` reuse, already owned by P1-198 + P0-039/P0-048/P1-146. Capacity policy itself does not need a new number.

## Local pending-download TTL still destroys unresolved evidence after 24 hours — existing P0-039

Maintenance contains two explicit 24-hour deletion paths:

- unresolved intent cannot be bound to a DownloadItem within `PENDING_LOCAL_DOWNLOAD_TTL_MS`;
- bound numeric downloadId no longer resolves from `chrome.downloads.search()` and the checkpoint age exceeds the same TTL.

In both cases current code deletes the durable pending record, revokes the Blob URL and logs that no Journal entry was created.

Elapsed wall-clock time is not authoritative proof that an earlier non-cancellable `downloads.download()` start did not physically create/complete a file. This remains exactly the P0-039 evidence-retention defect; no duplicate item is created.

Required P0-039 architecture remains compact unresolved/dead-letter evidence rather than blind deletion after time.

## Remote-save active capacity — fail-closed, stale rows excluded from hot cap

`MAX_PENDING_REMOTE_SAVES = 20` counts non-`stale-unverified` rows.

For a new key, `checkpointPendingRemoteSaveIntent()` scans the store and rejects admission when the active count reaches 20. Existing active rows are not evicted to make room.

Rows already classified `stale-unverified` do not consume the hot active cap. This active/archive split is a useful positive control for recovery liveness.

The known row-generation overwrite problem when a checkpoint with the same `journalEntryId` already exists remains P0-073/P0-074/P1-184/P1-198 composition, not capacity policy.

## Remote stale archive still physically deletes unresolved evidence — existing P1-184

`cleanupStalePendingRemoteSaves()` retains the current 30-day / max-100 stale archive policy and physically removes older/excess `stale-unverified` rows.

The earlier remote stale-evidence research already establishes that `stale-unverified` is explicitly an unresolved external outcome. Age/capacity does not prove non-occurrence.

Therefore P1-184 still requires compact tombstones/evidence-eviction truth rather than interpreting archive pruning as `upload did not happen`.

No new capacity number is needed.

## Pending generic Journal append capacity — fail-closed and size-bounded

`pendingAppends` is capped at:

- 20 rows;
- 320 KiB per checkpoint;
- 4 MiB aggregate JSON characters.

Admission computes existing count/aggregate size and rejects a **new** checkpoint if either cap would be exceeded. Existing pending rows are not silently deleted.

Legacy queue migration also fails without deleting data when the legacy array exceeds the supported count.

This is the correct capacity policy. `safeAppendJournalEntry()` may still continue with a direct Journal append after checkpoint admission failed and returns an explicit warning if both checkpoint and append fail. That result does not justify a new recovery item because the newer irreversible download/Yandex flows use their own physical durable checkpoints/finalization contracts; generic pending-appends is not the sole physical-side-effect receipt.

## Prepared Save As cap — fail-closed, no oldest-session eviction

Prepared Save As session index is capped at 64.

`checkpointPreparedSaveAs(...)` reads/sanitizes the session index and rejects a **new session** with `WEBCLIP_PREPARED_SAVE_AS_LIMIT` when the index is full. It does not remove an existing live session to admit another.

This is correct capacity behavior and should be retained while P1-156/P1-169/P1-210 add owner/session reconciliation for orphaned PREPARED/STARTED generations.

The known outer PREPARE response-loss case can still consume the cap with ownerless sessions; that is P1-210 + P1-156 lifecycle, not a cap-policy defect.

## Transfer/import staging TTL — existing P1-035

Both transfer payloads and Journal import staging use 2-hour wall-clock cleanup. The prior active-lifetime research already proves a visible import confirmation can remain actionable while maintenance deletes its exact staging payload.

Storage preflight reuses these cleanup functions under low-quota conditions, so quota pressure inherits the same P1-035 lifetime defect for records already old enough to be called expired.

This does not create a separate quota root: fix P1-035 by binding active staging to a lease/explicit UI expiry, and make the low-quota cleanup call the same owner-aware policy.

## PDF cache TTL — existing P0-079 lifecycle requirement

`PDF_CACHE_TTL_MS = 24h`, and both retry lookup and maintenance remove expired cache generations.

Current cache is still tab-owned and does not carry the final P0-079 in-flight owner model. P0-079 already requires:

- immutable physical PDF generation;
- latest-retry pointer separate from body ownership;
- no tab/TTL/cleanup deletion while an admitted transfer/reconciliation still owns the generation;
- compare-and-delete by exact generation.

Storage-pressure cleanup must consume that owner-aware eligibility after P0-079 is implemented; it must not interpret age as permission to delete a body needed by an unresolved external attempt.

## OperationLog cleanup — diagnostics can be reclaimed, but active writer generations must remain ordered

`ensureStorageBudget()` may call `cleanupExpiredOperationLogs()` to reclaim diagnostics. This is reasonable because OperationLog is not authoritative Journal/recovery state.

However P1-197/P1-205 already prove that:

- retention may delete a still-running long operation solely by timestamp;
- queued old writers can recreate a deleted operation after retention/size cleanup;
- manual clear requires durable history epoch semantics.

Quota cleanup must therefore use the same active-generation/delete-write linearization rules. It cannot rely on current timestamp-only retention simply because the caller is storage preflight.

Again, this is a composition requirement, not a new quota item.

## Offscreen memory/transfer admission — positive actual-settlement ownership

Offscreen has explicit active signed-transfer reservations:

- max 2 active transfers;
- max 96 MiB aggregate reserved transfer bytes.

The reservation is created synchronously before `handleSignedTransfer()` and released in `.finally()` of the **actual offscreen transfer promise**. A lost/timed-out service-worker response therefore does not free offscreen capacity while fetch/IDB work is still running.

This is the correct actual-settlement pattern and should be reused conceptually for P1-043 persistent-byte reservations.

It does not close P1-054/P0-065 for Blob materialization because `registerBlobUrl(blob)` still receives an already materialized Blob; that separate pre-materialization memory-admission issue remains unchanged.

## P1-194 durability-class interaction

Even a perfect quota reservation cannot make ordinary IndexedDB eviction-proof.

P1-194 remains independent: when `navigator.storage.persisted()` is false, WebClip cannot call a successfully committed recovery row `guaranteed` against browser storage eviction. Quota capacity and durability class are conjunctive:

1. sufficient reserved quota for the write;
2. correct transaction commit;
3. truthful/required durability class for an irreversible side effect.

Do not treat one as proof of the others.

## Required deterministic regression matrix

### Global storage reservation / P1-043

1. Local file import reserves ~50 MiB; concurrent Yandex backup `text-download` attempts another ~50 MiB with only one operation worth of free space -> one is rejected/deferred **before** persistent materialization; both cannot pass stale snapshots.
2. PDF cache writer and Yandex backup download race the same free-space budget -> aggregate reservation remains within origin free bytes minus one shared safety reserve.
3. Two simultaneous Yandex `text-download` imports are admitted by offscreen memory count only when persistent quota reservation also permits both.
4. Known fresh remote backup size from P0-013 selection receipt is used for exact reservation; missing trustworthy size reserves bounded maximum rather than zero.
5. Worker response loss does not release a persistent-byte reservation while offscreen staging actual promise can still commit.
6. Offscreen staging abort/QuotaExceeded cleans partial group and releases only its own exact reservation after cleanup settlement.

### Capacity preservation

7. 100 local pending downloads -> 101st checkpoint is rejected before new download start; none of the first 100 is evicted to admit it.
8. 20 active remote-save checkpoints -> new distinct remote save is rejected/deferred; stale-unverified archive does not consume the active 20-slot budget.
9. Pending Journal append queue full -> existing rows remain intact; new checkpoint fails explicitly.
10. Prepared Save As index at 64 -> new PREPARED session fails; active sessions are not silently reclaimed.

### TTL/dead-letter ownership

11. Local DownloadItem outcome remains unknown after 24h -> P0-039 compact unresolved evidence survives; time alone does not erase identity.
12. Remote stale-unverified row exceeds archive time/count -> P1-184 compact evidence/explicit eviction state survives instead of false negative settlement.
13. Live import confirmation crosses 2h -> P1-035 owner lease keeps payload valid or UI explicitly expires; low-storage preflight cannot silently delete behind enabled Proceed.
14. In-flight PDF generation/remote attempt crosses cache TTL -> P0-079 owner generation prevents body deletion until physical owner releases.
15. Active long Save As/operation cannot have its only OperationLog history removed solely because retention timestamp elapsed; P1-197 owner/epoch policy dominates diagnostics cleanup.

### Durability

16. `persisted=false` + successful checkpoint commit -> P1-194 UI/log remains best-effort, not `recoveryGuaranteed` solely from commit.
17. Global quota reservation success does not override P1-194 durability-class requirement.

## Duplicate check / numbering

No new P-number is assigned.

- Fresh implementation coverage refinement: **P1-043** must include Yandex/offscreen `text-download` persistent staging.
- Existing TTL/evidence owners remain **P0-039**, **P1-035**, **P0-079**, **P1-184**, **P1-197/P1-205**.
- Offscreen memory reservation remains **P1-054/P0-065** territory.
- Durability class remains **P1-194**.
- Prepared Save As orphan/cap pressure remains **P1-156/P1-169/P1-210**.

P1-211 remains unassigned by this block.

## Test / release state

No runtime/config/manifest changes were made. Product tests were not rerun. The last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.

## Retired source: `RESEARCH_DELTA_REMOTE_CHECKPOINT_ATTEMPT_AGE_INHERITANCE_2026-08-28.md`

SHA-256 of UTF-8 source text: `16ab57552dba5f3ef09a115dc28cce571e783b8617a983f4f7a1bbbdcf633025`

# Research delta — remote checkpoint attempt-age inheritance — 2026-08-28

Source-of-truth `main` immediately before this write: `3139c9da05a26c88c36087f1c606f88defba5648`.

Docs-only research checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof adds a concrete lifecycle consequence to the existing immutable `pendingRemoteSaves` generation defect owned by **P1-184 + P0-074/P0-073**, with P0-079/P1-198 as attempt/content identity dependencies.

A newer physical attempt currently inherits the `createdAt` of the older row it overwrites. Recovery then uses that inherited timestamp as stale-classification authority. Therefore attempt B can be born already older than the stale threshold because it reused attempt A's Journal-id slot.

No new P-number is needed; this is another direct symptom of missing per-physical-attempt generation isolation.

## Current overwrite preserves old age

`checkpointPendingRemoteSaveIntent()` addresses the physical store by `item.id = journalEntryId`.

When an existing active row is present and is neither `remote-verified` nor `stale-unverified`, the transaction writes the new item approximately as:

`{ ...item, createdAt: Number(existing.createdAt || now) }`.

So most B fields become the new attempt's metadata, but its lifecycle birth time remains A's birth time.

The special stale-unverified retry branch does reset `createdAt: now`, which shows that the code already recognizes age as meaningful lifecycle state. The ordinary active-overwrite branch nevertheless carries old age into a distinct physical attempt.

## Recovery uses `createdAt` as physical-attempt stale evidence

`recoverPendingRemoteSaves()` computes:

`ageMs = Date.now() - Number(item.createdAt || item.updatedAt || 0)`

and when reconciliation returns 404, it can classify a row `stale-unverified` once both are true:

- age >= `PENDING_REMOTE_STALE_AFTER_MS` (24 hours);
- next attempt count >= `PENDING_REMOTE_STALE_MIN_ATTEMPTS` (6).

Those thresholds are already imperfect evidence semantics under P1-184, but even as a scheduling/archive heuristic they must describe the **same physical attempt generation**.

With current overwrite they do not.

## Deterministic age-inheritance schedule

1. Attempt A for Journal id J is prepared at time T0.
2. A remains active/unresolved for >24 hours.
3. User deliberately retries/restarts the same cached save, creating physical attempt B at T1 > T0+24h.
4. Because the physical key is still J and A is an active row, checkpoint admission writes B data while preserving `createdAt=T0`.
5. B has existed for seconds, but recovery computes `ageMs > 24h` immediately.
6. After B accumulates the minimum 404 checks, B can transition to `stale-unverified` without ever having lived through the intended 24-hour observation window.

The system therefore applies A's wall-clock history to B's external settlement.

## Attempt counters can become semantically mixed too

The replacement item normally resets fields from the newly prepared object, while later failure/recovery mutations increment whichever row currently occupies J.

Because the row does not have an immutable physical generation, there is no authoritative statement that:

- this `createdAt`;
- this `attemptCount`;
- these 404 observations;
- this account/root/path/content receipt

all belong to one external PUT/reuse attempt.

A lifecycle threshold over mixed-generation evidence is not meaningful.

## Why this matters even after changing stale retention wording

Prior researchs already require that `stale-unverified` remain unresolved evidence rather than a proven negative. That avoids false certainty, but premature staling still has product consequences:

- the row stops consuming the active recovery cap;
- normal automatic recovery behavior changes;
- later retry can replace the stale row, potentially erasing/compacting evidence according to current generation defects;
- UI/OperationLog may present the attempt as old/unresolved even though the latest physical attempt is new;
- retention age calculations can eventually become detached from the physical attempt they describe.

Therefore generation-correct clocks remain required even when stale classification is made truthfully non-terminal.

## Required generation contract

Every immutable `remoteSaveGenerationId` must own its own lifecycle fields:

- `createdAt` = durable admission time of that exact physical generation;
- transfer-started/unknown timestamp;
- verification attempt count for that generation;
- last checked/error timestamps;
- stale/archive transition timestamp;
- account/root/config/publication/PDF/content receipts for the same generation.

A new physical B generation never inherits A's created/attempt clock merely because both target the same Journal id or same PDF logical save intent.

A user-facing latest-retry pointer may retain logical ancestry (`retryOf=A`) for diagnostics, but ancestry is not age inheritance.

## Recovery observations must be generation-local

A 404 or metadata result is evidence only for the exact generation/context/path queried.

If B is a new physical attempt:

- B's retry budget starts with B;
- B's age starts with B;
- A's previous 404s/age remain attached to A;
- archive policy may consider A and B independently or via an explicit family-level budget, but must not silently merge their physical settlement evidence.

## Capacity policy

Per-generation timestamps do not imply unbounded retries. Preserve hard aggregate admission caps.

If product policy wants a family-level maximum lifetime for repeated retries of one logical save, model that as a separate explicit `logicalSaveCreatedAt`/retry-family policy. Do not overload physical attempt `createdAt` with two meanings.

This distinction is important:

- logical intent age answers “how long has the user/save saga existed?”;
- physical generation age answers “how long has this external attempt's outcome been unresolved?”.

Only the second may be used to classify evidence about that attempt.

## Required regressions

1. A is 25h old; B starts now for same Journal id -> B physical `createdAt` is now, not A's timestamp.
2. Six immediate B 404 checks cannot satisfy a 24h B-age threshold.
3. A's age/404 counters remain attached to A after B begins.
4. A late result cannot increment/reset B counters or stale B.
5. B late result cannot change A archive age/state.
6. Retry from `stale-unverified` and retry from active-unresolved both produce fresh physical generations with explicit ancestry rather than row replacement semantics.
7. Same account/root/path and same PDF content still produce separate physical attempt clocks when two actual external attempts were admitted.
8. If no new external side effect is admitted and product is merely reconciling the **same** generation, its original createdAt/attempt history is retained.
9. Family-level rate/age caps, if introduced, are tested independently from physical-attempt stale classification.
10. Archive compaction never treats inherited logical age as proof that a new physical attempt is old.

## Duplicate check

- **P1-184** owns exact remote attempt/object/content reconciliation and truthful unresolved evidence.
- **P0-074/P0-073** require immutable Yandex operation/namespace generation.
- `RESEARCH_DELTA_YANDEX_REMOTE_CHECKPOINT_GENERATION_2026-08-27.md` already requires a unique physical `remoteSaveGenerationId`.
- `RESEARCH_DELTA_REMOTE_CHECKPOINT_FALSE_ADMISSION_RECEIPT_2026-08-28.md` covers fictional admission/phase overwrite; this checkpoint adds **cross-generation lifecycle-clock contamination**.

No P1-211 is created.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains **88/88 syntax + 74/74 deterministic PASS**. No build/tag/Release was created.

## Retired source: `RESEARCH_DELTA_REMOTE_CHECKPOINT_FALSE_ADMISSION_RECEIPT_2026-08-28.md`

SHA-256 of UTF-8 source text: `f20ebb73a5e76af8da386eae521460656a9ec7b26a2d2218dfbcc2b9c61b0cf3`

# Research delta — remote checkpoint false admission receipt / archive reactivation — 2026-08-28

Source-of-truth `main` immediately before this write: `a37518c806a620bde610a54fb72da241ec2df131`.

Docs-only research checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof refines the already established immutable remote-save generation contract owned by:

- **P0-074** — immutable Yandex operation/config generation;
- **P0-073** — exact account/root namespace binding;
- **P1-184** — exact remote object/content/attempt reconciliation;
- with **P0-076**, **P0-079**, **P0-078** and **P1-198** as required composition.

It also composes with the existing stale-evidence/cleanup checkpoints: archived unknown external evidence must not be silently replaced or deleted merely because a newer retry exists.

## Existing physical-key problem

`checkpointPendingRemoteSaveIntent()` still uses `prepared.journalEntryId` as the physical `pendingRemoteSaves` key.

There is no immutable `remoteSaveGenerationId` that independently identifies one physical PUT/reuse/verify attempt.

The helper's behavior when the key already exists is phase-dependent:

- active/non-terminal row -> replace with the new `item`, retaining original `createdAt`;
- `stale-unverified` -> replace with the new `item` and fresh `createdAt`;
- `remote-verified` -> preserve/spread the existing row and only refresh `updatedAt`/possibly `operationId`.

After the transaction, however, the function unconditionally returns its local **new `item`**, not the row actually committed/preserved in IndexedDB.

This produces a fresh false-admission manifestation beyond ordinary row overwrite.

## Fresh proof — `remote-verified` branch can return a checkpoint that does not exist

Deterministic schedule:

1. Remote attempt A for Journal id J reaches durable `phase='remote-verified'`, but local Journal finalization/cleanup has not yet removed the row.
2. User/product starts another attempt B that reuses J.
3. `checkpointPendingRemoteSaveIntent(B)` reads A.
4. Because A is `remote-verified`, the transaction keeps A's durable row; it does **not** write B's PREPARED metadata/account/root/path/content receipt as a new physical generation.
5. The helper nevertheless returns local `item B` with `phase='prepared'` to the caller.
6. Caller B now believes its `ensureRemoteCheckpoint()` succeeded and may continue toward reuse/upload/publication/verification.
7. If B starts an irreversible remote side effect and the worker dies, recovery has no durable B generation. IndexedDB still contains A-shaped verified evidence at J.

The successful return from checkpoint admission is therefore not proof that the returned attempt owns a durable recovery row.

## `operationId` mutation makes the preserved A row less truthful

For an existing `remote-verified` row the code can preserve A's data/object fields while replacing its top-level `operationId` with B's textual operation id.

Even before P1-198 replaces textual ids with worker receipts, this can create a contradictory record:

- A's remote-verified object/data;
- B's operation correlation label;
- no durable B PREPARED generation.

OperationLog/progress attribution can therefore suggest B owns evidence physically produced by A.

A worker-issued receipt must be immutable with the physical generation; a later retry cannot relabel an already verified attempt.

## Capacity consequence

New checkpoint admission normally counts active non-`stale-unverified` rows and rejects when `MAX_PENDING_REMOTE_SAVES=20` is reached.

But the `existing` branch returns before the new-row active-capacity scan.

For B sharing J with A:

- no distinct durable B row is counted;
- the helper still reports checkpoint success to B;
- B can therefore begin additional remote work while the durable recovery store represents only A.

The problem is not simply that the numerical cap is off by one. The deeper invariant is that **every irreversible remote attempt admitted by the product must first own one exact durable generation that is included in admission/accounting**.

## `stale-unverified` branch has the inverse evidence problem

When A is `stale-unverified`, retry B replaces A with `{...itemB, createdAt:now}`.

That does create a B-shaped active row, but it destroys A's unresolved external evidence in the same physical slot.

This is already covered by the remote stale-evidence/generation deltas. The contrast is important:

- stale branch: B becomes durable by erasing A;
- verified branch: A remains durable while B falsely believes it became durable.

Both failures are eliminated by immutable per-attempt generations rather than phase-specific overwrite rules.

## Required unified admission contract

Before any external side effect B can start:

1. allocate a unique immutable remote-save generation/receipt RB;
2. durably commit RB with exact operation receipt, Journal target generation, PDF/content receipt, account/root/config generation, remote path and publication-policy generation;
3. return **the exact stored receipt RB**, not merely the caller's proposed object;
4. include RB in active/global capacity accounting until its physical settlement is known or it transitions to a compact unresolved-evidence class;
5. every later verify/failure/stale/finalize/delete transition must compare RB inside the authoritative transaction.

A previous A may coexist with B when A's external result remains relevant. A user-facing latest-retry pointer may point to B, but it cannot substitute for physical ownership rows.

## Terminal/archived generations

`remote-verified` should be treated as a physical generation that already owns remote object proof, not as a convenient shared Journal-id slot for a new attempt.

`stale-unverified` should remain unresolved evidence and may be compacted according to the P1-184 retention design, but a new attempt cannot destroy its last receipt merely to reuse J.

If product semantics determine that no second physical attempt should be admitted while a verified generation awaits Journal finalization, return an explicit existing-generation/reconcile result. If a second attempt is intentionally allowed, allocate RB separately. Both are safer than returning a fictional PREPARED B.

## Required deterministic regressions

1. A is remote-verified at J; B requests checkpoint J -> B either receives/reconciles exact A explicitly or obtains distinct durable RB. It never receives a PREPARED receipt whose row does not exist.
2. Same schedule + worker crash after B external admission -> recovery can enumerate B's exact generation; B is not lost behind A.
3. A's verified row cannot have its operation receipt relabeled to B merely because B reused J.
4. Active queue at capacity + B reusing an existing J cannot bypass admission/accounting and start an unrepresented external attempt.
5. A stale-unverified + B retry -> B may become latest retry but A's compact unresolved evidence remains separately addressable until legitimate resolution/retention transition.
6. Late A verify/failure/cleanup cannot mutate/delete RB.
7. B verify cannot write B object proof into A's verified generation.
8. A and B under different account/root/publication-policy generations remain fully separable after restart.
9. Journal finalization accepts only its exact remote-save receipt plus expected Journal generation; existence of any row sharing J is insufficient.
10. A terminal verified generation may be cleaned only after exact Journal/local reconciliation; cleanup cannot remove a newer B generation.

## Duplicate check

No new item is created. The missing invariant is the same immutable remote-attempt generation already required by `RESEARCH_DELTA_YANDEX_REMOTE_CHECKPOINT_GENERATION_2026-08-27.md` and composed with stale-evidence retention/reactivation deltas.

This checkpoint adds a concrete acceptance condition: **checkpoint admission success must correspond to the exact durable row/generation returned to the caller.** A phase-specific preserve/overwrite branch may not return a fictional new receipt.

## Test / release state

No product tests were rerun for this docs-only checkpoint. Historical product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime/version remain unchanged (`0.9.8`). No build, tag or Release was created.

## Retired source: `RESEARCH_DELTA_REMOTE_RECOVERY_PHASE_FAIRNESS_2026-08-28.md`

SHA-256 of UTF-8 source text: `f33d02aeedec721b370cd38dc87da035afd6d82ded65fd8deb2c6935a90096ac`

# Research delta — pending remote-save phase fairness — 2026-08-28

Source-of-truth `main` immediately before this write: `b092791f1916368abc79e2570a8b6850957dc257`.

Docs-only research checkpoint. Production runtime, configuration, tests and `manifest.json` are unchanged by this commit. Product tests were not rerun.

## New confirmed item: P1-208 — bounded `pendingRemoteSaves` recovery can starve `remote-verified` local finalization behind auth-blocked PREPARED rows

**Classification:** P1 / evidence-reserved / confirmed by fresh runtime research.

This item owns recovery **scheduling/fairness across durable phases**. It does not replace the existing correctness owners for remote identity, auth semantics or exact settlement proof.

## Fresh source proof

### 1. Recovery reads only the oldest bounded prefix

`listPendingRemoteSaves(maxItems)` reads `JOURNAL_PENDING_REMOTE_STORE` through the `updatedAt` index in ascending order and stops when it has collected `maxItems` active rows.

`recoverPendingRemoteSaves(trigger, maxItems = 6)` further caps that value to six.

Therefore each maintenance pass can inspect only the six oldest active rows selected by `updatedAt`.

The bounded batch is desirable for MV3/API/runtime limits. The defect is not the cap itself; it is lack of fair/phase-aware progress within that cap.

### 2. Authentication is checked once for the whole pass

At the start of recovery the worker executes the equivalent of:

- `authAvailable = true`;
- `getValidYandexAccessToken()`;
- on failure, `authAvailable = false`.

That is a useful fail-closed gate for rows that still require Yandex API access.

### 3. PREPARED rows are deferred unchanged when auth is absent

Inside the loop, for every row whose phase is not `remote-verified`, recovery checks `authAvailable`.

If auth is unavailable it only increments the local `deferred` counter and `continue`s.

The durable row is not:

- moved behind unexamined work;
- assigned a `nextAttemptAt`/fairness cursor;
- given a new scheduling revision;
- removed from the active prefix;
- converted to a distinct auth-blocked queue class.

Its `updatedAt` remains unchanged.

Therefore the same old auth-blocked PREPARED rows remain at the head of the `updatedAt` index on every later maintenance pass.

### 4. `remote-verified` rows do not require OAuth to finish their local Journal append

A `remote-verified` row bypasses the auth-dependent Yandex reconciliation block.

Recovery proceeds to `appendJournalEntryFromDurableCheckpoint(current.data, ..., { storeName: JOURNAL_PENDING_REMOTE_STORE, key: id })`.

That step is local IndexedDB Journal finalization. If the source checkpoint still exists and append succeeds, recovery removes the remote checkpoint and counts the item as recovered.

Thus a `remote-verified` row is materially different from PREPARED rows during an auth outage: its remaining work can be completed without a Yandex access token.

### 5. Deterministic permanent starvation schedule

A valid persistent schedule is:

1. R1..R6 are old active PREPARED checkpoints and sort first by `updatedAt`.
2. V7 is newer and already `phase:'remote-verified'`; its remote side effect was proven and only local Journal append remains.
3. Browser/session restarts, so the session-only Yandex access token is gone while Journal IndexedDB checkpoints survive.
4. Hourly maintenance calls `recoverPendingRemoteSaves()`.
5. The bounded scan selects only R1..R6.
6. `getValidYandexAccessToken()` fails; all six are deferred with no durable scheduling update.
7. V7 is never read.
8. Every later pass repeats steps 5–7 indefinitely until the user happens to reauthorize.

Nothing about V7 itself requires reauthorization. Its local Journal finalization is starved solely because unrelated older phases monopolize the bounded prefix.

### 6. Existing stale-attempt logic does not guarantee rotation during auth outage

Ordinary remote verification failures can update attempt/error/timestamps and eventually move work or archive repeated unresolved rows.

Auth-unavailable deferral does not perform such a transition. It intentionally avoids treating lack of credentials as a failed remote attempt.

That correctness decision is good, but without separate scheduling metadata it also means the oldest auth-blocked rows can remain permanent prefix occupants.

## Why this is not P1-064

`RESEARCH_DELTA_LOCAL_DOWNLOAD_RECOVERY_FAIRNESS_2026-08-27.md` correctly refines **P1-064** for the local `pendingDownloads` queue: twelve old `in_progress` DownloadItems can monopolize the oldest bounded batch and starve a later terminal item.

That delta included a positive-control statement that `pendingRemoteSaves` did not exhibit the same permanent-head behavior on ordinary failures because failure handling updates `updatedAt`, and that auth-unavailable deferral affected remote items uniformly.

Fresh phase research shows the latter assumption is incomplete: auth deferral is **not uniform across recovery phases**, because `remote-verified` rows need no auth at all.

The two queues have analogous fairness requirements but separate durable state machines, side-effect semantics and caps. Extending P1-064 from Chrome-download reconciliation to Yandex remote-save phase scheduling would blur those boundaries and its existing acceptance language. Therefore a separate P1-208 is warranted.

## Why this is not P1-195 / P1-196

- **P1-195** owns truthful OAuth capability/scope representation.
- **P1-196** owns token validity/lifetime and generation-fenced invalid-token demotion.

Even with a perfect `authAvailable` model, the queue can still starve if auth is truthfully absent. P1-208 begins **after** auth classification: it decides which durable recovery phases receive bounded service.

## Why this is not P1-184 / P0-074

- **P1-184** owns exact local-content / transfer-attempt / remote-object proof and unknown settlement.
- **P0-074** owns immutable Yandex auth/config/account/root operation generation.

Those identities determine whether a row is safe to reconcile/finalize. P1-208 determines whether a safe-to-finalize row is ever reached by bounded maintenance.

Fairness must never weaken those proof requirements.

## Required P1-208 contract

### Phase-aware bounded scheduling

Keep recovery globally bounded, but classify at least:

1. `remote-verified` — no further Yandex API authority needed; local Journal finalization/revision check only;
2. active PREPARED/transfer-unknown rows requiring remote reconciliation and valid auth;
3. auth-blocked rows waiting for user/session capability;
4. stale/dead-letter evidence that is outside the hot recovery queue.

A bounded pass must not let class 3 permanently block class 1.

### Local-finalization priority

`remote-verified` rows should receive a small guaranteed service budget or otherwise be prioritized ahead of work that cannot progress under current auth state.

This does not mean unlimited scanning. Acceptable architectures include:

- a phase index plus bounded per-phase quotas;
- a durable fair scan cursor;
- separate local-finalization and auth-required queues/indexes;
- `nextAttemptAt` scheduling metadata that moves auth-blocked rows out of the immediately eligible prefix without classifying them as failures.

### Durable fairness across MV3 restarts

In-memory rotation alone is insufficient. Browser/worker restart is one of the most natural ways to lose the session token, so the scheduling rule must survive the same restart that creates the starvation condition.

### Auth-blocked is not failed settlement

Do not increment remote-settlement failure attempts, mark stale, or erase evidence merely to rotate an item whose only blocker is missing credentials.

If scheduling metadata is changed, keep it distinct from provider-attempt counters and remote settlement evidence.

### No blind retry

Fairness changes which row is inspected; it does not authorize a new signed PUT or destructive remote operation.

PREPARED/unknown rows remain subject to P1-184/P0-074 exact reconciliation and no-blind-retry rules.

### Exact local finalization still revalidates ownership

A `remote-verified` row may finalize only if its exact durable checkpoint/generation still has Journal authority. Clear/import or a newer generation must cancel stale local append per P0-076 and the remote-checkpoint generation contract.

## Required deterministic regressions

1. Six older PREPARED rows + no Yandex token + one newer `remote-verified`: the verified row is finalized within a bounded number of maintenance passes without reauthorization.
2. Same topology survives MV3/browser restart; session token is absent and verified local finalization still progresses.
3. Twenty mixed active rows with persistent auth outage: every eligible `remote-verified` row receives service within a defined bounded number of scans.
4. Auth-blocked PREPARED rows remain durable and are not falsely marked remote-failed/stale merely to achieve fairness.
5. Reauthorization later resumes the auth-required rows with their original exact operation/account/root/content receipts; no duplicate signed PUT is introduced by the scheduler.
6. `remote-verified` row removed by concurrent clear/import before append is cancelled, not resurrected.
7. One slow/failing remote reconciliation row cannot monopolize every future six-item batch.
8. The existing global recovery deadline (`~120 s`) and per-pass item/API bounds remain enforced.
9. Stale/dead-letter evidence retention rules from P1-184 remain unchanged; fairness does not delete unresolved evidence.
10. During auth outage no Yandex API mutation is attempted on behalf of deferred rows solely to rotate the queue.
11. If all active rows require auth and auth is absent, maintenance remains bounded and reports truthful `authRequired/deferred` state without busy-looping.
12. A verified row whose Journal entry already exists is idempotently finalized/cleaned without being blocked by older auth-required work.

## Positive controls retained

- The recovery batch remains intentionally bounded rather than materializing the entire durable queue.
- Missing auth remains fail-closed for work that actually requires Yandex access.
- `remote-verified` does not automatically imply current Journal authority; durable checkpoint/generation checks still apply.
- Stale unresolved remote evidence remains a separate retention problem owned by P1-184.

## Number allocation

- New evidence-reserved **P1-208** is assigned by this research block.
- No P0 or P2 number is assigned.
- This does not renumber any previously reserved item.

## Test / release state

Research documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were not rerun; the last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`. No build, tag or GitHub Release was created.

## Retired source: `RESEARCH_DELTA_REMOTE_STALE_CLEANUP_REACTIVATION_2026-08-28.md`

SHA-256 of UTF-8 source text: `aa3c8658584ff37f5ab3e0d40efc39d8df95d954d381ac19771ee2e72054a577`

# Research delta — remote stale cleanup vs reactivation generation — 2026-08-28

Source-of-truth `main` immediately before this write: `a1a5bf8143508218979b97c5cf7b0e6f219ede8a`.

Docs-only research checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. This file does not assign a new P-number.

## Classification

Fresh source proof strengthens the already existing remote-save generation contract rather than creating a new item.

Primary owners remain:

- **P0-074** — immutable Yandex auth/config/account/root operation generation and generation-fenced remote checkpoint transitions;
- **P1-184** — exact remote object/content/attempt reconciliation and preservation of unresolved external side-effect evidence;
- **P0-073** — account/root namespace identity;
- **P0-076** — stale Journal generation cannot regain local finalization authority.

It composes with **P0-079** because a reactivated retry must still own one exact immutable PDF/content generation.

The existing `RESEARCH_DELTA_YANDEX_REMOTE_CHECKPOINT_GENERATION_2026-08-27.md` already requires generation-aware compare-and-delete cleanup. This checkpoint adds a deterministic source schedule showing why that requirement applies not only to late operation completion, but also to background stale-retention cleanup itself.

## Fresh source proof

### 1. Stale cleanup selects rows in one transaction and deletes them later in another

`cleanupStalePendingRemoteSaves()` performs two separate IndexedDB transactions.

First it opens `JOURNAL_PENDING_REMOTE_STORE` readonly, walks the `updatedAt` index and collects only stale rows into an in-memory array containing approximately:

- `key: cursor.primaryKey`;
- `staleAt`.

After that transaction has completed and closed, JavaScript computes `removeKeys` from:

- stale rows older than the 30-day retention cutoff;
- oldest excess rows above `MAX_PENDING_REMOTE_STALE_SAVES`.

Only afterward does the function open a new readwrite transaction and execute:

`pending.delete(key)`

for every selected key.

There is no phase re-read, expected generation, stale timestamp comparison, or compare-and-delete check in the deletion transaction.

### 2. A user retry can reactivate the same physical key between the two cleanup phases

`checkpointPendingRemoteSaveIntent()` uses `prepared.journalEntryId` as the physical `pendingRemoteSaves` key.

When an existing row at that key has `phase === 'stale-unverified'`, the retry path deliberately reactivates it by replacing that row with a fresh PREPARED `item` at the same key.

The replacement changes the semantic owner from archived unresolved attempt A to a new active retry attempt B, but the physical key is unchanged.

### 3. The old cleanup decision then deletes the new active checkpoint

A deterministic schedule exists:

1. row `J/A` is `stale-unverified` and old enough / excess enough for cleanup;
2. stale-cleanup readonly scan records only key `J` in its in-memory candidate set;
3. that readonly transaction completes;
4. user starts retry B for the same Journal entry;
5. `checkpointPendingRemoteSaveIntent()` sees stale `J/A` and writes fresh active PREPARED `J/B` at key `J`;
6. stale cleanup resumes and opens its deletion transaction;
7. it executes blind `delete(J)` based on the old scan;
8. `J/B` — not the stale A row that justified cleanup — is physically deleted.

This is a classic scan/act generation race. IndexedDB transaction isolation does not save it because selection and deletion are intentionally separated by an arbitrary asynchronous interval.

### 4. This can cross the irreversible signed-transfer boundary

The remote-save flow correctly creates its durable checkpoint before the signed upload body is handed to offscreen.

That positive ordering means retry B can validly proceed after step 5 toward the signed PUT while background cleanup independently executes step 7.

Depending on timing:

- cleanup can delete B immediately before the PUT is admitted;
- cleanup can delete B while the PUT is in flight;
- cleanup can delete B after the external file has committed but before B records verification/final Journal state.

The external operation may therefore exist or be outcome-unknown while the newly created pre-side-effect recovery evidence has been removed by a cleanup decision that belonged to stale attempt A.

A later B success/failure handler then sees no checkpoint; recovery after MV3 restart likewise has no active B row.

### 5. Capacity cleanup has the same race as age cleanup

The defect is not limited to the 30-day cutoff.

Rows selected solely because there are more than `MAX_PENDING_REMOTE_STALE_SAVES` are also reduced to bare keys before the later delete transaction. Such a key can be reactivated in exactly the same window.

Therefore both retention-age and capacity-pressure pruning require the same generation/phase CAS.

## Related recovery manifestation

`recoverPendingRemoteSaves()` also treats an existing Journal row with the same textual `journalEntryId` as sufficient reason to delete the pending remote checkpoint.

That is safe only after the exact Journal/remote-save generation model from P0-076/P0-074 exists. A replacement/imported Journal entry that happens to reuse the same textual id is not proof that the old external attempt was finalized into that exact entry generation.

This is not assigned a second number: it is another same-key/same-id authority manifestation of the existing generation contract.

## Required refinement

### Stale cleanup must compare the exact stale generation inside the delete transaction

A stale candidate needs a bounded immutable receipt, for example:

- `remoteSaveGenerationId`;
- expected `phase === 'stale-unverified'`;
- expected stale/archive revision or `staleAt`;
- optionally the exact compact unresolved-evidence generation once P1-184 is implemented.

The readwrite cleanup transaction must re-read each candidate and delete/compact it only when the stored row still matches that exact stale generation and phase.

If the row was reactivated/replaced, cleanup skips it. A skipped row must not be reported as deleted.

### Prefer immutable physical attempt rows

The stronger architecture already required by the remote-checkpoint generation research remains preferable:

- immutable physical key per remote-save generation;
- a separate latest-retry pointer by Journal entry;
- stale cleanup addresses the immutable A generation, so creating B cannot turn `delete(A)` into `delete(B)`;
- compare-and-delete still protects against phase changes within the same generation.

### Cleanup statistics and bounds

Retention/cap accounting must reflect committed decisions after revalidation.

If many stale candidates are reactivated while cleanup runs, maintenance may finish with fewer deletions than originally planned and retry the bound on a later cycle. It must not delete current active rows merely to satisfy the old snapshot's target count.

### Unknown external outcomes remain evidence

Composition with the existing remote stale-evidence retention research remains required: pruning a full stale row may compact it, but capacity/age is not proof that an unknown signed PUT never happened.

The generation fix here prevents deleting a newer live attempt; P1-184 separately defines what unresolved older evidence may be compacted/forgotten.

## Required deterministic regressions

1. Cleanup scans stale A at key J; retry B reactivates J before cleanup write phase; cleanup cannot delete B.
2. Same schedule where B's signed PUT has already been admitted before cleanup write phase: B checkpoint remains present for settlement/recovery.
3. Same schedule where B commits remotely and worker restarts before local verification: recovery retains B generation and can reconcile it.
4. Age-based candidate A changes phase/generation before delete: cleanup skips it and does not increment deleted count.
5. Capacity-excess candidate A changes phase/generation before delete: same fail-closed behavior.
6. Immutable A and B generations coexist: cleanup/compaction of stale A cannot touch active B even when they share one `journalEntryId`.
7. Late A completion/cleanup still cannot modify or delete B, preserving the existing remote-checkpoint-generation tests.
8. Clear/import can revoke B's Journal-finalization authority without erasing unresolved external-attempt evidence required for reconciliation.
9. Existing Journal entry with same textual id but different Journal generation does not cause an old remote checkpoint to be treated as finalized.
10. Repeated cleanup/retry races remain globally bounded and eventually converge without deleting active generations.

## Duplicate check / numbering

No new P-number is assigned.

- **P0-074** owns exact remote-save generation transitions and compare-and-delete cleanup.
- **P1-184** owns unresolved remote object/content evidence and its bounded retention.
- **P0-076** owns exact Journal generation/finalization authority.
- **P0-079** owns immutable local PDF/content generation consumed by the retry.

This is specifically not a new `P0-080` or `P1-208`.

## Test / release state

Research documentation only. No runtime/config/manifest change was made. Product tests were not rerun; the last proven product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Version remains `0.9.8`; no build, tag or GitHub Release was created.

## Retired source: `RESEARCH_DELTA_REMOTE_STALE_CLEANUP_REACTIVATION_CAS_2026-08-28.md`

SHA-256 of UTF-8 source text: `501d0542444b5e709e7c2ef676cd13014cd00e510ec970c540c5f6300c11cd0c`

# Research delta — stale remote-checkpoint cleanup vs retry reactivation CAS — 2026-08-28

Source-of-truth `main` before this checkpoint: `689aab11c405a6382a360009847615f9360cd247`.

Docs-only research checkpoint. Runtime/tests/config/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh source proof refines **P1-184/P0-074** remote attempt-generation ownership and the existing stale-evidence/cleanup contract. It composes with **P1-173**, **P1-043** and the compact detached-evidence retention model.

The new issue is a concrete two-transaction TOCTOU: maintenance decides that a stale key is deletable in one IndexedDB transaction, then later deletes by key in another transaction without proving the row is still the same stale generation. A user retry can reactivate the key between those transactions and lose its new active checkpoint.

## Current cleanup is snapshot-then-delete

`cleanupStalePendingRemoteSaves()` currently:

1. opens a readonly IndexedDB transaction over `pendingRemoteSaves`;
2. enumerates rows and builds an in-memory `stale` array containing key/stale timestamps;
3. after that transaction completes, computes `removeKeys` from age and the `MAX_PENDING_REMOTE_STALE_SAVES` cap;
4. opens a separate readwrite transaction;
5. deletes each selected key.

The deletion phase is keyed only by the physical store key. It does not re-read and compare:

- phase still equals `stale-unverified`;
- stale generation/nonce is unchanged;
- `staleAt/updatedAt` still belongs to the snapshot;
- no newer retry generation has taken ownership of that key.

## Current retry can reactivate the same key

`checkpointPendingRemoteSaveIntent()` uses `journalEntryId` as the physical key.

When an existing row is `stale-unverified`, current code replaces it with a fresh PREPARED item and resets `createdAt` to now.

Thus maintenance cleanup and an explicit user retry can legally touch the same key with opposite lifecycle intentions:

- cleanup wants to evict old stale generation A;
- retry wants to create/reactivate active generation B.

The existing immutable remote-generation researchs already require A and B eventually to be separate generation identities. Current source still reuses the physical key, making the race immediately destructive.

## Deterministic reactivation-loss schedule

1. Journal id J has `pendingRemoteSaves[J] = A`, phase `stale-unverified`, old enough for retention/pressure deletion.
2. Maintenance cleanup readonly transaction observes A and records key J in its stale snapshot.
3. The readonly transaction commits.
4. Before cleanup opens its delete transaction, the user explicitly retries the cached PDF.
5. `checkpointPendingRemoteSaveIntent(B)` reads J/A and executes the stale branch, writing fresh active PREPARED B at key J.
6. Retry B returns and may continue toward external side-effect admission.
7. Maintenance resumes with its old `removeKeys={J}` decision.
8. Cleanup's readwrite transaction executes `delete(J)` without rechecking phase/generation.
9. B's new durable checkpoint disappears even though B was not stale and was not part of the cleanup decision.
10. If B then performs/has performed a Yandex side effect, the exact durable recovery receipt can be missing after the external operation.

No worker restart, provider anomaly or collision is required.

## Why IndexedDB transaction serialization does not solve the race

IndexedDB serializes the individual transactions.

It does not make the logical pair

`readonly eligibility snapshot -> later readwrite delete`

atomic.

The retry transaction can correctly serialize between them. The problem is that cleanup does not validate its stale decision after that intervening commit.

This is the same reason a stale UI read cannot authorize a later Journal mutation merely because each IndexedDB transaction is individually atomic.

## Retention eligibility is generation-specific

A cleanup decision applies to the exact row generation observed, not to a textual key forever.

The durable identity needed for deletion should include at least:

- immutable remote-save generation id;
- phase expected to be stale/dead-letter;
- expected stale/retention generation or version;
- key/index only as lookup location.

Inside the same readwrite transaction that deletes, cleanup must prove the current record still matches that expected generation and remains eligible.

Mismatch means `skip/deferred`, not `delete current occupant`.

## Correct implementation families

### Single readwrite eligibility/delete pass

Iterate the stale/retention index and delete qualifying exact rows inside one bounded readwrite transaction, with per-row current phase/generation visible to that transaction.

This reduces the TOCTOU window but still needs bounded batching/deadline behavior.

### Snapshot + expected-generation CAS

If two-phase scanning is needed for budget calculations:

1. readonly scan records `(key, remoteSaveGenerationId, phaseVersion, staleAt)`;
2. delete transaction re-reads each key;
3. delete only if exact generation/version and stale phase still match;
4. changed/reactivated row is skipped and retained.

### Generation-keyed rows

The stronger remote-attempt design stores A and B under distinct immutable generation keys. Then cleanup can delete A while B remains separately addressable. A user-facing latest-retry pointer may move to B without changing A's physical identity.

Even with generation-keyed rows, cleanup should still compare expected phase/version to avoid deleting an old generation that became relevant again through an explicit reconciliation state transition.

## Capacity pressure has the same requirement

The `MAX_PENDING_REMOTE_STALE_SAVES` excess calculation is based on the same stale snapshot and produces additional delete keys.

Therefore pressure eviction is equally subject to reactivation TOCTOU. It cannot say `key J was an old stale row in my snapshot, therefore whatever occupies J later is disposable`.

Pressure cleanup must be generation-specific and may need to skip newly active/current rows, recompute capacity on a later pass, and report truthful retained/deferred counts.

## Cleanup before recovery in the same maintenance pass

Current maintenance runs temporary-storage cleanup, including stale remote cleanup, before active remote-save recovery.

Ordinary `recoverPendingRemoteSaves()` excludes `stale-unverified` rows by default, so this fixed order does not by itself prove that cleanup steals a row the immediately following recovery phase would have processed.

The confirmed bug is instead the concurrent explicit retry/reactivation race above.

This distinction is recorded to avoid overclaiming the broader maintenance-order hypothesis.

## Required deterministic regressions

1. Cleanup snapshots stale A/J -> retry reactivates J as B -> cleanup delete phase runs: B survives.
2. Same schedule with B external side effect admitted immediately after durable checkpoint -> crash/recovery still finds B.
3. Cleanup snapshots A -> no intervening change -> exact A is deleted according to retention policy.
4. Cleanup snapshots A -> A receives newer stale/reconciliation version before delete -> generation mismatch skips old decision.
5. Capacity-pressure excess selects A -> retry creates B -> B is not deleted by old pressure snapshot.
6. Two immutable generations A/B share intended Journal id but have distinct physical keys -> cleanup of A cannot affect B.
7. Cleanup skips changed rows and reports actual committed delete count, not stale snapshot count.
8. A stale old worker delete transaction cannot remove a generation created by a newer worker/retry after ownership changed.
9. Hard storage pressure remains bounded: skipped/reactivated rows cause future convergence, not infinite synchronous rescanning.
10. OperationLog cleanup/history has no authority over the remote-generation CAS.

## Duplicate check / numbering

No new item is created.

This is a concrete implementation acceptance case for existing remote-generation/stale-retention work:

- **P1-184/P0-074** — exact physical remote generation/operation context;
- prior remote stale-evidence and cleanup-reactivation deltas — unresolved evidence retention;
- **P1-173/P1-043** — bounded admission/pressure behavior.

P1-211 remains unassigned.

## Test / release state

No product tests were rerun. Historical **88/88 syntax + 74/74 deterministic PASS** remains prior evidence. No runtime/build/tag/Release change was made.

## Retired source: `RESEARCH_DELTA_REMOTE_STALE_EVIDENCE_RETENTION_2026-08-27.md`

SHA-256 of UTF-8 source text: `22f2e5b55fc3da525ff3eaa060dd35e602c825d94320b4174a5284d500b4c2ef`

# Research delta — remote stale-evidence retention / unknown-settlement tombstone — 2026-08-27

Source-of-truth `main` immediately before this write: `dc1a2f4d47dcc4292285741b4a5a57cf34dcb4ae`.

Docs-only research checkpoint. Production/runtime/tests/configuration and `manifest.json` are unchanged. Canonical registry synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof strengthens existing **P1-184** (exact remote object/content proof and unknown-settlement reconciliation). It applies the same evidence-preservation principle already required by **P0-039** for local-download unknown outcomes to the Yandex remote-save side.

Dependencies remain:

- **P0-073/P0-074** — exact account/root/auth/config namespace and operation generation;
- **P0-079** — exact immutable local PDF/content generation;
- **P0-076** — stale Journal generation must not regain finalization authority;
- **P1-194** — retention/durability claims must match the actual storage guarantee.

This is not a new retry or capacity root cause. The defect is that the current bounded archive eventually converts an unresolved external side effect into **no retained recovery identity at all** solely because time/capacity thresholds were reached.

## Positive control — active queue is deliberately bounded

Current remote-save recovery correctly avoids leaving repeatedly unresolved 404 rows in the active queue forever.

A PREPARED checkpoint that repeatedly returns 404 can, after the configured age/attempt threshold, transition to:

`phase: 'stale-unverified'`.

That state is excluded from ordinary active recovery enumeration, so an unresolved historical row does not permanently consume one of the active `MAX_PENDING_REMOTE_SAVES` slots.

This active-vs-archive split is valuable and should remain. The finding is not that every stale row must remain in the hot recovery loop.

## Fresh source proof — archived unknown-settlement evidence is later physically deleted

Current constants include:

- `PENDING_REMOTE_STALE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000`;
- `MAX_PENDING_REMOTE_STALE_SAVES = 100`.

`cleanupStalePendingRemoteSaves()`:

1. enumerates all `phase === 'stale-unverified'` rows ordered by `updatedAt`;
2. builds `removeKeys` from every stale row whose `staleAt` is older than the 30-day cutoff;
3. among the remaining rows, if the count is greater than 100, adds the oldest excess rows to `removeKeys`;
4. physically deletes those keys from `JOURNAL_PENDING_REMOTE_STORE`.

Therefore an upload whose settlement was never authoritatively classified can lose its final locally retained operation/object recovery identity for either of two non-evidentiary reasons:

- wall-clock age exceeded 30 days;
- more than 100 unresolved stale rows exist.

Neither condition proves that the original signed PUT did not commit, that no remote object exists, or that the object can no longer surface/be discovered later.

## Why `stale-unverified` is still unresolved external evidence

The transition to `stale-unverified` is deliberately conservative: it happens after repeated 404 observations and elapsed time, precisely because those observations are not treated as authoritative negative settlement.

Once a row is in that state, the semantics are therefore:

- automatic active recovery has stopped/deprioritized it;
- remote outcome remains unverified;
- the local receipt is still the evidence explaining which intended operation/path/account/content may have created an object.

Deleting the row later because another independent retention clock elapsed does not improve the quality of the negative proof. It only removes the evidence.

This is the same logical distinction already enforced elsewhere in the project:

`bounded retention policy != proof of external non-occurrence`.

## Concrete failure scenarios

### 1. Delayed/manual discovery after 30 days

1. PDF upload attempt A is durably checkpointed and signed PUT may have started.
2. Worker loses the response; repeated lookups do not prove the object.
3. A is archived as `stale-unverified`.
4. No authoritative resolution is obtained for 30 days.
5. Maintenance physically deletes A's row.
6. User later discovers the Yandex object manually or a future API/read path could identify it.
7. WebClip no longer has the exact local receipt needed to associate that object with A's source document/PDF/Journal generation or to explain why it exists.

### 2. Capacity pressure deletes recent unresolved evidence

1. More than 100 stale-unverified operations accumulate, for example during a long provider/account incident or repeated historically ambiguous saves.
2. Some rows are still younger than 30 days.
3. `cleanupStalePendingRemoteSaves()` nevertheless deletes the oldest excess rows solely to satisfy `MAX_PENDING_REMOTE_STALE_SAVES`.
4. Those external side effects remain unresolved; capacity pressure has silently become a destructive evidence policy.

### 3. Future stronger P1-184 implementation makes this more important

Once P0-079/P1-184 carry exact local digest, transfer attempt, remote-save generation, account/root and object identity, the stale row becomes much more valuable than today's weak path/size record.

Keeping the existing unconditional 30-day/100-row delete after implementing stronger provenance would destroy exactly the evidence needed for later/manual reconciliation.

Therefore retention semantics must be fixed as part of the P1-184 architecture, not postponed as an unrelated cleanup optimization.

## Required bounded retention contract

The solution must remain bounded. The research does **not** require unbounded retention of large PDF bodies or unlimited full checkpoints.

### Separate hot recovery from compact unresolved evidence

Use distinct lifecycle classes, for example:

1. active automatic recovery receipt;
2. compact unresolved/dead-letter receipt;
3. authoritatively resolved/explicitly discarded record.

Moving from (1) to (2) is allowed on age/attempt/cap policy. Moving from (2) to no evidence requires a stronger contract.

### Compact tombstone instead of blind deletion

When full stale records exceed the desired retention budget, compact them to a bounded tombstone containing the minimum identity necessary to avoid pretending the external event never existed.

The exact schema depends on the final provenance model, but should retain enough bounded fields to identify at least:

- immutable remote-save/transfer attempt generation;
- intended Journal operation/generation identity in a non-authoritative historical form;
- account/root/config namespace receipt or stable normalized namespace identifier;
- exact intended remote path;
- stable remote resource identity if ever observed;
- exact local content generation/digest or a bounded digest receipt where available;
- original/last reconciliation timestamps;
- explicit state such as `outcome-unresolved`;
- reason the full active record was compacted.

Large Blob/PDF bodies need not remain forever. P0-079 can release large content once no active side effect requires the body, while a compact digest/provenance tombstone remains.

### Capacity policy

A hard cap can apply to full active/stale records, but reaching the cap must not silently rewrite `unknown external outcome` as `no evidence`.

Acceptable bounded strategies include:

- compact full stale rows into much smaller tombstones;
- aggregate old tombstones only if aggregation preserves enough unique operation identity for diagnosis/reconciliation;
- require explicit user/manual acknowledgement before irrevocably forgetting an unresolved remote side effect;
- if storage pressure forces emergency loss of even compact evidence, surface that loss truthfully as `recovery evidence evicted`, not as a proven absent/failed upload.

The implementation must define a bounded maximum for compact evidence and a deterministic degradation policy; the answer is not an unbounded log.

### Journal finalization authority remains revoked

Preserving a dead-letter/tombstone after clear/import or after active recovery abandonment does **not** preserve authority to append or mutate the current Journal.

P0-076 remains authoritative: old operation evidence can be retained for reconciliation/diagnosis while its ability to finalize into a replacement Journal generation is permanently stale.

This composes with `RESEARCH_DELTA_JOURNAL_REPLACE_RECOVERY_EVIDENCE_2026-08-27.md`: physical side-effect evidence and local Journal-finalization capability are separate lifecycle concepts.

## Required regressions

1. Unknown remote attempt becomes `stale-unverified`; after >30 days maintenance does not erase all operation/object evidence merely because of age.
2. 101+ stale-unverified attempts: active/full storage remains bounded, but the oldest unresolved attempt still has a compact diagnosable tombstone or an explicit evidence-eviction state.
3. A later exact remote-object discovery can be associated with the original compact receipt when required fields are available.
4. A compact stale receipt cannot append into a Journal generation replaced by clear/import.
5. Resolved negative outcome based on future authoritative provider evidence may be retired according to policy; ordinary 404/time alone is not that evidence.
6. Resolved positive remote object + completed local reconciliation may release the stale receipt under normal terminal cleanup.
7. Large PDF bodies are not retained indefinitely solely to satisfy this requirement; bounded digest/provenance evidence remains after body release where safe.
8. Storage-pressure emergency eviction is explicitly logged/surfaced as evidence loss and is not reported as `upload did not occur`.
9. Namespace/account changes do not merge compact tombstones with another account/root merely because textual paths match.
10. Full active/stale/tombstone storage remains globally bounded under stress.

## Duplicate check

No new number is created.

- **P1-184** owns exact remote object/content proof and unresolved external settlement lifecycle. This checkpoint adds the terminal evidence-retention requirement.
- **P0-039** is the analogous local-download rule that insufficient negative evidence must not justify destroying the only checkpoint; it remains the local owner rather than being broadened into a second Yandex item.
- **P0-073/P0-074** own namespace/generation identity, not retention lifetime.
- **P0-079** owns immutable PDF body/content generation and bounded physical-body lifetime, not the remote outcome itself.
- **P1-194** owns truthful durability/recovery-class claims, not whether an unresolved record is semantically safe to forget.

## Test / release state

No runtime/config/manifest change was made. Product tests were not rerun. The last proven product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or Release was created.

## Retired source: `RESEARCH_DELTA_USER_SETTINGS_SCHEDULER_RECONCILIATION_GENERATION_2026-08-28.md`

SHA-256 of UTF-8 source text: `1f56c0c837ad8d5cb404fd019742c222606953cc79f432a0028aa5155508eaea`

# Research delta — user-settings marker vs scheduler generation reconciliation — 2026-08-28

Source-of-truth `main` immediately before this write: `557fa8af158e1539197013ee0bb38309e71ea270`.

Docs-only research checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof composes existing:

- **P1-008** — user-settings import bundled commit + crash/unknown-settlement reconciliation marker;
- **P1-177** — backup scheduler must converge to current enabled/paused policy without stale alarm resurrection;
- **P0-074** — config-dependent ancillary work requires exact settings/config generation;
- **P1-157** — all shared settings writers must participate in one versioned mutation contract;
- **P1-210** — outer response loss/pending result must not trigger a second import write.

The fresh acceptance condition is: **an import marker cannot be considered reconciled merely because one scheduler initializer returned. The ancillary scheduler state must be proven for that exact imported settings generation, and older scheduler tasks must no longer have authority to overwrite it.**

## Positive controls that must be preserved

`importUserSettings()` has several strong existing properties:

1. imported allowlisted settings and `USER_SETTINGS_IMPORT_MARKER_KEY` are written in one bundled `chrome.storage.local.set`;
2. actual non-cancellable storage settlement is retained after caller timeout;
3. on timeout the code returns a pending result and explicitly does **not** auto-retry the settings write;
4. a late actual success schedules marker reconciliation;
5. if ordinary post-commit reconciliation fails, the marker is retained so worker startup can repair later.

These are correct crash-consistency principles and should not be weakened.

## Existing marker-generation defect remains

The current marker has no immutable import id/generation. `reconcileUserSettingsImportMarker()` reads whichever current marker exists, initializes the backup scheduler, then removes the marker without compare-and-remove ownership.

`RESEARCH_DELTA_USER_SETTINGS_MARKER_GENERATION_2026-08-27.md` already proves an old reconcile A can consume marker B.

Fresh research adds a second layer: even a future generation-owned marker must define what "scheduler reconciliation completed" actually means.

## Worker start launches two scheduler paths concurrently

At service-worker module start current code independently starts:

- `reconcileUserSettingsImportMarker('worker-start')`;
- `initializeJournalBackupScheduler('worker-start')`.

The marker reconciler itself calls `initializeJournalBackupScheduler(reason)` before removing the marker.

Therefore worker startup can have at least two scheduler initializers live concurrently:

- S-old from the unconditional worker-start initialization;
- S-marker from settings-import reconciliation.

Each initializer obtains current status/settings through asynchronous reads, and current scheduler generation fencing is incomplete under P1-177/P0-074.

## Deterministic stale scheduler after successful marker cleanup

A schedule exists even if the marker has a future unique import id:

1. worker-start scheduler task S-A begins and observes settings/policy generation A;
2. before S-A finishes its Chrome alarm mutations, settings import B commits atomically with marker B;
3. marker reconciler B reads marker B and current policy B;
4. S-B initializes alarms according to B and returns success;
5. marker B is removed because reconciliation appears complete;
6. delayed S-A resumes and publishes/retains alarm state computed from older A;
7. durable settings remain B but durable Chrome alarm state can now reflect A;
8. marker B is already gone, so startup no longer has a durable import-specific obligation saying ancillary scheduler state still requires repair.

This is the same logical stale-scheduler authority already owned by P1-177/P0-074. The new import consequence is that marker cleanup must not certify ancillary state without a scheduler-generation receipt.

## Why serialized Chrome alarm mutations are not enough

Physical alarm mutation serialization prevents raw API create/clear calls from overtaking unpredictably inside one queue.

It does not make an older logically stale scheduler decision valid if it is admitted after/newer policy B has already become authoritative.

A stale scheduler task can serialize perfectly and still run **after** the correct B task, recreating the wrong alarm time/presence.

Therefore P1-008 cannot treat `initializeJournalBackupScheduler()` returning without error as sufficient proof unless that helper itself provides generation-aware convergence semantics.

## Required import/scheduler reconciliation receipt

Each settings import generation IB should bind or be able to derive a scheduler-policy generation covering at least:

- backup enabled/paused state;
- interval minutes;
- retry minutes;
- root/config generation relevant to scheduling;
- any current auth-availability/paused generation used by P1-177.

Marker reconciliation should only remove IB when it has an authoritative result equivalent to:

`current settings generation == IB-derived generation && scheduler/alarm state reconciled to that generation`.

If settings changed again to C, IB does not need to force old B policy back. It may consider itself superseded only through an explicit generation relation and ensure scheduler state converges to current C. An old task from A/B must not retain authority afterward.

## Scheduler helper contract

A generation-safe scheduler reconciler should:

1. capture/receive expected scheduler generation;
2. read current policy;
3. compute desired periodic/retry alarm state;
4. publish alarm mutations through actual-settlement tracking;
5. before declaring success, prove no newer policy generation superseded the decision;
6. if superseded, reconcile the newer current generation or return a non-terminal/superseded result rather than claiming the old generation applied.

The current worker-start direct initializer and marker-driven initializer can then safely coalesce onto one current-generation reconciliation instead of racing as independent semantic owners.

## Shared page writer composition

P1-157 remains essential.

A stale Options/Journal page can currently write shared settings after import B and create generation C without expected revision. Even a perfect marker B cannot make scheduler state permanently equal to B if another legitimate newer settings generation exists.

Therefore:

- all shared writers must produce/version settings generations;
- import marker owns B only;
- later C intentionally supersedes B and must trigger scheduler reconciliation C;
- stale page writes must conflict instead of silently becoming C when they were based on pre-B state.

## Outer response-loss semantics

On unknown actual import settlement, current code correctly avoids a second bundled write and returns pending semantics.

P1-210 should preserve that model in the UI:

- pending import -> reconcile marker/settings generation;
- do not tell the user to blindly re-import while the first `storage.set` is unresolved;
- after actual commit, UI status should distinguish `settings committed, ancillary scheduler reconciliation pending` from `fully reconciled`.

## Required deterministic regressions

1. S-A worker-start reads policy A -> import B commits -> S-B marker reconciliation applies B -> late S-A cannot overwrite B alarm state after marker cleanup.
2. Same schedule where S-A actual Chrome alarm mutation is already in progress: final state converges to B/current generation before marker B is considered complete.
3. A unique marker B is never removed by reconcile A; existing P1-008 generation regression remains mandatory.
4. B scheduler reconciliation succeeds, then intentional settings C commits: C supersedes B and triggers C reconciliation; B does not fight C.
5. Stale pre-B Options page attempts settings write after B: P1-157 expected-generation conflict prevents silent rollback/scheduler C based on stale fields.
6. Import B caller times out before `storage.set` settles: no second settings write; late B success retains marker until generation-safe scheduler reconciliation completes.
7. Worker dies after B settings commit but before scheduler convergence: startup sees marker B and eventually converges current scheduler state.
8. Worker-start may launch multiple logical reconciliation triggers, but they coalesce/fence by scheduler generation; older trigger cannot publish last merely because it settles last.
9. Disabled B policy plus stale enabled A task -> no periodic/retry alarm survives B reconciliation.
10. Interval B differs from A -> final alarm time uses current B (or intentional newer C), never stale A after marker removal.
11. Reconciliation failure leaves the exact owned marker/generation durable; it is not converted into successful cleanup.
12. Normal import with stable current generation commits settings once, reconciles scheduler once/coalesced, removes its exact marker, and returns truthful success.

## Duplicate check

No new item is created.

- P1-008 owns import marker generation/crash reconciliation.
- P1-177/P0-074 own scheduler/config generation authority.
- P1-157 owns shared settings write CAS/versioning.
- P1-210 owns unknown outer result/retry admission.

This checkpoint specifies the cross-component completion criterion: **marker reconciliation is complete only when ancillary scheduler state is generation-consistent, not merely when one asynchronous initializer returns.**

## Test / release state

No product tests were rerun for this docs-only checkpoint. Historical product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime/version remain unchanged (`0.9.8`). No build, tag or Release was created.

## Retired source: `RESEARCH_DELTA_YANDEX_REMOTE_CHECKPOINT_GENERATION_2026-08-27.md`

SHA-256 of UTF-8 source text: `abbd52987ab733a83b49f7d87e91dc5f709bb824841ca2653091a6adf114d431`

# Research delta — Yandex remote-save checkpoint generation ownership — 2026-08-27

Source-of-truth `main` immediately before this write: `2c6c374eef4dc6809dfff23f40e00d0f8b740116`.

Docs-only research checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Scope

Fresh source research of `pendingRemoteSaves` ownership across repeated/concurrent upload attempts for the same cached PDF / Journal entry.

Repository-wide semantic duplicate-check was performed against the canonical research files and all current `project_docs/RESEARCH_DELTA_*.md` checkpoints before assigning classification. No distinct new root cause requires a new P-number.

Primary existing owners:

- `P0-074` — immutable Yandex auth/config/account/root operation generation;
- `P0-073` — exact account/root namespace binding for remote save/recovery;
- `P1-184` — exact remote object/content proof and unknown-settlement reconciliation.

Required composition/dependencies:

- `P0-076` — Journal generation / expected entry revision must prevent stale local finalization;
- `P0-079` — immutable local PDF byte/cache generation must identify the exact body being transferred;
- `P1-198` — worker-issued live operation receipt must replace caller-chosen textual operation authority.

## Fresh confirmed source proof

### 1. `pendingRemoteSaves` physical key is only `journalEntryId`

`checkpointPendingRemoteSaveIntent()` normalizes the save metadata and creates an item whose IndexedDB key is:

`id: prepared.journalEntryId`.

For cached-PDF Yandex upload/retry, that `journalEntryId` comes from the cached PDF record and is deliberately stable across retries of that cached save intent.

Therefore multiple physical upload attempts for one cached PDF address the same `pendingRemoteSaves` row even when they are distinct operation attempts and may run under different auth/config generations.

### 2. A newer PREPARED attempt overwrites the older in-flight PREPARED row

Inside the checkpoint transaction, if the row already exists and is not `remote-verified` or `stale-unverified`, current code executes the equivalent of:

`pending.put({ ...item, createdAt: existing.createdAt })`.

The replacement item contains the newer attempt's current values, including its `operationId`, `accountUid`, `rootPath`, `remotePath`, publication preference snapshot and metadata.

There is no immutable `remoteSaveGenerationId`, expected operation receipt, auth/config generation or compare-and-swap owner check proving that the caller is updating the same physical remote-save attempt.

The helper then returns its local `item`; it does not return/revalidate an immutable stored-generation receipt that later transitions must present.

### 3. `markPendingRemoteSaveVerified()` mutates whichever generation currently occupies that key

After a remote transfer/metadata check, the caller invokes:

`markPendingRemoteSaveVerified(remoteCheckpoint.id, { publicUrl, resourceId })`.

That helper re-reads `pendingRemoteSaves` only by the shared `journalEntryId` key. It does not compare the stored operation, account, root, remote path, expected bytes, local PDF receipt or any checkpoint generation with the attempt that produced the supplied remote `resourceId/publicUrl`.

It then spreads the **current** row and writes the supplied remote object fields into `current.data`.

Consequently a late verification result from attempt A can write A's `resourceId/publicUrl` into the row that attempt B already replaced with B's account/root/path/config metadata.

This can create a logically impossible mixed receipt such as:

- account/root/path from B;
- remote object/publication proof from A;
- shared Journal entry id;
- whichever textual operation id happened to survive the replacement path.

### 4. Failure and stale transitions have the same key-only authority

`markPendingRemoteSaveFailure(id, error)` and `markPendingRemoteSaveStale(id, error)` likewise:

1. read the current row only by `journalEntryId`;
2. increment/alter its attempt/error/phase state;
3. `put()` it back;
4. carry no expected checkpoint generation.

Therefore a late failure/timeout classification from A can increment, stale/archive or otherwise mutate B's newer recovery state even when B is a different physical attempt.

The defect is a state-machine ownership problem across all transitions, not only the success path.

### 5. Successful cleanup is also key-only

After Journal finalization, `removePendingRemoteSave(id)` executes a blind `store.delete(key)` by the same `journalEntryId`.

Thus attempt A can complete after B has already established a newer in-flight checkpoint and delete B's only durable recovery row.

If B's remote PUT later physically settles, B can be left without the exact durable checkpoint needed to prove/reconcile its object and finish the Journal entry safely.

### 6. Final Journal checkpoint admission checks existence, not exact generation

`appendJournalEntryFromDurableCheckpoint()` correctly requires the referenced durable checkpoint to still exist before appending. This prevents a concurrent clear/import from resurrecting metadata after its source checkpoint was deliberately removed.

However the required checkpoint is currently specified only as `{ storeName, key }`. Inside the Journal transaction, existence of **some** row at that key is enough; there is no equality check against the exact remote-save generation/data receipt that authorized the finalization.

Therefore replacing A's row with B does not make A fail closed. A may observe that key J still exists and proceed using a mixed/current checkpoint even though A's own physical checkpoint generation no longer exists.

This is the remote-checkpoint analogue of the expected-generation/CAS contract already required by `P0-076` for Journal records.

## Deterministic corruption / recovery-loss schedule

A valid schedule exists without relying on an external attacker or duplicate filenames:

1. cached PDF C has stable `journalEntryId = J`;
2. retry A starts under Yandex context A and stores PREPARED checkpoint `J/A`;
3. A's transfer/verification is delayed or has unknown settlement;
4. user reauthorizes, changes root/config, or otherwise starts retry B of the same cached PDF under a newer Yandex operation context B;
5. B stores PREPARED checkpoint `J/B`, replacing the active A row because the physical key is only J;
6. A's remote outcome settles first;
7. A calls `markPendingRemoteSaveVerified(J, A.objectProof)`; the helper reads B and writes A's `resourceId/publicUrl` into B's account/root/path record;
8. A proceeds through Journal finalization because a row with key J still exists;
9. A cleanup deletes J;
10. B later physically settles, but its verification/finalization no longer has its own durable checkpoint and can fail after the external side effect already occurred.

If B settles first, the symmetric stale transition/cleanup problem exists in the opposite direction. Same account/root does not make the race safe: operation/object/content provenance and recovery ownership are still merged.

## Why this does not get a new P-number

The missing invariant is already demanded by the existing generation/provenance contracts:

- `P0-074` says long Yandex operations must stay bound to one immutable auth/config operation context rather than re-resolving mutable current state;
- `P0-073` requires exact account/root namespace identity for remote recovery;
- `P1-184` requires exact remote object/content proof for the operation whose upload outcome is being reconciled;
- `P0-076` requires expected generation/revision before stale delayed work can mutate authoritative Journal state.

The new proof shows that the **durable recovery row itself** currently has no attempt generation, so those stronger contracts cannot be represented safely even if each individual field is later improved.

Do not assign `P0-080` or `P1-201` for this evidence.

## Required unified contract

### Immutable remote-save generation receipt

Every physical remote-save attempt must receive an immutable locally issued checkpoint identity independent of `journalEntryId`, for example a random `remoteSaveGenerationId` / nonce.

`journalEntryId` remains the intended Journal-entry identity; it must not double as the ownership key of every physical remote side-effect attempt.

The durable receipt should bind at minimum:

- remote-save generation id;
- worker-issued operation receipt/generation (`P1-198`);
- Journal entry id + Journal database/entry generation needed by `P0-076`;
- immutable auth/config generation;
- proven `accountUid` and normalized `rootPath` (`P0-073`);
- exact chosen remote path;
- publication-policy generation/state (`P0-078` dependency where publication is in scope);
- immutable local PDF cache/content receipt, byte length and strong digest/fingerprint (`P0-079` feeding `P1-184`);
- remote object/content proof as it becomes available;
- phase/attempt timestamps required for bounded recovery.

### Generation-aware state transitions

Every transition — PREPARED, transfer-started/unknown, remote-verified, failure/defer/stale, Journal-finalized and cleanup — must carry the exact expected remote-save generation.

Inside the same IndexedDB readwrite transaction:

- read the addressed generation;
- prove owner/generation identity;
- update/delete only that generation;
- mismatch or missing generation = stale caller, fail closed / reconcile its own retained receipt; never mutate whichever newer row happens to share a Journal id.

### Separate latest-retry pointer from physical attempt ownership

If the UI wants one current/latest retry for a Journal id or tab, store that as a small versioned pointer to an immutable generation. Replacing the pointer must not overwrite/delete a generation already owned by an in-flight or unknown-settlement remote operation.

This is the same separation principle required by `P0-079` for PDF bytes: user-facing latest pointer != physical operation-owned resource.

### Exact Journal finalization admission

`appendJournalEntryFromDurableCheckpoint()` must validate the exact durable receipt expected by the finalizing attempt, not merely existence of a row at a shared key.

Final local commit must also prove the intended Journal generation/revision so old work cannot finalize into a replacement entry after clear/import (`P0-076`).

If multiple physical attempts ultimately prove the same intended content/object result, deduplication must be deliberate and based on exact receipts/content/object identity. It must not arise accidentally from row replacement by `journalEntryId`.

### Cleanup and bounds

A completion may compare-and-delete only its exact remote-save generation.

Operation-scoped rows must remain globally bounded: retain existing active/stale caps or replace them with explicit aggregate generation limits and pressure policy. Do not fix ownership by creating an unbounded history of attempts.

An in-flight/unknown-settlement generation cannot be evicted merely because a newer retry exists; if hard pressure requires degraded retention, preserve enough dead-letter/reconciliation evidence to avoid falsely declaring the external outcome absent.

## Required deterministic regressions

1. A creates checkpoint J/A; B creates a newer attempt for the same Journal id J before A verifies: A verification cannot mutate B's row.
2. A uses account/root A and B uses account/root B: no state can contain B namespace fields with A `resourceId/publicUrl` or vice versa.
3. A completes first after B checkpoint exists: A cleanup deletes only A; B checkpoint remains recoverable.
4. B completes first: B cleanup cannot invalidate A's still-unresolved generation.
5. A times out locally, B starts, then A settles late: late A failure/success/stale transition applies only to A and cannot change B phase/attempt count.
6. A and B use equal-sized different PDF bytes: byte-size equality cannot merge attempts; exact local content receipt/digest remains bound to each generation.
7. clear/import replaces/removes the relevant Journal generation while A/B are active: old external outcomes remain diagnosable/reconcilable but cannot append into replacement Journal state.
8. Forced MV3 worker restart with two generations for the same Journal id: recovery enumerates both within bounds and never collapses them by textual id.
9. Recovery/finalization of one generation is exactly-once or explicitly conflict-resolved; existence of another generation at the same Journal id is not accepted as ownership proof.
10. Active/stale generation caps remain bounded and pressure handling never deletes a genuinely in-flight generation solely because a newer retry pointer exists.

## Classification / registry consequence

No new P-number is assigned.

Extend/refine:

- `P0-074` — remote checkpoint mutations must be exact Yandex operation-generation fenced;
- `P0-073` — account/root namespace fields and remote object proof must belong to the same immutable generation;
- `P1-184` — remote object/content verification must update the exact attempt whose local content was transferred.

Compose with:

- `P0-076` for Journal generation/CAS finalization;
- `P0-079` for immutable local PDF byte ownership;
- `P0-078` for publication policy generation;
- `P1-198` for worker-issued operation receipt.

Canonical `PRIORITIES_P0_P1_P2.md` / `DEEP_RESEARCH_2026-08-25.md` synchronization remains pending as a separate lossless registry-reconciliation step.

## Test / release state

No product tests were rerun for this docs-only checkpoint. The last proven product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** from the earlier runtime gate. No build, tag or Release was created.

