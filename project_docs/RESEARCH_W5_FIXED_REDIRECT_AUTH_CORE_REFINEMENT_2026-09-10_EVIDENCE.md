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

The research target is narrower: make the existing two-step fixed-redirect flow safe under multiple Options pages, repeated auth starts, manual-token replacement, disconnect, worker restarts, late token-exchange settlement, future 401 demotion, capability ambiguity, and caller-controlled request headers.

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

Existing owners are sufficient; no new root cause is allocated:

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

Therefore the historical Chrome Identity transport is rejected for the current product while its useful generation/capability invariants remain candidates for selective adoption.

---

## 3. Fresh current-source findings

### 3.1 OAuth pending state is one mutable global slot

Current worker keeps a single `yandexOAuthPending` receipt with values such as:

```text
clientId
codeVerifier
state
createdAt
expiresAt
```

but no durable/opaque `authAttemptId` and no shared authorization generation.

`WEBCLIP_YANDEX_FINISH_AUTH` receives only the pasted code. `options.js` likewise sends only the code when finishing authorization.

Therefore this schedule is not exactly bound by the current protocol:

```text
Options page A starts auth A
Options page B starts auth B
page A later pastes a code
```

The worker interprets the code against whichever global pending object is current at finish time. This is the concrete P1-178/P1-191 composition gap for the fixed-redirect transport.

### 3.2 Storage settlement serialization is not semantic generation CAS

Current `yandexAuthStorageSettlementChain` serializes storage operations and late storage settlement. That helps prevent raw storage races, but it does not prove a long OAuth/network operation remains current.

A stale token exchange can finish after a newer user intent. Correctness therefore requires an authority comparison before commit, not only ordered storage writes afterward.

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

With last-proven credential A:

```text
proven A
-> user proposes manual candidate B
-> B validation fails or becomes evidence-unknown
```

A must remain authoritative. Candidate B is not authority until privately validated and committed through the same generation fence.

### 3.5 Disconnect needs to invalidate in-flight authority

Current disconnect removes current auth/pending state, but without a shared generation an older in-flight finish can later settle and repopulate auth.

Disconnect therefore must advance the same authorization-control generation as OAuth start and manual replacement. Existing external operations that already started under an immutable captured auth/account context are reconciled factually; disconnect must not restore a global credential merely to explain their settlement.

### 3.6 Caller headers can override worker-owned Authorization

Current Yandex request header composition places the worker's OAuth header before caller-provided `options.headers`. Because the later object spread wins, a caller `Authorization` member can replace worker-owned credential selection.

For the worker Yandex adapter, `Authorization` is a reserved control-plane header. A caller must not be able to select or replace the credential through a generic headers object.

Target rule:

```text
reject/strip caller Authorization
then inject exact worker-owned Authorization last
```

The same reasoning applies to other security-sensitive headers if a later research review classifies them as worker authority.

### 3.7 Token presence is not full capability truth

Current connection/token presence does not prove every required Disk permission. Existing P1-195 already owns this distinction.

Required capability state:

```text
full
reduced
unknown
```

Interpretation carried by this research model:

- OAuth requests the exact required scope set.
- Explicit smaller returned scope set -> `reduced`.
- Yandex documents `scope` as optional and returned when OAuth grants fewer rights than requested; omission after an exact required-scope request may therefore be represented as `full` **by provider-contract inference**, not by empirical L5 proof.
- Generic manually pasted token -> `unknown` unless stronger evidence establishes exact grants.
- Successful read alone cannot upgrade `unknown` to full read/write/info capability.

Operations must check the exact capability needed rather than equating `connected=true` with full authority.

### 3.8 Expiry knowledge must be explicit

Manual-token representation with no known expiry means:

```text
expiryKnowledge = unknown
```

not provider-proven non-expiring. A valid OAuth `expires_in` can produce `known-expires-at`.

### 3.9 401 demotion must be exact-generation scoped

P1-196 already owns this rule. This tranche composes it with the same shared generation used by OAuth/manual/disconnect:

```text
request signed under auth A/gen 7
new auth B/gen 8 becomes current
late 401 for request A
```

must not clear or demote B.

A current-credential OAuth API 401 may demote the exact current auth record. Generic 403 is not blanket invalid-token authority. A 401 from a signed/public URL with different authorization semantics is likewise not automatic authority to demote global OAuth auth.

---

## 4. Fixed-redirect attempt identity

Adapt P1-178 to an explicit worker-owned attempt receipt:

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

Options receives only the non-secret `authAttemptId` and authorization URL. Finish becomes:

```text
WEBCLIP_YANDEX_FINISH_AUTH {
  authAttemptId,
  code
}
```

Options must never receive `codeVerifier`, access token or refresh token.

If the page reloads and loses attempt identity, the safe recovery is a new auth attempt. A pasted code without an owning attempt id must not attach to an arbitrary current pending slot.

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

Abstract state:

```text
AuthControlState {
  generation,
  pendingAttempt?,
  currentAuth?
}
```

Credential record:

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

1. validates Client ID/settings prerequisites;
2. advances `authGeneration`;
3. mints `authAttemptId`, PKCE verifier/challenge and provider state;
4. writes the exact pending receipt under the new generation;
5. returns authorization URL + `authAttemptId` to Options;
6. does not erase a still-proven current credential merely because candidate B was started.

Starting B makes older pending A stale, but candidate intent is distinct from committed credential authority.

### 6.2 Finish OAuth

Before network:

```text
pending.authAttemptId == request.authAttemptId
pending.authGeneration == current generation
not expired
```

Capture the immutable pending receipt and exchange with its exact `clientId`, `codeVerifier`, fixed redirect and requested scopes.

After network, before any authoritative write or cleanup, re-check:

```text
same generation
same pending attempt id
```

If stale, discard the result and do not delete the current pending attempt. On current success, commit a fresh exact `authRecordId`, derive capability/expiry truth, then compare-remove only the exact matching pending attempt.

### 6.3 Manual token replacement

Manual replacement is another auth intent in the same generation space:

1. claim/advance generation and invalidate older pending attempt authority;
2. validate B privately without publishing B as current;
3. classify account/capability/expiry evidence;
4. current successful B -> commit;
5. invalid/evidence-unknown B -> preserve last-proven A;
6. stale B completion -> cannot overwrite newer C.

### 6.4 Disconnect

Disconnect advances the same generation and clears/detaches pending + current credential authority for new operations. Older OAuth finish, manual validation or 401 completion then becomes stale and cannot repopulate the disconnected state.

### 6.5 Exact 401 demotion

Each OAuth-header request captures at minimum:

```text
authRecordId
authGeneration
```

A 401 may demote only if those values still identify current auth and the endpoint is classified as OAuth-credential-validity authority.

---

## 7. Returned `state` in this transport

Historical W5/P1-178 assumed an automatic callback transport that could receive and validate returned OAuth `state`. Current WebClip fixed verification-code UX instead receives a user-pasted authorization code, not the final redirect URL.

Therefore current WebClip does not directly observe returned `state` as callback evidence. This tranche does **not** claim equality for an unobserved value. The exact binding available to token exchange is PKCE S256 plus the worker-held attempt receipt and its code verifier.

The authorization request may still send `state` as provider/browser context and defense-in-depth, but current authority cannot depend on equality with a value the extension never receives. A future transport that exposes the redirect response would require separate state/issuer validation design.

---

## 8. Authorization-header ownership

Target helper contract:

```text
buildYandexHeaders(callerHeaders, exactAuth) {
  reject reserved names from callerHeaders
  copy permitted caller headers
  set endpoint headers
  set Authorization from exactAuth LAST
}
```

Negative cases include caller `Authorization`, case variants, normalized duplicates and stale global auth replacing operation-captured auth. Long P0-074 operations consume their immutable captured auth/account/root context rather than rereading current global auth midway through an effect.

---

## 9. Capability, expiry and account truth

