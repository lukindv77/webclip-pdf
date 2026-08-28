# Audit delta — progress / diagnostic receipt and document generation — 2026-08-28

Source-of-truth `main` immediately before this write: `a768e672ea4a6307efc0703d516c4510aeb71c53`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Classification

Fresh audit of user-visible progress, post-print diagnostics and operation correlation refines existing:

- **P1-198** — worker-issued live operation identity/receipt;
- **P0-070** — exact source-document provenance across PDF generation;
- **P1-147** — truthful print diagnostics;
- **P1-210** — outer result loss and durable result reconciliation;
- **P1-175/P1-171** — exact page/frame document command targeting;
- **P0-079/P1-184/P0-039** — physical PDF/remote/download receipts after admission.

No separate P1-211 is required. Progress and diagnostics are not independent authorities; they must consume the same immutable operation/document receipts as the physical operation they describe.

## Positive control — current page progress has an operationId gate

`content.js` stores:

- `state.pageUploadActive`;
- `state.pageUploadOperationId`.

When `WEBCLIP_PAGE_UPLOAD_PROGRESS` arrives, it updates the visible modal only when:

`state.pageUploadActive && message.operationId === state.pageUploadOperationId`.

`updatePageUploadProgress()` repeats the same check.

This is materially better than accepting every progress notification for the tab. Within one living content document, two ordinary WebClip operations with different generated UUIDs do not normally repaint each other's progress UI.

This positive control should remain.

## Current operationId is still caller-issued, not authoritative

`content.js::makeOperationId()` generates UUID/random text in the renderer and `sendPdfToYandex()` / `retryCachedPdfToYandex()` store that text as `pageUploadOperationId` before sending it to the worker.

P1-198 already proves worker handlers accept caller-supplied textual operationId as authoritative for OperationLog and physical local-save keying.

Progress uses the same untrusted correlation string.

Therefore the current progress guard is collision-resistant for ordinary cooperative UI, but not an authority boundary.

A malicious/stale caller that deliberately reuses textual X can create two physical/logical operations that both satisfy the page's `operationId === X` correlation test.

P1-198's worker-issued receipt must therefore replace the progress correlation token too; fixing only OperationLog/checkpoint keys would leave page progress semantically weaker than the operation it represents.

## Worker progress delivery is tabId-only

`emitPageUploadProgress(tabId, operationId, ...)`:

1. records an OperationLog stage using operationId;
2. calls `chrome.tabs.sendMessage(tabId, {type:'WEBCLIP_PAGE_UPLOAD_PROGRESS', operationId, ...})`;
3. does not target exact `documentId`.

The physical Yandex operation may outlive/navigation-separate from the content document that initiated it.

A valid sequence is:

1. document A starts operation A/X;
2. worker continues upload after PDF cache admission;
3. tab navigates/reloads to document B;
4. worker emits later progress using the same tabId;
5. Chrome delivers the message to whatever matching content script is current in tab B.

A fresh B normally has `pageUploadActive=false`, so it ignores the message. This is a useful accidental safety property, but it is not exact provenance.

If B starts another operation using the same textual X — deliberate collision/reuse under P1-198 — old progress from A can satisfy B's current filter and mutate B's UI.

Even without collision, delivering old operation messages to replacement documents is unnecessary cross-generation traffic and complicates diagnostics/security reasoning.

## Required progress identity

Every page progress notification should bind to the same immutable receipt chain as the operation:

- worker-issued operation generation/nonce from P1-198;
- exact source top document receipt from P0-070/P1-175;
- physical PDF/transfer generation where the stage is about that object;
- operation type/kind.

Worker should target the exact source `documentId` where a content progress UI is still expected. If that document no longer exists, progress delivery can be dropped while durable OperationLog/reconciliation continues.

A replacement document must not become the new progress owner simply because it inherited the same tabId.

## Progress UI is optional; durable operation truth must survive page loss

Navigation/page close can legitimately destroy the source content UI while a remote transfer already admitted continues.

Therefore the progress channel cannot be the correctness owner.

Required separation:

- content progress is ephemeral best-effort visualization for the exact source document generation;
- OperationLog is diagnostics only and must use P1-197/P1-198 exact log identity;
- durable remote/local checkpoint is external side-effect reconciliation authority;
- P1-210 reconciliation surface lets the user later recover final status after the source UI disappeared/lost response.

No implementation should keep an old content document artificially alive merely to preserve progress.

## Outer result loss currently ends the page progress owner before the physical result is known

On Yandex send/retry error, content eventually calls `endPageUploadProgress()` and presents an error/retry surface.

If the error is an outer runtime response loss, P1-210 proves the worker/remote side effect may still settle.

After `endPageUploadProgress()`:

- `pageUploadActive=false`;
- the operation id is cleared;
- later progress messages are ignored.

This is correct insofar as ambiguous progress must not silently repaint a terminal error UI. But it leaves no automatic transition from `unknown` to the durable final result.

P1-210 must therefore provide a distinct reconciliation owner rather than trying to keep accepting late progress as proof of success.

A late stage notification is not an authoritative terminal receipt: it can itself be lost/reordered/stale.

## New retry generation should not inherit old progress

When the user explicitly retries cached Yandex upload, `retryCachedPdfToYandex()` creates a new textual operationId and starts a new page progress generation.

Ordinary distinct IDs already isolate A/B visually.

Final design should strengthen this to:

- new worker-issued operation receipt B;
- B may reference the same immutable PDF generation from P0-079 only when retry admission is valid;
- old A progress/result cannot equal/target B;
- P1-184 retains both physical transfer attempt receipts until A is classified before unsafe duplicate retry;
- the UI can show that B is a deliberate follow-up to A rather than pretending they are one operation solely because they share cached bytes.

