# Durable audit evidence — PDF byte / transfer receipt / credential boundary — 2026-08-30

Canonical current P-code owner/status authority remains exclusively in `AUDIT_REGISTRY.md`. This document preserves a completed **56-block** source-first data-integrity and safe-transfer audit of the boundary after Chromium has produced PDF bytes: local retry-cache, Blob/download settlement, Yandex signed upload/reuse/recovery, account/root/auth continuity and credential handling.

Exact fresh source baseline: `main = c5198dc2040d7914397439922311ec6d86305dfd`.

PR #30 immediately preceding this tranche is audit/docs-only. Fresh `service-worker.js` and `offscreen.js` at this baseline retain runtime blob SHAs `9c81d080051ee14d468b78c575dcd9f21ecda803` and `a5f84b928e530222c50c704b80ab30418349f68e` respectively.

Security scope is deliberately limited to **confidentiality, integrity, storage and safe transfer of extension data/files/API credentials**. Exploitation techniques and offensive-security analysis are out of scope.

No runtime source, `manifest.json`, version, build, tag or GitHub Release is changed by this evidence.

## Executive classification

**No new permanent P-code and no canonical status transition.** The fresh findings refine existing owners rather than creating a new root:

- **P1-184 ACTIVE — primary remote-content receipt owner.** Yandex upload/reuse/recovery still treats path + exact byte size as sufficient file-content settlement. Two different byte sequences with the same length are indistinguishable to this contract, so a stronger exact object/content creation receipt remains required before adoption/publication/final Journal authority.
- **P0-079 ACTIVE — cache-generation owner.** Yandex retry still uses mutable `tab:<id>` cache identity; a content digest/receipt must belong to the same immutable operation-owned cache generation rather than becoming another mutable metadata field.
- **P0-070 ACTIVE — end-to-end save authority.** The exact PDF bytes that Chromium produced must remain the same logical artifact through cache, download/upload and Journal finalization; byte count alone is not an end-to-end content receipt.
- **P0-074 ACTIVE / P0-073 ACTIVE — Yandex operation/account/root continuity.** Current positive checkpoints bind `accountUid` and `rootPath`, but the live upload flow still obtains config/auth through multiple stage-local reads/API calls rather than consuming one immutable operation context from admission through upload/publication/verification.
- **P1-146 ACTIVE / P0-048 ACTIVE — local download settlement.** Durable intent, exact Blob URL and downloadId binding are strong positive controls; fallback and terminal reconciliation still prove browser settlement primarily by identity/state/size, not by a durable content receipt for the exact PDF bytes.
- **P0-023 ACTIVE — source-document retry provenance.** Current retry cache validation uses URL/TTL rather than an exact browser document generation; adding a byte receipt must not be mistaken for fixing source-generation identity.
- **P0-077 ACTIVE — portable backup integrity boundary.** Yandex Journal backup already validates staged byte totals and remote byte size, but a same-length different-content object is likewise outside that receipt; future content receipt work must preserve self-export/self-restore compatibility.

Current registry already states that P1-184 needs a stronger exact object/content creation receipt and that P0-079/P0-070 own immutable cache/save generation. Therefore **P1-230 is deliberately not allocated**.

## Fresh source boundary and positive controls

Fresh `service-worker.js` / `offscreen.js` establish all of the following:

1. local generation takes `expectedPdfBytes = pdfBlob.size` immediately after `generatePdfBlob()`;
2. Yandex generation stores the actual PDF Blob in IndexedDB and derives `pdfByteLength` from the Blob;
3. PDF body and cache metadata are committed in one IndexedDB transaction;
4. offscreen reads the PDF body by cache key and transfers the reconstructed Blob directly;
5. local download persists a durable intent before `chrome.downloads.download()` and binds it to the exact Blob URL when available;
6. Yandex creates a durable remote-save checkpoint before physical transfer/finalization and later validates remote file type + exact byte size;
7. recovery repeats the same exact-size validation before completing the Journal record;
8. OAuth access tokens are stored in `chrome.storage.session`, legacy persistent copies are migrated/removed, and local/session storage access is restricted to `TRUSTED_CONTEXTS`;
9. OAuth `Authorization` is attached by worker-side Yandex API calls, while the offscreen signed-file transfer receives only a signed `https://*.disk.yandex.net` capability URL plus file bytes and does not receive the OAuth access token;
10. offscreen accepts signed transfers only from trusted extension senders, only to signed Yandex HTTPS hosts, and keeps bounded active-transfer/byte reservations through actual settlement;
11. OperationLog sanitization redacts token-like fields and signed Yandex URLs;
12. PR #30 separately owns source-URL confidentiality. This tranche does not duplicate its URL findings.

