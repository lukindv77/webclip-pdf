# WebClip — W5 fixed-redirect auth-core refinement — 2026-09-10

Date: 2026-09-10  
Canonical baseline: `main = 1529b174a99e7029db23c3e39b0548fc299b9ff5`  
Research branch: `research/w5-fixed-redirect-auth-core-refinement-2026-09-10`  
Mode: **RESEARCH-ONLY / CURRENT-BASELINE AUTHORITY REFINEMENT**  
Production/runtime modification: **NONE**  
Real Yandex L5: **NOT RUN**  
Release-policy activation: **NONE**  
New P-code: **NO**

This tranche refines the historical W5 auth-core design directly against current canonical requirements and current production source after the runtime selective-adoption reconciliation. It keeps the current WebClip product decision to use Yandex Authorization Code + PKCE with the fixed verification-code redirect. It does not resurrect the historical `chrome.identity` / `chromiumapp.org` transport.

The research target is narrower and more important: make the existing two-step fixed-redirect flow safe under multiple Options pages, repeated auth starts, manual-token replacement, disconnect, worker restarts, late token-exchange settlement, future 401 demotion, capability ambiguity, and caller-controlled request headers.

---

## 1. Current authority and owner reconciliation

Current authority order:

```text
USER_REQUIREMENTS.md
+ DECISIONS_AND_RATIONALE.md
+ current architecture/contracts
+ RESEARCH_REGISTRY.md
+ exact current source
        > historical W5 transport choice
```

Relevant existing owners are sufficient; no new root cause is allocated:

```text
P1-177  disconnect/re-auth and backup scheduler generation semantics
P1-178  auth attempt + settings-generation state machine; stale finish/cleanup fencing
P1-191  manual-token replacement generation and preserve-last-proven-auth semantics
P1-195  Yandex capability truth; token/read success does not prove all required scopes
P1-196  exact auth-generation fencing for invalid-token/401 demotion
P0-073  immutable account/root context for remote operations
P0-074  immutable auth/account/root/config/publication context for long Yandex operations
P0-075  host/control-plane isolation and sensitive auth authority
```

`P1-231` remains ACTIVE for release generation/evidence authority only. This W5 runtime refinement does not broaden P1-231 ownership and does not satisfy its S2 approval fence.

---

## 2. Current product requirement is fixed-redirect + PKCE

Current canonical requirements require:

```text
Authorization Code + PKCE
redirect_uri=https://oauth.yandex.ru/verification_code
Client Secret is not embedded in the extension
```

Current rationale repeats the supported fixed redirect and no embedded Client Secret.

Current source is aligned with that choice:

```text
YANDEX_FIXED_REDIRECT_URI = https://oauth.yandex.ru/verification_code
code_challenge_method = S256
WEBCLIP_YANDEX_START_AUTH
WEBCLIP_YANDEX_FINISH_AUTH
```

Current `manifest.json` has no `identity` permission and current `service-worker.js` does not use `chrome.identity.getRedirectURL()` or `chrome.identity.launchWebAuthFlow()`.

Therefore this tranche treats the historical Chrome Identity transport as a rejected implementation direction while selectively retaining its useful generation/capability invariants.

---

## 3. Fresh current-source findings

### 3.1 OAuth pending state is one mutable global slot

Current worker keeps a single `yandexOAuthPending` receipt carrying values such as:

```text
clientId
codeVerifier
state
createdAt
expiresAt
```

but no durable/opaque `authAttemptId` and no shared authorization generation.

`WEBCLIP_YANDEX_FINISH_AUTH` receives only the pasted code. `options.js` likewise sends only the code when finishing authorization.

Consequence:

```text
Options page A starts auth A
Options page B starts auth B
page A later pastes a code
```

cannot be bound by the protocol to the exact pending attempt that page A owns. The worker necessarily interprets the code against whichever global pending object is current at finish time.

This is the concrete P1-178/P1-191 composition gap for the current fixed-redirect transport.

### 3.2 Storage settlement serialization is not semantic generation CAS

Current `yandexAuthStorageSettlementChain` serializes storage operations and late storage settlement. That is useful for avoiding raw storage races, but it does not by itself make a long OAuth/network operation current.

A stale token exchange can finish after a newer user intent. Correctness requires an authority comparison before commit, not only ordered storage writes afterward.

### 3.3 Late finish can overwrite newer auth intent

