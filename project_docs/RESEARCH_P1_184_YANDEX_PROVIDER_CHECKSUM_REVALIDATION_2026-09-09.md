# P1-184 — Yandex provider checksum revalidation — 2026-09-09

Date: 2026-09-09  
Canonical baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical `service-worker.js` blob: `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`  
Research branch: `research/p1-184-yandex-upload-content-receipt-2026-09-06`  
Owner: **P1-184 ACTIVE**  
Relationship: addendum to `RESEARCH_P1_184_YANDEX_UPLOAD_CONTENT_RECEIPT_2026-09-06.md`.

This block changes no production runtime, manifest, Registry status, release state, build or deployment.

## 1. Why this revalidation exists

The 2026-09-06 P1-184 block intentionally used a provider-agnostic fallback because a reliable current Yandex provider checksum contract had not been established from the evidence available in that session.

Fresh 2026-09-09 research found materially stronger evidence that Yandex resource metadata can expose content hashes. That does **not** change the root cause or owner. It changes the preferred verification architecture:

```text
operation-owned local SHA-256
        |
        +--> validated Yandex metadata SHA-256 fast path
        |
        +--> bounded remote download + local SHA-256 fallback
```

`path + size`, `resource_id + size`, or `revision + size` remain insufficient content proof.

## 2. Current WebClip source remains size-based

Current `uploadCachedRecordToYandex()` requests metadata such as:

```text
name,path,type,size,public_url,resource_id
```

for existing-file reuse and:

```text
name,path,type,size,modified,public_url,resource_id
```

for post-upload verification.

The path then uses `assertExactYandexRemoteByteSize(...)`. No operation-owned PDF SHA-256 is carried through the remote-save checkpoint, no Yandex `sha256` is requested, and no exact remote-content verifier gates adoption/publication.

`test_yandex_exact_remote_size.js` is a positive control for fail-closed byte-length verification, but exact length is intentionally weaker than P1-184 exact content identity.

## 3. Current official Yandex surface

The current Yandex Disk API landing page is live in September 2026 and still describes REST API support for resource metadata plus upload/download operations:

- `https://yandex.ru/dev/disk/`
- current API terms published 2026-02-27: `https://yandex.ru/legal/disk_api/ru`

The current response-object schema page was not reliably retrievable from the research environment during this block, so this document does **not** claim that a directly fetched 2026 official schema contract has been proven for `sha256`.

That distinction is deliberate: provider behavior may be observed or represented by current clients without being safe to treat as a hard production contract until L5 verification.

## 4. Official Yandex SDK evidence — historical but important

Yandex's official `yandex-disk-restapi-java` SDK provides two useful historical controls.

### Resource metadata

Its `Resource` object includes `md5` and `size` fields.

Source:
`https://github.com/yandex-disk/yandex-disk-restapi-java/blob/master/disk-restapi-sdk/src/main/java/com/yandex/disk/rest/json/Resource.java`

### Signed upload/hash semantics

`RestClientIO` defines:

```text
Etag
Sha256
Size
```

headers and `getUploadedSize(url, Hash hash)` sends MD5/SHA-256/size data to the signed upload endpoint.

Source:
`https://github.com/yandex-disk/yandex-disk-restapi-java/blob/master/disk-restapi-sdk/src/main/java/com/yandex/disk/rest/RestClientIO.java`

This is strong evidence that Yandex has historically had content-hash semantics in the upload protocol. It is **not** sufficient to assert unchanged 2026 REST metadata semantics because this SDK source is old.

## 5. Fresh YaDisk 3.4.1 evidence

The actively maintained third-party `yadisk` client released **3.4.1 on 2026-04-16**.

Its 3.4.1 response-object documentation exposes, for resource/public-resource objects:

- `sha256`;
- `md5`;
- `resource_id`;
- `revision` — Yandex.Disk revision at the time of last modification;
- `size`;
- public URL/key fields where applicable.

