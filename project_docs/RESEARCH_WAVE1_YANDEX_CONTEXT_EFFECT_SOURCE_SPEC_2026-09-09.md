# WebClip — Wave 1 C0/C1 immutable Yandex operation context + exact remote effect/content source specification — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical Registry blob: `81e5867c0e0936b9524ece8949c53ad4ed83523c`  
Research branch: `research/wave1-yandex-context-effect-source-spec-2026-09-09`  
Mode: **RESEARCH-ONLY / PRE-IMPLEMENTATION SOURCE SPECIFICATION**  
Production implementation: **NOT STARTED**.  
Primary owners: **P0-070, P0-073, P0-074, P0-078, P1-184, P1-190**.  
Supporting owners/boundaries: **P0-022, P0-066, P0-069, P0-072, P0-076, P0-079, P1-076, P1-090, P1-138, P1-158, P1-161, P1-164, P1-177, P1-178, P1-179, P1-183, P1-191, P1-192, P1-198, P1-207, P1-208, P1-210**.

No production file, manifest, Registry, workflow, build, version, tag, release or deployment is changed by this research branch.

---

## 1. Purpose

B0/B1 define one trusted immutable local PDF generation:

```text
P = physicalOperationId
G = pdfGenerationId
H = exact SHA-256
N = exact byte length
S = sourceGenerationId
```

C0/C1 must carry that same authority through Yandex Disk without allowing later global settings/auth changes to retarget the physical operation.

Target chain:

```text
P + G/H/N/S
        |
        v
C0 capture immutable YandexOperationContext C
        |
        +-- authGenerationId A
        +-- accountUid U
        +-- routingGenerationId Rg
        +-- rootPath Root
        +-- publicationPolicyGenerationId Pg
        +-- createPublicLinks policy value
        |
        v
resolve exact final remotePath under C
        |
        v
create durable RemoteEffectCheckpoint E
        |
        v
obtain signed upload capability under C
        |
        v
mark effect started-unknown BEFORE signed PUT settlement
        |
        v
offscreen PUT exact G/H/N/S
        |
        v
provider metadata verification
  type=file
  path exact
  size=N
  sha256=H
  resource_id present
  revision present
        |
        v
RemoteObjectReceipt O
        |
        v
publication policy gate / publication effect receipt
        |
        v
later Journal CAS finalization D0/D2
```

C0/C1 does **not** mean “freeze the OAuth token bytes in persistent storage”. Secrets remain session-only. The durable checkpoint stores only non-secret generation/context identity.

---

# Part I — current production observations

## 2. Current upload context is partly snapshotted and partly global

Current `uploadCachedRecordToYandex()` begins by reading:

```text
getYandexConfig()
```

and derives root/branch/remote path.

It later resolves account UID and writes a pending remote checkpoint containing useful fields such as:

```text
accountUid
rootPath
createPublicLinks
remotePath
expectedPdfBytes
```

This is already a valuable recovery foundation.

However later API calls still route through global current auth/config readers.

---

## 3. Current `yandexApi()` reads the current token per request

Current `yandexApi()` calls:

```text
getValidYandexAccessToken()
```

for each request.

Therefore one long operation may conceptually do:

```text
request 1 -> credential generation A
user disconnects / reauthenticates / replaces token
request 2 -> credential generation B
```

unless the operation explicitly validates an immutable auth generation.

That is the core P0-074 problem.

---

## 4. Current remote verification is primarily type + size + path metadata

Current uploaded/reused PDF verification asks `/resources` for fields such as:

```text
name
path
type
size
modified
public_url
resource_id
```

and requires exact positive `size`.

This materially improves over treating HTTP PUT success as enough, but it still does not prove exact content H.

P1-184 explicitly requires stronger exact object/content creation receipt; path+size cannot authorize adoption/publication.

---

## 5. Current `allowExisting` is too broad for exact-v2

Current retry behavior may, when `allowExisting` is true:

```text
GET remotePath
if type=file and size == expected N
    reuse existing object
```

