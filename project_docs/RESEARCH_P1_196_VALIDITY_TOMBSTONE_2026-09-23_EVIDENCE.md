# WebClip — P1-196 exact-generation validity tombstones — 2026-09-23

Date: 2026-09-23  
Owner: P1-196  
Baseline main: `2fcb500d7f6eb607833ab4973a495a98bc297e44`  
Baseline post-merge Repository Integrity: #1080 / run `35804548368` — SUCCESS  
Manifest version: `0.9.8`  
Release readiness: **NOT READY**

## 1. Purpose

Continue P1-196 after:

- exact current-auth 401 fencing (#340);
- exact positive account-enrichment CAS (#341);
- explicit auth presence/validity/usability/lifetime status axes (#342).

Two related source/runtime gaps remain on the baseline:

1. an exact authoritative 401 advances the shared auth generation but physically removes the auth record, so the invalid result is not preserved as explicit non-secret state;
2. a known local `expiresAt <= now` blocks admission but does not publish the same exact-generation validity transition.

This tranche implements one shared primitive for both cases while leaving recovery per-child auth recheck for a later bounded P1-196 tranche.

## 2. External provider boundary

Fresh Yandex OAuth/Disk documentation reviewed for the preceding P1-196 tranches establishes:

- OAuth token responses may include `expires_in`, which gives an explicit provider lifetime;
- tokens may also become invalid independently of local lifetime through revocation/account/application changes;
- manually obtained OAuth tokens are valid request authority for API/testing but WebClip must not fabricate lifetime metadata when no `expires_in` evidence exists;
- HTTP permission/access failures are not safely equivalent to an invalid OAuth credential across Yandex APIs.

The existing narrow WebClip provider classification remains unchanged:

```text
exact current worker-owned Disk OAuth request + HTTP 401
-> invalid-auth candidate

403 / 429 / 5xx / timeout / network
-> operation/capability/transport failure only
-> no blanket OAuth invalidation
```

This tranche performs no live Yandex request.

## 3. One shared validity-transition primitive

Production adds:

`transitionYandexAuthValidityIfCurrentRequest(receipt, validity, observedAt)`

It consumes the existing secret-free exact current-auth request receipt and commits only when all of these still match:

- request kind is `disk-oauth`;
- receipt was authorization-bound;
- current `authRecordId`;
- current auth record generation;
- current shared P1-178 auth-control generation;
- a live access token is still present.

If any identity changed, the transition returns false and performs no auth mutation.

On exact match it:

1. advances the existing shared auth generation exactly once;
2. creates a non-secret validity tombstone for the same subject;
3. stores that tombstone as current session auth state;
4. clears obsolete pending OAuth authority.

No second validity-generation counter is introduced.

## 4. Non-secret tombstone shape

Production adds:

- `isYandexAuthValidityTombstone(value)`
- `createYandexAuthValidityTombstone(current, validity, nextGeneration, observedAt)`

Supported terminal validity values are:

```text
invalid
expired
```

The tombstone preserves bounded non-secret subject/status metadata:

```text
authRecordId
authGeneration       = advanced shared generation
source
clientId
expiresAt
expiryKnowledge
validity
validityObservedAt
account
```

It deliberately omits:

```text
accessToken
refreshToken
scope
Authorization header
provider response body
```

The tombstone is status/provenance state, not API authorization and not capability evidence.

## 5. Exact 401 behavior

`demoteYandexAuthIfCurrentRequest(receipt)` now composes the shared transition primitive with:

`validity = invalid`

Therefore:

```text
request under A
-> exact A / 401
-> if A record + captured control generation are still current:
     invalid tombstone A@next-generation
   else:
     no global-auth mutation
```

A late response from A cannot invalidate or overwrite newer B.

The response still fails the operation whether or not the stale response was permitted to update global auth truth.

## 6. Known exact expiry behavior

`captureCurrentYandexAuthRequestAuthority()` now distinguishes two temporal boundaries.

### Exact provider expiry

```text
expiresAt > 0 && expiresAt <= capturedAt
```

For a generation-bound current auth record, WebClip attempts the same exact CAS transition with:

`validity = expired`

A successful transition produces a non-secret expired tombstone and advances the shared generation.

If auth changed between capture and transition, the old expiry observation cannot mutate the newer credential and the caller receives a superseded result.

### Admission skew

```text
capturedAt < expiresAt <= capturedAt + 60 seconds
```

The token is still temporally valid but intentionally not admitted for a new operation.

This path:

- returns `YANDEX_AUTH_TOKEN_EXPIRY_SKEW`;
- does **not** publish an expired tombstone;
- does **not** advance the auth generation.

This preserves the status distinction added in #342.

## 7. Operation-context composition

`captureCurrentYandexOperationContext()` uses the same exact-generation expiry transition before creating a new immutable P0-074 operation context.

The operation-context rules remain:

- a new operation cannot start from an invalid/expired tombstone;
- exact current expiry may transition current global auth truth;
- a stale expiry observation cannot mutate newer auth;
- the 60-second future skew blocks new admission without claiming expiry;
- an already captured immutable operation context still does not gain authority to demote global auth from later provider responses.

This tranche does not alter the established durable-effect settlement rules for already-admitted remote effects.

## 8. Legacy persistent-secret resurrection boundary

`readYandexAuthState()` now treats a session validity tombstone as authoritative session state even though it contains no access token.

If a legacy `chrome.storage.local` token is still present, WebClip removes that legacy secret and returns the tombstone rather than migrating the old token back into the session.

Therefore:

```text
session tombstone invalid/expired
+ stale legacy local token for the old credential
-> tombstone wins
-> legacy secret cleanup is awaited
-> old token cannot resurrect
```

Cleanup remains fail-closed under the existing security rule.

## 9. Deterministic coverage

New dedicated regression:

`project_tools/test_p1_196_validity_tombstone_runtime.js`

It proves:

- tombstones retain only bounded subject/status metadata;
- access/refresh token and scope are absent;
- current exact 401 transition advances shared generation;
- current exact expiry uses the same transition primitive;
- stale A cannot mutate newer B;
- control-generation drift alone fences a stale response;
- legacy/unshaped auth has no validity-mutation authority;
- tombstones cannot replay another transition because they carry no live credential;
- exact expiry and future admission skew are distinct source branches;
- 401 demotion composes the shared transition helper.

Reconciled regressions:

- `project_tools/test_p1_196_exact_auth_401_runtime.js`
  - expects an invalid tombstone rather than `null`;
  - proves exact known expiry transition;
  - retains all A->B / non-401 / operation-context negative controls.
- `project_tools/test_p1_196_auth_status_axes_runtime.js`
  - requires exact expiry transition and non-secret tombstone source.
- `project_tools/test_p1_196_auth_validity_generation_refinement_model.js`
  - records exact expiry/tombstone progress while keeping recovery recheck open.
- `project_tools/test_yandex_legacy_token_cleanup.js`
  - proves a session tombstone outranks and cleans a stale local token.

All tests are local/synthetic. They make no provider call.

## 10. Remaining P1-196 boundary

P1-196 remains **ACTIVE** after this tranche.

The principal remaining runtime gap is:

> restart/maintenance recovery still captures one auth/operation snapshot before the bounded queue and does not re-evaluate current auth usability/generation before every later auth-required child after a preceding child can invalidate/supersede auth.

That recovery schedule is not silently closed by tombstones.

Broader adjacent owners remain separate:

- P1-177: scheduler pause/resume generation;
- P1-178: shared auth-attempt/control generation;
- P1-195: capability truth;
- P0-074: immutable admitted operation context;
- P1-231: physical/release evidence authority.

## 11. Release identity impact

`service-worker.js` is a canonical package member, so current 34-file RPF and current 33-file negative/control identity must advance.

This initial evidence intentionally does not guess those exact digests. The exact-head P1-231 source-generation/identity authorities must derive them from the PR head before current identity pins are synchronized.

No canonical QA-contract, Registry/full-RCF root or builder-contract input is intentionally changed, so no QCF/full-RCF/BCF change is claimed without exact authority output.

## 12. Non-actions

This tranche does **not**:

- use a real OAuth credential;
- call Yandex;
- mutate provider state;
- perform real Chrome qualification;
- create physical release receipts;
- build the product ZIP;
- bump manifest/version;
- activate P1-231 S2 or release policy;
- create a tag, deployment or GitHub Release;
- make a release decision.

Manifest remains `0.9.8`; release readiness remains **NOT READY**.
