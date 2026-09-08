# C42 — Yandex upload / object / public identity — fresh-restart triage — 2026-09-09

Date: 2026-09-09  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical `service-worker.js` blob: `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`  
Research branch: `research/p1-184-yandex-upload-content-receipt-2026-09-06`  
Fresh-restart coverage coordinate: **C42**  
Current Registry owners: **P0-073, P0-074, P0-078, P1-184**; P0-079 is a supporting exact-local-byte owner.

No production runtime, manifest, Registry status, release state, build, tag or deployment is changed by this tranche.

## 1. Fresh-restart question

The full-restart baseline left C42 as:

```text
Yandex upload/object/public identity -> NOT-TRIAGED / UNKNOWN
```

and defined the exit task as a real authorized Yandex test that binds upload/retry/unknown recovery/publication to:

- exact PDF bytes;
- immutable account/root/config generation;
- exact remote object identity;
- real public-link receipts.

This tranche performs every source/model step that can be done without a real Yandex account and makes the remaining L5 boundary explicit.

## 2. Pipeline boundaries

C42 crosses:

- **B2 Admission** — exact account/root/config/publication authority admitted to the remote operation;
- **B6 Physical Artifact** — exact PDF bytes/digest produced locally;
- **B7 Persistence / Transfer** — exact bytes transferred or later adopted as remote content;
- **B8 Journal / Provenance** — durable record binds the remote object/public link to the exact operation/artifact;
- **B9 Later Reading / Recovery** — retry/restart/unknown-settlement converges without adopting a different remote file.

The material defect itself is primarily B7/B8. B2 and B6 are upstream authorities it composes with.

## 3. Current positive controls

Fresh current-source inspection confirms useful controls already exist.

### 3.1 Durable checkpoint before remote finalization

The upload path obtains the current Yandex account UID and normalized root path and creates `checkpointPendingRemoteSaveIntent(...)` carrying remote path, account/root scope, expected PDF byte length, publication policy and Journal/operation identity before remote finalization.

This is important P0-073/P0-074 groundwork: recovery has a durable namespace/operation anchor rather than only a filename.

### 3.2 Exact positive byte-size verification

Both existing-file reuse and post-upload metadata verification require a positive exact byte-size match via `assertExactYandexRemoteByteSize(...)`.

`project_tools/test_yandex_exact_remote_size.js` is the existing deterministic positive control for this invariant.

This prevents fail-open zero/unknown-size acceptance and obvious truncation/size mismatch, but does not prove exact content.

### 3.3 Stable remote identifier is captured after verification

Post-upload metadata requests include `resource_id`; the result is persisted into the verified checkpoint/Journal path.

This is valuable remote-object identity after content has been proven.

### 3.4 Publication is a separate explicit stage

`createPublicLinks` controls whether `ensureYandexPublicUrl(remotePath, operationId)` is invoked. Public-link creation occurs after the durable remote checkpoint exists.

This preserves the P0-078 separation between publication policy and mere object observation.

### 3.5 Recovery is explicit, not silent fire-and-forget

`recoverPendingRemoteSaves()` iterates durable remote-save checkpoints and re-reads remote metadata before finalizing. Unknown remote settlement is therefore represented as recoverable state.

The defect is the strength of its adoption proof, not the absence of recovery machinery.

## 4. Fresh confirmed finding — exact size is not exact content

Current existing-file retry can accept:

```text
same account/root
same remote path
remote type=file
remote size == expectedPdfBytes
```

and then reuse the file.

Current recovery can similarly progress from metadata + exact size toward publication/`remote-verified`.

Counterexample:

```text
operation A expects PDF bytes H-A, length N
unknown settlement occurs
another file B occupies the same path
B has length N but digest H-B != H-A
recovery sees type=file + size=N
```

Path and exact size do not distinguish A from B.

This is exactly the existing **P1-184** root cause. No new P-code is justified.

## 5. Why `resource_id` does not close first-upload ambiguity

If an exact content receipt already binds a known RID, a changed RID is powerful conflict evidence.

But after the first PUT has an unknown outcome, a newly observed RID only proves which object occupies the path now. It does not prove that the object's bytes are the operation-owned PDF.

Therefore the safe order is:

```text
prove exact bytes H
-> capture/bind RID
-> optionally capture revision
-> allow later publication/finalization owners to proceed
```

not:

```text
observe new RID + matching size
-> infer exact upload success
```

## 6. Exact-content authority

The existing P1-184 research block defines the correct local receipt:

```text
localPdfReceipt = {
  cacheGeneration: G,
  expectedPdfBytes: N,
  expectedSha256: H
}
```

P0-079 owns the immutable operation-owned local byte generation. P1-184 owns proving that the remote object being adopted contains exactly `H`.

The digest must be durable before non-cancellable signed upload admission so crash recovery does not depend on reconstructing mutable bytes later.

## 7. Provider-specific revalidation

Fresh 2026-09-09 evidence supports a two-tier verifier.

### Strong current corroboration

YaDisk 3.4.1, released 2026-04-16, models resource/public-resource fields including:

- `sha256`;
- `md5`;
- `resource_id`;
- `revision`;
- `size`.

### Historical official Yandex control

Yandex's official historical REST SDK models resource MD5 and signed-upload hash semantics including SHA-256/MD5/size.

