# WebClip — P1-191 manual-token replacement refinement — 2026-09-11

Date: 2026-09-11  
Canonical baseline: `main = 5da21c26cb0bfd0415b4369203f631e5e3f0615e`  
Mode: **RESEARCH-ONLY / CURRENT-MAIN ABSORPTION REVIEW**  
Production/runtime modification: **NONE**  
Real Chrome/Yandex L5: **NOT RUN**  
Release-policy activation: **NONE**  
New P-code: **NO**

This tranche continues existing ACTIVE **P1-191** after canonical P1-178, P1-196 and P1-195 refinements. It selectively revalidates the historical manual-token replacement contract against current canonical source and fresh Yandex/OAuth documentation. Historical branches remain provenance only and are not imported wholesale.

## 1. Canonical ownership

Current Registry authority is:

```text
P1-191  Manual-token replacement must validate candidate before generation-fenced commit and preserve last proven auth on failure/unknown; old PKCE cannot later overwrite it.
```

Composition boundaries:

```text
P1-191 = manual-token candidate validation and replacement ordering
P1-178 = shared auth-attempt/settings generation + commit authority
P1-196 = validity / exact-generation invalidation of committed auth
P1-195 = Disk capability truth after a credential is accepted
P0-073 = durable account/root namespace continuity
P0-074 = immutable operation-scoped Yandex context
P1-177/P1-179 = backup admission + namespace behavior after auth changes
```

P1-191 does not create another auth-generation counter. It consumes P1-178 generation authority and does not turn candidate rejection into a P1-196 global-auth demotion.

## 2. Historical provenance retained selectively

The 2026-09-07 P1-191 research correctly established:

- candidate B must be validated before it replaces proven auth A;
- invalid B must preserve A;
- validation-unknown B must preserve A;
- validation must be candidate-bound, not an ordinary call that rereads mutable global auth;
- valid B commits only if the expected shared auth generation is still current;
- successful B commit invalidates older PKCE/manual commit authority;
- candidate token remains secret and transient before commit;
- stale account enrichment cannot overwrite newer auth;
- account/root continuity after an actual account switch remains under its separate owners.

The historical source gate intentionally expected future runtime implementation and therefore stayed RED. This refinement does **not** import that RED gate into canonical CI. It adds a current-gap model that proves both today's defect and the target race semantics without claiming implementation.

## 3. Current source: candidate is still published before validation

Current `setManualYandexToken(token)` constructs:

```text
source = manual
clientId = ''
accessToken = candidate token
expiresAt = 0
scope = ''
account = null
```

and immediately executes:

```text
await writeYandexAuth(yandexAuth)
```

Only afterwards does it call:

```text
const info = await yandexApi('')
```

That means candidate B becomes global/session auth before the provider read has proven even narrow current usability.

The central ordering defect remains:

```text
candidate B received
-> global B published
-> provider validation begins
```

instead of:

```text
candidate B received
-> private B-bound validation
-> generation CAS
-> global B published once
```

## 4. Current source: failure clears global auth

Current catch path executes:

```text
await writeYandexAuth(null)
throw error
```

Therefore:

```text
A is proven current auth
user tries B
B becomes global temporarily
B validation fails or becomes locally unknown
catch clears auth
```

The result can erase A even though the user action was a replacement attempt and B never became proven replacement authority.

Required P1-191 semantics:

```text
invalid B  -> discard B; preserve A/G
unknown B  -> discard B; preserve A/G
valid B    -> attempt one generation-CAS commit
stale B    -> discard B; preserve newer current auth
```

No candidate failure gains authority to clear a credential that was proven before the replacement attempt or became current after it.

## 5. Current validation is coupled to mutable global auth

The current validation call is ordinary:

```text
yandexApi('')
```

`yandexApi()` gets its OAuth credential through the current global auth path. The present flow first writes B, so the common case often validates B. But that is accidental coupling, not an exact candidate-binding contract.

An asynchronous auth change can occur between provisional publication and the provider request or its completion. Future validation therefore needs an explicit candidate-bound transport primitive equivalent to:

```text
validateManualYandexTokenCandidate({
  candidateToken,
  expectedAuthGeneration,
  validationId
})
```

or an operation-context request that is provably authorized by that candidate and does not reread mutable global auth.

## 6. Fresh provider recheck: Yandex manual/debug token

Official Yandex OAuth documentation reviewed on 2026-09-11:

- `https://yandex.com/dev/id/doc/en/tokens/debug-token`
- `https://yandex.ru/dev/id/doc/ru/tokens/debug-token`
- `https://yandex.com/dev/id/doc/en/access`

Relevant Yandex observations:

1. Yandex explicitly describes manually obtained/debug OAuth tokens as suitable for API access and application testing;
2. the manual-token response contains `access_token` and `expires_in`;
3. Yandex describes `access_token` as having the permissions requested or specified when registering the application;
4. manually obtained tokens can be revoked;
5. Yandex recommends that a received token only be available to the application and not be stored in exposed browser/open configuration material.

