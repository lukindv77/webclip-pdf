# P1-207 — Backup source-revision freshness refinement

Date: 2026-09-11

Status: research / architecture evidence only. Registry owner remains **ACTIVE**.

Canonical baseline: `main = 9305c64d1af93fddfdded3d4be27f956cc0839d8`.

Production/runtime modification: **NONE**.

This tranche does not modify `service-worker.js`, `manifest.json`, release state, release receipts, release readiness, package/version metadata, tags, deployment, publication, P1-231 S2 state, or browser L5 evidence.

Hard release fence remains:

`EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION`

## 1. Registry owner

Current `project_docs/RESEARCH_REGISTRY.md` defines:

> P1-207 ACTIVE — Backup success/freshness must carry exact Journal source revision; finishing backup A after revision B exists does not protect B.

No new P-code is introduced. P1-207 remains ACTIVE until separately scoped runtime implementation and required evidence are complete.

## 2. Research method and provenance boundary

This refinement was rebuilt from the exact canonical baseline above in this order:

1. current Registry owner;
2. current `service-worker.js` backup/export/recovery/status paths;
3. current canonical P1-177, P1-179, and P1-206 evidence;
4. historical `research/p1-207-backup-source-revision-2026-09-07` only as provenance;
5. fresh external primary-source research;
6. a deterministic current-gap/target-semantics model.

No historical branch is imported wholesale.

The historical P1-207 branch correctly identified the A→B stale-success race and the need to retain the exact source revision. This refinement narrows two historical overextensions:

- P1-207 does not require a new content-digest mechanism; exact remote object/content proof remains owned by P1-184 and related remote-effect owners.
- P1-207 does not itself change backup cadence or require immediate upload after every Journal mutation. It makes current protection/freshness truthful; scheduler policy may consume that truth under its separately owned cadence/admission rules.

## 3. Current positive control: durable Journal source revision already exists

Current Journal IndexedDB has the authoritative durable source identity already used by the P1-206 architecture:

- `JOURNAL_META_STORE = 'meta'`;
- `JOURNAL_META_REVISION_KEY = 'revision'`;
- Journal mutations advance that opaque revision with the mutation transaction through `touchJournalDbRevision(...)`.

P1-207 must reuse this identity. It must not invent a backup-only Journal revision counter or use the Chrome Storage change notification as source authority.

The revision is an opaque identity. The required operation is exact equality, not numerical, lexical, or timestamp ordering.

## 4. Current positive control: export staging already rejects an unstable source

Current `stageFullJournalExportOnce(buildDeadline)` captures an authoritative revision before export construction:

```text
revisionBefore = await journalRevisionSnapshot(buildDeadline)
```

and captures it again after the export bytes have been staged:

```text
revisionAfter = await journalRevisionSnapshot(buildDeadline)
```

When the two values differ, staging rejects the attempt with `JOURNAL_CHANGED_DURING_EXPORT`.

Current `stageFullJournalExport()` keeps this stabilization bounded with at most two attempts under the existing build deadline.

Therefore the current exporter already proves an important fact on a successful attempt:

```text
revisionBefore == revisionAfter == R
```

and the staged artifact belongs to a stable Journal source revision R under the project's current exporter model.

P1-207 should preserve this positive control rather than replace it with a long-lived transaction or a new revision system.

## 5. Current gap: the proved revision is discarded at the staging boundary

After the successful before/after revision equality check, current staging returns a receipt shaped approximately as:

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

It does not return the exact accepted revision as `sourceRevision`.

This is the first information-loss boundary. The exporter has proved R, but the upload layer receives staged bytes without the identity of R.

## 6. Current gap: prepared and verified pending state cannot retain source provenance

Before the remote upload effect, current backup code writes durable `JOURNAL_BACKUP_PENDING_KEY` state. The checkpoint carries remote/staging facts including size/count/time/reason information, but it does not carry exact Journal `sourceRevision`.

The later `remote-verified` checkpoint inherits that omission.

This matters across MV3 restart. If bytes were staged from A and the Journal is now B, restart recovery must preserve A. Re-reading the current Journal revision B and attaching B to old bytes would fabricate provenance.

