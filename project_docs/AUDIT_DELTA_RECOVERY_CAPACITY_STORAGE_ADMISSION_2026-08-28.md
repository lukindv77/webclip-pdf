# Audit delta — recovery capacity / storage-admission matrix — 2026-08-28

Source-of-truth `main` immediately before this write: `4347cdf6826668c9de341fef5aea31f391a40221`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Scope

Fresh cross-system audit of bounded recovery queues, TTL/dead-letter cleanup, storage-pressure cleanup and large-writer admission.

Primary existing owners reviewed:

- **P0-039/P0-048** — local DownloadItem unknown-settlement evidence and exact binding;
- **P0-079** — immutable operation-owned PDF generation/body lifetime;
- **P1-035** — transfer/import staging active-owner lifetime vs TTL;
- **P1-043** — shared extension storage quota preflight/reservation;
- **P1-054/P0-065** — offscreen Blob/materialization admission and memory reservation;
- **P1-184** — remote unknown-settlement evidence/dead-letter retention;
- **P1-197/P1-205/P1-173** — OperationLog active ownership, cleanup/write ordering and queued-turn admission;
- **P1-194** — truthful persistent-storage/durability class;
- **P1-156/P1-169** — prepared Save As active-session / tombstone lifecycle.

The audit goal was to determine whether there is another independent root cause in the interaction among these caps, or whether the remaining gaps are refinements of the existing owners.

## Result

No new P-number is required.

The strongest fresh finding is a concrete **P1-043 coverage gap**: remote Yandex Journal-backup import performs the large persistent staging write inside offscreen `text-download` without participating in the service-worker/global persistent-storage preflight/reservation contract. Local file import, PDF cache and chunked export have explicit `ensureStorageBudget()`/`WEBCLIP_STORAGE_PREFLIGHT` calls; Yandex download staging does not.

The rest of the cross-queue pass confirms useful fail-closed behavior: hard queue caps generally reject **new** admission rather than evicting existing active checkpoints. The dangerous data-loss mechanisms remain the already registered TTL/dead-letter semantics, not the capacity checks themselves.

## Positive control — low-storage cleanup does not delete Journal/recovery stores arbitrarily

`ensureStorageBudget(requiredBytes, reason)` obtains a required `navigator.storage.estimate()` snapshot, adds the 32 MiB safety reserve, and if free space is low runs only the existing cleanup classes:

1. `cleanupTransferPayloads()`;
2. `cleanupExpiredPdfCache()`;
3. `cleanupExpiredOperationLogs(retentionHours)`.

It then obtains a fresh storage estimate. If the requested bytes + reserve still do not fit, it throws `WEBCLIP_STORAGE_QUOTA_LOW`.

The code explicitly does **not** delete functional Journal entries automatically to satisfy admission.

This is a valuable boundary. There is no fresh evidence that quota pressure itself scans/deletes `pendingDownloads`, active `pendingRemoteSaves`, Journal entries, or prepared Save As checkpoints merely to make room.

Therefore a new generic `storage pressure destroys recovery` item is not justified.

## P1-043 remains snapshot-only for persistent quota

Canonical P1-043 already records that `ensureStorageBudget()` has no global reservation between the estimate and the eventual write. Two concurrent large writers can both observe the same free bytes and each pass admission.

Fresh audit reconfirms the concrete large-writer set:

- `putCachedPdf()` preflights anticipated PDF bytes;
- streaming import normalization preflights staged bytes + working reserve;
- `putTransferTextPayload()` preflights the text payload;
- chunked Journal export periodically preflights before groups of chunk writes;
- local Journal-file staging performs page-side `WEBCLIP_STORAGE_PREFLIGHT` before writing the selected File into transfer storage.

These calls remain snapshot-only; none reserves the promised bytes against other contexts.

## Fresh P1-043 coverage gap — Yandex backup `text-download` stages up to 50 MiB without persistent-storage preflight

### Worker flow

`fetchJournalBackupFromYandex()` obtains a signed download link and directly calls:

`runOffscreenSignedTransfer({ mode:'text-download', ..., maxChars: 50 * 1024 * 1024 }, { timeoutMs: 90_000 })`.

The fresh whole-worker inventory of `ensureStorageBudget(...)` call sites contains no preflight in this Yandex backup download path.