This is not sufficient after B1.

An unrelated object with the same path and size cannot become the successful object of physical operation P merely because the user pressed retry.

C1 must bind adoption to the same durable remote-effect checkpoint and exact H/N/context.

---

## 6. Current public-link decision reads a captured boolean, but lacks policy generation

Current upload logic uses `config.createPublicLinks` from the earlier config read.

This correctly avoids repeatedly reading the boolean at every line, but cannot distinguish:

```text
policy remained enabled
```

from:

```text
user disabled publication after operation admission but before publish started
```

P0-078 requires explicit generation/revocation semantics.

---

# Part II — external provider capability refresh

## 7. Yandex Disk resource metadata appears to expose SHA-256, revision and resource_id

2026-09-09 external refresh:

- current official Yandex Disk REST landing remains available at `https://yandex.ru/dev/disk/rest/`;
- current ecosystem documentation for YaDisk response objects describes file resource fields `sha256`, `resource_id`, `revision`, `size`, `path`, `type`;
- recent metadata examples from Yandex-Disk tooling show 64-hex `sha256`, `resource_id` and numeric `revision` on file resources.

Useful source examples used for this research:

```text
https://yadisk.readthedocs.io/en/dev/api_reference/response_objects.html
https://github.com/ruarxive/ydiskarc/blob/main/examples/METADATA_STRUCTURE.md
https://yandex.ru/dev/disk/rest/
```

This is strong ecosystem/source evidence that C1 can request provider SHA-256 metadata instead of downloading the entire PDF back solely for hashing.

But this tranche does **not** claim L5 proof for WebClip's real Yandex account.

Required later real-provider test:

```text
upload known PDF
GET private /resources metadata with requested fields
prove sha256 is returned and matches local H
prove resource_id/revision behavior
```

If real API behavior differs, C1 must fall back to an exact download-and-hash verification path rather than weakening the contract to size-only.

---

## 8. Encoding normalization

B0 stores H in base64url form because the existing incremental digest uses that encoding.

Yandex ecosystem examples represent `sha256` as 64 hexadecimal characters.

C1 therefore needs a strict conversion boundary:

```text
remote 64-hex SHA256
-> 32 bytes
-> base64url
-> compare with local H
```

Never compare formatted strings across encodings without normalization.

Reject malformed provider hash:

```text
YANDEX_REMOTE_SHA256_INVALID
```

---

# Part III — C0 `YandexOperationContext`

## 9. Context purpose

One physical Yandex operation must not repeatedly ask global settings:

```text
Who am I now?
Which root is selected now?
Should I publish now?
```

for effect-authorizing decisions.

Instead it captures one immutable non-secret context C before the first remote mutation capability is admitted.

---

## 10. Proposed context shape

```js
{
  version: 1,

  yandexContextId: C,

  authGenerationId: A,
  accountUid: U,

  routingGenerationId: Rg,
  rootPath: Root,

  publicationPolicyGenerationId: Pg,
  createPublicLinks: boolean,

  acquiredAt
}
```

The context may later include explicitly admitted provider/routing fields, but must not contain raw OAuth token or signed transfer URL.

---

## 11. Why one monolithic config generation is not ideal

Current `yandexConfig` also contains fields unrelated to one PDF upload, for example backup cadence.

If every backup-interval edit invalidated a page upload, the authority would be correct but unnecessarily broad.

Preferred C0 generation domains:

```text
authGenerationId
routingGenerationId
publicationPolicyGenerationId
```

The immutable `YandexOperationContext` composes them into one `yandexContextId`.

This satisfies P0-074 without coupling unrelated configuration changes into one false conflict domain.

---

# Part IV — auth generation

## 12. Raw token bytes are not durable authority identifiers

Do not store:

```text
OAuth access token
hash of token as primary durable ID
signed URL
verification code
PKCE verifier
```

inside durable remote checkpoints.

Use worker-issued non-secret:

```text
authGenerationId
```

stored alongside the session credential state.

---

## 13. New credential commit issues new auth generation

