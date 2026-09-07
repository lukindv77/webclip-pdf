# P1-207 — Backup success/freshness bound to exact Journal source revision

Date: 2026-09-07

Status: research / architecture evidence only. Registry owner remains ACTIVE.

Canonical baseline inspected: `main@d4f5b268fa3f7ced5a7bc68da52784863d614138`.

This branch does **not** modify production runtime, `manifest.json`, release state or `RESEARCH_REGISTRY.md`.

## 1. Owner

The Registry defines P1-207 as:

> Backup success/freshness must carry exact Journal source revision; finishing backup A after revision B exists does not protect B.

P1-207 owns **backup coverage truth**:

- which exact local Journal state the uploaded backup bytes represent;
- whether that exact state is still current;
- whether scheduler/status may claim the current Journal is protected.

A successful historical upload and a currently protected Journal are separate facts.

## 2. Adjacent owners remain separate

P1-207 composes with, but does not replace:

- **P0-073 / P0-074** — immutable Yandex account/root/config/auth operation context;
- **P1-177** — backup scheduler pause/resume and auth/settings generation;
- **P1-179** — backup scheduler/pending state belongs to an immutable account/root namespace;
- **P1-184** — exact remote object/content proof after unknown Yandex upload settlement;
- **P1-194** — truthful durability class for recovery state;
- **P1-198** — worker-issued physical operation identity;
- **P1-205** — OperationLog history/retention generation;
- **P1-206** — coherent Journal read-side source revision receipts;
- **P1-208** — fairness of pending remote recovery phases;
- **P1-210** — outer user-operation response loss/reconciliation;
- **P0-072** — bulk clear/replace does not cancel already admitted external effects.

P1-207 consumes exact remote proof from P1-184; it does not redefine what constitutes a verified Yandex object.

## 3. Historical evidence

The consolidated Backup / scheduler / remote recovery family already reserves this root cause in:

1. `RESEARCH_DELTA_BACKUP_SOURCE_REVISION_SUCCESS_2026-08-27.md`;
2. `RESEARCH_DELTA_BACKUP_SOURCE_REVISION_RECOVERY_CHAIN_2026-08-28.md`;
3. `RESEARCH_DELTA_BACKUP_SUCCESS_NAMESPACE_COVERAGE_GENERATION_2026-08-28.md`.

The historical deterministic schedule is:

```text
backup starts from Journal revision A
backup bytes for A become an external effect
Journal advances to B
A completes/reconciles later
success timestamp is written after B exists
scheduler/status can interpret recent success as if B were protected
```

No new P-number is required.

## 4. Strong current positive control: export already proves snapshot stability

Current `stageFullJournalExportOnce(buildDeadline)` reads:

```text
revisionBefore = journalRevisionSnapshot(...)
```

then streams/builds the full chunked export and finally reads:

```text
revisionAfter = journalRevisionSnapshot(...)
```

If the two values differ it throws `JOURNAL_CHANGED_DURING_EXPORT`.

The wrapper `stageFullJournalExport()` retries at most twice under the common build deadline.

Therefore successful staging already proves:

```text
staged bytes belong to one stable Journal source revision R
```

P1-207 should preserve and propagate this proof rather than replace the exporter.

## 5. Authoritative revision already exists

`journalRevisionSnapshot()` reads `JOURNAL_META_REVISION_KEY` from the Journal IndexedDB `meta` store.

The service worker advances that revision atomically with Journal mutations through `touchJournalDbRevision(tx, reason)`.

This is the same authoritative revision dimension used by the P1-206 architecture. P1-207 must not invent a backup-only Journal revision counter.

## 6. Current defect: the proved revision is dropped at staging return

After the successful before/after equality check, current `stageFullJournalExportOnce()` returns approximately:

```text
{
    stagingKey,
    chunkCount,
    totalChars,
    totalBytes,
    entryCount,
    exportedAt
}
```