Required invariant:

```text
prepared.sourceRevision == verified.sourceRevision == recovered.sourceRevision == staged.sourceRevision
```

for one physical backup attempt.

## 7. Current gap: successful settlement is timestamp-centric

The current backup success path performs staging, renews backup lease state, uploads/reconciles the remote object, then records a wall-clock success such as `lastSuccessAt` and related background success metadata.

Current status derives ordinary time freshness from fields such as:

```text
nextDueAt = lastSuccessAt + interval
```

and an `overdue` decision based on whether a last success exists and whether its age exceeds the configured interval.

There is no durable exact source-revision field proving which Journal revision that successful remote object represents.

A completion time answers “when did this backup operation settle?” It does not answer “which Journal state does the remote object protect?”

## 8. Deterministic current race

Current source permits this schedule:

```text
Journal revision = A

backup U starts
stage reads revisionBefore = A
stage builds bytes from A
stage reads revisionAfter = A
stage succeeds, but returned staged receipt drops A

Journal mutation commits
Journal revision = B

U uploads/verifies the already staged A artifact
successAt = time after B exists
journalBackupState records recent successAt
```

Physical truth:

```text
remote backup of A succeeded
```

Current-source truth:

```text
current Journal B is not proven protected by that A backup
```

Timestamp-only state cannot represent both facts, so it can make a recent historical success look like current protection.

## 9. Core target: immutable staged source receipt

A successful staging result needs to retain the exact revision already proved by the final stability fence:

```text
JournalBackupStageReceipt {
  stagingKey,
  sourceRevision: R,
  ...existing bounded export metadata
}
```

`sourceRevision` becomes authoritative only after the successful equality fence:

```text
revisionBefore == revisionAfter
```

If the two differ, no source-coverage receipt is emitted for that attempt.

P1-207 does not require one giant IndexedDB transaction across export construction, network I/O, or remote verification.

## 10. Propagation target: do not reconstruct provenance later

The exact staged revision must be copied unchanged through the durable recovery chain before the non-cancellable external effect is admitted:

```text
stage.sourceRevision = R
prepared.sourceRevision = R
remoteVerified.sourceRevision = R
recoveredResult.sourceRevision = R
successReceipt.sourceRevision = R
```

No later phase may substitute “whatever revision is current now.”

This is especially important after worker termination or browser restart because the worker's in-memory state is not durable authority.

## 11. Success and current freshness are separate facts

P1-207 requires an explicit semantic split:

```text
historicalBackupSuccess = remote result was validly verified for receipt R
currentJournalProtected = historicalBackupSuccess
                          && receipt.sourceRevision == authoritativeCurrentJournalRevision
```

Under current B with a verified backup receipt for A:

```text
historicalBackupSuccess = true
currentJournalProtected = false
```

The A upload must not be relabelled as a failure merely because B exists. Equally, A must not be relabelled as protection of B.

## 12. Freshness is derived from exact equality

Recommended durable truth is a source-bound verified receipt, not a durable `isFresh=true` bit.

A boolean can become stale immediately after a new Journal mutation. Instead, query current protection from durable identities:

```text
currentRevision = authoritative Journal DB revision
protectedRevision = verifiedBackupReceipt.sourceRevision

sourceFresh = protectedRevision == currentRevision
```

Because the Journal revision is opaque, only equality is valid.

## 13. Namespace composition remains P1-179

Source revision alone is not enough to prove current remote protection across account/root changes.

P1-179 owns the immutable backup namespace binding. P1-207 composes with that owner conceptually as:

```text
currentProtected =
  verified receipt exists
  && receipt.sourceRevision == currentJournalRevision
  && receipt.namespaceIdentity == currentBackupNamespaceIdentity
```

P1-207 does not introduce a second namespace mechanism.

A backup of local revision R in namespace N1 does not prove revision R exists in N2.

## 14. Scheduler-generation composition remains P1-177

P1-177 owns pause/resume and scheduler-generation admission. P1-207 adds no new scheduler authority.