These are meaningful controls and should be preserved. The unresolved integrity gap is narrower: **byte length is not byte identity**, and stage-local auth/config reads are not one immutable operation context.

## Blocks 1–12 — cache artifact identity after Chromium returns bytes

### Block 1 — fresh baseline and duplicate check — P1-184/P0-079

Fresh `main` was fixed at `c5198dc2040d7914397439922311ec6d86305dfd` after PR #30. Registry, current supplemental audit index and relevant Yandex/local-download families were re-read before classification.

The registry already explicitly says P1-184 needs a stronger exact object/content creation receipt and P0-079 needs immutable operation-owned PDF cache generations. No new root exists here.

### Block 2 — local generation captures actual Blob byte length — positive control

`generatePdfAndDownload()` obtains `pdfBlob` from Chromium and immediately records `expectedPdfBytes = pdfBlob.size`.

This is an exact byte-count receipt for that in-memory Blob at that moment.

### Block 3 — Yandex generation also stores the actual Blob, not only Base64 — positive control

The current retry cache uses Blob-backed `blob-v3` records. Legacy Base64 remains compatibility-only.

This avoids an unnecessary full Base64 copy and makes the actual cached binary object explicit.

### Block 4 — cache metadata derives byte length from the Blob — positive control

`pdfCacheMetadataFromRecord()` derives `pdfByteLength` from `record.pdfBlob.size` when a Blob exists.

The metadata is therefore not merely trusting a caller-supplied length for new Blob-backed records.

### Block 5 — body and metadata commit atomically — positive control

`putCachedPdf()` writes `PDF_CACHE_STORE` and `PDF_CACHE_META_STORE` inside one readwrite IndexedDB transaction.

A successful transaction cannot publish new metadata while leaving the old body solely because the two stores were committed in separate transactions.

### Block 6 — no content digest is stored in cache metadata — P1-184/P0-079

The cache metadata retains key/tab/filename/meta/createdAt/sourceUrl/`pdfByteLength`/format/temporary/journalEntryId. It has no digest or other content fingerprint of the PDF Blob.

Thus later consumers can prove size and cache key, but not byte-for-byte identity.

### Block 7 — offscreen reads the binary store directly by key — positive boundary

`getPdfCacheRecord(key)` reads the PDF record from `PDF_CACHE_STORE`. `pdf-cache-upload` then converts that record to a Blob and uses it as the request body.

This is preferable to reconstructing transfer bytes from unrelated UI metadata.

### Block 8 — offscreen bounds Blob size but does not verify a content receipt — P1-184

`cachedPdfRecordToBlob()` enforces the PDF byte ceiling and returns the Blob (or converts legacy Base64). It does not compare a cryptographic/content fingerprint because none exists in the record.

Size admission and content identity are separate invariants.

### Block 9 — equal-length distinct PDFs are indistinguishable to size-only receipt — deterministic model

A minimal deterministic byte model used two valid-shaped byte strings of equal length 25:

- `%PDF-1.7\nA-content\n%%EOF\n` -> SHA-256 `46a2591e0e7dea17e6923617a9148f797903ef46120d96b68a3d6a6db7e2aea8`;
- `%PDF-1.7\nB-content\n%%EOF\n` -> SHA-256 `98e6f90a336f1218693efc922dffa180d2ac0db826275f575949361f42833549`.

