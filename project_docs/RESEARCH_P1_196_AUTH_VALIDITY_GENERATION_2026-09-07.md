# P1-196 — Yandex auth validity / exact-generation invalidation — 2026-09-07

Date: 2026-09-07  
Canonical baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical `service-worker.js` Git blob: `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`  
Working branch: `research/p1-196-auth-validity-generation-2026-09-07`  
Owner: **P1-196 ACTIVE**.

Research/model only. Production runtime, `manifest.json`, Registry status, version and release state remain unchanged.

## 1. Canonical owner

Registry wording:

> Invalid-token/401 demotion is exact auth-generation fenced; stale failure from auth A cannot clear/downgrade newer auth B.

P1-196 owns current-token validity/demotion semantics. It composes with, but does not replace:

- **P1-178** — shared auth-attempt/settings generation and commit authority;
- **P1-191** — manual-token candidate validation before generation-CAS replacement;
- **P1-195** — requested/granted/reduced/unknown Disk capability truth;
- **P0-074** — one immutable Yandex operation context;
- **P1-177** — backup scheduler pause/resume/no-auth generation;
- **P1-179** — immutable backup account/root namespace;
- **P1-184** — exact remote mutation/content settlement receipts;
- **P1-210** — truthful partial/unknown outer results after side effects.

P1-196 does **not** introduce a second independent auth-generation counter. It consumes the single shared P1-178 generation authority.

## 2. Fresh canonical baseline proof

Fresh checks immediately before this branch was created:

- `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`;
- Registry still lists P1-196 as `ACTIVE`;
- no `research/p1-196-*` branch existed;
- `manifest.json` remains version `0.9.8`;
- `minimum_chrome_version = 118`;
- production/runtime was not changed by this research.

## 3. Current-source defect: token presence is reported as connected

Current `getYandexStatus()` returns:

```text
connected = Boolean(yandexAuth?.accessToken)
```

It does not make the `connected` result depend on current validity, known expiry, provider invalidation or auth generation.

Therefore a token object may remain present while the provider no longer accepts it, yet Settings/status still has a binary value that looks like connection readiness.

P1-195 already separates capability readiness from token presence. P1-196 adds the independent validity axis.

## 4. Current-source defect: known expiry blocks only at operation time

Current `getValidYandexAccessToken()` does inspect `expiresAt` and rejects a token when:

```text
expiresAt <= Date.now() + 60 seconds
```

This is a useful positive control.

However the check only throws. It does not transition the exact auth state to an explicit `expired` validity state, does not advance/fence the shared auth generation, and does not make `getYandexStatus()` stop advertising token-presence connection truth.

Consequences:

- Settings may still display the token as connected;
- later background/recovery attempts repeat the same local expiry rejection;
- scheduler state cannot consume a durable/explicit no-usable-auth transition;
- a concurrent auth replacement needs exact-generation fencing before any expiry-triggered cleanup/demotion can touch global auth.

## 5. Current-source defect: missing lifetime becomes zero

Current `normalizeYandexOAuthExpiresIn()` returns `0` when `expires_in` is absent or empty.

Current PKCE storage then writes:

```text
expiresAt = expiresInSeconds ? now + expiresInSeconds * 1000 : 0
```

Current manual-token state also writes:

```text
expiresAt = 0
```

But `getValidYandexAccessToken()` interprets zero as "there is no known local expiry boundary to check".

That representation conflates:

```text
expiry unknown
```

with a value operationally behaving like:

```text
never locally expires
```

P1-196 requires explicit lifetime knowledge. Unknown lifetime is not proof of infinite lifetime.

## 6. Current-source defect: non-OK Disk response does not demote auth

Current `yandexApi()`:

1. reads the current access token;
2. sends `Authorization: OAuth <token>`;
3. on a non-OK response creates an Error;
4. attaches `error.status = response.status` and the bounded provider `error.code`;
5. throws.

There is no exact-generation invalidation path for an authoritative current-token 401.

Therefore an actually revoked/invalid token can remain in `chrome.storage.session`, continue to appear connected and be attempted again by later operations.

This is the primary runtime gap owned by P1-196.

## 7. Current-source race if invalidation is added naively

Simply adding:

```text
if HTTP 401:
    writeYandexAuth(null)
```

would be unsafe.

Deterministic schedule:

```text
request R(A) starts under auth A, generation G
user reauthorizes/replaces -> auth B, generation G+1
R(A) returns 401 late
naive handler clears current global auth
B is lost even though B never produced the 401
```

The response is evidence about **A**, not about whichever auth record is current when the callback runs.

P1-196 therefore requires compare-and-demote semantics.

## 8. Provider evidence checked on 2026-09-07

Official Yandex OAuth documentation checked for this research:

- https://yandex.ru/dev/id/doc/ru/concepts/ya-oauth-intro
- https://yandex.ru/dev/id/doc/ru/tokens/token-invalidate
- https://yandex.ru/dev/id/doc/ru/tokens/debug-token
- https://yandex.ru/dev/disk-api/doc/ru/

Relevant provider facts:

1. a Yandex OAuth token has a finite/provider-controlled lifetime model;
2. tokens may become invalid because they expire or are revoked;
3. changing requested app rights or deleting/blocking an app can revoke previously issued tokens;
4. user account/security actions can revoke issued tokens;
5. the manual/debug-token result includes `expires_in` together with the access token;
6. Disk REST API access is OAuth-token authorized.

### Important error-mapping boundary

The Registry explicitly owns `invalid-token/401` demotion. This branch therefore models an authoritative OAuth-bound Disk `401` as an invalid-auth candidate.

However closure must record the **real current Disk API response status/body/error code** against `cloud-api.yandex.net` before broadening the classifier beyond that exact proven mapping.

Do not copy an error mapping from another Yandex API and assume Disk is identical.

In particular, do not globally interpret every `403` as invalid auth. Across Yandex APIs, forbidden responses can also mean missing permission or resource access; that belongs to P1-195/resource policy unless the exact Disk provider contract proves otherwise.

## 9. Target auth state: presence, validity and lifetime are separate axes

Conceptually:

```text
YandexAuthState {
    generation,
    authPresent,
    validity: valid | expired | invalid | unknown,
    expiryKnowledge: known | unknown,
    expiresAt?,
    source,
    account?,
    capabilityReceipt?   // P1-195, separate axis
}
```

Exact field names are implementation details.

The required separation is not.

### Token presence

Answers:

```text
is there an access-token capability in current session state?
```

### Validity

Answers:

```text
what does current evidence say about provider usability of this exact auth generation?
```

### Lifetime knowledge

Answers:

```text
do we know a local provider expiry boundary?
```

### Capability

P1-195 separately answers:

```text
which Disk scopes/capabilities are proven for this auth generation?
```

A token can be present but invalid. A token can be valid for authentication but have reduced capability. A token can have unknown expiry without being equivalent to an infinite-lifetime token.

## 10. Generation is the mutation authority

Every auth mutation must participate in one shared generation sequence.

Conceptually:

```text
A committed at G
B committed -> G+1
Disconnect -> G+2
current-A invalidation -> G+1
current-A expiry transition -> G+1
```

The exact numeric representation is P1-178 implementation detail. The invariant is:

> Any operation that can change which auth is globally usable must invalidate older commit/demotion authority.

P1-196 must never create its own unrelated generation counter.

## 11. OAuth-bound request receipt

An invalidation decision requires proof of which auth was actually sent.

Conceptually:

```text
YandexAuthRequestReceipt {
    requestKind: disk-oauth,
    authGeneration: G,
    authRecordId: non-secret opaque id,
    authorizationBound: true
}
```

The receipt must not persist the token itself and does not need a durable token hash.

A unique generation/opaque auth-record id is preferable to deriving authority from secret material.

### Why request binding matters

Current `yandexApi()` builds:

```text
Authorization: OAuth ${token}
```

but then spreads `options.headers` afterward. Architecturally, a caller-provided `Authorization` field could therefore replace the header that the local `token` variable suggests was sent.

Future implementation should either:

1. prohibit/sanitize caller `Authorization` overrides; or
2. build the auth receipt from the final exact header authority actually sent.

A response cannot demote auth A merely because A was read before the request if the request did not actually use A.

## 12. Exact current 401 transition

Target sequence:

```text
capture exact auth generation G / record A
send Disk request provably authorized by A/G
receive authoritative invalid-auth 401
CAS current auth generation == G and auth record == A
if CAS succeeds:
    mark/demote A invalid
    prevent future admission under A
    advance shared auth generation
if CAS fails:
    response is stale for global-auth mutation
```

The request itself still fails in both cases.