Current finish flow captures the current global pending receipt, performs a network token exchange, then writes configuration/auth state and removes the pending slot. There is no exact attempt/generation re-check after the network boundary.

Required negative schedules include:

```text
A exchange starts -> B OAuth start -> A exchange returns
A exchange starts -> successful manual B -> A exchange returns
A exchange starts -> disconnect -> A exchange returns
```

In each schedule A must become stale and must not commit token/config, delete B's pending receipt, or resurrect authorization after disconnect.

### 3.4 Manual replacement currently installs before it proves

Current manual-token path constructs a manual auth object and installs it through `writeYandexAuth(...)` before completing validation through Yandex API. On validation failure the catch path clears auth.

This violates the intended P1-191 replacement rule when a last-proven credential A exists:

```text
proven A
-> user proposes manual candidate B
-> B validation fails or becomes evidence-unknown
```

must leave A authoritative. A candidate replacement is not authority until privately validated and committed through the same generation fence.

### 3.5 Disconnect needs to invalidate in-flight authority, not merely clear storage

Current disconnect removes current auth/pending state, but without a shared generation an older in-flight finish can later settle and repopulate auth.

Disconnect therefore must advance the same authorization-control generation as OAuth start and manual replacement. Existing external operations that already started under an immutable captured auth/account context are reconciled factually; disconnect must not restore a global credential merely to explain their settlement.

### 3.6 Caller headers can override worker-owned Authorization

Current Yandex request header composition places the worker's OAuth header before caller-provided `options.headers`. In JavaScript object-spread semantics, a later caller `Authorization` member can overwrite the worker-owned value.

For the worker Yandex adapter, `Authorization` is a reserved control-plane header. A caller must not be able to select or replace the credential by passing a generic headers object.

Target rule:

```text
reject/strip caller Authorization
then inject exact worker-owned Authorization last
```

The same reasoning applies to other security-sensitive headers if a later audit classifies them as worker authority.

### 3.7 Token presence is not full capability truth

Current status can report connection based on access-token presence and the configured/requested scope set. Existing P1-195 explicitly says token presence or a successful read is not proof of every required Disk permission.

Required capability state:

```text
full
reduced
unknown
```

Suggested current provider-contract interpretation:

- OAuth flow requests the exact required scope set.
- If Yandex explicitly returns a smaller scope set, capability is `reduced`.
- Yandex documentation states the `scope` response field is optional and is returned when OAuth provided a token with fewer rights than requested; therefore omission after an exact required-scope request may be represented as `full` **by provider-contract inference**, not by empirical L5 proof.
- A generic manually pasted token is `unknown` unless stronger evidence establishes its exact granted scope set.
- A successful read operation alone cannot upgrade `unknown` to full read/write/info capability.

Any operation must check the exact capability needed rather than treating `connected=true` as sufficient authority.

### 3.8 Expiry knowledge must be explicit

Current manual-token representation uses no known expiry. That must mean:

```text
expiryKnowledge = unknown
```

not:

```text
proven non-expiring
```

OAuth responses with a valid lifetime can produce `known-expires-at`. A future explicit provider guarantee could support another state, but absence of expiry evidence is not such a guarantee.

### 3.9 401 demotion must be exact-generation scoped

P1-196 already owns this rule. This tranche composes it with the same shared generation used by OAuth/manual/disconnect:

```text
request signed under auth A/gen 7
new auth B/gen 8 becomes current
late 401 for request A
```

must not clear or demote B.

A current-credential OAuth API 401 may demote the exact current auth record. A generic 403 is not blanket invalid-token authority. A 401 returned by a signed/public URL whose authorization semantics differ from the worker OAuth header is likewise not automatic authority to demote the global OAuth credential.

---

## 4. Fixed-redirect attempt identity

The correct adaptation of historical P1-178 is an explicit attempt receipt owned by the worker and returned to the initiating Options page:

```text
AuthAttemptReceipt {
  authAttemptId,          // worker-minted opaque id
  authGeneration,         // shared authorization-control generation
  clientId,
  codeVerifier,
  oauthState,
  requestedScopes,
  createdAt,
  expiresAt,
  transport: "yandex-verification-code-pkce-v1"
}
```

The Options page keeps only the non-secret `authAttemptId` in page memory and sends:

```text
WEBCLIP_YANDEX_FINISH_AUTH {
  authAttemptId,
  code
}
```

It must never receive `codeVerifier`, access token, refresh token, or other credential material.

