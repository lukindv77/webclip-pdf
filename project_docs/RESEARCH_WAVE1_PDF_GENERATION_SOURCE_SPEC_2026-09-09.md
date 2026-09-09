# WebClip — Wave 1 B0/B1 exact source + trusted PDF generation + immutable cache source specification — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical Registry blob: `81e5867c0e0936b9524ece8949c53ad4ed83523c`  
Research branch: `research/wave1-pdf-generation-source-spec-2026-09-09`  
Mode: **RESEARCH-ONLY / PRE-IMPLEMENTATION SOURCE SPECIFICATION**  
Production implementation: **NOT STARTED**.  
Primary owners: **P0-023, P0-070, P0-079, P0-080**.  
Supporting current owners/boundaries: **P0-004, P1-003, P1-086, P1-125, P1-146, P1-150, P1-154, P1-167, P1-184, P1-190, P1-198, P1-210, P1-218, P1-220, P1-221, P1-224, P1-229, P1-230**.  
Architecture backlog noted but not promoted: **P2-019** shared IndexedDB schema/migration ownership.

No production file, manifest, Registry, workflow, build, version, tag, release or deployment is changed by this research branch.

---

## 1. Purpose

The staged Wave 1 plan defines:

```text
A0 passive OperationReceipt primitives
-> U0 protocol fencing
-> A1 exact content-selection protocol
-> A2 worker-issued physical operation identity
-> B0 exact source/render fence + one-pass digest
-> B1 immutable PDF cache v4
-> C0/C1 remote context/content proof
-> D* Journal/domain finalization
-> E* reconciliation UI
```

A0/U0/A1/A2 were specified in the preceding foundation source specification.

This document removes the remaining implementation ambiguity for **B0/B1**.

The exact problem is not merely “add a hash to the PDF cache”. The production implementation must establish a continuous authority chain:

```text
reviewed selection authority
+ exact content document/application generation
        |
        v
Probe A before debugger attach
        |
        v
one renderAttemptId
        |
        v
Chrome Debugger attach / Page.enable / media setup
        |
        v
Probe B: same content authority + exact renderer frame/loader
        |
        v
Page.printToPDF(ReturnAsStream)
        |
        v
IO.read chunks
        |
        +--> N = exact decoded byte length
        +--> H = incremental SHA-256 over exact decoded bytes
        |
        v
Probe C: source still same + renderer still same + session not externally detached
        |
        v
issue trusted pdfGenerationId G
        |
        v
store immutable {G,H,N,S,Blob}
        |
        +--> mutable retryIndex may point to G
        +--> in-flight operation pins G directly
```

A `pdfGenerationId` is therefore **not** an attempt ID, a tab slot, a content hash, or a filename. It exists only after a successful trusted artifact is complete.

---

# Part I — source-bound current production baseline

## 2. Current PDF renderer

Current `service-worker.js` uses `generatePdfBlob(tabId)`.

The current flow is approximately:

```text
{tabId}
-> debugger attach
-> Page.enable
-> Emulation.setEmulatedMedia(screen)
-> Page.printToPDF(ReturnAsStream)
-> repeated IO.read
-> Base64 decode each chunk
-> sum total bytes
-> collect Uint8Array parts
-> Blob(parts)
-> IO.close
-> debugger detach
```

This is already materially better than an all-at-once Base64 PDF because the CDP stream is read in bounded chunks.

However the return value is only:

```text
Blob
```

The current renderer does not establish:

```text
renderAttemptId
pdfGenerationId
physicalOperationId binding
sourceGenerationId binding
selectionAuthorityId binding
SHA-256 over exact emitted bytes
browser top-frame/loader identity
post-render source consistency receipt
external debugger-detach ownership receipt
```

Therefore current `Page.printToPDF` completion cannot by itself prove that the bytes are the result of the same exact source generation that the user admitted before rendering.

---

## 3. Current cache topology

Current production cache is:

```text
WebClipPdfRetryCache v3

stores:
  pdfs
  meta

openers:
  service-worker.js
  offscreen.js
```

The current durable retry identity is substantially tab-scoped:

```text
pdfCacheKey(tabId)
```

A later save on the same tab can replace the row that a previous operation conceptually meant when it said “retry this PDF”.

This is the direct P0-079 hazard.

P0-023 adds a second independent requirement: even a same-URL reload/replacement cannot reuse the previous document's PDF merely because the tab/URL looks equivalent.

---

## 4. Current offscreen PDF retrieval

Current `offscreen.js`:

```text
opens WebClipPdfRetryCache v3
gets one record by caller-supplied pdfCacheKey
accepts current Blob form and legacy Base64 compatibility
creates upload body / Blob URL
```

It does not currently require:

```text
G
H
N
S
exact-v2 trust class
```

Therefore an exact B1 cutover must change **both** worker and offscreen as one package.

---

## 5. Existing digest primitive

Production already includes `journal-import-digest.js` and exposes incremental SHA-256 through `WebClipSha256.create()`.

This primitive supports:

```text
update(bytes)
digestBase64Url()
totalBytes
```

Therefore B0 does not need:

```text
new crypto dependency
second PDF read
second full-PDF copy solely for hashing
```

The digest is updated from each already-decoded `IO.read` chunk.

---

## 6. Current debugger ownership gap

Current source keeps tab-oriented debugger active/pending state, but no `chrome.debugger.onDetach` listener is present in the production renderer.