The example is an integrity model only: both artifacts have identical byte count but distinct content. Any receipt that stores only 25 cannot distinguish them.

### Block 10 — digest is not a substitute for cache generation — P0-079 boundary

A future content fingerprint must be attached to the exact immutable operation-owned cache generation.

Putting a digest beside the current mutable `tab:<id>` slot without generation fencing would leave P0-079 unresolved because a newer body/metadata pair could legitimately replace the old operation.

### Block 11 — content receipt is not a substitute for source-document generation — P0-023 boundary

A digest can prove which PDF bytes are being reused. It cannot prove that those bytes came from the current browser document generation.

P0-023 therefore remains independent: same-URL reload/replacement must not authorize an older cached PDF merely because its bytes are internally consistent.

### Block 12 — required cache invariant

The cache authority should eventually be an immutable tuple conceptually equivalent to:

`operation/cache generation + source document generation + byte length + content receipt + metadata receipt`.

The exact algorithm/schema is implementation work; this audit only establishes that byte count alone cannot serve the content-identity role.

## Blocks 13–23 — local Chrome download settlement and Journal authority

### Block 13 — local temporary cache key is operation-specific — positive control / P0-079

Fresh local generation uses `local-download:<operationId>` rather than the shared Yandex `tab:<id>` key.

This is a strong pattern for immutable per-operation cache ownership and should inform P0-079 remediation.

### Block 14 — Blob URL is created from that exact local cache key — positive control

`createPdfCacheBlobUrl(temporaryCacheKey)` asks offscreen to read the cached PDF and create the Blob URL.

The browser download is therefore sourced from the cached operation artifact, not from a later re-render.

### Block 15 — temporary cache deletion occurs after Blob URL creation — positive control

The local temporary cache record is deleted in `finally` after the Blob URL request returns.

The Blob URL itself remains pinned by offscreen tracking until download settlement/cleanup.

### Block 16 — durable intent is written before the irreversible browser start — positive control / P1-146

`checkpointPendingLocalDownloadIntent()` runs before `startAutomaticBlobDownloadBounded()`.

This preserves recovery evidence across worker loss or unknown `downloads.download()` settlement.

### Block 17 — local intent persists exact expected byte count — positive control

The intent stores `expectedBytes` from Chromium's generated PDF size.

This improves fallback matching and provides a useful sanity check, but it is still not a content fingerprint.

### Block 18 — exact Blob URL is primary reconciliation identity — positive control / P1-146

When Chrome exposes the original/final Blob URL, recovery matches it exactly before using the conservative fallback.

This is materially stronger than filename-only recovery.

### Block 19 — fallback is filename + byte size inside a bounded age window — P0-048 refinement

If Blob URL is unavailable, recovery may match an extension-owned download by expected filename plus exact byte count, only while the intent is young enough.

This is a bounded conservative fallback, but two same-name same-size extension downloads are not content-distinct under that criterion. P0-048 already owns fallback identity ambiguity.

### Block 20 — binding to `downloadId` is durable — positive control

Once an intent is matched to a Chrome DownloadItem, `bindPendingLocalDownloadIntent()` moves authority from the pre-start intent to the numeric download id.

This prevents repeated broad search for the same settled intent.

### Block 21 — terminal `complete` finalization does not re-check file bytes — P1-146/P0-070

`finalizePendingLocalDownload(downloadId, 'complete')` appends the Journal record from the durable checkpoint and removes it when successful. It does not compare `fileSize/totalBytes` or any content fingerprint at this terminal step.

The Chrome state transition proves browser completion, not byte-for-byte equality to the generated PDF artifact.

### Block 22 — exact-size fallback is useful but cannot become the sole final content receipt

The current recovery fallback's size check should be preserved as a cheap consistency signal.

Acceptance should distinguish `download identity`, `download terminal state`, `expected byte count` and `content receipt` instead of treating one as a replacement for the others.

### Block 23 — local final acceptance boundary

