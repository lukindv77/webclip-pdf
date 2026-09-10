# WebClip — auth-context remote-effect admission — 2026-09-10

Date: 2026-09-10  
Canonical baseline: `main = 2857ca6f3892e802ea9d3c0ee639999949b3002a`  
Research branch: `research/auth-context-remote-effect-admission-2026-09-10`  
Mode: **RESEARCH-ONLY / CURRENT-BASELINE AUTHORITY COMPOSITION**  
Production/runtime modification: **NONE**  
Real Yandex L5: **NOT RUN**  
Release-policy activation: **NONE**  
New P-code: **NO**

This tranche composes the canonical W5 fixed-redirect auth-core refinement with the existing P0-074 immutable Yandex operation-context owner and the historical C0/C1 remote-effect admission work. It does not resurrect a historical branch wholesale. Historical material is used only as immutable design provenance and every adopted invariant is revalidated against current `main` source and current Registry authority.

The research question is precise:

```text
How can one logical Yandex mutation retain one exact auth/account/root/capability authority
from admission through unknown-settlement reconciliation,
without persisting secrets and without silently rebinding an old physical effect to newer global state?
```

---

## 1. Immutable inputs and current authority

Current canonical baseline:

```text
main = 2857ca6f3892e802ea9d3c0ee639999949b3002a
```

Relevant immutable historical heads:

```text
P0-074 immutable live Yandex context
  771734b54715ef47cd1d9ad26383c0a5f02bbcdf

C0/C1 remote-save admission delta
  c22fa2a7c7e61b18f3709597234516a3d95697c5

Wave1 Yandex context/effect source-spec
  abfb6932a2a6d33953a20d754a9f269c4adf8449
```

Current authority order remains:

```text
USER_REQUIREMENTS.md
+ DECISIONS_AND_RATIONALE.md
+ current architecture/contracts
+ RESEARCH_REGISTRY.md
+ exact current source
        > historical production-entry branches
```

Relevant existing owners are sufficient:

```text
P0-073  account/root context
P0-074  immutable live Yandex operation context
P0-078  public-link policy generation
P1-090  exact Yandex object identity / locator fail-closed semantics
P1-165  returned OAuth state verification remains ACTIVE and unresolved
P1-178  auth attempt/generation authority
P1-184  upload content receipt / exact-effect reconciliation direction
P1-191  manual-token generation / preserve proven credential
P1-195  capability truth
P1-196  exact auth-generation validity demotion
P1-198  worker-issued physical operation identity
```

No new root cause is allocated.

---

## 2. Canonical W5 input

The immediately preceding canonical W5 research establishes these target invariants:

```text
fixed Yandex verification-code redirect + PKCE S256
authAttemptId
shared authGeneration
authRecordId
post-network compare-and-commit
manual validate-before-commit
failed/unknown manual replacement preserves last proven auth
exact-generation 401 demotion
worker-owned Authorization header
capability truth = full | reduced | unknown
expiry truth = known-expires-at | unknown
returned OAuth state is not directly observed authority in current pasted-code UX
```

This tranche consumes those invariants as research inputs. It does not claim they are already implemented in production runtime.

---

## 3. Fresh current-source findings

### 3.1 Current Journal is v7

Current `service-worker.js` states:

```text
JOURNAL_DB_VERSION = 7
```

Therefore historical J0-v8 fields such as `finalizationId`, `journalDatasetGenerationId` and v8 expected-entry revision semantics remain future/deferred inputs. They must not be presented as current production authority in this tranche.

### 3.2 `pendingRemoteSaves` is already a durable integration surface

Current worker defines:

```text
JOURNAL_PENDING_REMOTE_STORE = 'pendingRemoteSaves'
```

and has recovery logic through `recoverPendingRemoteSaves(...)`.

This is a useful current integration surface, but the present research does not claim that its existing schema already carries the proposed auth/account/capability/effect bindings.

### 3.3 Current Yandex API helpers can reread global auth

Current `yandexApi(...)` obtains the access token through current auth state rather than from an immutable operation-owned context. Across a long logical effect, a later request can therefore observe newer global credential authority unless a future implementation introduces a context-bound adapter.

The target must prohibit this shape for an admitted remote effect:

```text
step 1 uses credential A
user installs credential B
step 2 silently rereads global state and uses B
```

One physical effect cannot be partly authorized by A and partly by B merely because global settings changed mid-flight.

### 3.4 Current upload path reads current config at execution time

`uploadCachedRecordToYandex(...)` reads current Yandex configuration, including root-path authority, at execution time. That is normal for the current implementation, but it means future durable admission needs an exact root/config binding before an irreversible remote effect starts.

Changing the root after admission must not retarget an already admitted physical effect.

### 3.5 Current remote verification proves exact positive byte-size, not content identity