Chrome exposes an explicit debugger detach event. A target may be detached for reasons outside the local `detach()` promise lifecycle, including target closure or another debugging interaction.

Therefore exact render authority cannot be based only on:

```text
attach Promise succeeded
...
detach attempted
```

B0 needs one live render-session owner that can attribute a browser detach to the exact current `renderAttemptId`.

---

# Part II — identifiers and trust semantics

## 7. Identifier roles

B0/B1 use four independent concepts:

```text
P = physicalOperationId
R = renderAttemptId
G = pdfGenerationId
H = SHA-256 of exact PDF bytes
```

and source generation:

```text
S = sourceGenerationId
```

They are not interchangeable.

### 7.1 `physicalOperationId` P

Issued by A2.

Owns the user-visible physical operation across later stages.

One P may contain one PDF render attempt or, if product policy eventually allows explicit re-render after a review round, multiple distinct attempts. A failed attempt never becomes a trusted PDF generation.

### 7.2 `renderAttemptId` R

Issued before debugger attach.

R answers:

> Which exact attempt owned this debugger/render session?

R exists even when rendering fails.

R is useful for:

```text
debugger onDetach attribution
timeouts
cleanup
operation timeline
failed-attempt diagnostics
```

### 7.3 `pdfGenerationId` G

Issued only after all trust gates pass.

G answers:

> Which exact successfully generated PDF artifact is this?

G must not be issued at render admission.

G must not be issued at debugger attach.

G must not be issued immediately after `Page.printToPDF` returns a stream handle.

G is issued only after:

```text
stream EOF
N valid
H finalized
Probe C PASS
no external detach invalidation
```

### 7.4 `sha256` H

H is content evidence.

H is not artifact identity.

Two distinct renders may legitimately produce identical bytes:

```text
G1 != G2
H1 == H2
```

That means:

```text
same content
!=
same artifact generation / same operation
```

### 7.5 `byteLength` N

N is the exact number of decoded PDF bytes that were fed into H and Blob assembly.

Therefore the B0 invariant is:

```text
N == sum(decoded IO.read chunks)
N == Blob.size
H == SHA256(the same N bytes)
```

### 7.6 `sourceGenerationId` S

S originates from A1 source/application authority.

S does not mean “same URL”.

It must distinguish at least the current admitted browser document/application generation that matters to the selected live DOM.

---

# Part III — B0 exact source/render fence

## 8. Target function boundary

Replace the trust role of:

```js
generatePdfBlob(tabId)
```

with a stronger boundary conceptually equivalent to:

```js
async function generatePdfArtifact({
  tabId,
  physicalOperationId,
  sourceAuthority
})
```

The exact function name may change for local style, but the return contract must be stronger than Blob-only.

Target result:

```js
{
  blob,
  receipt: {
    version: 1,

    physicalOperationId,
    renderAttemptId,
    pdfGenerationId,

    sourceGenerationId,
    sourceDocumentId,
    selectionAuthorityId,

    byteLength,
    sha256,

    topFrameId,
    topLoaderId,

    createdAt
  }
}
```

---

## 9. Why three probes are required

One pre-render content probe is insufficient because navigation/source replacement can occur while debugger setup or PDF generation is in progress.

One post-render probe is insufficient because it cannot establish which source was admitted before the irreversible render started.

The required shape is therefore:

```text
A -> B -> render -> C
```

where each probe has a different purpose.

---

## 10. Probe A — pre-attach source-authority validation

Probe A runs **before debugger attach**.

Input:

```text
A1 reviewed SelectionAuthorityReceipt
exact target documentId
```

Observed content result must match the reviewed authority across all fields that define the admitted source:

```text
protocolVersion
contentRealmNonce
documentId
sourceGenerationId
selectionAuthorityId
selectionRevision
selectionSnapshotSha256
documentActivityGeneration
applicationGeneration
navigationTransitionGeneration
```

If any differs:

```text
WEBCLIP_PDF_SOURCE_CHANGED
```

or, where UX semantics require explicit review:

```text
WEBCLIP_REVIEW_REQUIRED
```

No debugger side effect should start after Probe A failure.

---

## 11. Probe B — attached browser-renderer identity

After:

```text
chrome.debugger.attach
Page.enable
required media/render setup
```

B0 performs Probe B immediately before the actual print command.

Probe B consists of two facts:

### 11.1 content-side fact

Re-read the exact A1 source authority from the same bound `documentId`.

Require it to equal Probe A.

### 11.2 browser-renderer fact

Call:

```text
Page.getFrameTree
```

Capture at least the top frame:

```text
topFrameId
topLoaderId
```

The exact renderer receipt is therefore not inferred from tabId alone.

If top frame or loader identity is unavailable, do not issue a trusted G.

Suggested error:

```text
WEBCLIP_PDF_RENDER_IDENTITY_UNAVAILABLE
```

---

## 12. Render command

Only after Probe B succeeds:

```text
Page.printToPDF({
  ...,
  transferMode: 'ReturnAsStream'
})
```

The existing transfer-mode choice should remain.

B0 does not need to regress to a full Base64 return value.

---

## 13. One-pass byte and digest processing

For each `IO.read` result:

```text
validate stream encoding
Base64 decode
obtain bytes
increment N
reject N > MAX_PDF_BYTES
update incremental SHA-256 with exactly those bytes
append same bytes to Blob parts
```