A future local-download implementation should carry the generated artifact's immutable receipt through intent -> Blob URL -> downloadId -> terminal Journal finalization where browser APIs make verification possible, while remaining truthful when the browser does not expose a direct final-content digest.

The audit does not require pretending Chrome Downloads offers guarantees it does not expose; unknown/unverifiable content identity must remain a distinct state rather than being silently upgraded to exact byte identity.

## Blocks 24–36 — credential isolation and signed-transfer safety controls

### Block 24 — OAuth token is session-only in current storage model — positive confidentiality control

`writeYandexAuth()` writes access tokens to `chrome.storage.session`. `readYandexAuthState()` migrates a legacy persistent token into session storage and immediately removes the old persistent copy.

This reduces long-lived credential persistence.

### Block 25 — storage is restricted to trusted extension contexts — positive confidentiality control

Startup calls `chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'})` and the same for session storage when supported.

Content scripts do not need direct storage access; initialization failures remain a fail-closed startup boundary.

### Block 26 — OAuth `Authorization` stays on worker API calls — positive boundary

`yandexApi()` obtains the current access token and sends `Authorization: OAuth <token>` to the Yandex REST API.

The token is not copied into the PDF cache record or file body.

### Block 27 — offscreen signed file transfer does not receive the OAuth token — positive confidentiality control

`runOffscreenSignedTransfer()` passes the signed upload URL, HTTP method, cache/payload key and content type. The offscreen transfer builds its fetch without an OAuth Authorization header.

The signed URL is the transfer capability; OAuth credentials remain worker-side.

### Block 28 — signed transfer host is fail-closed — positive confidentiality/integrity control

`isAllowedSignedYandexUrl()` requires HTTPS and a `disk.yandex.net` host/subdomain, with a hard URL-length bound.

Offscreen therefore does not accept arbitrary external destinations for the signed-transfer channel.

### Block 29 — only trusted extension senders may use offscreen API — positive confidentiality control

`isTrustedExtensionSender()` checks `sender.id === chrome.runtime.id` and extension URL/origin semantics before accepting offscreen commands.

This prevents page/content-origin direct use of the offscreen transfer API.

### Block 30 — signed transfer lifetime owns its admission reservation — positive integrity/availability control

Offscreen keeps count/byte reservations until the actual transfer promise settles, not merely until a caller-side timeout.

A lost response cannot immediately free capacity while the underlying file transfer still runs.

### Block 31 — redirect is disabled for the signed transfer fetch — positive boundary

Offscreen sets `redirect: 'error'` for the signed URL request.

This preserves the approved transfer destination instead of following an unreviewed redirect chain.

### Block 32 — token/signature logging is redacted — positive confidentiality control

`sanitizeOperationLogValue()` redacts token/authorization/signature-like fields and rewrites signed Yandex URLs to a redacted path form.

Operational diagnostics therefore have an explicit credential/capability minimization layer.

### Block 33 — source-URL confidentiality remains separate — PR #30 control

PR #30 already records that source URL metadata can expose userinfo/query/fragment in archived outputs. That is P0-066 and is not reclassified here.

This tranche only uses that evidence as a reminder that file-content integrity and metadata confidentiality are separate dimensions.

### Block 34 — credential isolation does not prove operation-context immutability — P0-074

Keeping tokens out of offscreen is good confidentiality design. It does not make a long Yandex operation immutable if different worker stages re-read current auth/config and can observe a newer account/root/config generation.

P0-074 remains necessary even with excellent token isolation.

### Block 35 — signed URL capability belongs to the account/context that issued it — integrity boundary

The upload URL is obtained by an authenticated worker API call, then used by offscreen independently of the OAuth token.

Therefore the operation must retain provenance saying which immutable account/root/auth generation issued that capability; the capability itself should not be rebound to a later current configuration.

### Block 36 — credential acceptance for this tranche

Preserve session-only token storage, trusted-context storage access, worker-only OAuth header construction, signed-host allowlist, no redirects, trusted offscreen sender checks and log redaction.

Any remediation for byte receipts or generation fencing should not weaken these controls or place OAuth secrets into cache/Journal/offscreen payload metadata.

