# WebClip — Yandex effect-adapter cutover refinement — 2026-09-10

Date: 2026-09-10  
Canonical baseline: `main = 16dee307a391a19d38af8f7cfb0bd581dc53ab59`  
Mode: **RESEARCH-ONLY / CURRENT-SOURCE CUTOVER REFINEMENT**  
Production/runtime modification: **NONE**  
Real Yandex L5: **NOT RUN**  
Release-policy activation: **NONE**  
New P-code: **NO**

This tranche starts after canonical PR #206 and deliberately does not restate its full auth-context / remote-effect admission contract. It isolates two remaining implementation questions:

```text
1. How should token-material rotation compose with immutable auth authority?
2. Which current Yandex call sites must migrate to which worker-owned adapter boundary?
```

The answer must preserve the canonical #206 rules: memory-only secret-bearing live context, durable non-secret checkpoint, exact auth/account/root/capability admission, `started-unknown` before irreversible transport, reconciliation before retry, worker-owned Authorization, no current-global rebinding, and immutable factual identity for already-issued effects.

---

## 1. Canonical inputs

Current canonical baseline:

```text
main = 16dee307a391a19d38af8f7cfb0bd581dc53ab59
```

Canonical immediately preceding research:

```text
PR #204 / W5 fixed-redirect auth core
  authRecordId + authGeneration
  exact-generation stale completion fencing
  worker-owned Authorization
  capability truth

PR #206 / auth-context remote-effect admission
  LiveYandexEffectContext = memory-only + secret-bearing
  RemoteEffectCheckpoint = durable + non-secret
  exact auth/account/root/capability admission
  started-unknown before irreversible transport
  same-account newer credential = read-only reconciliation only
  different-account credential = no rebinding
  stale 401 cannot demote newer auth
  publication = child physical effect
```

Existing owners remain sufficient. No new P-code is allocated.

---

## 2. Remaining semantic distinction: auth authority vs secret material

`authRecordId + authGeneration` identify the semantic authorization authority selected by the user/product. Access-token bytes are material used to exercise that authority, but the bytes themselves are not the authority identity.

Therefore a future implementation should model a third, subordinate revision:

```text
ResolvedYandexCredential {
  authRecordId,
  authGeneration,
  secretMaterialRevision,
  accessToken,
  accountUid,
  capabilityTruth,
  expiresAtTruth
}
```

Rules:

```text
authRecordId/authGeneration = semantic authority identity
secretMaterialRevision      = token-material version within that exact authority
```

A material refresh/rotation may advance `secretMaterialRevision` without advancing `authGeneration` only when continuity is proven for the same logical authorization, same proven account identity, and compatible capability contract.

Material rotation must not be used to conceal a semantic authority change.

Examples:

```text
same logical authorization, same account, same capability, new access-token bytes
=> same authRecordId/authGeneration; secretMaterialRevision may advance

new manual token validated as a different credential authority
=> new auth authority according to canonical W5 generation rules

refresh result cannot prove account/capability continuity
=> cannot be treated as in-place material rotation

old operation needs A/gen7, only B/gen8 exists
=> do not substitute B merely because it is current
```

The durable `RemoteEffectCheckpoint` does not store raw token material or `Authorization`. It may store the non-secret auth identity; whether it stores `secretMaterialRevision` depends on whether that revision is needed as observational evidence. The revision is never sufficient to restore mutation authority by itself.

---

## 3. Current-source transport shape

Current `service-worker.js` still has a generic worker `yandexApi(endpoint, options, allowRetry)` path that:

```text
- obtains a valid token from current global auth state;
- constructs the OAuth Authorization header;
- spreads caller headers afterward;
- performs the network request;
- logs bounded request/response metadata.
```

Current source also has signed/offscreen transfer paths where the OAuth API returns an ephemeral upload/download URL and the actual payload transfer is then performed through the offscreen transport.

The future cutover must preserve those different security semantics instead of forcing every network request through one OAuth-bearing abstraction.

---

## 4. Four adapter classes

The current call sites should be classified into four authority classes.

### A. Control-plane / interactive read

Examples include:

```text
testYandexConnection
interactive folder listing / picker reads
account/status reads that are not continuing a previously admitted physical effect
```

Target rule:

```text
resolve exact current committed auth at call start
require endpoint-appropriate read/info capability
no durable old-effect rebinding requirement unless the read is attached to an existing effect
```

A control-plane call may intentionally use the current credential because its purpose is to answer the current user's current control-plane question. It still must use worker-owned Authorization and exact-generation stale-401 fencing.

### B. Operation-bound OAuth data plane

Examples include:

```text
ensure/create remote folder for an admitted operation
obtain upload URL
verify uploaded object metadata
move object to Trash
move object to Upload
create/verify Journal backup
publish resource
other mutation or mutation-coupled metadata requests
```

Target rule:

```text
must consume LiveYandexEffectContext / exact effect binding
must not reread global auth/root/config to choose authority
must re-admit before each not-yet-issued irreversible child effect
must persist started-unknown before each irreversible transport
```

