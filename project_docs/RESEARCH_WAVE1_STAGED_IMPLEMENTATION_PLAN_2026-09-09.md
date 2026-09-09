# WebClip — Wave 1 staged production implementation plan / commit dependency graph — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical Registry blob: `81e5867c0e0936b9524ece8949c53ad4ed83523c`  
Research branch: `research/wave1-staged-implementation-plan-2026-09-09`  
Mode: **RESEARCH-ONLY / IMPLEMENTATION PLANNING**  
Production files changed by this research branch: **none**.  
Primary owners composed: **P0-023, P0-069, P0-070, P0-072, P0-073, P0-074, P0-076, P0-078, P0-079, P0-080, P1-090, P1-146, P1-156, P1-183, P1-184, P1-190, P1-194, P1-197, P1-198, P1-205, P1-207, P1-209, P1-210**.  
Positive-control owner retained: **P1-215 DONE**.  
Architecture backlog noted but not promoted: **P2-019** shared IndexedDB schema/migration ownership.

This document does **not** authorize implementation, build, version bump, tag, release or deployment. It defines the dependency graph and safe intermediate states to be used when production implementation is explicitly entered.

---

## 1. Purpose

The previous Wave 1 research has already defined:

```text
reviewed selection/application authority
-> worker-issued physical operation
-> exact source/render generation
-> immutable PDF generation {G,N,H}
-> immutable destination/auth/policy context
-> exact external effect receipt
-> Journal CAS finalization
-> read-only user-operation reconciliation
```

The remaining implementation risk is no longer primarily conceptual. It is **cutover risk**:

- changing too many authority concepts in one unreviewable patch;
- enabling a new trust claim before its evidence exists;
- changing one opener of a shared IndexedDB before another opener;
- letting an old extension page/content/offscreen context talk to a new worker as if they shared a protocol;
- upgrading legacy data into stronger provenance it never possessed;
- breaking already-valid recovery mechanisms while replacing generic `operationId` semantics;
- leaving a partially migrated build that looks safer than it actually is.

The target of this tranche is therefore:

```text
one dependency DAG
+ one database choreography
+ one update/restart protocol
+ one trust-level progression
+ per-tranche source/test gates
+ explicit rollback/compatibility rules
```

---

# Part I — source-bound current baseline

## 2. Current database topology

The current production source uses these durable stores:

```text
WebClipPdfRetryCache v3
  openers:
    service-worker.js
    offscreen.js
  stores:
    pdfs
    meta

WebClipJournal v7
  openers:
    service-worker.js
    journal.js
  stores include:
    entries
    urlStats
    meta
    pendingAppends
    pendingDownloads
    pendingRemoteSaves
    importStaging

WebClipOperationLogs v2
  opener:
    service-worker.js
  stores:
    operations
    events

WebClipOffscreenTransfers v1
  openers:
    service-worker.js
    offscreen.js
  store:
    payloads

Prepared Save As
  chrome.storage.session
  PREPARED / STARTED / RELEASED keys
```

### 2.1 Immediate implication

Wave 1 does **not** need to bump every database version.

A new field inside an IndexedDB value does not require a schema upgrade. A version bump is required only when object stores/indexes/key paths must change.

Therefore the preferred initial plan is:

```text
new WebClipOperationReceipts     0 -> 1
WebClipPdfRetryCache             3 -> 4
WebClipJournal                   stays 7
WebClipOperationLogs             stays 2
WebClipOffscreenTransfers        stays 1
```

This minimizes shared-opener migration risk.

---

## 3. Why `WebClipOperationReceipts` should be a new DB

Current OperationLog is explicitly diagnostic and subject to:

- user clear;
- retention expiry;
- size-pressure cleanup;
- P1-197/P1-205 history-generation semantics.

Functional operation admission/reconciliation authority cannot disappear when diagnostics are cleared.

Preferred new DB:

```text
WebClipOperationReceipts v1

store receipts
  keyPath: physicalOperationId

indexes, if needed:
  clientRequestId
  [operationKind, subjectKey]
  updatedAt
  terminalAt / phase
```

Only the service worker needs to open it in the first implementation phase.

Benefits:

1. no existing DB version bump;
2. no worker/page/offscreen shared migration;
3. independent retention semantics;
4. OperationLog remains diagnostics;
5. P1-210 lookup can survive log cleanup;
6. P1-198 physical identity becomes explicit without rewriting historical OperationLog rows.

---

## 4. Current PDF-cache topology requires one atomic package cut

Current worker and offscreen both hard-code:

```text
WebClipPdfRetryCache
version = 3
```

and both open the same extension-origin IndexedDB.

Target P0-079 storage requires:

```text
version = 4

pdfs
meta
retryIndex
```

with immutable generation keys `pdf:<G>`.

Therefore:

```text
service-worker.js PDF v4 change
+
offscreen.js PDF v4 change
```

must be treated as **one package-atomic tranche**.

It is not acceptable to deliberately ship a build where one source file opens v4 while the bundled other opener still requests v3.

Both current openers already close DB handles on `versionchange`, which is a positive migration control.

---

## 5. `WebClipJournal` should stay v7 during Wave 1 foundation

Current worker and `journal.js` both open `WebClipJournal v7`.

The following Wave 1 information can initially be stored as additive record/meta fields without adding stores/indexes:

```text
physicalOperationId
clientRequestId
clientCorrelationId
identityVersion
expectedJournalGeneration
expectedEntryRevision
operationLink
remote-move receipt fields
publication fields
legacy provenance classification
```

Common subject discovery should live in `WebClipOperationReceipts`, not by adding another Journal index merely for P1-210.

Consequently an early Journal v8 migration is unnecessary and would introduce avoidable page/worker version choreography.

If later measurement proves a Journal index is required for performance, that should be a separately justified migration, not hidden inside Wave 1 identity work.

---

## 6. `WebClipOperationLogs` can stay v2

Current key path:

```text
operations.keyPath = operationId
events.keyPath = [operationId, seq]
```

For new identity-v2 records, compatibility can be:

