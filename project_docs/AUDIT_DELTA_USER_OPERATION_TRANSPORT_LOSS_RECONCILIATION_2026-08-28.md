# Audit delta — user-operation outer transport loss / durable-state reconciliation — 2026-08-28

Source-of-truth `main` immediately before this write: `78d199c37b270c944a73ffb69517a9bbe62ab697`.

Docs-only audit checkpoint. Production runtime/config/manifest/tests are unchanged.

## New confirmed item: P1-210

**P1-210 — User-facing retry admission after an outer `runtime.sendMessage` / response-channel failure is not reconciled with durable operation state. A page can be told an operation failed/not cached and offer a fresh non-idempotent retry even though the service worker already created a PDF cache/checkpoint and the physical download/upload may be in progress or have unknown settlement.**

This is a transport/result-classification defect rather than failure of the existing recovery stores themselves.

## Why this is independent

Adjacent owners remain necessary but do not own this user-visible state transition:

- **P1-048** — a signed offscreen upload/download is not automatically retried after unknown transport settlement;
- **P0-039/P0-043/P0-044** — durable recovery evidence for local/Yandex physical side effects;
- **P0-079** — PDF retry cache must be immutable operation-owned rather than tab-owned;
- **P1-198** — worker-issued operation identity instead of caller-chosen textual operationId;
- **P1-161** — auth-recovery return UX;
- **P1-124** — exact reconciliation for non-idempotent `tabs.create()`;
- **P1-191/P1-178** — auth replacement/completion state machines.

P1-210 asks a different question: **after the outer page↔worker RPC result is lost, what may the UI truthfully claim and which retry actions may it admit before current durable state is reconciled?**

## Fresh source proof — Yandex first-send path

### 1. Worker correctly knows when a reusable PDF cache exists

`generatePdfAndUploadToYandex()` creates/caches the generated PDF before the remote operation. When an application-level error occurs after that point, its catch returns a structured result containing:

- `ok: false`;
- `cached: true`;
- the cached filename;
- normalized error;
- operationId.

When this structured response reaches the content page, the UI can safely distinguish "PDF already exists" from "PDF was never prepared".

### 2. Outer runtime rejection has no `pdfCached` evidence

`content.js::sendPdfToYandex()` uses:

`const result = await chrome.runtime.sendMessage(...)`

and on a rejected outer message Promise executes:

`showYandexSendError(error?.message || String(error), Boolean(error?.pdfCached), operationId)`.

A runtime/channel error is not the worker's structured `{ cached:true }` result. It normally has no `pdfCached` property, therefore `Boolean(error?.pdfCached)` is false.

### 3. False branch offers a fresh generation

`showYandexSendError(..., pdfCached=false, ...)` presents:

`Сформировать и отправить заново`

and calls `sendPdfToYandex(...)` again.

That is a new PDF generation / new logical save attempt, not reconciliation of the prior operation.

### 4. The old operation may already be durable or physically active

A deterministic schedule is:

1. content generates caller operationId A and sends `WEBCLIP_SEND_PDF_TO_YANDEX`;
2. worker creates PDF A and stores retry cache A;
3. worker may already create `pendingRemoteSaves` before signed PUT/publication;
4. signed transfer may start and its physical outcome may become unknown to the page;
5. the content↔worker response channel is lost or the worker is terminated before the structured result reaches the page;
6. page catch classifies this as `pdfCached=false`;
7. user is offered "generate/send again" and starts operation B;
8. A can still settle/recover while B creates another PDF/cache/remote object/Journal attempt.

P0-079 makes the current tab-owned cache especially dangerous: B may replace the retry pointer/bytes while A still owns a remote recovery checkpoint. But even after P0-079, blindly creating B can create a second legitimate physical file while A later reconciles successfully.

The correct outer-transport result is **unknown operation state**, not "PDF was not cached".

## Fresh source proof — local automatic download

The same root exists for local PDF download.

### 5. Worker checkpoints before irreversible Chrome download

`generatePdfAndDownload()` creates the PDF/blob and calls `checkpointPendingLocalDownloadIntent(...)` **before** `chrome.downloads.download()`.

The intent contains operation/metadata/blob/expected-byte evidence so background reconciliation can decide whether the Chrome download actually started/completed.

### 6. Content page still offers a blind full retry on outer rejection

`content.js::downloadPdf()` catch always renders:

- title `Не удалось сформировать PDF`;
- button `Повторить`;
- retry calls `downloadPdf(...)` again.

There is no distinction between:

- failure before PDF/checkpoint/download admission;
- application error with a known safe terminal state;
- lost runtime response after durable intent and possibly after `downloads.download()` started.

Thus user retry can start a second physical Chrome download while the first pending intent/download is still unknown and recoverable.

This is not solved by the 15-second `downloadStartPending` structured response: P0-043/P1-146 handle that state only if the response reaches the content page. P1-210 covers loss of the **outer** response itself.

## Manual Journal backup is another manifestation

`journal.js::exportJournalToYandex()` creates an operationId, shows blocking progress and sends the manual backup RPC. If the message Promise rejects, `finishBackupProgressError()` declares `Резервная копия не создана`, ends the active UI state and the export button is re-enabled in `finally`.

