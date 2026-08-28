# Audit delta — ReadLater -> Upload move must retain one Yandex account/config generation — 2026-08-28

Source-of-truth `main` immediately before this write: `91e03a6947d7dc1dae95f3ba266a5d982905e9e1`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged. No new P-number is assigned.

## Classification

Primary owner: **P0-074 — immutable Yandex operation/account/config context**.

Adjacent:

- **P1-090** — ReadLater->Upload move identity/recovery correctness;
- **P0-076** — exact Journal entry/mutation generation;
- **P0-073/P1-184** — remote object provenance/identity;
- existing post-move identity-continuity delta.

## Existing positive control

`findYandexFileForJournalEntry(entry, operationId)` does useful preflight checks:

- current root is compared with stored `entry.rootPath` when present;
- current account UID is read and compared with stored `entry.accountUid` when present;
- candidate paths are constrained to managed branches;
- stable `resourceId/publicUrl` is used when available.

This correctly fails closed when the operation **begins** while the wrong account/root is already current.

## Fresh gap — preflight is not a long-operation context receipt

`moveReadLaterEntryToRead()` continues for multiple remote/local stages after that check:

1. locate current remote file;
2. separately read current Yandex config;
3. call `ensureYandexServiceFolders({includeUpload:true})`;
4. choose/restore target path;
5. persist `readMovePendingAt/readMoveSourcePath/readMoveTargetPath/readMoveOperationId`;
6. `POST /resources/move`;
7. poll target metadata with repeated GETs;
8. update Journal row to `readingMode:'read'` and clear pending fields.

`yandexApi()` obtains a valid access token for each request rather than consuming one immutable account/auth receipt accepted at Mark Read admission.

Therefore account/config can change **after** the initial identity check.

## Deterministic cross-account schedule

1. Entry E belongs to account A/root R and has valid accountUid/resource identity.
2. Mark Read starts under A; `findYandexFileForJournalEntry()` proves A and returns source S.
3. Before service-folder preparation or move, user replaces auth with account B. Assume B uses the same textual root R and contains coincidentally matching managed paths.
4. Later `getYandexConfig()`/`getValidYandexAccessToken()` calls observe B.
5. `ensureYandexServiceFolders()` and later Yandex API calls now operate under B.
6. The operation can select/create target T in B or attempt/move B's object at the same textual S/T paths.
7. Verify GETs likewise use whichever auth is current at each call.
8. Local Journal finalization can then describe one logical Mark Read operation even though its remote observations/mutations crossed accounts.

Root containment does not solve this: the same managed textual namespace can exist independently in multiple accounts.

## Durable checkpoint issue

Before the destructive move WebClip writes `readMoveSourcePath/readMoveTargetPath`, which is a good crash-recovery principle. But those paths are not self-describing physical receipts: their meaning depends on the account/root/auth generation under which they were admitted.

The checkpoint should therefore carry or reference an immutable move-generation receipt containing at least:

- accepted account UID/auth generation;
- accepted root/config generation;
- source object identity (`resourceId`/verified provenance);
- source path observation;
- target path generation;
- operation/move generation.

A later recovery attempt must reconcile that exact context. A different current account must quarantine/defer the old saga rather than reinterpret its paths there.

## Required contract

After initial admission, every remote stage of one physical move saga must either:

- consume one immutable `YandexOperationContext`; or
- fresh-check that the exact accepted account/root/config generation is still current before each side-effect/verification stage and fail `superseded` on mismatch.

A stale operation must not silently rebind to a newer auth/config generation merely because a helper performs a fresh read.

Post-move verification must also preserve the existing P1-090 requirement that target object identity is the same exact source object, not merely `type:'file'` at T.

## Required regressions

1. Mark Read entirely under account A succeeds normally.
2. A preflight -> auth switches B before folder preparation -> operation stops before B mutation.
3. A preflight -> auth switches B after checkpoint but before move -> checkpoint remains historical/unresolved for A; it is not executed in B.
4. A move request settles under A -> auth switches B before verify -> B metadata cannot be accepted as A move proof.
5. Root R1->R2 mid-operation yields superseded/conflict rather than mixed source/target.
6. Reauth to the same account with a compatible auth generation may continue only according to explicit operation-context semantics; account equality alone must not conceal a conflicting config generation.
7. Restart with pending A move while B is current -> safe defer/quarantine until A context can be reconciled; no B path mutation.

## Duplicate check

The existing Yandex operation-context delta proves mixed-generation behavior for uploads, and the move post-state delta proves exact source/target identity continuity. Repository search found no dedicated ReadLater move checkpoint for **account/config change after the initial provenance check but before move/verify**. This is a new manifestation of P0-074/P1-090, not a new root-cause number.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build/tag/Release was created.