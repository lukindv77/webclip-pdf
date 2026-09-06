# P0-073 — immutable Yandex account/root scope for remote-save recovery — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-073-yandex-account-root-context-2026-09-06 @ d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Owner: **P0-073 ACTIVE**. Adjacent live-auth owner: **P0-074 ACTIVE**.

This checkpoint defines the durable account/root scope required for pending Yandex remote-save recovery. It changes no production runtime.

## 1. Current checkpoint already carries useful data, but not authority

Fresh Yandex save data usually includes:

```text
accountUid
rootPath
remotePath
resourceId
expectedPdfBytes
```

`normalizePendingJournalAppendData()` preserves bounded `accountUid`, `rootPath`, `remotePath` and resource metadata, but these are currently optional strings. `checkpointPendingRemoteSaveIntent()` does not require a versioned immutable account/root authority record.

The current `recoverPendingRemoteSaves()` then uses `remotePath` with the **current** `yandexApi()` credentials. It does not prove that the current authenticated account is the checkpoint account before GET/publish.

## 2. Cross-account false-positive schedule

```text
checkpoint A:
  accountUid=A
  rootPath=/RA
  remotePath=/RA/x.pdf
  expectedPdfBytes=N

user switches current auth to B
B happens to contain /RA/x.pdf with size N
```

Current recovery performs GET `/resources` under B credentials by path, accepts the current metadata size, and may call `ensureYandexPublicUrl(remotePath)`.

`ensureYandexPublicUrl()` also operates only by path: GET -> `/resources/publish` -> GET polling. It accepts no expected account UID or expected resource id.

Therefore old checkpoint A can be marked remote-verified using B's same-path/same-size object, and B's object can even be published as a side effect of recovering A.

This violates P0-073 independently of exact-same-object reconciliation P1-090.

## 3. Cross-account false-negative / stale schedule

If the same switched account B does **not** contain A's path, current recovery sees B's 404.

Current stale logic can transition a remote-save checkpoint to `stale-unverified` after:

```text
age >= 24h
attemptCount >= 6
remote status == 404
```

Stale-unverified checkpoints are later subject to finite retention cleanup.

Thus a valid unresolved object in A can be aged toward stale/cleanup solely because recovery probed the wrong account B.

Required correction:

```text
account/context mismatch != remote failure
```

A mismatch/unavailable context is deferred/manual context state. It performs no Yandex resource call, consumes no remote-attempt budget and creates no 404/stale inference.

## 4. Durable P0-073 scope record

Recommended persisted authority:

```text
yandexAccountRootScope = {
  version: 1,
  accountUid: '<bounded exact account uid>',
  rootPath: '<normalized operation-owned root path>'
}
```

This is durable non-secret scope evidence. It is not an auth token and not a replacement for P1-198 operation identity.

Existing `remotePath` remains operation-owned remote identity evidence and must validate as equal to or below the stored root. Optional stored `resourceId` remains additional exact-object evidence when available.

Do not persist access tokens in this record.

## 5. Root semantics

P0-073 does **not** require current user settings to keep the old root selected.

Safe schedule:

```text
old operation A owns account=A, root=/RA, path=/RA/x.pdf
user later changes configured root to /RB in the same account A
```

Recovery may still reconcile old A safely if it obtains live auth proving account UID A. All remote calls for this item use the stored `/RA` and `/RA/x.pdf`, never current `/RB`.

Therefore:

```text
current root mismatch != account mismatch
```

The immutable root is operation-owned location truth, not a requirement that mutable settings remain unchanged.

## 6. P0-074 live-auth dependency

A P0-073 precheck such as:

```text
await getCurrentYandexAccountUid() === checkpoint.accountUid
```

is insufficient by itself.

Current `yandexApi()` calls `getValidYandexAccessToken()` again for each request. An auth switch between the UID check and `/resources` or `/resources/publish` would recreate the race.

P0-073 therefore owns the durable expected scope and admission result, while **P0-074** must provide one immutable live Yandex operation context for the recovery item. Every remote request in that item must consume that already-acquired context rather than re-read mutable global auth/config.

Conceptually:

```text
acquire live auth context
-> prove live accountUid == checkpoint accountUid
-> freeze token/account for this recovery item
-> attach checkpoint-owned root/path
-> GET / publish / poll through that same context
```

No P0-073 checkpoint contains the token.

## 7. Recovery admission outcomes

Before any remote call for an unverified row:

```text
valid scope + live same account
  -> remote-reconcile-permitted

live auth unavailable
  -> deferred-auth-unavailable
  -> no remote call
  -> no attempt increment

live different account
  -> deferred-account-mismatch
  -> no remote call
  -> no attempt increment

missing/malformed durable scope
  -> manual-missing-scope / fail closed
  -> no remote call

remotePath outside stored root
  -> manual-path-outside-scope
  -> no remote call
```

These context outcomes do not flow through ordinary remote 404/failure ageing.

## 8. Resource-id rule

If the checkpoint already has nonempty expected `resourceId`, fetched metadata must not silently replace it.

Required:

```text
expected resourceId present
+ fetched resource_id differs/missing
-> manual-resource-id-mismatch
-> do not publish
-> do not mark remote-verified
```

If no resource id was durable before a crash, P0-073 account/root + exact path + size only proves the correct **account/root scope**, not the exact same remote object across overwrite/replacement history. That remaining exact-object problem stays **P1-090**.

P0-073 must not claim to close P1-090 merely by adding account binding.

## 9. Remote-verified is a different phase

A valid durable checkpoint already in:

```text
phase = remote-verified
```

requires no new Yandex GET/publish to append/finalize the local Journal record.

Therefore a later switch A -> B must not block **local-only** finalization of already verified A truth. Finalization uses the checkpoint-owned account/root/path metadata; it never rewrites them to current B.

However a legacy/malformed `remote-verified` row without trustworthy durable account/root scope is indeterminate under P0-073 and should remain manual/fail-closed unless another durable receipt proves its scope. Current account settings cannot retroactively manufacture that proof.

## 10. Writer-side in-place rebind defect

Current `checkpointPendingRemoteSaveIntent()` can replace an existing active/prepared checkpoint with a newly normalized item while retaining the old key/createdAt. For `stale-unverified`, a deliberate retry similarly reactivates by replacing it with the new item. `remote-verified` is a partial positive control because its old data is preserved.

This allows:

```text
unresolved checkpoint A under account/root A/RA
-> user switches to B/RB
-> retry with same journalEntryId
-> old durable slot rewritten with B/RB
```

That destroys the immutable context needed to reconcile A.

Required rule:

- unresolved active/prepared/stale checkpoint may not be rebound in place when account/root/path scope differs;
- preserve old A evidence;
- intentional new save under B is a distinct operation generation/key owned with P1-198/P0-074 semantics;
- exact same scope/path retry may remain eligible for owner-specific idempotent retry, but P0-073 alone does not authorize changing publication policy, auth generation or other operation-owned fields;
- `remote-verified` evidence is never rebound.

## 11. Context comparison must be semantic, not current-config equality

For P0-073, immutable identity comparison is:

```text
stored accountUid
stored rootPath
stored remotePath under stored root
```

It is **not**:

```text
stored rootPath == current configured rootPath
```

The latter would unnecessarily strand recoverable operations after a harmless same-account root-setting change.

## 12. Deterministic model

Added:

`project_tools/test_p0_073_yandex_account_root_scope_model.js`

Local scratch run before durable write:

```text
P0-073 Yandex account/root scope model: PASS
```

The model proves:

1. A checkpoint cannot false-verify B's same-path/same-size object;
2. B's missing path cannot create A's false 404/stale attempt;
3. same-account root RA->RB change still reconciles using stored RA;
4. valid `remote-verified` A can continue local-only finalization after current account switch;
5. missing scope fails closed before remote calls;
6. stored nonempty resourceId mismatch blocks verification/publication;
7. active/stale A cannot be rebound in place to B;
8. verified evidence is preserved;
9. one admitted live auth context remains immutable even if mutable global auth changes afterward.

## 13. Owner boundaries

**P0-073 owns:**

- durable versioned account/root scope;
- remotePath-under-stored-root validation;
- no cross-account resource probing;
- no context-mismatch attempt/stale inference;
- no in-place unresolved checkpoint rebind across scope;
- local finalization behavior for already verified exact-scope checkpoints.

**P0-074 owns:**

- immutable live access token/account/config context used across all network calls for one long operation/recovery item;
- prevention of token/config switches between individual Yandex API calls.

**P1-090 owns:**

- exact same remote object reconciliation when path may refer to a different replacement object and no durable exact object identity is available.

**P1-198 owns:**

- worker-issued operation identity/generation for a genuinely new retry/save; P0-073 does not invent a competing operation token.

## 14. Status

P0-073 remains **ACTIVE**. This subcase is architecture evidence only; current runtime still probes current-account paths and permits writer-side rebind.

Runtime/manifest remain `0.9.8`; release remains `NOT READY`. No build, tag, GitHub Release or Actions run is claimed.
