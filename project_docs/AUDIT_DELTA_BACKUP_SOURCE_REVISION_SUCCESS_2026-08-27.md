# Audit delta — Journal backup source revision vs success state — 2026-08-27

Source-of-truth `main` immediately before this write: `50ee0f90a12b5eafc415236ba5e9258299e5801d`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed.

## New confirmed item: P1-207 — a backup can upload revision A, succeed after Journal revision B exists, and then mark the backup scheduler fresh for B even though B was never backed up

**Classification:** P1 / evidence-reserved / confirmed by fresh source audit.

Repository-wide semantic duplicate-check was performed against the current backup/scheduler/recovery items and late audit deltas. Adjacent owners are different:

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

The existing backup scheduler-generation audit covers a different race:

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