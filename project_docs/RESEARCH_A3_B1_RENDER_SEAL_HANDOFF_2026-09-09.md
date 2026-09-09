# WebClip — A3/B1 exact render-to-sealed-PDF handoff — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical Registry blob: `81e5867c0e0936b9524ece8949c53ad4ed83523c`  
Research branch: `research/a3-b1-render-seal-handoff-2026-09-09`  
Mode: **RESEARCH-ONLY / PRE-IMPLEMENTATION CHANGE-IMPACT DELTA**  
Production implementation: **NOT STARTED**.  
Release readiness: **NOT READY**.  
Yandex L5: **DEFERRED**.  
New P-code: **NO**. `P1-231` remains unallocated.

Primary composed owners:

```text
P0-070  exact full-document save generation / end-to-end save authority
P0-079  immutable operation-owned PDF cache generations
P0-071  guarded native Page.printToPDF render cut (DONE positive control)
P1-198  worker-issued physical operation identity
```

Required adjacent contracts:

```text
P0-080  exact live source/application/selection authority before render
P0-023  live-source retry versus exact owned-generation recovery
P1-086  IndexedDB result/commit publication after transaction completion
P1-157  class-correct Chrome/debugger lifetime semantics
P1-194  durable local-storage truth boundary / no overclaim of physical permanence
P1-156  prepared Save-As/local-download lifetime ownership
P1-169  released prepared-Save-As tombstone retention
P0-072  destructive/reset/recovery barrier for already admitted effects
```

This tranche consumes the preceding A1/A2 result:

```text
A1 exact reviewed content authority
-> A2 durable physical operation P
-> long prepareForPrint()
-> second exact A1 probe
-> A3 one exact guarded native render attempt R
-> B1 one create-once sealed PDF generation G
-> destination admission/recovery consumes G
```

It does not modify production runtime, manifest, Registry, version, build, tag, release or deployment.

---

# 1. Executive result

For the exact baseline above:

```text
A3 render-attempt contract                DEFINED / L2 PASS
B1 render-to-seal contract                DEFINED / L2 PASS
current production source                 RED / NOT IMPLEMENTED
current Chrome ReturnAsStream basis        L3 CONTROLLED PASS
current Chrome IDB create-once basis       L3 CONTROLLED PASS
existing incremental SHA-256 reuse         L2 PASS
production owner closure                   NO
release readiness                          NO
```

The central result is a two-boundary model:

```text
BOUNDARY A3
live source authority
-> guarded native Page.printToPDF settles clean
-> fixed browser-owned PDF stream

BOUNDARY B1
fixed browser-owned PDF stream
-> exact bytes N/H drained in worker
-> payload+metadata create-once transaction commits
-> durable application-level pdfGeneration G
```

These are deliberately separate truths.

A successful `Page.printToPDF` stream is **not** a durable PDF generation.
A complete in-memory Blob plus SHA-256 is **not** a durable PDF generation.
Only the successful B1 seal commit creates `G`.

Conversely, once A3 has cleanly settled and Chromium has issued the PDF stream, later page navigation must not invalidate that already-fixed render result merely because the worker is still draining `IO.read` chunks.

---

# 2. Why this delta exists

Earlier research already established three strong but separate contracts:

1. P0-070: accept only bytes produced from the exact admitted source generation, with a main-frame navigation fence around the native render;
2. P0-071: the real `Page.printToPDF` call is guarded, page scripts are frozen at the render cut, unsafe annotations are removed/restored, and guard cleanup fails closed;
3. P0-079: upload/retry bytes must live in immutable operation-owned generations, created once and committed atomically across payload+metadata.

The remaining gap was the exact handoff between them.

Without an explicit composition, a future implementation could accidentally:

```text
- treat a returned stream handle as durable bytes;
- treat a transient Blob as an immutable generation;
- compute a hash over a different copy than the bytes written to cache;
- update a tab alias before the exact generation commit;
- start a second render while an earlier Page.printToPDF command may still settle;
- rerender a live replacement document after the original PDF was already sealed;
- promote a legacy tab:<id> record into exact-v4 authority without provenance;
- let local-download and Yandex paths create two unrelated PDF identities for one P.
```

A3/B1 defines one state machine that prevents those semantic splits.

---

