# P1-086 / P1-087 closure

Status: **REGRESSION** / **REGRESSION**.

## P1-086 — readonly IDB completion boundary

- `journalRevisionSnapshot()` now uses `runIndexedDbTransactionBounded()`; request success only stages the revision and the helper resolves after `tx.oncomplete`.
- `readJournalEntryBatch()` no longer resolves from cursor `request.onsuccess` at end/limit/memory boundary. It stores `pendingResult`, stops advancing the cursor, and publishes only from `tx.oncomplete`.
- timeout/request error aborts the readonly transaction and cannot expose an uncompleted result; export revision timeout is normalized back to `JOURNAL_EXPORT_TIMEOUT` so P1-073 error semantics remain intact.
- P1-073 absolute export deadline remains intact: post-open transaction receives only `remaining()` time.

## P1-087 — extension-owned DownloadItem recovery

- Added fail-closed `isOwnExtensionDownload()` based on `DownloadItem.byExtensionId === chrome.runtime.id`.
- Intent reconciliation filters candidates by ownership **before** Blob URL or filename/exact-size fallback matching.
- Already-bound `downloadId` reconciliation also requires the same ownership check.
- Missing or foreign `byExtensionId` is not treated as a WebClip download, so a foreign download cannot finalize a WebClip durable checkpoint or create its Journal entry.

## Deterministic evidence

- `project_tools/test_p1_086_087_readonly_download_identity.js` exercises delayed `tx.oncomplete` and foreign-vs-own identical download candidates.
- Existing P1-073 and P1-082/P1-083 regressions are rerun to prove deadline and recovery-store behavior were not weakened.
- Manifest remains `0.9.8`; this closure is audit evidence, not Chrome/Yandex release QA.
