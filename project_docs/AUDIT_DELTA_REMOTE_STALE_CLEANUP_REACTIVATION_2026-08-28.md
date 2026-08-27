# Audit delta — remote stale cleanup vs reactivation generation — 2026-08-28

Source-of-truth `main` immediately before this write: `a1a5bf8143508218979b97c5cf7b0e6f219ede8a`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. This file does not assign a new P-number.

## Classification

Fresh source proof strengthens the already existing remote-save generation contract rather than creating a new item.

Primary owners remain:

- **P0-074** — immutable Yandex auth/config/account/root operation generation and generation-fenced remote checkpoint transitions;
- **P1-184** — exact remote object/content/attempt reconciliation and preservation of unresolved external side-effect evidence;
- **P0-073** — account/root namespace identity;
- **P0-076** — stale Journal generation cannot regain local finalization authority.

It composes with **P0-079** because a reactivated retry must still own one exact immutable PDF/content generation.

The existing `AUDIT_DELTA_YANDEX_REMOTE_CHECKPOINT_GENERATION_2026-08-27.md` already requires generation-aware compare-and-delete cleanup. This checkpoint adds a deterministic source schedule showing why that requirement applies not only to late operation completion, but also to background stale-retention cleanup itself.

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

The stronger architecture already required by the remote-checkpoint generation audit remains preferable:

- immutable physical key per remote-save generation;
- a separate latest-retry pointer by Journal entry;
- stale cleanup addresses the immutable A generation, so creating B cannot turn `delete(A)` into `delete(B)`;
- compare-and-delete still protects against phase changes within the same generation.

### Cleanup statistics and bounds

Retention/cap accounting must reflect committed decisions after revalidation.

If many stale candidates are reactivated while cleanup runs, maintenance may finish with fewer deletions than originally planned and retry the bound on a later cycle. It must not delete current active rows merely to satisfy the old snapshot's target count.

### Unknown external outcomes remain evidence

Composition with the existing remote stale-evidence retention audit remains required: pruning a full stale row may compact it, but capacity/age is not proof that an unknown signed PUT never happened.

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

Audit documentation only. No runtime/config/manifest change was made. Product tests were not rerun; the last proven product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Version remains `0.9.8`; no build, tag or GitHub Release was created.