## Blocks 37–48 — Yandex upload/reuse/recovery content and context receipts

### Block 37 — remote checkpoint stores expected PDF byte count — positive control / P1-184

Before upload/finalization, `checkpointPendingRemoteSaveIntent()` persists `expectedPdfBytes` along with the prepared Journal data.

This allows recovery to reject obvious truncation/size mismatch.

### Block 38 — remote checkpoint also binds `accountUid` and `rootPath` — positive control / P0-073

The upload path obtains current account UID and normalized root path and stores them in the durable pending data.

This is the correct shape for durable context provenance.

### Block 39 — manual retry may reuse an existing remote file by type + exact size — P1-184

With `allowExisting`, the worker reads `name,path,type,size,public_url,resource_id`; if the path is a file and its size exactly equals `expectedPdfBytes`, the transfer is skipped as already present.

No pre-existing expected resource id/content receipt is available at that decision point.

### Block 40 — same-size different-content remote file satisfies the reuse predicate — P1-184

The deterministic equal-length model from Block 9 demonstrates the semantic gap: exact size equality cannot distinguish distinct byte sequences.

This is exactly the registry's existing P1-184 statement that path+size cannot authorize adoption/publication.

### Block 41 — fresh upload success is followed by exact-size metadata verification — positive control

After transfer, the worker reads remote metadata again, requires file type and calls `assertExactYandexRemoteByteSize()`.

This catches incomplete/truncated/expanded transfer outcomes that change byte count.

### Block 42 — post-upload size verification still is not content identity — P1-184

A successful HTTP response plus matching remote byte length does not establish that the remote object contains the exact generated PDF bytes when no stronger content/object creation receipt is retained.

The finding is about integrity proof, not about any claim that Yandex normally corrupts uploads.

### Block 43 — recovery repeats type + size verification — positive control / P1-184

`recoverPendingRemoteSaves()` re-reads the remote path, requires `type === 'file'`, obtains `expectedPdfBytes` from the checkpoint and performs exact-size comparison.

This is crash-recovery-safe for size mismatch but preserves the same content-identity limitation.

### Block 44 — `resource_id` observed after lookup is not automatically a creation receipt — P1-184

Current flow learns a `resource_id` from the object found at the destination path after transfer/reuse. Without an earlier immutable expected object/content receipt, a newly observed id says which object is there now, not necessarily that it is the object produced by this operation.

P1-184 already distinguishes stronger creation receipt from path/size/newly observed metadata.

### Block 45 — Yandex operation reads config/auth at multiple live stages — P0-074

`uploadCachedRecordToYandex()` begins with `getYandexConfig()`, while folder provisioning, account UID lookup, upload-link acquisition, publication and final metadata verification use further Yandex API calls whose token is obtained through the current auth state.

There is no one captured immutable auth/account/root/config object passed through every stage.

### Block 46 — checkpoint context can therefore be older than later live API context — P0-074/P0-073

The durable checkpoint contains the account/root observed before transfer/finalization. A later stage can still execute through a newly current auth/config generation unless the whole operation is fenced.

The safe outcome on a context change is to stop/defer/reconcile under the original receipt, not silently continue under a newer current account.

### Block 47 — publication is another stage requiring the same immutable context — P0-074/P0-078 boundary

If `createPublicLinks` is enabled, `ensureYandexPublicUrl()` runs after upload/reuse and before final verification.

Publication policy and account/root/auth generation must remain those admitted for the operation; a later settings/auth change must not silently become authority for an already-admitted file.

### Block 48 — required remote operation tuple

A complete remote-save receipt should conceptually bind one operation-owned PDF generation to one immutable Yandex context and one remote object/content creation result:

`operation/cache generation + byte/content receipt + account/auth/root/config generation + destination path + exact remote object creation/identity receipt + publication policy generation`.

This is a refinement of P0-074/P0-073/P0-079/P1-184, not a new owner.

## Blocks 49–56 — Journal/backup closure, controls and final acceptance

