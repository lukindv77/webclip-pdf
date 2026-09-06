# P0-079 — operation-owned immutable PDF cache generations — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical `service-worker.js` blob: `6d61ac81befdbf2804ae9dbec425aa08d1194eb1` (570842 bytes)  
Working branch: `research/p0-079-operation-owned-pdf-cache-2026-09-06`  
Owner: **P0-079 ACTIVE**.

This is a docs/model research checkpoint. Production runtime, manifest and release state are unchanged.

## 1. Canonical owner

`RESEARCH_REGISTRY.md` defines P0-079 as:

> PDF bytes used for Yandex upload/retry must be immutable **operation-owned** cache generations, not one mutable `tab:<id>` slot.

This owner is deliberately narrower than adjacent identity owners:

- **P0-070** owns exact full-document save authority across the complete save pipeline;
- **P0-023** owns exact source-document generation binding for retry cache and same-URL reload/replacement;
- **P1-198** owns worker-issued physical live operation identity; caller text `operationId` is only correlation metadata;
- **P1-194** owns truthful durability/eviction claims;
- **P0-079** owns the immutable local byte object/generation and exact mutation/read/delete targeting once those owners have admitted an operation.

## 2. Fresh current-source proof

### 2.1 Cache identity is currently a mutable tab alias

Current runtime defines:

```text
function pdfCacheKey(tabId) {
  return `tab:${tabId}`;
}
```

All saves in one browser tab therefore address the same physical PDF-cache slot.

A later save B in tab T can replace save A's cache record even if A still has a pending retry/upload/finalization path.

### 2.2 Fresh save persists under the tab alias

The generated Yandex-save cache record is built with:

```text
key: pdfCacheKey(tabId)
```

and then persisted through `putCachedPdf(...)` before `uploadCachedRecordToYandex(...)`.

The record carries useful correlation metadata (`operationId`, `journalEntryId`, `sourceUrl`, byte length and page metadata), but none of those fields changes the IndexedDB object identity: the key remains `tab:<id>`.

### 2.3 Retry selects whichever generation currently occupies the tab slot

Current `getValidCachedPdfForTab(tabId)` computes `pdfCacheKey(tabId)`, reads current metadata, applies TTL and current-URL checks, and returns that record.

This means retry is not asking:

```text
"give me exact save operation A"
```

It is asking:

```text
"give me whatever valid PDF currently occupies tab T"
```

A same-tab, same-URL save B can therefore satisfy A's retry lookup.

The current source-URL equality check is a useful stale-navigation filter, but it is not byte identity and is not even document-generation identity: same-URL reload/replacement remains possible.

### 2.4 Offscreen transfer re-reads the mutable alias immediately before network upload

This is the strongest P0-079 race.

Worker-side upload sends offscreen a transfer spec containing:

```text
pdfCacheKey: String(cached.key || pdfCacheKey(tabId))
```

Current offscreen `handleSignedTransfer()` then executes, for `pdf-cache-upload`:

```text
const record = await getPdfCacheRecord(String(spec.pdfCacheKey || ''), deadlineAt)
fetchOptions.body = cachedPdfRecordToBlob(record)
...
fetch(..., { body: fetchOptions.body })
```

Thus the worker's in-memory `cached` metadata does **not** freeze the bytes later transmitted. Offscreen opens IndexedDB again and resolves the key at transfer time.

If that key is `tab:T`, a newer operation B can overwrite it after A obtained its signed Yandex upload URL but before offscreen reads the record. A's remote path/capability can then physically receive B's PDF bytes.

This is independent of whether A and B have the same URL.

### 2.5 Old completion can delete a newer cache generation

Current `deleteCachedPdf(tabId)` resolves the same `tab:<id>` key.

Successful remote save/finalization later calls the tab-based cache deletion path.

Therefore:

```text
A owns old tab:T record
B replaces tab:T with new bytes
A finishes late
A deletes tab:T
```

A can delete B's retry bytes.

The root cause is the same as the upload race: a mutable alias is being treated as object identity.

