# Audit delta — destructive Yandex Journal move must remain in one auth/account generation — 2026-08-28

Source-of-truth `main` immediately before this write: `2e505a785b5c75742b1aaca7470699c7500302cd`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Primary existing owner: **P0-074** — immutable Yandex account/auth/config operation context.

Required composition:

- **P0-073** — account/root fence for Journal remote identity;
- **P1-090** — exact source/target object continuity around destructive move;
- **P1-183** — durable Trash move checkpoint;
- **P0-076** — exact Journal entry generation/CAS for destructive local finalization;
- **P1-210** — unknown external/outer settlement reconciliation.

## Existing positive control

`findYandexFileForJournalEntry(entry, operationId)` already performs useful pre-operation checks:

- compares stored `rootPath` with the currently configured root;
- when `entry.accountUid` exists, fresh-reads current account UID and fails `YANDEX_ACCOUNT_MISMATCH` when it differs;
- locates/validates the candidate remote object before destructive action.

This prevents an entry explicitly bound to account A from being *initially* located in account B.

## Fresh TOCTOU generation gap

That account check is a point-in-time read, not an immutable operation context.

After source lookup, Trash and Mark Read perform more remote work:

- choose/create target folders/path;
- possibly create/check service folders;
- issue `POST /resources/move`;
- repeatedly `GET` target/source metadata for verification.

Every call goes through `yandexApi()`, which obtains the currently valid access token again for that request.

The destructive move functions do not pass the already-proven account UID/auth generation as an immutable requirement to later API calls.

Therefore auth can switch after the pre-check but before the actual move or verification.

## Deterministic Trash schedule

1. Journal entry E is locally bound to account A/root R and object O at source S.
2. `findYandexFileForJournalEntry(E)` proves current account=A and locates exact O/S.
3. Trash operation selects target T under A/R.
4. Before `POST /resources/move`, another Options page disconnects/re-authenticates to account B.
5. The move call fresh-reads current token B.
6. Textual `from:S/path:T` is now interpreted in B.
7. Depending on B contents, the call may fail, move a B object with the same paths, or create an unknown remote outcome unrelated to O.
8. Subsequent verification calls also run under whichever auth is current then.

The earlier `accountUid === A` check did not protect the irreversible side-effect boundary.

## Deterministic Mark Read schedule

The same gap exists for `ReadmeLater -> Upload`:

1. source object O is proven in A;
2. durable target-path checkpoint is established for A semantics;
3. auth changes to B;
4. `resources/move` or post-move verification runs with B token;
5. the stored checkpoint/path is now being interpreted in a namespace different from the one in which it was authorized.

This composes with P1-090 exact target `resource_id` continuity: object identity proof is only meaningful inside the correct account generation.

## Required P0-074 refinement

### Capture destructive remote context once

After initial account/root/object proof, create an immutable move context containing at least:

- exact account UID/auth generation;
- root/config generation;
- source object identity (`resource_id` and accepted fallback evidence);
- normalized source path;
- exact target generation/path;
- operation/physical move receipt id.

Every later Yandex request in that saga must verify/consume that context.

### Fresh token is not fresh authority

Token refresh/re-read can still be used as an implementation mechanism, but a newly read token is usable for the saga only if it proves the **same expected account/auth generation**.

A token for B must cause the old A operation to stop/supersede, never reinterpret A's paths under B.

### Unknown settlement remains attached to A

If `resources/move` was already admitted under A and its result is unknown when auth changes:

- preserve the A move checkpoint;
- do not inspect B target and call that reconciliation;
- do not blindly re-POST under B;
- when A becomes available again, reconcile A source/target/object identity, or retain explicit unresolved historical state.

### Local Journal finalization

Delete/Mark Read may update/remove the local Journal entry only after remote outcome is proved for the same A move context **and** P0-076 confirms the expected local entry generation.

## Required regressions

1. Entry A + current A, no auth change -> Trash/Mark Read normal success.
2. A pre-check succeeds -> auth switches B before move -> no move request is issued under B for the old operation.
3. A move admitted -> auth switches B before response -> A checkpoint remains unresolved; B is not used for verification.
4. A verification GET -> auth switches B mid-loop -> loop fails generation check rather than accepting B object/path.
5. Stored A target path happens to exist in B -> never accepted as A outcome.
6. Auth switches A -> B -> A; old operation resumes only by exact A receipt/reconciliation, not by textual path equality.
7. Root changes within same account after source proof -> old operation obeys captured root generation or becomes superseded.
8. Imported/unverified remote identity remains subject to P0-022 before this account-generation fence can authorize any move.
9. Exact target `resource_id` mismatch still fails under P1-090 even when account generation matches.
10. Local same-id replacement during remote wait still fails P0-076 CAS before final local mutation.

## Duplicate check

P0-073 already requires account/root binding for Journal remote identity, and current source implements a useful **pre-check**. P0-074 is the existing generic owner for one-operation Yandex generation coherence. P1-090 owns source/target object identity after move.

Repository history contained no dedicated checkpoint proving the gap between the successful account pre-check and the later destructive `resources/move`/verification calls. This is therefore a new manifestation of existing owners, not a new P-number.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build, tag or GitHub Release was created.