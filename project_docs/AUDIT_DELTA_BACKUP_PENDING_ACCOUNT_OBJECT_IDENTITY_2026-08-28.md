# Audit delta — backup pending account/object identity (2026-08-28)

## Scope

Docs-only continuation of the deep audit against `main` starting from commit `195d53de0d6918e80de19ce231effccae14f85c7` and current `service-worker.js` blob `9c81d080051ee14d468b78c575dcd9f21ecda803`.

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