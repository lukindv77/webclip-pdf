# WebClip — auth operation-context / remote-effect admission reconciliation — 2026-09-10

Date: 2026-09-10  
Canonical baseline: `main = 2857ca6f3892e802ea9d3c0ee639999949b3002a`  
Mode: **RESEARCH-ONLY / CURRENT-BASELINE AUTHORITY RECONCILIATION**  
Production/runtime modification: **NONE**  
Real Yandex L5: **NOT RUN**  
Release-policy activation: **NONE**  
New P-code: **NO**

This tranche composes the newly canonical W5 auth-authority model with the older P0-074 / Wave1 operation-context and C0/C1 remote-effect admission work. It does not treat historical branches as current implementation proof. The target is to define exactly what a long Yandex operation may capture, persist, resolve and use when authorization, account, root or settings change after operation start.

## 1. Current authority and immutable provenance

Current authority order remains:

```text
USER_REQUIREMENTS.md
+ DECISIONS_AND_RATIONALE.md
+ current architecture/contracts
+ RESEARCH_REGISTRY.md
+ exact current source
        > historical branch conclusions
```

Canonical current baseline:

```text
2857ca6f3892e802ea9d3c0ee639999949b3002a
```

Historical inputs are pinned only as selective-adoption provenance:

```text
Wave1 operation-context cutover
  branch head = ee3c3015e6ef07b198a95dbae3c286c0ade4bbeb
  source spec = project_docs/RESEARCH_WAVE1_OPERATION_CONTEXT_CUTOVER_2026-09-09.md
  source blob = 823326d07f4df4fae374854ee18e5dffc9dd7f50

Wave1 Yandex context/effect
  branch head = abfb6932a2a6d33953a20d754a9f269c4adf8449
  source spec = project_docs/RESEARCH_WAVE1_YANDEX_CONTEXT_EFFECT_SOURCE_SPEC_2026-09-09.md
  source blob = a9e1f48ac56badeadfdef103232f03bc22f915d6

C0/C1 production-entry reconciliation
  branch head = 35d362cbc87ba4f36c5bd76a4e65e4ac493120b3

C0/C1 remote-save admission delta
  branch head = c22fa2a7c7e61b18f3709597234516a3d95697c5
  source spec = project_docs/RESEARCH_C0_C1_REMOTE_SAVE_ADMISSION_DELTA_2026-09-10.md
  source blob = cad6569286bbb4139c6de64da2bf086eb2c44172
```

These branches provide candidate invariants, not current closure or release evidence.

## 2. Existing owners are sufficient

No new root cause is introduced. The relevant existing owners compose as follows:

```text
P0-073  verified account/root context
P0-074  immutable live Yandex operation context and remote-binding handoff
P0-075  host/control-plane isolation and sensitive auth authority
P1-178  exact auth-attempt/generation stale-completion fencing
P1-191  manual-token replacement in the same auth generation space
P1-195  capability truth: full | reduced | unknown
P1-196  exact-generation credential invalidation / stale-401 fencing
```

Historical C0/C1 and Wave1 admission/effect work remains useful composition evidence under those owners. P1-231 remains confined to release-generation/evidence authority and is not broadened by this runtime research.

## 3. Current-source gap

Current production source is still pre-W5 implementation. In particular:

```text
getValidYandexAccessToken()
    -> reads current global yandexAuth

yandexApi(path, options)
    -> resolves current global access token
    -> builds Authorization from that token
    -> then spreads caller options.headers
```

The newly canonical W5 research model therefore is not yet runtime reality. There is no current runtime `authRecordId` / `authGeneration` identity threaded through long Yandex operations, and current Yandex requests may select whatever credential is globally current at request time.

This matters because a long operation can begin under account/auth A and later issue or retry a remote effect after the user authorizes B, disconnects, changes root, or changes publication/config settings.

Storage serialization alone cannot solve this. The missing property is semantic binding between an operation/effect and the exact authority that admitted it.

## 4. Selective adoption from historical operation-context work

The following historical invariants remain valid and are adopted:

1. `START_OPERATION` creates one immutable non-secret operation context.
2. Downstream workers consume the captured context, not mutable globals.
3. Account/root identity is stronger than a path string; remote evidence belongs to a verified account plus exact root/resource identity.
4. Long operations capture the exact settings/publication/config inputs that affect semantics.
5. Recovery/retry must not silently substitute current account/root/config for the captured values.
6. Durable history, receipts and recovery evidence must not contain raw access tokens, refresh tokens, PKCE verifier or other credential material.
7. Once an external effect is issued, its factual settlement remains attached to that effect/operation context even if global authority later changes.
8. Lost outer responses are reconciled against the captured remote/effect identity, not against whichever global account/root happens to be current later.

The following historical assumptions require refinement:

- a generic `secretRef` is not enough unless resolution proves the exact W5 auth identity;
- token presence is not sufficient admission authority;
- `connected=true` is not capability proof;
- old auth vocabulary without `authRecordId/authGeneration` cannot safely fence replacement/disconnect/stale 401 schedules;
- any old final/ready wording is provenance only and has no present release or production meaning.

## 5. Authority objects

### 5.1 Durable operation auth binding

The durable/portable operation context stores only non-secret identity and evidence:

```text
RemoteAuthBindingV1 {
  authRecordId,
  authGeneration,
  secretRef,
  authScheme,
  accountUid,
  accountTruth,
  capabilityState,
  capabilityBasis,
  requestedScopes,
  grantedScopes?,
  appRoot,
  appRootResourceId,
  configRevision,
  publicationRevision
}
```

The binding must never contain:

```text
accessToken
refreshToken
codeVerifier
authorization code
raw Authorization header
```

`authRecordId` and `authGeneration` are non-secret authority identifiers. `secretRef` is a worker-owned lookup handle, not proof by itself.

### 5.2 Ephemeral effect auth context

Immediately before an effect that may issue a Yandex request, worker-only code resolves the durable binding into an ephemeral context:

```text
ResolvedEffectAuthV1 {
  authRecordId,
  authGeneration,
  secretMaterialRevision,
  accessToken,
  accountUid,
  capabilityState,
  capabilityBasis
}
```

This object is process-local/ephemeral. It is not written to operation history, status DTOs, portable recovery material or public receipts.

The resolver must prove that the secret material belongs to the exact logical auth binding. A `secretRef` that is missing, stale, points at another auth record/generation, or can only be satisfied by current unrelated auth fails closed.

## 6. Auth generation versus token-material revision

A critical composition point is refresh.

`authGeneration` identifies user credential authority selection. Refreshing an access token for the same logical OAuth authorization must not silently become a different account/capability authority merely because token bytes changed.

Therefore this tranche separates:

```text
authRecordId + authGeneration     // semantic credential authority
secretMaterialRevision            // token-material rotation within that exact authority
```

A refresh may advance `secretMaterialRevision` while preserving `authRecordId/authGeneration` only if the refreshed material is proven to represent the same logical authorization, account binding and capability contract. If refresh evidence changes account/capability identity or cannot prove continuity, it cannot be treated as an in-place material rotation; a new authoritative auth record/generation or explicit revalidation path is required.

A long operation may resolve newer secret material for its exact logical auth binding. It may never resolve a different current global auth just because the old token expired.

## 7. Capture versus admission

Operation capture and irreversible effect admission are distinct boundaries.

### Operation capture

At operation start, capture the intended immutable authority/context identity and semantic settings. Capture does not guarantee that every future effect remains admissible indefinitely.

### Effect admission

Immediately before each external effect that can create, overwrite, move, delete, publish or otherwise mutate Yandex state, admission must prove at least:

```text
exact authRecordId/authGeneration binding
secretRef resolves only to that exact binding
accountTruth == proven
exact accountUid
exact appRootResourceId / remote root identity
capability sufficient for this effect
required C0/C1 budget/deadline/idempotency/recovery conditions
exact relevant config/publication policy snapshot
```

A simple `connected` boolean is never sufficient.

Read/info, write, move/delete and publication effects may require different capability predicates. Capability is checked per effect boundary.

## 8. Candidate intent versus committed authority

The W5 rule that a pending replacement is only a candidate remains important here.

Example:

```text
proven A is current
operation O captures/adopts A
user starts OAuth candidate B
```

Starting B invalidates older pending attempts but does not automatically erase proven A. New operation/effect admission may continue under A if A remains the committed current authority and all exact admission predicates remain true.

If B later commits, new admissions use B. Already-issued A effects remain factually A-bound. Effects not yet externally issued under an operation that captured A must re-check whether the product policy permits continued use of exact A; if A is no longer authorized/current for new external work, they block/reconcile rather than silently switching to B.

Failed or evidence-unknown manual candidate B preserves proven A according to P1-191 and therefore does not invalidate A merely because replacement was attempted.

## 9. Disconnect and re-authorization

Disconnect advances auth authority generation and removes old authority for new external requests.

Consequences:

- effects already externally issued under A keep their factual A/account/root identity for settlement/reconciliation;
- no new request may silently reuse A after disconnect unless an explicit recovery policy can prove continuing authorization for that exact binding;
- no request may substitute newly authorized B into an A operation/effect silently;
- old async OAuth/manual/401 completions cannot repopulate or mutate the newer global auth state.

Re-authorization to the same human-visible account is still a new authority unless exact identity continuity is proven by the canonical auth model. Display name or path equality is not enough.

## 10. 401 and request settlement

Every OAuth-header request captures:

```text
operationId
effectId
authRecordId
authGeneration
secretMaterialRevision
accountUid
appRootResourceId
```

A late 401 is two separate facts:

1. that exact request failed under its captured auth material;
2. whether global current auth may be demoted.

Global demotion is allowed only when the failing request's `authRecordId/authGeneration` is still the exact current credential and the endpoint is classified as OAuth-credential-validity authority.

Thus:

```text
A request -> B becomes current -> late A 401
```

records A request failure but cannot demote B.

A signed/public-link URL 401 or an endpoint with different authorization semantics is not blanket authority to clear the global OAuth credential.

## 11. Header and credential ownership

The W5 worker-owned-header rule applies to operation effects as well:

- caller-provided `Authorization` is rejected/stripped case-insensitively;
- generic effect options cannot select credentials;
- the exact resolved effect auth is injected by the worker-owned Yandex adapter last;
- long effects do not reread global `yandexAuth` after admission to choose a different token.

This is both a security boundary and an operation-context correctness property.

## 12. Restart and recovery

After worker restart, durable operation/recovery state may restore only non-secret binding data.

Before a new external request, the worker must resolve the exact captured logical auth binding. Outcomes:

```text
exact binding resolvable + admissible -> continue
exact binding unavailable             -> pause/fail/reconcile
only different current auth exists    -> do not substitute
account/root evidence ambiguous       -> fail closed
capability insufficient/unknown       -> block effect
```

If a request was already externally issued before the restart, response ambiguity is reconciled using its captured effect/account/root identity. The absence of current credentials must not rewrite historical fact, though a new provider query may itself require an admissible exact credential or an explicitly designed alternate reconciliation mechanism.

## 13. Multi-phase remote effects

A long save is not one undifferentiated network action. Each irreversible boundary has its own effect identity and admission point, for example:

```text
ensure/create remote folder
upload/overwrite content
move/replace object
publish/create public link
cleanup/delete superseded object
```

One phase's capability proof must not be generalized to every later phase. If authority changes between phases, a not-yet-issued phase must re-evaluate exact admission instead of rebinding silently.

Already-issued phases remain factual settlements of their captured effect identities.

## 14. Current-source implementation implication

Current `getValidYandexAccessToken()` + `yandexApi()` choose from mutable global auth. A future production implementation therefore cannot achieve P0-074 merely by constructing an immutable metadata object while leaving the Yandex adapter unchanged.

The source cutover needs a worker-owned effect API conceptually equivalent to:

```text
resolveExactEffectAuth(binding)
buildYandexHeaders(callerHeaders, resolvedExactAuth)
yandexApiWithEffectContext(effectContext, path, options)
```

and long-operation call sites must receive explicit operation/effect context rather than reaching back into global account/root/auth/settings helpers after the relevant boundary.

This tranche does not implement those helpers. It specifies the negative schedules they must pass.

