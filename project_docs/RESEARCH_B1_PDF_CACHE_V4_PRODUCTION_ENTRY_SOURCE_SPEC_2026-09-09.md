# WebClip — B1 / P0-079 PDF-cache v4 production-entry source specification — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical Registry blob: `81e5867c0e0936b9524ece8949c53ad4ed83523c`  
Research branch: `research/b1-pdf-cache-v4-production-entry-source-spec-2026-09-09`  
Mode: **RESEARCH-ONLY / PRE-IMPLEMENTATION SOURCE SPECIFICATION**  
Production implementation: **NOT STARTED**.  
Release readiness: **NOT READY**.  
Real Yandex provider evidence: **NOT USED / L5 DEFERRED**.  
New P-code: **NO**. `P1-231` remains unallocated.

Primary owner: **P0-079 ACTIVE**.  
Required composition: **P0-023, P0-070, P0-080, P1-194, P1-198**, with later consumers **P0-073, P0-074, P1-184** and U0 protocol fencing.

This tranche follows the already completed A0/U0/J0 and A1/A2 production-entry source specifications. It does not reopen their authority model. It turns the earlier P0-079 research into the exact next source-ready package:

```text
A2 physical operation P
+ exact SourceGenerationReceipt S
+ render attempt R
        ↓
B1 immutable sealed PdfGenerationReceipt G
        ↓
exact local download / exact offscreen upload / exact recovery by G
```

---

# 1. Executive decision

For the exact baseline above:

```text
B1 target storage/schema contract       DEFINED / L2 PASS
B1 v3→v4 migration choreography         DEFINED / current-Chrome controlled L3 PASS
B1 exact-generation consumer contract   DEFINED / L2 PASS
current production source               RED / NOT IMPLEMENTED
P0-079 closure                          NO
release readiness                       NO
```

The final storage package is:

```text
WebClipPdfRetryCache v4

stores:
  pdfs
  meta
  retryIndex
```

The central invariant is:

> `pdfGeneration` is the immutable identity of one exact generated PDF byte object. `tabId`, URL, caller `operationId`, filename, remote path and current retry pointer are not byte identity.

The worker is the **sole structural migration owner** for v4. Offscreen becomes an exact-version non-owner and must abort/fail if it unexpectedly enters `onupgradeneeded`.

Legacy v3 objects are physically preserved by migration but remain:

```text
legacy-unbound
```

They receive no invented `pdfGeneration`, no SourceGenerationReceipt and no exact-operation authority.

---

# 2. Fresh source proof on canonical main

Current source inventory is committed as:

```text
project_tools/test_b1_pdf_cache_v4_current_source_inventory.js
```

Successful execution on the final evidence run reported:

```text
B1 PDF cache v4 current-source inventory: PASS; RED facts=25
```

The principal RED facts are below.

## 2.1 Worker and offscreen both still use v3

Current constants:

```text
service-worker.js: PDF_CACHE_DB_VERSION = 3
offscreen.js:      PDF_CACHE_DB_VERSION = 3
```

Both surfaces can structurally create `pdfs` / `meta` today.

That dual-ownership model must not continue into v4.

## 2.2 Current worker identity is mutable tab alias

Current source defines:

```js
function pdfCacheKey(tabId) {
  return `tab:${tabId}`;
}
```

Retry still starts from:

```text
getValidCachedPdfForTab(tabId)
```

A tab is therefore still acting as both discovery key and physical byte-object identity.

## 2.3 Current writer is atomic across two stores but replace-capable

`putCachedPdf()` already has one useful positive control: payload and metadata are written in one readwrite transaction.

However it uses:

```text
pdfs.put(normalizedRecord)
meta.put(metadata)
```

so the same key may be replaced.

Changing only `tab:5` to `pdf:G` without changing creation semantics would preserve a sealed-generation overwrite race.

## 2.4 Offscreen re-resolves a generic key at use time

For `pdf-cache-upload`, worker currently passes:

```text
pdfCacheKey: cached.key || pdfCacheKey(tabId)
```

Offscreen then calls:

```text
getPdfCacheRecord(spec.pdfCacheKey)
```

and constructs the network Blob from whatever record that key resolves at transfer time.

Likewise `WEBCLIP_CREATE_PDF_CACHE_BLOB_URL` reads by generic `pdfCacheKey`.

No `pdfGeneration`, expected SHA-256 or exact SourceGenerationReceipt is verified there today.

