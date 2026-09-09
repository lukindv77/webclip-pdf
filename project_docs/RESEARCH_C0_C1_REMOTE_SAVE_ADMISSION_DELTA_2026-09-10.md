# WebClip — C0/C1 remote-save admission + exact remote-content Change Impact delta — 2026-09-10

Date: 2026-09-10  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Parent C0/C1 branch: `research/wave1-yandex-context-effect-source-spec-2026-09-09` @ `abfb6932a2a6d33953a20d754a9f269c4adf8449`  
Delta branch: `research/c0-c1-remote-save-admission-delta-2026-09-10`  
Mode: **RESEARCH-ONLY / PRE-IMPLEMENTATION CHANGE-IMPACT CONSOLIDATION**  
Production implementation: **NOT STARTED**  
Real Yandex L5: **DEFERRED TO FINAL EXTERNAL STAGE**  
New P-code: **NO**; `P1-231` remains unallocated.

Primary owners remain `P0-070`, `P0-073`, `P0-074`, `P0-076`, `P0-078`, `P0-079`, `P1-184`, `P1-195`, with supporting `P0-022`, `P0-072`, `P1-090`, `P1-138`, `P1-161`, `P1-164`, `P1-208`, `P1-210`.

No runtime, manifest, Registry status, build/version/tag/release/deploy file is modified by this research branch.

---

## 1. Executive decision

The existing C0/C1 specification remains the correct base, but later A0/U0/J0, A1/A2, B1, W5 AUTH/security, D0/D1/D2 and final W1–W6 reconciliation materially refine its production-entry contract. A delta branch is therefore justified; creating an unrelated second C0/C1 architecture is not.

Target chain after reconciliation:

```text
A2 worker-issued physicalOperationId P
+ B1 sealed pdfGeneration G / N / H / sourceGenerationId
+ W5 exact authGeneration / accountUid / validated capability receipt
+ exact configGeneration / root snapshot
+ publicationPolicyGeneration
+ D0/D2 finalizationId F / journalDatasetGenerationId / expected ER where applicable
        ↓
C0 immutable YandexOperationContext v2
        ↓
durable RemoteSaveAdmission E
        ↓
prepared -> started-unknown BEFORE signed PUT
        ↓
C1 exact remote-content verification
        ↓
RemoteObjectReceipt O
        ↓
optional distinct PublicationEffectReceipt PE
        ↓
D2 Journal CAS finalization
OR truthful remote-complete / journal-suppressed
```

Strongest truthful research state:

```text
C0 immutable context                    SOURCE-READY AFTER DELTA
C0 remote effect admission              SOURCE-READY AFTER DELTA
C1 exact remote-content verification    SOURCE-READY AFTER DELTA
publication child-effect composition    SOURCE-READY AFTER DELTA
Journal finalization handoff             SOURCE-READY AFTER DELTA
production implementation               NOT STARTED
real Yandex provider semantics           NOT PROVEN
owner closure                            NO
release ready                            NO
```

---

## 2. Change Impact inputs

### A0/U0/J0

Exact source head:

```text
research/a0-u0-j0-production-entry-source-spec-2026-09-09
e0993dc6098f67400605a452e9ceab8efd214392
```

Consequences for C0/C1:

- `WebClipOperationReceipts v1` owns worker physical operation authority and common resource reservations;
- U0 requires versioned worker/offscreen protocol compatibility before exact-generation work is sent;
- `WebClipJournal v8` is already the forward structural package before C0/C1 activation;
- v8 preserves `pendingRemoteSaves` and adds `journalFinalizations` plus `pendingRemoteMutations`;
- `authorityMode = passive-v8` is only structural capacity, not Journal CAS closure.

### A1/A2

Final authority-admission research establishes:

```text
reviewed content authority
-> worker exact probe
-> durable worker-issued P
-> preparation
-> second exact probe
-> render/effect authority
```

Once B1 seals G, C0/C1 does not re-read current selection/tab state to authorize old bytes. It consumes durable P + exact sealed G.

### B1

Exact source head:

```text
research/b1-pdf-cache-v4-production-entry-source-spec-2026-09-09
5d6294f6df85f8e547ca3ed41bc0c0af55f2f4d5
```

C0/C1 consumes:

```text
physicalOperationId
pdfGeneration
sourceGenerationId / exact source receipt
byteLength N
sha256 H
sealed=true
```

Never substitute `tabId`, URL, filename, caller operationId, latest retry pointer or byte length alone.

### W5 security/auth

Exact readiness head:

```text
research/wave5-security-auth-governance-readiness-2026-09-09
0416f9089af79b50a8775ea29393376989cac4b6
```

W5 makes exact capability proof a C0 prerequisite. Token presence or requested scopes are not sufficient mutation authority.

### D0/D1/D2

Later Journal research establishes independent:

```text
journalDatasetGenerationId
entryRevision
finalizationId
```

and an early `JournalFinalizationIntent F` created before long render/external work. Clear/import changes Journal authority; it does not prove an already-started external effect was cancelled.

### Final W1–W6 vocabulary

Shared production/persistence names are descriptive. This delta therefore replaces old shared names:

```text
authGenerationId              -> authGeneration
routingGenerationId           -> configGeneration
publicationPolicyGenerationId -> publicationPolicyGeneration
pdfGenerationId               -> pdfGeneration
```

`configGeneration` remains narrowly scoped to remote routing/config authority; unrelated UI/backup settings do not need to rotate it.

---

## 3. Parent C0/C1 decisions retained

These original decisions remain valid:

1. one logical remote save captures one coherent immutable non-secret Yandex context;
2. OAuth token and signed URLs are ephemeral capabilities, not durable generation identity;
3. new credentials cannot silently continue an old mutation;
4. newer credentials may perform read-only reconciliation only for the same account and sufficient read capability;
5. root/config changes cannot retarget admitted effects;
6. publication is generation/revocation policy, not a Boolean alone;
7. `started-unknown` is durable before depending on transport response;
8. path+size is never exact remote-content proof;
9. generic new-operation `allowExisting` adoption is forbidden;
10. same-effect unknown settlement may reconcile rather than issue a blind second PUT;
11. pure observation and folder provisioning remain separate APIs/effect classes;
12. remote success is evidence for Journal finalization, not Journal mutation authority itself;
13. no new P-code is needed.

---

## 4. `YandexOperationContext v2`

Conceptual non-secret context:

```js
{
  version: 2,
  yandexContextId,

  authGeneration,
  accountUid,
  capabilityReceipt: {
    state,
    grantedScopes,
    requiredScopesSatisfied,
    validationKind,
    validatedAt
  },

  configGeneration,
  rootPath,
  safeConfigSnapshot,

  publicationPolicyGeneration,
  createPublicLinks,
  acquiredAt
}
```

Do not persist:

```text
OAuth token
Authorization header
PKCE verifier
signed upload URL
signed download URL
raw bearer capability
```

For a fresh mutation, the W5 capability receipt must prove the required Yandex Disk info/read/write capabilities used by WebClip. A manual token whose capability is still `unknown` cannot authorize full mutation.

A newer credential may inspect old unresolved truth only when:

```text
current accountUid == checkpoint.accountUid
AND current capability proves the required read-only reconciliation calls
```

That does not rebind old E/C to the newer `authGeneration`.

---

## 5. `RemoteSaveAdmission v3`

Normal PDF upload remains naturally housed in an upgraded `pendingRemoteSaves` record. J0's new `pendingRemoteMutations` store remains primarily the exact destructive effect home for Mark Read/Delete-to-Trash and compatible future domain mutations.

The old rationale “keep pendingRemoteSaves to avoid a Journal DB bump” is superseded: J0 v8 already happens first. Keeping `pendingRemoteSaves` is now a semantic choice, not migration avoidance.

Conceptual record:

```js
{
  version: 3,
  remoteEffectId,
  physicalOperationId,

  pdfGeneration,
  sourceGenerationId,
  byteLength,
  sha256,

  yandexContextId,
  authGeneration,
  accountUid,
  capabilityReceipt,
  configGeneration,
  rootPath,

  publicationPolicyGeneration,
  createPublicLinks,

  finalizationId,
  journalDatasetGenerationId,
  expectedEntryRevision,

  remotePath,
  targetObservation,

  uploadPhase,
  objectReceipt,

  publicationEffectId,
  publicationPhase,
  publicationReceipt,

  createdAt,
  updatedAt,
  attemptCount,
  lastError
}
```

Immutable after admission:

```text
E/P/G/source/N/H
C/auth/account/capability/config/root
publication policy generation + admitted desired state
F/JG/expected ER
remotePath
```

Only settlement/recovery phases and factual provider observations may advance.

No recovery path rewrites old P/G/H/N/C/F/JG to current global state.

---

## 6. Remote target reservation and preflight

Retain local unresolved reservation identity:

```text
accountUid + rootPath + remotePath
```

Only one unresolved WebClip operation may own that exact target namespace. Capacity pressure rejects a new admission rather than evicting unresolved authority.

Before obtaining/using a signed upload capability for a fresh effect, perform a bounded pure observation under the same account/root context and classify:

```text
missing
same-effect-recovery
exists-unowned
observation-unknown
```

Rules:

- `missing` -> fresh effect may proceed;
- `same-effect-recovery` -> only an already durable same E may reconcile;
- `exists-unowned` -> do not silently overwrite/adopt merely because path/size/hash match; fail or choose a new destination under explicit naming policy;
- `observation-unknown` -> do not start a fresh overwriting effect with unknown target pre-state.

This does not eliminate races with an independent external Yandex client after observation. Exact post-effect verification and eventual L5 remain necessary.

---

## 7. F/JG gate at effect-start linearization

This is the largest refinement over the parent C0 spec.

Immediately before signed PUT can cross the non-cancellable external boundary, one durable transaction must load exact E/F and require:

```text
F.finalizationId == E.finalizationId
F.physicalOperationId == E.physicalOperationId
F.state == admitted
current journalDatasetGenerationId == E.journalDatasetGenerationId
expected ER matches where applicable
E.uploadPhase == prepared
```

Then commit:

```text
E.uploadPhase = started-unknown
```

Only after that commit may PUT begin.

### Clear/import wins first

```text
F revoked or JG changed
-> no PUT
-> cancelled-before-start
-> no Journal append
```

### Effect start wins first

```text
E.started-unknown committed
-> PUT may happen
-> later clear/import revokes F
```

Required truth:

```text
preserve E
continue exact reconciliation
never duplicate blindly
preserve O if remote effect succeeded
suppress Journal finalization
terminal result = remote-complete / journal-suppressed
```

Deleting a checkpoint after effect start is not cancellation proof.

---

## 8. B1/U0 offscreen handoff

Before upload, worker requires current U0 offscreen protocol/schema compatibility.

Offscreen receives exact transport inputs such as:

```text
remoteEffectId
opaque signed upload URL
pdfGeneration
physicalOperationId
expectedPdfBytes N
expectedSha256 H
```

It must read exact B1 payload+metadata and verify G/P/N/H before Blob/fetch.

No fallback to:

```text
tab:<id>
latest retry pointer
same source URL
filename
same length
legacy cache key
```

Signed transport capabilities are never persisted/logged in clear form.

---

## 9. C1 remote content — provider SHA is not yet trusted authority

The parent C0/C1 research planned to compare provider metadata `sha256` with local H. That remains a useful possible fast path, but the project explicitly defers real Yandex L5.

Therefore provider metadata hash cannot be the only production correctness path before L5 proves its semantics for the actual Yandex flow.

Provider-SHA fast path may be enabled only after explicit L5 evidence establishes, as applicable:

```text
field availability
the exact bytes represented
post-upload timing
encoding/normalization
behavior across recovery schedules
```

Until then:

```text
provider sha256 observed != exact remote-content proof by itself
```

---

## 10. Normative provider-independent exact verification

C1 must support this correctness path:

```text
same account/root context
-> pure exact remote object lookup
-> obtain ephemeral download capability
-> current U0 offscreen / bounded worker stream
-> stream exact remote bytes
-> exact byte count
-> incremental/bounded SHA-256
-> compare N/H with sealed B1 receipt
```

Success requires:

```text
remote byte count == N
remote SHA-256 == H
```

Same size with different bytes fails.

The verifier fails immediately if stream bytes exceed expected N or the configured global remote-verification envelope. No unbounded text/base64 conversion is allowed.

Signed download URLs stay ephemeral and are sanitized from diagnostics.

Metadata may still contribute bounded object facts such as path, `resource_id`, `revision`, and modified diagnostics. Do not infer undocumented ordering/immutability semantics from those fields before provider-specific L5.

---

## 11. `RemoteObjectReceipt v2`

Conceptual receipt:

```js
{
  version: 2,
  resourceId,
  revision,
  remotePath,
  byteLength,
  sha256,
  verificationKind,
  verifiedAt
}
```

Permitted exact verification kinds include:

```text
exact-download-sha256
provider-sha256-l5-proven
```

Forbidden success classifications:

```text
path-size-only
resourceId-size-only
revision-size-only
new-target-path-observed
```

Same-effect unknown settlement may promote E to verified only when the durable E still matches exact P/G/H/N/C/path and exact remote bytes are proven. A new physical operation cannot adopt an old/new object solely from content equality.

---

## 12. Publication is a distinct child effect

The upload effect and publish effect have separate external-effect identity:

```text
remoteEffectId      = E_upload
publicationEffectId = E_publish
```

The publication child may be embedded in or linked from the remote-save checkpoint, but it needs its own started-unknown settlement phase.

Before publish starts require:

```text
admitted createPublicLinks == true
current createPublicLinks == true
current publicationPolicyGeneration == admitted publicationPolicyGeneration
required F/JG product authority still permits this child effect
```

If disabled/generation changed before start:

```text
publicationPhase = suppressed-before-start
no publish mutation
```

If admitted with publication disabled, later enable cannot grant old operation publication authority.

Before provider publish mutation, persist:

```text
publicationEffectId
publicationPhase = started-unknown
```

A later disable does not prove cancellation. Reconcile actual public state. Later per-entry revoke/unpublish remains under `P0-069`/`P1-164`.

---

## 13. Reauth/recovery semantics

### Same exact auth/account/context

Continue according to exact E phase.

### Same account, newer auth generation

May perform read-only reconciliation with sufficient read capability. Must not rewrite old E/C and perform new mutation as if old auth were current.

If provider truth proves the old effect never occurred and the user explicitly resumes after reauthorization, use fresh A2 operation authority as required by `P1-161`. A new P may explicitly reuse the immutable sealed G under the B/C retry contract, but old E/C authority is not transferred.

### Different account

No old-effect provider read/mutation under the new account. Preserve the checkpoint and report scope mismatch/reauthorization/manual reconciliation.

### Root/config changed

Old E remains pinned to its admitted root. A miss under the new root is not evidence that the old object disappeared.

---

## 14. Journal finalization after remote success

Remote success does not automatically mean Journal success.

D2 consumes exact evidence:

```text
P
G/N/H/source
C
E
O
F
journalDatasetGenerationId
expected entryRevision where applicable
publication outcome when required
```

If F/JG/ER remain current, perform exact Journal CAS/finalization and persist trusted provenance.

If F was revoked or JG replaced after effect start:

```text
no append/mutation into replacement Journal
remote effect remains completed truthfully
terminal = remote-complete / journal-suppressed
```

If publication is still unknown and local final state depends on it, do not claim fully finalized publication truth.

---

## 15. Imported/historical descriptor boundary

Imported fields such as:

```text
remotePath
publicUrl
resourceId
accountUid
rootPath
operationId
```

remain historical descriptors. They cannot construct:

```text
YandexOperationContext
RemoteSaveAdmission
remoteEffectId
publicationEffectId
physicalOperationId
live destructive capability
```

Only new live provider proof under exact account/root/object authority may establish new live capability according to `P0-022`/`P1-090`/W5. UUID backfill cannot manufacture missing provenance.