The current source also models `sha256`, `resource_id`, and `revision` directly in resource objects.

Sources:
- `https://pypi.org/project/yadisk/3.4.1/`
- `https://yadisk.readthedocs.io/en/latest/api_reference/response_objects.html`
- `https://github.com/ivknv/yadisk/blob/dec9f27eeb09ba4d2a7dbe7640bde6c7ee3f2434/src/yadisk/objects/_resources.py`

This is strong current corroboration of live API fields, but YaDisk is not Yandex's contractual documentation. Therefore WebClip must validate the actual provider response before relying on metadata SHA-256 as the only exact-content verifier.

## 6. Revised P1-184 verification architecture

### 6.1 Local authority

Before a signed PUT can be admitted, P0-079/P1-184 should have a sealed operation-owned local receipt:

```text
localPdfReceipt = {
  cacheGeneration: G,
  expectedPdfBytes: N,
  expectedSha256: H
}
```

`H` is SHA-256 of the exact immutable bytes that the signed PUT will read.

### 6.2 Provider metadata fast path

If live L5 validation proves that private resource metadata `sha256` is SHA-256 of the exact stored file bytes, request at least:

```text
type,size,sha256,md5,resource_id,revision,public_url
```

and require:

```text
type == file
size == N
canonical(metadata.sha256) == H
resource_id is present
```

Then an exact-content receipt may use:

```text
verificationKind = yandex-metadata-sha256
providerSha256 = H
resourceId = RID
resourceRevision = REV?   // observation/version stamp, not content authority
```

### 6.3 Provider metadata is not blindly trusted

Metadata SHA-256 fast path is enabled only after exact-account live evidence proves its byte semantics.

If `sha256` is absent, malformed, temporarily omitted, or not L5-validated:

```text
DO NOT fall back to path + size success
```

Instead use the provider-agnostic verifier from the 2026-09-06 block.

### 6.4 Bounded download fallback

Use `/resources/download` to obtain an ephemeral signed download capability under the exact P0-073/P0-074 context, stream at most the expected bounded PDF bytes, compute SHA-256 with the existing incremental `WebClipSha256` primitive, and require:

```text
remote bytes == N
remote SHA-256 == H
```

before adoption/publication/final Journal settlement.

The signed URL remains capability data and is never persisted as receipt state.

## 7. `revision` is useful but not content identity

A Yandex `revision` can be a valuable version/observation stamp:

```text
resourceId + revision
```

may help detect a later remote mutation between verification and another phase.

But it must not replace SHA-256 because this research has not established that revision uniquely commits to exact file bytes, nor that publication metadata changes leave it stable in every relevant path.

Therefore:

```text
revision mismatch -> revalidate / conflict as policy requires
revision equality -> NOT sufficient content proof
```

P1-184 content truth remains the cryptographic digest.

## 8. `resource_id` is object identity, not first-upload content proof

`resource_id` remains valuable after exact content has been established.

For an unknown first PUT, a newly observed `resource_id` says which object is at the path now, not that the object contains the operation-owned PDF. The safe composition is:

```text
H proves exact content
RID binds the proven content observation to a remote object identity
REV optionally binds an observation/version
```

After an exact receipt exists, a later different nonempty RID is an object-identity conflict even if bytes happen to match; byte-identical replacement may be adopted only under an explicit new receipt and must not be called `created-by-this-attempt`.

## 9. Publication binding

Fresh YaDisk 3.4.1 documentation also exposes hash/object/version fields on public-resource objects. This creates a promising P1-184/P0-078 closure path:

```text
private exact receipt H/RID
-> publish authorized by P0-078
-> read public metadata
-> prove public URL resolves to expected content H
```

However, this block does not assume that private and public `resource_id` values are identical or that `revision` is unchanged by publication. Those relationships require live L5 evidence.

A public metadata digest match can prove content binding if live behavior is validated; it cannot retroactively prove unique creation lineage.