The source-revision receipt answers whether a specific Journal state is covered. Scheduler generation answers whether new work may be admitted and whether a settlement owns the current scheduling state.

Do not infer scheduler authority from `sourceRevision`.

## 15. Physical-operation composition remains P1-198

P1-198 owns worker-issued physical operation identity. A client correlation value or Journal source revision is not physical operation identity.

A source receipt may be attached to one physical backup operation, but it does not replace the physical identity or grant continuation authority.

## 16. Remote-proof composition remains P1-184

P1-207 does not redefine remote verification.

Conceptually, current protection needs both independent dimensions:

```text
remoteProofIsAccepted(receipt) == true
receipt.sourceRevision == currentJournalRevision
```

If remote settlement is unknown, P1-207 cannot claim current protection even when the source revision is known.

Conversely, exact remote verification of an A artifact does not imply current B is protected.

No new artifact digest requirement is introduced by this refinement.

## 17. Late settlement cannot use revision ordering

Consider overlapping historical/continuation work:

```text
U1 stages A
Journal -> B
U2 stages B
U2 settles first
U1 settles later
```

`sourceRevision` cannot decide which operation has settlement authority because revisions are opaque identities, not ordered counters.

A valid late U1 remote success may remain historical evidence for A, but it must not erase or overwrite a newer accepted B protection receipt merely because U1 completed later in wall-clock time.

The exact stale-settlement mechanism must compose with the existing operation/scheduler/namespace authority owners. P1-207 only requires that source provenance survives that mechanism and that wall-clock completion order never substitutes for source identity.

## 18. Crash-window invariant

Current code intentionally retains a `remote-verified` pending checkpoint until durable backup success state has been updated. That is a useful restart-safety pattern and must be preserved.

P1-207 adds this invariant across that durable boundary:

```text
remoteVerifiedPending.sourceRevision == committedSuccessReceipt.sourceRevision
```

Only after durable success state contains the same source-bound receipt may the pending checkpoint be cleared under its existing authority rules.

Secondary housekeeping failure must not mutate or erase source provenance.

## 19. Legacy/missing-source state must fail closed for current freshness

Existing persisted backup state from before P1-207 implementation may have `lastSuccessAt` but no exact source revision.

Such state can remain historical success metadata if existing validation allows it, but it cannot prove current Journal protection.

Required rule:

```text
missing exact sourceRevision => currentJournalProtected = false/unknown
```

Migration must not synthesize a source revision from the current Journal simply because a recent timestamp exists.

## 20. Replace-import and clear are source boundaries

P1-206 already established that current Journal source revision advances for mutation families including import-replace and clear.

Therefore:

```text
backup receipt = A
replace/clear commits revision B
```

means the old receipt remains historical A evidence but does not protect B, even when visible entries, IDs, URLs, counts, or empty-state shape happen to look identical.

No content-shape inference may substitute for exact revision equality.

## 21. Notification marker remains notification-only

`webclipJournalRevision` in Chrome Storage is a useful cross-context change signal. It is not the authoritative IndexedDB source revision used by `journalRevisionSnapshot()`.

P1-207 must bind backup coverage to `JOURNAL_META_REVISION_KEY`, not to a notification timestamp/nonce/reason token.

A notification may trigger a recheck; it cannot become the protected source identity.

## 22. Backup artifact manifest is not expanded by this research owner

Current export header carries schema/version/export metadata but not exact Journal source revision.

Embedding `sourceRevision` into a portable backup artifact could be useful for cross-device provenance, but this refinement does not make that a P1-207 implementation requirement because the Registry owner is backup success/freshness, not restore-format evolution.

The minimum P1-207 contract is durable local propagation of exact source revision through staging, pending/recovery, and successful coverage state.

If a future implementation changes the portable artifact schema, that requires its own compatibility review and owner mapping.

## 23. Cadence policy is intentionally not changed here

A source mismatch proves only:

```text
current Journal is not covered by this receipt
```

It does not by itself define whether the product should immediately upload, wait for an existing interval, batch changes, or follow another configured policy.

P1-207 requires status/admission code not to *claim current protection* from an unrelated recent success. Any cadence change beyond that truth contract is outside this research tranche unless separately owned and approved.

