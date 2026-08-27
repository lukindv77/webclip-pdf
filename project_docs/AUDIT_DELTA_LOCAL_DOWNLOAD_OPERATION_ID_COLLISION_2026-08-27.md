# Audit delta — local PDF/download operation identity collision — 2026-08-27

Source-of-truth `main` immediately before this write: `276d20320e330df98fe60736d7af60e52acadcaf`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Classification

No new P-number is created.

Fresh source proof materially strengthens and composes existing:

- `P1-198` — caller-selected textual `operationId` is not a worker-issued live operation receipt;
- `P0-079` — irreversible PDF byte consumers need immutable operation-owned cache generations;
- `P0-039` — local physical save must retain exact durable recovery metadata;
- `P0-048` — local DownloadItem/checkpoint binding must be exact and no-overwrite;
- `P1-146` — at most four **actually unresolved** automatic `chrome.downloads.download()` starts may exist.

The previous P0-079 positive-control statement that the direct local-download path is already operation-owned via `local-download:<operationId>` is incomplete. It is better than the Yandex `tab:<tabId>` slot only when `operationId` itself is a unique authoritative receipt. Current content callers are allowed to choose that string, and duplicate/reused values are not rejected.

The important correction to P1-198 is stronger: current source **does** use caller-provided `operationId` as the basis of physical/durable local-save keys. Therefore a collision can affect actual PDF bytes, durable `pendingDownloads` authority and native-download admission, not only OperationLog/progress truth.

## Fresh runtime proof

### 1. Live local PDF handler accepts caller operationId

`WEBCLIP_GENERATE_PDF` obtains the source tab from `sender.tab.id`, but passes `normalizeOperationIdInput(message.operationId)` directly into `generatePdfAndDownload(...)`.

`normalizeOperationIdInput()` validates syntax/length only. It does not prove that the worker issued the id, that it is unused, or that it belongs to the exact source document/operation generation.

If the caller omits the value, `generatePdfAndDownload()` creates a local id. But any accepted non-empty caller value becomes authoritative for the paths below.

### 2. Direct local PDF bytes are keyed by textual operationId

After `Page.printToPDF`, direct local save constructs:

`temporaryCacheKey = local-download:<operationId>`

and passes that key to `putCachedPdf()`.

`putCachedPdf()` writes the PDF record and its metadata with IndexedDB `put()`, not a no-overwrite `add()`/CAS tied to an immutable generation.

Therefore a second physical operation using the same textual operationId can replace the first operation's temporary PDF bytes/metadata at the same key.

This corrects the earlier P0-079 positive-control wording: `local-download:<operationId>` is only logically operation-scoped; it is not a safe physical owner while the operation id is caller-selected/reusable.

### 3. Blob creation is a later read of that mutable key

The worker does not keep the local `pdfBlob` as the irreversible download body. It calls:

`createPdfCacheBlobUrl(temporaryCacheKey)`

which sends only `pdfCacheKey` to offscreen. Offscreen later executes `getPdfCacheRecord(key)`, builds a Blob from whichever record occupies the key at that moment, and returns a Blob URL.

Thus the following schedule is valid:

1. A prints PDF A and writes `local-download:X`;
2. before offscreen reads A's cache key, B starts with the same caller-provided operationId X and writes PDF B to `local-download:X`;
3. A's offscreen Blob creation reads B;
4. A proceeds using A's filename/meta/expected byte count but Blob B.

Equal-sized different PDFs make the substitution invisible to size-only checks. With unequal sizes, the wrong bytes can still reach an irreversible Chrome download before later reconciliation detects a mismatch.

### 4. Cleanup is also by the collided textual cache key

Direct local save deletes `temporaryCacheKey` in a `finally` immediately after Blob URL creation.

If B has replaced the same key while A is finishing its Blob handoff, A can delete B's temporary cache record. Thus the collision can both substitute A's body and destroy B's body/retry evidence.

P0-079's compare-and-delete-by-generation requirement therefore applies to direct local save as well as Yandex retry-cache.

## A second collision exists in durable `pendingDownloads`

### 5. Local download intent key is also operationId-derived

`makePendingLocalDownloadIntentKey(operationId)` returns:

`intent:<operationId>`

when operationId is non-empty; random fallback is used only when the id is absent.