Conceptually:

```js
const digest = WebClipSha256.create();
const parts = [];
let totalBytes = 0;

for (;;) {
  const chunk = await readPdfChunk(...);
  const bytes = decodeExactPdfChunk(chunk);

  totalBytes += bytes.byteLength;
  if (totalBytes > MAX_PDF_BYTES) throw pdfTooLarge();

  digest.update(bytes);
  parts.push(bytes);

  if (chunk.eof) break;
}

const N = totalBytes;
const H = digest.digestBase64Url();
```

No second pass is necessary.

---

## 14. EOF semantics

A trusted generation requires an actual completed stream.

Cases that must not issue G:

```text
empty stream
stream handle missing
invalid Base64
unexpected non-binary encoding
IO.read timeout
stream deadline exceeded
external debugger detach
source changed before final validation
renderer loader changed
```

Existing error codes such as:

```text
PDF_TOO_LARGE
PDF_STREAM_ENCODING_UNEXPECTED
PDF_STREAM_INVALID_BASE64
```

should remain where already meaningful.

---

## 15. Probe C — post-stream pre-trust validation

Probe C occurs after:

```text
stream EOF
H finalized
N finalized
```

but **before** issuing G and before committing an exact-v2 cache generation.

Probe C repeats:

```text
exact content authority read from original documentId
Page.getFrameTree
render-session detach state
```

Require:

```text
Authority A == Authority B == Authority C

B.topFrameId == C.topFrameId
B.topLoaderId == C.topLoaderId

session.externallyDetached == false
```

Only then may the implementation generate:

```text
pdfGenerationId = G
```

This ordering prevents a partially valid byte stream from being promoted into trusted cache state after a concurrent navigation/source replacement.

---

## 16. Why G is issued after Probe C

If G were generated earlier, downstream code could observe a seemingly valid artifact identity even though final source validation later failed.

The trust transition should be one-way:

```text
renderAttempt R
    |
    +-- failed / detached / stale -> no G
    |
    +-- EOF + H + N + Probe C PASS -> issue G
```

No failed R is later “upgraded” by merely attaching a new UUID.

---

# Part IV — WebClip-owned print mutations vs source generation

## 17. Source generation must not falsely invalidate WebClip-owned temporary preparation

WebClip intentionally performs temporary print preparation:

```text
selected-only styles
frame preparation
resource normalization
print header/representation work
beforeprint/afterprint owned transformations
```

These WebClip-owned changes must not automatically increment the same source generation that represents host/application authority; otherwise Probe B/C would invalidate every legitimate render.

The model should distinguish:

```text
host/source generation S
```

from later exact temporary preparation generations/receipts governed by their own owners such as:

```text
P1-218 temporary attribute rollback
P1-220 print-header exact-node ownership
P1-221 link normalization authority
P1-224 same-origin frame style rollback
P1-229 cross-origin selected-only representation
```

B0 composes with those owners; it does not replace them.

---

## 18. Host mutation during print remains source-authority relevant

Conversely, host/application changes that alter the admitted source must not be hidden merely because WebClip is in a print-preparation phase.

Examples:

```text
SPA route generation changes
selected node disconnects/replaces
selection snapshot authority changes
full document navigation
BFCache/application generation transition
```

Those must invalidate the source receipt.

---

# Part V — exact debugger session ownership

## 19. Current tab-only ownership is insufficient

A tab is a routing location, not a render identity.

Target worker state:

```js
const pdfRenderSessionByTab = new Map();
```

Entry concept:

```js
{
  tabId,
  physicalOperationId,
  renderAttemptId,

  sourceDocumentId,
  sourceGenerationId,

  phase,
  externallyDetached,
  detachReason,

  attachActualPending,
  detachActualPending
}
```

---

## 20. One debugger render per tab

B0 should structurally forbid two simultaneous PDF debugger render sessions for the same tab.

This matters because `chrome.debugger.onDetach` identifies the browser debuggee, not WebClip's internal R.

If exactly one session may own a tab, then:

```text
onDetach(tabId)
```

can be mapped to the sole current:

```text
renderAttemptId R
```

without guessing.

---

## 21. `chrome.debugger.onDetach`

Install one worker listener that:

```text
locates current session for debuggee tab
marks externallyDetached=true
records bounded detach reason
preserves R/P ownership
```

It must not itself fabricate render failure for a newer unrelated R.

That is guaranteed by the one-live-session-per-tab rule and exact map lifecycle.

---

## 22. Late attach/detach settlement

Current code already recognizes that debugger attach/detach APIs may settle after a local timeout.

B0 must preserve this principle.

A local timeout does not mean:

```text
Chrome did not attach
```

or:

```text
Chrome detached
```

Therefore a new R on the same tab must remain blocked while the older actual attach/detach settlement could still affect the target.

The exact render-session map should remain until actual browser ownership is reconciled.

---

# Part VI — `PdfGenerationReceipt`

## 23. Required receipt fields

Suggested v1:

```js
{
  version: 1,

  physicalOperationId: P,
  renderAttemptId: R,
  pdfGenerationId: G,

  sourceGenerationId: S,
  sourceDocumentId: D,
  selectionAuthorityId,

  byteLength: N,
  sha256: H,

  topFrameId,
  topLoaderId,

  createdAt
}
```

Fields should be bounded and normalized using the same opaque-ID policy established in A0/A2.

