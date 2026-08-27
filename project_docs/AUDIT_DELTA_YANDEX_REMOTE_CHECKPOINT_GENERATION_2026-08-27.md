# Audit delta — Yandex remote-save checkpoint generation ownership — 2026-08-27

Source-of-truth `main` immediately before this write: `2c6c374eef4dc6809dfff23f40e00d0f8b740116`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Scope

Fresh source audit of `pendingRemoteSaves` ownership across repeated/concurrent upload attempts for the same cached PDF / Journal entry.

Repository-wide semantic duplicate-check was performed against the canonical audit files and all current `project_docs/AUDIT_DELTA_*.md` checkpoints before assigning classification. No distinct new root cause requires a new P-number.

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

Canonical `PRIORITIES_P0_P1_P2.md` / `DEEP_AUDIT_2026-08-25.md` synchronization remains pending as a separate lossless registry-reconciliation step.

## Test / release state

No product tests were rerun for this docs-only checkpoint. The last proven product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** from the earlier runtime gate. No build, tag or Release was created.
