# WebClip — Wave 1 foundation source-change specification (A0/U0/A1/A2) — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical Registry blob: `81e5867c0e0936b9524ece8949c53ad4ed83523c`  
Research branch: `research/wave1-foundation-source-spec-2026-09-09`  
Mode: **RESEARCH-ONLY / PRE-IMPLEMENTATION SOURCE SPECIFICATION**  
Production implementation: **NOT STARTED**.  
Owners composed: **P0-070, P0-080, P1-125, P1-190, P1-197, P1-198, P1-205, P1-209, P1-210**, with later consumers **P0-079/P0-073/P0-074/P0-076/P0-078/P1-146/P1-156/P1-184**.

No production file, manifest, Registry, build, tag, release or deployment is changed by this research branch.

---

## 1. Scope

The staged implementation plan established the preferred first four foundation tranches:

```text
A0 passive operation-receipt primitives
U0 update/content/offscreen/page protocol fencing
A1 exact content selection protocol
A2 worker-issued physical operation admission
```

This document removes the remaining source-design ambiguity for those four tranches.

The goal is that a future implementation PR does **not** have to invent:

- receipt field names and trust semantics;
- ID roles;
- database indexes;
- capacity/GC behavior;
- protocol message shapes;
- sender/version failure behavior;
- selection-authority receipt shape;
- legacy `operationId` mapping;
- progress compatibility;
- error codes;
- exact helper/function boundaries;
- source-level tests.

The proposed names may be adjusted during implementation for local style consistency, but the invariants and separation of authority must remain.

---

# Part I — proposed constants and bounds

## 2. Protocol versions

Initial internal Wave 1 protocol constants:

```js
const WEBCLIP_WORKER_PROTOCOL_VERSION = 2;
const WEBCLIP_CONTENT_PROTOCOL_VERSION = 2;
const WEBCLIP_OFFSCREEN_PROTOCOL_VERSION = 2;
const WEBCLIP_EXTENSION_PAGE_PROTOCOL_VERSION = 2;
```

These are **not** manifest versions and do not replace `chrome.runtime.getManifest().version`.

Their purpose is payload/schema compatibility.

The protocol number must be compared explicitly before a mutating v2 request is admitted.

---

## 3. Identifier bounds

Proposed initial common bound:

```js
const MAX_OPERATION_IDENTITY_CHARS = 180;
```

Applicable to:

```text
physicalOperationId
clientRequestId
clientCorrelationId
contentRealmNonce
selectionAuthorityId
sourceGenerationId
renderAttemptId
```

Allowed syntax for generic opaque IDs:

```text
[A-Za-z0-9._:-]+
```

Reason:

- compatible with existing operationId conventions;
- safe for IndexedDB/string indexes;
- no whitespace/control characters;
- bounded log/UI representation;
- UUID/prefixed UUID fit easily.

This is a proposed implementation bound, not a new product requirement.

---

## 4. Other proposed bounds

```js
const MAX_OPERATION_KIND_CHARS = 80;
const MAX_OPERATION_SUBJECT_KEY_CHARS = 512;
const MAX_DOMAIN_RECEIPT_ID_CHARS = 240;
const MAX_OPERATION_RECEIPT_JSON_CHARS = 64 * 1024;
const MAX_ACTIVE_OPERATION_RECEIPTS = 256;
const MAX_TOTAL_OPERATION_RECEIPTS = 2048;
const TERMINAL_OPERATION_RECEIPT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
```

### 4.1 Important status of these numbers

They are **recommended starting bounds** for implementation and must be treated as tunable engineering constants.

They are not evidence that production workload requires exactly these values.

The safety invariant is more important than the number:

```text
capacity pressure must never delete unresolved authority
```

If the active unresolved cap is reached:

```text
fail admission of a new operation
```

rather than:

```text
delete oldest unresolved receipt
-> later lookup says not-admitted
```

### 4.2 Terminal retention

Thirty days aligns with the current long stale-remote retention family and gives a bounded support/reconciliation window.

However a domain owner may require a longer barrier. Common GC must never delete a receipt while an exact referenced domain checkpoint still needs it.

---

# Part II — `WebClipOperationReceipts v1`

## 5. Database constants

Proposed:

```js
const OPERATION_RECEIPT_DB_NAME = 'WebClipOperationReceipts';
const OPERATION_RECEIPT_DB_VERSION = 1;
const OPERATION_RECEIPT_STORE = 'receipts';
```

The first implementation should keep this DB service-worker-owned.

No page/offscreen opener is needed for A0/A2.

---

## 6. Store schema

```text
receipts
keyPath = physicalOperationId
```

Recommended indexes:

```text
clientRequestId
  keyPath: clientRequestId
  unique: true

subject
  keyPath: [operationKind, subjectKey]
  unique: false

updatedAt
  keyPath: updatedAt
  unique: false
```

