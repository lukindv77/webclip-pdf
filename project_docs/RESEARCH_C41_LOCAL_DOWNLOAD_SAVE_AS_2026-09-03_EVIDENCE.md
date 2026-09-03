# C41 compact evidence — Local download settlement / native Save As — 2026-09-03

Canonical source baseline: `6960fab35f914b1e1e3ffe1bafa3d1f8d7ca144e`  
Exact runtime blobs: `service-worker.js=cffe46adbd0227bae51c95462d6d705b264838fe`, `offscreen.js=a5f84b928e530222c50c704b80ab30418349f68e`, `prepared-save-as.js=f33efc5e5340f615fd183dcd37f096f541b1f282`, `local-download-identity.js=0f6a5c39a72aee248e52137d68b896e47b40f8ca`.

## Classification

**`L4-REVALIDATED / PARTIAL/FINDING + POSITIVE/REAL-AUTOMATIC-DOWNLOAD/EXACT-ID/LATE-SETTLEMENT/PREPARED-STARTED-RELEASE/PAGE-OWNER CONTROLS; NATIVE-L5 OPEN (P1-146, P1-156; P1-064 supporting, P0-039/P0-048 positive)`**.

C41 remains OPEN for real native chooser and restart evidence. No new P-code and no Registry wording/status change.

## Accepted execution

- Chrome `152.0.7977.64`;
- workflow run `33715164705`, job `100522698189`;
- exact accepted head `577322daad134340d21a16a7938ff24c95c16174`, SUCCESS;
- temporary receipt commit `b7932fe279d74903fad02bd6b0bfee43bffa0e03`;
- result SHA-256 `97f930df52c66a40bf7832d9d09b6347bc80af9f24d7db948287e4a6c4f0190a`;
- harness `project_tools/research_c41_local_download_saveas.py`.

## Fresh matrix

- Real unpacked Chrome automatic path: one 29,827-byte physical PDF plus a Journal entry — PASS.
- P1-146 durable intent / one-call / late-settlement control — PASS.
- P0-048 exact Blob/DownloadItem identity — PASS.
- P0-039 unknown/manual-resolution retention — PASS.
- PREPARED/STARTED/RELEASE ordering and page-owned single Save As call — PASS.
- Browser Save As control used a mocked Downloads API; no native chooser or physical Save As file was claimed.

## Remaining findings

1. common offscreen Blob TTL can revoke PREPARED bytes after 16 minutes before the native dialog settles;
2. page loss after `downloads.download()` returns but before STARTED reaches the worker can orphan an exact numeric id;
3. the worker arms an ephemeral watcher before durably committing STARTED;
4. STARTED does not compare stored PREPARED `blobUrl`, `ownerPage` and `operationId` with the transition;
5. worker startup does not reconstruct watchers from durable indexed STARTED records and exact `downloads.search({id})`;
6. Journal export STARTED is recorded as terminal OperationLog success before DownloadItem `complete`.

Chrome documents numeric start id separately from later `complete`/`interrupted` state: https://developer.chrome.com/docs/extensions/reference/api/downloads. `storage.session` supports service workers but clears on extension reload/update/disable and browser restart: https://developer.chrome.com/docs/extensions/reference/api/storage.

## Owner reconciliation

**P1-146 ACTIVE** owns automatic unknown/restart settlement; **P1-156 ACTIVE** owns the native Save As lifecycle and exact DownloadItem recovery; **P1-064 ACTIVE** is supporting recovery fairness. **P0-039/P0-048 remain DONE** positive controls.

## Open exit task

Run a real interactive unpacked-Chrome matrix for automatic response loss and native Save As success/cancel/unresolved dialog, owner-page and worker restart, exact-id terminal reconciliation, retry and truthful Journal/OperationLog outcome. Prove at most one DownloadItem per durable intent. Keep browser restart separate from worker restart.

Detailed evidence: `RESEARCH_FULL_RESTART_C41_LOCAL_DOWNLOAD_SAVE_AS_2026-09-03.md`.