A successful transition such as:

```text
fresh PKCE OAuth completion
validated manual-token replacement
```

must issue a fresh:

```text
authGenerationId
```

A later metadata enrichment of the **same credential** must preserve that generation.

This matters because current OAuth completion may write auth once, fetch account info, then write enriched account metadata again.

That enrichment is not a new credential generation.

---

## 14. Disconnect / replacement

Disconnect makes the old effect credential unavailable.

Reconnect/re-auth creates a new generation.

An unresolved old mutation must not silently continue under the new auth generation.

Effect-authorizing rule:

```text
current authGenerationId == context.authGenerationId
AND current accountUid == context.accountUid
```

Otherwise:

```text
pause / auth-required / explicit continuation policy
```

not automatic mutation.

---

## 15. Read-only reconciliation may use a newer credential for the same account

After restart/re-auth, WebClip may need to answer:

> Did the old signed upload actually create the file?

A new credential may be used for **read-only reconciliation** if it first proves:

```text
current accountUid == old context.accountUid
```

This does not authorize a new old-operation mutation.

The distinction is:

```text
effect credential authority
!=
read-only reconciliation credential
```

This avoids storing secrets durably while preserving P0-073/P0-074.

---

# Part V — routing generation / root scope

## 16. Root changes issue a new routing generation

Whenever normalized root path materially changes:

```text
routingGenerationId = new
```

New operations use the new root.

Already admitted operations retain their old:

```text
rootPath
routingGenerationId
remotePath
```

They must never retarget into the new root merely because global settings changed.

---

## 17. Old context may complete under its pinned root

Changing the preferred root does not prove cancellation of an already admitted remote effect.

If a signed upload has started/unknown under old context:

```text
old root remains the reconciliation namespace
```

The UI/settings change influences future operations, not the factual location of the already-started one.

---

# Part VI — publication policy generation

## 18. `createPublicLinks` is not just a captured boolean

Add non-secret:

```text
publicationPolicyGenerationId
```

Increment/change it whenever the publication preference changes.

Context captures:

```text
Pg
createPublicLinks at admission
```

---

## 19. Publication gate immediately before starting publish effect

If context says publication enabled, but the publish effect has not yet started, require:

```text
current createPublicLinks == true
current publicationPolicyGenerationId == context.Pg
```

Otherwise:

```text
publicLinkPhase = suppressed-before-start
```

No publish call.

---

## 20. A context admitted with publication disabled cannot gain authority later

If:

```text
context.createPublicLinks == false
```

then later enabling the setting must not grant the old operation publication authority.

Only a new physical operation/context can gain the new policy.

---

## 21. Already-started unknown publication is not cancellation

If the publish request has crossed the external-effect start boundary and its response becomes unknown:

```text
user disables publication
```

must **not** be interpreted as:

```text
publish was cancelled
```

The system must reconcile provider metadata/public URL truth.

If a link exists, record that truthful outcome. Separate unpublish/revocation policy remains under P0-069/P1-164.

---

# Part VII — `RemoteEffectCheckpoint` v2

## 22. Effect identity

Introduce:

```text
remoteEffectId = E
```

E is distinct from P.

P identifies the full user physical operation.

E identifies one specific external mutation effect within P.

Examples:

```text
signed PDF upload
public-link publication
future move/copy effect
```

---

## 23. PDF upload checkpoint must exist before external effect uncertainty

Suggested checkpoint core:

```js
{
  version: 2,

  remoteEffectId: E,
  physicalOperationId: P,

  pdfGenerationId: G,
  sourceGenerationId: S,
  sha256: H,
  byteLength: N,

  yandexContextId: C,
  authGenerationId: A,
  accountUid: U,
  routingGenerationId: Rg,
  rootPath: Root,

  publicationPolicyGenerationId: Pg,
  createPublicLinks,

  remotePath,

  uploadPhase,
  publicLinkPhase,

  objectReceipt,
  createdAt,
  updatedAt,
  attemptCount,
  lastError
}
```