This is the main cutover surface.

### C. Reconciliation / recovery reads

Examples include:

```text
recoverPendingRemoteSaves
post-timeout/post-restart object lookup
move/upload verification after unknown settlement
backup recovery verification
bounded locator/search used to settle old physical effects
```

Target rule:

```text
checkpoint identifies the old effect/account/root target
fresh credential may be used only for read-only reconciliation when same account is proven
new credential does not rebind the old mutation
result must settle the old effect identity, not create a new mutation implicitly
```

A reconciliation adapter should therefore accept two separate concepts:

```text
historicalEffectBinding
reconciliationCredential
```

They must never be collapsed into one mutable "current context" object.

### D. Signed/offscreen transfer

Examples include:

```text
upload payload to provider-issued signed URL
download payload from provider-issued signed URL
```

Target rule:

```text
signed URL is ephemeral transport capability, not OAuth authority identity
OAuth Authorization must not be copied to signed transfer unless endpoint contract explicitly requires it
signed URL must not become durable authority
transfer remains bound to physicalOperationId/effectId and the checkpoint that authorized creation/use of that signed capability
```

A signed transfer 401/403 is not automatically an OAuth credential-validity signal.

---

## 5. Adapter surface

A production cutover should converge on explicit worker-owned entry points conceptually like:

```text
resolveExactCurrentControlPlaneAuth(requiredCapability)
resolveExactEffectCredential(effectContext, requiredCapability)
runYandexControlPlaneRequest(currentAuthContext, endpoint, options)
runYandexEffectRequest(effectContext, endpoint, options)
runYandexReconciliationRequest(historicalBinding, reconciliationContext, endpoint, options)
runSignedTransfer(effectContext, signedTransferCapability, transferSpec)
```

Exact function names are not authoritative. The required property is that call sites declare which authority class they are using.

The generic API layer must not infer the class from mutable globals or from endpoint strings alone.

---

## 6. Authorization-header ownership

For OAuth-bearing adapters:

```text
caller Authorization = forbidden
case-insensitive authorization variants = forbidden
worker injects exact credential Authorization last
```

The current source shape where caller `options.headers` can be spread after the worker header is incompatible with the target W5/#206 authority boundary even if no current caller exploits it.

Signed/offscreen transfers are separate: they should receive only the headers required by the signed-transfer contract, never an inherited generic OAuth header.

---

## 7. Root/config reads after admission

A future effect adapter is insufficient if a deep helper still rereads mutable global root/config and silently changes the target.

For operation-bound data-plane requests:

```text
root/config/publication inputs that affect physical semantics
= captured/admitted effect inputs
```

For current control-plane reads:

```text
current root/config
= intentionally current
```

For reconciliation:

```text
historical target/root identity
= checkpoint fact
current root/config
= must not retarget old effect
```

This distinction must be preserved at helper boundaries, not merely documented at the top-level operation function.

---

## 8. Multi-phase effect decomposition

A long Yandex workflow may contain several child effects:

```text
folder create
upload-link acquisition
payload upload
metadata verification
move/rename
publication
cleanup/delete
Journal finalization
```

Not every phase is irreversible and not every phase uses OAuth transport.

Rules:

```text
read-only preparation != irreversible child effect
signed payload upload is irreversible even though transport is not OAuth-bearing
publication is a separate irreversible child effect
move/delete are separate irreversible child effects
local Journal mutation remains a separate local authority plane
```

Each not-yet-issued irreversible child effect gets a fresh exact admission decision against the operation's immutable semantic context and currently permitted authority rules.

Already-issued child effects keep factual settlement identity across later auth/root/config changes.

---

## 9. Material rotation during a long operation

A long operation may encounter access-token expiry between phases.

Safe target behavior:

```text
phase 1 admitted under A/gen7/material3
material rotates to A/gen7/material4 with proven continuity
phase 2 not yet issued
=> phase 2 may resolve material4 for the same exact A/gen7 authority if all admission predicates remain true
```

Unsafe behavior:

```text
phase 1 admitted under A/gen7
A unavailable; current B/gen8 exists
phase 2 silently uses B/gen8
=> forbidden
```

If material rotation itself changes or weakens capability truth, later phase admission must use the newly proven capability truth and may block.

A late 401 from material3 may only demote global semantic auth if its `authRecordId/authGeneration` is still exact-current and the endpoint is credential-validity authority. Material revision is observational detail, not permission to demote a different generation.

---

## 10. Call-site cutover map

The following current-source families should be treated as one migration unit for research/testing, even if implementation lands in smaller commits.