### 6.1 Why clientRequestId is unique

The same caller request correlation must map to at most one physical operation.

If the property is absent for background operations, IndexedDB does not need an empty-string placeholder.

Do not store:

```text
clientRequestId = ''
```

on every background row if a unique index is used.

Omit the property when absent.

### 6.2 Why subject is non-unique

More than one physical operation may legitimately exist for the same logical subject at different times.

P1-210 bounded discovery must be able to return:

```text
0
1
>1 ambiguous
```

rather than forcing false uniqueness.

---

## 7. Base receipt schema

Conceptual v1 record:

```js
{
  schemaVersion: 1,
  identityVersion: 2,
  protocolVersion: 2,

  physicalOperationId,
  clientRequestId?,
  clientCorrelationId?,

  operationKind,
  subjectKey,
  requestFingerprint,

  receiptRevision: 1,
  phase: 'admitted',

  admittedAt,
  updatedAt,
  terminalAt?,

  sourceGenerationId?,

  domainReceiptRef?: {
    kind,
    id
  },

  terminal?: {
    class,
    code,
    summary
  }
}
```

A0 should implement only the fields needed immediately plus forward-compatible bounded optional slots. Do not preload every future remote/Yandex field into the common receipt.

---

## 8. Immutable receipt fields

Once admitted, these fields are immutable:

```text
schemaVersion
identityVersion
physicalOperationId
clientRequestId
clientCorrelationId
operationKind
subjectKey
requestFingerprint
admittedAt
```

Later CAS updates may change:

```text
receiptRevision
phase
updatedAt
terminalAt
domainReceiptRef
sourceGenerationId
bounded terminal summary
```

A mutator must reject attempts to replace immutable identity fields.

---

## 9. Receipt revision CAS

Recommended helper contract:

```js
mutateOperationReceiptCas(
  physicalOperationId,
  expectedReceiptRevision,
  mutator
)
```

Semantics:

```text
read row in one readwrite transaction
verify receiptRevision == expected
apply bounded allowed changes
receiptRevision += 1
updatedAt = now
put
commit
```

Failure:

```text
WEBCLIP_OPERATION_RECEIPT_STALE
```

This prevents two late async paths from silently overwriting newer phase/domain references.

It does not replace subsystem-specific CAS such as Journal generation/revision.

---

# Part III — exact identity roles

## 10. `physicalOperationId`

Minted only by trusted worker code.

Proposed form:

```text
<kind-prefix>:<crypto.randomUUID()>
```

Examples:

```text
pdf-save:...
journal-delete:...
mark-read:...
journal-backup:...
```

The exact prefix is diagnostic only.

Authority is worker minting + durable receipt, not the prefix.

---

## 11. `clientRequestId`

Caller-created bounded opaque correlation for **one admission request**.

Purpose:

- lost outer response lookup;
- exact admission dedup;
- same-request retry without duplicate physical operation.

Invariant:

```text
same clientRequestId
+ same kind/subject/fingerprint
-> return same physicalOperationId
```

Mismatch:

```text
same clientRequestId
+ different immutable request
-> reject
```

Never rebind a clientRequestId to a new P.

---

## 12. `clientCorrelationId`

Presentation/support grouping only.

It may repeat across multiple physical operations.

Examples:

```text
current old content operationId
manual UI support correlation
page progress correlation before P is learned
```

It is not a unique index and never authorizes mutation/finalization.

---

## 13. Legacy `operationId` mapping

For compatibility requests that still contain:

```text
operationId = L
```

map only:

```js
{
  clientCorrelationId: L,
  clientRequestId: '',
  physicalOperationId: ''
}
```

Then worker mints P if the operation is admitted.

Forbidden:

```text
P = L
```

This is the core P1-198 cutover rule.

---

# Part IV — `operationKind`, subject and request fingerprint

## 14. `operationKind`

Prefer a small explicit vocabulary instead of arbitrary caller strings.

Candidate initial kinds:

```text
pdf.local-save
pdf.yandex-save
pdf.yandex-retry
journal.delete
journal.mark-read
journal.backup
journal.import
journal.restore
save-as
settings.import
```

Background maintenance can use its own bounded names if/when migrated.

A0 should not migrate every historical operation type immediately.

---

## 15. `subjectKey`

Subject discovery must not persist arbitrary sensitive/user URLs merely for P1-210.

Preferred subject keys are internal bounded identity strings.

Examples:

```text
PDF save:
source:<browserDocumentId>:<sourceGenerationId>

Journal delete:
journal-entry:<entryId>:<expectedGeneration>:<expectedRevision>

Mark Read:
journal-entry:<entryId>:<expectedGeneration>:<expectedRevision>

Backup:
journal-revision:<revision-id-or-digest>

Import:
staging:<stagingId>:<stagingGeneration>

Save As:
save-as-session:<saveAsSessionId>
```