## 2.5 Local-download temporary cache is also generic mutable-key infrastructure

Current local save creates:

```text
local-download:<caller operationId>
```

stores through the same replace-capable cache writer, creates a Blob URL by generic key, then deletes the generic key.

B1 should not keep a separate weaker local-download byte identity. Local download and Yandex upload should consume the same sealed-generation primitive.

## 2.6 Offscreen is currently a second schema owner

`getPdfCacheRecord()` currently opens PDF DB using its own `openDbBounded(..., PDF_CACHE_DB_VERSION, upgrade)` and creates `pdfs/meta` if absent.

Therefore a future v4 implementation that merely changes both numeric constants to `4` would allow worker and offscreen to race as competing schema constructors.

B1 forbids that.

---

# 3. Exact B1 authority object

One generated PDF gets one worker-issued `pdfGeneration`.

Recommended key form:

```text
pdf:<pdfGeneration>
```

The prefix is diagnostic/namespace structure; authority is the worker-issued generation and exact sealed receipt.

Conceptual metadata:

```js
PdfGenerationReceiptV1 {
  schemaVersion: 1,

  pdfGeneration,
  physicalOperationId,
  renderAttemptId,

  sourceGenerationReceipt: {
    browserDocumentId,
    contentRealmNonce,
    documentActivityGeneration,
    applicationGeneration,
    navigationTransitionGeneration,
    selectionRevision,
    selectionAuthorityId,
    selectionSnapshotSha256
  },

  byteLength,
  sha256,             // "sha256:<64 lowercase hex>"
  contentType: "application/pdf",

  createdAt,
  sealedAt,
  sealed: true
}
```

Optional bounded diagnostics such as filename/page count may be stored separately/additively, but may not participate as substitute identity.

Do not make these authority fields:

```text
tabId
raw URL
filename
caller operationId
remote path
Yandex resourceId
byte length alone
```

---

# 4. Separation of payload, sealed receipt and discovery pointer

## `pdfs`

Key:

```text
pdf:<pdfGeneration>
```

Contains exact PDF Blob plus minimal payload identity.

## `meta`

Same exact key.

Contains `PdfGenerationReceiptV1` and bounded non-secret metadata.

## `retryIndex`

Key path:

```text
tabId
```

Conceptual value:

```js
{
  tabId,
  pdfGeneration,
  physicalOperationId,
  sourceGenerationReceipt,
  publishedAt
}
```

`retryIndex` is only a latest-live-retry discovery pointer.

It is not the PDF object.

Operation recovery may ignore `retryIndex` completely and continue using an old exact `pdfGeneration` after the source tab was closed, navigated or reused.

---

# 5. Creation linearization

Before sealing, B1 must already have:

```text
P = exact worker-issued physicalOperationId
S = exact A1 SourceGenerationReceipt
R = render attempt identity
Blob = exact Page.printToPDF result
N = exact byte length
H = SHA-256 over Blob bytes
```

Only then may the sealed generation be committed.

## Required transaction

One readwrite transaction spans:

```text
pdfs
meta
retryIndex
```

For a newly issued G:

```text
pdfs.add(payload G)
meta.add(PdfGenerationReceipt G)

read current retryIndex[tabId]
if pointer CAS permits publication:
    retryIndex.put(pointer -> G)
else:
    do not move pointer

commit
```

The payload and metadata use `add()`, not ordinary replace-capable `put()`.

### Important pointer refinement

A stale pointer CAS does **not** invalidate the operation-owned sealed generation.

Example:

```text
A render started
B finished first and pointer moved -> B
A finishes later
```

Correct result:

```text
A payload/meta commit as exact G-A
retryIndex remains B
```

Do not roll back valid A solely because A is no longer the latest UI retry candidate.

Thus the three stores may share one transaction while pointer publication remains conditional.

---

# 6. SHA-256 timing and memory contract

`sha256` is part of the sealed local truth and must exist **before** any later external content mutation can be admitted.

It cannot be computed after Yandex upload and then retrofitted into metadata.

Current Web Crypto `SubtleCrypto.digest()` accepts SHA-256 but does not support streaming input; the complete input must be available to the digest call. Therefore a naïve `await blob.arrayBuffer(); crypto.subtle.digest(...)` introduces a bounded but potentially large memory copy for the current 48 MiB PDF envelope.

B1 requirement is semantic rather than tied to one hashing implementation:

```text
hash exact Blob bytes before sealing
respect MAX_PDF_BYTES
account hashing work under the W6 byte/work budget
never convert to another unbounded text/base64 representation only to hash
```