The exact persistent store may reuse current `pendingRemoteSaves` with a versioned record rather than forcing a Journal DB version bump if no new index/store is required.

---

## 24. Checkpoint identity is immutable

Immutable after effect admission:

```text
E
P
G
S
H
N
C
A
U
Rg
Root
Pg
remotePath
```

Mutable state only:

```text
phase
provider object receipt
publication outcome
attempt/recovery timestamps/errors
```

No recovery path may rewrite G or Root to whatever is current now.

---

# Part VIII — remote-path reservation

## 25. Prevent local competing operations from claiming the same unresolved target

Before signed upload effect admission, inspect bounded active pending remote checkpoints.

Reject another nonterminal local effect with the same:

```text
accountUid
rootPath
remotePath
```

Suggested error:

```text
YANDEX_REMOTE_PATH_RESERVED
```

Current pending remote limit is small enough that a bounded transaction/cursor scan can initially enforce this without new index.

If scale changes, an index can be introduced deliberately later.

---

## 26. Why this matters

Without reservation:

```text
P1 uploads path X, response unknown
P2 uploads same path X
```

and later metadata at X could not be cleanly attributed.

Local reservation removes the WebClip-internal race domain.

It does not claim to prevent an independent external Yandex client from modifying the same account; provider `resource_id/revision/H` remain necessary.

---

# Part IX — signed upload transition

## 27. Signed URL acquisition belongs to context C

Obtain `/resources/upload` only through an effect-authorizing API helper that validates C.

Do not let a later request obtain a new signed URL using whatever auth generation is current while retaining the old E/G checkpoint.

---

## 28. Signed URL remains an opaque capability

Keep the existing P0-033 rule:

```text
never persist/log signed URL path/query in clear text
```

C0/C1 does not need the signed URL itself as durable identity.

Use E/transferId/operation context for correlation.

---

## 29. Mark `started-unknown` before relying on transport response

Immediately before the signed PUT can cross the external side-effect boundary, persist:

```text
uploadPhase = started-unknown
```

Then invoke offscreen transfer.

If the response is lost, restart recovery knows it may have happened.

Never mark the effect “not started” merely because the runtime message timed out.

This composes with P0-072 and P1-210.

---

# Part X — provider exact-content verification

## 30. Target provider metadata fields

After upload/unknown settlement, request at least:

```text
name
path
type
size
sha256
resource_id
revision
public_url
modified
```

Fields not needed for authority may remain optional diagnostics.

---

## 31. Exact verification contract

A remote PDF may become `remote-verified` only when:

```text
type == file
normalized remote path == checkpoint.remotePath
size == N
normalized provider SHA256 == H
resource_id is present and bounded
revision is a positive safe integer
```

If any authority field is absent/mismatched:

```text
remain unverified
```

Do not append Journal success or publish based on size alone.

---

## 32. `RemoteObjectReceipt`

Suggested:

```js
{
  version: 1,

  resourceId,
  revision,
  remotePath,

  byteLength: N,
  sha256: H,

  verifiedAt
}
```

The parent checkpoint already binds O to:

```text
P/E/G/S/C
```

so the object receipt need not duplicate every field if the persisted relation is immutable.

---

## 33. Provider SHA absent or delayed

If real Yandex metadata does not return SHA immediately, bounded verification may poll under the operation/recovery deadline.

If SHA remains unavailable:

```text
remote object is not exact-content verified
```

Fallback options, in preference order:

```text
1. bounded provider metadata retry
2. exact download URL -> offscreen download -> streaming SHA-256 + N
3. remain unknown/unverified and surface recovery requirement
```

Never silently degrade to size-only exact success.

---

# Part XI — exact retry/recovery vs current `allowExisting`

## 34. Generic adoption is removed from exact-v2

For exact-v2:

```text
file exists at path + same N
```

is insufficient.

Likewise:

```text
file exists + same H/N
```

without the same effect checkpoint is not automatically the successful result of this new physical operation.

---

## 35. Same-effect unknown settlement may adopt after exact verification