Avoid:

```text
raw full URL
OAuth token
signed Yandex URL
Authorization header
user comments
PDF bytes
```

If a source identity needs a URL-derived distinction, use the existing confidentiality-safe canonical URL identity owner or a hash, not a raw secret-bearing URL.

---

## 16. `requestFingerprint`

Format:

```text
sha256:<64 lowercase hex chars>
```

The digest input must be an operation-specific canonical immutable request representation.

Do not hash arbitrary raw `JSON.stringify(message)` because:

- object key order/optional fields can vary;
- mutable/presentation fields would break dedup;
- secrets might be pulled into the canonicalization path;
- progress labels and current config reads are not request identity.

Preferred pattern:

```js
makePdfSaveRequestFingerprint({
  operationKind,
  exact source/selection receipt identity,
  readingMode,
  destination class,
  bounded immutable user intent
})
```

Later Yandex destination context is captured by its own owner; do not mix mutable global config into the initial caller request fingerprint unless it is part of the explicit admitted request.

---

# Part V — A0 helper specification

## 17. Normalizers

Suggested helpers:

```js
normalizeOperationIdentity(value, label, { required = false, maxChars = 180 } = {})
normalizeClientRequestId(value)
normalizeClientCorrelationId(value)
normalizePhysicalOperationId(value)
normalizeOperationKind(value)
normalizeOperationSubjectKey(value)
normalizeRequestFingerprint(value)
```

Validation failures are user-safe bounded errors; no raw sensitive payload is included in messages/logs.

---

## 18. DB helpers

Suggested functions:

```js
openOperationReceiptDb()
createOperationReceiptIndexesOnUpgrade(db, tx, event)
getOperationReceiptByPhysicalId(physicalOperationId)
getOperationReceiptByClientRequestId(clientRequestId)
listOutstandingOperationReceiptsBySubject(operationKind, subjectKey, limit)
createOperationReceipt(receipt)
mutateOperationReceiptCas(physicalOperationId, expectedRevision, mutator)
markOperationReceiptTerminal(...)
cleanupTerminalOperationReceipts(...)
```

### 18.1 Read semantics

Like other WebClip IndexedDB owner work, readonly result should publish after transaction completion where P1-086 applies.

Do not use request `onsuccess` as final committed read outcome if a later transaction abort remains possible.

---

## 19. Admission helper

Recommended high-level signature:

```js
async function admitUserOperation({
  clientRequestId = '',
  clientCorrelationId = '',
  operationKind,
  subjectKey,
  requestFingerprint,
  sourceGenerationId = '',
  initialPhase = 'admitted'
})
```

Return:

```js
{
  receipt,
  deduplicated
}
```

### 19.1 Transaction logic

In one transaction or a storage-level uniqueness-safe sequence:

```text
if clientRequestId exists:
  lookup unique index
  if found:
    verify same kind + subjectKey + requestFingerprint
    return existing P
  else:
    create P/receipt

if no clientRequestId:
  create new P/receipt
```

Unique-index collision must be reconciled by reading the existing exact row, not by generating a second P.

---

## 20. Capacity handling

Before admitting a new physical operation:

- bounded count active/unresolved receipts;
- if above `MAX_ACTIVE_OPERATION_RECEIPTS`, fail admission;
- optional cleanup may remove only terminal rows whose retention/domain dependencies permit it;
- no unresolved row eviction.

Proposed error:

```text
WEBCLIP_OPERATION_RECEIPT_CAPACITY
```

The user message can say WebClip has too many unresolved operations and needs reconciliation/cleanup, without exposing internal sensitive data.

---

# Part VI — U0 protocol specification

## 21. Common protocol response shape

Recommended read-only shape:

```js
{
  ok: true,
  surface: 'worker' | 'content' | 'offscreen' | 'journal-page' | 'options-page',
  protocolVersion,
  bundleVersion,
  capabilities: [...bounded strings]
}
```

Do not treat `bundleVersion` alone as schema compatibility.

The internal protocol version is the gate.

---

## 22. Worker protocol info

Suggested helper:

```js
getWorkerProtocolInfo()
```

May return:

```js
{
  workerProtocolVersion: 2,
  bundleVersion: chrome.runtime.getManifest().version,
  operationReceiptSchemaVersion: 1,
  pdfCacheDbVersion: 3 // until B1
}
```

Do not advertise PDF v4 before B1 actually lands.

---

## 23. Content protocol info

Message:

```text
WEBCLIP_CONTENT_PROTOCOL_INFO
```

Response should include at least:

```js
{
  ok: true,
  protocolVersion: 2,
  bundleVersion,
  contentRealmNonce,
  documentActivityGeneration,
  applicationGeneration,
  navigationTransitionGeneration,
  selectionRevision,
  selectionActive
}
```

No selected DOM content needs to be returned merely for handshake.

