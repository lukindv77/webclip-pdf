# Audit delta — staged Journal backup release after lease loss — 2026-08-28

## Scope

Docs-only audit of large Journal-backup staging ownership between snapshot creation and signed-upload admission. No new P-number.

Refines temporary-staging lifecycle/resource ownership (P1-035 family) and composes with the bounded resource principles behind **P0-063**. The issue occurs **before** offscreen signed-transfer admission, so it is not a failure of P0-063's active-transfer reservation itself.

## Finding

`exportJournalBackupToYandex()` currently has this order for a new backup:

1. acquire backup lease;
2. `stageFullJournalExport()` creates a chunked transfer payload, up to the configured full Journal export limits;
3. `renewJournalBackupLease(lease)`;
4. only after renewal succeeds call `uploadJournalExportStagedToYandex(staged, ...)`.

`uploadJournalExportStagedToYandex()` owns cleanup of `staged.stagingKey` in its signed-transfer `finally` block.

If step 3 rejects because the lease was lost/expired/replaced, step 4 is never called. The large staged payload has already been committed, but no local `finally` in `exportJournalBackupToYandex()` deletes it. It remains until generic transfer TTL/maintenance cleanup.

### Deterministic schedule

1. Backup A acquires lease LA.
2. A spends long enough staging a large Journal snapshot that LA expires or a later valid owner B replaces it under the lease protocol.
3. A completes `stageFullJournalExport()` and now owns staged group S, potentially tens of MiB.
4. `renewJournalBackupLease(LA)` correctly detects that LA is no longer current and throws `JOURNAL_BACKUP_LEASE_LOST`.
5. A never enters `uploadJournalExportStagedToYandex()`, so that helper's cleanup `finally` is unreachable for S.
6. S remains in `WebClipOffscreenTransfers` until the generic 2-hour orphan cleanup/pressure path.
7. Repeated lost-lease attempts can retain multiple large dead staging groups even though each operation has already received authoritative proof that it will not consume its own S.

The generic TTL is a valuable crash fallback, but after a **proven local ownership loss** there is no uncertainty that justifies retaining the body for this operation.

## Required lifecycle rule

Large temporary payload ownership must be explicit from creation to transfer/recovery handoff.

After `stageFullJournalExport()` returns S:

- the calling backup attempt owns S until exact handoff to a signed-transfer/recovery receipt;
- every exit path before that handoff must compare-and-delete S when the operation is proven unable to consume it;
- unknown outcomes that may still have an external consumer must retain evidence according to the signed-transfer/recovery contract;
- proven lease loss before offscreen admission is a safe immediate-release case;
- generic TTL remains only an orphan/crash safety net, not the normal cleanup mechanism for a synchronously rejected owner.

A straightforward implementation shape is an outer `staged` variable plus a `handedOff/consumed` receipt and `finally` cleanup for any pre-handoff failure. The exact design may differ, but cleanup must be generation-exact so attempt A cannot delete staging B.

## Resource-accounting composition

P0-063 limits **active offscreen signed-transfer** reservations. S in this failure schedule never reaches that admission layer, so it consumes IndexedDB storage outside active-transfer accounting.

The broader storage budget therefore also needs to count/limit committed staging generations awaiting handoff, not only currently active offscreen transfers. Existing storage preflight is useful, but it does not replace prompt release of dead generations.

## Acceptance cases

1. Stage S -> lease renewal succeeds -> exact handoff occurs and ordinary upload helper owns S cleanup.
2. Stage S -> lease renewal proves lease lost -> S is deleted promptly; no two-hour wait.
3. Stage S -> worker dies before renewal -> S may remain as orphan and generic bounded TTL/maintenance eventually cleans it.
4. Stage S -> renewal result is unknown rather than proven lost -> cleanup policy does not erase data that a valid continuation may still own until exact reconciliation decides.
5. New backup B has staging T while late cleanup A runs -> compare-and-delete A cannot touch T.
6. Repeated lease-loss attempts cannot accumulate one full staging payload each beyond the intended global temporary-storage budget.
7. Failure before staging completed leaves partial S group cleanup under the existing `stageFullJournalExportOnce()` failure path.
8. Once signed transfer is admitted, its payload/evidence lifetime is governed by the existing signed-transfer attempt/recovery contract, not this pre-handoff cleanup rule.

## Classification

No new blocker. This refines temporary staging ownership/cleanup (**P1-035 family**) and composes with **P0-063** bounded resource admission. It does not reopen P0-063's actual offscreen reservation mechanics.

## Validation note

Documentation only. Runtime/tests/manifest unchanged. Product tests were not rerun; historical 88/88 JS syntax + 74/74 deterministic PASS remains prior evidence. No build/tag/release.