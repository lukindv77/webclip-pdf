# Audit delta — transfer payload group deletion ownership revalidation — 2026-08-28

Source-of-truth `main` before this checkpoint: `c55455f98f122863cb30ec563569155c251c134e`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Result

Fresh source revalidation did **not** prove a new independent correctness blocker in `deleteTransferPayloadGroup()`.

No new P-number is assigned.

This checkpoint records the positive ownership/atomicity controls so future audit work does not incorrectly generalize the stale-key races found in `pendingRemoteSaves`, backup singleton state or OperationLog cleanup to this transfer primitive.

## Exact transfer group namespace

Chunked transfer ids are formed by:

`transferChunkId(baseId, index) -> <baseId>:chunk:<zero-padded-index>`.

Group deletion scans the transfer store and deletes only records satisfying:

- `id === key`; or
- `id.startsWith(key + ':chunk:')`.

The delimiter is part of the prefix test.

Therefore base key `A` does not accidentally match unrelated key `AB...`; only the exact base record and its documented chunk namespace are selected.

## Group identities are generated as fresh staging generations

The current staging/export flows use fresh random transfer/staging identifiers (UUID where available, randomized fallback otherwise) rather than intentionally reusing a stable tab/Journal key for successive payload generations.

This is materially different from the already audited `pendingRemoteSaves` design where a stable `journalEntryId` is reused as a physical attempt key.

A late cleanup for transfer group GA therefore has no normal product path that turns GA into the ownership key of a newer payload GB.

## Delete occurs in one IndexedDB readwrite transaction

`deleteTransferPayloadGroup()` opens one readwrite transaction, scans the store, issues deletes for the exact base/chunk namespace and resolves on transaction completion.

If its bounded deadline wins, it attempts `tx.abort()`.

IndexedDB transaction atomicity means the expected failure model is:

- deletion transaction commits as a unit; or
- abort rolls back that transaction.

This avoids the more dangerous shape `readonly snapshot -> unrelated mutation -> blind later delete` that was confirmed for stale remote-checkpoint cleanup.

## Timeout is bounded

Group deletion uses an absolute deadline (normally ~20 seconds, or the caller's remaining build deadline).

A very large transfer store therefore cannot block the worker indefinitely merely because group cleanup performs a full cursor scan.

If the transaction times out/fails, many callers use best-effort cleanup and TTL maintenance remains a later reclamation path. This can leave temporary storage longer than desired, but current source proof does not turn that bounded leak into cross-generation deletion/corruption.

The existing storage/admission/maintenance items remain responsible for aggregate store pressure and bounded cleanup cost.

## Contrast: no snapshot-delete CAS gap here

The remote stale cleanup finding from the current session has this unsafe shape:

1. readonly transaction decides key J is stale;
2. retry replaces J with a new active generation;
3. separate write transaction blindly deletes J.

`deleteTransferPayloadGroup(G)` instead makes selection/deletion within the same readwrite transaction over one immutable group namespace.

There is no equivalent window in which a later normal staging operation deliberately reuses G as its physical owner.

Do not copy the remote-generation diagnosis mechanically onto this primitive.

## Active owner lifetime remains a separate P1-035 issue

This positive result does **not** close the existing active-staging lifetime defect.

Hourly `cleanupTransferPayloads()` still uses wall-clock age and can delete a transfer payload while a Journal page remains in a long-lived 9-digit import confirmation. That issue is already recorded under **P1-035**.

The distinction is:

- `deleteTransferPayloadGroup(exact G)` — explicit exact-group cleanup primitive is generation-isolated in current design;
- generic TTL cleanup — must know whether G has a live owner/lease before classifying it as stale.

Do not weaken P1-035 merely because explicit group deletion is correct.

## Imported/staged source authority remains separate

Exact group ownership also does not prove the bytes inside G are authorized for a destructive Journal import.

P0-013/staging receipt work still requires:

- exact selected remote/file source receipt;
- immutable staged payload generation/digest;
- preview/validation receipt;
- expected Journal replacement generation.

This checkpoint covers only cleanup isolation of the temporary physical group.

## Security/trust boundary

The runtime message that explicitly discards staged import data is restricted to trusted extension-page callers by the surrounding worker ACL.

A staging key is still a capability-like random identifier and should not be exposed to page-world/untrusted content. Current audit found no need to make group ids globally discoverable.

If future code introduces user-supplied/reused base ids, this positive conclusion must be revisited; exact delimiter matching alone does not supply owner provenance for attacker-chosen namespaces.

## Required regression/guard tests

These tests are recommended as preservation tests rather than closure of a new blocker:

1. Groups A and AB coexist -> deleting A removes A + `A:chunk:*` only; AB survives.
2. Groups A and `A2` coexist -> deleting A cannot remove `A2:chunk:*`.
3. Exact group with base + multiple chunks -> one successful transaction removes the complete group.
4. Forced transaction abort midway -> transaction is rolled back; no logically partial group is reported as successfully deleted.
5. Cleanup timeout remains bounded and later TTL maintenance can reclaim the orphaned exact group.
6. Fresh staging generation B uses a new base id; late cleanup of A cannot select B.
7. Generic TTL cleanup with a live import confirmation remains governed by P1-035 and must not use this positive result as permission to delete active G.
8. Destructive import validates exact staged generation independently of cleanup namespace correctness.

## Duplicate check / numbering

No new P-item is created.

Relevant existing owners remain:

- **P1-035** — active transfer/import staging lifetime vs TTL cleanup;
- **P1-043** — shared storage budget/reservation;
- maintenance/IDB deadline items for bounded cleanup;
- P0-013/import staging receipt items for source/content authority.

This is intentionally a negative duplicate decision and positive-control checkpoint.

P1-211 remains unassigned.

## Test / release state

No product tests were rerun. Historical **88/88 syntax + 74/74 deterministic PASS** remains prior evidence only. No runtime/build/tag/Release change was made.