`checkpointPendingLocalDownloadIntent()` stores the prepared durable item with:

- `downloadId: intent:<operationId>` as the object-store key;
- its own random `journalEntryId` inside `data`;
- Blob URL;
- expected bytes;
- operationId and Journal metadata.

The transaction eventually calls `pending.put(item)`.

There is no expected-absence check and no immutable intent generation. A second operation using textual X silently replaces the first durable `intent:X` checkpoint.

### 6. Physical download and durable metadata can be cross-bound

`startAutomaticBlobDownloadBounded()` starts native Chrome download using the function arguments `blobUrl` and `filename`, but after Chrome returns `downloadId` it binds durable state by re-reading the supplied **intent key**:

`bindPendingLocalDownloadIntent(key, downloadId)`.

That helper reads the current record under `intent:X`, deletes that key and writes the record under the numeric Chrome downloadId.

A deterministic corruption schedule therefore exists even if the Blob URLs themselves were created correctly:

1. A creates Blob URL A and persists `intent:X` containing Journal/meta A;
2. B uses the same operationId X and overwrites `intent:X` with Blob/meta B;
3. A starts `chrome.downloads.download({url: BlobA, filename: filenameA})`;
4. A's late successful start receives downloadId DA;
5. A binds `intent:X`, but the record now belongs to B;
6. DA is now durably associated with B's Journal/meta/expected bytes while the physical DownloadItem is A.

If A/B have equal bytes, terminal reconciliation can append a Journal entry describing B for physical file A. If sizes differ, finalization may fail closed, but A's wrong/orphan physical file already exists and B's original durable intent has been consumed/mis-bound.

This is not the existing P0-048 fallback ambiguity. No discovery heuristic is required: the wrong durable record is selected by an exact collided key before normal DownloadItem reconciliation.

### 7. Same-key replacement also destroys recovery uniqueness

Because the intent object-store key is the operationId-derived string until native start settles, there cannot be two independent unresolved same-id intents. The newer one overwrites the older one.

P0-039's guarantee that an irreversible physical save retains its exact recovery metadata therefore depends on intent identity being independently unique/no-overwrite, not merely on writing *some* checkpoint before `chrome.downloads.download()`.

## P1-146 actual-settlement cap is bypassable by the same collision

### 8. The unresolved-start tracker is keyed by the collided intent key

`startAutomaticBlobDownloadBounded()` checks:

`automaticDownloadStartSettlements.size >= MAX_PENDING_AUTOMATIC_DOWNLOAD_STARTS`

with the configured cap of four actual unresolved starts.

After starting the raw Chrome promise it stores:

`automaticDownloadStartSettlements.set(key, settlement)`

and removes it later only if the map still points to that exact settlement.

There is no fail-closed `has(key)` check before starting a second physical native download with the same key.

### 9. Reusing one textual operationId undercounts actual Chrome promises

A starts native download under key `intent:X`; the map size becomes one.

Before A's actual `chrome.downloads.download()` promise settles, B with the same key starts another raw Chrome download. The map entry is replaced by B's promise, but A's promise is still physically unresolved.

The map still reports size one although two actual Chrome side effects are unresolved. Repeating the same key can therefore bypass the specific P1-146 invariant that admission counts actual unresolved starts rather than logical map keys.

Other independent offscreen/blob/storage bounds may limit practical fan-out, but they do not make the P1-146 claim true. The automatic-download start tracker itself is not an exact count of physical unresolved starts under key collision.

## P1-198 correction / priority composition

The original P1-198 delta stated that the audit had not found `operationId` used as the primary key of destructive Yandex/local checkpoints, which supported a P1 forensic/provenance classification.

Fresh source proof above corrects that statement for local saves:

- physical PDF cache key derives from operationId;
- durable pending local-download intent key derives from operationId;
- actual native-start tracking key derives from the same intent key.

Do not create a duplicate P0 solely for this manifestation. Keep P1-198 as the stable live-operation identity owner, but treat its implementation as a required dependency for closing the local-save portions of P0-079/P0-039/P0-048 and for restoring P1-146's actual-settlement cap.

The stable display `operationId` may remain visible/exportable. It must stop being the unique physical/durable owner key.

## Required unified contract

### Worker-issued operation receipt

