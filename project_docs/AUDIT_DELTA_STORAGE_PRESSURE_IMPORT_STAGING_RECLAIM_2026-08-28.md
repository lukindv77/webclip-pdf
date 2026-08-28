# Audit delta — storage-pressure reclaim of expired normalized import staging — 2026-08-28

Source-of-truth `main` immediately before this write: `a622b155f3cedad16e95e8d8a96dd60c94609435`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines existing **P1-043** global large-storage admission/quota handling and **P1-035** temporary Journal import-staging lifecycle.

The current low-quota preflight correctly refuses to delete Journal source-of-truth/checkpoints automatically. Preserve that rule.

The gap is narrower: quota-pressure cleanup omits one class that the same product already considers disposable once expired — normalized Journal import staging.

## Current `ensureStorageBudget()` reclaim set

When `navigator.storage.estimate()` reports insufficient free space, `ensureStorageBudget()` attempts reclaim before failing the new operation.

Current reclaim includes:

- `cleanupTransferPayloads()`;
- `cleanupExpiredPdfCache()`;
- old OperationLog cleanup according to retention settings.

It then re-runs the storage estimate and, if still short, returns `WEBCLIP_STORAGE_QUOTA_LOW` saying temporary data was already cleaned.

It does **not** call `cleanupExpiredJournalImportStaging()`.

## The omitted staging store is already explicitly temporary/disposable after TTL

`JOURNAL_IMPORT_STAGING_STORE` contains normalized entries created during the destructive import pipeline.

The project already defines:

`JOURNAL_IMPORT_STAGING_TTL_MS = 2h`

and hourly/background maintenance includes:

`cleanupExpiredJournalImportStaging()`.

Thus this is not a proposal to delete live Journal content or unknown remote recovery evidence. The codebase already classifies expired normalized import staging as reclaimable temporary state.

## Deterministic low-quota schedule

1. Import normalization generation A creates a large `importStaging` set.
2. Its page/operation disappears or cleanup of that exact staging generation is missed because of a crash window.
3. A ages beyond the existing 2-hour orphan TTL.
4. Hourly maintenance has not yet run, or its staging-cleanup stage previously failed.
5. User starts another large PDF/import/export operation B.
6. `ensureStorageBudget(B)` observes low free space.
7. It cleans expired transfer/PDF/log data but not expired importStaging A.
8. Re-estimate still fails because A occupies the recoverable space.
9. B is rejected as storage-low even though WebClip already has a safe, product-defined expired staging class that could have been reclaimed synchronously.
10. A later hourly maintenance may delete A, after which the same B succeeds without any real user-storage change.

This is bounded availability/cleanup truthfulness, not Journal corruption.

## Composition with P1-035 active-owner semantics

Do **not** fix this by deleting every normalized import stage under pressure.

P1-035 already requires a distinction between:

- live/actively owned staging;
- expired/orphan staging.

The storage-pressure path may reclaim only a generation that is safe under the final P1-035 lifecycle policy.

If the product chooses owner leases, pressure cleanup must respect a fresh live lease.
If the product chooses explicit confirmation expiry, pressure cleanup may delete only after that expiry has invalidated Proceed.

The same exact-generation compare/delete rules apply; pressure must not race a newer staging generation or active destructive import.

## Composition with P1-043 quota reservation

This cleanup refinement does not close P1-043 itself.

Even after reclaiming every safely expired temporary object, the current preflight remains snapshot-only and multiple large writers can reserve the same apparent free bytes concurrently.

Required architecture remains:

1. reclaim only safe disposable data;
2. obtain/update global storage reservation for the new writer;
3. materialize/commit under that reservation;
4. release reservation only after actual commit/abort/owned cleanup;
5. `QuotaExceededError` remains a second fail-safe.

Expired-staging cleanup improves reclaim completeness but is not a substitute for reservation.

## User-facing error truthfulness

Current low-quota error says temporary data has already been cleaned.

That claim should only be made after every **currently safe and intended** temporary-reclaim class has been attempted, including expired import staging once P1-035 ownership is known.

If a large temporary object is intentionally retained because it has an active/unknown owner, report storage pressure truthfully rather than implying all temporary data was disposable and removed.

## Required regressions

1. Expired orphan normalized import staging consumes enough quota to block B -> pressure preflight reclaims exact expired A and B can proceed if budget then suffices.
2. Active confirmation/staging under P1-035 is never removed merely because free space is low.
3. Newer staging generation sharing related source metadata is not removed by cleanup of old generation A.
4. Cleanup failure remains bounded and B either proceeds from remaining budget or returns truthful quota-low.
5. Journal entries, pending local/remote recovery checkpoints and unknown-side-effect receipts are never deleted for admission.
6. Expired transfer/PDF/log cleanup behavior remains intact.
7. P1-043 two-concurrent-large-writer test still fails closed/reserves correctly; reclaim does not hide reservation race.
8. Pressure cleanup followed by hourly maintenance is idempotent.
9. Error text does not claim all temporary data was cleaned when live/unknown retained staging is intentionally protected.
10. Crash after staging becomes expired but before ordinary hourly cleanup is enough for the next large preflight to reclaim it safely.

## Duplicate check / numbering

No new P-number is created.

- **P1-043** remains global quota reservation/admission and low-space preflight owner.
- **P1-035** remains import staging live-owner vs orphan/expiry lifecycle.
- **P1-194** remains IndexedDB eviction/durability class; reclaiming expired staging does not prove persistent-storage safety.
- **P1-211** remains deleted-comment tombstone lifecycle and is unrelated.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains prior evidence only: **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.
