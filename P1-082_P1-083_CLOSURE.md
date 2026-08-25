# P1-082 / P1-083 closure — 2026-08-24

Status: **REGRESSION** (implementation + deterministic regression complete; real Chrome/Yandex release QA still required).

## P1-082 — durable recovery-store IndexedDB deadlines

- Added `RECOVERY_IDB_TX_TIMEOUT_MS = 20_000`.
- `pendingAppends`, `pendingRemoteSaves`, and `pendingDownloads` create/read/update/delete/list paths use `runIndexedDbTransactionBounded()`.
- Legacy `pendingAppends` IDB migration and the initial `pendingDownloads` reconciliation scan are bounded as well.
- Timeout aborts the transaction and rejects with `WEBCLIP_IDB_TIMEOUT`.
- Readonly results are returned only after `tx.oncomplete`.
- Journal append sourced from `pendingDownloads`/`pendingRemoteSaves` keeps source-checkpoint revalidation and entry write in the same bounded readwrite transaction.
- Destructive Journal clear keeps entries/meta and all three pending stores in one bounded transaction, preserving all-or-nothing semantics on timeout/abort.

## P1-083 — ordinary Journal CRUD/read/stats deadlines

- Added `JOURNAL_CRUD_IDB_TX_TIMEOUT_MS = 20_000`.
- Journal append/list/get/get-many/update/delete/clear now use the common bounded transaction helper.
- Point `urlStats` rebuild/update/read operations use the same Journal CRUD deadline.
- Full `urlStats` rebuild retains its 5-minute total budget and 20-second abort timer per clear/read/merge transaction.
- P1-032 Full Journal cursor scans in both service worker and `journal.js` retain `JOURNAL_VIEW_QUERY_DEADLINE_MS` and abort hung transactions.
- P1-073 export and staged import keep their own existing deadline domains; P1-083 does not reset or replace them.

## Deterministic regression

`project_tools/test_p1_082_083_journal_recovery_idb_deadlines.js` verifies the three recovery stores, atomic append/clear boundaries, ordinary Journal CRUD/stats deadline coverage, direct Full Journal read deadlines, hung-transaction abort, and readonly result publication only after transaction completion.

Manifest intentionally remains `0.9.8`. This is not release QA.