`test_yandex_exact_remote_size.js` verifies that current save/recovery flows reject absent, zero or mismatching remote sizes and accept an exact positive byte-size match.

That is valuable fail-closed evidence, but byte-size equality is not cryptographic content equality.

Therefore:

```text
same path + same byte count != exact content proof
```

An unknown mutation settlement must not become `proven-success` only because a later object exists at the expected path with the expected size. Exact-effect/content reconciliation needs stronger identity evidence. Until provider-side content identity is physically proven and adopted, a bounded download/hash comparison or another exact content proof remains the safe research target.

### 3.6 Current W5 production gaps remain production gaps

The canonical W5 research model exists on `main`, but current production `service-worker.js` still lacks the target shared `authGeneration/authRecordId` implementation and still permits current-global auth reads inside Yandex helpers.

This tranche therefore specifies composition contracts only. It does not pretend the production source already satisfies them.

---

## 4. Two-level authority model

A correct design needs two different records with intentionally different durability.

### 4.1 Memory-only `LiveYandexEffectContext`

Target abstract shape:

```text
LiveYandexEffectContext {
  contextId,
  physicalOperationId,
  authRecordId,
  authGeneration,
  accessToken,                 // secret; memory-only
  accountUid,
  accountTruth: "proven",
  capabilityTruth,
  requiredCapability,
  rootIdentity,
  safeConfigIdentity,
  publicationGeneration?,
  acquiredAt
}
```

Rules:

- `accessToken` is never written into durable effect state, Journal, OperationLog, status DTO or error metadata.
- `Authorization` headers are never durable fields.
- signed upload URLs are ephemeral effect material and are never durable authority.
- `codeVerifier` and OAuth pending secrets are never part of an effect context.
- `accountUid` is safe identity metadata only after it was proven using the exact captured credential.
- capability is explicit; token presence is not enough.
- the context is immutable for the logical effect.

### 4.2 Durable `RemoteEffectCheckpoint`

Target abstract shape:

```text
RemoteEffectCheckpoint {
  physicalOperationId,
  contextId,
  authRecordId,
  authGeneration,
  accountUid,
  requiredCapability,
  capabilityBasis,
  rootIdentity,
  targetPathIdentity,
  expectedObjectIdentity,
  expectedBytes,
  phase,
  attemptCount,
  createdAt,
  updatedAt
}
```

The checkpoint is deliberately non-secret. It records what authority/effect was selected, not the credential material needed to mutate the provider.

After worker restart, this checkpoint is sufficient to explain and reconcile history, but insufficient to resume mutation by itself.

---

## 5. Authority acquisition

A future implementation should acquire an effect context coherently:

1. capture exact current `authRecordId/authGeneration`;
2. verify the credential is usable for the required capability;
3. prove `accountUid` using that exact credential if not already proven by exact-current evidence;
4. capture root/config identity;
5. recheck that `authRecordId/authGeneration` and relevant settings generation are still current;
6. mint/attach worker-owned `physicalOperationId`;
7. produce immutable context.

If authority changes during acquisition, discard and reacquire. Storage serialization alone is not semantic authority CAS.

---

## 6. Admission before the first irreversible mutation

Before first remote mutation:

```text
auth record still exact-current
account truth proven
required capability satisfied
root/config intent still admissible
physical operation identity valid
local PDF/object identity sealed enough for the operation
```

If any of these fail before mutation starts, deny the stale start. The caller may reacquire a fresh context as a new intent.

Examples:

```text
A context captured -> manual B becomes current -> A has not mutated yet
=> A start denied

A context captured -> disconnect
=> A start denied

account X context -> user authenticates account Y before first mutation
=> X start denied

root R context -> settings move to root S before first mutation
=> old operation is not silently retargeted to S
```

---

## 7. Durable `started-unknown` before transport

The critical remote-effect rule is:

```text
persist started-unknown BEFORE the irreversible transport call
```

This checkpoint means the provider may have observed the mutation even if the worker later loses the response, times out, crashes or restarts.

A local timeout is not proof of provider failure. Therefore the next action cannot be a blind second PUT/create/publish.

This rule composes existing late-settlement/recovery work with physical-effect identity.

---

## 8. Unknown settlement and reconciliation

After an unknown outcome:

1. do not blindly retry the same mutation;
2. load the durable checkpoint;
3. acquire a fresh read-only reconciliation context if necessary;
4. require the same proven `accountUid`;
5. require enough read capability to inspect the effect;
6. locate the exact expected remote object/effect using bounded identity logic;
7. prove exact content/effect outcome before declaring success;
8. if absence is proven, a retry must be a new explicitly authorized physical mutation according to the retry policy, not an untracked replay of the old transport.

### Same-account newer credential

A newer credential may be used for **read-only reconciliation** of an older effect only when:

```text
new credential accountUid == checkpoint accountUid
and account identity is proven
and read capability is sufficient
```

This does not rebind the old mutation to the new credential. It only allows factual observation of the old effect.

### Different account

A credential for a different account cannot reconcile the old effect as though it were the same provider namespace. The old checkpoint remains unresolved/deferred until compatible evidence is available.

---

## 9. Restart semantics

A service-worker restart destroys memory-only secret context.

Correct consequence:

```text
restart + durable checkpoint != restored mutation authority
```

After restart:

- do not reconstruct an old access token from durable effect state;
- do not use whichever global credential now happens to exist to continue the old mutation;
- a fresh same-account credential may be used for bounded read-only reconciliation;
- if reconciliation proves absence and policy permits retry, create/admit a new physical mutation under fresh authority.

This keeps secret minimization and effect identity compatible.

---

## 10. 401 composition

Every OAuth-header request in a future context-bound adapter should carry observational identity:

```text
authRecordId
authGeneration
```

A 401 from an endpoint classified as credential-validity authority may demote global auth only if those values are still exact-current.

Example:

```text
old effect uses A/gen7
B/gen8 becomes current
late 401 from A
=> B unchanged
```

The request failure remains factual evidence for the old effect. It is not authority to clear newer global credentials.

---

## 11. Header and secret ownership

The W5 worker-owned header rule applies directly to context-bound effects:

```text
caller cannot provide Authorization
adapter injects Authorization from exact LiveYandexEffectContext last
```

A long operation must not call a helper that silently substitutes current-global auth for the context credential.

Durable state must exclude at minimum:

```text
accessToken
refreshToken
Authorization
codeVerifier
signed upload URL
verification code
```

Logs/status/errors must also exclude those values.

---

## 12. Capability admission

Required capability is effect-specific.

Examples:

```text
remote upload/create/overwrite -> write capability required
metadata/content reconciliation -> sufficient read capability required
account/root proof -> exact required info/read capability according to endpoint contract
publication child effect -> publication/write authority plus exact publication policy generation
```

`capabilityTruth = unknown` cannot authorize a write merely because a token exists or a previous unrelated read succeeded.

A reduced capability record may authorize only the exact subset it proves.

---

## 13. Root and config identity

Root/config state has two distinct roles:

- before first mutation: current user intent must still admit the captured target;
- after `started-unknown`: checkpoint target identity is historical fact and cannot be rewritten to a newer root.

Thus:

```text
root changes before mutation -> deny/reacquire
root changes after possible mutation -> reconcile old exact target; do not retarget
```

This prevents a recovery loop from creating a duplicate object under the user's newer root.

---

## 14. Publication is a child physical effect

Making an uploaded object public is not merely metadata on upload success. It is another externally visible mutation with its own P0-078 publication-policy generation.

Target ordering:

```text
upload effect proven-success
-> publication intent/generation still current
-> persist publication started-unknown
-> publication mutation
-> reconcile if unknown
```

Upload success does not imply publication success or publication authorization.

A stale publication policy cannot be rescued by the fact that the underlying upload succeeded.

---

## 15. Remote success is not Journal authority

Provider settlement evidence and local Journal mutation authority are separate control planes.

This tranche preserves the rule:

```text
remote effect proven-success != automatic Journal write authority
```

Current Journal remains v7. Future J0-v8 finalization/dataset-generation/CAS fields are deferred until their own current-baseline implementation tranche.

---

## 16. P1-165 remains unresolved and orthogonal

Current Registry still marks `P1-165` ACTIVE around returned OAuth `state` verification. The fixed verification-code UX does not directly expose the provider's returned redirect response to WebClip, so this tranche does not fabricate returned-state equality evidence.

Therefore:

```text
P1-165 = unresolved
returned state = not used as remote-effect authority
```

The effect context is bound to current W5 target identity (`authRecordId/authGeneration/accountUid/capability`), not to an unobserved callback value.

Resolving P1-165 may require a separate product/transport decision or another provider-compatible evidence mechanism. This tranche does not change transport.

---

## 17. Deterministic negative/recovery matrix

A deterministic model for this tranche must cover at minimum:

```text
E01 exact current auth + proven account + write capability -> admission allowed
E02 auth changes before first mutation -> old start denied
E03 disconnect before first mutation -> old start denied
E04 account changes before first mutation -> old start denied
E05 root changes before first mutation -> old start denied/reacquire
E06 capability unknown for write -> denied
E07 reduced capability lacking write -> denied
E08 started-unknown persisted before transport
E09 timeout/unknown settlement -> no blind second mutation
E10 newer auth after started-unknown -> no retarget/rebind
E11 same-account newer credential + read capability -> read-only reconciliation allowed
E12 same-account newer credential without read capability -> reconciliation denied
E13 different-account credential -> old effect cannot be reconciled as same namespace
E14 worker restart loses secret context -> mutation cannot resume from checkpoint alone
E15 restart + proven same-account read context -> reconciliation only
E16 late old-context 401 after newer auth -> newer auth unchanged
E17 exact-current credential-validity 401 -> exact auth may demote
E18 access token absent from checkpoint
E19 Authorization absent from checkpoint
E20 refresh token absent from checkpoint
E21 code verifier absent from checkpoint
E22 signed URL absent from checkpoint
E23 context-bound adapter cannot reread global auth mid-effect
E24 caller Authorization override forbidden
E25 publication is separate child effect
E26 stale publication generation -> publication denied
E27 upload success != publication success
E28 upload success != Journal mutation authority
E29 current Journal version is 7
E30 J0-v8 finalization fields remain deferred
E31 P1-165 remains ACTIVE/unresolved
E32 returned-state equality not fabricated
E33 pendingRemoteSaves is integration surface, not proof of target schema
E34 same path + same size is insufficient exact content proof
E35 unknown settlement + size match alone remains not-proven
E36 exact content/effect proof required before proven-success
E37 root changes after started-unknown -> reconcile old target, do not retarget
E38 stronger new capability cannot rebind old mutation
E39 durable checkpoint can survive restart without secrets
E40 physicalOperationId remains stable for observation of one possible effect
E41 absence proven before any retry
E42 retry after proven absence requires fresh mutation authority
E43 storage serialization does not replace semantic auth/settings CAS
E44 status/log DTOs exclude secret material
E45 S2 remains unauthorized
E46 no product ZIP or real Yandex L5
```

---

## 18. Current implementation boundary

This research does not change current runtime behavior. A future production implementation would likely need a cohesive context/effect adapter rather than scattered call-site checks.

Minimum future responsibilities:

```text
acquireLiveYandexEffectContext(...)
assertEffectAdmissionCurrent(...)
buildContextBoundYandexHeaders(...)
yandexApiWithContext(...)
checkpointEffectStartedUnknown(...)
reconcileRemoteEffect(...)
classifyExactContentEvidence(...)
startFreshRetryAfterProvenAbsence(...)
startPublicationChildEffect(...)
redactEffectCheckpoint(...)
```

Current `pendingRemoteSaves` may be migrated/extended as one integration surface only after schema compatibility and recovery semantics are modeled against actual production records.

---

## 19. Selective-adoption disposition

Historical work is classified as follows:

```text
P0-074 immutable context
  ADOPT invariant: one logical operation / one immutable auth-account-root context
  ADOPT invariant: secrets memory-only
  ADOPT invariant: restart needs fresh same-account observation context

C0/C1 remote-save admission
  ADOPT invariant: durable started-unknown before irreversible transport
  ADOPT invariant: no blind retry after unknown outcome
  ADOPT invariant: newer same-account credential may reconcile read-only
  ADOPT invariant: different account cannot rebind old effect
  ADOPT invariant: remote settlement != Journal authority
  DEFER J0-v8 finalization/dataset-generation fields

Wave1 context/effect source-spec
  ADOPT composition invariants after current-source revalidation
  DO NOT import historical source wholesale
```

The historical branches remain provenance. They are not current production branches.

---

## 20. Decision

For exact current baseline:

```text
main                                      = 2857ca6f3892e802ea9d3c0ee639999949b3002a
live Yandex effect context                = MEMORY-ONLY / IMMUTABLE
remote effect checkpoint                  = DURABLE / NON-SECRET
auth binding                              = authRecordId + authGeneration
account binding                           = proven accountUid
write admission                           = exact required capability
first mutation checkpoint                 = started-unknown BEFORE transport
unknown settlement                        = RECONCILE BEFORE RETRY
same-account newer credential             = READ-ONLY RECONCILIATION ONLY
different-account credential              = CANNOT REBIND OLD EFFECT
root change after possible mutation       = RECONCILE OLD TARGET; NO RETARGET
byte-size equality                        = USEFUL BUT NOT EXACT CONTENT PROOF
physical effect identity                  = REQUIRED
publication                              = SEPARATE CHILD EFFECT
remote success                            = NOT JOURNAL AUTHORITY
current Journal                           = v7
J0-v8 fields                              = FUTURE / DEFERRED
P1-165 returned-state gap                 = ACTIVE / UNRESOLVED
returned state remote-effect authority    = NONE
real Yandex L5                            = NOT RUN
new P-code                                = NO
S2                                        = NOT AUTHORIZED
release readiness                         = UNCHANGED / NOT READY
```

The next useful research edge after this composition is to map the proposed checkpoint fields onto the exact current `pendingRemoteSaves` record lifecycle and identify a backward-compatible migration/recovery cutover that preserves v7 Journal authority, still without modifying production runtime or invoking provider L5.