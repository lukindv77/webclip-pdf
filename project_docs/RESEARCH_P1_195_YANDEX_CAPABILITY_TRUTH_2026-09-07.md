# P1-195 — Yandex OAuth / Disk capability truth — 2026-09-07

Date: 2026-09-07  
Canonical baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical `service-worker.js` Git blob: `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`  
Working branch: `research/p1-195-yandex-capability-truth-2026-09-07`  
Owner: **P1-195 ACTIVE**.

Research/model only. Production runtime, `manifest.json`, Registry status, version and release state are unchanged.

## 1. Canonical owner

Registry wording:

> Yandex capability truth: token presence/read success is not proof of all required Disk scopes; requested/granted/reduced/unknown capability states stay distinct.

P1-195 owns capability truth and operation-specific scope admission. It composes with, but does not replace:

- **P1-178** — exact auth-attempt/settings generation;
- **P1-191** — manual-token replacement validation before generation-CAS commit;
- **P1-196** — exact-generation invalid-token/401 demotion;
- **P0-074** — immutable Yandex operation context;
- **P1-138** — read-like Yandex flows must not hide provisioning/mutation;
- **P1-210** — partial/unknown mutation result truthfulness.

## 2. Fresh source proof

Canonical source currently declares:

```text
YANDEX_SCOPES = [
  cloud_api:disk.read,
  cloud_api:disk.write,
  cloud_api:disk.info
]
```

The PKCE authorization URL sends those values through required `scope` separated by spaces.

Current PKCE completion stores:

```text
scope = token.scope || YANDEX_SCOPES.join(' ')
```

Current manual-token state instead stores:

```text
source = manual
scope = ''
expiresAt = 0
```

Current `getYandexStatus()` reports:

```text
connected = Boolean(accessToken)
scopes = YANDEX_SCOPES
```

The returned `scopes` therefore describe what WebClip wants/requested, not necessarily what the current exact token is proven to possess.

Current `testYandexConnection()` begins with an ordinary Disk-info read (`yandexApi('')`). A successful account/info read is useful validity/account evidence, but it is not proof of the full read+write+info capability union required by all WebClip Yandex workflows.

## 3. Existing historical evidence

The consolidated Yandex auth/config research family already preserved the original P1-195 discovery:

- token possession was being conflated with full capability readiness;
- PKCE response scope was persisted but not used for later operation admission;
- manual token had no scope provenance;
- read/diagnostic operations must not silently become provisioning tests.

This branch does not create a new owner. It turns that historical finding into a current source-bound model/gate against the present baseline.

## 4. Current provider contract — Yandex OAuth

Official Yandex OAuth documentation checked on 2026-09-07:

- https://yandex.ru/dev/id/doc/ru/concepts/ya-oauth-intro
- https://yandex.ru/dev/id/doc/ru/codes/screen-code-oauth
- https://yandex.com/dev/id/doc/en/codes/screen-code-oauth
- https://yandex.ru/dev/id/doc/ru/concepts/glossary

Provider facts relevant to P1-195:

1. a Yandex OAuth token carries an account identity, application identity and set of permissions;
2. `scope` in the authorization request is a space-separated list of required rights;
3. `optional_scope` is a separate mechanism for rights the user may selectively decline;
4. the token response may include `scope`;
5. current Yandex documentation explicitly says the response `scope` field is optional and is returned when OAuth issued a token with a smaller permission set than requested;
6. a token therefore cannot be treated as an unqualified binary `connected = ready for everything` capability.

## 5. Important provider-specific correction: missing response `scope` is not always unknown

A generic OAuth design might classify a missing token-response scope as unknown. That is too coarse for the current WebClip/Yandex flow.

Current WebClip sends all three Disk rights in required `scope` and does **not** use `optional_scope`.

For an exact P1-178-bound PKCE attempt, if:

- the exact authorization request receipt proves the required scope set;
- the token response belongs to that exact attempt/generation;
- Yandex omits response `scope` under its documented rule that the field appears when a smaller set is issued;

then WebClip may infer the exact requested required set for that receipt.

This inference MUST NOT be detached from the exact auth attempt and reused for a manual/imported/older token.

Therefore target semantics are:

### PKCE + explicit response scope

```text
grant evidence = provider response scope
```

If required WebClip rights are missing, capability state is `reduced`.

### PKCE + omitted response scope + exact required-only request receipt