For the first implementation, using `Blob.arrayBuffer()` + Web Crypto is acceptable only if the production gate proves the existing 48 MiB envelope plus transient hashing memory remains inside the agreed WorkBudget/runtime envelope. If measurement rejects that amplification, use a reviewed bounded incremental SHA-256 implementation over Blob slices. Do not weaken the durable hash requirement to avoid the memory work.

The digest is content identity/integrity evidence, not operation identity: identical PDFs from different operations still receive different `pdfGeneration` values.

---

# 7. v3 → v4 structural migration

## 7.1 Sole owner

```text
service-worker.js = structural owner
offscreen.js      = exact-version non-owner
```

Worker v4 opener creates `retryIndex` and verifies expected stores.

Offscreen v4 opener:

```text
indexedDB.open(WebClipPdfRetryCache, 4)

if onupgradeneeded:
    abort
    fail PDF_CACHE_SCHEMA_NOT_READY
```

It never creates/migrates cache stores.

## 7.2 Legacy rows

Migration does not rewrite existing `pdfs/meta` records into exact generations.

Rows such as:

```text
tab:<id>
local-download:<legacy correlation>
```

remain physical legacy rows and are classified `legacy-unbound` when encountered by v4 compatibility/cleanup logic.

Initial `retryIndex` is empty.

Forbidden inference:

```text
legacy key + current URL + current tab
-> invented exact pdfGeneration
```

Forbidden inference:

```text
legacy bytes + same size/hash
-> current P/source authority
```

The missing historical source/operation receipt cannot be reconstructed.

## 7.3 Old v3 opener after migration

Current-Chrome fixture confirms that opening version 3 against an already-v4 database fails with `VersionError`.

Therefore a stale v3 offscreen cannot downgrade v4.

## 7.4 Active old offscreen nuance

Current offscreen does not retain the PDF DB connection for the entire signed network upload. It opens/reads the record and closes the DB after the IndexedDB read.

Consequences:

1. an active v3 IDB read may temporarily block the worker's v4 upgrade;
2. after that old connection closes, migration can proceed;
3. if the old offscreen later attempts another `open(...,3)`, it fails `VersionError`;
4. an already-started old signed transfer remains an already-admitted external settlement and cannot be relabeled canceled merely because v4 migrated.

This composes with U0/P0-072 rather than inventing a B1 cancellation rule.

---

# 8. U0 offscreen handoff required by B1

B1 operations must not send v4 exact-generation work to an incompatible offscreen realm.

Required sequence for a new B1 consumer:

```text
worker verifies/migrates PDF DB v4
-> ensure current offscreen protocol
-> require:
     offscreenProtocolVersion == current
     pdfCacheDbVersion == 4
     schemaRole == non-owner-v4
-> only then issue exact pdfGeneration request
```

If an existing old offscreen is busy and cannot be safely replaced under U0:

```text
new B1 operation waits/fails bounded as OFFSCREEN_INCOMPATIBLE
```

It must not silently fall back to v3 generic key access.

Already-admitted old work remains separately reconciled.

---

# 9. Exact offscreen contract

Replace generic byte capability:

```text
pdfCacheKey
```

with an exact contract conceptually equivalent to:

```js
{
  pdfGeneration,
  pdfCacheKey: `pdf:${pdfGeneration}`,
  physicalOperationId,
  expectedPdfBytes,
  expectedSha256,
  contentType: 'application/pdf'
}
```

Before Blob construction or network transfer, offscreen must read both exact payload and metadata in one readonly transaction and publish the result only after transaction completion.

It must verify:

```text
payload exists
metadata exists
same exact pdfGeneration
sealed == true
physicalOperationId matches expected owner where supplied
byteLength == expectedPdfBytes
sha256 == expectedSha256
```

No missing/corrupt exact generation may fall back to:

```text
tab:<id>
latest retry pointer
same URL
same byte length
another generation with same hash
```

The same exact read primitive should serve:

```text
WEBCLIP_CREATE_PDF_CACHE_BLOB_URL
pdf-cache-upload
future exact recovery consumers
```

rather than maintaining one strong Yandex path and a weaker local-download path.

---

# 10. Live retry vs operation recovery

B1 preserves the A1/A2 distinction.

## Live retry from current tab UI

```text
current trusted SourceGenerationReceipt S-current
-> retryIndex[tab]
-> require pointer.sourceGenerationReceipt == S-current
-> exact pdfGeneration G
-> read exact sealed G
```