---

## 24. Offscreen protocol info

Message:

```text
WEBCLIP_OFFSCREEN_PROTOCOL_INFO
```

Response:

```js
{
  ok: true,
  protocolVersion: 2,
  bundleVersion,
  pdfCacheDbVersion: 3, // B1 changes to 4
  activeTransferCount,
  unknownSettlementCount,
  idle
}
```

Counts are sufficient for worker lifecycle decision; do not expose signed URLs/tokens.

---

## 25. Extension-page acknowledgement

Message:

```text
WEBCLIP_EXTENSION_PAGE_PROTOCOL_ACK
```

Request:

```js
{
  protocolVersion: 2,
  bundleVersion,
  pageKind: 'journal' | 'options',
  pageGenerationId
}
```

Worker derives sender document context where available rather than trusting caller to name another document.

---

## 26. P1-209 repair receipt

Current runtime-version marker should be replaced/refined by a durable generation receipt equivalent to:

```js
{
  schemaVersion: 1,
  generation,
  targetBundleVersion,
  targetProtocolVersion,
  phase: 'pending' | 'repairing' | 'completed' | 'evidence-limited',
  createdAt,
  updatedAt,
  completedAt,
  lastError,
  observedIncompatibleContexts,
  acknowledgedCurrentContexts
}
```

Counts/IDs must be bounded.

Do not persist arbitrary page URLs in this repair receipt.

### 26.1 Completion rule

The old behavior:

```text
write current version marker
then try reloads
```

is not sufficient.

Target:

```text
write pending generation
attempt repair
verify current contexts/protocol acknowledgements under bounded rules
only then mark completed
```

Protocol fencing remains authoritative even if repair remains pending.

---

# Part VII — A1 content-selection authority

## 27. Content realm state additions

Inside the isolated `content.js` realm:

```js
state.contentRealmNonce
state.documentActivityGeneration
state.applicationGeneration
state.navigationTransitionGeneration
state.selectionRevision
state.selectionAuthorityId
state.selectionAuthorityReceipt
```

### 27.1 Initialization

```text
contentRealmNonce = crypto.randomUUID()
documentActivityGeneration = 1
applicationGeneration >= 1
navigationTransitionGeneration >= 1
selectionRevision >= 1 according to existing selection lifecycle
```

Use safe integer monotonic increment with wrap/reseed protection if necessary.

---

## 28. Document activity generation

Increment/invalidate on lifecycle boundaries defined by prior research:

```text
pagehide
pageshow persisted=true
```

It is a lifecycle incarnation fence, not a DOM mutation counter.

Do not increment merely because:

- tab loses focus;
- timer fires;
- unrelated DOM node mutates.

---

## 29. Application/navigation generations

Existing/added SPA observation must distinguish:

```text
same browser Document
but new application route/state
```

The receipt includes both:

```text
applicationGeneration
navigationTransitionGeneration
```

The exact source owner P0-080 decides when those advance.

---

## 30. Selection revision

Every material change to the reviewed Include/Exclude set increments `selectionRevision`.

The receipt must bind the reviewed selection state, not merely current root count.

Recommended extra digest:

```text
selectionSnapshotSha256
```

computed over the bounded canonical selection snapshot identity, not arbitrary full DOM.

---

## 31. Selection authority receipt

Conceptual shape:

```js
{
  version: 1,
  protocolVersion: 2,
  contentRealmNonce,
  selectionAuthorityId,
  documentActivityGeneration,
  applicationGeneration,
  navigationTransitionGeneration,
  selectionRevision,
  selectionSnapshotSha256,
  reviewedAt
}
```

The browser `sender.documentId` is appended/validated by the worker; content script does not get to assert another browser document id as trusted authority.

---

## 32. Receipt issue point

Issue/refreeze the receipt at the user review state immediately before Save is allowed.

On Save:

```text
R = reviewed receipt
build metadata
await prepareForPrint(...)
validate SAME R against live private state
if stale -> REVIEW_REQUIRED
else send mutation request carrying R
```

Do not issue R2 after prepare and silently use it for the original click.

---

## 33. Exact probe message

Message:

```text
WEBCLIP_CONTENT_PROBE
```

Worker sends it to:

```js
chrome.tabs.sendMessage(tabId, message, { documentId: expectedDocumentId })
```

Request contains exact expected receipt identity/generation tuple.

Content responds only if its private state still matches.

Conceptual request:

```js
{
  type: 'WEBCLIP_CONTENT_PROBE',
  protocolVersion: 2,
  selectionAuthority: {
    contentRealmNonce,
    selectionAuthorityId,
    documentActivityGeneration,
    applicationGeneration,
    navigationTransitionGeneration,
    selectionRevision,
    selectionSnapshotSha256
  }
}
```

Response:

