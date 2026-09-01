# Durable research evidence — SelectionSnapshot privacy portability / recovery surfaces — 2026-08-30

Canonical status and single-owner authority remain exclusively in `RESEARCH_REGISTRY.md`. This file is the second interruption-safe checkpoint of the fresh P1-182 revalidation tranche. It continues `RESEARCH_SELECTION_SNAPSHOT_PRIVACY_REVALIDATION_2026-08-30_EVIDENCE.md` Blocks 1–16 from the same exact source baseline `main = a899ae3d22c365010a663389dc07844b34c86f77`.

No runtime, manifest, version, build, tag or release change is made. No new P-code is allocated.

## Blocks 17–32 — durable portability / recovery propagation

### Block 17 — full Journal export serializes the complete durable entry — P1-182

`readJournalEntryBatch()` obtains each IndexedDB Journal record and serializes `JSON.stringify({ ...entry, journalComments: normalizeJournalComments(entry) })`.

There is no privacy-specific export projection for `selectionSnapshot`. If the durable entry contains plaintext locator context, the serialized entry contains it too.

This is stronger than “backup schema happens to support SelectionSnapshot”: the exporter deliberately spreads every current entry property into the portable JSON record.

### Block 18 — chunked export preserves the serialized entry bytes rather than re-sanitizing locator privacy — P1-182

`stageFullJournalExportOnce()` appends each serialized batch item verbatim into `journal.entries`, splits only for bounded transfer storage, and writes Blob chunks.

Chunking, UTF-8 byte limits and revision checks are transport/integrity controls; none transform parent/sibling text or raw locator URLs.

### Block 19 — local JSON export consumes the same staged full-Journal bytes — P1-182

The explicit local “Экспорт полного журнала в файл” path calls `stageFullJournalExport()`, creates a staged text Blob URL from that output and gives it to the native/file-download path.

Thus raw locator context can leave extension storage as a user-visible portable JSON file even when the selected PDF itself never contained the neighboring plaintext.

### Block 20 — Yandex Journal backup consumes the same staged full-Journal bytes — P1-182

`exportJournalBackupToYandex()` also calls the same `stageFullJournalExport()` before network upload.

There is no separate remote-backup privacy projection. The local export bytes and Yandex backup bytes share the same `selectionSnapshot` representation.

### Block 21 — offscreen Yandex transfer uploads the plaintext JSON chunks — P1-182

`uploadJournalExportStagedToYandex()` passes the staging key to `runOffscreenSignedTransfer({ mode:'text-chunks-upload', contentType:'application/json; charset=utf-8', ... })`.

The signed transport URL is separately protected, but the application payload is the previously staged Journal JSON. Therefore P1-182 exposure crosses from local durable metadata into a remote backup object by intentional backup behavior.

The problem is not that backups exist; it is that the backup contains unselected/sensitive locator plaintext beyond the selected archive content.

### Block 22 — import normalization preserves the same privacy-sensitive locator fields — P1-182

`normalizeImportedJournalEntry()` calls `sanitizeSelectionSnapshot(raw.selectionSnapshot || {}, { rejectOverflow:true })` and stores the returned snapshot.

Because the sanitizer truncates but does not privacy-transform the fields, an old backup containing `parentText`, sibling text or raw `href/src` imports those strings again.

### Block 23 — import staging creates another durable copy before destructive replace — P1-182 / P1-035 boundary

`writeJournalImportStageBatch()` writes `{ key, importId, entryId, entry: normalized, createdAt }` into `JOURNAL_IMPORT_STAGING_STORE`.

The staged `entry.selectionSnapshot` is already normalized but still plaintext. P1-035 governs safe staging lifetime; P1-182 governs minimizing what the staging record is allowed to contain.

### Block 24 — import commit reconstitutes the same snapshot into the new Journal — P1-182

`commitStagedJournalImport()` copies the normalized staged entry into the live Journal store. No privacy migration occurs between staging and commit.

A backup created by the current schema can therefore perpetuate the same sensitive locator context across browser restore/import cycles.

### Block 25 — deterministic source-shaped round trip preserves all tested secrets — P1-182

A model using the current worker field limits serialized one locator containing:

- `previousText = RECOVERY PHRASE: SEVEN-TULIP-SECRET`;
- `nextText = SSN-LIKE NEIGHBOR: 999-88-7777`;
- `href = /report?access_token=RAW_HREF_SECRET#private`.

After current-shaped sanitize → Journal-entry JSON serialization → parse → current-shaped sanitize, all three secret substrings remained present. The sample serialized entry was 570 JSON characters.

This is a deterministic source-model control, not a claim that arbitrary imported data bypasses size validation.

### Block 26 — local automatic-download recovery checkpoint retains SelectionSnapshot — P1-182

`checkpointPendingLocalDownloadIntent()` first calls `normalizePendingJournalAppendData(...)`, which sanitizes but retains `meta.selectionSnapshot`, then stores the resulting `prepared` object as `data` in `JOURNAL_PENDING_DOWNLOAD_STORE`.

A save whose Chrome download outcome is not yet reconciled can therefore retain the same locator plaintext in durable recovery state before any final Journal append.

### Block 27 — remote/Yandex save checkpoint retains SelectionSnapshot too — P1-182

The remote-save checkpoint constructs `prepared` Journal-append data and stores it as `data` in `JOURNAL_PENDING_REMOTE_STORE`. Its explicit size fallback may replace `selectionSnapshot` with empty lists if the entire checkpoint is too large, but ordinary in-budget snapshots remain intact.

The fallback is a capacity safeguard, not privacy minimization.

### Block 28 — `stale-unverified` remote checkpoints can extend that lifetime — P1-182 / recovery positive boundary