If source mismatch:

```text
retry unavailable / review required
```

Do not search for another same-URL generation.

## Recovery of an already admitted operation

```text
durable operation/domain receipt names exact G
-> read exact sealed G
```

It does **not** need the old source tab to still exist and does not consult the latest tab pointer.

This is why P0-023 has two semantic modes rather than one generic `retry(tabId)` API.

---

# 11. Cleanup and GC

Owner-driven cleanup always names exact G.

```text
deleteExactPdfGeneration(G)
```

Within a readwrite transaction:

1. read current `retryIndex[tabId]` if relevant;
2. delete exact `pdf:G` payload/meta only when lifecycle/retention owner permits;
3. remove retry pointer only if it still references G;
4. preserve any newer pointer B;
5. publish success only after transaction completion.

A late A cleanup cannot delete B because B has another primary key.

A late A cleanup cannot clear B because pointer removal is compare-and-remove.

TTL/quota cleanup remains subject to P1-194 and W6 reservation/retention rules. B1 does not grant permission to evict bytes still required by unresolved exact operation receipts.

---

# 12. Unknown IndexedDB settlement

A caller timeout is not proof that the creation transaction did not commit.

If sealing G is locally unknown:

```text
do not put/rewrite G
```

Reconcile exact G after the actual transaction barrier:

```text
payload + metadata exact and matching expected H/N/P/S
    -> adopt existing committed G

exact G absent after authoritative settlement
    -> retry/new create according to the same operation policy

partial/mismatched G
    -> corruption/conflict; fail closed
```

This is a direct application of P1-086/late-settlement discipline to sealed generation creation.

---

# 13. Cross-store corruption

Invalid states:

```text
payload without metadata
metadata without payload
generation mismatch
sealed=false for exact consumer
byte length mismatch
hash receipt mismatch
```

Normal local download, retry and upload must fail closed.

Maintenance may remove proven orphan/corrupt state under its own bounded rules; it may not reconstruct authority from `retryIndex` or current page state.

---

# 14. Source-level production impact map

## `service-worker.js`

Expected B1 changes:

```text
PDF_CACHE_DB_VERSION 3 -> 4
add retryIndex store constant
worker-only v4 migration/verification
PdfGenerationReceipt normalizers
worker-issued pdfGeneration
SHA-256 before seal
create-once seal transaction
exact generation read/delete/reconcile
live retry pointer CAS
replace generic cache use in local-download path
replace generic cache use in Yandex transfer spec
U0 offscreen protocol/schema requirement
legacy-unbound classification/cleanup
```

Do not activate P1-184 provider verification in this PR.

## `offscreen.js`

Expected B1 changes:

```text
PDF_CACHE_DB_VERSION 4
remove structural PDF-cache ownership
abort if v4 open enters onupgradeneeded
advertise protocol/schema role through U0
read exact payload+metadata pair
verify G/N/H/P before Blob/fetch
no generic-key fallback
versionchange close handler for any short-lived open connection
```

## `content.js`

B1 should not invent cache generations in content. It consumes A1/A2/A2 handoff only indirectly.

No caller-generated `pdfGeneration`.

## `manifest.json`

No B1 permission or minimum-Chrome change is known to be required.

---

# 15. Production tranche boundary

Preferred B1 production PR remains deliberately narrow:

```text
1. v4 schema + migration ownership
2. exact PdfGenerationReceipt/sealing primitive
3. exact local-download/offscreen consumer migration
4. live retry pointer semantics
5. deterministic source/model tests
6. current Chrome migration/atomicity regression
7. Closure Sweep for P0-079/P0-023/P0-070/P1-194 dependencies
```

Do not include in the same PR:

```text
Yandex auth/account redesign
P1-184 remote checksum/provider truth
publication-policy redesign
Journal D0 CAS activation
release/version/tag work
```

The purpose is to establish one trustworthy local byte object before remote-content truth is added.

---

# 16. Evidence

## 16.1 L2 target model

Committed:

```text
project_tools/test_b1_pdf_cache_v4_production_entry_model.js
```

Final evidence run:

```text
B1 PDF cache v4 production-entry model: PASS; cases=38
```

The model covers create-once sealing, immutable reads, stale pointer cleanup, exact live retry, operation recovery, legacy-unbound migration, exact offscreen H/N checks, unknown-commit reconciliation, cross-store corruption and A2 P/S handoff.