Permitted recovery:

```text
checkpoint E/P/G/H/N/C exists
uploadPhase == started-unknown
GET exact checkpoint.remotePath
verify H/N/resource_id/revision
-> promote same E to verified
```

This is reconciliation, not a new effect.

---

## 36. New operation encountering an existing file

If there is no matching unresolved/verified checkpoint for the same E/P/G:

```text
do not call it success
```

Possible product outcomes:

```text
name collision error
choose a new available filename
explicit user-visible duplicate policy
```

but not silent adoption.

Suggested code:

```text
YANDEX_EXISTING_OBJECT_UNOWNED
```

---

# Part XII — auth/routing API helper split

## 37. Effect-authorizing API helper

Conceptually:

```js
async function yandexApiWithEffectContext(context, endpoint, options)
```

Before mutation/capability issuance:

```text
read current session credential
require authGenerationId == context.A
require accountUid == context.U
use context-bound routing/path supplied by caller
```

It must not call `getYandexConfig()` to retarget effect routing.

---

## 38. Read-only reconciliation helper

Conceptually:

```js
async function yandexApiForContextReconciliation(context, endpoint, options)
```

May use a newer credential only after proving:

```text
current accountUid == context.U
```

Allowed methods/endpoints must remain read-only.

Do not accidentally expose a generic helper that uses a newer token for mutation.

---

# Part XIII — service folder creation / P1-138 boundary

## 39. Pure reads vs provisioning

Current flows often use `ensureYandexServiceFolders()` which may create directories.

C0 must classify this as mutation/provisioning, not a pure prerequisite read.

If the operation needs to create missing folders, that mutation belongs to C and exact account/root routing.

Read-only reconciliation should not silently create service folders.

This is P1-138 composition.

---

# Part XIV — publication effect state

## 40. Publication phases

Recommended:

```text
not-started
suppressed
started-unknown
verified-published
verified-not-published
```

No boolean alone can represent unknown external settlement.

---

## 41. Public URL normalization remains security-bound

Retain current public URL allowlist/normalization.

Provider `public_url` is external input and must remain bounded.

A public URL receipt does not replace resourceId/H/N proof; it is a publication outcome attached to an already exact object receipt.

---

# Part XV — Journal finalization boundary

## 42. C1 does not directly authorize arbitrary Journal append

After C1:

```text
RemoteEffectCheckpoint verified
RemoteObjectReceipt exact
publication outcome reconciled
```

D0/D2 still must perform Journal generation/revision authority and append/finalization under the same P.

C1 returns evidence; D0/D2 owns local Journal mutation authority.

---

## 43. Journal row target fields after later D2 composition

Expected final provenance includes at least:

```text
physicalOperationId P
pdfGenerationId G
sourceGenerationId S
pdf sha256 H
pdf byteLength N
yandexContextId C
accountUid U
rootPath Root
remotePath
resourceId
resourceRevision
publication outcome/publicUrl if applicable
```

Exact storage shape belongs to D2.

---

# Part XVI — background/restart behavior

## 44. Worker restart with same auth generation/session

If session credential survives and:

```text
A current == C.A
U current == C.U
```

effect-authorized continuation may proceed according to checkpoint phase.

---

## 45. Worker restart after re-auth to same account

If:

```text
A current != C.A
U current == C.U
```

read-only reconciliation may inspect old effect outcome.

Do not start a fresh old-operation mutation automatically.

If reconciliation finds the old effect already succeeded, finalize truthfully.

If it did not happen and a new mutation is required, require explicit continuation/new authority rather than silently switching A.

---

## 46. Worker restart after account switch

If:

```text
U current != C.U
```

no old-effect reconciliation/mutation under current credential.

Return account-context mismatch and keep the old checkpoint.

Do not move checkpoint into the new account namespace.

---

## 47. Root changes during unknown upload

Old checkpoint remains under:

```text
C.U + C.Root + remotePath
```

Do not reinterpret it under current root.

This is the direct P0-073 invariant.

---