The proven `revisionBefore == revisionAfter` value is not returned as `sourceRevision`.

This discards the strongest local provenance fact exactly at the transition from snapshot construction to backup upload.

## 7. Current defect: prepared checkpoint loses source provenance

Before the signed PUT, `uploadJournalExportStagedToYandex()` durably writes `JOURNAL_BACKUP_PENDING_KEY`.

Current fields include approximately:

```text
phase = prepared
operationId
remotePath
filename
monthFolder
createdAt
attemptCount
lastCheckedAt
expectedBytes
entryCount
exportedAt
reason
```

There is no exact Journal `sourceRevision`.

After MV3 restart the recovery path remembers path/size/count/time but cannot know which exact Journal state those bytes represent.

## 8. Verified checkpoint inherits the same information loss

The current `remote-verified` pending checkpoint is derived from the prepared checkpoint. Because the prepared checkpoint lacks `sourceRevision`, the verified checkpoint cannot bind the accepted remote result back to local Journal revision A.

P1-184 may strengthen remote proof with exact content/object identity. P1-207 requires that whatever P1-184 proves remains linked to the local source revision that produced those exact bytes.

## 9. Recovery cannot reconstruct source revision

`recoverPendingJournalBackup()` currently returns fields such as:

```text
remotePath
filename
monthFolder
size
modified
entryCount
exportedAt
recovered = true
```

It has no retained `sourceRevision` to return.

Reading the **current** Journal revision during recovery would be incorrect. If the pending artifact was built from A and current Journal is B, recovery must preserve A, not relabel old bytes as B.

## 10. Durable success state is timestamp-centric

Current `journalBackupState` success updates include fields such as:

```text
lastSuccessAt
lastAttemptAt
lastError
lastReason
lastRemotePath
lastEntryCount
lastBackgroundSuccessAt
```

There is no exact field equivalent to `lastBackedUpJournalRevision` / `lastProtectedJournalRevision`.

Thus the state tells us **when an upload/recovery finished**, but not **which Journal revision that successful object protects**.

## 11. Scheduler due policy is based on success age

Current status derives:

```text
nextDueAt = lastSuccessAt + interval
```

and background admission uses recent `lastSuccessAt` as the primary not-due signal.

That is valid only after proving that the success covers the current Journal state and current namespace. A recent historical backup A is not sufficient reason to defer backup of current B.

## 12. Canonical stale-success race

```text
Journal = A
backup U starts
stage export proves A and builds bytes A
remote upload/verification is slow
Journal mutates/import-replaces/clears
Journal = B
U verifies bytes A
successAt = now-after-B
journalBackupState.lastSuccessAt = successAt
scheduler sees recent lastSuccessAt
scheduler postpones next backup
```

Reality is:

```text
remote historical backup A = success
current Journal B protected = false
```

The unsafe state conflates these facts.

## 13. Target staged receipt

A successful stable export should return an immutable receipt conceptually equivalent to:

```text
JournalBackupStageReceipt {
    stagingKey,
    sourceRevision: R,
    artifactDigest,
    expectedBytes,
    chunkCount,
    entryCount,
    exportedAt
}
```

P1-207's required field is `sourceRevision`. Content digest/identity composes with P1-184 and existing staging-integrity work.

## 14. Source revision is assigned only after the final stability fence

Do not capture `revisionBefore` and immediately publish it with unverified bytes.

The staged receipt becomes authoritative only when:

```text
revisionBefore == revisionAfter
```

for the successful bounded export attempt. Then `stage.sourceRevision = revisionBefore` is truthful.

If they differ, partial staging is discarded and no coverage receipt is produced.

## 15. Bounded exporter remains the correct architecture

P1-207 does not require one giant long-lived IndexedDB transaction.

Current pattern is appropriate:

```text
read exact revision R_before
bounded streaming export
read exact revision R_after
accept only R_before == R_after
bounded retry
```

This preserves current memory/deadline behavior.