### Offscreen flow

Offscreen admission for `text-download` reserves against:

- `MAX_ACTIVE_SIGNED_TRANSFERS = 2`;
- `MAX_ACTIVE_SIGNED_TRANSFER_BYTES = 96 MiB`;
- up to the requested download cap, bounded to 50 MiB for Journal import.

This is a **memory/active-transfer reservation**. It follows the actual offscreen promise and is correctly retained if the service-worker caller times out or loses the response.

After the HTTP response arrives, `stageResponseBodyAsJournalImport()` streams the response into `WebClipOffscreenTransfers` records and finally writes a manifest. On error it best-effort deletes the partial payload group.

There is no corresponding persistent-origin quota reservation/preflight before these IndexedDB writes.

### Why offscreen transfer budget does not close P1-043

`activeSignedTransferBytes` measures the offscreen transfer/memory envelope. It does not subtract promised bytes from `navigator.storage.estimate().free` and does not coordinate with simultaneous large persistent writers in the service worker or Journal page.

A valid schedule remains:

1. free origin quota is only enough for one ~50 MiB staging operation plus safety reserve;
2. local file import or PDF cache writer A runs `ensureStorageBudget()` and passes;
3. Yandex backup download B is admitted by offscreen's independent signed-transfer budget;
4. A and B write into the same extension-origin persistent quota concurrently;
5. B can hit `QuotaExceededError` after downloading part/all of the remote backup, or A can fail after its earlier preflight despite both operations individually passing their local admission rules.

No silent Journal corruption is proven because partial offscreen staging is cleaned and replace-import is not admitted from a missing/failed manifest. The defect is global resource admission/truthfulness and avoidable late failure after expensive network/IDB work.

### Required P1-043 refinement

Remote backup `text-download` staging must participate in the same global storage reservation contract as local import/PDF/export writers.

A safe design should:

- reserve anticipated download staging bytes **before** offscreen starts materializing the response into IndexedDB;
- use the selected/fresh verified remote object size when P0-013 exact selection receipt supplies it; otherwise reserve the bounded maximum conservatively;
- carry a reservation/operation generation into offscreen staging rather than relying on an unrelated memory-transfer counter;
- account for the 32 MiB safety reserve once globally, not once independently per concurrent caller snapshot;
- release only after actual staging commit/abort/cleanup settlement;
- treat `QuotaExceededError` as a second fail-safe, not normal admission control;
- never reclaim Journal/recovery evidence merely to make a new optional import fit.

This naturally composes with P0-013: a fresh exact backup-object metadata read can provide trustworthy current byte size for both selection identity and quota admission.

## Local pending-download capacity — fail-closed admission is a positive control

`MAX_PENDING_LOCAL_DOWNLOADS = 100`.

Before creating a new pending local-download intent, `checkpointPendingLocalDownloadIntent()` counts existing rows in the `pendingDownloads` store. If capacity is reached it fails with:

`Слишком много незавершённых локальных загрузок WebClip; новая загрузка не запущена.`

It does not evict the oldest checkpoint to admit the new download.

This is the correct capacity shape for unknown browser side effects: preserve existing recovery authority and reject new irreversible work.

The known exception is identity collision from caller-selected `operationId` / `intent:<operationId>` reuse, already owned by P1-198 + P0-039/P0-048/P1-146. Capacity policy itself does not need a new number.

## Local pending-download TTL still destroys unresolved evidence after 24 hours — existing P0-039

Maintenance contains two explicit 24-hour deletion paths:

- unresolved intent cannot be bound to a DownloadItem within `PENDING_LOCAL_DOWNLOAD_TTL_MS`;
- bound numeric downloadId no longer resolves from `chrome.downloads.search()` and the checkpoint age exceeds the same TTL.

In both cases current code deletes the durable pending record, revokes the Blob URL and logs that no Journal entry was created.

Elapsed wall-clock time is not authoritative proof that an earlier non-cancellable `downloads.download()` start did not physically create/complete a file. This remains exactly the P0-039 evidence-retention defect; no duplicate item is created.

Required P0-039 architecture remains compact unresolved/dead-letter evidence rather than blind deletion after time.

## Remote-save active capacity — fail-closed, stale rows excluded from hot cap

