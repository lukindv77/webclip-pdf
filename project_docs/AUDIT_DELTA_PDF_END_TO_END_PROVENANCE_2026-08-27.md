# Audit delta — end-to-end PDF document/content provenance — 2026-08-27

Source-of-truth `main` immediately before this write: `e4d588284cc96aca95c7e2107ed0b3c9da275e3c`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof composes and refines existing:

- **P0-070** — live PDF generation must remain bound to the exact initiating top document/navigation generation;
- **P0-023** — cached-PDF retry authority must not survive same-URL document replacement;
- **P0-079** — immutable operation-owned PDF byte/cache generation instead of mutable `tab:<tabId>` ownership;
- **P1-184** — exact remote object/content proof after upload/unknown settlement;
- **P0-073/P0-074** — exact Yandex account/root/auth/config operation context;
- **P0-076** — exact Journal generation/revision before delayed finalization;
- **P1-198** — worker-issued physical operation receipt rather than caller-owned textual `operationId`.

Adjacent diagnostics owner: **P1-147**. Fresh evidence below proves that post-print diagnostics themselves are currently tab-addressed and can describe a newer document than the PDF they are logged against.

The missing implementation-level invariant is one continuous **provenance chain** from the initiating document to the final Journal/remote object. Existing items correctly own individual boundaries, but current runtime does not carry a durable receipt across those boundaries.

## Fresh source proof — document identity is dropped at worker admission

### 1. Runtime sender has document identity, save handlers keep only tabId

The content-allowed handlers for local/Yandex PDF save obtain:

`const tabId = sender.tab?.id`

and invoke:

- `generatePdfAndDownload(tabId, sanitizeContentSaveMeta(...), operationId)`;
- `generatePdfAndUploadToYandex(tabId, sanitizeContentSaveMeta(...), operationId)`.

`sender.documentId` is not passed to either operation.

`sanitizeContentSaveMeta(rawMeta, sender)` derives authoritative URL/origin from `sender.tab.url` / `sender.url`, which is a useful anti-spoofing boundary, but its normalized result contains URL/title/date/selection/resource metadata — not an immutable top-document receipt.

Therefore worker admission already loses the exact identity of the document that emitted the save request.

This is the first boundary owned by P0-070.

### 2. `generatePdfBlob(tabId)` targets current tab state, not admitted document

The PDF helper attaches Chrome Debugger to `{ tabId }` and invokes `Page.printToPDF` against whichever document is current in that tab at command time.

The existing debugger actual-settlement serialization/deadlines remain positive controls. They prevent overlapping/late debugger attachment corruption, but they do not prove that the current document is the one that initiated the save.

Navigation/reload after the content message but before `Page.printToPDF` can therefore print a replacement document while metadata still represents the earlier sender.

## Fresh source proof — post-print diagnostics have a second document-retarget window

### 3. Both PDF flows perform a new tab-only read after PDF bytes already exist

Immediately after:

`let pdfBlob = await generatePdfBlob(tabId)`

both local and Yandex save paths call:

`const printDiagnostics = await collectPrintDiagnosticsForTab(tabId)`.

Only after that read do they proceed to OperationLog copy-save diagnostics and cache/download/upload preparation.

### 4. `collectPrintDiagnosticsForTab()` sends by tabId only

The helper executes:

`chrome.tabs.sendMessage(Number(tabId), { type: 'WEBCLIP_COLLECT_PRINT_DIAGNOSTICS' })`

with no exact `documentId`, no expected navigation generation and no response-side proof that the answering content script belongs to the document that was printed.

A valid race is therefore:

1. document A initiates save;
2. Chromium physically prints A and returns PDF bytes A;
3. top tab navigates/reloads to document B before post-print diagnostics RPC;
4. `tabs.sendMessage(tabId)` reaches B;
5. OperationLog records B's page/print structure as diagnostics attached to PDF A.

This is not merely cosmetic. P1-147 diagnostics are intended to explain what was actually selected/printed. Cross-document attachment makes forensic evidence positively misleading.

If navigation happens slightly earlier, the stronger P0-070 failure remains possible: PDF itself can already be B while admission metadata is A.

### 5. Post-print diagnostics must be exact-document or explicitly unavailable

The correct fix is not to treat diagnostic success as required for preserving a valid already-formed PDF. Instead:

- if the exact admitted/printed document generation is still alive, query that exact document;
- if it is gone, record diagnostics as stale/unavailable for that receipt;
- never query the replacement current document and present its answer as evidence for the old PDF.

A document-generation mismatch before the immutable PDF receipt/cache admission is a separate P0-070 fail-closed decision: do not continue save finalization under mixed provenance.

## Fresh source proof — cache loses document lineage

### 6. Yandex PDF cache stores tab/URL metadata but no exact document generation

After print, `generatePdfAndUploadToYandex()` creates the cache record using:

- `key: pdfCacheKey(tabId)`;
- `tabId`;
- filename;
- normalized save metadata;
- random `journalEntryId`;
- PDF Blob;
- createdAt;
- normalized `sourceUrl`.

Current metadata persistence records URL/meta/size/cache format/temporary/journalEntryId, but no exact initiating `documentId`, navigation generation, worker-issued operation receipt or strong PDF content digest.

P0-079 already proves the mutable tab key can substitute another operation's bytes. This pass adds the document-lineage consequence: even if the key were made immutable tomorrow, a cache generation containing only URL cannot prove which same-URL document produced those bytes.

### 7. Retry validation proves URL + TTL, not document identity

`getValidCachedPdfForTab(tabId)` currently:

1. loads metadata by `pdfCacheKey(tabId)`;
2. checks cache TTL;
3. fresh-reads current tab URL;
4. compares it to cached source URL;
5. returns the cache when the URL strings match.

A same-URL reload/document replacement therefore satisfies the current admission test. This is the existing P0-023 root cause.

The fix must consume the same source-document receipt produced for P0-070; P0-023 should not invent a separate weaker notion of document identity.

## Fresh source proof — Yandex recovery cannot reconstruct lost source-document provenance

### 8. Remote-save checkpoint inherits cache metadata, not a source-document receipt

`uploadCachedRecordToYandex()` creates the durable remote checkpoint using:

- exact intended Journal id;
- account/root/path metadata;
- expected PDF byte count;
- publication preference snapshot;
- `meta` copied from the cached PDF record;
- textual operationId.

The already-audited remote-save generation defect means multiple physical attempts can also overwrite/mutate the same `journalEntryId` row until a real remoteSaveGenerationId/CAS receipt is introduced.

But even after that generation fix, current checkpoint inputs do not contain the exact source-document generation. Recovery after MV3 restart therefore cannot recreate provenance that was discarded before cache admission.

### 9. Remote exact object proof cannot repair a wrong local lineage

P1-184 may eventually prove that remote object R contains exactly local PDF generation G. That is necessary, but it does not prove that G came from document A unless P0-070/P0-079 already bound G to A.

Likewise a perfect remoteSaveGenerationId cannot tell whether PDF generation G was generated from the intended document if the source-document receipt was never persisted.

The chain must be conjunctive, not interchangeable:

`document receipt -> PDF generation/content receipt -> transfer attempt -> remote-save generation -> remote object/content proof -> Journal finalization`.

A strong receipt at a later layer cannot retroactively repair a missing earlier link.

## Unified provenance contract

### 1. Source document receipt

At save admission, create/capture a worker-authoritative source receipt containing at least:

- top tab id;
- exact sender `documentId` when Chrome supplies it;
- worker navigation/full-document generation for the tab;
- normalized admitted URL/origin;
- Incognito/privacy classification where relevant;
- worker-issued operation receipt/generation from P1-198.

The textual URL is descriptive/secondary identity, not the document-generation authority.

### 2. Pre-print fence

Immediately before `Page.printToPDF`, prove that the current top document/navigation generation still equals the admitted source receipt.

Mismatch = fail closed before print. Do not silently retarget the operation to the new document.

### 3. Print generation / immutable PDF receipt

Once `Page.printToPDF` returns bytes, create an immutable PDF generation/content receipt before any mutable tab-scoped handoff.

Bind at minimum:

- random PDF/cache generation id;
- source document receipt;
- operation receipt;
- exact byte length;
- strong local digest/fingerprint;
- creation timestamp;
- intended Journal id where already assigned.

P0-079 owns immutable physical byte storage/consumer ownership; this document receipt must be part of that record.

### 4. Post-print generation fence

Before the newly formed PDF is admitted to download/cache/Yandex finalization, fresh-check the same source-document/navigation generation again.

If it changed during print or immediately after print, do not finalize a mixed-source save. Destroy/release the unadmitted Blob according to bounded resource rules and return an explicit stale-navigation result.

This is exactly the post-print requirement already stated by P0-070; this pass clarifies that the check must precede immutable consumer admission.

### 5. Exact-document diagnostics

P1-147 post-print diagnostics must carry the same source receipt or be addressed to exact `documentId` where supported.

A replacement document may never answer diagnostics for the old receipt.

If the original content document is gone while the PDF receipt is otherwise valid under the chosen ordering, diagnostics should be `unavailable/stale-document`, not borrowed from the current tab document.

### 6. Retry pointer vs physical PDF generation

Navigation/reload invalidates the current tab's authority to start a **new retry** from an old document generation (P0-023).

It must not automatically destroy an immutable PDF body already owned by an admitted download/upload/reconciliation operation (P0-079 consumer-lifecycle refinement).

Model separately:

- immutable PDF generation;
- in-flight physical owner/reference;
- latest-retry pointer + current-document authority.

### 7. Remote-save attempt composition

Each Yandex physical attempt receives its own immutable `remoteSaveGenerationId` and transfer attempt receipt.

