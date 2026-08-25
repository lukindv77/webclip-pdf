# P1-146 closure — automatic Blob download start late-settlement reconciliation

Status: **REGRESSION**.

Manifest remains **0.9.8 / Manifest V3**.

## Finding

The two automatic local-PDF paths (`generatePdfAndDownload()` and `downloadCachedPdf()`) awaited `chrome.downloads.download()` directly after persisting a durable `pendingDownloads` intent. The Chrome call is a non-cancellable side effect and had no caller deadline.

This created two coupled hazards:

- a never-settling Chrome promise could leave the content UI in `printing` indefinitely;
- a naive `Promise.race()` timeout would be unsafe because the old `catch` path removed the durable intent/revoked the Blob URL. If Chrome later returned success, the DownloadItem could exist without the checkpoint that identifies it, and a user/automatic retry could create a duplicate.

## Closure

Automatic `saveAs:false` PDF downloads now use `startAutomaticBlobDownloadBounded()`:

- a 15-second caller deadline is separated from the underlying Chrome promise settlement;
- timeout returns explicit `downloadStartPending` instead of throwing/retrying;
- the durable intent and Blob URL remain alive while the underlying start is unresolved;
- late success binds the original intent to the returned `downloadId`, installs the normal Blob lifecycle watchdog and opportunistically checks terminal state;
- late rejection removes the durable intent and revokes the Blob only after the actual rejection;
- at most four actually unresolved automatic download starts are admitted per service-worker lifetime; a fifth request fails before starting another Chrome side effect;
- OperationLog records late success/failure after the caller has already observed the local timeout;
- content UI says that Chrome is still confirming the download and explicitly does not present the result as an already downloaded PDF.

Native `saveAs:true` OperationLog/Journal export call-sites are deliberately not changed here; their page-ownership work remains history-reserved P1-079/P1-080.

## Regression protection

`project_tools/test_p1_146_download_start_settlement.js` verifies:

- timeout preserves intent/Blob and performs no automatic retry;
- late success binds exactly the original intent and starts Blob lifecycle tracking;
- late rejection cleans intent/Blob only after real settlement and writes an OperationLog error;
- unresolved-start global budget blocks a new Chrome side effect before it begins;
- both automatic PDF paths route through the settlement-aware helper and expose `downloadStartPending` to the content UI.

## Release boundary

This is deterministic/local audit closure only. It does not replace the real unpacked Chrome/Yandex release QA required before manifest `0.9.9`.
