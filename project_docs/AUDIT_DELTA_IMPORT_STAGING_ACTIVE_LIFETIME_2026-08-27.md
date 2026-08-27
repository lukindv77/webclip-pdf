# Audit delta — active Journal import staging lifetime

Date: 2026-08-27
Source-of-truth `main` immediately before write: `184021aa00711711924ff1be2ff106d5cadbc54d`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged. Canonical registry synchronization is not claimed here.

## Existing P1-035 must be refined — TTL cleanup does not distinguish stale staging from a live confirmation owner

Canonical P1-035 correctly added hourly cleanup for temporary transfer/import staging with a 2-hour TTL. Fresh audit shows that the TTL currently means only wall-clock age: active file/Yandex import staging can be deleted while a visible Journal page still owns the import and is waiting for the user's 9-digit destructive confirmation.

### Fresh source proof

Constants:

- `TRANSFER_PAYLOAD_TTL_MS = 2 * 60 * 60 * 1000`;
- `JOURNAL_IMPORT_STAGING_TTL_MS = 2 * 60 * 60 * 1000`.

Hourly maintenance runs both `cleanupTransferPayloads()` and `cleanupExpiredJournalImportStaging()`.

`cleanupTransferPayloads()` scans the transfer store and deletes any record with:

`createdAt < Date.now() - TRANSFER_PAYLOAD_TTL_MS`.

It does not check an active owner/session/lease.

`cleanupExpiredJournalImportStaging()` similarly deletes records by `createdAt` index older than the import-staging cutoff, with no owner check.

### Local file flow

`journal.js::importJournalFromSelectedFile()`:

1. stages the selected `File` into transfer storage;
2. asks worker for `WEBCLIP_JOURNAL_IMPORT_PREVIEW_STAGED`;
3. opens `requestDangerousConfirmation()` and awaits the user;
4. only after confirmation sends `WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED` with the original `stagingKey`.

The confirmation dialog has no 2-hour expiry/disable path. The page therefore continues to represent the staged import as actionable even after background maintenance is allowed to delete the underlying transfer records.

### Yandex flow

The Yandex restore flow has the same ownership shape: worker downloads the selected backup into temporary staged transfer data, Journal displays preview/confirmation, and confirmed replace later reuses the staged key. A long-lived confirmation can therefore outlive the payload that the UI still claims it will import.

### Effect

This is not proven silent Journal corruption: if the source staging is gone, replace should fail before successful destructive commit and the old Journal remains authoritative.

The defect is lifecycle/UX correctness and repeatability:

- a visible live destructive confirmation can become impossible solely because hourly cleanup classified its payload as stale by age;
- local file import may require the user to reselect the original file because the page no longer retains a reusable file handle/path authority;
- Yandex restore may require a new remote list/download/selection cycle;
- the UI gives no indication that the actionable payload expired while the dialog was open.

### Classification / duplicate check

No new P-number is created.

This refines **P1-035**, whose root cause is lifecycle cleanup of temporary import/export transfer staging. The missing distinction is `expired by age` versus `actively owned by a live user operation`.

Related but separate:

- P1-030 owns bounded streaming import architecture and atomic replace.
- P1-074 owns bounded IDB transactions for file-page staging.
- P1-042 owns preview-before-normalization behavior.
- P1-156 owns native Save As lifetime, whose system dialog has a stronger no-artificial-timeout requirement. Ordinary Journal confirmation need not live forever, but it must not silently remain actionable after its payload is deleted.

### Required P1-035 refinement

Choose one explicit lifecycle contract and make UI/storage agree:

**Preferred owner-aware model:** active import staging receives a bounded owner/session lease while the Journal page is visibly awaiting confirmation. Maintenance skips records with a fresh live lease. Pagehide/crash/explicit cancel releases or lets the lease expire; orphan cleanup remains bounded.

**Acceptable explicit-expiry model:** if product intentionally limits confirmation lifetime, the dialog itself must expose/observe that deadline. On expiry it must disable Proceed, discard/cleanup consistently, and require a fresh stage/preview/reselect. It must never leave an enabled Proceed button pointing at already-disposable data.

In both models:

1. local file and Yandex staged import use the same lifecycle semantics;
2. lease/expiry identity is bound to exact `stagingKey` and owner page/session, not a global boolean;
3. maintenance does not extend abandoned staging indefinitely;
4. owner renewal cannot resurrect already deleted/expired staging without a fresh preview;
5. replace revalidates that the exact staged source/preview generation still exists before destructive transaction admission;
6. normal 2-hour orphan cleanup remains effective after owner loss;
7. storage-pressure cleanup must not silently delete an active payload while UI still offers confirmation; if forced cleanup is necessary, the owner must transition visibly to expired/re-stage-required.

### Required regressions

- Local file staging just below TTL + active confirmation + hourly maintenance: Proceed remains valid under lease model, or dialog explicitly expires under expiry model.
- Same flow after page owner disappears: staging becomes cleanup-eligible and is removed after bounded orphan lifetime.
- Yandex staged backup behaves identically.
- Cleanup racing with confirmation cannot produce a destructive partial replace; old Journal remains unchanged if staging validity is lost.
- Expired staging cannot be reused by a stale page after a newer import session has started.
- Refresh/reopen does not accidentally inherit another page's active staging lease.

## Positive control

The existing 2-hour TTL and hourly maintenance remain valuable for orphaned temporary data. The audit does not recommend removing bounded cleanup; it requires distinguishing live ownership from orphan age.

## Test / release state

No product tests were rerun for this docs-only checkpoint. No build/tag/release was created.