---

## 16. Boundedness / W6 composition

Minimum C0/C1 requirements:

1. pending effects are bounded by count/capacity;
2. unresolved authority is never evicted merely to admit newer work;
3. sealed G remains retained/reserved while unresolved E can still require its bytes;
4. remote verification is strictly capped by expected N + global work/deadline budget;
5. recovery uses phase/time indexes/cursors required by `P1-208`;
6. signed transfers participate in existing settlement admission;
7. provider strings/identifiers are bounded before persistence/logging;
8. retries cannot repeatedly download large objects without bounded backoff/fairness;
9. use A0 `resourceReservations` where persistent global byte reservation is required instead of creating a competing capacity authority.

---

## 17. Expected production source impact

### `service-worker.js`

Later production work includes:

```text
captureYandexOperationContextV2
exact W5 capability validation
configGeneration/root snapshot
publicationPolicyGeneration consumption
RemoteSaveAdmission v3 normalization
F/JG/ER binding
bounded target reservation/preflight
prepared -> started-unknown F/JG gate
exact mutation-context helper
same-account read-only reconciliation helper
no automatic rebind after reauth
exact remote-download verification
provider-SHA L5 evidence gate
RemoteObjectReceipt v2
separate publication effect identity
D2 finalization evidence handoff
bounded recovery/capacity integration
```

### `offscreen.js`

Later work:

```text
current U0 protocol only
exact B1 G/P/N/H upload body read
opaque signed upload capability
bounded remote-download streaming/hash where delegated
no global auth/root/config ownership
no generic cache fallback
no persistent signed URL
```

### Journal/D0-D2

C0/C1 consumes the existing canonical Journal identity model:

```text
finalizationId
journalDatasetGenerationId
entryRevision
journalRevision where required by legacy bridge
cas-v1 authority mode
```

It does not create another Journal generation model.

---

## 18. Updated production dependency

Remote exact-v2 activation order is now:

```text
A0
-> U0
-> J0 v8 passive
-> A1
-> A2
-> B0/B1 sealed G/N/H
-> W5 AUTH-CORE exact auth/account/capability
-> D0 early F + safe CAS activation boundary
-> C0 context/admission
-> C1 content/publication settlement
-> D2 finalization composition/closure
```

D/C implementation may be split into coordinated PRs with safe inactive intermediate states, but a new exact-v2 remote PUT must not be activated without the early F/JG pre-start gate. J0 `passive-v8` by itself is insufficient.

---

## 19. Deterministic evidence

Committed tool:

```text
project_tools/test_c0_c1_remote_save_admission_delta_model.js
```

Local research execution before commit:

```text
C0/C1 remote-save admission delta model: PASS; cases=40
```

Coverage includes:

```text
canonical generation names
no token persistence
full mutation capability
same-account read-only reauth reconciliation
different-account rejection
config/root fencing
P/G/H/N/F/JG binding
clear/replace before effect start
clear after effect start
same-target reservation
pre-existing object collision
provider SHA not trusted without L5 gate
exact download H/N fallback
same-size wrong-byte rejection
over-bound stream stop
separate publication effect identity
publication ABA/revocation
Journal-suppressed remote success
fresh P after reauth with explicit G reuse
imported descriptor non-authority
```

Evidence class: **L2 deterministic model** only.

---

## 20. Controlled HTTP/provider simulator

Committed tool:

```text
project_tools/run_c0_c1_remote_verification_http_fixture.js
```

It uses only localhost HTTP. No Yandex account, credential, file, upload, publish/unpublish or destructive action is touched.

Local execution before commit:

```text
C0/C1 controlled HTTP verification fixture: PASS; cases=7
```

It proves the generic bounded-I/O contract:

```text
metadata shape observed without promoting provider SHA authority
exact streamed H/N success
same-size wrong bytes reject
over-N stream stops
short stream rejects
size alone is not content identity
```

Classification:

```text
controlled HTTP environment fixture = L3-like generic I/O evidence
real Yandex semantics                = NOT PROVEN / NOT L5
```

