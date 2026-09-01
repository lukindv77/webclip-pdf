# Durable research evidence — print rollback / retry handoff closure — 2026-08-30

This file continues `RESEARCH_PRINT_ROLLBACK_RETRY_CONVERGENCE_2026-08-30_EVIDENCE.md` Blocks 1–32 and closes the tranche at **40 blocks**.

Exact runtime baseline remains `main = e01c20785df5c934caa045458647c363f1df857b`. No runtime source, manifest, version, build, tag or release artifact is changed. Cybersecurity questions are outside this tranche.

## Blocks 33–40 — UI/retry handoff must not outrun cleanup settlement

### Block 33 — Download error exposes Retry immediately after a non-awaited cleanup launch — P1-199/P1-214

`downloadPdf()` catches preparation/worker failure, calls synchronous `restoreAfterPrint()`, then immediately changes the page to `review` and renders a live `Повторить` button whose handler calls `downloadPdf(...)` again.

`restoreAfterPrint()` does not await remote cleanup; it launches `restoreRemoteFramesAfterPrint()` fire-and-forget. A fast user retry can therefore enter a new `prepareForPrint()` while the previous remote restore is still unsettled.

This is a concrete user-facing route into the old-restore/new-prepare schedule from Blocks 9–14, not merely a theoretical internal reentrancy.

### Block 34 — new Download retry's initial explicit await does not repair the race — P1-199

The new `prepareForPrint()` again calls `restoreAfterPrint()` and then `await restoreRemoteFramesAfterPrint()`.

If the preceding cleanup already consumed `remotePrintPrepared`, both fresh calls can observe an empty set while the old RPC remains in flight. Therefore “retry calls prepare from the beginning” is not a clean-baseline guarantee.

### Block 35 — Yandex non-cached failure exposes the same reprepare path — P1-199/P1-214

`sendPdfToYandex()` catch calls `restoreAfterPrint()`, ends page-upload progress, then `showYandexSendError(...)`.

When no reusable PDF cache exists, the error UI exposes `Сформировать и отправить заново`, which calls `sendPdfToYandex(...)` again. As with Download, the new preparation can begin before old remote cleanup settles.

The fix belongs in shared preparation-generation convergence, not in destination-specific button throttling.

### Block 36 — cache-stage progress is used as a page-restore trigger, not a settlement barrier — P1-214

`updatePageUploadProgress()` calls `restoreAfterPrint()` when `message.stage === 'cache'` because PDF bytes are already formed and the page should return to normal while upload continues.

That is a reasonable UX goal, but the current call means “cleanup requested”, not “page/children are proven restored”. Network/upload progress can advance while remote rollback remains unknown.

A corrected implementation may still restore the page before upload completion; it should retain exact cleanup receipts until settlement rather than coupling page convergence to a progress label.

### Block 37 — repeated cleanup calls are not idempotence proof when ownership was already discarded — P1-214

The same operation can invoke `restoreAfterPrint()` from cache-stage progress and again on final success/catch/close paths. Repeating a best-effort function does not improve convergence if its first invocation already cleared the authoritative remote receipt set.

Idempotence requires persistent generation-aware receipts and repeat-safe child operations, not repeated calls after bookkeeping loss.

### Block 38 — successful Download can expose terminal UI before remote page cleanup is settled — P1-214

After worker PDF success, `downloadPdf()` calls `restoreAfterPrint()` and immediately displays download-pending or success UI.

The physical file outcome and page cleanup outcome are separate. It is valid to report that the PDF/download is already admitted, but a new live-page preparation action must not treat terminal file status as proof that all temporary frame/page mutations are gone.

Acceptance should preserve both truths independently: **file operation settled/pending** and **preparation cleanup settled/superseded/unresolved**.

### Block 39 — cached Yandex retry should not inherit unresolved live-page cleanup authority — P1-214/P0-070

`retryCachedPdfToYandex()` intentionally reuses previously formed PDF bytes and does not run page preparation again. This is a positive architectural separation: a network retry should not need the current page representation.

However any still-unresolved cleanup receipt from the original live preparation must remain independently reconcilable. Starting a cache-only retry must not erase or reclassify that page-cleanup receipt merely because no new PDF is generated.

### Block 40 — final retry/convergence contract and status decision

A complete implementation should separate three state machines that currently partially overlap:

1. **PDF/file operation state** — PDF bytes/download/upload/cache/recovery receipts;
2. **live preparation generation** — top/remote temporary mutations and exact cleanup ownership;
3. **UI retry availability** — whether the next action needs a clean live page or can consume immutable cached bytes only.

Required rules:

- a new operation that will call `prepareForPrint()` waits for previous cleanup settlement **or** uses generation-safe mutations where old cleanup cannot affect the new generation;
- a cache-only upload/download retry may proceed from immutable PDF ownership without waiting for unrelated page cleanup, but must not discard that cleanup receipt;
- UI may truthfully report successful PDF/download/upload independently from page cleanup status;
- repeated `restoreAfterPrint()` calls are idempotent only when they operate on retained exact receipts;
- cleanup failures/superseded host changes are bounded reconciliation states, not reasons to silently resurrect historical page state;
- P0-080 application-generation revalidation still governs reusing old user options on a changed page; this tranche does not duplicate that owner;
- real unpacked Chrome remains required for release regression across actual frame IPC and browser print lifecycle.

## Final owner/status decision

No new permanent P-code and no registry status transition.

The completed 40-block tranche materially refines existing owners:

`P1-214, P1-199, P1-003, P1-218, P1-219, P1-221, P0-067, P1-212, P1-171, P0-070`

`RESEARCH_REGISTRY.md` remains unchanged because each root is already explicitly ACTIVE and this tranche is convergence/acceptance evidence.