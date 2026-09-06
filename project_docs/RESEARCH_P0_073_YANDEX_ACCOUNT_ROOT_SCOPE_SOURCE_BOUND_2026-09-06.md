# P0-073 — source-bound saturation checkpoint — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Research branch before this checkpoint: `research/p0-073-yandex-account-root-context-2026-09-06 @ 3ee66d7024f6490f1fc2c525e470b22adfac399c`  
Owner: **P0-073 ACTIVE**. Runtime remains unchanged.

This note closes the remaining P0-073 research questions before implementation. It is defensive reliability/data-integrity work only; it does not expand into offensive testing.

## 1. Source-bound findings on canonical runtime

The canonical `service-worker.js` still has the following P0-073 gaps.

### 1.1 Loose fields are data, not immutable authority

`normalizePendingJournalAppendData()` persists bounded optional strings:

```text
accountUid
rootPath
remotePath
resourceId
```

There is no versioned `yandexAccountRootScope` record in production source. Therefore recovery cannot distinguish newly admitted immutable scope evidence from legacy/rebound loose fields.

### 1.2 Recovery authenticates only availability, not expected account

`recoverPendingRemoteSaves()` currently preflights only whether `getValidYandexAccessToken()` succeeds. For each unverified checkpoint it then performs `/resources` lookup by saved `remotePath` through ordinary `yandexApi()`.

There is no durable expected-account admission before the first remote resource call. This preserves the cross-account false-positive and false-negative schedules already documented for P0-073.

### 1.3 `remote-verified` is already a positive control

Current recovery has:

```text
if (current.phase !== 'remote-verified') {
    ... remote reconciliation ...
}
```

Therefore already verified remote truth can proceed to local Journal finalization without a fresh Yandex GET/publish. P0-073 implementation must preserve this property.

### 1.4 Writer-side rebind is confirmed

`checkpointPendingRemoteSaveIntent()` currently handles an existing key by replacing unresolved content with a newly normalized `item`:

- `stale-unverified` is replaced and `createdAt` reset;
- other non-verified phases are replaced while old `createdAt` is retained;
- only `remote-verified` preserves old data.

Thus a retry under a different account/root can overwrite unresolved scope evidence in place.

### 1.5 `resourceId` is currently replaceable

`markPendingRemoteSaveVerified()` builds new data with:

```text
resourceId: String(resourceId || current.data.resourceId || '')
```

and recovery passes fetched `metadata.resource_id`. A previously stored nonempty resource id is not transactionally compared to the fetched value before replacement. P0-073 requires a fail-closed conflict check both before publication/verification and again in the durable verified-writer transaction.

### 1.6 Stale accounting is downstream of generic remote failure

A 404 can become `stale-unverified` after the age/attempt threshold. This is valid only after an admitted same-account remote call. Account mismatch/auth-unavailable/missing-scope/path-outside-scope must branch before all generic failure/stale accounting.

### 1.7 Stale cleanup itself is phase-scoped

Cleanup selects `phase = stale-unverified`. This can remain structurally valid if context-deferred/manual rows are never converted into stale solely because context is unavailable/mismatched. Deferred/manual truth must not be deleted merely to free capacity.

## 2. Legacy rollout decision

P0-073 introduces a versioned durable scope record:

```text
yandexAccountRootScope = {
  version: 1,
  accountUid,
  rootPath
}
```

### 2.1 New rows

All newly created Yandex remote-save checkpoints must contain a valid version-1 scope before the checkpoint can admit any remote mutation or later remote reconciliation.

### 2.2 Legacy rows without a versioned scope

Do **not** synthesize authority from current settings or current authenticated account.

Even when a legacy row contains loose `data.accountUid` and `data.rootPath`, those fields were written under the old writer semantics that allowed in-place rebind. They are therefore not automatically promoted to trusted immutable scope.

Default rollout result:

```text
legacy row without trusted versioned scope
-> manual-missing-scope
-> no remote GET/PUT/publish/poll
-> no attempt increment
-> no stale inference
-> retain durable checkpoint
```

A future narrowly scoped migration may promote a legacy row only if another already-durable receipt independently proves the exact account/root authority. Current mutable settings are never such proof.

### 2.3 Legacy `remote-verified`

