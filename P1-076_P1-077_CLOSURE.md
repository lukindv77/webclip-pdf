# P1-076 / P1-077 closure — 2026-08-24

Status: **REGRESSION** (implementation + deterministic regression complete; real Chrome/Yandex release QA still required).

## P1-076 — bounded atomic backup lease

- Added `JOURNAL_BACKUP_LEASE_TX_TIMEOUT_MS = 20_000`.
- `acquireJournalBackupLease`, `renewJournalBackupLease`, and `releaseJournalBackupLease` now use `runIndexedDbTransactionBounded()` for their single readwrite transaction.
- Timeout aborts the transaction and rejects with `WEBCLIP_IDB_TIMEOUT`.
- Atomic busy detection remains `JOURNAL_BACKUP_BUSY`.
- Renew remains fail-closed on token mismatch with `JOURNAL_BACKUP_LEASE_LOST`.
- Release deletes only when the stored token matches the caller's token.
- Legacy storage lease cleanup is awaited with a bounded 10 s wrapper; IndexedDB `meta` remains the sole authority.

## P1-077 — alarm-owned heavy background backup

- Removed `runDueJournalBackup('enabled', false).catch(...)` from `saveJournalBackupSettings()`.
- Settings mutation now rebuilds the durable scheduler and returns status only.
- When due, scheduler creates a near-term one-shot backup alarm.
- The only production heavy-backup call-sites are periodic and retry branches of `chrome.alarms.onAlarm`.

## Deterministic regression

`project_tools/test_p1_076_077_backup_lease_alarm_boundary.js` verifies bounded lease transactions, retained token-ownership guards, hung transaction abort, no heavy backup call from settings, and the two allowed alarm call-sites.

Manifest intentionally remains `0.9.8`. This is not release QA.
