# Audit delta — remote checkpoint false admission receipt / archive reactivation — 2026-08-28

Source-of-truth `main` immediately before this write: `a37518c806a620bde610a54fb72da241ec2df131`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof refines the already established immutable remote-save generation contract owned by:

- **P0-074** — immutable Yandex operation/config generation;
- **P0-073** — exact account/root namespace binding;
- **P1-184** — exact remote object/content/attempt reconciliation;
- with **P0-076**, **P0-079**, **P0-078** and **P1-198** as required composition.

It also composes with the existing stale-evidence/cleanup checkpoints: archived unknown external evidence must not be silently replaced or deleted merely because a newer retry exists.

## Existing physical-key problem

`checkpointPendingRemoteSaveIntent()` still uses `prepared.journalEntryId` as the physical `pendingRemoteSaves` key.

There is no immutable `remoteSaveGenerationId` that independently identifies one physical PUT/reuse/verify attempt.

The helper's behavior when the key already exists is phase-dependent:

- active/non-terminal row -> replace with the new `item`, retaining original `createdAt`;
- `stale-unverified` -> replace with the new `item` and fresh `createdAt`;
- `remote-verified` -> preserve/spread the existing row and only refresh `updatedAt`/possibly `operationId`.

After the transaction, however, the function unconditionally returns its local **new `item`**, not the row actually committed/preserved in IndexedDB.

This produces a fresh false-admission manifestation beyond ordinary row overwrite.

## Fresh proof — `remote-verified` branch can return a checkpoint that does not exist

Deterministic schedule:

1. Remote attempt A for Journal id J reaches durable `phase='remote-verified'`, but local Journal finalization/cleanup has not yet removed the row.
2. User/product starts another attempt B that reuses J.
3. `checkpointPendingRemoteSaveIntent(B)` reads A.
4. Because A is `remote-verified`, the transaction keeps A's durable row; it does **not** write B's PREPARED metadata/account/root/path/content receipt as a new physical generation.
5. The helper nevertheless returns local `item B` with `phase='prepared'` to the caller.
6. Caller B now believes its `ensureRemoteCheckpoint()` succeeded and may continue toward reuse/upload/publication/verification.
7. If B starts an irreversible remote side effect and the worker dies, recovery has no durable B generation. IndexedDB still contains A-shaped verified evidence at J.

The successful return from checkpoint admission is therefore not proof that the returned attempt owns a durable recovery row.

## `operationId` mutation makes the preserved A row less truthful

For an existing `remote-verified` row the code can preserve A's data/object fields while replacing its top-level `operationId` with B's textual operation id.

Even before P1-198 replaces textual ids with worker receipts, this can create a contradictory record:

- A's remote-verified object/data;
- B's operation correlation label;
- no durable B PREPARED generation.

OperationLog/progress attribution can therefore suggest B owns evidence physically produced by A.

A worker-issued receipt must be immutable with the physical generation; a later retry cannot relabel an already verified attempt.

## Capacity consequence

New checkpoint admission normally counts active non-`stale-unverified` rows and rejects when `MAX_PENDING_REMOTE_SAVES=20` is reached.

But the `existing` branch returns before the new-row active-capacity scan.

For B sharing J with A:

- no distinct durable B row is counted;
- the helper still reports checkpoint success to B;
- B can therefore begin additional remote work while the durable recovery store represents only A.

The problem is not simply that the numerical cap is off by one. The deeper invariant is that **every irreversible remote attempt admitted by the product must first own one exact durable generation that is included in admission/accounting**.

## `stale-unverified` branch has the inverse evidence problem

When A is `stale-unverified`, retry B replaces A with `{...itemB, createdAt:now}`.

That does create a B-shaped active row, but it destroys A's unresolved external evidence in the same physical slot.

This is already covered by the remote stale-evidence/generation deltas. The contrast is important:

- stale branch: B becomes durable by erasing A;
- verified branch: A remains durable while B falsely believes it became durable.

Both failures are eliminated by immutable per-attempt generations rather than phase-specific overwrite rules.

## Required unified admission contract

Before any external side effect B can start:

1. allocate a unique immutable remote-save generation/receipt RB;
2. durably commit RB with exact operation receipt, Journal target generation, PDF/content receipt, account/root/config generation, remote path and publication-policy generation;
3. return **the exact stored receipt RB**, not merely the caller's proposed object;
4. include RB in active/global capacity accounting until its physical settlement is known or it transitions to a compact unresolved-evidence class;
5. every later verify/failure/stale/finalize/delete transition must compare RB inside the authoritative transaction.

A previous A may coexist with B when A's external result remains relevant. A user-facing latest-retry pointer may point to B, but it cannot substitute for physical ownership rows.

## Terminal/archived generations

`remote-verified` should be treated as a physical generation that already owns remote object proof, not as a convenient shared Journal-id slot for a new attempt.

`stale-unverified` should remain unresolved evidence and may be compacted according to the P1-184 retention design, but a new attempt cannot destroy its last receipt merely to reuse J.

If product semantics determine that no second physical attempt should be admitted while a verified generation awaits Journal finalization, return an explicit existing-generation/reconcile result. If a second attempt is intentionally allowed, allocate RB separately. Both are safer than returning a fictional PREPARED B.

## Required deterministic regressions

1. A is remote-verified at J; B requests checkpoint J -> B either receives/reconciles exact A explicitly or obtains distinct durable RB. It never receives a PREPARED receipt whose row does not exist.
2. Same schedule + worker crash after B external admission -> recovery can enumerate B's exact generation; B is not lost behind A.
3. A's verified row cannot have its operation receipt relabeled to B merely because B reused J.
4. Active queue at capacity + B reusing an existing J cannot bypass admission/accounting and start an unrepresented external attempt.
5. A stale-unverified + B retry -> B may become latest retry but A's compact unresolved evidence remains separately addressable until legitimate resolution/retention transition.
6. Late A verify/failure/cleanup cannot mutate/delete RB.
7. B verify cannot write B object proof into A's verified generation.
8. A and B under different account/root/publication-policy generations remain fully separable after restart.
9. Journal finalization accepts only its exact remote-save receipt plus expected Journal generation; existence of any row sharing J is insufficient.
10. A terminal verified generation may be cleaned only after exact Journal/local reconciliation; cleanup cannot remove a newer B generation.

## Duplicate check

No new item is created. The missing invariant is the same immutable remote-attempt generation already required by `AUDIT_DELTA_YANDEX_REMOTE_CHECKPOINT_GENERATION_2026-08-27.md` and composed with stale-evidence retention/reactivation deltas.

This checkpoint adds a concrete acceptance condition: **checkpoint admission success must correspond to the exact durable row/generation returned to the caller.** A phase-specific preserve/overwrite branch may not return a fictional new receipt.

## Test / release state

No product tests were rerun for this docs-only checkpoint. Historical product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime/version remain unchanged (`0.9.8`). No build, tag or Release was created.