If the page reloads and loses the attempt identity, the safe recovery is to start a new authorization attempt. A pasted code without an owning attempt id must not attach itself to the worker's arbitrary current pending slot.

---

## 5. Shared authorization-control generation

Do **not** create separate generation counters for P1-178, P1-191 and P1-196.

One monotonic authority generation owns user credential intent:

```text
OAuth start
manual-token replacement intent
disconnect
credential invalidation/demotion when exact-current
```

A useful abstract state is:

```text
AuthControlState {
  generation,
  pendingAttempt?,
  currentAuth?
}
```

with current credential:

```text
AuthRecord {
  authRecordId,
  authGeneration,
  source: "oauth" | "manual",
  accessToken,            // secret, never status DTO
  refreshToken?,          // secret
  clientId?,
  accountUid?,
  accountTruth,
  requestedScopes,
  grantedScopes?,
  capabilityTruth,
  expiryKnowledge,
  expiresAt?,
  provenAt
}
```

The generation belongs to authority selection, not merely storage revision.

---

## 6. Transition rules

### 6.1 Start OAuth

Worker:

1. validates Client ID and current settings prerequisites;
2. advances `authGeneration`;
3. creates fresh opaque `authAttemptId`, PKCE verifier/challenge and provider state;
4. writes exact pending receipt under the new generation;
5. returns authorization URL + `authAttemptId` to Options;
6. does not overwrite a still-proven current auth merely because a new attempt was started, unless canonical UX intentionally defines start as immediate detachment.

The last point separates **candidate intent** from **committed credential authority**. Starting B is enough to make an older pending A stale, but need not erase proven credential A before B succeeds.

### 6.2 Finish OAuth

Worker requires `authAttemptId` + code.

Before network:

```text
pending.authAttemptId == request.authAttemptId
pending.authGeneration == current generation
not expired
```

Capture the immutable pending receipt and exchange with its exact `clientId`, `codeVerifier`, fixed redirect and requested scopes.

After network, before any authoritative write or compare-remove cleanup, re-check:

```text
same generation
same pending attempt id
```

If stale, discard the result as non-authoritative. Do not delete the current pending attempt.

On current success, commit a fresh exact `authRecordId` at that generation, derive capability/expiry truth, and compare-remove only the exact matching pending attempt.

### 6.3 Manual token replacement

Manual replacement is another user auth intent in the same generation space.

1. advance/claim new generation and invalidate older pending attempt authority;
2. validate B privately without publishing B as current auth;
3. classify account/capability/expiry evidence;
4. if validation succeeds and generation is still current, commit B;
5. if validation fails or becomes evidence-unknown, do not clear last-proven A merely because B was attempted;
6. stale validation completion from B must not overwrite a newer C.

Whether an evidence-unknown manual token may be retained as an uncommitted candidate is an implementation choice; it is not current operation authority.

### 6.4 Disconnect

Disconnect advances the same generation and clears/detaches pending + current credential authority for new operations.

Any older OAuth finish, manual validation or 401 completion becomes stale by generation and cannot repopulate or mutate the new disconnected state.

### 6.5 Exact 401 demotion

Each OAuth-header request captures at minimum:

```text
authRecordId
authGeneration
```

A 401 may demote only if those values still identify current auth and the endpoint is classified as OAuth-credential-validity authority. Otherwise it is merely a factual failure of that request.

---

## 7. Returned `state` in this transport

Historical W5/P1-178 work assumed an automatic redirect callback could return and validate OAuth `state`. That assumption belongs to the historical callback transport and must not be copied mechanically.

In the current WebClip fixed verification-code UX, the extension receives a user-pasted authorization code, not the provider's final redirect URL. Therefore the extension does not directly observe the returned `state` parameter as callback evidence.

This tranche does **not** claim that unobserved returned state proves anything. The exact binding available to the token exchange is PKCE S256 plus the worker-held attempt receipt and its code verifier.

The request may continue sending `state` for provider/browser context and defense-in-depth where useful, but current WebClip authority cannot require equality with a value the extension never receives.

If the product later changes transport to expose the actual redirect response, state/issuer validation must be reconsidered under that new canonical transport.

---

## 8. Authorization-header ownership

Target helper contract:

```text
buildYandexHeaders(callerHeaders, exactAuth) {
  reject reserved names from callerHeaders
  copy permitted caller headers
  set Accept / Content-Type according to endpoint contract
  set Authorization from exactAuth LAST
}
```

Negative cases:

```text
caller Authorization
caller authorization (case variant)
caller duplicate/normalized reserved name
stale global auth replacing operation-captured auth
```

must fail closed or be stripped according to one canonical helper policy. Silent caller credential override is not acceptable.

Long operations covered by P0-074 must consume their immutable captured auth/account/root context rather than reread whichever global auth happens to be current midway through the effect.

---

## 9. Capability truth model

Minimal normalized shape:

```text
CapabilityTruth {
  state: "full" | "reduced" | "unknown",
  requestedScopes,
  grantedScopes?,
  basis
}
```

Examples:

```text
OAuth exact-required request + explicit exact/full response => full
OAuth exact-required request + provider-contract omitted scope => full-by-provider-contract
OAuth response explicit strict subset => reduced
manual token without exact grant evidence => unknown
read request success only => remains unknown for write/info
```

A UI may display connection separately from capability. It must not equate `connected` with full operational authority.

Provider documentation around scope delimiters/localizations is not treated as decisive here: currently observed Yandex documentation has examples/descriptions that can differ on delimiter presentation. The existing source's scope serialization is not changed by this research tranche. Exact provider acceptance belongs to controlled validation/L5 if it becomes material.

---

## 10. Expiry truth model

Minimal normalized shape:

```text
ExpiryTruth {
  state: "known-expires-at" | "unknown",
  expiresAt?
}
```

Rules:

- valid OAuth `expires_in` -> `known-expires-at`;
- absent/unsupported expiry evidence -> `unknown`;
- `expiresAt = 0` must not be described as provider-proven non-expiring;
- expiry timer/refresh logic must be generation-fenced before mutating current auth.

---

## 11. Account truth and validation failure

A token and the account identity learned from `/disk` or equivalent checks are separate evidence facts.

Useful states:

```text
accountTruth = proven | unknown
```

Transient account probe failure after a token exchange must not automatically be interpreted as proof that the token is invalid. At the same time, operations requiring an immutable `accountUid` cannot start while account truth is unknown.

This avoids the unsafe binary choice:

```text
network probe failed -> clear credential
```

versus

```text
network probe failed -> pretend account known
```

Recovery may revalidate the same exact auth record if it is still current.

---

## 12. Deterministic negative/recovery matrix

A future implementation/model must cover at minimum:

```text
W01 OAuth A start -> OAuth B start -> stale A cleanup cannot remove B
W02 OAuth A exchange -> B start -> A return cannot commit
W03 OAuth A exchange -> successful manual B -> A return cannot overwrite B
W04 OAuth A exchange -> disconnect -> A return cannot resurrect auth
W05 proven A -> invalid manual B -> A preserved
W06 proven A -> unknown/manual B validation -> A preserved as operation authority
W07 manual B succeeds -> old pending OAuth A cannot later commit
W08 finish without owning authAttemptId -> reject/restart
W09 page reload loses attempt id -> code cannot bind to arbitrary pending slot
W10 pending cleanup compare-removes exact attempt only
W11 expired pending attempt -> no exchange/commit
W12 OAuth exact required scopes + explicit full set -> capability full
W13 OAuth explicit subset -> capability reduced
W14 OAuth omitted scope after exact required request -> full-by-provider-contract, marked basis
W15 manual token with no grant evidence -> capability unknown
W16 read succeeds under unknown manual token -> write/info remain unproven
W17 OAuth known expires_in -> expiry known-expires-at
W18 manual/absent expiry -> expiry unknown
W19 stale 401 for A after B current -> B unchanged
W20 exact-current OAuth-header 401 -> exact auth may demote
W21 403 -> no blanket auth demotion
W22 signed/public-URL 401 -> no blanket OAuth auth demotion
W23 caller Authorization override -> rejected/stripped
W24 case-variant caller authorization -> rejected/stripped
W25 worker exact Authorization injected last
W26 disconnect advances same generation as OAuth/manual intent
W27 manual success uses same generation space as OAuth attempts
W28 current finish compare-checks generation after network
W29 status DTO excludes access token / refresh token / code verifier
W30 account probe transient failure -> account truth unknown, not fabricated invalid/full
W31 operation requiring account UID blocked while account truth unknown
W32 old storage settlement cannot defeat semantic generation CAS
W33 no returned-state equality is claimed when redirect response is unobserved
W34 fixed redirect remains exact canonical redirect
W35 no `identity` permission introduced
W36 no release readiness/S2 state mutation
```

---

## 13. External research cross-check

