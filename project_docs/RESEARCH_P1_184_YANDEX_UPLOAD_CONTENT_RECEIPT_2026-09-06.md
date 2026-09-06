# P1-184 — exact Yandex upload/reuse/recovery content receipt — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical `service-worker.js` blob: `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`  
Working branch: `research/p1-184-yandex-upload-content-receipt-2026-09-06`  
Owner: **P1-184 ACTIVE**.

This checkpoint changes no production runtime or manifest.

## 1. Canonical owner

Registry defines P1-184 as:

> Unknown Yandex upload/reuse/recovery needs stronger exact object/content creation receipt; path+size cannot authorize adoption or publication.

P1-184 owns proof that the remote file WebClip is about to adopt/finalize/publish is the exact operation content, not merely a file of the same length at the intended path.

Adjacent owners:

- **P0-079** — immutable operation-owned local PDF cache generation;
- **P0-023/P0-070** — source-document/full-save generation that produced those bytes;
- **P0-073/P0-074** — account/root scope and immutable live Yandex context;
- **P0-078** — publication policy generation/revocation;
- **P1-090** — same-object identity across destructive move;
- **P1-198** — worker-issued live operation identity.

## 2. Fresh current-source defect — retry reuse is path + size

`retryUpload()` calls:

```text
uploadCachedRecordToYandex(cached, { ..., allowExisting: true })
```

When `allowExisting` is true, current upload code performs:

```text
GET /resources path=remotePath
require type=file
assertExactYandexRemoteByteSize(expectedPdfBytes, existing.size)
existingFileReused = true
```

No content digest or prior exact remote object receipt is required.

Therefore an unrelated file B at the same path with the same byte length can be adopted as if it were the result of the earlier WebClip upload A.

## 3. Fresh current-source defect — crash recovery is also path + size

`recoverPendingRemoteSaves()` reads checkpoint `remotePath`, GETs metadata and verifies `expectedPdfBytes`.

If size matches, the row may progress to public-link creation and `remote-verified` even when the object at that path is a replacement with different bytes.

P0-073 prevents cross-account/root confusion, but same-account exact-object/content ambiguity remains P1-184.

## 4. ResourceId is useful but not sufficient for a first unknown upload

A durable `resourceId` learned after a successfully verified upload is strong stable object identity for later operations.

But after a crash around the first signed PUT, the checkpoint may have no pre-existing remote resourceId. A `resource_id` newly observed at `remotePath` during recovery says which object is there **now**; it does not prove that object contains the operation-owned PDF bytes.

Thus:

```text
new target resourceId + path + size
```

is stronger metadata, but still not exact content proof for an unknown first upload.

Once exact content has been proven, persist the resulting resourceId as part of the durable remote receipt.

## 5. Operation-owned local digest

P0-079 will provide an immutable sealed local PDF cache generation. P1-184 should bind a cryptographic digest to that exact generation before remote mutation.

Conceptually:

```text
localPdfReceipt = {
  cacheGeneration: G,
  byteLength: N,
  sha256: H
}
```

The digest must be computed from the exact sealed bytes that offscreen will transmit, not from a mutable tab alias or reconstructed metadata.

The project already contains an incremental SHA-256 implementation in `journal-import-digest.js` exposed as `WebClipSha256.create()`. It is currently used for import streaming and provides a concrete reusable primitive; P1-184 need not invent a weak checksum.

## 6. Remote exact-content verification

Provider metadata checksum may be used only if the API contract is explicitly verified and the algorithm/semantics match WebClip's receipt requirements.

Do not assume an undocumented field.

Provider-agnostic fallback:

```text
GET metadata for exact account/root/path
obtain resourceId RID-X
GET /resources/download for that path/context
stream remote bytes under strict byte/deadline limits
compute SHA-256 H-remote
require:
  size == N
  H-remote == H-local
then:
  exact-content-adopted RID-X
```

The project already has a `/resources/download` path for Journal backup, so signed remote download capability is an existing runtime concept.

This verification is potentially expensive and should be used where stronger recovery/adoption proof is required, not blindly for every unrelated read.

## 7. Creation proof vs exact-content adoption

Keep two truthful claims distinct:

### `created-by-this-attempt`

Requires evidence tied to the exact upload attempt/provider settlement sufficient to say this operation created the object.

### `exact-content-adopted`

Recovery may prove that the current object RID-X contains the exact operation-owned bytes H even if crash history cannot prove whether WebClip's earlier attempt or another actor created that byte-identical object.

For save recovery, exact-content adoption can be sufficient to finalize/publish **if** account/root/path, policy and other owners admit it. But the Journal/diagnostics must not falsely claim unique creation lineage when only byte equality was proven.

This distinction avoids overclaiming while still allowing safe convergence.

## 8. Required durable remote content receipt

Conceptually:

```text
yandexRemoteContentReceipt = {
  version: 1,
  accountRootScope: <P0-073>,
  remotePath,
  localCacheGeneration: G,
  expectedPdfBytes: N,
  expectedSha256: H,
  resourceId: RID-X,
  verificationKind: upload-ack-exact | remote-content-sha256,
  contentVerifiedAt,
  operationReceipt: <P1-198 reference>
}
```

Do not persist OAuth token or signed transport URL.

The exact representation may differ, but exact byte digest and stable remote identity must not be replaced with path+size.

## 9. Ordering before first upload

Before signed PUT can start:

```text
seal exact local PDF generation G (P0-079)
compute/confirm N + H from G
persist remote-save checkpoint carrying G/N/H and P0-073 scope
obtain/upload via P0-074 context
```

If the worker crashes after PUT begins, recovery still has the exact local content fingerprint needed to verify the remote object.

A digest computed only after the remote upload is not crash-safe if the local byte generation may disappear or be replaced before recovery.

## 10. `allowExisting` retry rule

Current semantics:

```text
same path + same size -> reuse
```

Required semantics:

```text
existing exact durable resourceId already bound to this operation/content receipt
  -> may reuse after required consistency checks

otherwise
  -> prove exact remote content digest H before adoption
```

Same filename/path/size are never enough.

If exact content differs:

```text
content-conflict
-> do not publish
-> do not mark remote-verified
-> do not overwrite unrelated file merely as retry recovery
```

A deliberate new save attempt may choose a new remote path under normal collision policy and new operation ownership; it is not the same recovery attempt.

## 11. Unknown signed PUT recovery matrix

Given checkpoint `(path P, N, H)`:

### P absent

No success can be claimed. Respect provider settlement/consistency semantics before admitting a fresh upload attempt.

### P exists, size differs

Conflict / not our exact content. No adoption/publication.

### P exists, size matches, digest differs

Definite content conflict. No adoption/publication.

### P exists, size and digest match

Capture stable resourceId RID-X and persist `exact-content-adopted` receipt. May continue to later policy/publication/finalization owners.

### P exists, digest verification unavailable/timeout

Deferred/manual/unknown. Do not degrade to size-only success.

## 12. Replacement after verification

After exact content receipt binds RID-X, later metadata GET returning a different nonempty resourceId must not silently replace it.

That becomes exact-object conflict (shared principle with P0-073/P1-090).

If provider can replace contents while retaining an id, the implementation must re-evaluate what resourceId guarantees. P1-184's durable content digest remains the content truth; do not assume object id alone is a permanent content hash.

## 13. Publication boundary

P0-078 decides whether a new publish mutation is authorized.

P1-184 adds a prerequisite:

```text
no publication of an unknown/recovered object until exact content receipt is proven
```

Thus an old checkpoint with `createPublicLinks=true` cannot publish a same-size replacement merely because policy G was once enabled.

## 14. Remote verification resource budget

PDFs are bounded by existing `MAX_PDF_BYTES` (48 MiB). Remote digest verification should still use explicit:

- total byte cap equal to expected exact PDF size / global maximum;
- network deadline;
- chunked/streaming processing;
- abort on bytes exceeding expected size;
- no duplicate full-buffer copies where avoidable.

The existing incremental SHA-256 primitive makes streaming digest feasible.

Lifecycle/temporary-storage reservation concerns remain with their dedicated owners; P1-184 only requires bounded exact-content proof.

## 15. Security/privacy

SHA-256 digest is non-secret integrity metadata and may be persisted as part of the operation receipt.

Signed upload/download URLs remain opaque capabilities and must not be persisted/logged beyond existing protected handling.

Do not log PDF bytes or auth tokens.

## 16. Deterministic schedules

### Same-size replacement

```text
checkpoint A: P, N, H-A
B replaces/occupies P with different bytes, same N
GET metadata -> size N
```

Current source accepts B. Required digest check gets H-B != H-A -> conflict.

### Byte-identical replacement

```text
current object RID-B has exact bytes H-A
```

Recovery may record `exact-content-adopted RID-B`, but must not claim RID-B was necessarily created by attempt A.

### Crash after PUT before metadata

Checkpoint already carries G/N/H. Recovery hashes remote P and can converge safely without relying on upload response history.

### Digest timeout

No size-only fallback. Row remains deferred/unknown.

## 17. External documentation check

Yandex's current official Disk REST API documentation confirms dedicated resource metadata, upload and download operations. The documentation index was reachable on 2026-09-06, but this research did not obtain a reliable documented provider checksum field from the indexed schema. Therefore the closure contract intentionally does **not** depend on an assumed Yandex `md5`/hash field.

If a documented stable checksum is later verified, it can optimize remote digest verification only after tests prove its byte semantics match WebClip's exact PDF bytes.

## 18. Implementation acceptance cases

1. Checkpoint stores exact local cache generation + byte length + SHA-256 before signed PUT.
2. Same path/same size/different bytes cannot be adopted.
3. Retry `allowExisting` no longer treats size match as sufficient.
4. Unknown recovery no longer treats size match as sufficient.
5. Exact remote digest match can produce `exact-content-adopted` with captured resourceId.
6. Digest mismatch blocks publication and remote-verified.
7. Digest verification timeout/unavailable remains deferred/manual; no weak fallback.
8. Existing durable resourceId conflict is never overwritten by newly observed id.
9. Byte-identical replacement is labeled adoption, not falsely claimed creation lineage.
10. Remote digest verification is bounded/streaming and aborts over expected bytes.
11. Signed download/upload URLs are not persisted as receipts.
12. P0-073 account/root and P0-074 live context apply to metadata/download calls.
13. P0-078 policy admission happens only after P1-184 exact-content proof for recovered objects.
14. P0-079 exact sealed local generation is the digest source; mutable tab alias is forbidden.

## 19. Status

P1-184 remains **ACTIVE**. Current retry/recovery paths still authorize adoption from path + exact byte size without exact content proof.

Runtime/manifest remain `0.9.8`; release remains `NOT READY`.
