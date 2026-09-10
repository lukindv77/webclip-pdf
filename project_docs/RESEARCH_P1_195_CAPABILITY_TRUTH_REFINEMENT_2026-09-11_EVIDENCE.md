# WebClip — P1-195 Yandex capability-truth refinement — 2026-09-11

Date: 2026-09-11  
Canonical baseline: `main = 03859ff9a16078994b1ecfe45edbc2a6ada63fad`  
Mode: **RESEARCH-ONLY / CURRENT-MAIN ABSORPTION REVIEW**  
Production/runtime modification: **NONE**  
Real Chrome/Yandex L5: **NOT RUN**  
Release-policy activation: **NONE**  
New P-code: **NO**

This tranche continues existing ACTIVE **P1-195** after canonical P1-178 and P1-196 refinements. It selectively revalidates the historical Yandex capability-truth contract against current canonical source and fresh external provider/OAuth documentation. Historical research is provenance, not current implementation evidence, and no old branch is imported wholesale.

## 1. Canonical ownership

Current Registry authority remains:

```text
P1-195  Yandex capability truth: token presence/read success is not proof of all required Disk scopes; requested/granted/reduced/unknown capability states stay distinct.
```

Composition boundaries:

```text
P1-178 = one shared auth-attempt/settings generation and commit authority
P1-196 = auth validity / exact-generation invalidation using that generation
P1-195 = Yandex Disk capability truth and operation-specific capability admission
P1-191 = manual-token candidate validation/replacement policy
P1-138 = observation versus provisioning/mutation authority
P0-074 = immutable operation-scoped Yandex context
P1-210 = truthful partial/unknown external-effect settlement
```

P1-195 does not create another auth-generation counter, does not own invalid-token demotion, and does not absorb hidden-provisioning ownership from P1-138.

## 2. Historical provenance retained selectively

The 2026-09-07 P1-195 research correctly established these durable ideas:

- requested, granted/proven, observed and operation-required capabilities are different facts;
- a manual token without exact request/provider scope receipt remains capability `unknown`;
- one successful read does not prove the full Disk read/write/info union;
- capability evidence belongs to one exact auth generation;
- an explicit reduced provider response must never fall back to the originally requested full set;
- operation admission must use the permissions required by the whole workflow, not a binary `connected` flag;
- `403`/resource denial and P1-196 invalid-auth demotion are separate classifications.

One historical statement is superseded by current canonical source: the old text described `testYandexConnection()` as a pure Disk-info read separated from provisioning. Current `main` shows that after the Disk-info read, the same command can call `ensureYandexServiceFolders(...)` when a root path exists. Canonical P1-138 already owns that observation/mutation split. This refinement records the correction rather than perpetuating the stale historical statement.

## 3. Current-main source census

Current source declares the requested baseline set:

```text
YANDEX_SCOPES = [
  cloud_api:disk.read,
  cloud_api:disk.write,
  cloud_api:disk.info
]
```

`startYandexOAuth(...)` sends the current global set as required `scope`:

```text
url.searchParams.set('scope', YANDEX_SCOPES.join(' '))
```

This is requested capability, not by itself a receipt of what the eventual token was actually granted.

## 4. PKCE completion currently collapses two evidence kinds

Current `finishYandexOAuth(...)` stores:

```text
scope = token.scope || YANDEX_SCOPES.join(' ')
```

Those branches have different provenance:

```text
provider returned token.scope
    = explicit provider response evidence

provider omitted token.scope
    = only inferable through the exact request receipt + provider contract
```

The resulting single string does not preserve which evidence path produced it. A future capability receipt therefore needs an evidence kind and exact P1-178 attempt/generation binding. It must not reconstruct request provenance later from a mutable global `YANDEX_SCOPES` constant.

## 5. Fresh provider recheck: Yandex OAuth scope semantics

Official Yandex OAuth documentation reviewed on 2026-09-11:

- `https://yandex.ru/dev/id/doc/ru/codes/screen-code-oauth`
- `https://yandex.com/dev/id/doc/en/codes/screen-code-oauth`
- `https://yandex.com/dev/id/doc/en/register-client`
- `https://yandex.com/dev/id/doc/en/concepts/ya-oauth-intro`

Relevant provider observations:

1. the authorization request `scope` is the list of permissions requested by the application;
2. Yandex describes an OAuth token as carrying account identity, application identity and a set of permissions/actions available to the application;
3. the token response `scope` field is optional and is returned when OAuth issued a token with a **smaller permission set than requested**;
4. Yandex also documents that users can revoke granted permissions, invalidating the token;
5. token lifetime can depend on requested permissions.

These facts support explicit capability provenance. They do not make a manual/imported token with no request receipt equivalent to a PKCE token whose exact request is known.

## 6. Standards cross-check: RFC 6749

OAuth 2.0 RFC 6749 section 3.3 was rechecked on 2026-09-11:

- `https://www.rfc-editor.org/rfc/rfc6749.html`

It states that an authorization server can fully or partially ignore requested scope, and if the issued scope differs from the requested scope, the response must communicate the actual granted scope. It also specifies that access-token response `scope` is optional when identical to what was requested and required when different.

For WebClip/Yandex this supports the provider-specific inference only under an exact receipt:

```text
PKCE exact required-only request R
+ response belongs to R
+ response scope present
    -> use provider response scope

PKCE exact required-only request R
+ response belongs to R
+ response scope omitted
+ current Yandex contract says smaller grants are reported in scope
    -> exact requested set may be inferred for R

no exact request provenance
    -> capability unknown
```

The inference is provenance-bound; it is not a global rule that every token lacking a scope field has all current WebClip permissions.

## 7. Standards cross-check: RFC 9700

OAuth 2.0 Security Best Current Practice RFC 9700 section 2.3 was rechecked on 2026-09-11:

- `https://www.rfc-editor.org/rfc/rfc9700.html`

It recommends restricting access-token privileges to the minimum needed by the application/use case. This is comparison evidence supporting operation-specific capability admission and least-privilege reasoning. It does not define Yandex Disk endpoint error mapping and is not used as provider-specific proof.

## 8. Yandex Disk API boundary

Official Yandex Disk REST material reviewed on 2026-09-11:

- `https://yandex.com/dev/disk/rest/`
- `https://yandex.ru/dev/disk/rest/`

The Disk REST API uses OAuth access tokens for user data operations. Current Yandex materials also enumerate Disk access rights such as `cloud_api:disk.read`, `cloud_api:disk.write` and `cloud_api:disk.info` in Yandex API permission contexts.

This supports preserving scope-specific capability truth. It does not prove that one successful Disk endpoint is authoritative evidence for every other Disk permission.

## 9. Manual token boundary

Current `setManualYandexToken(...)` stores:

```text
source = manual
scope = ''
expiresAt = 0
```

There is no exact authorization-request receipt proving which app/scopes produced the pasted token. Therefore:

```text
manual token present
!= full capability receipt
```

A successful provider operation can record only the narrow observation actually established by that operation and its endpoint contract. It cannot retroactively invent the full requested set.

P1-191 still owns whether a manual candidate is allowed to replace current auth. P1-178 owns generation-safe commit. P1-196 owns validity. P1-195 owns capability meaning.

## 10. Current status exposes requested scopes as if they were current token truth

Current `getYandexStatus()` returns:

```text
connected = Boolean(yandexAuth?.accessToken)
scopes = YANDEX_SCOPES
```

This means the status surface publishes the configured/requested global set even when:

- the provider returned a reduced explicit `scope`;
- a manual token has `scope = ''`;
- capability provenance is otherwise unknown.

Target status must distinguish concepts equivalent to:

```text
authPresent
authValidity
requestedScopes
capabilityState = full | reduced | unknown
provenScopes / grantedScopes
observedCapabilities
capabilityEvidence
```

A compatibility `scopes` field may remain only if its semantics are explicit and it is not presented or consumed as granted truth.

## 11. Connection test correction and P1-138 composition

Current `testYandexConnection()` first performs:

```text
const info = await yandexApi('')
```

but then, if `rootPath` exists, can execute:

```text
ensureYandexServiceFolders({
  includeUpload: true,
  includeReadLater: true,
  includeBackup: true
})
```

Canonical P1-138 already proves that connection observation and provisioning truth are separate and that service-folder ensure is mutation authority.

Therefore P1-195 must not use the composite command as a hidden capability probe that upgrades the token to `full` merely because the overall command returned success. The truthful decomposition is conceptually:

```text
ConnectionObservation
ProvisioningResult?
CapabilityObservations[]
```

Each observation retains the exact auth generation and operation/endpoint provenance that produced it. P1-138 continues to own the mutation boundary itself.

## 12. Requested, granted, observed and required remain separate

### Requested scopes

The exact set one OAuth attempt asked Yandex to grant.

### Granted/proven scopes

The set proven by provider response plus exact request provenance.

### Observed capabilities

Narrow evidence from successful provider operations where no complete grant receipt exists. Observation does not automatically become proof of unrelated permissions.

### Operation-required scopes

The permissions needed by one complete WebClip workflow, including mandatory reconciliation/readback stages.

These four concepts must not collapse into one `YANDEX_SCOPES` array or one `connected` boolean.

## 13. Capability receipt shape

A minimal conceptual record is:

```text
YandexCapabilityReceipt {
  authRecordId,
  authGeneration,
  requestedScopes,
  grantedScopes,
  observedCapabilities,
  state: full | reduced | unknown,
  evidenceKind:
    provider-response-scope |
    provider-contract-exact-request |
    manual-token-no-scope-receipt |
    observed-operation
}
```

Exact implementation field names are not prescribed here. Required properties are:

- exact P1-178 auth-generation binding;
- no secret token value in durable/loggable metadata;
- explicit evidence provenance;
- no static promotion from token presence;
- no static promotion from one read/provisioning result;
- stale receipt from generation A cannot authorize generation B.

## 14. Operation-specific admission

Conceptually:

```text
admitYandexOperation(requiredScopes, capabilityReceipt, currentAuthGeneration)
```

### Proven sufficient

All required permissions are proven for the exact current auth generation:

```text
admit
```

### Proven missing

At least one required permission is known absent:

```text
reject locally
zero new remote side-effect admission
report missing capability truthfully
```

### Unknown

The product must not claim capability-proven readiness. A bounded explicit user operation may still be governed by product policy, but it remains an ordinary operation under P0-074/P1-210; it must not be converted into a hidden remote mutation merely to probe write permission.

## 15. Workflow scope is not only the first request

A multi-stage workflow may require a union such as:

```text
write/move/upload child effect
-> read exact remote metadata for reconciliation
-> optional publication/readback under separate policy
```

Capability admission must account for mandatory stages. Proof for the first HTTP request alone is not proof for the full workflow.

## 16. Generation race

Schedule:

```text
capability receipt A/G says full
B becomes current at G+1
late operation/status using receipt A returns
```

Required:

```text
receipt A cannot authorize B
receipt A cannot downgrade B
receipt A cannot rewrite B capability truth
```

The same P1-178 generation used by P1-196 validity fencing should bind P1-195 capability receipts. No parallel capability generation is needed unless implementation later proves a separate non-auth lifecycle requirement.

## 17. 401 / 403 boundary after canonical P1-196

Canonical P1-196 now owns exact-generation invalid-auth demotion semantics.

P1-195 retains this distinction:

```text
authoritative OAuth-bound invalid-auth evidence
    -> P1-196 candidate transition

403 / permission/resource denial
    -> capability/resource classification, not blanket auth clear
```

Public material reviewed here does not establish a complete Yandex Disk-specific error mapping sufficient to broaden automatic classification. Real Yandex L5 remains required before provider-specific closure.

## 18. Deterministic model requirements

The companion model must prove at least:

```text
N01 P1-195 remains ACTIVE
N02 exact current YANDEX_SCOPES set is still requested
N03 exact PKCE request sends that set
N04 current completion stores token.scope or requested fallback without evidence-kind field
N05 current manual token stores empty scope
N06 current status publishes static requested scopes
N07 current status uses token presence for connected
N08 current testYandexConnection performs Disk-info read
N09 current testYandexConnection can also provision service folders
N10 historical pure-read wording is explicitly superseded
N11 explicit reduced response never falls back to requested full set
N12 exact required-only PKCE + omitted response scope can infer requested set only with exact receipt
N13 missing exact request provenance -> unknown
N14 manual token -> unknown
N15 one info observation does not prove write
N16 reduced receipt can admit a narrower proven read operation
N17 reduced receipt cannot admit known-missing write
N18 stale generation cannot admit
N19 requested set is not granted set when provider response is reduced
N20 401 classification remains P1-196-owned
N21 403 does not become blanket invalid-auth demotion
N22 connection observation and provisioning result remain separate
N23 provisioning success does not itself fabricate full capability receipt
N24 P1-138 remains hidden-provisioning/mutation owner
N25 P1-178 remains shared generation owner
N26 P1-196 remains validity owner
N27 P1-191 remains manual replacement owner
N28 no token secret enters capability receipt
N29 manifest remains 0.9.8
N30 no runtime/L5/S2/release action
```

## 19. Acceptance contract

P1-195 refinement research is complete when deterministic evidence proves:

1. current source and historical provider semantics are both represented without conflation;
2. requested, granted/proven, observed and operation-required capabilities remain distinct;
3. explicit reduced provider scope is never replaced by the requested full set;
4. omitted response scope is inferable only from exact request/generation provenance plus the current Yandex contract;
5. manual token without request receipt remains capability unknown;
6. status cannot present static requested scopes as exact current-token granted truth;
7. operation admission consumes exact current-generation capability evidence;
8. a whole workflow's mandatory permission union is considered;
9. connection observation and service-folder provisioning stay separate under P1-138;
10. P1-196 owns invalid-auth demotion and generic 403 is not blanket invalidation;
11. P1-178/P1-191/P1-138/P0-074/P1-210 boundaries remain intact;
12. capability receipts contain no access-token secret;
13. no new P-code is allocated;
14. runtime remains unchanged;
15. no real Yandex L5, release-policy activation, readiness mutation, official ZIP, tag, Release or deployment occurs.

## 20. Boundary

```text
P1-195 capability refinement != runtime implementation
runtime implementation != real Yandex qualification
real Yandex qualification != P1-231 S2 activation
P1-231 S2 activation != release readiness
```

V1 readiness and release authority remain untouched.