# Part XVII — path collision / external concurrency caveat

## 48. What local path reservation proves

It proves WebClip itself does not knowingly run two unresolved local effects against the same remote target namespace.

It does not prove an independent Yandex client cannot create/replace that path.

Therefore C1 still requires:

```text
H
N
resource_id
revision
```

and must retain truthful uncertainty if provider evidence is inconsistent.

---

## 49. Stronger future option if L5 shows provider ambiguity

If real provider behavior cannot distinguish exact creation sufficiently, a stronger architecture is available:

```text
operation-owned random remote staging path
-> exact H/N/resource_id verification
-> separately checkpointed move to user-facing final path
```

This adds a second external effect and service-folder complexity, so it should not be adopted unless real-provider evidence demonstrates the direct final-path receipt is insufficient.

This research therefore treats staging as a contingency, not current required C1 architecture.

---

# Part XVIII — generation storage changes

## 50. `yandexAuth` session record

Add non-secret:

```text
authGenerationId
```

New credential commit creates it.

Same-credential metadata enrichment preserves it.

Legacy session auth lacking generation must be classified as:

```text
legacy-auth-generation
```

and should receive a current generation only at a controlled migration/admission boundary, not as proof about old effects.

---

## 51. `yandexConfig` internal generation fields

Suggested internal-only fields:

```text
routingGenerationId
publicationPolicyGenerationId
```

They are not user-export settings.

User settings export/import should preserve product values but generate fresh internal generations when imported values materially change routing/policy.

Do not import generation IDs from an external settings file.

---

## 52. Config mutation rules

`saveYandexRoot()`:

```text
normalized root unchanged -> generation unchanged
normalized root changed -> new routingGenerationId
```

`saveYandexPreferences(createPublicLinks)`:

```text
value unchanged -> publication generation unchanged
value changed -> new publicationPolicyGenerationId
```

Atomic storage mutation must publish value and matching generation together.

---

# Part XIX — source-change map

## 53. `service-worker.js` C0 expected changes

```text
authGenerationId lifecycle
routingGenerationId lifecycle
publicationPolicyGenerationId lifecycle
captureYandexOperationContext()
validateEffectCredentialForContext()
validateReconciliationCredentialForContext()
yandexApiWithEffectContext()
yandexApiForContextReconciliation()
context-bound service-folder provisioning
path reservation checks
```

---

## 54. `service-worker.js` C1 expected changes

```text
RemoteEffectCheckpoint v2 normalization
remoteEffectId issuance
started-unknown transition before signed PUT settlement
remove generic size-only allowExisting exact path
request sha256/revision/resource_id metadata
strict provider SHA normalization
RemoteObjectReceipt validation
unknown-effect reconciliation
publication phase state machine
operation progress/receipt integration
```

---

## 55. `offscreen.js` C1 changes

B1 already makes offscreen receive exact G/H/N/S.

C1 should not make offscreen responsible for account/root/global config.

Offscreen remains the signed transport executor:

```text
opaque signed URL
exact local G/H/N/S body
transferId/E correlation
transport result/heartbeat
```

Worker owns Yandex context and provider metadata verification.

---

# Part XX — recommended errors

## 56. Context errors

```text
YANDEX_AUTH_GENERATION_MISMATCH
YANDEX_ACCOUNT_MISMATCH                existing semantic may be reused
YANDEX_ROUTING_GENERATION_MISMATCH
YANDEX_CONTEXT_INCOMPLETE
YANDEX_REMOTE_PATH_RESERVED
```

---

## 57. Provider exact-object errors

```text
YANDEX_REMOTE_OBJECT_INVALID
YANDEX_REMOTE_PATH_MISMATCH
YANDEX_REMOTE_SIZE_MISMATCH            existing code can be retained
YANDEX_REMOTE_SHA256_INVALID
YANDEX_REMOTE_SHA256_MISMATCH
YANDEX_REMOTE_RESOURCE_ID_MISSING
YANDEX_REMOTE_REVISION_INVALID
YANDEX_EXISTING_OBJECT_UNOWNED
```