## 16. Prepared checkpoint must preserve source revision before external effect

Before signed upload admission, durable state should carry an immutable attempt receipt such as:

```text
JournalBackupPendingGeneration {
    phase: prepared,
    operationGeneration,
    sourceRevision: R,
    stagingKey / stagingGeneration,
    artifactDigest,
    expectedBytes,
    namespaceGeneration,
    remote target receipt,
    ...
}
```

The A→artifact relation must be durable **before** the non-cancellable external transfer begins.

## 17. Restart/recovery preserves A verbatim

Suppose:

```text
pending.sourceRevision = A
current Journal = B
```

After restart, successful reconciliation must commit:

```text
verifiedBackup.sourceRevision = A
```

not B. Current B is relevant only to the separate current-freshness calculation.

## 18. Remote verification and local coverage are orthogonal

Conceptually:

```text
JournalBackupVerifiedReceipt {
    sourceRevision,
    namespaceGeneration,
    operationGeneration,
    artifactDigest,
    expectedBytes,
    remoteIdentityReceipt,
    uploadSuccessAt,
    verifiedAt
}
```

Two independent questions must be true before current protection is claimed:

```text
1. remote object/content was verified for this exact attempt
2. receipt.sourceRevision == current Journal DB revision
```

P1-184 primarily owns question 1. P1-207 owns question 2 and the retained binding between them.

## 19. Historical success vs current protection

Status should distinguish:

```text
historicalBackupSuccess = true/false
currentJournalProtected = true/false
backupDue = true/false
```

Example:

```text
last verified backup sourceRevision = A
current Journal sourceRevision = B
historicalBackupSuccess = true
currentJournalProtected = false
backupDue = true
```

A newer Journal must not erase valid historical backup evidence; it only invalidates the **current coverage** claim.

## 20. Namespace is part of coverage identity

Historical family evidence also proves that source revision alone is insufficient across Yandex account/root changes.

Current protection is conceptually:

```text
receipt.sourceRevision == currentJournalRevision
AND
receipt.namespaceGeneration == currentBackupNamespaceGeneration
```

A successful backup under namespace N1 does not prove current namespace N2 contains it, even if the local Journal revision happens to be equal. P1-179 owns the namespace model; P1-207 consumes it.

## 21. Opaque revisions are identities, not ordered counters

Journal DB revisions must be compared for equality only.

Do not infer ordering using lexicographic/date comparison of revision strings.

Ordering between overlapping backup attempts requires operation/backup generation authority, not revision-string ordering.

## 22. Late old success must not regress a newer protected pointer

Schedule:

```text
U1 backs up A
Journal -> B
U2 backs up B and verifies first
current protected pointer = B / generation 2
U1 finishes late
```

U1 may be recorded as valid historical success A. It must not overwrite the B protection pointer merely because U1's wall-clock completion is later.

The coverage pointer needs exact operation/backup-generation CAS compatible with P1-198/P1-210.

## 23. Scheduler admission rule

Scheduler should first ask:

```text
is current Journal revision protected in current namespace?
```

If **no**, backup is due because current source is unprotected, independent of a recent historical `lastSuccessAt`.

If **yes**, ordinary interval policy can then decide whether another archival backup is due.

## 24. Retry-alarm rule

A stale retry alarm may be skipped only when state proves the **current revision/current namespace** is already protected by an accepted newer receipt.

The existence of a newer `lastSuccessAt` alone is insufficient because that success may describe another source revision/namespace.

## 25. Unknown settlement rule

If remote transfer outcome is unknown:

```text
historical success = unknown
current protected = false/unknown
```

The scheduler must not fabricate coverage.

Recovery may later promote the same exact pending generation to verified success if P1-184 proof succeeds. Its source revision remains unchanged throughout.

## 26. Pending-generation multiplicity

Historical evidence shows a singleton pending key eventually becomes insufficient when unresolved generations coexist.

