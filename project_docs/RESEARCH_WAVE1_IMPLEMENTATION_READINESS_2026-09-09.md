# WebClip — Wave 1 implementation-readiness: exact saved-artifact authority chain — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Research branch: `research/wave1-implementation-readiness-2026-09-09`  
Parent architecture evidence: `research/wave1-save-operation-receipt-architecture-2026-09-09@53032bd350ca6e108cdf40177a4cf7a4c57bc773`  
Mode: **RESEARCH-ONLY / IMPLEMENTATION-READINESS**  
Primary owners composed: **P0-070, P0-023, P0-079, P0-073, P0-074, P1-184, P0-078, P0-076**  
Required adjacent authorities: **P0-080, P0-071, P1-198, P0-072** and destination-specific external-settlement owners.

This checkpoint does not modify production runtime, `manifest.json`, Registry status, release readiness, version, build, tag, GitHub Release or deployment.

## 1. Purpose of this tranche

The preceding Wave 1 architecture established the end-to-end authority rule:

```text
exact admitted source
-> exact guarded render
-> immutable operation-owned PDF generation
-> immutable destination context
-> exact external content proof
-> publication authority
-> exact Journal finalization authority
```

That architecture is research-complete, but a future production implementation could still introduce rollout defects if schema migration, legacy state, crash points and multi-context storage rules are left to ad-hoc implementation decisions.

This tranche therefore answers the implementation-readiness questions before any production write:

1. What exact persistent schema should the PDF cache use?
2. How can v3 data coexist safely with the new schema without fabricating authority?
3. Which writes must be atomic and which must remain separate semantic phases?
4. Where should SHA-256 be computed so it identifies the exact guarded Chromium bytes without a second large-memory pass?
5. What must the offscreen process verify before sending a signed upload?
6. How should a remote-save checkpoint evolve to carry enough non-secret authority for restart recovery?
7. How are auth/config/publication generations represented without exporting local authority or persisting tokens?
8. Which old pending rows are safe for automatic recovery and which must become bounded manual/legacy states?
9. Where must Journal generation be captured and rechecked?
10. What is the smallest staged implementation sequence that does not create temporary false-success paths?

No new P-code is justified by these questions. They are cross-owner composition and rollout requirements of existing ACTIVE owners.

## 2. Canonical source points inspected

All source observations below are from exact canonical baseline:

```text
main = d4f5b268fa3f7ced5a7bc68da52784863d614138
```

Relevant production files:

```text
service-worker.js
offscreen.js
offscreen.html
offscreen-bootstrap.js
content.js
journal.js
journal-import-digest.js
```

Relevant current constants include:

```js
const PDF_CACHE_DB_NAME = 'WebClipPdfRetryCache';
const PDF_CACHE_STORE = 'pdfs';
const PDF_CACHE_META_STORE = 'meta';
const PDF_CACHE_DB_VERSION = 3;
const PDF_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_PDF_BYTES = 48 * 1024 * 1024;
const PDF_STREAM_READ_CHUNK_BYTES = 1024 * 1024;
```

Both `service-worker.js` and `offscreen.js` currently open the same extension-origin PDF cache database at version `3`.

Current cache identity is still:

```js
function pdfCacheKey(tabId) {
  return `tab:${tabId}`;
}
```

Current `putCachedPdf()` already has one useful atomicity property: payload and metadata are written in one IndexedDB readwrite transaction. However both writes use replace-capable `put()`:

```text
pdfs.put(normalizedRecord)
meta.put(metadata)
```

This is insufficient for a sealed immutable generation.

Current live retry is still tab/current-URL based:

```text
WEBCLIP_RETRY_PDF_TO_YANDEX
-> sender.tab.id
-> getValidCachedPdfForTab(tabId)
-> tab:<id>
-> current URL comparison
```

The message handler does not use `sender.documentId` as retry authority.

Current offscreen signed upload resolves the PDF again from IndexedDB by `spec.pdfCacheKey` immediately before `fetch()`. Therefore correctness depends on that key naming an immutable object rather than a mutable alias.

## 3. Important rollout discovery: PDF cache version is a cross-context contract

`WebClipPdfRetryCache` is not private to the service worker.

It is opened by at least:

```text
service-worker.js
offscreen.js
```

Both currently request version `3`.

IndexedDB versioning has an important consequence:

```text
actual database version = 4
caller opens requested version = 3
-> VersionError
```

Therefore a future v4 schema cannot be rolled out by changing only `service-worker.js` while leaving `offscreen.js` at v3.

### Positive control already present

Both worker and offscreen database helpers install a `versionchange` handler that closes the open connection.

That is exactly the cooperative behavior needed to allow an upgrade transaction to proceed rather than leaving a permanently blocking old connection.

### Required rollout rule

Any PDF-cache DB-version change must update, in one production tranche:

```text
service-worker.js PDF_CACHE_DB_VERSION
offscreen.js PDF_CACHE_DB_VERSION
all schema creation/open contracts
all new-record validators
all offscreen exact-record readers
```

A source gate should fail if the worker/offscreen requested versions diverge.

## 4. Proposed PDF cache v4 schema

Recommended version:

```text
PDF_CACHE_DB_VERSION = 4
```

Retain the existing stores:

```text
pdfs
meta
```

Add one dedicated discovery-index store:

```text
retryIndex
```

Conceptually:

```text
pdfs:
  key = pdf:<generation>
  value = exact Blob payload + bounded immutable generation identity

meta:
  key = pdf:<generation>
  value = exact sealed metadata/provenance receipt

retryIndex:
  key = tabId
  value = exact current live-retry pointer
```

### Why a separate `retryIndex` store is preferred

Do not overload the current `meta` store with pointer rows.

Current TTL cleanup iterates metadata rows and assumes the metadata key corresponds to a payload key; it deletes payload and metadata together by that key.

Mixing `tab -> generation` index rows into the same metadata namespace would make cleanup semantics ambiguous and could accidentally treat a pointer as a physical payload record.

A dedicated store keeps physical immutable object identity separate from mutable UI/discovery index, which is exactly the P0-079/P0-023 distinction.

## 5. New PDF generation key

For a newly generated PDF:

```text
pdf:<G>
```

where `G` is a worker-issued opaque PDF-generation identifier.

Rules:

1. `G` is not `tabId`.
2. `G` is not the caller textual `operationId`.
3. `G` is not a Yandex resource id.
4. `G` is not the source browser `documentId`.
5. identical PDF bytes from two legitimate operations may still have different `G` values.
6. `G` is object identity; SHA-256 is byte integrity/content identity.

This does not compete with P1-198. P1-198 owns the physical live operation identity; P0-079 owns the PDF byte-object generation identity.

## 6. Proposed sealed PDF metadata

Conceptual v4 metadata:

```js
{
  schemaVersion: 4,
  key: 'pdf:<G>',
  generation: '<G>',
  ownerPhysicalOperationId: '<P1-198 internal physical id/ref>',
  clientOperationId: '<bounded correlation only, optional>',
  sourceReceipt: {
    version: 1,
    tabId,
    browserDocumentId,
    applicationGeneration,
    selectionRevision,
    navigationEntryId,
    admittedUrl
  },
  tabId,
  filename,
  createdAt,
  journalEntryId,
  byteLength,
  sha256,
  cacheFormat: 'blob-v4',
  sealed: true,
  boundedExistingMeta: ...
}
```

The exact persisted representation may use a compact receipt id or normalized nested object, but the semantic authority may not be reconstructed later from current tab URL/settings.

## 7. Atomic create-once transaction

A new PDF generation should be committed in one IndexedDB transaction spanning:

```text
pdfs
meta
retryIndex
```

Conceptual sequence:

```text
readwrite transaction
  pdfs.add(payload G)
  meta.add(metadata G)
  retryIndex.put(tab -> G/current-source receipt)
commit
```

Important distinction:

- `add()` for the sealed payload/metadata object: duplicate generation is a conflict, never replacement;
- `put()` for the mutable discovery pointer: moving `tab -> G-A` to `tab -> G-B` is expected.

Publishing the retry pointer only after a separate transaction would create a state where the sealed generation exists but UI discovery remains stale. A one-transaction creation gives the stronger invariant that if `retryIndex` points to G after commit, payload G and metadata G committed in the same transaction.

If quota/error aborts the transaction, all three writes roll back together.

### Unknown caller timeout

A caller-side timeout is not evidence that the IndexedDB transaction aborted.

Therefore an uncertain `create(G)` is reconciled by exact-key read after the actual transaction barrier, not by a replace-capable rewrite.

If exact sealed G exists with the expected receipt/integrity, adopt it. If G is authoritatively absent, a new create attempt may be admitted according to the operation owner. If G exists with conflicting metadata/bytes, fail closed as corruption/conflict.

## 8. Same-tab concurrency schedule

Required safe schedule:

```text
A -> source S-A -> pdf:G-A
B -> source S-B -> pdf:G-B
both tab 7
```

After B commits:

```text
pdf:G-A remains exact A bytes while A has an owner
pdf:G-B remains exact B bytes
retryIndex[7] -> G-B
```

Late A cleanup:

```text
deleteExact(G-A)
```

must not delete G-B and must not clear `retryIndex[7]` unless the pointer still equals G-A.

This is compare-and-remove pointer cleanup, not tab-wide cleanup.

## 9. Legacy v3 PDF rows: do not manufacture authority during upgrade

Existing v3 rows are keyed like `tab:<id>`. They may contain a valid PDF Blob and useful historical metadata, but they do not contain the exact source/operation authority required by P0-023/P0-070/P0-079.

Unsafe migration:

