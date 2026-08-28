# Audit delta — Yandex single-operation auth/root/account context coherence — 2026-08-28

Source-of-truth `main` immediately before this write: `33e9b18a423440e14c538583acb0c5768fdd6fa9`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof strengthens existing:

- **P0-074** — one immutable Yandex auth/config operation context for the full long-running operation;
- **P0-073** — account/root namespace proof must describe the same remote object attempt;
- **P1-178/P1-191/P1-196** — auth replacement/completion/validity generations;
- **P1-184** — remote object/content proof must be bound to that same operation context;
- **P1-158** — bounded prerequisite config/auth reads, without treating a fresh read as permission to switch semantic generation mid-operation.

The new deterministic proof is a **mixed-root checkpoint inside one ordinary upload**: current code can produce a receipt whose `rootPath` comes from generation A while `remotePath` was built under newer root C and `accountUid` was obtained from another fresh auth read.

## Current upload reads mutable Yandex state more than once

`uploadCachedRecordToYandex()` begins with:

`const config = await getYandexConfig()`

and keeps that object in the local `config` variable.

It later calls:

`ensureYandexServiceFolders(...)`

which itself executes another:

`const config = await getYandexConfig()`

and independently calls `getValidYandexAccessToken()`.

The upload then builds `branchPath`, `targetFolder` and `remotePath` from the **returned structure**, while later computing:

`const accountUid = await getCurrentYandexAccountUid(operationId)`

and separately:

`const rootPath = normalizeDiskPath(config.rootPath || '')`

using the **original first config snapshot**.

Those values are written into the remote-save checkpoint together.

## Deterministic A -> C mixed-root receipt

1. Upload U starts while current root is A; first `getYandexConfig()` returns A.
2. Before `ensureYandexServiceFolders()` reads config, user changes root to C.
3. `ensureYandexServiceFolders()` reads C and creates/verifies C's service branch.
4. Returned `structure.uploadPath`/`readLaterPath` is under C.
5. `targetFolder` and `remotePath` are therefore built under C.
6. `getCurrentYandexAccountUid()` performs another current auth read and may observe the current account/auth generation at that later time.
7. `rootPath` for the checkpoint is nevertheless taken from the original local `config` A.
8. `checkpointPendingRemoteSaveIntent()` can therefore receive `remotePath=C/...` with `rootPath=A`.

No concurrency between two uploads is required. One user/config mutation during one upload is enough.

## Account/auth can be another independent generation

`getCurrentYandexAccountUid()` fresh-reads `readYandexAuthState()` at the moment it is called. If an auth replacement happened after the service-folder work, account identity can belong to a different generation from the token used by an earlier API call.

`yandexApi()` itself obtains `getValidYandexAccessToken()` for each request rather than receiving an immutable operation token/context.

Therefore a multi-request sequence can legitimately perform different network requests under different current auth generations unless every step is fenced externally.

Physical serialization of auth/config storage writes does not solve this. A fresh read is current at one instant; it is not proof that the entire already-started operation has authority to switch to that generation.

## Why this receipt is dangerous

P0-073/P1-184 recovery relies on account/root/path fields as namespace and object evidence.

A checkpoint that internally says:

- expected root A;
- remote path under C;
- account UID from another current generation;

is not a trustworthy operation receipt even if each individual field was correctly read at some point.

Depending on later validation order this can cause:

- recovery to fail permanently after an external object was actually created;
- a false root/account mismatch that loses local finalization authority;
- or future code to accidentally weaken containment checks to accommodate impossible mixed receipts.

The correct fix is not to loosen validation. It is to prevent the impossible receipt from being admitted.

## Destructive/move flows have the same architectural requirement

Journal Trash/ReadLater move paths repeatedly combine:

- current account proof;
- current `getYandexConfig()` root;
- located source path;
- service-folder preparation;
- later `yandexApi()` requests.

Even when individual path containment checks are correct, a root/auth change between these stages must make the old operation stale; it must not silently continue by adopting the newer current config/token.

P0-074 therefore applies symmetrically to uploads, recovery and destructive moves.

## Required immutable `YandexOperationContext`

At operation admission, capture/issue a context receipt that binds at least:

- auth-session generation/token fingerprint without logging the secret;
- proven account UID generation;
- config generation;
- normalized rootPath;
- publication-policy generation where applicable;
- operation/remote-save receipt.

Every remote API/ensure/locate/upload/verify step must either:

1. execute using that exact context; or
2. fresh-check current state only to prove the context is still current, failing stale before a new side effect if it changed.

A helper must not silently substitute a later current root/token into an older operation and still report success for the older operation.

## API/helper consequence

`ensureYandexServiceFolders()` should not internally choose a different root generation for a caller that already owns an operation context. It should accept the exact context/root or validate an expected generation.

Likewise `yandexApi()` in a long operation should not independently choose whichever token is current on every call. The request should be attributable to the exact operation auth generation; a 401/demotion must also be generation-specific under P1-196.

P1-158 bounded-read work remains necessary, but replacing direct reads with bounded fresh reads alone is insufficient: bounded A/C/B reads can still create a logically mixed receipt.

## Required deterministic regressions

1. Upload starts under root A -> root changes to C before service-folder ensure -> old upload fails stale before external mutation under C, or continues entirely under immutable A; it never checkpoints `root=A, remotePath=C/...`.
2. Root changes after service-folder ensure but before checkpoint -> old context remains internally consistent or fails stale; no mixed receipt.
3. Auth A starts upload -> auth B replaces it between two Yandex API requests -> old operation cannot silently perform later requests under B and finalize them as A.
4. A -> B -> A with distinct auth/config generations does not pass equality merely because values later look identical; generation receipt distinguishes them.
5. Account UID obtained under auth B cannot be combined with root/path/object proof from operation A without explicit same-context validation.
6. Remote checkpoint stores one coherent account/root/path/auth/config generation and recovery verifies the same tuple after restart.
7. ReadLater -> Upload move root changes between locate and target-folder ensure -> no move occurs under a root generation not authorized by the operation.
8. Trash move auth changes after source object proof -> late old operation does not use the newer token to mutate the object.
9. `saveYandexRoot(B)` racing `saveYandexRoot(C)` continues to obey the previously recorded rule: B cannot report `structureVerified:true` for C.
10. A stale 401 from auth A cannot demote current auth B; P1-196 uses exact auth generation.
11. P1-158 timeout of a prerequisite config/auth read fails boundedly without causing a later read result to start an old operation under a new context.
12. Normal stable auth/root operation still completes with one coherent receipt and no extra user-visible prompts.

## Duplicate check

No new item is created.

Existing auth/config-write and account-cache deltas already establish stale async writer races. Existing remote-checkpoint-generation delta establishes cross-attempt row ownership. This checkpoint adds a complementary within-one-operation proof: **independent fresh reads can create a mixed semantic generation even when no stale write or concurrent upload row overwrite occurs.**

The root invariant is still P0-074/P0-073/P1-184: one immutable operation context from admission through external side effects and recovery.

## Test / release state

No product tests were rerun for this docs-only checkpoint. Historical product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime/version remain unchanged (`0.9.8`). No build, tag or Release was created.