```text
grant evidence = provider-contract inference from the exact request
```

This may produce `full` for the current requested set.

### Missing exact request provenance

```text
capability = unknown
```

Do not invent the requested set after the fact from a mutable global constant.

## 6. Manual-token boundary

A pasted manual token is fundamentally different.

Current source stores `scope: ''`, and there is no exact authorization-request receipt proving which client/scopes produced the token.

A successful Disk-info request can prove only that the exact candidate token was accepted for that diagnostic request and can expose account metadata. It cannot truthfully promote the token to the full read/write/info set.

Target state after manual validation therefore remains conceptually:

```text
auth validity = provider-accepted for the validation request
capability state = unknown
observed capability = only what the successful endpoint actually proves
```

P1-191 still owns whether the candidate may replace the previous auth generation.

P1-195 only says that successful replacement does not fabricate scope evidence.

## 7. Requested, granted, observed and required are different sets

The runtime needs to keep four concepts distinct.

### Requested scopes

What one exact OAuth attempt asked Yandex to grant.

### Granted/proven scopes

What provider response + exact request provenance proves for the current auth generation.

### Observed capabilities

Narrow evidence from successful provider operations when no full grant receipt exists. An info read can prove an info-read capability without proving write.

### Operation-required scopes

The capabilities required by one complete WebClip workflow, including its reconciliation stages.

These sets must not collapse into one static `YANDEX_SCOPES` field.

## 8. Capability state

A minimal conceptual state is:

```text
YandexCapabilityReceipt {
  authGeneration,
  requestedScopes,
  grantedScopes,
  observedScopes,
  state: full | reduced | unknown,
  evidence: provider-response-scope |
            provider-contract-exact-request |
            manual-token-no-scope-receipt |
            observed-operation
}
```

Exact field names are implementation details.

The critical properties are:

- generation-bound;
- provider/request provenance-bound;
- distinguish full/reduced/unknown;
- no static promotion from token presence;
- no static promotion from one read success.

## 9. Operation-specific admission

Capability truth must be consumed by operations, not only displayed in Settings.

Conceptually:

```text
admit(requiredScopes, currentCapabilityReceipt)
```

### Proven sufficient

All operation-required scopes are proven in the exact current auth generation.

```text
admit
```

### Proven missing

At least one required scope is known absent.

```text
reject locally
zero remote side-effect admission
report missing capability
```

### Unknown

The operation must not be described as capability-proven.

For a read-only diagnostic, WebClip may perform a bounded read and record only the capability actually observed.

For a mutating workflow, WebClip must not create a hidden remote mutation merely as a "write permission test". If the product chooses to let the explicit user mutation itself proceed under unknown capability, the result remains an ordinary exact operation outcome governed by P0-074/P1-210; a timeout/unknown settlement is not a safe capability probe.

The UI must still say capability is unverified before that operation.

## 10. Workflow requirement is more than the first HTTP method

Scope admission should consider the whole workflow.

Example pattern:

```text
create/upload/move effect
-> read exact remote metadata for reconciliation
-> optional publication/readback
```

A workflow may therefore require the union of permissions used by its effect and required reconciliation path.

P1-195 should not authorize a multi-stage workflow merely because the first request's narrow permission is present.

## 11. Status semantics

Current:

```text
connected = token present
scopes = configured requested scopes
```

Target should separate at least:

```text
authPresent
authValidity
capabilityState
grantedScopes / provenScopes
requestedScopes
capabilityEvidence
```

A compatibility `connected` flag may remain, but it must not be the sole readiness signal.

Examples:

### Manual token validated by Disk-info

```text
connected = true
capabilityState = unknown
fullDiskReady = false/unproven
```

### PKCE exact full receipt

```text
connected = true
capabilityState = full
```

### Explicit reduced response missing write

```text
connected = true
capabilityState = reduced
writeReady = false
readReady = true only if required read scope is proven
```

## 12. Auth validity is not capability validity

P1-195 must not swallow P1-196.

These are separate axes:

```text
auth validity: valid | expired | invalid | unknown
capability: full | reduced | unknown
```

A token may be syntactically/present/provider-accepted but lack a needed capability.

Likewise a known capability receipt does not override expiry/revocation.

## 13. 401/403/resource-denial boundary

P1-196 owns exact-generation invalid-token demotion.