### 2.6 TTL cleanup is per physical record, but current record key still conflates generations

Current cache cleanup iterates records by age. With a single tab alias, replacement also replaces the storage identity/history of that tab's retry object.

After P0-079, TTL cleanup should remain per immutable generation. If a separate tab→latest pointer is retained for UI convenience, cleanup must compare/remove that pointer only if it still references the exact generation being deleted.

P0-079 does not by itself claim a stronger browser-storage durability class; that remains P1-194.

## 3. Deterministic failure schedules

### Schedule A — retry A silently adopts B

```text
A saves PDF-A in tab 5 -> key tab:5
A remote attempt fails/retry remains available
B saves PDF-B in tab 5 -> overwrites key tab:5
user/system retries A by tabId
getValidCachedPdfForTab(5) -> PDF-B
A upload path continues with B metadata/bytes
```

Same URL does not repair this race.

### Schedule B — signed upload capability for A transmits B bytes

```text
A record occupies tab:5
A obtains signed Yandex upload URL for A.remotePath
worker sends offscreen transfer with pdfCacheKey=tab:5
B overwrites tab:5 with PDF-B
before offscreen getPdfCacheRecord(tab:5)
offscreen reads PDF-B
signed PUT uploads PDF-B into A.remotePath
```

This violates byte ownership even if worker-side A metadata remains unchanged.

### Schedule C — late A cleanup deletes B

```text
A -> tab:5
B replaces -> tab:5
A finalizes later
A deleteCachedPdf(5)
B cache disappears
```

### Schedule D — same-URL reload is a false positive

```text
tab T at URL U -> save A/document generation D1
tab T reloads/replaces at same URL U -> save B/D2
```

Current URL equality admits B for a lookup intended for A.

P0-023/P0-070 own the document-generation proof; P0-079 must at minimum ensure the resulting admitted PDF bytes are stored and addressed under distinct immutable cache generations.

### Schedule E — sealed-key overwrite

Even if a future implementation introduces `op:<id>`, allowing ordinary `put()` replacement under that same generation would recreate the defect inside a different key scheme.

Required rule:

```text
operation-owned PDF generation is create-once/sealed
```

A second attempt to write different bytes under the same generation fails closed. A genuinely new PDF requires a new generation.

## 4. Required storage model

Recommended conceptual authority:

```text
pdfCacheGeneration = {
  version: 1,
  id: <opaque worker-issued random/generation token>
}

pdfCacheRecord = {
  key: `op:<generation-id>`,
  generation: <same exact id>,
  ownerOperationReceipt: <P1-198-owned internal receipt/reference>,
  tabId: <diagnostic/index field, not identity>,
  sourceDocumentGeneration: <P0-023/P0-070-owned receipt/reference>,
  journalEntryId,
  sourceUrl,
  pdfByteLength,
  pdfBlob,
  createdAt,
  sealed: true,
  ...bounded metadata
}
```

The exact representation may differ, but these invariants may not:

1. a tab id is not the byte-object key;
2. each independently generated PDF gets a distinct generation;
3. the generation is worker-issued/owned rather than trusting caller correlation text;
4. a sealed generation cannot be overwritten with different bytes;
5. all reads/transfers/deletes name the exact generation.

Do not use OAuth/auth generation or Yandex remote resource id as the local PDF-cache generation; those are different authorities.

## 5. Tab retry index is allowed only as an index

The UI may still need a convenient concept such as "latest retryable PDF for tab T".

That can be represented separately, for example:

```text
tabRetryIndex[T] = {
  version: 1,
  cacheKey: 'op:G',
  generation: 'G',
  sourceDocumentGeneration: 'D'
}
```

But this pointer is not the Blob identity.

Required behavior:

- creating B may move T's pointer A -> B;
- A's existing durable receipt still reads exact A by key G-A;
- A cleanup deletes only A;
- A cleanup clears the tab pointer only with compare-and-remove if the pointer still equals A;
- a stale A cleanup never clears a pointer already advanced to B.