---

## 24. Receipt invariants

For one trusted receipt:

```text
P != empty
R != empty
G != empty
S != empty
D != empty
selectionAuthorityId != empty
N > 0
N <= MAX_PDF_BYTES
H is a valid SHA-256 base64url digest
```

and:

```text
G is immutable
H is immutable
N is immutable
S is immutable
Blob bytes are immutable generation payload
```

---

# Part VII — B1 database v4

## 25. Target database

```text
WebClipPdfRetryCache v4
```

Stores:

```text
pdfs       existing
meta       existing
retryIndex new
```

The existing `pdfs` store keyPath may remain `key`.

No destructive rewrite of the existing store is required.

---

## 26. Exact generation key

For exact-v2 records:

```text
key = pdf-generation:<G>
```

Never:

```text
tab:<tabId>
```

for trusted generation identity.

The tab becomes only a mutable retry pointer domain.

---

## 27. Exact v4 PDF row

Suggested shape:

```js
{
  key: `pdf-generation:${G}`,

  schemaVersion: 4,
  trust: 'exact-v2',

  pdfGenerationId: G,
  physicalOperationId: P,

  sourceGenerationId: S,
  sourceDocumentId: D,
  selectionAuthorityId,

  sha256: H,
  byteLength: N,

  filename,
  meta,
  pdfBlob,
  createdAt,
  sourceUrl,
  temporary: false
}
```

`sourceUrl` remains subject to the project's durable URL confidentiality sanitizer and is **not** identity authority.

---

## 28. Exact row insertion must be add-only

Trusted generation rows are immutable.

Use semantics equivalent to:

```text
pdfs.add(row)
```

not:

```text
pdfs.put(row)
```

A duplicate key/G is an invariant failure:

```text
WEBCLIP_PDF_GENERATION_COLLISION
```

Do not overwrite the existing generation.

---

## 29. `retryIndex`

Suggested store:

```text
retryIndex
keyPath: slotKey
```

Initial row:

```js
{
  slotKey: `tab:${tabId}`,
  tabId,

  pdfGenerationId: G,
  sha256: H,
  byteLength: N,
  sourceGenerationId: S,
  physicalOperationId: P,

  trust: 'exact-v2',
  updatedAt
}
```

The pointer is mutable.

The generation row is not.

---

## 30. Atomic generation + pointer publication

When a newly generated PDF is intended to become the tab's latest retryable artifact:

```text
transaction [pdfs, retryIndex] readwrite

1. pdfs.add(exact generation G)
2. retryIndex.put(tab slot -> G)
3. transaction complete
```

This avoids publishing a retry pointer to a generation that was not durably committed.

This is also where P1-086 matters: request-level success must not be published before the IndexedDB transaction itself completes.

---

## 31. Same-tab overwrite is now harmless to already pinned operations

Example:

```text
Operation P1 renders G1
retryIndex(tab 7) -> G1

Operation P2 later renders G2
retryIndex(tab 7) -> G2
```

The correct state is:

```text
pdfs contains G1
pdfs contains G2
retryIndex(tab 7) -> G2
```

An in-flight P1 that already owns G1 continues to use:

```text
G1
```

It never re-resolves `tab:7` after effect admission.

This is the central P0-079 cutover.

---

## 32. Manual retry semantics

A user action “retry latest generated PDF for this tab” may initially consult `retryIndex`.

But admission must convert the mutable pointer into immutable operation context:

```text
read retryIndex(tab)
-> obtain G,H,N,S
-> admit physical retry operation P_retry
-> pin G,H,N,S into P_retry receipt/context
-> later stages use pinned G
```

Do not repeatedly read retryIndex during one physical retry operation.

---

# Part VIII — v3 -> v4 migration

## 33. Migration rule

When `oldVersion < 4`:

```text
retain existing pdfs store
retain existing meta store
create retryIndex if absent
```

Do **not** iterate/rewrite all existing rows merely to make them look current.

---

## 34. Legacy v3 rows remain legacy

Existing v3 row may contain:

```text
key = tab:<id>
pdfBlob or legacy Base64
filename/meta/tabId/createdAt
```

It does not possess historical proof of:

```text
G
H
S
selectionAuthorityId
exact physical operation ownership
```

Migration must therefore not synthesize those values.

Absence of exact-v2 fields is meaningful provenance.

---

## 35. No synthetic exact retryIndex for legacy rows

Preferred migration:

```text
retryIndex starts empty for legacy rows
```

A separate compatibility lookup may expose a legacy retry path while policy still allows it.

But it must return a result classified as:

```text
legacy-unbound
```

not:

```text
exact-v2
```

---

## 36. Forward-only practical boundary

Once the browser has opened:

```text
WebClipPdfRetryCache version 4
```

a literal downgrade to old code that opens version 3 may receive IndexedDB `VersionError`.

Therefore B1 rollback policy is:

```text
forward-compatible corrective build that understands DB4
```

not:

```text
restore the old DB3 runtime bundle
```

This must be part of implementation/release operational documentation before B1 production cutover.

---

# Part IX — worker/offscreen atomicity

## 37. Both openers must agree on v4

Current openers:

```text
service-worker.js
offscreen.js
```

Both must carry the same:

```text
DB name
DB version 4
store names
upgrade creation rule
exact row interpretation
legacy interpretation
```

If either opener remains v3, the package is invalid.

---