## Post-print diagnostics has a bounded timeout but wrong document target

`collectPrintDiagnosticsForTab(tabId)` wraps its `tabs.sendMessage` in a 5-second `withOperationTimeout`, which is a positive P1-158/P1-157 lifetime control.

However the message is tabId-only:

`WEBCLIP_COLLECT_PRINT_DIAGNOSTICS`.

P0-070's prior provenance audit already proves:

1. PDF bytes A can already exist;
2. tab navigates to B;
3. diagnostics RPC goes to B;
4. B returns its current page diagnostics;
5. those diagnostics are logged against PDF A.

This is not fixed by the timeout. It is P1-147 truthful diagnostics + P0-070 exact document provenance.

Required: diagnostics target the exact admitted/printed documentId/generation or are explicitly recorded as unavailable/stale-document.

## Beforeprint/afterprint diagnostics also need generation association

Content keeps:

- `lastBeforePrintDiagnostics`;
- `lastAfterPrintDiagnostics`.

These are ordinary mutable fields in one content script instance and `WEBCLIP_COLLECT_PRINT_DIAGNOSTICS` returns them plus a fresh current snapshot.

Without an explicit print/PDF generation id, a later print attempt in the same document can replace these fields before an older worker request reads them.

Current debugger PDF generation is globally serialized, which reduces overlapping physical print, but content/UI preparation and delayed diagnostics retrieval still need explicit generation ownership if old/new operation lifecycles can overlap or a retry begins after ambiguous result.

This belongs to P1-147/P0-070/P1-198 rather than a new diagnostics item.

A robust diagnostics record should bind:

- source document receipt;
- print/PDF generation id;
- operation receipt;
- phase (`beforeprint`, `afterprint`, post-print query);
- capture timestamp/order.

Worker asks for the exact generation. Content never returns “latest diagnostics” as though they necessarily belong to the requested PDF.

## OperationLog stage correlation shares P1-198

`emitPageUploadProgress` records the stage through `recordOperationStage(operationId, ...)` before attempting page delivery.

Thus one textual collision affects both:

- visible progress filtering;
- OperationLog timeline/status provenance.

P1-198 already requires worker-issued operation identity and P1-197 adds history epoch. Progress should carry that exact same receipt; do not invent a second page-only UUID namespace that can drift from log/physical receipts.

## Progress delivery failure must not alter physical operation outcome

Current worker fire-and-forget page progress delivery is conceptually correct: a closed/navigated page must not cancel or fail an already admitted remote transfer merely because `tabs.sendMessage` rejects.

Preserve that separation.

The fix is exact targeting and truthful UI/reconciliation, not making the remote save depend on a live progress subscriber.

## Recommended unified receipt chain

Conceptually:

`sourceDocumentReceipt -> workerOperationReceipt -> pdfGeneration -> transferAttempt -> remoteObjectReceipt`

Progress/diagnostics refer to links in this chain:

- preparation progress: sourceDocument + operation;
- PDF/print diagnostics: sourceDocument + operation + pdfGeneration;
- network upload progress: operation + pdfGeneration + transferAttempt;
- terminal remote result: remoteSave/transfer attempt + exact remote object proof;
- Journal finalization: all relevant receipts + Journal generation CAS.

The page does not get to replace this chain with `{tabId, textualOperationId}`.

## Required deterministic regressions

1. A upload in document A navigates to B: late A progress is not delivered to B as current progress; durable A operation continues independently.
2. B starts ordinary new operation with different receipt: late A progress never updates B.
3. Deliberately force caller textual operationId collision X for A/B: worker-issued receipts remain distinct and old A progress cannot pass B filter.
4. Same collision cannot merge OperationLog timelines/status.
5. Outer response loss ends page progress A -> A later completes remotely: late progress is not treated as terminal authority; P1-210 reconciliation shows final result from durable receipt.
6. Unknown A then explicit retry B: B gets a new operation/transfer receipt; A and B progress/results remain distinct even when the same PDF generation is deliberately reused.
7. Navigate after PDF A but before diagnostics request: replacement B diagnostics are never attached to A.
8. Same-URL reload A->B also fails exact document diagnostics/progress targeting.
9. Two sequential print attempts in one document: diagnostics stored/returned for generation GA cannot be overwritten/adopted as GB and vice versa.
10. Source document closes during upload: remote operation remains recoverable; absence of progress subscriber does not fail transfer.
11. `tabs.sendMessage` progress rejection never deletes physical checkpoint/remote receipt.
12. OperationLog clear/history epoch does not invalidate physical operation receipt; post-clear UI can still reconcile through the subsystem receipt even if diagnostics history is gone.
13. Imported/caller-forged operationId cannot become a live progress receipt.
14. Progress details remain sanitized/bounded and never include signed transfer URLs/tokens.
15. Real unpacked Chrome navigation/reload during active upload confirms exact `documentId` targeting/drop behavior.

## Duplicate check / numbering

No new P-number is assigned.

- **P1-198** owns authoritative operation receipt/collision isolation.
- **P0-070** owns exact source document/PDF provenance.
- **P1-147** owns truthful generation-bound print diagnostics.
- **P1-210** owns user-visible unknown-result reconciliation after channel loss.
- **P1-175/P1-171** provide exact page/frame targeting.
- **P0-079/P1-184/P0-039** remain physical body/remote/download recovery owners.

P1-211 remains unassigned by this block.

## Test / release state

No runtime/config/manifest changes were made. Product tests were not rerun. The last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.