| Call-site family | Class | Target authority | Irreversible boundary |
|---|---|---|---|
| connection/account status | A control-plane | exact current committed auth | no |
| interactive folder listing | A control-plane | exact current committed auth | no |
| create/ensure service folders for operation | B data-plane | exact effect context | yes for each create |
| obtain upload URL | B data-plane | exact effect context | no provider object yet, but bound to upcoming effect |
| signed payload upload | D signed transfer | effect + ephemeral signed capability | yes |
| metadata verify after known upload response | B data-plane read | same effect context or compatible settlement context | no new mutation |
| pending-save recovery verify | C reconciliation | historical binding + same-account read context | no new mutation |
| locate moved/unknown object | C reconciliation | historical binding + same-account read context | no new mutation |
| Trash move | B data-plane | exact effect context | yes |
| Upload-folder move | B data-plane | exact effect context | yes |
| Journal backup upload URL | B data-plane | exact effect context | no provider object yet |
| Journal backup signed upload | D signed transfer | effect + ephemeral signed capability | yes |
| Journal backup recovery read | C reconciliation | historical binding + same-account read context | no new mutation |
| publish resource | B data-plane child effect | exact effect + publication generation | yes |
| post-publish readback | C/B settlement read | publication historical binding | no new mutation |
| download signed URL acquisition | B/control depending intent | declared caller class | no |
| signed download | D signed transfer | historical/read intent + signed capability | no remote mutation |

This table is a research cutover map, not proof that the current source already implements these classes.

---

## 11. Retry semantics by class

```text
A control-plane read
  -> ordinary bounded retry policy may apply under exact current authority

B operation-bound mutation
  -> no blind retry after started-unknown; reconcile first

C reconciliation read
  -> bounded retry is allowed only as another read of the same historical target

D signed irreversible upload
  -> unknown settlement belongs to the physical effect; reacquiring a new signed URL does not itself authorize replay
```

A new signed URL after unknown upload settlement must not be mistaken for proof that the previous upload failed.

---

## 12. Failure taxonomy

The cutover should distinguish at least:

```text
AUTH_BINDING_STALE
AUTH_BINDING_UNAVAILABLE
AUTH_CAPABILITY_INSUFFICIENT
AUTH_CAPABILITY_UNKNOWN
ACCOUNT_IDENTITY_MISMATCH
ROOT_IDENTITY_MISMATCH
CALLER_AUTHORIZATION_FORBIDDEN
SIGNED_TRANSFER_AUTHORITY_MISMATCH
EFFECT_SETTLEMENT_UNKNOWN
RECONCILIATION_ACCOUNT_MISMATCH
RECONCILIATION_INSUFFICIENT_CAPABILITY
MATERIAL_CONTINUITY_UNPROVEN
```

Exact names are non-authoritative; semantic separation is required.

---

## 13. Deterministic model requirements

The companion deterministic model must cover at minimum:

```text
C01 control-plane current credential allowed
C02 control-plane stale 401 cannot demote newer auth
C03 control-plane capability unknown blocks capability-requiring read

D01 operation-bound request uses exact effect auth
D02 current-global B cannot replace A effect auth
D03 root change cannot retarget admitted A effect
D04 caller Authorization rejected case-insensitively
D05 folder create treated as child mutation
D06 publication treated as separate child mutation
D07 move treated as separate child mutation

R01 unknown settlement requires reconciliation before mutation retry
R02 same-account newer credential can reconcile read-only
R03 different-account newer credential cannot reconcile old namespace
R04 current root cannot replace checkpoint root during reconciliation
R05 reconciliation success settles historical effect identity

S01 signed upload carries no inherited OAuth Authorization
S02 signed URL is not durable auth authority
S03 signed transfer 401 does not blanket-demote OAuth auth
S04 reacquired signed URL does not authorize replay after unknown settlement

M01 same-auth material rotation may advance material revision
M02 material rotation with unproven account continuity fails closed
M03 material rotation with changed capability cannot inherit old capability truth
M04 different auth generation is never material-only rotation
M05 later phase may use newer material revision for same exact semantic auth
M06 late old-material 401 cannot demote a newer auth generation

P01 already-issued phase identity immutable
P02 not-yet-issued phase re-admits
P03 remote effect success does not imply Journal write authority
P04 publication success/failure independent from upload settlement
```

The model must also assert current-source markers showing that the runtime is still pre-cutover and that no production file is modified by this tranche.

---

## 14. Implementation order implied by the research

A safe future runtime implementation order is:

```text
1. introduce non-secret semantic auth identity + exact resolver contract
2. introduce header sanitization / worker-last Authorization injection
3. introduce explicit adapter class APIs without changing behavior broadly
4. cut over control-plane reads
5. cut over operation-bound reads/preparation
6. cut over irreversible child effects with started-unknown checkpoints
7. cut over reconciliation/recovery paths
8. cut over signed/offscreen transfer binding
9. cut over publication child effect
10. prove restart/401/account/root/material-rotation negative schedules
11. only then consider real provider qualification under separate authorization
```

This ordering minimizes the chance of a half-cutover where some phases remain current-global while others are operation-bound.

---

## 15. Boundary

This tranche authorizes no runtime activation and proves no production closure.

```text
research cutover map != runtime implementation
runtime implementation != real provider qualification
real provider qualification != release-policy activation
release-policy activation != release readiness
```

No official ZIP is built. No real Chrome/Yandex L5 is run. No release receipt/readiness/gate/manifest/tag/GitHub Release/deployment is changed. P1-231 S2 remains unauthorized.