```text
identityVersion = 2
operationId = physicalOperationId
physicalOperationId = physicalOperationId
clientRequestId = ...
clientCorrelationId = ...
```

Legacy records remain:

```text
identityVersion absent
operationId = legacy-conflated textual id
```

No schema migration is needed merely to store the extra fields.

This is preferable to coupling P1-198 with a disruptive OperationLog DB migration owned by P1-197/P1-205.

---

## 7. Current source integration points

### 7.1 `popup.js`

Current path:

```text
executeScript(content.js and guards)
-> ignore InjectionResult.documentId
-> tabs.sendMessage(WEBCLIP_START_SELECTION) without documentId
```

Wave 1 integration point:

```text
ensureTopContentScript()
startSelection()
```

Target:

```text
InjectionResult.documentId D
-> exact protocol handshake for D
-> tabs.sendMessage(..., {documentId:D})
```

### 7.2 `content.js`

Current global duplicate-load barrier:

```text
globalThis.__WEBCLIP_PDF_PROTOTYPE_LOADED__
```

Current user operation correlation:

```text
state.pageUploadOperationId
```

Wave 1 integration points:

- content bundle/protocol handshake;
- contentRealmNonce;
- documentActivityGeneration;
- application/navigation generation;
- selectionRevision;
- immutable reviewed selection receipt;
- post-`prepareForPrint()` receipt revalidation;
- exact probe response;
- clientRequestId/clientCorrelationId progress handling.

The old global marker cannot itself be a protocol compatibility proof.

### 7.3 `service-worker.js` content admission

Current message dispatcher passes caller textual `message.operationId` directly into save execution.

Wave 1 integration points:

- sender.documentId/documentLifecycle/top-frame admission;
- OperationContextV2 admission;
- physicalOperationId minting;
- durable receipt transaction;
- request fingerprint/clientRequestId dedup;
- compatibility alias for old UI correlation.

### 7.4 `generatePdfBlob()`

Current function:

```text
attach debugger
Page.enable
screen media
Page.printToPDF ReturnAsStream
IO.read chunks
atob -> Uint8Array
parts.push
return Blob
```

Wave 1 integration points:

- Probe A/B/C exact source checks;
- root frame/loader/navigation fence;
- renderAttemptId;
- incremental SHA-256 in the same byte loop;
- return exact `{blob, byteLength:N, sha256:H}`;
- associate only after exact source settlement.

### 7.5 local PDF save

Current local temporary cache key:

```text
local-download:<operationId>
```

and pending intent identity also derives from textual operationId.

Wave 1 target:

```text
physicalOperationId P
pdfGeneration G
localDownloadIntentId L
```

No caller correlation may become DownloadItem ownership.

### 7.6 Yandex PDF save

Current Yandex retry cache:

```text
pdfCacheKey(tabId)
```

Current retry:

```text
getValidCachedPdfForTab(tabId)
```

Current remote proof:

```text
expected byte size
remote metadata size
```

Current publication decision:

```text
getYandexConfig().createPublicLinks
```

Wave 1 target requires:

```text
P + sourceGenerationId + G/N/H
immutable Yandex context
account/root scope
auth/config generation
publication generation/phase
remote SHA-256 proof
expected Journal generation
```

### 7.7 Yandex API context

Current `yandexApi()` obtains the currently valid access token for every call.

That must remain available for ordinary current-state UI reads, but long physical operations need a captured immutable operation context whose later stages cannot silently switch authority.

### 7.8 Journal delete / Mark Read

Current Mark Read is a positive partial control because it already writes a checkpoint before the remote move:

```text
readMovePendingAt
readMoveSourcePath
readMoveTargetPath
readMoveOperationId
```

Wave 1 should strengthen/version this existing domain checkpoint rather than creating an unrelated parallel mechanism.

Current delete-to-Trash has weaker equivalent recovery authority and requires explicit destructive receipt composition.

### 7.9 Prepared Save As

Current domain identity already has:

```text
saveAsSessionId
PREPARED
STARTED(downloadId)
RELEASED
```

Wave 1 adds operation provenance additively. It must not replace `saveAsSessionId` with physicalOperationId.

### 7.10 current extension-page version repair

Current worker stores a runtime build version and attempts to reload open extension pages after a version change.

The current marker can be written before every page has positively acknowledged the new code generation. This is the P1-209 root cause.

Wave 1 update safety must compose with P1-209 instead of assuming a one-shot page reload means success.

---

# Part II — update/platform boundary

## 8. Chrome update lifecycle matters to the cutover

Chrome's documented extension update flow means:

- an update is installed when the extension is considered idle;
- in MV3 that primarily means the service worker is not running;
- open extension pages prevent idle installation;
- an active content script does **not** prevent the extension from being considered idle;
- service worker install sequence is `install -> runtime.onInstalled -> activate`;
- extension service-worker `activate` occurs immediately after installation;
- service-worker globals are disposable and must not carry correctness authority.

Therefore Wave 1 may encounter:

```text
new worker package
+
page/tab whose previous selection UI was created by an older content realm
```

The implementation must detect compatibility explicitly rather than infer it from tabId/URL/global markers.

---

## 9. Offscreen update protocol

Chrome permits one offscreen document per installed extension/profile and provides `runtime.getContexts()` to locate it. `createDocument()` resolves after the offscreen page has loaded.

The current worker only checks that an offscreen context with the expected URL exists.

Before the PDF v4 cutover, add a protocol handshake equivalent to:

```text
WEBCLIP_OFFSCREEN_PROTOCOL_INFO

response:
  protocolVersion
  bundleVersion
  pdfCacheDbVersion
  activeTransferCount
  settlementUnknownCount / active transfer ids if safely exposable
```

### 9.1 Compatible response

```text
protocolVersion == expected
pdfCacheDbVersion == expected
-> continue
```

### 9.2 Mismatch with no active/unknown effect

```text
close stale offscreen
await actual close settlement
create new bundled offscreen
handshake again
continue only after match
```

### 9.3 Mismatch with active/unknown transfer

Do **not** close and immediately recreate as if the transfer were canceled.

Target:

```text
block new work
preserve/reconcile domain receipt
report protocol transition pending/effect unknown
```

This composes with P0-072/P1-210.

---

## 10. Content protocol update boundary

Content protocol needs an explicit response such as:

```text
WEBCLIP_CONTENT_PROTOCOL_INFO

protocolVersion
bundleVersion
contentRealmNonce
documentActivityGeneration
applicationGeneration
selectionRevision
```

A stale content realm that cannot answer the expected protocol is not allowed to authorize a previously reviewed save.

Preferred behavior:

```text
old/missing protocol
-> invalidate old reviewed receipt
-> exact reinjection if appropriate
-> require new review/selection admission
```

Never:

```text
old content mismatch
-> inject new content
-> automatically transfer old selection intent into new realm
-> continue old Save click
```

That would be retargeting.

---

## 11. Extension-page protocol boundary

Journal/options pages can remain open long enough to overlap update preparation and already have long-running user workflows.

P1-209 requires a durable pending/completed repair generation.

Target conceptual record:

```text
ExtensionBundleRepairReceipt {
  generation,
  targetVersion,
  phase: pending | repairing | completed | evidence-limited,
  createdAt,
  completedAt,
  acknowledgements
}
```

Correctness must not depend on enumerating every future extension page forever. Instead:

1. existing page reload/repair is best-effort plus durable status;
2. every page-to-worker mutation includes protocol version;
3. worker rejects stale mutation protocol;
4. stale page freezes mutating controls and reloads/reconciles;
5. completion marker is written only after the defined acknowledgement contract is met.

---

# Part III — trust-level progression

## 12. Trust levels

The implementation must never call a record stronger than the evidence installed at that point.

Target progression:

```text
T0 legacy-compat
T1 v2-passive
T2 v2-identity
T3 v2-source-trusted
T4 v2-pdf-trusted
T5 v2-remote-trusted
T6 v2-finalized
T7 v2-ui-reconciled
T8 wave1-trusted-default
```

### T0 — legacy-compat

Current production semantics.

### T1 — v2-passive

New schemas/receipt DB/protocol metadata exist but no old operation is reinterpreted as v2 authority.

### T2 — v2-identity

New operations receive worker-issued physical identity and request/correlation separation.

No PDF/remote claim is yet stronger merely because P exists.

### T3 — v2-source-trusted

Exact source receipt and render fence exist.

### T4 — v2-pdf-trusted

Immutable PDF generation G with N/H is stored create-once and exact source/physical ownership is present.

### T5 — v2-remote-trusted

Immutable Yandex context and exact remote content settlement exist.

### T6 — v2-finalized

Journal generation/revision finalization is composed.

### T7 — v2-ui-reconciled

All covered UI surfaces consume retryDisposition/read-only reconciliation and no longer infer failure from transport loss.

### T8 — wave1-trusted-default

Legacy compatibility paths remain explicitly bounded, all required source/physical gates pass, and Wave 1 is the normal trusted path.

---

# Part IV — commit dependency graph

## 13. Graph overview

Preferred topology:

```text
A0 passive receipts
 |
 U0 update protocol fencing
 |
 A1 content protocol / exact start
 |
 A2 physical operation identity
 |
 B0 exact source/render fence
 |
 B1 PDF cache v4
 |\
 | C0 Yandex immutable context
 |  \
 |   C1 remote V2 exact content
 |    \
 D0 Journal CAS -------- D2 save finalization
 | \
 |  D1 delete/MarkRead domain receipts
 |      \
 E0 common reconciliation core
  \      /
    E1 UI reconciliation cutover
          |
         Z0 closure/activation sweep
```

The textual topological model validates:

```text
A0 > U0 > A1 > A2 > B0 > B1 > C0 > C1 > D0 > D1 > D2 > E0 > E1 > Z0
```

The exact Git commit order may interleave independent nodes such as C0/D0 after their dependencies, but no dependency edge may be inverted.

---

## 14. A0 — passive operation-receipt primitives

### Files

```text
service-worker.js
```

Optional future extraction into a pure bundled helper is acceptable only if it does not introduce remote/external code loading.

### Add

- identity schema constants;
- bounded normalizers;
- physical id mint helper;
- clientRequestId/clientCorrelationId parsers;
- operationKind/subjectKey/requestFingerprint helpers;
- `WebClipOperationReceipts v1` open/read/write helpers;
- receipt capacity/retention primitives;
- pure result serializers.

### Must remain passive

Current save/delete/backup/import handlers still execute old path.

A0 must **not**:

- retarget caller operationId;
- create a v2 physical operation for old handlers;
- change PDF cache;
- change Yandex effect semantics;
- change UI wording.

### Safe intermediate state

```text
trust = v2-passive
production behavior = legacy
```

### Gate

- JS syntax;
- receipt DB create/open/CRUD deterministic test;
- same clientRequestId+same fingerprint dedups;
- mismatch fails closed;
- OperationLog clear does not touch receipt DB.

### Rollback

Because it is additive/passive, old code can ignore the new DB. Do not delete the DB on rollback; unused v1 receipts can be retained/GC'd by explicit version-aware cleanup.

---

## 15. U0 — bundle/protocol fencing and P1-209 composition

### Files

```text
service-worker.js
content.js
journal.js
options.js
offscreen.js
```

`popup.js` may consume the handshake in A1; it need not be part of U0 if no user behavior is activated yet.

### Add

Common constants/concepts:

```text
WORKER_PROTOCOL_VERSION
CONTENT_PROTOCOL_VERSION
OFFSCREEN_PROTOCOL_VERSION
EXTENSION_PAGE_PROTOCOL_VERSION
```

Add read-only protocol-info messages.

Strengthen current runtime version repair into P1-209-compatible:

```text
pending generation
repair attempt
per-surface acknowledgement
completed generation
```

### Safety rule

Protocol mismatch is never silently accepted.

### Offscreen

Before B1 activation, worker must be able to distinguish:

```text
same protocol
stale idle protocol
stale active/unknown protocol
```

### Content/page

Before A2 activation, worker must reject stale mutating clients rather than interpreting old payload shape as trusted v2.

