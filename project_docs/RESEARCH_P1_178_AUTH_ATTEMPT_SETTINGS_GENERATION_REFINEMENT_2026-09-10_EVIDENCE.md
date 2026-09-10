# WebClip — P1-178 auth-attempt + settings-generation refinement — 2026-09-10

Date: 2026-09-10  
Canonical baseline: `main = d09ec5cbb4666636c983fb3385481d3c6eb5d9e3`  
Mode: **RESEARCH-ONLY / CURRENT-MAIN ABSORPTION REVIEW**  
Production/runtime modification: **NONE**  
Real Chrome/Yandex L5: **NOT RUN**  
Release-policy activation: **NONE**  
New P-code: **NO**

This tranche continues existing ACTIVE **P1-178**. It measures the historical 2026-09-07 auth-attempt/settings-generation contract against current canonical source after the P1-138/P1-179/P1-177 refinements. No production source is changed.

## 1. Canonical ownership

Registry authority remains:

```text
P1-178  OAuth pending/token exchange/config commit is one auth-attempt + settings-generation state machine; stale finish/cleanup cannot delete/overwrite newer attempt/settings.
```

Composition boundaries:

```text
P1-178 = shared auth-attempt/settings commit generation
P1-165 = effective returned OAuth state verification
P1-177 = backup scheduler pause/resume generation
P1-179 = backup account/root namespace identity
P1-196 = auth-validity / stale invalid-token demotion using the shared auth generation
P0-074 = immutable operation-scoped live Yandex context
```

These are related but not interchangeable. This refinement does not create a parallel counter.

## 2. Historical provenance retained

The 2026-09-07 P1-178 research already specified:

- worker-issued `attemptId + generation` on the pending OAuth receipt;
- compare-and-remove for tab-open failure and expiration cleanup;
- revalidation of the exact attempt after network exchange and before authoritative commit;
- one logical auth + matching-clientId generation transition;
- disconnect/manual replacement invalidating older completion authority;
- recoverable consistency when session/local storage cannot be physically atomic.

That branch is provenance, not current implementation evidence.

## 3. Current-main positive controls

Current source already has protections that must be preserved:

- auth storage operations are serialized through the existing Yandex auth storage operation path;
- config mutations are serialized through `updateYandexConfig(...)`;
- OAuth PKCE pending material is kept in session storage;
- access-token state is session-oriented and legacy persistent auth is cleaned;
- pending OAuth has bounded expiry data;
- PKCE state/codeVerifier are generated per start attempt.

Serialization prevents physical write overtaking. It does **not** prove that a writer still owns current logical authority after an asynchronous network wait.

## 4. Current pending-attempt gap

`startYandexOAuth(clientId, sourceTabId)` writes one mutable `yandexOAuthPending` row containing the attempt material, then opens the OAuth tab. The row does not expose a worker-issued shared auth/settings generation.

If tab opening fails, cleanup removes `yandexOAuthPending` without proving that the row is still the attempt created by that start call.

Race:

```text
A writes pending A
A waits for tab open
B writes pending B
A tab open fails late
A cleanup removes current pending row
```

Required:

```text
cleanup(A) may consume only exact attemptId+generation A
cleanup(A) must be a no-op if B is current
```

## 5. Status/expiry cleanup gap

`getYandexStatus()` can read an expired pending row and later remove the shared pending key. A newer start can replace the row between observation and removal.

Required expiration cleanup is compare-and-remove against the exact observed attempt receipt. An old expired snapshot is not deletion authority over a newer attempt.

## 6. OAuth finish gap after network exchange

`finishYandexOAuth(code)` captures current pending PKCE data, performs token exchange, and then separately updates matching `clientId`, writes auth, removes pending, reads account information and writes auth again.

The network exchange is an authority suspension point. While it is in flight, a newer OAuth start, successful manual-token replacement or explicit disconnect can supersede the old attempt.

Required sequence:

```text
capture exact receipt R
-> exchange using R
-> re-read shared generation/current attempt
-> if R stale: zero auth/config/pending commit
-> if R current: logical generation-CAS commit auth + matching clientId
-> compare-and-remove exactly R
```

A successful exchange result does not reserve future commit authority indefinitely.

## 7. Disconnect is a generation barrier

Current disconnect clears auth and pending state, but without a shared generation barrier an older in-flight OAuth exchange can later return and republish auth.

Target:

```text
disconnect
-> advance shared auth/settings generation first
-> publish disconnected/no-auth truth for that generation
-> invalidate every older pending/finish/account-enrichment writer
```

Already-issued unrelated Yandex physical effects remain governed by their own reconciliation owners; disconnect is not cancellation evidence for them.

## 8. Manual-token replacement current delta

Current manual-token flow writes candidate auth, performs an account/provider validation read, then writes account-enriched auth. On validation failure it clears auth.

That shape creates two stale-writer risks:

```text
manual A validation in flight
OAuth/manual B becomes current
A fails late
A global clear must NOT delete B
```

and:

```text
manual A validation in flight
B becomes current
A account enrichment returns late
A second write must NOT overwrite B
```

Preferred target: validate candidate privately before publishing it. If provisional publication is retained for product reasons, every provisional/final/cleanup transition must be exact shared-generation CAS. A failed or unknown candidate does not gain authority to clear a newer proven auth generation.

## 9. Account-enrichment writes

Any path that reads auth, performs asynchronous account lookup, then writes `{...oldAuth, account}` is a stale-writer surface unless the exact auth generation is revalidated immediately before the write.

P1-178 owns generation-safe auth commit mechanics. P1-196 owns invalid-token validity/demotion semantics. Both must use the same generation rather than independent counters.

## 10. Settings/clientId consistency

The OAuth `clientId` used for exchange belongs to the captured attempt. A stale finish must not overwrite a newer configured clientId.

Required logical commit:

```text
attempt generation G
+ exact attemptId
+ validated auth result for G
+ clientId captured by G
=> one coherent committed auth/settings generation
```

If session auth and local config cannot be physically atomic, use a recoverable commit receipt/state so restart cannot report a falsely coherent mixed generation.

## 11. Shared control identity

Conceptual shape, preserving historical P1-178 semantics:

```text
YandexAuthControl {
  version: 1,
  generation,
  pendingAttempt: {
    attemptId,
    generation,
    clientId,
    codeVerifier,
    oauthState,
    createdAt,
    expiresAt
  } | null,
  committedAuthGeneration
}
```

`generation`, `attemptId` and commit metadata are non-secret control identity. `codeVerifier`, access token, refresh token and authorization capability material remain session-only and non-loggable.

## 12. Interaction with adjacent owners

P1-165 remains unresolved separately: storing/generated OAuth state in an attempt receipt does not prove returned-state verification.

P1-177 scheduler resume occurs only after a current P1-178 auth generation becomes proven; scheduler generation remains separate.

P1-179 backup namespace is derived from proven semantic account/root authority and is not the auth-attempt generation.

P0-074 operations that already captured an immutable context keep their factual context; later stages must obey their composing mutation-admission/revocation policies.

## 13. Deterministic negative matrix

The companion model covers:

```text
N01 start A -> start B -> late A tab failure cannot remove B
N02 expired A observed -> B starts -> late expiry cleanup cannot remove B
N03 exchange A in flight -> B starts -> A cannot commit auth/config
N04 exchange A in flight -> disconnect -> A cannot resurrect auth
N05 exchange A in flight -> manual B commits -> A cannot overwrite B
N06 manual A validation in flight -> OAuth B commits -> late A failure cannot clear B
N07 manual A validation in flight -> manual B commits -> late A enrichment cannot overwrite B
N08 current exact OAuth attempt may commit once
N09 duplicate finish of consumed attempt cannot commit twice
N10 stale finish cannot remove newer pending attempt
N11 stale finish cannot overwrite newer clientId
N12 exact start cleanup may consume its own attempt
N13 exact expiry cleanup may consume its own expired attempt
N14 generation id and attempt id contain no auth secrets
N15 disconnect advances generation before old writers can commit
N16 failed manual candidate does not advance/clear newer proven generation
N17 auth account enrichment requires generation match
N18 serialized writes are preserved but are not generation authority
N19 P1-165 returned-state authority remains separate
N20 P1-177 scheduler generation remains separate
N21 P1-179 namespace identity remains separate
N22 P1-196 consumes the same auth generation for stale demotion fencing
N23 manifest remains 0.9.8
N24 no runtime/L5/S2/release action
```

## 14. Acceptance contract

P1-178 refinement research is complete when deterministic evidence proves:

1. current source positive controls and unabsorbed generation gaps are both represented;
2. pending OAuth carries exact attempt identity under one shared auth/settings generation;
3. every pending cleanup is receipt-specific compare-and-remove;
4. OAuth finish revalidates exact attempt/generation after exchange and before authoritative writes;
5. disconnect invalidates all older not-yet-committed auth writers;
6. manual-token late failure/enrichment cannot clear or overwrite newer auth;
7. account-enrichment writers revalidate the same auth generation;
8. matching clientId and auth commit as one logical generation transition;
9. cross-storage partial commit has explicit recoverable semantics;
10. P1-165/P1-177/P1-179/P1-196 ownership stays distinct and composable;
11. no secret is moved into durable/loggable control metadata;
12. no new P-code is allocated;
13. runtime remains unchanged;
14. no real L5, release-policy activation, readiness mutation, official ZIP, tag, Release or deployment occurs.

## 15. Boundary

```text
P1-178 generation refinement != runtime implementation
runtime implementation != real Yandex qualification
real Yandex qualification != P1-231 S2 activation
P1-231 S2 activation != release readiness
```

V1 readiness and release authority are untouched.