This refinement therefore does not encode “every mutation immediately starts a backup” as an invariant.

## 24. Boundedness requirements

Preserve the current bounded exporter behavior:

- exact revision read before staging;
- bounded staged export construction;
- exact revision read after staging;
- reject changed source;
- at most the existing bounded retry count;
- no infinite stabilization loop;
- no long transaction held through network I/O or remote recovery.

The source receipt adds provenance; it does not justify weakening resource/deadline limits.

## 25. Privacy and diagnostics boundary

Do not solve P1-207 by duplicating raw Journal content, OAuth tokens, signed remote URLs, or secret material into backup-state diagnostics.

The opaque Journal revision is a bounded provenance identifier. Existing redaction and sensitive-data controls remain authoritative.

Operation history may distinguish “backup A verified” from “current Journal differs” without storing raw Journal payloads.

## 26. Current implementation gap table

| Boundary | Current main | P1-207 target |
|---|---|---|
| Journal source identity | durable IndexedDB meta revision exists | reuse it |
| export stabilization | before/after exact revision fence, bounded retry | preserve |
| staged receipt | drops proved revision | carry `sourceRevision: R` |
| prepared pending | no exact source revision | persist R before external effect |
| verified pending | inherits missing provenance | preserve R unchanged |
| restart recovery | cannot return exact staged revision | return retained R, never current replacement |
| success state | timestamp/path/count centric | retain exact verified source receipt |
| current freshness | derived from success age | derive source protection from exact revision equality plus P1-179 namespace truth |
| late settlement | completion time can be newest fact | do not use wall-clock order as source/settlement authority |
| missing legacy provenance | timestamp can still look fresh | fail closed for current-source protection |

## 27. Minimum target state machine

```text
Journal A
  |
  | stage: before=A, after=A
  v
STAGED(A)
  |
  | persist before external effect
  v
PREPARED(A)
  |
  | remote upload outcome may be delayed/unknown
  v
REMOTE_VERIFIED(A)
  |
  | durable success commit under existing settlement authority
  v
SUCCESS(A)
```

Independent Journal mutation:

```text
A -> B
```

does not mutate any already-created A receipt.

Freshness query is separate:

```text
SUCCESS(A) + current A => protected current source
SUCCESS(A) + current B => valid historical success, current source not protected
```

## 28. Deterministic schedules required by implementation

A later implementation/evidence tranche should preserve these properties:

1. successful stable stage returns the exact proved source revision;
2. A→B during staging rejects that staging attempt;
3. mutation B after stable A staging does not relabel A;
4. prepared checkpoint stores A before remote effect admission;
5. remote-verified checkpoint preserves A;
6. restart recovery preserves A while current Journal is B;
7. verified A remains historical success under B;
8. verified A is current protection only under current A and matching P1-179 namespace;
9. missing legacy source revision cannot claim current protection;
10. unknown remote settlement cannot claim current protection;
11. late completion time does not order opaque revisions;
12. a late A operation cannot erase a newer accepted B coverage receipt under the existing settlement-authority model;
13. clear/import revision changes invalidate current coverage by identity, not content resemblance;
14. Chrome Storage notification token never becomes source authority;
15. export stabilization stays bounded;
16. no release-plane state is changed.

## 29. Fresh external primary-source research

The following sources were rechecked on 2026-09-11.

### 29.1 W3C IndexedDB 3.0

Source:

https://www.w3.org/TR/IndexedDB/

Relevant comparison:

- transaction scope and mode are fixed for a transaction;
- requests in a transaction are ordered;
- while a readonly transaction is live, data returned through requests created with that transaction remains constant;
- transactions are expected to be short-lived.

Project implication: WebClip already has a durable IndexedDB source-revision primitive and bounded transaction model. P1-207 should preserve source identity explicitly rather than create a long transaction spanning export/network work.

### 29.2 Chrome extension service-worker lifecycle

Source:

https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle

Relevant comparison:

- extension service workers can terminate after inactivity or unexpectedly;
- globals are lost when the worker shuts down;
- important application state should be persisted in storage rather than relying on globals.