These facts support provider validation of an explicit candidate and treating the candidate as a secret. They do **not** prove that an arbitrary pasted token carries WebClip's current requested Disk scope set, because WebClip lacks the exact issuance/request receipt for that pasted token. P1-195 therefore continues to classify its capability provenance as unknown unless separate exact evidence exists.

## 7. Standards cross-check: RFC 6750

OAuth bearer-token handling was rechecked on 2026-09-11:

- `https://www.rfc-editor.org/rfc/rfc6750.html`

RFC 6750 emphasizes that possession of a bearer access token is sufficient to use its associated authority and therefore the token must be protected from disclosure in storage and transport. It prefers authenticated resource requests through the HTTP `Authorization` header and warns against token-bearing URLs because they are prone to logging/history exposure.

Yandex uses its provider-specific header syntax:

```text
Authorization: OAuth <token>
```

not the literal RFC `Bearer` scheme. RFC 6750 is used here only for the generic bearer-secret security property; Yandex documentation remains authoritative for provider syntax.

## 8. Candidate-bound validation target

For current WebClip, a bounded Disk-info request is the narrowest existing provider read that can establish candidate acceptance/account metadata without intentionally creating a remote object.

Conceptual validation context:

```text
ManualTokenValidation {
  validationId,
  expectedAuthGeneration,
  candidateToken: memory-only secret,
  startedAt,
  requestKind: disk-info,
  result: valid | invalid | unknown
}
```

The candidate token itself must not enter durable/loggable control metadata. Durable or diagnostic receipts may contain non-secret identity such as `validationId`, expected generation, result class and bounded account metadata only if those fields are already permitted by their relevant privacy owners.

## 9. Validation result is tri-state

### `valid`

The exact B-bound provider request succeeded and proves B was accepted for that exact operation at that time. Account metadata may be derived from that exact response.

This is **valid-at-validation-time evidence**, not proof of all Disk capabilities and not a lifetime guarantee.

### `invalid`

Only an authoritative provider result that the implementation has explicitly classified as invalid/revoked/unauthorized candidate evidence can reject B as invalid.

Because B is not yet committed auth, rejection of B is not P1-196 demotion of current A.

### `unknown`

Examples:

```text
local timeout
network failure
provider 5xx
MV3 worker interruption
ambiguous transport/result
```

Unknown is not invalid and not success. A remains current; B is not committed. A fresh explicit user attempt may retry.

## 10. Required replacement protocol

Given proven current auth A at shared generation G:

```text
1. capture expected generation G
2. keep candidate B private in worker memory
3. validate B through a B-bound Disk request
4. classify result
5. if invalid  -> discard B; A/G unchanged
6. if unknown  -> discard B; A/G unchanged
7. if valid    -> compare current generation with G
8. if stale    -> discard B; newer state unchanged
9. if current  -> atomically/logically commit B and advance shared generation
```

Conceptually:

```text
A/G + valid B + current(G)
    -> B/(G+1)
```

The exact storage shape belongs to P1-178. P1-191 only requires the replacement ordering and preservation behavior.

## 11. Old PKCE completion after manual replacement

Canonical P1-178 already records the network-exchange suspension race.

Schedule:

```text
PKCE P captures generation G
manual B starts from G
B validates successfully
B commits -> generation G+1
old P exchange returns
```

Required:

```text
P sees stale generation
zero auth/config commit from P
zero overwrite of B
```

A successful old OAuth exchange is factual provider evidence for P, but no longer current commit authority.

## 12. Disconnect versus in-flight manual candidate

Disconnect is a newer auth mutation/barrier under P1-178.

Schedule:

```text
manual B starts validation at G
user disconnects -> generation G+1 / no current auth
B validation succeeds late
```

Required:

```text
B commit CAS fails stale
B cannot resurrect auth
```

A later manual-token installation requires a fresh explicit user action based on the newer generation.

## 13. Concurrent manual candidates

Schedule:

```text
B starts at G
C starts at G
C validates and commits first -> G+1
B validates later
```

Required:

```text
B is stale
B cannot overwrite C
B cannot clear C
```

If B failed rather than succeeded, its late catch path likewise has zero global-auth mutation authority.

## 14. Account enrichment belongs to the exact candidate

Current source enriches the already-published `yandexAuth` object with account metadata after `yandexApi('')` and writes it again.

Target behavior:

```text
candidate B-bound response
-> extract account metadata for B
-> include that metadata in B's candidate result
-> generation-CAS commits B + its own metadata once
```

A stale response for B cannot enrich or overwrite current C. Positive account enrichment and negative candidate failure are both fenced by the same expected generation.

## 15. Canonical P1-195 composition: valid manual is not full-capability proof

Canonical P1-195 now explicitly separates:

```text
requested scopes
granted/proven scopes
observed capabilities
operation-required scopes
```

Current manual auth stores `scope = ''` and has no exact authorization-request receipt. Therefore even after successful Disk-info validation:

```text
auth validity = valid-at-validation-time
observed capability = exact Disk-info observation
capability state = unknown
```

Do not convert successful manual candidate validation into:

```text
capability = full
scopes = current YANDEX_SCOPES as proven
```