## 10. Live L5 acceptance matrix required

Use a dedicated disposable Yandex test root/account. Do not use production user files.

Required observations:

1. Upload known PDF A; private `/resources` returns `sha256 == local SHA-256(A)`.
2. Verify MD5 if returned, but SHA-256 remains primary WebClip receipt.
3. Record `resource_id` and `revision` before publication.
4. Publish A; inspect private metadata again and public-resource metadata.
5. Determine whether public metadata exposes the same SHA-256 and how public/private `resource_id` relate.
6. Determine whether `revision` changes on publish/unpublish without byte mutation.
7. Replace the same path with different bytes B of the **same byte length**; prove metadata SHA-256 changes and WebClip would reject old H-A.
8. Replace with byte-identical content; observe RID/revision behavior and preserve `exact-content-adopted` vs creation-lineage distinction.
9. Simulate unknown PUT settlement where possible; recovery must converge from checkpoint `G/N/H`, not from path/size.
10. If metadata `sha256` is missing or inconsistent in any relevant flow, bounded download+SHA-256 remains mandatory for that flow.

No OAuth token, signed URL or PDF content should be committed as evidence. Store only non-secret test identifiers/hashes, sanitized path labels, statuses and timestamps.

## 11. Deterministic model addendum

`project_tools/test_p1_184_yandex_provider_checksum_model.js` adds the following schedules:

- valid metadata SHA-256 can fast-path exact-content adoption;
- same-size/different-digest object is rejected;
- missing/malformed provider digest requires fallback, never weak success;
- `revision + resourceId + size` without digest still requires fallback;
- bounded downloaded digest can close the fallback;
- downloaded digest mismatch blocks adoption;
- byte-identical different RID is adoption, not a false creation claim.

The model does not claim the provider currently returns those fields; it models the target semantics **after** L5 validation.

## 12. Source gate addendum

`project_tools/test_p1_184_yandex_provider_checksum_source.js` is intentionally RED against current production source until a future implementation provides:

1. operation-owned `expectedSha256` in the remote-save checkpoint;
2. metadata request including `sha256`;
3. exact provider digest comparison before reuse/adoption;
4. one source-visible remote content verification owner;
5. bounded download+SHA-256 fallback;
6. recovery gated by exact content proof;
7. `resource_id` retained as stable remote object binding after proof.

The source gate must not be interpreted as proof that Yandex metadata SHA-256 is contractually valid before the L5 provider matrix succeeds.

## 13. Revised closure criteria for P1-184

P1-184 remains ACTIVE until implementation and evidence prove all applicable items:

- local operation-owned PDF generation sealed by P0-079;
- `N + H` durable before non-cancellable signed upload admission;
- retry/recovery cannot adopt same-path/same-size wrong bytes;
- provider SHA-256 fast path, if used, is backed by real 2026 L5 evidence;
- missing/unvalidated provider checksum triggers bounded download+SHA-256 or truthful deferred/unknown state;
- exact content receipt binds `H` to remote RID and relevant account/root scope;
- revision is observation/version evidence, never sole content authority;
- publication is gated after exact content proof;
- public-link content binding is L5-tested if used for final receipt;
- no signed capability/auth secret is persisted in durable receipt;
- deterministic model PASS on exact committed bytes;
- source gate PASS against exact implemented checkout;
- required real Yandex L5 matrix PASS.

## 14. Current research conclusion

The 2026-09-06 architecture remains sound, but current evidence supports a more efficient two-tier verifier:

```text
validated Yandex metadata SHA-256
    -> exact-content fast path

otherwise
    -> bounded remote download + SHA-256
```

This does not weaken the invariant. It removes unnecessary remote re-downloads when Yandex itself supplies a live-validated content digest while preserving a provider-agnostic fail-closed fallback.

Current WebClip production source still has the original P1-184 defect: same path + exact byte size can authorize reuse/recovery without exact content proof. P1-184 therefore remains **ACTIVE**.