```text
for each tab:<id> row
  mint UUID G
  copy row to pdf:G
  mark sealed/current/exact
```

A new UUID does not prove which browser document/application generation produced an old row.

Recommended v3 -> v4 upgrade:

1. create `retryIndex` if absent;
2. preserve existing `pdfs`/`meta` stores;
3. leave existing `tab:<id>` rows untouched;
4. create no trusted retry pointer for legacy rows;
5. avoid copying/re-hashing large old blobs inside the upgrade transaction.

Legacy rows then remain `legacy-unbound` and may expire under existing TTL cleanup. This minimizes migration time/quota risk and avoids inventing provenance.

## 10. Live retry and durable operation recovery are separate APIs

### Live current-page retry

```text
retryForCurrentLiveSource(...)
```

Authority comes from actual MessageSender tab/frame/document + current P0-080 application/selection receipt + retryIndex exact pointer + sealed PDF sourceReceipt equality.

Required rejection examples:

```text
same URL, new documentId -> stale-source
same documentId, new applicationGeneration -> stale-source
same app generation, new selectionRevision -> stale-source
legacy tab row -> legacy-unbound / unavailable for exact live retry
```

### Durable recovery

```text
recoverExactOwnedGeneration(pdfGenerationReceipt)
```

This path does not consult current tab/latest pointer to decide byte identity. It may legitimately continue operation A after tab navigation, reload, close, or source B becoming current, provided its durable operation checkpoint still owns exact generation G-A and destination authority remains valid.

## 11. P0-080/P0-070 handoff remains an upstream prerequisite

P0-080 already defines the correct worker admission envelope:

```text
content applicationGeneration + selectionRevision
+
actual sender.tab.id / sender.frameId / sender.documentId
```

The content receipt must be revalidated immediately after long print/resource preparation and before the irreversible worker save command. P0-070 then owns the source through the guarded render interval.

A P0-079 storage foundation can be implemented before full P0-080/P0-070 closure, but it must not claim exact-source closure until the persisted `sourceReceipt` is supplied by those owners. Temporary implementation should fail closed or mark authority incomplete rather than synthesize source authority from URL.

## 12. New finding: compute PDF SHA-256 in the existing Chromium stream loop

Current `generatePdfBlob(tabId)` already uses:

```text
Page.printToPDF transferMode=ReturnAsStream
-> IO.read in bounded chunks
-> base64 decode to Uint8Array
-> parts.push(bytes)
-> new Blob(parts)
```

The exact physical byte stream is therefore available before Blob assembly.

The worker already imports the pure incremental SHA-256 helper `journal-import-digest.js`, exposing `WebClipSha256.create()`.

Recommended render return value:

```js
{
  blob,
  byteLength,
  sha256
}
```

During each successful decoded `IO.read` chunk:

```text
sha.update(bytes)
totalBytes += bytes.length
parts.push(bytes)
```

After EOF:

```text
sha256 = digestHex()
blob = new Blob(parts, {type:'application/pdf'})
require blob.size == totalBytes
```

This binds the digest directly to the exact guarded Chromium bytes accepted at P0-070's render cut. It avoids a second traversal of up to 48 MiB, an extra full PDF ArrayBuffer copy, additional IPC, and a race where digest and stored bytes are obtained from different mutable aliases.

The same `{byteLength, sha256}` becomes the P0-079 sealed receipt and P1-184 expected remote content truth.

## 13. Guarded render failure rule

The digest is not accepted merely because some chunks were read.

P0-070/P0-071 rules remain:

```text
render successful
+ source-generation fence clean
+ IO stream fully read
+ IO close/guard cleanup successful
-> accept blob/length/digest
```

Any source-navigation/guard/cleanup failure before byte acceptance discards partial parts, partial digest and returned blob if any, and creates no sealed G.

## 14. Offscreen exact-transfer contract

Future transfer spec should carry at least:

```js
{
  mode: 'pdf-cache-upload',
  pdfCacheKey: 'pdf:<G>',
  pdfGeneration: '<G>',
  expectedPdfBytes: N,
  expectedSha256: H,
  url: '<opaque signed capability>',
  method: 'PUT',
  contentType: 'application/pdf'
}
```

Offscreen should read payload + metadata in one readonly transaction and prove:

```text
key == expected exact key
generation == expected generation
payload generation == metadata generation
sealed == true
metadata byteLength == expected N
Blob size == expected N
metadata sha256 == expected H
```

Then and only then use the Blob for the signed request. Missing/corrupt G means fail/defer. Never fall back to `tab:<id>`, latest for tab, same filename, same URL or same byte size.

## 15. Should offscreen re-hash the local Blob before every upload?

Not required as the default architecture if all of the following are true:

1. H was computed from exact Chromium bytes before sealing;
2. payload + metadata + pointer were atomically committed under exact G;
3. G is create-once and cannot be overwritten;
4. offscreen reads exact G payload + metadata in one transaction;
5. it verifies exact byte length and H metadata before transfer;
6. P1-184 verifies actual remote content after upload/recovery.

A full local re-hash before every network retry would add repeated work without repairing an authority gap if sealed-store invariants already hold. A maintenance/corruption diagnostic may still re-hash a local Blob when required.

## 16. P1-184 remote exact-content verification

The durable remote verifier should consume:

```text
expectedPdfBytes = N
expectedSha256 = H
pdfGeneration = G
```

Never degrade to path+size success.

After live provider validation, trustworthy provider metadata SHA-256 may be a fast path. Otherwise the provider-independent fallback remains:

```text
obtain exact signed download capability
-> bounded stream
-> incremental SHA-256
-> exact length N
-> exact digest H
```

Only then may the remote object be adopted as exact content of the operation.

## 17. New offscreen mode for provider-independent remote hash fallback

Current offscreen supports PDF upload and text transfer but not bounded binary remote-download hashing.

Recommended future mode:

```text
binary-hash-download
```

Inputs:

```text
signed GET URL
expectedBytes N
maximumBytes <= MAX_PDF_BYTES
expectedSha256 H
operation/transfer correlation
```

Behavior:

```text
fetch signed URL
-> stream response body
-> bounded byte counter
-> WebClipSha256.update(chunk)
-> do not accumulate whole PDF
-> return only byteLength + sha256 + safe status
```

This avoids returning a 48 MiB binary body through runtime messaging and keeps memory bounded.

`journal-import-digest.js` is already a pure global SHA-256 helper. A future offscreen bootstrap may load it before `offscreen.js` or introduce a generic digest helper derived from the same code; avoid duplicate divergent SHA implementations.

## 18. Yandex live context must be captured, not repeatedly reread

Current source still has `yandexApi(...) -> getValidYandexAccessToken()` for every request, and `ensureYandexServiceFolders()` fresh-reads config/token.

Target live context:

```js
YandexOperationContext {
  version: 1,
  contextId,
  authGeneration,
  configGeneration,
  accountUid,
  rootPath,
  createPublicLinksSnapshot,
  // secret token capability memory-only
}
```

Every GET/folder/upload-URL/verify/publish/poll in one remote item consumes this same live context.

## 19. Auth generation must describe capability replacement, not metadata refresh

Current `writeYandexAuth()` is used both to install/remove access-token capability and to update cached account metadata under an already-held token.

A future `authGeneration` must not rotate every time cached account metadata is enriched. Otherwise one semantic auth capability would appear to change merely because a profile cache field was filled in.

Recommended internal split:

```text
replaceYandexAuthCapability(...)
  -> rotates auth generation

updateYandexAuthMetadata(...)
  -> preserves auth generation
```

Transitions that should rotate authority include connect/new token, manual token replacement, disconnect, and reauthorization to a new capability. Exact refresh-token semantics remain with the auth owner.

## 20. Tokens remain non-durable outside existing secure auth storage

Wave 1 remote checkpoints must never contain access token, Authorization header, signed URL, PKCE verifier or other bearer capability.

Durable checkpoint stores only safe authority metadata such as authGeneration, accountUid, configGeneration, rootPath and a non-secret context identifier.

After MV3 restart, recovery acquires a new live context and proves it matches the durable expected account/scope before remote reconciliation.

## 21. Config generation and root semantics

P0-074 requires a coherent config snapshot, while P0-073 requires operation-owned durable root/path to survive later settings changes.

Recommended distinction:

```text
configGeneration = exact operation-relevant settings generation at admission
stored rootPath = durable location truth for this operation
current configured root later = irrelevant to old operation identity
```

A same-account root setting change after admission must not rewrite the old operation's root/path. A new operation under the new root receives a new context/config generation.

## 22. Publication policy should be a dedicated local authority record

Current `createPublicLinks` is a portable Boolean preference. Authority needs a local generation:

```js
publicLinkPolicy = {
  version: 1,
  generation: '<opaque local generation>',
  enabled: true|false
}
```

Recommended storage is a dedicated local authority state, not an authority generation trusted from imported user-settings JSON.

Imported settings may request a Boolean value but must not install old local authority. Unrelated Yandex config changes must not rotate privacy policy authority. ABA `true -> false -> true` requires distinct generations.

## 23. Publication-policy writer contract

All writers changing the effective Boolean must use one serialized transition primitive. Current writers include dedicated Yandex preferences and user-settings import.

Required semantics:

```text
same effective Boolean -> generation unchanged
true -> false -> new generation; old eligible/not-admitted receipts revoked
false -> true -> new generation; authority only for newly admitted operations
```

A settings import carries desired preference, not authority generation. The local system mints the new generation when it commits the transition.

## 24. Publication admission must precede the first remote publish mutation

Recommended operation receipt:

```js
publication = {
  generation: '<policy generation observed by operation>',
  requested: true|false,
  phase: 'eligible' | 'admitted' | 'unknown' | 'verified-public' |
         'revoked-before-admission' | 'manual-publication-authority-unverifiable'
}
```

Before first `/resources/publish` mutation:

```text
serialize against policy writers
-> require current policy generation == operation generation
-> require enabled
-> durably transition eligible -> admitted
-> release local policy barrier
-> perform remote mutation through P0-074 context
```

If disable commits before `admitted`, old publication is revoked. If disable commits after `admitted`, it is not cancellation evidence; reconcile actual remote publication outcome.

## 25. Journal generation must be captured at save admission, not at finalization

P0-076's generation fence applies to long save operations even when no Journal row exists yet.

Unsafe timing:

```text
start save
long render/upload
read current Journal generation only at final append
```

Schedule:

```text
T0 operation admitted under Journal generation J1
T1 long render begins
T2 user clear/import rotates Journal generation J2
T3 old operation finishes
T4 if operation reads current J2 and appends, old work enters new Journal world
```

Required: `expectedJournalGeneration = J1` captured at trusted worker save admission and carried forward in the operation/checkpoint.

## 26. Journal fence before external effect admission

Before admitting a new external download/upload mutation, recheck:

```text
current Journal generation == expectedJournalGeneration
```

If stale before any external effect admission, fail/abort old operation with zero new external mutation.

If an external effect was already admitted before a later reset, do not pretend cancellation; reconcile external truth under P0-072/destination owners, but block stale Journal finalization into J2.

## 27. Capture Yandex operation intent before long render

Current flow often reads remote config when upload begins after PDF generation.

For user-intent continuity, the operation should capture relevant Yandex destination intent at trusted worker save admission:

```text
root/config generation
publication policy receipt
expected Journal generation
worker physical operation identity
```

The access token live context may be acquired at admission or immediately before remote work, but it must be coherent with the operation-owned expected account/config and remain immutable for that remote item.

This prevents a long render from silently changing destination because the user edited Yandex settings midway.

## 28. Proposed pending remote-save V2 checkpoint

Conceptual durable non-secret form:

```js
{
  version: 2,
  phase: 'prepared',
  operationGeneration: '<physical operation id/ref>',
  clientOperationId: '<correlation optional>',
  source: {
    version: 1,
    browserDocumentId,
    applicationGeneration,
    selectionRevision
  },
  pdf: {
    key: 'pdf:<G>',
    generation: '<G>',
    byteLength: N,
    sha256: H
  },
  yandexScope: {
    version: 1,
    accountUid,
    rootPath,
    remotePath
  },
  yandexContext: {
    version: 1,
    authGeneration,
    configGeneration,
    accountUid
  },
  publication: {
    generation,
    requested,
    phase
  },
  journal: {
    expectedJournalGeneration,
    journalEntryId
  },
  remote: {
    phase,
    resourceId,
    revision,
    verificationKind,
    verifiedSha256,
    publicUrl
  },
  createdAt,
  updatedAt,
  attemptCount,
  lastError
}
```

This is an architecture schema, not a requirement to use one mutable monolithic record internally. Persisted updates should remain phase-scoped and compare current expected state before transition.

## 29. Checkpoint size is not a blocker

The deterministic readiness model constructs a representative V2 receipt with UUID-sized generations, bounded account fields and a 64-character SHA-256.

Actual execution result:

```text
Wave 1 implementation-readiness model: PASS
representative-v2-json-chars=1336
```

The current per-row pending limit is approximately 320 KiB JSON characters. Therefore the proposed authority fields consume only a small fraction of the existing checkpoint envelope. This does not waive field-specific bounds.

## 30. Remote checkpoint state machine

Recommended minimum remote/content phases:

```text
prepared
upload-admitted
upload-unknown
content-verification-pending
content-verified
manual-content-authority-unverifiable
manual-scope-authority-unverifiable
```

Publication subphase:

```text
skipped-disabled
eligible
admitted
unknown
verified-public
revoked-before-admission
manual-publication-authority-unverifiable
```

Journal/finalization subphase:

```text
journal-pending
journal-finalized
manual-journal-authority-unverifiable
stale-journal-generation
```

The implementation can normalize these into fewer structured fields, but must preserve the semantic distinction between not-started, admitted, unknown and verified external effects.

## 31. Critical crash boundary: `upload-admitted`

Before the offscreen signed PUT may start, persist:

```text
prepared -> upload-admitted
```

Then call offscreen PUT.

If the worker dies or response is lost after admission, outcome is `may have happened / unknown`, not `cancelled / safe to blindly upload again`.

Recovery first performs exact remote-content reconciliation against `N/H/G`.

## 32. Resource id and revision are downstream of exact content proof

P1-184 ordering remains:

```text
prove remote content H
-> bind observed resource_id/revision
-> allow later publication/finalization
```

