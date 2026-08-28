# Audit delta — stale remote-checkpoint cleanup vs retry reactivation CAS — 2026-08-28

Source-of-truth `main` before this checkpoint: `689aab11c405a6382a360009847615f9360cd247`.

Docs-only audit checkpoint. Runtime/tests/config/manifest are unchanged.

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

The existing immutable remote-generation audits already require A and B eventually to be separate generation identities. Current source still reuses the physical key, making the race immediately destructive.

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
