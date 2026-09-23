# WebClip — P1-196 recovery per-child auth recheck — 2026-09-23

Date: 2026-09-23  
Owner: P1-196  
Baseline main: `cd99130c8fd50203b7c32f74e51a7e23a309b64c`  
Baseline post-merge Repository Integrity: #1084 / run `35812516422` — **SUCCESS**  
Manifest version: `0.9.8`  
Release readiness: **NOT READY**

## 1. Purpose

Close the remaining source/runtime P1-196 recovery gap after exact request demotion, exact account-enrichment CAS, explicit auth status axes and non-secret invalid/expired tombstones were integrated.

Historical P1-196 acceptance text requires:

```text
before each auth-required recovery child:
  resolve/revalidate current shared auth generation + usability
```

A single pre-loop auth snapshot is insufficient because auth may become invalid/expired, disconnect, or be superseded by a newer auth generation while the bounded recovery queue is still running.

## 2. Existing invariants retained

This tranche does not replace P0-074 immutable operation context.

The recovery batch still captures one immutable account/root/publication/token context before provider work and never retargets old recovery work to a newer credential.

The new rule is additional:

```text
immutable operation authority A
+
current-auth usability/generation must still equal A before every child that needs provider access
```

A newer usable auth B therefore does **not** grant replay authority for an old A recovery checkpoint.

## 3. Secret-free operation auth receipt

`captureCurrentYandexOperationContext()` now attaches the existing secret-free request identity:

```text
authRequestReceipt {
  requestKind = disk-oauth
  authRecordId
  authGeneration
  controlGeneration
  authorizationBound
}
```

The receipt contains no access token, refresh token, Authorization header, scope or secret-derived durable hash.

The access token remains only in the existing memory-only immutable operation context.

## 4. Exact receipt comparison

Production adds:

`yandexAuthRequestReceiptsMatch(expected, current)`

Equality requires:

- `requestKind=disk-oauth`;
- both receipts are authorization-bound;
- exact `authRecordId`;
- exact record `authGeneration`;
- exact shared `controlGeneration`.

Token-string equality is not used as generation authority.

## 5. Per-child current usability recheck

Production adds:

`isCurrentYandexOperationAuthUsable(operationContext)`

For every recovery row whose phase is not already `remote-verified`, before namespace proof or any provider request:

1. read current exact auth authority through `captureCurrentYandexAuthRequestAuthority()`;
2. apply current invalid/expired/skew admission semantics;
3. compare the current secret-free receipt with the immutable operation context receipt;
4. proceed only on exact match.

The following all defer the provider-required child:

- current invalid tombstone;
- current expired tombstone;
- exact known expiry observed during recheck;
- 60-second admission skew;
- disconnect/no auth;
- newer manual/OAuth generation;
- newer auth record B;
- unbound legacy auth identity.

The queue remains bounded; no automatic reauth/replay is started.

## 6. Remote-verified local finalization

Rows already in `remote-verified` phase do not need provider access merely to finish the local Journal/checkpoint settlement.

The new auth gate therefore remains inside:

`if (current.phase !== 'remote-verified')`

This preserves cheap local finalization and avoids converting an already provider-verified receipt into an unnecessary auth dependency.

## 7. Recovery-owned 401 transition

Generic `yandexApi(..., operationContext)` continues to treat immutable operation context as historical request authority rather than unrestricted global-auth mutation authority.

The recovery owner itself now handles an OAuth Disk HTTP 401:

```text
recovery request used captured A receipt
-> provider returns 401
-> transitionYandexAuthValidityIfCurrentRequest(A receipt, invalid)
-> exact CAS against current record + record generation + shared control generation
```

If A is still current, the existing P1-196 tombstone primitive publishes non-secret invalid truth and advances the shared generation.

If B became current before the response, the A CAS fails and B is untouched.

This keeps mutation authority with the recovery context that originally captured the receipt instead of trusting arbitrary caller-supplied operation-context metadata inside the generic API adapter.