Do not call this Yandex proof.

---

## 21. Official-provider documentation boundary

Fresh public documentation review on 2026-09-10 confirms the Yandex Disk REST API remains the supported file-access/upload API family and Yandex continues to expose an API documentation/sandbox surface. Yandex OAuth documentation continues to expose explicit scope semantics consumed by W5 AUTH-CORE.

This delta deliberately does not promote provider-specific `sha256`, `revision` or `resource_id` semantics to exact authority without the previously agreed real Yandex L5.

---

## 22. Future production GREEN gates

### C0

```text
sealed B1 G/N/H/P required
W5 exact authGeneration/accountUid/full capability required
configGeneration/root captured once
publicationPolicyGeneration captured once
F/JG/ER linked
bounded target reservation
fresh target preflight cannot silently overwrite/adopt unowned object
mutation helper cannot switch auth/account/root
signed URL remains ephemeral
current U0 offscreen required
F/JG gate commits started-unknown before PUT
revoked/stale F before start yields zero external mutation
```

### C1

```text
same E owns unknown-settlement reconciliation
no blind second PUT while settlement unknown
exact remote bytes require N/H
provider-independent exact-download+hash path exists
provider metadata SHA fast path stays disabled until L5 semantics gate
same-size different bytes reject
resourceId/revision/path captured boundedly without overclaiming semantics
generic new-operation existing-object adoption absent
publication has separate effect identity and started-unknown state
publication start requires exact policy generation
remote success cannot bypass F/JG/ER Journal authority
post-clear remote success remains remote-complete/journal-suppressed
reauth cannot rewrite old E/C
imported locator cannot create live effect authority
```

---

## 23. Required evidence before owner closure

Production implementation must later prove source/deterministic schedules plus current Chrome/unpacked-extension integration around:

- exact B1 offscreen G/N/H upload handoff;
- worker restart around `started-unknown`;
- clear/import before and after effect-start boundary;
- incompatible offscreen fail-closed behavior;
- bounded remote verification in actual extension runtime.

Real Yandex L5 remains intentionally final. Required later provider receipts include known-N/H upload, actual metadata fields/timing, exact download byte equality, provider-hash semantics if fast path is enabled, object identity/revision behavior relevant to reconciliation, unknown-settlement behavior where safely reproducible, and publication settlement semantics.

Do **not** perform L5 automatically.

---

## 24. Owner/status decision

No new independent root cause was found. This delta composes existing owners:

```text
P0-022 P0-070 P0-072 P0-073 P0-074 P0-076 P0-078 P0-079
P1-090 P1-138 P1-161 P1-164 P1-184 P1-195 P1-208 P1-210
```

Therefore:

```text
P1-231 = NOT ALLOCATED
Registry status changes = NONE
```

Research/source readiness does not close ACTIVE owners.

---

## 25. Final decision

Retain the original C0/C1 branch as base specification and apply this document as the later Change Impact authority for the affected production-entry details.

```text
main baseline                    = d4f5b268fa3f7ced5a7bc68da52784863d614138
parent C0/C1                     = retained
Change Impact                    = MATERIAL / DELTA REQUIRED
C0 context                       = SOURCE-READY AFTER DELTA
remote effect admission          = SOURCE-READY AFTER DELTA
C1 exact content                 = SOURCE-READY AFTER DELTA
publication child effect         = SOURCE-READY AFTER DELTA
Journal handoff                  = SOURCE-READY AFTER DELTA
production implementation        = NOT STARTED
real Yandex L5                   = DEFERRED / REQUIRED LATER
new owner                        = NO
P1-231                           = UNALLOCATED
release ready                    = NO
```

Central production-entry invariant:

```text
sealed exact local bytes
+ validated exact account/capability/config/publication context
+ live Journal finalization authority
-> durable started-unknown remote effect
-> exact remote bytes proof
-> exact object/publication receipts
-> Journal CAS or truthful local suppression
```

Never reduce this to:

```text
current token + current root + current Boolean + path/size
-> assume right object
-> append Journal success
```
