# WebClip — P1-196 auth-validity / exact-generation demotion refinement — 2026-09-10

Date: 2026-09-10  
Canonical baseline: `main = 07ba5d17569dd563102e6699431222742bec9dde`  
Mode: **RESEARCH-ONLY / CURRENT-MAIN ABSORPTION REVIEW**  
Production/runtime modification: **NONE**  
Real Chrome/Yandex L5: **NOT RUN**  
Release-policy activation: **NONE**  
New P-code: **NO**

This tranche continues existing ACTIVE **P1-196** after canonical P1-178 refinement #212. It measures the historical auth-validity contract against current canonical source and specifies how P1-196 consumes the single shared P1-178 auth generation. No production source is changed.

## 1. Canonical ownership

Current Registry authority is:

```text
P1-196  Auth validity is an explicit generation separate from token presence; stale failure/readback cannot downgrade a newer proven credential.
```

Composition boundaries:

```text
P1-178 = shared auth-attempt/settings generation + commit authority
P1-196 = validity/demotion semantics consuming that same generation
P1-191 = manual-token candidate validation/replacement
P1-195 = Disk capability truth, separate from auth validity
P1-177 = backup scheduler pause/resume generation
P1-179 = immutable backup account/root namespace
P0-074 = immutable operation-scoped Yandex context
P1-184/P1-210 = exact/unknown external-effect settlement
```

P1-196 does **not** create a second auth-generation counter.

## 2. Historical provenance retained

The 2026-09-07 P1-196 research already established:

- token presence, validity and lifetime knowledge are separate axes;
- an authoritative OAuth-bound Disk `401` is a current-auth invalidation candidate;
- stale A/401 after B becomes current may fail operation A but cannot demote B;
- a blanket `403 => invalid auth` rule is unsafe;
- signed-transfer failures are not OAuth-token invalidation authority;
- known local expiry must be generation-fenced;
- unknown `expires_in` is not proof of infinite lifetime;
- background recovery must re-evaluate auth after a current invalidation;
- P1-196 consumes P1-178 generation authority rather than inventing another counter.

That historical branch is provenance, not current implementation evidence.

## 3. Current-main positive controls

Current source already has useful protections that remain valid:

1. `getValidYandexAccessToken()` refuses admission when a known `expiresAt` is within the existing 60-second skew;
2. `yandexApi()` attaches bounded provider status/error metadata to failures;
3. Yandex access tokens remain session-oriented rather than durable local configuration;
4. auth storage writes are serialized;
5. current #212 research now defines one shared P1-178 auth/settings generation authority for future implementation.

These controls reduce risk. They do not yet publish explicit validity state or exact-generation demotion.

## 4. Token presence is still reported as connected

Current `getYandexStatus()` returns:

```text
connected: Boolean(yandexAuth?.accessToken)
```

Therefore status can report connection truth from token presence even if the token is known locally expired or has just been authoritatively rejected by the provider.

Target state keeps independent axes equivalent to:

```text
authPresent
authValidity = valid | expired | invalid | unknown
authUsable
expiryKnowledge = known | unknown
authGeneration
```

A compatibility `connected` field may remain only if its semantics are made explicit and no authorization-sensitive logic treats it as the sole proof of usability.

## 5. Known expiry is admission rejection, not explicit validity transition

Current `getValidYandexAccessToken()` checks:

```text
if expiresAt && expiresAt <= now + 60 seconds -> throw
```

This is a good admission guard.

But the function does not currently write an exact-generation `expired` validity transition. It also does not clear/demote auth, which is safer than an unfenced clear but leaves status/state ambiguous.

Target:

```text
capture A/G
known expiry proves A unusable locally
CAS current auth == A/G
if current -> publish expired/unusable transition and advance shared generation as required by chosen storage shape
if stale -> no global auth mutation
```

The old operation still fails either way.

## 6. Unknown lifetime is not infinite lifetime

OAuth completion stores:

```text
expiresAt = expiresInSeconds ? now + expiresInSeconds * 1000 : 0
```

Manual-token state also uses an unknown/zero expiry form.

Current admission code interprets zero as no known local expiry boundary. The semantic target must retain:

```text
expiryKnowledge = unknown
```

and must never present zero as proof that the credential never expires.