## 8. Two critical schedules

### Schedule A — current A invalidates on child 1

```text
capture recovery context A@G
child 1 recheck A@G = current/usable
child 1 provider request -> 401
exact A@G CAS -> invalid tombstone at G+1
child 2 recheck old A@G vs current tombstone/G+1 -> mismatch/unusable
child 2 defers before provider request
```

### Schedule B — B supersedes before late A/401

```text
capture recovery context A@G
child 1 request starts
B commits at G+1
late A response -> 401
A@G invalidation CAS fails
B remains unchanged
child 2 compares old A@G receipt to current B@G+1 -> mismatch
child 2 defers; it is not replayed under B
```

## 9. External provider comparison

Fresh official Yandex OAuth documentation reviewed on 2026-09-23 confirms:

- access tokens have explicit lifetime semantics when `expires_in` is supplied;
- tokens can become invalid independently through expiry/revocation/account/app events;
- manually obtained tokens are ordinary API access credentials.

Relevant official sources:

- https://www.yandex.com/dev/id/doc/en/tokens/token-invalidate
- https://yandex.com/dev/id/doc/en/concepts/ya-oauth-intro
- https://yandex.com/dev/id/doc/en/tokens/debug-token

This external material supports rechecking credential usability over time. It does not itself prove WebClip's race or authorize treating generic 403/network/timeout failures as invalid-auth evidence. Those classifications remain unchanged.

## 10. Deterministic coverage

New:

`project_tools/test_p1_196_recovery_auth_recheck_runtime.js`

Coverage includes:

- exact receipt equality;
- A vs B mismatch;
- shared control-generation drift;
- invalid/expired/skew/no-auth fail closed;
- unbound receipt rejection without request admission;
- operation context receipt is secret-free and memory-only;
- recheck occurs inside the queue loop and before namespace/provider work;
- `remote-verified` local settlement stays outside the auth gate;
- recovery 401 composes the existing exact tombstone CAS;
- current A/401 blocks later A children;
- late A/401 cannot demote B;
- old A recovery cannot replay under B.

The existing P1-196 refinement model is reconciled from `recovery_auth_recheck=required` to the implemented source contract.

## 11. Identity impact

`service-worker.js` is a canonical package member.

Therefore:

- current 34-file RPF will change;
- current 33-file negative/control digest will change;
- no QA-contract input is intentionally changed;
- no Registry/full-RCF root is changed in the implementation commit;
- no builder-contract input is changed.

The exact new RPF and 33-file control are intentionally not guessed. Exact-head P1-231 authority must derive them before merge.

Current pre-change identities for reference only:

```text
RPF       = sha256:63ba60983ae6cce7df28f775cf64111a2d6a5d20913b22568fafc055c79856ff
33-control= sha256:2dd647a17acd570c42d09ca47f01401b81c9936b23d30f794bb873ea7e81333a
Chrome QCF= sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c
Yandex QCF= sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1
full RCF  = sha256:037cd4b167ed9c6b572b8e74ea8b355be9599c142c68bffce55e0fb386aab9ed
BCF       = sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff
```

## 12. Evidence boundary

This tranche is source/runtime + deterministic evidence only.

It does not:

- use a real OAuth credential;
- call Yandex;
- mutate provider state;
- perform real Chrome qualification;
- build or ZIP the product;
- create physical release receipts;
- bump manifest version;
- activate S2/release policy;
- tag, deploy or create a GitHub Release;
- make a release decision.

## 13. Current status

P1-196 remains **ACTIVE** until this implementation receives complete exact-head CI and any identity/source witnesses exposed by that run are reconciled.

If the exact-head implementation gate proves the registered P1-196 acceptance contract and no additional owner-specific gap is discovered, the Registry status can then transition to its default **IMPLEMENTED / RELEASE-REGRESSION** state. That transition itself would require a fresh exact-head run because Registry is a full-RCF root.