If product semantics intentionally expose only the latest retry candidate, older A may be hidden from UI while still remaining durable for already-admitted remote/recovery work until its owner reaches terminal cleanup.

## 6. Offscreen transfer contract

Worker must pass an exact cache receipt, not a mutable alias:

```text
{
  pdfCacheKey: 'op:G',
  pdfCacheGeneration: 'G',
  expectedPdfBytes: N,
  ownerOperationReceipt: ... // internal, as appropriate
}
```

Offscreen must:

1. read exact key;
2. prove stored generation equals expected generation;
3. require a sealed valid PDF record;
4. verify exact expected byte size before constructing/fetching the Blob;
5. transfer those bytes only;
6. never fall back from an absent exact key to `tab:<id>` or "latest for tab".

A byte-size check is a consistency check, not object identity. Exact key/generation provides the ownership boundary.

The signed Yandex URL remains an opaque remote capability. P0-079 only controls which locally admitted Blob is sent through it; P0-074/P0-073/P1-184 own the remote context/scope/object side.

## 7. Retry contract

A retryable action must resolve to an exact durable cache receipt.

Unsafe:

```text
retry(tabId)
-> read tab:<id>
```

Safe conceptual flow:

```text
retry receipt / current tab-index receipt
-> exact cache generation G
-> verify P0-023/P0-070 document/source authority as applicable
-> exact sealed record G
-> new live P1-198 operation may act on G under explicit retry semantics
```

A new live retry operation does not acquire the right to replace G's bytes. It consumes G as immutable input.

If G no longer exists, the result is cache unavailable/expired, not a silent fallback to another generation.

## 8. Cleanup/delete contract

All owner-driven deletes use exact cache key/generation:

```text
deleteExact(G-A)
```

not:

```text
delete(tabId)
```

If a tab index exists, clear it by CAS:

```text
if pointer[T] == G-A:
  remove pointer
else:
  preserve newer pointer
```

TTL cleanup may independently remove expired immutable records. It must apply the same pointer CAS rule.

Whether an actively admitted operation needs a lease/pin against TTL/quota cleanup is a lifecycle/durability composition question and must not be silently inferred from P0-079 alone. P1-194 and any relevant temporary-state owner remain authoritative for stronger persistence guarantees.

## 9. Worker operation identity boundary

P1-198 states that caller textual `operationId` is correlation metadata rather than an ownership capability.

Therefore P0-079 must not simply change:

```text
tab:<id>
```

to:

```text
op:<caller-operationId>
```

and consider the issue solved.

The cache generation must be issued/controlled inside the trusted worker operation authority. A textual operation id may be stored for diagnostics, but it cannot be the sole possession proof for reading/deleting a sensitive generation.

## 10. External research — 2026-09-06

External sources are comparison evidence, not WebClip source-of-truth.

### Chrome MV3 service-worker lifecycle

Chrome's official extension service-worker lifecycle documentation states that the worker is intentionally terminable and that global variables are lost on shutdown; persistent state should be placed in storage, with IndexedDB explicitly listed as suitable structured/blob storage.

Implication for WebClip: byte ownership/retry receipts must be durable and restart-safe; an in-memory operation object cannot repair a mutable IndexedDB alias.

Source:

- https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle

### Google Cloud Storage generations/preconditions

Google Cloud Storage documents immutable object `generation` values and generation-match preconditions specifically to prevent races where an old request acts on a newer replacement object. Its example shows a delayed old delete being prevented from deleting a newly uploaded generation.

Implication for WebClip: a stale A delete/read must name A's exact local generation and fail/no-op against B instead of resolving a shared mutable name.

Source:

- https://docs.cloud.google.com/storage/docs/request-preconditions

### Amazon S3 conditional writes

AWS documents `If-Match`/ETag conditional writes: an operation proceeds only if the currently targeted object still matches the expected identity; otherwise it fails rather than applying to a changed object.

Implication for WebClip: mutation of a pointer/current alias should be compare-and-set/remove, while byte-object operations should address immutable generation keys directly.

Source:

- https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html