A stale response is ignored **only for global auth mutation**. It is not converted into success for operation A.

## 13. Invalidation representation

P1-196 does not require one exact storage shape.

Valid options include:

- remove the invalid token and retain a non-secret invalidation tombstone/status;
- retain only non-secret metadata with `validity=invalid`;
- derive invalid status from a generation transition plus current no-token state.

Security invariant:

> An invalid token does not need to remain persistently stored merely to explain the error.

Existing session-only secret-storage policy remains authoritative.

## 14. Known local expiry transition

If current exact auth A/G has a known expiry inside the existing admission skew:

```text
no provider request is needed
A is not admitted
status becomes expired / unusable
any cleanup/demotion is generation-fenced to G
```

Race:

```text
expiry check begins for A/G
B commits at G+1
late expiry transition for A runs
```

Result:

```text
CAS fails
B remains current
```

Known expiry is deterministic evidence about A, not authority to clear B.

## 15. Unknown lifetime

Missing `expires_in` must not be encoded semantically as "never expires".

Target should preserve a state equivalent to:

```text
expiryKnowledge = unknown
```

For manual token input, successful candidate-bound provider validation under P1-191 can prove the token worked at validation time. It still does not prove an infinite lifetime.

If the product retains token-only manual input, lifetime remains unknown until provider failure or other exact evidence updates it.

If the product later accepts the complete documented debug-token result, `expires_in` may provide a known lifetime without changing P1-196's generation rules.

## 16. 403 / capability boundary

P1-196 must not use:

```text
any 403 -> clear auth
```

as a generic rule.

A forbidden response may reflect:

- missing scope;
- account/resource permission;
- provider policy;
- another service-specific access restriction.

Those cases compose with P1-195 and resource-specific logic.

If real Disk E2E proves a specific error code/status combination uniquely means invalid access token, that exact mapping may be added to the provider classifier with recorded evidence. It must still be generation-fenced.

## 17. Signed transfer 401 is not OAuth invalidation authority

WebClip also performs offscreen transfers to signed Yandex URLs.

Those URLs are capabilities separate from the OAuth `Authorization: OAuth <token>` request.

Therefore:

```text
signed-transfer HTTP 401/403
```

must not automatically become:

```text
current OAuth token invalid
```

P1-196 demotion applies only to a response provably bound to the exact OAuth-authorized Disk API request.

Unknown or failed signed effects remain under P1-184/P0-072/P1-076 reconciliation ownership.

## 18. No automatic mutation replay after reauth

Suppose a mutating operation under A receives an auth failure and A is invalidated.

WebClip must not automatically obtain/use B and silently replay the same mutating request merely because authorization changed.

Reasons:

- operation namespace/context may have changed;
- earlier stages may already have produced side effects;
- a lost response or another stage may have unknown settlement;
- P0-074 requires one immutable operation context;
- P1-210/P1-184 own partial/unknown result reconciliation.

Safe shape:

```text
old operation terminates/degrades under A
new auth B requires explicit new admission or exact recovery policy
```

## 19. Background recovery refinement

Current `recoverPendingRemoteSaves()` computes:

```text
authAvailable = true/false
```

once before iterating the queue.

That snapshot becomes unsafe after P1-196 is implemented.

Schedule:

```text
queue starts with auth A usable
item 1 receives authoritative current-A 401
P1-196 demotes A
item 2 still sees old authAvailable=true
```

Target:

```text
item 2 re-evaluates current auth usability/generation
-> deferred/no-usable-auth
```

A current invalidation should stop/defer subsequent auth-required work, not repeatedly hit the provider with the same invalid token.

This is a refinement of P1-196 + P1-177/P1-192, not a new owner.

## 20. Backup scheduler composition

P1-177 answers whether new backup work may be admitted while auth is absent/paused.

When P1-196 transitions the current auth to invalid/expired:

- new remote backup admission should become paused/no-usable-auth according to P1-177;
- ordinary failure/retry churn should not repeatedly use the invalid token;
- user backup preferences remain intact;
- already admitted signed effects/checkpoints remain intact and reconcile separately.

Invalidating OAuth state is not evidence that a previously issued signed URL or remote side effect was cancelled.

## 21. Account/root/context composition

A successful P1-196 generation check proves only which auth may be invalidated.

It does not authorize:

- moving an unresolved operation to a different account;
- reinterpreting a root path under new auth;
- consuming a stale account-cache result;
- replaying an old mutation under B.