Remote-save failure handling can retain a checkpoint in `stale-unverified` state for later bounded cleanup/reconciliation. Because the stored `data` remains the prepared Journal metadata, privacy-sensitive locator context can outlive the immediate upload attempt.

This is intentional recovery durability. The P1-182 fix must minimize the snapshot before recovery persistence rather than deleting recovery evidence prematurely.

### Block 29 — PDF retry cache also copies sanitized SelectionSnapshot into cached metadata — P1-182

Current cache records used for PDF/Yandex retry include `meta.selectionSnapshot = sanitizeSelectionSnapshot(meta.selectionSnapshot)` alongside the cached PDF Blob and resource report.

The retry cache therefore creates another persistence class for the same locator data, with its own lifecycle distinct from the final Journal record.

### Block 30 — retry-cache TTL/explicit invalidation are useful positive controls

`PDF_CACHE_TTL_MS` is 24 hours and current source contains expired-cache cleanup plus explicit cache deletion/invalidation paths.

Preserve these lifecycle bounds. They reduce retention time but do not make plaintext locator context appropriate to store for the duration.

### Block 31 — full/scoped Journal clearing also prunes pending recovery stores — positive lifecycle control

`clearJournalEntries()` clears live Journal plus pending Journal/download/remote stores for full reset, and scoped clear walks the pending stores and deletes rows matching the target URL/site.

Therefore this tranche does **not** claim that every recovery copy becomes permanently orphaned after Journal deletion. The defect is data minimization while the legitimate record/checkpoint exists.

### Block 32 — export revision fencing and byte budgets are positive integrity controls, not privacy controls

`stageFullJournalExportOnce()` captures Journal revision before and after export and retries/fails if the Journal changed; batching, Blob chunk limits, total text/byte limits and transfer staging limits also bound work/size.

These controls should remain unchanged. A consistent bounded backup can still consistently contain plaintext that P1-182 says should never be durable.

## Stage 3 owner / duplicate decision

No new owner is justified.

- **P1-182 ACTIVE** remains the root owner for durable locator privacy across Journal, recovery, cache, local export, Yandex backup and import staging.
- **P0-066 ACTIVE** composes for actual URL-secret sanitization: raw locator `href/src` currently bypass the normalized durable-source-URL policy because `sanitizeSelectionSnapshot()` treats them as generic strings.
- **P1-035 / P0-039 / P1-146 / remote-save recovery owners** govern whether recovery evidence lives long enough and settles correctly; privacy repair must not weaken that durability.
- **P0-077 / Journal export/import envelope owners** govern round-trip completeness and size. Privacy migration must remain a self-restorable versioned format.
- **P1-001 ACTIVE** remains the restore-truth consumer: less reversible locator data cannot be compensated by accepting ambiguous matches.

## Required implementation direction before final acceptance

The architectural split should be explicit:

1. **Ephemeral matching inputs** may temporarily use bounded current-page text/URLs while resolving in-memory, but durable snapshots must use a privacy-minimized versioned feature schema.
2. Durable parent/previous/next context must be non-reversible or omitted; do not store surrounding plaintext merely for score bonuses.
3. Raw locator `href/src` must not retain userinfo, query, fragment or signed/session capability material. Prefer a privacy-preserving normalized feature/fingerprint adequate for matching, under P0-066.
4. The same durable schema must be used by Journal rows, pending local/remote saves, PDF retry cache metadata, full JSON export, Yandex backup and normalized import staging.
5. Existing size/count/depth/transaction/revision fences remain independent second boundaries.
6. Legacy backups/Journal rows need versioned compatibility. Import/Apply may read old plaintext long enough to migrate/resolve, but newly written/exported durable state must not perpetuate it.
7. Any fingerprint design must account for offline dictionary/correlation risk. A raw unsalted hash of common text is not automatically privacy-preserving merely because it is non-plaintext.
8. Portability and privacy must be reconciled deliberately: a device-secret keyed fingerprint would prevent cross-device restore unless the key/protocol itself has safe portable semantics.
9. Reduced locator entropy must lower confidence or become ambiguous under P1-001; it must never manufacture high confidence to preserve old success rates.
10. Imported `cssPath` remains separately constrained by P1-188; privacy migration must not fall back to arbitrary native CSS selector execution as a replacement signal.

## Required deterministic regression matrix

1. Select benign child adjacent to unique secret text; durable Journal row contains no secret substring from parent/previous/next context.
2. Raw selected link `href` with userinfo/query/fragment/token; no secret survives Journal, local export, Yandex-backup staged bytes or import staging.
3. Raw selected image `src` with signed/session query; same no-secret assertion.
4. Explicitly Exclude a secret block; excluded plaintext is absent from durable locator data except any separately user-authored Journal comment/title field with different product semantics.
5. Same-origin nested frame and cross-origin frame prefix cases do not reintroduce raw iframe URL secrets or surrounding top-page plaintext.
6. Pending local-download and remote-save checkpoints use the minimized schema and remain fully recoverable.
7. PDF retry cache uses the minimized schema and retry behavior is unchanged.
8. Full local JSON export contains no legacy plaintext locator fields for newly created/migrated rows.
9. Yandex Journal backup contains the same minimized portable representation and remains importable.
10. Legacy plaintext backup import either migrates to the new durable schema before commit/export or is explicitly versioned with a bounded compatibility path that does not perpetuate plaintext on the next backup.
11. Two candidates that become indistinguishable after privacy minimization fail ambiguous rather than choosing one with false high confidence.
12. Current count/byte/depth budgets and Journal revision fencing remain enforced.

## Checkpoint status

Blocks 1–32 of the privacy revalidation are now durable across two evidence commits/files. The next stage should concentrate on resolver-side privacy-preserving feature semantics, URL normalization boundary details, legacy migration and an exact final acceptance/dedup matrix before indexing/PR delivery.