# Audit delta — backup source revision through crash recovery — 2026-08-28

Source-of-truth `main` immediately before this write: `d5e7c430132518088e0871840676fc0f7dc12cf9`.

Docs-only audit checkpoint. Runtime/config/manifest/tests are unchanged.

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