`MAX_PENDING_REMOTE_SAVES = 20` counts non-`stale-unverified` rows.

For a new key, `checkpointPendingRemoteSaveIntent()` scans the store and rejects admission when the active count reaches 20. Existing active rows are not evicted to make room.

Rows already classified `stale-unverified` do not consume the hot active cap. This active/archive split is a useful positive control for recovery liveness.

The known row-generation overwrite problem when a checkpoint with the same `journalEntryId` already exists remains P0-073/P0-074/P1-184/P1-198 composition, not capacity policy.

## Remote stale archive still physically deletes unresolved evidence — existing P1-184

`cleanupStalePendingRemoteSaves()` retains the current 30-day / max-100 stale archive policy and physically removes older/excess `stale-unverified` rows.

The earlier remote stale-evidence audit already establishes that `stale-unverified` is explicitly an unresolved external outcome. Age/capacity does not prove non-occurrence.

Therefore P1-184 still requires compact tombstones/evidence-eviction truth rather than interpreting archive pruning as `upload did not happen`.

No new capacity number is needed.

## Pending generic Journal append capacity — fail-closed and size-bounded

`pendingAppends` is capped at:

- 20 rows;
- 320 KiB per checkpoint;
- 4 MiB aggregate JSON characters.

Admission computes existing count/aggregate size and rejects a **new** checkpoint if either cap would be exceeded. Existing pending rows are not silently deleted.

Legacy queue migration also fails without deleting data when the legacy array exceeds the supported count.

This is the correct capacity policy. `safeAppendJournalEntry()` may still continue with a direct Journal append after checkpoint admission failed and returns an explicit warning if both checkpoint and append fail. That result does not justify a new recovery item because the newer irreversible download/Yandex flows use their own physical durable checkpoints/finalization contracts; generic pending-appends is not the sole physical-side-effect receipt.

## Prepared Save As cap — fail-closed, no oldest-session eviction

Prepared Save As session index is capped at 64.

`checkpointPreparedSaveAs(...)` reads/sanitizes the session index and rejects a **new session** with `WEBCLIP_PREPARED_SAVE_AS_LIMIT` when the index is full. It does not remove an existing live session to admit another.

This is correct capacity behavior and should be retained while P1-156/P1-169/P1-210 add owner/session reconciliation for orphaned PREPARED/STARTED generations.

The known outer PREPARE response-loss case can still consume the cap with ownerless sessions; that is P1-210 + P1-156 lifecycle, not a cap-policy defect.

## Transfer/import staging TTL — existing P1-035

Both transfer payloads and Journal import staging use 2-hour wall-clock cleanup. The prior active-lifetime audit already proves a visible import confirmation can remain actionable while maintenance deletes its exact staging payload.

Storage preflight reuses these cleanup functions under low-quota conditions, so quota pressure inherits the same P1-035 lifetime defect for records already old enough to be called expired.

This does not create a separate quota root: fix P1-035 by binding active staging to a lease/explicit UI expiry, and make the low-quota cleanup call the same owner-aware policy.

## PDF cache TTL — existing P0-079 lifecycle requirement

`PDF_CACHE_TTL_MS = 24h`, and both retry lookup and maintenance remove expired cache generations.

Current cache is still tab-owned and does not carry the final P0-079 in-flight owner model. P0-079 already requires:

- immutable physical PDF generation;
- latest-retry pointer separate from body ownership;
- no tab/TTL/cleanup deletion while an admitted transfer/reconciliation still owns the generation;
- compare-and-delete by exact generation.

Storage-pressure cleanup must consume that owner-aware eligibility after P0-079 is implemented; it must not interpret age as permission to delete a body needed by an unresolved external attempt.

## OperationLog cleanup — diagnostics can be reclaimed, but active writer generations must remain ordered

`ensureStorageBudget()` may call `cleanupExpiredOperationLogs()` to reclaim diagnostics. This is reasonable because OperationLog is not authoritative Journal/recovery state.

However P1-197/P1-205 already prove that:

- retention may delete a still-running long operation solely by timestamp;
- queued old writers can recreate a deleted operation after retention/size cleanup;
- manual clear requires durable history epoch semantics.

Quota cleanup must therefore use the same active-generation/delete-write linearization rules. It cannot rely on current timestamp-only retention simply because the caller is storage preflight.