---

# Part XXI — deterministic model

## 58. Model artifact

```text
project_tools/test_wave1_yandex_context_effect_source_spec_model.js
```

Local execution before commit:

```text
Wave 1 Yandex context/effect source specification model: PASS
cases=50
context=P + G/H/N/S + auth/account/routing/publication generations
remote=effect checkpoint -> unknown -> verify sha256+size+resource_id+revision
```

This is L2 model evidence only.

---

## 59. Model coverage — context

Proves:

```text
immutable context capture
missing account rejected
exact effect credential accepted
auth-generation switch rejected for mutation
account switch rejected
new same-account credential allowed for read-only reconciliation
new different-account credential rejected even for reconciliation
root/routing generation exactness
same textual root with newer routing generation does not silently authorize old effect mutation
```

---

## 60. Model coverage — publication policy

Proves:

```text
same enabled Pg -> may start publish
policy disabled before start -> suppress
Pg changed before start -> suppress
admitted-disabled context never gains later authority
already-started unknown publish -> reconcile, not cancel
```

---

## 61. Model coverage — provider metadata

Proves exact verification rejects:

```text
non-file
wrong path
wrong N
wrong H
missing/malformed H
missing resource_id
invalid revision
```

and accepts exact provider metadata.

---

## 62. Model coverage — effect checkpoint/path reservation

Proves:

```text
checkpoint binds P/G/S/H/N/C/path
first unresolved target admitted
second local unresolved same target rejected
different path admitted
different account namespace admitted
```

---

## 63. Model coverage — unknown upload/retry

Proves:

```text
signed upload becomes started-unknown before result
same effect can reconcile exact remote object
size-only cannot verify
generic existing object cannot be adopted
same-effect H mismatch cannot be adopted
G mismatch cannot retarget recovery
```

---

## 64. Model coverage — public link effect

Proves:

```text
publish start -> started-unknown
policy disable before start -> suppressed
unknown + public_url -> verified-published
unknown + no public_url -> verified-not-published
suppressed old effect not reactivated by later enabled policy
```

---

# Part XXII — implementation RED -> GREEN gates

## 65. C0 RED on current main

Current source lacks at least:

```text
explicit authGenerationId
routingGenerationId
publicationPolicyGenerationId
one immutable YandexOperationContext C
mutation-vs-read-reconciliation credential split
```

---

## 66. C0 GREEN gate

Source/deterministic C0 completion requires:

```text
1. new credential has explicit A;
2. same-credential metadata enrichment preserves A;
3. root changes issue Rg;
4. publication changes issue Pg;
5. C captures A/U/Rg/Root/Pg/value once;
6. mutating provider calls cannot switch A/U;
7. routing cannot switch Root/Rg;
8. read-only reconciliation may use newer A only after same-U proof;
9. settings import does not import internal generation IDs;
10. deterministic restart/change schedules pass.
```

---

## 67. C1 RED on current main

Current source still allows exact success/reuse without H/revision-based provider receipt.

Current exact-v2 requirements absent:

```text
E
started-unknown effect state before signed transport settlement
provider sha256 compare
provider revision receipt
same-effect-only existing-object adoption
remote target reservation
```

---

## 68. C1 GREEN gate

Source/deterministic C1 completion requires:

```text
1. E/P/G/H/N/S/C checkpoint before external effect uncertainty;
2. local unresolved same-target reservation;
3. signed upload phase becomes started-unknown before response can be lost;
4. remote metadata requires file/path/N/H/resource_id/revision;
5. provider H equals local B0 H;
6. exact object receipt persisted;
7. generic allowExisting removed from exact-v2;
8. same-effect unknown checkpoint may reconcile exact match;
9. new operation cannot silently adopt existing object;
10. publication uses Pg pre-start gate;
11. started-unknown publication reconciles factually;
12. no Journal success before remote exact receipt + later D-stage authority.
```

---

# Part XXIII — required physical/provider tests

## 69. Real Yandex metadata test