A legacy `remote-verified` row without trusted versioned scope is not allowed to manufacture scope from current settings. It remains manual unless independent durable evidence proves scope. New versioned `remote-verified` rows continue local-only finalization normally.

## 3. Same-scope retry semantics

P0-073 must not use retry as a hidden mutation of operation identity.

For an existing unresolved versioned checkpoint, the writer first compares:

```text
scope.version
scope.accountUid
scope.rootPath
remotePath
expectedPdfBytes
```

Minimum safe behavior:

- different account/root/path/expected bytes -> preserve old row and require a distinct operation generation/key;
- same values -> return/reuse the existing checkpoint for read-only reconciliation; do not replace the row wholesale;
- do not reset `createdAt`, `attemptCount`, stale history, resource identity, or publication policy merely because the user retried;
- a genuinely new remote write requires worker-issued operation identity/generation under P1-198/P0-074-related implementation work.

`stale-unverified` is not reactivated by replacing it with a fresh item. Reconciliation/reactivation, if later permitted, must be explicit and must preserve old evidence/history.

## 4. Context outcomes and retry budget

For any unverified versioned checkpoint, order is:

```text
validate durable scope
validate remotePath inside stored root
acquire/prove live account context (P0-074 supplies immutable live context)
only then perform remote call
```

Outcomes before remote admission:

```text
deferred-auth-unavailable
deferred-account-mismatch
manual-missing-scope
manual-path-outside-scope
```

All of them have:

```text
remoteCall = false
attemptIncrement = 0
404Inference = false
staleInference = false
```

`attemptCount` represents an actually admitted remote reconciliation attempt, not a maintenance-loop visit.

## 5. `resourceId` transaction rule

If current durable data already contains a nonempty expected `resourceId`:

```text
fetched missing/different resource_id
-> manual-resource-id-mismatch
-> no publish
-> no remote-verified transition
```

The check must be repeated inside `markPendingRemoteSaveVerified()` against the current row read in that same IndexedDB write transaction. This prevents a late/concurrent verifier from replacing newer durable identity evidence after an earlier precheck.

If no durable resource id exists, P0-073 does not infer exact object identity from path+size. That remains P1-090.

## 6. No durable auth material

`pendingRemoteSaves` may persist non-secret account/root scope evidence but must not persist:

```text
access token
Authorization header
tokenRef or equivalent live credential handle
```

Immutable live credentials belong only to the in-memory P0-074 operation context.

## 7. Source-bound RED gate

Added:

`project_tools/test_p0_073_yandex_account_root_scope_source.js`

The gate binds implementation to these source properties:

1. explicit versioned durable scope is present and consumed by recovery;
2. account/auth/missing-scope/path-outside-scope outcomes exist before remote probing;
3. `remote-verified` stays local-only;
4. old active/stale in-place rebind patterns are absent;
5. `resourceId` mismatch is guarded in recovery and the durable verified writer;
6. context defer precedes generic failure/stale accounting;
7. raw auth material is not written by the checkpoint writer.

On canonical runtime the gate is intentionally **RED**. Direct source inspection proves at least the first failure deterministically: production `service-worker.js` contains no `yandexAccountRootScope`. It also still contains both old rebind patterns and lacks the `manual-resource-id-mismatch` guard.

A full local repository execution was **not** claimed: GitHub DNS resolution from the local execution environment failed during this session. GitHub connector reads at the exact canonical commit were used as repository authority.

## 8. Implementation boundary

P0-073 implementation should now be narrow:

- add/validate immutable durable account/root scope;
- prevent unresolved in-place scope rebind;
- classify context mismatch before remote calls and attempt/stale accounting;
- preserve `remote-verified` local-only behavior;
- guard immutable `resourceId` transactionally;
- fail closed for legacy rows without trusted scope;
- persist no auth token.

Do **not** solve P0-074 by persisting credentials. Do **not** claim P1-090 closed through account/root/path/size. Do **not** redesign operation generation under P1-198 inside this owner.

## 9. Status

P0-073 is **architecture-saturated but remains ACTIVE** because production runtime has not been changed and the source-bound gate is intentionally RED.

Next research owner: **P0-074 immutable live Yandex auth/config context**, followed by a safe runtime patch plan that can satisfy both P0-073 and P0-074 without rewriting the large `service-worker.js` through an unsafe whole-file connector update.