# 3. Current-source inventory on canonical main

Current source contains useful foundations, but not the future authority model.

## 3.1 Positive controls already present

`service-worker.js` currently uses:

```text
Page.printToPDF
transferMode = ReturnAsStream
IO.read
1 MiB production read chunks
48 MiB maximum PDF size
empty-PDF rejection
Blob assembled from decoded stream chunks
```

This is the right basic memory direction. B1 must not regress to a monolithic inline-Base64 `Page.printToPDF` result.

`pdf-print-guard.js` already:

```text
- intercepts the actual Page.printToPDF command;
- freezes script execution at the native render cut;
- performs bounded defensive link cleanup;
- restores state before returning success;
- closes the returned stream if cleanup fails;
- throws rather than returning an unsafe render result.
```

P0-071 therefore remains a strong positive control and is not reopened merely by this research.

## 3.2 Current RED facts

The deterministic source inventory records 20 concrete RED facts.

Important examples:

```text
PDF_CACHE_DB_VERSION = 3
pdfCacheKey(tabId) -> tab:<id>
payload writer uses put()
metadata writer uses put()
no renderAttemptId
no pdfGenerationId
no pdfSha256 receipt field
no sealed-v4 format
no ownerPhysicalOperationId on PDF cache generation
no exact source-generation receipt on the cached object
no explicit transient-byte versus sealed state
```

The Yandex path still receives a transient `pdfBlob` and later publishes it under the mutable tab alias.

The local-download path still creates a distinct temporary cache key:

```text
local-download:<operationId>
```

uses that object to create a Blob URL, then removes the temporary cache record.

Therefore current local and Yandex paths do not yet share one immutable PDF provenance object.

Current production source is correctly classified:

```text
A3/B1 CURRENT SOURCE = RED / NOT IMPLEMENTED
```

No research model or controlled browser fixture upgrades that status.

---

# 4. A3 identity model

## 4.1 Physical operation P remains the parent authority

A2 already establishes:

```text
physicalOperationId P
```

P is worker-issued and durable before long print preparation begins.

A3 must not mint another independent user operation merely because native render needs a retry.

Instead:

```text
P
└── renderAttemptId R1
    └── possible sealed pdfGeneration G
```

If R1 fails in a provably no-final-bytes/no-live-command state and source authority is still exact, the same P may later admit:

```text
P
├── R1 -> failed-no-bytes
└── R2 -> possible G
```

But after any G is sealed:

```text
P -> G
```

no further render attempt is allowed for that same physical operation.

## 4.2 One final sealed G per P

Target invariant:

```text
0 or 1 final sealed pdfGeneration per physicalOperationId P
```

Multiple render attempts are only pre-G recovery mechanics.

This gives downstream domains one stable provenance reference:

```text
P + G + N + H
```

rather than a list of equally authoritative render products.

## 4.3 `renderAttemptId`

`renderAttemptId` is worker-issued, opaque and unique within the common operation lineage.

Recommended form:

```text
render:<crypto.randomUUID()>
```

The prefix is diagnostic only.

It must never be derived from:

```text
tabId
URL
caller operationId
filename
current timestamp alone
```

---

# 5. Exact A3 admission sequence

The target sequence after A1/A2 is:

```text
1. A2 already has durable P.
2. content finishes long prepareForPrint() for the reviewed authority.
3. worker performs second exact A1 probe against expected documentId + receipt.
4. if stale -> same P terminalizes failed-before-effect/review-required.
5. worker creates R and persists/records the render-attempt phase.
6. worker establishes the P0-070 main-frame navigation monitor.
7. debugger/render admission begins.
8. actual Page.printToPDF passes through P0-071 guard.
9. P0-071 settles its render cleanup.
10. P0-070 checks that the navigation monitor stayed clean through guarded settlement.
11. if dirty/cleanup failed -> reject returned stream/bytes.
12. if clean and Page.printToPDF returned ReturnAsStream handle -> A3 render result is fixed.
13. live DOM/source authority is no longer consulted for those stream bytes.
14. B1 drains the stream, computes N/H and seals G.
```

The exact second probe is intentionally immediately before native-render admission, not merely before `prepareForPrint()`.

---

# 6. Critical refinement: when live source authority ends

A3 must avoid two opposite errors.

