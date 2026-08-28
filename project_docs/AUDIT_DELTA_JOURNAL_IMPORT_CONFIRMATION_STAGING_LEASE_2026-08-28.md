# Audit delta — Journal import confirmation must lease staged backup bytes — 2026-08-28

Docs-only audit checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

**New P1-215** — a staged Journal backup that has been previewed and is currently presented in an active destructive confirmation must not be reclaimed solely by generic temporary-payload age without an owner/lease policy.

This is a user-owned waiting/lifetime issue adjacent to P1-156 Save As lifecycle, but it is a separate staging subsystem and confirmation contract.

## Source proof

Worker transfer payloads use:

`TRANSFER_PAYLOAD_TTL_MS = 2 * 60 * 60 * 1000`.

`cleanupTransferPayloads()` scans all transfer-store rows and deletes a row when:

```js
Number(cursor.value?.createdAt || 0) < Date.now() - TRANSFER_PAYLOAD_TTL_MS
```

There is no exclusion for an active Journal import preview/confirmation owner.

File import flow in `journal.js`:

1. stages the selected file into `WebClipOffscreenTransfers`;
2. sends `WEBCLIP_JOURNAL_IMPORT_PREVIEW_STAGED`;
3. displays a destructive confirmation containing validated `entryCount/exportedAt`;
4. awaits user decision without an explicit confirmation deadline;
5. on confirm sends `WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED` with the same staging key.

Yandex restore has the same shape after `WEBCLIP_JOURNAL_YANDEX_FETCH_BACKUP`: downloaded bytes are staged, inspected and then held while the user confirmation remains open.

Neither flow renews/pins the payload while the prompt owns it.

## Deterministic failure

1. User stages a valid backup and sees its preview/confirmation.
2. The Journal page remains open while the user waits more than two hours.
3. Hourly maintenance runs, or another large-storage preflight invokes transfer cleanup.
4. Backup manifest/chunks have original `createdAt` older than cutoff and are deleted.
5. Confirmation UI still shows the previously validated exact backup metadata.
6. User clicks Confirm.
7. Replace cannot read/normalize the staged bytes and fails.

No external corruption or browser restart is required.

## Why this is not a safety corruption

The current behavior generally fails rather than importing arbitrary other bytes. That is good.

The defect is lifecycle truthfulness/usability:

- UI continues to offer a destructive confirmation for an artifact that generic cleanup is allowed to destroy behind it;
- the user has no visible two-hour deadline;
- preview success is therefore not a stable “ready to confirm” state.

## Required contract

Choose an explicit owner-lifetime model.

### Active confirmation lease

When preview succeeds and the confirmation is displayed:

- acquire a bounded staging lease tied to exact `stagingKey` + owner page/session + import generation;
- cleanup skips/reclaims only after lease expiry/owner disappearance according to policy;
- explicit cancel/success releases it immediately;
- pagehide/crash cleanup eventually makes it reclaimable;
- lease itself has a bounded stale-owner policy so abandoned prompts do not leak 50 MiB forever.

### Or explicit user-visible expiry

If product intentionally wants a hard time limit:

- show it in the confirmation state;
- expire/close the prompt before bytes are reclaimed;
- require re-preview/revalidation rather than leaving a stale actionable Confirm button.

Silent generic TTL while UI remains actionable is the invalid state.

## Chunk-group ownership

Lease/release applies to the entire manifest/chunk group atomically at the logical level. Cleanup must not leave a partially retained active backup where some chunks were old/deleted and others appear live.

Quota pressure may still refuse unrelated new large operations, but it must not misclassify actively leased import bytes as abandoned disposable space.

## Regression cases

1. Active file-import confirmation crosses generic 2h cutoff -> either payload remains leased or UI explicitly expires before cleanup.
2. Active Yandex-restore confirmation has identical semantics.
3. Cancel -> exact payload group becomes immediately reclaimable/deleted.
4. Successful replace -> payload group released/deleted.
5. Journal page closes/crashes -> stale owner lease is reclaimed under bounded policy.
6. Two Journal tabs stage different imports -> leases remain generation/key specific.
7. Cleanup cannot delete half of an actively leased chunk group.
8. Quota pressure does not silently invalidate an active confirmation.
9. A stale/reloaded page cannot renew or consume another page generation's lease without exact receipt.
10. Preview data and eventual replace bytes remain the same exact staging generation.

## Numbering result

**P1-215 is assigned to this staging-confirmation lifetime root cause.**

P1-156 remains native Save As ownership/lifetime; P1-215 is specifically Journal import/restore staged bytes while waiting on destructive user confirmation.

## Validation note

Documentation only. Product tests were not rerun; historical 88/88 JavaScript syntax + 74/74 deterministic PASS remains prior evidence only. No build, tag or Release was created.