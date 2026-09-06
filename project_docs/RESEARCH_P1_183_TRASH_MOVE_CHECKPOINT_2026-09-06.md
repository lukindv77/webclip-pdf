# P1-183 — durable exact Delete→Trash move checkpoint — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical `service-worker.js` blob: `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`  
Working branch: `research/p1-183-trash-move-checkpoint-2026-09-06`  
Owner: **P1-183 ACTIVE**.

This is a research/model checkpoint. Production runtime and manifest are unchanged.

## 1. Canonical owner

Current Registry defines P1-183 as:

> Delete→Trash needs durable exact source/target/object checkpoint before destructive move so crash/collision target is recoverable without blind second move.

P1-183 owns the durable **attempt receipt** for one destructive Delete→Trash move.

Adjacent authority remains separate:

- **P1-090** — target after unknown move must prove it is the same exact source object;
- **P0-022** — imported/legacy locator data is not destructive provenance;
- **P0-073/P0-074** — immutable account/root namespace and live Yandex context;
- **P0-076** — per-entry/Journal-generation CAS for local Journal mutation/finalization;
- **P0-069/P1-164** — public-link outcome/revocation semantics;
- **P1-198** — worker-issued live operation identity;
- **P1-210** — outer response-loss/retry UX.

## 2. Fresh current-source proof: Trash has no durable move receipt

Current `moveJournalYandexFileToTrash(entry, operationId)`:

1. reads current Yandex config;
2. locates the file;
3. computes source path;
4. prepares the monthly Trash folder;
5. chooses a target path with `chooseYandexTrashTarget(...)`;
6. issues `POST /resources/move` when source != target;
7. polls target metadata;
8. returns a transient `{sourcePath, trashPath, trashMonth, resourceId}` object.

The exact source/target pair and move attempt phase exist only in memory.

There is no durable Trash move checkpoint written before `/resources/move`.

## 3. Positive control: mark-read already demonstrates the required shape

Current ReadmeLater→Upload flow writes a Journal patch before its destructive move:

```text
readMovePendingAt
readMoveSourcePath
readMoveTargetPath
readMoveOperationId
readMoveLastError
```

This is incomplete for P1-090 exact object identity, but it is a useful architectural positive control: the project already uses a durable pre-mutation path checkpoint for another Yandex move.

Delete→Trash currently has no equivalent.

## 4. Crash schedule — move may commit, local state still old

```text
Journal entry J says source S
choose target T
POST move S -> T commits remotely
worker dies before verification/local Journal delete
```

After restart, J still contains its old visible state and there is no exact durable record saying:

```text
this delete attempt targeted T
this exact source identity A was being moved
remote settlement became unknown
```

A retry must reconstruct intent from mutable/global/current state instead of reconciling the exact prior attempt.

## 5. Timeout schedule — remote result unknown

Current Yandex mutation timeout is not proof that the provider did nothing.

If `/resources/move` times out or its response is lost:

```text
move may have committed
or may not have committed
```

Without a durable source/target/object receipt, the caller can only fail generically. A later retry may choose another target or run broad locator logic before it knows what happened to the exact first attempt.

Required:

```text
prepared checkpoint survives the unknown result
-> exact source/target/object reconciliation first
-> only then finalize or admit a genuinely new move attempt
```

## 6. Target choice is operation-owned state

`chooseYandexTrashTarget()` performs bounded collision checks and derives a timestamped Trash filename. That is a useful positive control.

But once target T has been chosen for attempt A and the destructive request may start, T becomes immutable attempt-owned state.

After an unknown result, recovery must not silently run target selection again and obtain T2 before reconciling T.

Otherwise:

```text
A attempt -> target T, outcome unknown
retry -> chooses T2
```

can create a second destructive move or lose the only exact location needed to identify the first outcome.

## 7. Collision schedule

```text
WebClip checks T and sees it free
checkpoint is absent
another actor/file B appears at T
move A -> T returns conflict or outcome becomes unknown
```

The recovery problem is not solved by choosing a new target immediately.

The exact first target T must be retained so P1-090 can inspect:

- source S for expected A;
- target T for expected A or conflicting B.

Only after that exact attempt is reconciled may collision policy admit a new target T2.

## 8. Required durable receipt

Conceptual receipt, composed with P1-090:

```text
trashMoveReceipt = {
  version: 1,
  journalEntryId,
  sourcePath: S,
  targetPath: T,
  expectedSourceResourceId: RID-A,
  sourceIdentityProvenanceReceipt: <P0-022/P1-090-owned authority>,
  accountRootScope: <P0-073-owned scope/reference>,
  movePhase: prepared | mutation-unknown | verified-same-object | local-finalization-pending | conflict | manual,
  preparedAt,
  operationReceipt: <P1-198-owned reference>,
  expectedJournalEntryRevision: <P0-076-owned value/reference>
}
```

