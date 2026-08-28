# Audit delta — pending Journal backup context switch must retain recovery evidence — 2026-08-28

Source-of-truth `main` before this checkpoint includes `73e7774579eb186886ddeb709e8e6c8ec216171a`.

Docs-only audit checkpoint. Runtime/config/tests/manifest are unchanged.

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