P1-207 requires source revision A to remain attached to unresolved/historical generation A while a later backup for B can become necessary.

The execution lease gives mutual exclusion for active building; it does not authorize deletion of unresolved historical attempt evidence.

## 27. Replace-import and clear are source boundaries

A replace-import may recreate identical IDs, URLs, timestamps, counts or apparent content. A clear may produce an empty Journal that resembles another empty state.

Neither resemblance authorizes old coverage.

Exact DB revision identity is the boundary:

```text
A -> replace/clear -> B
backup A remains historical
current B remains unprotected until explicitly backed up
```

## 28. Chrome Storage notification is not source authority

`webclipJournalRevision` is useful as a cross-context change signal. It is not the exact IndexedDB snapshot identity used by `journalRevisionSnapshot()`.

P1-207 uses `JOURNAL_META_REVISION_KEY` for source coverage. The notification token may trigger a recheck but must not be persisted as `lastBackedUpJournalRevision`.

## 29. Derived freshness, not a stale boolean

Recommended durable state is a verified receipt, not only `isFresh=true`:

```text
lastVerifiedBackupReceipt = {
    sourceRevision,
    namespaceGeneration,
    operationGeneration,
    remote/content receipt,
    uploadSuccessAt,
    remotePath,
    entryCount
}
```

Recommended derived query:

```text
currentRevision = authoritative Journal DB revision
currentNamespace = current backup namespace generation

currentProtected =
    receipt is verified
    && receipt.sourceRevision == currentRevision
    && receipt.namespaceGeneration == currentNamespace
```

A bare boolean can become stale immediately after the Journal mutates.

## 30. Success-commit crash window

Current code intentionally retains `remote-verified` pending state until `journalBackupState` is durably updated. This is a good restart-safety pattern.

P1-207 requires both sides of that crash window to carry the same revision:

```text
remote-verified pending.sourceRevision = A
journalBackupState receipt.sourceRevision = A
```

Restart finalization must be idempotent for A.

## 31. Housekeeping is secondary

Scheduling/cleanup after successful upload may fail independently.

The exact source coverage receipt must be committed at the same durable success boundary as the verified remote success state, before the pending checkpoint is removed.

Secondary housekeeping warnings must not erase or mutate source provenance.

## 32. UI/status truth

A truthful surface can distinguish:

```text
Last successful backup: <time/path>
Current Journal protected: no
Backup required: yes
```

Opaque revision IDs do not need to be shown to ordinary users. Bounded non-secret revision/generation identifiers may be retained in diagnostics/OperationLog when useful.

## 33. Defensive privacy boundary

Do not solve P1-207 by persisting raw Journal content, OAuth tokens or signed Yandex URLs into extra backup-state diagnostics.

Journal revision and backup-generation IDs are non-secret opaque provenance identifiers. Existing signed-capability redaction and sensitive-data controls remain authoritative.

## 34. OperationLog semantics

OperationLog may truthfully report both:

```text
backup upload verified for source revision A
current Journal revision differs; current coverage remains due
```

This is preferable to a generic `success` that can be misread as “current Journal protected”. Physical operation identity remains P1-198.

## 35. Required implementation invariants

1. Stable staging returns exact DB `sourceRevision`.
2. Source revision is assigned only after before/after equality.
3. Prepared pending checkpoint stores the same revision before signed transfer admission.
4. Verified pending checkpoint preserves it unchanged.
5. Recovery returns it unchanged after restart.
6. Durable success state stores it separately from completion timestamp.
7. Current coverage compares exact current DB revision with the receipt.
8. Current namespace generation also matches.
9. Unknown/unverified remote result cannot claim coverage.
10. Late older backup cannot regress a newer protected pointer.
11. Scheduler does not postpone an unprotected current revision because an unrelated recent success exists.
12. Retry/recovery never relabels old staged bytes with the current revision.
13. Export stabilization remains bounded.
14. Notification marker remains notification-only.