Capability shape:

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
OAuth explicit full set => full
OAuth explicit strict subset => reduced
OAuth exact-required request + provider-contract omitted scope => full-by-provider-contract
manual token without exact grant evidence => unknown
read success only => remains unknown for write/info
```

Expiry shape:

```text
ExpiryTruth {
  state: "known-expires-at" | "unknown",
  expiresAt?
}
```

Valid OAuth `expires_in` -> known. Missing/unsupported expiry evidence -> unknown. `expiresAt=0` is not proof of non-expiry.

Account truth is separate:

```text
accountTruth = proven | unknown
```

Transient account probe failure must not fabricate invalid-token truth or known account identity. Operations requiring immutable `accountUid` fail closed while account truth is unknown; the same current auth record may later be revalidated.

---

## 10. Deterministic negative/recovery matrix

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
W30 account probe transient failure -> account truth unknown
W31 account-bound operation blocked while account truth unknown
W32 storage settlement ordering cannot defeat semantic generation CAS
W33 no returned-state equality is claimed when redirect response is unobserved
W34 fixed redirect remains exact canonical redirect
W35 no identity permission introduced
W36 no release readiness/S2 state mutation
```

---

## 11. External research cross-check

External sources constrain the design but do not override WebClip requirements.

Yandex documents the two-step confirmation-code flow: receive a confirmation code from the user, then exchange it for a token. Its code-flow documentation supports PKCE with `code_verifier`; when PKCE is used the client secret need not be supplied. This matches WebClip's public-client/no-embedded-secret requirement.

Sources:

- https://yandex.com/dev/id/doc/en/codes/code-and-token
- https://yandex.com/dev/id/doc/en/codes/screen-code
- https://yandex.com/dev/id/doc/en/codes/code-url
- https://yandex.com/dev/id/doc/en/tokens/debug-token

Yandex documents token-response `scope` as optional and associated with reduced grants. The proposed `full-by-provider-contract` basis is therefore an interpretation of documented provider contract, not empirical L5 proof.

RFC 9700 requires public clients using Authorization Code to use PKCE to prevent authorization-code injection/misuse.

Source:

- https://www.rfc-editor.org/rfc/rfc9700.html

Chrome documents `getRedirectURL()` as producing `https://<app-id>.chromiumapp.org/*` and `launchWebAuthFlow()` as completing on that redirect. This makes historical W5 transport technically plausible, but it conflicts with current WebClip product authority and remains only an alternative architecture comparison.

Source:

- https://developer.chrome.com/docs/extensions/reference/api/identity

Provider documentation around scope delimiters/localizations is not treated as decisive here. Existing source scope serialization is not changed by this tranche; exact provider acceptance remains a controlled-validation/L5 concern if material.

---

## 12. Source-spec target for future implementation

A future W5 production tranche should introduce one cohesive auth-control helper layer with responsibilities for:

```text
mint/advance shared auth generation
mint authAttemptId
persist/recover exact pending attempt without exposing verifier
finish exact attempt with post-network currentness check
private manual candidate validation
compare-and-commit exact auth record
compare-and-remove exact pending attempt
disconnect generation advance
exact-generation 401 demotion
capability/expiry/account truth normalization
reserved-header sanitizer + exact Authorization injection
status DTO redaction/truth projection
immutable operation auth-context capture for P0-074 consumers
```

Existing durable/storage-deadline defenses remain valuable; storage settlement and semantic authority fencing solve different problems.

---

## 13. Evidence boundary

This tranche is L2/current-source architecture evidence only. It does **not** claim production W5 implementation, real Yandex provider behavior beyond documented contract, current unpacked-extension closure, provider L5 object/revision semantics, release readiness, P-owner closure or S2 authorization.

No temporary or permanent workflow is added by this tranche.

---

## 14. Decision

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

The next useful dependency-ordered research edge is composition of exact `authRecordId/authGeneration/accountUid/capability` into the immutable P0-074/C0 operation context and C1 remote-effect admission, still without provider L5 or release-policy activation.