Again, this is a composition requirement, not a new quota item.

## Offscreen memory/transfer admission — positive actual-settlement ownership

Offscreen has explicit active signed-transfer reservations:

- max 2 active transfers;
- max 96 MiB aggregate reserved transfer bytes.

The reservation is created synchronously before `handleSignedTransfer()` and released in `.finally()` of the **actual offscreen transfer promise**. A lost/timed-out service-worker response therefore does not free offscreen capacity while fetch/IDB work is still running.

This is the correct actual-settlement pattern and should be reused conceptually for P1-043 persistent-byte reservations.

It does not close P1-054/P0-065 for Blob materialization because `registerBlobUrl(blob)` still receives an already materialized Blob; that separate pre-materialization memory-admission issue remains unchanged.

## P1-194 durability-class interaction

Even a perfect quota reservation cannot make ordinary IndexedDB eviction-proof.

P1-194 remains independent: when `navigator.storage.persisted()` is false, WebClip cannot call a successfully committed recovery row `guaranteed` against browser storage eviction. Quota capacity and durability class are conjunctive:

1. sufficient reserved quota for the write;
2. correct transaction commit;
3. truthful/required durability class for an irreversible side effect.

Do not treat one as proof of the others.

## Required deterministic regression matrix

### Global storage reservation / P1-043

1. Local file import reserves ~50 MiB; concurrent Yandex backup `text-download` attempts another ~50 MiB with only one operation worth of free space -> one is rejected/deferred **before** persistent materialization; both cannot pass stale snapshots.
2. PDF cache writer and Yandex backup download race the same free-space budget -> aggregate reservation remains within origin free bytes minus one shared safety reserve.
3. Two simultaneous Yandex `text-download` imports are admitted by offscreen memory count only when persistent quota reservation also permits both.
4. Known fresh remote backup size from P0-013 selection receipt is used for exact reservation; missing trustworthy size reserves bounded maximum rather than zero.
5. Worker response loss does not release a persistent-byte reservation while offscreen staging actual promise can still commit.
6. Offscreen staging abort/QuotaExceeded cleans partial group and releases only its own exact reservation after cleanup settlement.

### Capacity preservation

7. 100 local pending downloads -> 101st checkpoint is rejected before new download start; none of the first 100 is evicted to admit it.
8. 20 active remote-save checkpoints -> new distinct remote save is rejected/deferred; stale-unverified archive does not consume the active 20-slot budget.
9. Pending Journal append queue full -> existing rows remain intact; new checkpoint fails explicitly.
10. Prepared Save As index at 64 -> new PREPARED session fails; active sessions are not silently reclaimed.

### TTL/dead-letter ownership

11. Local DownloadItem outcome remains unknown after 24h -> P0-039 compact unresolved evidence survives; time alone does not erase identity.
12. Remote stale-unverified row exceeds archive time/count -> P1-184 compact evidence/explicit eviction state survives instead of false negative settlement.
13. Live import confirmation crosses 2h -> P1-035 owner lease keeps payload valid or UI explicitly expires; low-storage preflight cannot silently delete behind enabled Proceed.
14. In-flight PDF generation/remote attempt crosses cache TTL -> P0-079 owner generation prevents body deletion until physical owner releases.
15. Active long Save As/operation cannot have its only OperationLog history removed solely because retention timestamp elapsed; P1-197 owner/epoch policy dominates diagnostics cleanup.

### Durability

16. `persisted=false` + successful checkpoint commit -> P1-194 UI/log remains best-effort, not `recoveryGuaranteed` solely from commit.
17. Global quota reservation success does not override P1-194 durability-class requirement.

## Duplicate check / numbering

No new P-number is assigned.

- Fresh implementation coverage refinement: **P1-043** must include Yandex/offscreen `text-download` persistent staging.
- Existing TTL/evidence owners remain **P0-039**, **P1-035**, **P0-079**, **P1-184**, **P1-197/P1-205**.
- Offscreen memory reservation remains **P1-054/P0-065** territory.
- Durability class remains **P1-194**.
- Prepared Save As orphan/cap pressure remains **P1-156/P1-169/P1-210**.

P1-211 remains unassigned by this block.

## Test / release state

No runtime/config/manifest changes were made. Product tests were not rerun. The last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.