P1-191 owns replacement success. P1-195 owns what capability evidence that success does and does not mean.

## 16. Canonical P1-196 composition: candidate rejection is not global demotion

P1-196 operates on committed exact-generation auth requests and validity transitions.

For uncommitted manual candidate B:

```text
B invalid
-> reject B
-> preserve A
```

It is not:

```text
B invalid
-> clear/demote current A
```

After B commits as a new current generation, later authoritative invalid-auth evidence for requests actually bound to B is handled by P1-196.

## 17. Candidate request authority must be exact

Canonical P1-196 also found that caller-provided `Authorization` headers can structurally override the default OAuth header in the generic current request builder.

A manual validation helper must therefore not merely say "candidate B was read before fetch". It must make the actual request authority unambiguous:

```text
worker-owned Authorization: OAuth B
caller cannot override Authorization
receipt binds validationId + expected generation + request kind
```

No token value or token-derived durable fingerprint is needed in the receipt.

## 18. Candidate secret lifecycle

Before successful commit, candidate B should exist only in the shortest practical transient scope required for validation.

Forbidden pre-commit effects include:

- writing B to `chrome.storage.session` as current auth;
- writing B to `chrome.storage.local`;
- putting B or `Authorization: OAuth B` in OperationLog/Journal/error text;
- embedding B in a durable validation receipt;
- modifying current root/publication settings on behalf of B;
- clearing current auth because B validation fails/unknown;
- consuming/removing a newer pending PKCE receipt.

A service-worker termination before commit should leave the previous committed auth truth unchanged. Since no candidate secret was durably promoted, the user can explicitly retry.

## 19. Current positive controls to preserve

Current source already has protections that remain useful:

- token input is trimmed and bounded by `MAX_YANDEX_ACCESS_TOKEN_CHARS`;
- empty manual token is rejected;
- committed auth storage is session-oriented;
- legacy persistent auth cleanup is fail-closed;
- auth storage operations are serialized for physical settlement ordering;
- Disk account extraction bounds provider-controlled text;
- explicit Disconnect can clear committed auth;
- current P1-178 research defines one shared generation owner rather than parallel generation domains.

Physical serialization does not replace logical generation ownership after network waits.

## 20. Current-gap deterministic requirements

The companion model must prove at least:

```text
N01 P1-191 remains ACTIVE with exact Registry owner wording
N02 current manual candidate writes global auth before validation
N03 current manual validation uses ordinary global yandexApi('')
N04 current manual failure clears global auth
N05 current runtime has no candidate-bound validation helper
N06 current runtime has no generation-CAS manual commit helper
N07 historical current-shaped invalid B can erase A
N08 target invalid B preserves A/G
N09 target unknown B preserves A/G
N10 valid B commits once under expected generation
N11 valid B increments shared generation
N12 stale valid B cannot overwrite newer auth
N13 old PKCE cannot overwrite newer manual B
N14 disconnect invalidates old B commit authority
N15 late invalid/unknown B cannot clear newer C
N16 account metadata committed with B is derived from B-bound validation
N17 stale B account enrichment cannot overwrite C
N18 candidate token remains absent from durable/loggable receipt
N19 Authorization header value remains absent from durable/loggable receipt
N20 valid manual B remains P1-195 capability unknown absent scope provenance
N21 Disk-info observation does not prove write
N22 candidate invalid is rejection, not P1-196 demotion of A
N23 committed B later composes with P1-196 exact-generation validity
N24 P1-178 remains shared generation/commit owner
N25 P1-195 remains capability owner
N26 P1-196 remains committed-validity owner
N27 P0-073/P0-074 account/root/context boundaries survive replacement
N28 manifest remains 0.9.8
N29 no runtime modification
N30 no real L5/S2/release action
```

## 21. Acceptance contract

P1-191 refinement research is complete when deterministic evidence proves:

1. current pre-validation publication and failure-clear defects are bound to exact canonical source;
2. manual candidate validation is modeled as private and candidate-bound;
3. invalid and unknown candidates preserve the last proven committed auth;
4. successful candidate replacement commits only under exact shared P1-178 generation CAS;
5. disconnect/newer manual/newer PKCE state invalidates stale candidate commit authority;
6. old PKCE completion cannot overwrite a newer manual replacement;
7. candidate account metadata is derived from the exact candidate-bound response and cannot stale-write newer auth;
8. candidate secret/header never enters durable/loggable control metadata;
9. successful Disk-info validation does not fabricate full capability under P1-195;
10. candidate rejection does not misuse P1-196 to demote current auth;
11. current positive controls remain represented;
12. P0-073/P0-074/P1-177/P1-179 boundaries remain intact;
13. no new P-code is allocated;
14. runtime remains unchanged;
15. no real Yandex L5, release-policy activation, readiness mutation, official ZIP, tag, Release or deployment occurs.

## 22. Boundary

```text
P1-191 replacement refinement != runtime implementation
runtime implementation != real Yandex qualification
real Yandex qualification != P1-231 S2 activation
P1-231 S2 activation != release readiness
```

V1 readiness and release authority remain untouched.