P1-195 requires that permission/resource denial remain distinguishable from invalid-auth demotion. A forbidden/resource-access result must not automatically clear a newer/current auth generation merely because an operation could not be performed.

The exact provider error-code mapping should be implemented from the actual Disk API response contract and validated in real Yandex E2E. The architecture must not use one broad `403 => token invalid` rule as a substitute for that evidence.

## 14. `testYandexConnection()` positive control

Historical P1-195 evidence also covered hidden provisioning inside a connection test.

Current canonical `testYandexConnection()` performs a Disk-info read rather than calling the service-folder provisioning path. Preserve that separation.

Connection test should answer questions such as:

- can this exact token perform the diagnostic read now?;
- which account did the response prove?;
- what exact capability evidence is already available?;

It should not answer "all WebClip Disk mutations are authorized" unless separate scope evidence proves that statement.

## 15. Generation composition

Capability receipt belongs to one exact auth generation.

Schedule:

```text
auth A generation G has full capability receipt
user replaces/disconnects/re-authenticates -> generation G+1
late operation/status for A returns
```

The old capability receipt cannot authorize G+1.

Likewise a reduced/403 result from G cannot demote or rewrite capability/auth truth for newer G+1.

This composes directly with P1-178/P1-191/P1-196.

## 16. Account/root composition

Capability evidence is necessary but not sufficient remote authority.

Even full Disk scopes do not authorize an unresolved operation to switch account/root namespace.

P0-073/P0-074/P1-179 remain responsible for exact account/root context and recovery namespace.

P1-195 only answers whether the current exact auth context has proven operation-relevant permissions.

## 17. Deterministic model

Added:

`project_tools/test_p1_195_yandex_capability_truth_model.js`

It proves:

1. exact PKCE required-only request + omitted response scope can use the documented Yandex inference and become `full`;
2. explicit provider response scope missing write becomes `reduced` and cannot write;
3. reduced token can still admit an operation whose exact required scopes are proven;
4. manual token remains capability `unknown` after successful info observation;
5. missing exact request provenance fails to `unknown` rather than full;
6. capability evidence is auth-generation bound;
7. 401 invalid-auth candidate and 403 capability/resource denial remain different model states.

Expected result:

`P1-195 Yandex capability truth model: PASS`

Model PASS is not runtime PASS and not real Yandex evidence.

## 18. Source-bound implementation gate

Added:

`project_tools/test_p1_195_yandex_capability_truth_source.js`

It preserves current positive controls and requires future runtime to add:

- explicit capability classifier/state;
- requested-vs-granted/evidence provenance;
- full/reduced/unknown state;
- auth-generation binding;
- truthful status fields instead of static `scopes: YANDEX_SCOPES` as granted truth;
- operation-specific capability admission;
- manual-token unknown-capability semantics;
- PKCE scope evidence provenance;
- forbidden/capability distinction from invalid-auth handling.

Expected current result:

`P1-195 Yandex capability truth source gate: RED`

## 19. Physical evidence required before closure

Do not close P1-195 from source/model evidence alone.

Real Yandex evidence should cover at least:

1. normal PKCE token with the currently configured three required Disk rights;
2. captured token response semantics for `scope` present/absent under the actual application registration;
3. a controlled reduced-capability token/app configuration if Yandex can produce one without altering production credentials;
4. manual-token flow where scope provenance is unavailable;
5. successful Disk-info read does not make UI/runtime claim proven write capability;
6. a write-required operation is refused when write is known missing;
7. stale capability receipt from auth generation A cannot authorize/demote generation B;
8. real provider denial/error mapping is recorded before implementation treats a specific HTTP/error code as missing scope vs invalid token.

Do not manufacture a destructive remote mutation merely to test capability if a non-destructive/provider-receipt proof is available.

## 20. Safety / non-goals

This is defensive architecture and data-integrity research only.

It does not:

- search for Yandex vulnerabilities;
- bypass OAuth permissions;
- obtain unauthorized tokens;
- mutate production credentials;
- change runtime or manifest;
- add new OAuth scopes;
- change Registry status;
- build/tag/release.

## 21. Status

P1-195 remains **ACTIVE**.

Current source still exposes requested static scopes through status and lacks a current generation-bound operation-specific capability classifier/admission contract. The branch is research/model/source-gate only.

Runtime remains `0.9.8`; release remains `NOT READY`.