### Safe intermediate state

All legacy operations still use legacy authority, but protocol mismatch can be detected. A compatible old-path request remains allowed only through an explicitly classified compatibility branch.

### Gate

- old content + new worker => no trusted save;
- stale extension page + new worker => mutating request rejected/reload-required;
- stale idle offscreen => close/recreate path;
- stale offscreen with unknown transfer => no close-as-cancel/no duplicate transfer;
- completion marker not written before acknowledgement contract.

---

## 16. A1 — additive exact content protocol and selection receipt

### Files

```text
content.js
popup.js
service-worker.js
```

### `content.js`

Add:

```text
contentRealmNonce
documentActivityGeneration
applicationGeneration
navigationTransitionGeneration
selectionRevision
SelectionAuthorityReceipt
exact probe handler
post-prepare validation
```

Use `pagehide/pageshow persisted` for document activity generation semantics already defined by research.

### `popup.js`

Change injection/start sequence:

```text
executeScript
-> capture InjectionResult.documentId D
-> protocol handshake D
-> WEBCLIP_START_SELECTION addressed to documentId D
```

### `service-worker.js`

Add exact content protocol helpers, but do not yet let a receipt alone become physical operation authority until A2.

### Safe intermediate state

The new receipt may be produced/validated, but old save execution remains legacy until A2.

### Gate

- reload between inject/start cannot target new document silently;
- BFCache activity generation changes stale reviewed receipt;
- SPA transition changes stale receipt;
- post-prepare drift fails;
- protocol mismatch requires review.

---

## 17. A2 — worker-issued physical admission

### Files — package atomic for user-visible identity semantics

```text
service-worker.js
content.js
journal.js
options.js
```

`prepared-save-as.js` can remain unchanged at this point because its domain authority is still sessionId and the calling page can carry transitional provenance.

### Worker

New mutating admission path:

```text
validate sender/protocol/schema
normalize immutable request
compute subjectKey/requestFingerprint
lookup clientRequestId
if same exact request -> existing P
if mismatch -> reject
if absent -> mint P + durable receipt
commit receipt
only then run effect owner
```

### Legacy request mapping

Current:

```text
message.operationId = L
```

Target transitional interpretation:

```text
clientCorrelationId = L
clientRequestId = absent unless new client supplied it
physicalOperationId = worker-generated P
```

Never:

```text
physicalOperationId = L
```

### OperationLog

New v2 log:

```text
operationId = P
physicalOperationId = P
clientRequestId
clientCorrelationId
identityVersion = 2
```

No OperationLog DB version bump.

### Progress compatibility

Transitional payload includes:

```text
operationId = display alias
clientRequestId
clientCorrelationId
physicalOperationId
```

Internal `recordOperationStage()` uses P.

Old UI matching remains compatibility-only until E1.

### Safe intermediate state

```text
trust = v2-identity
```

Physical identity is real, but source/PDF/remote truth is not yet upgraded.

### Gate

- caller cannot choose P;
- two calls with same display correlation get distinct P unless same clientRequestId exact dedup applies;
- lost response can rediscover P by clientRequestId;
- OperationLog clear does not erase admission receipt;
- imported/historical operationId never maps to P.

---

## 18. B0 — exact source/render fence and one-pass digest

### Files

```text
service-worker.js
content.js
```

### Refactor

Prefer a function boundary equivalent to:

```text
generatePdfArtifact(operationContext, sourceReceipt)
```

rather than `generatePdfBlob(tabId)`.

### Exact sequence

```text
Probe A
attach debugger
Page.enable
Page.getFrameTree
capture rootFrameId/rootLoaderId
arm navigation/onDetach fence
Probe B
P0-071 guarded Page.printToPDF
IO.read bytes
incremental SHA-256 + N
clean render fence / cleanup
Probe C
return exact artifact result
```

### Return

```text
{
  blob,
  byteLength: N,
  sha256: H,
  sourceGenerationId,
  renderAttemptId
}
```

### Safety

B0 may return G-independent bytes, but B1 is still required before those bytes become durable trusted retry generation.

### Gate

- existing P0-071 regression remains green;
- same-URL reload between probes rejected;
- root navigation during print rejected;
- BFCache/application/selection drift rejected;
- unselected child navigation negative control;
- one-pass digest matches independent digest on deterministic fixture.

---

## 19. B1 — P0-079 PDF cache v4 immutable generations

### Files — mandatory atomic package

```text
service-worker.js
offscreen.js
```

### Database

```text
WebClipPdfRetryCache v4
```

Add:

```text
retryIndex
```

### Write transaction

```text
pdfs.add(pdf:<G>)
meta.add(pdf:<G>)
retryIndex.put(tabId -> G)
commit
```

### Metadata minimum

```text
identityVersion: 2
physicalOperationId: P
sourceGenerationId: S
pdfGeneration: G
byteLength: N
sha256: H
sealed: true
createdAt
```

### Legacy v3 migration

Do not rename `tab:<id>` into a trusted generation.

Classify old rows as:

```text
legacy-unbound
```

No retryIndex entry is created as trusted authority merely from legacy key/URL.

### Offscreen contract

For PDF-backed operations require:

```text
pdfCacheKey = pdf:<G>
pdfGeneration = G
expectedPdfBytes = N
expectedSha256 = H
```

Before any fetch/blob exposure, offscreen verifies exact sealed metadata/payload agreement.

### Protocol prerequisite

U0 handshake must already be available. A mismatched offscreen opener cannot be allowed to touch the trusted v4 path.

### Safe intermediate state

```text
trust = v2-pdf-trusted
```

Yandex remote verification may still be old/weak until C1, so a trusted local PDF does not imply trusted remote settlement.

### Gate

Use existing P0-079 closure contract:

```text
M01-M06
C01-C06
R01-R05
L01-L05
D01-D05
O01-O08
U01-U04
```

plus explicit protocol-mismatch/update cases.

---

## 20. C0 — immutable Yandex context + policy generations

### Files

```text
service-worker.js
options.js
```

### Additive state