## 6.1 Too early is unsafe

It is unsafe to say source authority ends when the second probe passes.

Between the second probe and native render settlement:

```text
- the page could navigate;
- the document could be replaced;
- debugger attachment could target a replacement page;
- P0-071 cleanup could fail;
- render command could settle against a state no longer belonging to the admitted source.
```

Therefore P0-070 navigation monitoring remains authoritative through guarded `Page.printToPDF` settlement.

## 6.2 Too late causes false invalidation

It is also wrong to require the live page to remain unchanged through the entire `IO.read` drain.

With `ReturnAsStream`, once the guarded native render has cleanly returned a stream handle, Chromium has fixed the PDF render result represented by that handle.

A later navigation while the worker reads that fixed stream must not force a rerender or silently replace its source.

Thus:

```text
LIVE SOURCE AUTHORITY WINDOW
second exact probe
...
clean guarded Page.printToPDF settlement
END

FIXED BYTE-STREAM WINDOW
stream handle issued
...
IO.read EOF
END
```

The stream itself is ephemeral browser backing storage, not durable WebClip recovery authority.

---

# 7. A3 render-attempt receipt

Recommended operation-receipt substructure:

```js
render: {
  version: 1,
  attemptId: R,
  attemptNo,
  sourceReceiptRef,
  phase,
  startedAt,
  renderSettledAt,
  result,
  pdfGenerationId,
  lastError
}
```

Suggested phases:

```text
admitted
attaching
rendering
render-settlement-unknown-local
render-settled-clean
stream-draining
bytes-complete-transient
seal-commit-unknown
sealed
failed-no-bytes
failed-source-stale
failed-integrity
```

Persist only bounded safe diagnostic data.

Do not persist:

```text
CDP stream handle as a restart capability
full PDF bytes in the common operation receipt
page secrets
signed transfer URLs
tokens
raw debugger payload dumps
```

A stream handle is process/session-ephemeral. A worker restart must not pretend it can resume an old stream merely because text identifying the handle was persisted.

---

# 8. Render command unknown settlement

A timeout observed by WebClip does not by itself prove that the underlying Chrome/debugger command was cancelled.

Therefore:

```text
caller timeout != native command cancellation
```

If A3 loses certainty while `Page.printToPDF`/debugger cleanup may still be active:

```text
R -> render-settlement-unknown-local
```

Do not immediately launch R2.

Before another render attempt under the same P, the Chrome/debugger lifetime owner must establish that the earlier command/attachment can no longer publish a usable result into the operation.

Once quiescence is proven and no G exists:

```text
same P may admit a fresh R
```

This is adjacency with P1-157 and the existing debugger/late-settlement research, not a new P-code.

---

# 9. B1 exact byte acquisition

## 9.1 Keep ReturnAsStream

The production direction remains:

```text
Page.printToPDF({ transferMode: 'ReturnAsStream' })
-> stream handle
-> bounded sequential IO.read
-> exact decoded byte chunks
```

Do not regress to an inline Base64 PDF result.

## 9.2 Compute N and H on the exact stream chunks

Canonical byte receipt fields:

```text
N = exact byteLength
H = SHA-256 of the exact byte sequence
```

The repository already contains an incremental SHA-256 implementation loaded into the service-worker realm:

```text
WebClipSha256.create()
  .update(Uint8Array)
  .digestHex()
```

B1 should reuse it directly inside the existing `IO.read` loop.

Recommended pattern:

```js
const digest = WebClipSha256.create();
const parts = [];
let totalBytes = 0;

for each IO.read chunk:
  const bytes = decodeBase64(chunk.data);
  totalBytes += bytes.byteLength;
  enforce MAX_PDF_BYTES;
  digest.update(bytes);
  parts.push(bytes);

require EOF;
require totalBytes > 0;

const sha256 = digest.digestHex();
const blob = new Blob(parts, { type: 'application/pdf' });
require blob.size === totalBytes;
```

This has an important memory advantage over:

```text
Blob -> arrayBuffer() -> crypto.subtle.digest()
```

because the latter creates another potentially 48 MiB contiguous byte copy merely to hash data already present in the `IO.read` loop.

## 9.3 Hash truth

H must be computed over exactly the same decoded bytes that form the sealed Blob.