## 15. Deterministic negative/recovery matrix

The companion model covers at minimum:

```text
O01 exact current full-capability auth admits write
O02 reduced capability blocks unavailable write effect
O03 unknown capability blocks irreversible write requiring proof
O04 immutable context captures auth id/gen/account/root/config/publication
O05 global auth B after A admission does not alter issued A effect
O06 disconnect after A issue preserves factual A settlement identity
O07 disconnect blocks new old-A effect admission
O08 account B login cannot rebind A effect settlement
O09 stale A 401 cannot demote B
O10 exact-current classified A 401 may demote A
O11 public/signed URL 401 cannot blanket-demote OAuth auth
O12 caller Authorization override is rejected
O13 case-variant caller authorization is rejected
O14 worker exact Authorization is selected from resolved effect auth
O15 global auth reread cannot replace operation-captured auth
O16 accountTruth unknown blocks UID-dependent effect
O17 path equality alone is insufficient remote identity
O18 durable context contains no token/refresh/verifier
O19 capability is checked per effect, not connected boolean
O20 failed manual B preserves proven A authority
O21 pending OAuth B does not automatically erase proven A
O22 committed B governs new admissions while issued A remains A-bound
O23 missing exact secretRef after restart cannot substitute B
O24 secretRef resolving wrong auth id/gen fails closed
O25 recovery replay cannot silently rebind account/root
O26 remote settlement receipt binds operation/effect/account/root
O27 auth refresh may rotate material revision under same logical auth only
O28 refresh cannot silently change account/capability identity
O29 refresh failure cannot choose different global auth
O30 token material revision is separate from auth authority generation
O31 pre-issue admission fails if old auth is no longer authorized
O32 post-issue settlement does not require global auth to remain current
O33 lost-response reconciliation uses captured remote/effect identity
O34 retry issuing new request requires exact admissible binding
O35 publication capability is checked independently
O36 full-by-provider-contract capability keeps its explicit basis
O37 manual unknown capability cannot become full from generic read success
O38 display name/path equality cannot replace exact UID/resource identity
O39 status/history may expose non-secret auth ids but never secret material
O40 context fingerprint includes authority ids/bases but no secrets
O41 storage serialization does not replace semantic admission fencing
O42 old final/ready historical wording is not current proof
O43 fixed verification-code + PKCE transport remains canonical
O44 no identity permission or chrome.identity transport is introduced
O45 no new P-code
O46 P1-231/S2/release-readiness state is unchanged
```

## 16. Release and evidence boundary

This is current-source L2 architecture/model evidence only. It does not claim:

- production auth-context implementation;
- production C0/C1 remote admission closure;
- real Yandex object/revision behavior;
- current unpacked Chrome closure;
- real Yandex L5;
- release readiness;
- S2 authorization.

No workflow, manifest, version, product ZIP, tag, GitHub Release or deployment is changed.

## 17. Decision

For exact baseline `2857ca6f3892e802ea9d3c0ee639999949b3002a`:

```text
historical operation-context invariant      = SELECTIVELY ADOPT
historical final/ready framing              = REJECT AS CURRENT PROOF
exact authRecordId/authGeneration binding   = REQUIRED
secretRef exact-binding validation          = REQUIRED
raw credential in durable context           = FORBIDDEN
secret material revision                    = SEPARATE FROM AUTH GENERATION
accountTruth=proven for UID effects          = REQUIRED
capability per effect                        = REQUIRED
root identity accountUid+resourceId          = REQUIRED
caller Authorization override               = FORBIDDEN
global auth reread after admission           = FORBIDDEN
silent account/root/auth substitution        = FORBIDDEN
issued effect factual identity               = IMMUTABLE
stale 401 demotion of newer auth             = FORBIDDEN
restart substitution of current other auth   = FORBIDDEN
new P-code                                   = NO
S2                                           = NOT AUTHORIZED
release readiness                            = UNCHANGED / NOT READY
```

The next dependency-ordered research edge after this reconciliation is source-cutover decomposition: identify the exact current `service-worker.js` call graph where global auth/account/root reads must be replaced by explicit operation/effect-context parameters, still as research-only work before any production modification.