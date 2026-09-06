# P0-074 — immutable live Yandex operation context — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Research branch entering this checkpoint: `research/p0-074-immutable-live-yandex-context-2026-09-06 @ 0e230c9ce1d7beccbacbf989f4d2c475b6bd8ab0`  
Owner: **P0-074 ACTIVE**. Adjacent owners: P0-073, P0-078, P1-090, P1-178/P1-191, P1-198.

This is defensive reliability/data-integrity research. Production runtime is unchanged.

## 1. Current source proves repeated mutable reads inside one Yandex operation

### 1.1 `yandexApi()` rereads the current token for every request

Canonical `yandexApi()` calls `getValidYandexAccessToken()` inside the API helper. Therefore two consecutive calls in one logical operation do not share an immutable auth capability.

A schedule such as:

```text
GET under token/account A
current auth switches to B
PUT/GET/poll under token/account B
```

is structurally possible without either individual request being malformed.

### 1.2 Public-link flow spans several independent auth reads

`ensureYandexPublicUrl()` performs a sequence equivalent to:

```text
GET /resources
PUT /resources/publish
GET /resources (poll/readback)
```

through ordinary `yandexApi()`. Each stage may therefore observe a different current token.

### 1.3 Remote-save recovery has availability preflight, not immutable context

`recoverPendingRemoteSaves()` currently performs a one-time `getValidYandexAccessToken()` availability check, but later resource GET/publish calls still go through `yandexApi()` and reread current auth. The preflight is not authority for those later calls.

P0-073 supplies the expected durable account/root scope. P0-074 must supply the one live context used by every request for that recovery item.

### 1.4 Upload crosses a signed-URL boundary

`uploadCachedRecordToYandex()` obtains `/resources/upload` through `yandexApi()`, then sends bytes through the returned signed URL, and later verifies the remote object through another `yandexApi()` call.

The signed upload URL is already a capability issued in the account context that produced it. If auth switches A -> B while the offscreen PUT is running, verification must remain in A's captured context; silently verifying B is invalid.

### 1.5 Config/root is also reread

The upload first reads `getYandexConfig()`, then calls `ensureYandexServiceFolders()`. That helper itself starts with another `getYandexConfig()` and another auth availability read. Historical consolidated evidence already records the deterministic mixed-root schedule A -> C where the operation starts from A but prepares/builds its remote path from later C.

### 1.6 Account UID lookup is not a context capture

`getCurrentYandexAccountUid()` reads the current auth snapshot, may return cached UID, and on cache miss calls `yandexApi()` which independently rereads current token. Thus a UID precheck plus later ordinary API calls cannot prove one auth generation.

## 2. Required live context

One logical Yandex operation/recovery item receives one non-durable immutable live context. Conceptually:

```text
YandexOperationContext v1
  safe metadata:
    accountUid
    rootPath/config snapshot where relevant
    createPublicLinks snapshot where relevant
    auth generation / config generation receipts
    contextId for diagnostics

  secret capability:
    captured access token
```

The access token is memory-only. It is never copied into IndexedDB, `chrome.storage.local`, Journal data, OperationLog payloads, error strings or source-bound receipts.

Prefer keeping the token behind a closure/private map/non-enumerable capability rather than an ordinary enumerable field, so accidental JSON serialization of the context cannot disclose it.

## 3. Coherent acquisition requires more than `Object.freeze()`

Freezing a mixed snapshot is still wrong.

Unsafe acquisition:

```text
read auth A
root changes / auth changes
read config C
Object.freeze({A, C})
```

The accepted context would be immutable but semantically mixed.

Required acquisition must prove a coherent snapshot. Preferred design:

1. auth authority has a monotonic generation that changes whenever token/account capability authority changes;
2. operation-relevant Yandex config has a monotonic generation that changes whenever root/publication-relevant config changes;
3. bounded acquisition reads auth/config plus generations and rechecks generations before acceptance;
4. if either generation changed during acquisition, retry from the beginning within a small bounded limit;
5. generation exhaustion/invalidity fails closed; no wrap and no best-effort mixed snapshot.

If generation fields are introduced under adjacent owners, P0-074 consumes them rather than inventing parallel competing identity. Equality of raw values alone is insufficient because of ABA schedules.

## 4. Account identity must be proven with the captured token

For P0-073 recovery, expected durable account UID is known before network reconciliation.

Acquisition must establish live account identity using the same captured auth capability that later API calls use. A cached account UID is acceptable only if another owner has made its binding to the exact auth generation authoritative; otherwise perform the bounded read-only Disk/account identity request with the captured token.

Then:

```text
captured live UID == expected durable UID
-> context may be admitted

captured live UID != expected durable UID
-> deferred-account-mismatch
-> no object GET/publish/mutation for this checkpoint
```

The identity proof itself must not call an API helper that rereads mutable current auth.

## 5. Context-bound API primitive

Introduce one request path conceptually equivalent to:

```text
yandexApiWithContext(context, endpoint, options)
```

Required properties:

- uses only the captured token/capability from `context`;
- never calls `getValidYandexAccessToken()` internally;
- retries the same request only with the same context;
- 401/403/invalid captured auth ends or defers that context; it never silently adopts a newly current token;
- logs only safe context metadata, never token/header secrets;
- bounded timeout/unknown-settlement semantics remain owned by existing mutation-recovery owners.

A later maintenance/recovery cycle may acquire a fresh context. A new token for the **same expected account** can therefore be used in a new cycle. The prohibition is switching context in the middle of the current item.

## 6. Context propagation requirements

The same context must propagate through the entire logical chain.

### Remote-save recovery

```text
acquire context
prove checkpoint expected account
GET object
optional publish
publish poll/readback
mark verified/local finalize
```

All remote requests before `remote-verified` use the same context. `remote-verified` remains local-only and needs no live context.

### New PDF upload

```text
capture coherent auth/config context
prepare service folders under captured root
build target path under captured root
obtain signed upload URL under captured auth
perform signed PUT
verify object under captured auth
optional publish/poll under captured auth
write durable non-secret scope/receipt
```

The offscreen signed PUT does not need the OAuth token, but its result belongs to the context that issued the signed URL and must be verified with that same context.

### Folder/move/backup flows

Any one multi-step Yandex operation that combines root selection, source/target lookup, service-folder preparation, remote mutation and readback must either consume one context or explicitly split into independently admitted operations with durable receipts. It must not fresh-read mutable auth/root between semantic stages.

## 7. Auth/config change during an operation

P0-074 separates **context identity** from **permission to start a later mutation**.

A context is never replaced by B simply because current settings/auth changed. However this does not make old A an irrevocable permission forever.

If an adjacent owner says a newer auth/privacy generation revokes a not-yet-admitted mutation:

```text
old context A + revocation
-> stop/defer/fail closed
-> never substitute context B
```

In particular, P0-078 still owns publication-policy generation/revocation. P0-074 must not turn a captured `createPublicLinks=true` into reusable publication authority after a newer disable/revocation.

Likewise P1-178/P1-191 own logical auth replacement/disconnect authority. P0-074 only guarantees that an admitted request never crosses into another account/token accidentally.

## 8. Durable boundary with P0-073

P0-074 live context contains secret capability and is ephemeral.

P0-073 checkpoint persists only non-secret expected scope, for example:

```text
yandexAccountRootScope = {
  version: 1,
  accountUid,
  rootPath
}
```

No access token, Authorization header or live token handle is persisted.

A worker restart discards the old live context. Recovery then acquires a new one and proves it against the durable expected account before any remote reconciliation.

## 9. Exact remote object boundary

Even a perfectly immutable live context proves only that requests are made under the correct account/root/auth generation.

It does not prove that a path still denotes the exact same object after overwrite/replacement. P1-090 remains open unless exact durable object identity exists.

## 10. Deterministic model

Added:

`project_tools/test_p0_074_immutable_live_yandex_context_model.js`

The model covers:

1. global token A -> B switch cannot mix one captured operation;
2. signed-upload verification stays with the account that issued the upload capability;
3. expected-account mismatch defers before remote object calls;
4. a later recovery cycle may acquire a new token for the same expected account, but the current context is not mutated;
5. durable P0-073 scope excludes the token;
6. root/config changes do not rewrite captured operation config;
7. invalid old context does not silently adopt a newly current token.

The model is architecture evidence only. It does not prove production runtime conformance.

## 11. Source-bound acceptance target

A P0-074 source gate should require at minimum:

- an explicit immutable context acquisition primitive;
- an explicit context-bound Yandex API primitive that does not reread current token;
- `ensureYandexPublicUrl()` receives/uses the same context for GET/publish/poll;
- `recoverPendingRemoteSaves()` acquires one context per unverified item and passes it through all remote calls;
- upload signed-URL acquisition and post-PUT verification use the same context;
- service-folder preparation consumes captured root/auth rather than fresh `getYandexConfig()`/`getValidYandexAccessToken()`;
- no context secret is durably serialized/logged;
- `remote-verified` remains local-only.

## 12. Status

P0-074 remains **ACTIVE**. Current runtime does not yet provide the context-bound request path, and production `service-worker.js` remains unchanged (`0.9.8`).

No build, tag, GitHub Release, PR or release process was created or started.