Those remain P0-073/P0-074/P1-179/P1-178 concerns.

## 22. Status/UI truthfulness

Future status should distinguish at least:

```text
authPresent
authValidity
authUsable
authGeneration
expiryKnowledge
expiresAt (only when known)
```

A compatibility `connected` field may remain, but UI/readiness logic must not use it as the sole authorization truth.

Examples:

### Current valid-looking token with unknown lifetime

```text
authPresent = true
expiryKnowledge = unknown
```

Do not say "never expires".

### Known expired token

```text
authPresent may be false after cleanup
authValidity = expired
authUsable = false
```

### Authoritative current-generation 401

```text
authValidity = invalid
authUsable = false
```

### Stale 401 from A after B

```text
operation A = failed
global current B = unchanged
```

## 23. Deterministic model

Added:

`project_tools/test_p1_196_auth_validity_generation_model.js`

The model proves:

1. naive late invalidation can erase newer B;
2. stale A/401 cannot demote B;
3. exact current A/401 demotes once and advances generation;
4. duplicate old 401 is idempotently stale after the transition;
5. 403 does not blanket-demote auth;
6. timeout/network unknown does not demote auth;
7. signed-transfer 401 is not OAuth invalidation evidence;
8. known expiry transitions the exact current generation without a provider request;
9. missing lifetime is explicit unknown, not invented infinity;
10. stale expiry result for A cannot expire B;
11. recovery re-evaluates auth after item 1 invalidates current auth and defers item 2.

Expected result:

`P1-196 auth validity generation model: PASS`

Model PASS is architecture evidence only. It is not production/runtime or real-provider evidence.

## 24. Source-bound implementation gate

Added:

`project_tools/test_p1_196_auth_validity_generation_source.js`

The gate intentionally remains RED against current canonical runtime until implementation exists.

It requires, while preserving current positive controls:

- shared Yandex auth generation authority;
- exact OAuth request/auth-generation receipt;
- generation-CAS invalidation helper;
- explicit auth validity/usability status;
- explicit unknown lifetime semantics;
- known-expiry exact-generation transition;
- exact OAuth-bound 401 demotion;
- no blanket 403 invalidation;
- no signed-transfer-to-OAuth demotion;
- no unconditional `writeYandexAuth(null)` in the Disk API error path;
- current/per-item auth re-evaluation in remote-save recovery.

Expected current result:

`P1-196 auth validity generation source gate: RED`

## 25. Physical evidence required before closure

Do not close P1-196 from model/source evidence alone.

A closure gate should record real unpacked-Chrome + real Yandex evidence for the provider assumptions actually used by runtime.

At minimum:

1. current valid token performs a normal Disk info read;
2. exact observed Disk response for a deliberately invalid/revoked **disposable test token** is recorded, including HTTP status and bounded non-secret error code;
3. no production/user token is intentionally exposed in logs/artifacts;
4. a known local expiry blocks network admission and produces expired status;
5. an auth A request delayed until after auth B commit cannot demote B when A's invalid response settles;
6. repeated old-A invalid responses remain stale/idempotent;
7. real 403/missing-scope or resource-denial behavior is classified without blanket auth clear;
8. signed-transfer failure does not alter OAuth validity;
9. background recovery stops/deferred subsequent auth work after current auth becomes unusable;
10. pending external-effect receipts survive auth invalidation and remain available for exact reconciliation.

The stale-A/B race can be proven with a deterministic Chrome harness that delays the response while using real extension state. It does not require attacking or bypassing Yandex.

## 26. Safety / non-goals

This research is defensive architecture/data-integrity analysis only.

It does not:

- search for Yandex vulnerabilities;
- bypass OAuth;
- obtain unauthorized credentials;
- expose real tokens;
- revoke a production/user token;
- replay destructive operations automatically;
- modify runtime or manifest;
- change Registry status;
- build/tag/release.

Any future real invalid-token test should use a disposable authorized test token/account and retain only non-secret evidence.

## 27. Status

P1-196 remains **ACTIVE**.

Current runtime has a local expiry check and preserves OAuth tokens in session-only storage, but it still lacks:

- explicit validity/lifetime state;
- shared generation-bound invalidation;
- authoritative current-token 401 demotion;
- stale-401 protection;
- per-item recovery admission after auth invalidation.

Runtime remains `0.9.8`; release remains `NOT READY`.