```js
{
  ok: true,
  current: true,
  protocolVersion: 2,
  sameAuthority: true,
  liveSelectionConnected: true
}
```

A mismatch does not return new authority for automatic retarget.

---

# Part VIII — popup exact injection/start

## 34. `ensureTopContentScript()` target contract

Current implementation ignores `InjectionResult.documentId`.

Target return value:

```js
{
  documentId,
  protocolInfo
}
```

### 34.1 Multi-result handling

For top-frame injection, require one unambiguous expected top-frame result under the current scripting contract.

If the result is missing/ambiguous:

```text
WEBCLIP_REVIEW_REQUIRED / content injection failed
```

Do not fall back to tab-wide start.

---

## 35. `startSelection()` target sequence

```text
ensureTopContentScript(tabId)
-> documentId D
-> exact protocol info for D
-> tabs.sendMessage(WEBCLIP_START_SELECTION, ..., {documentId:D})
```

If D disappeared between injection and start:

```text
fail
```

The user may start a fresh selection on the new document, but the old call is not retargeted.

---

# Part IX — A2 mutation request schema

## 36. Content -> worker save request

Conceptual v2 request:

```js
{
  type: 'WEBCLIP_SEND_PDF_TO_YANDEX', // existing name can remain
  protocolVersion: 2,

  clientRequestId,
  clientCorrelationId,

  selectionAuthorityReceipt,

  meta: bounded current save metadata
}
```

For local PDF equivalent:

```text
WEBCLIP_GENERATE_PDF
```

with same identity envelope.

### 36.1 `clientRequestId`

Generate once per user Save click/admission attempt and retain it through outer-response reconciliation.

A re-send of the same request after unknown response reuses the same clientRequestId.

A user intentionally starts a new physical attempt only when retryDisposition permits it and then receives a new clientRequestId.

### 36.2 `clientCorrelationId`

Current `pageUploadOperationId` can become/display this value during transition.

It can be generated per dialog/attempt but does not own P.

---

## 37. Worker sender envelope

Before `admitUserOperation()`:

derive trusted values from `sender`:

```text
tabId
frameId
documentId
documentLifecycle
incognito
```

Required user-save admission:

```text
sender.tab.id exists
sender.documentId exists
sender.documentLifecycle == active
sender.frameId == expected top-frame contract
incognito == false
protocolVersion compatible
selection receipt exact probe/current
```

Do not trust equivalent caller fields in `meta` if sender provides browser authority.

---

## 38. Worker subject and fingerprint for PDF save

A2 can create an initial source subject such as:

```text
source:<sender.documentId>:<selectionAuthorityId>
```

or include a worker-issued provisional `sourceGenerationId` once P0-070 admission establishes it.

The subject must remain non-secret and bounded.

Fingerprint immutable inputs should include at least:

```text
operationKind
sender.documentId
contentRealmNonce
selectionAuthorityId
documentActivityGeneration
applicationGeneration
navigationTransitionGeneration
selectionRevision
selectionSnapshotSha256
readingMode/destination intent
```

Do not include:

- progress text;
- current tab title unless it changes physical request semantics;
- mutable Yandex global config before C0 defines its admitted context;
- OAuth token;
- full selection snapshot payload if digest/receipt identity is sufficient.

---

# Part X — response and progress compatibility

## 39. Admission response

As soon as durable physical admission exists, worker responses should include:

```js
{
  ok: true,
  identityVersion: 2,
  clientRequestId,
  clientCorrelationId,
  physicalOperationId,
  operationId: clientCorrelationId || physicalOperationId // compatibility display alias only
}
```

The exact operation result fields remain operation-specific.

### 39.1 `operationId` compatibility warning

No internal physical mutation should read the compatibility `operationId` field after A2.

It exists only to avoid breaking old presentation code during the staged cutover.

---

## 40. Progress payload

Conceptual transitional shape:

```js
{
  type: 'WEBCLIP_PAGE_UPLOAD_PROGRESS',
  identityVersion: 2,
  clientRequestId,
  clientCorrelationId,
  physicalOperationId,
  operationId: clientCorrelationId || physicalOperationId,
  stage,
  message,
  percent,
  state,
  ...bounded details
}
```

### 40.1 Internal log key

`recordOperationStage()` must receive:

```text
physicalOperationId
```

not the display alias.

### 40.2 UI pre-admission matching

Before the page knows P, match progress by exact clientRequestId.

After P is known, require P as well where practical.

A repeated clientCorrelationId must not merge two physical operations.

---

# Part XI — Journal/options operation compatibility

## 41. Journal mutating request envelope

For Delete/Mark Read/Backup/import actions migrated in A2 or subsequent owner commits:

```js
{
  protocolVersion: 2,
  clientRequestId,
  clientCorrelationId,
  operation-specific immutable request
}
```

The worker derives/mints P.

Do not permit caller `operationId` to become the log/checkpoint key.