## 16.2 Current-source inventory

Committed:

```text
project_tools/test_b1_pdf_cache_v4_current_source_inventory.js
```

Final evidence run:

```text
B1 PDF cache v4 current-source inventory: PASS; RED facts=25
```

This is intentionally RED-state evidence; it does not claim current production has B1.

## 16.3 Controlled current-Chrome L3

Committed successful harness:

```text
project_tools/run_b1_pdf_cache_v4_chrome_idb_fixture_v2.js
```

Final execution:

```text
run       34375121530
job       102545862635
commit    8c5e0496baa86d6526f6e695b05168dfcac243aa
runner    Ubuntu 24.04.5
Node      v22.23.2
Chrome    Google Chrome for Testing 153.0.8010.36
```

Result:

```text
B1 PDF cache v4 Chrome IndexedDB fixture: PASS; cases=9
```

Cases:

```text
PASS v3-v4-structural
PASS legacy-preserved-index-empty
PASS old-v3-opener-versionerror
PASS nonowner-abort-preserves-v3
PASS stale-opener-blocks-until-close
PASS atomic-seal-pointer
PASS duplicate-create-no-overwrite
PASS abort-rolls-back-all
PASS owner-migrates-after-nonowner-abort
```

The first attempted fixture run selected an unsuitable CDP context and failed with IndexedDB `SecurityError`. It is not evidence against the design. The harness was corrected to require the exact HTTP fixture origin; the final run above is the evidence receipt. The superseded failed harness was removed from the final research branch.

This L3 proves Chromium IndexedDB choreography, not WebClip production closure and not Yandex behavior.

---

# 17. External platform note for hashing

MDN's current `SubtleCrypto.digest()` documentation confirms SHA-256 support and explicitly states that `digest()` does not support streaming input: the entire input must be read into memory before digesting.

This is external platform evidence only. It justifies treating transient hashing memory as a W6 WorkBudget concern; it does not prescribe the exact eventual implementation.

---

# 18. Acceptance gates for future B1 production PR

At minimum:

1. both worker and offscreen declare v4, but only worker may structurally upgrade;
2. offscreen entering `onupgradeneeded` aborts/fails;
3. v3 legacy rows remain present or bounded-cleanable but never acquire exact authority;
4. each rendered PDF gets a worker-issued unique `pdfGeneration`;
5. payload and metadata use create-once exact keys;
6. duplicate G with different bytes/hash cannot overwrite;
7. exact SHA-256 is persisted before later external-content admission;
8. source receipt and P are persisted in the sealed metadata;
9. exact local-download Blob creation consumes G, not generic caller key;
10. exact Yandex upload preparation consumes G/N/H, without generic-key fallback;
11. live retry compares current exact source receipt to pointer source receipt;
12. operation recovery can consume old exact G without a live tab;
13. stale A cleanup cannot delete B or clear B pointer;
14. transaction abort leaves no partial payload/meta/pointer state;
15. unknown local commit is reconciled, not blindly rewritten;
16. cross-store partial/mismatch state fails closed;
17. current Chrome physical migration/duplicate/rollback schedules pass on exact production commit;
18. P0-079 remains ACTIVE until committed production + required closure evidence.

---

# 19. Owner/status impact

No new root cause was found.

Existing owners remain authoritative:

```text
P0-079 local immutable PDF generation
P0-023 exact source-document retry binding
P0-070 end-to-end save authority
P0-080 same-document application/selection generation
P1-198 worker physical operation identity
P1-194 durability/eviction truth
P1-184 later exact remote-content identity
```

Therefore:

```text
P1-231 = NOT ALLOCATED
```

No Registry status changes are justified by this research tranche.

---

# 20. Current decision / next research edge

B1 is now source-ready at the same level as A0/U0/J0 and A1/A2:

```text
A0/U0/J0 source contract    DEFINED
A1/A2 source contract       DEFINED
B1 source contract          DEFINED
B1 L2                       PASS
B1 controlled L3            PASS
production                  NOT IMPLEMENTED
```

The next highest-value research delta is **C0/C1 pre-implementation composition**:

```text
sealed exact local G/N/H
+ W5 validated authGeneration/account/scopes
+ P0-073 account/root scope
+ P0-074 immutable live Yandex context
+ P0-078 publication policy generation
        ↓
exact remote-save checkpoint/effect admission
        ↓
P1-184 exact remote-content verification contract
```

Real provider L5 remains intentionally deferred to the final external stage.