A newly observed resource id after unknown PUT proves only which object exists now, not that it contains operation-owned bytes. Path, size, RID and revision cannot replace H.

## 33. Legacy pending Yandex checkpoints: no automatic authority synthesis

Existing pending rows may lack future receipts. Never repair them by reading current mutable state and copying it into the old row.

Forbidden inference examples:

```text
missing expectedSha256 -> hash current/latest PDF and claim it belonged to old operation
missing accountUid/root -> copy current account/root
old createPublicLinks=true without generation -> bind current true generation
missing expectedJournalGeneration after reset -> copy current Journal generation
```

Each would convert missing evidence into apparently exact authority.

## 34. Legacy recovery classification

### Missing exact PDF generation or SHA-256

```text
manual-content-authority-unverifiable
```

No automatic size-only remote verification or publication/final Journal success.

### Missing durable account/root scope

```text
manual-scope-authority-unverifiable
```

No cross-account remote probing.

### `createPublicLinks=true` but no exact policy generation

```text
manual-publication-authority-unverifiable
```

No automatic new publish. A legacy false request remains privacy-safe and must not be upgraded to later current true.

### Missing expected Journal generation after a destructive boundary

```text
manual-journal-authority-unverifiable
```

No late automatic success insertion into the new Journal generation.

## 35. Preserve historical facts

The legacy rules above apply to unresolved operations and future side effects.

Do not rewrite already completed historical Journal facts merely because they predate stronger receipts. A historical entry can truthfully remain a historical record while the system refuses to claim stronger exact provenance than was recorded at the time.

## 36. Worker-issued operation identity integration

P1-198 requires:

```text
caller operationId = optional correlation
worker physicalOperationId = physical live execution identity
domain receipt = continuation authority
```

Wave 1 should consume that boundary.

A future PDF generation record may store `ownerPhysicalOperationId` and `clientOperationId` (diagnostic only), but retry/recovery must not use client correlation equality as a capability.

If P0-079 storage lands before P1-198, it may safely mint distinct PDF generation G, but owner-operation field must remain explicitly provisional/non-authoritative until P1-198 supplies trusted physical operation context. Do not solve P1-198 by making G itself a universal operation token.

## 37. Source-bound implementation gates

### PDF DB/schema gate

- worker and offscreen PDF DB versions are identical;
- v4 has dedicated retry index store;
- new payload key is not solely `tab:<id>`;
- new sealed generation uses create-once semantics;
- pointer is distinct from payload identity;
- legacy v3 rows are not auto-promoted into exact authority;
- delete/TTL cleanup is exact-generation aware and pointer compare-and-remove safe.

### Render-integrity gate

- `generatePdf...` computes SHA-256 over exact `IO.read` decoded bytes;
- digest finalization happens only after complete clean render/stream settlement;
- returned artifact carries Blob + exact byteLength + SHA-256;
- sealed cache persists same N/H values.

### Source-generation gate

- save admission stamps actual `sender.documentId`/frame/tab;
- exact P0-080 receipt is consumed;
- URL equality alone cannot admit retry;
- live retry validates exact source receipt;
- durable exact recovery does not consult current tab identity.

### Offscreen transfer gate

- transfer names exact `pdf:<G>`;
- expected G/N/H cross boundary;
- offscreen validates payload+metadata together;
- no tab/latest fallback exists;
- signed URL remains opaque and is not persisted/logged.

### Yandex context gate

- one live context acquired per remote item;
- context-bound API does not reread current token internally;
- folder creation/upload URL/verify/publish/poll share context;
- token absent from durable checkpoint/log representations;
- auth generation distinguishes capability replacement from metadata cache update.

### Publication gate

- dedicated generation exists;
- all Boolean writers use one transition rule;
- settings import cannot inject generation;
- `eligible -> admitted` is durable before publish mutation;
- old generation cannot resurrect after false->true ABA;
- admitted/unknown is reconciled rather than declared cancelled.

### Journal gate

- expected Journal generation captured at worker save admission;
- persisted before external continuation can outlive worker state;
- pre-effect admission rechecks generation where no effect has started;
- finalization rejects stale generation;
- admitted external facts are preserved/reconciled instead of fabricated cancellation.

## 38. Deterministic implementation-readiness model

Committed model:

```text
project_tools/test_wave1_implementation_readiness_model.js
```

Actual local Node execution on the exact model bytes before repository write:

```text
Wave 1 implementation-readiness model: PASS
representative-v2-json-chars=1336
```

The model proves:

1. v3 -> v4 upgrade can add new index without rewriting legacy payloads;
2. an old v3 opener against a v4 database fails with modeled `VersionError`, proving synchronized version bump is necessary;
3. incremental chunk digest equals digest of same whole byte stream;
4. new `pdf:G` creation is create-once;
5. live retry accepts exact source and rejects stale source;
6. same-tab A/B generations remain independent;
7. stale A cleanup preserves B's current pointer;
8. legacy remote checkpoint without exact content authority is manual, not auto-verified;
9. content-complete row without publication generation remains manual for publish;
10. complete V2 authority row becomes automated-recovery eligible;
11. publication generation is ABA-safe;
12. admitted publication is reconciled rather than cancelled by later policy change;
13. exact remote content cannot finalize into newer destructive Journal generation;
14. representative V2 checkpoint remains far below current row envelope.

This is L2 architecture evidence only. It is not production implementation or browser/provider closure.

## 39. External platform references used for readiness reasoning

External references are comparison/platform evidence and become project evidence only through this committed research checkpoint.

### IndexedDB versioning/transactions

- https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
- https://developer.mozilla.org/en-US/docs/Web/API/DOMException#versionerror
- https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/versionchange_event
- https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/add
- https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction

These platform semantics support synchronized worker/offscreen DB-version rule and create-once transaction design.

### Chrome MV3 lifecycle/storage

- https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
- https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies

Chrome's lifecycle/storage model supports durable IndexedDB receipts rather than relying on service-worker globals.

### Yandex Disk API

- https://yandex.com/dev/disk-api/
- https://yandex.com/dev/disk/poligon/

Current public documentation retrievable in this research environment still does not supply enough exact live-provider response evidence to upgrade P1-184's candidate checksum semantics to L5 verified behavior. Provider metadata SHA-256 therefore remains a candidate fast path requiring real authorized validation; bounded remote download+hash is the provider-independent fallback.

## 40. Staged production implementation plan

This is implementation planning only, not authorization to modify production.

### Tranche A — shared pure receipt parsers/validators

Introduce small pure helpers for PDF generation receipt, source receipt comparison, remote-save V2 normalization/classification, and publication-policy receipt. No Chrome/IDB/network side effects.

### Tranche B — P0-079 storage foundation + synchronized v4 migration

Likely files:

```text
service-worker.js
offscreen.js
project tests/gates
```

Work:

- bump both DB openers to v4;
- create `retryIndex`;
- leave legacy rows unbound;
- introduce worker-issued PDF generation G;
- atomically add payload/meta/pointer;
- exact-generation read/delete;
- pointer compare-and-remove;
- offscreen exact-generation validation contract.

This tranche should not yet claim P0-023/P0-070 closure.

### Tranche C — render digest + P0-080/P0-070 source chain

Likely files:

```text
content.js
service-worker.js
shared receipt helper(s)
```

Work:

- P0-080 application/selection generation receipt;
- worker stamps actual sender document/frame/tab;
- P0-070 exact source monitor;
- compute SHA-256 in `IO.read` loop;
- seal `{G,N,H,sourceReceipt}` only after clean render settlement;
- exact live retry source comparison.

### Tranche D — P1-198 operation context minimum required by Wave 1

Introduce/consume worker-issued physical operation identity without broad caller-id rename in one commit. Wave 1 checkpoints/cache metadata receive physical identity; caller textual id remains correlation. Do not replace domain continuation receipts with physical id.

### Tranche E — P0-074/P0-073 live/durable Yandex context

- auth/config generation primitives;
- coherent context acquisition;
- context-bound Yandex API;
- account UID proof using same captured capability;
- durable non-secret account/root scope;
- no cross-account probe/rebind.

### Tranche F — P0-078 publication generation/admission

- dedicated local publication-policy generation;
- unify preference/import writers;
- durable `eligible -> admitted` barrier;
- legacy true checkpoints fail closed for new publish;
- current false does not erase admitted unknown truth.

### Tranche G — P1-184 exact remote content receipt

- persist N/H before remote effect;
- exact post-upload/recovery verifier;
- current-provider metadata fast path only after L5 validation;
- binary download+hash fallback;
- bind RID/revision after content proof;
- publication downstream of exact content.

### Tranche H — P0-076 Journal-generation integration

- capture expected Journal generation at save admission;
- durable continuation fields;
- pre-effect fence when no effect admitted;
- final CAS against current Journal generation/incarnation/revision;
- external fact reconciliation after reset without stale Journal mutation.

### Tranche I — Closure Sweep / Change Impact

Re-run all affected B1-B9 and C-cells, not just owner-local tests.

## 41. Why this order is safer

The ordering minimizes periods where a stronger downstream check relies on a still-mutable upstream object.

Examples:

```text
P1-184 before P0-079
-> can compare remote H while local retry alias can still change bytes

publication generation before immutable context
-> policy may be exact while remote requests cross account/token contexts

Journal finalization CAS before operation checkpoint provenance
-> can reject stale row but still not know which exact external artifact is being finalized
```

P0-079 storage foundation is therefore an early mechanical prerequisite, while final owner closure remains dependent on upstream source/operation authority and downstream provider/Journal gates.