---

## 42. Scope of A2 migration

To keep A2 reviewable, two strategies are acceptable:

### Strategy A — migrate all current user-facing non-idempotent operation admission in A2

Pros:

- one global semantic cut;
- fewer dual modes.

Cons:

- larger patch.

### Strategy B — introduce common admission first for PDF save + core Journal operations, with explicit legacy compatibility classification for remaining operation types

Pros:

- smaller PR.

Cons:

- mixed mode must be explicit and source-tested.

Preferred for this project: **Strategy A for the user-facing operations covered by P1-210**, while background/diagnostic maintenance can stay legacy until separately migrated.

Do not claim universal P1-198 closure if uncovered mutating caller-controlled operation IDs remain.

---

# Part XII — error code contract

## 43. Proposed foundation errors

```text
WEBCLIP_PROTOCOL_MISMATCH
WEBCLIP_REVIEW_REQUIRED
WEBCLIP_CLIENT_REQUEST_MISMATCH
WEBCLIP_OPERATION_RECEIPT_CAPACITY
WEBCLIP_OPERATION_RECEIPT_STALE
WEBCLIP_OPERATION_RECEIPT_NOT_FOUND
WEBCLIP_OPERATION_RECEIPT_AMBIGUOUS
WEBCLIP_OFFSCREEN_PROTOCOL_MISMATCH
WEBCLIP_EXTENSION_PAGE_RELOAD_REQUIRED
```

Later owners add domain-specific codes without overloading these.

---

## 44. `WEBCLIP_PROTOCOL_MISMATCH`

Meaning:

```text
caller/context protocol is not compatible with worker expectation
```

UI action:

- no mutation;
- reload/review as appropriate;
- if an operation may already exist, reconcile it first.

---

## 45. `WEBCLIP_REVIEW_REQUIRED`

Meaning:

```text
selection/source authority is missing/stale/replaced
```

UI action:

- return to selection/review;
- never continue old Save click on new document/application state.

---

## 46. `WEBCLIP_CLIENT_REQUEST_MISMATCH`

Meaning:

```text
same clientRequestId was previously admitted for different immutable request
```

This is a hard fail-closed integrity error.

Do not allocate a new P under the same request id.

---

## 47. Capacity/stale receipt errors

`WEBCLIP_OPERATION_RECEIPT_CAPACITY`:

```text
too many unresolved/common receipts to admit another physical operation safely
```

`WEBCLIP_OPERATION_RECEIPT_STALE`:

```text
CAS update attempted from obsolete receiptRevision
```

Neither should delete or reset existing unresolved authority.

---

# Part XIII — GC specification

## 48. Unresolved rows

An unresolved receipt includes any row whose domain/effect/finalization is not safely terminal.

Never delete solely because:

- age exceeded a normal log retention;
- OperationLog was cleared;
- UI page disappeared;
- worker restarted;
- current Yandex account changed;
- active receipt cap is under pressure.

If recovery evidence ages out, transition to a bounded:

```text
evidence-limited/manual-resolution
```

terminal/degraded state only when the owning domain rules support that classification.

---

## 49. Terminal rows

Eligible for common receipt GC after all are true:

1. common state terminal;
2. referenced domain receipt no longer requires common receipt for recovery;
3. late-settlement/tombstone barrier no longer required;
4. retention elapsed;
5. deletion will not make an unresolved domain effect appear `not-admitted`.

---

## 50. Total capacity

`MAX_TOTAL_OPERATION_RECEIPTS=2048` is proposed as a bounded target, but cleanup may remove only eligible terminal rows.

If terminal cleanup cannot reduce pressure and active/unresolved authority remains high, fail new admission rather than delete truth.

---

# Part XIV — P1-190 / import behavior

## 51. Imported Journal operation identity

Portable import must not create common operation receipts from historical `operationId` text.

Imported values may be retained as:

```text
historicalOperationId
operationProvenance=imported-unverified
```

but no:

```text
clientRequestId index
physicalOperationId
live-local operationLink
```

is reconstructed merely from portable text.

---

# Part XV — exact source-level tests for A0/U0/A1/A2

## 52. A0 tests

Required deterministic tests:

```text
ID bound accept/reject
unique physical IDs
same clientRequest exact dedup
same clientRequest mismatch reject
display correlation repetition allowed
background no-request-id admission
receipt JSON bound
CAS success
CAS stale reject
subject discovery 0/1/>1
OperationLog clear negative control
unresolved capacity fail-closed
terminal GC only
```

---

## 53. U0 tests

```text
worker protocol info exact
content protocol exact
missing protocol reject
old protocol reject
offscreen protocol exact
stale idle offscreen close/recreate
stale active/unknown offscreen block
extension-page stale mutation reject
P1-209 pending marker survives partial repair
completed marker only after acknowledgement contract
```

---

## 54. A1 tests