## 38. P2-019 remains backlog

A shared runtime IDB schema module would reduce duplication, but introducing that broader decomposition is P2-019/P2-014 architecture work.

B1 does not need to promote that backlog merely to be correct.

Instead, B1 implementation tests must compare/assert the duplicated worker/offscreen schema constants and migration contract.

---

# Part X — exact offscreen transfer contract

## 39. Current caller-supplied mutable cache key must not drive v2 upload

Trusted upload must not say:

```text
pdfCacheKey = tab:<id>
```

Target v2 spec should be generation-owned.

One possible shape:

```js
{
  mode: 'pdf-cache-upload-v2',

  pdfGenerationId: G,
  expectedSha256: H,
  expectedByteLength: N,
  sourceGenerationId: S,

  url,
  method,
  contentType
}
```

Equivalent field naming is acceptable if the same invariants remain.

---

## 40. Offscreen derives storage key from G

Offscreen should derive:

```text
pdf-generation:<G>
```

internally.

It should not accept an arbitrary exact-v2 cache key from the caller.

This reduces retargeting surface.

---

## 41. Offscreen exact-v2 checks

Before creating the HTTP body:

```text
row exists
row.schemaVersion == 4
row.trust == exact-v2
row.G == requested G
row.H == expected H
row.N == expected N
row.S == expected S
row.pdfBlob is Blob
row.pdfBlob.size == N
```

Any mismatch is fail-closed.

No fallback to:

```text
tab key
legacy row
latest retryIndex
same filename
same URL
same byte length only
```

---

## 42. Offscreen does not need a second SHA pass in B1

B0 already computes H over the exact decoded `IO.read` bytes.

B1 stores:

```text
immutable G
immutable H
immutable N
immutable S
immutable Blob
```

Offscreen then verifies metadata consistency and physical `Blob.size`.

A second hash inside offscreen would:

```text
add CPU and full Blob read
require digest availability in the offscreen bundle
expand bootstrap/source surface
```

without proving the remote provider received the same bytes.

That latter proof belongs to C1.

Therefore B1 scope is intentionally:

```text
local exact artifact identity + immutable retrieval
```

not:

```text
remote exact-content provider receipt
```

---

# Part XI — local download path

## 43. Current temporary cache key

Current local-download flow uses a temporary cache key concept such as:

```text
local-download:<operationId>
```

then asks offscreen to create a Blob URL.

B1 should migrate this to direct exact generation identity.

---

## 44. Local direct-G flow

Target:

```text
B0 returns G,H,N,S,Blob
-> add exact G row (temporary/protected role allowed)
-> create exact Blob URL by G,H,N,S
-> establish durable DownloadItem intent
-> Chrome downloads.download
-> exact DownloadItem reconciliation continues under existing owners
```

A tab retry pointer is not required for a purely local temporary artifact unless product semantics explicitly want it retryable from the tab.

---

## 45. Blob URL transition does not erase G identity

After a Blob URL is created from exact G, the browser URL references those bytes even if the backing temporary cache row is later removed at the correct lifecycle transition.

The physical operation/domain receipt should still preserve:

```text
G
H
N
S
```

so Journal/download reconciliation can explain exactly which PDF generation was handed to Chrome.

---

# Part XII — Yandex path before C0/C1

## 46. B1 may feed current upload machinery, but does not close remote context owners

After B1, worker can provide offscreen with an exact local artifact:

```text
G,H,N,S
```

This does not by itself close:

```text
P0-073 account/root scope
P0-074 immutable auth/config operation context
P0-078 publication policy generation
P1-184 external exact-content verification
P1-190 durable effect identity
```

Those remain C0/C1 work.

---

## 47. B1 trusted-local != trusted-remote

Required vocabulary:

```text
trusted local generation
```

means:

```text
exact source/render fence passed
local bytes identified by G/H/N/S
immutable cache row committed
```

It does **not** mean:

```text
Yandex received H
remote file content equals H
publication state exact
remote object identity exact
```

Do not collapse these evidence levels.

---

# Part XIII — cleanup / capacity / GC

## 48. Existing cache TTL is not enough once G becomes authority

A simple:

```text
createdAt older than 24h -> delete
```

is not sufficient for exact generations while they are referenced by unresolved durable state.

---

## 49. Protected generations

An exact generation must not be GC'd while referenced by at least one live authority, including as applicable:

```text
retryIndex
active/unresolved OperationReceipt
pending local DownloadItem checkpoint
prepared Blob/SaveAs owner
active signed-transfer effect receipt
future remote pending-save checkpoint that pins G
```

The exact cross-store lookup strategy belongs to implementation design, but the invariant is mandatory.

---

## 50. Unresolved G must not be evicted just to admit a new operation

If storage pressure remains after disposable cleanup:

```text
reject new render/cache admission
```

rather than:

```text
delete unresolved/protected G
```

Deleting the only exact generation behind an unknown external effect would convert “unknown but reconcilable” into irreversible evidence loss.

---

## 51. GC candidates

A row is eligible only when all are true:

```text
exact-v2 generation
expired under retention policy
not referenced by retryIndex
not referenced by unresolved operation/domain checkpoint
not active in offscreen transfer
not otherwise pinned
```

Legacy rows retain their existing compatibility cleanup semantics and are not silently treated as exact-v2 generations.

---

# Part XIV — recommended error contract

## 52. B0 source/render errors