Introduce generation semantics without persisting OAuth token in functional receipts:

```text
authGeneration
configGeneration
publicationPolicyGeneration
```

Distinguish:

```text
replaceYandexAuthCapability()
updateYandexAuthMetadata()
```

so metadata refresh does not look like a capability replacement.

### Capture immutable operation context

At remote operation admission:

```text
accountUid
rootPath
authGeneration
configGeneration
publicationPolicyGeneration
publication requested/admitted state
```

Token remains session/memory capability and must not be persisted into receipt/log.

### User-settings import

Import may change desired config values, but imported document cannot import authority generations.

A successful local config mutation increments the appropriate local generation.

### Safe intermediate state

Ordinary Yandex UI reads can still use current global config. Long v2 operations can capture immutable context; C1 will enforce it through remote transfer/verification.

### Gate

- account switch mid-operation cannot rebind old P;
- root change cannot rebind;
- auth metadata refresh does not increment authGeneration;
- auth replacement does;
- publication `true -> false -> true` does not revive old generation;
- no token/Authorization/signed URL persisted in receipt.

---

## 21. C1 — remote V2 checkpoint and exact content proof

### Files

```text
service-worker.js
offscreen.js
```

### Dependencies

```text
B1 exact local G/N/H
C0 immutable Yandex context
```

### Remote checkpoint V2

Must include refs/values equivalent to:

```text
physicalOperationId
clientRequestId/clientCorrelationId
sourceGenerationId
pdfGeneration G
N
H
accountUid/rootPath
auth/config generation
publication generation/phase
expected Journal generation
remote object id/revision/content proof
```

### Upload

Domain checkpoint is durable before upload effect admission.

### Exact remote proof

Preferred provider metadata fast path if it can authoritatively prove same content digest.

Otherwise offscreen bounded streaming GET computes exact remote SHA-256 and length without returning full PDF via runtime IPC.

Size-only success is no longer sufficient for new v2 rows.

### Legacy remote checkpoints

Existing size-only rows remain:

```text
legacy-unverified / evidence-limited
```

Do not create H retrospectively from current local cache if exact original pairing is absent.

### Safe intermediate state

```text
trust = v2-remote-trusted
```

Journal finalization still needs D0/D2.

### Gate

- same-size wrong bytes rejected;
- wrong account/root rejected;
- remote object identity mismatch rejected;
- publication admitted/unknown not rewritten as canceled;
- restart after upload admission reconciles, never blindly reuploads.

---

## 22. D0 — Journal generation/revision CAS + local operation link

### Files

```text
service-worker.js
journal.js
```

### Avoid early Journal schema bump

Use existing v7 stores with additive fields/meta records.

### Admission capture

Before save/mutation effect:

```text
expectedJournalGeneration
expectedEntryRevision where applicable
```

### Finalization

Require compare-and-set against exact current generation/revision.

### P1-190

New local rows may receive:

```text
operationLink {
  version: 2,
  provenance: live-local,
  entryId,
  physicalOperationId
}
```

Portable import strips/demotes live-local authority.

### Safe intermediate state

Journal writes are generation-safe even before every UI is reconciliation-aware.

### Gate

- clear/import between admission/finalization blocks stale write;
- replacement entry with same textual id cannot be mutated by old operation;
- imported operationId cannot open unrelated local OperationLog;
- OperationLog absence does not invalidate Journal functional receipt.

---

## 23. D1 — destructive domain receipts for Delete and Mark Read

### Files

```text
service-worker.js
journal.js
```

### Mark Read

Strengthen existing `readMove*` checkpoint with:

```text
identityVersion
physicalOperationId
expectedEntryRevision
source resource identity
target resource identity / settlement receipt
account/root/context generation
```

Legacy checkpoint remains a legacy domain checkpoint.

### Delete-to-Trash

Add durable exact move checkpoint before the remote destructive action.

Compose P0-069 publication outcome before declaring fully successful local deletion where applicable.

### Safety

Path/type/size alone cannot prove the same remote object after unknown settlement.

### Gate

- move response lost -> reconcile exact object;
- source/target path reused by different object -> reject;
- remote move verified + Journal generation changed -> do not repeat move and do not mutate replacement row;
- legacy checkpoint not promoted to exact resource provenance.

---

## 24. D2 — end-to-end save finalization

### Files

```text
service-worker.js
```

### Compose

```text
P/S/G/N/H
+ immutable Yandex context
+ remote exact content receipt
+ publication settlement
+ expected Journal generation/revision
```

### Success definition

New Yandex save is successful only when required destination and Journal conditions are exact.

Remote success with Journal pending remains domain-pending, not fully succeeded.

### Gate

- remote verified then clear/import -> no stale append;
- publish unknown -> no success claim;
- publication disabled before admission -> no publish;
- publication admitted before disable -> reconcile actual effect, do not pretend canceled.

---

## 25. E0 — common read-only reconciliation core

### Files

```text
service-worker.js
```

### Add

```text
WEBCLIP_USER_OPERATION_RECONCILE
```

with:

```text
lookupResolution
operationClass
retryDisposition
postcondition/freshness
```

### Lookup

```text
clientRequestId
physicalOperationId
bounded {operationKind, subjectKey}
```

### Ambiguous discovery

```text
>1 exact plausible outstanding receipts
-> ambiguous
-> manual/reconcile only
```

Never choose newest.

### Domain projections

- PDF/Yandex;
- local download;
- Journal delete;
- Mark Read;
- manual backup;
- staged import P1-215;
- Save As P1-156.

### Gate

Use 65-case reconciliation model plus production source gate.

---

## 26. E1 — UI reconciliation cutover

### Files — user-visible atomic tranche

```text
content.js
journal.js
options.js
prepared-save-as.js
```

### Replace catch-path inference

Transport rejection becomes:

```text
result unknown
-> read-only reconcile
```

not:

```text
operation failed
-> Повторить
```

### Retry controls

UI consumes only `retryDisposition`:

```text
new-attempt-allowed -> new physical operation
same-operation-only -> resume exact P/domain receipt
reconcile-only -> Проверить результат
manual-resolution -> no automatic mutation retry
none -> no retry
```