Not acceptable:

```text
hash metadata
hash Base64 text
hash a later reread from mutable tab alias
hash only a prefix/sample
hash a separately regenerated PDF
```

`N + H` become part of G before any external destination mutation is admitted.

---

# 10. B1 sealed generation schema

Recommended cache format:

```text
WebClipPdfRetryCache v4
cacheFormat = sealed-v4
```

Conceptual metadata:

```js
{
  key: `pdf:${G}`,
  cacheFormat: 'sealed-v4',
  version: 4,

  pdfGenerationId: G,
  ownerPhysicalOperationId: P,
  renderAttemptId: R,

  sourceReceiptRef: {
    browserDocumentId,
    contentRealmNonce,
    applicationGeneration,
    navigationEntryId,
    selectionRevision,
    selectionAuthorityId,
    selectionSnapshotSha256
  },

  byteLength: N,
  sha256: H,
  mimeType: 'application/pdf',
  createdAt,
  sealed: true
}
```

The exact source receipt may be stored inline or referenced through another exact receipt, provided the reference cannot silently retarget.

Do not use one generic `generation` field where multiple authority domains exist.

---

# 11. Atomic create-once seal

## 11.1 Transaction boundary

Payload and metadata must commit in one readwrite transaction.

Conceptual:

```text
transaction(payloadStore, metadataStore, readwrite)

payloadStore.add({ key: pdf:<G>, blob })
metadataStore.add({ key: pdf:<G>, ...receipt })

only tx.oncomplete => G exists
```

The use of `add()` is semantic, not stylistic.

A duplicate generation is not a normal update.

It means one of:

```text
- impossible UUID collision;
- duplicate/replayed creation path;
- corruption/logic bug;
- unknown prior commit that must be reconciled.
```

Therefore a second writer must not `put()` over the first exact object.

## 11.2 Application-level seal meaning

`sealed=true` means:

```text
- create-once application identity;
- payload+metadata committed atomically;
- exact N/H lineage recorded;
- ordinary code cannot replace bytes under the same G.
```

It does **not** claim IndexedDB is physically non-evictable or immune to browser/profile corruption.

That physical storage truth remains outside the meaning of the application seal and under the relevant storage durability owner.

---

# 12. Unknown B1 commit reconciliation

The difficult window is:

```text
add(payload)
add(metadata)
transaction commit may occur
worker/response disappears before caller observes tx.oncomplete
```

The caller must classify this as:

```text
seal-commit-unknown
```

not:

```text
not-sealed
```

On recovery, read exact G.

Truth table:

| Recovered state for exact G | Classification | Action |
|---|---|---|
| payload absent + metadata absent | not committed | may later render/seal again if exact source/retry rules permit |
| payload present + metadata present + exact owner/R/N/H/self-consistency | committed G | adopt existing G; do not create G2 |
| payload only | integrity failure | do not fabricate G; bounded repair/manual/degraded path |
| metadata only | integrity failure | do not fabricate G; bounded repair/manual/degraded path |
| both present but owner/hash/size mismatch | integrity conflict | hard fail; do not overwrite |

The normal cross-store atomic transaction should prevent split states, but recovery logic still must fail closed if storage damage or incompatible legacy state makes one observable.

---

# 13. Crash matrix across A3/B1

## Window 1 — P exists, before second probe

Truth:

```text
P exists
R absent
G absent
```

Recovery must not claim render success.

## Window 2 — second probe says stale

Truth:

```text
same P -> failed-before-effect/review-required
R absent or failed-source-stale
G absent
```

No automatic retarget to a new document.

## Window 3 — R admitted, before clean native render settlement

Truth:

```text
P exists
R exists
G absent
```

If native command settlement is uncertain, block R2 until debugger/command quiescence is proven.

## Window 4 — navigation observed during guarded render

Even if Chrome returned a stream:

```text
R invalid
stream rejected/closed
G absent
```

No byte acceptance.

## Window 5 — P0-071 cleanup fails

Even if Chrome returned a stream:

```text
R invalid
P0-071 closes stream
G absent
```

No byte acceptance.

## Window 6 — clean stream issued, worker dies before/while IO.read

Truth:

```text
A3 native render may have existed
B1 durable byte authority does not
G absent
```