At live operation admission, issue a worker-owned receipt/generation per P1-198. Caller text can be kept only as display/correlation metadata.

A duplicate request carrying the same live receipt must either:

- resume the exact already-created idempotent state; or
- fail closed as duplicate/stale.

It must never silently create a second physical PDF/download while reusing the same receipt.

### Independent PDF generation id

Each printed PDF that can cross an irreversible boundary gets a cryptographically random immutable `pdfGenerationId` / cache key independent of display operationId and tabId.

Bind it to:

- worker operation receipt;
- exact source document/navigation generation (P0-070/P0-023);
- Journal entry id where applicable;
- byte length + strong local digest/content receipt;
- lifetime/in-flight ownership state.

Cache create must be no-overwrite. Cleanup must compare generation/owner before delete.

### Independent download intent / start attempt ids

Before `chrome.downloads.download()`:

1. create a random `downloadIntentId` independent of operationId;
2. persist it with expected PDF generation, Blob URL, Journal metadata and operation receipt using no-overwrite semantics;
3. create a separate random `downloadStartAttemptId` (or equivalent actual-promise receipt) when the non-cancellable Chrome start is admitted;
4. count actual unresolved starts by physical attempt/promise, not a map key that can be overwritten;
5. on late success, bind numeric downloadId only if the original exact intent + attempt generation still match in the same authoritative transaction.

A stale/duplicate late start must never bind whichever newer intent happens to occupy a reused logical key.

### Blob handoff

`createPdfCacheBlobUrl()` / offscreen must consume the exact immutable PDF generation and return/verify owner receipt (and size/digest where useful) before the irreversible native download intent is started.

Do not accept a mutable textual alias as proof of which bytes were materialized.

### Clear/import/navigation composition

- clear/import generation fencing (P0-072/P0-076) may invalidate local Journal finalization authority without allowing a stale operation to bind to a replacement intent;
- navigation invalidates **new retry/document authority**, but an already-admitted exact physical body/start attempt retains its own settlement evidence;
- same-URL reload remains exact-document stale under P0-023/P0-070.

## Required deterministic regressions

1. A and B deliberately use the same caller display operationId X; they cannot share/overwrite one physical PDF cache record.
2. A caches PDF A, B with X runs before A offscreen read; A Blob is A or A fails closed, never B.
3. Equal-sized different A/B PDFs cannot hide substitution.
4. A cleanup cannot delete B's generation even when display ids match.
5. A persists intent, B with same display X is admitted: B cannot overwrite A's durable intent.
6. A physical DownloadItem + B metadata schedule above never binds B metadata to A downloadId.
7. Duplicate delivery of the exact same operation receipt does not start a second physical download unless an explicit idempotent/resume state machine authorizes it.
8. Four unresolved native starts plus a fifth reusing an existing display id are still counted as five physical starts for admission; fifth is rejected/deferred according to P1-146.
9. Repeated same display id cannot make `automaticDownloadStartSettlements.size` undercount actual unresolved Chrome promises.
10. Late success for start attempt A cannot bind a newer intent B after A's logical/display id has been reused.
11. P0-048 numeric downloadId no-overwrite/ambiguity tests remain required independently after exact intent identity is fixed.
12. P0-039 unknown-outcome recovery retains the exact original Journal/PDF/intent receipt and cannot be replaced by a later same-id operation.
13. Same-URL reload invalidates retry capability for the old document without deleting an already-admitted exact physical start/body receipt.
14. Normal single-operation direct download, cached local download and Yandex save continue to use one exact source-document → PDF-generation → side-effect receipt chain.

## Duplicate check / numbering

No new P0/P1/P2 number is assigned.

This is not a new P0-080 because the physical cache generation requirement belongs to P0-079 and the root live-id issuance defect belongs to P1-198.

This is not a new local-recovery item because P0-039 owns preservation of exact durable metadata and P0-048 owns bound DownloadItem no-overwrite. Fresh evidence adds a missing **pre-bind intent identity** requirement to those acceptance contracts.

This is not a new resource-budget item because P1-146 already explicitly promises a cap over actual unresolved native-start promises; its tracker key must simply become collision-safe/attempt-owned.

## Test / release state

No product tests were rerun for this docs-only checkpoint. The last proven product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No runtime/config/manifest change was made. No build, tag or Release was created.