```text
contentRealmNonce unique per realm
activity generation invalidates after pagehide/pageshow persisted
SPA application generation invalidates
navigation generation invalidates
selection revision invalidates
selection snapshot digest invalidates
post-prepare revalidation passes unchanged state
post-prepare stale state -> REVIEW_REQUIRED
InjectionResult.documentId exact start
reload between inject/start rejected
probe addressed by documentId
probe mismatch does not return replacement authority
```

---

## 55. A2 tests

```text
caller cannot choose P
legacy operationId maps correlation only
clientRequestId exact request -> same P
clientRequestId mismatch -> hard reject
physical admission durable before effect owner begins
progress carries request/correlation/physical IDs
OperationLog uses P internally
same correlation, different requests -> different P
lost response -> request lookup returns P
stale content protocol -> no admission
stale reviewed receipt -> no admission
incognito -> fail closed
non-active lifecycle -> fail closed
wrong frame -> fail closed
```

---

# Part XVI — source-gate expectations

## 56. Foundation source gate should require

Future source should contain evidence equivalent to:

```text
WebClipOperationReceipts
OPERATION_RECEIPT_DB_VERSION = 1
physicalOperationId
clientRequestId
clientCorrelationId
requestFingerprint
subjectKey
receiptRevision
unique clientRequestId index
CAS mutation helper
protocol version constants
content protocol info
contentRealmNonce
documentActivityGeneration
selectionAuthorityId
post-prepare validation
InjectionResult.documentId use
exact documentId send/probe
sender.documentId/documentLifecycle validation
legacy operationId correlation-only adapter
```

and reject evidence of:

```text
physicalOperationId = message.operationId
same clientRequestId rebound to new P
OperationLog clear touching receipt DB
raw URL/token in subjectKey
old protocol silently accepted for trusted v2 mutation
```

---

# Part XVII — proposed file/symbol Change Impact checklist

## 57. `service-worker.js`

Before A0/U0/A2 implementation re-inspect at least:

```text
protocol/version constants
openIndexedDbBounded
runIndexedDbTransactionBounded
normalizeOperationIdInput
makeOperationLogId
startOperationLog
recordOperationStage
finishOperationLog
clearOperationLogs
cleanupExpiredOperationLogs
runtimeSenderKind
assertRuntimeMessageSender
CONTENT_SCRIPT_MESSAGE_TYPES
chrome.runtime.onMessage dispatcher
emitPageUploadProgress
emitJournalOperationProgress
emitJournalBackupProgress
reloadOpenExtensionPagesAfterVersionChange
ensureWebClipContentScript
sendWebClipPageCommand
generatePdfAndDownload
generatePdfAndUploadToYandex
retryCachedPdfUploadToYandex
deleteJournalEntry
moveReadLaterEntryToRead
exportJournalBackupToYandex
prepared Save As checkpoint helpers
```

If any of these changed on main, perform Change Impact before coding.

---

## 58. `content.js`

Re-inspect:

```text
global duplicate-injection guard
state initialization
pageUploadOperationId lifecycle
save/retry event handlers
prepareForPrint call sites
runtime onMessage listener
progress listener
selection add/remove/update lifecycle
SPA/navigation observers
pagehide/pageshow behavior
```

---

## 59. `popup.js`

Re-inspect:

```text
ensureTopContentScript
startSelection
executeScript result handling
WEBCLIP_START_SELECTION send
```

---

## 60. `journal.js`

Re-inspect:

```text
activeDeleteOperationId
activeMoveReadOperationId
activeBackupOperationId
progress port handlers
mutation sendMessage catch paths
Retry controls
operation-log linkage
page reload/version behavior
```

---

## 61. `options.js`

Re-inspect:

```text
manual backup operation id
progress handling
operation log browsing/export
settings import
version display/reload behavior
```

---

## 62. `offscreen.js`

U0 only adds protocol info at foundation stage.

Before B1 later, re-inspect:

```text
PDF_CACHE_DB_VERSION
openPdfCacheDb
pdf cache Blob URL path
pdf-cache-upload path
active transfer registry
idle-close state
runtime listener
```

---

# Part XVIII — protocol/update race schedules

## 63. Old content/new worker

```text
old content cannot answer v2 protocol
new worker receives old save payload
```

Expected:

```text
WEBCLIP_PROTOCOL_MISMATCH / REVIEW_REQUIRED
zero physical admission
zero render
zero external effect
```

---

## 64. New popup injection lands on new document during old selection

Expected:

- new `documentId` receives new selection start;
- old reviewed receipt is not transferred;
- old pending Save click cannot authorize new document.

---

## 65. Lost A2 admission response

```text
clientRequestId R
worker durably admits P
outer response lost
caller sends read-only reconcile / same admission R
```

Expected:

```text
same P
no P2
```

---

## 66. Duplicate clientCorrelationId