The exact storage representation may differ. Do not persist OAuth tokens.

The receipt must be durable before `/resources/move` is admitted.

## 9. Checkpoint creation ordering

Required ordering:

```text
locate/admit trusted exact source A
choose collision-free target T
freeze exact source identity + T
write durable prepared receipt
wait for committed local checkpoint result
only then invoke POST /resources/move
```

If checkpoint persistence fails or is unknown and cannot be reconciled, do not start a new destructive remote mutation.

A local timeout on checkpoint write is not proof it did not commit; reuse the project’s existing late-settlement/transaction reconciliation principles rather than creating duplicate authority.

## 10. Recovery must prefer exact receipt over mutable Journal fields

Once a prepared/unknown Trash move receipt exists, recovery uses its immutable:

```text
sourcePath
targetPath
expected object identity
account/root scope
```

It must not rewrite those from:

- current configured root;
- a newly found path;
- a newly selected Trash filename;
- a different current Journal row with the same textual id after clear/import/replace.

P0-076 owns the Journal-generation/revision comparison required to prevent a stale receipt from mutating a replacement local row.

## 11. Exact reconciliation outcomes

P1-183 stores the attempt; P1-090 classifies same-object truth.

### Target T proves expected A

```text
-> move receipt = verified-same-object
-> local Journal delete/finalization may proceed under P0-076 CAS
```

### Source S still proves A, target T absent

```text
-> first move not yet proven committed
-> do not fabricate success
-> a new attempt may be admitted only after remote settlement/collision policy says retry is safe
```

### Target T contains B

```text
-> conflict
-> preserve receipt
-> do not delete/overwrite B
-> inspect source A state before any new target is selected
```

### Source/target indeterminate

```text
-> manual/unknown
-> no blind second move
```

## 12. Remote success followed by local Journal delete failure

Current delete flow performs:

```text
moveJournalYandexFileToTrash(...)
deleteJournalEntryRecordOnly(id)
```

If remote move succeeds but local delete fails/crashes, the durable move receipt must survive so retry can finish the **local** deletion without moving the remote file again.

Recommended phase:

```text
verified-same-object / local-finalization-pending
```

Then:

- no second `/resources/move` is needed;
- P0-076 verifies the exact Journal row/generation before deletion;
- if the row was replaced, fail closed instead of deleting the replacement.

## 13. Local Journal delete success followed by lost outer response

If exact local deletion commits but the caller loses the response, the user-facing retry semantics belong to P1-210/P1-198.

P1-183 must not keep a stale receipt that later causes a second remote move merely because the page did not receive success.

A terminal receipt/tombstone may be needed only if required by the exact outer reconciliation architecture; P1-183 does not independently define long-term operation-history retention.

## 14. Already-in-Trash case

If trusted exact source A is already within the managed Trash namespace, a new remote move is unnecessary.

The operation may proceed toward local deletion only after exact-object/account/provenance checks pass.

Do not treat `path starts with /Trash` alone as proof that the object is the intended A.

## 15. Public-link composition

Moving/deleting a Journal entry that has a public Yandex link has separate publication-control requirements under P0-069/P1-164.

A successful Trash move receipt is not proof that public access was revoked. The move checkpoint must not erase `publicUrl` truth or claim revocation unless the publication owner proves it.

## 16. Implementation acceptance cases

Minimum future deterministic/source gate:

1. Trash move writes durable exact source/target/object receipt before first `/resources/move` call.
2. Checkpoint failure prevents remote move admission.
3. Crash immediately after remote move leaves exact target T recoverable.
4. Unknown first attempt never selects T2 before reconciling T.
5. Target collision B is preserved and classified, not overwritten.
6. Target RID-A verification allows local-finalization-only path; no second move.
7. Remote success + local Journal deletion failure resumes local finalization without another move.
8. Local finalization uses P0-076 exact entry/Journal-generation CAS.
9. Replacement Journal row with same id is not deleted by stale Trash receipt.
10. Source/target indeterminate state remains durable/manual rather than blind retry.
11. Existing mark-read path checkpoint remains a positive pattern but is not claimed sufficient for P1-183/P1-090 exact identity.
12. Current root/auth changes cannot rebind the receipt; P0-073/P0-074 decide admission.
13. Imported locator metadata cannot manufacture the source provenance receipt (P0-022).
14. Public link state is preserved truthfully unless P0-069/P1-164 proves revocation.

## 17. Status

P1-183 remains **ACTIVE**. Current Delete→Trash flow has no durable exact pre-move receipt, while a sibling mark-read move already demonstrates partial checkpoint infrastructure.

Runtime/manifest remain `0.9.8`; release remains `NOT READY`.