### Evidence boundary

The current official 2026 response-object schema was not reliably retrievable in this research environment, and no real authorized API call was made.

Therefore provider metadata SHA-256 is currently a **candidate fast path requiring L5 semantic validation**, not an assumed hard contract.

## 8. Target two-tier remote-content verifier

### Fast path after L5 validation

Request private resource metadata including:

```text
type,size,sha256,md5,resource_id,revision,public_url
```

Require:

```text
type == file
size == N
canonical(sha256) == H
resource_id present
```

Then record `verificationKind = yandex-metadata-sha256`.

### Provider-agnostic fallback

If metadata SHA-256 is absent, malformed or not validated:

1. obtain `/resources/download` capability in the exact P0-073/P0-074 account/root context;
2. stream no more than expected bounded bytes;
3. hash with existing incremental `WebClipSha256`;
4. require exact length and SHA-256 equality;
5. bind resulting exact-content receipt to RID.

Never degrade to size-only success.

## 9. Publication/public-link identity

P0-078 owns whether publication is authorized. C42/P1-184 requires that publication of recovered/unknown remote content is downstream of exact content proof.

Fresh current-client documentation suggests public-resource metadata can also expose SHA-256/RID/revision. This could support:

```text
private exact H/RID receipt
-> authorized publish
-> public metadata
-> prove public URL resolves to expected H
```

But private/public RID equality and revision behavior are not assumed. They remain L5 questions.

## 10. Deterministic evidence achieved

Existing exact-content model:

- `project_tools/test_p1_184_yandex_content_receipt_model.js`
- committed blob `e8eda98f7dce426b24458e6b569fdfd612750a49`.

New provider-checksum model:

- `project_tools/test_p1_184_yandex_provider_checksum_model.js`
- exact committed blob `effb710954bf3b308a882c4b6fffb7c9bbd95685`;
- actual execution on those exact bytes: **PASS**.

New schedules prove:

- valid metadata SHA-256 can be a fast-path exact-content receipt;
- same-size different digest is rejected;
- missing metadata digest requires fallback, not weak success;
- `revision + RID + size` is not content proof;
- downloaded SHA-256 can close fallback;
- digest mismatch blocks adoption;
- byte-identical replacement is adoption, not unique creation lineage.

## 11. Source gate state

Existing source gate:

- `project_tools/test_p1_184_yandex_content_receipt_source.js`.

Provider-specific addendum:

- `project_tools/test_p1_184_yandex_provider_checksum_source.js`;
- committed blob `0c5da8d3098e03586795fe32cc0db1e1e9d0c843`;
- syntax check on exact bytes: **PASS**.

Functional source-gate PASS is **not** claimed. Current source inspection already shows the target implementation is absent:

- no operation-owned PDF `expectedSha256` remote receipt;
- metadata fields omit `sha256`;
- allowExisting/recovery can still converge from exact size;
- no single exact remote-content verifier gates reuse/recovery/publication.

Therefore the implementation-facing gate is expected RED on current production source.

## 12. Required L5 matrix

A real authorized test must use a disposable root and non-production files.

Required cases:

1. known PDF A -> compare local SHA-256 to private resource metadata SHA-256;
2. record private RID/revision;
3. publish -> read private and public metadata, compare SHA-256;
4. observe whether RID is shared or transformed across private/public views;
5. observe revision change/stability across publish/unpublish without byte change;
6. replace same path with different PDF B of identical byte length -> old H-A must be rejected;
7. replace with byte-identical content -> classify adoption vs creation lineage and observe RID/revision;
8. unknown PUT/restart/recovery path -> prove convergence from durable `G/N/H`;
9. checksum missing/unavailable path -> prove bounded download+hash fallback or truthful deferred/unknown outcome;
10. ensure no auth token/signed capability/PDF bytes enter durable evidence or logs.

## 13. Coverage classification after this tranche

Before:

```text
C42 = NOT-TRIAGED / UNKNOWN
```

After source/model research, the strongest truthful campaign classification is:

```text
C42 = DETERMINISTIC-COVERED / FINDING (P1-184) + POSITIVE CONTROLS;
      EXTERNAL-REQUIRED for provider checksum/object/public-link semantics
```

This is **not** `EXTERNAL-VERIFIED` and not production PASS.

The prior UNKNOWN is no longer unbounded: its exact remaining evidence boundary is the real Yandex L5 matrix above.

## 14. Owner reconciliation

No duplicate finding was created.

- **P1-184** — exact upload/reuse/recovery content receipt;
- **P0-073** — account/root immutable namespace;
- **P0-074** — immutable auth/config/publication operation context;
- **P0-078** — publication policy/revocation generation;
- **P0-079** — immutable operation-owned local PDF bytes;
- **P1-090** remains adjacent for destructive move same-object continuity, not ordinary upload-content adoption.

## 15. Research termination for C42

Further source-only exploration has sharply diminishing value for the open C42 claim. The remaining uncertainty is browser-independent provider behavior behind an authenticated Yandex API boundary.

Therefore this C42 tranche is research-terminal at L1/L2 and **EXTERNAL-REQUIRED** at L5.

P1-184 remains ACTIVE. No Registry status change is justified until implementation plus exact source gate and the required live provider evidence exist.