The old stream is not a restart capability.

## Window 7 — all bytes read, N/H computed, before cache transaction

Truth:

```text
transient exact bytes exist only in worker memory
G absent
```

No destination effect may be admitted on the assumption that G exists.

## Window 8 — seal transaction started, commit outcome lost

Truth:

```text
G commit outcome unknown
```

Read/reconcile exact G before any rerender.

## Window 9 — tx.oncomplete observed

Truth:

```text
G exists
```

The operation now has durable application byte authority.

## Window 10 — G committed, tab pointer update missing

Truth:

```text
G still exists and is authoritative
pointer is missing/degraded discoverability only
```

Do not rerender merely because the tab index is absent.

## Window 11 — G committed, tab navigates/closes/reloads

Truth:

```text
G remains exact operation-owned byte authority
```

Recovery continues G and must not consult the current page to regenerate bytes.

---

# 14. Tab pointer semantics

A mutable tab index may remain useful for UI discovery, but it is never the PDF authority.

Target:

```text
tabRetryIndex:<tabId> -> G
```

Rules:

1. publish pointer only after G commit;
2. pointer failure does not invalidate G;
3. retry/recovery with an exact G never falls back to a newer tab pointer;
4. stale cleanup uses compare-and-remove:

```text
remove tab pointer only if current value == expected old G
```

5. a newer G cannot be erased by cleanup for an older G;
6. `tab:<id>` can never again be a mutable byte container in the v4 authority model.

---

# 15. v3 -> v4 migration semantics

## 15.1 No authority promotion by schema upgrade alone

Legacy v3 records are keyed by mutable tab aliases and do not carry complete exact lineage.

Therefore:

```text
v3 tab:<id> record
!=
sealed-v4 pdfGeneration
```

Opening DB version 4 must not:

```text
- assign a new G to every old tab record and call it exact;
- compute SHA-256 over an old mutable row and thereby invent operation provenance;
- bind an old record to the currently visible document;
- bind imported/legacy operationId text as live physical P authority.
```

Hashing old bytes can prove byte identity of those bytes, but cannot reconstruct the missing admitted source/physical-operation lineage.

## 15.2 Preferred migration

Upgrade should be lightweight:

```text
- create any needed v4 store/index shape;
- leave v3 rows explicitly legacy/unsealed;
- allow bounded compatibility cleanup/expiration;
- allow only newly created exact P/R/G flows to produce sealed-v4 authority.
```

Avoid a heavy eager rewrite inside `onupgradeneeded`.

## 15.3 Compatibility UI

If legacy cached PDF remains user-visible during transition, classify it truthfully, for example:

```text
legacy cached PDF — exact operation provenance unavailable
```

It must not satisfy new exact-recovery contracts that require G.

---

# 16. Local download and Yandex must converge on the same G

Current source has two different cache usages:

```text
Yandex -> mutable tab:<id> cache
local download -> temporary local-download:<operationId> cache
```

That split should disappear from the source-to-byte authority graph.

Recommended P0-070 composition:

```text
exact source
-> one A3 render R
-> one sealed G
-> choose/admit destination effect
   ├── local download consumes G
   └── Yandex upload consumes G
```

This does not redefine P0-079's root cause. P0-079 still owns immutable operation-owned PDF storage. P0-070 composes that primitive into both destinations to preserve one full-document generation.

Benefits:

```text
- local and remote Journal entries can reference the exact same PDF identity model;
- no destination-specific rerender can silently change bytes;
- local-download unknown settlement can name G;
- Yandex P1-184 can consume the same N/H already proven locally;
- retries after tab reload never need the live page;
- support diagnostics can correlate P -> R -> G -> destination receipt.
```

---

# 17. Blob URL and retention implications

Creating a Blob URL for local download is not evidence that the PDF generation can be deleted immediately.

A sealed G may still be referenced by:

```text
- unresolved local download intent;
- prepared Save-As lifecycle;
- Yandex retry/recovery;
- destination settlement reconciliation;
- Journal finalization;
- late-settlement/tombstone barriers.
```

Therefore G retention/GC must be owner-aware.

A future lifecycle layer must distinguish:

```text
sealed
pinned-by-active-effect
recoverable
terminal-retention
GC-eligible
```

TTL alone cannot delete unresolved authority.

