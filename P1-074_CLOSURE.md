# P1-074 closure — Journal import staging IDB deadlines

Status: **REGRESSION** (history-reserved physical closure).

## Problem
A hung IndexedDB open/transaction while staging a large Journal import could otherwise leave the extension page in indefinite progress, retain temporary chunks, or block a safe retry. The history code was already reserved as P1-074 and must not receive a new P number.

## Physical audit
Current WIP already contains the required runtime safeguards; no duplicate implementation was added:
- `journal.html`/`journal.js` staging DB open deadline: 10 s; late `indexedDB.open` success closes the DB.
- File chunk/manifest write transaction deadline: 60 s with `tx.abort()`.
- Service-worker `getTransferImportRecord()` staged read: max 20 s, abortable, `JOURNAL_IMPORT_STAGING_TIMEOUT`.
- Temporary group delete: max 20 s, abortable.
- Normalized `WebClipJournal.importStaging` batch write/delete transactions: 30 s and abortable.
- Blob chunk `arrayBuffer()` is bounded by remaining global parse deadline.
- Atomic Journal replace is not started after staging failure; its own transaction remains atomic/abortable.

## Evidence
`project_tools/test_p1_074_import_staging_deadlines.js` actively simulates hung IDB open/write/read/delete and verifies timeout/abort/late-close behavior. Full deterministic gate is 54/54 PASS; P1-009 Journal Chromium regression and managed P1-007 integration PASS. Manifest remains `0.9.8` / MV3.