### Block 49 — Journal append requires the durable source checkpoint — positive control

Both local and remote completion use `appendJournalEntryFromDurableCheckpoint(...)` with the relevant pending store/key.

If a concurrent clear/import removed that checkpoint, the append path does not resurrect stale in-memory metadata.

### Block 50 — remote checkpoint is marked verified before final Journal append — positive control

After remote metadata verification, the pending remote save is updated with public URL/resource id and then used for Journal append.

This preserves a durable recovery bridge if Journal commit fails after remote creation.

### Block 51 — verified state should eventually include stronger content/object receipt — P1-184

Today the transition to verified is justified primarily by path/type/size plus observed metadata. A future stronger receipt should be persisted in the same durable checkpoint before Journal authority is finalized.

Keeping it only in transient memory or OperationLog would not satisfy crash recovery.

### Block 52 — Journal backup uses exact staged byte totals — positive control / P0-077

Chunked export staging tracks declared/actual byte totals, and offscreen rebuild of chunked transfer checks aggregate bytes against the manifest.

This is a strong internal transfer-integrity pattern that the PDF path can borrow conceptually.

### Block 53 — remote Journal backup verification is also size-based — P0-077/P1-184 boundary

The Yandex backup flow stores `expectedBytes`, uploads staged JSON, then verifies remote file type and exact size; recovery repeats that check.

As with PDF upload, exact length detects truncation but cannot distinguish same-length altered content. The product's self-backup integrity contract should retain a stronger durable content receipt where the external API can support or be reconciled with one.

### Block 54 — do not invent unsupported remote guarantees

If the external service does not expose a cryptographic checksum or immutable creation token sufficient for direct comparison, WebClip must not label a weaker `path+size` observation as byte-exact proof.

Acceptable remediation may combine a locally computed digest with an exact object-creation/resource receipt, bounded read-back where product policy permits, or another service-supported mechanism. The audit intentionally does not prescribe an API feature that is not actually available.

### Block 55 — external verification remains required

Repository/source models can prove the current receipt structure and equal-length limitation. Real release regression still needs actual unpacked Chrome + Yandex behavior for upload-link issuance, successful upload, retry/recovery, account switch/disconnect/re-auth boundaries, public-link policy and any service-provided object identity fields.

No deterministic source test should auto-close P1-184/P0-074/P0-073 while those external boundaries remain required.

### Block 56 — final acceptance matrix and duplicate decision

A complete implementation gate should prove:

1. generated PDF content receipt is computed/retained for the exact operation-owned cache generation;
2. cache body + length + content receipt + metadata receipt commit atomically;
3. offscreen upload reads the exact operation-owned cache generation and can validate its local content receipt before transfer;
4. local download keeps intent/blobURL/downloadId/terminal state distinct from content verification and reports unverifiable states truthfully;
5. fallback matching cannot claim exact artifact identity from filename+size alone;
6. Yandex retry cannot adopt/publish an existing same-size file without the stronger P1-184 object/content receipt;
7. post-upload and crash recovery preserve the same stronger receipt, not only path/type/size;
8. the same immutable account/auth/root/config/publication generation governs folder creation, upload-link acquisition, signed transfer provenance, publication, verification and final Journal append;
9. auth/context change stops or reconciles under the captured context rather than silently switching current credentials;
10. OAuth token remains session-only/trusted-context, never enters PDF cache/Journal/offscreen transfer payload, and OperationLog remains redacted;
11. source-document generation P0-023 remains independently fenced; byte identity does not authorize stale same-URL reuse;
12. Journal backup/export retains its own durable content-integrity receipt and remains self-restorable under P0-077;
13. exact byte/count limits and offscreen transfer budgets remain fail-closed;
14. real Chrome/Yandex E2E validates the external object/transfer semantics required by P1-184/P0-074/P0-073.

Final classification: **P1-184, P0-079, P0-070, P0-074, P0-073, P1-146, P0-048, P0-023 and P0-077 remain ACTIVE; no status transition and no P1-230 allocation.**