Recommended additions:

```text
WEBCLIP_PDF_SOURCE_CHANGED
WEBCLIP_PDF_RENDER_IDENTITY_UNAVAILABLE
WEBCLIP_PDF_RENDER_CHANGED
WEBCLIP_PDF_RENDER_DETACHED
WEBCLIP_PDF_EMPTY
```

Retain existing meaningful errors:

```text
PDF_TOO_LARGE
PDF_STREAM_ENCODING_UNEXPECTED
PDF_STREAM_INVALID_BASE64
WEBCLIP_TIMEOUT
```

---

## 53. B1 exact-generation errors

Recommended:

```text
WEBCLIP_PDF_GENERATION_COLLISION
WEBCLIP_PDF_GENERATION_NOT_FOUND
WEBCLIP_PDF_GENERATION_LEGACY
WEBCLIP_PDF_GENERATION_MISMATCH
WEBCLIP_PDF_HASH_MISMATCH
WEBCLIP_PDF_LENGTH_MISMATCH
WEBCLIP_PDF_SOURCE_GENERATION_MISMATCH
WEBCLIP_PDF_CACHE_UPGRADE_BLOCKED
```

Error codes are not evidence by themselves; they make reconciliation and UI behavior deterministic instead of text-matching exceptions.

---

# Part XV — source-change map

## 54. `service-worker.js` B0 changes

Expected source areas:

```text
PDF constants / digest availability
render-session maps
chrome.debugger.onDetach listener
generatePdfBlob -> generatePdfArtifact boundary
Probe A helper
Probe B helper
Probe C helper
incremental H/N during IO.read
PdfGenerationReceipt validation
physical OperationReceipt stage update
local-download caller adaptation
Yandex caller adaptation
```

No production implementation is performed in this research branch.

---

## 55. `service-worker.js` B1 changes

Expected source areas:

```text
PDF_CACHE_DB_VERSION 3 -> 4
retryIndex store constant
openPdfCacheDb upgrade
exact generation key helpers
addExactPdfGeneration
commitExactGenerationAndRetryPointer
getExactPdfGeneration
resolveLatestRetryGenerationForTab
legacy lookup kept explicitly separate
cleanup/protection logic
exact offscreen request spec
```

---

## 56. `offscreen.js` B1 changes

Expected source areas:

```text
PDF_CACHE_DB_VERSION 3 -> 4
retryIndex store schema agreement
openPdfCacheDb upgrade parity
exact generation lookup
exact G/H/N/S validation
pdf-cache-upload-v2 mode
exact Blob URL generation path
legacy v1 modes remain explicitly separate or are retired by policy
```

---

## 57. `content.js` B0 dependency

B0 depends on A1 source-authority RPC/probe semantics.

Expected B0-specific content change should be small if A1 is correctly implemented:

```text
read-only exact source authority probe
bound to exact documentId/protocol v2
no source mutation
```

B0 should not re-invent selection-generation logic inside the worker.

---

## 58. `journal-import-digest.js`

Preferred B0 implementation reuses this existing digest primitive.

No algorithm redesign is required merely for PDF hashing.

A source test should prove that service-worker digest use is chunk-boundary invariant and that the digest covers exactly the same decoded bytes contributing to N/Blob.

---

# Part XVI — deterministic model results

## 59. Model artifact

Research branch contains:

```text
project_tools/test_wave1_pdf_generation_source_spec_model.js
```

Local deterministic execution before commit:

```text
Wave 1 PDF generation source specification model: PASS
cases=51
dbVersion=4
identity=renderAttemptId -> EOF+H+N+ProbeC -> pdfGenerationId
cache=immutable G rows + mutable retryIndex
```

This is L2 architecture/model evidence only.

It is not a current production test and not a Chrome physical receipt.

---

## 60. Model coverage — source probes

The model proves the desired acceptance semantics for:

```text
Probe A exact match
Probe A document change rejection
Probe A SPA generation change rejection
Probe A selection revision rejection
Probe A selection hash rejection
Probe B stable capture
Probe B concurrent source change rejection
Probe B missing renderer identity rejection
Probe C stable source/renderer acceptance
Probe C source generation rejection
Probe C loader change rejection
Probe C frame change rejection
Probe C external detach rejection
```

---

## 61. Model coverage — artifact identity

The model proves:

```text
R and G are distinct
P is bound into receipt
S/selection authority bound into receipt
N equals concatenated exact bytes
empty stream cannot issue trusted G
oversize stream cannot issue trusted G
```

---

## 62. Model coverage — digest semantics

The model proves:

```text
SHA-256 invariant across chunk boundaries
one-byte/content change alters H
artifact H equals direct SHA-256 of exact concatenated bytes
```

This is model-level evidence for the intended use of the existing incremental production primitive.

---

## 63. Model coverage — DB4 generation semantics

The model proves:

```text
exact row key owned by G
exact insertion add-only
collision rejected
generation + retry pointer publication resolves exact row
new G advances pointer without deleting prior G
operation pinned to G1 remains G1 after pointer -> G2
dangling pointer binding rejected
```

---

## 64. Model coverage — migration semantics

The model proves:

```text
v3 bytes/key preserved
no synthetic G
no synthetic H
no synthetic S
no exact retryIndex generated for legacy row
DB target is v4
```

---

## 65. Model coverage — offscreen exact retrieval

The model proves fail-closed behavior for:

```text
exact G/H/N/S match
unknown G
H mismatch
expected N mismatch
stored Blob N mismatch
S mismatch
legacy tab row presented as exact generation
```

---

## 66. Model coverage — GC / direct local generation

The model proves:

```text
local download can pin direct G without retryIndex
retryIndex protects G
operation reference protects G
expired unreferenced G becomes candidate
fresh G is retained
legacy row is not silently classified as exact-G candidate
```

---

## 67. Model coverage — debugger ownership

The model proves the structural rule:

```text
one live render session per tab
```

and maps external detach to the sole current R.

It also proves:

```text
same bytes -> H may match
but distinct successful renders -> G must differ
```

---

# Part XVII — RED -> GREEN implementation gates

## 68. B0 source RED gates

Before implementation, exact source tests should fail on current main for at least:

```text
current renderer returns Blob without G/H/N/S receipt
no Probe A/B/C source fence
no Page.getFrameTree identity comparison
no debugger onDetach render-session ownership
no H computed during PDF stream
```

---

## 69. B0 GREEN gates

B0 may be considered implemented at source/deterministic level only when:

```text
1. exact A1 source authority is required before debugger attach;
2. B captures browser frame+loader identity;
3. H and N come from exact decoded IO.read bytes;
4. C revalidates source + frame+loader;
5. external detach invalidates R;
6. no failed R produces G;
7. successful G receipt binds P,R,S,D,selection,H,N;
8. existing size/encoding/deadline defenses remain;
9. deterministic race tests pass;
10. current source no longer treats Blob-only completion as trusted artifact identity.
```

Physical Chrome proof remains a later L3/L4 requirement where applicable.

---

## 70. B1 source RED gates

Current main should fail exact checks for:

```text
DB version still 3
no retryIndex store
trusted retry identity still mutable tab slot
worker/offscreen exact G schema absent
v3 legacy not explicitly separated from v4 trust
```

---

## 71. B1 GREEN gates

B1 source/deterministic implementation gate:

```text
1. worker + offscreen both use DB4;
2. upgrade contract is equivalent;
3. existing v3 rows preserved without trust synthesis;
4. exact rows keyed by G;
5. exact row uses add-only semantics;
6. retryIndex mutation and generation insertion share one committing transaction when published together;
7. in-flight operations pin G directly;
8. offscreen exact retrieval requires G/H/N/S;
9. legacy fallback cannot satisfy exact-v2 request;
10. local download path can use direct G;
11. protected G is not TTL-evicted;
12. downgrade boundary documented/tested.
```

---

# Part XVIII — update/restart schedules

## 72. Update before B1

U0 must already be active.

If an old offscreen context is present after extension update:

```text
new worker protocol v2
old offscreen protocol != v2
```

then exact-v2 B1 work must fail closed or replace the stale context under U0 lifecycle rules before DB4 effect work is admitted.

---

## 73. Worker dies after G row commit but before caller receives response

State may be:

```text
exact G row committed
retryIndex maybe committed in same transaction
caller lost response
```

A2/E0 later reconciliation must discover the physical operation receipt/domain result.

It must not blindly rerender and overwrite G identity.

---

## 74. Worker dies after B0 computes H/N but before DB4 commit

No durable trusted cache generation exists yet.

If G was issued only in-memory and never committed, later recovery must not pretend the cache owns it.

A clean design may update the OperationReceipt only after exact DB publication or explicitly represent an intermediate artifact-created/cache-not-committed phase.

Do not collapse those states.

---

## 75. Worker dies during v4 upgrade

IndexedDB versionchange transaction is atomic.

Either:

```text
v4 upgrade transaction commits
```

or the upgrade does not publish partial schema.

Both worker/offscreen openers still need bounded blocked/versionchange handling.

---

## 76. Old page holds DB3 connection while v4 opens

An old connection may block version upgrade.

The system must surface a bounded explicit blocked/update condition rather than reporting successful cache migration before the versionchange completes.

Suggested classification:

```text
WEBCLIP_PDF_CACHE_UPGRADE_BLOCKED
```

U0 page refresh/fencing is therefore part of operational safety for B1.

---

# Part XIX — trust progression after B0/B1

## 77. Trust class before B0

Current PDF may be:

```text
browser-produced bytes
```

but lacks the full exact source/render generation receipt.

It must not be relabeled exact-v2 merely because current source historically passed other PDF tests.

---

## 78. Trust class after B0

A B0 artifact may be called:

```text
trusted local render artifact
```

when:

```text
A/B/C stable
R exact
G issued after C
H/N exact
S exact
```

but before B1 persistence it is not yet an immutable retry-cache generation.

---

## 79. Trust class after B1

A DB4 generation may be called:

```text
trusted immutable local PDF generation
```

when:

```text
B0 receipt valid
DB4 exact row committed
G/H/N/S row immutable
retrieval exact
```

It is still not a trusted remote provider receipt.

---

# Part XX — owner mapping

## 80. P0-023

Closed only when a retryable PDF is bound to exact source-document generation and same-URL document replacement cannot reuse the old artifact as exact current source.

B0 supplies S/D.

B1 persists S/D with G and separates legacy rows.

---

## 81. P0-070

B0 is necessary but not sufficient.

It establishes the user-save source generation through render/cache handoff.

P0-070 still spans later download/upload/Journal finalization and therefore remains ACTIVE after B0/B1 until downstream Wave 1 stages compose the same authority.