Backend backup lease/pending checkpoint can prevent some immediate duplicate physical work, so this manifestation is less direct than content PDF save. Nevertheless the UI's terminal claim is still not proven by outer transport loss. A late/unknown old backup may settle or require recovery.

P1-210 should therefore define a common UI/runtime reconciliation contract, with operation-specific durable sources underneath it.

## Required P1-210 contract

### Outer transport failure is a third state

UI handlers must distinguish at least:

1. **application result received** — worker authoritatively returned success/failure/pending state;
2. **pre-admission failure proven** — exact operation receipt proves no irreversible side effect/cache/checkpoint started;
3. **outer transport/result unknown** — response channel failed or page/worker lifecycle interrupted before an authoritative terminal result was delivered.

State 3 must never be rendered as ordinary terminal failure solely because `runtime.sendMessage()` rejected.

### Reconcile exact durable operation before allowing a new non-idempotent generation

After state 3, use a bounded read-only reconciliation path keyed by an immutable **worker-issued operation receipt** (P1-198), exact document/operation generation, and relevant subsystem receipt.

A useful status model can include:

- `not-admitted` / safe to retry from scratch;
- `pdf-prepared` with immutable cache/content receipt;
- `download-start-unknown`;
- `download-in-progress`;
- `remote-transfer-unknown`;
- `remote-object-verified`;
- `publication-unknown` / verified;
- `journal-finalization-pending`;
- `complete`;
- terminal `failed-before-side-effect`;
- unresolved/manual-reconciliation required.

Exact names are implementation choice; false binary `success/error` is not.

### Recovery source is durable state, not OperationLog alone

A restarted worker reconstructs status from authoritative durable receipts:

- immutable PDF cache generation/content receipt (P0-079);
- `pendingDownloads` / exact DownloadItem reconciliation;
- `pendingRemoteSaves` generation/object/publication state;
- backup pending upload/source revision/lease where applicable;
- Journal finalization generation.

OperationLog can explain the state but must not be the only correctness proof.

### UI retry policy

While old operation state is unknown:

- do not show a button that silently creates a new PDF/upload/download generation;
- show an explicit "результат операции уточняется / не запускайте повтор" state;
- allow safe read-only refresh/reconcile;
- allow exact cached-PDF download only when that immutable cache/content receipt is proven to belong to this operation;
- if the product eventually allows a deliberate duplicate attempt, require explicit warning that a prior physical result may still exist and retain recovery authority for both generations.

For a proven `not-admitted` or terminal pre-side-effect failure, ordinary fresh retry is allowed.

### Transport-loss reconciliation must be bounded

Do not turn channel-loss handling into infinite polling/wake cycles.

- one page may keep at most a bounded/coalesced status read outstanding;
- worker restart can be retried according to a bounded UI backoff or explicit refresh;
- unknown durable state persists rather than being converted to failure by wall-clock timeout;
- no blind remote/download retry is triggered automatically.

## Composition with existing items

P1-210 requires rather than replaces:

- P1-198 worker-issued receipt so the status request cannot collide with another operation;
- P0-079 immutable PDF ownership so `pdf-prepared` points to exact bytes;
- P0-074/P0-073/P1-184 exact remote generation/object proof;
- P0-039/P0-043/P0-044 durable physical-side-effect checkpoints;
- P1-048 no blind signed-transfer retry;
- P0-076 Journal generation/CAS for eventual finalization;
- P0-070 exact document generation for a live save.

## Required deterministic regressions

1. Yandex save fails before PDF/cache admission and worker returns authoritative failure -> fresh retry remains available.
2. Yandex PDF cached, then outer runtime channel rejects before structured result -> UI does **not** claim cache absent and does not offer fresh generation until reconciliation.
3. Same with `pendingRemoteSaves` PREPARED and signed PUT not yet started -> status reports durable prepared state.
4. Signed PUT started/response lost -> UI reports unknown transfer; clicking ordinary UI cannot start a second PUT/new PDF.
5. A later remote recovery verifies operation A -> original UI/reopened page can resolve to complete/pending-Journal without creating B.
6. Local download intent committed, `chrome.downloads.download()` starts, outer response lost -> UI does not offer blind second download; status reconciles exact intent/download.
7. Local pre-checkpoint failure -> fresh retry remains allowed.
8. Worker restart between side-effect start and page response -> status reconstructs from durable stores; in-memory state is not required.
9. P0-079: another tab/save generation cannot be mistaken for the old operation's cached PDF.
10. P1-198: hostile/colliding caller operationId cannot read/control another operation's recovery status.
11. Manual backup response channel lost after pending upload/lease exists -> UI does not claim "backup not created" as authoritative; refresh/reconcile current backup operation.
12. Reconciliation itself times out -> remains `unknown`, not `failed`, and does not auto-retry side effect.
13. Explicit user close/navigation does not delete durable recovery evidence for an unknown operation.
14. OperationLog may be missing/pruned while durable reconciliation still works.

## Number allocation

Fresh repo-wide search found no prior `P1-210` assignment. This checkpoint assigns **P1-210** to the outer-transport-loss / durable-operation-state reconciliation root cause.

No P0/P2 number is created.

## Test / release state

No runtime/config/manifest change was made. Product tests were not rerun for this docs-only checkpoint. Historical product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.