A successfully validated manual token may be known to work at validation time while its lifetime remains unknown.

## 7. Current Disk API failure path has no 401 demotion

Current `yandexApi(endpoint, options, allowRetry)` obtains an access token, sends a Disk request, and for a failed response records:

```text
error.status = response.status
error.code = bounded provider error
throw error
```

There is no current exact-generation branch equivalent to:

```text
OAuth-bound authoritative 401 -> compare-and-demote current exact auth
```

Thus an invalid/revoked token can remain present and be retried by later operations.

## 8. Request receipt must describe what was actually sent

Current request construction is structurally important:

```text
headers: {
  'Authorization': `OAuth ${token}`,
  'Accept': 'application/json',
  ...(options.headers || {})
}
```

Because caller headers are spread afterwards, a caller-supplied `Authorization` can theoretically override the OAuth header implied by the local `token` variable.

Therefore a demotion decision cannot be authorized merely by "token A was read before fetch".

Preferred future direction:

```text
prohibit/sanitize caller Authorization override
AND bind request receipt to exact auth generation/record actually used
```

Conceptual non-secret receipt:

```text
YandexAuthRequestReceipt {
  requestKind: disk-oauth,
  authGeneration: G,
  authRecordId,
  authorizationBound: true
}
```

No access token or secret-derived durable hash is required.

## 9. Exact current-generation 401 transition

Required transition:

```text
capture exact current auth A/G
construct request provably authorized by A/G
send request
receive authoritative invalid-auth 401
CAS current auth record/generation == A/G
if CAS succeeds:
  publish A invalid/unusable
  invalidate later admission under A
  advance/commit through shared P1-178 generation mechanism
if CAS fails:
  response is stale for global-auth mutation
```

The request fails in both cases. "Stale for demotion" does not turn operation A into success.

## 10. Stale response race

Deterministic schedule:

```text
R(A/G) starts
B commits at G+1
R(A/G) returns 401 late
```

Required:

```text
operation under A = failure
global B = unchanged
no clear(B)
no validity downgrade(B)
no generation advance on behalf of stale A
```

Naive `401 -> writeYandexAuth(null)` is forbidden.

## 11. 403 and provider-classification boundary

Do not implement:

```text
any 403 -> invalid auth
```

A forbidden response can represent reduced/missing capability, resource permission or provider policy. Those facts compose with P1-195/resource-specific logic.

Only an exact provider mapping proven for current Disk API may extend invalid-auth classification beyond the canonical `401` owner wording, and the resulting transition must still be generation-fenced.

Real Yandex L5 is outside this tranche and is not run here.

## 12. Network/timeout/5xx are not invalid-auth proof

The following alone do not prove credential invalidity:

```text
network error
timeout
provider 5xx
malformed transient response
```

They fail/degrade the operation under its existing owner, but do not mutate current global auth validity without authoritative auth evidence.

## 13. Signed transfer failures are separate

Offscreen signed Yandex upload/download URLs are capability URLs and do not use the same OAuth `Authorization` request binding.

Therefore:

```text
signed-transfer 401/403
!= current OAuth token invalidation authority
```

Unknown/failed signed side effects remain under their exact checkpoint/reconciliation owners. P1-196 cannot infer OAuth invalidity from a signed transport response.

## 14. Manual-token composition

Canonical #212 identified provisional/final/manual cleanup writers that need shared P1-178 generation fencing.

P1-196 adds validity semantics:

```text
manual candidate validation succeeds -> valid-at-validation-time evidence for that exact candidate generation
manual candidate validation fails authoritatively -> candidate rejected
late failure for stale candidate A -> cannot clear/demote current B
unknown lifetime -> remains explicit unknown
```

P1-191 owns candidate-validation replacement policy; P1-196 owns validity meaning; P1-178 owns generation-safe commit mechanics.

## 15. Status/readback account enrichment

Any account/status read performed under auth A/G can become stale before it returns.

A successful stale read cannot overwrite account metadata for B. An authoritative failure from stale A cannot invalidate B.

The same exact auth generation must fence both positive enrichment and negative validity transitions. Separate counters would recreate the race.

## 16. Background remote-save recovery snapshot gap

Current `recoverPendingRemoteSaves()` computes:

```text
let authAvailable = true
try getValidYandexAccessToken()
catch -> authAvailable = false
```

once before iterating the pending queue.

Schedule:

```text
queue starts while A looks usable
item 1 receives authoritative current-A invalidation
item 2 reaches auth-required reconciliation
```

If item 2 consumes the old `authAvailable=true` snapshot, the worker can continue provider work under invalidated authority.

Target:

```text
before each auth-required child:
  resolve/revalidate current shared auth generation + usability
```

Once A becomes invalid/expired, later queue items defer/no-usable-auth until a new generation is explicitly established. This composes with P1-177/P1-192 fairness; it does not allocate a new owner.

## 17. Backup scheduler composition

A current P1-196 invalid/expired transition feeds P1-177 as `no usable auth` for **new** backup admission.

It must not:

- erase user backup preferences;
- delete P1-179 historical namespace checkpoints;
- pretend already-issued signed effects were cancelled;
- silently replay old mutation work under new auth B.

Already-started effects retain their factual operation identity and reconcile under their existing owners.

## 18. No automatic mutation replay after reauth

If mutation M under A fails auth and B later becomes current:

```text
M(A) does not silently become M(B)
```

A new auth generation is not replay authority for an old physical mutation. P0-074 immutable operation context and P1-184/P1-210 settlement semantics remain authoritative.

## 19. Deterministic negative matrix

The companion model covers:

```text
N01 current A/401 demotes A exactly once
N02 duplicate A/401 is stale after demotion
N03 A request -> B commit -> late A/401 cannot demote B
N04 A known expiry -> B commit -> late expiry transition cannot demote B
N05 current known expiry makes A unusable
N06 expiry unknown remains unknown, not infinite
N07 token presence alone is not validity
N08 current status source still derives connected from accessToken presence
N09 current yandexApi has no exact 401 demotion branch
N10 current request header order permits caller Authorization override structurally
N11 request receipt bound to actual A/G permits exact demotion
N12 unbound response cannot mutate global auth
N13 generic 403 does not demote
N14 timeout does not demote
N15 5xx does not demote
N16 signed-transfer 401 does not demote OAuth auth
N17 stale account enrichment cannot overwrite B
N18 stale negative read cannot invalidate B
N19 manual A late failure cannot clear B
N20 same shared P1-178 generation gates positive and negative auth writes
N21 P1-195 capability remains separate from validity
N22 P1-177 scheduler consumes unusable-auth transition for new admission
N23 P1-179 historical checkpoint survives auth invalidation
N24 no auto mutation replay under B
N25 recovery item 2 rechecks auth after item 1 invalidates A
N26 one pre-loop authAvailable snapshot is insufficient
N27 control receipt contains no token/Authorization secret
N28 manifest remains 0.9.8
N29 no runtime/L5/S2/release action
```

## 20. Acceptance contract

P1-196 refinement research is complete when deterministic evidence proves:

1. token presence, validity, usability and lifetime knowledge remain separate axes;
2. known local expiry is an exact-generation transition, not authority to clear a newer credential;
3. unknown lifetime is represented as unknown rather than infinite;
4. authoritative current OAuth-bound Disk 401 can demote only the exact request auth generation;
5. stale 401 cannot mutate current newer auth;
6. request receipt is bound to the final actual OAuth authorization authority;
7. generic 403/network/timeout/5xx and signed-transfer failures do not blanket-demote OAuth auth;
8. positive account enrichment and negative demotion share one P1-178 generation fence;
9. manual candidate validity composes with P1-191 without stale cleanup of newer auth;
10. recovery rechecks auth generation/usability before each later auth-required child after invalidation;
11. P1-177/P1-179/P1-195/P0-074/P1-184/P1-210 boundaries remain intact;
12. no automatic old-mutation replay occurs after new auth;
13. no secret is added to durable control receipts;
14. no new P-code is allocated;
15. runtime remains unchanged;
16. no real L5, release-policy activation, readiness mutation, official ZIP, tag, Release or deployment occurs.

## 21. Boundary

```text
P1-196 validity refinement != runtime implementation
runtime implementation != real Yandex qualification
real Yandex qualification != P1-231 S2 activation
P1-231 S2 activation != release readiness
```

V1 readiness and release authority are untouched.