Upload a known small PDF with known:

```text
H_local
N_local
```

Then request:

```text
size
sha256
resource_id
revision
path
type
```

Required receipt:

```text
N_remote == N_local
normalize(sha256_remote) == H_local
resource_id nonempty
revision valid
```

This is L5 provider evidence and remains outstanding.

---

## 70. Unknown signed upload test

Physically induce/approximate lost worker response while signed PUT may complete.

On restart:

```text
no blind second PUT
read checkpoint E
GET provider metadata
verify H/N/resource_id/revision
recover exact success if matched
```

---

## 71. Account switch test

During unresolved checkpoint:

```text
switch/re-auth to different Yandex account
```

Required:

```text
old checkpoint not reconciled or mutated using different account
```

---

## 72. Same-account new credential test

Re-auth same account into new A.

Required:

```text
read-only old-effect reconciliation allowed after UID proof
new old-operation mutation not automatically authorized
```

---

## 73. Publication policy race test

Schedule:

```text
P admitted with public links enabled
upload verified
before publish starts -> disable setting
```

Required:

```text
no publish request starts
```

Second schedule:

```text
publish request starts
response lost
then disable setting
```

Required:

```text
reconcile actual provider public_url outcome
never claim cancelled from setting change alone
```

---

# Part XXIV — evidence boundary

## 74. Evidence produced in this tranche

### L1

Current GitHub source + Registry analysis:

```text
current yandexApi auth lookup behavior
current remote checkpoint structure
current size-based verification/reuse behavior
current publication setting usage
```

### External source/ecosystem refresh

Current Yandex Disk REST landing plus current ecosystem resource-object documentation/examples indicating:

```text
sha256
resource_id
revision
size
```

### L2

Deterministic model:

```text
50/50 PASS
```

### Not produced

```text
no production change
no current production regression run
no real account SHA metadata receipt
no lost-response real Yandex recovery receipt
no provider proof of revision/resource_id behavior under all operations
```

---

# Part XXV — owner conclusions

## 75. P0-073

C0 makes every unresolved remote save permanently account/root scoped.

Still remains ACTIVE until implementation/verification.

---

## 76. P0-074

C0 directly defines the missing immutable auth/account/root/config/publication context.

Still remains ACTIVE until implementation/verification and downstream composition.

---

## 77. P0-078

Publication policy gets a generation and explicit pre-start revocation gate.

Started-unknown effect remains factual/unknown until provider reconciliation.

Still ACTIVE until implementation/verification.

---

## 78. P1-184

C1 replaces path+size adoption with:

```text
same E checkpoint
+ G/H/N/C
+ exact remote H/N
+ resource_id
+ revision
```

This is the intended stronger object/content receipt.

Real provider evidence is still required before closure.

---

## 79. P1-190

C0/C1 never treat imported/historical textual `operationId` as live authority.

Remote checkpoint links to worker-issued P/E/G instead.

P1-190 remains ACTIVE beyond this source spec because imported Journal/OperationLog linking is a broader D/E concern.

---

# Part XXVI — status and next dependency

## 80. Status after research

```text
C0 immutable Yandex context source specification = DEFINED
C1 exact remote effect/content source specification = DEFINED
C0/C1 deterministic model = PASS 50/50
provider sha256 capability = SOURCE/ECOSYSTEM-SUPPORTED, L5 REQUIRED
production implementation = NOT STARTED
critical closure = INCOMPLETE
release readiness = unchanged / NOT READY
```

No new P-code is required.

`P1-231` remains unallocated.

---

## 81. Next Wave 1 research tranche

Dependency-ordered next target:

```text
D0 Journal generation/revision CAS
+
D1 Delete/Mark Read exact domain receipts
+
D2 save finalization composition
```

The next specification must ensure the exact chain:

```text
P
-> G/H/N/S
-> C
-> E/O/publication outcome
-> Journal generation + entry revision CAS
```

cannot be appended/mutated into a replacement Journal generation after clear/import, and destructive Yandex moves remain exact-object checkpointed.