Project implication: source revision A must be present in durable pending state before restart/recovery can be expected to preserve it.

### 29.3 SQLite Online Backup API

Source:

https://www.sqlite.org/backup.html

Relevant comparison:

- online backup can copy a live database while other clients continue to operate;
- completed backup represents a consistent snapshot;
- source writes during incremental backup can cause restart/reconciliation behavior.

Project implication: the identity of the source snapshot represented by backup bytes is a distinct concept from the time the copy operation completes.

This is comparison evidence, not a requirement to imitate SQLite's API.

### 29.4 PostgreSQL 18 backup manifest WAL ranges

Sources:

https://www.postgresql.org/docs/18/backup-manifest-format.html

https://www.postgresql.org/docs/18/backup-manifest-wal-ranges.html

Relevant comparison:

- PostgreSQL backup manifests carry structural provenance for a backup;
- WAL range objects retain timeline plus start/end LSN positions needed to make use of the backup.

Project implication: mature backup systems retain source-position/provenance information in addition to wall-clock metadata. WebClip's exact field is its own opaque Journal revision and must keep WebClip-specific semantics.

This is comparison evidence only.

## 30. Rejected alternatives

### A. “Recent `lastSuccessAt` means current Journal is protected”

Rejected. Completion time has no exact source-state identity.

### B. Read current Journal revision during recovery and attach it to recovered bytes

Rejected. It can relabel A bytes as B after restart.

### C. Use Chrome Storage `webclipJournalRevision` as the backup source revision

Rejected. It is a notification signal, not authoritative IndexedDB source identity.

### D. Order Journal revision strings to resolve late completions

Rejected. Revisions are opaque equality identities.

### E. Add a new backup-specific Journal counter

Rejected. It duplicates an existing authoritative revision and creates cross-domain divergence risk.

### F. Require a new artifact digest as part of P1-207

Rejected as owner expansion. Exact remote object/content identity belongs to remote-proof owners; P1-207 consumes their accepted result and binds it to source revision.

### G. Force immediate backup after every mutation

Rejected as an unowned policy change. P1-207 makes current coverage truth exact but does not redefine cadence.

### H. Hold one IndexedDB transaction through remote upload

Rejected. It conflicts with bounded transaction/lifecycle constraints and is unnecessary once source identity is retained in durable receipts.

## 31. Implementation handoff

A future implementation tranche should begin from fresh `main` and revalidate all source anchors. The minimum implementation shape is:

```text
1. stageFullJournalExportOnce:
   accept only revisionBefore == revisionAfter
   return that exact revision as sourceRevision

2. upload/pending preparation:
   persist sourceRevision before external transfer admission

3. remote-verified/recovery:
   preserve the same sourceRevision verbatim

4. success settlement:
   durably retain sourceRevision with accepted remote success under existing namespace/settlement authority

5. status/freshness:
   compare protected sourceRevision with authoritative current Journal DB revision
   compose with P1-179 namespace identity
   do not infer protection from lastSuccessAt alone

6. legacy state:
   absence of exact sourceRevision cannot claim current-source protection
```

Any implementation must independently preserve P1-177 scheduler-generation rules, P1-179 namespace binding, P1-184 remote proof, P1-198 physical identity, current bounded export behavior, and the release fence.

## 32. Research conclusion

P1-207 is confirmed on canonical `main@9305c64d1af93fddfdded3d4be27f956cc0839d8`.

The defect is not that WebClip lacks a Journal revision or lacks export-stability detection. Both already exist. The defect is that the exact stable revision proved during export is discarded before upload and therefore cannot survive pending recovery or successful settlement. Backup state then has completion time without exact source coverage identity.

The bounded fix contract is to retain the authoritative opaque Journal revision across the existing backup receipt chain and derive current protection by exact equality, composed with existing namespace and settlement authority. Physical success of backup A remains true even after B exists; it simply does not prove B is protected.

Research model PASS is architecture/research evidence only. It is not production PASS, browser qualification, release readiness, P1-231 S2 activation, or release authorization.