```text
C = same display correlation
R1 != R2
```

Expected:

```text
P1 != P2
```

Progress must not merge them after physical IDs are known.

---

## 67. OperationLog clear after admission

Expected:

```text
OperationLog gone
OperationReceipt P remains
```

---

# Part XIX — deterministic research evidence

## 68. Model

Research file:

```text
project_tools/test_wave1_foundation_source_spec_model.js
```

Observed local result:

```text
Wave 1 foundation source specification model: PASS
cases=39
protocol={"worker":2,"content":2,"offscreen":2,"extensionPage":2}
receiptLimits={"idChars":180,"operationKindChars":80,"subjectKeyChars":512,"domainReceiptIdChars":240,"receiptJsonChars":65536,"activeReceipts":256,"totalReceipts":2048,"terminalRetentionMs":2592000000}
```

The model covers:

- bounds and secret/raw-URL rejection;
- stable request fingerprint;
- physical ID uniqueness;
- request dedup/mismatch;
- repeatable display correlation;
- background admission;
- receipt CAS;
- protocol mismatch;
- selection-generation invalidation;
- legacy operation mapping;
- v2 mutation admission;
- receipt size/capacity constants;
- error/message uniqueness;
- proposed DB indexes.

This is L2 architecture/model evidence only.

---

# Part XX — what A0/U0/A1/A2 still do **not** close

## 69. P0-070 not DONE after A2

Physical operation identity + selection receipt are not yet the complete render-window source fence.

B0 is still required.

---

## 70. P0-079 not DONE after A2

PDF cache is still v3/mutable until B1.

---

## 71. P1-184 not DONE

Remote content is not yet exact SHA-256 verified.

---

## 72. P0-074/P0-078 not DONE

Yandex operation context/publication generations land in C0.

---

## 73. P0-076 not DONE

Journal CAS lands in D0.

---

## 74. P1-210 not DONE

A0/A2 create the durable admission lookup foundation, but full domain projection/UI cutover lands in E0/E1.

---

# Part XXI — no new P-code

## 75. Owner classification

No independent new root cause was found.

The source specification refines existing owners:

```text
P1-198 physical identity
P1-210 admission reconciliation
P0-080 content/application selection authority
P0-070 exact save authority
P1-209 extension-page version repair
P1-190 portable operation provenance
```

Therefore:

```text
P1-231 remains unallocated
```

---

# Part XXII — implementation entry criteria for first production PR

## 76. Before coding A0

Require:

1. fresh `main` HEAD;
2. fresh Registry blob;
3. Change Impact if either differs from this document;
4. staged-plan model still applicable;
5. source symbols above re-inspected;
6. no release/version/tag action bundled;
7. production branch/PR scope limited to A0.

---

## 77. A0 PR should be reviewable as passive infrastructure

Acceptance claim must be only:

```text
passive v2 receipt primitives implemented
```

Not:

```text
P1-198 closed
Wave 1 active
save identity fixed
```

---

## 78. U0/A1/A2 activation discipline

Each subsequent PR/commit must state:

```text
trust before
trust after
legacy behavior still allowed?
which caller surfaces use v2?
which source/domain owners remain weak?
```

This prevents a partially migrated build from being described as fully trusted.

---

## 79. Current status after this source-spec tranche

```text
DEEP-RESEARCH-COVERAGE-COMPLETE = YES

Wave 1 architecture                         = DEFINED
Implementation readiness                    = DEFINED
Trusted save-admission protocol             = DEFINED
Operation-context cutover                   = DEFINED
Unified reconciliation                      = DEFINED
Staged implementation DAG                   = DEFINED
Foundation A0/U0/A1/A2 source specification = DEFINED
Receipt DB v1 schema/indexes                 = DEFINED
Protocol v2 message contracts               = DEFINED
Legacy operationId adapter                  = DEFINED
Foundation error code contract              = DEFINED
Foundation GC/capacity policy                = DEFINED

Foundation source-spec L2 model              = PASS 39/39
Production implementation                   = NOT STARTED
Critical closure                            = INCOMPLETE
Release                                     = NOT READY
P1-231                                      = NOT ALLOCATED
```

---

## 80. Next research boundary

The next useful research-only tranche is to specify **B0/B1 source changes at the same level of precision**:

- exact `generatePdfBlob -> generatePdfArtifact` refactor;
- Chrome debugger listener/fence ownership;
- one-pass SHA-256 implementation without unbounded duplicate buffers;
- exact PdfGenerationReceipt schema;
- PDF DB v4 upgrade transaction and legacy v3 preservation;
- retryIndex semantics;
- offscreen protocol v2/v4 exact read contract;
- atomic migration/update failure schedules;
- P0-079 closure matrix mapped to exact functions/tests.

That would leave no architecture decisions for the first trusted PDF-generation implementation tranche.