### Progress

Bind to physicalOperationId once admission receipt is known while keeping clientCorrelation display metadata separate.

### Save As

`saveAsSessionId` remains continuation authority.

### Gate

- lost response on Delete/Mark Read/Backup/save does not display false negative;
- reload and bounded subject discovery recover exact outstanding operation where possible;
- stale UI reconcile response cannot overwrite newer UI generation;
- ordinary OperationLog clear does not destroy recovery.

---

## 27. Z0 — Wave 1 activation / closure sweep

### Files potentially touched

```text
service-worker.js
content.js
journal.js
options.js
offscreen.js
popup.js
prepared-save-as.js
```

This should be a small activation/cleanup commit, not another architectural rewrite.

### Remove or quarantine accidental fallbacks

Verify no new v2 path silently falls back to:

```text
tabId identity
same URL identity
plain caller operationId ownership
path+size remote proof
current global Yandex config re-read as operation authority
latest matching operation
OperationLog status as settlement truth
```

### Activation

Only after all prerequisites pass may new trusted operations default to Wave 1 semantics.

Legacy data remains explicitly legacy/evidence-limited rather than converted.

---

# Part V — atomic vs independently reviewable changes

## 28. Independently reviewable / passive commits

Good candidates for separate review:

```text
A0 receipt DB/pure identity helpers
U0 passive protocol-info plumbing
A1 additive content receipt/probe plumbing
C0 Yandex generation/context primitives
```

provided they do not activate stronger trust claims early.

---

## 29. Package-atomic commits

### 29.1 B1 PDF DB v4

Must include:

```text
service-worker.js
offscreen.js
```

because both open the same DB/version.

### 29.2 A2 identity activation

Must coordinate:

```text
service-worker.js
content.js
journal.js
options.js
```

or preserve a deliberately tested compatibility alias in every affected UI surface.

### 29.3 E1 user reconciliation cutover

Must update all covered UI surfaces together or explicitly leave a surface in legacy mode with no claim that Wave 1 UI reconciliation is complete.

---

## 30. Do not use one giant Wave 1 commit

A single commit changing every file at once would make it difficult to establish:

- which owner introduced a regression;
- whether DB migration is correct independently;
- whether identity semantics are correct before remote semantics;
- whether UI reconciliation is hiding backend defects;
- whether rollback is safe.

The DAG allows small reviewable scaffolding commits and narrow activation boundaries.

---

# Part VI — legacy/update compatibility matrix

## 31. Legacy PDF cache v3 after update

Classification:

```text
legacy-unbound
```

Allowed:

- TTL cleanup;
- bounded manual diagnostics;
- potentially user-requested local export only if legacy policy explicitly permits it without claiming exact current-source retry.

Forbidden:

- create trusted G by assigning random UUID;
- connect row to current document based on same URL/tab;
- use as new exact remote-content source.

---

## 32. Legacy remote size-only checkpoint

Classification:

```text
legacy-unverified / evidence-limited
```

Do not mark `remote-verified-v2` merely because a current remote file has the same size/path.

Existing legacy recovery may proceed only at its established evidence level and must not gain stronger publication/Journal authority.

---

## 33. Legacy textual operationId

Classification:

```text
legacy-conflated / historical correlation
```

Never:

```text
physicalOperationId = old operationId
```

---

## 34. Existing P1-215 staged import receipt

P1-215 is DONE and already has worker-issued preview receipt, lease token, owner session, staging generation and revision authority.

Wave 1 should **preserve that domain authority**.

The common operation identity may be legacy or absent, but the exact import domain receipt remains valid according to P1-215.

Do not invalidate a valid staged import merely because it predates OperationContextV2.

---

## 35. Existing exact local DownloadItem checkpoint

P0-039/P0-048 exact DownloadItem ownership/unknown state remains meaningful.

After update:

```text
operationId provenance may be legacy
DownloadItem/domain receipt may still be exact
```

The new common reconciliation layer must not discard stronger domain evidence because common v2 identity is missing.

---

## 36. Existing prepared Save As session

`saveAsSessionId` remains valid domain/session authority within its existing lifecycle.

Common identity classification may be legacy.

Do not invent physicalOperationId for the old session.

---

## 37. Existing Mark Read checkpoint

Current checkpoint already proves a planned source/target path and recovery intent, but not every stronger P1-090/P1-183 object identity condition.

After update classify as:

```text
legacy-domain-checkpoint
```

and reconcile conservatively.

Do not silently rewrite it into a v2 exact resource receipt.

---

# Part VII — update/restart schedules

## 38. Schedule U1 — old content meets new worker

```text
old reviewed selection/content realm A
extension update installs
new worker W2 receives save/probe
```

Expected:

```text
protocol mismatch / missing v2 receipt
-> old review invalid for v2 save
-> review-required
-> zero new print/upload
```

---

## 39. Schedule U2 — old/stale offscreen, no active effect

```text
worker expects protocol 2 / PDF DB4
offscreen reports protocol 1 / DB3
no active/unknown transfer
```

Expected:

```text
close exact stale offscreen
await close settlement
create bundled current offscreen
re-handshake
continue after exact match
```

---

## 40. Schedule U3 — stale offscreen with unknown transfer

Expected:

```text
new work blocked
old effect not declared canceled
preserve/reconcile domain checkpoint
no duplicate upload
```

---

## 41. Schedule U4 — worker restart after physical admission

```text
P admitted durably
worker stops before effect
```

Expected:

```text
receipt rediscovered
same clientRequestId returns P
no P2 duplicate
operationClass running/domain-pending according to checkpoint
```

---

## 42. Schedule U5 — worker restart after upload admission

Expected:

```text
remote effect unknown
read-only/domain reconciliation
no blind second upload
```

---

## 43. Schedule U6 — OperationLog cleared during unresolved operation

Expected:

```text
logs gone
functional OperationReceipt/domain checkpoint remain
reconciliation still works
```

P1-197/P1-205 cleanup generation cannot be used to cancel functional work.

---