This is an explicit handoff to the existing staging/storage/Save-As/recovery owners, not a reason to expand B1 into all GC policy in one patch.

---

# 18. Offscreen handoff

After B1, offscreen PDF operations must address exact G.

Target request identity:

```text
pdfGenerationId: G
```

not:

```text
tabId
current latest cache key
filename
path
```

Offscreen read behavior:

```text
1. read exact metadata G;
2. read exact payload G;
3. publish result only after readonly transaction completes where applicable;
4. require sealed-v4 metadata;
5. require payload size == N;
6. preserve/verify H according to the consuming path's trust boundary;
7. never fall back to tab latest if exact G is missing.
```

A missing exact G is an integrity/recovery condition, not permission to substitute a different PDF.

---

# 19. Destination checkpoint handoff

The first destination checkpoint after B1 should consume an exact receipt equivalent to:

```js
{
  physicalOperationId: P,
  pdfGenerationId: G,
  pdfByteLength: N,
  pdfSha256: H
}
```

Later Yandex composition adds account/root/context/publication authority, but must never recompute local content truth from:

```text
remote path
remote size alone
resource id alone
current tab cache alias
```

P1-184 can then compare remote content to the already durable local H.

---

# 20. P0-071 exact-document integration refinement

Current P0-071 render-state messaging is tab-addressed.

When A3 is implemented, the guard context should preferably carry the exact expected source document identity so hide/restore coordination cannot silently target a replacement document.

Conceptual guard context:

```js
{
  physicalOperationId: P,
  renderAttemptId: R,
  tabId,
  expectedDocumentId
}
```

Render-state messaging should use exact-document targeting when the Chrome API supports the required path.

If the expected document disappeared:

```text
fail / source stale
```

not:

```text
send to whichever content script now happens to live in the tab
```

Any production edit to `pdf-print-guard.js` must rerun the P0-071 safety regression/physical controls. This does not automatically reopen P0-071's root cause if its guarded-render safety contract remains preserved.

---

# 21. Performance and memory conclusions

## 21.1 Preserve bounded stream reads

Current production already avoids an inline whole-PDF Base64 result.

Keep that direction.

## 21.2 Reuse existing incremental hash

Hashing during `IO.read` means the main additional state is only the incremental SHA context rather than another whole-PDF copy.

## 21.3 Blob still has bounded memory cost

The current architecture ultimately materializes a Blob to store/download/upload the PDF.

B1 does not claim zero-copy rendering.

The current 48 MiB cap remains an important envelope unless changed by separate performance evidence.

## 21.4 Avoid eager legacy hashing during DB upgrade

Hashing every historical v3 Blob at upgrade time would produce:

```text
startup latency
memory pressure
long IDB upgrade transaction
no recovered provenance benefit
```

and is therefore not justified.

---

# 22. Security conclusions

This tranche is defensive architecture only.

Important security properties:

```text
- no raw PDF bytes in common operation logs;
- no signed URLs/tokens in G metadata;
- source receipt remains confidentiality-safe;
- SHA-256 identifies bytes but is not a secret-bearing URL/token;
- legacy data is not promoted into live mutation authority;
- same generation key cannot be overwritten with attacker/page-influenced different bytes through ordinary put semantics;
- stale page navigation cannot cause a recovered G to retarget to current DOM.
```

Do not expose full digest values in high-volume user UI by default; they are useful for integrity/support receipts and machine comparison.

---

# 23. Controlled Chrome evidence

Accepted final research receipt:

```text
workflow run: 34377258510
job:          102553076952
commit:       b43f11e8ba9539aa4b3b026d114c771f0e31a614
runner:       ubuntu-24.04
Node:         v22.23.2
Chrome:       Google Chrome for Testing 153.0.8010.36
```

## 23.1 L2 render/seal model

```text
A3/B1 render-to-seal research model: PASS; cases=22
```

Covered schedules include:

```text
second probe stale
unique R
navigation dirty during render
guard cleanup failure
incomplete stream
same-size/wrong-hash distinction
pre-seal crash
unknown/sealed boundary
create-once collision
post-seal restart
pointer ordering/CAS cleanup
exact G retry
one final G per P
destination checkpoint lineage
legacy-v3 non-promotion
```