## 36. Deterministic model

The accompanying model covers 22 schedules, including:

- timestamp-only false freshness after A→B;
- historical A success vs current B protection;
- stable export receipt and changed-during-export rejection;
- restart preservation of `sourceRevision`;
- recovered A while B is current;
- unknown remote outcome and content mismatch;
- namespace change;
- replace-import and clear boundaries;
- B success then immediate B→C mutation;
- late A after newer B protection;
- operation-generation ordering independent of wall clock;
- scheduler immediate due for unprotected B;
- interval policy only after current protection;
- notification/source identity separation;
- bounded churn;
- coexistence of historical A and pending B.

## 37. Source-bound RED gate

The source gate preserves positive controls and requires visible source proof for:

- staged `sourceRevision` return;
- prepared checkpoint source revision;
- immutable staged content identity;
- recovered source revision preservation;
- durable protected-revision field;
- authoritative current DB-revision comparison in status;
- explicit current-protection/backup-due state;
- scheduler non-timestamp-only admission;
- namespace-generation binding;
- stale late-success generation fence;
- remote verification dependency;
- notification-vs-source separation;
- bounded export stabilization.

Against the inspected current runtime this gate is expected RED because these coverage receipts/comparisons are absent.

## 38. Positive controls that must not regress

Preserve:

- before/after Journal revision export fence;
- two-attempt bounded stabilization;
- common export build deadline;
- staged transfer storage/cleanup;
- durable prepared checkpoint before signed PUT;
- `remote-verified` checkpoint retained until backup-state commit;
- serialized Chrome Storage mutation settlement;
- backup lease renewal before network transfer;
- retry alarm infrastructure;
- remote reconciliation rather than blind duplicate upload;
- existing path/size checks until P1-184 strengthens exact proof.

## 39. Real-browser / real-Yandex acceptance

P1-207 must not close from documentation/model/source gate alone.

Use a disposable test account/root and prove at least:

1. Start backup while Journal=A; stable staging records A.
2. Delay remote completion after staging.
3. Mutate Journal to B.
4. Let backup A verify/commit.
5. Status shows A as historical success but B as unprotected/due.
6. Scheduler does not defer B for a full interval.
7. Back up B; current protection becomes true only for B/current namespace.
8. If A finishes late after B, current protection remains B.
9. Restart between prepared and recovered verification; source revision A survives exactly.
10. Change Yandex account/root generation; prior receipt no longer counts as current-namespace protection.
11. Unknown remote outcome never reports current protection until reconciled.
12. Replace-import with reused IDs/URLs creates a new unprotected revision.

Do not log production tokens, signed URLs or sensitive Journal payloads.

## 40. Closure boundary

P1-207 can close only when implementation and direct evidence prove the full chain:

```text
stable local source revision
→ immutable staged receipt
→ durable pending receipt
→ exact remote verified receipt
→ durable success coverage receipt
→ current source/namespace comparison
→ truthful scheduler/status decision
```

A successful upload alone is insufficient.
A recent timestamp alone is insufficient.
A path/size match alone is insufficient.
A model PASS alone is insufficient.

## 41. Research result

The current architecture is already close to the right shape:

- authoritative Journal DB revision exists;
- exporter already performs bounded before/after stability proof;
- prepared/verified durable backup checkpoints exist;
- serialized durable backup-state updates exist.

The central missing operation is **provenance propagation**:

```text
revision A is proved during staging
but discarded before checkpoint/success/freshness
```

P1-207 should therefore be implemented as a narrow exact-receipt extension through the existing pipeline, not as a second snapshot system.

## 42. Test / release state

This research branch adds only architecture evidence, one deterministic model and one source-bound acceptance gate.

No production runtime was modified.
No manifest/version was modified.
No Registry status was changed.
No build, tag or GitHub Release was created.

P1-207 remains **ACTIVE** until implementation and required direct evidence exist.