## 44. Schedule U7 — extension page protocol mismatch

If no active operation:

```text
reload + acknowledge current protocol
```

If active/unknown operation:

```text
freeze new mutation controls
reconcile exact operation
then reload/repair
```

---

## 45. Schedule U8 — update with P1-215 staged import

Expected:

```text
preserve exact P1-215 receipt/lease rules
resume/cancel through existing domain authority
no generic operation-id takeover
```

---

## 46. Schedule U9 — update with prepared Save As

Expected:

```text
preserve saveAsSessionId lifecycle
common identity may remain legacy
no automatic second downloads.download()
```

---

## 47. Schedule U10 — update with legacy tab cache

Expected:

```text
legacy-unbound
no trusted retryIndex promotion
```

---

## 48. Schedule U11 — update with remote size-only checkpoint

Expected:

```text
legacy-unverified
no v2 hash success fabrication
```

---

## 49. Schedule U12 — newer page/request against older worker during development reload boundary

Normal packaged Chrome update should converge to one installed package, but development/unpacked reload and stale contexts can expose transient mismatches.

Expected:

```text
protocol mismatch
-> fail closed / reload-required
```

Do not implement a broad downgrade path where a v2 reviewed request automatically falls back to v1 mutation semantics.

---

# Part VIII — rollback strategy

## 50. General rollback rule

Rollback must never erase or reinterpret evidence merely because older code does not understand it.

Preferred rule:

```text
unknown newer schema/state
-> do not mutate it
-> fail closed / require newer build
```

not:

```text
normalize into old fields
-> overwrite
```

---

## 51. A0 rollback

New receipt DB may remain unused. No destructive downgrade is needed.

---

## 52. B1 PDF DB v4 rollback caveat

An old v3 bundle cannot safely be expected to open a DB already upgraded to v4 by explicitly requesting version 3.

Therefore B1 is effectively a **forward migration boundary** for that browser profile.

Implications:

- do not deploy B1 until v4 code is independently validated;
- package rollback to old v3 code may fail with `VersionError`;
- engineering rollback should normally be a new forward-compatible fix that still understands DB4, not literal old-package downgrade;
- retain legacy v3 rows inside DB4 rather than deleting them during upgrade.

This makes B1 one of the highest-risk activation commits.

---

## 53. Journal/OperationLog rollback advantage

Because their DB versions remain unchanged initially, additive record fields are naturally ignored by older readers unless old code overwrites the entire record.

Before implementation, inspect every whole-record rewrite path. New fields that must survive old-compatible code should be merged rather than dropped.

This is another reason not to unnecessarily bump Journal/OperationLog schemas in the same tranche.

---

# Part IX — per-tranche RED -> GREEN gates

## 54. A0 gates

```text
syntax
receipt DB model
admission dedup model
OperationLog-clear negative control
```

## 55. U0 gates

```text
protocol handshake model
P1-209 pending/completed repair source gate
old/new page mismatch schedule
old/new offscreen mismatch schedule
```

## 56. A1/A2 gates

Existing research gates:

```text
trusted save-admission source contract
operation-context cutover source contract
21-case save-admission model
27-case operation-context model
```

## 57. B0/B1 gates

```text
P0-071 existing print-guard regression
P0-079 v4 source gate
P0-079 physical closure matrix
exact source navigation/BFCache schedules
one-pass digest independent comparison
worker/offscreen v4 protocol schedule
```

## 58. C0/C1 gates

```text
Yandex context generation model
publication ABA model
same-size-wrong-hash regression
cross-account/root regression
signed-transfer unknown settlement regression
```

L5 provider proof remains required for real external settlement claims.

## 59. D0/D1/D2 gates

```text
Journal generation CAS model
entry replacement ABA
imported operation provenance
Mark Read exact move schedule
Delete-to-Trash exact object/publication schedule
remote success + Journal replacement schedule
```

## 60. E0/E1 gates

```text
65-case reconciliation model
reconciliation source contract
outer transport loss UI schedules
ambiguous discovery negative control
OperationLog clear negative control
page reload subject discovery
```

## 61. Z0 final gates

At minimum:

```text
all JS syntax
all deterministic Wave1 models
all Wave1 source gates
current Stable Chrome protocol/update schedules
current Stable physical PDF schedule
local DownloadItem physical schedule
Yandex L5 external schedule
```

Do not conflate:

```text
Wave1 source/model GREEN
```

with:

```text
release READY
```

Release readiness remains a separate canonical gate.

---

# Part X — Chrome physical schedule for implementation closure

## 62. Update protocol physical scenarios

Use an unpacked extension test profile and explicit version/package transition.

Required observations:

1. content selection open before reload/update, new worker after update;
2. Journal/options page open during development reload equivalent;
3. offscreen document created before reload/update;
4. worker terminated/restarted between operation stages;
5. stale protocol handshake produces fail-closed state rather than mutation;
6. no duplicate download/upload from response loss.

A packaged Web Store update has different installation-idle timing from a forced unpacked reload, so the evidence must state which mode was exercised.

---

## 63. PDF v4 physical scenarios

At minimum:

```text
same tab two concurrent generations A/B
same URL reload between review/render
navigation during print
worker restart after PDF seal
legacy v3 cache present during upgrade
v4 offscreen reads exact G/N/H
wrong G or H rejected before network/download
```

---

## 64. Yandex physical/L5 scenarios

At minimum:

```text
upload exact G
verify exact remote bytes/hash
account switch during operation
root change during operation
createPublicLinks true->false before admission
publish admitted then response unknown
worker restart after upload admission
remote verified then Journal generation replacement
```

Real-provider receipt remains required for L5 closure.

---

# Part XI — dependency rationale by owner

## 65. Why P1-198 precedes P0-079 trusted activation

Without worker-issued physical identity, immutable cache G can still be attached to caller-controlled textual ownership.

Therefore:

```text
P1-198 before trusted P0-079
```

---

## 66. Why P0-080/P0-070 precede trusted PDF cache

Immutable bytes are not sufficient if they belong to the wrong source document/application selection.

Therefore:

```text
reviewed source receipt
+ render fence
before sealed trusted G
```

---

## 67. Why P0-079 precedes P1-184

Remote hash verification must refer to the same immutable local bytes later used by retry/recovery.

A mutable tab slot would permit proving H for one PDF then reading another.

---

## 68. Why P0-074/P0-073 precede remote recovery

A remote receipt cannot be exact if later API stages silently switch account/root/auth context.

---

## 69. Why P0-078 is independent authority

A boolean config snapshot cannot represent revocation/ABA.

Publication requires its own generation and admission phase.

---

## 70. Why P0-076 is last local authority fence

External success does not grant authority to mutate a replacement Journal generation.

---

## 71. Why P1-210 UI cutover is late

If UI reconciliation is implemented before domain receipts are strong, it can merely give weak backend evidence a more convincing presentation.

Therefore E1 must come after the exact domain owners needed by the covered surfaces.

---

# Part XII — implementation review strategy

## 72. Preferred PR/commit discipline

When production implementation begins:

- branch from fresh `main`;
- one owner-focused tranche at a time;
- re-check `main` and Registry before each production write/PR boundary;
- each PR states baseline SHA and trust level before/after;
- no unrelated refactor;
- no manifest version bump during ordinary implementation PRs unless explicitly requested;
- no release artifacts;
- source gates must be attached to the commit they verify;
- physical evidence should identify exact tested commit SHA.

---

## 73. Change Impact before implementation

Because the staged plan is bound to:

```text
main@d4f5b268...
```

if main changes before A0 begins:

1. compare new main to this baseline;
2. inspect changed source symbols listed in this document;
3. rerun/inspect the staged-plan baseline assumptions;
4. update the plan if any authority/migration owner changed;
5. do not mechanically apply this graph to stale source.

---

# Part XIII — deterministic evidence

## 74. Model

Research file:

```text
project_tools/test_wave1_staged_implementation_plan_model.js
```

Local execution environment:

```text
Node available in research container
```

Observed result:

```text
Wave 1 staged implementation plan model: PASS
commits=14
updateSchedules=12
closureGates=13
topology=A0>U0>A1>A2>B0>B1>C0>C1>D0>D1>D2>E0>E1>Z0
```

The model checks:

- dependency graph is acyclic;
- prerequisite order;
- PDF v4 worker/offscreen atomicity;
- DB version choreography;
- monotonic trust-level progression;
- legacy non-promotion;
- protocol mismatch behavior;
- update/offscreen/content policy;
- atomic landing file sets;
- 12 update/restart schedules;
- closure gate ordering.

This is L2 architecture evidence, not production implementation proof.

---

## 75. Platform evidence boundary

Chrome documentation supports the platform assumptions used here:

- extension updates are installed when the extension is idle; an active content script does not itself prevent idle update installation;
- service-worker installation/update runs install -> runtime.onInstalled -> activate, with extension activate immediate after installation;
- service workers may terminate after inactivity and globals must not be correctness state;
- only one offscreen document is open per installed extension/profile;
- `runtime.getContexts()` can discover an offscreen context;
- `offscreen.createDocument()` resolves after its page load.

These platform facts justify protocol fencing but do **not** prove that every conceivable old context survives a real Web Store update. The implementation therefore must not depend on such survival; mismatch handling is defensive and must be verified in physical update/reload schedules.

---

# Part XIV — current decision

## 76. Final staged plan

Preferred production implementation sequence after explicit entry into coding:

```text
A0  passive operation-receipt primitives
U0  update/content/offscreen/page protocol fencing
A1  exact content selection protocol
A2  worker physical-operation admission
B0  exact render source + one-pass N/H
B1  PDF cache v4 immutable generations
C0  immutable Yandex context/policy generations
C1  remote V2 exact-content checkpoint
D0  Journal generation/revision CAS + operation link
D1  Delete/MarkRead exact destructive receipts
D2  save finalization composition
E0  unified read-only reconciliation API
E1  UI reconciliation cutover
Z0  Wave 1 activation/closure sweep
```

Independent C0/D0 work may be reviewed once A2 prerequisites exist, but no trust level may skip the dependency edges above.

---

## 77. What should *not* be implemented as part of the early foundation

Do not add unless independently justified:

- Journal DB v8 solely for Wave 1 fields;
- OperationLog DB v3 solely for identity fields;
- OffscreenTransfers DB v2 solely for message metadata;
- a new P1 code for staged implementation mechanics;
- a broad feature flag that lets weak and strong authority silently mix;
- automatic legacy provenance upgrade;
- a second parallel remote-save subsystem;
- a new GitHub Actions workflow merely to run research gates;
- version/tag/release changes.

---

## 78. Status after this research tranche

```text
DEEP-RESEARCH-COVERAGE-COMPLETE = YES

Wave 1 architecture                        = DEFINED
Wave 1 implementation readiness            = DEFINED
P0-079 v4 closure contract                 = DEFINED
Trusted save-admission protocol            = DEFINED
Operation-context cutover                  = DEFINED
Unified reconciliation contract            = DEFINED
Staged production commit dependency graph  = DEFINED
DB migration choreography                  = DEFINED
Extension update/restart choreography      = DEFINED
Legacy compatibility matrix                = DEFINED
Per-tranche RED->GREEN gates               = DEFINED

Staged implementation-plan L2 model        = PASS
Production implementation                  = NOT STARTED
Critical closure                           = INCOMPLETE
Release                                    = NOT READY
P1-231                                     = NOT ALLOCATED
```

---

## 79. Next research boundary

The Wave 1 architecture and implementation sequencing are now close to saturation. The next useful **research-only** tranche is a **pre-implementation source-change specification for A0/U0/A1/A2**:

- exact proposed helper/function signatures;
- exact persistent record schemas and field bounds;
- message schemas/version negotiation;
- operation-receipt DB indexes/capacity/GC;
- compatibility adapters for current callers;
- exact source-level tests for the first production PR group;
- failure codes and truthful UI transitions;
- line/symbol-level Change Impact checklist.

That would allow the first implementation PR to be produced without making architectural choices during coding.