---

## 82. P0-079

B1 is the direct structural fix:

```text
immutable operation-owned G rows
+ mutable retryIndex only as latest-selection pointer
```

P0-079 cannot be declared DONE from this research spec; implementation and required verification are still absent.

---

## 83. P0-080

A1/B0 compose the distinction between browser document identity and same-document application/selection generation.

B0 must reject a stale SPA/selection generation even if browser documentId and tab remain unchanged.

---

## 84. P1-086

DB publication authority belongs to transaction completion, not individual IDB request success.

This affects exact G row + retryIndex publication.

---

## 85. P1-125

Exact content probe/injection authority must remain document-generation bound.

B0 must not consume a late executeScript success from an old document as current Probe A/B/C authority.

---

## 86. P1-146 / P1-156

Local automatic download / Save As have their own irreversible browser effects.

B0/B1 provide exact PDF G/H/N/S input; they do not replace those lifecycle owners.

---

## 87. P1-167

Probe/preparation/diagnostic work must remain bounded in node/time/mutation/string cost.

B0's source probe should be a compact authority read, not an unbounded re-analysis of the whole DOM at A/B/C.

---

## 88. P1-184 / P1-190

Local H does not close external receipt identity.

C1 must bind provider-side content/effect evidence to the same physical operation and G/H/N/S context.

---

# Part XXI — implementation commit boundary

## 89. Preferred B0 tranche

Expected production files:

```text
service-worker.js
content.js (only if A1 probe RPC needs the final read-only shape)
project_tools/tests...
project_docs implementation evidence...
```

B0 may be merged before DB4 if the current callers temporarily consume the stronger artifact result while legacy persistence remains explicitly non-exact.

The safe intermediate state must not claim exact retry-cache closure yet.

---

## 90. Preferred B1 atomic tranche

Production package:

```text
service-worker.js
offscreen.js
```

plus deterministic/source tests and implementation evidence.

The DB version bump and both opener interpretations must be in the same production commit/PR tranche.

---

# Part XXII — out of scope for this tranche

## 91. C0 immutable Yandex context

Not implemented/spec-closed here:

```text
account UID generation
root path generation
auth/config snapshot
createPublicLinks policy epoch
```

---

## 92. C1 remote exact content verification

Not implemented/spec-closed here:

```text
provider-side exact-content receipt
remote download/hash verification strategy
provider ETag semantics if any
exact object identity across upload/recovery
```

B0/B1 merely provide the local exact H/N/G/S that C1 must consume.

---

## 93. PDF fidelity owners

B0 source authority does not automatically close:

```text
P0-004 selection-bounded visual completeness
P1-003 selected visual resource readiness
P1-150 oversized frame representation
P1-229 cross-origin selected-only representation
P1-230 user-reached dynamic/virtualized content
```

A perfectly identified incomplete PDF is still incomplete.

Identity and fidelity are separate acceptance dimensions.

---

# Part XXIII — evidence level and conclusions

## 94. Evidence produced here

### L1

Source-bound reading of current:

```text
service-worker.js
offscreen.js
journal-import-digest.js
RESEARCH_REGISTRY.md
PDF/print/offscreen consolidated evidence
Wave 1 staged plan
```

### L2

Deterministic model:

```text
51/51 PASS
```

### Not produced

```text
no production source change
no current-HEAD deterministic product suite rerun
no unpacked Chrome B0/B1 physical run
no physical PDF artifact receipt for this proposed design
no real Yandex exact-content receipt
```

---

## 95. Final architecture decision for B0

Adopt:

```text
Probe A
-> one renderAttemptId R
-> debugger attach/setup
-> Probe B + top frame/loader
-> Page.printToPDF stream
-> one-pass H/N
-> Probe C + detach state
-> issue trusted G
```

Reject:

```text
Blob-only trust
G at attempt start
same tab/URL as source authority
post-hoc UUID trust promotion
```

---

## 96. Final architecture decision for B1

Adopt:

```text
WebClipPdfRetryCache v4

pdfs:
  immutable exact G rows

retryIndex:
  mutable pointer to latest retryable G

legacy v3:
  preserved as legacy-unbound
```

Reject:

```text
mutable tab row as operation identity
rewriting legacy rows into exact-v2
arbitrary caller cache key for exact offscreen upload
```

---

## 97. Final offscreen decision

For B1 exact retrieval require:

```text
G
H
N
S
```

and verify local immutable metadata + Blob size.

Do not add a redundant full Blob rehash in offscreen solely for B1.

Remote exact-content verification belongs to C1.

---

## 98. Status after this research tranche

```text
B0 source specification = DEFINED
B1 source specification = DEFINED
B0/B1 deterministic architecture model = PASS 51/51
production implementation = NOT STARTED
P0-023/P0-070/P0-079/P0-080 = remain ACTIVE
critical closure = INCOMPLETE
release readiness = unchanged / NOT READY
```

No new P-code is required by this tranche.

`P1-231` remains unallocated.

---

## 99. Next research tranche

The next dependency-ordered research target is:

```text
C0 immutable Yandex operation context
+
C1 exact remote content/effect receipt
```

That tranche should define how:

```text
P
G
H
N
S
account/root/auth/config/publication generation
remote object/effect identity
```

remain one immutable authority chain from signed upload admission through verification/recovery/public-link outcome.