That receipt must reference the exact immutable PDF generation/content receipt, which in turn references the exact source document receipt.

Never reconstruct this relation from `journalEntryId`, `tabId`, URL, filename or expected size after restart.

### 8. Remote proof and Journal finalization

P1-184 verification proves the exact remote object/content corresponds to the exact local PDF generation.

P0-076 final local Journal append additionally proves the intended Journal generation/revision/checkpoint generation is still current.

The Journal entry should retain enough bounded provenance to explain/diagnose:

- which local operation produced it;
- which source document generation was admitted;
- which immutable PDF generation was consumed;
- which remote/download physical receipt settled.

This does not require exporting privacy-sensitive raw internal identifiers if they are not product data; the durable internal receipts may be normalized/redacted in user-facing exports/logs while preserving local authority.

## Required implementation order

A safe implementation order is important because partial fixes otherwise create false confidence:

1. **P1-198** worker-issued operation receipt / ownership primitive.
2. **P0-070/P0-023** one shared top-document/navigation receipt and pre/post-print/retry fences.
3. **P0-079** immutable operation-owned PDF generation keyed independently from tab, including source receipt + digest.
4. Update local DownloadItem intent and Yandex signed transfer to consume the exact PDF receipt, never a mutable tab alias.
5. Add Yandex `remoteSaveGenerationId` + transfer-attempt phase/CAS and reference the exact PDF generation.
6. **P1-184** reconcile remote object/content against the retained local content receipt.
7. **P0-076** exact Journal finalization generation/CAS.
8. Only then remove/reclaim immutable bodies/receipts when all in-flight/reconciliation ownership is released under bounded quota/TTL policy.

Steps may be implemented in one patch, but acceptance must test the full chain. Closing only a later layer must not mark earlier provenance owners resolved.

## Deterministic regression matrix

1. A sends save with `documentId=A`; navigate to B before debugger print: no PDF side effect for B and no Journal/cache entry from mixed A/B metadata.
2. Same-URL reload A -> B before print: URL equality does not bypass the document-generation fence.
3. Print A succeeds; navigate to B before post-print diagnostics: B diagnostics are never attached to PDF A.
4. If exact A diagnostics cannot be obtained after print, log explicit stale/unavailable diagnostics rather than querying current B.
5. Navigate after PDF bytes exist but before immutable cache admission: operation fails closed and unadmitted Blob is released; no Yandex/download handoff starts.
6. A PDF generation is durably admitted, then source tab navigates/closes while Yandex upload is already admitted: retry authority is invalidated, but A's owned body remains until transfer settlement/reconciliation.
7. Same-URL reload after cached retry generation: new document cannot retry old generation without explicit stronger user/rebind semantics; default is fail closed.
8. A and B same tab, equal-size different PDF bytes: immutable generation ids/digests prevent substitution even when URL and size match.
9. A remote-save attempt references PDF generation GA; newer B retry references GB: late A verification cannot mutate B's remote generation or consume GB.
10. MV3 restart after transfer-admitted unknown settlement: recovery loads remoteSaveGeneration -> exact PDF/content receipt -> exact source-document receipt linkage without reconstructing it from tab/URL.
11. Remote path contains a same-size unrelated object: P1-184 rejects it even though document/cache provenance is correct.
12. Remote exact object proof succeeds, but Journal generation was replaced by clear/import: P0-076 prevents stale local finalization while remote reconciliation evidence remains diagnosable.
13. OperationLog clear/reuse of display operationId cannot alter the durable source/PDF/remote receipt authority (P1-197/P1-198 composition).
14. Cross-origin iframe print generation P1-199 remains separately fenced; valid top-document receipt does not make stale child-frame restore safe.
15. Normal single-operation save without navigation preserves current user-visible behavior while carrying the stronger internal receipts.

## Duplicate check / numbering

No new P-number is created.

- **P0-070** owns document admission and pre/post-print generation truth.
- **P0-023** owns current-document authority for later retry.
- **P0-079** owns immutable local PDF bytes/generation and exact consumer ownership.
- **P1-184** owns remote object/content proof.
- **P0-073/P0-074** own Yandex account/root/auth/config namespace/operation context.
- **P0-076** owns stale Journal generation finalization.
- **P1-198** owns locally issued operation identity; textual operationId is not sufficient authority.
- **P1-147** owns truthful print diagnostics, with this pass adding exact-document addressing as a dependency.
- **P1-199** remains cross-origin iframe print operation-generation fencing; it is not reassigned.
- **P1-200/P1-201** remain remote-frame control generation / optional-permission revocation lifecycle.

The point of this checkpoint is not a new category. It prevents implementing the existing categories as independent local patches that still leave a broken end-to-end chain.

## Test / release state

No product tests were rerun for this docs-only audit checkpoint. The last proven product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**.

Current `manifest.json` remains version **0.9.8** with minimum Chrome **118**. No runtime/config/manifest change, build, tag or GitHub Release is made by this audit checkpoint.