## 23.2 Current-source inventory

```text
A3/B1 current-source inventory: PASS
RED facts=20
positive controls=8
```

This is intentionally RED with respect to implementation.

## 23.3 Incremental SHA reuse

```text
A3/B1 incremental SHA reuse: PASS; cases=21
```

`WebClipSha256.create()` matched Node SHA-256 across:

```text
empty bytes
small PDF-like bytes
larger PDF-like bytes
>1 MiB random bytes
multiple chunk split patterns including 1-byte, 63/64/65, 4096 and 1 MiB boundaries
```

This supports reuse of the existing helper in the PDF `IO.read` loop.

## 23.4 Current Chrome ReturnAsStream control

Exact Stable fixture produced:

```text
PDF bytes:     730182
IO.read calls: 180
PDF prefix:    %PDF-1.4
```

The fixture required:

```text
- non-empty ReturnAsStream handle;
- no inline PDF data in stream mode;
- sequential IO.read until EOF;
- decoded bytes beginning with %PDF-;
- multiple physical reads;
- explicit IO.close;
- SHA-256 over exact drained bytes.
```

This proves platform feasibility, not WebClip A3 implementation.

## 23.5 Current Chrome IndexedDB atomic/create-once control

Eight browser cases passed:

```text
1. create-once payload+metadata transaction commits
2. duplicate add aborts the whole cross-store transaction
3. aborted transaction leaves no payload-only orphan
4. committed generation survives DB close/reopen
5. reopened payload size matches metadata
6. reopened payload SHA-256 matches metadata
7. second create of sealed generation aborts rather than replaces
8. duplicate create leaves original exact bytes unchanged
```

This is strong L3 support for the proposed B1 primitive.

It is not a guarantee against all browser storage eviction/profile corruption and does not close the broader durable-storage owner.

---

# 24. Interpretation of browser/CDP evidence

The Chrome DevTools Protocol contract for `Page.printToPDF` in `ReturnAsStream` mode returns an `IO.StreamHandle`; bytes are then retrieved through `IO.read` and the handle can be closed through `IO.close`.

The controlled fixture verified that exact model on the current Stable target.

Therefore the implementation can distinguish:

```text
native render result fixed
!=
stream fully drained
!=
PDF generation durably sealed
```

That distinction is the core A3/B1 architecture.

---

# 25. Acceptance contract for future A3 production work

A3 cannot be claimed implemented until production source proves at least:

```text
[ ] exact second A1 probe immediately before render admission
[ ] worker-issued renderAttemptId
[ ] R bound to exact P and source receipt
[ ] operation-local main-frame navigation monitor
[ ] no automatic retarget to replacement document
[ ] actual Page.printToPDF still passes P0-071 guard
[ ] guard cleanup settlement included in render acceptance
[ ] dirty navigation monitor rejects render result
[ ] render command timeout/unknown settlement blocks unsafe overlapping R2
[ ] clean stream issuance marks end of live-source authority
[ ] no G success is published from stream issuance alone
```

Required regression:

```text
P0-071 guarded render physical/integration evidence remains PASS
```

---

# 26. Acceptance contract for future B1 production work

B1 cannot be claimed implemented until production source proves at least:

```text
[ ] WebClipPdfRetryCache v4 or equivalent exact-generation format
[ ] worker-issued pdfGenerationId G
[ ] exact P + R + source lineage in metadata
[ ] N and H computed over exact IO.read decoded bytes
[ ] existing incremental SHA helper reused or equivalently bounded implementation proven
[ ] payload + metadata use create-once semantics
[ ] both commit in one transaction
[ ] tx.oncomplete is the seal publication boundary
[ ] unknown-commit recovery reads exact G before rerender
[ ] duplicate G mismatch hard-fails; no overwrite
[ ] v3 tab rows remain legacy/unsealed
[ ] tab pointer updates only after committed G
[ ] stale cleanup cannot erase newer pointer
[ ] offscreen reads exact G, not tab latest
[ ] local download consumes exact G
[ ] Yandex upload/retry consumes exact G
[ ] post-seal tab navigation cannot trigger replacement render
[ ] unresolved destination ownership prevents premature G GC
```

---

# 27. Recommended implementation slicing

Do not land all Wave1 domains in one production PR.