These systems differ from IndexedDB, but the architectural lesson is directly relevant: stable names/pointers and immutable object versions are separate concepts, and stale operations must not silently retarget replacements.

## 11. Alternatives considered

### A. Keep `tab:<id>` but also compare `operationId`

Rejected. Offscreen still reads by mutable tab key; B can replace the row between worker check and offscreen read. Caller textual operation id is also not P1-198 ownership authority.

### B. Keep `tab:<id>` and compare URL + byte size

Rejected. Same URL can represent another document/save; same byte size is not byte/object identity. It also does not prevent stale delete.

### C. Copy Blob into worker memory before starting upload

Rejected as the primary architecture. MV3 lifetime is ephemeral, large PDF memory duplication is undesirable, and restart/recovery still needs durable exact ownership.

### D. Operation-owned sealed cache generation + optional tab index

**Recommended.**

It removes read/write/delete alias races, works across worker restarts, composes with offscreen transfer, and allows UI "latest retry" behavior without confusing that index with byte identity.

### E. Content-address the cache only by PDF hash

Not required for P0-079. Content hashing can be a useful integrity/deduplication technique, but identical bytes may legitimately belong to different operation/document authorities. A worker-issued immutable generation plus integrity metadata is sufficient for ownership; exact remote content proof remains adjacent P1-184.

## 12. Deterministic model

Added:

`project_tools/test_p0_079_operation_owned_pdf_cache_model.js`

Local run before repository write:

```text
P0-079 operation-owned PDF cache model: PASS
```

The model proves:

1. A and B in the same tab get distinct immutable records;
2. offscreen A still reads PDF-A after B becomes the latest tab retry generation;
3. stale A cleanup cannot delete B or clear B's tab pointer;
4. same URL is not generation/document identity;
5. retry A consumes exact A receipt rather than latest tab alias;
6. a sealed generation cannot be overwritten with changed bytes;
7. caller correlation text is not the cache capability;
8. TTL cleanup of A is generation-specific and preserves B.

This is architecture/model evidence only, not current runtime PASS.

## 13. Implementation acceptance cases

Minimum future source/deterministic gate:

1. Save A and save B in same tab produce different physical PDF cache keys.
2. Same-tab same-URL B cannot replace A's stored bytes.
3. A signed upload transfer, after B becomes latest, still sends A's exact Blob/byte length.
4. Missing A key causes fail/defer; no fallback to B/current tab record.
5. Late A completion deletes A only.
6. Late A completion does not clear tab retry pointer if pointer already references B.
7. TTL cleanup of A does not delete B or clear B pointer.
8. Rewriting different bytes under a sealed generation fails closed.
9. Offscreen verifies exact generation and expected byte size before network fetch.
10. Retry lookup resolves an exact generation receipt, not `tabId` alone.
11. Same URL does not substitute for P0-023/P0-070 source-document authority.
12. Generation/capability is worker-issued; caller `operationId` is not sole authority.
13. P0-074/P0-073 remote context/scope invariants remain unchanged.
14. P1-184 exact remote content/object proof remains independent.

## 14. Owner boundaries

**P0-079 owns:**

- immutable operation-owned local PDF byte generations;
- create-once/sealed cache object semantics;
- exact generation read for offscreen upload;
- exact generation delete/cleanup;
- separation of tab retry index from byte-object identity;
- stale pointer compare-and-remove behavior.

**P0-023/P0-070 own:** source/current document/save-generation authority that selects/admitted the PDF generation.

**P1-198 owns:** trusted worker live operation identity/generation issuance semantics.

**P1-194 owns:** browser-storage durability/eviction truthfulness beyond ordinary IndexedDB commit.

**P0-073/P0-074/P1-184 own:** remote account/root/live-context/exact-object aspects of Yandex reconciliation.

## 15. Status

P0-079 remains **ACTIVE**.

Current runtime still uses mutable `tab:<id>` cache identity and offscreen resolves that key at transfer time. No production source, manifest, build, tag, GitHub Release or Actions run is changed/claimed by this checkpoint.
