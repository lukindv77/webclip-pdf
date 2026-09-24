# WebClip — P1-178 auth/settings commit receipt — 2026-09-24

Date: 2026-09-24  
Owner: P1-178  
Canonical baseline: `main = 66a5049c5cfe7a4f06f0b4e6c2b769650b8ecfa0`  
Baseline post-merge integrity: Repository Integrity #1123 / run `35950619707` — **SUCCESS**  
Manifest version: `0.9.8`  
Release readiness: **NOT READY**

## 1. Purpose

Close the remaining source/runtime gap in the registered P1-178 contract:

```text
OAuth pending/token exchange/config commit
= one auth-attempt + settings-generation state machine
```

Earlier P1-178 work already introduced exact `authAttemptId`, shared `yandexAuthGeneration`, receipt-specific pending cleanup, post-network auth CAS, manual/disconnect generation barriers, and exact auth-record enrichment.

Fresh closure review on canonical main found the remaining mismatch: the OAuth `clientId` setting still lived in `storage.local` and was written through a config queue separate from the session auth-generation authority. Auth could therefore be generation-safe while matching settings remained only separately serialized.

## 2. Concrete remaining race

Before this tranche, `startYandexOAuth(A)` performed:

```text
begin exact pending A / auth generation GA
-> updateYandexConfig(clientId=A)
-> open OAuth tab
```

and OAuth finish performed:

```text
exchange under captured A
-> generation-CAS auth A into storage.session
-> separately update authStorageMode in storage.local
```

A newer OAuth/settings intent B could advance auth generation while the older config writer A was still waiting in the separate config queue. Serialization of each queue did not prove one shared logical owner across both storage areas.

The acceptance contract also requires explicit recovery when session auth and local config cannot be physically atomic.

## 3. External platform comparison

Fresh official Chrome storage documentation was checked on 2026-09-24:

- https://developer.chrome.com/docs/extensions/reference/api/storage
- https://developer.chrome.com/docs/extensions/reference/api/storage/StorageArea/

Relevant platform facts:

- Chrome extension storage operations are asynchronous.
- `storage.session` is memory-backed extension storage and has a lifecycle distinct from persistent `storage.local`.
- separate storage-area operations are not one cross-area atomic transaction.

Therefore WebClip must model cross-area settlement explicitly rather than treating an auth write in `storage.session` and a Client-ID/config write in `storage.local` as one physical atomic commit.

## 4. One shared generation, not a second settings counter

This tranche does **not** create `yandexConfigGeneration` or another settings counter.

Existing `yandexAuthGeneration` remains the single logical auth/settings generation for:

- OAuth start;
- OAuth finish;
- manual auth intent;
- Disconnect;
- exact validity transition;
- imported Client-ID change.

A changed imported Client ID advances the same generation because it is a newer credential/settings intent. It does **not** clear or replace the current committed OAuth session; it only supersedes older pending OAuth/config-settlement authority.

This preserves the product requirement that user-settings import does not disable or replace the current OAuth session.

## 5. Shared auth/settings turn

The auth storage serializer is factored into:

`acquireYandexAuthStorageTurn(label)`

and:

`runYandexAuthStorageOperation(start, label)`

The queue reservation is the ordering point for auth/settings generation work.

An imported Client-ID change holds that same turn across:

1. shared-generation advance;
2. pending OAuth/config-receipt invalidation;
3. the actual bundled `storage.local.set`;
4. actual settlement before releasing the turn.

This lock ordering prevents an older OAuth settings writer from overtaking import and prevents a later OAuth start from being overwritten by an older import.

## 6. Exact OAuth-start Client-ID writer

Production adds:

`persistYandexOAuthClientIdForAttempt(expected)`

The writer enters the shared auth turn and checks immediately before the local config write:

```text
current yandexAuthGeneration == expected.authGeneration
AND current pending identity == expected attemptId + generation
```

Only that exact current attempt may publish its Client ID.

Schedule:

```text
A starts
B starts and advances generation
late A reaches Client-ID writer
=> A write is rejected
=> B remains current
```

## 7. Cross-storage auth/config commit receipt

Production adds a non-secret session receipt:

```text
yandexAuthConfigCommit {
  version: 1,
  authAttemptId,
  authRecordId,
  authGeneration,
  clientId,
  createdAt
}
```

The receipt intentionally contains no:

- access token;
- refresh token;
- PKCE verifier;
- OAuth state;
- Authorization header;
- provider capability secret.

On successful OAuth token settlement, the exact session CAS publishes in one `storage.session.set`:

- committed auth record;
- pending OAuth = null;
- matching config receipt.

That session mutation is the logical commit point for the auth result plus the public matching Client-ID intent.

## 8. Local-config settlement and restart reconciliation

After the session commit, WebClip attempts:

`settleYandexAuthConfigCommitReceipt(...)`

Settlement requires all of:

```text
receipt identity still exact
current authRecordId == receipt.authRecordId
current auth.authGeneration == receipt.authGeneration
current shared control generation == receipt.authGeneration
```

If exact, WebClip writes the matching `clientId` plus session-only auth-storage mode to `storage.local`, then retires the receipt.

If the local write errors or reaches a local deadline after auth was already committed:

- committed auth is not falsely rolled back;
- the non-secret receipt stays in session state;
- status reports config reconciliation pending;
- worker startup runs `reconcileYandexAuthConfigCommit('worker-start')`.

A newer OAuth/manual/Disconnect/validity/settings intent clears the older config receipt, so stale reconciliation cannot retarget newer auth/settings.

## 9. Status truth during partial settlement

`getYandexStatus()` now evaluates current receipt identity.

Client-ID projection order is:

```text
current valid pending attempt
-> current exact auth-config receipt
-> durable local config
-> committed auth fallback
```

Thus a committed auth whose local Client-ID settlement is still pending does not appear paired with an older durable Client ID.

Status also exposes:

`authConfigReconciliationPending`

This is a truthful control-plane state, not a claim that a local config write already settled.

## 10. User-settings import composition

Import still writes user settings as one existing bundled local-storage mutation and still returns:

`oauthSessionChanged: false`

When imported Client ID differs from durable config, the importer:

1. reserves the shared auth/settings turn;
2. advances the existing shared auth generation;
3. clears older pending OAuth and config receipt;
4. leaves current committed auth untouched;
5. performs the bundled local write;
6. holds the auth/settings turn until actual settlement.

This gives the imported Client ID a defined place in the same generation ordering without converting settings import into an OAuth-session replacement.

## 11. Deterministic coverage

Updated:

`project_tools/test_p1_178_auth_attempt_generation_runtime.js`

New:

`project_tools/test_p1_178_auth_settings_commit_runtime.js`

Coverage includes:

- stale OAuth A cannot publish Client ID after B starts;
- current B may publish its own Client ID;
- auth commit plus config receipt is session-atomic;
- config-settlement failure does not rollback committed auth;
- receipt is secret-free;
- worker-style reconciliation settles exact receipt;
- newer generation retires older receipt;
- stale receipt cannot rewrite newer settings;
- status precedence remains coherent during partial settlement;
- changed imported Client ID uses the shared auth/settings turn;
- settings import preserves committed OAuth session;
- old OAuth writer -> import -> new OAuth writer has deterministic serialized ordering;
- no second settings-generation counter exists;
- fixed Yandex screen-code redirect remains unchanged;
- P1-165 returned-state verification remains separate;
- no live provider call occurs in these deterministic tests.

## 12. Owner boundaries

Unchanged:

- P1-165: effective returned OAuth `state` verification remains ACTIVE.
- P1-177: backup scheduler generation is IMPLEMENTED / RELEASE-REGRESSION and remains a separate generation.
- P1-179: backup account/root namespace remains separate.
- P1-195: capability truth remains separate.
- P1-196: auth validity/demotion is IMPLEMENTED / RELEASE-REGRESSION and consumes the shared auth generation.
- P0-074: immutable operation-scoped remote context remains separate.
- P1-231: physical QA/release authority remains separate.

No new P-code is allocated.

## 13. Identity impact

Baseline current identities before this tranche:

```text
34-file RPF       = sha256:3ae12e58cb9bd58c05763cb320f01b2dbdac92b5090faf04e1c5c4c723ec1071
33-file control   = sha256:5ff081f59c8bd46cf1b97eda4c183ce8573a5d42eb0c475f835847abb62383c2
Chrome QCF        = sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c
Yandex QCF        = sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1
full RCF          = sha256:8e7fc4af3d14a07580008e64a9e9ca61744c39384db46a3b922bfdc92c8f707c
BCF               = sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff
```

`service-worker.js` changes, so the final exact candidate RPF and current 33-file control must be derived by exact-head P1-231 authority. This document does not guess them.

No canonical Chrome/Yandex QA-contract or builder-contract input is intentionally changed.

## 14. Evidence boundary

This tranche is source/runtime + deterministic evidence only.

It does not perform:

- real Yandex OAuth;
- real returned-state capture;
- live provider mutation;
- real unpacked-Chrome qualification;
- physical release-evidence admission;
- product ZIP/build;
- version bump;
- S2/release-policy activation;
- tag/deployment/GitHub Release;
- release decision.

Manifest remains `0.9.8`; release readiness remains **NOT READY**.

## 15. Initial decision

```text
shared auth/settings generation               = EXISTING yandexAuthGeneration
second settings-generation counter             = NO
OAuth start Client-ID write                    = EXACT ATTEMPT/GENERATION FENCED
auth + matching Client-ID logical commit       = SESSION AUTH + NON-SECRET RECEIPT
cross-storage partial settlement               = EXPLICIT RECOVERABLE
worker-start config reconciliation             = IMPLEMENTED
stale receipt retarget                         = BLOCKED
settings import replaces current OAuth session = NO
settings import supersedes old pending attempt = YES WHEN CLIENT ID CHANGES
returned OAuth state                           = NOT OBSERVED
P1-165                                         = ACTIVE
live provider proof                            = NOT PERFORMED
manifest                                       = 0.9.8
release readiness                              = NOT READY
```

P1-178 remains **ACTIVE** until a complete exact-head Repository Integrity run and a fresh post-run closure review prove that the registered source/runtime acceptance contract is satisfied.


## 16. Exact-head identity discovery #1124

Repository Integrity #1124 / run `35963862602` ran on exact initial PR head `904f25215028e623350bc8daa0b62a5b2e99abf8`. The generic repository-integrity job stopped at PR metadata accounting before syntax/deterministic execution, so #1124 is **not** merge evidence.

Both dedicated release-control lanes completed successfully. Exact source-generation authority derived current 34-file RPF:

`sha256:41c44d37c0b3d8d1b4e50ab315b6bdff1a570196bbee173fcfa83086357cf200`

Chrome QCF remains `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`; Yandex QCF remains `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`; full RCF remains `sha256:8e7fc4af3d14a07580008e64a9e9ca61744c39384db46a3b922bfdc92c8f707c`; BCF remains `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`.

The dedicated lane does not emit the current 33-file negative/control fingerprint. That value is intentionally left unsynchronized until the complete deterministic identity witness runs on a later exact head; it is not computed or guessed outside the canonical verifier.