A dependency-safe sequence is:

## B1.1 — sealed cache storage primitive

```text
DB v4 shape
exact G keys
payload+metadata add() transaction
exact read
unknown-commit reconciliation
legacy-v3 classification
pointer CAS helpers
```

No destination cutover yet if that keeps review smaller.

## A3.1 — exact render attempt and byte receipt

```text
R identity
second probe integration
navigation monitor
P0-071 guarded settlement composition
incremental N/H during IO.read
render result structure
```

## B1.2 — seal-on-render composition

```text
A3 transient byte receipt
-> atomic G seal
-> operation receipt references G
```

## B1.3 — destination cutover

```text
local Blob URL from exact G
Yandex/offscreen from exact G
remove authority dependence on mutable tab byte slot
```

## B1.4 — lifecycle/retention handoff

```text
pin unresolved G
terminal retention
CAS pointer cleanup
bounded legacy-v3 cleanup
```

Then run a targeted Closure Sweep for:

```text
P0-070
P0-079
P0-023
P1-086
P1-157
P1-194
local-download/Save-As adjacent owners
```

No Registry status transition occurs from this research alone.

---

# 28. What must not be combined prematurely

Avoid these shortcuts:

```text
A. Seal directly into tab:<id> and add a hash.
   -> still mutable alias authority.

B. Hash old v3 rows during upgrade and call them G.
   -> byte identity without admitted provenance.

C. Write payload, await, then write metadata in a second transaction.
   -> crash can publish split truth.

D. Use put() because UUID collision is unlikely.
   -> replacement semantics remain possible and hide replay bugs.

E. Publish tab pointer first, then write G.
   -> pointer can name an uncommitted object.

F. Treat Page.printToPDF success as sealed success.
   -> browser stream is not durable cache authority.

G. Require page to stay unchanged through the whole IO.read drain.
   -> wrongly invalidates a fixed browser render stream.

H. Rerender current page after G exists because tab latest is missing.
   -> breaks exact operation provenance.

I. Keep separate local and Yandex PDF identities for one P.
   -> breaks end-to-end full-document authority.

J. Delete G as soon as a Blob URL exists.
   -> may destroy unresolved local/remote settlement authority.
```

---

# 29. Final A3/B1 decision

For exact canonical baseline `d4f5b268...` and current Stable `153.0.8010.36`:

```text
A3/B1 RESEARCH CONTRACT READY      = YES
A3/B1 L2 MODEL                     = PASS
A3/B1 CURRENT-STABLE L3 BASIS      = PASS
CURRENT PRODUCTION IMPLEMENTATION  = RED / NOT IMPLEMENTED
P0-070 CLOSED                      = NO
P0-079 CLOSED                      = NO
P0-071 REOPENED                    = NO
NEW P-CODE                         = NO
P1-231 ALLOCATED                   = NO
RELEASE READY                      = NO
YANDEX L5                          = DEFERRED
```

The canonical handoff is:

```text
exact reviewed source receipt
-> durable physical operation P
-> exact second source probe
-> worker-issued render attempt R
-> guarded native render settles clean under navigation fence
-> fixed Chromium PDF stream
-> bounded sequential IO.read
-> exact N + incremental SHA-256 H over the same bytes
-> Blob with size N
-> one atomic create-once payload+metadata transaction
-> tx.oncomplete
-> sealed pdfGeneration G
-> optional tab discoverability pointer
-> local/Yandex destination consumes exact G
```

This is the strongest truthful pre-implementation architecture supported by current source analysis, deterministic schedules and current-Stable controlled browser evidence.

---

# 30. Next research handoff

The next high-value tranche is **B2 — sealed-generation lifetime, pinning, GC and destination ownership**.

Reason:

B1 defines how exact bytes become durable application authority, but a correct generation is still unsafe if ordinary TTL/quota cleanup can delete it while:

```text
- a local download is unresolved;
- Save-As owns a prepared Blob;
- Yandex upload/retry is unresolved;
- destination settlement is unknown;
- Journal finalization still references G;
- destructive reset/clear occurs concurrently.
```

B2 should therefore compose P0-079 with the existing staging/storage/Save-As/recovery owners and define the exact pin/unpin/GC eligibility graph before C0 destination context implementation relies on G durability.