## 42. Required crash/restart acceptance matrix

A future implementation campaign should include at minimum:

1. worker dies after exact source admission but before render -> no sealed PDF, no external effect;
2. worker dies during render -> no sealed PDF unless clean render receipt is authoritatively complete;
3. caller times out while PDF IDB transaction later commits -> reconcile exact G, never rewrite;
4. same-tab B commits while A unresolved -> A/B bytes remain independent;
5. worker dies after sealed G but before remote checkpoint -> sealed generation remains exact, no inferred remote start;
6. worker dies after remote `prepared` but before `upload-admitted` -> no upload without fresh admission/rechecks;
7. worker dies after `upload-admitted` before/while PUT -> outcome unknown, reconcile H before retry;
8. account switches A->B after admission -> operation never probes B as A;
9. root changes RA->RB in same account -> old operation uses stored RA/path;
10. publication true G1 -> false G2 before admission -> zero publish;
11. true G1 -> false G2 -> true G3 -> G1 does not resurrect;
12. publish admitted under G1 then false G2 -> reconcile unknown, not cancelled;
13. Journal clear/import J1->J2 before external effect admission -> old operation starts no new effect;
14. reset after effect admission -> reconcile effect, no stale Journal success in J2;
15. same-URL reload A->B -> B cannot live-retry A PDF;
16. exact A recovery remains possible after B becomes current when A has durable valid checkpoint;
17. legacy v3 PDF row cannot become trusted exact current-source retry after upgrade;
18. legacy remote checkpoint missing H cannot be size-only finalized;
19. offscreen opens PDF DB after v4 upgrade without VersionError because both contexts request same version;
20. extension update while old context holds DB connection converges through `versionchange` close rather than deadlocking upgrade.

## 43. Physical Chrome evidence required before owner closure

L2 models are insufficient for several boundaries.

Required current-Chrome L3/L4 cases include:

- real worker/offscreen v3->v4 upgrade with pre-existing Blob rows;
- offscreen DB reopen after schema upgrade;
- same-tab A/B generation race under real IndexedDB;
- exact `sender.documentId` same-URL reload rejection;
- guarded `Page.printToPDF` stream digest equals independently hashed retained PDF artifact;
- worker termination/restart at selected phase boundaries;
- large near-limit PDF with one-pass digest and no memory/budget regression;
- offscreen exact-generation upload test using controlled non-provider endpoint where appropriate for transport mechanics.

These are not substitutes for Yandex L5 content semantics.

## 44. L5 Yandex evidence still required

P1-184/P0-073/P0-074/P0-078 closure requires an explicitly authorized disposable Yandex context for the cases already bounded in C42, including:

```text
local H/N/G
-> upload
-> private metadata/content proof
-> exact RID/revision observations
-> publish/readback where authorized
-> same-size different-content replacement negative control
-> unknown PUT/restart recovery
-> checksum-unavailable fallback
-> no secrets in committed evidence/logs
```

Until that exists, no production closure should claim real provider exact-content/publication settlement.

## 45. Closure Sweep regions

Wave 1 implementation affects at least:

```text
B1 User intent
B2 Admission/generation
B5 Renderer
B6 Physical artifact
B7 Persistence/transfer
B8 Journal/provenance
B9 Recovery
```

Any implementation must perform Change Impact against the current coverage-complete baseline rather than carrying the current declaration forward mechanically.

## 46. Explicit non-goals

This readiness tranche does not:

- implement production changes;
- close any ACTIVE P owner;
- allocate P1-231;
- change Registry status;
- migrate any user's real IndexedDB;
- call a real Yandex account;
- claim provider SHA-256 semantics are L5 verified;
- change manifest/version;
- create a release/build/tag/deployment;
- declare critical closure complete.

## 47. Implementation-readiness decision

For exact baseline:

```text
main = d4f5b268fa3f7ced5a7bc68da52784863d614138
```

Wave 1 now has a sufficiently explicit research contract to begin staged production engineering without inventing core migration/authority semantics during coding.

Strongest truthful state:

```text
DEEP-RESEARCH-COVERAGE-COMPLETE = YES

WAVE1-ARCHITECTURE = DEFINED
WAVE1-IMPLEMENTATION-READINESS = DEFINED / L2 MODEL PASS
WAVE1-PRODUCTION-IMPLEMENTATION = NOT STARTED BY THIS TRANCHE
WAVE1-OWNER-CLOSURE = INCOMPLETE

DEEP-RESEARCH-CRITICAL-CLOSURE-COMPLETE = NO
RELEASE-READY = NO
```

No new root cause requiring a new P-code was identified.

The highest-value next research task is no longer additional architectural enumeration. It is to produce owner-composed source-gate specifications and the exact physical closure matrix for the first implementation tranche (PDF cache v4/P0-079), including upgrade/restart/legacy controls, while keeping production changes separate until implementation is explicitly authorized.