External sources constrain the design but do not override current WebClip requirements.

### Yandex confirmation-code flow

Yandex documents a two-step confirmation-code flow: receive a confirmation code from the user and exchange it for a token. It explicitly documents the use of `code_verifier` with PKCE and says the secret key is not required when PKCE/code verifier is used. This is compatible with WebClip's public-client/no-embedded-secret requirement.

Sources:

- https://yandex.com/dev/id/doc/en/codes/code-and-token
- https://yandex.com/dev/id/doc/en/codes/screen-code
- https://yandex.com/dev/id/doc/en/codes/code-url

Yandex's manual-token documentation also uses `https://oauth.yandex.ru/verification_code` as a registered Redirect URI in its manual flow. That is supportive comparison evidence; WebClip's exact fixed-redirect requirement remains canonical independently.

Source:

- https://yandex.com/dev/id/doc/en/tokens/debug-token

### Yandex scope response semantics

Yandex documents `scope` in the token response as optional and returned when OAuth granted fewer rights than requested. This supports the proposed `full-by-provider-contract` basis when WebClip requests exactly the required set and the provider omits the smaller-rights field. It remains provider-contract interpretation until current integration evidence exercises it.

Source:

- https://yandex.com/dev/id/doc/en/codes/screen-code

### OAuth security BCP

RFC 9700 requires public clients using Authorization Code to use PKCE to prevent authorization-code injection/misuse. This supports retaining PKCE as mandatory in the fixed-redirect flow.

Source:

- https://www.rfc-editor.org/rfc/rfc9700.html

### Chrome Identity comparison

Chrome documents `getRedirectURL()` as producing `https://<app-id>.chromiumapp.org/*` and `launchWebAuthFlow()` as completing when the provider redirects there. That makes the historical W5 transport technically plausible, but it conflicts with current WebClip product authority and is therefore only an alternative architecture comparison.

Source:

- https://developer.chrome.com/docs/extensions/reference/api/identity

---

## 14. Source-spec target for future implementation

A future W5 production tranche should introduce one cohesive auth-control module/helper layer rather than distributing generation checks across unrelated handlers.

Minimum source responsibilities:

```text
mint/advance shared auth generation
mint authAttemptId
persist/recover exact pending attempt without exposing verifier
finish exact attempt with post-network currentness check
private manual candidate validation
compare-and-commit exact auth record
compare-and-remove exact pending attempt
disconnect generation advance
exact-generation 401 demotion helper
capability/expiry/account truth normalization
reserved-header sanitizer + exact Authorization injection
status DTO redaction/truth projection
immutable operation auth-context capture for P0-074 consumers
```

The implementation should preserve existing durable/storage-deadline defenses rather than replacing them with generation checks; storage settlement and semantic authority fencing solve different problems.

---

## 15. Evidence boundary

This tranche is L2/current-source architecture evidence only.

It does **not** claim:

- production W5 implementation;
- real Yandex provider behavior beyond documented contract;
- current Chrome unpacked-extension closure;
- provider-specific L5 object/revision semantics;
- that scope delimiter ambiguity has been physically resolved;
- release readiness;
- P-owner closure;
- S2 authorization.

No temporary or permanent workflow is added by this tranche.

---

## 16. Decision

For current exact baseline:

```text
main                                    = 1529b174a99e7029db23c3e39b0548fc299b9ff5
current auth transport                  = fixed Yandex verification-code redirect + PKCE S256
historical chrome.identity transport    = REJECTED for current requirements
authAttemptId                           = REQUIRED
shared authorization generation         = REQUIRED
post-network generation recheck         = REQUIRED
manual validate-before-commit           = REQUIRED
failed/unknown manual replacement       = PRESERVE LAST PROVEN AUTH
disconnect generation invalidation      = REQUIRED
exact-generation 401 demotion           = REQUIRED
caller Authorization override           = FORBIDDEN
capability truth                         = full | reduced | unknown
expiry truth                             = known-expires-at | unknown
returned state in current pasted-code UX = NOT OBSERVED AUTHORITY
real Yandex L5                          = DEFERRED
new P-code                              = NO
S2                                      = NOT AUTHORIZED
release readiness                       = UNCHANGED / NOT READY
```

The next useful dependency-ordered research edge after this refinement is the composition of exact `authRecordId/authGeneration/accountUid/capability` into the immutable P0-074/C0 operation context and C1 remote-effect admission, still without provider L5 or release-policy activation.